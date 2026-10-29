"""Civic / recreation pieces for the Coconut Creek districts: tennis courts, playground, sports field with running track, school bus (static), bleachers.
All axis-aligned boxes in Blender metres (x east, y north); `cb(x, y, w, d, soft)` registers a collider, `cc(x, y, r, soft)` a circle."""
import sys, os, math; sys.path.insert(0, os.path.dirname(__file__)); from kit import *

def civic_mats():
    return dict(court_apron=M("court_apron", "#3f7a52"), court_blue=M("court_blue", "#3d76ad"), line=M("paint_white", "#e8e5da"), net=M("net_grey", "#3a3d40"), fence=M("fence_green", "#2a4a34"),
                rubber_r=M("rubber_red", "#b5503a"), rubber_b=M("rubber_blue", "#2f5f9a"), rubber_y=M("rubber_yel", "#d8a830"), sail=M("shade_sail", "#2f78c0", rough=.7), post=M("play_post", "#8a8d92"),
                turf=M("field_green", "#4c9a45"), turf2=M("field_green2", "#58a84e"), track=M("track_red", "#b3503c", rough=.9), steel=M("steel", "#b8bcc4"), yellow=M("bus_yellow", "#f2b61c", rough=.5),
                dark=M("bus_dark", "#1e2328", rough=.4), glass=M("bus_glass", "#2a4656", rough=.2), pole_y=M("goal_yellow", "#e8c02c"), red=M("play_red", "#c8362a"), ylw=M("play_yel", "#f0c030"))

def tennis_court(b, cm, cb, x, y):
    """Apron 13 x 28, court 11 x 24 (long axis = y), net, white lines, fence rails + posts."""
    A = 6.5
    b.box(cm["court_apron"], x - A, x + A, y - 14, y + 14, .03, .04); b.box(cm["court_blue"], x - 5.5, x + 5.5, y - 11.9, y + 11.9, .04, .05); L = cm["line"]; z0, z1 = .05, .056
    for sx in (-5.5, 5.5): b.box(L, x + sx - .04, x + sx + .04, y - 11.9, y + 11.9, z0, z1)
    for sy in (-11.9, 11.9, -6.4, 6.4): b.box(L, x - 5.5, x + 5.5, y + sy - .04, y + sy + .04, z0, z1)
    b.box(L, x - .04, x + .04, y - 6.4, y + 6.4, z0, z1)
    b.box(cm["net"], x - 6.0, x + 6.0, y - .03, y + .03, .05, 1.0)
    for sx in (-6.0, 6.0): b.box(cm["post"], x + sx - .06, x + sx + .06, y - .06, y + .06, .05, 1.1)
    F = A + .2
    for (x0, x1, y0, y1) in ((x - F, x + F, y - 14.2, y - 14.1), (x - F, x + F, y + 14.1, y + 14.2), (x - F, x - F + .1, y - 14.2, y + 14.2), (x + F - .1, x + F, y - 14.2, y + 14.2)):
        b.box(cm["fence"], x0, x1, y0, y1, 2.9, 3.0); b.box(cm["fence"], x0, x1, y0, y1, 1.4, 1.46)
    for k in range(-4, 5):
        for (px, py) in ((x - F + .05, y + k * 3.5), (x + F - .05, y + k * 3.5)): b.box(cm["fence"], px - .05, px + .05, py - .05, py + .05, 0, 3.0)
    for k in range(-2, 3):
        for py in (y - 14.15, y + 14.15): b.box(cm["fence"], x + k * 3.2 - .05, x + k * 3.2 + .05, py - .05, py + .05, 0, 3.0)
    cb(x, y - 14.15, 2 * F, .3, "bush"); cb(x, y + 14.15, 2 * F, .3, "bush"); cb(x - F + .05, y, .3, 28.4, "bush"); cb(x + F - .05, y, .3, 28.4, "bush")

def playground(b, cm, cb, cc, x, y, w=10, d=10):
    b.box(cm["rubber_r"], x - w / 2, x + w / 2, y - d / 2, y + d / 2, .03, .06); b.box(cm["rubber_b"], x - w / 2 + 1, x + 0, y - d / 2 + 1, y + 1, .06, .075); b.box(cm["rubber_y"], x + 0.5, x + w / 2 - 1, y + 1.5, y + d / 2 - 1, .06, .075)
    for sx in (-1, 1):
        for sy in (-1, 1): b.cyl(cm["post"], (x + sx * (w / 2 - .6), y + sy * (d / 2 - .6), 1.7), .07, 3.4, "z", 6); cc(x + sx * (w / 2 - .6), y + sy * (d / 2 - .6), .1, "pole")
    b.prism(cm["sail"], (x - w / 2 + .2, x + w / 2 - .2, y - d / 2 + .2, y + d / 2 - .2), (x - 1.2, x + 1.2, y - 1.2, y + 1.2), 3.2, 3.9)                  # shade sail roof
    b.box(cm["red"], x - 3.6, x - 1.6, y - 2.4, y - .8, .1, 1.2); b.box(cm["ylw"], x - 3.6, x - 1.6, y - 2.4, y - 2.0, 1.2, 1.9)                    # climbing frame
    b.box(cm["steel"], x + 1.0, x + 1.5, y - 3.2, y - .6, .1, 1.5); b.prism(cm["steel"], (x + 1.0, x + 1.5, y - .6, y - .6), (x + 1.0, x + 1.5, y + 1.8, y + 1.8), 1.5, .2)  # slide
    for sx in (-.9, .9): b.box(cm["post"], x + 2.5 + sx - .04, x + 2.5 + sx + .04, y + 2.0, y + 2.1, 0, 2.0)                                            # swing set
    b.box(cm["post"], x + 1.5, x + 3.5, y + 2.0, y + 2.1, 1.95, 2.05)
    cb(x - 2.6, y - 1.6, 2.2, 1.8, "bush")

def field(b, cm, x, y, w=16, d=30, stripes=8, bleachers=True):
    """Football field (long axis y) with mowing stripes, lines, goals and bleachers on the west side."""
    sh = d / stripes
    for k in range(stripes): b.box(cm["turf"] if k % 2 else cm["turf2"], x - w / 2, x + w / 2, y - d / 2 + k * sh, y - d / 2 + (k + 1) * sh, .03, .04)
    L = cm["line"]
    for (x0, x1, y0, y1) in ((x - w / 2, x + w / 2, y - d / 2, y - d / 2 + .15), (x - w / 2, x + w / 2, y + d / 2 - .15, y + d / 2), (x - w / 2, x - w / 2 + .15, y - d / 2, y + d / 2), (x + w / 2 - .15, x + w / 2, y - d / 2, y + d / 2), (x - w / 2, x + w / 2, y - .07, y + .07)):
        b.box(L, x0, x1, y0, y1, .04, .046)
    for sy in (-1, 1):
        gy = y + sy * (d / 2 + .6)
        for sx in (-1.5, 1.5): b.box(cm["pole_y"], x + sx - .05, x + sx + .05, gy - .05, gy + .05, 0, 3.0)
        b.box(cm["pole_y"], x - 1.55, x + 1.55, gy - .05, gy + .05, 3.0, 3.1)
    if not bleachers: return
    bx = x - w / 2 - 3.2
    for k in range(4): b.box(cm["steel"], bx - k * .0 - 1.2 + 0, bx + 1.2 + 0, y - 6, y + 6, 0, .45 + k * .45) if False else b.box(cm["steel"], bx - k * .7, bx - k * .7 + .7, y - 6, y + 6, 0, .5 + k * .5)

def make_bus(name="bus"):
    cmt = civic_mats(); b = Builder(name); hx, hy = 1.3, 5.0
    b.box(cmt["yellow"], -hx, hx, -hy, hy, .55, 2.95); b.box(cmt["dark"], -hx - .02, hx + .02, -hy, hy, .35, .6)
    for sx in (-1, 1): b.box(cmt["glass"], sx * hx - (0 if sx > 0 else .03), sx * hx + (.03 if sx > 0 else 0), -hy + 1.4, hy - .6, 1.7, 2.55)
    b.box(cmt["glass"], -hx + .15, hx - .15, -hy - .03, -hy, 1.6, 2.7); b.box(cmt["dark"], -hx, hx, -hy - .05, -hy + .02, .35, .7)
    b.box(cmt["dark"], -hx - .02, hx + .02, hy - 3.2, hy - 3.1, .6, 2.9) if False else None
    for sy_ in (-3.8, 3.2):
        for sx in (-1, 1): b.cyl(cmt["dark"], (sx * (hx - .1), sy_, .5), .52, .3, "x", 10)
    return b.build()

def basketball(b, cm, cb, x, y):
    """Outdoor court 15 x 9 (long axis x): blue apron, orange key areas, lines, two hoops."""
    b.box(cm["court_blue"], x - 7.5, x + 7.5, y - 4.5, y + 4.5, .03, .04); org = M("court_orange", "#c8662a")
    for sx in (-1, 1): b.box(org, x + sx * 7.5 - (0 if sx < 0 else 3.6), x + sx * 7.5 + (3.6 if sx < 0 else 0), y - 2.4, y + 2.4, .04, .046)
    L = cm["line"]; b.box(L, x - 7.5, x + 7.5, y - 4.5, y - 4.42, .046, .052); b.box(L, x - 7.5, x + 7.5, y + 4.42, y + 4.5, .046, .052); b.box(L, x - .04, x + .04, y - 4.5, y + 4.5, .046, .052)
    for sx in (-1, 1):
        px = x + sx * 7.2; b.box(cm["steel"], px - .06, px + .06, y - .06, y + .06, 0, 3.0); b.box(cm["line"], px - .05 + sx * .35, px + .05 + sx * .35 - sx * .3, y - .9, y + .9, 2.6, 3.4); cb(px, y, .4, .4, "bush")

def picnic(b, cm, cb, x, y, along_x=True):
    wood = M("picnic_wood", "#8a5a34", rough=.8); lx, ly = (.9, .45) if along_x else (.45, .9)
    b.box(wood, x - lx, x + lx, y - ly, y + ly, .75, .85)
    for s_ in (-1, 1):
        bx0, bx1, by0, by1 = (x - lx, x + lx, y + s_ * .75 - .2, y + s_ * .75 + .2) if along_x else (x + s_ * .75 - .2, x + s_ * .75 + .2, y - ly, y + ly); b.box(wood, bx0, bx1, by0, by1, .42, .5)
    b.box(cm["post"], x - .08, x + .08, y - .08, y + .08, 0, .75); cb(x, y, 2.2, 2.4, "bush")

def pavilion(b, cm, cb, cc, x, y):
    gw = M("gaz_roof", "#2f7a4a", rough=.7)
    for sx_ in (-2, 2):
        for sy_ in (-2, 2): b.cyl(M("gaz_post", "#f1ece0"), (x + sx_, y + sy_, 1.4), .13, 2.8, "z", 6); cc(x + sx_, y + sy_, .2, None)
    b.box(M("wood", "#8a5a34", rough=.8), x - 2.6, x + 2.6, y - 2.6, y + 2.6, 0, .25); b.prism(gw, (x - 3.2, x + 3.2, y - 3.2, y + 3.2), (x - .15, x + .15, y - .15, y + .15), 2.8, 4.4)

def gas_station(name="gas"):
    """Corner gas station, front (canopy) toward -y: slab 18 x 19, store 9 x 6 at the back, canopy 12 x 6.5 over three pump islands, price sign pole."""
    cmt = civic_mats(); b = Builder(name); conc = M("gas_slab", "#9a9890", rough=.95); wall = M("gas_wall", "#e9dcb8", rough=.9); trim = M("gas_trim", "#2a5aa8"); roof = M("gas_roof", "#f2efe6")
    red = M("pump_red", "#c8362a"); glass = M("shop_glass_fl", "#2c5a66", rough=.2); metal = M("metal_dark", "#25282c")
    b.box(conc, -9, 9, -9.5, 9.5, 0, .08)
    b.box(wall, -4.5, 4.5, 3.0, 9.0, .08, 3.8); b.box(roof, -4.8, 4.8, 2.7, 9.3, 3.8, 4.1); b.box(trim, -4.8, 4.8, 2.65, 2.7, 3.8, 4.4); b.box(glass, -4.0, 4.0, 2.94, 3.0, .6, 3.0)
    b.box(roof, -6.0, 6.0, -6.2, .3, 4.6, 5.1); b.box(trim, -6.1, 6.1, -6.3, -6.2, 4.5, 5.3); b.box(trim, -6.1, 6.1, .3, .4, 4.5, 5.3)
    for sx in (-4.8, 4.8):
        for sy in (-5.4, -.3): b.box(metal, sx - .18, sx + .18, sy - .18, sy + .18, .08, 4.6)
    for px in (-3.2, 0.0, 3.2): b.box(conc, px - .6, px + .6, -4.2, -1.6, .08, .25); b.box(red, px - .3, px + .3, -3.5, -2.3, .25, 1.45)
    b.cyl(metal, (7.8, -8.0, 3.2), .12, 6.4, "z", 6); b.box(trim, 6.6, 9.0, -8.1, -7.9, 5.4, 7.4); b.box(M("price_yel", "#f2c030", emit=.4), 6.8, 8.8, -8.12, -8.08, 5.6, 7.2)
    return b.build()


class SwapB:
    """Proxy builder that swaps x and y, so axis-aligned pieces (the field) can be drawn long-axis-east-west."""
    def __init__(self, b): self.b = b
    def box(self, m, x0, x1, y0, y1, z0, z1): return self.b.box(m, y0, y1, x0, x1, z0, z1)
    def cyl(self, m, center, r, depth, axis="x", segs=12, r2=None):
        ax = {"x": "y", "y": "x", "z": "z"}[axis]; return self.b.cyl(m, (center[1], center[0], center[2]), r, depth, ax, segs, r2)
