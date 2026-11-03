# contact strips of a capture json, one row per label: python3 strips.py in.json out.png [every] [cw ch]
import json, sys, base64, io
from PIL import Image, ImageDraw
d = json.load(open(sys.argv[1])); every = int(sys.argv[3]) if len(sys.argv) > 3 else 2
cw, ch = (int(sys.argv[4]), int(sys.argv[5])) if len(sys.argv) > 5 else (320, 260)
rows = {}
for u, l in zip(d['fr'], d['labels']): rows.setdefault(l, []).append(u)
out = []
for l, us in rows.items():
    us = us[::every][:12]
    ims = [Image.open(io.BytesIO(base64.b64decode(u.split(',')[1]))).convert('RGB') for u in us]
    W, H = ims[0].size; cx, cy = W // 2, int(H * 0.47 * (H / H))
    row = Image.new('RGB', (cw * len(ims), ch + 14), (20, 14, 12)); dr = ImageDraw.Draw(row)
    for i, im in enumerate(ims): row.paste(im.crop((cx - cw // 2, cy - ch // 2 - 40, cx + cw // 2, cy + ch // 2 - 40)), (i * cw, 14))
    dr.text((4, 1), l, fill=(255, 220, 120)); out.append(row)
T = Image.new('RGB', (max(r.width for r in out), sum(r.height for r in out)), (0, 0, 0)); y = 0
for r in out: T.paste(r, (0, y)); y += r.height
T.save(sys.argv[2]); print(T.size)
