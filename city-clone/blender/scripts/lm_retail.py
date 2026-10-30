"""Retail / civic landmarks from the concept sheets: Publix supermarket (art/coconut-14) and the police station (art/coconut-13).
Every maker returns ONE built object centred on the origin (footprint centre x=0, y=0), ground at z=0, entrance toward -y, like building_fl / district_kits.
Sign textures come from scripts/tex_retail.py (run it with python3 first, it writes out/tex/sign_lr_*.png and lr_stone.png)."""
import sys, os, math, random; sys.path.insert(0, os.path.dirname(__file__)); from kit import *

SM_WALL = "#e4d0a8"           # tan stucco; tex_retail.py paints the Publix sign on exactly this colour
PD_BLUE = "#2e5b97"           # police blue; same in tex_retail.py

def _solid_xz(b, m, pts, y0, y1):
    """Extrude a convex polygon given in the XZ plane (list of (x, z)) from y0 to y1: arched parapets, curved cornices."""
    bm = b.bm; mi = b._mi(m)
    f = [bm.verts.new((x, y0, z)) for x, z in pts]; k = [bm.verts.new((x, y1, z)) for x, z in pts]; n = len(pts)
    b._quad(f, mi); b._quad(k[::-1], mi)
    for i in range(n): b._quad([f[i], f[(i + 1) % n], k[(i + 1) % n], k[i]], mi)

def _rod(b, m, p0, p1, r=.035):
    """Thin straight rod between two points that share x (awning / canopy tie rods)."""
    x = p0[0]; b.prism(m, (x - r, x + r, p0[1] - r, p0[1] + r), (x - r, x + r, p1[1] - r, p1[1] + r), p0[2], p1[2])

def _awning(b, m, rib, x0, x1, y_wall, depth, z_hi, z_lo, ribs=1.0):
    """Slanted standing-seam metal awning on a -y facing wall: slab + raised seams + front valance."""
    yo = y_wall - depth
    b.prism(m, (x0, x1, yo, yo + .12), (x0, x1, y_wall - .12, y_wall), z_lo, z_hi)
    n = max(1, int((x1 - x0) / ribs))
    for i in range(1, n):
        x = x0 + i * (x1 - x0) / n; b.prism(rib, (x - .04, x + .04, yo, yo + .12), (x - .04, x + .04, y_wall - .12, y_wall), z_lo + .07, z_hi + .07)
    b.box(m, x0, x1, yo - .05, yo + .05, z_lo - .32, z_lo + .05)

def _ac(b, grey, dark, x, y, z, w=2.2, d=1.6, h=1.1):
    b.box(grey, x - w / 2, x + w / 2, y - d / 2, y + d / 2, z, z + h); b.box(dark, x - w / 2 + .25, x + w / 2 - .25, y - d / 2 + .2, y + d / 2 - .2, z + h, z + h + .08)
    b.box(dark, x - w / 2 - .02, x + w / 2 + .02, y - d / 2 + .3, y - d / 2 + .5, z + .25, z + h - .25)


from backs import dress_wall
def supermarket(name="palm_market"):
    """Publix grocery anchor (concept art/coconut-14). Footprint 46 x 28 m (w x d): the main box spans x -23..23, y -14..14.
    Walls 7.4 m (+ parapet to ~8.2), the raised entrance bay with the arched sign parapet reaches 11.4 m; pilasters and awnings stick out up to ~3.6 m in front (to y = -17.6)."""
    b = Builder(name); W, D = 46.0, 28.0; hx, hy = W / 2, D / 2; H = 7.4; P = 8.1
    wall = M("lr_tan", SM_WALL); brown = M("lr_brown", "#a8805c"); green = M("lr_green", "#4f7a4c"); rib = M("lr_green_rib", "#628d5c")
    stone = M("lr_stone", "#a49883", tex="lr_stone", tile=1.6); glass = M("lr_glass", "#2f414b", rough=.2); frame = M("lr_frame", "#4a4d50")
    roofm = M("lr_roof", "#c4c1ba"); grey = M("lr_ac", "#a9adb4"); dark = M("lr_acdark", "#5d6166"); lamp = M("lr_sconce", "#2c2e30"); trim = M("lr_trim", "#efe4c8")
    sign = M("lr_sign_palm", "#ffffff", tex="sign_lr_palmmarket", fit=True)
    # main box, roof membrane, perimeter parapet with green cap
    b.box(wall, -hx, hx, -hy, hy, 0, H); b.box(roofm, -hx + .45, hx - .45, -hy + .45, hy - .45, H, H + .05)
    t = .45
    for (x0, x1, y0, y1) in ((-hx, hx, -hy, -hy + t), (-hx, hx, hy - t, hy), (-hx, -hx + t, -hy, hy), (hx - t, hx, -hy, hy)):
        b.box(wall, x0, x1, y0, y1, H, P)
        b.box(green, x0 - .12, x1 + .12, y0 - .12, y1 + .12, P, P + .3)
    b.box(green, -hx - .1, hx + .1, -hy - .1, -hy + .1, P - .55, P - .4)                                     # front cornice line
    b.box(wall, -8, 16, hy - 2.2, hy, P, P + 1.1); b.box(green, -8.12, 16.12, hy - 2.32, hy + .12, P + 1.1, P + 1.35)   # raised back parapet step
    b.box(trim, -hx - .03, hx + .03, -hy - .03, hy + .03, 5.0, 5.15)                                        # reveal line above the awnings
    # corner pilasters (brown, stone base, green cap), wrapping both corners of the front
    def pilaster(x0, x1, y0, y1, top, base=2.3):
        b.box(brown, x0, x1, y0, y1, 0, top); b.box(green, x0 - .12, x1 + .12, y0 - .12, y1 + .12, top, top + .3)
        b.box(stone, x0 - .1, x1 + .1, y0 - .1, y1 + .1, 0, base); b.box(trim, x0 - .14, x1 + .14, y0 - .14, y1 + .14, base, base + .15)
    for s in (-1, 1):
        xa, xb = sorted((s * hx, s * (hx - 2.4))); pilaster(xa - (.25 if s < 0 else 0), xb + (.25 if s > 0 else 0), -hy - .35, -hy + 2.2, P + .45)
        xa, xb = sorted((s * hx, s * (hx - 2.0))); pilaster(xa - (.25 if s < 0 else 0), xb + (.25 if s > 0 else 0), hy - 2.0, hy + .25, P + .3, 1.2)   # back corners
    # wing storefronts: glass bands with mullions, standing-seam green awnings, sconces
    for s in (-1, 1):
        xa, xb = sorted((s * 10.2, s * (hx - 2.8)))
        b.box(frame, xa, xb, -hy - .05, -hy, .5, 3.9); n = int((xb - xa) / 2.4)
        for i in range(n):
            u0 = xa + i * (xb - xa) / n + .12; u1 = xa + (i + 1) * (xb - xa) / n - .12
            b.box(glass, u0, u1, -hy - .09, -hy - .05, .62, 3.78)
        b.box(stone, xa, xb, -hy - .12, -hy, 0, .5)
        _awning(b, green, rib, xa - .2, xb + .2, -hy, 1.5, 4.75, 4.2)
        for x in (xa + 2.5, xb - 2.5): b.box(lamp, x - .2, x + .2, -hy - .25, -hy, 5.6, 6.1)
    # entrance bay: two tall brown towers with stone bases, the arched sign parapet between them
    yf = -hy - 1.3; TOP = 10.3
    for s in (-1, 1):
        xa, xb = sorted((s * 6.4, s * 9.6)); pilaster(xa, xb, yf - .3, -hy + 1.0, TOP, 2.7)
        b.box(lamp, (xa + xb) / 2 - .22, (xa + xb) / 2 + .22, yf - .55, yf - .3, 6.0, 6.55)
    b.box(wall, -6.4, 6.4, yf, -hy + 1.0, 0, 9.8)
    arc = [(-6.4 + 12.8 * i / 12, 9.8 + 1.6 * math.sin(math.pi * i / 12)) for i in range(13)]
    _solid_xz(b, wall, [(-6.4, 9.0)] + arc + [(6.4, 9.0)], yf, -hy + .7)
    for i in range(12):                                                                                     # green curved cornice band
        (xa, za), (xb, zb) = arc[i], arc[i + 1]
        _solid_xz(b, green, [(xa - .02, za - .05), (xb + .02, zb - .05), (xb + .02, zb + .32), (xa - .02, za + .32)], yf - .18, -hy + .85)
    b.box(sign, -5.9, 5.9, yf - .07, yf, 7.0, 9.65)
    # entrance glass, automatic doors, entrance awning on tie rods
    b.box(frame, -6.0, 6.0, yf - .05, yf, 0, 3.7)
    for (u0, u1) in ((-5.9, -3.25), (-3.1, -.05), (.05, 3.1), (3.25, 5.9)): b.box(glass, u0, u1, yf - .09, yf - .05, .08 if abs(u0) < 4 else .5, 3.6)
    b.box(frame, -3.1, 3.1, yf - .14, yf - .05, 2.62, 2.74); b.box(stone, -6.0, -3.25, yf - .12, yf, 0, .5); b.box(stone, 3.25, 6.0, yf - .12, yf, 0, .5)
    _awning(b, green, rib, -6.2, 6.2, yf, 1.9, 4.95, 4.35)
    for x in (-4.6, 4.6): _rod(b, frame, (x, yf - 1.8, 4.45), (x, yf - .05, 6.6))
    # sides and back: pilasters, a front-corner awning on each side, loading doors at the back
    for s in (-1, 1):
        xw = s * hx; xo0, xo1 = sorted((xw, xw + s * .3))
        for y in (-4.0, 4.0): b.box(brown, xo0, xo1, y - .9, y + .9, 0, P + .2)
        b.box(lamp, *sorted((xw, xw + s * .25)), -8.5, -8.1, 5.6, 6.1); b.box(lamp, *sorted((xw, xw + s * .25)), 9.8, 10.2, 5.6, 6.1)
        b.prism(green, (*sorted((xw + s * 1.8, xw + s * 1.95)), -11.6, -7.6), (*sorted((xw, xw + s * .12)), -11.6, -7.6), 3.4, 4.1)        # side awning
        b.box(frame, *sorted((xw, xw + s * .06)), -11.3, -7.9, .5, 3.2); b.box(glass, *sorted((xw, xw + s * .09)), -11.15, -8.05, .62, 3.08)
    for x in (-12.0, -6.5, 6.5):
        b.box(dark, x - 1.6, x + 1.6, hy, hy + .1, 0, 3.6); b.box(grey, x - 1.9, x + 1.9, hy, hy + .5, 3.6, 3.8)
    b.box(dark, 14.0, 15.2, hy, hy + .1, 0, 2.3)
    seam = M("lr_roof_seam", "#b7b4ad")                                                                     # faint membrane seams + hatch
    for k in range(1, 7): x = -hx + k * W / 7; b.box(seam, x - .06, x + .06, -hy + .45, hy - .45, H + .05, H + .07)
    b.box(grey, -18.5, -17.5, -6.5, -5.5, H + .05, H + .45)
    # round 27: the camera turns with the car, so the back and sides are seen too: base band, pilasters, a Publix sign on the back and on the east side
    dress_wall(b, "y", hy, 1, -hx + 2.2, hx - 2.2, H, wall_hex="#c9b48f", base_hex="#a49883", doors=0, sign=sign, sign_w=10.0, sign_h=2.7, sign_z=4.15, seed=3)
    dress_wall(b, "x", hx, 1, -6.0, hy - 2.2, H, wall_hex="#c9b48f", base_hex="#a49883", doors=1, sign=sign, sign_w=8.0, sign_h=2.2, sign_z=4.6, seed=4)
    dress_wall(b, "x", -hx, -1, -6.0, hy - 2.2, H, wall_hex="#c9b48f", base_hex="#a49883", doors=1, seed=5)
    # rooftop AC units
    for (x, y) in ((-14, 5), (6, 7), (15, -2), (-3, -4)): _ac(b, grey, dark, x, y, H + .05)
    _ac(b, grey, dark, 9.5, 7, H + .05, 3.0, 2.0, 1.4)
    return b.build(vc=True)


def police_station(name="police_station"):
    """Police station (concept art/coconut-13). Footprint 30 x 20 m (w x d): main block x -15..15, y -10..10, two storeys = 7.5 m (+ parapet).
    Blue entrance tower 10.6 m at x -5..3; canopy, planters and the flagpole (x -12) sit in front, out to y ~ -17."""
    b = Builder(name); hx, hy = 15.0, 10.0; H = 7.5; P = 8.3
    cream = M("lr_pd_cream", "#e7dbc3"); blue = M("lr_pd_blue", PD_BLUE); cope = M("lr_pd_cope", "#f4efe3"); roofm = M("lr_pd_roof", "#9c9993")
    glass = M("lr_pd_glass", "#264a63", rough=.2); frame = M("lr_pd_frame", "#dcd8ce"); mull = M("lr_pd_mullion", "#1d3a62"); grey = M("lr_ac", "#a9adb4"); dark = M("lr_acdark", "#5d6166")
    conc = M("lr_pd_conc", "#c9c4b6"); canm = M("lr_pd_canopy", "#a9aaa8"); hedge = M("lr_pd_hedge", "#4b7d36"); hedge2 = M("lr_pd_hedge2", "#5d9142"); mulch = M("lr_pd_mulch", "#6b4a32"); lamp = M("lr_pd_lamp", "#f3f0e6", emit=.6)
    pole = M("lr_pd_pole", "#9aa0a6"); gold = M("lr_pd_gold", "#d9a93a"); red = M("lr_pd_red", "#b8262c"); white = M("lr_pd_white", "#f2f0ea"); navy = M("lr_pd_navy", "#26336b")
    sign = M("lr_sign_police", "#ffffff", tex="sign_lr_police", fit=True)
    # main block + parapet + coping, flat roof
    b.box(cream, -hx, hx, -hy, hy, 0, H); b.box(roofm, -hx + .4, hx - .4, -hy + .4, hy - .4, H, H + .05); t = .4
    for (x0, x1, y0, y1) in ((-hx, hx, -hy, -hy + t), (-hx, hx, hy - t, hy), (-hx, -hx + t, -hy, hy), (hx - t, hx, -hy, hy)):
        b.box(cream, x0, x1, y0, y1, H, P); b.box(cope, x0 - .12, x1 + .12, y0 - .12, y1 + .12, P, P + .22)
    # blue base + blue stripe band all round, vertical panel joints
    b.box(blue, -hx - .04, hx + .04, -hy - .04, hy + .04, 0, .55); b.box(blue, -hx - .04, hx + .04, -hy - .04, hy + .04, 6.15, 6.6)
    for x in (-10, -5, 5, 10):
        b.box(conc, x - .04, x + .04, -hy - .06, -hy, .55, P); b.box(conc, x - .04, x + .04, hy, hy + .06, .55, P)
    for y in (-5, 0, 5):
        b.box(conc, -hx - .06, -hx, y - .04, y + .04, .55, P); b.box(conc, hx, hx + .06, y - .04, y + .04, .55, P)
    # punched windows, two floors, on every face except behind the tower
    def window(face, u, z0, z1, wdt=2.6):
        if face == "S": b.box(frame, u - wdt / 2 - .15, u + wdt / 2 + .15, -hy - .08, -hy, z0 - .15, z1 + .15); b.box(glass, u - wdt / 2, u + wdt / 2, -hy - .11, -hy - .08, z0, z1); b.box(frame, u - .04, u + .04, -hy - .14, -hy - .11, z0, z1)
        elif face == "N": b.box(frame, u - wdt / 2 - .15, u + wdt / 2 + .15, hy, hy + .08, z0 - .15, z1 + .15); b.box(glass, u - wdt / 2, u + wdt / 2, hy + .08, hy + .11, z0, z1)
        else:
            s = 1 if face == "E" else -1; xw = s * hx
            b.box(frame, *sorted((xw, xw + s * .08)), u - wdt / 2 - .15, u + wdt / 2 + .15, z0 - .15, z1 + .15); b.box(glass, *sorted((xw + s * .08, xw + s * .11)), u - wdt / 2, u + wdt / 2, z0, z1)
            b.box(frame, *sorted((xw + s * .11, xw + s * .14)), u - .04, u + .04, z0, z1)
    for (z0, z1) in ((1.2, 3.0), (4.1, 5.8)):
        for u in (-12.5, -7.5, 7.5, 12.5): window("S", u, z0, z1)
        for u in (-11, -4, 4, 11): window("N", u, z0, z1)
        for u in (-6, 0, 6): window("E", u, z0, z1, 2.4); window("W", u, z0, z1, 2.4)
    for u in (-12.5, -7.5, 7.5, 12.5): b.box(dark, u - .2, u + .2, -hy - .2, -hy, 3.45, 3.8)                     # wall sconces between floors
    # blue entrance tower: glass curtain wall, POLICE sign, canopy on tie rods, doors
    tx0, tx1, ty0, ty1 = -5.0, 3.0, -hy - 1.2, -hy + 6.0; TH = 10.6; cx = (tx0 + tx1) / 2
    b.box(blue, tx0, tx1, ty0, ty1, 0, TH); b.box(roofm, tx0 + .35, tx1 - .35, ty0 + .35, ty1 - .35, TH, TH + .05)
    for (x0, x1, y0, y1) in ((tx0, tx1, ty0, ty0 + .35), (tx0, tx1, ty1 - .35, ty1), (tx0, tx0 + .35, ty0, ty1), (tx1 - .35, tx1, ty0, ty1)):
        b.box(blue, x0, x1, y0, y1, TH, TH + .7); b.box(cope, x0 - .12, x1 + .12, y0 - .12, y1 + .12, TH + .7, TH + .92)
    b.box(sign, cx - 2.9, cx + 2.9, ty0 - .07, ty0, 8.45, 10.0)
    gx0, gx1 = cx - 2.7, cx + 2.7
    b.box(mull, gx0 - .12, gx1 + .12, ty0 - .06, ty0, .2, 8.0)
    for i in range(3):
        for (z0, z1) in ((4.15, 5.95), (6.1, 7.85)):
            u0 = gx0 + i * (gx1 - gx0) / 3 + .07; u1 = gx0 + (i + 1) * (gx1 - gx0) / 3 - .07; b.box(glass, u0, u1, ty0 - .1, ty0 - .06, z0, z1)
    for (u0, u1) in ((gx0 + .07, cx - 1.25), (cx - 1.15, cx - .03), (cx + .03, cx + 1.15), (cx + 1.25, gx1 - .07)): b.box(glass, u0, u1, ty0 - .1, ty0 - .06, .25, 3.15)
    b.box(mull, cx - 1.2, cx + 1.2, ty0 - .14, ty0 - .06, 2.6, 2.7)
    b.box(canm, cx - 3.4, cx + 3.4, ty0 - 2.0, ty0, 3.5, 3.75); b.box(frame, cx - 3.4, cx + 3.4, ty0 - 2.0, ty0 - 1.88, 3.38, 3.75)     # canopy slab
    for x in (cx - 2.6, cx + 2.6): _rod(b, pole, (x, ty0 - 1.8, 3.75), (x, ty0 - .05, 6.0))
    for x in (tx0 - .35, tx1 + .05): b.box(lamp, x, x + .3, ty0 - .25, ty0 + .05, 2.2, 2.9)
    b.box(conc, cx - 3.0, cx + 3.0, ty0 - 3.2, ty0, 0, .12)                                                      # entry slab
    # second raised roof block (behind, to the east) + rooftop AC
    rx0, rx1, ry0, ry1 = 1.5, 11.5, -2.0, 7.5; RH = H + 2.3
    b.box(cream, rx0, rx1, ry0, ry1, H, RH); b.box(roofm, rx0 + .35, rx1 - .35, ry0 + .35, ry1 - .35, RH, RH + .05)
    for (x0, x1, y0, y1) in ((rx0, rx1, ry0, ry0 + .35), (rx0, rx1, ry1 - .35, ry1), (rx0, rx0 + .35, ry0, ry1), (rx1 - .35, rx1, ry0, ry1)):
        b.box(cream, x0, x1, y0, y1, RH, RH + .5); b.box(cope, x0 - .1, x1 + .1, y0 - .1, y1 + .1, RH + .5, RH + .68)
    _ac(b, grey, dark, 6.5, 3.0, RH + .05, 2.0, 1.6, 1.2); _ac(b, grey, dark, cx, ty0 + 3.2, TH + .05, 1.8, 1.4, 1.0)
    _ac(b, grey, dark, 10.0, -5.5, H + .05, 2.2, 1.8, 1.1); _ac(b, grey, dark, -10.0, 4.0, H + .05, .9, .9, .6)
    # low planters with chunky hedges along the front, one island in front of the entrance
    rng = random.Random(4)
    def planter(x0, x1, y0, y1):
        b.box(conc, x0, x1, y0, y1, 0, .35); b.box(mulch, x0 + .15, x1 - .15, y0 + .15, y1 - .15, .35, .4)
        n = max(1, int((x1 - x0) / 1.3))
        for i in range(n):
            u = x0 + .25 + (i + .5) * (x1 - x0 - .5) / n; hgt = rng.uniform(.85, 1.15); hw = rng.uniform(.5, .62)
            b.box(hedge if i % 2 else hedge2, u - hw, u + hw, (y0 + y1) / 2 - .5, (y0 + y1) / 2 + .5, .35, .35 + hgt)
    planter(-14.6, -5.6, -hy - 1.9, -hy - .1); planter(3.6, 14.6, -hy - 1.9, -hy - .1); planter(cx + 1.5, cx + 6.5, -hy - 6.0, -hy - 4.4)
    # flagpole with a simple US-style flag (7 stripes + canton), on a small plinth
    fx, fy = -12.0, -hy - 5.0; FH = 10.5
    b.box(conc, fx - .9, fx + .9, fy - .9, fy + .9, 0, .3); b.cyl(pole, (fx, fy, FH / 2), .08, FH, "z", 8); b.cyl(gold, (fx, fy, FH + .12), .16, .25, "z", 8)
    fw, fh = 3.4, 1.8; ftop = FH - .25; sh = fh / 7
    for k in range(7):
        z1 = ftop - k * sh; b.box(red if k % 2 == 0 else white, fx + .1, fx + .1 + fw, fy - .02, fy + .02, z1 - sh, z1)
    b.box(navy, fx + .1, fx + .1 + fw * .42, fy - .035, fy + .035, ftop - sh * 4, ftop)
    return b.build(vc=True)


def tris(o):
    return sum(len(p.vertices) - 2 for p in o.data.polygons)
