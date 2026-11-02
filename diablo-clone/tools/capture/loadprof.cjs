const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file:///home/user/indie-games/diablo-clone/game/index.html');
  const cdp = await p.context().newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  console.log(await p.evaluate(() => {
    newHero(); G.mode = 'play';
    const T = {}, t = () => performance.now();
    let a = t(); genLevel(2, 2024); T.gen = t() - a;
    a = t(); genFloor(); T.floor = t() - a;
    a = t(); buildWorld(); T.buildWorldAll = t() - a;
    a = t(); enemies = LV.spawns.map((s, n) => makeEnemy(s.id, s.fi, s.fj, n)); makeNpcs(); T.enemies = t() - a;
    a = t(); warmStep(1e9, prewarm()); T.prewarm = t() - a;
    return JSON.stringify(Object.fromEntries(Object.entries(T).map(([k, v]) => [k, Math.round(v)])));
  }));
  await b.close();
})();
