'use strict';
// round 110: the mage's mid-tier gear from the user's concept sheets (art/refs/gear/round110/). Owned by one builder; see NOTES.md row 110.
// Three looks past the Sunwarden (item level 6): STORMCALLER (6; navy and teal, a grey collar, a silver
// sash; a floppy wide-brimmed hat with a silver band; a silver fork holding a cyan orb), STARSEER (8;
// midnight blue with a gold hem and three gold stars, a white fur mantle; a very tall cone hat with one
// gold star; a gold armillary round a gold light) and ECLIPSE ARCHMAGE (10; black and violet, a gold
// mantle and a high collar, a gold medallion; a huge striped hat with a stiff upturned brim; a dark orb
// in a violet halo between gold crescent horns). The weapons sheet's other three staves drop at the
// same levels: FROSTSPIRE (6, an ice crystal cluster), EMBERCROWN (8, a fire orb in an iron brazier),
// ELDER ROOT (10, a twisted root round a green seed). Everything goes in through actors.js's tables and
// hooks (ROBE_STYLE, GEAR_EXTRA, STAFF_HEAD/STAFF_SHAFT) and wraps (itemIcon, FAMILIES.hero.rig).

// ---------------------------------------------------------------- shared shapes
// is (u, v) inside a five-pointed star of outer radius R, one point up (v up)?
function mtStarIn(u, v, R) {
  const rr = Math.hypot(u, v); if (rr > R) return false; if (rr < R * 0.38) return true;
  const sec = Math.PI * 2 / 5; let t = Math.atan2(u, v) % sec; if (t < 0) t += sec; t = Math.min(t, sec - t);   // angle from the nearest point
  const x = rr * Math.cos(t), y = rr * Math.sin(t), ri = R * 0.42, ex = ri * Math.cos(sec / 2) - R, ey = ri * Math.sin(sec / 2);   // the edge from the point (R, 0) to the valley
  return ex * y - ey * (x - R) >= 0 === (ex * 0 - ey * (0 - R) >= 0);   // on the centre's side of it
}
// a ring of capsules round c in the plane of unit vectors u, v
function mtRing(r, c, u, v, R, w, m, n = 14, a0 = 0, a1 = Math.PI * 2, o) {
  const p = a => V.add(c, V.add(V.mul(u, Math.cos(a) * R), V.mul(v, Math.sin(a) * R)));
  r.group(() => { for (let k = 0; k < n; k++) { const t0 = a0 + (a1 - a0) * k / n, t1 = a0 + (a1 - a0) * (k + 1) / n; r.cone(p(t0), p(t1), typeof w === 'function' ? w(k / n) : w, typeof w === 'function' ? w((k + 1) / n) : w, m, o); } });
}
const MT_GLOW = { staff_mt_storm: M.ICE, staff_mt_star: M.HOLY, staff_mt_eclipse: M.MAGIC, staff_mt_frost: M.ICE, staff_mt_ember: M.FIREM, staff_mt_root: M.EYE_GRN };

// ---------------------------------------------------------------- items
// Stats continue the mage curve (Sunwarden, level 6: robe 15, hat 7, staff 15-26) along the gear
// curve the tempered tiers use (damage ((L + 2) / (l + 2)) ^ 0.8, armor its square root) plus a few
// percent a level, so a new base beats an older one found at the same level (itemStats).
Object.assign(ITEM_BASES, {
  mt_storm_robe: { slot: 'chest', look: 'robe_mt_storm', name: 'STORMCALLER ROBE', armor: 16, cls: 'mage', lvl: 6 },
  mt_storm_hat: { slot: 'helm', look: 'mt_hat_storm', name: 'STORMCALLER HAT', armor: 8, cls: 'mage', lvl: 6 },
  mt_storm_staff: { slot: 'weapon', look: 'staff_mt_storm', name: 'STORMCALLER STAFF', dmg: [16, 27], cls: 'mage', lvl: 6 },
  mt_frost_staff: { slot: 'weapon', look: 'staff_mt_frost', name: 'FROSTSPIRE STAFF', dmg: [14, 29], cls: 'mage', lvl: 6 },
  mt_star_robe: { slot: 'chest', look: 'robe_mt_star', name: 'STARSEER ROBE', armor: 18, cls: 'mage', lvl: 8 },
  mt_star_hat: { slot: 'helm', look: 'mt_hat_star', name: 'STARSEER HAT', armor: 9, cls: 'mage', lvl: 8 },
  mt_star_staff: { slot: 'weapon', look: 'staff_mt_star', name: 'STARSEER STAFF', dmg: [19, 34], cls: 'mage', lvl: 8 },
  mt_ember_staff: { slot: 'weapon', look: 'staff_mt_ember', name: 'EMBERCROWN STAFF', dmg: [22, 31], cls: 'mage', lvl: 8 },
  mt_eclipse_robe: { slot: 'chest', look: 'robe_mt_eclipse', name: 'ECLIPSE ROBE', armor: 21, cls: 'mage', lvl: 10 },
  mt_eclipse_hat: { slot: 'helm', look: 'mt_hat_eclipse', name: 'ECLIPSE HAT', armor: 10, cls: 'mage', lvl: 10 },
  mt_eclipse_staff: { slot: 'weapon', look: 'staff_mt_eclipse', name: 'ECLIPSE STAFF', dmg: [24, 41], cls: 'mage', lvl: 10 },
  mt_root_staff: { slot: 'weapon', look: 'staff_mt_root', name: 'ELDER ROOT STAFF', dmg: [21, 44], cls: 'mage', lvl: 10 },
});
// each tier is an outfit (bonus for 2 and 3 pieces worn), like the art chat's sets
Object.assign(OUTFITS, {
  stormcaller: { name: 'STORMCALLER', pieces: ['mt_storm_robe', 'mt_storm_hat', 'mt_storm_staff'], bonus: [{ mana: 30 }, { chill: 15, dmgPct: 20 }], lines: ['2: +30 MANA', '3: 15% CHANCE TO CHILL, +20% DAMAGE'] },
  starseer: { name: 'STARSEER', pieces: ['mt_star_robe', 'mt_star_hat', 'mt_star_staff'], bonus: [{ crit: 8 }, { manaKill: 4, dmgPct: 25 }], lines: ['2: +8% CRIT', '3: +4 MANA PER KILL, +25% DAMAGE'] },
  eclipse: { name: 'ECLIPSE', pieces: ['mt_eclipse_robe', 'mt_eclipse_hat', 'mt_eclipse_staff'], bonus: [{ hp: 30, mana: 30 }, { dmgPct: 30, leech: 3 }], lines: ['2: +30 LIFE, +30 MANA', '3: +30% DAMAGE, +3% LIFE STOLEN'] },
});
// TEMPERED (6 levels on) and ANCIENT (12 on) copies, the same rule as items.js's TIERS loop (which ran before this file)
for (const id of Object.keys(ITEM_BASES).filter(k => /^mt_/.test(k) && !ITEM_BASES[k].root)) {
  const b = ITEM_BASES[id];
  TIERS.forEach(([word, up], n) => {
    const L = b.lvl + up, k = (L + 2) / (b.lvl + 2), v = Object.assign({}, b, { name: word + ' ' + b.name, lvl: L, root: id, tier: n + 1 });
    if (b.dmg) { const kd = Math.pow(k, 0.8); v.dmg = [Math.round(b.dmg[0] * kd), Math.round(b.dmg[1] * kd)]; }
    if (b.armor) v.armor = Math.round(b.armor * Math.sqrt(k));
    ITEM_BASES[id + '_t' + (n + 1)] = v;
  });
}

// ---------------------------------------------------------------- robes
// ROBE_STYLE draws the robe (cloth, front panel, hem, cuffs, collar, mantle); GEAR_EXTRA.chest adds
// the rest over the torso: it can also repaint the torso and skirt drawn just before it.
Object.assign(ROBE_STYLE, {
  robe_mt_storm: { m: M.CLOTH_NAVY, panel: M.WATERM, pw: 0.001, wk: 1.55, collar: M.FUR },
  robe_mt_star: { m: M.CLOTH_NAVY, hem: M.GOLD, hw: 0.75, cuff: M.GOLD },
  robe_mt_eclipse: { m: M.CLOTH_SHADOW, panel: M.CLOTH_PURPLE, pw: 1.2, wk: 1.6, stripes: M.GOLD },
});
// the robe's own parts: the torso (the last part drawn) and the skirt cones (robe cloth with a painter)
function mtRobeParts(r, RS) {
  const torso = r.p[r.p.length - 1], sk = [];
  for (let i = 0; i < r.p.length - 1; i++) { const q = r.p[i]; if (q.k === 2 && q.m === RS.m && q.mf) sk.push(i); }
  const bk = r.p[sk[1] + 1];
  return { torso, upper: r.p[sk[0]], lower: r.p[sk[1]], back: bk && bk.k === 2 && bk.m === RS.m && !bk.mf ? bk : null };
}
// recolor the robe's belt (and its gold knob) and widen it: a sash
function mtBelt(r, m, knob, wz = 1) {
  for (let i = r.p.length - 1; i >= 0; i--) { const q = r.p[i]; if (q.k === 1 && q.m === M.LEATHER) { q.m = m; q.rad = [q.rad[0], q.rad[1], q.rad[2] * wz]; const b = r.p[i + 1]; if (b && b.k === 0 && b.m === M.GOLD && knob !== undefined) b.m = knob; return; } }
}
const mtPaint = (q, f) => { if (!q) return; const f0 = q.mf; q.mf = (p, n) => f(p) || (f0 ? f0(p, n) : 0); };
// a star decal on a skirt cone, t along it, facing forward
function mtSkirtStar(q, t, R, fwd, sideR, m) {
  if (!q) return; const d = V.norm(V.sub(q.b, q.a)), c = V.lerp(q.a, q.b, t);
  mtPaint(q, p => { const o = V.sub(p, c); return V.dot(o, fwd) > 0 && mtStarIn(V.dot(o, sideR), -V.dot(o, d), R) ? m : 0; });
}
GEAR_EXTRA.chest.robe_mt_storm = (r, { J, fwd, up, sideR }) => {   // a silver sash from the right shoulder to the left hip, one round clasp on the chest
  const P = mtRobeParts(r, ROBE_STYLE.robe_mt_storm);
  mtPaint(P.torso, p => { const q = V.sub(p, J.chest), s = V.dot(q, sideR), z = V.dot(q, up); return Math.abs(s - z * 0.8 + 0.4) < 1.4 ? M.STEEL : 0; });
  const cl = V.add(V.mad(J.chest, up, 2.2), V.mul(fwd, 3.4));
  r.cyl(V.mad(cl, fwd, -0.3), V.mad(cl, fwd, 0.6), 2.1, M.STEEL);
  r.sph(V.mad(cl, fwd, 0.8), 0.9, M.ICE, { noShadow: true });
  r.ell(V.add(V.mad(J.chest, up, 4.6), V.mul(fwd, -0.6)), [3.6, 4.6, 2.4], M.FUR, frameAlong(fwd, up));   // the collar stands high round the neck
  mtBelt(r, M.STEEL, M.STEEL, 1.5);
};
GEAR_EXTRA.chest.robe_mt_star = (r, { J, fwd, up, sideR }) => {   // three gold stars down the front, a white fur mantle of round tufts
  const P = mtRobeParts(r, ROBE_STYLE.robe_mt_star); mtBelt(r, M.CLOTH_NAVY);
  mtPaint(P.torso, p => { const q = V.sub(p, V.mad(J.chest, up, -0.4)); return V.dot(q, fwd) > 1 && mtStarIn(V.dot(q, sideR), V.dot(q, up), 2.1) ? M.GOLD : 0; });
  mtSkirtStar(P.upper, 0.55, 2.3, fwd, sideR, M.GOLD); mtSkirtStar(P.lower, 0.3, 2.4, fwd, sideR, M.GOLD);
  const mc = V.mad(J.chest, up, 3.9);
  r.group(() => {
    r.ell(mc, [4.6, 6.0, 2.2], M.CLOTH_WHITE, frameAlong(fwd, up));
    for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; r.sph(V.add(V.mad(mc, up, -0.5), V.add(V.mul(fwd, Math.cos(a) * 4.2), V.mul(sideR, Math.sin(a) * 5.6))), 1.9, M.CLOTH_WHITE); }
  });
};
GEAR_EXTRA.chest.robe_mt_eclipse = (r, { J, fwd, up, sideR }) => {   // a violet panel down the back too, a tall flared collar behind the head, a gold medallion with a violet gem
  const RS = ROBE_STYLE.robe_mt_eclipse, P = mtRobeParts(r, RS);
  for (const [q, w] of [[P.upper, 1.6], [P.lower, 2.4], [P.back, 2.0]]) if (q) { const d = V.norm(V.sub(q.b, q.a));
    mtPaint(q, p => { const o = V.sub(p, q.a), n = V.sub(o, V.mul(d, V.dot(o, d))), s = Math.abs(V.dot(n, sideR)); return V.dot(n, fwd) < -0.5 ? (s < w ? M.CLOTH_PURPLE : Math.abs(s - w - 0.1) < 0.5 ? M.GOLD : 0) : 0; }); }
  const mc = V.mad(J.chest, up, 3.3);   // the broad gold mantle over the shoulders, edged violet, coming to a point at the front
  r.group(() => {
    r.ell(mc, [5.8, 8.8, 3.1], M.GOLD, frameAlong(fwd, up), { mf: p => V.dot(V.sub(p, mc), up) < -1.9 ? M.CLOTH_PURPLE : 0 });
    r.cone(V.add(V.mad(mc, up, -0.4), V.mul(fwd, 3.4)), V.add(V.mad(J.chest, up, -1.4), V.mul(fwd, 3.3)), 2.6, 0.7, M.GOLD);
  });
  mtBelt(r, M.GOLD, M.GOLD, 1.5);
  const md = V.add(V.mad(J.chest, up, 1.4), V.mul(fwd, 3.3));
  r.cyl(V.mad(md, fwd, -0.4), V.mad(md, fwd, 0.5), 1.7, M.GOLD);
  r.sph(V.mad(md, fwd, 0.7), 0.95, M.MAGIC, { noShadow: true });
};

// ---------------------------------------------------------------- hats (drawn whole, with the face)
// base: where the crown sits (over the brow, tipped back so the eyes show); sway: the tip lags the head
const MT_HAT = {
  mt_hat_storm: (r, hd, fwd, up, sideR, helmF, sw) => {   // navy, a wide floppy brim, a silver band with a buckle, the tip bent back
    const hm = M.CLOTH_NAVY, base = V.add(V.mad(hd, up, 3.3), V.mul(fwd, -0.8));
    r.group(() => {
      r.ell(V.mad(base, up, 0.25), [6.6, 6.8, 0.85], hm, frameAlong(V.norm(V.add(fwd, V.mul(up, 0.12))), up));
      const mid = V.add(V.mad(base, up, 4.4), V.mul(fwd, -0.6 - sw[0] * 0.2)), hi = V.add(V.mad(base, up, 7.6 + sw[1] * 0.5), V.mul(fwd, -1.6 - sw[0] * 0.5));
      const tip = V.add(V.add(V.mad(base, up, 8.2 + sw[1]), V.mul(fwd, -4.4 - sw[0])), V.mul(sideR, 1.8 + sw[2]));
      r.cone(V.mad(base, up, 0.5), mid, 3.8, 2.3, hm, { mf: p => V.dot(V.sub(p, base), up) < 1.7 ? M.STEEL : 0 });
      r.cone(mid, hi, 2.3, 1.3, hm); r.cone(hi, tip, 1.3, 0.45, hm);
    });
    r.box(V.add(V.mad(base, up, 1.05), V.mul(fwd, 3.55)), [0.45, 1.05, 0.85], M.STEEL, helmF, { mf: p => Math.abs(V.dot(V.sub(p, V.add(V.mad(base, up, 1.05), V.mul(fwd, 3.55))), sideR)) < 0.45 ? M.DARK : 0 });
  },
  mt_hat_star: (r, hd, fwd, up, sideR, helmF, sw) => {   // a very tall brimless midnight cone over the brow, a gold band, one big gold star, a crooked tip with a gold bobble
    const hm = M.CLOTH_NAVY, base = V.add(V.mad(hd, up, 1.6), V.mul(fwd, -0.5));
    const mid = V.add(V.mad(base, up, 6.6), V.mul(fwd, -0.9 - sw[0] * 0.2)), hi = V.add(V.mad(base, up, 10.6 + sw[1] * 0.5), V.mul(fwd, -1.6 - sw[0] * 0.5));
    const tip = V.add(V.add(V.mad(base, up, 12.4 + sw[1]), V.mul(fwd, -4.0 - sw[0])), V.mul(sideR, 1.0 + sw[2]));
    const sc = V.add(V.mad(base, up, 4.4), V.mul(fwd, 2.0));
    r.group(() => {
      r.cone(base, mid, 4.75, 2.7, hm, { mf: p => { const q = V.sub(p, base); if (V.dot(q, up) < 1.25) return M.GOLD; const o = V.sub(p, sc); return V.dot(q, fwd) > 0.8 && mtStarIn(V.dot(o, sideR), V.dot(o, up), 2.25) ? M.GOLD : 0; } });
      r.cone(mid, hi, 2.7, 1.3, hm); r.cone(hi, tip, 1.3, 0.5, hm);
    });
    r.sph(tip, 0.95, M.GOLD);
  },
  mt_hat_eclipse: (r, hd, fwd, up, sideR, helmF, sw) => {   // a huge black-and-violet cone, a broad gold band, a stiff wide brim edged in gold, upturned at the sides
    const base = V.add(V.mad(hd, up, 3.2), V.mul(fwd, -0.7)), bf = helmF;
    r.group(() => {
      r.ell(V.mad(base, up, 0.2), [6.2, 7.4, 0.8], M.CLOTH_SHADOW, bf, { mf: p => { const q = V.sub(p, base), u = V.dot(q, fwd) / 6.2, v = V.dot(q, sideR) / 7.4; return u * u + v * v > 0.7 ? M.GOLD : 0; } });
      for (const sd of [-1, 1]) { const a = V.add(V.mad(base, sideR, sd * 6.2), V.mul(up, 0.4)), b = V.add(V.add(V.mad(base, sideR, sd * 8.0), V.mul(up, 3.0)), V.mul(fwd, -0.6)); r.cone(a, b, 1.25, 0.35, M.GOLD); }
    });
    const mid = V.add(V.mad(base, up, 5.6), V.mul(fwd, -0.5 - sw[0] * 0.2)), tip = V.add(V.add(V.mad(base, up, 11.2 + sw[1]), V.mul(fwd, -1.8 - sw[0] * 0.8)), V.mul(sideR, sw[2] * 0.6));
    const stripe = p => { const q = V.sub(p, base), z = V.dot(q, up); if (z < 2.0) return M.GOLD; return Math.sin(Math.atan2(V.dot(q, sideR), V.dot(q, fwd)) * 2 + 0.6) > 0 ? M.CLOTH_PURPLE : 0; };
    r.group(() => { r.cone(V.mad(base, up, 0.4), mid, 4.0, 2.3, M.CLOTH_SHADOW, { mf: stripe }); r.cone(mid, tip, 2.3, 0.35, M.CLOTH_SHADOW, { mf: stripe }); });
  },
};
for (const k of Object.keys(MT_HAT)) GEAR_EXTRA.helm[k] = (r, { hd, fwd, up, sideR, helmF, eq, st }) => {
  r.ell(hd, [4.3, 4.3, 4.5], M.FACE, helmF, { mf: faceMf(hd, fwd, sideR, up, { under: 1, hair: HAIRM[eq.hair] || M.HAIR, brow: eq.hair === 'grey' ? M.IRON : 0 }) });
  faceParts(r, hd, fwd, sideR, up, true);
  MT_HAT[k](r, hd, fwd, up, sideR, helmF, headSway(st || {}));
};

// ---------------------------------------------------------------- staves (heads round 21 along the staff, where the cast glow swells)
Object.assign(STAFF_SHAFT, { staff_mt_storm: M.BARK, staff_mt_star: M.CLOTH_NAVY, staff_mt_eclipse: M.CLOTH_DARK, staff_mt_frost: M.CLOTH_NAVY, staff_mt_ember: M.BLOODY, staff_mt_root: M.BARK });
const mtBands = (r, g, bd, zs, m, w = 1.3) => { for (const z of zs) r.cyl(V.mad(g, bd, z), V.mad(g, bd, z + 0.9), w, m); };
Object.assign(STAFF_HEAD, {
  staff_mt_storm: (r, g, bd, wide) => {   // a two-pronged silver fork, the prongs curling in round a big cyan orb
    mtBands(r, g, bd, [-9.6], M.STEEL, 1.25);
    r.cyl(V.mad(g, bd, 15.8), V.mad(g, bd, 17.4), 1.55, M.STEEL);
    r.group(() => { for (const sd of [-1, 1]) { const P = [[17, 0], [18.6, 2.5], [21.2, 3.7], [23.8, 3.2], [25.0, 1.9]].map(([z, s]) => V.add(V.mad(g, bd, z), V.mul(wide, sd * s))), W = [1.2, 1.15, 1.05, 0.8, 0.35]; for (let k = 0; k < 4; k++) r.cone(P[k], P[k + 1], W[k], W[k + 1], M.STEEL); } });
    r.sph(V.mad(g, bd, 21), 2.6, M.ICE, { noShadow: true });
  },
  staff_mt_frost: (r, g, bd, wide) => {   // a stone cup on gold, a cluster of ice crystals: one tall, two splayed
    mtBands(r, g, bd, [-9.6, 4, 11], M.GOLD);
    r.cyl(V.mad(g, bd, 15.6), V.mad(g, bd, 16.6), 1.5, M.GOLD);
    r.cone(V.mad(g, bd, 16.4), V.mad(g, bd, 18.6), 1.3, 2.7, M.FUR);
    gemOn(r, V.mad(g, bd, 17.6), bd, 0, 8.4, 2.1, M.WATERM, M.ICE);
    for (const sd of [-1, 1]) gemOn(r, V.add(V.mad(g, bd, 18), V.mul(wide, sd * 1.4)), V.norm(V.add(bd, V.mul(wide, sd * 0.75))), 0, 5.4, 1.5, M.WATERM, M.ICE);
  },
  staff_mt_star: (r, g, bd, wide) => {   // a gold armillary (an upright ring and its equator) round a gold light, knobs at the poles
    const wf2 = V.norm(V.cross(bd, wide)), c = V.mad(g, bd, 21.2);
    mtBands(r, g, bd, [-9.6, 3, 10], M.GOLD);
    r.sph(V.mad(g, bd, 16.6), 1.55, M.GOLD);
    mtRing(r, c, bd, wide, 3.7, 0.7, M.GOLD, 16);
    mtRing(r, c, wide, wf2, 3.7, 0.6, M.GOLD, 16);
    for (const v of [bd, wide, V.mul(wide, -1)]) r.sph(V.mad(c, v, 3.9), 0.85, M.GOLD);
    gemOn(r, c, bd, -2.3, 2.3, 1.7, M.HOLY, M.HOLY);
    for (const sd of [-1, 1]) r.cone(c, V.mad(c, wide, sd * 2.2), 0.9, 0.2, M.HOLY, { noShadow: true });   // a four-pointed star
  },
  staff_mt_ember: (r, g, bd, wide) => {   // a red haft, an iron brazier bowl with three prongs, a fire orb sitting in it
    const wf2 = V.norm(V.cross(bd, wide));
    mtBands(r, g, bd, [-9.6, 4, 10.5, 14.4], M.GOLD);
    r.cyl(V.mad(g, bd, 15.4), V.mad(g, bd, 16.4), 1.5, M.GOLD);
    r.cone(V.mad(g, bd, 16.4), V.mad(g, bd, 18.8), 1.2, 3.2, M.IRON, { mf: p => V.dot(V.sub(p, g), bd) > 18.6 ? M.GOLD : 0 });
    for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2 + 0.5, o = V.add(V.mul(wide, Math.cos(a)), V.mul(wf2, Math.sin(a))); r.cone(V.add(V.mad(g, bd, 19), V.mul(o, 3.1)), V.add(V.mad(g, bd, 22.6), V.mul(o, 3.0)), 0.95, 0.4, M.IRON); }
    r.sph(V.mad(g, bd, 21.4), 2.8, M.FIREM, { noShadow: true });
  },
  staff_mt_eclipse: (r, g, bd, wide) => {   // a dark orb ringed by a violet halo between two gold crescent horns, a violet gem in the collar
    const c = V.mad(g, bd, 21.6), wf2 = V.norm(V.cross(bd, wide));
    mtBands(r, g, bd, [-9.6, 2, 9], M.GOLD);
    r.cone(V.mad(g, bd, 14.8), V.mad(g, bd, 16.6), 1.0, 1.9, M.GOLD);
    r.sph(V.add(V.mad(g, bd, 15.9), V.mul(wf2, 1.6)), 0.75, M.MAGIC, { noShadow: true });
    for (const sd of [-1, 1]) mtRing(r, c, V.mul(bd, -1), V.mul(wide, sd), 4.4, t => 0.45 + Math.sin(t * Math.PI) * 0.85, M.GOLD, 7, 0.55, 2.75);
    mtRing(r, c, bd, wide, 2.9, 0.5, M.MAGIC, 14, 0, Math.PI * 2, { noShadow: true });
    r.sph(c, 2.2, M.DSTEEL);
  },
  staff_mt_root: (r, g, bd, wide) => {   // a second root twisting up the haft, opening into a loop round a green seed, three leaves
    const wf2 = V.norm(V.cross(bd, wide)), at = z => V.add(V.mad(g, bd, z), V.add(V.mul(wide, Math.cos(z * 0.55) * 1.15), V.mul(wf2, Math.sin(z * 0.55) * 1.15)));
    r.group(() => { for (let z = -8; z < 16; z += 2) r.cone(at(z), at(z + 2), 0.75, 0.75, M.BARK); });
    const c = V.mad(g, bd, 21);
    mtRing(r, c, V.mul(bd, -1), wide, 3.1, t => 1.05 - Math.abs(t - 0.5) * 0.6, M.BARK, 12, 0.35, Math.PI * 2 - 0.35);
    r.cone(V.mad(g, bd, 17), V.add(V.mad(c, bd, -3.1), V.mul(wide, 1.0)), 1.0, 0.9, M.BARK);
    r.sph(c, 1.9, M.EYE_GRN, { noShadow: true });
    for (const [z, s, f] of [[24.6, -1.6, 0.4], [19.2, 3.6, 0.2], [9, -1.6, 0.9]]) r.ell(V.add(V.mad(g, bd, z), V.add(V.mul(wide, s * 1.25), V.mul(wf2, f))), [1.3, 0.55, 0.8], M.LEAFM, frameAlong(V.norm(V.add(wide, V.mul(bd, 0.5 * Math.sign(s)))), bd), { noShadow: true });
  },
});
// the cast and storm glow at the orb (heroRig draws it ARCANE for any staff it doesn't know) in the staff's own color
{ const hr0 = FAMILIES.hero.rig; FAMILIES.hero.rig = function (eq, st) {
  const r = hr0(eq, st), gm = MT_GLOW[eq.weapon];
  if (gm !== undefined && (st.clip === 'channel' || st.clip === 'storm')) for (const q of r.p) if (q.m === M.ARCANE) q.m = gm;
  return r;
}; }

// ---------------------------------------------------------------- bag icons (24x24, the same camera as items.js)
function mtIcon(look) {
  const r = new Rig();
  if (look.startsWith('staff_')) {   // the staff's top two thirds on the diagonal (the head at full size, as the old icons' big orbs)
    const bd = V.norm([0.5, -0.5, 0.75]), g = V.mad([0, 0, 3], bd, -17), wide = V.norm(V.cross(bd, [1, 0, 0])), at = q => V.dot(V.sub(q.c || q.a, g), bd);
    STAFF_HEAD[look](r, g, bd, wide);
    r.p = r.p.filter(q => at(q) > 6.5);
    r.cone(V.mad(g, bd, 6.5), V.mad(g, bd, 18), 0.95, 1.05, STAFF_SHAFT[look] || M.WOOD); r.sph(V.mad(g, bd, 6.2), 1.2, M.GOLD);
    bigHead(r, 0, [0, 0, 3], 0.86);
    return renderRig(r, 0, 26, 26, 13, 17);
  }
  const fwd = [1, 0, 0], up = [0, 0, 1], sideR = [0, 1, 0], helmF = frameAlong(fwd, up);
  if (MT_HAT[look]) {   // the hat on an unseen head, scaled to fit
    const hd = [0, 0, -4];
    MT_HAT[look](r, hd, fwd, up, sideR, helmF, [0, 0, 0]);
    bigHead(r, 0, [0, 0, 2], look === 'mt_hat_star' ? 0.9 : 1.0);
    return renderRig(r, Math.PI / 4, 26, 26, 13, 19);
  }
  const RS = ROBE_STYLE[look], m = RS.m;   // a robe: the skirt, the chest, the shoulders, then the look's own trim
  const skirt = r.cone([0, 0, 2], [0, 0, -7], 4.4, 6.6, m, { mf: p => (RS.hem && p[2] < -5.6) ? RS.hem : (RS.panel && p[0] > 2 && Math.abs(p[1]) < 1.2 + (2 - p[2]) * 0.12) ? RS.panel : (RS.stripes && p[0] > 2 && Math.abs(Math.abs(p[1]) - 1.5 - (2 - p[2]) * 0.12) < 0.45) ? RS.stripes : 0 });
  const chest = r.ell([0, 0, 3], [4.6, 6.6, 6.4], m);
  for (const s of [-1, 1]) r.ell([0, s * 7, 6.5], [3.6, 3.4, 3], RS.mantle || m, null, RS.trim ? { mf: p => p[2] < 5.4 ? RS.trim : 0 } : undefined);
  if (look === 'robe_mt_storm') { chest.mf = p => Math.abs(p[1] - (p[2] - 3) * 0.8 + 0.6) < 1.3 ? M.STEEL : 0; r.ell([0, 0, 8.6], [4.0, 5.6, 2.2], M.FUR); r.cyl([4.2, 1.6, 4.2], [5.2, 1.6, 4.2], 1.5, M.STEEL); }
  if (look === 'robe_mt_star') { chest.mf = p => p[0] > 2 && mtStarIn(p[1], p[2] - 3, 2.6) ? M.GOLD : 0; mtPaint(skirt, p => p[0] > 2 && mtStarIn(p[1], p[2] + 3, 2.4) ? M.GOLD : 0); r.ell([0, 0, 8.8], [4.6, 7.0, 2.2], M.CLOTH_WHITE); for (let k = 0; k < 10; k++) { const a = k / 10 * 6.283; r.sph([Math.cos(a) * 4.2, Math.sin(a) * 6.6, 8.2], 2.0, M.CLOTH_WHITE); } }
  if (look === 'robe_mt_eclipse') { r.ell([0, 0, 8.4], [5.2, 8.4, 2.8], M.GOLD, null, { mf: p => p[2] < 7.0 ? M.CLOTH_PURPLE : 0 }); r.cone([4.0, 0, 8.0], [4.6, 0, 3.2], 2.4, 0.7, M.GOLD); r.cyl([4.6, 0, 3.4], [5.6, 0, 3.4], 1.9, M.GOLD); r.sph([5.8, 0, 3.4], 1.0, M.MAGIC, { noShadow: true }); r.ell([0, 0, -1.2], [4.9, 6.4, 1.3], M.GOLD); }
  bigHead(r, 0, [0, 0, 0], 0.9);
  return renderRig(r, Math.PI / 4, 26, 26, 13, 17);
}
{ const ic0 = itemIcon; itemIcon = function (it) {
  const B = ITEM_BASES[it.base], L = B && B.look; if (!L || !(/^(robe|staff)_mt_/.test(L) || MT_HAT[L])) return ic0(it);
  return iconCache[L] || (iconCache[L] = mtIcon(L));
}; }
