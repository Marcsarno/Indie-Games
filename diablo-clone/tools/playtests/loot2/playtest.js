// round 42a: the filled-out ordinary loot table. Rarity shares per area level, the spread of bases
// each class sees, rings and amulets always magic+, and each new stat doing its job in play.
Math.random = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const log = [], shots = {};
const run = n => { for (let k = 0; k < n; k++) update(1 / 60); };
for (const cls of ['warrior', 'mage', 'ranger']) {
  newHero(cls); recalcHero();
  for (const lvl of [1, 3, 5]) {
    const R = rng(1000 + lvl), N = 6000, rar = {}, bases = {}, slots = {}; let plainJewel = 0;
    for (let k = 0; k < N; k++) { const it = rollItem(R, lvl); rar[it.rarity] = (rar[it.rarity] || 0) + 1; bases[it.base] = 1; const sl = ITEM_BASES[it.base].slot; slots[sl] = (slots[sl] || 0) + 1; if (JEWELRY[sl] && it.rarity === 'normal') plainJewel++; }
    for (const k in rar) rar[k] = +(rar[k] / N * 100).toFixed(1);
    for (const k in slots) slots[k] = +(slots[k] / N * 100).toFixed(1);
    log.push({ cls, lvl, rarityPct: rar, differentBases: Object.keys(bases).length, slotPct: slots, plainJewelry: plainJewel });
  }
}
// every affix shows a line and has a score
const missing = AFFIXES.filter(a => { const it = { base: a.slots[0] === 'ring' ? 'ring' : 'short_sword', rarity: 'magic', mods: { [a.stat]: 3 } }; return itemLines(it).length < (ITEM_BASES[it.base].dmg ? 2 : 1) || !(itemScore(it) > itemScore({ base: it.base, mods: {} })); });
log.push({ affixes: AFFIXES.length, withoutLineOrScore: missing.map(a => a.stat) });
// the new stats in play
newHero('warrior'); G.mode = 'play'; startLevel(3, 777); for (const e of enemies) { e.state = 'sleep'; e.fi = 1; e.fj = 1; }
const wear = (base, mods) => { const it = { id: itemSerial++, base, rarity: 'magic', mods }; hero.bag.push(it); equipItem(it); return it; };
wear('ring', { fireDmg: 4, hpKill: 3, goldFind: 50 }); wear('amulet', { chill: 100, potion: 50, dr: 2, manaKill: 2 });
const out = { fireDmg: STAT.fireDmg, slots: Object.keys(hero.equip).filter(k => hero.equip[k]).join(',') };
{ const a = [], b = []; for (let k = 0; k < 400; k++) a.push(heroDmg()); STAT.fireDmg = 0; for (let k = 0; k < 400; k++) b.push(heroDmg()); recalcHero(); out.avgHitWith = +(a.reduce((x, y) => x + y) / 400).toFixed(1); out.avgHitWithout = +(b.reduce((x, y) => x + y) / 400).toFixed(1); }
{ const e = makeEnemy('skeleton', hero.fi + 3, hero.fj, 90); enemies.push(e); e.slowT = 0; e.hp = e.maxHp = 999; damageEnemy(e, 1, hero.fi, hero.fj); out.chilled = e.slowT > 0; }
{ hero.hp = 10; const e = makeEnemy('fallen', hero.fi + 3, hero.fj, 91); enemies.push(e); damageEnemy(e, 9999, hero.fi, hero.fj); out.lifeAfterKill = Math.round(hero.hp); }
{ hero.hp = 1; hero.potions = 1; hero.drinkT = 0; drinkPotion(); out.potionHeal = Math.round(hero.hp - 1); out.potionPlain = 30 + hero.lvl * 3; }
{ hero.hp = 500; STAT.maxHp = 500; STAT.block = 0; STAT.armor = 0; hurtHero(10, null); out.hit10took = 500 - hero.hp; }
{ const g0 = hero.gold; pickup({ gold: 100, fi: hero.fi, fj: hero.fj }); out.gold100gave = hero.gold - g0; }
log.push(out);
// a full bag and the new slots on the inventory screen
recalcHero(); for (const b of ['ring', 'amulet', 'broadsword', 'heater_shield', 'gothic_plate', 'bascinet']) { const it = rollItem(rng(b.length * 7), 5, b); hero.bag.push(it); }
hero.hp = STAT.maxHp; G.mode = 'inv'; INV.sel = { item: hero.bag[0], from: 'bag' }; render(); shots.inv = cvs.toDataURL();
window.__out = { log, shots };
