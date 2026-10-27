// Frame-time benchmark for diablo-clone/game: seeded level, hero in a room with awake monsters,
// attack held; times update+render at normal speed and with Chrome's CPU throttled 4x (a rough
// stand-in for a mid-range phone, not a real device). Sprite builds are included (cold cache).
const { chromium } = require('playwright');
const path = require('path');
const PAGE = 'file://' + path.resolve(__dirname, '../game/index.html');
(async () => {
  for (const rate of [1, 4]) {
    const b = await chromium.launch(); const p = await b.newPage();
    await p.addInitScript(() => { window.requestAnimationFrame = () => 0; Math.random = (() => { let s = 3; return () => (s = (s * 16807) % 2147483647) / 2147483647; })(); });
    await p.goto(PAGE);
    const cdp = await p.context().newCDPSession(p);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate });
    const r = await p.evaluate(() => {
      const tl = performance.now(); newHero(); G.mode = 'play'; startLevel(2, 2024); const loadMs = performance.now() - tl;
      const room = LV.rooms[1]; hero.fi = room.cx + 0.5; hero.fj = room.cy + 0.5;
      for (const e of enemies) e.state = 'hunt';
      hero.hp = 1e6; STAT.maxHp = 1e6;
      const run = (frames) => {
        const ts = [], b0 = spriteBuilds;
        for (let f = 0; f < frames; f++) {
          input.attack = f % 40 < 20;
          const a = performance.now(); update(1 / 60); warmStep(2); render(); ts.push(performance.now() - a);
        }
        const s = ts.sort((x, y) => x - y);
        return { median: s[s.length >> 1].toFixed(2), p95: s[Math.floor(s.length * 0.95)].toFixed(2), max: s[s.length - 1].toFixed(1), builds: spriteBuilds - b0 };
      };
      const cold = run(300);
      while (warmQueue.length) warmStep(1e9);
      const warm = run(300);
      return { cold, warm, enemies: enemies.filter(alive).length, loadMs: loadMs.toFixed(0) };
    });
    const f = x => `median ${x.median} ms, p95 ${x.p95} ms, max ${x.max} ms, ${x.builds} sprites built`;
    console.log(`cpu x${rate}: level load ${r.loadMs} ms | first 5 s: ${f(r.cold)} | after warm-up: ${f(r.warm)} | ${r.enemies} monsters awake`);
    await b.close();
  }
})();
