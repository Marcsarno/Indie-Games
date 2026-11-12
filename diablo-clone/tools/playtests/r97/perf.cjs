// frame cost in a fight as the paladin in Archangel, 1x and 4x CPU throttle
const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve('game/index.html') + '?cine=0');
  const cdp = await p.context().newCDPSession(p);
  for (const [rate, cls, fx] of [[4, 'paladin', 1], [4, 'paladin', 0], [4, 'warrior', 1]]) {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate });
    const r = await p.evaluate(([cls, fx]) => {
      allocBuffers(270, 480); G.mode = 'title'; beginGame(false, cls); hero.lvl = 8; recalcHero(); startLevel(3, 777); G.actCard = 0;
      const s = LV.start; hero.fi = s.cx + 0.5; hero.fj = s.cy + 0.5;
      for (let k = 0; k < 8; k++) { const e = makeEnemy('skeleton', hero.fi + 2 + (k % 3), hero.fj - 1 + (k >> 1) * 0.8, enemies.length, 3); e.maxHp = e.hp = 9999; enemies.push(e); }
      for (let i = 0; i < 3000; i++) warmStep(40);
      if (cls === 'paladin') { hero.ult = 100; useUlt(); hero.mana = 999; CD.consec = 0; useSkill(1); }
      const times = [];
      for (let f = 0; f < 240; f++) { if (f % 20 === 0) heroAttack(); if (f % 60 === 30 && cls === 'paladin') { CD.judge = 0; hero.mana = 999; useSkill(3); } if (!fx) { window.drawPalAir = () => {}; window.drawPalGround = () => {}; } const t0 = performance.now(); update(1 / 60); render(); times.push(performance.now() - t0); }
      times.sort((a, b) => a - b); return [times[120].toFixed(1), times[228].toFixed(1), times[239].toFixed(1)]; }, [cls, fx]);
    console.log('rate', rate, cls, 'fx', fx, 'median/p95/max ms', r.join(' / '));
  }
  console.log(errs.join('\n') || 'ok'); await b.close(); })();
