"""Round 2 test scene. Run: blender -b --python scripts/test_scene.py   (needs out/tex from scripts/textures.py)
env MOOD=day|dusk (default dusk), SHOTS=comma list to limit renders."""
import sys, os; sys.path.insert(0, os.path.dirname(__file__))
from kit import *; from car import make_car; from building import make_building
from street import *; import mood

MOOD = os.environ.get("MOOD", "dusk")
reset()
make_street(); make_props(); make_extras()
(mood.dusk(lamp_heads()) if MOOD == "dusk" else mood.day()); mood._transform()
edge = R + SW
def put(o, x, y, z=.16, rz=0): o.location = (x, y, z); o.rotation_euler = (0, 0, math.radians(rz)); return o

# buildings: (name, w, d, floors, center x, center y, kwargs)
put(make_building("tenement", 12, 11, 6, wall="#8e3b2e", band="#74301f", seed=3, roof="ac", fire_escape=("S", .78), shop_sign="restaurant",
                  sign=[("seafood", -4.4, 3.9, 1.3, 5.2), ("gold", 4.6, 6.6, 1.3, 2.6)]), -edge - 6, edge + 5.5)
put(make_building("midrise", 12, 12, 8, wall="#a8987a", band="#8f805f", trim="#d8cfb6", seed=5, roof="tank", fire_escape=("S", .22),
                  storefront=("S", "W"), awning="#2f6b4a", sign=[("liquor", 4.2, 3.9, 1.3, 2.6), ("dumpling", -3.6, 6.6, 1.3, 2.6)]), edge + 6, edge + 6)
put(make_building("lowshop", 10, 9, 2, wall="#6e5a4a", band="#5a4739", seed=8, roof="ac", fire_escape=None, awning="#b5302a", shop_sign="restaurant"), -edge - 5, -edge - 4.5)
put(make_building("rowhouse", 12, 11, 3, wall="#a2533d", band="#8c4632", seed=11, roof="ac", fire_escape=("E", .5), awning="#c89a2a"), edge + 6, -edge - 5.5)
# second block north: a tall Chinatown shop each side of the arch street
put(make_building("shop_w", 11, 11, 5, wall="#7b5a4a", band="#664a3c", seed=21, roof="tank", fire_escape=("S", .3), shop_sign="restaurant", awning="#b5302a",
                  sign=[("seafood", 3.9, 3.9, 1.3, 5.2)]), -edge - 5.5, ARCH_Y + 9.5)
put(make_building("shop_e", 11, 11, 4, wall="#5a5f66", band="#4c5057", trim="#c9c4b4", seed=22, roof="ac", fire_escape=("S", .7), awning="#2f6b4a",
                  sign=[("gold", -3.9, 3.9, 1.3, 2.6)]), edge + 5.5, ARCH_Y + 9.5)
put(make_arch(), 0, ARCH_Y, 0)
for (x, y, rz, a1) in ((-(R + 1.3), ARCH_Y - 6, 90, "#1f6b4a"), (R + 1.3, ARCH_Y - 9, -90, "#b5302a"), (-(R + 1.3), ARCH_Y - 11, 90, "#b5302a")):
    put(make_stall("stall", a1), x, y, .16, rz)
mi = make_misc()
put(mi["dumpster"], -(R + 1.6), -R - 20, .16, 90); put(mi["barrier"], R + 1.5, R + 30, .16, 90); put(mi["barrel"], R + 1.2, R + 26, .16); put(mi["newsboxes"], -(R + 2.2), R + 3.0, .16, 90)
put(mi["pallet"], R + 1.7, -R - 10, .16)
# vehicles: modular cars (body + 4 hinged doors). The page rebuilds them from car_*.glb using cars.json, so they are not in test_scene.glb.
CARS = []
def addcar(kind, color, name, x, y, rz=0):
    root = make_car(kind, color, name); put(root, x, y, 0, rz); CARS.append({"name": name, "kind": kind, "color": color, "x": x, "y": y, "rz": rz}); return root
addcar("sedan", "#c8201c", "player", LANE / 2, -10)
addcar("taxi", "#f2b61c", "taxi", -9, -LANE / 2, -90)
pk = R - PARK / 2
for i, (x, y, rz, col) in enumerate([(pk, 14, 0, "#d9d9d6"), (-pk, 19, 180, "#2b2d33"), (pk, -19, 0, "#2e5fa3"), (-pk, -14, 180, "#3d7a52"),
                                      (13, -pk, -90, "#8a8d92"), (-14, pk, 90, "#a23a2e"), (pk, 33, 0, "#c8201c"), (-LANE / 2, 31, 180, "#f2b61c")]):
    addcar("taxi" if col == "#f2b61c" else "sedan", col, f"parked{i}", x, y, rz)
for i, (x, y) in enumerate([(R + 1.4, R + 7), (-R - 1.4, R + 15), (R + 1.4, -R - 5), (-R - 1.4, -R - 11), (R + 1.4, R + 15)]):
    put(make_tree(f"tree{i}", i), x, y, .16)

SHOTS = {"game_portrait": ((0, -3, 0), 65, 21, 540, 960), "street_run": ((0, 17, 0), 65, 21, 540, 960), "chinatown_run": ((0, ARCH_Y - 7, 0), 62, 21, 540, 960),
         "game_wide": ((0, 0, 0), 65, 27, 960, 600), "oblique": ((0, 6, 3), 42, 55, 960, 600)}
if __name__ == "__main__":
    want = os.environ.get("SHOTS"); 
    for name, (tgt, pitch, dist, w, h) in SHOTS.items():
        if want and name not in want.split(","): continue
        for o in [x for x in bpy.context.scene.objects if x.type == "CAMERA"]: bpy.data.objects.remove(o)
        game_camera(tgt, pitch, dist); render(os.path.join(OUT, f"scene_{name}.png"), w, h, ink=False, samples=24, keep_transform=True)
    if not want:
        import json
        fam = set()
        def walk(o):
            fam.add(o)
            for c in o.children: walk(c)
        for r in [bpy.data.objects[c["name"]] for c in CARS]: walk(r)
        export_glb("test_scene", [o for o in bpy.context.scene.objects if o not in fam and o.type in ("MESH", "EMPTY")])
        json.dump(CARS, open(os.path.join(OUT, "cars.json"), "w"), indent=1)
