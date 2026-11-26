"""Scene, object, baked AO, export and preview helpers shared by every asset script."""
import math
import os
import bpy
import bmesh
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
from . import palette as P
from .shapes import S, new_bm, COL


def reset():
    """Empty scene (build_all runs Blender with --factory-startup)."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.objects, bpy.data.armatures, bpy.data.actions):
        for b in list(coll):
            coll.remove(b)


_MAT = {}


def material(name='vc'):
    """Vertex-colour material. The Color Attribute node makes COLOR_0 export (see the plan's pitfalls)."""
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes.get('Principled BSDF')
    attr = nt.nodes.new('ShaderNodeVertexColor')
    attr.layer_name = COL
    nt.links.new(attr.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.7
    bsdf.inputs['Metallic'].default_value = 0.0
    return m


def merge(pieces):
    """Join S pieces into one bmesh."""
    out = new_bm()
    for p in pieces:
        me = bpy.data.meshes.new('_tmp')
        p.bm.to_mesh(me)
        out.from_mesh(me)
        bpy.data.meshes.remove(me)
        p.bm.free()
    return out


def _custom_normals(me, angle=50.0):
    """Face-area weighted normals so big flat faces stay flat next to their bevels."""
    cos_lim = math.cos(math.radians(angle))
    me.calc_loop_triangles()
    fn = [p.normal.copy() for p in me.polygons]
    fa = [p.area for p in me.polygons]
    vert_faces = [[] for _ in me.vertices]
    for p in me.polygons:
        for v in p.vertices:
            vert_faces[v].append(p.index)
    normals = [None] * len(me.loops)
    for p in me.polygons:
        n0 = fn[p.index]
        for li in p.loop_indices:
            v = me.loops[li].vertex_index
            acc = Vector((0, 0, 0))
            for fi in vert_faces[v]:
                if fn[fi].dot(n0) >= cos_lim:
                    acc += fn[fi] * fa[fi]
            normals[li] = acc.normalized() if acc.length > 1e-12 else n0
    me.normals_split_custom_set(normals)


def make(name, pieces, loc=(0, 0, 0), rot=(0, 0, 0), parent=None, props=None, normals=True, shade='lambert', outline=False):
    """Create a mesh object from S pieces (authored in the object's local space)."""
    if isinstance(pieces, S):
        pieces = [pieces]
    bm = merge(pieces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    me.materials.append(material())
    if COL in me.color_attributes:
        me.color_attributes.active_color = me.color_attributes[COL]
        me.color_attributes.render_color_index = me.color_attributes.find(COL)
    if normals:
        _custom_normals(me)
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = loc
    ob.rotation_euler = [math.radians(a) for a in rot]
    if parent:
        ob.parent = parent
    ob['shade'] = shade
    if outline:
        ob['outline'] = 1
    for k, v in (props or {}).items():
        ob[k] = v
    return ob


def empty(name, loc=(0, 0, 0), rot=(0, 0, 0), parent=None, props=None):
    ob = bpy.data.objects.new(name, None)
    ob.empty_display_size = 0.1
    bpy.context.scene.collection.objects.link(ob)
    ob.location = loc
    ob.rotation_euler = [math.radians(a) for a in rot]
    if parent:
        ob.parent = parent
    for k, v in (props or {}).items():
        ob[k] = v
    return ob


def hit(name, loc, size, parent=None, props=None):
    """Invisible oversized tap target (a plain box). The game hides it and raycasts it."""
    bm = new_bm()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=bm.verts, vec=size)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(material())
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = loc
    if parent:
        ob.parent = parent
    ob['hit'] = 1
    for k, v in (props or {}).items():
        ob[k] = v
    return ob


def station_frame(objs, root, name, target=(-0.05, 0.06, 0.2), fit=(2.25, 1.4), gobbles=(-0.8, 0.38)):
    """Camera pose and Gobbles' spot for a recipe that is cooked on the island (station space)."""
    objs.append(empty('cam_%s_target' % name, loc=target, parent=root))
    objs.append(empty('cam_%s' % name, loc=(target[0] - 0.6, target[1] - 1.9, target[2] + 1.45), parent=root, props={'fit_w': fit[0], 'fit_h': fit[1]}))
    objs.append(empty('socket_gobbles', loc=(gobbles[0], gobbles[1], 0), parent=root))


def bake_each(objs, static=(), dist=0.12, strength=0.6):
    """AO for a recipe kit: static pieces together (with the counter as floor), everything else on its own
    so nothing keeps the shadow of a thing that moves away."""
    static = [o for o in static]
    if static:
        bake_ao(static, floor_z=0.0, dist=0.3, strength=0.9)
    for o in objs:
        if o.type == 'MESH' and not o.get('hit') and o not in static and o.get('shade') != 'glow':
            bake_ao([o], dist=dist, strength=strength)


# ------------------------------------------------------------------------------- baked AO

def _hemi_dirs(n):
    """Cosine-ish weighted directions over the +Z hemisphere (deterministic)."""
    dirs = []
    golden = math.pi * (3 - math.sqrt(5))
    for i in range(n):
        u = (i + 0.5) / n
        r = math.sqrt(u)
        th = i * golden
        dirs.append(Vector((r * math.cos(th), r * math.sin(th), math.sqrt(max(0.0, 1 - u)))))
    return dirs


def bake_ao(objs, occluders=None, dist=0.45, strength=1.0, samples=28, floor_z=None, skip=()):
    """Multiply vertex colours toward the plum shadow tint where nearby geometry blocks the sky.
    `floor_z` adds a virtual ground plane (for props that will sit on a counter)."""
    bpy.context.view_layer.update()
    occluders = occluders if occluders is not None else objs
    verts, polys = [], []
    for o in occluders:
        if o.type != 'MESH' or o.get('hit') or o.name in skip:
            continue
        me, mw, off = o.data, o.matrix_world, len(verts)
        verts += [mw @ v.co for v in me.vertices]
        polys += [[off + i for i in p.vertices] for p in me.polygons]
    if floor_z is not None:
        off = len(verts)
        verts += [Vector((-50, -50, floor_z)), Vector((50, -50, floor_z)), Vector((50, 50, floor_z)), Vector((-50, 50, floor_z))]
        polys.append([off, off + 1, off + 2, off + 3])
    bvh = BVHTree.FromPolygons(verts, polys)
    dirs = _hemi_dirs(samples)
    for o in objs:
        if o.type != 'MESH' or o.get('hit') or COL not in o.data.color_attributes:
            continue
        me, mw = o.data, o.matrix_world
        nm = mw.to_3x3().inverted_safe().transposed()
        occl = []
        for v in me.vertices:
            p = mw @ v.co
            n = (nm @ v.normal).normalized()
            t = n.cross(Vector((0, 0, 1)) if abs(n.z) < 0.95 else Vector((1, 0, 0))).normalized()
            b = n.cross(t)
            org = p + n * 0.006
            hitsum = 0.0
            for d in dirs:
                w = t * d.x + b * d.y + n * d.z
                loc, _nrm, _idx, hd = bvh.ray_cast(org, w, dist)
                if loc is not None:
                    hitsum += 1.0 - (hd / dist) ** 2 * 0.6
            occl.append(min(1.0, hitsum / samples))
        col = me.color_attributes[COL].data
        sm = P.SHADOW_MULT
        for l in me.loops:
            a = min(1.0, occl[l.vertex_index] * strength)
            a = a * a * (3 - 2 * a) * 0.5 + a * 0.5
            c = col[l.index].color
            col[l.index].color = (c[0] * (1 + (sm[0] - 1) * a), c[1] * (1 + (sm[1] - 1) * a), c[2] * (1 + (sm[2] - 1) * a), 1.0)


def gradient(objs, z0, z1, dark=0.88):
    """Soft baked vertical gradient (darker at the bottom) for big background pieces."""
    bpy.context.view_layer.update()
    for o in objs:
        me, mw = o.data, o.matrix_world
        col = me.color_attributes[COL].data
        for l in me.loops:
            z = (mw @ me.vertices[l.vertex_index].co).z
            t = max(0.0, min(1.0, (z - z0) / (z1 - z0)))
            k = dark + (1 - dark) * t
            c = col[l.index].color
            col[l.index].color = (c[0] * k, c[1] * k, c[2] * k, 1.0)


# ------------------------------------------------------------------------------- rigs

def armature(name, bones):
    """bones: list of (name, head, tail, parent_name or None). Returns the armature object."""
    arm = bpy.data.armatures.new(name)
    ob = bpy.data.objects.new(name, arm)
    bpy.context.scene.collection.objects.link(ob)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.mode_set(mode='EDIT')
    for bn, head, tail, par in bones:
        eb = arm.edit_bones.new(bn)
        eb.head, eb.tail = head, tail
        if par:
            eb.parent = arm.edit_bones[par]
    bpy.ops.object.mode_set(mode='OBJECT')
    return ob


def skin(mesh_ob, arm_ob, bone_names):
    """Rigid skinning from the int 'bone' vertex layer (index into bone_names)."""
    me = mesh_ob.data
    # Copy the ids out FIRST: creating vertex groups reallocates the mesh's attribute arrays, and reading
    # the attribute afterwards returns stale memory (round 1 shipped with every vertex on the wrong bone).
    ids = [d.value for d in me.attributes['bone'].data]
    bad = [i for i in ids if i < 0 or i >= len(bone_names)]
    if bad:
        raise ValueError('skin: %d vertices have no valid bone id' % len(bad))
    groups = [mesh_ob.vertex_groups.new(name=n) for n in bone_names]
    for b in range(len(bone_names)):
        verts = [i for i, v in enumerate(ids) if v == b]
        if verts:
            groups[b].add(verts, 1.0, 'REPLACE')
    mesh_ob.parent = arm_ob
    mod = mesh_ob.modifiers.new('Armature', 'ARMATURE')
    mod.object = arm_ob


# ------------------------------------------------------------------------------- export

def export_glb(path, objs):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    kw = dict(filepath=path, export_format='GLB', use_selection=True, export_apply=False,
              export_extras=True, export_attributes=True, export_yup=True, export_animations=False,
              export_skins=True, export_morph=True, export_morph_normal=True, export_normals=True,
              export_texcoords=False, export_materials='EXPORT', export_cameras=False, export_lights=False,
              export_vertex_color='ACTIVE', export_all_vertex_colors=False)
    bpy.ops.export_scene.gltf(**kw)
    print('exported', path, round(os.path.getsize(path) / 1024), 'KB')


def all_objects():
    return [o for o in bpy.context.scene.objects]


# ------------------------------------------------------------------------------- preview

def render_preview(path, target=(0, 0, 0.3), dist=3.0, yaw=30.0, pitch=35.0, size=512, samples=24, lens=50):
    """512 px review render with Cycles on the CPU (no GPU in the build container)."""
    scn = bpy.context.scene
    scn.render.engine = 'CYCLES'
    scn.cycles.device = 'CPU'
    scn.cycles.samples = samples
    scn.cycles.use_denoising = False
    scn.render.resolution_x = scn.render.resolution_y = size
    scn.render.film_transparent = False
    scn.view_settings.view_transform = 'Standard'
    world = bpy.data.worlds.new('w')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[0].default_value = (0.95, 0.80, 0.66, 1)
    world.node_tree.nodes['Background'].inputs[1].default_value = 0.9
    scn.world = world
    cam = bpy.data.objects.new('prev_cam', bpy.data.cameras.new('prev_cam'))
    cam.data.lens = lens
    scn.collection.objects.link(cam)
    t = Vector(target)
    y, p = math.radians(yaw), math.radians(pitch)
    cam.location = t + Vector((math.sin(y) * math.cos(p), -math.cos(y) * math.cos(p), math.sin(p))) * dist
    cam.rotation_euler = (t - cam.location).to_track_quat('-Z', 'Y').to_euler()
    scn.camera = cam
    sun = bpy.data.objects.new('prev_sun', bpy.data.lights.new('prev_sun', 'SUN'))
    sun.data.energy = 3.0
    sun.data.angle = 0.3
    sun.rotation_euler = (math.radians(50), 0, math.radians(35))
    scn.collection.objects.link(sun)
    hidden = [o for o in scn.objects if o.get('hit')]
    for o in hidden:
        o.hide_render = True
    scn.render.filepath = path
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.render.render(write_still=True)
    for o in hidden:
        o.hide_render = False
    bpy.data.objects.remove(cam)
    bpy.data.objects.remove(sun)
