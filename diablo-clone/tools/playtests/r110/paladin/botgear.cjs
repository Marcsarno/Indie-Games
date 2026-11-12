// round 110: the run67 bot through Act I as the paladin, then what he wears: node tools/playtests/r110/paladin/botgear.cjs [seed] [capMin]
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => {
  const [seed = 3, cap = 16] = process.argv.slice(2), dir = path.resolve(__dirname, '../../run67');
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + path.resolve('game/index.html'));
  const r = await p.evaluate(`window.__cls='paladin';window.__cap=${+cap};window.__seed=${+seed};(${fs.readFileSync(dir + '/bot.js', 'utf8')})()`).catch(e => ({ err: String(e) }));
  const g = await p.evaluate(() => ({ lvl: hero.lvl, equip: Object.entries(hero.equip).filter(([s, it]) => it).map(([s, it]) => s + ': ' + it.base + ' L' + (it.lvl || '?') + ' ' + it.rarity), bagNew: hero.bag.filter(it => rootOf(it.base).startsWith('pt_')).map(it => it.base + ' L' + it.lvl) }));
  console.log(JSON.stringify({ minutes: r.minutes, lvl: r.lvl, deaths: r.deaths, minHp: r.minHp, end: r.end }), '\n' + JSON.stringify(g, null, 1)); console.log(errs.slice(0, 3).join('\n') || 'no page errors'); await b.close();
})();
