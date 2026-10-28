'use strict';
// World 1-1: the overworld stage plus its underground coin room, laid out in 16x16 tiles.
// Layout is reproduced from memory of the original; positions are tile coordinates.

const T = { AIR: 0, GROUND: 1, BRICK: 2, Q: 3, USED: 4, HARD: 5, PIPE_TL: 6, PIPE_TR: 7, PIPE_BL: 8, PIPE_BR: 9, HIDDEN: 10 };
const ROWS = 15, GROUND_ROW = 13;

function makeArea(theme, w) {
  return {
    theme: theme, w: w, h: ROWS,
    tiles: new Uint8Array(w * ROWS),
    blocks: {},      // "x,y" -> { content, hits, timer }
    enemies: [], coins: [], scenery: [], pipes: [],
    start: { x: 40, y: 192 }
  };
}

function setTile(a, x, y, t) { if (x >= 0 && x < a.w && y >= 0 && y < a.h) a.tiles[y * a.w + x] = t; }
function getTile(a, x, y) {
  if (y < 0) return T.AIR;
  if (x < 0 || x >= a.w) return T.AIR;
  if (y >= a.h) return T.AIR;
  return a.tiles[y * a.w + x];
}
function isSolid(t) { return t !== T.AIR && t !== T.HIDDEN; }

function addBlock(a, x, y, kind, content) {
  // kind: 'B' brick, '?' question, 'H' hidden
  const t = kind === 'B' ? T.BRICK : kind === '?' ? T.Q : T.HIDDEN;
  setTile(a, x, y, t);
  a.blocks[x + ',' + y] = { content: content || (kind === 'B' ? null : 'coin'), hits: 0, timer: 0 };
}

function addPipe(a, x, h, entry) {
  const top = GROUND_ROW - h;
  setTile(a, x, top, T.PIPE_TL); setTile(a, x + 1, top, T.PIPE_TR);
  for (let y = top + 1; y < GROUND_ROW; y++) { setTile(a, x, y, T.PIPE_BL); setTile(a, x + 1, y, T.PIPE_BR); }
  if (entry) a.pipes.push({ x: x, top: top, entry: entry });
}

function addStairs(a, x0, heights) {
  heights.forEach(function (h, i) {
    for (let j = 0; j < h; j++) setTile(a, x0 + i, GROUND_ROW - 1 - j, T.HARD);
  });
}

function buildWorld11() {
  const W = 212;
  const a = makeArea('over', W);
  const pits = [[69, 70], [86, 88], [153, 154]];
  for (let x = 0; x < W; x++) {
    if (pits.some(function (p) { return x >= p[0] && x <= p[1]; })) continue;
    setTile(a, x, 13, T.GROUND); setTile(a, x, 14, T.GROUND);
  }

  // question blocks / bricks
  addBlock(a, 16, 9, '?', 'coin');
  addBlock(a, 20, 9, 'B'); addBlock(a, 21, 9, '?', 'power'); addBlock(a, 22, 9, 'B');
  addBlock(a, 23, 9, '?', 'coin'); addBlock(a, 24, 9, 'B');
  addBlock(a, 22, 5, '?', 'coin');
  addBlock(a, 64, 8, 'H', 'oneup');
  addBlock(a, 77, 9, 'B'); addBlock(a, 78, 9, '?', 'power'); addBlock(a, 79, 9, 'B');
  for (let x = 80; x <= 87; x++) addBlock(a, x, 5, 'B');
  addBlock(a, 91, 5, 'B'); addBlock(a, 92, 5, 'B'); addBlock(a, 93, 5, 'B'); addBlock(a, 94, 5, '?', 'coin');
  addBlock(a, 94, 9, 'B', 'multicoin');
  addBlock(a, 100, 9, 'B'); addBlock(a, 101, 9, 'B', 'star');
  addBlock(a, 106, 9, '?', 'coin'); addBlock(a, 109, 9, '?', 'power'); addBlock(a, 112, 9, '?', 'coin');
  addBlock(a, 109, 5, '?', 'coin');
  addBlock(a, 118, 9, 'B');
  addBlock(a, 121, 5, 'B'); addBlock(a, 122, 5, 'B'); addBlock(a, 123, 5, 'B');
  addBlock(a, 128, 9, 'B'); addBlock(a, 129, 9, '?', 'coin'); addBlock(a, 130, 9, '?', 'coin'); addBlock(a, 131, 9, 'B');
  addBlock(a, 129, 5, 'B'); addBlock(a, 130, 5, 'B');
  addBlock(a, 168, 9, 'B'); addBlock(a, 169, 9, '?', 'power'); addBlock(a, 170, 9, 'B');

  // pipes (the fourth leads to the coin room)
  addPipe(a, 28, 2); addPipe(a, 38, 3); addPipe(a, 46, 4);
  addPipe(a, 57, 4, { to: 'bonus' });
  addPipe(a, 163, 2); addPipe(a, 179, 2);

  // stairs
  addStairs(a, 134, [1, 2, 3, 4]);
  addStairs(a, 140, [4, 3, 2, 1]);
  addStairs(a, 148, [1, 2, 3, 4, 4]);
  addStairs(a, 155, [4, 3, 2, 1]);
  addStairs(a, 181, [1, 2, 3, 4, 5, 6, 7, 8, 8]);

  // flagpole
  a.flagX = 198;                 // pole tile column
  setTile(a, 198, 12, T.HARD);   // base block
  a.castleX = 202;
  a.end = 212 * 16;

  // enemies: [type, tileX]
  [[22], [40], [51], [52.6], [80], [82], [97], [99], [114], [115], [124], [125], [128], [129.6], [174], [175.6]]
    .forEach(function (e) { a.enemies.push({ type: 'goomba', x: e[0] * 16, y: 13 * 16 - 16 }); });
  a.enemies.push({ type: 'koopa', x: 107 * 16, y: 13 * 16 - 24 });

  // scenery, repeating every 48 tiles
  for (let p = 0; p * 48 < W; p++) {
    const o = p * 48;
    a.scenery.push({ k: 'hillL', x: (o + 0) * 16, y: 208 - 35 });
    a.scenery.push({ k: 'hillS', x: (o + 16) * 16, y: 208 - 19 });
    [[8, 4, 1], [19, 3, 3], [27, 4, 2], [36, 3, 1], [43, 4, 3]].forEach(function (c) {
      a.scenery.push({ k: 'cloud', n: c[2], x: (o + c[0]) * 16, y: c[1] * 16 });
    });
    [[11, 3], [23, 1], [41, 2]].forEach(function (b) {
      a.scenery.push({ k: 'bush', n: b[1], x: (o + b[0]) * 16, y: 208 - 16 });
    });
  }
  return a;
}

function buildBonus() {
  const a = makeArea('under', 16);
  for (let x = 0; x < 16; x++) {
    setTile(a, x, 13, T.GROUND); setTile(a, x, 14, T.GROUND);
    setTile(a, x, 0, T.BRICK); setTile(a, x, 1, T.BRICK); setTile(a, x, 2, T.BRICK);
  }
  for (let y = 0; y < 13; y++) setTile(a, 0, y, T.BRICK);
  // horizontal exit pipe, mouth facing left
  for (let y = 11; y <= 12; y++) for (let x = 13; x <= 15; x++) setTile(a, x, y, T.HARD);
  a.hpipe = { x: 13, y: 11 };
  for (let x = 4; x <= 11; x++) a.coins.push({ x: x, y: 11 });
  for (let x = 5; x <= 10; x++) a.coins.push({ x: x, y: 9 });
  for (let x = 6; x <= 9; x++) a.coins.push({ x: x, y: 7 });
  a.start = { x: 40, y: 3 * 16 };
  a.fixed = true;     // no scrolling
  a.end = 16 * 16;
  return a;
}
