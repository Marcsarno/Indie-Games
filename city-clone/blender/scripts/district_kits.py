"""Building kits for the plan districts: industrial (warehouse, containers, trailer, water tower), condos, hospital, community gate, parking structure, butterfly dome.
Every maker returns ONE built object centred on the origin, ground at z=0, front (doors / entrance) toward -y, like building_fl."""
import sys, os, random; sys.path.insert(0, os.path.dirname(__file__)); from kit import *

GLASS = "#35566a"
def _glass(): return M("dk_glass", GLASS, rough=.2)
def _m(name, hexs, **kw): return M(f"dk_{name}_{hexs[1:]}", hexs, **kw)

def warehouse(name, w=36, d=22, seed=1):
    r = random.Random(seed); b = Builder(name); hx, hy = w / 2, d / 2; H = r.choice((7.5, 8.5, 9.5))
    wall = _m("wh", r.choice(("#c9ccd0", "#b8b4a6", "#9fb0bd", "#c7b79b", "#d6d2c4", "#8f9aa3"))); dark = _m("whdark", "#4a5058"); roof = _m("whroof", "#7d8084"); stripe = _m("whstripe", r.choice(("#2a5aa8", "#b8321f", "#1f6b3a", "#c8861c")))
    yellow = _m("whyel", "#e0b52c"); conc = _m("whslab", "#9a9890", rough=.95); ac = _m("whac", "#a9adb4")
    b.box(wall, -hx, hx, -hy, hy, 0, H); b.box(roof, -hx - .3, hx + .3, -hy - .3, hy + .3, H, H + .35)
    for (x0, x1, y0, y1) in ((-hx - .3, hx + .3, -hy - .3, -hy - .1), (-hx - .3, hx + .3, hy + .1, hy + .3), (-hx - .3, -hx - .1, -hy, hy), (hx + .1, hx + .3, -hy, hy)): b.box(wall, x0, x1, y0, y1, H + .35, H + 1.0)
    b.box(stripe, -hx - .02, hx + .02, -hy - .05, -hy, H - 2.6, H - 1.6)
    b.box(conc, -hx, hx, -hy - 3.5, -hy, 0, .15)
    n = max(2, int((w - 10) // 7))
    for k in range(n):
        x = -hx + 9 + k * (w - 18) / max(1, n - 1) if n > 1 else 0
        b.box(dark, x - 1.7, x + 1.7, -hy - .14, -hy, .15, 4.3); b.box(yellow, x - 1.8, x + 1.8, -hy - .4, -hy - .14, .15, .9)
    b.box(wall, hx - 8, hx, -hy - 3.5, -hy, 0, 4.2); b.box(_glass(), hx - 7.4, hx - .6, -hy - 3.52, -hy - 3.5, .8, 3.0)               # office annex with glass front
    for k in range(int(w // 12)):
        ax = -hx + 6 + k * 11 + r.uniform(-1, 1); ay = r.uniform(-hy + 4, hy - 4); b.box(ac, ax - 1.1, ax + 1.1, ay - .9, ay + .9, H + .35, H + 1.4)
    return b.build(vc=True)

def containers(name, cols=3, rows=2, levels=2, seed=1):
    r = random.Random(seed); b = Builder(name); cl = ["#b8321f", "#2a5aa8", "#2f7a4a", "#c8861c", "#8a8d92", "#d8d2c2", "#7a3a2a"]
    L, Wd, Hh = 6.1, 2.44, 2.6; ox, oy = -cols * (L + .4) / 2, -rows * (Wd + .4) / 2
    for i in range(cols):
        for j in range(rows):
            for k in range(r.choice((1, levels))):
                x0 = ox + i * (L + .4); y0 = oy + j * (Wd + .4); b.box(_m("ct", r.choice(cl), rough=.6), x0, x0 + L, y0, y0 + Wd, .05 + k * Hh, .05 + (k + 1) * Hh)
    return b.build(vc=True)

def truck(name, seed=1):
    b = Builder(name); r = random.Random(seed); cab = _m("cab", r.choice(("#c8201c", "#2a5aa8", "#e6e6e2"))); trl = _m("trl", r.choice(("#e6e6e2", "#d8d2c2", "#9aa0a8"))); dark = _m("tdark", "#25282c")
    b.box(cab, -1.2, 1.2, -6.8, -4.9, .5, 3.0); b.box(_glass(), -1.1, 1.1, -6.85, -6.8, 1.7, 2.7); b.box(trl, -1.3, 1.3, -4.6, 6.4, .6, 3.6)
    for yy in (-5.8, -3.0, 4.2, 5.8):
        for sx in (-1, 1): b.cyl(dark, (sx * 1.15, yy, .5), .5, .3, "x", 8)
    return b.build(vc=True)

def water_tower(name):
    b = Builder(name); steel = _m("wt", "#b8bcc4"); tank = _m("wttank", "#e8eef2")
    for sx in (-1, 1):
        for sy in (-1, 1): b.box(steel, sx * 3.0 - .2, sx * 3.0 + .2, sy * 3.0 - .2, sy * 3.0 + .2, 0, 14)
    b.box(steel, -3.2, 3.2, -3.2, 3.2, 13.5, 14.0); b.cyl(tank, (0, 0, 17), 4.6, 6.0, "z", 14); b.cyl(tank, (0, 0, 21.4), 4.8, 3.0, "z", 14, r2=.4)
    return b.build(vc=True)

def condo(name, w=26, d=14, floors=6, seed=1):
    r = random.Random(seed); b = Builder(name); hx, hy = w / 2, d / 2; fh = 3.2; H = floors * fh
    wall = _m("cd", r.choice(("#efe6d4", "#e8c4a0", "#d9d2c0", "#f1ece0"))); trim = _m("cdtrim", "#f4efe4"); rail = _m("cdrail", "#6a6e74"); roof = _m("cdroof", "#6a6a6c"); plinth = _m("cdplinth", "#b8ab90"); gl = _glass()
    b.box(wall, -hx, hx, -hy, hy, 0, H); b.box(plinth, -hx - .1, hx + .1, -hy - .1, hy + .1, 0, .6); b.box(roof, -hx - .2, hx + .2, -hy - .2, hy + .2, H, H + .3)
    for (x0, x1, y0, y1) in ((-hx - .2, hx + .2, -hy - .2, -hy), (-hx - .2, hx + .2, hy, hy + .2), (-hx - .2, -hx, -hy, hy), (hx, hx + .2, -hy, hy)): b.box(wall, x0, x1, y0, y1, H + .3, H + 1.1)
    b.box(wall, -3, 3, -2.5, 2.5, H + .3, H + 3.2)
    nb = int(w // 4.2)
    for f in range(1, floors):
        b.box(trim, -hx - .05, hx + .05, -hy - .06, hy + .06, f * fh - .1, f * fh + .1)
    for f in range(floors):
        z0 = f * fh + (1.0 if f else 1.3)
        for k in range(nb):
            x = -hx + (k + .5) * w / nb; b.box(gl, x - .9, x + .9, -hy - .04, -hy, z0, z0 + 1.7); b.box(gl, x - .9, x + .9, hy, hy + .04, z0, z0 + 1.7)
            if f > 0 and k % 2 == 0: b.box(trim, x - 1.3, x + 1.3, -hy - 1.4, -hy, f * fh, f * fh + .15); b.box(rail, x - 1.3, x + 1.3, -hy - 1.4, -hy - 1.34, f * fh, f * fh + 1.0)
    b.box(_m("cdcanopy", "#2a5aa8"), -3.5, 3.5, -hy - 3.0, -hy, 3.4, 3.7)
    return b.build(vc=True)

def hospital(name):
    b = Builder(name); wall = _m("hp", "#e8e4dc"); trim = _m("hptrim", "#c9c4b8"); gl = _glass(); red = _m("hpred", "#c8201c"); roof = _m("hproof", "#7d8084"); H = 13.0
    def block(x0, x1, y0, y1, h=H):
        b.box(wall, x0, x1, y0, y1, 0, h); b.box(roof, x0 - .2, x1 + .2, y0 - .2, y1 + .2, h, h + .3)
        for f in range(3):
            z = 1.4 + f * 3.4
            for x in [x0 + 2 + k * 3.4 for k in range(int((x1 - x0 - 3) // 3.4))]: b.box(gl, x, x + 2.0, y0 - .04, y0, z, z + 1.8)
    block(-20, 20, -8, 8); block(-20, -8, 8, 32); block(8, 20, 8, 32)
    b.box(red, -4, 4, -11, -8, 3.5, 3.9); b.box(wall, -4, 4, -11, -8, 0, 3.5); b.box(_m("hpcross", "#ffffff"), -1.2, 1.2, -8.05, -8.0, H - 5.2, H - 2.2)
    b.box(red, -.4, .4, -8.08, -8.0, H - 5.0, H - 2.4); b.box(red, -1.0, 1.0, -8.08, -8.0, H - 4.2, H - 3.4)
    b.cyl(_m("hppad", "#8f9096"), (0, 24, H + .35), 5.5, .1, "z", 16); b.box(_m("hph", "#f0f0f0"), -2.4, -1.8, 21.5, 26.5, H + .45, H + .5); b.box(_m("hph", "#f0f0f0"), 1.8, 2.4, 21.5, 26.5, H + .45, H + .5); b.box(_m("hph", "#f0f0f0"), -2.4, 2.4, 23.7, 24.3, H + .45, H + .5)
    return b.build(vc=True)

def gate(name, span=12):
    b = Builder(name); st = _m("gate", "#e9dcb8"); roof = _m("gateroof", "#a9573a"); hx = span / 2
    for sx in (-1, 1): b.box(st, sx * hx - .8, sx * hx + .8, -.8, .8, 0, 5.2); b.prism(roof, (sx * hx - 1.1, sx * hx + 1.1, -1.1, 1.1), (sx * hx - .2, sx * hx + .2, -.2, .2), 5.2, 6.1)
    b.box(st, -hx, hx, -.6, .6, 4.6, 5.8); b.box(_m("gatesign", "#2f6a4a"), -3.0, 3.0, -.7, -.62, 4.8, 5.6)
    b.box(st, hx + 1.6, hx + 5.6, -1.5, 1.5, 0, 3.0); b.prism(roof, (hx + 1.4, hx + 5.8, -1.7, 1.7), (hx + 3.2, hx + 4.0, -.2, .2), 3.0, 4.2)
    return b.build(vc=True)

def garage(name, w=44, d=24, levels=3, seed=1):
    b = Builder(name); hx, hy = w / 2, d / 2; conc = _m("pg", "#bdbab0"); dk = _m("pgdark", "#3a3c40"); H = levels * 3.0
    for f in range(levels):
        z = f * 3.0; b.box(conc, -hx, hx, -hy, hy, z, z + .35)
        for k in range(int(w // 4)): b.box(conc, -hx + k * 4 - .2, -hx + k * 4 + .2, -hy, -hy + .4, z + .35, z + 3.0); b.box(conc, -hx + k * 4 - .2, -hx + k * 4 + .2, hy - .4, hy, z + .35, z + 3.0)
        b.box(conc, -hx, hx, -hy, -hy + .35, z + .35, z + 1.2); b.box(conc, -hx, hx, hy - .35, hy, z + .35, z + 1.2); b.box(dk, -hx + .3, hx - .3, -hy + .35, -hy + .45, z + 1.4, z + 2.9)
    b.box(conc, -hx, hx, -hy, hy, H, H + .35); b.box(_m("pgsign", "#2a5aa8"), -6, 6, -hy - .1, -hy, H - 1.8, H - .6)
    return b.build(vc=True)

def dome(name):
    b = Builder(name); gl = _m("dome", "#9ad0d8", rough=.15); fr = _m("domefr", "#f1ece0")
    b.box(fr, -8, 8, -6, 6, 0, .6); b.prism(gl, (-8, 8, -6, 6), (-6, 6, -1, 1), .6, 6.0)
    for sx in (-8, 8): b.box(fr, sx - .1, sx + .1, -6, 6, .6, 3.0)
    return b.build(vc=True)
