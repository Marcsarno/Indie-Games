"""Test scene: a crossroads, two tall buildings + two low ones, a sedan and a taxi. Run: blender -b --python scripts/test_scene.py"""
import sys, os; sys.path.insert(0, os.path.dirname(__file__))
from kit import *; from car import make_car; from building import make_building; from street import make_street, make_props, make_extras, make_tree, R, SW

reset(); world((0.52, 0.58, 0.72), 1.7); sun(energy=3.0, angle_deg=9)
make_street(); make_props()
edge = R + SW                                   # building line
def put(o, x, y, z=.16, rz=0): o.location = (x, y, z); o.rotation_euler = (0, 0, math.radians(rz)); return o
put(make_building("tenement", 12, 11, 6, wall="#8e3b2e", band="#74301f", seed=3, roof="ac", fire_escape=("S", .78), sign=("#d8201a", "#ffd34a")), -edge - 6, edge + 5.5)
put(make_building("midrise", 12, 12, 8, wall="#a8987a", band="#8f805f", trim="#d8cfb6", seed=5, roof="tank", fire_escape=("S", .22), storefront=("S", "W"), awning="#2f6b4a"), edge + 6, edge + 6)
put(make_building("lowshop", 10, 9, 2, wall="#6e5a4a", band="#5a4739", seed=8, roof="ac", fire_escape=None, awning="#b5302a"), -edge - 5, -edge - 4.5)
put(make_building("rowhouse", 12, 11, 3, wall="#a2533d", band="#8c4632", seed=11, roof="ac", fire_escape=("E", .5), awning="#c89a2a"), edge + 6, -edge - 5.5)
make_extras()
put(make_car("sedan", "#c8201c", "player"), 1.7, -10, 0)
put(make_car("taxi", "#f2b61c", "taxi"), -9, -1.7, 0, rz=-90)
for i, (x, y, rz, col) in enumerate([(4.3, 14, 0, "#d9d9d6"), (-4.3, 19, 180, "#2b2d33"), (4.3, -19, 0, "#2e5fa3"), (-4.3, -15, 180, "#3d7a52"),
                                      (13, -4.3, -90, "#8a8d92"), (-14, 4.3, 90, "#a23a2e")]):
    put(make_car("sedan", col, f"parked{i}"), x, y, 0, rz)
for i, (x, y) in enumerate([(R + 1.4, R + 7), (-R - 1.4, R + 15), (R + 1.4, -R - 5), (-R - 1.4, -R - 11), (R + 1.4, R + 20)]):
    put(make_tree(f"tree{i}", i), x, y, .16)
if __name__ == "__main__":
    for name, (tgt, pitch, dist, w, h) in {"game_portrait": ((0, -3, 0), 65, 21, 540, 960), "game_wide": ((0, 0, 0), 65, 27, 960, 600),
                                          "street_run": ((0, 17, 0), 65, 21, 540, 960), "oblique": ((0, 4, 3), 40, 55, 960, 600)}.items():
        for o in [x for x in bpy.context.scene.objects if x.type == "CAMERA"]: bpy.data.objects.remove(o)
        game_camera(tgt, pitch, dist); render(os.path.join(OUT, f"scene_{name}.png"), w, h, ink=False, samples=24)
    export_glb("test_scene")
