'use strict';
// round 110: the barbarian's mid-tier gear from the user's concept sheets (art/refs/gear/round110/). Owned by one builder; see NOTES.md row 110.
// Gear looks stopped at about level 5 and Act I runs to 9-11, so three new looks: TUSKBREAKER (L6, a boar's
// head and a spiked leather pauldron), THUNDERHORN (L8, an iron cap with coiled ram's horns, grey fur
// shoulders, blue lightning paint) and MAMMOTH CHIEFTAIN (L10, a mammoth's skull with burning eyes, a great
// shaggy mantle, a necklace of teeth). Six weapons from the weapons sheet (04): a tusk-hafted axe and a
// bone-spiked club (L6), a double-bitted great axe and a bone-handled flail (L8), a great axe with glowing
// edges and a bone-guarded cleaver (L10). Everything goes through the hooks barbarian.js and actors.js
// already have (ITEM_BASES, WARRIOR_SETS + CHEST_RETOUCH, GEAR_EXTRA, GEAR_SWING, GEAR_LEN, itemIcon).

// ---------------------------------------------------------------- the pieces
// Stats continue the curves: chests 3/6/9/12/16 (L1-5) -> 20/25/30, helms 1/4/6/9 -> 11/13/16. A piece found
// above its base level grows by the gear curve (itemStats), so each new base beats the one before it found at
// the same level (L5 Warlord's Furs at L6 = 17 armor vs 20; the L6 hide at L8 = 22 vs 25; the L8 harness at
// L10 = 27 vs 30). One-handers: the best older one (froststeel axe / flanged mace, L4 10-21) at L6 is 13-26,
// so 14-28; then +7-8% over the last tier at each step. Two-handers roll 1.35x a one-hander of their tier,
// the rule MELEE_K (barbarian.js) is solved against.
Object.assign(ITEM_BASES, {
  bt_tusk: { slot: 'chest', look: 'bt_tusk', name: 'TUSKBREAKER HIDE', armor: 20, cls: 'warrior', lvl: 6, icon: 'brigandine', tint: 'BT_DFUR' },
  bt_boar: { slot: 'helm', look: 'bt_boar', name: "BOAR'S HEAD", armor: 11, cls: 'warrior', lvl: 6 },
  bt_tuskaxe: { slot: 'weapon', look: 'bt_tuskaxe', name: 'TUSK AXE', dmg: [14, 28], cls: 'warrior', lvl: 6, slow: true },
  bt_club: { slot: 'weapon', look: 'bt_club', name: 'BONESPIKE CLUB', dmg: [13, 30], cls: 'warrior', lvl: 6, slow: true },
  bt_thunder: { slot: 'chest', look: 'bt_thunder', name: 'THUNDERHORN HARNESS', armor: 25, cls: 'warrior', lvl: 8, icon: 'brigandine', tint: 'FUR' },
  bt_ram: { slot: 'helm', look: 'bt_ram', name: 'THUNDERHORN HELM', armor: 13, cls: 'warrior', lvl: 8 },
  bt_dblaxe: { slot: 'weapon', look: 'bt_dblaxe', name: 'THUNDERHORN AXE', dmg: [24, 49], cls: 'warrior', lvl: 8, slow: true, twoHand: true },
  bt_flail: { slot: 'weapon', look: 'bt_flail', name: 'BONEHANDLE FLAIL', dmg: [18, 36], cls: 'warrior', lvl: 8, slow: true },
  bt_mammoth: { slot: 'chest', look: 'bt_mammoth', name: "CHIEFTAIN'S MAMMOTH FURS", armor: 30, cls: 'warrior', lvl: 10, icon: 'brigandine', tint: 'BT_PALE' },
  bt_mskull: { slot: 'helm', look: 'bt_mskull', name: 'MAMMOTH SKULL', armor: 16, cls: 'warrior', lvl: 10 },
  bt_emberaxe: { slot: 'weapon', look: 'bt_emberaxe', name: 'EMBERHORN GREAT AXE', dmg: [30, 60], cls: 'warrior', lvl: 10, slow: true, twoHand: true },
  bt_cleaver: { slot: 'weapon', look: 'bt_cleaver', name: 'BONEGRIP CLEAVER', dmg: [22, 45], cls: 'warrior', lvl: 10 },
});
// TEMPERED and ANCIENT tiers, as items.js gives the outfits and paladin.js the paladin's pieces
for (const id of Object.keys(ITEM_BASES).filter(k => k.startsWith('bt_') && !/_t\d$/.test(k))) {
  const b = ITEM_BASES[id];
  TIERS.forEach(([word, up], n) => {
    const L = b.lvl + up, k = (L + 2) / (b.lvl + 2), v = Object.assign({}, b, { name: word + ' ' + b.name, lvl: L, root: id, tier: n + 1 });
    if (b.dmg) { const kd = Math.pow(k, 0.8); v.dmg = [Math.round(b.dmg[0] * kd), Math.round(b.dmg[1] * kd)]; }
    if (b.armor) v.armor = Math.round(b.armor * Math.sqrt(k));
    ITEM_BASES[id + '_t' + (n + 1)] = v;
  });
}
for (const id of ['bt_tusk', 'bt_thunder', 'bt_mammoth']) WARRIOR_SETS[id] = { base: 'brigandine' };   // drawn over the brigandine's frame, stripped to skin (barbBare)
Object.assign(GEAR_SWING, { bt_tuskaxe: 'heavy', bt_club: 'heavy', bt_dblaxe: 'heavy', bt_flail: 'heavy', bt_emberaxe: 'heavy', bt_cleaver: 'light' });
Object.assign(GEAR_LEN, { bt_tuskaxe: 16, bt_club: 16, bt_dblaxe: 20, bt_flail: 17, bt_emberaxe: 21, bt_cleaver: 18 });

// ---------------------------------------------------------------- shared bits
// two furs the palette's materials lacked: the boar's near-black brown (BOAR is a lighter grey-brown, the bear's)
// and the mammoth's pale top coat (a beige ramp from the dirt browns up to bone white)
defMat('BT_DFUR', [2, 98, 99, 100], 2, { span: 0.9 });
defMat('BT_PALE', [101, 102, 103, 26], 2, { span: 0.8 });
const btDisc = (r, J, m, rad) => { const c = V.mad(V.mad(J.pelvis, J.up, 3.0), J.fwd, (3.8 + 0.75 * 1.4) * HERO_BK + 0.7); r.cyl(V.mad(c, J.fwd, -0.3), V.mad(c, J.fwd, 0.5), rad, m); };   // a round buckle over the belt's (the belt's front as warriorSet's belt() puts it)
const btBand = (S, q, from, w, m) => { if (!q) return; const b = q.b; S.paint(q, p => Math.abs(V.len(V.sub(p, b)) - from) < w ? m : 0); };   // a ring round a limb, `from` back from its end
const btShag = (c, J, z0, n = 9, m = M.DARK) => p => { const q = V.sub(p, c), a = Math.atan2(V.dot(q, J.sideR), V.dot(q, J.fwd)); return V.dot(q, J.up) < z0 && Math.sin(a * n) > 0.5 ? m : 0; };   // dark notches round a fur mass's lower edge
// a curved horn or tusk through points, tapering
function btHorn(r, pts, r0, r1, m, o) { const n = pts.length - 1; for (let k = 0; k < n; k++) r.cone(pts[k], pts[k + 1], r0 + (r1 - r0) * k / n, r0 + (r1 - r0) * (k + 1) / n, m, o); }
const btAt = (o, J, f, s, z) => V.add(V.add(V.mad(o, J.fwd, f), V.mul(J.sideR, s)), V.mul(J.up, z));

// ---------------------------------------------------------------- TUSKBREAKER (L6): a dark boar-hide vest open on the bare chest, orange claw
// marks, a big leather pauldron on the left shoulder with three ivory spikes, a round iron buckle, a fur kilt
CHEST_RETOUCH.bt_tusk = (r, J, S) => {
  const { chest, abd, pel, A, L, mat, belt, skirt } = S; barbBare(S);
  const claw = p => { const [f, s, z] = S.loc(p); if (f < 1.0 || z < -1.6 || z > 3.4) return 0; for (const o of [-0.5, 0.9, 2.3]) if (Math.abs(s - o + (z - 1) * 0.7) < 0.36) return M.HAIR_O; return 0; };   // three slashes down across the chest
  const vest = p => { const [f, s, z] = S.loc(p); return f > 0.2 && Math.abs(s) < 3.3 + Math.max(0, z) * 0.2 ? 0 : M.BT_DFUR; };
  chest.mf = p => vest(p) || claw(p); abd.mf = vest;
  const { fwd, up, sideR } = J;
  { const c = btAt(J.chest, J, -0.6, 4.6, 4.0); r.sph(c, 3.0, M.BT_DFUR, { mf: btShag(c, J, -1.2, 7) }); }   // a fur tuft on the right shoulder
  const pd = btAt(J.chest, J, -0.3, -5.6, 3.6);   // the pauldron: a leather dome, its rim rolled, three tusks curving up and out
  r.group(() => { r.ell(pd, [3.9, 3.6, 3.0], M.LEATHER, frameAlong(fwd, up), { mf: p => V.dot(V.sub(p, pd), up) < -1.3 ? M.BT_DFUR : 0 }); });
  for (const [f, k] of [[2.0, 0.9], [-0.2, 1.1], [-2.3, 0.9]]) {
    const b0 = btAt(pd, J, f, -1.6, 1.6);
    btHorn(r, [b0, btAt(b0, J, 0, -2.0 * k, 1.6 * k), btAt(b0, J, 0, -2.6 * k, 4.0 * k)], 1.05, 0.25, M.BONE);
  }
  mat(A('fore'), M.BT_DFUR); for (const q of A('fore')) btBand(S, q, 0.9, 0.7, M.LEATHER);
  mat([pel, ...L('thigh')], M.BT_DFUR); mat(L('boot'), M.LEATHER);
  belt(M.LEATHER); btDisc(r, J, M.IRON, 1.9);
  skirt(M.BT_DFUR, { front: 4.4, fw: 2.6, fm: M.LEATHER, side: 3.4, back: 4.2, smf: p => S.loc(p)[2] < -6 ? M.DARK : 0 });
};
// the boar's head worn as a hood: dark bristled fur, ears up, a pink-brown snout on the brow, great ivory tusks
GEAR_EXTRA.helm.bt_boar = (r, { hd, fwd, up, sideR, helmF, eq }) => {
  barbFace(r, hd, fwd, up, sideR, helmF, eq, { under: 2, noEars: true });
  const J = { fwd, up, sideR }, hc = V.add(V.mad(hd, up, 2.2), V.mul(fwd, -1.3));   // (pass 2: back and up off his face; it hid the face)
  r.group(() => {
    r.ell(hc, [4.7, 4.9, 4.4], M.BT_DFUR, helmF);
    r.cone(btAt(hd, J, -3.8, 0, 1.2), btAt(hd, J, -5.0, 0, -4.6), 3.2, 1.4, M.BT_DFUR);   // the mane down his back
  });
  const sn = btAt(hd, J, 1.8, 0, 5.6), tip = btAt(hd, J, 4.4, 0, 6.0);   // the snout sits on his brow, tipped up (pass 3: lower, it covered his whole face from the camera's height)
  r.cone(sn, tip, 2.0, 1.8, M.BT_DFUR);
  r.ell(V.mad(tip, fwd, 0.5), [0.8, 1.9, 1.6], M.FLESH, helmF, { mf: p => { const q = V.sub(p, tip); return V.dot(q, fwd) > 0.9 && Math.abs(Math.abs(V.dot(q, sideR)) - 0.8) < 0.4 && Math.abs(V.dot(q, up)) < 0.6 ? M.DARK : 0; } });   // the pink snout's end, two nostrils
  for (const s of [-1, 1]) {
    r.cone(btAt(hd, J, -0.6, s * 2.8, 5.4), btAt(hd, J, -1.2, s * 4.6, 8.6), 1.6, 0.3, M.BT_DFUR);   // ears
    r.sph(btAt(hd, J, 2.6, s * 2.2, 5.8), 0.6, M.DARK, { noShadow: true });   // the boar's small eyes
    const t0 = btAt(hd, J, 3.4, s * 3.0, -0.4);   // tusks: out from beside his jaw, sweeping out and up past his temples
    btHorn(r, [t0, btAt(hd, J, 3.8, s * 5.4, -0.6), btAt(hd, J, 3.4, s * 7.2, 1.4), btAt(hd, J, 2.6, s * 7.4, 4.0)], 1.3, 0.3, M.BONE);
  }
};
// the tusk axe: a curved tusk for a haft, bound in leather, an iron head with a bright edge
GEAR_EXTRA.weapon.bt_tuskaxe = (r, { g, bd, wide, wf }) => {
  const at = t => V.add(V.mad(g, bd, t), V.mul(wide, -2.2 * Math.pow(Math.max(0, (11 - t) / 15), 2)));   // the tusk bows back toward its point
  r.group(() => { const ts = [-4.4, -1, 3, 7, 11, 14.2]; for (let k = 0; k + 1 < ts.length; k++) r.cone(at(ts[k]), at(ts[k + 1]), k === 0 ? 0.35 : 1.0, 1.05, M.BONE); });
  for (const t of [-0.6, 1.2, 9.8]) r.cyl(at(t - 0.5), at(t + 0.5), 1.25, M.LEATHER);   // bindings
  r.group(() => {
    r.box(V.add(V.mad(g, bd, 11.2), V.mul(wide, 2.6)), [2.3, 1.8, 0.55], M.IRON, wf);
    r.box(V.add(V.mad(g, bd, 11.2), V.mul(wide, 4.6)), [3.6, 0.8, 0.45], M.BLADE, wf);
    r.cone(V.add(V.mad(g, bd, 9.4), V.mul(wide, 4.6)), V.add(V.mad(g, bd, 7.0), V.mul(wide, 4.2)), 0.9, 0.35, M.BLADE);   // the beard
  });
};
// the club: a knotted wooden club thickening to its head, iron bands, bone spikes all round
GEAR_EXTRA.weapon.bt_club = (r, { g, bd, wide, wf }) => {
  const n = wf[2];
  r.group(() => { r.cone(V.mad(g, bd, 1.0), V.mad(g, bd, 11.5), 1.0, 2.5, M.WOOD); r.sph(V.mad(g, bd, 12.2), 2.4, M.WOOD); });
  for (const t of [6.4, 10.0]) r.cyl(V.mad(g, bd, t - 0.5), V.mad(g, bd, t + 0.5), t < 8 ? 1.9 : 2.6, M.IRON);
  for (const [t, a, l] of [[13.6, 0, 3.4], [11.6, 0.3, 3.0], [11.6, 2.4, 3.0], [11.6, 4.5, 3.0], [8.6, 1.3, 2.6], [8.6, 3.4, 2.6], [8.6, 5.5, 2.6]]) {
    const d = t > 13 ? bd : V.norm(V.add(V.mul(wide, Math.cos(a)), V.mul(n, Math.sin(a)))), rr = t > 13 ? 1.8 : t > 10 ? 2.2 : 1.8, b0 = V.mad(V.mad(g, bd, t), d, rr);
    r.cone(b0, V.mad(V.mad(b0, d, l), bd, 0.4), 0.8, 0.15, M.BONE, { noShadow: true });
  }
};

// ---------------------------------------------------------------- THUNDERHORN (L8): bare chest crossed by straps front and back, a blue
// lightning bolt painted over the heart, great grey fur shoulders, gold armbands, a leather loincloth, dark trousers
CHEST_RETOUCH.bt_thunder = (r, J, S) => {
  const { chest, abd, pel, A, L, mat, belt, skirt } = S; barbBare(S);
  const strap = p => { const [f, s, z] = S.loc(p); return Math.abs(s * 0.85 + z - 0.2) < 0.7 || Math.abs(-s * 0.85 + z - 0.2) < 0.7; };   // an X, front and back
  const bolt = p => { const [f, s, z] = S.loc(p); if (f < 1.0) return 0; const x = s + 1.9, y = z - 2.0;   // a zigzag down the left breast
    if (y > 1.6 || y < -2.8) return 0; const c = y > 0 ? -y * 0.5 : y > -1.2 ? y * 0.9 : -1.08 - (y + 1.2) * 0.5; return Math.abs(x - c) < 0.5 ? M.CLOTH_BLUE : 0; };
  chest.mf = p => bolt(p) || (strap(p) ? M.LEATHER : 0); abd.mf = p => strap(p) ? M.LEATHER : 0;
  const { fwd, up } = J;
  for (const s of [-1, 1]) {   // a shaggy grey fur over each shoulder
    const c = btAt(J.chest, J, -0.6, s * 5.6, 4.2);   // (pass 2: bigger and shaggier: they read as grey stone balls)
    r.group(() => { r.ell(c, [4.8, 4.2, 3.4], M.FUR, frameAlong(fwd, up), { mf: btShag(c, J, -0.6, 11) }); r.sph(btAt(c, J, -1.8, -s * 2.0, 0.4), 3.0, M.FUR); });
  }
  { const c = btAt(J.chest, J, -3.4, 0, 2.6); r.ell(c, [2.2, 6.6, 3.2], M.FUR, frameAlong(fwd, up), { mf: btShag(c, J, -1.4, 13) }); }   // the fur joined across his back
  for (const q of A('sleeve')) btBand(S, q, 1.4, 0.75, M.GOLD);   // gold armbands above the elbow
  for (const q of A('fore')) btBand(S, q, 1.0, 0.75, M.GOLD);   // and gold cuffs
  mat([pel, ...L('thigh'), ...L('shin')], M.CLOTH_SHADOW); mat(L('boot'), M.LEATHER);
  belt(M.LEATHER); skirt(M.LEATHER, { front: 4.4, fw: 2.8, side: 2.6, back: 4.0, bw: 3.0 });
};
// an iron cap, round and dark, with coiled ram's horns beside it; a blue bolt painted down over his left eye
GEAR_EXTRA.helm.bt_ram = (r, { hd, fwd, up, sideR, helmF, eq }) => {
  const J = { fwd, up, sideR }, fm = faceMf(hd, fwd, sideR, up, { under: 1, hair: HAIRM[eq.hair] || M.HAIR_O });
  const paint = p => { const q = V.sub(p, hd), f = V.dot(q, fwd), s = V.dot(q, sideR), z = V.dot(q, up); if (f < 1.5) return 0;   // the bolt over the left eye
    const c = -1.65 + (z > 0.2 ? (z - 0.2) * 0.6 : -(z - 0.2) * 0.9 - 0.2); return z < 2.0 && z > -2.6 && Math.abs(s - c) < 0.42 ? M.CLOTH_BLUE : 0; };
  r.ell(hd, [4.3, 4.3, 4.5], M.FACE, helmF, { mf: p => { const v = fm(p); return v === M.EYE || v === M.GLINT ? v : paint(p) || v; } }); faceParts(r, hd, fwd, sideR, up, false);
  const hc = V.mad(hd, up, 2.0);
  r.ell(hc, [4.75, 4.7, 4.0], M.IRON, helmF, { mf: p => V.dot(V.sub(p, hc), up) < -1.9 ? M.DSTEEL : 0 });
  for (const s of [-1, 1]) {   // each horn: up out of the temple, then a coil turned half to the front, half to the side (pass 2: edge-on from the side it read as a stick)
    const hz = V.norm(V.add(V.mul(sideR, s * 0.8), V.mul(fwd, -0.6))), c = V.add(btAt(hd, J, -0.2, s * 3.4, 2.8), V.mul(hz, 3.2)), pts = [btAt(hd, J, 0.4, s * 3.4, 3.8)];
    for (let k = 0; k <= 8; k++) { const a = Math.PI * (0.6 - k * 0.24), R = 3.5 - k * 0.25; pts.push(V.add(V.add(c, V.mul(hz, Math.cos(a) * R)), V.add(V.mul(up, Math.sin(a) * R), V.mul(V.cross(up, hz), s * 0.2 * k)))); }
    btHorn(r, pts, 1.6, 0.5, M.CLOTH_TAN);
  }
};
// the double-bitted great axe: a long ash haft wrapped in leather, two crescent blades round an iron core
GEAR_EXTRA.weapon.bt_dblaxe = (r, { g, bd, wide, wf }) => {
  r.cone(V.mad(g, bd, -7), V.mad(g, bd, 17), 0.95, 0.95, M.WOOD);
  r.cone(V.mad(g, bd, -6.2), V.mad(g, bd, 0.4), 1.15, 1.15, M.LEATHER);   // the long two-hand wrap
  r.sph(V.mad(g, bd, -7.4), 1.4, M.IRON);
  const h = V.mad(g, bd, 14.6);
  r.box(h, [2.2, 1.5, 1.2], M.IRON, wf);
  for (const s of [-1, 1]) r.group(() => {
    r.box(V.add(h, V.mul(wide, s * 3.4)), [2.2, 2.2, 0.5], M.IRON, wf);
    r.box(V.add(h, V.mul(wide, s * 5.6)), [3.4, 0.9, 0.45], M.BLADE, wf);
    for (const e of [1, -1]) r.cone(V.add(h, V.mul(wide, s * 5.6)), V.add(V.mad(h, bd, e * 4.8), V.mul(wide, s * 4.8)), 0.95, 0.3, M.BLADE);   // the crescent's horns
  });
  r.cone(V.mad(h, bd, 1.2), V.mad(h, bd, 3.6), 1.0, 0.4, M.IRON);
};
// the flail: a bone handle bound in leather, a chain, a spiked iron ball
GEAR_EXTRA.weapon.bt_flail = (r, { g, bd, wide, wf, up }) => {
  up = up || [0, 0, 1];
  r.cone(V.mad(g, bd, -1.2), V.mad(g, bd, 6.6), 1.0, 1.0, M.LEATHER);
  r.cone(V.mad(g, bd, 5.8), V.mad(g, bd, 7.6), 1.0, 1.0, M.BONE); r.sph(V.mad(g, bd, 7.8), 1.4, M.BONE);   // the bone knob at its top
  const sag = V.norm(V.add(bd, V.mul(up, -0.55)));
  for (let k = 1; k <= 4; k++) r.sph(V.mad(V.mad(g, bd, 8.2), sag, k * 1.5), 0.65, M.IRON, { noShadow: true });
  const ball = V.mad(V.mad(g, bd, 8.2), sag, 8.6);
  r.sph(ball, 2.8, M.IRON);
  for (const d of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1], [0.7, 0.7, 0], [-0.7, -0.7, 0]]) r.cone(V.mad(ball, d, 2.3), V.mad(ball, d, 4.3), 0.75, 0.15, M.STEEL, { noShadow: true });
};

// ---------------------------------------------------------------- MAMMOTH CHIEFTAIN (L10): a great shaggy mantle, pale on top and brown
// below, a necklace of big teeth on the bare chest, a dark belt with a bone disc, shaggy cuffs, kilt and boots
CHEST_RETOUCH.bt_mammoth = (r, J, S) => {
  const { chest, abd, pel, A, L, mat, belt, skirt } = S; barbBare(S);
  const { fwd, up, sideR } = J, FUR = M.LEATHER, mc = btAt(J.chest, J, -1.0, 0, 4.6);   // (the mammoth's warm brown is the leather ramp)
  r.group(() => {   // the mantle: a broad brown mass over both shoulders and down the back, its edge shaggy
    r.ell(mc, [5.6, 9.0, 3.4], FUR, frameAlong(fwd, up), { mf: btShag(mc, J, -1.4, 11) });
    for (const s of [-1, 1]) { const c = btAt(J.chest, J, -0.4, s * 6.6, 3.4); r.sph(c, 3.9, FUR, { mf: btShag(c, J, -1.6, 7) }); }
    const bk = btAt(J.chest, J, -4.0, 0, 0.0); r.ell(bk, [2.4, 7.2, 6.8], FUR, frameAlong(fwd, up), { mf: btShag(bk, J, -5.0, 13) });
  });
  { const c = btAt(mc, J, -0.4, 0, 1.4);   // the pale coat over its top (pass 2: bigger, out to the shoulders' ends)
    r.group(() => { r.ell(c, [5.2, 9.2, 2.8], M.BT_PALE, frameAlong(fwd, up), { mf: btShag(c, J, -0.8, 15, FUR) });
      for (const s of [-1, 1]) { const q = btAt(J.chest, J, -0.6, s * 6.6, 5.0); r.sph(q, 3.4, M.BT_PALE, { mf: btShag(q, J, -1.4, 7, FUR) }); } }); }
  r.cyl(btAt(J.chest, J, 3.3, -3.2, 3.6), btAt(J.chest, J, 3.3, 3.2, 3.6), 0.5, M.LEATHER);   // the cord
  for (const [s, l] of [[-2.4, 2.0], [0, 2.8], [2.4, 2.0]]) {   // the necklace: three great teeth (pass 2: five thin ones read as a grey beard)
    const b0 = btAt(J.chest, J, 4.0 - Math.abs(s) * 0.3, s, 3.4);
    r.cone(b0, V.add(V.mad(b0, up, -l), V.mul(fwd, 0.5)), 1.25, 0.3, M.BONE, { noShadow: true });
  }
  mat(A('fore'), FUR); for (const q of A('fore')) btBand(S, q, 3.4, 0.8, M.BT_PALE);
  mat([pel, ...L('thigh')], FUR); mat(L('boot'), FUR); for (const q of L('boot')) { if (!q) continue; const c0 = q.a || q.c; S.paint(q, p => V.dot(V.sub(p, c0), up) > -0.6 ? M.BT_PALE : 0); }
  belt(M.IRON); btDisc(r, J, M.BONE, 2.1);
  skirt(FUR, { front: 4.6, fw: 3.2, side: 3.8, back: 4.6, smf: p => S.loc(p)[2] < -6.4 ? M.DARK : 0, fmf: p => S.loc(p)[2] < -6.6 ? M.DARK : 0 });
};
// a mammoth's skull: a bone cap over his head, the skull's long face sloping forward and down over his brow
// with burning eyes in dark sockets, and tusks sweeping out and up beside his head
GEAR_EXTRA.helm.bt_mskull = (r, { hd, fwd, up, sideR, helmF, eq }) => {
  barbFace(r, hd, fwd, up, sideR, helmF, eq, { under: 1 });
  const J = { fwd, up, sideR }, hc = V.mad(hd, up, 2.2), fc = btAt(hd, J, 3.4, 0, 4.4), fd = V.norm(V.add(fwd, V.mul(up, -0.55))), fF = frameAlong(fd, up);
  r.group(() => {
    r.ell(hc, [4.8, 4.9, 3.4], M.BONE, helmF, { mf: p => V.dot(V.sub(p, hc), up) < -2.3 ? M.LEATHER : 0 });
    r.ell(fc, [4.0, 2.9, 2.0], M.BONE, fF, { mf: p => { for (const s of [-1, 1]) if (V.len(V.sub(p, btAt(hd, J, 4.6, s * 2.1, 4.6))) < 1.25) return M.DARK; return 0; } });   // the long face, dark sockets (pass 3: no nasal hole: it read as a gaping mouth)
  });
  for (const s of [-1, 1]) {
    r.sph(btAt(hd, J, 5.3, s * 2.1, 4.5), 0.8, M.FIREM, { noShadow: true });   // burning eyes, out on the face's surface (pass 3: they were buried in it)
    const t0 = btAt(hd, J, 4.4, s * 2.4, 2.0);
    btHorn(r, [t0, btAt(hd, J, 5.2, s * 4.4, -0.2), btAt(hd, J, 4.6, s * 7.0, 0.4), btAt(hd, J, 3.4, s * 8.0, 3.6), btAt(hd, J, 2.0, s * 7.0, 6.6)], 1.6, 0.4, M.BONE);
  }
};
// the ember great axe: two dark crescent blades whose upper horns glow like coals, a wrapped haft, an iron foot
GEAR_EXTRA.weapon.bt_emberaxe = (r, { g, bd, wide, wf }) => {
  r.cone(V.mad(g, bd, -7.4), V.mad(g, bd, 17.5), 1.0, 1.0, M.WOOD);
  r.cone(V.mad(g, bd, -6.4), V.mad(g, bd, 0.4), 1.2, 1.2, M.LEATHER);
  r.sph(V.mad(g, bd, -7.9), 1.6, M.IRON);
  const h = V.mad(g, bd, 15.0);
  r.box(h, [2.6, 1.7, 1.3], M.DSTEEL, wf);
  for (const s of [-1, 1]) {
    r.group(() => {
      r.box(V.add(h, V.mul(wide, s * 3.6)), [2.6, 2.4, 0.55], M.DSTEEL, wf);
      r.box(V.add(h, V.mul(wide, s * 6.1)), [4.0, 1.0, 0.5], M.BLADE, wf);
      r.cone(V.add(h, V.mul(wide, s * 6.1)), V.add(V.mad(h, bd, -5.6), V.mul(wide, s * 5.0)), 1.05, 0.3, M.BLADE);
    });
    r.cone(V.add(V.mad(h, bd, 2.6), V.mul(wide, s * 5.6)), V.add(V.mad(h, bd, 6.6), V.mul(wide, s * 4.0)), 1.0, 0.3, M.FIREM, { noShadow: true });   // the glowing upper horn
  }
  r.cone(V.mad(h, bd, 1.3), V.mad(h, bd, 4.0), 1.1, 0.4, M.DSTEEL);
};
// the cleaver: a broad heavy blade with a notched back, a bone crossguard and pommel, a leather grip
GEAR_EXTRA.weapon.bt_cleaver = (r, { g, bd, wide, wf }) => {
  r.sph(V.mad(g, bd, -3.4), 1.5, M.BONE);
  r.group(() => { r.box(V.mad(g, bd, 1.6), [0.8, 2.6, 0.9], M.BONE, wf); for (const s of [-1, 1]) r.sph(V.add(V.mad(g, bd, 1.6), V.mul(wide, s * 2.8)), 1.2, M.BONE); });
  const c = V.add(V.mad(g, bd, 9.6), V.mul(wide, 0.5));
  r.box(c, [7.4, 1.9, 0.45], M.BLADE, wf, { mf: p => { const q = V.sub(p, c), t = V.dot(q, bd), w = V.dot(q, wide); return w < -1.3 && t > -2 && Math.abs((t + 20) % 2.2 - 1.1) < 0.45 ? M.STEEL : 0; } });   // notches along its back
  r.cone(V.add(V.mad(g, bd, 17.0), V.mul(wide, 0.9)), V.add(V.mad(g, bd, 18.6), V.mul(wide, 1.6)), 1.4, 0.3, M.BLADE);   // the clipped point
};

// ---------------------------------------------------------------- bag icons: his three helms and six weapons, drawn from the same parts
{ const ic0 = itemIcon; itemIcon = function (it) {
  const B = ITEM_BASES[it.base]; if (!B || !/^bt_/.test(B.look || '') || (B.slot !== 'helm' && B.slot !== 'weapon')) return ic0(it);
  const k = 'bt|' + B.look; if (iconCache[k]) return iconCache[k];
  const r = new Rig();
  if (B.slot === 'weapon') {
    const two = B.twoHand, bd = V.norm([0.5, -0.5, 0.75]), g = V.mad([0, 0, 3], bd, two ? -10 : -7), wide = V.norm(V.cross(CAM_V, bd)), wf = [bd, wide, V.cross(bd, wide)];   // (blades turned flat to the camera)
    if (B.look !== 'bt_tuskaxe' && B.look !== 'bt_flail') r.cone(V.mad(g, bd, -2.6), V.mad(g, bd, 1.2), 0.9, 0.9, M.LEATHER);
    GEAR_EXTRA.weapon[B.look](r, { g, bd, wide, wf, up: [0, 0, 1] });
    return (iconCache[k] = renderRig(r, 0, 26, 26, 13, 17));
  }
  // helms: the hero's own helm drawing on a bare head, seen 3/4 from the front
  const fwd = [1, 0, 0], up = [0, 0, 1], sideR = [0, 1, 0];
  GEAR_EXTRA.helm[B.look](r, { hd: [0, 0, 1.4], fwd, up, sideR, helmF: [fwd, sideR, up], eq: { hair: '' } });
  return (iconCache[k] = renderRig(r, Math.PI / 4, 26, 26, 13, 15));
}; }
