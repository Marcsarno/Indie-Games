"""Mesh + rig helpers for the 3D Dungeons of Bones models (headless Blender 5.2).
A character = rigid rounded parts, each bound to one bone, joined into ONE skinned mesh.
Axes: z up, the character faces -Y (glTF +Z), its right hand is -X."""
import bpy, bmesh, math, os
from mathutils import Vector, Matrix, Euler

OUT = os.environ.get("OUT", os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "out"))
V = Vector

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True); os.makedirs(OUT, exist_ok=True); MATS.clear(); SHARED.clear()

MATS = {}
def mat(name, rgb=None, rough=0.9, metal=0.0, emit=0.0):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    lin = [((c + 0.055) / 1.055) ** 2.4 if c > 0.04045 else c / 12.92 for c in rgb]   # sRGB in, linear to Blender
    b.inputs["Base Color"].default_value = (*lin, 1); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    if emit:
        b.inputs["Emission Color"].default_value = (*lin, 1); b.inputs["Emission Strength"].default_value = emit
    m.diffuse_color = (*lin, 1); MATS[name] = m
    return m

class Parts:
    """Collects parts; each is (bmesh mesh object, bone)."""
    def __init__(self, name): self.name = name; self.objs = []
    def _add(self, bm, m, bone, smooth=True):
        me = bpy.data.meshes.new("p"); bm.normal_update(); bm.to_mesh(me); bm.free()
        for p in me.polygons: p.use_smooth = smooth
        o = bpy.data.objects.new("p", me); bpy.context.scene.collection.objects.link(o)
        me.materials.append(m); o["bone"] = bone; self.objs.append(o); return o

    def lathe(self, p0, p1, prof, m, bone, seg=14, sx=1.0, sy=1.0, arc=None, smooth=True, up=None):
        """Rings round the axis p0->p1. prof = [(d, r)] with d the distance along the axis from p0; r 0 = a pole.
        arc = (a0, a1) degrees for an open strip (0 = +u, 90 = +v; for a z axis u = X, v = Y)."""
        p0, p1 = V(p0), V(p1); a = (p1 - p0).normalized()
        ref = V(up) if up else (V((1, 0, 0)) if abs(a.x) < 0.9 else V((0, 1, 0)))
        u = (ref - a * ref.dot(a)).normalized(); v = a.cross(u)
        bm = bmesh.new(); rings = []
        n = seg if arc is None else seg + 1
        for d, r in prof:
            c = p0 + a * d
            if r <= 1e-6: rings.append([bm.verts.new(c)]); continue
            ring = []
            for k in range(n):
                ang = 2 * math.pi * k / seg if arc is None else math.radians(arc[0] + (arc[1] - arc[0]) * k / seg)
                ring.append(bm.verts.new(c + (u * math.cos(ang) * sx + v * math.sin(ang) * sy) * r))
            rings.append(ring)
        for A, B in zip(rings, rings[1:]):
            m_ = max(len(A), len(B)); cnt = m_ if arc is None else m_ - 1
            for k in range(cnt):
                k2 = (k + 1) % m_ if arc is None else k + 1
                a0 = A[k % len(A)]; a1 = A[k2 % len(A)]; b0 = B[k % len(B)]; b1 = B[k2 % len(B)]
                vs = [a0, a1, b1, b0]; uniq = []
                for x in vs:
                    if x not in uniq: uniq.append(x)
                if len(uniq) >= 3:
                    try: bm.faces.new(uniq)
                    except ValueError: pass
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        return self._add(bm, m, bone, smooth)

    def caps(self, p0, p1, r0, r1, m, bone, seg=12, sx=1.0, sy=1.0):
        L = (V(p1) - V(p0)).length
        prof = [(-r0 * math.sin(math.radians(q)), r0 * math.cos(math.radians(q))) for q in (90, 60, 30)] + [(0, r0), (L, r1)] + \
               [(L + r1 * math.sin(math.radians(q)), r1 * math.cos(math.radians(q))) for q in (30, 60, 90)]
        return self.lathe(p0, p1, prof, m, bone, seg, sx, sy)

    def ell(self, c, r, m, bone, seg=14, rings=8, axis=(0, 0, 1)):
        c = V(c); a = V(axis).normalized(); rz = r[2]
        prof = [(rz - rz * math.cos(math.pi * k / rings), math.sin(math.pi * k / rings)) for k in range(rings + 1)]
        prof[0] = (0, 0); prof[-1] = (2 * rz, 0)
        return self.lathe(c - a * rz, c + a * rz, prof, m, bone, seg, r[0], r[1])

    def box(self, c, size, m, bone, rot=(0, 0, 0), bevel=0.0, smooth=False, mtx=None, bseg=2):
        bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
        bmesh.ops.scale(bm, vec=size, verts=bm.verts)
        if bevel: bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=bseg, affect="EDGES", profile=0.5)
        M = mtx if mtx is not None else Matrix.Translation(V(c)) @ Euler(rot).to_matrix().to_4x4()
        bmesh.ops.transform(bm, matrix=M, verts=bm.verts)
        return self._add(bm, m, bone, smooth)

    def panel(self, origin, across, upv, wfun, s0, s1, h, m, bone, off=0.0, curve=0.0, rows=10, cols=6, double=False):
        """A curved sheet (shields, tabards): s runs 0 (top) to 1 down the height h; half-width wfun(s); bulges back by curve * x^2."""
        o = V(origin); ax = V(across).normalized(); up = V(upv).normalized(); nrm = ax.cross(up).normalized()   # nrm = the face's outward side
        bm = bmesh.new(); grid = []
        for i in range(rows + 1):
            s = s0 + (s1 - s0) * i / rows; w = wfun(s); row = []
            for j in range(cols + 1):
                x = (2 * j / cols - 1) * w
                row.append(bm.verts.new(o + ax * x - up * (s * h) + nrm * (off - curve * x * x)))
            grid.append(row)
        for i in range(rows):
            for j in range(cols):
                f = [grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]]
                bm.faces.new(f)
                if double: 
                    g = [bm.verts.new(x.co - nrm * 0.012) for x in f]; bm.faces.new(g[::-1])
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
        o_ = self._add(bm, m, bone, True)
        # make sure the front faces look along +nrm
        me = o_.data
        if me.polygons and (me.polygons[0].normal.dot(nrm) < 0) and not double: me.flip_normals()
        return o_

    def _vcol(self):
        """Every part's flat material colour becomes a vertex colour; the parts then share three materials
        (matte, metal, glow), so a whole character is 2-3 draw calls however many colours it has."""
        for o in self.objs:
            me = o.data; src = me.materials[0]; b = src.node_tree.nodes["Principled BSDF"]
            col = tuple(b.inputs["Base Color"].default_value); metal = b.inputs["Metallic"].default_value; emit = b.inputs["Emission Strength"].default_value
            ca = me.color_attributes.new("Col", "FLOAT_COLOR", "CORNER")
            for d in ca.data: d.color = col
            me.color_attributes.active_color = ca; me.color_attributes.render_color_index = 0
            me.materials.clear(); me.materials.append(shared_mat("glow" if emit > 0 else "metal" if metal > 0.3 else "matte"))

    def _join(self, name):
        bpy.ops.object.select_all(action="DESELECT")
        for o in self.objs: o.select_set(True)
        bpy.context.view_layer.objects.active = self.objs[0]; bpy.ops.object.join()
        o = bpy.context.object; o.name = name; o.data.name = name; return o

    def static(self, name=None):
        """Join the parts into one unrigged mesh (props, tiles)."""
        self._vcol(); return self._join(name or self.name)

    def build(self, bones):
        """bones = {name: (parent, head)}. Returns (armature, mesh): one mesh, every part weight 1 to its bone; bone axes = world axes."""
        ad = bpy.data.armatures.new(self.name + "_arm"); arm = bpy.data.objects.new(self.name, ad); bpy.context.scene.collection.objects.link(arm)
        bpy.context.view_layer.objects.active = arm; bpy.ops.object.mode_set(mode="EDIT")
        for bn, (par, head) in bones.items():
            eb = ad.edit_bones.new(bn); eb.head = V(head); eb.tail = V(head) + V((0, 0.1, 0)); eb.roll = 0
            if par: eb.parent = ad.edit_bones[par]
        bpy.ops.object.mode_set(mode="OBJECT")
        for o in self.objs:
            vg = o.vertex_groups.new(name=o["bone"]); vg.add(list(range(len(o.data.vertices))), 1.0, "REPLACE")
        self._vcol(); mesh = self._join(self.name + "_mesh")
        mod = mesh.modifiers.new("Armature", "ARMATURE"); mod.object = arm; mesh.parent = arm
        for pb in arm.pose.bones: pb.rotation_mode = "XYZ"
        return arm, mesh

SHARED = {}
def shared_mat(kind):
    if kind in SHARED: return SHARED[kind]
    m = bpy.data.materials.new(kind); m.use_nodes = True; nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    at = nt.nodes.new("ShaderNodeVertexColor"); at.layer_name = "Col"; nt.links.new(at.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.42 if kind == "metal" else 0.85; b.inputs["Metallic"].default_value = 0.7 if kind == "metal" else 0.0
    if kind == "glow": nt.links.new(at.outputs["Color"], b.inputs["Emission Color"]); b.inputs["Emission Strength"].default_value = 3.0
    SHARED[kind] = m; return m

# ---- animation: a clip is a function t(0..1) -> ({bone: (rx, ry, rz)}, {bone: (x, y, z) offset}) ----------------------
def ease(x): x = max(0.0, min(1.0, x)); return x * x * (3 - 2 * x)
def keyed(keys):
    """keys = [(t, pose, offs)] -> clip function with eased blending between keys."""
    def f(t):
        for (t0, p0, o0), (t1, p1, o1) in zip(keys, keys[1:]):
            if t <= t1 or (t1 == keys[-1][0]):
                k = ease((t - t0) / max(1e-6, t1 - t0)); pose = {}; offs = {}
                for b in set(p0) | set(p1):
                    a, c = p0.get(b, (0, 0, 0)), p1.get(b, (0, 0, 0)); pose[b] = tuple(a[i] + (c[i] - a[i]) * k for i in range(3))
                for b in set(o0) | set(o1):
                    a, c = o0.get(b, (0, 0, 0)), o1.get(b, (0, 0, 0)); offs[b] = tuple(a[i] + (c[i] - a[i]) * k for i in range(3))
                return pose, offs
        return keys[-1][1], keys[-1][2]
    return f

def apply_pose(arm, fn, t):
    pose, offs = fn(t)
    for pb in arm.pose.bones:
        pb.rotation_euler = pose.get(pb.name, (0, 0, 0)); pb.location = offs.get(pb.name, (0, 0, 0))

def bake(arm, clips, fps=30):
    """clips = {name: (fn, seconds, loop)} -> one NLA track per clip (the glTF exporter makes one animation per track)."""
    bpy.context.scene.render.fps = fps
    ad = arm.animation_data_create()
    for name, (fn, secs, loop) in clips.items():
        n = max(2, round(secs * fps)); act = bpy.data.actions.new(name); ad.action = act
        for f in range(n + 1):
            apply_pose(arm, fn, (f / n) % 1.0 if loop and f == n else f / n)
            for pb in arm.pose.bones: pb.keyframe_insert("rotation_euler", frame=f); pb.keyframe_insert("location", frame=f)
        tr = ad.nla_tracks.new(); tr.name = name; tr.strips.new(name, 0, act); ad.action = None

def export(name, anim=True, objs=None):
    """Writes out/<name>.glb. objs = only these objects (and their children)."""
    p = os.path.join(OUT, name + ".glb")
    if objs is not None:
        bpy.ops.object.select_all(action="DESELECT")
        for o in objs:
            o.select_set(True)
            for c in o.children_recursive: c.select_set(True)
    bpy.ops.export_scene.gltf(filepath=p, export_format="GLB", export_yup=True, export_apply=False, export_animations=anim, use_selection=objs is not None,
                              export_vertex_color="ACTIVE", export_all_vertex_colors=False,
                              export_animation_mode="NLA_TRACKS", export_force_sampling=True, export_optimize_animation_size=True)
    print("GLB", p, os.path.getsize(p)); return p

# ---- review renders ----------------------------------------------------------------------------------------------
def studio(bg=(0.07, 0.065, 0.075)):
    w = bpy.data.worlds.new("w"); w.use_nodes = True; bgn = w.node_tree.nodes["Background"]; bgn.inputs[0].default_value = (*bg, 1); bgn.inputs[1].default_value = 1.0
    bpy.context.scene.world = w
    for nm, d, e, col in (("key", (0.5, 0.55, -0.7), 3.2, (1.0, 0.86, 0.68)), ("fill", (-0.7, 0.2, -0.3), 0.9, (0.55, 0.65, 0.95)), ("rim", (0.2, -0.9, -0.3), 1.6, (0.7, 0.8, 1.0))):
        l = bpy.data.lights.new(nm, "SUN"); l.energy = e; l.color = col; o = bpy.data.objects.new(nm, l); bpy.context.scene.collection.objects.link(o)
        o.rotation_euler = V(d).to_track_quat("-Z", "Y").to_euler()

def shot(path, loc, target, ortho=2.2, w=420, h=480):
    for o in [x for x in bpy.context.scene.objects if x.type == "CAMERA"]: bpy.data.objects.remove(o)
    c = bpy.data.cameras.new("cam"); c.type = "ORTHO"; c.ortho_scale = ortho; c.sensor_fit = "VERTICAL"
    o = bpy.data.objects.new("cam", c); bpy.context.scene.collection.objects.link(o); o.location = loc
    o.rotation_euler = (V(target) - V(loc)).to_track_quat("-Z", "Y").to_euler(); bpy.context.scene.camera = o
    s = bpy.context.scene; s.render.engine = "BLENDER_EEVEE"; s.render.resolution_x, s.render.resolution_y = w, h; s.render.filepath = path
    s.view_settings.view_transform = "Standard"; s.eevee.taa_render_samples = 16
    bpy.ops.render.render(write_still=True)

def iso_cam(yaw_deg, elev=30, dist=8, target=(0, 0, 0.75)):
    y = math.radians(yaw_deg); e = math.radians(elev)
    return (target[0] + dist * math.cos(e) * math.sin(y), target[1] - dist * math.cos(e) * math.cos(y), target[2] + dist * math.sin(e))
