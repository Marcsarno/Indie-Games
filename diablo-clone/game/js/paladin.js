'use strict';
// Round 97: THE PALADIN (the user: "slow to anger, slower to die"; white, gold and blue; a hammer;
// one big two-hander or a one-hander and a shield; FAITH, wings at half and full; damage is damage).
// This file holds everything the class adds: its armor, helms, shields and hammers (drawn over the
// existing plate rig), its items, its moves and its wings. The plate climbs in five steps, so there is
// always something better to find: SQUIRE (plain steel, a blue tabard with a small sun), TEMPLAR
// (bright steel, gold-edged shoulders, a white tabard bordered in blue), CRUSADER (white plate, a blue
// tabard bordered in gold, a blue cloak), SUNGUARD (white plate banded in gold, a white cloak) and
// DAWNBRINGER (gold shoulders, a glowing sun on the breast, a long white and gold cloak).

// ---------------------------------------------------------------- materials
// white enamelled plate: the steel ramp's light end, so its shadows stay cool steel and it lights to near white
defMat('WPLATE', [29, 30, 31, 32, 27], 3, { shiny: true, span: 1.1, spec: [0.94, 27] });

// ---------------------------------------------------------------- armor (chest looks drawn over the plate rig)
const PAL_CHESTS = ['pal_squire', 'pal_templar', 'pal_crusader', 'pal_sunguard', 'pal_dawnplate'];
for (const id of PAL_CHESTS) WARRIOR_SETS[id] = { base: 'plate' };
Object.assign(CHEST_CAPE, {
  pal_crusader: { m: M.CLOTH_BLUE, hem: M.GOLD, len: 10 },
  pal_sunguard: { m: M.CLOTH_WHITE, hem: M.GOLD, len: 11 },
  pal_dawnplate: { m: M.CLOTH_WHITE, hem: M.GOLD, len: 12.5 },
});
// a tabard down the breast: `w` half wide, its own colour and a border, a sun on the chest
function palTabard(S, o) {
  return p => {
    const [f, s, z] = S.loc(p), as = Math.abs(s);
    if (f < 1.0 || as > o.w || z > 4.4) return 0;
    if (o.sun) { const d = Math.hypot(s, z - 1.0), a = Math.atan2(z - 1.0, s); if (d < 0.9 || (d < (o.big ? 2.1 : 1.6) && Math.abs(Math.sin(a * 4)) > 0.82)) return o.sun; }
    return as > o.w - 0.6 ? o.border : o.m;
  };
}
const palPaint = (S, q, fn) => { if (q) S.paint(q, fn); };
// a band round a pauldron, low on its dome (and an enamel cap above it)
function palBand(S, q, band, cap) { const c = q.c, up = [0, 0, 1], r = q.rad ? q.rad[2] : 4; S.paint(q, p => { const z = V.dot(V.sub(p, c), up); return Math.abs(z / r - 0.05) < 0.17 ? band : cap && z / r > 0.55 ? cap : 0; }); }
CHEST_RETOUCH.pal_squire = (r, J, S) => {   // plain steel plate, blue sleeves, a blue tabard with a small gold sun, leather boots
  const { chest, abd, pel, pads, A, L, mat, belt, skirt } = S;
  mat([chest, abd], M.PLATE); chest.mf = palTabard(S, { w: 2.4, m: M.CLOTH_BLUE, border: M.CLOTH_BLUE, sun: M.GOLD });
  palPaint(S, abd, palTabard(S, { w: 2.4, m: M.CLOTH_BLUE, border: M.CLOTH_BLUE }));
  mat(A('sleeve'), M.CLOTH_BLUE); mat(L('boot'), M.LEATHER); mat([pel, ...L('thigh')], M.CLOTH_TAN);
  for (const q of pads) q.mf = null;
  belt(M.LEATHER); skirt(M.CLOTH_BLUE, { front: 4.6, fw: 2.4, side: 2.4, back: 3.0 });
};
CHEST_RETOUCH.pal_templar = (r, J, S) => {   // bright steel, gold-edged shoulders, a white tabard bordered in blue with a gold sun
  const { chest, abd, pel, pads, rivets, A, L, mat, belt, skirt, goldEdge, goldRim } = S;
  mat([chest, abd, pel, ...A('fore'), ...A('cop'), ...pads, ...L('knee'), ...L('shin')], M.STEEL);
  chest.mf = palTabard(S, { w: 2.6, m: M.CLOTH_WHITE, border: M.CLOTH_BLUE, sun: M.GOLD });
  palPaint(S, abd, palTabard(S, { w: 2.6, m: M.CLOTH_WHITE, border: M.CLOTH_BLUE }));
  mat(A('sleeve'), M.CLOTH_BLUE); mat(L('thigh'), M.CLOTH_BLUE); mat(L('boot'), M.LEATHER);
  for (const q of pads) { q.mf = null; goldEdge(q); } mat(rivets, M.GOLD);
  belt(M.LEATHER); skirt(M.CLOTH_WHITE, { front: 4.8, fw: 2.6, fmf: p => Math.abs(S.loc(p)[1]) > 1.9 ? M.CLOTH_BLUE : 0, side: 2.8, back: 3.6 });
  skirt(M.CLOTH_BLUE, { back: 4.6, bw: 3.2 });
};
CHEST_RETOUCH.pal_crusader = (r, J, S) => {   // white plate, gold rims, a blue tabard bordered in gold with a big gold sun, a blue cloak
  const { chest, abd, pel, pads, rivets, A, L, mat, belt, skirt, goldEdge, goldRim } = S;
  mat([chest, abd, pel, ...A('fore'), ...A('cop'), ...pads, ...L('knee'), ...L('shin'), ...L('thigh')], M.WPLATE);
  chest.mf = palTabard(S, { w: 2.7, m: M.CLOTH_BLUE, border: M.GOLD, sun: M.GOLD, big: true });
  palPaint(S, abd, palTabard(S, { w: 2.7, m: M.CLOTH_BLUE, border: M.GOLD }));
  mat(A('sleeve'), M.CLOTH_BLUE); mat(L('boot'), M.STEEL);
  for (const q of pads) { q.mf = null; goldEdge(q); palBand(S, q, M.GOLD); } mat(rivets, M.GOLD); for (const q of L('knee')) goldRim(q, -0.5);
  belt(M.LEATHER); skirt(M.CLOTH_BLUE, { front: 5.0, fw: 2.7, fmf: p => Math.abs(S.loc(p)[1]) > 2.1 ? M.GOLD : 0, side: 3.0 });
};
CHEST_RETOUCH.pal_sunguard = (r, J, S) => {   // white plate banded in gold at the neck, cuffs and knees, a white tabard with a gold border and sun, a white cloak
  const { chest, abd, pel, pads, rivets, A, L, mat, belt, skirt, goldEdge, goldRim, paint, loc } = S;
  mat([chest, abd, pel, ...A('fore'), ...A('cop'), ...pads, ...L('knee'), ...L('shin'), ...L('thigh'), ...L('boot')], M.WPLATE);
  const tab = palTabard(S, { w: 2.8, m: M.CLOTH_WHITE, border: M.GOLD, sun: M.GOLD, big: true });
  chest.mf = p => { const [f, s, z] = loc(p); return z > 3.9 ? M.GOLD : tab(p); };   // a gold gorget band
  palPaint(S, abd, palTabard(S, { w: 2.8, m: M.CLOTH_WHITE, border: M.GOLD }));
  mat(A('sleeve'), M.CLOTH_BLUE);
  for (const q of pads) { q.mf = null; goldEdge(q); palBand(S, q, M.GOLD, M.CLOTH_BLUE); } mat(rivets, M.GOLD); for (const q of A('cop')) if (q) goldEdge(q);
  for (const q of L('knee')) goldRim(q, -0.5);
  for (const q of A('fore')) { const b = q.b; paint(q, p => V.len(V.sub(p, b)) < 1.4 ? M.GOLD : 0); }   // gold cuffs
  for (const q of L('boot')) { const c = q.c; paint(q, p => V.dot(V.sub(p, c), J.up) > 0.5 ? M.GOLD : 0); }
  belt(M.GOLD); skirt(M.CLOTH_WHITE, { front: 5.2, fw: 2.8, fmf: p => Math.abs(loc(p)[1]) > 2.2 ? M.GOLD : 0, side: 3.4, smf: p => M.CLOTH_BLUE });
};
CHEST_RETOUCH.pal_dawnplate = (r, J, S) => {   // white and gold: gold shoulders and gorget, a glowing sun on the breast, gold belt, a long white cloak
  const { chest, abd, pel, pads, rivets, A, L, mat, belt, skirt, goldRim, paint, loc } = S;
  mat([chest, abd, pel, ...A('fore'), ...L('shin'), ...L('thigh'), ...L('boot')], M.WPLATE);
  mat([...pads, ...A('cop'), ...L('knee')], M.GOLD); for (const q of pads) q.mf = null; mat(rivets, M.WPLATE);
  chest.mf = p => { const [f, s, z] = loc(p), as = Math.abs(s); if (z > 3.8) return M.GOLD;
    if (f > 1.0) { const d = Math.hypot(s, z - 0.9), a = Math.atan2(z - 0.9, s); if (d < 1.0) return M.HOLY; if (d < 2.4 && Math.abs(Math.sin(a * 4)) > 0.8) return M.GOLD; if (as < 3.0 && as > 2.4) return M.GOLD; }
    return 0; };
  palPaint(S, abd, p => { const [f, s] = loc(p); return f > 1 && Math.abs(Math.abs(s) - 2.7) < 0.35 ? M.GOLD : 0; });
  mat(A('sleeve'), M.CLOTH_WHITE);
  for (const q of A('fore')) { const b = q.b; paint(q, p => V.len(V.sub(p, b)) < 1.5 ? M.GOLD : 0); }
  for (const q of L('boot')) { const c = q.c; paint(q, p => V.dot(V.sub(p, c), J.up) > 0.3 ? M.GOLD : 0); }
  belt(M.GOLD); skirt(M.CLOTH_WHITE, { front: 5.6, fw: 3.0, fmf: p => Math.abs(loc(p)[1]) > 2.3 ? M.GOLD : 0, side: 3.8, smf: p => M.GOLD, back: 4.0 });
  // wings worked in gold on the shoulders: three small feathers swept up from each pauldron
  for (const q of pads) { const c = q.c, sd = Math.sign(V.dot(V.sub(c, J.chest), J.sideR)) || 1;
    for (let k = 0; k < 3; k++) { const a = V.add(V.mad(c, J.up, 1.2), V.mul(J.fwd, -1.0 - k * 0.9)), b = V.add(V.add(V.mad(a, J.up, 3.2 - k * 0.6), V.mul(J.sideR, sd * 1.6)), V.mul(J.fwd, -1.6)); r.cone(a, b, 0.75, 0.25, M.GOLD); } }
};

// ---------------------------------------------------------------- helms
const palFace = (r, hd, fwd, sideR, up, helmF, hair = M.HAIR_O) => { r.ell(hd, [4.3, 4.3, 4.5], M.FACE, helmF, { mf: faceMf(hd, fwd, sideR, up, { under: 1, hair }) }); faceParts(r, hd, fwd, sideR, up, false); };
GEAR_EXTRA.helm.pal_great = (r, { hd, fwd, up, sideR, helmF }) => {   // the templar's great helm: a flat-topped steel bucket, a gold cross over the eye slit
  r.ell(V.mad(hd, up, -0.1), [4.7, 4.6, 5.1], M.STEEL, helmF, { mf: p => {
    const q = V.sub(p, hd), f2 = V.dot(q, fwd), s2 = V.dot(q, sideR), z2 = V.dot(q, up);
    if (f2 > 1.8 && Math.abs(s2) < 0.55 && z2 > -3.4 && z2 < 2.6) return M.GOLD;   // the cross's upright
    if (f2 > 1.8 && Math.abs(z2 - 0.5) < 0.6 && Math.abs(s2) < 3.4) return M.DARK;   // the eye slit
    if (f2 > 1.4 && Math.abs(z2 - 1.7) < 0.45 && Math.abs(s2) < 3.0) return M.GOLD;   // the cross's arm, over the slit
    if (Math.abs(z2 - 3.0) < 0.45) return M.GOLD;   // a gold band round the crown (pass 3: painted on; a flat top read as a chef's hat, a gold disc as a lid)
    return 0; } });
};
GEAR_EXTRA.helm.pal_winged = (r, { hd, fwd, up, sideR, helmF }) => {   // the crusader's open helm: white steel, a gold brow band, small white wings at the sides
  palFace(r, hd, fwd, sideR, up, helmF);
  const hc = V.mad(hd, up, 2.0);
  r.ell(hc, [4.75, 4.6, 3.7], M.WPLATE, helmF, { mf: p => { const q = V.sub(p, hc); return V.dot(q, up) < -1.6 ? M.GOLD : Math.abs(V.dot(q, sideR)) < 0.5 && V.dot(q, fwd) > 0 ? M.GOLD : 0; } });
  for (const sd of [-1, 1]) {   // pass 2: swept back along the helm, not up (they read as horns): a gold root, three white feathers stacked behind it
    const root = V.add(V.add(V.mad(hd, up, 2.2), V.mul(sideR, sd * 4.4)), V.mul(fwd, 0.6));
    r.sph(root, 1.0, M.GOLD);
    r.group(() => { for (let k = 0; k < 3; k++) { const a = V.add(V.mad(root, up, -k * 0.6), V.mul(fwd, -k * 0.6)); r.cone(a, V.add(V.add(V.mad(a, up, 1.3 - k * 0.5), V.mul(sideR, sd * (1.4 - k * 0.3))), V.mul(fwd, -5.6 + k * 1.0)), 1.1 - k * 0.12, 0.35, k ? M.CLOTH_WHITE : M.GOLD); } });   // (pass 3: lower and longer, a gold leading feather: they still read as horns)
  }
};
GEAR_EXTRA.helm.pal_sun = (r, { hd, fwd, up, sideR, helmF, eq }) => {   // the sunguard's crest: white steel banded in gold, a crown of gold sun rays standing up behind the head
  palFace(r, hd, fwd, sideR, up, helmF);
  const hc = V.mad(hd, up, 2.0);
  r.ell(hc, [4.75, 4.6, 3.7], M.WPLATE, helmF, { mf: p => { const q = V.sub(p, hc); return V.dot(q, up) < -1.5 ? M.GOLD : 0; } });
  r.sph(V.add(V.mad(hd, up, 1.6), V.mul(fwd, 4.4)), 0.8, M.HOLY, { noShadow: true });   // a small sun stone on the brow
  // pass 2: a halo, a gold ring floating level over the head (the fan of sun rays read as spiky hair, and side on as one horn);
  // a ring lying flat reads as a ring from every side. Worn with the Dawnbringer set it glows
  const glow = eq && eq.set === 'dawnbringer', c = V.mad(hd, up, 7.6);
  for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; r.sph(V.add(c, V.add(V.mul(fwd, Math.cos(a) * 4.2), V.mul(sideR, Math.sin(a) * 4.2))), 0.85, glow ? M.HOLY : M.GOLD, { noShadow: true }); }
  for (const sd of [-1, 1]) r.cone(V.add(V.mad(hd, up, 3.0), V.mul(sideR, sd * 4.2)), V.add(V.add(V.mad(hd, up, 5.2), V.mul(sideR, sd * 5.0)), V.mul(fwd, -2.2)), 0.8, 0.3, M.GOLD);   // small gold wings at the temples
};

// ---------------------------------------------------------------- shields (drawn as a base shield, then repainted)
Object.assign(SHIELD_VARS, { pal_round: 'round', pal_kite: 'kite', pal_tower: 'tower', pal_aegis: 'heater' });
const palSun = (u, v, big, core = M.GOLD, rays = M.GOLD) => { const d = Math.hypot(u, v), a = Math.atan2(v, u); if (d < (big ? 0.24 : 0.16)) return core; if (d < (big ? 0.48 : 0.34) && Math.abs(Math.sin(a * 4)) > 0.8) return rays; return 0; };
const PAL_SHIELD = {
  pal_round: (r, q) => {   // the squire's: a round blue shield, a steel rim, a gold sun boss
    const c = q.c, ax = q.ax, R = q.rad[1]; q.m = M.CLOTH_BLUE;
    q.mf = p => { const d = V.sub(p, c), u = V.dot(d, ax[1]) / R, v = V.dot(d, ax[2]) / R; if (V.dot(d, ax[0]) < -0.3) return M.WOOD; if (u * u + v * v > 0.74) return M.STEEL; return palSun(u, v, false); };
  },
  pal_kite: (r, q) => {   // the sun kite: blue, a gold rim, a gold sun in the middle
    const c = q.c, ax = q.ax, rad = q.rad; q.m = M.CLOTH_BLUE;
    q.mf = p => { const d = V.sub(p, c), u = V.dot(d, ax[1]) / rad[1], v = V.dot(d, ax[2]) / rad[2]; if (V.dot(d, ax[0]) < -0.3) return M.WOOD; if (u * u + v * v > 0.64) return M.GOLD; return palSun(u * 1.0, (v - 0.12) * 1.4, true); };
  },
  pal_tower: (r, q) => {   // the temple tower: a white field, a blue border, a gold rim and sun
    const c = q.c, ax = q.ax, h = q.half; q.m = M.CLOTH_WHITE;
    q.mf = p => { const d = V.sub(p, c), u = V.dot(d, ax[1]) / h[1], v = V.dot(d, ax[2]) / h[2]; if (V.dot(d, ax[0]) < -0.3) return M.WOOD; if (Math.abs(u) > 0.9 || Math.abs(v) > 0.94) return M.GOLD; if (Math.abs(u) > 0.74 || Math.abs(v) > 0.86) return M.CLOTH_BLUE; return palSun(u, v * 1.85 - 0.35, true); };
  },
  pal_aegis: (r, q, sh0) => {   // the aegis of dawn: white and gold, a sun that glows
    const c = q.c, ax = q.ax, rad = q.rad; q.m = M.WPLATE;
    q.mf = p => { const d = V.sub(p, c), u = V.dot(d, ax[1]) / rad[1], v = V.dot(d, ax[2]) / rad[2]; if (V.dot(d, ax[0]) < -0.3) return M.WOOD; if (v > 0.62 || u * u + v * v > 0.6) return M.GOLD; return palSun(u, (v - 0.1) * 1.3, true, M.HOLY, M.GOLD); };
    if (r.p[sh0 + 1]) r.p[sh0 + 1].m = M.GOLD;   // the flat top edge
  },
};
{ const sv0 = shieldVar; shieldVar = function (r, id, sh0) { if (PAL_SHIELD[id]) { const q = r.p[sh0]; if (q) PAL_SHIELD[id](r, q, sh0); return; } return sv0(r, id, sh0); }; }

// ---------------------------------------------------------------- hammers
// a hammer head at `at` along the haft: `hl` along the haft, `hw` across, faces and bands in their materials, a spike on top
function palHammerHead(r, g, bd, wide, wf, o) {
  const hb = V.mad(g, bd, o.at), ax = [bd, wide, wf[2]];
  r.box(hb, [o.hl, o.hw, o.hl], o.m, ax, { mf: p => { const q = V.sub(p, hb), w = Math.abs(V.dot(q, wide)), l = Math.abs(V.dot(q, bd)); if (w > o.hw - 0.7) return o.face; if (o.band && w < 0.55) return o.band; if (o.sun && w > o.hw - 1.4 && l < 0.7) return o.sun; return 0; } });
  if (o.spike) r.cone(V.mad(hb, bd, o.hl), V.mad(hb, bd, o.hl + o.spike), 1.1, 0.2, o.m);
  if (o.glow) for (const sd of [-1, 1]) r.sph(V.mad(hb, wide, sd * (o.hw + 0.3)), o.hl * 0.55, M.HOLY, { noShadow: true });   // the faces burn with light
}
GEAR_EXTRA.weapon.pal_hammer = (r, { g, bd, wide, wf }) => {   // the squire's warhammer: an ash haft, a plain steel head
  r.cone(V.mad(g, bd, 1.2), V.mad(g, bd, 12.6), 0.9, 0.9, M.WOOD);
  palHammerHead(r, g, bd, wide, wf, { at: 13.8, hl: 2.0, hw: 3.3, m: M.STEEL, face: M.STEEL, band: M.IRON, spike: 2.0 });
};
GEAR_EXTRA.weapon.pal_warhammer = (r, { g, bd, wide, wf }) => {   // the sunsteel warhammer: a blue-wrapped haft, a white head with gold faces
  r.cone(V.mad(g, bd, 1.2), V.mad(g, bd, 12.8), 0.95, 0.95, M.CLOTH_BLUE);
  r.cyl(V.mad(g, bd, 11.4), V.mad(g, bd, 12.4), 1.3, M.GOLD);
  palHammerHead(r, g, bd, wide, wf, { at: 14.2, hl: 2.2, hw: 3.6, m: M.WPLATE, face: M.GOLD, band: M.GOLD, spike: 2.6 });
};
GEAR_EXTRA.weapon.pal_maul = (r, { g, bd, wide, wf }) => {   // the great maul (two hands): a long haft, a big steel head banded in gold
  r.cone(V.mad(g, bd, -7), V.mad(g, bd, 16), 1.0, 1.0, M.WOOD, { mf: p => Math.abs(((V.dot(V.sub(p, g), bd) + 30) % 6) - 3) < 0.5 ? M.LEATHER : 0 });
  palHammerHead(r, g, bd, wide, wf, { at: 17.6, hl: 2.4, hw: 4.4, m: M.STEEL, face: M.STEEL, band: M.GOLD, spike: 2.2 });
};
GEAR_EXTRA.weapon.pal_maul2 = (r, { g, bd, wide, wf }) => {   // the crusader maul: a white and gold head, a sun on each face
  r.cone(V.mad(g, bd, -7), V.mad(g, bd, 16), 1.0, 1.0, M.CLOTH_BLUE, { mf: p => Math.abs(((V.dot(V.sub(p, g), bd) + 30) % 6) - 3) < 0.55 ? M.GOLD : 0 });
  palHammerHead(r, g, bd, wide, wf, { at: 17.8, hl: 2.6, hw: 4.6, m: M.WPLATE, face: M.GOLD, band: M.GOLD, sun: M.GOLD, spike: 2.8 });
};
GEAR_EXTRA.weapon.pal_dawn = (r, { g, bd, wide, wf }) => {   // DAWNBREAKER: a white haft bound in gold, a gold head whose faces burn with light
  r.cone(V.mad(g, bd, -7), V.mad(g, bd, 16), 1.05, 1.05, M.WPLATE, { mf: p => Math.abs(((V.dot(V.sub(p, g), bd) + 30) % 5) - 2.5) < 0.6 ? M.GOLD : 0 });
  palHammerHead(r, g, bd, wide, wf, { at: 18.0, hl: 2.8, hw: 4.8, m: M.GOLD, face: M.WPLATE, band: M.WPLATE, spike: 3.4, glow: true });
};
Object.assign(GEAR_SWING, { pal_hammer: 'heavy', pal_warhammer: 'heavy', pal_maul: 'heavy', pal_maul2: 'heavy', pal_dawn: 'heavy' });
Object.assign(GEAR_LEN, { pal_hammer: 16, pal_warhammer: 17, pal_maul: 20, pal_maul2: 21, pal_dawn: 21 });
Object.assign(ACROSS_GRIP, { pal_maul: 1, pal_maul2: 1, pal_dawn: 1 });
const PAL_TWO_HAND = { pal_maul: 1, pal_maul2: 1, pal_dawn: 1 };

// ---------------------------------------------------------------- items
Object.assign(ITEM_BASES, {
  pal_hammer: { slot: 'weapon', look: 'pal_hammer', name: "SQUIRE'S HAMMER", dmg: [3, 8], cls: 'paladin', lvl: 1, palIcon: 1 },
  pal_mace: { slot: 'weapon', look: 'fmace', name: 'TEMPLAR MACE', dmg: [5, 12], cls: 'paladin', lvl: 2, palIcon: 1 },
  pal_warhammer: { slot: 'weapon', look: 'pal_warhammer', name: 'SUNSTEEL WARHAMMER', dmg: [7, 16], cls: 'paladin', lvl: 3, palIcon: 1 },
  pal_maul: { slot: 'weapon', look: 'pal_maul', name: 'GREAT MAUL', dmg: [9, 21], cls: 'paladin', lvl: 3, slow: true, twoHand: true, palIcon: 1 },
  pal_maul2: { slot: 'weapon', look: 'pal_maul2', name: 'CRUSADER MAUL', dmg: [13, 27], cls: 'paladin', lvl: 5, slow: true, twoHand: true, palIcon: 1 },
  pal_dawn: { slot: 'weapon', look: 'pal_dawn', name: 'GREAT MAUL', dmg: [14, 29], cls: 'paladin', lvl: 99, slow: true, twoHand: true, palIcon: 1 },   // (only as the legendary DAWNBREAKER)
  pal_helm1: { slot: 'helm', look: 'kettle', name: "SQUIRE'S HELM", armor: 3, cls: 'paladin', lvl: 1, palIcon: 1 },
  pal_helm2: { slot: 'helm', look: 'pal_great', name: 'TEMPLAR HELM', armor: 5, cls: 'paladin', lvl: 2, palIcon: 1 },
  pal_helm3: { slot: 'helm', look: 'pal_winged', name: 'WINGED HELM', armor: 7, cls: 'paladin', lvl: 3, palIcon: 1 },
  pal_helm4: { slot: 'helm', look: 'pal_sun', name: 'SUNCREST HELM', armor: 9, cls: 'paladin', lvl: 5, palIcon: 1 },
  pal_plate1: { slot: 'chest', look: 'pal_squire', name: "SQUIRE'S PLATE", armor: 4, cls: 'paladin', lvl: 1, palIcon: 1 },
  pal_plate2: { slot: 'chest', look: 'pal_templar', name: 'TEMPLAR PLATE', armor: 8, cls: 'paladin', lvl: 2, palIcon: 1 },
  pal_plate3: { slot: 'chest', look: 'pal_crusader', name: 'CRUSADER PLATE', armor: 12, cls: 'paladin', lvl: 3, palIcon: 1 },
  pal_plate4: { slot: 'chest', look: 'pal_sunguard', name: 'SUNGUARD PLATE', armor: 16, cls: 'paladin', lvl: 4, palIcon: 1 },
  pal_plate5: { slot: 'chest', look: 'pal_dawnplate', name: 'DAWNBRINGER PLATE', armor: 20, cls: 'paladin', lvl: 6, palIcon: 1 },
  pal_shield1: { slot: 'shield', look: 'pal_round', name: "SQUIRE'S SHIELD", armor: 3, block: 10, cls: 'paladin', lvl: 1, palIcon: 1 },
  pal_shield2: { slot: 'shield', look: 'pal_kite', name: 'SUN KITE', armor: 6, block: 18, cls: 'paladin', lvl: 2, palIcon: 1 },
  pal_shield3: { slot: 'shield', look: 'pal_tower', name: 'TEMPLE TOWER', armor: 10, block: 26, cls: 'paladin', lvl: 3, palIcon: 1 },
  pal_shield4: { slot: 'shield', look: 'pal_aegis', name: 'AEGIS OF DAWN', armor: 12, block: 30, cls: 'paladin', lvl: 5, palIcon: 1 },
});
LEGENDARIES.push({ fx: 'dawn', base: 'pal_dawn', name: 'DAWNBREAKER', cls: 'paladin', mods: { dmgPct: 55, hpKill: 4 }, lore: 'THE NIGHT BREAKS ON IT' });
SETS.dawnbringer = { name: 'DAWNBRINGER', cls: 'paladin', pieces: [['pal_plate5', 'DAWNBRINGER PLATE'], ['pal_helm4', 'DAWNBRINGER CREST'], ['pal_shield4', 'DAWNBRINGER AEGIS']],
  bonus: [{ hp: 30, armorFlat: 8 }, { dmgPct: 25, regen: 3 }], lines: ['2: +30 LIFE, +8 ARMOR', '3: +25% DAMAGE, +3 LIFE/S'] };
// matching pieces, as the other classes' outfits: the templar's and the crusader's kits
Object.assign(OUTFITS, {
  templar: { name: 'TEMPLAR', pieces: ['pal_plate2', 'pal_helm2', 'pal_shield2', 'pal_mace'], bonus: [{ armorFlat: 5 }, { hp: 20 }, { dmgPct: 15 }], lines: ['2: +5 ARMOR', '3: +20 LIFE', '4: +15% DAMAGE'] },
  crusader: { name: 'CRUSADER', pieces: ['pal_plate3', 'pal_helm3', 'pal_shield3', 'pal_warhammer'], bonus: [{ hp: 25 }, { regen: 2 }, { dmgPct: 20 }], lines: ['2: +25 LIFE', '3: +2 LIFE/S', '4: +20% DAMAGE'] },
});
// TEMPERED and ANCIENT tiers of every paladin piece, as items.js gives the others
for (const id of Object.keys(ITEM_BASES).filter(k => k.startsWith('pal_') && !/_t\d$/.test(k) && ITEM_BASES[k].lvl < 99)) {
  const b = ITEM_BASES[id];
  TIERS.forEach(([word, up], n) => {
    const L = b.lvl + up, k = (L + 2) / (b.lvl + 2), v = Object.assign({}, b, { name: word + ' ' + b.name, lvl: L, root: id, tier: n + 1 });
    if (b.dmg) { const kd = Math.pow(k, 0.8); v.dmg = [Math.round(b.dmg[0] * kd), Math.round(b.dmg[1] * kd)]; }
    if (b.armor) v.armor = Math.round(b.armor * Math.sqrt(k));
    if (b.block) v.block = Math.min(40, b.block + 5 * (n + 1));
    ITEM_BASES[id + '_t' + (n + 1)] = v;
  });
}
// the paladin's icons: drawn from the same parts as on the hero
{ const ic0 = itemIcon; itemIcon = function (it) {
  const b = ITEM_BASES[it.base]; if (!b || !b.palIcon) return ic0(it);
  const k = 'pal|' + b.look; if (iconCache[k]) return iconCache[k];
  const r = new Rig();
  if (b.slot === 'weapon') {
    const two = PAL_TWO_HAND[b.look], bd = V.norm([0.5, -0.5, 0.75]), g = V.mad([0, 0, 3], bd, two ? -10 : -7), wide = V.norm(V.cross(bd, [0, 0, 1])), wf = [bd, wide, V.cross(bd, wide)];
    r.cone(V.mad(g, bd, -2.5), V.mad(g, bd, 1.2), 0.9, 0.9, M.LEATHER); r.sph(V.mad(g, bd, -3.1), 1.2, M.GOLD);
    const x = GEAR_EXTRA.weapon[b.look]; if (x) x(r, { g, bd, wide, wf });
    return (iconCache[k] = renderRig(r, 0, 26, 26, 13, 17));
  }
  if (b.slot === 'shield') {
    const base = SHIELD_VARS[b.look], c = [0, 0, 4], ax = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    const q = base === 'tower' ? r.box(c, [0.8, 4.4, 7.4], M.CLOTH_WHITE, ax) : base === 'round' ? r.ell(c, [1, 5, 5], M.WOOD, ax) : base === 'heater' ? r.ell(c, [1, 4.8, 6.4], M.WPLATE, ax) : r.ell(c, [1, 5, 7], M.CLOTH_BLUE, ax);
    if (base === 'heater') r.box(V.add(c, [0, 0, 5.6]), [1.1, 4.9, 0.9], M.IRON, ax);
    PAL_SHIELD[b.look](r, q, 0);
    return (iconCache[k] = renderRig(r, Math.PI / 4, 26, 26, 13, 17));
  }
  if (b.slot === 'helm') {
    const hd = [0, 0, 4], fwd = [1, 0, 0], up = [0, 0, 1], sideR = [0, 1, 0], helmF = frameAlong(fwd, up);
    const x = GEAR_EXTRA.helm[b.look]; if (x) x(r, { hd, fwd, up, sideR, helmF });
    return (iconCache[k] = renderRig(r, Math.PI / 4, 26, 26, 13, 19));
  }
  // chest: a breastplate with its tabard and shoulders, as on the hero
  const J = { chest: [0, 0, 1], fwd: [1, 0, 0], sideR: [0, 1, 0], up: [0, 0, 1] }, loc = p => { const q = V.sub(p, J.chest); return [q[0], q[1], q[2]]; };
  const S = { loc };
  const PLm = { pal_squire: M.PLATE, pal_templar: M.STEEL }[b.look] || M.WPLATE, padM = b.look === 'pal_dawnplate' ? M.GOLD : PLm;
  const tab = { pal_squire: [M.CLOTH_BLUE, M.CLOTH_BLUE, false], pal_templar: [M.CLOTH_WHITE, M.CLOTH_BLUE, false], pal_crusader: [M.CLOTH_BLUE, M.GOLD, true], pal_sunguard: [M.CLOTH_WHITE, M.GOLD, true], pal_dawnplate: [M.WPLATE, M.GOLD, true] }[b.look];
  r.ell([0, 0, 2], [4.4, 6.0, 6.0], PLm, null, { mf: palTabard(S, { w: 2.6, m: tab[0], border: tab[1], sun: b.look === 'pal_dawnplate' ? M.HOLY : M.GOLD, big: tab[2] }) });
  for (const s of [-1, 1]) r.ell([0, s * 6.6, 6], [3.6, 3.4, 3], padM, null, PLm !== M.PLATE ? { mf: p => p[2] < 5.2 ? M.GOLD : 0 } : undefined);
  return (iconCache[k] = renderRig(r, Math.PI / 4, 26, 26, 13, 17));
}; }
// what of the warrior's the paladin finds too: maces, hammers, flails, swords, the closed helms, every shield, plain mail and plate
const PAL_SHARE = { weapon: { mace: 1, fmace: 1, mstar: 1, flail: 1, fhammer: 1, sword: 1, bsword: 1, greatsword: 1, kgsword: 1 }, helm: { great: 1, barbute: 1, bascinet: 1, crown: 1, great_flat: 1, bascinet_gold: 1, helm_royal: 1, kettle: 1, spangen: 1 }, chest: { chain: 1, plate: 1 } };
function palShares(o) {
  const b = o.slot ? o : o.base ? ITEM_BASES[o.base] : null; if (!b || (b.cls || 'warrior') !== 'warrior') return false;
  if (b.slot === 'shield') return !String(b.look).startsWith('quiver');
  return !!(PAL_SHARE[b.slot] && PAL_SHARE[b.slot][b.look]);
}

// ================================================================ the paladin's fighting
// The basic attack is the warrior's three-swing combo with a hammer, and every swing sends a wave of
// light rolling on from where the hammer lands: short on the first two, long and wide on the third.
// Skills (they spend the white bar, which his blows refill): HAMMER OF LIGHT (a glowing hammer thrown
// out and back), CONSECRATE (a ring of gold runes on the ground: burns what stands in it, heals him
// in it), SHIELD WALL (a curtain of light in front: blocks every blow from the front and throws arrows
// back, then a shield bash) and JUDGMENT (a giant hammer of light falls from the sky on the thickest
// knot of foes; the survivors are marked, take more, and burst in healing light when they die).
// FAITH (the gold ring round the big button) fills as he fights and blocks. At half, WINGS OF DAWN:
// white wings for 15 s, faster, longer waves, harder blows. Full, ARCHANGEL: great golden wings for
// 18 s, glowing, faster still, much harder, pillars of light on every swing, and he flies at foes.
SKILLSETS.paladin = [
  { id: 'phammer', name: 'HAMMER OF LIGHT', lvl: 1, mana: 7, cd: 1.2 },
  { id: 'consec', name: 'CONSECRATE', lvl: 2, mana: 10, cd: 7 },
  { id: 'pwall', name: 'SHIELD WALL', lvl: 3, mana: 8, cd: 6 },
  { id: 'judge', name: 'JUDGMENT', lvl: 4, mana: 12, cd: 5 },
];
ULTS.paladin = { id: 'wings', name: 'ARCHANGEL' };
const WINGS = { dawn: { T: 15, speed: 1.25, dmg: 1.2, reach: 1.5, name: 'WINGS OF DAWN' }, arch: { T: 18, speed: 1.4, dmg: 1.6, reach: 1.8, name: 'ARCHANGEL' } };
const isPal = () => hero.cls === 'paladin';
const palWings = () => hero.wing && hero.wing.t > 0 ? hero.wing : null;
const palFresh = () => ({ waves: [], hammers: [], consec: null, judges: [], pillars: [], wall: null, flashes: [], smites: [], scorch: [] });
{ const r0 = resetFx; resetFx = function () { r0(); G.pal = palFresh(); }; }
// ---- the swings' waves of light
function palSwing(combo) {
  if (!isPal() || !G.pal) return;
  const W = palWings(), big = combo === 2, [fx, fy] = dirVec(hero.dir), a0 = Math.atan2(fy, fx);
  const range = (big ? 4.6 : 2.7) * (W ? WINGS[W.kind].reach : 1);
  G.pal.waves.push({ fi: hero.fi, fj: hero.fj, a0, half: big ? 0.8 : 0.62, range, speed: big ? 12 : 10, t: 0, front: heroReach() * 0.6, k: big ? 0.75 : 0.4, big, hit: new Set(), arch: !!(W && W.kind === 'arch') });
  if (big) { sfx('whoomp'); if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.1); } else sfx('swing', 0.5);
}
function updatePalWaves(dt) {
  for (const w of G.pal.waves) {
    const r0 = w.front; w.t += dt; w.front = Math.min(w.range, w.front + w.speed * dt);
    for (const e of enemies) {
      if (!alive(e) || w.hit.has(e)) continue;
      const dx = e.fi - w.fi, dy = e.fj - w.fj, d = Math.hypot(dx, dy);
      if (d > w.front + 0.3 || d < heroReach() + 0.05) continue;   // (in arm's reach the hammer itself hits)
      const da = Math.abs(((Math.atan2(dy, dx) - w.a0 + Math.PI * 3) % (Math.PI * 2)) - Math.PI); if (da > w.half + 0.15) continue;
      w.hit.add(e); bzHit(e, w.k, [w.fi, w.fj], w.big ? 1 : 0, 'holy'); palSpark(e.fi, e.fj, w.big ? 10 : 6);
      if (w.arch && w.hit.size <= 3) palPillar(e.fi, e.fj, 0.55);   // Archangel: light falls on what the wave touches
    }
    void r0;
  }
  G.pal.waves = G.pal.waves.filter(w => w.front < w.range || w.t < w.range / w.speed + 0.25);
}
function palSpark(fi, fj, n) { const [x, y] = iso(fi, fj); for (let k = 0; k < n; k++) { const a = Math.random() * 6.283, s = 20 + Math.random() * 40; pspawn(4, x, y - 10, 2, Math.cos(a) * s, Math.sin(a) * s * 0.5, 20 + Math.random() * 30, 0.5, Math.random() < 0.5 ? 27 : 51); } }
function palPillar(fi, fj, k) {
  G.pal.pillars.push({ fi, fj, t: 0, T: 0.45 });
  for (const e of nearFoes(fi, fj, 1.1)) bzHit(e, k, [fi, fj], 1, 'holy');
  sfx('zap', 0.5);
}
// ---- where the hammer lands: a burst of light (round 98: the warrior's cut lines read as a blade, not a hammer of the faith)
{ const mi0 = meleeImpact; meleeImpact = function (e, crit, pow, combo) {
  if (!isPal() || !G.pal) return mi0(e, crit, pow, combo);
  const big = pow >= 2 || crit || combo === 2, z = (e.def.chest || 20) * 0.62;
  G.pal.smites.push({ fi: e.fi, fj: e.fj, z, t: big ? 0.2 : 0.14, t0: big ? 0.2 : 0.14, big, rot: (combo % 2) * 0.785 + (Math.random() - 0.5) * 0.3 });
  const [x, y] = screenOf(e); for (let q = 0; q < (big ? 14 : 7); q++) { const a = Math.random() * 6.283, sp = 50 + Math.random() * 90; pspawn(4, x, y, z, Math.cos(a) * sp, Math.sin(a) * sp * 0.6, 20 + Math.random() * 30, 0.35, Math.random() < 0.5 ? 27 : 51); }
  if (SHAKE) G.trauma = Math.min(1, G.trauma + (big ? 0.1 : 0.05));
}; }
// ---- HAMMER OF LIGHT
function palThrow() {
  const t = nearestEnemy(8); let a;
  if (t) { a = Math.atan2(t.fj - hero.fj, t.fi - hero.fi); hero.dir = dirFrom(t.fi - hero.fi, t.fj - hero.fj); } else { const [fx, fy] = dirVec(hero.dir); a = Math.atan2(fy, fx); }
  const W = palWings(), n = W && W.kind === 'arch' ? 3 : 1;
  for (let k = 0; k < n; k++) { const aa = a + (k - (n - 1) / 2) * 0.32; G.pal.hammers.push({ fi: hero.fi + Math.cos(aa) * 0.5, fj: hero.fj + Math.sin(aa) * 0.5, vx: Math.cos(aa), vy: Math.sin(aa), go: 0, max: 6.5, back: false, hit: new Set(), spin: Math.random() * 6, t: 0 }); }
  hero.combo = 1; hero.atk = 0; hero.hitDone = true; hero.clip = 'attack2';   // the throwing swing, without its melee blow
  sfx('heavySwing'); sfx('whoomp', 0.6);
  return true;
}
function updatePalHammers(dt) {
  for (const h of G.pal.hammers) {
    h.t += dt; h.spin += dt * 22; const sp = 13 * dt;
    if (!h.back) { h.fi += h.vx * sp; h.fj += h.vy * sp; h.go += sp; if (h.go >= h.max || blocked(h.fi, h.fj)) { h.back = true; h.hit.clear(); sfx('swing', 0.5); } }
    else { const dx = hero.fi - h.fi, dy = hero.fj - h.fj, l = Math.hypot(dx, dy) || 1; h.fi += dx / l * sp * 1.15; h.fj += dy / l * sp * 1.15; if (l < 0.6) h.done = true; }
    for (const e of enemies) if (alive(e) && !h.hit.has(e) && Math.hypot(e.fi - h.fi, e.fj - h.fj) < 0.75 + (e.def.unique ? 0.4 : 0)) { h.hit.add(e); bzHit(e, 1.0, [h.fi - h.vx, h.fj - h.vy], 1, 'holy'); palSpark(e.fi, e.fj, 8); sfx('crit', 0.5); }
    if (Math.random() < 0.7) { const [x, y] = iso(h.fi, h.fj); pspawn(4, x, y - 14, 2, 0, 0, 8, 0.35, Math.random() < 0.5 ? 51 : 27); }
    (h.trail = h.trail || []).unshift([h.fi, h.fj, h.spin]); if (h.trail.length > 5) h.trail.pop();   // afterimages
    if (h.t > 3) h.done = true;
  }
  G.pal.hammers = G.pal.hammers.filter(h => !h.done);
}
// ---- CONSECRATE
function palConsecrate() {
  G.pal.consec = { fi: hero.fi, fj: hero.fj, t: 0, T: 8, R: 2.8, tick: 0 };
  hero.combo = 2; hero.atk = 0; hero.hitDone = true; hero.clip = 'attack3';   // the hammer brought down into the ground
  shockwave(hero.fi, hero.fj, 2.8, 0.35, [27, 51]); sfx('crit'); sfx('levelUp', 0.4); if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.2);
  return true;
}
function updatePalConsec(dt) {
  const C = G.pal.consec; if (!C) return;
  C.t += dt; C.tick -= dt;
  if (C.tick <= 0) { C.tick = 0.5; for (const e of enemies) if (alive(e) && Math.hypot(e.fi - C.fi, e.fj - C.fj) < C.R) bzHit(e, 0.35, [C.fi, C.fj], 0, 'holy'); }
  if (Math.hypot(hero.fi - C.fi, hero.fj - C.fj) < C.R && !hero.dead) { hero.hp = Math.min(STAT.maxHp, hero.hp + STAT.maxHp * 0.03 * dt); }
  if (Math.random() < dt * 30) { const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * C.R, [x, y] = iso(C.fi + Math.cos(a) * r, C.fj + Math.sin(a) * r); pspawn(4, x, y, 1, 0, 0, 16 + Math.random() * 16, 0.8, Math.random() < 0.6 ? 51 : 27); }
  if (C.t >= C.T) G.pal.consec = null;
}
// ---- SHIELD WALL
function palWall() {
  G.pal.wall = { t: 0, T: 2.6, blocked: 0 }; sfx('block'); sfx('clank'); hero.atk = -1;
  return true;
}
const palFront = (fi, fj, half = 1.35) => { const [fx, fy] = dirVec(hero.dir), dx = fi - hero.fi, dy = fj - hero.fj, l = Math.hypot(dx, dy) || 1; return (dx * fx + dy * fy) / l > Math.cos(half); };
function updatePalWall(dt) {
  const Wl = G.pal.wall; if (!Wl) return;
  Wl.t += dt;
  if (hero.atk < 0 && !hero.leap) hero.clip = 'bash';
  for (const p of projectiles) if (p.owner === 'enemy' && Math.hypot(p.fi - hero.fi, p.fj - hero.fj) < 1.7 && palFront(p.fi, p.fj)) {   // arrows and bolts thrown back the way they came
    p.owner = 'hero'; p.spell = true; p.dmgK = 1.4; p.vx *= -1.3; p.vy *= -1.3; p.life = 1.2; p.hits = new Set(); Wl.blocked++; palSpark(p.fi, p.fj, 6); sfx('block'); faithAdd(3);
  }
  if (Wl.t >= Wl.T) {   // then the bash: everything close in front knocked back and stunned
    G.pal.wall = null; const [fx, fy] = dirVec(hero.dir);
    for (const e of nearFoes(hero.fi, hero.fj, 2.6)) if (palFront(e.fi, e.fj, 1.0)) { bzHit(e, 1.3, [hero.fi, hero.fj], 2, 'holy'); e.stun = Math.max(e.stun || 0, 1.0); }
    shockwave(hero.fi + fx * 0.8, hero.fj + fy * 0.8, 2.4, 0.25, [27, 51], [Math.atan2(fy, fx), 1.0]); sfx('crit'); hero.dash = 0.16; hero.clip = 'bash';
    if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.25);
  }
}
// ---- JUDGMENT
function palJudge() {
  const t = thickest(8) || nearestEnemy(8); if (!t) return false;
  hero.dir = dirFrom(t.fi - hero.fi, t.fj - hero.fj);
  G.pal.judges.push({ fi: t.fi, fj: t.fj, t: 0, T: 0.55, done: false, R: 2.3 });
  hero.palRaise = 0.6; hero.atk = -1; hero.clip = 'raise';   // he raises the hammer to the sky (round 98)
  sfx('cry', 0.5); sfx('portal', 0.6);
  return true;
}
function updatePalJudges(dt) {
  for (const J of G.pal.judges) {
    J.t += dt;
    if (!J.done && J.t >= J.T) {
      J.done = true;
      for (const e of nearFoes(J.fi, J.fj, J.R)) { bzHit(e, 2.2, [J.fi, J.fj], 3, 'holy'); if (alive(e)) { e.palMark = G.t + 8; e.stun = Math.max(e.stun || 0, 1.0); } }
      shockwave(J.fi, J.fj, J.R + 0.6, 0.4, [27, 51]); shockwave(J.fi, J.fj, J.R * 0.6, 0.3, [51, GOLD[2]], null, false);
      palSpark(J.fi, J.fj, 30); G.flashes.push({ fi: J.fi, fj: J.fj, r: 120, t: 0.3, t0: 0.3 });
      { const R0 = rng((Math.random() * 1e9) | 0), cracks = []; for (let k = 0; k < 9; k++) { let a = k / 9 * 6.283 + R0() * 0.5, x = 0, y = 0; const pts = [[0, 0]], n = 3 + R0.int(0, 2); for (let q = 0; q < n; q++) { a += (R0() - 0.5) * 0.9; const l = 0.35 + R0() * 0.45; x += Math.cos(a) * l; y += Math.sin(a) * l; pts.push([x, y]); } cracks.push(pts); } G.pal.scorch.push({ fi: J.fi, fj: J.fj, t: 0, T: 2.2, cracks }); }
      sfx('meteor'); sfx('crit'); if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.55); if (typeof camKick === 'function') camKick(0, 1, 5);
    }
  }
  G.pal.judges = G.pal.judges.filter(J => J.t < J.T + 0.5);
}
// a marked foe takes a quarter more, and dies in a burst of healing light
{ const d0 = damageEnemy; damageEnemy = function (e, dmg, ...rest) {
  if (isPal()) { const W = palWings(); if (W) dmg = Math.round(dmg * WINGS[W.kind].dmg); if (e.palMark > G.t) dmg = Math.round(dmg * 1.25); }
  const was = alive(e), r = d0(e, dmg, ...rest);
  if (isPal() && was && !alive(e) && e.palMark > G.t) { e.palMark = 0; hero.hp = Math.min(STAT.maxHp, hero.hp + STAT.maxHp * 0.06); palSpark(e.fi, e.fj, 16); shockwave(e.fi, e.fj, 1.6, 0.3, [27, 51]); for (const o of nearFoes(e.fi, e.fj, 1.6)) bzHit(o, 0.5, [e.fi, e.fj], 0, 'holy'); floater('+LIGHT', hero.fi, hero.fj, 40, 51); }
  return r;
}; }
// ---- FAITH and the wings
function faithAdd(v) { if (!isPal() || palWings() || hero.lvl < ULT_LVL) return; const was = hero.ult || 0; hero.ult = Math.min(100, was + v); faithNote(was); }
function faithNote(was) {
  if (was < 50 && hero.ult >= 50 && hero.ult < 100) { say('WINGS OF DAWN READY', 27, 2); sfx('levelUp', 0.6); }
  if (was < 100 && hero.ult >= 100) { say('ARCHANGEL IS READY', 51, 2.5); sfx('levelUp'); }
}
const FAITH_K = 0.3;   // faith fills at this share of the shared ultimate's rate (bots: Archangel about every 2-2.5 min of a rushed Act I)
{ const g0 = ultGain; ultGain = function (e, dmg, killed) { if (isPal()) { if (palWings()) return; const was = hero.ult || 0; g0(e, dmg, killed); hero.ult = Math.min(100, was + ((hero.ult || 0) - was) * FAITH_K); if (was < 100 && hero.ult >= 100) return; if (was < 50 && hero.ult >= 50) faithNote(was); return; } return g0(e, dmg, killed); }; }
{ const u0 = useUlt; useUlt = function () {
  if (!isPal()) return u0();
  if (G.mode !== 'play' || hero.dead) return;
  if (hero.lvl < ULT_LVL) { say(`WINGS UNLOCK AT LEVEL ${ULT_LVL}`, 25, 1.4); return; }
  if (palWings()) return;
  const f = hero.ult || 0;
  if (f < 50) { say('NOT ENOUGH FAITH', 27, 1.2); btnFx(9).deny = 0.3; sfx('tap'); return; }
  const kind = f >= 100 ? 'arch' : 'dawn'; hero.ult = kind === 'arch' ? 0 : f - 50;
  hero.wing = { kind, t: WINGS[kind].T, T: WINGS[kind].T }; btnFx(9).press = 0.2; G.ultAt = G.t; hero.palRaise = 0.7; hero.atk = -1;
  recalcHero(); prewarmHero();
  say(WINGS[kind].name, kind === 'arch' ? 51 : 27, 2.5); sfx('levelUp'); sfx('portal');
  const [x, y] = screenOf(hero); for (let k = 0; k < (kind === 'arch' ? 60 : 30); k++) { const a = Math.random() * 6.283, s = 30 + Math.random() * 60; pspawn(4, x, y - 16, 4, Math.cos(a) * s, Math.sin(a) * s * 0.6, 30 + Math.random() * 40, 0.9, kind === 'arch' ? (Math.random() < 0.6 ? 51 : 27) : 27); }
  shockwave(hero.fi, hero.fj, kind === 'arch' ? 4 : 2.6, 0.4, kind === 'arch' ? [27, 51] : [27, 26]);
  G.pal.pillars.push({ fi: hero.fi, fj: hero.fj, t: 0, T: kind === 'arch' ? 0.9 : 0.6, big: kind === 'arch' ? 2 : 1, white: kind !== 'arch' }); G.slowmo = Math.max(G.slowmo || 0, kind === 'arch' ? 0.35 : 0.2);   // round 98: the beam of the wings
  G.flashes.push({ fi: hero.fi, fj: hero.fj, r: kind === 'arch' ? 160 : 90, t: 0.35, t0: 0.35 });
  if (SHAKE) G.trauma = Math.min(1, G.trauma + (kind === 'arch' ? 0.5 : 0.25));
}; }
// the wings' look and speed ride on recalcHero
{ const rc0 = recalcHero; recalcHero = function () { rc0(); if (!isPal()) { hero.look.wings = ''; hero.look.holy = 0; return; } const W = palWings(); hero.look.wings = W ? W.kind : ''; hero.look.holy = 1; hero.look.size = W ? [120, 104, 60, 80] : undefined; if (W) STAT.speed *= WINGS[W.kind].speed; }; }
// the paladin takes blows like the warrior (a quarter less), and every block feeds his faith
{ const h0 = hurtHero; hurtHero = function (dmg, src) {
  if (!isPal()) return h0(dmg, src);
  if (G.pal && G.pal.wall && (!src || palFront(src.fi, src.fj))) { floater('BLOCK', hero.fi, hero.fj, 44, 51); sfx('block'); palSpark(hero.fi + dirVec(hero.dir)[0] * 0.8, hero.fj + dirVec(hero.dir)[1] * 0.8, 6); faithAdd(1); G.pal.wall.blocked++; return; }
  const hp0 = hero.hp; h0(Math.max(1, dmg * 0.75), src);
  if (hero.hp === hp0 && !hero.dead) faithAdd(1);   // a shield block
}; }
// with wings, a tap at a foe out of reach flies him at it
{ const a0 = heroAttack; heroAttack = function () {
  if (isPal() && palWings() && !hero.leap && !(hero.flyCd > G.t) && hero.atk < 0 && G.mode === 'play') {   // (Wings of Dawn: a shorter wing-dash, less often)
    const arch = palWings().kind === 'arch', t = nearestEnemy(arch ? 7.5 : 5.5);
    if (t && Math.hypot(t.fi - hero.fi, t.fj - hero.fj) > heroReach() + 0.8 && startLeap()) { hero.flyCd = G.t + (arch ? 0.9 : 1.6); hero.palFly = true; sfx('whoomp'); return; }
  }
  return a0();
}; }
function updatePaladin(dt) {
  if (!G.pal) G.pal = palFresh();
  if (!isPal()) return;
  const W = palWings();
  if (W) {
    W.t -= dt;
    if (W.t <= 0) { hero.wing = null; recalcHero(); prewarmHero(); say('THE WINGS FADE', 26, 1.5); }
    else {
      const [x, y] = screenOf(hero), arch = W.kind === 'arch';
      if (Math.random() < dt * (arch ? 40 : 18)) { const s = Math.random() < 0.5 ? -1 : 1; pspawn(4, x + s * (8 + Math.random() * 14), y - 22 - Math.random() * 14, 2, s * 6, 10, -6, 1.2, arch ? (Math.random() < 0.6 ? 51 : 27) : 27); }   // feathers of light drifting down
      if (arch && !hero.leap && hero.atk < 0) hero.leapZ = 3 + Math.sin(G.t * 3.2) * 1.5;   // he hovers
      else if (arch && !hero.leap && hero.combo !== 3) hero.leapZ = 2;
    }
  } else if (hero.leapZ && !hero.leap && hero.combo !== 3 && hero.atk < 0) hero.leapZ = 0;
  if (hero.palFly && !hero.leap) {   // landed from a flight: a burst of light where he comes down
    hero.palFly = false; for (const e of nearFoes(hero.fi, hero.fj, 2.0)) bzHit(e, 1.2, [hero.fi, hero.fj], 2, 'holy');
    shockwave(hero.fi, hero.fj, 2.2, 0.3, [27, 51]); palSpark(hero.fi, hero.fj, 18); palPillar(hero.fi, hero.fj, 0.6);
  }
  if (hero.palRaise > 0) { hero.palRaise -= dt; if (hero.atk < 0 && !hero.leap && !hero.dead) hero.clip = 'raise'; }
  updatePalWaves(dt); updatePalHammers(dt); updatePalConsec(dt); updatePalWall(dt); updatePalJudges(dt);
  for (const p of G.pal.pillars) p.t += dt; G.pal.pillars = G.pal.pillars.filter(p => p.t < p.T);
  for (const m of G.pal.smites) m.t -= dt; G.pal.smites = G.pal.smites.filter(m => m.t > 0);
  for (const c of G.pal.scorch) c.t += dt; G.pal.scorch = G.pal.scorch.filter(c => c.t < c.T);
}
Object.assign(SKILL_FN, { phammer: palThrow, consec: palConsecrate, pwall: palWall, judge: palJudge });

// ================================================================ the wings (on the hero's rig)
// Two wings from the shoulder blades: a bone of light (an arm and a forearm), then a fan of feathers
// hanging from it, the long primaries at the tip. WINGS OF DAWN: white, as wide as he is tall.
// ARCHANGEL: half again as big, gold feathers with burning tips. They breathe in the idle and beat in the walk.
function palWingRig(r, eq, st) {
  const J = bipedJoints(HERO_B, st), { fwd, up, sideR } = J, arch = eq.wings === 'arch';
  const f = st.f || 0, beat = st.clip === 'walk' ? Math.sin(f / 8 * Math.PI * 2) * 0.32 : st.clip === 'idle' ? [0, 0.08, 0.14, 0.08][f % 4] : atkIndex(st.clip) >= 0 ? 0.3 : 0.1;
  const L1 = arch ? 10 : 7.5, L2 = arch ? 13 : 9.5, fl = arch ? 1.5 : 1.1;
  for (const sd of [-1, 1]) {
    const out = V.mul(sideR, sd), root = V.add(V.add(V.mad(J.chest, up, 2.4), V.mul(fwd, -3.4)), V.mul(out, 1.4));
    const th1 = 0.55 + beat, th2 = 0.15 + beat * 0.6;
    const elbow = V.add(V.add(root, V.mul(V.add(V.mul(out, Math.cos(th1)), V.mul(up, Math.sin(th1))), L1)), V.mul(fwd, -1.8));
    const tip = V.add(V.add(elbow, V.mul(V.add(V.mul(out, Math.cos(th2)), V.mul(up, Math.sin(th2))), L2)), V.mul(fwd, -1.6));
    const boneM = arch ? M.HOLY : M.CLOTH_WHITE, featM = arch ? M.GOLD : M.CLOTH_WHITE;
    r.group(() => { r.cone(root, elbow, 1.3 * fl * 0.9, 1.1 * fl * 0.9, boneM, { noShadow: true }); r.cone(elbow, tip, 1.1 * fl * 0.9, 0.6, boneM, { noShadow: true }); });
    const N = arch ? 8 : 6;
    r.group(() => {
      for (let k = 0; k < N; k++) {   // feathers hang from the bone, longest at the tip, swept down and back
        const u = (k + 0.5) / N, at = u < 0.42 ? V.add(root, V.mul(V.sub(elbow, root), u / 0.42)) : V.add(elbow, V.mul(V.sub(tip, elbow), (u - 0.42) / 0.58));
        const len = (arch ? 9 : 6.5) * (0.55 + u * 0.75), dn = V.norm(V.add(V.add(V.mul(up, -1), V.mul(out, 0.25 + u * 0.5)), V.mul(fwd, -0.35)));
        const end = V.mad(at, dn, len);
        r.cone(at, end, 1.25 * fl * 0.85, 0.45, featM, { noShadow: true });
        if (arch && k >= N - 4) r.sph(end, 0.75, M.HOLY, { noShadow: true });   // the primaries' tips burn
      }
    });
  }
}
function palRaiseGlow(r, eq, st) {
  const J = bipedJoints(HERO_B, st), { fwd, up, sideR } = J, hand = V.add(V.add(J.shR, V.mul(fwd, 1.6)), V.add(V.mul(up, 7.2), V.mul(sideR, 0.4))), bd = V.norm(V.add(up, V.mul(fwd, 0.12)));
  const head = V.mad(hand, bd, (GEAR_LEN[eq.weapon] || 16) - 1), big = st.f % 2;
  r.sph(head, big ? 4.2 : 3.4, M.HOLY, { noShadow: true });
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + (big ? 0.5 : 0), d = V.norm(V.add(V.mul(fwd, Math.cos(a)), V.mul(sideR, Math.sin(a)))); r.cone(V.mad(head, d, 3), V.mad(V.mad(head, d, big ? 8 : 6.5), up, 1), 0.9, 0.2, M.HOLY, { noShadow: true }); }
  r.cone(V.mad(head, up, 3), V.mad(head, up, big ? 10 : 8), 1.0, 0.2, M.HOLY, { noShadow: true });
}
{ const hr0 = FAMILIES.hero.rig; FAMILIES.hero.rig = function (eq, st) { const r = hr0(eq, st); if (eq.wings) palWingRig(r, eq, st); if (eq.holy && st.clip === 'raise') palRaiseGlow(r, eq, st); return r; }; }

// ================================================================ drawing the light (on the detail layer)
const line2 = (x0, y0, x1, y1, c) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) + 1; for (let k = 0; k <= n; k++) palPut(x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n, c); };
const palPut = (X, Y, c) => { X = Math.round(X); Y = Math.round(Y); if (X >= 0 && Y >= 0 && X < OW && Y < OH) ov32[Y * OW + X] = PAL32[c]; };
const toDet = (fi, fj, z = 0) => { const [x, y] = iso(fi, fj); return [Math.round(x * SPX) - cam2x, Math.round((y - z) * SPX) - cam2y]; };
const detTile = (X, Y) => { const x = (X + cam2x) / SPX - WX0, y = (Y + cam2y) / SPX - WY0; return [(x + 2 * y) / 32, (2 * y - x) / 32]; };
// the consecration's pattern: every pixel of the circle as an offset, a kind (1 outer rim, 2 inner rim, 3 rune, 4 rune ring,
// 5 the star's heart, 6 the star, 7 glowing ground with its distance from the middle)
const CONSEC_COL = [0, 51, 27, 51, 50, 27, 51, 0];
function consecPattern(C) {
  const rx = Math.ceil(C.R * 22.63 * SPX) + 2, ry = Math.ceil(rx / 2) + 1, [cx, cy] = toDet(C.fi, C.fj), dx = [], dy = [], kk = [], dd = [];
  for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) {
    const [ti, tj] = detTile(cx + x, cy + y), di = ti - C.fi, dj = tj - C.fj, d = Math.hypot(di, dj) / C.R; if (d > 1.0) continue;
    const a = Math.atan2(dj, di); let k = 7;
    if (d > 0.94) k = d > 0.975 ? 1 : 2;
    else if (d > 0.74 && d < 0.88) {
      const g = Math.round(((a / 6.2832 + 1) % 1) * 12) % 12, da = Math.atan2(Math.sin(a - g * 0.5236), Math.cos(a - g * 0.5236)), u = da * d * C.R / 0.2, v = (d - 0.81) * C.R / 0.12;
      if (Math.abs(u) < 1.4 && Math.abs(v) < 1.4) for (const sg of WAY_GLYPHS[g % 8]) if (segD(u, v, sg[0], sg[1], sg[2], sg[3]) < 0.3) { k = 3; break; }
      if (k === 7 && (Math.abs(d - 0.74) < 0.012 || Math.abs(d - 0.88) < 0.012)) k = 4;
    } else if (d < 0.3) { const st = 0.22 * (0.35 + 0.65 * Math.pow(Math.abs(Math.cos(a * 2)), 3)); if (d < st) k = d < 0.06 ? 5 : 6; }
    dx.push(x); dy.push(y); kk.push(k); dd.push(Math.round(d * 255));
  }
  return { n: dx.length, dx: Int16Array.from(dx), dy: Int16Array.from(dy), k: Uint8Array.from(kk), d: Uint8Array.from(dd) };
}
// on the ground, under the bodies: consecration, the judgment's shadow, the waves' trails
function drawPalGround() {
  if (!G.pal) return;
  const C = G.pal.consec;
  if (C) {   // (perf: the circle's pattern is worked out once per cast, as offsets from its middle; each frame only fades and pulses it)
    if (!C.pix) C.pix = consecPattern(C);
    const fade = Math.min(1, C.t / 0.25, (C.T - C.t) / 0.6), [cx, cy] = toDet(C.fi, C.fj), P = C.pix, n = P.n, ph = G.t * 4;
    for (let q = 0; q < n; q++) {
      const X = cx + P.dx[q], Y = cy + P.dy[q]; if (X < 0 || Y < 0 || X >= OW || Y >= OH) continue;
      const k = P.k[q], bay = BAYER[((Y & 3) << 2) | (X & 3)];
      if (k === 7) { const d = P.d[q] / 255, pulse = 0.5 + 0.5 * Math.sin(ph - d * 6); if (bay < (0.05 + 0.13 * pulse) * fade * (1 - d * 0.5)) ov32[Y * OW + X] = PAL32[GOLD[2]]; continue; }
      if (bay < fade * (k === 4 ? 0.9 : k >= 5 ? 0.8 : 1)) ov32[Y * OW + X] = PAL32[CONSEC_COL[k]];
    }
  }
  for (const c of G.pal.scorch) {   // the judgment's cracks of light in the ground, cooling from white to gold to nothing
    const k = 1 - c.t / c.T, [cx, cy] = toDet(c.fi, c.fj), sx = 16 * SPX, sy = 8 * SPX, col = k > 0.75 ? 27 : k > 0.4 ? 51 : 50;
    for (const pts of c.cracks) for (let q = 0; q + 1 < pts.length; q++) {
      const [a0, b0] = pts[q], [a1, b1] = pts[q + 1], n = 14;
      for (let s2 = 0; s2 <= n; s2++) { const u = s2 / n, ti = a0 + (a1 - a0) * u, tj = b0 + (b1 - b0) * u, X = Math.round(cx + (ti - tj) * sx), Y = Math.round(cy + (ti + tj) * sy); if (X < 1 || Y < 1 || X >= OW - 1 || Y >= OH - 1 || (q > 0 && BAYER[((Y & 3) << 2) | (X & 3)] > k * 1.5 - (q / pts.length) * 0.3)) continue; const c = PAL32[col], o = Y * OW + X; ov32[o] = c; ov32[o + 1] = c; if (q < 2) { ov32[o - OW] = PAL32[k > 0.5 ? 27 : 51]; ov32[o + OW] = c; } }
    }
  }
  for (const J of G.pal.judges) if (!J.done) {   // the hammer's shadow and a gathering ring under it
    const u = Math.min(1, J.t / J.T), [cx, cy] = toDet(J.fi, J.fj), rx = J.R * 22.63 * SPX * (0.4 + 0.6 * u), ry = rx / 2;
    for (let a = 0; a < 140; a++) { const t = a / 140 * 6.283; palPut(cx + Math.cos(t) * rx, cy + Math.sin(t) * ry, a % 2 ? 51 : 27); }
    for (let Y = Math.floor(cy - ry * 0.5); Y <= cy + ry * 0.5; Y++) for (let X = Math.floor(cx - rx * 0.5); X <= cx + rx * 0.5; X++) { const dd = ((X - cx) / (rx * 0.5)) ** 2 + ((Y - cy) / (ry * 0.5)) ** 2; if (dd < 1 && BAYER[((Y & 3) << 2) | (X & 3)] < 0.35 * u && X >= 0 && Y >= 0 && X < OW && Y < OH) ov32[Y * OW + X] = PAL32[2]; }
  }
}
// in the air, over the bodies: the waves, the hammers, the wall, the judgment, pillars, marks, the hero's aura
function drawPalAir() {
  if (!G.pal) return;
  for (const w of G.pal.waves) {   // a crescent of light rolling outward: a white edge, gold behind it, thinning as it goes
    const fade = Math.max(0, 1 - Math.max(0, w.t - w.range / w.speed) / 0.25) * (1 - 0.35 * w.front / w.range), [cx, cy] = toDet(w.fi, w.fj), R = w.front, rx = Math.ceil((R + 0.2) * 22.63 * SPX), ry = Math.ceil(rx / 2), lift = w.big ? 7 : 5;
    const thick = w.big ? 0.95 : 0.7, hgt = w.big ? 34 : 22;   // (pass 2: a standing curtain of light, not a scratch on the floor)
    // walked along the crescent itself, not scanned (perf: the Archangel's waves reach 8 tiles)
    const sx = 16 * SPX, sy = 8 * SPX, dr = 1 / (14 * SPX);
    for (let r = Math.max(0.05, R - thick); r <= R; r += dr) {
      const back = (R - r) / thick, da0 = 1 / (r * 16 * SPX);
      for (let a = -w.half; a <= w.half; a += da0) {
        const ga = w.a0 + a, ci = Math.cos(ga) * r, cj = Math.sin(ga) * r;
        const X = Math.round(cx + (ci - cj) * sx), Y = Math.round(cy + (ci + cj) * sy); if (X < 0 || Y < 0 || X >= OW || Y >= OH) continue;
        if (blocked(w.fi + ci, w.fj + cj)) continue;
        const edge = Math.min(1, (1 - Math.abs(a) / w.half) * 3);
        if (back < 0.3) {   // the leading edge rises into a wall of light, tallest in the middle
          const hh = Math.round(hgt * edge * (0.7 + 0.3 * Math.sin(X * 0.7 + G.t * 20)));
          for (let k = 0; k <= hh; k++) { const YY = Y - k; if (YY < 0) break; const bay = BAYER[((YY & 3) << 2) | (X & 3)], u = k / (hh + 1); if (bay > fade * (1.1 - u) * edge) continue; ov32[YY * OW + X] = PAL32[u < 0.35 ? 27 : u < 0.75 ? 51 : GOLD[2]]; }
          continue;
        }
        if (BAYER[((Y & 3) << 2) | (X & 3)] > fade * (1.1 - back) * edge * 0.8) continue;
        ov32[Y * OW + X] = PAL32[back < 0.55 ? 51 : GOLD[2]];
      }
    }
    if (fade > 0.3) { const [gx, gy] = iso(w.fi + Math.cos(w.a0) * w.front, w.fj + Math.sin(w.a0) * w.front); glowAt(gx, gy - 8, w.big ? 24 : 16, 0.4 * fade, GLOW_GOLD); }   // it lights what it passes
  }
  for (const h of G.pal.hammers) {   // a spinning hammer of light: a gold haft, a white-hot head, a halo, afterimages behind
    (h.trail || []).forEach(([fi, fj, sp], n) => { if (!n) return; const [tx, ty] = toDet(fi, fj, 14), c2 = Math.cos(sp), s2 = Math.sin(sp), th = 0.55 - n * 0.1;
      for (let u = -8; u <= 8; u++) for (let v = 0; v <= 6; v++) { const X = Math.round(tx + c2 * (9 + v) - s2 * u), Y = Math.round(ty + s2 * (9 + v) + c2 * u); if (X >= 0 && Y >= 0 && X < OW && Y < OH && BAYER[((Y & 3) << 2) | (X & 3)] < th) ov32[Y * OW + X] = PAL32[51]; } });
    const [cx, cy] = toDet(h.fi, h.fj, 14), ca = Math.cos(h.spin), sa = Math.sin(h.spin);
    for (let k = -10; k <= 8; k++) for (let w = -1; w <= 1; w++) palPut(cx + ca * k - sa * w, cy + sa * k + ca * w, k < -8 || w ? 51 : 27);
    for (let u = -8; u <= 8; u++) for (let v = 0; v <= 6; v++) palPut(cx + ca * (9 + v) - sa * u, cy + sa * (9 + v) + ca * u, Math.abs(u) > 6 || v === 0 || v === 6 ? 51 : 27);
    glowAt(h.fi !== undefined ? iso(h.fi, h.fj)[0] : 0, iso(h.fi, h.fj)[1] - 14, 22, 0.5, GLOW_GOLD);
  }
  const Wl = G.pal.wall;
  if (Wl) {   // a curved wall of light in front of him (pass 2: a clear barrier: a bright crest, ribs of light, a dense glow, sparks rising)
    const [fx, fy] = dirVec(hero.dir), a0 = Math.atan2(fy, fx), fade = Math.min(1, Wl.t / 0.12, (Wl.T - Wl.t) / 0.25 + 0.25), N = 60;
    let prev = null;
    for (let s = -N; s <= N; s++) {
      const u = s / N, a = a0 + u * 1.3, [bx, by] = toDet(hero.fi + Math.cos(a) * 1.45, hero.fj + Math.sin(a) * 1.45, 0), H = Math.round(38 * Math.sqrt(1 - u * u * 0.85));
      const rib = s % 12 === 0, crest = by - H;
      for (let k = 0; k <= H; k++) {
        const Y = by - k; if (Y < 0) break;
        const t = k / H, bay = BAYER[((Y & 3) << 2) | (bx & 3)], shimmer = 0.5 + 0.5 * Math.sin(G.t * 9 + s * 0.35 - k * 0.25);
        if (rib && bay < fade * 0.9) { palPut(bx, Y, t > 0.85 ? 27 : 51); continue; }
        if (bay < fade * (0.18 + 0.32 * t + 0.18 * shimmer)) palPut(bx, Y, t > 0.7 ? 51 : GOLD[2]);
      }
      if (prev) { line2(prev[0], prev[1], bx, crest, 27); line2(prev[0], prev[1] + 1, bx, crest + 1, 51); }   // the crest
      prev = [bx, crest];
      if (Math.random() < 0.04) pspawn(4, (bx + cam2x) / SPX, (by + cam2y) / SPX, 2 + Math.random() * 16, 0, 0, 20, 0.5, 27);
    }
  }
  for (const J of G.pal.judges) {   // the giant hammer of light falling (and, after the blow, a column of light fading)
    const [gx, gy] = toDet(J.fi, J.fj);
    if (!J.done) {
      const u = Math.min(1, J.t / J.T), e = u * u, z = (1 - e) * 170 + 14, cx = gx, cy = gy - z * SPX * 0.5 - 24;
      for (let g2 = 3; g2 >= 1; g2--) palBigHammer(cx, cy - g2 * 16 * (1 - u), 1, 0.25 * (4 - g2) * (1 - u));   // afterimages up its path
      palBigHammer(cx, cy, 1, 1);
      glowAt(J.fi !== undefined ? iso(J.fi, J.fj)[0] : 0, iso(J.fi, J.fj)[1] - z * 0.5, 40, 0.6, GLOW_GOLD);
    } else {
      const k = 1 - (J.t - J.T) / 0.5;
      for (let Y = Math.max(0, gy - 260); Y <= gy; Y++) for (let w = -10; w <= 10; w++) { const X = gx + w, edge = Math.abs(w) / 10; if (X < 0 || X >= OW || BAYER[((Y & 3) << 2) | (X & 3)] > k * (1.1 - edge)) continue; ov32[Y * OW + X] = PAL32[edge < 0.3 ? 27 : 51]; }
    }
  }
  for (const m of G.pal.smites) {   // a four-pointed star of light where the hammer lands, a ring running out from it
    const k = m.t / m.t0, [X, Y] = toDet(m.fi, m.fj, m.z), L = (m.big ? 30 : 20) * (0.55 + 0.45 * k), ca = Math.cos(m.rot), sa = Math.sin(m.rot);
    for (let r2 = 0; r2 < 4; r2++) { const dx = r2 === 0 ? ca : r2 === 1 ? -ca : r2 === 2 ? -sa : sa, dy = r2 === 0 ? sa : r2 === 1 ? -sa : r2 === 2 ? ca : -ca, len = r2 < 2 ? L : L * 0.75;
      for (let q = 0; q <= len; q++) { const w = Math.round((1 - q / len) * (m.big ? 2.4 : 1.6) * k); for (let t2 = -w; t2 <= w; t2++) palPut(X + dx * q - dy * t2, Y + dy * q + dx * t2, q < 4 ? 27 : Math.abs(t2) === w && w > 0 ? 50 : 51); } }
    for (const [dx, dy] of [[0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]]) for (let q = 0; q <= L * 0.35; q++) palPut(X + (dx * ca - dy * sa) * q, Y + (dx * sa + dy * ca) * q, 27);
    for (let yy = -3; yy <= 3; yy++) for (let xx = -3; xx <= 3; xx++) if (xx * xx + yy * yy <= 9) palPut(X + xx, Y + yy, 27);
    const rr = (1 - k) * L * 1.1 + 4; for (let q = 0; q < 40; q++) { const t2 = q / 40 * 6.283; if (BAYER[q & 15] < k) palPut(X + Math.cos(t2) * rr, Y + Math.sin(t2) * rr * 0.6, 51); }
  }
  for (const p of G.pal.pillars) {   // Archangel's pillars: a beam down from the sky, a flash where it lands (big: the wings' beam on him)
    const [gx, gy] = toDet(p.fi, p.fj), k = 1 - p.t / p.T, wdt = (6 + 3 * k) * (p.big ? 1 + p.big * 0.9 : 1);
    for (let Y = Math.max(0, gy - 300); Y <= gy; Y++) for (let w = -wdt; w <= wdt; w++) { const X = Math.round(gx + w), edge = Math.abs(w) / wdt; if (X < 0 || X >= OW || BAYER[((Y & 3) << 2) | (X & 3)] > k * (1.05 - edge)) continue; ov32[Y * OW + X] = PAL32[edge < 0.35 ? 27 : p.white ? 26 : 51]; }
    for (let a = 0; a < 60; a++) { const t = a / 60 * 6.283; palPut(gx + Math.cos(t) * 14 * (1.4 - k) * (p.big ? 1.6 : 1), gy + Math.sin(t) * 7 * (1.4 - k) * (p.big ? 1.6 : 1), 27); }
  }
  for (const e of enemies) if (e.palMark > G.t && alive(e)) {   // the sun mark over a judged foe
    const [x, y] = toDet(e.fi, e.fj, (e.def.chest || 16) * 1.6 + 10), sp = G.t * 2;
    for (let a = 0; a < 8; a++) { const t = a / 8 * 6.283 + sp; for (let r = 3; r <= 5; r++) palPut(x + Math.cos(t) * r, y + Math.sin(t) * r, 51); }
    for (let yy = -2; yy <= 2; yy++) for (let xx = -2; xx <= 2; xx++) if (xx * xx + yy * yy <= 5) palPut(x + xx, y + yy, xx * xx + yy * yy <= 1 ? 27 : 51);
  }
  const W = palWings();
  if (W && isPal()) { const [x, y] = screenOf(hero); glowAt(x, y - 22, W.kind === 'arch' ? 38 : 26, W.kind === 'arch' ? 0.45 : 0.24, W.kind === 'arch' ? GLOW_GOLD : [210, 220, 255]); }
}

// ================================================================ the HUD: the faith button, the skills' faces
{ const ub0 = drawUltButton; drawUltButton = function () {
  if (!isPal()) return ub0();
  const fx = btnFx(9), dtu = 1 / 60; fx.press = Math.max(0, fx.press - dtu); fx.deny = Math.max(0, fx.deny - dtu);
  const c0 = UI.ult, shake = fx.deny > 0 ? Math.round(Math.sin(fx.deny * 70) * 2) : 0, c = [c0[0] + shake, c0[1], c0[2] + (fx.press > 0.08 ? 1 : 0)];
  const locked = hero.lvl < ULT_LVL, W = palWings(), f = locked ? 0 : (hero.ult || 0) / 100, arch = f >= 1, dawn = f >= 0.5, pulse = Math.floor(G.t * 4) % 2;
  drawButton(c, locked ? [3, 4, 5] : W ? (W.kind === 'arch' ? [48, 49, 50, 51] : [24, 25, 26, 27]) : arch ? (pulse ? [48, 49, 50, 51] : [49, 50, 51, 27]) : dawn ? [24, 25, 26, 27] : [3, 4, 5, 6], dawn || !!W, glyphWings);
  if (W) { const u = W.t / W.T; for (let a = 0; a < 80; a++) { const v = a / 80, t = -Math.PI / 2 + v * 6.283; if (v > u) continue; put(c[0] + Math.cos(t) * (c[2] + 2), c[1] + Math.sin(t) * (c[2] + 2), W.kind === 'arch' ? 51 : 27); put(c[0] + Math.cos(t) * (c[2] + 3), c[1] + Math.sin(t) * (c[2] + 3), W.kind === 'arch' ? 50 : 26); } }
  else if (!locked) {
    for (let a = 0; a < 80; a++) { const v = a / 80, t = -Math.PI / 2 + v * 6.283; if (v > f) continue; put(c[0] + Math.cos(t) * (c[2] + 2), c[1] + Math.sin(t) * (c[2] + 2), v < 0.5 ? 27 : 51); put(c[0] + Math.cos(t) * (c[2] + 3), c[1] + Math.sin(t) * (c[2] + 3), v < 0.5 ? 26 : 50); }
    { const t = Math.PI / 2; for (let r = c[2] + 1; r <= c[2] + 5; r++) put(c[0] + Math.cos(t) * r, c[1] + Math.sin(t) * r, 27); }   // a tick at the half
    if ((arch || dawn) && pulse) for (let a = 0; a < 80; a++) { const t = a / 80 * 6.283; put(c[0] + Math.cos(t) * (c[2] + 5), c[1] + Math.sin(t) * (c[2] + 5), arch ? 51 : 27); }
  }
  if (locked) textC(`LV${ULT_LVL}`, c[0], c[1] - 2, 25);
  textC(W ? `${W.kind === 'arch' ? 'ARCHANGEL' : 'WINGS'} ${Math.ceil(W.t)}` : arch ? 'ARCHANGEL' : dawn ? 'WINGS' : 'FAITH', c[0], c[1] + c[2] + 8, W || arch ? 51 : dawn ? 27 : 25);
  if (fx.deny > 0) for (let a = 0; a < 64; a++) { const t = a / 64 * 6.283; put(c[0] + Math.cos(t) * (c[2] + 1), c[1] + Math.sin(t) * (c[2] + 1), 22); }
}; }
// round 98: the judgment's hammer, head down: a haft wrapped in gold, a bevelled head lit from above, gold bands, a burning sun on its face
function palBigHammer(cx, cy, sc, a) {
  const P = (X, Y, c) => { X = Math.round(X); Y = Math.round(Y); if (a < 1 && BAYER[((Y & 3) << 2) | (X & 3)] >= a) return; palPut(X, Y, c); };
  const HW = 36 * sc, HH = 28 * sc, hl = 90 * sc;
  for (let k = 0; k < hl; k++) for (let w = -4; w <= 4; w++) { const aw = Math.abs(w); P(cx + w, cy - 8 - k, aw === 4 ? 49 : k % 16 < 4 ? (aw < 2 ? 27 : 51) : aw < 2 ? 32 : 31); }   // the haft: white steel, gold wraps
  for (let w = -6; w <= 6; w++) for (let v = 0; v < 5; v++) P(cx + w, cy - 8 - hl - v, Math.abs(w) === 6 || v === 4 ? 49 : 51);   // the pommel
  for (let u2 = -HW; u2 <= HW; u2++) for (let v = -4; v < HH; v++) {
    const au = Math.abs(u2), edge = au > HW - 2 || v < -2 || v > HH - 3, bev = v < 3 || au > HW - 6;
    const sun = Math.hypot(u2 * 0.9, v - HH * 0.45), band = Math.abs(au - HW * 0.62) < 2.5;
    P(cx + u2, cy + v, edge ? 49 : sun < 5 ? 27 : sun < 9 && Math.abs(Math.sin(Math.atan2(v - HH * 0.45, u2) * 4)) > 0.6 ? 51 : sun < 9 ? 50 : band ? 51 : bev ? 27 : v > HH * 0.7 ? 31 : 32);
  }
}
// glyphs: a pair of wings; a hammer; a ring with rays; a shield; a hammer falling on a line
const glyphWings = (cx, cy) => { for (const s of [-1, 1]) { for (let k = 0; k < 6; k++) { line(cx + s * 1, cy - 1, cx + s * (3 + k), cy - 5 + k * 0.6, 27); } line(cx + s * 2, cy + 2, cx + s * 7, cy + 4, 26); } put(cx, cy - 1, 51); put(cx, cy, 51); };
const glyphHammer = (cx, cy) => { line(cx - 4, cy + 5, cx + 1, cy, 33); line(cx - 3, cy + 5, cx + 2, cy, 34); for (let u = -3; u <= 3; u++) for (let v = -1; v <= 1; v++) put(cx + 2 + u * 0.7 + v * 0.7, cy - 1 - u * 0.7 + v * 0.7, Math.abs(u) === 3 ? 51 : 27); };
const glyphConsec = (cx, cy) => { for (let a = 0; a < 32; a++) { const t = a / 32 * 6.283; put(cx + Math.cos(t) * 6, cy + Math.sin(t) * 3.5, 51); } for (let a = 0; a < 8; a++) { const t = a / 8 * 6.283; line(cx, cy, cx + Math.cos(t) * 3, cy + Math.sin(t) * 2, 27); } line(cx, cy - 1, cx, cy - 7, 27); };
const glyphWall = (cx, cy) => { for (let y = -6; y <= 6; y++) { const w = y < 2 ? 5 : 5 - (y - 2) * 1.2; for (let x = -w; x <= w; x++) put(cx + x, cy + y, Math.abs(x) > w - 1 || y === -6 ? 51 : 39); } line(cx, cy - 4, cx, cy + 3, 27); line(cx - 3, cy - 1, cx + 3, cy - 1, 27); };
const glyphJudge = (cx, cy) => { for (let u = -4; u <= 4; u++) for (let v = 0; v <= 2; v++) put(cx + u, cy + 1 + v, Math.abs(u) === 4 ? 51 : 27); line(cx, cy, cx, cy - 7, 51); line(cx - 6, cy + 5, cx + 6, cy + 5, 26); put(cx - 5, cy + 4, 27); put(cx + 5, cy + 4, 27); };
Object.assign(SPELL_LOOK, { phammer: [[48, 49, 50, 51], glyphHammer], consec: [[48, 49, 50, 51], glyphConsec], pwall: [[37, 38, 39, 40], glyphWall], judge: [[24, 25, 26, 27], glyphJudge] });
{ const nh0 = newHero; newHero = function (cls) { hero.wing = null; hero.palFly = false; hero.flyCd = 0; return nh0(cls); }; }
// the skills screen's live previews (preview.js): how long each loop runs
if (typeof PV_PLAN !== 'undefined') Object.assign(PV_PLAN, { phammer: { len: 2.4 }, consec: { len: 3.4 }, pwall: { len: 3.6 }, judge: { len: 2.8 } });
