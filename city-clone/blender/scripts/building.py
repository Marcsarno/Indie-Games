"""Parametric city building. make_building(...) -> object. Footprint centred on origin, ground at z=0.
Faces: S=-Y (toward the game camera), N=+Y, E=+X, W=-X."""
import sys, os, random; sys.path.insert(0, os.path.dirname(__file__)); from kit import *

def make_building(name, w, d, floors, wall="#8e3b2e", band="#7a3126", trim="#cdbf9f", floor_h=3.1, seed=1, lit=0.3,
                  storefront=("S",), awning="#b5302a", fire_escape=("S", 0.78), roof="ac", sign=(), shop_sign=None):
    rnd = random.Random(seed); b = Builder(name); H = floors * floor_h
    wall_m, band_m, trim_m = M("wall_" + wall[1:], wall, tex="brick_" + wall[1:], tile=3.2), M("band_" + band[1:], band), M("trim_" + trim[1:], trim)
    glass = M("win_dark", "#27384a", rough=0.2); glass2 = M("win_dark2", "#1d2c3b", rough=0.2)
    glow = M("win_lit", "#ffc860", emit=1.6); shop = M("shop_glass", "#ffd68a", emit=1.0); shop_dark = M("shop_dark", "#2a2f38")
    roofm = M("roof_tar", "#4b4a4c", tex="roof", tile=3.0); metal = M("metal_dark", "#25282c"); grey = M("ac_grey", "#8d9198"); awn = M("awning_" + awning[1:], awning)
    plinth = M("plinth", "#5d5a56")
    hx, hy = w / 2, d / 2
    # shell + roof
    b.box(wall_m, -hx, hx, -hy, hy, 0, H)
    b.box(plinth, -hx - .06, hx + .06, -hy - .06, hy + .06, 0, .55)
    b.box(trim_m, -hx - .3, hx + .3, -hy - .3, hy + .3, H - .45, H + .05)               # cornice
    t = .35; ph = .9                                                                     # parapet ring
    for (x0, x1, y0, y1) in ((-hx, hx, -hy, -hy + t), (-hx, hx, hy - t, hy), (-hx, -hx + t, -hy, hy), (hx - t, hx, -hy, hy)):
        b.box(wall_m, x0, x1, y0, y1, H + .05, H + ph)
    b.box(roofm, -hx + t, hx - t, -hy + t, hy - t, H, H + .12)
    def fb(face, u0, u1, z0, z1, o0, o1, m):          # box on a face: u along the face, o = distance out of the wall
        if face == "S": b.box(m, u0, u1, -hy - o1, -hy - o0, z0, z1)
        elif face == "N": b.box(m, u0, u1, hy + o0, hy + o1, z0, z1)
        elif face == "E": b.box(m, hx + o0, hx + o1, u0, u1, z0, z1)
        else: b.box(m, -hx - o1, -hx - o0, u0, u1, z0, z1)
    def fp(face, b0, b1, t0, t1, z0, z1, o0, o1, m):  # slanted prism on a face: bottom span b, top span t (along the face)
        if face == "S": b.prism(m, (b0, b1, -hy - o1, -hy - o0), (t0, t1, -hy - o1, -hy - o0), z0, z1)
        elif face == "N": b.prism(m, (b0, b1, hy + o0, hy + o1), (t0, t1, hy + o0, hy + o1), z0, z1)
        elif face == "E": b.prism(m, (hx + o0, hx + o1, b0, b1), (hx + o0, hx + o1, t0, t1), z0, z1)
        else: b.prism(m, (-hx - o1, -hx - o0, b0, b1), (-hx - o1, -hx - o0, t0, t1), z0, z1)
    for face in "SNEW":
        L = w if face in "SN" else d; n = max(1, int(L // 2.7)); pitch = L / n
        for f in range(floors):
            z = f * floor_h
            if f == 0 and face in storefront:
                fb(face, -L / 2, L / 2, 0, 3.4, .0, .08, shop_dark)
                for i in range(n):
                    c = -L / 2 + pitch * (i + .5)
                    fb(face, c - pitch * .38, c + pitch * .38, .5, 2.7, .08, .14, shop if rnd.random() < .7 else glass)
                fb(face, -L / 2, L / 2, 3.1, 3.5, .1, .35, trim_m)       # sign band
                if shop_sign and face == "S":
                    sm = M("shopsign_" + shop_sign, "#ffffff", emit=.9, tex="sign_" + shop_sign, fit=True); fb("S", -2.6, 2.6, 3.05, 4.4, .36, .42, sm)
                # awning (slanted)
                x0, x1 = -L / 2 + .4, L / 2 - .4
                if face == "S": b.prism(awn, (x0, x1, -hy - .15, -hy - .15), (x0, x1, -hy - 1.7, -hy - 1.7), 3.0, 2.5)
                continue
            fb(face, -L / 2, L / 2, z + 2.2, z + 2.85 if f < floors - 1 else z + 2.7, .0, .05, band_m)   # spandrel band
            for i in range(n):
                c = -L / 2 + pitch * (i + .5)
                fb(face, c - .62, c + .62, z + 1.0, z + 2.5, .0, .10, trim_m)        # frame
                fb(face, c - .50, c + .50, z + 1.12, z + 2.38, .04, .13,
                   glow if rnd.random() < lit else (glass if rnd.random() < .5 else glass2))
                fb(face, c - .70, c + .70, z + .92, z + 1.02, .0, .2, trim_m)         # sill
    # fire escape: landings + railings + slanted stairs on one face, right side
    if fire_escape:
        face, frac = fire_escape; L = w if face in "SN" else d; u0 = -L / 2 + L * frac - 1.1; u1 = u0 + 2.2
        for f in range(1, floors):
            z = f * floor_h + .55
            fb(face, u0, u1, z, z + .07, .0, 1.2, metal)
            fb(face, u0, u1, z + .9, z + .95, 1.12, 1.2, metal); fb(face, u0, u0 + .06, z, z + .95, .0, 1.2, metal); fb(face, u1 - .06, u1, z, z + .95, .0, 1.2, metal)
            if f < floors - 1:                                                       # stair run up to the next landing, zig-zagging
                run = 1.5; ub = (u0 + .15) if f % 2 else (u1 - .15 - .1)
                step = run if f % 2 else -run
                for o in (.2, 1.0):
                    fp(face, ub, ub + .1, ub + step, ub + step + .1, z + .07, z + floor_h, o, o + .08, metal)
    # roof dressing
    rr = random.Random(seed + 7)
    if roof == "tank":
        cx, cy = hx * .35, -hy * .1
        for lx in (-.9, .9):
            for ly in (-.9, .9): b.box(M("wood_dark", "#4a3626"), cx + lx - .08, cx + lx + .08, cy + ly - .08, cy + ly + .08, H + .1, H + 2.8)
        b.cyl(M("tank_wood", "#6b4a32"), (cx, cy, H + 3.9), 1.35, 2.2, "z", 12)
        b.cyl(M("tank_roof", "#3a2a22"), (cx, cy, H + 5.4), 1.5, .8, "z", 12, r2=.12)
    for _ in range(3 if roof in ("ac", "tank") else 0):
        ax = rr.uniform(-hx + 1.5, hx - 1.5); ay = rr.uniform(-hy + 1.5, hy - 1.5)
        if roof == "tank" and abs(ax - hx * .35) < 2.4 and abs(ay + hy * .1) < 2.4: continue
        b.box(grey, ax - .7, ax + .7, ay - .5, ay + .5, H + .1, H + .85); b.box(metal, ax - .45, ax + .45, ay - .3, ay + .3, H + .85, H + .92)
    b.box(wall_m, -hx + 1.2, -hx + 3.6, hy - 3.4, hy - 1.2, H, H + 2.6); b.box(roofm, -hx + 1.1, -hx + 3.7, hy - 3.5, hy - 1.1, H + 2.6, H + 2.75)   # stair bulkhead
    for (tname, uc, z0, sw, sh) in sign:                                              # vertical blade signs on the S face: (texture, u, z0, width, height)
        sm = M("blade_" + tname, "#ffffff", emit=.9, tex="sign_" + tname, fit=True); edge = M("blade_edge", "#3a1410")
        fb("S", uc - sw / 2 - .06, uc + sw / 2 + .06, z0 - .06, z0 + sh + .06, .45, .6, edge); fb("S", uc - sw / 2, uc + sw / 2, z0, z0 + sh, .6, .66, sm)
    o = b.build(); o["w"] = w; o["d"] = d                                          # footprint, read by the collider export
    return o
