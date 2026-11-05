const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + path.resolve('game/index.html'));
  const out = await p.evaluate(() => { const o = {};
    o.count = Object.keys(ITEM_BASES).filter(k => ITEM_BASES[k].root).length;
    o.samples = ['gatewatch_mail', 'gatewatch_weapon', 'gatewatch_shield', 'tidekeeper_staff', 'marsh_runner_bow'].map(k => [k, k + '_t1', k + '_t2'].map(q => { const b = ITEM_BASES[q]; return b ? `${b.name} L${b.lvl} ${b.dmg ? b.dmg.join('-') : ''}${b.armor ? ' A' + b.armor : ''}${b.block ? ' B' + b.block : ''}` : q + '?'; }).join(' | '));
    newHero('warrior'); hero.equip.chest = { base: 'gatewatch_mail_t2', mods: {} }; hero.equip.helm = { base: 'gatewatch_helm_t1', mods: {} }; o.outfit = outfitCount('gatewatch'); o.of = outfitsOf('gatewatch_mail_t2');
    const R = rng(5); o.share = {};
    for (const cls of ['warrior', 'mage', 'ranger']) { newHero(cls); for (const d of [3, 8, 14]) { const c = { plain: 0, t1: 0, t2: 0, setPieces: 0, n: 0 }; for (let i = 0; i < 3000; i++) { const it = rollItem(R, d); const b = ITEM_BASES[it.base]; if (b.slot === 'ring' || b.slot === 'amulet') continue; c.n++; if (b.tier === 1) c.t1++; else if (b.tier === 2) c.t2++; else if (b.icon) c.plain++; } o.share[cls + d] = `tier0 ${(100 * c.plain / c.n).toFixed(0)}% t1 ${(100 * c.t1 / c.n).toFixed(0)}% t2 ${(100 * c.t2 / c.n).toFixed(0)}%`; } }
    return o; });
  console.log(JSON.stringify(out, null, 1), errs); await b.close(); })();
