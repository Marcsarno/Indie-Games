'use strict';
// round 110: the paladin's mid-tier gear from the user's concept sheets (art/refs/gear/round110/). Owned by one builder; see NOTES.md row 110.
// His looks stopped at level 5-6 (Dawnbringer), so the rest of Act I only dropped stat copies. Three new
// looks, each a chest, a helm, a weapon and a shield (the higher two also a two-hander), drawn over the
// plate rig the way paladin.js draws his first five:
//   L6  SILVER VIGIL     (05_Paladin_L6_Silver_Vigil, variation 1): white plate, thick gold rims on the
//       pauldrons, a long navy tabard with a gold eight-pointed star, steel arms; a rounded great helm with
//       a gold cross visor and a white plume; a flanged mace; a heater: white, navy border, gold star.
//   L8  AURIC CHAMPION   (06_..., variation 1 + the weapons sheet's drum hammer): gold pauldrons layered
//       like folded wings, white plate with a gold gorget, a white tabard with a sun, blue at the sides; an
//       open helm under a fan of broad gold sun rays; a drum-headed hammer (one hand) or a great drum
//       hammer (two hands); a round shield of broad gold rays.
//   L10 HIGH SERAPH      (07_..., variation 2 + the weapons sheet's lantern hammer and sun-disc maul):
//       white plate, huge gold dome pauldrons, a gold orb at the collar, a long white tabard bordered in
//       gold, a short blue half-cape, two plate wing-fins on the back; a closed winged helm with a gold T
//       and a floating halo; a lantern hammer with a glowing core (one hand) or a sun-disc maul (two
//       hands); a tall white tower shield with a glowing sun.
// Everything here extends paladin.js's tables (PAL_SHIELD, PAL_TWO_HAND, GEAR_EXTRA, CHEST_RETOUCH...).

// ---------------------------------------------------------------- shared paint helpers
// an eight-pointed star in (u, v), radius R (points at the four axes and the diagonals)
const ptStar = (u, v, R) => { const d = Math.hypot(u, v), a = Math.atan2(v, u); return d < R * (0.4 + 0.6 * Math.pow(Math.abs(Math.cos(a * 2)), 4)) || d < R * (0.4 + 0.45 * Math.pow(Math.abs(Math.sin(a * 2)), 4)); };
// a tabard down the breast as palTabard, with a star or a sun disc (`sun`: rays round a disc) at height zc
function ptTabard(S, o) {
  return p => {
    const [f, s, z] = S.loc(p), as = Math.abs(s);
    if (f < 1.0 || as > o.w || z > (o.top || 4.4)) return 0;
    if (o.star && ptStar(s, z - (o.zc || 0.8), o.R || 2.2)) return o.star;
    if (o.sun) { const d = Math.hypot(s, z - (o.zc || 0.8)), a = Math.atan2(z - (o.zc || 0.8), s); if (d < (o.core || 1.0)) return o.coreM || o.sun; if (d < (o.R || 2.2) && Math.abs(Math.sin(a * 4)) > 0.75) return o.sun; }
    return as > o.w - 0.6 ? o.border : o.m;
  };
}

// ---------------------------------------------------------------- chest looks
for (const id of ['pal_vigil', 'pal_auric', 'pal_seraph']) WARRIOR_SETS[id] = { base: 'plate' };
CHEST_CAPE.pal_seraph = { m: M.CLOTH_BLUE, hem: M.GOLD, len: 8.6 };   // a short blue half-cape

CHEST_RETOUCH.pal_vigil = (r, J, S) => {   // SILVER VIGIL: white plate, gold-rimmed pauldrons, a long navy tabard with a gold star, steel arms and legs
  const { chest, abd, pel, pads, rivets, A, L, mat, belt, skirt, goldRim, loc } = S;
  mat([chest, abd, pel, ...pads, ...L('knee'), ...A('cop')], M.WPLATE);
  mat([...A('sleeve'), ...A('fore'), ...L('thigh'), ...L('shin'), ...L('boot')], M.STEEL);
  chest.mf = ptTabard(S, { w: 2.7, m: M.CLOTH_NAVY, border: M.GOLD, star: M.GOLD, zc: 0.6, R: 2.3 });
  palPaint(S, abd, ptTabard(S, { w: 2.7, m: M.CLOTH_NAVY, border: M.GOLD }));
  for (const q of pads) { q.mf = null; goldRim(q, -0.6); } mat(rivets, M.GOLD); for (const q of L('knee')) goldRim(q, -0.5);
  belt(M.IRON); skirt(M.CLOTH_NAVY, { front: 5.8, fw: 2.7, fmf: p => Math.abs(loc(p)[1]) > 2.1 ? M.GOLD : 0, side: 3.0, smf: p => M.WPLATE });
  skirt(M.CLOTH_NAVY, { back: 4.8, bw: 2.8, smf: p => Math.abs(loc(p)[1]) > 2.2 ? M.GOLD : 0 });   // (pass 1: the back panel took the sides' white plate)
};
CHEST_RETOUCH.pal_auric = (r, J, S) => {   // AURIC CHAMPION: gold pauldrons layered like folded wings, white plate under a gold gorget, a white tabard with a sun, blue at the sides
  const { chest, abd, pel, pads, rivets, A, L, mat, belt, skirt, goldRim, paint, loc } = S;
  mat([chest, abd, pel, ...A('fore'), ...L('thigh'), ...L('shin'), ...L('boot')], M.WPLATE);
  mat([...A('sleeve'), ...A('cop'), ...L('knee')], M.GOLD);
  const tab = ptTabard(S, { w: 2.8, m: M.CLOTH_WHITE, border: M.GOLD, sun: M.GOLD, coreM: M.HOLY, zc: 0.2, R: 2.3, core: 0.95 });
  chest.mf = p => { const [f, s, z] = loc(p); return z > 3.4 ? M.GOLD : tab(p); };   // a deep gold gorget
  palPaint(S, abd, ptTabard(S, { w: 2.8, m: M.CLOTH_WHITE, border: M.GOLD }));
  for (const q of A('fore')) { const b = q.b; paint(q, p => V.len(V.sub(p, b)) < 1.4 ? M.GOLD : 0); }   // gold cuffs
  for (const q of L('boot')) { const c = q.c; paint(q, p => V.dot(V.sub(p, c), J.up) > 0.4 ? M.GOLD : 0); }
  // the pauldrons: three gold plates each, stacked down and out from the shoulder like a folded wing, each lower one longer
  for (const q of pads) { q.dead = true; }
  for (const q of rivets) if (q) q.dead = true;
  for (const q of pads) {
    const c = q.c, sd = Math.sign(V.dot(V.sub(c, J.chest), J.sideR)) || 1;
    r.group(() => {
      for (let k = 0; k < 3; k++) {
        const cc = V.add(V.add(V.mad(c, J.up, 1.2 - k * 1.7), V.mul(J.sideR, sd * (0.3 + k * 1.0))), V.mul(J.fwd, -0.3 * k));
        const upT = V.norm(V.add(J.up, V.mul(J.sideR, sd * (0.55 + k * 0.25))));
        r.ell(cc, [4.6 + k * 0.3, 3.4 + k * 0.5, 1.7], M.GOLD, frameAlong(J.fwd, upT), k === 0 ? { mf: p => V.dot(V.sub(p, cc), upT) > 0.9 ? M.WPLATE : 0 } : undefined);   // the top plate's crown white, as the concept's highlight
      }
    });
  }
  belt(M.GOLD); skirt(M.CLOTH_BLUE, { front: 5.4, fw: 2.8, fm: M.CLOTH_WHITE, fmf: p => Math.abs(loc(p)[1]) > 2.2 ? M.GOLD : 0, side: 3.6, back: 4.6, bw: 3.2 });
};
CHEST_RETOUCH.pal_seraph = (r, J, S) => {   // HIGH SERAPH: white plate, huge gold dome pauldrons, a gold orb at the collar, a long white tabard bordered in gold, plate wing-fins on the back
  const { chest, abd, pel, pads, rivets, A, L, mat, belt, skirt, goldRim, paint, loc } = S;
  mat([chest, abd, pel, ...A('sleeve'), ...A('fore'), ...L('thigh'), ...L('shin'), ...L('boot')], M.WPLATE);
  mat([...A('cop'), ...L('knee')], M.GOLD);
  for (const q of pads) { q.m = M.GOLD; q.mf = null; q.rad = V.mul(q.rad, 1.18); q.c = V.mad(q.c, J.up, 0.5); }
  for (const q of rivets) if (q) q.dead = true;
  const tab = ptTabard(S, { w: 2.6, m: M.CLOTH_WHITE, border: M.GOLD, sun: M.GOLD, zc: -0.6, R: 2.0, core: 0.9 });
  chest.mf = p => { const [f, s, z] = loc(p); return z > 3.6 ? M.GOLD : tab(p); };
  palPaint(S, abd, ptTabard(S, { w: 2.6, m: M.CLOTH_WHITE, border: M.GOLD }));
  r.sph(V.add(V.mad(J.chest, J.up, 4.2), V.mul(J.fwd, 3.6)), 1.5, M.GOLD);   // the orb at the collar
  for (const q of A('fore')) { const b = q.b; paint(q, p => V.len(V.sub(p, b)) < 1.4 ? M.GOLD : 0); }
  for (const q of L('boot')) { const c = q.c; paint(q, p => V.dot(V.sub(p, c), J.up) > 0.5 ? M.GOLD : 0); }
  // two wing-fins on the back: white plate blades swept up, out and back from the shoulder blades, gold at the root
  for (const sd of [-1, 1]) {
    const a = V.add(V.add(V.mad(J.chest, J.up, 3.4), V.mul(J.fwd, -4.2)), V.mul(J.sideR, sd * 2.0));   // (pass 1: low and short, hidden behind the head)
    const b = V.add(V.add(V.mad(a, J.up, 6.6), V.mul(J.sideR, sd * 6.0)), V.mul(J.fwd, -3.6));
    r.group(() => { r.cone(a, b, 1.7, 0.4, M.WPLATE, { mf: p => V.len(V.sub(p, a)) < 2.0 ? M.GOLD : 0 });
      r.cone(V.mad(a, J.up, -1.4), V.add(V.add(V.mad(a, J.up, 3.0), V.mul(J.sideR, sd * 6.0)), V.mul(J.fwd, -2.8)), 1.3, 0.35, M.WPLATE); });
  }
  belt(M.GOLD); skirt(M.CLOTH_WHITE, { front: 6.0, fw: 2.6, fmf: p => Math.abs(loc(p)[1]) > 2.0 ? M.GOLD : 0, side: 3.8, smf: p => M.GOLD });
};

// ---------------------------------------------------------------- helms
GEAR_EXTRA.helm.pal_plume = (r, { hd, fwd, up, sideR, helmF }) => {   // SILVER VIGIL: a rounded great helm, a gold cross over a dark visor, a white plume curving back
  r.ell(V.mad(hd, up, 0.1), [4.8, 4.6, 5.1], M.WPLATE, helmF, { mf: p => {
    const q = V.sub(p, hd), f2 = V.dot(q, fwd), s2 = V.dot(q, sideR), z2 = V.dot(q, up);
    if (f2 > 1.6 && Math.abs(s2) < 0.6 && z2 > -3.6 && z2 < 4.4) return M.GOLD;   // the cross's upright, crown to chin
    if (f2 > 1.6 && Math.abs(z2 - 0.4) < 0.7 && Math.abs(s2) < 3.2) return M.DARK;   // the eye slit
    if (f2 > 1.2 && Math.abs(z2 - 1.6) < 0.5 && Math.abs(s2) < 3.4) return M.GOLD;   // the cross's arm over it
    if (z2 < -3.2) return M.GOLD;   // a gold rim at the neck
    return 0; } });
  const top = V.mad(hd, up, 4.9);
  r.sph(top, 1.0, M.GOLD);   // the plume's socket
  r.group(() => {
    const pts = [top, V.add(V.mad(top, up, 2.0), V.mul(fwd, 0.2)), V.add(V.mad(top, up, 3.4), V.mul(fwd, -1.4)), V.add(V.mad(top, up, 3.4), V.mul(fwd, -3.6)), V.add(V.mad(top, up, 2.2), V.mul(fwd, -5.4))], rad = [0.9, 1.5, 1.6, 1.2, 0.4];
    for (let k = 0; k < 4; k++) r.cone(pts[k], pts[k + 1], rad[k], rad[k + 1], M.CLOTH_WHITE);
  });
};
GEAR_EXTRA.helm.pal_sunfan = (r, { hd, fwd, up, sideR, helmF }) => {   // AURIC CHAMPION: an open white helm, a gold brow and nasal, a fan of broad gold sun rays standing behind it
  palFace(r, hd, fwd, sideR, up, helmF);
  const hc = V.mad(hd, up, 2.0);
  r.ell(hc, [4.75, 4.6, 3.7], M.WPLATE, helmF, { mf: p => { const q = V.sub(p, hc); return V.dot(q, up) < -1.5 ? M.GOLD : Math.abs(V.dot(q, sideR)) < 0.55 && V.dot(q, fwd) > 0 ? M.GOLD : 0; } });
  // the sunburst: seven broad squared rays (thin spikes read as hair) on a gold disc behind the crown. Pass 2: the rays curve back
  // at the sides like a shallow dish, so the burst fans out from the side as well (a flat fan seen edge-on read as one horn)
  const c = V.add(V.mad(hd, up, 2.6), V.mul(fwd, -2.4));
  r.group(() => {
    r.ell(c, [1.0, 3.2, 3.2], M.GOLD, frameAlong(V.norm(V.add(fwd, V.mul(up, 0.3))), up));
    for (let k = -3; k <= 3; k++) {
      // pass 3: wider apart and longer at the sides, so from the front they clear the head as separate rays (they massed into a gold tuft)
      const a = k * 0.56, dir = V.norm(V.add(V.add(V.mul(up, Math.cos(a)), V.mul(sideR, Math.sin(a))), V.mul(fwd, -0.25 - Math.abs(Math.sin(a)) * 0.5))), len = k === 0 ? 5.4 : Math.abs(k) === 1 ? 5.2 : Math.abs(k) === 2 ? 5.0 : 4.6;
      const n0 = V.norm(V.cross(dir, sideR)), wd = V.norm(V.cross(n0, dir));
      r.box(V.mad(c, dir, 3.2 + len / 2), [0.6, 1.05, len / 2], M.GOLD, [n0, wd, dir]);
    }
  });
};
GEAR_EXTRA.helm.pal_seraphim = (r, { hd, fwd, up, sideR, helmF, eq }) => {   // HIGH SERAPH: a tall closed white helm, a gold T over the visor, big white wings, a floating halo
  r.ell(V.mad(hd, up, 0.4), [4.7, 4.55, 5.4], M.WPLATE, helmF, { mf: p => {
    const q = V.sub(p, hd), f2 = V.dot(q, fwd), s2 = V.dot(q, sideR), z2 = V.dot(q, up);
    if (f2 > 1.4 && Math.abs(z2 - 0.6) < 0.65 && Math.abs(s2) < 3.0 && Math.abs(s2) > 0.7) return M.DARK;   // the eyes either side of the T
    if (f2 > 1.4 && Math.abs(s2) < 0.7 && z2 < 5.6 && z2 > -3.4) return M.GOLD;   // the T's upright, crown to chin
    if (f2 > 1.0 && Math.abs(z2 - 1.75) < 0.5 && Math.abs(s2) < 3.4) return M.GOLD;   // and its bar
    if (z2 < -3.4) return M.GOLD;
    return 0; } });
  for (const sd of [-1, 1]) {   // the wings: a gold root at the temple, four white feathers fanned up and back, the lead one longest
    const root = V.add(V.add(V.mad(hd, up, 1.6), V.mul(sideR, sd * 4.4)), V.mul(fwd, 0.4));
    r.sph(root, 1.1, M.GOLD);
    // pass 2: three feathers laid side by side along one direction, so they make one wing blade (fanned apart they read as spines)
    const wd = V.norm(V.add(V.add(up, V.mul(fwd, -0.55)), V.mul(sideR, sd * 0.4)));
    r.group(() => { for (let k = 0; k < 3; k++) { const a = V.add(V.mad(root, up, -k * 0.9), V.mul(fwd, -k * 1.0)); r.cone(a, V.mad(a, wd, 6.8 - k * 1.5), 1.3 - k * 0.1, 0.45, k ? M.CLOTH_WHITE : M.WPLATE); } });
  }
  const c = V.mad(hd, up, 9.0);
  for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; r.sph(V.add(c, V.add(V.mul(fwd, Math.cos(a) * 4.0), V.mul(sideR, Math.sin(a) * 4.0))), 0.85, M.GOLD, { noShadow: true }); }
};

// ---------------------------------------------------------------- weapons
GEAR_EXTRA.weapon.pal_flange = (r, { g, bd, wide, wf }) => {   // VIGIL MACE: a blue grip, a steel haft, a gold collar, a steel ball with six gold-edged flanges and a gold cap
  r.cone(V.mad(g, bd, -2.6), V.mad(g, bd, 1.2), 1.0, 1.0, M.CLOTH_BLUE);
  r.cone(V.mad(g, bd, 1.2), V.mad(g, bd, 10.6), 0.85, 0.85, M.STEEL);
  r.cyl(V.mad(g, bd, 9.8), V.mad(g, bd, 10.8), 1.35, M.GOLD);
  const hb = V.mad(g, bd, 13.6);
  r.group(() => {
    r.sph(hb, 2.3, M.STEEL);
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + 0.3, d = V.norm(V.add(V.mul(wide, Math.cos(a)), V.mul(wf[2], Math.sin(a))));
      r.box(V.mad(hb, d, 2.3), [2.5, 1.5, 0.5], M.STEEL, [bd, d, V.cross(bd, d)], { mf: p => V.dot(V.sub(p, hb), d) > 3.1 ? M.GOLD : 0 }); }
  });
  r.sph(V.mad(hb, bd, 2.9), 1.1, M.GOLD);
};
// a drum hammer head at `at`: a white barrel across the haft, gold rims, gold sun faces with a glowing heart
function ptDrum(r, g, bd, wide, at, hw, R, glow) {
  const hb = V.mad(g, bd, at);
  r.cyl(V.mad(hb, wide, -hw), V.mad(hb, wide, hw), R, M.WPLATE, { mf: p => {
    const q = V.sub(p, hb), w = Math.abs(V.dot(q, wide)), rho = V.len(V.sub(q, V.mul(wide, V.dot(q, wide))));
    if (w > hw - 0.15) return rho < R * 0.36 ? (glow ? M.HOLY : M.GOLD) : rho < R * 0.62 ? M.WPLATE : M.GOLD;   // the faces: a gold ring, white, a gold (or glowing) sun
    if (w > hw - 1.3) return M.GOLD;   // the rims
    return 0; } });
  r.sph(V.mad(hb, bd, R + 0.3), 0.9, M.GOLD);   // a gold knob on top
  return hb;
}
GEAR_EXTRA.weapon.pal_drum = (r, { g, bd, wide, wf }) => {   // AURIC HAMMER: a blue haft, a gold collar, a white drum head with gold rims and sun faces
  r.cone(V.mad(g, bd, 1.2), V.mad(g, bd, 12.4), 0.95, 0.95, M.CLOTH_BLUE);
  r.cyl(V.mad(g, bd, 11.2), V.mad(g, bd, 12.4), 1.3, M.GOLD);
  ptDrum(r, g, bd, wide, 14.8, 4.2, 2.7, false);
};
GEAR_EXTRA.weapon.pal_greatdrum = (r, { g, bd, wide, wf }) => {   // AURIC GREAT HAMMER (two hands): a long blue haft banded in gold, a huge drum head, its sun faces glowing
  r.cone(V.mad(g, bd, -7), V.mad(g, bd, 16), 1.05, 1.05, M.CLOTH_BLUE, { mf: p => Math.abs(((V.dot(V.sub(p, g), bd) + 30) % 6) - 3) < 0.55 ? M.GOLD : 0 });
  r.sph(V.mad(g, bd, -7.6), 1.4, M.GOLD);
  r.cyl(V.mad(g, bd, 14.8), V.mad(g, bd, 16.2), 1.45, M.GOLD);
  ptDrum(r, g, bd, wide, 19.2, 5.0, 3.3, true);
};
GEAR_EXTRA.weapon.pal_lantern = (r, { g, bd, wide, wf }) => {   // SERAPH LANTERN: a white haft, a gold lantern block glowing through its windows, white hammer blocks either side, a gold finial
  r.cone(V.mad(g, bd, -2.6), V.mad(g, bd, 1.2), 1.0, 1.0, M.CLOTH_BLUE);
  r.cone(V.mad(g, bd, 1.2), V.mad(g, bd, 11.8), 0.9, 0.9, M.WPLATE);
  r.cyl(V.mad(g, bd, 10.8), V.mad(g, bd, 11.8), 1.4, M.GOLD);
  const hb = V.mad(g, bd, 14.6), w2 = wf[2];
  r.box(hb, [2.5, 2.2, 2.2], M.GOLD, [bd, wide, w2], { mf: p => { const q = V.sub(p, hb), l = V.dot(q, bd), w = V.dot(q, wide), t = V.dot(q, w2);
    return Math.abs(l) < 1.6 && ((Math.abs(t) > 1.9 && Math.abs(w) < 1.3) || (Math.abs(w) > 1.9 && Math.abs(t) < 1.3)) ? M.HOLY : 0; } });   // the windows
  for (const sd of [-1, 1]) r.box(V.mad(hb, wide, sd * 4.0), [1.9, 1.8, 1.9], M.WPLATE, [bd, wide, w2]);
  r.cone(V.mad(hb, bd, 2.5), V.mad(hb, bd, 4.0), 1.9, 0.4, M.GOLD);
  r.sph(V.mad(hb, bd, 4.5), 0.8, M.GOLD);
};
GEAR_EXTRA.weapon.pal_discmaul = (r, { g, bd, wide, wf }) => {   // SERAPH SUNMAUL (two hands): a long white haft banded gold and blue, a great sun disc for a head, white hammer blocks either side
  r.cone(V.mad(g, bd, -7), V.mad(g, bd, 15.6), 1.05, 1.05, M.WPLATE, { mf: p => { const t = V.dot(V.sub(p, g), bd); return Math.abs(t - 3.5) < 0.6 || Math.abs(t - 10) < 0.6 || Math.abs(t - 15) < 0.7 ? M.GOLD : t < 3 && t > -1 ? M.CLOTH_BLUE : 0; } });
  r.sph(V.mad(g, bd, -7.6), 1.4, M.GOLD);
  const hb = V.mad(g, bd, 19.6), w2 = wf[2], R = 4.4;
  for (const sd of [-1, 1]) r.box(V.mad(hb, wide, sd * (R + 1.4)), [1.7, 1.5, 1.7], M.WPLATE, [bd, wide, w2], { mf: p => Math.abs(V.dot(V.sub(p, hb), wide)) > R + 2.5 ? M.GOLD : 0 });
  r.cyl(V.mad(hb, w2, -0.9), V.mad(hb, w2, 0.9), R, M.WPLATE, { mf: p => {
    const q = V.sub(p, hb), u = V.dot(q, wide), v = V.dot(q, bd), rho = Math.hypot(u, v), a = Math.atan2(v, u);
    if (rho > R - 0.9) return M.GOLD;   // the rim
    if (rho < 1.5) return M.GOLD;
    return Math.abs(Math.sin(a * 6)) > 0.62 ? M.GOLD : 0; } });   // broad gold rays
  for (const sd of [-1, 1]) r.sph(V.mad(hb, w2, sd * 0.9), 1.2, M.HOLY, { noShadow: true });   // the boss glows
};
Object.assign(GEAR_SWING, { pal_flange: 'heavy', pal_drum: 'heavy', pal_greatdrum: 'heavy', pal_lantern: 'heavy', pal_discmaul: 'heavy' });
Object.assign(GEAR_LEN, { pal_flange: 16, pal_drum: 17, pal_greatdrum: 21, pal_lantern: 17, pal_discmaul: 21 });
Object.assign(ACROSS_GRIP, { pal_greatdrum: 1, pal_discmaul: 1 });
Object.assign(PAL_TWO_HAND, { pal_greatdrum: 1, pal_discmaul: 1 });

// ---------------------------------------------------------------- shields (repainted base shields, through paladin.js's PAL_SHIELD)
Object.assign(SHIELD_VARS, { pal_vheater: 'heater', pal_sunround: 'round', pal_seraphtower: 'tower' });
Object.assign(PAL_SHIELD, {
  pal_vheater: (r, q, sh0) => {   // VIGIL HEATER: white, a navy border inside a gold rim, a gold eight-pointed star
    const c = q.c, ax = q.ax, rad = q.rad; q.m = M.WPLATE;
    q.mf = p => { const d = V.sub(p, c), u = V.dot(d, ax[1]) / rad[1], v = V.dot(d, ax[2]) / rad[2]; if (V.dot(d, ax[0]) < -0.3) return M.WOOD;
      if (v > 0.66 || u * u + v * v > 0.7) return M.GOLD; if (v > 0.5 || u * u + v * v > 0.46) return M.CLOTH_NAVY; return ptStar(u, (v - 0.08) * 1.25, 0.42) ? M.GOLD : 0; };
    if (r.p[sh0 + 1]) r.p[sh0 + 1].m = M.GOLD;
  },
  pal_sunround: (r, q) => {   // AURIC SUN DISC: a round white shield, broad gold rays, a gold rim and boss
    const c = q.c, ax = q.ax, R = q.rad[1]; q.m = M.WPLATE;
    q.mf = p => { const d = V.sub(p, c), u = V.dot(d, ax[1]) / R, v = V.dot(d, ax[2]) / R, d2 = u * u + v * v; if (V.dot(d, ax[0]) < -0.3) return M.WOOD;
      if (d2 > 0.74) return M.GOLD; if (d2 < 0.1) return M.GOLD; return Math.abs(Math.sin(Math.atan2(v, u) * 5)) > 0.6 ? M.GOLD : 0; };
    r.sph(V.mad(c, ax[0], 0.7), 1.5, M.GOLD);   // the boss
  },
  pal_seraphtower: (r, q) => {   // SERAPH TOWER: tall white plate, a gold rim with corner caps, a big sun that glows
    const c = q.c, ax = q.ax, h = q.half; q.m = M.WPLATE;
    q.mf = p => { const d = V.sub(p, c), u = V.dot(d, ax[1]) / h[1], v = V.dot(d, ax[2]) / h[2]; if (V.dot(d, ax[0]) < -0.3) return M.WOOD;
      if (Math.abs(u) > 0.84 || Math.abs(v) > 0.92) return M.GOLD; if (Math.abs(u) > 0.5 && Math.abs(v) > 0.78) return M.GOLD;
      const su = u, sv = (v - 0.08) * h[2] / h[1], ds = Math.hypot(su, sv), a = Math.atan2(sv, su);
      if (ds < 0.3) return M.HOLY; if (ds < 0.66 && Math.abs(Math.sin(a * 4)) > 0.78) return M.GOLD; if (ds < 0.38) return M.GOLD; return 0; };   // (pass 1: palSun's sun was a pixel on the tall field)
  },
});

// ---------------------------------------------------------------- items
// Stats continue his curve (paladin.js: plate 4-20 armor over levels 1-6, helms 3-9, shields 3-12 armor / 10-30
// block, one-handers avg 5.5-11.5, two-handers ~1.33x a one-hander). Each beats the best older base found
// at the same level (itemStats grows a piece found above its base level: damage by ((L+2)/(l+2))^0.8,
// armor by its square root), and each tier beats the one before found at the next tier's level.
Object.assign(ITEM_BASES, {
  pt_vigil_plate: { slot: 'chest', look: 'pal_vigil', name: 'SILVER VIGIL PLATE', armor: 23, cls: 'paladin', lvl: 6, palIcon: 1 },
  pt_vigil_helm: { slot: 'helm', look: 'pal_plume', name: 'VIGIL GREAT HELM', armor: 11, cls: 'paladin', lvl: 6, palIcon: 1 },
  pt_vigil_mace: { slot: 'weapon', look: 'pal_flange', name: 'VIGIL MACE', dmg: [12, 25], cls: 'paladin', lvl: 6, palIcon: 1 },
  pt_vigil_shield: { slot: 'shield', look: 'pal_vheater', name: 'VIGIL HEATER', armor: 14, block: 32, cls: 'paladin', lvl: 6, palIcon: 1 },
  pt_auric_plate: { slot: 'chest', look: 'pal_auric', name: 'AURIC PLATE', armor: 27, cls: 'paladin', lvl: 8, palIcon: 1 },
  pt_auric_helm: { slot: 'helm', look: 'pal_sunfan', name: 'AURIC SUNBURST', armor: 13, cls: 'paladin', lvl: 8, palIcon: 1 },
  pt_auric_hammer: { slot: 'weapon', look: 'pal_drum', name: 'AURIC HAMMER', dmg: [15, 32], cls: 'paladin', lvl: 8, palIcon: 1 },
  pt_auric_maul: { slot: 'weapon', look: 'pal_greatdrum', name: 'AURIC GREAT HAMMER', dmg: [20, 43], cls: 'paladin', lvl: 8, slow: true, twoHand: true, palIcon: 1 },
  pt_auric_shield: { slot: 'shield', look: 'pal_sunround', name: 'AURIC SUN DISC', armor: 17, block: 34, cls: 'paladin', lvl: 8, palIcon: 1 },
  pt_seraph_plate: { slot: 'chest', look: 'pal_seraph', name: 'HIGH SERAPH PLATE', armor: 31, cls: 'paladin', lvl: 10, palIcon: 1 },
  pt_seraph_helm: { slot: 'helm', look: 'pal_seraphim', name: 'SERAPH HELM', armor: 15, cls: 'paladin', lvl: 10, palIcon: 1 },
  pt_seraph_hammer: { slot: 'weapon', look: 'pal_lantern', name: 'SERAPH LANTERN', dmg: [18, 39], cls: 'paladin', lvl: 10, palIcon: 1 },
  pt_seraph_maul: { slot: 'weapon', look: 'pal_discmaul', name: 'SERAPH SUNMAUL', dmg: [24, 52], cls: 'paladin', lvl: 10, slow: true, twoHand: true, palIcon: 1 },
  pt_seraph_shield: { slot: 'shield', look: 'pal_seraphtower', name: 'SERAPH TOWER', armor: 20, block: 36, cls: 'paladin', lvl: 10, palIcon: 1 },
});
// matching pieces: an outfit per look (a two-hander counts in place of the one-hander and shield)
Object.assign(OUTFITS, {
  silvervigil: { name: 'SILVER VIGIL', pieces: ['pt_vigil_plate', 'pt_vigil_helm', 'pt_vigil_shield', 'pt_vigil_mace'], bonus: [{ armorFlat: 8 }, { hp: 30 }, { dmgPct: 15 }], lines: ['2: +8 ARMOR', '3: +30 LIFE', '4: +15% DAMAGE'] },
  auricchampion: { name: 'AURIC CHAMPION', pieces: ['pt_auric_plate', 'pt_auric_helm', 'pt_auric_shield', 'pt_auric_hammer', 'pt_auric_maul'], bonus: [{ hp: 35 }, { regen: 3 }, { dmgPct: 18 }], lines: ['2: +35 LIFE', '3: +3 LIFE/S', '4: +18% DAMAGE'] },
  highseraph: { name: 'HIGH SERAPH', pieces: ['pt_seraph_plate', 'pt_seraph_helm', 'pt_seraph_shield', 'pt_seraph_hammer', 'pt_seraph_maul'], bonus: [{ armorFlat: 12, hp: 30 }, { dmgPct: 15, regen: 3 }, { dmgPct: 10, hp: 30 }], lines: ['2: +12 ARMOR, +30 LIFE', '3: +15% DAMAGE, +3 LIFE/S', '4: +10% DAMAGE, +30 LIFE'] },
});
// TEMPERED and ANCIENT copies (paladin.js made them for the pal_ pieces before these existed)
for (const id of Object.keys(ITEM_BASES).filter(k => k.startsWith('pt_') && !/_t\d$/.test(k) && ITEM_BASES[k].cls === 'paladin' && ITEM_BASES[k].palIcon)) {
  const b = ITEM_BASES[id];
  TIERS.forEach(([word, up], n) => {
    const L = b.lvl + up, k = (L + 2) / (b.lvl + 2), v = Object.assign({}, b, { name: word + ' ' + b.name, lvl: L, root: id, tier: n + 1 });
    if (b.dmg) { const kd = Math.pow(k, 0.8); v.dmg = [Math.round(b.dmg[0] * kd), Math.round(b.dmg[1] * kd)]; }
    if (b.armor) v.armor = Math.round(b.armor * Math.sqrt(k));
    if (b.block) v.block = Math.min(40, b.block + 5 * (n + 1));
    ITEM_BASES[id + '_t' + (n + 1)] = v;
  });
}

// ---------------------------------------------------------------- icons: the new chests (paladin.js draws weapons, shields and helms from the same parts)
const PT_CHEST_ICON = {
  pal_vigil: { pl: M.WPLATE, pad: M.WPLATE, rim: M.GOLD, tab: { w: 2.6, m: M.CLOTH_NAVY, border: M.GOLD, star: M.GOLD, zc: 0.8, R: 2.4 } },
  pal_auric: { pl: M.WPLATE, pad: M.GOLD, wing: 1, gorget: 1, tab: { w: 2.6, m: M.CLOTH_WHITE, border: M.GOLD, sun: M.GOLD, coreM: M.HOLY, zc: 0.6, R: 2.4, core: 1.0 } },
  pal_seraph: { pl: M.WPLATE, pad: M.GOLD, big: 1, gorget: 1, orb: 1, tab: { w: 2.6, m: M.CLOTH_WHITE, border: M.GOLD, sun: M.GOLD, zc: 0.4, R: 2.2, core: 0.9 } },
};
{ const ic1 = itemIcon; itemIcon = function (it) {
  const b = ITEM_BASES[it.base], o = b && b.slot === 'chest' && PT_CHEST_ICON[b.look]; if (!o) return ic1(it);
  const k = 'pal|' + b.look; if (iconCache[k]) return iconCache[k];
  const r = new Rig(), S = { loc: p => [p[0], p[1], p[2] - 1] }, tab = ptTabard(S, o.tab);
  r.ell([0, 0, 2], [4.4, 6.0, 6.0], o.pl, null, { mf: p => (o.gorget && p[2] > 5.0 ? M.GOLD : tab(p)) });
  if (o.orb) r.sph([4.0, 0, 6.0], 1.3, M.GOLD);
  for (const s of [-1, 1]) {
    if (o.wing) for (let n = 0; n < 3; n++) r.ell([0, s * (6.2 + n * 0.9), 6.4 - n * 1.6], [3.6, 3.0 + n * 0.4, 1.4], M.GOLD, frameAlong([1, 0, 0], V.norm([0, s * (0.55 + n * 0.25), 1])));
    else r.ell([0, s * 6.6, 6], o.big ? [4.2, 4.0, 3.6] : [3.6, 3.4, 3], o.pad, null, o.rim ? { mf: p => p[2] < 5.2 ? o.rim : 0 } : undefined);
  }
  return (iconCache[k] = renderRig(r, Math.PI / 4, 26, 26, 13, 17));
}; }
