#!/usr/bin/env python3
"""Floating-backgrounds batch (art/batch5, from Dropbox 'Spooky Hop Art/Spooky_Hop_Floating_Backgrounds.zip') -> assets/b5/.
Sets with several objects in one image are split into separate sprites by finding the separate blobs of the alpha mask.
usage: python3 -I tools/build_batch5.py"""
import os
import numpy as np
from PIL import Image
S, O = 'art/batch5', 'assets/b5'
os.makedirs(O, exist_ok=True)
def save(im, name, w):
    im = im.resize((w, max(1, round(im.height * w / im.width))), Image.LANCZOS); im.save(f'{O}/{name}.webp', 'WEBP', quality=86, alpha_quality=90, method=6); return im.size
def trim(im): return im.crop(im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox())
def blobs(im, n, grow=6):
    """split into the n largest alpha blobs (on a 1/4-size mask, dilated so wisps stay with their object), left-to-right then top-to-bottom"""
    k = 4; m = np.asarray(im.getchannel('A').resize((im.width // k, im.height // k))) > 10
    for _ in range(grow):   # dilate
        m = m | np.roll(m, 1, 0) | np.roll(m, -1, 0) | np.roll(m, 1, 1) | np.roll(m, -1, 1)
    lab = np.zeros(m.shape, int); cur = 0; boxes = []
    for y0, x0 in zip(*np.nonzero(m)):
        if lab[y0, x0]: continue
        cur += 1; st = [(y0, x0)]; lab[y0, x0] = cur; ys, xs = [], []
        while st:
            y, x = st.pop(); ys.append(y); xs.append(x)
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                yy, xx = y + dy, x + dx
                if 0 <= yy < m.shape[0] and 0 <= xx < m.shape[1] and m[yy, xx] and not lab[yy, xx]: lab[yy, xx] = cur; st.append((yy, xx))
        boxes.append((len(ys), min(xs) * k, min(ys) * k, (max(xs) + 1) * k, (max(ys) + 1) * k))
    boxes = sorted(boxes, reverse=True)[:n]; boxes.sort(key=lambda b: (b[2] // 200, b[1]))
    return [trim(im.crop(b[1:])) for b in boxes]
for name, w in [('island_house', 512), ('island_graveyard', 512), ('island_tree', 448), ('balloon_pumpkin', 320), ('balloon_ghost', 320),
                ('moon_giant', 640), ('shooting_star', 512), ('cloud_far_band', 1024), ('cloud_near_wisps', 1024)]:
    print(name, save(trim(Image.open(f'{S}/{name}.png').convert('RGBA')), name, w))
for src, n, base, w, g in [('cloud_mid_set', 3, 'cloud_mid', 400, 0), ('island_far_set', 4, 'island_far', 220, 6), ('sky_lanterns', 5, 'lantern_sky', 160, 6)]:
    for i, p in enumerate(blobs(Image.open(f'{S}/{src}.png').convert('RGBA'), n, g)): print(f'{base}_{i}', save(p, f'{base}_{i}', w))
print(sum(os.path.getsize(f'{O}/{f}') for f in os.listdir(O)) // 1024, 'KB total')
