'use strict';
// Outdoor areas (round 13, from the user's style references): a town hub and forests between the
// dungeons. Each cycle of five levels is town -> forest -> three dungeon floors (the third is the
// broodmother's lair). Outdoors there are no walls and no fog: the map is all ground, a ring of
// trees closes it in, and the ground is grass with dirt paths in daylight. Trees, houses and props
// are rig sprites like everything else, so they share the palette, shading and outlines.

const AREA_CYCLE = 5;
function areaOf(level) {
  const p = (level - 1) % AREA_CYCLE, cyc = Math.floor((level - 1) / AREA_CYCLE);
  if (p === 0) return { kind: 'town', cyc, diff: cyc * 3 + 1 };
  if (p === 1) return { kind: 'forest', cyc, diff: cyc * 3 + 1 };
  return { kind: 'dungeon', cyc, depth: cyc * 3 + p - 1, diff: cyc * 3 + p - 1 };
}
const AREA_NAMES = { town: ['OAKHOLLOW', 'ASHFORD', 'GREYMARSH'], forest: ['DEEPWOOD', 'EMBERWOOD', 'THORNWOOD'] };
const areaName = () => LV.outdoor ? AREA_NAMES[LV.area][LV.cyc % 3] : `${TH().name} ${LV.depth}`;

// ---------------------------------------------------------------- paths
// paths are polylines in tile space; their distance field is sampled 4x per tile and
// interpolated per pixel, so edges are smooth without a per-pixel search
const PF = 4;
let PW = MW * PF + 1, PH = MH * PF + 1, pathField = new Float32Array(PW * PH);
function bakePathField() {
  if (PW !== MW * PF + 1 || PH !== MH * PF + 1) { PW = MW * PF + 1; PH = MH * PF + 1; pathField = new Float32Array(PW * PH); }
  pathField.fill(99);
  for (const [x0, y0, x1, y1, w] of LV.paths) {
    const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy || 1;
    const a0 = Math.max(0, Math.floor((Math.min(x0, x1) - 4) * PF)), a1 = Math.min(PW - 1, Math.ceil((Math.max(x0, x1) + 4) * PF));
    const b0 = Math.max(0, Math.floor((Math.min(y0, y1) - 4) * PF)), b1 = Math.min(PH - 1, Math.ceil((Math.max(y0, y1) + 4) * PF));
    for (let b = b0; b <= b1; b++) for (let a = a0; a <= a1; a++) {
      const px = a / PF, py = b / PF, t = clamp(((px - x0) * dx + (py - y0) * dy) / l2, 0, 1);
      const d = Math.hypot(px - x0 - dx * t, py - y0 - dy * t) - w;
      if (d < pathField[b * PW + a]) pathField[b * PW + a] = d;
    }
  }
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
  LV.ponds = [];
  LV.map.fill(FLOOR); LV.solid.fill(0); LV.tall.fill(0); LV.roomOf.fill(-1); LV.seen.fill(1); LV.vis.fill(1);
  LV.decor = []; LV.spawns = []; LV.paths = []; LV.rooms = []; LV.npcs = [];
  bakeCanopy(A.cyc % 2 === 1);   // before the floor bake, which samples it past the map edge
  if (A.kind === 'town') genTown(R, A); else genForest(R, A);
  bakePathField();
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
  const autumn = A.cyc % 2 === 1;
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
  bakePathField();
  LV.rooms = C.map(c => ({ x: Math.floor(c.x - c.r), y: Math.floor(c.y - c.r), w: Math.ceil(c.r * 2), h: Math.ceil(c.r * 2), cx: Math.floor(c.x), cy: Math.floor(c.y), clr: c }));
  LV.start = LV.rooms[0];
  let far = 1, fd = -1;
  LV.rooms.forEach((r, n) => { const d = Math.hypot(r.cx - LV.start.cx, r.cy - LV.start.cy); if (n && d > fd) { fd = d; far = n; } });
  LV.stairs = { i: LV.rooms[far].cx, j: LV.rooms[far].cy, room: far, entrance: true };
  plantEdge(R, autumn);
  const inClearing = (i, j) => C.some(c => Math.hypot(i + 0.5 - c.x, j + 0.5 - c.y) < c.r + 0.6);
  // ponds in the woods away from paths and clearings; their tiles are solid water
  LV.ponds = [];
  for (let t = 0; t < 400 && LV.ponds.length < Math.round(3 * area); t++) {
    const x = 6 + R() * (MW - 12), y = 6 + R() * (MH - 12), rx = 1.8 + R() * 2.2, ry = 1.6 + R() * 1.8;
    if (pathD(x, y) < Math.max(rx, ry) + 1.2 || C.some(c => Math.hypot(c.x - x, c.y - y) < c.r + Math.max(rx, ry) + 1) || LV.ponds.some(p => Math.hypot(p.x - x, p.y - y) < 8)) continue;
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
  }
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
    LV.spawns.push({ id: 'warlord', fi: c.x + 1.2, fj: c.y - 1.2 });
    for (const [dx, dy] of [[-2.4, -1.6], [2.2, 1.8]]) { const i = Math.floor(c.x + dx), j = Math.floor(c.y + dy); if (!solidAt(i, j) && Math.hypot(i - S.i, j - S.j) > 1.5) { LV.solid[tIdx(i, j)] = 1; LV.decor.push({ kind: 'tent', i, j }); } }
    void r;
  }
  // monsters: a pack per clearing (more in camps), plus a few on the paths
  // the forest's own (goblins, wolves) come often; dungeon dwellers wander out now and then
  const pool = Object.keys(MONSTERS).filter(id => !MONSTERS[id].unique && (MONSTERS[id].minLevel || 1) <= A.diff && !['spider', 'shaman', 'burning'].includes(id));
  for (const id of ['goblin', 'goblin', 'wolf', 'wolf', 'slime', 'slime', 'boar', 'gshaman', 'brigand']) pool.push(id);
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
}

function genTown(R, A) {
  const autumn = A.cyc % 2 === 1, cx = 19.5, cy = 17.5, RAD = 9.5;
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
  LV.critters = [];
  for (let n = 0; n < 5; n++) LV.critters.push({ kind: 'chicken', fi: cx - 4 + R() * 6, fj: cy + 2 + R() * 3 });
}

// ---------------------------------------------------------------- ground
// grass from layered noise in the olive ramp, small tufts and flower clusters; dirt paths with a
// dithered edge and pebbles; the canopy texture fills everything past the map
function grassAt(x, y, A, B) {
  let t = 1.7 + vnoise(A, B, 70, 21) * 2.2 + vnoise(A, B, 19, 22) * 1.0 + vnoise(A, B, 6, 23) * 0.5;
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
const BUILD = {
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
  tent: () => propSprite('tent', r => {
    r.cone([0, 0, 0], [0, 0, 30], 19, 0.8, M.CLOTH_TAN, { mf: p => { const a = Math.atan2(p[1], p[0]); return Math.abs(a - 0.6) < 0.25 && p[2] < 14 ? M.DARK : Math.floor(a * 4 + 20) % 3 === 0 && Math.abs((a * 4) % 1) < 0.15 ? M.LEATHER : 0; } });
    r.cone([0, 0, 28], [0, 0, 36], 1, 0.4, M.WOOD);
  }, [72, 72, 36, 50], 0),
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
    } else if (d.kind === 'rock' || d.kind === 'stump' || d.kind === 'menhir' || d.kind === 'hay') {
      const [x, y] = iso(d.i + 0.5, d.j + 0.5);
      const sp = d.kind === 'rock' ? OUT.rock(d.seed) : d.kind === 'stump' ? OUT.stump() : d.kind === 'hay' ? OUT.hay() : OUT.menhir(d.seed);
      props.push({ depth: d.i + d.j + 1, sp, wx: x, wy: y + 2, tile: tIdx(d.i, d.j) });
      shadows.push([x + 3, y + 2, 10, 5]);
    } else if (d.kind === 'palisade') {
      const [x, y] = iso(d.i + 0.5, d.j + 0.5);
      props.push({ depth: d.i + d.j + 1, sp: OUT.palisade(d.a), wx: x, wy: y + 2, tile: tIdx(d.i, d.j) });
    } else if (d.kind === 'lantern' || d.kind === 'signpost' || d.kind === 'pumpkin') {
      const [x, y] = iso(d.fi, d.fj), sp = d.kind === 'lantern' ? OUT.lantern() : d.kind === 'signpost' ? OUT.signpost() : OUT.pumpkin(d.seed);
      props.push({ depth: d.fi + d.fj, sp, wx: x, wy: y + 1, tile: tIdx(Math.floor(d.fi), Math.floor(d.fj)) });
      if (d.kind === 'lantern') lights.push({ x: x + 4, y, z: 20, r: 60, i: 0.25, seed: Math.floor(x) });
    } else if (d.kind === 'campfire') {
      const [x, y] = iso(d.i + 0.5, d.j + 0.5);
      props.push({ depth: d.i + d.j + 1, sp: OUT.campfire(), wx: x, wy: y + 2, tile: tIdx(d.i, d.j) });
      fires.push({ wx: x, wy: y - 2, h: 14, w: 5, seed: d.i * 31 + d.j, ember: 0.12, tile: tIdx(d.i, d.j) });
      lights.push({ x, y, z: 16, r: 90, i: 0.35, seed: d.i + d.j * 7 });
    } else if (BUILD[d.kind.replace('2', '')] || d.kind === 'stall2') {
      const dw = d.w || 1, dh = d.h || 1, ci = d.i + dw / 2, cj = d.j + dh / 2, [x, y] = iso(ci, cj);   // forest tents have no footprint size
      const sp = d.kind === 'stall' ? BUILD.stall(0) : d.kind === 'stall2' ? BUILD.stall(1) : BUILD[d.kind]();
      props.push({ depth: ci + cj + 0.5, sp, wx: x, wy: y, tile: tIdx(d.i + dw - 1, d.j + dh - 1) });
      shadows.push([x + 10, y + 6, (dw + dh) * 11, (dw + dh) * 5]);
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
  farmer: { team: 'tan', helm: 'none', chest: 'tunic', weapon: 'none', shield: 'none', hair: 'brown', beard: true },
};
let npcs = [];
function makeNpcs() {
  npcs = (LV.npcs || []).map((n, k) => {
    const L = NPC_LOOKS[n.role], look = Array.isArray(L) ? L[k % L.length] : L;
    return { ...n, fam: n.role === 'chicken' ? 'chicken' : 'hero', look, home: [n.fi, n.fj], dir: 1 + (k % 3), clip: 'idle', clock: k * 0.37, walk: 0, wait: 1 + k, target: null, npc: true };
  });
  for (const c of LV.critters || []) npcs.push({ ...c, role: 'chicken', fam: 'chicken', look: { scale: 1 }, home: [c.fi, c.fj], dir: 0, clip: 'idle', clock: Math.random(), walk: 0, wait: Math.random() * 2, target: null, npc: true });
}
function updateNpcs(dt) {
  for (const n of npcs) {
    n.clock += dt;
    const dh = Math.hypot(hero.fi - n.fi, hero.fj - n.fj);
    if (n.role === 'merchant' || n.role === 'smith') {   // face the hero when close
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
      const R = n.role === 'chicken' ? 1.6 : 2.4, a = Math.random() * 6.28, r = Math.random() * R;
      n.target = [n.home[0] + Math.cos(a) * r, n.home[1] + Math.sin(a) * r];
    }
  }
}
const TRADER_ROLES = { merchant: 'TAP: POTION 25 GOLD', smith: 'TAP: SELL BAG LOOT' };
function nearTrader() {
  let best = null, bd = 1.6;
  for (const n of npcs) if (TRADER_ROLES[n.role]) { const d = Math.hypot(n.fi - hero.fi, n.fj - hero.fj); if (d < bd) { bd = d; best = n; } }
  return best;
}
function trade(n) {
  if (n.role === 'merchant') {
    if (hero.gold < 25) { say('NOT ENOUGH GOLD', 23, 1.5); return; }
    if (hero.potions >= 9) { say('YOUR BELT IS FULL', 26, 1.5); return; }
    hero.gold -= 25; hero.potions++; sfx('gold'); say('BOUGHT A POTION', 51, 1.5);
  } else {
    const items = hero.bag.filter(it => !Object.values(hero.equip).includes(it));
    if (!items.length) { say('NOTHING TO SELL', 26, 1.5); return; }
    let g = 0;
    for (const it of items) g += Math.max(3, Math.round((it.lvl || 1) * ({ normal: 4, magic: 10, rare: 25, legend: 80 }[it.rarity] || 4)));
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
    textC(near ? TRADER_ROLES[n.role] : n.name, sx, sy, near ? 51 : 27);
    const by = sy + 9 + Math.round(Math.sin(G.t * 4) * 1.5);
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
function drawExitLabel() {
  const s = LV.stairs; if (!LV.outdoor || !s) return;
  if (Math.hypot(s.i - hero.fi, s.j - hero.fj) > 9) return;
  const [x, y] = iso(s.i + 0.5, s.j + 0.5), sx = Math.round(x - camX), sy = Math.round(y - camY) - (s.road ? 40 : 30);
  if (sx < -60 || sx > W + 60 || sy < 0 || sy > H) return;
  textC(s.road ? 'TO ' + AREA_NAMES.forest[LV.cyc % 3] : 'DUNGEON ENTRANCE', sx, sy, 51);
}
