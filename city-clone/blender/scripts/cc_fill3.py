"""Round 43 gap fill (user: "Continue polishing the city in headless blender. Fill out the plain boring gaps").
Exec'd at the end of cc_fill2.py (shares every cc_scene / cc_fill / cc_fill2 global); gap_fill() runs from fill_after before believability(), so the tree clusters and
verge trees keep off everything added here (each feature registers its footprint in FOOT). The gaps were found with .work/empty.py (cells > 18 m from anything).
Every feature is one Builder in local coordinates (front / centre field = +y unless noted), placed with a rotation; colliders are mapped through the same frame."""
R3 = random.Random(43); NF = [0]
TURF_A, TURF_B = flat("#4f9e45"), flat("#5aad4e"); SKIN = flat("#b9875a"); CHALK = flat("#f2f0e8"); CHAIN = flat("#3b4a40"); ALU = flat("#b9bdc4"); YEL3 = flat("#e8b21c")
WOOD = flat("#8a5a34"); WHITE3 = flat("#f4f2ea"); ASPH = m["asphalt"]; PAVE = flat("#cfc6b4"); GRAVEL = flat("#a89c86"); LAMP3 = M("stad_lamp", "#fff6d8", emit=.6)
WATER3 = M("fountain_water", "#e4f4ff", rough=.1)

class TB:
    """Builder-like adapter that drops every primitive into the 128 m tile under it (optionally offset), so big unrotated features cull and quantize well."""
    def __init__(s, T, ox=0.0, oy=0.0): s.T, s.ox, s.oy = T, ox, oy
    def _b(s, x, y): k = s.T._k([(x, y)]); return s.T.b.setdefault(k, Builder(f"{s.T.name}_{k[0]}_{k[1]}"))
    def poly(s, mt, pts3):
        P_ = [(p[0] + s.ox, p[1] + s.oy, p[2]) for p in pts3]; return s._b(sum(p[0] for p in P_) / len(P_), sum(p[1] for p in P_) / len(P_)).poly(mt, P_)
    def box(s, mt, x0, x1, y0, y1, z0, z1): return s._b((x0 + x1) / 2 + s.ox, (y0 + y1) / 2 + s.oy).box(mt, x0 + s.ox, x1 + s.ox, y0 + s.oy, y1 + s.oy, z0, z1)
    def prism(s, mt, b_, t_, z0, z1, mat_fn=None):
        o = (s.ox, s.ox, s.oy, s.oy); b2 = tuple(a + c for a, c in zip(b_, o)); t2 = tuple(a + c for a, c in zip(t_, o))
        return s._b((b2[0] + b2[1]) / 2, (b2[2] + b2[3]) / 2).prism(mt, b2, t2, z0, z1, mat_fn)
    def cyl(s, mt, center, *a, **k): c = (center[0] + s.ox, center[1] + s.oy, center[2]); return s._b(c[0], c[1]).cyl(mt, c, *a, **k)
T43 = Tiled("gap43")
def frame(cx, cy, ang):
    a = math.radians(ang); ca, sa = math.cos(a), math.sin(a)
    return lambda u, v: (cx + u * ca - v * sa, cy + u * sa + v * ca)
def uname(k): NF[0] += 1; return f"g43_{k}_{NF[0]}"
def bpoly(b, mt, pts, z):
    """Flat face at height z; winding fixed so it faces up (the builders here are built with recalc=False)."""
    a = sum(pts[i][0] * pts[(i + 1) % len(pts)][1] - pts[(i + 1) % len(pts)][0] * pts[i][1] for i in range(len(pts)))
    b.poly(mt, [(x, y, z) for x, y in (pts if a > 0 else pts[::-1])])
def bseg(b, mt, p, q, t, z0, z1):
    """Oriented box from p to q (local coords), thickness t."""
    dx, dy = q[0] - p[0], q[1] - p[1]; L = math.hypot(dx, dy) or 1; nx, ny = -dy / L * t / 2, dx / L * t / 2
    c = [(p[0] - nx, p[1] - ny), (q[0] - nx, q[1] - ny), (q[0] + nx, q[1] + ny), (p[0] + nx, p[1] + ny)]
    b.poly(mt, [(x, y, z1) for x, y in c])
    for i in range(4): a_, b_ = c[i], c[(i + 1) % 4]; b.poly(mt, [(a_[0], a_[1], z0), (b_[0], b_[1], z0), (b_[0], b_[1], z1), (a_[0], a_[1], z1)])
def bdisc(b, mt, x, y, rx, ry, z, n=20):
    bpoly(b, mt, [(x + rx * math.cos(2 * math.pi * i / n), y + ry * math.sin(2 * math.pi * i / n)) for i in range(n)], z)
def bring(b, mt, x, y, rx, ry, w, z, n=48, a0=0.0, a1=2 * math.pi, z1=None):
    """Elliptic ribbon (path / track), quads only; z1 given = a fence (vertical band) instead of a flat ribbon."""
    for i in range(n):
        t0, t1 = a0 + (a1 - a0) * i / n, a0 + (a1 - a0) * (i + 1) / n
        p0, p1 = (x + rx * math.cos(t0), y + ry * math.sin(t0)), (x + rx * math.cos(t1), y + ry * math.sin(t1))
        if z1 is None:
            q0, q1 = (x + (rx - w) * math.cos(t0), y + (ry - w) * math.sin(t0)), (x + (rx - w) * math.cos(t1), y + (ry - w) * math.sin(t1)); bpoly(b, mt, [q0, p0, p1, q1], z)
        else: bseg(b, mt, p0, p1, w, z, z1)
def bpath(b, mt, pts, w, z):
    for p, q in zip(pts, pts[1:]): bseg(b, mt, p, q, w, z - .01, z)
    for p in pts[1:-1]: bdisc(b, mt, p[0], p[1], w / 2, w / 2, z, 10)
def wbox(f, ang, u, v, w, d, rz=0.0, **kw): x, y = f(u, v); cbox(x, y, w, d, ang + rz, **kw)
def wcir(f, u, v, r): x, y = f(u, v); ccir(x, y, r)
def ffoot(f, u0, u1, v0, v1):
    c = [f(u, v) for u in (u0, u1) for v in (v0, v1)]; FOOT.append((min(p[0] for p in c), min(p[1] for p in c), max(p[0] for p in c), max(p[1] for p in c)))
def put(b, cx, cy, ang):
    if isinstance(b, TB): return None                                                          # tiled: built once at the end of gap_fill
    o = b.build(vc=True, recalc=False); place(o, cx, cy, rz=ang); return o
def clear_ok(x0, y0, x1, y1, label, pad=1.5):
    ok = rect_clear(x0, y0, x1, y1, pad, foot=False) and not any(hnear(x0 + (x1 - x0) * i / 5, y0 + (y1 - y0) * j / 5, 8) for i in range(6) for j in range(6))
    if not ok: print("  gap43: road/water/house inside", label, (x0, y0, x1, y1))
    return ok

# ------------------------------------------------------------------ kit pieces (local coordinates) ------------------------------------------------------------------
def bleachers(b, x0, x1, y0, rows=5, dirn=1, dd=.75, dh=.42):
    """Aluminium stands along x, rising away from the field in direction dirn (+1 = toward +y)."""
    for k in range(rows):
        ya, yb = y0 + dirn * k * dd, y0 + dirn * (k + 1) * dd; b.box(ALU, x0, x1, min(ya, yb), max(ya, yb), 0, .5 + k * dh)
    yb = y0 + dirn * rows * dd; b.box(ALU, x0, x1, min(yb, yb + dirn * .1), max(yb, yb + dirn * .1), 0, .5 + rows * dh + 1.0)
def light_tower(b, x, y, h=22.0, face=0.0):
    """Stadium light: steel pole + a lamp bank turned toward the field (face = direction in degrees the bank looks)."""
    b.box(ALU, x - .22, x + .22, y - .22, y + .22, 0, h); a = math.radians(face); ux, uy = -math.sin(a), math.cos(a)
    cx, cy = x + math.cos(a) * .4, y + math.sin(a) * .4; bseg(b, flat("#3a3d42"), (cx - ux * 2.2, cy - uy * 2.2), (cx + ux * 2.2, cy + uy * 2.2), .5, h - 1.4, h + 1.0)
    bseg(b, LAMP3, (cx + math.cos(a) * .28 - ux * 2.0, cy + math.sin(a) * .28 - uy * 2.0), (cx + math.cos(a) * .28 + ux * 2.0, cy + math.sin(a) * .28 + uy * 2.0), .06, h - 1.2, h + .8)
def diamond(cx, cy, ang, R=62.0, lights=False, key=None):
    """Ball field: home plate at (cx, cy), centre field toward ang (+y local). Striped outfield, skinned infield, bases, mound, foul lines,
    outfield fence with foul poles, backstop, two dugouts, bleachers. R = fence distance."""
    f = frame(cx, cy, ang); b = Builder(uname("diamond")); D = 27.4 * min(1.0, R / 85.0); A = [(-math.pi / 4 + math.pi / 2 * i / 14) for i in range(15)]
    for i in range(7):                                                                          # outfield mowing bands
        r0, r1 = R * i / 7, R * (i + 1) / 7
        for t0, t1 in zip(A, A[1:]): bpoly(b, TURF_A if i % 2 else TURF_B, [(r0 * math.sin(t0), r0 * math.cos(t0)), (r1 * math.sin(t0), r1 * math.cos(t0)), (r1 * math.sin(t1), r1 * math.cos(t1)), (r0 * math.sin(t1), r0 * math.cos(t1))] if i else [(0, 0), (r1 * math.sin(t0), r1 * math.cos(t0)), (r1 * math.sin(t1), r1 * math.cos(t1))], .03)
    rs = D * 1.5
    for t0, t1 in zip(A, A[1:]): bpoly(b, SKIN, [(0, 0), (rs * math.sin(t0), rs * math.cos(t0)), (rs * math.sin(t1), rs * math.cos(t1))], .04)
    bdisc(b, SKIN, 0, 0, D * .2, D * .2, .041, 14)
    k = .707 * D; bpoly(b, TURF_B, [(0, .2 * k), (.78 * k, k), (0, 1.8 * k), (-.78 * k, k)], .046)    # infield grass
    bdisc(b, SKIN, 0, .95 * k, D * .1, D * .1, .05, 12)
    for (bx, by) in ((k, k), (0, 2 * k), (-k, k), (0, 0)): b.box(CHALK, bx - .25, bx + .25, by - .25, by + .25, .05, .1)
    for s in (-1, 1): bseg(b, CHALK, (0, 0), (s * .707 * R, .707 * R), .12, .046, .052)
    for t0, t1 in zip(A, A[1:]):                                                               # outfield fence + yellow cap
        p, q = (R * math.sin(t0), R * math.cos(t0)), (R * math.sin(t1), R * math.cos(t1)); bseg(b, CHAIN, p, q, .1, 0, 2.3); bseg(b, YEL3, p, q, .16, 2.3, 2.45)
    for s in (-1, 1): b.box(YEL3, s * .707 * R - .15, s * .707 * R + .15, .707 * R - .15, .707 * R + .15, 0, 9.0); wcir(f, s * .707 * R, .707 * R, .25)
    B2 = [(math.pi * .72 + math.pi * .56 * i / 8) for i in range(9)]                            # backstop arc behind home
    for t0, t1 in zip(B2, B2[1:]): bseg(b, CHAIN, (6.5 * math.sin(t0), 6.5 * math.cos(t0)), (6.5 * math.sin(t1), 6.5 * math.cos(t1)), .1, 0, 6.0)
    wbox(f, ang, 0, -6.6, 8.0, .5)
    for s in (-1, 1):                                                                           # dugouts + bleachers outside each foul line
        ux, uy = s * .707, .707; ox, oy = s * .707, -.707; c0 = (ux * 12 + ox * 4.5, uy * 12 + oy * 4.5)
        p, q = (c0[0] - ux * 4.5, c0[1] - uy * 4.5), (c0[0] + ux * 4.5, c0[1] + uy * 4.5); bseg(b, flat("#5a5f66"), p, q, 2.4, 0, 1.1)
        bseg(b, flat("#2f5f9a"), (p[0] + ox * .3, p[1] + oy * .3), (q[0] + ox * .3, q[1] + oy * .3), 3.0, 2.2, 2.4)
        for e in (p, q): bseg(b, ALU, (e[0] - ox * 1.3, e[1] - oy * 1.3), (e[0] - ox * 1.1, e[1] - oy * 1.1), .2, 0, 2.2)
        wbox(f, ang, c0[0], c0[1], 2.6, 9.0, rz=-45 * s)
        c1 = (ux * 24 + ox * 9, uy * 24 + oy * 9)
        for r_ in range(4):
            cc_ = (c1[0] + ox * r_ * .8, c1[1] + oy * r_ * .8); bseg(b, ALU, (cc_[0] - ux * 5, cc_[1] - uy * 5), (cc_[0] + ux * 5, cc_[1] + uy * 5), .8, 0, .5 + r_ * .42)
        wbox(f, ang, c1[0] + ox * 1.2, c1[1] + oy * 1.2, 3.4, 10.0, rz=-45 * s)
    if lights:
        for (u, v) in ((-.75 * R, .45 * R), (.75 * R, .45 * R), (-.3 * R, -4), (.3 * R, -4)):
            light_tower(b, u, v, 20.0, math.degrees(math.atan2(.5 * R - v, -u)) - 90); wcir(f, u, v, .35)
    if key:                                                                                     # scoreboard behind centre field
        sx, sy = 0, R + 4; b.box(ALU, sx - 3.2, sx - 2.9, sy - .15, sy + .15, 0, 7); b.box(ALU, sx + 2.9, sx + 3.2, sy - .15, sy + .15, 0, 7)
        b.box(flat("#1d2a22"), sx - 4.2, sx + 4.2, sy - .25, sy + .25, 4.0, 7.6); b.box(sgn(key), sx - 4.0, sx + 4.0, sy - .32, sy - .25, 6.5, 7.4); b.box(flat("#f2c030"), sx - 3.4, sx + 3.4, sy - .3, sy - .26, 4.6, 5.0)
        wcir(f, sx - 3, sy, .3); wcir(f, sx + 3, sy, .3)
    put(b, cx, cy, ang); ffoot(f, -.72 * R, .72 * R, -8, R + 2)
def soccer(cx, cy, ang, w=46.0, d=80.0, stands=True):
    """Soccer field, long axis = local y: mowing bands, lines, centre circle, boxes, white goals, a small stand on the +x side."""
    f = frame(cx, cy, ang); b = Builder(uname("soccer")); n = 10; hw, hd = w / 2, d / 2
    for i in range(n): b.box(TURF_A if i % 2 else TURF_B, -hw, hw, -hd + d * i / n, -hd + d * (i + 1) / n, .03, .04)
    for (x0, x1, y0, y1) in ((-hw, hw, -hd, -hd + .12), (-hw, hw, hd - .12, hd), (-hw, -hw + .12, -hd, hd), (hw - .12, hw, -hd, hd), (-hw, hw, -.06, .06)): b.box(CHALK, x0, x1, y0, y1, .04, .046)
    bring(b, CHALK, 0, 0, 7.5, 7.5, .12, .046, 32)
    for s in (-1, 1):
        yb = s * hd; yi = s * (hd - 14)
        for (x0, x1, y0, y1) in ((-16, -15.88, min(yb, yi), max(yb, yi)), (15.88, 16, min(yb, yi), max(yb, yi)), (-16, 16, yi - .06, yi + .06)): b.box(CHALK, x0, x1, y0, y1, .04, .046)
        yg = s * (hd + .1)
        for gx in (-3.66, 3.66): b.box(WHITE3, gx - .07, gx + .07, yg - .07, yg + .07, 0, 2.44)
        b.box(WHITE3, -3.73, 3.73, yg - .07, yg + .07, 2.37, 2.51); b.box(flat("#d8dcdf"), -3.66, 3.66, yg + s * 1.5 - .04, yg + s * 1.5 + .04, 0, .9)
    if stands:
        for k in range(4): b.box(ALU, hw + 3 + k * .75, hw + 3.75 + k * .75, -10, 10, 0, .5 + k * .42)
        wbox(f, ang, hw + 4.5, 0, 3.0, 20.0)
    put(b, cx, cy, ang); ffoot(f, -hw - 2, hw + 7, -hd - 2, hd + 2)
def surface_lot(x0, x1, y0, y1, p_full=.35, drive=None, name="lot43"):
    """Small parking lot (rows along x): asphalt, stall lines, static parked cars, end islands with palms; drive = (x0, x1, y0, y1) asphalt link to a road."""
    RB.box(ASPH, x0, x1, y0, y1, 0, .028); FOOT.append((x0, y0, x1, y1)); MAP.append([round(x0, 1), round(y0, 1), round(x1, 1), round(y1, 1), "#5a5c60"])
    if drive: RB.box(ASPH, drive[0], drive[1], drive[2], drive[3], 0, .027); FOOT.append((drive[0], drive[2], drive[1], drive[3]))
    a = y0 + 6.6; row = 0
    while a + 5.2 <= y1 - .5:
        for s in range(int(x0 + 4), int(x1 - 6), 3):
            RB.box(m["white"], s - .05, s + .05, a, a + 5.2, .028, .034); cx_, cy_ = s + 1.5, a + 2.6
            if not on_cut(cx_, cy_, 4) and R3.random() < p_full:
                c_ = CARCOL[R3.randrange(len(CARCOL))]; o_ = linked(f"dcar_{c_[1:]}", lambda nm, c_=c_: display_car(nm, c_)); rz_ = 0 if row % 2 else 180
                place(o_, cx_, cy_, rz=rz_ + R3.uniform(-4, 4)); cbox(cx_, cy_, 1.9, 4.5, rz_)
        a += 5.2 if row % 2 == 0 else 5.2 + 6.6; row += 1
    for ex in (x0 + 1.6, x1 - 1.6):
        BB.box(flat("#5d9a3a"), ex - 1.4, ex + 1.4, y0 + 6, y1 - 1, 0, .16); prop("palm_medium", ex, (y0 + y1) / 2)
def chainlink(b, pts, h=2.0, screen=None):
    for p, q in zip(pts, pts[1:]):
        bseg(b, screen or CHAIN, p, q, .06, 0, h); L = math.dist(p, q); n = max(1, int(L / 3))
        for i in range(n + 1): t = i / n; x, y = p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t; b.box(ALU, x - .05, x + .05, y - .05, y + .05, 0, h + .1)
def picnic_shelter(b, x, y, w=10.0, d=7.0, roof="#2f6a8a"):
    for sx in (-1, 1):
        for sy in (-1, 1): b.box(WHITE3, x + sx * (w / 2 - .4) - .15, x + sx * (w / 2 - .4) + .15, y + sy * (d / 2 - .4) - .15, y + sy * (d / 2 - .4) + .15, 0, 2.8)
    b.box(PAVE, x - w / 2, x + w / 2, y - d / 2, y + d / 2, 0, .12); b.prism(flat(roof), (x - w / 2 - .6, x + w / 2 + .6, y - d / 2 - .6, y + d / 2 + .6), (x - w / 2 + 1.5, x + w / 2 - 1.5, y - .2, y + .2), 2.8, 4.3)
    for k in (-1, 0, 1): b.box(WOOD, x + k * 3 - .8, x + k * 3 + .8, y - .45, y + .45, .74, .82); b.box(WOOD, x + k * 3 - .8, x + k * 3 + .8, y - 1.0, y - .7, .42, .48); b.box(WOOD, x + k * 3 - .8, x + k * 3 + .8, y + .7, y + 1.0, .42, .48)
def bench(b, x, y, along_x=True):
    lx, ly = (.9, .22) if along_x else (.22, .9); b.box(WOOD, x - lx, x + lx, y - ly, y + ly, .42, .5); b.box(flat("#3a3d42"), x - lx * .8, x + lx * .8, y - ly * .8, y + ly * .8, 0, .42)
def restroom(b, x, y, w=10.0, d=6.0):
    b.box(flat("#d9c9a8"), x - w / 2, x + w / 2, y - d / 2, y + d / 2, 0, 3.2); b.prism(flat("#7a5a44"), (x - w / 2 - .5, x + w / 2 + .5, y - d / 2 - .5, y + d / 2 + .5), (x - w / 2 + 1, x + w / 2 - 1, y - .2, y + .2), 3.2, 4.4)
    for sx in (-2.2, 2.2): b.box(flat("#5a3a22"), x + sx - .5, x + sx + .5, y - d / 2 - .06, y - d / 2, 0, 2.2)
def fountain_jet(b, x, y, h=4.5):
    b.prism(WATER3, (x - .9, x + .9, y - .9, y + .9), (x - .08, x + .08, y - .08, y + .08), .02, h); bdisc(b, flat("#cfe8f4"), x, y, 4.5, 4.5, .06, 16)
def golf_cart(name):
    b = Builder(name); b.box(WHITE3, -.65, .65, -1.25, 1.25, .3, .95); b.box(flat("#2e3236"), -.62, .62, -.3, .5, .95, 1.1)
    for sx in (-.55, .55):
        for sy in (-1.1, 1.1): b.box(ALU, sx - .03, sx + .03, sy * .9 - .03, sy * .9 + .03, .95, 1.9)
    b.box(WHITE3, -.7, .7, -1.2, 1.2, 1.9, 1.98)
    for sx in (-.6, .6):
        for sy in (-.85, .85): b.cyl(flat("#1e2328"), (sx, sy, .25), .25, .18, "x", 8)
    return b.build(vc=True)

# ------------------------------------------------------------------ the fills ------------------------------------------------------------------
def hs_athletics():
    """Coconut Creek High: the bare grass round the track gets home + visitor stands (aisles left for Aaron's A5 run), press box, four light towers,
    scoreboard, concession stand, a baseball and a softball diamond, four tennis courts."""
    f = frame(200, 130, 0); b = TB(T43, 200, 130)
    for (x0, x1) in ((-70, -2), (26, 75)): bleachers(b, x0, x1, 45.5, 9, 1); wbox(f, 0, (x0 + x1) / 2, 49, x1 - x0, 7.5)
    for (x0, x1) in ((-60, 2), (28, 62)): bleachers(b, x0, x1, -45.5, 6, -1); wbox(f, 0, (x0 + x1) / 2, -48, x1 - x0, 5)
    b.box(flat("#e8e2d2"), -46, -24, 49, 53.5, 4.2, 7.6); b.box(GL, -45, -25, 48.92, 49.0, 5.2, 7.0); b.box(flat("#7a1f1f"), -46.4, -23.6, 48.6, 53.9, 7.6, 8.0)
    b.box(sgn("cchs"), -42, -28, 48.5, 48.6, 8.0, 9.6)
    for (u, v) in ((-84, 48), (84, 48), (-84, -48), (84, -48)): light_tower(b, u, v, 24.0, math.degrees(math.atan2(-v, -u)) - 90); wcir(f, u, v, .4)
    sb = Builder(uname("hs_scoreboard")); sb.box(ALU, -5, -4.6, -.15, .15, 0, 8); sb.box(ALU, 4.6, 5, -.15, .15, 0, 8)
    sb.box(flat("#1d2a22"), -7, 7, -.3, .3, 5, 10.5); sb.box(sgn("cchs"), -6.6, 6.6, -.38, -.3, 9.0, 10.2); sb.box(flat("#f2c030"), -5, 5, -.36, -.3, 5.8, 6.6)
    put(sb, 98, 130, 90); ccir(98, 125.2, .3); ccir(98, 134.8, .3)
    restroom(b, 42, 72, 12, 7); wbox(f, 0, 42, 72, 12, 7)
    put(b, 200, 130, 0); FOOT.append((115, 80, 285, 185))
    diamond(292, 42, -45, 78, lights=True, key="cchs"); diamond(47, 42, -45, 58)
    if clear_ok(292, 168, 396, 228, "hs bus lot"):                                              # bus lot: two rows of yellow school buses
        RB.box(ASPH, 292, 396, 168, 228, 0, .028); RB.box(ASPH, 396, 402, 192, 204, 0, .027); FOOT.append((290, 166, 398, 230)); MAP.append([292, 168, 396, 228, "#5a5c60"])
        for row, (yy, rz) in enumerate(((182, 0), (214, 180))):
            for i in range(11):
                x = 298 + i * 8.6
                RB.box(m["white"], x - 4.3 - .05, x - 4.3 + .05, yy - 6, yy + 6, .028, .034)
                if R3.random() < .85: o = linked("school_bus", lambda nm: CV.make_bus(nm)); place(o, x, yy, rz=rz); cbox(x, yy, 2.6, 10, rz)
    t = Builder(uname("hs_tennis")); cm = CV.civic_mats(); nop = lambda *a, **k: None
    for i in range(4): CV.tennis_court(t, cm, nop, 55 + i * 16, 202)
    STATIC.append(t.build(vc=True)); FOOT.append((46, 186, 112, 218))

def golf():
    """Wynmoor golf course: striped fairways, flags on the greens, more sand traps, a cart path round the course, golf carts, a pond hole at the west end."""
    b = TB(T43, 470, 360); FW, FW2 = flat("#9ad86a"), flat("#8dcf5d")
    def fairway(x, y, rx, ry, ang, n=6):
        a = math.radians(ang); ca, sa = math.cos(a), math.sin(a)
        for i in range(n):
            u0, u1 = -rx + 2 * rx * i / n, -rx + 2 * rx * (i + 1) / n; us = [u0 + (u1 - u0) * j / 4 for j in range(5)]
            top = [(u, ry * math.sqrt(max(0, 1 - (u / rx) ** 2))) for u in us]; pts = [(u, -v) for u, v in top] + [(u, v) for u, v in top[::-1]]
            bpoly(b, FW if i % 2 else FW2, [(x + u * ca - v * sa - 470, y + u * sa + v * ca - 360) for u, v in pts], .055)
    for (x, y, rx, ry, a_) in ((140, 418, 80, 16, -4), (292, 362, 46, 15, 80), (650, 360, 46, 15, 100), (470, 420, 90, 9, 0), (470, 293, 85, 10, 0), (200, 300, 28, 9, 0)): fairway(x, y, rx, ry, a_)
    GR = flat("#9fd36b"); SAND = flat("#e8d9a8")
    for (x, y, r) in ((228, 420, 12), (60, 300, 10), (670, 318, 11)): bdisc(b, GR, x - 470, y - 360, r, r * .75, .06, 16)
    for (x, y, rx, ry) in ((212, 432, 6, 3.5), (240, 408, 5, 3), (330, 352, 5, 3), (600, 410, 6, 3.5), (682, 305, 5, 3), (455, 431, 6, 2.5), (62, 286, 5, 3), (520, 300, 6, 3)): bdisc(b, SAND, x - 470, y - 360, rx, ry, .07, 14)
    for (x, y) in ((330, 330), (610, 395), (470, 300), (560, 318), (228, 420), (60, 300), (670, 318)):
        b.box(WHITE3, x - 470 - .04, x - 470 + .04, y - 360 - .04, y - 360 + .04, 0, 2.4); b.box(flat("#d6332a"), x - 470 + .04, x - 470 + .9, y - 360 - .02, y - 360 + .02, 1.85, 2.35)
    bring(b, flat("#d8d0bc"), 0, 0, 212, 74, 2.4, .05, 72)
    put(b, 470, 360, 0)
    for i in range(7):
        t_ = 2 * math.pi * (i + .3) / 7; x, y = 470 + 211 * math.cos(t_), 360 + 73 * math.sin(t_)
        if on_cut(x, y, 4): continue
        o = linked("golf_cart", golf_cart); place(o, x, y, rz=math.degrees(t_) + R3.choice((0, 180))); cbox(x, y, 1.4, 2.6, math.degrees(t_))
    for (x, y, rx, ry, a_) in ((140, 418, 80, 16, -4), (470, 420, 90, 9, 0)):                 # palms lining the long fairways
        for s in range(-int(rx), int(rx), 22):
            for side in (1, -1):
                px_, py_ = x + s, y + side * (ry + 7) + R3.uniform(-2, 2)
                if not near_road(px_, py_, 4) and not in_water(px_, py_, 3) and not hnear(px_, py_, 9): prop(R3.choice(["palm_tall", "palm_medium", "oak"]), px_, py_)

def golf_trees():
    """Trees in the rough between the golf holes (inside the ring, off the lake, fairways, greens and the cart path); a few on the west holes too."""
    FWS = [(140, 418, 80, 16, -4), (292, 362, 46, 15, 80), (650, 360, 46, 15, 100), (470, 420, 90, 9, 0), (470, 293, 85, 10, 0), (200, 300, 28, 9, 0)]
    def on_fw(x, y):
        for (fx, fy, rx, ry, a_) in FWS:
            a = math.radians(a_); u = (x - fx) * math.cos(a) + (y - fy) * math.sin(a); v = -(x - fx) * math.sin(a) + (y - fy) * math.cos(a)
            if (u / (rx + 6)) ** 2 + (v / (ry + 6)) ** 2 < 1: return True
        return False
    GRN = [(330, 330), (610, 395), (470, 300), (560, 318), (228, 420), (60, 300), (670, 318)]; n = 0
    for _ in range(400):
        x, y = R3.uniform(45, 780), R3.uniform(268, 458)
        e = ((x - 470) / 212) ** 2 + ((y - 360) / 74) ** 2
        if .82 < e < 1.25 or in_water(x, y, 7) or on_fw(x, y) or near_road(x, y, 6) or hnear(x, y, 10) or on_cut(x, y, 6) or any(math.hypot(x - gx, y - gy) < 18 for gx, gy in GRN): continue
        if any(f_[0] - 3 < x < f_[2] + 3 and f_[1] - 3 < y < f_[3] + 3 for f_ in FOOT): continue
        if abs(x - 300) < 28 and abs(y - 420) < 18: continue                                        # clubhouse
        for j in range(R3.randint(1, 3)): prop(R3.choice(["palm_tall", "palm_tall", "oak", "palm_medium"]), x + R3.uniform(-4, 4), y + R3.uniform(-4, 4))
        n += 1
        if n >= 70: break
    print("golf tree clumps", n)
def construction():
    """Construction site: a 5-storey concrete frame going up, tower crane, excavator, dirt piles, site office trailer, porta-potties, dumpsters, material stacks,
    green-screened fence (gaps left where the jump (600, 1760) and the pursuit breaker (510, 1725) cross it)."""
    CON = flat("#bdbab2"); CON2 = flat("#a29f97"); RB_ = flat("#5a4a3a")
    b = Builder(uname("site_frame")); W, D = 44, 26
    for lv in range(5):
        z = .2 + lv * 3.4; half = lv == 4
        b.box(CON, -W / 2, (0 if half else W / 2), -D / 2, D / 2, z, z + .32)
        if lv < 4:
            for i in range(9):
                for j in range(5):
                    x, y = -W / 2 + .4 + i * (W - .8) / 8, -D / 2 + .4 + j * (D - .8) / 4
                    if lv == 3 and x > 0 and (i + j) % 2: continue
                    b.box(CON2, x - .3, x + .3, y - .3, y + .3, z + .32, z + 3.4)
        if lv < 2: b.box(flat("#9a958c"), -W / 2, W / 2, D / 2 - .3, D / 2, z + .32, z + 3.4); b.box(flat("#9a958c"), -W / 2, -W / 2 + .3, -D / 2, D / 2, z + .32, z + 3.4)
    for i in range(5):
        for j in range(5):
            x, y = .4 + i * (W / 2 - .8) / 4, -D / 2 + .4 + j * (D - .8) / 4
            if (i + j) % 2 == 0: b.box(RB_, x - .04, x + .04, y - .04, y + .04, 13.8, 15.4)
    b.box(CON, -W / 2 + 2, -W / 2 + 8, -3, 3, 0, 18.5)
    b.box(flat("#f07a1c"), -W / 2 - .3, -W / 2 - .2, -D / 2, D / 2, 7.0, 13.6); b.box(flat("#f07a1c"), -W / 2, W / 2, -D / 2 - .3, -D / 2 - .2, 10.4, 13.6)
    put(b, 705, 1725, 0); cbox(705, 1725, W, D); FOOT.append((683, 1712, 727, 1738))
    c = Builder(uname("crane")); H = 40.0                                                        # tower crane, jib along local +x
    c.box(CON, -3, 3, -3, 3, 0, .6)
    for k in range(int(H / 3)): c.box(YEL3, -1, 1, -1, 1, .6 + k * 3, .6 + k * 3 + 2.6); c.box(flat("#3a3d42"), -1.05, 1.05, -1.05, 1.05, .6 + k * 3 + 2.6, .6 + k * 3 + 3)
    c.box(flat("#3a3d42"), -1.4, 1.4, -1.4, 1.4, H, H + 1.2); c.box(GL, .6, 2.4, -1.4, 1.4, H - 2.4, H); c.box(YEL3, .6, 2.4, -1.45, 1.45, H, H + .2)
    c.box(YEL3, -.7, 52, -.7, .7, H + 1.2, H + 2.6); c.box(YEL3, -16, -.7, -.9, .9, H + 1.2, H + 2.4); c.box(CON, -15, -10, -1.4, 1.4, H - .8, H + 1.2)
    c.prism(YEL3, (-1, 1, -1, 1), (-.2, .2, -.2, .2), H + 2.6, H + 9)
    for (x2, z2) in ((50, H + 2.6), (-15, H + 2.4)):
        n_ = 12
        for i in range(n_): t0, t1 = i / n_, (i + 1) / n_; c.box(flat("#3a3d42"), min(x2 * t0, x2 * t1), max(x2 * t0, x2 * t1), -.05, .05, H + 9 + (z2 - H - 9) * t1 - .05, H + 9 + (z2 - H - 9) * t0 + .05)
    c.box(flat("#3a3d42"), 33.95, 34.05, -.05, .05, 12, H + 1.2); c.box(WOOD, 32.5, 35.5, -1.2, 1.2, 10.8, 12)
    put(c, 655, 1748, -25); ccir(655, 1748, 2.2)
    e = Builder(uname("excavator"))
    for sx in (-1.2, 1.2): e.box(flat("#2e3236"), sx - .4, sx + .4, -2.3, 2.3, 0, .9)
    e.box(YEL3, -1.4, 1.4, -1.6, 1.8, .9, 2.2); e.box(GL, -1.35, -.1, -1.65, -.2, 2.2, 3.4); e.box(YEL3, -1.4, -.05, -1.7, -.15, 3.4, 3.5); e.box(flat("#3a3d42"), -.8, .8, 1.0, 1.8, 2.2, 2.9)
    e.prism(YEL3, (.1, .9, -1.6, -1.0), (.2, .8, -5.0, -4.4), 2.0, 4.6); e.prism(YEL3, (.2, .8, -5.0, -4.4), (.25, .75, -6.6, -6.1), 4.6, 1.2)
    e.box(flat("#2e3236"), -.1, 1.1, -7.4, -6.2, .2, 1.3)
    put(e, 580, 1712, 30); cbox(580, 1712, 3.2, 6, 30)
    d = TB(T43); DIRT_ = flat("#8f7350"); DIRT2 = flat("#a5875e")
    for (x, y, w, dd, h) in ((520, 1752, 16, 11, 3.8), (548, 1776, 11, 8, 2.6), (760, 1672, 14, 10, 3.2)): d.prism(DIRT_ if h > 3 else DIRT2, (x - w / 2, x + w / 2, y - dd / 2, y + dd / 2), (x - w * .15, x + w * .15, y - dd * .12, y + dd * .12), 0, h); cbox(x, y, w * .7, dd * .7, soft="bush")
    for i in range(3): d.box(flat("#2a64b8"), 492 + i * 1.6, 493.3 + i * 1.6, 1663, 1664.3, 0, 2.3); d.box(WHITE3, 492 + i * 1.6, 493.3 + i * 1.6, 1663, 1664.3, 2.3, 2.42)
    cbox(494.5, 1663.6, 5, 1.6)
    d.box(WHITE3, 502, 514, 1660, 1663.6, .6, 3.4); d.box(flat("#3a3d42"), 502, 514, 1660, 1663.6, 0, .6)
    for i in range(4): d.box(GL, 503.5 + i * 2.8, 504.9 + i * 2.8, 1659.94, 1660, 1.6, 2.6)
    d.box(WOOD, 506.5, 508, 1658.4, 1660, 0, .6); cbox(508, 1661.8, 12, 3.6)
    for i, colr in enumerate(("#2f6a4a", "#2a4f8c")): d.box(flat(colr), 628 + i * 8, 634 + i * 8, 1668, 1670.4, 0, 1.5); d.box(flat("#1e2328"), 628.3 + i * 8, 633.7 + i * 8, 1668.3, 1670.1, 1.2, 1.45); cbox(631 + i * 8, 1669.2, 6, 2.4)
    for i in range(6): d.cyl(flat("#6b7078"), (612, 1690 + i * .9, .45 + (i % 2) * .8), .42, 8, "x", 10)
    for i in range(4): d.box(WOOD, 622 + i * 1.6, 623.2 + i * 1.6, 1688, 1689.2, 0, .9 + (i % 2) * .5)
    cbox(612, 1692.5, 8, 6)
    for (x, y, h) in ((598, 1668, .5), (602, 1668, .5)): d.box(flat("#5a4a3a"), x - 1.6, x + 1.6, y - 3, y + 3, 0, h)
    put(d, 0, 0, 0)
    fb = TB(T43); SCR = flat("#2f5a3a")
    for seg in (((472, 1652), (560, 1652)), ((600, 1652), (788, 1652)), ((788, 1652), (788, 1788)), ((788, 1788), (632, 1788)), ((582, 1788), (472, 1788)), ((472, 1788), (472, 1745)), ((472, 1705), (472, 1652))):
        chainlink(fb, list(seg), 2.1, SCR)
    put(fb, 0, 0, 0)
    place(pylon("site_sign", "comingsoon", 6.0, 8.0), 800, 1700, "e")
    fd = TB(T43)                                                                                # phase 2: a poured slab with rebar stubs + formwork, gravel haul road (all low, drivable)
    fd.box(CON, 520, 590, 1696, 1744, 0, .25)
    for i in range(8):
        for j in range(6):
            x, y = 524 + i * 9, 1700 + j * 8.4
            if math.hypot(x - 510, y - 1725) > 14: fd.box(RB_, x - .05, x + .05, y - .05, y + .05, .25, 1.6); fd.box(RB_, x - .35, x + .35, y - .35, y + .35, .25, .3)
    for (x0, x1, y0, y1) in ((520, 590, 1743.6, 1744), (589.6, 590, 1696, 1744)): fd.box(WOOD, x0, x1, y0, y1, 0, .7)
    bpath(fd, GRAVEL, [(580, 1652), (612, 1690), (640, 1700), (680, 1700), (760, 1700), (770, 1760), (640, 1782), (600, 1788)], 6.0, .03)
    for (x, y, r) in ((625, 1730, 70), (760, 1745, 175)): o = DK.truck(uname("dump"), 3); place(o, x, y, rz=r); cbox(x, y, 3, 9, r)
    for i, (x, y, r) in enumerate(((745, 1690, 90), (500, 1715, 0))): o = DK.truck(f"site_truck_{i}", i); place(o, x, y, rz=r); cbox(x, y, 3, 9, r)

def offices_more():
    """Corporate park: a third office building at the west end, a surface lot for the two towers, a paved plaza between them, a retention pond with a fountain."""
    if clear_ok(50, 1398, 150, 1432, "office west"):
        o = bldg("corp_w", 50, 24, 16, wall="#dfe3e6", key="offices", accent="#2a3a4a", floors=4, win_step=2.6); place(o, 100, 1415, "s"); cbox(100, 1415, 50, 24); FOOT.append((75, 1403, 125, 1427))
    if clear_ok(46, 1338, 156, 1392, "office west lot"): surface_lot(46, 156, 1338, 1392, .4, drive=(96, 104, 1318, 1338))
    if clear_ok(578, 1338, 786, 1398, "tower lot"): surface_lot(578, 786, 1338, 1398, .45, drive=(676, 684, 1318, 1338))
    b = Builder(uname("corp_plaza")); b.box(PAVE, -21, 21, -14, 14, 0, .05)
    for (x, y) in ((-14, -8), (14, -8), (-14, 8), (14, 8)): b.box(flat("#5d9a3a"), x - 2.5, x + 2.5, y - 2.5, y + 2.5, .05, .5); b.box(flat("#c9c0ac"), x - 2.7, x + 2.7, y - 2.7, y + 2.7, 0, .45)
    fountain_jet(b, 0, 0, 3.2)
    for x in (-6, 6): bench(b, x, -9); bench(b, x, 9)
    put(b, 685, 1420, 0); FOOT.append((664, 1406, 706, 1434))
    for (x, y) in ((671, 1412), (699, 1412), (671, 1428), (699, 1428)): prop("palm_tall", x, y)
    fj = Builder(uname("corp_fountain")); fountain_jet(fj, 0, 0, 5.5); put(fj, 690, 1492, 0)

def butterfly_garden():
    """Butterfly World's gardens west of the dome (hedge rooms, flower beds, greenhouses, gazebo) + Tradewinds Park stables (red barn, white paddocks, riding ring, hay)."""
    b = Builder(uname("bw_garden")); HEDGE = flat("#3f6f3a"); FL = ["#d63a4a", "#f2a23a", "#f08cb0", "#e8e8f0", "#c84ab8", "#f2d43a"]
    b.box(PAVE, -45, 45, -1.5, 1.5, 0, .05); b.box(PAVE, -1.5, 1.5, -34, 34, 0, .05)
    for qx in (-1, 1):
        for qy in (-1, 1):
            x0, x1 = (3, 43) if qx > 0 else (-43, -3); y0, y1 = (3, 32) if qy > 0 else (-32, -3)
            for (a0, a1, c0, c1) in ((x0, x1, y0, y0 + .9), (x0, x1, y1 - .9, y1), (x0, x0 + .9, y0, y1), (x1 - .9, x1, y0, y1)): b.box(HEDGE, a0, a1, c0, c1, 0, 1.1)
            for i in range(4):
                bx = x0 + 4 + i * (x1 - x0 - 8) / 3.0; b.box(flat(FL[(i + qx + qy * 2) % 6]), bx - 3.5, bx + 3.5, y0 + 4, y1 - 4, 0, .3)
    CV.pavilion(b, CV.civic_mats(), lambda *a, **k: None, lambda *a, **k: None, 0, 0)
    put(b, 420, 640, 0); FOOT.append((375, 606, 465, 674))
    for i, (x, y) in enumerate(((398, 690), (395, 585))):
        if on_cut(x, y, 12): continue
        g = Builder(uname("greenhouse")); g.box(flat("#d8dcdf"), -9, 9, -4.5, 4.5, 0, .4); g.box(GLS, -8.8, 8.8, -4.3, 4.3, .4, 3.2); g.prism(GLS, (-8.8, 8.8, -4.3, 4.3), (-8.8, 8.8, -.2, .2), 3.2, 5.0)
        for k in range(7): g.box(flat("#f2f2ee"), -8.8 + k * 2.93 - .06, -8.8 + k * 2.93 + .06, -4.35, 4.35, .4, 3.25)
        put(g, x, y, 0); cbox(x, y, 18, 9)
    s = Builder(uname("stables")); BARN = flat("#9e3a2a")
    s.box(BARN, -12, 12, -7, 7, 0, 5.5); s.prism(flat("#4a4a4e"), (-12.6, 12.6, -7.6, 7.6), (-12.6, 12.6, -.3, .3), 5.5, 9.0)
    for x in (-6, 0, 6): s.box(WHITE3, x - 1.6, x + 1.6, -7.08, -7, 0, 3.4); s.box(BARN, x - 1.4, x + 1.4, -7.1, -7.05, .1, 3.2)
    s.box(WHITE3, -12.08, 12.08, -7.1, -7.0, 5.3, 5.5)
    put(s, 322, 742, 0); cbox(322, 742, 24, 14); place(pylon("stables_sign", "stables", 4.5, 6.0), 296, 772, "s")
    p = TB(T43)
    def rail(pts):
        for a_, b_ in zip(pts, pts[1:]):
            for z in (.6, 1.2): bseg(p, WHITE3, a_, b_, .08, z, z + .14)
            L = math.dist(a_, b_); n = max(1, int(L / 3))
            for i in range(n + 1): t = i / n; x, y = a_[0] + (b_[0] - a_[0]) * t, a_[1] + (b_[1] - a_[1]) * t; p.box(WHITE3, x - .08, x + .08, y - .08, y + .08, 0, 1.45)
    rail([(286, 666), (372, 666), (372, 726), (286, 726), (286, 666)]); rail([(328, 666), (328, 726)])
    bdisc(p, flat("#c9b48a"), 307, 696, 17, 26, .04, 24); bring(p, WHITE3, 307, 696, 17.4, 26.4, .1, 0, 32, z1=1.2)
    for (x, y) in ((345, 700), (352, 712), (360, 690)): p.cyl(flat("#d8b85a"), (x, y, .65), .65, 1.3, "x", 10)
    put(p, 0, 0, 0); FOOT.append((284, 664, 374, 750))

def skate_dress():
    """Skate park: bowls, a pyramid, ledges, rails, stair set and painted patches on the bare pad (everything low so it stays drivable)."""
    s = TB(T43); C3 = flat("#9c9c9c"); C4 = flat("#b4b4b4"); RAIL = flat("#3a3d42")
    for (x, y, r) in ((360, -375, 11), (440, -428, 9)): bdisc(s, C3, x, y, r, r, .07, 24); bring(s, flat("#d9d9d9"), x, y, r + .6, r + .6, .6, .075, 24)
    s.prism(C4, (428, 456, -398, -370), (438, 446, -388, -380), .06, 1.0)
    for (x0, x1, y) in ((330, 352, -435), (455, 485, -360), (352, 378, -425)): s.box(C4, x0, x1, y - .6, y + .6, .06, .55); s.box(RAIL, x0, x1, y - .05, y + .05, .55, .62)
    for (x0, x1, y) in ((470, 490, -440), (300, 318, -360)): s.box(RAIL, x0, x1, y - .04, y + .04, .45, .52); s.box(RAIL, x0, x0 + .1, y - .04, y + .04, .06, .5); s.box(RAIL, x1 - .1, x1, y - .04, y + .04, .06, .5)
    for k in range(3): s.box(C4, 312 + k * 1.0, 313 + k * 1.0, -446, -434, .06, .2 + k * .18)
    for (x, y, c) in ((345, -440, "#d9452e"), (470, -368, "#2a8fd9"), (420, -445, "#f2c030"), (380, -362, "#8a3ad9")): bdisc(s, flat(c), x, y, 3.5, 2.2, .065, 12)
    for i, (x, y) in enumerate([(x, y) for x in range(312, 496, 22) for y in (-442, -396, -358)]):     # a feature every ~22 m so every screenful of the pad has something
        if 384 < x < 416 and -424 < y < -376 or 320 < x < 334 or 466 < x < 480: continue
        k = i % 5
        if k == 0: s.prism(C4, (x - 4, x + 4, y - 3, y + 3), (x - 4, x + 4, y + 1.6, y + 3), .06, .8)                           # kicker bank
        elif k == 1: s.box(C4, x - 5, x + 5, y - .7, y + .7, .06, .5); s.box(RAIL, x - 5, x + 5, y - .05, y + .05, .5, .56)      # ledge
        elif k == 2: s.box(RAIL, x - 4, x + 4, y - .04, y + .04, .42, .48); [s.box(RAIL, x + e - .05, x + e + .05, y - .04, y + .04, .06, .44) for e in (-3.8, 3.8)]   # flat rail
        elif k == 3: bdisc(s, C3, x, y, 5, 5, .07, 18); bring(s, flat("#d9d9d9"), x, y, 5.5, 5.5, .5, .075, 18)                    # mini bowl
        else: s.box(C4, x - 3, x + 3, y - 3, y + 3, .06, .45); s.prism(C4, (x - 3, x + 3, y + 3, y + 6), (x - 3, x + 3, y + 3, y + 3.1), .06, .45)   # manual pad + bank
        bdisc(s, flat(["#d9452e", "#2a8fd9", "#f2c030", "#8a3ad9", "#2fb36a"][i % 5]), x + 6, y + 4, 1.8, 1.1, .065, 10)
    for (x, y) in ((305, -455), (495, -455), (305, -345), (495, -345)): bench(s, x, y)
def rec_park_more():
    """Rec park: two soccer fields + dog park between the rec centre and the pool, proper ball diamonds at the south end (old flat placeholders removed),
    a lake loop path, a long path along the south edge with benches, a playground + shelter at the west end."""
    if clear_ok(405, -216, 521, -128, "rec soccer"): soccer(432, -172, 0, 44, 80); soccer(492, -172, 0, 44, 80, stands=False)
    d = Builder(uname("dogpark")); chainlink(d, [(-22, -17), (22, -17), (22, 17), (-22, 17), (-22, 4)], 1.5); picnic_shelter(d, 10, 8, 8, 6, "#3d6b45")
    for (x, y) in ((-12, -8), (0, -10), (12, -6)): bench(d, x, y)
    d.box(flat("#c9b48a"), -20, 0, -15, 0, 0, .03)
    put(d, 330, -186, 0); FOOT.append((306, -205, 354, -167)); HYDRANTS.append((318, -180))
    diamond(575, -497, -45, 62); diamond(765, -497, 45, 62)
    c = Builder(uname("rec_conc")); restroom(c, 0, 0, 12, 7); bleachers(c, -8, 8, 7, 4, 1); put(c, 670, -488, 0); cbox(670, -488, 12, 7); FOOT.append((660, -495, 680, -478))
    p = TB(T43); PT = flat("#d8d0bc")
    bring(p, PT, 420, -270, 92, 48, 2.2, .05, 48)
    bpath(p, PT, [(60, -500), (290, -500), (300, -470), (535, -470)], 2.2, .05)
    for (x, y) in ((140, -497), (230, -497), (360, -467), (460, -467), (420, -217), (340, -270), (500, -270)): bench(p, x, y)
    picnic_shelter(p, 70, -330, 10, 7); CV.playground(p, CV.civic_mats(), lambda *a, **k: None, lambda *a, **k: None, 70, -305, 12, 10)
    put(p, 0, 0, 0)

def sabal_more():
    """Sabal Pines: a real ball diamond (the flat dirt placeholder is gone), restrooms, a dog run, a lot off Powerline, a path linking it all."""
    diamond(548, 1282, -135, 60)
    s = TB(T43); restroom(s, 690, 1268, 10, 6); chainlink(s, [(742, 1168), (782, 1168), (782, 1204), (742, 1204), (742, 1180)], 1.5)
    bpath(s, flat("#d8d0bc"), [(610, 1118), (650, 1180), (700, 1218), (760, 1228)], 2.2, .05)
    for (x, y) in ((610, 1158), (672, 1199), (735, 1224)): bench(s, x, y)
    put(s, 0, 0, 0); cbox(690, 1268, 10, 6); FOOT.append((740, 1166, 784, 1206))
    if clear_ok(722, 1236, 790, 1290, "sabal lot"): surface_lot(722, 790, 1236, 1290, .3, drive=(790, 812, 1256, 1264))

def lake_parks():
    """Neighbourhood lake behind Dave's street (new plan lake) with a loop path, dock + gazebo, playground; lakeside park south of the big lake (fishing pier,
    shelters, playground, a lot off Lyons)."""
    p = TB(T43, -545, -228); PT = flat("#d8d0bc")
    bring(p, PT, 0, 0, 70, 44, 2.0, .05, 48)
    p.box(WOOD, -1.4, 1.4, 25, 42, .3, .45); p.box(WOOD, -4, 4, 19, 25, .3, .45)
    for (x, y) in ((-1.2, 30), (1.2, 30), (-1.2, 36), (1.2, 36), (-3.6, 20), (3.6, 20), (-3.6, 24.6), (3.6, 24.6)): p.box(WOOD, x - .12, x + .12, y - .12, y + .12, -.4, .3)
    fountain_jet(p, 0, -4, 3.5); CV.playground(p, CV.civic_mats(), lambda *a, **k: None, lambda *a, **k: None, -64, 30, 12, 10); picnic_shelter(p, 62, 30, 9, 6)
    for (x, y) in ((-40, -45), (0, -46), (40, -45), (-72, 0), (72, 0)): bench(p, x, y, abs(x) < 60)
    put(p, -545, -228, 0); FOOT.append((-618, -275, -472, -181))
    q = TB(T43, -140, -300)
    q.box(WOOD, -1.6, 1.6, -76, -48, .35, .5); q.box(WOOD, -7, 7, -50, -46, .35, .5)
    for y in range(-74, -46, 4):
        for x in (-1.4, 1.4): q.box(WOOD, x - .12, x + .12, y - .12, y + .12, -.4, .35)
    bring(q, flat("#d8d0bc"), 0, 0, 108, 84, 2.2, .05, 24, math.pi * 1.12, math.pi * 1.88)
    picnic_shelter(q, -62, -112, 10, 7); picnic_shelter(q, 58, -112, 10, 7); CV.playground(q, CV.civic_mats(), lambda *a, **k: None, lambda *a, **k: None, 0, -128, 14, 12)
    for (x, y) in ((-30, -92), (30, -92), (-80, -80), (80, -80)): bench(q, x, y)
    put(q, -140, -300, 0); FOOT.append((-210, -390, -70, -372)); FOOT.append((-208, -445, -72, -398))
    if clear_ok(-112, -515, -36, -468, "lake lot"): surface_lot(-112, -36, -515, -468, .25, drive=(-36, -12, -494, -486))

def storage():
    """Public Storage on US 441 (east side, south of Dave's street): office, five rows of roll-up-door units on an asphalt pad, iron fence."""
    if not clear_ok(-790, -515, -662, -408, "storage"): return
    RB.box(ASPH, -790, -662, -515, -408, 0, .028); RB.box(ASPH, -812, -790, -446, -434, 0, .027); FOOT.append((-812, -515, -662, -408))
    MAP.append([-790, -515, -662, -408, "#5a5c60"])
    def row(name):
        b = Builder(name); L, D = 80, 8; b.box(flat("#e9e4d8"), -L / 2, L / 2, -D / 2, D / 2, 0, 3.2); b.box(flat("#c9c4b8"), -L / 2 - .3, L / 2 + .3, -D / 2 - .3, D / 2 + .3, 3.2, 3.45)
        x = -L / 2 + 2
        while x < L / 2 - 2:
            for sy in (-1, 1): b.box(flat("#f07a1c"), x - 1.3, x + 1.3, sy * D / 2 - (.06 if sy < 0 else 0), sy * D / 2 + (.06 if sy > 0 else 0), .05, 2.6)
            x += 3.4
        return b.build(vc=True)
    for i, y in enumerate((-424, -444, -464, -484, -504)):
        o = linked("storage_row", row); place(o, -715, y, "s"); cbox(-715, y, 80, 8)
    o = bldg("storage_office", 14, 10, 4.2, wall="#efe9dc", key="storage", accent="#f07a1c"); place(o, -770, -425, "w"); cbox(-770, -425, 10, 14)
    place(pylon("storage_sign", "storage", 6.5, 6.0), -804, -418, "w")
    f = TB(T43)
    for seg in (((-760, -410), (-664, -410)), ((-664, -410), (-664, -513)), ((-664, -513), (-788, -513)), ((-788, -513), (-788, -450))): chainlink(f, list(seg), 2.0, flat("#2e3236"))
    put(f, 0, 0, 0)

def townhomes():
    """Townhome rows west of the curve of Dave's street (US 441 side): four rows round two parking courts, drives out to 441."""
    if not clear_ok(-795, -178, -730, -28, "townhomes"): return
    for (yc, faces) in ((-62, ((-44, "s"), (-80, "n"))), (-142, ((-124, "s"), (-160, "n")))):
        RB.box(ASPH, -792, -736, yc - 9, yc + 9, 0, .028); RB.box(ASPH, -812, -792, yc - 4, yc + 4, 0, .027); FOOT.append((-812, yc - 9, -736, yc + 9))
        for s in range(-789, -739, 3):
            for (a0, a1) in ((yc - 9, yc - 4.2), (yc + 4.2, yc + 9)): RB.box(m["white"], s - .05, s + .05, a0, a1, .028, .034)
            for cyy, rz in ((yc - 6.6, 180), (yc + 6.6, 0)):
                if R3.random() < .45:
                    c_ = CARCOL[R3.randrange(len(CARCOL))]; o_ = linked(f"dcar_{c_[1:]}", lambda nm, c_=c_: display_car(nm, c_)); place(o_, s + 1.5, cyy, rz=rz); cbox(s + 1.5, cyy, 1.9, 4.5, rz)
        for (y, face) in faces:
            o = linked(f"trow_{face}", lambda nm: BF.make_row(nm, 6, 6.4, 10, 2, 7)); place(o, -764, y, face); cbox(-764, y, 38.4, 10.4); FOOT.append((-784, y - 6, -744, y + 6))
            for x in (-786, -742): prop("palm_small", x, y)
    b = Builder(uname("town_pool")); b.box(PAVE, -9, 9, -6, 6, 0, .08); b.box(flat("#3fb7d8"), -6, 6, -3.5, 3.5, .08, .1); chainlink(b, [(-9, -6), (9, -6), (9, 6), (-9, 6), (-9, -6)], 1.3, flat("#2e3236"))
    put(b, -752, -102, 0); FOOT.append((-762, -109, -742, -95))

def church():
    """Church on the east side of Lyons south of McDonald's: white nave + bell tower and spire facing Lyons, a lot, monument sign."""
    if not clear_ok(40, 545, 168, 662, "church"): return
    b = Builder(uname("church")); WALLC = flat("#f2eee4"); RF_ = flat("#5d6670")
    b.box(WALLC, -20, 20, -12, 12, 0, 8.5); b.box(flat("#c9c0ac"), -20.1, 20.1, -12.1, 12.1, 0, .6)
    b.prism(RF_, (-20.8, 20.8, -12.8, 12.8), (-20.8, 20.8, -.3, .3), 8.5, 15.0)
    for x in range(-16, 18, 5):
        for sy in (-1, 1): b.box(flat("#3a5a8a"), x - .7, x + .7, sy * 12 - (.08 if sy < 0 else 0), sy * 12 + (.08 if sy > 0 else 0), 2.0, 6.6)
    b.box(WALLC, -27, -19, -4, 4, 0, 20); b.box(flat("#c9c0ac"), -27.3, -18.7, -4.3, 4.3, 19.4, 20.4); b.prism(RF_, (-27, -19, -4, 4), (-23.1, -22.9, -.1, .1), 20.4, 30)
    b.box(flat("#5a3a22"), -27.08, -27, -1.4, 1.4, 0, 3.4); b.box(flat("#3a5a8a"), -27.06, -27.0, -1, 1, 10, 14)
    b.box(flat("#c8a02a"), -23.2, -22.8, -.1, .1, 30, 32.5); b.box(flat("#c8a02a"), -23.2, -22.8, -.9, .9, 31.3, 31.7)
    put(b, 140, 604, 0); cbox(136.5, 604, 47, 24); FOOT.append((113, 592, 160, 616))
    surface_lot(44, 106, 548, 658, .3, drive=(12, 44, 598, 606))
    o = Builder(uname("church_sign")); o.box(flat("#c9c0ac"), -3, 3, -.4, .4, 0, .6); o.box(sgn("church"), -2.8, 2.8, -.46, .46, .6, 2.0); put(o, 30, 630, -90)

def grove_fill():
    """Whatever grass is still bare after the designed fills: a grid of 20 m cells; a cell further than 22 m from anything gets a tree island
    (mulch bed + a live oak or two + palms + shrubs). Keeps off roads, water, cuts, houses, footprints, the golf course and Trash Mountain."""
    pts = [(p_["x"], p_["y"]) for p_ in PROPS]; G = {}
    for (x, y) in pts: G.setdefault((int(x // 20), int(y // 20)), []).append((x, y))
    for c_ in COL:
        if c_["t"] in ("box", "circle"): G.setdefault((int(c_["x"] // 20), int(c_["y"] // 20)), []).append((c_["x"], c_["y"]))
    def busy(x, y, r):
        for i in range(int((x - r) // 20), int((x + r) // 20) + 1):
            for j in range(int((y - r) // 20), int((y + r) // 20) + 1):
                for (a, b_) in G.get((i, j), ()):
                    if (a - x) ** 2 + (b_ - y) ** 2 < r * r: return True
        return False
    T = Tiled("groves"); MUL = flat("#4d4236"); n = 0
    EX = [(320, -126, 390, -94), (110, -306, 150, -294), (113, -470, 252, -370), (298, -452, 502, -348), (555, -340, 670, -295), (552, 1134, 600, 1166), (710, 1134, 730, 1146),
          (692, 1192, 708, 1208), (645, 1225, 655, 1235), (460, 695, 760, 740), (570, 625, 630, 685), (420, 560, 560, 600)]
    for gx in range(int(XW) + 20, int(XE) - 20, 20):
        for gy in range(int(YS) + 20, int(YN) - 20, 20):
            x, y = gx + R3.uniform(-5, 5), gy + R3.uniform(-5, 5)
            if busy(x, y, 22) or near_road(x, y, 10) or in_water(x, y, 8) or on_cut(x, y, 8) or hnear(x, y, 18): continue
            if any(f_[0] - 4 < x < f_[2] + 4 and f_[1] - 4 < y < f_[3] + 4 for f_ in FOOT + EX): continue
            if 80 < x < 790 and 835 < y < 1040: continue
            if 35 < x < 790 and 250 < y < 465: continue
            if x < -840 or x > 840: continue
            rx, ry = R3.uniform(4, 6), R3.uniform(3, 4.5); a = R3.uniform(0, math.pi)
            k = T._k([(x, y)]); B_ = T.b.setdefault(k, Builder(f"groves_{k[0]}_{k[1]}"))
            bpoly(B_, MUL, [(x + rx * math.cos(t) * math.cos(a) - ry * math.sin(t) * math.sin(a), y + rx * math.cos(t) * math.sin(a) + ry * math.sin(t) * math.cos(a)) for t in [2 * math.pi * i / 14 for i in range(14)]], .06)
            prop("oak", x + R3.uniform(-1.5, 1.5), y + R3.uniform(-1, 1), R3.uniform(1.05, 1.35))
            for j in range(R3.randint(1, 3)): prop(R3.choice(["palm_tall", "palm_medium", "oak"]), x + R3.uniform(-rx + 1, rx - 1), y + R3.uniform(-ry + 1, ry - 1))
            for j in range(R3.randint(2, 4)): prop(R3.choice(["shrub_a", "shrub_b"]), x + R3.uniform(-rx, rx), y + R3.uniform(-ry, ry), col=False)
            G.setdefault((int(x // 20), int(y // 20)), []).append((x, y)); n += 1
    STATIC.extend(T.build(vc=True, recalc=False)); print("groves", n)

def gap_fill():
    for fn in (hs_athletics, golf, golf_trees, construction, offices_more, butterfly_garden, skate_dress, rec_park_more, sabal_more, lake_parks, storage, townhomes, church):
        fn(); tick_(fn.__name__)
    STATIC.extend(T43.build(vc=True, recalc=False))
