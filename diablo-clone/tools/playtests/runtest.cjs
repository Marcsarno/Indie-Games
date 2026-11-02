const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const dir = process.argv[2];
  const b = await chromium.launch(); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + require('path').resolve(__dirname, '../../game/index.html'));
  await p.evaluate(fs.readFileSync(dir + '/playtest.js', 'utf8')).catch(e => errs.push(String(e)));
  const out = await p.evaluate(() => window.__out).catch(() => null);
  if (out) { console.log(JSON.stringify(out.log)); for (const k in out.shots) fs.writeFileSync(`${dir}/pt-${k}.png`, Buffer.from(out.shots[k].split(',')[1], 'base64')); }
  if (errs.length) console.log('ERR', errs.join('\n'));
  await b.close();
})();
