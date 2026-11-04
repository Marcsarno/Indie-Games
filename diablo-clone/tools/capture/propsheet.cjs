// prop sprites side by side at 3x on grass: node tools/capture/propsheet.cjs <gameDir> <out.png> 'wagon;altar;PROPS.sacks(0)' (names or calls, ; between)
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => { const [dir, out, list] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + path.resolve(dir, 'index.html'));
  const url = await p.evaluate(list => {
    const names = list.split(';'), Z = 3, sps = names.map(n => n.includes('(') ? eval(n) : BUILD[n] ? BUILD[n]() : OUT[n]()), hero = getSprite('hero', { team: 'red', helm: 'none', chest: 'tunic', weapon: 'sword', shield: 'none' }, 1, 'idle', 0, null, 1);
    const cw = Math.max(...sps.map(s => s.w)) + 40, ch = Math.max(...sps.map(s => s.h)) + 20;
    const c = document.createElement('canvas'); c.width = cw * Z * names.length; c.height = ch * Z; const g = c.getContext('2d'); g.fillStyle = 'rgb(' + [PR[88], PG[88], PB[88]] + ')'; g.fillRect(0, 0, c.width, c.height);
    const draw = (sp, x0, y0) => { for (let k = 0; k < sp.w * sp.h; k++) { const v0 = sp.data[k]; if (!v0) continue; const v = (v0 & 128) ? v0 & 127 : LTAB[4][v0]; g.fillStyle = `rgb(${PR[v]},${PG[v]},${PB[v]})`; g.fillRect((x0 + (k % sp.w) - sp.ax) * Z, (y0 + ((k / sp.w) | 0) - sp.ay) * Z, Z, Z); } };
    sps.forEach((sp, k) => { draw(sp, k * cw + cw / 2 - 8, ch - 12); draw(hero, k * cw + cw - 14, ch - 12); });
    return c.toDataURL(); }, list);
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64')); if (errs.length) console.log(errs.join('\n')); await b.close(); })();
