"""Sign textures for the civic landmarks (lm_civic.py). System python + PIL: python3 scripts/tex_civic.py  -> out/tex/sign_lc_*.png"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from textures import label, OUT
from PIL import Image, ImageDraw, ImageFont

BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
STUCCO = "#ecdfbd"            # close to the lit stucco_cream so the panel melts into the wall

def _fit(d, text, font, w, size):
    f = ImageFont.truetype(font, size)
    while d.textlength(text, font=f) > w and f.size > 8: f = ImageFont.truetype(font, f.size - 2)
    return f

def casino_sign(name="lc_casino", w=1024, h=384, bg=STUCCO):
    """Logo (four coloured discs) + SEMINOLE / CASINO / COCONUT CREEK lettering, like the concept's sign."""
    im = Image.new("RGB", (w, h), bg); d = ImageDraw.Draw(im)
    s = int(h * .30); x0, y0 = int(w * .05), int(h * .2); g = int(s * .12)
    for k, c in enumerate(("#c8362a", "#e8b923", "#b8321f", "#2a2a2e")):
        cx, cy = x0 + (k % 2) * (s + g), y0 + (k // 2) * (s + g)
        d.rectangle([cx - 3, cy - 3, cx + s + 3, cy + s + 3], fill="#f6f0e2", outline="#8c2a22", width=3)
        d.ellipse([cx + 5, cy + 5, cx + s - 5, cy + s - 5], fill=c)
    tx = x0 + 2 * s + g + int(w * .04); tw = w - tx - int(w * .04)
    f1 = _fit(d, "SEMINOLE", BOLD, tw, int(h * .22)); f2 = _fit(d, "CASINO", BOLD, tw, int(h * .34)); f3 = _fit(d, "COCONUT CREEK", BOLD, tw, int(h * .14))
    bb = d.textbbox((0, 0), "SEMINOLE", font=f1); d.text((tx - bb[0], int(h * .10) - bb[1]), "SEMINOLE", font=f1, fill="#4a2a22")
    bb2 = d.textbbox((0, 0), "CASINO", font=f2); d.text((tx - bb2[0], int(h * .38) - bb2[1]), "CASINO", font=f2, fill="#a4231c")
    bb3 = d.textbbox((0, 0), "COCONUT CREEK", font=f3); d.text((tx - bb3[0], int(h * .76) - bb3[1]), "COCONUT CREEK", font=f3, fill="#4a2a22")
    im.save(os.path.join(OUT, f"sign_{name}.png"), optimize=True)

if __name__ == "__main__":
    label("lc_cityhall", "CITY HALL", 640, 128, STUCCO, "#1f3f73", size=86)
    casino_sign()
    print(sorted(f for f in os.listdir(OUT) if f.startswith("sign_lc_")))
