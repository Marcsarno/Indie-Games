"""Coconut Creek street kit: a landscaped boulevard (N-S, palm median) crossing a two-lane road (E-W), sidewalks, parking lots, signals, lamps, signs.
Blender coords: x east, y north, metres. Everything static goes into ONE terrain mesh (+ a few extras); vegetation is described as instances."""
import sys, os, math, random; sys.path.insert(0, os.path.dirname(__file__)); from kit import *

BLV = 8.4          # boulevard half-width to the curb (2 lanes x 3.4 + median 1.6)
MED = 1.6          # median half-width
XR = 3.5           # cross-road half-width
SWK = 2.4          # sidewalk width
EXT = 72

def mats():
    return dict(grass=M("grass", "#5d9a3a", tex="grass", tile=4.0), asphalt=M("asphalt", "#4b4d50", tex="asphalt", tile=4.0), walk=M("sidewalk", "#b3b0a6", tex="sidewalk", tile=3.0),
                curb=M("curb", "#c9c6bb"), white=M("paint_white", "#e8e5da"), yel=M("paint_yellow", "#e0b52c"), mulch=M("mulch", "#6b4a32"), conc=M("concrete_lot", "#8f8d86", tex="sidewalk", tile=3.0),
                water=M("water", "#2d78b8", tex="water", tile=6.0, rough=.2), bank=M("pond_bank", "#b8a888"), wood=M("wood", "#8a5a34", tex="wood", tile=2.0))

def terrain(b, m):
    b.box(m["grass"], -EXT, EXT, -EXT, EXT, -.3, 0)
    b.box(m["asphalt"], -BLV, BLV, -EXT, EXT, 0, .03); b.box(m["asphalt"], -EXT, EXT, -XR, XR, 0, .03)
    # median (grass top, concrete curb border), open at the intersection
    for sy in (-1, 1):
        y0, y1 = sorted((sy * 6.2, sy * EXT))
        b.box(m["curb"], -MED, MED, y0, y1, 0, .16); b.box(m["grass"], -MED + .22, MED - .22, y0 + .22 if sy > 0 else y0, y1 if sy > 0 else y1 - .22, .16, .17)
    # curbs + sidewalks along the boulevard and the cross road (corner squares overlap, same material)
    for sx in (-1, 1):
        for sy in (-1, 1):
            xa, xb = sorted((sx * BLV, sx * (BLV + .3))); xc, xd = sorted((sx * (BLV + .3), sx * (BLV + .3 + SWK))); ya, yb = sorted((sy * (XR + .3 + SWK), sy * EXT))
            b.box(m["curb"], xa, xb, ya, yb, 0, .17); b.box(m["walk"], xc, xd, ya, yb, 0, .15)
            ya2, yb2 = sorted((sy * XR, sy * (XR + .3))); yc, yd = sorted((sy * (XR + .3), sy * (XR + .3 + SWK))); xa2, xb2 = sorted((sx * (BLV + .3), sx * EXT))
            b.box(m["curb"], xa2, xb2, ya2, yb2, 0, .17); b.box(m["walk"], xa2, xb2, yc, yd, 0, .15)
    # lane lines and crosswalks
    for sx in (-1, 1):
        for sy in (-1, 1):
            y = 7.0
            while y < EXT - 2:
                x = sx * (MED + 3.4); b.box(m["white"], x - .06, x + .06, *sorted((sy * y, sy * (y + 2.2))), .03, .035); y += 6.0
            y0, y1 = sorted((sy * 6.5, sy * EXT)); b.box(m["yel"], sx * (MED + .14) - .05, sx * (MED + .14) + .05, y0, y1, .03, .035); b.box(m["white"], sx * (BLV - .25) - .06, sx * (BLV - .25) + .06, y0, y1, .03, .035)
    for sx in (-1, 1):
        x = 10.0
        while x < EXT - 2: b.box(m["white"], *sorted((sx * x, sx * (x + 2.2))), -.06, .06, .03, .035); x += 6.0
        x0, x1 = sorted((sx * 10.0, sx * EXT)); b.box(m["yel"], x0, x1, -.2, -.1, .03, .035); b.box(m["yel"], x0, x1, .1, .2, .03, .035)
        for sy in (-1, 1): b.box(m["white"], x0, x1, sy * (XR - .25) - .06, sy * (XR - .25) + .06, .03, .035)
    for sy in (-1, 1):                                                                           # boulevard crosswalks
        x = -BLV + .6
        while x < BLV - .3: b.box(m["white"], x, x + .5, *sorted((sy * 4.3, sy * 6.6)), .03, .036); x += 1.05
        b.box(m["white"], *((0.2, BLV - .3) if sy > 0 else (-BLV + .3, -0.2)), *sorted((sy * 7.4, sy * 7.8)), .03, .036)
    for sx in (-1, 1):                                                                           # cross-road crosswalks
        y = -XR + .5
        while y < XR - .3: b.box(m["white"], *sorted((sx * 9.6, sx * 12.0)), y, y + .5, .03, .036); y += 1.05

def lamp(b, x, y, face=1.0, h=5.5):
    pole = M("lamp_pole_g", "#27403a"); head = M("lamp_head", "#e8e8e0")
    b.cyl(pole, (x, y, h / 2), .09, h, "z", 8); b.box(pole, x - .05 if face > 0 else x - 1.2, x + 1.2 if face > 0 else x + .05, y - .05, y + .05, h - .1, h)
    b.box(head, (x + .9) if face > 0 else (x - 1.5), (x + 1.5) if face > 0 else (x - .9), y - .15, y + .15, h - .22, h - .08)

def signal(b, x, y, arm_dir):
    """Mast-arm traffic signal: pole at (x,y), arm reaches in arm_dir=(dx,dy) over the road with 2 heads."""
    pole = M("lamp_pole_g", "#27403a"); box = M("signal_box", "#2a2c2f"); red = M("sig_red", "#ff3a2a", emit=1.2); amb = M("sig_amber", "#6a5a1a"); grn = M("sig_green", "#1a5a2a")
    b.cyl(pole, (x, y, 3.2), .12, 6.4, "z", 8); dx, dy = arm_dir; L = 8.0
    ex, ey = x + dx * L, y + dy * L; b.box(pole, min(x, ex) - .07, max(x, ex) + .07, min(y, ey) - .07, max(y, ey) + .07, 6.0, 6.14)
    for t in (.55, .9):
        hx_, hy_ = x + dx * L * t, y + dy * L * t
        b.box(box, hx_ - .22, hx_ + .22, hy_ - .22, hy_ + .22, 5.0, 6.0)
        for k, mm in enumerate((red, amb, grn)): b.box(mm, hx_ - .12, hx_ + .12, hy_ - .24, hy_ - .22, 5.7 - k * .32, 5.9 - k * .32)

def sign_pole(b, x, y, tex, w=3.0, h=.55, z=2.9, rot=0):
    pole = M("lamp_pole_g", "#27403a"); sm = M("streetsign_" + tex, "#ffffff", tex="sign_" + tex, fit=True, rough=.5)
    b.cyl(pole, (x, y, z / 2 + .3), .05, z + .6, "z", 6); b.box(sm, x - w / 2, x + w / 2, y - .03, y + .03, z, z + h)

def stop_sign(b, x, y):
    pole = M("lamp_pole_g", "#27403a"); red = M("stop_red", "#c22a22"); b.cyl(pole, (x, y, 1.3), .04, 2.6, "z", 6); b.cyl(red, (x, y - .05, 2.5), .38, .05, "y", 8)

def parking_lot(b, m, x0, x1, y0, y1, rows, stalls_x0, stall_w=2.7, island_every=8, stall_depth=5.2, rng=None):
    """Asphalt rectangle with painted stalls. rows = list of (y_start, y_end) bands that carry stalls. Returns (island positions, stall centres with heading)."""
    b.box(m["asphalt"], x0, x1, y0, y1, 0, .03); islands = []; stalls = []
    for (ya, yb) in rows:
        k = 0; x = stalls_x0
        while x + stall_w <= x1 - .5:
            if k % island_every == island_every - 1:
                b.box(m["curb"], x, x + stall_w, ya, yb, 0, .16); b.box(m["mulch"], x + .2, x + stall_w - .2, ya + .2, yb - .2, .16, .2); islands.append(((x + x + stall_w) / 2, (ya + yb) / 2, stall_w, yb - ya))
            else:
                b.box(m["white"], x - .05, x + .05, ya, yb, .03, .036); stalls.append(((x + x + stall_w) / 2, (ya + yb) / 2))
            x += stall_w; k += 1
        b.box(m["white"], x - .05, x + .05, ya, yb, .03, .036)
    return islands, stalls
