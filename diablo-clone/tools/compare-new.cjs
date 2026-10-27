// Before/after for the new game: old prototype-simple sprites vs the new rig sprites, a blind A/B
// sheet (random left/right per character, keys base64-encoded so they aren't read by accident),
// and whole-scene screenshots of both games. Usage: node tools/compare-new.cjs <outdir>
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const OUT = path.resolve(process.argv[2] || path.join(__dirname, '../art-review/new-game'));
const OLD = 'file://' + path.resolve(__dirname, '../prototype-simple/index.html');
const NEW = 'file://' + path.resolve(__dirname, '../game/sheet.html');
// grab sprites as {w,h,data(rgb triples at a given light level)}
const grab = (level) => `(sp, L) => ({ w: sp.w, h: sp.h, px: Array.from(sp.data, v => { if (!v) return null; const i = (v & 128) ? v & 127 : LTAB[L][v]; return [PR[i], PG[i], PB[i]]; }) })`;
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage(); await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto(OLD);
  const old = await p.evaluate(`(() => { const g = ${grab()}; return {
    knight: g(sprKnight({ variant: 'red', atk: -1, moving: false, walk: 0 }, 0), 3),
    skeleton: g(sprSkeleton({ seed: 0 }, 0), 3), hound: g(sprHound({ seed: 2.1 }, 0), 3), spider: g(sprSpider({ seed: 4.2 }, 0), 3) }; })()`);
  await p.goto(NEW);
  const neu = await p.evaluate(`(() => { const g = ${grab()}; const eq = { team: 'red', helm: 'great', chest: 'plate', weapon: 'sword', shield: 'kite' }; return {
    knight: g(getSprite('hero', eq, 1, 'idle', 0), 3),
    skeleton: g(getSprite('skeleton', MONSTERS.skeleton.look, 1, 'idle', 0), 3), hound: g(getSprite('hound', MONSTERS.hound.look, 0, 'idle', 0), 3), spider: g(getSprite('spider', { scale: 1 }, 1, 'idle', 0), 3) }; })()`);
  const names = ['knight', 'skeleton', 'hound', 'spider'];
  const key = {}; names.forEach(n => key[n] = Math.random() < 0.5 ? { A: 'old', B: 'new' } : { A: 'new', B: 'old' });
  const compose = async (pairs, title, labels) => p.evaluate(({ pairs, title, labels }) => {
    const Z = 4, pad = 24, cw = Math.max(...pairs.flatMap(q => [q[1].w, q[2].w])) * Z, ch = Math.max(...pairs.flatMap(q => [q[1].h, q[2].h])) * Z;
    const c = document.createElement('canvas'); c.width = cw * 2 + pad * 3 + 110; c.height = pairs.length * (ch + pad) + 50;
    const g = c.getContext('2d'); g.fillStyle = '#100c09'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#e8d8b8'; g.font = 'bold 22px monospace'; g.fillText(title, 12, 30);
    pairs.forEach(([name, A, B], r) => {
      const y0 = 50 + r * (ch + pad);
      g.fillStyle = '#b09574'; g.font = '18px monospace'; g.fillText(name, 10, y0 + 24);
      [A, B].forEach((s, i) => {
        const ox = 110 + i * (cw + pad), oy = y0;
        g.fillStyle = '#5a4430'; g.fillRect(ox, oy, cw, ch);   // a mid floor tone behind both
        for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) { const v = s.px[y * s.w + x]; if (!v) continue; g.fillStyle = `rgb(${v})`; g.fillRect(ox + (cw - s.w * Z) / 2 + x * Z, oy + (ch - s.h * Z) / 2 + y * Z, Z, Z); }
        g.fillStyle = '#fff'; g.font = 'bold 18px monospace'; g.fillText(labels[i], ox + 6, oy + 20);
      });
    });
    return c.toDataURL();
  }, { pairs, title, labels });
  const save = (f, u) => fs.writeFileSync(path.join(OUT, f), Buffer.from(u.split(',')[1], 'base64'));
  save('sprites-before-after.png', await compose(names.map(n => [n, old[n], neu[n]]), 'Before (prototype-simple) | After (rig-rendered)', ['BEFORE', 'AFTER']));
  save('sprites-blind.png', await compose(names.map(n => [n, key[n].A === 'old' ? old[n] : neu[n], key[n].A === 'old' ? neu[n] : old[n]]), 'Blind: which is better, A or B?', ['A', 'B']));
  fs.writeFileSync(path.join(OUT, 'blind-key.b64.txt'), Buffer.from(JSON.stringify(key)).toString('base64') + '\n');
  // scenes
  const q = await b.newPage({ viewport: { width: 270, height: 480 } }); await q.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await q.goto(OLD); await q.evaluate(() => { for (let i = 0; i < 30; i++) update(1 / 60, i / 60); render(0.5); });
  const oldScene = await q.evaluate(() => document.getElementById('c').toDataURL());
  await q.goto('file://' + path.resolve(__dirname, '../game/index.html'));
  const newScene = await q.evaluate(() => {
    Math.random = (() => { let s = 5; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    newHero(); G.mode = 'play'; startLevel(1, 2024);
    const R = rng(9); for (const bb of ['great_helm', 'plate_mail', 'kite_shield', 'long_sword']) { const it = rollItem(R, 2, bb); hero.bag.push(it); equipItem(it); }
    const r = LV.rooms[1]; hero.fi = r.cx - 1.5; hero.fj = r.cy + 1.5;
    for (const e of enemies) if (LV.roomOf[tIdx(Math.floor(e.fi), Math.floor(e.fj))] === 1) e.state = 'hunt';
    for (let i = 0; i < 70; i++) { update(1 / 60); warmStep(40); }
    input.attack = true; for (let i = 0; i < 14; i++) { update(1 / 60); warmStep(40); } input.attack = false; render();
    return cvs.toDataURL();
  });
  const sc = await p.evaluate(async ([a, bb]) => {
    const load = u => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.src = u; });
    const A = await load(a), B = await load(bb), Z = 2;
    const c = document.createElement('canvas'); c.width = (A.width + B.width) * Z + 30; c.height = Math.max(A.height, B.height) * Z + 40;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.fillStyle = '#222'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#fff'; g.font = 'bold 20px monospace'; g.fillText('BEFORE: prototype-simple', 8, 26); g.fillText('AFTER: game (new build)', A.width * Z + 30, 26);
    g.drawImage(A, 0, 40, A.width * Z, A.height * Z); g.drawImage(B, A.width * Z + 30, 40, B.width * Z, B.height * Z);
    return c.toDataURL();
  }, [oldScene, newScene]);
  save('scene-before-after.png', sc);
  console.log('written to', OUT);
  await b.close();
})();
