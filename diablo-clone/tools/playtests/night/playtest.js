Math.random = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const log = [], shots = {};
const step = n => { for (let i = 0; i < n; i++) { update(1 / 60); warmStep(80); } };
newHero(); G.mode = 'play';
startLevel(11, 1444); log.push({ area: LV.area, night: LV.night }); step(30); render(); shots.town = cvs.toDataURL();
startLevel(12, 1481); for (const e of enemies) e.state = 'sleep'; const c = LV.decor.find(d => d.kind === 'campfire'); hero.fi = c.i + 1.5; hero.fj = c.j + 1.5; step(240); render(); shots.forest = cvs.toDataURL();
window.__out = { log, shots };
