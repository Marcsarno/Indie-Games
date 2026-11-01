"""City plan v7 (round 37): the whole city re-laid from the user's description of the real Coconut Creek road grid + their Google Maps screenshots.
The real city is long and skinny (~3 km x 9 km); the game version keeps the real ORDER of roads but squares it up (user: "spread the roads a little wider").
Coordinates in metres: x east, y north, origin = Lyons Rd at Coconut Creek Pkwy. Run: python3 plan_v7.py -> plan_v7.png
This file is the single source of truth for the new layout; iterate here with the user before any 3D build."""
from PIL import Image, ImageDraw, ImageFont
import math, os

# ---- roads: name, polyline [(x, y)...], width m, kind (art = arterial, hwy = expressway, col = collector) ----
X441, XBANKS, XLYONS, XPOWER = -330, -165, 0, 330
Y = dict(pkwy=0, hammock=95, copans=200, sample=320, wiles=430, winston=525, johnson=650, hillsboro=730)
def curve(pts, n=12):                 # smooth a polyline (Catmull-Rom) so curved roads read as curves
    out = []
    for i in range(len(pts) - 1):
        p0, p1, p2, p3 = pts[max(0, i - 1)], pts[i], pts[i + 1], pts[min(len(pts) - 1, i + 2)]
        for k in range(n):
            t = k / n; t2, t3 = t * t, t * t * t
            out.append(tuple(.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3) for j in (0, 1)))
    out.append(pts[-1]); return out
ROADS = [
    ("State Rd 7 (US 441)", [(X441, -40), (X441, 770)], 24, "art"),
    ("Banks Rd", [(XBANKS, -40), (XBANKS, Y["sample"])], 12, "col"),                    # screenshots: west of Lyons, from the south edge up to Sample
    ("Lyons Rd", [(XLYONS, -40), (XLYONS, 770)], 22, "art"),
    ("Powerline Rd", [(XPOWER, -40), (XPOWER, 770)], 22, "art"),
    ("Coconut Creek Pkwy", [(X441, Y["pkwy"]), (XPOWER, Y["pkwy"])], 18, "art"),
    ("Hammock Blvd", [(X441, Y["hammock"]), (XLYONS, Y["hammock"])], 14, "col"),          # west of Lyons only; east of Lyons = the Wynmoore gate drive
    ("Copans Rd", [(X441, Y["copans"]), (XPOWER, Y["copans"])], 18, "art"),
    ("Sample Rd", [(X441, Y["sample"]), (XPOWER, Y["sample"])], 24, "art"),
    ("Wiles Rd", [(X441, Y["wiles"]), (XPOWER, Y["wiles"])], 16, "art"),
    ("Winston Park Blvd", curve([(X441, Y["winston"] + 10), (-200, Y["winston"] + 18), (-80, Y["winston"]), (XLYONS, Y["winston"] - 4), (XPOWER, Y["winston"] - 4)]), 16, "art"),   # real one bends up toward 441
    ("Sawgrass Expressway", curve([(X441 - 40, 560), (-150, 585), (XLYONS, 600), (150, 625), (XPOWER + 40, 640)]), 26, "hwy"),          # the big diagonal highway between Winston Park and Johnson
    ("Johnson Rd", [(X441, Y["johnson"]), (XLYONS, Y["johnson"])], 12, "col"),
    ("Hillsboro Blvd", [(X441, Y["hillsboro"]), (XPOWER, Y["hillsboro"])], 22, "art"),
]
# ---- areas ----
ZONES = [  # label, polygon, fill, text colour
    ("WYNMOORE\n(gated, golf)", [(14, 14), (316, 14), (316, 186), (14, 186)], "#e9d8a6", "#5a4310"),
    ("FARM FIELDS", [(-316, 334), (-180, 334), (-180, 416), (-316, 416)], "#c9b27a", "#5a4310"),
    ("TRADEWINDS PARK\n+ BUTTERFLY WORLD", [(150, 214), (316, 214), (316, 306), (150, 306)], "#7cc05a", "#1f4d12"),
]
LAKES = [[(-300, 40), (-255, 30), (-215, 60), (-230, 82), (-290, 78)], [(-120, 470), (-80, 462), (-60, 495), (-110, 508)], [(170, 455), (250, 450), (262, 500), (190, 508)],
         [(60, 680), (120, 672), (128, 712), (70, 716)], [(-130, 130), (-95, 125), (-90, 170), (-128, 175)]]
SPOTS = [  # label, x, y, colour, side (1 = label right, -1 = left)
    ("PUBLIX", -40, 548, "#2e8b3e", 1),
    ("POLICE", 60, 222, "#1d3f8a", 1),
    ("CITY HALL", 60, 245, "#2f6fb3", 1),
    ("SEMINOLE CASINO", -300, 350, "#c8901e", 1),
    ("CAR DEALERS", -150, 304, "#8a8f98", 1),
    ("CAR DEALERS", 60, 304, "#8a8f98", 1),
    ("COOPER'S HAWK", -30, 442, "#9a3b52", -1),
    ("GATE", 18, Y["hammock"], "#d0582a", 1),
]
RES = [("homes + lakes", -165, 480), ("homes + lakes", 165, 480), ("homes", 165, 380), ("homes", -90, 380), ("homes", -250, 150), ("homes", -80, 45), ("homes + lakes", -165, 690), ("homes", 165, 690), ("townhomes", -250, 260), ("offices", 170, 590)]

S = 1.25; PAD = 60
X0, X1, Y0, Y1 = -400, 400, -60, 790
W, H = int((X1 - X0) * S) + 2 * PAD, int((Y1 - Y0) * S) + 2 * PAD + 30
P = lambda x, y: (PAD + (x - X0) * S, PAD + 30 + (Y1 - y) * S)
def font(sz, bold=True):
    return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", sz)
OUT = lambda t, xy, sz=15, **k: d.text(xy, t, fill="white", font=font(sz), stroke_width=3, stroke_fill="#1b1b1b", **k)

im = Image.new("RGB", (W, H), "#5d9a3a"); d = ImageDraw.Draw(im)
for L in LAKES: d.polygon([P(*p) for p in curve(L + L[:1], 6)], fill="#2d78b8")
for (lab, poly, col, tc) in ZONES:
    d.polygon([P(*p) for p in poly], fill=col, outline="#7a6a3a")
    cx = sum(p[0] for p in poly) / len(poly); cy = sum(p[1] for p in poly) / len(poly)
    d.multiline_text(P(cx, cy), lab, fill=tc, font=font(15), anchor="mm", align="center")
for (lab, x, y) in RES: d.text(P(x, y), lab, fill="#d6ecc2", font=font(13, False), anchor="mm")
for name, pts, w, kind in ROADS: d.line([P(*p) for p in pts], fill="#8a7a50" if kind == "hwy" else "#3a3c40", width=int(w * S), joint="curve")
for name, pts, w, kind in ROADS: d.line([P(*p) for p in pts], fill="#f4f0e0" if kind == "hwy" else "#e8c34a", width=2 if kind != "col" else 1, joint="curve")
d.line([P(XLYONS, Y["hammock"]), P(14, Y["hammock"])], fill="#3a3c40", width=int(10 * S))
for name, pts, w, kind in ROADS:
    if pts[0][0] == pts[-1][0]:                                       # vertical: rotated label
        t = Image.new("RGBA", (360, 36), (0, 0, 0, 0)); ImageDraw.Draw(t).text((180, 18), name, fill="white", font=font(16), anchor="mm", stroke_width=3, stroke_fill="#1b1b1b")
        t = t.rotate(90, expand=True); cx, cy = P(pts[0][0], 120 if name != "Banks Rd" else 150); im.paste(t, (int(cx - t.width / 2 - w * S / 2 - 14), int(cy - t.height / 2)), t)
    else:
        x, y = pts[0][0] + 8, pts[0][1] + (14 if kind != "hwy" else 22); OUT(name, P(x, y), 15 if kind != "col" else 13, anchor="ls")
for (lab, x, y, col, side) in SPOTS:
    cx, cy = P(x, y); d.ellipse([cx - 8, cy - 8, cx + 8, cy + 8], fill=col, outline="white", width=2)
    OUT(lab, (cx + 12 * side, cy), 13, anchor="lm" if side > 0 else "rm")
OUT("COCONUT CREEK  -  PLAN v7 (draft 2: real road order, squared up)", (PAD, 18), 20)
nx, ny = W - 40, 34; d.polygon([(nx, ny - 16), (nx - 9, ny + 9), (nx + 9, ny + 9)], fill="white"); OUT("N", (nx, ny + 22), 14, anchor="mm")
sx, sy = P(-390, -50); d.line([(sx, sy), (sx + 100 * S, sy)], fill="white", width=4); OUT("100 m", (sx + 50 * S, sy - 12), 12, anchor="mm")
im.save(os.path.join(os.path.dirname(os.path.abspath(__file__)), "plan_v7.png")); print(W, H)
