// Headless play-through with screenshots (Playwright + the pre-installed Chromium).
//   node tools/play.mjs <outdir> [--size 844x390] [--script overview|potato|cranberry|feast] [--url http://localhost:4173/]
// Taps are real pointer events at the projected position of a hit_* target, so the whole input path is tested.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }

const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const out = args[0] || '.work/shots';
const [W, H] = opt('--size', '844x390').split('x').map(Number);
const script = opt('--script', 'overview');
const url = opt('--url', 'http://localhost:4173/') + '?ratio=' + opt('--ratio', '2');
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
await page.goto(url);
await page.waitForFunction(() => window.__game, null, { timeout: 60000 });
let n = 0;
const shot = async (name) => { await page.screenshot({ path: `${out}/${String(++n).padStart(2, '0')}-${name}.png` }); };
// waits are in GAME time: headless software rendering runs slower than real time
const sleep = async (ms) => {
  const t0 = await page.evaluate(() => window.__clock.time);
  await page.waitForFunction(([t0, ms]) => window.__clock.time >= t0 + ms / 1000, [t0, ms], { timeout: 120000, polling: 50 });
};
const pos = (name, index = 0) => page.evaluate(([name, index]) => {
  const st = window.__stage;
  const t = st.input.targets.filter((t) => t.name === name && (!t.handler.enabled || t.handler.enabled()))[index];
  if (!t) return null;
  t.mesh.geometry.computeBoundingBox();
  const c = t.mesh.geometry.boundingBox.getCenter(new t.mesh.position.constructor());
  t.mesh.updateWorldMatrix(true, false);
  c.applyMatrix4(t.mesh.matrixWorld);
  return st.input.screenOf(c);
}, [name, index]);
const tap = async (name, times = 1, gap = 260, index = 0) => {
  for (let i = 0; i < times; i++) {
    const p = await pos(name, index);
    if (!p) { console.log('  (no target', name + ')'); return false; }
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    await page.mouse.up();
    await sleep(gap);
  }
  return true;
};
const state = () => page.evaluate(() => window.__game.state);
const waitState = async (s, ms = 30000) => { await page.waitForFunction((s) => window.__game.state === s, s, { timeout: ms }); };

await page.waitForTimeout(1200);
await shot('title');
await page.locator('.play').click({ force: true });
await sleep(3200);
await shot('home');

async function potato() {
  await tap('station_potato');
  await sleep(1600);
  await shot('potato-start');
  await tap('potato', 3, 300);
  await shot('potato-peeling');
  await tap('potato', 3, 300);
  await shot('potato-peeling2');
  await tap('potato', 2, 300);
  await sleep(1900);
  await shot('potato-in-bowl');
  await sleep(900);
  await tap('masher', 3, 330);
  await shot('potato-mashing');
  await tap('bowl', 4, 330);
  await sleep(1600);
  await shot('potato-mashed');
  await tap('butter');
  await sleep(1700);
  await shot('potato-butter');
  await tap('bowl', 5, 520);
  await sleep(700);
  await shot('potato-stirred');
  await sleep(2600);
  await shot('potato-flying');
  await sleep(3500);
  await shot('potato-guest');
}
async function cranberry() {
  await tap('station_cranberry');
  await sleep(1600);
  await shot('cran-start');
  await tap('opener', 3, 450);
  await sleep(1300);
  await shot('cran-open');
  await sleep(700);
  await tap('can', 2, 420);
  await shot('cran-peek');
  await tap('can', 1, 300);
  await sleep(1700);
  await shot('cran-log');
  await tap('log', 3, 300);
  await sleep(300);
  await shot('cran-bell');
  await tap('log', 7, 200);
  await sleep(500);
  await shot('cran-rain');
  await sleep(2600);
  await tap('bell');
  await sleep(2500);
  await shot('cran-flying');
  await sleep(3500);
  await shot('cran-guest');
}

if (script === 'potato' || script === 'feast') {
  await potato();
  await waitState('home');
  await sleep(1500);
  await shot('home-after-potato');
}
if (script === 'cranberry' || script === 'feast') {
  await cranberry();
}
if (script === 'feast') {
  await waitState('dinner', 40000);
  await sleep(1500);
  await shot('dinner');
  for (let i = 0; i < 2; i++) { await tap('guest', 1, 260, i); await sleep(1900); }
  await shot('served');
  await tap('gobbles');
  await sleep(4200);
  await shot('finale');
  await sleep(4500);
  await shot('photo');
}
if (script === 'idle') {
  await tap('station_cranberry');
  await sleep(7500);
  await shot('idle-7s');
  await sleep(8600);
  await shot('idle-16s');
}
if (script === 'delights') {
  for (const d of ['pot_0', 'pot_1', 'pot_2', 'faucet', 'cat', 'jar', 'window', 'fridge']) { await tap(d); await sleep(350); }
  await shot('delights');
  await tap('oven');
  await sleep(2600);
  await shot('oven-panic');
}
const perf = await page.evaluate(() => { const i = window.__stage.renderer.info; return { calls: i.render.calls, tris: i.render.triangles, real: window.__clock.real.toFixed(1), game: window.__clock.time.toFixed(1) }; });
console.log('state:', await state(), '| shots:', n, '| last frame:', JSON.stringify(perf));
if (errors.length) console.log('ERRORS:\n' + [...new Set(errors)].slice(0, 20).join('\n'));
await browser.close();
