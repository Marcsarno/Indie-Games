"""The toy kitchen and the dining room beside it (side by side so the whole set fits a landscape screen).
World space: x right, y away from the player, z up. Kitchen x -5.6..0.9, dining x 1.1..5.6, depth y -2.4..2.8."""
import math
import os
from mathutils import Vector
from lib import shapes as sh, common as C, palette as P

KX0, KX1 = -5.6, 0.9
DX0, DX1 = 1.1, 5.6
Y0, Y1 = -2.4, 2.8
WH = 3.0
TOP = 0.98            # island top
TABLE = 0.80          # table top
IS_X, IS_Y = -2.3, -0.2
T_X, T_Y = 3.35, 0.25


def wall_cols(upper, lower, split=1.0):
    return lambda c, n: P.lin(lower) if c.z < split else P.lin(upper)


def chair(x, y, rot=0.0, booster=False):
    """Chair facing -Y before rotation (the sitter looks toward the table)."""
    pcs = [sh.box(0.48, 0.46, 0.06, r=0.02, col='wood_dark').at(0, 0, 0.42),
           sh.box(0.42, 0.4, 0.05, r=0.02, col='cranberry').at(0, 0, 0.465)]
    for sx in (-1, 1):
        for sy in (-1, 1):
            pcs.append(sh.box(0.06, 0.06, 0.42, r=0.015, col='wood_dark').at(0.2 * sx, 0.19 * sy, 0.21))
        pcs.append(sh.box(0.06, 0.06, 0.62, r=0.015, col='wood_dark').at(0.2 * sx, 0.2, 0.75))
    pcs.append(sh.box(0.46, 0.05, 0.3, r=0.022, col='wood').at(0, 0.2, 0.92))
    if booster:
        pcs.append(sh.box(0.36, 0.34, 0.2, r=0.04, col='teal').at(0, 0, 0.59))
    return [p.rot(0, 0, rot).at(x, y, 0) for p in pcs]


def build(out, preview):
    objs = []
    room, furn = [], []

    # ------------------------------------------------------------------ slab, floors, walls
    room.append(sh.box(12.0, 6.0, 0.3, r=0.08, seg=3, col='cinnamon').at(0, 0.2, -0.152))
    room.append(sh.grid(KX1 - KX0, Y1 - Y0, cell=0.25).at((KX0 + KX1) / 2, (Y0 + Y1) / 2, 0).shade_face(
        lambda c, n: P.lin('tile_a') if (math.floor((c.x + 20) / 0.5) + math.floor((c.y + 20) / 0.5)) % 2 == 0 else P.lin('tile_b')))
    room.append(sh.grid(DX1 - 0.9, Y1 - Y0, cell=0.25).at((0.9 + DX1) / 2, (Y0 + Y1) / 2, 0).shade_face(
        lambda c, n: P.mix('wood', 'wood_light', 0.25 + 0.5 * ((math.floor((c.y + 20) / 0.25) * 7) % 3) / 2)))
    # walls: back, left, right
    room.append(sh.box(KX1 - KX0 + 0.4, 0.2, WH, r=0.03, cell=0.25).at((KX0 + KX1) / 2, Y1 + 0.1, WH / 2).shade_face(wall_cols('wall', 'sage')))
    room.append(sh.box(DX1 - DX0 + 0.2, 0.2, WH, r=0.03, cell=0.25).at((DX0 + DX1) / 2 + 0.1, Y1 + 0.1, WH / 2).shade_face(wall_cols('wall_dining', 'green')))
    room.append(sh.box(0.2, Y1 - Y0, WH, r=0.03, cell=0.25).at(KX0 - 0.1, (Y0 + Y1) / 2, WH / 2).shade_face(wall_cols('wall', 'sage')))
    room.append(sh.box(0.2, Y1 - Y0, WH, r=0.03, cell=0.25).at(DX1 + 0.1, (Y0 + Y1) / 2, WH / 2).shade_face(wall_cols('wall_dining', 'green')))
    # chair rails
    room.append(sh.box(KX1 - KX0, 0.05, 0.07, r=0.02, col='cream').at((KX0 + KX1) / 2, Y1 - 0.02, 1.0))
    room.append(sh.box(DX1 - DX0, 0.05, 0.07, r=0.02, col='cream').at((DX0 + DX1) / 2, Y1 - 0.02, 1.0))
    room.append(sh.box(0.05, Y1 - Y0, 0.07, r=0.02, col='cream').at(KX0 + 0.02, (Y0 + Y1) / 2, 1.0))
    room.append(sh.box(0.05, Y1 - Y0, 0.07, r=0.02, col='cream').at(DX1 - 0.02, (Y0 + Y1) / 2, 1.0))

    # dividing wall with the arch the dishes fly through (outline in y,z then extruded along x)
    ay0, ay1, spring, peak = -1.3, 1.25, 1.55, 2.4
    outline = [(-1.58, 0.0), (ay0, 0.0), (ay0, spring)]
    n = 14
    for k in range(1, n):
        a = math.pi * k / n
        outline.append(((ay0 + ay1) / 2 - (ay1 - ay0) / 2 * math.cos(a), spring + (peak - spring) * math.sin(a)))
    outline += [(ay1, spring), (ay1, 0.0), (Y1, 0.0), (Y1, WH), (-1.58, WH)]
    arch = sh.prism(outline, 0.2, bevel=0.03, seg=2, col='wall')
    arch.bend(lambda v: Vector((v.z, v.x, v.y))).at(1.0, 0, 0)
    arch.shade_face(lambda c, n: P.lin('cream') if abs(n.x) < 0.5 else (P.lin('sage') if (c.z < 1.0 and n.x < 0) else P.lin('green') if c.z < 1.0 else P.lin('wall') if n.x < 0 else P.lin('wall_dining')))
    room.append(arch)

    # ------------------------------------------------------------------ fridge
    fx = -4.85
    furn.append(sh.box(1.1, 0.72, 2.2, r=0.1, seg=4, cell=0.37, col='teal').at(fx, 2.42, 1.1))
    furn.append(sh.box(0.98, 0.03, 1.22, r=0.01, col='cream').at(fx, 2.07, 0.75))          # inside, seen when the door opens
    furn.append(sh.box(1.04, 0.07, 0.66, r=0.03, seg=3, col='teal').at(fx, 2.035, 1.81))    # freezer door
    furn.append(sh.tube([(fx + 0.4, 1.975, 1.6), (fx + 0.4, 1.955, 1.65), (fx + 0.4, 1.955, 1.95), (fx + 0.4, 1.975, 2.0)], r=0.02, col='steel'))
    fdoor = C.make('fridge_door', [
        sh.box(1.04, 0.07, 1.3, r=0.03, seg=3, cell=0.35, col='teal').at(0.52, 0, 0.65),
        sh.tube([(0.92, -0.035, 0.75), (0.92, -0.075, 0.8), (0.92, -0.075, 1.15), (0.92, -0.035, 1.2)], r=0.02, col='steel'),
        sh.ball(0.045, sub=2, col='cranberry', sy=0.35).at(0.3, -0.04, 0.95),
        sh.star(0.05, 0.024, depth=0.016, col='butter').rot(90, 0, 0).at(0.55, -0.045, 0.8),
        sh.ball(0.04, sub=2, col='pumpkin', sy=0.35).at(0.42, -0.04, 0.55),
    ], loc=(fx - 0.52, 2.035, 0.1), shade='lambert')
    objs += [fdoor, C.hit('hit_fridge', (0.52, 0, 0.95), (1.2, 0.4, 2.2), parent=fdoor)]

    # ------------------------------------------------------------------ stove and oven
    sx0 = -3.5
    furn.append(sh.box(1.2, 0.72, 0.92, r=0.05, seg=3, cell=0.3, col='cream').at(sx0, 2.42, 0.46))
    furn.append(sh.box(1.22, 0.74, 0.05, r=0.02, col='steel_dark').at(sx0, 2.42, 0.94))
    for bx, by in ((-0.3, -0.17), (0.3, -0.17), (-0.3, 0.17), (0.3, 0.17)):
        furn.append(sh.torus(0.13, 0.02, segs=20, rsegs=6, col='ink').at(sx0 + bx, 2.42 + by, 0.965))
        furn.append(sh.cyl(0.07, 0.012, bevel=0.004, segs=14, col='steel').at(sx0 + bx, 2.42 + by, 0.96))
    furn.append(sh.box(1.2, 0.1, 0.26, r=0.03, col='cream').at(sx0, 2.73, 1.08))
    for i in range(4):
        furn.append(sh.cyl(0.045, 0.04, bevel=0.01, segs=14, col='cranberry').rot(90, 0, 0).at(sx0 - 0.42 + 0.28 * i, 2.69, 1.1))
    furn.append(sh.box(1.0, 0.03, 0.6, r=0.01, col='shadow').at(sx0, 2.08, 0.47))          # oven cavity, seen when the door opens
    furn.append(sh.box(0.8, 0.03, 0.03, r=0.01, col='pumpkin').at(sx0, 2.065, 0.3))        # glowing element
    odoor = C.make('oven_door', [
        sh.box(1.06, 0.06, 0.66, r=0.03, seg=3, col='cream').at(0, 0, 0.33),
        sh.tube([(-0.4, -0.03, 0.56), (-0.4, -0.085, 0.58), (0.4, -0.085, 0.58), (0.4, -0.03, 0.56)], r=0.022, col='steel'),
    ], loc=(sx0, 2.04, 0.13), shade='lambert')
    owin = C.make('oven_window', sh.box(0.7, 0.02, 0.3, r=0.03, seg=3, col='white').at(0, -0.026, 0.3), parent=odoor, shade='glow', props={'color': 'glass'})
    objs += [odoor, owin, C.hit('hit_oven', (0, -0.05, 0.4), (1.3, 0.45, 1.0), parent=odoor)]
    # a pot simmering on the back burner
    def pot_col(c, n):
        return P.lin('cranberry')
    furn.append(sh.lathe([(0, 0), (0.13, 0), (0.14, 0.02), (0.14, 0.14), (0.13, 0.15), (0.02, 0.17), (0, 0.17)], segs=24, col='cranberry', r=0.008).at(sx0 - 0.3, 2.59, 0.97))
    furn.append(sh.ball(0.03, sub=2, col='ink').at(sx0 - 0.3, 2.59, 1.15))
    furn.append(sh.tube([(sx0 - 0.44, 2.59, 1.08), (sx0 - 0.5, 2.59, 1.08)], r=0.02, col='ink', segs=8))
    furn.append(sh.tube([(sx0 - 0.16, 2.59, 1.08), (sx0 - 0.1, 2.59, 1.08)], r=0.02, col='ink', segs=8))
    objs.append(C.empty('socket_steam', loc=(sx0 - 0.3, 2.59, 1.2)))
    objs.append(C.empty('socket_oven', loc=(sx0, 2.0, 0.5)))
    objs.append(C.empty('socket_oven_shelf', loc=(sx0, 1.7, 0.2)))        # on the opened door
    objs.append(C.empty('socket_oven_in', loc=(sx0, 2.5, 0.34)))           # inside the oven body (hidden)
    objs.append(C.empty('socket_gobbles_oven', loc=(sx0 + 0.92, 1.62, 0.0)))
    objs.append(C.empty('cam_oven_target', loc=(sx0 + 0.2, 2.0, 0.84)))
    objs.append(C.empty('cam_oven', loc=(sx0 + 0.2 + 0.55, 2.0 - 3.4, 0.84 + 2.3), props={'fit_w': 3.0, 'fit_h': 2.25}))
    # a big kitchen timer on top of the stove: the needle sweeps into the green zone when the food is done
    tm = (sx0 + 0.3, 2.74, 1.4)
    objs.append(C.empty('socket_timer', loc=(tm[0], tm[1] - 0.1, tm[2])))
    objs.append(C.empty('socket_sink', loc=(-1.85, 2.4, 1.02)))
    furn.append(sh.cyl(0.19, 0.06, bevel=0.015, segs=28, col='cranberry').rot(90, 0, 0).at(tm[0], tm[1] + 0.03, tm[2]))
    furn.append(sh.cyl(0.16, 0.02, bevel=0.004, segs=28, col='ceramic').rot(90, 0, 0).at(tm[0], tm[1] - 0.03, tm[2]))
    for k in range(-2, 3):   # green "done" wedge on the right side of the face
        a = math.radians(-78 + k * 13)
        furn.append(sh.ball(0.026, sub=1, col='sage', sy=0.25).at(tm[0] + math.sin(-a) * 0.118, tm[1] - 0.052, tm[2] + math.cos(a) * 0.118))
    furn.append(sh.box(0.1, 0.06, 0.03, r=0.01, col='cranberry').at(tm[0], tm[1], tm[2] - 0.2))
    objs.append(C.make('timer_needle', [sh.box(0.022, 0.012, 0.14, r=0.005, col='ink').at(0, 0, 0.06), sh.ball(0.02, sub=1, col='ink', sy=0.5)], loc=(tm[0], tm[1] - 0.062, tm[2]), shade='lambert'))

    # hanging pots on a rail: each pot's origin is its hook
    furn.append(sh.tube([(sx0 - 0.6, 2.7, 2.1), (sx0 + 0.6, 2.7, 2.1)], r=0.02, col='steel_dark', segs=8))
    for bx in (-0.55, 0.55):
        furn.append(sh.tube([(sx0 + bx, 2.7, 2.1), (sx0 + bx, 2.8, 2.1)], r=0.018, col='steel_dark', segs=8))
    for i, (px, rad, col) in enumerate(((-0.4, 0.13, 'pumpkin'), (0.0, 0.17, 'steel_dark'), (0.4, 0.11, 'teal'))):
        pcs = [sh.torus(0.03, 0.008, segs=12, rsegs=6, col='steel').rot(90, 0, 0).at(0, 0, -0.03),
               sh.tube([(0, 0, -0.06), (0, 0, -0.24)], r=0.016, col='ink', segs=8),
               sh.lathe([(0, 0), (rad, 0), (rad + 0.012, 0.012), (rad + 0.012, 0.06), (rad, 0.07), (rad - 0.012, 0.06), (rad - 0.012, 0.02), (0, 0.02)], segs=24, col=col, r=0.004).rot(90, 0, 0).at(0, 0.035, -0.24 - rad)]
        pot = C.make('pot_%d' % i, pcs, loc=(sx0 + px, 2.7, 2.08), shade='toon', outline=True)
        objs += [pot, C.hit('hit_pot_%d' % i, (0, 0, -0.26), (0.38, 0.4, 0.7), parent=pot)]

    # ------------------------------------------------------------------ sink counter and window
    cx = -1.55
    furn.append(sh.box(2.4, 0.7, 0.9, r=0.04, seg=3, cell=0.3, col='sage').at(cx, 2.43, 0.45))
    furn.append(sh.box(2.5, 0.78, 0.08, r=0.03, seg=3, cell=0.2, col='wood').at(cx, 2.4, 0.94).shade_face(lambda c, n: (P.mix('wood', 'wood_light', (0.1, 0.55, 0.3, 0.75)[int(math.floor((c.y + 20) / 0.2)) % 4]) if n.z > 0.5 else P.lin('wood'))))
    for i in range(4):
        dx = cx - 0.87 + 0.58 * i
        furn.append(sh.box(0.5, 0.03, 0.62, r=0.02, col=P.mix('sage', 'cream', 0.25)).at(dx, 2.075, 0.47))
        furn.append(sh.ball(0.03, sub=2, col='butter').at(dx + (0.17 if i % 2 == 0 else -0.17), 2.05, 0.62))
    furn.append(sh.box(0.8, 0.52, 0.03, r=0.012, col='steel').at(cx - 0.3, 2.42, 0.985))
    furn.append(sh.box(0.66, 0.38, 0.03, r=0.03, col='steel_dark').at(cx - 0.3, 2.4, 0.99))
    faucet = [(cx - 0.3, 2.68, 0.98), (cx - 0.3, 2.68, 1.28), (cx - 0.3, 2.64, 1.36), (cx - 0.3, 2.52, 1.38), (cx - 0.3, 2.44, 1.33), (cx - 0.3, 2.43, 1.26)]
    furn.append(sh.tube(faucet, r=0.028, col='steel', segs=10))
    furn.append(sh.ball(0.045, sub=2, col='cranberry').at(cx - 0.46, 2.68, 1.03))
    furn.append(sh.ball(0.045, sub=2, col='teal').at(cx - 0.14, 2.68, 1.03))
    objs.append(C.empty('socket_faucet', loc=(cx - 0.3, 2.43, 1.24)))
    objs.append(C.hit('hit_faucet', (cx - 0.3, 2.5, 1.2), (0.7, 0.5, 0.6)))
    # decor pumpkin on the counter
    def pumpkin(r, col='pumpkin'):
        p = sh.uvball(r, segs=24, rings=12).scale(1.0, 1.0, 0.78)
        p.bend(lambda v: Vector((v.x, v.y, v.z)) * 1.0)
        return p.shade(lambda c, n: P.mix(col, 'roast', 0.5 + 0.5 * math.cos(math.atan2(c.y, c.x) * 8)))
    furn.append(pumpkin(0.17).at(cx + 0.85, 2.48, 0.98 + 0.13))
    furn.append(sh.cyl(0.02, 0.07, bevel=0.006, segs=8, col='green').rot(0, 10, 0).at(cx + 0.85, 2.48, 1.22))
    furn.append(pumpkin(0.1, 'butter').at(cx + 0.55, 2.3, 0.98 + 0.075))
    furn.append(sh.cyl(0.013, 0.045, bevel=0.004, segs=8, col='green').at(cx + 0.55, 2.3, 1.115))
    # window: frame bars, sill, mullions; the sky pane and clouds are separate (unlit, tweened by time of day)
    wx, wz, ww, wh = cx - 0.15, 1.95, 1.8, 1.2
    for (bx, bz, bw, bh) in ((0, wh / 2, ww + 0.2, 0.1), (0, -wh / 2, ww + 0.2, 0.1), (-ww / 2, 0, 0.1, wh), (ww / 2, 0, 0.1, wh)):
        furn.append(sh.box(bw, 0.12, bh, r=0.03, col='cream').at(wx + bx, 2.76, wz + bz))
    furn.append(sh.box(0.05, 0.06, wh, r=0.015, col='cream').at(wx, 2.77, wz))
    furn.append(sh.box(ww, 0.06, 0.05, r=0.015, col='cream').at(wx, 2.77, wz))
    furn.append(sh.box(ww + 0.36, 0.2, 0.06, r=0.02, col='cream').at(wx, 2.72, wz - wh / 2 - 0.06))
    sky = C.make('window_sky', sh.box(ww, 0.02, wh, r=0.0, col='white'), loc=(wx, 2.795, wz), shade='glow', normals=False, props={'color': 'sky'})
    hills = C.make('window_hills', [
        sh.ball(0.58, sub=3, col='sage', sy=0.02, sz=0.62).at(-0.3, 0, -wh / 2),
        sh.ball(0.5, sub=3, col='green', sy=0.02, sz=0.5).at(0.38, -0.004, -wh / 2),
        sh.ball(0.16, sub=2, col='pumpkin', sy=0.06).at(0.45, -0.008, -0.12),
        sh.box(0.04, 0.012, 0.2, r=0.004, col='cinnamon').at(0.45, -0.006, -0.32),
        sh.ball(0.12, sub=2, col='leaf', sy=0.06).at(-0.5, -0.008, -0.05),
        sh.box(0.035, 0.012, 0.16, r=0.004, col='cinnamon').at(-0.5, -0.006, -0.22),
    ], loc=(wx, 2.78, wz), shade='glow', normals=False, props={'color': 'vertex'})
    cloud = C.make('window_cloud', [sh.ball(0.13, sub=2, col='cloud', sy=0.08).at(0, 0, 0), sh.ball(0.1, sub=2, col='cloud', sy=0.08).at(0.15, 0, -0.02), sh.ball(0.09, sub=2, col='cloud', sy=0.08).at(-0.14, 0, -0.03)],
                   loc=(wx - 0.3, 2.775, wz + 0.3), shade='glow', normals=False, props={'color': 'vertex'})
    objs += [sky, hills, cloud, C.hit('hit_window', (wx, 2.7, wz), (ww + 0.2, 0.3, wh + 0.2))]
    # plant on the sill
    furn.append(sh.lathe([(0, 0), (0.06, 0), (0.08, 0.11), (0, 0.11)], segs=14, col='pumpkin', r=0.01).at(wx + 0.72, 2.7, wz - wh / 2 - 0.03))
    for a in range(5):
        furn.append(sh.ball(0.05, sub=2, col='green', sx=0.5, sz=1.6).rot(25, 0, a * 72).at(wx + 0.72, 2.7, wz - wh / 2 + 0.14))

    # wall clock above the fridge
    ck = (fx, 2.78, 2.63)
    furn.append(sh.cyl(0.26, 0.04, bevel=0.012, segs=28, col='cream').rot(90, 0, 0).at(ck[0], ck[1] + 0.02, ck[2]))
    furn.append(sh.torus(0.26, 0.03, segs=28, rsegs=8, col='cranberry').rot(90, 0, 0).at(ck[0], ck[1] - 0.01, ck[2]))
    for k in range(12):
        a = 2 * math.pi * k / 12
        furn.append(sh.ball(0.018 if k % 3 == 0 else 0.01, sub=1, col='ink', sy=0.4).at(ck[0] + math.sin(a) * 0.2, ck[1] - 0.025, ck[2] + math.cos(a) * 0.2))
    objs.append(C.make('clock_min', sh.box(0.022, 0.012, 0.19, r=0.005, col='ink').at(0, 0, 0.085), loc=(ck[0], ck[1] - 0.034, ck[2]), shade='lambert'))
    objs.append(C.make('clock_hr', sh.box(0.03, 0.012, 0.13, r=0.005, col='cranberry').at(0, 0, 0.055), loc=(ck[0], ck[1] - 0.046, ck[2]), shade='lambert'))
    furn.append(sh.ball(0.02, sub=1, col='ink', sy=0.5).at(ck[0], ck[1] - 0.055, ck[2]))

    # shelf with a cookie jar and spice jars (right of the window)
    shx = 0.15
    furn.append(sh.box(1.1, 0.26, 0.05, r=0.02, col='wood').at(shx, 2.66, 1.72))
    for bx in (-0.42, 0.42):
        furn.append(sh.box(0.05, 0.22, 0.16, r=0.02, col='wood_dark').at(shx + bx, 2.68, 1.62))
    jar = C.make('cookie_jar', [
        sh.lathe([(0, 0), (0.1, 0), (0.135, 0.08), (0.13, 0.2), (0.09, 0.25), (0, 0.25)], segs=24, col='cream', r=0.015).shade(lambda c, n: P.lin('teal') if 0.07 < c.z < 0.17 else P.lin('cream')),
        sh.lathe([(0, 0.25), (0.1, 0.25), (0.095, 0.28), (0.03, 0.3), (0, 0.3)], segs=24, col='cranberry', r=0.008),
        sh.ball(0.03, sub=2, col='cranberry').at(0, 0, 0.32),
    ], loc=(shx - 0.3, 2.64, 1.745), shade='toon', outline=True, normals=False)
    objs += [jar, C.hit('hit_jar', (0, 0, 0.17), (0.42, 0.4, 0.5), parent=jar)]
    for i, col in enumerate(('pumpkin', 'sage', 'cranberry')):
        furn.append(sh.cyl(0.05, 0.13, bevel=0.012, segs=14, col='ceramic').at(shx + 0.05 + 0.16 * i, 2.66, 1.745))
        furn.append(sh.cyl(0.054, 0.035, bevel=0.01, segs=14, col=col).at(shx + 0.05 + 0.16 * i, 2.66, 1.87))
    # tall plant in the corner under the shelf
    furn.append(sh.lathe([(0, 0), (0.17, 0), (0.22, 0.34), (0.2, 0.36), (0, 0.36)], segs=20, col='cranberry', r=0.02).at(0.3, 2.35, 0))
    for a in range(7):
        furn.append(sh.ball(0.11, sub=2, col='green' if a % 2 else 'sage', sx=0.45, sz=2.4).rot(22 + 6 * (a % 3), 0, a * 51).at(0.3, 2.35, 0.62))

    # ------------------------------------------------------------------ island
    furn.append(sh.box(3.4, 1.1, 0.9, r=0.06, seg=3, cell=0.3, col='green').at(IS_X, IS_Y, 0.45))
    def planks(a, b, width=0.2):
        # butcher-block bands along the length of a top (only on faces that look up)
        return lambda c, n: (P.mix(a, b, (0.1, 0.55, 0.3, 0.75, 0.0, 0.45)[int(math.floor((c.y + 20) / width)) % 6]) if n.z > 0.5 else P.lin(a))
    furn.append(sh.box(3.6, 1.3, 0.08, r=0.035, seg=3, cell=0.2, col='wood').at(IS_X, IS_Y, 0.94).shade_face(planks('wood', 'wood_light')))
    for i in range(3):
        furn.append(sh.box(0.95, 0.03, 0.6, r=0.025, col=P.mix('green', 'sage', 0.35)).at(IS_X - 1.1 + 1.1 * i, IS_Y - 0.555, 0.46))
        furn.append(sh.ball(0.032, sub=2, col='butter').at(IS_X - 1.1 + 1.1 * i, IS_Y - 0.58, 0.68))
    # towel on the right end
    furn.append(sh.tube([(IS_X + 1.72, IS_Y - 0.3, 0.75), (IS_X + 1.77, IS_Y - 0.3, 0.75), (IS_X + 1.77, IS_Y + 0.3, 0.75), (IS_X + 1.72, IS_Y + 0.3, 0.75)], r=0.015, col='steel', segs=8))
    furn.append(sh.box(0.04, 0.34, 0.42, r=0.015, cell=0.105, col='cream').at(IS_X + 1.775, IS_Y, 0.56).shade_face(lambda c, n: P.lin('cranberry') if int((c.z + 5) / 0.105) % 2 == 0 else P.lin('cream')))
    objs.append(C.empty('socket_station_island', loc=(IS_X, IS_Y, TOP)))
    # a step stool behind the island for the kitchen helper
    hx, hy = IS_X + 1.0, IS_Y + 1.0
    furn.append(sh.box(0.5, 0.42, 0.06, r=0.02, seg=2, col='cranberry').at(hx, hy, 0.5))
    furn.append(sh.box(0.44, 0.36, 0.05, r=0.02, seg=2, col='wood').at(hx, hy - 0.06, 0.25))
    for sx in (-1, 1):
        for sy in (-1, 1):
            furn.append(sh.box(0.05, 0.05, 0.5, r=0.015, col='wood_dark').at(hx + 0.2 * sx, hy + 0.16 * sy, 0.25))
    objs.append(C.empty('socket_helper', loc=(hx, hy, 0.53)))
    objs.append(C.empty('socket_gobbles_home', loc=(IS_X + 0.1, IS_Y + 0.3, TOP)))

    # ------------------------------------------------------------------ decor pass
    # baseboards
    for (bx, by, bw, bd) in (((KX0 + KX1) / 2, Y1 - 0.015, KX1 - KX0, 0.04), ((DX0 + DX1) / 2, Y1 - 0.015, DX1 - DX0, 0.04), (KX0 + 0.015, (Y0 + Y1) / 2, 0.04, Y1 - Y0), (DX1 - 0.015, (Y0 + Y1) / 2, 0.04, Y1 - Y0)):
        room.append(sh.box(bw, bd, 0.14, r=0.015, col='cream').at(bx, by, 0.07))
    # tiled backsplash behind the sink counter: cream tiles with a few teal and pumpkin ones
    def tile(c, n):
        if abs(n.y) < 0.5:
            return P.lin('cream')
        k = int(math.floor((c.x + 20) / 0.1)) * 7 + int(math.floor(c.z / 0.1)) * 13
        return P.lin('teal') if k % 11 == 0 else P.lin('pumpkin') if k % 17 == 0 else P.lin('ceramic') if k % 2 else P.lin('cream')
    furn.append(sh.box(2.5, 0.025, 0.3, r=0.004, seg=1, cell=0.1, col='cream').at(cx, 2.785, 1.13).shade_face(tile))
    # curtains on a rod
    furn.append(sh.tube([(wx - ww / 2 - 0.3, 2.66, wz + wh / 2 + 0.16), (wx + ww / 2 + 0.3, 2.66, wz + wh / 2 + 0.16)], r=0.02, col='wood_dark', segs=8))
    for sx in (-1, 1):
        furn.append(sh.ball(0.04, sub=2, col='wood_dark').at(wx + sx * (ww / 2 + 0.3), 2.66, wz + wh / 2 + 0.16))
        for k in range(3):
            fx_ = wx + sx * (ww / 2 + 0.2 - 0.1 * k)
            fold = sh.capsule(0.06, wh + 0.32, segs=10, col='cranberry').shade(lambda c, n: P.lin('cream') if 0.1 < c.z < 0.2 else P.lin('cranberry'))
            furn.append(fold.scale(1, 0.6, 1).at(fx_, 2.66, wz - wh / 2 - 0.18))
        furn.append(sh.torus(0.1, 0.018, segs=14, rsegs=6, col='butter').rot(0, 90, 0).scale(1.5, 0.6, 1).at(wx + sx * (ww / 2 + 0.1), 2.66, wz - 0.2))
    # a striped runner in front of the sink
    furn.append(sh.box(1.9, 0.62, 0.02, r=0.008, cell=0.19, col='teal').at(cx, 1.62, 0.011).shade_face(lambda c, n: P.lin('cream') if int(math.floor((c.x + 20) / 0.19)) % 2 else P.lin('teal')))
    # flowers on the dining wall shelf side: a vase by the door
    furn.append(sh.lathe([(0, 0), (0.07, 0), (0.1, 0.12), (0.05, 0.26), (0.06, 0.3), (0, 0.3)], segs=16, col='teal', r=0.01).at(DX1 - 0.35, Y1 - 0.4, 0))
    for k in range(5):
        a = k * 1.26
        furn.append(sh.tube([(DX1 - 0.35, Y1 - 0.4, 0.28), (DX1 - 0.35 + math.cos(a) * 0.12, Y1 - 0.4 + math.sin(a) * 0.1, 0.62 + 0.05 * (k % 2))], r=0.008, col='green', segs=5))
        furn.append(sh.ball(0.055, sub=2, col=('pumpkin', 'butter', 'cranberry')[k % 3]).at(DX1 - 0.35 + math.cos(a) * 0.12, Y1 - 0.4 + math.sin(a) * 0.1, 0.65 + 0.05 * (k % 2)))

    # rug and the sleeping cat
    rug = sh.lathe([(0, 0), (0.62, 0), (0.66, 0.012), (0.62, 0.024), (0, 0.024)], segs=36, col='cranberry').scale(1.25, 1.0, 1.0)
    rug.shade(lambda c, n: P.lin('cream') if 0.42 < math.hypot(c.x / 1.25, c.y) < 0.53 else P.lin('cranberry'))
    furn.append(rug.at(-4.75, -1.25, 0))
    cat = C.make('cat', [
        sh.ball(0.5, sub=3, sx=0.62, sy=0.46, sz=0.36).at(0, 0, 0.17).shade(lambda c, n: P.lin('cat_dark') if (math.sin(c.x * 26) > 0.55 and c.z > 0.2) else P.lin('cat')),
        sh.ball(0.15, sub=3, col='cat').at(0.27, -0.12, 0.17),
        sh.lathe([(0, 0), (0.05, 0), (0, 0.1)], segs=8, col='cat_dark').rot(-10, 20, 0).at(0.2, -0.1, 0.28),
        sh.lathe([(0, 0), (0.05, 0), (0, 0.1)], segs=8, col='cat_dark').rot(-10, -5, 0).at(0.34, -0.12, 0.29),
        sh.tube([(0.2, -0.25, 0.19), (0.225, -0.262, 0.18), (0.25, -0.26, 0.19)], r=0.007, col='ink', segs=6),
        sh.tube([(0.31, -0.262, 0.19), (0.335, -0.265, 0.18), (0.36, -0.25, 0.19)], r=0.007, col='ink', segs=6),
        sh.ball(0.016, sub=1, col='#F0907A').at(0.285, -0.27, 0.155),
    ], loc=(-4.8, -1.2, 0.024), shade='toon', outline=True, normals=False)
    tail = C.make('cat_tail', sh.tube([(0, 0, 0), (-0.1, -0.1, 0.01), (-0.12, -0.24, 0.0), (-0.02, -0.34, 0.0), (0.1, -0.36, 0.0)], r=[0.045, 0.045, 0.042, 0.04, 0.035], col='cat_dark', segs=10),
                  loc=(-0.27, -0.02, 0.05), parent=cat, shade='toon', outline=True, normals=False)
    objs += [cat, tail, C.hit('hit_cat', (0.02, -0.08, 0.2), (1.0, 0.85, 0.6), parent=cat)]

    # ------------------------------------------------------------------ dining room
    rug2 = sh.lathe([(0, 0), (1.0, 0), (1.04, 0.012), (1.0, 0.024), (0, 0.024)], segs=44, col='green').scale(1.95, 1.3, 1.0)
    rug2.shade(lambda c, n: P.lin('butter') if 0.8 < math.hypot(c.x / 1.95, c.y / 1.3) < 0.88 else P.lin('green'))
    furn.append(rug2.at(T_X, T_Y + 0.15, 0))
    furn.append(sh.box(3.25, 1.35, 0.07, r=0.03, seg=3, cell=0.2, col='wood_light').at(T_X, T_Y, TABLE - 0.035).shade_face(planks('wood_light', 'butter', 0.23)))
    furn.append(sh.box(2.95, 1.1, 0.12, r=0.02, col='wood').at(T_X, T_Y, TABLE - 0.13))
    for sx in (-1, 1):
        for sy in (-1, 1):
            furn.append(sh.box(0.11, 0.11, TABLE - 0.1, r=0.03, col='wood').at(T_X + 1.45 * sx, T_Y + 0.54 * sy, (TABLE - 0.1) / 2))
    furn.append(sh.box(2.5, 0.42, 0.014, r=0.006, cell=0.21, col='cream').at(T_X, T_Y, TABLE + 0.006).shade_face(
        lambda c, n: P.lin('cranberry') if abs(c.x - T_X) > 1.05 else P.lin('cream')))
    # seats 0-3 behind the table, 4 at the left end, 5 = Gobbles on a booster at the right end.
    # Each seat gets a place setting: plate in front, fork on one side, name card on the other.
    # six seats behind the table (0-5), one at the left end (6); 7 = Gobbles on a booster at the right end
    seats = [(T_X + dx, T_Y + 1.02, 0) for dx in (-1.3, -0.78, -0.26, 0.26, 0.78, 1.3)] + [(T_X - 1.97, T_Y, 90), (T_X + 1.97, T_Y, -90)]
    for i, (sx_, sy_, rz) in enumerate(seats):
        furn += chair(sx_, sy_, rz, booster=(i == 7))
        objs.append(C.empty('socket_seat_%d' % i, loc=(sx_, sy_, 0.69 if i == 7 else 0.49), rot=(0, 0, rz)))
        d = Vector((math.sin(math.radians(rz)), -math.cos(math.radians(rz)), 0))
        side = Vector((-d.y, d.x, 0))
        back = i < 6
        p = Vector((sx_, sy_, 0)) + d * (0.55 if back else 0.62)
        objs.append(C.empty('socket_plate_%d' % i, loc=(p.x, p.y, TABLE + 0.002), rot=(0, 0, rz)))
        # the back row is snug: fork and name card share the gap between plates (fork forward, card back)
        f = p - side * 0.26 + d * 0.08 if back else p + Vector((0, -0.27, 0))
        objs.append(C.empty('socket_fork_%d' % i, loc=(f.x, f.y, TABLE + 0.002), rot=(0, 0, rz)))
        c = p + side * 0.26 - d * 0.12 if back else p + Vector((0, 0.27, 0))
        objs.append(C.empty('socket_card_%d' % i, loc=(c.x, c.y, TABLE + 0.002)))
    # dishes land small (the game scales them) in two rows; the roast takes the middle
    slots = [(-0.62, -0.45), (0.62, -0.45), (-1.08, -0.45), (1.08, -0.45), (-0.45, -0.02), (0.45, -0.02), (-0.84, -0.02), (0.84, -0.02)]
    for i, (dx, dy) in enumerate(slots):
        objs.append(C.empty('socket_dish_%d' % i, loc=(T_X + dx, T_Y + dy, TABLE + 0.013 if abs(dx) < 1.2 else TABLE + 0.002)))
    objs.append(C.empty('socket_dish_roast', loc=(T_X, T_Y - 0.3, TABLE + 0.013)))
    objs.append(C.empty('socket_table_centre', loc=(T_X, T_Y - 0.15, TABLE)))
    for i, dx in enumerate((-0.15, 0.15)):
        objs.append(C.empty('socket_candle_%d' % i, loc=(T_X + dx, T_Y + 0.15, TABLE + 0.013)))
    # the serving cart for Set the Table stands in front of the table
    objs.append(C.empty('socket_station_table', loc=(T_X + 0.1, T_Y - 1.62, 0)))
    objs.append(C.empty('socket_gobbles_table', loc=(T_X + 1.3, T_Y - 1.5, 0.0)))
    objs.append(C.empty('cam_settable_target', loc=(T_X + 0.0, T_Y - 0.3, 0.8)))
    objs.append(C.empty('cam_settable', loc=(T_X + 0.0 - 0.9, T_Y - 0.3 - 5.6, 0.8 + 4.4), props={'fit_w': 5.6, 'fit_h': 3.9}))

    # front door on the back wall (guests come in here); hinge on its left edge
    dx0, dw, dh = 1.55, 0.95, 2.1
    furn.append(sh.box(dw + 0.24, 0.1, dh + 0.12, r=0.03, col='cream').at(dx0 + dw / 2, Y1 + 0.0, (dh + 0.12) / 2))
    out_panel = C.make('door_outside', sh.box(dw, 0.02, dh, r=0.0, col='white'), loc=(dx0 + dw / 2, Y1 - 0.045, dh / 2), shade='glow', normals=False, props={'color': 'sky'})
    door = C.make('door', [
        sh.box(dw, 0.07, dh, r=0.025, seg=3, cell=0.35, col='cranberry').at(dw / 2, 0, dh / 2),
        sh.box(dw - 0.26, 0.03, 0.7, r=0.03, col=P.mix('cranberry', 'ink', 0.25)).at(dw / 2, -0.035, 0.55),
        sh.torus(0.17, 0.045, segs=20, rsegs=8, col='green').rot(90, 0, 0).at(dw / 2, -0.05, 1.5),
        sh.ball(0.03, sub=1, col='cranberry').at(dw / 2 - 0.1, -0.09, 1.4),
        sh.ball(0.03, sub=1, col='cranberry').at(dw / 2 + 0.12, -0.09, 1.55),
        sh.ball(0.03, sub=1, col='butter').at(dw / 2, -0.09, 1.67),
        sh.ball(0.045, sub=2, col='butter').at(dw - 0.12, -0.06, 1.0),
    ], loc=(dx0, Y1 - 0.075, 0.02), shade='lambert')
    objs += [out_panel, door]
    objs.append(C.empty('socket_door', loc=(dx0 + dw / 2, Y1 - 0.45, 0)))
    # pictures
    for i, (px, col) in enumerate(((3.4, 'pumpkin'), (4.65, 'sage'))):
        furn.append(sh.box(0.75, 0.05, 0.6, r=0.02, col='wood_dark').at(px, Y1 - 0.02, 1.85))
        furn.append(sh.box(0.62, 0.02, 0.47, r=0.01, col='cream').at(px, Y1 - 0.05, 1.85))
        if i == 0:
            furn.append(sh.ball(0.15, sub=2, col='pumpkin', sy=0.1, sz=0.8).at(px, Y1 - 0.065, 1.82))
            furn.append(sh.box(0.03, 0.012, 0.07, r=0.004, col='green').at(px, Y1 - 0.065, 1.97))
        else:
            furn.append(sh.star(0.17, 0.08, depth=0.016, col='cranberry').rot(90, 0, 0).at(px, Y1 - 0.065, 1.85))
    # bunting across the dining back wall
    cols = ('pumpkin', 'cream', 'cranberry', 'butter', 'teal')
    nb = 13
    string = []
    for k in range(nb + 1):
        t = k / nb
        x = DX0 + 0.2 + (DX1 - DX0 - 0.4) * t
        z = 2.82 - 0.22 * math.sin(math.pi * t)
        string.append((x, Y1 - 0.03, z))
    furn.append(sh.tube(string, r=0.01, col='ink', segs=6))
    for k in range(nb):
        a, b = Vector(string[k]), Vector(string[k + 1])
        m = (a + b) / 2
        furn.append(sh.prism([(-0.13, 0), (0.13, 0), (0, -0.26)], 0.014, bevel=0.004, seg=1, col=cols[k % len(cols)]).rot(90, 0, 0).at(m.x, Y1 - 0.045, m.z - 0.01))

    room_ob = C.make('room', room, shade='lambert')
    furn_ob = C.make('furniture', furn, shade='lambert')
    objs += [room_ob, furn_ob]

    # ------------------------------------------------------------------ camera poses
    objs.append(C.empty('cam_home_target', loc=(0.0, 0.45, 1.0)))
    objs.append(C.empty('cam_home', loc=(0.0, 0.45 - 10.0, 1.0 + 9.3), props={'fit_w': 12.9, 'fit_h': 6.75}))
    objs.append(C.empty('cam_table_target', loc=(T_X + 0.1, T_Y + 0.45, 0.95)))
    objs.append(C.empty('cam_table', loc=(T_X + 0.1 - 1.0, T_Y + 0.45 - 5.6, 0.95 + 4.1), props={'fit_w': 5.5, 'fit_h': 3.6}))

    lit = [o for o in objs if o.type == 'MESH' and not o.get('hit') and o.get('shade') != 'glow']
    C.bake_ao(lit, dist=0.55, strength=0.95, samples=24)
    C.gradient([room_ob], 0.0, WH, dark=0.9)

    C.export_glb(os.path.join(out, 'kitchen.glb'), objs)
    if preview:
        C.render_preview(os.path.join(out, 'preview', 'kitchen.png'), target=(0, 0.2, 0.8), dist=17.0, yaw=0, pitch=45, size=1024, samples=16, lens=50)
        C.render_preview(os.path.join(out, 'preview', 'kitchen_left.png'), target=(-2.8, 1.0, 0.9), dist=7.5, yaw=0, pitch=30, size=768, samples=16, lens=40)
        C.render_preview(os.path.join(out, 'preview', 'kitchen_right.png'), target=(3.2, 0.6, 0.9), dist=7.0, yaw=-12, pitch=30, size=768, samples=16, lens=40)
