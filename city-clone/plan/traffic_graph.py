"""Traffic graph for the page: road centre-lines split at junctions into edges between nodes, in metres (Blender x east, y north).
Run: python3 plan/traffic_graph.py  -> viewer/worlds/coconut/graph.json
nodes: [{x, y, r (junction box radius m), sig (signal group id or -1), roads}]; edges: [{a, b, pts [[x,y]...], L, hw, lane (offset of the lane centre from the centre-line, m), v (cruise m/s), rank, road}].
Cars drive on the right: direction a->b uses the right side of a->b."""
import os, sys, json, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import map_px as M
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "viewer", "worlds", "coconut", "graph.json")
SKIP = {"Lyons Promenade"}                                              # pedestrian lane
SIGNALS = M.LIGHTS["Lyons Rd"]   # signalled crossings on Lyons Rd (coconut_scene uses the same table)
def lane_of(name, hw):
    if name == "Lyons Rd": return 5.6                                   # middle of the 3 lanes each side of the 2 m median
    if hw >= 6: return 3.6
    if hw >= 4.8: return 2.6
    if hw >= 4: return 2.1
    return 1.7
def speed_of(rank): return 15.0 if rank >= 12 else 13.0 if rank >= 9 else 11.5 if rank >= 8 else 10.0 if rank >= 6 else 8.5
def seg_x(p1, p2, p3, p4):
    d = (p2[0] - p1[0]) * (p4[1] - p3[1]) - (p2[1] - p1[1]) * (p4[0] - p3[0])
    if abs(d) < 1e-12: return None
    t = ((p3[0] - p1[0]) * (p4[1] - p3[1]) - (p3[1] - p1[1]) * (p4[0] - p3[0])) / d; u = ((p3[0] - p1[0]) * (p2[1] - p1[1]) - (p3[1] - p1[1]) * (p2[0] - p1[0])) / d
    return (t, u) if -1e-9 <= t <= 1 + 1e-9 and -1e-9 <= u <= 1 + 1e-9 else None
def build():
    R = {d["name"]: d for d in M.roads_m() if d["name"] not in SKIP}
    C = {k: M._cr(d["pts"], 1.0) for k, d in R.items()}
    S = {}
    for k, c in C.items():
        s = [0.0]
        for a, b in zip(c, c[1:]): s.append(s[-1] + math.dist(a, b))
        S[k] = s
    cuts = {k: [] for k in R}                                           # (s on road, node point)
    pts = []                                                            # raw junction points
    names = list(R)
    def near(c, s, p):
        best = (1e9, 0)
        for i in range(len(c) - 1):
            a, b = c[i], c[i + 1]; dx, dy = b[0] - a[0], b[1] - a[1]; L2 = dx * dx + dy * dy or 1; t = max(0, min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2))
            d = math.hypot(a[0] + dx * t - p[0], a[1] + dy * t - p[1])
            if d < best[0]: best = (d, s[i] + t * (s[i + 1] - s[i]))
        return best
    for i, a in enumerate(names):
        for b in names[i + 1:]:
            A, B = C[a], C[b]
            if max(p[0] for p in B) < min(p[0] for p in A) - 2 or min(p[0] for p in B) > max(p[0] for p in A) + 2 or max(p[1] for p in B) < min(p[1] for p in A) - 2 or min(p[1] for p in B) > max(p[1] for p in A) + 2: continue
            hits = []
            for ia in range(len(A) - 1):
                for ib in range(len(B) - 1):
                    r = seg_x(A[ia], A[ia + 1], B[ib], B[ib + 1])
                    if r: hits.append((A[ia][0] + r[0] * (A[ia + 1][0] - A[ia][0]), A[ia][1] + r[0] * (A[ia + 1][1] - A[ia][1])))
            for X, Y, nX in ((A, B, a), (B, A, b)):
                for e in (X[0], X[-1]):
                    if near(Y, S[b if X is A else a], e)[0] < 1.2: hits.append(e)
            for p in hits:
                if any(math.dist(p, q[0]) < 3 and {a, b} <= q[1] for q in pts): continue
                pts.append((p, {a, b}))
    # cluster junction points into nodes (within 7 m)
    nodes = []
    for p, rs in pts:
        for n in nodes:
            if math.dist(n["p"], p) < 7: n["roads"] |= rs; n["ps"].append(p); n["p"] = (sum(q[0] for q in n["ps"]) / len(n["ps"]), sum(q[1] for q in n["ps"]) / len(n["ps"])); break
        else: nodes.append(dict(p=p, roads=set(rs), ps=[p]))
    for k in R:                                                          # road ends that meet nothing: dead-end nodes (cul-de-sac / map edge)
        for e in (C[k][0], C[k][-1]):
            if not any(math.dist(n["p"], e) < 9 and k in n["roads"] for n in nodes): nodes.append(dict(p=e, roads={k}, ps=[e], dead=True))
    for ni, n in enumerate(nodes):
        n["r"] = max(3.0, max(R[k]["hw"] for k in n["roads"]) + (1.5 if len(n["roads"]) > 1 else 0))
        for k in n["roads"]:
            d, s = near(C[k], S[k], n["p"])
            if d < 9: cuts[k].append((s, ni))
    edges = []
    for k, d in R.items():
        cs = sorted(cuts[k]); c, s = C[k], S[k]
        uniq = []
        for sc, ni in cs:
            if uniq and abs(uniq[-1][0] - sc) < 4: continue
            uniq.append((sc, ni))
        for (s0, n0), (s1, n1) in zip(uniq, uniq[1:]):
            if n0 == n1 or s1 - s0 < 4: continue
            poly = [c[i] for i in range(len(c)) if s0 < s[i] < s1]
            def at(sv):
                for i in range(len(c) - 1):
                    if s[i + 1] >= sv: t = (sv - s[i]) / max(1e-9, s[i + 1] - s[i]); return (c[i][0] + t * (c[i + 1][0] - c[i][0]), c[i][1] + t * (c[i + 1][1] - c[i][1]))
                return c[-1]
            poly = [at(s0)] + poly[::3] + [at(s1)]
            edges.append(dict(a=n0, b=n1, pts=[[round(x, 2), round(y, 2)] for x, y in poly], L=round(s1 - s0, 2), hw=d["hw"], lane=lane_of(k, d["hw"]), v=speed_of(d["base"]), rank=d["base"], road=k))
    sig = 0
    for n in nodes:
        n["sig"] = -1
        if "Lyons Rd" in n["roads"] and any(r in n["roads"] for r in SIGNALS): n["sig"] = sig; sig += 1
    used = set(e["a"] for e in edges) | set(e["b"] for e in edges)
    out = dict(nodes=[dict(x=round(n["p"][0], 2), y=round(n["p"][1], 2), r=round(n["r"], 1), sig=n["sig"], dead=bool(n.get("dead")), roads=sorted(n["roads"]), riro=sorted(r for r in n["roads"] if "Lyons Rd" in n["roads"] and r in M.RIRO["Lyons Rd"])) for n in nodes], edges=edges)
    return out, used
if __name__ == "__main__":
    g, used = build(); json.dump(g, open(OUT, "w"), separators=(",", ":"))
    deg = {}
    for e in g["edges"]: deg[e["a"]] = deg.get(e["a"], 0) + 1; deg[e["b"]] = deg.get(e["b"], 0) + 1
    print(len(g["nodes"]), "nodes", len(g["edges"]), "edges", sum(1 for n in g["nodes"] if n["sig"] >= 0), "signals; dead ends:", [g["nodes"][i]["roads"] for i, d in deg.items() if d == 1], "unused nodes", len(g["nodes"]) - len(used), os.path.getsize(OUT), "bytes")
