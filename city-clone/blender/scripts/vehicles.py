"""All drivable vehicles from the concept sheets (art/coconut-19/20/21): one parametric low-poly builder, chunky boxy style.
make_vehicle(kind, color, name) -> root Empty (same contract as car.make_car, so the page's enter/exit + doors work for every kind):
   <name>_body, <name>_door_FL/FR(/RL/RR) (origin at the hinge, rotate about Z), <name>_seat_XX / <name>_stand_XX empties.
   root["dims"] = [length, width, wheelbase] (the page sizes the collision box and steering from it); materials named paint_* are recoloured per car.
+Y forward, origin at ground centre. Run: blender -b --python scripts/vehicles.py  -> out/car_<kind>.glb for every kind + art-review/round19/vehicles.png"""
import sys, os, math; sys.path.insert(0, os.path.dirname(__file__)); from kit import *

DOOR_DEG = 62
# kind: L, W, wheel r, axles (y), belt z, kind of body, doors rows {row: (hinge_y, rear_y)}, default colour, extras
SPECS = {
    "sedan":     dict(L=4.5, W=1.8, r=.34, axles=(1.40, -1.40), belt=.92, body="car", cab=(-1.25, 1.05), roof=1.42, hood=.88, trunk=.90, rows={"F": (1.0, -.12), "R": (-.18, -1.15)}, color="#e8e2d0"),
    "taxi":      dict(L=4.5, W=1.8, r=.34, axles=(1.40, -1.40), belt=.92, body="car", cab=(-1.25, 1.05), roof=1.42, hood=.88, trunk=.90, rows={"F": (1.0, -.12), "R": (-.18, -1.15)}, color="#f2c21c", extra="taxi"),
    "police":    dict(L=4.6, W=1.82, r=.34, axles=(1.42, -1.42), belt=.92, body="car", cab=(-1.25, 1.05), roof=1.42, hood=.88, trunk=.90, rows={"F": (1.0, -.12), "R": (-.18, -1.15)}, color="#1c1c20", extra="police"),
    "hatchback": dict(L=3.9, W=1.7, r=.31, axles=(1.22, -1.20), belt=.88, body="car", cab=(-1.70, .80), roof=1.42, hood=.84, trunk=None, rows={"F": (.76, -.30), "R": (-.34, -1.20)}, color="#1fb3a8"),
    "coupe":     dict(L=4.3, W=1.78, r=.33, axles=(1.35, -1.30), belt=.82, body="car", cab=(-1.05, .80), roof=1.24, hood=.78, trunk=.84, rows={"F": (.76, -.70)}, color="#d42a24", extra="spoiler"),
    "suv":       dict(L=4.6, W=1.86, r=.40, axles=(1.45, -1.40), belt=1.10, body="car", cab=(-2.05, .95), roof=1.86, hood=1.06, trunk=None, rows={"F": (.92, -.20), "R": (-.24, -1.30)}, color="#6b7a3a", extra="rails"),
    "minivan":   dict(L=4.9, W=1.86, r=.36, axles=(1.55, -1.55), belt=1.02, body="car", cab=(-2.25, 1.25), roof=1.82, hood=.98, trunk=None, rows={"F": (1.20, .05), "R": (0.0, -1.20)}, color="#7a9cc4", extra="rails"),
    "pickup":    dict(L=5.3, W=1.86, r=.40, axles=(1.80, -1.65), belt=1.10, body="pickup", cab=(-.75, 1.20), roof=1.86, hood=1.08, rows={"F": (1.15, .20), "R": (.16, -.70)}, color="#2f78c8"),
    "tow":       dict(L=5.8, W=1.95, r=.42, axles=(2.00, -1.75), belt=1.16, body="tow", cab=(-.20, 1.70), roof=1.95, hood=1.12, rows={"F": (1.65, .45)}, color="#f0f0ee"),
    "van":       dict(L=5.3, W=1.95, r=.38, axles=(1.75, -1.75), belt=1.08, body="van", cab=(-2.55, 1.40), roof=2.25, hood=1.05, rows={"F": (1.35, .30)}, color="#ecebe6"),
    "ambulance": dict(L=6.3, W=2.10, r=.40, axles=(2.05, -1.90), belt=1.10, body="box", cab=(.95, 2.05), roof=2.10, hood=1.05, box=(-3.10, .90, 2.75), rows={"F": (2.00, 1.05)}, color="#f4f4f2", extra="ambulance"),
    "boxtruck":  dict(L=7.4, W=2.25, r=.46, axles=(2.40, -2.30), belt=1.30, body="box", cab=(1.75, 2.75), roof=2.55, hood=1.25, box=(-3.65, 1.65, 3.40), rows={"F": (2.70, 1.85)}, color="#3d8a46"),
    "flatbed":   dict(L=7.0, W=2.20, r=.46, axles=(2.30, -2.15), belt=1.30, body="flatbed", cab=(1.45, 2.55), roof=2.50, hood=1.25, rows={"F": (2.50, 1.55)}, color="#e8b623"),
    "garbage":   dict(L=8.4, W=2.40, r=.50, axles=(2.85, -1.85, -3.10), belt=1.40, body="garbage", cab=(2.15, 3.25), roof=2.75, hood=1.35, rows={"F": (3.20, 2.25)}, color="#3f8a44"),
    "bus":       dict(L=11.6, W=2.50, r=.50, axles=(3.80, -3.40), belt=1.25, body="bus", roof=3.05, rows={"F": (5.55, 4.70)}, color="#f2f2f0"),
}

def _m(n, h, **kw): return M("veh_" + n, h, **kw)

def make_vehicle(kind="sedan", color=None, name="car"):
    S = SPECS[kind]; L, W, r, belt, roof = S["L"], S["W"], S["r"], S["belt"], S["roof"]; hx, hy = W / 2, L / 2; color = color or S["color"]
    paint = M("paint_" + color.lstrip("#"), color, rough=.5)                      # recoloured per car by the page
    glass = _m("glass", "#2e3e52", rough=.2); dark = _m("trim", "#1b1c1f"); tire = _m("tire", "#131315"); hub = _m("hub", "#9a9da2"); inner = _m("interior", "#16171a")
    head = _m("head", "#fff2c8", emit=2.0); tail = _m("tail", "#e01818", emit=1.5); amber = _m("amber", "#f29a1c", emit=1.2); grey = _m("grey", "#8d9096"); white = _m("white", "#f4f4f2")
    body_m = paint
    if kind == "police": body_m = _m("police_black", "#1c1c20", rough=.5)
    if kind in ("ambulance", "tow"): body_m = _m("ems_white", "#f4f4f2", rough=.5)
    if kind == "bus": body_m = _m("bus_white", "#f2f2f0", rough=.5)
    root = bpy.data.objects.new(name, None); bpy.context.scene.collection.objects.link(root)
    b = Builder(name + "_body"); z0 = r * .95                                     # body floor height above ground
    # wheels + arches
    for ay in S["axles"]:
        for s in (-1, 1):
            b.cyl(tire, (s * (hx - .22), ay, r), r, .30, "x", 12); b.cyl(hub, (s * (hx - .06), ay, r), r * .5, .05, "x", 8)
    # bumpers / lights
    b.box(dark, -hx + .02, hx - .02, hy - .16, hy + .04, z0 - .12, z0 + .28); b.box(dark, -hx + .02, hx - .02, -hy - .04, -hy + .16, z0 - .12, z0 + .28)
    def lights(yf, zf, yb, zb):
        for s in (-1, 1):
            b.box(head, s * (hx - .32) - .17, s * (hx - .32) + .17, yf - .02, yf + .05, zf, zf + .16); b.box(amber, s * (hx - .1) - .06, s * (hx - .1) + .06, yf - .04, yf + .04, zf, zf + .14)
            b.box(tail, s * (hx - .25) - .15, s * (hx - .25) + .15, yb - .05, yb + .02, zb, zb + .2)
    kindb = S["body"]
    if kindb == "car":
        cy0, cy1 = S["cab"]; hood, trunk = S["hood"], S["trunk"]
        b.box(body_m, -hx, hx, -hy + .06, hy - .06, z0, belt)                                           # lower body
        b.prism(body_m, (-hx, hx, cy1 - .02, hy - .06), (-hx + .05, hx - .05, cy1 - .02, hy - .25), belt, max(belt, hood) + .0)  # hood slab (flat top at belt)
        if trunk is not None: b.box(body_m, -hx, hx, -hy + .06, cy0 + .02, belt, trunk + .02)
        tw = .14                                                                                        # cabin taper
        b.prism(glass, (-hx + .04, hx - .04, cy0, cy1), (-hx + tw + .04, hx - tw - .04, cy0 + (.35 if trunk is not None else .08), cy1 - .42), belt, roof - .06)
        b.prism(body_m, (-hx + tw + .03, hx - tw - .03, cy0 + (.33 if trunk is not None else .06), cy1 - .40), (-hx + tw + .06, hx - tw - .06, cy0 + (.36 if trunk is not None else .09), cy1 - .44), roof - .07, roof)
        for s in (-1, 1):                                                                               # pillars
            for py in ((cy0 + cy1) / 2,):
                b.prism(body_m, (s * (hx - .04) - .04, s * (hx - .04) + .04, py - .05, py + .05), (s * (hx - tw - .04) - .04, s * (hx - tw - .04) + .04, py - .05, py + .05), belt, roof - .06)
        lights(hy - .04, belt - .26, -hy + .04, belt - .22)
        b.box(dark, -.45, .45, hy - .07, hy - .02, belt - .32, belt - .1)                                 # grille
    elif kindb in ("pickup", "tow", "flatbed", "box", "garbage"):
        cy0, cy1 = S["cab"]; hood = S["hood"]
        b.box(dark, -hx + .12, hx - .12, -hy + .3, cy0, z0 - .05, z0 + .25)                             # frame rails
        b.box(body_m if kindb in ("pickup", "tow") else paint, -hx, hx, cy1, hy - .06, z0, hood)          # hood / nose
        cab_m = paint if kind not in ("tow",) else body_m
        b.box(cab_m, -hx, hx, cy0, cy1, z0, belt); b.prism(glass, (-hx + .03, hx - .03, cy0 + .02, cy1), (-hx + .1, hx - .1, cy0 + .02, cy1 - .30), belt, roof - .06)
        b.box(cab_m, -hx + .1, hx - .1, cy0 + .02, cy1 - .30, roof - .06, roof)
        b.box(dark, -.55, .55, hy - .07, hy - .02, hood - .38, hood - .08)
        lights(hy - .04, hood - .30, -hy + .04, z0 + .3)
        if kindb == "pickup":
            b.box(body_m, -hx, hx, -hy + .06, cy0, z0, belt - .12); b.box(dark, -hx + .08, hx - .08, -hy + .14, cy0 - .06, belt - .2, belt - .1)   # bed with a dark floor
        if kindb == "tow":
            red = _m("tow_red", "#c8261e"); b.box(body_m, -hx, hx, -hy + .06, cy0, z0, belt - .15)
            for s in (-1, 1): b.box(red, s * hx - .02, s * hx + .02, -hy + .1, hy - .1, z0 + .35, z0 + .52)
            b.box(red, -.25, .25, -1.2, -.6, belt - .15, belt + .9); b.prism(red, (-.18, .18, -1.1, -.7), (-.12, .12, -2.9, -2.6), belt + .9, belt + 2.0)
            b.box(dark, -.04, .04, -2.8, -2.72, belt + .9, belt + 1.95); b.box(grey, -.12, .12, -2.84, -2.68, belt + .7, belt + .9)
            b.box(amber, -.7, .7, cy0 + .3, cy0 + .55, roof, roof + .14)
        if kindb == "flatbed":
            wood = _m("deck", "#8a5f3c"); b.box(dark, -hx, hx, -hy + .06, cy0 - .1, z0 + .2, z0 + .42); b.box(wood, -hx + .04, hx - .04, -hy + .1, cy0 - .14, z0 + .42, z0 + .48)
            for x in (-hx + .05, hx - .15): b.box(dark, x, x + .1, cy0 - .3, cy0 - .2, z0 + .48, roof - .1)
            b.box(dark, -hx + .05, hx - .05, cy0 - .3, cy0 - .2, roof - .2, roof - .1)
        if kindb == "box":
            y0b, y1b, hb = S["box"]; bm = white if kind == "boxtruck" else body_m
            b.box(bm, -hx, hx, y0b, y1b, z0 + .15, hb); b.box(grey, -hx - .01, hx + .01, y0b, y0b + .08, z0 + .15, hb)
            if kind == "ambulance":
                red = _m("ems_red", "#d01f1f")
                for s in (-1, 1): b.box(red, s * hx - .015, s * hx + .015, y0b, hy - .3, belt - .1, belt + .12)
                for s in (-1, 1):
                    cx = (y0b + y1b) / 2; b.box(red, s * hx - .02, s * hx + .02, cx - .12, cx + .12, belt + .4, belt + 1.15); b.box(red, s * hx - .02, s * hx + .02, cx - .38, cx + .38, belt + .66, belt + .9)
                b.box(red, -hx + .1, hx - .1, y1b - .2, y1b, hb, hb + .14); b.box(white, -.3, .3, y1b - .2, y1b, hb, hb + .14)
        if kindb == "garbage":
            gm = paint; b.box(gm, -hx, hx, -hy + .5, cy0 - .1, z0 + .2, roof + .25); b.prism(gm, (-hx, hx, -hy + .06, -hy + .55), (-hx + .1, hx - .1, -hy + .2, -hy + .5), z0 + .3, roof + .1)
            for yy in (-1.5, 0.0, 1.0): b.box(grey, -hx - .02, hx + .02, yy, yy + .1, z0 + .3, roof + .2)
            b.box(amber, -.5, .5, cy0 + .4, cy0 + .6, roof, roof + .12)
    elif kindb == "van":
        cy0, cy1 = S["cab"]
        b.box(body_m, -hx, hx, -hy + .06, cy1, z0, roof - .05); b.prism(body_m, (-hx, hx, cy1, hy - .06), (-hx + .05, hx - .05, cy1, hy - .5), z0, belt)
        b.prism(glass, (-hx + .05, hx - .05, cy1 - .02, cy1 + .02), (-hx + .1, hx - .1, cy1 - .5, cy1 - .46), belt, roof - .1)
        b.box(body_m, -hx + .03, hx - .03, -hy + .1, cy1 - .5, roof - .1, roof)
        for s in (-1, 1): b.box(glass, s * hx - .015, s * hx + .015, cy1 - .9, cy1 - .05, belt + .05, roof - .25)
        lights(hy - .04, belt - .3, -hy + .04, belt)
        b.box(dark, -.5, .5, hy - .07, hy - .02, belt - .4, belt - .1)
    elif kindb == "bus":
        blue = _m("bus_blue", "#2a6cc0")
        b.box(body_m, -hx, hx, -hy + .06, hy - .06, z0, roof); b.box(dark, -hx - .01, hx + .01, -hy + .1, hy - .1, z0, z0 + .3)
        b.box(blue, -hx - .015, hx + .015, -hy + .1, hy - .1, belt - .45, belt + .05)
        for s in (-1, 1): b.box(glass, s * hx - .02, s * hx + .02, -hy + .4, hy - .9, belt + .2, roof - .45)
        b.box(glass, -hx + .1, hx - .1, hy - .07, hy - .02, belt - .1, roof - .3); b.box(dark, -hx + .2, hx - .2, hy - .08, hy - .03, roof - .28, roof - .1)
        b.box(glass, -hx + .2, hx - .2, -hy + .02, -hy + .07, belt + .3, roof - .4)
        for yy in (-2.5, 1.5): b.box(grey, -.6, .6, yy - .8, yy + .8, roof, roof + .22)
        lights(hy - .04, z0 + .35, -hy + .04, z0 + .5)
    if kind in ("suv", "minivan"):
        cy0, cy1 = S["cab"]
        for s in (-1, 1): b.box(dark, s * (hx - .3) - .04, s * (hx - .3) + .04, cy0 + .2, cy1 - .6, roof, roof + .08)
    if kind == "spoiler" or S.get("extra") == "spoiler":
        b.box(body_m, -hx + .1, hx - .1, -hy + .1, -hy + .35, S["trunk"] + .25, S["trunk"] + .3)
        for s in (-1, 1): b.box(dark, s * .6 - .04, s * .6 + .04, -hy + .2, -hy + .3, S["trunk"], S["trunk"] + .25)
    if S.get("extra") == "taxi":
        sign = M("veh_taxi_sign", "#ffffff", tex="sign_taxi_roof", fit=True); b.box(sign, -.38, .38, -.3, -.12, roof, roof + .22); b.box(_m("taxi_y", "#f2c21c"), -.38, .38, -.12, .12, roof, roof + .22)
        chk = _m("checker", "#18181a")
        for s in (-1, 1):
            for k in range(10):
                yy = -1.1 + k * .22
                if k % 2 == 0: b.box(chk, s * hx - .01, s * hx + .01, yy, yy + .11, belt - .2, belt - .12)
                else: b.box(chk, s * hx - .01, s * hx + .01, yy, yy + .11, belt - .12, belt - .04)
    if S.get("extra") == "police":
        bar_r, bar_b = _m("bar_red", "#e01c1c", emit=1.5), _m("bar_blue", "#1c4fe0", emit=1.5)
        b.box(dark, -.62, .62, -.32, -.12, roof, roof + .05); b.box(bar_b, -.62, -.05, -.32, -.12, roof + .05, roof + .17); b.box(bar_r, .05, .62, -.32, -.12, roof + .05, roof + .17); b.box(white, -.05, .05, -.32, -.12, roof + .05, roof + .17)
    if S.get("extra") == "ambulance":
        y1b = S["box"][1]
        for k, xx in enumerate((-.9, -.5, -.1, .3, .7)): b.box(_m("bar_red", "#e01c1c", emit=1.5) if k % 2 == 0 else white, xx, xx + .3, y1b - .2, y1b, S["box"][2] + .02, S["box"][2] + .16)
    body = b.build(bevel=0.03, vc=True); body.parent = root
    # doors: panels on the outside of the body sides, hinge at the front edge
    names = []
    hinge_x = hx + .02
    for s, side in ((-1, "L"), (1, "R")):
        for row, (yh, yr) in S["rows"].items():
            tag = row + side; d = Builder(f"{name}_door_{tag}")
            dm = body_m
            if kind == "police": dm = white
            top = (S["roof"] - .12) if kindb in ("car", "van", "pickup", "tow", "flatbed", "box", "garbage") else belt + .9
            if kindb == "bus": top = S["roof"] - .3
            def panel(m, z0_, z1_, inset=0.0, y0_=yr, y1_=yh): x = s * .0; d.box(m, min(0, s * .05), max(0, s * .05), y0_ - yh + inset, y1_ - yh - inset, z0_, z1_)
            panel(dm, z0 + .05, belt)
            if kindb == "bus": panel(glass, belt, top)
            else: panel(glass, belt, top - .05, .06)
            if kind == "police" and row == "F": d.box(M("veh_police_door", "#ffffff", tex="sign_police_door", fit=True), min(0, s * .055), max(0, s * .055), yr - yh + .05, -.05, belt - .45, belt - .12)
            if kind == "taxi": pass
            d.box(dark, min(0, s * .07), max(0, s * .07), yr - yh + .08, yr - yh + .26, belt - .16, belt - .1)
            if row == "F" and kindb != "bus": d.box(body_m if kind != "police" else dark, min(s * .05, s * .22), max(s * .05, s * .22), -.3, -.05, belt + .05, belt + .22)   # mirror
            door = d.build(bevel=0.01, vc=True); door.parent = root; door.location = (s * hinge_x, yh, 0)
            door["side"] = s; door["max_open_deg"] = DOOR_DEG; door["tag"] = tag; names.append(tag)
    for tag in names:
        s = 1 if tag[1] == "R" else -1; yh, yr = S["rows"][tag[0]]; y = (yh + yr) / 2 - .1
        for k_, x in (("seat", s * (hx - .5)), ("stand", s * (hx + .65))):
            e = bpy.data.objects.new(f"{name}_{k_}_{tag}", None); bpy.context.scene.collection.objects.link(e); e.parent = root; e.location = (x, y, 0)
    ax = S["axles"]; root["car_kind"] = kind; root["door_tags"] = ",".join(names); root["dims"] = [L, W, round(ax[0] - ax[-1], 2)]
    return root

KINDS = list(SPECS)
if __name__ == "__main__":
    import json
    if os.environ.get("SHEET", "1") == "1":
        reset(); mood_ok = True
        try:
            import mood; mood.florida(); mood._transform()
        except Exception: mood_ok = False
        g = Builder("ground"); g.box(M("veh_ground", "#9a9890"), -40, 40, -30, 30, -.1, 0); g.build()
        xs = 0.0
        for k, kind in enumerate(KINDS):
            col, row = k % 5, k // 5; make_vehicle(kind, None, f"v_{kind}").location = (-22 + col * 11, 14 - row * 14, 0)
        game_camera((0, 0, 0), 45, 56); render(os.path.join(os.path.dirname(__file__), "..", "..", "art-review", "round19", "vehicles.png"), 1400, 900, samples=16, keep_transform=True)
    for kind in KINDS:
        reset(); make_vehicle(kind, None, "car"); print("GLB", kind, export_glb(f"car_{kind}"))
    json.dump({k: {"dims": [SPECS[k]["L"], SPECS[k]["W"], round(SPECS[k]["axles"][0] - SPECS[k]["axles"][-1], 2)], "color": SPECS[k]["color"]} for k in KINDS}, open(os.path.join(OUT, "vehicle_kinds.json"), "w"))
