// Frame-time benchmark: stubs rAF and times update+render over 240 frames, at normal speed and
// with Chrome's CPU throttled 4x (a rough stand-in for a mid-range phone; not a real device).
const { chromium } = require('playwright');
(async () => {
  const page = process.argv[2];
  for (const rate of [1, 4]) {
    const b = await chromium.launch(); const p = await b.newPage();
    await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
    await p.goto('file://' + page);
    const cdp = await p.context().newCDPSession(p);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate });
    const r = await p.evaluate(() => {
      let T = 0; const ts = [];
      for (let f = 0; f < 300; f++) { const a = performance.now(); update(1 / 60, T); render(T); ts.push(performance.now() - a); T += 1 / 60; }
      const s = ts.slice(60).sort((x, y) => x - y);
      return { median: s[s.length >> 1].toFixed(2), p95: s[Math.floor(s.length * 0.95)].toFixed(2) };
    });
    console.log(`cpu x${rate}: median ${r.median} ms, p95 ${r.p95} ms`);
    await b.close();
  }
})();
