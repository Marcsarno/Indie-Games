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
];
const RARITY_COL = { normal: 26, magic: 40, rare: 51 };
let itemSerial = 1;
function rollItem(R, level, forceBase) {
  const bases = Object.keys(ITEM_BASES).filter(k => ITEM_BASES[k].lvl <= level + 1 && ITEM_BASES[k].slot !== 'potion');
  const baseId = forceBase || R.pick(bases), base = ITEM_BASES[baseId];
  const it = { id: itemSerial++, base: baseId, rarity: 'normal', mods: {} };
  if (base.slot === 'potion') return it;
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
function itemName(it) {
  const b = ITEM_BASES[it.base];
  if (it.rarity === 'rare') return it.title;
  return [it.prefix, b.name, it.suffix].filter(Boolean).join(' ');
}
function itemLines(it) {
  const b = ITEM_BASES[it.base], m = it.mods, L = [];
  if (b.slot === 'potion') return ['RESTORES ' + b.heal + ' LIFE'];
  if (it.rarity === 'rare') L.push(b.name);
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
    else {
      r.cone(V.mad(g, bd, 1.2), V.mad(g, bd, 13), 0.9, 0.9, M.WOOD);
      if (b.look === 'axe') r.box(V.add(V.mad(g, bd, 11.5), V.mul(wide, 3)), [2.8, 3.0, 0.5], M.BLADE, wf);
      else r.sph(V.mad(g, bd, 13.5), 3.0, M.IRON);
    }
  } else if (b.slot === 'helm') {
    const hd = [0, 0, 4], fwd = [1, 0, 0], up = [0, 0, 1], sd = [0, 1, 0];
    if (b.look === 'cap') r.ell([0, 0, 3], [5.2, 5.1, 4.0], M.IRON);
    else {
      r.ell(hd, [5.6, 5.4, 6.2], M.STEEL, null, { mf: p => { const q = V.sub(p, hd); if (Math.abs(q[2] - 2.2) < 0.8) return M.GOLD; if (q[0] > 2.6 && Math.abs(q[2] - 0.4) < 0.75 && Math.abs(q[1]) < 4) return M.DARK; return 0; } });
      if (b.look === 'horned') for (const s of [-1, 1]) r.cone(V.add(hd, [0, s * 5, 2.5]), V.add(hd, [0, s * 8.5, 8]), 1.4, 0.4, M.HORN);
      void fwd; void up; void sd;
    }
  } else if (b.slot === 'chest') {
    const m = b.look === 'plate' ? M.STEEL : b.look === 'chain' ? M.CHAIN : team;
    r.ell([0, 0, 3], [4.6, 6.6, 6.4], m);
    for (const s of [-1, 1]) r.ell([0, s * 7, 6.5], [3.6, 3.4, 3], b.look === 'tunic' ? M.LEATHER : m);
  } else if (b.slot === 'shield') {
    const big = b.look === 'kite', rad = big ? [1, 5, 7] : [1, 4.4, 4.4], ax = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    r.ell([0, 0, 4], rad, team, ax, { mf: p => { const u = p[1] / rad[1], v = (p[2] - 4) / rad[2]; return u * u + v * v > 0.62 ? M.GOLD : (big && (Math.abs(u) < 0.14 || Math.abs(v - 0.15) < 0.11)) ? M.GOLD : 0; } });
  } else {   // potion
    r.cyl([0, 0, -1], [0, 0, 6], 3.4, M.CLOTH_RED); r.sph([0, 0, 6], 3.6, M.CLOTH_RED);
    r.cyl([0, 0, 9], [0, 0, 11.5], 1.3, M.BONE); r.cyl([0, 0, 11.5], [0, 0, 12.5], 1.6, M.WOOD);
  }
  return (iconCache[k] = renderRig(r, b.slot === 'shield' ? Math.PI / 4 : b.slot === 'helm' || b.slot === 'chest' ? Math.PI / 4 : 0, 26, 26, 13, 17));
}
