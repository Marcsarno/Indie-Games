"""2D city plan (Blender metres, x east, y north) drawn with PIL. The point lists here are meant to become the data the 3D build reads (outline, districts, arterials, water, landmarks).
Run: python3 plan/plan2d.py  -> art-review/plan/plan_v4.png"""
import math, os
from PIL import Image, ImageDraw, ImageFont

S = 4.0; W = 1700; OX = OY = W / 2   # pixels per metre (4) over +-212 m
def P(x, y): return (OX + x * S, OY - y * S)
def catmull(pts, closed=True, step=2.0):
    n = len(pts); out = []
    for i in range(n if closed else n - 1):
        p0, p1, p2, p3 = pts[(i - 1) % n], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]
        L = math.dist(p1, p2); k = max(4, int(L / step))
        for j in range(k):
            t = j / k; t2, t3 = t * t, t * t * t
            out.append(tuple(.5 * ((2 * p1[d]) + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3) for d in (0, 1)))
    return out
def offset_poly(poly, d):                                   # inward (d>0) offset of a CCW closed polyline by moving each vertex along its smoothed normal
    n = len(poly); out = []
    for i in range(n):
        a, b = poly[i - 3], poly[(i + 3) % n]; tx, ty = b[0] - a[0], b[1] - a[1]; l = math.hypot(tx, ty) or 1; out.append((poly[i][0] - ty / l * -d, poly[i][1] + tx / l * -d))
    return out

# ---- outline: a deliberately lumpy coastline (CCW). Bays are water, the land has peninsulas, notches and arms.
OUTLINE = [(120, -196), (196, -172), (198, -104), (166, -62), (140, -30), (186, 8), (198, 78), (172, 132), (160, 188), (104, 196), (74, 156), (36, 128), (-4, 142), (-30, 176), (-70, 192), (-132, 196), (-190, 152), (-198, 76), (-164, 34), (-198, -26), (-188, -92), (-146, -118), (-150, -182), (-64, -196), (-50, -150), (18, -166), (30, -194)]
outline = catmull(OUTLINE)
EDGES = [(0, 5, "forest", "#2f6f3a"), (5, 8, "fence", "#8a6a2a"), (8, 10, "water", "#2d78b8"), (10, 13, "water", "#2d78b8"), (13, 16, "forest", "#2f6f3a"), (16, 20, "highway", "#444"), (20, 23, "forest", "#2f6f3a"), (23, 26, "water", "#2d78b8")]

# ---- districts: polygons (x, y) in metres, clipped to the outline when drawn
RES, COM, CIV, GRN, IND, MIX = "residential", "commercial", "civic / school / health", "park / green", "industrial", "roads / transition"
D = {
 "Centre: homes (kept)": ([(-100, 14), (-16, 14), (-16, 100), (-100, 100)], "#f4b183", RES),
 "Centre: park + lakes (kept)": ([(-100, -100), (-16, -100), (-16, 6), (-100, 6)], "#b8e0a0", GRN),
 "Centre: civic + school (kept)": ([(16, -100), (100, -100), (100, -14), (16, -14)], "#f2d38a", CIV),
 "Centre: shopping plaza (SHRUNK)": ([(14, 8), (48, 8), (48, 62), (14, 62)], "#8ec5ea", COM),
 "Centre: new homes (replace east half of plaza)": ([(50, 8), (100, 8), (100, 100), (20, 100), (20, 64), (50, 64)], "#e89c6a", RES),
 "Centre: boulevard strip": ([(-16, -100), (16, -100), (16, 100), (-16, 100)], "#e8e1c8", MIX),
 "Promenade street + square": ([(70, 116), (186, 150), (180, 186), (84, 152)], "#f0b9c8", COM),
 "Promenade garage": ([(100, 102), (152, 102), (152, 128), (100, 128)], "#c9c9d2", COM),
 "Golf course + clubhouse": ([(130, -22), (200, -6), (200, 100), (130, 100)], "#9fd48a", GRN),
 "Hospital": ([(112, -98), (170, -84), (164, -40), (112, -40)], "#e6a0a0", CIV),
 "Industrial (yards, depots)": ([(112, -200), (200, -200), (200, -118), (112, -106)], "#b7b1a8", IND),
 "School + stadium + sports park": ([(-200, -30), (-108, -34), (-110, 52), (-200, 56)], "#f2d38a", CIV),
 "Suburbs (curvy, cul-de-sacs)": ([(-198, -196), (-104, -198), (-102, -108), (-106, -40), (-198, -36)], "#f4b183", RES),
 "Gated townhomes": ([(-198, 106), (-110, 106), (-110, 200), (-172, 200), (-198, 160)], "#e89c6a", RES),
 "Lakeside homes (north bay west shore)": ([(-40, 108), (20, 108), (8, 160), (-30, 200), (-44, 200)], "#f6c9a0", RES),
 "Retail commons (big lots)": ([(-106, 110), (-44, 110), (-46, 200), (-106, 200)], "#8ec5ea", COM),
 "Condos (tall, narrow)": ([(24, -200), (104, -200), (104, -124), (26, -124)], "#c4a6e0", RES),
 "Nature preserve": ([(-96, -200), (-52, -200), (-48, -112), (-96, -108)], "#6fb38a", GRN),
}
LAKES = [("North bay", [(40, 124), (80, 150), (104, 190), (76, 188), (30, 150)]), ("Park lake", [(-176, 4), (-142, 12), (-134, -16), (-166, -26)]), ("Existing lakes", [(-78, -60), (-20, -42), (-30, -70)]),
         ("South bay", [(-46, -150), (-10, -156), (14, -196), (-30, -198), (-52, -176)])]
ROADS = [
 ("Coconut Creek Pkwy", [(40, -192), (16, -100), (-2, 0), (-8, 80), (-10, 112)], 11, "#555"),
 ("Wiles Rd", [(-198, -10), (-100, -14), (0, -6), (100, 0), (190, 6)], 8, "#666"),
 ("Lyons Rd (north)", [(-150, 160), (-60, 146), (10, 112), (60, 120), (150, 150)], 8, "#666"),
 ("South arterial", [(-120, -150), (-60, -136), (30, -122), (110, -128), (190, -140)], 8, "#666"),
 ("West collector", [(-150, -110), (-120, -50), (-122, 40), (-130, 110), (-150, 180)], 6, "#777"),
 ("East collector", [(118, -150), (122, -80), (116, 10), (124, 100)], 6, "#777"),
 ("Coast road (north-east)", [(116, 108), (140, 120), (166, 150)], 6, "#777"),
]
LANDMARKS = [("stadium", (-152, 14)), ("water tower", (150, -150)), ("fountain square", (160, 164)), ("clubhouse", (156, 50)), ("hospital", (140, -60)), ("visitor centre", (-72, -150)), ("city hall", (38, -60)), ("shopping center", (20, 40)), ("big-box", (-50, 150))]

AREAS = {}; CATS = {}
def compute_areas():
    from PIL import ImageChops
    o = Image.new('L', (W, W), 0); ImageDraw.Draw(o).polygon([P(*p) for p in outline], fill=255); tot = sum(1 for v in o.getdata() if v > 127) / (S * S)
    for k, (poly, c, cat) in D.items():
        m = Image.new('L', (W, W), 0); ImageDraw.Draw(m).polygon([P(*p) for p in poly], fill=255); a = sum(1 for v in ImageChops.multiply(m, o).getdata() if v > 127) / (S * S); AREAS[k] = f'{a / 1000:.1f}k ({100 * a / tot:.0f}%)'; CATS[cat] = CATS.get(cat, 0) + a
    CATS['_total'] = tot; return tot
def build(path):
    compute_areas()
    img = Image.new("RGB", (W, W), "#cfe2f3"); d = ImageDraw.Draw(img)
    try: F = ImageFont.truetype("DejaVuSans-Bold.ttf", 20); F2 = ImageFont.truetype("DejaVuSans.ttf", 16); F3 = ImageFont.truetype("DejaVuSans-Bold.ttf", 30)
    except Exception: F = F2 = F3 = ImageFont.load_default()
    for gx in range(-200, 201, 50):
        d.line([P(gx, -212), P(gx, 212)], fill="#b9cfe0", width=1); d.line([P(-212, gx), P(212, gx)], fill="#b9cfe0", width=1)
    d.polygon([P(*p) for p in outline], fill="#d9ecc8")
    mask = Image.new("L", (W, W), 0); ImageDraw.Draw(mask).polygon([P(*p) for p in outline], fill=255); layer = Image.new("RGB", (W, W), "#00000000" if False else "#d9ecc8"); ld = ImageDraw.Draw(layer); ld.polygon([P(*p) for p in outline], fill="#d9ecc8")
    for name, (poly, col, cat) in D.items(): ld.polygon([P(*p) for p in poly], fill=col, outline="#555")
    img.paste(layer, (0, 0), mask); d = ImageDraw.Draw(img)
    for name, (poly, col, cat) in D.items():
        cx = sum(p[0] for p in poly) / len(poly); cy = sum(p[1] for p in poly) / len(poly); cx = max(-170, min(170, cx)); cy = max(-180, min(180, cy)); lines = name.replace(" (", "\n(").replace(" + ", "\n").split("\n") + ([AREAS.get(name, "")] if AREAS.get(name) else [])
        for k, ln in enumerate(lines):
            tx_, ty_ = P(cx, cy)[0], P(cx, cy)[1] + (k - (len(lines) - 1) / 2) * 22
            for ox_, oy_ in ((-2, 0), (2, 0), (0, -2), (0, 2)): d.text((tx_ + ox_, ty_ + oy_), ln, fill="#ffffffcc", font=F, anchor="mm")
            d.text((tx_, ty_), ln, fill="#222", font=F, anchor="mm")
    # outline drawn per edge type: water shore, forest belt, highway embankment, fence
    n_ = len(OUTLINE); per = len(outline) // n_
    for (i0, i1, kind, col) in EDGES:
        seg = outline[i0 * per:i1 * per + 1]
        d.line([P(*p) for p in seg], fill=col, width=12 if kind == "highway" else 9, joint="curve")
        mid = seg[len(seg) // 2]; d.text(P(mid[0] * 1.07, mid[1] * 1.07), kind, fill=col, font=F2, anchor="mm")
    for name, pts in LAKES:
        poly = catmull(pts, True, 2.0); d.polygon([P(*p) for p in poly], fill="#5aa0d8", outline="#2d6aa8"); cx = sum(p[0] for p in pts) / len(pts); cy = sum(p[1] for p in pts) / len(pts); d.text(P(cx, cy), name, fill="#0b2a50", font=F2, anchor="mm")
    for name, pts, w, col in ROADS:
        c = catmull(pts, False, 2.0); d.line([P(*p) for p in c], fill=col, width=w, joint="curve")
    # promenade lane (pedestrian only) and cul-de-sacs as little marks
    d.line([P(*p) for p in catmull([(76, 123), (100, 121), (126, 118), (150, 115)], False)], fill="#ffffff", width=7); d.line([P(*p) for p in catmull([(76, 123), (100, 121), (126, 118), (150, 115)], False)], fill="#e84a7a", width=3)
    for (x, y) in ((-150, -118), (-130, -110), (-140, 128), (-120, 140)): d.ellipse([P(x - 6, y + 6), P(x + 6, y - 6)], fill="#444", outline="#fff")
    for nm, (x, y) in LANDMARKS:
        d.ellipse([P(x - 3, y + 3), P(x + 3, y - 3)], fill="#d22", outline="#fff"); d.text((P(x, y)[0] + 10, P(x, y)[1]), nm, fill="#600", font=F2, anchor="lm")
    d.rectangle([P(-100, 100), P(100, -100)], outline="#b00", width=3)
    d.text((24, 20), "Grand Theft Coconut Creek  city plan v4 (residential about a third, smaller shopping plaza)", fill="#123", font=F3)
    d.text((24, 60), "red box = existing 200 m centre (kept as is).  Edges: blue=water, green=forest belt, grey=highway embankment, brown=fence.", fill="#123", font=F2)
    y_ = 100
    for cat, v in sorted(((c, v) for c, v in CATS.items() if c != "_total"), key=lambda t: -t[1]): d.text((24, y_), f"{cat}: {100 * v / CATS['_total']:.0f}%", fill="#123", font=F, anchor="lm"); y_ += 26
    d.text((W - 24, W - 24), "N ^", fill="#123", font=F3, anchor="rd")
    img.save(path)
if __name__ == "__main__":
    out = os.path.join(os.path.dirname(__file__), "..", "art-review", "plan"); os.makedirs(out, exist_ok=True); build(os.path.join(out, "plan_v4.png")); print("saved")
