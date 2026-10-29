"""Coconut Creek first slice. Run: blender -b --python scripts/coconut_scene.py   (env NORENDER=1 to only export; needs out/tex from textures.py)
Exports to out/: coconut_scene.glb (static), props.json (vegetation instances), colliders.json, cars.json, world.json."""
import sys, os, json, math, random; sys.path.insert(0, os.path.dirname(__file__))
from kit import *; from street_fl import *; from building_fl import make_house, make_row, make_plaza; import vegetation as veg; from car import make_car; import mood

reset(); mood.florida(); mood._transform(); R_ = random.Random(7)
m = mats(); T = Builder("terrain"); terrain(T, m)
COL, PROPS, CARS, STATIC, MAP = [], [], [], [], []
def cbox(x, y, w, d, rz=0, car=None): COL.append({"t": "box", "x": round(x, 2), "y": round(y, 2), "w": round(w, 2), "d": round(d, 2), "rz": rz}); return COL[-1]
def ccir(x, y, r): COL.append({"t": "circle", "x": round(x, 2), "y": round(y, 2), "r": r})
def mapr(x0, y0, x1, y1, c): MAP.append([round(x0, 1), round(y0, 1), round(x1, 1), round(y1, 1), c])
def prop(kind, x, y, s=None, col=True):
    s = s or R_.uniform(.9, 1.15); PROPS.append({"k": kind, "x": round(x, 2), "y": round(y, 2), "rz": round(R_.uniform(0, 360)), "s": round(s, 2)})
    if col: ccir(x, y, {"palm_tall": .32, "palm_medium": .3, "palm_small": .25, "shrub_a": .5, "shrub_b": .5, "oak": .5}.get(kind, .3) * (1 if kind.startswith("palm") else s))
def hedge(x0, y0, x1, y1):
    n = max(1, int(max(abs(x1 - x0), abs(y1 - y0))))                       # a straight run of unit hedges (instanced), one collider box for the whole run
    for i in range(n):
        t = (i + .5) / n; PROPS.append({"k": "hedge", "x": round(x0 + (x1 - x0) * t, 2), "y": round(y0 + (y1 - y0) * t, 2), "rz": 0 if abs(x1 - x0) > abs(y1 - y0) else 90, "s": 1.0})
    cbox((x0 + x1) / 2, (y0 + y1) / 2, max(abs(x1 - x0), .9), max(abs(y1 - y0), .9))
def put(o, x, y, z=0, rz=0, w=None, d=None, col=True):
    o.location = (x, y, z); o.rotation_euler = (0, 0, math.radians(rz)); STATIC.append(o)
    if w and col: cbox(x, y, w, d, rz)
    return o

# ---- ground details -------------------------------------------------------------------------------------------------
mapr(-EXT, -EXT, EXT, EXT, "#5d9a3a"); mapr(-BLV, -EXT, BLV, EXT, "#6a6c70"); mapr(-EXT, -XR, EXT, XR, "#6a6c70"); mapr(-MED, -EXT, MED, EXT, "#4d8a38")
# NE: shopping plaza + parking lot
LX0, LX1, LY0, LY1 = 14, 66, 6.4, 39.0
T.box(m["conc"], LX0, LX1, 39.0, 42.0, 0, .12)                                                                       # promenade in front of the shops
rows = [(6.8, 12.0), (18.0, 23.2), (23.2, 28.4), (34.4, 39.0)]
islands, stalls = parking_lot(T, m, LX0, LX1, LY0, LY1, rows, 15.0)
mapr(LX0, LY0, LX1, LY1, "#5a5c60"); mapr(LX0, 39, LX1, 42, "#a9a69c")
for (ix, iy, iw, idp) in islands:
    cbox(ix, iy, iw, idp); prop("palm_medium", ix, iy, 1.0, col=False)
    if R_.random() < .6: prop("shrub_a", ix, iy + (1.2 if R_.random() < .5 else -1.2), 1.0, col=False)
plaza = put(make_plaza("plaza", 44, 16, tower_x=10), 40, 50, 0, 0, 44.5, 17.5); mapr(18, 42, 62, 58, "#c9b48a")
plaza2 = put(make_plaza("plaza2", 22, 14, 6.5, shops=(("cleaners", 6, "#a63c2a"), ("coffee", 6, "#21453a")), tower_x=-4, tower_sign="palmmarket"), -7 + 66 - 15, 58, 0, 0, 22.5, 15.5) if False else None
for k in range(11):                                                                                                    # lot trees and lamps along the shop front
    if k % 2 == 0: prop("palm_tall", 17 + k * 4.6, 40.6, 1.0)
for x in (24, 40, 56): lamp(T, x, 30.5, 1); lamp(T, x, 14.5, -1)
# NW: townhome community (Palm Lane at y 11..17)
T.box(m["asphalt"], -EXT, -BLV - 2.7, 11.0, 17.0, 0, .03); T.box(m["white"], -EXT, -BLV - 2.7, 13.95, 14.05, .03, .035); T.box(m["walk"], -EXT, -BLV - 2.7, 17.0, 19.2, 0, .15); T.box(m["walk"], -EXT, -BLV - 2.7, 8.6, 11.0, 0, .15)
mapr(-EXT, 11, -BLV - 2.7, 17, "#6a6c70")
rowA = put(make_row("rowA", 5, 6.4, 10, 2, 3), -38, 24.2, 0, 0, 32, 10.2); rowB = put(make_row("rowB", 5, 6.4, 10, 2, 5), -38, 42.2, 0, 0, 32, 10.2); mapr(-54, 19.2, -22, 29.2, "#b5603e"); mapr(-54, 37.2, -22, 47.2, "#b5603e")
T.box(m["conc"], -69, -55, 44, 56, 0, .12); T.box(m["bank"], -66.4, -57.6, 46.2, 53.8, .12, .2); T.box(m["water"], -66.0, -58.0, 46.6, 53.4, .2, .24); mapr(-69, 44, -55, 56, "#a9a69c"); mapr(-66, 46.6, -58, 53.4, "#2d78b8"); cbox(-62, 50, 8.6, 7.6)
club = put(make_house("clubhouse", 14, 10, 1, "cream", 2, balcony=False, roof_h=3.2), -60, 64, 0, 0, 14.2, 10.2); mapr(-67, 59, -53, 69, "#b5603e")
for (x, y) in ((-60, 45), (-64, 55), (-56, 55)): ccir(x, y, .3); T.cyl(M("umbrella_t", "#1f6b8a"), (x, y, 1.0), .05, 2.0, "z", 6); T.cyl(M("umbrella_c", "#2f9aa8"), (x, y, 2.15), 1.0, .25, "z", 8, r2=.12)
for x in range(-66, -20, 7): prop("palm_medium", x, 31.5, 1.0)
for x in range(-66, -20, 9): prop("palm_small", x, 20.2 + 0, .9) if False else None
hedge(-69, 19.9, -55, 19.9); hedge(-22, 19.9, -14, 19.9)
for (x, y) in ((-30, 33), (-46, 33), (-52, 33), (-24, 8.2), (-40, 8.2), (-58, 8.2)): prop("shrub_a" if R_.random() < .5 else "shrub_b", x, y)
for y in range(22, 66, 9): prop("palm_tall", -12.8, y, 1.0)
# SW: pond park
for (cx, cy, r) in ((-38, -36, 14.0), (-58, -30, 8.0)):
    T.cyl(m["bank"], (cx, cy, .03), r + .9, .06, "z", 20); T.cyl(m["water"], (cx, cy, .075), r, .06, "z", 20)
    COL.append({"t": "circle", "x": cx, "y": cy, "r": r + .3}); MAP.append([round(cx - r, 1), round(cy - r, 1), round(cx + r, 1), round(cy + r, 1), "#2d78b8", "o"])
F = Builder("fountain"); F.cyl(M("fount", "#e8f0f4"), (-38, -36, 1.2), .35, 2.4, "z", 8, r2=.12); F.cyl(M("fount_ring", "#d8e0e6"), (-38, -36, .2), 1.4, .3, "z", 10); STATIC.append(F.build())
G = Builder("gazebo"); gx, gy = -22, -22; gw = M("gaz_roof", "#2f7a4a", rough=.7)
for sx_ in (-2, 2):
    for sy_ in (-2, 2): G.cyl(M("gaz_post", "#f1ece0"), (gx + sx_, gy + sy_, 1.4), .13, 2.8, "z", 6); ccir(gx + sx_, gy + sy_, .2)
G.box(m["wood"], gx - 2.6, gx + 2.6, gy - 2.6, gy + 2.6, 0, .25); G.prism(gw, (gx - 3.2, gx + 3.2, gy - 3.2, gy + 3.2), (gx - .15, gx + .15, gy - .15, gy + .15), 2.8, 4.4); STATIC.append(G.build()); mapr(gx - 3, gy - 3, gx + 3, gy + 3, "#2f7a4a")
for (x, y) in ((-26, -48), (-52, -50), (-62, -14), (-24, -8), (-70, -40)): prop("oak", x, y, 1.1)
for (x, y) in ((-16, -16), (-16, -32), (-16, -48), (-30, -58), (-46, -56), (-66, -22), (-14, -62)): prop("palm_tall", x, y, 1.0)
for (x, y) in ((-24, -26), (-20, -26), (-24, -18), (-44, -18), (-52, -18)): prop("shrub_a", x, y)
for (x, y) in ((-24, -34), (-26, -44), (-34, -52), (-46, -50), (-56, -42), (-66, -32), (-64, -20), (-50, -20), (-40, -20), (-30, -20), (-20, -40)): prop("palm_medium" if R_.random() < .6 else "palm_small", x, y, 1.0)
for (x, y) in ((-24, -38), (-30, -49), (-42, -52), (-52, -45), (-62, -37), (-68, -28), (-48, -21), (-36, -21)): prop("shrub_a" if R_.random() < .5 else "shrub_b", x, y)
B = Builder("bridge"); bw = M("bridge_wood", "#8a5a34", tex="wood", tile=2.0); rail = M("bridge_rail", "#6a4426")
B.box(bw, -52.5, -46.5, -34.6, -31.4, .25, .45)
for sy_ in (-34.6, -31.5): B.box(rail, -52.5, -46.5, sy_, sy_ + .1, .45, 1.3)
for x_ in range(-52, -46): B.box(rail, x_ - .05, x_ + .05, -34.6, -34.5, .45, 1.4); B.box(rail, x_ - .05, x_ + .05, -31.5, -31.4, .45, 1.4)
STATIC.append(B.build())
# SE: city hall + lawn
hall = put(make_plaza("cityhall", 28, 14, 7.0, shops=(), tower_x=0, tower_sign="cityhall"), 46, -34, 0, 180, 28.5, 22, col=True); mapr(32, -41, 60, -27, "#d8c9a0")
Fp = Builder("flagpole"); Fp.cyl(M("flag_pole", "#d8d8d8"), (30, -16, 4.5), .07, 9, "z", 6); Fp.box(M("flag_red", "#c22a3a"), 30.1, 32.2, -16.05, -15.95, 7.4, 8.9); Fp.box(M("flag_blue", "#2a3a8a"), 30.1, 31.1, -16.05, -15.95, 8.1, 8.9); STATIC.append(Fp.build()); ccir(30, -16, .12)
for (x, y) in ((22, -14), (24, -50), (60, -14), (64, -50), (40, -52)): prop("oak" if R_.random() < .5 else "palm_tall", x, y, 1.1)
for x in range(18, 66, 6): prop("palm_medium", x, -10.5, 1.0)
for y in range(-64, -8, 9): prop("palm_tall", 12.8, y, 1.0)
for y in range(-64, -8, 9): prop("palm_tall", 66, y, 1.0) if False else None
# boulevard: palm median + verge palms + lamps + signals + signs
for y in list(range(10, 68, 7)) + list(range(-10, -68, -7)): prop("palm_medium", 0, y + (0 if y > 0 else 0), 1.0, col=True)
for sx in (-1, 1):
    for y in list(range(14, 68, 9)) + list(range(-14, -68, -9)):
        if not (sx > 0 and 6 < y < 40 and False): prop("palm_tall" if (y // 9) % 2 else "palm_medium", sx * 12.6, y + .5 * sx, 1.0)
    for y in (20, 44, -20, -44): lamp(T, sx * 10.6, y, -sx)
    for sy in (-1, 1): signal(T, sx * 9.9, sy * 5.0, (-sx, 0)); ccir(sx * 9.9, sy * 5.0, .14)
sign_pole(T, 10.7, 7.5, "pkwy", 3.2); sign_pole(T, -10.7, -7.5, "pkwy", 3.2); sign_pole(T, -10.6, 7.5, "wiles", 2.2); sign_pole(T, 10.6, -7.5, "wiles", 2.2)
for (x, y) in ((11.4, 7.5), (-11.4, -7.5), (-11.4, 7.5), (11.4, -7.5)): ccir(x, y, .1)
# ---- vehicles (rebuilt in the page from car_*.glb) --------------------------------------------------------------------
def addcar(kind, color, name, x, y, rz=0):
    root = make_car(kind, color, name); root.location = (x, y, .03); root.rotation_euler = (0, 0, math.radians(rz)); CARS.append({"name": name, "kind": kind, "color": color, "x": x, "y": y, "rz": rz}); return root
addcar("sedan", "#c8201c", "player", 3.3, -24, 0)
for i, (kind, col, x, y, rz) in enumerate([("sedan", "#2e5fa3", 6.7, -40, 0), ("sedan", "#e6e6e2", -6.7, 40, 180), ("taxi", "#f2b61c", -20, -1.75, -90), ("sedan", "#9aa0a8", 25, 1.75, 90)]): addcar(kind, col, f"traffic{i}", x, y, rz)
PAL = ["#e6e6e2", "#2b2d33", "#9aa0a8", "#2e5fa3", "#c8201c", "#3d7a52", "#d8b04a", "#7a3a2a"]
k = 0; park = []
for (sx_, sy_) in stalls:
    if R_.random() < .30:
        rz = 0 if sy_ < 15 or 23.2 <= sy_ < 28.4 else 180; addcar("sedan", R_.choice(PAL), f"parked{k}", sx_, sy_, rz); cbox(sx_, sy_, 1.8, 4.5, rz); COL[-1]["car"] = f"parked{k}"; k += 1
for (x, y, rz) in ((-24, 13.9, 90), (-46, 14.0, -90)): addcar("sedan", R_.choice(PAL), f"parked{k}", x, y + 1.0, rz); cbox(x, y + 1.0, 1.8, 4.5, rz); COL[-1]["car"] = f"parked{k}"; k += 1
# ---- world edge + data ------------------------------------------------------------------------------------------------
for (x, y, w, d) in ((0, EXT - .5, 2 * EXT, 3), (0, -EXT + .5, 2 * EXT, 3), (EXT - .5, 0, 3, 2 * EXT), (-EXT + .5, 0, 3, 2 * EXT)): cbox(x, y, w, d)
T.cyl(M("shadow_dummy", "#000000"), (0, 0, -5), .01, .01, "z", 3); terr = T.build(vc=True); STATIC.append(terr)
WORLD = {"name": "coconut", "title": "Coconut Creek", "extent": EXT - 4, "sky": "#8fc3f5", "fog": ["#c4dcf2", 70, 200], "hemi": ["#cfe4ff", "#6f8a4a", 1.55], "sun": {"color": "#fff0d6", "intensity": 3.7, "dir": [-0.5, -0.74, 0.45]},
         "exposure": 1.0, "tone": "AgX", "lamps": [], "ground": "#5d9a3a", "start": {"x": 3.3, "y": -24, "rz": 0}, "money": 1250,
         "traffic": [{"name": "traffic0", "axis": "y", "lane": 6.7, "dir": 1, "speed": 9}, {"name": "traffic1", "axis": "y", "lane": -6.7, "dir": -1, "speed": 8}, {"name": "traffic2", "axis": "x", "lane": -1.75, "dir": 1, "speed": 7.5}, {"name": "traffic3", "axis": "x", "lane": 1.75, "dir": -1, "speed": 7}],
         "walk": [{"axis": "y", "c": 9.9, "lo": -66, "hi": 66}, {"axis": "y", "c": -9.9, "lo": -66, "hi": 66}, {"axis": "x", "c": 4.9, "lo": -66, "hi": 66}, {"axis": "x", "c": -4.9, "lo": -66, "hi": 66}, {"axis": "x", "c": 40.4, "lo": 15, "hi": 65}, {"axis": "x", "c": 18.2, "lo": -66, "hi": -14}],
         "walkers": 14, "fight": {"x": 24, "y": 40.4}, "demo": None,
         "views": {"drive": {"label": "Play", "mode": "drive", "pitch": 45, "dist": 44}, "plaza": {"label": "Plaza", "tx": 38, "ty": 30, "pitch": 48, "dist": 34}, "homes": {"label": "Homes", "tx": -38, "ty": 30, "pitch": 48, "dist": 36},
                   "park": {"label": "Park", "tx": -38, "ty": -34, "pitch": 48, "dist": 40}, "over": {"label": "Overview", "tx": 0, "ty": 0, "pitch": 40, "dist": 90}},
         "map": MAP}
OUTD = OUT
json.dump(COL, open(os.path.join(OUTD, "colliders_coconut.json"), "w")); json.dump(PROPS, open(os.path.join(OUTD, "props_coconut.json"), "w")); json.dump(CARS, open(os.path.join(OUTD, "cars_coconut.json"), "w")); json.dump(WORLD, open(os.path.join(OUTD, "world_coconut.json"), "w"))
print("COCONUT colliders", len(COL), "props", len(PROPS), "cars", len(CARS))
if not os.environ.get("NORENDER"):
    # linked duplicates of the vegetation kit so the Blender review shows the real thing
    tmpl = {k: f() for k, f in veg.KIT.items()}
    for o in tmpl.values(): o.hide_render = True; o.location = (0, 0, -50)
    for p in PROPS:
        o = bpy.data.objects.new(p["k"], tmpl[p["k"]].data); bpy.context.scene.collection.objects.link(o); o.location = (p["x"], p["y"], 0)
        o.rotation_euler = (0, 0, math.radians(p["rz"])); o.scale = (p["s"], p["s"], p["s"]) if p["k"] != "hedge" else (1, 1, 1)
    SHOTS = {"cc_game": ((6, 2, 0), 45, 44, 540, 960), "cc_wide": ((10, 18, 0), 48, 70, 1100, 640), "cc_plaza": ((38, 30, 0), 48, 36, 1000, 640), "cc_homes": ((-40, 30, 0), 48, 40, 1000, 640),
             "cc_park": ((-38, -32, 0), 50, 40, 1000, 640), "cc_over": ((0, 0, 0), 40, 110, 1100, 700)}
    for nm, (tgt, pitch, dist, w, h) in SHOTS.items():
        for o in [x for x in bpy.context.scene.objects if x.type == "CAMERA"]: bpy.data.objects.remove(o)
        game_camera(tgt, pitch, dist); render(os.path.join(OUT, nm + ".png"), w, h, samples=20, keep_transform=True)
export_glb("coconut_scene", [o for o in STATIC if o.type in ("MESH", "EMPTY")])
print("EXPORTED")
