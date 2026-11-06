// round 67: the barrow's second floor. Over many seeds: floor 1 has a way down in the wraith's room,
// reachable; stepping on it leads to THE DEEP TOMB (harder, the Barrow Wight with its powers, two
// chests, all reachable); the stairs up there lead back to floor 1 beside the way down, with floor 1
// as you left it; the stairs up on floor 1 still lead out to the Hollow. Screenshots of both.
const L = [], shots = {};
const reach = (d, i, j) => { for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) { const x = Math.floor(i) + a, y = Math.floor(j) + b; if (x >= 0 && y >= 0 && x < MW && y < MH && d[tIdx(x, y)] >= 0) return true; } return false; };
const run = () => { const f = G.fadeTo; G.fadeTo = null; if (f) f(); };
const step = (n) => { for (let k = 0; k < n; k++) { G.t += 1 / 30; update(1 / 30); } };
newHero('warrior'); hero.lvl = 8; recalcHero(); G.mode = 'play'; G.story = { f: { met: true, aldoFree: true }, n: 0 };
let bad = 0;
for (const seed of [4242, 7, 99, 31337, 5, 11, 1234, 777, 2024, 31]) {
  startLevel(1, seed); G.actCard = 0;
  enterSide('barrow'); run();
  const o = { seed, side: LV.side, down: !!LV.down };
  if (!LV.down) { bad++; L.push(o); continue; }
  let d = bfs(LV.start.cx, LV.start.cy); o.downReach = reach(d, LV.down.i + 0.5, LV.down.j + 0.5);
  o.wraith = enemies.filter(e => e.id === 'wraith').length; o.f1 = enemies.length;
  enemies[0].hp = -1; const n1 = enemies.filter(e => e.hp > 0).length;
  hero.fi = LV.down.i + 2.5; hero.fj = LV.down.j + 2.5; for (const e of enemies) e.cool = 99; step(2);
  hero.fi = LV.down.i + 0.5; hero.fj = LV.down.j + 0.5; step(1); run();
  o.f2 = LV.side; o.name = areaName(); o.diff = LV.diff;
  const w = enemies.find(e => e.id === 'barrowwight'); o.wight = w ? (w.pw || []).join('+') + ' hp' + Math.round(w.maxHp) + ' lvl' + w.lvl : 'MISSING';
  d = bfs(LV.start.cx, LV.start.cy);
  o.wightReach = w ? reach(d, w.fi, w.fj) : false;
  const ch = dynProps.filter(p => p.kind === 'chest'); o.chests = ch.length + ' reached ' + ch.filter(p => reach(d, p.i + 0.5, p.j + 0.5)).length;
  o.f2n = enemies.length;
  if (seed === 4242) { const tmp = enemies; enemies = [w]; w.fi = hero.fi + 2; w.fj = hero.fj - 1.2; w.state = 'idle'; w.cool = 99; for (let i = 0; i < 200; i++) warmStep(30); G.msg = []; render(); shots.wight = cvs.toDataURL(); enemies = tmp; }
  // back up
  hero.fi = LV.stairs.i + 2.5; hero.fj = LV.stairs.j + 2.5; for (const e of enemies) e.cool = 99; step(2);
  hero.fi = LV.stairs.i + 0.5; hero.fj = LV.stairs.j + 0.5; input.keys.add('shift'); step(1); input.keys.clear(); run();   // (a player steers onto the way out)
  o.back = LV.side + (Math.hypot(hero.fi - LV.down.i, hero.fj - LV.down.j) < 3 ? ' by the way down' : ' ELSEWHERE') + ', alive ' + enemies.filter(e => e.hp > 0).length + '/' + n1;
  if (seed === 4242) { enemies = []; hero.fi = LV.down.i + 2.5; hero.fj = LV.down.j + 2.5; for (let i = 0; i < 200; i++) warmStep(30); G.msg = []; render(); shots.down = cvs.toDataURL(); }
  // and out to the Hollow
  hero.fi = LV.stairs.i + 2.5; hero.fj = LV.stairs.j + 2.5; step(2); hero.fi = LV.stairs.i + 0.5; hero.fj = LV.stairs.j + 0.5; input.keys.add('shift'); step(1); input.keys.clear(); run();   // (a player steers onto the way out)
  o.out = LV.hub ? 'hollow' : 'NOT OUT ' + LV.side;
  if (!o.downReach || o.f2 !== 'barrow2' || !w || !o.wightReach || !o.back.includes('barrow by') || o.out !== 'hollow') bad++;
  L.push(o);
}
window.__out = { log: L, bad, shots };
