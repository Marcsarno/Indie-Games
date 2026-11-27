"""Small shared props: service bell, dinner plate, candle, the bobbing arrow, a serving blob."""
import math
import os
from mathutils import Vector
from lib import shapes as sh, common as C, palette as P


def build(out, preview):
    objs = []
    # service bell: base, dome, plunger (separate so it can dip)
    bell = C.empty('bell', loc=(0, 0, 0))
    base = C.make('bell_base', sh.cyl(0.115, 0.03, bevel=0.01, segs=28, col='ink'), parent=bell, shade='toon', outline=True)
    dome_prof = [(0, 0.03), (0.092, 0.03)] + [(0.092 * math.cos(math.radians(a)), 0.03 + 0.085 * math.sin(math.radians(a))) for a in range(10, 90, 10)] + [(0, 0.115)]
    dome = C.make('bell_dome', sh.lathe(dome_prof, segs=28, col='butter').shade(lambda co, no: P.mix('butter', 'white', max(0.0, no.z) * 0.35)), parent=bell, shade='toon', outline=True, normals=False)
    knob = C.make('bell_knob', [sh.cyl(0.016, 0.03, bevel=0.004, segs=12, col='steel_dark'), sh.cyl(0.03, 0.016, bevel=0.006, segs=14, col='steel').at(0, 0, 0.026)], loc=(0, 0, 0.112), parent=bell, shade='toon', outline=True)
    objs += [bell, base, dome, knob, C.hit('hit_bell', (0, 0, 0.08), (0.36, 0.36, 0.34), parent=bell)]

    # glowing ring that marks where the next thing goes
    objs.append(C.make('slot_ring', sh.torus(0.2, 0.018, segs=28, rsegs=6, col='white').at(0, 0, 0.012), loc=(0.5, 0, 0), shade='glow', normals=False, props={'color': 'glow'}))

    # candle with holder; the flame is separate (hidden until dinner)
    candle = C.empty('candle', loc=(1.0, 0, 0))
    objs.append(candle)
    objs.append(C.make('candle_body', [
        sh.lathe([(0, 0), (0.06, 0), (0.07, 0.012), (0.035, 0.03), (0.03, 0.045), (0, 0.045)], segs=20, col='butter', r=0.004),
        sh.cyl(0.024, 0.2, bevel=0.008, segs=14, col='cream').at(0, 0, 0.04),
        sh.cyl(0.003, 0.02, bevel=0.001, segs=6, col='ink').at(0, 0, 0.238),
        sh.ball(0.011, sub=1, col='cream', sz=2.2).at(0.022, 0.006, 0.205), sh.ball(0.009, sub=1, col='cream', sz=2.6).at(-0.012, -0.02, 0.185),
        sh.torus(0.022, 0.007, segs=14, rsegs=6, col='butter').rot(90, 0, 0).at(0.082, 0, 0.022),
    ], parent=candle, shade='toon'))
    flame_prof = [(0, 0), (0.016, 0.012), (0.02, 0.03), (0.012, 0.055), (0, 0.085)]
    objs.append(C.make('candle_flame', sh.lathe(flame_prof, segs=12, col='glow').shade(lambda co, no: P.mix('pumpkin', 'glow', min(1.0, co.z / 0.05))), loc=(0, 0, 0.25), parent=candle, shade='glow', normals=False))

    # chunky bobbing arrow that marks a dish you can pick
    arrow_outline = [(-0.05, 0.16), (0.05, 0.16), (0.05, 0.02), (0.11, 0.02), (0, -0.12), (-0.11, 0.02), (-0.05, 0.02)]
    objs.append(C.make('arrow', sh.prism(arrow_outline, 0.06, bevel=0.018, seg=3, col='butter').rot(90, 0, 0), loc=(1.5, 0, 0.15), shade='toon', outline=True))

    # a rounded serving blob (recoloured in the game for each dish)
    objs.append(C.make('serving', sh.ball(0.06, sub=2, col='white', sz=0.7).noise(0.006, 10, 1).at(0, 0, 0.035), loc=(2.0, 0, 0), shade='toon', normals=False))

    C.bake_ao([o for o in objs if o.type == 'MESH' and o.name not in ('candle_flame', 'arrow', 'serving', 'slot_ring')], floor_z=0.0, dist=0.2, strength=0.8)
    C.export_glb(os.path.join(out, 'props.glb'), objs)
    if preview:
        C.render_preview(os.path.join(out, 'preview', 'props.png'), target=(0.9, 0, 0.1), dist=3.2, yaw=0, pitch=30)
