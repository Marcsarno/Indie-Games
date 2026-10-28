// Headless driver: node tools/play.cjs <outdir> [scenario]
// Steps the game deterministically through window.__step(n) so scripted input is frame-exact.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
(async () => {
  const out = process.argv[2] || '/tmp/play'; fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 768, height: 720 } });
  p.on('console', m => console.log('console:', m.text()));
  p.on('pageerror', e => console.log('PAGEERROR:', e.message));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.waitForTimeout(300);
  const shot = async n => { await p.locator('#c').screenshot({ path: path.join(out, n + '.png') }); };
  const st = () => p.evaluate(() => { const G = window.__G(); return { mode: G.mode, x: Math.round(G.m.x), y: Math.round(G.m.y), vx: +G.m.vx.toFixed(2), vy: +G.m.vy.toFixed(2), state: G.m.state, big: G.m.big, cam: Math.round(G.cam), score: G.score, coins: G.coins, lives: G.lives, time: G.time, ground: G.m.onGround }; });
  // freeze the realtime loop and drive frames manually
  await p.evaluate(() => { window.__manual = true; });
  const step = (n, keys) => p.evaluate(([n, keys]) => {
    for (let i = 0; i < n; i++) { window.__tickKeys && window.__tickKeys(keys, i); window.__update(); }
    window.__draw();
  }, [n, keys || {}]);
  module.exports = { p, shot, st, step };
  const scen = require('./scenarios.cjs');
  await scen[process.argv[3] || 'basic']({ p, shot, st, step, out });
  await b.close();
})();
