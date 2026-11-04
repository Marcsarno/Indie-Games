// round 26 (round 48c: The Hollow): over 50 seeds, with the fallen tree cleared, every door, the road
// north and the camp's people are reachable from the camp; with it down the road north is not; no
// monster within HUB.safe of the fire; the road north leads to the Riverlands, its mine to the first floor
newHero('warrior'); const L = [];
let bad = 0, leak = 0, near = 0;
for (let s = 0; s < 50; s++) {
  for (const open of [true, false]) {
    G.story = { f: open ? { aldoFree: true } : {}, n: 0 }; genLevel(1, s * 7777 + 1); const d = bfs(LV.start.cx, LV.start.cy);
    const reach = (fi, fj) => { for (let a = -1; a <= 1; a++) for (let c = -1; c <= 1; c++) if (d[tIdx(Math.floor(fi) + a, Math.floor(fj) + c)] >= 0) return true; return false; };
    const exit = d[tIdx(LV.stairs.i, LV.stairs.j)] >= 0;
    if (open) { const r = [exit, ...['den', 'barrow', 'tower'].map(k => reach(...SIDES[k].door())), ...LV.npcs.map(n => reach(n.fi, n.fj))]; if (r.some(v => !v)) bad++; near += LV.spawns.filter(sp => Math.hypot(sp.fi - HUB.camp[0], sp.fj - HUB.camp[1]) < HUB.safe).length; }
    else if (exit) leak++;
  }
}
L.push({ hubsWithUnreachable: bad, treeLeaks: leak, monstersNearCamp: near });
G.mode = 'play'; G.story = { f: { aldoFree: true }, n: 0 }; startLevel(1, 4242); hero.fi = LV.stairs.i + 0.5; hero.fj = LV.stairs.j + 0.5; for (let k = 0; k < 60; k++) update(1 / 60);
L.push({ north: LV.level, area: areaName() });
G.story.f.mineOpen = true; startLevel(2, 4242); hero.fi = LV.stairs.i + 0.5; hero.fj = LV.stairs.j + 0.5; for (let k = 0; k < 60; k++) update(1 / 60);
L.push({ afterMine: LV.level, area: LV.area, floor: LV.floor });
window.__out = { log: L, shots: {} };
