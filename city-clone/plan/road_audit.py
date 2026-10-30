"""Road audit: lists junctions that meet at a shallow angle, junctions too close together, and loose ends; draws them on the plan.
Run: python3 plan/road_audit.py  -> art-review/plan/road_audit.png + a text list. Angles are the acute angle between the two roads at the junction (90 = square)."""
import os, sys, math
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import map_px as M
MIN_ANGLE, MIN_GAP = 55.0, 26.0          # degrees, metres between junction centres
def tangent(sm, i):
    a, b = sm[max(0, i - 3)], sm[min(len(sm) - 1, i + 3)]; L = math.dist(a, b) or 1; return ((b[0] - a[0]) / L, (b[1] - a[1]) / L)
def seg_x(p1, p2, p3, p4):
    d = (p2[0] - p1[0]) * (p4[1] - p3[1]) - (p2[1] - p1[1]) * (p4[0] - p3[0])
    if abs(d) < 1e-9: return None
    t = ((p3[0] - p1[0]) * (p4[1] - p3[1]) - (p3[1] - p1[1]) * (p4[0] - p3[0])) / d; u = ((p3[0] - p1[0]) * (p2[1] - p1[1]) - (p3[1] - p1[1]) * (p2[0] - p1[0])) / d
    return (p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1])) if 0 <= t <= 1 and 0 <= u <= 1 else None
def nearest(sm, p):
    best = (1e9, 0)
    for i, q in enumerate(sm):
        d = math.dist(p, q)
        if d < best[0]: best = (d, i)
    return best
def junctions(roads=None):
    roads = roads or M.ROADS; sm = {k: M._cr(v[2], 2.0) for k, v in roads.items()}; J = []
    names = list(roads)
    for ai, a in enumerate(names):
        for b in names[ai + 1:]:
            A, B = sm[a], sm[b]
            ax0, ax1, ay0, ay1 = min(p[0] for p in A), max(p[0] for p in A), min(p[1] for p in A), max(p[1] for p in A)
            if max(p[0] for p in B) < ax0 - 3 or min(p[0] for p in B) > ax1 + 3 or max(p[1] for p in B) < ay0 - 3 or min(p[1] for p in B) > ay1 + 3: continue
            hits = []
            for i in range(len(A) - 1):
                for j in range(len(B) - 1):
                    x = seg_x(A[i], A[i + 1], B[j], B[j + 1])
                    if x: hits.append((x, i, j))
            for S, T in ((A, B), (B, A)):                                   # an end snapped onto the other road
                for idx in (0, -1):
                    if nearest(T, S[idx])[0] < 1.5: hits.append((S[idx], 0, 0))
            seen = []
            for x, i, j in hits:
                if any(math.dist(x, s) < 4 for s in seen): continue
                seen.append(x)
                ia, ib = nearest(A, x)[1], nearest(B, x)[1]; ta, tb = tangent(A, ia), tangent(B, ib)
                ang = math.degrees(math.acos(min(1, abs(ta[0] * tb[0] + ta[1] * tb[1]))))
                enda = ia < 3 or ia > len(A) - 4; endb = ib < 3 or ib > len(B) - 4
                kind = "L" if enda and endb else ("T" if enda or endb else "X")
                J.append(dict(p=x, a=a, b=b, ang=ang, kind=kind))
    return J
def audit():
    J = junctions(); bad = []
    for j in J:
        if j["kind"] != "L" and j["ang"] < MIN_ANGLE: bad.append(("angle", j["p"], f'{j["a"]} x {j["b"]}: {j["ang"]:.0f} deg ({j["kind"]})'))
    nodes = []                                                        # junctions within 4 m are one node (3-way meetings)
    for j in J:
        for n in nodes:
            if math.dist(n["p"], j["p"]) * M.SCALE < 4: n["roads"] |= {j["a"], j["b"]}; break
        else: nodes.append(dict(p=j["p"], roads={j["a"], j["b"]}))
    HW = {k: v[1] for k, v in M.ROADS.items()}
    for i, j in enumerate(nodes):
        for k in nodes[i + 1:]:
            share = j["roads"] & k["roads"]
            if not share: continue
            d = math.dist(j["p"], k["p"]) * M.SCALE; cj = max(HW[r] for r in j["roads"] - share or share); ck = max(HW[r] for r in k["roads"] - share or share)
            gap = d - cj - ck                                               # kerb-to-kerb space left between the two junction boxes
            if gap < 12: bad.append(("close", ((j["p"][0] + k["p"][0]) / 2, (j["p"][1] + k["p"][1]) / 2), f'{"/".join(sorted(j["roads"]))} and {"/".join(sorted(k["roads"]))}: {d:.0f} m apart, {gap:.0f} m kerb gap'))
    for (k, idx, e, d, near) in M.LOOSE_ENDS: bad.append(("loose", e, f"{k} end {idx} loose ({d} px from {near})"))
    return J, bad
if __name__ == "__main__":
    J, bad = audit()
    print(len(J), "junctions;", len(bad), "flags")
    for kind, p, txt in bad: print(f"  [{kind}] {txt} at px ({p[0]:.0f},{p[1]:.0f})")
    src = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "art-review", "plan", os.environ.get("BASE", "plan_v6_overlay.png"))
    im = Image.open(src).convert("RGB"); d = ImageDraw.Draw(im)
    for j in J: x, y = j["p"]; d.ellipse([x - 3, y - 3, x + 3, y + 3], outline=(255, 255, 255))
    col = {"angle": (255, 40, 40), "close": (255, 160, 0), "loose": (200, 0, 255)}
    for n, (kind, p, txt) in enumerate(bad):
        x, y = p; d.ellipse([x - 11, y - 11, x + 11, y + 11], outline=col[kind], width=3); d.text((x + 12, y - 6), str(n + 1), fill=col[kind])
    im.save(os.path.join(os.path.dirname(src), os.environ.get("OUTNAME", "road_audit.png")))
