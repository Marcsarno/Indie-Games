'use strict';
// TEST BUILD ONLY (art chat): not part of the game. Gives the new armor-set looks temporary item
// entries and adds an OUTFIT button that dresses the hero in the next set for their class, so the
// sets can be tried in play before the main chat makes real items for them.
(function () {
  const W = (look, name, slow) => ({ slot: 'weapon', look, name, dmg: [3, 8], cls: '', lvl: 1, slow: !!slow });
  const A = (slot, look, name) => ({ slot, look, name, armor: 3, cls: '', lvl: 1 });
  // [set name, class, {slot: [look, item kind]}]
  const SETSX = [
    ['MILITIA', 'warrior', { chest: 'militia', helm: 'cap', weapon: 'sword' }],
    ['IRON GUARD', 'warrior', { chest: 'ironguard', helm: 'great', weapon: 'sword', shield: 'kite' }],
    ['WARBRINGER', 'warrior', { chest: 'warbringer', helm: 'horned', weapon: 'axe', shield: 'tower' }],
    ['VANGUARD', 'warrior', { chest: 'vanguard', helm: 'barbute', weapon: 'sword', shield: 'kite' }],
    ['CROWN GUARD', 'warrior', { chest: 'crownguard', helm: 'crown', weapon: 'sword', shield: 'kite' }],
    ['BORDER WARDEN', 'warrior', { chest: 'borderwarden', helm: 'spangen', weapon: 'axe', shield: 'round' }],
    ['STEEL KNIGHT', 'warrior', { chest: 'steelknight', helm: 'bascinet', weapon: 'greatsword' }],
    ['ROADWARDEN', 'warrior', { chest: 'roadwarden', helm: 'kettle', weapon: 'sword', shield: 'round' }],
    ['COPPER RAIDER', 'warrior', { chest: 'copperraider', helm: 'barbute_dark', weapon: 'caxe' }],
    ['OATHKEEPER', 'warrior', { chest: 'oathkeeper', helm: 'great', weapon: 'fmace', shield: 'heater_oath' }],
    ['EMBER FORGED', 'warrior', { chest: 'emberforged', helm: 'bascinet_gold', weapon: 'fhammer' }],
    ['GATEWATCH', 'warrior', { chest: 'gatewatch', helm: 'nasal', weapon: 'spear', shield: 'board' }],
    ['DUSK DUELIST', 'warrior', { chest: 'duskduelist', helm: 'skullcap', weapon: 'sabre', shield: 'buckler_steel' }],
    ['WINTER BULWARK', 'warrior', { chest: 'winterbulwark', helm: 'great_flat', weapon: 'faxe', shield: 'heater_frost' }],
    ['ROYAL EXECUTOR', 'warrior', { chest: 'royalexecutor', helm: 'helm_royal', weapon: 'kgsword' }],
    ['LEATHER JERKIN', 'ranger', { chest: 'jerkin', weapon: 'bow' }],
    ['STUDDED JERKIN', 'ranger', { chest: 'jerkin_stud', weapon: 'bow' }],
    ['HIDE COAT', 'ranger', { chest: 'jerkin_hide', weapon: 'bow' }],
    ['SCALE JERKIN', 'ranger', { chest: 'jerkin_scale', weapon: 'bow' }],
    ['DRAKE HIDE', 'ranger', { chest: 'jerkin_drake', weapon: 'bow' }],
    ['BRAMBLE SCOUT', 'ranger', { chest: 'jerkin_bramble', weapon: 'bow_ash' }],
    ['ASHWOOD HUNTER', 'ranger', { chest: 'jerkin_ashwood', weapon: 'bow_iron' }],
    ['NIGHT TRACKER', 'ranger', { chest: 'jerkin_night', weapon: 'bow_cross' }],
    ['THORN SENTINEL', 'ranger', { chest: 'jerkin_thorn', weapon: 'bow_recurve' }],
    ['MARSH RUNNER', 'ranger', { chest: 'jerkin_marsh', weapon: 'bow_swamp' }],
    ['FROSTPATH STALKER', 'ranger', { chest: 'jerkin_frost', weapon: 'bow_silver' }],
    ['DUNE STRIDER', 'ranger', { chest: 'jerkin_dune', weapon: 'bow_arbalest' }],
    ['BLACKTHORN WARDEN', 'ranger', { chest: 'jerkin_warden', weapon: 'bow_thorn' }],
    // art A10: ranger headpieces (helm only: the rest of the outfit stays as worn)
    ['TRAIL BANDANA', 'ranger', { helm: 'bandana' }],
    ['GREENWOOD CAP', 'ranger', { helm: 'greenwood' }],
    ['SHADOW HOOD', 'ranger', { helm: 'shadowhood' }],
    ['HAWK SCOUT CIRCLET', 'ranger', { helm: 'circlet' }],
    ['STARTER', 'mage', { chest: 'robe_blue', helm: 'hat', weapon: 'staff' }],
    ['MAGUS', 'mage', { chest: 'robe_purple', helm: 'hat', weapon: 'staff' }],
    ['ARCHMAGE', 'mage', { chest: 'robe_red', helm: 'hat_conj', weapon: 'staff_rune' }],
    ['WAYFARER', 'mage', { chest: 'robe_way', helm: 'hat_way', weapon: 'staff_amber' }],
    ['FROST SCHOLAR', 'mage', { chest: 'robe_frost', helm: 'hat_frost', weapon: 'staff_frost' }],
    ['DUSKWEAVER', 'mage', { chest: 'robe_dusk', helm: 'hat_dusk', weapon: 'staff_moon' }],
    ['SUNWARDEN', 'mage', { chest: 'robe_sun', helm: 'hat_sun', weapon: 'staff_sun' }],
    ['TIDEKEEPER', 'mage', { chest: 'robe_tide', helm: 'hat_tide', weapon: 'staff_pearl' }],
    ['CINDER SAGE', 'mage', { chest: 'robe_cinder', helm: 'hat_cinder', weapon: 'staff_cage' }],
    ['RUNEBINDER', 'mage', { chest: 'robe_rune', helm: 'hat_rune', weapon: 'staff_runestone' }],
    ['ROSE ORACLE', 'mage', { chest: 'robe_rose', helm: 'hat_rose', weapon: 'staff_rose' }],
  ];
  const HEAVY = { caxe: 1, fmace: 1, fhammer: 1, faxe: 1, kgsword: 1, axe: 1, greatsword: 1 };
  let serial = 9e8;
  const itemFor = (cls, slot, look, setName) => {
    const base = `artx_${cls}_${slot}_${look}`;
    if (!ITEM_BASES[base]) ITEM_BASES[base] = slot === 'weapon' ? Object.assign(W(look, setName, HEAVY[look]), { cls }) : Object.assign(A(slot, look, setName), { cls });
    return { id: serial++, base, rarity: 'normal', name: setName, mods: {} };
  };
  const idx = { warrior: -1, ranger: -1, mage: -1 };
  function nextOutfit() {
    if (typeof hero === 'undefined' || !hero.cls) return;
    const list = SETSX.filter(s => s[1] === hero.cls); if (!list.length) return;
    idx[hero.cls] = (idx[hero.cls] + 1) % list.length;
    const [name, cls, parts] = list[idx[hero.cls]];
    for (const slot of ['chest', 'helm', 'weapon', 'shield']) {
      if (cls === 'ranger' && slot === 'shield') continue;   // keep the quiver
      if (cls === 'ranger' && slot === 'helm' && !parts.helm) continue;     // keep whatever hood is worn (unless the entry is a headpiece)
      if (!parts.chest && slot !== 'helm') continue;   // a headpiece entry changes only the helm
      hero.equip[slot] = parts[slot] ? itemFor(cls, slot, parts[slot], name) : (slot === 'shield' || slot === 'helm' ? null : hero.equip[slot]);
    }
    recalcHero(); prewarmHero();
    label.textContent = `${name} (${idx[hero.cls] + 1}/${list.length})`;
    if (typeof say === 'function') say(name, 51, 1.5);
  }
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;top:38%;left:calc(env(safe-area-inset-left,0px) + 6px);z-index:20;display:flex;flex-direction:column;gap:4px;align-items:flex-start;max-width:120px;font:600 12px ui-monospace,monospace;color:#e6d7bb;pointer-events:auto';
  const btn = document.createElement('button');
  btn.textContent = 'OUTFIT >'; btn.type = 'button';
  btn.style.cssText = 'font:700 12px ui-monospace,monospace;padding:6px 10px;border-radius:4px;border:1px solid #6d5a44;background:#2a211b;color:#f1e3c6';
  const label = document.createElement('span'); label.textContent = 'test build'; label.style.cssText = 'font:600 10px ui-monospace,monospace;color:#e6d7bb;text-shadow:0 1px 2px #000';
  btn.addEventListener('pointerdown', e => { e.stopPropagation(); }, true);
  btn.addEventListener('touchstart', e => { e.stopPropagation(); }, { passive: true });
  btn.addEventListener('click', e => { e.stopPropagation(); nextOutfit(); });
  box.append(btn, label); document.body.appendChild(box);
})();
