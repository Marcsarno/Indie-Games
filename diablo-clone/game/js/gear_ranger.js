'use strict';
// round 110: the ranger's mid-tier gear from the user's concept sheets (art/refs/gear/round110/). Owned by one builder; see NOTES.md row 110.
// Three look tiers at item levels 6, 8 and 10 (Act I runs to about level 10), each a jerkin, a hood, a bow
// and a quiver: the FALCONER (13_Ranger_L6_Falconer, variation 1: tan hood with a falcon-feather crest,
// moss-green jerkin, a big leather guard on the bow shoulder, a crossed belt; weapons sheet: the
// feather-tipped recurve and the tall quiver with a buckled strap), the ANTLER WARDEN (14, variation 3:
// pine hood with antlers, brown leaf mantle over leather plates, green leaf tassets, a glowing leaf brooch,
// a bone crescent; weapons sheet: the antler-tipped longbow; the bark quiver bound in a vine) and the
// WILDHEART SENTINEL (15, variation 1: green hood under a gold leaf circlet, dark leather trimmed in gold,
// gold pauldrons, a long green cloak with a gold hem; weapons sheet: the horn-and-gold recurve, here with
// the concept's glowing green string; a gold-banded quiver of glowing arrowheads).
// Everything hooks in from here: ITEM_BASES / OUTFITS entries, JERKIN and BOWX rows, GEAR_EXTRA chest and
// helm looks, a pass over the finished hero rig for the bow's tips and the quiver (FAMILIES.hero.rig and
// deathTip wrapped, so a dying hero's extras tip over with him), and itemIcon wrapped for the bag icons.
{
  // ---------------------------------------------------------------- items
  // the curve goes on from the old top tier (L6 Blackthorn: jerkin 16, bow 13-23; L4 night hood 6, deep quiver 5), each piece
  // a clear step over the one below found at the same level (items.js itemStats raises a piece found above its level)
  const RT = {
    rt_thorn_hood: { slot: 'helm', look: 'rhood_thorn', name: 'THORN SENTINEL HOOD', armor: 6, cls: 'ranger', lvl: 4 },   // round 112: the journey set's missing hood
    rt_falconer_jerkin: { slot: 'chest', look: 'jerkin_falcon', name: 'FALCONER JERKIN', armor: 18, cls: 'ranger', lvl: 6 },
    rt_falconer_hood: { slot: 'helm', look: 'rhood_falcon', name: 'FALCONER HOOD', armor: 8, cls: 'ranger', lvl: 6 },
    rt_falconer_bow: { slot: 'weapon', look: 'bow_falcon', name: 'FALCONER RECURVE', dmg: [15, 26], cls: 'ranger', lvl: 6 },
    rt_falconer_quiver: { slot: 'shield', look: 'quiver_falcon', name: 'FALCONER QUIVER', armor: 7, cls: 'ranger', lvl: 6 },
    rt_antler_jerkin: { slot: 'chest', look: 'jerkin_antler', name: 'ANTLER WARDEN JERKIN', armor: 22, cls: 'ranger', lvl: 8 },
    rt_antler_hood: { slot: 'helm', look: 'rhood_antler', name: 'ANTLER WARDEN HOOD', armor: 10, cls: 'ranger', lvl: 8 },
    rt_antler_bow: { slot: 'weapon', look: 'bow_antler', name: 'ANTLER LONGBOW', dmg: [19, 33], cls: 'ranger', lvl: 8 },
    rt_antler_quiver: { slot: 'shield', look: 'quiver_antler', name: 'BARKWOOD QUIVER', armor: 9, cls: 'ranger', lvl: 8 },
    rt_wildheart_jerkin: { slot: 'chest', look: 'jerkin_wild', name: 'WILDHEART JERKIN', armor: 26, cls: 'ranger', lvl: 10 },
    rt_wildheart_hood: { slot: 'helm', look: 'rhood_wild', name: 'WILDHEART HOOD', armor: 12, cls: 'ranger', lvl: 10 },
    rt_wildheart_bow: { slot: 'weapon', look: 'bow_wild', name: 'WILDHEART RECURVE', dmg: [24, 40], cls: 'ranger', lvl: 10 },
    rt_wildheart_quiver: { slot: 'shield', look: 'quiver_wild', name: 'WILDHEART QUIVER', armor: 11, cls: 'ranger', lvl: 10 },
  };
  Object.assign(ITEM_BASES, RT);
  Object.assign(OUTFITS, {
    rt_falconer: { name: 'FALCONER', pieces: ['rt_falconer_jerkin', 'rt_falconer_hood', 'rt_falconer_bow', 'rt_falconer_quiver'], bonus: [{ atkSpeed: 10 }, { crit: 6 }, { dmgPct: 15 }], lines: ['2: +10% ATTACK SPEED', '3: +6% CRIT', '4: +15% DAMAGE'] },
    rt_antler: { name: 'ANTLER WARDEN', pieces: ['rt_antler_jerkin', 'rt_antler_hood', 'rt_antler_bow', 'rt_antler_quiver'], bonus: [{ armorFlat: 8 }, { regen: 2 }, { dmgPct: 20 }], lines: ['2: +8 ARMOR', '3: +2 LIFE/S', '4: +20% DAMAGE'] },
    rt_wildheart: { name: 'WILDHEART', pieces: ['rt_wildheart_jerkin', 'rt_wildheart_hood', 'rt_wildheart_bow', 'rt_wildheart_quiver'], bonus: [{ hp: 25 }, { crit: 8 }, { dmgPct: 25, atkSpeed: 10 }], lines: ['2: +25 LIFE', '3: +8% CRIT', '4: +25% DAMAGE, +10% ATTACK SPEED'] },
  });
  // TEMPERED and ANCIENT copies, as items.js makes them for the other outfits (it ran before this file)
  for (const id of Object.keys(RT)) {
    const b = RT[id];
    TIERS.forEach(([word, up], n) => {
      const L = b.lvl + up, k = (L + 2) / (b.lvl + 2), v = Object.assign({}, b, { name: word + ' ' + b.name, lvl: L, root: id, tier: n + 1 });
      if (b.dmg) { const kd = Math.pow(k, 0.8); v.dmg = [Math.round(b.dmg[0] * kd), Math.round(b.dmg[1] * kd)]; }
      if (b.armor) v.armor = Math.round(b.armor * Math.sqrt(k));
      ITEM_BASES[id + '_t' + (n + 1)] = v;
    });
  }

  // ---------------------------------------------------------------- small shapes
  // a flat blade (feather, leaf): its length along dir, flat across the plane whose normal is nrm
  const blade = (r, c, dir, nrm, len, wid, thick, m, o) => {
    const x = V.norm(dir), y = V.norm(V.cross(nrm, x)), z = V.cross(x, y);
    return r.ell(c, [len / 2, wid, thick], m, [x, y, z], o);
  };
  const at = (o, fwd, sideR, up, f, s, z) => V.add(V.add(V.mad(o, fwd, f), V.mul(sideR, s)), V.mul(up, z));
  const KB = 1 / HERO_BK;   // chest extras are built before the body is slimmed: sizes given here as drawn

  // ---------------------------------------------------------------- the jerkins
  Object.assign(JERKIN, {
    // moss-green tunic, the crossed belt from the right shoulder to the left hip, leather bracers
    jerkin_falcon: { m: M.CLOTH_GREEN, sleeve: M.CLOTH_GREEN, fore: M.LEATHER, skirt: 3.0,
      mf: (s, z) => Math.abs(s - z * 0.85 + 0.6) < 0.85 ? M.LEATHER : 0 },
    // brown leather plates in rows, green sleeves, a skirt of green leaves
    jerkin_antler: { m: M.HAIR, sleeve: M.PINE, fore: M.LEATHER, skirt: 3.4, skirtM: M.PINE,
      mf: (s, z, f) => f > 0.5 && Math.abs((z + 20.5) / 2.2 % 1 - 0.5) > 0.41 ? M.BARK : 0,
      skirtMf: (s, along) => along > 3.4 ? M.LEAFM : undefined },
    // dark leather trimmed in gold: a gold V down from the collar, gold cuffs, dark boots
    jerkin_wild: { m: M.BARK, sleeve: M.BARK, fore: M.LEATHER, skirt: 3.2, skirtM: M.BARK, cuff: M.GOLD, cuffAt: [-2.2, -1.2, 0.35, 0.45], legs: M.LEATHER, boots: M.BARK,
      mf: (s, z, f) => f > 1.0 && Math.abs(Math.abs(s) - (z - 0.2) * 0.55) < 0.42 && z > -1.6 && z < 4 ? M.GOLD : 0 },
  });
  // the long cloak (Wildheart): the hero's cape, longer and wider, its motion copied from heroRig
  const longCloak = (r, J, fwd, up, sideR, st, m, hem, LL) => {
    const c = st.clip, ph = st.f / 8 * Math.PI * 2;
    let th = 0.12, side = 0;
    if (c === 'walk') { th = 0.34 + 0.08 * Math.sin(ph * 2); side = J.swingArm * 0.12; }
    else if (c === 'go') th = 0.28; else if (c === 'stop') th = -0.1; else if (c === 'bash') th = 0.6;
    else if (atkIndex(c) >= 0) { th = 0.2 + Math.abs(J.twist) * 0.5; side = -J.twist * 0.4; }
    const dn = V.norm(V.add(V.add(V.mul(up, -Math.cos(th)), V.mul(fwd, -Math.sin(th))), V.mul(sideR, side)));
    const a1 = V.norm(V.sub(sideR, V.mul(dn, V.dot(sideR, dn)))), a0 = V.cross(a1, dn);
    const top = V.add(V.mad(J.chest, up, HERO_B.shZ + 0.4), V.mul(fwd, -2.4));
    r.box(V.mad(top, dn, LL / 2), [0.5 * KB, HERO_B.shW * 0.98 * KB, LL / 2 * KB], m, [a0, a1, dn], { mf: p => V.dot(V.sub(p, top), dn) > LL - 1.3 ? hem : 0 });
    for (const sd of [-1, 1]) {   // the cloak's sides, falling from the shoulders past the arms, gold at the front edge
      const t0 = V.add(V.add(V.mad(J.chest, up, HERO_B.shZ - 0.4), V.mul(fwd, -0.9)), V.mul(sideR, sd * (HERO_B.shW + 1.2))), d2 = V.norm(V.add(dn, V.mul(sideR, sd * 0.12))), L2 = LL - 1.2;
      r.box(V.mad(t0, d2, L2 / 2), [1.6 * KB, 0.45 * KB, L2 / 2 * KB], m, frameAlong(fwd, V.mul(d2, -1)).map((v, i) => i === 2 ? V.mul(d2, -1) : v), { mf: p => V.dot(V.sub(p, t0), d2) > L2 - 1.1 || V.dot(V.sub(p, t0), fwd) > 0.9 ? hem : 0 });
    }
  };
  GEAR_EXTRA.chest.jerkin_falcon = (r, { J, fwd, up, sideR, tf }) => {
    // the green scarf wound at the neck, its end down the back
    r.ell(V.add(V.mad(J.chest, up, 4.0), V.mul(fwd, 0.4)), [4.9, 6.1, 2.7], M.CLOTH_GREEN, tf);
    r.box(at(J.chest, fwd, sideR, up, -4.0, 1.6, 1.2), [0.7, 1.5, 2.8], M.CLOTH_GREEN, tf);
    // the big leather guard on the bow shoulder (left), two plates, the lower stepping out
    r.group(() => {
      r.ell(V.add(V.mad(J.shL, up, 1.4), V.mul(sideR, -0.6)), [4.6 * KB, 4.0 * KB, 3.2 * KB], M.LEATHER, tf, { mf: p => V.dot(V.sub(p, J.shL), up) < -0.6 ? M.BARK : 0 });
    });
    r.ell(V.add(V.mad(J.shL, up, -0.9), V.mul(sideR, -1.6)), [3.9 * KB, 3.2 * KB, 2.2 * KB], M.LEATHER, tf);
    r.box(at(J.chest, fwd, sideR, up, 4.0, -0.6, 0.0), [0.5, 1.3, 1.3], M.GOLD, tf);   // the strap's gold buckle
  };
  GEAR_EXTRA.chest.jerkin_antler = (r, { J, fwd, up, sideR, tf }) => {
    // the mantle of brown leaves over the shoulders: a ring of broad leaves tipping out and down
    const nc = V.mad(J.chest, up, HERO_B.shZ + 0.9);
    r.ell(V.mad(nc, up, -0.6), [4.6, 6.4, 2.2], M.BARK, tf);
    for (let k = 0; k < 12; k++) {
      const a = k / 12 * Math.PI * 2 + 0.26, out = V.add(V.mul(fwd, Math.cos(a) * 0.9), V.mul(sideR, Math.sin(a) * 1.3)), sideness = Math.abs(Math.sin(a));
      const base = V.add(V.mad(nc, out, 3.2), V.mul(up, -0.2)), dir = V.norm(V.add(out, V.mul(up, -0.55 - 0.35 * (1 - sideness))));
      blade(r, V.mad(base, dir, 2.2), dir, V.norm(V.add(V.mul(up, 0.8), V.mul(out, 0.3))), 6.4 * KB, 2.3 * KB, 0.8 * KB, k % 4 === 1 ? M.AUTUMNM : k % 2 ? M.HAIR : M.LEATHER);
    }
    // a glowing green leaf brooch at the collar, a bone crescent under the belt
    const bc = at(J.chest, fwd, sideR, up, 4.2, 0, 3.3);
    blade(r, bc, up, fwd, 2.6, 1.3, 0.6, M.EYE_GRN, { noShadow: true });   // (a leaf, standing up)
    const cc = at(J.pelvis, fwd, sideR, up, 4.5, 0, 1.6);
    for (const s of [-1, 1]) r.cone(V.mad(cc, sideR, s * 0.2), at(cc, fwd, sideR, up, -0.2, s * 2.0, 0.9), 0.95, 0.45, M.BONE, { noShadow: true });
    // leaf tassets hanging from the belt in front and at the sides
    const belt = V.mad(J.pelvis, up, 2.0);
    for (const [f, s, m] of [[3.6, -1.6, M.LEAFM], [3.6, 1.6, M.LEAFM], [1.2, -3.6, M.PINE], [1.2, 3.6, M.PINE]]) {
      const b0 = at(belt, fwd, sideR, up, f, s, 0), dir = V.norm(V.add(V.mul(up, -1), V.add(V.mul(fwd, f * 0.06), V.mul(sideR, s * 0.05))));
      blade(r, V.mad(b0, dir, 3.2), dir, V.norm(V.add(V.mul(fwd, f), V.mul(sideR, s))), 7 * KB, 1.6 * KB, 0.6 * KB, m);
    }
  };
  GEAR_EXTRA.chest.jerkin_wild = (r, { J, fwd, up, sideR, tf, st }) => {
    r.ell(V.add(V.mad(J.chest, up, 4.1), V.mul(fwd, 0.4)), [4.7, 5.9, 2.5], M.CLOTH_GREEN, tf);   // the green scarf
    for (const [sh, sd] of [[J.shL, -1], [J.shR, 1]]) {   // round gold pauldrons, a leather edge under them
      const c = V.add(V.mad(sh, up, 1.0), V.mul(sideR, sd * 0.3));
      r.ell(c, [3.7 * KB, 3.4 * KB, 2.5 * KB], M.GOLD, tf, { mf: p => V.dot(V.sub(p, c), up) < -1.1 ? M.LEATHER : 0 });
    }
    r.box(V.mad(V.mad(J.pelvis, up, 3.0), fwd, 4.3), [0.6, 1.4, 1.1], M.GOLD, tf);   // a gold belt plate
    longCloak(r, J, fwd, up, sideR, st, M.CLOTH_GREEN, M.GOLD, 12);
  };

  // ---------------------------------------------------------------- the hoods
  // the ranger's hood (as actors.js draws 'rhood'), in its own cloth, with a peak and a cowl of its own
  const hoodOn = (r, { hd, fwd, up, sideR, helmF, eq, st }, m, o = {}) => {
    const uh = HAIRM[eq.hair] || o.hair || M.STRAWM;
    r.ell(hd, [4.3, 4.3, 4.5], M.FACE, helmF, { mf: faceMf(hd, fwd, sideR, up, { under: 2, hair: uh, brow: eq.hair === 'grey' ? M.IRON : 0 }) });
    faceParts(r, hd, fwd, sideR, up, false);
    const hc = V.add(V.mad(hd, up, 0.8), V.mul(fwd, -1.0)), sw = headSway(st);
    r.group(() => {
      r.ell(hc, [4.55, 4.65, 4.8], m, helmF, o.mf ? { mf: o.mf(hc) } : undefined);
      if (o.peak) r.cone(at(hd, fwd, sideR, up, -1.4, 0, 4.0), at(hd, fwd, sideR, up, -3.2 - sw[0] * 0.6, sw[2] * 0.5, 7.6 + sw[1] * 0.4), 2.8, 0.4, m);   // the point stands up and back
      else r.cone(at(hd, fwd, sideR, up, -3.4, 0, 3.0), at(hd, fwd, sideR, up, -6.6 - sw[0] * 1.2, sw[2], 1.0 + sw[1] * 0.8), 2.2, 0.5, m);
      r.ell(V.add(V.mad(hd, up, -4.2), V.mul(fwd, -1.2)), [3.3, 4.5, 1.3], o.cowl || m, helmF);
    });
    return { hc, sw };
  };
  GEAR_EXTRA.helm.rhood_thorn = (r, ctx) => {   // round 112: the Thorn Sentinel's hood: green, a cream cowl like the jerkin's plate, leaf ears, bark thorns on the crown
    const { hd, fwd, up, sideR } = ctx; hoodOn(r, ctx, M.CLOTH_GREEN, { cowl: M.CLOTH_WHITE });
    for (const s of [-1, 1]) {   // a green leaf at each temple, swept back
      const b0 = at(hd, fwd, sideR, up, 0.6, s * 4.3, 2.6), dir = V.norm(V.add(V.add(V.mul(fwd, -1), V.mul(up, 0.3)), V.mul(sideR, s * 0.12)));   // (pass 2: slim, lying back along the hood, not standing out like ears)
      blade(r, V.mad(b0, dir, 2.4), dir, V.norm(V.add(sideR, V.mul(up, s * 0.4))), 5.8, 1.5, 0.7, M.PINE, { noShadow: true });
    }
    for (const [f, s] of [[1.2, 0], [-0.6, -1.6], [-0.6, 1.6]]) {   // three thorns up through the crown
      const b0 = at(hd, fwd, sideR, up, f, s, 4.4), tip = at(hd, fwd, sideR, up, f - 1.4, s * 1.2, 7.0);   // (pass 2: shorter, leaning back: thorns, not antlers)
      r.cone(b0, tip, 1.05, 0.2, M.BARK);
    }
  };
  GEAR_EXTRA.helm.rhood_falcon = (r, ctx) => {   // tan leather, a crest of falcon feathers swept back off the crown
    const { hd, fwd, up, sideR } = ctx, { sw } = hoodOn(r, ctx, M.STRAWM, { cowl: M.STRAWM, hair: M.HAIR });
    const back = V.norm(V.add(V.mul(fwd, -1), V.mul(up, 0.35)));
    for (const [f, s, z, len, wid, th, tilt, lean, m] of [[0.6, -0.5, 4.4, 9.0, 2.0, 1.2, 0.95, -0.42, M.AUTUMNM], [-0.6, 0.6, 4.3, 7.0, 1.6, 1.0, 0.7, 0.25, M.CLOTH_WHITE], [-1.8, -0.2, 3.7, 6.0, 1.5, 1.0, 0.35, -0.15, M.AUTUMNM]]) {
      const b0 = at(hd, fwd, sideR, up, f, s, z), dir = V.norm(V.add(V.add(V.mul(up, tilt), back), V.add(V.mul(sideR, lean), V.mul(fwd, -sw[0] * 0.15))));
      blade(r, V.mad(b0, dir, len / 2 - 0.6), dir, V.norm(V.add(sideR, V.mul(fwd, lean * 0.6))), len, wid, th, m, { noShadow: true });
    }
    blade(r, at(hd, fwd, sideR, up, -0.4, 0, 6.0), V.norm(V.add(V.mul(up, 1), V.mul(fwd, -0.5))), sideR, 3.8, 1.0, 0.8, M.CLOTH_WHITE, { noShadow: true });   // a pale down at the root
      };
  GEAR_EXTRA.helm.rhood_antler = (r, ctx) => {   // a deep pine hood, pointed, two pale antlers through it
    const { hd, fwd, up, sideR } = ctx; hoodOn(r, ctx, M.PINE, { peak: true });
    for (const s of [-1, 1]) {
      const p0 = at(hd, fwd, sideR, up, -0.6, s * 3.4, 3.2), p1 = at(hd, fwd, sideR, up, -0.6, s * 5.4, 5.8), p2 = at(hd, fwd, sideR, up, -1.0, s * 6.6, 9.4);
      r.group(() => {
        r.cone(p0, p1, 1.0, 0.85, M.BONE); r.cone(p1, p2, 0.85, 0.55, M.BONE);
        r.cone(p1, at(hd, fwd, sideR, up, -0.4, s * 4.4, 8.2), 0.75, 0.45, M.BONE);   // the inner tine
        r.cone(V.lerp(p1, p2, 0.45), at(hd, fwd, sideR, up, -0.8, s * 8.6, 7.6), 0.7, 0.45, M.BONE);   // the outer tine
      });
    }
  };
  GEAR_EXTRA.helm.rhood_wild = (r, ctx) => {   // a green hood, pointed, a circlet of gold leaves at the brow, a green scarf over the chin
    const { hd, fwd, up, sideR, helmF } = ctx; hoodOn(r, ctx, M.CLOTH_GREEN, { peak: true });
    const brow = at(hd, fwd, sideR, up, 2.6, 0, 3.2);
    r.cyl(V.mad(brow, up, -0.4), V.mad(brow, up, 0.5), 3.4, M.GOLD);
    for (const s of [-2, -1, 0, 1, 2]) {
      const b0 = at(hd, fwd, sideR, up, 3.0 - Math.abs(s) * 0.45, s * 1.3, 3.5), dir = V.norm(V.add(V.add(V.mul(up, 1), V.mul(sideR, s * 0.35)), V.mul(fwd, 0.25)));
      blade(r, V.mad(b0, dir, 1.2), dir, V.norm(V.add(fwd, V.mul(sideR, s * 0.3))), s === 0 ? 3.4 : 2.8, 0.9, 0.55, M.GOLD, { noShadow: true });
    }
    r.ell(V.add(V.mad(hd, up, -2.4), V.mul(fwd, 1.5)), [3.1, 4.2, 1.9], M.CLOTH_GREEN, helmF);
  };

  // ---------------------------------------------------------------- the bows (limbs from BOWX; tips and strings added on the finished rig)
  Object.assign(BOWX, {
    bow_falcon: { m: M.WOOD, L: 11, grip: M.LEATHER, curl: 1.8 },
    bow_antler: { m: M.LEATHER, L: 13.5, grip: M.LEATHER, bands: M.CLOTH_GREEN },
    bow_wild: { m: M.BONE, L: 12, grip: M.LEATHER, curl: 2.2, bands: M.GOLD, cap: M.GOLD },
  });
  const BOW_TIPS = {
    bow_falcon: (r, tip, bowUp, fore, sd) => {   // green wraps under a cream feather, its end dipped rust
      r.cyl(V.mad(tip, bowUp, -sd * 1.4), V.mad(tip, bowUp, -sd * 0.4), 1.3, M.CLOTH_GREEN);
      const d = V.norm(V.add(V.mul(bowUp, sd), V.mul(fore, 0.55))), side = V.cross(bowUp, fore);
      blade(r, V.mad(tip, d, 1.8), d, side, 4.2, 1.5, 0.6, M.CLOTH_WHITE, { noShadow: true });
      blade(r, V.mad(tip, d, 4.2), d, side, 2.6, 1.2, 0.6, M.AUTUMNM, { noShadow: true });
    },
    bow_antler: (r, tip, bowUp, fore) => {   // an antler crown at each tip: a beam on, a tine forward, a tine back
      const sd = 1;
      r.group(() => {
        const e = V.mad(tip, bowUp, sd * 3.2);
        r.cone(tip, e, 0.95, 0.6, M.BONE);
        r.cone(V.mad(tip, bowUp, sd * 1.2), V.add(V.mad(tip, bowUp, sd * 3.0), V.mul(fore, 2.4)), 0.75, 0.45, M.BONE);
        r.cone(V.mad(tip, bowUp, sd * 2.2), V.add(V.mad(tip, bowUp, sd * 3.8), V.mul(fore, -1.8)), 0.7, 0.4, M.BONE);
      });
    },
    bow_wild: (r, tip, bowUp) => r.sph(V.mad(tip, bowUp, 0.9), 1.05, M.EYE_GRN, { noShadow: true }),   // a green light at each tip
  };
  // ---------------------------------------------------------------- the quivers (in place of the plain one on the back)
  const QUIVERS = {
    quiver_falcon: (r, qb, qa, qd, sideR) => {   // tall dark leather, gold rims, a buckled strap and a green rag; big pale fletching
      r.cone(qb, qa, 2.0, 2.3, M.BARK, { mf: p => { const t = V.dot(V.sub(p, qa), qd); return t > -0.9 || t < -9.4 ? M.GOLD : Math.abs(t + 5.2 + V.dot(V.sub(p, qa), sideR) * 0.4) < 0.55 ? M.LEATHER : 0; } });
      r.box(V.add(V.mad(qa, qd, -5.0), V.mul(sideR, 1.8)), [0.6, 0.55, 0.6], M.GOLD, frameAlong(qd, sideR));
      for (const [o, m] of [[-1.2, M.CLOTH_WHITE], [0, M.CLOTH_WHITE], [1.2, M.CLOTH_WHITE]]) { const b0 = V.add(V.mad(qa, qd, 0.4), V.mul(sideR, o)); r.cone(b0, V.add(V.mad(b0, qd, 4.4), V.mul(sideR, o * 0.4)), 1.1, 0.4, m, { noShadow: true }); }
      r.cone(V.add(V.mad(qa, qd, -1.4), V.mul(sideR, -2.0)), V.add(V.mad(qa, qd, -5.2), V.mul(sideR, -2.6)), 0.9, 0.5, M.CLOTH_GREEN);
    },
    quiver_antler: (r, qb, qa, qd, sideR) => {   // a bark tube bound in a green vine with a leaf; bright green fletching
      r.cone(qb, qa, 2.3, 2.9, M.BARK, { mf: p => { const q = V.sub(p, qa), t = V.dot(q, qd); return t > -0.5 ? M.DARK : Math.abs(((t + 30) * 0.6 + Math.atan2(V.dot(q, sideR), 1) * 0.6) % 1.6 - 0.8) < 0.22 ? M.LEAFM : 0; } });
      for (const o of [-1.4, -0.45, 0.45, 1.4]) { const b0 = V.add(V.mad(qa, qd, 0.3), V.mul(sideR, o)); r.cone(b0, V.add(V.mad(b0, qd, 3.8), V.mul(sideR, o * 0.3)), 1.0, 0.4, M.LEAFM, { noShadow: true }); }
      blade(r, V.add(V.mad(qa, qd, -5.6), V.mul(sideR, 2.6)), V.norm(V.add(sideR, V.mul(qd, -0.4))), V.cross(qd, sideR), 3.4, 1.2, 0.5, M.LEAFM);
    },
    quiver_wild: (r, qb, qa, qd, sideR) => {   // dark leather bound in gold, a gold slant band; arrows with glowing green heads
      r.cone(qb, qa, 2.4, 2.9, M.BARK, { mf: p => { const q = V.sub(p, qa), t = V.dot(q, qd); return t > -0.9 || t < -9.6 || Math.abs(t + 5 - V.dot(q, sideR) * 0.8) < 0.5 ? M.GOLD : 0; } });
      for (const o of [-1.2, 0, 1.2]) {
        const b0 = V.add(V.mad(qa, qd, 0.2), V.mul(sideR, o)), h = V.add(V.mad(b0, qd, 2.6), V.mul(sideR, o * 0.3));
        r.cone(b0, h, 0.45, 0.45, M.WOOD, { noShadow: true });
        r.group(() => { r.cone(h, V.mad(h, qd, 1.2), 0.5, 1.15, M.EYE_GRN, { noShadow: true }); r.cone(V.mad(h, qd, 1.2), V.mad(h, qd, 3.0), 1.15, 0.2, M.EYE_GRN, { noShadow: true }); });
      }
    },
  };
  // the pass over a finished hero rig: the bow's string (two thin white cones meeting at the nock) and its
  // grip (the 1.15 capsule just before them) give the tips, the bow's up and its front; the plain quiver
  // (a leather cone 1.8 -> 2.2 and its three fletchings) gives the quiver's axis
  const rtPost = (r, eq) => {
    const P = r.p;
    if (BOW_TIPS[eq.weapon] || eq.weapon === 'bow_wild') {
      let si = -1; for (let i = P.length - 2; i >= 0; i--) { const a = P[i], b = P[i + 1]; if (a.k === 2 && b.k === 2 && a.m === M.CLOTH_WHITE && b.m === M.CLOTH_WHITE && a.ra === 0.3 && b.ra === 0.3 && a.b === b.a) { si = i; break; } }
      let gi = -1; for (let i = si - 1; i >= 0; i--) if (P[i].k === 2 && P[i].ra === 1.15 && P[i].rb === 1.15) { gi = i; break; }
      if (si >= 0 && gi >= 0) {
        const t1 = P[si].a, t2 = P[si + 1].b, c = V.lerp(P[gi].a, P[gi].b, 0.5), bowUp = V.norm(V.sub(t1, t2)), fore = V.norm(V.sub(c, V.lerp(t1, t2, 0.5)));
        if (eq.weapon === 'bow_wild') for (const q of [P[si], P[si + 1]]) { q.m = M.EYE_GRN; q.ra = q.rb = 0.5; }   // the glowing string
        const T = BOW_TIPS[eq.weapon];
        if (T) { T(r, t1, bowUp, fore, 1); T(r, t2, V.mul(bowUp, -1), fore, 1); }
      }
    }
    const Q = QUIVERS[eq.shield];
    if (Q && isBow(eq.weapon) && !XBOW[eq.weapon]) {
      const i = P.findIndex(q => q.k === 2 && q.m === M.LEATHER && q.ra === 1.8 && q.rb === 2.2 && q.mf);
      if (i >= 0) {
        const qb = P[i].a, qa = P[i].b, qd = V.norm(V.sub(qa, qb)), fl = P.slice(i + 1, i + 4).filter(q => q.k === 2 && q.ra === 0.9);
        const sR = fl.length === 3 ? V.norm(V.sub(fl[2].a, fl[0].a)) : V.norm(V.cross([0, 0, 1], qd));   // the plain fletchings sat across the hero's right
        P.splice(i, 1 + fl.length);
        Q(r, qb, qa, qd, sR);
      }
    }
  };
  let rtPend = null;
  { const dt0 = deathTip; deathTip = function (rig, ...a) { if (rtPend) { const e = rtPend; rtPend = null; rtPost(rig, e); } return dt0(rig, ...a); }; }
  const wrapRig = f0 => function (eq, st) {
    const mine = BOW_TIPS[eq.weapon] || QUIVERS[eq.shield];
    if (!mine) return f0(eq, st);
    rtPend = eq;
    try { const r = f0(eq, st); if (rtPend) rtPost(r, eq); return r; } finally { rtPend = null; }
  };
  FAMILIES.hero.rig = wrapRig(FAMILIES.hero.rig);
  heroRig = wrapRig(heroRig);   // (review.js calls it by name)

  // ---------------------------------------------------------------- bag icons
  { const ic0 = itemIcon; itemIcon = function (it) {
    const B = ITEM_BASES[it.base]; if (!B || !/^(jerkin_falcon|jerkin_antler|jerkin_wild|rhood_thorn|rhood_falcon|rhood_antler|rhood_wild|bow_falcon|bow_antler|bow_wild|quiver_falcon|quiver_antler|quiver_wild)$/.test(B.look || '')) return ic0(it);
    const k = B.look; if (iconCache[k]) return iconCache[k];
    const r = new Rig(), L = k, F = [1, 0, 0], S = [0, 1, 0];
    if (L.startsWith('bow')) {   // the bow standing on its end, strung (as items.js draws one), with its tips
      const X = BOWX[L], Lh = X.L * 0.72, lm = X.m, c = [0, 0, 4];
      const tip = s => [1.4, 0, 4 + s * Lh * 1.05], mid = s => [-2.6, 0, 4 + s * Lh * 0.6];
      r.group(() => { for (const s of [1, -1]) { r.cone(c, mid(s), 1.1, 0.9, lm); r.cone(mid(s), tip(s), 0.9, 0.5, lm); } });
      r.cyl([-0.2, 0, 3], [-0.2, 0, 5], 1.2, X.grip);
      if (X.bands) for (const s of [1, -1]) r.cyl(V.lerp(c, mid(s), 0.7), V.lerp(c, mid(s), 0.9), 1.2, X.bands);
      r.cone(tip(1), tip(-1), 0.3, 0.3, L === 'bow_wild' ? M.EYE_GRN : M.CLOTH_WHITE, { noShadow: true });
      for (const s of [1, -1]) { const u = [0, 0, s]; BOW_TIPS[L](r, tip(s), u, [-1, 0, 0], 1); }
      return (iconCache[k] = renderRig(r, -Math.PI / 4, 26, 26, 13, 15));   // (side on, the curve showing: items.js shows its bows edge on)
    }
    if (L.startsWith('rhood')) {   // the hood with an open face, and its crest, antlers or circlet
      const hm = L === 'rhood_falcon' ? M.STRAWM : L === 'rhood_antler' ? M.PINE : M.CLOTH_GREEN;
      r.ell([0, 0, 4], [5.4, 5.6, 5.8], hm, null, { mf: p => p[0] > 3 && Math.abs(p[1]) < 3 && p[2] < 5 ? M.DARK : 0 });
      if (L === 'rhood_falcon') for (const [f, z, len, m] of [[0.5, 8.5, 9, M.AUTUMNM], [-1, 8, 6.5, M.CLOTH_WHITE]]) blade(r, [f - 2.4, 0, z + 2.2], V.norm([-1, 0, 0.9]), S, len, 1.9, 0.8, m);
      else if (L === 'rhood_thorn') { for (const s of [-1, 1]) blade(r, [0, s * 6, 7], V.norm([-0.8, s * 0.4, 0.6]), F, 5, 2.0, 0.7, M.CLOTH_GREEN); for (const s of [-1.6, 0, 1.6]) r.cone([0.5, s, 9.5], [0, s * 1.4, 12.5], 0.95, 0.25, M.BARK); r.ell([0.5, 0, -0.6], [3.2, 4.6, 1.3], M.CLOTH_WHITE); }
      else r.cone([-1.5, 0, 8.5], [-3.5, 0, 12], 2.8, 0.4, hm);
      if (L === 'rhood_antler') for (const s of [-1, 1]) { r.cone([0, s * 4, 7], [0, s * 6.5, 11.5], 1.0, 0.6, M.BONE); r.cone([0, s * 5, 9], [0, s * 4.2, 12.5], 0.8, 0.5, M.BONE); r.cone([0, s * 5.8, 10.2], [0, s * 9, 10.6], 0.75, 0.5, M.BONE); }
      if (L === 'rhood_wild') { r.cyl([1.5, 0, 6.6], [1.5, 0, 7.6], 4.4, M.GOLD); for (const s of [-2, -1, 0, 1, 2]) blade(r, [4.2 - Math.abs(s) * 0.5, s * 1.6, 8.6], V.norm([0.2, s * 0.35, 1]), F, 3.2, 1.0, 0.6, M.GOLD); }
      return (iconCache[k] = renderRig(r, Math.PI / 4, 26, 26, 13, 17));
    }
    if (L.startsWith('jerkin')) {   // the body and sleeves, and the piece that marks each
      const K = JERKIN[L];
      r.ell([0, 0, 3], [4.6, 6.6, 6.4], K.m, null, { mf: p => { const v = K.mf(p[1] * 0.75, (p[2] - 3) * 0.8, p[0]); return v || 0; } });
      for (const s of [-1, 1]) r.ell([0, s * 7, 6.5], [3.6, 3.4, 3], L === 'jerkin_wild' ? M.GOLD : L === 'jerkin_falcon' && s < 0 ? M.LEATHER : K.sleeve);
      if (L === 'jerkin_falcon') r.ell([0.5, 0, 8.4], [4.4, 5.6, 2.2], M.CLOTH_GREEN);
      if (L === 'jerkin_antler') { for (let q = 0; q < 7; q++) { const a = (q / 6 - 0.5) * 2.6; blade(r, [Math.cos(a) * 3.6, Math.sin(a) * 6.4, 8], V.norm([Math.cos(a), Math.sin(a) * 1.4, -0.5]), [0, 0, 1], 5, 1.8, 0.7, q % 2 ? M.BARK : M.AUTUMNM); } r.sph([4.6, 0, 7.4], 1.2, M.EYE_GRN); }
      if (L === 'jerkin_wild') { r.box([-3, 0, -2], [0.5, 7, 7], M.CLOTH_GREEN, null, { mf: p => p[2] < -7.6 ? M.GOLD : 0 }); r.ell([0.5, 0, 8.6], [4.2, 5.4, 2.0], M.CLOTH_GREEN); }
      return (iconCache[k] = renderRig(r, Math.PI / 4, 26, 26, 13, 17));
    }
    // a quiver standing up, its arrows showing
    const qb = [0, 0, -4], qa = [0, 0, 7];
    QUIVERS[L](r, qb, qa, [0, 0, 1], [0, 1, 0]);
    return (iconCache[k] = renderRig(r, Math.PI / 4, 26, 26, 13, 17));
  }; }
}
