// round 110: every item base draws its bag icon and a worn sprite; each class's drops are wearable: node allitems.cjs
const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve('game/index.html') + '?cine=0');
  const r = await p.evaluate(() => { const out = { iconFail: [], spriteFail: [], drops: {} };
    for (const id in ITEM_BASES) { const B = ITEM_BASES[id]; if (B.slot === 'potion') continue; try { const s = itemIcon({ base: id }); if (!s || !s.w) out.iconFail.push(id); } catch (e) { out.iconFail.push(id + ': ' + e.message); } }
    for (const cls of ['warrior', 'paladin', 'mage', 'ranger']) {
      newHero(cls); const R = rng(17); let n = 0, bad = 0, newLooks = 0, tried = 0;
      for (let k = 0; k < 3000; k++) { const it = rollItem(R, 4 + (k % 9)); if (!it) continue; n++; if (!canWear(it)) bad++; if (/^(bt_|bs_|pt_|mt_|rt_)/.test(it.base)) newLooks++; }
      for (const id in ITEM_BASES) { const B = ITEM_BASES[id]; if (!/^(bt_|bs_|pt_|mt_|rt_)/.test(id) || !forCls(B) || B.slot === 'potion') continue; tried++;
        try { newHero(cls); const it = rollItem(rng(2), 10, id); it.mods = {}; it.rarity = 'normal'; if (B.slot === 'weapon' && B.twoHand) hero.equip.shield = null; hero.equip[B.slot === 'weapon' && cls === 'warrior' && false ? 'shield' : B.slot] = it; recalcHero(); for (const d of [1, 3, 5, 7]) getSprite('hero', hero.look, d, 'attack', 2, { look: hero.look, cls, combo: 0 }, 2); } catch (e) { out.spriteFail.push(cls + ' ' + id + ': ' + e.message); } }
      out.drops[cls] = `${n} drops (levels 4-12), ${bad} unwearable, ${newLooks} new-tier pieces; ${tried} new bases drawn`;
    }
    return out; });
  console.log(JSON.stringify(r, null, 1)); console.log(errs.slice(0, 3).join('\n') || 'no page errors'); await b.close(); })();
