// round 110: the barbarian's new pieces: they drop for him at their levels, he can wear them and the paladin can't,
// they beat the older pieces found at the same level, and the swing kinds are right. node tools/playtests/r110/barbarian/check.cjs
const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve('game/index.html') + '?cine=0');
  const r = await p.evaluate(() => {
    const out = [], ids = Object.keys(ITEM_BASES).filter(k => /^bt_/.test(k) && !/_t\d$/.test(k));
    allocBuffers(270, 480); G.mode = 'title'; beginGame(false, 'warrior');
    const seen = {}, first = {};
    for (let lv = 1; lv <= 12; lv++) { const R = rng(1000 + lv); for (let n = 0; n < 4000; n++) { const it = rollItem(R, lv); if (/^bt_/.test(it.base)) { seen[it.base] = (seen[it.base] || 0) + 1; if (!first[it.base]) first[it.base] = lv; if (!canWear(it)) out.push('UNWEARABLE ' + it.base); } } }
    for (const id of ids) { const B = ITEM_BASES[id]; out.push(`${id} | ${B.name} | ${B.slot} | L${B.lvl} | ${B.dmg ? 'dmg ' + B.dmg.join('-') : 'armor ' + B.armor}${B.twoHand ? ' | 2H' : ''} | swing ${GEAR_SWING[B.look]} len ${GEAR_LEN[B.look]} | barb canWear ${canWear({ base: id })} | first drop area L${first[id]} | ${seen[id] || 0} in 48k`); }
    // upgrades: each new base vs the best older one, both found at the new base's level
    const at = (id, L) => itemStats({ base: id, lvl: L }), avg = s => s.dmg ? (s.dmg[0] + s.dmg[1]) / 2 : s.armor;
    for (const [id, old] of [['bt_tusk', 'b_warlord'], ['bt_thunder', 'bt_tusk'], ['bt_mammoth', 'bt_thunder'], ['bt_boar', 'b_horns'], ['bt_ram', 'bt_boar'], ['bt_mskull', 'bt_ram'],
      ['bt_tuskaxe', 'winter_bulwark_weapon'], ['bt_club', 'oathkeeper_weapon'], ['bt_flail', 'bt_tuskaxe'], ['bt_cleaver', 'bt_flail'], ['bt_dblaxe', 'ember_forged_weapon'], ['bt_emberaxe', 'bt_dblaxe']]) {
      const L = ITEM_BASES[id].lvl; out.push(`upgrade at L${L}: ${id} ${avg(at(id, L))} vs ${old} ${avg(at(old, L))}`); }
    // melee kinds
    for (const [w, o] of [['bt_tuskaxe', null], ['bt_cleaver', null], ['bt_dblaxe', null], ['bt_emberaxe', null], ['bt_flail', 'bt_club'], ['bt_cleaver', 'bt_flail']]) {
      const mk = id => { const it = rollItem(rng(3), 10, id); it.rarity = 'normal'; it.mods = {}; return it; };
      hero.equip.weapon = mk(w); hero.equip.shield = o ? mk(o) : null; recalcHero(); out.push(`kind ${w}+${o}: ${STAT.meleeKind} hitK ${STAT.hitK} swingK ${STAT.swingK} look.offhand ${hero.look.offhand}`); }
    // the two-hander bags the off hand
    hero.equip.weapon = rollItem(rng(4), 8, 'bt_flail'); hero.equip.shield = rollItem(rng(5), 8, 'bt_club'); hero.bag = []; const two = rollItem(rng(6), 8, 'bt_dblaxe'); hero.bag.push(two); equipItem(two);
    out.push(`2H equip: weapon ${hero.equip.weapon.base}, off ${hero.equip.shield && hero.equip.shield.base}, bag ${hero.bag.map(i => i.base).join(',')}`);
    // paladin
    beginGame(false, 'paladin'); let pal = 0; for (let n = 0; n < 20000; n++) if (/^bt_/.test(rollItem(rng(9 + n), 10).base)) pal++;
    out.push('paladin: canWear ' + ids.map(id => canWear({ base: id }) ? 'Y' : 'n').join('') + ', bt_ drops in 20k: ' + pal);
    for (const id of ids) itemIcon({ base: id });
    return out; });
  console.log(r.join('\n')); console.log(errs.slice(0, 3).join('\n') || 'no page errors'); await b.close(); })();
