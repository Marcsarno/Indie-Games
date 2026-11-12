'use strict';
// Round 106: the WARRIOR becomes the BARBARIAN (the user: no shield ever; a two-hander or a weapon in each hand;
// leathery; "basically very much the same" moves). Inside, the class id stays 'warrior' (saves, skills, bots).
// What changes: no shields, no knightly plate or closed helms (they go to the paladin); a one-handed weapon can be
// held in the OFF hand (equip.shield holds it; the rig's `eq.offhand`), adding half its damage; the combo
// alternates hands (actors.js); and his own armor: hide, wolf pelt, bear hide, bone and a warlord's furs, with
// a war band, a wolf hood, a bear skull and ram horns for his head.
const isBarb = () => heroCls() === 'warrior';

// ---------------------------------------------------------------- what he leaves to the paladin
const BARB_DENY_LOOKS = new Set(['plate', 'darkplate', 'gothic', 'ironguard', 'vanguard', 'warbringer', 'steelknight', 'crownguard', 'oathkeeper', 'copperraider', 'emberforged', 'royalexecutor', 'winterbulwark',
  'great', 'crown', 'bascinet', 'great_flat', 'helm_royal', 'bascinet_gold']);
function barbDeny(o) { return !!(o && o.slot && (o.slot === 'shield' || BARB_DENY_LOOKS.has(o.look))); }
if (typeof palShares === 'function') { const ps0 = palShares; palShares = o => ps0(o) || (o && (o.cls || 'warrior') === 'warrior' && barbDeny(o)); }   // the knight's kit goes to the paladin
// two hands on these (no off hand with them)
for (const k in ITEM_BASES) if (['greatsword', 'bsword', 'baxe', 'kgsword', 'fhammer', 'spear'].includes(ITEM_BASES[k].look)) ITEM_BASES[k].twoHand = true;
const barbTwo = it => !!(it && ITEM_BASES[it.base] && ITEM_BASES[it.base].twoHand);
const isWeapon = it => !!(it && ITEM_BASES[it.base] && ITEM_BASES[it.base].slot === 'weapon');

// ---------------------------------------------------------------- his armor
Object.assign(ITEM_BASES, {
  b_hide: { slot: 'chest', look: 'b_hide', name: 'HIDE WRAPS', armor: 3, cls: 'warrior', lvl: 1, icon: 'brigandine', tint: 'HIDE' },
  b_wolf: { slot: 'chest', look: 'b_wolf', name: 'WOLFPELT HARNESS', armor: 6, cls: 'warrior', lvl: 2, icon: 'brigandine', tint: 'FUR' },
  b_bear: { slot: 'chest', look: 'b_bear', name: 'BEARHIDE VEST', armor: 9, cls: 'warrior', lvl: 3, icon: 'brigandine', tint: 'BOAR' },
  b_bone: { slot: 'chest', look: 'b_bone', name: 'BONECLAD HARNESS', armor: 12, cls: 'warrior', lvl: 4, icon: 'brigandine', tint: 'BONE' },
  b_warlord: { slot: 'chest', look: 'b_warlord', name: "WARLORD'S FURS", armor: 16, cls: 'warrior', lvl: 5, icon: 'brigandine', tint: 'CLOTH_DARK' },
  b_band: { slot: 'helm', look: 'b_band', name: 'WAR BAND', armor: 1, cls: 'warrior', lvl: 1, icon: 'cap' },
  b_wolfhood: { slot: 'helm', look: 'b_wolfhood', name: 'WOLF HOOD', armor: 4, cls: 'warrior', lvl: 2, icon: 'cap' },
  b_skull: { slot: 'helm', look: 'b_skull', name: 'BEAR SKULL', armor: 6, cls: 'warrior', lvl: 3, icon: 'horned' },
  b_horns: { slot: 'helm', look: 'b_horns', name: 'WARLORD HORNS', armor: 9, cls: 'warrior', lvl: 5, icon: 'horned' },
});
for (const id of ['b_hide', 'b_wolf', 'b_bear', 'b_bone', 'b_warlord']) WARRIOR_SETS[id] = { base: 'brigandine' };   // the brigandine's broader frame, stripped to skin and fur
// bare skin: chest, belly, arms; pauldrons gone
function barbBare(S) {
  const { chest, abd, pads, A, mat } = S;
  mat([chest, abd, ...A('sleeve'), ...A('fore'), ...A('hand')], M.FACE); chest.mf = null; abd.mf = null;
  for (const q of pads) q.dead = true; for (const q of A('cop')) if (q) q.dead = true;
}
const barbStrap = (S, sgn, w = 0.75) => p => { const [f, s, z] = S.loc(p), d = sgn * s * 0.75 + z - 0.6; return Math.abs(d) < w && f > -0.5 ? 1 : 0; };   // a strap over one shoulder down to the other hip
// a fur mantle over the shoulders: one soft mass, a little ragged at its edge
function barbMantle(r, J, m, big = 1) {
  const { fwd, up, sideR } = J, c = V.add(V.mad(J.chest, up, 4.3 + big * 0.4), V.mul(fwd, -0.9));   // (pass 2: bigger and higher: it hid inside the torso)
  r.group(() => {
    r.ell(c, [5.0 * big, 7.8 * big, 2.8 * big], m, frameAlong(fwd, up), { mf: p => { const q = V.sub(p, c), a = Math.atan2(V.dot(q, sideR), V.dot(q, fwd)); return V.dot(q, up) < -1.2 * big && Math.sin(a * 9) > 0.55 ? M.DARK : 0; } });
    for (const s of [-1, 1]) r.sph(V.add(V.add(V.mad(J.chest, up, 3.9), V.mul(sideR, s * 5.6 * big)), V.mul(fwd, -0.2)), 3.5 * big, m);
    r.ell(V.add(V.mad(J.chest, up, 0.5), V.mul(fwd, -3.6)), [2.0, 6.0 * big, 6.0], m, frameAlong(fwd, up));   // down the back
  });
}
CHEST_RETOUCH.b_hide = (r, J, S) => {   // bare chest, one hide strap across it, wrapped forearms, a hide kilt, fur boots
  const { chest, abd, pel, A, L, mat, belt, skirt, paint } = S; barbBare(S);
  const st = barbStrap(S, 1); paint(chest, p => st(p) ? M.HIDE : 0); paint(abd, p => st(p) ? M.HIDE : 0);
  mat(A('fore'), M.LEATHER); mat([pel, ...L('thigh')], M.LEATHER); mat(L('boot'), M.FUR);
  belt(M.LEATHER); skirt(M.HIDE, { front: 3.4, fw: 3.0, side: 3.0, back: 3.4 });
};
CHEST_RETOUCH.b_wolf = (r, J, S) => {   // a grey wolf pelt over the shoulders, straps crossed on the bare chest, a hide kilt trimmed in fur
  const { chest, abd, pel, A, L, mat, belt, skirt, paint } = S; barbBare(S);
  const a = barbStrap(S, 1), b = barbStrap(S, -1); paint(chest, p => a(p) || b(p) ? M.LEATHER : 0); paint(abd, p => a(p) || b(p) ? M.LEATHER : 0);
  barbMantle(r, J, M.FUR, 1);
  { const { fwd, up, sideR } = J, h = V.add(V.add(V.mad(J.chest, up, 4.6), V.mul(sideR, -4.6)), V.mul(fwd, 1.0));   // the wolf's head on the left shoulder, snout forward
    r.group(() => { r.sph(h, 2.3, M.FUR); r.cone(h, V.mad(V.mad(h, fwd, 3.4), up, -0.6), 1.5, 0.7, M.FUR); });
    r.sph(V.mad(V.mad(h, fwd, 3.5), up, -0.5), 0.7, M.DARK, { noShadow: true });
    for (const s of [-1, 1]) r.cone(V.add(V.mad(h, up, 1.4), V.mul(sideR, s * 1.0)), V.add(V.mad(h, up, 3.4), V.mul(sideR, s * 1.2)), 0.9, 0.2, M.FUR); }
  mat(A('fore'), M.LEATHER); mat([pel, ...L('thigh')], M.LEATHER); mat(L('boot'), M.FUR);
  belt(M.LEATHER); skirt(M.HIDE, { front: 3.6, fw: 3.0, side: 3.2, back: 3.6, smf: p => S.loc(p)[2] < -5.6 ? M.FUR : 0, fmf: p => S.loc(p)[2] < -5.6 ? M.FUR : 0 });
};
CHEST_RETOUCH.b_bear = (r, J, S) => {   // a dark bear-hide vest open down the front, great fur shoulders, studded bracers
  const { chest, abd, pel, A, L, mat, belt, skirt } = S; barbBare(S);
  const vest = p => { const [f, s, z] = S.loc(p); return f > 1.2 && Math.abs(s) < 1.3 + Math.max(0, z) * 0.15 ? 0 : M.BOAR; };
  chest.mf = vest; abd.mf = vest;
  barbMantle(r, J, M.BOAR, 1.12);
  mat(A('fore'), M.LEATHER); for (const q of A('fore')) { if (!q) continue; const a = q.a; S.paint(q, p => { const t = V.len(V.sub(p, a)); return t > 1.2 && Math.abs((t * 1.3) % 1.6 - 0.8) < 0.25 ? M.IRON : 0; }); }
  mat([pel, ...L('thigh')], M.LEATHER); mat(L('boot'), M.BOAR);
  belt(M.IRON); skirt(M.BOAR, { front: 4.0, fw: 3.2, side: 3.4, back: 4.0 });
};
CHEST_RETOUCH.b_bone = (r, J, S) => {   // leather with ribs of bone across the chest, a skull on the left shoulder, bone spikes on the right
  const { chest, abd, pel, A, L, mat, belt, skirt } = S; barbBare(S);
  const ribs = p => { const [f, s, z] = S.loc(p), v = z * 0.75 + 10; if (f > 0.6 && Math.abs(s) < 3.8 && z > -1.5 && v - Math.floor(v) < 0.34) return M.BONE; return M.LEATHER; };
  chest.mf = ribs; abd.mf = p => { const [f, s] = S.loc(p); return f > 1 && Math.abs(s) < 1.2 ? M.FACE : M.LEATHER; };
  const { fwd, up, sideR } = J, sk = V.add(V.mad(J.chest, up, 3.6), V.mul(sideR, -5.0));
  r.sph(sk, 2.9, M.BONE, { mf: p => { const q = V.sub(p, sk), f = V.dot(q, fwd), s = V.dot(q, sideR), z = V.dot(q, up); return f > 1.6 && Math.abs(Math.abs(s) - 1.0) < 0.55 && Math.abs(z - 0.3) < 0.55 ? M.DARK : f > 1.8 && z < -1.2 && Math.abs(s) < 1.2 ? M.DARK : 0; } });
  for (const [a, b] of [[0.4, 1], [-0.3, 0.8], [0.9, 0.7]]) { const base = V.add(V.mad(J.chest, up, 3.4), V.mul(sideR, 5.0)); r.cone(base, V.add(V.add(V.mad(base, up, 4.2 * b), V.mul(sideR, 2.0)), V.mul(fwd, a * 2.6)), 1.1, 0.2, M.BONE); }
  r.sph(V.add(V.mad(J.chest, up, 3.2), V.mul(sideR, 5.0)), 2.4, M.LEATHER);
  mat(A('fore'), M.LEATHER); mat([pel, ...L('thigh')], M.LEATHER); mat(L('boot'), M.FUR);
  belt(M.LEATHER); skirt(M.LEATHER, { front: 4.2, fw: 3.0, fm: M.BONE, side: 3.4, back: 4.0 });
};
CHEST_RETOUCH.b_warlord = (r, J, S) => {   // war paint on the bare chest, a great black fur mantle clasped in gold, an iron spiked pauldron, a red sash
  const { chest, abd, pel, A, L, mat, belt, skirt } = S; barbBare(S);
  const paintM = p => { const [f, s, z] = S.loc(p); if (f < 1.2) return 0; for (const o of [-1.6, 0, 1.6]) if (Math.abs(s - o - (z - 1) * 0.45) < 0.38 && z > -0.5 && z < 3.0) return M.CLOTH_RED; return 0; };
  chest.mf = paintM;
  barbMantle(r, J, M.CLOTH_DARK, 1.18);
  const { fwd, up, sideR } = J;
  r.sph(V.add(V.mad(J.chest, up, 3.3), V.mul(fwd, 3.2)), 1.1, M.GOLD);   // the clasp
  const pd = V.add(V.mad(J.chest, up, 4.2), V.mul(sideR, 5.6));
  r.sph(pd, 3.0, M.IRON); for (const [a, b] of [[0, 1], [0.7, 0.8], [-0.7, 0.8]]) r.cone(V.mad(pd, up, 2.2), V.add(V.mad(pd, up, 2.2 + 3.2 * b), V.add(V.mul(sideR, 1.2), V.mul(fwd, a * 2))), 0.9, 0.15, M.STEEL);
  mat(A('fore'), M.DSTEEL); mat([pel, ...L('thigh')], M.LEATHER); mat(L('boot'), M.CLOTH_DARK);
  belt(M.CLOTH_RED); skirt(M.LEATHER, { front: 4.6, fw: 3.2, fm: M.CLOTH_RED, side: 3.6, back: 4.6 });
};

// ---------------------------------------------------------------- his helms
const barbFace = (r, hd, fwd, up, sideR, helmF, eq, o) => { r.ell(hd, [4.3, 4.3, 4.5], M.FACE, helmF, { mf: faceMf(hd, fwd, sideR, up, Object.assign({ hair: HAIRM[eq.hair] || M.HAIR_O }, o)) }); faceParts(r, hd, fwd, sideR, up, !o.noEars); };
GEAR_EXTRA.helm.b_band = (r, { hd, fwd, up, sideR, helmF, eq }) => {   // his own wild hair, a leather war band round the brow, a bone bead on it
  const hm = HAIRM[eq.hair] || M.HAIR_O; barbFace(r, hd, fwd, up, sideR, helmF, eq, { line: true, under: 0, hair: hm });
  r.group(() => {   // (pass 2: wild, not a bowl: spikes up and back, a mane down the neck)
    r.ell(V.add(V.mad(hd, up, 1.9), V.mul(fwd, -1.0)), [4.6, 4.8, 3.4], hm, helmF, { noShadow: true });
    for (const [f, s, z, df, ds, dz, l] of [[0.6, 0, 3.6, 0.4, 0, 1, 3.2], [-1.4, 1.8, 3.4, -0.6, 0.6, 0.8, 3.4], [-1.4, -1.8, 3.4, -0.6, -0.6, 0.8, 3.4], [-3.2, 0, 2.6, -1, 0, 0.6, 3.6], [-2.6, 2.6, 1.2, -0.7, 0.8, -0.2, 3.0], [-2.6, -2.6, 1.2, -0.7, -0.8, -0.2, 3.0]]) {
      const b0 = V.add(V.add(V.mad(hd, fwd, f), V.mul(sideR, s)), V.mul(up, z)), d = V.norm(V.add(V.add(V.mul(fwd, df), V.mul(sideR, ds)), V.mul(up, dz)));
      r.cone(b0, V.mad(b0, d, l), 1.8, 0.4, hm, { noShadow: true });
    }
    r.cone(V.add(V.mad(hd, up, 0.8), V.mul(fwd, -3.8)), V.add(V.mad(hd, up, -4.2), V.mul(fwd, -4.8)), 2.6, 1.0, hm);
  });
  r.cyl(V.mad(hd, up, 1.1), V.mad(hd, up, 2.2), 4.85, M.CLOTH_RED);   // the red war band, low on the brow
  for (const s of [-1, 1]) r.cone(V.add(V.mad(hd, up, 1.6), V.mul(fwd, -4.4)), V.add(V.add(V.mad(hd, up, -1.0), V.mul(fwd, -6.2)), V.mul(sideR, s * 1.2)), 0.8, 0.5, M.CLOTH_RED);   // its tails behind
};
GEAR_EXTRA.helm.b_wolfhood = (r, { hd, fwd, up, sideR, helmF, eq }) => {   // a grey wolf's head worn as a hood: the snout over the brow, ears up, the pelt down the back
  barbFace(r, hd, fwd, up, sideR, helmF, eq, { under: 2, noEars: true });
  const hc = V.add(V.mad(hd, up, 1.0), V.mul(fwd, -1.0));
  r.group(() => {
    r.ell(hc, [4.6, 4.7, 4.8], M.FUR, helmF);
    r.cone(V.add(V.mad(hd, up, 3.6), V.mul(fwd, 2.2)), V.add(V.mad(hd, up, 3.1), V.mul(fwd, 6.4)), 2.1, 1.0, M.FUR);
    r.cone(V.add(V.mad(hd, up, 1.0), V.mul(fwd, -4.0)), V.add(V.mad(hd, up, -4.5), V.mul(fwd, -5.6)), 3.0, 1.2, M.FUR);
  });
  r.sph(V.add(V.mad(hd, up, 3.2), V.mul(fwd, 6.6)), 0.8, M.DARK, { noShadow: true });
  for (const s of [-1, 1]) { r.sph(V.add(V.add(V.mad(hd, up, 3.9), V.mul(fwd, 3.6)), V.mul(sideR, s * 1.5)), 0.5, M.EYE_YEL, { noShadow: true }); r.cone(V.add(V.mad(hd, up, 4.6), V.mul(sideR, s * 2.4)), V.add(V.add(V.mad(hd, up, 7.6), V.mul(sideR, s * 2.8)), V.mul(fwd, -0.6)), 1.3, 0.2, M.FUR); }
};
GEAR_EXTRA.helm.b_skull = (r, { hd, fwd, up, sideR, helmF, eq }) => {   // a bear's skull: a bone cap with dark eye holes over his brow, tusks down beside the face
  barbFace(r, hd, fwd, up, sideR, helmF, eq, { under: 1 });
  const hc = V.mad(hd, up, 2.3);
  r.ell(hc, [4.9, 4.7, 3.5], M.BONE, helmF, { mf: p => { const q = V.sub(p, hc), f = V.dot(q, fwd), s = V.dot(q, sideR), z = V.dot(q, up); return f > 2.4 && Math.abs(Math.abs(s) - 1.9) < 1.15 && Math.abs(z - 0.5) < 1.1 ? M.DARK : z < -2.4 ? M.HIDE : 0; } });   // (pass 2: sockets that read)
  const mz = V.add(V.mad(hd, up, 1.4), V.mul(fwd, 4.6));
  r.box(mz, [1.8, 1.6, 1.1], M.BONE, helmF, { mf: p => V.dot(V.sub(p, mz), up) < -0.5 && Math.abs(((V.dot(V.sub(p, mz), sideR) + 10) * 1.4) % 1) < 0.4 ? M.DARK : 0 });   // the muzzle, its teeth over the brow
  r.sph(V.add(V.mad(hd, up, 1.9), V.mul(fwd, 6.3)), 0.6, M.DARK, { noShadow: true });
  for (const s of [-1, 1]) r.cone(V.add(V.add(V.mad(hd, up, 0.8), V.mul(fwd, 3.6)), V.mul(sideR, s * 2.4)), V.add(V.add(V.mad(hd, up, -2.0), V.mul(fwd, 4.4)), V.mul(sideR, s * 2.8)), 0.9, 0.2, M.BONE);
};
GEAR_EXTRA.helm.b_horns = (r, { hd, fwd, up, sideR, helmF, eq }) => {   // an iron cap with great curling ram's horns
  barbFace(r, hd, fwd, up, sideR, helmF, eq, { under: 1 });
  const hc = V.mad(hd, up, 2.1);
  r.ell(hc, [4.7, 4.6, 3.5], M.IRON, helmF, { mf: p => V.dot(V.sub(p, hc), up) < -1.8 ? M.LEATHER : 0 });
  r.box(V.add(V.mad(hd, up, 0.3), V.mul(fwd, 4.5)), [0.5, 0.6, 1.8], M.IRON, helmF);
  for (const s of [-1, 1]) {   // each horn: out from the temple, back, down and forward again
    const pts = [[0.4, 3.6, 2.6], [-1.0, 6.0, 3.8], [-3.2, 7.4, 2.4], [-3.0, 7.6, -0.4], [-0.8, 6.8, -1.6], [0.8, 6.0, -0.6]].map(([f, w, z]) => V.add(V.add(V.mad(hd, fwd, f), V.mul(sideR, s * w)), V.mul(up, z)));
    for (let k = 0; k + 1 < pts.length; k++) r.cone(pts[k], pts[k + 1], 1.6 - k * 0.22, 1.6 - (k + 1) * 0.22, M.HORN);
  }
};

// ---------------------------------------------------------------- the second weapon
{ const rc0 = recalcHero; recalcHero = function (...a) {
  if (isBarb() && hero.equip.shield && !isWeapon(hero.equip.shield)) { hero.bag.push(hero.equip.shield); hero.equip.shield = null; }   // (an old warrior save: the shield goes to the bag)
  const r = rc0(...a);
  if (!isBarb()) { hero.look.offhand = ''; return r; }
  const off = hero.equip.shield;
  hero.look.shield = 'none';
  if (isWeapon(off)) {
    const s = itemStats(off), pct = 1 + ((STAT.mods && STAT.mods.dmgPct) || 0) / 100 + hero.lvl * 0.03;   // half its blow adds to his
    STAT.dmg = [STAT.dmg[0] + Math.round(s.dmg[0] * 0.5 * pct), STAT.dmg[1] + Math.round(s.dmg[1] * 0.5 * pct)];
    hero.look.offhand = ITEM_BASES[off.base].look; hero.look.offEnch = (off.mods && (off.mods.fireDmg ? 'fire' : off.mods.chill ? 'cold' : '')) || '';
  } else { hero.look.offhand = ''; hero.look.offEnch = ''; }
  return r;
}; }
// a one-hander goes to the empty hand, else replaces the weaker of the two; a two-hander frees the off hand
{ const eq0 = equipItem; equipItem = function (it) {
  if (!isBarb() || !isWeapon(it)) return eq0(it);
  const main = hero.equip.weapon, off = hero.equip.shield, take = () => { const i = hero.bag.indexOf(it); if (i >= 0) hero.bag.splice(i, 1); };
  if (barbTwo(it)) { if (off) { hero.bag.push(off); hero.equip.shield = null; } return eq0(it); }
  if (!main || barbTwo(main)) return eq0(it);
  const sort = () => { const m = hero.equip.weapon, o = hero.equip.shield; if (m && o && itemScore(o) > itemScore(m)) { hero.equip.weapon = o; hero.equip.shield = m; } };   // the better blade in the main hand (it hits for all of it; the other for half)
  if (!off) { take(); hero.equip.shield = it; sort(); recalcHero(); prewarmHero(); return true; }
  if (itemScore(off) <= itemScore(main)) { take(); hero.bag.push(off); hero.equip.shield = it; sort(); recalcHero(); prewarmHero(); return true; }
  return eq0(it);
}; }
{ const up0 = upgradeOf; upgradeOf = function (it) {
  if (!isBarb() || !isWeapon(it) || barbTwo(it) || !canWear(it)) return up0(it);
  const main = hero.equip.weapon, off = hero.equip.shield;
  if (!main || barbTwo(main)) return up0(it);
  if (!off) return 1;
  const weak = Math.min(itemScore(main), itemScore(off)), d = itemScore(it) - weak;
  return d > 0.5 ? 1 : d < -0.5 ? -1 : 0;
}; }
{ const bu0 = bestUpgrades; bestUpgrades = function () {
  const out = bu0(); if (!isBarb()) return out;
  const w = out.find(isWeapon), main = hero.equip.weapon, off = hero.equip.shield;
  if ((w && barbTwo(w)) || (!w && main && barbTwo(main))) return out;
  const ones = hero.bag.filter(it => isWeapon(it) && !barbTwo(it) && canWear(it) && it !== w).sort((p, q) => itemScore(q) - itemScore(p));
  const keep = w || main; if (!keep || !ones[0]) return out;
  if (!off || itemScore(ones[0]) > itemScore(off) + 0.5) out.push(ones[0]);
  return out;
}; }

// ---------------------------------------------------------------- his name and his first kit
if (typeof CLASS_INFO !== 'undefined') CLASS_INFO.warrior = { name: 'BARBARIAN', col: 22, lines: ['AN AXE IN EACH HAND', 'FIGHTS UP CLOSE'] };
{ const nh0 = newHero; newHero = function (cls, ...rest) {
  const r = nh0(cls, ...rest);
  if (cls === 'warrior' || (!cls && isBarb())) {   // a hand axe, a short sword in the other hand, hide wraps and a war band
    const mk = id => { const it = rollItem(rng(7), 1, id); it.rarity = 'normal'; it.mods = {}; return it; };
    hero.equip.weapon = mk('hand_axe'); hero.equip.shield = mk('short_sword'); hero.equip.chest = mk('b_hide'); hero.equip.helm = mk('b_band');
    recalcHero();
  }
  return r;
}; }

// ---------------------------------------------------------------- his skills: no shield to charge behind
// Shield Charge becomes BULL RUSH, the same run led with the shoulder, both blades trailing (the rig's
// 'bash' pose); the swings already alternate hands, so Flurry and the combo cut left, right, left.
{ const ch = SKILLSETS.warrior.find(s => s.id === 'charge'); if (ch) ch.name = 'BULL RUSH'; }
if (typeof SKILL_TEXT !== 'undefined') Object.assign(SKILL_TEXT, {
  charge: 'LOWER YOUR SHOULDER AND RUN A LONG WAY, STRAIGHT THROUGH EVERY FOE IN THE WAY. NOTHING CAN HURT YOU AS YOU RUN. IT GOES WHERE YOU STEER.',
  'charge/again': 'AFTER A RUSH YOU MAY RUSH ONCE MORE WITHIN 2 SECONDS, FREE, ANY WAY YOU LIKE.',
  whirl: 'SPIN WITH BOTH BLADES OUT, HITTING ALL AROUND YOU AGAIN AND AGAIN. YOU CAN MOVE AS YOU SPIN.',
});
{ const ag = (SKILL_MODS.charge || []).find(m => m.id === 'again'); if (ag) ag.desc = 'RUSH A SECOND TIME WITHIN 2 SECONDS, FREE'; }
// the Bull Rush button: a bull's head with its horns low, speed lines behind (was a shield)
if (typeof SPELL_LOOK !== 'undefined' && SPELL_LOOK.charge) SPELL_LOOK.charge[1] = (cx, cy) => {
  for (let b = -3; b <= 4; b++) for (let a = -3; a <= 3; a++) if (a * a / 10 + (b - 0.5) * (b - 0.5) / 16 <= 1) put(cx + 1 + a, cy + b, b > 2 ? 29 : a < -1 ? 30 : 29);   // the head
  put(cx, cy, 50); put(cx + 2, cy, 50);   // eyes
  for (const s of [-1, 1]) for (let k = 0; k <= 8; k++) { const u = k / 8; put(cx + 1 + s * (3 + u * 4), cy - 2 - Math.sin(u * 2.6) * 4, u > 0.75 ? 31 : 27); put(cx + 1 + s * (3 + u * 4), cy - 1 - Math.sin(u * 2.6) * 4, 30); }   // horns
  for (const [y0, x0, x1] of [[-4, -12, -7], [1, -13, -6], [5, -12, -7]]) line(cx + x0, cy + y0, cx + x1, cy + y0, 27);
};

// ---------------------------------------------------------------- bag icons for his four helms (they borrowed the cap and horned helm)
// (the icon camera sits out along +x, 30 degrees up: things pointing at it foreshorten, so snouts point down and horns curl sideways)
{ const ic0 = itemIcon; itemIcon = function (it) {
  const B = ITEM_BASES[it.base]; if (!B || B.slot !== 'helm' || !/^b_/.test(B.look || '')) return ic0(it);
  const k = B.look; if (iconCache[k]) return iconCache[k];
  const r = new Rig(), L = B.look, HR = M.HAIR_O || M.FUR;
  if (L === 'b_band') {   // wild hair, the red band round it, two tails
    r.ell([0, 0, 3.4], [5.0, 5.0, 4.0], HR);
    for (const [y, z] of [[-3.4, 6.6], [-1.4, 7.6], [0.8, 7.8], [2.8, 7.0], [4.2, 5.4], [-4.4, 5.2]]) r.cone([-0.5, y * 0.75, z - 3], [-1.6, y * 1.25, z + 2.6], 1.7, 0.3, HR);
    r.cyl([0, 0, 1.6], [0, 0, 3.0], 5.4, M.CLOTH_RED); r.sph([5.3, 1.4, 2.3], 1.0, M.BONE);
    r.cone([-4.6, -1.4, 2.4], [-6.5, -3.6, -2.2], 1.1, 0.6, M.CLOTH_RED); r.cone([-4.6, 1.4, 2.4], [-6.0, 3.2, -1.6], 1.1, 0.6, M.CLOTH_RED);
  } else if (L === 'b_wolfhood') {   // a wolf's head worn as a hood: muzzle out and down, yellow eyes, tall ears
    r.ell([0, 0, 4.2], [5.2, 5.2, 5.0], M.FUR, null, { mf: p => p[0] > 3.4 && p[2] < 2.6 && Math.abs(p[1]) < 3.0 ? M.DARK : 0 });
    r.cone([3.2, 0, 4.6], [7.4, 0, 0.6], 2.6, 1.2, M.FUR); r.sph([7.4, 0, 0.6], 1.2, M.DARK);
    for (const s of [-1, 1]) { r.cone([0.4, s * 2.8, 7.4], [-0.2, s * 4.0, 12], 1.7, 0.3, M.FUR); r.sph([4.5, s * 2.0, 5.0], 1.0, M.EYE_YEL, { noShadow: true }); }
    r.ell([-2, 0, -0.6], [3.6, 5.6, 1.8], M.FUR);
  } else if (L === 'b_skull') {   // a bear's skull: domed brow, deep sockets, the muzzle with its teeth
    r.ell([0, 0, 4.4], [5.4, 5.0, 4.6], M.BONE, null, { mf: p => p[0] > 3.4 && Math.abs(Math.abs(p[1]) - 2.0) < 1.2 && Math.abs(p[2] - 4.4) < 1.2 ? M.DARK : 0 });
    r.box([5.6, 0, 1.6], [2.4, 2.6, 1.8], M.BONE, null, { mf: p => p[2] < 0.6 && Math.abs(p[1] * 2 % 1.2) < 0.5 ? M.DARK : p[0] > 7.6 && p[2] > 2.2 ? M.DARK : 0 });
    for (const s of [-1, 1]) r.sph([0, s * 4.4, 7.2], 1.3, M.BONE);
  } else {   // b_horns: an iron cap with a leather rim and a nasal, ram's horns curling out and down each side
    r.ell([0, 0, 3.0], [5.0, 4.8, 4.0], M.IRON, null, { mf: p => Math.abs(p[2] - 0.4) < 0.8 ? M.LEATHER : 0 }); r.box([5.0, 0, 0.6], [0.5, 0.7, 2.2], M.IRON);
    for (const s of [-1, 1]) { let p0 = [0, s * 3.8, 4.6]; for (let q = 1; q <= 6; q++) { const a = q * 0.62, p1 = [0.6 * q / 6, s * (4.4 + Math.sin(a) * 3.6), 2.2 + Math.cos(a) * 3.4]; r.cone(p0, p1, 2.3 - q * 0.22, 2.1 - q * 0.22, M.HORN); p0 = p1; } }
  }
  return (iconCache[k] = renderRig(r, Math.PI / 4, 26, 26, 13, 17));
}; }
