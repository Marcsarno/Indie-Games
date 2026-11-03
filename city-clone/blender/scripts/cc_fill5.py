"""Round 51 (user: "the Winmore is really bad. You just drive in and there's like almost no buildings. There's no guard gate. And there's just like a golf course right in
the middle" / "The school is weird. The way the buses are parked. I don't even know what school has like a bunch of random buses like that").
Exec'd at the end of cc_fill4.py. Everything here is in NEW (squeezed) map coordinates and runs outside warp(), from gap_fill (before T43 is built).
- wynmoor2(): guard gate on Lyons (gatehouse on a planted island, an arm across each lane, WYNMOOR monument walls), a palm-lined entry boulevard (plan: 11 m wide,
  Lyons -> the lake loop) with 4-5 storey condo blocks both sides over their own parking courts, the clubhouse + pool where the boulevard meets the loop.
- golf2(): the golf is only what is inside the small lake loop now: two holes, greens, sand, flags, a cart path, carts.
- hs_campus(): Coconut Creek High as a real campus: separate wings round a shaded courtyard (covered walks, trees, tables), gym, cafeteria, admin front,
  a parent drop-off loop on Cougar Way with two buses at the curb (was nine parked in a row).
BRK (breakables) collects knock-over things for the page: [kind, x, y, heading deg]."""
R5 = random.Random(51)
BRK = []
WYN_Y = SHK.fy(359); WYN_X1 = 390.0                     # boulevard centre line (y) and where it meets the loop

def gatehouse(b, x, y):
    """Booth (3 x 4 m, hip roof, glass all round) at local (x, y)."""
    ST = flat("#efe4c8"); RF = flat("#a9573a"); GLW = flat("#6f98ad")
    b.box(flat("#b8ab90"), x - 1.7, x + 1.7, y - 2.2, y + 2.2, 0, .4); b.box(ST, x - 1.5, x + 1.5, y - 2.0, y + 2.0, .4, 3.0)
    for (x0, x1, y0, y1) in ((x - 1.55, x + 1.55, y - 1.4, y + 1.4), (x - 1.0, x + 1.0, y - 2.05, y + 2.05)): b.box(GLW, x0, x1, y0, y1, 1.3, 2.5)
    b.prism(RF, (x - 2.1, x + 2.1, y - 2.6, y + 2.6), (x - .3, x + .3, y - .8, y + .8), 3.0, 4.3)

def monument(b, x, y, L=12.0, flip=1):
    """Low curved-ish stucco wall with the WYNMOOR sign and a bed of shrubs in front."""
    b.box(flat("#e9dcc0"), x - L / 2, x + L / 2, y - .4, y + .4, 0, 2.0); b.box(flat("#cdbf9f"), x - L / 2 - .2, x + L / 2 + .2, y - .5, y + .5, 2.0, 2.2)
    for s_ in (-1, 1): b.box(flat("#e9dcc0"), x + s_ * L / 2 - .7, x + s_ * L / 2 + .7, y - .7, y + .7, 0, 2.8); b.box(flat("#cdbf9f"), x + s_ * L / 2 - .85, x + s_ * L / 2 + .85, y - .85, y + .85, 2.8, 3.0)
    b.box(sgn("wynmoor"), x - 4.2, x + 4.2, y - .46 * flip - .02, y - .46 * flip + .02, .55, 1.75)
    b.box(flat("#5d9a3a"), x - L / 2, x + L / 2, y - 2.6 * flip - 1, y - 2.6 * flip + 1, 0, .18)

def wynmoor2():
    yc = WYN_Y; g = TB(T43); n = 0
    # ---- guard gate: island in the middle of the boulevard (x 34..66), booth at x 50, arms: in-lane (south, eastbound) at x 44, out-lane (north) at x 56
    g.box(flat("#c9c3b4"), 32, 68, yc - 1.4, yc + 1.4, 0, .16); g.box(flat("#5d9a3a"), 33, 67, yc - 1.1, yc + 1.1, .16, .2)
    gatehouse(g, 50, yc); cbox(50, yc, 36, 2.8)
    for (ax, side) in ((44, -1), (56, 1)):
        g.box(flat("#3a3c40"), ax - .3, ax + .3, yc + side * 1.0 - .3, yc + side * 1.0 + .3, 0, 1.1)      # arm post (the arm itself is a breakable, drawn by the page)
        BRK.append(["arm", round(ax, 2), round(yc + side * 1.0 + side * 2.4, 2), 90.0 if side > 0 else -90.0])
    # (no canopy over the lanes: from the play camera it was a big slab hiding your car)
    for s_ in (-1, 1): monument(g, 22, yc + s_ * 12.5, 12.0, -s_); cbox(22, yc + s_ * 12.5, 15, 1.6)
    for k in range(4): prop("palm_tall", 26 + k * 4.5, yc + 16.5); prop("palm_tall", 26 + k * 4.5, yc - 16.5)
    # ---- round 51b (user: "The gate arms are useless. Can just drive around them"): a solid community wall all the way round; the only ways in or out are the
    # two gate lanes (smash an arm), an exit gate with its own arm on NW 15th St (cut A4) and a bike-width gap where the Powerline trail comes in
    STU = flat("#e9dcc0"); CAP = flat("#cdbf9f"); X0, X1, Y0, Y1 = 50.0, 620.0, 250.0, 365.0
    def wall(x0, y0, x1, y1):
        if abs(x1 - x0) + abs(y1 - y0) < .5: return
        t = .2; bx0, bx1, by0, by1 = (min(x0, x1), max(x0, x1), y0 - t, y0 + t) if y0 == y1 else (x0 - t, x0 + t, min(y0, y1), max(y0, y1))
        g.box(STU, bx0, bx1, by0, by1, 0, 2.4); g.box(CAP, bx0 - .08, bx1 + .08, by0 - .08, by1 + .08, 2.4, 2.55)
        cbox((bx0 + bx1) / 2, (by0 + by1) / 2, bx1 - bx0, by1 - by0); FOOT.append((bx0 - .5, by0 - .5, bx1 + .5, by1 + .5))
    EX = 240.0
    wall(X0, Y0, X0, yc - 6.0); wall(X0, yc + 6.0, X0, Y1)                                          # the gate line (west)
    wall(X0, Y1, X1, Y1); wall(X0, Y0, EX - 2.3, Y0); wall(EX + 2.3, Y0, X1, Y0)                     # north, south (exit gap)
    wall(X1, Y0, X1, yc - .8); wall(X1, yc + .8, X1, Y1)                                             # east (bike gap)
    for px in (X0, X1):
        for py in (Y0, Y1): g.box(STU, px - .45, px + .45, py - .45, py + .45, 0, 2.9)
    for py in (yc - 6.0, yc + 6.0): g.box(STU, X0 - .45, X0 + .45, py - .45, py + .45, 0, 2.9)
    for px in (EX - 2.3, EX + 2.3): g.box(STU, px - .45, px + .45, Y0 - .45, Y0 + .45, 0, 2.9)
    g.box(flat("#3a3c40"), EX - 2.9, EX - 2.5, Y0 - .2, Y0 + .2, 0, 1.1); BRK.append(["arm", EX, Y0, 0.0])            # exit arm across the gap
    RB.box(ASPH, EX - 2.3, EX + 2.3, 242.0, Y0 + 14.0, 0, .028)                                      # exit lane from the condo court to NW 15th St
    for x in range(int(X0) + 8, int(X1), 9):                                                         # hedge + palms inside the wall
        for py in (Y0 + 1.6, Y1 - 1.6):
            if abs(x - EX) > 6 and not near_road(x, py, 2) and R5.random() < .5: prop("shrub_b", x, py, 1.0, col=False)
    # ---- condo blocks along the boulevard: a parking court in front (one row of stalls), the building behind it, lawn + palms at the back
    rows = (("n", yc + 10.5, yc + 23.5, yc + 31.5), ("s", yc - 23.5, yc - 10.5, yc - 31.5))
    for face, l0, l1, by in rows:
        xs = list(range(96, 300, 56)) + ([] if face == "n" else [320])
        for i, xx in enumerate(xs):
            if on_cut(xx, by, 22) or in_water(xx, by, 8):
                continue
            o = linked(f"wyn_condo_{i % 3}", lambda nm, k=i: DK.condo(nm, 46, 14, 4 + k % 2, 120 + k % 3)); place(o, xx, by, "n" if face == "s" else "s"); cbox(xx, by, 46, 14)
            FOOT.append((xx - 23, by - 7, xx + 23, by + 7)); MAP.append([xx - 23, by - 7, xx + 23, by + 7, "#d8cdb6"]); hadd(xx, by); n += 1
            for s_ in (-1, 1): prop(R5.choice(["palm_tall", "palm_medium"]), xx + s_ * 26, by + (5 if face == "n" else -5))
        surface_lot(80, 300 if face == "n" else 346, l0, l1, .38)
        for xd in (110, 190, 270):                                                                    # driveway cuts from the boulevard into the court
            y0, y1 = (yc + 5.5, l0 + .2) if face == "n" else (l1 - .2, yc - 5.5); RB.box(ASPH, xd - 3.5, xd + 3.5, min(y0, y1), max(y0, y1), 0, .175); DRV_RECTS.append((xd - 4, min(y0, y1), xd + 4, max(y0, y1)))
    # ---- clubhouse + pool where the boulevard meets the loop (north side)
    o = bldg("wyn_club2", 40, 20, 7.5, wall="#f2ead6", key="wynmoor", accent="#2f4f2f", roof="hip", roof_hex="#bcb6aa", sign_h=1.8); place(o, 334, yc + 31, "s"); cbox(334, yc + 31, 40, 20)
    FOOT.append((314, yc + 21, 354, yc + 41)); MAP.append([314, yc + 21, 354, yc + 41, "#e8dfc8"]); hadd(334, yc + 31)
    pb = Builder(uname("wyn_pool")); pb.box(PAVE, -12, 12, -7, 7, 0, .08); pb.box(flat("#3fb7d8"), -8.5, 8.5, -4, 4, .08, .1); chainlink(pb, [(-12, -7), (12, -7), (12, 7), (-12, 7), (-12, -7)], 1.3, flat("#2e3236"))
    for k in range(4): pb.box(flat("#f4f2ea"), -9 + k * 5, -7.6 + k * 5, 5, 6.6, .08, .45)
    put(pb, 372, yc + 30, 0); FOOT.append((360, yc + 23, 384, yc + 37)); cbox(372, yc + 30, 24, 14)
    surface_lot(300, 346, yc + 10.5, yc + 19.5, .3)
    # ---- the boulevard: palms in a row along both verges
    for x in range(78, 380, 14):
        for s_ in (-1, 1):
            py = yc + s_ * 8.2
            if not near_road(x, py, 6.6) and not any(f_[0] - 1 < x < f_[2] + 1 and f_[1] - 1 < py < f_[3] + 1 for f_ in FOOT): prop("palm_tall", x, py, 1.0)
    # ---- outer rows of the loop: palms + shrubs; no buildings fit between the loop and the edge streets
    for x in range(400, 600, 12):
        for py in (yc + 44, yc - 44):
            if not near_road(x, py, 5) and not in_water(x, py, 3): prop(R5.choice(["palm_medium", "shrub_a", "oak"]), x, py)
    # BRK: the page's breakables (mailbox/bin rows round the condo courts)
    for face, l0, l1, by in rows:
        for xx in range(90, 300, 28): BRK.append(["bin", round(xx, 2), round(l1 + .8 if face == "n" else l0 - .8, 2), 0.0])
    print("wynmoor2: condos", n)

def WYN_PERIM():
    """Wynmoor's outline as 'house' points, so walls() puts the community wall + hedge along Lyons / Copans / NW 15th St."""
    return []                                                                                       # round 51b: wynmoor2 builds its own closed wall

def golf2():
    """Inside the lake loop only: two short holes (west + east of the lake), greens, sand, flags, a cart path, carts parked by the clubhouse end."""
    yc = WYN_Y; b = TB(T43); FW, FW2 = flat("#9ad86a"), flat("#8dcf5d"); GR = flat("#9fd36b"); SAND = flat("#e8d9a8")
    lx0, lx1 = SHK.fx(460), SHK.fx(680)                                                               # lake x span (new coords)
    for (x0, x1) in ((402, lx0 - 6), (lx1 + 6, 592)):
        if x1 - x0 < 10: continue
        cx = (x0 + x1) / 2; rx = (x1 - x0) / 2; ry = 22
        for i in range(6):
            u0, u1 = -rx + 2 * rx * i / 6, -rx + 2 * rx * (i + 1) / 6; us = [u0 + (u1 - u0) * j / 4 for j in range(5)]
            top = [(u, ry * math.sqrt(max(0, 1 - (u / rx) ** 2))) for u in us]; pts = [(cx + u, yc - v) for u, v in top] + [(cx + u, yc + v) for u, v in top[::-1]]
            bpoly(b, FW if i % 2 else FW2, pts, .055)
        gx = cx + rx * .45; bdisc(b, GR, gx, yc + 6, 8, 6, .06, 16); bdisc(b, SAND, gx - 7, yc - 4, 4, 2.5, .07, 12)
        b.box(WHITE3, gx - .04, gx + .04, yc + 6 - .04, yc + 6 + .04, 0, 2.4); b.box(flat("#d6332a"), gx + .04, gx + .9, yc + 6 - .02, yc + 6 + .02, 1.85, 2.35)
    for k in range(3):
        x, y = 404 + k * 2.2, yc - 26
        if not near_road(x, y, 2.5): o = linked("golf_cart", golf_cart); place(o, x, y, rz=0); cbox(x, y, 1.4, 2.6)

def hs_campus():
    """Coconut Creek High: classroom wings round a courtyard (x 262..408, y 68..200), drop-off loop on Cougar Way."""
    W1 = "#d9b48a"; ACC = "#7a1f1f"; g = TB(T43)
    parts = [("cchs_n2", 335, 186, 128, 18, 9.0, "n", "cchs", 2),        # north classroom wing on NW 15th St (sign)
             ("cchs_s2", 335, 82, 128, 18, 8.0, "s", "cchs", 2),         # cafeteria + admin, front on the south lot (sign)
             ("cchs_gym2", 287, 134, 46, 52, 12.5, "w", None, 1),        # gym on Aruba Way
             ("cchs_e2", 396, 134, 18, 60, 9.0, "e", None, 2)]           # east wing
    for (nm, x, y, w, d, h, face, key, fl) in parts:
        ww, dd = world_dims(face, w, d)
        o = bldg(nm, ww, dd, h, wall=W1, key=key, accent=ACC, floors=fl, sign_h=2.0, canopy=False); place(o, x, y, face); cbox(x, y, w, d)
        FOOT.append((x - w / 2, y - d / 2, x + w / 2, y + d / 2)); MAP.append([x - w / 2, y - d / 2, x + w / 2, y + d / 2, "#c9a77e"])
    # courtyard x 311..386, y 92..176: lawn, paver cross paths, covered walks along the wing fronts, oaks, picnic tables, a shade sail
    g.box(flat("#6fae4a"), 311, 386, 92, 176, 0, .05)
    g.box(PAVE, 345, 351, 92, 176, 0, .07); g.box(PAVE, 311, 386, 131, 137, 0, .07); bdisc(g, PAVE, 348, 134, 9, 9, .075, 20)
    for (y0, y1) in ((92, 96), (172, 176)):
        g.box(flat("#e9e3d6"), 312, 385, y0, y1, 3.4, 3.7)
        for x in range(314, 386, 6): g.box(flat("#d0c8b8"), x - .15, x + .15, (y0 + y1) / 2 - .15, (y0 + y1) / 2 + .15, 0, 3.4)
    for (x0, x1) in ((311, 315), (382, 386)):
        g.box(flat("#e9e3d6"), x0, x1, 96, 172, 3.4, 3.7)
        for y in range(100, 172, 6): g.box(flat("#d0c8b8"), (x0 + x1) / 2 - .15, (x0 + x1) / 2 + .15, y - .15, y + .15, 0, 3.4)
    for (x, y) in ((328, 112), (368, 112), (328, 156), (368, 156)):
        prop("oak", x, y, 1.15)
        for k in (-1, 1): picnic(g, x + k * 6, y + (7 if y < 134 else -7))
    g.prism(flat("#f2f0e8"), (338, 358, 124, 144), (346, 350, 132, 136), 3.6, 4.4)
    for (x, y) in ((338, 124), (358, 124), (338, 144), (358, 144)): g.box(ALU, x - .1, x + .1, y - .1, y + .1, 0, 4.0)
    FOOT.append((262, 68, 408, 200))
    for (x0, x1) in ((262, 270), (404, 408)):                                                         # breezeways' ends: palms
        for y in (98, 170): prop("palm_medium", (x0 + x1) / 2, y)
    # parent drop-off loop on Cougar Way: asphalt lane, a curbed island with palms + a covered waiting walk, two buses at the north end, a few cars
    RB.box(ASPH, 410, 434, 72, 196, 0, .028); FOOT.append((408, 70, 436, 198))
    g.box(flat("#c9c3b4"), 420.5, 423.5, 84, 184, 0, .16); g.box(flat("#5d9a3a"), 421, 423, 84.5, 183.5, .16, .2); cbox(422, 134, 3, 100)
    for y in range(90, 182, 15): prop("palm_medium", 422, y)
    g.box(flat("#e9e3d6"), 406, 410, 96, 172, 3.0, 3.3)
    for y in range(98, 172, 8): g.box(flat("#d0c8b8"), 407.85, 408.15, y - .15, y + .15, 0, 3.0)
    for y in (66, 200): RB.box(ASPH, 410, 437, y - 6, y + 6, 0, .175); RB.box(ASPH, 410, 434, min(y, 72) if y < 72 else 196, max(y + 6, 72) if y < 72 else y + 6, 0, .028); DRV_RECTS.append((405, y - 6, 437, y + 6))
    for k, y in enumerate((178, 164)):
        o = linked("school_bus", lambda nm: CV.make_bus(nm)); place(o, 415.5, y, rz=0); cbox(415.5, y, 2.6, 10)
    for y in (104, 122, 141):
        if R5.random() < .8:
            c_ = CARCOL[R5.randrange(len(CARCOL))]; o_ = linked(f"dcar_{c_[1:]}", lambda nm, c_=c_: display_car(nm, c_)); place(o_, 428.5, y, rz=180); cbox(428.5, y, 1.9, 4.5)
    g.box(WHITE3, 409.6, 410, 88, 89, 0, 2.2); g.box(sgn("cchs"), 409.4, 409.6, 86.5, 90.5, 1.4, 2.2)
    print("hs_campus: wings", len(parts))

def picnic(b, x, y):
    b.box(WOOD, x - .9, x + .9, y - .4, y + .4, .74, .82); b.box(WOOD, x - .9, x + .9, y - .95, y - .7, .42, .48); b.box(WOOD, x - .9, x + .9, y + .7, y + .95, .42, .48)
    for sx in (-.7, .7): b.box(WOOD, x + sx - .06, x + sx + .06, y - .9, y + .9, 0, .74)

def brk_houses():
    """Every house's back-yard privacy fence (3 sides, 11 x 12.8 m, house front = -y) as breakable panels ~3.2 m long for the page."""
    n = 0
    for (hx, hy, rz) in HOUSE_T:
        a = math.radians(rz); ca, sa = math.cos(a), math.sin(a); Wp = lambda x, y: (hx + x * ca - y * sa, hy + x * sa + y * ca)
        x0, x1, y0, y1 = -6.4, 6.4, 4.25, 15.25
        for (p, q) in (((x0, y0), (x0, y1)), ((x0, y1), (x1, y1)), ((x1, y1), (x1, y0))):
            L = math.dist(p, q); k = max(1, round(L / 3.2))
            for i in range(k):
                u0, u1 = i / k, (i + 1) / k; P0 = Wp(p[0] + (q[0] - p[0]) * u0, p[1] + (q[1] - p[1]) * u0); P1 = Wp(p[0] + (q[0] - p[0]) * u1, p[1] + (q[1] - p[1]) * u1)
                c = ((P0[0] + P1[0]) / 2, (P0[1] + P1[1]) / 2)
                if near_road(c[0], c[1], 1.0) is not None or in_water(c[0], c[1], .5): continue
                BRK.append(["fence", round(c[0], 2), round(c[1], 2), round(math.degrees(math.atan2(P1[1] - P0[1], P1[0] - P0[0])), 1), round(L / k, 2)]); n += 1
    print("breakable fence panels", n)

RAMPS = []
def ramps():
    """Round 52 (user: shortcuts): concrete kicker ramps any car can launch off (page: world.ramps). (x, y) = the ramp's foot, heading = the way you jump."""
    b = TB(T43); CON = flat("#b8b2a6"); YEL = flat("#e8b21c"); DK_ = flat("#2a2c30"); DIRT = flat("#9a7a52")
    for (x, y, h, L, Wd, H, mat) in ((-233.0, 467.75, 0.0, 7.0, 5.0, 1.3, CON),          # dead end on the canal: over the canal onto the trail / the office lot
                                     (-229.0, 979.75, 180.0, 7.0, 4.6, 1.2, CON),        # the Promenade plaza: over the fountain (C1)
                                     (322.0, -246.0, 0.0, 6.0, 4.6, 1.2, CON),           # skate park, both ends
                                     (452.0, -246.0, 180.0, 6.0, 4.6, 1.2, CON),
                                     (562.0, 1322.0, 180.0, 9.0, 6.0, 1.6, DIRT)):       # construction site: a dirt ramp toward the slab
        a = math.radians(h); ux, uy = math.cos(a), math.sin(a); vx, vy = -uy, ux; P = lambda u, v, z: (x + ux * u + vx * v, y + uy * u + vy * v, z)
        hw = Wd / 2
        b.poly(mat, [P(0, -hw, .02), P(L, -hw, H), P(L, hw, H), P(0, hw, .02)])           # the slope
        b.poly(DK_, [P(L, -hw, 0), P(L, hw, 0), P(L, hw, H), P(L, -hw, H)])               # the drop at the back
        b.poly(mat, [P(0, -hw, 0), P(L, -hw, 0), P(L, -hw, H)]); b.poly(mat, [P(0, hw, 0), P(L, hw, H), P(L, hw, 0)])
        if mat is CON:
            for k in range(3): u0 = L - 1.2 + k * .0; b.poly(YEL, [P(L - .5, -hw + k * hw * .66, H * (L - .5) / L + .01), P(L, -hw + k * hw * .66 + hw * .33, H + .01), P(L, -hw + k * hw * .66 + hw * .66, H + .01), P(L - .5, -hw + k * hw * .66 + hw * .33, H * (L - .5) / L + .01)])
        RAMPS.append([round(x, 2), round(y, 2), h, L, Wd]); FOOT.append((min(P(0, -hw, 0)[0], P(L, hw, 0)[0]) - 1, min(P(0, -hw, 0)[1], P(L, hw, 0)[1]) - 1, max(P(0, -hw, 0)[0], P(L, hw, 0)[0]) + 1, max(P(0, -hw, 0)[1], P(L, hw, 0)[1]) + 1))
    print("ramps", len(RAMPS))
