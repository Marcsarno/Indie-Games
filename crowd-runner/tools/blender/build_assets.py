"""Build the crowd-runner models headless and export them as GLB.

Run:  python tools/blender/build_assets.py [outdir]     (needs `pip install bpy`, Python 3.13)
or:   blender -b -P tools/blender/build_assets.py -- [outdir]

Conventions
- Blender axes: character faces -Y (the glTF exporter turns that into +Z), up is +Z, 1 unit = 1 metre-ish.
- Every vertex carries two custom attributes the game shader reads:
    _part  0 static, 1 left leg, 2 right leg, 3 left arm, 4 right arm   (walk-cycle swing in the vertex shader)
    _tint  1 where the instance colour should replace the vertex colour (zombie shirts), else 0
- Colours are vertex colours (COLOR_0). No textures.
"""
import math
import os
import sys

import bpy  # must come first: the pip module registers bmesh/mathutils on import
import bmesh  # noqa: E402
from mathutils import Matrix, Vector

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "assets", "models")
if "--" in sys.argv:
    rest = sys.argv[sys.argv.index("--") + 1:]
    if rest:
        OUT = rest[0]
elif len(sys.argv) > 1 and not sys.argv[1].startswith("-"):
    OUT = sys.argv[1]
OUT = os.path.abspath(OUT)
os.makedirs(OUT, exist_ok=True)


def hexcol(h):
    h = h.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4))
    # vertex colours are linear in glTF; convert from sRGB hex
    f = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (f(r), f(g), f(b), 1.0)


_TOY = None


def toy_material():
    """One matte white material; the vertex colours (COLOR_0) multiply it. Without it glTF defaults to metallic=1."""
    global _TOY
    if _TOY is None:
        _TOY = bpy.data.materials.new("toy")
        _TOY.use_nodes = True
        bsdf = _TOY.node_tree.nodes["Principled BSDF"]
        attr = _TOY.node_tree.nodes.new("ShaderNodeVertexColor")
        attr.layer_name = "Col"
        _TOY.node_tree.links.new(attr.outputs["Color"], bsdf.inputs["Base Color"])
        bsdf.inputs["Metallic"].default_value = 0.0
        bsdf.inputs["Roughness"].default_value = 0.7
    return _TOY


class Builder:
    def __init__(self, name):
        self.name = name
        self.bm = bmesh.new()
        self.col = self.bm.loops.layers.color.new("Col")
        self.part = self.bm.verts.layers.float.new("_part")
        self.tint = self.bm.verts.layers.float.new("_tint")

    def _paint(self, verts, color, part, tint):
        c = hexcol(color) if isinstance(color, str) else color
        for v in verts:
            v[self.part] = float(part)
            v[self.tint] = float(tint)
            for loop in v.link_loops:
                loop[self.col] = c

    def box(self, center, size, color, part=0, tint=0, bevel=0.0, rot=None):
        res = bmesh.ops.create_cube(self.bm, size=1.0)
        verts = res["verts"]
        bmesh.ops.scale(self.bm, vec=Vector(size), verts=verts)
        if rot:
            bmesh.ops.rotate(self.bm, verts=verts, cent=(0, 0, 0), matrix=Matrix.Rotation(rot[0], 3, rot[1]))
        bmesh.ops.translate(self.bm, vec=Vector(center), verts=verts)
        if bevel > 0:
            edges = {e for v in verts for e in v.link_edges}
            out = bmesh.ops.bevel(self.bm, geom=list(edges), offset=bevel, segments=1, affect="EDGES")
            verts = list({v for v in out["faces"] for v in v.verts} | set(verts))
            verts = [v for v in verts if v.is_valid]
        self._paint(verts, color, part, tint)

    def prism(self, center, radius, height, sides, color, part=0, tint=0, r2=None, rotz=0.0, along="Z"):
        """Cylinder/cone with `sides` sides (r2 = top radius; 0 gives a cone)."""
        res = bmesh.ops.create_cone(self.bm, cap_ends=True, segments=sides, radius1=radius,
                                    radius2=radius if r2 is None else r2, depth=height)
        verts = res["verts"]
        if rotz:
            bmesh.ops.rotate(self.bm, verts=verts, cent=(0, 0, 0), matrix=Matrix.Rotation(rotz, 3, "Z"))
        if along == "Y":  # lay the axis along -Y (a gun barrel pointing forward)
            bmesh.ops.rotate(self.bm, verts=verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, "X"))
        bmesh.ops.translate(self.bm, vec=Vector(center), verts=verts)
        self._paint(verts, color, part, tint)

    def sphere(self, center, radius, color, part=0, tint=0, scale=(1, 1, 1), subdiv=2):
        res = bmesh.ops.create_icosphere(self.bm, subdivisions=subdiv, radius=radius)
        verts = res["verts"]
        bmesh.ops.scale(self.bm, vec=Vector(scale), verts=verts)
        bmesh.ops.translate(self.bm, vec=Vector(center), verts=verts)
        self._paint(verts, color, part, tint)

    def export(self, filename):
        bm = self.bm
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        mesh = bpy.data.meshes.new(self.name)
        bm.to_mesh(mesh)
        bm.free()
        for p in mesh.polygons:
            p.use_smooth = False
        mesh.materials.append(toy_material())
        obj = bpy.data.objects.new(self.name, mesh)
        scene = bpy.context.scene
        scene.collection.objects.link(obj)
        bpy.context.view_layer.objects.active = obj
        for o in scene.objects:
            o.select_set(o is obj)
        path = os.path.join(OUT, filename)
        bpy.ops.export_scene.gltf(
            filepath=path, export_format="GLB", use_selection=True, export_apply=True,
            export_attributes=True, export_vertex_color="MATERIAL", export_all_vertex_colors=False,
            export_animations=False,
        )
        tris = sum(len(p.vertices) - 2 for p in mesh.polygons)
        print(f"[build_assets] {filename}: {tris} tris, {os.path.getsize(path) // 1024} KB")
        bpy.data.objects.remove(obj)
        bpy.data.meshes.remove(mesh)


# ---------------------------------------------------------------- characters
BLUE = "#2f6bff"
BLUE_DK = "#1f46b8"
HELMET = "#2d5fe0"
SKIN = "#e8a77a"
PACK = "#34373f"
BOOT = "#1d1f24"
GUN = "#22252b"
GUNMETAL = "#3b3f48"


def soldier():
    b = Builder("soldier")
    # legs swing about the hips (z=0.30)
    for sx, part in ((-1, 1), (1, 2)):
        b.box((sx * 0.1, 0.0, 0.2), (0.15, 0.17, 0.2), BLUE, part, bevel=0.015)
        b.box((sx * 0.1, -0.025, 0.05), (0.16, 0.24, 0.11), BOOT, part, bevel=0.02)
    b.box((0, 0.0, 0.46), (0.42, 0.26, 0.34), BLUE, bevel=0.03)             # torso
    b.box((0, 0.0, 0.31), (0.43, 0.27, 0.05), BLUE_DK, bevel=0.01)          # belt
    b.box((0, 0.2, 0.5), (0.32, 0.15, 0.3), PACK, bevel=0.03)               # backpack
    b.box((0, 0.2, 0.34), (0.34, 0.16, 0.05), "#25272d", bevel=0.01)
    for sx in (-1, 1):                                                        # arms raised to the gun
        b.box((sx * 0.25, -0.12, 0.53), (0.1, 0.3, 0.11), BLUE, bevel=0.02)
        b.box((sx * 0.22, -0.3, 0.53), (0.1, 0.1, 0.1), SKIN, bevel=0.02)
    b.box((0, -0.0, 0.76), (0.26, 0.24, 0.2), SKIN, bevel=0.03)             # head
    b.prism((0, 0.0, 0.9), 0.2, 0.17, 6, HELMET, rotz=math.radians(30), r2=0.17)
    b.box((0, -0.12, 0.82), (0.3, 0.06, 0.03), BLUE_DK)                     # helmet brim
    # rifle
    b.box((0.1, -0.35, 0.56), (0.08, 0.55, 0.1), GUN, bevel=0.015)
    b.box((0.1, -0.65, 0.57), (0.04, 0.12, 0.04), GUNMETAL)
    b.box((0.1, -0.22, 0.49), (0.06, 0.1, 0.12), GUN)
    b.export("soldier.glb")


def zombie_like(name, skin, shirt, pants, scale=1.0, bulk=1.0, tint=1, mouth=True, vest=False, filename=None):
    b = Builder(name)
    s = scale
    w = bulk
    SK = skin
    for sx, part in ((-1, 1), (1, 2)):
        b.box((sx * 0.1 * w * s, 0, 0.2 * s), (0.15 * w * s, 0.17 * s, 0.2 * s), pants, part, bevel=0.015 * s)
        b.box((sx * 0.1 * w * s, -0.02 * s, 0.05 * s), (0.16 * w * s, 0.23 * s, 0.1 * s), "#3a2a22", part, bevel=0.02 * s)
    # torso / shirt (tinted per instance)
    b.box((0, 0, 0.46 * s), (0.42 * w * s, 0.26 * s, 0.34 * s), shirt, 0, tint, bevel=0.03 * s)
    if vest:
        b.box((0, -0.0, 0.46 * s), (0.44 * w * s, 0.27 * s, 0.2 * s), "#f1ece4", 0, 0, bevel=0.03 * s)
        b.box((0.1 * w * s, -0.14 * s, 0.4 * s), (0.1 * s, 0.01 * s, 0.14 * s), "#8c6fb4")  # torn patch
    # arms stretched forward, hands in skin colour (arm swing in the shader)
    for sx, part in ((-1, 3), (1, 4)):
        b.box((sx * 0.26 * w * s, -0.2 * s, 0.54 * s), (0.11 * w * s, 0.4 * s, 0.11 * s), shirt, part, tint, bevel=0.02 * s)
        b.box((sx * 0.26 * w * s, -0.45 * s, 0.54 * s), (0.12 * w * s, 0.13 * s, 0.12 * s), SK, part, bevel=0.025 * s)
    # head: low-poly sphere, glowing yellow eyes
    b.sphere((0, -0.03 * s, 0.8 * s), 0.17 * s * w ** 0.5, SK, scale=(1.05, 1.0, 1.0), subdiv=2)
    for sx in (-1, 1):
        b.box((sx * 0.065 * s, -0.17 * s, 0.83 * s), (0.065 * s, 0.03 * s, 0.07 * s), "#fff04d", bevel=0.01 * s)
    if mouth:
        b.box((0, -0.19 * s, 0.73 * s), (0.1 * s, 0.03 * s, 0.045 * s), "#3b0f12")
    b.export(filename or f"{name}.glb")


def zombies():
    zombie_like("zombie", "#7ac943", "#ffffff", "#5b3a2a")
    # brute boss: ~2.6x, purple skin, torn white vest
    zombie_like("brute", "#8e5fb8", "#6f4a99", "#4a3a5a", scale=2.6, bulk=1.35, tint=0, vest=True)


# ---------------------------------------------------------------- weapons
def minigun():
    b = Builder("minigun")
    b.box((0, 0.1, 0.0), (0.2, 0.34, 0.22), GUN, bevel=0.02)
    b.box((0, 0.1, -0.16), (0.1, 0.1, 0.1), "#f2a23a", bevel=0.01)            # ammo box (orange)
    b.box((0, 0.3, 0.02), (0.14, 0.14, 0.12), "#1c8cff", bevel=0.01)          # blue motor
    for i in range(6):
        a = i * math.pi / 3
        x, z = 0.07 * math.cos(a), 0.07 * math.sin(a)
        b.prism((x, -0.25, z), 0.022, 0.5, 6, GUNMETAL, along="Y")
    b.export("minigun.glb")


def rocket_launcher():
    b = Builder("rocket")
    b.prism((0, 0, 0), 0.07, 0.7, 8, "#6c7f2e", along="Y")
    b.prism((0, -0.37, 0), 0.1, 0.1, 8, "#3b4518", along="Y")
    b.box((0, 0, -0.12), (0.06, 0.06, 0.1), GUN)
    b.export("rocket.glb")


# ---------------------------------------------------------------- world
def gate_frame():
    """Open archway, 3.2 wide x 2.4 tall x 0.34 deep, white so the game can tint it."""
    b = Builder("gate")
    W, H, D, T = 3.2, 2.4, 0.34, 0.22
    b.box((-(W - T) / 2, 0, H / 2), (T, D, H), "#ffffff", bevel=0.05)
    b.box(((W - T) / 2, 0, H / 2), (T, D, H), "#ffffff", bevel=0.05)
    b.box((0, 0, H - T / 2), (W, D, T), "#ffffff", bevel=0.05)
    b.export("gate.glb")


def pedestal():
    b = Builder("pedestal")
    b.box((0, 0, 0.16), (1.3, 1.3, 0.32), "#f1f3f6", bevel=0.05)
    b.box((0, 0, 0.34), (1.0, 1.0, 0.05), "#2f8cff", bevel=0.02)
    b.export("pedestal.glb")


def pine():
    b = Builder("pine")
    b.box((0, 0, 0.3), (0.28, 0.28, 0.6), "#6b4a2b")
    for z, r, h in ((0.9, 0.95, 0.9), (1.55, 0.75, 0.8), (2.1, 0.5, 0.7)):
        b.prism((0, 0, z), r, h, 6, "#2e9a3a", r2=0.04, rotz=0.3)
    b.export("pine.glb")


def crate():
    b = Builder("crate")
    b.box((0, 0, 0.45), (0.9, 0.9, 0.9), "#c68a4a", bevel=0.03)
    for x, y in ((-0.4, -0.4), (0.4, -0.4), (-0.4, 0.4), (0.4, 0.4)):
        b.box((x, y, 0.45), (0.12, 0.12, 0.92), "#8d5a2c")
    b.box((0, 0, 0.92), (0.95, 0.95, 0.06), "#8d5a2c")
    b.export("crate.glb")


def barrel():
    b = Builder("barrel")
    b.prism((0, 0, 0.45), 0.35, 0.9, 10, "#2f6dc5")
    b.prism((0, 0, 0.3), 0.36, 0.06, 10, "#1c4585")
    b.prism((0, 0, 0.62), 0.36, 0.06, 10, "#1c4585")
    b.export("barrel.glb")


def tires():
    b = Builder("tires")
    for i in range(3):
        b.prism((0, 0, 0.14 + i * 0.28), 0.5, 0.26, 12, "#26282c")
        b.prism((0, 0, 0.14 + i * 0.28), 0.22, 0.28, 12, "#3b3e45")
    b.export("tires.glb")


def barrier():
    """Red/white striped jersey barrier, 2.0 long."""
    b = Builder("barrier")
    n = 5
    for i in range(n):
        x = -1.0 + (i + 0.5) * 2.0 / n
        b.box((x, 0, 0.34), (2.0 / n, 0.5, 0.68), "#ffffff" if i % 2 else "#d63a2f", bevel=0.02)
    b.export("barrier.glb")


def lamp():
    b = Builder("lamp")
    b.prism((0, 0, 1.6), 0.07, 3.2, 6, "#3b3e45")
    b.box((0.35, 0, 3.2), (0.8, 0.12, 0.1), "#3b3e45")
    b.box((0.7, 0, 3.12), (0.28, 0.2, 0.08), "#fff3b0")
    b.export("lamp.glb")


if __name__ == "__main__":
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for fn in (soldier, zombies, minigun, rocket_launcher, gate_frame, pedestal, pine, crate, barrel, tires, barrier, lamp):
        fn()
    print("[build_assets] done ->", OUT)
