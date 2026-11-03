// render profile: time per frame in the light pass, detail-layer sprite draws, sprite builds and the
// rest, after a full warm-up (no builds). node rprof.cjs [gameDir] [level] [cpuThrottle]
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const dir = path.resolve(process.argv[2] || path.join(__dirname, '../../game')), L = +(process.argv[3] || 4), thr = +(process.argv[4] || 1);
  const b = await chromium.launch(); const p = await b.newPage(); await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + dir + '/index.html');
  const cdp = await p.context().newCDPSession(p);
  console.log(await p.evaluate(async (L) => {
    Math.random = (() => { let s = 3; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    newHero(); G.mode = 'play'; startLevel(L, L === 4 ? 2024 : 4242); const room = LV.rooms[1]; if (room) { hero.fi = room.cx + 0.5; hero.fj = room.cy + 0.5; }
    hero.hp = 9999; for (const e of enemies) if (Math.hypot(e.fi - hero.fi, e.fj - hero.fj) < 9) wake(e);
    for (let i = 0; i < 900; i++) { input.attack = i % 40 < 20; update(1 / 60); render(); warmStep(200); }
    return 'warm';
  }, L));
  if (thr > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: thr });
  console.log(await p.evaluate(() => {
    const t = () => performance.now(), N = 120, T = { update: 0, render: 0, light: 0, ov: 0, comp: 0, put: 0 };
    const wrap = (name, key) => { const f = window[name]; if (!f) return; window[name] = (...a) => { const s = t(); const r = f(...a); T[key] += t() - s; return r; }; };
    wrap('lightPass', 'light'); wrap('ovBlit', 'ov');
    const di = ctx.drawImage.bind(ctx); ctx.drawImage = (...a) => { const s = t(); di(...a); T.comp += t() - s; };
    const pis = [ctx].concat(typeof baseCtx !== 'undefined' ? [baseCtx, ovCtx, hudCtx] : []);
    for (const c of pis) { const f = c.putImageData.bind(c); c.putImageData = (...a) => { const s = t(); f(...a); T.put += t() - s; }; }
    const b0 = spriteBuilds;
    for (let i = 0; i < N; i++) { input.attack = i % 40 < 20; let a = t(); update(1 / 60); T.update += t() - a; a = t(); render(); T.render += t() - a; }
    const o = {}; for (const k in T) o[k] = +(T[k] / N).toFixed(2); o.builds = spriteBuilds - b0; return JSON.stringify(o);
  }));
  await b.close();
})();
