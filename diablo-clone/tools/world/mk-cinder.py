# The Cinderworks (Act II region 2) as layout data, from ChatGPT's region map (art/refs/act2/region2/region-map.png)
# and SPEC.md. Places in the map's own coordinates (x 0-100 across A-H, y 0-100 down rows 1-8), squeezed into the
# game's diamond as mk-ashford.py does: u = (x - 50) * 0.75, s = 12 + y * 0.76. Writes tools/world/cinder.json.
# No town: the region starts at its `start` clearing with the road `back` west to Ashford Vale; the way on (south,
# to the Broken Flank) is a flooded stretch of road that the sluice drains (gate kind 'flood', opens 'drained').
import json, os
U = lambda x: round((x - 50) * 0.75, 1); S = lambda y: round(12 + y * 0.76, 1)
def P(x, y): return [U(x), S(y)]
def cl(id, name, x, y, r, level, lvlTo=None, **k):
    d = {'id': id, 'name': name, 'u': U(x), 's': S(y), 'r': r, 'level': level}
    if lvlTo: d['lvlTo'] = lvlTo
    d.update(k); return d
def lm(name, x, y, **k): d = {'name': name, 'u': U(x), 's': S(y)}; d.update(k); return d
D = {
  'name': 'THE CINDERWORKS', 'act': 2, 'region': 2, 'size': 100, 'lvlShift': 3, 'start': 'landing', 'exit': 'southroad', 'back': P(1.5, 46), 'bridgeW': 1.3,
  'note': 'Coordinates (u, s) as in hollow.json. Made by mk-cinder.py from ChatGPT-map coordinates.',
  'clearings': [
    cl('landing', 'HAUL GATE LANDING', 7, 46, 4, 0),
    cl('oreyard', 'ORE YARD', 23, 46, 8, 8),
    cl('crane', 'CRANE SPUR', 29, 19, 5, 8),
    cl('wheel', 'SILENT WHEEL YARD', 41, 38, 8, 8, 9),
    cl('trail', 'CREW TRAIL', 65, 49, 5, 9),
    cl('forecourt', 'SILKSHAFT FORECOURT', 78, 44, 8, 9, 10),
    cl('furnaces', 'COLD FURNACES', 33, 70, 9, 9),
    cl('fordside', 'THE FORD', 45, 76, 4, 9),
    cl('glassway', 'GLASSVEIN BRANCH', 72, 19, 5, 9),
    cl('ashyard', 'ASH SORTING YARD', 76, 66, 8, 9, 10),
    cl('sluice', 'SOUTH SLUICE', 67, 87, 6, 10),
    cl('southroad', 'TO THE BROKEN FLANK', 84, 96, 4, 0),
  ],
  'roads': [
    {'from': 'landing', 'to': 'oreyard', 'w': 4, 'main': True},
    {'from': 'oreyard', 'via': [P(33, 43)], 'to': 'wheel', 'w': 3, 'main': True},
    {'from': 'oreyard', 'via': [P(26, 31)], 'to': 'crane', 'w': 2},
    {'from': 'oreyard', 'via': [P(37, 51), P(47, 51), P(55, 51)], 'to': 'trail', 'w': 4, 'main': True},
    {'from': 'trail', 'to': 'forecourt', 'w': 4, 'main': True},
    {'from': 'trail', 'via': [P(64, 59)], 'to': 'ashyard', 'w': 3},
    {'from': 'ashyard', 'via': [P(64, 72), P(55, 76)], 'to': 'fordside', 'w': 3},
    {'from': 'fordside', 'to': 'furnaces', 'w': 3},
    {'from': 'furnaces', 'via': [P(21, 62)], 'to': 'oreyard', 'w': 3},
    {'from': 'forecourt', 'via': [P(67, 31)], 'to': 'glassway', 'w': 2},
    {'from': 'ashyard', 'via': [P(68, 77)], 'to': 'sluice', 'w': 3, 'main': True},
    {'from': 'sluice', 'via': [P(77, 88)], 'to': 'southroad', 'w': 4, 'main': True},
  ],
  'water': [{'name': 'the works river', 'path': [P(57, -4), P(58, 18), P(55, 36), P(55, 51), P(54, 63), P(55, 76), P(53, 90), P(51, 104)], 'w': 5}],
  'cliffs': [
    {'name': 'silkshaft crags', 'path': [P(70, 30), P(82, 27), P(93, 31), P(96, 44)], 'w': 3},
    {'name': 'glassvein crags', 'path': [P(78, 10), P(92, 6), P(97, 18)], 'w': 2},
    {'name': 'east wall', 'path': [P(97, 52), P(96, 72), P(94, 86)], 'w': 2},
    {'name': 'south-west crags', 'path': [P(8, 78), P(20, 90), P(38, 95)], 'w': 3},
    {'name': 'north-west crags', 'path': [P(6, 24), P(16, 10), P(30, 6)], 'w': 2},
  ],
  'doors': [
    {'id': 'silkshaft', 'name': 'SILKSHAFT', 'u': U(81), 's': S(34), 'dungeon': 'caves', 'floors': 1, 'boss': 'broodmother', 'plain': True},
    {'id': 'glassvein', 'name': 'GLASSVEIN GROTTO', 'u': U(87), 's': S(9), 'dungeon': 'caves', 'floors': 1, 'plain': True},
  ],
  'gates': [
    {'id': 'flooded road', 'kind': 'flood', 'at': P(78, 90), 'opens': 'drained', 'pools': [[U(76), S(88), 3.4], [U(80), S(92), 3.2]]},
  ],
  'landmarks': [
    lm('the silent wheel', 45, 31, prop='waterwheel', id='wheel', extra=[['cabin', -3.4, 0.4, 3, 3], ['crate', -1.5, 3], ['barrel', 0.5, 3.5], ['crate', -5.5, 2]]),
    lm('ore yard shelter', 21, 40),
    lm('loading crane', 27, 15, prop='crane'),
    lm('kiln a', 27, 66, prop='kiln'), lm('kiln b', 33, 65, prop='kiln'), lm('kiln c', 39, 66, prop='kiln'),
    lm('ash kiln', 71, 63, prop='kiln', extra=[['cart', 3.5, 2, 2, 1], ['crate', -2, 2]]),
    lm('the south sluice', 66, 84, prop='sluice', propOn='sluiceon', on='drained', id='sluice'),
    lm('escape passage', 91, 39, prop='grate', id='grate'),
    lm('crew trail 1', 60, 50, prop='minerscrap'), lm('crew trail 2', 67, 46, prop='minerscrap'), lm('crew trail 3', 72, 47, prop='minerscrap'),
  ],
  'packs': [
    {'at': 'oreyard', 'id': 'shaleripper', 'n': 1, 'count': 1, 'exact': True},
    {'at': 'crane', 'id': 'digger', 'n': 2, 'count': 1},
    {'at': 'wheel', 'id': 'brigand', 'n': 2, 'count': 1},
    {'at': 'wheel', 'id': 'rusk', 'n': 1, 'count': 1, 'exact': True, 'with': ['brigand', 'mastiff'], 'u': U(41), 's': S(35)},
    {'at': 'trail', 'id': 'spider', 'n': 3, 'count': 1},
    {'at': 'forecourt', 'id': 'spider', 'n': 3, 'count': 2},
    {'at': 'furnaces', 'id': 'cinderhusk', 'n': 1, 'count': 1, 'exact': True},
    {'at': 'furnaces', 'id': 'digger', 'n': 3, 'count': 1},
    {'at': 'fordside', 'id': 'digger', 'n': 2, 'count': 1},
    {'at': 'glassway', 'id': 'slime', 'n': 3, 'count': 1, 'with': 'sporecap'},
    {'at': 'ashyard', 'id': 'shaleripper', 'n': 1, 'count': 1, 'exact': True},
    {'at': 'ashyard', 'id': 'digger', 'n': 2, 'count': 1},
    {'at': 'sluice', 'id': 'cinderhusk', 'n': 1, 'count': 1, 'exact': True},
    {'at': 'sluice', 'id': 'fallen', 'n': 2, 'count': 1},
  ],
  'caches': [
    {'name': 'crane cache', 'u': U(31), 's': S(16)},
    {'name': 'survey cache', 'u': U(68), 's': S(16)},
    {'name': 'ash cache', 'u': U(92), 's': S(61)},
  ],
  'woodsFringe': 6, 'roadFringe': 4, 'gridRows': 8,
}
json.dump(D, open(os.path.join(os.path.dirname(__file__), 'cinder.json'), 'w'), indent=1); print('cinder.json')
