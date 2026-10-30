"""Plan v5 data in REFERENCE-MAP PIXELS (art/coconut-11-map-reference.png, 1358 x 1159). plan_v5.py converts to metres; the 3D build reads the metre version.
Coast + lakes come from plan/trace_v5.json (water mask of the reference). Roads and districts are hand traced from the map, then bent to OUR district list
(promenade, hospital, small shopping plaza, industrial at the SW edge, school + park, gated townhomes, golf, stadium, condos, preserve).
Scale: 0.43 m per pixel, origin = pixel (690, 545) = Coconut Creek Pkwy x mid road."""
SCALE = 0.43; OX, OY = 690, 545
def to_m(p): return ((p[0] - OX) * SCALE, -(p[1] - OY) * SCALE)

# name: (rank, half-width m, points px).  rank 10 boulevard, 9 arterial, 8 main, 6 collector, 5 local, 3 pedestrian lane.
# Every road end is snapped onto another road within SNAP px (so nothing nearly meets); loose ends are listed by check_roads() unless named in OK_ENDS.
RAW_ROADS = {
 "Lyons Rd": (12, 10.4, [(690, 1030), (693, 985), (693, 900), (692, 820), (691, 700), (692, 545), (695, 420), (696, 293), (698, 200), (702, 132), (725, 96)]),
 "Copans Rd": (8, 6.6, [(690, 1030), (700, 1062), (722, 1092), (770, 1110), (850, 1116), (920, 1105), (962, 1080), (992, 1040), (1018, 1000), (1046, 972), (1060, 940), (1064, 900), (1064, 858)]),
 "Wiles Rd": (9, 5.0, [(-20, 766), (60, 778), (130, 796), (210, 812), (300, 818), (400, 822), (520, 830), (620, 832), (692, 824), (780, 822), (880, 822), (960, 828), (1030, 842), (1062, 860), (1130, 880), (1200, 896), (1250, 920), (1300, 937), (1340, 955), (1378, 964)]),
 "Coconut Creek Pkwy": (9, 5.0, [(96, 558), (130, 557), (190, 556), (212, 550), (240, 546), (300, 543), (390, 543), (470, 548), (560, 553), (640, 553), (692, 550), (740, 548), (850, 546), (960, 540), (1040, 538), (1092, 540), (1150, 543), (1212, 565), (1268, 615), (1308, 690), (1330, 770), (1324, 850), (1302, 934)]),
 "Sample Rd": (8, 4.2, [(399, 298), (430, 288), (470, 284), (560, 285), (695, 293), (800, 294), (905, 294), (1000, 293), (1098, 292)]),
 "Winston Park Blvd": (8, 4.2, [(1098, 292), (1096, 400), (1092, 540), (1088, 640), (1084, 720), (1076, 800), (1064, 858)]),
 "Hammock Blvd": (8, 4.2, [(305, 80), (304, 150), (310, 210), (332, 248), (370, 274), (396, 300), (400, 360), (400, 440), (398, 520), (396, 600), (398, 680), (400, 760), (398, 822)]),
 "Creekside Loop": (8, 4.2, [(152, 798), (154, 860), (160, 920), (178, 970), (215, 995), (300, 1005), (400, 1016), (480, 1028), (530, 1032), (543, 1010), (543, 975)]),
 # north-west lobe
 "Lakeview Loop": (6, 3.5, [(305, 80), (340, 62), (400, 60), (432, 78), (443, 150), (442, 200), (442, 232), (444, 262), (446, 284)]),
 "Hospital Dr": (5, 3.2, [(404, 350), (340, 345), (300, 340), (276, 320), (270, 290)]),
 "Banks Rd": (5, 3.2, [(240, 546), (238, 500), (240, 470), (280, 477), (370, 476), (400, 476)]),
 # north-east lobe
 "Northridge Loop": (6, 3.5, [(725, 96), (790, 88), (870, 86), (960, 82), (1025, 86), (1062, 108), (1082, 150), (1092, 210), (1096, 260), (1098, 292)]),
 "Northridge Ln": (5, 3.2, [(700, 206), (800, 206), (900, 207)]),
 # centre
 "Retail Dr": (6, 3.5, [(609, 452), (640, 446), (695, 444), (760, 448), (870, 450), (975, 450), (1092, 450)]),
 "Commons Ave": (5, 3.2, [(975, 294), (975, 450), (975, 542)]),
 "Market Ln": (5, 3.2, [(872, 450), (872, 546)]),
 "School Dr": (5, 3.2, [(692, 684), (780, 686), (866, 690), (960, 692), (1060, 690), (1086, 690)]),
 "Civic Rd": (6, 3.5, [(866, 548), (866, 620), (866, 690), (870, 760), (868, 822)]),
 # the lakes + palm view
 "Lakes Lane N": (5, 3.2, [(446, 287), (447, 304), (462, 313), (500, 312), (580, 313), (598, 325), (603, 360), (609, 395)]),
 "Lakes Dr": (6, 3.5, [(405, 432), (480, 430), (505, 413), (530, 398), (560, 393), (610, 396)]),
 "Lakes Diag N": (6, 3.5, [(610, 396), (613, 440), (605, 480), (585, 515), (556, 548)]),
 "Palm Ct Rd": (5, 3.2, [(396, 604), (437, 601), (480, 605), (515, 616), (540, 634), (575, 643), (620, 652), (660, 668), (690, 680)]),
 "Palm View Rd": (5, 3.2, [(410, 712), (445, 708), (485, 713), (525, 721), (570, 731), (620, 734), (688, 732)]),
 "Lakes Diag S": (6, 3.5, [(556, 548), (535, 578), (518, 614), (510, 650), (509, 690), (512, 722)]),
 "Palm View Loop": (5, 3.2, [(466, 711), (464, 668), (495, 667), (510, 663)]),
 # west
 "Riverside Dr": (6, 3.5, [(150, 557), (152, 620), (154, 690), (154, 750), (152, 798)]),
 "Heron Point Dr": (5, 3.2, [(150, 557), (149, 530), (148, 505)]),
 # industrial
 "Industrial Row": (6, 3.5, [(162, 948), (250, 952), (330, 958), (397, 960), (497, 962), (542, 966), (620, 964), (692, 960)]),
 "Creekside Rd": (5, 3.2, [(397, 826), (397, 960), (398, 1016)]),
 "Landfill Rd": (5, 3.6, [(900, 207), (914, 212), (925, 221)]),
 "Windmill Park Rd": (5, 3.2, [(300, 1006), (298, 1036), (270, 1046), (215, 1050), (192, 1070)]),
 "Dock Ln": (5, 3.2, [(487, 962), (487, 1024)]),
 # south-east
 "Southgate Rd": (6, 3.5, [(693, 956), (800, 955), (900, 955), (1000, 957), (1060, 958)]),
 "Southgate Ln": (6, 3.5, [(868, 826), (868, 893), (868, 955), (868, 1040), (870, 1114)]),
 "Lyons Ln": (6, 3.5, [(1060, 958), (1096, 992), (1140, 1018), (1180, 1040), (1194, 1056), (1240, 1072), (1286, 1080)]),
 "Bay Dr": (6, 3.5, [(1296, 936), (1282, 958), (1272, 990), (1258, 1022), (1228, 1040), (1192, 1044)]),
 "Lyons Promenade": (3, 5.5, [(1090, 922), (1120, 942), (1150, 961), (1184, 968)]),
 "Canal Ridge Dr": (6, 3.5, [(1165, 888), (1165, 845), (1180, 820), (1215, 816), (1280, 832), (1318, 846)]),
}
OK_ENDS = {("Landfill Rd", -1), ("Windmill Park Rd", -1), ("Club Dr", -1), ("Casino Dr", -1), ("Hospital Dr", -1), ("Lyons Promenade", 0), ("Coconut Creek Pkwy", 0), ("Heron Point Dr", -1), ("Hospital Dr", -1), ("Lyons Ln", -1), ("Wiles Rd", 0), ("Wiles Rd", -1)}   # coast / bridge-gate / lot / cul-de-sac ends allowed
SNAP = 17.0
# Junction rules (round 21: fewer full junctions on the main roads, same map): traffic lights only where Lyons Rd meets these roads;
# RIRO = right-in/right-out: the main road's median runs straight past these side streets (no left turns, no crossing over)
LIGHTS = {"Lyons Rd": ("Wiles Rd", "Coconut Creek Pkwy", "Sample Rd", "Southgate Rd", "Industrial Row")}
RIRO = {"Lyons Rd": ("Retail Dr", "School Dr", "Palm Ct Rd", "Palm View Rd", "Northridge Ln")}
def _cr(pts, step=4.0):
    import math
    n = len(pts); out = []
    for i in range(n - 1):
        p0, p1, p2, p3 = pts[max(i - 1, 0)], pts[i], pts[i + 1], pts[min(i + 2, n - 1)]
        k = max(2, int(math.dist(p1, p2) / step))
        for j in range(k):
            t = j / k; t2, t3 = t * t, t * t * t
            out.append(tuple(.5 * ((2 * p1[d]) + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3) for d in (0, 1)))
    out.append(tuple(pts[-1])); return out
def _seg_near(p, poly):
    import math
    best = (1e9, None)
    for a, b in zip(poly, poly[1:]):
        dx, dy = b[0] - a[0], b[1] - a[1]; L2 = dx * dx + dy * dy or 1; t = max(0, min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)); q = (a[0] + dx * t, a[1] + dy * t); d = math.dist(p, q)
        if d < best[0]: best = (d, q)
    return best
def snap_roads(raw):
    """Move each road end onto the nearest other road if within SNAP px; returns (roads, loose ends)."""
    smooth = {k: _cr(v[2]) for k, v in raw.items()}; out = {}; loose = []
    for k, (rank, hw, pts) in raw.items():
        pts = list(pts)
        for idx in (0, -1):
            e = pts[idx]; best = (1e9, None, None)
            for k2, sm in smooth.items():
                if k2 == k: continue
                d, q = _seg_near(e, sm)
                if d < best[0]: best = (d, q, k2)
            if best[0] <= SNAP: pts[idx] = (round(best[1][0], 1), round(best[1][1], 1))
            elif (k, idx) not in OK_ENDS and rank > 3: loose.append((k, idx, e, round(best[0]), best[2]))
        out[k] = (rank, hw, pts)
    return out, loose
ROADS, LOOSE_ENDS = snap_roads(RAW_ROADS)
# bridges: (name, a, b) pixel endpoints, carry the road across water
BRIDGES = [("Wiles West Bridge", (-20, 766), (50, 776)), ("Wiles East Bridge", (1300, 935), (1378, 964)), ("Palm Blvd Bridge", (200, 550), (232, 550)),
           ("Creekside Bridge", (632, 960), (648, 960)), ("Lakeside footbridge", (236, 714), (262, 714))]
# gates at the world edge (the two Wiles bridges lead off-map: closed for construction)
EDGE_GATES = [("west", (-20, 766)), ("east", (1378, 964))]

# districts: name -> (category, colour, polygon px). Clipped to land when drawn.
RES, COM, CIV, GRN, IND, GOLF = "residential", "commercial", "civic / school / health", "park / green", "industrial", "golf"
DISTRICTS = {
 "Lakeview Estates (canal homes)": (RES, "#f4b183", [(400, 66), (660, 66), (660, 258), (560, 283), (470, 281), (402, 262)]),
 "West Creek Townhomes (gated)": (RES, "#f0a070", [(250, 70), (300, 70), (300, 250), (380, 282), (240, 282), (245, 200)]),
 "West Creek Townhomes (middle)": (RES, "#f0a070", [(262, 286), (394, 286), (394, 376), (262, 376)]),
 "West Creek Townhomes (south)": (RES, "#f0a070", [(240, 380), (388, 380), (388, 495), (320, 530), (236, 520)]),
 "Gas station west": (COM, "#8ec5ea", [(326, 556), (394, 556), (394, 616), (326, 616)]),
 "Heron Point (marina + preserve)": (GRN, "#b8e0a0", [(44, 430), (160, 428), (215, 520), (210, 550), (60, 552), (42, 490)]),
 "Riverside Condos + Marina": (RES, "#ff9a8a", [(50, 572), (200, 572), (200, 790), (60, 790)]),
 "Lakeside Park": (GRN, "#b8e0a0", [(222, 566), (400, 566), (400, 790), (222, 790)]),
 "The Lakes (lake homes)": (RES, "#f4b183", [(412, 300), (660, 300), (656, 545), (412, 545)]),
 "Palm View (small homes)": (RES, "#f7c59f", [(412, 556), (684, 556), (684, 812), (412, 812)]),
 "Creekside Industrial Park": (IND, "#b9b4d6", [(110, 832), (650, 832), (650, 1055), (260, 1055), (150, 970), (110, 880)]),
 "Retail Commons (west shops)": (COM, "#8ec5ea", [(700, 300), (758, 300), (758, 544), (700, 544)]),
 "Publix shopping center": (COM, "#f08080", [(766, 300), (970, 300), (970, 444), (766, 444)]),
 "Retail outparcels": (COM, "#9fd0ee", [(766, 454), (970, 454), (970, 544), (766, 544)]),
 "Retail Commons (east)": (COM, "#8ec5ea", [(980, 300), (1092, 300), (1092, 544), (980, 544)]),
 "Civic Center (City Hall + Police)": (CIV, "#a8c8f0", [(870, 554), (1086, 554), (1086, 686), (870, 686)]),
 "Centre homes": (RES, "#f4b183", [(698, 554), (864, 554), (864, 686), (698, 686)]),
 "Elementary School": (CIV, "#f2d38a", [(768, 694), (864, 694), (864, 816), (768, 816)]),
 "Sports fields + stadium": (CIV, "#d8e8a0", [(870, 694), (1086, 694), (1086, 812), (870, 812)]),
 "Northridge Homes": (RES, "#f4b183", [(700, 68), (930, 68), (930, 290), (700, 290)]),
 "Creekview Golf Club": (GOLF, "#9acd6a", [(1102, 292), (1345, 292), (1345, 590), (1262, 590), (1266, 432), (1102, 432)]),
 "Seminole Casino Coconut Creek": (COM, "#e8a060", [(1102, 436), (1262, 436), (1256, 556), (1150, 560), (1102, 548)]),
 "Casino garage": (COM, "#d89050", [(1100, 600), (1222, 600), (1290, 702), (1100, 702)]),
 "Canal Ridge Condos": (RES, "#ff9a8a", [(1102, 708), (1338, 708), (1338, 905), (1102, 905)]),
 "Gas station + Lyons Mart": (COM, "#8ec5ea", [(880, 830), (1030, 830), (1030, 948), (880, 948)]),
 "Lyons Promenade (shops + pedestrian lane)": (COM, "#f7a8c8", [(1036, 896), (1214, 918), (1292, 948), (1286, 1030), (1196, 1040), (1036, 1004)]),
 "Southgate Homes": (RES, "#f4b183", [(700, 835), (885, 835), (885, 1095), (730, 1105), (700, 1050)]),
 "Heron Preserve (pond + boardwalk)": (GRN, "#b8e0a0", [(900, 960), (1005, 962), (1012, 1090), (908, 1092)]),
 "Bayview homes (SE tip)": (RES, "#f4b183", [(1010, 1012), (1190, 1044), (1300, 1056), (1300, 1105), (1060, 1112), (1010, 1090)]),
 "Trash Mountain (landfill)": ("landfill", "#9a8a5a", [(922, 116), (1072, 116), (1072, 250), (922, 250)]),
 "Windmill Park": (GRN, "#b8e0a0", [(140, 1030), (395, 1048), (402, 1100), (388, 1160), (320, 1190), (232, 1188), (170, 1156), (142, 1095)]),
 "Harbor lots": (IND, "#b9b4d6", [(60, 832), (190, 832), (190, 960), (110, 960), (60, 900)]),
}
LANDMARKS = [("Publix", (868, 372)), ("City Hall", (930, 620)), ("Police", (1030, 640)), ("Seminole Casino", (1180, 495)), ("Retail Commons", (1030, 400)), ("Gas station", (960, 895)), ("Lyons Promenade", (1120, 960)),
             ("Trash Mountain", (997, 183)), ("Windmill Park", (265, 1100)), ("Lakeside Park", (300, 690)), ("Stadium", (1015, 735)), ("Elementary", (830, 745)), ("Gas station west", (360, 585))]


# ---------------- metre-space data for the 3D build ----------------
def _length(pts): return sum(math.dist(a, b) for a, b in zip(pts, pts[1:]))
import math, json, os
def end_relations(roads):
    """(road, end index 0/-1, parent road) for every road end that sits on another road's interior (a T-junction); end-on-end corners are not listed."""
    smooth = {k: _cr(v[2]) for k, v in roads.items()}; out = []
    for k, (rk, hw, pts) in roads.items():
        for idx in (0, -1):
            e = pts[idx]; best = (1e9, None, None)
            for k2, sm in smooth.items():
                if k2 == k: continue
                d, q = _seg_near(e, sm)
                if d < best[0]: best = (d, k2, q)
            if best[0] < 1.0 and min(math.dist(best[2], smooth[best[1]][0]), math.dist(best[2], smooth[best[1]][-1])) > 5: out.append((k, idx, best[1]))
    return out
def resolve_ranks(roads):
    """A road that ends on another road is ranked below it (so the T-junction is cut from the through road); ties between crossing roads are broken by length. Returns {name: float rank}."""
    smooth = {k: _cr(v[2]) for k, v in roads.items()}; rank = {k: float(v[0]) for k, v in roads.items()}; rel = []
    for k, (rk, hw, pts) in roads.items():
        for idx in (0, -1):
            e = pts[idx]; best = (1e9, None, None)
            for k2, sm in smooth.items():
                if k2 == k: continue
                d, q = _seg_near(e, sm)
                if d < best[0]: best = (d, k2, q)
            if best[0] < 1.0 and min(math.dist(best[2], smooth[best[1]][0]), math.dist(best[2], smooth[best[1]][-1])) > 5: rel.append((k, best[1]))     # an L-corner (end on end) is not a T-junction
    Lg = {k: _length(smooth[k]) for k in roads}
    def find_cycle():
        adj = {}
        for c, p in rel: adj.setdefault(c, []).append(p)
        color = {}; stack = []
        def dfs(u):
            color[u] = 1; stack.append(u)
            for v in adj.get(u, []):
                if color.get(v) == 1: return stack[stack.index(v):] + [v]
                if v not in color:
                    r = dfs(v)
                    if r: return r
            color[u] = 2; stack.pop(); return None
        for u in list(adj):
            if u not in color:
                r = dfs(u)
                if r: return r
        return None
    while True:                                                    # mutual T-junctions (A ends on B, B ends on A) cannot both be ranked: drop the relation of the longest road in the cycle
        cyc = find_cycle()
        if not cyc: break
        pairs = list(zip(cyc, cyc[1:])); drop = max(pairs, key=lambda e: (Lg[e[0]], rank[e[0]])); rel = [r for r in rel if r != drop]
    for _ in range(60):
        ch = False
        for c, p in rel:
            if rank[c] >= rank[p]: rank[c] = rank[p] - .1; ch = True
        if not ch: break
    L = {k: _length(smooth[k]) for k in roads}
    for k in rank: rank[k] += min(.05, L[k] / 40000.0)          # tiny length tie-break (longer road = parent)
    return rank
def roads_m():
    rk = resolve_ranks(ROADS); er = end_relations(ROADS); out = []
    for k, (rank, hw, pts) in ROADS.items():
        out.append(dict(name=k, rank=rk[k], base=rank, hw=hw, pts=[to_m(p) for p in pts], push=[i for (c, i, p) in er if c == k], parents={i: p for (c, i, p) in er if c == k}))
    return out
def _ccw(poly):
    a = sum(poly[i][0] * poly[(i + 1) % len(poly)][1] - poly[(i + 1) % len(poly)][0] * poly[i][1] for i in range(len(poly)))
    return poly if a > 0 else poly[::-1]
def coast_m(): return _ccw([to_m(p) for p in json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "trace_v5.json")))["coast"]])
def holes_m(): return [[to_m(p) for p in h] for h in json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "trace_v5.json")))["holes"]]
def bridges_m(): return [(n, to_m(a), to_m(b)) for n, a, b in BRIDGES]
def districts_m(): return {k: (cat, col, [to_m(p) for p in poly]) for k, (cat, col, poly) in DISTRICTS.items()}
def landmarks_m(): return {k: to_m(p) for k, p in LANDMARKS}
