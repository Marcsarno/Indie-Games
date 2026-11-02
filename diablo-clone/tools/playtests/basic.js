// runs inside the page (rAF stubbed). Deterministic: seeded level, scripted inputs.
Math.random = (() => { let s = 11; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
newHero(); G.mode = 'play'; startLevel(3, 777);
const log = [];
const step = (n) => { for (let i = 0; i < n; i++) { update(1 / 60); warmStep(30); } };
// teleport next to the nearest enemy and fight it
const shots = {};
let target = enemies.filter(e => !e.def.ranged).slice().sort((a, b) => Math.hypot(a.fi - LV.start.cx, a.fj - LV.start.cy) - Math.hypot(b.fi - LV.start.cx, b.fj - LV.start.cy))[0];
hero.fi = target.fi - 2.5; hero.fj = target.fj; if (blocked(hero.fi, hero.fj)) { hero.fi = target.fi; hero.fj = target.fj - 2.5; } if (blocked(hero.fi, hero.fj)) { hero.fi = target.fi; hero.fj = target.fj; } target.state = 'hunt';
for (let n = 0; n < 40 && alive(target); n++) {
  input.attack = true; step(8); input.attack = false; step(4);
  if (n === 1) { render(); shots.fight = cvs.toDataURL(); }
  if (hero.dead) break;
}
step(60); render(); shots.after = cvs.toDataURL();
log.push({ killed: !alive(target), target: target.id, heroHp: Math.round(hero.hp), drops: groundItems.length, kills: G.kills, builds: spriteBuilds });
// give loot and equip to see the visible change
const R = rng(3);
for (const b of ['great_helm', 'plate_mail', 'kite_shield', 'long_sword']) { const it = rollItem(R, 2, b); hero.bag.push(it); equipItem(it); }
step(30); render(); shots.geared = cvs.toDataURL();
G.mode = 'inv'; INV.sel = { item: hero.equip.chest, from: 'equip', slot: 'chest' }; render(); shots.inv = cvs.toDataURL(); G.mode = 'play'; INV.sel = null;
// walk to the stairs by teleport and descend
hero.fi = LV.stairs.i + 0.5; hero.fj = LV.stairs.j + 0.5; step(90);
log.push({ level: LV.level, enemies: enemies.length });
render(); shots.level2 = cvs.toDataURL();
// frame timing
const ts = [];
for (let f = 0; f < 120; f++) { const a = performance.now(); update(1 / 60); render(); ts.push(performance.now() - a); }
ts.sort((a, b) => a - b);
log.push({ medianMs: ts[60].toFixed(2), p95: ts[114].toFixed(2) });
window.__out = { log, shots };
