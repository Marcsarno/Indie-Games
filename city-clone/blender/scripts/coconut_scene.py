"""Coconut Creek first slice. Run: blender -b --python scripts/coconut_scene.py   (env NORENDER=1 to only export; needs out/tex from textures.py)
Exports to out/: coconut_scene.glb (static), props.json (vegetation instances), colliders.json, cars.json, world.json."""
import sys, os, json, math, random; sys.path.insert(0, os.path.dirname(__file__)); sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'plan'))
import map_px as MP
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


# ================================================================  ROADS (plan v5: plan/map_px.py traced from the reference map)  ====================
import map_px as MP
EXT = 290
ROADS_M = MP.roads_m(); BRIDGE_ZONES = []
def mk_road(d):
    nm, hw = d["name"], d["hw"]; kw = dict(hw=hw, rank=d["rank"], flare=5.5 if hw > 4 else 4.5)
    if nm == "Coconut Creek Pkwy": kw.update(mh=1.6, xwalk=True)
    if nm == "South Loop Rd": kw.update(mh=1.2, xwalk=True)
    if nm in ("Wiles Rd", "Palm Blvd", "Northridge Rd", "Creekview Dr", "West Creek Rd", "Creekside Loop"): kw.update(xwalk=True)
    if nm == "Lyons Promenade": kw.update(sw=(0, 0), mark=False, surf="walk", curbs=False, flare=0)
    return rd.Road(nm, d["pts"], **kw)
def extend_ends(pts, push, ends):
    out = list(pts)
    if -1 in ends: a, b = out[-2], out[-1]; l = math.dist(a, b) or 1; out.append((b[0] + (b[0] - a[0]) / l * push, b[1] + (b[1] - a[1]) / l * push))
    if 0 in ends: a, b = out[1], out[0]; l = math.dist(a, b) or 1; out.insert(0, (b[0] + (b[0] - a[0]) / l * push, b[1] + (b[1] - a[1]) / l * push))
    return out
ROAD = {}
for d in ROADS_M:
    ROAD[d["name"]] = mk_road(dict(d, pts=extend_ends(d["pts"], 5.5, d["push"])))                                              # T-junction ends are pushed 5.5 m through the parent so the cutter sees a crossing
PKWY, WILES = ROAD["Coconut Creek Pkwy"], ROAD["Wiles Rd"]
coast = rd.Road("coast", MP.coast_m(), hw=1.0, closed=True, rank=0, sw=(0, 0), mark=False, flare=0); land_poly = coast.d[::4]
net = rd.build_network(list(ROAD.values()))
tick_('network')
# ---- water: traced lakes / canals (holes in the land), land test, bridges where a road runs over water
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
LAKES = {}; LAKE_BB = {}
for i, hole in enumerate(MP.holes_m()):
    ring0 = rd.blob(hole, 2.5); ring, tris = rd.lake_poly(RB, m, ring0); cen_ = (sum(p[0] for p in ring) / len(ring), sum(p[1] for p in ring) / len(ring)); LAKES[f"lake{i}"] = (ring, cen_)
    LAKE_BB[f"lake{i}"] = (min(p[0] for p in ring), min(p[1] for p in ring), max(p[0] for p in ring), max(p[1] for p in ring))
    for q in rd.tri_colliders(tris): COL.append(q)
    MAP.append([round(cen_[0], 1), round(cen_[1], 1), 0, 0, "#2d78b8", "poly", [[round(p[0], 1), round(p[1], 1)] for p in ring]])
def in_lake(x, y, pad=0.0):
    for k, (ring, _) in LAKES.items():
        b = LAKE_BB[k]
        if b[0] - pad - 2 < x < b[2] + pad + 2 and b[1] - pad - 2 < y < b[3] + pad + 2 and inside(ring, x, y, pad): return True
    return False
def raw_land(x, y): return inside(land_poly, x, y) and not in_lake(x, y)
def on_land(x, y, margin=0.0):
    return raw_land(x, y) and (margin <= 0 or coast.nearest(x, y)[0] >= margin)
BRIDGES = []                                                                                                              # (road, s0, s1): stretches of road over water
for r in net:
    if r.surf != "asphalt": continue
    wet = [s_ for s_ in [i * 1.0 for i in range(int(r.L) + 1)] if not raw_land(*r.at(s_)[:2])]
    if not wet: continue
    runs = [[wet[0], wet[0]]]
    for s_ in wet[1:]:
        if s_ - runs[-1][1] <= 6: runs[-1][1] = s_
        else: runs.append([s_, s_])
    for a_, b_ in runs: BRIDGES.append((r, max(0.0, a_ - 3.0), min(r.L, b_ + 3.0)))
print("BRIDGES", [(r.name, round(a), round(b)) for r, a, b in BRIDGES])
def near_bridge(x, y, d=9.0):
    for r, a, b in BRIDGES:
        for s_ in [a + k * 3.0 for k in range(int((b - a) / 3.0) + 1)]:
            px_, py_ = r.at(s_)[:2]
            if abs(px_ - x) < d and abs(py_ - y) < d and math.hypot(px_ - x, py_ - y) < d: return True
    return False
for r in net: rd.draw_road(RB, r, m)
tick_('roads drawn')
RAIL_M = M("bridge_rail", "#cfc8b8", rough=.9)
for (r, a_, b_) in BRIDGES:                                                                                               # concrete rails + colliders along each bridge, plus a closed-off barrier where a bridge leaves the map
    for side in (1, -1):
        w_ = r.hw + rd.CURB + (rd.SWK if r.sw[0 if side > 0 else 1] else 0.0)
        o0, o1 = (w_, w_ + .35) if side > 0 else (-w_ - .35, -w_)
        rd.strip(RB, RAIL_M, r, a_, b_, o0, o1, 1.0, solid=-.2)
        s_ = a_ + 2.0
        while s_ < b_ - 1:
            x_, y_, tx_, ty_ = r.at(s_); px_, py_ = r.off(s_, side * (w_ + .17)); cbox(px_, py_, 4.4, .5, round(math.degrees(math.atan2(ty_, tx_)), 1)); s_ += 4.0
WORLD_EDGE_ENDS = [(r, r.L if b_ >= r.L - .5 else 0.0) for (r, a_, b_) in BRIDGES if b_ >= r.L - .5 or a_ <= .5]
for (r, s_) in WORLD_EDGE_ENDS:                                                                                           # "bridge closed" barrier across the road at the map edge
    x_, y_, tx_, ty_ = r.at(s_); w_ = r.hw + rd.CURB + rd.SWK; ang_ = round(math.degrees(math.atan2(ty_, tx_)), 1); bx_, by_ = x_ - tx_ * .6, y_ - ty_ * .6
    cbox(bx_, by_, 1.0, 2 * w_ + 1.0, ang_)
    BR_ = Builder("road_barrier")
    for k_ in range(10):
        t_ = -w_ + (k_ + .5) * 2 * w_ / 10; px_, py_ = bx_ - ty_ * t_, by_ + tx_ * t_; BR_.cyl(M("barrier_red" if k_ % 2 else "barrier_white", "#d12b2b" if k_ % 2 else "#f2f2f2"), (px_, py_, .55), .3, 1.1, "z", 6)
    STATIC.append(BR_.build())
# ---- land polygon, water plane, beach skirt
from mathutils import Vector, geometry
def flat_poly(B, mat, pts, z):                                                                                            # robust triangulation of a big concave outline (the exporter's n-gon triangulation garbles the coast)
    tris = geometry.tessellate_polygon([[Vector((x, y, 0.0)) for x, y in pts]])
    for (i, j, k) in tris:
        a, b, c = pts[i], pts[j], pts[k]; cr = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
        B.poly(mat, [(*a, z), (*b, z), (*c, z)] if cr > 0 else [(*a, z), (*c, z), (*b, z)])
GB = Builder("ground"); flat_poly(GB, m["grass"], coast.d[::4], 0.0); GB.poly(m["water"], [(-640, -640, -.35), (640, -640, -.35), (640, 640, -.35), (-640, 640, -.35)])
rd.strip(GB, m["bank"], coast, 0.0, coast.L - .5, -0.6, 0.0, 0.0, solid=-0.35)
s_ = 0.0
while s_ < coast.L:                                                                                                       # invisible hard edge just inside the shore (cars cannot leave the land), except where a bridge crosses
    x_, y_, tx_, ty_ = coast.at(s_ + 2.5); px_, py_ = coast.off(s_ + 2.5, 1.8)
    if not near_bridge(px_, py_, 7.5): cbox(px_, py_, 5.4, 1.2, round(math.degrees(math.atan2(ty_, tx_)), 1))
    s_ += 5.0
STATIC.append(GB.build(vc=False, recalc=False))
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


# ================================================================  STAGE 1 EXPORT  ===========================================================
T.cyl(M("shadow_dummy", "#000000"), (0, 0, -5), .01, .01, "z", 3); STATIC.append(T.build(vc=True)); STATIC.extend(RB.build(vc=True, recalc=False))
def addcar(kind, color, name, x, y, rz=0):
    root = make_car(kind, color, name); root.location = (x, y, .03); root.rotation_euler = (0, 0, math.radians(rz)); CARS.append({"name": name, "kind": kind, "color": color, "x": round(x, 2), "y": round(y, 2), "rz": round(rz, 1)}); return root
def pose(road, off, s, rev=False):
    x, y, tx, ty = road.at(s); px, py = road.off(s, off); a = math.degrees(math.atan2(-tx, ty)) + (180 if rev else 0); return px, py, a
LANE = (PKWY.mh + (PKWY.hw - PKWY.mh) * .27)
ps = PKWY.nearest(0, -20)[1]; px_, py_, pa = pose(PKWY, -LANE, ps); addcar("sedan", "#c8201c", "player", px_, py_, pa); START = {"x": round(px_, 2), "y": round(py_, 2), "rz": round(pa, 1)}
ROADLINES = [{"pts": [[round(a, 1), round(b, 1)] for a, b in rd.lane_path(r, 0, step=6, s0=p[0], s1=p[1])], "w": round(2 * r.hw, 1), "closed": r.closed} for r in net if r.surf == "asphalt" for p in r.pieces]
MAP.insert(0, [0, 0, 0, 0, "#5d9a3a", "poly", [[round(p[0], 1), round(p[1], 1)] for p in coast.d[::10]]])
WORLD = {"name": "coconut", "title": "Coconut Creek", "glb": "scene.glb", "mapbg": "#2d78b8", "extent": EXT - 4, "sky": "#8fc3f5", "fog": ["#c4dcf2", 110, 320], "hemi": ["#cfe4ff", "#6f8a4a", 1.55], "sun": {"color": "#fff0d6", "intensity": 3.7, "dir": [-0.5, -0.74, 0.45]},
         "exposure": 1.0, "tone": "AgX", "lamps": [], "ground": "#5d9a3a", "start": START, "money": 1250, "traffic": [], "walk": [], "walkers": 0, "fight": {"x": START["x"] + 6, "y": START["y"]}, "demo": None,
         "views": {"drive": {"label": "Play", "mode": "drive", "pitch": 45, "dist": 44}, "over": {"label": "Overview", "tx": 0, "ty": 0, "pitch": 40, "dist": 420}},
         "map": MAP, "roads": ROADLINES}
json.dump(COL, open(os.path.join(OUT, "colliders_coconut.json"), "w")); json.dump(PROPS, open(os.path.join(OUT, "props_coconut.json"), "w")); json.dump(CARS, open(os.path.join(OUT, "cars_coconut.json"), "w")); json.dump(WORLD, open(os.path.join(OUT, "world_coconut.json"), "w"))
print("COCONUT colliders", len(COL), "props", len(PROPS), "cars", len(CARS)); tick_('written')
if not os.environ.get("NORENDER"):
    tmpl = {k_: f() for k_, f in veg.KIT.items()}
    for o in tmpl.values(): o.hide_render = True; o.location = (0, 0, -50)
    for p in PROPS:
        o = bpy.data.objects.new(p["k"], tmpl[p["k"]].data); bpy.context.scene.collection.objects.link(o); o.location = (p["x"], p["y"], 0)
        o.rotation_euler = (0, 0, math.radians(p["rz"])); o.scale = (p["s"], p["s"], p["s"]) if p["k"] != "hedge" else (1, 1, 1)
    SHOTS = {"cc_city": ((0, -14, 0), 62, 700, 1400, 1200)}
    if os.environ.get("SHOT"): x_, y_, p_, d_ = [float(v) for v in os.environ["SHOT"].split(",")]; SHOTS = {"dbg": ((x_, y_, 0), p_, d_, 1000, 700)}
    for nm, (tgt, pitch, dist, w, h) in SHOTS.items():
        for o in [x for x in bpy.context.scene.objects if x.type == "CAMERA"]: bpy.data.objects.remove(o)
        game_camera(tgt, pitch, dist); render(os.path.join(OUT, nm + ".png"), w, h, samples=20, keep_transform=True)
export_glb("coconut_scene", [o for o in STATIC if o.type in ("MESH", "EMPTY")])
print("EXPORTED")
