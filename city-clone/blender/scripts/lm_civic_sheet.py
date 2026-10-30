"""Review renders for lm_civic.py: art-review/round18/city_hall.png (city hall + butterfly) and casino.png, ~45 deg view like the concepts.
Run: python3 scripts/tex_civic.py && blender -b --python scripts/lm_civic_sheet.py   (VIEW=game renders the straight north-up game angle too)"""
import sys, os; sys.path.insert(0, os.path.dirname(__file__))
from kit import *
import mood, lm_civic
REV = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "art-review", "round18")

def ground(w, d, cx=0, cy=0):
    g = Builder("ground"); g.box(M("lc_rev_grass", "#6aa04a"), cx - w / 2, cx + w / 2, cy - d / 2, cy + d / 2, -.2, 0)
    return g

def shot(path, target, dist, yaw, w=1400, h=1000, pitch=45):
    for o in [x for x in bpy.context.scene.objects if x.type == "CAMERA"]: bpy.data.objects.remove(o)
    game_camera(target, pitch, dist, yaw=yaw); render(path, w, h, samples=20, keep_transform=True); print("wrote", path)

if __name__ == "__main__":
    os.makedirs(REV, exist_ok=True); game = os.environ.get("VIEW") == "game"
    # city hall + butterfly in the forecourt
    reset(); mood.florida(); mood._transform()
    g = ground(70, 50, 0, -6); g.box(M("lc_rev_paving", "#d9cfb8"), -12, 12, -20, -9.9, 0, .03); g.box(M("lc_rev_asphalt", "#4a4c50"), -30, 30, -31, -20, 0, .02); g.build()
    ch = lm_civic.city_hall("city_hall"); bf = lm_civic.butterfly("butterfly"); bf.location = (7.0, -15.5, .03)
    for o in (ch, bf): print(o.name, "tris", lm_civic.tri_count(o), "mats", [m.name for m in o.data.materials])
    shot(os.path.join(REV, "city_hall.png"), (1, -4, 3.5), 62, -32)
    if game: shot(os.path.join(REV, "city_hall_game.png"), (0, -4, 2), 44, 0, 1000, 1000); shot(os.path.join(REV, "butterfly_close.png"), (7, -15.5, 2.2), 9, -20, 800, 600, 30)
    # casino
    reset(); mood.florida(); mood._transform()
    g = ground(100, 70, 0, -6); g.box(M("lc_rev_asphalt", "#4a4c50"), -16, 16, -30, -7, 0, .02); g.box(M("lc_rev_asphalt", "#4a4c50"), -48, 48, -36, -30, 0, .02); g.build()
    cs = lm_civic.casino("casino"); print(cs.name, "tris", lm_civic.tri_count(cs), "mats", [m.name for m in cs.data.materials])
    shot(os.path.join(REV, "casino.png"), (2, -3, 4.5), 92, -32)
    if game: shot(os.path.join(REV, "casino_game.png"), (0, -4, 3), 66, 0, 1000, 1000)
