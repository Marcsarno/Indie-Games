"""Sweet Potatoes: a pot of orange mash with a scoop, a casserole dish that fills up, a bag of marshmallows
and twelve marshmallows that toast golden. Station space: origin on the counter top."""
import math
import os
from mathutils import Vector
from lib import shapes as sh, common as C, palette as P

MARSH = 12


def build(out, preview):
    root = C.empty('station_sweet')
    objs = [root]
    # pot of mash
    pot = C.empty('sw_pot', loc=(-0.5, 0.1, 0), parent=root)
    pm = C.make('sw_pot_mesh', [
        sh.lathe([(0, 0), (0.2, 0), (0.22, 0.03), (0.22, 0.22), (0.205, 0.22), (0.2, 0.04), (0, 0.03)], segs=32, col='teal', r=0.01),
        sh.tube([(0.2, 0, 0.17), (0.3, 0, 0.17)], r=0.022, col='ink', segs=8),
        sh.torus(0.221, 0.012, segs=32, rsegs=6, col='cream').at(0, 0, 0.215),                         # enamel rim
        sh.tube([(-0.2, 0, 0.17), (-0.3, 0, 0.17)], r=0.022, col='ink', segs=8),
    ], parent=pot, shade='toon', outline=True, normals=False)
    mash = C.make('sw_pot_mash', sh.ball(0.2, sub=3, col='sweet', sz=0.3).noise(0.012, 9, 4).shade(lambda c, n: P.mix('sweet_dark', 'sweet', 0.4 + 3 * max(0, c.z))), loc=(0, 0, 0.2), parent=pot, shade='toon', normals=False)
    objs += [pot, pm, mash, C.hit('hit_pot', (0, 0, 0.16), (0.72, 0.6, 0.5), parent=pot)]
    # scoop: origin at the grip, cup hangs down -Z
    scoop = C.make('scoop', [
        sh.capsule(0.03, 0.2, col='cranberry').at(0, 0, 0.0),
        sh.tube([(0, 0, 0.0), (0, 0, -0.1)], r=0.012, col='steel', segs=8),
        sh.lathe([(0, -0.19), (0.05, -0.17), (0.07, -0.13), (0.07, -0.1), (0.06, -0.1), (0.055, -0.13), (0, -0.165)], segs=16, col='steel'),
    ], loc=(-0.38, 0.2, 0.42), rot=(0, 20, 0), parent=root, shade='toon', outline=True, normals=False)
    objs.append(scoop)

    # casserole: the mash layer scales up from the bottom
    cas = C.empty('casserole', loc=(0.28, 0.04, 0), parent=root)

    def ccol(c, n):
        return P.lin('cranberry') if (abs(n.z) < 0.5 and c.z < 0.125 and (abs(c.x) > 0.3 or abs(c.y) > 0.21)) else P.lin('ceramic')
    cm = C.make('casserole_mesh', [
        sh.box(0.66, 0.48, 0.03, r=0.012, seg=2, col='ceramic').at(0, 0, 0.015),
        sh.box(0.66, 0.035, 0.13, r=0.016, seg=2, col='cranberry').at(0, 0.2225, 0.065),
        sh.box(0.66, 0.035, 0.13, r=0.016, seg=2, col='cranberry').at(0, -0.2225, 0.065),
        sh.box(0.035, 0.48, 0.13, r=0.016, seg=2, col='cranberry').at(0.3125, 0, 0.065),
        sh.box(0.035, 0.48, 0.13, r=0.016, seg=2, col='cranberry').at(-0.3125, 0, 0.065),
        sh.box(0.1, 0.2, 0.03, r=0.012, col='cranberry').at(0.37, 0, 0.11),
        sh.box(0.1, 0.2, 0.03, r=0.012, col='cranberry').at(-0.37, 0, 0.11),
        *[sh.ball(0.02, sub=1, col='cream', sy=0.3).at(x, -0.24, 0.07) for x in (-0.2, -0.1, 0.0, 0.1, 0.2)],   # dots along the front
    ], parent=cas, shade='toon', outline=True)
    fill = C.make('sw_fill', sh.box(0.59, 0.41, 0.09, r=0.02, seg=3, cell=0.1, col='sweet').noise(0.006, 12, 2).shade(lambda c, n: P.mix('sweet_dark', 'sweet', 0.6 + 4 * c.z)).at(0, 0, 0.045), loc=(0, 0, 0.03), parent=cas, shade='toon', normals=False)
    objs += [cas, cm, fill]
    for k in range(MARSH):
        col, row = k % 4, k // 4
        m = sh.cyl(0.05, 0.062, bevel=0.018, segs=14, col='marsh')
        objs.append(C.make('marsh_%d' % k, m, loc=(-0.2 + 0.133 * col + 0.012 * math.sin(k * 3.3), -0.125 + 0.125 * row + 0.01 * math.cos(k * 2.1), 0.118), rot=(0, 0, k * 37), parent=cas, shade='toon', outline=True))
    objs.append(C.hit('hit_casserole', (0, 0, 0.12), (0.95, 0.72, 0.42), parent=cas))

    bag = C.make('marsh_bag', [
        sh.box(0.26, 0.14, 0.28, r=0.05, seg=3, col='teal').shade_face(lambda c, n: P.lin('cream') if 0.08 < c.z < 0.2 and abs(n.z) < 0.5 else P.lin('teal')).at(0, 0, 0.14),
        sh.cyl(0.05, 0.06, bevel=0.018, segs=14, col='marsh').rot(20, 10, 0).at(-0.05, 0, 0.27),
        sh.cyl(0.05, 0.06, bevel=0.018, segs=14, col='marsh').rot(-15, -20, 0).at(0.06, 0.01, 0.275),
        sh.cyl(0.042, 0.016, bevel=0.006, segs=14, col='marsh').rot(90, 0, 0).at(0, -0.066, 0.14),    # the picture on the label
        sh.box(0.27, 0.15, 0.022, r=0.008, seg=1, col='cranberry').at(0, 0, 0.245),                    # the tie round the top
    ], loc=(-0.02, -0.4, 0), parent=root, shade='toon', outline=True)
    objs += [bag, C.hit('hit_bag', (0, 0, 0.17), (0.46, 0.36, 0.5), parent=bag)]

    C.station_frame(objs, root, 'sweet')
    C.bake_each(objs, static=[cm, pm])
    C.export_glb(os.path.join(out, 'sweet.glb'), objs)
    if preview:
        C.render_preview(os.path.join(out, 'preview', 'sweet.png'), target=(0, 0, 0.1), dist=2.0, yaw=0, pitch=40)
