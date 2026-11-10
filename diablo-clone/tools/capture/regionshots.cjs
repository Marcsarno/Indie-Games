// Screenshots of a region level at named spots, plus the whole map from above (the game's own map view is not used:
// this draws walkable / solid / props as dots). node tools/capture/regionshots.cjs <outDir> [level=6] [seed=4242]
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => {
  const [out, level = '6', seed = '4242'] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + path.resolve(__dirname, '../../game/index.html'));
  const res = await p.evaluate(([level, seed]) => {
    newHero('warrior'); hero.hp = 9999; G.mode = 'play'; startLevel(level, seed); G.actCard = 0; enemies.forEach(e => e.state = 'sleep');
    const D = REGIONS[LV.reg] || REGIONS.ashford, shots = {}, at = (u, s) => [s + u + 0.5, s - u + 0.5];
    const spots = [['town', [LV.start.cx + 0.5, LV.start.cy + 0.5]], ...D.clearings.filter(c => c.id !== 'town').map(c => [c.id, at(c.u, c.s)]), ...D.doors.map(d => ['door-' + d.id, [at(d.u, d.s)[0] + 2, at(d.u, d.s)[1] + 2]])];
    for (const [name, pos] of spots) {
      let [fi, fj] = pos; for (let r = 0; r < 6 && LV.solid[tIdx(Math.floor(fi), Math.floor(fj))]; r++) { fi += 0.7; fj += 0.7; }
      hero.fi = fi; hero.fj = fj; for (let i = 0; i < 300; i++) warmStep(50); for (let k = 0; k < 8; k++) { update(1 / 60); warmStep(30); } G.msg = []; G.talk = null; render(); shots[name] = cvs.toDataURL();
    }
    // reachability from the start
    const seen = new Uint8Array(MW * MH), q = [tIdx(Math.floor(LV.start.cx), Math.floor(LV.start.cy))]; seen[q[0]] = 1;
    while (q.length) { const k = q.pop(), i = k % MW, j = (k / MW) | 0; for (const [a, c] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + a, jj = j + c; if (ii < 0 || jj < 0 || ii >= MW || jj >= MH) continue; const kk = tIdx(ii, jj); if (seen[kk] || LV.solid[kk]) continue; seen[kk] = 1; q.push(kk); } }
    const reach = {}; for (const c of D.clearings) { const [a, b2] = at(c.u, c.s); let ok = false; for (let r = 0; r < 4 && !ok; r++) for (let t = 0; t < 8; t++) { const i = Math.floor(a + Math.cos(t) * r), j = Math.floor(b2 + Math.sin(t) * r); if (seen[tIdx(i, j)]) ok = true; } reach[c.id] = ok; }
    return { shots, reach, enemies: enemies.length, npcs: npcs.map(n => n.name || n.role), stairs: [LV.stairs.i, LV.stairs.j, !!seen[tIdx(LV.stairs.i, LV.stairs.j)]], size: [MW, MH], name: typeof areaName === 'function' ? areaName() : '' };
  }, [+level, +seed]);
  for (const k in res.shots) fs.writeFileSync(path.join(out, k + '.png'), Buffer.from(res.shots[k].split(',')[1], 'base64'));
  delete res.shots; console.log(JSON.stringify(res)); console.log(errs.length ? 'ERR ' + errs.slice(0, 3).join('\n') : 'no page errors'); await b.close();
})();
