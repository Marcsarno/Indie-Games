"""Lists every road stretch that runs over water (coast or lake). Bridges are expected only at: Wiles Rd (both ends), Palm Blvd (marina inlet), Lakeview Island Rd, Industrial Row, Canal Ridge Dr."""
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import map_px as M
cm = M._ccw(M.coast_m()); cs = M._cr(cm + [cm[0]], 0.5); holes = [M._cr(h + [h[0]], 0.5) for h in M.holes_m()]
def inside(poly, x, y):
    c = False
    for i in range(len(poly) - 1):
        a, b = poly[i], poly[i + 1]
        if (a[1] > y) != (b[1] > y) and x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]: c = not c
    return c
for d in M.roads_m():
    bad = [p for p in M._cr(d["pts"], 2.0) if (not inside(cs, *p)) or any(inside(h, *p) for h in holes)]
    if bad: print(d["name"], len(bad) * 2, "m over water; first", [round(v) for v in bad[0]], "last", [round(v) for v in bad[-1]])
