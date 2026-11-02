"""Traffic graph for the rebuilt city (round 38): road centre-lines from layout.json split at junctions into edges between nodes, in the page's graph.json format
(see plan/traffic_graph.py). Also the district outlines the HUD names as you drive in ("TRASH MOUNTAIN", "THE PROMENADE"...).
Run: python3 plan/v7/cc_graph.py -> viewer/worlds/cc/graph.json"""
import os, json, math
HERE = os.path.dirname(os.path.abspath(__file__)); LP = json.load(open(os.path.join(HERE, "layout.json")))
OUT = os.path.join(HERE, "..", "..", "viewer", "worlds", "cc", "graph.json")
DRIVE = {"hwy", "art", "col", "blvd", "loc", "ramp"}                       # alleys and trails are for the player only
def base_of(d):
    k = d["kind"]
    if d["name"] == "Lyons Rd": return 12
    return {"hwy": 12, "art": 10, "col": 8, "blvd": 6, "ramp": 6, "loc": 5}[k]
def lane_of(d):
    hw = d["w"] / 2
    if d["name"] == "Lyons Rd": return 5.6
    if hw >= 12: return 4.6
    if hw >= 9: return 3.6
    if hw >= 6: return 2.6
    return 1.9
def speed_of(rank): return 15.0 if rank >= 12 else 13.0 if rank >= 9 else 11.5 if rank >= 8 else 10.0 if rank >= 6 else 8.5
def resample(pts, step=1.0):
    out = [tuple(pts[0])]
    for a, b in zip(pts, pts[1:]):
        L = math.dist(a, b); n = max(1, int(L / step))
        for i in range(1, n + 1): out.append((a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n))
    return out
def seg_x(p1, p2, p3, p4):
    d = (p2[0] - p1[0]) * (p4[1] - p3[1]) - (p2[1] - p1[1]) * (p4[0] - p3[0])
    if abs(d) < 1e-12: return None
    t = ((p3[0] - p1[0]) * (p4[1] - p3[1]) - (p3[1] - p1[1]) * (p4[0] - p3[0])) / d; u = ((p3[0] - p1[0]) * (p2[1] - p1[1]) - (p3[1] - p1[1]) * (p2[0] - p1[0])) / d
    return (t, u) if -1e-9 <= t <= 1 + 1e-9 and -1e-9 <= u <= 1 + 1e-9 else None
def build():
    R = {}
    for d in LP["roads"]:
        if d["kind"] not in DRIVE: continue
        pts = [tuple(p) for p in d["pts"]]
        if d["closed"] or (math.dist(pts[0], pts[-1]) < .5 and len(pts) > 8): pts = pts[:-1] + [pts[0]] if math.dist(pts[0], pts[-1]) < .5 else pts + [pts[0]]; d = dict(d, closed=True)
        R[d["name"]] = dict(d, pts=pts)
    for i, r in enumerate(LP["roundabouts"]):
        pts = [(r["x"] + r["r"] * math.cos(2 * math.pi * k / 24), r["y"] + r["r"] * math.sin(2 * math.pi * k / 24)) for k in range(25)]
        R[f"rbt_{i}"] = dict(name=f"rbt_{i}", kind="loc", w=9, pts=pts, closed=True)
    C = {k: resample(d["pts"], 1.0) for k, d in R.items()}
    S = {}
    for k, c in C.items():
        s = [0.0]
        for a, b in zip(c, c[1:]): s.append(s[-1] + math.dist(a, b))
        S[k] = s
    BB = {k: (min(p[0] for p in c), min(p[1] for p in c), max(p[0] for p in c), max(p[1] for p in c)) for k, c in C.items()}
    def near(k, p):
        c, s = C[k], S[k]; best = (1e9, 0)
        for i in range(0, len(c) - 1):
            a, b = c[i], c[i + 1]; dx, dy = b[0] - a[0], b[1] - a[1]; L2 = dx * dx + dy * dy or 1; t = max(0, min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2))
            d = math.hypot(a[0] + dx * t - p[0], a[1] + dy * t - p[1])
            if d < best[0]: best = (d, s[i] + t * (s[i + 1] - s[i]))
        return best
    pts = []; names = list(R)
    for i, a in enumerate(names):
        for b in names[i + 1:]:
            A, Bb = BB[a], BB[b]
            if A[0] - 3 > Bb[2] or Bb[0] - 3 > A[2] or A[1] - 3 > Bb[3] or Bb[1] - 3 > A[3]: continue
            ca, cb = C[a][::4] + [C[a][-1]], C[b][::4] + [C[b][-1]]; hits = []
            for ia in range(len(ca) - 1):
                for ib in range(len(cb) - 1):
                    r = seg_x(ca[ia], ca[ia + 1], cb[ib], cb[ib + 1])
                    if r: hits.append((ca[ia][0] + r[0] * (ca[ia + 1][0] - ca[ia][0]), ca[ia][1] + r[0] * (ca[ia + 1][1] - ca[ia][1])))
            for X, Y in ((a, b), (b, a)):
                if R[X].get("closed"): continue
                for e in (C[X][0], C[X][-1]):
                    if near(Y, e)[0] < R[Y]["w"] / 2 + 3: hits.append(near_pt(Y, e, C))
            for p in hits:
                if any(math.dist(p, q[0]) < 3 and {a, b} <= q[1] for q in pts): continue
                pts.append((p, {a, b}))
    nodes = []
    for p, rs in pts:
        for n in nodes:
            if math.dist(n["p"], p) < 8: n["roads"] |= rs; n["ps"].append(p); n["p"] = (sum(q[0] for q in n["ps"]) / len(n["ps"]), sum(q[1] for q in n["ps"]) / len(n["ps"])); break
        else: nodes.append(dict(p=p, roads=set(rs), ps=[p]))
    for k in R:
        if R[k].get("closed"): continue
        for e in (C[k][0], C[k][-1]):
            if not any(math.dist(n["p"], e) < 10 and k in n["roads"] for n in nodes): nodes.append(dict(p=e, roads={k}, ps=[e], dead=True))
    cuts = {k: [] for k in R}
    for ni, n in enumerate(nodes):
        n["r"] = max(3.0, max(R[k]["w"] / 2 for k in n["roads"]) + (1.5 if len(n["roads"]) > 1 else 0))
        for k in n["roads"]:
            d, s = near(k, n["p"])
            if d < 10: cuts[k].append((s, ni))
    edges = []
    for k, d in R.items():
        c, s = C[k], S[k]; cs = sorted(cuts[k]); uniq = []
        for sc, ni in cs:
            if uniq and abs(uniq[-1][0] - sc) < 4: continue
            uniq.append((sc, ni))
        if d.get("closed") and uniq: uniq.append((uniq[0][0] + S[k][-1], uniq[0][1]))          # rings wrap round to their first junction
        def at(sv):
            sv = sv % S[k][-1] if d.get("closed") else sv
            for i in range(len(c) - 1):
                if s[i + 1] >= sv: t = (sv - s[i]) / max(1e-9, s[i + 1] - s[i]); return (c[i][0] + t * (c[i + 1][0] - c[i][0]), c[i][1] + t * (c[i + 1][1] - c[i][1]))
            return c[-1]
        for (s0, n0), (s1, n1) in zip(uniq, uniq[1:]):
            if s1 - s0 < 4: continue
            poly = [at(s0)] + [at(sv) for sv in [s0 + 3 * j for j in range(1, int((s1 - s0) / 3))]] + [at(s1)]
            rank = base_of(d)
            edges.append(dict(a=n0, b=n1, pts=[[round(x, 2), round(y, 2)] for x, y in poly], L=round(s1 - s0, 2), hw=d["w"] / 2, lane=lane_of(d), v=speed_of(rank), rank=rank, road=k if not k.startswith(("loc_", "ring_", "rbt_", "blvd_", "ramp_")) else ""))
    sig = 0
    for n in nodes:
        big = [k for k in n["roads"] if R[k]["kind"] in ("art", "hwy")]
        n["sig"] = -1
        if len(big) >= 2: n["sig"] = sig; sig += 1
    def rect(x0, y0, x1, y1): return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
    areas = []
    NAMES = {"THE HAMMOCKS": "The Hammocks", "WYNMOORE (gated golf)": "Wynmoor", "BUTTERFLY WORLD + TRADEWINDS PARK": "Butterfly World", "SABAL PINES PARK": "Sabal Pines Park", "TRASH MOUNTAIN": "Trash Mountain",
             "construction site": "Construction Site", "offices": "Coconut Creek Corporate Park"}
    for z in LP["zones"]:
        nm = NAMES.get(z["label"])
        if nm: areas.append(dict(name=nm, poly=z["poly"]))
    for lot in LP["lots"]:
        for b in lot["buildings"]:
            nm = {"WALMART": "Walmart Supercenter", "PUBLIX": "Publix", "SEMINOLE CASINO": "Seminole Casino Coconut Creek", "CITY HALL": "City Hall", "COCONUT CREEK HIGH": "Coconut Creek High School",
                  "COCONUT CREEK ELEMENTARY": "Coconut Creek Elementary", "FIRE STATION": "Fire Station 50", "McD": "McDonald's", "REC CENTER": "Coconut Creek Rec Center", "WALGREENS": "Coconut Creek Pkwy Plaza", "FORD": "Sample Rd Auto Row"}.get(b["label"])
            if nm:
                xs = [p[0] for p in lot["poly"]]; ys = [p[1] for p in lot["poly"]]; areas.append(dict(name=nm, poly=rect(min(xs), min(ys), max(xs), max(ys))))
    areas.append(dict(name="The Promenade", poly=rect(-790, 1110, -35, 1430)))
    areas.append(dict(name="Banks Rd", poly=rect(-790, -470, -230, -40)))
    out = dict(areas=areas, nodes=[dict(x=round(n["p"][0], 2), y=round(n["p"][1], 2), r=round(n["r"], 1), sig=n["sig"], dead=bool(n.get("dead")), roads=sorted(n["roads"]), riro=[]) for n in nodes], edges=edges)
    return out
def near_pt(k, p, C):
    c = C[k]; best = (1e9, p)
    for i in range(len(c) - 1):
        a, b = c[i], c[i + 1]; dx, dy = b[0] - a[0], b[1] - a[1]; L2 = dx * dx + dy * dy or 1; t = max(0, min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2))
        q = (a[0] + dx * t, a[1] + dy * t); d = math.dist(q, p)
        if d < best[0]: best = (d, q)
    return best[1]
if __name__ == "__main__":
    g = build(); os.makedirs(os.path.dirname(OUT), exist_ok=True); json.dump(g, open(OUT, "w"), separators=(",", ":"))
    deg = {}
    for e in g["edges"]: deg[e["a"]] = deg.get(e["a"], 0) + 1; deg[e["b"]] = deg.get(e["b"], 0) + 1
    print(len(g["nodes"]), "nodes", len(g["edges"]), "edges", sum(1 for n in g["nodes"] if n["sig"] >= 0), "signals;", sum(1 for i, d in deg.items() if d == 1), "dead ends;", len(g["nodes"]) - len(deg), "unused;", os.path.getsize(OUT), "bytes")
