"""Round 39: sample every drivable road centre-line from graph.json and report static colliders sitting on the road surface (should be none)."""
import json, math
G = json.load(open('../viewer/worlds/cc/graph.json')); C = json.load(open('../viewer/worlds/cc/colliders.json'))
boxes = [c for c in C if c['t'] == 'box' and 'car' not in c and c['w'] < 400 and c['d'] < 400]; circ = [c for c in C if c['t'] == 'circle' and not c.get('soft')]
grid = {}
for i, b in enumerate(boxes): grid.setdefault((int(b['x'] // 50), int(b['y'] // 50)), []).append(('b', b))
for c in circ: grid.setdefault((int(c['x'] // 50), int(c['y'] // 50)), []).append(('c', c))
bad = {}
for e in G['edges']:
    lane = e['lane'] * .9
    for (x, y) in e['pts']:
        for (dx_, dy_) in ((0, 0),):
            k = (int(x // 50), int(y // 50))
            for i in (-1, 0, 1):
                for j in (-1, 0, 1):
                    for t, o in grid.get((k[0] + i, k[1] + j), []):
                        if t == 'b':
                            dx, dy = x - o['x'], y - o['y']; a = math.radians(o.get('rz', 0)); u = dx * math.cos(a) + dy * math.sin(a); v = -dx * math.sin(a) + dy * math.cos(a)
                            if abs(u) < o['w'] / 2 + .3 and abs(v) < o['d'] / 2 + .3: bad[(round(o['x']), round(o['y']), o['w'], o['d'])] = (round(x), round(y), e.get('road', ''))
                        elif math.hypot(x - o['x'], y - o['y']) < o['r'] + .3: bad[('c', round(o['x']), round(o['y']))] = (round(x), round(y), e.get('road', ''))
print(len(bad), 'colliders on road centre-lines')
for k, v in list(bad.items())[:25]: print(k, '@', v)
