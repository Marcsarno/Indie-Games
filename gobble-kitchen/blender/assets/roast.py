"""The finale: the Thanksgiving turkey. A plump golden roast in a pan with garnish, drumsticks in paper
frills pointing at the player, an opening that takes the stuffing, cut lines across the breast and a platter
of slices. Plus a bowl of stuffing and a baster in a bowl of juices.
Station space: origin on the counter top; the player is at -Y."""
import math
import os
import random
from mathutils import Vector, noise
from lib import shapes as sh, common as C, palette as P

BZ = 0.235            # body centre height
RX, RY, RZ = 0.3, 0.36, 0.205


def top_z(x, y):
    """Height of the breast surface above the pan at (x, y)."""
    k = 1 - (x / RX) ** 2 - (y / RY) ** 2
    return BZ + RZ * math.sqrt(max(0.02, k)) * (1.0 + 0.12 * max(0.0, 1 - abs(x) / 0.12) * 0)


def build(out, preview):
    root = C.empty('station_roast')
    objs = [root]
    roast = C.empty('roast', loc=(0.04, 0.06, 0), parent=root)
    W, D = 1.0, 0.74
    pan_pcs = [
        sh.box(W, D, 0.03, r=0.012, seg=2, col='steel_dark').at(0, 0, 0.015),
        sh.box(W, 0.045, 0.11, r=0.02, seg=2, col='steel_dark').at(0, D / 2 - 0.02, 0.055), sh.box(W, 0.045, 0.11, r=0.02, seg=2, col='steel_dark').at(0, -D / 2 + 0.02, 0.055),
        sh.box(0.045, D, 0.11, r=0.02, seg=2, col='steel_dark').at(W / 2 - 0.02, 0, 0.055), sh.box(0.045, D, 0.11, r=0.02, seg=2, col='steel_dark').at(-W / 2 + 0.02, 0, 0.055),
        sh.tube([(W / 2, -0.13, 0.1), (W / 2 + 0.08, -0.13, 0.11), (W / 2 + 0.08, 0.13, 0.11), (W / 2, 0.13, 0.1)], r=0.02, col='steel', segs=8),
        sh.tube([(-W / 2, -0.13, 0.1), (-W / 2 - 0.08, -0.13, 0.11), (-W / 2 - 0.08, 0.13, 0.11), (-W / 2, 0.13, 0.1)], r=0.02, col='steel', segs=8),
        sh.box(W - 0.1, D - 0.1, 0.012, r=0.004, col='juice').at(0, 0, 0.034),
    ]
    pan = C.make('roast_pan', pan_pcs, parent=roast, shade='toon', outline=True)
    # garnish round the bird: orange slices, baby potatoes, sprigs of green
    rng = random.Random(5)
    gar = []
    for (gx, gy) in ((-0.4, 0.26), (0.4, 0.27), (-0.42, -0.02), (0.42, 0.0), (0.38, -0.26), (-0.38, -0.27)):
        kind = rng.choice(('orange', 'potato', 'green'))
        if kind == 'orange':
            gar.append(sh.cyl(0.06, 0.022, bevel=0.008, segs=16, col='pumpkin').shade(lambda c, n: P.lin('butter') if (n.z > 0.5 and math.hypot(c.x, c.y) < 0.045) else P.lin('pumpkin')).rot(rng.uniform(10, 40), 0, rng.uniform(0, 90)).at(gx, gy, 0.07))
        elif kind == 'potato':
            gar.append(sh.ball(0.05, sub=2, col='crust', sx=1.2, sz=0.85).noise(0.006, 12, gx).at(gx, gy, 0.08))
            gar.append(sh.ball(0.042, sub=2, col='butter', sx=1.1, sz=0.85).at(gx + 0.07, gy - 0.05, 0.075))
        for k in range(3):
            gar.append(sh.ball(0.03, sub=1, col='herb' if k % 2 else 'green', sx=0.5, sy=1.6, sz=0.35).rot(0, 0, rng.uniform(0, 180)).at(gx + rng.uniform(-0.07, 0.07), gy + rng.uniform(-0.05, 0.05), 0.05))
    garnish = C.make('roast_garnish', gar, parent=roast, shade='toon', normals=False)

    # the bird: plump, breast up, tapering a little toward the far (neck) end
    body = sh.uvball(1.0, segs=36, rings=22)

    def shape(v):
        taper = 1 - 0.22 * max(0.0, v.y)
        breast = 1 + 0.16 * max(0.0, v.z) * (1 - abs(v.x) ** 2)
        p = Vector((v.x * RX * taper, v.y * RY, v.z * RZ * breast))
        if p.z < -RZ * 0.72:
            p.z = -RZ * 0.72
        # a soft groove down the breastbone
        p.z -= 0.012 * math.exp(-(v.x * 9) ** 2) * max(0.0, v.z)
        return p

    def skin(c, n):
        t = min(1.0, max(0.0, 0.25 + 0.75 * n.z))
        sp = noise.noise(c * 9.0) * 0.12
        return P.mix('crust', 'roast', min(1.0, max(0.0, t + sp)))
    body.bend(shape).shade(skin).at(0, 0.0, BZ)
    pcs = [body]
    frills = []
    for sx in (-1, 1):
        place = lambda s_: s_.scale(1.28).rot(46, 0, 0).rot(0, 0, 20 * sx).at(0.2 * sx, -0.25, 0.13)
        leg = sh.lathe([(0, 0), (0.085, 0.015), (0.1, 0.08), (0.075, 0.16), (0.04, 0.215), (0.03, 0.27), (0, 0.275)], segs=18, r=0.012).shade(lambda c, n: P.mix('roast', 'crust', min(1, c.z * 3.2)))
        pcs.append(place(leg))
        frills.append(place(sh.cyl(0.04, 0.045, bevel=0.012, segs=12, col='white').at(0, 0, 0.24)))
        for k in range(6):
            a = k * math.pi / 3
            frills.append(place(sh.ball(0.026, sub=1, col='white').at(math.cos(a) * 0.03, math.sin(a) * 0.03, 0.3)))
        frills.append(place(sh.ball(0.03, sub=2, col='white').at(0, 0, 0.315)))
        # wings tucked against the sides
        wing = sh.ball(0.5, sub=3, sx=0.11, sy=0.3, sz=0.13).shade(lambda c, n: P.mix('crust', 'roast', min(1.0, max(0.0, 0.3 + 0.7 * n.z))))
        pcs.append(wing.rot(0, 14 * sx, -10 * sx).at(0.3 * sx, 0.06, 0.2))
        pcs.append(sh.ball(0.05, sub=2, col='crust', sx=0.8, sy=1.3, sz=0.8).at(0.31 * sx, -0.1, 0.17))
    bm = C.make('roast_body', pcs, parent=roast, shade='toon', outline=True, normals=False)
    fr = C.make('roast_frills', frills, parent=roast, shade='toon', outline=True, normals=False)
    # the opening between the drumsticks, facing the player, and the stuffing that fills it
    cav = C.make('roast_cavity', sh.cyl(0.115, 0.012, bevel=0.004, segs=24, col='shadow').scale(1.15, 1, 1).rot(74, 0, 0), loc=(0, -RY * 0.9 + 0.0, BZ - 0.035), parent=roast, shade='toon', normals=False)
    stuffing = [sh.ball(0.13, sub=3, col='bread', sx=1.15, sy=0.75, sz=0.85).noise(0.02, 16, 5).shade(lambda c, n: P.mix('bread', 'toast', 0.5 + 0.5 * math.sin(c.x * 50) * math.cos(c.z * 44))).at(0, -0.03, 0)]
    for k in range(7):
        a = k * 0.9
        stuffing.append(sh.box(0.055, 0.055, 0.05, r=0.012, seg=2, col='toast').rot(20 * k, 15, 40 * k).at(math.cos(a) * 0.08, -0.1 - 0.02 * (k % 2), math.sin(a) * 0.06))
    for k in range(6):
        a = k * 1.1 + 0.4
        stuffing.append(sh.ball(0.014, sub=1, col='herb').at(math.cos(a) * 0.09, -0.125, math.sin(a) * 0.07))
    st = C.make('roast_stuffing', stuffing, loc=(0, -RY * 0.9, BZ - 0.035), parent=roast, shade='toon', outline=True, normals=False)
    objs += [roast, pan, garnish, bm, fr, cav, st]

    # carving: dashed lines across the breast, and the slices they give, fanned on a platter in front
    platter = C.make('roast_platter', sh.lathe([(0, 0), (0.12, 0), (0.2, 0.02), (0.195, 0.032), (0.11, 0.014), (0, 0.014)], segs=32).scale(1.7, 0.75, 1).shade(lambda c, n: P.lin('sage') if math.hypot(c.x / 1.7, c.y / 0.75) > 0.165 else P.lin('ceramic')),
                      loc=(0, -0.56, 0), parent=roast, shade='toon', outline=True, normals=False)
    objs.append(platter)
    for k in range(4):
        x = -0.165 + 0.11 * k
        dashes = [sh.box(0.014, 0.05, 0.014, r=0.005, col='cream').at(x, y, top_z(x, y) + 0.006) for y in (-0.1, -0.02, 0.06, 0.14)]
        objs.append(C.make('cut_%d' % k, [d.at(-x, 0, -top_z(x, 0.02)) for d in dashes], loc=(x, 0.0, top_z(x, 0.02)), parent=roast, shade='toon', normals=False))
        outline = [(0.11 * math.cos(a * math.pi / 8), 0.07 * math.sin(a * math.pi / 8)) for a in range(16)]
        sl = sh.prism(outline, 0.03, bevel=0.01, seg=2, col='cream').shade_face(lambda c, n: P.lin('crust') if abs(n.z) < 0.5 else P.mix('cream', 'butter', 0.35))
        objs.append(C.make('slice_%d' % k, sl.at(0, 0, 0.015), loc=(-0.2 + 0.135 * k, -0.56, 0.03 + 0.02 * k), rot=(0, -14, 8 - 6 * k), parent=roast, shade='toon', outline=True))
    objs.append(C.hit('hit_roast', (0, -0.08, 0.26), (1.2, 1.2, 0.66), parent=roast))

    # bowl of stuffing to scoop from
    bowl = C.make('rs_bowl', [
        sh.lathe([(0, 0), (0.12, 0), (0.19, 0.14), (0.18, 0.15), (0.165, 0.14), (0.11, 0.02), (0, 0.02)], segs=28).shade(lambda c, n: P.lin('teal') if n.dot(Vector((c.x, c.y, 0))) > 0 else P.lin('ceramic')),
        sh.ball(0.16, sub=3, col='bread', sz=0.42).noise(0.02, 16, 3).shade(lambda c, n: P.mix('bread', 'toast', 0.5 + 0.5 * math.sin(c.x * 60) * math.cos(c.y * 50))).at(0, 0, 0.12),
    ], loc=(-0.66, 0.34, 0), parent=root, shade='toon', outline=True, normals=False)
    objs += [bowl, C.hit('hit_rsbowl', (0, 0, 0.12), (0.56, 0.52, 0.44), parent=bowl)]
    # juices and the baster (origin at its middle, tip down -Z)
    juice = C.make('juice_bowl', [
        sh.lathe([(0, 0), (0.09, 0), (0.13, 0.09), (0.12, 0.1), (0.11, 0.09), (0.08, 0.016), (0, 0.016)], segs=24, col='steel'),
        sh.cyl(0.105, 0.012, bevel=0.003, segs=20, col='juice').at(0, 0, 0.07),
    ], loc=(0.84, -0.1, 0), parent=root, shade='toon', outline=True, normals=False)
    baster = C.empty('baster', loc=(0.84, -0.1, 0.26), parent=root)
    bulb = C.make('baster_bulb', sh.ball(0.062, sub=3, col='cranberry', sz=1.25).at(0, 0, 0.11), parent=baster, shade='toon', outline=True, normals=False)
    tube = C.make('baster_tube', sh.lathe([(0, -0.18), (0.01, -0.18), (0.024, -0.1), (0.026, 0.05), (0, 0.05)], segs=12, col='white'), parent=baster, shade='toon', outline=True, normals=False)
    objs += [juice, baster, bulb, tube, C.hit('hit_baster', (0, 0, -0.02), (0.44, 0.42, 0.66), parent=baster)]

    C.station_frame(objs, root, 'roast', target=(-0.02, -0.06, 0.24), fit=(2.5, 1.6), gobbles=(-1.05, -0.2))
    C.bake_each(objs, static=[pan])
    C.export_glb(os.path.join(out, 'roast.glb'), objs)
    if preview:
        C.render_preview(os.path.join(out, 'preview', 'roast.png'), target=(0, -0.1, 0.2), dist=2.4, yaw=0, pitch=36)
