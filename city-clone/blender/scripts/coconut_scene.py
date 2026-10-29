"""Coconut Creek first slice. Run: blender -b --python scripts/coconut_scene.py   (env NORENDER=1 to only export; needs out/tex from textures.py)
Exports to out/: coconut_scene.glb (static), props.json (vegetation instances), colliders.json, cars.json, world.json."""
import sys, os, json, math, random; sys.path.insert(0, os.path.dirname(__file__)); sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'plan'))
import layout as LY
from kit import *; from street_fl import *; from building_fl import make_house, make_row, make_plaza; import vegetation as veg; from car import make_car; import mood; import roads as rd; import civic; import district_kits as dk; import time as _t; T0 = _t.time()
def tick_(n): print('T', n, round(_t.time() - T0, 1))

reset(); mood.florida(); mood._transform(); R_ = random.Random(7)
EXT = 200; m = mats(); T = Builder("terrain")
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
PKWY = rd.Road("Coconut Creek Pkwy", [(40, -190), (30, -150), (18, -120), (16, -104), (13, -70), (5, -35), (-3, -5), (-9, 28), (-8, 62), (-2, 104), (-8, 126), (-9, 134)], hw=8.4, mh=1.6, rank=10, flare=7, xwalk=True)
WILES = rd.Road("Wiles Rd", [(-182, -16), (-150, -17), (-128, -16), (-104, -14), (-72, -16), (-40, -10), (-12, -6), (8, -5), (30, -9), (51.5, -7.6)], hw=3.5, rank=8, flare=5.5)
RING = rd.ring_road("Plaza Circle", 58, -8, 10, 3.6, rank=9, seam=math.pi * 1.5)
WILES_E = rd.Road("Wiles Rd E", [(66.5, -8), (80, -7), (104, -2), (130, 2), (156, 6), (176, 6)], hw=3.5, rank=8, flare=5.5)
ENTRY = rd.Road("Plaza Entry", [(58, 0.5), (57, 4), (53, 9), (47.6, 14.4), (44, 15)], hw=3.0, rank=6, flare=4.5)
EGRET = rd.Road("Egret Way", [(58, 84), (57, 70), (60, 55), (63, 40), (61, 28), (60, 23)], hw=3.5, rank=5)
DEPOT_RD = rd.Road("Depot Rd", [(156, -124), (154, -150), (156, -182)], hw=4.5, rank=5, flare=6.0, sw=(0, 0))
PROM = rd.Road("Promenade", [(86, 132), (110, 146), (134, 160), (152, 171)], hw=5.0, rank=3, sw=(0, 0), mark=False, surf="walk", curbs=False, flare=0)
def cds(name, cx, cy): return rd.ring_road(name, cx, cy, 6.0, 2.8, rank=7, seam=-math.pi / 2 - 1.0, flare=1.6)
SUB1 = rd.Road("Orchid Way", [(-116, -68), (-138, -72), (-158, -82), (-172, -80)], hw=3.5, rank=5)
SUB2 = rd.Road("Jasmine Lane", [(-114, -100), (-130, -108), (-124, -130), (-122, -154), (-130, -176)], hw=3.5, rank=5)
SUB3 = rd.Road("Palmetto Lane", [(-114, -46), (-138, -44), (-160, -50), (-172, -58)], hw=3.5, rank=5)
SUB4 = rd.Road("Gumbo Limbo Way", [(-100, -136), (-110, -150), (-128, -162), (-122, -180)], hw=3.5, rank=4)
SUB_CTS = [cds("Orchid Ct", -178, -79), cds("Palmetto Ct", -178, -60), cds("Gumbo Ct", -122, -186)]
GATED = rd.Road("Gated Lane", [(-124, 126), (-146, 128), (-160, 134), (-166, 140)], hw=3.5, rank=5)
GATED_CT = cds("Gated Ct", -168, 143)
CONDO_DR = rd.Road("Condo Dr", [(30, -164), (58, -166), (82, -166)], hw=4.0, rank=5, flare=5.0)
CONDO_CIRCLE = rd.ring_road("Condo Circle", 92, -166, 12.0, 4.0, rank=7, seam=math.pi * .25, flare=4.0, swo=0)
PRESERVE_RD = rd.Road("Preserve Rd", [(-82, -130), (-80, -150), (-74, -172)], hw=3.0, rank=5, flare=4.5)
BOARDWALK = rd.Road("Boardwalk", [(-70, -168), (-62, -150), (-76, -138), (-92, -150), (-86, -170)], hw=1.4, rank=1, sw=(0, 0), mark=False, surf="wood", curbs=False, flare=0)
CAMPUS_DR = rd.Road("Campus Dr", [(-116, 52), (-138, 53), (-152, 57)], hw=3.5, rank=5)
CLUB_DR = rd.Road("Club Dr", [(116, 44), (136, 48), (150, 56)], hw=3.5, rank=5)
CARTPATH = rd.Road("Cart path", [(142, 90), (176, 84), (186, 50), (170, 20), (146, 10), (138, 40)], hw=1.1, closed=True, rank=1, sw=(0, 0), mark=False, surf="walk", curbs=False, flare=0)
EGRET_CT = rd.ring_road("Egret Ct", 60, 17.5, 6.0, 2.8, rank=7, seam=-math.pi / 2 - 1.0, flare=1.6)
LAKEVIEW = rd.Road("Lakeview Dr", [(58, -15.5), (58, -34), (64, -56), (60, -80), (64, -104), (68, -128), (70, -133)], hw=3.5, rank=6)
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
              "north": organic(88, 47, 11, 12.5, 11, 11, .22, .2), "golf1": organic(168, 66, 9, 6, 52, 9, .2, .3), "marsh1": organic(-76, -122, 7, 4, 54, 9, .2, 0), "marsh2": organic(-94, -166, 6, 4, 55, 9, .2, 0)}
# ---- plan roads (plan/layout.py): arterials and collectors outside the kept centre
MAINS = {nm: rd.Road(nm, d["pts"], hw=d["hw"], rank=d["rank"], sw=d["sw"], flare=5.5 if d["hw"] > 4 else 4.5) for nm, d in LY.MAIN_ROADS.items()}
def crossing(A_, B_):
    best = (1e9, None)
    for (ax, ay) in A_.d[::2]:
        for (bx, by) in B_.d[::2]:
            d_ = math.hypot(ax - bx, ay - by)
            if d_ < best[0]: best = (d_, ((ax + bx) / 2, (ay + by) / 2))
    return best[1]
sx_, sy_ = crossing(PKWY, MAINS["Lyons Rd"]); SHORE_CIRCLE = rd.ring_road("Shore Circle", sx_, sy_, 14.0, 4.5, rank=12, seam=math.pi * .25, flare=5.0, swo=0)
coast = rd.Road("coast", LY.OUTLINE, hw=1.0, closed=True, rank=0, sw=(0, 0), mark=False, flare=0); land_poly = coast.d[::6]
net = rd.build_network([PKWY, WILES, RING, WILES_E, ENTRY, LAKEVIEW, PLAZA_DR, PALM, CUL, SCHOOL_DR, CIVIC_DR, HERON, HERON_CT, PARK_DR, SHORE_CIRCLE, EGRET, EGRET_CT, DEPOT_RD, PROM, SUB1, SUB2, SUB3, SUB4, GATED, GATED_CT, CONDO_DR, CONDO_CIRCLE, PRESERVE_RD, CAMPUS_DR, CLUB_DR] + SUB_CTS + list(MAINS.values()))
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
def on_land(x, y, margin=0.0):
    return inside(land_poly, x, y) and (margin <= 0 or coast.nearest(x, y)[0] >= margin)
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
# ---- land polygon, water, shore skirt, and the per-edge treatment from plan/layout.py (forest belt, fence, highway wall, water)
GB = Builder("ground"); GB.poly(m["grass"], [(p[0], p[1], 0.0) for p in coast.d[::6]]); GB.poly(m["water"], [(-700, -700, -.35), (700, -700, -.35), (700, 700, -.35), (-700, 700, -.35)])
rd.strip(GB, m["bank"], coast, 0.0, coast.L - .5, -0.5, 0.0, 0.0, solid=-0.35)
WALL_M = M("sound_wall", "#d9cdb4", rough=.9); FENCE_M = M("fence_wood", "#8a6a2a", rough=.9)
n_ctrl = len(LY.OUTLINE)
def coast_ranges(kind):
    out = []
    for (i0, i1, k) in LY.EDGES:
        if k != kind: continue
        s0, s1 = coast.nearest(*LY.OUTLINE[i0 % n_ctrl])[1], coast.nearest(*LY.OUTLINE[i1 % n_ctrl])[1]
        if s1 <= s0: s1 += coast.L
        out.append((s0, s1))
    return out
for (i0, i1, kind) in LY.EDGES:
    s0, s1 = coast.nearest(*LY.OUTLINE[i0 % n_ctrl])[1], coast.nearest(*LY.OUTLINE[i1 % n_ctrl])[1]
    if s1 <= s0: s1 += coast.L
    s_ = s0
    while s_ < s1:                                                                                                         # invisible hard edge just inside the shore (cars cannot leave the land)
        x_, y_, tx_, ty_ = coast.at(s_ + 2.5); px_, py_ = coast.off(s_ + 2.5, 2.0); cbox(px_, py_, 5.4, 1.2, round(math.degrees(math.atan2(ty_, tx_)), 1)); s_ += 5.0
    if kind in ("highway", "fence"):
        a_, b_ = (2.4, 3.4) if kind == "highway" else (1.0, 1.15)
        for (u0, u1) in [(s0, min(s1, coast.L - .5))] + ([(0.0, s1 - coast.L + .5)] if s1 > coast.L else []):
            if u1 > u0 + 1: rd.strip(RB, WALL_M if kind == "highway" else FENCE_M, coast, u0, u1, a_, b_, 3.4 if kind == "highway" else 1.2, solid=0.0)
    if kind == "forest":                                                                                                   # dense tree belt: two rows behind the shore
        s_ = s0; kk_ = 0
        while s_ < s1:
            px_, py_ = coast.off(s_, 4.5 + R_.uniform(-1, 1)); prop("oak" if kk_ % 3 else "palm_medium", px_, py_, R_.uniform(1.0, 1.3), col=False)
            if kk_ % 2 == 0: px_, py_ = coast.off(s_ + 3.0, 11.0 + R_.uniform(-2, 2)); prop("oak", px_, py_, R_.uniform(1.1, 1.4), col=False)
            s_ += 6.5; kk_ += 1
STATIC.append(GB.build(vc=False, recalc=False))
# ---- what is free ground (props must not sit on roads, lots, buildings or water)
NOGO = []                                                                                                                # axis-aligned rectangles x0,y0,x1,y1
def free(x, y, pad=0.0, own=None):
    if not on_land(x, y, 6): return False
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
MAP.insert(0, [0, 0, 0, 0, "#5d9a3a", "poly", [[round(p[0], 1), round(p[1], 1)] for p in coast.d[::10]]])
# NE: shopping plaza + parking lot (axis-aligned rectangle, entered from Plaza Dr (aisle y=15) and Plaza Entry (x=58))
OY = 2.6
LX0, LX1, LY0, LY1 = 14, 46, 9.0, 26.0                                                                                   # the shopping plaza is now small: 32 x 17 m lot, 28 x 12 m building
T.box(m["conc"], LX0, LX1, LY1, LY1 + 3.0, 0, .12)
rows = [(9.0, 14.2), (20.8, 26.0)]
islands, stalls = parking_lot(T, m, LX0, LX1, LY0, LY1, rows, 15.0)
mapr(LX0, LY0, LX1, LY1, "#5a5c60"); mapr(LX0, LY1, LX1, LY1 + 3, "#a9a69c"); NOGO.append((LX0 - 2, LY0 - 2, LX1 + 2, 44))
for (ix, iy, iw, idp) in islands:
    cbox(ix, iy, iw, idp, soft="bush")
    if R_.random() < .4: prop("palm_medium", ix, iy, 1.0, col=False)
    else: prop("shrub_a", ix, iy, 1.0, col=False)
plaza = put(make_plaza("plaza", 28, 12, tower_x=-4), 30, 35, 0, 0, 28.5, 12.5); mapr(16, 29, 44, 41, "#c9b48a")
for x in (19, 31, 43): prop("palm_tall", x, 27.8, 1.0)
for x in (20, 32, 44): lamp(T, x, 12.0, -1)
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
    return (best if best < 1e9 else 1e3) - (road.hw + rd.CURB + (rd.SWK if any(road.sw) else 0.0))
FOOTREG = []                                                                                                                      # footprints added by try_place (same tuple format as footprints())
def footprints():
    R = lambda nm, x0, y0, x1, y1, allow=(): (nm, (x0 + x1) / 2, (y0 + y1) / 2, x1 - x0, y1 - y0, 0.0, allow)
    F = [R("plaza lot", LX0, LY0, LX1, LY1, ("Plaza Dr", "Plaza Entry")), R("plaza building", 16, 29, 44, 41), R("townhomes A", -54, 39, -22, 49), R("townhomes B", -47.8, 53, -22.2, 63), R("pool deck", *POOL),
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
    if any(not on_land(x, y, 2.0) for (x, y) in local_pts(ff, 3.0)): bad.append(f"{nm} is off the land or on the shore")
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
    for lk, (ring, _) in LAKES.items():
        if any(not on_land(x, y, 4.0) for (x, y) in ring[::3]): bad.append(f"lake {lk} is too close to the coast")
    for tr in (TRAIL, TRAIL2):
        pts_ = [tr.at(i * tr.L / 80)[:2] for i in range(80)]
        for r in net:
            if r.surf != "asphalt": continue
            worst = min(corridor_dist(r, x, y, cap=8) for (x, y) in pts_)
            if worst < 1.1: bad.append(f"a lake trail overlaps the corridor of {r.name} by {1.1 - worst:.1f} m")
    for r in net:
        if r.surf != "asphalt": continue
        for s_ in [i * 8.0 for i in range(int(r.L // 8) + 1)]:
            px_, py_ = r.at(s_)[:2]
            if not on_land(px_, py_, 2.0): bad.append(f"road {r.name} leaves the land (or touches the shore) near ({px_:.0f}, {py_:.0f})"); break
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
VCACHE = {}
def try_place(kind, maker, x, y, rz, w, d, clearance=1.2, near=None, allow=(), collide=True, tag=None, variants=0, vkey=None):
    f = (f"{kind}{PLACED.get(kind, 0)}", round(x, 2), round(y, 2), w, d, rz, allow)
    if near is not None and not near_road(x, y, near): return None
    pr_ = fp_problems(f, footprints(), clearance)
    if pr_:
        if os.environ.get('DEBUGPLACE'): print('SKIP', pr_[:2])
        return None
    if variants:                                                                                                      # a few house variants, linked duplicates share mesh data (smaller glb, faster parse)
        key = (kind, (vkey if vkey is not None else PLACED.get(kind, 0)) % variants)
        if key in VCACHE: o = bpy.data.objects.new(f[0], VCACHE[key].data); bpy.context.scene.collection.objects.link(o)
        else: o = maker(f[0]); VCACHE[key] = o
    else: o = maker(f[0])
    put(o, x, y, 0, rz, (w + .2) if collide else None, (d + .2) if collide else None, col=collide); FOOTREG.append(f); PLACED[kind] = PLACED.get(kind, 0) + 1
    NOGO.append((x - max(w, d) / 2 - .5, y - max(w, d) / 2 - .5, x + max(w, d) / 2 + .5, y + max(w, d) / 2 + .5)); MAP.append([round(x - w / 2, 1), round(y - d / 2, 1), round(x + w / 2, 1), round(y + d / 2, 1), "#b5603e"]); return o
WALLS = ["cream", "peach", "butter", "sand", "white"]
def row_along(road, side, s0, s1, step, kind, make, w, d, gap=1.5, near=60, clear=1.2):
    n = 0; s_ = s0
    while s_ < s1:
        x, y, tx, ty = road.at(s_); off = side * (road.hw + rd.CURB + (rd.SWK if any(road.sw) else 0.0) + gap + d / 2); px, py = road.off(s_, off)
        rz = math.degrees(math.atan2(ty, tx)) if side > 0 else math.degrees(math.atan2(-ty, -tx))
        if try_place(kind, lambda nm, n=n: make(nm, n % 8), px, py, rz, w, d, clear, near=near, variants=8, vkey=n): n += 1
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
for side in (1, -1): row_along(EGRET, side, 6, EGRET.L - 4, 13.4, "ehome", home_maker, 12, 9, gap=1.6, clear=.3)
for k_, ang in enumerate((-90, 0, 180, 90)):                                                                               # homes around the Egret Ct bulb
    a_ = math.radians(ang); dist = 6 + 2.8 + rd.CURB + rd.SWK + 1.8 + 4.5; px, py = 60 + math.cos(a_) * dist, 17.5 + math.sin(a_) * dist
    try_place("ehome", lambda nm, k_=k_: home_maker(nm, k_ + 3), px, py, math.degrees(a_) - 90, 12, 9, 0.4)
# -- east: gas station + apartments along Wiles Rd E, apartments where the street grid allows
gas_done = False
for gx_ in range(68, 90, 2):
    if gas_done: break
    for gy_ in range(2, 14, 2):
        if try_place("gas", lambda nm: civic.gas_station(nm), gx_ + 9.5, gy_ + 9.5, 0, 18, 19, 1.0, near=16, collide=False):
            fx0, fy0 = gx_ + 9.5, gy_ + 9.5; cbox(fx0, fy0 + 6, 9.4, 6.4); [ccir(fx0 + sx_, fy0 + sy_, .2) for sx_ in (-4.8, 4.8) for sy_ in (-5.4, -.3)]; gas_done = True
            sq = WILES_E.nearest(fx0, fy0 - 9.5)[1]; ex_, ey_ = WILES_E.off(sq, WILES_E.hw + .1); T.box(m["asphalt"], fx0 - 3.6, fx0 + 3.6, min(ey_, fy0 - 9.4) - 0.2, fy0 - 9.4, 0, .16)       # driveway apron to the street
            break
row_along(WILES_E, 1, 8, min(WILES_E.L - 2, WILES_E.nearest(122, -1)[1]), 24.0, "apt", apt_maker, 22, 11, gap=2.5, clear=1.0)
row_along(HERON, -1, 6, HERON.L - 4, 25.0, "apt", apt_maker, 22, 11, gap=3.0, clear=1.0)
for ya in range(4, 40, 6):                                                                                                  # apartments in the east strip, facing the nearest street
    for xa in range(70, 92, 6):
        if PLACED.get("apt", 0) >= 2: break
        try_place("apt", lambda nm, n=len(FOOTREG): apt_maker(nm, n), xa, ya, road_facing_rz(xa, ya), 22, 11, 2.0, near=24)
for xa in range(-92, -18, 12):                                                                                             # townhome rows in the north-west, facing the nearest street
    for ya in range(66, 96, 10):
        if PLACED.get("trow", 0) >= 4: break
        try_place("trow", lambda nm, n=len(FOOTREG): row_maker(nm, n), xa, ya, road_facing_rz(xa, ya), 25.6, 10.2, 2.0, near=24)
def fill(kind, maker, w, d, count, near, clear, excl=(), step=7, seed=5, region=(-92, -92, 92, 92)):                                                  # try grid spots over the whole map (shuffled), fronts toward the nearest street
    rr_ = random.Random(seed); cand = [(x, y) for x in range(region[0], region[2] + 1, step) for y in range(region[1], region[3] + 1, step)]; rr_.shuffle(cand)
    for (x, y) in cand:
        if PLACED.get(kind, 0) >= count: break
        if any(x0 <= x <= x1 and y0 <= y <= y1 for (x0, y0, x1, y1) in excl): continue
        try_place(kind, lambda nm, n=PLACED.get(kind, 0): maker(nm, n % 8), x, y, road_facing_rz(x, y), w, d, clear, near=near, variants=8, vkey=PLACED.get(kind, 0))
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
def scatter(kind, n, x0, y0, x1, y1, pad=3.0, gap=9.0, shrub_too=True):
    placed = []; tries = 0
    while len(placed) < n and tries < n * 40:
        tries += 1; x, y = R_.uniform(x0, x1), R_.uniform(y0, y1)
        if not free(x, y, pad) or any(math.hypot(x - a, y - b) < gap for a, b in placed): continue
        placed.append((x, y)); prop(kind, x, y, R_.uniform(1.0, 1.25) if kind == "oak" else 1.0)
        if shrub_too and R_.random() < .6: prop("shrub_a" if R_.random() < .5 else "shrub_b", x + R_.uniform(-2, 2), y + R_.uniform(-2, 2))
# ================================================================  PLAN DISTRICTS (phase 2): east-centre homes, industrial, retail commons, promenade  ================
fill("ehome", home_maker, 12, 9, 14, 12, .4, step=5, seed=12, region=(44, 6, 100, 100))
# -- industrial lobe (south-east): warehouses along Dock St, Depot Rd and the south arterial, container yards, trucks, water tower
def wh_maker(nm, n): return dk.warehouse(nm, 24, 18, 100 + n)
SA = MAINS["South Arterial"]
for (road_, side_, a_, b_) in ((SA, -1, SA.nearest(122, -128)[1], SA.nearest(188, -140)[1]), (SA, 1, SA.nearest(122, -128)[1], SA.nearest(188, -140)[1]), (DEPOT_RD, 1, 18, DEPOT_RD.L - 4), (DEPOT_RD, -1, 18, DEPOT_RD.L - 4)):
    row_along(road_, side_, a_, b_, 4.0, "wh", wh_maker, 24, 18, gap=1.8, clear=.8)
IND_BOX = (118, -190, 196, -100)
rr_ = random.Random(33)
for _ in range(300):
    x, y = rr_.uniform(IND_BOX[0] + 8, IND_BOX[2] - 8), rr_.uniform(IND_BOX[1] + 6, IND_BOX[3] - 6); rz_ = rr_.choice((0, 90)); w_, d_ = (20.0, 7.0) if rz_ == 0 else (7.0, 20.0)
    if PLACED.get("yard", 0) < 9 and try_place("yard", lambda nm, sd=rr_.randint(1, 99): dk.containers(nm, 3, 2, 2, sd), x, y, rz_, 20.0, 7.0, 2.0, near=22): pass
    elif PLACED.get("truck", 0) < 8 and try_place("truck", lambda nm, sd=rr_.randint(1, 99): dk.truck(nm, sd), x, y, rr_.choice((0, 90)), 3.0, 13.0, 1.5, near=22): pass
for (x, y) in ((150, -150), (146, -152), (160, -152), (172, -150), (140, -146)):
    if try_place("tower", lambda nm: dk.water_tower(nm), x, y, 0, 10, 10, 2.0): break
# -- retail commons (north-west): big-box + two strip plazas, each with its own lot facing Lyons Rd
LY_ = MAINS["Lyons Rd"]
def retail_block(xc, side, w, d_b, name, lot_d=16.0):
    sa = LY_.nearest(xc, 150)[1]; rx, ry, tx, ty = LY_.at(sa); inner = LY_.hw + rd.CURB + rd.SWK + 3.2
    ys_ = [LY_.at(LY_.nearest(xc + dxx * w / 2, 150)[1])[1] for dxx in (-1, -.5, 0, .5, 1)]; ry = max(ys_) if side > 0 else min(ys_)
    y_lot0 = ry + inner if side > 0 else ry - inner - lot_d; y_lot1 = y_lot0 + lot_d
    y_b0, y_b1 = (y_lot1, y_lot1 + d_b) if side > 0 else (y_lot0 - d_b, y_lot0)
    f = (f"{name}", xc, (y_lot0 + y_b1) / 2 if side > 0 else (y_b0 + y_lot1) / 2, w, lot_d + d_b, 0.0, ())
    pr_ = fp_problems(f, footprints(), 1.5)
    if pr_:
        if os.environ.get('DEBUGPLACE'): print('SKIP retail', name, round(xc), pr_[:2])
        return False
    rows_ = [(y_lot0, y_lot0 + 5.2), (y_lot1 - 5.2, y_lot1)]
    isl, stl = parking_lot(T, m, xc - w / 2, xc + w / 2, y_lot0, y_lot1, rows_, xc - w / 2 + 1.0)
    for (ix, iy, iw, idp) in isl: cbox(ix, iy, iw, idp, soft="bush"); prop("shrub_a" if R_.random() < .5 else "palm_small", ix, iy, 1.0, col=False)
    bo = make_plaza(name + "_b", w, d_b, 7.5 if d_b < 20 else 9.0, tower_x=-w / 2 + 8); put(bo, xc, (y_b0 + y_b1) / 2, 0, 0 if side > 0 else 180, w + .5, d_b + .5)
    ry_c = LY_.at(LY_.nearest(xc, 150)[1])[1]; edge_y = ry_c + side * (LY_.hw + .2); T.box(m["asphalt"], xc - 3.6, xc + 3.6, min(edge_y, y_lot0 if side > 0 else y_lot1), max(edge_y, y_lot0 if side > 0 else y_lot1), 0, .16)
    print('RETAIL placed', name, round(xc), round(f[2]))
    FOOTREG.append(f); NOGO.append((xc - w / 2 - 2, f[2] - f[4] / 2 - 2, xc + w / 2 + 2, f[2] + f[4] / 2 + 2)); mapr(xc - w / 2, y_lot0, xc + w / 2, y_lot1, "#5a5c60"); mapr(xc - w / 2, y_b0, xc + w / 2, y_b1, "#c9b48a")
    for (sx_s, sy_s) in stl:
        if R_.random() < .33: PARKED.append((sx_s, sy_s, 0 if sy_s < (y_lot0 + y_lot1) / 2 else 180))
    return True
PARKED = []
for (xc, side, w, d_b, nm) in ((-75, -1, 46, 18, "bigbox"), (-75, 1, 34, 14, "strip0"), (-52, -1, 30, 14, "strip1"), (-100, 1, 30, 14, "strip2"), (-48, 1, 30, 14, "strip3")):
    for dx_ in (0, -6, 6, -12, 12, -18, 18, -24, 24, -30, 30):
        if retail_block(xc + dx_, side, w, d_b, nm): break
# -- promenade (north-east, along the north bay): pedestrian lane, shop rows on both sides, fountain square, garage
PROM_SHOPS = (("restaurant_fl", 7, "#8c1c1c"), ("nails", 5, "#7a2f6a"), ("coffee", 6, "#21453a"), ("pizza", 5, "#b8321f"), ("cleaners", 6, "#a63c2a"))
def prom_maker(nm, n): return make_plaza(nm, 29, 12, 8.0, shops=PROM_SHOPS[n % 5:] + PROM_SHOPS[:n % 5], tower_x=-8, seed=n)
for side in (1, -1): row_along(PROM, side, 2, PROM.L - 12, 30.5, "shop", prom_maker, 29, 12, gap=0.6, clear=.5, near=30)
fx_p, fy_p = PROM.at(PROM.L - 4)[:2]
T.cyl(m["conc"], (fx_p, fy_p, .06), 11.0, .12, "z", 24); T.cyl(m["bank"], (fx_p, fy_p, .14), 4.4, .3, "z", 16); T.cyl(m["water"], (fx_p, fy_p, .25), 3.9, .1, "z", 16)
FB_ = Builder("fountain2"); FB_.cyl(M("fount", "#e8f0f4"), (fx_p, fy_p, 1.3), .4, 2.6, "z", 8, r2=.14); STATIC.append(FB_.build()); ccir(fx_p, fy_p, 4.6)
for q_ in range(1, int(PROM.L // 9)):                                                                                       # planters (soft) and bollards at both ends
    px_, py_, tx_, ty_ = PROM.at(q_ * 9.0); 
    for sd_ in (1, -1): prop("shrub_b" if (q_ + (sd_ > 0)) % 2 else "shrub_a", px_ - ty_ * sd_ * 3.4, py_ + tx_ * sd_ * 3.4, .8)
for sA_ in (1.0, PROM.L - 1.0):
    px_, py_, tx_, ty_ = PROM.at(sA_)
    for sd_ in (-3.5, 0.0, 3.5): ccir(px_ - ty_ * sd_, py_ + tx_ * sd_, .25, "pole")
try_place("garage", lambda nm: dk.garage(nm, 44, 24, 3), 112, 113, 0, 44, 24, 2.0, near=40) or try_place("garage", lambda nm: dk.garage(nm, 44, 24, 3), 128, 132, 0, 44, 24, 2.0, near=40)

def first_fit(kind, maker, w, d, region, step=6, near=None, clear=1.5, rz_fn=None, tries=400):
    xs = list(range(int(region[0]), int(region[2]) + 1, step)); ys = list(range(int(region[1]), int(region[3]) + 1, step)); rr2 = random.Random(len(kind)); cand = [(x, y) for x in xs for y in ys]; rr2.shuffle(cand)
    for (x, y) in cand[:tries]:
        if try_place(kind, maker, x, y, rz_fn(x, y) if rz_fn else 0, w, d, clear, near=near): return True
    return False
# -- suburbs (south-west / west): curvy streets, roomy lots, cul-de-sac bulbs
def ring_homes(cx, cy, kind, n=6, r=6.0, seed=0, gap=2.0):
    for k_ in range(n):
        a_ = math.radians(k_ * 360 / n + 20); dist = r + 2.8 + rd.CURB + rd.SWK + gap + 4.5; px, py = cx + math.cos(a_) * dist, cy + math.sin(a_) * dist
        try_place(kind, lambda nm, k_=k_: home_maker(nm, (k_ + seed) % 8), px, py, math.degrees(a_) - 90, 12, 9, 0.4, variants=8, vkey=k_ + seed)
for rd_ in (SUB1, SUB2, SUB3, SUB4):
    for side in (1, -1): row_along(rd_, side, 6, rd_.L - 4, 15.5, "sub", home_maker, 12, 9, gap=3.0, clear=.4)
for k_, ct in enumerate(SUB_CTS): ring_homes(ct.island[0], ct.island[1] if False else ct.island[1], "sub", 6, 6.0, k_ * 2)
for k_, ct in enumerate(SUB_CTS): pass
# -- gated townhome community (north-west): gate arch over Gated Lane, townhome rows, clubhouse + pool by the bulb
gx_, gy_, gtx, gty = GATED.at(30.0); gate_o = dk.gate("gate_obj", 15)
put(gate_o, gx_, gy_, 0, math.degrees(math.atan2(gty, gtx)) - 90, None, None, col=False)
for sd_ in (-1, 1): ccir(gx_ - gty * sd_ * 7.5, gy_ + gtx * sd_ * 7.5, .9)
FOOTREG.append(("gate", gx_, gy_, 18, 6, math.degrees(math.atan2(gty, gtx)) - 90, ("Gated Lane",)))
def trow_maker(nm, n): return make_row(nm, 4, 6.4, 10, 2, 60 + n)
for side in (1, -1): row_along(GATED, side, 22, GATED.L - 6, 7.0, "grow", trow_maker, 25.6, 10.2, gap=2.2, clear=.6)
first_fit("gclub", lambda nm: make_house(nm, 14, 10, 1, "cream", 2, balcony=False, roof_h=3.2), 14, 10, (-165, 110, -130, 150), 4, 14, 1.5, road_facing_rz)
# -- lakeside homes along Lyons Rd's shore side and the north end of the boulevard
for (road_, side_, a_, b_) in ((MAINS["Lyons Rd"], 1, MAINS["Lyons Rd"].nearest(-58, 146)[1], MAINS["Lyons Rd"].nearest(0, 118)[1]), (PKWY, 1, PKWY.L - 50, PKWY.L - 12), (PKWY, -1, PKWY.L - 50, PKWY.L - 12)):
    row_along(road_, side_, a_, b_, 15.0, "lakeh", home_maker, 12, 9, gap=2.5, clear=.4)
# -- condos (south): towers around Condo Dr and Condo Circle, 5-7 floors
def condo_maker(nm, n): return dk.condo(nm, 26, 14, 5 + n % 3, 200 + n)
for side in (1, -1): row_along(CONDO_DR, side, 3, CONDO_DR.L - 2, 6.0, "condo", condo_maker, 26, 14, gap=3.0, clear=1.2)
for k_ in range(6):
    a_ = math.radians(k_ * 60 + 10); px, py = 92 + math.cos(a_) * 31, -166 + math.sin(a_) * 31
    try_place("condo", lambda nm, k_=k_: condo_maker(nm, k_), px, py, math.degrees(a_) - 90, 26, 14, 1.5, variants=8, vkey=k_)
fill("condo", condo_maker, 26, 14, 8, 20, 1.5, step=9, seed=14, region=(30, -196, 112, -136))
# -- nature preserve (south-west): boardwalk, visitor centre, butterfly dome, dense native trees
BOARDWALK.pieces = [(0.0, BOARDWALK.L, 0, 0, 0, 0)]; rd.draw_road(RB, BOARDWALK, m)
first_fit("visitor", lambda nm: make_house(nm, 16, 10, 1, "white", 3, balcony=False, roof_h=3.0), 16, 10, (-96, -190, -52, -120), 4, 14, 1.5, road_facing_rz)
first_fit("dome", lambda nm: dk.dome(nm), 16, 12, (-96, -190, -52, -120), 4, None, 1.5)
PRES_BOX = (-100, -196, -50, -112)
scatter("oak", 22, *PRES_BOX, pad=2.0, gap=5.5, shrub_too=True); scatter("palm_medium", 12, *PRES_BOX, pad=2.0, gap=7.0, shrub_too=False)
# -- hospital (east): H-shaped block with helipad, facing the East Collector
def _scaled(o, k): o.scale = (k, k, k); return o
first_fit("hospital", lambda nm: _scaled(dk.hospital(nm), .8), 34, 29, (122, -100, 168, -34), 3, 30, 3.0)
# -- school campus and stadium (west arm)
def place_stadium(cx, cy, k=.65):                                                                                              # oval stadium, long axis east-west, scaled by k (the west arm is narrow)
    f = ("stadium", cx, cy, 58 * k, 40 * k, 0.0, ())
    pr_ = fp_problems(f, footprints(), .5)
    if pr_:
        if os.environ.get("DEBUGPLACE"): print("SKIP stadium", round(cx), round(cy), pr_[:2])
        return False
    civic.field(civic.SwapB(T), CM, cy, cx, 16 * k, 30 * k, bleachers=False)
    tr = rd.Road("stad_track", [(cx - 10 * k, cy - 10 * k), (cx + 10 * k, cy - 10 * k), (cx + 16.8 * k, cy - 7.5 * k), (cx + 18.5 * k, cy), (cx + 16.8 * k, cy + 7.5 * k), (cx + 10 * k, cy + 10 * k), (cx - 10 * k, cy + 10 * k), (cx - 16.8 * k, cy + 7.5 * k), (cx - 18.5 * k, cy), (cx - 16.8 * k, cy - 7.5 * k)], hw=2.4 * k, closed=True, rank=1, sw=(0, 0), mark=False, surf="track", curbs=False, flare=0)
    m["track"] = CM["track"]; tr.pieces = [(0.0, tr.L, 0, 0, 0, 0)]; rd.draw_road(RB, tr, m)
    for (o0, o1, hh) in ((-6.0 * k, -3.0 * k, 1.4), (-9.0 * k, -6.0 * k, 2.8), (-12.0 * k, -9.0 * k, 4.2)): rd.strip(RB, CM["steel"], tr, 0.0, tr.L - .5, o0, o1, hh, solid=0.0)
    pl_ = Builder("floodlights")
    for (lx, ly) in ((cx - 25 * k, cy - 15 * k), (cx + 25 * k, cy - 15 * k), (cx - 25 * k, cy + 15 * k), (cx + 25 * k, cy + 15 * k)): pl_.cyl(M("flood_pole", "#8a8d92"), (lx, ly, 9), .25, 18, "z", 6); pl_.box(M("flood_head", "#f0f0e0", emit=.6), lx - .5, lx + .5, ly - 1.2, ly + 1.2, 17.5, 18.6)
    STATIC.append(pl_.build()); cbox(cx, cy, 52 * k, 34 * k, 0); FOOTREG.append(f); NOGO.append((cx - 31 * k, cy - 22 * k, cx + 31 * k, cy + 22 * k)); mapr(cx - 29 * k, cy - 20 * k, cx + 29 * k, cy + 20 * k, "#b3503c"); print("STADIUM placed", round(cx), round(cy)); return True
_c = [(x + .5 * dx, y) for x in range(-156, -142, 1) for dx in (0, 1) for y in range(-6, 40, 2)]; random.Random(5).shuffle(_c)
for (px, py) in _c:
    if place_stadium(px, py): break
first_fit("school2", lambda nm: make_house(nm, 30, 10, 2, "butter", 21, garage=False, balcony=False, roof_h=3.0), 30, 10, (-186, -28, -112, 76), 4, 20, 2.0, road_facing_rz)
for (px, py) in ((-150, -22), (-132, 56), (-118, 40), (-130, -18)):
    if add_static(lambda B_, px=px, py=py: civic.field(B_, CM, px, py, 20, 34, bleachers=False), px, py, 22, 36, "sfield", 2.0): break
# -- golf course (east): fairways, greens, bunkers, cart path, clubhouse + lot
FAIR_M = M("fairway", "#6bbd57", rough=.95); GREEN_M = M("golf_green", "#4fae45", rough=.9); SAND_M = M("bunker", "#e6d9a8", rough=.95)
for (cx, cy, rx, ry, rot, sd) in ((158, 72, 30, 8, -.35, 1), (160, 36, 28, 7, .2, 2), (156, -8, 26, 6, -.1, 3), (150, 92, 20, 6, .1, 4)):
    ctrl = organic(cx, cy, rx, ry, 70 + sd, 12, .12, rot)
    if all(on_land(px, py, 4) for (px, py) in ctrl): rd.flat_blob(RB, FAIR_M, ctrl, .02)
for (gx2, gy2) in ((186, 78), (186, 34), (182, -12), (134, 94)):
    ctrl = organic(gx2, gy2, 6.5, 6.0, 80 + int(gx2 + gy2) % 7, 9, .1, 0)
    if all(on_land(px, py, 3) for (px, py) in ctrl):
        rd.flat_blob(RB, GREEN_M, ctrl, .025); fl = Builder("flag"); fl.cyl(M("flag_pole2", "#f0f0f0"), (gx2, gy2, 1.2), .03, 2.4, "z", 4); fl.box(M("flag_red2", "#dd2222"), gx2, gx2 + .8, gy2 - .02, gy2 + .02, 1.8, 2.3); STATIC.append(fl.build())
        for (bx, by) in ((gx2 - 8, gy2 + 3), (gx2 + 2, gy2 - 8)):
            bc = organic(bx, by, 3.2, 2.4, 90 + int(bx) % 5, 8, .15, 0)
            if all(on_land(px, py, 3) for (px, py) in bc): rd.flat_blob(RB, SAND_M, bc, .03)
CARTPATH.pieces = [(0.0, CARTPATH.L, 0, 0, 0, 0)]
if all(on_land(*CARTPATH.at(i * CARTPATH.L / 40)[:2], 3) for i in range(40)): rd.draw_road(RB, CARTPATH, m)
GL = (138, 38, 158, 58); gl_rows = [(38, 43.2), (52.8, 58)]
gl_isl, gl_stalls = parking_lot(T, m, GL[0], GL[2], GL[1], GL[3], gl_rows, 139.0); mapr(*GL, "#5a5c60"); NOGO.append((GL[0] - 2, GL[1] - 2, GL[2] + 2, GL[3] + 2)); FOOTREG.append(("golf lot", (GL[0] + GL[2]) / 2, (GL[1] + GL[3]) / 2, 20, 20, 0.0, ("Club Dr",)))
for (ix, iy, iw, idp) in gl_isl: cbox(ix, iy, iw, idp, soft="bush"); prop("shrub_a", ix, iy, 1.0, col=False)
for (px, py) in ((148, 70), (152, 74), (144, 66), (150, 80)):
    if try_place("clubhouse2", lambda nm: make_house(nm, 22, 12, 2, "cream", 5, balcony=True, roof_h=3.4), px, py, 0, 22, 12, 1.5): break
scatter("oak", 8, 128, -20, 196, 100, pad=3.0, gap=14.0, shrub_too=False); scatter("palm_tall", 8, 128, -20, 196, 100, pad=3.0, gap=16.0, shrub_too=False)

# ================================================================  STREET FURNITURE & VEGETATION  =========================================
sx_ = CURB_SW + 1.5
for (x, y, tx, ty, s) in along(PKWY, 0, 21, 10):                                                                         # a few median palms, soft shrub beds between
    prop("palm_medium", x, y, 1.0)
for (x, y, tx, ty, s) in along(PKWY, 0, 7, 3.5):
    if (s - 10) % 21 > 2.5 and (s - 10) % 21 < 18.5: prop("shrub_a" if int(s) % 2 else "shrub_b", x, y, .9)
for side, ph in ((1, 0), (-1, 9)):                                                                                       # verge palms ~18 m apart, staggered between the two sides
    for (x, y, tx, ty, s) in along(PKWY, side * (PKWY.hw + sx_), 18, 6 + ph): prop("palm_tall" if int(s / 9) % 2 else "palm_medium", x, y, 1.0)
    for (x, y, tx, ty, s) in along(PKWY, side * (PKWY.hw + CURB_SW - .6), 38, 12 + ph * 2): lamp_round(x, y, -ty * -side * 1.0, tx * -side * 1.0 if False else tx * 0, 5.5) if False else lamp_round(x, y, ty * side, -tx * side, 5.5)
for road, sp in ((WILES, 22), (WILES_E, 22), (LAKEVIEW, 19), (PALM, 17), (EGRET, 20), (DEPOT_RD, 30), (SUB1, 22), (SUB2, 22), (SUB3, 22), (GATED, 24), (CONDO_DR, 26), (CAMPUS_DR, 22), (CLUB_DR, 26)) + tuple((r_m, 24) for r_m in MAINS.values()):
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
for (sx_s, sy_s, rz) in PARKED:
    addcar("sedan", R_.choice(PAL), f"parked{k}", sx_s, sy_s, rz); cbox(sx_s, sy_s, 1.8, 4.5, rz); COL[-1]["car"] = f"parked{k}"; k += 1
for (stl, aisle_y, prob) in ((stalls, 17.5, .30), (hl_stalls, -86.2, .35), (sch_stalls, -43.25, .45), (pl_stalls, -87.1, .25)):
    for (sx_s, sy_s) in stl:
        if R_.random() < prob:
            rz = 0 if sy_s < aisle_y else 180
            addcar("sedan", R_.choice(PAL), f"parked{k}", sx_s, sy_s, rz); cbox(sx_s, sy_s, 1.8, 4.5, rz); COL[-1]["car"] = f"parked{k}"; k += 1
# ================================================================  WORLD EDGE + DATA  =======================================================
T.cyl(M("shadow_dummy", "#000000"), (0, 0, -5), .01, .01, "z", 3); terr = T.build(vc=True); STATIC.append(terr); STATIC.extend(RB.build(vc=True, recalc=False))
def sidewalk_path(road, side): return [[round(a, 2), round(b, 2)] for a, b in rd.lane_path(road, side * (road.hw + rd.CURB + 1.2))]
WALK = [{"path": sidewalk_path(PKWY, 1)}, {"path": sidewalk_path(PKWY, -1)}, {"path": sidewalk_path(WILES, 1)}, {"path": sidewalk_path(WILES, -1)}, {"path": sidewalk_path(PALM, 1)}, {"path": sidewalk_path(PALM, -1)},
        {"path": [[15, 27.8], [45, 27.8]]}, {"path": [[round(a, 2), round(b, 2)] for a, b in rd.lane_path(TRAIL, 0)], "closed": True}, {"path": sidewalk_path(LAKEVIEW, 1)}, {"path": sidewalk_path(HERON, 1)}, {"path": sidewalk_path(HERON, -1)}, {"path": sidewalk_path(PARK_DR, 1)}]
ROADLINES = [{"pts": [[round(a, 1), round(b, 1)] for a, b in rd.lane_path(r, 0, step=6, s0=p[0], s1=p[1])], "w": round(2 * r.hw, 1), "closed": r.closed} for r in net if r.surf == "asphalt" for p in r.pieces]
WORLD = {"name": "coconut", "title": "Coconut Creek", "glb": "scene.glb", "mapbg": "#2d78b8", "extent": EXT - 4, "sky": "#8fc3f5", "fog": ["#c4dcf2", 110, 320], "hemi": ["#cfe4ff", "#6f8a4a", 1.55], "sun": {"color": "#fff0d6", "intensity": 3.7, "dir": [-0.5, -0.74, 0.45]},
         "exposure": 1.0, "tone": "AgX", "lamps": [], "ground": "#5d9a3a", "start": START, "money": 1250, "traffic": TRAFFIC, "walk": WALK, "walkers": 16, "fight": {"x": 24, "y": 27.8}, "demo": None,
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
    SHOTS = {"cc_city": ((0, 0, 0), 60, 560, 1200, 1200), "cc_ind": ((150, -150, 0), 52, 120, 1000, 640), "cc_retail": ((-75, 140, 0), 50, 110, 1000, 640), "cc_prom": ((118, 142, 0), 50, 110, 1000, 640), "cc_sub": ((-145, -100, 0), 50, 120, 1000, 640),
             "cc_gated": ((-150, 135, 0), 50, 100, 1000, 640), "cc_condo": ((70, -160, 0), 50, 110, 1000, 640), "cc_golf": ((160, 50, 0), 50, 120, 1000, 640), "cc_school": ((-150, 20, 0), 50, 120, 1000, 640), "cc_pres": ((-75, -150, 0), 50, 100, 1000, 640), "cc_hosp": ((140, -65, 0), 50, 100, 1000, 640), "cc_game": ((START["x"], START["y"] + 8, 0), 45, 44, 540, 960)}
    if os.environ.get("SHOT"): x_, y_, p_, d_ = [float(v) for v in os.environ["SHOT"].split(",")]; SHOTS = {"dbg": ((x_, y_, 0), p_, d_, 1000, 700)}
    for nm, (tgt, pitch, dist, w, h) in SHOTS.items():
        for o in [x for x in bpy.context.scene.objects if x.type == "CAMERA"]: bpy.data.objects.remove(o)
        game_camera(tgt, pitch, dist); render(os.path.join(OUT, nm + ".png"), w, h, samples=20, keep_transform=True)
export_glb("coconut_scene", [o for o in STATIC if o.type in ("MESH", "EMPTY")])
print("EXPORTED")
