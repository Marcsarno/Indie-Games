"""Coconut Creek first slice. Run: blender -b --python scripts/coconut_scene.py   (env NORENDER=1 to only export; needs out/tex from textures.py)
Exports to out/: coconut_scene.glb (static), props.json (vegetation instances), colliders.json, cars.json, world.json."""
import sys, os, json, math, random; sys.path.insert(0, os.path.dirname(__file__))
from kit import *; from street_fl import *; from building_fl import make_house, make_row, make_plaza; import vegetation as veg; from car import make_car; import mood; import roads as rd; import civic

reset(); mood.florida(); mood._transform(); R_ = random.Random(7)
EXT = 100; m = mats(); T = Builder("terrain"); T.box(m["grass"], -EXT, EXT, -EXT, EXT, -.3, 0)
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
PKWY = rd.Road("Coconut Creek Pkwy", [(16, -104), (13, -70), (5, -35), (-3, -5), (-9, 28), (-8, 62), (-2, 104)], hw=8.4, mh=1.6, rank=10, flare=7, xwalk=True)
WILES = rd.Road("Wiles Rd", [(-104, -14), (-72, -16), (-40, -10), (-12, -6), (8, -5), (30, -9), (51.5, -7.6)], hw=3.5, rank=8, flare=5.5)
RING = rd.ring_road("Plaza Circle", 58, -8, 10, 3.6, rank=9, seam=math.pi * 1.5)
WILES_E = rd.Road("Wiles Rd E", [(66.5, -8), (80, -7), (104, -2)], hw=3.5, rank=8, flare=5.5)
ENTRY = rd.Road("Plaza Entry", [(58, 0.5), (58, 5), (58, 12)], hw=3.0, rank=6, flare=4.5)
LAKEVIEW = rd.Road("Lakeview Dr", [(58, -15.5), (58, -34), (64, -56), (60, -80), (64, -104)], hw=3.5, rank=6)
PLAZA_DR = rd.Road("Plaza Dr", [(16, 17.6), (2, 17.9), (-14, 17.6)], hw=3.0, rank=6, flare=4.5)
SCHOOL_DR = rd.Road("School Dr", [(56, -43), (66, -43), (74, -43)], hw=3.0, rank=5, flare=4.5)
CIVIC_DR = rd.Road("Civic Dr", [(66, -86), (56, -86), (50, -86)], hw=3.0, rank=5, flare=4.5)
PALM = rd.Road("Palm Lane", [(-3, 29), (-20, 28), (-34, 31), (-52, 30), (-66, 35), (-77, 50), (-77, 62), (-70, 69.5), (-61.5, 72)], hw=3.5, rank=6)
CUL = rd.ring_road("Palm Ct", -58, 72, 6.0, 2.8, rank=7, seam=-math.pi / 2 - 1.0, flare=1.6)
def organic(cx, cy, rx, ry, seed, n=12, wob=.28, rot=0.0):                                                                  # lumpy pond outline: noisy radius around an ellipse
    r_ = random.Random(seed); ph = [r_.uniform(0, 6.28) for _ in range(3)]; out = []
    for k in range(n):
        a = 2 * math.pi * k / n; f = 1 + wob * math.sin(2 * a + ph[0]) * .8 + wob * .7 * math.sin(3 * a + ph[1]) + wob * .45 * math.sin(5 * a + ph[2]) + r_.uniform(-.06, .06)
        x, y = rx * f * math.cos(a), ry * f * math.sin(a); c_, s_ = math.cos(rot), math.sin(rot); out.append((cx + x * c_ - y * s_, cy + x * s_ + y * c_))
    return out
LAKES_CTRL = {"windmill": organic(-46, -44, 24, 17, 3, 14, .3, .25), "pond_w": organic(-84, -62, 11, 8, 5, 9, .25, .6), "wiles": organic(-54, 9, 23, 8.5, 8, 12, .28, -.08),
              "north": organic(88, 36, 13, 19, 11, 11, .25, .2)}
net = rd.build_network([PKWY, WILES, RING, WILES_E, ENTRY, LAKEVIEW, PLAZA_DR, PALM, CUL, SCHOOL_DR, CIVIC_DR])
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
# ---- what is free ground (props must not sit on roads, lots, buildings or water)
NOGO = []                                                                                                                # axis-aligned rectangles x0,y0,x1,y1
def free(x, y, pad=0.0, own=None):
    if abs(x) > EXT - 4 or abs(y) > EXT - 4: return False
    for q in net:
        if q is own or q.surf != "asphalt": continue
        if corridor_dist(q, x, y) < pad: return False
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
G = Builder("gazebo"); gx, gy = -17, -30; gw = M("gaz_roof", "#2f7a4a", rough=.7)
for sx_ in (-2, 2):
    for sy_ in (-2, 2): G.cyl(M("gaz_post", "#f1ece0"), (gx + sx_, gy + sy_, 1.4), .13, 2.8, "z", 6); ccir(gx + sx_, gy + sy_, .2)
G.box(m["wood"], gx - 2.6, gx + 2.6, gy - 2.6, gy + 2.6, 0, .25); G.prism(gw, (gx - 3.2, gx + 3.2, gy - 3.2, gy + 3.2), (gx - .15, gx + .15, gy - .15, gy + .15), 2.8, 4.4); STATIC.append(G.build()); mapr(gx - 3, gy - 3, gx + 3, gy + 3, "#2f7a4a"); NOGO.append((gx - 4, gy - 4, gx + 4, gy + 4))
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
def corridor_dist(road, x, y):
    best = 1e9
    for pl in piece_polys(road):
        for i in range(len(pl) - 1):
            ax, ay = pl[i]; bx, by = pl[i + 1]; dx, dy = bx - ax, by - ay; l2 = dx * dx + dy * dy or 1; t = max(0, min(1, ((x - ax) * dx + (y - ay) * dy) / l2)); best = min(best, math.hypot(x - ax - dx * t, y - ay - dy * t))
    return best - (road.hw + rd.CURB + rd.SWK)
def footprints():
    R = lambda nm, x0, y0, x1, y1, allow=(): (nm, (x0 + x1) / 2, (y0 + y1) / 2, x1 - x0, y1 - y0, 0.0, allow)
    F = [R("plaza lot", LX0, LY0, LX1, LY1, ("Plaza Dr", "Plaza Entry")), R("plaza building", 18, 42 + OY, 62, 58 + OY), R("townhomes A", -54, 39, -22, 49), R("townhomes B", -47.8, 53, -22.2, 63), R("pool deck", *POOL),
         R("clubhouse", -43, 80, -29, 90), R("gazebo", gx - 3.5, gy - 3.5, gx + 3.5, gy + 3.5), R("city hall", HALL[0] - 14.3, HALL[1] - 7.3, HALL[0] + 14.3, HALL[1] + 7.3), R("hall lot", *HL, ("Civic Dr",))]
    for k_, (cx_, cy_) in enumerate(COURTS): F.append(R(f"court {k_ + 1}", cx_ - 6.8, cy_ - 14.3, cx_ + 6.8, cy_ + 14.3))
    F += [R("playground", PLAY[0] - 4.5, PLAY[1] - 3.5, PLAY[0] + 4.5, PLAY[1] + 3.5), R("school", SB[0] - 12.2, SB[1] - 5.2, SB[0] + 12.2, SB[1] + 5.2), R("school lot", *SL, ("School Dr",)), R("sports field + track", fx_ - 12.4, fy_ - 20.9, fx_ + 12.4, fy_ + 20.9)]
    for k_, (x, y, rz, wall, w_, d_) in enumerate(HOMES): F.append((f"home {k_}", x, y, w_, d_, rz, ()))
    return F
def local_pts(f, step=1.0):
    nm, cx, cy, w, d, rz, _ = f; c_, s_ = math.cos(math.radians(rz)), math.sin(math.radians(rz)); out = []
    for i in range(max(2, int(w / step)) + 1):
        for j in range(max(2, int(d / step)) + 1):
            u, v = -w / 2 + w * i / max(2, int(w / step)), -d / 2 + d * j / max(2, int(d / step)); out.append((cx + u * c_ - v * s_, cy + u * s_ + v * c_))
    return out
def in_rect(f, x, y):
    nm, cx, cy, w, d, rz, _ = f; c_, s_ = math.cos(math.radians(rz)), math.sin(math.radians(rz)); u, v = (x - cx) * c_ + (y - cy) * s_, -(x - cx) * s_ + (y - cy) * c_
    return abs(u) <= w / 2 and abs(v) <= d / 2
def check_layout():
    F = footprints(); bad = []
    for f in F:
        pts = local_pts(f); nm, allow = f[0], f[6]
        for r in net:
            if r.surf != "asphalt" or r.name in allow: continue
            worst = min(corridor_dist(r, x, y) for (x, y) in pts)
            if worst < -.05: bad.append(f"{nm} overlaps the corridor of {r.name} by {-worst:.1f} m")
        for lk, (ring, _) in LAKES.items():
            if any(inside(ring, x, y, 1.3) for (x, y) in pts): bad.append(f"{nm} sits in lake {lk}")
        if min(p[0] for p in pts) < -EXT + 3 or min(p[1] for p in pts) < -EXT + 3 or max(p[0] for p in pts) > EXT - 3 or max(p[1] for p in pts) > EXT - 3: bad.append(f"{nm} is on the world edge wall")
    for i in range(len(F)):
        for j in range(i + 1, len(F)):
            if any(in_rect(F[j], x, y) for (x, y) in local_pts(F[i], .8)) or any(in_rect(F[i], x, y) for (x, y) in local_pts(F[j], .8)): bad.append(f"{F[i][0]} overlaps {F[j][0]}")
    for lk, (ring, _) in LAKES.items():                                                                                              # lake shores and trails against road corridors
        for r in net:
            if r.surf != "asphalt": continue
            worst = min(corridor_dist(r, x, y) for (x, y) in ring)
            if worst < 1.3: bad.append(f"lake {lk} shore is within {worst:.1f} m of the corridor of {r.name} (needs 1.3 m of bank)")
    for tr in (TRAIL, TRAIL2):
        pts_ = [tr.at(i * tr.L / 80)[:2] for i in range(80)]
        for r in net:
            if r.surf != "asphalt": continue
            worst = min(corridor_dist(r, x, y) for (x, y) in pts_)
            if worst < 1.1: bad.append(f"a lake trail overlaps the corridor of {r.name} by {1.1 - worst:.1f} m")
    print("LAYOUT", "OK" if not bad else "PROBLEMS"); [print("  -", b) for b in bad]
    return bad
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
    {"name": "traffic5", "path": [[round(RING.off(s, -2.0)[0], 2), round(RING.off(s, -2.0)[1], 2)] for s in [k * RING.L / 48 for k in range(48)]][::-1] if False else [[round(RING.off(s, 2.0)[0], 2), round(RING.off(s, 2.0)[1], 2)] for s in [k * RING.L / 48 for k in range(48)]], "speed": 5.5, "s0": 0, "closed": True, "kind": "sedan", "color": "#d8b04a"},
]
for t in TRAFFIC:
    p0 = t["path"][0]; addcar(t["kind"], t["color"], t["name"], p0[0], p0[1], 0)
PAL = ["#e6e6e2", "#2b2d33", "#9aa0a8", "#2e5fa3", "#c8201c", "#3d7a52", "#d8b04a", "#7a3a2a"]
k = 0
for (stl, aisle_y, prob) in ((stalls, 15.0 + OY, .30), (hl_stalls, -86.2, .35), (sch_stalls, -43.25, .45)):
    for (sx_s, sy_s) in stl:
        if R_.random() < prob:
            rz = (0 if sy_s < 15 + OY or 23.2 + OY <= sy_s < 28.4 + OY else 180) if stl is stalls else (0 if sy_s < aisle_y else 180)
            addcar("sedan", R_.choice(PAL), f"parked{k}", sx_s, sy_s, rz); cbox(sx_s, sy_s, 1.8, 4.5, rz); COL[-1]["car"] = f"parked{k}"; k += 1
# ================================================================  WORLD EDGE + DATA  =======================================================
for (x, y, w, d) in ((0, EXT - .5, 2 * EXT, 3), (0, -EXT + .5, 2 * EXT, 3), (EXT - .5, 0, 3, 2 * EXT), (-EXT + .5, 0, 3, 2 * EXT)): cbox(x, y, w, d)
T.cyl(M("shadow_dummy", "#000000"), (0, 0, -5), .01, .01, "z", 3); terr = T.build(vc=True); STATIC.append(terr); STATIC.extend(RB.build(vc=True, recalc=False))
def sidewalk_path(road, side): return [[round(a, 2), round(b, 2)] for a, b in rd.lane_path(road, side * (road.hw + rd.CURB + 1.2))]
WALK = [{"path": sidewalk_path(PKWY, 1)}, {"path": sidewalk_path(PKWY, -1)}, {"path": sidewalk_path(WILES, 1)}, {"path": sidewalk_path(WILES, -1)}, {"path": sidewalk_path(PALM, 1)}, {"path": sidewalk_path(PALM, -1)},
        {"path": [[15, 40.4 + OY], [65, 40.4 + OY]]}, {"path": [[round(a, 2), round(b, 2)] for a, b in rd.lane_path(TRAIL, 0)], "closed": True}, {"path": sidewalk_path(LAKEVIEW, 1)}]
ROADLINES = [{"pts": [[round(a, 1), round(b, 1)] for a, b in rd.lane_path(r, 0, step=6, s0=p[0], s1=p[1])], "w": round(2 * r.hw, 1), "closed": r.closed} for r in net if r.surf == "asphalt" for p in r.pieces]
WORLD = {"name": "coconut", "title": "Coconut Creek", "extent": EXT - 4, "sky": "#8fc3f5", "fog": ["#c4dcf2", 110, 320], "hemi": ["#cfe4ff", "#6f8a4a", 1.55], "sun": {"color": "#fff0d6", "intensity": 3.7, "dir": [-0.5, -0.74, 0.45]},
         "exposure": 1.0, "tone": "AgX", "lamps": [], "ground": "#5d9a3a", "start": START, "money": 1250, "traffic": TRAFFIC, "walk": WALK, "walkers": 16, "fight": {"x": 24, "y": 40.4 + OY}, "demo": None,
         "views": {"drive": {"label": "Play", "mode": "drive", "pitch": 45, "dist": 44}, "plaza": {"label": "Plaza", "tx": 38, "ty": 32, "pitch": 48, "dist": 34}, "homes": {"label": "Homes", "tx": -62, "ty": 62, "pitch": 48, "dist": 40},
                   "park": {"label": "Park", "tx": -45, "ty": -42, "pitch": 48, "dist": 46}, "over": {"label": "Overview", "tx": 0, "ty": 0, "pitch": 40, "dist": 150}},
         "map": MAP, "roads": ROADLINES}
OUTD = OUT
json.dump(COL, open(os.path.join(OUTD, "colliders_coconut.json"), "w")); json.dump(PROPS, open(os.path.join(OUTD, "props_coconut.json"), "w")); json.dump(CARS, open(os.path.join(OUTD, "cars_coconut.json"), "w")); json.dump(WORLD, open(os.path.join(OUTD, "world_coconut.json"), "w"))
pc = {}
for p in PROPS: pc[p["k"]] = pc.get(p["k"], 0) + 1
LAYOUT_BAD = check_layout()
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
    SHOTS = {"cc_game": ((START["x"], START["y"] + 8, 0), 45, 44, 540, 960), "cc_over": ((0, 0, 0), 55, 170, 1100, 1100), "cc_plaza": ((38, 18, 0), 48, 60, 1000, 640), "cc_homes": ((-62, 62, 0), 48, 60, 1000, 640),
             "cc_park": ((-45, -40, 0), 50, 70, 1000, 640), "cc_junc": ((-3, -5, 0), 50, 50, 1000, 640), "cc_civic": ((38, -52, 0), 50, 80, 1100, 800), "cc_school": ((84, -42, 0), 50, 62, 1000, 640)}
    if os.environ.get("SHOT"): x_, y_, p_, d_ = [float(v) for v in os.environ["SHOT"].split(",")]; SHOTS = {"dbg": ((x_, y_, 0), p_, d_, 1000, 700)}
    for nm, (tgt, pitch, dist, w, h) in SHOTS.items():
        for o in [x for x in bpy.context.scene.objects if x.type == "CAMERA"]: bpy.data.objects.remove(o)
        game_camera(tgt, pitch, dist); render(os.path.join(OUT, nm + ".png"), w, h, samples=20, keep_transform=True)
export_glb("coconut_scene", [o for o in STATIC if o.type in ("MESH", "EMPTY")])
print("EXPORTED")
