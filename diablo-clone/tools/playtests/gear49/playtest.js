// round 49: the art chat's hero sets as items: every new base has a real material tint, an icon, and
// builds on its class's hero in all 8 directions; they drop; a contact sheet of icons and heroes
const L = [], shots = {}, bad = [];
const NEW = Object.keys(ITEM_BASES).filter(k => ITEM_BASES[k].icon);
newHero('warrior'); G.mode = 'play'; startLevel(3, 777);
let serial = 1e6; const mk = base => ({ id: serial++, base, rarity: 'normal', name: base, mods: {} });
for (const k of NEW) {
  const b = ITEM_BASES[k];
  if (b.tint && !M[b.tint]) bad.push(k + ' tint ' + b.tint); if (b.orb && !M[b.orb]) bad.push(k + ' orb ' + b.orb);
  try { itemIcon(mk(k)); } catch (e) { bad.push(k + ' icon ' + e); }
  try { newHero(b.cls); hero.equip[b.slot] = mk(k); recalcHero(); if (hero.look[b.slot === 'shield' ? 'shield' : b.slot] !== b.look) bad.push(k + ' look ' + JSON.stringify(hero.look)); for (let d = 0; d < 8; d++) getSprite('hero', hero.look, d, 'walk', 2, hero, SPX); } catch (e) { bad.push(k + ' hero ' + e); }
}
// drop rates at level 3 for a warrior: share of drops that are new pieces
newHero('warrior'); const R = rng(5); let n = 0, nw = 0; for (let q = 0; q < 3000; q++) { const it = rollItem(R, 3); if (ITEM_BASES[it.base].slot === 'ring' || ITEM_BASES[it.base].slot === 'amulet') continue; n++; if (ITEM_BASES[it.base].icon) nw++; }
L.push({ newBases: NEW.length, bad, newShareLv3: Math.round(nw / n * 100) + '%' });
// sheet: per class, icons in a row and the hero in full new sets
const cv = document.createElement('canvas'); cv.width = 1200; cv.height = 900; const g = cv.getContext('2d'); g.fillStyle = '#18110e'; g.fillRect(0, 0, cv.width, cv.height);
const blit = (sp, x, y, z, lvl = 4) => { for (let q = 0; q < sp.w * sp.h; q++) { const v0 = sp.data[q]; if (!v0) continue; const v = (v0 & 128) ? v0 & 127 : LTAB[lvl][v0]; g.fillStyle = `rgb(${PR[v]},${PG[v]},${PB[v]})`; g.fillRect(x + ((q % sp.w) - sp.ax) * z, y + (((q / sp.w) | 0) - sp.ay) * z, z, z); } };
let y = 40;
for (const cls of ['warrior', 'ranger', 'mage']) {
  const ks = NEW.filter(k => ITEM_BASES[k].cls === cls);
  ks.forEach((k, n) => blit(itemIcon(mk(k)), 20 + (n % 40) * 29, y + Math.floor(n / 40) * 30, 1));
  y += Math.ceil(ks.length / 40) * 30 + 70;
  const sets = [...new Set(ks.map(k => k.replace(/_(mail|helm|weapon|shield|jerkin|bow|robe|hat|staff)$/, '')))];
  sets.forEach((s, n) => { newHero(cls); for (const k of ks.filter(k => k.startsWith(s + '_'))) hero.equip[ITEM_BASES[k].slot] = mk(k); recalcHero(); blit(getSprite('hero', hero.look, 1, 'idle', 0, hero, SPX), 40 + n * 74, y, 1); });
  y += 90;
}
shots.sheet = cv.toDataURL();
window.__out = { log: L, shots };
