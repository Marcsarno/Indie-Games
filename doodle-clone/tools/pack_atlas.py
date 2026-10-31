#!/usr/bin/env python3
"""Pack the keyed frames of one outfit into a single atlas + JSON, using EVERY frame of the jump cycle (24 fps) for smoothness.

usage: python3 -I tools/pack_atlas.py <keyed_dir> <out_prefix> [--scale 0.85] [--size 2048]

Frames are trimmed to their alpha box and shelf-packed. Each frame stores dx (centre x vs the clip's stable body
centre) and dy (distance of the trimmed box's bottom above the clip's ground line, in source px), so the renderer
can place it with feet on the platform and keep the clip's own leg tuck / lift.
Blurry frames (video-generator smear) are replaced by holding the previous frame.
States written: stand, crouch (anticipation), rise, fall, land (landing squash), all as lists of frame indices.
"""
import sys, os, json, glob
import numpy as np
from PIL import Image

def arg(name, default):
    return type(default)(sys.argv[sys.argv.index(name) + 1]) if name in sys.argv else default

def main():
    d, prefix = sys.argv[1], sys.argv[2]
    scale, size = arg('--scale', 0.85), arg('--size', 2048)
    meta = json.load(open(os.path.join(d, 'meta.json')))['frames']
    n = len(meta)
    y1 = np.array([f['y1'] for f in meta]); y0 = np.array([f['y0'] for f in meta]); cx = np.array([f['cx'] for f in meta])
    ground = float(np.median(y1[:8]))
    body_cx = float(np.median(cx[:8]))
    idle_h = float(np.median((y1 - y0)[:8]))
    h = y1 - y0
    air = y1 < ground - 10
    a0 = int(np.argmax(air)); a1 = n - 1 - int(np.argmax(air[::-1]))
    apex = a0 + int(np.argmin(y1[a0:a1 + 1]))
    # crouch = frames before takeoff that are noticeably shorter than idle, working back from a0
    s = a0
    while s > 0 and h[s - 1] < idle_h * 0.985 or (s > 0 and s > a0 - 3):
        s -= 1
        if s <= 0: break
    # land = frames after touchdown until height is back to idle
    e = a1 + 1
    while e < n - 1 and (h[e + 1] < idle_h * 0.985 or e < a1 + 3):
        e += 1
    s = max(0, s - 2); e = min(n - 1, e + 2)
    # sharpness (mean gradient on grey composite) to find smeared frames
    def sharp(i):
        im = Image.open(os.path.join(d, f'frame_{i:03d}.png'))
        a = np.asarray(im, dtype=np.float32); g = a[..., :3].mean(2) * (a[..., 3] / 255.0)
        gx = np.abs(np.diff(g, axis=1)).mean(); gy = np.abs(np.diff(g, axis=0)).mean()
        return gx + gy
    sh = {i: sharp(i) for i in range(max(0, s - 3), min(n, e + 4))}
    src = {}
    held = []
    for i in range(s, e + 1):
        nb = [sh[j] for j in range(i - 3, i + 4) if j in sh and j != i]
        if sh[i] < 0.72 * float(np.median(nb)) and i > s:
            src[i] = src[i - 1]; held.append(i)
        else:
            src[i] = i
    uniq = sorted(set(src.values()))
    # trim + scale
    crops = {}
    for i in uniq:
        im = Image.open(os.path.join(d, f'frame_{i:03d}.png'))
        bb = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
        c = im.crop(bb)
        if scale != 1: c = c.resize((max(1, round(c.width * scale)), max(1, round(c.height * scale))), Image.LANCZOS)
        crops[i] = (c, bb)
    # shelf pack, tallest first
    order = sorted(uniq, key=lambda i: -crops[i][0].height)
    pad = 2; x = y = shelf = 0; place = {}
    for i in order:
        c = crops[i][0]
        if x + c.width + pad > size: x = 0; y += shelf + pad; shelf = 0
        place[i] = (x, y); x += c.width + pad; shelf = max(shelf, c.height)
    H = y + shelf
    if H > size:
        print('DOES NOT FIT: need height', H, 'at width', size, '-> lower --scale or use two atlases'); sys.exit(1)
    atlas = Image.new('RGBA', (size, H), (0, 0, 0, 0))
    for i in uniq: atlas.paste(crops[i][0], place[i])
    atlas.save(prefix + '.webp', 'WEBP', quality=88, alpha_quality=95, method=6)
    frames = []
    for i in range(s, e + 1):
        k = src[i]; c, bb = crops[k]; x0, yy = place[k]
        frames.append({'src': i, 'x': x0, 'y': yy, 'w': c.width, 'h': c.height,
                       'dx': round(((bb[0] + bb[2]) / 2 - body_cx) * scale, 2),
                       'dy': round((ground - bb[3]) * scale, 2)})
    rel = lambda a, b: list(range(a - s, b - s + 1))
    out = {'fps': 24, 'scale': scale, 'atlas': os.path.basename(prefix) + '.webp', 'atlasSize': [size, H],
           'standHeightPx': round(idle_h * scale, 1),
           'frames': frames, 'held': [i - s for i in held],
           'states': {'crouch': rel(s, a0 - 1), 'rise': rel(a0, apex), 'fall': rel(apex + 1, a1), 'land': rel(a1 + 1, e)}}
    json.dump(out, open(prefix + '.json', 'w'))
    print(os.path.basename(prefix), 'frames', len(frames), 'unique', len(uniq), 'held', held, 'atlas', (size, H),
          'webp KB', os.path.getsize(prefix + '.webp') // 1024, 'states', {k: len(v) for k, v in out['states'].items()})

main()
