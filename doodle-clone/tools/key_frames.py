#!/usr/bin/env python3
"""Key a solid-colour-background clip into transparent RGBA frames.

usage: python3 -I tools/key_frames.py <clip.mp4> <out_dir> [--t0 14] [--t1 40]

- background colour is measured from the border pixels of every 8th frame (median), so green and
  magenta screens both work without being told
- alpha = smooth ramp on the chroma (Cb,Cr) distance to the key colour
- foreground colour is recovered by un-mixing the key colour out of soft edge pixels (kills the fringe)
- writes frame_000.png ... plus meta.json (per-frame bbox) for the packer
"""
import sys, os, json, subprocess, tempfile, glob
import numpy as np
from PIL import Image, ImageFilter

def ycc(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b
    cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b
    return cb, cr

def main():
    clip, out = sys.argv[1], sys.argv[2]
    t0 = float(sys.argv[sys.argv.index('--t0') + 1]) if '--t0' in sys.argv else 14.0
    t1 = float(sys.argv[sys.argv.index('--t1') + 1]) if '--t1' in sys.argv else 40.0
    os.makedirs(out, exist_ok=True)
    tmp = tempfile.mkdtemp(prefix='keyframes_')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', clip, '-vsync', '0', os.path.join(tmp, 'f_%03d.png')], check=True)
    files = sorted(glob.glob(os.path.join(tmp, 'f_*.png')))
    # key colour from the borders
    samples = []
    for f in files[::8]:
        a = np.asarray(Image.open(f).convert('RGB'), dtype=np.float32)
        samples += [a[:12].reshape(-1, 3), a[-12:].reshape(-1, 3), a[:, :12].reshape(-1, 3), a[:, -12:].reshape(-1, 3)]
    key = np.median(np.concatenate(samples), axis=0)
    kcb, kcr = ycc(key[None, None, :])
    meta = {'key_rgb': [float(x) for x in key], 'frames': []}
    for i, f in enumerate(files):
        a = np.asarray(Image.open(f).convert('RGB'), dtype=np.float32)
        cb, cr = ycc(a)
        d = np.hypot(cb - kcb[0, 0], cr - kcr[0, 0])
        alpha = np.clip((d - t0) / (t1 - t0), 0, 1)
        alpha = alpha * alpha * (3 - 2 * alpha)          # smoothstep
        # un-mix: p = a*fg + (1-a)*key  ->  fg = (p - (1-a)*key) / a
        al = np.maximum(alpha, 1e-3)[..., None]
        fg = (a - (1 - alpha)[..., None] * key) / al
        fg = np.clip(fg, 0, 255)
        # despill on the soft rim only (real purples/pinks inside the sprite stay untouched)
        rim = (alpha < 0.98)
        rim |= (np.asarray(Image.fromarray((alpha < 0.5).astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(7))) > 0)
        r_, g_, b_ = fg[..., 0], fg[..., 1], fg[..., 2]
        if key[1] > key[0] and key[1] > key[2]:            # green screen: average despill
            g_ = np.where(rim, np.minimum(g_, 0.5 * (r_ + b_)), g_)
        else:                                             # magenta screen
            ex = np.where(rim, np.maximum(0, np.minimum(r_, b_) - g_), 0)
            r_ = r_ - 0.7 * ex
            b_ = b_ - 0.7 * ex
        fg = np.dstack([r_, g_, b_])
        # pull the edge in a hair so no key colour survives in the rim
        alpha = np.clip(np.asarray(Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)), dtype=np.float32) / 255.0 * 1.0, 0, 1)
        fg[alpha < 0.02] = 0
        rgba = np.dstack([fg, alpha * 255]).astype(np.uint8)
        Image.fromarray(rgba, 'RGBA').save(os.path.join(out, f'frame_{i:03d}.png'))
        ys, xs = np.where(alpha > 0.35)
        if len(xs):
            meta['frames'].append({'i': i, 'x0': int(xs.min()), 'x1': int(xs.max()), 'y0': int(ys.min()), 'y1': int(ys.max()),
                                   'cx': float(xs.mean()), 'area': int(len(xs))})
        else:
            meta['frames'].append({'i': i, 'empty': True})
    json.dump(meta, open(os.path.join(out, 'meta.json'), 'w'))
    print(os.path.basename(clip), 'key rgb', [round(float(x)) for x in key], 'frames', len(files))

main()
