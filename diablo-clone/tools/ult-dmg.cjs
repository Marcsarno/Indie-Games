// The mage's elemental ultimates: damage per foe (in basic hits) against ten sturdy skeletons spread over
// five tiles, and the frame cost while each runs (CPU slowed 4x). node tools/ult-dmg.cjs [gameDir]
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const gameDir = process.argv[2] || path.resolve(__dirname, '../game');
  const b = await chromium.launch(); const p = await b.newPage(); await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e)));
  await p.goto('file://' + path.resolve(gameDir, 'index.html'));
  const cdp = await p.context().newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  for (const kind of (process.argv[3] ? process.argv[3].split(',') : ['fire', 'frost', 'storm', 'earth', 'fire+storm', 'fire+frost', 'fire+earth', 'frost+storm', 'frost+earth', 'earth+storm', 'fire+frost+earth', 'all'])) {
    const r = await p.evaluate((kind) => {
      buildBudget.ms = Infinity; newHero('mage'); hero.lvl = 12; recalcHero(); hero.hp = STAT.maxHp = 99999; G.mode = 'play'; startLevel(3, 777); G.actCard = 0;
      const r0 = LV.rooms.slice(1).sort((a, b) => b.w * b.h - a.w * a.h)[0]; hero.fi = r0.cx + 0.5; hero.fj = r0.cy + 0.5;
      enemies.length = 0; for (let k = 0; k < 10; k++) { const a = k / 10 * 6.283, d = 1.8 + (k % 3) * 1.4; let fi = hero.fi + Math.cos(a) * d, fj = hero.fj + Math.sin(a) * d; if (blocked(fi, fj)) { fi = hero.fi + 1; fj = hero.fj + 1; } const e = makeEnemy('skeleton', fi, fj, k); e.hp = e.maxHp = 1e6; e.state = 'idle'; enemies.push(e); }
      updateFov(hero.fi, hero.fj); for (let s = 0; s < 80; s++) warmStep(40);
      let base = 0; for (let k = 0; k < 400; k++) base += roll(STAT.dmg); base /= 400;
      const time = n => { let ms = 0, worst = 0; for (let f = 0; f < n; f++) { for (const e of enemies) { e.cool = 99; e.atk = -1; } const t0 = performance.now(); update(1 / 30); render(); const d = performance.now() - t0; ms += d; worst = Math.max(worst, d); } return [ms / n, worst]; };
      const [idle] = time(30);
      hero.el = {}; for (const k of (kind === 'all' ? ELEMS : kind.split('+'))) hero.el[k] = 100; hero.ult = 100; useUlt();
      let frames = 0, ms = 0, worst = 0; while (hero.ultOn && frames < 400) { const [a, w] = time(1); ms += a; worst = Math.max(worst, w); frames++; }
      time(40);
      return { perFoe: +(enemies.reduce((s, e) => s + e.maxHp - e.hp, 0) / base / enemies.length).toFixed(1), seconds: +(frames / 30).toFixed(1), msIdle: +idle.toFixed(1), msAvg: +(ms / frames).toFixed(1), msWorst: +worst.toFixed(1), charged: JSON.stringify(hero.el) };
    }, kind);
    console.log(kind.padEnd(12), JSON.stringify(r));
  }
  console.log(errs.length ? 'ERR ' + errs.slice(0, 3).join('\n') : 'no page errors'); await b.close();
})();
