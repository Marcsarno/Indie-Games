// top-down map of a level with each monster's path over 30 s, coloured by routine (guard grey,
// wander green, patrol gold; followers lighter); the hero waits at the start: node routinemap.cjs <gameDir> <out.png> <level> <seed>
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [dir, out, lv, seed] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + dir + '/index.html');
  const url = await p.evaluate(([lv, seed]) => {
    newHero('warrior'); hero.hp = STAT.maxHp = 99999; G.mode = 'play'; startLevel(lv, seed);
    const Z = 7, c = document.createElement('canvas'); c.width = MW * Z; c.height = MH * Z; const g = c.getContext('2d');
    g.fillStyle = '#120c09'; g.fillRect(0, 0, c.width, c.height);
    for (let j = 0; j < MH; j++) for (let i = 0; i < MW; i++) { const k = tIdx(i, j); if (LV.map[k] === FLOOR && !LV.solid[k]) { g.fillStyle = '#4a3a2c'; g.fillRect(i * Z, j * Z, Z, Z); } }
    const trails = enemies.map(e => [[e.fi, e.fj]]);
    for (let k = 0; k < 1800; k++) { hero.hp = STAT.maxHp; update(1 / 60); if (k % 6 === 0) enemies.forEach((e, n) => trails[n].push([e.fi, e.fj])); }
    enemies.forEach((e, n) => {
      const r = e.routine, kind = r ? r.kind : 'none', lead = r && r.leader === e;
      g.strokeStyle = kind === 'patrol' ? (lead ? '#f0c040' : '#a8883a') : kind === 'wander' ? (lead ? '#60d060' : '#3f8a3f') : '#888'; g.lineWidth = lead ? 2.5 : 1.5;
      g.beginPath(); trails[n].forEach(([x, y], m) => m ? g.lineTo(x * Z, y * Z) : g.moveTo(x * Z, y * Z)); g.stroke();
      const [x, y] = trails[n][trails[n].length - 1]; g.fillStyle = e.state === 'sleep' ? '#d04030' : '#ff80ff'; g.fillRect(x * Z - 3, y * Z - 3, 6, 6);
    });
    g.fillStyle = '#60a0ff'; g.fillRect(hero.fi * Z - 5, hero.fj * Z - 5, 10, 10);
    return c.toDataURL();
  }, [+lv, +seed]);
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64')); if (errs.length) console.log('ERR', errs.join('\n'));
  await b.close();
})();
