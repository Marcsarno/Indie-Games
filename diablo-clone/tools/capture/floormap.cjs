// floor maps from above: node tools/capture/floormap.cjs <gameDir> <out.json> level:seed[:side] ...
// each tile one cell: floor, wall, pillars and props (solid), the start, the stairs; for before/after of layouts
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => {
  const [gameDir, out, ...specs] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage(); await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + path.resolve(gameDir, 'index.html'));
  const res = await p.evaluate((specs) => specs.map(sp => {
    const [L, S, side] = sp.split(':'); newHero('warrior'); G.mode = 'play'; G.story = null; buildBudget.ms = Infinity; genLevel(+L, +S, side || null);
    const rows = []; for (let j = 0; j < MH; j++) { let r = ''; for (let i = 0; i < MW; i++) { const k = tIdx(i, j), t = LV.map[k]; r += (LV.stairs.i === i && LV.stairs.j === j) ? 'X' : (LV.start.cx === i && LV.start.cy === j) ? 'S' : t === FLOOR ? (LV.solid[k] ? (LV.decor.some(d => d.i === i && d.j === j && d.kind === 'pillar') ? 'p' : 'o') : LV.roomOf[k] >= 0 ? '.' : ',') : t === WALL ? '#' : ' '; } rows.push(r); }
    return { spec: sp, W: MW, H: MH, rows };
  }), specs);
  fs.writeFileSync(out, JSON.stringify(res)); await b.close(); console.log(out, res.length);
})();
