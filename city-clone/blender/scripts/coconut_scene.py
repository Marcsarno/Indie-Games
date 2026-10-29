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
ENTRY = rd.Road("Plaza Entry", [(58, 0.5), (58, 4), (58, 9)], hw=3.0, rank=6, flare=4.5)
LAKEVIEW = rd.Road("Lakeview Dr", [(58, -15.5), (58, -34), (64, -56), (60, -80), (64, -104)], hw=3.5, rank=6)
PLAZA_DR = rd.Road("Plaza Dr", [(16, 15), (2, 15.3), (-14, 15)], hw=3.0, rank=6, flare=4.5)
SCHOOL_DR = rd.Road("School Dr", [(56, -35), (66, -35), (72, -35)], hw=3.0, rank=5, flare=4.5)
CIVIC_DR = rd.Road("Civic Dr", [(66, -81), (56, -81), (50, -81)], hw=3.0, rank=5, flare=4.5)
PALM = rd.Road("Palm Lane", [(-3, 29), (-20, 28), (-34, 31), (-52, 30), (-68, 36), (-80, 52), (-80, 66), (-72, 74), (-63.5, 77)], hw=3.5, rank=6)
CUL = rd.ring_road("Palm Ct", -60, 80, 6.0, 2.8, rank=7, seam=-math.pi / 2 - 1.0)
def organic(cx, cy, rx, ry, seed, n=12, wob=.28, rot=0.0):                                                                  # lumpy pond outline: noisy radius around an ellipse
    r_ = random.Random(seed); ph = [r_.uniform(0, 6.28) for _ in range(3)]; out = []
    for k in range(n):
        a = 2 * math.pi * k / n; f = 1 + wob * math.sin(2 * a + ph[0]) * .8 + wob * .7 * math.sin(3 * a + ph[1]) + wob * .45 * math.sin(5 * a + ph[2]) + r_.uniform(-.06, .06)
        x, y = rx * f * math.cos(a), ry * f * math.sin(a); c_, s_ = math.cos(rot), math.sin(rot); out.append((cx + x * c_ - y * s_, cy + x * s_ + y * c_))
    return out
LAKES_CTRL = {"windmill": organic(-46, -44, 24, 17, 3, 14, .3, .25), "pond_w": organic(-84, -62, 11, 8, 5, 9, .25, .6), "wiles": organic(-54, 9, 23, 8.5, 8, 12, .28, -.08),
              "north": organic(88, 36, 13, 19, 11, 11, .25, .2), "east": organic(88, -94.5, 9, 3.6, 14, 10, .12, 0)}
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
        if q.nearest(x, y)[0] < q.hw + CURB_SW + pad: return False
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
LX0, LX1, LY0, LY1 = 14, 66, 6.4, 39.0
T.box(m["conc"], LX0, LX1, 39.0, 42.0, 0, .12)
rows = [(6.8, 12.0), (18.0, 23.2), (23.2, 28.4), (34.4, 39.0)]
islands, stalls = parking_lot(T, m, LX0, LX1, LY0, LY1, rows, 15.0)
mapr(LX0, LY0, LX1, LY1, "#5a5c60"); mapr(LX0, 39, LX1, 42, "#a9a69c"); NOGO.append((LX0 - 2, LY0 - 2, LX1 + 2, 60))
for (ix, iy, iw, idp) in islands:
    cbox(ix, iy, iw, idp, soft="bush")
    if R_.random() < .4: prop("palm_medium", ix, iy, 1.0, col=False)
    else: prop("shrub_a", ix, iy, 1.0, col=False)
plaza = put(make_plaza("plaza", 44, 16, tower_x=10), 40, 50, 0, 0, 44.5, 17.5); mapr(18, 42, 62, 58, "#c9b48a")
for k in range(11):
    if k % 4 == 1: prop("palm_tall", 17 + k * 4.6, 40.6, 1.0)
for x in (24, 40, 56): lamp(T, x, 30.5, 1); lamp(T, x, 14.5, -1)
# NW: townhomes, clubhouse + pool, single-family homes around the cul-de-sac
rowA = put(make_row("rowA", 5, 6.4, 10, 2, 3), -38, 44, 0, 0, 32, 10.2); rowB = put(make_row("rowB", 5, 6.4, 10, 2, 5), -38, 62, 0, 0, 32, 10.2)
mapr(-54, 39, -22, 49, "#b5603e"); mapr(-54, 57, -22, 67, "#b5603e"); NOGO += [(-56, 36, -20, 69)]
T.box(m["conc"], -78, -64, 44, 56, 0, .12); T.box(m["bank"], -75.4, -66.6, 46.2, 53.8, .12, .2); T.box(m["water"], -75.0, -67.0, 46.6, 53.4, .2, .24); mapr(-78, 44, -64, 56, "#a9a69c"); mapr(-75, 46.6, -67, 53.4, "#2d78b8"); cbox(-71, 50, 8.6, 7.6)
NOGO.append((-80, 42, -62, 58))
club = put(make_house("clubhouse", 14, 10, 1, "cream", 2, balcony=False, roof_h=3.2), -50, 82, 0, 0, 14.2, 10.2); mapr(-57, 77, -43, 87, "#b5603e"); NOGO.append((-58, 76, -42, 88))
for (x, y) in ((-69, 45), (-73, 55), (-65, 55)): ccir(x, y, .3, "pole"); T.cyl(M("umbrella_t", "#1f6b8a"), (x, y, 1.0), .05, 2.0, "z", 6); T.cyl(M("umbrella_c", "#2f9aa8"), (x, y, 2.15), 1.0, .25, "z", 8, r2=.12)
HOMES = [(-90, 46, 90, "cream"), (-90, 60, 90, "peach"), (-91, 72, 90, "butter"), (-60, 92.5, 0, "sand"), (-74, 82, 90, "white"), (-45, 91, 0, "peach")]
for k, (x, y, rz, wall) in enumerate(HOMES):
    hs = put(make_house(f"home{k}", 12, 9, 2 if k % 2 else 1, wall, 10 + k, garage=True), x, y, 0, rz, 12.2 if rz == 0 else 9.2, 9.2 if rz == 0 else 12.2); NOGO.append((x - 7, y - 7, x + 7, y + 7))
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
hall = put(make_plaza("cityhall", 28, 14, 7.0, shops=(), tower_x=0, tower_sign="cityhall"), 34, -60, 0, 0, 28.5, 22, col=True); mapr(20, -67, 48, -53, "#d8c9a0"); NOGO.append((18, -70, 50, -50))
Fp = Builder("flagpole"); Fp.cyl(M("flag_pole", "#d8d8d8"), (22, -68.7, 4.5), .07, 9, "z", 6); Fp.box(M("flag_red", "#c22a3a"), 22.1, 24.2, -68.75, -68.65, 7.4, 8.9); Fp.box(M("flag_blue", "#2a3a8a"), 22.1, 23.1, -68.75, -68.65, 8.1, 8.9); STATIC.append(Fp.build()); ccir(22, -68.7, .12, "pole")
T.box(m["conc"], 22, 46, -69.8, -66.9, 0, .12); mapr(22, -69.8, 46, -66.9, "#a9a69c")                                                             # forecourt in front of the hall
hall_rows = [(-90, -84.8), (-77.2, -72)]
hl_isl, hl_stalls = parking_lot(T, m, 14, 52, -92, -70, hall_rows, 15.0)
mapr(14, -92, 52, -70, "#5a5c60"); NOGO.append((12, -94, 54, -68))
for (ix, iy, iw, idp) in hl_isl:
    cbox(ix, iy, iw, idp, soft="bush"); prop("shrub_a" if R_.random() < .5 else "palm_small", ix, iy, 1.0, col=False)
for cx_ in (21.0, 35.0):                                                                                                                          # two tennis courts
    civic.tennis_court(T, CM, cbs, cx_, -30); NOGO.append((cx_ - 7.5, -45, cx_ + 7.5, -15))
mapr(14, -44, 28, -16, "#3f7a52"); mapr(28, -44, 42, -16, "#3f7a52")
civic.playground(T, CM, cbs, ccs, 47.5, -30); NOGO.append((42, -36, 53, -24)); mapr(42.5, -35, 52.5, -25, "#b5503a")
for (x, y) in ((44, -41), (50, -41), (44, -19), (50, -19)): prop("shrub_b", x, y)                                                                  # flower beds around the playground
sch = put(make_house("school", 30, 10, 2, "butter", 21, garage=False, balcony=False, roof_h=3.0, windows=True), 84, -20, 0, 0, 30.4, 10.4); mapr(69, -25, 99, -15, "#b5603e"); NOGO.append((66, -27, 101, -13))
sch_rows = [(-43, -37.8), (-32.2, -27)]
sc_isl, sc_stalls = parking_lot(T, m, 68, 98, -43, -27, sch_rows, 69.0)
mapr(68, -43, 98, -27, "#5a5c60"); NOGO.append((66, -45, 100, -25))
for (ix, iy, iw, idp) in sc_isl:
    cbox(ix, iy, iw, idp, soft="bush"); prop("shrub_a", ix, iy, 1.0, col=False)
BUS = civic.make_bus("bus_template"); BUS.hide_render = True; BUS.location = (0, 0, -60)
for k_, bx_ in enumerate((73.5, 85, 96.5)):                                                                                                           # a row of school buses (static scenery) along the north row of the lot
    bo = bpy.data.objects.new(f"bus{k_}", BUS.data); bpy.context.scene.collection.objects.link(bo); bo.location = (bx_, -40.4, 0); bo.rotation_euler = (0, 0, math.radians(90)); STATIC.append(bo); cbox(bx_, -40.4, 10.4, 2.7, 0)
sch_stalls = [p for p in sc_stalls if not (p[1] < -38)]
fx_, fy_ = 84, -66; civic.field(T, CM, fx_, fy_, 16, 30); cbox(fx_ - 11.2, fy_, 4, 12.4, 0)
TRACK = rd.Road("track", [(fx_ + 11, fy_ - 10), (fx_ + 11, fy_ + 10), (fx_ + 8, fy_ + 17), (fx_, fy_ + 19), (fx_ - 8, fy_ + 17), (fx_ - 11, fy_ + 10), (fx_ - 11, fy_ - 10), (fx_ - 8, fy_ - 17), (fx_, fy_ - 19), (fx_ + 8, fy_ - 17)], hw=2.8, closed=True, rank=1, sw=(0, 0), mark=False, surf="track", curbs=False, flare=0)
m["track"] = CM["track"]; TRACK.pieces = [(0.0, TRACK.L, 0, 0, 0, 0)]; net.append(TRACK); rd.draw_road(RB, TRACK, m); NOGO.append((fx_ - 15, fy_ - 23, fx_ + 15, fy_ + 23)); mapr(fx_ - 14, fy_ - 22, fx_ + 14, fy_ + 22, "#b3503c"); mapr(fx_ - 8, fy_ - 15, fx_ + 8, fy_ + 15, "#4c9a45")
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
for (stl, aisle_y, prob) in ((stalls, 15.0, .30), (hl_stalls, -81.0, .35), (sch_stalls, -35.0, .45)):
    for (sx_s, sy_s) in stl:
        if R_.random() < prob:
            rz = (0 if sy_s < 15 or 23.2 <= sy_s < 28.4 else 180) if stl is stalls else (0 if sy_s < aisle_y else 180)
            addcar("sedan", R_.choice(PAL), f"parked{k}", sx_s, sy_s, rz); cbox(sx_s, sy_s, 1.8, 4.5, rz); COL[-1]["car"] = f"parked{k}"; k += 1
# ================================================================  WORLD EDGE + DATA  =======================================================
for (x, y, w, d) in ((0, EXT - .5, 2 * EXT, 3), (0, -EXT + .5, 2 * EXT, 3), (EXT - .5, 0, 3, 2 * EXT), (-EXT + .5, 0, 3, 2 * EXT)): cbox(x, y, w, d)
T.cyl(M("shadow_dummy", "#000000"), (0, 0, -5), .01, .01, "z", 3); terr = T.build(vc=True); STATIC.append(terr); STATIC.extend(RB.build(vc=True, recalc=False))
def sidewalk_path(road, side): return [[round(a, 2), round(b, 2)] for a, b in rd.lane_path(road, side * (road.hw + rd.CURB + 1.2))]
WALK = [{"path": sidewalk_path(PKWY, 1)}, {"path": sidewalk_path(PKWY, -1)}, {"path": sidewalk_path(WILES, 1)}, {"path": sidewalk_path(WILES, -1)}, {"path": sidewalk_path(PALM, 1)}, {"path": sidewalk_path(PALM, -1)},
        {"path": [[15, 40.4], [65, 40.4]]}, {"path": [[round(a, 2), round(b, 2)] for a, b in rd.lane_path(TRAIL, 0)], "closed": True}, {"path": sidewalk_path(LAKEVIEW, 1)}]
ROADLINES = [{"pts": [[round(a, 1), round(b, 1)] for a, b in rd.lane_path(r, 0, step=6, s0=p[0], s1=p[1])], "w": round(2 * r.hw, 1), "closed": r.closed} for r in net if r.surf == "asphalt" for p in r.pieces]
WORLD = {"name": "coconut", "title": "Coconut Creek", "extent": EXT - 4, "sky": "#8fc3f5", "fog": ["#c4dcf2", 110, 320], "hemi": ["#cfe4ff", "#6f8a4a", 1.55], "sun": {"color": "#fff0d6", "intensity": 3.7, "dir": [-0.5, -0.74, 0.45]},
         "exposure": 1.0, "tone": "AgX", "lamps": [], "ground": "#5d9a3a", "start": START, "money": 1250, "traffic": TRAFFIC, "walk": WALK, "walkers": 16, "fight": {"x": 24, "y": 40.4}, "demo": None,
         "views": {"drive": {"label": "Play", "mode": "drive", "pitch": 45, "dist": 44}, "plaza": {"label": "Plaza", "tx": 38, "ty": 30, "pitch": 48, "dist": 34}, "homes": {"label": "Homes", "tx": -62, "ty": 62, "pitch": 48, "dist": 40},
                   "park": {"label": "Park", "tx": -45, "ty": -42, "pitch": 48, "dist": 46}, "over": {"label": "Overview", "tx": 0, "ty": 0, "pitch": 40, "dist": 150}},
         "map": MAP, "roads": ROADLINES}
OUTD = OUT
json.dump(COL, open(os.path.join(OUTD, "colliders_coconut.json"), "w")); json.dump(PROPS, open(os.path.join(OUTD, "props_coconut.json"), "w")); json.dump(CARS, open(os.path.join(OUTD, "cars_coconut.json"), "w")); json.dump(WORLD, open(os.path.join(OUTD, "world_coconut.json"), "w"))
pc = {}
for p in PROPS: pc[p["k"]] = pc.get(p["k"], 0) + 1
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
