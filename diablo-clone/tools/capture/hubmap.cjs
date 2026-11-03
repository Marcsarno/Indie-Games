// overview of the hub as the screen sees it (north up): node hubmap.cjs <out.png>
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await b.newPage();
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + path.resolve(__dirname, '../../game/index.html'));
  const url = await p.evaluate(() => { newHero('warrior'); G.mode = 'play'; startLevel(1, 4242);
    const c = document.createElement('canvas'), S = 0.25; c.width = Math.ceil(WW * S); c.height = Math.ceil(WH * S); const g = c.getContext('2d');
    // the baked world (props and floor) at a quarter size: each output pixel samples the world bake
    const img = g.createImageData(c.width, c.height);
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) { const v = wIdx[Math.floor(y / S) * WW + Math.floor(x / S)] & 127, o = (y * c.width + x) * 4; img.data[o] = PR[v]; img.data[o + 1] = PG[v]; img.data[o + 2] = PB[v]; img.data[o + 3] = 255; }
    g.putImageData(img, 0, 0);
    g.font = 'bold 13px sans-serif'; g.textAlign = 'center';
    const lab = (t, fi, fj, col) => { const [x, y] = iso(fi, fj); g.fillStyle = '#000'; g.fillText(t, x * S + 1, y * S + 1); g.fillStyle = col; g.fillText(t, x * S, y * S); };
    lab('N', 0, 0, '#fff'); lab('MINE (diggers)', HUB.mine[0], HUB.mine[1] + 4, '#ffd34a'); lab('FARM (bandits)', HUB.farm[0], HUB.farm[1] + 2, '#ffd34a'); lab('WOODS (wolves)', HUB.woods[0], HUB.woods[1], '#ffd34a');
    lab('WOLF DEN', HUB.den[0] + 2, HUB.den[1] + 2, '#ffd34a'); lab('GATE (closed)', HUB.gate[0] + 2, HUB.gate[1] + 2, '#ffd34a'); lab('CAMP', HUB.camp[0] + 2, HUB.camp[1] + 3, '#7dff8a'); lab('CATHEDRAL', 29, 33, '#fff');
    for (const e of enemies) { const [x, y] = iso(e.fi, e.fj); g.fillStyle = '#e03a2a'; g.fillRect(x * S - 1.5, y * S - 1.5, 3, 3); }
    return c.toDataURL(); });
  fs.writeFileSync(process.argv[2], Buffer.from(url.split(',')[1], 'base64')); await b.close(); })();
