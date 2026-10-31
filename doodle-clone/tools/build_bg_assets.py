#!/usr/bin/env python3
"""Downsize the first-batch painted backgrounds (art/bg/*.png) to phone-sized WebP in assets/bg/. usage: python3 -I tools/build_bg_assets.py"""
import os
from PIL import Image
src, out = 'art/bg', 'assets/bg'
os.makedirs(out, exist_ok=True)
for name, w in [('sky-dusk', 720), ('mid-town-start', 720), ('fg-houses-start', 720)]:
    im = Image.open(f'{src}/{name}.png'); im = im.convert('RGBA' if im.mode == 'RGBA' else 'RGB')
    im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    kw = {'alpha_quality': 92} if im.mode == 'RGBA' else {}
    im.save(f'{out}/{name}.webp', 'WEBP', quality=86, method=6, **kw)
    print(name, im.size, os.path.getsize(f'{out}/{name}.webp') // 1024, 'KB')
