"""Road kit test: python via blender -b --python scripts/roadtest.py"""
import sys, os, math, json; sys.path.insert(0, os.path.dirname(__file__))
from kit import *; from street_fl import mats; from lib import *; import roads as rd; import mood
reset(); mood.florida(); mood._transform(); m = mats()
T = Builder("terrain"); T.box(m["grass"], -100, 100, -100, 100, -.3, 0)
R = Builder("roads")
pk = rd.Road("Pkwy", [(16, -104), (13, -70), (5, -35), (-3, -5), (-9, 28), (-8, 62), (-2, 104)], hw=8.4, mh=1.6, rank=10, flare=7, xwalk=True)
wl = rd.Road("Wiles", [(-104, -14), (-72, -16), (-40, -10), (-12, -6), (8, -5), (30, -9), (58, -7.5)], hw=3.5, rank=8, flare=5.5)
pl = rd.Road("Palm Lane", [(-3, 29), (-20, 28), (-34, 34), (-44, 48), (-40, 64), (-28, 75.5)], hw=3.5, rank=6)
cds = rd.ring_road("Cul", -26, 81, 6.0, 2.8, rank=7, seam=-math.pi / 2 + .7)
ring = rd.ring_road("Roundabout", 66, -8, 10, 3.6, rank=9, seam=math.pi * 1.5)
we = rd.Road("Wiles E", [(74, -8), (104, -2)], hw=3.5, rank=8, flare=5.5)
wl2 = rd.Road("Wiles W2", [(30, -9), (56, -7.5)], hw=3.5, rank=7)
net = rd.build_network([pk, wl, pl, ring, we, cds])
for r in net:
    rd.draw_road(R, r, m); print(r.name, [(round(p[0]), round(p[1])) for p in r.pieces], {k: len(v) for k, v in r.gaps.items()})
    if r.island: rd.island_disc(R, T, m, *r.island)
T.cyl(M("shadow_dummy", "#000000"), (0, 0, -5), .01, .01, "z", 3)
T.build(vc=True); R.build(vc=True, recalc=False)
sun_ = [o for o in bpy.context.scene.objects if o.type == "LIGHT"]
for nm, (tgt, pitch, dist, w, h) in {"rt_over": ((0, 0, 0), 55, 150, 1100, 1100), "rt_junc": ((0, -5, 0), 55, 50, 1000, 700), "rt_ring": ((66, -8, 0), 55, 40, 1000, 700)}.items():
    for o in [x for x in bpy.context.scene.objects if x.type == "CAMERA"]: bpy.data.objects.remove(o)
    game_camera(tgt, pitch, dist); render(os.path.join(OUT, nm + ".png"), w, h, samples=16, keep_transform=True)
