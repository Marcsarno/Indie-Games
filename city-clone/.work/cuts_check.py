"""Round 39: check every planned detour (layout.json cuts) against the exported colliders: prints OK or the first blocking colliders. Run from city-clone/."""
import json, math
L = json.load(open('plan/v7/layout.json')); C = json.load(open('viewer/worlds/cc/colliders.json'))
boxes = [c for c in C if c['t'] == 'box' and 'car' not in c]; circ = [c for c in C if c['t'] == 'circle']
def hit(x, y):
    for b in boxes:
        dx, dy = x - b['x'], y - b['y']
        if abs(dx) > 60 or abs(dy) > 60: continue
        a = math.radians(b.get('rz', 0)); u = dx * math.cos(a) + dy * math.sin(a); v = -dx * math.sin(a) + dy * math.cos(a)
        if abs(u) < b['w'] / 2 + .9 and abs(v) < b['d'] / 2 + .9: return ('box', round(b['x']), round(b['y']), b['w'], b['d'])
    for c in circ:
        if math.hypot(x - c['x'], y - c['y']) < c['r'] + .9 and not c.get('soft'): return ('circ', round(c['x']), round(c['y']))
for cut in L['cuts']:
    pts = cut['pts']; bad = []
    for a, b in zip(pts, pts[1:]):
        n = int(math.dist(a, b) / 2)
        for i in range(n + 1):
            x = a[0] + (b[0] - a[0]) * i / max(1, n); y = a[1] + (b[1] - a[1]) * i / max(1, n); h = hit(x, y)
            if h and (not bad or bad[-1][1] != h): bad.append(((round(x), round(y)), h))
    print(cut['label'], 'OK' if not bad else bad[:4])
