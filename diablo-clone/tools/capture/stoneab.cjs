// round 68b blind A/B: the same four scenes (a crypt corridor, a large room, a great hall, the camp)
// from a game dir, optionally with the old stone ramp: node tools/capture/stoneab.cjs <gameDir> <outDir> [old]
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => {
  const [gameDir, outDir, pal] = process.argv.slice(2); fs.mkdirSync(outDir, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage();
  await p.addInitScript((pal) => { window.requestAnimationFrame = () => 0; try { if (pal) localStorage.setItem('dcg-stonepal', pal); else localStorage.removeItem('dcg-stonepal'); } catch (e) {} Math.random = (() => { let s = 21; return () => (s = (s * 16807) % 2147483647) / 2147483647; })(); }, pal || '');
  await p.goto('file://' + path.resolve(gameDir, 'index.html'));
  const shots = await p.evaluate(() => {
    const out = {}, settle = () => { for (let i = 0; i < 400; i++) warmStep(40); G.msg = []; G.qBanner = null; render(); };
    newHero('warrior'); hero.lvl = 6; recalcHero(); hero.hp = STAT.maxHp = 94; G.mode = 'play'; G.story = null; G.gates = null;
    startLevel(3, 4242); G.actCard = 0; LV.act = 1; enemies = [];
    const d = bfs(LV.start.cx, LV.start.cy); let cor = null;
    for (let k = 0; k < MW * MH && !cor; k++) { const i = k % MW, j = (k / MW) | 0; if (LV.map[k] === FLOOR && LV.roomOf[k] < 0 && d[k] > 30 && LV.roomOf[tIdx(i + 3, j)] < 0 && LV.map[tIdx(i + 3, j)] === FLOOR) cor = [i + 0.5, j + 0.5]; }
    hero.fi = cor[0]; hero.fj = cor[1]; updateFov(hero.fi, hero.fj); settle(); out.corridor = cvs.toDataURL();
    const r4 = LV.rooms.find(q => !q.great && q.w >= 10 && q.h >= 10) || LV.rooms[2]; hero.fi = r4.cx + 0.5; hero.fj = r4.cy + 1.5; updateFov(hero.fi, hero.fj); settle(); out.room = cvs.toDataURL();
    const g = LV.rooms.find(q => q.great); hero.fi = g.cx + 0.5; hero.fj = g.cy + 1.5; updateFov(hero.fi, hero.fj); settle(); out.hall = cvs.toDataURL();
    G.story = { f: { met: true }, n: 0 }; startLevel(1, 4242); G.actCard = 0; enemies = []; hero.fi = HUB.camp[0] + 0.5; hero.fj = HUB.camp[1] + 2.5; updateFov(hero.fi, hero.fj); settle(); out.camp = cvs.toDataURL();
    return out;
  });
  for (const k in shots) fs.writeFileSync(path.join(outDir, k + '.png'), Buffer.from(shots[k].split(',')[1], 'base64'));
  console.log(outDir, Object.keys(shots).join(' ')); await b.close();
})();
