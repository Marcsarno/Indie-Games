"""2D city plan (Blender metres, x east, y north) drawn with PIL. The point lists here are meant to become the data the 3D build reads (outline, districts, arterials, water, landmarks).
Run: python3 plan/plan2d.py  -> art-review/plan/plan_v1.png"""
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

# ---- outline: an irregular rounded blob (CCW), bays for the lake, a diagonal SW cut, a bulge on the industrial side
OUTLINE = [(192, -40), (190, 30), (182, 92), (160, 140), (118, 176), (60, 192), (-10, 184), (-70, 190), (-130, 172), (-176, 128), (-192, 60), (-190, -10), (-178, -70), (-150, -120), (-104, -164), (-44, -186), (30, -190), (100, -192), (160, -176), (190, -130)]
outline = catmull(OUTLINE)
loop_c = offset_poly(outline, -13)                           # the perimeter parkway runs just inside

# ---- districts: polygons (x, y) in metres. Colour, label.
D = {
 "Old centre (kept)": ([(-100, -100), (100, -100), (100, 100), (-100, 100)], "#e8e1c8"),
 "Promenade": ([(70, 112), (150, 104), (156, 126), (74, 134)], "#f0b9c8"),
 "Promenade garage + lot": ([(100, 84), (150, 84), (150, 100), (100, 100)], "#c9c9d2"),
 "Golf course + clubhouse": ([(110, -6), (182, 6), (178, 96), (118, 92)], "#9fd48a"),
 "Industrial": ([(104, -184), (186, -150), (188, -110), (108, -108)], "#b7b1a8"),
 "School + stadium + sports park": ([(-186, -50), (-108, -56), (-112, 56), (-186, 60)], "#f2d38a"),
 "Residential SW (curvy, cul-de-sacs)": ([(-176, -140), (-104, -150), (-100, -108), (-182, -78)], "#f4b183"),
 "Residential NW (gated townhomes)": ([(-170, 112), (-108, 108), (-104, 168), (-150, 160)], "#f4b183"),
 "Condos": ([(-40, -182), (60, -186), (62, -112), (-40, -110)], "#c4a6e0"),
 "Retail commons (big-box, plazas)": ([(-30, 114), (50, 116), (52, 180), (-26, 178)], "#8ec5ea"),
 "Nature preserve + butterfly garden": ([(-102, -184), (-44, -176), (-44, -112), (-102, -110)], "#6fb38a"),
}
LAKES = [("Promenade lake", [(96, 150), (128, 160), (158, 150), (150, 138), (112, 136)]), ("Park lake", [(-160, 0), (-130, 6), (-124, -24), (-150, -34)]), ("Canal / pond", [(-44, 150), (-10, 156), (10, 144), (-20, 138)]),
         ("Preserve lake", [(-96, -150), (-70, -140), (-60, -158), (-88, -168)]), ("Existing lakes", [(-78, -60), (-20, -42), (-30, -70)])]
# ---- roads: (name, points, width in px, colour). Arterials are not parallel, the loop follows the outline.
ROADS = [
 ("Coconut Creek Pkwy", [(20, -192), (16, -100), (-2, 0), (-8, 80), (3, 190)], 11, "#555"),
 ("Wiles Rd", [(-186, -22), (-100, -14), (0, -6), (100, 0), (186, 6)], 8, "#666"),
 ("North arterial", [(-176, 138), (-80, 142), (10, 130), (90, 126), (160, 130)], 8, "#666"),
 ("South arterial", [(-150, -126), (-60, -136), (30, -128), (110, -120), (186, -130)], 8, "#666"),
 ("West collector", [(-124, -150), (-120, -50), (-122, 40), (-126, 110), (-120, 160)], 6, "#777"),
 ("East collector", [(112, -170), (118, -80), (112, 10), (118, 80)], 6, "#777"),
]
LANDMARKS = [("stadium", (-146, 14)), ("water tower", (150, -140)), ("fountain square", (112, 118)), ("clubhouse", (150, 50)), ("hospital", (-146, -26)), ("visitor centre", (-70, -150)), ("city hall", (38, -60)), ("shopping center", (20, 40))]

def build(path):
    img = Image.new("RGB", (W, W), "#cfe2f3"); d = ImageDraw.Draw(img)
    try: F = ImageFont.truetype("DejaVuSans-Bold.ttf", 20); F2 = ImageFont.truetype("DejaVuSans.ttf", 16); F3 = ImageFont.truetype("DejaVuSans-Bold.ttf", 30)
    except Exception: F = F2 = F3 = ImageFont.load_default()
    for gx in range(-200, 201, 50):
        d.line([P(gx, -212), P(gx, 212)], fill="#b9cfe0", width=1); d.line([P(-212, gx), P(212, gx)], fill="#b9cfe0", width=1)
    d.polygon([P(*p) for p in outline], fill="#d9ecc8", outline="#2f5f2f")
    for name, (poly, col) in D.items():
        d.polygon([P(*p) for p in poly], fill=col, outline="#444")
        cx = sum(p[0] for p in poly) / len(poly); cy = sum(p[1] for p in poly) / len(poly); lines = name.replace(" (", "\n(").replace(" + ", "\n").split("\n")
        for k, ln in enumerate(lines):
            tx_, ty_ = P(cx, cy)[0], P(cx, cy)[1] + (k - (len(lines) - 1) / 2) * 22
            for ox_, oy_ in ((-2, 0), (2, 0), (0, -2), (0, 2)): d.text((tx_ + ox_, ty_ + oy_), ln, fill="#ffffffcc", font=F, anchor="mm")
            d.text((tx_, ty_), ln, fill="#222", font=F, anchor="mm")
    for name, pts in LAKES:
        poly = catmull(pts, True, 2.0); d.polygon([P(*p) for p in poly], fill="#5aa0d8", outline="#2d6aa8"); cx = sum(p[0] for p in pts) / len(pts); cy = sum(p[1] for p in pts) / len(pts); d.text(P(cx, cy), name, fill="#0b2a50", font=F2, anchor="mm")
    d.line([P(*p) for p in loop_c + [loop_c[0]]], fill="#3a3a3a", width=14, joint="curve")
    d.line([P(*p) for p in loop_c + [loop_c[0]]], fill="#f2c230", width=2)
    for name, pts, w, col in ROADS:
        c = catmull(pts, False, 2.0); d.line([P(*p) for p in c], fill=col, width=w, joint="curve")
    # promenade lane (pedestrian only) and cul-de-sacs as little marks
    d.line([P(*p) for p in catmull([(76, 123), (100, 121), (126, 118), (150, 115)], False)], fill="#ffffff", width=7); d.line([P(*p) for p in catmull([(76, 123), (100, 121), (126, 118), (150, 115)], False)], fill="#e84a7a", width=3)
    for (x, y) in ((-150, -118), (-130, -110), (-140, 128), (-120, 140)): d.ellipse([P(x - 6, y + 6), P(x + 6, y - 6)], fill="#444", outline="#fff")
    for nm, (x, y) in LANDMARKS:
        d.ellipse([P(x - 3, y + 3), P(x + 3, y - 3)], fill="#d22", outline="#fff"); d.text((P(x, y)[0] + 10, P(x, y)[1]), nm, fill="#600", font=F2, anchor="lm")
    d.rectangle([P(-100, 100), P(100, -100)], outline="#b00", width=3)
    d.text((24, 20), "Grand Theft Coconut Creek  city plan v1 (400 m, irregular outline)", fill="#123", font=F3)
    d.text((24, 60), "red box = existing 200 m centre (kept as is).  Dark ring = perimeter parkway.  Pink/white lane = pedestrian promenade.", fill="#123", font=F2)
    d.text((W - 24, W - 24), "N ^", fill="#123", font=F3, anchor="rd")
    img.save(path)
if __name__ == "__main__":
    out = os.path.join(os.path.dirname(__file__), "..", "art-review", "plan"); os.makedirs(out, exist_ok=True); build(os.path.join(out, "plan_v1.png")); print("saved")
