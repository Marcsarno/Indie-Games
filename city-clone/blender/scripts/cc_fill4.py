"""Round 47 (user: "behind the building, there's ... its own little drive area with maybe a loading dock and dumpsters and a giant wall, no grass back there.
And then something that separates that from the residential houses ... I don't want to overdo it").
Exec'd at the end of cc_fill3.py. back_of_house() runs from fill_after (after the houses and the hand-placed sites, before the tree clusters): for every
commercial building big enough to have a back room (strip plazas, anchors, shop rows, Publix, Walmart...) it looks straight out the back:
  - a street/alley within 40 m  -> pave the service lane right up to it; if homes are on the far side, a buffer wall + hedge strip just past that street
  - homes within 60 m           -> a service lane up to 16 m deep, then the buffer wall + hedge strip between it and the back yards
  - nothing / another lot       -> just a short service lane (no wall: nothing to screen)
The lane gets dumpsters, a loading dock (+ roll-up doors on the store's back wall) and now and then a box truck. Lanes are merged on a 2 m grid and wall runs are
merged per line, so neighbouring shops share one lane and one wall (no flicker from overlapping faces)."""
BOH_LANES = set(); BOH_WALLS = {}; BOH_N = [0, 0, 0]
def _boh_dirs(face): return {"s": (0, 1), "n": (0, -1), "e": (-1, 0), "w": (1, 0)}[face]
def box_truck(name):
    b = Builder(name); W_ = flat("#f2f2ee"); CAB = flat("#d8d8d2"); T_ = flat("#1d1f22"); GLS_ = flat("#2a3540")
    b.box(W_, -1.25, 1.25, -2.0, 4.2, .9, 4.0); b.box(CAB, -1.2, 1.2, -4.2, -2.0, .7, 2.9); b.box(GLS_, -1.1, 1.1, -4.25, -4.15, 1.8, 2.7)
    for wy in (-3.2, 2.9):
        for wx in (-1.15, 1.15): b.cyl(T_, (wx, wy, .5), .5, .35, "x", 10)
    return b.build(vc=True)
def dumpster(b, x, y, along_x):
    G_ = flat("#2f5a3a"); L_ = flat("#1f3a28"); lx, ly = (1.0, .75) if along_x else (.75, 1.0)
    b.box(G_, x - lx, x + lx, y - ly, y + ly, .15, 1.45); b.box(L_, x - lx - .05, x + lx + .05, y - ly - .05, y + ly + .05, 1.45, 1.55); cbox(x, y, 2 * lx, 2 * ly)
def back_of_house():
    own_lots = [f for f in FOOT]
    BOH = Tiled("boh"); B_ = TB(BOH); DOOR = flat("#8d9096"); DOCK = flat("#b9b4a8"); BUMP = flat("#1d1f22")
    for (cx, cy, ww, dd, face) in list(APRONS):
        if max(ww, dd) < 26 or min(ww, dd) < 9: continue                                          # pads, kiosks, drive-thrus: no back room
        nx, ny = _boh_dirs(face)
        if nx == 0: half_w, half_d = ww / 2, dd / 2
        else: half_w, half_d = dd / 2, ww / 2
        ex, ey = cx + nx * half_d, cy + ny * half_d                                                # middle of the back wall
        tx, ty = -ny, nx                                                                           # along the back wall
        ts = [-half_w + 2 + (2 * half_w - 4) * i / 4 for i in range(5)]
        mine = [f for f in own_lots if f[0] - .5 < cx < f[2] + .5 and f[1] - .5 < cy < f[3] + .5]
        hit = None
        for d in range(1, 61):
            for t in ts:
                px, py = ex + nx * d + tx * t, ey + ny * d + ty * t
                r = near_road(px, py, .5)
                if r is not None: hit = ("road", d, r); break
                if hnear(px, py, 9): hit = ("house", d, None); break
                if in_water(px, py, 2): hit = ("water", d, None); break
                if any(f[0] < px < f[2] and f[1] < py < f[3] for f in own_lots if f not in mine): hit = ("foot", d, None); break
            if hit: break
        kind, d, r = hit if hit else ("none", 60, None)
        if kind == "road" and d <= 40: lane = d - .6
        elif kind == "house": lane = min(16.0, d - 11.0)
        else: lane = min(10.0, d - 2.0)
        if lane < 4: continue
        # service lane cells (2 m grid, merged later)
        for k in range(int(math.ceil(lane / 2))):
            for j in range(int(-half_w // 2) - 1, int(half_w // 2) + 2):
                t = j * 2.0; dd_ = min(lane, k * 2.0 + 1.0)
                px, py = ex + nx * dd_ + tx * t, ey + ny * dd_ + ty * t
                if near_road(px, py, .3) is None and not hnear(px, py, 7): BOH_LANES.add((int(math.floor(px / 2)), int(math.floor(py / 2))))
        FOOT.append((min(ex + tx * -half_w, ex + tx * half_w + nx * lane), min(ey + ty * -half_w, ey + ty * half_w + ny * lane),
                     max(ex + tx * -half_w, ex + tx * half_w + nx * lane), max(ey + ty * -half_w, ey + ty * half_w + ny * lane)))
        # dressing: roll-up doors + a dock on the back wall, dumpsters, sometimes a box truck
        n_ = max(1, int(2 * half_w / 22))
        for i in range(n_):
            t = -half_w + (i + .5) * 2 * half_w / n_; px, py = ex + tx * t, ey + ty * t
            o0, o1 = sorted((0.0, .12 * (nx + ny)))
            if abs(tx) > .5: B_.box(DOOR, px - 1.8, px + 1.8, py + o0, py + o1, .1, 4.0)
            else: B_.box(DOOR, px + o0, px + o1, py - 1.8, py + 1.8, .1, 4.0)
            if i % 2 == 0 and lane >= 7:
                qx, qy = px + nx * 1.6, py + ny * 1.6; ax, ay = (2.2, 1.6) if abs(tx) > .5 else (1.6, 2.2)
                B_.box(DOCK, qx - ax, qx + ax, qy - ay, qy + ay, 0, 1.2); cbox(qx, qy, 2 * ax, 2 * ay)
                if R3.random() < .3 and lane >= 12 and not on_cut(px + nx * 7, py + ny * 7, 4):
                    o = linked("box_truck", box_truck); place(o, px + nx * 7.2, py + ny * 7.2, rz=math.degrees(math.atan2(-nx, ny)) + 180); cbox(px + nx * 7.2, py + ny * 7.2, 2.6, 8.4, math.degrees(math.atan2(-nx, ny)))
            else:
                for s_ in (-2.6, 2.6):
                    qx, qy = px + tx * s_ + nx * 1.3, py + ty * s_ + ny * 1.3
                    if not on_cut(qx, qy, 3): dumpster(B_, qx, qy, abs(tx) > .5)
        BOH_N[0] += 1
        # buffer wall: past the street (homes on the far side) or at the end of the lane (homes right behind)
        wall_d = None
        if kind == "road" and d <= 40:
            for d2 in range(int(d), int(d) + 30):
                if all(near_road(ex + nx * d2 + tx * t, ey + ny * d2 + ty * t, 3.2) is None for t in ts[1:4]): wall_d = d2 + .5; break
            if wall_d is not None and not any(hnear(ex + nx * (wall_d + 20) + tx * t, ey + ny * (wall_d + 20) + ty * t, 22) for t in ts): wall_d = None
        elif kind == "house": wall_d = lane + .6
        if wall_d is None: continue
        ax_ = "x" if abs(tx) > .5 else "y"; line = round((ey + ny * wall_d) if ax_ == "x" else (ex + nx * wall_d), 0)
        a0 = (ex if ax_ == "x" else ey) - half_w - 10; a1 = (ex if ax_ == "x" else ey) + half_w + 10
        BOH_WALLS.setdefault((ax_, line, nx + ny), []).append((a0, a1))
    # merge the lane cells into row runs
    rows = {}
    for (i, j) in BOH_LANES: rows.setdefault(j, []).append(i)
    for j, xs in rows.items():
        xs.sort(); s0 = p_ = xs[0]
        for i in xs[1:] + [None]:
            if i is not None and i == p_ + 1: p_ = i; continue
            RB.box(ASPH, s0 * 2, (p_ + 1) * 2, j * 2, (j + 1) * 2, 0, .029); s0 = p_ = i
    # merged wall runs: stucco wall + cap, a hedge + trees on the homes' side, gaps at streets / detours / houses
    STU = flat("#e9dcc0"); CAP = flat("#cdbf9f"); HED = flat("#2f6b2f"); HTOP = flat("#3f8a3a")
    for (ax_, line, sg), iv in BOH_WALLS.items():
        iv.sort(); merged = [list(iv[0])]
        for a, b in iv[1:]:
            if a <= merged[-1][1] + 40: merged[-1][1] = max(merged[-1][1], b)
            else: merged.append([a, b])
        for a, b in merged:
            pts = []; t = a
            while t <= b:
                x, y = (t, line) if ax_ == "x" else (line, t)
                ok = near_road(x, y, 2.5) is None and not on_cut(x, y, 4) and not hnear(x, y, 6.5) and not in_water(x, y, 1)
                if ok: pts.append((x, y))
                if (not ok or t + 2 > b) and len(pts) >= 3:
                    p, q = pts[0], pts[-1]; hx, hy = (0, sg * 1.3) if ax_ == "x" else (sg * 1.3, 0)
                    seg_box(WL, STU, p, q, .35, 0, 2.8); seg_box(WL, CAP, p, q, .5, 2.8, 2.95)
                    seg_box(WL, HED, (p[0] + hx, p[1] + hy), (q[0] + hx, q[1] + hy), 1.2, 0, 1.3); seg_box(WL, HTOP, (p[0] + hx, p[1] + hy), (q[0] + hx, q[1] + hy), 1.0, 1.3, 1.45)
                    L_ = math.dist(p, q); cbox((p[0] + q[0]) / 2 + hx / 2, (p[1] + q[1]) / 2 + hy / 2, L_ if ax_ == "x" else 1.8, 1.8 if ax_ == "x" else L_)
                    for k in range(int(L_ // 13)):
                        u = (k + .5) / max(1, int(L_ // 13)); ox, oy = p[0] + (q[0] - p[0]) * u + hx * 2.6, p[1] + (q[1] - p[1]) * u + hy * 2.6
                        if not hnear(ox, oy, 5): prop("oak" if k % 3 else "palm_tall", ox, oy, R3.uniform(.95, 1.25))
                    FOOT.append((min(p[0], q[0]) - 3, min(p[1], q[1]) - 3, max(p[0], q[0]) + 3, max(p[1], q[1]) + 3)); BOH_N[1] += 1; BOH_N[2] += L_
                if not ok: pts = []
                t += 2
    STATIC.extend(BOH.build(vc=True, recalc=False))
    print("back of house: %d buildings, %d wall runs, %.0f m of wall" % tuple(BOH_N))

exec(open(os.path.join(HERE, "cc_fill5.py")).read())                                            # round 51: Wynmoor, golf, high school campus, breakables list
