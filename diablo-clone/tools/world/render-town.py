# Plan of a region's town square, as the game shows it (isometric, north up), from <region>.json's "town":
# python3 tools/world/render-town.py ashford out.png. Offsets are in tiles from the bell: du across the screen, ds down it.
import json, sys, math
from PIL import Image, ImageDraw, ImageFont
name, out = sys.argv[1], sys.argv[2]
D = json.load(open(f'{__file__.rsplit("/",1)[0]}/{name}.json')); T = D['town']; R = T['r']
K = 62   # pixels per tile across the screen (a tile is a 2:1 diamond: K wide, K/2 tall)
W, H = int(2 * (R + 3) * K * 0.72) + 80, int((R + 3) * K * 0.72) + 160
im = Image.new('RGB', (W, H), (14, 10, 9)); g = ImageDraw.Draw(im)
cx, cy = W / 2, 80 + (R + 3) * K * 0.36
# du, ds are along the screen (du across, ds down) in tile-diagonal units, as CAMP_AT: one unit = 0.7071 tile
P = lambda du, ds: (cx + du * K * 0.72, cy + ds * K * 0.36)
F = lambda n, b=False: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans' + ('-Bold' if b else '') + '.ttf', n)
def txt(t, x, y, col=(255, 240, 200), font=None, anchor='mm'): font = font or F(13); g.text((x + 1, y + 1), t, fill=(0, 0, 0), font=font, anchor=anchor); g.text((x, y), t, fill=col, font=font, anchor=anchor)
# the square: cobbles inside the palisade ring (an ellipse on screen), houses as scenery outside it
g.ellipse([cx - (R + 2.4) * K * 0.72, cy - (R + 2.4) * K * 0.36, cx + (R + 2.4) * K * 0.72, cy + (R + 2.4) * K * 0.36], fill=(48, 40, 34))
g.ellipse([cx - R * K * 0.72, cy - R * K * 0.36, cx + R * K * 0.72, cy + R * K * 0.36], fill=(112, 92, 70), outline=(70, 46, 26), width=7)
for k in range(9):
    a = k / 9 * 6.283 + 0.2; x, y = cx + math.cos(a) * (R + 1.4) * K * 0.72, cy + math.sin(a) * (R + 1.4) * K * 0.36
    if math.sin(a) > 0.2 or abs(math.cos(a)) > 0.75: g.polygon([(x - 40, y), (x, y - 28), (x + 40, y), (x + 40, y + 24), (x - 40, y + 24)], fill=(60, 58, 70), outline=(20, 18, 22))
for gt in T['gates']:
    x, y = P(gt['du'], gt['ds']); g.rectangle([x - 18, y - 8, x + 18, y + 8], fill=(150, 104, 56), outline=(40, 26, 12), width=2); txt(gt['name'], x, y - 18, (250, 210, 150))
for pr in T['props']:
    if 'houses' in pr['name']: continue
    x, y = P(pr['du'], pr['ds']); g.ellipse([x - 9, y - 5, x + 9, y + 5], fill=(90, 96, 104), outline=(20, 20, 24)); txt(pr['name'], x, y + 14, (200, 200, 210), F(12))
x, y = P(0, 0); g.rectangle([x - 8, y - 18, x + 8, y + 4], fill=(200, 160, 60), outline=(60, 40, 10), width=2)
for st in T['stations']:
    if st['pdu'] or st['pds']:
        x, y = P(st['pdu'], st['pds']); g.rectangle([x - 12, y - 7, x + 12, y + 7], fill=(132, 92, 56), outline=(40, 26, 12), width=2)
    x, y = P(st['du'], st['ds']); g.ellipse([x - 7, y - 7, x + 7, y + 7], fill=(240, 200, 90), outline=(0, 0, 0), width=2)
    txt(st['who'], x, y - 17, (255, 230, 160), F(13, True)); txt(st['role'] + ' · ' + st['prop'], x, y + 16, (215, 205, 190), F(11))
txt(f"{D['name']}: THE TOWN SQUARE (north up, as the game shows it)", W / 2, 24, (255, 230, 170), F(20, True))
txt('gold dot: person   brown box: their stall/prop   ring: palisade   grey blocks: houses (scenery)', W / 2, H - 20, (200, 195, 185), F(12))
im.save(out); print(out, im.size)
