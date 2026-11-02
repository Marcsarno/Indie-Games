"""Fill study (round 38): the Sample Rd dealer block (575 x 210 m) as built in M1 (one giant lot) vs filled the way M2 will build it, same scale.
Real sizes: a dealership showroom ~45 x 28 m with a ~90 x 60 m display lot; a Publix ~85 x 55 m; a Walmart Supercenter ~165 x 115 m. Run: python3 fill_study.py"""
from PIL import Image, ImageDraw, ImageFont
import random, os
S = 2.0; W, H = 1260, 760; R = random.Random(4)
def font(sz, b=True): return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if b else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", sz)
im = Image.new("RGB", (W, H), "#20261c"); d = ImageDraw.Draw(im)
OUT = lambda t, xy, sz=14, **k: d.text(xy, t, fill="white", font=font(sz), stroke_width=3, stroke_fill="#1b1b1b", **k)
def panel(ox, oy, title, filled):
    P = lambda x, y: (ox + x * S * .5, oy + (210 - y) * S * .5 * 2 / 2)
    k = .5 * S
    Q = lambda x, y: (ox + x * k, oy + (210 - y) * k)
    d.rectangle([Q(0, 210), Q(575, 0)], fill="#5d9a3a")
    d.rectangle([Q(-15, 0), Q(590, -14)], fill="#3a3c40"); OUT("Sample Rd", Q(4, -2), 11)
    if not filled:
        d.rectangle([Q(0, 210), Q(575, 0)], fill="#7d8086")
        for x in range(10, 570, 3): d.line([Q(x, 12), Q(x, 60)], fill="#b9bcc2") if x % 9 == 0 else None
        for i, nm in enumerate(["FORD", "TOYOTA", "HONDA", "KIA"]): d.rectangle([Q(10 + i * 140, 205), Q(140 + i * 140, 152)], fill="#9aa3ad"); d.text(Q(75 + i * 140, 180), nm, fill="white", font=font(9), anchor="mm")
        for _ in range(120): x, y = R.uniform(10, 565), R.uniform(10, 140); d.rectangle([Q(x, y + 2), Q(x + 4.5, y - 2)], fill=R.choice(["#d33", "#eee", "#36c", "#222"]))
    else:
        names = ["FORD", "TOYOTA", "HONDA", "KIA", "CHEVROLET", "NISSAN"]
        d.rectangle([Q(0, 210), Q(575, 172)], fill="#7d8086"); OUT("service road + body shops", Q(8, 205), 9)
        for i, nm in enumerate(names):
            x0 = 6 + i * 95; d.rectangle([Q(x0, 160), Q(x0 + 86, 14)], fill="#6f7276")
            d.rectangle([Q(x0 + 18, 160), Q(x0 + 68, 128)], fill="#c9ccd1", outline="#2b2b2b"); d.rectangle([Q(x0 + 18, 132), Q(x0 + 68, 128)], fill="#4f8fc0")
            d.text(Q(x0 + 43, 146), nm, fill="#1b1b1b", font=font(8), anchor="mm")
            for row in range(6):
                y = 24 + row * 15
                for c in range(14): xx = x0 + 6 + c * 5.6; d.rectangle([Q(xx, y + 2), Q(xx + 4, y - 2)], fill=R.choice(["#d33", "#eee", "#36c", "#222", "#c9a227", "#7a9cc4"]))
            d.rectangle([Q(x0 + 80, 8), Q(x0 + 84, 4)], fill="#ffd23f"); d.line([Q(x0 + 82, 8), Q(x0 + 82, 18)], fill="#333", width=2)
            if i < 5:
                d.rectangle([Q(x0 + 86, 160), Q(x0 + 95, 4)], fill="#4f8a35")
                for y in range(12, 160, 14): c = Q(x0 + 90.5, y); d.ellipse([c[0] - 3, c[1] - 3, c[0] + 3, c[1] + 3], fill="#2f6a2a")
        for x in range(4, 575, 12): c = Q(x, 3); d.ellipse([c[0] - 3, c[1] - 3, c[0] + 3, c[1] + 3], fill="#2f6a2a")
    OUT(title, (ox, oy - 26), 15)
panel(30, 80, "NOW (M1): one 575 x 210 m lot", False)
panel(30 + 575 * .5 * S + 50, 80, "FILLED (M2): six real-size dealerships", True)
y0 = 80 + 210 * .5 * S + 40
lines = ["The road spacing stays; what changes is what sits between the roads:",
         "1  real-size buildings: lots shrink to ~1.5x the building (a dealer lot 90 x 60 m, not 575 x 210 m)",
         "2  more buildings per block: dealers, banks, gas, drive-thrus, strip malls fill the frontage",
         "3  Florida landscaping: hedges, palm rows, retention ponds, neighbourhood walls along the main roads",
         "   (Coconut Creek's arterials really are walled and hedged: the main road becomes a corridor, the gaps become your cut-throughs)",
         "4  ~4x more houses, with backyard fences (breakable), drawn with GPU instancing so the phone stays fast",
         "If it still feels too big after that, the plan can shrink to 2x in about an hour (everything is generated from the plan)."]
for i, t in enumerate(lines): d.text((30, y0 + i * 26), t, fill="#fff2a8" if i == 0 else "#f0ead6", font=font(14 if i == 0 else 13, i == 0))
im = im.crop((0, 0, W, int(y0 + len(lines) * 26 + 20))); im.save(os.path.join(os.path.dirname(os.path.abspath(__file__)), "fill_study.png")); print("ok")
