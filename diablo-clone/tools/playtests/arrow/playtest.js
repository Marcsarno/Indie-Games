// round 48: the quest arrow, always on and step by step. For every stage of the Act I chain, from
// the camp fire: is there a goal, and does walking where the arrow points (nothing else) get there?
// Then inside the den (the Alpha unseen, then Aldo), the cellar (the chief), a side area that isn't
// this step's (the way out), the mine floors (the stairs down) and the King's hall (the King).
Math.random = (() => { let s = 21; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const L = [], shots = {};
const shot = k => { for (let i = 0; i < 200; i++) warmStep(30); render(); shots[k] = cvs.toDataURL(); };
const FLAGS = ['met', 'woodTold', 'alphaDead', 'aldoFree', 'woodPaid', 'sawChain', 'farmTold', 'chiefDead', 'farmPaid', 'letterRead', 'mineOpen', 'kingDead', 'kingPaid'];
const STAGES = ['meet', 'wren', 'den', 'cage', 'aldoBack', 'mine', 'hollis', 'farm', 'farmBack', 'letter', 'unlock', 'king', 'kingBack'];
const setStage = n => { G.story = { f: {}, n: 0 }; for (let k = 0; k < n; k++) G.story.f[FLAGS[k]] = true; if (n >= FLAGS.length) G.gates = { 0: true }; else G.gates = null; };
// follow the arrow only: each step, the way from wayTo, a body's move (tryMove), the field refreshed
function follow(maxT = 120) {
  let t = 0, tgt = storyTarget(), d0 = tgt ? Math.hypot(tgt[0] - hero.fi, tgt[1] - hero.fj) : 0, stuck = 0, last = [hero.fi, hero.fj];
  if (!tgt) return { none: true };
  const dt = 1 / 30;
  while (t < maxT) {
    tgt = storyTarget(); if (!tgt) return { reached: 'target gone', t: +t.toFixed(1) };
    if (Math.hypot(tgt[0] - hero.fi, tgt[1] - hero.fj) < 1.7) return { reached: true, t: +t.toFixed(1), from: +d0.toFixed(1) };
    if ((Math.round(t / dt) % 12) === 0) computeFlow();
    const w = wayTo(tgt), m = Math.hypot(w.dir[0], w.dir[1]) || 1, sp = 4.2 * dt;
    tryMove(hero, w.dir[0] / m * sp, w.dir[1] / m * sp);
    t += dt;
    if (Math.round(t / dt) % 60 === 0) { if (Math.hypot(hero.fi - last[0], hero.fj - last[1]) < 0.3) stuck++; else stuck = 0; last = [hero.fi, hero.fj]; if (stuck > 4) return { reached: false, stuckAt: [+hero.fi.toFixed(1), +hero.fj.toFixed(1)], tgt: tgt.map(v => +v.toFixed(1)), t: +t.toFixed(1) }; }
  }
  return { reached: false, timeout: true, at: [+hero.fi.toFixed(1), +hero.fj.toFixed(1)], tgt: tgt.map(v => +v.toFixed(1)) };
}
newHero('warrior'); G.mode = 'play';
const atCamp = () => { hero.fi = HUB.camp[0] + 1.2; hero.fj = HUB.camp[1] + 1.2; computeFlow(); };
for (const [n, st] of STAGES.entries()) {
  setStage(n); startLevel(1, 4242); G.actCard = 0; G.bossIntro = 0;
  if (st === 'farm') { enemies = enemies.filter(e => e.id === 'brigand'); } else enemies = [];
  if (st === 'farm' && !enemies.length) L.push({ st, note: 'no brigands in the hub' });
  atCamp();
  const t = storyTarget(), got = storyStage();
  const r = follow();
  L.push({ st, stage: got, target: t && t.map(v => +v.toFixed(1)), ...r });
  if (st === 'den') { atCamp(); render(); shot('hub-den'); }
  if (st === 'cellar' || st === 'farm') { atCamp(); render(); shot('hub-farm'); }
}
// 'cellar' (the four bandits dead)
{ setStage(7); G.story.n = 4; startLevel(1, 4242); enemies = []; atCamp(); L.push({ st: 'cellar', stage: storyStage(), ...follow() }); }
// 'done': the road south
{ setStage(FLAGS.length); startLevel(1, 4242); enemies = []; atCamp(); const t = storyTarget(); L.push({ st: 'done', stage: storyStage(), gateOpen: LV.gateOpen, target: t && t.map(v => +v.toFixed(1)), ...follow() }); }
// inside the den, the Alpha not yet seen: the arrow leads to him; then (dead) to Aldo's cage
{ setStage(2); startLevel(1, 4242, 'den'); G.actCard = 0; const a = enemies.find(e => e.id === 'alpha'); enemies = a ? [a] : []; LV.seen.fill(0); hero.fi = LV.start.cx + 0.5; hero.fj = LV.start.cy + 0.5; computeFlow();
  render(); shot('den-start');
  L.push({ where: 'den, Alpha unseen', alpha: !!a, ...follow() });
  if (a) a.hp = 0; G.story.f.alphaDead = true; enemies = [];
  L.push({ where: 'den, to Aldo', ...follow() }); }
// in the cellar while the step is the den: the way out
{ setStage(2); startLevel(1, 4242, 'cellar'); enemies = []; hero.fi = LV.rooms[LV.rooms.length - 1].cx + 0.5; hero.fj = LV.rooms[LV.rooms.length - 1].cy + 0.5; computeFlow(); L.push({ where: 'cellar, wrong step', ...follow() }); }
// the cellar on its step: the chief
{ setStage(7); G.story.n = 4; startLevel(1, 4242, 'cellar'); const c = enemies.find(e => e.id === 'banditchief'); enemies = c ? [c] : []; hero.fi = LV.start.cx + 0.5; hero.fj = LV.start.cy + 0.5; computeFlow(); L.push({ where: 'cellar, chief', chief: !!c, ...follow() }); }
// the mine floors: the stairs down, unseen
for (const lv of [3, 4]) { setStage(11); startLevel(lv, 777 + lv); enemies = []; LV.seen.fill(0); computeFlow(); if (lv === 3) { render(); shot('mine1'); } L.push({ where: 'mine floor ' + (lv - 2), ...follow() }); }
// the King's hall: the King, then (dead) home
{ setStage(11); startLevel(5, 99); G.bossIntro = 0; const b = boss; enemies = b ? [b] : []; computeFlow(); L.push({ where: 'king hall', boss: !!b, ...follow() }); if (b) b.hp = 0; enemies = []; L.push({ where: 'king hall, after', ...follow() }); }
// the arrow draws (no throw) and the stairs' gold arrow gives way to it
{ setStage(2); startLevel(1, 4242); enemies = []; atCamp(); let ok = true; try { render(); } catch (e) { ok = String(e); } L.push({ drawOk: ok }); }
window.__out = { log: L, shots };
