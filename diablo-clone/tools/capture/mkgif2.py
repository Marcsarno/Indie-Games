# mkgif2.py out.gif label1 a.json label2 b.json [cropW cropH zoom] : side-by-side crops around the
# hero; frames of any resolution are brought to the larger one (nearest), so 1x and 2x compare at
# the same size, as a phone shows them
import json,sys,base64,io
from PIL import Image, ImageDraw
args=sys.argv[2:]; extra=[]
if len(args)%2==1 or (len(args)>4 and args[4].isdigit()): extra=args[4:]; args=args[:4]
cw,ch,z=(int(extra[0]),int(extra[1]),float(extra[2])) if extra else (200,170,2)
sets=[]
for i in range(0,len(args),2):
    d=json.load(open(args[i+1]))
    ims=[Image.open(io.BytesIO(base64.b64decode(u.split(',')[1]))).convert('RGB') for u in d['fr']]
    sets.append((args[i],ims))
big=max(s[1][0].width for s in sets)
out=[]; n=min(len(s[1]) for s in sets)
W2=int(cw*z); H2=int(ch*z)
for k in range(n):
    f=Image.new('RGB',(W2*len(sets)+8*(len(sets)-1),H2+18),(20,14,12)); dr=ImageDraw.Draw(f)
    for j,(lab,ims) in enumerate(sets):
        im=ims[k]
        if im.width!=big: im=im.resize((big, im.height*big//im.width), Image.NEAREST)
        cx,cy=im.width//2,int(im.height*0.47)
        c=im.crop((cx-cw//2*big//540*2//2*1, cy-ch*2//3, cx+cw//2, cy+ch//3)) if False else im.crop((cx-cw//2, cy-ch*2//3, cx+cw//2, cy+ch-ch*2//3))
        f.paste(c.resize((W2,H2),Image.NEAREST),(j*(W2+8),18)); dr.text((j*(W2+8)+6,3),lab,fill=(230,210,170))
    out.append(f.quantize(256))
out[0].save(sys.argv[1],save_all=True,append_images=out[1:],duration=33,loop=0)
print(sys.argv[1],n,out[0].size)
