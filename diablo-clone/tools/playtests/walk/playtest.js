// round 47: walking feel. The hero is steered in a straight line (as a thumb would) from the camp
// gates to every monster pack, the den, the farm and the mine; counts frames spent stuck (moving
// under 30% of full speed) and whether it got there. Also a forest area (level 2).
const L = [];
const walk = (from, to, maxS = 40) => {
  hero.fi = from[0]; hero.fj = from[1]; hero.dead = 0; let stuck = 0, frames = 0;
  for (; frames < maxS * 60; frames++) {
    if (Math.hypot(to[0] - hero.fi, to[1] - hero.fj) < 1.2) break;
    // aim at a spot ~2.5 tiles ahead along the shortest walkable route (the way a player follows a path)
    if (frames % 10 === 0) { const dist = bfs(Math.floor(to[0]), Math.floor(to[1])); let i = Math.floor(hero.fi), j = Math.floor(hero.fj), aim = [to[0], to[1]];
      for (let step = 0; step < 3; step++) { let best = null, bd = dist[tIdx(i, j)]; if (bd < 0) break; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = tIdx(i + a, j + b), v = dist[k]; if (v >= 0 && v < bd) { bd = v; best = [i + a, j + b]; } } if (!best) break; [i, j] = best; aim = [i + 0.5, j + 0.5]; }
      walk.aim = aim; }
    const dx = walk.aim[0] - hero.fi, dy = walk.aim[1] - hero.fj;
    // the thumb pushes toward the goal on screen: ground (dx, dy) -> stick (x = dx - dy, y = dx + dy)
    const sx = dx - dy, sy = (dx + dy) / 2, l = Math.hypot(sx, sy); input.mx = sx / l; input.my = sy / l;
    const f0 = hero.fi, j0 = hero.fj; update(1 / 60);
    if (Math.hypot(hero.fi - f0, hero.fj - j0) < STAT.speed / 60 * 0.3) stuck++;
  }
  input.mx = input.my = 0;
  return { got: Math.hypot(to[0] - hero.fi, to[1] - hero.fj) < 1.2, stuckPct: Math.round(stuck / Math.max(1, frames) * 100), secs: +(frames / 60).toFixed(1) };
};
newHero('warrior'); hero.hp = STAT.maxHp = 1e6; G.mode = 'play'; G.story = null; startLevel(1, 4242);
for (const e of enemies) e.state = 'sleep', e.dummy = true;
const gates = { west: [HUB.camp[0] - 15, HUB.camp[1] + 3], north: [HUB.camp[0] - 10, HUB.camp[1] - 11], east: [HUB.camp[0] + 11, HUB.camp[1] - 10] };
const res = [];
for (const [id, p] of HUB_PACKS) res.push(walk(id === 'wolf' ? gates.west : id === 'digger' ? gates.north : gates.east, p));
res.push(walk(gates.west, [HUB.den[0] + 2, HUB.den[1] + 1]));
// across the woods diagonally, off the roads
res.push(walk([HUB.woods[0] + 12, HUB.woods[1] - 12], [HUB.woods[0] - 6, HUB.woods[1] + 6]));
res.push(walk([HUB.woods[0] - 8, HUB.woods[1] - 10], [HUB.woods[0] + 8, HUB.woods[1] + 8]));
L.push({ hub: { reached: res.filter(r => r.got).length + '/' + res.length, avgStuckPct: Math.round(res.reduce((a, r) => a + r.stuckPct, 0) / res.length), worst: Math.max(...res.map(r => r.stuckPct)), fails: res.map((r, k) => r.got ? null : k).filter(x => x !== null) } });
// a forest area: clearing to clearing in straight lines
startLevel(2, 7); for (const e of enemies) e.state = 'sleep', e.dummy = true;
const C = LV.rooms.slice(0, 8).map(c => { for (let r = 0; r < 4; r++) for (let a = 0; a < 8; a++) { const fi = c.cx + 0.5 + Math.cos(a * 0.785) * r, fj = c.cy + 0.5 + Math.sin(a * 0.785) * r; if (standable(fi, fj)) return { cx: fi - 0.5, cy: fj - 0.5 }; } return c; }), r2 = [];   // (a clearing's middle can hold a statue: start beside it)
for (let k = 0; k + 1 < C.length; k++) r2.push(walk([C[k].cx + 0.5, C[k].cy + 0.5], [C[k + 1].cx + 0.5, C[k + 1].cy + 0.5], 30));
L.push({ forest: { reached: r2.filter(r => r.got).length + '/' + r2.length, avgStuckPct: Math.round(r2.reduce((a, r) => a + r.stuckPct, 0) / r2.length), worst: Math.max(...r2.map(r => r.stuckPct)), fails: r2.map((r, k) => r.got ? null : k).filter(x => x !== null) } });
window.__out = { log: L, shots: {} };
