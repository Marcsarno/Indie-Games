"""Crossroads at the origin: asphalt, markings, sidewalks, curbs, lamps, hydrants."""
import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from kit import *
LANE = 2.6       # driving lane
PARK = 2.0       # parking lane (fits a 1.8 m car)
R = LANE + PARK  # half road width = 4.6
SW = 3.0         # sidewalk width
EXT = 46

def make_street():
    b = Builder("street")
    asphalt = M("asphalt", "#4b4d50", tex="asphalt", tile=4.0); slab = M("sidewalk", "#9d9a92", tex="sidewalk", tile=3.0); curb = M("curb", "#bdb9ae"); white = M("paint_white", "#d9d6cc"); yel = M("paint_yellow", "#d9ac2a")
    b.box(asphalt, -EXT, EXT, -EXT, EXT, -.2, 0)
    for sx in (-1, 1):
        for sy in (-1, 1):
            x0, x1 = sorted((sx * R, sx * EXT)); y0, y1 = sorted((sy * R, sy * EXT))
            b.box(slab, x0, x1, y0, y1, -.2, .16)
            cx0, cx1 = sorted((sx * R, sx * (R + .3))); b.box(curb, cx0, cx1, y0, y1, 0, .17)     # curb along the N-S road
            cy0, cy1 = sorted((sy * R, sy * (R + .3))); b.box(curb, x0, x1, cy0, cy1, 0, .17)     # curb along the E-W road
    # crosswalks + stop lines + centre lines on the 4 arms (arm = unit vector away from centre)
    for ax, ay in ((0, 1), (0, -1), (1, 0), (-1, 0)):
        def rect(a0, a1, c0, c1, m, z=.01):      # a = along the arm (distance from centre), c = across
            if ax == 0: xs = (c0, c1); ys = tuple(sorted((ay * a0, ay * a1)))
            else: ys = (c0, c1); xs = tuple(sorted((ax * a0, ax * a1)))
            b.box(m, xs[0], xs[1], ys[0], ys[1], 0, z + .005)
        c = -R + .5
        while c < R - .4: rect(R + .5, R + 3.2, c, c + .5, white); c += 1.05
        rect(R + 3.7, R + 4.1, 0, R - .1, white) if ay == 1 or ax == -1 else rect(R + 3.7, R + 4.1, -R + .1, 0, white)  # stop line on the approaching side
        rect(R + 4.6, EXT, -.22, -.1, yel); rect(R + 4.6, EXT, .1, .22, yel)                                           # double yellow
        a = R + 5
        while a < EXT - 2: rect(a, a + 2, -(R - PARK) - .06, -(R - PARK) + .06, white); rect(a, a + 2, (R - PARK) - .06, (R - PARK) + .06, white); a += 4.5  # parking-lane edge, dashed
    return b.build()

def make_props():
    b = Builder("props")
    pole = M("lamp_pole", "#26292d"); lamp = M("lamp_glow", "#ffd9a0", emit=4.0); hyd = M("hydrant", "#c4221c"); capm = M("hydrant_cap", "#8c1612")
    box_g = M("signal_box", "#2b2d30"); red = M("sig_red", "#ff3a2a", emit=1.5); amb = M("sig_amber", "#5a4a10"); grn = M("sig_green", "#103a1c")
    for sx in (-1, 1):
        for sy in (-1, 1):
            x, y = sx * (R + .7), sy * (R + .7)
            b.cyl(pole, (x, y, 2.4), .12, 4.8, "z", 8)
            ex, ey = x - sx * 1.5, y                                              # arm out over the road, lamp head at the end
            b.box(pole, min(x, ex) - .05, max(x, ex) + .05, y - .06, y + .06, 4.7, 4.8)
            b.box(lamp, ex - .35, ex + .35, y - .18, y + .18, 4.58, 4.7)
    for (x, y) in ((R + .6, -R - 4), (-R - .6, R + 5)):
        b.cyl(hyd, (x, y, .35), .2, .7, "z", 8); b.cyl(capm, (x, y, .78), .24, .14, "z", 8); b.box(hyd, x - .3, x + .3, y - .06, y + .06, .45, .55)
    # one traffic signal head on the NE lamp post side
    x, y = R + .7, R + .7
    b.box(box_g, x - .25, x + .25, y - 1.1, y - .6, 3.2, 4.4); b.box(red, x - .15, x + .15, y - 1.12, y - 1.1, 3.95, 4.25); b.box(amb, x - .15, x + .15, y - 1.12, y - 1.1, 3.55, 3.85); b.box(grn, x - .15, x + .15, y - 1.12, y - 1.1, 3.25, 3.45)
    return b.build()

def make_tree(name, seed=0):
    import random; r = random.Random(seed); b = Builder(name)
    bark = M("bark", "#4d3826"); g1 = M("leaf_a", "#4f7a3a"); g2 = M("leaf_b", "#5f8c42"); g3 = M("leaf_c", "#3f6a33")
    b.cyl(bark, (0, 0, 1.2), .18, 2.4, "z", 6)
    h = 2.3
    for (rad, dz, m) in ((1.9, 1.3, g3), (1.6, 1.2, g1), (1.2, 1.1, g2)):
        b.cyl(m, (r.uniform(-.15, .15), r.uniform(-.15, .15), h + dz / 2), rad, dz, "z", 8, r2=rad * .72); h += dz * .8
    return b.build()

def make_extras():
    b = Builder("extras")
    bin_m = M("bin_green", "#2f4a3a"); lid = M("bin_lid", "#1d2a24"); mail = M("mailbox", "#2a4f9a"); mail_t = M("mail_top", "#1d3a73")
    box = M("crate", "#9b7a4a"); ban = M("bollard", "#26292d"); bench_w = M("bench_wood", "#7a5a38"); bench_m = M("bench_metal", "#1f2124")
    for (x, y) in ((R + 2.3, R + 4.5), (-R - 2.3, -R - 6.5), (R + 2.3, -R - 9)):
        b.cyl(bin_m, (x, y, .45), .34, .9, "z", 8); b.cyl(lid, (x, y, .93), .37, .1, "z", 8)
    for (x, y) in ((-R - 2.4, R + 3.2),):
        b.box(mail, x - .35, x + .35, y - .3, y + .3, .35, 1.2); b.cyl(mail_t, (x, y, 1.2), .35, .6, "y", 8)
    for (x, y) in ((R + 1.0, R + 10), (R + 1.0, R + 10.8), (-R - 1.0, -R - 14)):
        b.cyl(ban, (x, y, .5), .12, 1.0, "z", 6)
    b.box(bench_w, -R - 2.9, -R - 1.1, R + 12, R + 12.5, .45, .55); b.box(bench_w, -R - 2.9, -R - 1.1, R + 12.4, R + 12.5, .55, 1.0)
    for yy in (R + 12.0, R + 12.4): b.box(bench_m, -R - 2.9, -R - 2.8, yy, yy + .1, .0, .45); b.box(bench_m, -R - 1.2, -R - 1.1, yy, yy + .1, .0, .45)
    b.box(box, R + 2.0, R + 2.8, -R - 12.6, -R - 11.8, .16, .76)
    return b.build()


ARCH_Y = 24.0
def make_arch(name="arch"):
    """Chinatown gate across the north arm: red pillars on stone bases, beam, two-tier green roof, lanterns, lettered board."""
    b = Builder(name)
    red = M("arch_red", "#b32018"); dred = M("arch_dred", "#7e1510"); green = M("arch_green", "#1f6b4a", rough=.7); dgreen = M("arch_dgreen", "#16493a")
    stone = M("arch_stone", "#8f8c84"); gold = M("arch_gold", "#d9a62b"); lan = M("lantern", "#ff3a1a", emit=2.2)
    board = M("arch_board", "#ffffff", emit=.8, tex="sign_chinatown", fit=True)
    X = R + 1.5
    for sx in (-1, 1):
        b.box(stone, sx * X - .75, sx * X + .75, -.75, .75, 0, .9)
        b.box(red, sx * X - .42, sx * X + .42, -.42, .42, .9, 7.0)
        b.box(gold, sx * X - .5, sx * X + .5, -.5, .5, 6.3, 6.5)
        b.prism(green, (sx * X - 1.5, sx * X + 1.5, -1.3, 1.3), (sx * X - .7, sx * X + .7, -.6, .6), 7.0, 7.9)         # cap roof over each pillar
    L = X + 1.0
    b.box(dred, -L, L, -.45, .45, 5.7, 6.9); b.box(gold, -L, L, -.5, .5, 6.9, 7.0)
    b.prism(green, (-L - .8, L + .8, -1.6, 1.6), (-L + .6, L - .6, -.9, .9), 7.0, 8.0)                                   # lower main roof
    b.box(dgreen, -L + .6, L - .6, -.25, .25, 8.0, 8.25)
    b.box(board, -2.5, 2.5, -.2, .2, 8.25, 10.0)                                                                        # lettered board
    b.prism(green, (-3.6, 3.6, -1.3, 1.3), (-2.4, 2.4, -.7, .7), 10.0, 10.9); b.box(dgreen, -2.4, 2.4, -.25, .25, 10.9, 11.15)  # upper roof
    for i in range(-5, 6):                                                                                                # lanterns under the beam
        x = i * (L - .7) / 5; b.cyl(lan, (x, -.55, 5.35), .26, .5, "z", 8, r2=.2); b.box(gold, x - .03, x + .03, -.58, -.52, 5.6, 5.7)
    return b.build()

def make_stall(name="stall", awn_a="#1f6b4a", awn_b="#e8e2c8"):
    b = Builder(name)
    wood = M("stall_wood", "#7a5232"); dwood = M("stall_dwood", "#4e3420"); a = M("stall_awn_a_" + awn_a[1:], awn_a); c = M("stall_awn_b", awn_b)
    prod = [M("fruit_o", "#e0801a"), M("fruit_r", "#c4301f"), M("fruit_g", "#5c9a2e"), M("fruit_y", "#e8c030")]; lan = M("lantern", "#ff3a1a", emit=2.2)
    b.box(wood, -1.1, 1.1, -.5, .5, 0, .85); b.box(dwood, -1.15, 1.15, -.55, .55, .85, .92)
    for i, x in enumerate((-.85, -.3, .25, .8)): b.box(prod[i % 4], x - .22, x + .22, -.3, .3, .92, 1.1)
    for sx in (-1, 1): b.box(dwood, sx * 1.1 - .05, sx * 1.1 + .05, -.55, -.45, 0, 2.3)
    for i in range(6):                                                     # striped slanted awning
        x0 = -1.35 + i * .45; b.prism(a if i % 2 == 0 else c, (x0, x0 + .45, .4, .4), (x0, x0 + .45, -.95, -.95), 2.45, 1.95)
    b.cyl(lan, (0, -.9, 1.75), .2, .36, "z", 8, r2=.16)
    return b.build()

def make_misc():
    """Small movable props, one object each: returns dict name -> object (origin at ground centre)."""
    out = {}
    dump = M("dumpster", "#2d5a45"); dlid = M("dumpster_lid", "#1c3a2c"); jer = M("jersey", "#b8b5ad"); barrel = M("barrel", "#e0701a"); wht = M("barrel_stripe", "#ece8dc")
    news = M("newsbox", "#d9b020"); news2 = M("newsbox2", "#2a4f9a"); pal = M("pallet", "#9a7a4a"); crate = M("crate2", "#7a6240")
    b = Builder("dumpster"); b.box(dump, -1.2, 1.2, -.7, .7, .1, 1.4); b.box(dlid, -1.25, 1.25, -.75, .75, 1.4, 1.5); out["dumpster"] = b.build()
    b = Builder("barrier"); b.box(jer, -1.2, 1.2, -.3, .3, 0, .35); b.prism(jer, (-1.2, 1.2, -.2, .2), (-1.2, 1.2, -.1, .1), .35, .95); out["barrier"] = b.build()
    b = Builder("barrel"); b.cyl(barrel, (0, 0, .45), .3, .9, "z", 8); b.cyl(wht, (0, 0, .55), .31, .16, "z", 8); out["barrel"] = b.build()
    b = Builder("newsboxes"); b.box(news, -.65, -.05, -.25, .25, 0, 1.0); b.box(news2, .05, .65, -.25, .25, 0, 1.0); out["newsboxes"] = b.build()
    b = Builder("pallet"); b.box(pal, -.6, .6, -.6, .6, 0, .15); b.box(crate, -.5, .5, -.5, .5, .15, .95); out["pallet"] = b.build()
    return out

def lamp_heads():
    """World positions of the 4 corner lamp heads (for point lights)."""
    return [(sx * (R + .7) - sx * 1.5, sy * (R + .7), 4.5) for sx in (-1, 1) for sy in (-1, 1)]
