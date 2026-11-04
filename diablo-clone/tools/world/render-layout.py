# Top-down layout of a world region, drawn as the game shows it (isometric diamond, north up),
# from tools/world/<region>.json: python3 tools/world/render-layout.py hollow out.png
import json, sys, math, random
from PIL import Image, ImageDraw, ImageFont
name, out = sys.argv[1], sys.argv[2]
D = json.load(open(f'{__file__.rsplit("/",1)[0]}/{name}.json')); N = D['size']
ij = lambda u, s: (s + u, s - u)
C = {c['id']: c for c in D['clearings']}
def seg_d(p, a, b):
    (px, py), (ax, ay), (bx, by) = p, a, b; dx, dy = bx - ax, by - ay; L = dx * dx + dy * dy
    t = 0 if L == 0 else max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / L)); return math.hypot(px - ax - t * dx, py - ay - t * dy)
def poly_d(p, pts): return min(seg_d(p, pts[k], pts[k + 1]) for k in range(len(pts) - 1))
roads = []
for r in D['roads']:
    a, b = C[r['from']], C[r['to']]; pts = [ij(a['u'], a['s'])] + [ij(*v) for v in r.get('via', [])] + [ij(b['u'], b['s'])]; roads.append((pts, r['w'], r.get('main')))
water = [([ij(*v) for v in w['path']], w['w']) for w in D['water']]
cliffs = [([ij(*v) for v in c['path']], c['w']) for c in D['cliffs']]
T = [[None] * N for _ in range(N)]
for j in range(N):
    for i in range(N):
        p = (i + 0.5, j + 0.5); edge = min(i, j, N - 1 - i, N - 1 - j)
        rd = min((poly_d(p, pts) - w / 2 for pts, w, m in roads), default=99)
        cl = min((math.hypot(p[0] - ij(c['u'], c['s'])[0], p[1] - ij(c['u'], c['s'])[1]) - c['r'] for c in C.values()), default=99)
        wd = min((poly_d(p, pts) - w / 2 for pts, w in water), default=99); cd = min((poly_d(p, pts) - w / 2 for pts, w in cliffs), default=99)
        if edge < 3: t = 'thick'
        elif cd < 0: t = 'cliff'
        elif wd < 0: t = 'water'
        elif rd < 0: t = 'road'
        elif cl < 0: t = 'clear'
        elif cl < D.get('woodsFringe', 4) or rd < D.get('roadFringe', 2.5): t = 'woods'
        else: t = 'thick'
        T[j][i] = t
# the danger ground round the barrow
for c in C.values():
    if c.get('danger'):
        ci, cj = ij(c['u'], c['s'])
        for j in range(N):
            for i in range(N):
                if T[j][i] in ('clear', 'woods') and math.hypot(i - ci, j - cj) < c['r'] + 3: T[j][i] = 'danger'
COL = {'thick': (22, 46, 28), 'woods': (58, 96, 50), 'clear': (104, 150, 70), 'road': (156, 118, 74), 'water': (64, 118, 170), 'cliff': (112, 104, 112), 'danger': (110, 70, 64)}
TW, TH, M = 14, 7, 40
W, H = N * TW + 2 * M, N * TH + 2 * M + 60
im = Image.new('RGB', (W, H), (14, 10, 9)); g = ImageDraw.Draw(im)
X = lambda i, j: (M + (i - j) * TW / 2 + N * TW / 2, M + 50 + (i + j) * TH / 2)
random.seed(4)
for j in range(N):
    for i in range(N):
        x, y = X(i, j); c = COL[T[j][i]]
        g.polygon([(x, y), (x + TW / 2, y + TH / 2), (x, y + TH), (x - TW / 2, y + TH / 2)], fill=c)
        if T[j][i] == 'woods' and random.random() < 0.28: g.ellipse([x - 3, y + 1, x + 3, y + 6], fill=(30, 62, 34))
        if T[j][i] == 'thick' and random.random() < 0.5: g.ellipse([x - 4, y, x + 4, y + 6], fill=(16, 36, 22))
try:
    F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 15); f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 12); FT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22)
except Exception: F = f = FT = ImageFont.load_default()
def at(u, s): i, j = ij(u, s); return X(i, j)
def txt(t, x, y, col=(255, 240, 200), font=None, anchor='mm'):
    font = font or F; g.text((x + 1, y + 1), t, fill=(0, 0, 0), font=font, anchor=anchor); g.text((x, y), t, fill=col, font=font, anchor=anchor)
# gates, doors, caches, packs, landmarks
for gt in D['gates']:
    x, y = at(*gt['at']); g.line([(x - 16, y - 6), (x + 16, y + 10)], fill=(70, 44, 20), width=8); g.line([(x - 16, y - 6), (x + 16, y + 10)], fill=(140, 96, 52), width=4)
for dr in D['doors']:
    x, y = at(dr['u'], dr['s']); col = (230, 70, 60) if dr.get('danger') else (240, 200, 90)
    g.rectangle([x - 8, y - 8, x + 8, y + 6], fill=(12, 8, 8), outline=col, width=3)
for ca in D['caches']:
    x, y = at(ca['u'], ca['s']); g.rectangle([x - 5, y - 4, x + 5, y + 4], fill=(240, 196, 60), outline=(90, 60, 10))
PC = {'wolf': (220, 60, 40), 'slime': (90, 200, 80), 'boar': (180, 120, 70), 'goblin': (120, 200, 60), 'skeleton': (240, 240, 230)}
for pk in D['packs']:
    c = C[pk['at']]; ci, cj = ij(c['u'], c['s'])
    for k in range(pk['count']):
        a = k / max(1, pk['count']) * 6.283 + len(pk['id']); r = c['r'] * 0.55 if pk['count'] > 1 else c['r'] * 0.3
        x, y = X(ci + math.cos(a) * r, cj + math.sin(a) * r)
        for q in range(pk['n']): g.ellipse([x - 4 + q * 5 - pk['n'] * 2, y - 3, x + 4 + q * 5 - pk['n'] * 2, y + 4], fill=PC.get(pk['id'], (220, 60, 40)), outline=(0, 0, 0))
for c in C.values():
    x, y = at(c['u'], c['s']); lv = '' if not c['level'] else f"LV {c['level']}" + (f"-{c['lvlTo']}" if c.get('lvlTo') else '') + ('+' if c.get('danger') else '')
    txt(c['name'], x, y - c['r'] * TH * 0.55 - 8, (255, 120, 110) if c.get('danger') else (255, 240, 200)); 
    if lv: txt(lv, x, y - c['r'] * TH * 0.55 + 7, (230, 225, 200), f)
for dr in D['doors']:
    x, y = at(dr['u'], dr['s']); txt(dr['name'] + f" ({dr['dungeon']}, {dr['floors']} fl)", x, y + 16, (255, 150, 140) if dr.get('danger') else (250, 220, 140), f)
for gt in D['gates']: x, y = at(*gt['at']); txt('fallen tree (Aldo clears it)', x, y + 20, (250, 210, 150), f)
# a lettered grid for markup notes
cols, rows = 8, 5
for k in range(cols + 1): xx = M + k * (N * TW) / cols; g.line([(xx, 50), (xx, H - 10)], fill=(255, 255, 255, 40), width=1)
for k in range(rows + 1): yy = 50 + k * (H - 60) / rows; g.line([(M, yy), (W - M, yy)], fill=(255, 255, 255, 40), width=1)
for k in range(cols): txt('ABCDEFGHIJ'[k], M + (k + 0.5) * (N * TW) / cols, 58, (200, 200, 200), f)
for k in range(rows): txt(str(k + 1), M - 14, 50 + (k + 0.5) * (H - 60) / rows, (200, 200, 200), f)
txt(f"{D['name']}: LAYOUT (north up, as the game shows it)", W / 2, 22, (255, 230, 170), FT)
# legend
lx, ly = 14, H - 150
for k, (lab, col) in enumerate([('open clearing (fights)', COL['clear']), ('open woods: tree clumps, walkable', COL['woods']), ('thick forest (wall)', COL['thick']), ('road', COL['road']), ('brook', COL['water']), ('cliff', COL['cliff']), ('danger ground', COL['danger'])]):
    g.rectangle([lx, ly + k * 18, lx + 14, ly + k * 18 + 12], fill=col, outline=(0, 0, 0)); txt(lab, lx + 22, ly + k * 18 + 6, (230, 225, 210), f, 'lm')
txt('gold: cache    red/white dots: monster packs    box: dungeon door', W - 14, H - 14, (230, 225, 210), f, 'rm')
im.save(out); print(out, im.size)
