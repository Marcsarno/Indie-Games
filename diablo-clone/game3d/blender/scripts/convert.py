"""Builds 3D models from the 2D game's rigs (exported by tools/dump.cjs): one skinned mesh per character, one bone per
part (two for a cone or cylinder, so limbs can change length and keep round ends), the paint as a small texture, every
clip of the game as an animation (one key per game frame; the time in seconds is the game's frame number).
Run:  blender -b --python scripts/convert.py -- <rigs dir> <out dir> [name ...]      (REVIEW=1 also renders <name>.png)"""
import bpy, bmesh, json, math, os, sys, time
import numpy as np
from mathutils import Vector, Matrix, Quaternion

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def pack(blocks, W=256):
    """Shelf-packs [(w, h)] into a W-wide atlas. Returns [(x, y)], H."""
    order = sorted(range(len(blocks)), key=lambda i: -blocks[i][1]); pos = [None] * len(blocks); x = y = rowh = 0
    for i in order:
        w, h = blocks[i]
        if x + w > W: x = 0; y += rowh; rowh = 0
        pos[i] = (x, y); x += w; rowh = max(rowh, h)
    H = 16
    while H < y + rowh: H *= 2
    return pos, H

def build(data, outdir, review=False):
    reset(); name = data["name"]; parts = data["parts"]; mats = {int(k): v for k, v in data["mats"].items()}
    # ---- the paint atlas: a 4x4 swatch per material, and a block (with a 1 texel border) per painted part
    mids = sorted(mats); blocks = [(4, 4)] * len(mids) + [(p["tex"]["w"] + 2, p["tex"]["h"] + 2) for p in parts if "tex" in p]
    pos, H = pack(blocks); W = 256; px = np.zeros((H, W, 4), dtype=np.float32); px[..., 3] = 1
    swatch = {}
    for i, m in enumerate(mids):
        x, y = pos[i]; px[y:y + 4, x:x + 4, :3] = mats[m]["rgb"]; swatch[m] = ((x + 2) / W, (y + 2) / H)
    lut = np.zeros((max(mids) + 1, 3), dtype=np.float32)
    for m in mids: lut[m] = mats[m]["rgb"]
    rect = {}; bi = len(mids)
    for k, p in enumerate(parts):
        if "tex" not in p: continue
        w, h = p["tex"]["w"], p["tex"]["h"]; x, y = pos[bi]; bi += 1
        g = lut[np.array(p["tex"]["ids"], dtype=np.int32).reshape(h, w)]
        g = np.concatenate([g[:, -1:], g, g[:, :1]], axis=1); g = np.concatenate([g[:1], g, g[-1:]], axis=0)   # wrap round the axis, clamp along it
        px[y:y + h + 2, x:x + w + 2, :3] = g; rect[k] = ((x + 1) / W, (y + 1) / H, w / W, h / H)
    img = bpy.data.images.new(name + "_paint", W, H, alpha=False); img.pixels.foreach_set(px.reshape(-1)); img.pack()
    def material(cls):
        m = bpy.data.materials.new(cls); m.use_nodes = True; nt = m.node_tree; b = nt.nodes["Principled BSDF"]
        tx = nt.nodes.new("ShaderNodeTexImage"); tx.image = img; tx.interpolation = "Linear"; nt.links.new(tx.outputs["Color"], b.inputs["Base Color"])
        b.inputs["Roughness"].default_value = 0.4 if cls == "metal" else 0.85; b.inputs["Metallic"].default_value = 0.75 if cls == "metal" else 0.0
        if cls == "glow": nt.links.new(tx.outputs["Color"], b.inputs["Emission Color"]); b.inputs["Emission Strength"].default_value = 2.5
        return m
    mat_of = {}
    static = bool(data.get("static"))
    # ---- the armature: bone p<k> at each part's origin, its axes the part's axes (y along the part)
    ad = bpy.data.armatures.new(name + "_arm"); arm = bpy.data.objects.new(name, ad); bpy.context.scene.collection.objects.link(arm)
    bpy.context.view_layer.objects.active = arm; bpy.ops.object.mode_set(mode="EDIT")
    rest = []
    for k, p in enumerate(parts):
        q = Quaternion(p["q"]); R = q.to_matrix(); o = Vector(p["o"]); ey = R.col[1]; ez = R.col[2]
        ends = [(f"p{k}", o)] + ([(f"p{k}b", o + ey * p["L"])] if p.get("L") is not None else [])
        for bn, head in ends:
            eb = ad.edit_bones.new(bn); eb.head = head; eb.tail = head + ey * 0.05; eb.align_roll(ez)
        rest.append((o, q, R))
    bpy.ops.object.mode_set(mode="OBJECT")
    # ---- the mesh
    objs = []
    for k, p in enumerate(parts):
        o, q, R = rest[k]; M = Matrix.Translation(o) @ R.to_4x4(); bm = bmesh.new(); uvl = bm.loops.layers.uv.new("UVMap"); dl = bm.verts.layers.deform.new()
        cls = mats[p["m"]]["cls"]; uv0 = swatch[p["m"]]; rc = rect.get(k)
        two = p.get("L") is not None; endof = {}
        if p["kind"] == "box":
            hx, hy, hz = p["half"]; bmesh.ops.create_cube(bm, size=2.0); bmesh.ops.scale(bm, vec=(max(hx, 1e-4), max(hy, 1e-4), max(hz, 1e-4)), verts=bm.verts)
            bv = min(hx, hy, hz) * 0.3; hs = (hx, hy, hz)
            if bv > 0.004 and not rc: bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bv, segments=1, affect="EDGES")
            bm.normal_update()
            for f in bm.faces:
                f.smooth = False
                if not rc:
                    for l in f.loops: l[uvl].uv = uv0
                    continue
                n = f.normal; ax = max(range(3), key=lambda i: abs(n[i])); face = ax * 2 + (1 if n[ax] < 0 else 0); oth = [i for i in range(3) if i != ax]; N = p["tex"]["box"]
                for l in f.loops:
                    a = (l.vert.co[oth[0]] / max(hs[oth[0]], 1e-5) + 1) / 2; b = (l.vert.co[oth[1]] / max(hs[oth[1]], 1e-5) + 1) / 2
                    a = (0.5 + a * (N - 1)) / N; b = (0.5 + b * (N - 1)) / N
                    l[uvl].uv = (rc[0] + (face + a) / 6 * rc[2], rc[1] + b * rc[3])
        else:
            seg = p["seg"]; rows = p["rows"]; ring = []
            for r in rows:
                d, rx, rz, v, end = r
                if rx < 1e-6 and rz < 1e-6: vs = [bm.verts.new((0, d, 0))]
                else: vs = [bm.verts.new((rx * math.cos(2 * math.pi * i / seg), d, rz * math.sin(2 * math.pi * i / seg))) for i in range(seg)]
                for x in vs: endof[x] = end
                ring.append(vs)
            for a in range(len(rows) - 1):
                A, Bq = ring[a], ring[a + 1]; va, vb = rows[a][3], rows[a + 1][3]
                if len(A) == 1 and len(Bq) == 1: continue
                for i in range(seg):
                    u0, u1 = i / seg, (i + 1) / seg
                    cs = [(A[i % len(A)], u0, va), (A[(i + 1) % len(A)], u1, va), (Bq[(i + 1) % len(Bq)], u1, vb), (Bq[i % len(Bq)], u0, vb)]
                    if len(A) == 1: cs = [cs[0], cs[2], cs[3]]
                    elif len(Bq) == 1: cs = cs[:3]
                    if len({c[0] for c in cs}) < 3: continue
                    try: f = bm.faces.new([c[0] for c in cs])
                    except ValueError: continue
                    f.smooth = True
                    for l, c in zip(f.loops, cs): l[uvl].uv = (rc[0] + c[1] * rc[2], rc[1] + c[2] * rc[3]) if rc else uv0
            bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.verts.ensure_lookup_table()
        me = bpy.data.meshes.new("p"); ob = bpy.data.objects.new(f"part{k}", me); bpy.context.scene.collection.objects.link(ob)
        ga = ob.vertex_groups.new(name=f"p{k}"); gb = ob.vertex_groups.new(name=f"p{k}b") if two else None
        ends = [endof.get(v, 0) for v in bm.verts]
        bmesh.ops.transform(bm, matrix=M, verts=bm.verts); bm.to_mesh(me); bm.free()
        for g, e in ((ga, 0), (gb, 1)):
            if g:
                idx = [i for i, x in enumerate(ends) if x == e]
                if idx: g.add(idx, 1.0, "REPLACE")
        if cls not in mat_of: mat_of[cls] = material(cls)
        me.materials.append(mat_of[cls]); objs.append(ob)
    bpy.ops.object.select_all(action="DESELECT")
    for ob in objs: ob.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]; bpy.ops.object.join(); mesh = bpy.context.object; mesh.name = name + "_mesh"
    if static:
        mesh.vertex_groups.clear(); bpy.data.objects.remove(arm); mesh.name = name
        tris = sum(len(p.vertices) - 2 for p in mesh.data.polygons); p = os.path.join(outdir, name + ".glb")
        bpy.ops.export_scene.gltf(filepath=p, export_format="GLB", export_yup=True, export_apply=False, export_animations=False, export_image_format="AUTO")
        return tris, 0, os.path.getsize(p)
    mod = mesh.modifiers.new("Armature", "ARMATURE"); mod.object = arm; mesh.parent = arm
    for pb in arm.pose.bones: pb.rotation_mode = "QUATERNION"
    # ---- the clips
    bpy.context.scene.render.fps = 2   # frame = 2 x the game's frame number (walk has half frames); seconds in the file = the game's frame number
    ad_ = arm.animation_data_create(); pbs = arm.pose.bones; TINY = (1e-4, 1e-4, 1e-4)
    restinv = [(o, q.inverted(), R.transposed()) for o, q, R in rest]
    for cname, clip in data["clips"].items():
        act = bpy.data.actions.new(cname); ad_.action = act; ts = list(clip["t"]); frames = list(clip["f"]); loop = data.get("loops", {}).get(cname)
        if loop and len(ts) > 1: ts.append(loop); frames.append(frames[0])
        lastq = {}
        for t, fr in zip(ts, frames):
            fnum = round(t * 2)
            for k, rec in enumerate(fr):
                o0, q0i, R0t = restinv[k]; two = parts[k].get("L") is not None
                chans = []
                if rec is None: chans = [(f"p{k}", None, None, TINY)] + ([(f"p{k}b", None, None, TINY)] if two else [])
                else:
                    q = Quaternion(rec[3:7]); ql = q0i @ q
                    if two:
                        sa, sb = rec[7], rec[11]; ob_ = Vector(rec[8:11]); o0b = o0 + rest[k][2].col[1] * parts[k]["L"]
                        chans = [(f"p{k}", R0t @ (Vector(rec[0:3]) - o0), ql, (sa, sa, sa)), (f"p{k}b", R0t @ (ob_ - o0b), ql, (sb, sb, sb))]
                    else: chans = [(f"p{k}", R0t @ (Vector(rec[0:3]) - o0), ql, tuple(rec[7:10]))]
                for bn, loc, ql, sc in chans:
                    pb = pbs[bn]
                    if loc is not None:
                        if bn in lastq and lastq[bn].dot(ql) < 0: ql = -ql
                        lastq[bn] = ql.copy(); pb.location = loc; pb.rotation_quaternion = ql
                        pb.keyframe_insert("location", frame=fnum); pb.keyframe_insert("rotation_quaternion", frame=fnum)
                    pb.scale = [max(1e-4, s) for s in sc]; pb.keyframe_insert("scale", frame=fnum)
        tr = ad_.nla_tracks.new(); tr.name = cname; tr.strips.new(cname, 0, act); ad_.action = None
    for pb in pbs: pb.location = (0, 0, 0); pb.rotation_quaternion = (1, 0, 0, 0); pb.scale = (1, 1, 1)
    tris = sum(len(p.vertices) - 2 for p in mesh.data.polygons)
    if review:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import kit
        kit.studio(); h = data.get("height", 1.6)
        for yaw in (-20, 70, 160):
            kit.shot(os.path.join(outdir, f"{name}_{yaw}.png"), ( (h * 0.5 + 6 * math.cos(math.radians(30)) * math.cos(math.radians(yaw))), 6 * math.cos(math.radians(30)) * math.sin(math.radians(yaw)), h * 0.5 + 3), (0, 0, h * 0.5), ortho=h * 1.5, w=360, h=420)
    p = os.path.join(outdir, name + ".glb")
    bpy.ops.export_scene.gltf(filepath=p, export_format="GLB", export_yup=True, export_apply=False, export_animations=True, export_animation_mode="NLA_TRACKS",
                              export_force_sampling=True, export_optimize_animation_size=False, export_image_format="AUTO")
    return tris, len(pbs), os.path.getsize(p)

if __name__ == "__main__":
    args = sys.argv[sys.argv.index("--") + 1:]; src, out = args[0], args[1]; names = args[2:] or [f[:-5] for f in sorted(os.listdir(src)) if f.endswith(".json") and f != "manifest.json"]
    os.makedirs(out, exist_ok=True)
    for n in names:
        t0 = time.time(); data = json.load(open(os.path.join(src, n + ".json")))
        try:
            tris, bones, size = build(data, out, review=bool(os.environ.get("REVIEW")))
            print(f"GLB {data.get('label', ''):14s} {n}  tris {tris}  bones {bones}  {size // 1024} KB  {time.time() - t0:.1f} s", flush=True)
        except Exception as e:
            import traceback; traceback.print_exc(); print("FAILED", n, e, flush=True)
