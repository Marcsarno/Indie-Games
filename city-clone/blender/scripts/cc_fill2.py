"""Round 40 believability pass (user: "Too much open space not filled. Looks fake. Probably need sidewalks, bus stops. Things like that.").
Exec'd at the end of cc_fill.fill_after (shares cc_scene + cc_fill globals). Adds: driveways + parked cars + mailboxes + front-yard trees for every house,
street furniture on the arterials (bus shelters, benches, trash cans, hydrants, speed-limit signs, utility boxes), the FPL power line along Powerline Rd,
sidewalk aprons round the commercial buildings, cart corrals, and tree clusters in the leftover grass."""
DRV = Tiled("drives"); FUR = Tiled("furniture"); HYDRANTS = WList("pt")
CONC = flat("#cfcac0"); CONC2 = flat("#bdb8ad"); POLE = flat("#6b7078"); DARK = flat("#2e3236"); RED = flat("#c8362a"); GRN = flat("#3d6b45"); WHT = flat("#f2f2ee"); BLU = flat("#2a64b8")
def obox(T, mt, c, u, L, t, z0, z1, side=0.0, n=None):
    """Box centred at c (+ side along the normal n), length L along unit u, thickness t."""
    cx, cy = c[0] + (n[0] * side if n else 0), c[1] + (n[1] * side if n else 0)
    seg_box(T, mt, (cx - u[0] * L / 2, cy - u[1] * L / 2), (cx + u[0] * L / 2, cy + u[1] * L / 2), t, z0, z1)
def tbox(T, mt, x0, x1, y0, y1, z0, z1):
    k = T._k([(x0, y0), (x1, y1)]); B_ = T.b.setdefault(k, Builder(f"{T.name}_{k[0]}_{k[1]}"))
    if z1 - z0 < .061: B_.poly(mt, [(x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)])
    else: B_.box(mt, x0, x1, y0, y1, z0, z1)

def driveways():
    n_car = 0
    for i, (hx, hy, rz) in enumerate(HOUSE_T):
        a = math.radians(rz); f = (math.sin(a), -math.cos(a)); sd = (math.cos(a), math.sin(a))
        p0 = (hx + f[0] * 4.3 + sd[0] * 3.0, hy + f[1] * 4.3 + sd[1] * 3.0); L = None
        for k in range(1, 30):
            q = (p0[0] + f[0] * k, p0[1] + f[1] * k); r = near_road(q[0], q[1], rd.CURB + rd.SWK - .2)
            if r is not None: L = k; break
        if L is None or L < 3: continue
        q = (p0[0] + f[0] * L, p0[1] + f[1] * L); seg_box(DRV, CONC, p0, q, 4.4, 0, .05)
        w0 = (hx + f[0] * 4.3 - sd[0] * 1.0, hy + f[1] * 4.3 - sd[1] * 1.0)                      # front walk from the door to the driveway
        seg_box(DRV, CONC2, w0, (w0[0] + f[0] * 2.2, w0[1] + f[1] * 2.2), 1.2, 0, .045); seg_box(DRV, CONC2, (w0[0] + f[0] * 2.2, w0[1] + f[1] * 2.2), (p0[0] + f[0] * 2.2 - sd[0] * 2.2, p0[1] + f[1] * 2.2 - sd[1] * 2.2), 1.2, 0, .045)
        m_ = (q[0] - f[0] * .8 + sd[0] * 3.0, q[1] - f[1] * .8 + sd[1] * 3.0)                       # mailbox at the curb
        tbox(FUR, POLE, m_[0] - .06, m_[0] + .06, m_[1] - .06, m_[1] + .06, 0, 1.05); tbox(FUR, DARK if i % 3 else WHT, m_[0] - .25, m_[0] + .25, m_[1] - .25, m_[1] + .25, 1.0, 1.35)
        if RF.random() < .5 and L > 5.5 and n_car < 420:                                          # a car on about half the driveways
            c = CARCOL[(i * 5) % len(CARCOL)]; cpos = (p0[0] + f[0] * 3.0, p0[1] + f[1] * 3.0)
            o = linked(f"dcar_{c[1:]}", lambda nm, c=c: display_car(nm, c)); place(o, cpos[0], cpos[1], rz=rz + (180 if i % 2 else 0)); cbox(cpos[0], cpos[1], 1.9, 4.5, rz); n_car += 1
        if RF.random() < .55:                                                                      # a front-yard tree on the other side of the walk
            t = (hx + f[0] * (4.3 + L * .55) - sd[0] * 3.5, hy + f[1] * (4.3 + L * .55) - sd[1] * 3.5)
            if not near_road(t[0], t[1], 2.5): prop(RF.choice(["oak", "palm_medium", "oak", "palm_small", "shrub_b"]), t[0], t[1])
        if RF.random() < .6:                                                                       # foundation shrubs
            for s_ in (-3.5, 1.0): prop("shrub_a" if RF.random() < .5 else "shrub_b", hx + f[0] * 4.9 + sd[0] * s_ - sd[0] * 1.5, hy + f[1] * 4.9 + sd[1] * s_ - sd[1] * 1.5, .8, col=False)
    print("driveway cars", n_car)

def bus_stop(c, u, n):
    """Bus shelter on the back edge of the sidewalk: roof, glass back, posts, bench, blue stop sign, trash can."""
    obox(FUR, flat("#9aa3ad"), c, u, 4.4, 1.9, 2.55, 2.7, -.2, n); obox(FUR, flat("#9fc6d6"), c, u, 4.0, .08, .3, 2.4, -1.0, n)
    for s_ in (-2.0, 2.0): obox(FUR, POLE, (c[0] + u[0] * s_, c[1] + u[1] * s_), u, .12, .12, 0, 2.55, -1.0, n)
    obox(FUR, flat("#6b4a32"), c, u, 2.6, .5, .45, .55, -.6, n)
    sp = (c[0] + u[0] * 3.2, c[1] + u[1] * 3.2); obox(FUR, POLE, sp, u, .1, .1, 0, 2.8, .6, n); obox(FUR, BLU, sp, u, .6, .06, 2.2, 2.8, .6, n)
    tp = (c[0] - u[0] * 3.0, c[1] - u[1] * 3.0); obox(FUR, flat("#3a4a3a"), tp, u, .55, .55, 0, .9, -.6, n)
def street_furniture():
    nb = 0
    for r in net:
        if r.rank < 9 or r.closed: continue
        for side in (1, -1):
            s = 60.0 + (150 if side < 0 else 0); hyd = 30.0 + side * 10; sgn_ = 120.0; ub = 80.0
            while s < r.L - 30:
                x, y, tx, ty = r.at(s); tl = math.hypot(tx, ty) or 1; u = (tx / tl, ty / tl)
                c = r.off(s, side * (r.hw + rd.CURB + rd.SWK - .9)); nrm = ((c[0] - x), (c[1] - y)); nl = math.hypot(*nrm) or 1; nrm = (nrm[0] / nl, nrm[1] / nl)
                clear = (near_road(c[0], c[1], -1.0) in (None, r)) and not any(f[0] - 1 < c[0] < f[2] + 1 and f[1] - 1 < c[1] < f[3] + 1 for f in FOOT[:0])
                other = near_road(*r.off(s, side * (r.hw + 14)), 2.0)
                if clear and other in (None, r) and not on_cut(c[0], c[1], 6) and not in_drive(c[0], c[1], 4): bus_stop(c, u, nrm); nb += 1
                s += 360.0
            s = hyd
            while s < r.L - 10:                                                                     # hydrants at the curb, speed signs, utility boxes behind the walk
                h_ = r.off(s, side * (r.hw + rd.CURB + .5))
                if near_road(h_[0], h_[1], -.5) in (None, r) and not in_drive(h_[0], h_[1], 1): HYDRANTS.append((h_[0], h_[1]))           # round 42: drawn + broken in the page (hydrant.js)
                if int(s / 95) % 3 == 1:
                    g = r.off(s + 12, side * (r.hw + rd.CURB + rd.SWK + .9))
                    if near_road(g[0], g[1], .5) is None and not in_drive(g[0], g[1], 1): tbox(FUR, GRN, g[0] - .5, g[0] + .5, g[1] - .35, g[1] + .35, 0, 1.2)
                if int(s / 95) % 4 == 2:
                    p_ = r.off(s + 30, side * (r.hw + rd.CURB + .7)); x_, y_, tx, ty = r.at(s + 30); tl = math.hypot(tx, ty) or 1
                    if near_road(p_[0], p_[1], -.5) in (None, r) and not in_drive(p_[0], p_[1], 1): tbox(FUR, POLE, p_[0] - .05, p_[0] + .05, p_[1] - .05, p_[1] + .05, 0, 2.9); obox(FUR, WHT, p_, (tx / tl, ty / tl), .1, .62, 2.0, 2.85)
                s += 95.0
    print("bus stops", nb)

def power_line():
    """FPL transmission line along Powerline Rd (the road is named after it): concrete monopoles every ~110 m on the west side, 3 crossarms, wires."""
    X = LP["arterials"]["xpower"] - 24.0; tops = []; y = LP["bounds"]["ys"] + 20
    while y < LP["bounds"]["yn"] - 10:
        if near_road(X, y, 6) is None and not in_water(X, y, 3):
            B_ = FUR.b.setdefault(FUR._k([(X, y)]), Builder(f"furniture_{FUR._k([(X, y)])[0]}_{FUR._k([(X, y)])[1]}"))
            B_.prism(flat("#b9b5ac"), (X - .7, X + .7, y - .7, y + .7), (X - .35, X + .35, y - .35, y + .35), 0, 26)
            for z in (19.0, 22.0, 25.0): B_.box(DARK, X - 4.2, X + 4.2, y - .18, y + .18, z, z + .3)
            for z in (19.0, 22.0, 25.0):
                for sx in (-4.0, 4.0): B_.box(flat("#7c8c96"), X + sx - .12, X + sx + .12, y - .12, y + .12, z - .9, z)
            ccir(X, y, .9); tops.append(y)
        y += 110
    for a, b in zip(tops, tops[1:]):
        if b - a > 240: continue
        for z in (18.1, 21.1, 24.1):
            for sx in (-4.0, 4.0): seg_box(FUR, DARK, (X + sx, a), (X + sx, b), .05, z - .05, z)
    print("power poles", len(tops))

def apron(cx, cy, ww, dd, front=3.5, side=1.5, face="s"):
    """Concrete sidewalk round a building footprint (world-axis rectangle ww x dd), deeper on the entrance side."""
    x0, x1, y0, y1 = cx - ww / 2 - side, cx + ww / 2 + side, cy - dd / 2 - side, cy + dd / 2 + side
    if face == "s": y0 -= front - side
    elif face == "n": y1 += front - side
    elif face == "e": x1 += front - side
    else: x0 -= front - side
    tbox(DRV, CONC, x0, x1, y0, y1, 0, .07)
def cart_corrals(x0, y0, x1, y1, n=3):
    for i in range(n):
        x = x0 + (i + 1) * (x1 - x0) / (n + 1); y = (y0 + y1) / 2
        for dx in (-.9, .9): tbox(FUR, flat("#9aa0a6"), x + dx - .05, x + dx + .05, y - 3, y + 3, 0, 1.0)
        tbox(FUR, flat("#c8362a"), x - .95, x + .95, y + 2.95, y + 3.05, .7, 1.0)

def tree_clusters():
    """Leftover grass gets clumps of live oaks / palms / sabals with shrubs round them (real Coconut Creek has trees everywhere)."""
    XW_, XE_, YS_, YN_ = LP["bounds"]["xw"], LP["bounds"]["xe"], LP["bounds"]["ys"], LP["bounds"]["yn"]; n = 0; step = 34
    for gx in range(int(XW_) + 10, int(XE_) - 10, step):
        for gy in range(int(YS_) + 10, int(YN_) - 10, step):
            if RF.random() > .5: continue
            x, y = gx + RF.uniform(-12, 12), gy + RF.uniform(-12, 12)
            if near_road(x, y, 7) or in_water(x, y, 6) or hnear(x, y, 13) or on_cut(x, y, 6): continue
            if any(f[0] - 3 < x < f[2] + 3 and f[1] - 3 < y < f[3] + 3 for f in FOOT): continue
            if 80 < x < 790 and 835 < y < 1040: continue                                           # Trash Mountain
            if 35 < x < 790 and 250 < y < 465 and math.hypot((x - 470) / 230, (y - 360) / 85) < 1: continue    # golf course inside the ring
            k = RF.choice(["oak", "oak", "palm_tall", "palm_medium", "oak"])
            for j in range(RF.randint(2, 4)):
                prop(k if j == 0 else RF.choice(["oak", "palm_medium", "palm_tall"]), x + RF.uniform(-6, 6), y + RF.uniform(-6, 6))
            for j in range(RF.randint(1, 3)): prop(RF.choice(["shrub_a", "shrub_b"]), x + RF.uniform(-7, 7), y + RF.uniform(-7, 7), col=False)
            n += 1
    print("tree clusters", n)

def verge_trees():
    """Tree belt along every arterial: live oaks and tall palms 6-11 m behind the sidewalk (behind the subdivision walls, in front of the shops)."""
    n = 0
    for r in net:
        if r.rank < 9 or r.closed: continue
        for side in (1, -1):
            s = RF.uniform(5, 15)
            while s < r.L - 5:
                x, y = r.off(s, side * (r.hw + rd.CURB + rd.SWK + RF.uniform(6.5, 11)))
                if not (near_road(x, y, 3) or in_water(x, y, 3) or on_cut(x, y, 5) or hnear(x, y, 8) or any(f[0] - 1 < x < f[2] + 1 and f[1] - 1 < y < f[3] + 1 for f in FOOT)):
                    prop(RF.choice(["oak", "oak", "palm_tall", "oak", "palm_medium"]), x, y); n += 1
                    if RF.random() < .4: prop(RF.choice(["shrub_a", "shrub_b"]), x + RF.uniform(-3, 3), y + RF.uniform(-3, 3), col=False)
                s += RF.uniform(14, 22)
    print("verge trees", n)
def lot_fill(x, y, x0, x1, y0, y1, blds):
    """Chance a stall is taken: busy near the buildings' doors, thinning out to the far corners (Florida lots are never full at the edges)."""
    if not blds: return .08                                                                   # round 46 (user: far fewer parked cars)
    d = min(math.hypot(x - min(max(x, b_["x0"]), b_["x1"]), y - min(max(y, b_["y0"]), b_["y1"])) for b_ in blds)
    return max(.03, .32 - d / 110)
def local_hydrants():
    """Hydrants on the neighbourhood streets too, every ~110 m, at the curb."""
    for r in net:
        if r.rank not in (4, 5) or r.hw < 3.5 or r.name.startswith(("alley", "ramp", "rbt")): continue
        s = 40.0
        while s < r.L - 10:
            h_ = r.off(s, (1 if int(s / 110) % 2 else -1) * (r.hw + rd.CURB + .5))
            if near_road(h_[0], h_[1], -.5) in (None, r) and not hnear(h_[0], h_[1], 3) and not in_drive(h_[0], h_[1], 1): HYDRANTS.append((h_[0], h_[1]))
            s += 110.0
def believability():
    local_hydrants(); driveways(); tick_("driveways"); street_furniture(); power_line(); verge_trees(); tree_clusters(); tick_("furniture")
    for (cx, cy, ww, dd, face) in APRONS: apron(cx, cy, ww, dd, face=face)
    for rect in CORRALS: cart_corrals(*rect)
    STATIC.extend(DRV.build(vc=True, recalc=False)); STATIC.extend(FUR.build(vc=True, recalc=False))
exec(open(os.path.join(HERE, "cc_fill3.py")).read())                                            # round 43: gap fill (stadium, fields, golf, site, parks, storage, townhomes, church, groves)
