// Round 110 (ranger gear): the new pieces drop for the ranger at their levels, only the ranger can wear them,
// their stats beat the old top tier at their level, and the hero builds every clip with them. node check.cjs
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve(__dirname, '../../../../game/index.html') + '?cine=0');
  console.log(await p.evaluate(() => {
    const out = [], ids = Object.keys(ITEM_BASES).filter(k => /^rt_/.test(k)), plain = ids.filter(k => !/_t\d$/.test(k));
    for (const cls of ['ranger', 'warrior', 'mage', 'paladin']) { newHero(cls); out.push(`${cls}: canWear ${plain.filter(k => canWear({ base: k })).length}/${plain.length}`); }
    newHero('ranger'); const R = rng(7);
    for (const L of [5, 6, 7, 8, 9, 10, 11]) {
      const n = {}, N = 6000; let any = 0;
      for (let i = 0; i < N; i++) { const it = rollItem(R, L); if (/^rt_/.test(it.base)) { any++; n[it.base.replace(/^rt_|_(jerkin|hood|bow|quiver)(_t\d)?$/g, '')] = (n[it.base.replace(/^rt_|_(jerkin|hood|bow|quiver)(_t\d)?$/g, '')] || 0) + 1; } }
      out.push(`area L${L}: ${(any / N * 100).toFixed(1)}% of ranger drops are new pieces ${JSON.stringify(n)}`);
    }
    for (const cls of ['warrior', 'mage', 'paladin']) { newHero(cls); const R2 = rng(3); let bad = 0; for (let i = 0; i < 4000; i++) if (/^rt_/.test(rollItem(R2, 10).base)) bad++; out.push(`${cls} rolls rt_ pieces at L10: ${bad}`); }
    // stats at their own level vs the old top piece found at the same level
    const st = (base, lvl) => itemStats({ base, lvl, mods: {} });
    for (const [mine, old] of [['rt_falconer_bow', 'blackthorn_warden_bow'], ['rt_antler_bow', 'blackthorn_warden_bow'], ['rt_wildheart_bow', 'blackthorn_warden_bow'], ['rt_antler_bow', 'rt_falconer_bow'], ['rt_wildheart_bow', 'rt_antler_bow'],
      ['rt_falconer_jerkin', 'blackthorn_warden_jerkin'], ['rt_antler_jerkin', 'rt_falconer_jerkin'], ['rt_wildheart_jerkin', 'rt_antler_jerkin'], ['rt_falconer_hood', 'night_hood'], ['rt_antler_hood', 'rt_falconer_hood'], ['rt_wildheart_hood', 'rt_antler_hood'],
      ['rt_falconer_quiver', 'deep_quiver'], ['rt_antler_quiver', 'rt_falconer_quiver'], ['rt_wildheart_quiver', 'rt_antler_quiver']]) {
      const L = ITEM_BASES[mine].lvl, a = st(mine, L), o = st(old, L);
      out.push(`L${L} ${mine} ${a.dmg ? a.dmg.join('-') : 'armor ' + a.armor} vs ${old} found at L${L}: ${o.dmg ? o.dmg.join('-') : 'armor ' + o.armor}`);
    }
    // wear a full set: outfit bonus, item lines, every hero clip builds
    newHero('ranger'); for (const id of ['rt_wildheart_jerkin', 'rt_wildheart_hood', 'rt_wildheart_bow', 'rt_wildheart_quiver']) { const it = rollItem(rng(1), 10, id); hero.equip[ITEM_BASES[id].slot] = it; }
    recalcHero(); out.push('wildheart outfit worn: ' + outfitCount('rt_wildheart') + ' pieces; lines: ' + itemLines(hero.equip.weapon).slice(-4).join(' | '));
    buildBudget.ms = Infinity; let n = 0;
    for (const set of ['falconer', 'antler', 'wildheart']) {
      newHero('ranger'); for (const s of ['jerkin', 'hood', 'bow', 'quiver']) { const id = `rt_${set}_${s}`; hero.equip[ITEM_BASES[id].slot] = rollItem(rng(1), 10, id); } recalcHero();
      for (let d = 0; d < 8; d++) for (const [c, F] of [['idle', 1], ['walk', 8], ['shoot', 4], ['volley', 4], ['skyshot', 4], ['vault', 3], ['toss', 2], ['drink', 2], ['death', 6], ['go', 1], ['stop', 1]]) for (let f = 0; f < F; f++) { getSprite('hero', hero.look, d, c, f, { look: hero.look, cls: 'ranger', combo: 0 }, 2); n++; }
      for (const id of Object.keys(ITEM_BASES).filter(k => k.startsWith('rt_' + set))) itemIcon({ base: id });
    }
    out.push('sprites built: ' + n);
    return out.join('\n');
  }));
  console.log('page errors: ' + (errs.length ? errs.join('\n') : 0)); await b.close();
})();
