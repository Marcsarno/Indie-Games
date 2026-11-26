"""The finale: Gobbles' Pumpkin Roast. A big stuffed pumpkin in a roasting pan with two butternut
"drumsticks" in paper frills, so it sits on the table like the bird everyone expects (and Gobbles relaxes).
Plus a bowl of stuffing, a baster in a bowl of juices, cut lines and four slices.
Station space: origin on the counter top."""
import math
import os
from mathutils import Vector
from lib import shapes as sh, common as C, palette as P

CUT = 0.19       # height (above the body centre) where the top is opened
BODY_Z = 0.25


def build(out, preview):
    root = C.empty('station_roast')
    objs = [root]
    roast = C.empty('roast', loc=(0.06, 0.02, 0), parent=root)
    pan = C.make('roast_pan', [
        sh.box(0.9, 0.62, 0.03, r=0.012, seg=2, col='steel_dark').at(0, 0, 0.015),
        sh.box(0.9, 0.04, 0.1, r=0.018, seg=2, col='steel_dark').at(0, 0.29, 0.05), sh.box(0.9, 0.04, 0.1, r=0.018, seg=2, col='steel_dark').at(0, -0.29, 0.05),
        sh.box(0.04, 0.62, 0.1, r=0.018, seg=2, col='steel_dark').at(0.43, 0, 0.05), sh.box(0.04, 0.62, 0.1, r=0.018, seg=2, col='steel_dark').at(-0.43, 0, 0.05),
        sh.tube([(0.45, -0.12, 0.09), (0.52, -0.12, 0.1), (0.52, 0.12, 0.1), (0.45, 0.12, 0.09)], r=0.018, col='steel', segs=8),
        sh.tube([(-0.45, -0.12, 0.09), (-0.52, -0.12, 0.1), (-0.52, 0.12, 0.1), (-0.45, 0.12, 0.09)], r=0.018, col='steel', segs=8),
        sh.box(0.8, 0.52, 0.012, r=0.004, col='juice').at(0, 0, 0.034),
    ], parent=roast, shade='toon', outline=True)
    # pumpkin body, ribbed, with the top opened flat
    body = sh.uvball(1.0, segs=32, rings=18)
    def shape(v):
        a = math.atan2(v.y, v.x)
        k = 1 + 0.045 * math.cos(a * 9)
        p = Vector((v.x * 0.29 * k, v.y * 0.25 * k, v.z * 0.215))
        if p.z > CUT:
            p = Vector((p.x * 0.9, p.y * 0.9, CUT))
        return p
    body.bend(shape).shade(lambda c, n: P.mix('pumpkin', 'roast', 0.5 + 0.5 * math.cos(math.atan2(c.y / 0.25, c.x / 0.29) * 9))).at(0, 0.03, BODY_Z)
    # butternut drumsticks at the front, pointing up and toward the player, each with a paper frill
    pcs = [body]
    frills = []
    for sx in (-1, 1):
        place = lambda s_: s_.scale(1.25).rot(38, 0, 0).rot(0, 0, 30 * sx).at(0.33 * sx, -0.12, 0.1)
        leg = sh.lathe([(0, 0), (0.075, 0.02), (0.09, 0.09), (0.062, 0.17), (0.036, 0.22), (0.03, 0.27), (0, 0.275)], segs=16, r=0.01).shade(lambda c, n: P.mix('crust', 'butter', min(1, c.z * 4)))
        pcs.append(place(leg))
        frills.append(place(sh.cyl(0.042, 0.05, bevel=0.012, segs=12, col='white').at(0, 0, 0.235)))
        frills.append(place(sh.ball(0.048, sub=2, col='white').noise(0.008, 30, sx).at(0, 0, 0.305)))
    bm = C.make('roast_body', pcs, parent=roast, shade='toon', outline=True, normals=False)
    fr = C.make('roast_frills', frills, parent=roast, shade='toon', outline=True, normals=False)
    cav = C.make('roast_cavity', sh.cyl(0.19, 0.01, bevel=0.003, segs=24, col='shadow').scale(1.1, 0.95, 1), loc=(0, 0.03, BODY_Z + CUT - 0.004), parent=roast, shade='toon', normals=False)
    stuffing = [sh.ball(0.17, sub=3, col='bread', sx=1.1, sy=0.95, sz=0.5).noise(0.02, 14, 5).shade(lambda c, n: P.mix('bread', 'toast', 0.5 + 0.5 * math.sin(c.x * 50) * math.cos(c.y * 44)))]
    for k in range(7):
        a = k * 0.9
        stuffing.append(sh.box(0.06, 0.06, 0.05, r=0.012, seg=2, col='toast').rot(20 * k, 15, 40 * k).at(math.cos(a) * 0.09, math.sin(a) * 0.08, 0.06))
    for k in range(6):
        a = k * 1.1 + 0.4
        stuffing.append(sh.ball(0.014, sub=1, col='herb').at(math.cos(a) * 0.11, math.sin(a) * 0.1, 0.07))
    st = C.make('roast_stuffing', stuffing, loc=(0, 0.03, BODY_Z + CUT), parent=roast, shade='toon', outline=True, normals=False)
    objs += [roast, pan, bm, fr, cav, st]
    # cut lines on the front of the pumpkin and the slices they give
    for k in range(4):
        x = -0.17 + 0.113 * k
        yfront = -0.25 * math.sqrt(max(0.05, 1 - (x / 0.29) ** 2)) + 0.03
        dashes = [sh.box(0.012, 0.012, 0.035, r=0.004, col='ink').at(0, -0.01 * (1 - abs(j - 1.5) / 1.5) * 4, -0.09 + 0.06 * j) for j in range(4)]
        objs.append(C.make('cut_%d' % k, dashes, loc=(x, yfront - 0.012, BODY_Z + 0.03), parent=roast, shade='toon', normals=False))
        # a slice lies flat in the front of the pan, rind toward the player
        outline = [(0.0, 0.0)] + [(0.17 * math.sin(math.radians(a)), -0.17 * math.cos(math.radians(a))) for a in range(-56, 57, 14)]
        sl = sh.prism(outline, 0.05, bevel=0.012, seg=2, col='butter').shade_face(lambda c, n: P.lin('roast') if (math.hypot(c.x, c.y) > 0.15 and abs(n.z) < 0.6) else P.lin('butter'))
        objs.append(C.make('slice_%d' % k, sl.at(0, 0, 0.025), loc=(-0.25 + 0.165 * k, -0.07, 0.04 + 0.012 * k), rot=(0, 0, 12 - 8 * k), parent=roast, shade='toon', outline=True))
    objs.append(C.hit('hit_roast', (0, 0, 0.26), (1.05, 0.8, 0.62), parent=roast))

    # bowl of stuffing to scoop from
    bowl = C.make('rs_bowl', [
        sh.lathe([(0, 0), (0.12, 0), (0.19, 0.14), (0.18, 0.15), (0.165, 0.14), (0.11, 0.02), (0, 0.02)], segs=28).shade(lambda c, n: P.lin('teal') if n.dot(Vector((c.x, c.y, 0))) > 0 else P.lin('ceramic')),
        sh.ball(0.16, sub=3, col='bread', sz=0.42).noise(0.02, 16, 3).shade(lambda c, n: P.mix('bread', 'toast', 0.5 + 0.5 * math.sin(c.x * 60) * math.cos(c.y * 50))).at(0, 0, 0.12),
    ], loc=(-0.74, 0.12, 0), parent=root, shade='toon', outline=True, normals=False)
    objs += [bowl, C.hit('hit_rsbowl', (0, 0, 0.12), (0.56, 0.52, 0.44), parent=bowl)]
    # juices and the baster (origin at its middle, tip down -Z)
    juice = C.make('juice_bowl', [
        sh.lathe([(0, 0), (0.09, 0), (0.13, 0.09), (0.12, 0.1), (0.11, 0.09), (0.08, 0.016), (0, 0.016)], segs=24, col='steel'),
        sh.cyl(0.105, 0.012, bevel=0.003, segs=20, col='juice').at(0, 0, 0.07),
    ], loc=(0.82, -0.22, 0), parent=root, shade='toon', outline=True, normals=False)
    baster = C.empty('baster', loc=(0.82, -0.22, 0.26), parent=root)
    bulb = C.make('baster_bulb', sh.ball(0.062, sub=3, col='butter', sz=1.25).at(0, 0, 0.11), parent=baster, shade='toon', outline=True, normals=False)
    tube = C.make('baster_tube', sh.lathe([(0, -0.18), (0.01, -0.18), (0.024, -0.1), (0.026, 0.05), (0, 0.05)], segs=12, col='white'), parent=baster, shade='toon', outline=True, normals=False)
    objs += [juice, baster, bulb, tube, C.hit('hit_baster', (0, 0, -0.02), (0.44, 0.42, 0.66), parent=baster)]

    C.station_frame(objs, root, 'roast', target=(-0.02, 0.06, 0.26), fit=(2.4, 1.5), gobbles=(-0.86, 0.44))
    C.bake_each(objs, static=[pan])
    C.export_glb(os.path.join(out, 'roast.glb'), objs)
    if preview:
        C.render_preview(os.path.join(out, 'preview', 'roast.png'), target=(0, 0, 0.2), dist=2.2, yaw=0, pitch=38)
