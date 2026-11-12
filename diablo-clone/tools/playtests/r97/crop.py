import sys, json, glob, os
from PIL import Image
d = sys.argv[1]; names = sys.argv[2].split(',')
ims = []
for n in names:
    im = Image.open(f'{d}/{n}.png'); x, y = json.load(open(f'{d}/{n}.json')); k = im.width // 270
    box = (max(0, (x - 90) * k), max(0, (y - 140) * k), min(im.width, (x + 130) * k), min(im.height, (y + 50) * k))
    ims.append(im.crop(box).resize(((box[2]-box[0]), (box[3]-box[1]))))
w = max(i.width for i in ims); h = max(i.height for i in ims); cols = int(sys.argv[3]) if len(sys.argv) > 3 else 3
S = Image.new('RGB', (w * cols, h * ((len(ims) + cols - 1) // cols)))
for i, im in enumerate(ims): S.paste(im, ((i % cols) * w, (i // cols) * h))
S.save(f'{d}/' + (sys.argv[4] if len(sys.argv) > 4 else 'crops.png')); print(S.size)
