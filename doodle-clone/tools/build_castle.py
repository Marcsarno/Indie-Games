#!/usr/bin/env python3
"""Castle opening layers (art/batch6, Dropbox 'Spooky Hop Art/Spooky_Hop_Castle_Layers.zip') -> assets/b4/.
The front arrived as two halves; they are stacked (top over bottom) into one tall image. usage: python3 -I tools/build_castle.py"""
import os
from PIL import Image
S, O = 'art/batch6', 'assets/b4'
os.makedirs(O, exist_ok=True)
def save(im, name, w):
    im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS); im.save(f'{O}/{name}.webp', 'WEBP', quality=86, alpha_quality=90, method=6)
    print(name, im.size, os.path.getsize(f'{O}/{name}.webp') // 1024, 'KB')
t = Image.open(f'{S}/castle_front_top.png').convert('RGBA'); b = Image.open(f'{S}/castle_front_bottom.png').convert('RGBA')
j = Image.new('RGBA', (t.width, t.height + b.height)); j.paste(t, (0, 0)); j.alpha_composite(b, (0, t.height))
bb = j.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox(); j = j.crop((0, bb[1], j.width, bb[3]))   # keep full width, trim empty top/bottom
save(j, 'castle_front', 720)
m = Image.open(f'{S}/castle_mid.png').convert('RGBA'); save(m.crop(m.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()), 'castle_mid', 640)
f = Image.open(f'{S}/castle_far.png').convert('RGBA'); save(f.crop(f.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()), 'castle_far', 320)
