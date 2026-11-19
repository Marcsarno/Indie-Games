import sys,json
for l in sys.stdin:
  l=l.strip()
  if l.startswith('{') or l.startswith('END'):
    end=l.startswith('END'); d=json.loads(l[4:] if end else l)
    print(('END ' if end else '')+'t=%d lvl=%d kills=%d hp=%d/%d foes=%d king=%s gold=%s won=%s w=%s mods=%s'%(d['t'],d['lvl'],d['kills'],d['hp'],d['max'],d['foes'],d.get('king'),d.get('gold'),d.get('won'),d['w'],d['mods']))
  elif l: print(l[:300])
