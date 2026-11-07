'use strict';
// The dungeon: a seeded floor of rooms and corridors, baked once into world-sized pixel buffers.
// Tile (i, j) projects with a 2:1 grid of 32x16 tiles; the camera looks from the +i+j side, so a
// wall hides the tiles up-screen of it. A wall is built tall only when no walkable floor lies in
// the screen column it would cover, otherwise it is a low stub: the hero is never hidden and the
// world needs no runtime cutaway. Floors, walls and static props are baked; barrels and chests
// stay dynamic so they can break and open.

// map size in tiles: dungeons and towns are 40x40, forests bigger (resizeWorld reallocates)
let MW = 40, MH = 40;
const VOID = 0, FLOOR = 1, WALL = 2;
const WALL_TALL = 64, WALL_LOW = 14;
const WY0 = WALL_TALL + 24;
let WX0 = MH * 16 + 24, WW = (MW + MH) * 16 + 48, WH = (MW + MH) * 8 + WY0 + 32;
const iso = (fi, fj) => [WX0 + (fi - fj) * 16, WY0 + (fi + fj) * 8];
// screen offset (dx, dy) in world px -> tile-space offset, isotropic on the ground
const screenToTile = (sx, sy) => [(sx / 16 + sy / 8) / 2, (sy / 8 - sx / 16) / 2];
const groundToTile = (x, y) => { const A = (x - WX0) + 2 * (y - WY0), B = 2 * (y - WY0) - (x - WX0); return [A / 32, B / 32]; };

const LV = {
  map: new Uint8Array(MW * MH), tall: new Uint8Array(MW * MH), solid: new Uint8Array(MW * MH),
  roomOf: new Int16Array(MW * MH), rooms: [], start: null, stairs: null, spawns: [], decor: [],
  seen: new Uint8Array(MW * MH), vis: new Float32Array(MW * MH), reserve: new Uint8Array(MW * MH), level: 1, seed: 1,
};
// floor themes rotate every two floors: crypt, caves, hell
const THEMES = {
  crypt: { name: 'CRYPT', ramp: S, torch: 0.4, banners: true },
  caves: { name: 'CAVES', ramp: CAVE, torch: 0.16, banners: false },
  hell: { name: 'HELL', ramp: HELL, torch: 0.24, banners: true },
  town: { name: 'TOWN', ramp: S, torch: 0 }, forest: { name: 'FOREST', ramp: S, torch: 0 },
};
const TH = () => THEMES[LV.theme || 'crypt'];
// a stone tone on the 0..8 scale, mapped into the current theme's ramp
const ST = t => { const r = TH().ramp; return r[clamp(Math.round(t * (r.length - 1) / 8), 0, r.length - 1)]; };
function vnoise(x, y, sc, seed) {
  const xs = x / sc, ys = y / sc, xi = Math.floor(xs), yi = Math.floor(ys), fx = xs - xi, fy = ys - yi;
  const a = hash(xi, yi, seed), b = hash(xi + 1, yi, seed), c = hash(xi, yi + 1, seed), d = hash(xi + 1, yi + 1, seed);
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const tileAt = (i, j) => (i < 0 || j < 0 || i >= MW || j >= MH) ? VOID : LV.map[j * MW + i];
const tIdx = (i, j) => j * MW + i;
function blocked(fi, fj) {
  const i = Math.floor(fi), j = Math.floor(fj);
  if (i < 0 || j < 0 || i >= MW || j >= MH) return true;
  const k = j * MW + i;
  if (LV.map[k] !== FLOOR) return true;
  const s = LV.solid[k];
  if (s === 2) { const dx = fi - i - 0.5, dy = fj - j - 0.5; return dx * dx + dy * dy < ROUND_R2; }   // round 47: a tree or a rock is round to bump into
  if (s === 3) { const ax = Math.abs(fi - i - 0.5) - 0.18, ay = Math.abs(fj - j - 0.5) - 0.18; return ax <= 0 || ay <= 0 || ax * ax + ay * ay < 0.1024; }   // round 48c: the thick forest's rim: a square with rounded corners (edges still meet, so nothing slips between; bodies slide along a diagonal edge)
  return s === 1;
}
// LV.solid: 1 = the whole tile blocks (walls of props, buildings, the forest edge); 2 = a round
// obstacle in its middle (trees, rocks) that bodies slide around; 3 = the whole tile with its corners rounded (the Hollow's thick forest rim). Paths and line of sight treat both
// as blocked tiles; only body movement sees the round shape.
const ROUND_R = 0.36, ROUND_R2 = ROUND_R * ROUND_R;
// line of sight across tiles (walls block, props don't)
function los(a, b, c, d) {
  const n = Math.ceil(Math.max(Math.abs(c - a), Math.abs(d - b)) * 3) + 1;
  for (let s = 1; s < n; s++) { const t = s / n; if (tileAt(Math.floor(a + (c - a) * t), Math.floor(b + (d - b) * t)) !== FLOOR) return false; }
  return true;
}

// ---------------------------------------------------------------- generation
function resizeWorld(mw, mh) {
  if (mw === MW && mh === MH) return;
  MW = mw; MH = mh; WX0 = MH * 16 + 24; WW = (MW + MH) * 16 + 48; WH = (MW + MH) * 8 + WY0 + 32;
  const n = MW * MH, p = WW * WH;
  LV.map = new Uint8Array(n); LV.tall = new Uint8Array(n); LV.solid = new Uint8Array(n); LV.roomOf = new Int16Array(n); LV.seen = new Uint8Array(n); LV.vis = new Float32Array(n); LV.reserve = new Uint8Array(n);
  floorBuf = new Uint8Array(p); wIdx2 = new Uint8Array(p * 4); wIdx = new Uint8Array(p); wZ = new Uint8Array(p); wFloor = new Uint8Array(p); wTile = new Int16Array(p);
  staticLight[0] = new Float32Array(p); staticLight[1] = new Float32Array(p);
}
function genLevel(level, seed, side = null) {
  // levels cycle town -> forest -> three dungeon floors (outdoor.js); LV.diff drives difficulty.
  // A side area (quests.js SIDES) is a short dungeon floor hanging off the hub at the hub's level
  const A0 = areaOf(level), sd = side && SIDES[side].diff ? SIDES[side].diff + A0.cyc * 3 : A0.diff, A = side ? { kind: 'dungeon', cyc: A0.cyc, act: A0.act, loop: A0.loop, floor: 1, depth: A0.cyc * 3 + 1, diff: sd } : A0;   // (round 48c: a side area may be harder than its hub: the barrow)
  LV.side = side; LV.sideCfg = side ? SIDES[side] : null;
  { const big = A.kind === 'forest' || A.hub, floorBig = A.kind === 'dungeon' && !side && !A.arena; const hs = A.hub && !side ? 100 : big ? 64 : floorBig ? 62 : 46; resizeWorld(hs, hs); }   // (round 68a: wider halls and rooms further apart: 62 / 46, were 56 / 40)   // round 41: the hub 84x84   // round 38: dungeon floors 56x56 (were 40)
  LV.area = A.kind; LV.cyc = A.cyc; LV.act = A.act; LV.loop = A.loop; LV.floor = A.floor || 0; LV.arena = A.arena || null;
  LV.depth = A.depth || 0; LV.diff = A.diff; LV.outdoor = A.kind !== 'dungeon'; LV.hub = !!A.hub; LV.riv = !!A.riv && !side; LV.gateSign = null; LV.gateOpen = false; LV.autumn = A.act === 1; LV.night = A.kind !== 'dungeon' && A.act === 2; LV.plaza = null; LV.npcs = []; LV.critters = []; LV.champsPlanned = false; LV.genFail = null;
  if (typeof syncLightTables === 'function') syncLightTables(LV.outdoor);   // round 48
  if (LV.outdoor) { LV.theme = A.kind; genOutdoor(level, seed, A); LV.level = level; LV.seed = seed; return; }
  LV.theme = LV.sideCfg ? LV.sideCfg.theme : ACTS[A.act].theme;   // each act's dungeon keeps one theme: crypt, caves, hell
  if (LV.arena) { genArena(LV.arena, seed); LV.level = level; LV.seed = seed; return; }
  // reject and retry: each attempt has its own derived seed, so a seed always lands on the same
  // level; after 20 strict failures the checks on shape (not on reachability) are relaxed
  for (let attempt = 0; attempt < 30; attempt++) {
    if (tryGen(LV.diff, (seed + attempt * 7919) >>> 0, attempt >= 20)) { LV.level = level; LV.seed = seed; LV.genAttempts = attempt + 1; if (side) sideExtras(side); return; }
  }
  throw new Error('level generation failed');
}
function tryGen(level, seed, relaxed = false) {
  const R = rng(seed), map = LV.map;
  map.fill(VOID); LV.solid.fill(0); LV.roomOf.fill(-1); LV.seen.fill(0); LV.vis.fill(0); LV.reserve.fill(0);
  const rooms = [];
  const cfg = LV.sideCfg, maxRooms = cfg ? cfg.rooms : 10;
  // round 38: rooms come from templates (the user: rooms too small, no wide open spaces, no variety).
  // Every full floor gets one great hall; the rest is a mix of ordinary rooms, round caverns,
  // crossroads, long galleries, L-shaped rooms and small side rooms. Each room keeps its bounding
  // box (x, y, w, h: what decor and spawns sample) and carves its shape inside it.
  const TPL = {
    room: () => ({ w: R.int(7, 11), h: R.int(7, 11), shape: 'rect', type: R.pick(['crypt', 'hall', 'store', 'crypt']) }),
    hall: () => ({ w: R.int(14, 18), h: R.int(10, 13), shape: 'rect', type: 'hall', great: true }),
    cavern: () => { const d = R.int(12, 16); return { w: d, h: d + R.int(-1, 1), shape: 'round', type: 'crypt' }; },
    cross: () => { const d = R.int(13, 15); return { w: d, h: d, shape: 'cross', type: 'crypt' }; },
    gallery: () => { const a = R.int(16, 20), b = R.int(5, 6); return R() < 0.5 ? { w: a, h: b, shape: 'rect', type: 'hall' } : { w: b, h: a, shape: 'rect', type: 'hall' }; },
    ell: () => ({ w: R.int(11, 14), h: R.int(11, 14), shape: 'ell', flip: R.int(0, 3), type: R.pick(['crypt', 'store']) }),
    small: () => ({ w: R.int(5, 6), h: R.int(5, 6), shape: 'rect', type: 'store' }),
  };
  const pickTpl = () => { const p = R(); return p < 0.3 ? 'room' : p < 0.45 ? 'cavern' : p < 0.57 ? 'cross' : p < 0.69 ? 'gallery' : p < 0.81 ? 'ell' : 'small'; };
  const want = cfg ? null : ['room', 'hall'];   // the start is an ordinary room; one great hall per floor
  for (let t = 0; t < 600 && rooms.length < maxRooms; t++) {
    const kind = cfg ? (rooms.length ? R.pick(['room', 'room', 'cavern', 'small']) : 'room') : rooms.length < want.length ? want[rooms.length] : pickTpl();
    const T = TPL[kind](), w = T.w, h = T.h;
    if (w > MW - 6 || h > MH - 6) continue;
    const x = R.int(2, MW - w - 2), y = R.int(2, MH - h - 2);
    if (rooms.some(r => x < r.x + r.w + 5 && x + w + 5 > r.x && y < r.y + r.h + 5 && y + h + 5 > r.y)) continue;   // (round 68a: 5 apart, so the wider halls don't run into rooms)
    rooms.push(Object.assign(T, { kind, x, y, cx: x + (w >> 1), cy: y + (h >> 1) }));
  }
  if (rooms.length < (cfg ? 4 : 7) || (!cfg && !rooms.some(r => r.great))) return false;
  // a room's shape: which tiles of its box are floor
  const inShape = (r, i, j) => {
    const u = (i - r.x + 0.5) / r.w * 2 - 1, v = (j - r.y + 0.5) / r.h * 2 - 1;
    if (r.shape === 'round') { const a = Math.atan2(v, u), ragged = (LV.theme === 'caves' ? 0.16 : 0.07) * Math.sin(a * 5 + r.x) + (LV.theme === 'caves' ? 0.08 : 0.03) * Math.sin(a * 11 + r.y); return u * u + v * v <= (1 - ragged) ** 2; }
    if (r.shape === 'cross') { const arm = 0.38; return Math.abs(u) <= arm || Math.abs(v) <= arm; }
    if (r.shape === 'ell') { const fu = r.flip & 1 ? -u : u, fv = r.flip & 2 ? -v : v; return fu <= -0.1 || fv <= -0.1; }
    return true;
  };
  rooms.forEach((r, n) => {
    let area = 0;
    for (let j = r.y; j < r.y + r.h; j++) for (let i = r.x; i < r.x + r.w; i++) if (inShape(r, i, j)) { map[tIdx(i, j)] = FLOOR; LV.roomOf[tIdx(i, j)] = n; area++; }
    r.area = area;
    if (r.shape === 'ell') {   // its centre has to be on its floor: the middle of the corner square
      const qi = r.flip & 1 ? r.x + Math.floor(r.w * 0.78) : r.x + Math.floor(r.w * 0.22), qj = r.flip & 2 ? r.y + Math.floor(r.h * 0.78) : r.y + Math.floor(r.h * 0.22);
      r.cx = qi; r.cy = qj;
    }
  });
  // corridors: minimum spanning tree over room centers plus a couple of loops, 2 tiles wide (3 into a big room)
  // round 68a (the user: halls too slim; concept art: corridors 3-4 tiles wide): every corridor is 3
  // tiles wide, 4 into a big room, and kept clear (the user: pillars belong in big rooms, not halls)
  let wide = false;
  const OFF3 = [], OFF4 = []; for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) OFF3.push([a, b]); for (let b = -1; b <= 2; b++) for (let a = -1; a <= 2; a++) OFF4.push([a, b]);
  const carve = (i, j) => { for (const [a, b] of wide ? OFF4 : OFF3) if (i + a > 0 && j + b > 0 && i + a < MW - 1 && j + b < MH - 1) map[tIdx(i + a, j + b)] = FLOOR; };
  const edges = [];
  const corridor = (A, B) => {
    wide = (A.area > 120 || B.area > 120) && R() < 0.75;
    edges.push([rooms.indexOf(A), rooms.indexOf(B)]);
    const horizFirst = R() < 0.5;
    let i = A.cx, j = A.cy;
    const stepI = () => { while (i !== B.cx) { carve(i, j); i += Math.sign(B.cx - i); } };
    const stepJ = () => { while (j !== B.cy) { carve(i, j); j += Math.sign(B.cy - j); } };
    if (horizFirst) { stepI(); stepJ(); } else { stepJ(); stepI(); }
    carve(i, j);
  };
  const inTree = [0], d2 = (a, b) => (a.cx - b.cx) ** 2 + (a.cy - b.cy) ** 2;
  while (inTree.length < rooms.length) {
    let best = null;
    for (const a of inTree) for (let b = 0; b < rooms.length; b++) if (!inTree.includes(b)) { const d = d2(rooms[a], rooms[b]); if (!best || d < best[2]) best = [a, b, d]; }
    corridor(rooms[best[0]], rooms[best[1]]); inTree.push(best[1]);
  }
  // loops (round 26, Brogue's rule): join two nearby rooms only if the walk between them is long
  // (more than two rooms apart), so a loop is a real shortcut and not a doubled corridor
  const hops = a => { const h = rooms.map(() => -1), q = [a]; h[a] = 0; for (let x = 0; x < q.length; x++) for (const [u, v] of edges) { const o = u === q[x] ? v : v === q[x] ? u : -1; if (o >= 0 && h[o] < 0) { h[o] = h[q[x]] + 1; q.push(o); } } return h; };
  let loops = 0;
  for (let t = 0; t < 80 && loops < 2; t++) {
    const a = R.int(0, rooms.length - 1), b = R.int(0, rooms.length - 1);
    if (a === b || Math.sqrt(d2(rooms[a], rooms[b])) > 22 || hops(a)[b] <= 2) continue;
    corridor(rooms[a], rooms[b]); loops++;
  }
  buildWalls();
  LV.rooms = rooms; LV.edges = edges; LV.loops = loops;
  LV.start = rooms[0];
  // reachability from the start room; stairs go in the room farthest by walking distance
  const dist = bfs(LV.start.cx, LV.start.cy);
  for (let k = 0; k < MW * MH; k++) if (map[k] === FLOOR && dist[k] < 0) return false;
  let far = 1, fd = -1;
  rooms.forEach((r, n) => { const d = dist[tIdx(r.cx, r.cy)]; if (n && d > fd) { fd = d; far = n; } });
  if (!relaxed && fd < (cfg ? 16 : 24)) return false;   // the way down must be a real walk from the start
  if (!relaxed && cfg && cfg.bigLeader && rooms[far].kind === 'small') return false;   // round 67: a boss gets a real room to fight in
  LV.stairs = { i: rooms[far].cx, j: rooms[far].cy, room: far };
  if (cfg) {   // side areas: the way out is by the entrance, in the start room's corner farthest from its openings (round 68a: at the
    LV.leaderRoom = far; const r0 = rooms[0];   // fixed back corner, the walk out of the room often ran over it and threw you out)
    const opens = []; for (let j = r0.y - 1; j <= r0.y + r0.h; j++) for (let i = r0.x - 1; i <= r0.x + r0.w; i++) if ((i < r0.x || j < r0.y || i >= r0.x + r0.w || j >= r0.y + r0.h) && map[tIdx(i, j)] === FLOOR) opens.push([i, j]);
    let best = null, bd = -1;
    for (const [i, j] of [[r0.x + 1, r0.y + 1], [r0.x + r0.w - 2, r0.y + 1], [r0.x + 1, r0.y + r0.h - 2], [r0.x + r0.w - 2, r0.y + r0.h - 2]]) {
      if (map[tIdx(i, j)] !== FLOOR || LV.roomOf[tIdx(i, j)] !== 0) continue;
      const dmin = opens.reduce((m, [a, b]) => Math.min(m, Math.hypot(a - i, b - j)), 99); if (dmin > bd) { bd = dmin; best = [i, j]; }
    }
    best = best || [r0.x + 1, r0.y + 1]; LV.stairs = { i: best[0], j: best[1], room: 0, up: true };
  }
  LV.down = cfg && cfg.down ? { i: rooms[far].cx, j: rooms[far].cy, room: far } : null;   // round 67: the barrow's way down to its second floor, in the far room
  analyzeLayout(dist);
  if (LV.down) for (let b = -1; b <= 4; b++) for (let a = -1; a <= 4; a++) if (Math.abs(a - b) <= 1 || (a <= 1 && b <= 1)) { const i = LV.down.i + a, j = LV.down.j + b; if (i > 0 && j > 0 && i < MW && j < MH) LV.reserve[tIdx(i, j)] = 1; }   // kept clear, and its approach
  placeDecor(subRng(seed, 'decor'), level, dist);
  placeSpawns(subRng(seed, 'spawns'), level);
  const bad = validateLevel(relaxed);
  if (bad.length) { LV.genFail = bad; return false; }
  return true;
}
// Room roles and the reservation mask (round 26). Walking distance from the start gives each room
// a depth (0 near the start, 1 at the farthest); rooms the start-to-stairs walk passes through are
// the critical path; rooms with one way in are dead ends. Reserved tiles take no props: the
// stairs and their approach, the start, and every doorway where a corridor meets a room.
function analyzeLayout(dist) {
  const R0 = LV.rooms, res = LV.reserve, map = LV.map;
  let maxD = 1; for (let k = 0; k < MW * MH; k++) if (dist[k] > maxD) maxD = dist[k];
  LV.maxDist = maxD; LV.dist = dist;
  R0.forEach(r => { r.depth = dist[tIdx(r.cx, r.cy)] / maxD; r.deg = 0; r.crit = false; });
  for (const [a, b] of LV.edges) { if (a >= 0) R0[a].deg++; if (b >= 0) R0[b].deg++; }
  R0.forEach((r, n) => { r.dead = n > 0 && n !== LV.stairs.room && r.deg <= 1; });
  // the critical path: walk back from the stairs down the distance field
  let k = tIdx(LV.stairs.i, LV.stairs.j);
  for (let guard = 0; guard < MW * MH && dist[k] > 0; guard++) {
    const rn = LV.roomOf[k]; if (rn >= 0) R0[rn].crit = true;
    const i = k % MW, j = (k / MW) | 0;
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const kk = tIdx(i + a, j + b); if (i + a >= 0 && j + b >= 0 && i + a < MW && j + b < MH && dist[kk] === dist[k] - 1) { k = kk; break; } }
  }
  R0[0].crit = true;
  const mark = (ci, cj, r) => { for (let j = cj - r; j <= cj + r; j++) for (let i = ci - r; i <= ci + r; i++) if (i >= 0 && j >= 0 && i < MW && j < MH) res[tIdx(i, j)] = 1; };
  mark(LV.stairs.i, LV.stairs.j, 1); mark(LV.start.cx, LV.start.cy, 1);
  // the stairs' approach: the tiles in front of them on screen stay open too
  for (let s = 1; s <= 3; s++) mark(LV.stairs.i + s, LV.stairs.j + s, 0);
  // doorways: room-edge floor tiles that open onto corridor floor outside the room
  R0.forEach((r, n) => {
    for (let j = r.y - 1; j <= r.y + r.h; j++) for (let i = r.x - 1; i <= r.x + r.w; i++) {
      const inside = i >= r.x && i < r.x + r.w && j >= r.y && j < r.y + r.h; if (inside) continue;
      if (tileAt(i, j) !== FLOOR || LV.roomOf[tIdx(i, j)] >= 0) continue;
      mark(clamp(i, r.x, r.x + r.w - 1), clamp(j, r.y, r.y + r.h - 1), 1);
    }
  });
}
// The proof (round 26): checked on the finished level, after props and monsters, with the
// hero's real footprint. Any failure throws the level away and the next derived seed is tried.
function validateLevel(relaxed) {
  const bad = [], dist = bfs(LV.start.cx, LV.start.cy), S = LV.stairs;
  if (dist[tIdx(S.i, S.j)] < 0) bad.push('stairs unreachable');
  let floor = 0, open = 0;
  for (let k = 0; k < MW * MH; k++) if (LV.map[k] === FLOOR) { floor++; if (!LV.solid[k]) { open++; if (dist[k] < 0) { bad.push('floor cut off'); break; } } }
  if (!relaxed && floor < MW * MH * 0.16) bad.push('too little floor');
  // every chest and barrel has a reachable tile beside it
  for (const d of LV.decor) if (d.kind === 'chest') {
    let ok = false; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = tIdx(d.i + a, d.j + b); if (dist[k] >= 0) ok = true; }
    if (!ok) bad.push('chest unreachable');
  }
  // every monster stands on open, reachable ground with room for its body, outside the safe zone
  for (const sp of LV.spawns) {
    const k = tIdx(Math.floor(sp.fi), Math.floor(sp.fj));
    if (dist[k] < 0 || clearance(sp.fi, sp.fj, 0.28)) { bad.push('spawn blocked'); break; }
    if (dist[k] < SAFE_STEPS) { bad.push('spawn near start'); break; }
  }
  if (!LV.spawns.length) bad.push('no monsters');
  return bad;
}
const SAFE_STEPS = 7;   // no monster within this many steps of where the hero arrives
// true when a body of radius r at (fi, fj) would overlap a wall or a solid prop
const clearance = (fi, fj, r) => blocked(fi - r, fj - r) || blocked(fi + r, fj - r) || blocked(fi - r, fj + r) || blocked(fi + r, fj + r);
function buildWalls() {
  const map = LV.map;
  // walls around every floor tile
  for (let j = 0; j < MH; j++) for (let i = 0; i < MW; i++) {
    if (map[tIdx(i, j)] !== VOID) continue;
    let near = false;
    for (let b = -1; b <= 1 && !near; b++) for (let a = -1; a <= 1; a++) if (tileAt(i + a, j + b) === FLOOR) { near = true; break; }
    if (near) map[tIdx(i, j)] = WALL;
  }
  // tall walls: nothing walkable in the screen column they cover
  const rows = Math.ceil(WALL_TALL / 8) + 1;
  for (let j = 0; j < MH; j++) for (let i = 0; i < MW; i++) {
    if (map[tIdx(i, j)] !== WALL) { LV.tall[tIdx(i, j)] = 0; continue; }
    let clear = true;
    for (let s = 1; s <= rows && clear; s++) for (let a = 0; a <= s; a++) {
      const ii = i - a, jj = j - (s - a);   // tiles with i+j smaller by s, same screen column +-1
      if (Math.abs((ii - jj) - (i - j)) > 2) continue;
      if (tileAt(ii, jj) === FLOOR) { clear = false; break; }
    }
    LV.tall[tIdx(i, j)] = clear ? 1 : 0;
  }
}
function placeTorches(D) {
  // torches on tall walls facing floor, spaced apart
  const torches = [];
  for (let j = 0; j < MH; j++) for (let i = 0; i < MW; i++) {
    if (!LV.tall[tIdx(i, j)]) continue;
    const faceR = tileAt(i + 1, j) === FLOOR, faceL = tileAt(i, j + 1) === FLOOR;
    if (!faceR && !faceL) continue;
    if (hash(i, j, LV.seed) > TH().torch || torches.some(t => Math.abs(t.i - i) + Math.abs(t.j - j) < 5) || wallFeature(i, j)) continue;   // (round 68c: not on a niche or a collapsed stretch)
    torches.push({ kind: 'torch', i, j, face: faceL ? 'L' : 'R' });
  }
  D.push(...torches);
}
// Designed boss arenas (round 22), one per act, drawn as text: each character is a tile. Rows are j,
// columns are i (so a row runs down-right on screen, and the top-left is the top of the screen).
//   . floor   S start   X stairs   B boss   C chest   p pillar   b brazier   t statue   c coffin
//   n candles   g stalagmite   e egg sac   m glowing fungus   l lava crack   o bone pile
//   x bones   d blood   k skeleton   a archer   (blank = rock)
const ARENA_MAPS = {
  king: [
    "",
    "",
    "",
    "",
    "",
    "",
    "          ......................",
    "          .........x........a...",
    "          ......................",
    "          ....p...p...p...p...p.",
    "   .....  .t....................",
    "   .C...  .....b....k...........",
    "   ....................x........",
    "   ..X.......B..dx..............",
    "   .....  ............d.........",
    "   .....  .....b....k....x......",
    "          .t....................",
    "          ....p...p...p...p...p.",
    "          ......................",
    "          ..x...............a...",
    "          ......................",
    "                          ..",
    "                          ..",
    "                          ..",
    "                          .d",
    "                          ..",
    "                          ..",
    "                        ........",
    "                        c......n",
    "                        ........",
    "                        ...S....",
    "                        ........",
    "                        c......n",
    "                        ........",
  ],
  nest: [
    "",
    "",
    "              .......",
    "            ...........",
    "           .g....e....g.",
    "    ...   ...............",
    "   .C...  ...b.......x...",
    "   ..X....................",
    "   ..............B........",
    "    ...  ...e.........e...",
    "         .....m...........",
    "         ............b....",
    "          ...e.x....me..g",
    "          .g.............",
    "           ......e......",
    "            .......g....",
    "              .........",
    "                    ...m",
    "                     ...",
    "                      ...",
    "                        .m.",
    "                          ...",
    "                           ...",
    "                           ..b",
    "                          ...",
    "                            .",
    "                          m....",
    "                         .......",
    "                        ...b.....",
    "                        .........",
    "                        ....S....",
    "                         .....m.",
    "                          .....",
    "                            .",
  ],
  sanctum: [
    "",
    "",
    "",
    "                  .",
    "              .........",
    "             .....a.....",
    "           ...............",
    "           ...b......ob...",
    "          ....o............",
    "   ..C.   .................",
    "   ........................",
    "   .X.....t..k....B....k..t....",
    "   ............................",
    "   ....   .....................",
    "          ............o.... ...",
    "           ...bo......b...  ...",
    "           ...............  ...",
    "             .....a.....    ...",
    "              .........     l..",
    "                  .         ...",
    "                            ...",
    "                            ...",
    "                            ..l",
    "                            ...",
    "                            ...",
    "                            ...",
    "                            l..",
    "                            ...",
    "                          ........",
    "                          ........",
    "                          ........",
    "                          ....S...",
    "                          ........",
    "                          ........",
    "                          ........",
  ],
};
// an act's last floor: the designed arena from ARENA_MAPS, its boss and guards placed where drawn
function genArena(key, seed) {
  const R = rng(seed), map = LV.map, rows = ARENA_MAPS[key], act = ACTS[LV.act];
  map.fill(VOID); LV.solid.fill(0); LV.roomOf.fill(-1); LV.seen.fill(0); LV.vis.fill(0);
  const feats = [];
  rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const c = row[i]; if (c === ' ' || i < 1 || j < 1 || i >= MW - 1 || j >= MH - 1) continue; map[tIdx(i, j)] = FLOOR; if (c !== '.') feats.push([c, i, j]); } });
  buildWalls();
  const at = c => feats.find(f => f[0] === c), box = (c, r, type) => { const [, i, j] = at(c); return { x: i - r, y: j - r, w: r * 2 + 1, h: r * 2 + 1, cx: i, cy: j, type }; };
  LV.rooms = [box('S', 3, 'crypt'), box('B', 6, 'hall'), box('X', 2, 'store')];
  LV.rooms.forEach((r, n) => { for (let j = r.y; j < r.y + r.h; j++) for (let i = r.x; i < r.x + r.w; i++) if (tileAt(i, j) === FLOOR && LV.roomOf[tIdx(i, j)] < 0) LV.roomOf[tIdx(i, j)] = n; });
  LV.start = LV.rooms[0]; LV.stairs = { i: LV.rooms[2].cx, j: LV.rooms[2].cy, room: 2 };
  const d0 = bfs(LV.start.cx, LV.start.cy);
  for (let k = 0; k < MW * MH; k++) if (map[k] === FLOOR && d0[k] < 0) throw new Error(`arena ${key}: unreachable floor at ${k % MW},${Math.floor(k / MW)}`);
  const D = LV.decor = [], S = LV.spawns = [], seed6 = () => R.int(1, 1e6);
  const solid = (i, j) => { LV.solid[tIdx(i, j)] = 1; return true; };
  for (const [c, i, j] of feats) {
    const fi = i + 0.5, fj = j + 0.5;
    if (c === 'p') solid(i, j) && D.push({ kind: 'pillar', i, j });
    else if (c === 'b') solid(i, j) && D.push({ kind: 'brazier', i, j });
    else if (c === 't') solid(i, j) && D.push({ kind: 'statue', i, j, hell: LV.theme === 'hell' });
    else if (c === 'c') solid(i, j) && D.push({ kind: 'coffin', i, j, yaw: tileAt(i - 1, j) === WALL || tileAt(i + 1, j) === WALL ? Math.PI / 2 : 0 });
    else if (c === 'n') solid(i, j) && D.push({ kind: 'candles', i, j });
    else if (c === 'g') solid(i, j) && D.push({ kind: 'stalagmite', i, j, seed: seed6() % 7 });
    else if (c === 'o') solid(i, j) && D.push({ kind: 'bonepile', i, j, seed: seed6() % 5 });
    else if (c === 'e') solid(i, j) && D.push({ kind: 'egg', i, j, seed: seed6() });
    else if (c === 'C') solid(i, j) && D.push({ kind: 'chest', i, j, seed: seed6() });
    else if (c === 'm') D.push({ kind: 'mushroom', fi, fj, seed: seed6() % 6 });
    else if (c === 'l') D.push({ kind: 'lava', fi, fj, size: 4, seed: seed6() });
    else if (c === 'x') D.push({ kind: 'bones', fi, fj, seed: seed6() });
    else if (c === 'd') D.push({ kind: 'blood', fi, fj, size: 3, seed: seed6() });
    else if (c === 'B') S.push({ id: act.boss, fi, fj });
    else if (c === 'k') S.push({ id: 'skeleton', fi, fj });
    else if (c === 'a') S.push({ id: 'archer', fi, fj });
  }
  placeTorches(D);
}
function bfs(si, sj) {
  const dist = new Int16Array(MW * MH).fill(-1), q = [tIdx(si, sj)]; dist[q[0]] = 0;
  for (let h = 0; h < q.length; h++) {
    const k = q[h], i = k % MW, j = (k / MW) | 0;
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ii = i + a, jj = j + b; if (ii < 0 || jj < 0 || ii >= MW || jj >= MH) continue;
      const kk = tIdx(ii, jj); if (dist[kk] >= 0 || LV.map[kk] !== FLOOR || LV.solid[kk]) continue;
      dist[kk] = dist[k] + 1; q.push(kk);
    }
  }
  return dist;
}
// a tall pillar straight below the stairs on screen (same i - j, a little nearer) would cover them
const hidesStairs = (i, j) => { const s = LV.stairs; if (!s) return false; const a = i - s.i, b = j - s.j; return Math.abs(a - b) <= 1 && a + b > 0 && a + b <= 6; };
// props are only kept if every floor tile stays reachable with them in place
function trySolid(i, j) {
  const k = tIdx(i, j);
  if (LV.map[k] !== FLOOR || LV.solid[k] || LV.reserve[k]) return false;
  if (Math.abs(i - LV.start.cx) <= 1 && Math.abs(j - LV.start.cy) <= 1) return false;
  if (LV.stairs && Math.abs(i - LV.stairs.i) <= 1 && Math.abs(j - LV.stairs.j) <= 1) return false;
  if (LV.down && Math.abs(i - LV.down.i) <= 1 && Math.abs(j - LV.down.j) <= 1) return false;
  LV.solid[k] = 1;
  const d = bfs(LV.start.cx, LV.start.cy);
  for (let q = 0; q < MW * MH; q++) if (LV.map[q] === FLOOR && !LV.solid[q] && d[q] < 0) { LV.solid[k] = 0; return false; }
  return true;
}
function placeDecor(R, level) {
  const D = LV.decor = [];
  const wallSide = (i, j) => tileAt(i - 1, j) === WALL || tileAt(i, j - 1) === WALL || tileAt(i + 1, j) === WALL || tileAt(i, j + 1) === WALL;
  LV.rooms.forEach((r, n) => {
    const mine = (i, j) => LV.roomOf[tIdx(i, j)] === n;   // (shaped rooms: only tiles of this room's own floor)
    const th = LV.theme, interior = () => { for (let t = 0; t < 30; t++) { const i = R.int(r.x + 1, r.x + r.w - 2), j = R.int(r.y + 1, r.y + r.h - 2); if (mine(i, j) && Math.abs(i - r.cx) + Math.abs(j - r.cy) > 1) return [i, j]; } return [r.cx, r.cy]; };
    const nearWall = () => { for (let t = 0; t < 40; t++) { const i = R.int(r.x, r.x + r.w - 1), j = R.int(r.y, r.y + r.h - 1); if (mine(i, j) && wallSide(i, j)) return [i, j]; } return null; };
    if (th === 'crypt') {
      if (R() < 0.4) { const q = nearWall(); if (q && trySolid(...q)) D.push({ kind: 'coffin', i: q[0], j: q[1], yaw: tileAt(q[0] - 1, q[1]) === WALL || tileAt(q[0] + 1, q[1]) === WALL ? Math.PI / 2 : 0 }); }
      if (R() < 0.3) { const q = nearWall(); if (q && trySolid(...q)) D.push({ kind: 'candles', i: q[0], j: q[1] }); }
      if (R() < 0.25) { const q = interior(); if (trySolid(...q)) D.push({ kind: 'statue', i: q[0], j: q[1] }); }
    } else if (th === 'caves') {
      for (let n = 0; n < R.int(1, 3); n++) { const q = interior(); if (trySolid(...q)) D.push({ kind: 'stalagmite', i: q[0], j: q[1], seed: R.int(1, 1e6) % 7 }); }
      for (let n = 0; n < R.int(2, 5); n++) { const q = nearWall(); if (q) D.push({ kind: 'mushroom', fi: q[0] + 0.5, fj: q[1] + 0.5, seed: R.int(1, 1e6) % 6 }); }
    } else {
      if (R() < 0.35) { const q = interior(); if (trySolid(...q)) D.push({ kind: 'statue', i: q[0], j: q[1], hell: true }); }
      if (R() < 0.5) { const q = nearWall(); if (q && trySolid(...q)) D.push({ kind: 'bonepile', i: q[0], j: q[1], seed: R.int(1, 1e6) % 5 }); }
      if (n && R() < 0.7) { const q = interior(); D.push({ kind: 'lava', fi: q[0] + 0.5, fj: q[1] + 0.5, size: R.int(3, 6), seed: R.int(1, 1e6) }); }
    }
    // round 68a (the user: use pillars to break up big rooms, four in a large one, not along the walls):
    // pillars stand out on the floor, a third of the way in, so a fight goes round them
    const pillarAt = (fx, fy) => { const i = r.x + Math.round((r.w - 1) * fx), j = r.y + Math.round((r.h - 1) * fy); if (mine(i, j) && !hidesStairs(i, j) && Math.hypot(i - LV.stairs.i, j - LV.stairs.j) > 2.5 && trySolid(i, j)) D.push({ kind: 'pillar', i, j }); };
    if (r.great && th !== 'caves') {   // a great hall: two rows of three, a brazier in the middle
      const along = r.w >= r.h;
      for (const u of [0.2, 0.5, 0.8]) for (const v of [0.28, 0.72]) { if (u === 0.5) continue; along ? pillarAt(u, v) : pillarAt(v, u); }
      for (const v of [0.28, 0.72]) along ? pillarAt(0.5, v) : pillarAt(v, 0.5);
      if (n && trySolid(r.cx, r.cy)) D.push({ kind: 'brazier', i: r.cx, j: r.cy });
    } else if (r.great) {   // a great cavern: a ring of stalagmites
      for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283, i = Math.round(r.cx + Math.cos(a) * r.w * 0.3), j = Math.round(r.cy + Math.sin(a) * r.h * 0.3); if (trySolid(i, j)) D.push({ kind: 'stalagmite', i, j, seed: R.int(1, 1e6) % 7 }); }
    } else if (th !== 'caves' && n && r.w >= 10 && r.h >= 10 && (r.area || r.w * r.h) >= 90) {   // a large room: four pillars in a square
      for (const [u, v] of [[0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]]) pillarAt(u, v);
      if (r.type === 'hall' && trySolid(r.cx, r.cy)) D.push({ kind: 'brazier', i: r.cx, j: r.cy });
    } else if (r.type === 'hall' && r.w >= 7 && r.h >= 7 && th !== 'caves') {
      if (n && trySolid(r.cx, r.cy)) D.push({ kind: 'brazier', i: r.cx, j: r.cy });
    } else if (n && r.w * r.h >= 36 && R() < 0.5 && trySolid(r.cx, r.cy)) D.push({ kind: 'brazier', i: r.cx, j: r.cy });
    if (r.type === 'store' || R() < (LV.theme === 'caves' ? 0.15 : 0.4)) {
      const cnt = R.int(2, 4);
      for (let t = 0; t < 30 && D.filter(d => d.room === n && (d.kind === 'barrel' || d.kind === 'crate')).length < cnt; t++) {
        const i = R.int(r.x, r.x + r.w - 1), j = R.int(r.y, r.y + r.h - 1);
        if (!wallSide(i, j)) continue;
        if (trySolid(i, j)) D.push({ kind: R() < 0.65 ? 'barrel' : 'crate', i, j, room: n, seed: R.int(1, 1e6) });
      }
    }
    if (r.type === 'crypt' || R() < 0.3) {
      // floor clutter keeps a minimum spacing (a rejection pass, Poisson-style) so it never clumps
      const spaced = (minD) => { for (let t = 0; t < 20; t++) { const fi = r.x + 0.5 + R() * (r.w - 1), fj = r.y + 0.5 + R() * (r.h - 1); if (!D.some(d => (d.kind === 'bones' || d.kind === 'blood') && Math.hypot(d.fi - fi, d.fj - fj) < minD)) return [fi, fj]; } return null; };
      for (let b = 0; b < R.int(1, 3); b++) { const q = spaced(2.2); if (q) D.push({ kind: 'bones', fi: q[0], fj: q[1], seed: R.int(1, 1e6) }); }
      for (let b = 0; b < R.int(1, 3); b++) { const q = spaced(2.2); if (q) D.push({ kind: 'blood', fi: q[0], fj: q[1], size: R.int(2, 5), seed: R.int(1, 1e6) }); }
    }
  });
  // chests: one or two, against a wall, in dead ends and side rooms first (a reward for the detour)
  const side = LV.rooms.map((r, n) => n).filter(n => n > 0 && (LV.rooms[n].dead || !LV.rooms[n].crit));
  for (let c = 0; c < 1 + (R() < 0.5 ? 1 : 0); c++) {
    const n = side.length && R() < 0.8 ? R.pick(side) : R.int(1, LV.rooms.length - 1), r = LV.rooms[n];
    for (let t = 0; t < 60; t++) { const i = R.int(r.x, r.x + r.w - 1), j = t < 20 ? r.y : R.int(r.y, r.y + r.h - 1); if (LV.roomOf[tIdx(i, j)] !== n || !wallSide(i, j)) continue; if (trySolid(i, j)) { D.push({ kind: 'chest', i, j, seed: R.int(1, 1e6) }); break; } }   // against a wall of its own floor (shaped rooms)
  }
  placeTorches(D);
}
// Monsters (round 26): every room but the start gets a danger budget that grows with its walking
// distance from the start (0.6x near, 1.4x at the far end; the same total as before) plus a bonus
// in dead ends, and spends it on whole groups. A pack is placed as a footprint, every member checked
// for room to stand. Nothing spawns within SAFE_STEPS of the start. Champions are chosen afterward:
// capped, kept apart by walking distance, and put in side rooms before the critical path.
function placeSpawns(R, level) {
  const S = LV.spawns = [], dist = LV.dist;
  const cfg = LV.sideCfg, pool = cfg ? cfg.pool : Object.keys(MONSTERS).filter(id => !MONSTERS[id].unique && MONSTERS[id].where !== 'out' && (MONSTERS[id].minLevel || 1) <= level);
  const ok = (fi, fj) => {
    const i = Math.floor(fi), j = Math.floor(fj); if (i < 0 || j < 0 || i >= MW || j >= MH) return false;
    const k = tIdx(i, j);
    return LV.map[k] === FLOOR && !LV.solid[k] && dist[k] >= SAFE_STEPS && !clearance(fi, fj, 0.3) && !S.some(o => Math.abs(o.fi - fi) < 0.7 && Math.abs(o.fj - fj) < 0.7);
  };
  const spot = r => { for (let t = 0; t < 40; t++) { const fi = r.x + 0.5 + R() * (r.w - 1), fj = r.y + 0.5 + R() * (r.h - 1); if (ok(fi, fj)) return [fi, fj]; } return null; };
  const groups = [];
  LV.rooms.forEach((r, n) => {
    if (n === 0) return;
    const base = (2 + Math.floor(level * 0.8)) * clamp(Math.pow((r.area || r.w * r.h) / 64, 0.6), 0.75, 1.8);   // round 38: more in bigger rooms (capped so a great hall isn't a crowd)
    let budget = Math.round(base * (0.6 + 0.8 * r.depth) * (cfg ? 0.6 : 1)) + (r.dead ? 1 : 0);   // side areas are lighter
    while (budget > 0) {
      const id = R.pick(pool), m = MONSTERS[id], count = m.pack ? R.int(2, HEAVY ? 5 : 4) : 1;   // (round 62: HEAVY packs run a little bigger)
      budget -= m.pack ? 2 : 1;
      const c = spot(r); if (!c) continue;
      const g = { room: n, at: c, members: [] };
      for (let q = 0; q < count; q++) {
        let p = q === 0 ? c : null;
        for (let t = 0; t < 14 && !p; t++) { const a = R() * 6.283, d = 0.8 + R() * 0.7, cand = [c[0] + Math.cos(a) * d, c[1] + Math.sin(a) * d]; if (ok(cand[0], cand[1])) p = cand; }
        if (p) { S.push({ id, fi: p[0], fj: p[1] }); g.members.push(S.length - 1); }
      }
      groups.push(g);
    }
  });
  // champions
  const want = Math.min(3, Math.max(1, Math.round(S.length * champChance(level))));
  const order = groups.map((g, n) => ({ g, key: (LV.rooms[g.room].crit ? 1 : 0) + R() * 0.9 })).sort((a, b) => a.key - b.key).map(o => o.g);
  const champs = [];
  for (const g of order) {
    if (champs.length >= want) break;
    const d = bfs(Math.floor(g.at[0]), Math.floor(g.at[1]));
    if (champs.some(c => { const v = d[tIdx(Math.floor(c.at[0]), Math.floor(c.at[1]))]; return v >= 0 && v < 12; })) continue;
    champs.push(g); S[g.members[0]].champ = true;
  }
  LV.champsPlanned = true;
  if (cfg) { const r = LV.rooms[LV.leaderRoom], p = spot(r) || [r.cx + 0.5, r.cy + 0.5]; S.push({ id: cfg.boss, fi: p[0], fj: p[1] }); return; }   // the leader waits in the far room
  if (R() < 0.25) { const r = LV.rooms[R.int(1, LV.rooms.length - 1)], p = spot(r); if (p) S.push({ id: 'treasure', fi: p[0], fj: p[1] }); }   // now and then a treasure goblin
}

// ---------------------------------------------------------------- textures
function brick(g, z, shade, seed) {
  const zi = Math.floor(z), gi = Math.floor(g);
  const row = Math.floor(zi / 8), off = (row & 1) * 8, gx = gi + off;
  const bx = Math.floor(gx / 16), mz = zi % 8, mx = ((gx % 16) + 16) % 16;
  if (mz === 0 || mx === 0) return ST(0);
  let t = 3 + Math.floor(hash(bx, row, seed) * 3) + shade;
  if (mz === 7) t += 1; else if (mz === 1) t -= 1;
  if (mx === 1) t += 1;
  const ph = hash(gi, zi, seed + 1);
  if (ph < 0.08) t -= 1; else if (ph > 0.985) t += 1;
  if (row === 0) t -= 1;
  return ST(t);
}
// banner hanging on a wall face; g = position along the face within this tile (0..16)
function bannerDeco(g, z, top, team) {
  const bd = Math.abs(g - 8);
  if (bd <= 7 && z >= top && z < top + 2.5) return z >= top + 1.5 ? WOOD[2] : WOOD[1];
  if (bd <= 5.5) {
    const zb = top - 30 + bd * 1.1;
    if (z >= zb && z < top) {
      if (z < zb + 1.5 || bd >= 4.6) return team[1];
      if ((bd < 1 && Math.abs(z - (top - 13)) < 7) || (Math.abs(z - (top - 15)) < 1 && bd < 3.5)) return GOLD[1];
      return ((g | 0) % 3) === 0 ? team[1] : team[2];
    }
  }
  return 0;
}
// cave walls: rough rock from layered noise with dark crevices, glowing fungus low down
function rockTex(g, b, face) {
  const n = vnoise(g, b * 1.6, 9, 5) * 4 + vnoise(g, b, 3, 6) * 1.4;
  if (Math.abs(vnoise(g, b * 1.3, 14, 9) - 0.5) < 0.035) return ST(0);
  if (b < 5 && hash(g | 0, b | 0, 4) < 0.025) return FUNGUS[1] | EMIS;
  return ST(1.5 + n - (face === 'R' ? 1 : 0) + (b < 3 ? -1 : 0));
}
// hell walls: a glowing rune carved into the brick now and then
function runeDeco(a, b) {
  const x = a - 8, y = b - 16;
  if (Math.abs(x) > 4 || Math.abs(y) > 6) return 0;
  const on = Math.abs(x) < 0.7 || (Math.abs(y - 3) < 0.7 && Math.abs(x) < 3.5) || (Math.abs(Math.abs(x) - y * 0.5 - 1) < 0.6 && y < 0);
  return on ? (LAVA[3] | EMIS) : 0;
}
// round 68c (the face-lift goes into the dungeon's contents, from the concept art): features on the crypt's
// tall walls, one per wall tile at most, only on a face that looks onto floor and never where a torch hangs:
// a skull niche (two skulls and a candle in a dark arched recess, with its own small light) or a collapsed
// stretch (the wall broken down to half height, rubble on the floor in front). Banners stay (mostly red now)
function wallFeature(i, j) {
  if (LV.outdoor || LV.theme !== 'crypt' || !LV.tall[tIdx(i, j)]) return null;
  const faceR = tileAt(i + 1, j) === FLOOR, faceL = tileAt(i, j + 1) === FLOOR; if (!faceR && !faceL) return null;
  if (faceR && faceL) return null;   // (a corner tile: both faces show)
  const h = hash(i, j, 77);
  if (h >= 0.1 && h < 0.16) return { kind: 'niche', face: faceL ? 'L' : 'R' };
  if (h >= 0.16 && h < 0.2 && tileAt(i + (faceL ? 1 : 0), j + (faceL ? 0 : 1)) === WALL && tileAt(i - (faceL ? 1 : 0), j - (faceL ? 0 : 1)) === WALL) return { kind: 'collapse', face: faceL ? 'L' : 'R' };   // (mid-wall only, so both ends stay standing)
  return null;
}
function wallTex(i, j, tall) {
  const deco = tall ? hash(i, j, 77) : 1, feat = tall ? wallFeature(i, j) : null;
  return (face, a, b) => {
    if (face === 'top') {
      const gi = i * 16 + a, gj = j * 16 + b;
      if (LV.theme === 'caves') return ST(2 + Math.floor(vnoise(gi, gj, 6, 11) * 3));
      if (((gi | 0) % 16) < 1 || ((gj | 0) % 16) < 1) return ST(1);
      let t = 2 + Math.floor(hash(Math.floor(gi / 16), Math.floor(gj / 16), 11) * 2);
      if (hash(gi | 0, gj | 0, 5) < 0.1) t--;
      return ST(t);
    }
    const g = (face === 'L' ? i * 16 : j * 16) + a;
    if (LV.theme === 'caves') return rockTex(g, b, face);
    if (feat && feat.kind === 'collapse' && face === feat.face) {   // a ragged hole broken through the wall, black beyond (concept art B)
      const x = a - 8, y = b - 20, n = (hash(Math.floor(a / 2), Math.floor(b / 3), i * 5 + j) - 0.5) * 3;
      const r = Math.hypot(x * 1.15, y * 0.62) + n;   // a tall, ragged oval
      if (r < 7.2 && b > 3) return BLK;
      if (r < 8.6 && b > 2) return ST(r < 8 ? 1 : 6);   // the broken edge: shadowed inside, a lit lip
    }
    if (tall && deco < 0.1 && TH().banners) { const d = bannerDeco(a, b, 54, deco < 0.07 || LV.theme === 'hell' ? RED : BLUE); if (d) return d; }   // (round 68c: crypt banners mostly deep red, like the concept)
    if (LV.theme === 'hell' && tall && deco > 0.86 && b < 30) { const d = runeDeco(a, b); if (d) return d; }
    if (tall && deco > 0.93 && b > 6 && b < 40) {   // cracked, mossy patch
      const h = hash(g | 0, b | 0, 13);
      if (h < 0.12) return ST(1);
      if (b < 18 && h > 0.7 && LV.theme === 'crypt') return GREEN[0];
    }
    return brick(g, b, face === 'R' ? -1 : 0, face === 'L' ? 3 : 4);
  };
}
function pillarTex(shade) {
  return (face, a, b) => {
    if (face === 'top') return ST(5);
    const zi = Math.floor(b);
    if (zi % 12 === 0) return ST(1);
    let t = (face === 'L' ? 4 : 3) + shade;
    if (face === 'L' && a < 1.5) t += 1;
    if (face === 'R' && a > 9) t -= 1;
    if (zi % 12 === 11) t += 1;
    if (hash(a | 0, zi, 21) < 0.08) t -= 1;
    return ST(t);
  };
}
function crateTex(L0, hgt) {
  return (face, a, b) => {
    if (face === 'top') return ((a | 0) % 5 === 0) ? WOOD[0] : WOOD[2];
    const L = L0;
    const edge = a < 1.5 || a > L - 1.5 || b < 1.5 || b > hgt - 1.5;
    const diag = Math.abs(a / L - b / hgt) < 0.09;
    let c = (edge || diag) ? WOOD[3] : (((b | 0) % 5 === 0) ? WOOD[0] : WOOD[1]);
    if (face === 'R' && c !== WOOD[0]) c -= 1;
    return c;
  };
}
// iso box sprite. tex(face, a, b): face 'top' (a, b = position on top in tile px) or the two
// visible sides 'L' (facing +j) and 'R' (facing +i) with a = distance along the face, b = height
function makeBox(wi, wj, hgt, tex) {
  const w = Math.ceil(16 * (wi + wj)) + 2, h = Math.ceil(8 * (wi + wj) + hgt) + 2;
  const ox = Math.round(16 * wj), oy = hgt;
  const data = new Uint8Array(w * h), z = new Uint8Array(w * h);
  for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
    const x = px + 0.5 - ox, y = py + 0.5 - oy, yy = y + hgt;
    const fi = (x / 16 + yy / 8) / 2, fj = (yy / 8 - x / 16) / 2;
    let c = 0, zz = 0;
    if (fi >= 0 && fi < wi && fj >= 0 && fj < wj) { c = tex('top', fi * 16, fj * 16); zz = hgt; }
    else {
      const fi2 = x / 16 + wj, z1 = (fi2 + wj) * 8 - y;
      if (fi2 >= 0 && fi2 < wi && z1 >= 0 && z1 < hgt) { c = tex('L', fi2 * 16, z1); zz = z1; }
      else {
        const fj2 = wi - x / 16, z2 = (wi + fj2) * 8 - y;
        if (fj2 >= 0 && fj2 < wj && z2 >= 0 && z2 < hgt) { c = tex('R', fj2 * 16, z2); zz = z2; }
      }
    }
    data[py * w + px] = c; z[py * w + px] = Math.max(0, Math.round(zz));
  }
  return { w, h, ax: ox, ay: oy, data, z };
}

// ---------------------------------------------------------------- props drawn with the rig
const propCache = {};
function propSprite(name, build, size, yaw = 0) {
  const k = name + '|' + yaw;
  if (!propCache[k]) {
    const r = new Rig(); build(r); const sp = propCache[k] = renderRig(r, yaw, ...size);
    // trees and undergrowth stay 1x (the user liked them as they were, and they are most of the cost)
    if (WORLD2X && !/^(pine|oak|autumn|bush|fern)/.test(name)) { scaleRig(r, SPX); const [w, h, ax, ay] = size; sp.sp2 = renderRig(r, yaw, w * SPX, h * SPX, ax * SPX, ay * SPX, 2); sp.sp2.px = SPX; sp.sp2.world2 = true; sp.sp2d = { ...sp.sp2, world2: false }; }   // the same rig at twice the detail
  }
  return propCache[k];
}
// the stairwell: opening half-sizes in rig units (one tile is TILE_U = 22.6); the steps run down
// toward -x (up the screen) so their treads face the camera, and the far wall opens into darkness
const STW = { x: 18, y: 12, steps: 8, drop: 2.2 };
const stairCache = {};
function stairwellSprite(theme) {
  if (stairCache[theme]) return stairCache[theme];
  const T = theme === 'caves' ? 'ROCK' : theme === 'hell' ? 'HELL' : 'STONE', mat = M[T === 'HELL' ? 'HELLSTONE' : T], lipM = M[T + 'LIP'], riseM = M[T + 'RISE'];
  const r = new Rig(), X = STW.x, Y = STW.y, n = STW.steps, len = 2 * X / n;
  for (let k = 0; k < n; k++) {
    // the steps go down toward the camera (+x), so each step's front faces it: a lit edge on
    // every tread, a shaded front below it, and a step darker every other one on the way down
    const top = -STW.drop * (k + 1), x0 = -X + len * k, x1 = x0 + len;
    r.box([(x0 + x1) / 2, 0, (top - 40) / 2], [len / 2, Y, (top + 40) / 2], mat, null, { noShadow: true, bias: -k,
      mf: (q, nn) => k >= 3 ? M.VOID : nn[0] > 0.5 ? riseM : nn[2] > 0.5 && q[0] > x1 - 1.3 ? lipM : 0 });   // the last visible ones vanish into the dark
  }
  const wall = (c, h, o) => r.box(c, h, mat, null, { noShadow: true, ...o });
  // the side walls darken with depth into the same lightless black the last steps fall into
  const sideMf = q => q[2] < -STW.drop * 2.5 ? M.VOID : q[2] < -STW.drop * 1.2 ? riseM : 0;
  wall([0, -Y - 6, -20], [X + 12, 6, 20], { bias: -2, mf: sideMf });
  wall([0, Y + 6, -20], [X + 12, 6, 20], { bias: -2, mf: sideMf });
  wall([X + 6, 0, -20], [6, Y, 20], {});
  wall([-X - 6, 0, -20], [6, Y, 20], { bias: -1 });
  const sp = renderRig(r, 0, 56, 72, 28, 14);
  // keep only what shows through the opening; a one-pixel lip of floor stone frames it
  const C = Math.SQRT1_2, lip = theme === 'caves' ? CAVE : theme === 'hell' ? HELL : S;
  for (let py = 0; py < sp.h; py++) for (let px = 0; px < sp.w; px++) {
    const sx = px - sp.ax + 0.5, sy = py - sp.ay + 0.5, gx = (sx / C + sy / (C / 2)) / 2, gy = (sy / (C / 2) - sx / C) / 2, k = py * sp.w + px;
    const inX = Math.abs(gx) < X, inY = Math.abs(gy) < Y;
    if (inX && inY) continue;
    if (Math.abs(gx) < X + 1.6 && Math.abs(gy) < Y + 1.6) sp.data[k] = (gx < -X || gy < -Y) ? lip[lip.length - 2] : lip[1];
    else sp.data[k] = 0;
  }
  return (stairCache[theme] = sp);
}
const PROPS = {
  barrel: () => propSprite('barrel', r => {
    // staves with dark seams, three iron hoops with rivets, a planked lid (mock-up)
    const band = z => Math.abs(z - 2.6) < 0.9 || Math.abs(z - 8) < 0.9 || Math.abs(z - 13.4) < 0.9;
    const staves = p => {
      if (band(p[2])) return M.IRON;
      const a = Math.atan2(p[1], p[0]) / (Math.PI * 2) * 14;
      return a - Math.floor(a) < 0.16 ? M.LEATHER : 0;
    };
    r.group(() => { r.cyl([0, 0, 0], [0, 0, 16], 5.4, M.WOOD, { mf: p => p[2] > 15.8 ? (Math.hypot(p[0], p[1]) > 4.6 ? M.IRON : (Math.floor(p[0] + 20) % 3 === 0) ? M.LEATHER : M.WOOD) : staves(p) }); r.ell([0, 0, 8], [7.0, 7.0, 6.8], M.WOOD, null, { mf: staves }); });
    for (const z of [2.6, 8, 13.4]) for (const a of [0.35, 1.2, 2.05]) { const rr = z === 8 ? 6.6 : 6.0; r.sph([Math.cos(a) * rr, Math.sin(a) * rr, z], 0.55, M.STEEL, { noShadow: true }); }
  }, [28, 32, 14, 26]),
  chest: (open) => propSprite('chest' + (open ? 'o' : ''), r => {
    const ax = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    r.box([0, 0, 4], [5, 7.5, 4], M.WOOD, ax, { mf: p => Math.abs(p[1]) > 6.4 || Math.abs(p[2] - 4) < 0.7 ? M.GOLD : 0 });
    if (open) r.box([-6, 0, 10.5], [0.8, 7.5, 4.5], M.WOOD, ax, { mf: p => Math.abs(p[1]) > 6.4 ? M.GOLD : 0 });
    else r.cyl([0, -7.5, 8], [0, 7.5, 8], 4.6, M.WOOD, { mf: p => Math.abs(p[1]) > 6.4 || p[0] > 4.2 && Math.abs(p[1]) < 1 ? M.GOLD : 0 });
    if (open) r.box([0, 0, 8.1], [4.4, 6.8, 0.3], M.DARK, ax);
  }, [34, 32, 17, 25], Math.PI / 4),
  bones: (seed) => propSprite('bones' + seed, r => {
    const R = rng(seed);
    for (let n = 0; n < 4; n++) { const x = (R() - 0.5) * 12, y = (R() - 0.5) * 12, a = R() * 6.28, l = 3 + R() * 2.5; r.cone([x - Math.cos(a) * l, y - Math.sin(a) * l, 0.6], [x + Math.cos(a) * l, y + Math.sin(a) * l, 0.6], 0.8, 0.8, M.BONE); }
    skullAt(r, [R() * 4 - 2, R() * 4 - 2, 3.2], V.norm([R() - 0.5, R() - 0.5, 0]), [0, 1, 0], [0, 0, 1], M.BONE, M.DARK, 0);
  }, [34, 24, 17, 16], 0.0),
  brazier: () => propSprite('brazier', r => {
    r.cyl([0, 0, 0], [0, 0, 2], 5, M.IRON);
    r.cone([0, 0, 2], [0, 0, 14], 1.4, 1.2, M.IRON);
    r.group(() => { r.ell([0, 0, 17], [7, 7, 3.4], M.IRON); r.cyl([0, 0, 17], [0, 0, 19.5], 7.2, M.IRON, { mf: p => p[2] > 19.3 && Math.hypot(p[0], p[1]) < 5.8 ? M.FIREM : 0 }); });
  }, [32, 40, 16, 33]),
  coffin: (yaw) => propSprite('coffin', r => {   // wooden coffin with a gold cross on the lid
    r.box([0, 0, 2.6], [8.5, 4.0, 2.6], M.LEATHER, null, { mf: p => (p[2] > 5 && ((Math.abs(p[1]) < 0.55 && Math.abs(p[0] - 1.5) < 3.6) || (Math.abs(p[0] - 3.2) < 0.55 && Math.abs(p[1]) < 2))) ? M.GOLD : Math.abs(p[2] - 4.6) < 0.4 ? M.DARK : p[2] < 4.4 ? M.WOOD : 0 });
    r.box([-8, 0, 2.4], [0.8, 3.4, 2.4], M.WOOD);
  }, [40, 32, 20, 22], yaw),
  statue: (hell) => propSprite('statue' + (hell ? 'h' : ''), r => {   // hooded figure on a plinth (horned in hell)
    const st = hell ? M.HELLSTONE : M.STONE;
    r.box([0, 0, 1.6], [5, 5, 1.6], st);
    r.group(() => { r.cone([0, 0, 3], [0, 0, 18], 5, 2.8, st); r.sph([0, 0, 20.5], 3.2, st, { mf: p => p[0] > 2 && Math.abs(p[1]) < 1.8 && p[2] < 21.5 ? M.DARK : 0 }); });
    r.cone([2.6, -3, 13], [3.8, 2.5, 12], 1.4, 1.4, st);
    if (hell) for (const s2 of [-1, 1]) r.cone([0, s2 * 2.4, 22.5], [-1.5, s2 * 4.5, 27], 1.1, 0.3, st);
  }, [30, 46, 15, 36], Math.PI / 4),
  candles: () => propSprite('candles', r => {   // a small table crowded with candles
    r.box([0, 0, 7.5], [5.2, 4, 0.8], M.WOOD);
    for (const [x, y] of [[-4, -3], [4, -3], [-4, 3], [4, 3]]) r.cone([x, y, 0], [x, y, 7], 0.8, 0.8, M.WOOD);
    for (const [x, y, hgt] of [[-2.5, -1.5, 3.5], [0, 1, 5], [2.5, -1, 2.5], [1.5, 2.2, 4], [-2, 2, 3]]) r.cyl([x, y, 8.3], [x, y, 8.3 + hgt], 0.75, M.WAX);
  }, [30, 34, 15, 24], Math.PI / 4),
  bonepile: (seed) => propSprite('bonepile' + seed, r => {
    const R = rng(seed);
    for (let n = 0; n < 9; n++) { const a = R() * 6.28, d = R() * 4, z = 1 + R() * 3.5, b = R() * 6.28, l = 2.5 + R() * 2; const c = [Math.cos(a) * d, Math.sin(a) * d, z]; r.cone(V.add(c, [Math.cos(b) * l, Math.sin(b) * l, -0.6]), V.add(c, [-Math.cos(b) * l, -Math.sin(b) * l, 0.6]), 0.8, 0.8, M.BONE); }
    skullAt(r, [R() * 2 - 1, R() * 2 - 1, 5.5], V.norm([1, R() - 0.5, 0.2]), V.norm([R() - 0.5, 1, 0]), [0, 0, 1], M.BONE, M.DARK, 0);
  }, [32, 28, 16, 20], 0),
  stalagmite: (seed) => propSprite('stalag' + seed, r => {
    const R = rng(seed);
    for (let n = 0; n < 3; n++) { const a = n * 2.1 + R(), d = n ? 4.5 : 0, x = Math.cos(a) * d, y = Math.sin(a) * d, hgt = 20 - n * 5 + R() * 4; r.cone([x, y, 0], [x + (R() - 0.5) * 2, y + (R() - 0.5) * 2, hgt], 3.8 - n * 0.7, 0.5, M.ROCK); }
  }, [30, 40, 15, 30], 0),
  mushroom: (seed) => propSprite('mush' + seed, r => {   // glowing cave fungus
    const R = rng(seed);
    for (let n = 0; n < 4; n++) { const x = (R() - 0.5) * 8, y = (R() - 0.5) * 8, hgt = 1.5 + R() * 3; r.cone([x, y, 0], [x, y, hgt], 0.5, 0.5, M.BONE); r.ell([x, y, hgt + 0.5], [1.6 + R(), 1.6 + R(), 0.9], R() < 0.5 ? M.FUNGUS : M.FUNGUS2); }
  }, [22, 18, 11, 13], 0),
  egg: () => propSprite('egg', r => {   // a clutch of pale, veined egg sacs on a web of strands
    const veins = p => (Math.abs(Math.sin(p[0] * 1.3 + p[2] * 0.7)) < 0.18 || Math.abs(Math.sin(p[1] * 1.5 - p[2] * 0.6)) < 0.14) ? M.MARK : 0;
    for (const [x, y, s] of [[0, 0, 1], [-4, 3, 0.75], [3.5, 3.5, 0.65]]) r.ell([x, y, 4.6 * s], [3.8 * s, 3.6 * s, 4.8 * s], M.OLDBONE, null, { mf: veins });
    for (const a of [0.4, 2.2, 4.1]) r.cone([0, 0, 1], [Math.cos(a) * 9, Math.sin(a) * 9, 0.2], 0.35, 0.3, M.BONE, { noShadow: true });
  }, [30, 26, 15, 18]),
  // round 68c: a skull niche in the crypt wall (concept art D): a dressed stone frame with a lintel and
  // keystone round a dark recess, a shelf, two skulls looking out, and a lit candle
  niche: (face) => propSprite('niche' + face, r => {
    const out = face === 'L' ? [0, 1, 0] : [1, 0, 0], up = [0, 0, 1], tan = V.cross(up, out), ax = [out, tan, up];
    const at = (o, t, z) => V.add(V.add(V.mul(out, o), V.mul(tan, t)), [0, 0, z]);
    r.box(at(-0.4, 0, 10), [0.4, 7.4, 9.4], M.VOID, ax);   // the dark recess
    for (const sd of [-1, 1]) r.box(at(0.8, sd * 8.6, 10), [1.0, 1.6, 10.2], M.STONE, ax);   // the jambs
    r.box(at(0.9, 0, 21.2), [1.2, 10.2, 1.6], M.STONE, ax);   // the lintel
    r.box(at(1.6, 0, 21.4), [0.9, 1.8, 2.2], M.STONE, ax);   // its keystone
    r.box(at(1.2, 0, 1.6), [1.8, 8.6, 1.1], M.STONE, ax);   // the shelf
    for (const [t, z] of [[-4.2, 5.4], [0.4, 5.2]]) {   // two skulls looking out
      const c = at(1.8, t, z);
      r.sph(c, 2.6, M.BONE, { mf: p => { const q = V.sub(p, c), fo = V.dot(q, out), ft = V.dot(q, tan); return fo > 1.2 && q[2] > -0.4 && q[2] < 1.2 && Math.abs(Math.abs(ft) - 1.0) < 0.6 ? M.DARK : fo > 1.6 && q[2] < -1.2 && Math.abs(ft) < 0.4 ? M.DARK : 0; } });
      r.box(V.add(c, [0, 0, -2.2]), [1.2, 1.4, 0.5], M.BONE, ax);   // the jaw
    }
    r.cyl(at(1.5, 5.4, 2.6), at(1.5, 5.4, 8.6), 1.1, M.WAX);
    r.sph(at(1.5, 5.4, 9.8), 1.1, M.FIREM, { noShadow: true });
  }, [48, 52, 24, 38]),
  // round 68c: fallen blocks at the foot of a collapsed wall
  rubble: (seed) => propSprite('rubble' + seed, r => {
    const R = rng(seed * 97 + 5);
    for (let n = 0; n < 13; n++) {   // a heap: bigger blocks low and in the middle, smaller ones tumbled out round it
      const a = R() * 6.283, d = Math.sqrt(R()) * 9, sz = 1.0 + (1 - d / 9) * 1.6 + R() * 0.6, yaw = R() * 3, tilt = (R() - 0.5) * 0.9;
      const fx = [Math.cos(yaw) * Math.cos(tilt), Math.sin(yaw) * Math.cos(tilt), Math.sin(tilt)], fy = [-Math.sin(yaw), Math.cos(yaw), 0], fz = V.norm(V.cross(fx, fy));
      r.box([Math.cos(a) * d, Math.sin(a) * d * 1.2, sz * 0.9 + (d < 3 ? 1.6 : 0)], [sz * 1.3, sz, sz * 0.8], M.STONE, [fx, fy, fz]);
    }
  }, [48, 34, 24, 20]),
  torch: (face) => propSprite('torch' + face, r => {
    // iron sconce (mock-up): riveted wall plate, bracket arm, a caged cup glowing from inside
    const out = face === 'L' ? [0, 1, 0] : [1, 0, 0], up = [0, 0, 1], tan = V.cross(up, out);
    r.box([0, 0, -1], [0.7, 2.3, 5.2], M.STEEL, [out, tan, up], { mf: p => Math.abs(V.dot(p, tan)) < 0.8 && Math.abs(Math.abs(p[2] + 1) - 3.4) < 0.8 && V.dot(p, out) > 0.4 ? M.GOLD : 0 });
    const tip = V.mul(out, 6.4);
    r.cone(V.add(V.mul(out, 0.7), [0, 0, -2.4]), V.add(tip, [0, 0, 1.2]), 1.0, 1.0, M.STEEL);
    r.cone(V.add(tip, [0, 0, 0.5]), V.add(tip, [0, 0, 4]), 1.1, 1.1, M.STEEL);
    r.cone(V.add(tip, [0, 0, 4]), V.add(tip, [0, 0, 9]), 2.2, 3.7, M.STEEL, { mf: p => {
      const q = V.sub(p, tip), z = q[2];
      if (z > 8.1 || z < 5.2) return 0;                       // solid rim and base
      const a = Math.atan2(q[1], q[0]) / (Math.PI * 2) * 8;
      return a - Math.floor(a) < 0.45 ? 0 : M.FIREM;         // bars, with the fire glowing between them
    } });
  }, [30, 36, 15, 24]),
};

// ---------------------------------------------------------------- bake
let floorBuf = new Uint8Array(WW * WH);
let wIdx = new Uint8Array(WW * WH), wZ = new Uint8Array(WW * WH), wFloor = new Uint8Array(WW * WH);
// round 27: the 2x world layer. Props are also rendered at twice the detail and baked here, one
// palette index per detail pixel (0 = nothing: show the doubled 1x world). Floors and walls stay
// 1x, doubled. Lighting, fog and gameplay keep reading the 1x buffers. A title-screen toggle
// (DETAIL: SHARP / CLASSIC, kept in storage) or ?w2=1 / ?w2=0 switches it. Round 46d: SHARP is the
// default (the old 'dcg-w2' setting is ignored so everyone starts sharp; CLASSIC stays for slow phones).
// Only scenery props change (tents, wagons, crates, barrels, stalls, fences, pillars...): characters
// and effects are always drawn at full detail, trees and floors at 1x either way.
let WORLD2X = true;
try { const q = new URLSearchParams(location.search).get('w2'); if (q !== null) WORLD2X = q === '1'; else if (localStorage.getItem('dcg-detail') === 'classic') WORLD2X = false; } catch (e) { /* storage blocked */ }
// switching rebuilds the prop sprites and the level behind the title
function setWorld2x(v) { WORLD2X = v; try { localStorage.setItem('dcg-detail', v ? 'sharp' : 'classic'); } catch (e) { /* ignore */ } for (const k in propCache) delete propCache[k]; runs2 = []; titleScene(); }
let wIdx2 = new Uint8Array(WW * WH * 4);
let wTile = new Int16Array(WW * WH);
const props = [];    // static, baked, depth-sorted with characters where they overlap
const dynProps = []; // barrels and chests: drawn every frame
const fires = [];    // flames {wx, wy, h, w, seed}
const lights = [];   // {x, y (ground point, world px), z, r, i, seed}
function genFloor() {
  if (LV.outdoor) bakeGrassNoise();
  for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) {
    const A = (x - WX0) + 2 * (y - WY0), B = 2 * (y - WY0) - (x - WX0);
    const ti = Math.floor(A / 32), tj = Math.floor(B / 32), t = tileAt(ti, tj), k = y * WW + x;
    let v = BLK;
    wTile[k] = (ti >= 0 && tj >= 0 && ti < MW && tj < MH) ? tIdx(ti, tj) : -1;
    if (LV.outdoor) { floorBuf[k] = outdoorFloor(x, y, A, B, ti, tj); continue; }
    if (t === FLOOR) {
      const room = LV.roomOf[tIdx(ti, tj)] >= 0;
      if (LV.theme === 'caves') {   // uneven dirt and rock, no tiling, cracks and pebbles
        let tone = 1.6 + vnoise(A, B, 26, 3) * 3 + vnoise(A, B, 7, 4) * 1.3;
        if (Math.abs(vnoise(A, B, 44, 8) - 0.5) < 0.018) tone = 0;
        if (hash(x, y, 9) < 0.012) tone += 2;
        const fa = A / 32 - ti, fb = B / 32 - tj;
        if ((fa < 0.18 && tileAt(ti - 1, tj) === WALL) || (fb < 0.18 && tileAt(ti, tj - 1) === WALL) || (fa > 0.86 && tileAt(ti + 1, tj) === WALL) || (fb > 0.86 && tileAt(ti, tj + 1) === WALL)) tone -= 2;
        floorBuf[k] = ST(tone);
        continue;
      }
      const cell = room ? 16 : 8;   // flagstones in rooms, cobbles in corridors
      const sb = Math.floor(B / cell), A2 = A + (sb & 1) * (cell / 2);
      const ma = ((A2 % cell) + cell) % cell, mb = ((B % cell) + cell) % cell;
      if (ma < 2 || mb < 2) v = (LV.theme === 'hell' && room && hash(Math.floor(A2 / cell), sb, 99) < 0.16) ? (LAVA[(Math.floor((A + B) / 6) % 6 + 6) % 6] | EMIS) : K2;   // lava in some joints
      else {
        const sa = Math.floor(A2 / cell), h = hash(sa, sb, 7 + LV.level);
        let tone = (room ? 2 : 1) + Math.floor(h * 3);
        if (ma < 4 || mb < 4) tone += 1; else if (ma >= cell - 2 || mb >= cell - 2) tone -= 1;
        const ph = hash(x, y, 3);
        if (ph < 0.07) tone -= 1; else if (ph > 0.975) tone += 1;
        if (h > 0.93) tone -= 1;
        // baked contact shadow where floor meets a wall
        const fa = A / 32 - ti, fb = B / 32 - tj;
        if ((fa < 0.14 && tileAt(ti - 1, tj) === WALL) || (fb < 0.14 && tileAt(ti, tj - 1) === WALL) ||
            (fa > 0.9 && tileAt(ti + 1, tj) === WALL) || (fb > 0.9 && tileAt(ti, tj + 1) === WALL)) tone -= 2;
        v = ST(tone);
        if (h > 0.985 && ph < 0.4 && LV.theme === 'crypt') v = GREEN[0];   // moss in the joints
      }
    }
    floorBuf[k] = v;
  }
}
// a molten pool: emissive lava indices (they flow through the palette cycle) with a dark crust rim
function stampLava(wx, wy, size, seed) {
  const r = rng(seed), blobs = [];
  for (let n = 0; n < 2 + size; n++) blobs.push([wx + (r() - 0.5) * size * 6, wy + (r() - 0.5) * size * 2.6, 2 + r() * size * 1.6]);
  for (let y = Math.floor(wy - size * 5); y <= wy + size * 5; y++) for (let x = Math.floor(wx - size * 10); x <= wx + size * 10; x++) {
    if (x < 0 || y < 0 || x >= WW || y >= WH) continue;
    const k = y * WW + x; if (floorBuf[k] === BLK || !wFloor[k]) continue;
    let d = 9; for (const [bx, by, br] of blobs) d = Math.min(d, Math.hypot((x - bx) / br, (y - by) * 2 / br));
    if (d > 1.25) continue;
    setFloor(k, d > 1 ? (hash(x, y, seed) < 0.6 ? HELL[0] : BLK) : (LAVA[(Math.floor(d * 5 + (x + y) * 0.15) % 6 + 6) % 6] | EMIS));
  }
}
function setFloor(k, v) { floorBuf[k] = v; if (wFloor[k]) wIdx[k] = v; }
function stampBlood(wx, wy, size, seed, ramp = RED) {
  const r = rng(seed);
  for (let n = 0; n < 3 + size * 2; n++) {
    const cx = wx + (r() - 0.5) * size * 7, cy = wy + (r() - 0.5) * size * 3;
    const rx = 1.5 + r() * size * 1.6, ry = rx * 0.5;
    for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry, d = dx * dx + dy * dy;
      if (d > 1 || x < 0 || y < 0 || x >= WW || y >= WH) continue;
      const k = y * WW + x;
      if (floorBuf[k] === BLK || !wFloor[k]) continue;
      if (d > 0.75 && hash(x, y, seed) < 0.4) continue;
      setFloor(k, hash(x, y, seed + 1) < 0.05 ? ramp[3] : d < 0.45 ? ramp[2] : ramp[1]);
    }
  }
}
// the 2x layer under one 1x world blit (called before the 1x pixels are written). A sprite with a
// 2x version writes its detail pixels; where its 1x shape covers but the 2x one doesn't, what was
// behind is kept (the 2x pixel already there, or the 1x color behind); a 1x-only sprite (a wall)
// clears the 2x layer it covers so the doubled wall shows
function blit2(sp, wx, wy, sx0, sy0) {
  const W2 = WW * 2, H2 = WH * 2, s2 = sp.sp2;
  for (let y = 0; y < sp.h; y++) {
    const yy = sy0 + y; if (yy < 0 || yy >= WH) continue;
    for (let x = 0; x < sp.w; x++) {
      const xx = sx0 + x; if (xx < 0 || xx >= WW || !sp.data[y * sp.w + x]) continue;
      const behind = wIdx[yy * WW + xx];
      for (let b = 0; b < 2; b++) for (let a = 0; a < 2; a++) { const k = (yy * 2 + b) * W2 + xx * 2 + a; if (!s2) wIdx2[k] = 0; else if (!wIdx2[k]) wIdx2[k] = behind; }
    }
  }
  if (!s2) return;
  const X0 = Math.round(wx * 2) - s2.ax, Y0 = Math.round(wy * 2) - s2.ay;
  for (let y = 0; y < s2.h; y++) {
    const yy = Y0 + y; if (yy < 0 || yy >= H2) continue;
    for (let x = 0; x < s2.w; x++) { const v = s2.data[y * s2.w + x], xx = X0 + x; if (v && xx >= 0 && xx < W2) wIdx2[yy * W2 + xx] = v; }
  }
}
// per 2x row, the spans [x0, x1) that hold 2x pixels, so the frame only visits those (round 27)
let runs2 = [];
function build2Runs() {
  const W2 = WW * 2, H2 = WH * 2; runs2 = new Array(H2);
  for (let y = 0; y < H2; y++) {
    const row = y * W2, r = []; let x = 0;
    while (x < W2) { while (x < W2 && !wIdx2[row + x]) x++; if (x >= W2) break; const a = x; while (x < W2 && wIdx2[row + x]) x++; r.push(a, x); }
    runs2[y] = r.length ? Int32Array.from(r) : null;
  }
}
function blitWorld(sp, wx, wy, zBase = 0, tile = -1, asFloor = false) {
  const sx0 = Math.round(wx) - sp.ax, sy0 = Math.round(wy) - sp.ay;
  if (WORLD2X && !asFloor) blit2(sp, wx, wy, sx0, sy0);
  for (let y = 0; y < sp.h; y++) {
    const yy = sy0 + y; if (yy < 0 || yy >= WH) continue;
    for (let x = 0; x < sp.w; x++) {
      const xx = sx0 + x; if (xx < 0 || xx >= WW) continue;
      const k = y * sp.w + x, v = sp.data[k];
      if (!v) continue;
      const o = yy * WW + xx;
      if (asFloor) { if (!wFloor[o]) continue; floorBuf[o] = v; wIdx[o] = v; continue; }
      wIdx[o] = v; wZ[o] = Math.min(255, zBase + (sp.z ? sp.z[k] : Math.max(0, sp.ay - y))); wFloor[o] = 0;
      if (tile >= 0) wTile[o] = tile;
    }
  }
}
function buildWorld() {
  genFloor(); wIdx2.fill(0);
  props.length = 0; dynProps.length = 0; fires.length = 0; lights.length = 0;
  const back = [];
  if (LV.outdoor) buildOutdoor(back);
  for (let j = 0; j < MH; j++) for (let i = 0; i < MW; i++) {
    if (tileAt(i, j) !== WALL) continue;
    const tall = LV.tall[tIdx(i, j)];
    const feat = tall ? wallFeature(i, j) : null;
    const sp = makeBox(1, 1, tall ? WALL_TALL : WALL_LOW, wallTex(i, j, tall));
    const [wx, wy] = iso(i, j);
    if (feat && feat.kind === 'niche') {   // round 68c: a skull niche on the face toward the floor, its candle a little flame and light
      const [x, y] = feat.face === 'L' ? iso(i + 0.5, j + 1) : iso(i + 1, j + 0.5);
      back.push({ depth: i + j + 1.5, sp: PROPS.niche(feat.face), wx: x, wy: y - 12, z: 12, tile: tIdx(i, j) });
      const c = feat.face === 'L' ? iso(i + 0.5 + 3.8 / TILE_U * 0, j + 1 + 1.2 / TILE_U) : iso(i + 1 + 1.2 / TILE_U, j + 0.5);
      fires.push({ wx: c[0] + (feat.face === 'L' ? -5.4 : 5.4) * 0.7, wy: c[1] - 12 - 10, h: 4, w: 1.2, seed: i * 7 + j, tile: tIdx(i, j), ember: 0 });
      const g = feat.face === 'L' ? iso(i + 0.5, j + 1.5) : iso(i + 1.5, j + 0.5);
      lights.push({ x: g[0], y: g[1], z: 22, r: 70, i: 0.55, seed: i * 13 + j });
    } else if (feat && feat.kind === 'collapse') {   // round 68c: the fallen blocks lie on the floor in front
      const [x, y] = feat.face === 'L' ? iso(i + 0.5, j + 1.45) : iso(i + 1.45, j + 0.5);
      props.push({ depth: i + j + 1.9, sp: PROPS.rubble((i * 31 + j * 7) % 5), wx: x, wy: y, tile: tIdx(i + (feat.face === 'R' ? 1 : 0), j + (feat.face === 'L' ? 1 : 0)) });
    }
    (tall ? back : props).push({ depth: i + j + 1, sp, wx, wy, tile: tIdx(i, j) });
  }
  const add = (list, i, j, wi, wj, hgt, tex, inset = 0, zBase = 0, depthAdd = 0) => {
    const sp = makeBox(wi - 2 * inset, wj - 2 * inset, hgt, tex);
    const [wx, wy] = iso(i + inset, j + inset);
    list.push({ depth: i + j + (wi + wj) / 2 + depthAdd, sp, wx, wy: wy - zBase, z: zBase, tile: tIdx(i, j) });
  };
  for (const d of LV.decor) {
    if (d.kind === 'pillar') {
      add(props, d.i, d.j, 1, 1, 6, pillarTex(1), 0.06);
      add(props, d.i, d.j, 1, 1, 46, pillarTex(0), 0.16, 6, 0.001);
      add(props, d.i, d.j, 1, 1, 6, pillarTex(1), 0.04, 52, 0.002);
    } else if (d.kind === 'crate') {
      add(props, d.i, d.j, 1, 1, 18, crateTex(12.4, 18), 0.11);
    } else if (d.kind === 'brazier') {
      const [x, y] = iso(d.i + 0.5, d.j + 0.5);
      props.push({ depth: d.i + d.j + 1, sp: PROPS.brazier(), wx: x, wy: y, tile: tIdx(d.i, d.j) });
      fires.push({ wx: x, wy: y - 20, h: 13, w: 5, seed: d.i * 31 + d.j, ember: 0.1, tile: tIdx(d.i, d.j) });
      lights.push({ x, y, z: 30, r: 150, i: 1.1, seed: d.i + d.j * 7 });
    } else if (d.kind === 'coffin' || d.kind === 'statue' || d.kind === 'candles' || d.kind === 'bonepile' || d.kind === 'stalagmite') {
      const [x, y] = iso(d.i + 0.5, d.j + 0.5);
      const sp = d.kind === 'coffin' ? PROPS.coffin(d.yaw) : d.kind === 'statue' ? PROPS.statue(!!d.hell) : d.kind === 'candles' ? PROPS.candles() : d.kind === 'bonepile' ? PROPS.bonepile(d.seed) : PROPS.stalagmite(d.seed);
      props.push({ depth: d.i + d.j + 1, sp, wx: x, wy: y + 2, tile: tIdx(d.i, d.j) });
      if (d.kind === 'candles') {
        for (const [cx, cy, hgt] of [[-2.5, -1.5, 3.5], [0, 1, 5], [2.5, -1, 2.5], [1.5, 2.2, 4], [-2, 2, 3]]) {
          const q = V.rotZ([cx, cy, 0], Math.PI / 4), gx = d.i + 0.5 + q[0] / TILE_U, gy = d.j + 0.5 + q[1] / TILE_U, [fx, fy] = iso(gx, gy);
          fires.push({ wx: fx, wy: fy + 2 - (8.3 + hgt) * 0.87 - 1, h: 3, w: 0.8, seed: cx * 7 + cy, tile: tIdx(d.i, d.j) });
        }
        lights.push({ x, y, z: 14, r: 80, i: 0.65, seed: d.i + d.j });
      }
    } else if (d.kind === 'mushroom') {
      const [x, y] = iso(d.fi, d.fj);
      props.push({ depth: d.fi + d.fj, sp: PROPS.mushroom(d.seed), wx: x, wy: y, tile: tIdx(Math.floor(d.fi), Math.floor(d.fj)) });
      lights.push({ x, y, z: 6, r: 48, i: 0.35, seed: d.seed });
    } else if (d.kind === 'lava') {
      const [x, y] = iso(d.fi, d.fj);
      lights.push({ x, y, z: 4, r: 70 + d.size * 8, i: 0.8, seed: d.seed });
    } else if (d.kind === 'bones') {
      const [x, y] = iso(d.fi, d.fj);
      d.sp = PROPS.bones(d.seed % 6); d.wx = x; d.wy = y;
    } else if (d.kind === 'torch') {
      // torch on the wall face that looks at the floor, 40 px up
      const [x, y] = d.face === 'L' ? iso(d.i + 0.5, d.j + 1) : iso(d.i + 1, d.j + 0.5);
      back.push({ depth: d.i + d.j + 1.5, sp: PROPS.torch(d.face), wx: x, wy: y - 40, z: 40, tile: tIdx(d.i, d.j) });
      const tip2 = d.face === 'L' ? iso(d.i + 0.5, d.j + 1 + 6.4 / TILE_U) : iso(d.i + 1 + 6.4 / TILE_U, d.j + 0.5);
      fires.push({ wx: tip2[0], wy: tip2[1] - 40 - 8, h: 14, w: 3.6, seed: d.i * 13 + d.j, tile: tIdx(d.i, d.j), ember: 0.03 });
      const g = d.face === 'L' ? iso(d.i + 0.5, d.j + 1.6) : iso(d.i + 1.6, d.j + 0.5);
      lights.push({ x: g[0], y: g[1], z: 48, r: 170, i: 1.0, seed: d.i * 3 + d.j });
    } else if (d.kind === 'sacks') {   // round 42b: the cellar's sacks of bones
      const [x, y] = iso(d.i + 0.5, d.j + 0.5);
      props.push({ depth: d.i + d.j + 1, sp: PROPS.sacks(d.seed % 3), wx: x, wy: y + 2, tile: tIdx(d.i, d.j) });
    } else if (d.kind === 'cage') {   // round 42b: Aldo's cage in the wolf den (open once he is free)
      const [x, y] = iso(d.i + 0.5, d.j + 0.5);
      dynProps.push({ kind: 'cage', i: d.i, j: d.j, depth: d.i + d.j + 1, wx: x, wy: y + 2, hp: 1, open: !!d.open, seed: 0, tile: tIdx(d.i, d.j) });
    } else if (d.kind === 'barrel' || d.kind === 'chest' || d.kind === 'egg') {
      const [x, y] = iso(d.i + 0.5, d.j + 0.5);
      dynProps.push({ kind: d.kind, i: d.i, j: d.j, depth: d.i + d.j + 1, wx: x, wy: y + (d.kind === 'barrel' ? 3 : 2), hp: d.kind === 'egg' ? EGG_HP : 1, hatch: 3 + (d.seed % 5), open: false, seed: d.seed, tile: tIdx(d.i, d.j) });
    }
  }
  // stairs down (round 25): a stairwell sunk into the floor, steps falling away into a dark arch,
  // with a lit lip around the opening and a fire bowl at each side so it reads from across a room
  if (!LV.outdoor) for (const s of [LV.stairs, LV.down]) {
    if (!s) continue;
    const [x, y] = iso(s.i + 0.5, s.j + 0.5);
    s.sp = stairwellSprite(LV.theme || 'crypt'); s.wx = x; s.wy = y;
    for (const [ox, oy] of [[-STW.x - 4.5, STW.y + 4.5], [STW.x + 4.5, -STW.y - 4.5]]) {
      const fi = s.i + 0.5 + ox / TILE_U, fj = s.j + 0.5 + oy / TILE_U, [bx, by] = iso(fi, fj);
      props.push({ depth: fi + fj, sp: PROPS.brazier(), wx: bx, wy: by, tile: tIdx(Math.floor(fi), Math.floor(fj)) });
      fires.push({ wx: bx, wy: by - 20, h: 13, w: 5, seed: s.i * 31 + fi * 7, ember: 0.1, tile: tIdx(Math.floor(fi), Math.floor(fj)) });
      lights.push({ x: bx, y: by, z: 30, r: 120, i: 0.9, seed: s.i + fi * 7 });   // lit from the sides, so the well itself stays dark
    }
  }
  wIdx.set(floorBuf); wZ.fill(0); wFloor.fill(1);
  for (const d of LV.decor) {
    if (d.kind === 'blood') { const [x, y] = iso(d.fi, d.fj); stampBlood(Math.round(x), Math.round(y), d.size, d.seed); }
    if (d.kind === 'lava') { const [x, y] = iso(d.fi, d.fj); stampLava(Math.round(x), Math.round(y), d.size, d.seed); }
    if (d.kind === 'bones') blitWorld(d.sp, d.wx, d.wy, 0, -1, true);
  }
  if (LV.stairs.sp) blitWorld(LV.stairs.sp, LV.stairs.wx, LV.stairs.wy, 0, -1, true);   // over any lava or blood stamped there
  if (LV.down && LV.down.sp) blitWorld(LV.down.sp, LV.down.wx, LV.down.wy, 0, -1, true);
  back.sort((a, b) => a.depth - b.depth);
  for (const d of back) blitWorld(d.sp, d.wx, d.wy, d.z || 0, d.tile);
  props.sort((a, b) => a.depth - b.depth);
  for (const p of props) blitWorld(p.sp, p.wx, p.wy, p.z || 0, p.tile);
  if (WORLD2X) build2Runs();
  bakeLightMaps();
}
// static lights never move: each one's falloff over the baked scenery is computed once
const ZMAX = 90;
function bakeLightMaps() {
  const nl = DL48 && !LV.outdoor;   // round 48: wider, gentler pools (the tone curve keeps the middle from burning out)
  const tr = (LV.outdoor || typeof DLIGHT === 'undefined' ? 1 : DLIGHT.tr) * (nl ? 1.15 : 1), ti = (LV.outdoor || typeof DLIGHT === 'undefined' ? 1 : DLIGHT.ti) * (nl ? 1.12 : 1);   // round 47: the dungeon light presets
  for (const L of lights) {
    const r = L.r * tr, Li = L.i * ti, ox = Math.floor(L.x - r), oy = Math.floor(L.y - r / 2 - ZMAX), mw = Math.ceil(2 * r), mh = Math.ceil(r + ZMAX);
    const map = new Float32Array(mw * mh), r2 = r * r;
    for (let my = 0; my < mh; my++) {
      const wy = oy + my; if (wy < 0 || wy >= WH) continue;
      for (let mx = 0; mx < mw; mx++) {
        const wx = ox + mx; if (wx < 0 || wx >= WW) continue;
        const z = wZ[wy * WW + wx], dx = wx - L.x, dy = (wy + z - L.y) * 2, dz = z - L.z, d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < r2) { const f = 1 - d2 / r2; map[my * mw + mx] = (nl ? Math.pow(f, 1.6) : f * f) * Li; }
      }
    }
    L.map = { ox, oy, mw, mh, map };
  }
  // all static lights summed into two world maps (two flicker phases), so the per-frame cost is
  // one row copy instead of one pass per torch
  for (let g = 0; g < 2; g++) {
    const M2 = staticLight[g]; M2.fill(0);
    lights.forEach((L, n) => {
      if (n % 2 !== g) return;
      const { ox, oy, mw, mh, map } = L.map;
      for (let my = 0; my < mh; my++) {
        const wy = oy + my; if (wy < 0 || wy >= WH) continue;
        for (let mx = 0; mx < mw; mx++) { const wx = ox + mx; if (wx >= 0 && wx < WW && map[my * mw + mx]) M2[wy * WW + wx] += map[my * mw + mx]; }
      }
      L.map = null;
    });
  }
  bakeAO();
}
// round 48: ambient occlusion for the new dungeon light: the floor darkens toward the walls and
// into corners, round the foot of props, and walls darken toward their base, so rooms get shape
// from their edges instead of flat light. One byte per world pixel (255 = no darkening), baked with
// the light maps; null outdoors and with the old light.
let AO = null;
function bakeAO() {
  if (LV.outdoor || !DL48) { AO = null; return; }
  if (!AO || AO.length !== WW * WH) AO = new Uint8Array(WW * WH);
  AO.fill(255);
  const S = 0.46, R = 0.62, sm = d => { const t = d >= R ? 1 : d <= 0 ? 0 : d / R; return t * t * (3 - 2 * t); };
  const hard = (i, j) => { if (i < 0 || j < 0 || i >= MW || j >= MH) return true; const k = tIdx(i, j); return LV.map[k] !== FLOOR || LV.solid[k] === 1; };
  const round = (i, j) => i >= 0 && j >= 0 && i < MW && j < MH && LV.solid[tIdx(i, j)] === 2;
  // per tile, once: which of the 8 neighbors are hard (bits 0-7: W E N S NW NE SW SE) and whether a
  // round obstacle is near (bit 8); open tiles with none stay 255 and are skipped
  const OFF = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]], mask = new Uint16Array(MW * MH);
  for (let j = 0; j < MH; j++) for (let i = 0; i < MW; i++) {
    const k = tIdx(i, j); if (LV.map[k] !== FLOOR) { mask[k] = 0xffff; continue; }
    let m = 0; OFF.forEach(([a, b], n) => { if (hard(i + a, j + b)) m |= 1 << n; });
    for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) if (round(i + a, j + b)) m |= 256;
    mask[k] = m;
  }
  for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) {
    const k = y * WW + x, t = wTile[k];
    if (t < 0) continue;
    const m = mask[t]; if (!m) continue;
    const z = wZ[k];
    if (!wFloor[k] || z > 0) {   // walls (and tall props): darker toward the ground
      if (LV.map[t] === WALL && z < 18) AO[k] = Math.round(255 * (0.6 + 0.4 * sm(z / 18 * R)));
      continue;
    }
    if (m === 0xffff) continue;
    const a = (x - WX0) / 16, b = (y - WY0) / 8, fi = (a + b) / 2, fj = (b - a) / 2, i = Math.floor(fi), j = Math.floor(fj), u = fi - i, v = fj - j;
    let o = 1;
    if (m & 1) o *= 1 - S * (1 - sm(u)); if (m & 2) o *= 1 - S * (1 - sm(1 - u)); if (m & 4) o *= 1 - S * (1 - sm(v)); if (m & 8) o *= 1 - S * (1 - sm(1 - v));
    if ((m & 21) === 16) o *= 1 - S * (1 - sm(Math.hypot(u, v)));            // a corner only: NW without W or N
    if ((m & 38) === 32) o *= 1 - S * (1 - sm(Math.hypot(1 - u, v)));        // NE without E or N
    if ((m & 73) === 64) o *= 1 - S * (1 - sm(Math.hypot(u, 1 - v)));        // SW without W or S
    if ((m & 138) === 128) o *= 1 - S * (1 - sm(Math.hypot(1 - u, 1 - v)));  // SE without E or S
    if (m & 256) for (let b2 = -1; b2 <= 1; b2++) for (let a2 = -1; a2 <= 1; a2++) if (round(i + a2, j + b2)) { const d = Math.hypot(fi - (i + a2 + 0.5), fj - (j + b2 + 0.5)) - ROUND_R; o *= 1 - 0.4 * (1 - sm(Math.max(0, d) * 1.4)); }
    AO[k] = Math.round(255 * o);
  }
}
const staticLight = [new Float32Array(WW * WH), new Float32Array(WW * WH)];

// ---------------------------------------------------------------- fog of war
// seen = explored (remembered, drawn dim); vis = visible now (0..1, soft edge)
const FOV_R = 9.5;
function updateFov(pi, pj) {
  if (LV.outdoor) return;   // outdoors in daylight everything is in view
  LV.vis.fill(0);
  const i0 = Math.max(0, Math.floor(pi - FOV_R)), i1 = Math.min(MW - 1, Math.ceil(pi + FOV_R));
  const j0 = Math.max(0, Math.floor(pj - FOV_R)), j1 = Math.min(MH - 1, Math.ceil(pj + FOV_R));
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const t = tileAt(i, j); if (t === VOID) continue;
    const d = Math.hypot(i + 0.5 - pi, j + 0.5 - pj); if (d > FOV_R) continue;
    let ok;
    if (t === FLOOR) ok = los(pi, pj, i + 0.5, j + 0.5);
    else {   // a wall is visible if any floor neighbor toward the player is
      ok = false;
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        if (tileAt(i + a, j + b) === FLOOR && los(pi, pj, i + a + 0.5, j + b + 0.5)) { ok = true; break; }
      }
    }
    if (!ok) continue;
    const k = tIdx(i, j);
    LV.vis[k] = clamp((FOV_R - d) / 2.5, 0, 1);
    LV.seen[k] = 1;
  }
}
