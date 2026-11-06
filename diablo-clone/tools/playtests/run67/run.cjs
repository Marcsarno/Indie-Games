// node tools/playtests/run67/run.cjs <warrior|mage|ranger> [capMinutes] [seed] [gameDir]
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => {
  const [cls = 'warrior', cap = 50, seed = 31, game = path.resolve(__dirname, '../../../game')] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + path.join(path.resolve(game), 'index.html'));
  const t0 = Date.now();
  const r = await p.evaluate(`window.__cls='${cls}';window.__cap=${+cap};window.__seed=${+seed};(${fs.readFileSync(__dirname + '/bot.js', 'utf8')})()`).catch(e => ({ err: String(e) }));
  console.log(JSON.stringify(r)); console.log('wall', ((Date.now() - t0) / 1000).toFixed(0) + 's'); if (errs.length) console.log('ERR', errs.slice(0, 3).join('\n'));
  await b.close();
})();
