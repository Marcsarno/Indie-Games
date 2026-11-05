# clipstrip.py <in.json> <out.png> [every=3] : frames side by side, cropped round the hero (the detail canvas, 1:1)
import json,sys,base64,io
from PIL import Image
d=json.load(open(sys.argv[1])); every=int(sys.argv[3]) if len(sys.argv)>3 else 3
W,H=d['W'],d['H']; cx,cy=W//2+70,int(H*0.47)-10
ims=[Image.open(io.BytesIO(base64.b64decode(u.split(',')[1]))).convert('RGB').crop((cx-150,cy-130,cx+150,cy+90)) for u in d['fr'][::every]]
cols=6; rows=(len(ims)+cols-1)//cols; w,h=ims[0].size
out=Image.new('RGB',(cols*w+(cols-1)*4,rows*h+(rows-1)*4),(30,10,10))
for k,im in enumerate(ims): out.paste(im,((k%cols)*(w+4),(k//cols)*(h+4)))
out.save(sys.argv[2]); print(sys.argv[2],len(ims))
