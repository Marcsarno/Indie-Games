'use strict';
// Items: stats and visible look are separate. A base names its slot and visual family; affixes
// only change numbers, so many rolled items share one look (handoff: equipment contract).

const ITEM_BASES = {
  short_sword: { slot: 'weapon', look: 'sword', name: 'SHORT SWORD', dmg: [2, 6], lvl: 1 },
  long_sword: { slot: 'weapon', look: 'sword', name: 'LONG SWORD', dmg: [4, 9], lvl: 2 },
  hand_axe: { slot: 'weapon', look: 'axe', name: 'HAND AXE', dmg: [3, 10], lvl: 1, slow: true },
  war_axe: { slot: 'weapon', look: 'axe', name: 'WAR AXE', dmg: [6, 15], lvl: 3, slow: true },
  mace: { slot: 'weapon', look: 'mace', name: 'MACE', dmg: [3, 11], lvl: 1, slow: true },
  cap: { slot: 'helm', look: 'cap', name: 'CAP', armor: 2, lvl: 1 },
  great_helm: { slot: 'helm', look: 'great', name: 'GREAT HELM', armor: 5, lvl: 2 },
  horned_helm: { slot: 'helm', look: 'horned', name: 'HORNED HELM', armor: 4, lvl: 1 },
  tunic: { slot: 'chest', look: 'tunic', name: 'TUNIC', armor: 1, lvl: 1 },
  chain_mail: { slot: 'chest', look: 'chain', name: 'CHAIN MAIL', armor: 6, lvl: 1 },
  plate_mail: { slot: 'chest', look: 'plate', name: 'PLATE MAIL', armor: 11, lvl: 2 },
  buckler: { slot: 'shield', look: 'buckler', name: 'BUCKLER', armor: 3, block: 10, lvl: 1 },
  kite_shield: { slot: 'shield', look: 'kite', name: 'KITE SHIELD', armor: 6, block: 20, lvl: 2 },
  flail: { slot: 'weapon', look: 'flail', name: 'FLAIL', dmg: [5, 13], lvl: 2, slow: true },
  greatsword: { slot: 'weapon', look: 'greatsword', name: 'GREATSWORD', dmg: [8, 18], lvl: 3, slow: true },
  barbute: { slot: 'helm', look: 'barbute', name: 'BARBUTE', armor: 4, lvl: 2 },
  crown_helm: { slot: 'helm', look: 'crown', name: 'CROWNED HELM', armor: 7, lvl: 4 },
  brigandine: { slot: 'chest', look: 'brigandine', name: 'BRIGANDINE', armor: 8, lvl: 2 },
  dark_plate: { slot: 'chest', look: 'darkplate', name: 'DARK PLATE', armor: 15, lvl: 4 },
  round_shield: { slot: 'shield', look: 'round', name: 'ROUND SHIELD', armor: 4, block: 15, lvl: 1 },
  tower_shield: { slot: 'shield', look: 'tower', name: 'TOWER SHIELD', armor: 10, block: 28, lvl: 3 },
  heal: { slot: 'potion', name: 'HEALING POTION', heal: 30, lvl: 1 },
};
const AFFIXES = [
  { pre: 'SHARP', stat: 'dmgPct', roll: [15, 40], slots: ['weapon'] },
  { pre: 'HEAVY', stat: 'dmgFlat', roll: [1, 4], slots: ['weapon'] },
  { pre: 'STURDY', stat: 'armorFlat', roll: [2, 6], slots: ['helm', 'chest', 'shield'] },
  { suf: 'OF LIFE', stat: 'hp', roll: [5, 15], slots: ['helm', 'chest', 'shield', 'weapon'] },
  { suf: 'OF MIND', stat: 'mana', roll: [4, 12], slots: ['helm', 'chest', 'weapon'] },
  { suf: 'OF LEECH', stat: 'leech', roll: [2, 5], slots: ['weapon'] },
  { suf: 'OF SPEED', stat: 'speed', roll: [5, 12], slots: ['chest', 'helm'] },
  // round 16
  { suf: 'OF PRECISION', stat: 'crit', roll: [3, 8], slots: ['weapon', 'helm'] },
  { pre: 'THORNED', stat: 'thorns', roll: [10, 25], slots: ['chest', 'shield'] },
  { pre: 'SWIFT', stat: 'atkSpeed', roll: [8, 15], slots: ['weapon'] },
  { suf: 'OF RENEWAL', stat: 'regen', roll: [1, 2], slots: ['helm', 'chest'] },
];
// legendaries (round 16): fixed names and powers, an orange beam; bosses always drop one
const LEGENDARIES = [
  { fx: 'ember', base: 'long_sword', name: 'EMBERBRAND', mods: { dmgPct: 60, fireburst: 1 }, lore: "FORGED IN A DRAGON'S THROAT" },
  { fx: 'oak', base: 'crown_helm', name: 'CROWN OF THE OAK KING', mods: { hp: 25, regen: 3 }, lore: 'THE FOREST MENDS YOU' },
  { fx: 'grave', base: 'tower_shield', name: 'GRAVEWARDEN', mods: { armorFlat: 8, thorns: 60 }, lore: 'WHAT STRIKES YOU BLEEDS' },
  { fx: 'storm', base: 'brigandine', name: 'STORMHIDE', mods: { speed: 18, atkSpeed: 25 }, lore: 'LIGHTNING IN YOUR STEP' },
  { fx: 'blood', base: 'greatsword', name: 'BLOODDRINKER', mods: { dmgPct: 40, leech: 12 }, lore: 'IT IS NEVER FULL' },
  { fx: 'maul', base: 'war_axe', name: "WARLORD'S MAUL", mods: { dmgPct: 50, crit: 15 }, lore: 'TAKEN FROM THE OGRE' },
];
function rollLegendary(R) {
  const L = R.pick(LEGENDARIES);
  return { id: itemSerial++, base: L.base, rarity: 'legend', name: L.name, lore: L.lore, fx: L.fx, mods: { ...L.mods } };
}
const RARITY_COL = { normal: 26, magic: 40, rare: 51, legend: 112 };
let itemSerial = 1;
function rollItem(R, level, forceBase) {
  const bases = Object.keys(ITEM_BASES).filter(k => ITEM_BASES[k].lvl <= level + 1 && ITEM_BASES[k].slot !== 'potion');
  const baseId = forceBase || R.pick(bases), base = ITEM_BASES[baseId];
  const it = { id: itemSerial++, base: baseId, rarity: 'normal', mods: {} };
  if (base.slot === 'potion') return it;
  if (!forceBase && R() < 0.008 + level * 0.002) return rollLegendary(R);
  const q = R();
  it.rarity = q < 0.06 + level * 0.01 ? 'rare' : q < 0.34 ? 'magic' : 'normal';
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
    + (m.thorns || 0) * 0.1 + (m.regen || 0) * 3 + (m.fireburst ? 8 : 0);
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
function itemName(it) {
  const b = ITEM_BASES[it.base];
  if (it.rarity === 'legend') return it.name;
  if (it.rarity === 'rare' && it.title) return it.title;
  return [it.prefix, b.name, it.suffix].filter(Boolean).join(' ');
}
function itemLines(it) {
  const b = ITEM_BASES[it.base], m = it.mods, L = [];
  if (b.slot === 'potion') return ['RESTORES ' + b.heal + ' LIFE'];
  if (it.rarity === 'rare' || it.rarity === 'legend') L.push(b.name);
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
  if (it.lore) L.push(it.lore);
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
    if (b.look === 'sword') { r.box(V.mad(g, bd, 1.8), [0.7, 3.4, 0.8], M.GOLD, wf); r.box(V.mad(g, bd, 9.6), [7.4, 1.2, 0.4], M.BLADE, wf); }
    else if (b.look === 'greatsword') { r.box(V.mad(g, bd, 1.8), [0.8, 4.2, 0.9], M.IRON, wf); r.box(V.mad(g, bd, 10.2), [8.4, 1.5, 0.45], M.BLADE, wf); }
    else if (b.look === 'flail') { r.cone(V.mad(g, bd, 1.2), V.mad(g, bd, 7), 0.9, 0.9, M.WOOD); r.sph(V.mad(V.mad(g, bd, 9), [0, 0, -1], 3), 2.6, M.IRON); }
    else {
      r.cone(V.mad(g, bd, 1.2), V.mad(g, bd, 13), 0.9, 0.9, M.WOOD);
      if (b.look === 'axe') r.box(V.add(V.mad(g, bd, 11.5), V.mul(wide, 3)), [2.8, 3.0, 0.5], M.BLADE, wf);
      else r.sph(V.mad(g, bd, 13.5), 3.0, M.IRON);
    }
  } else if (b.slot === 'helm') {
    const hd = [0, 0, 4], fwd = [1, 0, 0], up = [0, 0, 1], sd = [0, 1, 0];
    if (b.look === 'cap') r.ell([0, 0, 3], [5.2, 5.1, 4.0], M.IRON);
    else if (b.look === 'barbute') r.ell(hd, [5.4, 5.3, 6.2], M.STEEL, null, { mf: p => { const q = V.sub(p, hd); return q[0] > 2.4 && ((Math.abs(q[2] - 0.8) < 0.75 && Math.abs(q[1]) < 3.2) || (Math.abs(q[1]) < 0.8 && q[2] < 0.8 && q[2] > -4)) ? M.DARK : 0; } });
    else {
      r.ell(hd, [5.6, 5.4, 6.2], M.STEEL, null, { mf: p => { const q = V.sub(p, hd); if (Math.abs(q[2] - 2.2) < 0.8) return M.GOLD; if (q[0] > 2.6 && Math.abs(q[2] - 0.4) < 0.75 && Math.abs(q[1]) < 4) return M.DARK; return 0; } });
      if (b.look === 'horned') for (const s of [-1, 1]) r.cone(V.add(hd, [0, s * 5, 2.5]), V.add(hd, [0, s * 8.5, 8]), 1.4, 0.4, M.HORN);
      if (b.look === 'crown') { r.cyl(V.add(hd, [0, 0, 3]), V.add(hd, [0, 0, 4.6]), 5.2, M.GOLD); for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283; r.cone(V.add(hd, [Math.cos(a) * 4.8, Math.sin(a) * 4.8, 4.4]), V.add(hd, [Math.cos(a) * 4.8, Math.sin(a) * 4.8, 7]), 0.9, 0.2, M.GOLD); } }
      void fwd; void up; void sd;
    }
  } else if (b.slot === 'chest') {
    const m = b.look === 'plate' ? M.PLATE : b.look === 'darkplate' ? M.DSTEEL : b.look === 'chain' ? M.CHAIN : team;
    r.ell([0, 0, 3], [4.6, 6.6, 6.4], m);
    for (const s of [-1, 1]) r.ell([0, s * 7, 6.5], [3.6, 3.4, 3], b.look === 'tunic' ? M.LEATHER : m);
  } else if (b.slot === 'shield') {
    if (b.look === 'tower') { r.box([0, 0, 4], [0.8, 4.4, 7.4], team, null, { mf: p => Math.abs(p[1]) > 3.5 || Math.abs(p[2] - 4) > 6.5 ? M.IRON : Math.abs(p[1]) < 0.8 ? M.GOLD : 0 }); return (iconCache[k] = renderRig(r, Math.PI / 4, 26, 26, 13, 17)); }
    if (b.look === 'round') { r.ell([0, 0, 4], [1, 5, 5], M.WOOD, null, { mf: p => { const d2 = (p[1] ** 2 + (p[2] - 4) ** 2) / 25; return d2 > 0.74 || d2 < 0.06 ? M.IRON : 0; } }); return (iconCache[k] = renderRig(r, Math.PI / 4, 26, 26, 13, 17)); }
    const big = b.look === 'kite', rad = big ? [1, 5, 7] : [1, 4.4, 4.4], ax = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    r.ell([0, 0, 4], rad, team, ax, { mf: p => { const u = p[1] / rad[1], v = (p[2] - 4) / rad[2]; return u * u + v * v > 0.62 ? M.GOLD : (big && (Math.abs(u) < 0.14 || Math.abs(v - 0.15) < 0.11)) ? M.GOLD : 0; } });
  } else {   // potion
    r.cyl([0, 0, -1], [0, 0, 6], 3.4, M.CLOTH_RED); r.sph([0, 0, 6], 3.6, M.CLOTH_RED);
    r.cyl([0, 0, 9], [0, 0, 11.5], 1.3, M.BONE); r.cyl([0, 0, 11.5], [0, 0, 12.5], 1.6, M.WOOD);
  }
  return (iconCache[k] = renderRig(r, b.slot === 'shield' ? Math.PI / 4 : b.slot === 'helm' || b.slot === 'chest' ? Math.PI / 4 : 0, 26, 26, 13, 17));
}
