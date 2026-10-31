#!/usr/bin/env python3
"""Spec + preview of the SHARED jump timing: every outfit is driven by the same sim phase, so all jump at one speed.

Runtime animator (mirror this in js/sprites.js):
  touchdown -> squash hold (sim holds her on the platform, SQUASH_HOLD s total):
       compress: frames touch..landDeep over COMPRESS s, release: crouchDeep..launch over RELEASE s
  then the sim launches: rise: frames launch..apex mapped by sim progress (vy from v0 to 0)
                         fall: frames apex+1..touch mapped by sim progress (0 to the touchdown speed)
Whatever the clip's own length, the frame index is picked from progress, so no outfit is faster or slower.
"""
import json, sys, math
from PIL import Image

G, H = 20.0, 5.5                     # gravity u/s^2, apex height u (config.js)
COMPRESS, RELEASE = 0.05, 0.05       # s each
T_UP = math.sqrt(2 * H / G); T_DOWN = T_UP
names = ['witch', 'fairy', 'astronaut', 'ghost', 'pumpkin']

def seq(a, b):
    return list(range(a, b + 1)) if b >= a else [a]

def pick(lst, p):                    # progress 0..1 -> frame index (nearest)
    return lst[min(len(lst) - 1, max(0, round(p * (len(lst) - 1))))]

def frame_at(j, t):
    k = j['key']
    if t < COMPRESS:
        return pick(seq(k['touch'], k['landDeep']), t / COMPRESS), 0.0
    t -= COMPRESS
    if t < RELEASE:
        return pick(seq(k['crouchDeep'], k['launch'] - 1), t / RELEASE), 0.0
    t -= RELEASE
    if t < T_UP:
        p = t / T_UP; y = H * (1 - (1 - p) ** 2)
        return pick(seq(k['launch'], k['apex']), p), y
    t -= T_UP
    p = t / T_DOWN; y = H * (1 - p * p)
    return pick(seq(k['apex'] + 1, k['touch']), p), y

if __name__ == '__main__':
    D = {n: (json.load(open(f'assets/outfits/{n}.json')), Image.open(f'assets/outfits/{n}.webp').convert('RGBA')) for n in names}
    total = COMPRESS + RELEASE + T_UP + T_DOWN
    print('shared cycle %.2f s (squash %.2f + up %.2f + down %.2f)' % (total, COMPRESS + RELEASE, T_UP, T_DOWN))
    for n in names:
        k = D[n][0]['key']
        print(f"{n:10s} clip air frames {k['touch']-k['launch']+1:2d} ({(k['touch']-k['launch']+1)/24:.2f}s)  -> played over {T_UP+T_DOWN:.2f}s  (x{(T_UP+T_DOWN)/((k['touch']-k['launch']+1)/24):.2f} speed change)")
    CW, CH, ARC = 230, 360, 120
    out = []; dt = 0.03; t = 0.0
    while t < total:
        sheet = Image.new('RGBA', (CW * 5, CH), (60, 32, 105, 255))
        for c, n in enumerate(names):
            j, a = D[n]; fi, y = frame_at(j, t); f = j['frames'][fi]
            spr = a.crop((f['x'], f['y'], f['x'] + f['w'], f['y'] + f['h']))
            gx = c * CW + CW // 2 + f['dx'] - f['w'] / 2
            gy = CH - 40 - f['dy'] - f['h'] - y / H * ARC
            sheet.alpha_composite(spr, (int(gx), int(gy)))
        out.append(sheet.convert('P', palette=Image.ADAPTIVE, colors=128)); t += dt
    out[0].save('art/keyed-preview/jump-synced.gif', save_all=True, append_images=out[1:], duration=int(dt * 1000), loop=0, disposal=2)
    print(len(out), 'frames')
