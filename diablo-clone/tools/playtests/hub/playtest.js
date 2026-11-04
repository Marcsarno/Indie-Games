// round 26: the hand-built Act I hub: over 50 seeds, every landmark is reachable from the camp,
// no monster is within 12 tiles of it, and the mine leads to the first dungeon floor
newHero('warrior'); const L = [];
let bad = 0, near = 0;
for (let s = 0; s < 50; s++) {
  genLevel(1, s * 7777 + 1); const d = bfs(LV.start.cx, LV.start.cy);
  const reach = (fi, fj) => { for (let a = -1; a <= 1; a++) for (let c = -1; c <= 1; c++) if (d[tIdx(Math.floor(fi) + a, Math.floor(fj) + c)] >= 0) return true; return false; };
  const r = [d[tIdx(LV.stairs.i, LV.stairs.j)] >= 0, reach(HUB.gate[0] - 1, HUB.gate[1] - 1), reach(HUB.den[0] + 1.5, HUB.den[1]), reach(HUB.farm[0], HUB.farm[1] + 3), reach(LV.npcs[0].fi, LV.npcs[0].fj)];
  if (r.some(v => !v)) bad++;
  near += LV.spawns.filter(sp => Math.hypot(sp.fi - HUB.camp[0], sp.fj - HUB.camp[1]) < HUB.safe).length;
}
L.push({ hubsWithUnreachable: bad, monstersNearCamp: near });
G.mode = 'play'; startLevel(1, 4242); hero.fi = LV.stairs.i + 0.5; hero.fj = LV.stairs.j + 0.5; for (let k = 0; k < 60; k++) update(1 / 60);
L.push({ afterMine: LV.level, area: LV.area, floor: LV.floor });
window.__out = { log: L, shots: {} };
