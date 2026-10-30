"""Review renders for lm_promenade.py. Run from city-clone/blender (textures first: python3 scripts/tex_promenade.py):
    blender -b --python scripts/lm_promenade_sheet.py
Writes art-review/round18/promenade.png (mini promenade from the 45 deg game angle), promenade_close.png (shop fronts / arch close-up)
and trash_mountain.png (the mound alone). Prints triangle counts and the Trash Mountain road stats."""
import sys, os, math; sys.path.insert(0, os.path.dirname(__file__))
from kit import *
import mood, lm_promenade as LP, vegetation as VG

REV = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "art-review", "round18"); os.makedirs(REV, exist_ok=True)
ONLY = os.environ.get("ONLY", "")                     # ONLY=promenade or ONLY=trash renders one of the two scenes

def tris(o): return sum(len(p.vertices) - 2 for p in o.data.polygons)
def put(o, x, y, rz=0.0): o.location = (x, y, 0); o.rotation_euler = (0, 0, math.radians(rz)); return o
def shot(path, target, pitch, dist, w, h, yaw=0):
    for o in [x for x in bpy.context.scene.objects if x.type == "CAMERA"]: bpy.data.objects.remove(o)
    game_camera(target, pitch, dist, yaw=yaw); render(path, w, h, samples=20, keep_transform=True)

def promenade():
    reset(); mood.florida(); mood._transform()
    g = Builder("ground"); g.box(M("lp_grass", "#5f9a3c", tex="grass", tile=4.0), -70, 70, -70, 80, -.3, 0)
    g.box(M("lp_pave", "#d9b49a", tex="lp_pavers", tile=3.0), -21, 21, -27, 46, 0, .04)
    g.box(M("lp_asphalt", "#4b4d50", tex="asphalt", tile=4.0), -40, 40, -48, -29, 0, .03)
    g.box(M("lp_curb", "#c9c4b8"), -40, 40, -29, -27, 0, .14)
    for k in range(9): g.box(M("lp_line", "#f0f0ea"), -24 + k * 6 - .08, -24 + k * 6 + .08, -40, -32, .03, .045)
    g.build()
    counts = {}
    W = put(LP.shop_row("rowW", 4, 9.0, 12.0, seed=3), -13, 0, 90); E = put(LP.shop_row("rowE", 4, 9.0, 12.0, seed=8), 13, 0, -90)
    C = put(LP.cinema("cinema"), 0, 32); A = put(LP.entry_arch("arch"), 0, -24); F = put(LP.fountain("fountain"), 0, 0)
    for o in (W, E, C, A, F): counts[o.name] = tris(o)
    for k, (x, y, col) in enumerate(((-3.8, 9, "#c4542e"), (3.6, 12, "#1f7470"), (-3.8, -9.5, "#1f7470"), (3.8, -7, "#c4542e"), (0, 15, "#7c2230"))):
        o = put(LP.cafe_set(f"cafe{k}", col), x, y, k * 37); counts.setdefault("cafe_set", tris(o))
    for k, (x, y, rz) in enumerate(((0, -4.6, 0), (0, 4.6, 180), (-4.6, 0, -90), (4.6, 0, 90))): o = put(LP.bench(f"bench{k}"), x, y, rz); counts.setdefault("bench", tris(o))
    palm = 0
    for k, (x, y) in enumerate(((-4.8, -17), (4.8, -17), (-5, 18), (5, 19.5), (-4.6, 4.5), (4.6, -3.5))):
        o = put(LP.planter(f"planter{k}"), x, y, 90); counts.setdefault("planter", tris(o))
        if k in (0, 1, 2, 3): put(VG.make_palm(f"palm{palm}", 6.5 + (k % 2) * 1.2, 13, 2.6, .03, k + 2), x, y); palm += 1
    for x, y in ((-9, -27.5), (9, -27.5), (-15, -26), (15, -26), (-5.5, 25), (6.0, 26)): put(VG.make_palm(f"palm{palm}", 6.0 + (palm % 3), 13, 2.6, .03, palm), x, y); palm += 1
    for k, (x, y) in enumerate(((-5.6, -11), (5.6, -12), (-5.6, 7), (5.6, 5), (-5.6, 21), (5.6, 21))): o = put(LP.lamp_post(f"lamp{k}"), x, y); counts.setdefault("lamp_post", tris(o))
    for k, x in enumerate((-11, -8.5, 8.5, 11)): put(VG.make_hedge(f"hedge{k}"), x, -25.5)
    print("TRIS", counts)
    shot(os.path.join(REV, "promenade.png"), (0, 6, 0), 45, 92, 1200, 1000)
    shot(os.path.join(REV, "promenade_close.png"), (-2, -16, 3), 38, 34, 1200, 800, yaw=-28)

def trash():
    reset(); mood.florida(); mood._transform()
    g = Builder("ground"); g.box(M("lp_grass", "#5f9a3c", tex="grass", tile=4.0), -80, 80, -70, 70, -.3, 0); g.build()
    o = LP.trash_mountain("trash_mountain"); hf = LP.TRASH_HF; Hn = LP.trash_heights()
    print("TRIS trash_mountain", tris(o), "grid", hf, "max h", max(max(r) for r in Hn), "road len", round(LP._road()[-1][3], 1))
    print("ROAD max grade / cross-slope deg", [round(v, 2) for v in LP.trash_road_stats()])
    shot(os.path.join(REV, "trash_mountain.png"), (0, 2, 6), 45, 100, 1200, 1000)
    shot(os.path.join(REV, "trash_mountain_ne.png"), (0, 0, 6), 40, 100, 1200, 900, yaw=150)

if ONLY in ("", "promenade"): promenade()
if ONLY in ("", "trash"): trash()
