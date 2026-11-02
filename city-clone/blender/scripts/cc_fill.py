"""M2 fill pass for the rebuilt city (round 39). Executed inside cc_scene.py (exec, shares its globals: Builder, M, flat, shade, RB, BB, COL, cbox, prop,
FOOT, STATIC, MAP, net, near_road, LP, addcar ...). Real-size buildings from the kit with real business names (signs from tex_cc.py), outparcel pads along
US 441 and Powerline (gas, fast food with drive-thrus, banks, big boxes), six dealerships with display cars, Florida walls + hedges along the arterials,
houses along every local street with fenced back yards, parks / campuses / Wynmoor condos, street lights.
Phases (called from cc_scene.py): SITE(b, lot) per lot building, fill_pads() before the houses, fill_after(placed_houses) after them."""
import building_fl as BF, district_kits as DK, civic as CV, lm_retail as LMR, lm_civic as LMC, lm_promenade as LMP
SG = json.load(open(os.path.join(OUT, "tex", "cc_signs.json")))
RF = random.Random(39)
GL = M("cc_glass", "#2c4f60", rough=.2); ROOFT = M("roof_tar", "#6a6a6c", tex="roof", tile=3.0); TRIM = flat("#f4efe2")
WL = Tiled("walls"); FIX = Tiled("fixtures")                                                   # walls + hedges, lamps + courts + pads (merged per 128 m tile)
VCACHE = {}; HOUSE_T = []; APRONS = []; CORRALS = []                                  # round 40: house transforms (driveways), building aprons, cart corrals
def sgn(key): return M("ccsign_" + key, "#ffffff", tex="sign_cc_" + key, fit=True, rough=.6)
def acc(key): return SG[key]["accent"]
FACE = {"s": 0, "e": 90, "n": 180, "w": -90}
CUTSEG = [(a, b) for c in LP["cuts"] for a, b in zip(c["pts"], c["pts"][1:])]
def on_cut(x, y, r):
    """True when (x, y) is within r of one of the planned detour routes (they must stay drivable: no houses, palms or walls on them)."""
    for a, b in CUTSEG:
        dx, dy = b[0] - a[0], b[1] - a[1]; L2 = dx * dx + dy * dy or 1; t = max(0, min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L2))
        if math.hypot(a[0] + dx * t - x, a[1] + dy * t - y) < r: return True
    return False
_prop0 = prop
def prop(kind, x, y, s=None, col=True):
    if on_cut(x, y, 3.0): return
    _prop0(kind, x, y, s, col)
def place(o, cx, cy, face="s", sx=1.0, sy=1.0, sz=1.0, rz=None):
    o.location = (cx, cy, 0); o.rotation_euler = (0, 0, math.radians(FACE[face] if rz is None else rz)); o.scale = (sx, sy, sz); STATIC.append(o); return o
def linked(key, maker):
    """Linked duplicate of a cached variant (the page instances these per tile: one draw call per variant per tile)."""
    if key in VCACHE: o = bpy.data.objects.new(f"{key}_{len(STATIC)}", VCACHE[key].data); bpy.context.scene.collection.objects.link(o); return o
    o = maker(f"{key}"); VCACHE[key] = o; return o
def world_dims(face, lw, ld): return (lw, ld) if face in ("s", "n") else (ld, lw)

# ------------------------------------------------------------------ building makers (front = -y, centred, ground z=0) ------------------------------------------------------------------
GLS = M("cc_glass_show", "#7fb0c8", rough=.15)
def bldg(name, w, d, h, wall="#e8dcc0", key=None, accent=None, roof="flat", floors=1, glass_front=False, canopy=True, roof_hex=None, sign_h=None, extra=None, back_doors=0, win_step=3.6, fascia=None):
    b = Builder(name); hx, hy = w / 2, d / 2; W = flat(wall); BASE = flat(shade(wall, .78)); A = flat(accent) if accent else TRIM; fh = h / floors
    b.box(W, -hx, hx, -hy, hy, 0, h); b.box(BASE, -hx - .06, hx + .06, -hy - .06, hy + .06, 0, .55)
    if roof == "flat":
        b.box(TRIM, -hx - .25, hx + .25, -hy - .25, hy + .25, h - .35, h + .05); b.box(ROOFT, -hx + .3, hx - .3, -hy + .3, hy - .3, h + .05, h + .1)
        for (x0, x1, y0, y1) in ((-hx, hx, -hy, -hy + .3), (-hx, hx, hy - .3, hy), (-hx, -hx + .3, -hy, hy), (hx - .3, hx, -hy, hy)): b.box(TRIM, x0, x1, y0, y1, h, h + .9)
        for i in range(max(1, int(w * d / 500))):
            ax, ay = RF.uniform(-hx + 3, hx - 3), RF.uniform(-hy + 3, hy - 3); b.box(flat("#a9adb4"), ax - 1.1, ax + 1.1, ay - .8, ay + .8, h + .1, h + 1.2)
    else:
        tile = flat(roof_hex) if roof_hex else M("terracotta", "#a9573a", tex="tiles", tile=2.5)
        BF.hip_roof(b, tile, -hx, hx, -hy, hy, h, max(1.6, min(w, d) * .2), over=.7, ridge_along="x" if w >= d else "y", fascia=TRIM)
    for f in range(floors):                                                                  # windows: front + sides
        z0 = f * fh + (1.0 if f == 0 else .9); z1 = z0 + min(1.8, fh - 1.4)
        if not (glass_front and f == 0):
            x = -hx + 2.2
            while x < hx - 2:
                if not (f == 0 and abs(x) < 3.6): b.box(GL, x - .85, x + .85, -hy - .07, -hy + .01, z0, z1)
                x += win_step
        for sx in (-1, 1):
            y = -hy + 2.5
            while y < hy - 2: b.box(GL, sx * hx - .01 if sx > 0 else -hx - .07, sx * hx + .07 if sx > 0 else -hx + .01, y - .8, y + .8, z0, z1); y += win_step + 1
    if glass_front:
        top = min(h - 1.6, 6.0); b.box(GLS, -hx + 1.0, hx - 1.0, -hy - .08, -hy + .01, .55, top)
        for sx in (-1, 1): b.box(GLS, sx * hx - (.01 if sx > 0 else .07), sx * hx + (.07 if sx > 0 else .01), -hy + 1, -hy + d * .45, .55, top)
        x = -hx + 1.0
        while x <= hx - 1.0: b.box(flat("#d8dcdf"), x - .09, x + .09, -hy - .14, -hy, .55, top); x += 3.0
    b.box(GL, -1.7, 1.7, -hy - .1, -hy, .55, 2.8)
    if canopy: b.box(A, -4.0, 4.0, -hy - 2.6, -hy, 3.1, 3.5)
    if key:
        sh = sign_h or max(1.1, min(3.6, h * .2)); sw = min(w * .72, sh * 4.0); z0 = h - sh - .45
        if accent: b.box(flat(fascia) if fascia else A, -hx - .12, hx + .12, -hy - .22, -hy - .06, h - sh - .75, h - .25)
        b.box(sgn(key), -sw / 2, sw / 2, -hy - .36, -hy - .22, z0, z0 + sh)
    for i in range(back_doors):
        x = -hx + (i + .5) * w / back_doors; b.box(flat("#8d9096"), x - 2.0, x + 2.0, hy, hy + .08, .1, 4.2)
    if extra: extra(b, hx, hy, h)
    return b.build(vc=True)

def pylon(name, key, h=8.0, w=4.4):
    b = Builder(name); s = sgn(key); pole = flat("#6b7078")
    b.box(pole, -.3, .3, -.3, .3, 0, h - 1.9); b.box(flat("#3a3d42"), -w / 2 - .15, w / 2 + .15, -.3, .3, h - 2.05, h + .15); b.box(s, -w / 2, w / 2, -.36, .36, h - 1.9, h)
    return b.build(vc=True)

def gas(name, key):
    b = Builder(name); A = flat(acc(key)); W = flat("#ece4d0"); RW = flat("#f4f2ec"); C = flat("#9a9890"); MT = flat("#3a3d42"); P = flat("#dadada")
    b.box(C, -10, 10, -9, 11, 0, .06)
    b.box(W, -6.5, 6.5, 4.5, 10.5, 0, 4.2); b.box(RW, -6.7, 6.7, 4.3, 10.7, 4.2, 4.45); b.box(A, -6.8, 6.8, 4.25, 4.35, 3.0, 4.45); b.box(GL, -5, 5, 4.42, 4.5, .5, 2.8)
    b.box(sgn(key), -3.2, 3.2, 4.12, 4.25, 3.15, 4.3)
    b.box(A, -9.2, 9.2, -8.2, 1.2, 4.7, 5.5); b.box(RW, -9.0, 9.0, -8.0, 1.0, 5.5, 5.6); b.box(sgn(key), -3.4, 3.4, -8.32, -8.2, 4.78, 5.42); b.box(sgn(key), -3.4, 3.4, 1.2, 1.32, 4.78, 5.42)
    for px in (-5.5, 0, 5.5):
        b.box(C, px - .7, px + .7, -5.6, -1.6, .06, .25); b.box(P, px - .35, px + .35, -4.4, -2.8, .25, 1.6); b.box(A, px - .37, px + .37, -4.42, -2.78, 1.6, 1.8)
        b.box(MT, px - .15, px + .15, -6.6, -6.3, 0, 4.7) if px != 0 else None
    for (x, y) in ((-8, -7), (8, -7), (-8, 0), (8, 0)): b.box(MT, x - .2, x + .2, y - .2, y + .2, 0, 4.7)
    return b.build(vc=True)

def lum(h): h = h.lstrip("#"); return (.299 * int(h[0:2], 16) + .587 * int(h[2:4], 16) + .114 * int(h[4:6], 16)) / 255
def fastfood(name, key, drive=True):
    a = acc(key)
    def ex(b, hx, hy, h):
        if drive:                                                                            # drive-thru window + menu board on the east side, a lane painted round the back
            b.box(GL, hx - .02, hx + .08, -1.0, 1.0, 1.0, 2.3); b.box(flat(a), hx, hx + 1.6, -1.6, 1.6, 2.6, 2.9)
            b.box(flat("#2a2a2a"), hx + 4.2, hx + 4.5, hy + 2, hy + 4.4, 0, 2.2); b.box(sgn(key), hx + 4.0, hx + 4.2, hy + 2.1, hy + 4.3, 1.1, 2.1)
    return bldg(name, 17, 12, 5.2, wall=RF.choice(["#efe6d2", "#e8d7b8", "#d9c2a0", "#f2efe8"]), key=key, accent=a, roof="hip" if RF.random() < .5 else "flat", roof_hex=a if (RF.random() < .5 and lum(a) > .22) else None, sign_h=1.6, extra=ex)

def bank(name, key):
    def ex(b, hx, hy, h):                                                                    # drive-thru canopy on the west side
        b.box(flat("#e9e3d6"), -hx - 9, -hx, -3, 5, 4.2, 4.7); b.box(flat(acc(key)), -hx - 9.1, -hx, -3.1, 5.1, 4.0, 4.2)
        for y in (-2.5, 4.5): b.box(flat("#d8d2c4"), -hx - 8.8, -hx - 8.2, y - .3, y + .3, 0, 4.2)
    return bldg(name, 18, 14, 6.0, wall="#ece6da", key=key, accent=acc(key), roof="hip", roof_hex="#5d6670", sign_h=1.5, extra=ex)

def carwash(name, key):
    def ex(b, hx, hy, h):
        for x in (-hx - .01, hx - .3): b.box(flat("#1c9ad6"), x, x + .31, -hy + .5, hy - .5, .5, 3.6)
    return bldg(name, 30, 9, 5.0, wall="#f2f2f2", key=key, accent=acc(key), sign_h=1.6, extra=ex, win_step=6)

def showroom(name, key):
    def ex(b, hx, hy, h):
        for i in range(4): x = -hx + 6 + i * 10; b.box(flat("#8d9096"), x - 2.6, x + 2.6, hy, hy + .08, .1, 4.4)      # service bay doors at the back
        b.box(flat(acc(key)), -hx + 4, -hx + 12, -hy - .2, -hy, 0, h + 2.5); b.box(sgn(key), -hx + 4.2, -hx + 11.8, -hy - .34, -hy - .2, h - .5, h + 2.2)  # entrance portal
    return bldg(name, 48, 28, 8.0, wall="#eef0f2", key=key, accent=acc(key), glass_front=True, canopy=False, sign_h=2.4, extra=ex, fascia="#f4f6f8")

def display_car(name, col):
    b = Builder(name); body = flat(col); g = flat("#1c2630"); t = flat("#141414"); c = flat("#c9ccd1")
    b.box(body, -.9, .9, -2.2, 2.2, .38, 1.02); b.prism(g, (-.82, .82, -1.05, 1.25), (-.7, .7, -.55, .85), 1.02, 1.45); b.box(body, -.71, .71, -.55, .85, 1.45, 1.5)
    for wx in (-.82, .82):
        for wy in (-1.4, 1.4): b.box(t, wx - .14, wx + .14, wy - .36, wy + .36, 0, .72)
    b.box(c, -.75, .75, -2.24, -2.2, .5, .7)
    return b.build(vc=True)
CARCOL = ["#f4f4f2", "#1f2125", "#a9aeb5", "#2e5fa3", "#c8201c", "#5b6168", "#e9e6dc", "#16325c"]

def school(name, w, d, key, wall="#d9b48a"):
    def ex(b, hx, hy, h):
        b.box(flat("#e9e3d6"), -hx * .7, hx * .7, -hy - 3.5, -hy, 3.6, 4.0)                  # covered walkway along the front
        for x in [(-hx * .7) + i * 4 for i in range(int(hx * 1.4 / 4) + 1)]: b.box(flat("#d0c8b8"), x - .15, x + .15, -hy - 3.4, -hy - 3.1, 0, 3.6)
    return bldg(name, w, d, 8.0, wall=wall, key=key, accent="#7a1f1f" if key == "cchs" else "#1d4f8c", floors=2, sign_h=2.2, extra=ex, canopy=False)

# ------------------------------------------------------------------ lot buildings: the plan's rectangles become real models ------------------------------------------------------------------
def shop_run(L, cx, cy, face, seed=0):
    """A run of Promenade shop units L metres long, built from linked 4-unit modules (36 x 13 m, 3 variants) stretched to fit: one mesh per variant in the file."""
    k = max(1, round(L / 36.0)); sx = L / (k * 36.0)
    for i in range(k):
        v = (seed + i) % 3; o = linked(f"shopmod_{v}", lambda nm, v=v: LMP.shop_row(nm, 4, 9.0, 13.0, 41 + v * 7))
        t = -L / 2 + (i + .5) * L / k
        if face == "s": place(o, cx + t, cy, "s", sx)
        elif face == "n": place(o, cx - t, cy, "n", sx)
        elif face == "e": place(o, cx, cy + t, "e", sx)
        else: place(o, cx, cy - t, "w", sx)
    ww, dd = world_dims(face, L, 13); cbox(cx, cy, ww, dd); APRONS.append((cx, cy, ww, dd, face))
def best_face(bx0, by0, bx1, by1, lot):
    x0, x1, y0, y1 = lot; m = {"s": by0 - y0, "n": y1 - by1, "w": bx0 - x0, "e": x1 - bx1}; return max(m, key=m.get)
def paver(x0, y0, x1, y1, col="#cfc6b4"): BB.box(flat(col), x0, x1, y0, y1, 0, .045)
def lawn(x0, y0, x1, y1, trees=True):
    BB.box(flat("#6fae4a"), x0, x1, y0, y1, 0, .05)
    if trees:
        for _ in range(int((x1 - x0) * (y1 - y0) / 500)): prop(RF.choice(["palm_medium", "palm_tall", "shrub_a", "oak"]), RF.uniform(x0 + 3, x1 - 3), RF.uniform(y0 + 3, y1 - 3))
def SITE(b_, lot):
    """Replace one plan building rectangle with real models (scaled to real size, the rest of the rectangle becomes lawn / plaza)."""
    lab = b_["label"]; x0, y0, x1, y1 = b_["x0"], b_["y0"], b_["x1"], b_["y1"]; cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    face = {"WALMART": "e", "CITY HALL": "e", "POLICE": "e", "McD": "w", "COOPER'S HAWK": "e", "CINEMA": "e", "SHOPS": "s", "": "s", "SHOPS_N": "n", "SHOPS_E": "e", "SHOPS_W": "w", "WORLD OF BEER": "s", "STARBUCKS": "n"}.get(lab) or best_face(x0, y0, x1, y1, lot)
    lw, ld = world_dims(face, x1 - x0, y1 - y0)                                               # rect size in the model's frame (width along the front)
    def col(w, d, x=cx, y=cy): ww, dd = world_dims(face, w, d); cbox(x, y, ww, dd); APRONS.append((x, y, ww, dd, face))
    def front_pt(dist):                                                                      # a point `dist` in front of the rect's front edge, centred
        return {"s": (cx, y0 - dist), "n": (cx, y1 + dist), "w": (x0 - dist, cy), "e": (x1 + dist, cy)}[face]
    if lab.startswith("P:"):                                                                   # round 44: generic real-business building filling its rectangle, P:<sign key>:<face>:<height>
        _, key, f_, h_ = lab.split(":"); ww, dd = world_dims(f_, x1 - x0, y1 - y0)
        place(bldg(f"pb_{key}", ww, dd, float(h_), wall=RF.choice(["#efe6d2", "#e8d7b8", "#d9c9a8", "#f2efe8"]), key=key, accent=acc(key), roof="flat", sign_h=min(2.6, float(h_) * .28), glass_front=ww > 30), cx, cy, f_)
        cbox(cx, cy, x1 - x0, y1 - y0); APRONS.append((cx, cy, x1 - x0, y1 - y0, f_)); return
    nm = lab.lower().replace(" ", "_").replace("'", "") or "bldg"
    if lab in BRAND_DEALERS:
        key = lab.lower(); place(showroom(f"dealer_{key}", key), cx, cy, face); col(48, 28)
        return
    if lab in ("BODY SHOP", "SERVICE"):
        k = "bodyshop" if lab == "BODY SHOP" else "service"; place(bldg(f"{k}_{int(cx)}", lw, ld, 7.0, wall="#d6d2c8", key=k, accent="#1d3b6e", canopy=False, back_doors=0, sign_h=1.6,
                 extra=lambda b, hx, hy, h: [b.box(flat("#8d9096"), -hx + 4 + i * 9 - 3, -hx + 4 + i * 9 + 3, -hy - .08, -hy, .1, 4.6) for i in range(int((2 * hx - 4) / 9))]), cx, cy, face); col(lw, ld)
        return
    if lab == "WALMART":
        def ex(b, hx, hy, h):
            for x in (-hx * .45, hx * .45): b.box(flat("#0071ce"), x - 7, x + 7, -hy - 1.2, -hy, 0, h + 1.8); b.box(GL, x - 4, x + 4, -hy - 1.3, -hy - 1.2, .5, 3.6)
            b.box(flat("#ffc220"), -hx, hx, -hy - .2, -hy - .1, h - .6, h - .3)
        CORRALS.append((x1 + 18, y0 + 20, x1 + 22, y1 - 20)); place(bldg("walmart", lw, ld, 10.0, wall="#8a96a3", key="walmart", accent="#0071ce", canopy=False, sign_h=5.0, extra=ex, back_doors=6), cx, cy, face); col(lw, ld); return
    if lab == "PUBLIX":                                                                      # the real Publix kit model (46 x 28) at 1.45x + inline shops either side
        k = 1.45; pw = 46 * k; place(LMR.supermarket("publix"), cx + lw / 2 - pw / 2 - 2, cy, face, k, k, k); col(pw, 28 * k, cx + lw / 2 - pw / 2 - 2)
        rest = lw - pw - 6; n = int(rest / 9); ys_ = cy - 28 * k / 2 + 6.5
        if n >= 2: shop_run(n * 9, x0 + n * 4.5 + 1, ys_, face, 1)
        return
    if lab == "SEMINOLE CASINO":
        k = 1.6; px, py = x1 - 56 * k / 2 + 9, y0 + 36 * k / 2; place(LMC.casino("casino"), px, py, face, k, k, k); cbox(px, py, 56 * k, 36 * k)
        o = bldg("casino_hotel", 40, 22, 46.0, wall="#e2c58a", key=None, floors=12, canopy=False, roof="flat"); place(o, px + 18, py + 36 * k / 2 - 8, face)
        return
    if lab == "CITY HALL":
        k = min(lw / 34, ld / 20, 1.7); place(LMC.city_hall("city_hall"), cx, cy, face, k, k, k); col(34 * k, 20 * k)
        lawn(x0, y0, x1, y1, trees=False); fx, fy = front_pt(-20); place(LMC.butterfly("cityhall_butterfly"), fx, fy, face, 1.5, 1.5, 1.5)
        for i in range(-3, 4): px, py = front_pt(-3); prop("palm_tall", px + (i * 9 if face in "sn" else 0), py + (i * 9 if face in "ew" else 0), 1.0)
        return
    if lab == "POLICE":
        k = min(lw / 30, ld / 20, 1.4); px = x0 + 20 * k / 2 + 1; place(LMR.police_station("police"), px, cy, face, k, k, k); col(30 * k, 20 * k, px); return
    if lab in ("COCONUT CREEK HIGH", "COCONUT CREEK ELEMENTARY"):
        key = "cchs" if "HIGH" in lab else "ccel"; lawn(x0, y0, x1, y1, trees=False)
        if key == "ccel": sw_ = 60; px, py = x0 + sw_ / 2 + 2, y1 - 17 - 2; place(school("school_ccel", sw_, 34, key), px, py, face); cbox(px, py, sw_, 34); return
        place(school(f"school_{key}", min(lw, 120), min(ld, 34), key), cx, cy, face); col(min(lw, 120), min(ld, 34))
        if ld > 50: o = bldg(f"{key}_gym", min(lw * .5, 50), 24, 11.0, wall="#c9a27a", canopy=False); bx, by = (cx, cy + ld / 2 - 14) if face == "s" else (cx, cy); place(o, bx, by, face); cbox(bx, by, *world_dims(face, min(lw * .5, 50), 24))
        return
    if lab == "FIRE STATION":
        def ex(b, hx, hy, h):
            for i in range(3): x = -hx + 8 + i * 7; b.box(flat("#d9d9d9"), x - 2.6, x + 2.6, -hy - .08, -hy, .1, 4.6)
        place(bldg("fire_station", min(lw, 44), min(ld, 22), 8.5, wall="#a8443a", key="fire", accent="#f2efe6", floors=2, canopy=False, extra=ex), cx, cy, face); col(min(lw, 44), min(ld, 22)); return
    if lab in ("REC CENTER", "POOL"):
        key = "rec" if lab == "REC CENTER" else "aquatic"; w_ = min(lw, 70); d_ = min(ld, 30)
        place(bldg(f"{key}", w_, d_, 8.0, wall="#e9e2d0", key=key, accent="#1d6f8c", roof="hip", roof_hex="#bcb6aa", sign_h=2.0), cx, cy + (ld / 2 - d_ / 2 if face == "s" else 0), face)
        cbox(cx, cy + (ld / 2 - d_ / 2 if face == "s" else 0), *world_dims(face, w_, d_))
        if lab == "POOL":
            BB.box(flat("#d8d2c4"), x0, x1, y0, y0 + ld - d_ - 2, 0, .06); BB.box(flat("#3fb6e0"), x0 + 15, x1 - 15, y0 + 8, y0 + ld - d_ - 10, 0, .08)
        else: lawn(x0, y0, x1, y0 + ld - d_ - 2)
        return
    if lab in ("GARAGE", "OFFICE GARAGE"):
        w_, d_ = min(lw, 70), min(ld, 50); place(DK.garage(nm, w_, d_, 4, 39), cx, cy, face); col(w_, d_); return
    if lab == "OFFICES":
        for i, sx in enumerate((-1, 1)):
            o = DK.condo(f"office_{i}", min(lw / 2 - 6, 50), min(ld - 6, 24), 7, 60 + i); px = cx + sx * lw / 4 if face in "sn" else cx; py = cy if face in "sn" else cy + sx * lw / 4
            place(o, px, py, face); cbox(px, py, *world_dims(face, min(lw / 2 - 6, 50), min(ld - 6, 24)))
        return
    if lab == "CINEMA":
        k = min(lw / 30, ld / 22, 1.8); place(LMP.cinema("cinema"), cx, cy, face, k, k, k); col(30 * k, 22 * k)
        place(pylon("silverspot_sign", "silverspot", 8.0, 6.0), *front_pt(6), face); return                    # round 44: the real cinema is Silverspot
    if lab == "COOPER'S HAWK":
        px = x0 + 15; place(bldg("coopershawk", min(lw, 44), 28, 9.0, wall="#b9a58a", key="coopershawk", accent="#3a2a1a", roof="hip", roof_hex="#5a4a3a", sign_h=2.2), px, cy, face); cbox(px, cy, 28, min(lw, 44)); return
    if lab == "PLAZA":                                                                       # the Promenade's fountain plaza: pavers, fountain, cafe tables, a shop row along the back
        paver(x0, y0, x1, y1, "#d9cbb0"); place(LMP.fountain("prom_fountain"), cx, cy, "s"); ccir(cx, cy, 3.4)                # the main street: pavers, fountain, cafe tables, palms, arch at the Lyons end
        for i in range(12): place(LMP.cafe_set(f"cafe_{i}"), x0 + 20 + i * ((x1 - x0 - 40) / 11), cy + (12 if i % 2 else -12), "s")
        for i in range(int((x1 - x0) / 24)): prop("palm_tall", x0 + 12 + i * 24, cy + (20 if i % 2 else -20), 1.0)
        for i in range(int((x1 - x0) / 30)): place(LMP.lamp_post(f"plamp_{i}"), x0 + 15 + i * 30, cy + (6 if i % 2 else -6), "s")
        for i in range(int((x1 - x0 - 30) / 16)):                                                # planters, benches and shade oaks in the middle (fountain left clear)
            px = x0 + 18 + i * 16
            if abs(px - cx) < 14: continue
            place(LMP.planter(f"pplanter_{i}"), px, cy + 3, "s"); place(LMP.bench(f"pbench_{i}"), px + 5, cy - 2.5, "s"); cbox(px, cy + 3, 2.4, 1.2)
            if i % 2 == 0: prop("oak", px, cy - 6, .8)
        place(LMP.entry_arch("prom_arch"), x1 - 2, cy, "e"); place(pylon("prom_sign", "promenade", 7.0, 7.0), x1 - 4, y1 + 2, "e")
        return
    if lab in ("SHOPS", "", "SHOPS_N", "SHOPS_E", "SHOPS_W"):                                                                 # shop rows, back to back when the rectangle is deep
        rows = 2 if ld > 30 else 1
        for r in range(rows):
            if face in "sn": py = (y0 + 6.5 if r == 0 else y1 - 6.5) if rows == 2 else cy; shop_run(lw, cx, py, ("s" if face == "s" else "n") if rows == 1 else ("s" if r == 0 else "n"), int(cx + r))
            else: px = (x0 + 6.5 if r == 0 else x1 - 6.5) if rows == 2 else cx; shop_run(lw, px, cy, "w" if (rows == 1 and face == "w") or (rows == 2 and r == 0) else "e", int(cy + r))
        return
    if lab in ("WORLD OF BEER", "STARBUCKS"):                                                   # the Promenade's corner spots by the arch (user: Starbucks + World of Beer)
        key = "worldofbeer" if lab == "WORLD OF BEER" else "starbucks"; d_ = min(ld - 8, 24)
        wall = "#6b4a32" if key == "worldofbeer" else "#e9e1d0"; py = (y1 - d_ / 2) if face == "s" else (y0 + d_ / 2)
        bsign = lambda b, hx, hy, h, key=key: (b.box(flat(acc(key)), -hx * .6, hx * .6, hy + .06, hy + .2, h - 2.7, h - .3), b.box(sgn(key), -hx * .5, hx * .5, hy + .2, hy + .34, h - 2.5, h - .5))   # sign on the back too
        place(bldg(key, lw - 2, d_, 7.5, wall=wall, key=key, accent=acc(key), roof="flat", sign_h=2.0, glass_front=True, extra=bsign), cx, py, face); cbox(cx, py, lw - 2, d_)
        for i in range(3): place(LMP.cafe_set(f"{key}_patio_{i}", "#00704a" if key == "starbucks" else "#b5862a"), x0 + 8 + i * 13, (y0 + 3.5) if face == "s" else (y1 - 3.5), "s")
        return
    if lab == "McD":
        place(fastfood("mcd", "mcd"), cx, cy, face); col(17, 12); place(pylon("mcd_pylon", "mcd", 9.0), *front_pt(14), face); return
    if lab in ("WALGREENS", "PIZZA", "DELI", "CLEANERS"):
        key = lab.lower(); w_ = min(lw, 40 if lab == "WALGREENS" else 30); d_ = min(ld, 24 if lab == "WALGREENS" else 18)
        px = x0 + w_ / 2 + 2; place(bldg(f"{key}_{int(cx)}", w_, d_, 7.0, wall=RF.choice(["#efe6d2", "#e8d7b8", "#f2efe8"]), key=key, accent=acc(key), sign_h=1.8), px, cy, face); col(w_, d_, px)
        if lab == "WALGREENS": place(pylon("walgreens_pylon", "walgreens"), *front_pt(30), face)
        return
    if lab == "GAS + SHOPS ?":
        gx, gy = x0 + 14, cy; place(gas("wawa_sample", "wawa"), gx, gy, face); cbox(gx, gy + 7.5, 13, 6)
        n = int((lw - 40) / 9); shop_run(n * 9, x1 - n * 4.5 - 2, cy, face, 2)
        return
    h = 7; BB.box(flat(b_["color"]), x0, x1, y0, y1, 0, h); cbox(cx, cy, x1 - x0, y1 - y0)       # anything unknown keeps the M1 block
def lot_island(a, b0, b1, vert, blds):
    """Planted island along the seam of a double row of stalls: low curb + grass + palms every ~16 m (a gap every 60 m to cut through)."""
    seg0 = b0
    while seg0 < b1 - 8:
        seg1 = min(b1, seg0 + 52)
        x0, x1, y0, y1 = (seg0, seg1, a - .9, a + .9) if vert else (a - .9, a + .9, seg0, seg1)
        if not any(b_["x0"] - 2 < (x0 + x1) / 2 < b_["x1"] + 2 and b_["y0"] - 2 < (y0 + y1) / 2 < b_["y1"] + 2 for b_ in blds):
            BB.box(flat("#cfc8b8"), x0 - .15, x1 + .15, y0 - .15, y1 + .15, 0, .12); BB.box(flat("#5f9a3c"), x0, x1, y0, y1, 0, .16)
            t = seg0 + 6
            while t < seg1 - 4:
                px, py = (t, a) if vert else (a, t)
                if not in_bld(px, py, blds, 1.5): prop("palm_medium" if RF.random() < .7 else "oak", px, py, .9)
                t += 16
        seg0 = seg1 + 8
def lot_edge(a0, a1, b, vert, blds):
    """Hedge-and-palm strip along a lot edge (stops at buildings; round 44: split where a driveway crosses)."""
    for r in DRV_RECTS:
        rx0, rx1 = (r[1], r[3]) if vert else (r[0], r[2]); ry0, ry1 = (r[0], r[2]) if vert else (r[1], r[3])
        if ry0 - 1 < b < ry1 + 1 and rx0 < a1 and rx1 > a0:
            lot_edge(a0, rx0 - 1.5, b, vert, blds); lot_edge(rx1 + 1.5, a1, b, vert, blds); return
    x0, x1, y0, y1 = (b - .8, b + .8, a0, a1) if vert else (a0, a1, b - .8, b + .8)
    if a1 - a0 < 10: return
    BB.box(flat("#cfc8b8"), x0 - .15, x1 + .15, y0 - .15, y1 + .15, 0, .12); BB.box(flat("#5f9a3c"), x0, x1, y0, y1, 0, .16)
    t = a0 + 8
    while t < a1 - 4:
        px, py = (b, t) if vert else (t, b)
        if not in_bld(px, py, blds, 2.0): prop("palm_small" if RF.random() < .5 else "shrub_b", px, py)
        t += 14
BRAND_DEALERS = ("FORD", "TOYOTA", "HONDA", "KIA", "CHEVROLET", "NISSAN")

def dealer_cars(lot, blds):
    """Round 41 (user: "just like three rows of like five cars each, kind of spread out... a show area... a shop, a repair area, car wash"):
    a raised show pad up front (3 x 5 cars, angled), a hero car on a ramp, brand flags, a small customer lot, a service building + car wash beside the showroom."""
    x0, x1, y0, y1 = lot; cx = (x0 + x1) / 2; key = blds[0]["label"].lower(); A = flat(acc(key))
    BB.box(flat("#d9d6cf"), cx - 23, cx + 23, y0 + 5, y0 + 37, 0, .2); BB.box(A, cx - 23, cx + 23, y0 + 4.6, y0 + 5, 0, .22)          # show pad with a brand-colour edge
    for r in range(3):
        for i in range(5):
            x, y = cx - 17 + i * 8.5, y0 + 11 + r * 10.5; c = CARCOL[(i * 3 + r * 5 + len(key)) % len(CARCOL)]
            o = linked(f"dcar_{c[1:]}", lambda nm, c=c: display_car(nm, c)); place(o, x, y, rz=25 if (i + r) % 2 else -25); o.location.z = .2; cbox(x, y, 2.2, 4.6, 25 if (i + r) % 2 else -25)
    hx, hy = x0 + 9, y0 + 14; BB.box(flat("#9aa0a6"), hx - 3.2, hx + 3.2, hy - 3.2, hy + 3.2, 0, 1.3); BB.box(A, hx - 3.3, hx + 3.3, hy - 3.3, hy + 3.3, 1.3, 1.4)   # hero car up on a plinth
    c = CARCOL[4]; o = linked(f"dcar_{c[1:]}", lambda nm, c=c: display_car(nm, c)); place(o, hx, hy, rz=-35); o.location.z = 1.4; cbox(hx, hy, 6.6, 6.6)
    for i in range(8):                                                                            # flag poles along Sample
        fx = x0 + 6 + i * 11; tbox(FIX, flat("#d8dcdf"), fx - .07, fx + .07, y0 + 1.6, y0 + 1.75, 0, 7.0); tbox(FIX, A if i % 2 else flat("#f4f6f8"), fx + .07, fx + 1.6, y0 + 1.62, y0 + 1.72, 5.6, 6.8)
    place(pylon(f"py_{key}", key, 9.0, 5.0), x1 - 5, y0 + 3, "s")
    for yy in (y0 + 46, y0 + 63):                                                                 # small customer lot: two rows of stalls, a few cars
        for xx in range(int(x0 + 18), int(x1 - 14), 3):
            RB.box(m["white"], xx - .05, xx + .05, yy, yy + 5.2, .028, .034)
            if RF.random() < .3: c = CARCOL[RF.randrange(len(CARCOL))]; o = linked(f"dcar_{c[1:]}", lambda nm, c=c: display_car(nm, c)); place(o, xx + 1.5, yy + 2.6, rz=0 if yy > y0 + 50 else 180); cbox(xx + 1.5, yy + 2.6, 1.9, 4.5)
    def bays(b, hx_, hy_, h):
        for i in range(3): x = -hx_ + 4 + i * 7; b.box(flat("#8d9096"), x - 2.6, x + 2.6, -hy_ - .08, -hy_, .1, 4.4)
    sx, sy = x0 + 8.5, y0 + 84; place(bldg(f"svc_{key}", 22, 14, 6.5, wall="#d6d2c8", key="service", accent=acc(key), canopy=False, sign_h=1.4, extra=bays), sx, sy, "e"); cbox(sx, sy, 14, 22)
    wx, wy = x1 - 6, y0 + 80; place(carwash(f"cw_{key}", "carwash"), wx, wy, "w"); cbox(wx, wy, 9, 30)
    BB.box(flat("#cfcac0"), sx + 7, sx + 16, sy - 11, sy + 11, 0, .05)                                # service apron
    BB.box(flat("#5f9a3c"), x0 + 3, x1 - 3, y0 + 39.5, y0 + 42.5, 0, .16)                              # planted strip between the show pad and the customer lot
    for i in range(6): prop("palm_medium" if i % 2 else "shrub_a", x0 + 8 + i * 14.5, y0 + 41)
# ------------------------------------------------------------------ outparcel pads along US 441 and Powerline ------------------------------------------------------------------
def in_water(x, y, m=6):
    for lk in LP["lakes"]:
        if ((x - lk["x"]) / (lk["rx"] + m)) ** 2 + ((y - lk["y"]) / (lk["ry"] + m)) ** 2 < 1: return True
    return abs(x - LP["canal"]["x"]) < LP["canal"]["w"] / 2 + m and LP["canal"]["y0"] - m < y < LP["canal"]["y1"] + m
def rect_clear(x0, y0, x1, y1, pad=1.5, foot=True):
    for xx in [x0 + (x1 - x0) * i / 6 for i in range(7)]:
        for yy in [y0 + (y1 - y0) * j / 6 for j in range(7)]:
            if near_road(xx, yy, pad) or in_water(xx, yy, 2): return False
            if foot and any(f[0] < xx < f[2] and f[1] < yy < f[3] for f in FOOT): return False
    return True
GAS_K = ["wawa", "racetrac", "shell", "7eleven", "chevron", "mobil", "sunoco", "speedway"]
FOOD_K = ["chickfila", "tacobell", "burgerking", "wendys", "dunkin", "starbucks", "pollo", "checkers", "popeyes", "arbys", "chipotle", "subway", "kfc", "dennys", "tijuana", "pdq", "dominos"]
BANK_K = ["chase", "wellsfargo", "bofa", "tdbank", "citi"]; STORE_K = ["cvs", "autozone", "advance", "walgreens", "ups"]
SEQ = ["gas", "food", "bank", "food", "store", "food", "gas", "food", "carwash", "food", "bank", "food"]
CNT = {}
def nxt(lst, k): CNT[k] = CNT.get(k, -1) + 1; return lst[CNT[k] % len(lst)]
def pad(kind, frame, u, D=46, W=52):
    """One outparcel: asphalt pad (W along the road, D deep), the building at the back facing the road, a pylon sign at the road, a few parked cars."""
    P = frame["P"]; face = frame["face"]; a = P(u - W / 2, 1.5); b = P(u + W / 2, D)
    x0, x1, y0, y1 = min(a[0], b[0]), max(a[0], b[0]), min(a[1], b[1]), max(a[1], b[1])
    if not rect_clear(x0, y0, x1, y1): return False
    RB.box(m["asphalt"], x0, x1, y0, y1, 0, .028); FOOT.append((x0, y0, x1, y1)); MAP.append([round(x0, 1), round(y0, 1), round(x1, 1), round(y1, 1), "#5a5c60"])
    for (ua, ub) in ((u - W / 2, u - W / 2 + 6), (u - W / 2 + 15, u + W / 2 - 15), (u + W / 2 - 6, u + W / 2)):      # landscaped edge along the road (2 driveways)
        p0, p1 = P(ua, 1.5), P(ub, 5.0); BB.box(flat("#5f9a3c"), min(p0[0], p1[0]), max(p0[0], p1[0]), min(p0[1], p1[1]), max(p0[1], p1[1]), 0, .12)
        BB.box(flat("#cfc8b8"), min(p0[0], p1[0]) - .15, max(p0[0], p1[0]) + .15, min(p0[1], p1[1]) - .15, max(p0[1], p1[1]) + .15, 0, .1)
        if ub - ua > 10: prop("palm_medium", *P((ua + ub) / 2 - 5, 3.2)); prop("shrub_a", *P((ua + ub) / 2 + 3, 3.2)); prop("palm_medium", *P((ua + ub) / 2 + 9, 3.2))
    for uu in (u - W / 2 + 1.5, u + W / 2 - 1.5):
        p0, p1 = P(uu - 1.5, 5), P(uu + 1.5, D - 1); BB.box(flat("#5f9a3c"), min(p0[0], p1[0]), max(p0[0], p1[0]), min(p0[1], p1[1]), max(p0[1], p1[1]), 0, .12)
    if kind == "gas": key = nxt(GAS_K, "gas"); o = gas(f"gas_{key}_{int(u)}", key); bx, by = P(u, D / 2 + 1); place(o, bx, by, face); cbox(*P(u, D / 2 + 1 + 7.5), *world_dims(face, 14, 7))
    elif kind == "food": key = nxt(FOOD_K, "food"); o = fastfood(f"ff_{key}_{int(u)}", key); bx, by = P(u - 4, D - 10); place(o, bx, by, face); cbox(bx, by, *world_dims(face, 17, 12))
    elif kind == "bank": key = nxt(BANK_K, "bank"); o = bank(f"bank_{key}_{int(u)}", key); bx, by = P(u + 4, D - 11); place(o, bx, by, face); cbox(bx, by, *world_dims(face, 18, 14))
    elif kind == "store": key = nxt(STORE_K, "store"); o = bldg(f"st_{key}_{int(u)}", 34, 22, 7.0, wall="#efe9dc", key=key, accent=acc(key), sign_h=2.0); bx, by = P(u, D - 13); place(o, bx, by, face); cbox(bx, by, *world_dims(face, 34, 22))
    else: key = "carwash"; o = carwash(f"cw_{int(u)}", key); bx, by = P(u, D - 8); place(o, bx, by, face); cbox(bx, by, *world_dims(face, 30, 9))
    if kind != "gas": APRONS.append((bx, by, *world_dims(face, *{"food": (17, 12), "bank": (18, 14), "store": (34, 22)}.get(kind, (30, 9))), face))
    place(pylon(f"py_{key}_{int(u)}", key, 7.5 if kind != "gas" else 8.5), *P(u + W / 2 - 4, 4), face)
    for i in range(RF.randint(1, 4)):
        cx_, cy_ = P(u - W / 2 + 5 + i * 3.1, 9 + 0 * i)
        if ncar < 470: addcar(RF.choice(PASSENGER), cx_, cy_, FACE[face] + 180 + 90 * 0)
    return True
def bigbox(frame, u0, u1, v0, v1, key, wall="#d9d2c4", h=10.0, plaza=None):
    """Anchor store (or a plaza of shops) set back from the road with its own lot in front."""
    P = frame["P"]; face = frame["face"]; a, b = P(u0, v0), P(u1, v1); x0, x1, y0, y1 = min(a[0], b[0]), max(a[0], b[0]), min(a[1], b[1]), max(a[1], b[1])
    if not rect_clear(x0, y0, x1, y1, 1.0): return False
    RB.box(m["asphalt"], x0, x1, y0, y1, 0, .028); FOOT.append((x0, y0, x1, y1)); MAP.append([round(x0, 1), round(y0, 1), round(x1, 1), round(y1, 1), "#5a5c60"])
    bw, bd = min(130, u1 - u0 - 10), min(70, (v1 - v0) * .55); bx, by = P((u0 + u1) / 2, v1 - bd / 2 - 3)
    if plaza:
        o = BF.make_plaza(f"plaza_{int(u0)}", bw, bd * .5, 7.2, shops=plaza, tower_x=0, tower_sign="cc_plaza", seed=int(u0) % 50); bd = bd * .5; bx, by = P((u0 + u1) / 2, v1 - bd / 2 - 3)
    else: o = bldg(f"big_{key}", bw, bd, h, wall=wall, key=key, accent=acc(key), canopy=True, sign_h=4.0, back_doors=3)
    place(o, bx, by, face); cbox(bx, by, *world_dims(face, bw, bd)); APRONS.append((bx, by, *world_dims(face, bw, bd), face))
    c0, c1 = P(u0 + 10, v0 + 12), P(u1 - 10, v0 + 14); CORRALS.append((min(c0[0], c1[0]), min(c0[1], c1[1]), max(c0[0], c1[0]), max(c0[1], c1[1])))
    for s in range(int(u0 + 4), int(u1 - 4), 3):                                             # stall stripes, rows facing the store
        for v in (v0 + 4, v0 + 15.4, v0 + 20.6):
            if v + 5.2 < v1 - bd - 4:
                p0, p1 = P(s, v), P(s, v + 5.2); RB.box(m["white"], min(p0[0], p1[0]) - .05, max(p0[0], p1[0]) + .05, min(p0[1], p1[1]) - .05, max(p0[1], p1[1]) + .05, .028, .034)
                if RF.random() < .06 and ncar < 470: c_ = P(s + 1.5, v + 2.6); addcar(RF.choice(PASSENGER), c_[0], c_[1], FACE[face] + 90 * 0)
    return True
def fill_pads():
    X441, XP = LP["arterials"]["x441"], LP["arterials"]["xpower"]; XW, XE = LP["bounds"]["xw"], LP["bounds"]["xe"]
    W441 = {"P": lambda u, v: (X441 - 17 - v, u), "face": "e"}; WPOW = {"P": lambda u, v: (XP + 16 + v, -u), "face": "w"}
    n = 0
    # west of 441: anchors set back (Home Depot, Target, plazas...) with outparcels in front; Walmart already sits at 570-735
    anchors = [(-500, -330, "homedepot", None), (-260, -60, None, (("cc_nails", 6, "#7a2f6a"), ("cc_pizza", 6, "#b8321f"), ("cc_insurance", 7, "#0b4ea2"), ("cc_vape", 6, "#3a2a5a"), ("cc_barber", 6, "#b02a2a"), ("cc_taxes", 7, "#2e7d32"), ("cc_liquor", 7, "#7a1f1f"), ("cc_cuban", 8, "#7a1f1f"))),
               (70, 260, "target", None), (290, 460, "bestbuy", None), (880, 1040, "lafitness", None), (1120, 1330, None, (("cc_sushi", 7, "#b02a2a"), ("cc_bagels", 6, "#8a5a2a"), ("cc_nails", 6, "#7a2f6a"), ("cc_ups", 7, "#351c15"), ("cc_deli", 6, "#2f5e3a"), ("cc_cleaners", 7, "#2a4f8c"))),
               (1450, 1600, "ross", None), (1650, 1790, "petsmart", None)]
    for (u0, u1, key, plaza) in anchors:
        if bigbox(W441, u0, u1, 52, 128, key, plaza=plaza): n += 1
    u = LP["bounds"]["ys"] + 30; k = 0
    while u < LP["bounds"]["yn"] - 20:
        if pad(SEQ[k % len(SEQ)], W441, u, D=46, W=50): k += 1; n += 1; u += 56
        else: u += 8
    # east of Powerline: outparcels only (the strip is ~55 m deep)
    u = -(LP["bounds"]["yn"] - 30); k = 3
    while u < -(LP["bounds"]["ys"] + 20):
        if pad(SEQ[k % len(SEQ)], WPOW, u, D=44, W=50): k += 1; n += 1; u += 56
        else: u += 8
    print("pads placed", n)

# ------------------------------------------------------------------ after the houses: walls + hedges, more houses, yards, parks, Wynmoor, lights ------------------------------------------------------------------
def seg_box(T, mt, p, q, t, z0, z1):
    """Oriented box from p to q (thickness t, z0..z1) into the tiled builder T."""
    dx, dy = q[0] - p[0], q[1] - p[1]; L = math.hypot(dx, dy) or 1; nx, ny = -dy / L * t / 2, dx / L * t / 2
    c = [(p[0] - nx, p[1] - ny), (q[0] - nx, q[1] - ny), (q[0] + nx, q[1] + ny), (p[0] + nx, p[1] + ny)]          # counter-clockwise seen from above
    k = T._k(c); B_ = T.b.setdefault(k, Builder(f"{T.name}_{k[0]}_{k[1]}"))
    B_.poly(mt, [(x, y, z1) for x, y in c])
    for i in range(4):
        a_, b_ = c[i], c[(i + 1) % 4]; B_.poly(mt, [(a_[0], a_[1], z0), (b_[0], b_[1], z0), (b_[0], b_[1], z1), (a_[0], a_[1], z1)])
HGRID = {}
def hkey(x, y): return (int(x // 20), int(y // 20))
def hadd(x, y): HGRID.setdefault(hkey(x, y), []).append((x, y))
def hnear(x, y, r):
    kx, ky = hkey(x, y)
    for i in (-1, 0, 1):
        for j in (-1, 0, 1):
            for (a, b) in HGRID.get((kx + i, ky + j), []):
                if math.hypot(a - x, b - y) < r: return True
    return False
ROOFS = ["#a9573a", "#b8463a", "#bcb6aa", "#7a5a44", "#5d6670"]; HWALL = ["cream", "peach", "butter", "sand", "white", "stone"]
def yard(name, pool):
    """Back yard behind a house (house front = -y, 11 x 8.5 m): wood privacy fence + a pool with a screened cage for some."""
    b = Builder(name); F = flat("#9c7a55"); P_ = flat("#7d6145"); hy = 4.25; y0, y1 = hy, hy + 11; x0, x1 = -6.4, 6.4
    for (p, q) in (((x0, y0), (x0, y1)), ((x0, y1), (x1, y1)), ((x1, y1), (x1, y0))):
        L = math.dist(p, q); n = int(L / 2.4)
        b.box(F, min(p[0], q[0]) - .04, max(p[0], q[0]) + .04, min(p[1], q[1]) - .04, max(p[1], q[1]) + .04, .1, 1.8)
        for i in range(n + 1): t = i / max(1, n); x, y = p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t; b.box(P_, x - .07, x + .07, y - .07, y + .07, 0, 1.95)
    if pool:
        b.box(flat("#e8e2d4"), -4.2, 4.2, y0 + 1.0, y0 + 9.0, 0, .09); b.box(flat("#3fb6e0"), -3.2, 3.2, y0 + 2.6, y0 + 7.6, 0, .11)
    else: b.box(flat("#d8cfc0"), -3, 3, y0 + .2, y0 + 3.2, 0, .07); b.box(flat("#c9c3b8"), 3.2, 5.6, y1 - 3.2, y1 - .6, 0, 2.3)     # patio + shed
    return b.build(vc=True)
def extra_houses(placed_xy):
    """Houses along every local street at ~17 m (real Coconut Creek lot widths), fronts to the street, fenced back yards, skipping lots, parks, water, the shop strips."""
    for (x, y) in placed_xy: hadd(x, y)
    X441, XP = LP["arterials"]["x441"], LP["arterials"]["xpower"]; n = 0; added = []
    for r in net:
        if r.rank not in (4, 5) or r.hw < 3.5: continue
        if r.name.startswith(("ramp", "alley", "rbt", "Promenade")) or r.name in ("Aruba Way", "Cougar Way", "NW 15th St"): continue
        s = 9.0
        while s < r.L - 9:
            for side in (1, -1):
                off = side * (r.hw + 12.5); hx, hy = r.off(s, off)
                if hx < X441 - 12 or hx > XP + 12: continue
                if 35 < hx < 790 and 250 < hy < 465: continue                                   # Wynmoor gets condos
                if any(f[0] - 4 < hx < f[2] + 4 and f[1] - 4 < hy < f[3] + 4 for f in FOOT): continue
                if in_water(hx, hy, 14) or hnear(hx, hy, 14.5) or on_cut(hx, hy, 9): continue
                rr = near_road(hx, hy, 8.0)
                if rr is not None and rr is not r: continue
                if rr is r and r.nearest(hx, hy)[0] < r.hw + 8: continue
                bx, by = r.off(s, side * (r.hw + 12.5 + 14)); bad = near_road(bx, by, 2.0)          # back yard must not hit another street
                if bad is not None: continue
                px, py, _, _ = r.at(s); rz = math.degrees(math.atan2(px - hx, -(py - hy)))
                v = (n * 7 + int(s)) % 12; o = linked(f"house_m{v}", lambda nm, v=v: BF.make_house(nm, 11 if v % 2 == 0 else 10, 8.5, 1 + (v % 3 == 0), HWALL[v % 6], 500 + v, garage=v % 2 == 0, balcony=False, tile_hex=ROOFS[v % 5]))
                place(o, hx, hy, rz=rz); cbox(hx, hy, 11.2, 8.8, rz); HOUSE_T.append((hx, hy, rz))
                y_ = linked(f"yard_{v % 4}", lambda nm, v=v: yard(nm, v % 4 < 2)); place(y_, hx, hy, rz=rz)
                hadd(hx, hy); added.append((hx, hy)); n += 1
                if RF.random() < .35: prop("palm_small" if RF.random() < .6 else "shrub_a", *r.off(s + RF.uniform(-5, 5), side * (r.hw + 4.5)))
            s += 17.0
    print("extra houses", n); return added
def walls(all_houses):
    """Florida subdivision walls: cream stucco wall + clipped hedge + palms along the arterials wherever homes back onto them. Runs break at side streets,
    and every ~150 m there is a 6 m gap (a way in for the player: cut-throughs)."""
    for (x, y) in all_houses: hadd(x, y)
    STU = flat("#e9dcc0"); CAP = flat("#cdbf9f"); HED = flat("#2f6b2f"); HTOP = flat("#3f8a3a"); nseg = 0
    for r in net:
        if r.rank < 9 or r.closed: continue
        for side in (1, -1):
            off = side * (r.hw + rd.CURB + rd.SWK + 2.6); run = []; s = 4.0; since_gap = RF.uniform(40, 140)
            def flush(run):
                nonlocal nseg
                if len(run) < 4: return
                for p, q in zip(run, run[1:]):
                    seg_box(WL, STU, p, q, .35, 0, 2.3); seg_box(WL, CAP, p, q, .5, 2.3, 2.45)
                    seg_box(WL, HED, (p[0] + p[3] * 1.0, p[1] + p[4] * 1.0), (q[0] + q[3] * 1.0, q[1] + q[4] * 1.0), 1.1, 0, 1.05); seg_box(WL, HTOP, (p[0] + p[3] * 1.0, p[1] + p[4] * 1.0), (q[0] + q[3] * 1.0, q[1] + q[4] * 1.0), .95, 1.05, 1.2); nseg += 1
                for i in range(0, len(run) - 2, 6):
                    pi, qi = run[i], run[min(i + 6, len(run) - 1)]; cx_, cy_ = (pi[0] + qi[0]) / 2, (pi[1] + qi[1]) / 2
                    cbox(cx_, cy_, math.dist(pi[:2], qi[:2]), .9, math.degrees(math.atan2(qi[1] - pi[1], qi[0] - pi[0])))
                for i in range(0, len(run), 10): prop("palm_medium", run[i][0] + run[i][3] * 1.2, run[i][1] + run[i][4] * 1.2, col=True)
            while s < r.L - 4:
                x, y = r.off(s, off); bx, by = r.off(s, side * (r.hw + rd.CURB + rd.SWK + 30))
                ok = hnear(bx, by, 30) and not in_water(x, y, 2) and not on_cut(x, y, 5) and not any(f[0] - 2 < x < f[2] + 2 and f[1] - 2 < y < f[3] + 2 for f in FOOT)
                if ok:
                    rr = near_road(x, y, 3.0); ok = rr is None or rr is r
                since_gap -= 3
                if ok and since_gap <= 0: flush(run); run = []; since_gap = RF.uniform(120, 180); s += 6; continue
                if ok:
                    cx_, cy_, _, _ = r.at(s); nx_, ny_ = cx_ - x, cy_ - y                     # unit normal pointing back toward the road
                    nl = math.hypot(nx_, ny_) or 1; run.append((x, y, s, nx_ / nl, ny_ / nl))
                else: flush(run); run = []
                s += 3.0
            flush(run)
    print("wall segments", nseg)
def lights():
    """Cobra-head street lights along the arterials every ~48 m, both sides (merged per tile)."""
    pole = flat("#7d8288"); head = M("lamp_head", "#fff1c8", emit=.6)
    for r in net:
        if r.rank < 9 or r.closed: continue
        s = 20.0
        while s < r.L - 20:
            for side in (1, -1):
                x, y = r.off(s, side * (r.hw + rd.CURB + .5))
                if near_road(x, y, -1.0) is not None and near_road(x, y, -1.0) is not r: continue
                if in_drive(x, y, 1.5): continue                                                  # round 44: never on a driveway
                ax, ay = r.off(s, side * (r.hw + rd.CURB - 2.2)); k = FIX._k([(x, y)]); B_ = FIX.b.setdefault(k, Builder(f"fixtures_{k[0]}_{k[1]}"))
                B_.box(pole, x - .12, x + .12, y - .12, y + .12, 0, 8.6); seg_box(FIX, pole, (x, y), (ax, ay), .14, 8.4, 8.6); B_.box(head, ax - .35, ax + .35, ay - .35, ay + .35, 8.2, 8.45)
            s += 48.0
def parks():
    cm = CV.civic_mats(); Bp = Builder("parks_a"); Bq = Builder("parks_b"); Br = Builder("parks_c")
    nop = lambda *a, **k: None
    # Butterfly World (the dome conservatory + sculpture + gardens + a lot), Tradewinds Park
    o = DK.dome("butterfly_dome"); place(o, 600, 655, "s", 3.6, 3.6, 3.0); ccir(600, 655, 26)
    place(LMC.butterfly("bw_sculpture"), 600, 600, "s", 1.6, 1.6, 1.6); place(pylon("bw_sign", "butterfly", 7.0, 6.0), 470, 548, "s")
    for i in range(10):
        for j in range(3):
            x, y = 470 + i * 28, 700 + j * 18
            if math.hypot(x - 600, y - 655) > 35: Bp.box(flat(["#d63a4a", "#f2a23a", "#f08cb0", "#e8e8f0", "#c84ab8"][(i + j) % 5]), x - 8, x + 8, y - 3, y + 3, 0, .35)
    Bp.box(m["asphalt"], 420, 560, 560, 600, 0, .028)
    for yy in (562, 588):                                                                         # visitor lot: two rows of stalls, a few cars
        for xx in range(424, 556, 3):
            Bp.box(m["white"], xx - .05, xx + .05, yy, yy + 5.2, .028, .034)
            if RF.random() < .25 and ncar < 470: addcar(RF.choice(PASSENGER), xx + 1.5, yy + 2.6, 0 if yy > 570 else 180)
    # Sabal Pines Park: tennis, basketball, playground, pavilion, ball field
    for i in range(3): CV.tennis_court(Bq, cm, nop, 560 + i * 16, 1150)
    CV.basketball(Bq, cm, nop, 720, 1140); CV.playground(Bq, cm, nop, nop, 700, 1200, 14, 14); CV.pavilion(Bq, cm, nop, nop, 650, 1230)
    place(pylon("sabal_sign", "sabal", 5.0, 5.0), 560, 1105, "s")
    # Rec center south of the Pkwy: tennis row, basketball, skate park (bowls you can launch off), soccer fields, a ball diamond
    for i in range(4): CV.tennis_court(Br, cm, nop, 330 + i * 16, -110)
    for i in range(2): CV.basketball(Br, cm, nop, 120 + i * 20, -300)
    CV.field(Br, cm, 140, -420, 50, 95, 10, True)
    sk = Builder("skatepark"); C_ = flat("#c9c9c9"); C2 = flat("#a9a9a9"); sk.box(C_, 300, 500, -450, -350, 0, .06)
    for (x, y, d) in ((330, -400, 1), (470, -400, -1)):                                      # two quarter-pipe ramps (jumps)
        sk.prism(C2, (x - 6 if d > 0 else x, x if d > 0 else x + 6, y - 15, y + 15), (x - 6 if d > 0 else x + 5.7, x - 5.7 if d > 0 else x + 6, y - 15, y + 15), 0, 2.4)
    sk.box(C2, 390, 410, -420, -380, 0, .9); STATIC.append(sk.build(vc=True))
    CV.field(Br, cm, 225, -420, 50, 95, 10, True)
    for i in range(3): CV.picnic(Br, cm, nop, 560 + i * 12, -300) if hasattr(CV, "picnic") else None
    CV.playground(Br, cm, nop, nop, 610, -330, 16, 12); CV.pavilion(Br, cm, nop, nop, 660, -320)
    for _ in range(40):
        x, y = RF.uniform(60, 770), RF.uniform(-500, -250)
        if not (290 < x < 510 and -460 < y < -340) and not (100 < x < 260 and -475 < y < -365) and not (550 < x < 710 and -490 < y < -370) and not in_water(x, y, 4) and not near_road(x, y, 3): prop(RF.choice(["oak", "palm_tall", "oak"]), x, y)
    # high school football field + track by Lyons
    trk = Builder("hs_track")
    for k_ in range(48):
        a0, a1 = 2 * math.pi * k_ / 48, 2 * math.pi * (k_ + 1) / 48
        for (R0, R1, mt) in ((44, 52, cm["track"]),):
            p0 = (TRK[0] + R1 * 1.6 * math.cos(a0), TRK[1] + R1 * .8 * math.sin(a0)); p1 = (TRK[0] + R1 * 1.6 * math.cos(a1), TRK[1] + R1 * .8 * math.sin(a1))
            q0 = (TRK[0] + R0 * 1.6 * math.cos(a0), TRK[1] + R0 * .8 * math.sin(a0)); q1 = (TRK[0] + R0 * 1.6 * math.cos(a1), TRK[1] + R0 * .8 * math.sin(a1))
            trk.poly(mt, [(*q0, .04), (*p0, .04), (*p1, .04), (*q1, .04)])
    CV.field(CV.SwapB(trk), cm, TRK[1], TRK[0], 40, 100, 10, True); STATIC.append(trk.build(vc=True))
    for B_ in (Bp, Bq, Br): STATIC.append(B_.build(vc=True))
WYN = []
TRK = (150, 180)                                                                                # round 44: track centre (north end of the campus, on NW 15th St)
def wynmoor():
    """Wynmoor: mid-rise condo blocks round the golf course, a clubhouse, greens + sand traps, and the guard gate on Lyons."""
    cx, cy = 470, 360; n = 0
    for (yy, face) in ((470, "s"), (254, "n")):                                                   # condo rows outside the ring drive, facing the course
        for xx in range(110, 770, 48):
            if near_road(xx, yy, 9) or in_water(xx, yy, 10) or near_road(xx - 17, yy, 7) or near_road(xx + 17, yy, 7): continue
            o = linked(f"wyn_condo_{(xx // 48) % 3}", lambda nm, k=xx // 48: DK.condo(nm, 34, 14, 4, 80 + k % 3)); place(o, xx, yy, face); cbox(xx, yy, 34, 14); n += 1; WYN.append((xx, yy))
    g = Builder("wyn_golf")
    for (x, y, rr) in ((330, 330, 14), (610, 395, 16), (470, 300, 12), (560, 318, 10)): g.poly(flat("#9fd36b"), [(x + rr * math.cos(2 * math.pi * i / 16), y + rr * .7 * math.sin(2 * math.pi * i / 16), .06) for i in range(16)])
    for (x, y, rr) in ((350, 345, 6), (590, 380, 7), (500, 292, 5)): g.poly(flat("#e8d9a8"), [(x + rr * math.cos(2 * math.pi * i / 12), y + rr * .6 * math.sin(2 * math.pi * i / 12), .07) for i in range(12)])
    STATIC.append(g.build(vc=True))
    o = bldg("wyn_club", 40, 22, 7.0, wall="#f2ead6", key="wynmoor", accent="#2f4f2f", roof="hip", roof_hex="#bcb6aa", sign_h=1.8); place(o, 300, 420, "s"); cbox(300, 420, 40, 22)
    gt = LP["gate"]; o = DK.gate("wyn_gate", 14); place(o, gt[0] + 8, gt[1], "e"); place(pylon("wyn_sign", "wynmoor", 3.2, 6.0), gt[0] + 6, gt[1] + 16, "e")
    for yy in range(262, 462, 20): WYN.append((45, yy)); WYN.append((780, yy))
    for xx in range(45, 780, 20): WYN.append((xx, 470)); WYN.append((xx, 254))
    print("wynmoor condos", n); return WYN
def offices_and_site():
    for i, (x, y) in enumerate(((640, 1420), (730, 1420))):
        o = DK.condo(f"corp_{i}", 46, 22, 5 + i, 70 + i); place(o, x, y, "s"); cbox(x, y, 46, 22)
    place(pylon("corp_sign", "offices", 5.0, 6.0), 600, 1355, "s")
    for i in range(3): o = DK.containers(f"site_cont_{i}", 3, 2, 1 + i % 2, 90 + i); place(o, 520 + i * 40, 1690, "s"); cbox(520 + i * 40, 1690, 9, 6)
    # round 43: the warehouse + trucks became a real construction site (cc_fill3.construction)
def fill_after(placed_xy):
    added = extra_houses(placed_xy); tick_("extra houses")
    wyn = wynmoor(); walls(placed_xy + added + wyn); tick_("walls")
    lights(); parks(); offices_and_site(); tick_("parks")
    gap_fill()                 # round 43: stadium, ball fields, golf, construction site, offices, gardens/stables, lake parks, storage, townhomes, church
    believability()            # round 40: driveways, street furniture, power line, aprons, tree clusters
    grove_fill(); tick_("groves")   # round 43: tree islands in whatever grass is still bare
    STATIC.extend(WL.build(vc=True, recalc=False)); STATIC.extend(FIX.build(vc=True, recalc=False))
    return added
exec(open(os.path.join(HERE, "cc_fill2.py")).read())                                            # round 40: driveways, street furniture, power line, aprons, tree clusters, lot cars
