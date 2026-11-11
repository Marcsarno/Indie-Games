"""The forest of the third-person game ("The World"), designed for a camera down among the trees (early-WoW scale:
trunks you walk between, canopies overhead). Everything is vertex-coloured low-poly made here in headless Blender.
  pine0-5, oak0-5 (two are whimsical: one golden, one in pink blossom), bush0-5, fern0-5, rock0-5, grass0-2, flower0-2
One unit = one game tile; the hero is 1.65 tall.
Run:  blender -b --python scripts/flora.py            -> out/flora/f_<name>.glb
      SHEET=1 blender -b --python scripts/flora.py    -> also out/flora/sheet_<family>.png (review pictures with a hero-sized post)"""
import bpy, bmesh, math, os, random, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit
from mathutils import Vector, Matrix, noise

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "out", "flora"); os.makedirs(OUT, exist_ok=True)
lin = lambda c: tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c)
mix = lambda a, b, t: tuple(a[i] + (b[i] - a[i]) * max(0.0, min(1.0, t)) for i in range(3))
def jit(c, R, k=0.05): return tuple(max(0.0, min(1.0, x + R.uniform(-k, k))) for x in c)

class B:
    """Collects vertex-coloured geometry for one model."""
    def __init__(self): self.bm = bmesh.new(); self.col = {}
    def v(self, co, c): vt = self.bm.verts.new(co); self.col[vt] = c; return vt
    def f(self, vs, smooth=True):
        if len(set(vs)) < 3: return
        try: fc = self.bm.faces.new(vs); fc.smooth = smooth
        except ValueError: pass
    def tube(self, pts, radii, seg, colfn, smooth=True, cap=True, lobes=0, lobe_amt=0.0):
        """A tube along the points. colfn(k, t, ang) -> colour. lobes: ripple the rim (roots, scalloped boughs)."""
        rings = []; up0 = Vector((0, 0, 1))
        for k, (p, r) in enumerate(zip(pts, radii)):
            p = Vector(p); a = Vector(pts[min(k + 1, len(pts) - 1)]) - Vector(pts[max(k - 1, 0)])
            a = a.normalized() if a.length > 1e-6 else up0
            ref = Vector((1, 0, 0)) if abs(a.x) < 0.9 else Vector((0, 1, 0)); u = (ref - a * ref.dot(a)).normalized(); w = a.cross(u)
            ring = []
            for i in range(seg):
                ang = 2 * math.pi * i / seg; rr = r * (1 + (lobe_amt * math.cos(ang * lobes) if lobes and k == 0 else 0))
                ring.append(self.v(p + (u * math.cos(ang) + w * math.sin(ang)) * rr, colfn(k, k / max(1, len(pts) - 1), ang)))
            rings.append(ring)
        for A, Bq in zip(rings, rings[1:]):
            for i in range(seg): self.f([A[i], A[(i + 1) % seg], Bq[(i + 1) % seg], Bq[i]], smooth)
        if cap: self.f(list(reversed(rings[0])), smooth); self.f(rings[-1], smooth)
        return rings
    def puff(self, c, r, squash, dark, light, seed, sub=2, rough=0.22, smooth=False, tint=None, R=None):
        """A clump of leaves: a lumpy faceted ball, dark underneath and toward the trunk, light on top."""
        tmp = bmesh.new(); bmesh.ops.create_icosphere(tmp, subdivisions=sub, radius=1.0); c = Vector(c); vm = {}
        for v in tmp.verts:
            n = v.co.normalized(); d = 1 + rough * noise.noise(n * 1.7 + Vector((seed, seed * 0.37, -seed))) + rough * 0.5 * noise.noise(n * 3.9 + Vector((seed * 2.1, 0, seed)))
            p = Vector((n.x * r * d, n.y * r * d, n.z * r * d * squash)); t = n.z * 0.5 + 0.5
            col = mix(dark, light, t ** 1.3 + 0.18 * noise.noise(n * 2.3 + Vector((seed, 0, 0))))
            if tint and R and R.random() < tint[1]: col = mix(col, tint[0], 0.75)
            vm[v] = self.v(c + p, col)
        for f in tmp.faces: self.f([vm[v] for v in f.verts], smooth)
        tmp.free()
    def blade(self, base, d, length, width, lean, dark, light, segs=4, twist=0.0):
        """A grass blade / frond: a tapering strip that bends over."""
        d = Vector(d).normalized(); side = Vector((-d.y, d.x, 0)); rows = []
        for k in range(segs + 1):
            t = k / segs; c = Vector(base) + d * (lean * length * t * t) + Vector((0, 0, length * (t - 0.25 * lean * t * t))); w = width * (1 - t) ** 0.7
            s = (side * math.cos(twist * t) + Vector((0, 0, 1)) * math.sin(twist * t) * 0.3)
            col = mix(dark, light, t)
            rows.append((self.v(c - s * w, col), self.v(c + s * w, col)) if w > 1e-4 else (self.v(c, col),))
        for A, Bq in zip(rows, rows[1:]):
            if len(Bq) == 1: self.f([A[0], A[1], Bq[0]])
            else: self.f([A[0], A[1], Bq[1], Bq[0]])
    def finish(self, name):
        bm = self.bm; layer = bm.loops.layers.float_color.new("Col")
        for f in bm.faces:
            for l in f.loops: l[layer] = (*lin(self.col[l.vert]), 1)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
        me.color_attributes.active_color = me.color_attributes["Col"]; me.color_attributes.render_color_index = 0
        ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob)
        m = kit.shared_mat("matte"); m.use_backface_culling = False; me.materials.append(m); return ob

BARK_D, BARK_L = (0.30, 0.20, 0.14), (0.62, 0.47, 0.32)
def trunk(b, R, h, r0, r1, bend=0.25, seg=9, roots=5, bark=(BARK_D, BARK_L)):
    """A trunk with a flared, lobed foot. Returns its centre line (for hanging branches)."""
    bx, by = R.uniform(-bend, bend), R.uniform(-bend, bend); n = 7; pts = []; rad = []
    for k in range(n + 1):
        t = k / n; pts.append((bx * t * t, by * t * t, h * t - 0.05)); rad.append((r0 + (r1 - r0) * t ** 0.8) * (1 + 1.1 * max(0, 0.16 - t) / 0.16 * 0.9))
    b.tube(pts, rad, seg, lambda k, t, a: mix(bark[0], bark[1], 0.25 + 0.6 * t + 0.25 * math.sin(a * 3 + k)), lobes=roots, lobe_amt=0.28)
    return [Vector(p) for p in pts]
def branch(b, R, p0, d, length, r, bark=(BARK_D, BARK_L)):
    d = Vector(d).normalized(); pts = [Vector(p0) + d * (length * t) + Vector((0, 0, 0.25 * length * t * t)) for t in (0, 0.35, 0.7, 1)]
    b.tube(pts, [r, r * 0.75, r * 0.5, r * 0.25], 6, lambda k, t, a: mix(bark[0], bark[1], 0.4 + 0.4 * t)); return pts[-1]

def pine(seed):
    R = random.Random(100 + seed); b = B(); h = R.uniform(7.2, 9.6); r0 = R.uniform(0.26, 0.36)
    line = trunk(b, R, h, r0, 0.05, bend=0.35, seg=8, roots=5, bark=((0.30, 0.19, 0.14), (0.64, 0.44, 0.32)))
    at = lambda z: line[min(len(line) - 1, max(0, int(z / h * (len(line) - 1))))].lerp(line[min(len(line) - 1, int(z / h * (len(line) - 1)) + 1)], (z / h * (len(line) - 1)) % 1)
    dark, mid, light = (0.07, 0.24, 0.22), (0.15, 0.42, 0.26), (0.46, 0.68, 0.30)
    tiers = R.randint(7, 9); z0 = R.uniform(2.1, 2.7); rb = R.uniform(2.0, 2.6)
    for k in range(tiers):
        t = k / (tiers - 1); z = z0 + (h - z0 - 0.5) * t ** 0.92; rad = rb * (1 - t) ** 0.85 + 0.35; c = at(z); n = 9 + (tiers - k) // 2; ph = R.uniform(0, 6.28); droop = 0.42 * rad
        top = b.v(c + Vector((0, 0, rad * 0.62)), mix(mid, light, 0.35)); rim = []; under = b.v(c + Vector((0, 0, -0.08)), dark)
        for i in range(2 * n):
            a = ph + math.pi * i / n; out = i % 2 == 0; rr = rad * (1.0 if out else 0.62) * R.uniform(0.9, 1.08)
            rim.append(b.v(c + Vector((math.cos(a) * rr, math.sin(a) * rr, -droop * (1.0 if out else 0.45) + R.uniform(-0.05, 0.05))), jit(light if out else mid, R, 0.04)))
        for i in range(2 * n): b.f([top, rim[i], rim[(i + 1) % (2 * n)]], False); b.f([under, rim[(i + 1) % (2 * n)], rim[i]], False)
    tip = at(h - 0.45); b.tube([tip, tip + Vector((0, 0, 0.5)), tip + Vector((0, 0, 1.0))], [0.3, 0.16, 0.0], 6, lambda k, t, a: mix(mid, light, t), smooth=False)
    for k in range(R.randint(2, 4)):   # a few dead stubs low on the trunk
        z = R.uniform(1.0, z0 - 0.2); a = R.uniform(0, 6.28); branch(b, R, at(z), (math.cos(a), math.sin(a), 0.25), R.uniform(0.35, 0.7), 0.05)
    return b.finish(f"pine{seed}")

OAK_LOOKS = [((0.12, 0.36, 0.14), (0.58, 0.80, 0.26), None), ((0.10, 0.38, 0.20), (0.48, 0.82, 0.36), None), ((0.15, 0.34, 0.12), (0.66, 0.80, 0.24), None),
             ((0.12, 0.38, 0.17), (0.54, 0.80, 0.30), None), ((0.62, 0.36, 0.10), (1.0, 0.84, 0.30), None), ((0.80, 0.42, 0.58), (1.0, 0.80, 0.90), None)]
def oak(seed):
    R = random.Random(200 + seed); b = B(); dark, light, tint = OAK_LOOKS[seed % 6]
    h = R.uniform(3.2, 4.0); r0 = R.uniform(0.5, 0.66); line = trunk(b, R, h, r0, r0 * 0.66, bend=0.45, seg=10, roots=6)
    top = line[-1]; ends = [top + Vector((0, 0, 1.5))]
    for k in range(R.randint(3, 4)):
        a = k * 2.1 + R.uniform(-0.4, 0.4); ends.append(branch(b, R, line[-2] + Vector((0, 0, R.uniform(-0.3, 0.2))), (math.cos(a), math.sin(a), R.uniform(0.55, 0.9)), R.uniform(1.8, 2.5), r0 * 0.36))
    for k, e in enumerate(ends):
        rr = R.uniform(1.9, 2.3) if k == 0 else R.uniform(1.4, 1.9); b.puff(e + Vector((0, 0, rr * 0.3)), rr, 0.88, dark, light, seed * 7 + k, sub=2, tint=tint, R=R)
        for j in range(2):   # smaller clumps round each big one, so the outline is broken
            a = R.uniform(0, 6.28); b.puff(e + Vector((math.cos(a) * rr * 0.85, math.sin(a) * rr * 0.85, R.uniform(-0.2, 0.7))), rr * R.uniform(0.5, 0.68), 0.85, dark, light, seed * 13 + k * 3 + j, sub=1, tint=tint, R=R)
    return b.finish(f"oak{seed}")

def bush(seed):
    R = random.Random(300 + seed); b = B(); dark, light = (0.10, 0.34, 0.15), (0.52, 0.78, 0.28); sc = [1.0, 1.35, 0.8, 1.15, 1.5, 0.9][seed % 6]
    berry = [(0.92, 0.18, 0.22), (0.70, 0.45, 1.0), None, (1.0, 0.92, 0.5), None, (1.0, 0.6, 0.82)][seed % 6]; tops = []
    for k in range(R.randint(5, 7)):
        a = R.uniform(0, 6.28); d = (0.0 if k == 0 else R.uniform(0.3, 0.62)) * sc; r = (0.5 if k == 0 else R.uniform(0.3, 0.44)) * sc; c = Vector((math.cos(a) * d, math.sin(a) * d, r * 0.7))
        b.puff(c, r, 0.9, dark, light, seed * 5 + k, sub=2, rough=0.34); tops.append((c, r))
    if berry:
        for k in range(14):
            c, r = R.choice(tops); n = Vector((R.uniform(-1, 1), R.uniform(-1, 1), R.uniform(0.1, 1))).normalized(); p = c + Vector((n.x * r, n.y * r, n.z * r * 0.9)) * 1.02
            b.puff(p, 0.055 * sc, 1.0, mix(berry, (0, 0, 0), 0.25), berry, k, sub=0, rough=0.0)
    return b.finish(f"bush{seed}")

def fern(seed):
    R = random.Random(400 + seed); b = B(); dark, light = (0.08, 0.36, 0.14), (0.56, 0.84, 0.30); n = R.randint(7, 9)
    for k in range(n):
        a = 2 * math.pi * k / n + R.uniform(-0.25, 0.25); L = R.uniform(0.8, 1.2); d = Vector((math.cos(a), math.sin(a), 0)); side = Vector((-d.y, d.x, 0)); prev = None; lift = R.uniform(0.45, 0.8)
        for s in range(7):   # a frond: a broad leaf with a raised midrib that rises, then arches over to a point
            t = s / 6; c = d * (L * (0.08 + 0.92 * t)) + Vector((0, 0, lift * L * math.sin(t * 2.0) - 0.1 * t)); w = 0.26 * L * (t + 0.12) ** 0.45 * (1 - t) ** 0.8
            row = (b.v(c - side * w + Vector((0, 0, -0.07)), mix(dark, light, 0.15 + t * 0.5)), b.v(c, mix(dark, light, 0.4 + t * 0.6)), b.v(c + side * w + Vector((0, 0, -0.07)), mix(dark, light, 0.15 + t * 0.5)))
            if prev: b.f([prev[0], prev[1], row[1], row[0]], False); b.f([prev[1], prev[2], row[2], row[1]], False)
            prev = row
    return b.finish(f"fern{seed}")

def rock(seed):
    R = random.Random(500 + seed); b = B(); s = [0.55, 0.8, 1.05, 0.7, 1.3, 0.9][seed % 6]; grey_d, grey_l, moss = (0.40, 0.40, 0.44), (0.80, 0.79, 0.74), (0.40, 0.62, 0.24)
    tmp = bmesh.new(); bmesh.ops.create_icosphere(tmp, subdivisions=2, radius=1.0); vm = {}; sq = (R.uniform(0.9, 1.3), R.uniform(0.8, 1.15), R.uniform(0.55, 0.85))
    for v in tmp.verts:
        n = v.co.normalized(); d = 1 + 0.32 * noise.noise(n * 1.3 + Vector((seed * 3.1, 0, seed))) + 0.12 * noise.noise(n * 3.5 + Vector((0, seed, 0)))
        p = Vector((n.x * sq[0] * d * s, n.y * sq[1] * d * s, max(-0.12, n.z * sq[2] * d * s + s * 0.3)))
        col = mix(grey_d, grey_l, n.z * 0.45 + 0.5 + 0.15 * noise.noise(n * 4)); col = mix(col, moss, max(0.0, n.z - 0.3) * 2.2 * (0.6 + 0.4 * noise.noise(n * 2.2 + Vector((seed, 0, 0)))))
        vm[v] = b.v(p, col)
    for f in tmp.faces: b.f([vm[v] for v in f.verts], False)
    tmp.free(); return b.finish(f"rock{seed}")

def grass(seed):
    R = random.Random(600 + seed); b = B(); dark, light = (0.58, 0.68, 0.50), (1.0, 1.0, 0.90)   # near white: the game tints each tuft by the ground under it
    for k in range([11, 15, 8][seed % 3]):
        a = R.uniform(0, 6.28); d0 = R.uniform(0.0, 0.2); b.blade((math.cos(a) * d0, math.sin(a) * d0, 0), (math.cos(a + R.uniform(-0.6, 0.6)), math.sin(a + R.uniform(-0.6, 0.6)), 0), R.uniform(0.3, 0.72) * [1, 1.25, 0.8][seed % 3], R.uniform(0.035, 0.06), R.uniform(0.25, 0.6), dark, light, segs=4, twist=R.uniform(-0.6, 0.6))
    return b.finish(f"grass{seed}")

def flower(seed):
    R = random.Random(700 + seed); b = B(); petal = [(0.66, 0.42, 0.98), (1.0, 1.0, 1.0), (1.0, 0.82, 0.25)][seed % 3]; heart = [(1.0, 0.9, 0.4), (1.0, 0.8, 0.2), (0.9, 0.45, 0.1)][seed % 3]
    for k in range(5): a = R.uniform(0, 6.28); b.blade((0, 0, 0), (math.cos(a), math.sin(a), 0), R.uniform(0.2, 0.4), 0.04, 0.5, (0.12, 0.34, 0.14), (0.42, 0.66, 0.25))
    for k in range(R.randint(3, 5)):
        a = R.uniform(0, 6.28); d = R.uniform(0.05, 0.22); hgt = R.uniform(0.25, 0.45); c = Vector((math.cos(a) * d, math.sin(a) * d, hgt)); stem = (0.30, 0.58, 0.22)
        b.tube([(c.x * 0.4, c.y * 0.4, 0), c], [0.008, 0.006], 4, lambda k_, t, a_: stem, cap=False)
        hub = b.v(c + Vector((0, 0, 0.02)), heart); ring = [b.v(c + Vector((math.cos(i * 1.2566) * 0.14, math.sin(i * 1.2566) * 0.14, 0.06)), petal) for i in range(5)]; mids = [b.v(c + Vector((math.cos(i * 1.2566 + 0.63) * 0.06, math.sin(i * 1.2566 + 0.63) * 0.06, 0.03)), mix(petal, heart, 0.3)) for i in range(5)]
        for i in range(5): b.f([hub, mids[i - 1], ring[i], mids[i]], False)
    return b.finish(f"flower{seed}")

FAMILIES = {"pine": (pine, 6), "oak": (oak, 6), "bush": (bush, 6), "fern": (fern, 6), "rock": (rock, 6), "grass": (grass, 3), "flower": (flower, 3)}

def sheet(fam, fn, n, spacing, camdist, camh):
    """A review picture: the family in a row on grass under a sun, with a hero-sized post (1.65) for scale."""
    kit.reset(); obs = [fn(k) for k in range(n)]
    for k, o in enumerate(obs): o.location.x = (k - (n - 1) / 2) * spacing
    bpy.ops.mesh.primitive_plane_add(size=200); g = bpy.context.object; gm = bpy.data.materials.new("g"); gm.diffuse_color = (0.20, 0.36, 0.12, 1); gm.use_nodes = True; gm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.20, 0.36, 0.12, 1); g.data.materials.append(gm)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.28, depth=1.65, location=(-(n / 2) * spacing - 0.2, -1.5, 0.825)); post = bpy.context.object; pm = bpy.data.materials.new("p"); pm.use_nodes = True; pm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.8, 0.15, 0.1, 1); post.data.materials.append(pm)
    w = bpy.data.worlds.new("w"); w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.55, 0.75, 0.95, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 0.9; bpy.context.scene.world = w
    l = bpy.data.lights.new("sun", "SUN"); l.energy = 3.4; l.color = (1.0, 0.93, 0.8); lo = bpy.data.objects.new("sun", l); bpy.context.scene.collection.objects.link(lo); lo.rotation_euler = Vector((0.5, 0.35, -0.8)).to_track_quat("-Z", "Y").to_euler()
    c = bpy.data.cameras.new("cam"); c.lens = 32; co = bpy.data.objects.new("cam", c); bpy.context.scene.collection.objects.link(co); co.location = (0, -camdist, camh)
    co.rotation_euler = (Vector((0, 0, camh * 0.55)) - co.location).to_track_quat("-Z", "Y").to_euler(); s = bpy.context.scene; s.camera = co
    s.render.engine = "BLENDER_EEVEE"; s.render.resolution_x, s.render.resolution_y = 1400, 600; s.view_settings.view_transform = "Standard"; s.render.filepath = os.path.join(OUT, f"sheet_{fam}.png"); bpy.ops.render.render(write_still=True)

if __name__ == "__main__":
    only = os.environ.get("ONLY", "").split(",") if os.environ.get("ONLY") else None
    if os.environ.get("SHEET"):
        for fam, (fn, n) in FAMILIES.items():
            if only and fam not in only: continue
            big = fam in ("pine", "oak"); sheet(fam, fn, n, 6.5 if big else 2.2 if fam in ("bush", "rock", "fern") else 1.2, 30 if big else 9 if fam in ("bush", "rock", "fern") else 4.5, 4.5 if big else 1.6 if fam in ("bush", "rock", "fern") else 0.9)
    for fam, (fn, n) in FAMILIES.items():
        if only and fam not in only: continue
        for k in range(n):
            kit.reset(); ob = fn(k)
            bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, f"f_{fam}{k}.glb"), export_format="GLB", export_yup=True, export_animations=False, export_vertex_color="ACTIVE", export_all_vertex_colors=False)
            print("FLORA", fam, k, "tris", sum(len(p.vertices) - 2 for p in ob.data.polygons), flush=True)
