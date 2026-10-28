'use strict';
// The dungeon: a seeded floor of rooms and corridors, baked once into world-sized pixel buffers.
// Tile (i, j) projects with a 2:1 grid of 32x16 tiles; the camera looks from the +i+j side, so a
// wall hides the tiles up-screen of it. A wall is built tall only when no walkable floor lies in
// the screen column it would cover, otherwise it is a low stub: the hero is never hidden and the
// world needs no runtime cutaway. Floors, walls and static props are baked; barrels and chests
// stay dynamic so they can break and open.

const MW = 40, MH = 40;
const VOID = 0, FLOOR = 1, WALL = 2;
const WALL_TALL = 64, WALL_LOW = 14;
const WX0 = MH * 16 + 24, WY0 = WALL_TALL + 24;
const WW = (MW + MH) * 16 + 48, WH = (MW + MH) * 8 + WY0 + 32;
const iso = (fi, fj) => [WX0 + (fi - fj) * 16, WY0 + (fi + fj) * 8];
// screen offset (dx, dy) in world px -> tile-space offset, isotropic on the ground
const screenToTile = (sx, sy) => [(sx / 16 + sy / 8) / 2, (sy / 8 - sx / 16) / 2];
const groundToTile = (x, y) => { const A = (x - WX0) + 2 * (y - WY0), B = 2 * (y - WY0) - (x - WX0); return [A / 32, B / 32]; };

const LV = {
  map: new Uint8Array(MW * MH), tall: new Uint8Array(MW * MH), solid: new Uint8Array(MW * MH),
  roomOf: new Int16Array(MW * MH), rooms: [], start: null, stairs: null, spawns: [], decor: [],
  seen: new Uint8Array(MW * MH), vis: new Float32Array(MW * MH), level: 1, seed: 1,
};
const tileAt = (i, j) => (i < 0 || j < 0 || i >= MW || j >= MH) ? VOID : LV.map[j * MW + i];
const tIdx = (i, j) => j * MW + i;
function blocked(fi, fj) {
  const i = Math.floor(fi), j = Math.floor(fj);
  if (i < 0 || j < 0 || i >= MW || j >= MH) return true;
  const k = j * MW + i;
  return LV.map[k] !== FLOOR || LV.solid[k] === 1;
}
// line of sight across tiles (walls block, props don't)
function los(a, b, c, d) {
  const n = Math.ceil(Math.max(Math.abs(c - a), Math.abs(d - b)) * 3) + 1;
  for (let s = 1; s < n; s++) { const t = s / n; if (tileAt(Math.floor(a + (c - a) * t), Math.floor(b + (d - b) * t)) !== FLOOR) return false; }
  return true;
}

// ---------------------------------------------------------------- generation
function genLevel(level, seed) {
  for (let attempt = 0; attempt < 20; attempt++) if (tryGen(level, seed + attempt * 7919)) { LV.level = level; LV.seed = seed; return; }
  throw new Error('level generation failed');
}
function tryGen(level, seed) {
  const R = rng(seed), map = LV.map;
  map.fill(VOID); LV.solid.fill(0); LV.roomOf.fill(-1); LV.seen.fill(0); LV.vis.fill(0);
  const rooms = [];
  for (let t = 0; t < 400 && rooms.length < 11; t++) {
    const w = R.int(6, 10), h = R.int(6, 10), x = R.int(2, MW - w - 2), y = R.int(2, MH - h - 2);
    if (rooms.some(r => x < r.x + r.w + 3 && x + w + 3 > r.x && y < r.y + r.h + 3 && y + h + 3 > r.y)) continue;
    rooms.push({ x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1), type: R.pick(['crypt', 'hall', 'store', 'crypt']) });
  }
  if (rooms.length < 7) return false;
  rooms.forEach((r, n) => { for (let j = r.y; j < r.y + r.h; j++) for (let i = r.x; i < r.x + r.w; i++) { map[tIdx(i, j)] = FLOOR; LV.roomOf[tIdx(i, j)] = n; } });
  // corridors: minimum spanning tree over room centers plus a couple of loops, 2 tiles wide
  const carve = (i, j) => { for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) if (i + a > 0 && j + b > 0 && i + a < MW - 1 && j + b < MH - 1) map[tIdx(i + a, j + b)] = FLOOR; };
  const corridor = (A, B) => {
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
  for (let e = 0; e < 2; e++) { const a = R.int(0, rooms.length - 1), b = R.int(0, rooms.length - 1); if (a !== b) corridor(rooms[a], rooms[b]); }
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
  LV.rooms = rooms;
  LV.start = rooms[0];
  // reachability from the start room; stairs go in the farthest room
  const dist = bfs(LV.start.cx, LV.start.cy);
  for (let k = 0; k < MW * MH; k++) if (map[k] === FLOOR && dist[k] < 0) return false;
  let far = 1, fd = -1;
  rooms.forEach((r, n) => { const d = dist[tIdx(r.cx, r.cy)]; if (n && d > fd) { fd = d; far = n; } });
  LV.stairs = { i: rooms[far].cx, j: rooms[far].cy, room: far };
  placeDecor(R, level, dist);
  placeSpawns(R, level);
  return true;
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
// props are only kept if every floor tile stays reachable with them in place
function trySolid(i, j) {
  const k = tIdx(i, j);
  if (LV.map[k] !== FLOOR || LV.solid[k]) return false;
  if (Math.abs(i - LV.start.cx) <= 1 && Math.abs(j - LV.start.cy) <= 1) return false;
  if (LV.stairs && Math.abs(i - LV.stairs.i) <= 1 && Math.abs(j - LV.stairs.j) <= 1) return false;
  LV.solid[k] = 1;
  const d = bfs(LV.start.cx, LV.start.cy);
  for (let q = 0; q < MW * MH; q++) if (LV.map[q] === FLOOR && !LV.solid[q] && d[q] < 0) { LV.solid[k] = 0; return false; }
  return true;
}
function placeDecor(R, level) {
  const D = LV.decor = [];
  const wallSide = (i, j) => tileAt(i - 1, j) === WALL || tileAt(i, j - 1) === WALL || tileAt(i + 1, j) === WALL || tileAt(i, j + 1) === WALL;
  LV.rooms.forEach((r, n) => {
    if (r.type === 'hall' && r.w >= 7 && r.h >= 7) {
      for (const [i, j] of [[r.x + 1, r.y + 1], [r.x + r.w - 2, r.y + 1], [r.x + 1, r.y + r.h - 2], [r.x + r.w - 2, r.y + r.h - 2]]) if (trySolid(i, j)) D.push({ kind: 'pillar', i, j });
      if (n && trySolid(r.cx, r.cy)) D.push({ kind: 'brazier', i: r.cx, j: r.cy });
    } else if (n && r.w * r.h >= 36 && R() < 0.5 && trySolid(r.cx, r.cy)) D.push({ kind: 'brazier', i: r.cx, j: r.cy });
    if (r.type === 'store' || R() < 0.4) {
      const cnt = R.int(2, 4);
      for (let t = 0; t < 30 && D.filter(d => d.room === n && (d.kind === 'barrel' || d.kind === 'crate')).length < cnt; t++) {
        const i = R.int(r.x, r.x + r.w - 1), j = R.int(r.y, r.y + r.h - 1);
        if (!wallSide(i, j)) continue;
        if (trySolid(i, j)) D.push({ kind: R() < 0.65 ? 'barrel' : 'crate', i, j, room: n, seed: R.int(1, 1e6) });
      }
    }
    if (r.type === 'crypt' || R() < 0.3) {
      for (let b = 0; b < R.int(1, 3); b++) D.push({ kind: 'bones', fi: r.x + 0.5 + R() * (r.w - 1), fj: r.y + 0.5 + R() * (r.h - 1), seed: R.int(1, 1e6) });
      for (let b = 0; b < R.int(1, 3); b++) D.push({ kind: 'blood', fi: r.x + 0.5 + R() * (r.w - 1), fj: r.y + 0.5 + R() * (r.h - 1), size: R.int(2, 5), seed: R.int(1, 1e6) });
    }
  });
  // chests: one or two, against a wall in rooms other than the start
  for (let c = 0; c < 1 + (R() < 0.5 ? 1 : 0); c++) {
    const n = R.int(1, LV.rooms.length - 1), r = LV.rooms[n];
    for (let t = 0; t < 30; t++) { const i = R.int(r.x, r.x + r.w - 1), j = r.y; if (trySolid(i, j)) { D.push({ kind: 'chest', i, j, seed: R.int(1, 1e6) }); break; } }
  }
  // torches on tall walls facing floor, spaced apart
  const torches = [];
  for (let j = 0; j < MH; j++) for (let i = 0; i < MW; i++) {
    if (!LV.tall[tIdx(i, j)]) continue;
    const faceR = tileAt(i + 1, j) === FLOOR, faceL = tileAt(i, j + 1) === FLOOR;
    if (!faceR && !faceL) continue;
    if (hash(i, j, LV.seed) > 0.4 || torches.some(t => Math.abs(t.i - i) + Math.abs(t.j - j) < 5)) continue;
    torches.push({ kind: 'torch', i, j, face: faceL ? 'L' : 'R' });
  }
  D.push(...torches);
}
function placeSpawns(R, level) {
  const S = LV.spawns = [];
  const pool = Object.keys(MONSTERS).filter(id => !MONSTERS[id].unique && (MONSTERS[id].minLevel || 1) <= level);
  const free = r => { for (let t = 0; t < 40; t++) { const fi = r.x + 0.5 + R() * (r.w - 1), fj = r.y + 0.5 + R() * (r.h - 1); if (!blocked(fi, fj)) return [fi, fj]; } return null; };
  LV.rooms.forEach((r, n) => {
    if (n === 0) return;
    let budget = 2 + Math.floor(level * 0.8) + (r.w * r.h > 50 ? 1 : 0);
    while (budget > 0) {
      const id = R.pick(pool), m = MONSTERS[id];
      const count = m.pack ? R.int(2, 4) : 1;
      for (let c = 0; c < count; c++) { const p = free(r); if (p) S.push({ id, fi: p[0], fj: p[1] }); }
      budget -= m.pack ? 2 : 1;
    }
  });
  if (level >= 3) { const r = LV.rooms[LV.stairs.room], p = free(r); if (p) S.push({ id: 'broodmother', fi: p[0], fj: p[1] }); }
}

// ---------------------------------------------------------------- textures
function brick(g, z, shade, seed) {
  const zi = Math.floor(z), gi = Math.floor(g);
  const row = Math.floor(zi / 8), off = (row & 1) * 8, gx = gi + off;
  const bx = Math.floor(gx / 16), mz = zi % 8, mx = ((gx % 16) + 16) % 16;
  if (mz === 0 || mx === 0) return S[0];
  let t = 3 + Math.floor(hash(bx, row, seed) * 3) + shade;
  if (mz === 7) t += 1; else if (mz === 1) t -= 1;
  if (mx === 1) t += 1;
  const ph = hash(gi, zi, seed + 1);
  if (ph < 0.08) t -= 1; else if (ph > 0.985) t += 1;
  if (row === 0) t -= 1;
  return S[clamp(t, 0, 8)];
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
function wallTex(i, j, tall) {
  const deco = tall ? hash(i, j, 77) : 1;
  return (face, a, b) => {
    if (face === 'top') {
      const gi = i * 16 + a, gj = j * 16 + b;
      if (((gi | 0) % 16) < 1 || ((gj | 0) % 16) < 1) return S[1];
      let t = 2 + Math.floor(hash(Math.floor(gi / 16), Math.floor(gj / 16), 11) * 2);
      if (hash(gi | 0, gj | 0, 5) < 0.1) t--;
      return S[t];
    }
    const g = (face === 'L' ? i * 16 : j * 16) + a;
    if (tall && deco < 0.1) { const d = bannerDeco(a, b, 54, deco < 0.05 ? RED : BLUE); if (d) return d; }
    if (tall && deco > 0.93 && b > 6 && b < 40) {   // cracked, mossy patch
      const h = hash(g | 0, b | 0, 13);
      if (h < 0.12) return S[1];
      if (b < 18 && h > 0.7) return GREEN[0];
    }
    return brick(g, b, face === 'R' ? -1 : 0, face === 'L' ? 3 : 4);
  };
}
function pillarTex(shade) {
  return (face, a, b) => {
    if (face === 'top') return S[5];
    const zi = Math.floor(b);
    if (zi % 12 === 0) return S[1];
    let t = (face === 'L' ? 4 : 3) + shade;
    if (face === 'L' && a < 1.5) t += 1;
    if (face === 'R' && a > 9) t -= 1;
    if (zi % 12 === 11) t += 1;
    if (hash(a | 0, zi, 21) < 0.08) t -= 1;
    return S[clamp(t, 0, 8)];
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
  if (!propCache[k]) { const r = new Rig(); build(r); propCache[k] = renderRig(r, yaw, ...size); }
  return propCache[k];
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
const floorBuf = new Uint8Array(WW * WH);
const wIdx = new Uint8Array(WW * WH), wZ = new Uint8Array(WW * WH), wFloor = new Uint8Array(WW * WH);
const wTile = new Int16Array(WW * WH);
const props = [];    // static, baked, depth-sorted with characters where they overlap
const dynProps = []; // barrels and chests: drawn every frame
const fires = [];    // flames {wx, wy, h, w, seed}
const lights = [];   // {x, y (ground point, world px), z, r, i, seed}
function genFloor() {
  for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) {
    const A = (x - WX0) + 2 * (y - WY0), B = 2 * (y - WY0) - (x - WX0);
    const ti = Math.floor(A / 32), tj = Math.floor(B / 32), t = tileAt(ti, tj), k = y * WW + x;
    let v = BLK;
    wTile[k] = (ti >= 0 && tj >= 0 && ti < MW && tj < MH) ? tIdx(ti, tj) : -1;
    if (t === FLOOR) {
      const room = LV.roomOf[tIdx(ti, tj)] >= 0;
      const cell = room ? 16 : 8;   // flagstones in rooms, cobbles in corridors
      const sb = Math.floor(B / cell), A2 = A + (sb & 1) * (cell / 2);
      const ma = ((A2 % cell) + cell) % cell, mb = ((B % cell) + cell) % cell;
      if (ma < 2 || mb < 2) v = K2;
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
        v = S[clamp(tone, 0, 8)];
        if (h > 0.985 && ph < 0.4) v = GREEN[0];   // moss in the joints
      }
    }
    floorBuf[k] = v;
  }
}
function setFloor(k, v) { floorBuf[k] = v; if (wFloor[k]) wIdx[k] = v; }
function stampBlood(wx, wy, size, seed) {
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
      setFloor(k, hash(x, y, seed + 1) < 0.05 ? RED[3] : d < 0.45 ? RED[2] : RED[1]);
    }
  }
}
function blitWorld(sp, wx, wy, zBase = 0, tile = -1, asFloor = false) {
  const sx0 = Math.round(wx) - sp.ax, sy0 = Math.round(wy) - sp.ay;
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
  genFloor();
  props.length = 0; dynProps.length = 0; fires.length = 0; lights.length = 0;
  const back = [];
  for (let j = 0; j < MH; j++) for (let i = 0; i < MW; i++) {
    if (tileAt(i, j) !== WALL) continue;
    const tall = LV.tall[tIdx(i, j)];
    const sp = makeBox(1, 1, tall ? WALL_TALL : WALL_LOW, wallTex(i, j, tall));
    const [wx, wy] = iso(i, j);
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
    } else if (d.kind === 'barrel' || d.kind === 'chest') {
      const [x, y] = iso(d.i + 0.5, d.j + 0.5);
      dynProps.push({ kind: d.kind, i: d.i, j: d.j, depth: d.i + d.j + 1, wx: x, wy: y + (d.kind === 'barrel' ? 3 : 2), hp: 1, open: false, seed: d.seed, tile: tIdx(d.i, d.j) });
    }
  }
  // stairs down: a stepped pit in the floor
  {
    const s = LV.stairs, [x, y] = iso(s.i, s.j);
    const sp = makeBox(1, 1, 1, (face, a, b) => {
      if (face !== 'top') return 0;
      const step = Math.floor(b / 3);
      if (a < 1 || b < 1 || a > 15) return S[2];
      return step >= 4 ? BLK : [S[6], S[4], S[3], S[1]][step] + (a < 3 ? 1 : 0);
    });
    s.sp = sp; s.wx = x; s.wy = y;
  }
  wIdx.set(floorBuf); wZ.fill(0); wFloor.fill(1);
  blitWorld(LV.stairs.sp, LV.stairs.wx, LV.stairs.wy + 1, 0, -1, true);
  for (const d of LV.decor) {
    if (d.kind === 'blood') { const [x, y] = iso(d.fi, d.fj); stampBlood(Math.round(x), Math.round(y), d.size, d.seed); }
    if (d.kind === 'bones') blitWorld(d.sp, d.wx, d.wy, 0, -1, true);
  }
  back.sort((a, b) => a.depth - b.depth);
  for (const d of back) blitWorld(d.sp, d.wx, d.wy, d.z || 0, d.tile);
  props.sort((a, b) => a.depth - b.depth);
  for (const p of props) blitWorld(p.sp, p.wx, p.wy, p.z || 0, p.tile);
  bakeLightMaps();
}
// static lights never move: each one's falloff over the baked scenery is computed once
const ZMAX = 90;
function bakeLightMaps() {
  for (const L of lights) {
    const r = L.r, ox = Math.floor(L.x - r), oy = Math.floor(L.y - r / 2 - ZMAX), mw = Math.ceil(2 * r), mh = Math.ceil(r + ZMAX);
    const map = new Float32Array(mw * mh), r2 = r * r;
    for (let my = 0; my < mh; my++) {
      const wy = oy + my; if (wy < 0 || wy >= WH) continue;
      for (let mx = 0; mx < mw; mx++) {
        const wx = ox + mx; if (wx < 0 || wx >= WW) continue;
        const z = wZ[wy * WW + wx], dx = wx - L.x, dy = (wy + z - L.y) * 2, dz = z - L.z, d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < r2) { const f = 1 - d2 / r2; map[my * mw + mx] = f * f * L.i; }
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
}
const staticLight = [new Float32Array(WW * WH), new Float32Array(WW * WH)];

// ---------------------------------------------------------------- fog of war
// seen = explored (remembered, drawn dim); vis = visible now (0..1, soft edge)
const FOV_R = 9.5;
function updateFov(pi, pj) {
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
