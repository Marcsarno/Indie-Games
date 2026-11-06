# floormap.py <before.json> <after.json> <out.png>: each floor's map, before over after, 6 px a tile
import json,sys
from PIL import Image, ImageDraw
C={'.':(150,120,90),',':(205,170,110),'#':(60,48,44),' ':(14,10,9),'p':(230,90,60),'o':(110,90,80),'X':(90,200,255),'S':(120,230,120)}
A=json.load(open(sys.argv[1])); B=json.load(open(sys.argv[2])); s=6
cols=[]
for a,b in zip(A,B):
  w=max(a['W'],b['W'])*s; h=(a['H']+b['H'])*s+40
  im=Image.new('RGB',(w,h),(14,10,9)); d=ImageDraw.Draw(im)
  for k,(m,y0,lab) in enumerate([(a,14,'BEFORE '+a['spec']),(b,a['H']*s+34,'NOW '+b['spec'])]):
    d.text((4,y0-12),lab,fill=(230,210,170))
    for j,r in enumerate(m['rows']):
      for i,c in enumerate(r): d.rectangle([i*s,y0+j*s,i*s+s-1,y0+j*s+s-1],fill=C[c])
  cols.append(im)
W=sum(c.width for c in cols)+10*(len(cols)-1); H=max(c.height for c in cols)
o=Image.new('RGB',(W,H),(30,22,18)); x=0
for c in cols: o.paste(c,(x,0)); x+=c.width+10
o.save(sys.argv[3]); print(sys.argv[3], o.size)
