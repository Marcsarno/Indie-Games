"""Cranberry Sauce station: can with lid and opener, the ribbed jelly log, serving dish.
Station space: origin on the counter top."""
import math
import os
from mathutils import Vector
from lib import shapes as sh, common as C, palette as P

CAN_R, CAN_H = 0.108, 0.30
LOG_R, LOG_H = 0.097, 0.265


def ribbed(r, h, ribs, depth, cap=0.014):
    """Profile of a can-shaped solid with grooves, standing on z=0."""
    prof = [(0, 0), (r - cap, 0), (r, cap)]
    for z0 in ribs:
        prof += [(r, z0 - 0.016), (r - depth, z0 - 0.006), (r - depth, z0 + 0.006), (r, z0 + 0.016)]
    prof += [(r, h - cap), (r - cap, h), (0, h)]
    return prof


def build(out, preview):
    root = C.empty('station_cranberry')
    objs = [root]

    # oval serving dish
    def dish_col(co, no):
        rad = math.hypot(co.x / 1.3, co.y)
        return P.lin('sage') if rad > 0.2 else P.lin('ceramic')
    plate = C.make('cran_plate', sh.lathe([(0, 0), (0.15, 0), (0.25, 0.03), (0.245, 0.045), (0.14, 0.018), (0, 0.016)], segs=40, r=0.008).scale(1.3, 1, 1).shade(dish_col),
                   loc=(0.14, -0.04, 0), parent=root, shade='toon', outline=True, normals=False)
    objs.append(plate)
    objs.append(C.empty('socket_log', loc=(0.14, -0.04, 0.017), parent=root))

    # can: hollow, open at the top once the lid is off
    can = C.empty('can', loc=(-0.38, 0.0, 0), parent=root)
    wall = 0.008
    outer = [(0, 0), (CAN_R - 0.008, 0), (CAN_R, 0.008), (CAN_R, 0.03)]
    for z0 in (0.085, 0.15, 0.215):
        outer += [(CAN_R, z0 - 0.014), (CAN_R - 0.006, z0 - 0.005), (CAN_R - 0.006, z0 + 0.005), (CAN_R, z0 + 0.014)]
    outer += [(CAN_R, CAN_H - 0.012), (CAN_R + 0.004, CAN_H - 0.006), (CAN_R + 0.004, CAN_H), (CAN_R - wall, CAN_H), (CAN_R - wall, 0.012), (0, 0.012)]

    def can_col(co, no):
        rad = math.hypot(co.x, co.y)
        outward = no.dot(Vector((co.x, co.y, 0)).normalized()) if rad > 1e-5 else 0.0
        if outward > 0.3 and 0.04 < co.z < CAN_H - 0.04:
            if 0.115 < co.z < 0.185:
                return P.lin('cream')
            return P.lin('cranberry')
        return P.lin('steel')
    can_mesh = C.make('can_mesh', sh.lathe(outer, segs=36).shade(can_col), parent=can, shade='toon', outline=True, normals=False)
    # a cranberry dot on the label, facing the player
    dots = [sh.ball(0.026, sub=2, col='jelly', sy=0.3).at(dx, -CAN_R - 0.001, 0.15) for dx in (-0.03, 0.03)]
    dots.append(sh.ball(0.02, sub=2, col='green', sx=1.4, sy=0.3, sz=0.6).at(0.0, -CAN_R - 0.002, 0.178))
    can_logo = C.make('can_logo', dots, parent=can, shade='toon', normals=False)
    objs += [can, can_mesh, can_logo]
    objs.append(C.hit('hit_can', (0, 0, CAN_H / 2), (CAN_R * 3.4, CAN_R * 3.4, CAN_H * 1.5), parent=can))

    lid = C.make('can_lid', sh.lathe([(0, 0), (CAN_R - 0.012, 0), (CAN_R - 0.009, 0.004), (CAN_R - 0.012, 0.008), (0.03, 0.008), (0.025, 0.004), (0, 0.004)], segs=36, col='steel'),
                 loc=(0, 0, CAN_H - 0.012), parent=can, shade='toon', outline=True, normals=False)
    objs.append(lid)

    # opener: origin on the can axis so turning it about Z walks it round the rim
    opener = C.empty('opener', loc=(0, 0, CAN_H), parent=can)
    op_mesh = C.make('opener_mesh', [
        sh.box(0.085, 0.07, 0.06, r=0.016, col='teal').at(CAN_R + 0.005, 0, 0.022),
        sh.box(0.2, 0.034, 0.034, r=0.015, col='cranberry').at(CAN_R + 0.13, 0.026, 0.03),
        sh.box(0.2, 0.034, 0.034, r=0.015, col='cranberry').at(CAN_R + 0.13, -0.026, 0.012),
        sh.cyl(0.02, 0.03, bevel=0.005, segs=14, col='steel').at(CAN_R + 0.005, 0, 0.05),
    ], parent=opener, shade='toon', outline=True)
    knob = C.make('opener_knob', [
        sh.box(0.15, 0.04, 0.026, r=0.012, col='butter').at(0, 0, 0.013),
        sh.ball(0.028, sub=2, col='butter').at(0.075, 0, 0.013),
        sh.ball(0.028, sub=2, col='butter').at(-0.075, 0, 0.013),
    ], loc=(CAN_R + 0.005, 0, 0.08), parent=opener, shade='toon', outline=True)
    objs += [opener, op_mesh, knob]
    objs.append(C.hit('hit_opener', (CAN_R * 0.5, 0, 0.06), (0.6, 0.5, 0.34), parent=opener))

    # the jelly log, ribbed like the can, starts inside it
    def log_col(co, no):
        t = co.z / LOG_H
        return P.mix('jelly_dark', 'jelly', 0.35 + 0.65 * min(1.0, t * 1.4))
    log = C.make('food_log', sh.lathe(ribbed(LOG_R, LOG_H, (0.075, 0.1325, 0.19), 0.007), segs=36, r=0.004).shade(log_col),
                 loc=(0, 0, 0.014), parent=can, shade='toon', outline=True, normals=False, props={'height': LOG_H})
    objs.append(log)
    objs.append(C.hit('hit_log', (0, 0, LOG_H / 2), (LOG_R * 3.6, LOG_R * 3.6, LOG_H * 1.6), parent=log))

    objs.append(C.empty('cam_cranberry_target', loc=(-0.1, 0.06, 0.22), parent=root))
    objs.append(C.empty('cam_cranberry', loc=(-0.1 - 0.6, 0.06 - 1.9, 0.22 + 1.45), parent=root, props={'fit_w': 2.25, 'fit_h': 1.4}))
    objs.append(C.empty('socket_gobbles', loc=(-0.66, 0.36, 0), parent=root))
    objs.append(C.empty('socket_bell', loc=(0.56, -0.34, 0), parent=root))
    objs.append(C.empty('socket_lid_rest', loc=(-0.3, 0.46, 0.006), parent=root))
    objs.append(C.empty('socket_can_rest', loc=(0.62, 0.38, CAN_R), parent=root))
    objs.append(C.empty('socket_opener_rest', loc=(-0.6, -0.36, 0.0), parent=root))

    C.bake_ao([plate], floor_z=0.0, dist=0.3, strength=0.9)
    C.bake_ao([can_mesh, can_logo], occluders=[can_mesh], floor_z=0.0, dist=0.25, strength=0.8)
    for o in (lid, op_mesh, knob, log):
        C.bake_ao([o], dist=0.1, strength=0.6)

    C.export_glb(os.path.join(out, 'cranberry.glb'), objs)
    if preview:
        C.render_preview(os.path.join(out, 'preview', 'cranberry.png'), target=(-0.1, 0, 0.15), dist=1.8, yaw=0, pitch=35)
        log.parent = root
        log.location = (0.14, -0.04, 0.017)
        C.render_preview(os.path.join(out, 'preview', 'cranberry_log.png'), target=(0.0, 0, 0.15), dist=1.8, yaw=10, pitch=30)
