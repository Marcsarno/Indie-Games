# Round 90: the four people at Dave's table (game/js/cine.js CINE_PEOPLE) from the user's detailed
# portraits. Three steps, each reading the one before from <work dir>:
#   python3 tools/portraits/portrait-cut.py down <imagesDir> <workDir> [headHeight=64]
#       resample each picture so every head is the same height (mode of a 40-colour version per cell)
#   python3 tools/portraits/portrait-cut.py cut <workDir>
#       flood the backdrop away from the top and sides (bluer-than-red pixels, stopped by the outline)
#   python3 tools/portraits/portrait-cut.py ext <workDir>
#       drop stray specks; run Dave's shoulders on past the picture's edges (cut2.json)
# The source pictures are not in the repository (they are pictures of real people); SRC below
# names them 1.webp .. 4.webp in <imagesDir> with the box inside each picture's frame and the head's
# height in source pixels. Eye boxes and mouth lines were read off zoomed crops by hand.
import sys
MODE = sys.argv[1]
if MODE == 'down':
    import sys, json
    from PIL import Image
    import numpy as np
    from collections import Counter
    IMG = sys.argv[2] + '/'; WORK = sys.argv[3] + '/'
    # name: (file, crop box inside the frame [x0, y0, x1, y1], head height in source px)
    SRC = { 'dave': (1, [62, 62, 1192, 1196], 765), 'marc': (2, [56, 62, 1196, 1214], 790), 'aaron': (3, [70, 70, 1184, 1186], 575), 'chris': (4, [0, 0, 1254, 1254], 920) }
    H0 = float(sys.argv[4]) if len(sys.argv) > 4 else 64
    out = {}
    for name, (n, box, hh) in SRC.items():
        im = Image.open(IMG + f'{n}.webp').convert('RGB').crop(box)
        q = im.quantize(colors=40, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
        a = np.asarray(q); pal = np.array(q.getpalette()[:40 * 3]).reshape(-1, 3)
        s = hh / H0; W = int(round(a.shape[1] / s)); H = int(round(a.shape[0] / s))
        g = np.zeros((H, W), int)
        for j in range(H):
            for i in range(W):
                x0, x1, y0, y1 = i * s, (i + 1) * s, j * s, (j + 1) * s; m = s * 0.2
                c = a[int(y0 + m):max(int(y0 + m) + 1, int(y1 - m)), int(x0 + m):max(int(x0 + m) + 1, int(x1 - m))].ravel()
                g[j, i] = np.bincount(c, minlength=40).argmax()
        out[name] = { 'g': g.tolist(), 'pal': pal.tolist() }
        print(name, W, H, 'src px per cell', round(s, 2))
        Image.fromarray(pal[g].astype('uint8')).resize((W * 5, H * 5), Image.NEAREST).save(WORK + f'{name}_d.png')
    json.dump(out, open(WORK + 'down.json', 'w'))
    ims = [Image.open(WORK + f'{n}_d.png') for n in SRC]
    S = Image.new('RGB', (sum(i.width + 8 for i in ims), max(i.height for i in ims)), (30, 30, 30)); x = 0
    for i in ims: S.paste(i, (x, 0)); x += i.width + 8
    S.save(WORK + 'down.png'); print(S.size)
    
if MODE == 'cut':
    WORK = sys.argv[2] + '/'
    import json, re
    from PIL import Image
    import numpy as np
    from collections import deque
    D = json.load(open(WORK + 'down.json'))
    PALSRC = open(__file__.rsplit('/tools/', 1)[0] + '/game/js/core.js').read()
    hexes = re.findall(r"'([0-9a-f]{6})'", PALSRC.split('const PAL_HEX = [')[1].split('];')[0])
    PAL = np.array([[int(h[i:i+2], 16) for i in (0, 2, 4)] for h in hexes])
    def lab(rgb):
        c = np.asarray(rgb, float) / 255; c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
        M = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]]); xyz = c @ M.T / np.array([0.9505, 1, 1.089])
        f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
        return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)
    # portrait-safe palette entries: blacks, stone browns, reds, bone, steel, wood, blues, skin, cave greys, dirt, orange, navy, light skin
    SAFE = [1, 2, 3] + list(range(4, 13)) + [19, 20, 21, 22, 23] + list(range(24, 37)) + [37, 38, 39, 40] + [60, 61, 62, 63] + list(range(64, 70)) + list(range(98, 104)) + [109, 110, 111, 112, 113, 125, 126, 127]
    SL = lab(PAL[SAFE])
    BG = { 'dave': 12, 'marc': 8, 'aaron': 8, 'chris': 50 }   # how much bluer than red the backdrop is
    CROP = { 'aaron': (0, 113) }
    out = {}; sheets = []
    for name, d in D.items():
        g = np.array(d['g']); pal = np.array(d['pal']); rgb = pal[g]
        if name in CROP: a, b = CROP[name]; g = g[:, a:b]; rgb = rgb[:, a:b]
        H, W = g.shape; luma = rgb @ np.array([0.299, 0.587, 0.114])
        bgish = (rgb[..., 2] - rgb[..., 0] > BG[name]) & (luma > 22)
        mask = np.zeros((H, W), bool); dq = deque()
        for x in range(W):
            for y in (0, 1): dq.append((y, x))
        for y in range(H // 3): dq.append((y, 0)); dq.append((y, W - 1))
        while dq:
            y, x = dq.popleft()
            if y < 0 or x < 0 or y >= H or x >= W or mask[y, x] or not bgish[y, x]: continue
            mask[y, x] = True; dq.extend(((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)))
        out[name] = { 'rgb': rgb.tolist(), 'bg': mask.tolist() }
        # nearest game-palette colour (Lab)
        L = lab(rgb.reshape(-1, 3)); idx = np.array(SAFE)[((L[:, None, :] - SL[None]) ** 2 * np.array([1.0, 1.4, 1.4])).sum(-1).argmin(1)].reshape(H, W)
        out[name]['idx'] = idx.tolist()
        for kind, img in (('true', rgb), ('pal', PAL[idx])):
            im = img.copy(); im[mask] = (60, 20, 70)
            sheets.append(Image.fromarray(im.astype('uint8')).resize((W * 4, H * 4), Image.NEAREST))
        print(name, W, H, 'bg share', round(mask.mean(), 2), 'palette colours used', len(set(idx[~mask].ravel())))
    json.dump(out, open(WORK + 'cut.json', 'w'))
    S = Image.new('RGB', (sum(i.width + 6 for i in sheets), max(i.height for i in sheets)), (30, 30, 30)); x = 0
    for i in sheets: S.paste(i, (x, 0)); x += i.width + 6
    S.save(WORK + 'cut.png'); print(S.size)
    
if MODE == 'ext':
    WORK = sys.argv[2] + '/'
    import json
    import numpy as np
    from PIL import Image
    from collections import deque, Counter
    C = json.load(open(WORK + 'cut.json'))
    # drop specks: keep only the largest connected piece of each cut-out
    for n in C:
        bg = np.array(C[n]['bg']); H, W = bg.shape; lab = np.zeros((H, W), int); best = (0, 0); k = 0
        for y in range(H):
            for x in range(W):
                if bg[y, x] or lab[y, x]: continue
                k += 1; dq = deque([(y, x)]); lab[y, x] = k; cnt = 0
                while dq:
                    a, b = dq.popleft(); cnt += 1
                    for c, d in ((a + 1, b), (a - 1, b), (a, b + 1), (a, b - 1)):
                        if 0 <= c < H and 0 <= d < W and not bg[c, d] and not lab[c, d]: lab[c, d] = k; dq.append((c, d))
                if cnt > best[0]: best = (cnt, k)
        bg = lab != best[1]; C[n]['bg'] = bg.tolist(); print(n, 'pieces', k)
    rgb = np.array(C['dave']['rgb']); bg = np.array(C['dave']['bg']); H, W = bg.shape
    E = 30; out = np.zeros((H, W + 2 * E, 3), int); obg = np.ones((H, W + 2 * E), bool)
    out[:, E:E + W] = rgb; obg[:, E:E + W] = bg
    dark = np.array([10, 8, 12])
    for side, col, x0, step in ((0, 0, E - 1, -1), (1, W - 1, E + W, 1)):
        rows = [j for j in range(H) if not bg[j, col]]; j0 = rows[0]
        near = rgb[j0 + 2:, :10] if side == 0 else rgb[j0 + 2:, -10:]; m = ~(bg[j0 + 2:, :10] if side == 0 else bg[j0 + 2:, -10:])
        cols = Counter(map(tuple, near[m].tolist())).most_common(4); base = np.array(cols[0][0]); shade = np.array(cols[1][0])
        print('side', side, 'from row', j0, 'shirt colours', cols[:3])
        for j in rows:
            e = int(min(E - 2, (j - j0 + 1) * 1.4))
            for q in range(e): out[j, x0 + step * q] = shade if ((q * (1 if side else -1) + j) % 9) < 2 else base; obg[j, x0 + step * q] = False
            out[j, x0 + step * e] = dark; obg[j, x0 + step * e] = False
            if j == j0: out[j, x0] = dark
            # the edge above: the outline steps down with the slope
            if j > j0:
                ep = int(min(E - 2, (j - 1 - j0 + 1) * 1.4))
                for q in range(ep + 1, e): out[j, x0 + step * q] = dark
    C['dave']['rgb'] = out.tolist(); C['dave']['bg'] = obg.tolist()
    json.dump(C, open(WORK + 'cut2.json', 'w'))
    im = out.copy(); im[obg] = (60, 20, 70)
    Image.fromarray(im.astype('uint8')).resize((im.shape[1] * 5, H * 5), Image.NEAREST).save(WORK + 'dave_ext.png'); print(im.shape)
    
