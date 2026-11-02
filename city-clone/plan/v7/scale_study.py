"""Scale study (round 37): how big should the gap between the main roads be?
Draws one superblock (Copans -> Sample, 441 -> Lyons) at today's plan size and at 2.5x, at the SAME pixel scale, with the phone screen's footprint
(camera: 40 deg FOV, 44 m back, 45 deg tilt, portrait -> about 18 m wide x 52 m deep on the ground) and drive times at 100 km/h (28 m/s).
The 2.5x block shows an example interior built from straights and true circular arcs (no wiggles): a boulevard entry with a roundabout,
a fast sweeper round a lake, a grid pocket with an alley, cul-de-sacs, and a commercial corner. Run: python3 scale_study.py -> scale_study.png"""
from PIL import Image, ImageDraw, ImageFont
import math, os

S = 1.1; PAD = 40
def font(sz, b=True): return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if b else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", sz)
W, H = 1420, 760
im = Image.new("RGB", (W, H), "#2b3a26"); d = ImageDraw.Draw(im)
OUT = lambda t, xy, sz=14, **k: d.text(xy, t, fill="white", font=font(sz), stroke_width=3, stroke_fill="#1b1b1b", **k)
V = 28.0                                                            # m/s

def arc(cx, cy, r, a0, a1, n=40): return [(cx + r * math.cos(math.radians(a0 + (a1 - a0) * i / n)), cy + r * math.sin(math.radians(a0 + (a1 - a0) * i / n))) for i in range(n + 1)]
def panel(ox, oy, bw, bh, title, k, interior):
    P = lambda x, y: (ox + x * S, oy + (bh - y) * S)                # local metres, y up
    d.rectangle([P(0, bh), P(bw, 0)], fill="#5d9a3a")
    road = lambda pts, w, col="#3a3c40", line=None: (d.line([P(*p) for p in pts], fill=col, width=max(2, int(w * S)), joint="curve"), line and d.line([P(*p) for p in pts], fill=line, width=1, joint="curve"))
    interior(P, road)
    for (pts, w) in (([(-20, 0), (bw + 20, 0)], 18), ([(-20, bh), (bw + 20, bh)], 24), ([(0, -20), (0, bh + 20)], 24), ([(bw, -20), (bw, bh + 20)], 22)):
        road(pts, w, line="#e8c34a")
    OUT("Copans Rd", P(8, 12), 11); OUT("Sample Rd", P(8, bh + 16), 11)
    # phone screen footprint at the middle of the block
    sx, sy = bw * .5, bh * .5; d.rectangle([P(sx - 9, sy + 26), P(sx + 9, sy - 26)], outline="#ff4fd8", width=3)
    OUT(title, (ox, oy - 34), 16)
    OUT(f"Copans -> Sample: {bh:.0f} m = {bh / V:.0f} s", (ox, oy + bh * S + 14), 12); OUT(f"441 -> Lyons: {bw:.0f} m = {bw / V:.0f} s  (at 100 km/h)", (ox, oy + bh * S + 32), 12)

def empty(P, road): pass
def designed(P, road):
    bw, bh = 825, 300
    # lake + fast sweeper (true arcs) from a roundabout to Sample Rd
    lx, ly = 520, 150; d.ellipse([P(lx - 120, ly + 70), P(lx + 120, ly - 70)], fill="#2d78b8")
    road([(240, 0), (240, 120)], 14, line="#9fd36b")                              # boulevard entry off Copans (median line)
    rb = P(240, 140); R = 20 * S; d.ellipse([rb[0] - R, rb[1] - R, rb[0] + R, rb[1] + R], outline="#55585e", width=int(9 * S)); d.ellipse([rb[0] - R + 5, rb[1] - R + 5, rb[0] + R - 5, rb[1] + R - 5], fill="#7cc05a")
    sweep = [(260, 140), (360, 140)] + arc(360, 250, 110, -90, 0)[1:]              # straight, then a 110 m radius bend up to Sample
    road(sweep, 10, "#55585e"); road([(470, 250), (470, bh)], 10, "#55585e")
    south = [(240, 160), (240, 210)] + arc(300, 210, 60, 180, 90)[1:] + [(300, 270), (300, bh)]      # second exit north via a tight 60 m bend
    road([(240, 160), (240, 210)] + [(240 + 60 - 60 * math.cos(math.radians(a)), 210 + 60 * math.sin(math.radians(a))) for a in range(0, 91, 5)] + [(300, bh)], 9, "#55585e")
    ring = arc(lx, ly, 150, 200, 340); road(ring, 9, "#55585e")                     # lake drive along the south shore
    road([(lx + 150 * math.cos(math.radians(340)), ly + 150 * math.sin(math.radians(340))), (bw, 100)], 9, "#55585e")   # out to Lyons
    for a in (230, 270, 310):                                                     # cul-de-sacs from the lake drive toward the water
        x0, y0 = lx + 150 * math.cos(math.radians(a)), ly + 150 * math.sin(math.radians(a)); x1, y1 = lx + 105 * math.cos(math.radians(a)), ly + 105 * math.sin(math.radians(a))
        road([(x0, y0), (x1, y1)], 8, "#55585e"); c = P(x1, y1); d.ellipse([c[0] - 6, c[1] - 6, c[0] + 6, c[1] + 6], fill="#55585e")
    # grid pocket (west): straight streets, T-junctions, an alley behind the rows
    for x in (60, 120, 180): road([(x, 30), (x, 270)], 8, "#55585e")
    road([(0, 150), (220, 150)], 8, "#55585e"); road([(90, 40), (90, 260)], 4, "#8a8a8a")
    for x in (40, 75, 105, 140, 165, 200):
        for y in (50, 85, 115, 185, 215, 250): d.rectangle([P(x - 6, y + 6), P(x + 6, y - 6)], fill="#c7a98a")
    # commercial corner at Sample & Lyons: lot + drive-thru
    d.rectangle([P(660, 290), P(815, 215)], fill="#7d8086"); d.rectangle([P(700, 285), P(780, 262)], fill="#c56a4a")
    for x in range(668, 812, 8): d.line([P(x, 220), P(x, 255)], fill="#b9bcc2")
    road([(800, 290), (800, 230), (690, 230)], 5, "#55585e")
    OUT("boulevard + roundabout", P(150, 100), 10); OUT("fast sweeper", P(380, 270), 10); OUT("lake drive + cul-de-sacs", P(430, 40), 10)
    OUT("grid pocket + alley", P(30, 290), 10); OUT("strip mall + drive-thru", P(660, 205), 10)

panel(PAD, 110, 330, 120, "TODAY (1x)", 1, empty)
panel(PAD + 330 * S + 50, 110, 825, 300, "PROPOSED (2.5x)  -  example of what fits inside, no wiggles", 2.5, designed)
OUT("Pink box = what one phone screen shows while driving (about 18 x 52 m).", (PAD, 30), 15)
OUT("Same scale in both: one block today is ~2 phone screens tall and 4 s of driving; at 2.5x it is ~6 screens and ~11 s, with room for real driving.", (PAD, 56), 13)
y0 = 110 + 300 * S + 70
rows = [("", "gap between main roads", "Publix -> Dave (straight)", "map size", "on the phone"),
        ("1x (today)", "110-200 m  (4-7 s)", "~700 m  (~25 s)", "~0.9 x 1.0 km", "easy"),
        ("2x", "220-400 m  (8-14 s)", "~1.4 km  (~50 s)", "~1.6 x 2.0 km", "needs chunk loading"),
        ("2.5x  (my pick)", "275-500 m  (10-18 s)", "~1.75 km  (~65 s)", "~2.0 x 2.5 km", "needs chunk loading"),
        ("3x", "330-600 m  (12-21 s)", "~2.1 km  (~75 s)", "~2.4 x 3.0 km", "heavy; risky on phones")]
cols = [PAD, PAD + 170, PAD + 390, PAD + 620, PAD + 800]
for i, r in enumerate(rows):
    for j, t in enumerate(r): d.text((cols[j], y0 + i * 26), t, fill="#fff2a8" if i == 0 or "pick" in r[0] else "#f0ead6", font=font(13, i == 0 or j == 0))
im.save(os.path.join(os.path.dirname(os.path.abspath(__file__)), "scale_study.png")); print("ok")
