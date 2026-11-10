# Copies tools/world/<region>.json into game/js/outdoor.js, between the markers
#   // @regions:begin ... // @regions:end   (one "REGIONS.<name> = {...};" line per region).
# python3 tools/world/embed-region.py ashford [more...]
import json, re, sys, os
here = os.path.dirname(os.path.abspath(__file__)); js = os.path.join(here, '../../game/js/outdoor.js'); s = open(js).read()
a, b = s.index('// @regions:begin'), s.index('// @regions:end')
block = s[a:b]; lines = {m.group(1): m.group(0) for m in re.finditer(r'^REGIONS\.(\w+) = .*$', block, re.M)}
for name in sys.argv[1:]:
    d = json.load(open(os.path.join(here, name + '.json')))
    for k in ('note', 'note2'): d.pop(k, None)
    lines[name] = f'REGIONS.{name} = ' + json.dumps(d, separators=(',', ':')) + ';'
open(js, 'w').write(s[:a] + '// @regions:begin (written by tools/world/embed-region.py from tools/world/<name>.json; edit those)\n' + '\n'.join(lines[k] for k in sorted(lines)) + '\n' + s[b:])
print('embedded', ', '.join(sys.argv[1:]))
