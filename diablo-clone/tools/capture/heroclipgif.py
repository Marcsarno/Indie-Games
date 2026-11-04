# heroclips.cjs output -> per clip a before/after GIF (2x) and one strip sheet of every 3rd frame
# python3 heroclipgif.py before.json after.json outdir
import json, sys, base64, io, os, re
from PIL import Image, ImageDraw
A, B, out = json.load(open(sys.argv[1])), json.load(open(sys.argv[2])), sys.argv[3]
os.makedirs(out, exist_ok=True)
dec = lambda u: Image.open(io.BytesIO(base64.b64decode(u.split(',')[1]))).convert('RGB')
rows = []
for name in B:
    a, b = [dec(u) for u in A[name]], [dec(u) for u in B[name]]
    w, h = b[0].size; fr = []
    for k in range(min(len(a), len(b))):
        f = Image.new('RGB', (w * 2 + 6, h + 16), (20, 14, 12)); d = ImageDraw.Draw(f)
        f.paste(a[k], (0, 16)); f.paste(b[k], (w + 6, 16)); d.text((4, 2), 'before', fill=(200, 190, 170)); d.text((w + 10, 2), 'now', fill=(240, 220, 150))
        fr.append(f.quantize(256))
    slug = re.sub('[^a-z]+', '-', name.lower()).strip('-')
    fr[0].save(f'{out}/{slug}.gif', save_all=True, append_images=fr[1:] + [fr[-1]] * 12, duration=33, loop=0)
    rows.append((name, a[::3][:12], b[::3][:12]))
cw, ch = 150, 130
sheet = Image.new('RGB', (12 * cw, len(rows) * 2 * ch + len(rows) * 14), (20, 14, 12)); d = ImageDraw.Draw(sheet); y = 0
for name, a, b in rows:
    d.text((4, y + 1), name, fill=(240, 220, 150)); y += 14
    for r, seq in enumerate((a, b)):
        for k, im in enumerate(seq): sheet.paste(im.crop((75, 40, 225, 170)), (k * cw, y))
        y += ch
sheet.save(f'{out}/strips.png'); print(out, len(rows))
