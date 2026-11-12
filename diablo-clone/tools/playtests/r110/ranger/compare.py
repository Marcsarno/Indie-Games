# Round 110 (ranger gear): concept crop next to the in-game sprite, one image per tier.
#   python3 tools/playtests/r110/ranger/compare.py <tiers Z=3 png, set=new> <out dir> <tag>
# Concept crops: the chosen variation's three views, its bow + quiver, and the weapons sheet's bow/quiver used.
import sys
from PIL import Image, ImageDraw
src, outd, tag = sys.argv[1:4]
R = 'art/refs/gear/round110/'
W = R + '16_Ranger_Weapons.png'
TIERS = [
  ('L6_falconer', [(R + '13_Ranger_L6_Falconer.png', (40, 40, 680, 370)), (R + '13_Ranger_L6_Falconer.png', (210, 370, 460, 700)), (W, (200, 20, 440, 540)), (W, (650, 570, 870, 1000))]),
  ('L8_antler_warden', [(R + '14_Ranger_L8_Antler_Warden.png', (1200, 85, 1740, 420)), (R + '14_Ranger_L8_Antler_Warden.png', (1320, 440, 1600, 830)), (W, (680, 0, 880, 560)), (W, (1080, 580, 1310, 1000))]),
  ('L10_wildheart', [(R + '15_Ranger_L10_Wildheart_Sentinel.png', (40, 30, 670, 330)), (R + '15_Ranger_L10_Wildheart_Sentinel.png', (190, 345, 490, 680)), (W, (1090, 20, 1300, 550))]),
]
Z = 3; CW, CH, LAB = 44 * 2 * Z, 50 * 2 * Z, 18
g = Image.open(src).convert('RGB')
COLS = [0, 2, 3, 4, 8, 11]   # d1, d5 back, d7, walk d1, draw d3, sky d1
for n, (name, crops) in enumerate(TIERS):
    H = CH
    parts = []
    for f, box in crops:
        im = Image.open(f).convert('RGB').crop(box); k = H / im.size[1]
        parts.append(im.resize((max(1, int(im.size[0] * k)), H), Image.NEAREST))
    y0 = LAB + n * (CH + LAB) + LAB
    game = [g.crop((c * CW, y0, (c + 1) * CW, y0 + CH)) for c in COLS]
    wl = sum(p.size[0] for p in parts) + 20
    out = Image.new('RGB', (max(wl, CW * len(game)), H * 2 + 50), (60, 62, 66))
    d = ImageDraw.Draw(out); d.text((6, 4), 'CONCEPT (chosen variation, its bow + quiver, weapons sheet)', fill=(255, 215, 122))
    x = 0
    for p in parts: out.paste(p, (x, 20)); x += p.size[0] + 6
    d.text((6, H + 28), 'IN GAME %s (detail scale x%d): d1, d5 back, d7, walk, draw d3, Rain of Arrows' % (tag, Z), fill=(255, 215, 122))
    for i, gi in enumerate(game): out.paste(gi, (i * CW, H + 46 - 0))
    out.save('%s/%s_%s.png' % (outd, name, tag))
    print('%s/%s_%s.png' % (outd, name, tag))
