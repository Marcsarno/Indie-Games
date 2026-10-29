"""Coconut Creek first slice. Run: blender -b --python scripts/coconut_scene.py   (env NORENDER=1 to only export; needs out/tex from textures.py)
Exports to out/: coconut_scene.glb (static), props.json (vegetation instances), colliders.json, cars.json, world.json."""
import sys, os, json, math, random; sys.path.insert(0, os.path.dirname(__file__))
from kit import *; from street_fl import *; from building_fl import make_house, make_row, make_plaza; import vegetation as veg; from car import make_car; import mood; import roads as rd; import civic; import time as _t; T0 = _t.time()
def tick_(n): print('T', n, round(_t.time() - T0, 1))

reset(); mood.florida(); mood._transform(); R_ = random.Random(7)
EXT = 200; m = mats(); T = Builder("terrain"); T.box(m["grass"], -EXT - 140, EXT + 140, -EXT - 140, EXT + 140, -.3, 0)
class Tiled:                                                                                                             # road/lake surfaces split into 64 m tiles so the page can frustum-cull them
    def __init__(self, name, size=64): self.name, self.size, self.b = name, size, {}
    def poly(self, m, pts):
        k = (int(sum(p[0] for p in pts) / len(pts) // self.size), int(sum(p[1] for p in pts) / len(pts) // self.size)); self.b.setdefault(k, Builder(f"{self.name}_{k[0]}_{k[1]}")).poly(m, pts)
    def build(self, **kw): return [b.build(**kw) for b in self.b.values()]
RB = Tiled("roads")
COL, PROPS, CARS, STATIC, MAP = [], [], [], [], []
def cbox(x, y, w, d, rz=0, car=None, soft=None):
    COL.append({"t": "box", "x": round(x, 2), "y": round(y, 2), "w": round(w, 2), "d": round(d, 2), "rz": rz})
    if soft: COL[-1]["soft"] = soft
    return COL[-1]
def ccir(x, y, r, soft=None):                                                                                           # soft = "bush" (drag + rustle) or "pole" (thin sign/signal post): cars push through, no impulse
    COL.append({"t": "circle", "x": round(x, 2), "y": round(y, 2), "r": r}); 
    if soft: COL[-1]["soft"] = soft
def mapr(x0, y0, x1, y1, c): MAP.append([round(x0, 1), round(y0, 1), round(x1, 1), round(y1, 1), c])
def prop(kind, x, y, s=None, col=True):
    s = s or R_.uniform(.9, 1.15); PROPS.append({"k": kind, "x": round(x, 2), "y": round(y, 2), "rz": round(R_.uniform(0, 360)), "s": round(s, 2)})
    if col:
        if kind.startswith("shrub"): ccir(x, y, .5 * s, "bush")
        else: ccir(x, y, {"palm_tall": .2, "palm_medium": .19, "palm_small": .16, "oak": .4}.get(kind, .3) * (1 if kind.startswith("palm") else s))   # thin trunks only
def hedge(x0, y0, x1, y1):
    n = max(1, int(max(abs(x1 - x0), abs(y1 - y0))))                       # a straight run of unit hedges (instanced), one collider box for the whole run
    for i in range(n):
        t = (i + .5) / n; PROPS.append({"k": "hedge", "x": round(x0 + (x1 - x0) * t, 2), "y": round(y0 + (y1 - y0) * t, 2), "rz": 0 if abs(x1 - x0) > abs(y1 - y0) else 90, "s": 1.0})
    cbox((x0 + x1) / 2, (y0 + y1) / 2, max(abs(x1 - x0), .9), max(abs(y1 - y0), .9), soft="bush")
def put(o, x, y, z=0, rz=0, w=None, d=None, col=True):
    o.location = (x, y, z); o.rotation_euler = (0, 0, math.radians(rz)); STATIC.append(o)
    if w and col: cbox(x, y, w, d, rz)
    return o


# ================================================================  ROADS  ===============================================================
PKWY = rd.Road("Coconut Creek Pkwy", [(26, -192), (24, -150), (20, -120), (16, -104), (13, -70), (5, -35), (-3, -5), (-9, 28), (-8, 62), (-2, 104), (3, 135), (2, 192)], hw=8.4, mh=1.6, rank=10, flare=7, xwalk=True)
WILES = rd.Road("Wiles Rd", [(-192, -22), (-160, -20), (-130, -16), (-104, -14), (-72, -16), (-40, -10), (-12, -6), (8, -5), (30, -9), (51.5, -7.6)], hw=3.5, rank=8, flare=5.5)
RING = rd.ring_road("Plaza Circle", 58, -8, 10, 3.6, rank=9, seam=math.pi * 1.5)
WILES_E = rd.Road("Wiles Rd E", [(66.5, -8), (80, -7), (104, -2), (130, 2), (160, 6), (192, 2)], hw=3.5, rank=8, flare=5.5)
ENTRY = rd.Road("Plaza Entry", [(58, 0.5), (58, 5), (58, 12)], hw=3.0, rank=6, flare=4.5)
LAKEVIEW = rd.Road("Lakeview Dr", [(58, -15.5), (58, -34), (64, -56), (60, -80), (64, -104), (70, -130), (66, -160), (70, -192)], hw=3.5, rank=6)
PLAZA_DR = rd.Road("Plaza Dr", [(16, 17.6), (2, 17.9), (-14, 17.6)], hw=3.0, rank=6, flare=4.5)
SCHOOL_DR = rd.Road("School Dr", [(56, -43), (66, -43), (74, -43)], hw=3.0, rank=5, flare=4.5)
CIVIC_DR = rd.Road("Civic Dr", [(66, -86), (56, -86), (50, -86)], hw=3.0, rank=5, flare=4.5)
PALM = rd.Road("Palm Lane", [(-3, 29), (-20, 28), (-34, 31), (-52, 30), (-66, 35), (-77, 50), (-77, 62), (-70, 69.5), (-61.5, 72)], hw=3.5, rank=6)
HERON = rd.Road("Heron Way", [(-12, 77.5), (4, 78.4), (22, 79.0), (40, 79.1), (58, 78.7), (70, 78.0), (80, 78.6)], hw=3.5, rank=6)
HERON_CT = rd.ring_road("Heron Ct", 84, 78.5, 6.0, 2.8, rank=7, seam=-math.pi / 2 - 1.0, flare=1.6)
PARK_DR = rd.Road("Park Dr", [(17, -87), (6, -87.4), (-18, -87.6), (-34, -87.2), (-45, -87.1)], hw=3.0, rank=5, flare=4.5)
CUL = rd.ring_road("Palm Ct", -58, 72, 6.0, 2.8, rank=7, seam=-math.pi / 2 - 1.0, flare=1.6)
def organic(cx, cy, rx, ry, seed, n=12, wob=.28, rot=0.0):                                                                  # lumpy pond outline: noisy radius around an ellipse
    r_ = random.Random(seed); ph = [r_.uniform(0, 6.28) for _ in range(3)]; out = []
    for k in range(n):
        a = 2 * math.pi * k / n; f = 1 + wob * math.sin(2 * a + ph[0]) * .8 + wob * .7 * math.sin(3 * a + ph[1]) + wob * .45 * math.sin(5 * a + ph[2]) + r_.uniform(-.06, .06)
        x, y = rx * f * math.cos(a), ry * f * math.sin(a); c_, s_ = math.cos(rot), math.sin(rot); out.append((cx + x * c_ - y * s_, cy + x * s_ + y * c_))
    return out
LAKES_CTRL = {"windmill": organic(-46, -44, 24, 17, 3, 14, .3, .25), "pond_w": organic(-84, -62, 11, 8, 5, 9, .25, .6), "wiles": organic(-54, 9, 23, 8.5, 8, 12, .28, -.08),
              "north": organic(88, 47, 11, 12.5, 11, 11, .22, .2),
              "w_frame": organic(-161, 70, 9, 32, 31, 12, .1, 0), "e_frame": organic(162, -70, 8, 32, 32, 12, .1, 0), "n_frame": organic(70, 162, 36, 6.5, 33, 12, .1, 0), "s_frame": organic(-70, -162, 36, 6.5, 34, 12, .1, 0),
              "nw_inner": organic(-113, 104, 8, 14, 35, 10, .15, 0), "se_inner": organic(114, -112, 8, 16, 36, 10, .15, 0)}
# ---- city skeleton: perimeter loop (sound wall + tree belt outside), four curved arterials, four roundabouts where they meet
H_, RC_ = 186.0, 30.0
def loop_points():
    pts = []; arcs = ((H_ - RC_, -H_ + RC_, -90), (H_ - RC_, H_ - RC_, 0), (-H_ + RC_, H_ - RC_, 90), (-H_ + RC_, -H_ + RC_, 180))
    pts.append((H_, 0.0))
    for (cx_, cy_, a0) in arcs[1:2]: pts += [(cx_ + RC_ * math.cos(math.radians(a0 + k * 30)), cy_ + RC_ * math.sin(math.radians(a0 + k * 30))) for k in range(4)]
    pts.append((0.0, H_))
    for (cx_, cy_, a0) in arcs[2:3]: pts += [(cx_ + RC_ * math.cos(math.radians(a0 + k * 30)), cy_ + RC_ * math.sin(math.radians(a0 + k * 30))) for k in range(4)]
    pts.append((-H_, 0.0))
    for (cx_, cy_, a0) in arcs[3:4]: pts += [(cx_ + RC_ * math.cos(math.radians(a0 + k * 30)), cy_ + RC_ * math.sin(math.radians(a0 + k * 30))) for k in range(4)]
    pts.append((0.0, -H_))
    for (cx_, cy_, a0) in arcs[0:1]: pts += [(cx_ + RC_ * math.cos(math.radians(a0 + k * 30)), cy_ + RC_ * math.sin(math.radians(a0 + k * 30))) for k in range(4)]
    return pts
LOOP = rd.Road("Coconut Loop", loop_points(), hw=8.4, mh=1.6, sw=(1, 0), rank=11, closed=True, flare=7)
LYONS = rd.Road("Lyons Rd", [(-142, -192), (-136, -120), (-148, -40), (-140, 40), (-134, 120), (-142, 192)], hw=5.0, rank=9, flare=6)
SAMPLE = rd.Road("Sample Rd", [(142, -192), (136, -110), (146, -30), (138, 50), (144, 120), (140, 192)], hw=5.0, rank=9, flare=6)
HILLS = rd.Road("Hillsboro Blvd", [(-192, 138), (-140, 146), (-60, 140), (0, 137), (60, 143), (140, 138), (192, 142)], hw=5.0, rank=8.5, flare=6)
ATLANTIC = rd.Road("Atlantic Ave", [(-192, -142), (-140, -134), (-60, -142), (0, -138), (60, -144), (140, -140), (192, -136)], hw=5.0, rank=8.5, flare=6)
def crossing(A_, B_):
    best = (1e9, None)
    for (ax, ay) in A_.d[::2]:
        for (bx, by) in B_.d[::2]:
            d_ = math.hypot(ax - bx, ay - by)
            if d_ < best[0]: best = (d_, ((ax + bx) / 2, (ay + by) / 2))
    return best[1]
CORNER_RINGS = []
for (A_, B_, nm) in ((LYONS, HILLS, "NW"), (SAMPLE, HILLS, "NE"), (LYONS, ATLANTIC, "SW"), (SAMPLE, ATLANTIC, "SE")):
    cx_, cy_ = crossing(A_, B_); CORNER_RINGS.append(rd.ring_road(f"Roundabout {nm}", cx_, cy_, 15.0, 4.5, rank=12, seam=math.pi * .25, flare=5.0, swo=0))
SKELETON = [LOOP, LYONS, SAMPLE, HILLS, ATLANTIC] + CORNER_RINGS
net = rd.build_network([PKWY, WILES, RING, WILES_E, ENTRY, LAKEVIEW, PLAZA_DR, PALM, CUL, SCHOOL_DR, CIVIC_DR, HERON, HERON_CT, PARK_DR] + SKELETON)
tick_('network')
# water, banks (flat meshes) + trails around the big lake
LAKES = {}
for k, c in LAKES_CTRL.items():
    ring, cen_ = rd.lake(RB, m, c); LAKES[k] = (ring, cen_)
    for q in rd.lake_colliders(ring, *cen_): COL.append(q)
    MAP.append([round(cen_[0], 1), round(cen_[1], 1), 0, 0, "#2d78b8", "poly", [[round(p[0], 1), round(p[1], 1)] for p in ring]])
def inside(poly, x, y, pad=0.0):
    c = False; n = len(poly)
    for i in range(n):
        a, b = poly[i], poly[(i + 1) % n]
        if (a[1] > y) != (b[1] > y) and x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]: c = not c
    if c: return True
    if pad:
        for p in poly:
            if math.hypot(p[0] - x, p[1] - y) < pad: return True
    return False
def trail_around(ring, cen, out=3.4):
    pts = []
    for p in ring[::2]:
        dx, dy = p[0] - cen[0], p[1] - cen[1]; l = math.hypot(dx, dy) or 1; pts.append((p[0] + dx / l * out, p[1] + dy / l * out))
    return rd.Road("trail", pts, hw=1.1, closed=True, rank=1, sw=(0, 0), mark=False, surf="walk", curbs=False, flare=0)
TRAIL = trail_around(*LAKES["windmill"]); TRAIL2 = trail_around(*LAKES["wiles"]); TRAIL.pieces = [(0.0, TRAIL.L, 0, 0, 0, 0)]; net += [TRAIL]
for r in net:
    rd.draw_road(RB, r, m)
    if r.island:
        rd.island_disc(RB, T, m, *r.island); ccir(r.island[0], r.island[1], r.island[2], "bush")
for r in (TRAIL2,): r.pieces = [(0.0, r.L, 0, 0, 0, 0)]; rd.draw_road(RB, r, m)
tick_('roads drawn')
# ---- what is free ground (props must not sit on roads, lots, buildings or water)
NOGO = []                                                                                                                # axis-aligned rectangles x0,y0,x1,y1
def free(x, y, pad=0.0, own=None):
    if abs(x) > EXT - 4 or abs(y) > EXT - 4: return False
    for q in net:
        if q is own or q.surf != "asphalt": continue
        if corridor_dist(q, x, y, cap=14) < pad: return False
    for k, (ring, _) in LAKES.items():
        if inside(ring, x, y, 2.5 + pad): return False
    for (x0, y0, x1, y1) in NOGO:
        if x0 - pad < x < x1 + pad and y0 - pad < y < y1 + pad: return False
    return True
CURB_SW = rd.CURB + rd.SWK
def along(road, off, spacing, start=None, end=None, pad=0.0):
    s = spacing / 2 if start is None else start; out = []; end = road.L if end is None else end
    while s < end:
        x, y, tx, ty = road.at(s); px, py = road.off(s, off)
        if not any(g0 - 2 < s < g1 + 2 for g0, g1 in road.gaps["K"]) and free(px, py, pad, own=road): out.append((px, py, tx, ty, s))
        s += spacing
    return out
def lamp_round(x, y, dx, dy, h=5.5):                                                                                     # pole + arm of two short cylinders + round head, leaning toward (dx, dy) (the road)
    pole = M("lamp_pole_g", "#27403a"); head = M("lamp_head", "#e8e8e0")
    T.cyl(pole, (x, y, h / 2), .09, h, "z", 8)
    for k, t in enumerate((.35, .8)): T.cyl(pole, (x + dx * t, y + dy * t, h - .1), .05, .25, "z", 6)
    T.cyl(head, (x + dx * 1.1, y + dy * 1.1, h - .05), .38, .12, "z", 8)

# ================================================================  DISTRICTS  ===========================================================
MAP.insert(0, [-EXT, -EXT, EXT, EXT, "#5d9a3a"])
# NE: shopping plaza + parking lot (axis-aligned rectangle, entered from Plaza Dr (aisle y=15) and Plaza Entry (x=58))
OY = 2.6
LX0, LX1, LY0, LY1 = 14, 66, 6.4 + OY, 39.0 + OY
T.box(m["conc"], LX0, LX1, 39.0 + OY, 42.0 + OY, 0, .12)
rows = [(6.8 + OY, 12.0 + OY), (18.0 + OY, 23.2 + OY), (23.2 + OY, 28.4 + OY), (34.4 + OY, 39.0 + OY)]
islands, stalls = parking_lot(T, m, LX0, LX1, LY0, LY1, rows, 15.0)
mapr(LX0, LY0, LX1, LY1, "#5a5c60"); mapr(LX0, 39 + OY, LX1, 42 + OY, "#a9a69c"); NOGO.append((LX0 - 2, LY0 - 2, LX1 + 2, 63))
for (ix, iy, iw, idp) in islands:
    cbox(ix, iy, iw, idp, soft="bush")
    if R_.random() < .4: prop("palm_medium", ix, iy, 1.0, col=False)
    else: prop("shrub_a", ix, iy, 1.0, col=False)
plaza = put(make_plaza("plaza", 44, 16, tower_x=10), 40, 50 + OY, 0, 0, 44.5, 17.5); mapr(18, 42 + OY, 62, 58 + OY, "#c9b48a")
for k in range(11):
    if k % 4 == 1: prop("palm_tall", 17 + k * 4.6, 40.6 + OY, 1.0)
for x in (24, 40, 56): lamp(T, x, 30.5 + OY, 1); lamp(T, x, 14.5 + OY, -1)
# NW: townhomes, pool + clubhouse, single-family homes laid out along the streets (house fronts face the road)
rowA = put(make_row("rowA", 5, 6.4, 10, 2, 3), -38, 44, 0, 0, 32, 10.2); rowB = put(make_row("rowB", 4, 6.4, 10, 2, 5), -35, 58, 0, 0, 25.6, 10.2)
mapr(-54, 39, -22, 49, "#b5603e"); mapr(-47.8, 53, -22.2, 63, "#b5603e"); NOGO += [(-56, 36, -20, 65)]
POOL = (-68.5, 47, -58, 57)
T.box(m["conc"], POOL[0], POOL[2], POOL[1], POOL[3], 0, .12); T.box(m["bank"], POOL[0] + 2.6, POOL[2] - 2.6, POOL[1] + 2.2, POOL[3] - 2.2, .12, .2); T.box(m["water"], POOL[0] + 3, POOL[2] - 3, POOL[1] + 2.6, POOL[3] - 2.6, .2, .24)
mapr(*POOL, "#a9a69c"); mapr(POOL[0] + 3, POOL[1] + 2.6, POOL[2] - 3, POOL[3] - 2.6, "#2d78b8"); cbox((POOL[0] + POOL[2]) / 2, (POOL[1] + POOL[3]) / 2, 8.6, 7.6); NOGO.append((POOL[0] - 2, POOL[1] - 2, POOL[2] + 2, POOL[3] + 2))
club = put(make_house("clubhouse", 14, 10, 1, "cream", 2, balcony=False, roof_h=3.2), -36, 85, 0, 0, 14.2, 10.2); mapr(-43, 80, -29, 90, "#b5603e"); NOGO.append((-45, 78, -27, 92))
for (x, y) in ((-65, 48.8), (-66.3, 53), (-62, 55)): ccir(x, y, .3, "pole"); T.cyl(M("umbrella_t", "#1f6b8a"), (x, y, 1.0), .05, 2.0, "z", 6); T.cyl(M("umbrella_c", "#2f9aa8"), (x, y, 2.15), 1.0, .25, "z", 8, r2=.12)
HOMES = []                                                                                                               # (x, y, rz, wall, w, d)
def home_along(road, s_, side, wall, w_=12.0, d_=9.0, gap=1.5):
    x, y, tx, ty = road.at(s_); off = side * (road.hw + rd.CURB + rd.SWK + gap + d_ / 2); px, py = road.off(s_, off)
    rz = math.degrees(math.atan2(ty, tx)) if side > 0 else math.degrees(math.atan2(-ty, -tx)); HOMES.append((round(px, 2), round(py, 2), round(rz, 1), wall, w_, d_))
def home_toward(cx, cy, dist, ang_deg, wall, w_=12.0, d_=9.0):                                                         # a house on a ring road, front facing the ring centre
    a = math.radians(ang_deg); px, py = cx + math.cos(a) * dist, cy + math.sin(a) * dist; rz = math.degrees(a) - 90
    HOMES.append((round(px, 2), round(py, 2), round(rz, 1), wall, w_, d_))
for (yy, wl) in ((47.5, "cream"), (61, "peach")):                                                          # west side of the Palm Lane north run
    sA = PALM.nearest(-80, yy)[1]; home_along(PALM, sA, 1, wl)
home_toward(-58, 72, 6 + 2.8 + rd.CURB + rd.SWK + 1.5 + 4.5, 90, "sand")                                                  # north of the cul-de-sac
home_toward(-58, 72, 6 + 2.8 + rd.CURB + rd.SWK + 1.5 + 6.0, 0, "white", 9.0, 12.0)                                        # east of the cul-de-sac
for k, (x, y, rz, wall, w_, d_) in enumerate(HOMES):
    put(make_house(f"home{k}", w_, d_, 2 if k % 2 else 1, wall, 10 + k, garage=True), x, y, 0, rz, w_ + .2, d_ + .2); NOGO.append((x - 7.5, y - 7.5, x + 7.5, y + 7.5))
    MAP.append([round(x - 5, 1), round(y - 5, 1), round(x + 5, 1), round(y + 5, 1), "#b5603e"])
# SW park: Windmill Lake with fountain, trail, gazebo
fx, fy = LAKES["windmill"][1]
F = Builder("fountain"); F.cyl(M("fount", "#e8f0f4"), (fx, fy, 1.2), .35, 2.4, "z", 8, r2=.12); F.cyl(M("fount_ring", "#d8e0e6"), (fx, fy, .2), 1.4, .3, "z", 10); STATIC.append(F.build())
# SE civic district: city hall + its lot, tennis courts, playground, school campus (building, bus row, lot, football field + track)
CM = civic.civic_mats()
def cbs(x, y, w, d, soft=None): cbox(x, y, w, d, 0, None, soft)
def ccs(x, y, r, soft=None): ccir(x, y, r, soft)
HALL = (39.5, -66)
hall = put(make_plaza("cityhall", 28, 14, 7.0, shops=(), tower_x=0, tower_sign="cityhall"), HALL[0], HALL[1], 0, 0, 28.6, 14.6, col=True); mapr(HALL[0] - 14, HALL[1] - 7, HALL[0] + 14, HALL[1] + 7, "#d8c9a0"); NOGO.append((23, -77, 56, -57))
Fp = Builder("flagpole"); Fp.cyl(M("flag_pole", "#d8d8d8"), (30, -74.8, 4.5), .07, 9, "z", 6); Fp.box(M("flag_red", "#c22a3a"), 30.1, 32.2, -74.85, -74.75, 7.4, 8.9); Fp.box(M("flag_blue", "#2a3a8a"), 30.1, 31.1, -74.85, -74.75, 8.1, 8.9); STATIC.append(Fp.build()); ccir(30, -74.8, .12, "pole")
T.box(m["conc"], 28, 52, -76.6, -73, 0, .12); mapr(28, -76.6, 52, -73, "#a9a69c")                                                          # forecourt in front of the hall
HL = (27, -95.2, 53, -77.2)
hall_rows = [(-95.2, -90.0), (-82.4, -77.2)]
hl_isl, hl_stalls = parking_lot(T, m, HL[0], HL[2], HL[1], HL[3], hall_rows, 28.0)
mapr(HL[0], HL[1], HL[2], HL[3], "#5a5c60"); NOGO.append((HL[0] - 2, HL[1] - 2, HL[2] + 2, HL[3] + 2))
for (ix, iy, iw, idp) in hl_isl:
    cbox(ix, iy, iw, idp, soft="bush"); prop("shrub_a" if R_.random() < .5 else "palm_small", ix, iy, 1.0, col=False)
COURTS = ((27.0, -35.0), (40.7, -35.0))
for (cx_, cy_) in COURTS:                                                                                                                        # two tennis courts
    civic.tennis_court(T, CM, cbs, cx_, cy_); NOGO.append((cx_ - 7.5, cy_ - 15, cx_ + 7.5, cy_ + 15)); mapr(cx_ - 6.5, cy_ - 14, cx_ + 6.5, cy_ + 14, "#3f7a52")
PLAY = (31.5, -54.2)
civic.playground(T, CM, cbs, ccs, PLAY[0], PLAY[1], 9, 7); NOGO.append((PLAY[0] - 5, PLAY[1] - 4, PLAY[0] + 5, PLAY[1] + 4)); mapr(PLAY[0] - 4.5, PLAY[1] - 3.5, PLAY[0] + 4.5, PLAY[1] + 3.5, "#b5503a")
for (x, y) in ((48, -40), (48, -30), (47, -24), (44, -54), (49, -55), (22, -52), (20, -48)): prop("shrub_b" if R_.random() < .5 else "shrub_a", x, y)           # flower beds
SB = (84, -29)
sch = put(make_house("school", 24, 10, 2, "butter", 21, garage=False, balcony=False, roof_h=3.0, windows=True), SB[0], SB[1], 0, 0, 24.4, 10.4); mapr(SB[0] - 12, SB[1] - 5, SB[0] + 12, SB[1] + 5, "#b5603e"); NOGO.append((70, -36, 98, -22))
SL = (72, -51.5, 96, -35)
sch_rows = [(-51.5, -46.3), (-40.2, -35.0)]
sc_isl, sc_stalls = parking_lot(T, m, SL[0], SL[2], SL[1], SL[3], sch_rows, 73.0)
mapr(SL[0], SL[1], SL[2], SL[3], "#5a5c60"); NOGO.append((SL[0] - 2, SL[1] - 2, SL[2] + 2, SL[3] + 2))
for (ix, iy, iw, idp) in sc_isl:
    cbox(ix, iy, iw, idp, soft="bush"); prop("shrub_a", ix, iy, 1.0, col=False)
BUS = civic.make_bus("bus_template"); BUS.hide_render = True; BUS.location = (0, 0, -60)
BUSES = [(79.0, -48.9), (90.5, -48.9)]
for k_, (bx_, by_) in enumerate(BUSES):                                                                                                          # school buses (static scenery) in the south row of the lot
    bo = bpy.data.objects.new(f"bus{k_}", BUS.data); bpy.context.scene.collection.objects.link(bo); bo.location = (bx_, by_, 0); bo.rotation_euler = (0, 0, math.radians(90)); STATIC.append(bo); cbox(bx_, by_, 10.4, 2.7, 0)
sch_stalls = [p for p in sc_stalls if not (p[1] < -44.5)]
fx_, fy_ = 84.2, -74.5; civic.field(T, CM, fx_, fy_, 14, 30, bleachers=False)
TRACK = rd.Road("track", [(fx_ + 10, fy_ - 10), (fx_ + 10, fy_ + 10), (fx_ + 7.5, fy_ + 16.8), (fx_, fy_ + 18.5), (fx_ - 7.5, fy_ + 16.8), (fx_ - 10, fy_ + 10), (fx_ - 10, fy_ - 10), (fx_ - 7.5, fy_ - 16.8), (fx_, fy_ - 18.5), (fx_ + 7.5, fy_ - 16.8)], hw=2.4, closed=True, rank=1, sw=(0, 0), mark=False, surf="track", curbs=False, flare=0)
m["track"] = CM["track"]; TRACK.pieces = [(0.0, TRACK.L, 0, 0, 0, 0)]; net.append(TRACK); rd.draw_road(RB, TRACK, m); NOGO.append((fx_ - 14, fy_ - 22, fx_ + 14, fy_ + 22)); mapr(fx_ - 12.4, fy_ - 20.9, fx_ + 12.4, fy_ + 20.9, "#b3503c"); mapr(fx_ - 7, fy_ - 15, fx_ + 7, fy_ + 15, "#4c9a45")

# ---- layout critic: every footprint must stay off road corridors (asphalt + curb + sidewalk of the DRAWN pieces), lakes, the world edge and each other; connector roads may touch their own lot
_PP = {}
def piece_polys(road):
    if road.name not in _PP:
        polys = []
        for (s0, s1, f0, f1, e0, e1) in road.pieces:
            a_, b_ = (s0 if road.closed else max(0.0, s0 - e0)), (s1 if road.closed else min(road.L, s1 + e1)); n_ = max(2, int((b_ - a_) / 1.5)); polys.append([road.at(a_ + (b_ - a_) * i / n_)[:2] for i in range(n_ + 1)])
        _PP[road.name] = polys
    return _PP[road.name]
_GRID = {}
def corridor_dist(road, x, y, cap=45.0):
    g = _GRID.get(road.name)
    if g is None:
        cells = {}; segs = []
        for pl in piece_polys(road):
            for i in range(len(pl) - 1):
                segs.append((pl[i][0], pl[i][1], pl[i + 1][0], pl[i + 1][1])); idx = len(segs) - 1
                for (px_, py_) in (pl[i], pl[i + 1]): cells.setdefault((int(px_ // 16), int(py_ // 16)), set()).add(idx)
        g = _GRID[road.name] = (cells, segs)
    cells, segs = g; rr_ = int(cap // 16) + 1; cx_, cy_ = int(x // 16), int(y // 16); best = 1e9; seen = set()
    for i in range(cx_ - rr_, cx_ + rr_ + 1):
        for j in range(cy_ - rr_, cy_ + rr_ + 1):
            for idx in cells.get((i, j), ()):
                if idx in seen: continue
                seen.add(idx); ax, ay, bx, by = segs[idx]; dx, dy = bx - ax, by - ay; l2 = dx * dx + dy * dy or 1; t = max(0, min(1, ((x - ax) * dx + (y - ay) * dy) / l2)); best = min(best, math.hypot(x - ax - dx * t, y - ay - dy * t))
    return (best if best < 1e9 else 1e3) - (road.hw + rd.CURB + rd.SWK)
FOOTREG = []                                                                                                                      # footprints added by try_place (same tuple format as footprints())
def footprints():
    R = lambda nm, x0, y0, x1, y1, allow=(): (nm, (x0 + x1) / 2, (y0 + y1) / 2, x1 - x0, y1 - y0, 0.0, allow)
    F = [R("plaza lot", LX0, LY0, LX1, LY1, ("Plaza Dr", "Plaza Entry")), R("plaza building", 18, 42 + OY, 62, 58 + OY), R("townhomes A", -54, 39, -22, 49), R("townhomes B", -47.8, 53, -22.2, 63), R("pool deck", *POOL),
         R("clubhouse", -43, 80, -29, 90), R("city hall", HALL[0] - 14.3, HALL[1] - 7.3, HALL[0] + 14.3, HALL[1] + 7.3), R("hall lot", *HL, ("Civic Dr",))]
    for k_, (cx_, cy_) in enumerate(COURTS): F.append(R(f"court {k_ + 1}", cx_ - 6.8, cy_ - 14.3, cx_ + 6.8, cy_ + 14.3))
    F += [R("playground", PLAY[0] - 4.5, PLAY[1] - 3.5, PLAY[0] + 4.5, PLAY[1] + 3.5), R("school", SB[0] - 12.2, SB[1] - 5.2, SB[0] + 12.2, SB[1] + 5.2), R("school lot", *SL, ("School Dr",)), R("sports field + track", fx_ - 12.4, fy_ - 20.9, fx_ + 12.4, fy_ + 20.9)]
    for k_, (x, y, rz, wall, w_, d_) in enumerate(HOMES): F.append((f"home {k_}", x, y, w_, d_, rz, ()))
    return F + FOOTREG
def local_pts(f, step=1.0):
    nm, cx, cy, w, d, rz, _ = f; c_, s_ = math.cos(math.radians(rz)), math.sin(math.radians(rz)); out = []
    for i in range(max(2, int(w / step)) + 1):
        for j in range(max(2, int(d / step)) + 1):
            u, v = -w / 2 + w * i / max(2, int(w / step)), -d / 2 + d * j / max(2, int(d / step)); out.append((cx + u * c_ - v * s_, cy + u * s_ + v * c_))
    return out
def in_rect(f, x, y):
    nm, cx, cy, w, d, rz, _ = f; c_, s_ = math.cos(math.radians(rz)), math.sin(math.radians(rz)); u, v = (x - cx) * c_ + (y - cy) * s_, -(x - cx) * s_ + (y - cy) * c_
    return abs(u) <= w / 2 and abs(v) <= d / 2
def trail_dist(x, y):
    best = 1e9
    for tr in (TRAIL, TRAIL2):
        for pl in piece_polys(tr):
            for i in range(len(pl) - 1):
                ax, ay = pl[i]; bx, by = pl[i + 1]; dx, dy = bx - ax, by - ay; l2 = dx * dx + dy * dy or 1; t = max(0, min(1, ((x - ax) * dx + (y - ay) * dy) / l2)); best = min(best, math.hypot(x - ax - dx * t, y - ay - dy * t))
    return best
TRAIL_C = [(sum(p[0] for p in tr.d) / len(tr.d), sum(p[1] for p in tr.d) / len(tr.d), max(math.hypot(p[0] - sum(q[0] for q in tr.d) / len(tr.d), p[1] - sum(q[1] for q in tr.d) / len(tr.d)) for p in tr.d) + 2) for tr in (TRAIL, TRAIL2)]
_LAKE_R = {}
def lake_info(lk):
    if lk not in _LAKE_R:
        ring, c_ = LAKES[lk]; _LAKE_R[lk] = (c_[0], c_[1], max(math.hypot(p[0] - c_[0], p[1] - c_[1]) for p in ring) + 3.0)
    return _LAKE_R[lk]
def fp_problems(f, others, clearance=0.0):
    """Everything wrong with footprint f (name, cx, cy, w, d, rz, allow): roads, lakes, trails, world edge, other footprints."""
    nm, cx, cy, w, d, rz, allow = f; ff = (nm, cx, cy, w + 2 * clearance, d + 2 * clearance, rz, allow); rf = math.hypot(ff[3], ff[4]) / 2; bad = []
    if abs(cx) + rf > EXT - 3 or abs(cy) + rf > EXT - 3:
        pts0 = local_pts(ff, 2.0)
        if min(p[0] for p in pts0) < -EXT + 3 or min(p[1] for p in pts0) < -EXT + 3 or max(p[0] for p in pts0) > EXT - 3 or max(p[1] for p in pts0) > EXT - 3: bad.append(f"{nm} is on the world edge wall")
    pts = local_pts(ff, 1.2)
    for r in net:
        if r.surf != "asphalt" or r.name in allow: continue
        if corridor_dist(r, cx, cy, cap=rf + 10) > rf + 1.0: continue
        worst = min(corridor_dist(r, x, y, cap=8) for (x, y) in pts)
        if worst < -.05: bad.append(f"{nm} overlaps the corridor of {r.name} by {-worst:.1f} m")
    for lk, (ring, _) in LAKES.items():
        lx, ly, lr = lake_info(lk)
        if math.hypot(cx - lx, cy - ly) > lr + rf: continue
        if any(inside(ring, x, y, 1.3) for (x, y) in pts): bad.append(f"{nm} sits in lake {lk}")
    if any(math.hypot(cx - tr_c[0], cy - tr_c[1]) < tr_c[2] + rf for tr_c in TRAIL_C) and any(trail_dist(x, y) < 1.1 for (x, y) in pts): bad.append(f"{nm} sits on a lake trail")
    for o in others:
        if o is f: continue
        if math.hypot(cx - o[1], cy - o[2]) > rf + math.hypot(o[3], o[4]) / 2: continue
        if any(in_rect(o, x, y) for (x, y) in local_pts(ff, .8)) or any(in_rect(ff, x, y) for (x, y) in local_pts(o, .8)): bad.append(f"{nm} overlaps {o[0]}")
    return bad
def check_layout():
    F = footprints(); bad = []
    for f in F: bad += fp_problems(f, [])
    for i in range(len(F)):
        for j in range(i + 1, len(F)):
            if any(in_rect(F[j], x, y) for (x, y) in local_pts(F[i], .8)) or any(in_rect(F[i], x, y) for (x, y) in local_pts(F[j], .8)): bad.append(f"{F[i][0]} overlaps {F[j][0]}")
    for lk, (ring, _) in LAKES.items():                                                                                              # lake shores and trails against road corridors
        for r in net:
            if r.surf != "asphalt": continue
            worst = min(corridor_dist(r, x, y, cap=8) for (x, y) in ring)
            if worst < 1.3: bad.append(f"lake {lk} shore is within {worst:.1f} m of the corridor of {r.name} (needs 1.3 m of bank)")
    for tr in (TRAIL, TRAIL2):
        pts_ = [tr.at(i * tr.L / 80)[:2] for i in range(80)]
        for r in net:
            if r.surf != "asphalt": continue
            worst = min(corridor_dist(r, x, y, cap=8) for (x, y) in pts_)
            if worst < 1.1: bad.append(f"a lake trail overlaps the corridor of {r.name} by {1.1 - worst:.1f} m")
    print("LAYOUT", "OK" if not bad else "PROBLEMS"); [print("  -", b) for b in bad]
    return bad
# ================================================================  DISTRICT BUILD-OUT (try-fit placement: only what passes the layout critic is built)  ===================
def near_road(x, y, maxd):
    return any(corridor_dist(r, x, y, cap=maxd + 14) < maxd for r in net if r.surf == "asphalt")
def road_facing_rz(x, y):                                                                                                  # rz that turns a house front (-y) toward the nearest street
    best = None
    for r in net:
        if r.surf != "asphalt": continue
        d_, s_ = r.nearest(x, y)
        if best is None or d_ < best[0]: best = (d_, r.at(s_)[:2])
    dx, dy = best[1][0] - x, best[1][1] - y; l = math.hypot(dx, dy) or 1; return math.degrees(math.atan2(dx / l, -dy / l))
PLACED = {}
def try_place(kind, maker, x, y, rz, w, d, clearance=1.2, near=None, allow=(), collide=True, tag=None):
    f = (f"{kind}{PLACED.get(kind, 0)}", round(x, 2), round(y, 2), w, d, rz, allow)
    if near is not None and not near_road(x, y, near): return None
    pr_ = fp_problems(f, footprints(), clearance)
    if pr_:
        if os.environ.get('DEBUGPLACE'): print('SKIP', pr_[:2])
        return None
    o = maker(f[0]); put(o, x, y, 0, rz, (w + .2) if collide else None, (d + .2) if collide else None, col=collide); FOOTREG.append(f); PLACED[kind] = PLACED.get(kind, 0) + 1
    NOGO.append((x - max(w, d) / 2 - .5, y - max(w, d) / 2 - .5, x + max(w, d) / 2 + .5, y + max(w, d) / 2 + .5)); MAP.append([round(x - w / 2, 1), round(y - d / 2, 1), round(x + w / 2, 1), round(y + d / 2, 1), "#b5603e"]); return o
WALLS = ["cream", "peach", "butter", "sand", "white"]
def row_along(road, side, s0, s1, step, kind, make, w, d, gap=1.5, near=60, clear=1.2):
    n = 0; s_ = s0
    while s_ < s1:
        x, y, tx, ty = road.at(s_); off = side * (road.hw + rd.CURB + rd.SWK + gap + d / 2); px, py = road.off(s_, off)
        rz = math.degrees(math.atan2(ty, tx)) if side > 0 else math.degrees(math.atan2(-ty, -tx))
        if try_place(kind, lambda nm, n=n: make(nm, n), px, py, rz, w, d, clear, near=near): n += 1
        s_ += step
    return n
def home_maker(nm, n): return make_house(nm, 12, 9, 2 if n % 2 else 1, WALLS[(n * 2 + 1) % 5], 30 + n, garage=True)
def apt_maker(nm, n): return make_house(nm, 22, 11, 3, WALLS[(n + 3) % 5], 60 + n, garage=False, balcony=True, roof_h=3.4)
def row_maker(nm, n): return make_row(nm, 4, 6.4, 10, 2, 40 + n)
# -- north subdivision along Heron Way and Heron Ct
for side, cl_ in ((1, .5), (-1, 2.6)): row_along(HERON, side, 6, HERON.L - 4, 13.5, "nhome", home_maker, 12, 9, gap=1.6, clear=cl_)
for k_, ang in enumerate((-90, 0, 180, 90)):                                                                               # homes around the Heron Ct bulb, fronts toward the island
    a_ = math.radians(ang); dist = 6 + 2.8 + rd.CURB + rd.SWK + 2.0 + 4.5; px, py = 84 + math.cos(a_) * dist, 78.5 + math.sin(a_) * dist
    try_place("ctrhome", lambda nm, k_=k_: home_maker(nm, k_ + 5), px, py, math.degrees(a_) - 90, 12, 9, 0.4)
# -- east: gas station + apartments along Wiles Rd E, apartments where the street grid allows
gas_done = False
for gx_ in range(68, 90, 2):
    if gas_done: break
    for gy_ in range(2, 14, 2):
        if try_place("gas", lambda nm: civic.gas_station(nm), gx_ + 9.5, gy_ + 9.5, 0, 18, 19, 1.0, near=16, collide=False):
            fx0, fy0 = gx_ + 9.5, gy_ + 9.5; cbox(fx0, fy0 + 6, 9.4, 6.4); [ccir(fx0 + sx_, fy0 + sy_, .2) for sx_ in (-4.8, 4.8) for sy_ in (-5.4, -.3)]; gas_done = True
            sq = WILES_E.nearest(fx0, fy0 - 9.5)[1]; ex_, ey_ = WILES_E.off(sq, WILES_E.hw + .1); T.box(m["asphalt"], fx0 - 3.6, fx0 + 3.6, min(ey_, fy0 - 9.4) - 0.2, fy0 - 9.4, 0, .16)       # driveway apron to the street
            break
row_along(WILES_E, 1, 8, WILES_E.L - 2, 24.0, "apt", apt_maker, 22, 11, gap=2.5, clear=1.0)
row_along(HERON, -1, 6, HERON.L - 4, 25.0, "apt", apt_maker, 22, 11, gap=3.0, clear=1.0)
for ya in range(4, 40, 6):                                                                                                  # apartments in the east strip, facing the nearest street
    for xa in range(70, 92, 6):
        if PLACED.get("apt", 0) >= 2: break
        try_place("apt", lambda nm, n=len(FOOTREG): apt_maker(nm, n), xa, ya, road_facing_rz(xa, ya), 22, 11, 2.0, near=24)
for xa in range(-92, -18, 12):                                                                                             # townhome rows in the north-west, facing the nearest street
    for ya in range(66, 96, 10):
        if PLACED.get("trow", 0) >= 4: break
        try_place("trow", lambda nm, n=len(FOOTREG): row_maker(nm, n), xa, ya, road_facing_rz(xa, ya), 25.6, 10.2, 2.0, near=24)
def fill(kind, maker, w, d, count, near, clear, excl=(), step=7, seed=5):                                                  # try grid spots over the whole map (shuffled), fronts toward the nearest street
    rr_ = random.Random(seed); cand = [(x, y) for x in range(-92, 93, step) for y in range(-92, 93, step)]; rr_.shuffle(cand)
    for (x, y) in cand:
        if PLACED.get(kind, 0) >= count: break
        if any(x0 <= x <= x1 and y0 <= y <= y1 for (x0, y0, x1, y1) in excl): continue
        try_place(kind, lambda nm, n=len(FOOTREG): maker(nm, n), x, y, road_facing_rz(x, y), w, d, clear, near=near)
PARKBOX = (-98, -98, -12, -26)
fill("apt", apt_maker, 22, 11, 4, 12, 2.0, excl=(PARKBOX,))                                                               # apartments close to a street
fill("fhome", home_maker, 12, 9, 12, 9, 1.5, excl=(PARKBOX,), step=6, seed=9)                                              # single-family fillers in leftover frontage
# -- south-west lakeside park: Park Dr + lot, pavilions, courts, picnic tables
PLOT = (-66, -95.2, -44, -79)
plot_rows = [(-95.2, -90.0), (-84.2, -79.0)]
pl_isl, pl_stalls = parking_lot(T, m, PLOT[0], PLOT[2], PLOT[1], PLOT[3], plot_rows, -65.0); mapr(*PLOT, "#5a5c60"); NOGO.append((PLOT[0] - 2, PLOT[1] - 2, PLOT[2] + 2, PLOT[3] + 2))
FOOTREG.append(("park lot", (PLOT[0] + PLOT[2]) / 2, (PLOT[1] + PLOT[3]) / 2, PLOT[2] - PLOT[0], PLOT[3] - PLOT[1], 0.0, ("Park Dr",)))
for (ix, iy, iw, idp) in pl_isl: cbox(ix, iy, iw, idp, soft="bush"); prop("shrub_a", ix, iy, 1.0, col=False)
def small_maker(fn): return lambda nm: fn(nm)
def add_static(builder_fn, x, y, w, d, kind, clearance=1.0):
    f = (f"{kind}{PLACED.get(kind, 0)}", x, y, w, d, 0.0, ())
    if fp_problems(f, footprints(), clearance): return False
    B_ = Builder(f[0]); builder_fn(B_); STATIC.append(B_.build()); FOOTREG.append(f); PLACED[kind] = PLACED.get(kind, 0) + 1; NOGO.append((x - w / 2 - .5, y - d / 2 - .5, x + w / 2 + .5, y + d / 2 + .5)); mapr(x - w / 2, y - d / 2, x + w / 2, y + d / 2, "#7aa05a"); return True
rr = random.Random(21); PARK_BOX = (-96, -96, -14, -28)
for _ in range(60):
    x, y = rr.uniform(PARK_BOX[0] + 9, PARK_BOX[2] - 9), rr.uniform(PARK_BOX[1] + 7, PARK_BOX[3] - 7)
    if PLACED.get("court", 0) < 1 and near_road(x, y, 40) and add_static(lambda B_, x=x, y=y: civic.basketball(B_, CM, cbs, x, y), x, y, 16, 10, "court", 2.0): continue
    if PLACED.get("pavilion", 0) < 3 and add_static(lambda B_, x=x, y=y: civic.pavilion(B_, CM, cbs, ccs, x, y), x, y, 7, 7, "pavilion", 2.0): continue
for (tr, side_) in ((TRAIL, 1), (TRAIL, -1), (TRAIL2, 1)):                                                                 # picnic tables beside the trails
    for i in range(0, 80, 9):
        x, y, tx, ty = tr.at(i * tr.L / 80); px, py = x - ty * side_ * 3.3, y + tx * side_ * 3.3
        add_static(lambda B_, px=px, py=py: civic.picnic(B_, CM, cbs, px, py), px, py, 2.4, 2.6, "picnic", .6)

tick_('districts')
# ================================================================  STREET FURNITURE & VEGETATION  =========================================
sx_ = CURB_SW + 1.5
for (x, y, tx, ty, s) in along(PKWY, 0, 21, 10):                                                                         # a few median palms, soft shrub beds between
    prop("palm_medium", x, y, 1.0)
for (x, y, tx, ty, s) in along(PKWY, 0, 7, 3.5):
    if (s - 10) % 21 > 2.5 and (s - 10) % 21 < 18.5: prop("shrub_a" if int(s) % 2 else "shrub_b", x, y, .9)
for side, ph in ((1, 0), (-1, 9)):                                                                                       # verge palms ~18 m apart, staggered between the two sides
    for (x, y, tx, ty, s) in along(PKWY, side * (PKWY.hw + sx_), 18, 6 + ph): prop("palm_tall" if int(s / 9) % 2 else "palm_medium", x, y, 1.0)
    for (x, y, tx, ty, s) in along(PKWY, side * (PKWY.hw + CURB_SW - .6), 38, 12 + ph * 2): lamp_round(x, y, -ty * -side * 1.0, tx * -side * 1.0 if False else tx * 0, 5.5) if False else lamp_round(x, y, ty * side, -tx * side, 5.5)
for road, sp in ((WILES, 22), (WILES_E, 22), (LAKEVIEW, 19), (PALM, 17)):
    for side, ph in ((1, 0), (-1, 9)):
        for (x, y, tx, ty, s) in along(road, side * (road.hw + sx_), sp, 5 + ph): prop("palm_medium" if int(s) % 2 else "palm_tall", x, y, 1.0)
    for side in (1, -1):
        for (x, y, tx, ty, s) in along(road, side * (road.hw + CURB_SW - .6), 40, 10 if side > 0 else 30): lamp_round(x, y, ty * side, -tx * side, 5.0)
# signals at the Pkwy x Wiles junction + street name signs
for j in PKWY.junctions:
    if j["child"] is WILES:
        px, py = j["p"]; ta = PKWY.at(j["sA"]); nx_, ny_ = -ta[3], ta[2]
        for a in (-1, 1):
            for b in (-1, 1):
                x = px + ta[2] * 0 + ta[2] * a * (j["w"] + .5) + nx_ * b * (PKWY.hw + .9); y = py + ta[3] * a * (j["w"] + .5) + ny_ * b * (PKWY.hw + .9)
                dx, dy = -nx_ * b, -ny_ * b
                ad = (round(dx) or 0, round(dy) or 0) if abs(dx) > .5 or abs(dy) > .5 else (0, -b)
                if abs(dx) >= abs(dy): ad = (1 if dx > 0 else -1, 0)
                else: ad = (0, 1 if dy > 0 else -1)
                signal(T, x, y, ad); ccir(x, y, .14, "pole")
        sign_pole(T, px + 11.0, py + 11.4 + 0 if False else py + 12.0, "pkwy", 3.2); sign_pole(T, px - 12.0, py - 12.5, "pkwy", 3.2); sign_pole(T, px + 12.0, py - 8.5, "wiles", 2.2); sign_pole(T, px - 12.5, py + 8.5, "wiles", 2.2)
        for dx_, dy_ in ((11.0, 12.0), (-12.0, -12.5), (12.0, -8.5), (-12.5, 8.5)): ccir(px + dx_, py + dy_, .1, "pole")
# ---- perimeter: sound wall + tree belt outside the loop, street trees and lamps on the arterials
WALL_M = M("sound_wall", "#d9cdb4", rough=.9)
wall_o1 = -(LOOP.hw + rd.CURB + .8); wall_o0 = wall_o1 - 1.0
rd.strip(RB, WALL_M, LOOP, 0.0, LOOP.L, wall_o0, wall_o1, 3.4, gaps=(), solid=0.0)
s_ = 0.0
while s_ < LOOP.L:                                                                                                                  # hard colliders along the wall, one box per ~6 m
    x_, y_, tx_, ty_ = LOOP.at(s_ + 3.0); px_, py_ = LOOP.off(s_ + 3.0, (wall_o0 + wall_o1) / 2); cbox(px_, py_, 6.4, 1.2, round(math.degrees(math.atan2(ty_, tx_)), 1)); s_ += 6.0
s_ = 0.0; kk_ = 0
while s_ < LOOP.L:                                                                                                                  # tree belt: a row of oaks and palms close to the wall, a second row of oaks behind
    px_, py_ = LOOP.off(s_, wall_o0 - 4.0 + R_.uniform(-1, 1)); prop("oak" if kk_ % 3 else "palm_medium", px_, py_, R_.uniform(1.0, 1.3), col=False)
    if kk_ % 2 == 0: px_, py_ = LOOP.off(s_ + 3.0, wall_o0 - 11.0 + R_.uniform(-2, 2)); prop("oak", px_, py_, R_.uniform(1.1, 1.4), col=False)
    s_ += 7.0; kk_ += 1
for road_ in (LOOP, LYONS, SAMPLE, HILLS, ATLANTIC):
    sides_ = (1,) if road_ is LOOP else (1, -1)                                                                                     # the loop has its sidewalk on the inner (left) side only
    for side_ in sides_:
        for (x, y, tx, ty, s__) in along(road_, side_ * (road_.hw + CURB_SW + 1.6), 26, 6 + (13 if side_ < 0 else 0)): prop("palm_tall" if int(s__ / 26) % 2 else "oak", x, y, 1.0 if True else None)
        for (x, y, tx, ty, s__) in along(road_, side_ * (road_.hw + CURB_SW - .6), 42, 10 + (21 if side_ < 0 else 0)): lamp_round(x, y, ty * side_, -tx * side_, 5.5)
# scattered trees/shrubs fill the lawns (oaks, shrubs; palms kept rare)
def scatter(kind, n, x0, y0, x1, y1, pad=3.0, gap=9.0, shrub_too=True):
    placed = []; tries = 0
    while len(placed) < n and tries < n * 40:
        tries += 1; x, y = R_.uniform(x0, x1), R_.uniform(y0, y1)
        if not free(x, y, pad) or any(math.hypot(x - a, y - b) < gap for a, b in placed): continue
        placed.append((x, y)); prop(kind, x, y, R_.uniform(1.0, 1.25) if kind == "oak" else 1.0)
        if shrub_too and R_.random() < .6: prop("shrub_a" if R_.random() < .5 else "shrub_b", x + R_.uniform(-2, 2), y + R_.uniform(-2, 2))
scatter("oak", 14, -98, -98, -12, -14); scatter("oak", 9, 14, -98, 56, -56); scatter("oak", 8, 66, -34, 98, -12); scatter("oak", 8, 66, 56, 98, 98); scatter("oak", 8, -12, 66, 62, 98)
scatter("palm_medium", 6, -98, -98, -12, -14, gap=14, shrub_too=False); scatter("palm_tall", 4, 66, -34, 98, 98, gap=14, shrub_too=False); scatter("oak", 8, -98, 20, -12, 36, pad=2.5)
for (x, y) in ((-33, 36.2), (-43, 36.2), (-24, 36.2), (-33, 69.8), (-44, 69.8)): prop("shrub_a" if R_.random() < .5 else "shrub_b", x, y)
hedge(-56, 36.2, -48, 36.2); hedge(-26, 36.2, -20, 36.2)
tick_('furniture')
# ================================================================  CARS  ===================================================================
def addcar(kind, color, name, x, y, rz=0):
    root = make_car(kind, color, name); root.location = (x, y, .03); root.rotation_euler = (0, 0, math.radians(rz)); CARS.append({"name": name, "kind": kind, "color": color, "x": round(x, 2), "y": round(y, 2), "rz": round(rz, 1)}); return root
def pose(road, off, s, rev=False):
    x, y, tx, ty = road.at(s); px, py = road.off(s, off); a = math.degrees(math.atan2(-tx, ty)) + (180 if rev else 0); return px, py, a
LANE = (PKWY.mh + (PKWY.hw - PKWY.mh) * .27)
ps = PKWY.nearest(1.5, -24)[1]; px_, py_, pa = pose(PKWY, -LANE, ps); addcar("sedan", "#c8201c", "player", px_, py_, pa); START = {"x": round(px_, 2), "y": round(py_, 2), "rz": round(pa, 1)}
def route(road, off, rev=False, s0=0.0, s1=None):
    return [[round(a, 2), round(b, 2)] for a, b in rd.lane_path(road, off, rev, s0=s0, s1=s1)]
def uturn_loop(road, off, s0, s1):                                                                                       # out along the right lane, a half-circle at the end, back along the other lane, half-circle at the start
    out = rd.lane_path(road, -off, False, s0=s0, s1=s1); back = rd.lane_path(road, off, True, s0=s0, s1=s1)
    def cap(a, b, ax):
        mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2; r = math.dist(a, b) / 2; base = math.atan2(a[1] - my, a[0] - mx); return [(mx + r * math.cos(base + k * math.pi / 6 * ax), my + r * math.sin(base + k * math.pi / 6 * ax)) for k in range(1, 6)]
    return [[round(p[0], 2), round(p[1], 2)] for p in out + cap(out[-1], back[0], -1 if False else 1) + back + cap(back[-1], out[0], 1)]
TRAFFIC = [
    {"name": "traffic0", "path": route(PKWY, -LANE), "speed": 9, "s0": 40, "kind": "sedan", "color": "#2e5fa3"},
    {"name": "traffic1", "path": route(PKWY, LANE, True), "speed": 8, "s0": 40, "kind": "sedan", "color": "#e6e6e2"},
    {"name": "traffic2", "path": route(WILES, -1.75), "speed": 7.5, "s0": 30, "kind": "taxi", "color": "#f2b61c"},
    {"name": "traffic3", "path": route(WILES, 1.75, True), "speed": 7, "s0": 30, "kind": "sedan", "color": "#9aa0a8"},
    {"name": "traffic4", "path": uturn_loop(PALM, 1.75, 0, PALM.L - 8), "speed": 6, "s0": 20, "closed": True, "kind": "sedan", "color": "#3d7a52"},
    {"name": "traffic6", "path": uturn_loop(HERON, 1.75, 0, HERON.L - 8), "speed": 6.5, "s0": 10, "closed": True, "kind": "sedan", "color": "#7a3a2a"},
    {"name": "traffic5", "path": [[round(RING.off(s, -2.0)[0], 2), round(RING.off(s, -2.0)[1], 2)] for s in [k * RING.L / 48 for k in range(48)]][::-1] if False else [[round(RING.off(s, 2.0)[0], 2), round(RING.off(s, 2.0)[1], 2)] for s in [k * RING.L / 48 for k in range(48)]], "speed": 5.5, "s0": 0, "closed": True, "kind": "sedan", "color": "#d8b04a"},
]
for t in TRAFFIC:
    p0 = t["path"][0]; addcar(t["kind"], t["color"], t["name"], p0[0], p0[1], 0)
PAL = ["#e6e6e2", "#2b2d33", "#9aa0a8", "#2e5fa3", "#c8201c", "#3d7a52", "#d8b04a", "#7a3a2a"]
k = 0
for (stl, aisle_y, prob) in ((stalls, 15.0 + OY, .30), (hl_stalls, -86.2, .35), (sch_stalls, -43.25, .45), (pl_stalls, -87.1, .25)):
    for (sx_s, sy_s) in stl:
        if R_.random() < prob:
            rz = (0 if sy_s < 15 + OY or 23.2 + OY <= sy_s < 28.4 + OY else 180) if stl is stalls else (0 if sy_s < aisle_y else 180)
            addcar("sedan", R_.choice(PAL), f"parked{k}", sx_s, sy_s, rz); cbox(sx_s, sy_s, 1.8, 4.5, rz); COL[-1]["car"] = f"parked{k}"; k += 1
# ================================================================  WORLD EDGE + DATA  =======================================================
for (x, y, w, d) in ((0, EXT - .5, 2 * EXT, 3), (0, -EXT + .5, 2 * EXT, 3), (EXT - .5, 0, 3, 2 * EXT), (-EXT + .5, 0, 3, 2 * EXT)): cbox(x, y, w, d)
T.cyl(M("shadow_dummy", "#000000"), (0, 0, -5), .01, .01, "z", 3); terr = T.build(vc=True); STATIC.append(terr); STATIC.extend(RB.build(vc=True, recalc=False))
def sidewalk_path(road, side): return [[round(a, 2), round(b, 2)] for a, b in rd.lane_path(road, side * (road.hw + rd.CURB + 1.2))]
WALK = [{"path": sidewalk_path(PKWY, 1)}, {"path": sidewalk_path(PKWY, -1)}, {"path": sidewalk_path(WILES, 1)}, {"path": sidewalk_path(WILES, -1)}, {"path": sidewalk_path(PALM, 1)}, {"path": sidewalk_path(PALM, -1)},
        {"path": [[15, 40.4 + OY], [65, 40.4 + OY]]}, {"path": [[round(a, 2), round(b, 2)] for a, b in rd.lane_path(TRAIL, 0)], "closed": True}, {"path": sidewalk_path(LAKEVIEW, 1)}, {"path": sidewalk_path(HERON, 1)}, {"path": sidewalk_path(HERON, -1)}, {"path": sidewalk_path(PARK_DR, 1)}]
ROADLINES = [{"pts": [[round(a, 1), round(b, 1)] for a, b in rd.lane_path(r, 0, step=6, s0=p[0], s1=p[1])], "w": round(2 * r.hw, 1), "closed": r.closed} for r in net if r.surf == "asphalt" for p in r.pieces]
WORLD = {"name": "coconut", "title": "Coconut Creek", "glb": "scene.glb", "extent": EXT - 4, "sky": "#8fc3f5", "fog": ["#c4dcf2", 110, 320], "hemi": ["#cfe4ff", "#6f8a4a", 1.55], "sun": {"color": "#fff0d6", "intensity": 3.7, "dir": [-0.5, -0.74, 0.45]},
         "exposure": 1.0, "tone": "AgX", "lamps": [], "ground": "#5d9a3a", "start": START, "money": 1250, "traffic": TRAFFIC, "walk": WALK, "walkers": 16, "fight": {"x": 24, "y": 40.4 + OY}, "demo": None,
         "views": {"drive": {"label": "Play", "mode": "drive", "pitch": 45, "dist": 44}, "plaza": {"label": "Plaza", "tx": 38, "ty": 32, "pitch": 48, "dist": 34}, "homes": {"label": "Homes", "tx": -62, "ty": 62, "pitch": 48, "dist": 40},
                   "park": {"label": "Park", "tx": -45, "ty": -42, "pitch": 48, "dist": 46}, "over": {"label": "Overview", "tx": 0, "ty": 0, "pitch": 40, "dist": 300}},
         "map": MAP, "roads": ROADLINES}
OUTD = OUT
json.dump(COL, open(os.path.join(OUTD, "colliders_coconut.json"), "w")); json.dump(PROPS, open(os.path.join(OUTD, "props_coconut.json"), "w")); json.dump(CARS, open(os.path.join(OUTD, "cars_coconut.json"), "w")); json.dump(WORLD, open(os.path.join(OUTD, "world_coconut.json"), "w"))
pc = {}
for p in PROPS: pc[p["k"]] = pc.get(p["k"], 0) + 1
tick_('pre-check'); LAYOUT_BAD = check_layout(); tick_('checked'); print("PLACED", PLACED)
if os.environ.get("FREEMAP"):
    NOGO.clear()
    for y in range(-96, 100, 8):
        row = []; run = None
        for x10 in range(-960, 961, 10):
            x = x10 / 10; ok = free(x, y, 0.0) and all(not inside(ring, x, y, 1.3) for ring, _ in LAKES.values())
            if ok and run is None: run = x
            if (not ok or x10 == 960) and run is not None: row.append((run, x - 1 if not ok else x)); run = None
        print("FREE y=%4d" % y, [(round(a), round(b)) for a, b in row if b - a >= 6])
print("COCONUT colliders", len(COL), "props", pc, "cars", len(CARS))
if not os.environ.get("NORENDER"):
    tmpl = {k_: f() for k_, f in veg.KIT.items()}
    for o in tmpl.values(): o.hide_render = True; o.location = (0, 0, -50)
    for p in PROPS:
        o = bpy.data.objects.new(p["k"], tmpl[p["k"]].data); bpy.context.scene.collection.objects.link(o); o.location = (p["x"], p["y"], 0)
        o.rotation_euler = (0, 0, math.radians(p["rz"])); o.scale = (p["s"], p["s"], p["s"]) if p["k"] != "hedge" else (1, 1, 1)
    nwx, nwy = CORNER_RINGS[0].island[0], CORNER_RINGS[0].island[1]
    SHOTS = {"cc_city": ((0, 0, 0), 60, 560, 1200, 1200), "cc_ring": ((nwx, nwy, 0), 50, 70, 1000, 700), "cc_edge": ((182, 30, 0), 45, 70, 1000, 700), "cc_game": ((START["x"], START["y"] + 8, 0), 45, 44, 540, 960), "cc_south": ((24, -150, 0), 50, 110, 1100, 700)}
    if os.environ.get("SHOT"): x_, y_, p_, d_ = [float(v) for v in os.environ["SHOT"].split(",")]; SHOTS = {"dbg": ((x_, y_, 0), p_, d_, 1000, 700)}
    for nm, (tgt, pitch, dist, w, h) in SHOTS.items():
        for o in [x for x in bpy.context.scene.objects if x.type == "CAMERA"]: bpy.data.objects.remove(o)
        game_camera(tgt, pitch, dist); render(os.path.join(OUT, nm + ".png"), w, h, samples=20, keep_transform=True)
export_glb("coconut_scene", [o for o in STATIC if o.type in ("MESH", "EMPTY")])
print("EXPORTED")
