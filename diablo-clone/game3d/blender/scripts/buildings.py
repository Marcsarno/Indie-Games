"""Buildings and camp furniture of the third-person game, at early-WoW scale (the hero is 1.65 tall), made in headless Blender.
Low-poly shapes with painted vertex colours; each part is one of a few materials (stone, wood, roof, plaster, cloth, plain,
glow) and the game lays that material's brushwork over it (the d_*.png detail paint, also made here), so walls show masonry,
timber shows planks and roofs show shingles without any of it being modelled.
Space: X = the game's +i, -Y = the game's +j, Z up. A model stands on its footprint in the level, so sizes follow the 2D
game's solid tiles.
Run:  blender -b --python scripts/buildings.py           -> out/build/b_<name>.glb + d_wood/d_shingle/d_plaster/d_cloth.png
      SHEET=1 ...                                         -> also out/build/sheet_<name>.png"""
import bpy, bmesh, math, os, random, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit
from mathutils import Vector, Matrix
from flora import B, mix, lin
import terrain
from terrain import Paint, g, S

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "out", "build"); os.makedirs(OUT, exist_ok=True)
terrain.OUT = OUT

# ---------------------------------------------------------------- detail paint
def wood_detail():
    kit.reset(); R = random.Random(31); P = Paint(); x = 0.0
    while x < S - 0.01:
        w = min(R.uniform(0.3, 0.5), S - x);
        if S - x - w < 0.25: w = S - x
        v = R.uniform(0.45, 0.57); P.poly([(x + 0.012, -0.2), (x + w - 0.012, -0.2), (x + w - 0.012, S + 0.2), (x + 0.012, S + 0.2)], g(v, 0.01))
        P.poly([(x + 0.012, -0.2), (x + 0.04, -0.2), (x + 0.04, S + 0.2), (x + 0.012, S + 0.2)], g(v + 0.07, 0.01))   # light on one edge of the plank
        for k in range(R.randint(5, 9)): P.stroke(x + R.uniform(0.05, w - 0.05), R.uniform(0, S), 1.57 + R.uniform(-0.03, 0.03), R.uniform(0.5, 1.8), R.uniform(0.004, 0.01), g(v + R.choice([-0.09, -0.06, 0.06])), g(v), bend=R.uniform(-0.04, 0.04))
        for k in range(R.randint(0, 2)): kx, ky = x + R.uniform(0.1, w - 0.1), R.uniform(0, S); P.blob(kx, ky, 0.035, 0.06, 0, g(v - 0.14), n=10); P.blob(kx, ky, 0.016, 0.03, 0, g(v - 0.05), n=8)
        for k in range(R.randint(1, 2)): ky = R.uniform(0, S); P.poly([(x + 0.012, ky), (x + w - 0.012, ky), (x + w - 0.012, ky + 0.022), (x + 0.012, ky + 0.022)], g(0.3))   # where one board ends and the next begins
        x += w
    P.render("d_wood", g(0.27))

def shingle_detail():
    kit.reset(); R = random.Random(32); P = Paint(); rows = 10; h = S / rows
    for r in range(rows):
        y1 = (r + 1) * h; x = -R.uniform(0, 0.3)
        while x < S:
            w = R.uniform(0.28, 0.44); v = R.uniform(0.4, 0.62); low = y1 - h - 0.1 - R.uniform(0, 0.03); n = 6
            arc = [(x + w / 2 + math.cos(math.pi + math.pi * k / n) * (w / 2 - 0.012), low + 0.1 + math.sin(math.pi + math.pi * k / n) * 0.1) for k in range(n + 1)]
            P.poly([(px + 0.02, py - 0.035) for px, py in [(x + 0.012, y1)] + arc + [(x + w - 0.012, y1)]], g(0.26))   # its shadow on the row below
            P.poly([(x + 0.012, y1)] + arc + [(x + w - 0.012, y1)], g(v, R.uniform(-0.01, 0.015)))
            P.poly([(px, py + 0.03) for px, py in arc[1:-1]] + [(px, py) for px, py in reversed(arc[1:-1])], g(v + 0.1))   # worn light edge
            if R.random() < 0.3: P.stroke(x + R.uniform(0.08, w - 0.08), y1 - 0.05, -1.57, R.uniform(0.1, 0.25), 0.006, g(v - 0.1), g(v))
            x += w
    P.render("d_shingle", g(0.3))

def plaster_detail():
    kit.reset(); R = random.Random(33); P = Paint()
    for k in range(120): P.blob(R.uniform(0, S), R.uniform(0, S), R.uniform(0.2, 0.8), R.uniform(0.15, 0.5), R.uniform(0, 3.14), g(R.uniform(0.45, 0.55), 0.008), edge=g(0.5), n=12)
    for k in range(260): P.stroke(R.uniform(0, S), R.uniform(0, S), R.uniform(0, 6.28), R.uniform(0.05, 0.2), R.uniform(0.01, 0.03), g(R.choice([0.46, 0.54])), g(0.5), bend=R.uniform(-1, 1))   # trowel marks
    for k in range(9):
        x, y, a = R.uniform(0, S), R.uniform(0, S), R.uniform(0, 6.28)
        for j in range(R.randint(3, 6)): L = R.uniform(0.1, 0.25); P.stroke(x, y, a, L, 0.006, g(0.34), g(0.4)); x += math.cos(a) * L; y += math.sin(a) * L; a += R.uniform(-0.7, 0.7)
    P.render("d_plaster", g(0.5))

def cloth_detail():
    kit.reset(); R = random.Random(34); P = Paint()
    for k in range(26): x = R.uniform(0, S); P.blob(x, R.uniform(0, S), R.uniform(0.08, 0.2), R.uniform(1.0, 2.6), R.uniform(-0.08, 0.08), g(R.choice([0.43, 0.45, 0.56, 0.58])), edge=g(0.5), n=12)   # folds
    for k in range(900): x, y = R.uniform(0, S), R.uniform(0, S); P.poly([(x, y), (x + 0.05, y), (x + 0.05, y + 0.006), (x, y + 0.006)], g(R.choice([0.46, 0.54])))   # the weave
    for y in (0.9, 2.9):   # seams, stitched
        P.poly([(0, y), (S, y), (S, y + 0.02), (0, y + 0.02)], g(0.4))
        for k in range(40): x = k * S / 40; P.poly([(x + 0.02, y - 0.03), (x + 0.035, y - 0.03), (x + 0.035, y + 0.05), (x + 0.02, y + 0.05)], g(0.62))
    for k in range(3): x, y = R.uniform(0.3, S - 0.6), R.uniform(0.3, S - 0.6); P.poly([(x, y), (x + 0.3, y + 0.03), (x + 0.28, y + 0.3), (x - 0.02, y + 0.27)], g(R.uniform(0.42, 0.47), 0.01))   # patches
    P.render("d_cloth", g(0.5))

# ---------------------------------------------------------------- shapes
class Build:
    """One model: a B (vertex-coloured mesh) per material."""
    def __init__(self): self.parts = {}
    def m(self, name): return self.parts.setdefault(name, B())
    def box(self, mat, base, size, col, rot=0.0, taper=(1.0, 1.0), shade=0.72, top=None, tilt=None):
        """A box standing on base=(x, y, z0), size (sx, sy, sz), turned by rot about Z. Its foot is darker (soft shadow)."""
        b = self.m(mat); sx, sy, sz = size; cr, sr = math.cos(rot), math.sin(rot); vs = []
        for z, k, c in ((0, 1.0, tuple(x * shade for x in col)), (sz, 1.0, top or col)):
            for px, py in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
                tx, ty = (taper if z else (1, 1)); x, y = px * sx / 2 * tx, py * sy / 2 * ty
                if tilt and z: x += tilt[0]; y += tilt[1]
                vs.append(b.v((base[0] + x * cr - y * sr, base[1] + x * sr + y * cr, base[2] + z), c))
        for q in ((0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7), (4, 5, 6, 7), (3, 2, 1, 0)): b.f([vs[i] for i in q], False)
    def beam(self, mat, p0, p1, w, col, shade=0.8):
        """A square timber from p0 to p1."""
        b = self.m(mat); p0, p1 = Vector(p0), Vector(p1); a = (p1 - p0).normalized(); ref = Vector((0, 0, 1)) if abs(a.z) < 0.9 else Vector((1, 0, 0)); u = a.cross(ref).normalized() * w / 2; v = a.cross(u).normalized() * w / 2
        vs = [b.v(p + du * u + dv * v, c) for p, c in ((p0, tuple(x * shade for x in col)), (p1, col)) for du, dv in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
        for q in ((0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7), (4, 5, 6, 7), (3, 2, 1, 0)): b.f([vs[i] for i in q], False)
    def quad(self, mat, pts, col, cols=None): b = self.m(mat); b.f([b.v(p, (cols[k] if cols else col)) for k, p in enumerate(pts)], False)
    def cyl(self, mat, base, r0, r1, h, col, seg=10, shade=0.72, axis="z", top=None, cap=True):
        b = self.m(mat); base = Vector(base); d = {"z": Vector((0, 0, 1)), "x": Vector((1, 0, 0)), "y": Vector((0, 1, 0))}[axis]
        b.tube([base, base + d * h], [r0, r1], seg, lambda k, t, a: (top or col) if k else tuple(x * shade for x in col), smooth=False, cap=cap)
    def gable(self, base, sx, sy, h, col, wall_mat, wall_col, over=0.3, thick=0.12, ridge="x", under=(0.30, 0.20, 0.13)):
        """A pitched roof over a sx x sy box whose top is at base. Shingled slopes, the two end triangles in the wall material."""
        x0, y0, z0 = base; R = lambda p: (x0 + p[0], y0 + p[1], z0 + p[2]) if ridge == "x" else (x0 - p[1], y0 + p[0], z0 + p[2])
        hx, hy = (sx, sy) if ridge == "x" else (sy, sx); a, w = hx / 2 + over, hy / 2 + over; drop = h * over / (hy / 2)
        dark = tuple(c * 0.62 for c in col)
        for s in (-1, 1):
            self.quad("roof", [R((-a, s * w, -drop)), R((a, s * w, -drop)), R((a, 0, h)), R((-a, 0, h))][::s], col, cols=[dark, dark, col, col][::s])
            self.quad("wood", [R((-a, s * w, -drop - thick)), R((a, s * w, -drop - thick)), R((a, 0, h - thick)), R((-a, 0, h - thick))][::-s], under)
            self.quad("wood", [R((-a, s * w, -drop)), R((a, s * w, -drop)), R((a, s * w, -drop - thick)), R((-a, s * w, -drop - thick))][::s], under)   # the eave's edge
            for e in (-1, 1):   # barge boards and the gable triangle
                self.quad("wood", [R((e * a, s * w, -drop)), R((e * a, 0, h)), R((e * a, 0, h - thick)), R((e * a, s * w, -drop - thick))][::s * e], (0.36, 0.25, 0.16))
        for e in (-1, 1): self.quad(wall_mat, [R((e * hx / 2, -hy / 2, 0)), R((e * hx / 2, hy / 2, 0)), R((e * hx / 2, 0, h))][::e], wall_col, cols=[tuple(c * 0.85 for c in wall_col)] * 2 + [wall_col])
        self.beam("wood", R((-a - 0.05, 0, h + 0.03)), R((a + 0.05, 0, h + 0.03)), 0.14, (0.33, 0.22, 0.15))   # the ridge
    def finish(self, name, prefix="", at=None):
        obs = []
        for mat, b in self.parts.items():
            ob = b.finish(prefix + mat); ob.data.materials.clear(); ob.data.materials.append(vmat(mat)); obs.append(ob)
            if at: ob.location = at
        return obs

def vmat(mat):
    """The material of that name: it shows the mesh's painted vertex colours (and glows, for 'glow')."""
    m = bpy.data.materials.get(mat) or bpy.data.materials.new(mat)
    if not m.get("vc"):
        m["vc"] = 1; m.use_nodes = True; nt = m.node_tree; bs = nt.nodes["Principled BSDF"]; at = nt.nodes.new("ShaderNodeVertexColor"); at.layer_name = "Col"; nt.links.new(at.outputs["Color"], bs.inputs["Base Color"]); bs.inputs["Roughness"].default_value = 0.9
        if mat == "glow": nt.links.new(at.outputs["Color"], bs.inputs["Emission Color"]); bs.inputs["Emission Strength"].default_value = 2.5
        m.use_backface_culling = False
    return m

WOOD, WOOD_D, WOOD_L = (0.50, 0.35, 0.22), (0.33, 0.22, 0.14), (0.66, 0.50, 0.32)
STONE, STONE_L = (0.56, 0.55, 0.52), (0.72, 0.70, 0.65)
PLASTER = (0.90, 0.84, 0.70); CANVAS = (0.88, 0.80, 0.62); RED, BLUE, GOLD = (0.72, 0.16, 0.12), (0.20, 0.34, 0.66), (0.95, 0.74, 0.22)
ROOF_BLUE, ROOF_RED = (0.30, 0.40, 0.58), (0.66, 0.26, 0.18)
IRON = (0.22, 0.22, 0.25)

def palisade():
    """One tile of the camp's wall: sharpened logs, lashed to a rail. It runs along Y."""
    A = Build(); R = random.Random(41); b = A.m("wood")
    for k in range(4):
        y = -0.375 + k * 0.25; h = R.uniform(2.15, 2.6); r = R.uniform(0.115, 0.135); c = mix(WOOD_D, WOOD, R.uniform(0.3, 1.0)); x = R.uniform(-0.03, 0.03)
        b.tube([(x, y, -0.05), (x, y, h * 0.5), (x + R.uniform(-0.02, 0.02), y, h - 0.32), (x, y, h)], [r * 1.08, r, r * 0.95, 0.012], 7, lambda k_, t, a, c=c: mix(tuple(v * 0.7 for v in c), WOOD_L if k_ == 3 else c, min(1.0, 0.3 + t)), smooth=False)
    A.beam("wood", (-0.15, -0.5, 1.55), (-0.15, 0.5, 1.55), 0.1, WOOD_D); A.beam("wood", (-0.15, -0.5, 0.6), (-0.15, 0.5, 0.6), 0.1, WOOD_D)
    for k in range(4): A.box("cloth", (-0.02, -0.375 + k * 0.25, 1.5), (0.3, 0.27, 0.07), (0.62, 0.52, 0.34))   # rope
    return A

def tent():
    """A canvas pavilion with a red trim, open on the +X side, a pennant at each end of the ridge."""
    A = Build(); R = random.Random(42); hx, hy, wall, peak = 0.85, 1.1, 1.15, 2.35; c0, c1 = tuple(v * 0.8 for v in CANVAS), CANVAS
    for s in (-1, 1):   # roof slopes (ridge along Y), then walls
        A.quad("cloth", [(s * (hx + 0.12), -hy - 0.1, wall - 0.05), (s * (hx + 0.12), hy + 0.1, wall - 0.05), (0, hy + 0.02, peak), (0, -hy - 0.02, peak)][::s], c1, cols=[c0, c0, c1, c1][::s])
        for k in range(8):   # a scalloped red valance along the eave
            y0, y1 = -hy - 0.1 + k * (2 * hy + 0.2) / 8, -hy - 0.1 + (k + 1) * (2 * hy + 0.2) / 8
            A.quad("cloth", [(s * (hx + 0.12), y0, wall - 0.05), (s * (hx + 0.12), y1, wall - 0.05), (s * (hx + 0.1), (y0 + y1) / 2, wall - 0.3)][::-s], RED)
        A.quad("cloth", [(-hx, s * hy, 0), (hx, s * hy, 0), (hx, s * hy, wall), (0, s * hy, peak - 0.05), (-hx, s * hy, wall)][::-s], c1, cols=[c0, c0, c1, c1, c1][::-s])
    A.quad("cloth", [(-hx, -hy, 0), (-hx, hy, 0), (-hx, hy, wall), (-hx, -hy, wall)][::-1], c1, cols=[c0, c0, c1, c1][::-1])
    for s in (-1, 1): A.quad("cloth", [(hx, s * hy, 0), (hx, s * 0.42, 0), (hx, s * 0.3, wall), (hx, s * hy, wall)][::s], c1, cols=[c0, c0, c1, c1][::s])   # front, either side of the door
    A.quad("cloth", [(hx + 0.02, 0.42, 0), (hx + 0.3, 0.7, 0.0), (hx + 0.04, 0.32, wall)], tuple(v * 0.9 for v in CANVAS)); A.quad("cloth", [(hx + 0.02, -0.42, 0), (hx + 0.04, -0.32, wall), (hx + 0.3, -0.7, 0.0)], tuple(v * 0.9 for v in CANVAS))   # the flaps tied back
    A.quad("plain", [(hx - 0.02, -0.42, 0), (hx - 0.02, 0.42, 0), (hx - 0.02, 0.3, wall), (hx - 0.02, -0.3, wall)], (0.08, 0.06, 0.06))   # the dark inside
    for s in (-1, 1):
        A.beam("wood", (0, s * (hy + 0.02), 0), (0, s * (hy + 0.02), peak + 0.5), 0.07, WOOD_D)
        A.quad("cloth", [(0, s * (hy + 0.02), peak + 0.48), (0.42, s * (hy + 0.02), peak + 0.38), (0, s * (hy + 0.02), peak + 0.24)], RED if s > 0 else BLUE)
        for e in (-1, 1): A.beam("cloth", (e * (hx + 0.1), s * hy * 0.9, wall - 0.05), (e * (hx + 0.55), s * (hy + 0.35), 0), 0.02, (0.62, 0.52, 0.34)); A.box("wood", (e * (hx + 0.55), s * (hy + 0.35), 0), (0.06, 0.06, 0.16), WOOD_D)   # guy ropes and pegs
    A.quad("plain", [(-hx, -hy, 0.02), (hx, -hy, 0.02), (hx, hy, 0.02), (-hx, hy, 0.02)], (0.34, 0.26, 0.18))
    return A

def well():
    A = Build(); b = A.m("stone")
    b.tube([(0, 0, -0.05), (0, 0, 0.72), (0, 0, 0.8), (0, 0, 0.8), (0, 0, 0.5)], [0.62, 0.58, 0.6, 0.44, 0.44], 12, lambda k, t, a: mix(tuple(v * 0.7 for v in STONE), STONE_L, min(1, k / 2)), smooth=False, cap=False)
    A.cyl("plain", (0, 0, 0.45), 0.44, 0.44, 0.02, (0.10, 0.20, 0.30), seg=12)
    for s in (-1, 1): A.beam("wood", (0, s * 0.56, 0), (0, s * 0.56, 2.2), 0.12, WOOD)
    A.cyl("wood", (0, -0.62, 1.55), 0.06, 0.06, 1.24, WOOD_D, seg=6, axis="y"); A.beam("wood", (0, 0.66, 1.55), (0.22, 0.66, 1.7), 0.04, IRON)   # windlass and crank
    A.beam("cloth", (0, 0, 1.5), (0, 0, 0.95), 0.025, (0.62, 0.52, 0.34)); A.cyl("wood", (0, 0, 0.75), 0.13, 0.16, 0.24, WOOD_L, seg=8)
    A.gable((0, 0, 2.2), 0.9, 1.3, 0.55, ROOF_BLUE, "wood", WOOD, over=0.18, ridge="y", thick=0.07)
    return A

def wagon():
    """A covered wagon, its pole to +X."""
    A = Build(); R = random.Random(44)
    A.box("wood", (0, 0, 0.62), (2.5, 1.15, 0.12), WOOD_D)
    for s in (-1, 1): A.box("wood", (0, s * 0.56, 0.74), (2.5, 0.06, 0.42), WOOD)
    for e in (-1, 1): A.box("wood", (e * 1.22, 0, 0.74), (0.06, 1.1, 0.42), WOOD)
    for e in (-0.85, 0.85):
        A.cyl("wood", (e, -0.72, 0.46), 0.05, 0.05, 1.44, WOOD_D, seg=6, axis="y")
        for s in (-1, 1):
            b = A.m("wood"); y = s * 0.68
            b.tube([(e, y - 0.05, 0.46), (e, y + 0.05, 0.46)], [0.46, 0.46], 12, lambda k, t, a: WOOD_D, smooth=False, cap=False)
            for k in range(6): a = k * math.pi / 6; A.beam("wood", (e - math.cos(a) * 0.45, y, 0.46 - math.sin(a) * 0.45), (e + math.cos(a) * 0.45, y, 0.46 + math.sin(a) * 0.45), 0.05, WOOD_L)
            A.cyl("wood", (e, y - 0.08 if s < 0 else y - 0.02, 0.46), 0.09, 0.09, 0.1, WOOD_D, seg=8, axis="y")
    n = 8; rows = []   # the canvas hood on hoops
    for x in (-1.25, -0.6, 0.0, 0.6, 1.25):
        b = A.m("cloth"); rows.append([b.v((x, math.cos(math.pi * k / n) * (0.62 + (0.05 if abs(x) > 1 else 0)), 1.14 + math.sin(math.pi * k / n) * (0.82 + (0.06 if abs(x) > 1 else 0))), mix(tuple(v * 0.78 for v in CANVAS), CANVAS, math.sin(math.pi * k / n))) for k in range(n + 1)])
    b = A.m("cloth")
    for r0, r1 in zip(rows, rows[1:]):
        for k in range(n): b.f([r0[k], r1[k], r1[k + 1], r0[k + 1]], False)
    A.quad("plain", [(-1.2, -0.55, 1.14), (-1.2, 0.55, 1.14), (-1.2, 0.3, 1.8), (-1.2, -0.3, 1.8)], (0.10, 0.07, 0.06))
    A.beam("wood", (1.25, 0, 0.62), (2.3, 0, 0.35), 0.08, WOOD_D); A.box("wood", (1.45, 0, 0.86), (0.4, 1.0, 0.08), WOOD)   # pole and seat
    A.box("wood", (-0.8, 0.2, 0.68), (0.45, 0.4, 0.4), WOOD_L, rot=0.3); A.cyl("wood", (-0.3, -0.2, 0.68), 0.2, 0.2, 0.45, WOOD, seg=8)
    return A

def stall():
    """A market stall: its counter and striped awning face -Y; bottles on the counter."""
    A = Build(); R = random.Random(45)
    A.box("wood", (0, -0.25, 0), (2.0, 0.55, 0.92), WOOD); A.box("wood", (0, -0.25, 0.92), (2.15, 0.7, 0.07), WOOD_L)
    A.box("wood", (0, 0.42, 0), (2.0, 0.3, 1.5), WOOD_D); A.box("wood", (0, 0.42, 1.5), (2.05, 0.36, 0.05), WOOD)
    for e in (-1, 1): A.beam("wood", (e * 1.0, -0.5, 0), (e * 1.0, -0.5, 2.05), 0.09, WOOD_D); A.beam("wood", (e * 1.0, 0.5, 0), (e * 1.0, 0.5, 2.6), 0.09, WOOD_D)
    n = 8
    for k in range(n):   # awning stripes, with a scalloped drop at the front
        x0, x1 = -1.15 + k * 2.3 / n, -1.15 + (k + 1) * 2.3 / n; c = RED if k % 2 else CANVAS
        A.quad("cloth", [(x0, -0.85, 2.0), (x1, -0.85, 2.0), (x1, 0.6, 2.62), (x0, 0.6, 2.62)], c, cols=[tuple(v * 0.8 for v in c)] * 2 + [c, c])
        A.quad("cloth", [(x0, -0.85, 2.0), (x1, -0.85, 2.0), ((x0 + x1) / 2, -0.86, 1.74)][::-1], c)
    cols = [(0.85, 0.15, 0.2), (0.2, 0.5, 0.95), (0.3, 0.8, 0.35), (0.95, 0.75, 0.2), (0.7, 0.3, 0.9)]
    for k in range(9):
        x = -0.85 + k * 0.21; y = R.uniform(-0.4, -0.12); c = cols[k % 5]; hgt = R.uniform(0.14, 0.24)
        A.cyl("glow" if k % 3 == 0 else "plain", (x, y, 0.99), 0.055, 0.055, hgt, c, seg=6); A.cyl("plain", (x, y, 0.99 + hgt), 0.025, 0.02, 0.07, (0.5, 0.4, 0.3), seg=5)
    for k in range(6): c = cols[(k + 2) % 5]; A.cyl("plain", (-0.8 + k * 0.32, 0.42, 1.55), 0.07, 0.05, 0.2, c, seg=6)
    return A

def forge():
    """The smithy: a stone furnace and chimney at +X, its glowing mouth to -X, an anvil on a stump, under a shingled lean-to."""
    A = Build()
    A.box("stone", (0.3, 0, -0.05), (3.1, 2.1, 0.12), STONE)
    A.box("stone", (1.3, 0, 0.07), (1.05, 1.3, 1.25), STONE, top=STONE_L); A.box("stone", (1.3, 0, 1.32), (0.9, 1.1, 0.5), STONE, taper=(0.75, 0.7)); A.box("stone", (1.3, 0, 1.82), (0.62, 0.62, 2.0), STONE, top=STONE_L); A.box("stone", (1.3, 0, 3.82), (0.76, 0.76, 0.14), STONE_L)
    A.quad("glow", [(0.765, -0.32, 0.45), (0.765, 0.32, 0.45), (0.765, 0.32, 0.95), (0.765, 0, 1.12), (0.765, -0.32, 0.95)][::-1], (1.0, 0.45, 0.08), cols=[(1.0, 0.8, 0.3)] * 2 + [(1.0, 0.4, 0.05)] * 3)
    A.box("stone", (0.72, 0, 0.3), (0.12, 0.85, 0.14), STONE_L)
    for x, y, h in ((-1.1, -0.9, 2.5), (-1.1, 0.9, 2.5), (0.7, -0.9, 3.0), (0.7, 0.9, 3.0)): A.beam("wood", (x, y, 0.07), (x, y, h), 0.13, WOOD_D)
    c = ROOF_RED; d = tuple(v * 0.65 for v in c)
    A.quad("roof", [(-1.4, -1.15, 2.42), (-1.4, 1.15, 2.42), (0.95, 1.15, 3.1), (0.95, -1.15, 3.1)][::-1], c, cols=[d, d, c, c][::-1]); A.quad("wood", [(-1.4, -1.15, 2.34), (-1.4, 1.15, 2.34), (0.95, 1.15, 3.02), (0.95, -1.15, 3.02)], WOOD_D)
    for y in (-0.9, 0.9): A.beam("wood", (-1.25, y, 2.42), (0.8, y, 3.02), 0.1, WOOD)
    A.cyl("wood", (-0.35, 0.1, 0.07), 0.26, 0.24, 0.5, WOOD, seg=9, top=WOOD_L)   # the stump, and on it the anvil
    A.box("plain", (-0.35, 0.1, 0.57), (0.3, 0.2, 0.12), IRON); A.box("plain", (-0.35, 0.1, 0.69), (0.62, 0.22, 0.14), (0.34, 0.34, 0.38), taper=(1.0, 0.9)); A.box("plain", (-0.72, 0.1, 0.72), (0.2, 0.1, 0.08), (0.34, 0.34, 0.38), taper=(0.3, 0.6))
    A.cyl("wood", (0.1, -0.75, 0.07), 0.25, 0.28, 0.6, WOOD, seg=9); A.cyl("plain", (0.1, -0.75, 0.6), 0.24, 0.24, 0.02, (0.12, 0.24, 0.34), seg=9)   # the quench barrel
    A.beam("wood", (-1.1, 0.9, 1.3), (0.7, 0.9, 1.3), 0.07, WOOD)
    for k in range(4): A.beam("plain", (-0.8 + k * 0.38, 0.9, 1.3), (-0.8 + k * 0.38, 0.9, 0.65), 0.035, IRON)   # tools on the rail
    return A

def lantern():
    """A lamp post: the lamp hangs from an arm toward +X."""
    A = Build()
    A.box("stone", (0, 0, 0), (0.3, 0.3, 0.22), STONE, taper=(0.8, 0.8)); A.beam("wood", (0, 0, 0.2), (0, 0, 2.55), 0.1, WOOD_D)
    A.beam("plain", (0, 0, 2.42), (0.36, 0, 2.5), 0.045, IRON); A.beam("plain", (0, 0, 2.05), (0.26, 0, 2.44), 0.03, IRON); A.beam("plain", (0.33, 0, 2.5), (0.33, 0, 2.32), 0.02, IRON)
    A.box("plain", (0.33, 0, 2.3), (0.2, 0.2, 0.04), IRON, taper=(0.4, 0.4)); A.box("glow", (0.33, 0, 2.06), (0.16, 0.16, 0.24), (1.0, 0.8, 0.35), top=(1.0, 0.9, 0.55)); A.box("plain", (0.33, 0, 2.03), (0.2, 0.2, 0.03), IRON)
    return A

def tower():
    """A timber watchtower on a stone foot: legs, braces, a railed platform under a shingled cap, a banner."""
    A = Build(); w = 0.72
    A.box("stone", (0, 0, -0.05), (1.75, 1.75, 0.6), STONE, taper=(0.9, 0.9), top=STONE_L)
    for sx in (-1, 1):
        for sy in (-1, 1): A.beam("wood", (sx * w, sy * w, 0.5), (sx * w * 0.86, sy * w * 0.86, 5.9), 0.16, WOOD_D)
    for z0, z1 in ((0.6, 2.4), (2.4, 4.2)):
        for k, (ax, ay, bx, by) in enumerate(((-1, -1, 1, -1), (1, -1, 1, 1), (1, 1, -1, 1), (-1, 1, -1, -1))):
            f0, f1 = 1 - 0.14 * z0 / 5.4, 1 - 0.14 * z1 / 5.4
            A.beam("wood", (ax * w * f0, ay * w * f0, z0), (bx * w * f1, by * w * f1, z1), 0.09, WOOD); A.beam("wood", (ax * w * f1, ay * w * f1, z1), (bx * w * f1, by * w * f1, z1), 0.1, WOOD_D)
    A.box("wood", (0, 0, 4.3), (2.1, 2.1, 0.12), WOOD, top=WOOD_L)
    for k, (ax, ay, bx, by) in enumerate(((-1, -1, 1, -1), (1, -1, 1, 1), (1, 1, -1, 1), (-1, 1, -1, -1))):
        A.beam("wood", (ax * 1.0, ay * 1.0, 5.05), (bx * 1.0, by * 1.0, 5.05), 0.08, WOOD_D)
        for t in (0.25, 0.5, 0.75): A.beam("wood", (ax + (bx - ax) * t, ay + (by - ay) * t, 4.4), (ax + (bx - ax) * t, ay + (by - ay) * t, 5.05), 0.05, WOOD)
    b = A.m("roof"); apex = b.v((0, 0, 7.5), ROOF_BLUE); d = tuple(v * 0.62 for v in ROOF_BLUE); cs = [(-1.3, -1.3), (1.3, -1.3), (1.3, 1.3), (-1.3, 1.3)]
    for k in range(4): (x0, y0), (x1, y1) = cs[k], cs[(k + 1) % 4]; b.f([b.v((x0, y0, 5.8), d), b.v((x1, y1, 5.8), d), b.v((0, 0, 7.5), ROOF_BLUE)], False)
    A.quad("wood", [(-1.3, -1.3, 5.78), (-1.3, 1.3, 5.78), (1.3, 1.3, 5.78), (1.3, -1.3, 5.78)], WOOD_D); A.beam("wood", (0, 0, 7.4), (0, 0, 8.1), 0.05, WOOD_D); A.quad("cloth", [(0, 0, 8.05), (0.6, 0, 7.92), (0, 0, 7.75)], RED)
    for z in [0.75 + 0.42 * k for k in range(9)]: A.beam("wood", (0.95, -0.22, z), (0.95, 0.22, z), 0.045, WOOD_L)   # the ladder
    for s in (-1, 1): A.beam("wood", (0.98, s * 0.22, 0.5), (0.9, s * 0.22, 4.4), 0.055, WOOD)
    A.quad("cloth", [(-1.06, -0.4, 4.3), (-1.06, 0.4, 4.3), (-1.06, 0.4, 3.0), (-1.06, 0, 2.7), (-1.06, -0.4, 3.0)], BLUE, cols=[BLUE] * 2 + [tuple(v * 0.8 for v in BLUE)] * 3)
    A.quad("cloth", [(-1.075, -0.16, 3.85), (-1.075, 0.16, 3.85), (-1.075, 0, 3.3)], GOLD)
    return A

def cottage(roofc=ROOF_BLUE):
    """A half-timbered cottage on a stone footing: plaster and dark beams, a steep shingled roof, a stone chimney, the door to -Y."""
    A = Build(); hx, hy, foot, wall = 1.45, 1.35, 0.5, 2.5
    A.box("stone", (0, 0, -0.05), (2 * hx + 0.14, 2 * hy + 0.14, foot + 0.05), STONE, top=STONE_L)
    A.box("plaster", (0, 0, foot), (2 * hx, 2 * hy, wall - foot), PLASTER, shade=0.86)
    T = (0.30, 0.20, 0.13)
    for sx in (-1, 1):
        for sy in (-1, 1): A.beam("wood", (sx * hx, sy * hy, foot), (sx * hx, sy * hy, wall), 0.2, T)
    for z in (foot + 0.06, 1.55, wall - 0.06):
        for s in (-1, 1): A.beam("wood", (-hx, s * (hy + 0.01), z), (hx, s * (hy + 0.01), z), 0.14, T); A.beam("wood", (s * (hx + 0.01), -hy, z), (s * (hx + 0.01), hy, z), 0.14, T)
    for s in (-1, 1):
        for e in (-1, 1): A.beam("wood", (e * hx, s * (hy + 0.01), 1.55), (e * (hx - 0.75), s * (hy + 0.01), foot), 0.11, T); A.beam("wood", (s * (hx + 0.01), e * hy, 1.55), (s * (hx + 0.01), e * (hy - 0.7), foot), 0.11, T)
        A.beam("wood", (s * 0.48, -hy - 0.01, foot), (s * 0.48, -hy - 0.01, wall), 0.12, T)
    A.gable((0, 0, wall), 2 * hx, 2 * hy, 1.9, roofc, "plaster", PLASTER, over=0.32, ridge="x")
    for e in (-1, 1): A.beam("wood", (e * (hx + 0.01), 0, wall), (e * (hx + 0.01), 0, wall + 1.75), 0.11, T); A.beam("wood", (e * (hx + 0.01), -hy * 0.5, wall + 0.9), (e * (hx + 0.01), hy * 0.5, wall + 0.9), 0.1, T)
    # the door, its step and lintel; windows with shutters and warm panes
    A.box("stone", (0, -hy - 0.25, -0.05), (1.0, 0.5, foot * 0.55), STONE_L); A.box("wood", (0, -hy - 0.03, foot), (0.78, 0.08, 1.45), (0.42, 0.27, 0.15), top=(0.5, 0.33, 0.2)); A.box("plain", (0.26, -hy - 0.09, foot + 0.65), (0.06, 0.05, 0.06), GOLD)
    def window(x, y, face):
        if face == "y": A.box("glow", (x, y, 1.72), (0.5, 0.06, 0.55), (1.0, 0.82, 0.42)); A.beam("wood", (x, y - 0.035 * (1 if y < 0 else -1), 1.72), (x, y - 0.035 * (1 if y < 0 else -1), 2.27), 0.045, T); A.beam("wood", (x - 0.25, y * 1.005, 2.0), (x + 0.25, y * 1.005, 2.0), 0.045, T)
        else: A.box("glow", (x, y, 1.72), (0.06, 0.5, 0.55), (1.0, 0.82, 0.42)); A.beam("wood", (x * 1.005, y, 1.72), (x * 1.005, y, 2.27), 0.045, T); A.beam("wood", (x * 1.005, y - 0.25, 2.0), (x * 1.005, y + 0.25, 2.0), 0.045, T)
        for s in (-1, 1):
            if face == "y": A.box("wood", (x + s * 0.37, y, 1.7), (0.22, 0.05, 0.6), BLUE if roofc == ROOF_BLUE else (0.25, 0.45, 0.3))
            else: A.box("wood", (x, y + s * 0.37, 1.7), (0.05, 0.22, 0.6), BLUE if roofc == ROOF_BLUE else (0.25, 0.45, 0.3))
    window(-0.98, -hy - 0.02, "y"); window(0.98, -hy - 0.02, "y"); window(hx + 0.02, 0, "x"); window(-0.6, hy + 0.02, "y"); window(0.7, hy + 0.02, "y")
    A.box("stone", (-hx + 0.15, 0.55, 0), (0.7, 0.75, 3.6), STONE, top=STONE_L); A.box("stone", (-hx + 0.25, 0.55, 3.6), (0.5, 0.55, 1.75), STONE, top=STONE_L); A.box("stone", (-hx + 0.25, 0.55, 5.35), (0.62, 0.67, 0.14), STONE_L)
    return A

def windmill():
    """A round plastered mill on a stone foot under a shingled cap; four cloth sails on the -Y side (their own object, 'spin')."""
    A = Build(); b = A.m("stone"); seg = 12
    b.tube([(0, 0, -0.05), (0, 0, 1.3)], [1.08, 1.0], seg, lambda k, t, a: mix(tuple(v * 0.7 for v in STONE), STONE_L, t), smooth=False, cap=False)
    b = A.m("plaster"); b.tube([(0, 0, 1.3), (0, 0, 5.2)], [1.0, 0.74], seg, lambda k, t, a: mix(tuple(v * 0.86 for v in PLASTER), PLASTER, t), smooth=False, cap=False)
    A.cyl("wood", (0, 0, 1.24), 1.04, 1.03, 0.12, (0.30, 0.20, 0.13), seg=seg); A.cyl("wood", (0, 0, 5.1), 0.86, 0.86, 0.16, (0.30, 0.20, 0.13), seg=seg)
    b = A.m("roof"); d = tuple(v * 0.62 for v in ROOF_RED); b.tube([(0, 0, 5.2), (0, 0, 5.9), (0, 0, 6.7)], [0.98, 0.6, 0.02], seg, lambda k, t, a: mix(d, ROOF_RED, t), smooth=False, cap=False)
    A.box("wood", (0, -1.0, 0), (0.7, 0.1, 1.5), (0.42, 0.27, 0.15)); A.box("stone", (0, -1.2, -0.05), (0.9, 0.4, 0.2), STONE_L)
    for z, a in ((2.4, 0.9), (3.6, -1.9), (3.2, 2.6)): r = 1.0 - 0.26 * (z - 1.3) / 3.9; A.box("glow", (math.sin(a) * r, -math.cos(a) * r, z), (0.32, 0.12, 0.42), (1.0, 0.82, 0.42), rot=a)
    A.cyl("wood", (0, -1.25, 4.6), 0.09, 0.09, 0.6, (0.30, 0.20, 0.13), seg=6, axis="y")
    obs = A.finish("windmill")
    Sx = Build(); R0 = 3.1
    for k in range(4):
        a = k * math.pi / 2 + 0.3; ux, uz = math.cos(a), math.sin(a); vx, vz = -uz, ux
        P = lambda r, o, y=0.0: (ux * r + vx * o, y, uz * r + vz * o)
        Sx.beam("wood", P(0, 0), P(R0, 0), 0.09, WOOD_D)
        for r in (0.7, 1.3, 1.9, 2.5, R0): Sx.beam("wood", P(r, 0), P(r, 0.62, 0.05), 0.04, WOOD)
        Sx.beam("wood", P(0.7, 0.62, 0.05), P(R0, 0.62, 0.05), 0.04, WOOD)
        Sx.quad("cloth", [P(0.7, 0.04, 0.02), P(R0, 0.04, 0.02), P(R0, 0.6, 0.06), P(0.7, 0.6, 0.06)], CANVAS, cols=[tuple(v * 0.82 for v in CANVAS)] * 2 + [CANVAS] * 2)
    Sx.cyl("wood", (0, -0.06, 0), 0.16, 0.12, 0.2, WOOD_D, seg=8, axis="y")
    Sx.finish("sails", prefix="spin_", at=(0, -1.3, 4.6))
    return None

def stonewall():
    """A stretch of dry-stone field wall, round enough to join its neighbours whichever way the wall runs."""
    A = Build(); R = random.Random(49); b = A.m("stone")
    for k in range(9):
        a = R.uniform(0, 6.28); d = R.uniform(0.0, 0.42); z = R.uniform(0.0, 0.62); r = R.uniform(0.26, 0.4)
        b.puff((math.cos(a) * d, math.sin(a) * d, z + 0.1), r, 0.75, tuple(v * 0.68 for v in STONE), STONE_L, 490 + k, sub=1, rough=0.3)
    b.puff((0, 0, 0.3), 0.6, 0.85, tuple(v * 0.6 for v in STONE), STONE, 499, sub=1, rough=0.2)
    return A

def chapel():
    """Brother Osric's chapel: stone walls with buttresses, a steep slate roof, a bell tower with a spire over the door (-Y), arched glowing windows."""
    A = Build(); hx, hy, wall = 2.0, 3.0, 3.4; SD = tuple(v * 0.72 for v in STONE)
    A.box("stone", (0, 0, -0.05), (2 * hx + 0.3, 2 * hy + 0.3, 0.5), STONE, top=STONE_L); A.box("stone", (0, 0, 0.45), (2 * hx, 2 * hy, wall - 0.45), STONE, shade=0.85, top=STONE_L)
    A.gable((0, 0, wall), 2 * hx, 2 * hy, 2.6, ROOF_BLUE, "stone", STONE_L, over=0.28, ridge="y")
    for s in (-1, 1):
        for y in (-2.0, 0.0, 2.0):
            A.box("stone", (s * (hx + 0.22), y, 0), (0.45, 0.5, 2.3), STONE, top=STONE_L, taper=(0.6, 1.0), tilt=(-s * 0.08, 0))   # buttresses
        for y in (-1.0, 1.0):   # tall arched windows
            x = s * (hx + 0.02); A.quad("glow", [(x, y - 0.28, 1.2), (x, y + 0.28, 1.2), (x, y + 0.28, 2.5), (x, y, 2.95), (x, y - 0.28, 2.5)][::-s], (1.0, 0.78, 0.36), cols=[(0.5, 0.75, 1.0)] * 2 + [(1.0, 0.8, 0.4)] * 3)
            A.beam("stone", (x * 1.01, y, 1.2), (x * 1.01, y, 2.9), 0.06, SD); A.box("stone", (x, y, 1.08), (0.16, 0.75, 0.12), STONE_L)
    # the bell tower over the door
    ty = -hy - 0.55; A.box("stone", (0, ty, 0), (1.9, 1.5, 6.0), STONE, shade=0.8, top=STONE_L); A.box("stone", (0, ty, 6.0), (2.05, 1.65, 0.18), STONE_L)
    for sx in (-1, 1):
        for sy in (-1, 1): A.beam("wood", (sx * 0.78, ty + sy * 0.6, 6.18), (sx * 0.78, ty + sy * 0.6, 7.3), 0.16, WOOD_D)
    A.cyl("plain", (0, ty, 6.55), 0.3, 0.16, 0.45, GOLD, seg=8)   # the bell
    b = A.m("roof"); d = tuple(v * 0.6 for v in ROOF_BLUE); cs = [(-1.1, ty - 0.9), (1.1, ty - 0.9), (1.1, ty + 0.9), (-1.1, ty + 0.9)]
    for k in range(4): (x0, y0), (x1, y1) = cs[k], cs[(k + 1) % 4]; b.f([b.v((x0, y0, 7.25), d), b.v((x1, y1, 7.25), d), b.v((0, ty, 10.4), ROOF_BLUE)], False)
    A.quad("wood", [(-1.1, ty - 0.9, 7.24), (-1.1, ty + 0.9, 7.24), (1.1, ty + 0.9, 7.24), (1.1, ty - 0.9, 7.24)], WOOD_D)
    A.beam("plain", (0, ty, 10.3), (0, ty, 11.1), 0.05, GOLD); A.beam("plain", (-0.22, ty, 10.82), (0.22, ty, 10.82), 0.05, GOLD)
    fy = ty - 0.76   # the door: an arch of dark wood in a stone surround, a round window over it
    A.quad("wood", [(-0.5, fy, 0.3), (0.5, fy, 0.3), (0.5, fy, 1.9), (0, fy, 2.35), (-0.5, fy, 1.9)], (0.40, 0.25, 0.14)); A.beam("plain", (0, fy - 0.01, 0.3), (0, fy - 0.01, 2.3), 0.035, IRON)
    for e in (-1, 1): A.box("stone", (e * 0.62, fy + 0.02, 0), (0.22, 0.2, 2.0), STONE_L)
    A.box("stone", (0, fy - 0.3, -0.05), (1.7, 0.7, 0.3), STONE_L); A.cyl("glow", (0, fy + 0.02, 3.9), 0.42, 0.42, 0.04, (0.55, 0.78, 1.0), seg=10, axis="y", shade=1.0); A.cyl("stone", (0, fy + 0.05, 3.9), 0.52, 0.52, 0.04, STONE_L, seg=10, axis="y")
    return A

MODELS = {"palisade": palisade, "tent": tent, "well": well, "wagon": wagon, "stall": stall, "forge": forge, "lantern": lantern, "tower": tower,
          "cottage": cottage, "cottage2": lambda: cottage(ROOF_RED), "windmill": windmill, "stonewall": stonewall, "chapel": chapel}

def sheet(name):
    """A review picture: the model from the front-left, with a hero-sized post (1.65) beside it."""
    obs = [o for o in bpy.data.objects if o.type == "MESH"]; mx = max(max((o.matrix_world @ Vector(c)).z for c in o.bound_box) for o in obs); ext = max(max(abs((o.matrix_world @ Vector(c)).x) for c in o.bound_box) for o in obs)
    bpy.ops.mesh.primitive_plane_add(size=200); gp = bpy.context.object; gm = bpy.data.materials.new("g"); gm.use_nodes = True; gm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.22, 0.4, 0.14, 1); gp.data.materials.append(gm)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.25, depth=1.65, location=(ext + 0.9, -1.2, 0.825)); post = bpy.context.object; pm = bpy.data.materials.new("p"); pm.use_nodes = True; pm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.8, 0.15, 0.1, 1); post.data.materials.append(pm)
    w = bpy.data.worlds.new("w"); w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.55, 0.75, 0.95, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 1.0; bpy.context.scene.world = w
    l = bpy.data.lights.new("sun", "SUN"); l.energy = 3.2; l.color = (1.0, 0.94, 0.82); lo = bpy.data.objects.new("sun", l); bpy.context.scene.collection.objects.link(lo); lo.rotation_euler = Vector((0.45, 0.6, -0.8)).to_track_quat("-Z", "Y").to_euler()
    for k, (ang, tag) in enumerate(((-2.0, "a"),)):
        c = bpy.data.cameras.new("cam"); c.lens = 35; co = bpy.data.objects.new("cam", c); bpy.context.scene.collection.objects.link(co); dist = max(mx, ext * 2) * 2.3 + 3
        co.location = (math.cos(ang) * dist, math.sin(ang) * dist, mx * 0.55 + 1.2); co.rotation_euler = (Vector((0, 0, mx * 0.45)) - co.location).to_track_quat("-Z", "Y").to_euler(); s = bpy.context.scene; s.camera = co
        s.render.engine = "BLENDER_EEVEE"; s.render.resolution_x, s.render.resolution_y = 640, 640; s.view_settings.view_transform = "Standard"; s.render.filepath = os.path.join(OUT, f"sheet_{name}_{tag}.png"); bpy.ops.render.render(write_still=True)

if __name__ == "__main__":
    only = os.environ.get("ONLY", "").split(",") if os.environ.get("ONLY") else None
    if not only or "paint" in only: wood_detail(); shingle_detail(); plaster_detail(); cloth_detail()
    for name, fn in MODELS.items():
        if only and name not in only: continue
        kit.reset(); A = fn()
        if A: A.finish(name)
        for o in bpy.data.objects: o.select_set(o.type == "MESH")
        bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, f"b_{name}.glb"), export_format="GLB", export_yup=True, export_animations=False, export_vertex_color="ACTIVE", export_all_vertex_colors=False, use_selection=True)
        print("BUILT", name, "tris", sum(len(p.vertices) - 2 for o in bpy.data.objects if o.type == "MESH" for p in o.data.polygons), flush=True)
        if os.environ.get("SHEET"): sheet(name)
