"""Coconut Creek first slice. Run: blender -b --python scripts/coconut_scene.py   (env NORENDER=1 to only export; needs out/tex from textures.py)
Exports to out/: coconut_scene.glb (static), props.json (vegetation instances), colliders.json, cars.json, world.json."""
import sys, os, json, math, random; sys.stdout.reconfigure(line_buffering=True); sys.path.insert(0, os.path.dirname(__file__)); sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'plan'))
import map_px as MP
from kit import *; from street_fl import *; from building_fl import make_house, make_row, make_plaza; import vegetation as veg; from car import make_car; import vehicles as VH; import mood; import roads as rd; import civic; import district_kits as dk; import time as _t; T0 = _t.time()
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
    nm, hw = d["name"], d["hw"]; kw = dict(hw=hw, rank=d["rank"], flare=5.5 if hw > 4 else 4.5 if hw > 3.3 else 3.4)
    if nm == "Lyons Rd": kw.update(mh=2.0, xwalk=True, flare=7.0)                                                          # the big main road: 3 lanes each way + palm median
    if nm == "South Loop Rd": kw.update(mh=1.2, xwalk=True)
    if nm in ("Wiles Rd", "Coconut Creek Pkwy", "Northridge Rd", "Creekview Dr", "West Creek Rd", "Creekside Loop"): kw.update(xwalk=True)
    if nm == "Lyons Promenade": kw.update(sw=(0, 0), mark=False, surf="walk", curbs=False, flare=0)
    return rd.Road(nm, d["pts"], **kw)
def extend_ends(pts, push, ends):
    out = list(pts); push = push if isinstance(push, dict) else {e: push for e in ends}
    if -1 in ends: a, b = out[-2], out[-1]; l = math.dist(a, b) or 1; out.append((b[0] + (b[0] - a[0]) / l * push[-1], b[1] + (b[1] - a[1]) / l * push[-1]))
    if 0 in ends: a, b = out[1], out[0]; l = math.dist(a, b) or 1; out.insert(0, (b[0] + (b[0] - a[0]) / l * push[0], b[1] + (b[1] - a[1]) / l * push[0]))
    return out
HW_OF = {d["name"]: d["hw"] for d in ROADS_M}
ROAD = {}
for d in ROADS_M:
    ROAD[d["name"]] = mk_road(dict(d, pts=extend_ends(d["pts"], {i: max(1.5, min(5.5, HW_OF[d["parents"][i]] - .8)) for i in d["push"]}, d["push"])))   # T-junction ends are pushed through the parent (but stay inside its far kerb, no stub) so the cutter sees a crossing
PKWY, WILES = ROAD["Lyons Rd"], ROAD["Wiles Rd"]
PKWY.keep_median = set(MP.RIRO.get("Lyons Rd", ()))
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
def inset_poly(ring, d):                                                                                                    # move a CCW outline inward by d (the traced shore sits at the road edge; this leaves room for the bank)
    n = len(ring); out = []
    for i in range(n):
        a, b = ring[i - 1], ring[(i + 1) % n]; tx, ty = b[0] - a[0], b[1] - a[1]; l = math.hypot(tx, ty) or 1; out.append((ring[i][0] - ty / l * d, ring[i][1] + tx / l * d))
    return out
def road_gap(x, y, pad=0.0):
    """Distance from (x, y) to the nearest drivable road edge (negative = on the asphalt)."""
    best = 1e9
    for r in net:
        if r.surf != "asphalt" or not (r.bb[0] - 12 < x < r.bb[2] + 12 and r.bb[1] - 12 < y < r.bb[3] + 12): continue
        best = min(best, r.nearest(x, y)[0] - r.hw - rd.CURB)
    return best
def off_roads(tris, depth=0):
    """Lake collision triangles, split (up to 5 times) where they reach over a road; pieces under a road are dropped."""
    out = []
    for (a, b, c) in tris:
        pts = [a, b, c, ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2), ((b[0] + c[0]) / 2, (b[1] + c[1]) / 2), ((a[0] + c[0]) / 2, (a[1] + c[1]) / 2), ((a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3)]
        size = max(math.dist(a, b), math.dist(b, c), math.dist(a, c)); nn = max(2, min(10, int(size / 2.5)))
        smp = [(a[0] * (1 - u - v) + b[0] * u + c[0] * v, a[1] * (1 - u - v) + b[1] * u + c[1] * v) for i in range(nn + 1) for j in range(nn + 1 - i) for u, v in ((i / nn, j / nn),)]
        g = min(road_gap(*p) for p in smp)
        if g > .4: out.append((a, b, c)); continue                                                       # does not reach over any road
        if size < 3.0 or depth >= 5:
            if g > .4: out.append((a, b, c))
            continue
        ab, bc, ca = pts[3], pts[4], pts[5]
        out += off_roads([(a, ab, ca), (ab, b, bc), (ca, bc, c), (ab, bc, ca)], depth + 1)
    return out
LAKES = {}; LAKE_BB = {}
for i, hole in enumerate(MP.holes_m()):
    ring0 = inset_poly(rd.blob(hole, 2.5), 2.0); ring, tris = rd.lake_poly(RB, m, ring0); cen_ = (sum(p[0] for p in ring) / len(ring), sum(p[1] for p in ring) / len(ring)); LAKES[f"lake{i}"] = (ring, cen_)
    LAKE_BB[f"lake{i}"] = (min(p[0] for p in ring), min(p[1] for p in ring), max(p[0] for p in ring), max(p[1] for p in ring))
    for q in rd.tri_colliders(off_roads(tris)): COL.append(q)
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
    for a_, b_ in runs:
        if b_ - a_ < 2.5 and (a_ < 4 or b_ > r.L - 4): continue                                              # a road end grazing the shore is not a bridge
        BRIDGES.append((r, max(0.0, a_ - 3.0), min(r.L, b_ + 3.0)))
LAKE_COL0 = 0
print("BRIDGES", [(r.name, round(a), round(b)) for r, a, b in BRIDGES])
def near_bridge(x, y, d=9.0):
    for r, a, b in BRIDGES:
        for s_ in [a + k * 3.0 for k in range(int((b - a) / 3.0) + 1)]:
            px_, py_ = r.at(s_)[:2]
            if abs(px_ - x) < d and abs(py_ - y) < d and math.hypot(px_ - x, py_ - y) < d: return True
    return False
def bridge_margin(x, y):
    """Distance from (x, y) to the outer edge of the nearest bridge deck (incl. sidewalks), metres; negative = on the deck."""
    best = 1e9
    for r, a, b in BRIDGES:
        w_ = r.hw + rd.CURB + rd.SWK
        for s_ in [a - 6 + k * .75 for k in range(int((b - a + 12) / .75) + 1)]:
            px_, py_ = r.at(min(r.L, max(0.0, s_)))[:2]; best = min(best, math.hypot(px_ - x, py_ - y) - w_)
    return best
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
GATE_M = [MP.to_m(p) for _, p in MP.EDGE_GATES]
WORLD_EDGE_ENDS = [(r, r.L if b_ >= r.L - .5 else 0.0) for (r, a_, b_) in BRIDGES if (b_ >= r.L - .5 or a_ <= .5) and any(math.dist(r.at(r.L if b_ >= r.L - .5 else 0.0)[:2], g) < 30 for g in GATE_M)]
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
    if not near_bridge(px_, py_, 16.0):
        if road_gap(px_, py_) < 3.4:                                                                                    # a road runs along the shore here: use short pieces right at the shore, clear of the asphalt
            for k_ in range(5):
                x_, y_, tx_, ty_ = coast.at(s_ + .5 + k_)
                for o_ in (1.8, .6, -.4):
                    px_, py_ = coast.off(s_ + .5 + k_, o_)
                    if road_gap(px_, py_) > .9: cbox(px_, py_, 1.2, 1.2, round(math.degrees(math.atan2(ty_, tx_)), 1)); break
        else: cbox(px_, py_, 5.4, 1.2, round(math.degrees(math.atan2(ty_, tx_)), 1))
    else:                                                                                                             # next to a bridge: short pieces right up to the bridge deck edge, so nothing slips between rail and shore
        for k_ in range(5):
            x_, y_, tx_, ty_ = coast.at(s_ + .5 + k_); px_, py_ = coast.off(s_ + .5 + k_, 1.8)
            if bridge_margin(px_, py_) > .7 and road_gap(px_, py_) > .9: cbox(px_, py_, 1.2, 1.2, round(math.degrees(math.atan2(ty_, tx_)), 1))
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
def footprints(): return FOOTREG
def local_pts(f, step=1.0):
    nm, cx, cy, w, d, rz, _ = f; c_, s_ = math.cos(math.radians(rz)), math.sin(math.radians(rz)); out = []
    for i in range(max(2, int(w / step)) + 1):
        for j in range(max(2, int(d / step)) + 1):
            u, v = -w / 2 + w * i / max(2, int(w / step)), -d / 2 + d * j / max(2, int(d / step)); out.append((cx + u * c_ - v * s_, cy + u * s_ + v * c_))
    return out
def in_rect(f, x, y):
    nm, cx, cy, w, d, rz, _ = f; c_, s_ = math.cos(math.radians(rz)), math.sin(math.radians(rz)); u, v = (x - cx) * c_ + (y - cy) * s_, -(x - cx) * s_ + (y - cy) * c_
    return abs(u) <= w / 2 and abs(v) <= d / 2
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
            if worst < -.5: bad.append(f"lake {lk} shore is within {worst:.1f} m of the corridor of {r.name} (water under the road)")
    for r in net:
        if r.surf != "asphalt": continue
        for s_ in [i * 8.0 for i in range(int(r.L // 8) + 1)]:
            px_, py_ = r.at(s_)[:2]
            if not on_land(px_, py_, .5) and not near_bridge(px_, py_, 12.0): bad.append(f"road {r.name} leaves the land (or touches the shore) near ({px_:.0f}, {py_:.0f})"); break
    print("LAYOUT", "OK" if not bad else "PROBLEMS"); [print("  -", b) for b in bad]
    return bad
# ================================================================  PLACEMENT HELPERS (try-fit: only what passes the layout critic is built)  ======================
DM = MP.districts_m(); LM = MP.landmarks_m()
def D(name): return DM[name][2]
def bbox(poly): return (min(p[0] for p in poly), min(p[1] for p in poly), max(p[0] for p in poly), max(p[1] for p in poly))
def centroid(poly): return (sum(p[0] for p in poly) / len(poly), sum(p[1] for p in poly) / len(poly))
RG = {}
for r_ in net:
    if r_.surf != "asphalt": continue
    for s_ in range(0, int(r_.L) + 1, 3):
        x_, y_ = r_.at(s_)[:2]; RG.setdefault((int(x_ // 24), int(y_ // 24)), []).append((x_, y_, r_.hw + rd.CURB + (rd.SWK if any(r_.sw) else 0.0)))
def near_road(x, y, maxd):                                                                                                  # is a street corridor within maxd metres? (grid of road samples, fast)
    ci, cj = int(x // 24), int(y // 24); n = int(maxd // 24) + 1
    for i in range(ci - n, ci + n + 1):
        for j in range(cj - n, cj + n + 1):
            for (px, py, w) in RG.get((i, j), ()):
                if math.hypot(px - x, py - y) - w < maxd: return True
    return False
def road_facing_rz(x, y):                                                                                                  # rz that turns a house front (-y) toward the nearest street
    best = None
    for r in net:
        if r.surf != "asphalt": continue
        d_, s_ = r.nearest(x, y)
        if best is None or d_ < best[0]: best = (d_, r.at(s_)[:2])
    dx, dy = best[1][0] - x, best[1][1] - y; l = math.hypot(dx, dy) or 1; return math.degrees(math.atan2(dx / l, -dy / l))
PLACED = {}; VCACHE = {}; PARKED = []; LOTS = []; REJ = {}
def try_place(kind, maker, x, y, rz, w, d, clearance=1.2, near=None, allow=(), collide=True, tag=None, variants=0, vkey=None, wall_map="#b5603e"):
    if near is not None and not near_road(x, y, near): return None
    if callable(rz): rz = rz(x, y)
    f = (f"{kind}{PLACED.get(kind, 0)}", round(x, 2), round(y, 2), w, d, rz, allow)
    pr_ = fp_problems(f, footprints(), clearance)
    if pr_:
        key_ = (kind, "land" if "off the land" in pr_[0] else "road" if "corridor" in pr_[0] else "lake" if "lake" in pr_[0] else "overlap"); REJ[key_] = REJ.get(key_, 0) + 1
        if os.environ.get('DEBUGPLACE') or kind in os.environ.get('DEBUGKIND', '').split(','): print('SKIP', kind, pr_[:2])
        return None
    if variants:                                                                                                      # a few variants, linked duplicates share mesh data (smaller glb, faster parse)
        key = (kind, (vkey if vkey is not None else PLACED.get(kind, 0)) % variants)
        if key in VCACHE: o = bpy.data.objects.new(f[0], VCACHE[key].data); bpy.context.scene.collection.objects.link(o)
        else: o = maker(f[0]); VCACHE[key] = o
    else: o = maker(f[0])
    put(o, x, y, 0, rz, (w + .2) if collide else None, (d + .2) if collide else None, col=collide); FOOTREG.append(f); PLACED[kind] = PLACED.get(kind, 0) + 1
    NOGO.append((x - max(w, d) / 2 - .5, y - max(w, d) / 2 - .5, x + max(w, d) / 2 + .5, y + max(w, d) / 2 + .5)); MAP.append([round(x - w / 2, 1), round(y - d / 2, 1), round(x + w / 2, 1), round(y + d / 2, 1), wall_map]); return o
WALLS = ["cream", "peach", "butter", "sand", "white"]
def row_along(road, side, s0, s1, step, kind, make, w, d, gap=1.5, near=None, clear=1.2, within=None, variants=8):
    n = 0; s_ = s0
    while s_ < s1:
        x, y, tx, ty = road.at(s_); off = side * (road.hw + rd.CURB + (rd.SWK if any(road.sw) else 0.0) + gap + d / 2); px, py = road.off(s_, off)
        if within is not None and not inside(within, px, py): s_ += step; continue
        rz = math.degrees(math.atan2(ty, tx)) if side > 0 else math.degrees(math.atan2(-ty, -tx))
        if try_place(kind, lambda nm, n=n: make(nm, n % 8), px, py, rz, w, d, clear, near=near, variants=variants, vkey=n): n += 1
        s_ += step
    return n
def frontage(poly, kind, maker, w, d, step=None, gap=1.6, clear=.5, max_rank=6.5, only=None, skip=(), sides=(1, -1)):
    """Houses (or any block) along every street that crosses the district polygon, fronts toward the street."""
    bb = bbox(poly); n = 0
    for nm, r in ROAD.items():
        if r.surf != "asphalt" or r.rank > max_rank or nm in skip or (only and nm not in only): continue
        if r.bb[0] > bb[2] + 12 or r.bb[2] < bb[0] - 12 or r.bb[1] > bb[3] + 12 or r.bb[3] < bb[1] - 12: continue
        for side in sides: n += row_along(r, side, 3, r.L - 3, step or (w + 2.0), kind, maker, w, d, gap=gap, clear=clear, within=poly)
    return n
def in_any(poly, pts): return all(inside(poly, x, y) for x, y in pts)
def spots(poly, step=4, seed=1, margin=0.0):
    bb = bbox(poly); rr_ = random.Random(seed); c = [(x, y) for x in range(int(bb[0]), int(bb[2]) + 1, step) for y in range(int(bb[1]), int(bb[3]) + 1, step) if inside(poly, x, y)]; rr_.shuffle(c); return c
def fill_poly(poly, kind, maker, w, d, count, near, clear, step=5, seed=5, variants=8, rz_fn=None):
    n = 0
    for (x, y) in spots(poly, step, seed):
        if PLACED.get(kind, 0) >= count: break
        if try_place(kind, lambda nm, k=PLACED.get(kind, 0): maker(nm, k % 8), x, y, rz_fn or road_facing_rz, w, d, clear, near=near, variants=variants, vkey=PLACED.get(kind, 0)): n += 1
    return n
def home_maker(nm, n): return make_house(nm, 11, 8.5, 2 if n % 2 else 1, WALLS[(n * 2 + 1) % 5], 30 + n, garage=True)
def small_maker(nm, n): return make_house(nm, 9.5, 8, 1 if n % 3 else 2, WALLS[(n * 3 + 2) % 5], 70 + n, garage=False, balcony=False)
def apt_maker(nm, n): return make_house(nm, 22, 11, 3, WALLS[(n + 3) % 5], 60 + n, garage=False, balcony=True, roof_h=3.4)
def row_maker(nm, n): return make_row(nm, 4, 6.4, 10, 2, 40 + n)
def condo_maker(nm, n): return dk.condo(nm, 26, 14, 5 + n % 3, 200 + n)
def wh_maker(nm, n): return dk.warehouse(nm, 24, 18, 100 + n)
CM = civic.civic_mats()
def cbs(x, y, w, d, soft=None): cbox(x, y, w, d, 0, None, soft)
def ccs(x, y, r, soft=None): ccir(x, y, r, soft)
def add_static(builder_fn, x, y, w, d, kind, clearance=1.0, rz=0.0):
    f = (f"{kind}{PLACED.get(kind, 0)}", x, y, w, d, rz, ())
    if fp_problems(f, footprints(), clearance): return False
    B_ = Builder(f[0]); builder_fn(B_); STATIC.append(B_.build()); FOOTREG.append(f); PLACED[kind] = PLACED.get(kind, 0) + 1; NOGO.append((x - w / 2 - .5, y - d / 2 - .5, x + w / 2 + .5, y + d / 2 + .5)); mapr(x - w / 2, y - d / 2, x + w / 2, y + d / 2, "#7aa05a"); return True
def scatter_poly(poly, kind, n, pad=3.0, gap=9.0, shrub_too=True, seed=3):
    rr_ = random.Random(seed); bb = bbox(poly); placed = []; tries = 0
    while len(placed) < n and tries < n * 50:
        tries += 1; x, y = rr_.uniform(bb[0], bb[2]), rr_.uniform(bb[1], bb[3])
        if not inside(poly, x, y) or not free(x, y, pad) or any(math.hypot(x - a, y - b) < gap for a, b in placed): continue
        placed.append((x, y)); prop(kind, x, y, rr_.uniform(1.0, 1.25) if kind == "oak" else 1.0)
        if shrub_too and rr_.random() < .6: prop("shrub_a" if rr_.random() < .5 else "shrub_b", x + rr_.uniform(-2, 2), y + rr_.uniform(-2, 2))
def make_lot(x0, x1, y0, y1, allow=(), prob=.3, single=None):                                                              # single = "N"/"S": one row of stalls next to the building (north / south side of the lot), aisle on the street side
    rows = [(y0, y0 + 5.2), (y1 - 5.2, y1)] if single is None else ([(y1 - 5.2, y1)] if single == "N" else [(y0, y0 + 5.2)]); isl, stl = parking_lot(T, m, x0, x1, y0, y1, rows, x0 + 1.0)
    mapr(x0, y0, x1, y1, "#5a5c60"); FOOTREG.append(("lot", (x0 + x1) / 2, (y0 + y1) / 2, x1 - x0, y1 - y0, 0.0, allow)); NOGO.append((x0 - 2, y0 - 2, x1 + 2, y1 + 2))
    for (ix, iy, iw, idp) in isl:
        cbox(ix, iy, iw, idp, soft="bush"); prop("shrub_a" if R_.random() < .5 else "palm_small", ix, iy, 1.0, col=False)
    aisle_ = (y0 + y1) / 2 if single is None else (y0 if single == "N" else y1)
    for (sx_, sy_) in stl: LOTS.append((sx_, sy_, 0 if sy_ < aisle_ else 180, prob))
    return stl
def apron(mx, my, tx_, ty_, width=6.5):                                                                                    # driveway from a lot edge point toward the nearest street edge
    best = None
    for r in net:
        if r.surf != "asphalt": continue
        d_, s_ = r.nearest(mx, my)
        if best is None or d_ < best[0]: best = (d_, r, s_)
    d_, r, s_ = best; cx, cy = r.at(s_)[:2]; dx, dy = cx - mx, cy - my; l = math.hypot(dx, dy) or 1; dx, dy = dx / l, dy / l; L_ = max(0.0, l - r.hw - .3)
    nx, ny = -dy * width / 2, dx * width / 2; ex, ey = mx + dx * L_, my + dy * L_
    pts = [(mx - nx, my - ny, .165), (ex - nx, ey - ny, .165), (ex + nx, ey + ny, .165), (mx + nx, my + ny, .165)]
    cr = (pts[1][0] - pts[0][0]) * (pts[2][1] - pts[0][1]) - (pts[1][1] - pts[0][1]) * (pts[2][0] - pts[0][0]); T.poly(m["asphalt"], pts if cr > 0 else pts[::-1])
def commercial_block(poly, name, maker_b, bw, bd, lot_w=None, lot_d=17.0, step=3, seed=1, reach=(.3, 12.0), prob=.3, clear=1.5, count=1, tall=7.0, base=None):
    """A building with its own parking lot and a driveway to the nearest street, fitted anywhere inside the polygon (building N/S/E/W of the lot)."""
    lot_w = lot_w or bw; made = 0; why = {"poly": 0, "reach": 0, "lot": 0, "bld": 0}
    for (cx, cy) in spots(poly, step, seed):
        if made >= count: break
        for orient in ("N", "S", "E", "W"):
            if orient in "NS": cw, cd = max(lot_w, bw), lot_d + bd
            else: cw, cd = 22 + bd, max(lot_d, bw)
            if orient in "NS":
                lx0, lx1 = cx - lot_w / 2, cx + lot_w / 2
                if orient == "N": ly0, ly1 = cy - cd / 2, cy - cd / 2 + lot_d; bx, by, brz = cx, cy + cd / 2 - bd / 2, 0; mid = (cx, ly0)
                else: ly1, ly0 = cy + cd / 2, cy + cd / 2 - lot_d; bx, by, brz = cx, cy - cd / 2 + bd / 2, 180; mid = (cx, ly1)
                bw_, bd_ = bw, bd
            else:
                lw = 22.0; ly0, ly1 = cy - lot_d / 2, cy + lot_d / 2
                if orient == "E": lx0, lx1 = cx - cw / 2, cx - cw / 2 + lw; bx, by, brz = cx + cw / 2 - bd / 2, cy, 270; mid = (lx0, cy)
                else: lx1, lx0 = cx + cw / 2, cx + cw / 2 - lw; bx, by, brz = cx - cw / 2 + bd / 2, cy, 90; mid = (lx1, cy)
                bw_, bd_ = bd, bw
            if not in_any(poly, [(lx0, ly0), (lx1, ly0), (lx1, ly1), (lx0, ly1), (bx - bw_ / 2, by - bd_ / 2), (bx + bw_ / 2, by + bd_ / 2)]): why["poly"] += 1; continue
            if not any(reach[0] < corridor_dist(r, mid[0], mid[1], cap=reach[1] + 6) < reach[1] for r in net if r.surf == "asphalt"): why["reach"] += 1; continue
            fl = (f"{name}_lot", (lx0 + lx1) / 2, (ly0 + ly1) / 2, lx1 - lx0, ly1 - ly0, 0.0, ()); fb = (f"{name}_bld", bx, by, bw_, bd_, 0.0, ())
            if fp_problems(fl, footprints(), clear): why["lot"] += 1; continue
            if fp_problems(fb, footprints(), clear): why["bld"] += 1; continue
            make_lot(lx0, lx1, ly0, ly1, prob=prob, single=(("N" if orient == "N" else "S") if (orient in "NS" and lot_d < 14) else None)); apron(mid[0], mid[1], 0, 0)
            o = maker_b(f"{name}{PLACED.get(name, 0)}"); put(o, bx, by, 0, brz, bw + .5, bd + .5); FOOTREG.append(fb); NOGO.append((bx - bw_ / 2 - 2, by - bd_ / 2 - 2, bx + bw_ / 2 + 2, by + bd_ / 2 + 2)); mapr(bx - bw_ / 2, by - bd_ / 2, bx + bw_ / 2, by + bd_ / 2, "#c9b48a")
            PLACED[name] = PLACED.get(name, 0) + 1; made += 1; print("BLOCK", name, round(bx), round(by), orient); break
    if made < count: print("BLOCK MISS", name, made, "/", count, why)
    return made

def addcar(kind, color, name, x, y, rz=0):
    root = VH.make_vehicle(kind, color, name); root.location = (x, y, .03); root.rotation_euler = (0, 0, math.radians(rz)); CARS.append({"name": name, "kind": kind, "color": color, "x": round(x, 2), "y": round(y, 2), "rz": round(rz, 1)}); return root
def pose(road, off, s, rev=False):
    x, y, tx, ty = road.at(s); px, py = road.off(s, off); a = math.degrees(math.atan2(-tx, ty)) + (180 if rev else 0); return px, py, a
LANE = (PKWY.mh + (PKWY.hw - PKWY.mh) * .27)
ps = PKWY.nearest(0, -20)[1]; px_, py_, pa = pose(PKWY, -LANE, ps); addcar("sedan", "#c8201c", "player", px_, py_, pa); START = {"x": round(px_, 2), "y": round(py_, 2), "rz": round(pa, 1)}
# ================================================================  DISTRICTS (plan v6)  ======================================================
from mathutils import Matrix
import importlib
def _mod(n):
    try: return importlib.import_module(n)
    except Exception as e: print("LANDMARK MODULE MISSING", n, e); return None
LMR, LMC, LMP = _mod("lm_retail"), _mod("lm_civic"), _mod("lm_promenade")
def _scaled(o, k): o.scale = (k, k, k); return o
def plaza_maker(w, d, H=7.5, tower=None, shops=None, seed=2, sign="palmmarket"):
    return lambda nm: make_plaza(nm, w, d, H, tower_x=tower, seed=seed, tower_sign=sign, **({} if shops is None else {"shops": shops}))
def lm(mod, fn, fallback):                                                                                                     # a landmark maker from the lm_* modules, or a stand-in box building while it is missing
    return (lambda nm: getattr(mod, fn)(nm)) if (mod is not None and hasattr(mod, fn)) else fallback
# -- house styles: every district its own look (size, storeys, wall palette, roof colour)
ROOF = {"terracotta": "#a9573a", "concrete": "#bcb6aa", "brown": "#7a5a44", "slate": "#5d6670", "barrel": "#b8463a"}
def house_style(w, d, floors, walls, roofs, garage=True, balcony=True, roof_h=None, seed0=0):
    def mk(nm, n): return make_house(nm, w, d, floors[n % len(floors)], walls[(n * 3 + 1) % len(walls)], seed0 + n, garage=garage, balcony=balcony, roof_h=roof_h, tile_hex=ROOF[roofs[n % len(roofs)]])
    return mk
estate_maker = house_style(13, 10, (2,), ("white", "cream", "stone"), ("concrete", "slate"), seed0=300)
lake_maker = house_style(11, 8.5, (2, 1), ("peach", "sand", "cream", "butter"), ("terracotta", "barrel"), seed0=320)
bungalow_maker = house_style(9.5, 8, (1, 1, 2), ("mint", "sky", "coral", "lilac", "butter"), ("terracotta", "brown", "barrel"), balcony=False, garage=False, seed0=340)
two_storey_maker = house_style(11, 9, (2,), ("cream", "stone", "white", "sand"), ("brown", "slate"), seed0=360)
ranch_maker = house_style(12.5, 8, (1,), ("sand", "white", "stone", "peach"), ("slate", "brown"), balcony=False, roof_h=1.8, seed0=380)
bay_maker = house_style(12, 9, (2,), ("white", "sky", "mint"), ("concrete", "terracotta"), seed0=400)
centre_maker = house_style(11, 8.5, (1, 2), ("coral", "butter", "cream", "sky"), ("terracotta", "brown"), seed0=420)
HOUSING = [  # (district, kind, maker, w, d, gap, clear)
    ("Lakeview Estates (canal homes)", "lv", estate_maker, 13, 10, 2.0, .5), ("West Creek Townhomes (gated)", "twn", row_maker, 25.6, 10.2, 2.0, .6), ("West Creek Townhomes (middle)", "twn", row_maker, 25.6, 10.2, 2.0, .6),
    ("West Creek Townhomes (south)", "twn", row_maker, 25.6, 10.2, 2.0, .6), ("The Lakes (lake homes)", "lk", lake_maker, 11, 8.5, 1.6, .4), ("Palm View (small homes)", "pv", bungalow_maker, 9.5, 8, 1.4, .4),
    ("Centre homes", "ch", centre_maker, 11, 8.5, 1.6, .4), ("Northridge Homes", "nr", two_storey_maker, 11, 9, 1.6, .4), ("Southgate Homes", "sg", ranch_maker, 12.5, 8, 1.6, .4),
    ("Bayview homes (SE tip)", "bv", bay_maker, 12, 9, 1.8, .4), ("Riverside Condos + Marina", "condo", condo_maker, 26, 14, 3.0, 1.2), ("Canal Ridge Condos", "condo", condo_maker, 26, 14, 3.0, 1.2),
    ("Creekside Industrial Park", "wh", wh_maker, 24, 18, 1.8, .8), ("Harbor lots", "wh", wh_maker, 24, 18, 1.8, .8)]
HSPEC = [(D(n_), k_, mk_, w_, d_, g_, c_) for (n_, k_, mk_, w_, d_, g_, c_) in HOUSING]
def spec_at(x, y):
    for sp in HSPEC:
        if inside(sp[0], x, y): return sp
    return None
INDUSTRIAL_ROADS = ("Industrial Row", "Creekside Rd", "Dock Ln", "Harbor Lot Rd", "Creekside Loop")
def frontage_all(industrial=False, max_rank=6.5, skip=("Lyons Promenade",)):
    n = 0
    for nm, r in ROAD.items():
        if r.surf != "asphalt" or nm in skip or (r.rank > max_rank and nm not in INDUSTRIAL_ROADS) or (industrial and nm not in INDUSTRIAL_ROADS): continue
        for side in (1, -1):
            s_ = 3.0
            while s_ < r.L - 3:
                x, y, tx, ty = r.at(s_); probe = r.off(s_, side * (r.hw + rd.CURB + (rd.SWK if any(r.sw) else 0.0) + 6.0)); sp = spec_at(*probe)
                if sp is None: s_ += 4.0; continue
                poly, kind, mk, w, d, gap, clear = sp
                if (kind == "wh") != industrial: s_ += 4.0; continue
                off = side * (r.hw + rd.CURB + (rd.SWK if any(r.sw) else 0.0) + gap + d / 2); px, py = r.off(s_, off)
                if not inside(poly, px, py): s_ += 4.0; continue
                rz = math.degrees(math.atan2(ty, tx)) if side > 0 else math.degrees(math.atan2(-ty, -tx))
                k0 = PLACED.get(kind, 0)
                if try_place(kind, lambda nm_, n_=k0: mk(nm_, n_ % 8), px, py, rz, w, d, clear, variants=8, vkey=k0): n += 1; s_ += w + (2.0 if kind in ("wh", "condo") else 1.6)
                else: s_ += 3.0
    return n
def row_block(poly, name, parts, lot_d=17.0, step=3, seed=1, reach=(.3, 14.0), clear=1.2, prob=.4, gap=0.0):
    """Shopping-center row: buildings side by side (fronts aligned on the lot) with one big lot in front and a driveway; parts = [(maker, w, d), ...]. Tries the row north or south of the lot."""
    W = sum(p[1] for p in parts) + gap * (len(parts) - 1); Dm = max(p[2] for p in parts)
    for (cx, cy) in spots(poly, step, seed):
        for orient in ("N", "S"):
            cd = lot_d + Dm
            if orient == "N": ly0, ly1 = cy - cd / 2, cy - cd / 2 + lot_d; fy = ly1; mid = (cx, ly0)
            else: ly1, ly0 = cy + cd / 2, cy + cd / 2 - lot_d; fy = ly0; mid = (cx, ly1)
            lx0, lx1 = cx - W / 2, cx + W / 2
            if not in_any(poly, [(lx0, cy - cd / 2), (lx1, cy - cd / 2), (lx1, cy + cd / 2), (lx0, cy + cd / 2)]): continue
            if not any(reach[0] < corridor_dist(r, mid[0], mid[1], cap=reach[1] + 6) < reach[1] for r in net if r.surf == "asphalt"): continue
            fl = (f"{name}_lot", cx, (ly0 + ly1) / 2, W, lot_d, 0.0, ()); fb = (f"{name}_row", cx, fy + (Dm / 2 if orient == "N" else -Dm / 2), W, Dm, 0.0, ())
            if fp_problems(fl, footprints(), clear) or fp_problems(fb, footprints(), clear): continue
            make_lot(lx0, lx1, ly0, ly1, prob=prob); apron(mid[0], mid[1], 0, 0); FOOTREG.append(fb); NOGO.append((lx0 - 2, min(ly0, fb[2] - Dm / 2) - 2, lx1 + 2, max(ly1, fb[2] + Dm / 2) + 2))
            x = lx0
            for k_, (mk, w, d) in enumerate(parts):
                bx = x + w / 2; by = fy + (d / 2 if orient == "N" else -d / 2); o = mk(f"{name}{k_}"); put(o, bx, by, 0, 0 if orient == "N" else 180, w + .3, d + .3); mapr(bx - w / 2, by - d / 2, bx + w / 2, by + d / 2, "#c9b48a"); x += w + gap
            print("ROW", name, round(cx), round(cy), orient); return (cx, cy, orient, W, lot_d, Dm)
    print("ROW MISS", name); return None
# -- commercial frontage: a building (or a row of them) set back behind its own parking lot, the lot facing the street (lots rotate with the street)
WHY = {}
def _rot(cx, cy, rz, lx, ly): c_, s_ = math.cos(math.radians(rz)), math.sin(math.radians(rz)); return cx + lx * c_ - ly * s_, cy + lx * s_ + ly * c_
def lot_object(name, cx, cy, rz, W, lot_d, D, prob=.4, apron_len=4.0, rows2=None):
    """Parking lot in its own local frame (centred on the composite), lot spans local y -D/2 .. -D/2+lot_d, driveway apron toward -y (the street)."""
    bL = Builder(name); y0, y1 = -D / 2, -D / 2 + lot_d
    rows = ([(y0, y0 + 5.2), (y1 - 5.2, y1)] if (rows2 if rows2 is not None else lot_d >= 16.5) else [(y1 - 5.2, y1)])
    isl, stl = parking_lot(bL, m, -W / 2, W / 2, y0, y1, rows, -W / 2 + 1.0)
    bL.poly(m["asphalt"], [(-3.3, y0 - apron_len, .03), (3.3, y0 - apron_len, .03), (3.3, y0 + .05, .03), (-3.3, y0 + .05, .03)])
    put(bL.build(vc=True), cx, cy, 0, rz, None, None, col=False)
    for (ix, iy, iw, idp) in isl:
        wx, wy = _rot(cx, cy, rz, ix, iy); cbox(wx, wy, iw, idp, rz, soft="bush"); prop("shrub_a" if R_.random() < .5 else "palm_small", wx, wy, 1.0, col=False)
    aisle = (y0 + y1) / 2 if len(rows) == 2 else y0
    for (sx, sy) in stl:
        wx, wy = _rot(cx, cy, rz, sx, sy); LOTS.append((wx, wy, rz + (0 if sy < aisle else 180), prob))
    p0 = _rot(cx, cy, rz, 0, (y0 + y1) / 2); MAP.append([round(p0[0] - W / 2, 1), round(p0[1] - lot_d / 2, 1), round(p0[0] + W / 2, 1), round(p0[1] + lot_d / 2, 1), "#5a5c60"])
def frontage_lot(poly, name, parts, lot_d=17.0, count=1, roads=None, max_rank=8.6, clear=1.0, prob=.4, step=4.0, gap=1.0, rows2=None, allow=(), face=None):
    """parts = [(maker, w, d, front_extra)]: placed side by side, fronts on the lot's back edge. Walks every street crossing the polygon (or only `roads`)."""
    W = sum(p[1] for p in parts) + gap * (len(parts) - 1); Dm = max(p[2] + p[3] for p in parts); D = lot_d + Dm; bb = bbox(poly); made = 0
    for nm, r in ROAD.items():
        if made >= count: break
        if r.surf != "asphalt" or r.rank > max_rank or (roads and nm not in roads): continue
        if r.bb[0] > bb[2] + 12 or r.bb[2] < bb[0] - 12 or r.bb[1] > bb[3] + 12 or r.bb[3] < bb[1] - 12: continue
        edge = r.hw + rd.CURB + (rd.SWK if any(r.sw) else 0.0) + 1.0
        for side in (1, -1):
            s_ = W / 2 + 2
            while s_ < r.L - W / 2 - 2 and made < count:
                x, y, tx, ty = r.at(s_); rz = math.degrees(math.atan2(ty, tx)) if side > 0 else math.degrees(math.atan2(-ty, -tx))
                ex_ = 0.0
                if face is not None:                                                                                      # face: force the building's facing (0 = front to the south, readable from the north-up camera)
                    dlt = math.radians(face - rz); ex_ = abs(math.sin(dlt)) * W / 2 + (1 - abs(math.cos(dlt))) * D / 2; rz = face
                cx, cy = r.off(s_, side * (edge + D / 2 + ex_))
                corners = [_rot(cx, cy, rz, sx * W / 2, sy * D / 2) for sx in (-1, 1) for sy in (-1, 1)]
                f_ = (name, round(cx, 2), round(cy, 2), W, D, rz, tuple(allow))
                if not inside(poly, cx, cy): s_ += step; continue
                pr_ = fp_problems(f_, footprints(), clear)
                if pr_:
                    if name in os.environ.get('DEBUGKIND', '').split(','): print('SKIPF', name, round(cx), round(cy), round(rz), pr_[:2])
                    WHY[name] = WHY.get(name, {}); k__ = "road" if "corridor" in pr_[0] else "land" if "land" in pr_[0] else "lake" if "lake" in pr_[0] else pr_[0].split(" overlaps ")[-1][:14]; WHY[name][k__] = WHY[name].get(k__, 0) + 1; s_ += step; continue
                lot_object(f"{name}{made}_lot", cx, cy, rz, W, lot_d, D, prob, edge - r.hw - rd.CURB + .2, rows2)
                lx = -W / 2
                for k_, (mk, w, d, fe) in enumerate(parts):
                    by = -D / 2 + lot_d + fe + d / 2; bx = lx + w / 2; wx, wy = _rot(cx, cy, rz, bx, by); put(mk(f"{name}{made}_{k_}"), wx, wy, 0, rz, w + .3, d + .3); MAP.append([round(wx - w / 2, 1), round(wy - d / 2, 1), round(wx + w / 2, 1), round(wy + d / 2, 1), "#c9b48a"]); lx += w + gap
                FOOTREG.append(f_); NOGO.append((min(p[0] for p in corners) - 1, min(p[1] for p in corners) - 1, max(p[0] for p in corners) + 1, max(p[1] for p in corners) + 1)); PLACED[name] = PLACED.get(name, 0) + 1; made += 1; print("FRONT", name, nm, round(cx), round(cy), round(rz)); s_ += W + 4
    if made < count: print("FRONT MISS", name, made, "/", count, WHY.get(name))
    return made
# -- Publix shopping center (inline shops + the supermarket anchor, one big lot facing Retail Dr)
SHOPS_A = (("restaurant_fl", 7, "#8c1c1c"), ("nails", 5, "#7a2f6a"), ("coffee", 6, "#21453a"))
SHOPS_B = (("pizza", 5, "#b8321f"), ("cleaners", 6, "#a63c2a"), ("coffee", 6, "#21453a"))
def strip(w, d, shops, seed, H=6.8): return lambda nm: make_plaza(nm, w, d, H, shops=shops, tower_x=None, seed=seed)
market_anchor = lm(LMR, "supermarket", plaza_maker(46, 28, 8.5, 0))
frontage_lot(D("Publix shopping center"), "publix", [(strip(20, 14, SHOPS_A, 11), 20, 14, 0.0), (market_anchor, 46, 28, 3.6)], lot_d=17, roads=("Retail Dr",), prob=.5, rows2=True, clear=.6)
frontage_lot(D("Retail Commons (west shops)"), "coffee", [(lambda nm: make_house(nm, 12, 9, 1, "mint", 610, garage=False, balcony=False, roof_h=1.4, tile_hex=ROOF["slate"]), 12, 9, 0.0)], lot_d=11, count=2)
frontage_lot(D("Retail Commons (east)"), "strip_e", [(strip(26, 12, SHOPS_A + SHOPS_B[:1], 13), 26, 12, 0.0)], lot_d=17, count=3)
for k_, (nm_, wall_) in enumerate((("bank", "white"), ("pharmacy", "sky"), ("burger", "coral"))):
    frontage_lot(D("Retail outparcels"), nm_, [(lambda nm, wall_=wall_, k_=k_: make_house(nm, 14, 10, 1, wall_, 500 + k_, garage=False, balcony=False, roof_h=1.6, tile_hex=ROOF["concrete"]), 14, 10, 0.0)], lot_d=12)
# -- Civic Center: City Hall (+ butterfly sculpture) and the Police station, each with its own lot; the school next door
CIV = D("Civic Center (City Hall + Police)")
hall_maker = lm(LMC, "city_hall", lambda nm: make_plaza(nm, 34, 18, 8.0, shops=(), tower_x=0, tower_sign="cityhall"))
if frontage_lot(CIV, "cityhall", [(hall_maker, 34, 18, 3.0)], lot_d=14, prob=.35) and LMC is not None and hasattr(LMC, "butterfly"):
    _, hx_, hy_, _, _, hrz_, _ = FOOTREG[-1]
    for dx_ in (-21, 21):
        bx_, by_ = _rot(hx_, hy_, hrz_, dx_, -4)
        if try_place("butterfly", lambda nm: LMC.butterfly(nm), bx_, by_, hrz_, 3.2, 3.2, .3): break
police_maker = lm(LMR, "police_station", lambda nm: make_house(nm, 30, 20, 2, "white", 77, garage=False, balcony=False, roof_h=1.2, tile_hex=ROOF["slate"]))
frontage_lot(CIV, "police", [(police_maker, 30, 20, 7.0)], lot_d=12, prob=.0)
frontage_lot(D("Elementary School"), "school", [(lambda nm: make_house(nm, 24, 10, 2, "butter", 21, garage=False, balcony=False, roof_h=3.0, windows=True), 24, 10, 0.0)], lot_d=12, prob=.4)
# -- casino + parking garage (east of Creekview Dr)
CAS = D("Seminole Casino Coconut Creek")
casino_maker = lm(LMC, "casino", plaza_maker(56, 36, 11.0, 0))
if not frontage_lot(CAS, "casino", [(casino_maker, 56, 36, 0.0)], lot_d=17, prob=.55, roads=("Coconut Creek Pkwy",), max_rank=9.5, face=0.0, allow=("Retail Dr",), step=2.0) and \
   not frontage_lot(CAS, "casino", [(lambda nm: _scaled(casino_maker(nm), .8), 45, 29, 0.0)], lot_d=15, prob=.55, roads=("Coconut Creek Pkwy",), max_rank=9.5, face=0.0, allow=("Retail Dr",), step=2.0):
    frontage_lot(CAS, "casino", [(lambda nm: _scaled(casino_maker(nm), .8), 45, 29, 0.0)], lot_d=17, prob=.55, roads=("Creekview Dr",), allow=("Retail Dr",))
for (x, y) in spots(D("Casino garage"), 3, 53):
    if try_place("garage", lambda nm: dk.garage(nm, 40, 22, 3), x, y, road_facing_rz, 40, 22, 1.0, near=14): break
# -- gas stations (Wiles x Blvd corner, Palm Blvd west) + Lyons Mart
def gas_at(poly, seed):
    for (x, y) in spots(poly, 3, seed):
        rz = road_facing_rz(x, y)
        if try_place("gas", lambda nm: civic.gas_station(nm), x, y, rz, 18, 19, 1.0, near=12, collide=False):
            a_ = math.radians(rz); cbox(x - 6 * math.sin(a_), y + 6 * math.cos(a_), 9.4, 6.4, rz); return True
    print("GAS MISS"); return False
gas_at(D("Gas station + Lyons Mart"), 21); gas_at(D("Gas station west"), 22)
frontage_lot(D("Gas station + Lyons Mart"), "lmart", [(strip(20, 10, (("coffee", 6, "#21453a"), ("pizza", 5, "#b8321f")), 15, 6.0), 20, 10, 0.0)], lot_d=10, max_rank=13, clear=.6)
# -- Retail Commons west is a thin strip between Lyons Rd and Retail Row: a row of small kiosks facing the street
KIOSKS = (("coffee", 6, "#21453a"), ("pizza", 5, "#b8321f"), ("nails", 5, "#7a2f6a"))
frontage_lot(D("Retail Commons (west shops)"), "kiosk", [(strip(9, 6.5, (KIOSKS[0],), 811, 5.2), 9, 6.5, 0.0), (strip(9, 6.5, (KIOSKS[1],), 812, 5.2), 9, 6.5, 0.0)], lot_d=1.5, count=3, max_rank=13, clear=.5, prob=0.0, gap=2.0)
# -- small shop pads fill what is left of the thin commercial strips (they may face any road, Lyons Rd included)
PAD_SHOPS = (("coffee", 6, "#21453a"), ("pizza", 5, "#b8321f"), ("nails", 5, "#7a2f6a"), ("cleaners", 6, "#a63c2a"), ("restaurant_fl", 7, "#8c1c1c"))
for k_d, dn_ in enumerate(("Retail Commons (west shops)", "Retail Commons (east)", "Retail outparcels", "Gas station + Lyons Mart", "Gas station west")):
    frontage_lot(D(dn_), "pad", [(strip(14, 10, (PAD_SHOPS[k_d % 5], PAD_SHOPS[(k_d + 2) % 5]), 700 + k_d, 6.2), 14, 10, 0.0)], lot_d=8, count=4, max_rank=13, clear=.6, prob=.5)
tick_('core')
# -- sports: stadium, tennis, playground (east of the school)
def place_stadium(cx, cy, k=.9):
    f = ("stadium", cx, cy, 58 * k, 40 * k, 0.0, ())
    pr_ = fp_problems(f, footprints(), .5)
    if pr_: return False
    civic.field(civic.SwapB(T), CM, cy, cx, 16 * k, 30 * k, bleachers=False)
    tr = rd.Road("stad_track", [(cx - 10 * k, cy - 10 * k), (cx + 10 * k, cy - 10 * k), (cx + 16.8 * k, cy - 7.5 * k), (cx + 18.5 * k, cy), (cx + 16.8 * k, cy + 7.5 * k), (cx + 10 * k, cy + 10 * k), (cx - 10 * k, cy + 10 * k), (cx - 16.8 * k, cy + 7.5 * k), (cx - 18.5 * k, cy), (cx - 16.8 * k, cy - 7.5 * k)], hw=2.4 * k, closed=True, rank=1, sw=(0, 0), mark=False, surf="track", curbs=False)
    m["track"] = CM["track"]; tr.pieces = [(0.0, tr.L, 0, 0, 0, 0)]; rd.draw_road(RB, tr, m)
    for (o0, o1, hh) in ((-6.0 * k, -3.0 * k, 1.4), (-9.0 * k, -6.0 * k, 2.8), (-12.0 * k, -9.0 * k, 4.2)): rd.strip(RB, CM["steel"], tr, 0.0, tr.L - .5, o0, o1, hh, solid=0.0)
    pl_ = Builder("floodlights")
    for (lx, ly) in ((cx - 25 * k, cy - 15 * k), (cx + 25 * k, cy - 15 * k), (cx - 25 * k, cy + 15 * k), (cx + 25 * k, cy + 15 * k)): pl_.cyl(M("flood_pole", "#8a8d92"), (lx, ly, 9), .25, 18, "z", 6); pl_.box(M("flood_head", "#f0f0e0", emit=.6), lx - .5, lx + .5, ly - 1.2, ly + 1.2, 17.5, 18.6)
    STATIC.append(pl_.build()); cbox(cx, cy, 52 * k, 34 * k, 0); FOOTREG.append(f); NOGO.append((cx - 31 * k, cy - 22 * k, cx + 31 * k, cy + 22 * k)); mapr(cx - 29 * k, cy - 20 * k, cx + 29 * k, cy + 20 * k, "#b3503c"); print("STADIUM placed", round(cx), round(cy)); return True
SP = D("Sports fields + stadium")
for (px, py) in spots(SP, 2, 4):
    if place_stadium(px, py, .9) or place_stadium(px, py, .75): break
else: print("STADIUM MISS")
for (px, py) in spots(SP, 3, 5):
    if PLACED.get("court", 0) >= 2: break
    add_static(lambda B_, x=px, y=py: civic.tennis_court(B_, CM, cbs, x, y), px, py, 13.6, 28.6, "court", 1.5)
for (px, py) in spots(SP, 3, 6):
    if add_static(lambda B_, x=px, y=py: civic.playground(B_, CM, cbs, ccs, x, y, 9, 7), px, py, 9, 7, "playground", 2.0): break
tick_('sports')
# -- Lyons Promenade: a pedestrian shopping street (shop rows facing a 14 m paved lane), cinema at the bay end, entry arch at the west end, fountain, cafés, planters
PROM = ROAD["Lyons Promenade"]
def _shoprow(seed):
    if LMP is not None and hasattr(LMP, "shop_row"): return lambda nm: LMP.shop_row(nm, 3, 9.0, 10.0, seed)
    return lambda nm: make_plaza(nm, 36, 12, 7.5, shops=SHOPS_A + SHOPS_B, tower_x=None, seed=seed)
def face_back(tx, ty): return math.degrees(math.atan2(-tx, ty))                                                                # rz that turns a front (-y) to look back along -tangent
cin_ = lm(LMP, "cinema", plaza_maker(30, 22, 12.0, 0, shops=(), sign="palmmarket"))
ex_, ey_, etx_, ety_ = PROM.at(PROM.L - 1.0)
if not try_place("cinema", lambda nm: _scaled(cin_(nm), .85), ex_ + etx_ * 11.5, ey_ + ety_ * 11.5, face_back(etx_, ety_), 25.5, 18.7, .3):
    for s_c in [PROM.L - 13 - k * 3 for k in range(10)]:                                                                          # else the cinema closes the north row at the bay end
        x, y, tx, ty = PROM.at(s_c); done_ = False
        for side in (1, -1):
            px, py = PROM.off(s_c, side * (PROM.hw + .8 + 8.8)); rz = math.degrees(math.atan2(ty, tx)) if side > 0 else math.degrees(math.atan2(-ty, -tx))
            if try_place("cinema", lambda nm: _scaled(cin_(nm), .8), px, py, rz, 24, 17.6, .3): done_ = True; break
        if done_: break
k_ = 0
for side in (1, -1):
    s_ = 8.0
    while s_ < PROM.L - 6:
        x, y, tx, ty = PROM.at(s_); px, py = PROM.off(s_, side * (PROM.hw + .8 + 5.0)); rz = math.degrees(math.atan2(ty, tx)) if side > 0 else math.degrees(math.atan2(-ty, -tx))
        if try_place("shoprow", _shoprow(600 + k_), px, py, rz, 27, 10, .3): s_ += 29.0; k_ += 1
        else:
            if try_place("shop", (lambda nm, kk=k_: LMP.shop_row(nm, 2, 9.0, 10.0, 650 + kk)) if LMP is not None else (lambda nm, kk=k_: make_plaza(nm, 18, 10, 7.0, shops=SHOPS_A, tower_x=None, seed=650 + kk)), px, py, rz, 18, 10, .3): s_ += 20.0; k_ += 1
            else: s_ += 4.0
sx_, sy_, stx_, sty_ = PROM.at(9.0)
try_place("prom_arch", lm(LMP, "entry_arch", lambda nm: dk.gate(nm, 12)), sx_, sy_, face_back(stx_, sty_), 14, 2.0, .2, collide=False)
for sd_ in (-1, 1): ccir(sx_ - sty_ * sd_ * 6.5, sy_ + stx_ * sd_ * 6.5, .8)
fx_p, fy_p = PROM.at(PROM.L * .5)[:2]
if LMP is not None and hasattr(LMP, "fountain"): put(LMP.fountain("prom_fountain"), fx_p, fy_p, 0, 0, None, None, col=False); ccir(fx_p, fy_p, 3.2)
for q_ in range(1, int(PROM.L // 9)):
    s_ = q_ * 9.0
    if abs(s_ - PROM.L * .5) < 6: continue
    px_, py_, tx_, ty_ = PROM.at(s_)
    for sd_ in (1, -1):
        ox, oy = px_ - ty_ * sd_ * 4.6, py_ + tx_ * sd_ * 4.6
        if q_ % 3 == 1 and LMP is not None and hasattr(LMP, "cafe_set"): put(LMP.cafe_set(f"cafe{q_}_{sd_}"), ox, oy, 0, R_.uniform(0, 360), None, None, col=False); ccir(ox, oy, 1.2, "bush")
        elif q_ % 3 == 2 and LMP is not None and hasattr(LMP, "planter"): put(LMP.planter(f"plant{q_}_{sd_}"), ox, oy, 0, math.degrees(math.atan2(ty_, tx_)), None, None, col=False); ccir(ox, oy, .9, "bush")
        else: prop("palm_medium", ox, oy, 1.0)
def lot_fill(poly, n, seed, w=30.0, d=17.0, reach=(.3, 10.0)):
    made = 0
    for (cx, cy) in spots(poly, 3, seed):
        if made >= n: break
        for (ex, ey) in ((cx, cy - d / 2), (cx, cy + d / 2)):
            if not in_any(poly, [(cx - w / 2, cy - d / 2), (cx + w / 2, cy - d / 2), (cx + w / 2, cy + d / 2), (cx - w / 2, cy + d / 2)]): break
            if not any(reach[0] < corridor_dist(r, ex, ey, cap=reach[1] + 6) < reach[1] for r in net if r.surf == "asphalt"): continue
            if fp_problems(("lot", cx, cy, w, d, 0.0, ()), footprints(), 1.0): break
            make_lot(cx - w / 2, cx + w / 2, cy - d / 2, cy + d / 2, prob=.45); apron(ex, ey, 0, 0); made += 1; break
    return made
print("PROM LOTS", lot_fill(D("Lyons Promenade (shops + pedestrian lane)"), 3, 61))
tick_('promenade')
# -- Trash Mountain: the landfill mound (drivable; the page reads its height field), gatehouse, truck shed, fence posts
HEIGHTS = []
TM = D("Trash Mountain (landfill)")
if LMP is not None and hasattr(LMP, "trash_mountain"):
    hf = LMP.TRASH_HF; tb = bbox(TM); best = None
    for (x, y) in spots(TM, 2, 71):
        f_ = ("trash_mountain", x, y, hf["nx"] * hf["dx"] * .78, hf["ny"] * hf["dx"] * .78, 0.0, ("Landfill Rd",))
        if not fp_problems(f_, footprints(), 0.0):
            d_ = math.dist((x, y), centroid(TM))
            if best is None or d_ < best[0]: best = (d_, x, y, f_)
    if best:
        _, tx0, ty0, f_ = best; put(LMP.trash_mountain("trash_mountain"), tx0, ty0, 0, 0, None, None, col=False); FOOTREG.append(f_); NOGO.append((tx0 - 34, ty0 - 30, tx0 + 34, ty0 + 30))
        HEIGHTS.append({"x0": round(tx0 + hf["x0"], 2), "y0": round(ty0 + hf["y0"], 2), "dx": hf["dx"], "nx": hf["nx"], "ny": hf["ny"], "h": [round(LMP.trash_height(hf["x0"] + i * hf["dx"], hf["y0"] + j * hf["dx"]), 2) for j in range(hf["ny"]) for i in range(hf["nx"])]})
        print("TRASH MOUNTAIN at", round(tx0), round(ty0))
    else:
        c_ = centroid(TM); print("TRASH MOUNTAIN MISS", fp_problems(("trash_mountain", c_[0], c_[1], hf["nx"] * hf["dx"] * .92, hf["ny"] * hf["dx"] * .92, 0.0, ()), footprints(), 0.0)[:4])
for (x, y) in spots(TM, 3, 72):
    if try_place("tm_shed", lambda nm: dk.warehouse(nm, 14, 10, 7), x, y, road_facing_rz, 14, 10, 1.0, near=14): break
tick_('landfill')
if os.environ.get('QUICK'): print('PLACED', PLACED); import sys as _s; _s.exit(0)
# -- industrial park (south-west edge)
IND = D("Creekside Industrial Park")
print("WAREHOUSES", frontage_all(industrial=True))
rr_ = random.Random(33)
for (x, y) in spots(IND, 5, 33):
    rz_ = rr_.choice((0, 90)); w_, d_ = (20.0, 7.0) if rz_ == 0 else (7.0, 20.0)
    if PLACED.get("yard", 0) < 8 and try_place("yard", lambda nm, sd=rr_.randint(1, 99): dk.containers(nm, 3, 2, 2, sd), x, y, rz_, 20.0, 7.0, 2.0, near=22): pass
    elif PLACED.get("truck", 0) < 8 and try_place("truck", lambda nm, sd=rr_.randint(1, 99): dk.truck(nm, sd), x, y, rr_.choice((0, 90)), 3.0, 13.0, 1.5, near=22): pass
for (x, y) in spots(IND, 4, 34):
    if try_place("tower", lambda nm: dk.water_tower(nm), x, y, 0, 10, 10, 2.0): break
tick_('industrial')
print("HOMES", frontage_all()); print("REJECTS", sorted(REJ.items(), key=lambda t: -t[1])[:30])
for nm_, kind_, mk_, w_, d_, cnt_ in (("Lakeview Estates (canal homes)", "lv", estate_maker, 13, 10, 20), ("The Lakes (lake homes)", "lk", lake_maker, 11, 8.5, 30), ("Northridge Homes", "nr", two_storey_maker, 11, 9, 24), ("Southgate Homes", "sg", ranch_maker, 12.5, 8, 24),
                                      ("Centre homes", "ch", centre_maker, 11, 8.5, 12), ("Bayview homes (SE tip)", "bv", bay_maker, 12, 9, 10), ("Palm View (small homes)", "pv", bungalow_maker, 9.5, 8, 50), ("West Creek Townhomes (middle)", "twn", row_maker, 25.6, 10.2, 6), ("West Creek Townhomes (south)", "twn", row_maker, 25.6, 10.2, 8)):
    fill_poly(D(nm_), kind_, mk_, w_, d_, PLACED.get(kind_, 0) + cnt_, 20, .6, step=4, seed=hash(nm_) % 89)
fill_poly(IND, "wh", wh_maker, 24, 18, PLACED.get("wh", 0) + 14, 30, 1.0, step=4, seed=3)
fill_poly(D("Riverside Condos + Marina"), "condo", condo_maker, 26, 14, PLACED.get("condo", 0) + 6, 26, 1.0, step=4, seed=5)
fill_poly(D("Canal Ridge Condos"), "condo", condo_maker, 26, 14, PLACED.get("condo", 0) + 6, 26, 1.0, step=4, seed=6)
tick_('homes')
# -- parks: Lakeside Park, Windmill Park, Bay park, Heron Point + Preserve
def park_kit(poly, courts=1, pavilions=2, picnics=6, seed=3):
    rr = random.Random(seed)
    for (x, y) in spots(poly, 4, seed):
        if PLACED.get("pcourt", 0) < courts and near_road(x, y, 45) and add_static(lambda B_, x=x, y=y: civic.basketball(B_, CM, cbs, x, y), x, y, 16, 10, "pcourt", 2.0): continue
        if PLACED.get("pavilion", 0) < pavilions and add_static(lambda B_, x=x, y=y: civic.pavilion(B_, CM, cbs, ccs, x, y), x, y, 7, 7, "pavilion", 2.0): continue
        if PLACED.get("picnic", 0) < picnics and add_static(lambda B_, x=x, y=y: civic.picnic(B_, CM, cbs, x, y), x, y, 2.4, 2.6, "picnic", .8): continue
park_kit(D("Lakeside Park"), 1, 3, 8, 21)
park_kit(D("Windmill Park"), 1, 2, 8, 22)
for (x, y) in spots(D("Windmill Park"), 3, 24):                                                                       # the landmark windmill
    if try_place("windmill", lambda nm: dk.windmill(nm), x, y, 0, 8, 8, 3.0): break
for poly, nm in ((D("Heron Point (marina + preserve)"), "visitor"), (D("Heron Preserve (pond + boardwalk)"), "visitor2")):
    for (x, y) in spots(poly, 3, 25):
        if try_place(nm, lambda nm_: make_house(nm_, 16, 10, 1, "white", 3, balcony=False, roof_h=3.0), x, y, road_facing_rz(x, y), 16, 10, 1.5, near=30): break
for (x, y) in spots(D("Heron Preserve (pond + boardwalk)"), 3, 26):
    if try_place("dome", lambda nm: dk.dome(nm), x, y, 0, 16, 12, 1.5): break
for poly, n_, sd in ((D("Heron Point (marina + preserve)"), 10, 1), (D("Heron Preserve (pond + boardwalk)"), 14, 2), (D("Lakeside Park"), 22, 3), (D("Windmill Park"), 22, 4)):
    scatter_poly(poly, "oak", n_, pad=2.5, gap=8.0, seed=sd); scatter_poly(poly, "palm_medium", max(3, n_ // 3), pad=2.5, gap=12.0, shrub_too=False, seed=sd + 10)
# marina: piers into the water west of Riverside + a few moored boats
MARINA = Builder("marina"); pier_m = M("pier_wood", "#8a6a44", rough=.9); hull_m = M("boat_white", "#f1f3f4"); trim_m = M("boat_blue", "#2a5aa8")
px0, py0 = MP.to_m((62, 700))
for k in range(4):
    yy = py0 + (k - 1.5) * 12.0; MARINA.box(pier_m, px0 - 12, px0 + 4, yy - .8, yy + .8, .05, .35)
    for sd in (-1, 1):
        if (k + sd) % 2 == 0: bx_ = px0 - 8 + sd * 0; MARINA.box(hull_m, px0 - 10, px0 - 3, yy + sd * 2.6 - 1.0, yy + sd * 2.6 + 1.0, .02, .9); MARINA.box(trim_m, px0 - 10, px0 - 3, yy + sd * 2.6 - 1.05, yy + sd * 2.6 + 1.05, .6, .75)
STATIC.append(MARINA.build())
tick_('parks')
# -- golf course: fairways, greens, bunkers inside the golf polygon, clubhouse + lot by Club Dr
GOLF = D("Creekview Golf Club"); gb = bbox(GOLF)
FAIR_M = M("fairway", "#6bbd57", rough=.95); GREEN_M = M("golf_green", "#4fae45", rough=.9); SAND_M = M("bunker", "#e6d9a8", rough=.95)
def organic(cx, cy, rx, ry, seed, n=12, wob=.28, rot=0.0):
    r_ = random.Random(seed); ph = [r_.uniform(0, 6.28) for _ in range(3)]; out = []
    for k in range(n):
        a = 2 * math.pi * k / n; f = 1 + wob * math.sin(2 * a + ph[0]) * .8 + wob * .7 * math.sin(3 * a + ph[1]) + wob * .45 * math.sin(5 * a + ph[2]) + r_.uniform(-.06, .06)
        x, y = rx * f * math.cos(a), ry * f * math.sin(a); c_, s_ = math.cos(rot), math.sin(rot); out.append((cx + x * c_ - y * s_, cy + x * s_ + y * c_))
    return out
holes_ = [((gb[0] + 55, gb[3] - 20), (gb[0] + 60, gb[1] + 22)), ((gb[0] + 30, gb[3] - 40), (gb[0] + 38, gb[1] + 40)), ((gb[0] + 80, gb[3] - 30), (gb[0] + 85, gb[1] + 28))]
for k_, (tee, grn) in enumerate(holes_):
    cx, cy = (tee[0] + grn[0]) / 2, (tee[1] + grn[1]) / 2; L_ = math.dist(tee, grn); rot = math.atan2(grn[1] - tee[1], grn[0] - tee[0])
    ctrl = organic(cx, cy, L_ / 2 - 6, 8, 70 + k_, 14, .1, rot)
    if all(raw_land(px, py) and inside(GOLF, px, py) and not in_lake(px, py, 2.0) for (px, py) in ctrl) and not any(near_bridge(px, py, 4) for px, py in ctrl): rd.flat_blob(RB, FAIR_M, ctrl, .02)
    g2 = organic(grn[0], grn[1], 6.5, 6.0, 80 + k_, 9, .1, 0)
    if all(raw_land(px, py) and inside(GOLF, px, py) and not in_lake(px, py, 2.0) for (px, py) in g2):
        rd.flat_blob(RB, GREEN_M, g2, .025); fl = Builder("flag"); fl.cyl(M("flag_pole2", "#f0f0f0"), (grn[0], grn[1], 1.2), .03, 2.4, "z", 4); fl.box(M("flag_red2", "#dd2222"), grn[0], grn[0] + .8, grn[1] - .02, grn[1] + .02, 1.8, 2.3); STATIC.append(fl.build())
        for (bx, by) in ((grn[0] - 8, grn[1] + 3), (grn[0] + 3, grn[1] - 8)):
            bc = organic(bx, by, 3.2, 2.4, 90 + int(bx) % 5, 8, .15, 0)
            if all(raw_land(px, py) and inside(GOLF, px, py) and not in_lake(px, py, 2.0) for (px, py) in bc): rd.flat_blob(RB, SAND_M, bc, .03)
frontage_lot(GOLF, "clubhouse", [(lambda nm: make_house(nm, 22, 12, 2, "cream", 5, balcony=True, roof_h=3.4), 22, 12, 0.0)], lot_d=14)
scatter_poly(GOLF, "oak", 10, pad=3.0, gap=14.0, shrub_too=False, seed=41); scatter_poly(GOLF, "palm_tall", 8, pad=3.0, gap=16.0, shrub_too=False, seed=42)
tick_('golf')
# -- scattered trees on the lawns of the residential districts (oaks, shrubs; palms kept rare), coast trees
for nm_ in ("Lakeview Estates (canal homes)", "West Creek Townhomes (gated)", "West Creek Townhomes (south)", "The Lakes (lake homes)", "Palm View (small homes)", "Centre homes", "Northridge Homes", "Southgate Homes", "Bayview homes (SE tip)", "Riverside Condos + Marina", "Canal Ridge Condos", "Elementary School", "Civic Center (City Hall + Police)", "Sports fields + stadium", "West Creek Townhomes (middle)"):
    poly = D(nm_); bb = bbox(poly); ar = (bb[2] - bb[0]) * (bb[3] - bb[1]); scatter_poly(poly, "oak", int(ar / 2400), pad=3.0, gap=12.0, shrub_too=True, seed=hash(nm_) % 97)
s_ = 0.0; kk_ = 0
while s_ < coast.L:                                                                                                       # sparse beach trees
    px_, py_ = coast.off(s_, 4.5 + R_.uniform(-.8, 1.2))
    if free(px_, py_, 1.5) and not near_bridge(px_, py_, 12): prop("palm_medium" if kk_ % 3 == 0 else "oak", px_, py_, R_.uniform(1.0, 1.3), col=False)
    s_ += 15.0 + R_.uniform(0, 8); kk_ += 1
rr_t = random.Random(91); nt_ = 0                                                                                                # extra lawn trees everywhere there is free ground (instanced props: cheap), so blocks never read as bare grass
for _ in range(9000):
    if nt_ >= 520: break
    x, y = rr_t.uniform(-280, 280), rr_t.uniform(-268, 225)
    if not free(x, y, 3.0) or not raw_land(x, y) or near_road(x, y, 2.5) is False and False: continue
    if any(inside(D(n_), x, y) for n_ in ("Creekview Golf Club", "Sports fields + stadium", "Trash Mountain (landfill)")): continue
    k_ = rr_t.random(); prop("oak" if k_ < .55 else "palm_medium" if k_ < .75 else "palm_tall" if k_ < .85 else "shrub_a", x, y, rr_t.uniform(.9, 1.3)); nt_ += 1
print("LAWN TREES", nt_)
tick_('trees')
# ================================================================  STREET FURNITURE  ========================================================
sx_ = CURB_SW + 1.5
for (x, y, tx, ty, s) in along(PKWY, 0, 21, 10): prop("palm_medium", x, y, 1.0)
for (x, y, tx, ty, s) in along(PKWY, 0, 7, 3.5):
    if (s - 10) % 21 > 2.5 and (s - 10) % 21 < 18.5: prop("shrub_a" if int(s) % 2 else "shrub_b", x, y, .9)
for side, ph in ((1, 0), (-1, 9)):
    for (x, y, tx, ty, s) in along(PKWY, side * (PKWY.hw + sx_), 20, 6 + ph): prop("palm_tall" if int(s / 9) % 2 else "palm_medium", x, y, 1.0)
    for (x, y, tx, ty, s) in along(PKWY, side * (PKWY.hw + CURB_SW - .6), 38, 12 + ph * 2): lamp_round(x, y, ty * side, -tx * side, 5.5)
for nm, r in ROAD.items():
    if r is PKWY or r.surf != "asphalt" or r.rank < 6: continue
    sp = 30 if r.rank < 8 else 24
    for side, ph in ((1, 0), (-1, 11)):
        for (x, y, tx, ty, s) in along(r, side * (r.hw + sx_), sp, 5 + ph): prop("palm_medium" if int(s) % 2 else "palm_tall", x, y, 1.0)
    for side in (1, -1):
        for (x, y, tx, ty, s) in along(r, side * (r.hw + CURB_SW - .6), 42, 10 if side > 0 else 31): lamp_round(x, y, ty * side, -tx * side, 5.0)
# signals at the biggest junctions
def signals_at(parent, child_name):
    for j in parent.junctions:
        if j["child"].name == child_name:
            px, py = j["p"]; ta = parent.at(j["sA"]); nx_, ny_ = -ta[3], ta[2]
            for a in (-1, 1):
                for b in (-1, 1):
                    x = px + ta[2] * a * (j["w"] + .5) + nx_ * b * (parent.hw + .9); y = py + ta[3] * a * (j["w"] + .5) + ny_ * b * (parent.hw + .9); dx, dy = -nx_ * b, -ny_ * b
                    ad = (1 if dx > 0 else -1, 0) if abs(dx) >= abs(dy) else (0, 1 if dy > 0 else -1)
                    signal(T, x, y, ad); ccir(x, y, .14, "pole")
            SIGN = {"Lyons Rd": "lyons", "Wiles Rd": "wiles", "Coconut Creek Pkwy": "pkwy", "Northridge Rd": "northridge"}
            for k_, (nm_, a, b) in enumerate(((parent.name, 1, 1), (child_name, -1, -1))):
                if nm_ not in SIGN: continue
                x = px + ta[2] * a * (j["w"] + 3.0) + nx_ * b * (parent.hw + 3.2); y = py + ta[3] * a * (j["w"] + 3.0) + ny_ * b * (parent.hw + 3.2)
                sign_pole(T, x, y, SIGN[nm_], 3.0 if len(nm_) > 9 else 2.2); ccir(x, y, .1, "pole")
for ch in MP.LIGHTS["Lyons Rd"]: signals_at(PKWY, ch)
tick_('furniture')
# ================================================================  CARS + WORLD DATA  ===========================================================
def route(road, off, rev=False, s0=0.0, s1=None): return [[round(a, 2), round(b, 2)] for a, b in rd.lane_path(road, off, rev, s0=s0, s1=s1)]
PAL = ["#e6e6e2", "#2b2d33", "#9aa0a8", "#2e5fa3", "#c8201c", "#3d7a52", "#d8b04a", "#7a3a2a", "#1fb3a8", "#7a9cc4", "#6b7a3a"]
PASSENGER = ["sedan"] * 4 + ["hatchback"] * 3 + ["suv"] * 3 + ["minivan"] * 2 + ["pickup"] * 2 + ["coupe"]
FIXED = {"police": "#1c1c20", "taxi": "#f2c21c", "ambulance": "#f4f4f2", "tow": "#f0f0ee", "bus": "#f2f2f0", "garbage": "#3f8a44", "boxtruck": "#3d8a46", "flatbed": "#e8b623", "van": "#ecebe6"}
def kc(kind): return FIXED.get(kind) or R_.choice(PAL)
pol = [f for f in FOOTREG if f[0] == "police"]; npol = 0
k = 0
for (sx_s, sy_s, rz, prob) in LOTS:
    near_pol = pol and math.hypot(sx_s - pol[0][1], sy_s - pol[0][2]) < 30
    if near_pol and npol < 4: kind = "police" if npol < 3 else "ambulance"; npol += 1
    elif R_.random() < prob: kind = R_.choice(PASSENGER)
    else: continue
    addcar(kind, kc(kind), f"parked{k}", sx_s, sy_s, rz); cbox(sx_s, sy_s, 1.8, 4.5, rz); COL[-1]["car"] = f"parked{k}"; k += 1
def park_curb(road_name, s_list, kinds, side=1):                                                                                # work vehicles parked at the curb (industrial park, landfill, gas station)
    global k
    r = ROAD[road_name]
    for s_, kind in zip(s_list, kinds):
        x, y, tx, ty = r.at(s_); px, py = r.off(s_, side * (r.hw - 1.3)); rz = math.degrees(math.atan2(-tx, ty)) + (0 if side < 0 else 180)
        if not free(px, py, 0.0, own=r) and False: continue
        addcar(kind, kc(kind), f"parked{k}", px, py, rz); k += 1
park_curb("Industrial Row", (40, 90, 140, 175), ("boxtruck", "flatbed", "van", "boxtruck"))
park_curb("Creekside Rd", (30, 70), ("flatbed", "van"), -1)
park_curb("Landfill Rd", (8,), ("garbage",))
park_curb("Gas Station Rd", (20,), ("tow",))
TRAFFIC = []
def add_traffic(name, road, off, rev, speed, s0, kind="sedan", color=None, a=0.0, b=None):
    p = route(road, off, rev, a, b); color = color or kc(kind); TRAFFIC.append({"name": name, "path": p, "speed": speed, "s0": s0, "kind": kind, "color": color}); addcar(kind, color, name, p[0][0], p[0][1], 0)
L3 = PKWY.mh + (PKWY.hw - PKWY.mh) * .5                                                                                          # Lyons Rd middle lane
add_traffic("traffic0", PKWY, -LANE, False, 7, 40, "bus"); add_traffic("traffic1", PKWY, LANE, True, 9, 60, "sedan", "#e6e6e2"); add_traffic("traffic8", PKWY, -L3, False, 10, 200, "coupe", "#d42a24"); add_traffic("traffic9", PKWY, L3, True, 8.5, 300, "suv")
add_traffic("traffic2", WILES, -2.5, False, 8, 30, "taxi"); add_traffic("traffic3", WILES, 2.5, True, 7, 80, "boxtruck")
add_traffic("traffic4", ROAD["Coconut Creek Pkwy"], -2.5, False, 7.5, 50, "hatchback"); add_traffic("traffic5", ROAD["Coconut Creek Pkwy"], 2.5, True, 7, 20, "taxi")
add_traffic("traffic6", ROAD["Northridge Rd"], -2.2, False, 7, 10, "minivan"); add_traffic("traffic7", ROAD["South Loop Rd"], -LANE * .8, False, 7, 30, "garbage")
add_traffic("traffic10", ROAD["Creekview Dr"], -2.2, False, 7.5, 40, "pickup"); add_traffic("traffic11", ROAD["West Creek Rd"], 2.2, True, 7, 60, "van")
def sidewalk_path(road, side): return [[round(a, 2), round(b, 2)] for a, b in rd.lane_path(road, side * (road.hw + rd.CURB + 1.2))]
WALK = [{"path": sidewalk_path(PKWY, 1)}, {"path": sidewalk_path(PKWY, -1)}, {"path": sidewalk_path(WILES, 1)}, {"path": sidewalk_path(WILES, -1)}, {"path": sidewalk_path(ROAD["Coconut Creek Pkwy"], 1)}, {"path": sidewalk_path(ROAD["Coconut Creek Pkwy"], -1)},
        {"path": [[round(a, 2), round(b, 2)] for a, b in rd.lane_path(PROM, 0)]}, {"path": sidewalk_path(ROAD["Northridge Rd"], 1)}]

# ================================================================  WORLD EDGE + DATA  =======================================================
T.cyl(M("shadow_dummy", "#000000"), (0, 0, -5), .01, .01, "z", 3); STATIC.append(T.build(vc=True)); STATIC.extend(RB.build(vc=True, recalc=False))
ROADLINES = [{"pts": [[round(a, 1), round(b, 1)] for a, b in rd.lane_path(r, 0, step=6, s0=p[0], s1=p[1])], "w": round(2 * r.hw, 1), "closed": r.closed} for r in net if r.surf == "asphalt" for p in r.pieces]
MAP.insert(0, [0, 0, 0, 0, "#5d9a3a", "poly", [[round(p[0], 1), round(p[1], 1)] for p in coast.d[::10]]])
def V(nm, pitch=48, dist=40): x_, y_ = LM[nm]; return {"label": nm, "tx": round(x_, 1), "ty": round(y_, 1), "pitch": pitch, "dist": dist}
WORLD = {"name": "coconut", "title": "Coconut Creek", "glb": "scene.glb", "mapbg": "#2d78b8", "extent": EXT - 4, "sky": "#8fc3f5", "fog": ["#c4dcf2", 110, 320], "hemi": ["#cfe4ff", "#6f8a4a", 1.55], "sun": {"color": "#fff0d6", "intensity": 3.7, "dir": [-0.5, -0.74, 0.45]},
         "heights": HEIGHTS, "exposure": 1.0, "tone": "AgX", "lamps": [], "ground": "#5d9a3a", "start": START, "money": 1250, "traffic": TRAFFIC, "walk": WALK, "walkers": 16, "fight": {"x": round(START["x"] + 6, 1), "y": START["y"]}, "demo": None,
         "views": {"drive": {"label": "Play", "mode": "drive", "pitch": 45, "dist": 44}, "plaza": dict(V("Publix", 48, 34), label="Plaza"), "homes": dict(V("Lakeside Park", 48, 40), label="Park"), "over": {"label": "Overview", "tx": 0, "ty": -14, "pitch": 40, "dist": 440}},
         "map": MAP, "roads": ROADLINES}
json.dump(COL, open(os.path.join(OUT, "colliders_coconut.json"), "w")); json.dump(PROPS, open(os.path.join(OUT, "props_coconut.json"), "w")); json.dump(CARS, open(os.path.join(OUT, "cars_coconut.json"), "w")); json.dump(WORLD, open(os.path.join(OUT, "world_coconut.json"), "w"))
pc = {}
for p in PROPS: pc[p["k"]] = pc.get(p["k"], 0) + 1
tick_('pre-check'); LAYOUT_BAD = check_layout(); tick_('checked'); print("PLACED", PLACED)
print("COCONUT colliders", len(COL), "props", pc, "cars", len(CARS))
if not os.environ.get("NORENDER"):
    tmpl = {k_: f() for k_, f in veg.KIT.items()}
    for o in tmpl.values(): o.hide_render = True; o.location = (0, 0, -50)
    for p in PROPS:
        o = bpy.data.objects.new(p["k"], tmpl[p["k"]].data); bpy.context.scene.collection.objects.link(o); o.location = (p["x"], p["y"], 0)
        o.rotation_euler = (0, 0, math.radians(p["rz"])); o.scale = (p["s"], p["s"], p["s"]) if p["k"] != "hedge" else (1, 1, 1)
    def sh(nm, tx, ty, pitch=50, dist=110, w=1000, h=640): return (nm, ((tx, ty, 0), pitch, dist, w, h))
    SHOTS = dict([("cc_city", ((0, -14, 0), 62, 700, 1400, 1200))] + [sh("cc_" + k_, *MP.to_m(v_), 50, 110) for k_, v_ in (("market", (790, 490)), ("lakes", (540, 420)), ("palmview", (540, 660)), ("ind", (400, 930)), ("civic", (960, 620)), ("prom", (1120, 960)), ("golf", (1230, 450)), ("canal", (1210, 790)), ("lakeview", (520, 160)), ("north", (830, 170)), ("west", (160, 640)), ("south", (790, 980)), ("casino", (1180, 495)), ("trash", (265, 1100)))])
    SHOTS["cc_game"] = ((START["x"], START["y"] + 8, 0), 45, 44, 500, 900)
    if os.environ.get("SHOT"): x_, y_, p_, d_ = [float(v) for v in os.environ["SHOT"].split(",")]; SHOTS = {"dbg": ((x_, y_, 0), p_, d_, 1000, 700)}
    for nm, (tgt, pitch, dist, w, h) in SHOTS.items():
        for o in [x for x in bpy.context.scene.objects if x.type == "CAMERA"]: bpy.data.objects.remove(o)
        game_camera(tgt, pitch, dist); render(os.path.join(OUT, nm + ".png"), w, h, samples=20, keep_transform=True)
export_glb("coconut_scene", [o for o in STATIC if o.type in ("MESH", "EMPTY")])
print("EXPORTED")
