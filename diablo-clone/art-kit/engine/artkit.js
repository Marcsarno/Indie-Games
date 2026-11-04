'use strict';
// The art kit's registry (round 41b). A submission file calls ART.monster, ART.prop or ART.gear;
// each puts its asset where the game's own code looks for it (MONSTERS and FAMILIES, BUILD,
// GEAR_EXTRA), so the studio draws it with the game's own renderer, palette and lighting, and the
// same file can be dropped into the game later.
const ART = { items: [], errors: [] };
const need = (cond, msg) => { if (!cond) throw new Error(msg); };
const ID = /^[a-z][a-z0-9_]{1,30}$/;

ART.monster = def => {
  need(def && ID.test(def.id || ''), 'ART.monster: id must be lower case letters, digits or _ (e.g. "cave_beetle")');
  need(typeof def.name === 'string', 'ART.monster: name is required (shown over its head, e.g. "CAVE BEETLE")');
  let fam = def.family;
  if (def.newFamily) {
    const nf = def.newFamily;
    need(Array.isArray(nf.size) && nf.size.length === 4, 'newFamily.size must be [width, height, anchorX, anchorY] in pixels');
    need(typeof nf.rig === 'function', 'newFamily.rig must be a function (look, st) returning a Rig');
    need(Array.isArray(nf.swing) && nf.swing.some(k => k.hit), 'newFamily.swing must be a list of keys with one marked hit: true');
    fam = 'x_' + def.id;
    FAMILIES[fam] = { size: nf.size, gait: nf.gait || 0.13, rig: nf.rig, swing: () => nf.swing };
  }
  need(FAMILIES[fam], `ART.monster: family "${fam}" is not one of: ${Object.keys(FAMILIES).join(', ')} (or give newFamily)`);
  const st = Object.assign({ hp: 14, dmg: [2, 5], speed: 30, reach: 1.25, xp: 12, chest: 14, shadow: 7 }, def.stats || {});
  MONSTERS[def.id] = Object.assign({ family: fam, name: def.name.toUpperCase(), look: def.look || {} }, st);
  ART.items.push({ kind: 'monster', id: def.id });
};
ART.prop = def => {
  need(def && ID.test(def.id || ''), 'ART.prop: id must be lower case letters, digits or _');
  need(Array.isArray(def.size) && def.size.length === 4, 'ART.prop: size must be [width, height, anchorX, anchorY] in pixels');
  need(typeof def.build === 'function', 'ART.prop: build must be a function (r) that adds shapes to the rig r');
  BUILD[def.id] = () => propSprite('art_' + def.id, def.build, def.size, def.yaw || 0);
  ART.items.push({ kind: 'prop', id: def.id, footprint: def.footprint || [1, 1] });
};
ART.gear = def => {
  need(def && ID.test(def.id || ''), 'ART.gear: id must be lower case letters, digits or _');
  need(['helm', 'chest', 'weapon'].includes(def.slot), 'ART.gear: slot must be "helm", "chest" or "weapon"');
  need(typeof def.draw === 'function', 'ART.gear: draw must be a function (r, P)');
  need(!(def.slot === 'weapon' && /^(staff|bow)/.test(def.id)), 'ART.gear: a weapon id may not start with "staff" or "bow" (those are drawn by the mage and ranger code)');
  GEAR_EXTRA[def.slot][def.id] = def.draw;
  if (def.slot === 'weapon') { GEAR_SWING[def.id] = def.swing === 'light' ? 'light' : 'heavy'; GEAR_LEN[def.id] = def.length || 16; }
  ART.items.push({ kind: 'gear', id: def.id, slot: def.slot, name: def.name || def.id });
};

// ---------------------------------------------------------------- previews (rows for renderSheet)
const HERO_SCALE_LOOK = { team: 'red', helm: 'none', chest: 'tunic', weapon: 'sword', shield: 'none' };
const heroRef = () => ({ label: 'hero', sp: heroSprite(HERO_SCALE_LOOK, 'idle', 0, 1) });
function previewRows(item) {
  if (item.kind === 'monster') {
    const rows = SHEET_CAST(item.id);
    const m = MONSTERS[item.id], small = d => getSprite(m.family, m.look, d, 'idle', 0, { look: m.look }, 1);   // at the hero's scale (the rows below are at the game's double detail)
    rows.unshift({ label: 'next to the hero, for size', sprites: [heroRef(), { label: item.id, sp: small(1) }, { label: 'd3', sp: small(3) }] });
    return rows;
  }
  if (item.kind === 'prop') return [{ label: item.id + ' next to the hero', sprites: [{ label: item.id, sp: BUILD[item.id]() }, heroRef()] }];
  const eq = Object.assign({}, HERO_SCALE_LOOK, item.slot === 'helm' ? { helm: item.id } : item.slot === 'chest' ? { chest: item.id } : { weapon: item.id });
  return [
    { label: item.name + ': 8 directions', sprites: [...Array(8).keys()].map(d => ({ label: 'd' + d, sp: heroSprite(eq, 'idle', 0, d) })) },
    { label: 'walk, d1', sprites: [...Array(8).keys()].map(f => ({ label: 'w' + f, sp: heroSprite(eq, 'walk', f, 1) })) },
    { label: 'attack, d0', sprites: weaponSwing(eq).map((k, f) => ({ label: 'a' + f, sp: heroSprite(eq, 'attack', f, 0) })) },
    { label: 'attack, d2', sprites: weaponSwing(eq).map((k, f) => ({ label: 'a' + f, sp: heroSprite(eq, 'attack', f, 2) })) },
  ];
}
// run a submission's code; returns the items it registered (or throws with a readable message)
function runSubmission(code) {
  ART.items = [];
  spriteCache.clear(); for (const k in propCache) if (k.startsWith('art_')) delete propCache[k];
  new Function('ART', 'V', 'M', 'Rig', code)(ART, V, M, Rig);
  need(ART.items.length, 'The code ran but registered nothing: call ART.monster, ART.prop or ART.gear');
  return ART.items.slice();
}
