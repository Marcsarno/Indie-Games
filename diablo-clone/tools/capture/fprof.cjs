const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file:///home/user/indie-games/diablo-clone/game/index.html');
  console.log(await p.evaluate(() => {
    Math.random = (() => { let s = 3; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    newHero(); G.mode = 'play'; startLevel(2, 2024); const room = LV.rooms[1]; hero.fi = room.cx + 0.5; hero.fj = room.cy + 0.5;
    for (let i = 0; i < 300; i++) { update(1 / 60); render(); warmStep(50); }
    const T = { update: 0, render: 0 }, N = 120, t = () => performance.now();
    const origLight = lightPass; let tl = 0; window.lightPass = (...a) => { const s = t(); origLight(...a); tl += t() - s; };
    for (let i = 0; i < N; i++) { let a = t(); update(1 / 60); T.update += t() - a; a = t(); render(); T.render += t() - a; }
    return JSON.stringify({ update: (T.update / N).toFixed(2), render: (T.render / N).toFixed(2), lightPassInRender: (tl / N).toFixed(2), props: props.length, enemies: enemies.length });
  }));
  await b.close();
})();
