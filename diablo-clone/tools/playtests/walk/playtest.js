// round 47: walking feel. The hero is steered in a straight line (as a thumb would) from the camp
// gates to every monster pack, the den, the farm and the mine; counts frames spent stuck (moving
// under 30% of full speed) and whether it got there. Also a forest area (Act II's, level 7; round 48c: Act I's second area is the Riverlands).
const L = [];
const walk = (from, to, maxS = 40) => {
  hero.fi = from[0]; hero.fj = from[1]; hero.dead = 0; let stuck = 0, frames = 0;
  for (; frames < maxS * 60; frames++) {
    if (Math.hypot(to[0] - hero.fi, to[1] - hero.fj) < 1.2) break;
        if (frames % 10 === 0) { computeFlow(); const w = wayTo(to); walk.aim = [hero.fi + w.dir[0], hero.fj + w.dir[1]]; }   // (round 48c: steer as the quest arrow leads: the farthest step of the way in plain sight)
    const dx = walk.aim[0] - hero.fi, dy = walk.aim[1] - hero.fj;
    // the thumb pushes toward the goal on screen: ground (dx, dy) -> stick (x = dx - dy, y = dx + dy)
    const sx = dx - dy, sy = (dx + dy) / 2, l = Math.hypot(sx, sy); input.mx = sx / l; input.my = sy / l;
    const f0 = hero.fi, j0 = hero.fj; update(1 / 60);
    if (Math.hypot(hero.fi - f0, hero.fj - j0) < STAT.speed / 60 * 0.3) stuck++;
  }
  input.mx = input.my = 0;
  return { at: [+hero.fi.toFixed(1), +hero.fj.toFixed(1)], to: to.map(v => +v.toFixed(1)), got: Math.hypot(to[0] - hero.fi, to[1] - hero.fj) < 1.2, stuckPct: Math.round(stuck / Math.max(1, frames) * 100), secs: +(frames / 60).toFixed(1) };
};
newHero('warrior'); hero.hp = STAT.maxHp = 1e6; G.mode = 'play'; G.story = { f: { aldoFree: true }, n: 0 }; startLevel(1, 4242);
enemies = [];   // (round 48c: some packs stand on the roads; asleep they would only be bodies in the way)
// round 48c: the Hollow: from outside the camp gate to every clearing and every door, and clearing to clearing across the woods
const gate = [HUB.camp[0] + Math.cos(HUB.gateA) * (HUB.wallR + 3), HUB.camp[1] + Math.sin(HUB.gateA) * (HUB.wallR + 3)];
const near = p => { for (let r = 0; r < 4; r += 0.5) for (let a = 0; a < 8; a++) { const fi = p[0] + Math.cos(a * 0.785) * r, fj = p[1] + Math.sin(a * 0.785) * r; if (standable(fi, fj)) return [fi, fj]; } return p; };
const res = [];
for (const c of HOLLOW.clearings) if (c.id !== 'camp') res.push(walk(gate, near(US(c.u, c.s).map(v => v + 0.5)), 60));
for (const k of ['den', 'barrow', 'tower']) res.push(walk(gate, near(SIDES[k].door()), 60));
res.push(walk(near(US(-22, 72)), near(US(17, 63)), 60)); res.push(walk(near(US(-24, 33)), near(US(33, 53)), 60));
L.push({ hub: { reached: res.filter(r => r.got).length + '/' + res.length, avgStuckPct: Math.round(res.reduce((a, r) => a + r.stuckPct, 0) / res.length), worst: Math.max(...res.map(r => r.stuckPct)), fails: res.map((r, k) => r.got ? null : k + '@' + r.at + '>' + r.to).filter(x => x !== null) } });
// a forest area: clearing to clearing in straight lines
startLevel(7, 7); for (const e of enemies) e.state = 'sleep', e.dummy = true;
const C = LV.rooms.slice(0, 8).map(c => { for (let r = 0; r < 4; r++) for (let a = 0; a < 8; a++) { const fi = c.cx + 0.5 + Math.cos(a * 0.785) * r, fj = c.cy + 0.5 + Math.sin(a * 0.785) * r; if (standable(fi, fj)) return { cx: fi - 0.5, cy: fj - 0.5 }; } return c; }), r2 = [];   // (a clearing's middle can hold a statue: start beside it)
for (let k = 0; k + 1 < C.length; k++) r2.push(walk([C[k].cx + 0.5, C[k].cy + 0.5], [C[k + 1].cx + 0.5, C[k + 1].cy + 0.5], 30));
L.push({ forest: { reached: r2.filter(r => r.got).length + '/' + r2.length, avgStuckPct: Math.round(r2.reduce((a, r) => a + r.stuckPct, 0) / r2.length), worst: Math.max(...r2.map(r => r.stuckPct)), fails: r2.map((r, k) => r.got ? null : k + '@' + r.at + '>' + r.to).filter(x => x !== null) } });
window.__out = { log: L, shots: {} };
