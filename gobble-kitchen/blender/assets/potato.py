"""Mashed Potatoes station: board, potato with 8 peel strips, bowl, mash (shape key), masher, butter, spoon.
Authored in station space: origin on the counter top, x right, y away from the player."""
import math
import os
import bpy
from mathutils import Vector, noise
from lib import shapes as sh, common as C, palette as P
from lib.shapes import S, new_bm

L, RY, RZ = 0.33, 0.115, 0.105       # potato length and radii (oversized on purpose)
STRIPS = 8


def potato_pt(u, v, grow=1.0):
    rho = math.sin(math.pi * min(max(u, 0.0), 1.0)) ** 0.7
    x = -L / 2 * math.cos(math.pi * u)
    y, z = RY * rho * math.cos(v), RZ * rho * math.sin(v)
    p = Vector((x, y, z))
    n = noise.noise(p * 7.0 + Vector((3.1, 0.2, 5.5)))
    k = (1.0 + 0.10 * n) * grow
    return Vector((x * (1 + 0.04 * n) * (1 + (grow - 1) * 0.35), y * k, z * k))


def potato_flesh():
    bm = new_bm()
    nu, nv = 22, 28
    rows = []
    for i in range(nu + 1):
        u = i / nu
        if i in (0, nu):
            rows.append([bm.verts.new(potato_pt(u, 0))])
        else:
            rows.append([bm.verts.new(potato_pt(u, 2 * math.pi * k / nv)) for k in range(nv)])
    for a, b in zip(rows[:-1], rows[1:]):
        for k in range(nv):
            k2 = (k + 1) % nv
            if len(a) == 1:
                bm.faces.new((a[0], b[k2], b[k]))
            elif len(b) == 1:
                bm.faces.new((a[k], a[k2], b[0]))
            else:
                bm.faces.new((a[k], a[k2], b[k2], b[k]))
    import bmesh
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)

    def col(co, no):
        n = noise.noise(co * 14.0)
        return P.mix('potato', 'butter', 0.5 + 0.5 * n)
    return S(bm).shade(col)


def peel_strip(k):
    """A thin solid shell over 1/8 of the potato, origin moved to its centre by the caller."""
    import bmesh
    bm = new_bm()
    nu, nv = 16, 5
    v0, v1 = 2 * math.pi * k / STRIPS, 2 * math.pi * (k + 1) / STRIPS
    u0, u1 = 0.0, 1.0
    outer, inner = [], []
    for i in range(nu + 1):
        u = u0 + (u1 - u0) * i / nu
        ro, ri = [], []
        for j in range(nv + 1):
            v = v0 + (v1 - v0) * j / nv
            ro.append(bm.verts.new(potato_pt(u, v, 1.07)))
            ri.append(bm.verts.new(potato_pt(u, v, 1.005)))
        outer.append(ro)
        inner.append(ri)
    for i in range(nu):
        for j in range(nv):
            bm.faces.new((outer[i][j], outer[i + 1][j], outer[i + 1][j + 1], outer[i][j + 1]))
            bm.faces.new((inner[i][j], inner[i][j + 1], inner[i + 1][j + 1], inner[i + 1][j]))
    for i in range(nu):
        bm.faces.new((outer[i][0], inner[i][0], inner[i + 1][0], outer[i + 1][0]))
        bm.faces.new((outer[i][nv], outer[i + 1][nv], inner[i + 1][nv], inner[i][nv]))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0015)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)

    def col(co, no):
        n = noise.noise(co * 22.0 + Vector((k, 0, 0)))
        radial = Vector((0, co.y, co.z))
        if radial.length > 1e-5 and no.dot(radial.normalized()) < -0.2:
            return P.lin('potato')
        return P.lin('potato_spot') if n > 0.42 else P.mix('potato_skin', 'cinnamon', 0.15 + 0.2 * n)
    s = S(bm).shade(col)
    cen = potato_pt(0.5, (v0 + v1) / 2, 1.03)
    s.at(-cen.x, -cen.y, -cen.z)
    return s, cen


def peel_curl():
    """Curly ribbon that tumbles onto the counter: skin outside, flesh inside."""
    import bmesh
    bm = new_bm()
    turns, n, w, rad, pitch, th = 1.6, 30, 0.04, 0.034, 0.03, 0.006
    rows = []
    for i in range(n + 1):
        a = 2 * math.pi * turns * i / n
        c = Vector((math.cos(a) * rad, math.sin(a) * rad, pitch * turns * i / n - pitch * turns / 2))
        out = Vector((math.cos(a), math.sin(a), 0))
        up = Vector((0, 0, 1))
        rows.append([bm.verts.new(c + out * th / 2 - up * w / 2), bm.verts.new(c + out * th / 2 + up * w / 2),
                     bm.verts.new(c - out * th / 2 + up * w / 2), bm.verts.new(c - out * th / 2 - up * w / 2)])
    for a, b in zip(rows[:-1], rows[1:]):
        for j in range(4):
            j2 = (j + 1) % 4
            bm.faces.new((a[j], a[j2], b[j2], b[j]))
    bm.faces.new(rows[0])
    bm.faces.new(rows[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)

    def col(co, no):
        radial = Vector((co.x, co.y, 0))
        return P.lin('potato_skin') if radial.length > 1e-5 and no.dot(radial.normalized()) > 0.3 else P.lin('potato')
    return S(bm).shade(col).rot(90, 0, 0)


RM = 0.222  # mash radius inside the bowl


def mash_heights(x, y):
    r = min(1.0, math.hypot(x, y) / RM)
    th = math.atan2(y, x)
    edge = max(0.0, 1 - r ** 4)
    # chunky pile: rounded lumps from a voronoi cell pattern
    d = noise.voronoi(Vector((x * 9.0 + 1.3, y * 9.0 - 0.7, 0.4)))[0][0]
    lump = max(0.0, 1.0 - d * 1.9)
    chunky = (0.035 + 0.055 * (1 - r * r) + 0.07 * lump ** 0.6) * edge
    # fluffy mound with a swirl
    swirl = math.sin(3 * th + r * 9.0) * r * (1 - r) * 4
    fluffy = (0.03 + 0.125 * (1 - r * r) ** 0.85 + 0.022 * swirl + 0.035 * max(0.0, 1 - r * 4.5)) * edge
    return chunky, fluffy


def mash_mesh():
    import bmesh
    bm = new_bm()
    rings, segs = 16, 44
    grid = [[bm.verts.new((0, 0, 0))]]
    for i in range(1, rings + 1):
        rr = RM * (i / rings) ** 0.9
        grid.append([bm.verts.new((rr * math.cos(2 * math.pi * k / segs), rr * math.sin(2 * math.pi * k / segs), 0)) for k in range(segs)])
    skirt = [bm.verts.new((RM * 0.93 * math.cos(2 * math.pi * k / segs), RM * 0.93 * math.sin(2 * math.pi * k / segs), -0.05)) for k in range(segs)]
    grid.append(skirt)
    for a, b in zip(grid[:-1], grid[1:]):
        for k in range(segs):
            k2 = (k + 1) % segs
            if len(a) == 1:
                bm.faces.new((a[0], b[k], b[k2]))
            else:
                bm.faces.new((a[k], b[k], b[k2], a[k2]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm, len(skirt)


def build(out, preview):
    root = C.empty('station_potato')
    objs = [root]

    # cutting board
    board = C.make('board', [
        sh.box(0.66, 0.44, 0.04, r=0.018, seg=3, cell=0.11, col='wood_light').at(0, 0, 0.02),
        sh.lathe([(0.0, 0.0), (0.03, 0.0), (0.03, 0.042), (0, 0.042)], segs=12, col='wood_dark', r=0.004).at(0.28, 0.17, 0.0),
    ], loc=(-0.37, -0.04, 0), parent=root)
    objs.append(board)

    # potato: empty at the board top, roll pivot at the potato centre
    potato = C.empty('potato', loc=(-0.37, -0.04, 0.04), parent=root)
    roll = C.empty('potato_roll', loc=(0, 0, RZ * 1.02), parent=potato)
    flesh = C.make('food_potato', potato_flesh(), parent=roll, shade='toon', outline=True, normals=False)
    objs += [potato, roll, flesh]
    for k in range(STRIPS):
        s, cen = peel_strip(k)
        pe = C.make('peel_%d' % k, s, loc=tuple(cen), parent=roll, shade='toon', outline=True, normals=False)
        objs.append(pe)
    objs.append(C.hit('hit_potato', (0, 0, RZ), (L * 1.5, RY * 3.4, RZ * 3.6), parent=potato))
    curl = C.make('peel_curl', peel_curl(), loc=(-0.75, -0.3, 0.03), parent=root, shade='toon', normals=False)
    objs.append(curl)

    # bowl
    bowl = C.empty('bowl', loc=(0.27, 0.06, 0), parent=root)
    wall = lambda z: 0.165 + (0.275 - 0.165) * (z - 0.02) / 0.18
    prof = [(0, 0), (0.15, 0), (0.165, 0.02), (wall(0.075), 0.075), (wall(0.085), 0.085), (wall(0.14), 0.14), (wall(0.15), 0.15),
            (0.275, 0.2), (0.265, 0.215), (0.25, 0.2), (0.14, 0.035), (0, 0.03)]

    def bowl_col(c, no):
        rad = math.hypot(c.x, c.y)
        outward = no.dot(Vector((c.x, c.y, 0)).normalized()) if rad > 1e-5 else 0.0
        if outward > 0.05 and c.z < 0.2:
            return P.lin('cranberry') if 0.085 < c.z < 0.14 else P.lin('cream')
        return P.lin('ceramic')
    bowl_mesh = C.make('bowl_mesh', sh.lathe(prof, segs=40).shade_face(bowl_col), parent=bowl, shade='toon', outline=True, normals=False)
    objs += [bowl, bowl_mesh]

    # mash with the chunky -> fluffy shape key
    bm, _ = mash_mesh()
    base, target = [], []
    for v in bm.verts:
        if v.co.z < -0.01:
            base.append(v.co.copy())
            target.append(v.co.copy())
            continue
        c, f = mash_heights(v.co.x, v.co.y)
        base.append(Vector((v.co.x, v.co.y, c)))
        target.append(Vector((v.co.x, v.co.y, f)))
    for v, b in zip(bm.verts, base):
        v.co = b

    def mash_col(co, no):
        n = noise.noise(co * 16.0)
        r = min(1.0, math.hypot(co.x, co.y) / RM)
        sw = math.sin(3 * math.atan2(co.y, co.x) + r * 9.0) * r * (1 - r) * 4
        return P.mix('potato', 'mash', min(1.0, max(0.0, 0.55 + 0.45 * sw + 0.2 * n)))
    mash = C.make('food_mash', S(bm).shade(mash_col), loc=(0, 0, 0.125), parent=bowl, shade='toon', normals=False)
    objs.append(mash)

    # loose chunks that sit on the pile and get squashed away
    chunk_pos = [(0.0, 0.02), (0.1, 0.06), (-0.09, 0.07), (0.05, -0.09), (-0.07, -0.07), (0.13, -0.04), (-0.13, 0.0)]
    for i, (cx, cy) in enumerate(chunk_pos):
        c, _f = mash_heights(cx, cy)
        sz = 0.085 + 0.02 * ((i * 37) % 3) / 2
        ch = C.make('chunk_%d' % i, sh.box(sz, sz * 0.9, sz * 0.8, r=0.02, seg=3, col='potato').noise(0.006, 9, i).at(0, 0, sz * 0.4),
                    loc=(cx, cy, 0.125 + c - 0.02), rot=(8 * i, 12 - 5 * i, 40 * i), parent=bowl, shade='toon', outline=True, normals=False)
        objs.append(ch)
    objs.append(C.hit('hit_bowl', (0, 0, 0.17), (0.72, 0.72, 0.5), parent=bowl))

    # butter pool decal on the finished mound
    pool = C.make('butter_pool', sh.ball(0.085, sub=3, col='butter', sz=0.22).noise(0.006, 12, 2), loc=(0.01, 0.0, 0.125 + 0.17), parent=bowl, shade='toon', normals=False)
    objs.append(pool)

    # utensil crock with the masher and the spoon, heads up
    crock = C.make('crock', sh.lathe([(0, 0), (0.085, 0), (0.1, 0.2), (0.088, 0.2), (0.075, 0.02), (0, 0.02)], segs=24, r=0.01).shade(
        lambda co, no: P.lin('sage') if co.z < 0.16 and math.hypot(co.x, co.y) > 0.07 else P.lin('cream')), loc=(0.54, 0.46, 0), parent=root)
    objs.append(crock)

    # masher: origin at the grip, head hangs down -Z
    mp = [
        sh.capsule(0.034, 0.17, col='wood').at(0, 0, -0.085),
        sh.tube([(0, 0, -0.08), (0, 0, -0.17), (0.055, 0, -0.25), (0.06, 0, -0.275)], r=0.011, col='steel'),
        sh.tube([(0, 0, -0.08), (0, 0, -0.17), (-0.055, 0, -0.25), (-0.06, 0, -0.275)], r=0.011, col='steel'),
        sh.torus(0.085, 0.013, segs=28, rsegs=8, col='steel').at(0, 0, -0.275),
    ]
    for yy in (-0.045, 0.0, 0.045):
        half = math.sqrt(max(0.0, 0.085 ** 2 - yy ** 2))
        mp.append(sh.tube([(-half, yy, -0.275), (half, yy, -0.275)], r=0.011, col='steel', segs=8))
    masher = C.make('masher', mp, loc=(0.52, 0.46, 0.3), rot=(180, 0, 20), parent=root, shade='toon', outline=True, normals=False)
    objs.append(masher)
    objs.append(C.hit('hit_masher', (0, 0, -0.13), (0.34, 0.34, 0.5), parent=masher))

    # wooden spoon: origin at the grip, bowl end down -Z
    spoon = C.make('spoon', [
        sh.tube([(0, 0, 0.06), (0, 0, -0.1), (0, 0, -0.2)], r=[0.016, 0.014, 0.012], col='wood_light'),
        sh.ball(0.05, sub=2, col='wood_light', sx=0.85, sy=0.3, sz=1.25).at(0, 0, -0.25),
    ], loc=(0.58, 0.48, 0.3), rot=(180, 0, -30), parent=root, shade='toon', outline=True, normals=False)
    objs.append(spoon)

    # butter on its dish
    dish = C.make('butter_dish', sh.lathe([(0, 0), (0.08, 0), (0.13, 0.022), (0.125, 0.032), (0.075, 0.014), (0, 0.014)], segs=28, r=0.006).shade(
        lambda co, no: P.lin('sage') if math.hypot(co.x, co.y) > 0.1 else P.lin('ceramic')), loc=(-0.02, -0.36, 0), parent=root, shade='toon')
    butter = C.make('food_butter', sh.box(0.12, 0.075, 0.05, r=0.012, seg=3, col='butter').at(0, 0, 0.025), loc=(-0.02, -0.36, 0.016), rot=(0, 0, 14), parent=root, shade='toon', outline=True)
    objs += [dish, butter]
    objs.append(C.hit('hit_butter', (0, 0, 0.05), (0.36, 0.3, 0.26), parent=butter))

    # camera pose for the station (the game fits fit_w x fit_h metres around the target)
    objs.append(C.empty('cam_potato_target', loc=(-0.05, 0.06, 0.2), parent=root))
    objs.append(C.empty('cam_potato', loc=(-0.05 - 0.6, 0.06 - 1.9, 0.2 + 1.45), parent=root, props={'fit_w': 2.25, 'fit_h': 1.4}))
    objs.append(C.empty('socket_gobbles', loc=(-0.78, 0.36, 0), parent=root))
    objs.append(C.empty('socket_tool', loc=(0.27, 0.06, 0.62), parent=root))

    static = [board, crock, dish, bowl_mesh]
    C.bake_ao(static, floor_z=0.0, dist=0.3, strength=0.9)
    movable = [o for o in objs if o.type == 'MESH' and not o.get('hit') and o not in static and o.name not in ('peel_curl', 'butter_pool', 'food_mash')]
    for o in movable:
        C.bake_ao([o], floor_z=0.0 if o.name.startswith(('food_butter',)) else None, dist=0.2, strength=0.7)
    C.bake_ao([mash], occluders=[mash, bowl_mesh], dist=0.12, strength=0.4)

    # shape keys last (the plan: after everything that rebuilds the mesh)
    mash.shape_key_add(name='Basis')
    kb = mash.shape_key_add(name='Mashed')
    for i, t in enumerate(target):
        kb.data[i].co = t

    C.export_glb(os.path.join(out, 'potato.glb'), objs)
    if preview:
        C.render_preview(os.path.join(out, 'preview', 'potato.png'), target=(0.05, 0, 0.1), dist=2.0, yaw=0, pitch=40)
        kb.value = 1.0
        for o in objs:
            if o.name.startswith(('chunk_', 'peel_')) and o.name != 'peel_curl':
                o.hide_render = True
        C.render_preview(os.path.join(out, 'preview', 'potato_mashed.png'), target=(0.1, 0, 0.1), dist=1.5, yaw=0, pitch=40)
