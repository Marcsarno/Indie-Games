// round 48c: overview of the Hollow (or the Riverlands with arg 'riv') as the screen sees it, north up:
// node hollowmap.cjs <out.png> [hub|riv] [open]   ('open': the fallen tree cleared)
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + path.resolve(__dirname, '../../game/index.html'));
  const url = await p.evaluate(([which, open]) => { newHero('warrior'); G.mode = 'play'; G.story = { f: open ? { met: true, woodTold: true, alphaDead: true, aldoFree: true } : {}, n: 0 }; const t0 = performance.now(); startLevel(which === 'riv' ? 2 : 1, 4242); const ms = performance.now() - t0;
    const c = document.createElement('canvas'), S = 0.25; c.width = Math.ceil(WW * S); c.height = Math.ceil(WH * S); const g = c.getContext('2d');
    const img = g.createImageData(c.width, c.height);
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) { const v = wIdx[Math.floor(y / S) * WW + Math.floor(x / S)] & 127, o = (y * c.width + x) * 4; img.data[o] = PR[v]; img.data[o + 1] = PG[v]; img.data[o + 2] = PB[v]; img.data[o + 3] = 255; }
    g.putImageData(img, 0, 0);
    g.font = 'bold 12px sans-serif'; g.textAlign = 'center';
    const lab = (t, fi, fj, col) => { const [x, y] = iso(fi, fj); g.fillStyle = '#000'; g.fillText(t, x * S + 1, y * S + 1); g.fillStyle = col; g.fillText(t, x * S, y * S); };
    if (which === 'riv') { lab('MINE', RIV.mine[0], RIV.mine[1] + 3, '#ffd34a'); lab('FARM', RIV.farm[0], RIV.farm[1], '#ffd34a'); lab('ROAD ON (shut)', RIV.gate[0] + 2, RIV.gate[1], '#ffd34a'); lab('BACK TO THE HOLLOW', RIV.back[0] - 3, RIV.back[1] - 3, '#7dff8a'); }
    else { for (const cl of HOLLOW.clearings) { const [a, bb] = US(cl.u, cl.s); lab(cl.id.toUpperCase() + ' ' + cl.level + (cl.lvlTo ? '-' + cl.lvlTo : ''), a, bb, cl.id === 'camp' ? '#7dff8a' : '#ffd34a'); } }
    for (const e of enemies) { const [x, y] = iso(e.fi, e.fj); g.fillStyle = '#e03a2a'; g.fillRect(x * S - 1.5, y * S - 1.5, 3, 3); }
    window.__ms = ms; return c.toDataURL(); }, [process.argv[3] || 'hub', process.argv[4] === 'open']);
  fs.writeFileSync(process.argv[2], Buffer.from(url.split(',')[1], 'base64')); console.log('load ms', Math.round(await p.evaluate(() => window.__ms)), errs.slice(0, 2).join('\n')); await b.close(); })();
