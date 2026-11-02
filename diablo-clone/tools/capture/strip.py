import json,sys,base64,io
from PIL import Image
# strip.py out.png start count a.json b.json ...
out,st,cnt=sys.argv[1],int(sys.argv[2]),int(sys.argv[3]); rows=[]
for fn in sys.argv[4:]:
    d=json.load(open(fn)); W,H=d['W'],d['H']; cx,cy=W//2,int(H*0.47)
    rows.append([Image.open(io.BytesIO(base64.b64decode(u.split(',')[1]))).convert('RGB').crop((cx-30,cy-50,cx+30,cy+14)) for u in d['fr'][st:st+cnt]])
Z=3; o=Image.new('RGB',(cnt*62*Z,len(rows)*66*Z),(0,0,0))
for r,ims in enumerate(rows):
    for k,im in enumerate(ims): o.paste(im.resize((60*Z,64*Z),Image.NEAREST),(k*62*Z,r*66*Z))
o.save(out)
