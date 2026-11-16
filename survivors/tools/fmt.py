import sys,json
for l in sys.stdin:
  l=l.strip()
  if l.startswith('{') or l.startswith('END'):
    end=l.startswith('END'); d=json.loads(l[4:] if end else l)
    print(('END ' if end else '')+'t=%d lvl=%d kills=%d hp=%d/%d foes=%d fps=%d ms=%.0f w=%s mods=%s pas=%s'%(d['t'],d['lvl'],d['kills'],d['hp'],d['max'],d['foes'],d['fps'],d['ms'],d['w'],d['mods'],d['pas']))
  elif l: print(l[:300])
