// round 110 mage gear: wearable by the mage only, drops at its levels, real upgrades, no page errors
// node tools/playtests/r110/mage/items.cjs   (run from diablo-clone)
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { window.localStorage.clear(); });
  await p.goto('file://' + path.resolve('game/index.html') + '?cine=0'); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => {
    const ids = Object.keys(ITEM_BASES).filter(k => /^mt_/.test(k)), out = { n: ids.length, wear: {}, drops: {}, stats: [], icons: 0, looks: [] };
    for (const cls of ['mage', 'warrior', 'ranger', 'paladin']) { newHero(cls); out.wear[cls] = ids.filter(id => canWear({ base: id })).length; }
    newHero('mage');
    for (const L of [4, 5, 7, 9, 11]) { const R = rng(7 + L); let n = 0, mt = 0; const seen = {}; for (let k = 0; k < 4000; k++) { const it = rollItem(R, L); n++; if (/^mt_/.test(it.base)) { mt++; seen[it.base] = 1; } } out.drops[L] = [(mt / n * 100).toFixed(1) + '%', Object.keys(seen).sort().join(' ')]; }
    for (const id of ids.filter(k => !ITEM_BASES[k].root)) { const B = ITEM_BASES[id]; out.stats.push([id, B.name, B.slot, B.lvl, B.dmg ? B.dmg.join('-') : B.armor]); }
    // vs the old top tier found at the same level
    const cmp = (a, c, L) => itemScore({ base: a, lvl: L, mods: {} }) - itemScore({ base: c, lvl: L, mods: {} });
    out.vs = { 'storm robe vs sunwarden @6': cmp('mt_storm_robe', 'sunwarden_robe', 6), 'star staff vs sunwarden @8': cmp('mt_star_staff', 'sunwarden_staff', 8), 'eclipse staff vs star @10': cmp('mt_eclipse_staff', 'mt_star_staff', 10), 'eclipse robe vs sunwarden_t1 @12': cmp('mt_eclipse_robe', 'sunwarden_robe_t1', 12) };
    for (const id of ids) { itemIcon({ base: id }); out.icons++; itemLines({ base: id, mods: {}, rarity: 'normal' }); }
    for (const set of [['mt_storm_robe', 'mt_storm_hat', 'mt_storm_staff'], ['mt_star_robe', 'mt_star_hat', 'mt_ember_staff'], ['mt_eclipse_robe_t1', 'mt_eclipse_hat_t2', 'mt_root_staff']]) {
      for (const s of SLOTS) hero.equip[s] = null; for (const id of set) hero.equip[ITEM_BASES[id].slot] = { id: itemSerial++, base: id, rarity: 'normal', mods: {}, lvl: ITEM_BASES[id].lvl };
      recalcHero(); out.looks.push([hero.look.helm, hero.look.chest, hero.look.weapon, STAT.armor, STAT.dmg && STAT.dmg.join ? STAT.dmg.join('-') : STAT.dmg]);
      for (const d of [0, 1, 2, 3, 4, 5, 6, 7]) for (const [c, f] of [['idle', 0], ['walk', 3], ['channel', 1], ['channel', 4], ['channel', 7], ['channel', 9], ['storm', 1], ['arrive', 0], ['death', 5], ['drink', 0]]) getSprite('hero', hero.look, d, c, f, hero, 2);
    }
    return out;
  });
  console.log(JSON.stringify(r, null, 1)); console.log(errs.length ? 'PAGE ERRORS:\n' + errs.join('\n') : 'no page errors'); await b.close();
})();
