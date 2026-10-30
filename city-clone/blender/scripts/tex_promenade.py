"""Textures for the promenade set (lm_promenade.py). Run: python3 scripts/tex_promenade.py   (writes into blender/out/tex/)
sign_lp_*.png = signs (mapped once per face with M(..., fit=True)); lp_stone.png / lp_pavers.png = tiling surfaces."""
import sys, os, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import textures as T                                     # sets T.OUT (= out/tex unless an argument is given)
from PIL import Image, ImageDraw, ImageFont

SERIF = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

def _fit_font(d, text, path, size, maxw):
    f = ImageFont.truetype(path, size)
    while d.textlength(text, font=f) > maxw and f.size > 8: f = ImageFont.truetype(path, f.size - 2)
    return f

def two_line(name, top, bottom, w, h, bg, fg, fg2=None, border=None):
    """Big serif line + small sans line (the PROMENADE entry sign)."""
    im = Image.new("RGB", (w, h), bg); d = ImageDraw.Draw(im)
    if border: d.rectangle([6, 6, w - 7, h - 7], outline=border, width=max(3, h // 40))
    f1 = _fit_font(d, top, SERIF, int(h * .46), w * .88); f2 = _fit_font(d, bottom, SANS, int(h * .17), w * .62)
    b1 = d.textbbox((0, 0), top, font=f1); b2 = d.textbbox((0, 0), bottom, font=f2)
    h1, h2 = b1[3] - b1[1], b2[3] - b2[1]; gap = h * .07; y0 = (h - h1 - gap - h2) / 2
    d.text(((w - (b1[2] - b1[0])) / 2 - b1[0], y0 - b1[1]), top, font=f1, fill=fg)
    d.text(((w - (b2[2] - b2[0])) / 2 - b2[0], y0 + h1 + gap - b2[1]), bottom, font=f2, fill=fg2 or fg)
    im.save(os.path.join(T.OUT, f"sign_{name}.png"), optimize=True)

def poster(name, bg, fg, title):
    """Movie poster: gradient, a big shape, a title strip."""
    w, h = 128, 192; a = np.zeros((h, w, 3)); c0 = T.rgb(bg); c1 = c0 * .35
    for y in range(h): a[y] = c0 * (1 - y / h) + c1 * (y / h)
    im = Image.fromarray(a.astype(np.uint8)); d = ImageDraw.Draw(im)
    d.ellipse([22, 30, 106, 114], fill=fg); d.rectangle([0, 0, w - 1, h - 1], outline="#f4efe4", width=5)
    f = _fit_font(d, title, SANS, 26, w * .8); bb = d.textbbox((0, 0), title, font=f)
    d.text(((w - (bb[2] - bb[0])) / 2 - bb[0], 140 - bb[1]), title, font=f, fill="#f4efe4")
    im.save(os.path.join(T.OUT, f"sign_{name}.png"), optimize=True)

def stone(n=128):
    """Rough brown ashlar blocks for shop / pillar bases (tiles every `tile` metres, 4 courses per tile)."""
    base = T.rgb("#8f6e4c"); img = np.zeros((n, n, 3)); mort = T.rgb("#5e4a36"); ch = n // 4; img[:] = mort
    for r in range(4):
        off = (n // 6) if r % 2 else 0; bw = n // 3
        for c in range(-1, 4):
            x0 = c * bw + off + 2; y0 = r * ch + 2; tint = 1 + T.rng.uniform(-.16, .14)
            col = base * tint * np.array([1, 1 + T.rng.uniform(-.04, .04), 1 + T.rng.uniform(-.06, .02)])
            for xx in range(x0, x0 + bw - 3):
                img[y0:y0 + ch - 3, xx % n] = col
    img *= (1 + T.noise(n, 20, .08) + T.noise(n, 5, .05))[..., None]
    T.save("lp_stone", img)

def pavers(n=256):
    """Pink / terracotta brick pavers in a basket pattern (review ground and promenade lane)."""
    cols = [T.rgb(c) for c in ("#d9a98c", "#e3bca2", "#cf9a80", "#e8c8b0")]; img = np.zeros((n, n, 3)); s = n // 8
    img[:] = T.rgb("#b8907a")
    for i in range(8):
        for j in range(8):
            c = cols[int(T.rng.integers(0, 4))] * (1 + T.rng.uniform(-.05, .05))
            img[j * s + 1:(j + 1) * s - 1, i * s + 1:(i + 1) * s - 1] = c
            if (i + j) % 2: img[j * s + s // 2, i * s:(i + 1) * s] *= .82
            else: img[j * s:(j + 1) * s, i * s + s // 2] *= .82
    img *= (1 + T.noise(n, 16, .05))[..., None]
    T.save("lp_pavers", img)

if __name__ == "__main__":
    two_line("lp_promenade", "PROMENADE", "AT COCONUT CREEK", 1024, 256, "#efe4c8", "#1d5a58", "#2a3a3a", border="#c9b48a")
    T.label("lp_cinema", "CINEMA", 512, 160, "#f3ead6", "#b52a26", border="#d9c9a4", font=SERIF)
    for k, (txt, bg, fg) in enumerate((("BOUTIQUE", "#1f5f5c", "#f3ead6"), ("GELATO", "#f3ead6", "#b8402a"), ("BOOKS", "#6a2430", "#f3ead6"),
                                       ("CAFE", "#f3ead6", "#1f5f5c"), ("SHOES", "#2b2f36", "#f0c060"), ("GIFTS", "#f3ead6", "#6a2430"))):
        T.label(f"lp_shop{k}", txt, 320, 80, bg, fg, border=fg, font=SERIF)
    poster("lp_poster0", "#2a4a8a", "#f0b030", "STARFALL"); poster("lp_poster1", "#8a2a2a", "#f4e0a0", "HEAT WAVE")
    stone(); pavers()
    print(sorted(f for f in os.listdir(T.OUT) if "lp_" in f))
