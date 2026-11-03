import math
def canvas(w=38,h=38): return [[' ']*w for _ in range(h)]
def rect(g,x0,y0,x1,y1,c='.'):
    for y in range(y0,y1+1):
        for x in range(x0,x1+1): g[y][x]=c
def blob(g,cx,cy,rx,ry,c='.'):
    for y in range(len(g)):
        for x in range(len(g[0])):
            if ((x-cx)/rx)**2+((y-cy)/ry)**2<=1: g[y][x]=c
def put(g,x,y,c): g[y][x]=c
def show(name,g):
    rows=[''.join(r).rstrip() for r in g]
    while rows and not rows[-1]: rows.pop()
    print(name); print('\n'.join(rows)); print()
    return rows
out={}
# ---- THE KING'S HALL (crypt): antechamber -> corridor -> pillared throne hall -> stairs behind the throne
g=canvas()
rect(g,24,27,31,33)                 # antechamber
rect(g,26,21,27,26)                 # corridor up into the hall
rect(g,10,6,31,20)                  # throne hall
rect(g,8,12,9,13)                   # passage behind the throne
rect(g,3,10,7,15)                   # stairs room
put(g,27,30,'S')
for (x,y) in [(24,28),(24,32)]: put(g,x,y,'c')      # coffins
for (x,y) in [(31,28),(31,32)]: put(g,x,y,'n')      # candle tables
for x in (14,18,22,26,30):
    put(g,x,9,'p'); put(g,x,17,'p')                 # two rows of pillars down the hall
put(g,13,13,'B')                                     # the throne: the king
put(g,11,10,'t'); put(g,11,16,'t')                   # statues flanking the throne
put(g,15,11,'b'); put(g,15,15,'b')                   # braziers before the throne
for (x,y) in [(20,11),(20,15)]: put(g,x,y,'k')      # guards
for (x,y) in [(28,7),(28,19)]: put(g,x,y,'a')       # archers at the far corners
for (x,y) in [(17,13),(23,12),(25,15),(19,7),(12,19)]: put(g,x,y,'x')   # bones
for (x,y) in [(16,13),(22,14),(27,24)]: put(g,x,y,'d')                 # blood
put(g,5,13,'X'); put(g,4,11,'C')
out['king']=show('KING',g)
# ---- THE BROOD NEST (caves): a cave mouth, a winding tunnel, a great round nest, the way down behind it
g=canvas()
blob(g,28,29,4.5,4)                  # cave mouth (start)
for t in range(0,13):                # winding tunnel
    x=int(round(27-t*0.6+math.sin(t*0.7)*2)); y=24-t
    rect(g,x-1,y,x+1,y)
blob(g,17,9,8.5,7.5)                 # the nest
rect(g,8,7,9,8); blob(g,5,7,2.6,2.6) # passage + stairs pocket
put(g,28,30,'S')
put(g,17,8,'B')
for k in range(8):                   # egg sacs round the nest
    a=k/8*6.283; put(g,int(round(17+math.cos(a)*5.5)),int(round(9+math.sin(a)*4.6)),'e')
for (x,y) in [(12,4),(22,4),(24,12),(11,13),(19,15)]: put(g,x,y,'g')   # stalagmites
for (x,y) in [(26,26),(30,31),(25,20),(23,17),(14,10),(20,12)]: put(g,x,y,'m')   # glowing fungus
for (x,y) in [(15,12),(21,6)]: put(g,x,y,'x')
for (x,y) in [(13,6),(21,11),(27,28),(29,23)]: put(g,x,y,'b')   # braziers: the nest is dark
put(g,5,7,'X'); put(g,4,6,'C')
out['nest']=show('NEST',g)
# ---- THE SANCTUM (hell): a gate hall, a long causeway over lava, a round ritual floor, the stair behind
g=canvas()
rect(g,26,28,33,34)                  # gate hall
rect(g,28,13,30,27); rect(g,24,11,30,13)   # causeway, joining the ritual floor
blob(g,18,11,9,8)                    # ritual floor
rect(g,7,10,9,12); rect(g,3,9,6,13)  # passage, stairs room
put(g,30,31,'S')
for x,y in [(28,18),(30,22),(28,26)]: put(g,x,y,'l')       # lava cracks along the causeway
for k in range(4):
    a=k/4*6.283+0.785; put(g,int(round(18+math.cos(a)*6)),int(round(11+math.sin(a)*5.2)),'b')   # braziers
    a2=k/4*6.283; put(g,int(round(18+math.cos(a2)*7.6)),int(round(11+math.sin(a2)*6.4)),'t')  # statues
put(g,18,11,'B')
for (x,y) in [(14,8),(22,14),(15,15),(21,7)]: put(g,x,y,'o')    # bone piles
for (x,y) in [(13,11),(23,11)]: put(g,x,y,'k')
for (x,y) in [(18,5),(18,17)]: put(g,x,y,'a')
put(g,4,11,'X'); put(g,5,9,'C')
out['sanctum']=show('SANCTUM',g)
import json; json.dump(out,open('arenas.json','w'))
