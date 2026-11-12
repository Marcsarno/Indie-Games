// round 110: the paladin's new pieces: who can wear them, when they drop, and that each is an upgrade at its level.
// node tools/playtests/r110/paladin/items.cjs (run from diablo-clone)
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve('game/index.html') + '?cine=0');
  const res = await p.evaluate(() => {
    const out = [], NEW = Object.keys(ITEM_BASES).filter(k => k.startsWith('pt_'));
    // who can wear them
    const wear = {};
    for (const cls of ['paladin', 'warrior', 'mage', 'ranger']) { newHero(cls); wear[cls] = NEW.filter(k => canWear({ base: k })).length; }
    out.push('canWear (of ' + NEW.length + ' incl. tempered/ancient): ' + JSON.stringify(wear));
    // drops by area level (paladin)
    newHero('paladin'); const R = rng(7);
    for (const L of [4, 5, 6, 7, 8, 9, 10, 11]) {
      const n = {}; let tot = 0;
      for (let i = 0; i < 4000; i++) { const it = rollItem(R, L); tot++; const rt = rootOf(it.base); if (rt.startsWith('pt_')) n[rt.split('_')[1]] = (n[rt.split('_')[1]] || 0) + 1; }
      out.push(`area ${L}: new-look drops per 4000 rolls: ` + JSON.stringify(n));
    }
    // each piece vs the best older paladin base of its slot (and kind), both found at the piece's level, and vs the tier before found at this tier's level
    const score = (base, lvl) => itemScore({ base, lvl, mods: {} });
    const old = Object.keys(ITEM_BASES).filter(k => k.startsWith('pal_') && ITEM_BASES[k].lvl < 99);
    const plain = NEW.filter(k => !/_t\d$/.test(k));
    for (const k of plain) {
      const B = ITEM_BASES[k], L = B.lvl, same = q => ITEM_BASES[q].slot === B.slot && !!ITEM_BASES[q].twoHand === !!B.twoHand && ITEM_BASES[q].lvl <= L;
      const best = old.filter(same).sort((x, y) => score(y, L) - score(x, L))[0];
      const prevT = plain.filter(q => q !== k && same(q) && ITEM_BASES[q].lvl < L).sort((x, y) => ITEM_BASES[y].lvl - ITEM_BASES[x].lvl)[0];
      const s = itemStats({ base: k, lvl: L });
      out.push(`${k} L${L} ${B.slot}${B.twoHand ? ' 2h' : ''} ${s.dmg ? 'dmg ' + s.dmg.join('-') : 'armor ' + s.armor}${s.block ? ' block ' + s.block : ''}: score ${score(k, L).toFixed(1)} vs best old ${best} ${score(best, L).toFixed(1)}` + (prevT ? ` vs ${prevT} found at L${L} ${score(prevT, L).toFixed(1)}` : '') + (score(k, L) > score(best, L) && (!prevT || score(k, L) > score(prevT, L)) ? '  OK' : '  NOT AN UPGRADE'));
    }
    return out;
  });
  console.log(res.join('\n')); console.log(errs.join('\n') || 'no page errors'); await b.close();
})();
