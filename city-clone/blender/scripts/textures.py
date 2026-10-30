"""Procedural textures for the city (numpy + PIL, no external assets). Run: python3 scripts/textures.py [outdir]
Everything is seamless-tiling except the signs. Colours are baked in (one PNG per colour) so glTF stays simple."""
import sys, os, math, numpy as np
from PIL import Image, ImageDraw, ImageFont

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "..", "out", "tex")
os.makedirs(OUT, exist_ok=True)
FONT = "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"
rng = np.random.default_rng(7)

def rgb(h): h = h.lstrip("#"); return np.array([int(h[i:i+2], 16) for i in (0, 2, 4)], float)

def noise(n, cells, amp=1.0):
    """Seamless value noise n x n, `cells` lattice cells."""
    a = rng.random((cells, cells)); big = np.tile(a, (3, 3))
    im = Image.fromarray((big * 255).astype(np.uint8)).resize((n * 3, n * 3), Image.BICUBIC)
    v = np.asarray(im, float)[n:2 * n, n:2 * n] / 255.0
    return (v - .5) * 2 * amp

def save(name, arr): Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).save(os.path.join(OUT, name + ".png"), optimize=True)

def brick(hexc, n=256, bw=32, bh=16, mortar=2):
    base = rgb(hexc); img = np.zeros((n, n, 3)); mort = base * .45 + rgb("#b3aa9a") * .55
    img[:] = mort
    for r in range(n // bh):
        off = (bw // 2) if r % 2 else 0
        for c in range(-1, n // bw + 1):
            x0 = c * bw + off + mortar // 2; y0 = r * bh + mortar // 2
            tint = 1 + rng.uniform(-.14, .10)
            for xx in range(x0, x0 + bw - mortar):
                for yy in range(y0, y0 + bh - mortar):
                    img[yy % n, xx % n] = base * tint
    img *= (1 + noise(n, 24, .06) + noise(n, 6, .05))[..., None]
    save("brick_" + hexc.lstrip("#"), img)

def asphalt(hexc="#4b4d50", n=256):
    base = rgb(hexc); v = 1 + noise(n, 48, .07) + noise(n, 8, .05)
    img = base * v[..., None]
    sp = rng.random((n, n)); img[sp > .985] *= 1.45; img[sp < .01] *= .65       # speckle
    save("asphalt", img)

def sidewalk(hexc="#9d9a92", n=256, slab=128):
    base = rgb(hexc); img = base * (1 + noise(n, 32, .05) + noise(n, 4, .06))[..., None]
    for k in range(0, n, slab):
        img[k:k + 2, :] *= .72; img[:, k:k + 2] *= .72
    for k in range(0, n, slab):
        for j in range(0, n, slab): img[k + rng.integers(8, slab - 8):, j:j + slab] *= rng.uniform(.97, 1.03)   # per-slab tone
    save("sidewalk", img)

def roof(hexc="#4b4a4c", n=128):
    save("roof", rgb(hexc) * (1 + noise(n, 24, .07) + noise(n, 5, .05))[..., None])

def sign(name, text, w, h, bg, fg, vertical=True, border="#e8b923"):
    im = Image.new("RGB", (w, h), bg); d = ImageDraw.Draw(im); m = max(4, min(w, h) // 14)
    d.rectangle([m // 2, m // 2, w - m // 2 - 1, h - m // 2 - 1], outline=border, width=max(2, m // 2))
    chars = list(text)
    if vertical:
        cell = (h - 2 * m) / len(chars); size = int(min(cell * .85, (w - 2 * m) * .9)); f = ImageFont.truetype(FONT, size)
        for i, ch in enumerate(chars):
            bb = d.textbbox((0, 0), ch, font=f); cw, chh = bb[2] - bb[0], bb[3] - bb[1]
            d.text((w / 2 - cw / 2 - bb[0], m + cell * i + (cell - chh) / 2 - bb[1]), ch, font=f, fill=fg)
    else:
        cell = (w - 2 * m) / len(chars); size = int(min(cell * .85, (h - 2 * m) * .9)); f = ImageFont.truetype(FONT, size)
        for i, ch in enumerate(chars):
            bb = d.textbbox((0, 0), ch, font=f); cw, chh = bb[2] - bb[0], bb[3] - bb[1]
            d.text((m + cell * i + (cell - cw) / 2 - bb[0], h / 2 - chh / 2 - bb[1]), ch, font=f, fill=fg)
    im.save(os.path.join(OUT, f"sign_{name}.png"), optimize=True)



# ---- Florida set ------------------------------------------------------------------------------------------------------------
def grass(n=256):
    base = rgb("#5f9a3c"); v = 1 + noise(n, 40, .10) + noise(n, 10, .08) + noise(n, 3, .05)
    img = base * v[..., None]; sp = rng.random((n, n)); img[sp > .97] *= 1.18; img[sp < .02] *= .82
    save("grass", img)

def stucco(name, hexc, n=128):
    save("stucco_" + name, rgb(hexc) * (1 + noise(n, 36, .035) + noise(n, 6, .03))[..., None])

def tiles(hexc="#a9573a", n=256, rows=16, name="tiles"):
    """Terracotta barrel tiles: vertical ribs + staggered course shadows."""
    base = rgb(hexc); img = np.zeros((n, n, 3)); rw = n // 16
    for x in range(n):
        u = (x % rw) / rw; shade = .78 + .30 * math.sin(math.pi * u)
        img[:, x] = base * shade
    ch = n // rows
    for r in range(rows):
        img[r * ch:r * ch + 2, :] *= .70; img[r * ch + 2:r * ch + 5, :] *= .90
    img *= (1 + noise(n, 30, .08) + noise(n, 5, .06))[..., None]
    save(name, img)

def water(n=256):
    base = rgb("#2d78b8"); v = 1 + noise(n, 24, .10) + noise(n, 6, .08)
    img = base * v[..., None]; hi = noise(n, 18, 1.0) > .55; img[hi] = img[hi] * .8 + rgb("#bfe4ff") * .2
    save("water", img)

def wood(n=128):
    base = rgb("#8a5a34"); img = np.zeros((n, n, 3))
    for y in range(n): img[y, :] = base * (.85 + .25 * ((y // 16) % 2)) * (1 + .05 * math.sin(y * .9))
    img *= (1 + noise(n, 20, .06))[..., None]; save("wood", img)

def label(name, text, w, h, bg, fg, size=None, border=None, font="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"):
    im = Image.new("RGB", (w, h), bg); d = ImageDraw.Draw(im)
    if border: d.rectangle([3, 3, w - 4, h - 4], outline=border, width=max(2, h // 22))
    f = ImageFont.truetype(font, size or int(h * .5))
    while d.textlength(text, font=f) > w * .9 and f.size > 8: f = ImageFont.truetype(font, f.size - 2)
    bb = d.textbbox((0, 0), text, font=f); d.text(((w - (bb[2] - bb[0])) / 2 - bb[0], (h - (bb[3] - bb[1])) / 2 - bb[1]), text, font=f, fill=fg)
    im.save(os.path.join(OUT, f"sign_{name}.png"), optimize=True)

def florida():
    grass(); water(); wood(); tiles()
    for h_ in ("#bcb6aa", "#7a5a44", "#5d6670", "#b8463a"): tiles(h_, name="tiles_" + h_[1:])          # roof colours for the district house styles
    for k, c in (("cream", "#e9dcb8"), ("peach", "#e8c4a0"), ("sand", "#d8c490"), ("white", "#eee8dc"), ("butter", "#ecd890"), ("mint", "#c4e2cc"), ("sky", "#c2d8e8"), ("coral", "#efb9a4"), ("lilac", "#d8c8e6"), ("stone", "#cfc8bc")): stucco(k, c)
    label("palmmarket", "Publix", 512, 128, "#f3ecd8", "#1f6b3a", border="#1f6b3a"); label("shops", "SHOPS", 384, 128, "#f3ecd8", "#7a3a2a", border="#7a3a2a")
    label("restaurant_fl", "RESTAURANT", 384, 96, "#8c1c1c", "#ffffff"); label("nails", "NAILS", 256, 96, "#f0e6d0", "#8a2f6a", border="#8a2f6a")
    label("coffee", "COFFEE", 256, 96, "#21453a", "#f3ecd8"); label("pizza", "PIZZA", 256, 96, "#b8321f", "#ffe9a0"); label("cleaners", "CLEANERS", 320, 96, "#a63c2a", "#ffffff")
    label("pkwy", "Coconut Creek Pkwy", 512, 96, "#14683f", "#ffffff", border="#ffffff"); label("wiles", "Wiles Rd", 320, 96, "#14683f", "#ffffff", border="#ffffff"); label("lyons", "Lyons Rd", 320, 96, "#14683f", "#ffffff", border="#ffffff"); label("northridge", "Sample Rd", 320, 96, "#14683f", "#ffffff", border="#ffffff")
    label("taxi_roof", "TAXI", 256, 96, "#f2c21c", "#18181a"); label("police_door", "POLICE", 320, 96, "#ffffff", "#18181a")
    label("cityhall", "COCONUT CREEK  CITY HALL", 640, 96, "#e6dcc4", "#3a3a40")

if __name__ == "__main__":
    for c in ("#8e3b2e", "#a8987a", "#6e5a4a", "#a2533d", "#7b5a4a", "#5a5f66"): brick(c)
    asphalt(); sidewalk(); roof()
    sign("seafood", "海鮮酒家", 128, 512, "#b81414", "#ffd84a")
    sign("gold", "金行", 128, 256, "#c01818", "#ffd84a")
    sign("dumpling", "餃子", 128, 256, "#f0c030", "#b01010", border="#b01010")
    sign("liquor", "酒家", 128, 256, "#1c3a8a", "#ffe9a0", border="#ffe9a0")
    sign("chinatown", "華埠", 512, 160, "#5a1010", "#f0c850", vertical=False, border="#f0c850")
    sign("restaurant", "金龍酒樓", 512, 128, "#a01010", "#ffd84a", vertical=False)
    florida()
    print(sorted(os.listdir(OUT)))
