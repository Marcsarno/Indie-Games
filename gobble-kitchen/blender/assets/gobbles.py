"""Gobbles the turkey sous-chef: one rigid-skinned mesh on a small rig, plus hats/disguises and the demo wing.
He faces -Y (toward the player), stands on z=0, about 0.55 m tall (toy scale, he stands on the counter)."""
import math
import os
import bpy
from mathutils import Vector
from lib import shapes as sh, common as C, palette as P

BONES = ['root', 'body', 'head', 'eye_L', 'eye_R', 'pupil_L', 'pupil_R', 'jaw', 'wattle', 'wing_L', 'wing_R', 'tail']
B = {n: i for i, n in enumerate(BONES)}
HEAD_Z = 0.36
EYE = (0.062, -0.098, 0.455)


def build(out, preview):
    pcs = []

    # legs and feet (root)
    for sx in (-1, 1):
        pcs.append(sh.tube([(0.06 * sx, 0, 0.1), (0.06 * sx, -0.005, 0.02)], r=0.013, col='beak').bone(B['root']))
        pcs.append(sh.ball(0.04, sub=2, col='beak', sx=1.0, sy=1.5, sz=0.4).at(0.06 * sx, -0.035, 0.014).bone(B['root']))

    # pear body with a pale belly
    def body_col(co, no):
        belly = (-co.y - 0.045) * 9 + (0.26 - abs(co.z - 0.19)) * 2.0 - abs(co.x) * 5
        t = min(1.0, max(0.0, belly))
        base = P.mix('feather_dark', 'feather', min(1.0, max(0.0, (co.z - 0.05) / 0.2)))
        return P.mix(base, 'feather_light', t * t * (3 - 2 * t))
    body = sh.uvball(1.0, segs=24, rings=16).scale(0.175, 0.165, 0.185)
    body.bend(lambda v: Vector((v.x * (1.12 - 1.6 * v.z), v.y * (1.12 - 1.6 * v.z), v.z)))
    body.at(0, 0, 0.215).shade(body_col).bone(B['body'])
    pcs.append(body)

    # head
    def head_col(co, no):
        return P.mix('feather', 'feather_light', min(1.0, max(0.0, (-co.y - 0.02) * 7)) * 0.55)
    pcs.append(sh.uvball(0.125, segs=22, rings=14).scale(1.04, 0.98, 0.98).at(0, -0.012, 0.44).shade(head_col).bone(B['head']))
    # tuft
    for i, (dx, lean) in enumerate(((-0.03, -22), (0.0, 0), (0.03, 22))):
        pcs.append(sh.ball(0.022, sub=2, col='feather_dark', sx=0.7, sy=0.6, sz=1.9).rot(0, lean, 0).at(dx, 0.0, 0.565).bone(B['head']))

    # eyes: whites on eye bones (blink = squash), pupils on pupil bones (look-at)
    for sx, eb, pb in ((-1, 'eye_R', 'pupil_R'), (1, 'eye_L', 'pupil_L')):
        pcs.append(sh.uvball(0.052, segs=16, rings=10, col='white').scale(1.0, 0.55, 1.08).at(EYE[0] * sx, EYE[1], EYE[2]).bone(B[eb]))
        pcs.append(sh.uvball(0.027, segs=12, rings=8, col='eye').scale(1.0, 0.5, 1.0).at(EYE[0] * sx * 0.92, EYE[1] - 0.022, EYE[2] - 0.004).bone(B[pb]))
        pcs.append(sh.ball(0.008, sub=1, col='white').at(EYE[0] * sx * 0.92 + 0.008, EYE[1] - 0.034, EYE[2] + 0.008).bone(B[pb]))

    # beak: upper on the head, lower on the jaw
    pcs.append(sh.lathe([(0, 0), (0.036, 0.0), (0.028, 0.03), (0.012, 0.062), (0, 0.07)], segs=12, col='beak', r=0.006).scale(1.0, 0.7, 1.0).rot(90, 0, 0).at(0, -0.118, 0.405).bone(B['head']))
    pcs.append(sh.lathe([(0, 0), (0.026, 0.0), (0.02, 0.025), (0.008, 0.045), (0, 0.05)], segs=10, col='pumpkin', r=0.005).scale(1.0, 0.45, 1.0).rot(90, 0, 0).at(0, -0.118, 0.386).bone(B['jaw']))
    # wattle
    pcs.append(sh.ball(0.02, sub=2, col='wattle', sx=0.8, sy=0.8, sz=1.7).at(0.026, -0.128, 0.365).bone(B['wattle']))

    # stubby wings
    def wing_col(co, no):
        return P.mix('feather', 'feather_dark', min(1.0, max(0.0, (0.26 - co.z) * 6)))
    for sx, bn in ((-1, 'wing_R'), (1, 'wing_L')):
        w = sh.ball(0.09, sub=3, sx=0.42, sy=0.85, sz=1.15).rot(0, -14 * sx, 0).at(0.175 * sx, 0.005, 0.2).shade(wing_col).bone(B[bn])
        pcs.append(w)

    # tail fan: 7 banded feathers
    def feather_col(co, no):
        d = co.length
        if d > 0.36:
            return P.lin('cream')
        if d > 0.28:
            return P.lin('pumpkin')
        if d > 0.2:
            return P.lin('cranberry')
        return P.lin('feather_dark')
    for i in range(7):
        a = -66 + 22 * i
        f = sh.ball(0.5, sub=3, sx=0.125, sy=0.035, sz=0.44).at(0, 0, 0.21)
        f.shade(feather_col).rot(0, a, 0).rot(-12, 0, 0).at(0, 0.12, 0.17).bone(B['tail'])
        pcs.append(f)

    mesh = C.make('gobbles_mesh', pcs, shade='toon', outline=True, normals=False)
    C.bake_ao([mesh], dist=0.16, strength=0.75, floor_z=0.0)

    Z = lambda x, y, z, l=0.08: ((x, y, z), (x, y, z + l))
    bones = [
        ('root', *Z(0, 0, 0), None),
        ('body', *Z(0, 0, 0.06, 0.2), 'root'),
        ('head', *Z(0, 0, HEAD_Z, 0.15), 'body'),
        ('eye_L', *Z(EYE[0], EYE[1], EYE[2], 0.04), 'head'),
        ('eye_R', *Z(-EYE[0], EYE[1], EYE[2], 0.04), 'head'),
        ('pupil_L', *Z(EYE[0] * 0.92, EYE[1] - 0.022, EYE[2] - 0.004, 0.03), 'eye_L'),
        ('pupil_R', *Z(-EYE[0] * 0.92, EYE[1] - 0.022, EYE[2] - 0.004, 0.03), 'eye_R'),
        ('jaw', *Z(0, -0.105, 0.39, 0.03), 'head'),
        ('wattle', *Z(0.026, -0.12, 0.385, 0.03), 'head'),
        ('wing_L', *Z(0.15, 0.0, 0.28, 0.06), 'body'),
        ('wing_R', *Z(-0.15, 0.0, 0.28, 0.06), 'body'),
        ('tail', *Z(0, 0.11, 0.16, 0.1), 'body'),
    ]
    arm = C.armature('gobbles', bones)
    C.skin(mesh, arm, BONES)
    objs = [arm, mesh]
    objs.append(C.hit('hit_gobbles', (0, 0, 0.3), (0.6, 0.5, 0.75), parent=arm))

    # ---- hats and disguises: origin = head bone origin, so the game parents them to the head bone at 0,0,0
    hats = C.empty('hats', loc=(1.0, 0, 0))
    objs.append(hats)
    H = (0, 0, HEAD_Z)

    def hat(name, pieces, i):
        o = C.make(name, pieces, loc=(0.5 * i, 0, HEAD_Z), parent=hats, shade='toon', outline=True, normals=False)
        objs.append(o)
        return o
    top = 0.44 + 0.115 - HEAD_Z  # top of the head relative to the head bone
    # chef toque
    hat('hat_chef', [
        sh.cyl(0.085, 0.06, bevel=0.012, segs=20, col='white').at(0, -0.01, top - 0.03),
        sh.ball(0.105, sub=3, col='white', sz=0.72).noise(0.012, 9, 3).at(0, -0.01, top + 0.075),
    ], 0)
    # pumpkin helmet (covers the top of the head, eye hole cut-outs are just painted dark)
    def pump_col(co, no):
        a = math.atan2(co.y, co.x)
        return P.mix('pumpkin', 'roast', 0.5 + 0.5 * math.cos(a * 8))
    hat('dis_pumpkin', [
        sh.uvball(0.15, segs=24, rings=12).scale(1.05, 1.0, 0.8).bend(lambda v: v if v.z > -0.02 else Vector((v.x, v.y, -0.02))).shade(pump_col).at(0, -0.01, top - 0.04),
        sh.cyl(0.018, 0.06, bevel=0.006, segs=10, col='green').rot(0, 12, 0).at(0, -0.01, top + 0.07),
        sh.ball(0.04, sub=2, col='green', sx=1.3, sy=0.8, sz=0.2).at(0.05, -0.01, top + 0.085),
    ], 1)
    # big fake mustache (sits under the beak)
    m = []
    for sx in (-1, 1):
        m.append(sh.tube([(0.0, 0, 0), (0.05 * sx, 0, -0.012), (0.1 * sx, 0, 0.0), (0.135 * sx, 0, 0.03)], r=[0.026, 0.03, 0.022, 0.008], col='ink', segs=10))
    hat('dis_mustache', [p.at(0, -0.15, 0.39 - HEAD_Z) for p in m], 2)
    # leaf crown
    leaves = []
    for i in range(8):
        a = 2 * math.pi * i / 8
        col = ('pumpkin', 'leaf', 'cranberry', 'butter')[i % 4]
        leaves.append(sh.ball(0.05, sub=2, col=col, sx=0.6, sy=0.25, sz=1.25).rot(-24, 0, 0).rot(0, 0, math.degrees(a)).at(math.sin(a) * -0.105, math.cos(a) * 0.105 - 0.01, top - 0.03))
    leaves.append(sh.torus(0.105, 0.012, segs=20, rsegs=6, col='cinnamon').at(0, -0.01, top - 0.055))
    hat('dis_leaf', leaves, 3)
    # paper pilgrim hat (for dinner)
    hat('hat_pilgrim', [
        sh.cyl(0.14, 0.014, bevel=0.005, segs=24, col='ink').at(0, -0.01, top - 0.035),
        sh.lathe([(0, 0), (0.085, 0), (0.07, 0.13), (0, 0.13)], segs=20, col='ink', r=0.01).at(0, -0.01, top - 0.03),
        sh.lathe([(0.079, 0.0), (0.09, 0.0), (0.088, 0.03), (0.077, 0.03)], segs=20, col='cream').at(0, -0.01, top - 0.018),
        sh.box(0.045, 0.012, 0.04, r=0.005, col='butter').at(0, -0.01 - 0.086, top - 0.003),
    ], 4)

    # ---- the demo hand: a wing that points. Origin at the pointing tip; it points down (-Z).
    def dw_col(co, no):
        return P.mix('feather_light', 'feather', min(1.0, max(0.0, co.z * 5)))
    wing = [
        sh.ball(0.075, sub=3, sx=0.9, sy=0.45, sz=1.2).at(0.02, 0, 0.2).shade(dw_col),
        sh.capsule(0.028, 0.17, segs=12).at(0, 0, 0.0).shade(dw_col),
        sh.capsule(0.026, 0.11, segs=12).rot(0, 38, 0).at(0.035, 0, 0.1).shade(dw_col),
        sh.capsule(0.024, 0.09, segs=12).rot(0, 62, 0).at(0.05, 0, 0.14).shade(dw_col),
    ]
    objs.append(C.make('demo_wing', wing, loc=(3.6, 0, 0.1), shade='toon', outline=True, normals=False))

    C.export_glb(os.path.join(out, 'gobbles.glb'), objs)
    if preview:
        for o in objs:
            if o.name.startswith(('hat_', 'dis_')) and o.name != 'hat_chef':
                o.hide_render = True
        chef = bpy.data.objects['hat_chef']
        chef.parent = None
        chef.location = (0, 0, HEAD_Z)
        C.render_preview(os.path.join(out, 'preview', 'gobbles.png'), target=(0, 0, 0.3), dist=1.5, yaw=20, pitch=12)
        C.render_preview(os.path.join(out, 'preview', 'gobbles_side.png'), target=(0, 0, 0.3), dist=1.5, yaw=100, pitch=10)
        chef.hide_render = True
        for o in objs:
            o.hide_render = not o.name.startswith(('hat_', 'dis_', 'demo_'))
        chef.hide_render = True
        C.render_preview(os.path.join(out, 'preview', 'hats.png'), target=(2.3, 0, 0.45), dist=4.0, yaw=0, pitch=15)
