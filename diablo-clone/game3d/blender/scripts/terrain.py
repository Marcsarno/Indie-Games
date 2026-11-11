"""Ground paint and the far backdrop of the third-person game, made in headless Blender.
  d_grass.png, d_dirt.png, d_stone.png : tiling hand-painted-style ground detail. Each is real geometry (thousands of little
      brush strokes, pebbles, flagstones) looked at straight down by an orthographic camera and rendered flat. Mid grey = no
      change; the game multiplies the ground's own colour by this (x2), so one grass detail serves every shade of grass.
  w_sky.glb : the sky dome (a painted gradient), puffy clouds, a ring of near hills and far snow-capped mountains.
Run:  blender -b --python scripts/terrain.py        -> out/terrain/"""
import bpy, bmesh, math, os, random, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit
from mathutils import Vector, noise
from flora import B, mix, lin

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "out", "terrain"); os.makedirs(OUT, exist_ok=True)
S = 4.0   # a detail picture covers S x S tiles

class Paint:
    """Flat shapes stacked in painting order, repeated across the borders so the picture tiles."""
    def __init__(self): self.bm = bmesh.new(); self.layer = self.bm.loops.layers.float_color.new("Col"); self.z = 0.0
    def poly(self, pts, cols):
        self.z += 2e-5
        for ox in (-S, 0, S):
            for oy in (-S, 0, S):
                if not any(-0.3 < x + ox < S + 0.3 and -0.3 < y + oy < S + 0.3 for x, y in pts): continue
                vs = [self.bm.verts.new((x + ox, y + oy, self.z)) for x, y in pts]
                try: f = self.bm.faces.new(vs)
                except ValueError: continue
                for l, c in zip(f.loops, cols if isinstance(cols, list) else [cols] * len(pts)): l[self.layer] = (*lin(c), 1)
    def blob(self, x, y, rx, ry, rot, c, n=14, edge=None, wob=0.0, R=None):
        pts = []
        for k in range(n):
            a = 2 * math.pi * k / n; w = 1 + (R.uniform(-wob, wob) if R else 0); px, py = math.cos(a) * rx * w, math.sin(a) * ry * w
            pts.append((x + px * math.cos(rot) - py * math.sin(rot), y + px * math.sin(rot) + py * math.cos(rot)))
        if edge is None: self.poly(pts, c)
        else:   # a soft blob: centre colour fading to the edge colour
            for k in range(n): self.poly([(x, y), pts[k], pts[(k + 1) % n]], [c, edge, edge])
    def stroke(self, x, y, ang, length, width, c0, c1, bend=0.0):
        n = 4; L = []; Rr = []
        for k in range(n + 1):
            t = k / n; a = ang + bend * t; px = x + math.cos(ang + bend * t * 0.5) * length * t; py = y + math.sin(ang + bend * t * 0.5) * length * t; w = width * (1 - t) ** 0.8 + 0.002
            L.append((px - math.sin(a) * w, py + math.cos(a) * w)); Rr.append((px + math.sin(a) * w, py - math.cos(a) * w))
        for k in range(n): t0, t1 = k / n, (k + 1) / n; self.poly([L[k], Rr[k], Rr[k + 1], L[k + 1]], [mix(c0, c1, t0), mix(c0, c1, t0), mix(c0, c1, t1), mix(c0, c1, t1)])
    def render(self, name, base, px=512):
        me = bpy.data.meshes.new(name); self.bm.to_mesh(me); self.bm.free(); me.color_attributes.active_color = me.color_attributes["Col"]
        ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob)
        m = bpy.data.materials.new("flat"); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
        vc = nt.nodes.new("ShaderNodeVertexColor"); vc.layer_name = "Col"; em = nt.nodes.new("ShaderNodeEmission"); o = nt.nodes.new("ShaderNodeOutputMaterial"); nt.links.new(vc.outputs["Color"], em.inputs["Color"]); nt.links.new(em.outputs[0], o.inputs["Surface"]); me.materials.append(m)
        w = bpy.data.worlds.new("w"); w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (*lin(base), 1); bpy.context.scene.world = w
        c = bpy.data.cameras.new("cam"); c.type = "ORTHO"; c.ortho_scale = S; co = bpy.data.objects.new("cam", c); bpy.context.scene.collection.objects.link(co); co.location = (S / 2, S / 2, 10)
        s = bpy.context.scene; s.camera = co; s.render.engine = "BLENDER_EEVEE"; s.render.resolution_x = s.render.resolution_y = px; s.view_settings.view_transform = "Standard"; s.render.film_transparent = False
        s.render.filepath = os.path.join(OUT, name + ".png"); bpy.ops.render.render(write_still=True); print("PAINT", name, flush=True)

g = lambda v, w=0.0, c=0.0: (max(0, min(1, v + w)), max(0, min(1, v + 0.012)), max(0, min(1, v - w + c)))   # a grey, warmer or cooler

def grass_detail():
    kit.reset(); R = random.Random(11); P = Paint()
    for k in range(70): P.blob(R.uniform(0, S), R.uniform(0, S), R.uniform(0.35, 0.9), R.uniform(0.3, 0.7), R.uniform(0, 3.14), g(R.uniform(0.44, 0.56), R.uniform(-0.02, 0.03)), edge=g(0.5), n=12)
    for k in range(1500):   # tufts seen from above: fans of short strokes, dark at the root and light at the tip
        x, y = R.uniform(0, S), R.uniform(0, S); a0 = R.gauss(1.57, 0.7); v = R.gauss(0.5, 0.05); warm = R.uniform(-0.012, 0.02)
        for j in range(R.randint(4, 8)):
            a = a0 + R.uniform(-0.9, 0.9); L = R.uniform(0.09, 0.24)
            P.stroke(x + R.uniform(-0.04, 0.04), y + R.uniform(-0.04, 0.04), a, L, R.uniform(0.012, 0.024), g(v - 0.12, warm), g(v + R.uniform(0.04, 0.16), warm + 0.008), bend=R.uniform(-0.8, 0.8))
    for k in range(40):   # the odd little leaf or clover, lighter
        x, y = R.uniform(0, S), R.uniform(0, S)
        for j in range(3): a = j * 2.09 + R.uniform(0, 1); P.blob(x + math.cos(a) * 0.035, y + math.sin(a) * 0.035, 0.035, 0.028, a, g(0.66, 0.02), n=8)
    P.render("d_grass", g(0.5))

def dirt_detail():
    kit.reset(); R = random.Random(12); P = Paint()
    for k in range(90): P.blob(R.uniform(0, S), R.uniform(0, S), R.uniform(0.3, 0.9), R.uniform(0.25, 0.6), R.uniform(0, 3.14), g(R.uniform(0.43, 0.57), 0.01), edge=g(0.5), n=12)
    for k in range(260):   # ruts and scuffs along the way
        P.stroke(R.uniform(0, S), R.uniform(0, S), R.gauss(0, 0.5) + (3.14 if R.random() < 0.5 else 0), R.uniform(0.15, 0.6), R.uniform(0.006, 0.016), g(R.uniform(0.38, 0.45)), g(0.48), bend=R.uniform(-0.5, 0.5))
    for k in range(90):   # pebbles: a shadow, the stone, a touch of light
        x, y = R.uniform(0, S), R.uniform(0, S); r = R.uniform(0.02, 0.075) * (2.2 if R.random() < 0.06 else 1); rot = R.uniform(0, 3.14); v = R.uniform(0.5, 0.6); e = R.uniform(0.65, 1.0)
        P.blob(x + r * 0.22, y - r * 0.28, r * 1.1, r * e * 1.1, rot, g(0.33), n=10, wob=0.12, R=R); P.blob(x, y, r, r * e, rot, g(v, 0.0, 0.0), n=10, wob=0.12, R=R); P.blob(x - r * 0.25, y + r * 0.28, r * 0.5, r * e * 0.42, rot, g(v + 0.07), n=8)
    for k in range(500): x, y = R.uniform(0, S), R.uniform(0, S); P.blob(x, y, 0.012, 0.01, 0, g(R.choice([0.4, 0.6])), n=6)   # grit
    P.render("d_dirt", g(0.5))

def stone_detail():
    """Flagstones for the crypt and the camp square: fitted slabs with dark joints, worn edges and cracks."""
    kit.reset(); R = random.Random(13); P = Paint(); rows = 5; y = 0.0
    for r in range(rows):
        h = S / rows; x = -R.uniform(0, 0.6); n = 0
        while x < S:
            w = R.uniform(0.7, 1.35);
            if x + w > S - 0.25 and x + w < S + 0.25: w = S - x   # (close the row on the border so it tiles)
            v = R.uniform(0.44, 0.6); c = g(v, R.uniform(-0.012, 0.012)); j = 0.03; x0, x1, y0, y1 = x + j, x + w - j, y + j, y + h - j
            ch = lambda: R.uniform(0.02, 0.09)
            pts = [(x0 + ch(), y0), (x1 - ch(), y0), (x1, y0 + ch()), (x1, y1 - ch()), (x1 - ch(), y1), (x0 + ch(), y1), (x0, y1 - ch()), (x0, y0 + ch())]
            P.poly(pts, c); inset = 0.05; P.poly([(x0 + inset + 0.04, y1 - inset - 0.012), (x1 - inset - 0.04, y1 - inset - 0.012), (x1 - inset - 0.04, y1 - inset + 0.012), (x0 + inset + 0.04, y1 - inset + 0.012)], g(v + 0.1))   # light on the top edge
            P.poly([(x0 + inset + 0.04, y0 + inset - 0.012), (x1 - inset - 0.04, y0 + inset - 0.012), (x1 - inset - 0.04, y0 + inset + 0.014), (x0 + inset + 0.04, y0 + inset + 0.014)], g(v - 0.09))   # shade on the bottom edge
            for k in range(R.randint(1, 4)): P.blob(R.uniform(x0 + 0.1, x1 - 0.1), R.uniform(y0 + 0.1, y1 - 0.1), R.uniform(0.06, 0.22), R.uniform(0.05, 0.15), R.uniform(0, 3), g(v + R.uniform(-0.06, 0.06)), edge=c, n=10)
            if R.random() < 0.35:
                cx, cy = R.uniform(x0 + 0.1, x1 - 0.1), R.uniform(y0 + 0.1, y1 - 0.1); a = R.uniform(0, 6.28)
                for k in range(3): L = R.uniform(0.1, 0.22); P.stroke(cx, cy, a, L, 0.008, g(0.3), g(0.36), bend=R.uniform(-0.6, 0.6)); cx += math.cos(a) * L; cy += math.sin(a) * L; a += R.uniform(-0.8, 0.8)
            x += w; n += 1
        y += h
    P.render("d_stone", g(0.3))

# ---------------------------------------------------------------- the backdrop
def backdrop():
    kit.reset(); R = random.Random(21)
    # the dome: pale at the horizon, deep blue overhead
    b = B(); rows, seg = 14, 32; hor, mid, top = (0.83, 0.93, 0.97), (0.50, 0.76, 0.96), (0.22, 0.50, 0.90); ring = []
    for r in range(rows + 1):
        el = -0.18 + (math.pi / 2 + 0.18) * r / rows; t = max(0.0, el) / (math.pi / 2); c = mix(hor, mid, min(1, t * 3.2)) if t < 0.31 else mix(mid, top, (t - 0.31) / 0.69)
        ring.append([b.v((math.cos(el) * math.cos(2 * math.pi * k / seg), math.cos(el) * math.sin(2 * math.pi * k / seg), math.sin(el)), c) for k in range(seg)])
    for A, Bq in zip(ring, ring[1:]):
        for k in range(seg): b.f([A[k], A[(k + 1) % seg], Bq[(k + 1) % seg], Bq[k]])
    b.finish("dome")
    # clouds: flat-bottomed heaps of puffs, white on top and blue-grey underneath
    b = B()
    for k in range(16):
        az = 2 * math.pi * k / 16 + R.uniform(-0.15, 0.15); el = R.uniform(0.16, 0.6); dist = 0.92; c = Vector((math.cos(el) * math.cos(az), math.cos(el) * math.sin(az), math.sin(el))) * dist
        tang = Vector((-math.sin(az), math.cos(az), 0)); w = R.uniform(0.07, 0.15)
        for j in range(R.randint(4, 7)):
            off = R.uniform(-1, 1); r = w * (0.5 - 0.28 * abs(off)) * R.uniform(0.8, 1.2)
            b.puff(c + tang * (off * w) + Vector((0, 0, r * 0.55)), r, 0.62, (0.62, 0.74, 0.90), (1.0, 1.0, 1.0), k * 9 + j, sub=2, rough=0.16, smooth=True)
    b.finish("clouds")
    # far mountains (a lit side and a shaded side, snow on the peaks, haze at the foot) and nearer wooded hills
    b = B(); seg = 288
    rn = lambda a, f, z: 1 - abs(noise.noise(Vector((math.cos(a) * f, math.sin(a) * f, z))))   # ridged noise round the ring
    def ridge(radius, hfn, lit, shade, haze, snow=None, z0=-0.03, rows=5):
        H = [hfn(2 * math.pi * k / seg) for k in range(seg)]; grid = []
        for k in range(seg):
            a = 2 * math.pi * k / seg; h = H[k]; slope = (H[(k + 1) % seg] - H[k - 1]) * seg / 40; d = Vector((math.cos(a), math.sin(a), 0)); col = []
            for r in range(rows + 1):
                t = r / rows; z = z0 + (h - z0) * t; sl = max(0.0, min(1.0, 0.5 + slope * (0.4 + 0.6 * t) + 0.25 * noise.noise(Vector((a * 9, t * 3, radius))))); c = mix(shade, lit, sl)
                if snow and z > snow[0] + 0.02 * noise.noise(Vector((a * 14, 0, 2))): c = mix(snow[2], snow[1], sl)
                c = mix(haze, c, min(1.0, 0.25 + 3.2 * z / 0.3 + 0.5 * t)); col.append(b.v(d * (radius * (0.9 + 0.1 * t)) + Vector((0, 0, z)), c))
            grid.append(col)
        for k in range(seg):
            for r in range(rows): b.f([grid[k][r], grid[(k + 1) % seg][r], grid[(k + 1) % seg][r + 1], grid[k][r + 1]], False)
    ridge(0.9, lambda a: 0.05 + 0.20 * rn(a, 2.6, 3.1) ** 2.2 + 0.07 * rn(a, 8.0, 1.0) ** 1.5 + 0.022 * rn(a, 25.0, 5.0), (0.62, 0.70, 0.86), (0.36, 0.44, 0.68), (0.74, 0.87, 0.95), snow=(0.17, (1.0, 1.0, 1.0), (0.72, 0.80, 0.95)))
    ridge(0.72, lambda a: 0.03 + 0.07 * rn(a, 3.4, 7.7) ** 1.6 + 0.02 * rn(a, 11.0, 2.2) + 0.006 * rn(a, 60.0, 4.0), (0.46, 0.66, 0.54), (0.28, 0.46, 0.50), (0.70, 0.86, 0.90), z0=-0.03, rows=4)
    ridge(0.55, lambda a: 0.02 + 0.035 * rn(a, 4.1, 8.0) ** 1.3 + 0.012 * rn(a, 17.0, 3.3) + 0.006 * rn(a, 90.0, 6.0), (0.42, 0.68, 0.34), (0.22, 0.46, 0.30), (0.60, 0.80, 0.70), z0=-0.03, rows=3)
    b.finish("hills")
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, "w_sky.glb"), export_format="GLB", export_yup=True, export_animations=False, export_vertex_color="ACTIVE", export_all_vertex_colors=False)
    # a look at it from the ground
    for o in bpy.data.objects:
        if o.type == "MESH":
            m = bpy.data.materials.new("flat"); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear(); vc = nt.nodes.new("ShaderNodeVertexColor"); vc.layer_name = "Col"; em = nt.nodes.new("ShaderNodeEmission"); o_ = nt.nodes.new("ShaderNodeOutputMaterial"); nt.links.new(vc.outputs["Color"], em.inputs["Color"]); nt.links.new(em.outputs[0], o_.inputs["Surface"]); o.data.materials.clear(); o.data.materials.append(m)
    c = bpy.data.cameras.new("cam"); c.lens = 20; co = bpy.data.objects.new("cam", c); bpy.context.scene.collection.objects.link(co); co.location = (0, 0, 0.01); co.rotation_euler = (math.radians(100), 0, 0)
    s = bpy.context.scene; s.camera = co; c.clip_start = 0.001; s.render.engine = "BLENDER_EEVEE"; s.render.resolution_x, s.render.resolution_y = 1200, 600; s.view_settings.view_transform = "Standard"; s.render.filepath = os.path.join(OUT, "sheet_sky.png"); bpy.ops.render.render(write_still=True); print("SKY", flush=True)

if __name__ == "__main__":
    only = os.environ.get("ONLY", "grass,dirt,stone,sky").split(",")
    if "grass" in only: grass_detail()
    if "dirt" in only: dirt_detail()
    if "stone" in only: stone_detail()
    if "sky" in only: backdrop()
