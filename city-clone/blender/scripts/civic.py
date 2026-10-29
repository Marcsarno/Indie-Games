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
