const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => {
  const [out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve('game/index.html') + '?cine=0');
  const r = await p.evaluate(() => {
    const log = [], shots = [];
    const step = n => { for (let k = 0; k < n; k++) update(1 / 30); };
    const snap = name => { render(); shots.push([name, cvs.toDataURL()]); };
    const tapR = rr => { const pt = [rr.x + rr.w / 2, rr.y + rr.h / 2]; if (G.mode === 'shop') shopTap(pt); else smithTap(pt); render(); };
    allocBuffers(270, 480); G.mode = 'title'; beginGame(false, 'warrior'); G.story = { f: { met: true, woodTold: true }, n: 0 }; G.actCard = 0;
    hero.lvl = 4; hero.gold = 1500; recalcHero();
    const R = rng(9); for (let k = 0; k < 7; k++) hero.bag.push(rollItem(R, 3));
    // walk up to the merchant: the action button
    const m = npcs.find(n => n.role === 'merchant'); hero.fi = m.fi + 0.8; hero.fj = m.fj + 0.4; step(2); log.push('merchant action: ' + (actionTarget() || {}).label);
    doAction(actionTarget()); log.push('mode ' + G.mode); for (let i = 0; i < 400; i++) warmStep(30);
    snap('1-buy');
    let L = SHOP.L; tapR(L.showIcon); snap('2-showcase-sel');
    tapR(L.save); snap('3-saved'); log.push('saved ' + G.shop.saved);
    L = SHOP.L; tapR(L.wares[1]); snap('4-ware-sel');
    const it1 = G.shop.wares[1], g0 = hero.gold; tapR(SHOP.L.btns[0]); log.push(`bought ware: gold ${g0} -> ${hero.gold}, bag has it ${hero.bag.includes(it1)}`); snap('5-bought');
    tapR(SHOP.L.tabs.sell); tapR(SHOP.L.bag[0]); snap('6-sell');
    // a trip out and back: new wares, the saved showcase stays
    const show0 = G.shop.show, w0 = G.shop.wares[0]; closeShop();
    startLevel(2, 999); startLevel(1, G.town ? G.town.seed : 4242);
    log.push(`after trip: showcase kept ${G.shop.show === show0 || (G.shop.show && G.shop.show.id === show0.id)}, wares new ${G.shop.wares[0] !== w0}`);
    G.shop.saved = false; startLevel(2, 999); startLevel(1, 4242); log.push(`unsaved trip: showcase changed ${G.shop.show.id !== show0.id}`);
    // the blacksmith
    const sm = npcs.find(n => n.role === 'smith'); hero.fi = sm.fi + 0.8; hero.fj = sm.fj + 0.4; G.mode = 'play'; step(15); log.push('smith action: ' + (actionTarget() || {}).label);
    doAction(actionTarget()); for (let i = 0; i < 400; i++) warmStep(30); snap('7-smith');
    if (G.mode !== 'smith') return { log: log.concat(['mode ' + G.mode]), shots };
    tapR(SHOP.L.slots.weapon); snap('8-smith-sel');
    const wpn = hero.equip.weapon, d0 = STAT.dmg.slice();
    for (let k = 0; k < 3; k++) { tapR(SHOP.L.btns[0]); log.push(`up ${wpn.up} gold ${hero.gold} dmg ${STAT.dmg}`); if (k === 0) snap('9-up1'); }
    snap('10-up3');
    // a ring
    const ring = rollItem(R, 3, 'ring'); hero.bag.push(ring); const m0 = JSON.stringify(ring.mods); upgradeItem(ring); log.push(`ring ${m0} -> ${JSON.stringify(ring.mods)} name ${itemName(ring)}`);
    closeShop(); log.push('look ench ' + hero.look.ench + ' from dmg ' + d0);
    return { log, shots };
  });
  for (const [n, u] of r.shots) fs.writeFileSync(`${out}/${n}.png`, Buffer.from(u.split(',')[1], 'base64'));
  console.log(r.log.join('\n')); console.log(errs.length ? errs.join('\n') : 'ok'); await b.close();
})();
