"""Round 27 tree choice: each candidate between two palms, game angle. blender -b --python scripts/tree_sheet.py -> out/tree_sheet.png"""
import sys, os; sys.path.insert(0, os.path.dirname(__file__))
from vegetation import *
reset(); world((0.62, 0.74, 0.92), 1.3); sun(direction=(0.45, -0.5, -0.74), energy=3.2, color=(1.0, .93, .78), angle_deg=6)
ground = Builder("g"); ground.box(M("grass_flat", "#5f9a3c", tex="grass", tile=4.0), -60, 60, -20, 20, -.2, 0); ground.build()
row = [KIT["oak"](), KIT["palm_medium"](), CANDIDATES["liveoak"](), KIT["palm_tall"](), CANDIDATES["poinciana"](), KIT["palm_medium"](), CANDIDATES["sabal"]()]
for i, o in enumerate(row): o.location = (-27 + i * 9, 0, 0)
for o in [x for x in bpy.context.scene.objects if x.type == "CAMERA"]: bpy.data.objects.remove(o)
game_camera((0, 0, 2.5), 45, 62); render(os.path.join(OUT, "tree_sheet.png"), 1600, 520, samples=24)
