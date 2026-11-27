"""Stuffing: a bread loaf in five chunks, a celery stalk, a toy knife, a herb shaker and a mixing bowl
that fills with bread cubes. Station space: origin on the counter top."""
import math
import os
import random
from mathutils import Vector
from lib import shapes as sh, common as C, palette as P

CHUNKS, CUBES, CELERY = 5, 15, 4


def build(out, preview):
    root = C.empty('station_stuffing')
    objs = [root]
    board = C.make('st_board', [
        sh.box(0.74, 0.5, 0.04, r=0.018, seg=3, cell=0.12, col=P.mix('wood_light', 'cream', 0.5)).at(0, 0, 0.02),
        sh.box(0.06, 0.504, 0.042, r=0.018, seg=3, col='wood').at(0.33999999999999997, 0, 0.021),
        sh.box(0.06, 0.504, 0.042, r=0.018, seg=3, col='wood').at(-0.33999999999999997, 0, 0.021),
    ], loc=(-0.42, 0.06, 0), parent=root)
    objs.append(board)
    # loaf: five chunks side by side, crust outside, soft crumb on the cut faces
    for i in range(CHUNKS):
        w = 0.105
        end = i in (0, CHUNKS - 1)
        c = sh.box(w, 0.2, 0.17, r=0.045 if end else 0.03, seg=3, col='toast').shade_face(lambda c, n: P.lin('bread') if abs(n.x) > 0.8 else P.mix('toast', 'crust', 0.5 + 0.5 * math.sin(c.y * 30)))
        score = sh.box(0.026, 0.13, 0.014, r=0.006, seg=1, col='bread').rot(0, 0, 28).at(0, 0, 0.168)   # a scored slash on the crust
        objs.append(C.make('loaf_%d' % i, [c.at(0, 0, 0.085), score], loc=(-0.42 - 0.21 + w * i, 0.1, 0.04), parent=root, shade='toon', outline=True))
    objs.append(C.hit('hit_loaf', (-0.42, 0.1, 0.14), (0.8, 0.42, 0.4), parent=root))
    # a loose bread cube (the game clones it for the ones that fly)
    objs.append(C.make('bread_cube', sh.box(0.075, 0.075, 0.075, r=0.014, seg=2, col='bread').shade_face(lambda c, n: P.lin('toast') if n.z > 0.8 else P.lin('bread')).at(0, 0, 0.0375), loc=(-0.85, -0.3, 0), parent=root, shade='toon', outline=True))

    # celery: four pieces and a leafy end, lying in front of the board
    for i in range(CELERY):
        pc = sh.box(0.115, 0.07, 0.04, r=0.018, seg=2, col='celery').shade_face(lambda c, n: P.lin('cream') if abs(n.x) > 0.8 else (P.lin('celery') if n.z > 0.3 else P.lin('bean')))
        ribs = [sh.box(0.113, 0.012, 0.012, r=0.005, seg=1, col=P.mix('celery', 'cream', 0.5)).at(0, dy, 0.04) for dy in (-0.017, 0.0, 0.017)]
        objs.append(C.make('celery_%d' % i, [pc.at(0, 0, 0.02)] + ribs, loc=(-0.6 + 0.118 * i, -0.3, 0), parent=root, shade='toon', outline=True))
    leaf = [sh.ball(0.05, sub=2, col='bean', sx=1.5, sy=0.9, sz=0.35).rot(0, 0, a).at(-0.72 + 0.02 * math.cos(a), -0.3 + 0.035 * math.sin(math.radians(a)), 0.03) for a in (-50, 0, 50)]
    objs.append(C.make('celery_top', leaf, parent=root, shade='toon', normals=False))
    objs.append(C.hit('hit_celery', (-0.45, -0.3, 0.06), (0.75, 0.3, 0.26), parent=root))
    # toy knife: origin at the handle, blade points -X, edge down
    knife = C.make('knife', [
        sh.box(0.15, 0.03, 0.045, r=0.014, col='cranberry').at(0.075, 0, 0),
        sh.box(0.024, 0.036, 0.052, r=0.008, seg=2, col='steel_dark').at(0.004, 0, 0),          # bolster
        *[sh.ball(0.009, sub=1, col='butter', sy=0.5).at(x, sy * 0.015, 0) for x in (0.06, 0.11) for sy in (-1, 1)],   # rivets
        sh.prism([(0, -0.03), (-0.27, -0.03), (-0.3, 0.0), (-0.24, 0.035), (0, 0.035)], 0.012, bevel=0.004, seg=1, col='steel').rot(90, 0, 0),
    ], loc=(-0.1, -0.44, 0.03), rot=(90, 0, 0), parent=root, shade='toon', outline=True)
    objs.append(knife)

    # herb shaker: origin at its middle
    shaker = C.make('shaker', [
        sh.cyl(0.055, 0.15, bevel=0.012, segs=18, col='ceramic').shade(lambda c, n: P.lin('herb') if 0.02 < c.z < 0.1 else P.lin('ceramic')).at(0, 0, -0.09),
        sh.lathe([(0, 0.06), (0.058, 0.06), (0.058, 0.1), (0.03, 0.125), (0, 0.125)], segs=18, col='steel', r=0.008),
    ], loc=(0.78, -0.22, 0.09), parent=root, shade='toon', outline=True, normals=False)
    objs += [shaker, C.hit('hit_shaker', (0, 0, 0), (0.34, 0.34, 0.42), parent=shaker)]

    # mixing bowl and what ends up in it
    bowl = C.empty('stuff_bowl', loc=(0.3, 0.06, 0), parent=root)
    wall = lambda z: 0.17 + (0.29 - 0.17) * (z - 0.02) / 0.2
    prof = [(0, 0), (0.155, 0), (0.17, 0.02), (wall(0.09), 0.09), (wall(0.1), 0.1), (wall(0.15), 0.15), (wall(0.16), 0.16), (0.29, 0.22), (0.28, 0.235), (0.265, 0.22), (0.145, 0.035), (0, 0.03)]

    def bcol(c, n):
        rad = math.hypot(c.x, c.y)
        out_ = n.dot(Vector((c.x, c.y, 0)).normalized()) if rad > 1e-5 else 0
        if out_ > 0.05 and c.z < 0.22:
            return P.lin('sage') if 0.1 < c.z < 0.15 else P.lin('cream')
        return P.lin('ceramic')
    bm = C.make('stuff_bowl_mesh', sh.lathe(prof, segs=40).shade_face(bcol), parent=bowl, shade='toon', outline=True, normals=False)
    objs += [bowl, bm]
    rng = random.Random(11)
    for k in range(CUBES):
        layer = 0 if k < 7 else (1 if k < 12 else 2)
        a = rng.uniform(0, 6.28)
        r = rng.uniform(0.02, 0.16 - 0.05 * layer)
        cb = sh.box(0.075, 0.075, 0.075, r=0.014, seg=2, col='bread').shade_face(lambda c, n: P.lin('toast') if n.z > 0.5 or n.x > 0.8 else P.lin('bread')).at(0, 0, 0.0375)
        objs.append(C.make('cube_%d' % k, cb, loc=(math.cos(a) * r, math.sin(a) * r, 0.1 + 0.055 * layer), rot=(rng.uniform(-25, 25), rng.uniform(-25, 25), rng.uniform(0, 90)), parent=bowl, shade='toon', outline=True))
    for k in range(CELERY * 2):
        a = k * 0.8 + 0.3
        objs.append(C.make('cel_%d' % k, sh.box(0.05, 0.04, 0.03, r=0.01, seg=2, col='celery').at(0, 0, 0.015), loc=(math.cos(a) * 0.13, math.sin(a) * 0.13, 0.2 + 0.01 * (k % 3)), rot=(20 * (k % 3), 0, k * 40), parent=bowl, shade='toon'))
    specks = [sh.ball(0.012, sub=1, col='herb').scale(1.5, 1, 0.4).at(rng.uniform(-0.16, 0.16), rng.uniform(-0.16, 0.16), rng.uniform(0.0, 0.05)) for _ in range(40)]
    objs.append(C.make('herbs', specks, loc=(0, 0, 0.235), parent=bowl, shade='toon', normals=False))
    objs.append(C.hit('hit_stuffbowl', (0, 0, 0.18), (0.76, 0.76, 0.52), parent=bowl))
    objs.append(C.empty('socket_tool', loc=(0.3, 0.06, 0.62), parent=root))

    C.station_frame(objs, root, 'stuffing')
    C.bake_each(objs, static=[board, bm])
    C.export_glb(os.path.join(out, 'stuffing.glb'), objs)
    if preview:
        C.render_preview(os.path.join(out, 'preview', 'stuffing.png'), target=(0, 0, 0.1), dist=2.0, yaw=0, pitch=40)
