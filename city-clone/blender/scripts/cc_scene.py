"""Coconut Creek v7 (round 38): the rebuilt city at 2.5x, built from the agreed plan (plan/v7/layout.json, written by plan/v7/plan_v7.py).
Milestone 1 = the skeleton you can drive: ground, every road (junctions, curbs, sidewalks, paint) through roads.py, lots with stalls and parked cars, lakes + the canal,
the landmark buildings as coloured blocks (real models + business signs come in M2), houses (linked duplicates of 6 make_house variants), palms, colliders.
Run: NORENDER=1 blender -b --python scripts/cc_scene.py  ->  out/cc_scene.glb, out/{colliders,props,cars,world}_cc.json ; then bash publish_cc.sh"""
import sys, os, json, math, random; sys.stdout.reconfigure(line_buffering=True); sys.path.insert(0, os.path.dirname(__file__))
from kit import *; from street_fl import *; from building_fl import make_house; import roads as rd; import mood; import time as _t
T0 = _t.time()
def tick_(n): print('T', n, round(_t.time() - T0, 1))
HERE = os.path.dirname(os.path.abspath(__file__)); LP = json.load(open(os.path.join(HERE, "..", "..", "plan", "v7", "layout.json")))
B = LP["bounds"]; XW, XE, YS, YN = B["xw"], B["xe"], B["ys"], B["yn"]
sys.path.insert(0, os.path.join(HERE, "..", "..", "plan", "v7")); import shrink as SHK      # round 46: the squeeze (plan/v7/shrink.py)
WARP = [False]                                                                               # True while a HAND-PLACED site runs: its old-map coordinates are squeezed on the way in
def W(x, y): return SHK.M(x, y) if WARP[0] else (x, y)
def Wbox(x0, x1, y0, y1):
    if not WARP[0]: return x0, x1, y0, y1
    X0, X1 = SHK.span(x0, x1, SHK.fx); Y0, Y1 = SHK.span(y0, y1, SHK.fy); return X0, X1, Y0, Y1
class warp:
    def __enter__(s): s.o = WARP[0]; WARP[0] = True
    def __exit__(s, *a): WARP[0] = s.o
def wq(kind):
    """Query helpers (near_road, on_cut, ...) see squeezed coordinates: map the arguments once, then run with the squeeze off (no double mapping)."""
    def deco(fn):
        def g(*a, **k):
            if not WARP[0]: return fn(*a, **k)
            a = list(a)
            if kind == "pt": a[0], a[1] = SHK.M(a[0], a[1])
            else: a[0], a[1], a[2], a[3] = SHK.rect(a[0], a[1], a[2], a[3])
            WARP[0] = False
            try: return fn(*a, **k)
            finally: WARP[0] = True
        return g
    return deco
class WList(list):
    """List whose appends are squeezed while a hand-placed site runs. kind: rect (x0, y0, x1, y1, ...), pt (x, y, ...), map (MAP entries)."""
    def __init__(s, kind, *a): super().__init__(*a); s.kind = kind
    def append(s, v):
        if WARP[0]:
            t = list(v)
            if s.kind == "rect": t[0], t[1], t[2], t[3] = SHK.rect(*t[:4])
            elif s.kind == "pt": t[0], t[1] = SHK.M(t[0], t[1])
            elif s.kind == "map":
                if len(t) > 5 and t[5] == "poly": t[6] = [list(SHK.M(*q)) for q in t[6]]
                else: t[0], t[1], t[2], t[3] = [round(v_, 1) for v_ in SHK.rect(*t[:4])]
            v = type(v)(t) if isinstance(v, tuple) else t
        super().append(v)
reset(); mood.florida(); mood._transform(); R_ = random.Random(38); m = mats(); m["dirt"] = M("dirt_track", "#a58a62")
class Tiled:                                                                    # flat surfaces split into 128 m tiles so the page can frustum-cull them
    def __init__(self, name, size=128): self.name, self.size, self.b = name, size, {}
    def _k(self, pts): return (int(math.floor(sum(p[0] for p in pts) / len(pts) / self.size)), int(math.floor(sum(p[1] for p in pts) / len(pts) / self.size)))
    def poly(self, mt, pts):
        if WARP[0]: pts = [(*SHK.M(p[0], p[1]), *p[2:]) for p in pts]
        k = self._k(pts); self.b.setdefault(k, Builder(f"{self.name}_{k[0]}_{k[1]}")).poly(mt, pts)
    def box(self, mt, x0, x1, y0, y1, z0, z1):
        """Big boxes are cut on the tile grid: every tile mesh stays ~128 m across, so the meshopt position quantization keeps millimetres (a 575 m lot in one mesh lost
        its 3 cm lift above the grass and flickered green on the phone)."""
        x0, x1, y0, y1 = Wbox(x0, x1, y0, y1)
        S = self.size; C_ = 32 if z1 - z0 < .45 and self.name in ("roads", "drives", "gap43", "ground") else S          # round 44: flat lot surfaces in <= 32 m cells (big triangles dropped out on some GPUs)
        xs = [x0] + [g * C_ for g in range(int(math.floor(x0 / C_)) + 1, int(math.ceil(x1 / C_)))] + [x1]; ys = [y0] + [g * C_ for g in range(int(math.floor(y0 / C_)) + 1, int(math.ceil(y1 / C_)))] + [y1]
        for a, b in zip(xs, xs[1:]):
            for c, d in zip(ys, ys[1:]):
                if b - a < 1e-3 or d - c < 1e-3: continue
                k = self._k([(a, c), (b, d)]); self.b.setdefault(k, Builder(f"{self.name}_{k[0]}_{k[1]}")).box(mt, a, b, c, d, z0, z1)
    def build(self, **kw): return [b.build(**kw) for b in self.b.values()]
RB, GB, BB = Tiled("roads"), Tiled("ground"), Tiled("blocks")
COL, PROPS, CARS, STATIC, MAP = [], [], [], [], WList("map")
def cbox(x, y, w, d, rz=0, **kw): x, y = W(x, y); COL.append(dict({"t": "box", "x": round(x, 2), "y": round(y, 2), "w": round(w, 2), "d": round(d, 2), "rz": round(rz, 1)}, **kw)); return COL[-1]
def ccir(x, y, r, soft=None):
    x, y = W(x, y)
    COL.append({"t": "circle", "x": round(x, 2), "y": round(y, 2), "r": r})
    if soft: COL[-1]["soft"] = soft
def prop(kind, x, y, s=None, col=True):
    x, y = W(x, y); o_ = WARP[0]; WARP[0] = False
    s = s or R_.uniform(.9, 1.15); PROPS.append({"k": kind, "x": round(x, 2), "y": round(y, 2), "rz": round(R_.uniform(0, 360)), "s": round(s, 2)})
    if col: ccir(x, y, .5 * s, "bush") if kind.startswith("shrub") else ccir(x, y, {"palm_tall": .2, "palm_medium": .19, "palm_small": .16, "oak": .4}.get(kind, .3))
    WARP[0] = o_
MATC = {}
def flat(hexs):
    if hexs not in MATC: MATC[hexs] = M("cc_" + hexs.lstrip("#"), hexs)
    return MATC[hexs]
def shade(hexs, k):
    h = hexs.lstrip("#"); r, g, b_ = (int(h[i:i + 2], 16) for i in (0, 2, 4)); return "#%02x%02x%02x" % tuple(max(0, min(255, int(c * k))) for c in (r, g, b_))

# ================================================================  GROUND + ZONES  ================================================================
MARGIN = 160
GB.box(flat("#557f3a"), XW - MARGIN, XE + MARGIN, YS - MARGIN, YN + MARGIN, -.4, -.12)          # beyond the edge (darker)
for x0 in range(int(XW), int(XE), 128):                                                        # playable ground in tiles
    for y0 in range(int(YS), int(YN), 128): GB.box(m["grass"], x0, min(x0 + 128, XE), y0, min(y0 + 128, YN), -.3, 0)
for z in LP["zones"]:
    pts = z["poly"]; col = z["color"]
    if z["label"] == "TRASH MOUNTAIN": col = "#7a8a4a"
    xs_, ys_ = [p[0] for p in pts], [p[1] for p in pts]
    tint = {"#6fa84e": "#64a345", "#6aa548": "#619f43", "#78ad5a": "#66a446", "#7cc05a": "#69a948", "#7cae5e": "#66a548", "#6a9a45": "#629c41"}.get(col)      # round 43: textured lawns, tints kept
    zm = M("zgrass_" + tint[1:], tint, tex="grass_" + tint[1:], tile=4.0) if tint and os.path.exists(os.path.join(OUT, "tex", "grass_" + tint[1:] + ".png")) else flat(col)  # near the base grass
    GB.box(zm, min(xs_), max(xs_), min(ys_), max(ys_), -.05, .015)      # every zone is a rectangle
    MAP.append([0, 0, 0, 0, col, "poly", [[round(p[0], 1), round(p[1], 1)] for p in pts]])
tick_("ground")

# ================================================================  ROADS  ================================================================
RANK = dict(hwy=13, art=10, col=7, blvd=5, loc=4, ramp=3, alley=2, driven=4, drive=3)       # round 44: drive / driven = the Promenade's one-lane-each-way streets
NET, TRAILS = [], []
for d in LP["roads"]:
    k, hw = d["kind"], d["w"] / 2; closed = d["closed"]; pts = []
    for p in d["pts"]:
        if not pts or math.dist(pts[-1], p) > .3: pts.append(tuple(p))                              # drop repeated points (the catmull spline divides by segment length)
    if not closed and math.dist(pts[0], pts[-1]) < .5 and len(pts) > 8: closed = True; pts = pts[:-1]      # the Hammocks ring is drawn as a loop
    if k == "trail": TRAILS.append((d["name"], pts, hw)); continue
    kw = dict(hw=hw, rank=RANK[k], flare=6.5 if k == "art" else 4.5 if k in ("col", "blvd", "loc") else 3.0 if k in ("drive", "driven") else 2.5, closed=closed)
    if d["name"] == "Lyons Rd": kw.update(mh=2.0, rank=12, flare=7.0)
    if k == "art" and abs(pts[0][1] - pts[-1][1]) < abs(pts[0][0] - pts[-1][0]): kw.update(rank=9)          # east-west arterials meet the north-south ones as children (no overlapping curbs)
    if k in ("art", "drive", "driven"): kw.update(xwalk=True)                                   # round 44: crosswalks on the Promenade / campus streets too
    if k == "hwy": kw.update(mh=1.6, sw=(0, 0), xwalk=False)
    if k == "blvd": kw.update(mh=1.2)
    if k in ("alley", "ramp"): kw.update(sw=(0, 0), mark=k == "ramp")
    if closed: kw.update(rank=5, sw=(0, 1))                                                    # lake rings: CCW, sidewalk on the outside only
    NET.append(rd.Road(d["name"], pts, **kw))
for i, r_ in enumerate(LP["roundabouts"]): NET.append(rd.ring_road(f"rbt_{i}", r_["x"], r_["y"], r_["r"], 4.5, rank=6))
net = rd.build_network(NET); tick_("network")
for r in net: rd.draw_road(RB, r, m)
for r in net:
    if r.island: rd.island_disc(RB, None, m, *r.island)
for c in LP["culs"]:                                                                           # cul-de-sac turning circles
    n = 24
    for k in range(n):
        a0, a1 = 2 * math.pi * k / n, 2 * math.pi * (k + 1) / n; R0 = c["r"] + 1.5
        RB.poly(m["asphalt"], [(c["x"], c["y"], .032), (c["x"] + R0 * math.cos(a0), c["y"] + R0 * math.sin(a0), .032), (c["x"] + R0 * math.cos(a1), c["y"] + R0 * math.sin(a1), .032)])
for name, pts, hw in TRAILS:
    pts = [q for i, q in enumerate(pts) if i == 0 or math.dist(q, pts[i - 1]) > .3]                                                                   # dirt / paver trails: no curbs, not in the network
    tr = rd.Road(name, pts, hw=hw, rank=0, sw=(0, 0), mark=False); rd.strip(RB, m["dirt"], tr, 0, tr.L, -hw, hw, .026)
tick_("roads drawn")
@wq("pt")
def near_road(x, y, pad):
    for r in net:
        if r.bb[0] - 40 > x or x > r.bb[2] + 40 or r.bb[1] - 40 > y or y > r.bb[3] + 40: continue
        if r.nearest(x, y)[0] < r.hw + pad: return r
    return None

# ================================================================  WATER: lakes + the canal  ================================================================
WATER_RINGS = []
for lk in LP["lakes"]:
    ctrl = [(lk["x"] + lk["rx"] * math.cos(2 * math.pi * i / 16), lk["y"] + lk["ry"] * math.sin(2 * math.pi * i / 16)) for i in range(16)]
    ring, (cx, cy) = rd.lake(RB, m, ctrl, bank=1.6, step=4.0); WATER_RINGS.append(ring); COL.extend(rd.lake_colliders(ring, cx, cy))
    MAP.append([round(cx, 1), round(cy, 1), 0, 0, "#2d78b8", "poly", [[round(p[0], 1), round(p[1], 1)] for p in ring[::2]]])
CN = LP["canal"]; cx0, cx1 = CN["x"] - CN["w"] / 2, CN["x"] + CN["w"] / 2
ys = [CN["y0"]]
for yy in range(int(CN["y0"]), int(CN["y1"]) + 1, 2):                                          # split the canal where a road crosses it (bridges)
    over = near_road(CN["x"], yy, 2.5) is not None
    ys.append((yy, over))
segs, cur = [], None
for yy, over in ys[1:]:
    if not over and cur is None: cur = yy
    if over and cur is not None: segs.append((cur, yy - 2)); cur = None
if cur is not None: segs.append((cur, CN["y1"]))
for (a, b_) in segs:
    if b_ - a < 3: continue
    RB.box(m["bank"], cx0 - 1.6, cx1 + 1.6, a, b_, 0, .035); RB.box(m["water"], cx0, cx1, a, b_, 0, .07)
    ring = [(cx0, a), (cx1, a), (cx1, b_), (cx0, b_)]; WATER_RINGS.append(ring)
    for (p, q, r__) in (((cx0, a), (cx1, a), (cx1, b_)), ((cx0, a), (cx1, b_), (cx0, b_))): COL.extend(rd.tri_colliders([(p, q, r__)]))
    MAP.append([0, 0, 0, 0, "#2d78b8", "poly", [[round(p[0], 1), round(p[1], 1)] for p in ring]])
for (a, b_) in zip([s[1] for s in segs], [s[0] for s in segs[1:]]):                           # bridge rails where the roads cross
    for x_ in (cx0 - 1.2, cx1 + .8): RB.box(m["curb"], x_, x_ + .4, a, b_, 0, .9)
tick_("water")

exec(open(os.path.join(HERE, "cc_fill.py")).read())                                            # round 39 (M2): real models, pads, walls, yards, parks (cc_fill.py)
# ================================================================  LOTS, PARKED CARS, BLOCKS  ================================================================
FOOT = WList("rect")                                                                            # (x0, y0, x1, y1) footprints houses must avoid
HEIGHT = {"WALMART": 9, "PUBLIX": 8, "SEMINOLE CASINO": 34, "CITY HALL": 13, "POLICE": 9, "COCONUT CREEK HIGH": 10, "COCONUT CREEK ELEMENTARY": 8, "FIRE STATION": 9, "GARAGE": 12,
          "OFFICE GARAGE": 12, "OFFICES": 20, "CINEMA": 13, "COOPER'S HAWK": 8, "PLAZA": 2, "REC CENTER": 8, "POOL": 4, "McD": 6, "WALGREENS": 7}
PAL = ["#e6e6e2", "#2b2d33", "#9aa0a8", "#2e5fa3", "#c8201c", "#3d7a52", "#d8b04a", "#7a3a2a", "#1fb3a8", "#7a9cc4"]
PASSENGER = ["sedan"] * 4 + ["hatchback"] * 3 + ["suv"] * 3 + ["minivan"] * 2 + ["pickup"] * 2 + ["coupe"]
ncar = 0; PUBLIX = LP["publix"]
def addcar(kind, x, y, rz, color=None):
    global ncar; x, y = W(x, y); o_ = WARP[0]; WARP[0] = False; color = color or R_.choice(PAL); nm = f"parked{ncar}"; ncar += 1
    CARS.append({"name": nm, "kind": kind, "color": color, "x": round(x, 2), "y": round(y, 2), "rz": round(rz, 1)}); cbox(x, y, 1.8, 4.5, rz, car=nm); WARP[0] = o_
def in_bld(x, y, blds, pad=1.0): return any(b_["x0"] - pad < x < b_["x1"] + pad and b_["y0"] - pad < y < b_["y1"] + pad for b_ in blds)
for lot in LP["lots"]:
    xs = [p[0] for p in lot["poly"]]; ys_ = [p[1] for p in lot["poly"]]; x0, x1, y0, y1 = min(xs), max(xs), min(ys_), max(ys_)
    RB.box(m["asphalt"], x0, x1, y0, y1, 0, .028); FOOT.append((x0, y0, x1, y1)); MAP.append([round(x0, 1), round(y0, 1), round(x1, 1), round(y1, 1), "#5a5c60"])
    blds = lot["buildings"]; vert = lot["dir"] == "v"
    if lot["dir"] != "n" and not (blds and blds[0]["label"] == "McD"): lot_drives(x0, x1, y0, y1, blds, "/".join(b_["label"] for b_ in blds) or "lot")   # round 44: real driveways
    if blds and blds[0]["label"] == "McD":
        with warp(): mcd_site((x0, x1, y0, y1))
        continue                # round 44: tight lot + drive-thru loop (cc_fill3)
    if blds and blds[0]["label"] in BRAND_DEALERS:                                            # dealer display lot: rows of new cars instead of stalls
        dealer_cars((x0, x1, y0, y1), blds)
        for b_ in blds: SITE(b_, (x0, x1, y0, y1))
        continue
    if lot["dir"] == "n":                                                                      # round 44: blocks with no parking (pedestrian main street, shop rows)
        for b_ in blds: SITE(b_, (x0, x1, y0, y1))
        continue
    a0, a1, b0, b1 = (y0, y1, x0, x1) if vert else (x0, x1, y0, y1)                            # rows run along b; stalls step along b, rows stack along a
    a = a0 + 3.0; row = 0
    while a + 5.2 < a1 - 2:
        for s in range(int(b0 + 2), int(b1 - 3), 3):
            ax = (s, a) if vert else (a, s)                                                    # stall corner
            cxs, cys = (s + 1.5, a + 2.6) if vert else (a + 2.6, s + 1.5)
            if in_bld(cxs, cys, blds, 2.0) or in_drive(cxs, cys, 1.0): continue
            if vert: RB.box(m["white"], s - .05, s + .05, a, a + 5.2, .028, .034)
            else: RB.box(m["white"], a, a + 5.2, s - .05, s + .05, .028, .034)
            if math.hypot(cxs - PUBLIX[0], cys - PUBLIX[1]) > 25 and R_.random() < .025 and ncar < 200: addcar(R_.choice(PASSENGER), cxs, cys, (0 if row % 2 else 180) + (0 if vert else 90))
            elif math.hypot(cxs - PUBLIX[0], cys - PUBLIX[1]) > 25 and not on_cut(cxs, cys, 4) and R_.random() < lot_fill(cxs, cys, x0, x1, y0, y1, blds):          # round 40: static parked cars, denser near the doors
                c_ = CARCOL[R_.randrange(len(CARCOL))]; o_ = linked(f"dcar_{c_[1:]}", lambda nm, c_=c_: display_car(nm, c_)); rz_ = (0 if row % 2 else 180) + (0 if vert else 90)
                place(o_, cxs, cys, rz=rz_ + R_.uniform(-4, 4)); cbox(cxs, cys, 1.9, 4.5, rz_)
        if row % 2 == 0 and (row // 2) % 2 == 1 and a + 6.2 < a1 - 2: lot_island(a + 5.2, b0 + 3, b1 - 4, vert, blds)       # round 39: planted islands between double rows (real FL lots)
        a += 5.2 if row % 2 == 0 else 5.2 + 7.0; row += 1
    for bb_ in (b0 + 1.0, b1 - 2.0):                                                           # end-cap islands along both lot edges
        lot_edge(a0 + 3, min(a, a1 - 2), bb_, vert, blds)
    for b_ in blds: SITE(b_, (x0, x1, y0, y1))                                                 # round 39: real models (cc_fill.py)
tick_("lots")
# Trash Mountain: a stepped grassy mound (not drivable); Wynmoore golf greens; the HS football field + track; rec courts (flat)
TM = [z for z in LP["zones"] if z["label"] == "TRASH MOUNTAIN"][0]["poly"]; tx0, tx1 = min(p[0] for p in TM), max(p[0] for p in TM); ty0, ty1 = min(p[1] for p in TM), max(p[1] for p in TM)
tcx, tcy, trx, try_ = (tx0 + tx1) / 2, (ty0 + ty1) / 2, (tx1 - tx0) / 2 - 10, (ty1 - ty0) / 2 - 8
mound = Builder("trash_mountain")
for i, (k, h0, h1, col) in enumerate(((1.0, 0, 7, "#6f6a45"), (.8, 7, 15, "#6d7c43"), (.6, 15, 22, "#7a8a4c"), (.38, 22, 28, "#8a9a58"))):
    n = 40; rx, ry = trx * k, try_ * k; rx2, ry2 = trx * (k - .08), try_ * (k - .08)
    for j in range(n):
        a0, a1 = 2 * math.pi * j / n, 2 * math.pi * (j + 1) / n
        p0, p1 = (tcx + rx * math.cos(a0), tcy + ry * math.sin(a0)), (tcx + rx * math.cos(a1), tcy + ry * math.sin(a1)); q0, q1 = (tcx + rx2 * math.cos(a0), tcy + ry2 * math.sin(a0)), (tcx + rx2 * math.cos(a1), tcy + ry2 * math.sin(a1))
        mound.poly(flat(col), [(*p0, h0), (*p1, h0), (*q1, h1), (*q0, h1)])
        if i == 3: mound.poly(flat(col), [(tcx, tcy, h1), (*q0, h1), (*q1, h1)])
STATIC.append(mound.build(recalc=False))
COL.append({"t": "poly", "pts": [[round(tcx + trx * math.cos(2 * math.pi * j / 24), 2), round(tcy + try_ * math.sin(2 * math.pi * j / 24), 2)] for j in range(24)]})
FOOT.append((tx0, ty0, tx1, ty1))
for z in LP["zones"]:                                                                          # keep houses out of parks / schools / Wynmoore greens
    if z["label"] not in ("THE HAMMOCKS",) and "SHOPS" not in z["label"]:
        xs = [p[0] for p in z["poly"]]; ys_ = [p[1] for p in z["poly"]]
        if z["label"] in ("WYNMOORE (gated golf)",): continue
        FOOT.append((min(xs), min(ys_), max(xs), max(ys_)))
tick_("landmarks")

fill_pads(); tick_("pads")
# ================================================================  HOUSES (linked duplicates of 6 variants)  ================================================================
WALLS = ["cream", "peach", "butter", "sand", "white"]
VAR = [make_house(f"house_v{i}", 11 if i % 2 == 0 else 10, 8.5, 1 + (i % 3 == 0), WALLS[i % 5], 300 + i, garage=i % 2 == 0, balcony=False) for i in range(6)]
for o in VAR: o.location = (0, 0, -60)
placed = 0; PLACED_XY = []
for (hx, hy) in LP["houses"]:
    if any(f[0] - 3 < hx < f[2] + 3 and f[1] - 3 < hy < f[3] + 3 for f in FOOT) or on_cut(hx, hy, 9): continue
    if any(rd_.closed is False and rd_.nearest(hx, hy)[0] < rd_.hw + 4.5 for rd_ in net if rd_.bb[0] - 30 < hx < rd_.bb[2] + 30 and rd_.bb[1] - 30 < hy < rd_.bb[3] + 30): continue
    if any(r.closed and r.nearest(hx, hy)[0] < r.hw + 4.5 for r in net if r.bb[0] - 30 < hx < r.bb[2] + 30 and r.bb[1] - 30 < hy < r.bb[3] + 30): continue
    best = None
    for r in net:
        if r.bb[0] - 40 > hx or hx > r.bb[2] + 40 or r.bb[1] - 40 > hy or hy > r.bb[3] + 40: continue
        dd, s = r.nearest(hx, hy)
        if best is None or dd < best[0]: best = (dd, r, s)
    if not best or best[0] > 40: continue
    px, py, _, _ = best[1].at(best[2]); rz = math.degrees(math.atan2(px - hx, -(py - hy)))
    v = VAR[placed % len(VAR)]; o = bpy.data.objects.new(f"house_{placed}", v.data); bpy.context.scene.collection.objects.link(o)
    o.location = (hx, hy, 0); o.rotation_euler = (0, 0, math.radians(rz)); STATIC.append(o); cbox(hx, hy, 11.2, 8.8, rz); placed += 1; PLACED_XY.append((hx, hy)); HOUSE_T.append((hx, hy, rz))
    y_ = linked(f"yard_{placed % 4}", lambda nm, v=placed: yard(nm, v % 4 < 2)); place(y_, hx, hy, rz=rz)
    if R_.random() < .5: prop("palm_small" if R_.random() < .6 else "shrub_a", hx + R_.uniform(-6, 6), hy + R_.uniform(-6, 6))
print("houses placed", placed)
tick_("houses")
fill_after(PLACED_XY)

# ================================================================  TREES  ================================================================
for r in net:                                                                                   # palms in the Lyons median, along the arterial sidewalks
    if r.name == "Lyons Rd":
        s = 10.0
        while s < r.L - 10:
            x, y, _, _ = r.at(s)
            if not any(abs(s - g0) < 25 or abs(s - g1) < 25 for g0, g1 in r.gaps["M"]): prop("palm_tall", x, y, 1.1)
            s += 22
    elif r.rank == 10 and not r.closed:
        s = 15.0
        while s < r.L - 15:
            for side in (1, -1):
                x, y = r.off(s, side * (r.hw + rd.CURB + rd.SWK + 1.2))
                if not any(f[0] < x < f[2] and f[1] < y < f[3] for f in FOOT[:len(LP["lots"])]) and not near_road(x, y, 1.0): prop("palm_medium", x, y)
            s += 38
for z in LP["zones"]:                                                                          # trees in the parks
    if "PARK" in z["label"] or z["color"] == "#7cc05a":
        xs = [p[0] for p in z["poly"]]; ys_ = [p[1] for p in z["poly"]]
        for _ in range(int((max(xs) - min(xs)) * (max(ys_) - min(ys_)) / 900)):
            x, y = R_.uniform(min(xs) + 6, max(xs) - 6), R_.uniform(min(ys_) + 6, max(ys_) - 6)
            if not near_road(x, y, 3) and not any(f[0] - 2 < x < f[2] + 2 and f[1] - 2 < y < f[3] + 2 for f in FOOT[:len(LP["lots"])]): prop(R_.choice(["oak", "palm_tall", "palm_medium", "shrub_b"]), x, y)
tick_("trees")

# ================================================================  WORLD EDGE + DATA  ================================================================
for (x, y, w, d) in (((XW + XE) / 2, YS - 3, XE - XW + 10, 6), ((XW + XE) / 2, YN + 3, XE - XW + 10, 6), (XW - 3, (YS + YN) / 2, 6, YN - YS + 10), (XE + 3, (YS + YN) / 2, 6, YN - YS + 10)): cbox(x, y, w, d)
start = {"x": round(PUBLIX[0] + 12, 2), "y": round(PUBLIX[1] - 40, 2), "rz": 180}
CARS.insert(0, {"name": "player", "kind": "sedan", "color": "#c8201c", "x": start["x"], "y": start["y"], "rz": start["rz"]})
ROADLINES = [{"pts": [[round(a, 1), round(b_, 1)] for a, b_ in rd.lane_path(r, 0, step=8, s0=p[0], s1=p[1])], "w": round(2 * r.hw, 1), "closed": r.closed} for r in net for p in r.pieces]
LMK = [["Publix", PUBLIX[0], PUBLIX[1] + 20, "#2e8b3e", "P"]]
for lot in LP["lots"]:
    for b_ in lot["buildings"]:
        nm = {"SEMINOLE CASINO": ("Casino", "#c8901e", "$"), "CITY HALL": ("City Hall", "#2f6fb3", "H"), "POLICE": ("Police", "#1d3f8a", "*"), "WALMART": ("Walmart", "#2f64ad", "W"), "McD": ("McDonald's", "#d22d24", "M")}.get(b_["label"])
        if nm: LMK.append([nm[0], round((b_["x0"] + b_["x1"]) / 2, 1), round((b_["y0"] + b_["y1"]) / 2, 1), nm[1], nm[2]])
LMK.append(["Trash Mountain", round(tcx, 1), round(tcy, 1), "#7a5a2a", "^"]); LMK.append(["Butterfly World", *[round(v, 1) for v in SHK.M(640, 640)], "#5a9d3a", "B"]); LMK.append(["Dave", LP["dave"][0], LP["dave"][1], "#e33b3b", "D"])
WORLD = {"name": "cc", "title": "Coconut Creek", "glb": "scene.glb", "mapbg": "#4d7a34", "extent": 2000, "sky": "#8fc3f5", "fog": ["#c4dcf2", 120, 330], "hemi": ["#cfe4ff", "#6f8a4a", 1.55],
         "sun": {"color": "#fff0d6", "intensity": 3.7, "dir": [-0.5, -0.74, 0.45]}, "heights": [], "exposure": 1.0, "tone": "AgX", "lamps": [], "ground": "#5d9a3a", "start": start, "money": 1250,
         "traffic": [], "walk": [], "walkers": 0, "fight": None, "demo": None, "landmarks": LMK,
         "views": {"drive": {"label": "Play", "mode": "drive", "pitch": 45, "dist": 44}, "over": {"label": "Overview", "tx": 0, "ty": 700, "pitch": 55, "dist": 1500}}, "map": MAP, "roads": ROADLINES, "layout": "plan/v7/layout.json", "hydrants": [[round(x, 1), round(y, 1)] for x, y in HYDRANTS]}
OUTD = OUT
json.dump(FOOT, open(os.path.join(OUTD, "foot_cc.json"), "w")); json.dump(COL, open(os.path.join(OUTD, "colliders_cc.json"), "w")); json.dump(PROPS, open(os.path.join(OUTD, "props_cc.json"), "w")); json.dump(CARS, open(os.path.join(OUTD, "cars_cc.json"), "w")); json.dump(WORLD, open(os.path.join(OUTD, "world_cc.json"), "w"))
print("CC colliders", len(COL), "props", len(PROPS), "cars", len(CARS), "roads", len(net))
STATIC.extend(GB.build(vc=True, recalc=False)); STATIC.extend(RB.build(vc=True, recalc=False)); STATIC.extend(BB.build(vc=True)); tick_("built")
if not os.environ.get("NORENDER"):
    for o in VAR: o.hide_render = True
    SH = {"cc_over": ((0, 690, 0), 89, 2700, 1100, 1400), "cc_publix": ((PUBLIX[0], PUBLIX[1] - 60, 0), 50, 160, 1000, 700), "cc_hammocks": ((-415, 320, 0), 60, 420, 1000, 700)}
    if os.environ.get("SHOT"): x_, y_, p_, d_ = [float(v) for v in os.environ["SHOT"].split(",")]; SH = {"cc_dbg": ((x_, y_, 0), p_, d_, 1000, 700)}
    for nm, (tgt, pitch, dist, w, h) in SH.items():
        for o in [x for x in bpy.context.scene.objects if x.type == "CAMERA"]: bpy.data.objects.remove(o)
        game_camera(tgt, pitch, dist); bpy.context.scene.camera.data.clip_end = 6000; render(os.path.join(OUTD, nm + ".png"), w, h, samples=8, keep_transform=True)
    tick_("rendered")
export_glb("cc_scene", [o for o in STATIC if o.type in ("MESH", "EMPTY")])
print("EXPORTED"); tick_("done")
