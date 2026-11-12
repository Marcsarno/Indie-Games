'use strict';
// round 110: the Barbarian's three armor SETS, from the user's concept sheets (art/refs/gear/round110/17-19).
// Each is a helm, a chest and a one-handed weapon (so he can carry two), new bases (bs_*) that drop only as
// set items (rollSetItem, his class only, from an area level near the set's), each with its own look; two
// pieces worn finish the concept's look (hero.look.set): war paint, belt charms, a weapon that burns or freezes.
//   BLOODMOON REAVER (level 5, Act I's barrow): wolf skull, red fur mantle, a skull on the shoulder, bone axe.
//                    2: +2 life per hit; 3: rage builds 40% faster.
//   FROSTJAW CLAN (level 10, Act II): white bear's head and pelt, frost-blue paint, an ice-rimmed hand axe.
//                    2: 25% chance to chill; 3: +20 armor.
//   ASHEN WARLORD (level 15, Act III): a horned skull with brass rings and ember eyes, black fur, an ember cleaver.
//                    2: +6 fire damage; 3: Whirlwind leaves burning ground.
// Everything here hooks in from outside (wrapped functions, the shared look tables); no other file is changed.

// ---------------------------------------------------------------- the bases (set-only: never a plain drop)
Object.assign(ITEM_BASES, {
  bs_blood_helm: { slot: 'helm', look: 'bs_blood_helm', name: 'WOLF SKULL', armor: 8, cls: 'warrior', lvl: 5, setOnly: true },
  bs_blood_chest: { slot: 'chest', look: 'bs_blood_chest', name: 'CRIMSON MANTLE', armor: 15, cls: 'warrior', lvl: 5, icon: 'brigandine', tint: 'CLOTH_RED', setOnly: true },
  bs_blood_axe: { slot: 'weapon', look: 'bs_blood_axe', name: 'BONE AXE', dmg: [8, 19], cls: 'warrior', lvl: 5, slow: true, icon: 'axe', setOnly: true },
  bs_frost_helm: { slot: 'helm', look: 'bs_frost_helm', name: "BEAR'S HEAD", armor: 11, cls: 'warrior', lvl: 10, setOnly: true },
  bs_frost_chest: { slot: 'chest', look: 'bs_frost_chest', name: 'WHITE BEARSKIN', armor: 20, cls: 'warrior', lvl: 10, icon: 'brigandine', tint: 'CLOTH_WHITE', setOnly: true },
  bs_frost_axe: { slot: 'weapon', look: 'bs_frost_axe', name: 'RIME AXE', dmg: [12, 29], cls: 'warrior', lvl: 10, slow: true, icon: 'axe', setOnly: true },
  bs_ash_helm: { slot: 'helm', look: 'bs_ash_helm', name: 'HORNED SKULL', armor: 13, cls: 'warrior', lvl: 15, setOnly: true },
  bs_ash_chest: { slot: 'chest', look: 'bs_ash_chest', name: 'ASHEN FURS', armor: 24, cls: 'warrior', lvl: 15, icon: 'brigandine', tint: 'CLOTH_DARK', setOnly: true },
  bs_ash_axe: { slot: 'weapon', look: 'bs_ash_axe', name: 'EMBER CLEAVER', dmg: [16, 38], cls: 'warrior', lvl: 15, slow: true, icon: 'axe', setOnly: true },
});
Object.assign(SETS, {
  bloodmoon: { name: 'BLOODMOON REAVER', cls: 'warrior', minLvl: 5, pieces: [['bs_blood_helm', 'BLOODMOON SKULL'], ['bs_blood_chest', 'BLOODMOON MANTLE'], ['bs_blood_axe', 'BLOODMOON CLEAVER']],
    bonus: [{ hpHit: 2 }, { rageK: 40 }], lines: ['2: +2 LIFE PER HIT', '3: RAGE BUILDS 40% FASTER'] },
  frostjaw: { name: 'FROSTJAW CLAN', cls: 'warrior', minLvl: 10, pieces: [['bs_frost_helm', 'FROSTJAW MAW'], ['bs_frost_chest', 'FROSTJAW PELT'], ['bs_frost_axe', 'FROSTJAW BITE']],
    bonus: [{ chill: 25 }, { armorFlat: 20 }], lines: ['2: 25% CHANCE TO CHILL', '3: +20 ARMOR'] },
  ashen: { name: 'ASHEN WARLORD', cls: 'warrior', minLvl: 15, pieces: [['bs_ash_helm', 'ASHEN CROWN'], ['bs_ash_chest', 'ASHEN MANTLE'], ['bs_ash_axe', 'ASHEN BUTCHER']],
    bonus: [{ fireDmg: 6 }, { whirlFire: 1 }], lines: ['2: +6 FIRE DAMAGE', '3: WHIRLWIND LEAVES FIRE'] },
});
const BS_SETS = ['bloodmoon', 'frostjaw', 'ashen'];
// heavy one-handers (round 109 MELEE_K: '1hH', or 'dualH' with a second one-hander)
Object.assign(GEAR_SWING, { bs_blood_axe: 'heavy', bs_frost_axe: 'heavy', bs_ash_axe: 'heavy' });
Object.assign(GEAR_LEN, { bs_blood_axe: 16, bs_frost_axe: 16, bs_ash_axe: 16 });
for (const id of ['bs_blood_chest', 'bs_frost_chest', 'bs_ash_chest']) WARRIOR_SETS[id] = { base: 'brigandine' };   // drawn like the barbarian's own tiers: the brigandine stripped to skin

// ---------------------------------------------------------------- drops
// rollSetItem has no level: rollItem's is kept while it runs (called on its own, by a champion's death or
// the smith's showcase: the area's level, or the hero's in town). A set comes only from a level within one
// of its own (minLvl), and its pieces are never plain drops (rerolled).
let bsRollLvl = null;
const bsLvlNow = () => bsRollLvl != null ? bsRollLvl : Math.max((typeof LV !== 'undefined' && LV.diff) || 1, typeof LV !== 'undefined' && LV.hub && typeof hero !== 'undefined' ? hero.lvl + 1 : 0);
{ const ri0 = rollItem; rollItem = function (R, level, forceBase) {
  const was = bsRollLvl; bsRollLvl = level;
  try {
    let it = ri0(R, level, forceBase);
    for (let n = 0; !forceBase && it && ITEM_BASES[it.base] && ITEM_BASES[it.base].setOnly && it.rarity !== 'set' && n < 16; n++) it = ri0(R, level, forceBase);
    return it;
  } finally { bsRollLvl = was; }
}; }
{ const rs0 = rollSetItem; rollSetItem = function (R) {
  if (heroCls() !== 'warrior') return rs0(R);   // (the other classes never see these sets: forCls)
  const ok = pc => forCls(ITEM_BASES[pc[0]]);
  const keys = Object.keys(SETS).filter(k => forCls(SETS[k]) && SETS[k].pieces.some(ok) && !(SETS[k].minLvl > bsLvlNow() + 1));
  if (!keys.length) return rs0(R);
  const k = R.pick(keys), [base, name] = R.pick(SETS[k].pieces.filter(ok));
  return { id: itemSerial++, base, rarity: 'set', set: k, name, mods: { [ITEM_BASES[base].slot === 'weapon' ? 'dmgPct' : 'armorFlat']: R.int(3, 6), hp: R.int(8, 16) } };
}; }

// ---------------------------------------------------------------- bonuses
// hpHit (life on every melee hit), rageK (rage gain, %), whirlFire (Whirlwind leaves burning ground):
// summed from worn pieces and set bonuses into STAT after recalcHero. Two copies of one set weapon (main
// and off hand) count once. Two pieces also enchant his weapons' look: Frostjaw rimed, Ashen burning.
const BS_STATS = ['hpHit', 'rageK', 'whirlFire'];
{ const rc0 = recalcHero; recalcHero = function (...a) {
  const e = hero.equip, w = e.weapon, off = e.shield; let hid = null;
  if (w && off && w.set && off.set === w.set && off.base === w.base) { hid = off.set; off.set = undefined; }
  let r;
  try { r = rc0(...a); } finally { if (hid) off.set = hid; }
  const m = {};
  for (const s in e) if (e[s] && e[s].mods) for (const k of BS_STATS) if (e[s].mods[k]) m[k] = (m[k] || 0) + e[s].mods[k];
  for (const k in SETS) {
    const seen = new Set(), n = Object.values(e).filter(it => it && it.set === k && !seen.has(it.base) && seen.add(it.base)).length;
    SETS[k].bonus.forEach((bn, i) => { if (n >= i + 2) for (const s of BS_STATS) if (bn[s]) m[s] = (m[s] || 0) + bn[s]; });
  }
  for (const k of BS_STATS) STAT[k] = m[k] || 0;
  const L = hero.look, en = L.set === 'frostjaw' ? 'cold' : L.set === 'ashen' ? 'fire' : '';
  if (en) { if (!L.ench) L.ench = en; if (L.offhand && !L.offEnch) L.offEnch = en; }
  return r;
}; }
{ const de0 = damageEnemy; damageEnemy = function (e, dmg, fromFi, fromFj, crit, pow, ranged) {   // Bloodmoon: life on hit (melee)
  const live = !!e && alive(e), r = de0.apply(this, arguments);
  if (STAT.hpHit && live && !ranged && !hero.dead && hero.hp > 0) hero.hp = Math.min(STAT.maxHp, hero.hp + STAT.hpHit);
  return r;
}; }
{ const ra0 = rageAdd; rageAdd = function (g, ...a) { return ra0(g * (1 + (STAT.rageK || 0) / 100), ...a); }; }   // Bloodmoon: faster rage
{ const us0 = updateSkills; updateSkills = function (dt, ...a) {   // Ashen: a trail of burning ground behind the Whirlwind
  const r = us0(dt, ...a);
  if (STAT.whirlFire && hero.whirl > 0) {
    hero.bsFireT = (hero.bsFireT || 0) - dt;
    if (hero.bsFireT <= 0) {
      const last = hero.bsFireAt, far = !last || Math.hypot(last[0] - hero.fi, last[1] - hero.fj) > 0.5;
      hero.bsFireT = far ? 0.22 : 0.45;
      if (far || G.fireGround.length < 40) { G.fireGround.push({ fi: hero.fi, fj: hero.fj, r: 1.25, t: 3, tick: 0.25, bs: 1 }); hero.bsFireAt = [hero.fi, hero.fj]; }
      if (G.fireGround.length > 48) G.fireGround.splice(G.fireGround.findIndex(g => g.bs), 1);
    }
  } else hero.bsFireT = 0;
  return r;
}; }

// ---------------------------------------------------------------- the face under each helm, with the set's war paint
// paint(f, s, z) in the head's frame (forward, his right, up) returns a material or 0; eyes and hair stay
function bsFace(r, hd, fwd, up, sideR, helmF, eq, o, paint) {
  const hm = HAIRM[eq && eq.hair] || M.HAIR_O, fm = faceMf(hd, fwd, sideR, up, Object.assign({ hair: hm }, o));
  r.ell(hd, [4.3, 4.3, 4.5], M.FACE, helmF, { mf: !paint ? fm : p => { const v = fm(p); if (v === M.EYE || v === M.GLINT || v === hm) return v; const q = V.sub(p, hd); return paint(V.dot(q, fwd), V.dot(q, sideR), V.dot(q, up)) || v; } });
  faceParts(r, hd, fwd, sideR, up, !o.noEars);
  return hm;
}
const at3 = (c, fwd, sideR, up, f, s, z) => V.add(V.add(V.mad(c, fwd, f), V.mul(sideR, s)), V.mul(up, z));
const BS_PAINT = {
  bloodmoon: (f, s, z) => f > 1.2 && z > -1.5 && z < 0.95 ? M.CLOTH_RED : 0,   // a crimson band across the eyes
  frostjaw: (f, s, z) => f > 1.6 && Math.abs(s) > 1.0 && Math.abs(s) < 3.0 && z < -0.9 && z > -2.6 && Math.abs(((z + 10) * 1.6) % 1 - 0.5) < 0.28 ? M.CLOTH_BLUE : 0,   // blue stripes down both cheeks
};

// ---------------------------------------------------------------- helms
GEAR_EXTRA.helm.bs_blood_helm = (r, { hd, fwd, up, sideR, helmF, eq }) => {   // a wolf's skull: bone cap with dark sockets, the snout over his brow, tall pointed ears; his hair loose behind
  const set = eq && eq.set === 'bloodmoon', hm = bsFace(r, hd, fwd, up, sideR, helmF, eq, { under: 1 }, set ? BS_PAINT.bloodmoon : null);
  r.cone(at3(hd, fwd, sideR, up, -3.4, 0, 0.6), at3(hd, fwd, sideR, up, -4.8, 0, -4.4), 2.8, 1.4, hm);   // hair down the back
  const hc = V.mad(hd, up, 3.3);   // (pass 2: raised: it hid his face)
  r.group(() => {
    r.ell(hc, [5.0, 4.8, 3.4], M.BONE, helmF, { mf: p => { const q = V.sub(p, hc), f = V.dot(q, fwd), s = V.dot(q, sideR), z = V.dot(q, up); return f > 2.2 && Math.abs(Math.abs(s) - 1.9) < 1.05 && z > -1.2 && z < 0.6 ? M.DARK : 0; } });
    r.cone(at3(hd, fwd, sideR, up, 3.2, 0, 3.3), at3(hd, fwd, sideR, up, 6.4, 0, 2.5), 1.9, 1.0, M.BONE);   // the snout
  });
  r.sph(at3(hd, fwd, sideR, up, 6.7, 0, 2.7), 0.75, M.DARK, { noShadow: true });   // its nose
  for (const s of [-1, 1]) {
    r.cone(at3(hd, fwd, sideR, up, 5.6, s * 0.8, 1.7), at3(hd, fwd, sideR, up, 5.8, s * 0.9, 0.8), 0.5, 0.15, M.BONE, { noShadow: true });   // fangs
    r.cone(at3(hd, fwd, sideR, up, -0.4, s * 2.6, 5.6), at3(hd, fwd, sideR, up, -0.6, s * 3.4, 9.4), 1.6, 0.2, M.BONE);   // ears
  }
};
GEAR_EXTRA.helm.bs_frost_helm = (r, { hd, fwd, up, sideR, helmF, eq }) => {   // a white bear's head worn as a hood: round ears, a broad snout, fangs over his brow, the pelt down the back
  const set = eq && eq.set === 'frostjaw';
  bsFace(r, hd, fwd, up, sideR, helmF, eq, { under: 2, noEars: true }, set ? BS_PAINT.frostjaw : null);
  const hc = at3(hd, fwd, sideR, up, -1.4, 0, 1.9);   // (pass 2: higher and back: his face shows under the jaw)
  r.group(() => {
    r.ell(hc, [4.8, 5.0, 4.7], M.CLOTH_WHITE, helmF);
    r.cone(at3(hd, fwd, sideR, up, 2.2, 0, 4.0), at3(hd, fwd, sideR, up, 5.8, 0, 3.4), 2.4, 1.6, M.CLOTH_WHITE);   // the snout
    r.cone(at3(hd, fwd, sideR, up, -4.0, 0, 0.8), at3(hd, fwd, sideR, up, -4.8, 0, -3.6), 2.8, 1.6, M.CLOTH_WHITE);   // the pelt down the back (pass 2: smaller)
    for (const s of [-1, 1]) r.sph(at3(hd, fwd, sideR, up, -1.0, s * 3.5, 6.0), 1.6, M.CLOTH_WHITE);   // round ears
  });
  r.sph(at3(hd, fwd, sideR, up, 6.6, 0, 3.8), 1.0, M.DARK, { noShadow: true });   // the nose
  for (const s of [-1, 1]) {
    r.sph(at3(hd, fwd, sideR, up, 3.8, s * 1.7, 5.2), 0.55, M.DARK, { noShadow: true });   // its eyes
    r.cone(at3(hd, fwd, sideR, up, 4.2, s * 2.1, 2.4), at3(hd, fwd, sideR, up, 4.6, s * 2.3, 1.0), 0.7, 0.15, M.BONE, { noShadow: true });   // upper fangs over the brow
  }
};
GEAR_EXTRA.helm.bs_ash_helm = (r, { hd, fwd, up, sideR, helmF, eq }) => {   // a horned skull: bone with ember eyes, black horns ringed in brass sweeping out and up
  const set = eq && eq.set === 'ashen';
  bsFace(r, hd, fwd, up, sideR, helmF, eq, { under: 1 });
  const hc = V.mad(hd, up, 2.4);   // (pass 1 kept: raising it to show his face (pass 2, 3) lost the skull's read in both orders)
  r.ell(hc, [5.0, 4.8, 3.7], M.BONE, helmF, { mf: p => { const q = V.sub(p, hc), f = V.dot(q, fwd), s = V.dot(q, sideR), z = V.dot(q, up);
    if (f > 2.2 && Math.abs(Math.abs(s) - 1.8) < 1.05 && z > -1.1 && z < 0.9) return set ? M.FIREM : M.DARK;   // the sockets (two pieces: ablaze)
    if (f > 3.0 && Math.abs(s) < 0.5 && z < -1.3) return M.DARK; return z < -2.7 ? M.HIDE : 0; } });
  for (const s of [-1, 1]) if (!set) r.sph(at3(hd, fwd, sideR, up, 4.4, s * 1.8, 2.3), 0.6, M.FIREM, { noShadow: true });   // an ember in each socket
  r.box(at3(hd, fwd, sideR, up, 4.3, 0, 0.3), [0.6, 2.0, 0.55], M.BONE, helmF, { mf: p => Math.abs(((V.dot(V.sub(p, hd), sideR) + 10) * 1.3) % 1 - 0.5) < 0.14 ? M.DARK : 0 });   // the upper teeth over his brow
  for (const s of [-1, 1]) {
    const pts = [[0.4, 3.4, 3.6], [0.2, 5.8, 4.6], [-0.2, 7.4, 6.6], [-0.1, 7.6, 9.2], [0.5, 6.6, 11.2]].map(([f, w, z]) => at3(hd, fwd, sideR, up, f, s * w, z));
    for (let k = 0; k + 1 < pts.length; k++) r.cone(pts[k], pts[k + 1], 1.7 - k * 0.32, 1.7 - (k + 1) * 0.32, M.CLOTH_DARK);
    for (const k of [1, 2]) { const d = V.norm(V.sub(pts[k + 1], pts[k])); r.cyl(V.mad(pts[k], d, -0.2), V.mad(pts[k], d, 0.6), 1.85 - k * 0.32, M.GOLD); }   // brass rings
  }
};

// ---------------------------------------------------------------- chests (CHEST_RETOUCH: the brigandine stripped to skin, as barbarian.js)
CHEST_RETOUCH.bs_blood_chest = (r, J, S) => {   // bare chest slashed with crimson paint, a red fur mantle, a wolf skull on the right shoulder, red bracers, red kilt
  const { chest, abd, pel, A, L, mat, belt, skirt, paint, loc } = S; barbBare(S);
  const slash = p => { const [f, s, z] = loc(p); if (f < 0.8 || z < -4 || z > 3.4) return 0; const d = z + s * 0.9; return Math.abs(d - 0.6) < 0.45 || Math.abs(d + 1.4) < 0.45 ? M.CLOTH_RED : 0; };
  paint(chest, slash); paint(abd, slash);
  barbMantle(r, J, M.CLOTH_RED, 1.1);
  const { fwd, up, sideR } = J, sk = at3(J.chest, fwd, sideR, up, 0.6, 6.2, 6.0);
  r.group(() => {
    r.sph(sk, 3.1, M.BONE, { mf: p => { const q = V.sub(p, sk), f = V.dot(q, fwd), s = V.dot(q, sideR), z = V.dot(q, up); return f > 1.5 && Math.abs(Math.abs(s) - 1.1) < 0.6 && Math.abs(z - 0.4) < 0.6 ? M.DARK : 0; } });
    r.cone(V.mad(sk, fwd, 1.4), at3(sk, fwd, sideR, up, 4.2, 0, -0.8), 1.5, 0.9, M.BONE);   // its snout, over the shoulder
  });
  r.sph(at3(sk, fwd, sideR, up, 4.4, 0, -0.6), 0.55, M.DARK, { noShadow: true });
  mat(A('fore'), M.CLOTH_RED); for (const q of A('fore')) { if (!q) continue; const a = q.a; paint(q, p => { const t = V.len(V.sub(p, a)); return t > 0.8 && Math.abs((t * 1.1) % 1.8 - 0.9) < 0.3 ? M.LEATHER : 0; }); }   // red wraps bound with leather
  mat([pel, ...L('thigh')], M.LEATHER); mat(L('boot'), M.BARK);
  belt(M.LEATHER);
  const bc = V.mad(V.mad(J.pelvis, up, 3.0), fwd, (3.8 + S.bulk * 1.4) * S.K + 0.9);
  r.ell(bc, [0.7, 1.7, 1.7], M.CLOTH_RED, frameAlong(fwd, up), { mf: p => V.len(V.sub(p, bc)) > 1.35 ? M.GOLD : 0 });   // the red disc on the belt
  skirt(M.LEATHER, { front: 4.4, fw: 3.0, fm: M.CLOTH_RED, side: 3.2, back: 4.4, smf: p => V.dot(V.sub(p, J.pelvis), fwd) < -2 ? M.CLOTH_RED : 0 });
};
CHEST_RETOUCH.bs_frost_chest = (r, J, S) => {   // a great white bear pelt over the shoulders, a frost-blue stripe across the bare chest, iron armbands, a white fur kilt with a blue flap
  const { chest, abd, pel, A, L, mat, belt, skirt, paint } = S; barbBare(S);
  const st = barbStrap(S, -1, 0.85); paint(chest, p => st(p) ? M.CLOTH_BLUE : 0); paint(abd, p => st(p) ? M.CLOTH_BLUE : 0);
  barbMantle(r, J, M.CLOTH_WHITE, 1.08);
  const { fwd, up, sideR } = J, mc = V.mad(J.chest, up, 3.4);
  r.group(() => { for (let k = 0; k < 9; k++) { const a = (k / 9 - 0.5) * Math.PI * 1.1; r.sph(V.add(mc, V.add(V.mul(fwd, Math.cos(a) * 4.2 - 0.4), V.mul(sideR, Math.sin(a) * 6.4))), 1.6, M.CLOTH_WHITE); } });   // shaggy tufts round its front edge
  for (const q of A('fore')) { if (!q) continue; const b = q.b; paint(q, p => V.len(V.sub(p, b)) < 2.0 ? M.IRON : 0); }   // iron bands at the wrists
  for (const q of A('sleeve')) { if (!q) continue; const b = q.b; paint(q, p => Math.abs(V.len(V.sub(p, b)) - 1.6) < 0.7 ? M.IRON : 0); }   // and above the elbows
  mat([pel, ...L('thigh')], M.LEATHER); mat(L('boot'), M.LEATHER);
  belt(M.LEATHER); skirt(M.CLOTH_WHITE, { front: 4.6, fw: 2.4, fm: M.CLOTH_BLUE, side: 3.8, back: 4.6 });
};
CHEST_RETOUCH.bs_ash_chest = (r, J, S) => {   // ash-grey stripes on the bare chest, a dark strap, a great black fur mantle with brass studs, a gold skull on a black belt
  const { chest, abd, pel, A, L, mat, belt, skirt, paint, loc } = S; barbBare(S);
  const strap = barbStrap(S, 1, 0.6);
  const ash = p => { if (strap(p)) return M.LEATHER; const [f, s, z] = loc(p); if (f < 0.6) return 0; const v = z * 0.5 + Math.abs(s) * 0.22 + 10; return Math.abs(s) > 0.7 && v - Math.floor(v) < 0.2 ? M.CLOTH_SHADOW : 0; };
  paint(chest, ash); paint(abd, ash);
  barbMantle(r, J, M.CLOTH_DARK, 1.2);
  const { fwd, up, sideR } = J;
  for (const s of [-1, 1]) r.sph(at3(J.chest, fwd, sideR, up, 2.2, s * 6.2, 5.6), 0.95, M.GOLD);   // brass studs on the shoulders
  mat(A('fore'), M.LEATHER); mat([pel, ...L('thigh')], M.CLOTH_DARK); mat(L('boot'), M.CLOTH_DARK);
  belt(M.CLOTH_DARK);
  const bc = V.mad(V.mad(J.pelvis, up, 3.1), fwd, (3.8 + S.bulk * 1.4) * S.K + 1.0);
  r.ell(bc, [1.1, 1.7, 1.5], M.GOLD, frameAlong(fwd, up), { mf: p => { const q = V.sub(p, bc), s = V.dot(q, sideR), z = V.dot(q, up); return (Math.abs(Math.abs(s) - 0.65) < 0.35 && Math.abs(z - 0.25) < 0.35) || (Math.abs(s) < 0.25 && z < -0.6) ? M.DARK : 0; } });   // the gold skull buckle
  skirt(M.LEATHER, { front: 4.4, fw: 2.8, side: 3.4, back: 4.4 });
};

// ---------------------------------------------------------------- weapons (one-handed, heavy)
const bsAlong = (g, bd) => p => V.dot(V.sub(p, g), bd);
GEAR_EXTRA.weapon.bs_blood_axe = (r, { g, bd, wide, wf }) => {   // a bone crescent on a red-wrapped haft, a bone pommel
  const t = bsAlong(g, bd);
  r.cone(V.mad(g, bd, -2.8), V.mad(g, bd, 13.4), 0.95, 0.95, M.CLOTH_RED, { mf: p => Math.abs((t(p) + 10) % 1.6 - 0.8) < 0.22 ? M.LEATHER : 0 });
  r.sph(V.mad(g, bd, -3.4), 1.3, M.BONE);
  r.group(() => {
    r.box(V.add(V.mad(g, bd, 11.2), V.mul(wide, 2.4)), [2.0, 2.0, 0.5], M.BONE, wf);
    r.ell(V.add(V.mad(g, bd, 11.2), V.mul(wide, 4.3)), [4.6, 1.5, 0.5], M.BONE, wf);   // the crescent edge
  });
  r.cone(V.add(V.mad(g, bd, 11.2), V.mul(wide, -0.6)), V.add(V.mad(g, bd, 11.4), V.mul(wide, -2.4)), 0.9, 0.3, M.BONE);
};
GEAR_EXTRA.weapon.bs_frost_axe = (r, { g, bd, wide, wf }) => {   // an iron hand axe rimmed in glowing ice, fur bound round the haft
  r.cone(V.mad(g, bd, 1.2), V.mad(g, bd, 13.6), 0.9, 0.9, M.WOOD);
  r.ell(V.mad(g, bd, 3.4), [1.6, 1.45, 1.45], M.CLOTH_WHITE, wf);   // the fur wrap
  r.cyl(V.mad(g, bd, 9.4), V.mad(g, bd, 10.2), 1.25, M.IRON);
  r.group(() => {
    r.box(V.add(V.mad(g, bd, 11.4), V.mul(wide, 2.5)), [2.2, 2.3, 0.55], M.STEEL, wf);
    r.ell(V.add(V.mad(g, bd, 11.4), V.mul(wide, 4.6)), [3.6, 1.0, 0.5], M.STEEL, wf);
  });
  r.ell(V.add(V.mad(g, bd, 11.4), V.mul(wide, 5.5)), [3.9, 0.6, 0.45], M.ICE, wf, { noShadow: true });   // the ice along the edge
  r.box(V.add(V.mad(g, bd, 11.4), V.mul(wide, -0.6)), [1.0, 0.9, 0.9], M.IRON, wf);
};
GEAR_EXTRA.weapon.bs_ash_axe = (r, { g, bd, wide, wf }) => {   // a black iron cleaver, its edge glowing like a coal, brass rivets, a hole at the tip
  r.cyl(V.mad(g, bd, 1.0), V.mad(g, bd, 1.9), 1.15, M.GOLD); r.cone(V.mad(g, bd, 1.9), V.mad(g, bd, 4.2), 0.9, 0.9, M.LEATHER);
  const c = V.add(V.mad(g, bd, 9.6), V.mul(wide, 1.3));
  r.box(c, [5.6, 2.7, 0.45], M.DSTEEL, wf, { mf: p => { const q = V.sub(p, c), a = V.dot(q, bd), w = V.dot(q, wide);
    if (w > 1.9) return M.FIREM;   // the ember edge
    if (Math.hypot(a - 3.9, w + 0.9) < 0.75) return M.DARK;   // the hole
    if (w < -1.4 && Math.abs(Math.abs(a + 0.4) - 2.4) < 0.45) return M.GOLD;   // rivets along the spine
    return 0; } });
};

// ---------------------------------------------------------------- the two-piece look: what the concept wears beyond the three pieces
{ const sc0 = setChest; setChest = function (r, eq, J, fwd, up, sideR, ...a) {
  sc0(r, eq, J, fwd, up, sideR, ...a);
  if (!BS_SETS.includes(eq.set)) return;
  const belt = V.mad(J.pelvis, up, 2.4), at = (f, s, z) => at3(belt, fwd, sideR, up, f, s, z);
  if (eq.set === 'bloodmoon') {   // bone charms: fangs on a cord at his right hip, a small skull at his left
    for (const s of [1.4, 2.4, 3.4]) r.cone(at(4.2 - s * 0.35, s, 0), at(4.4 - s * 0.35, s, -2.6), 0.75, 0.15, M.BONE, { noShadow: true });
    const k = at(3.4, -3.2, -1.6); r.sph(k, 1.4, M.BONE, { mf: p => { const q = V.sub(p, k); return V.dot(q, fwd) > 0.6 && Math.abs(Math.abs(V.dot(q, sideR)) - 0.55) < 0.35 && Math.abs(V.dot(q, up)) < 0.35 ? M.DARK : 0; } });
  } else if (eq.set === 'frostjaw') {   // bear claws hanging from the belt, rime glinting on the pelt
    for (const s of [-1.6, 0, 1.6]) r.cone(at(4.6 - Math.abs(s) * 0.3, s * 1.4, 0.2), at(5.2 - Math.abs(s) * 0.3, s * 1.5, -3.0), 0.8, 0.2, M.BONE, { noShadow: true });
    for (const [f, s, z] of [[2.0, 6.4, 7.6], [-1.6, -6.0, 7.8], [2.6, -3.0, 8.2], [-2.8, 3.0, 8.4]]) { const p = at3(J.chest, fwd, sideR, up, f, s, z - 1.6); r.cone(p, V.mad(p, up, 1.6), 0.6, 0.1, M.ICE, { noShadow: true }); }
  } else {   // ashen: embers smoldering in the black fur
    for (const [f, s, z] of [[2.4, 6.6, 4.8], [1.8, -6.8, 5.6], [3.6, -3.4, 7.0], [-2.0, 4.4, 7.4], [-3.2, -2.4, 6.4]]) r.sph(at3(J.chest, fwd, sideR, up, f, s, z), 0.7, M.FIREM, { noShadow: true });
  }
}; }

// ---------------------------------------------------------------- bag icons (helms and weapons drawn as on the hero; chests from their parts)
{ const ic0 = itemIcon; itemIcon = function (it) {
  const B = ITEM_BASES[it.base]; if (!B || !/^bs_/.test(B.look || '')) return ic0(it);
  const k = B.look; if (iconCache[k]) return iconCache[k];
  const r = new Rig(), L = B.look;
  if (B.slot === 'weapon') {
    const bd = V.norm([0.5, -0.5, 0.75]), g = V.mad([0, 0, 3], bd, -7), wide = V.norm(V.cross(bd, [0, 0, 1])), wf = [bd, wide, V.cross(bd, wide)];
    r.cone(V.mad(g, bd, -2.5), V.mad(g, bd, 1.2), 0.9, 0.9, M.LEATHER); r.sph(V.mad(g, bd, -3.1), 1.2, M.GOLD);
    GEAR_EXTRA.weapon[L](r, { g, bd, wide, wf });
    return (iconCache[k] = renderRig(r, -0.6, 26, 26, 13, 17));   // (turned to show the blade flat: at 0 it was edge-on, a spear)
  }
  if (B.slot === 'helm') {   // the helm alone, no face (the icon camera looks from +x, 30 degrees up)
    if (L === 'bs_blood_helm') {
      r.group(() => { r.ell([0, 0, 4.2], [5.4, 5.0, 4.4], M.BONE, null, { mf: p => p[0] > 3.0 && Math.abs(Math.abs(p[1]) - 2.0) < 1.2 && Math.abs(p[2] - 4.6) < 1.1 ? M.DARK : 0 }); r.cone([3.6, 0, 3.6], [7.4, 0, 1.4], 2.2, 1.2, M.BONE); });
      r.sph([7.6, 0, 1.6], 0.9, M.DARK); for (const s of [-1, 1]) r.cone([-0.4, s * 2.8, 7.4], [-0.8, s * 3.8, 12], 1.7, 0.2, M.BONE);
    } else if (L === 'bs_frost_helm') {
      r.group(() => { r.ell([0, 0, 4.2], [5.4, 5.4, 5.0], M.CLOTH_WHITE, null, { mf: p => p[0] > 3.4 && p[2] < 2.2 && Math.abs(p[1]) < 3.6 ? M.DARK : 0 }); r.cone([3.0, 0, 4.8], [7.0, 0, 3.0], 2.6, 1.6, M.CLOTH_WHITE); });   // (pass 2: the nose, eyes and fangs sat inside the head)
      for (const s of [-1, 1]) r.sph([-0.6, s * 4.2, 8.6], 1.7, M.CLOTH_WHITE);
      r.sph([8.4, 0, 3.0], 1.1, M.DARK); for (const s of [-1, 1]) { r.sph([4.9, s * 2.2, 6.3], 0.75, M.DARK); r.cone([5.2, s * 2.0, 2.4], [5.6, s * 2.2, -0.2], 0.85, 0.2, M.BONE); }
    } else {
      r.ell([0, 0, 4.0], [5.4, 5.0, 4.4], M.BONE, null, { mf: p => p[0] > 3.0 && Math.abs(Math.abs(p[1]) - 2.0) < 1.2 && Math.abs(p[2] - 4.0) < 1.1 ? M.FIREM : p[0] > 3.6 && Math.abs(p[1]) < 0.6 && p[2] < 2.4 ? M.DARK : 0 });
      for (const s of [-1, 1]) { const pts = [[0, s * 3.8, 5.6], [0, s * 6.4, 6.6], [-0.4, s * 8.0, 9.0], [0, s * 7.8, 12], [0.6, s * 6.6, 13.6]]; for (let q = 0; q + 1 < pts.length; q++) r.cone(pts[q], pts[q + 1], 1.8 - q * 0.33, 1.8 - (q + 1) * 0.33, M.CLOTH_DARK); r.cyl(pts[1], V.add(pts[1], [0, s * 0.8, 0.3]), 1.6, M.GOLD); r.cyl(pts[2], V.add(pts[2], [0, s * 0.3, 0.8]), 1.3, M.GOLD); }
    }
    return (iconCache[k] = renderRig(r, Math.PI / 4, 26, 26, 13, 19));
  }
  // chest: the bare torso with its paint, the mantle over the shoulders and its mark
  const fur = { bs_blood_chest: M.CLOTH_RED, bs_frost_chest: M.CLOTH_WHITE, bs_ash_chest: M.CLOTH_DARK }[L];
  const paintI = { bs_blood_chest: p => p[0] > 2 && Math.abs(p[2] + p[1] * 0.9 - 2.6) < 0.6 ? M.CLOTH_RED : 0, bs_frost_chest: p => p[0] > 2 && Math.abs(p[2] - p[1] * 0.8 - 2.6) < 0.9 ? M.CLOTH_BLUE : 0,
    bs_ash_chest: p => p[0] > 2 && Math.abs(p[1]) > 1 && ((p[2] * 0.5 + Math.abs(p[1]) * 0.22 + 10) % 1) < 0.22 ? M.CLOTH_SHADOW : 0 }[L];
  r.ell([0, 0, 2.6], [4.4, 6.0, 6.2], M.FACE, null, { mf: paintI });
  r.group(() => { r.ell([-0.6, 0, 7.6], [4.8, 8.4, 2.8], fur); for (const s of [-1, 1]) r.sph([-0.2, s * 6.4, 7.0], 3.4, fur); });
  if (L === 'bs_blood_chest') { r.sph([0.8, 6.4, 10.4], 2.6, M.BONE, { mf: p => p[0] > 2.0 && Math.abs(Math.abs(p[1] - 6.4) - 1.0) < 0.5 && Math.abs(p[2] - 10.8) < 0.6 ? M.DARK : 0 }); }
  if (L === 'bs_ash_chest') for (const s of [-1, 1]) r.sph([2.6, s * 6.4, 8.8], 1.0, M.GOLD);
  r.ell([0, 0, -3.2], [4.0, 5.4, 1.1], L === 'bs_ash_chest' ? M.CLOTH_DARK : M.LEATHER);
  return (iconCache[k] = renderRig(r, Math.PI / 4, 26, 26, 13, 17));
}; }
