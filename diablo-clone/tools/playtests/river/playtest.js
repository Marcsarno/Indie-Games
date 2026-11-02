Math.random = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const log = [], shots = {};
const step = n => { for (let i = 0; i < n; i++) { update(1 / 60); warmStep(80); } };
newHero(); G.mode = 'play'; startLevel(2, 778);
// every floor tile not solid must be reachable from the start
const d = bfs(LV.start.cx, LV.start.cy); let unreach = 0, open = 0;
for (let k = 0; k < MW * MH; k++) if (!LV.solid[k]) { open++; if (d[k] < 0) unreach++; }
log.push({ bridges: LV.bridges.length, riverSegs: LV.river.length, open, unreach, stairsReach: d[tIdx(LV.stairs.i, LV.stairs.j)] >= 0 });
for (const e of enemies) e.state = 'sleep';
const b = LV.bridges[Math.floor(LV.bridges.length / 2)]; hero.fi = b[0] + 0.5; hero.fj = b[1] + 0.5; step(20); render(); shots.bridge = cvs.toDataURL();
showMap = true; render(); shots.map = cvs.toDataURL(); showMap = false;
window.__out = { log, shots };
