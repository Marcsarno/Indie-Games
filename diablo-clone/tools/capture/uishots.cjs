// Screens of the bag, the reward choice and a quest-arrow view: node tools/capture/uishots.cjs <outDir>
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => {
  const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + path.resolve(__dirname, '../../game/index.html'));
  const shots = await p.evaluate(() => {
    const o = {}, snap = n => { render(); o[n] = cvs.toDataURL(); };
    newHero('warrior'); hero.hp = 9999; G.mode = 'play'; startLevel(1, 4242); G.actCard = 0; enemies.forEach(e => e.state = 'sleep'); hero.lvl = 4;
    const R = rng(7); for (let k = 0; k < 9; k++) { const it = rollItem(R, 3 + (k % 3)); if (it) { it.isNew = k < 3; hero.bag.push(it); } }
    for (let i = 0; i < 200; i++) warmStep(50); for (let k = 0; k < 6; k++) { update(1 / 60); warmStep(30); } G.msg = []; G.talk = null;
    snap('arrow'); openInv('inv'); snap('bag'); INV.sel = { item: hero.bag[0], from: 'bag', slot: 0 }; snap('bag-sel'); closeInv();
    if (typeof rewardChoice === 'function') { openTalk([['BROTHER OSRIC', 'TAKE THIS, AND MY THANKS.']], 'COLLECT', () => {}, rewardChoice()); snap('reward'); }
    return o;
  });
  for (const k in shots) fs.writeFileSync(path.join(out, k + '.png'), Buffer.from(shots[k].split(',')[1], 'base64'));
  console.log(errs.length ? 'ERR ' + errs.slice(0, 3).join('\n') : 'ok'); await b.close();
})();
