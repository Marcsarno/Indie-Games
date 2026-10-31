#!/usr/bin/env python3
"""Slice + downsize art batch 3 (art/batch3/*.png, from the user's copy-paste prompt list) into assets/b3/.
usage: python3 -I tools/build_batch3.py
Sprite sheets are cut into equal cells and every frame is cropped to the UNION box of all frames, so frames stay aligned;
assets/b3/sheets.json records each sheet's cell size and the frame-0 visible box (to line frames up with the game objects)."""
import os, json
import numpy as np
from PIL import Image
S, O = 'art/batch3', 'assets/b3'
os.makedirs(O, exist_ok=True)
meta = {}
def bbox(im, t=8): return im.getchannel('A').point(lambda v: 255 if v > t else 0).getbbox()
def save(im, name, w):
    im = im.resize((w, max(1, round(im.height * w / im.width))), Image.LANCZOS)
    im.save(f'{O}/{name}.webp', 'WEBP', quality=88, alpha_quality=92, method=6); return im.size
def single(src, name, w): im = Image.open(f'{S}/{src}.png').convert('RGBA'); print(name, save(im.crop(bbox(im)), name, w))
def black_to_alpha(path):
    im = np.asarray(Image.open(path).convert('RGB'), dtype=np.float32)
    a = np.clip((im.max(2) - 10) / 245, 0, 1); rgb = np.clip(im / np.maximum(a[..., None], 1e-3), 0, 255)
    return Image.fromarray(np.dstack([rgb, a * 255]).astype(np.uint8), 'RGBA')
def sheet(src, name, n, w, black=False):
    im = black_to_alpha(f'{S}/{src}.png') if black else Image.open(f'{S}/{src}.png').convert('RGBA'); cw = im.width / n
    cells = [im.crop((round(i * cw), 0, round((i + 1) * cw), im.height)) for i in range(n)]
    boxes = [bbox(c) for c in cells]
    u = (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))
    b0 = boxes[0]; k = w / (u[2] - u[0])
    for i, c in enumerate(cells): sz = save(c.crop(u), f'{name}_{i}', w)
    meta[name] = {'frames': n, 'cell': list(sz), 'vis0': [round((b0[0] - u[0]) * k), round((b0[1] - u[1]) * k), round((b0[2] - u[0]) * k), round((b0[3] - u[1]) * k)]}
    print(name, n, 'frames', sz, meta[name]['vis0'])
def halves(src, names, w, axis='x'):
    im = Image.open(f'{S}/{src}.png').convert('RGBA'); a = np.asarray(im.getchannel('A')) > 8
    if axis == 'x':
        cols = a.any(0); mid = im.width // 2; gap = [x for x in range(im.width // 4, 3 * im.width // 4) if not cols[x]]
        cut = gap[len(gap) // 2] if gap else mid
        parts = [im.crop((0, 0, cut, im.height)), im.crop((cut, 0, im.width, im.height))]
    for p, n in zip(parts, names): print(n, save(p.crop(bbox(p)), n, w))
# singles
for src, name, w in [('candy_gold', 'candy_gold', 192), ('rocket_pickup', 'rocket_pickup', 256), ('rocket_worn', 'rocket_worn', 256),
                     ('rescue_bubble', 'rescue_bubble', 384), ('logo', 'logo', 640), ('fog_sheet', 'fog_sheet', 768), ('roofs_tile', 'roofs_tile', 720)]:
    single(src, name, w)
# walls: crop only horizontally (keep full height so the tile repeats)
for src, w in [('wall_left', 200), ('wall_right', 200)]:
    im = Image.open(f'{S}/{src}.png').convert('RGBA'); b = bbox(im); print(src, save(im.crop((b[0], 0, b[2], im.height)), src, w))
halves('roof_tops', ['roof_left', 'roof_right'], 260)
halves('lanterns', ['lantern_pumpkin', 'lantern_paper'], 200)
# flyby 2x2 grid
im = Image.open(f'{S}/flyby_set.png').convert('RGBA'); W, H = im.size
for (i, j), n in zip([(0, 0), (1, 0), (0, 1), (1, 1)], ['fly_bats', 'fly_cat', 'fly_ghost', 'fly_dragon']):
    q = im.crop((i * W // 2, j * H // 2, (i + 1) * W // 2, (j + 1) * H // 2)); print(n, save(q.crop(bbox(q)), n, 400))
sheet('crumbly_break', 'crumble', 4, 512); sheet('trampoline_bounce', 'tramp', 3, 320); sheet('rescue_bat', 'bat', 3, 256); sheet('rocket_flame', 'flame', 4, 192, black=True)
# sparkle burst is RGB on black: alpha from brightness, colour un-premultiplied
im = np.asarray(Image.open(f'{S}/sparkle_burst.png').convert('RGB'), dtype=np.float32)
a = im.max(2); a = np.clip((a - 10) / 245, 0, 1); rgb = np.clip(im / np.maximum(a[..., None], 1e-3), 0, 255)
out = Image.fromarray(np.dstack([rgb, a * 255]).astype(np.uint8), 'RGBA'); print('burst', save(out.crop(bbox(out)), 'burst', 384))
json.dump(meta, open(f'{O}/sheets.json', 'w'), indent=1)
print(sum(os.path.getsize(f'{O}/{f}') for f in os.listdir(O)) // 1024, 'KB total')
