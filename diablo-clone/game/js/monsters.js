'use strict';
// Enemy families: skeleton (biped, bones), fallen (small hunched biped), hound (quadruped),
// spider (eight legs). Each takes a `look` (the variant) and a pose state {clip, f, key, prev}.

// ---------------------------------------------------------------- skeleton
const SKEL_B = { hipH: 12.5, thigh: 6.4, shin: 5.8, ankle: 1.2, spine: 7, shW: 5.6, shZ: 3, neck: 10, upper: 6, fore: 5.5, hipW: 2.6, stride: 5.5, lift: 2.5, duty: 0.55, bob: 0.6, sway: 0.5, runLean: 0.1, counter: 0.14 };
function skullAt(r, hd, fwd, sideR, up, bone, eye, jawOpen = 0, k = 1) {
  r.sph(hd, 4.1 * k, bone, { mf: p => {
    const q = V.sub(p, hd), f2 = V.dot(q, fwd), s2 = V.dot(q, sideR), z2 = V.dot(q, up);
    // the camera looks down 30°, so the face sits high on the skull to read from above
    if (f2 > 1.2 * k && (Math.abs(s2) - 1.7 * k) ** 2 + (z2 - 0.9 * k) ** 2 < (1.3 * k) ** 2) return M.DARK;   // big round sockets
    if (f2 > 3 * k && Math.abs(s2) < 0.55 * k && z2 < -0.5 * k && z2 > -1.5 * k) return M.DARK;            // nose
    if (f2 > 2.6 * k && z2 < -2 * k && Math.abs(s2) < 2 * k && (Math.round(s2 / k * 1.4) & 1)) return M.DARK;   // teeth gaps                      // nose
    return 0;
  } });
  for (const s of [-1, 1]) r.sph(V.add(V.add(V.mad(hd, fwd, 3.4 * k), V.mul(sideR, s * 1.65 * k)), V.mul(up, 0.8 * k)), 0.65 * k, eye, { noShadow: true });
  const jc = V.add(V.mad(hd, fwd, 1.6 * k), V.mul(up, (-3.3 - jawOpen) * k));
  r.ell(jc, [2.7 * k, 2.6 * k, 1.1 * k], bone, frameAlong(fwd, up), { mf: p => V.dot(V.sub(p, jc), fwd) > 1.8 && Math.abs(V.dot(V.sub(p, jc), up) - 0.6) < 0.35 ? M.DARK : 0 });
}
function skeletonRig(look, st) {
  const B = SKEL_B, J = bipedJoints(B, st), r = new Rig(), { fwd, sideR, up } = J;
  const bone = look.bone || M.BONE, eye = look.eye || M.EYE_RED;
  if (!look.lich) for (const [hip, knee, ank] of [[J.hipL, J.kneeL, J.ankL], [J.hipR, J.kneeR, J.ankR]]) {
    r.cone(hip, knee, 1.3, 1.0, bone); r.cone(knee, ank, 1.1, 0.9, bone);
    r.sph(knee, 1.4, bone); r.ell(V.add(ank, [1.4, 0, -0.6]), [2.4, 1.2, 0.8], bone);
  }
  r.ell(J.pelvis, [2.6, 4.0, 2.0], bone);
  r.cone(J.pelvis, V.mad(J.chest, up, 3.5), 1.0, 1.1, bone);
  // ribcage: separate curved rib bars over a dark hollow, so the gaps read as gaps
  const rc = V.mad(J.chest, up, 0.4);
  r.ell(V.mad(rc, fwd, 0.6), [2.0, 3.0, 3.6], M.DARK, frameAlong(fwd, up), { noShadow: true });
  // from behind: spine column and shoulder blades
  r.cone(V.add(V.mad(rc, up, -4), V.mul(fwd, -1.9)), V.add(V.mad(rc, up, 4), V.mul(fwd, -1.9)), 0.9, 0.9, bone);
  for (const sd of [-1, 1]) r.ell(V.add(V.add(V.mad(rc, up, 2.2), V.mul(fwd, -1.9)), V.mul(sideR, sd * 2.6)), [0.6, 1.9, 2.4], bone, frameAlong(fwd, up));
  for (let k = 0; k < 4; k++) {
    const z = 3.2 - k * 2.35, wR = 4.6 - Math.abs(k - 1) * 0.5;
    for (const sd of [-1, 1]) {
      const back = V.add(V.mad(rc, up, z + 0.4), V.mul(fwd, -1.6));
      const side = V.add(V.add(V.mad(rc, up, z), V.mul(fwd, 1.0)), V.mul(sideR, sd * wR));
      const front = V.add(V.add(V.mad(rc, up, z - 0.7), V.mul(fwd, 3.3)), V.mul(sideR, sd * 0.9));
      r.group(() => { r.cone(back, side, 0.75, 0.7, bone); r.cone(side, front, 0.7, 0.6, bone); });
    }
  }
  r.cone(V.add(V.mad(rc, up, 3.2), V.mul(fwd, 3.2)), V.add(V.mad(rc, up, -2.6), V.mul(fwd, 3.2)), 0.7, 0.6, bone);   // sternum
  r.ell(V.mad(rc, up, 4.3), [2.2, 5.6, 0.9], bone, frameAlong(fwd, up));   // collarbones
  for (const sh of [J.shL, J.shR]) r.sph(sh, 1.7, bone);
  // arms + gear
  const sw = st.key || null;
  let handR, handL, bd = V.norm([1, 0, 0.6]);
  if (look.weapon === 'bow') {
    const draw = st.clip === 'shoot' ? sw.a : 0;
    handL = V.add(V.add(J.shL, V.mul(fwd, 9.5)), V.mul(up, -1));
    handR = V.add(V.add(J.shR, V.mul(fwd, 9.5 - draw * 7)), V.add(V.mul(up, -1), V.mul(sideR, -2.5)));
    if (st.clip !== 'shoot') { handL = V.add(V.add(J.shL, V.mul(fwd, 4)), V.mul(up, -8)); handR = V.add(V.add(J.shR, V.mul(fwd, 2)), V.mul(up, -9)); }
  } else if (look.lich) {
    // the lich: staff upright in the right hand, raised high to cast (the cast swing's a: 0 -> 1.2);
    // the off hand claws forward, open, as the spell is loosed
    const a = st.clip === 'cast' && sw ? sw.a : 0;
    handR = V.add(V.add(J.shR, V.mul(fwd, 3 + a * 2.5)), V.add(V.mul(up, -6 + a * 7), V.mul(sideR, 2.5)));
    bd = V.norm(V.add(V.mul(fwd, 0.1 + a * 0.25), up));
    handL = a > 0.6 ? V.add(V.add(J.shL, V.mul(fwd, 8)), V.mul(up, -1)) : V.add(V.add(J.shL, V.mul(fwd, 4 + J.swingArm)), V.add(V.mul(up, -6), V.mul(sideR, -1)));
  } else if (st.clip === 'attack') {
    const F = fwd, U = V.norm(V.add(V.mul(up, 0.8), V.mul(sideR, 0.6))), piv = V.add(V.mad(J.chest, sideR, 2), V.mul(up, 4));
    const ba = sw.a + (sw.ck || 0);   // blade cocked past the arm, as the hero's
    bd = V.norm(V.add(V.mul(F, Math.cos(ba)), V.mul(U, Math.sin(ba))));
    handR = V.mad(piv, V.norm(V.add(V.mul(F, Math.cos(sw.a)), V.mul(U, Math.sin(sw.a)))), (sw.r || 7) * 0.85);
    if (sw.smear && st.prev) smearArc(r, piv, F, U, st.prev.a + (st.prev.ck || 0), ba, 9, 18);
    handL = V.add(V.add(J.shL, V.mul(fwd, 5)), V.mul(up, -6));
  } else if (look.armored) {
    // armored warrior's guard (mock-up): long blade held low across the front, shield up
    handR = V.add(V.add(J.shR, V.mul(fwd, 5.5 + J.swingArm)), V.add(V.mul(up, -7.5), V.mul(sideR, 1.5)));
    handL = V.add(V.add(J.shL, V.mul(fwd, 5.5 - J.swingArm * 1.5)), V.add(V.mul(up, -4), V.mul(sideR, -1)));
    bd = V.norm(V.add(V.add(V.mul(fwd, 0.6), V.mul(up, -0.4)), V.mul(sideR, -0.7)));
  } else {
    // guard: sword raised beside the head, shield forward
    handR = V.add(V.add(J.shR, V.mul(fwd, 2 + J.swingArm)), V.add(V.mul(up, 1.5), V.mul(sideR, 2.5)));
    handL = V.add(V.add(J.shL, V.mul(fwd, 5.5 - J.swingArm * 1.5)), V.add(V.mul(up, -5), V.mul(sideR, -0.5)));
    bd = V.norm(V.add(V.add(V.mul(fwd, 0.15), V.mul(up, 1)), V.mul(sideR, 0.15)));
  }
  const aR = armTo(J, J.shR, handR, B, 1), aL = armTo(J, J.shL, handL, B, -1);
  for (const a of [aR, aL]) {
    const sh = a === aR ? J.shR : J.shL;
    r.cone(sh, a.el, 1.1, 0.9, bone); r.cone(a.el, a.hand, 0.9, 0.8, bone); r.sph(a.hand, 1.2, bone);
  }
  if (look.weapon === 'bow') {
    const c = aL.hand, ax = frameAlong(fwd, up);
    const top = V.add(V.mad(c, up, 8), V.mul(fwd, -2)), bot = V.add(V.mad(c, up, -8), V.mul(fwd, -2));
    r.group(() => { r.cone(c, top, 0.8, 0.5, M.WOOD); r.cone(c, bot, 0.8, 0.5, M.WOOD); });
    const pull = st.clip === 'shoot' ? aR.hand : V.add(c, V.mul(fwd, -2.2));
    r.cone(top, pull, 0.3, 0.3, M.BONE, { noShadow: true }); r.cone(pull, bot, 0.3, 0.3, M.BONE, { noShadow: true });
    if (st.clip === 'shoot' && sw.a > 0.5) r.cone(aR.hand, V.mad(aR.hand, fwd, 11), 0.35, 0.35, M.WOOD);
    void ax;
  } else if (look.lich) {   // a long staff of black wood with a bone cage around a frost orb
    const g = aR.hand;
    r.cone(V.mad(g, bd, -9), V.mad(g, bd, 14), 0.8, 0.9, bone, { mf: p => (Math.round(V.dot(V.sub(p, g), bd) * 0.5) % 3 === 0) ? M.OLDBONE : 0 });   // a staff of bone, jointed
    const top = V.mad(g, bd, 17);
    for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2, o = V.add(V.mul(fwd, Math.cos(a) * 2.4), V.mul(sideR, Math.sin(a) * 2.4)); r.cone(V.mad(g, bd, 13.5), V.add(V.mad(g, bd, 19.5), V.mul(o, 0.4)), 0.5, 0.3, bone, { noShadow: true }); r.sph(V.add(top, o), 0.5, bone, { noShadow: true }); }
    r.sph(top, 2.2, M.ICE, { noShadow: true });
  } else {
    const g = aR.hand, wide = V.norm(V.cross(bd, V.len(V.cross(bd, up)) > 0.3 ? up : fwd)), wf = [bd, wide, V.cross(bd, wide)];
    r.cone(V.mad(g, bd, -1.6), V.mad(g, bd, 1), 0.7, 0.7, M.LEATHER);
    r.box(V.mad(g, bd, 1.3), [0.6, 2.4, 0.6], M.IRON, wf);
    if (look.armored) {   // a longer, rust-pitted blade
      const bc = V.mad(g, bd, 10);
      r.box(bc, [8.4, 1.1, 0.35], M.IRON, wf, { mf: p => hash(Math.round(V.dot(V.sub(p, bc), bd) * 1.3), 7, 3) < 0.35 ? M.RUST : 0 });
    } else r.box(V.mad(g, bd, 8.6), [7, 1.0, 0.35], M.IRON, wf);
    if (look.shield && look.armored) {   // heater shield: red field, rusted rim, a bone skull emblem
      const n = V.norm(V.add(V.mul(fwd, 0.8), V.mul(sideR, -0.6))), c = V.mad(aL.hand, n, 1.4), ax = [n, V.norm(V.cross(up, n)), up];
      r.ell(c, [1.0, 4.8, 6.4], M.CLOTH_RED, ax, { mf: p => {
        const q = V.sub(p, c), u = V.dot(q, ax[1]), v = V.dot(q, ax[2]);
        if ((u / 4.8) ** 2 + (v / 6.4) ** 2 > 0.7) return M.RUST;
        const su = Math.abs(u), sv = v - 0.9;
        if (su < 1.2 && v < -0.5 && v > -1.9) return su % 0.8 < 0.3 ? M.DARK : M.BONE;              // jaw with teeth
        if (su * su + sv * sv < 3.6) return ((su - 0.85) ** 2 + (sv + 0.1) ** 2 < 0.3) ? M.DARK : M.BONE;   // skull + eye holes
        return 0;
      } });
    } else if (look.shield) {
      const n = V.norm(V.add(V.mul(fwd, 0.8), V.mul(sideR, -0.6))), c = V.mad(aL.hand, n, 1.3), ax = [n, V.norm(V.cross(up, n)), up];
      r.ell(c, [1.0, 5.6, 5.6], M.WOOD, ax, { mf: p => { const q = V.sub(p, c), d2 = (V.dot(q, ax[1]) ** 2 + V.dot(q, ax[2]) ** 2) / 31.4; return d2 > 0.74 || d2 < 0.05 ? M.IRON : (Math.abs(V.dot(q, ax[1]) - V.dot(q, ax[2])) < 0.5 ? M.LEATHER : 0); } });
    }
  }
  if (look.armored) {
    // rusted bracers and greaves, one pauldron, belt and buckle, red loincloth and scarf (mock-up)
    for (const a of [aR, aL]) r.cyl(V.lerp(a.el, a.hand, 0.2), V.lerp(a.el, a.hand, 0.8), 1.45, M.RUST);
    for (const [knee, ank] of [[J.kneeL, J.ankL], [J.kneeR, J.ankR]]) r.cyl(V.lerp(knee, ank, 0.15), V.lerp(knee, ank, 0.7), 1.55, M.RUST);
    const pc = V.add(V.mad(J.shR, up, 1.3), V.mul(sideR, 0.9));
    r.ell(pc, [3.8, 3.6, 3.0], M.RUST, frameAlong(fwd, up), { mf: p => V.dot(V.sub(p, pc), up) < -1.6 ? M.IRON : 0 });
    const bc = V.mad(J.pelvis, up, 1.8);
    r.ell(bc, [3.0, 4.4, 1.1], M.LEATHER, frameAlong(fwd, up));
    r.cyl(V.mad(bc, fwd, 2.7), V.mad(bc, fwd, 3.4), 1.4, M.GOLD, { mf: p => V.len(V.sub(V.sub(p, V.mad(bc, fwd, 3.4)), V.mul(fwd, V.dot(V.sub(p, V.mad(bc, fwd, 3.4)), fwd)))) < 0.7 ? M.IRON : 0 });
    r.box(V.add(V.mad(J.pelvis, fwd, 2.6), V.mul(up, -2.6)), [0.4, 1.9, 3.4], M.CLOTH_RED, frameAlong(fwd, up), { mf: p => V.dot(V.sub(p, J.pelvis), up) < -5 && hash(Math.round(V.dot(p, sideR) * 2), 5, 9) < 0.4 ? M.MARK : 0 });
    const nk = V.mad(J.chest, up, 4.6);
    r.group(() => {   // a wide cowl of a scarf with one tail falling over the shield shoulder
      r.ell(nk, [3.6, 5.2, 2.0], M.CLOTH_RED, frameAlong(fwd, up));
      r.cone(V.add(V.mad(nk, fwd, 1.8), V.mul(sideR, -3.8)), V.add(V.add(V.mad(nk, fwd, 2.4), V.mul(sideR, -4.6)), V.mul(up, -5)), 1.5, 0.7, M.CLOTH_RED);
    });
  }
  if (look.lich) {
    // a tattered robe from the waist to the floor (it floats: no feet), hem ragged and glowing
    // faintly; a high mantle over the shoulders; the ribcage shows through the open front
    const RM = M.CLOTH_DARK, TRIM = M.CLOTH_PURPLE, top = V.mad(J.pelvis, up, 2), hem = [J.pelvis[0] - (st.clip === 'walk' ? 1.6 : 0.3), J.pelvis[1], 1.2], ax = V.norm(V.sub(hem, top)), Lh = V.len(V.sub(hem, top));
    r.cone(top, hem, 4.0, 8.2, RM, { mf: p => {
      const q = V.sub(p, top), t = V.dot(q, ax);
      if (t > Lh - 1.4 && hash(Math.round(V.dot(q, sideR) * 1.3 + V.dot(q, fwd) * 1.1), 3, 7) < 0.45) return M.DARK;   // ragged, tattered hem
      if (Math.abs(t - (Lh - 2.6)) < 0.5) return TRIM;   // a purple band above the hem
      return V.dot(q, fwd) > 2.6 && Math.abs(V.dot(q, sideR)) < 1.0 ? TRIM : 0;   // and down the front
    } });
    const mc = V.mad(J.chest, up, 3.6);
    r.group(() => {   // mantle: wide over the shoulders with a stiff collar behind the neck
      r.ell(mc, [3.8, 7.6, 2.6], RM, frameAlong(fwd, up), { mf: p => V.dot(V.sub(p, mc), up) < -1.4 ? TRIM : 0 });
      r.ell(V.add(V.mad(mc, up, 1.8), V.mul(fwd, -2.8)), [1.0, 4.2, 2.8], TRIM, frameAlong(fwd, up));
    });
    for (const sd of [-1, 1]) {   // bone spikes jutting up from the shoulders
      const b0 = V.add(V.mad(mc, up, 0.8), V.mul(sideR, sd * 5.6));
      r.cone(b0, V.add(V.add(V.mad(b0, up, 6.5), V.mul(sideR, sd * 2.6)), V.mul(fwd, -0.8)), 1.3, 0.2, bone);
      r.cone(V.add(b0, V.mul(fwd, -1.8)), V.add(V.add(V.mad(b0, up, 4.4), V.mul(sideR, sd * 3.4)), V.mul(fwd, -2.8)), 1.1, 0.2, bone);
    }
    for (const a of [aR, aL]) r.cone(V.lerp(a.el, a.hand, 0.15), V.lerp(a.el, a.hand, 0.75), 1.5, 2.3, RM);   // ragged sleeves
  }
  const sk0 = r.p.length;
  skullAt(r, look.armored ? V.mad(J.head, up, 0.6) : J.head, fwd, sideR, up, bone, eye, st.clip === 'attack' && sw.hit ? 0.8 : 0, look.armored ? 1.15 : 1);
  if (look.helm) r.ell(V.mad(J.head, up, 1.8), [4.5, 4.5, 3.2], M.IRON);
  if (look.lich) {   // a dark iron circlet with tall points and a frost stone
    const cc = V.mad(J.head, up, 2.6);
    r.cyl(V.mad(cc, up, 0.2), V.mad(cc, up, 0.75), 3.75, M.IRON);
    for (let k = 0; k < 5; k++) { const a = (k / 4 - 0.5) * 2.2, b = V.add(V.mad(cc, up, 0.6), V.add(V.mul(fwd, Math.cos(a) * 3.6), V.mul(sideR, Math.sin(a) * 3.6))); r.cone(b, V.mad(b, up, k === 2 ? 3.4 : 2.2), 0.55, 0.12, M.IRON); }
    r.sph(V.add(V.mad(cc, up, 0.5), V.mul(fwd, 3.8)), 0.75, M.ICE, { noShadow: true });
  }
  if (look.crown) {   // the Skeleton King: a gold crown with points and red stones
    const cc = V.mad(J.head, up, 3.2);
    r.cyl(cc, V.mad(cc, up, 1.6), 4.2, M.GOLD);
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, b = V.add(V.mad(cc, up, 1.4), V.add(V.mul(fwd, Math.cos(a) * 3.9), V.mul(sideR, Math.sin(a) * 3.9))); r.cone(b, V.mad(b, up, 2.6), 0.9, 0.2, M.GOLD); }
    r.sph(V.add(V.mad(cc, up, 0.8), V.mul(fwd, 4.3)), 0.8, M.EYE_RED, { noShadow: true });
  }
  bigHead(r, sk0, J.head, 1.4);   // chibi skull
  if (look.crown) {   // and a royal cloak
    const top = V.add(V.mad(J.chest, up, 3.4), V.mul(fwd, -2.4)), dn = V.norm(V.add(V.mul(up, -1), V.mul(fwd, -0.25))), a1 = V.norm(V.sub(sideR, V.mul(dn, V.dot(sideR, dn))));
    r.box(V.mad(top, dn, 6.5), [0.5, 5.5, 6.5], M.CLOTH_RED, [V.cross(a1, dn), a1, dn], { mf: p => V.dot(V.sub(p, top), dn) > 11.5 ? M.GOLD : 0 });
  }
  if (look.lich && st.clip !== 'death') {   // floats a hand's breadth off the floor, bobbing slowly
    const lift = 2.2 + (st.clip === 'idle' ? [0, 0.6, 1, 0.6][st.f % 4] : 0.5);
    for (const q of r.p) { if (q.c) q.c = [q.c[0], q.c[1], q.c[2] + lift]; if (q.a) { q.a = [q.a[0], q.a[1], q.a[2] + lift]; q.b = [q.b[0], q.b[1], q.b[2] + lift]; } if (q.mf) { const f0 = q.mf; q.mf = (p, n) => f0([p[0], p[1], p[2] - lift], n); } }
  }
  if (look.scale || 1.1) scaleRig(r, look.scale || 1.1);
  if (st.clip === 'death') {   // collapses in a heap: tip forward and drop hard
    tipRig(r, [2, 0, 0], [0, 0.25, 0.7, 1.2, 1.45, 1.55][st.f], -0.4 * st.f / 5, [0, 1, 1.6, 2, 2.2, 2.3][st.f]);
  }
  return r;
}

// ---------------------------------------------------------------- fallen (imp)
const FALLEN_B = { hipH: 9.5, thigh: 5.2, shin: 5, ankle: 1, spine: 6.5, shW: 4.6, shZ: 2, neck: 7.8, upper: 4.6, fore: 4.4, hipW: 2.2, stride: 4.5, lift: 2.6, hunch: 0.35, duty: 0.42, bob: 0.6, sway: 0.35, runLean: 0.1, counter: 0.18 };
function fallenRig(look, st) {
  const B = FALLEN_B, J = bipedJoints(B, st), r = new Rig(), { fwd, sideR, up } = J;
  const skin = look.skin || M.FLESH;
  for (const [hip, knee, ank] of [[J.hipL, J.kneeL, J.ankL], [J.hipR, J.kneeR, J.ankR]]) {
    r.cone(hip, knee, 1.8, 1.4, skin); r.cone(knee, ank, 1.4, 1.0, skin);
    r.ell(V.add(ank, [1.4, 0, -0.5]), [2.2, 1.2, 0.8], M.HORN);
  }
  r.group(() => { r.ell(J.pelvis, [3.2, 3.6, 2.8], skin); r.ell(V.lerp(J.pelvis, J.chest, 0.6), [3.6, 4.0, 4.2], skin, frameAlong(fwd, up)); });
  r.box(V.add(V.mad(J.pelvis, fwd, 2.6), [0, 0, -1.6]), [0.5, 2.4, 2.6], M.LEATHER, frameAlong(fwd, [0, 0, 1]));
  const sw = st.key || null;
  let handR, handL = V.add(V.add(J.shL, V.mul(fwd, 3.5 - J.swingArm * 1.5)), V.mul(up, -5)), bd;
  if (st.clip === 'attack' && sw.tw !== undefined) {   // round 34, the pounce: spear raised overhead through the crouch and leap, stabbed down on landing
    if (sw.a > 1.2) { handR = V.add(V.add(J.shR, V.mul(fwd, -0.6)), V.add(V.mul(up, 2.8), V.mul(sideR, 0.6))); bd = V.norm(V.add(V.mul(fwd, 0.75), V.mul(up, 0.45))); handL = V.add(V.add(J.shL, V.mul(fwd, 2.5)), V.mul(up, -1)); }
    else if (sw.a < 0.5) { handR = V.add(V.add(J.shR, V.mul(fwd, 7)), V.mul(up, -3.2)); bd = V.norm(V.add(fwd, V.mul(up, -0.5))); handL = V.add(V.add(J.shL, V.mul(fwd, 5)), V.mul(up, -3)); }
    else { handR = V.add(V.add(J.shR, V.mul(fwd, 3.5)), V.mul(up, -2)); bd = V.norm(V.add(fwd, V.mul(up, 0.1))); }
  } else if (st.clip === 'attack') {   // a thrust: spear pulled back, then jabbed forward on the hit key
    const ext = sw.a < 0.5 ? 1 : sw.a > 1.2 ? -0.6 : 0.2;
    handR = V.add(V.add(J.shR, V.mul(fwd, 3 + ext * 4.5)), V.mul(up, -1.5)); bd = V.norm(V.add(fwd, V.mul(up, -0.1)));
    handL = V.add(V.add(J.shL, V.mul(fwd, 3 + ext * 3)), V.mul(up, -2));
  } else if (st.clip === 'cast') {
    handR = V.add(V.add(J.shR, V.mul(fwd, 2 + sw.a * 2)), V.mul(up, -1 + sw.a * 4)); bd = V.norm([0.2, 0, 1]);
  } else {
    handR = V.add(V.add(J.shR, V.mul(fwd, 2.5 + J.swingArm * 1.5)), V.mul(up, -5)); bd = V.norm(V.add(V.mul(fwd, 0.35), up));
  }
  const aR = armTo(J, J.shR, handR, B, 1), aL = armTo(J, J.shL, handL, B, -1);
  for (const [sh, a] of [[J.shR, aR], [J.shL, aL]]) { r.cone(sh, a.el, 1.4, 1.1, skin); r.cone(a.el, a.hand, 1.1, 0.9, skin); r.sph(a.hand, 1.3, skin); }
  // weapon: spear (warrior) or a staff with a glowing head (shaman)
  const g = aR.hand;
  if (look.sack) {   // a bulging sack on its back with coins spilling over the top
    const sc = V.add(V.mad(J.chest, up, 1), V.mul(fwd, -4.2));
    r.ell(sc, [3.4, 4, 4.6], M.CLOTH_TAN, frameAlong(fwd, up), { mf: p => V.dot(V.sub(p, sc), up) > 3.6 ? M.LEATHER : 0 });
    for (const [a, b, c] of [[0.6, 1, 4.6], [-0.4, -1.2, 4.9], [0.2, 0, 5.4]]) r.sph(V.add(V.add(V.mad(sc, fwd, a), V.mul(sideR, b)), V.mul(up, c)), 1.1, M.GOLD);
  }
  if (look.digger) {   // a pick: a wooden haft with a curved iron head across its tip, and a lamp at the belt
    r.cone(V.mad(g, bd, -2), V.mad(g, bd, 9), 0.6, 0.6, M.WOOD);
    const tip = V.mad(g, bd, 9), across = V.norm(V.cross(bd, sideR));
    r.cone(V.mad(tip, across, -4.5), V.mad(tip, across, 4.5), 0.9, 0.35, M.IRON);
    const lp = V.add(V.mad(J.pelvis, sideR, -3.4), V.mul(fwd, 0.6));
    r.box(lp, [1.1, 1.1, 1.4], M.LAMP, null, { noShadow: true }); r.box(V.mad(lp, up, 1.8), [0.8, 0.8, 0.4], M.IRON);
  } else if (look.unarmed) { /* both hands free to clutch the sack */ }
  else if (look.staff) {
    r.cone(V.mad(g, bd, -7), V.mad(g, bd, 7), 0.65, 0.65, M.WOOD);
    r.sph(V.mad(g, bd, 8.2), 1.5, M.MAGIC, { noShadow: true });
  } else {
    r.cone(V.mad(g, bd, -6), V.mad(g, bd, 9), 0.6, 0.6, M.WOOD);
    r.cone(V.mad(g, bd, 9), V.mad(g, bd, 12.5), 1.1, 0.25, M.IRON);
  }
  // head: big, with horns (or a goblin's long ears), yellow eyes, a dark mouth
  const hd = J.head, hf0 = r.p.length;
  r.ell(hd, [3.8, 3.6, 3.4], skin, frameAlong(fwd, up), { mf: p => { const q = V.sub(p, hd); return V.dot(q, fwd) > 2.4 && Math.abs(V.dot(q, up) + 1.5) < 0.5 && Math.abs(V.dot(q, sideR)) < 1.6 ? M.DARK : 0; } });
  for (const s of [-1, 1]) {
    r.sph(V.add(V.add(V.mad(hd, fwd, 3.2), V.mul(sideR, s * 1.4)), V.mul(up, 0.6)), 0.6, M.EYE_YEL, { noShadow: true });
    if (look.digger) { r.sph(V.add(V.mad(hd, up, 0.4), V.mul(sideR, s * 3.2)), 1.2, skin); continue; }   // small round ears
    if (look.goblin) { const a = V.add(V.mad(hd, up, 0.8), V.mul(sideR, s * 3.0)); r.cone(a, V.add(V.add(a, V.mul(sideR, s * 4.6)), V.add(V.mul(up, 1.6), V.mul(fwd, -1))), 1.3, 0.25, skin); continue; }
    const a = V.add(V.mad(hd, up, 2.4), V.mul(sideR, s * 2.2)), b = V.add(V.add(V.mad(hd, up, 4.6), V.mul(sideR, s * 3.8)), V.mul(fwd, -2.5));
    r.cone(a, b, 1.0, 0.3, M.HORN);
  }
  if (look.digger) {   // a long snout with a dark nose tip, and a dented iron cap with a brim
    r.ell(V.add(V.mad(hd, fwd, 3.4), V.mul(up, -0.8)), [2.2, 1.6, 1.4], skin, frameAlong(fwd, up), { mf: p => V.dot(V.sub(p, hd), fwd) > 5.1 ? M.DARK : 0 });
    r.ell(V.mad(hd, up, 2.0), [3.9, 3.7, 2.2], M.IRON, frameAlong(fwd, up));
    r.cyl(V.mad(hd, up, 1.0), V.mad(hd, up, 1.5), 4.6, M.IRON);
  }
  if (look.hood) r.ell(V.add(V.mad(hd, up, 0.8), V.mul(fwd, -0.8)), [4.2, 4.2, 3.8], M.CLOTH_PURPLE, frameAlong(fwd, up));
  if (look.goblin && !look.chief) r.ell(V.mad(hd, up, 2.2), [3.6, 3.4, 1.8], M.LEATHER, frameAlong(fwd, up));   // a leather cap
  if (look.chief) {   // the chieftain: a crude gold crown and a bone necklace
    const cc = V.mad(hd, up, 2.4);
    r.cyl(cc, V.mad(cc, up, 1.2), 3.2, M.GOLD);
    for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2, b = V.add(V.mad(cc, up, 1), V.add(V.mul(fwd, Math.cos(a) * 3), V.mul(sideR, Math.sin(a) * 3))); r.cone(b, V.mad(b, up, 2.2), 0.8, 0.2, M.GOLD); }
  }
  bigHead(r, hf0, hd, 1.3);
  if (look.scale && look.scale !== 1) scaleRig(r, look.scale);
  if (st.clip === 'death') deathTip(r, B, st.f, -1, -1);
  return r;
}

// ---------------------------------------------------------------- hound (quadruped)
function houndRig(look, st) {
  // the bone hound (mock-up): grey hide, bone ribs and spine spikes over the back, a skull head
  // with big forward-curving horns, a red scarf with a studded collar, bone claws
  const r = new Rig(), skin = look.skin || M.HIDE, bone = look.bone || M.BONE;
  const { clip, f } = st;
  let bob = 0, lunge = 0, headDrop = 0, jaw = 0.25, ph = 0, moving = false;
  if (clip === 'idle') bob = [0, -0.3, -0.5, -0.2][f % 4];
  if (clip === 'walk') { ph = f / 8 * Math.PI * 2; moving = true; bob = -0.8 * Math.abs(Math.sin(ph)); }
  if (clip === 'attack') {
    const a = st.key.a; lunge = (1 - a) * 3.5; headDrop = a > 0.5 ? -1 : 1; jaw = a > 0.5 ? 0.9 : st.key.hit ? 0.1 : 0.6; bob = a > 0.5 ? -1.2 : 0;
    if (a > 1.1) { lunge = -2.6; bob = -3; headDrop = -2.2; jaw = 0.45; }   // round 34: coiled low on the haunches, head down, snarling
    else if (st.key.mv > 0 || st.key.hit) { lunge = 4.6; bob = 1.2; headDrop = 1.6; }   // stretched out at full length, airborne
  }
  if (clip === 'hit') { lunge = -2; headDrop = -1.5; jaw = 0.6; }
  const H = 11;
  const back = [-4.5 + lunge, 0, H + bob], front = [5 + lunge, 0, H + 2.5 + bob];   // compact, front-heavy
  r.group(() => {
    r.ell(back, [5.2, 5.0, 4.4], skin);
    r.ell(V.lerp(back, front, 0.5), [5.6, 5.2, 4.6], skin);
    r.ell(front, [5.8, 6.2, 5.8], skin);
  });
  // bone ribs over the barrel of the body and a spiked spine (a wolf has fur instead)
  const fur = !!look.wolf;
  for (let i = 0; i < (fur ? 0 : 4); i++) {
    const x = front[0] - 1.5 - i * 2.2, z = H + 1.8 + bob - i * 0.3;
    for (const s of [-1, 1]) r.group(() => {
      r.cone([x, 0, z + 4.4], [x - 0.6, s * 5.0, z + 0.8], 0.8, 0.75, bone);
      r.cone([x - 0.6, s * 5.0, z + 0.8], [x + 0.4, s * 4.4, z - 2.6], 0.75, 0.6, bone);
    });
  }
  if (!fur) r.cone(V.add(back, [-3, 0, 4.2]), V.add(front, [0, 0, 5]), 1.1, 1.2, bone);   // spine
  for (let i = 0; i < (fur ? 0 : 5); i++) { const b = V.lerp(back, front, 0.05 + i * 0.22); const base = V.add(b, [0, 0, 4.6]); r.cone(base, V.add(base, [-2.4, 0, 3.6 - Math.abs(i - 2) * 0.6]), 1.1, 0.25, bone); }
  // tail: bony and spiked
  const t0 = V.add(back, [-5, 0, 1.5]), t1 = V.add(t0, [-4, 0, 2 + Math.sin(ph) * 1.5]), t2 = V.add(t1, [-3, Math.cos(ph) * 1.2, -1]);
  if (fur && look.bear) r.sph(V.add(back, [-5.5, 0, 2.5]), 1.8, skin);   // a bear's stub of a tail
  else if (fur) r.group(() => { r.cone(t0, t1, 1.8, 2.2, skin); r.cone(t1, t2, 2.2, 0.6, skin, { mf: p => V.dot(V.sub(p, t1), V.sub(t2, t1)) > 6 ? M.CLOTH_WHITE : 0 }); });
  else r.group(() => { r.cone(t0, t1, 1.4, 1.0, skin); r.cone(t1, t2, 1.0, 0.5, bone); });
  // legs (trot: diagonal pairs move together); bone caps at the joints and bone claws
  const legs = [[front, -3.6, 0, 1], [front, 3.6, Math.PI, 1], [back, -3.4, Math.PI, -1], [back, 3.4, 0, -1]];
  for (const [root, y, off, fr] of legs) {
    const hip = V.add(root, [fr > 0 ? 1 : 0, y, -1.5]);
    const p = ph + off, stride = moving ? 3.6 : 0;
    let foot = [hip[0] - stride * Math.cos(p) + (fr > 0 ? 0.5 : -0.5), y * 1.15, moving ? 2.2 * Math.max(0, Math.sin(p)) : 0];
    if (clip === 'attack' && fr > 0) foot = [hip[0] + 2, y * 1.15, 0];
    const L = ik(hip, V.add(foot, [0, 0, 1]), 5.8, 5.8, [-fr, 0, 0]);
    r.cone(hip, L.joint, 2.7, 2.0, skin); r.cone(L.joint, L.end, 2.0, 1.7, skin);
    if (!fur) r.sph(L.joint, 1.8, bone);
    r.ell(V.add(L.end, [1.2, 0, -0.4]), [2.6, 2.0, 1.1], skin);
    for (const c of [-1, 0, 1]) r.cone(V.add(L.end, [3, c * 1.1, -0.5]), V.add(L.end, [4.8, c * 1.4, -1]), 0.55, 0.15, bone, { noShadow: true });
  }
  // neck, collar and scarf
  const neck = V.add(front, [3.5, 0, 2.5]);
  const hd = V.add(front, [7.5, 0, 1.2 + headDrop]);
  const hr0 = r.p.length;   // head parts are scaled up about the head center below
  r.cone(neck, hd, 3.4, 2.8, skin);
  const cc = V.lerp(neck, hd, 0.35);
  if (!fur) r.ell(cc, [1.6, 4.4, 4.0], M.LEATHER, frameAlong(V.sub(hd, neck)));
  if (!fur) for (const a of [-0.9, 0, 0.9]) r.sph(V.add(cc, [0.9, Math.sin(a) * 4.3, -Math.cos(a) * 3.6]), 0.9, M.GOLD, { noShadow: true });
  if (fur) r.ell(V.add(front, [3.5, 0, 3]), [3.4, 5.4, 3.6], skin, null, { mf: p => p[2] < front[2] + 1 ? M.CLOTH_WHITE : 0 });   // a ruff of fur
  else r.group(() => {
    r.ell(V.add(front, [3.2, 0, 3.6]), [2.8, 5.0, 2.6], M.CLOTH_RED);
    for (const s of [-1, 1]) r.box(V.add(front, [2.6, s * 5.0, -0.4]), [1.4, 0.5, 2.6], M.CLOTH_RED, frameAlong([1, 0, 0], [0, -s * 0.25, 1]), { mf: p => p[2] < front[2] - 4 && hash(Math.round(p[0] * 1.5), 3, 1) < 0.5 ? M.MARK : 0 });
  });
  // skull head: bone cranium and snout, dark socket with a red eye, jaw with teeth
  const hb = fur ? skin : bone;
  r.ell(hd, [3.8, 3.3, 3.1], hb, null, { mf: p => { const q = V.sub(p, hd); return q[0] > 1.2 && (Math.abs(q[1]) - 1.8) ** 2 + (q[2] - 0.7) ** 2 < 1.4 ? M.DARK : 0; } });
  const snoutEnd = V.add(hd, [5.8, 0, -0.9]);
  r.cone(V.add(hd, [1.5, 0, -0.3]), snoutEnd, 2.3, 1.5, hb, { mf: p => p[0] > snoutEnd[0] - 1 && Math.abs(p[1]) < 0.7 && p[2] > snoutEnd[2] ? M.DARK : 0 });
  const jd = V.norm([Math.cos(jaw), 0, -Math.sin(jaw)]), j0 = V.add(hd, [0.8, 0, -2.2]);
  r.cone(j0, V.mad(j0, jd, 6), 1.6, 1.0, hb, { bias: -1 });
  r.box(V.lerp(j0, V.mad(j0, jd, 6), 0.55), [2.2, 1.1, 0.5], M.DARK, frameAlong(jd), { noShadow: true });
  for (let t = 0; t < 3; t++) for (const s of [-1, 1]) r.cone(V.add(hd, [2.4 + t * 1.3, s * 1.2, -2]), V.add(hd, [2.4 + t * 1.3, s * 1.1, -3]), 0.4, 0.15, M.BONE, { noShadow: true });
  for (const s of [-1, 1]) {
    r.sph(V.add(hd, [2.7, s * 1.9, 0.8]), 0.65, look.eye || M.EYE_RED, { noShadow: true });
    // horns sweep back, then up and forward like a bull's
    if (fur && look.bear) { r.sph(V.add(hd, [-0.8, s * 2.4, 2.6]), 1.4, skin); continue; }   // round ears
    if (fur && look.boar) { r.cone(V.add(hd, [4.6, s * 1.4, -1.4]), V.add(hd, [5.4, s * 2.6, 1.2]), 0.8, 0.2, M.BONE, { noShadow: true }); r.cone(V.add(hd, [-0.6, s * 2.2, 1.6]), V.add(hd, [-1.4, s * 3.4, 3.4]), 1.3, 0.3, skin); continue; }   // tusks, small ears
    if (fur) { r.cone(V.add(hd, [-0.8, s * 1.8, 2.2]), V.add(hd, [-1.6, s * 2.6, 6.4]), 1.6, 0.3, skin); continue; }   // pointed ears
    const a = V.add(hd, [-0.6, s * 2.2, 2]), b = V.add(hd, [-1.8, s * 4.8, 4.2]), c = V.add(hd, [0.6, s * 6.2, 6.8]), e = V.add(hd, [3.8, s * 5.6, 7.6]);
    r.group(() => { r.cone(a, b, 1.5, 1.3, bone); r.cone(b, c, 1.3, 0.9, bone); r.cone(c, e, 0.9, 0.3, bone); });
  }
  // a big skull reads at this size: scale every head part (cranium, snout, jaw, horns) 1.3x about the head
  const HK = 1.3, sc = q => V.add(hd, V.mul(V.sub(q, hd), HK));
  for (const q of r.p.slice(hr0)) {
    if (q.c) q.c = sc(q.c); if (q.a) { q.a = sc(q.a); q.b = sc(q.b); q.ra *= HK; q.rb *= HK; }
    if (q.r) q.r *= HK; if (q.rad) q.rad = V.mul(q.rad, HK); if (q.half) q.half = V.mul(q.half, HK);
    if (q.mf) { const f0 = q.mf; q.mf = (p, n) => f0(V.add(hd, V.mul(V.sub(p, hd), 1 / HK)), n); }
  }
  if (clip === 'death') tipRig(r, [0, 0, 0], 0, 1.45 * [0, 0.2, 0.55, 0.9, 1, 1][f], [0, 0.5, 1.5, 2.8, 3.4, 3.6][f]);
  if (look.scale && look.scale !== 1) scaleRig(r, look.scale);
  return r;
}

// ---------------------------------------------------------------- spider
// ---------------------------------------------------------------- the ogre warlord (forest boss)
// A big chibi ogre: grey-green hide, round belly, tusked underbite, a top-knot, leather straps
// with a skull buckle, and a huge spiked club. Swings like the hero (posed heavy keys).
const OGRE_B = { hipH: 12, thigh: 6.4, shin: 6, ankle: 1.4, spine: 9, shW: 8.4, shZ: 3, neck: 10.5, upper: 7, fore: 6.5, hipW: 4, stride: 5, lift: 2.4, duty: 0.55, bob: 0.8, sway: 0.6, runLean: 0.1, counter: 0.1, stance: 1.5 };
function ogreRig(look, st) {
  const B = OGRE_B, J = bipedJoints(B, st), r = new Rig(), { fwd, sideR, up } = J, skin = M.OGRE;
  for (const [hip, knee, ank] of [[J.hipL, J.kneeL, J.ankL], [J.hipR, J.kneeR, J.ankR]]) {
    r.cone(hip, knee, 3.4, 3.0, skin); r.cone(knee, ank, 3.0, 2.6, skin);
    r.ell(V.add(ank, [2.2, 0, -0.8]), [3.8, 2.8, 1.6], M.LEATHER);
  }
  r.group(() => {   // belly and chest as one mass
    r.ell(V.mad(J.pelvis, up, 2), [6.4, 7.4, 6], skin);
    r.ell(V.mad(J.chest, up, 0.6), [5.6, 8.2, 5.4], skin, frameAlong(fwd, up));
  });
  const belt = V.mad(J.pelvis, up, 0.5);
  r.ell(belt, [6.8, 7.8, 1.5], M.LEATHER, frameAlong(fwd, up));
  skullAt(r, V.mad(belt, fwd, 6.6), fwd, sideR, up, M.BONE, M.DARK, 0, 0.75);
  r.box(V.add(V.mad(J.pelvis, fwd, 5.5), V.mul(up, -3.5)), [0.5, 3.6, 3.2], M.LEATHER, frameAlong(fwd, up));
  r.cone(V.add(V.mad(J.chest, up, 4), V.mul(sideR, -6)), V.add(V.mad(J.pelvis, up, 1), V.mul(sideR, 5)), 1.0, 1.0, M.LEATHER);   // strap
  for (const [sh, sd] of [[J.shL, -1], [J.shR, 1]]) {   // shoulder pads with spikes
    const c = V.mad(sh, up, 1.2);
    r.ell(c, [4.2, 4.2, 3], M.LEATHER, frameAlong(fwd, up));
    r.cone(V.mad(c, up, 2), V.add(V.mad(c, up, 5.5), V.mul(sideR, sd * 1.5)), 1.2, 0.2, M.BONE);
  }
  // arms: the club in the right hand on the posed swing plane; the left hand a big fist
  const sw = atkIndex(st.clip) >= 0 ? st.key : null, list = sw ? SWINGS.heavy : null;
  const pivot = V.add(V.add(J.chest, V.mul(sideR, 3.5)), V.add(V.mul(up, 4), V.mul(fwd, 1)));
  const U = V.norm(V.add(V.mul(up, Math.cos(0.22)), V.mul(sideR, Math.sin(0.22)))), inPlane = a => V.norm(V.add(V.mul(fwd, Math.cos(a)), V.mul(U, Math.sin(a))));
  let handR, bd;
  if (sw) { handR = V.mad(pivot, inPlane(sw.a), (sw.r || 6.5) * 1.3); bd = inPlane(sw.a + (sw.ck || 0)); }
  else { handR = V.add(V.add(J.shR, V.mul(fwd, 3 + J.swingArm * 1.5)), V.add(V.mul(up, -9), V.mul(sideR, 3))); bd = V.norm(V.add(V.add(V.mul(fwd, 0.5), V.mul(up, 0.75)), V.mul(sideR, 0.3))); }
  if (st.clip === 'death') { handR = V.add(J.shR, [3, 3, -11]); bd = V.norm([1, 0.4, -0.6]); }
  const handL = st.clip === 'death' ? V.add(J.shL, [2, -3, -10]) : V.add(V.add(J.shL, V.mul(fwd, 4 - J.swingArm * 2)), V.add(V.mul(up, -9), V.mul(sideR, -2)));
  for (const [sh, hand, s] of [[J.shR, handR, 1], [J.shL, handL, -1]]) {
    const a = armTo(J, sh, hand, B, s);
    r.cone(sh, a.el, 2.8, 2.4, skin); r.cone(a.el, a.hand, 2.4, 2.2, skin); r.sph(a.hand, 2.7, skin);
    r.cyl(V.lerp(a.el, a.hand, 0.3), V.lerp(a.el, a.hand, 0.7), 2.6, M.LEATHER);   // bracers
  }
  // club: a thick haft swelling into a studded head
  const g = handR;
  r.cone(V.mad(g, bd, -3), V.mad(g, bd, 12), 1.4, 3.4, M.WOOD);
  for (let k = 0; k < 7; k++) { const a = k * 2.4, t = 7 + (k % 3) * 2, ax = V.norm(V.add(V.mul(V.cross(bd, up), Math.cos(a)), V.mul(V.cross(bd, V.norm(V.cross(bd, up))), Math.sin(a)))); const b = V.mad(V.mad(g, bd, t), ax, 2.8); r.cone(b, V.mad(b, ax, 2.4), 0.9, 0.2, M.IRON, { noShadow: true }); }
  if (sw && sw.smear && st.prev) smearArc(r, pivot, fwd, U, st.prev.a + (st.prev.ck || 0), sw.a + (sw.ck || 0), 8, 22);
  // head: big, a heavy brow over small yellow eyes, an underbite with two tusks, a top-knot
  const hd = J.head, h0 = r.p.length;
  r.ell(hd, [4.6, 4.8, 4.2], skin, frameAlong(fwd, up), { mf: p => { const q = V.sub(p, hd), f2 = V.dot(q, fwd), s2 = Math.abs(V.dot(q, sideR)), z2 = V.dot(q, up); if (f2 > 2.4 && Math.abs(s2 - 1.7) < 0.55 && Math.abs(z2 - 0.4) < 0.5) return M.EYE_YEL; if (f2 > 2.4 && Math.abs(z2 - 1.3) < 0.35 && s2 < 3) return M.DARK; if (f2 > 3 && z2 < -1.6 && z2 > -2.6 && s2 < 2.2) return M.DARK; return 0; } });
  r.ell(V.add(V.mad(hd, fwd, 2.4), V.mul(up, -2.4)), [2.6, 3.8, 1.8], skin, frameAlong(fwd, up));   // jaw
  for (const s of [-1, 1]) {
    const b = V.add(V.add(V.mad(hd, fwd, 4.2), V.mul(sideR, s * 1.8)), V.mul(up, -2.2));
    r.cone(b, V.add(b, V.add(V.mul(up, 2.6), V.mul(fwd, 0.4))), 0.8, 0.2, M.BONE, { noShadow: true });
    r.cone(V.add(V.mad(hd, up, 0.6), V.mul(sideR, s * 4.2)), V.add(V.add(V.mad(hd, up, 1.6), V.mul(sideR, s * 6.6)), V.mul(fwd, -1)), 1.4, 0.3, skin);   // ears
  }
  r.cone(V.add(V.mad(hd, up, 3.6), V.mul(fwd, -1)), V.add(V.mad(hd, up, 8), V.mul(fwd, -3)), 1.6, 0.4, M.HAIR);   // top-knot
  bigHead(r, h0, hd, 1.2);
  if (st.clip === 'death') deathTip(r, B, st.f, -1);
  if (look.scale && look.scale !== 1) scaleRig(r, look.scale);
  return r;
}
// ---------------------------------------------------------------- shroomling and wraith (round 16)
// a walking mushroom: stubby legs and arms, a huge spotted cap for a head, small dark eyes
const SHROOM_B = { hipH: 6, thigh: 3.4, shin: 3, ankle: 0.8, spine: 4, shW: 3.4, shZ: 1, neck: 6.5, upper: 3, fore: 2.8, hipW: 1.8, stride: 3.2, lift: 2, duty: 0.45, bob: 0.6, sway: 0.3, runLean: 0.05, counter: 0.15 };
function shroomRig(look, st) {
  const B = SHROOM_B, J = bipedJoints(B, st), r = new Rig(), { fwd, sideR, up } = J, stem = M.CLOTH_WHITE, cap = look.purple ? M.CLOTH_PURPLE : M.CLOTH_RED;
  for (const [hip, knee, ank] of [[J.hipL, J.kneeL, J.ankL], [J.hipR, J.kneeR, J.ankR]]) { r.cone(hip, knee, 1.4, 1.3, stem); r.cone(knee, ank, 1.3, 1.2, stem); r.ell(V.add(ank, [1, 0, -0.3]), [1.8, 1.3, 0.8], M.WAX); }
  r.group(() => { r.ell(J.pelvis, [2.8, 3, 2.6], stem); r.cone(J.pelvis, V.mad(J.chest, up, 3), 3.0, 2.6, stem); });
  const sw = st.key || null, ext = st.clip === 'attack' && sw ? (sw.hit ? 1 : sw.a > 0.8 ? -0.5 : 0.3) : 0;
  for (const [sh, s] of [[J.shR, 1], [J.shL, -1]]) {
    const hand = V.add(V.add(sh, V.mul(fwd, 2 + ext * 3 + s * J.swingArm)), V.add(V.mul(up, -3 + ext * 1.5), V.mul(sideR, s * 1.2)));
    const a = armTo(J, sh, hand, B, s); r.cone(sh, a.el, 1.0, 0.9, stem); r.cone(a.el, a.hand, 0.9, 0.8, stem); r.sph(a.hand, 1.1, stem);
  }
  const hd = J.head, h0 = r.p.length;
  r.ell(V.mad(hd, up, -1.6), [3, 3, 2.4], stem, frameAlong(fwd, up), { mf: p => { const q = V.sub(p, hd), f2 = V.dot(q, fwd), s2 = Math.abs(V.dot(q, sideR)), z2 = V.dot(q, up); return f2 > 1.6 && Math.abs(s2 - 1.1) < 0.45 && Math.abs(z2 + 1.4) < 0.6 ? M.EYE : 0; } });
  r.ell(V.mad(hd, up, 0.8), [5.4, 5.4, 3.2], cap, frameAlong(fwd, up), { mf: p => { const q = V.sub(p, hd); return V.dot(q, up) > 0.2 && hash(Math.floor(V.dot(q, fwd) * 0.8 + 9), Math.floor(V.dot(q, sideR) * 0.8 + 9), 41) < 0.22 ? M.CLOTH_WHITE : 0; } });
  bigHead(r, h0, hd, 1.25);
  if (st.clip === 'death') deathTip(r, B, st.f, -1);
  return r;
}
// a wraith: a hooded, legless robe that floats and sways, glowing eyes in the dark of the hood,
// long clawed hands reaching out on the strike
function wraithRig(look, st) {
  const r = new Rig(), { clip, f } = st, robe = M.CLOTH_PURPLE;
  const bob = clip === 'walk' ? Math.sin(f / 8 * Math.PI * 2) * 1.2 : clip === 'idle' ? Math.sin(f * Math.PI / 2) * 0.8 : 0;
  const sw = st.key || null, reach = clip === 'attack' && sw ? (sw.hit ? 1 : sw.a > 0.8 ? -0.6 : 0.4) : 0;
  const lean = clip === 'walk' ? 0.25 : reach * 0.2, top = [lean * 4, 0, 22 + bob], base = [-2 - lean * 3, 0, 5 + bob];
  r.group(() => { r.cone(base, top, 6.2, 3.4, robe, { mf: p => (p[2] - base[2]) < 2 && hash(Math.floor(Math.atan2(p[1], p[0]) * 5), 1, 3) < 0.5 ? M.CLOTH_DARK : 0 }); });
  for (const s of [-1, 1]) {   // tattered hem points
    const a = [base[0] - 1, s * 4, base[2] + 1]; r.cone(a, [a[0] - 2, s * 5, a[2] - 4.5], 1.4, 0.2, robe);
  }
  const hd = V.add(top, [1.2, 0, 3.6]);
  r.ell(hd, [4.4, 4.2, 4.6], robe, null, { mf: p => { const q = V.sub(p, hd); if (q[0] > 2.4 && Math.abs(q[2] + 0.3) < 2.4 && Math.abs(q[1]) < 2.6) return (Math.abs(Math.abs(q[1]) - 1.2) < 0.5 && Math.abs(q[2] - 0.2) < 0.5) ? M.FUNGUS2 : M.DARK; return 0; } });
  r.cone(V.add(hd, [-2, 0, 3]), V.add(hd, [-6, 0, 5.5]), 2, 0.3, robe);   // hood tip
  for (const s of [-1, 1]) {
    const sh = V.add(top, [0, s * 4, -2]), hand = V.add(sh, [3 + reach * 6, s * 2, -5 + reach * 3]);
    r.cone(sh, hand, 1.4, 1.0, robe);
    for (let k = -1; k <= 1; k++) r.cone(hand, V.add(hand, [2.4, s * 0.5 + k * 0.7, -1 + k * 0.4]), 0.45, 0.1, M.OLDBONE, { noShadow: true });
  }
  if (clip === 'death') tipRig(r, [0, 0, 0], 0, 0, [0, 3, 7, 11, 14, 16][f]);   // sinks into the floor
  return r;
}
// ---------------------------------------------------------------- the treant elder (autumn boss)
// A walking tree: a thick bark trunk for a body, root legs, branch arms with twig claws, a knot-hole
// face with glowing eyes, and a crown of autumn leaves. Swings its branch like a club.
const TREANT_B = { hipH: 10, thigh: 5.5, shin: 5, ankle: 1.2, spine: 12, shW: 7.5, shZ: 4, neck: 9, upper: 7.5, fore: 7, hipW: 3.6, stride: 4, lift: 2, duty: 0.6, bob: 0.6, sway: 0.5, runLean: 0.05, counter: 0.1 };
function treantRig(look, st) {
  const B = TREANT_B, J = bipedJoints(B, st), r = new Rig(), { fwd, sideR, up } = J, bark = M.BARK;
  for (const [hip, knee, ank] of [[J.hipL, J.kneeL, J.ankL], [J.hipR, J.kneeR, J.ankR]]) {
    r.cone(hip, knee, 3.2, 2.8, bark); r.cone(knee, ank, 2.8, 2.6, bark);
    for (const a of [-0.7, 0, 0.7]) r.cone(ank, V.add(ank, [Math.cos(a) * 4, Math.sin(a) * 3, -1]), 1.4, 0.4, bark);   // root toes
  }
  r.group(() => { r.cone(J.pelvis, V.mad(J.chest, up, 6), 6.5, 5.5, bark, { mf: p => Math.abs(Math.sin(Math.atan2(V.dot(V.sub(p, J.pelvis), sideR), V.dot(V.sub(p, J.pelvis), fwd)) * 7 + V.dot(V.sub(p, J.pelvis), up) * 0.3)) < 0.15 ? M.HAIR : 0 }); });
  const sw = atkIndex(st.clip) >= 0 ? st.key : null;
  const pivot = V.add(V.add(J.chest, V.mul(sideR, 3.5)), V.add(V.mul(up, 4), V.mul(fwd, 1)));
  const U = V.norm(V.add(V.mul(up, Math.cos(0.4)), V.mul(sideR, Math.sin(0.4)))), inPlane = a => V.norm(V.add(V.mul(fwd, Math.cos(a)), V.mul(U, Math.sin(a))));
  let handR = sw ? V.mad(pivot, inPlane(sw.a), (sw.r || 6.5) * 1.5) : V.add(V.add(J.shR, V.mul(fwd, 4 + J.swingArm * 2)), V.add(V.mul(up, -9), V.mul(sideR, 3)));
  const handL = V.add(V.add(J.shL, V.mul(fwd, 4 - J.swingArm * 2)), V.add(V.mul(up, -9), V.mul(sideR, -3)));
  if (st.clip === 'death') handR = V.add(J.shR, [3, 3, -11]);
  for (const [sh, hand, s] of [[J.shR, handR, 1], [J.shL, handL, -1]]) {
    const a = armTo(J, sh, hand, B, s);
    r.cone(sh, a.el, 2.6, 2.2, bark); r.cone(a.el, a.hand, 2.2, 1.6, bark);
    for (const k of [-1, 0, 1]) r.cone(a.hand, V.add(a.hand, V.add(V.mul(V.norm(V.sub(a.hand, a.el)), 3.5), V.mul(sideR, k * 1.4 * s))), 0.8, 0.2, bark);   // twig claws
  }
  if (sw && sw.smear && st.prev) smearArc(r, pivot, fwd, U, st.prev.a + (st.prev.ck || 0), sw.a + (sw.ck || 0), 8, 18);
  // face: two glowing eyes and a dark mouth in a knot on the upper trunk
  const face = V.add(V.mad(J.chest, up, 2.5), V.mul(fwd, 5.2));
  for (const s of [-1, 1]) r.sph(V.add(face, V.mul(sideR, s * 1.8)), 0.9, M.EYE_GRN, { noShadow: true });
  r.ell(V.add(V.mad(face, up, -2.6), V.mul(fwd, 0.3)), [0.6, 1.8, 0.9], M.DARK, frameAlong(fwd, up), { noShadow: true });
  // crown of leaves: separate clumps, autumn colors
  const top = V.mad(J.chest, up, 9), leaf = look.green ? M.LEAFM : M.AUTUMNM;
  for (const [f, s, z, rr] of [[0, 0, 3, 7], [-3, 4, 0, 5.5], [-3, -4, 0.5, 5.5], [3, 3, -1, 5], [2, -4, 1, 5], [-1, 0, 7, 5]]) r.sph(V.add(V.add(V.mad(top, fwd, f), V.mul(sideR, s)), V.mul(up, z)), rr, leaf);
  if (st.clip === 'death') deathTip(r, B, st.f, -1);
  if (look.scale && look.scale !== 1) scaleRig(r, look.scale);
  return r;
}
// a slime: one glossy jelly body that squashes on landing and stretches as it hops, with big eyes
function slimeRig(look, st) {
  const r = new Rig(), { clip, f } = st, mat = look.blue ? M.SLIME_B : M.SLIME, R0 = 6 * (look.big ? 1.5 : 1);
  let sq = 0, lift = 0, lean = 0;
  if (clip === 'walk') { const ph = f / 8 * Math.PI * 2; lift = Math.max(0, Math.sin(ph)) * 4.5; sq = 0.4 * Math.cos(ph * 2); }
  else if (clip === 'idle') sq = 0.12 * Math.sin(f * Math.PI / 2);
  else if (clip === 'attack') { const k = st.key; sq = k.a > 0.8 ? 0.55 : k.hit ? -0.4 : 0.1; lean = k.hit ? 3 : k.a > 0.8 ? -1 : 0; }
  else if (clip === 'hit') sq = 0.35;
  else if (clip === 'death') sq = 0.3 + f * 0.13;
  const c = [lean, 0, R0 * (1 - sq * 0.5) + lift];
  r.ell(c, [R0 * (1 + sq * 0.45), R0 * (1 + sq * 0.45), R0 * (1 - sq * 0.55)], mat, null, { mf: p => {
    const q = V.sub(p, c);
    if (q[0] > R0 * 0.5 && Math.abs(Math.abs(q[1]) - R0 * 0.32) < R0 * 0.14 && Math.abs(q[2] - R0 * 0.18) < R0 * 0.2) return q[2] > R0 * 0.3 ? M.CLOTH_WHITE : M.DARK;
    return 0;
  } });
  if (clip !== 'death') r.ell([lean * 0.7, 0, R0 * 0.35 + lift], [R0 * 0.55, R0 * 0.55, R0 * 0.3], mat, null, { noShadow: true });   // the denser core shows through low down
  if (look.scale && look.scale !== 1) scaleRig(r, look.scale);
  return r;
}
// farm animals (round 16): a woolly sheep with a dark face, and a round pink pig with a snout
function sheepRig(look, st) {
  const r = new Rig(), { clip, f } = st, walk = clip === 'walk', bob = walk && f % 2 ? 0.5 : 0, graze = clip === 'idle' && f % 4 >= 2;
  for (const [x, y] of [[3, 2], [3, -2], [-3, 2], [-3, -2]]) { const ph = walk ? Math.sin(f / 8 * Math.PI * 2 + (x * y > 0 ? 0 : Math.PI)) * 1.4 : 0; r.cone([x, y, 4], [x + ph, y, 0.3], 0.8, 0.7, M.DARK); }
  r.group(() => { for (const [x, y, z, rr] of [[0, 0, 7, 5], [3, 1.5, 7.5, 3.5], [-3, -1.5, 7.5, 3.5], [1, -2, 9, 3.2], [-2, 2, 9, 3.2]]) r.sph([x, y, z + bob], rr, M.CLOTH_WHITE); });
  const hd = graze ? [7, 0, 3.5] : [6.5, 0, 9 + bob];
  r.ell(hd, [2.6, 1.9, 2], M.HIDE, null, { mf: p => p[0] - hd[0] > 1.2 && Math.abs(Math.abs(p[1] - hd[1]) - 0.8) < 0.4 && Math.abs(p[2] - hd[2] - 0.5) < 0.4 ? M.DARK : 0 });
  for (const s of [-1, 1]) r.cone(V.add(hd, [-0.5, s * 1.6, 0.8]), V.add(hd, [-1.2, s * 3.2, 0.2]), 0.8, 0.3, M.HIDE);
  return r;
}
function pigRig(look, st) {
  const r = new Rig(), { clip, f } = st, walk = clip === 'walk', bob = walk && f % 2 ? 0.5 : 0;
  for (const [x, y] of [[3, 2], [3, -2], [-3, 2], [-3, -2]]) { const ph = walk ? Math.sin(f / 8 * Math.PI * 2 + (x * y > 0 ? 0 : Math.PI)) * 1.2 : 0; r.cone([x, y, 3], [x + ph, y, 0.3], 1.1, 0.9, M.FACE); }
  r.ell([0, 0, 5.5 + bob], [6, 4.2, 4], M.FACE, null, { bias: 1 });
  const hd = [6, 0, 6.5 + bob];
  r.sph(hd, 3, M.FACE, { bias: 1, mf: p => p[0] - hd[0] > 1.5 && Math.abs(Math.abs(p[1]) - 1) < 0.4 && p[2] - hd[2] > 0.6 ? M.DARK : 0 });
  r.cyl(V.add(hd, [2.4, 0, -0.6]), V.add(hd, [3.6, 0, -0.6]), 1.4, M.FACE, { mf: p => p[0] > hd[0] + 3.4 && Math.abs(Math.abs(p[1]) - 0.5) < 0.3 ? M.MOUTH : 0 });
  for (const s of [-1, 1]) r.cone(V.add(hd, [0, s * 1.8, 2.2]), V.add(hd, [1, s * 2.6, 3.8]), 1, 0.3, M.FACE);
  r.cone([-6, 0, 6 + bob], [-7.5, 0.8, 7.5 + bob], 0.5, 0.4, M.FACE);   // tail
  return r;
}
// a town chicken: white body, red comb, pecks while idle and trots on two thin legs
function chickenRig(look, st) {
  const r = new Rig(), { clip, f } = st, walk = clip === 'walk', peck = clip === 'idle' && f % 4 === 2;
  const bob = walk ? (f % 2 ? 0.6 : 0) : 0;
  for (const s of [-1, 1]) { const ph = walk ? Math.sin((f / 8) * Math.PI * 2 + (s > 0 ? Math.PI : 0)) * 1.6 : 0; r.cone([ph * 0.5, s * 1.3, 4], [ph, s * 1.3, 0.3], 0.6, 0.6, M.GOLD, { noShadow: true }); }
  r.group(() => { r.ell([0, 0, 6 + bob], [4.2, 3.2, 3.2], M.CLOTH_WHITE); r.cone([-3, 0, 6.5 + bob], [-5.5, 0, 10 + bob], 2.2, 0.8, M.CLOTH_WHITE); });
  const hd = peck ? [5, 0, 4] : [3.4, 0, 10 + bob];
  r.sph(hd, 2.3, M.CLOTH_WHITE, { mf: p => p[0] - hd[0] > 1 && Math.abs(Math.abs(p[1] - hd[1]) - 1.1) < 0.5 && Math.abs(p[2] - hd[2] - 0.4) < 0.5 ? M.DARK : 0 });
  r.cone(V.add(hd, [1.8, 0, 0]), V.add(hd, [3.6, 0, -0.4]), 0.8, 0.2, M.GOLD, { noShadow: true });
  r.ell(V.add(hd, [0.2, 0, 2.2]), [1.4, 0.6, 1.1], M.CLOTH_RED, null, { noShadow: true });
  r.ell(V.add(hd, [1.6, 0, -1.6]), [0.6, 0.5, 0.9], M.CLOTH_RED, null, { noShadow: true });
  return r;
}
function spiderRig(look, st) {
  const r = new Rig(), ch = look.chitin || M.CHITIN;
  const { clip, f } = st;
  let bob = 0, rear = 0, ph = 0, moving = false, curl = 0;
  if (clip === 'idle') bob = [0, -0.3, -0.4, -0.2][f % 4];
  if (clip === 'walk') { ph = f / 8 * Math.PI * 2; moving = true; bob = -0.4 * Math.abs(Math.sin(ph * 2)); }
  let strike = false;
  if (clip === 'attack') { const a = st.key.a; rear = a > 0.5 ? 1.6 : st.key.hit ? -0.3 : 0.5; strike = !!st.key.hit || st.key.mv > 0; }   // round 34: reared high, then driven down
  if (clip === 'hit') rear = -0.3;
  if (clip === 'death') curl = [0, 0.25, 0.55, 0.85, 1, 1][f];
  // the broodmother: low heavy body, long sprawling legs, red chevrons down the abdomen
  const brood = !!look.brood;
  const H = (brood ? 5.5 : 7) + rear * 2.5 - curl * (brood ? 3.5 : 4.5);
  const ceph = [3.5, 0, H + bob + rear * 1.5], abd = brood ? [-8, 0, H + 3.2 + bob - rear] : [-6.5, 0, H + 2.2 + bob - rear * 1];
  r.ell(abd, brood ? [9.2, 8, 6.8] : [7.2, 6.2, 5.8], ch, null, { mf: brood ? (p => {
    const q = V.sub(p, abd);
    if (q[2] < 1.5) return 0;
    const u = q[0], v = Math.abs(q[1]);
    if (v < 0.8 && u > -6.5 && u < 6.5) return M.MARKB;                                 // spine stripe
    for (const c of [3, -0.8, -4.6]) if (Math.abs((u - c) + v * 0.8) < 0.8 && v < 4) return M.MARKB;   // chevrons
    return 0;
  }) : (p => {   // pale skull marking on top of the abdomen
    const q = V.sub(p, abd);
    if (q[2] < 3) return 0;
    const u = q[0] + 1, v = q[1];
    return (u * u / 9 + v * v / 5 < 1 && !(Math.abs(Math.abs(v) - 1.2) < 0.6 && Math.abs(u - 0.4) < 0.6)) ? M.MARK : 0;
  }) });
  const hk = brood ? 1.35 : 1;   // the broodmother's head is bigger, with a heavier eye cluster and fangs
  r.ell(ceph, [4.4 * hk, 4.2 * hk, 3.2 * hk], ch);
  // eyes: a cluster of red beads on the front
  for (const [y, z, s] of [[-1, 0.8, 0.6], [1, 0.8, 0.6], [-2, 1.4, 0.45], [2, 1.4, 0.45], [-0.6, 1.8, 0.4], [0.6, 1.8, 0.4]]) r.sph(V.add(ceph, [3.7 * hk, y * hk, z * hk]), s * hk, M.EYE_RED, { noShadow: true });
  // fangs
  for (const s of [-1, 1]) r.cone(V.add(ceph, [3.6 * hk, s * 1.1 * hk, -1.2 * hk]), V.add(ceph, [4.6 * hk + rear, s * 0.7 * hk, -4 * hk + rear]), 0.8 * hk, 0.25, M.HORN);
  // legs: 4 per side, knees high; alternating tetrapod gait
  const ang = [0.55, 1.15, 1.85, 2.45];
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) {
    const a = ang[i], hip = V.add(ceph, [Math.cos(a) * 2.2 - 0.5, s * Math.sin(a) * 2.6, -0.4]);
    const grp = (i + (s > 0 ? 1 : 0)) % 2, p = ph + grp * Math.PI;
    const reach = (brood ? 24 : 17.5) - Math.abs(i - 1.5) * 1.2;
    let foot = [ceph[0] + Math.cos(a) * reach - 1.5 - (moving ? 2.4 * Math.cos(p) : 0), s * Math.sin(a) * reach, moving ? 1.8 * Math.max(0, Math.sin(p)) : 0];
    if (rear > 0.4 && i === 0) foot = [ceph[0] + 8, s * 6, 8 * rear];   // front legs raised, fangs bared
    if (rear > 1.2 && i === 1) foot = [ceph[0] + 11, s * 9, 5];
    if (strike && i === 0) foot = [ceph[0] + 13, s * 2.5, 0];   // driving the front legs into the target
    if (curl) foot = V.lerp(foot, [ceph[0] - 1, s * 3, H + 5], curl * 0.85);
    const L = brood ? ik(hip, foot, 17, 17, [0, s * 0.25, 1]) : ik(hip, foot, 10, 11, [0, s * 0.3, 1]);
    r.cone(hip, L.joint, brood ? 1.9 : 1.6, brood ? 1.6 : 1.3, ch); r.cone(L.joint, L.end, brood ? 1.6 : 1.3, 0.6, ch);
    r.sph(L.joint, brood ? 1.6 : 1.4, M.MARK);
  }
  if (look.scale && look.scale !== 1) scaleRig(r, look.scale);
  return r;
}

// ---------------------------------------------------------------- family table
// size: sprite canvas; swing: attack timing; looks: variants (materials, size, gear) of one body
const FAMILIES = {
  hero: { size: [72, 72, 36, 60], rig: heroRig, swing: e => weaponSwing(e.look), combo: (e, k) => weaponSwing(e.look, k) },
  skeleton: { size: [72, 78, 36, 55], gait: gaitFrameTiles(SKEL_B, 1.1), rig: skeletonRig, swing: e => e.look.weapon === 'bow' ? SWINGS.bow : e.look.lich ? SWINGS.cast : FEEL_OLD ? SWINGS.light : MON_SWINGS.chop },
  fallen: { size: [52, 48, 26, 40], gait: gaitFrameTiles(FALLEN_B), rig: fallenRig, swing: e => e.look.staff ? SWINGS.cast : FEEL_OLD ? SWINGS.claw : MON_SWINGS.pounce },
  hound: { size: [80, 64, 38, 50], rig: houndRig, swing: () => FEEL_OLD ? SWINGS.bite : MON_SWINGS.lunge },
  spider: { size: [80, 60, 40, 46], rig: spiderRig, swing: () => FEEL_OLD ? SWINGS.bite : MON_SWINGS.rear },
  chicken: { size: [28, 28, 14, 22], rig: chickenRig, swing: () => SWINGS.bite },
  sheep: { size: [36, 32, 18, 22], rig: sheepRig, swing: () => SWINGS.bite },
  pig: { size: [36, 30, 18, 20], rig: pigRig, swing: () => SWINGS.bite },
  slime: { size: [48, 44, 24, 32], gait: 0.13, rig: slimeRig, swing: () => SWINGS.bite },
  shroom: { size: [44, 48, 22, 36], gait: gaitFrameTiles(SHROOM_B), rig: shroomRig, swing: () => SWINGS.claw },
  wraith: { size: [56, 60, 28, 46], gait: 0.2, rig: wraithRig, swing: () => SWINGS.claw },
  treant: { size: [150, 160, 75, 132], gait: gaitFrameTiles(TREANT_B, 1.4), rig: treantRig, swing: () => SWINGS.heavy },
  ogre: { size: [140, 140, 70, 112], gait: gaitFrameTiles(OGRE_B, 1.5), rig: ogreRig, swing: () => SWINGS.heavy },
};
// Variants: same family, different look and stats. `kind` is what the roster ledger counts.
const MONSTERS = {
  skeleton: { family: 'skeleton', name: 'SKELETON', look: { weapon: 'sword', shield: true, armored: true }, hp: 14, dmg: [2, 5], speed: 26, reach: 1.25, xp: 12, chest: 22, shadow: 7 },
  archer: { family: 'skeleton', name: 'SKELETON ARCHER', look: { weapon: 'bow', bone: M.OLDBONE }, hp: 10, dmg: [2, 4], speed: 24, reach: 6.5, ranged: 'arrow', xp: 14, chest: 22, shadow: 7 },
  burning: { family: 'skeleton', name: 'BURNING DEAD', look: { weapon: 'sword', shield: false, helm: true, bone: M.OLDBONE, eye: M.FIREM }, hp: 24, dmg: [4, 8], speed: 30, reach: 1.25, xp: 30, chest: 22, shadow: 7, minLevel: 2 },
  fallen: { family: 'fallen', name: 'FALLEN ONE', look: {}, hp: 7, dmg: [1, 3], speed: 40, reach: 1.15, xp: 6, chest: 12, shadow: 5, pack: true },
  shaman: { family: 'fallen', name: 'FALLEN SHAMAN', look: { staff: true, hood: true, skin: M.SKIN }, hp: 9, dmg: [3, 6], speed: 28, reach: 6, ranged: 'firebolt', leader: true, xp: 16, chest: 12, shadow: 5 },
  hound: { family: 'hound', name: 'BONE HOUND', look: {}, hp: 16, dmg: [3, 6], speed: 52, reach: 1.35, xp: 18, chest: 12, shadow: 10 },
  lich: { family: 'skeleton', name: 'THE LICH', title: 'WHO DIED AND WOULD NOT STAY DEAD', look: { lich: true, eye: M.EYE_GRN, bone: M.OLDBONE, scale: 1.6, size: [124, 140, 62, 112] }, hp: 260, dmg: [8, 14], speed: 22, reach: 7, ranged: 'frostbolt', xp: 400, chest: 46, shadow: 11, unique: true, boss: 'lich', minLevel: 99 },
  skelking: { family: 'skeleton', name: 'SKELETON KING', title: 'LORD OF THE RESTLESS DEAD', look: { weapon: 'sword', shield: false, armored: true, crown: true, eye: M.FIREM, scale: 1.6, size: [124, 132, 62, 104] }, hp: 170, dmg: [9, 16], speed: 24, reach: 1.9, xp: 200, chest: 42, shadow: 11, unique: true, boss: 'king', minLevel: 99 },
  treant: { family: 'treant', name: 'TREANT ELDER', title: 'THE WOOD THAT WALKS', minLevel: 99, look: { scale: 1.4 }, hp: 170, dmg: [8, 14], speed: 18, reach: 2.3, xp: 190, chest: 54, shadow: 14, unique: true, boss: 'slam', minions: ['shroom', 'sporecap'], calls: 'THE ELDER WAKES THE MUSHROOMS' },
  warlord: { family: 'ogre', name: 'OGRE WARLORD', title: 'TYRANT OF THE DEEP WOODS', minLevel: 99, look: { scale: 1.5 }, hp: 140, dmg: [8, 14], speed: 22, reach: 2.1, xp: 160, chest: 46, shadow: 13, unique: true, boss: 'slam' },
  shroom: { family: 'shroom', name: 'SHROOMLING', look: {}, hp: 10, dmg: [2, 4], speed: 26, reach: 1.1, xp: 9, chest: 14, shadow: 5, pack: true, where: 'out' },
  sporecap: { family: 'shroom', name: 'SPORECAP', look: { purple: true }, hp: 16, dmg: [3, 6], speed: 24, reach: 1.15, xp: 16, chest: 14, shadow: 5, where: 'out', minLevel: 2 },
  wraith: { family: 'wraith', name: 'WRAITH', look: {}, hp: 18, dmg: [4, 8], speed: 34, reach: 1.3, xp: 26, chest: 26, shadow: 6, minLevel: 2 },
  slime: { family: 'slime', name: 'SLIME', look: {}, hp: 8, dmg: [1, 3], speed: 30, reach: 1.15, xp: 6, chest: 9, shadow: 7, pack: true, where: 'out' },
  blueslime: { family: 'slime', name: 'BIG BLUE SLIME', look: { blue: true, big: true }, hp: 30, dmg: [3, 7], speed: 24, reach: 1.4, xp: 30, chest: 14, shadow: 10, where: 'out', minLevel: 2 },
  bear: { family: 'hound', name: 'DIRE BEAR', look: { skin: M.BOAR, eye: M.EYE_RED, wolf: true, bear: true, scale: 1.55, size: [110, 90, 55, 66] }, hp: 46, dmg: [6, 11], speed: 40, reach: 1.7, charge: true, xp: 50, chest: 20, shadow: 15, where: 'out', minLevel: 4 },
  boar: { family: 'hound', name: 'BOAR', look: { skin: M.BOAR, eye: M.EYE_RED, wolf: true, boar: true }, hp: 20, dmg: [3, 6], speed: 48, reach: 1.35, charge: true, xp: 18, chest: 12, shadow: 10, where: 'out' },
  treasure: { family: 'fallen', name: 'TREASURE GOBLIN', look: { skin: M.GOBLIN, goblin: true, sack: true, unarmed: true, scale: 1.1 }, hp: 34, dmg: [0, 0], speed: 46, reach: 1, xp: 45, chest: 16, shadow: 6, flee: true, treasure: true, minLevel: 99 },
  gchief: { family: 'fallen', name: 'GOBLIN CHIEFTAIN', look: { skin: M.GOBLIN, goblin: true, chief: true, scale: 1.45, size: [76, 70, 38, 58] }, hp: 60, dmg: [5, 10], speed: 32, reach: 1.5, leader: true, xp: 70, chest: 22, shadow: 7, where: 'out', elite: true },
  gshaman: { family: 'fallen', name: 'GOBLIN SHAMAN', look: { skin: M.GOBLIN, goblin: true, staff: true }, hp: 9, dmg: [3, 6], speed: 30, reach: 6, ranged: 'firebolt', leader: true, xp: 16, chest: 12, shadow: 5, where: 'out' },
  brigand: { family: 'hero', name: 'BRIGAND', look: { team: 'tan', helm: 'cap', chest: 'chain', weapon: 'axe', shield: 'none', hair: 'brown', cape: 'red' }, hp: 22, dmg: [3, 7], speed: 30, reach: 1.35, xp: 24, chest: 18, shadow: 7, where: 'out' },
  wolf: { family: 'hound', name: 'WOLF', look: { skin: M.FUR, eye: M.EYE_YEL, wolf: true }, hp: 14, dmg: [2, 5], speed: 54, reach: 1.35, xp: 15, chest: 12, shadow: 10, pack: true, where: 'out' },
  // round 26: the diggers of the old mine: hunched, snouted, in a dented iron cap, swinging a pick, a lamp at the belt
  digger: { family: 'fallen', name: 'DIGGER', look: { skin: M.LEATHER, digger: true }, hp: 10, dmg: [2, 4], speed: 36, reach: 1.25, xp: 9, chest: 12, shadow: 5, pack: true, where: 'out' },
  // round 26 side-area leaders
  alpha: { family: 'hound', name: 'THE ALPHA', look: { skin: M.HIDE, eye: M.EYE_RED, wolf: true, scale: 1.45, size: [100, 84, 50, 62] }, hp: 70, dmg: [5, 9], speed: 50, reach: 1.6, xp: 80, chest: 14, shadow: 12, elite: true, leader: true, where: 'out' },
  banditchief: { family: 'hero', name: 'BANDIT CHIEF', look: { team: 'red', helm: 'horned', chest: 'brigandine', weapon: 'axe', shield: 'round', hair: 'brown', cape: 'red' }, hp: 80, dmg: [5, 10], speed: 30, reach: 1.4, xp: 90, chest: 24, shadow: 8, elite: true, leader: true, where: 'out' },
  goblin: { family: 'fallen', name: 'GOBLIN', look: { skin: M.GOBLIN, goblin: true }, hp: 9, dmg: [2, 4], speed: 38, reach: 1.15, xp: 8, chest: 12, shadow: 5, pack: true, where: 'out' },
  ghoulhound: { family: 'hound', name: 'HELL HOUND', look: { skin: M.FLESH, bone: M.OLDBONE, eye: M.FIREM, scale: 1.15 }, hp: 28, dmg: [5, 9], speed: 50, reach: 1.45, xp: 34, chest: 13, shadow: 11, minLevel: 2 },
  spider: { family: 'spider', name: 'CAVE SPIDER', look: { scale: 0.8 }, hp: 10, dmg: [2, 4], speed: 46, reach: 1.3, xp: 10, chest: 8, shadow: 11, pack: true },
  broodmother: { family: 'spider', name: 'BROODMOTHER', title: 'MOTHER OF A THOUSAND LEGS', look: { brood: true, scale: 1.15, size: [128, 84, 64, 60] }, hp: 60, dmg: [6, 12], speed: 34, reach: 1.9, xp: 90, chest: 12, shadow: 17, minLevel: 3, unique: true },
};
const lookKey = l => JSON.stringify(l);

// Sprites are cached per family/look/direction/clip/frame; poses only change on the 100 ms pose clock.
const spriteCache = new Map();
let spriteBuilds = 0;
function poseState(fam, ent, clip, f) {
  const st = { clip, f };
  const ai = atkIndex(clip);
  if (ai >= 0 || clip === 'shoot' || clip === 'volley' || clip === 'skyshot' || clip === 'cast') { const sw = ai > 0 ? FAMILIES[fam].combo(ent, ai) : FAMILIES[fam].swing(ent); st.key = sw[f]; st.prev = sw[f - 1]; }
  return st;
}
// Builds are budgeted per frame: past the budget, a missing pose falls back to the nearest cached
// frame (same direction) and is queued, so a crowd turning at once never stalls a frame.
const buildBudget = { ms: Infinity, used: 0 };
const fallbackOrder = { walk: ['walk', 'idle'], idle: ['idle'], attack: ['attack', 'idle'], attack2: ['attack2', 'attack', 'idle'], attack3: ['attack3', 'attack', 'idle'], attack4: ['attack4', 'attack', 'idle'], bash: ['bash', 'idle'], channel: ['channel', 'idle'], shoot: ['shoot', 'idle'], cast: ['cast', 'idle'], hit: ['hit', 'idle'], death: ['death'], go: ['go', 'walk', 'idle'], stop: ['stop', 'idle'], hook: ['hook', 'channel', 'idle'], spin: ['spin', 'attack', 'idle'], drink: ['drink', 'walk', 'idle'], fidget: ['fidget', 'idle'], pivot: ['pivot', 'stop', 'walk'], skid: ['skid', 'stop', 'idle'], vault: ['vault', 'stop', 'idle'], toss: ['toss', 'shoot', 'idle'], volley: ['volley', 'shoot', 'idle'], skyshot: ['skyshot', 'shoot', 'idle'], storm: ['storm', 'channel', 'idle'] };
// px: detail scale. Characters draw at SPX (2: twice the pixels, round 21); the world, the bag's
// paper doll and corpses baked into the floor use 1.
function getSprite(fam, look, dir, clip, f, ent, px = SPX) {
  const lk = fam === 'hero' ? heroKey(look) : lookKey(look);
  const k = `${fam}|${lk}|${dir}|${clip}|${f}|${px}`;
  let sp = spriteCache.get(k);
  if (!sp && buildBudget.used > buildBudget.ms && clip !== 'death') {
    // out of build time this frame: the same pose at world detail stands in (drawn doubled) while
    // the detail version builds in the background; it is far cheaper to build when nothing is cached
    if (px !== 1) {
      const lo = spriteCache.get(`${fam}|${lk}|${dir}|${clip}|${f}|1`);
      if (lo) { if (typeof warmQueue !== 'undefined') warmQueue.push([fam, look, dir, clip, f]); return lo; }
    }
    for (const c of fallbackOrder[clip] || ['idle']) for (let g = 0; g < 8; g++) {
      const q = spriteCache.get(`${fam}|${lk}|${dir}|${c}|${(f + g) % 8}|${px}`) || spriteCache.get(`${fam}|${lk}|${dir}|${c}|0|${px}`);
      if (q) { if (typeof warmQueue !== 'undefined') warmQueue.push([fam, look, dir, clip, f]); return q; }
    }
    if (px !== 1) { if (typeof warmQueue !== 'undefined') warmQueue.push([fam, look, dir, clip, f]); return getSprite(fam, look, dir, clip, f, ent, 1); }
  }
  if (!sp && look.tint) {   // a recolored variant: tint the base sprite instead of rendering again
    const { tint, ...base } = look;
    const b = getSprite(fam, base, dir, clip, f, ent, px);
    sp = tintSprite(b, tint); sp.px = b.px; spriteCache.set(k, sp);
    return sp;
  }
  if (!sp) {
    const t0 = performance.now();
    const F = FAMILIES[fam], [w, h, ax, ay] = look.size || F.size;
    const ex = ent || { look };
    const rig = F.rig(look, poseState(fam, ex, clip, f));
    if (px !== 1) scaleRig(rig, px);
    sp = renderRig(rig, yawOf(dir), Math.round(w * px), Math.round(h * px), Math.round(ax * px), Math.round(ay * px), px); sp.px = px;
    if (px !== 1) sp.z = null;   // detail-layer sprites are never lit per pixel, so they don't keep heights
    if (spriteCache.size > 2400) spriteCache.clear();
    spriteCache.set(k, sp); spriteBuilds++;
    buildBudget.used += performance.now() - t0;
  }
  return sp;
}
