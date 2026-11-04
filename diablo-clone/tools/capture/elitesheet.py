# composes tools/capture/elitecap/pt-*.png into a sheet: rows = effects, columns = crypt frames 0-2, forest frames 0-2
import sys, glob
from PIL import Image, ImageDraw
src, out = sys.argv[1], sys.argv[2]
keys = sys.argv[3].split(',') if len(sys.argv) > 3 else ['burning', 'frozen', 'shielded', 'shieldcrack', 'summoner', 'vampiric', 'blinking', 'deathburst', 'labels']
cw, ch, z = 230, 200, 1
cell = lambda im: im.crop((270 - cw // 2 + 30, int(840 * 0.47) - ch // 2 - 30, 270 + cw // 2 + 30, int(840 * 0.47) + ch // 2 - 30))
sheet = Image.new('RGB', (110 + 6 * cw * z, len(keys) * ch * z), (20, 20, 24))
d = ImageDraw.Draw(sheet)
for r, k in enumerate(keys):
    d.text((6, r * ch * z + ch * z // 2), k, fill=(230, 230, 230))
    for c, (bg, f) in enumerate([(b, f) for b in ('crypt', 'forest') for f in range(3)]):
        im = cell(Image.open(f'{src}/pt-{bg}-{k}-{f}.png').convert('RGB')).resize((cw * z, ch * z), Image.NEAREST)
        sheet.paste(im, (110 + c * cw * z, r * ch * z))
sheet.save(out)
