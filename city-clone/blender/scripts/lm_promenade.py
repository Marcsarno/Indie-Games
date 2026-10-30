"""Landmarks: the Promenade at Coconut Creek (open-air shopping street, concept art/coconut-18-promenade.png) and Trash Mountain
(landfill mound with a spiral haul road, concept art/coconut-17-trash-mountain.png).

Every maker returns ONE object built with one Builder, centred on the origin, ground at z=0, front facing -y (like building_fl).
Signs need the PNGs from `python3 scripts/tex_promenade.py` (out/tex/sign_lp_*.png, lp_stone.png, lp_pavers.png).
Material names all start with `lp_`.

Makers (footprint x by y, height):
  shop_row(name, n_units=4, unit_w=9, depth=12, seed=1)   (n_units*unit_w) x depth, 5.5-8 m (+ roof caps up to ~2.6 m)
  cinema(name)                                              30 x 22 m (+1.2 m tower / 2.8 m marquee in front), 11.5 m body, tower 17.6 m
  entry_arch(name)                                          14.3 x 1.7 m, sign top 5.4 m, pillar caps 6.0 m, 11.1 m wide x 2.85 m tall opening
  fountain(name)                                            6.5 x 6.5 m octagon (6.0 m flat-to-flat), spout 2.9 m
  cafe_set(name, color=)                                    3.0 x 3.0 m (umbrella), 2.9 m tall
  bench(name)                                               1.8 x 0.7 m;   planter(name): 2.4 x 1.2 m, 1.25 m;   lamp_post(name): 0.5 x 0.5 m, 4.2 m
  trash_mountain(name)                                      62 x 52 m base inside the 63 x 54 m height grid, 22 m tall

Trash Mountain height field (cars drive on it):
  trash_height(x, y) -> metres at local (x, y) (object at the origin; outside the grid = 0).
  TRASH_HF = dict(x0, y0, dx, nx, ny): grid node (i, j) sits at (x0 + i*dx, y0 + j*dx), i in [0, nx), j in [0, ny).
  trash_heights() -> rows[j][i] (ny lists of nx floats) = the node heights, ready for JSON.
  Between nodes the surface is TRIANGLES: each cell is split along the diagonal (i, j)-(i+1, j+1). With fx, fy in [0, 1] inside the cell:
      fx >= fy:  h = h00 + fx*(h10 - h00) + fy*(h11 - h10)
      fx <  fy:  h = h00 + fy*(h01 - h00) + fx*(h11 - h01)
  trash_height uses exactly this rule and the mesh uses exactly these nodes and triangles, so the render and the drive surface agree.
  trash_road() -> [(x, y, z), ...] centreline of the haul road (6 m wide, from ground at the SW corner, counter-clockwise S -> E -> N -> W,
  up to the flat top), handy for AI paths / props.
"""
import sys, os, math, random; sys.path.insert(0, os.path.dirname(__file__)); from kit import *

TILE = "#a9573a"

def _m(name, hexs, **kw): return M("lp_" + name, hexs, **kw)
def _stone(): return M("lp_stone", "#8f6e4c", tex="lp_stone", tile=1.6)
def _tile(): return M("lp_tile", TILE, tex="tiles", tile=2.5)
def _glass(): return _m("glass", "#2f5868", rough=.2)
def _trim(): return _m("trim", "#f2e6c8")
def _frame(): return _m("frame", "#3a332c")

def _hip(b, m, x0, x1, y0, y1, z0, h, over=.5):
    """Terracotta hip roof (pyramid-ish when the footprint is near square), ridge along the longer side."""
    X0, X1, Y0, Y1 = x0 - over, x1 + over, y0 - over, y1 + over; w, d = X1 - X0, Y1 - Y0
    if w >= d: ins = d / 2 - .12; t = (X0 + ins, X1 - ins, (Y0 + Y1) / 2 - .12, (Y0 + Y1) / 2 + .12)
    else: ins = w / 2 - .12; t = ((X0 + X1) / 2 - .12, (X0 + X1) / 2 + .12, Y0 + ins, Y1 - ins)
    b.prism(m, (X0, X1, Y0, Y1), t, z0, z0 + h)

def _extrude_y(b, m, pts, y0, y1):
    """Convex polygon in the x-z plane (counter-clockwise seen from the front, i.e. from -y) extruded from y0 (front) to y1 (back)."""
    bm = b.bm; mi = b._mi(m); F = [bm.verts.new((x, y0, z)) for x, z in pts]; B = [bm.verts.new((x, y1, z)) for x, z in pts]
    b._quad(F, mi); b._quad(B[::-1], mi); n = len(pts)
    for k in range(n): b._quad([F[k], B[k], B[(k + 1) % n], F[(k + 1) % n]], mi)

def _parapet(b, m, x0, x1, y0, y1, z0, h=.8, t=.3, roof=None):
    for (a0, a1, c0, c1) in ((x0, x1, y0, y0 + t), (x0, x1, y1 - t, y1), (x0, x0 + t, y0, y1), (x1 - t, x1, y0, y1)): b.box(m, a0, a1, c0, c1, z0, z0 + h)
    if roof: b.box(roof, x0 + t, x1 - t, y0 + t, y1 - t, z0 + .08, z0 + .2)

def _ac(b, r, x0, x1, y0, y1, z):
    ac = _m("ac", "#b9bcc0"); dk = _m("acdark", "#5a5e64"); ax = r.uniform(x0 + 1.6, x1 - 1.6); ay = r.uniform(y0 + 1.6, y1 - 1.6)
    b.box(ac, ax - 1.0, ax + 1.0, ay - .8, ay + .8, z, z + .9); b.box(dk, ax - .55, ax + .55, ay - .45, ay + .45, z + .9, z + .98)

def _wall_lamp(b, x, y_face, z):
    """Gooseneck wall lamp on a -y facing wall: bracket + shade + warm bulb."""
    dk = _m("lampmetal", "#23262a"); bulb = _m("bulb", "#f6e3a0")
    b.box(dk, x - .05, x + .05, y_face - .55, y_face, z, z + .08); b.box(dk, x - .05, x + .05, y_face - .55, y_face - .47, z - .3, z + .05)
    b.box(dk, x - .2, x + .2, y_face - .75, y_face - .3, z - .45, z - .3); b.box(bulb, x - .12, x + .12, y_face - .67, y_face - .38, z - .52, z - .45)

# ---------------------------------------------------------------------------------------------------------------- promenade
WALLS = (("tan", "#d09a55"), ("peach", "#e0a072"), ("cream", "#e8cf98"), ("sand", "#d8ad66"))
AWNINGS = ("#1f7470", "#7c2230", "#c4542e")

def shop_row(name, n_units=4, unit_w=9.0, depth=12.0, seed=1):
    """Attached Mediterranean shop units along x, fronts facing -y. Footprint (n_units*unit_w) x depth (awnings/lamps reach 1.8 m in front,
    stone pilasters 0.3 m). Each unit: height 5.5-8 m, tan/peach/cream stucco, teal/maroon/red-orange awning, glass storefront with mullions,
    stone base + pilasters, two wall lamps, a name sign; roof = flat with parapet + AC, a raised terracotta hip-roof cap, or a gable with a round window."""
    r = random.Random(seed); b = Builder(name); W = n_units * unit_w; hy = depth / 2; yf = -hy
    trim = _trim(); glass = _glass(); frame = _frame(); stone = _stone(); tile = _tile(); roof = _m("roof", "#8e8f92"); door = _m("door", "#2a2622")
    caps = ["hip", "flat", "gable", "hip", "flat"]; r.shuffle(caps); caps = (caps * (n_units // 4 + 1))[:n_units]
    wall_i = r.randrange(4); awn_i = r.randrange(3); sign_i = r.randrange(6); prevH = 0
    for i in range(n_units):
        x0 = -W / 2 + i * unit_w; x1 = x0 + unit_w; cx = (x0 + x1) / 2; cap = caps[i]
        H = r.uniform(5.5, 8.0)
        if cap == "gable": H = max(H, 7.0)
        if abs(H - prevH) < .6: H = min(8.0, max(5.5, H + (.9 if H < 6.8 else -.9)))       # neighbours step visibly
        prevH = H
        wall_i = (wall_i + 1 + r.randrange(2)) % 4; wk, wh = WALLS[wall_i]; wm = _m("st_" + wk, wh)
        awn_i = (awn_i + 1) % 3; am = _m("awn_" + AWNINGS[awn_i][1:], AWNINGS[awn_i])
        b.box(wm, x0, x1, -hy, hy, 0, H)
        ex0 = .22 if i == 0 else 0; ex1 = .22 if i == n_units - 1 else 0
        b.box(trim, x0 - ex0, x1 + ex1, -hy - .22, hy + .22, H - .5, H - .15)                                  # cornice
        b.box(stone, x0, x1, yf - .12, yf + .3, 0, .7)                                                         # stone base
        for px in ([x0 + .35] if i else [x0 + .35]) + ([x1 - .35] if i == n_units - 1 else []):               # stone-based pilasters
            b.box(stone, px - .4, px + .4, yf - .32, yf + .2, 0, 2.2); b.box(wm, px - .32, px + .32, yf - .22, yf + .2, 2.2, H - .5)
            b.box(trim, px - .42, px + .42, yf - .34, yf + .2, 2.2, 2.35)
        g0, g1 = x0 + 1.1, x1 - 1.1                                                                            # storefront
        b.box(glass, g0, g1, yf - .05, yf + .1, .7, 3.3); b.box(frame, g0 - .1, g1 + .1, yf - .1, yf + .1, 3.3, 3.45); b.box(frame, g0 - .1, g1 + .1, yf - .1, yf + .1, .62, .72)
        nm = max(2, int((g1 - g0) / 1.7)); dw = (g1 - g0) / nm; dk = r.randrange(nm)
        for k in range(nm + 1):
            mx = g0 + k * dw; b.box(frame, mx - .06, mx + .06, yf - .1, yf + .1, .7, 3.3)
        b.box(door, g0 + dk * dw + .12, g0 + (dk + 1) * dw - .12, yf - .08, yf - .04, .72, 2.5)               # door leaf (darker pane)
        b.box(frame, g0 + dk * dw, g0 + (dk + 1) * dw, yf - .1, yf + .1, 2.5, 2.6)
        a0, a1 = x0 + .75, x1 - .75                                                                            # awning wedge + valance
        b.prism(am, (a0, a1, yf - 1.75, yf), (a0, a1, yf - .06, yf), 3.05, 3.85); b.box(am, a0, a1, yf - 1.8, yf - 1.7, 2.72, 3.08)
        sm = M(f"lp_shopsign{(sign_i + i) % 6}", "#ffffff", tex=f"sign_lp_shop{(sign_i + i) % 6}", fit=True, rough=.6)
        b.box(trim, cx - 2.75, cx + 2.75, yf - .1, yf, 3.95, 4.95); b.box(sm, cx - 2.6, cx + 2.6, yf - .16, yf - .1, 4.05, 4.85)
        for lx in (cx - 3.4, cx + 3.4): _wall_lamp(b, lx, yf, 4.9)
        if H > 6.6 and cap != "gable":                                                                         # upper windows
            for wx in (cx - 1.8, cx + 1.8):
                b.box(trim, wx - .62, wx + .62, yf - .08, yf, 5.25, 6.35); b.box(glass, wx - .5, wx + .5, yf - .1, yf, 5.35, 6.25)
        b.box(door, cx - .6, cx + .6, hy, hy + .08, 0, 2.2); b.box(_m("svc", "#9a9a96"), cx + 1.5, cx + 3.0, hy, hy + 1.0, 0, 1.2)   # back service door + box
        for ex, sx in ((i == 0, -1), (i == n_units - 1, 1)):                                                   # row ends: side shop window, awning, lamp, stone base
            if not ex: continue
            xe = x0 if sx < 0 else x1; o = lambda a, c: (min(xe + sx * a, xe + sx * c), max(xe + sx * a, xe + sx * c))
            b.box(stone, *o(-.3, .12), -hy, hy, 0, .7); b.box(glass, *o(-.1, .05), -hy + 1.4, -hy + 5.4, .7, 3.1); b.box(frame, *o(-.1, .1), -hy + 1.3, -hy + 5.5, 3.1, 3.25)
            b.prism(am, (*o(0, 1.5), -hy + 1.0, -hy + 5.8), (*o(0, .06), -hy + 1.0, -hy + 5.8), 2.9, 3.6); b.box(am, *o(1.45, 1.55), -hy + 1.0, -hy + 5.8, 2.6, 2.92)
            b.box(stone, *o(-.2, .3), -hy + 7.2, -hy + 8.0, 0, 2.2)
            lx = xe + sx * .02; dkm = _m("lampmetal", "#23262a"); bl = _m("bulb", "#f6e3a0")
            b.box(dkm, *o(0, .5), -hy + 7.55, -hy + 7.65, 4.2, 4.28); b.box(dkm, *o(.3, .7), -hy + 7.4, -hy + 7.8, 3.75, 3.9); b.box(bl, *o(.38, .62), -hy + 7.48, -hy + 7.72, 3.68, 3.75)
        if cap == "hip":                                                                                       # raised tower mass + terracotta cap
            th = 1.2; b.box(wm, x0 + .3, x1 - .3, -hy, -hy + 6.5, H - .15, H + th); b.box(trim, x0 + .1, x1 - .1, -hy - .2, -hy + 6.7, H + th - .3, H + th)
            _hip(b, tile, x0 + .3, x1 - .3, -hy, -hy + 6.5, H + th, 2.0, .55)
            b.cyl(trim, (cx, yf - .02, H - 1.2), .62, .16, "y", 12); b.cyl(glass, (cx, yf - .06, H - 1.2), .44, .16, "y", 12)
            _parapet(b, wm, x0, x1, -hy + 6.5, hy, H - .15, .7, roof=roof); _ac(b, r, x0, x1, -hy + 6.5, hy, H - .1)
        elif cap == "gable":                                                                                   # stepped gable parapet with a round window
            _extrude_y(b, wm, [(x0 + .2, H - .15), (x1 - .2, H - .15), (x1 - .2, H + .5), (cx + .5, H + 2.0), (cx - .5, H + 2.0), (x0 + .2, H + .5)], yf, yf + .4)
            _extrude_y(b, trim, [(x0 + .05, H + .4), (x0 + .2, H + .4), (cx - .5, H + 1.9), (cx - .5, H + 2.15)], yf - .08, yf + .45)
            _extrude_y(b, trim, [(cx + .5, H + 1.9), (x1 - .2, H + .4), (x1 - .05, H + .4), (cx + .5, H + 2.15)], yf - .08, yf + .45)
            b.box(trim, cx - .55, cx + .55, yf - .08, yf + .45, H + 1.9, H + 2.15)
            b.cyl(trim, (cx, yf - .02, H - 1.15), .72, .16, "y", 12); b.cyl(glass, (cx, yf - .06, H - 1.15), .5, .16, "y", 12)
            _parapet(b, wm, x0, x1, -hy + .3, hy, H - .15, .7, roof=roof); _ac(b, r, x0, x1, -hy, hy, H - .1)
        else:
            _parapet(b, wm, x0, x1, -hy, hy, H - .15, .8, roof=roof); _ac(b, r, x0, x1, -hy, hy, H - .1)
            if r.random() < .5: _ac(b, r, x0, x1, -hy, hy, H - .1)
    return b.build(vc=True, recalc=False)

def cinema(name):
    """Cinema anchor. Footprint 30 x 22 m (tower 1.2 m and marquee 2.8 m proud of the -y front), body 11.5 m, wings 9 m, sign tower 17.6 m.
    Tan stucco, central tower with a blue glass slot and stepped top, CINEMA sign, red marquee + red trim band, glass lobby, 4 poster frames."""
    b = Builder(name); hx, hy = 15.0, 11.0; yf = -hy; H = 11.5
    tan = _m("cin_tan", "#d6ae76"); tan2 = _m("cin_tan2", "#e3c391"); trim = _trim(); red = _m("cin_red", "#b42a26"); reddk = _m("cin_reddk", "#6e1a18")
    glass = _glass(); frame = _frame(); stone = _stone(); roof = _m("roof", "#8e8f92"); blue = _m("cin_blue", "#2f5f9a", rough=.25)
    b.box(tan, -10, 10, -hy, hy, 0, H); _parapet(b, tan, -10, 10, -hy, hy, H, .9, .35, roof=roof)
    b.box(trim, -10.25, 10.25, -hy - .25, hy + .25, H - .45, H - .05)
    for s in (-1, 1):                                                                                          # side wings, set back 1 m
        x0, x1 = sorted((s * 10, s * 15)); b.box(tan2, x0, x1, -hy + 1, hy, 0, 9.0); _parapet(b, tan2, x0, x1, -hy + 1, hy, 9.0, .8, .3, roof=roof)
        b.box(trim, x0 - (.2 if s < 0 else 0), x1 + (.2 if s > 0 else 0), -hy + .8, hy + .2, 8.55, 8.9)
        b.box(stone, x0, x1, -hy + .85, -hy + 1.2, 0, .8)
        px = s * 12.5; pm = M("lp_poster0" if s < 0 else "lp_poster1", "#ffffff", tex="sign_lp_poster0" if s < 0 else "sign_lp_poster1", fit=True, rough=.5)
        b.box(frame, px - .95, px + .95, -hy + .85, -hy + 1.0, 1.15, 4.05); b.box(pm, px - .8, px + .8, -hy + .8, -hy + .9, 1.3, 3.9)
        b.box(trim, px - 1.1, px + 1.1, -hy + .75, -hy + 1.0, 4.05, 4.25)
        for k in range(2): b.box(_m("ac", "#b9bcc0"), s * 12.5 - 1, s * 12.5 + 1, -2 + k * 6, -.4 + k * 6, 9.0, 9.9)
    b.box(stone, -10, 10, yf - .12, yf + .2, 0, .9)
    for px in (-10, -6.5, 6.5, 10):                                                                            # piers
        b.box(stone, px - .5, px + .5, yf - .45, yf + .2, 0, 1.6); b.box(tan2, px - .4, px + .4, yf - .35, yf + .2, 1.6, H - .45)
    for s in (-1, 1):                                                                                          # posters between the piers
        px = s * 8.25; pm = M("lp_poster1" if s < 0 else "lp_poster0", "#ffffff", tex="sign_lp_poster1" if s < 0 else "sign_lp_poster0", fit=True, rough=.5)
        b.box(frame, px - .95, px + .95, yf - .15, yf, 1.15, 4.05); b.box(pm, px - .8, px + .8, yf - .2, yf - .1, 1.3, 3.9)
        b.box(trim, px - 1.1, px + 1.1, yf - .25, yf, 4.05, 4.25)
    b.box(red, -10, 10, yf - .2, yf, 6.0, 6.55)                                                                # red trim band across the facade
    ty = yf - 1.2                                                                                              # sign tower
    b.box(tan, -4.5, 4.5, ty, yf + 4.5, 0, 16.0); b.box(trim, -4.75, 4.75, ty - .25, yf + 4.75, 15.6, 16.0)
    b.box(tan2, -3.2, 3.2, ty + .3, yf + 3.8, 16.0, 16.9); b.box(trim, -3.35, 3.35, ty + .15, yf + 3.95, 16.75, 16.95)
    b.box(tan, -1.3, 1.3, ty + .8, yf + 3.0, 16.9, 17.6); b.box(trim, -1.45, 1.45, ty + .65, yf + 3.15, 17.5, 17.65)
    b.box(trim, -1.05, 1.05, ty - .08, ty, 10.0, 15.2); b.box(blue, -.7, .7, ty - .14, ty, 10.25, 14.95)        # blue glass slot
    for s in (-1, 1): b.box(tan2, s * 3.6 - .3, s * 3.6 + .3, ty - .3, ty, 6.6, 15.6)                         # tower fins
    b.box(trim, -5.6, 5.6, ty - .35, ty, 7.2, 9.9)                                                             # CINEMA sign
    b.box(M("lp_cinema", "#ffffff", tex="sign_lp_cinema", fit=True, rough=.5), -5.35, 5.35, ty - .45, ty - .35, 7.4, 9.7)
    b.box(red, -6.2, 6.2, ty - 2.8, ty, 5.85, 6.7); b.box(reddk, -6.0, 6.0, ty - 2.65, ty, 5.7, 5.85)          # marquee canopy
    b.box(_m("cin_bulbs", "#f6e3a0"), -6.25, 6.25, ty - 2.85, ty - 2.78, 6.25, 6.4)
    b.box(glass, -4.3, 4.3, ty - .05, ty + .1, .3, 5.7); b.box(frame, -4.4, 4.4, ty - .1, ty + .1, .2, .32)     # glass lobby
    for k in range(7):
        mx = -4.3 + k * 8.6 / 6; b.box(frame, mx - .07, mx + .07, ty - .1, ty + .1, .3, 5.7)
    b.box(frame, -4.4, 4.4, ty - .1, ty + .1, 2.7, 2.82)
    for s in (-1, 1): b.box(glass, s * 6.5 - s * 2.6 - 1.15, s * 6.5 - s * 2.6 + 1.15, yf - .05, yf + .1, .9, 3.4)   # side entry doors
    return b.build(vc=True, recalc=False)

def entry_arch(name):
    """Curved PROMENADE AT COCONUT CREEK sign wall spanning two stone-based pillars, open below for pedestrians.
    Footprint 14.3 x 1.7 m; pillars at x = +-6.35 (1.7 m stone base, caps 6.0 m); sign wall bottom 2.85 m, top 4.6 m at the ends rising to 5.4 m."""
    b = Builder(name); st = _m("arch_st", "#e2c590"); trim = _trim(); stone = _stone(); tile = _tile()
    for s in (-1, 1):
        px = s * 6.35
        b.box(stone, px - .85, px + .85, -.85, .85, 0, 1.6); b.box(trim, px - .9, px + .9, -.9, .9, 1.6, 1.75)
        b.box(st, px - .7, px + .7, -.7, .7, 1.75, 5.3); b.box(trim, px - .88, px + .88, -.88, .88, 5.3, 5.55)
        b.prism(tile, (px - .85, px + .85, -.85, .85), (px - .1, px + .1, -.1, .1), 5.55, 6.05)
    xe = 5.65; n = 10; top = lambda x: 4.6 + .8 * (1 - (x / xe) ** 2)
    pts = [(-xe, 3.05), (xe, 3.05)] + [(xe - 2 * xe * k / n, top(xe - 2 * xe * k / n)) for k in range(n + 1)]
    _extrude_y(b, st, pts, -.3, .3)
    for k in range(n):                                                                                         # curved cap
        xa, xb = -xe + 2 * xe * k / n, -xe + 2 * xe * (k + 1) / n
        _extrude_y(b, trim, [(xa, top(xa) - .02), (xb, top(xb) - .02), (xb, top(xb) + .16), (xa, top(xa) + .16)], -.38, .38)
    b.box(trim, -xe, xe, -.36, .36, 2.85, 3.08)
    b.box(M("lp_promenade", "#ffffff", tex="sign_lp_promenade", fit=True, rough=.55), -4.75, 4.75, -.37, .37, 3.25, 4.95)
    return b.build(vc=True, recalc=False)

def _oct(r_flat, z, cx=0, cy=0):
    R = r_flat / math.cos(math.pi / 8); return [(cx + R * math.cos(math.pi / 8 + k * math.pi / 4), cy + R * math.sin(math.pi / 8 + k * math.pi / 4), z) for k in range(8)]

def _oct_ring(b, m, r_out, r_in, z0, z1):
    bm = b.bm; mi = b._mi(m); O0 = [bm.verts.new(p) for p in _oct(r_out, z0)]; O1 = [bm.verts.new(p) for p in _oct(r_out, z1)]
    I0 = [bm.verts.new(p) for p in _oct(r_in, z0)]; I1 = [bm.verts.new(p) for p in _oct(r_in, z1)]
    for k in range(8):
        q = (k + 1) % 8
        b._quad([O1[k], O1[q], I1[q], I1[k]], mi); b._quad([O0[k], O0[q], O1[q], O1[k]], mi); b._quad([I0[q], I0[k], I1[k], I1[q]], mi)

def fountain(name):
    """Octagonal fountain: 6.0 m flat-to-flat basin (6.5 m over the corners) with a stone step, water surface and a two-tier centre. Footprint 6.5 x 6.5 m."""
    b = Builder(name); st = _m("ftn_stone", "#e8d8b4"); st2 = _m("ftn_stone2", "#cdb994"); water = _m("water", "#3f9fd6", rough=.15); foam = _m("foam", "#bfe6f6", rough=.2)
    _oct_ring(b, st2, 3.0, 2.55, 0, .18)                                                                       # low step
    _oct_ring(b, st, 2.75, 2.35, .18, .62)                                                                     # basin rim
    b.poly(water, _oct(2.4, .48))
    b.cyl(st2, (0, 0, .45), .55, .9, "z", 8); b.cyl(st, (0, 0, 1.08), .45, .36, "z", 8, r2=1.35)               # pedestal + lower bowl
    b.cyl(water, (0, 0, 1.27), 1.22, .04, "z", 8)
    b.cyl(st2, (0, 0, 1.6), .28, .7, "z", 8); b.cyl(st, (0, 0, 2.05), .25, .26, "z", 8, r2=.78)                # upper tier
    b.cyl(water, (0, 0, 2.19), .68, .03, "z", 8); b.cyl(st, (0, 0, 2.38), .1, .4, "z", 6)
    b.cyl(foam, (0, 0, 2.7), .2, .38, "z", 6, r2=.04)                                                          # spout plume
    return b.build(vc=True, recalc=False)

def cafe_set(name, color="#c4542e"):
    """Café table + two chairs + market umbrella. Footprint 3.0 x 3.0 m (umbrella), 2.9 m tall."""
    b = Builder(name); dk = _m("cafe_metal", "#2b2b2e"); top = _m("cafe_top", "#e9e2d2"); can = _m("umb_" + color[1:], color); pole = _m("umb_pole", "#e9e2d2")
    b.cyl(dk, (0, 0, .36), .05, .72, "z", 6); b.cyl(top, (0, 0, .74), .45, .05, "z", 8); b.box(dk, -.25, .25, -.25, .25, 0, .04)
    for s in (-1, 1):
        cy = s * .78
        b.box(dk, -.22, .22, cy - .2, cy + .2, .44, .48); b.box(dk, -.04, .04, cy - .04, cy + .04, 0, .44)
        b.box(dk, -.22, .22, cy + s * .18, cy + s * .22, .48, .92)
    b.cyl(pole, (0, 0, 1.45), .035, 2.9, "z", 6); b.cyl(can, (0, 0, 2.45), 1.5, .5, "z", 8, r2=.07)
    return b.build(vc=True, recalc=False)

def bench(name):
    """Park bench: wood seat + back on two dark iron ends. Footprint 1.8 x 0.7 m, 0.9 m tall."""
    b = Builder(name); wood = _m("bench_wood", "#8a5a34"); dk = _m("bench_iron", "#2b2b2e")
    b.box(wood, -.9, .9, -.3, .15, .42, .48); b.box(wood, -.9, .9, .2, .27, .55, .9)
    for x in (-.78, .78): b.box(dk, x - .04, x + .04, -.32, .3, 0, .46); b.box(dk, x - .04, x + .04, .2, .3, .46, .82)
    return b.build(vc=True, recalc=False)

def planter(name):
    """Raised stucco/stone planter box with a clipped hedge top. Footprint 2.4 x 1.2 m, 1.25 m tall."""
    b = Builder(name); st = _m("plant_box", "#e2c590"); cap = _trim(); hedge = _m("hedge", "#3d7f34"); htop = _m("hedge_top", "#4f9a3e")
    b.box(st, -1.2, 1.2, -.6, .6, 0, .55); b.box(cap, -1.27, 1.27, -.67, .67, .55, .63)
    b.box(hedge, -1.08, 1.08, -.48, .48, .63, 1.1); b.box(htop, -1.0, 1.0, -.4, .4, 1.1, 1.25)
    return b.build(vc=True, recalc=False)

def lamp_post(name):
    """Black lantern street lamp for the lane. Footprint 0.5 x 0.5 m, 4.2 m tall."""
    b = Builder(name); dk = _m("lampmetal", "#23262a"); bulb = _m("bulb", "#f6e3a0")
    b.box(dk, -.22, .22, -.22, .22, 0, .4); b.cyl(dk, (0, 0, 1.9), .07, 3.1, "z", 6)
    b.box(dk, -.2, .2, -.2, .2, 3.4, 3.48); b.box(bulb, -.15, .15, -.15, .15, 3.48, 3.95); b.prism(dk, (-.25, .25, -.25, .25), (-.04, .04, -.04, .04), 3.95, 4.2)
    return b.build(vc=True, recalc=False)

# ---------------------------------------------------------------------------------------------------------------- trash mountain
TRASH_HF = dict(x0=-31.5, y0=-27.0, dx=1.5, nx=43, ny=37)      # nodes x0 + i*dx (i < nx), y0 + j*dx (j < ny): covers -31.5..31.5 x -27..27
TOP_Z = 22.0                                                    # flat dirt top
ROAD_W = 6.0
DECK_HW = 4.0                                                   # flat deck half-width in the height field (road colour is 3.0): the 1.5 m triangles stay flat across the 6 m road
_A0, _B0, _A1, _B1, _P = 31.0, 26.0, 10.0, 7.0, 2.6             # base / top superellipse semi-axes (x, y) and exponent
_GRADE = math.tan(math.radians(12.0))                           # haul road grade along its length
_BANK = 2.0                                                     # cut/fill bank slope next to the road (63 deg)
_PROFILE = ((0.0, 0.0), (.19, 6.4), (.31, 6.7), (.47, 12.2), (.59, 12.5), (.75, 17.6), (.87, 17.9), (1.0, TOP_Z))   # (t, z): 3 grassy benches

def _sgnpow(v, e): return math.copysign(abs(v) ** e, v)

def _axes(t): return _A0 + (_A1 - _A0) * t, _B0 + (_B1 - _B0) * t

def _contour_t(x, y):
    """t of the superellipse contour through (x, y): 0 = base outline, 1 = top outline (<0 outside, >1 inside the top)."""
    def f(t): a, b = _axes(t); return (abs(x) / a) ** _P + (abs(y) / b) ** _P
    if f(0.0) >= 1: return -((f(0.0) ** (1 / _P)) - 1) * 10
    if f(1.0) <= 1: return 1.0 + (1 - f(1.0) ** (1 / _P))
    lo, hi = 0.0, 1.0
    for _ in range(30):
        mid = (lo + hi) / 2
        if f(mid) < 1: lo = mid
        else: hi = mid
    return (lo + hi) / 2

def _contour_pt(t, psi):
    a, b = _axes(t); e = 2 / _P; return (a * _sgnpow(math.cos(psi), e), b * _sgnpow(math.sin(psi), e))

def _profile(t):
    if t <= 0: return 0.0
    if t >= 1: return TOP_Z
    for (t0, z0), (t1, z1) in zip(_PROFILE, _PROFILE[1:]):
        if t <= t1: return z0 + (z1 - z0) * (t - t0) / (t1 - t0)
    return TOP_Z

def _hash(i, j, k=0):
    h = (i * 73856093) ^ (j * 19349663) ^ (k * 83492791); h = (h ^ (h >> 13)) * 1274126177 & 0xffffffff; return (h & 0xffff) / 65535.0

_road_cache = None
def _road():
    """Centreline [(x, y, z, s)]: lead-in on the ground, then the grade-limited spiral whose plan position follows the contour where the
    smooth (bench-free) profile equals the road height, counter-clockwise from the SW corner, then a run onto the flat top."""
    global _road_cache
    if _road_cache: return _road_cache
    psi = math.radians(225.0); z = 0.0; pts = []; dpsi = math.radians(1.0)
    p = _contour_pt(0.0, psi); q = _contour_pt(0.0, psi + .02); tx, ty = q[0] - p[0], q[1] - p[1]; L = math.hypot(tx, ty); tx, ty = tx / L, ty / L
    for k in (8, 6, 4, 2): pts.append([p[0] - tx * k, p[1] - ty * k, 0.0])                                      # lead-in from the SW ground
    while True:
        t = z / TOP_Z * .985; x, y = _contour_pt(t, psi); pts.append([x, y, z])
        if z >= TOP_Z: break
        psi += dpsi; t2 = min(1.0, z / TOP_Z * .985); x2, y2 = _contour_pt(t2, psi)
        z = min(TOP_Z, z + _GRADE * math.hypot(x2 - x, y2 - y))
    (xa, ya, _), (xb, yb, _) = pts[-2], pts[-1]; L = math.hypot(xb - xa, yb - ya); tx, ty = (xb - xa) / L, (yb - ya) / L
    for k in (2, 4, 6): pts.append([xb + tx * k, yb + ty * k, TOP_Z])                                          # run onto the top
    s = 0.0; out = []
    for k, (x, y, zz) in enumerate(pts):
        if k: s += math.hypot(x - pts[k - 1][0], y - pts[k - 1][1])
        out.append((x, y, zz, s))
    _road_cache = out; return out

def trash_road(): return [(round(x, 2), round(y, 2), round(z, 2)) for x, y, z, s in _road()]

def _road_query(x, y):
    """Nearest point on the road centreline: (distance, z there), plus the cut/fill bounds over all segments."""
    R = _road(); best = (1e9, 0.0); lo, hi = -1e9, 1e9; hw = DECK_HW
    for (xa, ya, za, _), (xb, yb, zb, _) in zip(R, R[1:]):
        dx, dy = xb - xa, yb - ya; L2 = dx * dx + dy * dy
        u = max(0.0, min(1.0, ((x - xa) * dx + (y - ya) * dy) / L2)); px, py = xa + dx * u, ya + dy * u; d = math.hypot(x - px, y - py); zr = za + (zb - za) * u
        if d < best[0]: best = (d, zr)
        e = max(0.0, d - hw); lo = max(lo, zr - _BANK * e); hi = min(hi, zr + _BANK * e)
    return best, lo, hi

def _raw_height(x, y):
    t = _contour_t(x, y); h = _profile(t)
    if .02 < t < .98 and not any(t0 - .01 <= t <= t1 + .01 for (t0, _), (t1, _) in zip(_PROFILE[1::2], _PROFILE[2::2])):   # small lumps on the slopes, benches stay flat
        i, j = int(round(x / 1.5)), int(round(y / 1.5)); h += (_hash(i, j) - .5) * .45 * math.sin(math.pi * t)
    (d, zr), lo, hi = _road_query(x, y)
    if d <= DECK_HW: return zr
    if lo > hi: return (lo + hi) / 2
    return min(max(h, lo), hi)

_grid_cache = None
def trash_heights():
    """Node heights rows[j][i] on the TRASH_HF grid (the outer ring is 0)."""
    global _grid_cache
    if _grid_cache is None:
        g = TRASH_HF
        _grid_cache = [[round(max(0.0, _raw_height(g["x0"] + i * g["dx"], g["y0"] + j * g["dx"])), 3) if 0 < i < g["nx"] - 1 and 0 < j < g["ny"] - 1 else 0.0
                        for i in range(g["nx"])] for j in range(g["ny"])]
    return _grid_cache

def trash_height(x, y):
    """Terrain height (m) of the mound at local (x, y): triangle interpolation of trash_heights() (diagonal (i,j)-(i+1,j+1)), 0 outside the grid."""
    g = TRASH_HF; H = trash_heights(); fx = (x - g["x0"]) / g["dx"]; fy = (y - g["y0"]) / g["dx"]
    if not (0 <= fx <= g["nx"] - 1 and 0 <= fy <= g["ny"] - 1): return 0.0
    i = min(int(fx), g["nx"] - 2); j = min(int(fy), g["ny"] - 2); fx -= i; fy -= j
    h00, h10, h01, h11 = H[j][i], H[j][i + 1], H[j + 1][i], H[j + 1][i + 1]
    if fx >= fy: return h00 + fx * (h10 - h00) + fy * (h11 - h10)
    return h00 + fy * (h01 - h00) + fx * (h11 - h01)

def trash_road_stats(step=.5):
    """(max grade deg over 3 m windows, max cross-slope deg over the middle 4 m) measured on trash_height along the centreline."""
    R = _road(); samples = []
    for (xa, ya, _, sa), (xb, yb, _, sb) in zip(R, R[1:]):
        n = max(1, int((sb - sa) / step))
        for k in range(n): u = k / n; samples.append((xa + (xb - xa) * u, ya + (yb - ya) * u, sa + (sb - sa) * u, (xb - xa) / (sb - sa), (yb - ya) / (sb - sa)))
    gmax = 0.0; cmax = 0.0
    for k in range(len(samples) - 6):
        x0, y0, s0, tx, ty = samples[k]; x1, y1, s1, _, _ = samples[k + 6]
        gmax = max(gmax, math.degrees(math.atan2(abs(trash_height(x1, y1) - trash_height(x0, y0)), s1 - s0)))
        cmax = max(cmax, math.degrees(math.atan2(abs(trash_height(x0 - ty * 2, y0 + tx * 2) - trash_height(x0 + ty * 2, y0 - tx * 2)), 4.0)))
    return gmax, cmax

def trash_mountain(name):
    """Landfill mound: 62 x 52 m base (inside the 63 x 54 m TRASH_HF grid), 22 m tall, 3 grassy benches, a 6 m dirt haul road spiralling up
    counter-clockwise from the SW ground to a flat ~20 x 14 m dirt top, a grey liner patch on the east face, gas vents on the benches and top.
    The surface is the trash_height grid itself (shared vertices, same triangles); fully flat ground cells (z=0) are left out so the
    world's ground shows there. Vertex-coloured (one draw call)."""
    g = TRASH_HF; Hn = trash_heights(); nx, ny, dx = g["nx"], g["ny"], g["dx"]; b = Builder(name); bm = b.bm
    V = [[bm.verts.new((g["x0"] + i * dx, g["y0"] + j * dx, Hn[j][i])) for i in range(nx)] for j in range(ny)]
    road = _m("tm_road", "#b8925e"); top = _m("tm_top", "#c29c68"); bank = _m("tm_bank", "#b48c5c"); liner = _m("tm_liner", "#686c71"); liner2 = _m("tm_liner2", "#5b5f64")
    grass = [_m("tm_grass1", "#5f9a3a"), _m("tm_grass2", "#578f35"), _m("tm_grass3", "#66a03e")]; bench_g = _m("tm_bench", "#9ccb5c")
    for j in range(ny - 1):
        for i in range(nx - 1):
            for tri in ((V[j][i], V[j][i + 1], V[j + 1][i + 1]), (V[j][i], V[j + 1][i + 1], V[j + 1][i])):
                zs = [v.co.z for v in tri]
                if max(zs) < .01: continue
                cx = sum(v.co.x for v in tri) / 3; cy = sum(v.co.y for v in tri) / 3
                e1 = tri[1].co - tri[0].co; e2 = tri[2].co - tri[0].co; n = e1.cross(e2).normalized(); t = _contour_t(cx, cy)
                (d, zr), _, _ = _road_query(cx, cy); cz = sum(zs) / 3
                a = math.degrees(math.atan2(cy / _B0, cx / _A0))
                if d <= ROAD_W / 2 + .15: m = road
                elif t >= .995: m = top
                elif -28 < a < 32 and .58 < t < .97 and d > ROAD_W / 2 + 2: m = liner if (i + j) % 2 else liner2
                elif n.z < .42 and d < DECK_HW + 5 and cz > zr + .3: m = bank                                   # raw cut faces above the road (fill below stays grassy)
                elif n.z > .93 and t > .05: m = bench_g
                else: m = grass[int(_hash(i // 3, j // 3, 1) * 3) % 3]
                b._quad(list(tri), b._mi(m))
    pipe = _m("tm_pipe", "#4b4e53"); capm = _m("tm_cap", "#2a2c30"); pad = _m("tm_pad", "#b4b0a8")
    vents = []
    for tb, ang0 in ((.315, 20), (.615, 65), (.88, 110)):                                                       # vents on the benches
        for k in range(4):
            psi = math.radians(ang0 + k * 90 + 17 * k); x, y = _contour_pt(tb, psi)
            if _road_query(x, y)[0][0] > ROAD_W / 2 + 1.5: vents.append((x, y))
    for (x, y) in ((-5, 3), (4, -2.5), (6, 4), (-3, -4)): vents.append((x, y))
    for (x, y) in vents:
        z = trash_height(x, y); b.box(pad, x - .6, x + .6, y - .6, y + .6, z - .3, z + .1)
        b.cyl(pipe, (x, y, z + .8), .18, 1.4, "z", 6); b.cyl(capm, (x, y, z + 1.55), .26, .18, "z", 6)
    zt = trash_height(-1.0, 1.0); b.box(_m("tm_shed", "#e2e0d8"), -2.2, -.2, .2, 1.8, zt - .2, zt + 1.4)     # little monitoring box on top
    return b.build(vc=True, recalc=False)

KIT = {"shop_row": shop_row, "cinema": cinema, "entry_arch": entry_arch, "fountain": fountain, "cafe_set": cafe_set, "bench": bench,
       "planter": planter, "lamp_post": lamp_post, "trash_mountain": trash_mountain}
