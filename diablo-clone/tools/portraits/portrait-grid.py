# Recover the true pixel grid of an AI-made "pixel art" picture (its cells are not all the same
# size): find the rows and columns where colours change, take the cells between them, and keep each
# cell's median colour.   python3 tools/portraits/portrait-grid.py <outDir> name=picture ...
# Writes <outDir>/grids.json ({name: rows of [r, g, b]}) and <name>_grid.png (10x) to look at.
# Round 89 used it for the four people at the table (game/js/cine.js CINE_PEOPLE); their colours
# were then matched by hand to palette indices, one letter each.
import sys, json
from PIL import Image
import numpy as np
def lines(d, S, mind=22):
    d = d.astype(float)
    # smooth over 3
    k = np.convolve(d, np.ones(5), 'same')
    thr = np.percentile(k, 70)
    idx = np.argsort(-k); taken = []
    for i in idx:
        if k[i] < thr: break
        if all(abs(i - t) >= mind for t in taken): taken.append(int(i))
    taken = sorted(taken)
    pts = [0] + [t + 1 for t in taken if 8 < t < S - 8] + [S]
    gaps = np.diff(pts); med = float(np.median(gaps))
    out = [0]
    for a, b in zip(pts[:-1], pts[1:]):
        n = max(1, int(round((b - a) / med)))
        for q in range(1, n + 1): out.append(a + (b - a) * q / n)
    return out, med
res = {}
out = sys.argv[1]
for arg in sys.argv[2:]:
    name, path = arg.split('=', 1)
    a = np.asarray(Image.open(path).convert('RGB')).astype(int); S = a.shape[0]
    dx = np.abs(np.diff(a, axis=1)).sum(axis=(0, 2)); dy = np.abs(np.diff(a, axis=0)).sum(axis=(1, 2))
    xs, mx = lines(dx, a.shape[1]); ys, my = lines(dy, S)
    print(name, 'cols', len(xs) - 1, 'rows', len(ys) - 1, 'cell', round(mx, 1), round(my, 1))
    g = np.zeros((len(ys) - 1, len(xs) - 1, 3), int)
    for j in range(len(ys) - 1):
        for i in range(len(xs) - 1):
            x0, x1, y0, y1 = xs[i], xs[i + 1], ys[j], ys[j + 1]; px = (x1 - x0) * 0.25; py = (y1 - y0) * 0.25
            c = a[int(y0 + py):max(int(y0 + py) + 1, int(y1 - py)), int(x0 + px):max(int(x0 + px) + 1, int(x1 - px))].reshape(-1, 3)
            g[j, i] = np.median(c, axis=0)
    res[name] = g.tolist()
    Image.fromarray(g.astype('uint8')).resize((g.shape[1] * 10, g.shape[0] * 10), Image.NEAREST).save(f'{out}/{name}_grid.png')
json.dump(res, open(f'{out}/grids.json', 'w'))
