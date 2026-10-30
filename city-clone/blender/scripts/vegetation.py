"""Florida vegetation kit. Each make_* returns ONE object at the origin (trunk base / ground centre), +Z up, for instancing in the page."""
import sys, os, math, random; sys.path.insert(0, os.path.dirname(__file__)); from kit import *

def _leafmat(name, hexstr):
    m = M(name, hexstr, rough=.8); m.use_backface_culling = False; return m

def make_palm(name="palm", trunk_h=7.0, fronds=11, flen=2.7, lean=.04, seed=1, droop=1.0):
    r = random.Random(seed); b = Builder(name)
    bark = M("palm_bark_a", "#9a8362"); bark2 = M("palm_bark_b", "#7f6a4e"); leafA = _leafmat("palm_leaf_a", "#4a9a3e"); leafB = _leafmat("palm_leaf_b", "#2f7a34"); nut = M("coconut", "#6a4a2a")
    n = max(4, int(trunk_h / .75)); seg = trunk_h / n; ang = r.uniform(0, 6.28); lx, ly = math.cos(ang), math.sin(ang)
    off = lambda z: lean * (z ** 1.5) / max(1, trunk_h ** .5)
    for k in range(n):
        z0 = k * seg; z1 = z0 + seg; rr0 = .30 - .13 * (z0 / trunk_h); rr1 = .30 - .13 * (z1 / trunk_h)
        cz = (z0 + z1) / 2; o = off(cz)
        b.cyl(bark if k % 2 == 0 else bark2, (lx * o, ly * o, cz), rr0, seg * 1.02, "z", 8, r2=rr1)
    top = (lx * off(trunk_h), ly * off(trunk_h), trunk_h)
    for k in range(5): a = k * 1.26; b.cyl(nut, (top[0] + math.cos(a) * .22, top[1] + math.sin(a) * .22, top[2] - .15), .11, .2, "z", 6)
    for k in range(fronds):
        a = k * 2 * math.pi / fronds + r.uniform(-.2, .2); dx, dy = math.cos(a), math.sin(a); L = flen * r.uniform(.85, 1.1); up = r.uniform(.6, 1.0)
        pts = []; ws = []
        for i in range(8):
            t = i / 7; d = L * t * .96; z = top[2] + L * (.62 * up * t - .95 * droop * t * t) + .15
            pts.append((top[0] + dx * d, top[1] + dy * d, z)); ws.append(.44 * math.sin(math.pi * min(1, t ** .6 * .98 + .02)) + .04)
        b.ribbon(leafA if k % 2 == 0 else leafB, pts, ws, (dx, dy))
    return b.build()

def make_shrub(name="shrub", seed=1, flowers=("#d63a4a", "#f08cb0", "#f2a23a"), size=1.0):
    r = random.Random(seed); b = Builder(name); g = [M("shrub_g1", "#3f8a3a"), M("shrub_g2", "#2f7430"), M("shrub_g3", "#5aa044")]
    fl = [M("flower_" + c[1:], c) for c in flowers]
    for k in range(5):
        x, y = r.uniform(-.55, .55) * size, r.uniform(-.55, .55) * size; rad = r.uniform(.45, .7) * size; h = r.uniform(.5, .9) * size
        b.cyl(g[k % 3], (x, y, h / 2), rad, h, "z", 7, r2=rad * .55)
        for _ in range(3):
            fx, fy = x + r.uniform(-.3, .3) * size, y + r.uniform(-.3, .3) * size; b.box(fl[r.randrange(len(fl))], fx - .07, fx + .07, fy - .07, fy + .07, h - .02, h + .1)
    return b.build()

def make_hedge(name="hedge"):
    b = Builder(name); b.box(M("hedge_g", "#2f6b2f"), -.5, .5, -.45, .45, 0, .85); b.box(M("hedge_top", "#3f8a3a"), -.5, .5, -.4, .4, .85, 1.0)
    return b.build()

def make_oak(name="oak", seed=1):
    r = random.Random(seed); b = Builder(name); bark = M("oak_bark", "#5a4632"); g = [M("oak_g1", "#2f6a30"), M("oak_g2", "#3b7a36"), M("oak_g3", "#255a2a")]
    b.cyl(bark, (0, 0, 1.4), .38, 2.8, "z", 7, r2=.28)
    for k, (x, y, z, rad) in enumerate(((0, 0, 4.4, 2.5), (1.6, .4, 3.7, 1.8), (-1.5, -.6, 3.9, 1.9), (.3, 1.6, 3.6, 1.7), (-.4, -1.5, 3.5, 1.6))):
        b.cyl(g[k % 3], (x, y, z), rad, rad * 1.1, "z", 8, r2=rad * .55)
    return b.build()

def _blob(b, m, c, rx, ry, rz, seg=9, rings=5, wob=0.0, r=None):
    """Low-poly rounded canopy lump (lat/long sphere, flattened at the bottom), optional wobble for a hand-made look."""
    rows = []
    for i in range(rings + 1):
        t = math.pi * i / rings; z = -math.cos(t); zz = z * (.62 if z < 0 else 1.0); rw = math.sin(t)
        row = []
        for j in range(seg):
            a = 2 * math.pi * (j + .5 * (i % 2)) / seg; k = 1 + (r.uniform(-wob, wob) if (r and 0 < i < rings) else 0)
            row.append((c[0] + rx * rw * math.cos(a) * k, c[1] + ry * rw * math.sin(a) * k, c[2] + rz * zz * (1 + (k - 1) * .5)))
        rows.append(row)
    for i in range(rings):
        for j in range(seg):
            q = [rows[i][j], rows[i][(j + 1) % seg], rows[i + 1][(j + 1) % seg], rows[i + 1][j]]
            if i == 0: q = [q[0], q[2], q[3]] if False else q
            b.poly(m, [q[0], q[1], q[2], q[3]] if i not in (0, rings - 1) else ([q[0], q[2], q[3]] if i == 0 else [q[0], q[1], q[2]]))

def make_liveoak(name="liveoak", seed=7):
    """Southern live oak: short thick trunk splitting into low limbs, a WIDE soft canopy of rounded lumps (wider than tall, like Florida street oaks)."""
    r = random.Random(seed); b = Builder(name); bark = M("lo_bark", "#6b5640"); g = [M("lo_g1", "#4f8a3a"), M("lo_g2", "#3f7a34"), M("lo_g3", "#5e9a44")]
    b.cyl(bark, (0, 0, 1.3), .34, 2.6, "z", 8, r2=.26)
    for a, L in ((.4, 2.1), (2.5, 2.0), (4.3, 1.9)): b.cyl(bark, (math.cos(a) * L * .45, math.sin(a) * L * .45, 2.9), .16, 1.1, "z", 6, r2=.1)
    for k, (x, y, z, rx, rz) in enumerate(((0, 0, 4.4, 2.9, 1.3), (1.9, .5, 3.9, 1.9, 1.0), (-1.8, -.7, 4.0, 2.0, 1.0), (.4, 1.9, 3.8, 1.8, .95), (-.5, -1.9, 3.8, 1.8, .95), (.2, .1, 5.1, 1.9, .9))):
        _blob(b, g[k % 3], (x, y, z), rx, rx * r.uniform(.85, 1.0), rz, 10, 5, .08, r)
    return b.build()

def make_poinciana(name="poinciana", seed=9):
    """Royal poinciana (flame tree): slim leaning trunk, flat umbrella canopy, red-orange flowers on top."""
    r = random.Random(seed); b = Builder(name); bark = M("po_bark", "#7a6a58"); g = [M("po_g1", "#5aa048"), M("po_g2", "#4a9040")]; fl = [M("po_f1", "#e8452a"), M("po_f2", "#f2702a")]
    b.cyl(bark, (0, 0, 1.4), .24, 2.8, "z", 7, r2=.18)
    for a in (.3, 2.4, 4.4): b.cyl(bark, (math.cos(a) * .7, math.sin(a) * .7, 3.0), .1, 1.0, "z", 5, r2=.07)
    for k, (x, y, rx) in enumerate(((0, 0, 3.4), (1.6, .6, 2.0), (-1.5, -.8, 2.1), (.2, -1.6, 1.9), (-.6, 1.6, 1.8))):
        _blob(b, g[k % 2], (x, y, 3.5), rx, rx * .9, .75, 11, 4, .06, r)
    for _ in range(26):
        a = r.uniform(0, 6.28); d = r.uniform(0, 3.2); x, y = math.cos(a) * d, math.sin(a) * d * .9; z = 3.5 + .75 * max(.15, 1 - (d / 3.6) ** 2) ** .5 - .05
        _blob(b, fl[r.randrange(2)], (x, y, z), .45, .45, .1, 6, 2)
    return b.build()

KIT = {"palm_tall": lambda: make_palm("palm_tall", 7.5, 15, 2.9, .02, 1), "palm_medium": lambda: make_palm("palm_medium", 5.2, 14, 2.5, .02, 2),
       "palm_small": lambda: make_palm("palm_small", 2.6, 12, 2.0, .02, 3, droop=.7), "shrub_a": lambda: make_shrub("shrub_a", 1), "shrub_b": lambda: make_shrub("shrub_b", 4, ("#e8e8f0", "#f08cb0")),
       "hedge": make_hedge, "oak": lambda: make_liveoak("oak", 7)}     # round 27: the user picked the rounded live oak over the boxy oak (kind name stays "oak")
def make_sabal(name="sabal", h=4.6, seed=11):
    """Sabal (cabbage) palm, Florida's state tree: straight rough trunk, a ROUND head of fan fronds in every direction (reads as a ball, not a star)."""
    r = random.Random(seed); b = Builder(name); bark = M("sb_bark", "#8a7656"); bark2 = M("sb_boot", "#6f5d42"); la = _leafmat("sb_leaf_a", "#4f8f3c"); lb = _leafmat("sb_leaf_b", "#3c7a36")
    n = int(h / .5)
    for k in range(n): z0 = k * h / n; b.cyl(bark if k % 2 else bark2, (0, 0, z0 + h / n / 2), .3 if k % 2 else .34, h / n * 1.02, "z", 7)
    for k in range(24):
        a = k * 2.399 + r.uniform(-.1, .1); el = math.asin(-.55 + 1.5 * (k + .5) / 24); dx, dy = math.cos(a), math.sin(a); L = 1.9 * r.uniform(.85, 1.05)
        pts = []; ws = []
        for i in range(6):
            t = i / 5; d = L * t * math.cos(el); pts.append((dx * d, dy * d, h + .2 + L * t * math.sin(el) - .25 * t * t)); ws.append(.18 + .62 * math.sin(math.pi * min(1, t * .9 + .05)) * t ** .4)
        b.ribbon(la if k % 2 else lb, pts, ws, (dx, dy), fold=.05)
    return b.build()

CANDIDATES = {"liveoak": make_liveoak, "poinciana": make_poinciana, "sabal": make_sabal}     # round 27: replacements for the boxy oak, shown to the user first

if __name__ == "__main__":
    reset(); world((0.62, 0.74, 0.92), 1.3); sun(direction=(0.45, -0.5, -0.74), energy=3.2, color=(1.0, .93, .78), angle_deg=6)
    ground = Builder("g"); ground.box(M("grass_flat", "#5f9a3c", tex="grass", tile=4.0), -30, 30, -12, 12, -.2, 0); ground.build()
    objs = {k: f() for k, f in KIT.items()}
    out = os.path.join(OUT, "veg.glb"); export_glb("veg", list(objs.values()))
    for i, (k, o) in enumerate(objs.items()): o.location = (-14 + i * 4.6, 0, 0)
    for nm, tgt, pitch, dist, w, h in (("veg_game", (0, 0, 2), 52, 34, 900, 480), ("veg_close", (-9, 0, 3), 40, 15, 900, 480)):
        for o in [x for x in bpy.context.scene.objects if x.type == "CAMERA"]: bpy.data.objects.remove(o)
        game_camera(tgt, pitch, dist); render(os.path.join(OUT, nm + ".png"), w, h, samples=24)
    print("VEG", list(objs))
