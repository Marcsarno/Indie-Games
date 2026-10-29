"""Mesh-building kit: collect boxes / lofts / cylinders per material into ONE mesh (few draw calls in the game).
Axes: +Y = north (screen up in game), +X = east, +Z = up. Units = metres. Colors given as sRGB hex."""
import bpy, bmesh, math, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from lib import *
from mathutils import Matrix, Vector

def lin(hexstr):
    h = hexstr.lstrip("#"); c = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)

_mats = {}
def M(name, hexstr, emit=0.0, rough=0.9):
    """Cached material. emit>0 makes it glow (windows, lamps, signs) in both Blender and glTF."""
    key = (name, hexstr, emit)
    if key in _mats and _mats[key].name in bpy.data.materials: return _mats[key]
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*lin(hexstr), 1); b.inputs["Roughness"].default_value = rough
    for k in ("Specular IOR Level", "Metallic"):
        if k in b.inputs: b.inputs[k].default_value = 0
    if emit:
        b.inputs["Emission Color"].default_value = (*lin(hexstr), 1); b.inputs["Emission Strength"].default_value = emit
    m.diffuse_color = (*lin(hexstr), 1)
    _mats[key] = m
    return m

class Builder:
    def __init__(self, name):
        self.name = name; self.bm = bmesh.new(); self.mats = []
    def _mi(self, m):
        if m not in self.mats: self.mats.append(m)
        return self.mats.index(m)
    def _quad(self, vs, mi):
        f = self.bm.faces.new(vs); f.material_index = mi; return f
    def box(self, m, x0, x1, y0, y1, z0, z1):
        return self.prism(m, (x0, x1, y0, y1), (x0, x1, y0, y1), z0, z1)
    def prism(self, m, b, t, z0, z1, mat_fn=None):
        """Hexahedron: bottom rect b=(x0,x1,y0,y1) at z0, top rect t at z1. Slanted sides allowed (stairs, awnings)."""
        bm = self.bm
        vs = [bm.verts.new(p) for p in (
            (b[0], b[2], z0), (b[1], b[2], z0), (b[1], b[3], z0), (b[0], b[3], z0),
            (t[0], t[2], z1), (t[1], t[2], z1), (t[1], t[3], z1), (t[0], t[3], z1))]
        for idx in ((0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)):
            f = bm.faces.new([vs[i] for i in idx])
            f.material_index = self._mi(m)
            if mat_fn:
                bmesh.ops.recalc_face_normals(bm, faces=[f])
                f.material_index = self._mi(mat_fn(f.normal))
    def loft(self, m, stations, mat_fn=None):
        """Body along Y. station=(y, z_bottom, z_top, half_width_bottom, half_width_top). Consecutive stations are joined; ends capped."""
        bm = self.bm; rings = []
        for (y, zb, zt, hb, ht) in stations:
            rings.append([bm.verts.new(p) for p in ((-hb, y, zb), (hb, y, zb), (ht, y, zt), (-ht, y, zt))])
        new = []
        def add(vs):
            f = bm.faces.new(vs); f.material_index = self._mi(m); new.append(f)
        add(rings[0][::-1]); add(rings[-1])
        for a, b in zip(rings, rings[1:]):
            for i in range(4):
                add([a[i], a[(i + 1) % 4], b[(i + 1) % 4], b[i]])
        bmesh.ops.recalc_face_normals(bm, faces=new)
        if mat_fn:
            for f in new: f.material_index = self._mi(mat_fn(f.normal))
    def cyl(self, m, center, r, depth, axis="x", segs=12, r2=None):
        rot = {"x": Matrix.Rotation(math.radians(90), 4, "Y"), "y": Matrix.Rotation(math.radians(90), 4, "X"), "z": Matrix.Identity(4)}[axis]
        mat = Matrix.Translation(center) @ rot
        res = bmesh.ops.create_cone(self.bm, cap_ends=True, cap_tris=False, segments=segs, radius1=r, radius2=(r if r2 is None else r2), depth=depth, matrix=mat)
        for f in {f for v in res["verts"] for f in v.link_faces}: f.material_index = self._mi(m)
    def build(self, bevel=0.0, collection=None):
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces[:])
        me = bpy.data.meshes.new(self.name); self.bm.to_mesh(me); self.bm.free()
        for m in self.mats: me.materials.append(m)
        o = bpy.data.objects.new(self.name, me); (collection or bpy.context.scene.collection).objects.link(o)
        for p in me.polygons: p.use_smooth = False
        if bevel:
            bpy.context.view_layer.objects.active = o
            md = o.modifiers.new("bevel", "BEVEL"); md.width = bevel; md.segments = 1; md.limit_method = "ANGLE"; md.angle_limit = math.radians(50)
            bpy.ops.object.select_all(action="DESELECT"); o.select_set(True)
            bpy.ops.object.modifier_apply(modifier="bevel")
        return o
