"""Green Beans: six long beans that snap in two, a casserole dish, and a tub of crispy onions.
Station space: origin on the counter top."""
import math
import os
from mathutils import Vector
from lib import shapes as sh, common as C, palette as P

BEANS = 6


def half(sign, seed):
    """Half a bean with its broken end at the origin, running toward sign * X."""
    n = 12
    pts, rad = [], []
    for k in range(n + 1):
        t = k / n
        pts.append((sign * 0.19 * t, 0.012 * math.sin(t * 2.2 + seed), 0.0))
        rad.append(0.028 * (1 - 0.75 * t ** 3) * (1 + 0.2 * math.sin(t * math.pi * 3 + seed) ** 2))   # pea bumps
    return sh.tube(pts, r=rad, segs=10, col='bean').shade(lambda c, n: P.mix('bean', 'bean_dark', 0.5 + 0.5 * math.sin(c.x * 40 + seed)))


def build(out, preview):
    root = C.empty('station_beans')
    objs = [root]
    board = C.make('bn_board', [
        sh.box(0.74, 0.5, 0.04, r=0.018, seg=3, cell=0.12, col=P.mix('wood_light', 'cream', 0.5)).at(0, 0, 0.02),
        sh.box(0.06, 0.504, 0.042, r=0.018, seg=3, col='wood').at(0.33999999999999997, 0, 0.021),
        sh.box(0.06, 0.504, 0.042, r=0.018, seg=3, col='wood').at(-0.33999999999999997, 0, 0.021),
    ], loc=(-0.4, -0.02, 0), parent=root)
    objs.append(board)
    for i in range(BEANS):
        b = C.empty('bean_%d' % i, loc=(-0.4 + 0.03 * math.sin(i * 2.1), -0.2 + 0.074 * i, 0.07), rot=(0, 0, 7 * math.sin(i * 1.7)), parent=root)
        objs.append(b)
        objs.append(C.make('bean_%d_a' % i, half(-1, i), parent=b, shade='toon', outline=True, normals=False))
        objs.append(C.make('bean_%d_b' % i, half(1, i + 3), parent=b, shade='toon', outline=True, normals=False))
    objs.append(C.hit('hit_beans', (-0.4, -0.02, 0.1), (0.9, 0.66, 0.3), parent=root))

    dish = C.empty('bean_dish', loc=(0.34, 0.04, 0), parent=root)
    prof = [(0, 0), (0.2, 0), (0.25, 0.03), (0.28, 0.13), (0.265, 0.14), (0.24, 0.045), (0.19, 0.03), (0, 0.03)]

    def dcol(c, n):
        rad = math.hypot(c.x / 1.25, c.y)
        out_ = n.dot(Vector((c.x, c.y, 0)).normalized()) if rad > 1e-5 else 0
        return P.lin('pumpkin') if (out_ > 0.05 and c.z < 0.135) else P.lin('ceramic')
    dm = C.make('bean_dish_mesh', [
        sh.lathe(prof, segs=36).scale(1.25, 1, 1).shade_face(dcol),
        sh.box(0.1, 0.18, 0.028, r=0.012, col='pumpkin').at(0.375, 0, 0.118),      # lug handles
        sh.box(0.1, 0.18, 0.028, r=0.012, col='pumpkin').at(-0.375, 0, 0.118),
    ], parent=dish, shade='toon', outline=True, normals=False)
    objs += [dish, dm]
    # the pile inside the dish: twelve halves that pop in as the snapped ones land
    for k in range(BEANS * 2):
        a = k * 2.4
        r = 0.05 + 0.1 * ((k * 5) % 3) / 2
        o = C.make('pile_%d' % k, half(1 if k % 2 else -1, k).scale(0.8, 0.8, 0.8), loc=(math.cos(a) * r * 1.2 - 0.05 * (1 if k % 2 else -1), math.sin(a) * r, 0.06 + 0.018 * (k // 4)),
                   rot=(0, 0, math.degrees(a) * 1.3), parent=dish, shade='toon', normals=False)
        objs.append(o)
    # crispy onion clusters on top
    import random
    rng = random.Random(3)
    for k in range(4):
        pcs = [sh.ball(rng.uniform(0.018, 0.03), sub=1, col=P.mix('crust', 'toast', rng.random())).scale(1.4, 0.7, 0.6).rot(rng.uniform(0, 90), 0, rng.uniform(0, 180)).at(rng.uniform(-0.08, 0.08), rng.uniform(-0.07, 0.07), rng.uniform(0, 0.02)) for _ in range(9)]
        objs.append(C.make('crunch_%d' % k, pcs, loc=((-0.13, 0.12, -0.02, 0.05)[k], (0.06, -0.05, -0.1, 0.1)[k], 0.125), parent=dish, shade='toon', normals=False))
    objs.append(C.hit('hit_beandish', (0, 0, 0.12), (0.86, 0.72, 0.4), parent=dish))

    tub = C.make('tub', [
        sh.lathe([(0, 0), (0.085, 0), (0.105, 0.17), (0.095, 0.17), (0.078, 0.014), (0, 0.014)], segs=24).shade(lambda c, n: P.lin('cream') if 0.06 < c.z < 0.12 and math.hypot(c.x, c.y) > 0.07 else P.lin('pumpkin')),
        sh.ball(0.085, sub=2, col='toast', sz=0.35).noise(0.012, 30, 1).at(0, 0, 0.15),
    ], loc=(-0.02, -0.38, 0), parent=root, shade='toon', outline=True, normals=False)
    objs += [tub, C.hit('hit_tub', (0, 0, 0.1), (0.36, 0.36, 0.4), parent=tub)]

    C.station_frame(objs, root, 'beans')
    C.bake_each(objs, static=[board, dm])
    C.export_glb(os.path.join(out, 'beans.glb'), objs)
    if preview:
        C.render_preview(os.path.join(out, 'preview', 'beans.png'), target=(0, 0, 0.1), dist=2.0, yaw=0, pitch=40)
