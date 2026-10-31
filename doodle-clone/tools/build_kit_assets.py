#!/usr/bin/env python3
"""Trim + downscale the user's 'Halloween Open-Sky' kit into phone-sized WebP assets.

usage: python3 -I tools/build_kit_assets.py <kit_dir(halloween_open_sky_kit)> <out_dir>

The kit PNGs are huge (platforms 1983x793 with a ~1720 px visible slab); a phone only needs ~350-500 px of width.
Each output keeps only the visible alpha box (+ small pad) and records its size so the game can place it by visible width.
"""
import sys, os, json
from PIL import Image

kit, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
man = json.load(open(os.path.join(kit, 'manifest.json')))['assets']
# id -> target visible width in px
TARGET = {'platform_standard': 512, 'platform_moving': 512, 'platform_fragile': 512, 'platform_ghost': 512,
          'pumpkin_trampoline': 384, 'pickup_candy_corn': 160, 'cloud': 512, 'full_moon': 512, 'witch_silhouette': 640}
SKY = ['sky_twilight', 'sky_midnight', 'sky_aurora']
res = {}
for aid, a in man.items():
    src = Image.open(os.path.join(kit, a['file']))
    name = os.path.splitext(os.path.basename(a['file']))[0]
    if a['category'] == 'sky':
        im = src.convert('RGB'); k = 720 / im.width
        im = im.resize((720, round(im.height * k)), Image.LANCZOS)
        im.save(os.path.join(out, f'sky_{name}.webp'), 'WEBP', quality=85, method=6)
        res[aid] = {'file': f'sky_{name}.webp', 'size': list(im.size)}
        continue
    im = src.convert('RGBA')
    if aid == 'starfield':
        k = 720 / im.width; im = im.resize((720, round(im.height * k)), Image.LANCZOS)
        im.save(os.path.join(out, 'starfield.webp'), 'WEBP', quality=85, alpha_quality=90, method=6)
        res[aid] = {'file': 'starfield.webp', 'size': list(im.size)}
        continue
    bb = im.getchannel('A').point(lambda v: 255 if v > 6 else 0).getbbox()
    pad = 6
    bb = (max(0, bb[0] - pad), max(0, bb[1] - pad), min(im.width, bb[2] + pad), min(im.height, bb[3] + pad))
    c = im.crop(bb); tw = TARGET.get(aid) or TARGET.get(name) or 512
    k = tw / (bb[2] - bb[0] - 2 * pad)
    c = c.resize((max(1, round(c.width * k)), max(1, round(c.height * k))), Image.LANCZOS)
    c.save(os.path.join(out, f'{aid}.webp'), 'WEBP', quality=88, alpha_quality=95, method=6)
    res[aid] = {'file': f'{aid}.webp', 'size': list(c.size), 'visiblePx': round((bb[2] - bb[0] - 2 * pad) * k),
                'suggestedWidthKit': a.get('suggestedWidth')}
json.dump(res, open(os.path.join(out, 'assets.json'), 'w'), indent=1)
tot = sum(os.path.getsize(os.path.join(out, f)) for f in os.listdir(out))
print(len(res), 'assets,', tot // 1024, 'KB total')
for k, v in res.items(): print(k, v['size'])
