Math.random = (() => { let s = 21; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const log = [], shots = {};
const step = n => { for (let i = 0; i < n; i++) { update(1 / 60); warmStep(80); } };
newHero(); G.mode = 'play'; startLevel(12, 4242);   // (round 48c: Act I's second area is the Riverlands now; the warlord holds Act III's forest)
hero.hp = STAT.maxHp = 9999;
const w = enemies.find(e => e.id === 'warlord');
log.push({ boss: !!w, bossVar: boss && boss.id, enemies: enemies.length, ponds: LV.ponds.length, tents: LV.decor.filter(d => d.kind === 'tent').length });
for (const e of enemies) if (e !== w) e.state = 'sleep', e.fi = 1, e.fj = 1;
hero.fi = w.fi + 3.5; hero.fj = w.fj + 1; w.state = 'hunt';
let sawRing = false, slammed = false, hp0 = hero.hp;
for (let k = 0; k < 600 && !slammed; k++) { step(1); if (w.slamT > 0 && !sawRing && w.slamT < 0.5) { sawRing = true; render(); shots.ring = cvs.toDataURL(); } if (sawRing && !(w.slamT > 0)) slammed = true; }
step(6); render(); shots.after = cvs.toDataURL();
log.push({ sawRing, slammed, heroHit: hero.hp < hp0 });
// half life: goblins come
w.hp = Math.floor(w.maxHp * 0.45); step(5); log.push({ called: !!w.called, enemies: enemies.length });
// kill him: stairs open
damageEnemy(w, 9999, hero.fi, hero.fj, false); step(60); log.push({ bossAlive: bossAlive() });
render(); shots.dead = cvs.toDataURL();
window.__out = { log, shots };
