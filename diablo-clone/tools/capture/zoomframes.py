# zoomed run of frames of one label: python3 zoomframes.py in.json LABEL start n out.png [cw ch dy]
import json, sys, base64, io
from PIL import Image
d = json.load(open(sys.argv[1])); lab = sys.argv[2]; st, n = int(sys.argv[3]), int(sys.argv[4])
cw, ch, dy = (int(sys.argv[6]), int(sys.argv[7]), int(sys.argv[8])) if len(sys.argv) > 8 else (200, 150, -40)
us = [u for u, l in zip(d['fr'], d['labels']) if l == lab][st:st + n]
ims = [Image.open(io.BytesIO(base64.b64decode(u.split(',')[1]))).convert('RGB') for u in us]
W, H = ims[0].size; cx, cy = W // 2, int(H * 0.47) + dy
cols = min(5, len(ims)); rows = (len(ims) + cols - 1) // cols
o = Image.new('RGB', (cw * 2 * cols, ch * 2 * rows))
for i, im in enumerate(ims): o.paste(im.crop((cx - cw // 2, cy - ch // 2, cx + cw // 2, cy + ch // 2)).resize((cw * 2, ch * 2), Image.NEAREST), ((i % cols) * cw * 2, (i // cols) * ch * 2))
o.save(sys.argv[5])
