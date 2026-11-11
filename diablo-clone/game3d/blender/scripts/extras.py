"""Pieces the 3D game adds on top of what the 2D game had (made here in headless Blender, not converted from a 2D rig):
  out/extra/grass.glb   a tuft of grass blades (tinted per tuft in the game, swayed by a wind shader)
  out/extra/detail.png  a fine grain the game lays over the ground so it stays crisp up close (baked from a procedural material)
Run: blender -b --python scripts/extras.py"""
import bpy, bmesh, math, os, random, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit
from mathutils import Vector

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "out", "extra"); os.makedirs(OUT, exist_ok=True)

def grass():
    kit.reset(); random.seed(3); bm = bmesh.new(); col = bm.loops.layers.color.new("Col")
    for b in range(7):
        ang = b * 2.4 + random.uniform(-0.3, 0.3); r0 = random.uniform(0.0, 0.1); h = random.uniform(0.22, 0.42); lean = random.uniform(0.1, 0.32); w = random.uniform(0.035, 0.055)
        d = Vector((math.cos(ang), math.sin(ang), 0)); side = Vector((-d.y, d.x, 0)); base = d * r0; rows = []
        for k in range(4):
            t = k / 3; c = base + d * (lean * t * t) + Vector((0, 0, h * t)); ww = w * (1 - t) ** 0.8
            rows.append((bm.verts.new(c - side * ww), bm.verts.new(c + side * ww), t))
        for (a0, a1, ta), (b0, b1, tb) in zip(rows, rows[1:]):
            if (b0.co - b1.co).length < 1e-5: f = bm.faces.new([a0, a1, b0])
            else: f = bm.faces.new([a0, a1, b1, b0])
            for l in f.loops:
                t = l.vert.co.z / h; g = 0.45 + 0.75 * t; l[col] = (g * 0.95, g, g * 0.85, 1)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    me = bpy.data.meshes.new("grass"); bm.to_mesh(me); bm.free()
    me.color_attributes.active_color = me.color_attributes["Col"]; me.color_attributes.render_color_index = 0
    ob = bpy.data.objects.new("grass", me); bpy.context.scene.collection.objects.link(ob)
    m = kit.shared_mat("matte"); m.use_backface_culling = False; me.materials.append(m)
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, "grass.glb"), export_format="GLB", export_yup=True, export_animations=False, export_vertex_color="ACTIVE", export_all_vertex_colors=False)
    print("GRASS tris", sum(len(p.vertices) - 2 for p in me.polygons))

def detail(size=256):
    """Bake a procedural grain (two scales of noise + fine speckle) to an image with Cycles."""
    kit.reset(); bpy.ops.mesh.primitive_plane_add(size=2); ob = bpy.context.object
    m = bpy.data.materials.new("grain"); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial"); em = nt.nodes.new("ShaderNodeEmission"); nt.links.new(em.outputs[0], out.inputs[0])
    tc = nt.nodes.new("ShaderNodeTexCoord")
    n1 = nt.nodes.new("ShaderNodeTexNoise"); n1.inputs["Scale"].default_value = 9; n1.inputs["Detail"].default_value = 6; n1.inputs["Roughness"].default_value = 0.62
    n2 = nt.nodes.new("ShaderNodeTexNoise"); n2.inputs["Scale"].default_value = 46; n2.inputs["Detail"].default_value = 3
    v = nt.nodes.new("ShaderNodeTexVoronoi"); v.inputs["Scale"].default_value = 22
    for n in (n1, n2, v): nt.links.new(tc.outputs["UV"], n.inputs["Vector"])
    mix1 = nt.nodes.new("ShaderNodeMath"); mix1.operation = "ADD"; mul2 = nt.nodes.new("ShaderNodeMath"); mul2.operation = "MULTIPLY"; mul2.inputs[1].default_value = 0.45
    mulv = nt.nodes.new("ShaderNodeMath"); mulv.operation = "MULTIPLY"; mulv.inputs[1].default_value = 0.35
    nt.links.new(n2.outputs["Fac"], mul2.inputs[0]); nt.links.new(n1.outputs["Fac"], mix1.inputs[0]); nt.links.new(mul2.outputs[0], mix1.inputs[1])
    add2 = nt.nodes.new("ShaderNodeMath"); add2.operation = "ADD"; nt.links.new(v.outputs["Distance"], mulv.inputs[0]); nt.links.new(mix1.outputs[0], add2.inputs[0]); nt.links.new(mulv.outputs[0], add2.inputs[1])
    sc = nt.nodes.new("ShaderNodeMath"); sc.operation = "MULTIPLY"; sc.inputs[1].default_value = 0.6; nt.links.new(add2.outputs[0], sc.inputs[0]); nt.links.new(sc.outputs[0], em.inputs["Color"])
    ob.data.materials.append(m)
    img = bpy.data.images.new("detail", size, size); tex = nt.nodes.new("ShaderNodeTexImage"); tex.image = img; nt.nodes.active = tex
    s = bpy.context.scene; s.render.engine = "CYCLES"; s.cycles.samples = 4; s.cycles.device = "CPU"
    bpy.ops.object.select_all(action="DESELECT"); ob.select_set(True); bpy.context.view_layer.objects.active = ob
    bpy.ops.object.bake(type="EMIT")
    img.filepath_raw = os.path.join(OUT, "detail.png"); img.file_format = "PNG"; img.save(); print("DETAIL", img.filepath_raw)

if __name__ == "__main__":
    grass(); detail()
