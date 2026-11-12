# round 110: compose the paladin review images: concept crop over the in-game row per tier, pairwise pass sheets
# (both orders), before/after. python3 compose.py <render dir> <out dir>   (renders from tiers.cjs at Z=4:
# pass1.png pass2.png pass3.png new.png all.png swing.png; concept sheets read from art/refs/gear/round110)
import sys, os
from PIL import Image, ImageDraw
src, out = sys.argv[1], sys.argv[2]
here = os.path.dirname(os.path.abspath(__file__)); refs = os.path.join(here, '../../../../art/refs/gear/round110')
Z, CW = 4, 128 * 4   # tiers.cjs at Z=4: a column is 64 px x PXQ 2 x Z; a row's height is the image's over its row count

def row(im, r, c0=0, c1=4, n=5): RH = im.height // n; return im.crop((c0 * CW, r * RH, c1 * CW, (r + 1) * RH))
def stack(ims, bg=(61, 74, 44), gap=8):
    W = max(i.width for i in ims); H = sum(i.height for i in ims) + gap * (len(ims) - 1)
    o = Image.new('RGB', (W, H), bg); y = 0
    for i in ims: o.paste(i, (0, y)); y += i.height + gap
    return o
def side(ims, bg=(30, 30, 30), gap=16):
    H = max(i.height for i in ims); W = sum(i.width for i in ims) + gap * (len(ims) - 1)
    o = Image.new('RGB', (W, H), bg); x = 0
    for i in ims: o.paste(i, (x, 0)); x += i.width + gap
    return o
def fitw(im, w): return im.resize((w, int(im.height * w / im.width)), Image.NEAREST if im.width < w else Image.LANCZOS)
def label(im, t):
    o = Image.new('RGB', (im.width, im.height + 40), (20, 20, 20)); o.paste(im, (0, 40)); ImageDraw.Draw(o).text((10, 10), t, fill=(255, 255, 255)); return o

new = Image.open(os.path.join(src, 'new.png')).convert('RGB')
# 1. concept crop vs in game, per tier (rows of new.png: 0 vigil, 1 auric, 2 auric 2h, 3 seraph, 4 seraph 2h; cols 0-3 dirs, 4-5 walk, 6-7 strike, 8 blessed, then icons)
sheets = {'vigil': ('05_Paladin_L6_Silver_Vigil.png', (0.0, 0.0, 0.31, 1.0), [0]), 'auric': ('06_Paladin_L8_Auric_Champion.png', (0.0, 0.0, 0.31, 1.0), [1, 2]), 'seraph': ('07_Paladin_L10_High_Seraph.png', (0.33, 0.0, 0.66, 1.0), [3, 4])}
wpn = Image.open(os.path.join(refs, '08_Paladin_Weapons.png')).convert('RGB')
for k, (f, box, rows) in sheets.items():
    sh = Image.open(os.path.join(refs, f)).convert('RGB'); W, H = sh.size
    crop = sh.crop((int(box[0] * W), int(box[1] * H), int(box[2] * W), int(box[3] * H)))
    parts = [crop]
    if k == 'auric': parts.append(wpn.crop((0.38 * wpn.width, 0, 0.62 * wpn.width, 0.5 * wpn.height)))   # the drum hammer
    if k == 'seraph': parts += [wpn.crop((0, 0.5 * wpn.height, 0.31 * wpn.width, wpn.height)), wpn.crop((0.66 * wpn.width, 0, wpn.width, 0.52 * wpn.height))]   # lantern hammer, sun-disc maul
    top = side([x.resize((int(x.width * 760 / x.height), 760), Image.LANCZOS) for x in parts], bg=(90, 90, 90))
    game = stack([row(new, r, 0, new.width // CW + 1) for r in rows]); game = game.resize((game.width // 2, game.height // 2), Image.NEAREST)
    stack([label(top, 'CONCEPT (the variation used; weapons-sheet pieces)'), label(game, 'IN GAME, 64 px sprites at x4: 4 directions, walk x2, strike x2, blessed (Consecrate), bag icons')], bg=(20, 20, 20)).save(os.path.join(out, f'concept_vs_game_{k}.png'))
# 2. pairwise passes, both orders (unlabeled sides)
P = [Image.open(os.path.join(src, f'pass{n}.png')).convert('RGB') for n in (1, 2, 3)]
for (a, b, rows, nm) in [(0, 1, [3, 4], 'seraph_pass1_vs_pass2'), (0, 1, [0], 'vigil_pass1_vs_pass2'), (0, 1, [1, 2], 'auric_pass1_vs_pass2'), (1, 2, [1, 2], 'auric_pass2_vs_pass3')]:
    A = stack([row(P[a], r) for r in rows]); B = stack([row(P[b], r) for r in rows])
    side([A, B]).resize(((A.width * 2 + 16) // 2, A.height // 2)).save(os.path.join(out, f'pair_{nm}_AB.png'))
    side([B, A]).resize(((A.width * 2 + 16) // 2, A.height // 2)).save(os.path.join(out, f'pair_{nm}_BA.png'))
# 3. before / after: old L5 Sunguard 2H + L6 Dawnbringer (rows 0-1 of all.png) over the new tiers
al = Image.open(os.path.join(src, 'all.png')).convert('RGB')
before = stack([row(al, r, 0, 8, 7) for r in (0, 1)]); after = stack([row(al, r, 0, 8, 7) for r in range(2, 7)])
img = stack([label(before, 'BEFORE: the last looks (L5 Sunguard + Crusader maul, L6 Dawnbringer) - every drop after this was a stat copy'), label(after, 'AFTER: L6 Silver Vigil, L8 Auric Champion (1h + shield, 2h), L10 High Seraph (1h + shield, 2h)')], bg=(20, 20, 20))
img.resize((img.width // 2, img.height // 2), Image.LANCZOS).save(os.path.join(out, 'before_after.png'))
sw = Image.open(os.path.join(src, 'swing.png')).convert('RGB'); sw.resize((sw.width // 2, sw.height // 2), Image.LANCZOS).save(os.path.join(out, 'swings.png'))
print('ok')
