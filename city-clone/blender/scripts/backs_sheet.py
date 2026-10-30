"""Round 27 review: Publix, casino and a strip plaza seen from behind (the follow camera shows every side). -> out/backs_*.png"""
import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from kit import *; import mood; import lm_retail as lr; import lm_civic as lc; import building_fl as bf
reset(); mood.florida(); mood._transform()
g = Builder("ground"); g.box(M("grass", "#5d9a3a", tex="grass", tile=4.0), -120, 120, -60, 60, -.3, 0); g.build()
a = lr.supermarket("palm_market"); a.location = (-70, 0, 0)
c = lc.casino("casino"); c.location = (0, 0, 0)
p = bf.make_plaza("plaza", 44, 16); p.location = (70, 0, 0)
for nm, tgt, yaw in (("backs_publix", (-70, 4, 3), 180), ("backs_casino", (0, 8, 4), 180), ("backs_plaza", (70, 2, 3), 180), ("backs_publix_side", (-60, 0, 3), 90)):
    for o in [x for x in bpy.context.scene.objects if x.type == "CAMERA"]: bpy.data.objects.remove(o)
    game_camera(tgt, 35, 62, yaw=yaw); render(os.path.join(OUT, nm + ".png"), 900, 600, samples=20, keep_transform=True)
