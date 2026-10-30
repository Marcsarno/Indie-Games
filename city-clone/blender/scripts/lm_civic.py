"""Civic landmarks (concepts art/coconut-16-city-hall.png and art/coconut-15-casino.png).
Every maker returns ONE built object: footprint centred on the origin, ground at z=0, front / entrance toward -y (like building_fl / district_kits).
city_hall -> two-storey stucco city hall with a glass entrance tower.   butterfly -> monarch sculpture on a plinth (forecourt prop).
casino -> SEMINOLE CASINO COCONUT CREEK with an arched porte-cochere and two terracotta-roofed towers (its parking garage is district_kits.garage)."""
import sys, os, math; sys.path.insert(0, os.path.dirname(__file__)); from kit import *
from mathutils import Vector

# ---- helpers ------------------------------------------------------------------------------------------------------------------
def _slab(b, m, pts3, nrm, t):
    """Closed slab: the planar polygon pts3 (may be concave) extruded +-t/2 along nrm."""
    bm = b.bm; n = Vector(nrm).normalized() * (t / 2); mi = b._mi(m); k = len(pts3)
    F = [bm.verts.new(Vector(p) - n) for p in pts3]; B = [bm.verts.new(Vector(p) + n) for p in pts3]
    b._quad(F[::-1], mi); b._quad(B, mi)
    for i in range(k): b._quad([F[i], F[(i + 1) % k], B[(i + 1) % k], B[i]], mi)

def _arc(c, hw, z_end, z_mid, n=10, rev=False):
    """Elliptical arch from (c-hw, z_end) over (c, z_mid) to (c+hw, z_end) as (u, z) points."""
    pts = [(c - hw * math.cos(math.pi * i / n), z_end + (z_mid - z_end) * math.sin(math.pi * i / n)) for i in range(n + 1)]
    return pts[::-1] if rev else pts

def _arch_band(c, hw, leg, z_spring, under_mid, top_end, top_mid, n=10):
    """(u, z) outline of an arched beam with two legs ending at z_spring (top edge can be flat when top_end == top_mid)."""
    top = _arc(c, hw, top_end, top_mid, n) if top_mid != top_end else [(c - hw, top_end), (c + hw, top_end)]
    under = _arc(c, hw - leg, z_spring, under_mid, n, rev=True)
    return [(c - hw, z_spring)] + top + [(c + hw, z_spring)] + under

def _xz(pts, y): return [(u, y, z) for u, z in pts]
def _yz(pts, x): return [(x, u, z) for u, z in pts]

def _curved_roof(b, m, xs, ztop, y0, y1, thick):
    """Barrel-ish roof slab: top height ztop[i] at xs[i], running from y0 to y1."""
    bm = b.bm; mi = b._mi(m); rings = []
    for x, z in zip(xs, ztop): rings.append([bm.verts.new(p) for p in ((x, y0, z - thick), (x, y1, z - thick), (x, y1, z), (x, y0, z))])
    b._quad(rings[0][::-1], mi); b._quad(rings[-1], mi)
    for a, c in zip(rings, rings[1:]):
        for i in range(4): b._quad([a[i], a[(i + 1) % 4], c[(i + 1) % 4], c[i]], mi)

def _pyramid(b, m, x0, x1, y0, y1, z0, h, over=.5, fascia=None):
    b.prism(m, (x0 - over, x1 + over, y0 - over, y1 + over), ((x0 + x1) / 2 - .06, (x0 + x1) / 2 + .06, (y0 + y1) / 2 - .06, (y0 + y1) / 2 + .06), z0, z0 + h)
    if fascia is not None: b.box(fascia, x0 - over, x1 + over, y0 - over, y1 + over, z0 - .25, z0 + .02)

def _parapet(b, m, cap, x0, x1, y0, y1, z0, h=.7, t=.35, capo=.08):
    for (a0, a1, c0, c1) in ((x0, x1, y0, y0 + t), (x0, x1, y1 - t, y1), (x0, x0 + t, y0, y1), (x1 - t, x1, y0, y1)):
        b.box(m, a0, a1, c0, c1, z0, z0 + h)
        if cap is not None: b.box(cap, a0 - capo, a1 + capo, c0 - capo, c1 + capo, z0 + h, z0 + h + .1)

def _edges(b, m, pts, z0, z1, out, inn):
    """Boxes along every edge of an axis-aligned CCW outline, from `out` outside to `inn` inside (cornices, parapets, plinths)."""
    for i in range(len(pts)):
        (px, py), (qx, qy) = pts[i], pts[(i + 1) % len(pts)]
        if py == qy:
            ny = -1 if qx > px else 1; ya, yb = py + ny * out, py - ny * inn
            b.box(m, min(px, qx) - out, max(px, qx) + out, min(ya, yb), max(ya, yb), z0, z1)
        else:
            nx = 1 if qy > py else -1; xa, xb = px + nx * out, px - nx * inn
            b.box(m, min(xa, xb), max(xa, xb), min(py, qy) - out, max(py, qy) + out, z0, z1)

def _ac(b, grey, dark, x, y, sx=1.0, sy=.8, z=0):
    b.box(grey, x - sx, x + sx, y - sy, y + sy, z, z + 1.0); b.box(dark, x - sx * .6, x + sx * .6, y - sy * .6, y + sy * .6, z + 1.0, z + 1.08)

def tri_count(o): return sum(len(p.vertices) - 2 for p in o.data.polygons)

STUCCO = "#e9dcb8"


# ---- city hall --------------------------------------------------------------------------------------------------------------
def city_hall(name="city_hall"):
    """Coconut Creek City Hall. Footprint 34 x 20 m (x -17..17, y -10..10): two-storey stucco wings (8 m) 34 x 16, a 10 x 10 entrance tower
    (12.9 m) with a teal-glass curtain wall and the CITY HALL sign, and a flat metal canopy reaching y = -10. Front = -y."""
    b = Builder(name); hx = 17.0; Y1 = 10.0; H = 8.0; fh = 3.9
    st = M("lc_stucco", STUCCO, tex="stucco_cream", tile=3.0); tan = M("lc_tan", "#d2bb8c"); cap = M("lc_cap", "#e2d2ac"); plinth = M("lc_plinth", "#b9a77f")
    glass = M("lc_blue_glass", "#2f73ad", rough=.2); frame = M("lc_blue_frame", "#3b7fb6"); teal = M("lc_teal", "#2c8c98"); roof = M("lc_roof", "#5a5a5c", tex="roof", tile=3.0)
    metal = M("lc_canopy", "#dfe3e8", rough=.4); rib = M("lc_canopy_rib", "#b9c0c8"); grey = M("lc_ac", "#a9adb4"); dark = M("lc_dark", "#3a3e44")
    sign = M("lc_sign_cityhall", "#ffffff", tex="sign_lc_cityhall", fit=True, rough=.6)

    body = ((-hx, hx, -6.0, Y1), (5.6, hx, -6.6, -6.0))                                                         # right wing steps forward
    outline = [(-hx, -6.0), (5.6, -6.0), (5.6, -6.6), (hx, -6.6), (hx, Y1), (-hx, Y1)]
    for (x0, x1, y0, y1) in body: b.box(st, x0, x1, y0, y1, 0, H); b.box(roof, x0, x1, y0, y1, H, H + .08)
    _edges(b, plinth, outline, 0, .5, .05, 0); _edges(b, tan, outline, fh - .1, fh + .1, .06, 0)                  # plinth, string course
    _edges(b, tan, outline, H - .55, H, .3, 0); _edges(b, st, outline, H, H + .55, .3, .1); _edges(b, cap, outline, H + .55, H + .65, .38, .18)   # cornice, parapet, cap

    def win(face, u, z0, z1, hw=.85, plane=0):
        """Tan-framed blue window on a face plane (S/N: plane = y, E/W: plane = x)."""
        for (m, a, o0, o1, dz) in ((tan, hw + .14, 0, .07, .14), (glass, hw, .02, .1, 0)):
            if face == "S": b.box(m, u - a, u + a, plane - o1, plane - o0, z0 - dz, z1 + dz)
            elif face == "N": b.box(m, u - a, u + a, plane + o0, plane + o1, z0 - dz, z1 + dz)
            elif face == "E": b.box(m, plane + o0, plane + o1, u - a, u + a, z0 - dz, z1 + dz)
            else: b.box(m, plane - o1, plane - o0, u - a, u + a, z0 - dz, z1 + dz)
        sill = (u - hw - .2, u + hw + .2)
        if face == "S": b.box(tan, *sill, plane - .16, plane, z0 - .3, z0 - .14)
        elif face == "N": b.box(tan, *sill, plane, plane + .16, z0 - .3, z0 - .14)
    rows = ((1.1, 2.9), (fh + 1.0, fh + 2.8))
    for z0, z1 in rows:
        for u in (-15.5, -13.0, -10.5, -8.0): win("S", u, z0, z1, hw=.72, plane=-6.0)
        for u in (8.0, 10.5, 13.0, 15.5): win("S", u, z0, z1, hw=.72, plane=-6.6)
        for u in [-15.4 + 3.08 * k for k in range(11)]: win("N", u, z0, z1, plane=Y1)
        for u in (-3.4, .0, 3.4, 6.8): win("E", u, z0, z1, plane=hx); win("W", u, z0, z1, plane=-hx)
    # teal flanking panels and the entrance tower
    for (x0, x1) in ((-6.3, -5.0), (5.0, 6.3)): b.box(teal, x0, x1, -7.4, -1.0, 0, 9.8); b.box(cap, x0 - .05, x1 + .05, -7.45, -.95, 9.8, 9.9)
    TY0, TY1, TH = -7.0, 3.0, 12.2
    b.box(st, -5.0, 5.0, TY0, TY1, 0, TH); b.box(plinth, -5.05, 5.05, TY0 - .05, TY1 + .05, 0, .5)
    b.box(tan, -5.35, 5.35, TY0 - .35, TY1 + .35, TH - .5, TH); 
    _parapet(b, st, cap, -5.35, 5.35, TY0 - .35, TY1 + .35, TH, .55, .4, .12); b.box(roof, -5.0, 5.0, TY0, TY1, TH, TH + .1)
    b.box(tan, -5.06, 5.06, TY0 - .06, TY1 + .06, 9.4, 9.6); b.box(tan, -5.2, 5.2, TY0 - .2, TY1 + .2, TH - 1.0, TH - .8)                                                        # band under the sign
    # curtain wall: blue frame, 3 x 3 glass panes above the canopy, glass doors below
    yf = TY0
    b.box(frame, -3.3, 3.3, yf - .1, yf, .3, 9.2)
    for i in range(3):
        for j, (z0, z1) in enumerate(((3.95, 5.6), (5.75, 7.4), (7.55, 9.05))):
            b.box(glass, -3.15 + i * 2.13, -3.15 + i * 2.13 + 2.0, yf - .14, yf - .1, z0, z1)
    for u0, u1 in ((-3.15, -1.65), (-1.5, -.05), (.05, 1.5), (1.65, 3.15)): b.box(glass, u0, u1, yf - .14, yf - .1, .3, 3.2)
    b.box(dark, -.04, .04, yf - .16, yf - .1, .3, 2.6)
    b.box(sign, -4.0, 4.0, yf - .12, yf, 9.75, 11.35)
    for sx in (-4.2, 4.2): b.box(dark, sx - .15, sx + .15, yf - .25, yf, 4.4, 4.9)                                  # wall lights
    # flat metal canopy on two teal posts
    b.box(metal, -3.9, 3.9, -10.0, yf, 3.55, 3.8); b.box(metal, -3.95, 3.95, -10.05, -9.8, 3.45, 3.95)
    for k in range(5): xr = -3.1 + k * 1.55; b.box(rib, xr - .06, xr + .06, -9.8, yf, 3.8, 3.86)
    for sx in (-3.4, 3.4): b.box(frame, sx - .25, sx + .25, -9.75, -9.25, 0, 3.55)
    # rooftop AC
    for (x, y) in ((-11.5, 4.5), (11.0, 3.0), (13.5, 7.0)): _ac(b, grey, dark, x, y, 1.3, 1.0, H + .08)
    return b.build(vc=True)


# ---- butterfly sculpture ------------------------------------------------------------------------------------------------------
def butterfly(name="butterfly"):
    """Monarch butterfly sculpture on a concrete plinth. Footprint 3.4 x 1.4 m (wings ~3.3 m across); plinth 1.76 x 1.36 x 1.2 m; top ~3.95 m. Front = -y."""
    b = Builder(name); conc = M("lc_plinth_conc", "#b4b2aa"); concd = M("lc_plinth_cap", "#c9c7bf"); blk = M("lc_bfly_black", "#1d1b1c"); org = M("lc_bfly_orange", "#ee7a12")
    wht = M("lc_bfly_white", "#f2efe6")
    b.box(conc, -.8, .8, -.6, .6, 0, 1.08); b.box(concd, -.88, .88, -.68, .68, 1.08, 1.2)
    b.box(blk, -.06, .06, -.06, .06, 1.2, 1.75)                                                                     # post
    c = Vector((0, 0, 2.55))
    b.box(blk, -.1, .1, -.1, .1, 1.7, 3.3); b.box(blk, -.13, .13, -.13, .13, 3.2, 3.48)                       # body + head
    for sx in (-1, 1): b.box(blk, sx * .1 - .025, sx * .1 + .025, -.025, .025, 3.48, 3.95)                          # antennae
    fore = [(.05, .05), (.6, .7), (1.3, 1.1), (1.7, 1.03), (1.6, .5), (1.12, .1), (.55, -.05)]
    hind = [(.05, -.02), (.85, -.08), (1.15, -.42), (.95, -.88), (.45, -.92), (.12, -.5)]
    sweep, lift = math.radians(12), math.radians(8)
    for sx in (-1, 1):
        out = Vector((sx * math.cos(sweep) * math.cos(lift), math.sin(sweep) * math.cos(lift), math.sin(lift))); up = Vector((0, .5, 1)).normalized()
        nrm = out.cross(up)
        def P(u, v, s=1.0, cu=0, cv=0): return c + out * (cu + (u - cu) * s) + up * (cv + (v - cv) * s)
        for shape, (cu, cv) in ((fore, (.95, .55)), (hind, (.62, -.47))):
            _slab(b, blk, [P(u, v) for u, v in shape], nrm, .05)                                                     # black edge
            _slab(b, org, [P(u, v, .72, cu, cv) for u, v in shape], nrm, .08)                                        # orange panel (shows on both sides)
            vu, vv = (cu + .1, cv)                                                                                     # one black vein
            _slab(b, blk, [P(.12, cv * .2), P(vu + .35, vv + .05), P(vu + .35, vv - .03), P(.12, cv * .2 - .06)], nrm, .1)
        for (u, v) in ((1.6, .87), (1.64, .68), (1.4, 1.0), (.84, -.8), (1.06, -.56)):                                 # white spots on the black rim
            _slab(b, wht, [P(u - .05, v - .05), P(u + .05, v - .05), P(u + .05, v + .05), P(u - .05, v + .05)], nrm, .07)
    return b.build(vc=True)


# ---- casino -----------------------------------------------------------------------------------------------------------------
def casino(name="casino"):
    """SEMINOLE CASINO COCONUT CREEK. Footprint 56 x 36 m (x -28..28, y -18..18): main hall 50 x 24 (9.6 m + parapet) from y = -6 to 18, an arched
    porte-cochere 18 m wide on four pillars reaching y = -18, a curved sign parapet (top 15 m), two square towers with terracotta pyramid
    roofs (front-right 8 x 8 to 19 m, front-left 6.5 x 6.5 to 16 m). Front = -y. Parking garage is a separate model (district_kits.garage)."""
    b = Builder(name); H = 9.6
    st = M("lc_cs_stucco", STUCCO, tex="stucco_cream", tile=3.0); tc = M("lc_cs_terracotta", "#b9623f"); trim = M("lc_cs_trim", "#f2e8d0")
    stone = M("lc_cs_stone", "#a8987a", tex="brick_a8987a", tile=2.2); glass = M("lc_cs_glass", "#27343e", rough=.2); roofm = M("lc_cs_roof", "#a8a6a1")
    tile = M("lc_cs_tile", "#c4603a"); grey = M("lc_cs_ac", "#b4b7bc"); dark = M("lc_cs_dark", "#3a3e44"); lamp = M("lc_cs_lamp", "#ffe2a8", emit=1.5)
    sign = M("lc_sign_casino", "#ffffff", tex="sign_lc_casino", fit=True, rough=.6)

    # main hall + right annex
    b.box(st, -26, 23, -6, 18, 0, H); b.box(roofm, -26, 23, -6, 18, H, H + .06)
    b.box(trim, -26.25, 23.25, -6.25, 18.25, H - .45, H)
    _parapet(b, st, trim, -26.25, 23.25, -6.25, 18.25, H, .8, .4)
    b.box(st, 23, 28, -4, 16, 0, 8.0); b.box(roofm, 23, 28, -4, 16, 8.0, 8.06); b.box(trim, 23, 28.2, -4.2, 16.2, 7.6, 8.0); _parapet(b, st, trim, 23, 28.2, -4.2, 16.2, 8.0, .6, .35)
    b.box(st, -22, -11, 9, 16, H, 12.0); b.box(trim, -22.2, -10.8, 8.8, 16.2, 11.8, 12.1); b.box(roofm, -21.6, -11.4, 9.4, 15.6, 12.1, 12.15)       # mechanical penthouse
    for (x, y, sx, sy) in ((-5, 11, 2.2, 1.6), (4, 4, 1.4, 1.1), (11, 12, 1.6, 1.2), (-16, 2, 1.4, 1.1), (17, 8, 1.2, 1.0), (25.5, 6, 1.0, .9), (-4, 1, 1.2, 1.0), (8, 15, 1.2, 1.0), (-19, 5, 1.0, 1.0), (14, 3, 1.0, .8)):
        _ac(b, grey, M("lc_cs_actop", "#80858c"), x, y, sx, sy, H + .06 if x < 23 else 8.06)

    def block(x0, x1, y_front, depth, h, base=1.5, win=None):
        """Proud terracotta block with a stone base, a cream cap and an optional dark window (u0, u1, z0, z1)."""
        b.box(tc, x0, x1, y_front, y_front + depth, 0, h); b.box(stone, x0 - .12, x1 + .12, y_front - .12, y_front + depth, 0, base)
        b.box(trim, x0 - .2, x1 + .2, y_front - .2, y_front + depth, h, h + .35); b.box(trim, x0 - .05, x1 + .05, y_front - .06, y_front + depth, base, base + .15)
        if win: b.box(glass, win[0], win[1], y_front - .05, y_front, win[2], win[3]); b.box(trim, win[0] - .15, win[1] + .15, y_front - .15, y_front, win[2] - .2, win[2])

    # front facade (y = -6), left to right
    b.box(stone, -21, -9, -6.12, -6, 0, 1.3); b.box(trim, -21, -9, -6.18, -6, 1.3, 1.42); b.box(trim, -21, -9, -6.15, -6, 8.4, 8.7)
    block(-21.0, -18.8, -6.8, .8, 11.0)
    for u0 in (-18.0, -15.6): b.box(glass, u0, u0 + 2.2, -6.08, -6, 1.6, 6.4); b.box(trim, u0 - .15, u0 + 2.35, -6.16, -6, 6.4, 6.7)
    block(-13.2, -9.2, -7.0, 1.0, 12.8)
    block(9.2, 13.2, -7.0, 1.0, 12.8)
    b.box(stone, 13.2, 15, -6.12, -6, 0, 1.3); b.box(trim, 13.2, 15, -6.15, -6, 8.4, 8.7)
    # curved sign parapet with the sign, glass entrance below it
    _slab(b, st, _xz([(-9.2, 0)] + _arc(0, 9.2, 12.0, 14.8, 12) + [(9.2, 0)], -6.6), (0, 1, 0), .8)
    _slab(b, trim, _xz(_arc(0, 9.2, 11.85, 14.65, 12) + _arc(0, 9.2, 12.15, 15.0, 12, rev=True), -6.6), (0, 1, 0), 1.0)                # coping on the curve
    b.box(sign, -6.4, 6.4, -7.06, -6.95, 9.0, 13.8)
    b.box(tc, -6.6, 6.6, -7.2, -7.0, 0, 5.4); b.box(trim, -6.8, 6.8, -7.35, -7.0, 5.4, 5.75)
    b.box(glass, -6.0, 6.0, -7.26, -7.2, .2, 4.9)
    for k in range(7): u = -6.0 + k * 2.0; b.box(trim, u - .06, u + .06, -7.3, -7.2, .2, 4.9)
    b.box(trim, -6.0, 6.0, -7.3, -7.2, 2.9, 3.0)

    # porte-cochere: four stone-based terracotta pillars, arched beams, curved roof
    PX, PF, PB, PW = 8.1, -17.1, -7.9, .8
    for sx in (-1, 1):
        for py in (PF, PB):
            x = sx * PX; b.box(tc, x - PW, x + PW, py - PW, py + PW, 0, 4.3); b.box(stone, x - PW - .15, x + PW + .15, py - PW - .15, py + PW + .15, 0, 1.6)
            b.box(trim, x - PW - .15, x + PW + .15, py - PW - .15, py + PW + .15, 1.6, 1.75)
            b.box(lamp, x - .18, x + .18, py - PW - .1, py - PW, 2.8, 3.3) if py == PF else None
    _slab(b, st, _xz(_arch_band(0, 9.0, 1.8, 4.3, 6.6, 7.2, 9.0, 12), -17.5), (0, 1, 0), 1.0)
    _slab(b, trim, _xz(_arc(0, 9.1, 7.05, 8.85, 12) + _arc(0, 9.1, 7.45, 9.25, 12, rev=True), -17.55), (0, 1, 0), 1.15)          # curved cornice
    for sx in (-1, 1):
        _slab(b, st, _yz(_arch_band(-12.5, 5.5, 1.75, 4.3, 5.9, 7.2, 7.2), sx * 8.5), (1, 0, 0), 1.0)
        b.box(trim, sx * 8.5 - .58, sx * 8.5 + .58, -18.0, -7.0, 7.05, 7.45)
    xs = [-9.0 + 18.0 * i / 12 for i in range(13)]; zt = [7.2 + 1.8 * math.sqrt(max(0, 1 - (x / 9.0) ** 2)) - .55 for x in xs]
    _curved_roof(b, roofm, xs, zt, -17.0, -7.0, .6)

    # towers: stone base, terracotta shaft, cream upper storey, cornice, terracotta pyramid roof
    def tower(x0, x1, y0, y1, h, roof_h, tc_top):
        cx = (x0 + x1) / 2; w = x1 - x0
        b.box(tc, x0, x1, y0, y1, 0, tc_top); b.box(st, x0, x1, y0, y1, tc_top, h)
        b.box(stone, x0 - .15, x1 + .15, y0 - .15, y1 + .15, 0, 1.8); b.box(trim, x0 - .2, x1 + .2, y0 - .2, y1 + .2, 1.8, 1.95)
        b.box(trim, x0 - .25, x1 + .25, y0 - .25, y1 + .25, tc_top - .2, tc_top + .25)
        b.box(trim, x0 - .45, x1 + .45, y0 - .45, y1 + .45, h - .5, h)
        _pyramid(b, tile, x0, x1, y0, y1, h, roof_h, .55, trim)
        for face in ("S", "E", "W"):                                                                                   # twin upper windows + one lower window per face
            for (u0, u1, z0, z1, deep) in ((-w * .34, -w * .04, tc_top + 1.3, h - 1.2, True), (w * .04, w * .34, tc_top + 1.3, h - 1.2, True), (-w * .22, w * .22, 3.0, tc_top - 1.6, False)):
                if face == "S": b.box(trim, cx + u0 - .15, cx + u1 + .15, y0 - .08, y0, z0 - .15, z1 + .15); b.box(glass, cx + u0, cx + u1, y0 - .12, y0, z0, z1)
                else:
                    xf = x1 if face == "E" else x0; sg = 1 if face == "E" else -1; cy = (y0 + y1) / 2
                    b.box(trim, min(xf, xf + sg * .08), max(xf, xf + sg * .08), cy + u0 - .15, cy + u1 + .15, z0 - .15, z1 + .15); b.box(glass, min(xf, xf + sg * .12), max(xf, xf + sg * .12), cy + u0, cy + u1, z0, z1)
    tower(15.0, 23.0, -10.0, -2.0, 15.4, 3.6, 9.4)
    tower(-27.5, -21.0, -8.5, -2.0, 13.0, 3.0, 7.8)

    # side / back walls: terracotta pilasters with stone bases, a few dark windows and service doors
    for y in (2.0, 10.0, 17.0):
        b.box(tc, -26.6, -26, y - 1.5, y + 1.5, 0, H + .6); b.box(stone, -26.7, -26, y - 1.6, y + 1.6, 0, 1.4)
    for x in (-18, -6, 6):
        b.box(tc, x - 1.5, x + 1.5, 18, 18.6, 0, H + .6); b.box(stone, x - 1.6, x + 1.6, 18, 18.7, 0, 1.4)
    for x in (-12, 0, 12): b.box(dark, x - 1.2, x + 1.2, 18, 18.08, 0, 2.6)
    b.box(tc, 27.6, 28.0, -4, 1, 0, 8.4); b.box(stone, 27.6, 28.1, -4, 1, 0, 1.4)
    b.box(tc, 23.0, 28.0, -4.4, -4.0, 0, 8.4); b.box(stone, 23.0, 28.0, -4.5, -4.0, 0, 1.4)
    for y in (4, 9, 13): b.box(glass, 28.0, 28.06, y - 1.2, y + 1.2, 1.5, 6.2)
    for y in (-1, 6, 13): b.box(glass, -26.06, -26.0, y + 1.8, y + 4.2, 1.5, 6.2) if y + 4.2 < 16 else None
    return b.build(vc=True)


if __name__ == "__main__":
    reset()
    for f in (city_hall, butterfly, casino):
        o = f(); print(f.__name__, "tris", tri_count(o), "mats", len(o.data.materials), "dims", tuple(round(v, 2) for v in o.dimensions))
