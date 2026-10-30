"""Florida buildings: stucco walls + terracotta hip roofs. Footprint centred on the origin, ground at z=0, front (shop/garage/door side) = S face (-Y).
make_house -> villa / townhome unit / clubhouse.   make_row -> attached townhomes.   make_plaza -> shopping plaza with awnings and a sign tower."""
import sys, os, random; sys.path.insert(0, os.path.dirname(__file__)); from kit import *

def _mats(wall):
    st = M("stucco_" + wall, {"cream": "#e9dcb8", "peach": "#e8c4a0", "sand": "#d8c490", "white": "#eee8dc", "butter": "#ecd890", "mint": "#c4e2cc", "sky": "#c2d8e8", "coral": "#efb9a4", "lilac": "#d8c8e6", "stone": "#cfc8bc"}[wall], tex="stucco_" + wall, tile=3.0)
    return st

TRIM = "#f4efe4"; TILE = "#a9573a"

def hip_roof(b, tile, x0, x1, y0, y1, z0, h, over=.6, ridge_along="x", fascia=None):
    """Terracotta hip roof over the footprint (overhang `over`)."""
    X0, X1, Y0, Y1 = x0 - over, x1 + over, y0 - over, y1 + over; w, d = X1 - X0, Y1 - Y0
    if ridge_along == "x":
        inset = min(w / 2 - .2, d / 2 - .1); t = (X0 + inset, X1 - inset, (Y0 + Y1) / 2 - .15, (Y0 + Y1) / 2 + .15)
    else:
        inset = min(d / 2 - .2, w / 2 - .1); t = ((X0 + X1) / 2 - .15, (X0 + X1) / 2 + .15, Y0 + inset, Y1 - inset)
    b.prism(tile, (X0, X1, Y0, Y1), t, z0, z0 + h)
    if fascia is not None: b.box(fascia, X0, X1, Y0, Y1, z0 - .22, z0 + .02)

def make_house(name, w=12, d=9, floors=2, wall="cream", seed=1, garage=False, balcony=True, shutters="#2f6a4a", roof_h=None, floor_h=3.1, tile_hex=TILE, door_u=None, windows=True, hip=True):
    r = random.Random(seed); b = Builder(name); H = floors * floor_h; hx, hy = w / 2, d / 2
    wm = _mats(wall); trim = M("fl_trim", TRIM); tile = M("terracotta" if tile_hex == TILE else "roof_" + tile_hex[1:], tile_hex, tex="tiles" if tile_hex == TILE else "tiles_" + tile_hex[1:], tile=2.5); glass = M("fl_glass", "#35566a", rough=.2)
    shut = M("shutter_" + shutters[1:], shutters); door = M("fl_door", "#5a3a22"); garm = M("garage_door", "#d8d2c2"); plinth = M("fl_plinth", "#b8ab90")
    b.box(wm, -hx, hx, -hy, hy, 0, H); b.box(plinth, -hx - .05, hx + .05, -hy - .05, hy + .05, 0, .5)
    for f in range(1, floors): b.box(trim, -hx - .08, hx + .08, -hy - .08, hy + .08, f * floor_h - .12, f * floor_h + .12)          # string course
    hip_roof(b, tile, -hx, hx, -hy, hy, H, roof_h or (2.6 if hip else 0), .55, "x" if w >= d else "y", trim)
    def fb(face, u0, u1, z0, z1, o0, o1, m):
        if face == "S": b.box(m, u0, u1, -hy - o1, -hy - o0, z0, z1)
        elif face == "N": b.box(m, u0, u1, hy + o0, hy + o1, z0, z1)
        elif face == "E": b.box(m, hx + o0, hx + o1, u0, u1, z0, z1)
        else: b.box(m, -hx - o1, -hx - o0, u0, u1, z0, z1)
    for face in "SNEW":
        L = w if face in "SN" else d; n = max(1, int(L // 3.0)); pitch = L / n
        for f in range(floors):
            z = f * floor_h
            for i in range(n):
                c = -L / 2 + pitch * (i + .5)
                if face == "S" and f == 0 and (garage and i == 0 or (door_u is None and i == n // 2) or (door_u is not None and i == door_u)):
                    if garage and i == 0: fb(face, c - 1.3, c + 1.3, 0, 2.4, 0, .1, garm); fb(face, c - 1.3, c + 1.3, 1.2, 1.28, .1, .13, trim)
                    else: fb(face, c - .6, c + .6, 0, 2.3, 0, .12, door); fb(face, c - .75, c + .75, 2.1, 2.5, 0, .2, trim)
                    continue
                if not windows: continue
                if face != "S" and f == 0 and r.random() < .35: continue
                fb(face, c - .65, c + .65, z + .95, z + 2.35, 0, .08, trim); fb(face, c - .52, c + .52, z + 1.05, z + 2.25, .02, .1, glass); fb(face, c - .52, c + .52, z + 2.15, z + 2.4, .04, .12, trim)   # arched-look head
                if face in "SN" and f == floors - 1: fb(face, c - .95, c - .66, z + .95, z + 2.35, .02, .14, shut); fb(face, c + .66, c + .95, z + .95, z + 2.35, .02, .14, shut)
    if balcony and floors >= 2:
        n = max(1, int(w // 3.0)); pitch = w / n; c = -w / 2 + pitch * (n // 2 + .5)
        b.box(trim, c - 1.4, c + 1.4, -hy - 1.1, -hy, floor_h - .05, floor_h + .12)
        for u in (c - 1.4, c + 1.34): b.box(trim, u, u + .06, -hy - 1.1, -hy - 1.04, floor_h, floor_h + 1.0)
        b.box(trim, c - 1.4, c + 1.4, -hy - 1.1, -hy - 1.04, floor_h + .9, floor_h + 1.0)
    return b.build(vc=True)

def make_row(name, units=4, uw=6.4, d=10, floors=2, seed=3):
    """Attached townhomes: one object, every unit a different stucco tint, roofs per pair."""
    r = random.Random(seed); b = Builder(name); tints = ["peach", "cream", "butter", "sand", "white"]; W = units * uw; H = floors * 3.1
    trim = M("fl_trim", TRIM); tile = M("terracotta", TILE, tex="tiles", tile=2.5); glass = M("fl_glass", "#35566a", rough=.2); door = M("fl_door", "#5a3a22"); garm = M("garage_door", "#d8d2c2")
    shut = M("shutter_2f6a4a", "#2f6a4a"); plinth = M("fl_plinth", "#b8ab90"); hy = d / 2
    for i in range(units):
        x0 = -W / 2 + i * uw; x1 = x0 + uw; cx = (x0 + x1) / 2; wm = _mats(tints[(i + seed) % len(tints)])
        b.box(wm, x0, x1, -hy, hy, 0, H); b.box(plinth, x0, x1, -hy - .05, hy + .05, 0, .5); b.box(trim, x0, x1, -hy - .08, hy + .08, 3.1 - .12, 3.1 + .12)
        b.box(garm, cx - 1.25, cx + 1.25, -hy - .1, -hy, 0, 2.4); b.box(trim, cx - 1.25, cx + 1.25, -hy - .13, -hy - .1, 1.2, 1.28)
        b.box(door, x1 - 1.3, x1 - .6, -hy - .12, -hy, 0, 2.2); b.box(trim, x1 - 1.45, x1 - .45, -hy - .2, -hy, 2.05, 2.4)
        for k, wx in enumerate((cx - 1.6, cx + 1.6)):
            for (face_y, off) in ((-hy, -1), (hy, 1)):
                y0, y1 = (face_y - .08, face_y) if off < 0 else (face_y, face_y + .08)
                b.box(trim, wx - .6, wx + .6, y0, y1, 3.1 + .95, 3.1 + 2.35); b.box(glass, wx - .48, wx + .48, y0 - (.02 if off < 0 else 0), y1 + (.02 if off > 0 else 0), 3.1 + 1.05, 3.1 + 2.25)
                if off < 0: b.box(shut, wx - .9, wx - .62, y0 - .06, y0, 3.1 + .95, 3.1 + 2.35); b.box(shut, wx + .62, wx + .9, y0 - .06, y0, 3.1 + .95, 3.1 + 2.35)
        b.box(glass, cx - .5, cx + .5, hy, hy + .06, 1.0, 2.0)
        if i % 2 == 0:
            xx1 = min(x1 + uw, W / 2); hip_roof(b, tile, x0, xx1, -hy, hy, H, 2.7, .55, "x", trim)
    return b.build(vc=True)

def make_plaza(name, w=40, d=16, H=7.0, shops=(("restaurant_fl", 7, "#8c1c1c"), ("nails", 5, "#7a2f6a"), ("coffee", 6, "#21453a"), ("pizza", 5, "#b8321f")), tower_x=None, tower_sign="shops", seed=2, wall="cream"):
    """Shopping plaza. `shops` = (sign texture, width m, awning colour) packed left-to-right from -w/2 + 2; the rest is a big-box anchor with a sign tower at tower_x."""
    r = random.Random(seed); b = Builder(name); hx, hy = w / 2, d / 2; wm = _mats(wall); trim = M("fl_trim", TRIM); tile = M("terracotta", TILE, tex="tiles", tile=2.5)
    glass = M("shop_glass_fl", "#2c5a66", rough=.2); roofm = M("roof_tar", "#6a6a6c", tex="roof", tile=3.0); grey = M("ac_grey", "#a9adb4"); dk = M("metal_dark", "#25282c"); plinth = M("fl_plinth", "#b8ab90")
    b.box(wm, -hx, hx, -hy, hy, 0, H); b.box(plinth, -hx - .05, hx + .05, -hy - .05, hy + .05, 0, .5)
    b.box(trim, -hx - .3, hx + .3, -hy - .3, hy + .3, H - .45, H + .1); t = .4                                                               # cornice + parapet
    for (x0, x1, y0, y1) in ((-hx, hx, -hy, -hy + t), (-hx, hx, hy - t, hy), (-hx, -hx + t, -hy, hy), (hx - t, hx, -hy, hy)): b.box(wm, x0, x1, y0, y1, H + .1, H + 1.0)
    b.box(roofm, -hx + t, hx - t, -hy + t, hy - t, H, H + .12)
    for k in range(int(w // 9)):                                                                                                              # rooftop AC
        ax = -hx + 4 + k * 9 + r.uniform(-1, 1); ay = r.uniform(-hy + 3, hy - 3); b.box(grey, ax - 1, ax + 1, ay - .8, ay + .8, H + .12, H + 1.0); b.box(dk, ax - .6, ax + .6, ay - .5, ay + .5, H + 1.0, H + 1.08)
    x = -hx + 2.0
    for (sign, sw, awn) in shops:                                                                                                             # shop bays along the front
        am = M("awning_" + awn[1:], awn); sm = M("shopsign_" + sign, "#ffffff", tex="sign_" + sign, fit=True, rough=.6)
        b.box(glass, x + .4, x + sw - .4, -hy - .06, -hy, .4, 3.0); b.box(trim, x + .3, x + sw - .3, -hy - .1, -hy, 3.0, 3.15)
        b.box(sm, x + .5, x + sw - .5, -hy - .16, -hy - .1, 3.5, 4.5)
        for k in range(4):                                                                                                                    # striped slanted awning
            xs = x + .3 + k * (sw - .6) / 4; xe = xs + (sw - .6) / 4; b.prism(am if k % 2 == 0 else M("awning_white", "#f0ebe0"), (xs, xe, -hy - .12, -hy - .12), (xs, xe, -hy - 1.9, -hy - 1.9), 3.3, 2.7)
        b.box(wm, x + sw - .35, x + sw + .35, -hy - .3, -hy, 0, 3.4)                                                                           # pilaster
        x += sw
    ax0 = x + .5; ax1 = hx - 1.5                                                                                                              # anchor store front
    if ax1 - ax0 > 6:
        b.box(glass, ax0, ax1, -hy - .06, -hy, .4, 3.4); b.box(trim, ax0 - .2, ax1 + .2, -hy - .12, -hy, 3.4, 3.6)
        for k in range(int((ax1 - ax0) // 4)): px = ax0 + 2 + k * 4; b.box(wm, px - .3, px + .3, -hy - .3, -hy, 0, 3.6)
        am = M("awning_1f6b3a", "#1f6b3a")
        for k in range(int((ax1 - ax0) // 4)):
            xs = ax0 + k * 4 + .1; b.prism(am, (xs, xs + 3.8, -hy - .12, -hy - .12), (xs, xs + 3.8, -hy - 2.2, -hy - 2.2), 3.7, 3.0)
    tx = tower_x if tower_x is not None else hx - 10                                                                                         # entrance tower, terracotta hip roof, big sign
    b.box(wm, tx - 4.2, tx + 4.2, -hy - 1.2, -hy + 7, 0, H + 3.2); b.box(trim, tx - 4.4, tx + 4.4, -hy - 1.3, -hy + 7.2, H + 2.8, H + 3.3)
    b.box(glass, tx - 2.4, tx + 2.4, -hy - 1.26, -hy - 1.2, .3, 3.8); b.box(trim, tx - 2.6, tx + 2.6, -hy - 1.32, -hy - 1.2, 3.8, 4.1)
    tsm = M("towersign", "#ffffff", tex="sign_" + tower_sign, fit=True, rough=.6); b.box(tsm, tx - 3.3, tx + 3.3, -hy - 1.32, -hy - 1.2, 5.2, 6.9)
    hip_roof(b, tile, tx - 4.2, tx + 4.2, -hy - 1.2, -hy + 7, H + 3.3, 3.2, .7, "x", trim)
    return b.build(vc=True)

KIT = {}
if __name__ == "__main__":
    reset(); world((0.62, 0.74, 0.92), 1.3); sun(direction=(0.45, -0.5, -0.74), energy=3.4, color=(1.0, .93, .78), angle_deg=6)
    ground = Builder("g"); ground.box(M("grass_flat", "#5f9a3c", tex="grass", tile=4.0), -50, 50, -40, 40, -.2, 0); ground.build()
    a = make_row("rowA", 4, 6.4, 10); a.location = (-24, 18, 0)
    h = make_house("clubhouse", 14, 10, 1, "cream", 2, balcony=False, roof_h=3.2); h.location = (-24, -6, 0)
    v = make_house("villa", 12, 9, 2, "peach", 5, garage=True); v.location = (-4, -16, 0)
    p = make_plaza("plaza", 44, 16); p.location = (20, 8, 0)
    for nm, tgt, pitch, dist, w, h_ in (("bfl_game", (0, 6, 0), 48, 70, 1100, 650), ("bfl_plaza", (20, -2, 2), 38, 36, 1000, 620), ("bfl_homes", (-20, 8, 2), 40, 40, 1000, 620)):
        for o in [x for x in bpy.context.scene.objects if x.type == "CAMERA"]: bpy.data.objects.remove(o)
        game_camera(tgt, pitch, dist); render(os.path.join(OUT, nm + ".png"), w, h_, samples=24)
