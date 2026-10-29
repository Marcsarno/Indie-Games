"""Road kit: roads are Catmull-Rom centre-lines with a half-width, optional grass median, sidewalks, curbs, lane paint, rounded junction corners (flares), roundabouts / cul-de-sac rings,
lakes as blobs.  Blender coords (x east, y north), metres.  Higher `rank` roads are parents: lower-rank roads that cross them are cut at the parent's curb and flare into it.
Everything is flat upward-facing quads (Builder.build(recalc=False)); curbs get side walls.   Also returns lane paths, sidewalk paths, minimap lines and lake colliders."""
import sys, os, math, bisect; sys.path.insert(0, os.path.dirname(__file__)); from kit import *

CURB, SWK = .3, 2.4
Z_ASPH, Z_MARK, Z_WALK, Z_CURB, Z_MED = .03, .036, .15, .17, .17

def catmull(ctrl, closed=False, step=.5):
    P = [tuple(p) for p in ctrl]
    if closed: Q = [P[-1]] + P + [P[0], P[1]]
    else: Q = [(2 * P[0][0] - P[1][0], 2 * P[0][1] - P[1][1])] + P + [(2 * P[-1][0] - P[-2][0], 2 * P[-1][1] - P[-2][1])]
    out = []
    for i in range(1, len(Q) - 2):
        p0, p1, p2, p3 = Q[i - 1], Q[i], Q[i + 1], Q[i + 2]
        t0 = 0; t1 = t0 + math.dist(p0, p1) ** .5; t2 = t1 + math.dist(p1, p2) ** .5; t3 = t2 + math.dist(p2, p3) ** .5
        n = max(2, int(math.dist(p1, p2) / step))
        for k in range(n):
            t = t1 + (t2 - t1) * k / n
            def lerp(a, b, ta, tb): return tuple(((tb - t) * a[j] + (t - ta) * b[j]) / (tb - ta) for j in (0, 1))
            A1 = lerp(p0, p1, t0, t1); A2 = lerp(p1, p2, t1, t2); A3 = lerp(p2, p3, t2, t3); B1 = lerp(A1, A2, t0, t2); B2 = lerp(A2, A3, t1, t3); out.append(lerp(B1, B2, t1, t2))
    if not closed: out.append(P[-1])
    return out

def _flare(d, R):                      # extra half-width at distance d from a junction edge: a circular fillet of radius R
    if d >= R: return 0.0
    if d <= 0: return R
    return R - math.sqrt(max(0.0, R * R - (R - d) ** 2))

class Road:
    def __init__(self, name, ctrl, hw=3.5, mh=0.0, sw=(1, 1), rank=1, closed=False, flare=4.5, xwalk=False, island=None, sw_ring="out", mark=True, surf="asphalt", curbs=True):
        self.name, self.hw, self.mh, self.sw, self.rank, self.closed, self.flare, self.xwalk, self.island, self.mark = name, hw, mh, sw, rank, closed, flare, xwalk, island, mark; self.surf, self.curbs = surf, curbs
        self.d = catmull(ctrl, closed, .5)
        n = len(self.d); self.s = [0.0]
        for i in range(1, n + (1 if closed else 0)): self.s.append(self.s[-1] + math.dist(self.d[i % n], self.d[i - 1]))
        self.L = self.s[-1]; self.gaps = {"L": [], "R": [], "M": [], "K": []}; self.pieces = []; self.junctions = []
    def at(self, s):
        if self.closed: s %= self.L
        else: s = max(0.0, min(self.L, s))
        i = min(bisect.bisect_right(self.s, s) - 1, len(self.s) - 2); n = len(self.d)
        a, b = self.d[i % n], self.d[(i + 1) % n]; t = (s - self.s[i]) / max(1e-9, self.s[i + 1] - self.s[i]); dx, dy = b[0] - a[0], b[1] - a[1]; l = math.hypot(dx, dy) or 1
        return (a[0] + dx * t, a[1] + dy * t, dx / l, dy / l)
    def off(self, s, o):               # point at lateral offset o (positive = left of travel)
        x, y, tx, ty = self.at(s); return (x - ty * o, y + tx * o)
    def nearest(self, x, y):
        n = len(self.d); step = 8
        if n > 80:                                                      # coarse pass over every 8th vertex, then refine the segments around the best one
            bi, bd = 0, 1e18
            for i in range(0, n, step):
                dd = (self.d[i][0] - x) ** 2 + (self.d[i][1] - y) ** 2
                if dd < bd: bd, bi = dd, i
            idx = [(bi + k) % n for k in range(-2 * step, 2 * step + 1)] if self.closed else [k for k in range(bi - 2 * step, bi + 2 * step + 1) if 0 <= k < n - 1]
        else: idx = list(range(n - (0 if self.closed else 1)))
        best = (1e18, 0.0)
        for i in idx:
            a, b = self.d[i], self.d[(i + 1) % n]; dx, dy = b[0] - a[0], b[1] - a[1]; l2 = dx * dx + dy * dy or 1
            t = max(0, min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / l2)); px, py = a[0] + dx * t, a[1] + dy * t; d = math.hypot(x - px, y - py)
            if d < best[0]: best = (d, self.s[i] + math.sqrt(l2) * t)
        return best                    # (distance, s)

def build_network(roads):
    """Find where lower-rank roads cross higher-rank ones, cut them at the parent's curb, register gaps on the parent and compute each road's drawable pieces."""
    for r in roads: r.cuts = []
    for A in roads:
        for B in roads:
            if B is A or B.rank >= A.rank or B.closed: continue
            prev = None
            def sd(p):                                                      # signed distance to A's centre-line (positive = left of A's travel) and A's s there
                d_, s_ = A.nearest(*p); t_ = A.at(s_); sg = (p[0] - t_[0]) * -t_[3] + (p[1] - t_[1]) * t_[2]; return (d_ if sg >= 0 else -d_), s_
            for i in range(0, len(B.d) - 8, 8):
                p, q = B.d[i], B.d[i + 8]; da, sa = sd(p); db, sb = sd(q)
                if da * db < 0 and abs(da) < 60 and abs(db) < 60 and (A.closed or abs(sa - sb) < 15):
                    lo, hi = B.s[i], B.s[i + 8]
                    for _ in range(18):
                        mid = (lo + hi) / 2; mx, my, _, _ = B.at(mid); dm, _ = sd((mx, my))
                        if dm * da > 0: lo = mid
                        else: hi = mid
                    sB = (lo + hi) / 2
                    mx0, my0, _, _ = B.at(sB); dA0, sA0 = A.nearest(mx0, my0)
                    if dA0 > .5: continue                                              # sign flipped only because we passed the end-line extension of A, not A itself
                    if prev is not None and abs(sB - prev) < 4: continue
                    prev = sB; mx, my, _, _ = B.at(sB); _, sA = A.nearest(mx, my)
                    def scan(direction):
                        s_ = sB
                        while 0 < s_ < B.L:
                            x_, y_, _, _ = B.at(s_)
                            if A.nearest(x_, y_)[0] >= A.hw + .01: break
                            s_ += direction * .25
                        return max(0.0, min(B.L, s_))
                    lo_s, hi_s = scan(-1), scan(1); R = min(B.flare, A.flare) if A.flare else B.flare
                    B.cuts.append((lo_s, hi_s, A, R, sA, (mx, my), sB))
    for B in roads:
        if B.closed: B.pieces = [(0.0, B.L, 0, 0, 0, 0)]; continue
        cuts = sorted(B.cuts, key=lambda c: c[0]); pieces = []; cur = 0.0; fl0 = 0; e0 = 0.0
        for (lo, hi, A, R, sA, P, sB) in cuts:
            if lo - cur >= 5: pieces.append((cur, lo, fl0, R, e0, sB - lo))
            cur = hi; fl0 = R; e0 = hi - sB
        if B.L - cur >= 5: pieces.append((cur, B.L, fl0, 0, e0, 0.0))
        for A_ in roads:                                                                                  # a pass-through road leaves a piece inside a roundabout island: drop it
            if A_.closed and A_.island is not None and A_ is not B:
                icx, icy, ir = A_.island
                pieces = [p for p in pieces if math.hypot(B.at((p[0] + p[1]) / 2)[0] - icx, B.at((p[0] + p[1]) / 2)[1] - icy) > ir + .5]
        B.pieces = pieces
        for (lo, hi, A, R, sA, P, sB) in cuts:          # gaps on the parent where the (remaining) child pieces attach
            ta = A.at(sA); w = B.hw + R
            for side_s, ok in ((lo - 3.0, any(abs(p[1] - lo) < 1e-6 for p in pieces)), (hi + 3.0, any(abs(p[0] - hi) < 1e-6 for p in pieces))):
                if not ok: continue
                x_, y_, _, _ = B.at(max(0, min(B.L, side_s))); left = (x_ - ta[0]) * -ta[3] + (y_ - ta[1]) * ta[2] > 0
                A.gaps["L" if left else "R"].append((sA - w, sA + w))
            A.gaps["M"].append((sA - w, sA + w)); A.gaps["K"].append((sA - w - 1.5, sA + w + 1.5)); A.junctions.append({"child": B, "p": P, "sA": sA, "R": R, "w": w, "lo": lo, "hi": hi})
    return roads

def _in(gaps, s0, s1):
    return any(g0 < s1 and g1 > s0 for g0, g1 in gaps)

def _samples(road, s0, s1, forced=()):
    xs = [s for s in road.s if s0 < s < s1]; xs += [s for s in forced if s0 < s < s1]; xs += [s0, s1]
    # thin the dense list: keep a vertex when the heading changed > 3 deg or 5 m passed
    xs = sorted(set(round(x, 3) for x in xs)); out = [xs[0]]; last = road.at(xs[0])
    for x in xs[1:-1]:
        t = road.at(x); ang = math.degrees(math.acos(max(-1, min(1, t[2] * last[2] + t[3] * last[3]))))
        if ang > 2.5 or x - out[-1] > 5 or any(abs(x - f) < .26 for f in forced): out.append(x); last = t
    out.append(xs[-1]); return out

def strip(b, mat, road, s0, s1, o0, o1, z, forced=(), gaps=(), solid=None, hwf=None):
    """Flat upward strip between lateral offsets o0..o1 (callables or numbers; o1 > o0, positive = left) from s0 to s1. solid=z_bottom adds both side walls (curbs)."""
    f0 = o0 if callable(o0) else (lambda s: o0); f1 = o1 if callable(o1) else (lambda s: o1); forced = list(forced) + [g for gg in gaps for g in gg]
    xs = _samples(road, s0, s1, forced)
    for a, c in zip(xs[:-1], xs[1:]):
        if gaps and _in(gaps, a, c): continue
        Ra, La, Rc, Lc = [(*road.off(s, f(s)), z) for s in (a, c) for f in (f0, f1)]
        b.poly(mat, [Ra, Rc, Lc, La])
        if solid is not None:
            Rb, Rcb, Lb, Lcb = [(*p[:2], solid) for p in (Ra, Rc, La, Lc)]
            b.poly(mat, [Rb, Rcb, Rc, Ra]); b.poly(mat, [Lcb, Lb, La, Lc])

def _ranges(s0, s1, gaps):
    segs = [(s0, s1)]
    for g0, g1 in sorted(gaps):
        out = []
        for a, c in segs:
            if g1 <= a or g0 >= c: out.append((a, c)); continue
            if g0 > a: out.append((a, g0))
            if g1 < c: out.append((g1, c))
        segs = out
    return segs

def draw_road(R, road, m):
    """R = flat Builder for road surfaces; m = materials dict (asphalt, walk, curb, grass, white, yel)."""
    mh = road.mh
    for (s0, s1, f0, f1, e0, e1) in road.pieces:
        forced = [s0 + k * f0 / 8 for k in range(9)] if f0 else []; forced += [s1 - k * f1 / 8 for k in range(9)] if f1 else []
        def hwf(s, f0=f0, f1=f1, s0=s0, s1=s1): return road.hw + (_flare(s - s0, f0) if f0 else 0) + (_flare(s1 - s, f1) if f1 else 0)
        strip(R, m[road.surf], road, max(0.0, s0 - e0) if not road.closed else s0, min(road.L, s1 + e1) if not road.closed else s1, lambda s: -hwf(s), hwf, Z_ASPH, forced)
        for side, sign in (("L", 1), ("R", -1)):
            g = road.gaps[side]
            if not road.curbs: continue
            if sign > 0: strip(R, m["curb"], road, s0, s1, lambda s: hwf(s), lambda s: hwf(s) + CURB, Z_CURB, forced, g, solid=0.0)
            else: strip(R, m["curb"], road, s0, s1, lambda s: -hwf(s) - CURB, lambda s: -hwf(s), Z_CURB, forced, g, solid=0.0)
            if road.sw[0 if sign > 0 else 1]:
                if sign > 0: strip(R, m["walk"], road, s0, s1, lambda s: hwf(s) + CURB, lambda s: hwf(s) + CURB + SWK, Z_WALK, forced, g)
                else: strip(R, m["walk"], road, s0, s1, lambda s: -hwf(s) - CURB - SWK, lambda s: -hwf(s) - CURB, Z_WALK, forced, g)
        if mh:
            g = road.gaps["M"]
            strip(R, m["curb"], road, s0, s1, -mh, mh, .16, forced, g, solid=0.0); strip(R, m["grass"], road, s0, s1, -mh + .22, mh - .22, .17, forced, g)
        # paint
        skip = list(road.gaps["K"]) + ([(s0 - 1, s0 + f0 + 2.5)] if f0 else []) + ([(s1 - f1 - 2.5, s1 + 1)] if f1 else [])
        if not road.mark: continue
        def line(o, w, dash=None, mat=m["white"]):
            for a, c in _ranges(s0 + (.4 if not f0 else 0), s1 - (.4 if not f1 else 0), skip):
                if dash:
                    k = a
                    while k + dash[0] <= c: strip(R, mat, road, k, k + dash[0], o - w / 2, o + w / 2, Z_MARK); k += dash[0] + dash[1]
                else: strip(R, mat, road, a, c, o - w / 2, o + w / 2, Z_MARK, forced)
        if road.island is not None: continue                                    # rings: no paint
        line(road.hw - .3, .12); line(-road.hw + .3, .12)
        if mh:
            line(mh + .55, .1, mat=m["yel"]); line(-mh - .55, .1, mat=m["yel"])
            lanes = max(1, round((road.hw - mh - .6) / 3.4))
            for k in range(1, lanes):
                o = mh + .6 + k * (road.hw - mh - .6) / lanes; line(o, .1, (2.2, 3.8)); line(-o, .1, (2.2, 3.8))
        elif road.hw >= 3.0: line(.12, .09, mat=m["yel"]); line(-.12, .09, mat=m["yel"])
    # crosswalks
    for j in road.junctions:
        if not road.xwalk: continue
        for sgn in (-1, 1):
            sc = j["sA"] + sgn * (j["w"] + 2.4); v = -road.hw + .5
            while v < road.hw - .4:
                if abs(v) > mh + .5: strip(R, m["white"], road, sc - 1.3, sc + 1.3, v, v + .5, Z_MARK)
                v += 1.05

def island_disc(R, T, m, cx, cy, r):
    """Round raised island: concrete ring + grass top."""
    n = 28
    for k in range(n):
        a0, a1 = 2 * math.pi * k / n, 2 * math.pi * (k + 1) / n
        for (rr0, rr1, z, mt) in ((r - .3, r, Z_CURB, m["curb"]),):
            R.poly(mt, [(cx + rr0 * math.cos(a0), cy + rr0 * math.sin(a0), z), (cx + rr1 * math.cos(a0), cy + rr1 * math.sin(a0), z), (cx + rr1 * math.cos(a1), cy + rr1 * math.sin(a1), z), (cx + rr0 * math.cos(a1), cy + rr0 * math.sin(a1), z)][::-1])
        R.poly(m["grass"], [(cx, cy, Z_CURB), (cx + (r - .3) * math.cos(a0), cy + (r - .3) * math.sin(a0), Z_CURB), (cx + (r - .3) * math.cos(a1), cy + (r - .3) * math.sin(a1), Z_CURB)][::-1])

def ring_road(name, cx, cy, Rc, hw, rank=5, seam=0.0, swo=1, flare=5.0):
    pts = [(cx + Rc * math.cos(seam + 2 * math.pi * k / 24), cy + Rc * math.sin(seam + 2 * math.pi * k / 24)) for k in range(24)]
    r = Road(name, pts, hw=hw, rank=rank, closed=True, sw=(0, swo), flare=flare, island=(cx, cy, Rc - hw - CURB)); return r      # CCW: left = inside, right = outside

def blob(ctrl, step=3.0):
    pts = catmull(ctrl, True, step)
    area = sum(pts[i][0] * pts[(i + 1) % len(pts)][1] - pts[(i + 1) % len(pts)][0] * pts[i][1] for i in range(len(pts)))
    return pts if area > 0 else pts[::-1]

def lake(R, m, ctrl, bank=1.3, step=3.0):
    """Water blob (CCW closed control points). Returns (ring points, centroid) ; draws bank + water."""
    ring = blob(ctrl, step); cx = sum(p[0] for p in ring) / len(ring); cy = sum(p[1] for p in ring) / len(ring); n = len(ring)
    for i in range(n):
        a, c = ring[i], ring[(i + 1) % n]; pa, pc = ring[i - 1], ring[(i + 2) % n]
        def out(p, q, r_):
            tx, ty = r_[0] - q[0], r_[1] - q[1]; l = math.hypot(tx, ty) or 1; return (p[0] + ty / l * bank, p[1] - tx / l * bank)
        oa, oc = out(a, pa, c), out(c, a, pc)
        R.poly(m["bank"], [(*oa, .035), (*a, .035), (*c, .035), (*oc, .035)])
        R.poly(m["water"], [(cx, cy, .07), (*a, .07), (*c, .07)])
    return ring, (cx, cy)

def lake_colliders(ring, cx, cy, shrink=.4):
    out = []
    for i in range(len(ring)):
        a, c = ring[i], ring[(i + 1) % len(ring)]
        pts = [(cx, cy)] + [(p[0] + (cx - p[0]) * shrink / max(1e-6, math.hypot(cx - p[0], cy - p[1])), p[1] + (cy - p[1]) * shrink / max(1e-6, math.hypot(cx - p[0], cy - p[1]))) for p in (a, c)]
        out.append({"t": "poly", "pts": [[round(p[0], 2), round(p[1], 2)] for p in pts]})
    return out

def lane_path(road, off, rev=False, step=3.0, s0=0.0, s1=None):
    s1 = road.L if s1 is None else s1; xs = _samples(road, s0, s1); pts = [road.off(s, off) for s in xs]
    return pts[::-1] if rev else pts
