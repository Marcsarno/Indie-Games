"""City plan v7 (round 37): the whole city re-laid from the user's description of the real Coconut Creek road grid + their Google Maps screenshots.
The real city is long and skinny (~3 km x 9 km); the game keeps the real ORDER of roads but squares it up, then takes liberties so it is fun to drive.
Draft 3 (user): Hammock Blvd removed; west of 441 and east of Powerline a strip of shops / gas / fast food, then roadblocks (the edge of the world);
liberties L1..L8 are numbered so the user can keep or cut each one.
Coordinates in metres: x east, y north, origin = Lyons Rd at Coconut Creek Pkwy. Run: python3 plan_v7.py -> plan_v7.png"""
from PIL import Image, ImageDraw, ImageFont
import math, os

X441, XBANKS, XLYONS, XPOWER = -330, -165, 0, 330
Y = dict(pkwy=0, copans=200, sample=320, wiles=430, winston=525, johnson=650, hillsboro=730)
EDGE = 75                                                     # how far the roads run past the outer roads before the edge roadblocks (the shop strips sit in there)
def curve(pts, n=12):                                         # Catmull-Rom smoothing so curved roads read as curves
    out = []
    for i in range(len(pts) - 1):
        p0, p1, p2, p3 = pts[max(0, i - 1)], pts[i], pts[i + 1], pts[min(len(pts) - 1, i + 2)]
        for k in range(n):
            t = k / n; t2, t3 = t * t, t * t * t
            out.append(tuple(.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3) for j in (0, 1)))
    out.append(pts[-1]); return out
XW, XE, YS, YN = X441 - EDGE, XPOWER + EDGE, Y["pkwy"] - 60, Y["hillsboro"] + 60
# ---- roads: name, polyline, width m, kind: art (arterial), col (collector), hwy (expressway), loc (neighbourhood street), dirt, trail ----
ROADS = [
    ("State Rd 7 (US 441)", [(X441, YS), (X441, YN)], 24, "art"),
    ("Banks Rd", [(XBANKS, YS), (XBANKS, Y["sample"])], 12, "col"),
    ("Lyons Rd", [(XLYONS, YS), (XLYONS, YN)], 22, "art"),
    ("Powerline Rd", [(XPOWER, YS), (XPOWER, YN)], 22, "art"),
    ("Coconut Creek Pkwy", [(XW, Y["pkwy"]), (XE, Y["pkwy"])], 18, "art"),
    ("Copans Rd", [(XW, Y["copans"]), (XE, Y["copans"])], 18, "art"),
    ("Sample Rd", [(XW, Y["sample"]), (XE, Y["sample"])], 24, "art"),
    ("Wiles Rd", [(XW, Y["wiles"]), (XE, Y["wiles"])], 16, "art"),
    ("Winston Park Blvd", curve([(XW, Y["winston"] + 22), (X441, Y["winston"] + 20), (-200, Y["winston"] + 18), (-80, Y["winston"]), (XLYONS, Y["winston"] - 4), (XE, Y["winston"] - 4)]), 16, "art"),
    ("Sawgrass Expressway", curve([(XW, 556), (-150, 585), (XLYONS, 600), (150, 625), (XE, 642)]), 26, "hwy"),
    ("Johnson Rd", [(X441, Y["johnson"]), (XLYONS, Y["johnson"])], 12, "col"),
    ("Hillsboro Blvd", [(XW, Y["hillsboro"]), (XE, Y["hillsboro"])], 22, "art"),
    # shop strips: a service lane behind the shops on each side (L1)
    ("", [(X441 - 52, Y["pkwy"]), (X441 - 52, Y["hillsboro"])], 8, "loc"),
    ("", [(XPOWER + 52, Y["pkwy"]), (XPOWER + 52, Y["hillsboro"])], 8, "loc"),
    # L2 farm-field dirt track: casino corner to Lyons & Wiles, cutting the corner
    ("", curve([(-300, Y["sample"] + 8), (-245, 360), (-150, 372), (-60, 405), (-12, Y["wiles"] - 6)]), 7, "dirt"),
    # L3 neighbourhood loops: curvy streets that link two arterials (shortcuts and hiding places)
    ("", curve([(XBANKS, 60), (-120, 95), (-60, 80), (-30, 120), (XLYONS, 150)]), 9, "loc"),
    ("", curve([(X441, 120), (-280, 150), (-230, 140), (-200, 170), (XBANKS, 160)]), 9, "loc"),
    ("", curve([(XLYONS, 470), (60, 495), (130, 470), (200, 505), (260, 470), (XPOWER, 490)]), 9, "loc"),
    ("", curve([(X441, 470), (-270, 450), (-220, 490), (-150, 450), (-100, 478)]), 9, "loc"),
    ("", curve([(XLYONS, 690), (60, 705), (120, 680), (190, 700), (250, 668), (XPOWER, 690)]), 9, "loc"),
    ("", curve([(X441, 690), (-260, 705), (-190, 680), (-120, 702), (-60, 690), (XLYONS, 700)]), 9, "loc"),
    ("", curve([(XLYONS, 380), (80, 360), (160, 395), (240, 370), (XPOWER, 385)]), 9, "loc"),
    # L4 roundabout at Banks & Copans (drawn as a ring below)
    # L5 Tradewinds park trail: narrow, bikes squeeze through, cars barely
    ("", curve([(160, Y["copans"] + 12), (190, 250), (250, 235), (290, 280), (318, Y["sample"] - 12)]), 4, "trail"),
    # L6 Wynmoore: one gated entrance off Lyons, winding streets, Dave at the far end
    ("", curve([(XLYONS, 95), (40, 95), (90, 120), (140, 95), (190, 125), (240, 90), (270, 50), (230, 30)]), 9, "loc"),
    ("", curve([(140, 95), (130, 50), (90, 35), (60, 55)]), 8, "loc"),
    ("", curve([(190, 125), (220, 160), (280, 165), (300, 130)]), 8, "loc"),
    # L7 Sawgrass on/off ramps at Lyons (the expressway is raised; ramps are the only way on)
    ("", curve([(-80, 575), (-40, 560), (-8, 540)]), 8, "ramp"),
    ("", curve([(8, 618), (40, 630), (90, 618)]), 8, "ramp"),
]
ROUNDABOUTS = [(XBANKS, Y["copans"], 18)]
# canal (L8): runs north-south between Banks and Lyons from Pkwy to Sample, crossed by bridges on each arterial; you can wade it or jump it on the bike
CANAL = [(-85, Y["pkwy"] - 60), (-80, 60), (-95, 130), (-82, 200), (-88, 260), (-80, Y["sample"])]
ZONES = [  # label, polygon, fill, text colour
    ("WYNMOORE\n(gated, golf)", [(14, 14), (316, 14), (316, 186), (14, 186)], "#e9d8a6", "#5a4310"),
    ("FARM FIELDS", [(-316, 334), (-130, 334), (-130, 416), (-316, 416)], "#c9b27a", "#5a4310"),
    ("TRADEWINDS PARK\n+ BUTTERFLY WORLD", [(150, 214), (316, 214), (316, 306), (150, 306)], "#7cc05a", "#1f4d12"),
    ("SHOPS  GAS  FAST FOOD", [(XW, YS), (X441 - 14, YS), (X441 - 14, YN), (XW, YN)], "#c7a98a", "#4a2e1a"),
    ("SHOPS  GAS  FAST FOOD", [(XPOWER + 14, YS), (XE, YS), (XE, YN), (XPOWER + 14, YN)], "#c7a98a", "#4a2e1a"),
]
LAKES = [[(-300, 40), (-255, 30), (-215, 60), (-230, 82), (-290, 78)], [(-120, 470), (-80, 462), (-60, 495), (-110, 508)], [(170, 440), (250, 435), (262, 455), (190, 462)],
         [(60, 650), (120, 645), (128, 668), (70, 670)], [(200, 40), (250, 35), (262, 70), (215, 75)], [(-280, 640), (-230, 632), (-225, 668), (-275, 670)]]
SPOTS = [  # label, x, y, colour, side
    ("PUBLIX", -40, 548, "#2e8b3e", 1), ("POLICE", 60, 222, "#1d3f8a", 1), ("CITY HALL", 60, 245, "#2f6fb3", 1),
    ("SEMINOLE CASINO", -300, 350, "#c8901e", 1), ("CAR DEALERS", -150, 304, "#8a8f98", 1), ("CAR DEALERS", 60, 304, "#8a8f98", 1),
    ("COOPER'S HAWK", -30, 442, "#9a3b52", -1), ("GATE", 22, 95, "#d0582a", 1), ("DAVE", 230, 30, "#e33b3b", -1),
]
TAGS = [("L1", X441 - 52, 600), ("L1", XPOWER + 52, 600), ("L2", -150, 372), ("L3", -60, 80), ("L3", 130, 470), ("L4", XBANKS, Y["copans"]), ("L5", 250, 235),
        ("L6", 190, 125), ("L7", -40, 560), ("L8", -95, 130)]
RES = [("homes + lakes", -230, 480), ("homes", 165, 410), ("homes", -60, 380), ("homes", -250, 60), ("homes", -40, 40), ("homes", 165, 700), ("townhomes", -250, 260), ("offices", 170, 590), ("homes", -165, 160)]
LEGEND = ["L1  service lane behind the shop strips", "L2  dirt track across the farm fields", "L3  curvy neighbourhood streets (shortcuts)", "L4  roundabout at Banks & Copans",
          "L5  park trail (bike fits, cars barely)", "L6  Wynmoore: one gate, winding streets, Dave", "L7  Sawgrass raised, on/off ramps at Lyons", "L8  canal with bridges (wade / jump)", "red bars = edge roadblocks"]

S = 1.15; PAD = 50
X0, X1, Y0, Y1 = XW - 30, XE + 30, YS - 30, YN + 30
W, H = int((X1 - X0) * S) + 2 * PAD + 330, int((Y1 - Y0) * S) + 2 * PAD + 30
P = lambda x, y: (PAD + (x - X0) * S, PAD + 30 + (Y1 - y) * S)
def font(sz, bold=True): return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", sz)
im = Image.new("RGB", (W, H), "#2b3a26"); d = ImageDraw.Draw(im)
OUT = lambda t, xy, sz=15, **k: d.text(xy, t, fill="white", font=font(sz), stroke_width=3, stroke_fill="#1b1b1b", **k)
d.rectangle([P(XW, YN), P(XE, YS)], fill="#5d9a3a")
for (lab, poly, col, tc) in ZONES:
    d.polygon([P(*p) for p in poly], fill=col)
    cx = sum(p[0] for p in poly) / len(poly); cy = sum(p[1] for p in poly) / len(poly)
    if "SHOPS" in lab:
        t = Image.new("RGBA", (500, 30), (0, 0, 0, 0)); ImageDraw.Draw(t).text((250, 15), lab, fill=tc, font=font(14), anchor="mm"); t = t.rotate(90, expand=True)
        a, b = P(cx, 120); im.paste(t, (int(a - 15), int(b - 250)), t)
    else: d.multiline_text(P(cx, cy), lab, fill=tc, font=font(14), anchor="mm", align="center")
for L in LAKES: d.polygon([P(*p) for p in curve(L + L[:1], 6)], fill="#2d78b8")
d.line([P(*p) for p in curve(CANAL)], fill="#2d78b8", width=int(10 * S))
for (lab, x, y) in RES: d.text(P(x, y), lab, fill="#d6ecc2", font=font(12, False), anchor="mm")
STY = {"art": ("#3a3c40", "#e8c34a"), "col": ("#3a3c40", "#e8c34a"), "hwy": ("#8a7a50", "#f4f0e0"), "loc": ("#55585e", None), "dirt": ("#a8875a", None), "trail": ("#d9c9a0", None), "ramp": ("#8a7a50", None)}
for kind_pass in (("dirt", "trail", "loc"), ("col", "art"), ("ramp", "hwy")):
    for name, pts, w, kind in ROADS:
        if kind not in kind_pass: continue
        c, ln = STY[kind]; d.line([P(*p) for p in pts], fill=c, width=max(3, int(w * S)), joint="curve")
        if ln: d.line([P(*p) for p in pts], fill=ln, width=2 if kind != "col" else 1, joint="curve")
for x, y, r in ROUNDABOUTS:
    a, b = P(x, y); R = r * S; d.ellipse([a - R, b - R, a + R, b + R], outline="#3a3c40", width=int(10 * S)); d.ellipse([a - R + 8, b - R + 8, a + R - 8, b + R - 8], fill="#7cc05a")
# edge roadblocks: every road that reaches the edge
for name, pts, w, kind in ROADS:
    if kind not in ("art", "col", "hwy"): continue
    for q, prev in ((pts[0], pts[1]), (pts[-1], pts[-2])):
        if q[0] in (XW, XE) or q[1] in (YS, YN):
            dx, dy = q[0] - prev[0], q[1] - prev[1]; l = math.hypot(dx, dy); nx, ny = -dy / l, dx / l; hw = w / 2 + 3
            d.line([P(q[0] + nx * hw, q[1] + ny * hw), P(q[0] - nx * hw, q[1] - ny * hw)], fill="#e8312a", width=7)
for name, pts, w, kind in ROADS:
    if not name: continue
    if pts[0][0] == pts[-1][0]:
        t = Image.new("RGBA", (360, 36), (0, 0, 0, 0)); ImageDraw.Draw(t).text((180, 18), name, fill="white", font=font(15), anchor="mm", stroke_width=3, stroke_fill="#1b1b1b")
        t = t.rotate(90, expand=True); cx, cy = P(pts[0][0], 120 if name != "Banks Rd" else 250); im.paste(t, (int(cx - t.width / 2 - w * S / 2 - 13), int(cy - t.height / 2)), t)
    else: OUT(name, P(X441 + 8, (pts[0][1] if kind != "art" or "Winston" not in name else Y["winston"] + 20) + (13 if kind != "hwy" else 21)), 14 if kind != "col" else 12, anchor="ls")
for (lab, x, y, col, side) in SPOTS:
    cx, cy = P(x, y); d.ellipse([cx - 8, cy - 8, cx + 8, cy + 8], fill=col, outline="white", width=2); OUT(lab, (cx + 12 * side, cy), 12, anchor="lm" if side > 0 else "rm")
for (t, x, y) in TAGS:
    cx, cy = P(x, y); d.rounded_rectangle([cx - 15, cy - 10, cx + 15, cy + 10], 5, fill="#ff8c1a", outline="#1b1b1b", width=2); d.text((cx, cy), t, fill="#1b1b1b", font=font(12), anchor="mm")
OUT("COCONUT CREEK  -  PLAN v7 (draft 3)", (PAD, 16), 20)
lx = int(P(XE, 0)[0]) + 50; ly = PAD + 60; OUT("LIBERTIES (keep / cut each)", (lx, ly), 15)
for i, t in enumerate(LEGEND): d.text((lx, ly + 34 + i * 26), t, fill="#ffd9a8" if not t.startswith("red") else "#ff8a80", font=font(13))
sx, sy = P(XW, YS - 20); d.line([(sx, sy), (sx + 100 * S, sy)], fill="white", width=4); OUT("100 m", (sx + 50 * S, sy - 11), 11, anchor="mm")
im.save(os.path.join(os.path.dirname(os.path.abspath(__file__)), "plan_v7.png")); print(W, H)
