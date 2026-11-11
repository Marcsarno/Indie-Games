'use strict';
// Round 89: the table. The story is told the way it is played: Dave the Dungeon Master and his
// three players (Marc, Aaron, Chris) at a table under a lamp, and the game itself is the map in
// the middle of that table. A cinematic is a script of lines over that scene; it ends with the
// camera pushing into the map until the map is the whole screen, and that is the game, running.
// All of it is drawn here, in the game's palette: the room once into a buffer, the people each
// frame (blinking, talking), and one pass that scales the scene to the screen and puts the live
// game picture where the map is.

// ---------------------------------------------------------------- the four people
// Their faces are the user's four portraits, as pixel grids (one letter a colour, see `key`).
// eyes: the cells that close in a blink; talk: the cells that change when the mouth opens.
const CINE_PEOPLE = {
  dave: { name: 'DAVE', col: 51, cell: 2, key: { '.': 0, '#': 1, 's': 63, 'd': 62, 'h': 34, 'H': 33, 'b': 31 },
    eyes: [[15, 17, 's'], [15, 18, 's'], [16, 23, 'd']],
    talk: [[22, 18, '#'], [22, 19, '#'], [22, 20, '#'], [22, 21, '#'], [23, 18, 'H'], [23, 19, 'H'], [23, 20, 'H'], [23, 21, 'H']],
    rows: [
      '.....................................',
      '..................######.............',
      '...............####hhhhh###..........',
      '..............##hhhhhhhhhh##.........',
      '...........###hhhhhhhhhhhhh##........',
      '..........##hhhhhhhhhhhhhhhh#........',
      '.........##hhhhhhhhhhhhhhhhh##.......',
      '.........#hhhhhhssshhhhhhhhhh#.......',
      '........##hhhhhssssssssshhhhh##......',
      '........#hhhhhsssssssssssshhhh#......',
      '........#hhhhhssssssssssssdhh##......',
      '........#hhhhhssssssssssssshh#.......',
      '........#hhhhsssssssssssssshh#.......',
      '.......###hhhsss####ssssssshh#.......',
      '.......##shhhss#sssssssHHHsh##.......',
      '.......#ssshhssss##sssddddHh#........',
      '.......#sdshhssssHssssd#ddd##........',
      '.......#sdssssssssssssddddd##........',
      '.......#ssdssssssssss#dddddd#........',
      '......##sssssssssss###ddddds#........',
      '......#sssssssssssssssdddddss#.......',
      '.....##ssssssssssHHHHHHddddss#.......',
      '.....#sssssssssssshHHHddddsss#.......',
      '.....#ssssssssssssssssdddddss#.......',
      '.....#sdssssssssssssssddddds##.......',
      '.....##sddsssssssssssdddddd##........',
      '......##sdddddssssssddddddd#.........',
      '.......##ssdddddddddddddss##.........',
      '....#####sssssssssssssdds####........',
      '..###bbb##ssssssssssddd##bbb###......',
      '.##bbbbbb###sssssssd###bbbbbbb###....',
      '##bbbbbbbbb#########bbbb#bbbbbbbb##..',
      '#bbbbbbbbbb#bbbbb#bbbbbb#bbbbbbbbb##.',
      '#bbbbbbbbbbb#bbb##bbbbb#bbbbbbbbbbb#.',
      '#bbbbbbbbbbbb###bbb####bbbbbbbbbbbb#.',
      '#bbbbbbbbbbbbbbbbb#bbbbbbbbbbbbbbbb#.',
      '####################################.',
    ] },
  marc: { name: 'MARC', col: 40, cell: 2, key: { '.': 0, '#': 1, 's': 63, 'd': 62, 'k': 33, 'w': 27, 'b': 39 },
    eyes: [[13, 18, 's'], [14, 25, 's']],
    talk: [[21, 19, '#'], [21, 20, '#'], [21, 21, '#'], [21, 22, '#'], [21, 23, '#']],
    rows: [
      '......................................',
      '.................######...............',
      '..............###ssssss##.............',
      '.............#dsssssssss##............',
      '............#dddssssssssss#...........',
      '...........#dddssssssssssss#..........',
      '..........#dddsssssssssssss#..........',
      '..........#ddsssssssssssssss#.........',
      '.........#dddsssssssssssssss#.........',
      '.........#dddssskkkkssssssss#.........',
      '.........#dddsskkkkkkkssssss#.........',
      '........###dddskssskkksskkkss#........',
      '.......#sss#ddssssssssskkkkks#........',
      '.......#sdd#dsssss#ssssssksss#........',
      '.......#sdskdsssssssss#ss#ss#.........',
      '.......#sdskdsssssssss#sssss#.........',
      '.......#ssskkssssssssss#ssss#.........',
      '........#sskksssskkkssssssss#.........',
      '.........##kkksskkkkkkkkksss#.........',
      '.........#skkksskkwwkkkkkkss#.........',
      '.........#skkkkkkkwwwwwwkkss#.........',
      '.........#skkkkkkkkwwwwwkks##.........',
      '........##skkkkkkkskkkkkkkk#..........',
      '......####sskkkkkkkssssskkk#..........',
      '....##bb#sssdkkkkkkkkkkkkkk#..........',
      '...#bbbb#sssddkkkkkkkkkkkk#...........',
      '...#bbbb###ssddkkkkkkkkkk#............',
      '...#bbbbbb##sdddkkkkkkkk##............',
      '...#bbbbbbb###ddddkkkkkk#b#...........',
      '..#####bbbbbb##ddddddd##bb#...........',
      '.##bbb####bbbbb##ddddd#bbb###.........',
      '.#bbbbbbb###bbbb###dd#bbbb#b###.......',
      '##bbbbbbbbb####bbb###bbb##bbbb###.....',
      '#bbbbbbbbbbbbb###bbbbb###bbbbbbb##....',
      '#bbbbbbbbbbbbbbkkbbbbbbkkbbbbbbbb#....',
      '#bbbbbbbbbbbbbbkkbbbbbbkkbbbbbbbb##...',
      '#bbbbbbbbbbbbbbkkbbbbbbkkbbbbbbbbb##..',
      '#bbbbbbbbbbbbbbkkbbbbbbkkbbbbbbbbbb#..',
      '#bbbbbbbbbbbbbbkkbbbbbbkkbbbbbbbbbb#..',
    ] },
  aaron: { name: 'AARON', col: 32, cell: 2, key: { '.': 0, '#': 1, 's': 63, 'd': 62, 'g': 31, 'G': 24, 'H': 33, 'n': 126 },
    eyes: [[15, 19, 's'], [15, 25, 's'], [15, 26, 's']],
    talk: [[22, 20, 'H'], [22, 21, 'H'], [22, 22, 'H'], [22, 23, 'H'], [22, 24, 'H']],
    rows: [
      '...........................................',
      '.................#########.................',
      '...............###ggggggg###...............',
      '..............##ggggggggggg##..............',
      '.............#gggggggggggggg##.............',
      '............##gggGGGggggggggg#.............',
      '............#ggGGGGGGGggggggg##............',
      '............#gGGGGGGGGGGgggggg#............',
      '...........##gGGGsssGGGGGGGGgg#............',
      '...........#gggGsssssGGGGGGGGg#............',
      '...........#gggGssssssssGGGGGg#............',
      '...........#ggGGGsssssssssssGg#............',
      '...........#gGGGsssssssssssssg#............',
      '...........##GGss####ssss###sg#............',
      '..........#sssGssssssss##ssss#s#...........',
      '..........#ssdGssss#sssss##ssds#...........',
      '..........#ssddssssssssHssssdss#...........',
      '..........##ssddsssssssHssssds##...........',
      '...........#ssddsssssHHHssssds#............',
      '...........##sdddsssssssssssd##............',
      '............##dddsssssssssssd#.............',
      '.............#sddssHHHHHHHssd#.............',
      '.............#sddssssdddssssd#.............',
      '.............#sdddssssssssss#n.............',
      '.............#ssdddssssssssH#..............',
      '.............#ssddddssssssHs#..............',
      '............##sssdddHHHHHHHs#..............',
      '..........###sssssddddddddss##.............',
      '.........##nn#ssssddddddddss#n##...........',
      '.......###nnn##sssssdddddsss#nnn##.........',
      '.....###nnnnnn###sssddddsss##nnnn###.......',
      '....##nnnnnnnnnn###ssssss###nnnnnnn###.....',
      '...##nnnnnnnnnnnnn########nnnnnnnnnnn##....',
      '..##nnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn##...',
      '..#nnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn#...',
      '..#nnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn##..',
      '.##nnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn#..',
      '.#nnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn#..',
      '.#nnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn##.',
      '.#nnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn#.',
      '.#######nnnnnnnnnnnnnnnnnnnnnnnnnnn#######.',
      '.#sssss##nnnnnnnnnnnnnnnnnnnnnnnnn##sssss#.',
      '.#ssssss#nnnnnnnnnnnnnnnnnnnnnnnnn#ssssss#.',
      '.#########################################.',
    ] },
  chris: { name: 'CHRIS', col: 27, cell: 2, key: { '.': 0, '#': 1, 's': 63, 'd': 62, 'h': 35, 'H': 33, 'w': 27, 'v': 65 },
    eyes: [[13, 19, 's'], [13, 20, 's'], [14, 19, 's'], [15, 12, 's'], [15, 13, 's']],
    talk: [[23, 15, '#'], [23, 16, '#'], [23, 17, '#'], [23, 18, '#'], [23, 19, '#']],
    rows: [
      '......................................',
      '..............#######.................',
      '............##hhhhhhh##...............',
      '..........##hhhhhhhhhhh#..............',
      '.........#hhhhhhhhhhhhhh#.............',
      '........#hhhhhhhhhhhhhhh#.............',
      '........#hhhhhhhhhhssshh#.............',
      '........#hhhhhhssssssshhh#............',
      '.......#hhhhssssssssssshh#............',
      '.......#hhssssssssssssshh#............',
      '.......#hsssssssssssssssh#............',
      '......#hhssssssssssssssshh#...........',
      '......#hssssssssssHHHHsssh##..........',
      '......#hsssHHHHssss##sssshss#.........',
      '.......#ssHssssssss#ssssssds#.........',
      '.......#ssss##ssssssssssssds#.........',
      '......###sssHssssssssssssdds#.........',
      '......#sssssssss#ssssssssdss#.........',
      '......#sdsssssss##sssssssds#..........',
      '......#sddsssssssssss#sssd##..........',
      '......#ssdssssss######sssd#...........',
      '.......#sdsss###wwwww#sssd#...........',
      '.......#sdsss#wwwwwww#ssdd#...........',
      '........##ssss#wwwww#sssdd#...........',
      '.........#ssss######ssssdd#...........',
      '.........##sssssssssssssdss#..........',
      '..........#ssssssssssssddss#..........',
      '..........##dsssssssssddsss##.........',
      '...........#sdssssssdddssss#w#........',
      '...........##sddddddddssss#ww#........',
      '.........###w#sdddddddsss#www###......',
      '.......##vv#ww#dddddssss#wwww#vv###...',
      '.....##vvvv#www#sssssss#wwww#vvvvvv##.',
      '...##vvvvvv#wwww#ssss##wwwww#vvvvvvv##',
      '.###vvvvvvvv#wwww####wwwwww#vvvvvvvv#w',
      '#ww#vvvvvvvv#www#vvvv#wwwww#vvvvvvvv#w',
      'www#vvvvvvvvv#ww#vvvv#wwww#vvvvvvvvv#w',
      'www#vvvvvvvvv#w##vvvv##www#vvvvvvvvv#w',
      'www#vvvvvvvvvv#ww#vv#ww#w#vvvvvvvvvv#w',
      'www#vvvvvvvvvv#ww#vv#www##vvvvvvvvvv#w',
    ] },
};
for (const id in CINE_PEOPLE) {
  const P = CINE_PEOPLE[id]; P.w = P.rows[0].length; P.h = P.rows.length;
  P.g = new Uint8Array(P.w * P.h); P.rows.forEach((r, j) => { for (let i = 0; i < P.w; i++) P.g[j * P.w + i] = P.key[r[i]]; });
  P.blinkM = new Map(P.eyes.map(([r, c, ch]) => [r * P.w + c, P.key[ch]]));
  P.talkM = new Map(P.talk.map(([r, c, ch]) => [r * P.w + c, P.key[ch]]));
}
// Dave's shoulders join a much wider body: their outer outline becomes shirt
{ const P = CINE_PEOPLE.dave, B = P.gBody = P.g.slice();
  for (let j = 31; j < P.h; j++) { let a = 0; while (a < P.w && B[j * P.w + a] === 0) a++; let b = P.w - 1; while (b > 0 && B[j * P.w + b] === 0) b--;
    for (let i = a; i < P.w && B[j * P.w + i] === BLK; i++) B[j * P.w + i] = P.key.b; for (let i = b; i > 0 && B[j * P.w + i] === BLK; i--) B[j * P.w + i] = P.key.b; } }
// who plays which hero
const PLAYER_OF = { warrior: 'marc', mage: 'aaron', ranger: 'chris' };
const CLASS_WORD = { warrior: 'WARRIOR', mage: 'MAGE', ranger: 'RANGER' };

// ---------------------------------------------------------------- the scripts
// A page: [who speaks, the line, the camera's shot (default: that person's close-up)]
function cineScript(kind, cls) {
  const me = PLAYER_OF[cls] || 'marc', ME = CINE_PEOPLE[me].name, heckler = me === 'chris' ? 'marc' : 'chris', HK = CINE_PEOPLE[heckler].name;
  if (kind === 'open') {
    const turn = {
      warrior: [`${ME}. YOUR WARRIOR WALKS INTO CAMP AT DUSK. SWORD ON YOUR BACK, MUD TO THE KNEES. EVERYONE STOPS TALKING. WHAT DO YOU DO?`, "I FIND WHOEVER IS IN CHARGE. THEN I HIT WHATEVER NEEDS HITTING."],
      mage: [`${ME}. YOUR MAGE WALKS INTO CAMP AT DUSK, STAFF IN HAND. THE CAMPFIRE LEANS TOWARD YOU AS YOU PASS. WHAT DO YOU DO?`, "I ASK NICELY WHAT IS GOING ON. THEN I SET IT ON FIRE."],
      ranger: [`${ME}. YOUR RANGER SLIPS INTO CAMP AT DUSK. NOBODY HEARS YOU COME. WHAT DO YOU DO?`, "I COUNT THE WAYS OUT. THEN I GO FIND THE PRIEST."],
    }[cls] || [];
    return [
      ['dave', 'OKAY. PHONES DOWN. SNACKS WITHIN REACH. EVERYBODY GOT DICE? GOOD.', 'wide'],
      ['dave', "TONIGHT: DUNGEONS OF BONES. I WROTE IT MYSELF, SO NOBODY GETS TO LOOK ANYTHING UP."],
      ['dave', 'OAKHOLLOW WAS A VILLAGE. NOW IT IS A CAMP IN THE WOODS, ONE TIRED PRIEST, AND A FIRE THAT NOBODY LETS GO OUT.'],
      ['dave', 'BECAUSE THE DEAD WALK HERE. AND THE GRAVES BEHIND THE CHURCH WERE NOT CLAWED OPEN FROM BELOW. THEY WERE DUG. WITH SPADES.'],
      [heckler, "SO SOMEBODY IS STEALING BONES. DO WE GET PAID FOR THIS?"],
      ['dave', `YOU GET TO LIVE, ${HK}. PROBABLY.`],
      ['dave', turn[0]],
      [me, turn[1]],
      ['dave', "GOOD. THERE'S A PRIEST ON THE CHURCH STEPS, AND HE LOOKS LIKE HE HAS BEEN WAITING FOR YOU. ROLL FOR IT.", 'wide'],
    ];
  }
  if (kind === 'actEnd') {
    const tired = me === 'aaron' ? 'marc' : 'aaron';
    return [
      ['dave', 'AND THE OLD KING IS DUST. AGAIN.', 'wide'],
      ['dave', 'BUT MAELIS WENT SOUTH WITH WHATEVER HE TOOK OUT OF THAT GRAVE. THE ROAD PAST THE RIVERLANDS IS OPEN.'],
      [me, "THEN WE GO AFTER HIM. OBVIOUSLY."],
      [tired, "IT'S MIDNIGHT. SOME OF US WORK TOMORROW."],
      ['dave', "THEN THAT IS WHERE WE STOP. SAME TIME NEXT WEEK. SOMEBODY ELSE BRINGS THE SNACKS.", 'wide'],
    ];
  }
  return [];
}

// ---------------------------------------------------------------- the scene's buffers
// The room is drawn once as palette indices (cS0; 0 = the map, where the game shows; +EMIS = its
// own light) with cF0 = the light level of things lit as one piece (people, props; 0 = lit by the
// lamp's field cLF with a dither), then baked to colours (cC0). Each frame cC starts as a copy of
// cC0 and the moving things are drawn into it as colours. cGame is the game's own picture (kept
// from the last frame the world was drawn), cMini the same at a third of the size, for the map
// while the camera is not on its way into it.
let cW = 0, cH = 0, cS0 = null, cF0 = null, cLF = null, cC0 = null, cC = null, cGame = null, cGameOK = false, cMini = null, cMiniOK = false, cCL = null, cXs = null, cGx = null, cGeo = null;
let cT = null, cTF = null, cFl = 0, cDyn = false;   // what the drawing calls write into, at which flat light; cDyn: straight into this frame's colours
const C_ID = 5, C_LEVELS = 8;   // the scene's own light table: level 5 is each colour as drawn
function cineLightTable() {
  cCL = new Uint32Array(C_LEVELS * NPAL);
  for (let i = 1; i < NPAL; i++) {
    const ramp = PAL_RAMPS.find(r => r.includes(i)), chain = ramp ? [...TAIL, ...ramp] : TAIL, pos = chain.indexOf(i);
    for (let L = 0; L < C_LEVELS; L++) {
      const j = pos < 0 ? i : chain[clamp(pos - (C_ID - Math.min(L, C_ID)), 0, chain.length - 1)];
      let r = PR[j], g = PG[j], b = PB[j];
      if (L > C_ID) { const w = (L - C_ID) / 2; r = r * (1 + 0.14 * w) + 10 * w; g = g * (1 + 0.07 * w) + 3 * w; b = b * (1 - 0.1 * w); }   // toward the lamp: brighter, warmer
      else if (L < C_ID && j > 1) { const c = (C_ID - L) / C_ID; r *= 1 - 0.18 * c; g *= 1 - 0.06 * c; b = b * (1 + 0.08 * c) + 6 * c; }   // away from it: cooler
      cCL[L * NPAL + i] = (255 << 24) | (clamp(Math.round(b), 0, 255) << 16) | (clamp(Math.round(g), 0, 255) << 8) | clamp(Math.round(r), 0, 255);
    }
  }
}
const cHash = (a, b) => { let h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
// drawing into the scene (all in detail pixels; outlines are 2 wide, one "cell" of the players' portraits)
function cP(x, y, c) { if (x >= 0 && y >= 0 && x < cW && y < cH) { const o = y * cW + x; if (cDyn) cC[o] = (c & EMIS) ? PAL32[c & 127] : cCL[(cFl || C_ID) * NPAL + c]; else { cT[o] = c; cTF[o] = cFl; } } }
function cR(x, y, w, h, c) { x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h); for (let b = 0; b < h; b++) for (let a = 0; a < w; a++) cP(x + a, y + b, c); }
function cRound(x, y, w, h, r, c) { for (let b = 0; b < h; b++) for (let a = 0; a < w; a++) { const dx = Math.min(a, w - 1 - a), dy = Math.min(b, h - 1 - b); if (dx + dy >= r) cP(x + a, y + b, c); } }
function cFrame(x, y, w, h, c, t = 2) { cR(x, y, w, t, c); cR(x, y + h - t, w, t, c); cR(x, y, t, h, c); cR(x + w - t, y, t, h, c); }
function cEll(cx, cy, rx, ry, c, c2 = -1) {   // c2: the shade of its lower right
  for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) { const d = (x * x) / (rx * rx) + (y * y) / (ry * ry); if (d <= 1) cP(cx + x, cy + y, c2 >= 0 && x / rx * 0.5 + y / ry > 0.42 ? c2 : c); }
}
function cEllO(cx, cy, rx, ry, c, c2 = -1) { cEll(cx, cy, rx + 2, ry + 2, BLK); cEll(cx, cy, rx, ry, c, c2); }
function cTrap(y0, y1, l0, r0, l1, r1, c) { for (let y = y0; y < y1; y++) { const k = (y - y0) / Math.max(1, y1 - y0 - 1), l = Math.round(l0 + (l1 - l0) * k), r = Math.round(r0 + (r1 - r0) * k); cR(l, y, r - l, 1, c); } }
function cLine(x0, y0, x1, y1, c, w = 2) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)), h = w >> 1; for (let s = 0; s <= n; s++) { const k = n ? s / n : 0; cR(Math.round(x0 + (x1 - x0) * k) - h, Math.round(y0 + (y1 - y0) * k) - h, w, w, c); } }
function cLineO(x0, y0, x1, y1, c, w) { cLine(x0, y0, x1, y1, BLK, w + 4); cLine(x0, y0, x1, y1, c, w); }
function cText(s, x, y, c, z = 1) { for (let n = 0; n < s.length; n++) { const g = FONT[s[n]] || FONT['?']; for (let r = 0; r < 5; r++) for (let q = 0; q < 3; q++) if (g[r * 3 + q] === '1') cR(x + (n * 4 + q) * z, y + r * z, z, z, c); } }
function cDie(cx, cy, r, label, z, ramp = RED) {   // a twenty-sided die, seen flat: a hexagon with a lit and a shaded facet
  for (let pass = 0; pass < 2; pass++) { const R = pass ? r : r + 2;
    for (let y = -R; y <= R; y++) { const hw = Math.round(R * 0.88 * (Math.abs(y) < R / 2 ? 1 : 1 - (Math.abs(y) - R / 2) / (R / 2) * 0.98));
      for (let x = -hw; x <= hw; x++) cP(cx + x, cy + y, !pass ? BLK : x + y * 0.8 < -r * 0.45 ? ramp[4] : x + y * 0.8 > r * 0.55 ? ramp[2] : ramp[3]); } }
  if (label) cText(label, cx - Math.floor((label.length * 4 - 1) * z / 2), cy - Math.floor(5 * z / 2), 27, z);
}
function cSkull(cx, cy) {
  cEllO(cx, cy, 9, 8, 26, 25); cR(cx - 7, cy + 5, 14, 9, BLK); cR(cx - 5, cy + 5, 10, 7, 26);
  cR(cx - 6, cy - 2, 4, 5, BLK); cR(cx + 2, cy - 2, 4, 5, BLK); cR(cx - 1, cy + 3, 2, 3, BLK);
  for (let k = -1; k <= 1; k++) cR(cx + k * 3 - 1, cy + 9, 1, 3, 24);
}
// a person's portrait, each cell `cell` pixels: rows r0..r1 of the grid, nothing at or below clipY
function cineBust(P, x, y, cell, o = {}) {
  const g = o.grid || P.g, r1 = o.r1 || P.h, clipY = o.clipY === undefined ? 1e9 : o.clipY;
  for (let j = o.r0 || 0; j < r1; j++) for (let i = 0; i < P.w; i++) {
    const k = j * P.w + i; let c = g[k]; if (!c) continue;
    if (o.blink && P.blinkM.has(k)) c = P.blinkM.get(k);
    if (o.mouth && P.talkM.has(k)) c = P.talkM.get(k);
    const X = x + i * cell, Y = y + j * cell;
    for (let b = 0; b < cell; b++) { if (Y + b >= clipY) break; for (let a = 0; a < cell; a++) cP(X + a, Y + b, c); }
  }
}

// ---------------------------------------------------------------- the room, built once
function cineBuild() {
  cW = OW; cH = OH; const N = cW * cH;
  cS0 = new Uint8Array(N); cF0 = new Uint8Array(N); cLF = new Float32Array(N); cC0 = new Uint32Array(N); cC = new Uint32Array(N); cGame = new Uint32Array(N); cGameOK = cMiniOK = false; cXs = new Int32Array(cW); cGx = new Int32Array(cW);
  if (!cCL) cineLightTable();
  const cx = cW >> 1, top = Math.round((cH - 840) * 0.42), mw = cW / 3, mh = cH / 3, mhI = Math.ceil(mh);
  const tY = top + 238, tW = 304, tX = cx - tW / 2, tH = mhI + 84, mX = Math.round(cx - mw / 2), mY = tY + 42, wallB = tY - 8, sT = tY - 62, sB = tY + 6;
  const D = CINE_PEOPLE, seat = {
    dave: { x: cx - 34, y: top + 92, r1: 29, L: 6, ph: 0 },   // (the user: the first Dave, half again the others' size with a body the width of the table, was way too big)
    marc: { x: 18, y: tY + 96, L: 6, ph: 1.9 },
    aaron: { x: cW - 18 - D.aaron.w * 2, y: tY + 18, L: 6, ph: 3.1 },
    chris: { x: cW - 18 - D.chris.w * 2, y: tY + 150, L: 6, ph: 4.4 },
  };
  for (const id of ['marc', 'aaron', 'chris']) seat[id].clipY = seat[id].y + D[id].h * 2 - 8;
  cMini = new Uint32Array(mw * mhI);
  const g = cGeo = { cx, top, tX, tY, tW, tH, mX, mY, mw, mh, mhI, sT, seat, candles: [[cx - 116, tY + 20], [cx + 116, tY + 20]],
    face: { dave: [cx, top + 124], marc: [seat.marc.x + 38, seat.marc.y + 34], aaron: [seat.aaron.x + 43, seat.aaron.y + 36], chris: [seat.chris.x + 36, seat.chris.y + 34] } };
  cT = cS0; cTF = cF0; cFl = 0; cDyn = false;
  // the wall: brick, with a rail where it meets the floor
  for (let y = 0; y < wallB; y++) { const row = (y / 16) | 0, off = (row & 1) * 20; for (let x = 0; x < cW; x++) { const h = cHash(row, ((x + off) / 40) | 0); cS0[y * cW + x] = (y % 16 < 2 || (x + off) % 40 < 2) ? 65 : h < 0.14 ? 68 : h > 0.86 ? 66 : 67; } }
  cR(0, wallB - 10, cW, 10, BLK); cR(0, wallB - 8, cW, 6, 34); cR(0, wallB - 8, cW, 2, 35);
  // the floor: boards
  for (let y = wallB; y < cH; y++) { const row = ((y - wallB) / 24) | 0, off = (row * 97) % 180; for (let x = 0; x < cW; x++) { const h = cHash(row + 50, ((x + off) / 180) | 0); cS0[y * cW + x] = ((y - wallB) % 24 < 2 || (x + off) % 180 < 2) ? 98 : cHash(row * 5 + 1, (x / 14) | 0) < 0.1 ? 98 : h < 0.3 ? 100 : 99; } }
  // a rug under the table and the chairs
  { const x0 = tX - 96, w = tW + 192, y0 = tY + 14, h = tH + 46; cRound(x0, y0, w, h, 8, BLK); cRound(x0 + 2, y0 + 2, w - 4, h - 4, 7, 20); cFrame(x0 + 10, y0 + 10, w - 20, h - 20, 49); cFrame(x0 + 16, y0 + 16, w - 32, h - 32, 21); }
  // on the wall: a poster, two shelves of books, a skull
  cFl = 4;
  { const x0 = 34, y0 = top + 58, w = 92, h = 116; cR(x0, y0, w, h, BLK); cR(x0 + 2, y0 + 2, w - 4, h - 4, 26); cR(x0 + 6, y0 + 6, w - 12, h - 12, 20);
    cText('ROLL', x0 + w / 2 - 15, y0 + 12, 51, 2); cDie(x0 + w / 2, y0 + 58, 22, '20', 2); cText('OR DIE', x0 + w / 2 - 23, y0 + 94, 27, 2); }
  for (const [sy, n] of [[top + 100, 7], [top + 166, 5]]) {
    const sx = cW - 138; cR(sx, sy, 112, 8, BLK); cR(sx + 2, sy + 2, 108, 4, 35);
    let bx = sx + 6;
    for (let k = 0; k < n; k++) { const h = cHash(sy, k), w = 10 + ((h * 3) | 0) * 2, bh = 28 + ((cHash(k, sy) * 4) | 0) * 4, c = [21, 38, 54, 57, 49, 29, 110][(cHash(k + 9, sy) * 7) | 0];
      cR(bx, sy - bh, w, bh, BLK); cR(bx + 2, sy - bh + 2, w - 4, bh - 2, c); cR(bx + 2, sy - bh + 8, w - 4, 2, 51); cR(bx + 2, sy - 8, w - 4, 2, 51); bx += w - 2 + (h > 0.7 ? 8 : 0); }
    if (n === 5) cSkull(sx + 94, sy - 14);
  }
  // the lamp over the table
  cFl = 6; cR(cx - 1, 0, 2, top + 8, 3);
  cTrap(top + 4, top + 26, cx - 16, cx + 16, cx - 40, cx + 40, BLK); cTrap(top + 6, top + 24, cx - 14, cx + 14, cx - 37, cx + 37, 54); cTrap(top + 6, top + 24, cx - 14, cx - 7, cx - 37, cx - 24, 55);
  cFl = 0; cEll(cx, top + 27, 9, 4, 18 | EMIS);
  // Dave's chair, then Dave: heavy shoulders behind the screen (his head is drawn each frame)
  cFl = 4; cRound(cx - 74, top + 72, 148, 170, 14, BLK); cRound(cx - 72, top + 74, 144, 166, 13, 20); cRound(cx - 62, top + 84, 124, 150, 10, 21);
  for (let b = 0; b < 3; b++) for (let a = 0; a < 4; a++) cR(cx - 50 + a * 33 - 2, top + 98 + b * 30, 4, 4, 19);
  cFl = seat.dave.L;
  for (const s of [-1, 1]) { const wx = s < 0 ? cx - 48 : cx + 52; cEll(wx, top + 190, 46, 40, BLK); cEll(wx, top + 190, 44, 38, 31, 30); }
  cR(cx - 34, top + 156, 72, 90, 31);
  cineBust(D.dave, seat.dave.x, seat.dave.y, 2, { grid: D.dave.gBody, r0: 28, r1: 36 });
  // the table: boards along its length, a darker rim, its front face and legs
  cFl = 0; cRound(tX - 2, tY - 2, tW + 4, tH + 4, 8, BLK);
  for (let y = 0; y < tH; y++) for (let x = 0; x < tW; x++) { const dx = Math.min(x, tW - 1 - x), dy = Math.min(y, tH - 1 - y); if (dx + dy < 7) continue;
    const pl = (x / 38) | 0, rim = dx < 5 || dy < 5; cP(tX + x, tY + y, rim ? 100 : x % 38 < 2 ? 100 : cHash(pl * 7 + 3, (y / 4) | 0) < 0.16 ? 100 : cHash(pl + 31, (y / 9) | 0) < 0.1 ? 102 : 101); }
  cR(tX + 4, tY + tH + 2, tW - 8, 16, BLK); cR(tX + 6, tY + tH + 2, tW - 12, 10, 99); cR(tX + 6, tY + tH + 12, tW - 12, 4, 98);
  for (const lx of [tX + 14, tX + tW - 32]) { cR(lx, tY + tH + 18, 18, 34, BLK); cR(lx + 2, tY + tH + 18, 14, 32, 98); }
  // the Dungeon Master's screen: two wings toward us, the middle panel with its skull
  cFl = 5;
  for (const s of [-1, 1]) for (let q = 0; q <= 46; q++) { const x = cx + s * (46 + q), k = q / 46, y0 = Math.round(sT - 8 * k), y1 = Math.round(sB + 10 * k), edge = q >= 45;
    cR(x, y0 - 2, 1, y1 - y0 + 4, BLK); if (!edge) { cR(x, y0, 1, y1 - y0, s < 0 ? 20 : 19); cR(x, y0 + 5, 1, 2, 49); cR(x, y1 - 7, 1, 2, 49); } }
  for (const s of [-1, 1]) { const x = cx + s * 69; for (let d = -6; d <= 6; d++) cR(x - (6 - Math.abs(d)), sT + 30 + d, (6 - Math.abs(d)) * 2 + 1, 1, 50); }
  cR(cx - 48, sT - 2, 96, sB - sT + 4, BLK); cR(cx - 46, sT, 92, sB - sT, 21); cFrame(cx - 41, sT + 5, 82, sB - sT - 10, 49);
  for (const s of [-1, 1]) { cLine(cx - s * 22, sT + 16, cx + s * 22, sT + 52, BLK, 8); cLine(cx - s * 22, sT + 16, cx + s * 22, sT + 52, 25, 4); for (const e of [-1, 1]) cEllO(cx + e * s * 22, sT + 34 + e * 18, 3, 3, 25); }
  cSkull(cx, sT + 30);
  // his fingers over the top of it
  cFl = seat.dave.L; for (const s of [-1, 1]) for (let k = 0; k < 4; k++) { const fx = cx + s * (16 + k * 8); cEll(fx, sT - 1, 4, 6, BLK); cEll(fx, sT - 2, 3, 5, 63, 62); }
  // the map in the middle (0 = the game shows here), in a parchment border
  cFl = 5; cR(mX - 8, mY - 8, mw + 16, mhI + 16, BLK); cR(mX - 6, mY - 6, mw + 12, mhI + 12, 103); cR(mX - 6, mY + mhI + 2, mw + 12, 4, 102); cR(mX - 2, mY - 2, mw + 4, mhI + 4, BLK);
  cR(mX, mY, mw, mhI, 0);
  // candles either side of the screen
  for (const [x, y] of g.candles) { cR(x - 8, y + 16, 16, 6, BLK); cR(x - 6, y + 16, 12, 4, 49); cR(x - 5, y, 10, 18, BLK); cR(x - 3, y + 2, 6, 14, 26); cR(x + 1, y + 2, 2, 14, 25); }
  // each player's place: a chair, a character sheet, dice, a pencil
  const chair = (id) => { const s = seat[id], w = D[id].w * 2, h = D[id].h * 2; cFl = 4;
    cRound(s.x - 8, s.y + 14, w + 16, h - 12, 7, BLK); cRound(s.x - 6, s.y + 16, w + 12, h - 16, 6, 34); for (let k = 0; k * 20 < w - 8; k++) cR(s.x + 6 + k * 20, s.y + 22, 4, h - 34, 33);
    cR(s.x - 12, s.y + h - 8, w + 24, 16, BLK); cR(s.x - 10, s.y + h - 6, w + 20, 12, 35); cR(s.x - 10, s.y + h + 2, w + 20, 4, 34);
    for (const lx of [s.x - 8, s.x + w - 6]) { cR(lx, s.y + h + 8, 14, 22, BLK); cR(lx + 2, s.y + h + 8, 10, 20, 34); } };
  const sheet = (x, y) => { cFl = 6; cR(x, y, 38, 50, BLK); cR(x + 2, y + 2, 34, 46, 27); cR(x + 5, y + 5, 10, 10, 25); cR(x + 18, y + 6, 15, 2, 24); cR(x + 18, y + 11, 11, 2, 24); for (let k = 0; k < 5; k++) cR(x + 5, y + 20 + k * 5, 28 - (k % 3) * 6, 2, 25); };
  const dice = (x, y, ramp) => { cFl = 6; cDie(x, y, 6, '', 1, ramp); cR(x + 9, y + 2, 10, 10, BLK); cR(x + 11, y + 4, 6, 6, ramp[3]); cR(x + 13, y + 6, 2, 2, 27); };
  chair('marc'); chair('aaron'); chair('chris');
  sheet(tX + 12, seat.marc.y + 4); dice(tX + 20, seat.marc.y + 66, BLUE); cFl = 6; cLineO(tX + 46, seat.marc.y + 62, tX + 56, seat.marc.y + 40, 50, 2);
  sheet(tX + tW - 50, seat.aaron.y + 14); dice(tX + tW - 46, seat.aaron.y + 76, PURPLE);
  sheet(tX + tW - 50, seat.chris.y + 6); dice(tX + tW - 46, seat.chris.y + 68, GREEN);
  // arms onto the table (Aaron's are in his portrait)
  cFl = seat.marc.L; cLineO(seat.marc.x + 62, seat.marc.y + 66, tX + 6, seat.marc.y + 62, 39, 10); cEllO(tX + 14, seat.marc.y + 62, 6, 6, 63, 62);
  cFl = seat.chris.L; cLineO(seat.chris.x + 14, seat.chris.y + 68, tX + tW - 8, seat.chris.y + 64, 27, 10); cEllO(tX + tW - 16, seat.chris.y + 64, 6, 6, 63, 62);
  // snacks at the near end: a bowl of chips, cans, a pizza box
  cFl = 6;
  { const bx = tX + 40, by = tY + tH - 24; cEllO(bx, by, 22, 11, 32, 31); cEll(bx, by - 2, 17, 7, 49); for (let k = 0; k < 9; k++) cR(bx - 14 + ((cHash(k, 5) * 26) | 0), by - 8 + ((cHash(k, 6) * 9) | 0), 5, 3, k % 3 ? 50 : 51); }
  for (const [x, y, c, c2] of [[cx - 34, tY + tH - 36, 22, 21], [tX + tW - 22, seat.aaron.y + 70, 54, 53], [tX + 62, tY + tH - 38, 39, 38]]) { cR(x, y, 14, 22, BLK); cR(x + 2, y + 2, 10, 18, c); cR(x + 8, y + 2, 4, 18, c2); cR(x + 2, y + 2, 10, 3, 31); cR(x + 2, y + 10, 10, 2, 27); }
  { const x = cx + 8, y = tY + tH - 38; cR(x, y, 64, 30, BLK); cR(x + 2, y + 2, 60, 26, 102); cEll(x + 32, y + 15, 24, 10, 36); cEll(x + 32, y + 15, 21, 8, 50, 49); for (let k = 0; k < 6; k++) cR(x + 16 + ((cHash(k, 12) * 30) | 0), y + 10 + ((cHash(k, 13) * 9) | 0), 4, 3, 22); cTrap(y + 15, y + 26, x + 32, x + 33, x + 40, x + 56, 102); }
  // the lamp's pool of light: brightest on the table, falling off to the corners, dim above the shade
  const ly = tY + tH * 0.3;
  for (let y = 0, o = 0; y < cH; y++) for (let x = 0; x < cW; x++, o++) {
    const dx = (x - cx) / (cW * 0.6), dy = (y - ly) / (cH * 0.5); let v = 7.5 - 4.5 * Math.pow(Math.hypot(dx, dy), 1.25);
    if (y < top + 30) v -= (top + 30 - y) * 0.03;
    cLF[o] = clamp(v, 2.6, 6.85);
  }
  for (let y = 0, o = 0; y < cH; y++) for (let x = 0; x < cW; x++, o++) { const v = cS0[o], f = cF0[o]; cC0[o] = v === 0 ? 0 : (v & EMIS) ? PAL32[v & 127] : cCL[(f ? f : (cLF[o] + BAYER[((y & 3) << 2) | (x & 3)]) | 0) * NPAL + v]; }
}

// ---------------------------------------------------------------- running a cinematic
// G.cine = { kind, pages, k, chars, ph, pt, cam, from, to, ct, cd, done }
// kinds: 'open' (a new game: Dave sets the scene, the die rolls, the camera goes into the map),
// 'resume' (a saved game: straight into the map), 'actEnd' (out of the map, the night ends).
let CINE_OFF = null;
function cineOK() {
  if (CINE_OFF === null) { const q = params.get('cine'); CINE_OFF = q !== null ? q === '0' : location.protocol === 'file:'; }   // (off from local files unless asked: the test tools start games there)
  return !CINE_OFF && !PREVIEW;
}
function cineShot(name) {
  const g = cGeo;
  if (name === 'map') return { x: g.mX + g.mw / 2, y: g.mY + g.mh / 2, z: 3 };
  if (name === 'wide' || !g.face[name]) return { x: cW / 2, y: cH / 2, z: 1 };
  const f = g.face[name], z = 2, vw = cW / z, vh = cH / z;   // a close-up: the face a third of the way down (the text box takes the bottom)
  return { x: clamp(Math.round(f[0]), vw / 2, cW - vw / 2), y: clamp(Math.round(f[1] + vh * 0.17), vh / 2, cH - vh / 2), z };
}
function cineMove(to, dur) { const C = G.cine; C.from = Object.assign({}, C.cam); C.to = to; C.ct = 0; C.cd = dur; }
function cinePage(k) {
  const C = G.cine; C.k = k; C.chars = 0; C.total = C.pages[k][1].length;
  cineMove(cineShot(C.pages[k][2] || C.pages[k][0]), 0.55);
}
function startCine(kind, done = null) {
  if (cW !== OW || cH !== OH) cineBuild();
  const C = G.cine = { kind, pages: cineScript(kind, hero.cls), k: 0, chars: 0, total: 0, ph: 'talk', pt: 0, fi: 0, cam: cineShot('wide'), from: null, to: null, ct: 1, cd: 1, done };
  G.mode = 'cine'; clearInput();
  if (kind === 'open') { C.fi = 0.8; cinePage(0); C.ct = 1; C.cam = cineShot(C.pages[0][2] || C.pages[0][0]); }
  else if (kind === 'resume') { C.ph = 'hold'; C.fi = 0.35; }
  else { C.ph = 'zoomOut'; C.cam = cineShot('map'); cineMove(cineShot('wide'), 2.2); }
}
function cineEnd() { const C = G.cine; G.cine = null; G.mode = 'play'; clearInput(); G.autoTalkT = G.t + 1.2; if (C && C.done) C.done(); }   // (a beat in the game before anyone speaks)
function cineZoom(dur) { const C = G.cine; C.ph = 'zoom'; C.pt = 0; cineMove(cineShot('map'), dur); }
function cineNext() {
  const C = G.cine;
  if (C.k + 1 < C.pages.length) { cinePage(C.k + 1); return; }
  if (C.kind === 'open') { C.ph = 'roll'; C.pt = 0; cineMove(cineShot('wide'), 0.4); }
  else { C.ph = 'out'; C.pt = 0; }
}
function updateCine(dt) {
  const C = G.cine; if (!C) return;
  C.pt += dt; if (C.fi > 0) C.fi -= dt;
  if (C.ct < 1) {   // the camera on its way: zoom in equal ratios, the centre along the straight path a zoom toward a point takes
    C.ct = Math.min(1, C.ct + dt / C.cd);
    const e = C.ct < 0.5 ? 4 * C.ct ** 3 : 1 - ((-2 * C.ct + 2) ** 3) / 2, a = C.from, b = C.to, z = a.z * Math.pow(b.z / a.z, e);
    const w = Math.abs(a.z - b.z) < 0.01 ? e : (1 / a.z - 1 / z) / (1 / a.z - 1 / b.z);
    C.cam = C.ct >= 1 ? Object.assign({}, b) : { x: a.x + (b.x - a.x) * w, y: a.y + (b.y - a.y) * w, z };
  }
  if (C.ph === 'talk') C.chars = Math.min(C.total, C.chars + dt * 48);
  else if (C.ph === 'hold') { if (C.pt > 0.5) cineZoom(1.5); }
  else if (C.ph === 'roll') { if (!C.landed && C.pt > 0.95) { C.landed = true; sfx('clink'); } if (C.pt > 1.7) cineZoom(2.5); }
  else if (C.ph === 'zoom') { if (C.ct >= 1) cineEnd(); }
  else if (C.ph === 'zoomOut') { if (C.ct >= 1) { C.ph = 'talk'; cinePage(0); C.ct = 1; C.cam = cineShot(C.pages[0][2] || C.pages[0][0]); } }
  else if (C.ph === 'out') { if (C.pt > 0.6) cineEnd(); }
}
function cineLayout() { return { skip: { x: W - 46, y: 6, w: 40, h: 14 } }; }
function cineTap(p) {
  const C = G.cine; if (!C) return;
  if (C.ph === 'talk') {
    if (p && inRect(p, cineLayout().skip)) { sfx('tap'); if (C.kind === 'actEnd') cineEnd(); else cineZoom(1.3); return; }
    if (C.fi > 0.3) return;
    if (C.chars < C.total) C.chars = C.total; else { sfx('tap'); cineNext(); }
  } else if (C.ph === 'zoomOut') { C.ct = 1; C.cam = Object.assign({}, C.to); }
  else if (C.ph === 'out') cineEnd();
  else if (C.ph === 'roll') { if (C.pt > 0.6) cineZoom(1.3); }   // (a tap too many while reading doesn't lose the roll)
  else if ((C.ph === 'zoom' || C.ph === 'hold') && C.kind === 'resume' && C.pt > 0.25) cineEnd();   // the opening's push into the map plays out; a saved game's can be cut
}

// ---------------------------------------------------------------- each frame: the people, then the picture
function cineDynamic(C) {
  const g = cGeo, t = G.t, pg = C.ph === 'talk' ? C.pages[C.k] : null, speaker = pg && C.chars < C.total ? pg[0] : null;
  for (const id of ['dave', 'marc', 'aaron', 'chris']) {
    const P = CINE_PEOPLE[id], s = g.seat[id], talking = speaker === id;
    const bob = talking ? Math.round(Math.sin(t * 10) * 1.3 - 0.5) : Math.round(Math.sin(t * 1.3 + s.ph) * 0.8);
    cFl = s.L; cineBust(P, s.x, s.y + bob, P.cell, { r1: s.r1, clipY: s.clipY, blink: ((t + s.ph * 1.7) % 3.9) < 0.13, mouth: talking && Math.floor(t * 9) % 2 === 0 });
  }
  cFl = 0;
  for (const [x, y] of g.candles) { const k = Math.floor(t * 9 + x) % 3; cEll(x + (k === 1 ? 1 : 0), y - 6, 3, 5 + (k === 2 ? 1 : 0), 16 | EMIS); cEll(x, y - 4, 1, 3, 18 | EMIS); }
  for (let k = 0; k < 10; k++) {   // dust in the lamplight
    const x = Math.round(g.cx + (cHash(k, 1) - 0.5) * 250 + Math.sin(t * 0.6 + k) * 7), y = Math.round(g.top + 34 + ((((cHash(k, 2) * 240 - t * (5 + cHash(k, 3) * 7)) % 240) + 240) % 240));
    if (Math.sin(t * 1.7 + k * 2.1) < -0.2 || (Math.abs(x - g.cx) < 46 && y < g.sT)) continue;
    cR(x, y, 2, 2, 11 | EMIS);
  }
  if (C.ph === 'roll' || (C.ph === 'zoom' && C.kind === 'open' && C.landed)) {   // Dave's die: over the screen, two bounces, a twenty
    const T = C.ph === 'roll' ? C.pt : 9, x0 = g.cx + 62, y0 = g.sT - 6, x1 = g.cx + 6, y1 = g.tY + 24, k = Math.min(1, T / 0.95);
    const hop = k < 0.6 ? Math.sin(k / 0.6 * Math.PI) * 46 : k < 1 ? Math.sin((k - 0.6) / 0.4 * Math.PI) * 14 : 0;
    const x = Math.round(x0 + (x1 - x0) * k), y = Math.round(y0 + (y1 - y0) * k - hop);
    cFl = 6; cDie(x, y, 11, k >= 1 ? '20' : Math.floor(T * 14) % 2 ? '7' : '', 1);
    if (k >= 1 && T < 1.25) { cFl = 0; for (let a = 0; a < 8; a++) { const r = 14 + (T - 0.95) * 60; cR(Math.round(x + Math.cos(a * 0.785) * r), Math.round(y + Math.sin(a * 0.785) * r * 0.7), 2, 2, 18 | EMIS); } }
  }
}
// The game's own picture (no HUD) is kept when the world was drawn this frame (`fresh`); while
// people talk it is redrawn only every fourth frame (cineHolds), the push into the map every frame.
// Then the room goes over the whole screen through the camera, with the game's picture where the
// map is: three scene pixels to one of the game's, so at zoom 3 on the map the screen is the game.
function cineHolds() { const C = G.cine; return cGameOK && cW === OW && cH === OH && C.ph !== 'zoom' && C.ph !== 'zoomOut' && (C.fr = (C.fr || 0) + 1) % 4 !== 0; }
function cineMini() {   // the game's picture at a third: each pixel the average of a 3x3 block, a little under the room's light
  const g = cGeo, mw = g.mw, k = Math.round(0.8 * 256 / 9);
  for (let j = 0, d = 0; j < g.mhI; j++) { const y0 = Math.min(j * 3, cH - 3) * cW; for (let i = 0; i < mw; i++, d++) {
    let r = 0, gg = 0, b = 0; const q = y0 + i * 3;
    for (let o = q; o < q + 3 * cW; o += cW) for (let a = 0; a < 3; a++) { const c = cGame[o + a]; r += c & 255; gg += (c >> 8) & 255; b += (c >> 16) & 255; }
    cMini[d] = (255 << 24) | (((b * k) >> 8) << 16) | (((gg * k) >> 8) << 8) | ((r * k) >> 8);
  } }
  cMiniOK = true;
}
function cineCompose(fresh) {
  const C = G.cine; if (!C) return;
  if (cW !== OW || cH !== OH) { cineBuild(); C.cam = cineShot(C.ph === 'zoom' ? 'map' : 'wide'); C.ct = 1; }
  if (fresh) { cGame.set(ov32); cGameOK = true; cMiniOK = false; }
  cC.set(cC0); cDyn = true; cineDynamic(C); cDyn = false;
  const g = cGeo, z = C.cam.z, iz = 1 / z, hw = cW / 2, hh = cH / 2, mw = g.mw, mX = g.mX, mY = g.mY;
  const vx = clamp(C.cam.x, hw * iz, cW - hw * iz), vy = clamp(C.cam.y, hh * iz, cH - hh * iz);
  const moving = C.ph === 'zoom' || C.ph === 'zoomOut';
  if (!moving && !cMiniOK) cineMini();
  const n = z >= 2.5 ? 1 : z >= 1.45 ? 2 : 3, dim = Math.round((0.8 + 0.2 * clamp((z - 1) / 1.5, 0, 1)) * 256 / (n * n));   // on the way in: sharper as it nears, and up to the game's own brightness
  for (let X = 0; X < cW; X++) { const sx = vx + (X + 0.5 - hw) * iz; cXs[X] = clamp(Math.floor(sx), 0, cW - 1); cGx[X] = clamp(Math.floor((sx - mX) * 3 + 1e-6), 0, cW - n); }
  for (let Y = 0, d = 0; Y < cH; Y++) {
    const syf = vy + (Y + 0.5 - hh) * iz, sy = clamp(Math.floor(syf), 0, cH - 1), row = sy * cW, mrow = (sy - mY) * mw - mX, gy = clamp(Math.floor((syf - mY) * 3 + 1e-6), 0, cH - n) * cW;
    for (let X = 0; X < cW; X++, d++) {
      const sx = cXs[X], c = cC[row + sx];
      if (c) ov32[d] = c;
      else if (!moving) ov32[d] = cMini[mrow + sx];
      else if (n === 1) ov32[d] = cGame[gy + cGx[X]];
      else {
        let r = 0, gg = 0, b = 0; const q = gy + cGx[X];
        for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const p = cGame[q + j * cW + i]; r += p & 255; gg += (p >> 8) & 255; b += (p >> 16) & 255; }
        ov32[d] = (255 << 24) | (((b * dim) >> 8) << 16) | (((gg * dim) >> 8) << 8) | ((r * dim) >> 8);
      }
    }
  }
}
// over it, at the HUD's scale: who is speaking and what they say, typed out; SKIP; the fades
function drawCineHud() {
  const C = G.cine; if (!C) return;
  if (C.ph === 'talk') {
    const pg = C.pages[C.k], P = CINE_PEOPLE[pg[0]], lines = wrapText(pg[1], 58), bh = 20 + Math.max(4, lines.length) * 9, bx = 6, bw = W - 12, by = H - bh - 10;
    fillRect(bx, by, bw, bh, 2); frame(bx, by, bw, bh, 8, 3); frame(bx + 2, by + 2, bw - 4, bh - 4, 5, 2);
    const nm = pg[0] === 'dave' ? 'DAVE, THE DUNGEON MASTER' : P.name + (PLAYER_OF[hero.cls] === pg[0] ? ', THE ' + CLASS_WORD[hero.cls] : '');
    fillRect(bx + 6, by - 8, textWidth(nm) + 10, 12, 2); frame(bx + 6, by - 8, textWidth(nm) + 10, 12, P.col, 3); text(nm, bx + 11, by - 5, P.col);
    let left = Math.floor(C.chars);
    for (let k = 0; k < lines.length && left > 0; k++) { text(lines[k].slice(0, left), bx + 10, by + 11 + k * 9, 26); left -= lines[k].length + 1; }
    if (C.chars >= C.total && Math.floor(G.t * 2.5) % 2 === 0) for (let q = 0; q < 3; q++) fillRect(bx + bw - 14 + q, by + bh - 9 + q, 5 - q * 2, 1, 51);
    const s = cineLayout().skip; fillRect(s.x, s.y, s.w, s.h, 2); frame(s.x, s.y, s.w, s.h, 6, 3); textC('SKIP', s.x + s.w / 2, s.y + 5, 25);
  }
  if (C.fi > 0) fade(Math.min(1, C.fi / 0.6));
  if (C.ph === 'out') fade(Math.min(1, C.pt / 0.5));
}
