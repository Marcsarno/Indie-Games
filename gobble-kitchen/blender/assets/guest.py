"""Toy 'peg person' guest: one rigid-skinned mesh on a 5-bone rig. The mesh is white where the game tints it
(_zone: 1 skin, 2 shirt, 3 lower body, 4 forearm = shirt for long sleeves or skin for short ones).
Hair, glasses and shirt patterns are separate pieces the game parents to the head or body bone.
Faces -Y, stands on z=0, about 0.95 m tall."""
import math
import os
import bpy
from mathutils import Vector
from lib import shapes as sh, common as C, palette as P

BONES = ['root', 'body', 'head', 'arm_L', 'arm_R']
B = {n: i for i, n in enumerate(BONES)}
Z_FIXED, Z_SKIN, Z_SHIRT, Z_LOWER, Z_FOREARM, Z_BROW = 0, 1, 2, 3, 4, 5
BODY_Z = 0.05
HEAD_Z = 0.56
HEAD_C = (0, 0, 0.74)
HEAD_R = 0.19
SPLIT = 0.2
PROFILE = [(0.15, 0.0), (0.2, 0.06), (0.19, 0.3), (0.15, 0.5), (0.1, 0.57)]
SQ = 0.86     # the body is a little flat front to back


def body_r(z):
    for (r0, z0), (r1, z1) in zip(PROFILE[:-1], PROFILE[1:]):
        if z0 <= z <= z1:
            return r0 + (r1 - r0) * (z - z0) / (z1 - z0)
    return PROFILE[-1][0]


def on_body(angle_deg, z, out=0.0):
    """A point on the torso surface; angle 0 = front (-Y), positive toward +X."""
    a = math.radians(angle_deg)
    r = body_r(z) + out
    return (r * math.sin(a), -r * SQ * math.cos(a), z)


def build(out, preview):
    pcs = []
    # peg body: tapered, round bottom (no legs, like a wooden toy figure); a doubled ring keeps the
    # shirt / lower-body colour split crisp
    prof = [(0, 0), (0.15, 0.0), (0.2, 0.06), (body_r(SPLIT), SPLIT), (body_r(SPLIT + 0.002), SPLIT + 0.002), (0.19, 0.3), (0.15, 0.5), (0.1, 0.57), (0, 0.58)]
    pcs.append(sh.lathe(prof, segs=28, col='white', r=0.03).scale(1.0, SQ, 1.0).zone_by(lambda c: Z_LOWER if c.z <= SPLIT + 0.001 else Z_SHIRT).bone(B['body']))
    # head
    pcs.append(sh.uvball(HEAD_R, segs=24, rings=16, col='white').scale(1.0, 0.96, 0.98).at(*HEAD_C).zone(Z_SKIN).bone(B['head']))
    # face: eyes, cheeks, smile, nose (no ink outline on these: at this size it would swallow them)
    fy = -HEAD_R * 0.9
    for sx in (-1, 1):
        pcs.append(sh.uvball(0.027, segs=10, rings=8, col='eye').scale(1, 0.5, 1.2).at(0.068 * sx, fy - 0.012, 0.765).zone(Z_FIXED).noline().bone(B['head']))
        pcs.append(sh.ball(0.009, sub=1, col='white').at(0.068 * sx + 0.008, fy - 0.026, 0.776).zone(Z_FIXED).noline().bone(B['head']))
        pcs.append(sh.ball(0.032, sub=2, col='#F2917C', sy=0.25, sz=0.7).at(0.118 * sx, fy + 0.024, 0.712).zone(Z_FIXED).noline().bone(B['head']))
    for sx in (-1, 1):
        pcs.append(sh.ball(0.04, sub=2, col='white', sx=0.5, sy=0.8, sz=1.0).at(0.186 * sx, 0.0, 0.745).zone(Z_SKIN).bone(B['head']))
        brow = [(sx * (0.045 + 0.022 * k), fy - 0.012 + 0.006 * abs(k - 1), 0.808 + 0.008 * (1 - abs(k - 1))) for k in range(3)]
        pcs.append(sh.tube(brow, r=0.0065, segs=5, col='white').zone(Z_BROW).noline().bone(B['head']))
    smile = [(0.058 * math.sin(math.radians(a)), fy - 0.012 + 0.014 * (1 - math.cos(math.radians(a))), 0.716 - 0.032 * math.cos(math.radians(a))) for a in range(-62, 63, 15)]
    pcs.append(sh.tube(smile, r=0.0075, segs=6, col='#7A3B3F').zone(Z_FIXED).noline().bone(B['head']))
    pcs.append(sh.ball(0.02, sub=1, col='white').at(0, fy - 0.016, 0.737).zone(Z_SKIN).noline().bone(B['head']))
    # arms: sleeve + forearm + hand; each arm bone sits at the shoulder
    for sx, bn in ((-1, 'arm_R'), (1, 'arm_L')):
        pcs.append(sh.capsule(0.052, 0.26, segs=12, col='white').rot(0, 180 - 14 * sx, 0).at(0.2 * sx, 0, 0.48).zone_by(lambda c: Z_SHIRT if c.z > 0.37 else Z_FOREARM).bone(B[bn]))
        pcs.append(sh.ball(0.054, sub=2, col='white').at(0.264 * sx, 0, 0.228).zone(Z_SKIN).bone(B[bn]))

    mesh = C.make('guest_mesh', pcs, shade='toon', outline=True, normals=False)
    C.bake_ao([mesh], dist=0.2, strength=0.7, floor_z=0.0)
    Z = lambda x, y, z, l=0.1: ((x, y, z), (x, y, z + l))
    arm = C.armature('guest', [
        ('root', *Z(0, 0, 0), None),
        ('body', *Z(0, 0, BODY_Z, 0.3), 'root'),
        ('head', *Z(0, 0, HEAD_Z, 0.2), 'body'),
        ('arm_L', *Z(0.2, 0, 0.46, 0.08), 'body'),
        ('arm_R', *Z(-0.2, 0, 0.46, 0.08), 'body'),
    ])
    C.skin(mesh, arm, BONES)
    objs = [arm, mesh, C.hit('hit_guest', (0, 0, 0.5), (0.75, 0.6, 1.2), parent=arm)]

    # ---- extras: origin = the head (or body) bone origin, so the game parents them to that bone at 0,0,0
    extras = C.empty('guest_extras', loc=(1.2, 0, 0))
    objs.append(extras)
    hz = HEAD_C[2] - HEAD_Z
    n = [0]

    def piece(name, pieces, tint=True, bone='head'):
        oz = HEAD_Z if bone == 'head' else BODY_Z
        if bone == 'body':
            pieces = [p.at(0, 0, -oz) for p in pieces]   # body pieces are authored in figure space
        o = C.make(name, pieces, loc=(0.6 * n[0], 0, oz), parent=extras, shade='toon', outline=(bone == 'head'), normals=False,
                   props={'tint': 1 if tint else 0, 'bone': bone})
        n[0] += 1
        objs.append(o)
        C.bake_ao([o], dist=0.1, strength=0.5)
        return o

    def cap(front=0.05, grow=1.07):
        """Hair cap: the top of a slightly bigger sphere, cut by a plane that tilts down toward the back."""
        s = sh.uvball(HEAD_R * grow, segs=24, rings=16, col='white').scale(1.0, 0.98, 1.0)

        def cut(v):
            lim = front + v.y * -0.55
            return v if v.z > lim else Vector((v.x * 0.97, v.y * 0.97, lim))
        return s.bend(cut).at(0, 0.004, hz)

    piece('hair_bowl', [cap(0.07)])
    piece('hair_bun', [cap(0.09), sh.ball(0.085, sub=2, col='white').at(0, 0.03, hz + HEAD_R + 0.045)])
    piece('hair_pigtails', [cap(0.07), sh.ball(0.075, sub=2, col='white', sz=1.2).at(0.2, 0.03, hz + 0.02), sh.ball(0.075, sub=2, col='white', sz=1.2).at(-0.2, 0.03, hz + 0.02)])
    piece('hair_curly', [cap(0.1)] + [sh.ball(0.062, sub=2, col='white').at(math.cos(a) * 0.14 * math.cos(b), math.sin(a) * 0.14 * math.cos(b) + 0.01, hz + 0.1 + 0.13 * math.sin(b))
                                      for a, b in [(i * 1.05, 0.35) for i in range(6)] + [(i * 1.57 + 0.5, 1.0) for i in range(4)]])
    piece('hair_side', [sh.ball(0.07, sub=2, col='white', sx=0.6).at(0.165, 0.03, hz + 0.02), sh.ball(0.07, sub=2, col='white', sx=0.6).at(-0.165, 0.03, hz + 0.02),
                        sh.tube([(-0.07, -HEAD_R * 0.93, hz - 0.035), (0, -HEAD_R * 0.97, hz - 0.025), (0.07, -HEAD_R * 0.93, hz - 0.035)], r=[0.012, 0.022, 0.012], segs=8, col='white')])
    # straight shoulder-length bob with a side part
    bob = [cap(0.085, 1.08)]
    for sx in (-1, 1):
        bob.append(sh.ball(0.1, sub=3, col='white', sx=0.5, sy=1.25, sz=2.3).rot(0, 6 * sx, 0).at(0.172 * sx, 0.035, hz - 0.1))
        bob.append(sh.ball(0.06, sub=2, col='white', sx=0.7, sy=1.0, sz=0.8).at(0.2 * sx, 0.02, hz - 0.3))
    bob.append(sh.ball(0.17, sub=3, col='white', sx=1.05, sy=0.5, sz=1.55).at(0, 0.115, hz - 0.08))
    bob.append(sh.ball(0.1, sub=3, col='white', sx=1.8, sy=0.34, sz=0.6).rot(0, -12, 0).at(-0.03, -HEAD_R * 0.7, hz + 0.132).noline())
    piece('hair_bob', bob)
    # short, full hair with a side-swept fringe
    short = [cap(0.075, 1.13)]
    for sx in (-1, 1):
        short.append(sh.ball(0.085, sub=2, col='white', sx=0.75, sy=1.1, sz=1.2).at(0.178 * sx, 0.01, hz + 0.01))
    short.append(sh.ball(0.16, sub=3, col='white', sx=1.05, sy=0.6, sz=1.0).at(0, 0.1, hz + 0.02))
    short.append(sh.ball(0.1, sub=3, col='white', sx=1.8, sy=0.38, sz=0.62).rot(0, 14, 0).at(0.03, -HEAD_R * 0.7, hz + 0.132).noline())
    short.append(sh.ball(0.12, sub=2, col='white', sx=1.2, sy=1.1, sz=0.6).at(0, -0.01, hz + HEAD_R * 0.98))
    piece('hair_short', short)
    # swept-back hair with lift on top
    swoop = [cap(0.1, 1.08)]
    swoop.append(sh.ball(0.14, sub=3, col='white', sx=1.2, sy=1.25, sz=0.72).rot(-14, 0, 0).at(0, 0.0, hz + HEAD_R * 0.95))
    swoop.append(sh.ball(0.085, sub=2, col='white', sx=1.5, sy=0.9, sz=0.75).rot(-24, 0, 6).at(0.015, -0.115, hz + HEAD_R * 0.93).noline())
    for sx in (-1, 1):
        swoop.append(sh.ball(0.075, sub=2, col='white', sx=0.6, sy=1.2, sz=1.0).at(0.175 * sx, 0.03, hz + 0.05))
    piece('hair_swoop', swoop)

    # glasses and sunglasses (fixed colours)
    g = [sh.torus(0.045, 0.006, segs=16, rsegs=6, col='cinnamon').rot(90, 0, 0).at(0.066 * sx, -HEAD_R * 0.93, hz + 0.025) for sx in (-1, 1)]
    g.append(sh.tube([(-0.022, -HEAD_R * 0.95, hz + 0.03), (0.022, -HEAD_R * 0.95, hz + 0.03)], r=0.005, segs=6, col='cinnamon'))
    piece('acc_glasses', g, tint=False)
    sg = [sh.box(0.085, 0.02, 0.058, r=0.02, seg=3, col='ink').rot(0, 0, -9 * sx).at(0.07 * sx, -HEAD_R * 0.94, hz + 0.027) for sx in (-1, 1)]
    sg.append(sh.box(0.04, 0.014, 0.014, r=0.005, col='ink').at(0, -HEAD_R * 0.97, hz + 0.04))
    for sx in (-1, 1):
        sg.append(sh.tube([(0.112 * sx, -HEAD_R * 0.9, hz + 0.04), (0.185 * sx, -0.03, hz + 0.04)], r=0.007, segs=6, col='ink'))
        sg.append(sh.ball(0.012, sub=1, col='white', sy=0.3).at(0.055 * sx, -HEAD_R * 0.94 - 0.012, hz + 0.04))
    piece('acc_sunglasses', sg, tint=False)
    # hair pulled back into a ponytail
    pony = [cap(0.1, 1.07)]
    pony.append(sh.ball(0.05, sub=2, col='white', sx=1.0, sy=0.9, sz=0.8).at(0, 0.165, hz + 0.1))
    pony.append(sh.ball(0.075, sub=3, col='white', sx=0.85, sy=0.8, sz=1.9).rot(-28, 0, 0).at(0, 0.235, hz - 0.03))
    pony.append(sh.ball(0.1, sub=3, col='white', sx=1.7, sy=0.32, sz=0.5).rot(0, 10, 0).at(0.02, -HEAD_R * 0.7, hz + 0.14).noline())
    piece('hair_ponytail', pony)
    # a toddler's fine, wispy hair to the chin
    wisp = [cap(0.1, 1.06)]
    for sx in (-1, 1):
        wisp.append(sh.ball(0.085, sub=3, col='white', sx=0.5, sy=1.15, sz=1.75).rot(0, 12 * sx, 0).at(0.168 * sx, 0.03, hz - 0.03))
        wisp.append(sh.ball(0.045, sub=2, col='white', sx=0.9, sy=0.8, sz=0.7).rot(0, 40 * sx, 0).at(0.21 * sx, 0.02, hz - 0.15).noline())
    wisp.append(sh.ball(0.15, sub=3, col='white', sx=1.05, sy=0.5, sz=1.25).at(0, 0.11, hz - 0.03))
    wisp.append(sh.ball(0.09, sub=3, col='white', sx=1.6, sy=0.3, sz=0.55).rot(0, -18, 0).at(-0.03, -HEAD_R * 0.72, hz + 0.135).noline())
    wisp.append(sh.ball(0.03, sub=2, col='white', sx=0.6, sy=0.6, sz=1.4).rot(0, 30, 0).at(0.03, 0.0, hz + HEAD_R * 1.07))
    piece('hair_wispy', wisp)
    # a small chef's hat for the kitchen helper (fixed white)
    piece('hat_chef', [
        sh.cyl(0.1, 0.07, bevel=0.014, segs=20, col='white').at(0, 0.0, hz + HEAD_R * 0.86),
        sh.ball(0.125, sub=3, col='white', sz=0.72).noise(0.014, 9, 3).at(0, 0.0, hz + HEAD_R * 0.86 + 0.12),
    ], tint=False)
    # long straight hair past the shoulders
    lng = [cap(0.085, 1.08)]
    for sx in (-1, 1):
        lng.append(sh.ball(0.1, sub=3, col='white', sx=0.5, sy=1.2, sz=3.1).rot(0, 4 * sx, 0).at(0.175 * sx, 0.04, hz - 0.17))
    lng.append(sh.ball(0.17, sub=3, col='white', sx=1.05, sy=0.5, sz=2.1).at(0, 0.12, hz - 0.14))
    lng.append(sh.ball(0.1, sub=3, col='white', sx=1.8, sy=0.34, sz=0.55).rot(0, 12, 0).at(0.03, -HEAD_R * 0.7, hz + 0.135).noline())
    piece('hair_long', lng)
    # baseball cap (fixed dark) with short hair showing under it
    piece('hat_cap', [
        sh.uvball(HEAD_R * 1.09, segs=24, rings=14, col='#2B2832').scale(1, 1, 0.98).bend(lambda v: v if v.z > 0.085 else Vector((v.x * 0.97, v.y * 0.97, 0.085))).at(0, 0.004, hz),
        sh.ball(0.13, sub=3, col='#2B2832', sx=1.0, sy=1.1, sz=0.14).at(0, -HEAD_R * 0.98, hz + 0.1),
        sh.ball(0.02, sub=1, col='#2B2832').at(0, 0, hz + HEAD_R * 1.09),
    ], tint=False)
    # full beard along the jaw
    beard = [sh.ball(0.11, sub=3, col='white', sx=1.3, sy=0.75, sz=0.5).at(0, -HEAD_R * 0.5, hz - 0.15)]
    for sx in (-1, 1):
        beard.append(sh.ball(0.05, sub=2, col='white', sx=0.5, sy=1.0, sz=1.3).at(0.165 * sx, -HEAD_R * 0.3, hz - 0.075))
    piece('acc_beard', beard)
    # party hat
    piece('hat_party', [
        sh.lathe([(0, 0), (0.085, 0), (0.0, 0.2)], segs=16, col='white', r=0.01).at(0, 0, hz + HEAD_R - 0.02),
        sh.ball(0.03, sub=2, col='white').at(0, 0, hz + HEAD_R + 0.185),
    ])

    # shirt patterns and details (parented to the body bone)
    dots = []
    for row, z in enumerate((0.25, 0.33, 0.41, 0.49)):
        k = 9 if row < 3 else 7
        for i in range(k):
            a = (i + 0.5 * (row % 2)) * 360 / k
            dots.append(sh.ball(0.021, sub=1, col='white', sy=1.0).at(*on_body(a, z, -0.006)))
    dots.append(sh.tube([on_body(a, 0.555 - 0.035 * math.cos(math.radians(a * 2.2)), 0.004) for a in range(-40, 41, 10)], r=0.004, segs=5, col='butter'))
    dots.append(sh.ball(0.02, sub=1, col='butter', sy=0.5).at(*on_body(0, 0.515, 0.006)))
    piece('acc_dots', dots, tint=False, bone='body')

    import random
    rng = random.Random(7)
    blobs = []
    for i in range(26):
        a, z = rng.uniform(0, 360), rng.uniform(0.24, 0.52)
        blobs.append(sh.ball(rng.uniform(0.022, 0.036), sub=1, col='#EE7C95', sx=rng.uniform(0.8, 1.5), sz=rng.uniform(0.6, 1.2)).at(*on_body(a, z, -0.012)))
    # a little V neckline
    blobs.append(sh.tube([on_body(-14, 0.565, 0.003), on_body(0, 0.5, 0.004), on_body(14, 0.565, 0.003)], r=0.006, segs=5, col='#EE7C95'))
    piece('acc_toile', blobs, tint=False, bone='body')

    shirt = []
    for sx in (-1, 1):
        shirt.append(sh.prism([(0, 0), (0.075, 0.035), (0.03, -0.055)], 0.016, bevel=0.005, seg=1, col='white').scale(sx, 1, 1).rot(74, 0, 0).at(0.012 * sx, -body_r(0.555) * SQ - 0.012, 0.565))
    for z in (0.47, 0.39, 0.31):
        shirt.append(sh.ball(0.014, sub=1, col='white', sy=0.5).at(*on_body(0, z, 0.004)))
    shirt.append(sh.box(0.07, 0.012, 0.06, r=0.006, col='white').at(*on_body(26, 0.43, 0.002)).rot(0, 0, 0))
    piece('acc_shirt', shirt, tint=True, bone='body')

    # a printed tee: a big friendly letter-shape and a little round mascot on the chest
    pr = [sh.box(0.15, 0.014, 0.085, r=0.02, seg=2, col='white').at(*on_body(0, 0.43, 0.0)),
          sh.box(0.1, 0.014, 0.03, r=0.01, col='white').at(*on_body(0, 0.5, -0.004)),
          sh.ball(0.034, sub=2, col='ceramic', sy=0.4).at(*on_body(0, 0.335, 0.004))]
    piece('acc_print', pr, tint=True, bone='body')

    # thin stripes round a tee
    stripes = [sh.tube([on_body(a, z, 0.002) for a in range(0, 361, 20)], r=0.006, segs=5, col='#D9B98A') for z in (0.25, 0.31, 0.37, 0.43, 0.49)]
    piece('acc_stripes', stripes, tint=False, bone='body')
    # white tee showing at an open collar
    piece('acc_tee', [sh.prism([(-0.05, 0.0), (0.05, 0.0), (0, -0.11)], 0.012, bevel=0.004, seg=1, col='white').rot(78, 0, 0).at(0, -body_r(0.53) * SQ - 0.006, 0.565)], tint=False, bone='body')

    C.export_glb(os.path.join(out, 'guest.glb'), objs)
    if preview:
        looks = [('hair_bob', ['acc_dots']), ('hair_short', ['acc_toile']), ('hair_swoop', ['acc_sunglasses', 'acc_shirt'])]
        clones = []
        for i, (hair, acc) in enumerate(looks):
            for nm in [hair] + acc:
                o = bpy.data.objects[nm].copy()
                bpy.context.scene.collection.objects.link(o)
                o.parent = None
                o.location = (-0.75 * (i + 1) + 0.0, 0, HEAD_Z if o.get('bone') == 'head' else BODY_Z)
                clones.append(o)
            m = mesh.copy()
            bpy.context.scene.collection.objects.link(m)
            m.parent = None
            m.modifiers.clear()
            m.location = (-0.75 * (i + 1), 0, 0)
        for o in objs:
            o.hide_render = True
        C.render_preview(os.path.join(out, 'preview', 'guest.png'), target=(-1.5, 0, 0.5), dist=3.6, yaw=0, pitch=8)
        C.render_preview(os.path.join(out, 'preview', 'guest_side.png'), target=(-1.5, 0, 0.5), dist=3.6, yaw=140, pitch=12)
