"""City plan v7, draft 7 (round 37): the whole city at 2.5x (user picked 2.5x after the scale study, scale_study.py).
All placements agreed with the user in drafts 1-6 (the 1x version is kept in plan_v7_1x.py / .png), now in true metres, and every residential block
is DESIGNED from straights and true circular arcs instead of wiggly streets (user: "your squiggle lines, I don't like"):
  grid pocket (straight streets, T-junctions, an alley), lake loop (a ring drive round a lake = a long fast sweeper, cul-de-sacs), boulevard + roundabout.
Coordinates in metres: x east, y north, origin = Lyons Rd at Coconut Creek Pkwy. Run: python3 plan_v7.py -> plan_v7.png"""
from PIL import Image, ImageDraw, ImageFont
import math, os, json

X441, XBANKS, XLYONS, XPOWER = -825, -450, 0, 825
Y = dict(pkwy=0, copans=500, sample=800, wiles=1075, winston=1312, johnson=1625, hillsboro=1825)
XW, XE, YS, YN = X441 - 170, XPOWER + 90, -525, Y["hillsboro"] + 80     # shop strips past 441 (wider: Walmart) and Powerline; south band = Banks Rd + Dave + rec centre
XCANAL = -212
def arc(cx, cy, r, a0, a1, n=48): return [(cx + r * math.cos(math.radians(a0 + (a1 - a0) * i / n)), cy + r * math.sin(math.radians(a0 + (a1 - a0) * i / n))) for i in range(n + 1)]
def smooth(pts, n=16):                                                   # used only for the two big real-world curves (Winston Park, Sawgrass)
    out = []
    for i in range(len(pts) - 1):
        p0, p1, p2, p3 = pts[max(0, i - 1)], pts[i], pts[i + 1], pts[min(len(pts) - 1, i + 2)]
        for k in range(n):
            t = k / n; t2, t3 = t * t, t * t * t
            out.append(tuple(.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3) for j in (0, 1)))
    out.append(pts[-1]); return out
SAW = smooth([(XW, 1390), (-375, 1462), (XLYONS, 1500), (375, 1562), (XE, 1605)])
WINSTON = smooth([(XW, 1372), (X441, 1366), (-500, 1357), (-200, 1318), (XLYONS, 1312), (XE, 1312)])
def saw_y(x):
    for a, b in zip(SAW, SAW[1:]):
        if a[0] <= x <= b[0]: return a[1] + (b[1] - a[1]) * (x - a[0]) / ((b[0] - a[0]) or 1)
    return SAW[-1][1]

ROADS = [  # name, polyline, width m, kind
    ("State Rd 7 (US 441)", [(X441, YS), (X441, YN)], 26, "art"), ("Lyons Rd", [(XLYONS, YS), (XLYONS, YN)], 24, "art"), ("Powerline Rd", [(XPOWER, YS), (XPOWER, YN)], 24, "art"),
    ("Banks Rd", [(XBANKS, Y["pkwy"]), (XBANKS, -420)], 12, "col"),
    ("Coconut Creek Pkwy", [(XW, 0), (XE, 0)], 20, "art"), ("Copans Rd", [(XW, Y["copans"]), (XE, Y["copans"])], 20, "art"), ("Sample Rd", [(XW, Y["sample"]), (XE, Y["sample"])], 26, "art"),
    ("Wiles Rd", [(XW, Y["wiles"]), (XE, Y["wiles"])], 18, "art"), ("Winston Park Blvd", WINSTON, 18, "art"), ("Sawgrass Expressway", SAW, 28, "hwy"),
    ("Johnson Rd", [(X441, Y["johnson"]), (XLYONS, Y["johnson"])], 12, "col"), ("Hillsboro Blvd", [(XW, Y["hillsboro"]), (XE, Y["hillsboro"])], 24, "art"),
    ("", [(XW + 15, 0), (XW + 15, Y["hillsboro"])], 8, "loc"), ("", [(XE - 15, YS + 30), (XE - 15, Y["hillsboro"])], 8, "loc"),           # back lanes behind the shop strips
    ("", [(-200, 1440), (-100, 1400), (-20, 1350)], 9, "ramp"), ("", [(20, 1545), (100, 1575), (225, 1545)], 9, "ramp"),                  # Sawgrass ramps at Lyons
]
HOUSES = []; CULS = []; RINGS = [(-712, 912, 46, 20)]; LAKES = []; RBTS = []
def st(pts, w=9, kind="loc"): ROADS.append(("", pts, w, kind))
def houses_along(a, b, gap=26, off=16):
    L = math.dist(a, b); n = int(L / gap); ux, uy = (b[0] - a[0]) / (L or 1), (b[1] - a[1]) / (L or 1)
    for i in range(1, n):
        for s_ in (-1, 1): HOUSES.append((a[0] + ux * i * gap - uy * off * s_, a[1] + uy * i * gap + ux * off * s_))
def grid(x0, y0, x1, y1, step=80, alley=True, join=("s", "n")):
    """Grid pocket: straight north-south streets every `step` m tied into the arterials, one cross street, alleys between, houses along."""
    xs = [x0 + step / 2 + i * step for i in range(int((x1 - x0) / step))]; ym = (y0 + y1) / 2
    for x in xs:
        a, b = (x, y0 - (30 if "s" in join else -10)), (x, y1 + (30 if "n" in join else -10)); st([a, b]); houses_along((x, y0 + 10), (x, ym - 15)); houses_along((x, ym + 15), (x, y1 - 10))
        if alley and x != xs[-1]: st([(x + step / 2, y0 + 15), (x + step / 2, y1 - 15)], 4, "alley")
    st([(x0 - 10, ym), (x1 + 10, ym)])
def lake_loop(cx, cy, rx, ry, links, culs=()):
    """Lake loop: a lake, a ring drive round it (a long sweeper), straight links out to the arterials, cul-de-sacs pointing at the water."""
    LAKES.append((cx, cy, rx, ry)); R = (rx + 40, ry + 40); RINGS.append((cx, cy, R[0], R[1]))
    for p in links:
        a = math.atan2((p[1] - cy) / R[1], (p[0] - cx) / R[0]); st([(cx + R[0] * math.cos(a), cy + R[1] * math.sin(a)), p])
    for t in range(0, 360, 14):
        a = math.radians(t)
        for k in (-1, 1): HOUSES.append((cx + (R[0] + 22 * k) * math.cos(a), cy + (R[1] + 22 * k) * math.sin(a)))
    for t in culs:
        a = math.radians(t); p0 = (cx + R[0] * math.cos(a), cy + R[1] * math.sin(a)); p1 = (cx + (R[0] + 75) * math.cos(a), cy + (R[1] + 75) * math.sin(a))
        st([p0, p1]); CULS.append((p1[0], p1[1], 11)); houses_along(p0, p1)
def boulevard(x0, y0, x1, y1, entry_x):
    """Boulevard: a divided entry off the southern arterial to a roundabout, then straight streets out to the other sides and one 120 m sweeper."""
    cx, cy = entry_x, (y0 + y1) / 2; st([(cx, y0 - 30), (cx, cy - 22)], 14, "blvd"); RBTS.append((cx, cy, 22))
    st([(cx + 22, cy), (x1 + 25, cy)]); st([(cx - 22, cy), (x0 - 25, cy)]); st([(cx, cy + 22), (cx, y1 + 30)])
    sw = [(cx + 16, cy + 16)] + arc(cx + 136, cy + 16, 120, 180, 90)[1:] + [(x1 - 20, cy + 136)]; st(sw)
    houses_along((x0 + 10, cy - 35), (cx - 35, cy - 35)); houses_along((x0 + 10, cy + 35), (cx - 35, cy + 35)); houses_along((cx + 35, cy - 35), (x1 - 10, cy - 35))
    houses_along((cx - 35, y0 + 10), (cx - 35, cy - 40), 26, 12); houses_along((cx + 35, y0 + 10), (cx + 35, cy - 40), 26, 12)

# ---- residential blocks (designed) ----
# The Hammocks (user): a community shaped like a rounded rectangle across Lyons from Wynmoore, backing onto the Pkwy shops; gates on Lyons and 441
def rrect(x0, y0, x1, y1, r):
    return ([(x0 + r, y0), (x1 - r, y0)] + arc(x1 - r, y0 + r, r, -90, 0)[1:] + [(x1, y1 - r)] + arc(x1 - r, y1 - r, r, 0, 90)[1:] + [(x0 + r, y1)]
            + arc(x0 + r, y1 - r, r, 90, 180)[1:] + [(x0, y0 + r)] + arc(x0 + r, y0 + r, r, 180, 270)[1:])
HAM = rrect(-740, 200, -90, 440, 80); st(HAM + HAM[:1])
for a_, b_ in ((( -660, 200), (-170, 200)), ((-660, 440), (-170, 440)), ((-740, 280), (-740, 360)), ((-90, 280), (-90, 360))):
    houses_along(a_, b_, 26, 18)
st([(X441, 320), (XLYONS, 320)])                                             # cross street gate to gate (bridges the canal)
for x in (-560, -380):
    st([(x, 440), (x, 372)]); CULS.append((x, 372, 11)); st([(x, 200), (x, 268)]); CULS.append((x, 268, 11)); houses_along((x, 440), (x, 380), 22, 14); houses_along((x, 200), (x, 260), 22, 14)
houses_along((-700, 320), (-240, 320), 30, 16); houses_along((-180, 320), (-110, 320), 30, 16)
boulevard(-790, 535, -250, 765, -520)                                        # townhomes, Copans -> Sample
st([(60, Y["wiles"] - 12), (60, Y["sample"] + 13)], 7, "loc")                     # user: Trash Mountain fills E of Lyons, Sample -> Wiles (landmark, not drivable); a gated landfill service road runs down its west side
grid(35, 1110, 265, 1290, step=76)                                           # homes by Lyons on Wiles (first third)
grid(-790, 1480, -35, 1600, step=95, join=("n",))                            # N of Sawgrass, W of Lyons (Johnson side)
lake_loop(-410, 1725, 260, 35, [(X441 + 13, 1725), (XLYONS - 12, 1725), (-410, Y["hillsboro"] - 12)], culs=(250, 290))   # Johnson -> Hillsboro
grid(210, 1640, 430, 1790, step=72, join=("n",))                             # NE homes beside the fire station
# Dave's neighbourhood off Banks (south of the Pkwy): a straight street west off Banks, a 90 m bend down to his cul-de-sac
st([(XBANKS, -120), (-610, -120)] + arc(-610, -210, 90, 90, 180)[1:] + [(-700, -300)]); CULS.append((-700, -300, 12))
for p in [(-480 - 26 * i, -120) for i in range(1, 6)]: HOUSES += [(p[0], -100), (p[0], -140)]
houses_along((-700, -215), (-700, -290), 24, 18)
grid(-420, -470, -260, -40, step=80, join=("n",)); st([(-260, -255), (XBANKS, -255)])     # pocket east of Banks
CULS.append((XBANKS, -420, 12)); st([(XBANKS, -330), (-620, -330)]); CULS.append((-620, -330, 11)); houses_along((XBANKS, -330), (-620, -330))
LAKES.append((-140, -300, 95, 70)); st([(-232, -230), (-330, -180), (-560, -150), (-625, -128)], 4, "trail")   # canal ends in this lake; lake path to Dave's street (bike)
# Wynmoore (north half of its block): gate on Lyons, a ring drive round the golf lake
LAKES.append((470, 360, 120, 45)); RINGS.append((470, 360, 230, 85)); st([(XLYONS + 12, 360), (240, 360)]); st([(XPOWER - 12, 350), (700, 350)], 5, "trail")

# ---- zones / lots ----
def R_(x0, y0, x1, y1): return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
ZONES = [("THE HAMMOCKS", R_(-790, 160, -35, 465), "#6fa84e", "#173a0a"), ("SHOPS  GAS  FAST FOOD", R_(XW, YS, X441 - 15, YN), "#c7a98a", "#4a2e1a"), ("SHOPS  GAS  FAST FOOD", R_(XPOWER + 15, YS, XE, YN), "#c7a98a", "#4a2e1a"),
         ("WYNMOORE (gated golf)", R_(35, 250, 790, 465), "#cfe0a8", "#3d4d10"), ("", R_(35, 35, 790, 232), "#86b86a", ""),
         ("BUTTERFLY WORLD + TRADEWINDS PARK", R_(375, 535, 790, 765), "#7cc05a", "#1f4d12"), ("SABAL PINES PARK", R_(530, 1110, 790, 1290), "#7cc05a", "#1f4d12"),
         ("TRASH MOUNTAIN", R_(80, 835, 790, 1040), "#8a7a52", "#2e2410"), ("", R_(35, -505, 790, -35), "#7cc05a", ""), ("construction site", R_(470, 1650, 790, 1790), "#b9a37a", "#4a3a1a"),
         ("offices", R_(35, 1345, 790, 1490), "#9db58a", "#2a3a1a")]
LOTS = [  # (polygon, buildings (x0, y0, x1, y1, colour, label), aisle step, direction)
    (R_(XW + 25, 520, X441 - 20, 790), [(XW + 28, 560, XW + 100, 760, "#2f64ad", "WALMART")], 10, "v"),
    (R_(-610, 835, -35, 1045), [(-600, 985, -470, 1038, "#9aa3ad", "FORD"), (-455, 985, -325, 1038, "#c9ccd1", "TOYOTA"), (-310, 985, -180, 1038, "#9aa3ad", "HONDA"), (-165, 985, -40, 1038, "#c9ccd1", "KIA")], 10, "h"),
    (R_(-790, 1110, -35, 1282), [(-780, 1215, -680, 1275, "#c56a4a", ""), (-660, 1170, -540, 1275, "#7d8086", "GARAGE"), (-450, 1150, -350, 1215, "#e4d9c2", "PLAZA"), (-300, 1215, -190, 1275, "#d6a24a", ""), (-160, 1115, -45, 1165, "#9a3b52", "COOPER'S HAWK")], 10, "v"),
    (R_(-790, 1345, -35, 1395), [(-780, 1355, -600, 1390, "#d6a24a", ""), (-560, 1355, -380, 1390, "#c56a4a", "")], 10, "v"),
    (R_(-260, 1340, -35, 1430), [(-240, 1380, -55, 1425, "#2e8b3e", "PUBLIX")], 10, "v"),
    (R_(35, 680, 170, 785), [(50, 715, 110, 765, "#d22d24", "McD")], 8, "h"),
    (R_(-180, 530, -35, 785), [(-170, 650, -50, 770, "#2f6fb3", "CITY HALL"), (-170, 545, -50, 625, "#1d3f8a", "POLICE")], 9, "h"),
    (R_(280, 1110, 510, 1290), [(290, 1190, 500, 1280, "#b8865a", "COCONUT CREEK ELEMENTARY")], 10, "v"),
    (R_(400, 50, 780, 220), [(470, 125, 765, 210, "#b8865a", "COCONUT CREEK HIGH")], 10, "v"),                         # user: the football field is by Lyons, the school behind it
    (R_(-790, 845, -630, 1040), [(-775, 950, -650, 1032, "#c8901e", "SEMINOLE CASINO")], 10, "h"),                     # casino + valet loop + lot (a way through)
    (R_(35, 1600, 190, 1700), [(45, 1640, 150, 1695, "#b8322a", "FIRE STATION")], 8, "h"),
    (R_(-790, 30, -35, 125), [(-780, 75, -650, 120, "#c8102e", "WALGREENS"), (-630, 75, -540, 120, "#d6a24a", "PIZZA"), (-520, 75, -430, 120, "#c56a4a", "DELI"), (-190, 75, -50, 120, "#7a9ac8", "CLEANERS")], 9, "v"),
    (R_(35, -230, 290, -50), [(50, -150, 250, -60, "#5b8fc9", "REC CENTER")], 10, "v"), (R_(560, -230, 790, -50), [(580, -150, 770, -60, "#5b8fc9", "POOL")], 10, "v"),
    (R_(180, 1360, 560, 1470), [(200, 1400, 330, 1465, "#7d8086", "OFFICE GARAGE"), (380, 1400, 540, 1465, "#9aa3ad", "OFFICES")], 10, "v"),
    (R_(190, 535, 360, 660), [(205, 590, 340, 650, "#d6a24a", "GAS + SHOPS ?")], 9, "h"),
]
DAVE = (-700, -320); PUBLIX = (-150, 1405)
SPOTS = [("GATE", 50, 360, "#d0582a", 1), ("DAVE", DAVE[0], DAVE[1], "#e33b3b", 1)]
JUMPS = [(XCANAL, 650), (XCANAL, 300), (XW + 32, 780), (600, 1760), (575, 300), (760, 70), (-325, 900), (275, -400), (525, -400)]
BREAKERS = [(XE - 40, 1075), (X441 - 55, 450), (-400, 1180), (-150, 950), (-160, 1440), (50, 375), (200, 222), (390, 755), (510, 1725)]
HIDES = [(X441 - 55, 1175), (-600, 1222), (0, 1500), (XW + 60, 540)]
STARS = [(-712, 1040), (600, 655), (450, 1000), (-107, 775), (100, 440), (XW + 64, 745), (-400, 1255), (92, 772), (210, 1690)]
BRIDGES = [(XCANAL, 320), (XCANAL, 0), (XCANAL, Y["copans"]), (XCANAL, Y["sample"])]
# ---- draft 9 (user): each driver gets his own route to Dave. Lyons stays the spine (it has to feel like Coconut Creek): roadblocks push you off it
# through a landmark and back on, "organic", and each character's chapter sets its own roadblocks. Marc = Lyons hop-offs, Aaron = the east side, Chris = the jumps.
st([(XCANAL + 14, Y["sample"] - 14), (XCANAL + 14, 14)], 6, "trail")          # canal maintenance path (east bank), hidden behind the houses
st([(X441 + 14, 140), (XCANAL - 10, 140)], 6, "alley"); st([(XCANAL + 10, 140), (-35, 140)], 6, "alley")   # service alley behind the Pkwy shops
MARC, AARON, CHRIS = "#4fa3ff", "#ffb03a", "#e07bff"
CUTS = [  # (label, colour, polyline): the detours, each through a landmark
    ("M1", MARC, [(-14, 1200), (-60, 1195), (-100, 1150), (-100, 1092), (-14, 1088)]),           # round Cooper's Hawk (valet lane), onto Wiles, back to Lyons
    ("M2", MARC, [(12, 790), (60, 770), (130, 730), (90, 690), (14, 680)]),                       # McDonald's drive-thru, back onto Lyons
    ("M3", MARC, [(-14, 640), (-60, 640), (-110, 585), (-110, 515)]),                            # swerve across Lyons through the police station lot (past the cruisers) to Copans
    ("M4", MARC, [(-14, 150), (-200, 140), (-450, 140), (-470, 110), (-470, 14)]),                # shop alley, out the Walgreens drive-thru, Banks is right there
    ("A1", AARON, [(400, 1300), (400, 1250), (330, 1180), (400, 1092)]),                        # elementary drop-off loop: Winston -> Wiles
    ("A2", AARON, [(60, 1062), (60, 960), (60, 848)]),                                         # landfill road past Trash Mountain
    ("A3", AARON, [(390, 790), (430, 700), (560, 650), (560, 548)]),                            # through Butterfly World (service gate, past the dome)
    ("A4", AARON, [(40, 360), (250, 325), (230, 240)]),                                         # smash the Wynmoore gate, across the golf course
    ("A5", AARON, [(225, 232), (200, 130), (230, 40), (230, 14)]),                              # across the football field, out the bus loop
    ("C1", CHRIS, [(-150, 1345), (-150, 1282), (-400, 1215), (-470, 1150)]),                    # Publix lot, median gap, Promenade plaza: jump the fountain
    ("C2", CHRIS, [(-600, 1282), (-600, 1230), (-600, 1170), (-600, 1095)]),                    # up the parking garage, jump off the top deck onto Wiles
    ("C3", CHRIS, [(-700, 1062), (-780, 1000), (-712, 925), (-665, 920), (-700, 870), (-700, 813)]),   # casino valet loop, out through the lot
    ("C4", CHRIS, [(XW + 120, 760), (XW + 32, 780), (XW + 15, 760)]),                            # Walmart loading-dock ramp onto the back lane
    ("C5", CHRIS, [(-740, 320), (-470, 320), (-470, 200), (-470, 140), (XCANAL - 10, 140)]),     # in the Hammocks' 441 gate, out the back fence to the shop alley
    ("C6", CHRIS, [(XCANAL + 14, 140), (XCANAL + 14, 14), (XCANAL + 14, -200), (-330, -180), (-560, -150), (-625, -128)]),   # canal path, under the Pkwy bridge, lake path to Dave's back yard
]
BLOCKS = [  # (x, y, along: 'ns' road runs north-south, colour): that chapter's roadblocks
    (0, 1150, "ns", MARC), (0, 735, "ns", MARC), (0, 600, "ns", MARC), (0, 90, "ns", MARC),
    (0, 1280, "ns", AARON), (0, 470, "ns", AARON),
    (-300, 1312, "ew", CHRIS), (X441, 1150, "ns", CHRIS),
]
ROUTES = [
    ("MARC (Jeep): Lyons, hopping off through Cooper's Hawk, McDonald's, the police station, Walgreens", MARC,
     [PUBLIX, (-14, 1330), (-14, 1200), (-60, 1195), (-100, 1150), (-100, 1092), (-14, 1088), (-14, 800), (60, 770), (130, 730), (90, 690), (14, 680), (-14, 640), (-60, 640), (-110, 585), (-110, 515), (-14, 508),
      (-14, 150), (-200, 140), (-450, 140), (-470, 110), (-470, 14), (XBANKS + 8, -8), (XBANKS + 8, -112), (-610, -112), DAVE]),
    ("AARON (Tesla): the east side: school loop, Trash Mountain, Butterfly World, golf course, football field", AARON,
     [PUBLIX, (-14, 1330), (400, 1312), (400, 1250), (330, 1180), (400, 1092), (60, 1075), (60, 960), (60, 848), (390, 800), (430, 700), (560, 650), (560, 548), (300, 515), (40, 470), (40, 360), (250, 325), (230, 240), (200, 130), (230, 14),
      (100, -8), (XBANKS + 8, -14), (XBANKS + 8, -120), (-610, -120), DAVE]),
    ("CHRIS (bike): the jumps: fountain, garage roof, casino loop, loading dock, the Hammocks, canal path", CHRIS,
     [PUBLIX, (-150, 1345), (-150, 1282), (-400, 1215), (-470, 1150), (-600, 1170), (-600, 1095), (-700, 1062), (-780, 1000), (-712, 925), (-665, 920), (-700, 870), (-700, 813), (X441, 806), (XW + 120, 780), (XW + 32, 780), (XW + 15, 760),
      (XW + 15, 330), (-740, 320), (-470, 320), (-470, 200), (-470, 140), (XCANAL + 14, 140), (XCANAL + 14, 14), (XCANAL + 14, -200), (-330, -180), (-560, -150), (-625, -128), DAVE]),
]
CT_TXT = [("M1 round Cooper's Hawk, Wiles, back to Lyons", MARC), ("M2 McDonald's drive-thru", MARC), ("M3 across Lyons through the police lot", MARC), ("M4 shop alley, Walgreens drive-thru", MARC),
          ("A1 elementary drop-off loop", AARON), ("A2 landfill road past Trash Mountain", AARON), ("A3 through Butterfly World", AARON), ("A4 Wynmoore gate, golf course", AARON), ("A5 football field, bus loop", AARON),
          ("C1 Publix lot, plaza fountain jump", CHRIS), ("C2 garage roof jump", CHRIS), ("C3 casino valet loop", CHRIS), ("C4 Walmart loading dock jump", CHRIS), ("C5 the Hammocks, out the back fence", CHRIS), ("C6 canal path to Dave's back yard", CHRIS)]

# ---- draw ----
S = .44; PAD = 40
X0, X1, Y0, Y1 = XW - 20, XE + 20, YS - 50, YN + 20
W, H = int((X1 - X0) * S) + 2 * PAD + 470, int((Y1 - Y0) * S) + 2 * PAD + 40
P = lambda x, y: (PAD + (x - X0) * S, PAD + 40 + (Y1 - y) * S)
def font(sz, b=True): return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if b else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", sz)
im = Image.new("RGB", (W, H), "#2b3a26"); d = ImageDraw.Draw(im)
OUT = lambda t, xy, sz=13, **k: d.text(xy, t, fill="white", font=font(sz), stroke_width=3, stroke_fill="#1b1b1b", **k)
d.rectangle([P(XW, YN), P(XE, YS)], fill="#5d9a3a")
for (lab, poly, col, tc) in ZONES:
    d.polygon([P(*p) for p in poly], fill=col); xs = [p[0] for p in poly]; ys = [p[1] for p in poly]
    if lab and "SHOPS" not in lab: d.text(P((min(xs) + max(xs)) / 2, max(ys) - 18), lab, fill=tc, font=font(10), anchor="mm")
for side, x in ((-1, X441 - 92), (1, XPOWER + 52)):
    t = Image.new("RGBA", (700, 24), (0, 0, 0, 0)); ImageDraw.Draw(t).text((350, 12), "SHOPS   GAS   FAST FOOD   CAR WASH", fill="#4a2e1a", font=font(11), anchor="mm"); t = t.rotate(90, expand=True)
    a, b = P(x, 1650); im.paste(t, (int(a - 12), int(b - 350)), t)
for k, (rx, ry, col) in enumerate([(330, 95, "#7d6d48"), (270, 75, "#6f7a45"), (200, 55, "#7f8a52"), (120, 34, "#93a060")]):      # Trash Mountain: a big grassy mound
    c = P(440, 945); d.ellipse([c[0] - rx * S, c[1] - ry * S, c[0] + rx * S, c[1] + ry * S], fill=col)
d.text(P(440, 945), "TRASH MOUNTAIN", fill="white", font=font(13), anchor="mm", stroke_width=3, stroke_fill="#2e2410")
for (poly, blds, step, dirn) in LOTS:
    d.polygon([P(*p) for p in poly], fill="#7d8086"); xs = [p[0] for p in poly]; ys = [p[1] for p in poly]; x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    if dirn == "v":
        for xx in range(int(x0) + 8, int(x1) - 4, step): d.line([P(xx, y0 + 4), P(xx, y1 - 4)], fill="#b9bcc2", width=1)
    else:
        for yy in range(int(y0) + 6, int(y1) - 4, step): d.line([P(x0 + 4, yy), P(x1 - 4, yy)], fill="#b9bcc2", width=1)
    for (a, b, c, e, col, lab) in blds:
        d.rectangle([P(a, e), P(c, b)], fill=col, outline="#2b2b2b")
        if lab: d.text(P((a + c) / 2, (b + e) / 2), lab, fill="white", font=font(8), anchor="mm", stroke_width=2, stroke_fill="#1b1b1b")
for yy in range(850, 970, 14):                                       # dealer car rows
    for xx in range(-600, -40, 8): d.rectangle([P(xx, yy + 3), P(xx + 5, yy - 3)], fill=["#d33", "#eee", "#36c", "#222", "#c9a227"][(xx // 8 + yy) % 5])
tx, ty = P(200, 130); d.ellipse([tx - 70 * S * 2.2, ty - 32 * S * 2.2, tx + 70 * S * 2.2, ty + 32 * S * 2.2], fill="#b5533c"); d.rectangle([tx - 44 * S * 2.2, ty - 20 * S * 2.2, tx + 44 * S * 2.2, ty + 20 * S * 2.2], fill="#4f9a3a", outline="white")
def court(x0, y0, x1, y1, col): d.rectangle([P(x0, y1), P(x1, y0)], fill=col, outline="white")
for i in range(4): court(320 + i * 50, -150, 360 + i * 50, -70, "#b5533c")
for i in range(4): court(60 + i * 45, -480, 95 + i * 45, -330, "#4b8bbf")
sk = P(400, -400); d.ellipse([sk[0] - 150 * S, sk[1] - 80 * S, sk[0] + 150 * S, sk[1] + 80 * S], fill="#c9c9c9", outline="#8a8a8a", width=2); d.text(sk, "SKATE PARK", fill="#1b1b1b", font=font(8), anchor="mm")
bf = P(650, -460); d.pieslice([bf[0] - 120 * S, bf[1] - 120 * S, bf[0] + 120 * S, bf[1] + 120 * S], 225, 315, fill="#4f9a3a")
for (cx, cy, rx, ry) in LAKES: d.ellipse([P(cx - rx, cy + ry), P(cx + rx, cy - ry)], fill="#2d78b8")
d.line([P(XCANAL, Y["sample"]), P(XCANAL, -230)], fill="#2d78b8", width=max(3, int(14 * S)))
for (x, y) in HOUSES: a, b = P(x, y); d.rectangle([a - 3, b - 3, a + 3, b + 3], fill="#e0c9a6", outline="#a8865a")
STY = {"art": ("#3a3c40", "#e8c34a"), "col": ("#3a3c40", "#e8c34a"), "hwy": ("#8a7a50", "#f4f0e0"), "loc": ("#55585e", None), "blvd": ("#55585e", "#9fd36b"), "alley": ("#8a8a8a", None), "trail": ("#d9c9a0", None), "ramp": ("#8a7a50", None)}
for (cx, cy, rx, ry) in RINGS: d.ellipse([P(cx - rx, cy + ry), P(cx + rx, cy - ry)], outline="#55585e", width=max(3, int(9 * S)))
for kind_pass in (("alley", "trail", "loc", "blvd"), ("col", "art"), ("ramp", "hwy")):
    for name, pts, w, kind in ROADS:
        if kind not in kind_pass: continue
        c, ln = STY[kind]; d.line([P(*p) for p in pts], fill=c, width=max(2, int(w * S)), joint="curve")
        if ln: d.line([P(*p) for p in pts], fill=ln, width=1, joint="curve")
for (x, y, r) in CULS: a, b = P(x, y); rr = r * S + 2; d.ellipse([a - rr, b - rr, a + rr, b + rr], fill="#55585e")
for (x, y, r) in RBTS: a, b = P(x, y); rr = r * S + 2; d.ellipse([a - rr, b - rr, a + rr, b + rr], fill="#7cc05a", outline="#55585e", width=3)
for name, pts, w, kind in ROADS:
    if kind not in ("art", "col", "hwy"): continue
    for q, prev in ((pts[0], pts[1]), (pts[-1], pts[-2])):
        if q[0] in (XW, XE) or q[1] in (YS, YN):
            dx, dy = q[0] - prev[0], q[1] - prev[1]; l = math.hypot(dx, dy); nx, ny = -dy / l, dx / l; hw = w / 2 + 4
            d.line([P(q[0] + nx * hw, q[1] + ny * hw), P(q[0] - nx * hw, q[1] - ny * hw)], fill="#e8312a", width=6)
for name, pts, w, kind in ROADS:
    if not name: continue
    if pts[0][0] == pts[-1][0]:
        t = Image.new("RGBA", (360, 30), (0, 0, 0, 0)); ImageDraw.Draw(t).text((180, 15), name, fill="white", font=font(13), anchor="mm", stroke_width=3, stroke_fill="#1b1b1b")
        t = t.rotate(90, expand=True); cx, cy = P(pts[0][0], 380 if name != "Banks Rd" else -260); im.paste(t, (int(cx - t.width / 2 - w * S / 2 - 11), int(cy - t.height / 2)), t)
    else: OUT(name, P(X441 + 20, (pts[0][1] if "Winston" not in name and "Sawgrass" not in name else (1366 if "Winston" in name else 1440)) + 22), 12 if kind != "col" else 10, anchor="ls")
d.text(P(-780, 1300), "THE PROMENADE", fill="#fff2a8", font=font(12), anchor="ls", stroke_width=3, stroke_fill="#1b1b1b")
for (x, y, along, col) in BLOCKS:                              # the chapter's roadblocks: a striped barrier across the road, tagged in the driver's colour
    c = P(x, y)
    if along == "ns": d.line([(c[0] - 16, c[1]), (c[0] + 16, c[1])], fill="#ff8c1a", width=7); d.line([(c[0] - 16, c[1]), (c[0] + 16, c[1])], fill="white", width=2)
    else: d.line([(c[0], c[1] - 14), (c[0], c[1] + 14)], fill="#ff8c1a", width=7); d.line([(c[0], c[1] - 14), (c[0], c[1] + 14)], fill="white", width=2)
    d.ellipse([c[0] - 5, c[1] - 5, c[0] + 5, c[1] + 5], fill=col, outline="#1b1b1b")
for (lab, col, pts) in ROUTES:
    q = [P(*p) for p in pts]
    for i in range(len(q) - 1):
        (ax, ay), (bx, by) = q[i], q[i + 1]; L = math.hypot(bx - ax, by - ay); n = max(1, int(L / 10))
        for k in range(0, n, 2): d.line([(ax + (bx - ax) * k / n, ay + (by - ay) * k / n), (ax + (bx - ax) * min(n, k + 1) / n, ay + (by - ay) * min(n, k + 1) / n)], fill=col, width=4)
def badge(x, y, txt, fill, fg="#1b1b1b", r=8):
    cx, cy = P(x, y); d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=fill, outline="#1b1b1b", width=2); d.text((cx, cy), txt, fill=fg, font=font(10), anchor="mm")
def star(cx, cy, r=10): d.polygon([(cx + (r if k % 2 == 0 else r * .45) * math.sin(k * math.pi / 5), cy - (r if k % 2 == 0 else r * .45) * math.cos(k * math.pi / 5)) for k in range(10)], fill="#fff2a8", outline="#1b1b1b")
for (lab, col, pts) in CUTS:
    q = [P(*p) for p in pts]; cx, cy = q[len(q) // 2]; d.rounded_rectangle([cx - 13, cy - 9, cx + 13, cy + 9], 4, fill=col, outline="#1b1b1b"); d.text((cx, cy), lab, fill="#1b1b1b", font=font(10), anchor="mm")
for x, y in BRIDGES: cx, cy = P(x, y); d.rectangle([cx - 7, cy - 11, cx + 7, cy + 11], outline="#e9e2c8", width=3)
for x, y in JUMPS: badge(x, y, "J", "#ffe14a")
for x, y in BREAKERS: badge(x, y, "P", "#ff5a4a", "white")
for x, y in HIDES: badge(x, y, "H", "#9a6bff", "white")
for x, y in STARS: star(*P(x, y))
for (lab, x, y, col, side) in SPOTS:
    cx, cy = P(x, y); d.ellipse([cx - 8, cy - 8, cx + 8, cy + 8], fill=col, outline="white", width=2); OUT(lab, (cx + 12 * side, cy), 12, anchor="lm" if side > 0 else "rm")
OUT("COCONUT CREEK  -  PLAN v7 (draft 9: a route per driver)", (PAD, 16), 19)
lx = int(P(XE, 0)[0]) + 36; ly = PAD + 70
def leg(i, draw, text): y = ly + i * 27; draw(lx + 10, y); d.text((lx + 30, y), text, fill="#f0ead6", font=font(12), anchor="lm")
OUT("KEY", (lx, ly - 30), 15)
for i, (t, f, g, lab) in enumerate([("J", "#ffe14a", "#1b1b1b", "jump ramp"), ("P", "#ff5a4a", "white", "smashable: wrecks cops behind you"), ("H", "#9a6bff", "white", "hiding spot: lose the cops")]):
    leg(i, lambda x, y, t=t, f=f, g=g: (d.ellipse([x - 8, y - 8, x + 8, y + 8], fill=f, outline="#1b1b1b", width=2), d.text((x, y), t, fill=g, font=font(10), anchor="mm")), lab)
leg(3, lambda x, y: star(x, y), "landmark you can see from far")
leg(4, lambda x, y: d.rectangle([x - 7, y - 10, x + 7, y + 10], outline="#e9e2c8", width=3), "canal bridge (choke point)")
leg(5, lambda x, y: d.rectangle([x - 10, y - 7, x + 10, y + 7], fill="#7d8086"), "parking lot / drive aisles (cut through)")
leg(6, lambda x, y: d.rectangle([x - 4, y - 4, x + 4, y + 4], fill="#e0c9a6", outline="#a8865a"), "house")
leg(7, lambda x, y: d.line([(x - 10, y), (x + 10, y)], fill="#e8312a", width=6), "edge roadblock")
leg(8, lambda x, y: (d.rounded_rectangle([x - 13, y - 9, x + 13, y + 9], 4, fill="#cccccc", outline="#1b1b1b"), d.text((x, y), "M1", fill="#1b1b1b", font=font(10), anchor="mm")), "detour through a landmark (list below)")
leg(9, lambda x, y: (d.line([(x - 12, y), (x + 12, y)], fill="#ff8c1a", width=7), d.ellipse([x - 5, y - 5, x + 5, y + 5], fill="#cccccc", outline="#1b1b1b")), "roadblock in that driver's chapter")
OUT("EACH DRIVER'S ROUTE TO DAVE", (lx, ly + 11 * 27), 15)
for i, (lab, col, pts) in enumerate(ROUTES):
    y = ly + 12 * 27 + i * 44; d.line([(lx, y), (lx + 22, y)], fill=col, width=5); head, rest = lab.split(": ", 1)
    d.text((lx + 30, y - 8), head, fill=col, font=font(12), anchor="lm"); import textwrap
    for k, ln_ in enumerate(textwrap.wrap(rest, 54)[:2]): d.text((lx + 30, y + 8 + k * 13), ln_, fill="#f0ead6", font=font(10), anchor="lm")
OUT("DETOURS", (lx, ly + 17 * 27 + 8), 15)
for i, (t, col) in enumerate(CT_TXT): d.text((lx, ly + 18 * 27 + 8 + i * 19), t, fill=col, font=font(11))
sx, sy = P(XW, YS - 30); d.line([(sx, sy), (sx + 250 * S, sy)], fill="white", width=4); OUT("250 m  (~9 s at 100 km/h)", (sx + 125 * S, sy - 11), 11, anchor="mm")
im.save(os.path.join(os.path.dirname(os.path.abspath(__file__)), "plan_v7.png")); print(W, H, len(HOUSES), "houses")

# ---- layout.json: the plan as data for the 3D builder (blender/scripts/cc_scene.py) and the traffic graph (cc_graph.py) ----
def _ell(cx, cy, rx, ry, n=72): return [(round(cx + rx * math.cos(2 * math.pi * i / n), 2), round(cy + ry * math.sin(2 * math.pi * i / n), 2)) for i in range(n)]
_rp = lambda pts: [[round(x, 2), round(y, 2)] for x, y in pts]
_roads, _nloc = [], 0
for name, pts, w, kind in ROADS:
    if not name: _nloc += 1; name = f"{kind}_{_nloc}"
    _roads.append(dict(name=name, kind=kind, w=w, pts=_rp(pts), closed=False))
for i, (cx, cy, rx, ry) in enumerate(RINGS): _roads.append(dict(name=f"ring_{i}", kind="loc", w=9 if rx > 60 else 7, pts=_rp(_ell(cx, cy, rx, ry)), closed=True))
LAYOUT = dict(
    bounds=dict(xw=XW, xe=XE, ys=YS, yn=YN), arterials=dict(x441=X441, xbanks=XBANKS, xlyons=XLYONS, xpower=XPOWER, **Y), canal=dict(x=XCANAL, y0=-230, y1=Y["sample"], w=14),
    roads=_roads, culs=[dict(x=x, y=y, r=r) for x, y, r in CULS], roundabouts=[dict(x=x, y=y, r=r) for x, y, r in RBTS],
    lakes=[dict(x=cx, y=cy, rx=rx, ry=ry) for cx, cy, rx, ry in LAKES], houses=_rp(HOUSES),
    zones=[dict(label=lab, poly=_rp(poly), color=col) for lab, poly, col, tc in ZONES],
    lots=[dict(poly=_rp(poly), dir=dirn, step=step, buildings=[dict(x0=a, y0=b, x1=c, y1=e, color=col, label=lab) for a, b, c, e, col, lab in blds]) for poly, blds, step, dirn in LOTS],
    jumps=_rp(JUMPS), breakers=_rp(BREAKERS), hides=_rp(HIDES), stars=_rp(STARS), bridges=_rp(BRIDGES),
    cuts=[dict(label=lab, color=col, pts=_rp(pts)) for lab, col, pts in CUTS], blocks=[dict(x=x, y=y, along=al, color=col) for x, y, al, col in BLOCKS],
    routes=[dict(label=lab, color=col, pts=_rp(pts)) for lab, col, pts in ROUTES], dave=list(DAVE), publix=list(PUBLIX), gate=[50, 360])
json.dump(LAYOUT, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "layout.json"), "w"), separators=(",", ":"))
print("layout.json", len(_roads), "roads", len(HOUSES), "houses")
