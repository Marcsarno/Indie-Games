"""Shared helpers for headless model scripts.
Usage in a model script:  import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from lib import *
Run:  blender -b --python scripts/<model>.py   (see README.md)
"""
import bpy, bmesh, math, os
from mathutils import Vector

OUT = os.environ.get("OUT", os.path.join(os.path.dirname(__file__), "..", "out"))

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    os.makedirs(OUT, exist_ok=True)

def mat(name, rgb, rough=1.0):
    """Flat, unlit-looking game material (Principled, no specular). rgb 0..1 sRGB-ish."""
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1)
    b.inputs["Roughness"].default_value = rough
    for k in ("Specular IOR Level", "Metallic"):
        if k in b.inputs: b.inputs[k].default_value = 0
    m.diffuse_color = (*rgb, 1)
    return m

def box(name, size, loc, m, bevel=0.0, parent=None):
    """Axis-aligned box. size=(x,y,z) full size, loc=center."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object; o.name = name; o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if bevel:
        bv = o.modifiers.new("bevel", "BEVEL"); bv.width = bevel; bv.segments = 2
        bpy.ops.object.modifier_apply(modifier="bevel")
    o.data.materials.append(m)
    if parent: o.parent = parent
    return o

def cyl(name, r, depth, loc, m, rot=(0, 0, 0), verts=12, parent=None):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, vertices=verts, location=loc, rotation=rot)
    o = bpy.context.object; o.name = name; o.data.materials.append(m)
    if parent: o.parent = parent
    return o

def flat(o):
    for p in o.data.polygons: p.use_smooth = False

def outline(o, thickness=0.03, color=(0.02, 0.02, 0.03)):
    """Inverted-hull ink line: a back-face-only shell scaled out along normals. Exports to glTF as plain geometry."""
    m = bpy.data.materials.get("ink") or mat("ink", color)
    if m.name == "ink" and not m.use_backface_culling:
        m.use_backface_culling = True
    mod = o.modifiers.new("ink", "SOLIDIFY"); mod.thickness = -thickness; mod.offset = 1
    mod.use_flip_normals = True; mod.material_offset = len(o.data.materials)
    o.data.materials.append(m)
    return o

def join(objs, name):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join(); o = bpy.context.object; o.name = name
    return o

def world(color=(0.55, 0.57, 0.55), strength=1.0):
    w = bpy.data.worlds.new("w"); w.use_nodes = True
    bg = w.node_tree.nodes["Background"]; bg.inputs[0].default_value = (*color, 1); bg.inputs[1].default_value = strength
    bpy.context.scene.world = w

def sun(rot=(math.radians(50), 0, math.radians(35)), energy=3.0):
    l = bpy.data.lights.new("sun", "SUN"); l.energy = energy
    o = bpy.data.objects.new("sun", l); bpy.context.scene.collection.objects.link(o); o.rotation_euler = rot

def camera(loc, target=(0, 0, 0), lens=35, ortho=False, ortho_scale=6):
    c = bpy.data.cameras.new("cam"); c.lens = lens
    if ortho: c.type = "ORTHO"; c.ortho_scale = ortho_scale
    o = bpy.data.objects.new("cam", c); bpy.context.scene.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = o
    return o

def render(path, w=640, h=480, engine="EEVEE", ink=False, samples=16):
    s = bpy.context.scene
    if engine == "EEVEE":  # renamed between Blender 4.x (BLENDER_EEVEE_NEXT) and 5.x (BLENDER_EEVEE)
        ids = {e.identifier for e in s.render.bl_rna.properties["engine"].enum_items}
        engine = "BLENDER_EEVEE" if "BLENDER_EEVEE" in ids else "BLENDER_EEVEE_NEXT"
    s.render.engine = engine; s.render.resolution_x, s.render.resolution_y = w, h
    s.render.film_transparent = False; s.render.filepath = path
    s.view_settings.view_transform = "Standard"
    if engine.startswith("BLENDER_EEVEE"): s.eevee.taa_render_samples = samples
    s.render.use_freestyle = ink
    if ink:
        s.render.line_thickness = 1.6
        vl = bpy.context.view_layer; vl.use_freestyle = True
        ls = vl.freestyle_settings.linesets.new("ink") if not vl.freestyle_settings.linesets else vl.freestyle_settings.linesets[0]
        ls.select_silhouette = True; ls.select_border = True; ls.select_crease = True
        if ls.linestyle is None: ls.linestyle = bpy.data.linestyles.new("ink")
        ls.linestyle.color = (0.02, 0.02, 0.03); ls.linestyle.thickness = 1.6
    bpy.ops.render.render(write_still=True)
    return path

# Standard review views: the in-game camera (steep perspective, ~65 deg down) plus 5 inspection angles.
VIEWS = {
    "game":  dict(loc=(0, -7, 10), lens=35),
    "front": dict(loc=(0, -9, 2.2), lens=45),
    "side":  dict(loc=(9, 0, 2.2), lens=45),
    "back":  dict(loc=(0, 9, 2.2), lens=45),
    "top":   dict(loc=(0, -0.01, 12), lens=45),
    "three_q": dict(loc=(6, -7, 5), lens=45),
}

def review_sheet(name, target=(0, 0, 0.8), views=("game", "three_q", "front", "side", "back", "top"), tile=(480, 360), cols=3, ink=True, scale=1.0):
    """Render each view, stitch to out/<name>_sheet.png with PIL (system python), return the path."""
    paths = []
    for v in views:
        d = VIEWS[v]
        for o in [x for x in bpy.context.scene.objects if x.type == "CAMERA"]: bpy.data.objects.remove(o)
        loc = tuple(Vector(target) + (Vector(d["loc"]) * scale))
        camera(loc, target, d["lens"])
        paths.append(render(os.path.join(OUT, f"{name}_{v}.png"), *tile, ink=ink))
    return paths

def export_glb(name, objs=None):
    p = os.path.join(OUT, f"{name}.glb")
    bpy.ops.object.select_all(action="DESELECT")
    use_sel = objs is not None
    if use_sel:
        for o in objs: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=p, export_format="GLB", use_selection=use_sel, export_apply=True, export_yup=True)
    return p
