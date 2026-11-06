import json,sys
for l in sys.stdin:
  if not l.startswith('{'): print(l.strip()); continue
  r=json.loads(l); m=r.pop('marks'); print(r)
  st=[x for x in m if x[0].startswith('stuck')]; print('  stuck',len(st), st[:2])
  print('  ', ' | '.join(f"{x[0]} {x[1]}m L{x[2]}" for x in m if not x[0].startswith('stuck')))
