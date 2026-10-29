"""Stitch per-view PNGs into one contact sheet.  python3 -I scripts/sheet.py out/<name> [cols]"""
import sys, glob, os
from PIL import Image, ImageDraw
base = sys.argv[1]; cols = int(sys.argv[2]) if len(sys.argv) > 2 else 3
order = ["game", "three_q", "front", "side", "back", "top"]
fs = [(v, f"{base}_{v}.png") for v in order if os.path.exists(f"{base}_{v}.png")]
ims = [Image.open(f).convert("RGB") for _, f in fs]; w, h = ims[0].size
rows = (len(ims) + cols - 1) // cols
sheet = Image.new("RGB", (w * cols, h * rows), (20, 20, 24)); d = ImageDraw.Draw(sheet)
for i, ((v, _), im) in enumerate(zip(fs, ims)):
    x, y = (i % cols) * w, (i // cols) * h; sheet.paste(im, (x, y)); d.text((x + 8, y + 6), v, fill=(255, 255, 255))
sheet.save(base + "_sheet.png"); print(base + "_sheet.png", sheet.size)
