"""City plan v7 (round 37): the whole city re-laid from the user's description of the real Coconut Creek road grid + their Google Maps screenshots.
The real city is long and skinny; the game keeps the real ORDER of roads, squares it up, then takes liberties so it is fun to drive (research: RESEARCH.md).
Draft 5 (user): Walmart WEST of 441 (south of Sample); Banks Rd runs SOUTH off Coconut Creek Pkwy and Dave lives off it; car dealers fill the Sample-Wiles band
west of Lyons (casino stays at 441 & Sample); Cooper's Hawk stays (restaurant row); the whole Wiles-to-Sawgrass band is THE PROMENADE (lots of shops, Publix at
the NW corner of Lyons & Winston Park); McDonald's on the corner of Sample & Lyons in the City Hall block; Butterfly World. The fun is cutting through the parking
aisles and drive lanes around the buildings.
Coordinates in metres: x east, y north, origin = Lyons Rd at Coconut Creek Pkwy. Run: python3 plan_v7.py -> plan_v7.png"""
from PIL import Image, ImageDraw, ImageFont
import math, os

X441, XBANKS, XLYONS, XPOWER = -330, -180, 0, 330
Y = dict(pkwy=0, copans=200, sample=320, wiles=430, winston=525, johnson=650, hillsboro=730)
XW, XE, YS, YN = X441 - 150, XPOWER + 75, -210, Y["hillsboro"] + 60          # west strip is wider (Walmart lives there); south band holds Banks Rd + Dave
def curve(pts, n=12):
    out = []
    for i in range(len(pts) - 1):
        p0, p1, p2, p3 = pts[max(0, i - 1)], pts[i], pts[i + 1], pts[min(len(pts) - 1, i + 2)]
        for k in range(n):
            t = k / n; t2, t3 = t * t, t * t * t
            out.append(tuple(.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3) for j in (0, 1)))
    out.append(pts[-1]); return out
SAW = curve([(XW, 556), (-150, 585), (XLYONS, 600), (150, 625), (XE, 642)])
# ---- roads: name, polyline, width m, kind ----
ROADS = [
    ("State Rd 7 (US 441)", [(X441, YS), (X441, YN)], 24, "art"),
    ("Lyons Rd", [(XLYONS, YS), (XLYONS, YN)], 22, "art"),
    ("Powerline Rd", [(XPOWER, YS), (XPOWER, YN)], 22, "art"),
    ("Banks Rd", [(XBANKS, Y["pkwy"]), (XBANKS, -165)], 12, "col"),          # user: you turn SOUTH off the Pkwy onto Banks; Dave lives off it (dead end)
    ("Coconut Creek Pkwy", [(XW, Y["pkwy"]), (XE, Y["pkwy"])], 18, "art"),
    ("Copans Rd", [(XW, Y["copans"]), (XE, Y["copans"])], 18, "art"),
    ("Sample Rd", [(XW, Y["sample"]), (XE, Y["sample"])], 24, "art"),
    ("Wiles Rd", [(XW, Y["wiles"]), (XE, Y["wiles"])], 16, "art"),
    ("Winston Park Blvd", curve([(XW, Y["winston"] + 22), (X441, Y["winston"] + 20), (-200, Y["winston"] + 18), (-80, Y["winston"]), (XLYONS, Y["winston"] - 4), (XE, Y["winston"] - 4)]), 16, "art"),
    ("Sawgrass Expressway", SAW, 26, "hwy"),
    ("Johnson Rd", [(X441, Y["johnson"]), (XLYONS, Y["johnson"])], 12, "col"),
    ("Hillsboro Blvd", [(XW, Y["hillsboro"]), (XE, Y["hillsboro"])], 22, "art"),
    # back lanes behind the shop strips
    ("", [(XW + 14, Y["pkwy"]), (XW + 14, Y["hillsboro"])], 8, "loc"),
    ("", [(XPOWER + 52, YS + 20), (XPOWER + 52, Y["hillsboro"])], 8, "loc"),
    # neighbourhood streets
    ("", curve([(X441, 110), (-260, 80), (-190, 130), (-130, 95), (-60, 125), (XLYONS, 90)]), 9, "loc"),          # 441 <-> Lyons, fords the canal
    ("", curve([(X441, 255), (-280, 240), (-220, 270), (-160, 240), (-110, 262)]), 9, "loc"),
    ("", curve([(XLYONS, 380), (80, 360), (160, 395), (240, 370), (XPOWER, 385)]), 9, "loc"),
    ("", curve([(XLYONS, 690), (60, 705), (120, 680), (190, 700), (250, 668), (XPOWER, 690)]), 9, "loc"),
    ("", curve([(X441, 690), (-260, 705), (-190, 680), (-120, 702), (-60, 690), (XLYONS, 700)]), 9, "loc"),
    # south band: Dave's street off Banks (a loop with a cul-de-sac) + the east neighbourhood
    ("", curve([(XBANKS, -40), (-215, -60), (-250, -95), (-262, -120)]), 9, "loc"),
    ("", curve([(XBANKS, -110), (-150, -150), (-120, -175)]), 9, "loc"),
    ("", curve([(XLYONS, -60), (70, -40), (140, -80), (220, -50), (XPOWER, -80)]), 9, "loc"),
    ("", curve([(XLYONS, -150), (90, -170), (180, -140), (260, -170), (XPOWER, -150)]), 9, "loc"),
    # trails (bike fits, cars barely)
    ("", curve([(160, Y["copans"] + 12), (190, 250), (250, 235), (290, 280), (318, Y["sample"] - 12)]), 4, "trail"),   # Tradewinds / Butterfly World
    ("", curve([(-92, -95), (-130, -120), (-180, -128), (-235, -112)]), 4, "trail"),                                 # lake path to Dave's street
    ("", curve([(XPOWER, 140), (316, 138), (300, 130)]), 5, "trail"),                                                # Wynmoore golf-cart back gate
    # Wynmoore streets (gated golf community, one gate on Lyons)
    ("", curve([(XLYONS, 95), (40, 95), (90, 120), (140, 95), (190, 125), (240, 90), (270, 50), (230, 30)]), 9, "loc"),
    ("", curve([(190, 125), (220, 160), (280, 165), (300, 130)]), 8, "loc"),
    # Sawgrass ramps at Lyons
    ("", curve([(-80, 575), (-40, 560), (-8, 540)]), 8, "ramp"), ("", curve([(8, 618), (40, 630), (90, 618)]), 8, "ramp"),
]
CULS = [(XBANKS, -165, 11), (-262, -120, 10)]
CANAL = [(-85, Y["sample"]), (-88, 260), (-82, 200), (-95, 130), (-80, 60), (-85, 0), (-90, -60), (-95, -95)]      # Sample -> south of the Pkwy, ends in the lake by Dave's
def R(x0, y0, x1, y1): return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
ZONES = [  # (label, polygon, fill, text colour) drawn in order
    ("SHOPS  GAS  FAST FOOD", R(XW, YS, X441 - 14, YN), "#c7a98a", "#4a2e1a"),
    ("SHOPS  GAS  FAST FOOD", R(XPOWER + 14, YS, XE, YN), "#c7a98a", "#4a2e1a"),
    ("WYNMOORE\n(gated golf)", R(14, 14, 316, 186), "#e9d8a6", "#5a4310"),
    ("BUTTERFLY WORLD\n+ TRADEWINDS PARK", R(150, 214, 316, 306), "#7cc05a", "#1f4d12"),
    ("SEMINOLE\nCASINO", R(-316, 334, -250, 416), "#c8901e", "#3a2405"),
]
# parking lots = the cut-through areas: (polygon, buildings [(x0, y0, x1, y1, colour, label)], aisle step, aisle direction)
LOTS = [
    (R(XW + 22, 206, X441 - 16, 314), [(XW + 24, 214, XW + 62, 306, "#2f64ad", "WALMART")], 9, "v"),                            # user: Walmart west of 441, giant lot facing 441
    (R(-244, 334, -14, 418), [(-238, 392, -196, 414, "#9aa3ad", "FORD"), (-176, 392, -134, 414, "#c9ccd1", "TOYOTA"), (-114, 392, -72, 414, "#9aa3ad", "HONDA"), (-56, 392, -18, 414, "#c9ccd1", "KIA")], 7, "h"),   # car dealers
    (R(-316, 444, -14, 512), [(-306, 486, -262, 508, "#c56a4a", ""), (-252, 486, -208, 508, "#d6a24a", ""), (-180, 470, -140, 490, "#e4d9c2", "PLAZA"), (-120, 486, -76, 508, "#c56a4a", ""), (-62, 450, -20, 470, "#9a3b52", "COOPER'S\nHAWK")], 8, "v"),
    (R(14, 444, 316, 510), [(24, 486, 74, 508, "#d6a24a", ""), (90, 486, 140, 508, "#c56a4a", "CINEMA"), (160, 450, 220, 500, "#7d8086", "GARAGE"), (236, 486, 306, 508, "#d6a24a", "")], 8, "v"),
    (R(-316, 536, -14, 562), [(-96, 540, -20, 560, "#2e8b3e", "PUBLIX"), (-200, 540, -120, 556, "#c56a4a", ""), (-306, 540, -226, 556, "#d6a24a", "")], 8, "v"),
    (R(14, 216, 66, 306), [(22, 280, 52, 300, "#d22d24", "McD")], 7, "h"),                                                      # McDonald's on the corner of Sample & Lyons
]
LAKES = [[(-300, 40), (-255, 30), (-215, 60), (-230, 82), (-290, 78)], [(170, 340), (250, 335), (262, 352), (190, 358)], [(60, 655), (120, 650), (128, 668), (70, 670)],
         [(200, 40), (250, 35), (262, 70), (215, 75)], [(-280, 640), (-230, 632), (-225, 668), (-275, 670)], [(-140, -80), (-75, -88), (-60, -125), (-110, -140), (-150, -115)],
         [(150, -110), (230, -115), (240, -95), (160, -88)]]
SPOTS = [("POLICE", 100, 222, "#1d3f8a", 1), ("CITY HALL", 100, 245, "#2f6fb3", 1), ("GATE", 22, 95, "#d0582a", 1), ("DAVE", -262, -132, "#e33b3b", 1)]
JUMPS = [(-84, 262), (-90, 125), (XW + 28, 310), (220, 705), (150, 60), (-130, 360)]          # canal banks x2, Walmart loading dock, construction site, golf mound, car-carrier ramp at the dealers
BREAKERS = [(XPOWER + 45, 430), (X441 - 50, 180), (-160, 460), (-60, 380), (-62, 568), (20, 95), (155, 300), (205, 690)]   # gas x2, plaza fountain, dealer cars, cart corral, Wynmoore gate arm, Butterfly World sign, scaffolding
HIDES = [(X441 - 50, 470), (190, 475), (0, 600), (XW + 40, 212)]                                # car wash, Promenade garage, under the overpass, Walmart garden centre
STARS = [(-283, 400), (240, 262), (100, 258), (40, 170), (XW + 43, 296), (-160, 500), (37, 306)]   # casino tower, Butterfly World dome, City Hall clock, Wynmoore water tower, Walmart sign, Promenade sign, golden arches
BRIDGES = [(-85, Y["pkwy"]), (-82, Y["copans"]), (-85, Y["sample"])]
TXT = [("homes + lake", -240, 150), ("townhomes", -230, 290), ("homes", 165, 410), ("homes", -240, 610), ("construction site", 230, 680), ("offices", 170, 590),
       ("Dave's street", -232, -70), ("homes + lake", 200, -20), ("homes", -280, -170), ("homes", 90, 610)]
DAVE = (-262, -132); PUBLIX = (-58, 549)
ROUTES = [
    ("A  fast: Lyons straight down, Pkwy, Banks", "#4fa3ff", [PUBLIX, (-10, 534), (-6, 6), (-176, 6), (-176, -38), (-215, -60), (-250, -95), DAVE]),
    ("B  sneaky: 441, Walmart lot, back lane", "#ffb03a", [PUBLIX, (-150, 545), (X441, 545), (X441, 300), (XW + 80, 290), (XW + 14, 260), (XW + 14, 6), (-184, -4), (-184, -40), (-220, -64), DAVE]),
    ("C  creative: Promenade, dealer lots, canal", "#d070ff", [PUBLIX, (-110, 530), (-110, 450), (-120, 440), (-120, 340), (-86, 326), (-88, 200), (-90, 125), (-85, 0), (-92, -95), (-130, -120), (-180, -128), (-235, -112), DAVE]),
]

S = 1.0; PAD = 50
X0, X1, Y0, Y1 = XW - 20, XE + 20, YS - 30, YN + 20
W, H = int((X1 - X0) * S) + 2 * PAD + 400, int((Y1 - Y0) * S) + 2 * PAD + 30
P = lambda x, y: (PAD + (x - X0) * S, PAD + 30 + (Y1 - y) * S)
def font(sz, bold=True): return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", sz)
im = Image.new("RGB", (W, H), "#2b3a26"); d = ImageDraw.Draw(im)
OUT = lambda t, xy, sz=15, **k: d.text(xy, t, fill="white", font=font(sz), stroke_width=3, stroke_fill="#1b1b1b", **k)
d.rectangle([P(XW, YN), P(XE, YS)], fill="#5d9a3a")
for (lab, poly, col, tc) in ZONES:
    d.polygon([P(*p) for p in poly], fill=col)
    cx = sum(p[0] for p in poly) / len(poly); cy = sum(p[1] for p in poly) / len(poly)
    if "SHOPS" in lab:
        t = Image.new("RGBA", (500, 30), (0, 0, 0, 0)); ImageDraw.Draw(t).text((250, 15), lab, fill=tc, font=font(13), anchor="mm"); t = t.rotate(90, expand=True)
        a, b = P(cx if cx > 0 else X441 - 45, 640); im.paste(t, (int(a - 15), int(b - 250)), t)
    else: d.multiline_text(P(cx, cy), lab, fill=tc, font=font(12), anchor="mm", align="center")
for (poly, blds, step, dirn) in LOTS:
    d.polygon([P(*p) for p in poly], fill="#7d8086")
    xs = [p[0] for p in poly]; ys = [p[1] for p in poly]; x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    if dirn == "v":
        for xx in range(int(x0) + 6, int(x1) - 4, step): d.line([P(xx, y0 + 3), P(xx, y1 - 3)], fill="#b9bcc2", width=1)
    else:
        for yy in range(int(y0) + 5, int(y1) - 3, step): d.line([P(x0 + 3, yy), P(x1 - 3, yy)], fill="#b9bcc2", width=1)
    for (a, b, c, e, col, lab) in blds:
        d.rectangle([P(a, e), P(c, b)], fill=col, outline="#2b2b2b")
        if lab: d.multiline_text(P((a + c) / 2, (b + e) / 2), lab, fill="white", font=font(9), anchor="mm", align="center", stroke_width=2, stroke_fill="#1b1b1b")
for yy in range(340, 386, 8):                                   # dealer lots: rows of cars
    for xx in range(-240, -16, 6): d.rectangle([P(xx, yy + 2), P(xx + 3.5, yy - 2)], fill=["#d33", "#eee", "#36c", "#222", "#c9a227"][(xx // 6 + yy) % 5])
pa, pb = P(-316, 519); d.text((pa + 4, pb), "THE PROMENADE  -  shops, restaurants, Publix: cut through the lots", fill="#fff2a8", font=font(12), anchor="lm", stroke_width=3, stroke_fill="#1b1b1b")
for L in LAKES: d.polygon([P(*p) for p in curve(L + L[:1], 6)], fill="#2d78b8")
d.line([P(*p) for p in curve(CANAL)], fill="#2d78b8", width=int(10 * S))
for (lab, x, y) in TXT: d.text(P(x, y), lab, fill="#d6ecc2", font=font(11, False), anchor="mm")
STY = {"art": ("#3a3c40", "#e8c34a"), "col": ("#3a3c40", "#e8c34a"), "hwy": ("#8a7a50", "#f4f0e0"), "loc": ("#55585e", None), "trail": ("#d9c9a0", None), "ramp": ("#8a7a50", None)}
for kind_pass in (("trail", "loc"), ("col", "art"), ("ramp", "hwy")):
    for name, pts, w, kind in ROADS:
        if kind not in kind_pass: continue
        c, ln = STY[kind]; d.line([P(*p) for p in pts], fill=c, width=max(3, int(w * S)), joint="curve")
        if ln: d.line([P(*p) for p in pts], fill=ln, width=2 if kind != "col" else 1, joint="curve")
for x, y, r in CULS: a, b = P(x, y); d.ellipse([a - r, b - r, a + r, b + r], fill="#3a3c40" if x == XBANKS else "#55585e")
for name, pts, w, kind in ROADS:                                # edge roadblocks
    if kind not in ("art", "col", "hwy"): continue
    for q, prev in ((pts[0], pts[1]), (pts[-1], pts[-2])):
        if q[0] in (XW, XE) or q[1] in (YS, YN):
            dx, dy = q[0] - prev[0], q[1] - prev[1]; l = math.hypot(dx, dy); nx, ny = -dy / l, dx / l; hw = w / 2 + 3
            d.line([P(q[0] + nx * hw, q[1] + ny * hw), P(q[0] - nx * hw, q[1] - ny * hw)], fill="#e8312a", width=7)
for name, pts, w, kind in ROADS:
    if not name: continue
    if pts[0][0] == pts[-1][0]:
        t = Image.new("RGBA", (360, 36), (0, 0, 0, 0)); ImageDraw.Draw(t).text((180, 18), name, fill="white", font=font(14), anchor="mm", stroke_width=3, stroke_fill="#1b1b1b")
        t = t.rotate(90, expand=True); cx, cy = P(pts[0][0], 150 if name != "Banks Rd" else -95); im.paste(t, (int(cx - t.width / 2 - w * S / 2 - 12), int(cy - t.height / 2)), t)
    else: OUT(name, P(X441 + 8, (pts[0][1] if "Winston" not in name else Y["winston"] + 20) + (12 if kind != "hwy" else 20)), 13 if kind != "col" else 11, anchor="ls")
for (lab, col, pts) in ROUTES:
    q = [P(*p) for p in pts]
    for i in range(len(q) - 1):
        (ax, ay), (bx, by) = q[i], q[i + 1]; L = math.hypot(bx - ax, by - ay); n = max(1, int(L / 12))
        for k in range(0, n, 2): d.line([(ax + (bx - ax) * k / n, ay + (by - ay) * k / n), (ax + (bx - ax) * min(n, k + 1) / n, ay + (by - ay) * min(n, k + 1) / n)], fill=col, width=4)
def badge(x, y, txt, fill, fg="#1b1b1b", r=9):
    cx, cy = P(x, y); d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=fill, outline="#1b1b1b", width=2); d.text((cx, cy), txt, fill=fg, font=font(11), anchor="mm")
def star(cx, cy, r=11): d.polygon([(cx + (r if k % 2 == 0 else r * .45) * math.sin(k * math.pi / 5), cy - (r if k % 2 == 0 else r * .45) * math.cos(k * math.pi / 5)) for k in range(10)], fill="#fff2a8", outline="#1b1b1b")
for x, y in BRIDGES: cx, cy = P(x, y); d.rectangle([cx - 8, cy - 13, cx + 8, cy + 13], outline="#e9e2c8", width=3)
for x, y in JUMPS: badge(x, y, "J", "#ffe14a")
for x, y in BREAKERS: badge(x, y, "P", "#ff5a4a", "white")
for x, y in HIDES: badge(x, y, "H", "#9a6bff", "white")
for x, y in STARS: star(*P(x, y))
for (lab, x, y, col, side) in SPOTS:
    cx, cy = P(x, y); d.ellipse([cx - 8, cy - 8, cx + 8, cy + 8], fill=col, outline="white", width=2); OUT(lab, (cx + 12 * side, cy), 12, anchor="lm" if side > 0 else "rm")
OUT("COCONUT CREEK  -  PLAN v7 (draft 5)", (PAD, 16), 20)
lx = int(P(XE, 0)[0]) + 40; ly = PAD + 60
def leg(i, draw, text): y = ly + i * 28; draw(lx + 10, y); d.text((lx + 30, y), text, fill="#f0ead6", font=font(12), anchor="lm")
OUT("KEY", (lx, ly - 30), 15)
for i, (t, f, g, lab) in enumerate([("J", "#ffe14a", "#1b1b1b", "jump ramp"), ("P", "#ff5a4a", "white", "smashable: wrecks cops behind you"), ("H", "#9a6bff", "white", "hiding spot: lose the cops")]):
    leg(i, lambda x, y, t=t, f=f, g=g: (d.ellipse([x - 9, y - 9, x + 9, y + 9], fill=f, outline="#1b1b1b", width=2), d.text((x, y), t, fill=g, font=font(11), anchor="mm")), lab)
leg(3, lambda x, y: star(x, y), "landmark you can see from far")
leg(4, lambda x, y: d.rectangle([x - 8, y - 11, x + 8, y + 11], outline="#e9e2c8", width=3), "canal bridge (choke point)")
leg(5, lambda x, y: d.rectangle([x - 10, y - 7, x + 10, y + 7], fill="#7d8086"), "parking lot / drive aisles (cut through)")
leg(6, lambda x, y: d.line([(x - 10, y), (x + 10, y)], fill="#e8312a", width=7), "edge roadblock")
OUT("PUBLIX TO DAVE: 3 WAYS", (lx, ly + 8 * 28), 15)
for i, (lab, col, pts) in enumerate(ROUTES):
    y = ly + 9 * 28 + i * 26; d.line([(lx, y), (lx + 22, y)], fill=col, width=5); d.text((lx + 30, y), lab, fill="#f0ead6", font=font(12), anchor="lm")
sx, sy = P(XW, YS - 18); d.line([(sx, sy), (sx + 100 * S, sy)], fill="white", width=4); OUT("100 m", (sx + 50 * S, sy - 10), 11, anchor="mm")
im.save(os.path.join(os.path.dirname(os.path.abspath(__file__)), "plan_v7.png")); print(W, H)
