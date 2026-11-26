"""Toy 'peg person' guest: one rigid-skinned mesh on a 5-bone rig, tint zones for skin and shirt
(the game multiplies the white vertex colours by a colour per zone), plus hair and hat pieces.
Faces -Y, stands on z=0, about 0.95 m tall."""
import math
import os
import bpy
from mathutils import Vector
from lib import shapes as sh, common as C, palette as P

BONES = ['root', 'body', 'head', 'arm_L', 'arm_R']
B = {n: i for i, n in enumerate(BONES)}
ZONE_FIXED, ZONE_SKIN, ZONE_SHIRT = 0, 1, 2
HEAD_Z = 0.56
HEAD_C = (0, 0, 0.74)
HEAD_R = 0.19


def build(out, preview):
    pcs = []
    # peg body: tapered, round bottom (no legs, like a wooden toy figure)
    prof = [(0, 0), (0.15, 0.0), (0.2, 0.06), (0.19, 0.3), (0.15, 0.5), (0.1, 0.57), (0, 0.58)]
    pcs.append(sh.lathe(prof, segs=24, col='white', r=0.03).scale(1.0, 0.86, 1.0).zone(ZONE_SHIRT).bone(B['body']))
    # collar
    pcs.append(sh.torus(0.105, 0.022, segs=20, rsegs=8, col='cream').scale(1, 0.9, 1).at(0, 0, 0.555).zone(ZONE_FIXED).bone(B['body']))
    # head
    pcs.append(sh.uvball(HEAD_R, segs=24, rings=16, col='white').scale(1.0, 0.96, 0.98).at(*HEAD_C).zone(ZONE_SKIN).bone(B['head']))
    # face: eyes, cheeks, smile, nose
    fy = -HEAD_R * 0.9
    for sx in (-1, 1):
        pcs.append(sh.uvball(0.026, segs=10, rings=8, col='eye').scale(1, 0.5, 1.15).at(0.066 * sx, fy - 0.012, 0.765).zone(ZONE_FIXED).bone(B['head']))
        pcs.append(sh.ball(0.008, sub=1, col='white').at(0.066 * sx + 0.008, fy - 0.026, 0.775).zone(ZONE_FIXED).bone(B['head']))
        pcs.append(sh.ball(0.03, sub=2, col='#F0907A', sy=0.25, sz=0.7).at(0.115 * sx, fy + 0.022, 0.715).zone(ZONE_FIXED).bone(B['head']))
    smile = [(0.055 * math.sin(math.radians(a)), fy - 0.008 + 0.012 * (1 - math.cos(math.radians(a))), 0.708 - 0.03 * math.cos(math.radians(a)) + 0.03) for a in range(-60, 61, 20)]
    pcs.append(sh.tube(smile, r=0.008, segs=6, col='ink').at(0, 0, -0.022).zone(ZONE_FIXED).bone(B['head']))
    pcs.append(sh.ball(0.018, sub=1, col='white').at(0, fy - 0.014, 0.735).zone(ZONE_SKIN).bone(B['head']))
    # arms: sleeve + hand; origin of each arm bone at the shoulder
    for sx, bn in ((-1, 'arm_R'), (1, 'arm_L')):
        pcs.append(sh.capsule(0.05, 0.25, segs=12, col='white').rot(0, 180 - 14 * sx, 0).at(0.2 * sx, 0, 0.48).zone(ZONE_SHIRT).bone(B[bn]))
        pcs.append(sh.ball(0.052, sub=2, col='white').at(0.262 * sx, 0, 0.235).zone(ZONE_SKIN).bone(B[bn]))

    mesh = C.make('guest_mesh', pcs, shade='toon', outline=True, normals=False)
    C.bake_ao([mesh], dist=0.2, strength=0.7, floor_z=0.0)
    Z = lambda x, y, z, l=0.1: ((x, y, z), (x, y, z + l))
    arm = C.armature('guest', [
        ('root', *Z(0, 0, 0), None),
        ('body', *Z(0, 0, 0.05, 0.3), 'root'),
        ('head', *Z(0, 0, HEAD_Z, 0.2), 'body'),
        ('arm_L', *Z(0.2, 0, 0.46, 0.08), 'body'),
        ('arm_R', *Z(-0.2, 0, 0.46, 0.08), 'body'),
    ])
    C.skin(mesh, arm, BONES)
    objs = [arm, mesh, C.hit('hit_guest', (0, 0, 0.5), (0.75, 0.6, 1.2), parent=arm)]

    # ---- hair and hats: origin = head bone origin; white where the game tints them
    extras = C.empty('guest_extras', loc=(1.2, 0, 0))
    objs.append(extras)
    hz = HEAD_C[2] - HEAD_Z
    n = [0]

    def piece(name, pieces, tint=True):
        o = C.make(name, pieces, loc=(0.6 * n[0], 0, HEAD_Z), parent=extras, shade='toon', outline=True, normals=False, props={'tint': 1 if tint else 0})
        n[0] += 1
        objs.append(o)
        return o

    def cap(front=0.05, drop=0.0):
        """Hair cap: the top of a slightly bigger sphere, cut by a plane that tilts down toward the back."""
        s = sh.uvball(HEAD_R * 1.07, segs=24, rings=16, col='white').scale(1.0, 0.98, 1.0)
        def cut(v):
            lim = front + v.y * -0.55 - drop
            return v if v.z > lim else Vector((v.x * 0.97, v.y * 0.97, lim))
        return s.bend(cut).at(0, 0.004, hz)

    piece('hair_bowl', [cap(0.07)])
    piece('hair_bun', [cap(0.09), sh.ball(0.085, sub=2, col='white').at(0, 0.03, hz + HEAD_R + 0.045)])
    piece('hair_pigtails', [cap(0.07), sh.ball(0.075, sub=2, col='white', sz=1.2).at(0.2, 0.03, hz + 0.02), sh.ball(0.075, sub=2, col='white', sz=1.2).at(-0.2, 0.03, hz + 0.02)])
    piece('hair_curly', [cap(0.1)] + [sh.ball(0.062, sub=2, col='white').at(math.cos(a) * 0.14 * math.cos(b), math.sin(a) * 0.14 * math.cos(b) + 0.01, hz + 0.1 + 0.13 * math.sin(b))
                                      for a, b in [(i * 1.05, 0.35) for i in range(6)] + [(i * 1.57 + 0.5, 1.0) for i in range(4)]])
    piece('hair_side', [sh.ball(0.07, sub=2, col='white', sx=0.6).at(0.165, 0.03, hz + 0.02), sh.ball(0.07, sub=2, col='white', sx=0.6).at(-0.165, 0.03, hz + 0.02),
                        sh.tube([(-0.07, -HEAD_R * 0.93, hz - 0.035), (0, -HEAD_R * 0.97, hz - 0.025), (0.07, -HEAD_R * 0.93, hz - 0.035)], r=[0.012, 0.022, 0.012], segs=8, col='white')])
    # glasses (fixed colour)
    g = [sh.torus(0.045, 0.006, segs=16, rsegs=6, col='cinnamon').rot(90, 0, 0).at(0.066 * sx, -HEAD_R * 0.93, hz + 0.025) for sx in (-1, 1)]
    g.append(sh.tube([(-0.022, -HEAD_R * 0.95, hz + 0.03), (0.022, -HEAD_R * 0.95, hz + 0.03)], r=0.005, segs=6, col='cinnamon'))
    piece('acc_glasses', g, tint=False)
    # party hat
    piece('hat_party', [
        sh.lathe([(0, 0), (0.085, 0), (0.0, 0.2)], segs=16, col='white', r=0.01).at(0, 0, hz + HEAD_R - 0.02),
        sh.ball(0.03, sub=2, col='white').at(0, 0, hz + HEAD_R + 0.185),
    ])

    C.export_glb(os.path.join(out, 'guest.glb'), objs)
    if preview:
        for nm in ('hair_bowl',):
            o = bpy.data.objects[nm]
            o.parent = None
            o.location = (0, 0, HEAD_Z)
        C.render_preview(os.path.join(out, 'preview', 'guest.png'), target=(1.6, 0, 0.55), dist=6.5, yaw=0, pitch=10)
