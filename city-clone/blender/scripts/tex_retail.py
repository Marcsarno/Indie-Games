"""Sign + stone textures for lm_retail.py (Publix supermarket, police station). Run with system python: python3 scripts/tex_retail.py
Writes into blender/out/tex/: sign_lr_palmmarket.png, sign_lr_police.png, lr_stone.png."""
import sys, os; sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
from PIL import Image, ImageDraw
import textures as T

WALL_TAN = "#e4d0a8"          # must match lm_retail.SM_WALL so the sign panel melts into the stucco
POLICE_BLUE = "#2e5b97"       # must match lm_retail.PD_BLUE

def stone(n=128):
    """Stacked ashlar blocks in warm greys (seamless): stone-look pilaster bases."""
    rng = np.random.default_rng(11); img = np.zeros((n, n, 3)); mort = T.rgb("#6f665a")
    img[:] = mort; rows = 6; rh = n // rows
    for r in range(rows):
        x = int(rng.integers(0, 20)) if r % 2 else 0; widths = []
        while sum(widths) < n: widths.append(int(rng.integers(18, 40)))
        widths[-1] -= sum(widths) - n
        for wdt in widths:
            base = T.rgb(["#a49883", "#958a76", "#b3a68e", "#8c8372", "#a99a80"][int(rng.integers(0, 5))]) * rng.uniform(.92, 1.06)
            for xx in range(x + 2, x + wdt - 1):
                img[r * rh + 2:(r + 1) * rh - 1, xx % n] = base
            x += wdt
    img *= (1 + T.noise(n, 24, .06) + T.noise(n, 6, .04))[..., None]
    T.save("lr_stone", img)

def letters(name, text, w, h, bg, fg, shadow, fill=.66, font="/usr/share/fonts/truetype/crosextra/Carlito-Bold.ttf"):
    """Big channel-letter sign: text drawn tall (fill = cap height / h) and squeezed to fit the width, with a dark offset 'depth' copy behind it."""
    from PIL import ImageFont
    f = ImageFont.truetype(font, 400); probe = ImageDraw.Draw(Image.new("RGB", (8, 8))); bb = probe.textbbox((0, 0), text, font=f)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]; pad = 30
    layer = Image.new("L", (tw + 2 * pad, th + 2 * pad), 0); ImageDraw.Draw(layer).text((pad - bb[0], pad - bb[1]), text, font=f, fill=255)
    lh = int(h * fill); lw = min(int(w * .94), int(layer.width * lh / layer.height)); layer = layer.resize((lw, int(lh * layer.height / th)), Image.LANCZOS)
    im = Image.new("RGB", (w, h), bg); ox = (w - layer.width) // 2; oy = (h - layer.height) // 2; d = max(2, h // 45)
    im.paste(Image.new("RGB", layer.size, shadow), (ox + d, oy + d), layer); im.paste(Image.new("RGB", layer.size, fg), (ox, oy), layer)
    im.save(os.path.join(T.OUT, f"sign_{name}.png"), optimize=True)

if __name__ == "__main__":
    letters("lr_palmmarket", "Publix", 1024, 230, WALL_TAN, "#3d8a46", "#1f4a26", fill=.74)
    letters("lr_police", "POLICE", 520, 140, POLICE_BLUE, "#ffffff", "#17335c", fill=.56, font="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")
    stone()
    print("wrote", [f for f in sorted(os.listdir(T.OUT)) if "lr_" in f])
