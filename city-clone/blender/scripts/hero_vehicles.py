"""Round 28: the user's three hero vehicles (art/vehicles_in/*.glb, made elsewhere) -> our car contract (see car.py):
+Y forward, root at ground centre with root["dims"] = [length, width, wheelbase]; doors named <kind>_door_FL/FR/RL/RR rotating about their own vertical axis,
side (+1 right, -1 left) and max_open_deg as custom props; empties <kind>_seat_XX (z 0, under the seat) and <kind>_stand_XX (where a person stands to get in).
Run: blender -b --python scripts/hero_vehicles.py  -> viewer/car_jeep.glb, car_tesla.glb, car_moto.glb"""
import bpy, os, math
from mathutils import Matrix, Vector
HERE = os.path.dirname(os.path.abspath(__file__)); IN = os.path.join(HERE, "..", "..", "art", "vehicles_in"); OUT = os.path.join(HERE, "..", "..", "viewer")
SPECS = {   # file, yaw (deg) that turns the asset's front to +Y, dims, door nodes {original name: (row)}, seats (original x, y of the seat cushion centres, row, side)
 "jeep": ("white_jeep.glb", 180, [4.79, 2.0, 2.88], {"Door_L_Front_hinge": "F", "Door_R_Front_hinge": "F", "Door_L_Rear_hinge": "R", "Door_R_Rear_hinge": "R"}, 1.45),
 "tesla": ("tesla_model3_sport_r2.glb", -90, [4.74, 1.95, 2.86], {"Door_Front_Left": "F", "Door_Front_Right": "F", "Door_Rear_Left": "R", "Door_Rear_Right": "R"}, 1.5),
 "moto": ("green_sport_motorcycle.glb", 180, [2.17, .7, 1.51], {}, .65),
}
def empty(name, parent, loc):
    e = bpy.data.objects.new(name, None); bpy.context.scene.collection.objects.link(e); e.parent = parent; e.location = loc; return e
for kind, (fn, yaw, dims, doors, stand_x) in SPECS.items():
    bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=os.path.join(IN, fn))
    old = [o for o in bpy.context.scene.objects if o.parent is None][0]
    root = empty(kind, None, (0, 0, 0)); root["dims"] = dims; root["car_kind"] = kind
    turn = Matrix.Rotation(math.radians(yaw), 4, "Z")
    old.parent = root; old.matrix_world = turn @ old.matrix_world
    bpy.context.view_layer.update(); tags = []
    for nm, row in doors.items():
        d = bpy.data.objects[nm]; x = d.matrix_world.translation.x; side = 1 if x > 0 else -1; tag = row + ("R" if side > 0 else "L")
        d.name = f"{kind}_door_{tag}"; d["side"] = side; d["max_open_deg"] = 62; d["tag"] = tag; tags.append(tag)
        if d.rotation_mode != "XYZ": d.rotation_mode = "XYZ"
    seats = {}
    for o in bpy.context.scene.objects:                                   # seat cushions -> seat empties at the cushion's x, y (z 0, the car's convention)
        if o.type == "MESH" and o.name.lower().startswith("seat cushion"):
            p = o.matrix_world @ (sum((v.co for v in o.data.vertices), Vector()) / max(1, len(o.data.vertices))); row = "F" if p.y > 0 else "R"; tag = row + ("R" if p.x > 0 else "L"); seats[tag] = (p.x, p.y)
    if kind == "moto":
        p = bpy.data.objects["RiderSeat_PLACEMENT"].matrix_world.translation; seats = {"FL": (0.0, p.y)}; tags = ["FL"]
    for tag, (sx, sy) in seats.items():
        empty(f"{kind}_seat_{tag}", root, (sx, sy, 0)); empty(f"{kind}_stand_{tag}", root, ((1 if tag[1] == "R" else -1) * stand_x, sy, 0))
    root["door_tags"] = ",".join(sorted(tags))
    for o in list(bpy.context.scene.objects):                             # the asset's own guide empties are not needed in the game
        if o.type == "EMPTY" and any(k in o.name for k in ("CONTACT", "APPROACH", "GUIDE", "PLACEMENT", "Seat_", "Stand_")): bpy.data.objects.remove(o)
    bpy.context.view_layer.update()
    xs = [ (o.matrix_world @ Vector(c)) for o in bpy.context.scene.objects if o.type == "MESH" for c in o.bound_box]
    print(kind, "bounds x %.2f..%.2f y %.2f..%.2f z %.2f..%.2f" % (min(v.x for v in xs), max(v.x for v in xs), min(v.y for v in xs), max(v.y for v in xs), min(v.z for v in xs), max(v.z for v in xs)), "doors", sorted(tags), "seats", {k: tuple(round(c, 2) for c in v) for k, v in seats.items()})
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, f"car_{kind}.glb"), export_format="GLB", export_yup=True, export_extras=True, export_apply=True)
