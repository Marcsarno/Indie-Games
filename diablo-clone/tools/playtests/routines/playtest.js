// round 36: monster routines. On real levels, with the hero standing at the start and out of sight,
// run 30 s and look at what the monsters did: how many moved, how far from home, routines used, and
// that nobody wandered near the start or the Oakhollow camp. Also the cost per frame.
Math.random = (() => { let s = 9; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const L = [], shots = {};
newHero('warrior'); hero.hp = STAT.maxHp = 99999; G.mode = 'play';
for (const [lv, seed] of [[3, 777], [4, 31], [7, 5], [1, 99], [8, 1234]]) {
  startLevel(lv, seed);
  const sleepers = enemies.filter(e => e.state === 'sleep' && !e.def.unique);
  const start = sleepers.map(e => [e.fi, e.fj]), kinds = {};
  const nearHero0 = sleepers.filter(e => Math.hypot(e.fi - hero.fi, e.fj - hero.fj) < 8).length;
  for (const e of sleepers) if (e.routine) kinds[e.routine.kind] = (kinds[e.routine.kind] || 0) + 1;
  let maxFromHome = 0, nearStart = 0, nearCamp = 0, woke = 0;
  const t0 = performance.now();
  for (let k = 0; k < 1800; k++) {
    hero.hp = STAT.maxHp;
    update(1 / 60);
    if (k % 30 === 0) for (const e of sleepers) {
      const h = e.home; maxFromHome = Math.max(maxFromHome, Math.hypot(e.fi - h[0], e.fj - h[1]));
      if (Math.hypot(e.fi - hero.fi, e.fj - hero.fj) < 8 && e.state === 'sleep') nearStart++;
      if (LV.hub && Math.hypot(e.fi - HUB.camp[0], e.fj - HUB.camp[1]) < 12) nearCamp++;
    }
  }
  const ms = (performance.now() - t0) / 1800;
  woke = sleepers.filter(e => e.state !== 'sleep').length;
  const moved = sleepers.filter((e, n) => Math.hypot(e.fi - start[n][0], e.fj - start[n][1]) > 1).length;
  L.push({ level: lv, area: areaName(), sleepers: sleepers.length, within8AtStart: nearHero0, routines: kinds, movedOver1Tile: moved, woke, maxFromHome: +maxFromHome.toFixed(1), nearStartSamples: nearStart, nearCampSamples: nearCamp, msPerUpdate: +ms.toFixed(3) });
}
window.__out = { log: L, shots };
