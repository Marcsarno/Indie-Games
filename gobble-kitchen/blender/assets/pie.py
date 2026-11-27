"""Pumpkin Pie: dough that rolls flat (shape key), a rolling pin, the pie tin with its crust, filling,
twelve crimps, whipped-cream dollops and a leaf, a bowl of filling and a can of cream.
Station space: origin on the counter top."""
import math
import os
from mathutils import Vector
from lib import shapes as sh, common as C, palette as P

CRIMPS, DOLLOPS = 12, 8


def flute(s, n=12, amp=0.03):
    """Push the rim in and out so the tin and crust read as fluted (bulges line up with the crimps)."""
    for v in s.bm.verts:
        r = math.hypot(v.co.x, v.co.y)
        if r > 0.2:
            k = 1 + amp * math.cos(math.atan2(v.co.y, v.co.x) * n) * min(1.0, (r - 0.2) / 0.05)
            v.co.x *= k
            v.co.y *= k
    return s


def build(out, preview):
    root = C.empty('station_pie')
    objs = [root]
    board = C.make('pie_board', [
        sh.box(0.06, 0.5640000000000001, 0.042, r=0.018, seg=3, col='wood').at(0.35, 0, 0.021),
        sh.box(0.06, 0.5640000000000001, 0.042, r=0.018, seg=3, col='wood').at(-0.35, 0, 0.021),
        sh.box(0.76, 0.56, 0.04, r=0.018, seg=3, cell=0.12, col=P.mix('wood_light', 'cream', 0.5)).at(0, 0, 0.02),
        sh.ball(0.3, sub=3, col='white', sx=1.0, sy=0.75, sz=0.012).noise(0.02, 6, 2).at(0, 0, 0.041),
    ], loc=(-0.44, 0.0, 0), parent=root)
    objs.append(board)
    # dough: ball -> flat disc (the 'Flat' shape key is added after AO)
    dough_s = sh.uvball(1.0, segs=28, rings=14, col='dough')
    units = [v.co.copy() for v in dough_s.bm.verts]
    for v, u in zip(dough_s.bm.verts, units):
        v.co = Vector((u.x * 0.135, u.y * 0.135, 0.105 + u.z * 0.105))
    dough = C.make('dough', dough_s, loc=(-0.44, 0.0, 0.04), parent=root, shade='toon', outline=True, normals=False)
    objs += [dough, C.hit('hit_dough', (-0.44, 0.0, 0.14), (0.86, 0.7, 0.4), parent=root)]
    # rolling pin: origin at its middle, lying along X
    pin = C.make('pin', [
        sh.cyl(0.045, 0.4, bevel=0.012, segs=18, col='wood').rot(0, 90, 0).at(-0.2, 0, 0),
        sh.cyl(0.02, 0.62, bevel=0.008, segs=10, col='wood_dark').rot(0, 90, 0).at(-0.31, 0, 0),
        sh.ball(0.03, sub=2, col='cranberry').at(0.31, 0, 0), sh.ball(0.03, sub=2, col='cranberry').at(-0.31, 0, 0),
        sh.cyl(0.0465, 0.03, bevel=0.006, segs=18, col='wood_dark').rot(0, 90, 0).at(0.155, 0, 0),
        sh.cyl(0.0465, 0.03, bevel=0.006, segs=18, col='wood_dark').rot(0, 90, 0).at(-0.185, 0, 0),
    ], loc=(-0.44, 0.37, 0.05), parent=root, shade='toon', outline=True)
    objs.append(pin)

    # the pie
    pie = C.empty('pie', loc=(0.34, 0.0, 0), parent=root)
    tin = C.make('pie_tin', flute(sh.lathe([(0, 0), (0.17, 0), (0.262, 0.07), (0.292, 0.07), (0.292, 0.079), (0.25, 0.079), (0.165, 0.012), (0, 0.012)], segs=48, col='steel')), parent=pie, shade='toon', outline=True, normals=False)
    crust = C.make('pie_crust', flute(sh.lathe([(0, 0.013), (0.165, 0.013), (0.252, 0.08), (0.282, 0.084), (0.278, 0.097), (0.24, 0.09), (0.16, 0.03), (0, 0.03)], segs=48, col='dough')), parent=pie, shade='toon', normals=False)
    fill = C.make('pie_fill', sh.lathe([(0, 0), (0.238, 0), (0.243, 0.03), (0.2, 0.045), (0, 0.05)], segs=40, col='pie_fill').shade(lambda c, n: P.mix('pie_fill', 'pumpkin', min(1, math.hypot(c.x, c.y) * 4))),
                  loc=(0, 0, 0.03), parent=pie, shade='toon', normals=False)
    objs += [pie, tin, crust, fill]
    for k in range(CRIMPS):
        a = 2 * math.pi * k / CRIMPS
        nub = sh.ball(0.032, sub=2, col='dough', sx=1.15, sy=0.7, sz=0.62).rot(0, 0, math.degrees(a) + 90)
        objs.append(C.make('crimp_%d' % k, nub, loc=(math.sin(a) * 0.272, -math.cos(a) * 0.272, 0.096), parent=pie, shade='toon', normals=False))
    for k in range(DOLLOPS):
        a = k * 0.92
        r = 0.175 - 0.02 * k
        d = sh.lathe([(0, 0), (0.05, 0.004), (0.047, 0.028), (0.022, 0.055), (0.008, 0.075), (0, 0.082)], segs=14, col='white', r=0.006)
        objs.append(C.make('dollop_%d' % k, d, loc=(math.sin(a) * r, -math.cos(a) * r, 0.074), rot=(0, 0, k * 50), parent=pie, shade='toon', outline=True, normals=False))
    leaf = sh.prism([(0, -0.07), (0.035, -0.03), (0.05, 0.02), (0.02, 0.03), (0, 0.075), (-0.02, 0.03), (-0.05, 0.02), (-0.035, -0.03)], 0.018, bevel=0.006, seg=1, col='toast')
    objs.append(C.make('pie_leaf', leaf, loc=(0.0, -0.005, 0.165), rot=(0, 0, 25), parent=pie, shade='toon', outline=True))
    objs.append(C.hit('hit_pie', (0, 0, 0.1), (0.86, 0.86, 0.42), parent=pie))

    # bowl of filling: origin at the bottom centre
    fb = C.make('fill_bowl', [
        sh.lathe([(0, 0), (0.11, 0), (0.16, 0.13), (0.15, 0.14), (0.14, 0.13), (0.1, 0.02), (0, 0.02)], segs=28).shade(lambda c, n: P.lin('butter') if n.dot(Vector((c.x, c.y, 0))) > 0 else P.lin('ceramic')),
        sh.ball(0.135, sub=2, col='pie_fill', sz=0.18).at(0, 0, 0.105),
    ], loc=(0.76, 0.36, 0), parent=root, shade='toon', outline=True, normals=False)
    objs += [fb, C.hit('hit_fillbowl', (0, 0, 0.09), (0.5, 0.46, 0.42), parent=fb)]
    # whipped cream can: origin at its middle
    can = C.make('cream_can', [
        sh.cyl(0.055, 0.2, bevel=0.014, segs=18, col='white').shade(lambda c, n: P.lin('cranberry') if 0.05 < c.z < 0.09 else P.lin('white')).at(0, 0, -0.1),
        sh.lathe([(0, 0.1), (0.05, 0.1), (0.04, 0.13), (0.02, 0.15), (0.012, 0.19), (0, 0.19)], segs=14, col='cranberry', r=0.004),
    ], loc=(0.8, -0.26, 0.1), parent=root, shade='toon', outline=True, normals=False)
    objs += [can, C.hit('hit_cream', (0, 0, 0.02), (0.36, 0.36, 0.5), parent=can)]

    C.station_frame(objs, root, 'pie')
    C.bake_each(objs, static=[board, tin])
    dough.shape_key_add(name='Basis')
    kb = dough.shape_key_add(name='Flat')
    for i, u in enumerate(units):
        kb.data[i].co = Vector((u.x * 0.262, u.y * 0.262, 0.018 + u.z * 0.016))
    C.export_glb(os.path.join(out, 'pie.glb'), objs)
    if preview:
        C.render_preview(os.path.join(out, 'preview', 'pie.png'), target=(0, 0, 0.1), dist=2.0, yaw=0, pitch=40)
