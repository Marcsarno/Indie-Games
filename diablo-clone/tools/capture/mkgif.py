import json,sys,base64,io
from PIL import Image
# mkgif.py out.gif label1 a.json label2 b.json ... : side-by-side crops around the hero, 3x
args=sys.argv[2:]; sets=[]
for i in range(0,len(args),2):
    d=json.load(open(args[i+1])); W,H=d['W'],d['H']; cx,cy=W//2,int(H*0.47)
    ims=[Image.open(io.BytesIO(base64.b64decode(u.split(',')[1]))).convert('RGB').crop((cx-48,cy-60,cx+48,cy+24)) for u in d['fr']]
    sets.append((args[i],ims))
n=min(len(s[1]) for s in sets); Z=3; w=96*Z; h=84*Z
from PIL import ImageDraw
out=[]
for k in range(n):
    f=Image.new('RGB',(w*len(sets)+8*(len(sets)-1),h+18),(20,14,12)); dr=ImageDraw.Draw(f)
    for j,(lab,ims) in enumerate(sets):
        f.paste(ims[k].resize((w,h),Image.NEAREST),(j*(w+8),18)); dr.text((j*(w+8)+6,3),lab,fill=(230,210,170))
    out.append(f.quantize(256))
out[0].save(sys.argv[1],save_all=True,append_images=out[1:],duration=33,loop=0)
print(sys.argv[1],n)
