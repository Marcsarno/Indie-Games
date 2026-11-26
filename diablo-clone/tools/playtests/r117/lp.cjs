const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); p.on('pageerror', e => console.log('ERR', String(e.stack || e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; Math.random = (() => { let s = 3; return () => (s = (s * 16807) % 2147483647) / 2147483647; })(); });
  await p.goto('file://' + process.argv[2] + '/index.html');
  console.log(await p.evaluate((LEVEL) => { newHero('mage'); hero.lvl = 8; recalcHero(); G.mode = 'play'; startLevel(LEVEL, 2024);
    const room = LV.rooms && (LV.rooms[1] || LV.rooms[0]); if (room) { hero.fi = room.cx + 0.5; hero.fj = room.cy + 0.5; }
    for (const e of enemies) e.state = 'hunt'; hero.hp = 1e6; STAT.maxHp = 1e6; hero.mp = 1e6; for (let i = 0; i < 400; i++) warmStep(50);
    const run = n => { for (let f = 0; f < n; f++) { input.attack = f % 40 < 20; if (f % 90 === 30) { try { useSkill(1); } catch (e) { /* none */ } } hero.mp = 1e6; update(1 / 60); warmStep(2); render(); } }; run(300); window.__lp = [0, 0, 0, 0]; run(900);
    return 'static ' + (__lp[0] / 900).toFixed(3) + ' dyn ' + (__lp[1] / 900).toFixed(3) + ' final ' + (__lp[2] / 900).toFixed(3) + ' lights/frame ' + (__lp[3] / 900).toFixed(1) + ' W,H ' + W + ',' + H; }, +(process.argv[3] || 3)));
  await b.close(); })();
