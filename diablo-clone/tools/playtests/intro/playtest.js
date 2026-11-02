Math.random = (() => { let s = 21; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const log = [], shots = {};
const step = n => { for (let i = 0; i < n; i++) { update(1 / 60); warmStep(80); } };
newHero(); G.mode = 'play'; startLevel(2, 4242); hero.hp = STAT.maxHp = 9999;
const w = boss; for (const e of enemies) if (e !== w) e.state = 'sleep';
hero.fi = w.fi + 3; hero.fj = w.fj + 1; wake(w); step(40); render(); shots.intro = cvs.toDataURL();
log.push({ intro: G.bossIntro > 0, introduced: !!w.introduced });
damageEnemy(w, 99999, hero.fi, hero.fj, false); log.push({ slowmo: G.slowmo }); step(10); log.push({ slowmoAfter: +G.slowmo.toFixed(2) });
window.__out = { log, shots };
