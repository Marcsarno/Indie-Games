Math.random = (() => { let s = 13; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const log = [], shots = {};
const step = n => { for (let i = 0; i < n; i++) { update(1 / 60); warmStep(60); } };
newHero(); G.mode = 'play';
startLevel(6, 991); step(20); render(); shots.town2 = cvs.toDataURL(); log.push({ area: LV.area, autumn: LV.autumn, name: areaName() });
startLevel(7, 992); const r = LV.rooms[1]; hero.fi = r.cx + 0.5; hero.fj = r.cy + 0.5; for (const e of enemies) e.state = 'sleep'; step(20); render(); shots.forest2 = cvs.toDataURL(); log.push({ area: LV.area, autumn: LV.autumn, kinds: [...new Set(enemies.map(e => e.id))] });
startLevel(2, 993); hero.fi = LV.stairs.i - 1.5; hero.fj = LV.stairs.j + 1.5; for (const e of enemies) e.state = 'sleep'; step(20); render(); shots.entrance = cvs.toDataURL();
window.__out = { log, shots };
