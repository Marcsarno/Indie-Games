"""Round 46 (user: "for a phone game I would love it to be the size it is, but it's just impossible. So we scale it down, we fill in the gaps").
One shared coordinate squeeze used by plan_v7.py (roads, lots, houses, routes...) and by the Blender fills (the hand-placed sites):
x and y are each mapped by a piecewise-linear, monotone function. Spans with slope 1 are kept exactly (the McDonald's / plaza corner, the Promenade,
Lyons, the high school, the 441 + Powerline strips); everything between them is squeezed. Buildings keep their real size everywhere: only positions move.
Origin (Lyons Rd at Coconut Creek Pkwy) stays put."""
import bisect

# (x_old start, slope) per span; the map is continuous and passes through 0 -> 0
XS = [(-1200, 1.0), (-805, .55), (-345, 1.0), (450, .5), (805, 1.0)]
YS = [(-800, .6), (-15, 1.0), (245, .55), (670, 1.0), (815, .7), (1065, 1.0), (1330, .65)]
ON = True

def _mk(spans):
    starts = [s for s, _ in spans]; slopes = [k for _, k in spans]
    acc = [0.0]                                                   # mapped value at each span start, before the 0 -> 0 shift
    for i in range(1, len(starts)): acc.append(acc[-1] + (starts[i] - starts[i - 1]) * slopes[i - 1])
    def raw(v):
        i = max(0, bisect.bisect_right(starts, v) - 1); return acc[i] + (v - starts[i]) * slopes[i]
    z = raw(0.0)
    def f(v): return raw(v) - z if ON else v
    def slope(v): i = max(0, bisect.bisect_right(starts, v) - 1); return slopes[i] if ON else 1.0
    def inv(u):
        if not ON: return u
        u = u + z
        i = max(0, bisect.bisect_right(acc, u) - 1); return starts[i] + (u - acc[i]) / slopes[i]
    return f, slope, inv

fx, sx, ix = _mk(XS)
fy, sy, iy = _mk(YS)
def M(x, y): return (fx(x), fy(y))
def Minv(x, y): return (ix(x), iy(y))
def span(a0, a1, f):
    """Map an interval: a long one (> 6 m) maps both ends; a short one keeps its length and moves with its centre (posts, walls, small boxes stay real size)."""
    if a1 - a0 > 6: return f(a0), f(a1)
    c = f((a0 + a1) / 2); h = (a1 - a0) / 2; return c - h, c + h
def rect(x0, y0, x1, y1):
    X0, X1 = span(x0, x1, fx); Y0, Y1 = span(y0, y1, fy); return X0, Y0, X1, Y1
def keep_rect(x0, y0, x1, y1):
    """A building: centre moves, size stays."""
    cx, cy = M((x0 + x1) / 2, (y0 + y1) / 2); w, h = (x1 - x0) / 2, (y1 - y0) / 2; return cx - w, cy - h, cx + w, cy + h
def ellipse(cx, cy, rx, ry): X, Y = M(cx, cy); return X, Y, (fx(cx + rx) - fx(cx - rx)) / 2, (fy(cy + ry) - fy(cy - ry)) / 2
def densify(pts, step=10.0):
    import math
    out = [pts[0]]
    for a, b in zip(pts, pts[1:]):
        n = max(1, int(math.dist(a, b) / step))
        for k in range(1, n + 1): out.append((a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n))
    return out

if __name__ == "__main__":
    for nm, v in (("441", -825), ("Banks", -450), ("canal", -212), ("Lyons", 0), ("Aruba", 250), ("Cougar", 440), ("Powerline", 825), ("XW", -995), ("XE", 915)): print(f"x {nm:10s} {v:6.0f} -> {fx(v):7.1f}")
    for nm, v in (("YS", -525), ("Dave", -320), ("Pkwy", 0), ("NW15", 236), ("Copans", 500), ("Sample", 800), ("Wiles", 1075), ("Winston", 1312), ("Johnson", 1625), ("Hillsboro", 1825), ("YN", 1905)): print(f"y {nm:10s} {v:6.0f} -> {fy(v):7.1f}")
