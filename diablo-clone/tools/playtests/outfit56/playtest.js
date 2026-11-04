// round 56: outfit bonuses grow with matching pieces worn, and the item text says so
const L = [], shots = {}; let serial = 1e6; const mk = base => ({ id: serial++, base, rarity: 'normal', name: base, mods: {} });
newHero('warrior'); G.mode = 'play'; startLevel(1, 4242); G.actCard = 0;
const snap = () => ({ hp: STAT.maxHp, armor: STAT.armor, dmg: STAT.dmg.join('-'), crit: STAT.crit });
const base = (recalcHero(), snap());
hero.equip.chest = mk('gatewatch_mail'); recalcHero(); const one = snap();
hero.equip.helm = mk('gatewatch_helm'); recalcHero(); const two = snap();
hero.equip.weapon = mk('gatewatch_weapon'); recalcHero(); const three = snap();
hero.equip.shield = mk('gatewatch_shield'); recalcHero(); const four = snap();
L.push({ gatewatch: { base, one, two, three, four }, lines: itemLines(hero.equip.helm) });
newHero('mage'); hero.equip.chest = mk('rose_oracle_robe'); hero.equip.helm = mk('rose_oracle_hat'); hero.equip.weapon = mk('rose_oracle_staff'); recalcHero(); L.push({ crimson: { crit: STAT.crit, leech: STAT.leech }, lines: itemLines(hero.equip.chest) });
// the bag card with the outfit lines
newHero('warrior'); hero.equip.chest = mk('gatewatch_mail'); hero.equip.helm = mk('gatewatch_helm'); hero.bag = [mk('gatewatch_weapon')]; recalcHero(); openInv('inv'); INV.sel = { item: hero.bag[0], from: 'bag' }; render(); shots.card = cvs.toDataURL(); closeInv();
window.__out = { log: L, shots };
