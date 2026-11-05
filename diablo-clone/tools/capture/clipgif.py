# clipgif.py <out.gif> label1 a.json [label2 b.json ...] : side by side, cropped round the hero, at 1:1 detail
import json,sys,base64,io
from PIL import Image, ImageDraw
args=sys.argv[2:]; sets=[]
for i in range(0,len(args),2):
    d=json.load(open(args[i+1])); W,H=d['W'],d['H']; cx,cy=W//2+70,int(H*0.47)-10
    sets.append((args[i],[Image.open(io.BytesIO(base64.b64decode(u.split(',')[1]))).convert('RGB').crop((cx-150,cy-130,cx+150,cy+90)) for u in d['fr']]))
n=min(len(s[1]) for s in sets); w,h=sets[0][1][0].size
out=[]
for k in range(n):
    f=Image.new('RGB',(w*len(sets)+6*(len(sets)-1),h+16),(20,14,12)); dr=ImageDraw.Draw(f)
    for j,(lab,ims) in enumerate(sets): f.paste(ims[k],(j*(w+6),16)); dr.text((j*(w+6)+6,2),lab,fill=(230,210,170))
    out.append(f.quantize(256))
out[0].save(sys.argv[1],save_all=True,append_images=out[1:],duration=50,loop=0); print(sys.argv[1],n)
