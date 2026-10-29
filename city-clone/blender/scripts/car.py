"""Modular car. make_car(kind, color, name) -> root Empty with children:
   <name>_body            static shell (paint, glass, wheels, lights, dark door-zone interior)
   <name>_door_FL/FR/RL/RR   separate meshes, origin at the hinge; rotate about Z (Blender) = Y (three).  Opening angle = side * deg, side=+1 right, -1 left
   <name>_seat_XX / <name>_stand_XX   empties: where a seated person sits / where they stand beside the door (car space, +Y forward)
+Y forward, origin at ground centre, ~4.5 m long. Door max angle and side are stored as custom props (exported as glTF extras)."""
import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from kit import *

DOOR_DEG = 62
SEAT_Y = {"F": .10, "R": -.85}
HW = .91                                   # body half-width in the door zone

def make_car(kind="sedan", color="#c8201c", name="car", doors=4):
    paint = M("paint_" + color.lstrip("#"), color, rough=0.5)
    glass = M("glass", "#34455a", rough=0.2)
    dark = M("trim_dark", "#1a1a1c"); tire = M("tire", "#141416"); hub = M("hub", "#8a8d92"); inner = M("interior", "#17181b")
    head = M("headlight", "#fff2c8", emit=2.0); tail = M("taillight", "#e01818", emit=1.5)
    root = bpy.data.objects.new(name, None); bpy.context.scene.collection.objects.link(root)
    roof_or_glass = lambda n: paint if n.z > 0.95 else glass
    b = Builder(name + "_body")
    # lower shell in three lofts so the door zone (y -1.2..1.0) can show a dark interior when a door opens
    b.loft(paint, [(-2.25, .38, .80, .84, .86), (-1.9, .32, .95, .90, .90), (-1.2, .30, .95, HW, HW)])
    b.loft(paint, [(-1.2, .30, .93, HW, HW), (1.0, .30, .93, HW, HW)], mat_fn=lambda n: inner if abs(n.x) > .7 else paint)
    b.loft(paint, [(1.0, .30, .93, HW, HW), (1.8, .34, .86, .89, .88), (2.25, .40, .66, .85, .82)])
    cab = [(-1.30, .93, .98, .80, .78), (-0.80, .93, 1.40, .84, .70), (0.30, .93, 1.40, .84, .70), (1.05, .93, .94, .86, .82)]
    b.loft(paint, cab, mat_fn=roof_or_glass)
    def hw(y, top):
        for p, q in zip(cab, cab[1:]):
            if p[0] <= y <= q[0]:
                t = (y - p[0]) / (q[0] - p[0]); i = 4 if top else 3
                return p[i] + (q[i] - p[i]) * t
    def zt(y):
        for p, q in zip(cab, cab[1:]):
            if p[0] <= y <= q[0]: return p[2] + (q[2] - p[2]) * (y - p[0]) / (q[0] - p[0])
    for s_ in (-1, 1):                                                  # B pillar between front and rear doors
        y = -0.15; hb, ht, z1 = hw(y, False), hw(y, True), zt(y)
        xb = sorted((s_ * hb, s_ * (hb + .03))); xt = sorted((s_ * ht, s_ * (ht + .03)))
        b.prism(paint, (xb[0], xb[1], y - .05, y + .05), (xt[0], xt[1], y - .05, y + .05), .93, z1)
    b.box(dark, -.87, .87, 2.12, 2.30, .34, .56); b.box(dark, -.87, .87, -2.30, -2.12, .34, .56); b.box(dark, -.5, .5, 2.20, 2.26, .60, .74)
    for s in (-1, 1):
        b.box(head, s * .55 - .15, s * .55 + .15, 2.17, 2.27, .62, .74); b.box(tail, s * .60 - .20, s * .60 + .20, -2.30, -2.20, .70, .84)
        for y in (-1.40, 1.40):
            b.cyl(tire, (s * .80, y, .34), .34, .26, "x", 12); b.cyl(hub, (s * .80 + s * .11, y, .34), .17, .06, "x", 8)
    if kind == "taxi":
        sign = M("taxi_sign", "#fff7d0", emit=1.2); b.box(sign, -.36, .36, -.25, .25, 1.40, 1.58); b.box(dark, -.36, .36, -.05, .05, 1.52, 1.58)
    body = b.build(bevel=0.04); body.parent = root

    names = []
    specs = [("F", 1.00, -.13), ("R", -.17, -1.20)] if doors == 4 else [("F", 1.00, -1.00)]      # (row, hinge y = front edge, rear edge y)
    for s, side in ((-1, "L"), (1, "R")):
        for row, yh, yr in specs:
            tag = row + side; d = Builder(f"{name}_door_{tag}")
            def X(x0, x1): return tuple(sorted((s * x0 - s * HW, s * x1 - s * HW)))     # x relative to the hinge (object origin sits at x = s*HW)
            def dbox(m, x0, x1, y0, y1, z0, z1):
                xs = X(x0, x1); d.box(m, xs[0], xs[1], y0 - yh, y1 - yh, z0, z1)
            dbox(paint, .87, .95, yr, yh, .38, .93)                                           # lower panel
            wy0, wy1 = (yr + .04, yh - .38) if row == "F" else (yr + .10, yh - .06)
            if doors == 2: wy0, wy1 = yr + .10, yh - .38
            xb, xt = X(.86, .93), X(.70, .78)
            d.prism(glass, (xb[0], xb[1], wy0 - yh, wy1 - yh), (xt[0], xt[1], wy0 - yh, wy1 - yh), .93, 1.38)   # window, follows the cabin slope
            dbox(dark, .95, .985, yr + .10, yr + .32, .78, .83)                               # handle
            if row == "F": dbox(paint, .90, 1.05, yh - .24, yh + .02, 1.0, 1.10)             # mirror rides on the front door
            door = d.build(bevel=0.02); door.parent = root; door.location = (s * HW, yh, 0)
            door["side"] = s; door["max_open_deg"] = DOOR_DEG; door["tag"] = tag
            names.append(tag)
    for tag in names:
        s = 1 if tag[1] == "R" else -1; y = SEAT_Y[tag[0]]
        for kind_, x in (("seat", s * .42), ("stand", s * 1.55)):
            e = bpy.data.objects.new(f"{name}_{kind_}_{tag}", None); bpy.context.scene.collection.objects.link(e); e.parent = root; e.location = (x, y, 0)
    root["car_kind"] = kind; root["door_tags"] = ",".join(names)
    return root

def set_door(root, tag, frac):
    d = bpy.data.objects[f"{root.name}_door_{tag}"]; d.rotation_euler = (0, 0, math.radians(DOOR_DEG) * frac * d["side"])

if __name__ == "__main__":
    reset(); world((0.55, 0.6, 0.7), 1.0); sun()
    car = make_car("sedan")
    tiles = []
    states = {"closed": {}, "driver_door": {"FL": 1}, "all_open": {"FL": 1, "FR": 1, "RL": 1, "RR": 1}, "half": {"FL": .5, "RR": .5}}
    for name_, st in states.items():
        for t in ("FL", "FR", "RL", "RR"): set_door(car, t, st.get(t, 0))
        for o in [x for x in bpy.context.scene.objects if x.type == "CAMERA"]: bpy.data.objects.remove(o)
        game_camera((0, 0, .6), 50, 9); render(os.path.join(OUT, f"doors_{name_}_game.png"), 480, 480, samples=12)
        camera((6, -6, 4.5), (0, 0, .6), 40); render(os.path.join(OUT, f"doors_{name_}_3q.png"), 480, 480, samples=12); tiles.append(name_)
    print("TILES", tiles)
