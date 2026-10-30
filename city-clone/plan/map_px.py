"""Plan v5 data in REFERENCE-MAP PIXELS (art/coconut-11-map-reference.png, 1358 x 1159). plan_v5.py converts to metres; the 3D build reads the metre version.
Coast + lakes come from plan/trace_v5.json (water mask of the reference). Roads and districts are hand traced from the map, then bent to OUR district list
(promenade, hospital, small shopping plaza, industrial at the SW edge, school + park, gated townhomes, golf, stadium, condos, preserve).
Scale: 0.43 m per pixel, origin = pixel (690, 545) = Coconut Creek Pkwy x mid road."""
SCALE = 0.43; OX, OY = 690, 545
def to_m(p): return ((p[0] - OX) * SCALE, -(p[1] - OY) * SCALE)

# name: (rank, half-width m, points px).  rank 10 boulevard, 9 arterial, 8 main, 6 collector, 5 local, 3 pedestrian lane.
# Every road end is snapped onto another road within SNAP px (so nothing nearly meets); loose ends are listed by check_roads() unless named in OK_ENDS.
RAW_ROADS = {
 "Coconut Creek Pkwy": (10, 8.4, [(668, 290), (675, 340), (682, 420), (688, 540), (690, 700), (692, 820), (693, 900), (693, 985), (688, 1040), (715, 1088), (770, 1110), (850, 1116), (920, 1105), (965, 1080), (995, 1040), (1015, 995), (1033, 955), (1050, 905), (1062, 858)]),
 "Wiles Rd": (9, 5.0, [(-20, 766), (60, 778), (130, 796), (210, 812), (300, 818), (400, 822), (520, 830), (620, 832), (692, 824), (780, 822), (880, 822), (960, 828), (1030, 842), (1062, 860), (1130, 880), (1200, 896), (1250, 920), (1300, 937), (1340, 955), (1378, 964)]),
 "Palm Blvd": (8, 4.2, [(100, 558), (130, 557), (190, 556), (212, 550), (240, 546), (300, 543), (390, 543), (470, 548), (560, 553), (640, 553), (692, 550), (740, 548), (850, 546), (960, 540), (1040, 538), (1090, 540), (1150, 568), (1230, 625), (1295, 690), (1335, 760), (1330, 830), (1312, 890), (1302, 934)]),
 "Northridge Rd": (8, 4.2, [(395, 278), (470, 282), (560, 284), (668, 290), (740, 292), (840, 292), (940, 292), (1030, 291), (1098, 292)]),
 "Creekview Dr": (8, 4.2, [(1050, 100), (1090, 150), (1108, 215), (1100, 292), (1094, 400), (1090, 540), (1088, 640), (1086, 720), (1078, 800), (1062, 858)]),
 "West Creek Rd": (8, 4.2, [(352, 75), (356, 110), (358, 170), (360, 230), (372, 260), (395, 278), (405, 300), (405, 400), (398, 470), (392, 545), (392, 640), (410, 720), (405, 790), (396, 822)]),
 "Creekside Loop": (8, 4.2, [(186, 822), (176, 870), (168, 910), (170, 950), (185, 985), (230, 997), (300, 1005), (400, 1016), (480, 1028), (530, 1032), (543, 1010), (543, 975)]),
 # north-west lobe
 "Lakeview Loop": (6, 3.5, [(352, 75), (380, 64), (415, 64), (438, 82), (440, 110), (437, 150), (437, 200), (433, 250), (425, 279)]),
 "Lakeview Island Rd": (6, 3.5, [(738, 126), (700, 127), (668, 123), (650, 115), (620, 128), (580, 142), (545, 155), (560, 178), (588, 205), (600, 240), (598, 278)]),
 "West Creek Ln": (5, 3.2, [(357, 110), (300, 112), (268, 118), (266, 200), (270, 255), (300, 262), (358, 262)]),
 "West Creek Ln 2": (5, 3.2, [(268, 182), (312, 182), (358, 182)]),
 "Hospital Dr": (5, 3.2, [(405, 350), (375, 352), (335, 350), (312, 345)]),
 "Townhome Ln": (5, 3.2, [(240, 546), (238, 500), (240, 470), (280, 477), (370, 476), (400, 476)]),
 # north-east lobe
 "Northridge Loop": (6, 3.5, [(703, 292), (705, 250), (715, 215), (738, 188), (738, 110), (765, 72), (830, 62), (890, 75), (925, 120), (926, 200), (924, 240), (905, 255), (890, 266), (890, 292)]),
 "Northridge Ln": (5, 3.2, [(738, 188), (850, 186), (925, 186)]),
 "Windmill Dr": (5, 3.2, [(925, 112), (960, 90), (1000, 80), (1035, 90), (1050, 100)]),
 # centre
 "Retail Dr": (6, 3.5, [(613, 436), (640, 434), (668, 432), (740, 429), (850, 428), (960, 428), (1094, 430)]),
 "Retail Row": (5, 3.2, [(742, 293), (742, 429)]),
 "Commons Ave": (6, 3.5, [(902, 293), (902, 428), (900, 546)]),
 "Market Ln": (5, 3.2, [(880, 429), (880, 546)]),
 "Mart Lane": (5, 3.2, [(992, 293), (992, 430), (992, 540)]),
 "Centre Ln": (5, 3.2, [(802, 548), (802, 676)]),
 "School Dr": (5, 3.2, [(692, 676), (780, 676), (905, 676)]),
 "Civic Rd": (6, 3.5, [(905, 548), (905, 640), (906, 720), (905, 822)]),
 "Stadium Ln": (5, 3.2, [(1058, 548), (1058, 676), (1058, 790)]),
 "Fields Dr": (5, 3.2, [(906, 792), (1000, 792), (1086, 790)]),
 # the lakes + palm view
 "Lakes Lane N": (5, 3.2, [(405, 308), (440, 313), (500, 312), (580, 313), (598, 325), (603, 360), (609, 395)]),
 "Lakes Dr": (6, 3.5, [(405, 432), (480, 430), (505, 413), (530, 398), (560, 393), (610, 396)]),
 "Lakes Diag N": (6, 3.5, [(610, 396), (613, 440), (605, 480), (585, 515), (556, 548)]),
 "Palm Ct Rd": (5, 3.2, [(396, 604), (437, 601), (480, 605), (515, 616), (540, 634), (575, 643), (620, 646), (688, 648)]),
 "Palm View Rd": (5, 3.2, [(410, 712), (445, 708), (485, 713), (525, 721), (570, 731), (620, 734), (688, 732)]),
 "Lakes Diag S": (6, 3.5, [(556, 548), (535, 578), (518, 614), (510, 650), (510, 690), (522, 721)]),
 "Palm View Loop": (5, 3.2, [(446, 708), (443, 668), (495, 667), (510, 663)]),
 # west
 "Riverside Dr": (6, 3.5, [(180, 558), (180, 600), (190, 628), (213, 655), (217, 690), (212, 730), (200, 765), (193, 808)]),
 "Marina Dr": (5, 3.2, [(120, 558), (108, 578), (103, 640), (105, 710), (112, 760), (125, 795)]),
 "Heron Point Dr": (5, 3.2, [(125, 557), (120, 530), (118, 510)]),
 # industrial
 "Industrial Row": (6, 3.5, [(172, 948), (250, 952), (330, 958), (397, 960), (497, 962), (542, 966), (620, 964), (692, 960)]),
 "Creekside Rd": (5, 3.2, [(397, 826), (397, 960), (398, 1016)]),
 "Dock Ln": (5, 3.2, [(487, 962), (487, 1024)]),
 "Harbor Lot Rd": (5, 3.2, [(176, 858), (140, 872), (118, 900), (135, 930), (170, 947)]),
 # south-east
 "Southgate Rd": (6, 3.5, [(693, 956), (800, 955), (900, 955), (1000, 962), (1034, 962)]),
 "Southgate Ln": (6, 3.5, [(887, 826), (888, 955), (886, 1040), (870, 1060), (830, 1066), (780, 1067), (738, 1066), (700, 1068)]),
 "Southgate Ave": (5, 3.2, [(788, 955), (788, 1066)]),
 "Southgate Ct": (5, 3.2, [(762, 838), (762, 880), (775, 890), (830, 893), (887, 893)]),
 "Gas Station Rd": (5, 3.2, [(928, 826), (928, 955)]),
 "Preserve Rd": (5, 3.2, [(910, 962), (912, 1020), (908, 1070), (906, 1108)]),
 "Lyons Ln": (6, 3.5, [(1024, 965), (1060, 982), (1100, 990), (1140, 1005), (1180, 1030), (1192, 1050), (1240, 1068), (1286, 1078)]),
 "Bay Dr": (6, 3.5, [(1296, 936), (1253, 953), (1230, 968), (1217, 990), (1213, 1023), (1192, 1042)]),
 "Lyons Promenade": (3, 4.0, [(1048, 925), (1110, 945), (1170, 962), (1216, 985)]),
 "Canal Ridge Dr": (6, 3.5, [(1128, 874), (1128, 840), (1135, 818), (1170, 812), (1215, 818), (1280, 835), (1318, 846)]),
}
OK_ENDS = {("Palm Blvd", 0), ("Heron Point Dr", -1), ("Hospital Dr", -1), ("Lyons Ln", -1), ("Wiles Rd", 0), ("Wiles Rd", -1)}   # coast / bridge-gate / lot / cul-de-sac ends allowed
SNAP = 17.0
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
           ("Lakeview Bridge", (642, 124), (668, 124)), ("Creekside Bridge", (632, 960), (648, 960)), ("Lakeside footbridge", (236, 714), (262, 714))]
# gates at the world edge (the two Wiles bridges lead off-map: closed for construction)
EDGE_GATES = [("west", (-20, 766)), ("east", (1378, 964))]

# districts: name -> (category, colour, polygon px). Clipped to land when drawn.
RES, COM, CIV, GRN, IND, GOLF = "residential", "commercial", "civic / school / health", "park / green", "industrial", "golf"
DISTRICTS = {
 "Lakeview Estates (canal homes)": (RES, "#f4b183", [(400, 66), (660, 66), (660, 258), (560, 283), (470, 281), (402, 262)]),
 "West Creek Townhomes (gated)": (RES, "#f0a070", [(250, 90), (340, 90), (340, 262), (300, 282), (240, 282), (245, 200)]),
 "St. Coconut Hospital": (CIV, "#a8c8f0", [(284, 282), (368, 282), (368, 366), (284, 366)]),
 "West Creek Townhomes (south)": (RES, "#f0a070", [(240, 372), (340, 372), (345, 450), (320, 530), (236, 520)]),
 "Heron Point (marina + preserve)": (GRN, "#b8e0a0", [(44, 430), (160, 428), (215, 520), (210, 550), (60, 552), (42, 490)]),
 "Riverside Condos + Marina": (RES, "#ff9a8a", [(50, 572), (200, 572), (200, 790), (60, 790)]),
 "Lakeside Park": (GRN, "#b8e0a0", [(222, 566), (400, 566), (400, 790), (222, 790)]),
 "The Lakes (lake homes)": (RES, "#f4b183", [(412, 300), (660, 300), (656, 545), (412, 545)]),
 "Palm View (small homes)": (RES, "#f7c59f", [(412, 556), (684, 556), (684, 812), (412, 812)]),
 "Creekside Industrial Park": (IND, "#b9b4d6", [(110, 832), (650, 832), (650, 1055), (260, 1055), (150, 970), (110, 880)]),
 "Retail Commons (small shops)": (COM, "#8ec5ea", [(698, 300), (900, 300), (900, 426), (698, 426)]),
 "Library + clinics": (CIV, "#f2d38a", [(906, 300), (1092, 300), (1092, 426), (906, 426)]),
 "PALM MARKET plaza (small)": (COM, "#8ec5ea", [(698, 438), (900, 438), (900, 542), (698, 542)]),
 "Office row": (COM, "#9fd0ee", [(906, 438), (1086, 438), (1086, 542), (906, 542)]),
 "Civic Centre": (CIV, "#f2d38a", [(908, 556), (1086, 556), (1086, 668), (908, 668)]),
 "Centre homes": (RES, "#f4b183", [(698, 560), (900, 560), (900, 672), (698, 672)]),
 "Elementary School": (CIV, "#f2d38a", [(698, 682), (900, 682), (900, 814), (698, 814)]),
 "Sports fields + stadium": (CIV, "#d8e8a0", [(908, 674), (1086, 674), (1086, 812), (908, 812)]),
 "Northridge Homes": (RES, "#f4b183", [(736, 68), (930, 68), (930, 290), (736, 290)]),
 "Windmill Park": (GRN, "#b8e0a0", [(938, 56), (1100, 56), (1104, 290), (938, 290)]),
 "Creekview Golf Club": (GOLF, "#9acd6a", [(1102, 292), (1345, 292), (1345, 645), (1102, 645)]),
 "Canal Ridge Condos": (RES, "#ff9a8a", [(1102, 680), (1338, 680), (1338, 905), (1102, 905)]),
 "Gas station + Lyons Mart": (COM, "#8ec5ea", [(880, 830), (1030, 830), (1030, 948), (880, 948)]),
 "Lyons Promenade (shops + pedestrian lane)": (COM, "#f7a8c8", [(1036, 905), (1200, 925), (1206, 1004), (1036, 1000)]),
 "Bay park": (GRN, "#b8e0a0", [(1212, 940), (1296, 948), (1290, 1030), (1218, 1030)]),
 "Southgate Homes": (RES, "#f4b183", [(700, 835), (885, 835), (885, 1095), (730, 1105), (700, 1050)]),
 "Heron Preserve (pond + boardwalk)": (GRN, "#b8e0a0", [(900, 960), (1005, 962), (1012, 1090), (908, 1092)]),
 "Bayview homes (SE tip)": (RES, "#f4b183", [(1010, 1012), (1190, 1040), (1300, 1056), (1300, 1105), (1060, 1112), (1010, 1090)]),
 "Harbor lots": (IND, "#b9b4d6", [(60, 832), (190, 832), (190, 960), (110, 960), (60, 900)]),
}
LANDMARKS = [("PALM MARKET", (790, 490)), ("Civic Centre", (960, 620)), ("Retail Commons", (850, 375)), ("Gas station", (960, 895)), ("Lyons Promenade", (1120, 960)),
             ("Windmill Park", (1020, 190)), ("Lakeside Park", (300, 690)), ("Stadium", (1015, 735)), ("Elementary", (830, 745)), ("Hospital", (326, 322))]
