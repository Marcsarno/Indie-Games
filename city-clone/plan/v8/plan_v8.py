"""Plan v8: ARCADE Coconut Creek (round 54; user: "it matters less about an exact recreation and more for traversal to be fun" / shrink the city / keep the
landmarks / variety in the driving / arcade). 1000 x 900 m (cc was 1525 x 1758): a third of the area. The street grid is invented: every stretch of road is a
different kind of driving, the landmarks are set pieces along them. x east, y north, metres. Draws plan_v8.png and writes layout_v8.json (sketch stage)."""
import json, math
from PIL import Image, ImageDraw, ImageFont
W, H = 1000, 900
def cr(pts, closed=False, n=14):
    """Catmull-Rom through pts."""
    P = list(pts); out = []; N = len(P)
    rng = range(N) if closed else range(N - 1)
    for i in rng:
        p0 = P[(i - 1) % N] if closed or i > 0 else P[0]; p1 = P[i % N]; p2 = P[(i + 1) % N]; p3 = P[(i + 2) % N] if closed or i + 2 < N else P[-1]
        for k in range(n):
            t = k / n; t2, t3 = t * t, t * t * t
            out.append(tuple(.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3) for j in (0, 1)))
    if not closed: out.append(tuple(P[-1]))
    return out
KIND = {  # colour, width m, what the driving is
    "loop":   ("#ffd24a", 20, "THE LOOP: wide, fast sweepers all the way round (drift corners)"),
    "blvd":   ("#ff8a3c", 22, "LYONS BLVD: dead-straight top-speed run with a palm median"),
    "chic":   ("#ff5fa2", 14, "SAMPLE RD: S-bends and chicanes through the shops"),
    "lake":   ("#4fd0ff", 9,  "LAKESHORE DR: twisty two-lane round the lake, hairpins"),
    "canal":  ("#8be36a", 8,  "CANAL RUN: narrow bank road, ramps across the water"),
    "dirt":   ("#c9a36b", 8,  "MOUNTAIN RD: dirt switchbacks over Trash Mountain, a jump off the top"),
    "slalom": ("#d9d9d9", 7,  "NEIGHBOURHOODS: tight streets, fences + cracked walls to cut through"),
    "local":  ("#b8b8c0", 9,  "connectors"),
}
ROADS = []
def road(name, kind, pts, closed=False, smooth=True): ROADS.append(dict(name=name, kind=kind, closed=closed, pts=[(round(x, 1), round(y, 1)) for x, y in (cr(pts, closed) if smooth else pts)]))
RBT = [(500, 450, 34, "City Hall Circle"), (640, 462, 16, ""), (712, 418, 16, ""), (790, 428, 16, "")]
road("The Loop", "loop", [(130, 130), (300, 62), (520, 78), (720, 70), (900, 170), (948, 400), (930, 600), (860, 760), (660, 838), (430, 846), (200, 800), (72, 640), (52, 420), (66, 250)], closed=True)
road("Lyons Blvd", "blvd", [(505, 76), (505, 416)], smooth=False); road("Lyons Blvd", "blvd", [(500, 484), (500, 842)], smooth=False)
road("Sample Rd", "chic", [(53, 440), (130, 470), (215, 520), (300, 500), (360, 432), (420, 418), (466, 450)])
road("Sample Rd", "chic", [(534, 450), (590, 452), (624, 462)]); road("Sample Rd", "chic", [(656, 462), (684, 446), (700, 428)]); road("Sample Rd", "chic", [(726, 412), (752, 410), (776, 422)])
road("Sample Rd", "chic", [(806, 430), (860, 440), (944, 420)])
CANAL = [(236, 872), (252, 740), (262, 640), (298, 520), (330, 430), (322, 352)]            # from the north edge down into the lake
road("Canal Run", "canal", [(280, 812), (284, 740), (292, 640), (326, 524), (360, 432)])
LAKE = (232, 285, 108, 78)
road("Lakeshore Dr", "lake", [(150, 118), (118, 190), (96, 270), (112, 350), (170, 396), (250, 392), (322, 372), (362, 318), (350, 250), (372, 190), (340, 130), (300, 66)])
PEN = (150, 292, 40, 24)                                                                       # Dave's peninsula into the lake
road("Dave's Ct", "slalom", [(98, 286), (126, 292), (160, 292)], smooth=False)
MTN = (770, 640, 118, 96)
road("Mountain Rd", "dirt", [(500, 640), (580, 662), (650, 700), (720, 730), (800, 716), (848, 660), (822, 596), (770, 580), (730, 620), (770, 650)])
road("Mountain Rd", "dirt", [(848, 660), (900, 672), (932, 660)])
# neighbourhood slalom (The Hammocks) between the lake road and Lyons
for i, y in enumerate((130, 180, 230, 280, 330)): road(f"Hammock {i+1}", "slalom", [(398 if i % 2 else 386, y), (440, y + (8 if i % 2 else -8)), (497, y)], smooth=True)
road("Hammocks Way", "slalom", [(392, 110), (410, 200), (392, 290), (412, 372)])
# Promenade + casino + Publix + school + Wynmoor access
road("Promenade Blvd", "local", [(204, 800), (236, 740), (290, 692), (420, 688), (500, 690)])
road("Casino Dr", "local", [(72, 640), (120, 632), (190, 606), (218, 560), (215, 520)])
road("Publix Way", "local", [(500, 790), (590, 792), (660, 838)])
road("Cougar Way", "local", [(505, 200), (590, 196), (630, 130), (640, 74)]); road("Stadium Oval", "local", [(700, 240), (760, 240), (790, 205), (760, 170), (700, 170), (670, 205)], closed=True)
road("Wynmoor Blvd", "local", [(790, 412), (800, 330), (860, 300), (946, 320)])
LMK = [  # name, x0, y0, x1, y1, colour
    ("PUBLIX", 520, 716, 640, 774, "#2e8b3e"), ("THE PROMENADE", 300, 706, 470, 790, "#c2457a"), ("GARAGE (roof jump)", 400, 628, 462, 672, "#7a7f8a"),
    ("SEMINOLE CASINO", 96, 540, 180, 596, "#c8901e"), ("CITY HALL", 476, 426, 524, 474, "#2f6fb3"), ("POLICE", 536, 492, 590, 528, "#1d3f8a"),
    ("BUTTERFLY WORLD", 556, 540, 640, 600, "#58b368"), ("WYNMOOR (gate + condos)", 812, 250, 936, 300, "#d8cdb6"), ("COCONUT CREEK HIGH", 600, 240, 690, 300, "#c9a77e"),
    ("WALMART", 84, 404, 160, 444, "#2a5aa8"), ("DEALERS ROW", 336, 500, 440, 540, "#9aa0a6"), ("McD + shops", 540, 380, 610, 430, "#d6332a"), ("DAVE", 156, 282, 176, 302, "#e33b3b")]
JUMPS = [(385, 748, "fountain"), (236, 660, "canal ramp"), (300, 470, "canal ramp"), (770, 650, "summit jump"), (431, 650, "garage roof"), (730, 205, "stadium")]
if __name__ == "__main__":
    S = 1.5; im = Image.new("RGB", (int(W * S) + 520, int(H * S) + 40), "#22301f"); d = ImageDraw.Draw(im)
    try: F = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 15); FS = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 13); FB = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)
    except Exception: F = FS = FB = ImageFont.load_default()
    P = lambda x, y: (20 + x * S, 20 + (H - y) * S)
    d.rectangle([P(0, H), P(W, 0)], fill="#5d9a3a")
    x, y, rx, ry = LAKE; d.ellipse([P(x - rx, y + ry), P(x + rx, y - ry)], fill="#3f8fd0")
    x, y, rx, ry = MTN
    for k, col in ((1, "#7d7448"), (.72, "#867d4e"), (.45, "#93895a"), (.2, "#a39a6a")): d.ellipse([P(x - rx * k, y + ry * k), P(x + rx * k, y - ry * k)], fill=col)
    d.line([P(*p) for p in cr(CANAL)], fill="#3f8fd0", width=int(15 * S)); x, y, rx, ry = PEN; d.ellipse([P(x - rx, y + ry), P(x + rx, y - ry)], fill="#5d9a3a")
    for n, x0, y0, x1, y1, col in LMK: d.rectangle([P(x0, y1), P(x1, y0)], fill=col, outline="#101410")
    for r in ROADS:
        col, wdt, _ = KIND[r["kind"]]; pts = [P(*p) for p in r["pts"]] + ([P(*r["pts"][0])] if r["closed"] else [])
        d.line(pts, fill="#30333a", width=int((wdt + 5) * S), joint="curve"); d.line(pts, fill=col, width=max(3, int(wdt * S * .55)), joint="curve")
    for x, y, r_, n in RBT: d.ellipse([P(x - r_, y + r_), P(x + r_, y - r_)], outline="#30333a", width=int(12 * S)); d.ellipse([P(x - r_, y + r_), P(x + r_, y - r_)], outline="#ff5fa2", width=int(5 * S))
    for x, y, n in JUMPS: c = P(x, y); d.ellipse([c[0] - 11, c[1] - 11, c[0] + 11, c[1] + 11], fill="#ffe14a", outline="#111"); d.text((c[0] - 4, c[1] - 9), "J", fill="#111", font=F)
    for n, x0, y0, x1, y1, col in LMK:
        c = P((x0 + x1) / 2, y1); tw = d.textlength(n, font=F); d.rectangle([c[0] - tw / 2 - 3, c[1] - 20, c[0] + tw / 2 + 3, c[1] - 2], fill="#101410"); d.text((c[0] - tw / 2, c[1] - 19), n, fill="#fff", font=F)
    c = P(770, 640); d.text((c[0] - 62, c[1] - 8), "TRASH MOUNTAIN", fill="#fff", font=F); c = P(232, 285); d.text((c[0] - 20, c[1] + 20), "LAKE", fill="#fff", font=F)
    X0 = int(W * S) + 44; d.text((X0, 24), "ARCADE COCONUT CREEK", fill="#fff", font=FB); d.text((X0, 54), "1000 x 900 m  (a third of the current map)", fill="#cfd8c8", font=FS)
    yy = 96
    for k, (col, wdt, txt) in KIND.items():
        if k == "local": continue
        d.line([(X0, yy + 9), (X0 + 44, yy + 9)], fill=col, width=8); head, _, rest = txt.partition(": "); d.text((X0 + 54, yy), head, fill="#fff", font=F)
        words = rest.split(); line = ""; ly = yy + 20
        for w_ in words:
            if d.textlength(line + " " + w_, font=FS) > 400: d.text((X0 + 54, ly), line, fill="#cfd8c8", font=FS); ly += 17; line = w_
            else: line = (line + " " + w_).strip()
        d.text((X0 + 54, ly), line, fill="#cfd8c8", font=FS); yy = ly + 34
    d.ellipse([X0 + 10, yy, X0 + 32, yy + 22], fill="#ffe14a", outline="#111"); d.text((X0 + 17, yy + 2), "J", fill="#111", font=F); d.text((X0 + 54, yy + 2), "jump", fill="#fff", font=F); yy += 40
    L = sum(math.dist(a, b) for r in ROADS for a, b in zip(r["pts"], r["pts"][1:]))
    d.text((X0, yy), f"{L/1000:.1f} km of road.  A lap of The Loop: about", fill="#cfd8c8", font=FS); lp = [r for r in ROADS if r["name"] == "The Loop"][0]["pts"]; LL = sum(math.dist(a, b) for a, b in zip(lp, lp[1:] + lp[:1]))
    d.text((X0, yy + 18), f"{LL/30:.0f} s at speed ({LL/1000:.1f} km).  Across town: ~30 s.", fill="#cfd8c8", font=FS)
    c0 = P(40, 30); d.line([c0, (c0[0] + 100 * S, c0[1])], fill="#fff", width=4); d.text((c0[0], c0[1] - 20), "100 m", fill="#fff", font=FS)
    im.save("plan_v8.png"); json.dump(dict(size=[W, H], roads=ROADS, roundabouts=RBT, canal=CANAL, lake=LAKE, mountain=MTN, landmarks=LMK, jumps=JUMPS, peninsula=PEN), open("layout_v8.json", "w")); print(im.size, round(L), round(LL))
