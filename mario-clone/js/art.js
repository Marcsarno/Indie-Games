'use strict';
// All art is generated here from pixel strings and small drawing routines: no image files.
// Native resolution 256x240, 16x16 tiles, like the NES.

const PAL = {
  k: '#000000', w: '#FCFCFC', sky: '#5C94FC',
  r: '#B53120', s: '#EA9E22', h: '#6A6B04', y: '#FCC03C',
  o: '#C84C0C', L: '#FCBCB0', g: '#00A800', G: '#80D010', d: '#005800',
  c: '#FCE0A8', Y: '#FCA044', b: '#0058F8', B: '#3CBCFC', n: '#9C4B0C', e: '#747474', E: '#BCBCBC'
};

function mkCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

// rows: array of equal-length strings; '.' is transparent; map overrides PAL per char.
function mkSprite(rows, map) {
  const w = rows[0].length, h = rows.length;
  const c = mkCanvas(w, h), x = c.getContext('2d');
  for (let j = 0; j < h; j++) {
    if (rows[j].length !== w) throw new Error('sprite row ' + j + ' has width ' + rows[j].length + ', expected ' + w + ': ' + rows[j]);
    for (let i = 0; i < w; i++) {
      const ch = rows[j][i];
      if (ch === '.') continue;
      const col = (map && map[ch]) || PAL[ch];
      if (!col) throw new Error('no color for ' + ch);
      x.fillStyle = col; x.fillRect(i, j, 1, 1);
    }
  }
  return c;
}

function flipped(src) {
  const c = mkCanvas(src.width, src.height), x = c.getContext('2d');
  x.translate(src.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0);
  return c;
}

const vflipCache = new Map();
function vflipped(src) {
  if (vflipCache.has(src)) return vflipCache.get(src);
  const c = mkCanvas(src.width, src.height), x = c.getContext('2d');
  x.translate(0, src.height); x.scale(1, -1); x.drawImage(src, 0, 0);
  vflipCache.set(src, c);
  return c;
}

// ---------------------------------------------------------------- Mario
// Shared chars: r cap (always red), S shirt, O overalls, h hair/shoes, s skin, k eye, y buttons, w glove
const MARIO_PALS = [
  { S: '#B53120', O: '#6A6B04', r: '#B53120', h: '#6A6B04', s: '#EA9E22' },   // normal
  { S: '#FCFCFC', O: '#B53120', r: '#B53120', h: '#6A6B04', s: '#EA9E22' },   // fire
  { S: '#FCBCB0', O: '#000000', r: '#000000', h: '#6A6B04', s: '#EA9E22' },   // star 1
  { S: '#00A800', O: '#FCFCFC', r: '#00A800', h: '#6A6B04', s: '#EA9E22' }    // star 2
];

const SM_HEAD = [
  '....rrrrr...',
  '...rrrrrrrrr',
  '...hhhssksh.',
  '..hshssskkss',
  '..hshhsssshs',
  '..hhsssshhhh',
  '....ssssss..'
];
const SM = {
  stand: SM_HEAD.concat([
    '...rrOrrr...',
    '..rrrOrrOrr.',
    '.rrrrOOOOrrr',
    '.ssrOyOOyOss',
    '.sssOOOOOOss',
    '.ss.OOOOOO.s',
    '...OOO..OOO.',
    '..hhh....hhh',
    '.hhhh....hhhh'.slice(0, 12)
  ]),
  walk1: SM_HEAD.concat([
    '...rrOrrr...',
    '..rrrOrrOrr.',
    '.rrrrOOOOrrr',
    '.ssrOyOOyOss',
    '..sOOOOOOOs.',
    '..OOOOOOOO..',
    '.hhOOOOOOO..',
    'hhhh.OOO....',
    'hhh.........'
  ]),
  walk2: SM_HEAD.concat([
    '....rOrrr...',
    '...rrOrrOr..',
    '...rrOOOOr..',
    '...sOOyOOs..',
    '...sOOOOOs..',
    '...OOOOOO...',
    '...OOOOOO...',
    '...hhhhh....',
    '...hhhh.....'
  ]),
  walk3: SM_HEAD.concat([
    '...rrOrrr...',
    '..rrrOrrOrr.',
    '.rrrrOOOOrrr',
    '.ssrOyOOyOss',
    '.sssOOOOOO..',
    '..OOOOOOOO..',
    '..OOOOOOOhh.',
    '....OOO.hhhh',
    '.........hhh'
  ]),
  jump: [
    '.......ss...',
    '....rrrrrss.',
    '...rrrrrrrss',
    '...hhhssksh.',
    '..hshssskkss',
    '..hshhsssshs',
    '..hhsssshhhh',
    '...rrssss...',
    '.rrrrOrrrr..',
    'rrrrrrOrrOrr',
    'rrrrrOOOOrrr',
    'hhh.OOyOOOs.',
    'hhhhOOOOOO..',
    '.hhhOOOOOOO.',
    '....OOO..OOh',
    '...hhh....hh'
  ],
  skid: [
    '.....rrrrr..',
    '....rrrrrrrr',
    '....sskshhh.',
    '...ssskkshsh',
    '...shssshhsh',
    '....hhhhssh.',
    '.....ssssss.',
    '...rrrOrrr..',
    '..rrrOrrOrr.',
    '.srrrOOOOrrr',
    '.ssrOyOOyOrs',
    '..sOOOOOOOss',
    '..OOOOOOOO..',
    '..OOOOOOOO..',
    '.hhhO..OOhh.',
    '.hhh....hhh.'
  ],
  die: [
    '....rrrrr...',
    '...rrrrrrrrr',
    '...hhhssksh.',
    '..hshssskkss',
    '..hshhsssshs',
    '..hhsssshhhh',
    's...ssssss.s',
    'ss.rrOrrr.ss',
    '.ssrrOrrrrss',
    '..srrOOOOrs.',
    '..rrOyOOyOr.',
    '..rrOOOOOOrr',
    '..hOOOOOOOOh',
    '..hhOOOOOhh.',
    '.hhh....hhh.',
    '.hh......hh.'
  ].map(function (r) { return r.slice(0, 12).padEnd(12, '.'); }),
  climb1: [
    '....rrrrr...',
    '...rrrrrrrrr',
    '...hhhssksh.',
    '..hshssskkss',
    '..hshhsssshs',
    '..hhsssshhhh',
    '....ssssss..',
    '...rrOrrr...',
    '..sr rOrr s.'.replace(/ /g, 'r').slice(0, 12),
    '.ssrrOOOOrs.',
    '.ss.OyOOyOs.',
    '..s.OOOOOOs.',
    '....OOOOOO..',
    '....OOOOOO..',
    '...hhh.hhh..',
    '...hhh..hh..'
  ],
  climb2: [
    '....rrrrr...',
    '...rrrrrrrrr',
    '...hhhssksh.',
    '..hshssskkss',
    '..hshhsssshs',
    '..hhsssshhhh',
    '....ssssss..',
    '...rrOrrr...',
    '.s.rrOrrrr..',
    '.ssrrOOOOr..',
    '..srOyOOyOs.',
    '..s.OOOOOOs.',
    '....OOOOOO..',
    '....OOOOOO..',
    '...hhh.hhh..',
    '..hhh..hhh..'
  ]
};

const BM_HEAD = [
  '.....rrrrr......',
  '....rrrrrrrrr...',
  '....hhhsssksh...',
  '...hshsssskkss..',
  '...hshhssssskss.',
  '...hhssssshhhh..',
  '.....sssssss....'
];
// legs/torso variants of big Mario (rows 7..31 => 25 rows)
const BM_BODY_STAND = [
  '....rrrOrrr.....',
  '...rrrrOrrrOrr..',
  '..rrrrrOOOOOrrr.',
  '..rrrrOOOOOOrrr.',
  '.sssrOOyOOyOsss.',
  '.sssOOOOOOOOsss.',
  '.sssOOOOOOOOsss.',
  '.ss.OOOOOOOO.ss.',
  '....OOOOOOOO....',
  '...OOOOOOOOOO...',
  '..OOOOOOOOOOOO..',
  '..OOOO....OOOO..',
  '..OOOO....OOOO..',
  '..OOOO....OOOO..',
  '..OOO......OOO..',
  '..hhh......hhh..',
  '.hhhh......hhhh.',
  '.hhhhh....hhhhh.',
  '.hhhhh....hhhhh.',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................'
];
// All 25 rows must be exactly 16 wide; legs end by row 18 so the sprite is 7+19=26 tall;
// pad to 32 by stretching the legs/torso in buildBig below.

function stretchRows(rows, total) {
  // repeat the middle row until the sprite is `total` tall
  const out = rows.slice();
  const mid = Math.floor(rows.length * 0.55);
  while (out.length < total) out.splice(mid, 0, rows[mid]);
  return out;
}

const BM = {};
(function () {
  const trimmed = BM_BODY_STAND.filter(function (r) { return r.replace(/\./g, '').length > 0; });
  BM.stand = stretchRows(BM_HEAD.concat(trimmed), 32);
  function legs(variant) {
    const base = BM.stand.slice(0, 24);
    return base.concat(variant);
  }
  BM.walk1 = legs([
    '...OOOOOOOO.....',
    '..OOOOOOOOOO....',
    '.hhOOO..OOOO....',
    'hhhhh....OOO....',
    'hhhh.....hhhh...',
    '.........hhhh...',
    '................',
    '................'
  ]);
  BM.walk2 = legs([
    '....OOOOOOO.....',
    '....OOOOOOO.....',
    '....OOOOOOO.....',
    '....hhhhhh......',
    '...hhhhhhh......',
    '................',
    '................',
    '................'
  ]);
  BM.walk3 = legs([
    '...OOOOOOOO.....',
    '....OOOOOOOO....',
    '....OOO..OOOhh..',
    '....OOO...hhhhh.',
    '....hhh...hhhhh.',
    '................',
    '................',
    '................'
  ]);
  BM.jump = BM.stand.slice(0, 7).concat([
    '....rrrOrrrss...',
    '...rrrrOrrrrsss.',
    '..rrrrrOOOOrrss.',
    '.sssrrOOOOOOrr..',
    '.sssrOOyOOyOOs..',
    '..ssOOOOOOOOOO..',
    '....OOOOOOOOOO..',
    '....OOOOOOOOOO..',
    '...OOOOOOOOOOOO.',
    '..OOOOOOOOOOOOO.',
    '.hhOOOO..OOOOOO.',
    'hhhhOOO...OOOOO.',
    'hhhhh.....OOOhh.',
    'hhhh......hhhhh.',
    '..........hhhh..',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................'
  ]).slice(0, 32);
  BM.skid = BM.stand.map(function (r, i) { return i < 7 ? r : r; });
  BM.climb = BM.stand;
  // crouch is 22 rows tall: head 7 + 15
  BM.duck = BM_HEAD.concat([
    '....rrrOrrr.....',
    '...rrrrOrrrOrr..',
    '..rrrrrOOOOOrrr.',
    '.sssrOOyOOyOsss.',
    '.sssOOOOOOOOsss.',
    '.ss.OOOOOOOO.ss.',
    '...OOOOOOOOOO...',
    '..hhhOOOOOOhhh..',
    '.hhhhh....hhhhh.'
  ]);
})();

// pad every big frame to 16 wide / consistent height and fix row widths defensively
function normRows(rows, w, h) {
  const out = rows.map(function (r) { return r.slice(0, w).padEnd(w, '.'); });
  while (out.length < h) out.push('.'.repeat(w));
  return out.slice(0, h);
}

const marioCache = {};
function marioFrame(size, name, palIdx) {
  const key = size + name + palIdx;
  if (marioCache[key]) return marioCache[key];
  const src = size === 'big' ? BM : SM;
  const h = size === 'big' ? (name === 'duck' ? 16 : 32) : 16;
  let rows = src[name] || src.stand;
  rows = normRows(rows, size === 'big' ? 16 : 12, h);
  const map = MARIO_PALS[palIdx];
  return marioCache[key] = mkSprite(rows, map);
}

// ---------------------------------------------------------------- enemies
// Sprites are bottom-aligned inside their canvas so the feet sit on the hitbox bottom.
function bottomAlign(rows, w, h) {
  const out = rows.map(function (r) { return r.slice(0, w).padEnd(w, '.'); });
  while (out.length && /^\.*$/.test(out[out.length - 1])) out.pop();
  while (out.length < h) out.unshift('.'.repeat(w));
  return out.slice(out.length - h);
}

function goombaSprites() {
  const head = [
    '.....kkkkkk.....',
    '...kkooooookk...',
    '..kooooooooook..',
    '.kooooooooooook.',
    '.kookkooookkook.',
    'koookwkoookwkook',
    'kooowwkoookwwook',
    'koooowwwwwwwoook',
    'kooooooooooooook',
    '.kkoooooooookk..'
  ];
  const a = head.concat([
    '..kkcccccckkk...',
    '..kcccccccck....',
    '.kcccckkcccck...',
    '.kkkkk..kkkkk...'
  ]);
  const b = head.concat([
    '...kkccccccckk..',
    '....kcccccccck..',
    '....kccckkcccck.',
    '....kkkk..kkkkk.'
  ]);
  const flat = [
    '....kkkkkkkk....',
    '..kkooooooookk..',
    '.kookwkoookwkook',
    'kooowwkoookwwook',
    'kkkcccccccccckkk',
    '.kkkkkkkkkkkkkk.'
  ];
  return {
    a: mkSprite(bottomAlign(a, 16, 16)),
    b: mkSprite(bottomAlign(b, 16, 16)),
    flat: mkSprite(bottomAlign(flat, 16, 16))
  };
}

function koopaSprites() {
  // facing left, 16x24
  const top = [
    '......kkkk......',
    '.....kggggk.....',
    '....kgcwkggk....',
    '....kccwkcck....',
    '....kccccckk....',
    '.....kcccck.....',
    '....kkccckk.....',
    '...kggkkkggk....',
    '..kgGggggggGk...',
    '..kgGGggggggk...',
    '..kggGGgggggk...',
    '..kggggggggGk...',
    '..kgggggggggk...',
    '...kggggggggk...',
    '...kkgggggkkk...'
  ];
  const a = top.concat([
    '..kccckkkkcck...',
    '.kcccck..kcccck.',
    '.kcccck..kcccck.',
    '..kkkk....kkkk..'
  ]);
  const b = top.concat([
    '...kcccckkcccck.',
    '..kccccck.kcccck',
    '..kcccck...kkkk.',
    '...kkkk.........'
  ]);
  const shell = [
    '.....kkkkkk.....',
    '...kkggggggkk...',
    '..kgGggGgggGgk..',
    '.kgGGgggGGgggGk.',
    '.kgGgggggGgggGk.',
    '.kggggggggggggk.',
    '.kcckggggggkcck.',
    '.kccckkkkkkccck.',
    '..kcccccccccck..',
    '...kkkkkkkkkk...'
  ];
  return {
    a: mkSprite(bottomAlign(a, 16, 24)),
    b: mkSprite(bottomAlign(b, 16, 24)),
    shell: mkSprite(bottomAlign(shell, 16, 16))
  };
}

// ---------------------------------------------------------------- items
function itemSprites() {
  const mush = mkSprite([
    '.....kkkkkk.....',
    '...kkrrwwrrkk...',
    '..krrrwwwwrrrk..',
    '.krrwwrrrrwwrrk.',
    '.krwwwrrrrwwwrk.',
    'krrwwwrrrrwwwrrk',
    'krrrwrrrrrrwrrrk',
    'krrrrrrrrrrrrrrk',
    'kkkkrrrrrrrrkkkk',
    '.kkkkkkkkkkkkkk.',
    '..kcckcccckcck..',
    '..kcckcccckcck..',
    '..kccccccccck...'.slice(0, 16),
    '...kcccccccck...',
    '....kkkkkkkk....',
    '................'
  ]);
  const oneup = mkSprite([
    '.....kkkkkk.....',
    '...kkggwwggkk...',
    '..kgggwwwwgggk..',
    '.kggwwggggwwggk.',
    '.kgwwwggggwwwgk.',
    'kggwwwggggwwwggk',
    'kgggwgggggggwggk',
    'kggggggggggggggk',
    'kkkkgggggggkkkkk'.slice(0, 16),
    '.kkkkkkkkkkkkkk.',
    '..kcckcccckcck..',
    '..kcckcccckcck..',
    '..kccccccccck...'.slice(0, 16),
    '...kcccccccck...',
    '....kkkkkkkk....',
    '................'
  ]);
  const flowerCols = [
    { p: '#B53120', q: '#FCA044', f: '#EA9E22' },
    { p: '#000000', q: '#B53120', f: '#FCFCFC' },
    { p: '#B53120', q: '#FCFCFC', f: '#FCA044' },
    { p: '#FCA044', q: '#B53120', f: '#000000' }
  ];
  const flowers = flowerCols.map(function (m) {
    return mkSprite([
      '....kkkkkkkk....',
      '...kppppqqppk...',
      '..kpqqppqqppqk..',
      '..kpqffppffqpk..',
      '..kppffppffppk..',
      '...kppppppppk...',
      '..kkkppppppkkk..'.slice(0, 16),
      '.kggkkkppkkkggk.'.slice(0, 16),
      '.kgggkgggkgggk..'.slice(0, 16),
      '..kggggggggggk..'.slice(0, 16),
      '...kkkgggkkk....',
      '......kggk......',
      '..kggkkggkkggk..'.slice(0, 16),
      '...kggggggggk...',
      '....kkkkkkkk....',
      '................'
    ], { p: m.p, q: m.q, f: m.f });
  });
  const starCols = ['#FCC03C', '#B53120', '#FCFCFC', '#00A800'];
  const stars = starCols.map(function (c) {
    return mkSprite([
      '.......kk.......',
      '......kyyk......',
      '......kyyk......',
      '.....kyyyyk.....',
      '.....kyyyyk.....',
      'kkkkkyyyyyykkkkk'.slice(0, 16),
      '.kyyyyyyyyyyyyk.',
      '..kyyykyykyyyk..'.slice(0, 16),
      '...kyyyyyyyyk...'.slice(0, 16),
      '...kyyyyyyyyk...',
      '..kyyyyyyyyyyk..',
      '..kyyyykkyyyyk..',
      '.kyyyk....kyyyk.',
      '.kyykk....kkyyk.',
      '.kkk........kkk.',
      '................'
    ], { y: c });
  });
  return { mush: mush, oneup: oneup, flowers: flowers, stars: stars };
}

function coinSprites() {
  // 4 spin frames, 16 tall, centered in 16 wide
  const frames = [];
  const widths = [6, 4, 2, 4];
  for (let f = 0; f < 4; f++) {
    const c = mkCanvas(16, 16), x = c.getContext('2d');
    const w = widths[f], x0 = 8 - w;
    x.fillStyle = '#000000';
    x.fillRect(x0 - 1 + 1, 1, w * 2 - 2 + 2, 14);
    x.fillStyle = '#FCC03C';
    x.fillRect(x0 + 1, 2, w * 2 - 2, 12);
    if (w >= 4) { x.fillStyle = '#FCE0A8'; x.fillRect(x0 + 2, 3, 2, 10); }
    if (w >= 6) { x.fillStyle = '#C84C0C'; x.fillRect(x0 + 5, 4, 2, 8); }
    frames.push(c);
  }
  return frames;
}

function fireballSprites() {
  const base = [
    ['..kkk...', '.kyyyk..', 'kywwyyk.', 'kywyyyk.', '.kyyyk..', '..kkk...', '........', '........'],
    ['..kkk...', '.krrrk..', 'krwyrrk.', 'krwrrrk.', '.krrrk..', '..kkk...', '........', '........']
  ];
  const out = [];
  for (let i = 0; i < 4; i++) {
    const c = mkCanvas(8, 8), x = c.getContext('2d');
    x.translate(4, 4); x.rotate(i * Math.PI / 2); x.translate(-4, -4);
    x.drawImage(mkSprite(base[0].map(function (r) { return r.slice(0, 8).padEnd(8, '.'); }), { y: '#FCA044', w: '#FCFCFC', r: '#B53120' }), 0, 0);
    out.push(c);
  }
  const burst = [0, 1].map(function (i) {
    const c = mkCanvas(16, 16), x = c.getContext('2d');
    x.fillStyle = '#FCFCFC';
    const r = 3 + i * 3;
    for (let a = 0; a < 8; a++) {
      const ang = a * Math.PI / 4;
      x.fillRect(Math.round(8 + Math.cos(ang) * r) - 1, Math.round(8 + Math.sin(ang) * r) - 1, 2, 2);
    }
    x.fillStyle = '#FCA044'; x.fillRect(7, 7, 2, 2);
    return c;
  });
  return { balls: out, burst: burst };
}

// ---------------------------------------------------------------- tiles
function brickTile(base, hi, lo, courses) {
  const c = mkCanvas(16, 16), x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, 16, 16);
  x.fillStyle = hi;
  for (let i = 0; i < 4; i++) x.fillRect(0, i * 4, 16, 1);
  x.fillStyle = lo;
  for (let i = 0; i < 4; i++) x.fillRect(0, i * 4 + 3, 16, 1);
  for (let i = 0; i < 4; i++) {
    const off = (i % 2) ? 0 : 8;
    x.fillRect(off + 7 - 8 < 0 ? 7 : (i % 2 ? 3 : 7), i * 4, 1, 4);
    if (i % 2) x.fillRect(11, i * 4, 1, 4);
  }
  void courses;
  return c;
}

function bevelBlock(base, hi, lo, outline) {
  const c = mkCanvas(16, 16), x = c.getContext('2d');
  x.fillStyle = outline; x.fillRect(0, 0, 16, 16);
  x.fillStyle = base; x.fillRect(1, 1, 14, 14);
  x.fillStyle = hi; x.fillRect(1, 1, 14, 2); x.fillRect(1, 1, 2, 14);
  x.fillStyle = lo; x.fillRect(3, 13, 12, 2); x.fillRect(13, 3, 2, 12);
  return c;
}

function groundTile(base, hi, lo) {
  const c = mkCanvas(16, 16), x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, 16, 16);
  x.fillStyle = lo;
  x.fillRect(0, 15, 16, 1); x.fillRect(15, 0, 1, 16);
  x.fillRect(0, 7, 16, 1);
  x.fillRect(7, 0, 1, 7); x.fillRect(3, 8, 1, 7); x.fillRect(11, 8, 1, 7);
  x.fillStyle = hi;
  x.fillRect(0, 0, 7, 1); x.fillRect(8, 0, 7, 1); x.fillRect(0, 8, 3, 1); x.fillRect(4, 8, 7, 1); x.fillRect(12, 8, 3, 1);
  x.fillRect(0, 0, 1, 7);
  return c;
}

function questionTiles() {
  const fills = [
    { f: '#FCA044', s: '#C84C0C', q: '#FCE0A8', qs: '#C84C0C' },
    { f: '#E49C1C', s: '#C84C0C', q: '#FCC03C', qs: '#9C4B0C' },
    { f: '#C84C0C', s: '#9C4B0C', q: '#E49C1C', qs: '#000000' }
  ];
  const qshape = [
    '..kkkk..',
    '.kkkkkk.',
    '.kk..kk.',
    '....kk..',
    '...kk...',
    '...kk...',
    '........',
    '...kk...'
  ];
  return fills.map(function (m) {
    const c = mkCanvas(16, 16), x = c.getContext('2d');
    x.fillStyle = '#000'; x.fillRect(0, 0, 16, 16);
    x.fillStyle = m.f; x.fillRect(1, 1, 14, 14);
    x.fillStyle = m.s; x.fillRect(2, 14, 13, 1); x.fillRect(14, 2, 1, 13);
    x.fillStyle = '#000';
    x.fillRect(0, 0, 1, 1); x.fillRect(15, 0, 1, 1); x.fillRect(0, 15, 1, 1); x.fillRect(15, 15, 1, 1);
    x.fillRect(2, 2, 1, 1); x.fillRect(13, 2, 1, 1); x.fillRect(2, 13, 1, 1); x.fillRect(13, 13, 1, 1);
    for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
      if (qshape[j][i] === 'k') {
        x.fillStyle = m.qs; x.fillRect(4 + i + 1, 4 + j + 1, 1, 1);
        x.fillStyle = m.q; x.fillRect(4 + i, 4 + j, 1, 1);
      }
    }
    return c;
  });
}

function pipeImages() {
  const top = mkCanvas(32, 16), tx = top.getContext('2d');
  const body = mkCanvas(32, 16), bx = body.getContext('2d');
  function stripes(x, x0, w, h, y0) {
    x.fillStyle = '#00A800'; x.fillRect(x0, y0, w, h);
    x.fillStyle = '#80D010'; x.fillRect(x0 + 3, y0, 4, h);
    x.fillStyle = '#80D010'; x.fillRect(x0 + 9, y0, 2, h);
    x.fillStyle = '#005800'; x.fillRect(x0 + w - 7, y0, 7, h);
    x.fillStyle = '#00A800'; x.fillRect(x0 + w - 7, y0, 2, h);
  }
  tx.fillStyle = '#000'; tx.fillRect(0, 0, 32, 16);
  stripes(tx, 1, 30, 14, 1);
  bx.fillStyle = '#000'; bx.fillRect(2, 0, 28, 16);
  stripes(bx, 3, 26, 16, 0);
  return { top: top, body: body };
}

function castleImage() {
  const c = mkCanvas(80, 80), x = c.getContext('2d');
  const brick = brickTile('#C84C0C', '#FCBCB0', '#000', 4);
  const dark = '#000';
  function tiles(tx, ty, w, h) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) x.drawImage(brick, (tx + i) * 16, (ty + j) * 16);
  }
  tiles(1, 0, 3, 1);          // battlement strip (simplified)
  x.clearRect(32, 0, 16, 16); // gap between merlons
  x.clearRect(16, 0, 0, 0);
  tiles(0, 1, 5, 0);
  // top row: merlons at 0,2,4? Build: row0 merlons, row1 wall band
  x.clearRect(0, 0, 80, 80);
  for (const i of [1, 3]) x.drawImage(brick, i * 16, 0);
  for (let i = 0; i < 5; i++) x.drawImage(brick, i * 16, 16);
  for (const i of [0, 2, 4]) x.drawImage(brick, i * 16, 32);
  for (let j = 3; j < 5; j++) for (let i = 0; i < 5; i++) x.drawImage(brick, i * 16, j * 16);
  // window band
  x.fillStyle = dark; x.fillRect(16 + 4, 40 - 8, 8, 12); x.fillRect(48 + 4, 40 - 8, 8, 12);
  x.fillStyle = dark; x.fillRect(20, 36, 8, 8); x.fillRect(52, 36, 8, 8);
  x.fillRect(32, 32, 16, 0);
  // door
  x.fillStyle = dark; x.fillRect(32, 48, 16, 32);
  x.beginPath(); x.arc(40, 48, 8, Math.PI, 0); x.fill();
  return c;
}

function flagImages() {
  // left-pointing pennants; the pole is on the right edge
  function pennant(w, h, emblem) {
    const mid = (h - 1) / 2;
    const c = maskImage(w, h, function (i, j) {
      return i >= Math.round(Math.abs(j - mid) * (w / 2 / (mid + 0.5))) ;
    }, '#FCFCFC', '#000000');
    if (emblem) {
      const x = c.getContext('2d');
      x.fillStyle = '#00A800';
      const cx = Math.round(w * 0.62), cy = Math.round(mid);
      x.fillRect(cx - 1, cy - 2, 3, 1); x.fillRect(cx - 2, cy - 1, 5, 2); x.fillRect(cx - 1, cy + 1, 3, 1); x.fillRect(cx - 1, cy + 2, 1, 1); x.fillRect(cx + 1, cy + 2, 1, 1);
    }
    return c;
  }
  const ball = mkSprite([
    '..kkkk..',
    '.kGGggk.',
    'kGGggggk',
    'kGgggggk',
    'kggggggk',
    'kggggddk',
    '.kggddk.',
    '..kkkk..'
  ]);
  return { flag: pennant(16, 15, true), ball: ball, castleFlag: pennant(16, 9, true) };
}

// ---------------------------------------------------------------- scenery
function hillImage(size) {
  // size 'L' = 80x35, 'S' = 48x19
  const w = size === 'L' ? 80 : 48, h = size === 'L' ? 35 : 19;
  const c = mkCanvas(w, h), x = c.getContext('2d');
  const id = x.createImageData(w, h);
  function set(i, j, col) {
    const k = (j * w + i) * 4, v = parseInt(col.slice(1), 16);
    id.data[k] = v >> 16; id.data[k + 1] = (v >> 8) & 255; id.data[k + 2] = v & 255; id.data[k + 3] = 255;
  }
  const rx = w / 2, ry = h;
  function inside(i, j, grow) {
    const dx = (i + 0.5 - rx) / (rx - 0.5 + grow), dy = (j + 0.5 - ry) / (ry + grow);
    return dx * dx + dy * dy <= 1 && j < h;
  }
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    if (inside(i, j, 0.4)) {
      if (!inside(i, j, -1.6)) set(i, j, '#000000'); else set(i, j, '#00A800');
    }
  }
  x.putImageData(id, 0, 0);
  // shading bands and eyes
  x.fillStyle = '#005800';
  const eyes = size === 'L' ? [[31, 12], [47, 12], [39, 20]] : [[19, 8], [27, 8]];
  const eh = size === 'L' ? 6 : 4;
  eyes.forEach(function (e, idx) {
    if (size === 'L' && idx === 2) return;
    x.fillRect(e[0], e[1], 2, eh);
  });
  x.fillStyle = '#005800';
  if (size === 'L') { x.fillRect(12, 24, 3, 3); x.fillRect(64, 24, 3, 3); x.fillRect(22, 19, 3, 3); x.fillRect(54, 19, 3, 3); }
  else { x.fillRect(9, 13, 2, 3); x.fillRect(37, 13, 2, 3); }
  return c;
}

// Draw a filled shape given an inside(i, j) test; 1px outline where fill meets empty.
function maskImage(w, h, inside, fill, outline, hilite) {
  const c = mkCanvas(w, h), x = c.getContext('2d');
  function at(i, j) { return i >= 0 && j >= 0 && i < w && j < h && inside(i, j); }
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    if (!at(i, j)) continue;
    const edge = !at(i - 1, j) || !at(i + 1, j) || !at(i, j - 1) || !at(i, j + 1);
    x.fillStyle = edge ? outline : (hilite && hilite(i, j) ? hilite.color : fill);
    x.fillRect(i, j, 1, 1);
  }
  return c;
}

function bushImage(n) {
  const w = n * 16 + 16, h = 16;
  const centers = [];
  for (let i = 0; i <= n; i++) centers.push(8 + i * 16);
  const hi = function (i, j) { return j >= 5 && j <= 6 && (i % 16) >= 3 && (i % 16) <= 6; };
  hi.color = '#80D010';
  return maskImage(w, h, function (i, j) {
    if (j >= 14) return true;
    return centers.some(function (cx) {
      const dx = i + 0.5 - cx, dy = j + 0.5 - 12;
      return dx * dx + dy * dy <= 8.4 * 8.4;
    });
  }, '#00A800', '#000000', hi);
}

function cloudImage(n) {
  const w = n * 16 + 16, h = 24;
  const low = [], high = [];
  for (let i = 0; i <= n; i++) low.push(8 + i * 16);
  for (let i = 0; i < n; i++) high.push(16 + i * 16);
  return maskImage(w, h, function (i, j) {
    if (j >= 14 && j <= 21 && i >= 8 && i < w - 8) return true;
    return low.some(function (cx) { const dx = i + 0.5 - cx, dy = j + 0.5 - 15; return dx * dx + dy * dy <= 7.6 * 7.6; }) ||
      high.some(function (cx) { const dx = i + 0.5 - cx, dy = j + 0.5 - 10; return dx * dx + dy * dy <= 8.4 * 8.4; });
  }, '#FCFCFC', '#3CBCFC');
}

// ---------------------------------------------------------------- font
const FONT_SRC = {
  '0': '01110100011001110101110011000101110', '1': '00100011000010000100001000010001110',
  '2': '01110100010000100010001000100011111', '3': '11110000010000101110000010000111110',
  '4': '00010001100101010010111110001000010', '5': '11111100001111000001000011000101110',
  '6': '00110010001000011110100011000101110', '7': '11111000010001000100010000100001000',
  '8': '01110100011000101110100011000101110', '9': '01110100011000101111000010001001100',
  A: '01110100011000111111100011000110001', B: '11110100011000111110100011000111110',
  C: '01110100011000010000100001000101110', D: '11100100101000110001100011001011100',
  E: '11111100001000011110100001000011111', F: '11111100001000011110100001000010000',
  G: '01110100011000010111100011000101111', H: '10001100011000111111100011000110001',
  I: '01110001000010000100001000010001110', J: '00111000100001000010000101001001100',
  K: '10001100101010011000101001001010001', L: '10000100001000010000100001000011111',
  M: '10001110111010110101100011000110001', N: '10001110011010110011100011000110001',
  O: '01110100011000110001100011000101110', P: '11110100011000111110100001000010000',
  Q: '01110100011000110001101011001001101', R: '11110100011000111110101001001010001',
  S: '01111100001000001110000010000111110', T: '11111001000010000100001000010000100',
  U: '10001100011000110001100011000101110', V: '10001100011000110001100010101000100',
  W: '10001100011000110101101011101110001', X: '10001100010101000100010101000110001',
  Y: '10001100010101000100001000010000100', Z: '11111000010001000100010001000011111',
  '-': '00000000000000000000111110000000000', 'x': '00000100010101000100010101000100000',
  '!': '00100001000010000100001000000000100', '.': '00000000000000000000000000110001100',
  ':': '00000011000110000000011000110000000', '=': '00000000001111100000111110000000000',
  '+': '00000001000010011111001000010000000', '*': '00000101010111011111011101010100000',
  "'": '00100001000100000000000000000000000', ',': '00000000000000000000001100010001000',
  '?': '01110100010000100010001000000000100', '/': '00001000010001000100010001000010000',
  '(': '00010001000100001000010000010000010', ')': '01000001000001000010000100010001000'
};
const fontGlyphs = {};
function fontGlyph(ch, color) {
  const key = ch + color;
  if (fontGlyphs[key]) return fontGlyphs[key];
  const src = FONT_SRC[ch];
  if (!src) return null;
  const c = mkCanvas(8, 8), x = c.getContext('2d');
  x.fillStyle = color;
  for (let j = 0; j < 7; j++) for (let i = 0; i < 5; i++) {
    if (src[j * 5 + i] === '1') x.fillRect(i + 1, j + 1, 1, 1);
  }
  return fontGlyphs[key] = c;
}
function drawText(ctx, str, x, y, color) {
  str = String(str).toUpperCase();
  for (let i = 0; i < str.length; i++) {
    const g = fontGlyph(str[i], color || '#FCFCFC');
    if (g) ctx.drawImage(g, x + i * 8, y);
  }
}
// tiny 3x5 digits for score popups
const TINY = {
  '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111',
  '4': '101101111001001', '5': '111100111001111', '6': '111100111101111', '7': '111001001010010',
  '8': '111101111101111', '9': '111101111001111', 'U': '101101101101111', 'P': '111101111100100'
};
function drawTiny(ctx, str, x, y) {
  str = String(str);
  ctx.fillStyle = '#FCFCFC';
  for (let n = 0; n < str.length; n++) {
    const g = TINY[str[n]];
    if (!g) continue;
    for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (g[j * 3 + i] === '1') ctx.fillRect(x + n * 4 + i, y + j, 1, 1);
  }
}

// ---------------------------------------------------------------- asset bundle
const ART = {};
function buildArt() {
  ART.goomba = goombaSprites();
  ART.koopa = koopaSprites();
  ART.koopaR = { a: flipped(ART.koopa.a), b: flipped(ART.koopa.b) };
  ART.item = itemSprites();
  ART.coin = coinSprites();
  ART.fire = fireballSprites();
  ART.q = questionTiles();
  ART.pipe = pipeImages();
  ART.flag = flagImages();
  ART.castle = castleImage();
  ART.hillL = hillImage('L');
  ART.hillS = hillImage('S');
  ART.bush = [null, bushImage(1), bushImage(2), bushImage(3)];
  ART.cloud = [null, cloudImage(1), cloudImage(2), cloudImage(3)];
  ART.theme = {
    over: {
      bg: '#5C94FC',
      ground: groundTile('#C84C0C', '#FCBCB0', '#000000'),
      brick: brickTile('#C84C0C', '#FCBCB0', '#000000'),
      hard: bevelBlock('#C84C0C', '#FCBCB0', '#9C4B0C', '#000000'),
      used: bevelBlock('#9C4B0C', '#C84C0C', '#5C2A08', '#000000')
    },
    under: {
      bg: '#000000',
      ground: groundTile('#0058F8', '#3CBCFC', '#000000'),
      brick: brickTile('#0058F8', '#3CBCFC', '#000000'),
      hard: bevelBlock('#0058F8', '#3CBCFC', '#002088', '#000000'),
      used: bevelBlock('#9C4B0C', '#C84C0C', '#5C2A08', '#000000')
    }
  };
  // horizontal exit pipe for the bonus room: rotate vertical pipe (mouth up -> mouth left)
  const hp = mkCanvas(48, 32), hx = hp.getContext('2d');
  hx.translate(0, 32); hx.rotate(-Math.PI / 2);
  hx.drawImage(ART.pipe.top, 0, 0);
  hx.drawImage(ART.pipe.body, 0, 16);
  hx.drawImage(ART.pipe.body, 0, 32);
  ART.hpipe = hp;
}
