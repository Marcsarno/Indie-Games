"""Rounded primitives. Every function returns an S (a small bmesh wrapper) so pieces can be
moved, painted and tagged, then handed to common.make()."""
import math
import bmesh
from mathutils import Vector, Matrix, Euler, noise
from . import palette as P

COL = 'Col'


def new_bm():
    bm = bmesh.new()
    bm.loops.layers.float_color.new(COL)
    bm.verts.layers.int.new('bone')
    bm.verts.layers.float.new('_zone')
    bm.verts.layers.float.new('_noline')   # 1 = no ink outline here (small face details)
    return bm


class S:
    def __init__(self, bm):
        self.bm = bm

    # transforms -------------------------------------------------------------
    def at(self, x=0.0, y=0.0, z=0.0):
        bmesh.ops.translate(self.bm, verts=self.bm.verts, vec=(x, y, z))
        return self

    def rot(self, rx=0.0, ry=0.0, rz=0.0):
        m = Euler((math.radians(rx), math.radians(ry), math.radians(rz)), 'XYZ').to_matrix()
        bmesh.ops.rotate(self.bm, verts=self.bm.verts, cent=(0, 0, 0), matrix=m)
        return self

    def scale(self, sx=1.0, sy=None, sz=None):
        sy = sx if sy is None else sy
        sz = sx if sz is None else sz
        bmesh.ops.scale(self.bm, verts=self.bm.verts, vec=(sx, sy, sz))
        if sx * sy * sz < 0:
            bmesh.ops.reverse_faces(self.bm, faces=self.bm.faces)
        return self

    def bend(self, fn):
        """Move every vertex: fn(Vector) -> Vector."""
        for v in self.bm.verts:
            v.co = fn(v.co.copy())
        return self

    def noise(self, amp, freq=3.0, seed=0.0):
        self.bm.normal_update()
        for v in self.bm.verts:
            n = noise.noise(v.co * freq + Vector((seed, seed * 1.7, seed * 0.3)))
            v.co += v.normal * n * amp
        return self

    # colour and tags --------------------------------------------------------
    def paint(self, col):
        c = P.lin(col) if isinstance(col, str) else col
        layer = self.bm.loops.layers.float_color[COL]
        for f in self.bm.faces:
            for l in f.loops:
                l[layer] = (c[0], c[1], c[2], 1.0)
        return self

    def shade(self, fn):
        """Per-corner colour: fn(co, face_normal) -> palette key / hex / linear rgb."""
        layer = self.bm.loops.layers.float_color[COL]
        self.bm.normal_update()
        for f in self.bm.faces:
            for l in f.loops:
                c = fn(l.vert.co, f.normal)
                c = P.lin(c) if isinstance(c, str) else c
                l[layer] = (c[0], c[1], c[2], 1.0)
        return self

    def shade_face(self, fn):
        """Per-face colour: fn(face_centre, face_normal) -> palette key / hex / linear rgb."""
        layer = self.bm.loops.layers.float_color[COL]
        self.bm.normal_update()
        for f in self.bm.faces:
            c = fn(f.calc_center_median(), f.normal)
            c = P.lin(c) if isinstance(c, str) else c
            for l in f.loops:
                l[layer] = (c[0], c[1], c[2], 1.0)
        return self

    def bone(self, idx):
        layer = self.bm.verts.layers.int['bone']
        for v in self.bm.verts:
            v[layer] = idx
        return self

    def zone(self, z):
        layer = self.bm.verts.layers.float['_zone']
        for v in self.bm.verts:
            v[layer] = float(z)
        return self

    def noline(self):
        layer = self.bm.verts.layers.float['_noline']
        for v in self.bm.verts:
            v[layer] = 1.0
        return self

    def zone_by(self, fn):
        """Per-vertex tint zone: fn(co) -> zone number."""
        layer = self.bm.verts.layers.float['_zone']
        for v in self.bm.verts:
            v[layer] = float(fn(v.co))
        return self

    def flip(self):
        bmesh.ops.reverse_faces(self.bm, faces=self.bm.faces)
        return self

    def copy(self):
        return S(self.bm.copy())


# ---------------------------------------------------------------------------- primitives

def box(sx, sy, sz, r=0.03, seg=3, cell=None, col='cream'):
    """Rounded box centred on the origin. `cell` cuts the big faces into a grid (for baked AO)."""
    bm = new_bm()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, verts=bm.verts, vec=(sx, sy, sz))
    if cell:
        for axis, size in enumerate((sx, sy, sz)):
            n = int(round(size / cell))
            for i in range(1, n):
                co = [0.0, 0.0, 0.0]
                co[axis] = -size / 2 + size * i / n
                no = [0.0, 0.0, 0.0]
                no[axis] = 1.0
                bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=co, plane_no=no)
    r = min(r, min(sx, sy, sz) * 0.499)
    if r > 0:
        bm.normal_update()
        edges = [e for e in bm.edges if len(e.link_faces) == 2 and e.link_faces[0].normal.dot(e.link_faces[1].normal) < 0.5]
        bmesh.ops.bevel(bm, geom=edges, offset=r, segments=seg, profile=0.5, affect='EDGES', clamp_overlap=True)
    return S(bm).paint(col)


def fillet(pts, r, n=4):
    """Round the inner corners of a 2D polyline (list of (a, b)) with radius r."""
    out = [pts[0]]
    for i in range(1, len(pts) - 1):
        p0, p1, p2 = Vector(pts[i - 1]), Vector(pts[i]), Vector(pts[i + 1])
        d0, d1 = (p0 - p1), (p2 - p1)
        l0, l1 = d0.length, d1.length
        if l0 < 1e-6 or l1 < 1e-6:
            out.append(tuple(p1))
            continue
        rr = min(r, l0 * 0.45, l1 * 0.45)
        a, b = p1 + d0.normalized() * rr, p1 + d1.normalized() * rr
        for k in range(n + 1):
            t = k / n
            q = (1 - t) ** 2 * a + 2 * t * (1 - t) * p1 + t ** 2 * b
            out.append((q.x, q.y))
    out.append(pts[-1])
    return out


def lathe(profile, segs=24, col='cream', r=0.0, n=4):
    """Revolve (radius, z) points about Z. Radius 0 at an end makes a pole. `r` fillets the corners."""
    if r > 0:
        profile = fillet(profile, r, n)
    bm = new_bm()
    rings = []
    for (rad, z) in profile:
        if rad < 1e-6:
            rings.append([bm.verts.new((0, 0, z))])
        else:
            rings.append([bm.verts.new((rad * math.cos(2 * math.pi * k / segs), rad * math.sin(2 * math.pi * k / segs), z)) for k in range(segs)])
    for a, b in zip(rings[:-1], rings[1:]):
        if len(a) == 1 and len(b) == 1:
            continue
        for k in range(segs):
            k2 = (k + 1) % segs
            try:
                if len(a) == 1:
                    bm.faces.new((a[0], b[k2], b[k]))
                elif len(b) == 1:
                    bm.faces.new((a[k], a[k2], b[0]))
                else:
                    bm.faces.new((a[k], a[k2], b[k2], b[k]))
            except ValueError:
                pass
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return S(bm).paint(col)


def cyl(r, h, bevel=0.02, segs=24, col='cream'):
    """Solid cylinder standing on z=0 with rounded rims."""
    return lathe([(0, 0), (r, 0), (r, h), (0, h)], segs=segs, col=col, r=bevel)


def ball(r=0.1, sub=3, col='cream', sx=1.0, sy=1.0, sz=1.0):
    bm = new_bm()
    bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r)
    bmesh.ops.scale(bm, verts=bm.verts, vec=(sx, sy, sz))
    return S(bm).paint(col)


def uvball(r=0.1, segs=16, rings=10, col='cream'):
    bm = new_bm()
    bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=rings, radius=r)
    return S(bm).paint(col)


def capsule(r, h, segs=16, col='cream'):
    """Capsule along Z from z=0 to z=h (h includes the caps)."""
    n = 6
    prof = [(0, 0)]
    for k in range(1, n + 1):
        a = math.pi / 2 * k / n
        prof.append((r * math.sin(a), r - r * math.cos(a)))
    for k in range(n, 0, -1):
        a = math.pi / 2 * k / n
        prof.append((r * math.sin(a), h - r + r * math.cos(a)))
    prof.append((0, h))
    return lathe(prof, segs=segs, col=col)


def tube(path, r=0.02, segs=10, col='steel', caps=True):
    """Sweep a circle of radius r (number or per-point list) along a list of 3D points."""
    bm = new_bm()
    pts = [Vector(p) for p in path]
    rad = r if isinstance(r, (list, tuple)) else [r] * len(pts)
    rings = []
    up = Vector((0, 0, 1))
    prev_n = None
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        if prev_n is None:
            ref = up if abs(t.dot(up)) < 0.9 else Vector((1, 0, 0))
            nrm = t.cross(ref).normalized()
        else:
            nrm = (prev_n - t * prev_n.dot(t)).normalized()
        prev_n = nrm
        bi = t.cross(nrm)
        rings.append([bm.verts.new(p + (nrm * math.cos(2 * math.pi * k / segs) + bi * math.sin(2 * math.pi * k / segs)) * rad[i]) for k in range(segs)])
    for a, b in zip(rings[:-1], rings[1:]):
        for k in range(segs):
            k2 = (k + 1) % segs
            bm.faces.new((a[k], a[k2], b[k2], b[k]))
    if caps:
        for ring, p, sgn in ((rings[0], pts[0], -1), (rings[-1], pts[-1], 1)):
            t = (pts[1] - pts[0]).normalized() if sgn < 0 else (pts[-1] - pts[-2]).normalized()
            rr = rad[0] if sgn < 0 else rad[-1]
            c = bm.verts.new(p + t * sgn * rr * 0.5)
            for k in range(segs):
                k2 = (k + 1) % segs
                bm.faces.new((ring[k], ring[k2], c))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return S(bm).paint(col)


def prism(outline, depth, bevel=0.01, seg=2, col='cream'):
    """Extrude a 2D outline (x, y) along Z by `depth`, centred on z=0, with rounded edges."""
    bm = new_bm()
    vs = [bm.verts.new((x, y, -depth / 2)) for (x, y) in outline]
    f = bm.faces.new(vs)
    res = bmesh.ops.extrude_face_region(bm, geom=[f])
    bmesh.ops.translate(bm, verts=[g for g in res['geom'] if isinstance(g, bmesh.types.BMVert)], vec=(0, 0, depth))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if bevel > 0:
        bm.normal_update()
        edges = [e for e in bm.edges if len(e.link_faces) == 2 and e.link_faces[0].normal.dot(e.link_faces[1].normal) < 0.5]
        bmesh.ops.bevel(bm, geom=edges, offset=bevel, segments=seg, profile=0.5, affect='EDGES', clamp_overlap=True)
    bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 4])
    return S(bm).paint(col)


def grid(sx, sy, cell=0.25, col='cream'):
    """Flat grid on z=0, facing +Z."""
    bm = new_bm()
    nx, ny = max(1, int(round(sx / cell))), max(1, int(round(sy / cell)))
    bmesh.ops.create_grid(bm, x_segments=nx, y_segments=ny, size=0.5)
    bmesh.ops.scale(bm, verts=bm.verts, vec=(sx, sy, 1))
    bm.normal_update()
    bm.faces.ensure_lookup_table()
    if bm.faces and bm.faces[0].normal.z < 0:
        bmesh.ops.reverse_faces(bm, faces=bm.faces)
    return S(bm).paint(col)


def star(r_out, r_in, points=5, depth=0.03, col='butter', bevel=0.008):
    o = []
    for k in range(points * 2):
        a = math.pi / 2 + math.pi * k / points
        rr = r_out if k % 2 == 0 else r_in
        o.append((rr * math.cos(a), rr * math.sin(a)))
    return prism(o, depth, bevel=bevel, col=col)


def torus(R, r, segs=24, rsegs=10, col='steel'):
    bm = new_bm()
    rings = []
    for i in range(segs):
        a = 2 * math.pi * i / segs
        c = Vector((math.cos(a) * R, math.sin(a) * R, 0))
        d = Vector((math.cos(a), math.sin(a), 0))
        rings.append([bm.verts.new(c + d * math.cos(2 * math.pi * k / rsegs) * r + Vector((0, 0, 1)) * math.sin(2 * math.pi * k / rsegs) * r) for k in range(rsegs)])
    for i in range(segs):
        a, b = rings[i], rings[(i + 1) % segs]
        for k in range(rsegs):
            k2 = (k + 1) % rsegs
            bm.faces.new((a[k], b[k], b[k2], a[k2]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return S(bm).paint(col)
