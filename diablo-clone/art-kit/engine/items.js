'use strict';
// Items: stats and visible look are separate. A base names its slot and visual family; affixes
// only change numbers, so many rolled items share one look (handoff: equipment contract).

const ITEM_BASES = {
  short_sword: { slot: 'weapon', look: 'sword', name: 'SHORT SWORD', dmg: [2, 6], cls: 'warrior', lvl: 1 },
  long_sword: { slot: 'weapon', look: 'sword', name: 'LONG SWORD', dmg: [4, 9], cls: 'warrior', lvl: 2 },
  hand_axe: { slot: 'weapon', look: 'axe', name: 'HAND AXE', dmg: [3, 10], cls: 'warrior', lvl: 1, slow: true },
  war_axe: { slot: 'weapon', look: 'axe', name: 'WAR AXE', dmg: [6, 15], cls: 'warrior', lvl: 3, slow: true },
  mace: { slot: 'weapon', look: 'mace', name: 'MACE', dmg: [3, 11], cls: 'warrior', lvl: 1, slow: true },
  cap: { slot: 'helm', look: 'cap', name: 'CAP', armor: 2, cls: 'warrior', lvl: 1 },
  great_helm: { slot: 'helm', look: 'great', name: 'GREAT HELM', armor: 5, cls: 'warrior', lvl: 2 },
  horned_helm: { slot: 'helm', look: 'horned', name: 'HORNED HELM', armor: 4, cls: 'warrior', lvl: 1 },
  tunic: { slot: 'chest', look: 'tunic', name: 'TUNIC', armor: 1, cls: 'warrior', lvl: 1 },
  chain_mail: { slot: 'chest', look: 'chain', name: 'CHAIN MAIL', armor: 6, cls: 'warrior', lvl: 1 },
  plate_mail: { slot: 'chest', look: 'plate', name: 'PLATE MAIL', armor: 11, cls: 'warrior', lvl: 2 },
  buckler: { slot: 'shield', look: 'buckler', name: 'BUCKLER', armor: 3, block: 10, cls: 'warrior', lvl: 1 },
  kite_shield: { slot: 'shield', look: 'kite', name: 'KITE SHIELD', armor: 6, block: 20, cls: 'warrior', lvl: 2 },
  flail: { slot: 'weapon', look: 'flail', name: 'FLAIL', dmg: [5, 13], cls: 'warrior', lvl: 2, slow: true },
  greatsword: { slot: 'weapon', look: 'greatsword', name: 'GREATSWORD', dmg: [8, 18], cls: 'warrior', lvl: 3, slow: true },
  barbute: { slot: 'helm', look: 'barbute', name: 'BARBUTE', armor: 4, cls: 'warrior', lvl: 2 },
  crown_helm: { slot: 'helm', look: 'crown', name: 'CROWNED HELM', armor: 7, cls: 'warrior', lvl: 4 },
  brigandine: { slot: 'chest', look: 'brigandine', name: 'BRIGANDINE', armor: 8, cls: 'warrior', lvl: 2 },
  dark_plate: { slot: 'chest', look: 'darkplate', name: 'DARK PLATE', armor: 15, cls: 'warrior', lvl: 4 },
  round_shield: { slot: 'shield', look: 'round', name: 'ROUND SHIELD', armor: 4, block: 15, cls: 'warrior', lvl: 1 },
  tower_shield: { slot: 'shield', look: 'tower', name: 'TOWER SHIELD', armor: 10, block: 28, cls: 'warrior', lvl: 3 },
  // mage gear (round 18): robes are one design in three colors; staves differ by the orb's color
  oak_staff: { slot: 'weapon', look: 'staff', name: 'OAK STAFF', dmg: [3, 7], cls: 'mage', lvl: 1 },
  ember_staff: { slot: 'weapon', look: 'staff_fire', name: 'EMBER STAFF', dmg: [5, 11], cls: 'mage', lvl: 2 },
  frost_staff: { slot: 'weapon', look: 'staff_ice', name: 'FROST STAFF', dmg: [8, 15], cls: 'mage', lvl: 3 },
  apprentice_robe: { slot: 'chest', look: 'robe_blue', name: 'APPRENTICE ROBE', armor: 2, cls: 'mage', lvl: 1 },
  mystic_robe: { slot: 'chest', look: 'robe_purple', name: 'MYSTIC ROBE', armor: 5, cls: 'mage', lvl: 2 },
  archmage_robe: { slot: 'chest', look: 'robe_red', name: 'ARCHMAGE ROBE', armor: 8, cls: 'mage', lvl: 3 },
  wizard_hat: { slot: 'helm', look: 'hat', name: 'WIZARD HAT', armor: 1, cls: 'mage', lvl: 1 },
  hood: { slot: 'helm', look: 'hood', name: 'DEEP HOOD', armor: 3, cls: 'mage', lvl: 1 },
  // ranger gear (round 33): bows (the off hand), leather jerkins, hoods, and quivers in the shield slot
  hunting_bow: { slot: 'weapon', look: 'bow', name: 'HUNTING BOW', dmg: [2, 6], cls: 'ranger', lvl: 1 },
  long_bow: { slot: 'weapon', look: 'bow_long', name: 'LONGBOW', dmg: [4, 10], cls: 'ranger', lvl: 2 },
  horn_bow: { slot: 'weapon', look: 'bow_horn', name: 'HORN BOW', dmg: [7, 14], cls: 'ranger', lvl: 3 },
  leather_jerkin: { slot: 'chest', look: 'jerkin', name: 'LEATHER JERKIN', armor: 3, cls: 'ranger', lvl: 1 },
  studded_jerkin: { slot: 'chest', look: 'jerkin_stud', name: 'STUDDED JERKIN', armor: 6, cls: 'ranger', lvl: 2 },
  hide_coat: { slot: 'chest', look: 'jerkin_hide', name: 'HIDE COAT', armor: 9, cls: 'ranger', lvl: 3 },
  ranger_hood: { slot: 'helm', look: 'rhood', name: 'RANGER HOOD', armor: 2, cls: 'ranger', lvl: 1 },
  shadow_hood: { slot: 'helm', look: 'rhood_dark', name: 'SHADOW HOOD', armor: 4, cls: 'ranger', lvl: 2 },
  quiver: { slot: 'shield', look: 'quiver', name: 'QUIVER', armor: 1, cls: 'ranger', lvl: 1 },
  war_quiver: { slot: 'shield', look: 'quiver', name: 'WAR QUIVER', armor: 3, cls: 'ranger', lvl: 2 },
  // round 42a: more ordinary bases, so the common drops have range before any more legendaries come.
  // Tiers by area level; most reuse a look (as Diablo did), only their numbers and names differ.
  broadsword: { slot: 'weapon', look: 'sword', name: 'BROADSWORD', dmg: [6, 13], cls: 'warrior', lvl: 3 },
  bastard_sword: { slot: 'weapon', look: 'bsword', name: 'BASTARD SWORD', dmg: [8, 17], cls: 'warrior', lvl: 4 },
  morning_star: { slot: 'weapon', look: 'mstar', name: 'MORNING STAR', dmg: [7, 16], cls: 'warrior', lvl: 3, slow: true },
  battle_axe: { slot: 'weapon', look: 'baxe', name: 'BATTLE AXE', dmg: [10, 21], cls: 'warrior', lvl: 5, slow: true },
  spangenhelm: { slot: 'helm', look: 'spangen', name: 'SPANGENHELM', armor: 6, cls: 'warrior', lvl: 3 },
  bascinet: { slot: 'helm', look: 'bascinet', name: 'BASCINET', armor: 8, cls: 'warrior', lvl: 5 },
  scale_mail: { slot: 'chest', look: 'chain', name: 'SCALE MAIL', armor: 9, cls: 'warrior', lvl: 3 },
  gothic_plate: { slot: 'chest', look: 'gothic', name: 'GOTHIC PLATE', armor: 18, cls: 'warrior', lvl: 5 },
  targe: { slot: 'shield', look: 'targe', name: 'TARGE', armor: 5, block: 17, cls: 'warrior', lvl: 3 },
  heater_shield: { slot: 'shield', look: 'heater', name: 'HEATER SHIELD', armor: 8, block: 22, cls: 'warrior', lvl: 4 },
  battle_staff: { slot: 'weapon', look: 'staff_fire', name: 'BATTLE STAFF', dmg: [10, 18], cls: 'mage', lvl: 4 },
  runed_staff: { slot: 'weapon', look: 'staff_rune', name: 'RUNED STAFF', dmg: [13, 22], cls: 'mage', lvl: 5 },
  silk_robe: { slot: 'chest', look: 'robe_purple', name: 'SILK ROBE', armor: 10, cls: 'mage', lvl: 4 },
  sorcerer_robe: { slot: 'chest', look: 'robe_red', name: "SORCERER'S ROBE", armor: 13, cls: 'mage', lvl: 5 },
  conjurer_hat: { slot: 'helm', look: 'hat', name: "CONJURER'S HAT", armor: 3, cls: 'mage', lvl: 3 },
  sage_hood: { slot: 'helm', look: 'hood_sage', name: "SAGE'S HOOD", armor: 5, cls: 'mage', lvl: 4 },
  ash_bow: { slot: 'weapon', look: 'bow', name: 'ASH BOW', dmg: [3, 8], cls: 'ranger', lvl: 2 },
  recurve_bow: { slot: 'weapon', look: 'bow_horn', name: 'RECURVE BOW', dmg: [9, 17], cls: 'ranger', lvl: 4 },
  war_bow: { slot: 'weapon', look: 'bow_long', name: 'WAR BOW', dmg: [11, 20], cls: 'ranger', lvl: 5 },
  scale_jerkin: { slot: 'chest', look: 'jerkin_stud', name: 'SCALE JERKIN', armor: 11, cls: 'ranger', lvl: 4 },
  drake_hide: { slot: 'chest', look: 'jerkin_drake', name: 'DRAKE HIDE', armor: 14, cls: 'ranger', lvl: 5 },
  hunter_hood: { slot: 'helm', look: 'rhood_hunter', name: "HUNTER'S HOOD", armor: 4, cls: 'ranger', lvl: 3 },
  night_hood: { slot: 'helm', look: 'rhood_night', name: 'NIGHT HOOD', armor: 6, cls: 'ranger', lvl: 4 },
  deep_quiver: { slot: 'shield', look: 'quiver', name: 'DEEP QUIVER', armor: 5, cls: 'ranger', lvl: 4 },
  // rings and amulets: every class, no base stat, always at least magic
  ring: { slot: 'ring', look: 'ring', name: 'RING', cls: 'any', lvl: 1, w: 0.065 },
  amulet: { slot: 'amulet', look: 'amulet', name: 'AMULET', cls: 'any', lvl: 2, w: 0.045 },
  heal: { slot: 'potion', name: 'HEALING POTION', heal: 30, lvl: 1 },
  mana: { slot: 'potion', name: 'MANA POTION', mana: 25, lvl: 1 },   // drunk on pickup
};
const AFFIXES = [
  { pre: 'SHARP', stat: 'dmgPct', roll: [15, 40], slots: ['weapon'] },
  { pre: 'HEAVY', stat: 'dmgFlat', roll: [1, 4], slots: ['weapon'] },
  { pre: 'STURDY', stat: 'armorFlat', roll: [2, 6], slots: ['helm', 'chest', 'shield'] },
  { suf: 'OF LIFE', stat: 'hp', roll: [5, 15], slots: ['helm', 'chest', 'shield', 'weapon', 'ring', 'amulet'] },
  { suf: 'OF MIND', stat: 'mana', roll: [4, 12], slots: ['helm', 'chest', 'weapon', 'ring', 'amulet'] },
  { suf: 'OF LEECH', stat: 'leech', roll: [2, 5], slots: ['weapon', 'ring'] },
  { suf: 'OF SPEED', stat: 'speed', roll: [5, 12], slots: ['chest', 'helm', 'amulet'] },
  // round 16
  { suf: 'OF PRECISION', stat: 'crit', roll: [3, 8], slots: ['weapon', 'helm', 'ring', 'amulet'] },
  { pre: 'THORNED', stat: 'thorns', roll: [10, 25], slots: ['chest', 'shield'] },
  { pre: 'SWIFT', stat: 'atkSpeed', roll: [8, 15], slots: ['weapon', 'ring'] },
  { suf: 'OF RENEWAL', stat: 'regen', roll: [1, 2], slots: ['helm', 'chest', 'amulet'] },
  // round 42a: plain, everyday affixes (the common pool, kept apart from legendary powers)
  { pre: 'BURNING', stat: 'fireDmg', roll: [1, 2], slots: ['weapon', 'ring'] },
  { pre: 'CHILLING', stat: 'chill', roll: [10, 25], slots: ['weapon', 'amulet'] },
  { pre: 'GILDED', stat: 'goldFind', roll: [15, 40], slots: ['helm', 'ring', 'amulet'] },
  { pre: 'LUCKY', stat: 'find', roll: [8, 20], slots: ['ring', 'amulet', 'helm'] },
  { suf: 'OF THE VULTURE', stat: 'hpKill', roll: [1, 3], slots: ['weapon', 'ring'] },
  { suf: 'OF SIPHONING', stat: 'manaKill', roll: [1, 3], slots: ['weapon', 'ring', 'amulet'] },
  { suf: 'OF THE HEALER', stat: 'potion', roll: [15, 35], slots: ['chest', 'amulet'] },
  { suf: 'OF THE WALL', stat: 'dr', roll: [1, 2], slots: ['chest', 'shield', 'amulet'] },
];
// legendaries (round 16): fixed names and powers, an orange beam; bosses always drop one
const LEGENDARIES = [
  { fx: 'ember', base: 'long_sword', name: 'EMBERBRAND', mods: { dmgPct: 60, fireburst: 1 }, lore: "FORGED IN A DRAGON'S THROAT" },
  { fx: 'oak', base: 'crown_helm', name: 'CROWN OF THE OAK KING', mods: { hp: 25, regen: 3 }, lore: 'THE FOREST MENDS YOU' },
  { fx: 'grave', base: 'tower_shield', name: 'GRAVEWARDEN', mods: { armorFlat: 8, thorns: 60 }, lore: 'WHAT STRIKES YOU BLEEDS' },
  { fx: 'storm', base: 'brigandine', name: 'STORMHIDE', mods: { speed: 18, atkSpeed: 25 }, lore: 'LIGHTNING IN YOUR STEP' },
  { fx: 'blood', base: 'greatsword', name: 'BLOODDRINKER', mods: { dmgPct: 40, leech: 12 }, lore: 'IT IS NEVER FULL' },
  { fx: 'cinder', base: 'ember_staff', name: 'STAFF OF CINDERS', cls: 'mage', mods: { dmgPct: 60, fireburst: 1 }, lore: 'EVERY DEATH CATCHES FIRE' },
  { fx: 'magi', base: 'archmage_robe', name: 'MANTLE OF THE MAGI', cls: 'mage', mods: { mana: 40, hp: 20, regen: 2 }, lore: 'WOVEN FROM STARLIGHT' },
  { fx: 'seer', base: 'wizard_hat', name: "SEER'S PEAK", cls: 'mage', mods: { crit: 15, mana: 20 }, lore: 'IT SEES WHERE TO STRIKE' },
  { fx: 'wind', base: 'long_bow', name: 'WINDRUNNER', cls: 'ranger', mods: { atkSpeed: 30, speed: 15 }, lore: 'IT SINGS BEFORE IT STRIKES' },
  { fx: 'fang', base: 'hide_coat', name: 'WOLFHIDE', cls: 'ranger', mods: { hp: 30, crit: 10 }, lore: 'THE PACK REMEMBERS' },
  { fx: 'maul', base: 'war_axe', name: "WARLORD'S MAUL", mods: { dmgPct: 50, crit: 15 }, lore: 'TAKEN FROM THE OGRE' },
];
// sets (round 16): three named pieces each; wearing two gives a bonus, all three a bigger one
const SETS = {
  magus: { name: 'MAGUS', cls: 'mage', pieces: [['wizard_hat', 'MAGUS CAP'], ['mystic_robe', 'MAGUS VESTMENT'], ['oak_staff', 'MAGUS ROD']],
    bonus: [{ mana: 25 }, { dmgPct: 25, crit: 8 }], lines: ['2: +25 MANA', '3: +25% DAMAGE, +8% CRIT'] },
  warden: { name: "WARDEN'S", pieces: [['great_helm', "WARDEN'S VISOR"], ['plate_mail', "WARDEN'S PLATE"], ['kite_shield', "WARDEN'S WALL"]],
    bonus: [{ armorFlat: 10 }, { regen: 2, thorns: 30 }], lines: ['2: +10 ARMOR', '3: +2 LIFE/S, 30% RETURNED'] },
  ranger: { name: "SCOUT'S", pieces: [['cap', "SCOUT'S CAP"], ['brigandine', "SCOUT'S JERKIN"], ['buckler', "SCOUT'S TARGE"]],   // a warrior set (renamed when the ranger class came)
    bonus: [{ speed: 12 }, { atkSpeed: 20, crit: 8 }], lines: ['2: +12% MOVE SPEED', '3: +20% ATTACK SPEED, +8% CRIT'] },
  stalker: { name: "STALKER'S", cls: 'ranger', pieces: [['shadow_hood', "STALKER'S COWL"], ['studded_jerkin', "STALKER'S HIDE"], ['war_quiver', "STALKER'S QUIVER"]],
    bonus: [{ crit: 8 }, { atkSpeed: 25, dmgPct: 20 }], lines: ['2: +8% CRIT', '3: +25% ATTACK SPEED, +20% DAMAGE'] },
};
// the hero's class decides which gear drops (game.js sets hero.cls; warrior when unset)
const heroCls = () => (typeof hero !== 'undefined' && hero.cls) || 'warrior';
const forCls = o => o.cls === 'any' || (o.cls || 'warrior') === heroCls();
const JEWELRY = { ring: 1, amulet: 1 };
// magic find from worn gear (game.js keeps STAT; items.js is also loaded by the art kit without it)
const findK = () => 1 + ((typeof STAT !== 'undefined' && STAT.find) || 0) / 100;
function rollSetItem(R) {
  const k = R.pick(Object.keys(SETS).filter(k => forCls(SETS[k]))), [base, name] = R.pick(SETS[k].pieces);
  return { id: itemSerial++, base, rarity: 'set', set: k, name, mods: { [ITEM_BASES[base].slot === 'weapon' ? 'dmgPct' : 'armorFlat']: R.int(3, 6), hp: R.int(8, 16) } };
}
function rollLegendary(R) {
  const L = R.pick(LEGENDARIES.filter(forCls));
  return { id: itemSerial++, base: L.base, rarity: 'legend', name: L.name, lore: L.lore, fx: L.fx, mods: { ...L.mods } };
}
const RARITY_COL = { normal: 26, magic: 40, rare: 51, legend: 112, set: 55 };
let itemSerial = 1;
function rollItem(R, level, forceBase) {
  const bases = Object.keys(ITEM_BASES).filter(k => ITEM_BASES[k].lvl <= level + 1 && ITEM_BASES[k].slot !== 'potion' && forCls(ITEM_BASES[k]));
  let baseId = forceBase;
  if (!baseId) {   // weighted pick: rings and amulets keep a fixed share (about 6% and 4%) however many other bases a class has
    const nGear = bases.filter(k => !JEWELRY[ITEM_BASES[k].slot]).length, wt = k => JEWELRY[ITEM_BASES[k].slot] ? ITEM_BASES[k].w * nGear : 1;
    const tot = bases.reduce((a, k) => a + wt(k), 0);
    let x = R() * tot; baseId = bases[bases.length - 1];
    for (const k of bases) { x -= wt(k); if (x < 0) { baseId = k; break; } }
  }
  const base = ITEM_BASES[baseId], mf = findK();
  const it = { id: itemSerial++, base: baseId, rarity: 'normal', mods: {} };
  if (base.slot === 'potion') return it;
  if (!forceBase && R() < (0.008 + level * 0.002) * mf) return rollLegendary(R);
  if (!forceBase && R() < 0.015 + level * 0.002) return rollSetItem(R);
  const q = R();
  it.rarity = q < (0.06 + level * 0.01) * mf ? 'rare' : q < 0.34 + (mf - 1) * 0.3 ? 'magic' : 'normal';
  if (it.rarity === 'normal' && JEWELRY[base.slot]) it.rarity = 'magic';   // a plain ring is nothing
  const n = it.rarity === 'rare' ? R.int(2, 3) : it.rarity === 'magic' ? 1 : 0;
  const pool = AFFIXES.filter(a => a.slots.includes(base.slot));
  const used = [];
  for (let k = 0; k < n && pool.length; k++) {
    const a = pool.splice(Math.floor(R() * pool.length), 1)[0];
    it.mods[a.stat] = R.int(a.roll[0], a.roll[1]) + Math.floor(level * 0.6);
    used.push(a);
  }
  if (it.rarity === 'magic' && used[0]) it.prefix = used[0].pre || null, it.suffix = used[0].suf || null;
  if (it.rarity === 'rare') it.title = R.pick(['GRIM', 'DREAD', 'BLOOD', 'GLOOM', 'BONE', 'STORM', 'DOOM', 'ASH']) + ' ' + R.pick(['BITE', 'WARD', 'SHELL', 'CROWN', 'SCAR', 'HOWL', 'MARK']);
  return it;
}
// rough worth of an item in its slot, for the bag's upgrade arrows and the comparison lines
function itemScore(it) {
  const b = ITEM_BASES[it.base], m = it.mods || {};
  const avg = b.dmg ? (b.dmg[0] + b.dmg[1]) / 2 : 0;
  return (avg + (m.dmgFlat || 0)) * (1 + (m.dmgPct || 0) / 100) * (b.slow ? 0.9 : 1) + (b.armor || 0) + (m.armorFlat || 0) + (b.block || 0) * 0.3
    + (m.hp || 0) * 0.25 + (m.mana || 0) * 0.1 + (m.leech || 0) * 0.6 + (m.crit || 0) * 0.5 + (m.atkSpeed || 0) * 0.35 + (m.speed || 0) * 0.3
    + (m.thorns || 0) * 0.1 + (m.regen || 0) * 3 + (m.fireburst ? 8 : 0)
    + (m.fireDmg || 0) * 1.2 + (m.chill || 0) * 0.15 + (m.goldFind || 0) * 0.05 + (m.find || 0) * 0.1 + (m.hpKill || 0) * 1.5 + (m.manaKill || 0) * 0.8
    + (m.potion || 0) * 0.1 + (m.dr || 0) * 2.5;
}
// what changes if `it` replaces `cur`: [text, color] lines, green for gains and red for losses
function compareLines(it, cur) {
  const b = ITEM_BASES[it.base], c = ITEM_BASES[cur.base], m = it.mods || {}, n = cur.mods || {}, out = [];
  const dmg = x => x.dmg ? (x.dmg[0] + x.dmg[1]) / 2 : 0;
  const d = (dmg(b) + (m.dmgFlat || 0)) * (1 + (m.dmgPct || 0) / 100) - (dmg(c) + (n.dmgFlat || 0)) * (1 + (n.dmgPct || 0) / 100);
  if (Math.abs(d) >= 0.5) out.push([`${d > 0 ? '+' : ''}${d.toFixed(1)} AVG DAMAGE`, d > 0 ? 55 : 23]);
  const a = (b.armor || 0) + (m.armorFlat || 0) - (c.armor || 0) - (n.armorFlat || 0);
  if (a) out.push([`${a > 0 ? '+' : ''}${a} ARMOR`, a > 0 ? 55 : 23]);
  const h = (m.hp || 0) - (n.hp || 0);
  if (h) out.push([`${h > 0 ? '+' : ''}${h} LIFE`, h > 0 ? 55 : 23]);
  const s = itemScore(it) - itemScore(cur);
  out.push([s > 0.5 ? 'BETTER THAN WORN' : s < -0.5 ? 'WORSE THAN WORN' : 'ABOUT THE SAME', s > 0.5 ? 55 : s < -0.5 ? 23 : 25]);
  return out;
}
// how many pieces of a set the hero wears now
function setCount(k) { return typeof hero === 'undefined' ? 0 : Object.values(hero.equip).filter(it => it && it.set === k).length; }
function itemName(it) {
  const b = ITEM_BASES[it.base];
  if (it.rarity === 'legend' || it.rarity === 'set') return it.name;
  if (it.rarity === 'rare' && it.title) return it.title;
  return [it.prefix, b.name, it.suffix].filter(Boolean).join(' ');
}
function itemLines(it) {
  const b = ITEM_BASES[it.base], m = it.mods, L = [];
  if (b.slot === 'potion') return [b.mana ? 'RESTORES ' + b.mana + ' MANA' : 'RESTORES ' + b.heal + ' LIFE'];
  if (it.rarity === 'rare' || it.rarity === 'legend' || it.rarity === 'set') L.push(b.name);
  if (b.dmg) L.push(`DAMAGE ${b.dmg[0]}-${b.dmg[1]}${b.slow ? ' (SLOW)' : ''}`);
  if (b.armor) L.push(`ARMOR ${b.armor}`);
  if (b.block) L.push(`BLOCK ${b.block}%`);
  if (m.dmgPct) L.push(`+${m.dmgPct}% DAMAGE`);
  if (m.dmgFlat) L.push(`+${m.dmgFlat} DAMAGE`);
  if (m.armorFlat) L.push(`+${m.armorFlat} ARMOR`);
  if (m.hp) L.push(`+${m.hp} LIFE`);
  if (m.mana) L.push(`+${m.mana} MANA`);
  if (m.leech) L.push(`${m.leech}% LIFE STEAL`);
  if (m.speed) L.push(`+${m.speed}% MOVE SPEED`);
  if (m.crit) L.push(`+${m.crit}% CRITICAL CHANCE`);
  if (m.thorns) L.push(`${m.thorns}% DAMAGE RETURNED`);
  if (m.atkSpeed) L.push(`+${m.atkSpeed}% ATTACK SPEED`);
  if (m.regen) L.push(`+${m.regen} LIFE PER SECOND`);
  if (m.fireburst) L.push('KILLS EXPLODE IN FIRE');
  if (m.fireDmg) L.push(`+${m.fireDmg} FIRE DAMAGE`);
  if (m.chill) L.push(`${m.chill}% CHANCE TO CHILL`);
  if (m.goldFind) L.push(`+${m.goldFind}% GOLD FOUND`);
  if (m.find) L.push(`+${m.find}% BETTER ITEMS`);
  if (m.hpKill) L.push(`+${m.hpKill} LIFE PER KILL`);
  if (m.manaKill) L.push(`+${m.manaKill} MANA PER KILL`);
  if (m.potion) L.push(`POTIONS HEAL ${m.potion}% MORE`);
  if (m.dr) L.push(`-${m.dr} DAMAGE TAKEN PER HIT`);
  if (it.lore) L.push(it.lore);
  if (it.set) { const S = SETS[it.set]; L.push(`${S.name} SET (${setCount(it.set)}/3 WORN)`); L.push(...S.lines); }
  return L;
}

// ---------------------------------------------------------------- icons (rig-drawn, 24x24)
const iconCache = {};
function itemIcon(it) {
  const b = ITEM_BASES[it.base], k = b.look || it.base;
  if (iconCache[k]) return iconCache[k];
  const r = new Rig();
  const team = M.CLOTH_RED;
  if (b.slot === 'weapon') {
    const bd = V.norm([0.5, -0.5, 0.75]), g = V.mad([0, 0, 3], bd, -7);
    const wide = V.norm(V.cross(bd, [0, 0, 1])), wf = [bd, wide, V.cross(bd, wide)];
    r.cone(V.mad(g, bd, -2.5), V.mad(g, bd, 1.2), 0.9, 0.9, M.LEATHER); r.sph(V.mad(g, bd, -3.1), 1.2, M.GOLD);
    if (b.look.startsWith('staff')) {
      const orb = b.look === 'staff_fire' ? M.FIREM : b.look === 'staff_ice' || b.look === 'staff_rune' ? M.ICE : M.ARCANE;
      if (b.look === 'staff_rune') for (const z of [7, 11]) r.cyl(V.mad(g, bd, z), V.mad(g, bd, z + 0.9), 1.4, M.GOLD);
      r.cone(V.mad(g, bd, -1), V.mad(g, bd, 14), 0.9, 1.0, M.WOOD); r.sph(V.mad(g, bd, 16), 2.8, orb, { noShadow: true });
      for (const s of [-1, 1]) r.cone(V.mad(g, bd, 13), V.add(V.mad(g, bd, 16.6), V.mul(wide, s * 2.6)), 0.7, 0.4, M.GOLD);
    } else if (b.look.startsWith('bow')) {   // a bow standing on its end, strung
      const lm = b.look === 'bow_horn' ? M.HORN : M.WOOD, L = b.look === 'bow_long' ? 10 : 8.5;
      r.p.length = 0;   // no grip and pommel for a bow
      r.cone([0, 0, 4], [-2, 0, 4 + L * 0.6], 1.1, 0.9, lm); r.cone([-2, 0, 4 + L * 0.6], [0.6, 0, 4 + L * 1.1], 0.9, 0.5, lm);
      r.cone([0, 0, 4], [-2, 0, 4 - L * 0.6], 1.1, 0.9, lm); r.cone([-2, 0, 4 - L * 0.6], [0.6, 0, 4 - L * 1.1], 0.9, 0.5, lm);
      r.cone([0.6, 0, 4 + L * 1.1], [0.6, 0, 4 - L * 1.1], 0.3, 0.3, M.CLOTH_WHITE, { noShadow: true });
      return (iconCache[k] = renderRig(r, Math.PI / 2, 26, 26, 13, 15));
    } else if (b.look === 'bsword') { r.cone(V.mad(g, bd, -4.4), V.mad(g, bd, -2.6), 0.9, 0.9, M.LEATHER); r.box(V.mad(g, bd, 1.8), [0.7, 4.0, 0.8], M.GOLD, wf); r.box(V.mad(g, bd, 11), [9, 1.3, 0.4], M.BLADE, wf); }
    else if (b.look === 'sword') { r.box(V.mad(g, bd, 1.8), [0.7, 3.4, 0.8], M.GOLD, wf); r.box(V.mad(g, bd, 9.6), [7.4, 1.2, 0.4], M.BLADE, wf); }
    else if (b.look === 'greatsword') { r.box(V.mad(g, bd, 1.8), [0.8, 4.2, 0.9], M.IRON, wf); r.box(V.mad(g, bd, 10.2), [8.4, 1.5, 0.45], M.BLADE, wf); }
    else if (b.look === 'flail') { r.cone(V.mad(g, bd, 1.2), V.mad(g, bd, 7), 0.9, 0.9, M.WOOD); r.sph(V.mad(V.mad(g, bd, 9), [0, 0, -1], 3), 2.6, M.IRON); }
    else {
      r.cone(V.mad(g, bd, 1.2), V.mad(g, bd, 13), 0.9, 0.9, M.WOOD);
      if (b.look === 'axe') r.box(V.add(V.mad(g, bd, 11.5), V.mul(wide, 3)), [2.8, 3.0, 0.5], M.BLADE, wf);
      else if (b.look === 'baxe') for (const s of [-1, 1]) r.box(V.add(V.mad(g, bd, 11.5), V.mul(wide, s * 3)), [3.2, 2.6, 0.5], M.BLADE, wf);
      else if (b.look === 'mstar') { const hb = V.mad(g, bd, 13.5); r.sph(hb, 3.0, M.IRON); for (const d of [bd, wide, V.mul(wide, -1), wf[2], V.mul(wf[2], -1)]) r.cone(V.mad(hb, d, 2.4), V.mad(hb, d, 4.6), 0.8, 0.15, M.STEEL); }
      else r.sph(V.mad(g, bd, 13.5), 3.0, M.IRON);
    }
  } else if (b.slot === 'helm') {
    const hd = [0, 0, 4], fwd = [1, 0, 0], up = [0, 0, 1], sd = [0, 1, 0];
    if (b.look === 'cap') r.ell([0, 0, 3], [5.2, 5.1, 4.0], M.IRON);
    else if (b.look === 'hat') { r.cyl([0, 0, 0], [0, 0, 0.8], 7, M.CLOTH_PURPLE); r.cone([0, 0, 0.5], [-1.2, 0, 6], 4.6, 2.4, M.CLOTH_PURPLE, { mf: p => p[2] < 2 ? M.GOLD : 0 }); r.cone([-1.2, 0, 6], [-4.5, 0, 10.5], 2.4, 0.5, M.CLOTH_PURPLE); }
    else if (b.look.startsWith('rhood')) { const hm = b.look === 'rhood_dark' ? M.CLOTH_SHADOW : b.look === 'rhood_night' ? M.CLOTH_NAVY : M.CLOTH_GREEN; r.ell([0, 0, 4], [5.4, 5.6, 5.8], hm, null, { mf: p => p[0] > 3 && Math.abs(p[1]) < 3 && p[2] < 5 ? M.DARK : 0 }); r.cone([-4, 0, 7], [-8, 0, 4], 2.2, 0.5, hm); r.ell([0, 0, -1.5], [4, 5.4, 1.6], hm); }
    else if (b.look === 'spangen') { r.ell([0, 0, 3], [5.2, 5.1, 4.0], M.STEEL, null, { mf: p => Math.abs(p[1]) < 0.6 || p[2] < 0.6 ? M.GOLD : 0 }); r.cone([0, 0, 5], [0, 0, 9.5], 3, 0.3, M.STEEL); }
    else if (b.look === 'hood_sage') { r.ell([0, 0, 4], [5.4, 5.6, 5.8], M.CLOTH_GREEN, null, { mf: p => p[0] > 3 && Math.abs(p[1]) < 3 && p[2] < 5 ? M.DARK : p[0] > 3 && Math.abs(p[1]) < 4 && p[2] < 6.2 ? M.GOLD : 0 }); r.cone([-4, 0, 6], [-8, 0, 2], 2.2, 0.5, M.CLOTH_GREEN); }
    else if (b.look === 'hood') { r.ell([0, 0, 4], [5.4, 5.6, 5.8], M.CLOTH_BLUE, null, { mf: p => p[0] > 3 && Math.abs(p[1]) < 3 && p[2] < 5 ? M.DARK : 0 }); r.cone([-4, 0, 6], [-8, 0, 2], 2.2, 0.5, M.CLOTH_BLUE); }
    else if (b.look === 'barbute') r.ell(hd, [5.4, 5.3, 6.2], M.STEEL, null, { mf: p => { const q = V.sub(p, hd); return q[0] > 2.4 && ((Math.abs(q[2] - 0.8) < 0.75 && Math.abs(q[1]) < 3.2) || (Math.abs(q[1]) < 0.8 && q[2] < 0.8 && q[2] > -4)) ? M.DARK : 0; } });
    else {
      r.ell(hd, [5.6, 5.4, 6.2], M.STEEL, null, { mf: p => { const q = V.sub(p, hd); if (Math.abs(q[2] - 2.2) < 0.8) return M.GOLD; if (q[0] > 2.6 && Math.abs(q[2] - 0.4) < 0.75 && Math.abs(q[1]) < 4) return M.DARK; return 0; } });
      if (b.look === 'bascinet') r.cone([0, 0, 9], [-1.5, 0, 14], 3.6, 0.4, M.STEEL);
      if (b.look === 'horned') for (const s of [-1, 1]) r.cone(V.add(hd, [0, s * 5, 2.5]), V.add(hd, [0, s * 8.5, 8]), 1.4, 0.4, M.HORN);
      if (b.look === 'crown') { r.cyl(V.add(hd, [0, 0, 3]), V.add(hd, [0, 0, 4.6]), 5.2, M.GOLD); for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283; r.cone(V.add(hd, [Math.cos(a) * 4.8, Math.sin(a) * 4.8, 4.4]), V.add(hd, [Math.cos(a) * 4.8, Math.sin(a) * 4.8, 7]), 0.9, 0.2, M.GOLD); } }
      void fwd; void up; void sd;
    }
  } else if (b.slot === 'chest') {
    const m = b.look === 'jerkin_hide' ? M.HIDE : b.look === 'jerkin_drake' ? M.BLOODY : b.look.startsWith('jerkin') ? M.LEATHER : b.look === 'plate' ? M.PLATE : b.look === 'darkplate' || b.look === 'gothic' ? M.DSTEEL : b.look === 'chain' ? M.CHAIN : b.look.startsWith('robe') ? (TEAM[b.look.slice(5)] || team) : team;
    if (b.look.startsWith('robe')) r.cone([0, 0, 2], [0, 0, -7], 4.4, 6.6, m, { mf: p => p[2] < -5.4 ? M.GOLD : 0 });   // the robe's skirt
    r.ell([0, 0, 3], [4.6, 6.6, 6.4], m, null, b.look.startsWith('robe') ? { mf: p => p[0] > 2 && Math.abs(p[1]) < 0.8 ? M.GOLD : 0 } : undefined);
    for (const s of [-1, 1]) r.ell([0, s * 7, 6.5], [3.6, 3.4, 3], b.look === 'tunic' ? M.LEATHER : b.look.startsWith('jerkin') ? M.CLOTH_GREEN : m);
  } else if (b.slot === 'shield' && b.look === 'quiver') {   // a leather quiver with three fletchings
    r.cone([0, 0, -4], [0, 0, 7], 2.2, 2.6, M.LEATHER, { mf: p => p[2] > 5.6 || Math.abs(p[2] - 0.5) < 0.6 ? M.DARK : 0 });
    for (const [y, m] of [[-1.1, M.CLOTH_WHITE], [0, M.CLOTH_RED], [1.1, M.CLOTH_WHITE]]) r.cone([0, y, 7], [0, y * 1.3, 11], 0.9, 0.4, m, { noShadow: true });
  } else if (b.slot === 'shield') {
    if (b.look === 'tower') { r.box([0, 0, 4], [0.8, 4.4, 7.4], team, null, { mf: p => Math.abs(p[1]) > 3.5 || Math.abs(p[2] - 4) > 6.5 ? M.IRON : Math.abs(p[1]) < 0.8 ? M.GOLD : 0 }); return (iconCache[k] = renderRig(r, Math.PI / 4, 26, 26, 13, 17)); }
    if (b.look === 'targe') { r.ell([0, 0, 4], [1, 5, 5], M.LEATHER, null, { mf: p => { const d2 = (p[1] ** 2 + (p[2] - 4) ** 2) / 25; return d2 > 0.78 ? M.IRON : Math.abs(d2 - 0.42) < 0.08 && Math.abs(Math.sin(Math.atan2(p[2] - 4, p[1]) * 4)) > 0.7 ? M.GOLD : 0; } }); r.cone([0.8, 0, 4], [3.4, 0, 4], 1.3, 0.2, M.STEEL); return (iconCache[k] = renderRig(r, Math.PI / 4, 26, 26, 13, 17)); }
    if (b.look === 'heater') { r.ell([0, 0, 4], [1, 4.8, 6.4], team, null, { mf: p => { const u = p[1] / 4.8, v = (p[2] - 4) / 6.4; return v > 0.62 ? M.IRON : u * u + v * v > 0.66 ? M.GOLD : Math.abs(v + Math.abs(u) * 1.1 - 0.15) < 0.13 ? M.GOLD : 0; } }); return (iconCache[k] = renderRig(r, Math.PI / 4, 26, 26, 13, 17)); }
    if (b.look === 'round') { r.ell([0, 0, 4], [1, 5, 5], M.WOOD, null, { mf: p => { const d2 = (p[1] ** 2 + (p[2] - 4) ** 2) / 25; return d2 > 0.74 || d2 < 0.06 ? M.IRON : 0; } }); return (iconCache[k] = renderRig(r, Math.PI / 4, 26, 26, 13, 17)); }
    const big = b.look === 'kite', rad = big ? [1, 5, 7] : [1, 4.4, 4.4], ax = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    r.ell([0, 0, 4], rad, team, ax, { mf: p => { const u = p[1] / rad[1], v = (p[2] - 4) / rad[2]; return u * u + v * v > 0.62 ? M.GOLD : (big && (Math.abs(u) < 0.14 || Math.abs(v - 0.15) < 0.11)) ? M.GOLD : 0; } });
  } else if (b.slot === 'ring') {   // round 42a: a gold band facing you, tipped back a little, a blue stone in a setting on top
    const c = [0, 0, 5], u = [0, 1, 0], v = V.norm([-0.35, 0, 0.94]);
    for (let k = 0; k < 20; k++) { const a = k / 20 * 6.283; r.sph(V.add(c, V.add(V.mul(u, Math.cos(a) * 4.6), V.mul(v, Math.sin(a) * 4.6))), 1.2, M.GOLD); }
    const top = V.mad(c, v, 5.4);
    r.cone(top, V.mad(top, v, 1.4), 1.5, 2.3, M.GOLD); r.sph(V.mad(top, v, 2.2), 2.1, M.ICE);
    return (iconCache[k] = renderRig(r, Math.PI / 4, 26, 26, 13, 21));
  } else if (b.slot === 'amulet') {   // a chain hanging in a V to a round gold pendant with a red stone
    for (let k = 0; k <= 12; k++) { const t = k / 12, y = (t - 0.5) * 11, z = 7 + Math.abs(t - 0.5) * 2 * 7; r.sph([-0.5, y, z], 0.95, M.GOLD); }
    r.ell([0, 0, 3.0], [1.0, 4.4, 4.4], M.GOLD); r.sph([0.9, 0, 3.0], 2.5, M.CLOTH_RED);
    return (iconCache[k] = renderRig(r, Math.PI / 4, 26, 26, 13, 21));
  } else {   // potion
    const liquid = b.mana ? M.CLOTH_BLUE : M.CLOTH_RED;
    r.cyl([0, 0, -1], [0, 0, 6], 3.4, liquid); r.sph([0, 0, 6], 3.6, liquid);
    r.cyl([0, 0, 9], [0, 0, 11.5], 1.3, M.BONE); r.cyl([0, 0, 11.5], [0, 0, 12.5], 1.6, M.WOOD);
  }
  return (iconCache[k] = renderRig(r, b.slot === 'shield' ? Math.PI / 4 : b.slot === 'helm' || b.slot === 'chest' ? Math.PI / 4 : 0, 26, 26, 13, 17));
}
