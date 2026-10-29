import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from character import *
reset(); world((0.55, .6, .7), 1.4); sun(); 
make_character("hero", "#3f6b3a", "#26303f")
tiles = []
def shot(tag, clip, t, view):
    apply_pose(None, "hero", clip, t)
    for o in [x for x in bpy.context.scene.objects if x.type == "CAMERA"]: bpy.data.objects.remove(o)
    if view == "side": camera((9, 0, .95), (0, 0, .95), ortho=True, ortho_scale=2.5)
    elif view == "front": camera((0, -9, .95), (0, 0, .95), ortho=True, ortho_scale=2.5)
    else: game_camera((0, 0, .5), 65, 9)
    render(os.path.join(OUT, f"char_{tag}.png"), 320, 360, samples=8); tiles.append(tag)
for i, t in enumerate((0, 1/6, 2/6, 3/6, 4/6, 5/6)): shot(f"walk{i}_side", "walk", t, "side")
for i, t in enumerate((0, .15, .25, .35, .5, .8)): shot(f"punch{i}_side", "punch", t, "side")
for i, t in enumerate((0, 1/6, 2/6, 3/6, 4/6, 5/6)): shot(f"run{i}_side", "run", t, "side")
for i, t in enumerate((0, .25, .5, .75)): shot(f"walk{i}_game", "walk", t, "game")
