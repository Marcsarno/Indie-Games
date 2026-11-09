# Ashford Vale (Act II region 1) as layout data, from ChatGPT's region map (art/refs/act2/region1/region-map.png).
# Places are given in ChatGPT's map coordinates (x 0-100 across, A-H; y 0-100 down, rows 1-8; a cell = 12.5)
# and squeezed into the game's diamond (100x100 tiles seen from above is a diamond on screen):
#   u = (x - 50) * 0.75,  s = 12 + y * 0.76.  Writes tools/world/ashford.json.
import json, os
U = lambda x: round((x - 50) * 0.75, 1); S = lambda y: round(12 + y * 0.76, 1)
def P(x, y): return [U(x), S(y)]
def cl(id, name, x, y, r, level, lvlTo=None, **k):
    d = {'id': id, 'name': name, 'u': U(x), 's': S(y), 'r': r, 'level': level}
    if lvlTo: d['lvlTo'] = lvlTo
    d.update(k); return d
D = {
  'name': 'ASHFORD VALE', 'act': 2, 'region': 1, 'size': 100,
  'note': 'Coordinates (u, s) as in hollow.json: u east(+)/west(-) across the screen, s north(0) to south(100) down it. Tile i = s + u, j = s - u. Made by mk-ashford.py from ChatGPT-map coordinates.',
  'clearings': [
    cl('arrival', 'FROM ACT I', 40, 3, 4, 0),
    cl('town', 'ASHFORD', 24, 48, 10, 0, kind='camp'),
    cl('cartway', 'CARTWAY', 55, 48, 8, 7),
    cl('pityard', 'RESCUE PIT YARD', 66, 26, 8, 7, 8),
    cl('rennyard', "RENN'S YARD", 77, 61, 7, 8),
    cl('haul', 'HAUL GATE', 95, 45, 4, 8),
    cl('copse', 'CHARCOAL COPSE', 62, 80, 8, 7, 8),
    cl('graveroad', 'GRAVE ROAD', 42, 72, 6, 7),
    cl('forecourt', 'BLACKWAKE', 27, 80, 6, 11, 12, danger=True),
    cl('oak', 'HOLLOW OAK', 84, 76, 5, 8),
  ],
  'roads': [
    {'from': 'arrival', 'via': [P(30, 20)], 'to': 'town', 'w': 3, 'main': True},
    {'from': 'town', 'via': [P(42, 44)], 'to': 'cartway', 'w': 4, 'main': True},
    {'from': 'cartway', 'via': [P(56, 32)], 'to': 'pityard', 'w': 3, 'main': True},
    {'from': 'pityard', 'via': [P(76, 38)], 'to': 'rennyard', 'w': 3},
    {'from': 'cartway', 'via': [P(68, 50)], 'to': 'rennyard', 'w': 4, 'main': True},
    {'from': 'rennyard', 'via': [P(88, 48)], 'to': 'haul', 'w': 4, 'main': True},
    {'from': 'cartway', 'via': [P(50, 64)], 'to': 'copse', 'w': 3},
    {'from': 'copse', 'via': [P(76, 66)], 'to': 'rennyard', 'w': 2},
    {'from': 'cartway', 'via': [P(50, 64)], 'to': 'graveroad', 'w': 2},
    {'from': 'graveroad', 'to': 'forecourt', 'w': 2},
    {'from': 'copse', 'to': 'oak', 'w': 1},
  ],
  'water': [],
  'cliffs': [
    {'name': 'north crags', 'path': [P(58, 10), P(74, 6), P(86, 14), P(90, 30)], 'w': 3},
    {'name': 'haul gate cliffs south', 'path': [P(94, 54), P(92, 66), P(94, 80)], 'w': 3},
    {'name': 'tomb crags', 'path': [P(14, 74), P(18, 88)], 'w': 2},
  ],
  'doors': [
    {'id': 'rescuepit', 'name': 'RESCUE PIT', 'u': U(70), 's': S(14), 'dungeon': 'caves', 'floors': 1, 'boss': 'oenforcer', 'labelUp': True,
     'note': 'mine-works caves; the Pit Enforcer (ogre enforcer); Renn and two miners behind a barricade'},
    {'id': 'blackwake', 'name': 'BLACKWAKE TOMB', 'u': U(24), 's': S(88), 'dungeon': 'crypt', 'floors': 1, 'level': 11, 'danger': True,
     'note': 'DANGER LV 11-12 sign; elite tomb guard + two crossbowmen; burial ledger, a rare'},
  ],
  'gates': [
    {'id': 'haulgate', 'label': 'Haul Gate (opens when Renn is free)', 'at': P(92, 45), 'opens': 'rennFree',
     'note': 'timber gate between cliffs, windlass, mining banner; Renn waits here after the rescue'},
  ],
  'landmarks': [
    {'name': 'town bell', 'u': U(24), 's': S(48)},
    {'name': 'timber shelter', 'u': U(56), 's': S(24)},
    {'name': 'charcoal kiln', 'u': U(66), 's': S(86)},
    {'name': 'giant hollow oak', 'u': U(90), 's': S(70)},
    {'name': 'DANGER posts', 'u': U(36), 's': S(74)},
    {'name': 'dropped helmet', 'u': U(34), 's': S(14)},
  ],
  'packs': [
    {'at': 'cartway', 'id': 'wolf', 'n': 3, 'count': 1}, {'at': 'cartway', 'id': 'goblin', 'n': 3, 'count': 1},
    {'at': 'pityard', 'id': 'digger', 'n': 3, 'count': 2},
    {'at': 'rennyard', 'id': 'goblin', 'n': 3, 'count': 1, 'with': 'gshaman'},
    {'at': 'copse', 'id': 'boar', 'n': 2, 'count': 1}, {'at': 'copse', 'id': 'goblin', 'n': 3, 'count': 1},
    {'at': 'graveroad', 'id': 'wolf', 'n': 3, 'count': 1},
    {'at': 'forecourt', 'id': 'tombguard', 'n': 1, 'count': 1}, {'at': 'forecourt', 'id': 'gravebow', 'n': 1, 'count': 1},
    {'at': 'oak', 'id': 'goblin', 'n': 2, 'count': 1},
  ],
  'caches': [
    {'name': 'lost satchel', 'u': U(57), 's': S(20)},
    {'name': "Tamsin's ore", 'u': U(82), 's': S(65)},
    {'name': 'memorial offering', 'u': U(45), 's': S(84)},
    {'name': 'hollow oak cache', 'u': U(87), 's': S(80)},
  ],
  'town': {'r': 10, 'gates': [{'name': 'north gate (from Act I)', 'du': -2, 'ds': -9.5}, {'name': 'east gate (to the Cartway)', 'du': 9.5, 'ds': -1}],
    'stations': [
      {'who': 'MARA VENN', 'role': 'reeve, quests', 'du': -1.6, 'ds': 0.2, 'prop': 'the bell (centre)', 'pdu': 0, 'pds': 0},
      {'who': 'TAMSIN FLINT', 'role': 'smith', 'du': -5.2, 'ds': 0.4, 'prop': 'forge + anvil', 'pdu': -7, 'pds': -0.6},
      {'who': 'BRAM TOLL', 'role': 'merchant', 'du': -5, 'ds': 4.4, 'prop': 'wagon stall', 'pdu': -6.6, 'pds': 4},
      {'who': 'NELLA REED', 'role': 'potions', 'du': 2.6, 'ds': -4.2, 'prop': 'potion counter', 'pdu': 3.8, 'pds': -4.4},
      {'who': 'SISTER EDDA', 'role': 'keeper of the dead', 'du': 5, 'ds': 4.2, 'prop': 'memorial stone', 'pdu': 6.2, 'pds': 4},
      {'who': 'RENN PIKE', 'role': 'foreman (after the rescue)', 'du': -3.6, 'ds': -4.4, 'prop': 'mine-office desk + map', 'pdu': -4.4, 'pds': -5},
    ],
    'props': [{'name': 'well', 'du': 2.2, 'ds': 1.4}, {'name': 'houses (scenery, round the square)', 'du': 0, 'ds': 8}]},
  'woodsFringe': 6, 'roadFringe': 4, 'gridRows': 8,
  'note2': 'As the Hollow: walkable = clearings + open woods near them and the roads; thick forest (pines) is the wall. The town is a palisade with a north gate (arrival) and an east gate (Cartway).',
}
json.dump(D, open(os.path.join(os.path.dirname(__file__), 'ashford.json'), 'w'), indent=1); print('ashford.json')
