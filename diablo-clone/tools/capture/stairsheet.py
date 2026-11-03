# zoomed stairs crops: python3 stairsheet.py <prefix> <out> ; reads the pos lines from stdin
import sys
from PIL import Image
pre, out = sys.argv[1], sys.argv[2]
pos = {}
for line in sys.stdin:
    if len(line.split()) == 2 and 'pos' in line: k, v = line.split(); pos[k[:-3]] = [float(a) for a in v.split(',')]
tiles = []
for k in sorted(pos, key=lambda k: int(k[1:])):
    x, y = pos[k]; im = Image.open(f'{pre}-{k}.png').convert('RGB')
    c = im.crop((int(x) - 90, int(y) - 70, int(x) + 90, int(y) + 60)).resize((540, 390), Image.NEAREST)
    tiles.append(c)
o = Image.new('RGB', (540 * len(tiles) + 10 * (len(tiles) - 1), 390), (40, 40, 40))
for i, t in enumerate(tiles): o.paste(t, (i * 550, 0))
o.save(out)
