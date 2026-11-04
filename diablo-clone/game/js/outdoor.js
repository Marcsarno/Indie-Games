'use strict';
// Outdoor areas (round 13, from the user's style references): a town hub and forests between the
// dungeons. Each cycle of five levels is town -> forest -> three dungeon floors (the third is the
// broodmother's lair). Outdoors there are no walls and no fog: the map is all ground, a ring of
// trees closes it in, and the ground is grass with dirt paths in daylight. Trees, houses and props
// are rig sprites like everything else, so they share the palette, shading and outlines.

const AREA_CYCLE = 5;
// Acts (round 22): each act is a town, a wilderness, two dungeon floors and a designed boss arena.
// After the third act it starts over at a higher difficulty (loop 1 = NIGHTMARE, 2 = HELL, ...).
const ACTS = [
  { name: 'THE BLIGHTED WOOD', theme: 'crypt', arena: 'king', boss: 'skelking', hall: "THE KING'S HALL" },
  { name: 'THE BURNING DEEP', theme: 'caves', arena: 'nest', boss: 'broodmother', hall: 'THE BROOD NEST' },
  { name: 'THE PIT', theme: 'hell', arena: 'sanctum', boss: 'lich', hall: 'THE SANCTUM' },
];
const LOOP_NAMES = ['', 'NIGHTMARE', 'HELL', 'TORMENT'];
function areaOf(level) {
  const p = (level - 1) % AREA_CYCLE, cyc = Math.floor((level - 1) / AREA_CYCLE), act = cyc % ACTS.length, loop = Math.floor(cyc / ACTS.length);
  if (p === 0) return { kind: 'town', cyc, act, loop, diff: cyc * 3 + 1, hub: act === 0 };   // Act I's town is the hand-built hub
  if (p === 1) return { kind: 'forest', cyc, act, loop, diff: cyc * 3 + 1 };
  const floor = p - 1;   // 1, 2, then the arena
  return { kind: 'dungeon', cyc, act, loop, floor, arena: floor === 3 ? ACTS[act].arena : null, depth: cyc * 3 + floor, diff: cyc * 3 + floor };
}
const AREA_NAMES = { town: ['OAKHOLLOW', 'ASHFORD', 'GREYMARSH'], forest: ['DEEPWOOD', 'EMBERWOOD', 'THORNWOOD'] };
const areaName = () => LV.side ? SIDES[LV.side].name : LV.outdoor ? AREA_NAMES[LV.area][LV.act % 3] : LV.arena ? ACTS[LV.act].hall : `${TH().name} ${LV.floor}`;
const actTitle = () => `ACT ${['I', 'II', 'III'][LV.act]}` + (LV.loop ? ' ' + (LOOP_NAMES[LV.loop] || 'LOOP ' + LV.loop) : '');

// ---------------------------------------------------------------- paths
// paths are polylines in tile space; their distance field is sampled 4x per tile and
// interpolated per pixel, so edges are smooth without a per-pixel search
const PF = 4;
let PW = MW * PF + 1, PH = MH * PF + 1, pathField = new Float32Array(PW * PH);
// the same field for the forest's river (LV.river segments); 99 everywhere when there is none
let riverField = new Float32Array(PW * PH);
function bakePathField() {
  if (PW !== MW * PF + 1 || PH !== MH * PF + 1) { PW = MW * PF + 1; PH = MH * PF + 1; pathField = new Float32Array(PW * PH); riverField = new Float32Array(PW * PH); }
  bakeSegField(pathField, LV.paths);
  bakeSegField(riverField, LV.river || []);
}
function bakeSegField(field, segs) {
  field.fill(99);
  for (const [x0, y0, x1, y1, w] of segs) {
    const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy || 1;
    const a0 = Math.max(0, Math.floor((Math.min(x0, x1) - 4) * PF)), a1 = Math.min(PW - 1, Math.ceil((Math.max(x0, x1) + 4) * PF));
    const b0 = Math.max(0, Math.floor((Math.min(y0, y1) - 4) * PF)), b1 = Math.min(PH - 1, Math.ceil((Math.max(y0, y1) + 4) * PF));
    for (let b = b0; b <= b1; b++) for (let a = a0; a <= a1; a++) {
      const px = a / PF, py = b / PF, t = clamp(((px - x0) * dx + (py - y0) * dy) / l2, 0, 1);
      const d = Math.hypot(px - x0 - dx * t, py - y0 - dy * t) - w;
      if (d < field[b * PW + a]) field[b * PW + a] = d;
    }
  }
}
function riverD(fi, fj) {
  if (!LV.river || !LV.river.length) return 99;
  const x = clamp(fi * PF, 0, PW - 1.001), y = clamp(fj * PF, 0, PH - 1.001), xi = x | 0, yi = y | 0, fx = x - xi, fy = y - yi, k = yi * PW + xi;
  return (riverField[k] * (1 - fx) + riverField[k + 1] * fx) * (1 - fy) + (riverField[k + PW] * (1 - fx) + riverField[k + PW + 1] * fx) * fy;
}
function pathD(fi, fj) {   // signed distance to the nearest path edge, in tiles (< 0 = on the path)
  const x = clamp(fi * PF, 0, PW - 1.001), y = clamp(fj * PF, 0, PH - 1.001), xi = x | 0, yi = y | 0, fx = x - xi, fy = y - yi;
  const k = yi * PW + xi;
  return (pathField[k] * (1 - fx) + pathField[k + 1] * fx) * (1 - fy) + (pathField[k + PW] * (1 - fx) + pathField[k + PW + 1] * fx) * fy;
}
// a gently curving path between two points, as short segments
function addPath(a, b, w, R) {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const nx = -(b[1] - a[1]) / (len || 1), ny = (b[0] - a[0]) / (len || 1), bend = (R() - 0.5) * len * 0.45;
  const cx = mx + nx * bend, cy = my + ny * bend, N = Math.max(3, Math.ceil(len / 2));
  let px = a[0], py = a[1];
  for (let s = 1; s <= N; s++) {
    const t = s / N, x = (1 - t) * (1 - t) * a[0] + 2 * t * (1 - t) * cx + t * t * b[0], y = (1 - t) * (1 - t) * a[1] + 2 * t * (1 - t) * cy + t * t * b[1];
    LV.paths.push([px, py, x, y, w + Math.sin(s * 1.7 + len) * 0.12]); px = x; py = y;
  }
}

// ---------------------------------------------------------------- generation
const rdNoise = (A, B) => (vnoise(A, B, 11, 91) - 0.5) * 0.18;
// normalized distance to the nearest pond's wobbly edge (< 1 = water)
function pondD(fi, fj) {
  let best = 9;
  for (const p of LV.ponds || []) {
    const ex = (fi - p.x) / p.rx, ey = (fj - p.y) / p.ry;
    if (ex > 1.6 || ex < -1.6 || ey > 1.6 || ey < -1.6) continue;   // far from this pond: skip the noise (load time)
    const d = Math.hypot(ex, ey) - (vnoise(fi * 9, fj * 9, 7, p.seed % 97) - 0.5) * 0.25; if (d < best) best = d;
  }
  return best;
}
function genOutdoor(level, seed, A) {
  const R = rng(seed);
  LV.ponds = []; LV.river = []; LV.bridges = [];
  LV.map.fill(FLOOR); LV.solid.fill(0); LV.tall.fill(0); LV.roomOf.fill(-1); LV.seen.fill(1); LV.vis.fill(1);
  LV.decor = []; LV.spawns = []; LV.paths = []; LV.rooms = []; LV.npcs = [];
  bakeCanopy(A.act === 1);   // before the floor bake, which samples it past the map edge
  if (A.hub) genHub(R, A); else if (A.kind === 'town') genTown(R, A); else genForest(R, A);
  bakePathField();
  settleSpawns();
}
// round 26: every outdoor monster must stand on open ground the hero can walk to; one that landed
// in the trees or across water moves to the nearest good spot within 4 tiles, or is dropped
function settleSpawns() {
  if (!LV.start || !LV.spawns.length) return;
  const d = bfs(LV.start.cx, LV.start.cy), good = (fi, fj) => { const i = Math.floor(fi), j = Math.floor(fj); return i >= 0 && j >= 0 && i < MW && j < MH && d[tIdx(i, j)] >= 0 && !clearance(fi, fj, 0.3); };
  LV.spawns = LV.spawns.filter(sp => {
    if (good(sp.fi, sp.fj)) return true;
    for (let r = 0.5; r <= 4; r += 0.5) for (let a = 0; a < 12; a++) {
      const fi = sp.fi + Math.cos(a * 0.524) * r, fj = sp.fj + Math.sin(a * 0.524) * r;
      if (good(fi, fj)) { sp.fi = fi; sp.fj = fj; return true; }
    }
    return false;
  });
}
const solidAt = (i, j) => i < 0 || j < 0 || i >= MW || j >= MH || LV.solid[tIdx(i, j)] === 1;
// a tree may stand on a tile only if no other solid tile touches it, so the gaps between trees
// always stay walkable and the forest needs no reachability search
function canTree(i, j) {
  if (i < 1 || j < 1 || i >= MW - 1 || j >= MH - 1) return false;
  for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) if (LV.solid[tIdx(i + a, j + b)]) return false;
  return true;
}
// the dense edge: a band of trees around the map, wider at the top and bottom corners of the
// diamond, where the camera would otherwise look past the map
function edgeBand(i, j) { return Math.min(i, j, MW - 1 - i, MH - 1 - j) < 3 || i + j < 9 || i + j > MW + MH - 12; }
function plantEdge(R, autumn) {
  for (let j = 0; j < MH; j++) for (let i = 0; i < MW; i++) {
    if (!edgeBand(i, j)) continue;
    LV.solid[tIdx(i, j)] = 1;
    if (R() < 0.62) LV.decor.push({ kind: 'tree', i, j, ...treeKind(R, autumn), jx: (R() - 0.5) * 0.5, jy: (R() - 0.5) * 0.5 });
  }
}
function treeKind(R, autumn) {
  const q = R();
  if (q < 0.5) return { tree: 'pine', seed: R.int(0, 5) };
  return { tree: autumn && R() < 0.75 ? 'autumn' : 'oak', seed: R.int(0, 5) };
}
function genForest(R, A) {
  const autumn = A.act === 1;
  // clearings, spread out; the first is the entry from town, the farthest holds the dungeon
  const C = [], area = MW * MH / 1600, nC = Math.round(9 * area);   // the forest scales with the map
  for (let t = 0; t < 3000 && C.length < nC; t++) {
    const x = 6 + R() * (MW - 12), y = 6 + R() * (MH - 12);
    if (edgeBand(Math.floor(x), Math.floor(y)) || C.some(c => Math.hypot(c.x - x, c.y - y) < 8.5)) continue;
    C.push({ x, y, r: 2.4 + R() * 1.8 });
  }
  C.sort((a, b) => (a.x + a.y) - (b.x + b.y));   // entry near the top of the screen
  const inTree = [0];
  while (inTree.length < C.length) {
    let best = null;
    for (const a of inTree) for (let b = 0; b < C.length; b++) if (!inTree.includes(b)) { const d = Math.hypot(C[a].x - C[b].x, C[a].y - C[b].y); if (!best || d < best[2]) best = [a, b, d]; }
    addPath([C[best[0]].x, C[best[0]].y], [C[best[1]].x, C[best[1]].y], 0.75, R); inTree.push(best[1]);
  }
  for (let e = 0; e < 2; e++) { const a = R.int(0, C.length - 1), b = R.int(0, C.length - 1); if (a !== b) addPath([C[a].x, C[a].y], [C[b].x, C[b].y], 0.6, R); }
  // a river meanders across the forest; wherever a path crosses it there is a plank bridge
  {
    let j = MH * (0.35 + R() * 0.3), dj = 0, prev = [0, j];
    for (let i = 1; i <= MW; i++) {
      dj = clamp(dj + (R() - 0.5) * 0.5, -0.7, 0.7); j = clamp(j + dj, MH * 0.2, MH * 0.8);
      LV.river.push([prev[0], prev[1], i, j, 1.15 + Math.sin(i * 0.3) * 0.2]); prev = [i, j];
    }
  }
  bakePathField();
  LV.rooms = C.map(c => ({ x: Math.floor(c.x - c.r), y: Math.floor(c.y - c.r), w: Math.ceil(c.r * 2), h: Math.ceil(c.r * 2), cx: Math.floor(c.x), cy: Math.floor(c.y), clr: c }));
  LV.start = LV.rooms[0];
  let far = 1, fd = -1;
  LV.rooms.forEach((r, n) => { const d = Math.hypot(r.cx - LV.start.cx, r.cy - LV.start.cy); if (n && d > fd) { fd = d; far = n; } });
  LV.stairs = { i: LV.rooms[far].cx, j: LV.rooms[far].cy, room: far, entrance: true };
  plantEdge(R, autumn);
  // river tiles are water (solid) except where a path crosses: those are bridges
  for (let j = 0; j < MH; j++) for (let i = 0; i < MW; i++) {
    if (riverD(i + 0.5, j + 0.5) >= 0.05) continue;
    if (pathD(i + 0.5, j + 0.5) < 0.35) { LV.solid[tIdx(i, j)] = 0; LV.bridges.push([i, j]); } else LV.solid[tIdx(i, j)] = 1;
  }
  const inClearing = (i, j) => C.some(c => Math.hypot(i + 0.5 - c.x, j + 0.5 - c.y) < c.r + 0.6);
  // ponds in the woods away from paths and clearings; their tiles are solid water
  LV.ponds = [];
  for (let t = 0; t < 400 && LV.ponds.length < Math.round(3 * area); t++) {
    const x = 6 + R() * (MW - 12), y = 6 + R() * (MH - 12), rx = 1.8 + R() * 2.2, ry = 1.6 + R() * 1.8;
    if (pathD(x, y) < Math.max(rx, ry) + 1.2 || riverD(x, y) < Math.max(rx, ry) + 2 || C.some(c => Math.hypot(c.x - x, c.y - y) < c.r + Math.max(rx, ry) + 1) || LV.ponds.some(p => Math.hypot(p.x - x, p.y - y) < 8)) continue;
    LV.ponds.push({ x, y, rx, ry, seed: R.int(1, 1e6) });
    for (let j = Math.floor(y - ry - 1); j <= y + ry + 1; j++) for (let i = Math.floor(x - rx - 1); i <= x + rx + 1; i++) if (i > 0 && j > 0 && i < MW && j < MH && pondD(i + 0.5, j + 0.5) < 1.1) LV.solid[tIdx(i, j)] = 1;
  }
  // interior trees, thicker away from paths and clearings
  for (let j = 0; j < MH; j++) for (let i = 0; i < MW; i++) {
    if (edgeBand(i, j) || inClearing(i, j)) continue;
    const pd = pathD(i + 0.5, j + 0.5); if (pd < 0.9) continue;
    const dens = 0.18 + clamp(pd - 1, 0, 3) * 0.08 + vnoise(i, j, 5, 31) * 0.15;
    if (R() < dens && canTree(i, j)) { LV.solid[tIdx(i, j)] = 1; LV.decor.push({ kind: 'tree', i, j, ...treeKind(R, autumn), jx: (R() - 0.5) * 0.4, jy: (R() - 0.5) * 0.4 }); }
  }
  // undergrowth and clutter: bushes, rocks, stumps, logs, mushrooms, ferns
  for (let n = 0; n < 150 * area; n++) {
    const fi = 3 + R() * (MW - 6), fj = 3 + R() * (MH - 6), i = Math.floor(fi), j = Math.floor(fj);
    if (edgeBand(i, j) || solidAt(i, j) || pathD(fi, fj) < 0.2) continue;
    const q = R(), seed = R.int(0, 5);
    if (q < 0.4) LV.decor.push({ kind: 'bush', fi, fj, seed, autumn: autumn && R() < 0.5 });
    else if (q < 0.55) LV.decor.push({ kind: 'fern', fi, fj, seed });
    else if (q < 0.67) LV.decor.push({ kind: 'shroom', fi, fj, seed });
    else if (q < 0.8 && canTree(i, j)) { LV.solid[tIdx(i, j)] = 1; LV.decor.push({ kind: 'rock', i, j, seed }); }
    else if (q < 0.9 && canTree(i, j)) { LV.solid[tIdx(i, j)] = 1; LV.decor.push({ kind: 'stump', i, j, seed }); }
    else LV.decor.push({ kind: 'log', fi, fj, seed, yaw: R() * Math.PI });
  }
  // the dungeon entrance: standing stones around the stairs
  const S = LV.stairs;
  for (let k = 0; k < 5; k++) {
    const a = k / 5 * Math.PI * 2 + 0.4, i = Math.round(S.i + Math.cos(a) * 2.2), j = Math.round(S.j + Math.sin(a) * 2.2);
    if (!solidAt(i, j) && (k !== 1)) { LV.solid[tIdx(i, j)] = 1; LV.decor.push({ kind: 'menhir', i, j, seed: k }); }
  }
  // camps: a fire with log seats and a tent in two clearings, where a band of monsters waits
  const camps = LV.rooms.map((r, n) => n).filter(n => n && n !== far).sort(() => R() - 0.5).slice(0, 2);
  for (const n of camps) {
    const c = C[n], i = Math.floor(c.x), j = Math.floor(c.y);
    LV.decor.push({ kind: 'campfire', i, j });
    LV.solid[tIdx(i, j)] = 1;
    const ti = Math.floor(c.x - 1.6), tj = Math.floor(c.y - 1.8);
    if (!solidAt(ti, tj)) { LV.solid[tIdx(ti, tj)] = 1; LV.decor.push({ kind: 'tent', i: ti, j: tj }); }
    LV.decor.push({ kind: 'log', fi: c.x + 1.4, fj: c.y + 0.2, seed: 1, yaw: 1.2 }, { kind: 'log', fi: c.x - 0.2, fj: c.y + 1.5, seed: 2, yaw: 0.1 });
    if (n === camps[0]) LV.spawns.push({ id: 'gchief', fi: c.x + 1.2, fj: c.y - 1 });   // one camp has a chieftain
  }
  // ruins: in a clearing or two, a broken ring of crumbling walls and columns around an old statue,
  // with a chest and a few brigands keeping it
  const ruinRooms = LV.rooms.map((r, n) => n).filter(n => n && n !== far && !camps.includes(n) && C[n].r > 3).sort(() => R() - 0.5).slice(0, Math.max(1, Math.round(area * 0.7)));
  for (const n of ruinRooms) {
    const c = C[n];
    for (let k = 0; k < 14; k++) {
      if (k % 5 === 2) continue;   // gaps in the ring
      const a = k / 14 * Math.PI * 2, i = Math.floor(c.x + Math.cos(a) * (c.r + 0.2)), j = Math.floor(c.y + Math.sin(a) * (c.r + 0.2));
      if (solidAt(i, j) || pathD(i + 0.5, j + 0.5) < 0.2) continue;
      LV.solid[tIdx(i, j)] = 1;
      LV.decor.push(k % 3 === 0 ? { kind: 'column', i, j, seed: R.int(0, 3) } : { kind: 'ruinwall', i, j, a: a + Math.PI / 2, seed: R.int(0, 3) });
    }
    const si = Math.floor(c.x), sj = Math.floor(c.y);
    if (!solidAt(si, sj)) { LV.solid[tIdx(si, sj)] = 1; LV.decor.push({ kind: 'statue', i: si, j: sj }); }
    if (!solidAt(si + 1, sj - 1)) { LV.solid[tIdx(si + 1, sj - 1)] = 1; LV.decor.push({ kind: 'chest', i: si + 1, j: sj - 1, seed: R.int(1, 1e6) }); }
    for (let b = 0; b < 2; b++) LV.spawns.push({ id: LV.night ? 'wraith' : 'brigand', fi: c.x - 1 + b * 2, fj: c.y + 1.2 });   // at night the ruins are haunted
    c.ruin = true;
  }
  // shrines: a stone pedestal under a floating crystal; touching one grants a blessing once
  const shrineRooms = LV.rooms.map((r, n) => n).filter(n => n && n !== far && !camps.includes(n) && !C[n].ruin).sort(() => R() - 0.5).slice(0, 3);
  shrineRooms.forEach((n, k) => {
    const c = C[n], i = Math.floor(c.x - 1), j = Math.floor(c.y + 1);
    if (solidAt(i, j)) return;
    LV.solid[tIdx(i, j)] = 1; LV.decor.push({ kind: 'shrine', i, j, type: ['frenzy', 'stone', 'fortune'][k % 3] });
  });
  // a chest or two at the edge of a clearing
  for (let c = 0; c < 2; c++) {
    const r = LV.rooms[R.int(1, LV.rooms.length - 1)], a = R() * 6.28, i = Math.floor(r.clr.x + Math.cos(a) * (r.clr.r - 0.3)), j = Math.floor(r.clr.y + Math.sin(a) * (r.clr.r - 0.3));
    if (!solidAt(i, j) && Math.abs(i - S.i) + Math.abs(j - S.j) > 2) { LV.solid[tIdx(i, j)] = 1; LV.decor.push({ kind: 'chest', i, j, seed: R.int(1, 1e6) }); }
  }
  // flowers are painted into the ground; barrels by camps
  LV.decor.push({ kind: 'meadow', seed: R.int(1, 1e6) });
  // the warlord's lair: he waits at the dungeon entrance among a goblin camp; the way down is
  // sealed until he falls
  {
    const r = LV.rooms[far], c = C[far];
    LV.spawns.push({ id: autumn ? 'treant' : 'warlord', fi: c.x + 1.2, fj: c.y - 1.2 });   // autumn woods have a treant elder
    for (const [dx, dy] of [[-2.4, -1.6], [2.2, 1.8]]) { const i = Math.floor(c.x + dx), j = Math.floor(c.y + dy); if (!solidAt(i, j) && Math.hypot(i - S.i, j - S.j) > 1.5) { LV.solid[tIdx(i, j)] = 1; LV.decor.push({ kind: 'tent', i, j }); } }
    void r;
  }
  // monsters: a pack per clearing (more in camps), plus a few on the paths
  // the forest's own (goblins, wolves) come often; dungeon dwellers wander out now and then
  const pool = Object.keys(MONSTERS).filter(id => !MONSTERS[id].unique && (MONSTERS[id].minLevel || 1) <= A.diff && !['spider', 'shaman', 'burning', 'wraith'].includes(id));
  for (const id of ['goblin', 'goblin', 'wolf', 'wolf', 'slime', 'slime', 'boar', 'gshaman', 'brigand', 'shroom', 'shroom', 'sporecap']) pool.push(id);
  if (A.diff >= 4) pool.push('bear');   // dire bears from the autumn woods on
  const free = (x, y, rad) => { for (let t = 0; t < 30; t++) { const fi = x + (R() - 0.5) * rad * 2, fj = y + (R() - 0.5) * rad * 2; if (!blocked(fi, fj)) return [fi, fj]; } return null; };
  LV.rooms.forEach((r, n) => {
    if (n === 0 || n === far) return;
    let budget = (camps.includes(n) ? 4 : 2) + Math.floor(A.diff * 0.6);
    while (budget > 0) {
      const id = R.pick(pool), m = MONSTERS[id], count = m.pack ? R.int(2, 3) : 1;
      for (let c = 0; c < count; c++) { const p = free(r.clr.x, r.clr.y, r.clr.r); if (p) LV.spawns.push({ id, fi: p[0], fj: p[1] }); }
      budget -= m.pack ? 2 : 1;
    }
  });
  if (R() < 0.7) { const r = LV.rooms[R.int(1, LV.rooms.length - 1)]; if (r !== LV.rooms[far]) LV.spawns.push({ id: 'treasure', fi: r.clr.x, fj: r.clr.y + 1 }); }   // a treasure goblin
  // a cap so deeper forests stay playable on a phone: drop random extras, never a boss or chieftain
  while (LV.spawns.length > 72) {
    const k = R.int(0, LV.spawns.length - 1), id = LV.spawns[k].id;
    if (MONSTERS[id].unique || MONSTERS[id].elite) continue;
    LV.spawns.splice(k, 1);
  }
}

function genTown(R, A) {
  const autumn = A.act === 1, cx = 19.5, cy = 17.5, RAD = 9.5;
  // a palisade ring with a gate at the bottom right; the road runs out of the gate to the exit
  const gateA = Math.PI * 0.25;
  plantEdge(R, autumn);
  const gate = [cx + Math.cos(gateA) * RAD, cy + Math.sin(gateA) * RAD];
  const exit = [33.5, 30.5];
  addPath([cx, cy], gate, 0.9, () => 0.5);
  addPath(gate, exit, 0.8, R);
  LV.plaza = { x: cx, y: cy, r: 3.6 };
  for (let k = 0; k < 120; k++) {
    const a = k / 120 * Math.PI * 2, da = Math.abs(((a - gateA + Math.PI) % (Math.PI * 2)) - Math.PI);
    if (da < 0.16) continue;   // the gate opening
    const fi = cx + Math.cos(a) * RAD, fj = cy + Math.sin(a) * RAD, i = Math.floor(fi), j = Math.floor(fj);
    if (LV.solid[tIdx(i, j)] === 2) continue;
    LV.solid[tIdx(i, j)] = 1;
    if (!LV.decor.some(d => d.kind === 'palisade' && d.i === i && d.j === j)) LV.decor.push({ kind: 'palisade', i, j, a });
  }
  // gate posts with a lantern each
  for (const s of [-1, 1]) { const a = gateA + s * 0.2; LV.decor.push({ kind: 'lantern', fi: cx + Math.cos(a) * (RAD + 0.6), fj: cy + Math.sin(a) * (RAD + 0.6) }); }
  // buildings around the plaza: [kind, tile x, tile y, footprint w, h]
  const B = [['cabin', cx - 6.5, cy - 4.5, 3, 3], ['forge', cx + 1.5, cy - 7, 3, 3], ['hut', cx - 6.5, cy + 2, 2, 2], ['stall', cx + 3.5, cy + 1, 2, 1], ['stall2', cx + 1, cy + 4.2, 1, 2], ['tent', cx - 2.5, cy + 5, 2, 2], ['well', cx - 1, cy - 1, 1, 1]];
  for (const [kind, x, y, w, h] of B) {
    const i0 = Math.floor(x), j0 = Math.floor(y);
    for (let j = j0; j < j0 + h; j++) for (let i = i0; i < i0 + w; i++) LV.solid[tIdx(i, j)] = 1;
    LV.decor.push({ kind, i: i0, j: j0, w, h });
  }
  LV.decor.push({ kind: 'campfire', i: Math.floor(cx + 2.5), j: Math.floor(cy - 2) }); LV.solid[tIdx(Math.floor(cx + 2.5), Math.floor(cy - 2))] = 1;
  // paths from the plaza to each door
  for (const [kind, x, y, w, h] of B) if (kind !== 'well') addPath([cx, cy], [x + w + 0.3, y + h / 2], 0.55, R);
  // pumpkin patch, hay, crates and barrels, lanterns, a few trees inside the walls
  for (let n = 0; n < 7; n++) LV.decor.push({ kind: 'pumpkin', fi: cx - 7 + R() * 2.5, fj: cy + 5 + R() * 2, seed: n % 4 });
  for (const [x, y] of [[cx + 5.5, cy - 2.5], [cx + 6, cy - 1.5], [cx - 3.5, cy - 6.5]]) { const i = Math.floor(x), j = Math.floor(y); LV.solid[tIdx(i, j)] = 1; LV.decor.push({ kind: 'hay', i, j }); }
  for (const [x, y, k] of [[cx + 4.5, cy - 5.2, 'barrel'], [cx + 5.4, cy - 4.4, 'crate'], [cx - 3.6, cy + 1.6, 'barrel'], [cx + 5.6, cy + 2.6, 'crate']]) { const i = Math.floor(x), j = Math.floor(y); if (!LV.solid[tIdx(i, j)]) { LV.solid[tIdx(i, j)] = 1; LV.decor.push({ kind: k, i, j, seed: i * 7 + j }); } }
  for (const [x, y] of [[cx - 2.6, cy - 2.6], [cx + 2.8, cy + 2.4], [cx - 3.2, cy + 3]]) LV.decor.push({ kind: 'lantern', fi: x, fj: y });
  for (const [x, y] of [[cx + 6.2, cy + 4.6], [cx - 7.5, cy - 0.6], [cx + 6.5, cy - 6]]) { const i = Math.floor(x), j = Math.floor(y); if (!LV.solid[tIdx(i, j)]) { LV.solid[tIdx(i, j)] = 1; LV.decor.push({ kind: 'tree', i, j, tree: autumn ? 'autumn' : 'oak', seed: i % 5, jx: 0, jy: 0 }); } }
  // the outside: meadow, scattered trees and bushes between the palisade and the edge
  for (let j = 0; j < MH; j++) for (let i = 0; i < MW; i++) {
    if (edgeBand(i, j) || Math.hypot(i + 0.5 - cx, j + 0.5 - cy) < RAD + 1.5 || pathD(i + 0.5, j + 0.5) < 1) continue;
    if (R() < 0.12 && canTree(i, j)) { LV.solid[tIdx(i, j)] = 1; LV.decor.push({ kind: 'tree', i, j, ...treeKind(R, autumn), jx: (R() - 0.5) * 0.4, jy: (R() - 0.5) * 0.4 }); }
    else if (R() < 0.08) LV.decor.push({ kind: 'bush', fi: i + R(), fj: j + R(), seed: R.int(0, 5), autumn: autumn && R() < 0.5 });
  }
  // the farm outside the walls: a plowed field of cabbages, a pen of sheep and pigs, a windmill
  LV.fields = [{ x0: 4.5, y0: 26.5, x1: 12.5, y1: 33.5 }];
  for (let j = 27; j <= 33; j++) for (let i = 5; i <= 12; i++) if (j % 2 === 1 && R() < 0.8) LV.decor.push({ kind: 'crop', fi: i + 0.5 + (R() - 0.5) * 0.3, fj: j + 0.4, seed: R.int(0, 3) });
  const pen = { i0: 14, j0: 28, i1: 20, j1: 33 };
  for (let j = pen.j0; j <= pen.j1; j++) for (let i = pen.i0; i <= pen.i1; i++) {
    const edge = i === pen.i0 || i === pen.i1 || j === pen.j0 || j === pen.j1;
    if (!edge || (i === pen.i0 + 3 && j === pen.j0)) continue;   // a gap for the gate
    LV.solid[tIdx(i, j)] = 1; LV.decor.push({ kind: 'fence', i, j, along: (j === pen.j0 || j === pen.j1) ? 1 : 0 });
  }
  for (let n = 0; n < 6; n++) LV.critters.push({ kind: n % 2 ? 'pig' : 'sheep', fi: pen.i0 + 1.5 + R() * 4, fj: pen.j0 + 1.5 + R() * 3 });
  for (const [i, j] of [[8, 22], [9, 22], [8, 23], [9, 23]]) LV.solid[tIdx(i, j)] = 1;
  LV.decor.push({ kind: 'windmill', i: 8, j: 22, w: 2, h: 2 });
  LV.decor.push({ kind: 'meadow', seed: R.int(1, 1e6) });
  LV.rooms = [{ x: Math.floor(cx - 2), y: Math.floor(cy - 2), w: 4, h: 4, cx: Math.floor(cx), cy: Math.floor(cy + 1.5) }];
  LV.start = LV.rooms[0];
  LV.stairs = { i: Math.floor(exit[0]), j: Math.floor(exit[1]), room: 0, road: true };
  LV.decor.push({ kind: 'signpost', fi: exit[0] - 1.3, fj: exit[1] - 0.6 });
  // townsfolk
  LV.npcs = [
    { role: 'smith', name: 'SMITHY', fi: cx + 3.2, fj: cy - 3.4 },
    { role: 'merchant', name: 'MERCHANT', fi: cx + 4.6, fj: cy + 2.2 },
    { role: 'villager', fi: cx - 2, fj: cy + 2 }, { role: 'villager', fi: cx - 4.4, fj: cy - 1.2 }, { role: 'farmer', fi: cx - 5.5, fj: cy + 5.5 },
  ];
  for (let n = 0; n < 5; n++) LV.critters.push({ kind: 'chicken', fi: cx - 4 + R() * 6, fj: cy + 2 + R() * 3 });
}

// ---------------------------------------------------------------- the Act I hub (round 26, round 41)
// Hand-built, not generated: the layout is fixed and only the small scatter (grass, flowers, which
// trees grow where, rocks) varies per seed. North is up on the screen (-i, -j). Round 41 (the user:
// enemies too close to the camp, the camp too small and crowded, everyone needs their own spot):
// the map grew from 64 to 84 tiles and the camp is a walled ring of sharpened logs, 13 tiles across
// the middle, with a gate toward each quarter. Inside, round the campfire and its log benches, each
// person has a place of their own: Brother Osric at his altar on the cathedral steps, the smith at
// his forge, the potion seller at her wagon, the refugees' tents by the well, and two places kept
// empty for people the quests will bring back (the woodcutter's woodpile, the farmer's hay cart).
// No monster is placed within HUB.safe (26 tiles) of the fire. The mine is north, bandits hold the
// farm to the east, wolves the woods to the west (with their den), the road south is shut by a gate.
const HUB = {
  camp: [42.5, 42.5], start: [44.6, 45.6], wallR: 13, safe: 26,
  cathedral: { i: 31, j: 37, w: 6, h: 3 },
  mine: [16, 16], farm: [66, 18], woods: [16, 66], den: [10.5, 70.5], gate: [64.5, 64.5], cellar: [71.6, 14.4],
  // gates in the camp wall: the angle (in tile space) toward each quarter
  gates: { north: -2.36, east: -0.83, west: 2.39, south: 0.785 },
};
function genHub(R, A) {
  const H = HUB, [cx, cy] = H.camp, RAD = H.wallR;
  plantEdge(R, false);
  const at = (a, r) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  const gateAt = k => at(H.gates[k], RAD), outside = k => at(H.gates[k], RAD + 3);
  // roads: from the fire out of each gate and on to its quarter; paths to each person's place
  const road = (pts, w) => { for (let k = 0; k + 1 < pts.length; k++) addPath(pts[k], pts[k + 1], w, R); };
  road([[cx, cy], gateAt('north'), outside('north'), [26, 22], [H.mine[0] + 1.5, H.mine[1] + 1.5]], 0.85);
  road([[cx, cy], gateAt('east'), outside('east'), [58, 28], [H.farm[0] - 2, H.farm[1] + 3]], 0.8);
  road([[cx, cy], gateAt('west'), outside('west'), [26, 58], [H.woods[0] + 3, H.woods[1] - 2]], 0.75);
  road([[H.woods[0] + 3, H.woods[1] - 2], [15.5, 68.5], [H.den[0] + 2.6, H.den[1] + 1.4]], 0.6);   // a trail on to the den's mouth
  road([[cx, cy], gateAt('south'), outside('south'), [H.gate[0] - 1.5, H.gate[1] - 1.5]], 0.85);
  const C = H.cathedral;
  const SPOTS = { osric: [C.i + C.w + 1.6, C.j + 1.5], smith: [46.4, 38.6], potions: [48.2, 44.2], tents: [38.5, 48.5], woodcutter: [35.8, 44.6], farmer: [43.8, 35.6] };
  for (const k in SPOTS) road([[cx, cy], SPOTS[k]], 0.5);
  bakePathField();   // the scatter below asks how far each tile is from a road
  LV.plaza = { x: cx, y: cy, r: 4.6 };
  const solidRect = (i0, j0, w, h) => { for (let j = j0; j < j0 + h; j++) for (let i = i0; i < i0 + w; i++) LV.solid[tIdx(i, j)] = 1; };
  const put = (kind, i, j, w, h, extra = {}) => { solidRect(i, j, w, h); LV.decor.push({ kind, i, j, w, h, ...extra }); };
  const small = (kind, i, j, extra = {}) => { if (LV.solid[tIdx(i, j)]) return; LV.solid[tIdx(i, j)] = 1; LV.decor.push({ kind, i, j, seed: i * 7 + j, ...extra }); };
  const lamp = (fi, fj) => LV.decor.push({ kind: 'lantern', fi, fj });
  // the camp wall: sharpened logs round the ring, a gap at each gate with a lantern either side
  for (let k = 0; k < 180; k++) {
    const a = k / 180 * Math.PI * 2;
    if (Object.values(H.gates).some(g => Math.abs(((a - g + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 0.125)) continue;
    const [fi, fj] = at(a, RAD), i = Math.floor(fi), j = Math.floor(fj);
    if (LV.solid[tIdx(i, j)]) continue;
    LV.solid[tIdx(i, j)] = 1; LV.decor.push({ kind: 'palisade', i, j, a });
  }
  for (const g of Object.values(H.gates)) for (const sd of [-1, 1]) { const [fi, fj] = at(g + sd * 0.15, RAD + 0.6); lamp(fi, fj); }
  // the cathedral, with Osric's altar before its doors; the graveyard outside the wall behind it
  put('cathedral', C.i, C.j, C.w, C.h);
  small('altar', 38, 37);
  lamp(37.6, 41.2);
  for (let n = 0; n < 12; n++) { const i = Math.floor(22 + (n % 4) * 1.7 + R() * 0.4), j = Math.floor(33 + Math.floor(n / 4) * 1.8 + R() * 0.4); small('grave', i, j, { seed: n }); }
  // the fire in the middle, log benches round it
  LV.decor.push({ kind: 'campfire', i: Math.floor(cx), j: Math.floor(cy) }); LV.solid[tIdx(Math.floor(cx), Math.floor(cy))] = 1;
  for (const [a, yaw] of [[0.4, 2.0], [2.5, 0.9], [4.3, 2.6]]) LV.decor.push({ kind: 'log', fi: cx + Math.cos(a) * 2.3, fj: cy + Math.sin(a) * 2.3, yaw });
  // the smith's forge, barrels and crates of iron beside it
  put('forge', 47, 34, 3, 3);
  for (const [i, j, k] of [[50, 36, 'barrel'], [50, 37, 'crate'], [46, 35, 'crate']]) small(k, i, j);
  lamp(45.4, 37.4);
  // the potion seller's wagon, a stall of herbs beside it
  put('wagon', 50, 43, 2, 2); put('stall', 49, 47, 2, 1);
  for (const [i, j, k] of [[52, 46, 'crate'], [52, 42, 'barrel']]) small(k, i, j);
  lamp(48.4, 41.6);
  // the refugees: tents in a row by the well, supplies
  put('tent', 34, 47, 2, 2); put('tent', 37, 50, 2, 2); put('tent', 41, 52, 2, 2);
  small('well', 44, 49);
  for (const [i, j, k] of [[33, 50, 'barrel'], [36, 53, 'crate'], [44, 53, 'barrel']]) small(k, i, j);
  lamp(39.6, 47.4);
  // the two places waiting for people the quests bring back
  put('woodpile', 33, 43, 2, 1); put('haycart', 43, 32, 2, 1);
  // east: the farm the bandits took: a farmhouse, a windmill, ploughed fields, fences
  put('cabin', 68, 13, 3, 3); put('windmill', 63, 12, 2, 2);
  LV.fields = [{ x0: 61.5, y0: 17.5, x1: 71.5, y1: 24.5 }, { x0: 69.5, y0: 26.5, x1: 74.5, y1: 32.5 }];
  for (const f of LV.fields) for (let j = Math.ceil(f.y0); j < f.y1; j++) for (let i = Math.ceil(f.x0); i < f.x1; i++) if (j % 2 === 1 && R() < 0.75) LV.decor.push({ kind: 'crop', fi: i + 0.5 + (R() - 0.5) * 0.3, fj: j + 0.4, seed: R.int(0, 3) });
  for (let i = 61; i <= 72; i++) if (i !== 66 && i !== 67) small('fence', i, 25, { along: 1 });
  for (const [i, j] of [[65, 28], [67, 29], [62, 27]]) small('hay', i, j);
  // north: the mining camp: the mine mouth in a rock face, carts, crates, a few pines and boulders
  put(mineOpen() ? 'mine' : 'minebarred', H.mine[0] - 2, H.mine[1] - 2, 3, 3);   // round 42b: chained shut until the key
  for (const [i, j, k] of [[20, 15, 'crate'], [20, 16, 'barrel'], [15, 20, 'crate'], [21, 20, 'rock'], [13, 21, 'rock'], [23, 13, 'rock']]) small(k, i, j, k === 'rock' ? { seed: i % 5 } : {});
  small('cart', 18, 19);
  // west: deep woods, and the wolves' den in a rocky mound
  put('den', Math.floor(H.den[0]) - 1, Math.floor(H.den[1]) - 1, 2, 2);
  // south: a stone wall across the road with a shut gate and a sign, end to end into the border trees
  for (let k = -30; k <= 30; k++) {
    const i = Math.floor(H.gate[0]) + k, j = Math.floor(H.gate[1]) - k;
    if (k === 0 || i < 0 || j < 0 || i >= MW || j >= MH) continue;
    LV.solid[tIdx(i, j)] = 1; if (!edgeBand(i, j)) LV.decor.push({ kind: 'stonewall', i, j });
  }
  // the gate opens for good once this act's boss is dead (G.gates, saved, one flag per cycle)
  LV.gateOpen = !!(G.gates && G.gates[A.cyc]);
  if (LV.gateOpen) LV.decor.push({ kind: 'gateo', i: Math.floor(H.gate[0]), j: Math.floor(H.gate[1]), w: 1, h: 1 });
  else put('gate', Math.floor(H.gate[0]), Math.floor(H.gate[1]), 1, 1);
  LV.decor.push({ kind: 'signpost', fi: H.gate[0] - 2.2, fj: H.gate[1] - 0.6 });
  LV.gateSign = [H.gate[0] - 1, H.gate[1] - 1];
  // scatter: open meadow round the camp, trees thickening toward the west woods, a clearing before the den
  const keepOut = (i, j) => Math.hypot(i - cx, j - cy) < RAD + 3.5 || Math.hypot(i - (H.den[0] + 2), j - (H.den[1] + 1)) < 3.2 || (i > 20 && i < 30 && j > 31 && j < 41) || LV.fields.some(f => i > f.x0 - 1 && i < f.x1 + 1 && j > f.y0 - 1 && j < f.y1 + 1);
  for (let j = 0; j < MH; j++) for (let i = 0; i < MW; i++) {
    if (edgeBand(i, j) || keepOut(i + 0.5, j + 0.5) || LV.solid[tIdx(i, j)] || pathD(i + 0.5, j + 0.5) < 1.1) continue;
    const west = clamp(1 - Math.hypot(i - H.woods[0], j - H.woods[1]) / 19, 0, 1), north = clamp(1 - Math.hypot(i - H.mine[0], j - H.mine[1]) / 14, 0, 1);
    const near = clamp(1 - (Math.hypot(i - cx, j - cy) - RAD) / 12, 0, 1);   // the meadow round the wall stays open
    const dens = (0.04 + west * 0.3 + north * 0.1 + vnoise(i, j, 5, 31) * 0.05) * (1 - near * 0.8);
    if (R() < dens && canTree(i, j)) { LV.solid[tIdx(i, j)] = 1; LV.decor.push({ kind: 'tree', i, j, tree: west > 0.2 || north > 0.2 || R() < 0.4 ? 'pine' : 'oak', seed: R.int(0, 5), jx: (R() - 0.5) * 0.4, jy: (R() - 0.5) * 0.4 }); }
    else if (R() < 0.05) LV.decor.push({ kind: R() < 0.7 ? 'bush' : 'fern', fi: i + R(), fj: j + R(), seed: R.int(0, 5) });
    else if (north > 0.1 && R() < 0.04 && canTree(i, j)) { LV.solid[tIdx(i, j)] = 1; LV.decor.push({ kind: 'rock', i, j, seed: R.int(0, 5) }); }
  }
  LV.decor.push({ kind: 'meadow', seed: R.int(1, 1e6) });
  LV.rooms = [{ x: Math.floor(cx - 2), y: Math.floor(cy - 2), w: 4, h: 4, cx: Math.floor(H.start[0]), cy: Math.floor(H.start[1]) }];
  LV.start = LV.rooms[0];
  LV.stairs = { i: H.mine[0] + 1, j: H.mine[1] + 1, room: 0, mine: true };   // the way on: into the mine
  // the people of the camp, each at their own place
  LV.npcs = [
    { role: 'priest', name: 'BROTHER OSRIC', fi: SPOTS.osric[0], fj: SPOTS.osric[1] },
    { role: 'smith', name: 'SMITHY', fi: SPOTS.smith[0], fj: SPOTS.smith[1] },
    { role: 'merchant', name: 'POTIONS', fi: SPOTS.potions[0], fj: SPOTS.potions[1] },
    { role: 'villager', fi: 40.5, fj: 46.5 }, { role: 'villager', fi: 44.5, fj: 47.8 },
  ];
  // round 42b: Wren by the tents; Hollis by the fire until his farm is back, then at his hay cart; Aldo home at his woodpile once freed
  { const f = (G.story && G.story.f) || {}, home = f.farmPaid || A.loop > 0 || (G.gates && G.gates[0]);
    LV.npcs.push({ role: 'wren', name: 'WREN', fi: SPOTS.tents[0] - 1.2, fj: SPOTS.tents[1] - 1.6 });
    LV.npcs.push({ role: 'hollis', name: 'HOLLIS', fi: home ? SPOTS.farmer[0] : cx + 0.6, fj: home ? SPOTS.farmer[1] : cy + 3.1 });   // by the fire's south bench
    if (f.aldoFree || A.loop > 0 || (G.gates && G.gates[0])) LV.npcs.push({ role: 'aldo', name: 'ALDO', fi: SPOTS.woodcutter[0], fj: SPOTS.woodcutter[1] }); }
  // monsters by quarter, out beyond the camp's meadow
  const pack = (id, n, p, spread) => { for (let k = 0; k < n; k++) LV.spawns.push({ id, fi: p[0] + (R() - 0.5) * spread, fj: p[1] + (R() - 0.5) * spread }); };
  for (const p of [[19, 21], [23, 15], [14, 13], [24, 22], [12, 24]]) pack('digger', R.int(2, 3), p, 2.5);   // north
  for (const p of [[65, 21], [70, 20], [67, 15], [72, 29], [60, 13]]) pack('brigand', R.int(1, 2), p, 2.5);   // east
  for (const p of [[14, 62], [19, 69], [12, 67], [22, 64], [24, 72]]) pack('wolf', R.int(2, 3), p, 2.5);   // west
  LV.spawns = LV.spawns.filter(s => Math.hypot(s.fi - cx, s.fj - cy) > H.safe);
}

// ---------------------------------------------------------------- ground
// grass from layered noise in the olive ramp, small tufts and flower clusters; dirt paths with a
// dithered edge and pebbles; the canopy texture fills everything past the map
// the two broad noise layers of the grass change slowly, so they are sampled every 4 px and
// blended (the floor bake of a big forest was spending most of its time here)
let grassGrid = null, GGW = 0;
function bakeGrassNoise() {
  GGW = (WW >> 2) + 2; const gh = (WH >> 2) + 2; grassGrid = new Float32Array(GGW * gh);
  for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < GGW; gx++) {
    const x = gx * 4, y = gy * 4, A = (x - WX0) + 2 * (y - WY0), B = 2 * (y - WY0) - (x - WX0);
    grassGrid[gy * GGW + gx] = 1.7 + vnoise(A, B, 70, 21) * 2.2 + vnoise(A, B, 19, 22) * 1.0;
  }
}
function grassBase(x, y) {
  const gx = x >> 2, gy = y >> 2, fx = (x & 3) / 4, fy = (y & 3) / 4, k = gy * GGW + gx;
  return (grassGrid[k] * (1 - fx) + grassGrid[k + 1] * fx) * (1 - fy) + (grassGrid[k + GGW] * (1 - fx) + grassGrid[k + GGW + 1] * fx) * fy;
}
function grassAt(x, y, A, B) {
  let t = (grassGrid ? grassBase(x, y) : 1.7 + vnoise(A, B, 70, 21) * 2.2 + vnoise(A, B, 19, 22) * 1.0) + vnoise(A, B, 6, 23) * 0.5;
  // tufts: one per 7x5 cell, a light blade pair over a dark root
  const cx = Math.floor(x / 7), cy = Math.floor(y / 5), h = hash(cx, cy, 41);
  if (h < 0.55) {
    const tx = cx * 7 + 1 + Math.floor(h * 9) % 5, ty = cy * 5 + 3;
    if (y === ty && x === tx) t -= 1.2;
    else if (y === ty - 1 && (x === tx - 1 || x === tx + 1)) t += 1.1;
    else if (y === ty - 2 && x === tx && h < 0.3) t += 1.4;
  }
  return GRASS[clamp(Math.floor(t), 0, 6)];
}
function dirtAt(x, y, A, B) {
  let t = 2 + vnoise(A, B, 23, 51) * 1.6 + vnoise(A, B, 5, 52) * 0.7;
  const h = hash(x, y, 53);
  if (h < 0.012) t += 1.6; else if (h > 0.992) t -= 1.4;
  if (hash(x, y - 1, 53) < 0.012) t -= 1;   // a pebble's shadow
  return DIRT[clamp(Math.floor(t), 0, 5)];
}
const CANOPY = new Uint8Array(96 * 64);
function bakeCanopy(autumn) {
  for (let y = 0; y < 64; y++) for (let x = 0; x < 96; x++) {
    // overlapping leaf clumps, each lit from the upper left
    // the top clump (drawn last) wins; each clump is green or, in autumn, sometimes orange
    let v = 0, top = -1;
    for (let k = 0; k < 14; k++) {
      const cx = hash(k, 1, 61) * 96, cy = hash(k, 2, 61) * 64, r = 9 + hash(k, 3, 61) * 8;
      for (const ox of [-96, 0, 96]) for (const oy of [-64, 0, 64]) {
        const dx = (x - cx - ox) / r, dy = (y - cy - oy) / r, d = dx * dx + dy * dy;
        if (d < 1) { v = 1.2 + (1 - d) * 1.2 - (dx + dy) * 0.9; top = k; }
      }
    }
    if (hash(x, y, 62) < 0.06) v += 0.6;
    const ramp = autumn && top >= 0 && hash(top, 4, 63) < 0.35 ? [119, 120, 121, 122] : LEAF;
    CANOPY[y * 96 + x] = ramp[clamp(Math.floor(v), 0, 3)];
  }
}
const canopyAt = (x, y) => CANOPY[(((y % 64) + 64) % 64) * 96 + (((x % 96) + 96) % 96)];
function outdoorFloor(x, y, A, B, ti, tj) {
  if (ti < 0 || tj < 0 || ti >= MW || tj >= MH) return canopyAt(x, y);
  const fi = A / 32, fj = B / 32;
  if (LV.river && LV.river.length) {
    const rd = riverD(fi, fj) + (rdNoise(A, B));
    if (rd < 0.25) {
      if (rd < 0 && pathD(fi, fj) < 0.45) {   // a bridge: planks across the current, dark gaps, rail shadows
        const pl = Math.floor((A + B) / 6), gap = ((A + B) % 6 + 6) % 6 < 1;
        if (pathD(fi, fj) > 0.25) return DIRT[1];
        return gap ? DIRT[0] : DIRT[2 + (hash(pl, 3, 92) * 2 | 0)];
      }
      if (rd < 0) {   // flowing water: streaks along the current, darker in the middle
        let t = rd < -0.6 ? 1 : 2;
        if (hash(Math.floor((A - B) / 9), Math.floor((A + B) / 2), 93) < 0.08) t = 3;
        if (hash(x, y, 94) < 0.008) t = 4;
        return WATER[t];
      }
      return rd < 0.12 ? DIRT[4] : BAYER[((y & 3) << 2) | (x & 3)] < (0.25 - rd) / 0.13 ? DIRT[3] : grassAt(x, y, A, B);
    }
  }
  if (LV.ponds && LV.ponds.length) {   // water: deeper toward the middle, ripple lines, lily pads; a sandy shore
    const wd = pondD(fi, fj);
    if (wd < 1) {
      if (hash(Math.floor(x / 5), Math.floor(y / 3), 81) < 0.04 && wd < 0.8) return (x + y) % 5 === 0 ? 91 : LEAF[4];
      let t = wd < 0.45 ? 1 : 2;
      if ((y + Math.floor(vnoise(A, B, 12, 82) * 4)) % 6 === 0 && hash(x >> 2, y, 83) < 0.45) t = 3;
      if (hash(x, y, 84) < 0.01) t = 4;
      return WATER[t];
    }
    if (wd < 1.18) return wd < 1.06 ? DIRT[4] : BAYER[((y & 3) << 2) | (x & 3)] < (1.18 - wd) / 0.12 ? DIRT[3] : grassAt(x, y, A, B);
  }
  let pd = pathD(fi, fj);
  if (LV.plaza) pd = Math.min(pd, Math.hypot(fi - LV.plaza.x, fj - LV.plaza.y) - LV.plaza.r);
  for (const f of LV.fields || []) if (fi > f.x0 && fi < f.x1 && fj > f.y0 && fj < f.y1) {   // plowed furrows
    const row = (fj * 2) % 2;
    return DIRT[row < 0.35 ? 1 : row < 0.6 ? 2 : (hash(x, y, 95) < 0.1 ? 4 : 3)];
  }
  if (pd < 0.6) pd += (vnoise(A, B, 9, 71) - 0.5) * 0.35;   // edge wobble only matters near a path
  if (pd < -0.05) return dirtAt(x, y, A, B);
  if (pd < 0.12) return BAYER[((y & 3) << 2) | (x & 3)] < (0.12 - pd) / 0.17 ? dirtAt(x, y, A, B) : GRASS[1];
  if (pd < 0.3) return GRASS[clamp(Math.floor(1.5 + vnoise(A, B, 6, 23) * 1.5), 0, 6)];   // trodden edge
  return grassAt(x, y, A, B);
}
// a flower meadow: clusters of white, yellow and pink dots where the grass is lush
function stampMeadow(seed) {
  const R = rng(seed), cols = [[27, 26], [51, 50], [59, 58], [23, 22]];
  for (let n = 0; n < 160 * MW * MH / 1600; n++) {
    const fi = 3 + R() * (MW - 6), fj = 3 + R() * (MH - 6);
    if (pathD(fi, fj) < 0.5 || LV.solid[tIdx(Math.floor(fi), Math.floor(fj))]) continue;
    const [x, y] = iso(fi, fj), col = cols[R.int(0, 3)];
    for (let k = 0; k < 5; k++) {
      const px = Math.round(x + (R() - 0.5) * 14), py = Math.round(y + (R() - 0.5) * 7);
      if (px < 1 || py < 1 || px >= WW - 1 || py >= WH - 1) continue;
      setFloor(py * WW + px, col[0]); setFloor((py + 1) * WW + px, col[1]);
    }
  }
}
// baked soft shadows: step ground colors down their ramp inside an ellipse (dithered rim)
const RAMP_OF = new Int16Array(NPAL).fill(-1), RAMP_POS = new Uint8Array(NPAL);
for (const r of [GRASS, DIRT, LEAF, STRAW]) r.forEach((c, n) => { RAMP_OF[c] = PAL_RAMPS.indexOf(r); RAMP_POS[c] = n; });
function shadeGround(wx, wy, rx, ry, steps) {
  for (let y = Math.floor(wy - ry); y <= wy + ry; y++) for (let x = Math.floor(wx - rx); x <= wx + rx; x++) {
    if (x < 0 || y < 0 || x >= WW || y >= WH) continue;
    const d = ((x - wx) / rx) ** 2 + ((y - wy) / ry) ** 2;
    if (d > 1 || (d > 0.7 && BAYER[((y & 3) << 2) | (x & 3)] < (d - 0.7) / 0.3)) continue;
    const k = y * WW + x, v = floorBuf[k], ri = RAMP_OF[v];
    if (ri < 0) continue;
    const ramp = PAL_RAMPS[ri];
    setFloor(k, ramp[Math.max(0, RAMP_POS[v] - steps)]);
  }
}

// ---------------------------------------------------------------- props
const OUT = {
  grave: (seed) => propSprite('grave' + (seed % 3), r => {   // a weathered headstone (or a cross) over a low mound
    r.ell([0, 0, 0.5], [6, 3.5, 1.4], M.GRASSM);
    if (seed % 3 === 2) { r.box([-2, 0, 6], [0.9, 0.9, 6], M.RUIN); r.box([-2, 0, 9], [0.9, 3.4, 0.9], M.RUIN); }
    else r.box([-2, 0, 5], [1.2, 3.2, 5], M.RUIN, null, { mf: p => p[2] > 9.2 && Math.abs(p[1]) > 2.2 ? M.GRASSM : (p[0] > -1 && Math.abs(p[1]) < 1.5 && Math.abs(p[2] - 6) < 0.5) ? M.STONE : 0 });
  }, [24, 26, 12, 18], Math.PI / 4),
  cart: () => propSprite('cart', r => {   // an ore cart on its wheels, heaped with rock
    r.box([0, 0, 6], [6, 4, 3.4], M.WOOD, null, { mf: p => Math.abs(p[0]) > 5.2 || Math.abs(p[2] - 8.6) < 0.6 ? M.IRON : 0 });
    r.ell([0, 0, 9.5], [5, 3.4, 2.4], M.ROCK);
    for (const sx of [-3.6, 3.6]) for (const sy of [-4.4, 4.4]) r.cyl([sx, sy - 0.6 * Math.sign(sy), 2.4], [sx, sy, 2.4], 2.4, M.IRON);
  }, [30, 28, 15, 20], 0.5),
  stonewall: () => propSprite('stonewall', r => {   // a stretch of fieldstone wall, its line along the screen
    const ax = [V.norm([1, -1, 0]), V.norm([1, 1, 0]), [0, 0, 1]];
    r.box([0, 0, 7], [11.4, 3.6, 7], M.RUIN, ax, { mf: p => { const u = (p[0] - p[1]) * 0.707; return Math.floor(p[2] / 3.5) % 2 ? (Math.abs(((u + 40) % 7) - 3.5) < 0.4 ? M.STONE : 0) : (Math.abs(((u + 43.5) % 7) - 3.5) < 0.4 ? M.STONE : 0); } });
    r.box([0, 0, 14.6], [11.8, 4, 0.8], M.STONE, ax);
  }, [40, 40, 20, 28]),
  pine: (seed, autumn) => propSprite('pine' + seed, r => {
    const R = rng(seed + 11), H = 52 + R() * 14, tiers = 4 + (R() < 0.5 ? 1 : 0);
    r.cone([0, 0, 0], [0, 0, H * 0.35], 2.8, 2.0, M.BARK);
    // stacked, drooping tiers: each a wide cone whose skirt is darker underneath
    for (let k = 0; k < tiers; k++) {
      const z0 = H * (0.25 + k * 0.155), rad = 13 - k * (10 / tiers) + R() * 1.2, top = z0 + rad * 1.25;
      r.cone([R() - 0.5, R() - 0.5, z0 + 1], [0, 0, top], rad * 0.82, 0.6, M.PINE);
      // drooping branch tips around the tier give the jagged, layered edge of the references
      const nb = 7 + (k < 2 ? 2 : 0), a0 = R() * 6.28;
      for (let b = 0; b < nb; b++) {
        const a = a0 + b / nb * Math.PI * 2, rr = rad * (0.95 + R() * 0.2);
        r.cone([Math.cos(a) * rad * 0.25, Math.sin(a) * rad * 0.25, z0 + rad * 0.55], [Math.cos(a) * rr, Math.sin(a) * rr, z0 - 0.5], rad * 0.32, 0.7, M.PINE);
      }
    }
  }, [64, 104, 32, 92]),
  oak: (seed, autumn) => propSprite((autumn ? 'autumn' : 'oak') + seed, r => {
    const R = rng(seed + 23), H = 18 + R() * 6, leaf = autumn ? M.AUTUMNM : M.LEAFM;
    r.cone([0, 0, 0], [0, 0, H], 4.0, 2.8, M.BARK);
    for (let k = 0; k < 3; k++) { const a = k * 2.1 + R(); r.cone([0, 0, H * 0.7], [Math.cos(a) * 7, Math.sin(a) * 7, H + 4], 1.6, 0.9, M.BARK); }
    for (const s of [-1, 1]) r.cone([0, 0, 2], [s * 4, s * 2, 0], 1.6, 0.6, M.BARK);   // roots
    // leafy clumps: separate parts, so each gets its own outline and reads as a clump
    const clumps = [[0, 0, H + 9, 11], [-6, 5, H + 4, 8], [6, -5, H + 5, 8], [5, 6, H + 2, 7.5], [-5, -6, H + 6, 7.5], [0, 0, H + 16, 7.5], [-2, 7, H + 12, 6], [3, -3, H - 1, 7]];
    for (const [x, y, z, rad] of clumps) { const k = 0.95 + R() * 0.3; r.sph([x * k * 1.1, y * k * 1.1, z], rad * k * 1.12, leaf); }
  }, [80, 100, 40, 84]),
  bush: (seed, autumn) => propSprite('bush' + seed + (autumn ? 'a' : ''), r => {
    const R = rng(seed + 31), leaf = autumn ? M.AUTUMNM : M.LEAFM;
    for (let k = 0; k < 4; k++) { const a = k * 1.9 + R(), d = k ? 3.5 : 0; r.sph([Math.cos(a) * d, Math.sin(a) * d, 3.5 + R() * 1.5], 4 + R() * 1.4, leaf); }
    if (R() < 0.4) for (let k = 0; k < 3; k++) r.sph([(R() - 0.5) * 6, (R() - 0.5) * 6, 7 + R()], 0.9, M.CLOTH_RED, { noShadow: true });   // berries
  }, [30, 26, 15, 18]),
  fern: (seed) => propSprite('fern' + seed, r => {
    const R = rng(seed + 37);
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + R() * 0.4; r.cone([0, 0, 0.5], [Math.cos(a) * 7, Math.sin(a) * 7, 3 + R() * 2], 1.2, 0.3, M.LEAFM); }
  }, [24, 16, 12, 10]),
  shroom: (seed) => propSprite('shroom' + seed, r => {
    const R = rng(seed + 41);
    for (let k = 0; k < 3; k++) {
      const x = (R() - 0.5) * 6, y = (R() - 0.5) * 6, h = 2 + R() * 2.5;
      r.cone([x, y, 0], [x, y, h], 0.7, 0.7, M.CLOTH_WHITE);
      r.ell([x, y, h + 0.6], [2 + R(), 2 + R(), 1.3], M.CLOTH_RED, null, { mf: p => hash(Math.floor(p[0] * 1.5), Math.floor(p[1] * 1.5), 5) < 0.18 ? M.CLOTH_WHITE : 0 });
    }
  }, [20, 16, 10, 11]),
  rock: (seed) => propSprite('rock' + seed, r => {
    const R = rng(seed + 43);
    r.ell([0, 0, 3], [7 + R() * 2, 6 + R() * 2, 5 + R() * 2], M.ROCK, null, { mf: p => hash(Math.floor(p[0]), Math.floor(p[1] + p[2]), 7) < 0.06 ? M.LEAFM : 0 });
    r.ell([4, 4, 2], [4, 3.5, 3], M.ROCK);
  }, [36, 28, 18, 18]),
  stump: () => propSprite('stump', r => {
    r.cyl([0, 0, 0], [0, 0, 6], 5, M.BARK, { mf: p => p[2] > 5.8 ? (Math.floor(Math.hypot(p[0], p[1]) * 1.2) % 2 ? M.PLANK : M.STRAWM) : 0 });
    for (const a of [0.3, 2.4, 4.4]) r.cone([0, 0, 1.5], [Math.cos(a) * 7.5, Math.sin(a) * 7.5, 0], 2, 0.8, M.BARK);
  }, [30, 24, 15, 16]),
  log: (yaw) => propSprite('log' + Math.round(yaw * 4), r => {
    r.cyl([-9, 0, 3.2], [9, 0, 3.2], 3.2, M.BARK, { mf: p => Math.abs(p[0]) > 8.8 ? M.PLANK : 0 });
    r.cone([2, 0, 5.5], [4, 2.5, 8], 0.8, 0.4, M.BARK);
  }, [36, 26, 18, 16], Math.round(yaw * 4) / 4),
  menhir: (seed) => propSprite('menhir' + seed, r => {
    const R = rng(seed + 47), h = 18 + R() * 10;
    r.cone([0, 0, 0], [R() - 0.5, R() - 0.5, h], 4.4, 2.6, M.ROCK, { mf: p => hash(Math.floor(p[0] + p[2]), Math.floor(p[1]), 9) < 0.08 ? M.LEAFM : 0 });
  }, [24, 44, 12, 34]),
  ruinwall: (yaw, seed) => propSprite('ruinwall' + Math.round(yaw * 4) + seed, r => {
    // a crumbling stretch of pale wall: stone courses, a jagged broken top with moss, a fallen block
    const R = rng(seed + 61);
    for (let k = -2; k <= 2; k++) {
      const h = 14 + R() * 18 * (1 - Math.abs(k) * 0.2);
      r.box([0, k * 4.5, h / 2], [3.2, 2.3, h / 2], M.RUIN, null, { mf: p => (Math.floor(p[2] / 4) + k) % 3 === 0 && Math.abs(((p[2] / 4) % 1)) < 0.18 ? M.ROCK : p[2] > h - 1.6 ? M.LEAFM : 0 });
    }
    r.box([5.5, 3, 1.8], [2.4, 2.8, 1.8], M.RUIN, [V.norm([1, 0.4, 0]), V.norm([-0.4, 1, 0]), [0, 0, 1]]);
  }, [40, 64, 20, 50], Math.round(yaw * 4) / 4),
  column: (seed) => propSprite('column' + seed, r => {
    const R = rng(seed + 67), h = 22 + R() * 18;
    r.box([0, 0, 1.4], [5.5, 5.5, 1.4], M.RUIN);
    r.cyl([0, 0, 2.8], [0, 0, h], 3.8, M.RUIN, { mf: p => p[2] > h - 1.2 ? M.LEAFM : Math.abs(Math.sin(Math.atan2(p[1], p[0]) * 6)) < 0.16 ? M.ROCK : 0 });
    if (h < 30) r.cyl([4, 3, 2.8], [10, 7, 2.8], 2.8, M.RUIN);   // the fallen top drum
  }, [40, 64, 20, 52]),
  crop: (seed) => propSprite('crop' + seed, r => {   // a cabbage
    const R = rng(seed + 71);
    for (let k = 0; k < 5; k++) { const a = k * 1.3 + R(); r.ell([Math.cos(a) * 1.6, Math.sin(a) * 1.6, 2.2], [2.4, 2.4, 1.8], k ? M.LEAFM : M.GRASSM); }
    r.sph([0, 0, 3.4], 2, M.GRASSM);
  }, [18, 16, 9, 11]),
  fence: (along) => propSprite('fence' + along, r => {   // a split-rail fence section
    for (const y of [-11, 0, 11]) r.cyl([0, y, 0], [0, y, 11], 1, M.WOOD);
    for (const z of [5, 9.5]) r.cyl([0, -11.5, z], [0, 11.5, z], 0.8, M.PLANK);
  }, [40, 34, 20, 26], along ? Math.PI / 2 : 0),
  pedestal: () => propSprite('pedestal', r => {
    r.box([0, 0, 1.4], [6, 6, 1.4], M.RUIN);
    r.cyl([0, 0, 2.8], [0, 0, 11], 3.4, M.RUIN, { mf: p => Math.abs(p[2] - 7) < 0.6 ? M.GOLD : 0 });
    r.cyl([0, 0, 11], [0, 0, 12.4], 4.6, M.RUIN);
  }, [36, 36, 18, 26]),
  palisade: (yaw) => propSprite('palisade' + Math.round(yaw * 8), r => {
    // sharpened logs side by side, bound by a rope
    for (let k = -2; k <= 2; k++) {
      const y = k * 4.5, h = 21 + ((k + 7) * 37 % 5);
      r.cyl([0, y, 0], [0, y, h], 2.4, M.BARK);
      r.cone([0, y, h], [0, y, h + 4.5], 2.4, 0.3, M.PLANK);
    }
    r.box([0.4, 0, 14], [2.2, 11.4, 0.6], M.LEATHER);
  }, [40, 56, 20, 44], Math.round(yaw * 8) / 8),
  lantern: () => propSprite('lantern', r => {
    r.cyl([0, 0, 0], [0, 0, 28], 1.2, M.WOOD);
    r.cone([0, 0, 26], [5, 0, 27], 0.8, 0.8, M.WOOD);
    r.box([5, 0, 22], [1.8, 1.8, 2.4], M.IRON, null, { mf: p => Math.abs(p[2] - 22) < 1.6 && (Math.abs(p[0] - 5) < 1.2 || Math.abs(p[1]) < 1.2) ? M.LAMP : 0 });
    r.cone([5, 0, 24.4], [5, 0, 26.5], 2.4, 0.4, M.IRON);
  }, [24, 44, 12, 36], Math.PI / 4),
  signpost: () => propSprite('signpost', r => {
    r.cyl([0, 0, 0], [0, 0, 22], 1.3, M.WOOD);
    r.box([2, 0, 18], [6, 0.7, 2], M.PLANK, null, { mf: p => p[0] > 7 ? M.PLANK : Math.abs(p[2] - 18) < 0.4 ? M.WOOD : 0 });
    r.box([-1, 0, 13], [5, 0.7, 1.8], M.PLANK);
  }, [32, 38, 16, 30], Math.PI / 4),
  campfire: () => propSprite('campfire', r => {
    for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2; r.ell([Math.cos(a) * 7, Math.sin(a) * 7, 1.4], [2.2, 2, 1.8], M.ROCK); }
    for (let k = 0; k < 3; k++) { const a = k * 2.1; r.cone([Math.cos(a) * 5, Math.sin(a) * 5, 0.8], [0, 0, 6], 1.3, 0.9, M.BARK); }
    r.ell([0, 0, 1], [3.5, 3.5, 1], M.BARK, null, { mf: () => M.FIREM });
  }, [36, 30, 18, 18]),
  pumpkin: (seed) => propSprite('pumpkin' + seed, r => {
    const s = 0.75 + seed * 0.12;
    r.ell([0, 0, 3.6 * s], [5 * s, 5 * s, 3.8 * s], M.PUMPKIN, null, { mf: p => Math.abs(Math.sin(Math.atan2(p[1], p[0]) * 4)) < 0.22 ? M.CLOTH_TAN : 0 });
    r.cone([0, 0, 7 * s], [0.8, 0.5, 9 * s], 0.8, 0.5, M.LEAFM);
    r.ell([2.5, 2, 0.6], [3, 2, 0.6], M.LEAFM);
  }, [22, 22, 11, 15]),
  hay: () => propSprite('hay', r => {
    r.cyl([0, -7, 6], [0, 7, 6], 6.5, M.STRAWM, { mf: p => Math.abs(p[1]) > 6.8 ? (Math.floor(Math.hypot(p[0], p[2] - 6) * 1.3) % 2 ? M.STRAWM : M.WOOD) : (Math.abs(p[1] - 3) < 0.6 || Math.abs(p[1] + 3) < 0.6) ? M.LEATHER : 0 });
  }, [36, 34, 18, 22], 0.4),
  well: () => propSprite('well', r => {
    r.cyl([0, 0, 0], [0, 0, 8], 9, M.STONE, { mf: p => p[2] > 7.6 && Math.hypot(p[0], p[1]) < 7 ? M.WATERM : (Math.floor(p[2] / 2.6) + Math.floor(Math.atan2(p[1], p[0]) * 3)) % 2 ? 0 : M.ROCK });
    for (const s of [-1, 1]) r.cyl([0, s * 8, 6], [0, s * 8, 26], 1.2, M.WOOD);
    r.cyl([0, -9, 22], [0, 9, 22], 1, M.WOOD);
    r.box([-4, 0, 28], [5, 11, 0.8], M.PLANK, [V.norm([1, 0, 0.9]), [0, 1, 0], V.norm([-0.9, 0, 1])]);
    r.box([4, 0, 28], [5, 11, 0.8], M.PLANK, [V.norm([1, 0, -0.9]), [0, 1, 0], V.norm([0.9, 0, 1])]);
    r.cyl([0, 0, 22], [0, 0, 15], 0.3, M.LEATHER); r.cyl([0, 0, 14], [0, 0, 11], 2, M.WOOD);
  }, [56, 64, 28, 46]),
};
// log walls: horizontal logs stacked along one side, ends crossing at the corners
function logWall(r, a, b, z0, z1, rad) {
  for (let z = z0 + rad; z < z1; z += rad * 1.9) {
    const d = V.norm(V.sub(b, a));
    r.cyl(V.add(V.sub(a, V.mul(d, rad * 1.2)), [0, 0, z]), V.add(V.add(b, V.mul(d, rad * 1.2)), [0, 0, z]), rad, M.BARK, { mf: p => { const q = (V.dot(V.sub(p, a), d)); return q < -rad * 0.6 || q > V.len(V.sub(b, a)) + rad * 0.6 ? M.PLANK : 0; } });
  }
}
// a gable roof of planks: two tilted slabs over a ridge along y
function gableRoof(r, hx, hy, z0, rise, mat, stripe) {
  const run = hx + 3, ang = Math.atan2(rise, run), L = Math.hypot(run, rise) / 2;
  for (const s of [-1, 1]) {
    const ax = [V.norm([s * Math.cos(ang), 0, -Math.sin(ang)]), [0, 1, 0], V.norm([s * Math.sin(ang), 0, Math.cos(ang)])];
    const c = [s * run / 2, 0, z0 + rise / 2];
    r.box(c, [L + 0.6, hy + 3, 1.0], mat, ax, { mf: stripe });
  }
}
let TENT_YAW = 5.9;
// a mine mouth cut into a rock face: a heavy timber frame, a lamp, rails running out (barred: two planks
// nailed across the mouth and a chain with a padlock, until the bandit chief's key opens it)
function mineRig(r, barred) {
    for (const [x, y, z, a, b, c] of [[-12, -2, 13, 16, 26, 20], [-6, 18, 8, 12, 10, 11], [-6, -22, 8, 12, 10, 10], [-18, 8, 22, 10, 12, 12]]) r.ell([x, y, z], [a, b, c], M.ROCK, null, { mf: p => hash(Math.floor(p[0] / 2), Math.floor(p[1] / 2 + p[2] / 3), 3) < 0.06 ? M.LEAFM : 0 });
    r.box([4, 0, 10], [3, 7, 10], M.VOID);   // the dark mouth
    for (const sy of [-1, 1]) { r.box([7, sy * 8.4, 10], [1.8, 1.8, 10], M.WOOD, null, { mf: p => Math.abs(p[2] - 5) < 0.4 || Math.abs(p[2] - 14) < 0.4 ? M.BARK : 0 }); }
    r.box([7.4, 0, 21], [2.2, 11, 1.8], M.WOOD, null, { mf: p => Math.abs(p[1]) > 9.6 ? M.BARK : 0 });
    r.box([9.4, -5, 21], [0.4, 3.6, 1.2], M.PLANK);   // a plank nailed over the lintel
    r.box([9.2, 7.2, 15], [1, 1.2, 1.6], M.LAMP, null, { noShadow: true }); r.box([9.2, 7.2, 17], [0.7, 0.7, 0.4], M.IRON);
    for (const sy of [-3, 3]) r.box([16, sy, 0.5], [10, 0.5, 0.5], M.IRON);
    for (let k = 0; k < 5; k++) r.box([8 + k * 4, 0, 0.3], [0.8, 4.4, 0.4], M.WOOD);
  if (barred) {
    for (const s2 of [-1, 1]) { const a = s2 * 0.62, u = [0, Math.cos(a), Math.sin(a)], v = [0, -Math.sin(a), Math.cos(a)]; r.box([8.2, 0, 10], [9.4, 2.0, 0.7], M.WOOD, [u, v, [1, 0, 0]], { mf: p => Math.abs(V.dot(V.sub(p, [8.2, 0, 10]), u)) > 8.4 ? M.IRON : 0 }); }
    for (let k = 0; k <= 12; k++) { const t = k / 12, y = (t - 0.5) * 15, z = 11 - Math.sin(t * Math.PI) * 3.5; r.sph([9.4, y, z], 1.25, M.STEEL); }
    r.box([9.8, 0, 6.6], [1.0, 2.0, 2.2], M.GOLD, null, { mf: p => p[2] < 6 && Math.abs(p[1]) < 0.4 ? M.DARK : 0 });
  }
}
const BUILD = {

  // round 26, the hub. The cathedral: pale stone nave under a slate roof, buttresses and tall
  // blue windows along the side the camera sees, a bell tower over the doors with a rose window,
  // belfry openings and a spire with a gold cross; broad steps down to the camp
  cathedral: () => propSprite('cathedral', r => {
    const ox = -8, nx0 = -54 + ox, nx1 = 34 + ox, hy = 28, wallH = 34, tx = 44 + ox, tw = 14, tH = 92;
    r.box([(nx0 + nx1) / 2, 0, 2], [(nx1 - nx0) / 2 + 4, hy + 4, 2], M.ROCK);   // plinth
    const coursed = p => (Math.floor(p[2] / 5) % 2 ? Math.floor((p[0] + p[1]) / 9) : Math.floor((p[0] + p[1]) / 9 + 0.5)) % 4 === 0 && Math.abs((p[2] / 5) % 1) > 0.15 ? M.STONE : 0;
    const winMf = (along, c0, n, gap, zLo, zHi, face) => p => {   // tall arched windows of blue glass with lead lines
      const u = p[along] - c0, k = Math.round(u / gap); if (k < 0 || k >= n) return coursed(p);
      const du = u - k * gap, z = p[2];
      const arch = z > zHi - 3 ? Math.hypot(du, z - (zHi - 3)) < 3.2 : Math.abs(du) < 3.2;
      if (z > zLo && z < zHi + 0.5 && arch) return (Math.abs(du) < 0.5 || Math.abs(z - (zLo + zHi) / 2) < 0.5) ? M.IRON : (z > (zLo + zHi) / 2 ? M.CLOTH_BLUE : M.ARCANE);
      if (z > zLo - 1.5 && z < zHi + 2 && arch) return M.RUIN;
      return coursed(p);
    };
    r.box([(nx0 + nx1) / 2, 0, 4 + wallH / 2], [(nx1 - nx0) / 2, hy, wallH / 2], M.RUIN, null, { mf: winMf(0, nx0 + 10, 5, 17, 12, 30) });
    // buttresses between the windows on the +y side
    for (let k = 0; k < 6; k++) { const x = nx0 + 1.5 + k * 17; r.box([x, hy + 2.5, 4 + 13], [2.6, 3, 13], M.RUIN, null, { mf: coursed }); r.box([x, hy + 1.5, 4 + 29], [2.2, 2, 3.5], M.RUIN, [[1, 0, 0], V.norm([0, 1, -0.8]), V.norm([0, 0.8, 1])]); }
    // the slate roof: two slabs meeting on a ridge along the nave
    { const rise = 24, run = hy + 3, ang = Math.atan2(rise, run), L = Math.hypot(run, rise) / 2;
      for (const sg of [-1, 1]) r.box([(nx0 + nx1) / 2 - 2, sg * run / 2, 4 + wallH + rise / 2], [(nx1 - nx0) / 2 + 2, L + 0.6, 1.2], M.IRON, [[1, 0, 0], V.norm([0, sg * Math.cos(ang), -Math.sin(ang)]), V.norm([0, sg * Math.sin(ang), Math.cos(ang)])], { mf: p => Math.abs((p[0] * 0.5) % 3) < 0.35 ? M.CLOTH_DARK : 0 }); }
    // the bell tower over the doors
    r.box([tx, 0, 4 + tH / 2], [tw, tw, tH / 2], M.RUIN, null, { mf: p => {
      const z = p[2], u = p[1], fx = p[0] > tx + tw - 0.8, fy = p[1] > tw - 0.8, a = fx ? p[1] : p[0] - tx;
      if (fx && z < 26 && (Math.abs(u) < 6 && (z < 20 || Math.hypot(u, z - 20) < 6))) return Math.abs(u) < 0.5 ? M.BARK : (z < 22 ? M.WOOD : M.DARK);   // the doors under an arch
      if (fx && Math.hypot(u, z - 44) < 7) { const d = Math.hypot(u, z - 44), ang2 = Math.atan2(z - 44, u); return d > 6 ? M.RUIN : (Math.abs(Math.sin(ang2 * 4)) < 0.25 || d < 1.4 ? M.GOLD : d < 3.6 ? M.ARCANE : M.CLOTH_BLUE); }   // the rose window
      if ((fx || fy) && z > tH - 22 && z < tH - 6 && Math.abs(a) > 2 && Math.abs(a) < 9) return z > tH - 9 && Math.abs(Math.abs(a) - 5.5) > 2 ? M.RUIN : M.VOID;   // belfry openings
      if (Math.abs(z - (tH - 26)) < 1) return M.STONE;
      return coursed(p);
    } });
    for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1]]) r.box([tx + sx * (tw + 1), sy * (tw + 1), 4 + tH - 3], [1.6, 1.6, 3], M.RUIN);   // corner pinnacles
    r.cone([tx, 0, 4 + tH], [tx, 0, 4 + tH + 44], tw + 1, 0.8, M.IRON, { mf: p => Math.abs(((p[2] - tH) * 0.6) % 3) < 0.4 ? M.CLOTH_DARK : 0 });   // the spire
    const top = [tx, 0, 4 + tH + 45];
    r.cyl(top, V.add(top, [0, 0, 9]), 0.9, M.GOLD); r.cyl(V.add(top, [0, -3.2, 6]), V.add(top, [0, 3.2, 6]), 0.9, M.GOLD);
    // steps down from the doors
    for (let n = 0; n < 3; n++) r.box([tx + tw + 3 + n * 3, 0, 1 + (2 - n) * 1.4], [1.6 + (2 - n) * 1.5 + 1.5, 10 - n * 0.5, 1 + (2 - n) * 1.4], M.STONE);
  }, [176, 228, 88, 186]),
  gateo: () => propSprite('gateo', r => {   // the same towers with the two gate leaves swung wide open
    for (const sy of [-1, 1]) { r.box([0, sy * 14, 15], [6, 5, 15], M.RUIN, null, { mf: p => Math.floor(p[2] / 5) % 2 && Math.abs(p[0] % 6) < 0.5 ? M.STONE : 0 }); r.cone([0, sy * 14, 30], [0, sy * 14, 40], 7, 0.6, M.IRON); }
    for (const sy of [-1, 1]) r.box([5, sy * 8, 10], [4.5, 0.9, 10], M.WOOD, null, { mf: p => Math.abs(p[2] - 6) < 0.6 || Math.abs(p[2] - 15) < 0.6 ? M.IRON : 0 });
  }, [64, 72, 32, 56]),
  mine: () => propSprite('mine', r => mineRig(r, false), [100, 96, 50, 72]),
  minebarred: () => propSprite('minebarred', r => mineRig(r, true), [100, 96, 50, 72]),   // round 42b: planks and a chain across the mouth
  den: () => propSprite('den', r => {   // the wolves' den: a mossy mound of rock with a low dark opening, bones outside
    r.ell([-4, -2, 6], [16, 14, 11], M.ROCK, null, { mf: p => p[2] > 9 && hash(Math.floor(p[0] / 2), Math.floor(p[1] / 2), 5) < 0.3 ? M.LEAFM : 0 });
    r.ell([9, 3, 4], [4, 6, 5], M.VOID);
    for (const [x, y, a] of [[14, -2, 0.4], [16, 6, 2.1]]) r.cone([x, y, 0.6], [x + Math.cos(a) * 4, y + Math.sin(a) * 4, 0.6], 0.7, 0.7, M.BONE);
  }, [72, 56, 36, 38]),
  gate: () => propSprite('gate', r => {   // two stone gate towers and a shut, barred wooden gate between them
    for (const sy of [-1, 1]) { r.box([0, sy * 14, 15], [6, 5, 15], M.RUIN, null, { mf: p => Math.floor(p[2] / 5) % 2 && Math.abs(p[0] % 6) < 0.5 ? M.STONE : 0 }); r.cone([0, sy * 14, 30], [0, sy * 14, 40], 7, 0.6, M.IRON); }
    r.box([0, 0, 10], [2, 9, 10], M.WOOD, null, { mf: p => Math.abs(p[1]) < 0.5 || Math.abs(p[2] - 6) < 0.6 || Math.abs(p[2] - 15) < 0.6 ? M.IRON : Math.abs(((p[1] + 20) % 3) - 1.5) < 0.25 ? M.BARK : 0 });
    r.box([2.6, 0, 10.5], [0.8, 10, 1], M.IRON);   // the bar
  }, [64, 72, 32, 56]),
  windmill: () => propSprite('windmill', r => {
    // a round stone mill with a thatched cap and four lattice sails
    r.cyl([0, 0, 0], [0, 0, 34], 13, M.STONE, { mf: p => Math.floor(p[2] / 4 + Math.atan2(p[1], p[0]) * 2) % 2 ? M.ROCK : 0 });
    r.cone([0, 0, 33], [0, 0, 50], 16, 1.5, M.STRAWM, { mf: p => Math.abs(p[2] - 40) < 0.7 ? M.WOOD : 0 });
    r.box([13.2, 0, 7], [0.6, 3.2, 6.5], M.WOOD, null, { mf: p => p[2] > 12.5 ? M.BARK : 0 });
    const hub = [15, 0, 38];
    r.sph(hub, 2, M.WOOD);
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2 + 0.3, d = [0, Math.cos(a), Math.sin(a)], n = [0, -Math.sin(a), Math.cos(a)];
      r.cyl(hub, V.mad(hub, d, 22), 0.6, M.WOOD);   // the spar
      const c = V.mad(V.mad(hub, d, 12), n, 3.2);
      r.box(c, [0.4, 10, 3.6], M.CLOTH_WHITE, [[1, 0, 0], d, n], { mf: p => { const q = V.sub(p, c), u = V.dot(q, d), v = V.dot(q, n); return (Math.abs(((u + 20) % 3.3) - 1.65) < 0.35 || Math.abs(v) > 1.9) ? M.WOOD : 0; } });
    }
  }, [96, 136, 48, 100]),
  cabin: () => propSprite('cabin', r => {
    const hx = 26, hy = 26, wallH = 20;
    r.box([0, 0, 1], [hx + 2, hy + 2, 1.2], M.ROCK);   // stone footing
    const c = [[-hx, -hy], [hx, -hy], [hx, hy], [-hx, hy]];
    for (let k = 0; k < 4; k++) logWall(r, [...c[k], 2], [...c[(k + 1) % 4], 2], 2, wallH, 2.4);
    // gable ends: shorter logs stepping up under the roof
    for (const s of [-1, 1]) for (let n = 0; n < 4; n++) { const z = wallH + 2 + n * 4.4, w = hx * (1 - (n + 0.6) / 4.6); r.cyl([-w, s * hy, z], [w, s * hy, z], 2.2, M.BARK); }
    gableRoof(r, hx, hy, wallH + 2, 20, M.PLANK, p => (Math.floor(p[1] / 5.5 + 50) % 2 && Math.abs((p[0] * 7.3) % 3) < 0.4) ? M.BARK : 0);
    // door and windows on the two faces the camera sees (+x and +y)
    r.box([hx + 1.6, -6, 9], [0.8, 4.6, 8], M.WOOD, null, { mf: p => Math.abs(p[1] + 6) > 3.8 || p[2] > 16.2 ? M.BARK : Math.abs(p[1] + 3.5) < 0.6 && Math.abs(p[2] - 9) < 0.6 ? M.GOLD : 0 });
    r.box([hx + 1.6, 12, 12], [0.8, 4, 3.6], M.BARK, null, { mf: p => Math.abs(p[1] - 12) < 3 && Math.abs(p[2] - 12) < 2.8 && Math.abs(p[1] - 12) > 0.5 && Math.abs(p[2] - 12) > 0.5 ? M.LAMP : 0 });
    r.box([4, hy + 1.6, 12], [4, 0.8, 3.6], M.BARK, null, { mf: p => Math.abs(p[0] - 4) < 3 && Math.abs(p[2] - 12) < 2.8 && Math.abs(p[0] - 4) > 0.5 && Math.abs(p[2] - 12) > 0.5 ? M.LAMP : 0 });
    r.cyl([-12, -14, 20], [-12, -14, 46], 3.6, M.STONE, { mf: p => (Math.floor(p[2] / 3) + Math.floor(Math.atan2(p[1] + 14, p[0] + 12) * 2)) % 2 ? M.ROCK : 0 });   // chimney
  }, [116, 124, 58, 82]),
  hut: () => propSprite('hut', r => {
    // round wattle hut under a shaggy thatch cone (Top Heroes)
    r.cyl([0, 0, 0], [0, 0, 14], 15, M.PLANK, { mf: p => Math.floor(Math.atan2(p[1], p[0]) * 9) % 2 ? M.BARK : 0 });
    r.cone([0, 0, 11], [0, 0, 40], 22, 1.5, M.STRAWM, { mf: p => { const z = p[2]; if (Math.abs(z - 22) < 0.8 || Math.abs(z - 31) < 0.8) return M.WOOD; return hash(Math.floor(Math.atan2(p[1], p[0]) * 14), Math.floor(z / 3), 3) < 0.25 ? M.CLOTH_TAN : 0; } });
    r.cone([0, 0, 38], [0, 0, 44], 3, 1, M.WOOD);
    r.box([15.4, 0, 6], [0.8, 3.8, 6], M.BARK, null, { mf: p => p[2] > 10.5 ? M.WOOD : 0 });
  }, [80, 92, 40, 66]),
  forge: () => propSprite('forge', r => {
    const hx = 24, hy = 22;
    r.box([0, 0, 9], [hx, hy, 9], M.STONE, null, { mf: p => (Math.floor(p[2] / 3.2) % 2 ? Math.floor((p[0] + p[1]) / 6) : Math.floor((p[0] + p[1]) / 6 + 0.5)) % 3 === 0 ? M.ROCK : 0 });
    gableRoof(r, hx, hy, 18, 16, M.PLANK, p => Math.abs((p[1] * 0.9) % 4) < 0.5 ? M.BARK : 0);
    r.box([hx + 0.6, 4, 7], [0.6, 7, 6], M.DARK, null, { mf: p => p[2] < 5 && Math.abs(p[1] - 4) < 4 ? M.FIREM : 0 });   // the forge mouth
    r.cyl([-10, -10, 18], [-10, -10, 48], 4.8, M.STONE, { mf: p => (Math.floor(p[2] / 3) + Math.floor(Math.atan2(p[1] + 10, p[0] + 10) * 2)) % 2 ? M.ROCK : 0 });
    // anvil on a stump in front
    r.cyl([hx + 10, -8, 0], [hx + 10, -8, 6], 3.4, M.BARK);
    r.box([hx + 10, -8, 7.5], [4.5, 1.8, 1.5], M.IRON); r.cone([hx + 14.5, -8, 8], [hx + 18, -8, 8.5], 1.4, 0.3, M.IRON);
  }, [116, 120, 58, 80]),
  stall: (along) => propSprite('stall' + along, r => {
    // a market stall: counter of planks, four posts, a red and white striped awning
    const hx = along ? 10 : 20, hy = along ? 20 : 10;
    r.box([0, 0, 6], [hx, hy, 6], M.PLANK, null, { mf: p => Math.abs((p[0] + p[1]) % 6) < 0.6 ? M.BARK : 0 });
    for (const [x, y] of [[-hx, -hy], [hx, -hy], [hx, hy], [-hx, hy]]) r.cyl([x, y, 0], [x, y, 24], 1.1, M.WOOD);
    const ax = [V.norm([1, 0, -0.35]), [0, 1, 0], V.norm([0.35, 0, 1])];
    r.box([2, 0, 24], [hx + 4, hy + 2, 0.8], M.CLOTH_RED, ax, { mf: p => Math.floor((along ? p[0] : p[1]) / 4 + 20) % 2 ? M.CLOTH_WHITE : 0 });
    for (let k = 0; k < 5; k++) r.sph([(k % 2 ? 4 : -4) * (along ? 0.6 : 1), (k - 2) * (along ? 7 : 3.5), 13.6], 2.2, [M.PUMPKIN, M.CLOTH_RED, M.LEAFM, M.GOLD, M.PUMPKIN][k]);
  }, [80, 70, 40, 46], Math.PI / 2),
  // (TENT_YAW turns the ridge so the open front gable faces the camera at three quarters)
  // round 38: an A-frame canvas tent (was a cone the user read as an acorn): two sloped panels on a
  // ridge pole, closed gable ends with a dark open flap at the front, seams down the panels, guy
  // ropes out to pegs from both ends of the ridge
  // round 41, the camp's own places. The potion seller's covered wagon: a plank bed on four
  // spoked wheels, a canvas hood on hoops, the back open on a shelf of glowing bottles, a shaft out front
  wagon: () => propSprite('wagon', r => {
    const HX = 21, HY = 12;
    r.box([0, 0, 13], [HX, HY, 3.4], M.PLANK, null, { mf: p => Math.abs(((p[0] + 40) % 7) - 3.5) < 0.45 ? M.BARK : 0 });   // the bed
    for (const sy of [-1, 1]) r.box([0, sy * HY, 17.5], [HX, 0.9, 2.6], M.WOOD);   // its side boards
    for (const sx of [-14, 14]) for (const sy of [-1, 1]) {   // spoked wheels with an iron rim and a hub
      r.cyl([sx, sy * (HY + 1.4), 9.5], [sx, sy * (HY + 3.2), 9.5], 9.5, M.WOOD, { mf: p => { const q = Math.hypot(p[0] - sx, p[2] - 9.5); return q > 8 ? M.IRON : q > 2.4 && Math.abs(Math.sin(Math.atan2(p[2] - 9.5, p[0] - sx) * 3)) > 0.5 ? M.BARK : M.PLANK; } });
      r.cyl([sx, sy * (HY + 2.8), 9.5], [sx, sy * (HY + 4.2), 9.5], 2.2, M.IRON);
    }
    // the hood: boards round each hoop with seams, open at the back (-x)
    for (let k = 0; k < 6; k++) {
      const a0 = Math.PI * k / 6, a1 = Math.PI * (k + 1) / 6, am = (a0 + a1) / 2, R2 = HY + 1.5;
      const c = [1.5, Math.cos(am) * R2, 20 + Math.sin(am) * R2 * 1.15];
      const tg = V.norm([0, -Math.sin(am), Math.cos(am) * 1.15]), nm = V.norm([0, Math.cos(am), Math.sin(am)]);
      r.box(c, [HX - 1.5, (a1 - a0) * R2 / 2 + 0.8, 0.9], M.CLOTH_WHITE, [[1, 0, 0], tg, nm], { mf: p => Math.abs(((p[0] + 40) % 10) - 5) < 0.55 ? M.CLOTH_TAN : 0 });
    }
    r.box([HX - 1, 0, 25], [0.9, HY, 9], M.CLOTH_WHITE);   // the front closed
    // a shelf of glowing bottles along the side the camera sees, and a lantern hung at the back
    r.box([-2, HY + 1.4, 22.5], [11, 1.6, 0.6], M.PLANK);
    [M.EYE_RED, M.MAGIC, M.LEAFM, M.EYE_RED, M.GOLD, M.MAGIC, M.EYE_RED].forEach((m, k) => { const x = -11 + k * 3.4; r.cyl([x, HY + 1.6, 23], [x, HY + 1.6, 25.4], 1.25, m, { noShadow: true }); r.cyl([x, HY + 1.6, 25.4], [x, HY + 1.6, 26.6], 0.5, M.WOOD, { noShadow: true }); });
    r.box([-HX - 1, HY - 2, 22], [1.4, 1.4, 1.8], M.IRON, null, { mf: p => Math.abs(p[2] - 22) < 1.2 ? M.LAMP : 0 });
    r.cone([HX, 0, 9], [HX + 18, 0, 5], 1.3, 1.0, M.WOOD);   // the shaft
  }, [132, 120, 66, 84], -0.55),
  // Brother Osric's altar: a stone block with a white runner and a gold stripe down it, candles
  // burning on it and at its feet, a gold cross on a stand
  altar: () => propSprite('altar', r => {
    r.box([0, 0, 1], [12, 8, 1], M.STONE);   // the step
    r.box([0, 0, 8], [10, 6, 6], M.STONE, null, { mf: p => (Math.floor(p[2] / 4) % 2 ? Math.floor((p[0] + p[1] + 30) / 5) : Math.floor((p[0] + p[1] + 30) / 5 + 0.5)) % 3 === 0 ? M.ROCK : 0 });
    r.box([0, 0, 14.4], [10.6, 6.6, 0.5], M.ROCK);   // the top slab
    r.box([0, 0, 14.9], [10.8, 1.6, 0.4], M.CLOTH_WHITE, null, { mf: p => Math.abs(p[1]) > 1.1 ? M.GOLD : 0 }); r.box([0, 6.8, 12.6], [2.2, 0.4, 2.6], M.CLOTH_WHITE, null, { mf: p => Math.abs(p[0]) < 0.8 ? M.GOLD : 0 });   // the runner over the top and down the front
    for (const [x, y, h] of [[-7, -4, 6], [-4, 3.5, 4.4], [6, -3.8, 3.6], [8, 3.6, 5]]) { r.cyl([x, y, 15], [x, y, 15 + h], 1, M.WAX); r.sph([x, y, 16.2 + h], 0.9, M.FIREM, { noShadow: true }); }
    r.cyl([0, -1, 15], [0, -1, 27], 0.8, M.GOLD); r.box([0, -1, 24], [0.8, 3.4, 0.8], M.GOLD);   // the cross
    for (const [x, y, h] of [[13, -9, 3.6], [-12, 10, 5], [14, 8, 4.4]]) { r.cyl([x, y, 0], [x, y, h], 1.1, M.WAX); r.sph([x, y, h + 1.1], 1, M.FIREM, { noShadow: true }); }
  }, [64, 64, 32, 46], 0.4),
  // the woodcutter's place, empty until he comes back: a chopping stump with the axe in it, split
  // logs stacked against two posts
  woodpile: () => propSprite('woodpile', r => {
    r.cyl([13, 8, 0], [13, 8, 8], 6, M.BARK, { mf: p => p[2] > 7.8 ? (Math.floor(Math.hypot(p[0] - 13, p[1] - 8) * 1.2) % 2 ? M.PLANK : M.STRAWM) : 0 });
    r.cone([13, 8, 8.5], [7, 12, 22], 0.9, 0.8, M.WOOD);   // the axe: a long haft, the head bitten into the stump
    r.box([13.2, 8.4, 9.4], [3, 0.7, 2], M.IRON, [V.norm([0.6, -0.4, 0.7]), V.norm([0.5, 0.8, 0]), V.norm([-0.6, 0.4, 0.7])], { mf: p => p[2] < 8.6 ? M.BLADE : 0 });
    for (const y of [-14, 6]) r.cyl([-5, y, 0], [-5, y, 20], 1.1, M.WOOD);
    for (let row = 0; row < 4; row++) for (let k = 0; k < 5 - (row === 3 ? 2 : 0); k++) {
      const y = -12 + k * 3.8 + (row % 2) * 1.9, z = 2.2 + row * 3.8;
      r.cyl([-10, y, z], [0, y, z], 1.9, M.BARK, { mf: p => p[0] > -0.5 ? (Math.hypot(p[1] - y, p[2] - z) < 1.1 ? M.STRAWM : M.PLANK) : 0 });   // light cut ends toward the camera
    }
  }, [80, 64, 40, 44], 0.5 + Math.PI),
  // the farmer's place, waiting for him: a two-wheeled hay cart tipped on its shafts, a pitchfork
  haycart: () => propSprite('haycart', r => {
    const ax = [V.norm([1, 0, -0.18]), [0, 1, 0], V.norm([0.18, 0, 1])];
    r.box([0, 0, 9], [11, 7, 2], M.PLANK, ax, { mf: p => Math.abs(((p[1] + 30) % 5) - 2.5) < 0.4 ? M.BARK : 0 });
    for (const sy of [-1, 1]) { r.cyl([1, sy * 8, 7.5], [1, sy * 9.4, 7.5], 7.5, M.WOOD, { mf: p => Math.hypot(p[0] - 1, p[2] - 7.5) > 6.4 ? M.IRON : 0 }); r.cone([10, sy * 6, 7], [21, sy * 5, 1], 0.9, 0.7, M.WOOD); }
    r.ell([-0.5, 0, 14.5], [10, 6.4, 5.2], M.STRAWM, null, { mf: p => hash(Math.floor(p[0] * 1.5), Math.floor(p[1] + p[2] * 2), 3) < 0.2 ? M.WOOD : 0 });
    r.cone([-14, 8, 0], [-9, 4, 22], 0.6, 0.5, M.WOOD); for (const d of [-0.9, 0, 0.9]) r.cone([-9 + d * 0.3, 4 + d, 22], [-8.4 + d * 0.3, 3.6 + d, 26], 0.35, 0.2, M.IRON);
  }, [64, 60, 32, 42], -0.6),
  tent: () => propSprite('tent', r => {
    const HW = 16, HT = 25, HL = 13, L = Math.hypot(HW, HT);   // half width at the base, height, half length
    for (const s of [-1, 1]) {   // the two sloped panels
      const a0 = V.norm([-s * HW, 0, HT]), a1 = [0, 1, 0], a2 = V.cross(a0, a1);
      r.box([s * HW / 2, 0, HT / 2], [L / 2, HL, 0.8], M.CLOTH_TAN, [a0, a1, a2], { mf: p => (Math.abs(((p[1] + HL) % 9) - 4.5) < 0.4) ? M.LEATHER : 0 });   // seams down the canvas
    }
    for (const yEnd of [-HL, HL]) {   // the gable ends: stacked strips narrowing to the ridge, the front one with its flap open
      for (let k = 0; k < 7; k++) {
        const z0 = k * HT / 7, z1 = (k + 1) * HT / 7, w = HW * (1 - (z0 + z1) / 2 / HT);
        r.box([0, yEnd, (z0 + z1) / 2], [w, 0.7, (z1 - z0) / 2 + 0.2], M.CLOTH_TAN, null, { mf: p => yEnd > 0 && Math.abs(p[0]) < 8 * (1 - p[2] / 19) && p[2] < 18 ? M.DARK : 0 });
      }
    }
    r.cyl([0, -HL - 3, HT + 0.6], [0, HL + 3, HT + 0.6], 0.9, M.WOOD);   // the ridge pole, sticking out at the ends
    // one door flap folded back against the canvas, lighter where the inside shows
    { const a0 = V.norm([-8, 0, 18]), a1 = V.norm([1, 0.9, 0]), a2 = V.cross(a0, a1); r.box([-6.5, HL + 1.6, 7.5], [9, 3.6, 0.5], M.CLOTH_WHITE, [a0, a1, a2], { noShadow: true }); }
    for (const yEnd of [-HL - 1.5, HL + 1.5]) {
      if (yEnd < 0) r.cyl([0, yEnd, 0], [0, yEnd, HT + 1.5], 0.8, M.WOOD);   // an upright at the back (the front stays clear of the door)
      const sy = Math.sign(yEnd), peg = [0, yEnd + sy * 9, 0];
      r.cone([0, yEnd, HT], peg, 0.35, 0.3, M.WOOD, { noShadow: true });   // a guy rope to a peg
      r.cyl(peg, V.add(peg, [0, 0, 2]), 0.6, M.WOOD);
    }
    for (const [x, y] of [[-HW - 1, -HL + 3], [-HW - 1, HL - 3], [HW + 1, -HL + 3], [HW + 1, HL - 3]]) r.cyl([x, y, 0], [x, y, 1.6], 0.5, M.WOOD);   // pegs along the sides
  }, [84, 84, 42, 56], TENT_YAW),
};

// ---------------------------------------------------------------- building the outdoor world
function buildOutdoor(back) {
  const shadows = [];
  for (const d of LV.decor) {
    if (d.kind === 'tree') {
      const fi = d.i + 0.5 + d.jx, fj = d.j + 0.5 + d.jy, [x, y] = iso(fi, fj);
      const sp = d.tree === 'pine' ? OUT.pine(d.seed) : OUT.oak(d.seed, d.tree === 'autumn');
      props.push({ depth: fi + fj, sp, wx: x, wy: y + 2, tile: tIdx(d.i, d.j) });
      shadows.push([x + 6, y + 3, d.tree === 'pine' ? 16 : 20, d.tree === 'pine' ? 8 : 10]);
    } else if (d.kind === 'bush' || d.kind === 'fern' || d.kind === 'shroom' || d.kind === 'log') {
      const [x, y] = iso(d.fi, d.fj);
      const sp = d.kind === 'bush' ? OUT.bush(d.seed, d.autumn) : d.kind === 'fern' ? OUT.fern(d.seed) : d.kind === 'shroom' ? OUT.shroom(d.seed) : OUT.log(d.yaw);
      props.push({ depth: d.fi + d.fj - 0.2, sp, wx: x, wy: y + 2, tile: tIdx(Math.floor(d.fi), Math.floor(d.fj)) });
      if (d.kind === 'bush') shadows.push([x + 3, y + 2, 9, 4]);
    } else if (d.kind === 'grave' || d.kind === 'cart' || d.kind === 'stonewall') {
      const [x, y] = iso(d.i + 0.5, d.j + 0.5), sp = d.kind === 'grave' ? OUT.grave(d.seed) : d.kind === 'cart' ? OUT.cart() : OUT.stonewall();
      props.push({ depth: d.i + d.j + 1, sp, wx: x, wy: y + 2, tile: tIdx(d.i, d.j) });
      shadows.push([x + 2, y + 2, 9, 4]);
    } else if (d.kind === 'rock' || d.kind === 'stump' || d.kind === 'menhir' || d.kind === 'hay') {
      const [x, y] = iso(d.i + 0.5, d.j + 0.5);
      const sp = d.kind === 'rock' ? OUT.rock(d.seed) : d.kind === 'stump' ? OUT.stump() : d.kind === 'hay' ? OUT.hay() : OUT.menhir(d.seed);
      props.push({ depth: d.i + d.j + 1, sp, wx: x, wy: y + 2, tile: tIdx(d.i, d.j) });
      shadows.push([x + 3, y + 2, 10, 5]);
    } else if (d.kind === 'ruinwall' || d.kind === 'column') {
      const [x, y] = iso(d.i + 0.5, d.j + 0.5);
      props.push({ depth: d.i + d.j + 1, sp: d.kind === 'column' ? OUT.column(d.seed) : OUT.ruinwall(d.a, d.seed), wx: x, wy: y + 2, tile: tIdx(d.i, d.j) });
      shadows.push([x + 4, y + 3, 12, 6]);
    } else if (d.kind === 'crop') {
      const [x, y] = iso(d.fi, d.fj);
      props.push({ depth: d.fi + d.fj, sp: OUT.crop(d.seed), wx: x, wy: y + 1, tile: tIdx(Math.floor(d.fi), Math.floor(d.fj)) });
    } else if (d.kind === 'fence') {
      const [x, y] = iso(d.i + 0.5, d.j + 0.5);
      props.push({ depth: d.i + d.j + 1, sp: OUT.fence(d.along), wx: x, wy: y + 2, tile: tIdx(d.i, d.j) });
    } else if (d.kind === 'shrine') {
      const [x, y] = iso(d.i + 0.5, d.j + 0.5);
      props.push({ depth: d.i + d.j + 1, sp: OUT.pedestal(), wx: x, wy: y + 2, tile: tIdx(d.i, d.j) });
      shadows.push([x + 3, y + 3, 10, 5]);
    } else if (d.kind === 'palisade') {
      const [x, y] = iso(d.i + 0.5, d.j + 0.5);
      props.push({ depth: d.i + d.j + 1, sp: OUT.palisade(d.a), wx: x, wy: y + 2, tile: tIdx(d.i, d.j) });
    } else if (d.kind === 'lantern' || d.kind === 'signpost' || d.kind === 'pumpkin') {
      const [x, y] = iso(d.fi, d.fj), sp = d.kind === 'lantern' ? OUT.lantern() : d.kind === 'signpost' ? OUT.signpost() : OUT.pumpkin(d.seed);
      props.push({ depth: d.fi + d.fj, sp, wx: x, wy: y + 1, tile: tIdx(Math.floor(d.fi), Math.floor(d.fj)) });
      if (d.kind === 'lantern') lights.push({ x: x + 4, y, z: 20, r: LV.night ? 110 : 60, i: LV.night ? 0.7 : 0.25, seed: Math.floor(x) });
    } else if (d.kind === 'campfire') {
      const [x, y] = iso(d.i + 0.5, d.j + 0.5);
      props.push({ depth: d.i + d.j + 1, sp: OUT.campfire(), wx: x, wy: y + 2, tile: tIdx(d.i, d.j) });
      fires.push({ wx: x, wy: y - 2, h: 14, w: 5, seed: d.i * 31 + d.j, ember: 0.12, tile: tIdx(d.i, d.j) });
      lights.push({ x, y, z: 16, r: LV.night ? 150 : 90, i: LV.night ? 0.9 : 0.35, seed: d.i + d.j * 7 });
    } else if (BUILD[d.kind.replace('2', '')] || d.kind === 'stall2') {   // (the open gate 'gateo' has no footprint: it is walked through)
      const dw = d.w || 1, dh = d.h || 1, ci = d.i + dw / 2, cj = d.j + dh / 2, [x, y] = iso(ci, cj);   // forest tents have no footprint size
      const sp = d.kind === 'stall' ? BUILD.stall(0) : d.kind === 'stall2' ? BUILD.stall(1) : BUILD[d.kind]();
      props.push({ depth: ci + cj + 0.5, sp, wx: x, wy: y, tile: tIdx(d.i + dw - 1, d.j + dh - 1) });
      shadows.push([x + 10, y + 6, (dw + dh) * 11, (dw + dh) * 5]);
      if (LV.night && (d.kind === 'cabin' || d.kind === 'hut')) lights.push({ x: x + 12, y: y + 4, z: 12, r: 90, i: 0.6, seed: d.i });   // warm windows
      if (d.kind === 'forge') {
        const [fx, fy] = iso(ci + 1.2, cj + 0.15);
        lights.push({ x: fx, y: fy, z: 8, r: 60, i: 0.3, seed: 5 });
      }
    } else if (d.kind === 'well') {
      const [x, y] = iso(d.i + 0.5, d.j + 0.5);
      props.push({ depth: d.i + d.j + 1, sp: OUT.well(), wx: x, wy: y + 2, tile: tIdx(d.i, d.j) });
      shadows.push([x + 4, y + 3, 14, 6]);
    }
  }
  for (const [x, y, rx, ry] of shadows) shadeGround(x, y, rx, ry, 2);
  for (const d of LV.decor) if (d.kind === 'meadow') stampMeadow(d.seed);
}

// ---------------------------------------------------------------- townsfolk
// NPCs use the hero's rig in their own looks. Villagers wander near home; the merchant and the
// smith stand at their stalls and trade when the hero taps attack beside them.
const NPC_LOOKS = {
  smith: { team: 'tan', helm: 'none', chest: 'tunic', weapon: 'mace', shield: 'none', hair: 'bald', beard: true },
  merchant: { team: 'purple', helm: 'none', chest: 'tunic', weapon: 'none', shield: 'none', hair: 'grey', beard: true },
  villager: [{ team: 'green', helm: 'none', chest: 'tunic', weapon: 'none', shield: 'none', hair: 'blond' },
    { team: 'blue', helm: 'none', chest: 'tunic', weapon: 'none', shield: 'none', hair: 'brown' }],
  priest: { team: 'white', helm: 'hood', chest: 'robe_white', weapon: 'none', shield: 'none', hair: 'grey', beard: true },
  farmer: { team: 'tan', helm: 'none', chest: 'tunic', weapon: 'none', shield: 'none', hair: 'brown', beard: true },
  // round 42b: the story's people. Wren in purple, Hollis the farmer, Aldo with his axe
  wren: { team: 'purple', helm: 'none', chest: 'tunic', weapon: 'none', shield: 'none', hair: 'brown' },
  hollis: { team: 'tan', helm: 'none', chest: 'tunic', weapon: 'none', shield: 'none', hair: 'grey', beard: true },
  aldo: { team: 'green', helm: 'none', chest: 'tunic', weapon: 'axe', shield: 'none', hair: 'brown', beard: true },
};
let npcs = [];
function makeNpcs() {
  npcs = (LV.npcs || []).map((n, k) => {
    const L = NPC_LOOKS[n.role], look = Array.isArray(L) ? L[k % L.length] : L;
    return { ...n, fam: n.role === 'chicken' ? 'chicken' : 'hero', look, home: [n.fi, n.fj], dir: 1 + (k % 3), clip: 'idle', clock: k * 0.37, walk: 0, wait: 1 + k, target: null, npc: true };
  });
  for (const c of LV.critters || []) npcs.push({ ...c, role: 'chicken', fam: c.kind || 'chicken', look: { scale: 1 }, home: [c.fi, c.fj], dir: 0, clip: 'idle', clock: Math.random(), walk: 0, wait: Math.random() * 2, target: null, npc: true });
}
function updateNpcs(dt) {
  for (const n of npcs) {
    n.clock += dt;
    const dh = Math.hypot(hero.fi - n.fi, hero.fj - n.fj);
    if (n.leaving !== undefined) continue;   // Aldo running home from the den (quests.js)
    if (n.role === 'merchant' || n.role === 'smith' || n.role === 'priest' || TALKERS[n.role]) {   // face the hero when close
      if (dh < 3) n.dir = dirFrom(hero.fi - n.fi, hero.fj - n.fj);
      continue;
    }
    if (n.target) {
      const dx = n.target[0] - n.fi, dy = n.target[1] - n.fj, d = Math.hypot(dx, dy), sp = (n.role === 'chicken' ? 1.6 : 1.1) * dt;
      if (d < 0.1) { n.target = null; n.clip = 'idle'; n.wait = 1.5 + Math.random() * 3; continue; }
      const f0 = n.fi, j0 = n.fj; tryMove(n, dx / d * Math.min(sp, d), dy / d * Math.min(sp, d), 0.2);
      const moved = Math.hypot(n.fi - f0, n.fj - j0);
      if (moved < sp * 0.2) { n.target = null; n.clip = 'idle'; n.wait = 1; continue; }
      n.walk += moved / (n.fam === 'chicken' ? 0.06 : HERO_GAIT); n.dir = dirFrom(dx, dy); n.clip = 'walk';
    } else if ((n.wait -= dt) < 0) {
      const R = n.role === 'chicken' ? (n.fam === 'chicken' ? 1.6 : 1.8) : 2.4, a = Math.random() * 6.28, r = Math.random() * R;
      n.target = [n.home[0] + Math.cos(a) * r, n.home[1] + Math.sin(a) * r];
    }
  }
}
const TRADER_ROLES = { merchant: 'TAP: POTION 25 GOLD', smith: 'TAP: SELL BAG LOOT', priest: 'TAP: TALK', wren: 'TAP: TALK', hollis: 'TAP: TALK', aldo: 'TAP: TALK' };
const TALKERS = { priest: 1, wren: 1, hollis: 1, aldo: 1 };
// potions cost less once Hollis is home (round 42b)
const potionPrice = () => G.story && G.story.f.farmPaid ? 15 : 25;
const traderLabel = n => n.role === 'merchant' ? `TAP: POTION ${potionPrice()} GOLD` : n.role === 'aldo' && LV.side === 'den' && G.story && G.story.f.alphaDead ? 'TAP: FREE ALDO' : TRADER_ROLES[n.role];
function nearTrader() {
  let best = null, bd = 1.8;
  for (const n of npcs) if (TRADER_ROLES[n.role] && n.leaving === undefined) { const d = Math.hypot(n.fi - hero.fi, n.fj - hero.fj); if (d < bd) { bd = d; best = n; } }
  return best;
}
function trade(n) {
  if (TALKERS[n.role]) { talkTo(n); return; }
  if (n.role === 'merchant') {
    if (hero.gold < potionPrice()) { say('NOT ENOUGH GOLD', 23, 1.5); return; }
    if (hero.potions >= 9) { say('YOUR BELT IS FULL', 26, 1.5); return; }
    hero.gold -= potionPrice(); hero.potions++; sfx('gold'); say('BOUGHT A POTION', 51, 1.5);
  } else {
    const items = hero.bag.filter(it => !Object.values(hero.equip).includes(it));
    if (!items.length) { say('NOTHING TO SELL', 26, 1.5); return; }
    let g = 0;
    for (const it of items) g += Math.max(3, Math.round((it.lvl || 1) * ({ normal: 4, magic: 10, rare: 25, legend: 80, set: 45 }[it.rarity] || 4)));
    hero.bag = hero.bag.filter(it => !items.includes(it)); hero.gold += g; sfx('gold'); say(`SOLD ${items.length} FOR ${g} GOLD`, 51, 2);
  }
  saveGame();
}
// names and a bobbing marker over the townsfolk you can talk to
function drawNpcLabels() {
  drawExitLabel();
  for (const n of npcs) {
    if (!n.name) continue;
    const [x, y] = iso(n.fi, n.fj), sx = Math.round(x - camX), sy = Math.round(y - camY) - 58;
    if (sx < -40 || sx > W + 40 || sy < -10 || sy > H) continue;
    const near = Math.hypot(n.fi - hero.fi, n.fj - hero.fj) < 1.6;
    textC(n.name, sx, sy, near ? 51 : 27);   // round 43b: what to do is on the action button now
    const by = sy + 9 + Math.round(Math.sin(G.t * 4) * 1.5);
    if (priestMark(n, sx, by)) continue;
    for (let r = 0; r < 4; r++) for (let c = -3 + r; c <= 3 - r; c++) { const xx = sx + c, yy = by + r; if (xx >= 0 && yy >= 0 && xx < W && yy < H) out32[yy * W + xx] = PAL32[r === 0 || Math.abs(c) === 3 - r ? 123 : 124]; }
  }
}
// the green ring under the hero (the references' readability marker)
function heroRing(wx, wy) {
  const cx = wx - camX, cy = wy - camY, rx = 11.5, ry = 5.4;
  for (let a = 0; a < 64; a++) {
    const t = a / 64 * Math.PI * 2, x = Math.round(cx + Math.cos(t) * rx), y = Math.round(cy + Math.sin(t) * ry);
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const o = y * W + x; if (zbuf[o] > 1) continue;
    scr[o] = (Math.sin(t) > 0 ? 124 : 123) | EMIS;
  }
}
// where the way on is: the road out of town, the stone ring of the dungeon entrance
function drawGateSign() {
  const g = LV.gateSign; if (!g || Math.hypot(g[0] - hero.fi, g[1] - hero.fj) > 6) return;
  const [x, y] = iso(g[0], g[1]); textC(LV.gateOpen ? 'THE ROAD SOUTH: ' + ACTS[(LV.act + 1) % ACTS.length].name : 'THE ROAD SOUTH IS CLOSED', Math.round(x - camX), Math.round(y - camY) - 40, LV.gateOpen ? 51 : 22);
}
function drawExitLabel() {
  drawGateSign(); drawSideDoorLabels();
  const s = LV.stairs; if (!s) return;
  if (!LV.outdoor) { drawStairsMark(s); return; }
  if (Math.hypot(s.i - hero.fi, s.j - hero.fj) > 9) return;
  const [x, y] = iso(s.i + 0.5, s.j + 0.5), sx = Math.round(x - camX), sy = Math.round(y - camY) - (s.road ? 40 : 30);
  if (sx < -60 || sx > W + 60 || sy < 0 || sy > H) return;
  textC(s.road ? 'TO ' + AREA_NAMES.forest[LV.act % 3] : s.mine ? 'THE OLD MINE' : 'DUNGEON ENTRANCE', sx, sy, 51);
}

// dungeon stairs (round 25): a label when close, and once they have been seen, an arrow at the
// screen edge pointing the way while they are off screen
function drawStairsMark(s) {
  if (!LV.seen[tIdx(s.i, s.j)]) return;
  const [x, y] = iso(s.i + 0.5, s.j + 0.5), sx = x - camX, sy = y - camY;
  const X0 = 14, X1 = W - 14, Y0 = 40, Y1 = Math.round(H * 0.6);
  if (sx > X0 && sx < X1 && sy > Y0 && sy < Y1) {
    if (Math.hypot(s.i - hero.fi, s.j - hero.fj) < 7) textC(s.up ? 'WAY OUT' : bossAlive() ? 'SEALED' : LV.arena && LV.act === 0 ? 'HOME TO ' + AREA_NAMES.town[0] : 'STAIRS DOWN', Math.round(sx), Math.round(sy) - 24, bossAlive() ? 22 : 51);
    return;
  }
  // from the screen's middle toward the stairs, stopped at the edge of the play area
  const cx = W / 2, cy = (Y0 + Y1) / 2, dx = sx - cx, dy = sy - cy;
  const k = Math.min((dx > 0 ? X1 - cx : cx - X0) / Math.abs(dx || 1e-6), (dy > 0 ? Y1 - cy : cy - Y0) / Math.abs(dy || 1e-6));
  const bob = Math.sin(G.t * 5) * 1.5, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
  const ax = cx + dx * k - ux * bob, ay = cy + dy * k - uy * bob;
  // a filled arrowhead 14 px long, gold with a black edge
  for (let b = -10; b <= 10; b++) for (let a = -10; a <= 10; a++) {
    const f = a * ux + b * uy, g = -a * uy + b * ux;   // along, across
    if (f < -8 || f > 6) continue;
    const half = (6 - f) * 0.5;
    if (Math.abs(g) > half + 1) continue;
    put(Math.round(ax + a), Math.round(ay + b), Math.abs(g) > half || f < -7 ? BLK : (g < 0 ? 51 : 50));
  }
}
// ---------------------------------------------------------------- shrines
const SHRINES = {
  frenzy: { name: 'SHRINE OF FRENZY', msg: 'ATTACK SPEED UP', cols: [21, 22, 23] },
  stone: { name: 'SHRINE OF STONE', msg: 'DAMAGE TAKEN HALVED', cols: [38, 39, 40] },
  fortune: { name: 'SHRINE OF FORTUNE', msg: 'A SHOWER OF GOLD', cols: [49, 50, 51] },
};
function updateShrines() {
  if (!LV.outdoor) return;
  for (const d of LV.decor) {
    if (d.kind !== 'shrine' || d.used || Math.hypot(d.i + 0.5 - hero.fi, d.j + 0.5 - hero.fj) > 1.35) continue;
    d.used = true; const S = SHRINES[d.type];
    say(S.name, S.cols[2], 2.5); say(S.msg, 26, 2.5); sfx('levelUp');
    const [x, y] = iso(d.i + 0.5, d.j + 0.5); burst(4, x, y, 18, 30, 60, S.cols[2]);
    if (d.type === 'frenzy') hero.frenzy = 20;
    else if (d.type === 'stone') hero.stoneskin = 20;
    else for (let k = 0; k < 9; k++) { const a = k / 9 * 6.283, p = [d.i + 0.5 + Math.cos(a) * 1.3, d.j + 0.5 + Math.sin(a) * 1.3]; if (!blocked(p[0], p[1])) groundItems.push(k % 3 ? { gold: Math.round((5 + Math.random() * 8) * LV.diff), fi: p[0], fj: p[1], t: 0 } : { gem: GEMS[k % 4], fi: p[0], fj: p[1], t: 0 }); }
  }
}
// the crystal floats and turns above an unused shrine (dark once used)
function shrineCrystals(list) {
  if (!LV.outdoor) return;
  for (const d of LV.decor) {
    if (d.kind !== 'shrine') continue;
    const [x, y] = iso(d.i + 0.5, d.j + 0.5), tile = tIdx(d.i, d.j), cols = d.used ? [3, 66, 67] : SHRINES[d.type].cols;
    list.push({ depth: d.i + d.j + 1.05, draw: () => {
      const sx = Math.round(x - camX), sy = Math.round(y - camY - 22 + (d.used ? 0 : Math.sin(G.t * 2.5 + d.i) * 2)), w = Math.floor(G.t * 4) % 2;
      for (let b = -5; b <= 5; b++) for (let a = -3; a <= 3; a++) {
        if (Math.abs(a) * 5 / 3 + Math.abs(b) > 5) continue;
        const xx = sx + a, yy = sy + b; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const edge = Math.abs(a) * 5 / 3 + Math.abs(b) > 4, c = edge ? BLK : (a < 0 && b < 0 ? cols[2] : a > 0 ? cols[0] : cols[1]);
        scr[yy * W + xx] = (d.used || edge ? c : c | EMIS); zbuf[yy * W + xx] = 30; tbuf[yy * W + xx] = tile; cid[yy * W + xx] = 0;
      }
      if (!d.used && w) { const xx = sx - 1, yy = sy - 3; if (xx >= 0 && yy >= 0 && xx < W && yy < H) scr[yy * W + xx] = 27 | EMIS; }
    } });
  }
}
