"""Round 32: a roof rocket launcher that rises out of a hatch (the Dave mission's first upgrade). Modular: the game mounts it on any car's roof.
Parts (each its own object, pivot at its joint; Blender +Y = forward, +Z = up; the page drives them):
  launcher (root, at the roof surface) > base (roof plate + hatch frame), hatch_L / hatch_R (flip outward about their outer edges),
  lift (slides up out of the roof) > yaw (turns left/right) > pitch (tilts up/down) > pod (4 tubes) + muzzle_0..3 empties at the tube mouths.
Run: blender -b --python scripts/launcher.py  -> viewer/launcher.glb"""
import bpy, os, sys, math
sys.path.insert(0, os.path.dirname(__file__))
from kit import *
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "viewer")
bpy.ops.wm.read_factory_settings(use_empty=True)
olive, dark, black, yel, steel, red = M("ln_olive", "#4d5a2a", rough=.7), M("ln_dark", "#2c3034", rough=.6), M("ln_black", "#121314"), M("ln_yellow", "#e2b42a"), M("ln_steel", "#8d9399", rough=.4), M("ln_red", "#c8312a", emit=.6)

def empty(name, parent, loc):
    e = bpy.data.objects.new(name, None); bpy.context.scene.collection.objects.link(e); e.parent = parent; e.location = loc; return e
def part(name, parent, loc, fill):
    b = Builder(name); fill(b); o = b.build(bevel=.008); o.parent = parent; o.location = loc; return o

root = empty("launcher", None, (0, 0, 0))
# base: a dark plate with a raised frame round the hatch opening, yellow-black warning edge
def base(b):
    b.box(dark, -.58, .58, -.62, .62, 0, .03)
    for (x0, x1, y0, y1) in ((-.58, .58, -.62, -.54), (-.58, .58, .54, .62), (-.58, -.5, -.54, .54), (.5, .58, -.54, .54)): b.box(olive, x0, x1, y0, y1, .03, .08)
    for k in range(6): x = -.5 + k * .2; b.box(yel if k % 2 == 0 else black, x, x + .2, .62, .64, .02, .07)
    b.box(black, -.5, .5, -.54, .54, .025, .03)                                # the hole under the hatch
part("base", root, (0, 0, 0), base)
# hatch panels: hinged on their outer edges, the page flips them outward (rotation about Y)
for s, nm in ((-1, "hatch_L"), (1, "hatch_R")):
    def hatch(b, s=s):
        b.box(olive, -.5 if s > 0 else 0, 0 if s > 0 else .5, -.53, .53, 0, .04)      # in the hinge's frame: the panel reaches inward from the hinge
        b.box(dark, -.42 if s > 0 else .05, -.05 if s > 0 else .42, -.4, .4, .04, .055)
    part(nm, root, (s * .5, 0, .06), hatch)
# lift column (sits down in the roof; the page raises it ~.5 m)
lift = empty("lift", root, (0, 0, -.42))
part("lift_col", lift, (0, 0, 0), lambda b: (b.box(steel, -.12, .12, -.12, .12, 0, .5), b.box(dark, -.18, .18, -.18, .18, .42, .5)))
# yaw turret: a turntable ring + a housing
yaw = empty("yaw", lift, (0, 0, .5))
def turret(b):
    b.cyl(dark, (0, 0, .04), .3, .08, axis="z", segs=16)
    b.box(olive, -.26, .26, -.24, .24, .08, .3)
    b.box(dark, -.3, -.26, -.1, .1, .14, .26); b.box(dark, .26, .3, -.1, .1, .14, .26)    # trunnion blocks
    b.box(red, -.04, .04, -.25, -.23, .24, .28)                                       # status light at the back
part("turret", yaw, (0, 0, 0), turret)
# pitch: the rocket pod, 2x2 tubes along +Y, pivot at the trunnions
pitch = empty("pitch", yaw, (0, 0, .2))
def pod(b):
    b.box(olive, -.25, .25, -.42, .42, -.16, .16)
    b.box(yel, -.25, .25, -.42, -.38, -.16, .16)                                      # yellow back band
    for i, (x, z) in enumerate(((-.11, .07), (.11, .07), (-.11, -.07), (.11, -.07))):
        b.cyl(black, (x, .43, z), .065, .04, axis="y", segs=12)                       # dark tube mouths
        b.cyl(steel, (x, .41, z), .085, .03, axis="y", segs=12)                       # steel rims
    b.box(dark, -.27, .27, .1, .2, .16, .2); b.box(dark, -.06, .06, -.3, .2, .16, .22)   # top rail + sight
part("pod", pitch, (0, 0, 0), pod)
for i, (x, z) in enumerate(((-.11, .07), (.11, .07), (-.11, -.07), (.11, -.07))): empty(f"muzzle_{i}", pitch, (x, .47, z))
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, "launcher.glb"), export_format="GLB", export_yup=True, export_extras=True, export_apply=True)
print("launcher.glb written")
