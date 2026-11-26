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
    // on a portrait screen the game is turned 90 degrees: game px -> client px
    const c = await page.evaluate((p) => (window.__stage.rotated ? { x: window.innerWidth - p.y, y: p.x } : p), p);
    await page.mouse.move(c.x, c.y);
    await page.mouse.down();
    await page.mouse.up();
    await sleep(gap);
  }
  return true;
};
const pick = async (id) => {
  // through the picture menu when the job is on offer, otherwise straight into it (single-recipe tests)
  await page.waitForFunction(() => window.__game.state === 'home' && document.querySelector('.menu .dishbtn'), null, { timeout: 60000 });
  const inMenu = await page.evaluate((id) => !!document.querySelector(`.menu [aria-label="${id}"]`), id);
  if (inMenu) await page.locator(`.menu [aria-label="${id}"]`).dispatchEvent('pointerdown');
  else await page.evaluate((id) => { const g = window.__game; g.enterStation(g.stations.find((s) => s.name === id)); }, id);
};
const state = () => page.evaluate(() => window.__game.state);
const waitState = async (s, ms = 30000) => { await page.waitForFunction((s) => window.__game.state === s, s, { timeout: ms }); };

await page.waitForTimeout(1200);
await shot('title');
await page.locator('.play').click({ force: true });
await sleep(3200);
await shot('home');

async function potato() {
  await pick('potato');
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
  await pick('cranberry');
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

async function table() {
  await pick('table');
  await sleep(1700);
  await shot('table-start');
  await tap('plates', 3, 650);
  await shot('table-plates');
  await tap('plates', 3, 650);
  await sleep(1500);
  await tap('forks', 6, 650);
  await sleep(1500);
  await shot('table-forks');
  await tap('cards', 1, 400);
  await shot('table-card-reveal');
  await sleep(1300);
  await tap('cards', 5, 1500);
  await sleep(900);
  await shot('table-cards');
  await sleep(4300);
  await shot('table-arrival');
  await sleep(3500);
  await shot('table-guest');
}
/** Zoomed screenshot around a world point (asks the game where it is on screen). */
async function closeup(name, expr, w = 300, h = 300) {
  const p = await page.evaluate((expr) => { const v = eval(expr); return window.__stage.input.screenOf(v); }, expr);
  const x = Math.max(0, Math.min(W - w, p.x - w / 2)), y = Math.max(0, Math.min(H - h, p.y - h / 2));
  await page.screenshot({ path: `${out}/${String(++n).padStart(2, '0')}-${name}.png`, clip: { x, y, width: w, height: h } });
}

async function beans() {
  await pick('beans');
  await sleep(1700);
  await shot('beans-start');
  await tap('beans', 6, 420);
  await sleep(1500);
  await shot('beans-snapped');
  await tap('tub', 4, 700);
  await sleep(600);
  await shot('beans-done');
}
async function stuffing() {
  await pick('stuffing');
  await sleep(1700);
  await shot('stuffing-start');
  await tap('loaf', 5, 600);
  await sleep(1800);
  await shot('stuffing-bread');
  await tap('celery', 4, 650);
  await sleep(1700);
  await tap('shaker', 3, 800);
  await sleep(1300);
  await shot('stuffing-herbs');
  await tap('stuffbowl', 4, 700);
  await sleep(600);
  await shot('stuffing-done');
}
async function sweet() {
  await pick('sweet');
  await sleep(1700);
  await shot('sweet-start');
  await tap('pot', 4, 900);
  await sleep(1300);
  await tap('bag', 6, 450);
  await sleep(1800);
  await shot('sweet-marsh');
  await sleep(1600);
  await tap('oven', 1, 400);
  await sleep(1900);
  await shot('sweet-oven');
  await tap('oven', 3, 900);
  await sleep(400);
  await shot('sweet-toasted');
}
async function pie() {
  await pick('pie');
  await sleep(1700);
  await shot('pie-start');
  await tap('dough', 5, 520);
  await sleep(2200);
  await shot('pie-crust');
  await tap('fillbowl', 3, 950);
  await sleep(1300);
  await tap('pie', 12, 230);
  await sleep(400);
  await shot('pie-crimped');
  await sleep(2400);
  await tap('oven', 1, 400);
  await sleep(2600);
  await shot('pie-baking');
  await sleep(6500);
  await shot('pie-baked');
  await tap('cream', 8, 300);
  await sleep(1500);
  await shot('pie-done');
}
async function roast() {
  await pick('roast');
  await sleep(1700);
  await shot('roast-start');
  await tap('rsbowl', 4, 800);
  await sleep(1200);
  await tap('baster', 6, 1100);
  await sleep(1400);
  await shot('roast-basted');
  await sleep(1500);
  await tap('oven', 1, 400);
  await sleep(2600);
  await tap('oven', 1, 400);       // an early peek
  await sleep(1300);
  await shot('roast-peek');
  await sleep(5200);
  await tap('oven', 1, 400);       // pull it out
  await sleep(1600);
  await shot('roast-out');
  await sleep(2600);
  await tap('roast', 4, 800);
  await sleep(500);
  await shot('roast-carved');
}
const recipes = { potato, cranberry, table, beans, stuffing, sweet, pie, roast };
const afterDish = async (name) => {
  await page.waitForFunction(() => ['home', 'dinner'].includes(window.__game.state), null, { timeout: 90000 });
  await sleep(1200);
  await shot(name + '-home');
};
if (recipes[script]) {
  await recipes[script]();
  await afterDish(script);
}
if (script === 'feast' || script === 'short') {
  // 'short' rings the dinner bell after three jobs; 'feast' cooks everything
  const order = script === 'short' ? ['potato', 'cranberry', 'beans'] : ['potato', 'cranberry', 'table', 'beans', 'stuffing', 'sweet', 'pie', 'roast'];
  for (const name of order) {
    await recipes[name]();
    await afterDish(name);
  }
  if (script === 'short') await page.locator('.menu [aria-label="Dinner bell"]').dispatchEvent('pointerdown');
  await waitState('dinner', 90000);
  await sleep(1200);
  await shot('dinner-candles');
  await tap('candle', 1, 900, 0);
  await tap('candle', 1, 2600, 0);
  await shot('dinner-lit');
  await closeup('faces', 'window.__game.guests[1].headWorld', 520, 300);
  for (let i = 0; i < 5; i++) { await tap('guest', 1, 260, i); await sleep(1900); }
  await shot('served');
  await tap('gobbles');
  await sleep(4500);
  await shot('finale');
  await sleep(4500);
  await shot('photo');
  await page.locator('.again').dispatchEvent('pointerdown');
  await waitState('home', 20000);
  await sleep(2500);
  await shot('again-home');
}
if (script === 'chars') {
  await pick('potato');
  await sleep(2500);
  await closeup('gobbles-idle', 'window.__game.gobbles.headWorld', 360, 360);
}
if (script === 'leave') {
  // leave a job half done, start another, come back
  await pick('potato');
  await sleep(1500);
  await tap('potato', 3, 300);
  await page.locator('.home').dispatchEvent('pointerdown');
  await waitState('home');
  await sleep(1200);
  await pick('cranberry');
  await sleep(1500);
  await tap('opener', 1, 500);
  await page.locator('.home').dispatchEvent('pointerdown');
  await waitState('home');
  await sleep(1200);
  await shot('leave-home');
  await pick('potato');
  await sleep(1500);
  await tap('potato', 5, 300);
  await sleep(2600);
  await tap('masher', 7, 330);
  await sleep(1500);
  await shot('leave-potato-mashed');
  await page.locator('.home').dispatchEvent('pointerdown');
  await waitState('home');
  await sleep(1000);
  await pick('cranberry');
  await sleep(1500);
  await tap('opener', 2, 500);
  await sleep(1500);
  await shot('leave-cran-open');
}
if (script === 'chars') {
  // character check: Gobbles close up while idle, cheering and scared; then guests
  await pick('potato');
  await sleep(2500);
  await closeup('gobbles-idle', 'window.__game.gobbles.headWorld', 360, 360);
  await tap('gobbles');
  await sleep(350);
  await closeup('gobbles-react', 'window.__game.gobbles.headWorld', 360, 360);
  await page.evaluate(() => { const g = window.__game.gobbles; g.setMood('scared'); });
  await sleep(500);
  await closeup('gobbles-scared', 'window.__game.gobbles.headWorld', 360, 360);
  await page.evaluate(() => { const g = window.__game.gobbles; g.setMood('sad'); });
  await sleep(900);
  await closeup('gobbles-sad', 'window.__game.gobbles.headWorld', 360, 360);
}
if (script === 'idle') {
  await pick('cranberry');
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
