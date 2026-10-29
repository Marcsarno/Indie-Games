import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from character import *
reset(); world((0.55, .6, .7), 1.4); sun(); make_character("hero", "#3f6b3a", "#26303f")
def shot(tag, clip, t):
    apply_pose(None, "hero", clip, t)
    for o in [x for x in bpy.context.scene.objects if x.type == "CAMERA"]: bpy.data.objects.remove(o)
    camera((9, 0, .85), (0, -.1, .85), ortho=True, ortho_scale=2.8); render(os.path.join(OUT, f"cb_{tag}.png"), 300, 300, samples=8)
for i, t in enumerate((0, .25, .45, .7, 1.0)): shot(f"hit{i}", "hit", t)
for i, t in enumerate((0, .25, .5, .75, 1.0)): shot(f"fall{i}", "fall", t)
for i, t in enumerate((0, .2, .3, .45, .6)): shot(f"p2_{i}", "punch2", t)
