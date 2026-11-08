'use strict';
// Enemy families: skeleton (biped, bones), fallen (small hunched biped), hound (quadruped),
// spider (eight legs). Each takes a `look` (the variant) and a pose state {clip, f, key, prev}.

// ---------------------------------------------------------------- skeleton
const SKEL_B = { hipH: 12.5, thigh: 6.4, shin: 5.8, ankle: 1.2, spine: 7, shW: 5.6, shZ: 3, neck: 10, upper: 6, fore: 5.5, hipW: 2.6, stride: 5.5, lift: 2.5, duty: 0.55, bob: 0.6, sway: 0.5, runLean: 0.1, counter: 0.14 };
// art B5: the Drowned Warden (secret boss): a huge hunched skeleton, long heavy arms reaching low
const WARDEN_B = { ...SKEL_B, hunch: 0.34, spine: 7.4, shW: 6.6, shZ: 3.4, neck: 8.6, upper: 7.6, fore: 7.2, hipW: 3.0 };
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
// art B5: the Drowned Warden's parts (only look.warden reaches these)
// moss grows on the upper faces of the long bones in patches measured along each bone (no swimming)
function wardenMoss(a, b, seed) {
  return { mf: (p, n) => {
    const d = V.sub(b, a), t = V.dot(V.sub(p, a), d) / V.dot(d, d);
    return n[2] > 0.25 && hash(Math.floor(t * 4), Math.round(seed * 100), 41) < 0.55 ? M.LEAFM : 0;
  } };
}
function wardenHelm(r, hd, fwd, sideR, up) {
  // an open helm of corroded iron, verdigris crusted over it: a dome riding above the sockets, a
  // ridge front to back, a riveted rim and a nose guard
  const hc = V.add(V.mad(hd, up, 2.5), V.mul(fwd, -0.6)), hf = frameAlong(fwd, up);
  const vg = p => { const q = V.sub(p, hc); return hash(Math.round(V.dot(q, fwd) * 0.7), Math.round(V.dot(q, sideR) * 0.7), Math.round(V.dot(q, up) * 0.7)) < 0.5 ? M.OGRE : 0; };   // verdigris patches
  r.group(() => {
    r.ell(hc, [4.3, 4.4, 3.3], M.HIDE, hf, { mf: vg });
    r.ell(V.mad(hc, up, 0.4), [4.4, 0.8, 3.2], M.OGRE, hf);
  });
  r.cyl(V.mad(hc, up, -1.2), V.mad(hc, up, -0.3), 4.7, M.OGRE, { mf: p => { const q = V.sub(p, hc), a = Math.atan2(V.dot(q, sideR), V.dot(q, fwd)), t = a * 2.2; return Math.abs(t - Math.round(t)) < 0.2 && V.dot(q, up) > -1.0 && V.dot(q, up) < -0.5 ? M.IRON : 0; } });
  r.box(V.add(V.mad(hc, fwd, 4.5), V.mul(up, -2.2)), [0.5, 0.65, 2.0], M.OGRE, hf);   // the nose guard
}
function wardenAnchor(r, g, bd, fwd, sideR, up) {
  // a big iron ship's anchor: ring and stock above the hand, a long shank, two curved arms ending in
  // spade flukes
  const w0 = V.add(sideR, V.mul(fwd, 0.4)), wide = V.norm(V.sub(w0, V.mul(bd, V.dot(w0, bd)))), A = M.SLATE;
  const top = V.mad(g, bd, -2.4);
  r.cyl(V.mad(top, wide, -0.3), V.mad(top, wide, 0.3), 1.5, A, { mf: p => { const q = V.sub(p, top); return V.len(V.sub(q, V.mul(wide, V.dot(q, wide)))) < 0.7 ? M.DARK : 0; } });   // the ring
  r.cone(V.add(V.mad(g, bd, -1.0), V.mul(wide, -2.8)), V.add(V.mad(g, bd, -1.0), V.mul(wide, 2.8)), 0.7, 0.7, A);   // the stock
  const cr = V.mad(g, bd, 11.5);
  r.group(() => {
    r.cone(V.mad(g, bd, -1.6), cr, 0.95, 1.15, A);
    for (const s of [-1, 1]) {
      const m0 = V.add(V.mad(cr, wide, s * 2.6), V.mul(bd, 0.2)), e0 = V.add(V.mad(cr, wide, s * 4.4), V.mul(bd, -2.4));
      r.cone(cr, m0, 1.1, 1.0, A); r.cone(m0, e0, 1.0, 0.85, A);
      const tip = V.add(V.mad(e0, wide, s * 1.0), V.mul(bd, -2.6));
      r.cone(V.mad(e0, bd, 0.6), tip, 1.7, 0.2, A);   // the fluke
    }
    r.sph(cr, 1.3, A);
  });
}
function wardenShield(r, h, fwd, sideR, up) {
  // a round wooden shield: planks, a thick iron rim, pale barnacles crusted on the face
  const n = V.norm(V.add(V.mul(fwd, 0.8), V.mul(sideR, -0.6))), ax = [n, V.norm(V.cross(up, n)), up], c = V.mad(h, n, 1.5);
  r.ell(c, [1.1, 6.6, 6.6], M.WOOD, ax, { mf: p => {
    const q = V.sub(p, c), u = V.dot(q, ax[1]), v = V.dot(q, ax[2]), d = Math.hypot(u, v);
    if (d > 5.6) return M.IRON;
    if (Math.abs(((u + 6) % 2.6) - 1.3) > 1.1) return M.HAIR;   // the gaps between planks
    return 0;
  } });
  for (const [u, v, k] of [[1.7, 2.1, 1.15], [3.0, 0.6, 0.95], [0.3, 3.4, 0.9], [-1.8, -1.6, 1.1], [-0.3, -3.0, 0.95], [2.5, -2.3, 0.9]]) {
    const b = V.add(V.mad(c, n, 1.0), V.add(V.mul(ax[1], u), V.mul(ax[2], v)));
    r.sph(b, k, M.RUIN, { bias: 1, mf: p => V.dot(V.sub(p, b), n) > k * 0.75 ? M.DARK : 0 });
  }
}
function wardenGear(r, J, st, aR, aL, bone) {
  const { fwd, sideR, up } = J, lf = frameAlong(fwd, up);
  // big corroded bronze pauldrons on both shoulders, moss on top, slime dripping off the rims
  for (const [sh, sd] of [[J.shR, 1], [J.shL, -1]]) {
    const pk = V.add(V.mad(sh, up, 1.2), V.mul(sideR, sd * 1.3)), so = V.norm(V.add(up, V.mul(sideR, sd * 0.55))), pf = frameAlong(fwd, so);
    const lame = V.add(V.mad(pk, up, -1.8), V.mul(sideR, sd * 1.7));
    const moss = p => { const q = V.sub(p, pk); return V.dot(q, so) > 2.0 && hash(Math.round(V.dot(q, fwd) * 0.6), Math.round(V.dot(q, sideR) * 0.6), 7) < 0.3 ? M.LEAFM : 0; };
    // (pass 5) corroded bronze: brown leather-toned plate with a dark rim and copper flecks (RUST read slate grey, AUTUMN alone read as pumpkins)
    const fleck = (p, c0) => { const q = V.sub(p, c0); return hash(Math.round(V.dot(q, fwd) * 1.1), Math.round(V.dot(q, sideR) * 1.1), Math.round(V.dot(q, up) * 1.1) + 3) < 0.22 ? M.AUTUMNM : 0; };
    r.ell(lame, [3.6, 3.3, 1.6], M.LEATHER, pf, { mf: p => V.dot(V.sub(p, lame), so) < -0.6 ? M.HAIR : fleck(p, lame) });
    r.ell(pk, [4.5, 4.3, 2.5], M.LEATHER, pf, { mf: p => moss(p) || (V.dot(V.sub(p, pk), so) < -1.0 ? M.HAIR : fleck(p, pk)) });
    for (const [f2, l] of [[1.6, 2.6], [-0.8, 3.6], [-2.6, 2.0]]) {   // slime drips
      const b0 = V.add(V.add(V.mad(lame, fwd, f2), V.mul(sideR, sd * 2.6)), V.mul(up, -0.6));
      r.cone(b0, V.mad(b0, up, -l), 0.9, 0.35, M.LEAFM, { noShadow: true });
    }
  }
  // a rope belt and a torn sea-green loincloth, front and back, ragged to the knees
  const be = V.mad(J.pelvis, up, 1.6);
  r.ell(be, [3.2, 4.6, 1.0], M.LEATHER, lf);
  for (const fs of [1, -1]) {
    const tc = V.add(V.mad(J.pelvis, fwd, fs * 2.8), V.mul(up, -2.2));
    r.group(() => {
      r.box(tc, [0.45, 3.2, 2.8], M.WATERM, lf);
      for (const sd of [-2.2, -0.8, 0.7, 2.1]) r.cone(V.add(V.mad(tc, up, -2.0), V.mul(sideR, sd)), V.add(V.add(V.mad(tc, up, -5.6 + Math.abs(sd) * 0.6 + (sd > 0 ? 0.8 : 0)), V.mul(sideR, sd * 1.1)), V.mul(fwd, fs * 0.3)), 1.0, 0.25, M.WATERM);
    });
  }
  // moss strands hanging from the ribs and the forearms
  for (const [p0, l] of [[V.add(V.mad(J.chest, up, -1.5), V.add(V.mul(fwd, 2.8), V.mul(sideR, -2.4))), 3.0], [V.add(V.mad(J.chest, up, -0.6), V.add(V.mul(fwd, 2.4), V.mul(sideR, 2.8))), 2.4], [V.lerp(aR.el, aR.hand, 0.45), 2.6], [V.lerp(aL.el, aL.hand, 0.4), 2.2]])
    r.cone(p0, V.mad(p0, up, -l), 0.95, 0.3, M.LEAFM, { noShadow: true });
}
function skeletonRig(look, st) {
  const wd = !!look.warden;   // art B5: the Drowned Warden
  const B = wd ? WARDEN_B : SKEL_B, J = bipedJoints(B, st), r = new Rig(), { fwd, sideR, up } = J;
  const bone = look.bone || M.BONE, eye = look.eye || M.EYE_RED;
  const tk = wd ? 1.5 : look.chunky ? 1.3 : look.burn ? 1.2 : 1;   // field variants (art A2) and the burning dead (a4): thicker bones, as the concepts draw them
  const sk = look.armored && !look.crown;   // art B2: the plain skeleton warrior (not the king), refined toward its concept
  const bw = !!look.bulwark;   // art B4: the Crypt Bulwark elite (kettle helm, steel pauldrons, bare-wood tower shield)
  const king = !!look.crown;   // art B4: the Skeleton King rebuilt to his concept (normal skull, plate, crimson cape)
  // the burning dead (art pass 1): scorched bands across the long bones, measured along each bone
  // so they ride with it and never swim between frames
  const charBand = (a, b, t0, t1) => wd ? wardenMoss(a, b, t0) : look.burn ? { mf: p => { const d = V.sub(b, a), t = V.dot(V.sub(p, a), d) / V.dot(d, d); return t > t0 && t < t1 ? M.IRON : 0; } } : undefined;
  if (!look.lich) for (const [hip, knee, ank, sd] of [[J.hipL, J.kneeL, J.ankL, 0], [J.hipR, J.kneeR, J.ankR, 1]]) {
    r.cone(hip, knee, 1.3 * tk, 1.0 * tk, bone, sd || wd ? charBand(hip, knee, sd ? 0.45 : 0.46, 0.75) : undefined); r.cone(knee, ank, 1.1 * tk, 0.9 * tk, bone, sd && !wd ? undefined : charBand(knee, ank, sd ? 0.21 : 0.2, 0.5));
    r.sph(knee, 1.4 * tk, bone); r.ell(V.add(ank, [1.4, 0, -0.6]), [2.4 * tk, 1.2 * tk, 0.8 * tk], bone);
  }
  r.ell(J.pelvis, [2.6, 4.0, 2.0], bone);
  r.cone(J.pelvis, V.mad(J.chest, up, 3.5), 1.0, 1.1, bone);
  // ribcage: separate curved rib bars over a dark hollow, so the gaps read as gaps
  const rc = V.mad(J.chest, up, 0.4);
  r.ell(V.mad(rc, fwd, 0.6), [2.0, 3.0, 3.6], look.burn ? M.FIREM : M.DARK, frameAlong(fwd, up), { noShadow: true });   // the burning dead: embers inside the ribs
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
    if (st.clip !== 'shoot') { handL = V.add(V.add(J.shL, V.mul(fwd, 5)), V.add(V.mul(up, -7), V.mul(sideR, -2.5))); handR = V.add(V.add(J.shR, V.mul(fwd, 2)), V.mul(up, -9)); }   // (b2 pass 2) the bow held out from the body
  } else if (look.lich) {
    // the lich: staff upright in the right hand, raised high to cast (the cast swing's a: 0 -> 1.2);
    // the off hand claws forward, open, as the spell is loosed
    const a = st.clip === 'cast' && sw ? sw.a : 0;
    handR = V.add(V.add(J.shR, V.mul(fwd, 3 + a * 2.5)), V.add(V.mul(up, -6 + a * 7), V.mul(sideR, 2.5)));
    bd = V.norm(V.add(V.mul(fwd, 0.1 + a * 0.25), up));
    handL = a > 0.6 ? V.add(V.add(J.shL, V.mul(fwd, 8)), V.mul(up, -1)) : V.add(V.add(J.shL, V.mul(fwd, 4 + J.swingArm)), V.add(V.mul(up, -6), V.mul(sideR, -1)));
  } else if (look.weapon === 'crossbow') {
    // the grave crossbowman: stock tucked at the right hip, the left hand under the fore-end; it
    // lifts the bow to the shoulder to aim (the shoot swing's a: 0 -> 1) and holds it level to loose
    const aim = st.clip === 'shoot' && sw ? Math.min(1, sw.a) : 0;
    handR = V.add(V.add(J.shR, V.mul(fwd, 4.5 + aim * 1.5)), V.add(V.mul(up, -7 + aim * 5.5), V.mul(sideR, -0.5)));
    handL = V.add(V.add(J.shL, V.mul(fwd, 8 + aim * 2)), V.add(V.mul(up, -6 + aim * 5.5), V.mul(sideR, 2.5)));
    bd = V.norm(V.add(fwd, V.mul(sideR, -0.12)));
  } else if (st.clip === 'attack') {
    const F = fwd, U = V.norm(V.add(V.mul(up, 0.8), V.mul(sideR, 0.6))), piv = V.add(V.mad(J.chest, sideR, 2), V.mul(up, 4));
    const ba = sw.a + (sw.ck || 0);   // blade cocked past the arm, as the hero's
    bd = V.norm(V.add(V.mul(F, Math.cos(ba)), V.mul(U, Math.sin(ba))));
    handR = V.mad(piv, V.norm(V.add(V.mul(F, Math.cos(sw.a)), V.mul(U, Math.sin(sw.a)))), (sw.r || 7) * 0.85);
    if (sw.smear && st.prev) smearArc(r, piv, F, U, st.prev.a + (st.prev.ck || 0), ba, 9, 18);
    handL = V.add(V.add(J.shL, V.mul(fwd, 5)), V.mul(up, -6));
  } else if (wd) {
    // (b5) the warden: the anchor hangs from the right hand by the shank, low at his side, its
    // crown dragging by the foot; the shield held low and forward in the left
    handR = V.add(V.add(J.shR, V.mul(fwd, 2.4 + J.swingArm * 1.2)), V.add(V.mul(up, -11.5), V.mul(sideR, 2.0)));
    bd = V.norm(V.add(V.add(V.mul(fwd, 0.25), V.mul(up, -1)), V.mul(sideR, 0.12)));
  } else if (look.crown) {
    // (b4) the king, as the concept: the broad sword held low at his right side, point toward the
    // floor; the left hand raised beside the head, fingers clawed
    handR = V.add(V.add(J.shR, V.mul(fwd, 2.5 + J.swingArm * 0.6)), V.add(V.mul(up, -8.6), V.mul(sideR, 2.2)));
    handL = V.add(V.add(J.shL, V.mul(fwd, 3.2 - J.swingArm * 0.4)), V.add(V.mul(up, 0.6), V.mul(sideR, -3.6)));
    bd = V.norm(V.add(V.add(V.mul(fwd, 0.55), V.mul(up, -1)), V.mul(sideR, 0.18)));
  } else if (look.armored) {
    // armored warrior's guard (mock-up): long blade held low across the front, shield up
    handR = V.add(V.add(J.shR, V.mul(fwd, 5.5 + J.swingArm)), V.add(V.mul(up, -7.5), V.mul(sideR, 1.5)));
    handL = V.add(V.add(J.shL, V.mul(fwd, 5.5 - J.swingArm * 1.5)), V.add(V.mul(up, -4), V.mul(sideR, -1)));
    bd = V.norm(V.add(V.add(V.mul(fwd, 0.6), V.mul(up, -0.4)), V.mul(sideR, -0.7)));
  } else if (look.burn) {
    // the burning dead (a4): blade held low and forward, point dipping toward the floor; the off
    // hand reaches out, clawed, as the concept draws it
    handR = V.add(V.add(J.shR, V.mul(fwd, 4.5 + J.swingArm)), V.add(V.mul(up, -7.5), V.mul(sideR, 1.5)));
    handL = V.add(V.add(J.shL, V.mul(fwd, 4.5 - J.swingArm * 1.5)), V.add(V.mul(up, -5.5), V.mul(sideR, -1.5)));
    bd = V.norm(V.add(V.add(V.mul(fwd, 0.85), V.mul(up, -0.4)), V.mul(sideR, 0.1)));
  } else {
    // guard: sword raised beside the head, shield forward
    handR = V.add(V.add(J.shR, V.mul(fwd, 2 + J.swingArm)), V.add(V.mul(up, 1.5), V.mul(sideR, 2.5)));
    handL = V.add(V.add(J.shL, V.mul(fwd, 5.5 - J.swingArm * 1.5)), V.add(V.mul(up, -5), V.mul(sideR, -0.5)));
    bd = V.norm(V.add(V.add(V.mul(fwd, 0.15), V.mul(up, 1)), V.mul(sideR, 0.15)));
  }
  const twoHand = look.weapon === 'spear' || look.weapon === 'axe';
  if (twoHand && st.clip !== 'attack' && st.clip !== 'death') {
    // guard: the haft held low across the body in both hands, the head forward and to the left
    handR = V.add(V.add(J.shR, V.mul(fwd, 4.5 + J.swingArm)), V.add(V.mul(up, look.weapon === 'spear' ? -7.5 : -8.5), V.mul(sideR, look.weapon === 'spear' ? 1.5 : 0.5)));
    bd = look.weapon === 'spear' ? V.norm(V.add(V.add(V.mul(fwd, 0.55), V.mul(up, 0.5)), V.mul(sideR, -0.8))) : V.norm(V.add(V.add(V.mul(fwd, 0.65), V.mul(up, 0.5)), V.mul(sideR, -0.65)));   // (b2 pass 4) head raised to the shoulder
  }
  if (twoHand) handL = V.mad(handR, bd, look.weapon === 'spear' ? 6.5 : 5);   // the off hand further up the haft
  if (look.weapon === 'mace' && st.clip !== 'attack') {   // the tomb guard: mace low at its side, shield up
    handR = V.add(V.add(J.shR, V.mul(fwd, 3 + J.swingArm)), V.add(V.mul(up, -8), V.mul(sideR, 1.5)));
    bd = V.norm(V.add(V.add(V.mul(fwd, 0.7), V.mul(up, -0.45)), V.mul(sideR, 0.15)));
  }
  if (look.towerShield) handL = V.add(V.add(J.shL, V.mul(fwd, 5.5)), V.add(V.mul(up, -4.5), V.mul(sideR, -1)));
  if (bw) handL = V.add(V.add(J.shL, V.mul(fwd, 4.8)), V.add(V.mul(up, -5.0), V.mul(sideR, -2.0)));   // (b4) the bulwark's shield held out at its left side
  if (wd) handL = V.add(V.add(J.shL, V.mul(fwd, 6.0 - (st.clip === 'walk' ? J.swingArm : 0))), V.add(V.mul(up, -8.5), V.mul(sideR, -1.6)));   // (b5) the warden's shield low and forward
  const aR = armTo(J, J.shR, handR, B, 1), aL = armTo(J, J.shL, handL, B, -1);
  for (const a of [aR, aL]) {
    const sh = a === aR ? J.shR : J.shL;
    r.cone(sh, a.el, 1.1 * tk, 0.9 * tk, bone, a === aL || wd ? charBand(sh, a.el, a === aR ? 0.31 : 0.3, 0.65) : undefined); r.cone(a.el, a.hand, 0.9 * tk, 0.8 * tk, bone, a === aR || wd ? charBand(a.el, a.hand, a === aR ? 0.15 : 0.16, 0.5) : undefined); r.sph(a.hand, 1.2 * tk, bone);
  }
  if (look.weapon === 'bow') {
    const c = aL.hand, ax = frameAlong(fwd, up);
    const top = V.add(V.mad(c, up, 9.5), V.mul(fwd, -2.6)), bot = V.add(V.mad(c, up, -9.5), V.mul(fwd, -2.6));
    const tT = V.add(V.mad(top, up, 1.2), V.mul(fwd, 1.1)), tB = V.add(V.mad(bot, up, -1.2), V.mul(fwd, 1.1));   // (b2) longer, with recurved tips
    r.group(() => { r.cone(c, top, 1.0, 0.65, M.WOOD); r.cone(c, bot, 1.0, 0.65, M.WOOD); r.cone(top, tT, 0.65, 0.4, M.WOOD); r.cone(bot, tB, 0.65, 0.4, M.WOOD); });
    r.cone(V.mad(c, up, -1.2), V.mad(c, up, 1.2), 1.2, 1.2, M.LEATHER);   // the grip
    const pull = st.clip === 'shoot' ? aR.hand : V.add(c, V.mul(fwd, -2.2));
    r.cone(top, pull, 0.3, 0.3, M.BONE, { noShadow: true }); r.cone(pull, bot, 0.3, 0.3, M.BONE, { noShadow: true });
    if (st.clip === 'shoot' && sw.a > 0.5) r.cone(aR.hand, V.mad(aR.hand, fwd, 11), 0.35, 0.35, M.WOOD);
    void ax;
    // (b2) a leather quiver slung across the back, fletched arrows over the right shoulder, and a bracer on the bow arm
    const qa = V.norm(V.add(V.add(up, V.mul(sideR, 0.45)), V.mul(fwd, -0.2))), qc = V.add(V.mad(J.chest, fwd, -3.4), V.mul(up, -0.5));
    r.cone(V.mad(qc, qa, -4.2), V.mad(qc, qa, 3.2), 1.7, 2.0, M.LEATHER);
    for (const [u, v] of [[-0.7, -0.5], [0.4, 0.6], [-0.1, -1.3]]) { const b0 = V.add(V.mad(qc, qa, 3.0), V.add(V.mul(fwd, u), V.mul(sideR, v))); r.cone(b0, V.mad(b0, qa, 2.6), 0.4, 0.4, M.WOOD, { noShadow: true }); r.cone(V.mad(b0, qa, 2.4), V.mad(b0, qa, 4.4), 0.8, 0.35, M.CLOTH_RED, { noShadow: true }); }   // (pass 2) red fletching
    r.cyl(V.lerp(aL.el, aL.hand, 0.25), V.lerp(aL.el, aL.hand, 0.8), 1.35, M.LEATHER);
    r.cone(J.shR, qc, 0.5, 0.5, M.LEATHER, { noShadow: true });   // the strap
  } else if (look.weapon === 'crossbow') {
    // a wooden stock along the aim, a steel prod across its front with a string back to the nut,
    // and a bolt laid in the groove
    // (a4) bigger: a longer, thicker stock and a wide prod curving back in two bends
    const g = aR.hand, across = V.norm(V.cross(up, bd)), nose = V.mad(g, bd, 10.5);
    r.group(() => { r.box(V.mad(g, bd, 4), [7.2, 1.0, 1.1], M.WOOD, [bd, across, up]); r.box(V.add(V.mad(g, bd, -2.4), V.mul(up, -0.7)), [1.8, 0.95, 1.7], M.WOOD, [bd, across, up]); });
    const bendL = V.add(V.mad(nose, across, -3.8), V.mul(bd, -0.5)), bendR = V.add(V.mad(nose, across, 3.8), V.mul(bd, -0.5));
    const tipL = V.add(V.mad(nose, across, -6.6), V.mul(bd, -2.8)), tipR = V.add(V.mad(nose, across, 6.6), V.mul(bd, -2.8));
    r.group(() => { r.cone(nose, bendL, 1.15, 0.95, M.SLATE); r.cone(bendL, tipL, 0.95, 0.7, M.SLATE); r.cone(nose, bendR, 1.15, 0.95, M.SLATE); r.cone(bendR, tipR, 0.95, 0.7, M.SLATE); });
    const nut = V.mad(g, bd, 1.8);
    r.cone(tipL, nut, 0.3, 0.3, M.BONE, { noShadow: true }); r.cone(nut, tipR, 0.3, 0.3, M.BONE, { noShadow: true });
    r.cone(V.add(nut, V.mul(up, 0.9)), V.add(V.mad(nose, bd, 1.6), V.mul(up, 0.9)), 0.4, 0.4, M.WOOD, { noShadow: true });
    r.cone(V.add(V.mad(nose, bd, 1.4), V.mul(up, 0.9)), V.add(V.mad(nose, bd, 3), V.mul(up, 0.9)), 0.6, 0.15, M.STEEL, { noShadow: true });
  } else if (look.weapon === 'spear' || look.weapon === 'axe' || look.weapon === 'mace') {
    const g = aR.hand, wide = V.norm(V.cross(bd, V.len(V.cross(bd, up)) > 0.3 ? up : fwd)), wf = [bd, wide, V.cross(bd, wide)];
    if (look.weapon === 'spear') {   // a long ash shaft and a leaf-shaped steel head on an iron collar
      r.cone(V.mad(g, bd, -8), V.mad(g, bd, 15), 0.9, 0.9, M.WOOD);   // (a4) thicker shaft, bigger head and collar
      r.cyl(V.mad(g, bd, 14.4), V.mad(g, bd, 15.8), 1.4, M.SLATE);
      r.group(() => { r.cone(V.mad(g, bd, 15.6), V.mad(g, bd, 18.4), 0.7, 2.4, M.SLATE); r.cone(V.mad(g, bd, 18.4), V.mad(g, bd, 23.4), 2.4, 0.15, M.SLATE); });   // (b2) a bigger leaf
    } else if (look.weapon === 'axe') {   // a long haft and a broad bearded head, its edge flaring wide
      r.cone(V.mad(g, bd, -4), V.mad(g, bd, 12.5), 0.9, 0.9, M.WOOD);
      const hc = V.mad(g, bd, 10.4), side = V.norm(V.sub(V.mul(fwd, 1), V.mul(bd, V.dot(fwd, bd)))), af = [bd, side, V.norm(V.cross(bd, side))];
      r.group(() => {   // (a4) a broad head, about the skull's size, as the concept draws it
        r.box(V.mad(hc, side, 2.0), [2.2, 2.3, 0.6], M.SLATE, af);
        r.ell(V.mad(hc, side, 5.0), [5.6, 1.9, 0.65], M.SLATE, af);   // the flared edge (b2: broader still)
      });
      r.box(V.mad(hc, side, -1.1), [1.0, 1.1, 0.7], M.SLATE, af);   // the poll behind the haft
    } else {   // a short iron-bound haft and a spiked iron ball
      r.cone(V.mad(g, bd, -2), V.mad(g, bd, 8), 0.9, 0.9, M.WOOD);   // (a4) a longer haft, a bigger ball with more spikes
      const mk = bw ? 1.2 : 1, mc = V.mad(g, bd, 9.6 * (bw ? 1.05 : 1));   // (b4 pass 3) the bulwark's ball is bigger, as its concept
      r.sph(mc, 2.5 * mk, M.SLATE);
      const dg = [V.add(wide, wf[2]), V.sub(wide, wf[2])].map(V.norm);
      for (const d of [bd, wide, V.mul(wide, -1), wf[2], V.mul(wf[2], -1), dg[0], V.mul(dg[0], -1), dg[1], V.mul(dg[1], -1)]) r.cone(V.mad(mc, d, 2.0 * mk), V.mad(mc, d, 3.7 * mk), 0.8 * mk, 0.15, M.SLATE);
    }
    if (bw) {   // (b4) the bulwark's tower shield: bare wood planks, iron bands across and iron corners
      const n = V.norm(V.add(V.mul(fwd, 0.8), V.mul(sideR, -0.6))), ax = [n, V.norm(V.cross(up, n)), up], c = V.add(V.mad(aL.hand, n, 1.5), V.mul(up, 1.0));
      r.box(c, [0.8, 4.6, 9.4], M.WOOD, ax, { mf: p => {   // (pass 2) taller
        const q = V.sub(p, c), u = V.dot(q, ax[1]), v = V.dot(q, ax[2]), au = Math.abs(u), av = Math.abs(v);
        if (au > 3.6 && av > 7.8) return M.SLATE;                       // iron corners
        if (Math.abs(av - 5.6) < 0.7 || Math.abs(v) < 0.6) return (Math.round(u * 0.9) % 3 === 0 && V.dot(q, n) > 0) ? M.IRON : M.SLATE;   // three iron bands with rivets
        if (Math.abs(au - 1.5) < 0.22) return M.HAIR;                   // gaps between three planks
        return 0;
      } });
    }
    if (look.towerShield) {   // a tall rectangular shield: red field, steel rim
      const n = V.norm(V.add(V.mul(fwd, 0.85), V.mul(sideR, -0.5))), c = V.add(V.mad(aL.hand, n, 1.4), V.mul(up, 0.5)), ax = [n, V.norm(V.cross(up, n)), up];
      r.box(V.mad(c, up, 0.6), [0.7, 4.7, 8.0], M.CLOTH_RED, ax, { mf: p => { const q = V.sub(p, V.mad(c, up, 0.6)); const u = Math.abs(V.dot(q, ax[1])), v = Math.abs(V.dot(q, ax[2])); return u > 3.6 || v > 6.9 ? M.SLATE : (u > 2.7 && u < 3.1 && v < 6.0) || (v > 5.4 && v < 5.8 && u < 3.1) ? M.MARK : 0; } });   // (b2 pass 3) an inner bevel line   // (a4) taller and wider, as the concept's
    }
  } else if (wd) {
    wardenAnchor(r, aR.hand, bd, fwd, sideR, up);
    wardenShield(r, aL.hand, fwd, sideR, up);
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
    if (sk) {   // (b2) a broad blued-steel blade, as the concept's
      r.box(V.mad(g, bd, 9.6), [8.2, 1.3, 0.4], M.SLATE, wf);
      r.cone(V.mad(g, bd, 17.6), V.mad(g, bd, 19.6), 1.15, 0.2, M.SLATE);
    } else if (look.crown) {   // (b4) the king: a broad, chipped straight sword with a gold cross-guard and pommel
      r.box(V.mad(g, bd, 1.4), [0.8, 3.6, 0.8], M.GOLD, wf); r.sph(V.mad(g, bd, -2.2), 1.0, M.GOLD);
      const bc = V.mad(g, bd, 8.4);
      const bmf = { mf: p => { const q = V.sub(p, bc), t = V.dot(q, bd), u = V.dot(q, wide); return (Math.abs(u) > 1.45 && hash(Math.round(t * 0.8), u > 0 ? 3 : 5, 11) < 0.3) ? M.IRON : (Math.abs(u) < 0.3 && t < 4) ? M.IRON : 0; } };   // chips nicked in both edges, a fuller
      const d1 = V.norm(V.add(bd, wide)), d2 = V.norm(V.sub(bd, wide));
      r.group(() => { r.box(bc, [6.6, 2.0, 0.45], M.STEEL, wf, bmf); r.box(V.mad(g, bd, 15), [1.41, 1.41, 0.45], M.STEEL, [d1, d2, wf[2]], bmf); });   // (pass 3) a flat spear point, not a round knob
    } else if (look.armored) {   // a longer, rust-pitted blade
      const bc = V.mad(g, bd, 10);
      r.box(bc, [8.4, 1.1, 0.35], M.IRON, wf, { mf: p => hash(Math.round(V.dot(V.sub(p, bc), bd) * 1.3), 7, 3) < 0.35 ? M.RUST : 0 });
    } else if (look.burn) {   // a broad steel blade with a point (the burning dead)
      r.box(V.mad(g, bd, 7.8), [6.2, 1.45, 0.45], M.SLATE, wf);   // (a4) dark blued iron, as the concept's
      r.cone(V.mad(g, bd, 13.6), V.mad(g, bd, 16.6), 1.35, 0.2, M.SLATE);
    } else r.box(V.mad(g, bd, 8.6), [7, 1.0, 0.35], M.IRON, wf);
    if (look.shield && sk) {   // (b2) a round red shield, dark iron rim, a big bone skull in the middle (the concept's)
      const n = V.norm(V.add(V.mul(fwd, 0.8), V.mul(sideR, -0.6))), c = V.mad(aL.hand, n, 1.4), ax = [n, V.norm(V.cross(up, n)), up];
      r.ell(c, [1.1, 5.6, 5.6], M.CLOTH_RED, ax, { mf: p => {
        const q = V.sub(p, c), u = V.dot(q, ax[1]), v = V.dot(q, ax[2]);
        if (u * u + v * v > 4.6 * 4.6) return M.IRON;
        const su = Math.abs(u), sv = v - 0.6;
        if (su < 1.3 && v < -1.0 && v > -2.6) return su % 0.9 < 0.32 ? M.DARK : M.BONE;              // jaw with teeth
        if (su * su / 1.1 + sv * sv < 4.4) return ((su - 0.95) ** 2 + (sv + 0.1) ** 2 < 0.42) ? M.DARK : M.BONE;   // skull + eye holes
        return 0;
      } });
    } else if (look.shield && look.armored) {   // heater shield: red field, rusted rim, a bone skull emblem
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
  if (king) {
    // (b4) the king's armor, as the concept: grey plate cuirass over the ribs with a belt and a gold
    // buckle, big gold-trimmed pauldrons on both shoulders, armored boots, a ragged crimson tabard
    const lf = frameAlong(fwd, up);
    for (const [knee, ank] of [[J.kneeL, J.ankL], [J.kneeR, J.ankR]]) {
      r.group(() => { r.cyl(V.lerp(knee, ank, 0.35), V.lerp(knee, ank, 0.95), 1.75, M.PLATE); r.ell(V.add(ank, [1.5, 0, -0.5]), [2.9, 1.65, 1.15], M.PLATE); });
    }
    const bc = V.mad(J.chest, up, -0.2);
    r.ell(V.mad(bc, fwd, 0.7), [3.7, 4.9, 4.7], M.PLATE, lf, { mf: p => { const q = V.sub(p, bc), z = V.dot(q, up); return Math.abs(z + 2.6) < 0.3 || (V.dot(q, fwd) > 3.2 && Math.abs(V.dot(q, sideR)) < 0.3 && z > -2) ? M.IRON : 0; } });   // a lame line and a ridge down the front
    const be = V.mad(J.pelvis, up, 1.8);
    r.ell(be, [3.3, 4.6, 1.1], M.LEATHER, lf);
    r.box(V.mad(be, fwd, 3.3), [0.5, 1.4, 1.1], M.GOLD, lf, { mf: p => { const q = V.sub(p, V.mad(be, fwd, 3.3)); return Math.abs(V.dot(q, sideR)) < 0.6 && Math.abs(V.dot(q, up)) < 0.4 ? M.LEATHER : 0; } });
    for (const fs of [1, -1]) {   // the tabard, front and back, torn into points to the knees
      const tc = V.add(V.mad(J.pelvis, fwd, fs * 2.8), V.mul(up, -2.4));
      r.group(() => {
        r.box(tc, [0.45, 2.9, 3.0], M.MARK, lf);
        for (const sd of [-1.9, -0.6, 0.7, 1.9]) r.cone(V.add(V.mad(tc, up, -2.2), V.mul(sideR, sd)), V.add(V.add(V.mad(tc, up, -6.0 + Math.abs(sd) * 0.7 + (sd > 0 ? 0.6 : 0)), V.mul(sideR, sd * 1.08)), V.mul(fwd, fs * 0.3)), 0.95, 0.25, M.MARK);
      });
    }
    for (const [sh, sd] of [[J.shR, 1], [J.shL, -1]]) {   // big plate pauldrons with gold-trimmed edges and a rivet
      // (pass 2) two layered plates, flatter and sloping out over the arm, each with a gold edge
      const pk = V.add(V.mad(sh, up, 1.0), V.mul(sideR, sd * 1.2)), so = V.norm(V.add(up, V.mul(sideR, sd * 0.55))), pf = frameAlong(fwd, so);
      const lame = V.add(V.mad(pk, up, -1.7), V.mul(sideR, sd * 1.6));
      r.ell(lame, [3.3, 3.0, 1.5], M.PLATE, pf, { mf: p => V.dot(V.sub(p, lame), so) < -0.5 ? M.GOLD : 0 });
      r.ell(pk, [3.9, 3.7, 2.3], M.PLATE, pf, { mf: p => { const q = V.sub(p, pk); return V.dot(q, so) < -0.9 ? M.GOLD : 0; } });
      r.sph(V.add(V.add(V.mad(pk, up, 1.6), V.mul(fwd, 1.8)), V.mul(sideR, sd * 1.0)), 0.7, M.GOLD, { noShadow: true, bias: 1 });
    }
    if (st.clip !== 'attack') {   // the raised left hand's clawed fingers
      const h = aL.hand, o = V.norm(V.add(V.mul(sideR, -0.5), up));
      for (const [f, s2] of [[-0.9, 0.2], [0, 0], [0.9, -0.2]]) { const b0 = V.add(h, V.mul(fwd, f * 0.8)), m0 = V.add(V.mad(b0, o, 1.6), V.mul(fwd, f * 0.5 + 0.3)); r.cone(b0, m0, 0.6, 0.5, bone); r.cone(m0, V.add(V.mad(m0, fwd, 1.1), V.mul(up, 0.2 + s2)), 0.5, 0.25, bone); }
    }
  } else if (look.armored) {
    // rusted bracers and greaves, one pauldron, belt and buckle, red loincloth and scarf (mock-up)
    const am = sk ? M.SLATE : M.RUST;   // (b2) the plain skeleton's bracers, greaves and pauldron are blued steel, as the concept's
    for (const a of [aR, aL]) r.cyl(V.lerp(a.el, a.hand, 0.2), V.lerp(a.el, a.hand, 0.8), 1.45, am);
    for (const [knee, ank] of [[J.kneeL, J.ankL], [J.kneeR, J.ankR]]) r.cyl(V.lerp(knee, ank, 0.15), V.lerp(knee, ank, 0.7), 1.55, am);
    const pc = V.add(V.mad(J.shR, up, 1.3), V.mul(sideR, 0.9));
    if (sk) {   // a big round pauldron with an orange-gold boss on its face
      const pk = V.add(pc, V.mul(sideR, 0.8));   // (b2 pass 3) bigger, further out over the arm
      r.ell(pk, [4.9, 4.7, 3.8], M.SLATE, frameAlong(fwd, up), { mf: p => V.dot(V.sub(p, pk), up) < -2.2 ? M.IRON : 0 });
      r.sph(V.add(V.add(V.mad(pk, up, 2.0), V.mul(fwd, 1.9)), V.mul(sideR, 2.3)), 1.3, M.HAIR_O, { bias: 1 });   // (pass 2) orange, as the concept's
    } else r.ell(pc, [3.8, 3.6, 3.0], M.RUST, frameAlong(fwd, up), { mf: p => V.dot(V.sub(p, pc), up) < -1.6 ? M.IRON : 0 });
    const bc = V.mad(J.pelvis, up, 1.8);
    if (sk) r.ell(V.mad(bc, up, -0.6), [2.9, 4.1, 0.7], M.CLOTH_RED, frameAlong(fwd, up));   // (b2 pass 2) a thin red sash, no belt or buckle
    else r.ell(bc, [3.0, 4.4, 1.1], M.LEATHER, frameAlong(fwd, up));
    if (!sk) r.cyl(V.mad(bc, fwd, 2.7), V.mad(bc, fwd, 3.4), 1.4, M.GOLD, { mf: p => V.len(V.sub(V.sub(p, V.mad(bc, fwd, 3.4)), V.mul(fwd, V.dot(V.sub(p, V.mad(bc, fwd, 3.4)), fwd)))) < 0.7 ? M.IRON : 0 });
    if (sk) {   // (b2) a long red loincloth torn into three points, no scarf: the ribs show, as the concept's
      const lc = V.add(V.mad(J.pelvis, fwd, 2.7), V.mul(up, -2.6)), lf = frameAlong(fwd, up);
      r.group(() => {
        r.box(lc, [0.45, 2.3, 3.2], M.CLOTH_RED, lf);
        for (const sd of [-1.3, 0, 1.3]) r.cone(V.add(V.mad(lc, up, -2.6), V.mul(sideR, sd)), V.add(V.add(V.mad(lc, up, -5.6 + Math.abs(sd) * 0.8), V.mul(sideR, sd * 1.05)), V.mul(fwd, 0.3)), 0.95, 0.25, M.CLOTH_RED);
      });
    } else r.box(V.add(V.mad(J.pelvis, fwd, 2.6), V.mul(up, -2.6)), [0.4, 1.9, 3.4], M.CLOTH_RED, frameAlong(fwd, up), { mf: p => V.dot(V.sub(p, J.pelvis), up) < -5 && hash(Math.round(V.dot(p, sideR) * 2), 5, 9) < 0.4 ? M.MARK : 0 });
    const nk = V.mad(J.chest, up, 4.6);
    if (!sk) r.group(() => {   // a wide cowl of a scarf with one tail falling over the shield shoulder
      r.ell(nk, [3.6, 5.2, 2.0], M.CLOTH_RED, frameAlong(fwd, up));
      r.cone(V.add(V.mad(nk, fwd, 1.8), V.mul(sideR, -3.8)), V.add(V.add(V.mad(nk, fwd, 2.4), V.mul(sideR, -4.6)), V.mul(up, -5)), 1.5, 0.7, M.CLOTH_RED);
    });
  }
  if (look.pauldron) {   // a round plate pauldron with a gold rivet (both shoulders for 'both'), or a leather one
    const mat = look.pauldron === 'leather' ? M.LEATHER : M.SLATE;
    for (const [sh, sd] of look.pauldron === 'both' ? [[J.shR, 1], [J.shL, -1]] : [[J.shR, 1]]) {
      const pc = V.add(V.mad(sh, up, 1.0), V.mul(sideR, sd * 0.8));
      if (look.pauldron === 'leather') {   // (b2 pass 3) the crossbowman's: bigger, with a darker turned-down edge and a big rivet
        const pk = V.add(pc, V.mul(sideR, 0.6));
        r.ell(pk, [4.3, 4.1, 3.3], mat, frameAlong(fwd, up), { mf: p => V.dot(V.sub(p, pk), up) < -1.8 ? M.HAIR : 0 });
        r.sph(V.add(V.add(V.mad(pk, up, 1.6), V.mul(fwd, 2.6)), V.mul(sideR, 1.2)), 0.9, M.GOLD, { noShadow: true, bias: 1 });
        continue;
      }
      r.ell(pc, [3.4, 3.2, 2.6], mat, frameAlong(fwd, up));
      r.sph(V.add(V.add(V.mad(pc, up, 1.2), V.mul(fwd, 2.4)), V.mul(sideR, sd * 0.8)), 0.65, M.GOLD, { noShadow: true, bias: 1 });
    }
  }
  if (bw) {
    // (b4) the bulwark: big steel pauldrons on both shoulders, a leather strap across the chest and a
    // belt with an iron buckle; the ribs show
    for (const [sh, sd] of [[J.shR, 1], [J.shL, -1]]) {
      const pc = V.add(V.mad(sh, up, 1.0), V.mul(sideR, sd * 1.3)), so = V.norm(V.add(up, V.mul(sideR, sd * 0.6))), pf = frameAlong(fwd, so);   // (pass 2) two flatter layered plates
      const lame = V.add(V.mad(pc, up, -1.6), V.mul(sideR, sd * 1.5));
      r.ell(lame, [3.4, 3.1, 1.5], M.STEEL, pf, { mf: p => V.dot(V.sub(p, lame), so) < -0.6 ? M.SLATE : 0 });
      r.ell(pc, [4.0, 3.8, 2.2], M.STEEL, pf, { mf: p => V.dot(V.sub(p, pc), so) < -1.0 ? M.SLATE : 0 });
      for (const [f2, z2] of [[1.6, 1.4], [-1.2, 1.6]]) r.sph(V.add(V.add(V.mad(pc, up, z2), V.mul(fwd, f2)), V.mul(sideR, sd * 1.4)), 0.6, M.IRON, { noShadow: true, bias: 1 });
    }
    const s0 = V.add(V.mad(J.chest, up, 3.4), V.mul(sideR, 2.6)), s1 = V.add(V.mad(J.pelvis, up, 1.8), V.mul(sideR, -3.2));
    r.cone(V.mad(s0, fwd, 3.2), V.mad(s1, fwd, 3.0), 0.8, 0.8, M.LEATHER);
    r.cone(V.mad(s0, fwd, -2.4), V.mad(s1, fwd, -2.2), 0.8, 0.8, M.LEATHER);
    const be = V.mad(J.pelvis, up, 1.6);
    r.ell(be, [3.1, 4.4, 1.1], M.LEATHER, frameAlong(fwd, up));
    r.box(V.mad(be, fwd, 3.1), [0.5, 1.3, 1.0], M.SLATE, frameAlong(fwd, up), { mf: p => { const q = V.sub(p, V.mad(be, fwd, 3.1)); return Math.abs(V.dot(q, sideR)) < 0.55 && Math.abs(V.dot(q, up)) < 0.35 ? M.LEATHER : 0; } });
  }
  if (wd) wardenGear(r, J, st, aR, aL, bone);
  if (look.breastplate) {   // a plate cuirass over the ribs, with a skirt band at the waist
    const bc = V.mad(J.chest, up, -0.2);
    r.group(() => {
      r.ell(V.mad(bc, fwd, 0.6), [3.6, 4.9, 4.6], M.SLATE, frameAlong(fwd, up), { mf: p => { const z = V.dot(V.sub(p, bc), up); return z < -2.2 && Math.abs(z + 3.2) < 0.35 ? M.IRON : 0; } });   // (b2) a lame line low on the plate
      r.ell(V.mad(J.pelvis, up, 1.4), [3.6, 4.8, 1.8], M.SLATE, frameAlong(fwd, up), { mf: p => Math.abs(V.dot(V.sub(p, V.mad(J.pelvis, up, 1.4)), up) - 0.2) < 0.3 ? M.IRON : 0 });
    });
  }
  if (look.quiver) {   // a strap from the leather pauldron down across the chest, a bolt quiver at the left hip
    const s0 = V.add(V.mad(J.chest, up, 3.4), V.mul(sideR, 2.6)), s1 = V.add(V.add(V.mad(J.pelvis, up, 1.5), V.mul(sideR, -3.4)), V.mul(fwd, 0.4));
    r.cone(V.mad(s0, fwd, 2.0), V.mad(s1, fwd, 2.4), 0.7, 0.7, M.LEATHER);
    r.cone(V.mad(s0, fwd, -2.2), V.mad(s1, fwd, -2.0), 0.7, 0.7, M.LEATHER);
    const qc = V.add(V.add(J.pelvis, V.mul(sideR, -5.0)), V.add(V.mul(up, -3.6), V.mul(fwd, 0.2))), qa = V.norm(V.add(V.add(up, V.mul(fwd, -0.2)), V.mul(sideR, -0.35)));   // (b2 pass 4) lower, outside the thigh
    r.cone(V.mad(qc, qa, -2.8), V.mad(qc, qa, 2.8), 2.0, 2.2, M.LEATHER, { mf: p => Math.abs(V.dot(V.sub(p, qc), qa) - 2.2) < 0.4 ? M.HAIR : 0 });
    for (const [u, v] of [[-0.8, 0], [0.8, 0.5], [0, -0.8]]) { const b0 = V.add(V.mad(qc, qa, 2.6), V.add(V.mul(fwd, u), V.mul(sideR, v))); r.cone(b0, V.mad(b0, qa, 2.0), 0.4, 0.4, M.WOOD, { noShadow: true }); r.cone(V.mad(b0, qa, 1.8), V.mad(b0, qa, 4.0), 0.85, 0.15, M.STEEL, { noShadow: true }); }
  }
  if (look.rag && (look.weapon === 'axe' || look.weapon === 'mace')) {   // (b2) a long red cloth to the knees, front and back, torn into points
    for (const fs of [1, -1]) {
      const rc = V.add(V.mad(J.pelvis, fwd, fs * 2.6), V.mul(up, -2.6)), rf = frameAlong(fwd, up);
      r.group(() => {
        r.box(rc, [0.45, 2.3, 3.0], look.rag, rf);
        for (const sd of [-1.3, 0, 1.3]) r.cone(V.add(V.mad(rc, up, -2.4), V.mul(sideR, sd)), V.add(V.add(V.mad(rc, up, -5.4 + Math.abs(sd) * 0.9), V.mul(sideR, sd * 1.05)), V.mul(fwd, fs * 0.3)), 0.95, 0.25, look.rag);
      });
    }
  } else if (look.rag && look.weapon === 'spear') {   // (b2 pass 2) the spearman: a longer muted-navy rag front and back, torn into points
    for (const fs of [1, -1]) {
      const rc = V.add(V.mad(J.pelvis, fwd, fs * 2.5), V.mul(up, -2.4)), rf = frameAlong(fwd, up);
      r.group(() => {
        r.box(rc, [0.45, 2.2, 2.8], M.CLOTH_NAVY, rf);
        for (const sd of [-1.2, 0.1, 1.3]) r.cone(V.add(V.mad(rc, up, -2.2), V.mul(sideR, sd)), V.add(V.add(V.mad(rc, up, -5.0 + Math.abs(sd - 0.1) * 0.7), V.mul(sideR, sd * 1.05)), V.mul(fwd, fs * 0.3)), 0.9, 0.25, M.CLOTH_NAVY);
      });
    }
  } else if (look.rag) {   // a ragged cloth hanging from the hips at the front, torn into points
    const rc = V.add(V.mad(J.pelvis, fwd, 2.4), V.mul(up, -2.2)), rf = frameAlong(fwd, up);
    r.box(rc, [0.4, 2.0, 2.6], look.rag, rf);
    for (const sd of [-1.1, 0.2, 1.3]) r.cone(V.add(V.mad(rc, up, -2.2), V.mul(sideR, sd)), V.add(V.add(V.mad(rc, up, -4.6 - Math.abs(sd) * 0.4), V.mul(sideR, sd * 1.1)), V.mul(fwd, 0.2)), 0.75, 0.2, look.rag);
    if (look.weapon === 'spear') {   // (a4) the spearman's rag hangs behind too, as its back view draws it
      const rb = V.add(V.mad(J.pelvis, fwd, -2.4), V.mul(up, -2.0));
      r.box(rb, [0.4, 2.2, 2.6], look.rag, rf);
      for (const sd of [-1.2, 0, 1.2]) r.cone(V.add(V.mad(rb, up, -2.2), V.mul(sideR, sd)), V.add(V.add(V.mad(rb, up, -4.4 - Math.abs(sd) * 0.6), V.mul(sideR, sd * 1.1)), V.mul(fwd, -0.3)), 0.75, 0.2, look.rag);
    }
  }
  if (look.lich) {
    // a tattered robe from the waist to the floor (it floats: no feet), hem ragged and glowing
    // faintly; a high mantle over the shoulders; the ribcage shows through the open front
    const RM = M.CLOTH_DARK, TRIM = M.CLOTH_PURPLE, top = V.mad(J.pelvis, up, 2), hem = [J.pelvis[0] - (st.clip === 'walk' ? 1.6 : 0.3), J.pelvis[1], 1.2], ax = V.norm(V.sub(hem, top)), Lh = V.len(V.sub(hem, top));
    // (b2) a bell: a narrow cone to the knees, then a wide flat flare, then torn tails round the hem
    const knee = V.lerp(top, hem, 0.62), flare = V.add(hem, [0, 0, 1.4]);
    const robeMf = p => { const q = V.sub(p, top), t = V.dot(q, ax); if (Math.abs(t - (Lh - 2.4)) < 0.55) return TRIM; return V.dot(q, fwd) > 2.4 && Math.abs(V.dot(q, sideR)) < 1.0 ? TRIM : 0; };
    r.group(() => {
      r.cone(top, knee, 4.0, 5.2, RM, { mf: robeMf });
      r.cone(knee, flare, 5.2, 7.6, RM, { mf: robeMf });
      r.ell(flare, [7.8, 7.8, 1.6], RM, frameAlong(fwd, up), { mf: robeMf });
    });
    for (let k = 0; k < 9; k++) {   // ragged tails
      const a = (k + 0.5) / 9 * Math.PI * 2, o = V.add(V.mul(fwd, Math.cos(a)), V.mul(sideR, Math.sin(a))), b0 = V.add(V.mad(flare, o, 6.6), [0, 0, 0.2]);
      r.cone(b0, V.add(V.mad(b0, o, 2.2 + (k % 3) * 0.6), [0, 0, -1.6]), 1.3, 0.3, RM);
    }
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
  const hd = wd ? V.add(V.mad(J.head, up, 0.5), V.mul(fwd, 1.8)) : J.head;
  skullAt(r, look.armored ? V.mad(J.head, up, king ? -0.6 : 0.6) : hd, fwd, sideR, up, bone, eye, st.clip === 'attack' && sw.hit ? 0.8 : 0, king || wd ? 1.0 : look.armored ? 1.15 : 1);
  if (wd) wardenHelm(r, hd, fwd, sideR, up);
  if (look.helm && look.burn) {
    // an open kettle helm riding high on the skull so the burning eyes show under its brim,
    // with three tongues of flame licking up from the crown (they flicker with the frame)
    const hc = V.add(V.mad(J.head, up, 2.6), V.mul(fwd, -0.5));
    r.ell(V.mad(hc, up, 0.5), [4.2, 4.3, 3.9], M.IRON, frameAlong(fwd, up));   // (b2) a taller dome, as the concept's
    r.cyl(V.mad(hc, up, -0.9), V.mad(hc, up, -0.4), 4.7, M.IRON);
    { const a0 = V.norm(V.sub(V.mul(fwd, -1), V.mul(up, 0.6))); r.ell(V.add(V.mad(hc, up, -0.8), V.mul(fwd, -2.6)), [2.6, 4.4, 0.9], M.IRON, frameAlong(a0, up)); }   // (b2 pass 3) a sallet flare behind
    const fl = st.f || 0, burnOut = st.clip === 'death' ? [1, 0.8, 0.5, 0.2, 0, 0][fl] : 1;   // the flames gutter out as it dies
    // one tall flame from the crown, and two from the helm's sides that curl outward and up
    if (burnOut > 0) for (const [k, s, z, f2] of [[0, 0, 3.8, -0.4], [1, -1, 1.2, 0.4], [2, 1, 1.2, 0.4]]) {
      const base = V.add(V.add(V.mad(hc, up, z), V.mul(sideR, s * 3.7)), V.mul(fwd, f2)), h = ((k ? 3.8 : 5.4) + [0, 0.9, 0.3, -0.5][(fl + k) % 4]) * burnOut;
      const mid = V.add(V.mad(base, up, h * 0.5), V.mul(sideR, s * 1.3)), tip = V.add(V.add(V.mad(base, up, h), V.mul(sideR, s * (k ? 1.4 : 0) + [0.4, -0.3, 0.2, -0.4][(fl + k) % 4])), V.mul(fwd, -0.5));
      const core = { noShadow: true, mf: p => { const q = V.sub(p, base), t = V.dot(q, up) / h, sd = Math.abs(V.dot(q, sideR) - s * 1.3 * Math.min(1, t * 2)); return t < 0.55 && sd < 0.75 ? M.LAMP : t > 0.72 ? M.EYE_RED : 0; } };   // a yellow heart low in each flame, red tips (b2)
      r.group(() => { r.cone(base, mid, k ? 1.35 : 1.7, k ? 0.95 : 1.2, M.FIREM, core); r.cone(mid, tip, k ? 0.95 : 1.2, 0.2, M.FIREM, core); });
    }
  } else if (look.helm === 'open') {
    // the axeman's open helm: a dome down to the brow, cheek guards either side of the face and a
    // flared neck guard behind
    // (a4) riding higher so the eyes show under the brim; the cheek guards hang down to the jaw
    const hc = V.add(V.mad(J.head, up, 2.6), V.mul(fwd, -0.4)), hf = frameAlong(fwd, up);
    r.group(() => {
      r.ell(hc, [4.3, 4.4, 3.0], M.SLATE, hf);
      // the guards flare out at the bottom, so their outer faces tip up into the light instead of
      // reading as flat shadow
      for (const sd of [-1, 1]) { const a1 = V.norm(V.add(sideR, V.mul(up, sd * 0.45))); r.box(V.add(V.add(V.mad(J.head, up, -0.6), V.mul(fwd, 1.0)), V.mul(sideR, sd * 4.0)), [1.4, 0.55, 2.5], M.SLATE, [fwd, a1, V.cross(fwd, a1)]); }
      const a0 = V.norm(V.sub(fwd, V.mul(up, 0.55))), n1 = V.norm(V.cross(up, a0));
      r.box(V.add(V.mad(J.head, up, 0.0), V.mul(fwd, -3.8)), [0.6, 3.2, 2.0], M.SLATE, [a0, n1, V.cross(a0, n1)]);
    });
    r.cyl(V.mad(hc, up, -0.8), V.mad(hc, up, -0.2), 4.8, M.SLATE);   // the brow band
  } else if (look.helm === 'kettle') {   // the tomb guard: a round dome with a narrow brim all round
    const hc = V.add(V.mad(J.head, up, 2.9), V.mul(fwd, -0.5));   // (b2 pass 2) higher, so the eyes show
    r.ell(hc, [4.4, 4.5, 3.2], M.SLATE, frameAlong(fwd, up));
    r.cyl(V.mad(hc, up, -1.0), V.mad(hc, up, -0.4), 4.6, M.SLATE);
    r.group(() => { for (let k = 0; k < 40; k++) { const a = k / 40 * Math.PI * 2; r.sph(V.add(V.mad(hc, up, -0.7), V.add(V.mul(fwd, Math.cos(a) * 4.5), V.mul(sideR, Math.sin(a) * 4.5))), 0.9, M.SLATE); } });   // (b2) a thick rolled brim, as the concept's
  } else if (look.helm === 'bulwark') {   // (b4) a deep navy kettle helm: dome, a low ridge, a thick riveted iron rim
    const hc = V.add(V.mad(J.head, up, 3.3), V.mul(fwd, -0.9)), hf = frameAlong(fwd, up);   // (pass 4) higher and further back so the eyes show under the brim
    r.group(() => {
      r.ell(hc, [4.5, 4.6, 3.6], M.SLATE, hf);   // (b4 fix) blued steel, the concept's dark blue-grey (CLOTH_NAVY read royal blue)
      r.ell(V.mad(hc, up, 0.6), [4.4, 0.8, 3.3], M.SLATE, hf);
    });
    // (pass 3) a broad iron brim standing out round the dome, riveted
    r.cyl(V.mad(hc, up, -1.5), V.mad(hc, up, -0.4), 5.6, M.IRON, { mf: p => { const q = V.sub(p, hc), a = Math.atan2(V.dot(q, sideR), V.dot(q, fwd)), t = a * 2.6; return V.dot(q, up) > -0.75 && Math.abs(t - Math.round(t)) < 0.18 && Math.hypot(V.dot(q, fwd), V.dot(q, sideR)) > 4.6 ? M.IRON : 0; } });
  } else if (look.helm) r.ell(V.mad(J.head, up, 1.8), [4.5, 4.5, 3.2], M.IRON);
  if (look.lich) {   // (b2 pass 3) a dark hood over the back of the skull
    const hh = V.add(V.mad(J.head, up, 0.4), V.mul(fwd, -1.3));
    r.ell(hh, [4.4, 4.8, 4.9], M.CLOTH_DARK, frameAlong(fwd, up), { mf: p => V.dot(V.sub(p, hh), fwd) > 3.0 ? M.CLOTH_PURPLE : 0 });
  }
  if (look.lich) {   // a dark iron circlet with tall points and a frost stone
    const cc = V.mad(J.head, up, 2.6);
    r.cyl(V.mad(cc, up, 0.2), V.mad(cc, up, 0.75), 3.75, M.IRON);
    for (let k = 0; k < 5; k++) { const a = (k / 4 - 0.5) * 2.2, b = V.add(V.mad(cc, up, 0.6), V.add(V.mul(fwd, Math.cos(a) * 3.6), V.mul(sideR, Math.sin(a) * 3.6))); r.cone(b, V.mad(b, up, k === 2 ? 3.4 : 2.2), 0.55, 0.12, M.IRON); }
    r.sph(V.add(V.mad(cc, up, 0.5), V.mul(fwd, 3.8)), 0.75, M.ICE, { noShadow: true });
  }
  if (look.crown) {   // (b4) a modest gold crown: a band with five short points and a red stone
    const cc = V.mad(J.head, up, 1.9);
    r.cyl(cc, V.mad(cc, up, 1.1), 3.5, M.GOLD);
    for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2, b = V.add(V.mad(cc, up, 1.0), V.add(V.mul(fwd, Math.cos(a) * 3.2), V.mul(sideR, Math.sin(a) * 3.2))); r.cone(b, V.mad(b, up, 1.6), 0.8, 0.2, M.GOLD); }
    r.sph(V.add(V.mad(cc, up, 0.55), V.mul(fwd, 3.5)), 0.6, M.EYE_RED, { noShadow: true });
  }
  if (!king && !wd) bigHead(r, sk0, J.head, bw ? 1.12 : 1.4);   // chibi skull (the king's is drawn at body scale, as his concept)
  if (look.crown) {   // (b4) a dark crimson cloak from the shoulders, widening to a ragged, torn hem; no trim, no collar
    const top = V.add(V.mad(J.chest, up, 3.4), V.mul(fwd, -2.6)), dn = V.norm(V.add(V.mul(up, -1), V.mul(fwd, st.clip === 'death' ? [-0.3, -0.2, -0.05, 0.05, 0.1, 0.12][st.f] : -0.3)));
    r.group(() => {
      for (let i = -3; i <= 3; i++) {
        const len = [0.82, 1.0, 0.88, 1.02, 0.86, 0.98, 0.8][i + 3], a0 = V.add(V.mad(top, dn, 0.8), V.mul(sideR, i * 0.95));
        const e0 = V.add(V.add(V.mad(top, dn, 12.2 * len), V.mul(sideR, i * 2.0)), V.mul(fwd, -Math.abs(i) * 0.25 + (i & 1) * 0.5)), cmf = { mf: p => hash(Math.round(V.dot(p, sideR) * 0.7), Math.round(V.dot(p, up) * 0.7), 13) < 0.035 ? M.DARK : 0 };
        r.cone(a0, e0, 1.4, 1.75, M.MARK, cmf);   // seven folds, a few moth holes
        r.cone(e0, V.add(V.mad(e0, dn, 2.6 + (i & 1) * 0.8), V.mul(sideR, i * 0.25)), 1.75, 0.3, M.MARK, cmf);   // (pass 3) each fold torn to a point: a ragged hem
      }
      r.ell(V.add(V.mad(J.chest, up, 4.3), V.mul(fwd, -0.9)), [3.3, 5.6, 1.7], M.MARK, frameAlong(fwd, up));   // (pass 4) the cloak gathered round the neck under the pauldrons, as the concept's
    });
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
const FALLEN_GOB_B = { ...FALLEN_B, hunch: 0.5 };
function fallenRig(look, st) {
  // art B2: the lean goblins hunch further forward (a lower, wider crouch for the imps was tried and tied)
  const B = look.goblin && !look.chief ? FALLEN_GOB_B : FALLEN_B, J = bipedJoints(B, st), r = new Rig(), { fwd, sideR, up } = J;
  // imps (the fallen one and its shaman; art pass from the "FALLEN KIN" concepts): wiry limbs, a lean
  // body, a belted ragged loincloth, grey hooves, and a squarer head with swept ears and horns
  const imp = !look.goblin && !look.digger;
  const skin = look.skin || (imp ? M.CLOTH_RED : M.FLESH);   // art A4: the concepts' brighter brick red (FLESH read near-black at this size)
  const chunk = imp && !look.ember && !look.sling;   // art A4: the spearling's and knifer's limbs are chunkier, as in their concepts (tried on the acolyte and slinger and lost there)
  // art B2, goblins (concept "GOBLIN"): the plain goblin, its shaman and the treasure goblin are lean and wiry;
  // the plain goblin swaps its spear for a dagger held low; it and the chieftain wear a leather vest
  const gob = !!look.goblin, gobLean = gob && !look.chief, gobPlain = gob && !look.chief && !look.staff && !look.unarmed;
  const gobVest = gob && !look.staff && !look.unarmed;
  const knife = look.knife || gobPlain;
  // art B4, the Ashhex Shaman (elite, concept "ASHHEX SHAMAN"): the acolyte's body under an ochre hood and
  // mantle with a dark rim, a shadowed face, purple ears and white horns through the hood, a fang necklace
  const ash = !!look.ashhex, ashM = M.HAIR_O;
  // art B5, Brother Cinder (secret boss, concept "BROTHER CINDER"): the acolyte's body at boss size under a deep
  // charcoal hood and mantle edged in gold, one white horn through the hood, a bone-fang necklace, a ragged layered
  // crimson robe with a zigzag hem, a closed book in the left hand and a crooked staff hung with a glowing bronze bell
  const cin = !!look.cinder, cinM = M.CLOTH_SHADOW;
  const lg = chunk ? [1.75, 1.4, 1.05] : imp ? [1.45, 1.15, 0.95] : gobLean ? [1.4, 1.1, 0.9] : [1.8, 1.4, 1.0];
  for (const [hip, knee, ank] of [[J.hipL, J.kneeL, J.ankL], [J.hipR, J.kneeR, J.ankR]]) {
    r.cone(hip, knee, lg[0], lg[1], skin); r.cone(knee, ank, lg[1], lg[2], skin);
    r.ell(V.add(ank, [1.4, 0, -0.5]), imp ? [2.0, 1.2, 0.85] : [2.2, 1.2, 0.8], M.HORN);   // art B2: the imps' hooves pale grey as in the concepts
  }
  if (imp && cin) {
    const lf = frameAlong(fwd, up), top = V.lerp(J.pelvis, J.chest, 0.85), hem = V.add(J.pelvis, [0, 0, -4.0]);
    const ax = V.norm(V.sub(hem, top)), Lr = V.len(V.sub(hem, top));
    const tri = a => Math.abs(((a * 7 / Math.PI) % 2 + 2) % 2 - 1);   // a triangle wave round the robe: the zigzag teeth
    const ragged = (c0, L) => ({ mf: p => { const q = V.sub(p, c0), t = V.dot(q, ax), ang = Math.atan2(V.dot(q, sideR), V.dot(q, fwd)); return t > L - 0.4 - tri(ang) * 1.7 ? M.DARK : 0; } });
    r.cone(top, hem, 3.0, 4.5, M.BLOODY, ragged(top, Lr));   // the long under-robe
    for (let k = 0; k < 9; k++) {   // its hem torn into points
      const a = (k + 0.5) / 9 * Math.PI * 2, d = V.add(V.mul(fwd, Math.cos(a)), V.mul(sideR, Math.sin(a))), b = V.mad(hem, d, 3.7);   // art B5 pass 3: a shorter robe (shins and hooves show) with longer, flared points
      r.cone(V.mad(b, up, 1.0), V.add(V.mad(b, up, -2.4 - (k % 2) * 0.6), V.mul(d, 0.9)), 1.35, 0.2, M.BLOODY);
    }
    const mid = V.add(J.pelvis, [0, 0, -1.2]), Lm = V.len(V.sub(mid, top));
    r.cone(V.mad(top, up, 0.6), mid, 3.3, 4.4, M.BLOODY, ragged(V.mad(top, up, 0.6), Lm + 0.6));   // the shorter over-layer, its own zigzag edge
    const cp = V.mad(J.chest, up, 2.9);   // a charcoal mantle over the shoulders, its edge trimmed in gold
    r.ell(cp, [4.7, 5.6, 2.7], cinM, lf, { mf: p => V.dot(V.sub(p, cp), up) < -1.7 ? M.GOLD : 0 });
    const nc = V.mad(J.chest, up, 0.4);   // a string of big bone fangs across the chest
    for (let k = -2; k <= 2; k++) { const a = k * 0.4, p = V.add(V.mad(nc, fwd, Math.cos(a) * 3.7), V.mul(sideR, Math.sin(a) * 3.9)); r.cone(p, V.add(V.mad(p, up, k ? -2.0 : -2.6), V.mul(fwd, 0.5)), 0.85, 0.2, M.CLOTH_WHITE, { noShadow: true }); }
  } else if (imp && look.ember) {
    // the ember acolyte (concept "EMBER ACOLYTE"): a ragged brown robe from chest to knee, tied
    // with a rope belt whose ends hang in front, under a purple capelet with a bone clasp
    const lf = frameAlong(fwd, up), top = V.lerp(J.pelvis, J.chest, 0.7), hem = V.add(J.pelvis, [0, 0, -4.2]);   // hangs straight down whatever the hunch
    const ax = V.norm(V.sub(hem, top)), Lr = V.len(V.sub(hem, top));
    r.cone(top, hem, 2.9, 3.7, M.LEATHER, { mf: p => {
      const q = V.sub(p, top), t = V.dot(q, ax), ang = Math.atan2(V.dot(q, sideR), V.dot(q, fwd));
      if (t > Lr - 1.3 + Math.abs(Math.sin(ang * 4.5)) * 1.1) return M.DARK;   // jagged, torn hem
      return 0;
    } });
    const bc = V.mad(J.pelvis, up, 1.2);
    r.ell(bc, [3.5, 3.9, 0.75], M.CLOTH_TAN, lf);   // rope belt
    for (const sd of [-0.6, 0.5]) r.cone(V.add(V.mad(bc, fwd, 3.2), V.mul(sideR, sd)), V.add(V.add(V.mad(bc, fwd, 3.7), V.mul(sideR, sd * 1.4)), V.mul(up, -3.6)), 0.6, 0.45, M.CLOTH_TAN);
    const cp = V.mad(J.chest, up, 3.2);
    if (ash) {   // a broad ochre mantle over the shoulders, and a string of bone fangs across the chest
      r.ell(cp, [4.2, 5.2, 2.6], ashM, lf, { mf: p => V.dot(V.sub(p, cp), up) < -1.3 ? M.CLOTH_DARK : 0 });   // its turned-up edge shows the dark lining
      const nc = V.mad(J.chest, up, 1.4);
      for (let k = -2; k <= 2; k++) { const a = k * 0.42, p = V.add(V.mad(nc, fwd, Math.cos(a) * 3.6), V.mul(sideR, Math.sin(a) * 3.8)); r.cone(p, V.add(V.mad(p, up, -1.9), V.mul(fwd, 0.4)), 0.65, 0.2, M.BONE, { noShadow: true }); }
    } else {
    r.ell(cp, [3.6, 4.6, 2.2], M.CLOTH_PURPLE, lf);   // capelet over the shoulders
    r.sph(V.add(V.mad(cp, fwd, 3.5), V.mul(up, -0.3)), 0.8, M.BONE, { bias: 1 });   // bone clasp
    }
  } else if (imp) {
    r.group(() => { r.ell(J.pelvis, chunk ? [2.8, 3.2, 2.5] : [2.6, 3.0, 2.4], skin); r.ell(V.lerp(J.pelvis, J.chest, 0.6), chunk ? [3.2, 3.8, 4.1] : [2.9, 3.4, 3.9], skin, frameAlong(fwd, up)); });
    const bc = V.mad(J.pelvis, up, 0.9), lf = frameAlong(fwd, up);
    const bk = chunk ? 0.25 : 0;   // the gear grows with the chunkier body so the belt still shows
    r.ell(bc, [2.9 + bk, 3.3 + bk, 0.9 + bk * 0.4], M.LEATHER, lf);   // belt
    r.box(V.mad(bc, fwd, 2.8 + bk), [0.35, 0.95 + bk, 0.75 + bk], M.IRON, lf, { bias: 1 });   // square buckle
    const lc = V.add(V.mad(J.pelvis, fwd, 2.2 + bk * 1.6), V.mul(up, -2.2));   // a ragged flap that ends in a point
    // art B2: a broader pointed loincloth, and a matching flap behind
    for (const fb of [1, -1]) {
      const c = fb > 0 ? lc : V.add(V.mad(J.pelvis, fwd, -1.9 - bk * 1.4), V.mul(up, -2.0));
      r.box(c, [0.45, 2.6, 2.4], M.LEATHER, lf);
      r.cone(V.add(c, V.mul(up, -1.4)), V.add(V.mad(c, up, -4.6), V.mul(fwd, 0.4 * fb)), 2.0, 0.3, M.LEATHER);
    }
    const spearling = !look.knife && !look.sling && !look.staff && !look.unarmed;
    if (spearling) {   // art A3, the spearling: a leather pauldron on the right shoulder and a strap across the chest to the left hip
      const pc = V.add(V.mad(J.shR, up, 0.9), V.mul(sideR, 0.6));
      r.ell(pc, [2.0, 2.1, 1.4], M.LEATHER, lf);
      r.sph(V.add(V.mad(pc, up, 0.7), V.mul(fwd, 1.5)), 0.55, M.IRON, { noShadow: true, bias: 1 });
      const s0 = V.add(V.mad(J.chest, up, 2.4), V.mul(sideR, 2.0)), s1 = V.add(V.mad(J.pelvis, up, 1.2), V.mul(sideR, -2.6));
      r.cone(V.mad(s0, fwd, 2.3), V.mad(s1, fwd, 2.6), 0.55, 0.55, M.LEATHER);
      r.cone(V.mad(s0, fwd, -2.2), V.mad(s1, fwd, -2.2), 0.55, 0.55, M.LEATHER);
    }
    if (look.sling) {   // art A3, the slinger: a ragged leather capelet with a bone clasp, and a pouch of stones at the left hip
      const cp = V.mad(J.chest, up, 2.6);   // art A4: a bigger capelet, broad over the shoulders as in the concept
      r.ell(cp, [3.7, 4.9, 2.3], M.LEATHER, lf);
      r.sph(V.add(V.mad(cp, fwd, 3.1), V.mul(up, -0.3)), 0.7, M.BONE, { bias: 1 });
      const pp = V.add(V.add(J.pelvis, V.mul(sideR, -3.6)), V.add(V.mul(up, -1.6), V.mul(fwd, 1.0)));
      r.cyl(V.mad(pp, up, -1.4), V.mad(pp, up, 1.0), 2.3, M.LEATHER);
      for (const [u, v] of [[-0.6, -0.5], [0.7, 0.2], [0, 0.8]]) r.sph(V.add(V.mad(pp, up, 1.2), V.add(V.mul(fwd, u), V.mul(sideR, v))), 0.95, M.ROCK);
    }
  } else {
    const lean = gobLean;
    r.group(() => { r.ell(J.pelvis, lean ? [2.6, 3.0, 2.5] : [3.2, 3.6, 2.8], skin); r.ell(V.lerp(J.pelvis, J.chest, 0.6), lean ? [2.9, 3.3, 4.0] : [3.6, 4.0, 4.2], skin, frameAlong(fwd, up)); });
    if (gobVest) {   // art B2: a leather vest over the chest and back, open down the front
      const vc = V.lerp(J.pelvis, J.chest, 0.9), vs = lean ? [3.25, 3.75, 3.5] : [3.95, 4.45, 3.7];
      r.ell(vc, vs, M.LEATHER, frameAlong(fwd, up), { mf: p => { const q = V.sub(p, vc); return V.dot(q, fwd) > 1.2 && Math.abs(V.dot(q, sideR)) < 0.5 + (V.dot(q, up) + vs[2]) * 0.18 ? skin : 0; } });
    }
    r.box(V.add(V.mad(J.pelvis, fwd, 2.6), [0, 0, -1.6]), [0.5, 2.4, 2.6], M.LEATHER, frameAlong(fwd, [0, 0, 1]));
  }
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
  const idleish = st.clip !== 'attack' && st.clip !== 'shoot' && st.clip !== 'death';
  if (imp && !look.knife && !look.sling && !look.staff && !look.unarmed && idleish) {
    // the spearling's guard: the spear held low across the body in both hands, the point forward-left
    handR = V.add(V.add(J.shR, V.mul(fwd, 3 + J.swingArm)), V.add(V.mul(up, -5.5), V.mul(sideR, 0.5)));
    bd = V.norm(V.add(V.add(V.mul(fwd, 0.8), V.mul(up, 0.25)), V.mul(sideR, -0.55)));
    handL = V.mad(handR, bd, 5);
  }
  if (look.digger && idleish) {   // art B2: the digger rests its pick on its shoulder, the head hooked over behind
    handR = V.add(V.add(J.shR, V.mul(fwd, 2.6 + J.swingArm * 0.6)), V.add(V.mul(up, -3.2), V.mul(sideR, 0.4)));
    bd = V.norm(V.add(V.add(V.mul(fwd, -0.55), up), V.mul(sideR, 0.1)));
  }
  if (knife && idleish) {   // the knifer: blade held low and forward, the off hand clawing
    handR = V.add(V.add(J.shR, V.mul(fwd, 4 + J.swingArm)), V.add(V.mul(up, -4.5), V.mul(sideR, 0.6)));
    bd = V.norm(V.add(V.mul(fwd, 1), V.mul(up, 0.35)));
    handL = V.add(V.add(J.shL, V.mul(fwd, 2.5 - J.swingArm)), V.add(V.mul(up, -4.5), V.mul(sideR, -1.2)));
  }
  let slingA = -1;   // the slinger: the sling hangs from the right hand; to shoot it whirls overhead and lets fly forward
  if (look.sling) {
    if (st.clip === 'shoot' && sw) {
      slingA = sw.a;
      handR = sw.a > 0.9 && !sw.hit ? V.add(V.add(J.shR, V.mul(fwd, 0.5)), V.add(V.mul(up, 4.5), V.mul(sideR, 0.6))) : V.add(V.add(J.shR, V.mul(fwd, 5)), V.add(V.mul(up, 0.5 + sw.a), V.mul(sideR, 0.3)));
    } else if (idleish) handR = V.add(V.add(J.shR, V.mul(fwd, 5 + J.swingArm)), V.add(V.mul(up, -2.5), V.mul(sideR, 1.6)));   // held out from the body so the sling hangs clear
    if (idleish) handL = V.add(V.add(J.shL, V.mul(fwd, 2.5 - J.swingArm)), V.add(V.mul(up, -5), V.mul(sideR, -1.3)));
  }
  if (cin) {   // the book clutched at the left hip, raised on the cast; the staff planted beside the right foot
    const ca = st.clip === 'cast' && sw ? sw.a : 0;
    handL = V.add(V.add(J.shL, V.mul(fwd, 2.4 + ca * 2.2)), V.add(V.mul(up, -4.4 + ca * 2.4), V.mul(sideR, -1.2)));
    if (idleish) { handR = V.add(V.add(J.shR, V.mul(fwd, 2.6 + J.swingArm * 0.8)), V.add(V.mul(up, -3.6), V.mul(sideR, 3.0))); bd = V.norm(V.add(V.add(up, V.mul(fwd, 0.1)), V.mul(sideR, 0.14))); }
  } else if (look.ember) {   // the off hand held out palm-up with a flame on it; thrust forward to cast
    const ca = st.clip === 'cast' && sw ? sw.a : 0;
    handL = V.add(V.add(J.shL, V.mul(fwd, 4.2 + ca * 2.5)), V.add(V.mul(up, -2.6 + ca * 1.5), V.mul(sideR, -1.6)));
  }
  const aR = armTo(J, J.shR, handR, B, 1), aL = armTo(J, J.shL, handL, B, -1);
  const ar = chunk ? [1.45, 1.15, 1.0, 1.5] : imp ? [1.15, 0.95, 0.9, 1.25] : gobLean ? [1.1, 0.95, 0.9, 1.3] : [1.4, 1.1, 0.9, 1.3];
  for (const [sh, a] of [[J.shR, aR], [J.shL, aL]]) { r.cone(sh, a.el, ar[0], ar[1], skin); r.cone(a.el, a.hand, ar[1], ar[2], skin); r.sph(a.hand, ar[3], skin); }
  // weapon: spear (warrior) or a staff with a glowing head (shaman)
  const g = aR.hand;
  if (look.sack) {   // a bulging sack on its back with coins spilling over the top
    const sc = V.add(V.mad(J.chest, up, 1), V.mul(fwd, -4.2));
    // art B2: a fatter sack tied at the neck, gold heaped out of its mouth, and a strap across the chest
    r.ell(sc, [3.8, 4.5, 4.8], M.CLOTH_TAN, frameAlong(fwd, up), { mf: p => { const z = V.dot(V.sub(p, sc), up); return z > 3.4 && z < 4.2 ? M.LEATHER : 0; } });
    for (const [a, b, c] of [[0.8, 1.1, 4.7], [-0.6, -1.3, 4.9], [0.2, 0, 5.6], [-0.9, 0.9, 5.1], [1.0, -0.8, 5.2]]) r.sph(V.add(V.add(V.mad(sc, fwd, a), V.mul(sideR, b)), V.mul(up, c)), 1.2, M.GOLD);
    for (const sd of [-1, 1]) r.cone(V.add(V.mad(J.chest, up, 2.6), V.mul(sideR, sd * 2.4)), V.add(V.mad(J.pelvis, up, 1.0), V.mul(sideR, -sd * 1.2)), 0.5, 0.5, M.LEATHER);
  }
  if (look.digger) {   // a pick: a wooden haft with a curved iron head across its tip, and a lamp at the belt
    r.cone(V.mad(g, bd, -2.5), V.mad(g, bd, 9.5), 0.75, 0.75, M.WOOD);   // art B2: a stouter haft and a bigger steel head that curves at both points
    const tip = V.mad(g, bd, 9.5), across = V.norm(V.cross(bd, sideR));
    r.group(() => { for (const sd of [-1, 1]) { const m = V.add(V.mad(tip, across, sd * 3.0), V.mul(bd, -0.6)); r.cone(tip, m, 1.25, 0.8, M.STEEL); r.cone(m, V.add(V.mad(tip, across, sd * 5.2), V.mul(bd, -2.2)), 0.8, 0.25, M.STEEL); } });
    const lp = V.add(V.mad(J.pelvis, sideR, -3.4), V.mul(fwd, 0.6));
    r.box(lp, [1.1, 1.1, 1.4], M.LAMP, null, { noShadow: true }); r.box(V.mad(lp, up, 1.8), [0.8, 0.8, 0.4], M.IRON);
  } else if (look.unarmed) { /* both hands free to clutch the sack */ }
  else if (gobPlain) {   // art B2: the goblin's dagger: a slender steel blade, a small iron guard, a leather grip
    r.cone(V.mad(g, bd, -1.4), V.mad(g, bd, 0.9), 0.7, 0.7, M.LEATHER);
    const kf = [bd, V.norm(V.cross(bd, up)), V.norm(V.cross(bd, V.cross(bd, up)))];
    r.ell(V.mad(g, bd, 1.2), [0.5, 1.5, 0.6], M.IRON, kf);
    r.group(() => { r.ell(V.mad(g, bd, 3.6), [2.5, 0.5, 1.05], M.STEEL, kf); r.cone(V.mad(g, bd, 5.6), V.mad(g, bd, 7.6), 0.9, 0.15, M.STEEL); });
  } else if (look.knife) {   // a short broad knife with a leather-wrapped grip
    r.cone(V.mad(g, bd, -1.6), V.mad(g, bd, 0.9), 0.75, 0.75, M.LEATHER);
    const kf = [bd, V.norm(V.cross(bd, up)), V.norm(V.cross(bd, V.cross(bd, up)))];
    r.sph(V.mad(g, bd, 1.2), 0.9, M.IRON);   // art A4: a guard, then a bigger pale leaf blade
    r.group(() => { r.ell(V.mad(g, bd, 4.2), [3.0, 0.6, 1.6], M.BLADE, kf); r.cone(V.mad(g, bd, 6.4), V.mad(g, bd, 8.8), 1.15, 0.15, M.BLADE); });
  } else if (look.sling) {   // two cords from the fist to a leather cup holding a stone
    let cup;
    if (slingA < 0) cup = V.add(V.mad(g, up, -7.2), V.add(V.mul(fwd, 2.8), V.mul(sideR, 1.4)));   // dangling ahead of the body, clear of it
    else if (slingA > 0.9) cup = V.add(V.mad(g, up, 2.4), V.add(V.mul(fwd, -2.6), V.mul(sideR, 4.2)));   // whirling high beside the head
    else cup = V.add(V.mad(g, fwd, 4.4), V.mul(up, 0.6));   // let fly
    // art A4: the cords bow out into a wide teardrop loop (thick enough to hold at 1x) round a grey stone
    const ax = V.norm(V.sub(cup, g)), sideC = V.norm(V.cross(ax, Math.abs(V.dot(ax, fwd)) > 0.9 ? up : fwd)), L = V.len(V.sub(cup, g));
    for (const sd of [-1, 1]) { const m = V.add(V.mad(g, ax, L * 0.6), V.mul(sideC, sd * 2.5)); r.cone(g, m, 0.9, 0.9, M.LEATHER, { noShadow: true }); r.cone(m, V.mad(cup, sideC, sd * 1.6), 0.9, 0.9, M.LEATHER, { noShadow: true }); }
    r.ell(cup, [1.8, 1.8, 1.2], M.LEATHER);
    if (!(st.clip === 'shoot' && sw && sw.hit)) r.sph(V.mad(cup, up, 0.8), 1.5, M.ROCK);
  }
  else if (cin) {
    // a tall crooked staff that kinks on the way up and hooks forward, a bronze bell swinging from the hook
    const out = V.norm(V.add(V.mul(fwd, -0.3), sideR));   // art B5 pass 4: hooked out and a little back, clear of the face in the three-quarter views   // the hook leans out to the right, so the bell hangs clear of the face
    const s0 = V.mad(g, bd, -11.5), s1 = V.add(V.mad(g, bd, 5), V.mul(fwd, 0.7)), s2 = V.add(V.mad(g, bd, 11.5), V.mul(fwd, -0.6)), s3 = V.add(V.mad(g, bd, 18.5), V.mul(fwd, 0.4));
    const h1 = V.add(V.mad(g, bd, 21), V.mul(out, 1.6)), h2 = V.add(V.mad(g, bd, 20.4), V.mul(out, 4.0));
    r.group(() => { r.cone(s0, s1, 0.95, 1.0, M.WOOD); r.cone(s1, s2, 1.0, 0.95, M.WOOD); r.cone(s2, s3, 0.95, 0.95, M.WOOD); r.cone(s3, h1, 0.95, 0.9, M.WOOD); r.cone(h1, h2, 0.9, 0.8, M.WOOD); });
    const fl = st.f || 0, ca = st.clip === 'cast' && sw ? sw.a : 0;
    const th = st.clip === 'walk' ? Math.sin(fl / 8 * Math.PI * 2) * 0.3 : st.clip === 'cast' ? 0.45 - ca * 0.5 : [0, 0.1, 0.16, 0.08][fl % 4];
    const dn = V.norm(V.add(V.mul(up, -Math.cos(th)), V.mul(fwd, Math.sin(th)))), b0 = V.mad(h2, dn, 1.4), bm = V.mad(h2, dn, 2.6), b1 = V.mad(h2, dn, 4.4);
    // a bronze bell: a brown dome flaring to a flat-mouthed skirt with a gold lip, lit orange from inside through
    // slots in its side, the glowing clapper hanging out of the mouth
    const bx = V.norm(V.cross(dn, sideR)), bs = V.norm(V.cross(dn, bx));
    r.group(() => {
      r.cone(b0, bm, 1.3, 1.75, M.LEATHER);
      r.cyl(bm, b1, 2.3, M.LEATHER, { mf: p => { const q = V.sub(p, h2), t = V.dot(q, dn); if (t > 3.8) return M.GOLD; const a = Math.atan2(V.dot(q, bs), V.dot(q, bx)); return t > 2.7 && t < 3.6 && Math.abs(((a * 3 / Math.PI) % 2 + 2) % 2 - 1) < 0.28 ? M.FIREM : 0; } });
    });
    r.cyl(V.mad(h2, dn, 0.2), b0, 0.9, M.IRON);   // the ring it hangs from
    r.sph(V.mad(b1, dn, 0.6), 1.15, M.LAMP, { noShadow: true });
    // the closed book: a leather cover, pale page edges along the front
    const bk = V.add(V.mad(aL.hand, fwd, 0.6), V.mul(up, 0.4)), bf = frameAlong(fwd, up);
    r.box(bk, [2.1, 1.0, 2.6], M.HAIR, bf, { mf: p => { const q = V.sub(p, bk); return V.dot(q, fwd) > 1.6 && Math.abs(V.dot(q, sideR)) < 0.6 && Math.abs(V.dot(q, up)) < 2.2 ? M.CLOTH_WHITE : 0; } });
  }
  else if (look.staff && look.ember) {
    // a crooked staff: it kinks twice on the way up and ends in a hook that cradles a glowing orb
    const xl = ash ? 3 : 0;   // art B4: the ashhex's staff stands taller, its hook well above the hood as in the concept
    const s0 = V.mad(g, bd, -8.5), s1 = V.mad(g, bd, 6), s2 = V.add(V.mad(g, bd, 11 + xl * 0.5), V.mul(fwd, -1)), s3 = V.add(V.mad(g, bd, 15.5 + xl), V.mul(fwd, 0.6));
    // art A4: a stouter staff whose hook curls right round the orb and down its front
    const h1 = V.add(V.mad(g, bd, 17.4 + xl), V.mul(fwd, 2.6)), h2 = V.add(V.mad(g, bd, 16.4 + xl), V.mul(fwd, 5.2)), h3 = V.add(V.mad(g, bd, 13.4 + xl), V.mul(fwd, 5.4));
    r.group(() => { r.cone(s0, s1, 0.95, 0.95, M.WOOD); r.cone(s1, s2, 0.95, 0.92, M.WOOD); r.cone(s2, s3, 0.92, 0.9, M.WOOD); r.cone(s3, h1, 0.9, 0.9, M.WOOD); r.cone(h1, h2, 0.9, 0.9, M.WOOD); r.cone(h2, h3, 0.9, 0.7, M.WOOD); });
    const orb = V.add(V.mad(g, bd, 13.6 + xl), V.mul(fwd, 2.8)), fl = st.f || 0;
    r.sph(orb, 1.75, M.FIREM, { noShadow: true, mf: p => V.dot(V.sub(p, orb), V.norm(V.add(up, V.mul(sideR, -0.5)))) > 0.5 ? M.LAMP : 0 });
    // the flame in the off hand: a yellow heart in an orange tongue that flickers, and grows to cast
    const hp = V.mad(aL.hand, up, 1.0), ca = st.clip === 'cast' && sw ? sw.a : 0, fh = (2.8 + [0, 0.6, 0.2, -0.3][fl % 4]) * (1 + ca * 0.5);
    const fm = V.add(V.mad(hp, up, fh * 0.45), V.mul(sideR, 0.4)), ft = V.add(V.mad(hp, up, fh), V.mul(sideR, [-0.5, 0.3, 0.6, -0.2][fl % 4]));
    const core = { noShadow: true, mf: p => V.dot(V.sub(p, hp), up) < fh * 0.42 ? M.LAMP : 0 };
    r.group(() => { r.cone(hp, fm, 1.3 * (1 + ca * 0.3), 1.0, M.FIREM, core); r.cone(fm, ft, 1.0, 0.2, M.FIREM, core); });
  } else if (look.staff) {
    // art B2, the goblin shaman: a stouter staff that forks into two hooked prongs round a bigger glowing orb,
    // with a bone fetish tied under the fork
    const sx = V.norm(V.cross(bd, up)), sxx = V.len(sx) > 0.1 ? sx : sideR;
    r.cone(V.mad(g, bd, -7.5), V.mad(g, bd, 7), 0.85, 0.8, M.WOOD);
    for (const sd of [-1, 1]) { const m = V.add(V.mad(g, bd, 8.8), V.mul(sxx, sd * 2.4)); r.cone(V.mad(g, bd, 6.8), m, 0.75, 0.65, M.WOOD); r.cone(m, V.add(V.mad(g, bd, 11.6), V.mul(sxx, sd * 1.0)), 0.65, 0.2, M.WOOD); }
    r.sph(V.mad(g, bd, 9.3), 2.0, M.MAGIC, { noShadow: true });
    r.sph(V.add(V.mad(g, bd, 5.6), V.mul(fwd, 0.9)), 0.8, M.BONE);
  } else if (imp) {   // art A4, the spearling's spear: a stouter haft bound with leather under a broad pale leaf-shaped head
    r.cone(V.mad(g, bd, -6.5), V.mad(g, bd, 9), 0.75, 0.75, M.WOOD);
    r.sph(V.mad(g, bd, 9), 0.95, M.LEATHER);
    const sf = [bd, V.norm(V.cross(bd, up)), V.norm(V.cross(bd, V.cross(bd, up)))];
    r.group(() => { r.ell(V.mad(g, bd, 11.4), [2.4, 1.6, 0.9], M.BLADE, sf); r.cone(V.mad(g, bd, 12.6), V.mad(g, bd, 15), 1.0, 0.15, M.BLADE); });
  } else {
    r.cone(V.mad(g, bd, -6), V.mad(g, bd, 9), 0.6, 0.6, M.WOOD);
    r.cone(V.mad(g, bd, 9), V.mad(g, bd, 12.5), 1.1, 0.25, M.IRON);
  }
  // head: big, with horns (or a goblin's long ears), yellow eyes, a dark mouth
  const hd = J.head, hf0 = r.p.length;
  if (imp) {
    // a squarer skull, wide across the brow and narrowing to a pointed chin, with angry slanted eyes
    const hf = frameAlong(fwd, up), fs = ash || cin ? M.BLOODY : skin;   // the ashhex's face sits in the hood's shadow
    r.group(() => {
      r.ell(V.mad(hd, up, 0.7), [3.6, 4.0, 3.0], fs, hf);   // wide across the brow
      r.ell(V.add(V.mad(hd, up, 1.4), V.mul(fwd, 1.2)), [2.6, 3.4, 1.6], fs, hf);   // a jutting brow ridge over the eyes
      r.cone(V.add(V.mad(hd, up, -0.6), V.mul(fwd, 0.8)), V.add(V.mad(hd, up, -3.1), V.mul(fwd, 2.2)), 2.6, 1.0, fs);
    });
    for (const s of [-1, 1]) {
      const e = V.add(V.add(V.mad(hd, fwd, 3.55), V.mul(sideR, s * 1.55)), V.mul(up, 0.7));
      r.ell(e, ash || cin ? [0.5, 1.15, 0.7] : look.ember ? [0.4, 0.95, 0.55] : [0.45, 1.15, 0.7], M.EYE_YEL,   // art B2: bigger glaring eyes (tied on the acolyte, kept as was)
        [fwd, V.norm(V.add(sideR, V.mul(up, s * 0.35))), V.norm(V.sub(up, V.mul(sideR, s * 0.35)))], { noShadow: true, bias: 1 });
      // big grey ears swept out and back, and a pale horn rising from the top of the head
      // art B2: bigger bat-like ears, raised higher and dusky purple as in the concepts
      const ea = V.add(V.mad(hd, up, 1.2), V.mul(sideR, s * 3.0)), eb = V.add(V.add(V.mad(hd, up, 3.6), V.mul(sideR, s * 6.4)), V.mul(fwd, -3.4));
      r.cone(V.mad(ea, fwd, -0.4), eb, 1.7, 0.25, M.CLOTH_PURPLE);   // art A4: dusty mauve, not blue-grey; the acolyte's ears are sleeved in its hood
      const ha = V.add(V.mad(hd, up, 3.0), V.mul(sideR, s * 1.6)), hb = V.add(V.add(V.mad(hd, up, 6.6), V.mul(sideR, s * 2.4)), V.mul(fwd, -1.0));
      if (cin) { if (s > 0) r.cone(V.add(V.mad(hd, up, 3.4), V.mul(sideR, 1.0)), V.add(V.add(V.mad(hd, up, 8.6), V.mul(sideR, 1.8)), V.mul(fwd, -1.6)), 1.5, 0.2, M.CLOTH_WHITE); }   // art B5: one white horn through the hood
      else if (ash) r.cone(ha, V.add(V.add(V.mad(hd, up, 8.4), V.mul(sideR, s * 2.8)), V.mul(fwd, -1.2)), 1.35, 0.2, M.CLOTH_WHITE);   // art B4: taller white horns clear of the hood
      else r.cone(ha, hb, 1.25, 0.2, M.BONE);   // art A4: cream horns, thick at the root
    }
  } else r.ell(hd, [3.8, 3.6, 3.4], skin, frameAlong(fwd, up), { mf: p => { const q = V.sub(p, hd); return V.dot(q, fwd) > 2.4 && Math.abs(V.dot(q, up) + 1.5) < 0.5 && Math.abs(V.dot(q, sideR)) < 1.6 ? M.DARK : 0; } });
  if (!imp) for (const s of [-1, 1]) {
    r.sph(V.add(V.add(V.mad(hd, fwd, 3.2), V.mul(sideR, s * 1.4)), V.mul(up, 0.6)), gob ? 0.8 : 0.6, M.EYE_YEL, { noShadow: true });   // art B2: goblins' eyes bigger
    if (look.digger) { r.sph(V.add(V.mad(hd, up, 0.4), V.mul(sideR, s * 3.2)), 1.2, skin); continue; }   // small round ears
    if (look.goblin) { if (s < 0) r.cone(V.add(V.mad(hd, fwd, 3.0), V.mul(up, -0.3)), V.add(V.mad(hd, fwd, 5.8), V.mul(up, -1.3)), 1.0, 0.3, skin);   // art B2: a long pointed nose
      const a = V.add(V.mad(hd, up, 0.8), V.mul(sideR, s * 3.0)); r.cone(a, V.add(V.add(a, V.mul(sideR, s * 5.6)), V.add(V.mul(up, 1.0), V.mul(fwd, -2.0))), 1.45, 0.2, skin); continue; }   // art B2: longer ears swept back
    const a = V.add(V.mad(hd, up, 2.4), V.mul(sideR, s * 2.2)), b = V.add(V.add(V.mad(hd, up, 4.6), V.mul(sideR, s * 3.8)), V.mul(fwd, -2.5));
    r.cone(a, b, 1.0, 0.3, M.HORN);
  }
  if (look.digger) {   // a long snout with a dark nose tip, and a dented iron cap with a brim
    r.ell(V.add(V.mad(hd, fwd, 3.4), V.mul(up, -0.8)), [2.4, 1.7, 1.5], M.CLOTH_TAN, frameAlong(fwd, up), { mf: p => V.dot(V.sub(p, hd), fwd) > 5.3 ? M.DARK : 0 });   // art B2: a pale mole snout
    r.box(V.add(V.mad(hd, up, 2.4), V.mul(fwd, 3.5)), [0.7, 0.9, 0.9], M.LAMP, frameAlong(fwd, up), { noShadow: true, bias: 1 });   // and a candle lamp on the cap
    r.ell(V.mad(hd, up, 2.3), [3.6, 3.5, 2.2], M.SLATE, frameAlong(fwd, up));   // art B2: a smaller blued cap riding higher, eyes clear
    r.cyl(V.mad(hd, up, 1.4), V.mad(hd, up, 1.8), 4.2, M.SLATE);
  }
  if (look.hood && cin) {   // art B5: a deep charcoal cowl pulled low over the brow, its opening rimmed in gold
    const hf = frameAlong(fwd, up), hc = V.add(V.mad(hd, up, 1.3), V.mul(fwd, -0.8));
    r.group(() => {
      // art B5 pass 3: a thin gold ring round the opening, the inside of the cowl in deep shadow
      r.ell(hc, [4.3, 4.4, 4.1], cinM, hf, { mf: p => { const q = V.sub(p, hc), f = V.dot(q, fwd); return V.dot(q, up) < -1.8 ? 0 : f > 3.55 ? M.DARK : f > 2.95 ? M.GOLD : 0; } });
      r.ell(V.add(V.mad(hd, up, 3.1), V.mul(fwd, 1.4)), [2.5, 3.3, 1.4], cinM, hf);   // the peak over the brow
      r.cone(V.add(V.mad(hd, up, 2.6), V.mul(fwd, -3.6)), V.add(V.mad(hd, up, 0.0), V.mul(fwd, -6.0)), 1.8, 0.4, cinM);   // the hood's tail behind
    });
  } else if (look.hood && ash) {   // art B4: a big ochre cowl pulled forward over the brow, its opening rimmed dark
    const hf = frameAlong(fwd, up), hc = V.add(V.mad(hd, up, 1.2), V.mul(fwd, -1.0));
    r.group(() => {
      r.ell(hc, [4.1, 4.3, 3.9], ashM, hf, { mf: p => { const q = V.sub(p, hc); return V.dot(q, fwd) > 3.4 && V.dot(q, up) > -1.5 ? M.CLOTH_DARK : 0; } });
      r.ell(V.add(V.mad(hd, up, 3.0), V.mul(fwd, 1.4)), [2.4, 3.2, 1.3], ashM, hf);   // the peak over the brow
      r.cone(V.add(V.mad(hd, up, 2.4), V.mul(fwd, -3.6)), V.add(V.mad(hd, up, 0.2), V.mul(fwd, -5.8)), 1.7, 0.4, ashM);   // the hood's tail behind
    });
  } else if (look.hood && look.ember) {   // a deep purple hood pulled forward over the brow, open at the face
    const hf = frameAlong(fwd, up);
    r.group(() => {
      r.ell(V.add(V.mad(hd, up, 1.3), V.mul(fwd, -1.5)), [3.9, 4.1, 3.8], M.CLOTH_PURPLE, hf);   // art B2: set back so more of the face shows
      r.ell(V.add(V.mad(hd, up, 2.9), V.mul(fwd, 1.0)), [2.2, 3.0, 1.2], M.CLOTH_PURPLE, hf);   // the peak over the brow
      r.cone(V.add(V.mad(hd, up, 2.2), V.mul(fwd, -3.4)), V.add(V.mad(hd, up, 0.6), V.mul(fwd, -5.6)), 1.6, 0.4, M.CLOTH_PURPLE);   // the hood's tail behind
    });
  } else if (look.hood) r.ell(V.add(V.mad(hd, up, 0.8), V.mul(fwd, -0.8)), [4.2, 4.2, 3.8], M.CLOTH_PURPLE, frameAlong(fwd, up));
  if (look.goblin && !look.chief) {   // art B2: a round leather helmet down over the brow, with a rim (concept "GOBLIN")
    r.ell(V.add(V.mad(hd, up, 2.6), V.mul(fwd, -0.5)), [3.7, 3.5, 2.3], M.LEATHER, frameAlong(fwd, up));
    r.ell(V.add(V.mad(hd, up, 2.05), V.mul(fwd, 0.3)), [3.7, 3.6, 0.45], M.LEATHER, frameAlong(fwd, up));
  }
  if (look.chief) {   // the chieftain: a crude gold crown and a bone necklace
    const cc = V.mad(hd, up, 2.7);   // art B2: a narrower crown riding higher so the face shows, five tall points
    r.cyl(cc, V.mad(cc, up, 1.0), 2.8, M.GOLD);
    for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2, b = V.add(V.mad(cc, up, 0.9), V.add(V.mul(fwd, Math.cos(a) * 2.5), V.mul(sideR, Math.sin(a) * 2.5))); r.cone(b, V.mad(b, up, 2.6), 0.75, 0.15, M.GOLD); }
  }
  if (look.chief) {   // art B2: the bone necklace the comment always promised: fangs strung round the neck
    const nc = V.mad(J.chest, up, 3.0);
    for (let k = -3; k <= 3; k++) { const a = k * 0.42, p = V.add(V.mad(nc, fwd, Math.cos(a) * 3.3), V.mul(sideR, Math.sin(a) * 3.6)); r.cone(p, V.add(V.mad(p, up, -1.6), V.mul(fwd, 0.4)), 0.6, 0.2, M.BONE, { noShadow: true }); }
  }
  bigHead(r, hf0, hd, cin ? 1.0 : ash ? 1.05 : imp && !look.ember ? 1.4 : 1.3);   // art B2: the imps' heads a little bigger, as in the concepts; art B4: the ashhex's kept near true size (no bobblehead)
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
  // art B2: per-monster refinements, keyed by look.b2 ('wolf', 'alpha', 'hound', 'ember', 'bear', 'boar') so no other look changes
  const B2 = look.b2 || '', hog = B2 === 'boar';
  // art B4: GF = Greyfang, the Alpha (look.b2 'alpha' + look.gf); GS = the Gravespine Hound (look.b2 'gs')
  const GF = !!look.gf, GS = B2 === 'gs';
  const MB = !!look.moss;   // art B5: Old Mossback (secret boss): a huge hunched bear with moss and mushrooms over the back
  let bob = 0, lunge = 0, headDrop = 0, jaw = 0.25, ph = 0, moving = false;
  if (clip === 'idle') bob = [0, -0.3, -0.5, -0.2][f % 4];
  if (clip === 'walk') { ph = f / 8 * Math.PI * 2; moving = true; bob = -0.8 * Math.abs(Math.sin(ph)); }
  if (clip === 'attack') {
    const a = st.key.a; lunge = (1 - a) * 3.5; headDrop = a > 0.5 ? -1 : 1; jaw = a > 0.5 ? 0.9 : st.key.hit ? 0.1 : 0.6; bob = a > 0.5 ? -1.2 : 0;
    if (a > 1.1) { lunge = -2.6; bob = -3; headDrop = -2.2; jaw = 0.45; }   // round 34: coiled low on the haunches, head down, snarling
    else if (st.key.mv > 0 || st.key.hit) { lunge = 4.6; bob = 1.2; headDrop = 1.6; }   // stretched out at full length, airborne
  }
  if (clip === 'hit') { lunge = -2; headDrop = -1.5; jaw = 0.6; }
  // art A4: lean (wolf, bone hound, ember hound): a longer, slimmer body set higher on long thin legs, as the concepts draw them
  const lean = !!look.lean, H = lean ? 13.5 : hog ? 10 : MB ? 9.2 : 11;   // (b5 v3) Mossback: long and low on short legs
  const back = [(lean ? -6.5 : MB ? -6.8 : -4.5) + lunge, 0, H + bob], front = [(lean ? 5.5 : MB ? 5.6 : 5) + lunge, 0, H + (lean ? 1.6 : 2.5) + bob];   // compact and front-heavy unless lean
  // art A3 looks (set only on their own entries): plates (bone hound: bone plates down the back, a furred
  // tail), ember (ember hound: glowing slashes on the flanks, dark lower legs), pale (wolf: light muzzle)
  const mid = V.lerp(back, front, 0.5);
  // art B5: Mossback's moss is painted onto the fur itself, down to a ragged edge with long drips on the flanks
  const mossMf = (c, lo = 0) => look.mossy ? { mf: p => { const dr = 3.6 * Math.max(0, Math.cos(p[0] * 1.5 + (p[1] > 0 ? 1.7 : 0))) ** 3 + 0.9 * Math.sin(p[0] * 4.1 + p[1] * 1.7) + 0.6 * Math.sin(p[0] * 9.3 - p[1] * 3.1); return p[2] > c[2] + 0.4 - lo - Math.abs(p[1]) * 0.12 - dr ? M.GRASSM : 0; } } : undefined;
  // art B5 fur (Mossback only): normals blend toward one big body shape, so the stacked ellipsoids shade as a
  // single mass instead of a cluster of balls, and the tone breaks into streaky clumps running back and down
  const furStroke = P => {   // short irregular clumps laid in staggered rows that run back and down, like strokes of fur
    const c = P[2] * 1.3 + P[0] * 0.3 + Math.abs(P[1]) * 0.5, row = Math.floor(c), col = Math.floor((P[0] * 0.8 - P[2] * 0.45) * 0.7 + row * 0.47 + Math.sin(P[1] * 0.8) * 0.6);
    const h = Math.sin(row * 12.9898 + col * 78.233) * 43758.5453, f = h - Math.floor(h);
    return f < 0.3 ? -1 : f > 0.8 ? 1 : 0; };
  const furC = V.add(mid, [0.4, 0, 1.2]), furR = [12.5, 7.0, 6.8];
  const furFF = (P, n) => { const q = V.sub(P, furC), g = V.norm([q[0] / furR[0] ** 2, q[1] / furR[1] ** 2, q[2] / furR[2] ** 2]); return { n: V.norm(V.add(V.mul(n, 0.25), V.mul(g, 0.75))), b: furStroke(P) }; };
  const fo = o => MB ? { ...(o || {}), ff: furFF } : o;
  const emberMf = look.ember ? { mf: p => { const q = V.sub(p, mid); if (Math.abs(q[1]) < (look.lean ? 2.3 : 3.6) || q[2] < -1.5 || q[2] > 3.2) return 0; const u = q[0] + q[2] * 0.55; for (const c of [-2.2, 0, 2.2]) if (Math.abs(u - c) < 0.5) return M.FIREM; return 0; } } : undefined;
  r.group(() => {
    if (lean) {   // deep narrow chest, a tucked-up waist, lean haunches
      // bib (wolf): a pale chest and belly, as the concept paints it
      const bib = look.bib ? { mf: p => { const q = V.sub(p, front); return (q[0] > 2.2 && q[2] < 1.2) || q[2] < -3.6 ? M.CLOTH_WHITE : 0; } } : undefined;
      r.ell(V.add(back, [0, 0, 0.3]), [5.0, 4.0, 3.9], skin);
      r.ell(V.add(mid, [0, 0, 0.5]), [5.8, 3.8, 3.6], skin, null, emberMf || (look.bib ? { mf: p => p[2] < mid[2] - 2.4 ? M.CLOTH_WHITE : 0 } : undefined));
      r.ell(front, [5.4, 4.8, 5.4], skin, null, bib);
    } else {
    const wy = MB ? 1.35 : 1;   // (b5 front) Mossback is a wide dome seen from the front
    r.ell(back, [5.2, 5.0 * wy, 4.4], skin, null, fo(mossMf(V.add(back, [0, 0, 1.2]))));
    r.ell(mid, [5.6, 5.2 * wy, 4.6], skin, null, fo(emberMf || mossMf(mid)));
    r.ell(front, [5.8, 6.2 * wy, 5.8], skin, null, fo(mossMf(V.add(front, [-1, 0, 0]), MB ? 2.6 : 1.6)));
    if (B2 === 'bear') r.ell(V.add(front, [-1.2, 0, 4.2]), [4.6, 4.8 * wy, 3.4], skin, null, fo(mossMf(V.add(front, [0, 0, 1.4]), 3.6)));   // b2: the bear's shoulder hump ((b5 redo) mossed on Mossback; mossMf is a no-op otherwise)
    if (look.mossy) r.ell(V.add(front, [-0.8, 0, 5.4]), [5.8, 6.2, 3.8], skin, null, mossMf(V.add(front, [0, 0, 1.4]), 3.6));   // b5: Mossback's great shoulder hump ((b5 redo) moss runs down over the shoulders)
    if (hog) r.ell(V.add(mid, [0, 0, 0.4]), [6.4, 5.8, 5.0], skin);   // b2: the boar's barrel
    }
  });
  const bodyPart = r.part;   // (b5 redo) Mossback's legs join this part, so body and limbs read as one bear
  if (MB) {   // (b5 fur) a shaggy outline: short tufts along the back, rump, shoulders and belly, part of the body
    r.part = bodyPart; r.lock = true;
    for (let i = 0; i < 14; i++) {   // along the spine, short and swept back (taller ones read as spines)
      const t = i / 13, b = V.lerp(V.add(back, [-1.5, 0, 3.6]), V.add(front, [0.5, 0, 4.9]), t), y = ((i * 5) % 3 - 1) * 1.6;
      r.cone(V.add(b, [0, y, 0]), V.add(b, [-1.7, y * 1.2, 0.5 + (i % 3) * 0.25]), 1.2, 0.35, skin, { ff: furFF });
    }
    for (const sd of [-1, 1]) for (let i = 0; i < 6; i++) {   // down the flanks and under the belly, pointing down and back
      const b = V.lerp(V.add(back, [0, sd * 4.0, -2.0]), V.add(front, [-1, sd * 4.4, -2.6]), i / 5);
      r.cone(b, V.add(b, [-1.4, sd * 0.8, -1.6 - (i % 2) * 0.5]), 1.0, 0.2, skin, { ff: furFF });
    }
    r.lock = false;
  }
  if (look.mossy) {   // b5: mushrooms on the moss (b5 v2: the user's plain-bear concept drops them; kept as optional flavor)
    const mh = V.add(front, [-0.8, 0, 9.0]), mb = V.add(mid, [-0.6, 0, 4.4]);
    // (b5 redo) no heaped clumps or hanging hanks: they read as warts. The moss is painted on the fur.
    // a cascade of three down the right shoulder, as the concept draws them, and two more on the back
    for (const [b, h, cr] of [[V.add(mh, [1.0, 3.0, -0.6]), 2.4, 2.8], [V.add(mh, [-0.8, 4.2, -2.6]), 1.9, 2.0], [V.add(mh, [-2.4, 5.0, -4.6]), 1.5, 1.6], [V.add(mb, [-0.6, -1.8, 0.6]), 1.8, 1.9], [V.add(mb, [-3.4, -0.6, -0.2]), 1.2, 1.3]]) {
      const top = V.add(b, [0, Math.sign(b[1]) * 0.5, h]);
      r.cone(b, top, 0.75, 0.6, M.CLOTH_WHITE);
      r.ell(V.add(top, [0, 0, 0.35]), [cr, cr, 0.75], M.CLOTH_TAN, null, { mf: p => p[2] < top[2] + 0.15 ? M.HAIR : 0 });   // (b5 redo) tan caps, as the concept
    }
  }
  if (hog) for (let i = 0; i < 6; i++) {   // b2: a dark bristle crest from the nape down the spine
    const b = V.lerp(front, back, i / 6), base = V.add(b, [0, 0, 4.4 + (i < 3 ? 1 : 0.3) - i * 0.15]);
    r.cone(base, V.add(base, [-2.0, 0, 3.8 - i * 0.45]), 1.1, 0.2, M.HAIR);
  }
  if (GF) {   // art B4: Greyfang's mane, a big shaggy ruff of cream tufts over the neck and shoulders, spiking back and out
    const mc = V.add(front, [2.6, 0, 2.2]);
    r.group(() => {
      r.ell(V.add(mc, [-0.6, 0, 1.0]), [5.2, 6.4, 5.4], M.BONE);
      r.ell(V.add(mc, [2.6, 0, -3.4]), [3.0, 4.2, 3.6], M.BONE);   // the mane runs down the chest
      for (const [dx, rr, n, a0] of [[2.6, 5.6, 7, 0], [-0.4, 6.6, 9, 0.15], [-3.6, 6.0, 7, 0]]) for (let k = 0; k < n; k++) {
        const a = -1.95 + a0 + (k + 0.5) / n * 3.9, d = [0, Math.sin(a), Math.cos(a)], base = V.add(V.add(mc, [dx, 0, 0.8]), V.mul(d, rr - 1.8));
        r.cone(base, V.add(V.add(base, V.mul(d, 3.4 + (k % 2) * 1.4)), [-3.8, 0, -0.4]), 2.0, 0.2, M.BONE);
      }
    });
  }
  else if (B2 === 'alpha') for (let i = 0; i < 4; i++) {   // b2: the Alpha's raised hackles, a crest of big fur tufts over neck and shoulders
    const b = V.lerp(front, back, i / 5), base = V.add(b, [2, 0, 4.2 - i * 0.3]);
    r.cone(base, V.add(base, [-3.4, 0, 3.6 - i * 0.6]), 2.0, 0.4, M.HIDE);   // silver-grey: a lighter mane over the dark coat
  }
  // bone ribs over the barrel of the body and a spiked spine (a wolf has fur instead)
  const fur = !!look.wolf, bare = fur || look.plates || look.ember;   // bare: no ribs, spine or spikes
  for (let i = 0; i < (bare ? 0 : 4); i++) {
    const x = front[0] - 1.5 - i * 2.2, z = H + 1.8 + bob - i * 0.3;
    for (const s of [-1, 1]) r.group(() => {
      r.cone([x, 0, z + 4.4], [x - 0.6, s * 5.0, z + 0.8], 0.8, 0.75, bone);
      r.cone([x - 0.6, s * 5.0, z + 0.8], [x + 0.4, s * 4.4, z - 2.6], 0.75, 0.6, bone);
    });
  }
  if (!bare) r.cone(V.add(back, [-3, 0, 4.2]), V.add(front, [0, 0, 5]), 1.1, 1.2, bone);   // spine
  if (GS) for (let i = 0; i < 4; i++) {   // art B4 Gravespine: a row of curved bone plates along the spine, each hooking back
    const b = V.add(V.lerp(back, front, 0.05 + i * 0.27), [0, 0, 3.6 + (i === 3 ? 1.4 : 0)]), k = 1.0 + i * 0.08;
    r.group(() => {
      r.ell(V.add(b, [0, 0, 1.0 * k]), [1.4 * k, 3.6 * k, 1.9 * k], bone, frameAlong(V.norm([1, 0, 0.6]), [0, 0, 1]));
      r.ell(V.add(b, [-1.6 * k, 0, 2.6 * k]), [1.1 * k, 2.6 * k, 1.5 * k], bone, frameAlong(V.norm([1, 0, 1.4]), [0, 0, 1]));   // the curled-back top of the plate
    });
  }
  else if (look.slabs) for (let i = 0; i < 4; i++) {   // art A4: four broad bone slabs lying across the shoulders and back, overlapping like scales
    const c = V.add(V.lerp(back, front, 0.22 + i * 0.22), [0, 0, (lean ? 3.9 : 4.4) + i * 0.35]);
    r.ell(c, [1.6, 4.6, 1.3], bone, frameAlong(V.norm([1, 0, 0.45]), [0, 0, 1]));
  }
  else if (look.plates) for (let i = 0; i < 4; i++) {   // four flat bone plates standing along the back, leaning back
    const c = V.add(V.lerp(back, front, 0.05 + i * 0.26), [0, 0, 5.2 - Math.abs(i - 1.5) * 0.3]);
    r.ell(c, [1.1, 3.4, 2.3], bone, frameAlong(V.norm([1, 0, 0.8]), [0, 0, 1]));
  }
  for (let i = 0; i < (bare ? 0 : 5); i++) { const b = V.lerp(back, front, 0.05 + i * 0.22); const base = V.add(b, [0, 0, 4.6]); r.cone(base, V.add(base, [-2.4, 0, 3.6 - Math.abs(i - 2) * 0.6]), 1.1, 0.25, bone); }
  // tail: bony and spiked
  const t0 = V.add(back, [-5, 0, 1.5]), t1 = V.add(t0, [-4, 0, 2 + Math.sin(ph) * 1.5]), t2 = V.add(t1, [-3, Math.cos(ph) * 1.2, -1]);
  if (fur && look.bear) r.sph(V.add(back, [MB ? -5.0 : -5.5, 0, 2.5]), MB ? 1.0 : 1.8, skin);   // a bear's stub of a tail
  else if (hog) r.group(() => { const q0 = V.add(back, [-4.8, 0, 2]), q1 = V.add(q0, [-1.6, 0, -1.6]), q2 = V.add(q1, [-0.6, Math.cos(ph) * 0.8, -1.8]); r.cone(q0, q1, 1.0, 0.9, skin); r.cone(q1, q2, 0.9, 0.9, M.HAIR); });   // b2: a thin tail with a dark tuft
  else if (look.brush) {   // art A4: a bushy tail held out behind, thick in the middle, with a big pale tip
    const b0 = V.add(back, [-4.2, 0, 1.6]), b1 = V.add(b0, [-4, 0, 1.6 + Math.sin(ph) * 1.2]), b2 = V.add(b1, [-4.4, Math.cos(ph) * 1.2, 0.4]);
    r.group(() => { r.cone(b0, b1, 1.5, 2.5, skin); r.cone(b1, b2, 2.5, 1.0, skin, { mf: p => V.dot(V.sub(p, b1), V.sub(b2, b1)) > 9 ? M.CLOTH_WHITE : 0 }); });
  }
  else if (look.plates || look.ember) r.group(() => { r.cone(t0, t1, 1.6, 2.1, skin); r.cone(t1, t2, 2.1, 0.6, skin, { mf: p => V.dot(V.sub(p, t1), V.sub(t2, t1)) > 6 ? M.CLOTH_WHITE : 0 }); });   // a furred tail with a pale tip
  else if (fur) r.group(() => { r.cone(t0, t1, 1.8, 2.2, skin); r.cone(t1, t2, 2.2, 0.6, skin, { mf: p => V.dot(V.sub(p, t1), V.sub(t2, t1)) > 6 ? M.CLOTH_WHITE : 0 }); });
  else r.group(() => { r.cone(t0, t1, 1.4, 1.0, skin); r.cone(t1, t2, 1.0, 0.5, bone); });
  // legs (trot: diagonal pairs move together); bone caps at the joints and bone claws
  let lw = lean ? 0.8 : 1, LL = lean ? 6.6 : hog ? 5.1 : 5.8;   // lean: legs set closer, longer and thinner
  if (MB) lw *= 1.4;   // (b5 front) a wide stance
  const legs = [[front, -3.6 * lw, 0, 1], [front, 3.6 * lw, Math.PI, 1], [back, -3.4 * lw, Math.PI, -1], [back, 3.4 * lw, 0, -1]];
  for (const [root, y, off, fr] of legs) {
    const hip = V.add(root, [fr > 0 ? 1 : 0, y, -1.5]);
    const p = ph + off, stride = moving ? (lean ? 4.4 : 3.6) : 0;
    let foot = [hip[0] - stride * Math.cos(p) + (fr > 0 ? 0.5 : -0.5), y * 1.15, moving ? 2.2 * Math.max(0, Math.sin(p)) : 0];
    if (clip === 'attack' && fr > 0) foot = [hip[0] + 2, y * 1.15, 0];
    const L = ik(hip, V.add(foot, [0, 0, 1]), LL, LL, [-fr, 0, 0]);
    const lk = MB ? 1.45 : B2 === 'bear' ? 1.2 : GF ? 1.0 : lean ? 0.8 : 1, low = look.ember ? M.HIDE : MB ? skin : hog || B2 === 'bear' ? M.HAIR : skin;   // the ember hound's legs darken below the knee
    const pSave = r.part; if (MB) { r.part = bodyPart; r.lock = true; }   // (b5 redo) one smooth body: no seams between body, thigh, shin and paw
    const legFF = MB ? { ff: P => ({ b: furStroke(P) }) } : {};   // (b5 fur) the clumps carry on down the legs
    r.cone(hip, L.joint, 2.7 * lk, 2.0 * lk, skin, legFF); r.cone(L.joint, L.end, 2.0 * lk, 1.7 * lk, low, legFF);
    if (!bare) r.sph(L.joint, 1.8, bone);
    r.ell(V.add(L.end, [1.2, 0, -0.4]), [2.6 * lk, 2.0 * lk, 1.1], low, null, look.paws ? { mf: p => p[0] > L.end[0] + 1.2 ? M.BONE : 0 } : undefined);   // art A4 paws: cream toes
    if (MB) { r.lock = false; r.part = pSave; }
    if (MB) for (const c of [-1, 0, 1]) r.cone(V.add(L.end, [3.2, c * 1.5, -0.3]), V.add(L.end, [5.4, c * 1.8, -1.1]), 0.8, 0.2, bone, { noShadow: true });   // b5: big cream claws
    else for (const c of [-1, 0, 1]) r.cone(V.add(L.end, [3, c * 1.1, -0.5]), V.add(L.end, [4.8, c * 1.4, -1]), 0.55, 0.15, bone, { noShadow: true });
  }
  // neck, collar and scarf
  const neck = V.add(front, [3.5, 0, 2.5]);
  const hd = V.add(front, MB ? [8.4, 0, 2.0 + headDrop] : [7.5, 0, 1.2 + headDrop]);   // (b5 redo) Mossback's head held further out and up
  if (MB) { const pS = r.part; r.part = bodyPart; r.lock = true; r.cone(neck, V.lerp(neck, hd, 0.7), 4.6, 3.4, skin, { ff: furFF }); r.lock = false; r.part = pS; }   // (b5 fur) a thick neck that is part of the body, not a separate dome
  const hr0 = r.p.length;   // head parts are scaled up about the head center below
  if (!MB) r.cone(neck, hd, 3.4, 2.8, skin);
  const cc = V.lerp(neck, hd, 0.35);
  if (!fur && !look.ember) r.ell(cc, [1.6, 4.4, 4.0], M.LEATHER, frameAlong(V.sub(hd, neck)));
  if (!fur && !look.ember) for (const a of [-0.9, 0, 0.9]) r.sph(V.add(cc, [0.9, Math.sin(a) * 4.3, -Math.cos(a) * 3.6]), 0.9, M.GOLD, { noShadow: true });
  if (GS) {   // art B4 Gravespine: a studded iron collar, and a ragged dark red cloth over the shoulders
    const nd = V.sub(hd, neck);
    r.ell(cc, [1.7, 4.3, 4.0], M.IRON, frameAlong(nd));
    for (let k = 0; k < 7; k++) { const a = (k - 3) * 0.75; r.sph(V.add(cc, [0.4, Math.sin(a) * 4.3, Math.cos(a) * 3.9]), 0.95, M.STEEL, { noShadow: true }); }
    const cp = V.add(front, [0.4, 0, 2.4]);
    r.group(() => {
      r.ell(cp, [4.8, 5.0, 3.0], M.MARK);
      for (const s of [-1, 1]) for (let k = 0; k < 5; k++) {   // torn strips hanging down each flank, uneven lengths
        const t = V.add(cp, [-3.6 + k * 1.8, s * 4.3, -0.4]), L = [4.6, 6.4, 5.0, 7.0, 4.2][k];
        r.cone(t, V.add(t, [-0.6, s * 1.0, -L]), 1.35, 0.35, M.MARK);
      }
    });
  }
  else if (GF) { /* the mane is the ruff */ }
  else if (look.ember) { /* no ruff, no scarf */ }
  else if (MB) { const pS = r.part; r.part = bodyPart; r.lock = true; r.ell(V.add(front, [3.0, 0, 2.6]), [3.4, 6.6, 3.6], skin, null, { ff: furFF }); r.lock = false; r.part = pS; }   // (b5 fur) the ruff joins the body: no separate dome, no white underside
  else if (fur) r.ell(V.add(front, [3.5, 0, 3]), [3.4, 5.4, 3.6], skin, null, { mf: look.bib ? p => p[2] < front[2] + 3.2 && p[0] > front[0] + 4.2 ? M.CLOTH_WHITE : 0 : p => p[2] < front[2] + 1 ? M.CLOTH_WHITE : 0 });   // a ruff of fur
  else r.group(() => {
    r.ell(V.add(front, [3.2, 0, 3.6]), [2.8, 5.0, 2.6], M.CLOTH_RED);
    for (const s of [-1, 1]) r.box(V.add(front, [2.6, s * 5.0, -0.4]), [1.4, 0.5, 2.6], M.CLOTH_RED, frameAlong([1, 0, 0], [0, -s * 0.25, 1]), { mf: p => p[2] < front[2] - 4 && hash(Math.round(p[0] * 1.5), 3, 1) < 0.5 ? M.MARK : 0 });
  });
  // skull head: bone cranium and snout, dark socket with a red eye, jaw with teeth
  const hb = GS ? bone : fur ? skin : bone;   // art B4: the Gravespine wears a bone skull mask over a furred body
  const cheek = B2 === 'wolf';   // b2: the wolf's pale cheek under the eye, as the concept paints it
  if (MB) { r.part++; r.lock = true; }   // (b5 redo) cranium, snout and jaw read as one head
  r.ell(hd, MB ? [3.0, 3.7, 2.8] : [3.8, 3.3, 3.1], hb, null, { ...(MB ? { ff: P => ({ b: furStroke(P) }) } : {}), mf: p => { const q = V.sub(p, hd); if (!MB && q[0] > 1.2 && (Math.abs(q[1]) - 1.8) ** 2 + (q[2] - 0.7) ** 2 < 1.4) return M.DARK; if (MB && q[0] > 1.2 && Math.abs(q[1] - 0.25 + (q[2] - 1.6) * 0.25) < 0.32 && q[2] > 1.1 && q[2] < 2.7) return M.CLOTH_WHITE;   // (b5 front) the pale forehead scar
    if (MB && q[0] > 1.6 && Math.abs(q[1]) > 0.5 && Math.abs(q[1]) < 2.6 && Math.abs(q[2] - (1.55 - Math.abs(q[1]) * 0.28)) < 0.28) return M.DARK;   // (b5 front) an angry brow, low over the eyes   // art B5: Mossback's pale scar slashed across the brow
    if (GF && Math.abs(q[2] - 0.7 + (q[0] - 2.4) * 0.9) < 0.6 && q[1] > 0.4 && q[0] > 0.2) return M.CLOTH_RED;   // art B4: Greyfang's scar across his right eye
    return cheek && q[2] < -0.6 && q[0] > -0.5 ? M.CLOTH_WHITE : 0; } });
  const snL = MB ? 2.7 : B2 === 'bear' ? 3.9 : hog ? 4.6 : 5.8, snoutEnd = V.add(hd, [snL, 0, hog ? -0.5 : MB ? -1.5 : -0.9]);
  r.cone(V.add(hd, MB ? [1.6, 0, -0.9] : [1.5, 0, -0.3]), snoutEnd, hog ? 2.5 : MB ? 1.55 : 2.3, hog ? 2.0 : MB ? 1.35 : B2 === 'bear' ? 1.8 : 1.5, hb, { mf: p => {
    if (B2 === 'bear' && p[0] > hd[0] + (MB ? 1.8 : 2.6)) return M.CLOTH_TAN;   // b2: the bear's tan muzzle
    if (GF && p[1] > 0.4 && p[0] < hd[0] + 4.2 && Math.abs(p[2] - hd[2] + (p[0] - hd[0] - 2.4) * 0.9 - 0.7) < 0.6) return M.CLOTH_RED;   // the scar runs on down the snout
    if (GF && p[0] > hd[0] + 3.6) return M.CLOTH_SHADOW;   // art B4: Greyfang's dark muzzle
    if (!B2 && p[0] > snoutEnd[0] - 1 && Math.abs(p[1]) < 0.7 && p[2] > snoutEnd[2]) return M.DARK;
    return look.pale && p[2] < snoutEnd[2] + 0.3 ? M.CLOTH_WHITE : 0;   // the wolf's pale muzzle
  } });
  if (hog) r.cyl(V.add(snoutEnd, [-0.2, 0, 0]), V.add(snoutEnd, [0.6, 0, 0]), 1.9, M.SKIN, { mf: p => p[0] > snoutEnd[0] + 0.3 && Math.abs(Math.abs(p[1]) - 0.8) < 0.45 && Math.abs(p[2] - snoutEnd[2]) < 0.6 ? M.DARK : 0 });   // b2: the boar's flat pink snout disc with two nostrils
  else if (B2) r.sph(V.add(snoutEnd, MB ? [0.6, 0, 0.75] : [0.2, 0, 0.5]), MB ? 0.75 : 1.05, M.CLOTH_DARK, { noShadow: true });   // b2: a black nose on the tip
  const jl = MB ? 2.6 : B2 === 'bear' ? 4.4 : hog ? 4.4 : 6;
  const jd = V.norm([Math.cos(jaw), 0, -Math.sin(jaw)]), j0 = V.add(hd, [0.8, 0, -2.2]);
  r.cone(j0, V.mad(j0, jd, jl), 1.6, 1.0, hb, { bias: -1 });
  if (MB) r.lock = false;
  r.box(V.lerp(j0, V.mad(j0, jd, jl), 0.55), [2.2 * jl / 6, 1.1, 0.5], M.DARK, frameAlong(jd), { noShadow: true });
  if (!MB) for (let t = 0; t < (jl < 6 ? 2 : 3); t++) for (const s of [-1, 1]) r.cone(V.add(hd, [2.4 + t * 1.3, s * 1.2, -2]), V.add(hd, [2.4 + t * 1.3, s * 1.1, -3]), 0.4, 0.15, M.BONE, { noShadow: true });
  for (const s of [-1, 1]) {
    r.sph(V.add(hd, MB ? [3.2, s * 1.7, 0.9] : [2.7, s * 1.9, 0.8]), MB ? 0.5 : 0.65, look.eye || M.EYE_RED, { noShadow: true });   // (b5 redo) Mossback: small bear eyes, no dark socket
    if (GS) {   // art B4 Gravespine: tall horns rising from the mask's crown, curving back at the tips
      const a = V.add(hd, [-0.6, s * 1.6, 2.2]), b = V.add(hd, [0.4, s * 4.0, 4.8]), c = V.add(hd, [-0.4, s * 5.4, 7.6]), e = V.add(hd, [-3.0, s * 5.2, 9.4]);
      r.group(() => { r.cone(a, b, 1.9, 1.5, bone); r.cone(b, c, 1.5, 1.0, bone); r.cone(c, e, 1.0, 0.3, bone); });
      continue;
    }
    if (B2 === 'hound' || B2 === 'ember') {   // b2: one crescent horn per side, rising off the back of the skull and sweeping back, as the concepts draw them
      const a = V.add(hd, [-0.4, s * 2.0, 2.0]), b = V.add(hd, [0.6, s * 3.8, 4.4]), c = V.add(hd, [-0.6, s * 4.8, 7.0]), e = V.add(hd, [-3.6, s * 4.6, 8.2]);
      r.group(() => { r.cone(a, b, 1.9, 1.6, bone); r.cone(b, c, 1.6, 1.1, bone); r.cone(c, e, 1.1, 0.3, bone); });
      continue;
    }
    if (B2 === 'wolf' || B2 === 'alpha') { r.cone(V.add(hd, [-0.6, s * 1.9, 2.0]), V.add(hd, [-1.6, s * 2.8, 7.4]), 2.0, 0.3, skin); continue; }   // b2: taller, broader pointed ears
    if (hog) { r.cone(V.add(hd, [3.4, s * 1.7, -1.9]), V.add(hd, [4.4, s * 3.6, 1.6]), 1.15, 0.25, M.BONE, { noShadow: true }); r.cone(V.add(hd, [-0.6, s * 2.2, 1.6]), V.add(hd, [0.4, s * 3.8, 3.0]), 1.4, 0.3, skin); continue; }   // b2: big up-curved tusks, ears pricked forward
    // horns sweep back, then up and forward like a bull's
    if (MB) { const ec = V.add(hd, [0.5, s * 2.7, 2.0]); r.sph(ec, 1.25, skin, { mf: p => p[0] > ec[0] + 0.5 && Math.hypot(p[1] - ec[1], p[2] - ec[2] + 0.1) < 0.7 ? M.CLOTH_DARK : 0 }); continue; }   // (b5 front) round ears with dark centers, at the corners of the head
    if (fur && look.bear) { r.sph(V.add(hd, MB ? [-0.2, s * 2.6, 1.9] : [-0.8, s * 2.4, 2.6]), MB ? 1.0 : B2 ? 1.8 : 1.4, skin); continue; }   // round ears
    if (fur && look.boar) { r.cone(V.add(hd, [4.6, s * 1.4, -1.4]), V.add(hd, [5.4, s * 2.6, 1.2]), 0.8, 0.2, M.BONE, { noShadow: true }); r.cone(V.add(hd, [-0.6, s * 2.2, 1.6]), V.add(hd, [-1.4, s * 3.4, 3.4]), 1.3, 0.3, skin); continue; }   // tusks, small ears
    if (fur) { r.cone(V.add(hd, [-0.8, s * 1.8, 2.2]), V.add(hd, [-1.6, s * 2.6, 6.4]), 1.6, 0.3, skin); continue; }   // pointed ears
    const a = V.add(hd, [-0.6, s * 2.2, 2]), b = V.add(hd, [-1.8, s * 4.8, 4.2]), c = V.add(hd, [0.6, s * 6.2, 6.8]), e = V.add(hd, [3.8, s * 5.6, 7.6]);
    r.group(() => { r.cone(a, b, 1.5, 1.3, bone); r.cone(b, c, 1.3, 0.9, bone); r.cone(c, e, 0.9, 0.3, bone); });
  }
  // a big skull reads at this size: scale every head part (cranium, snout, jaw, horns) 1.3x about the head
  const HK = MB ? 1.45 : GF ? 1.25 : GS ? 1.15 : B2 === 'wolf' || B2 === 'hound' || B2 === 'ember' ? 1.45 : 1.3, sc = q => V.add(hd, V.mul(V.sub(q, hd), HK));
  for (const q of r.p.slice(hr0)) {
    if (q.c) q.c = sc(q.c); if (q.a) { q.a = sc(q.a); q.b = sc(q.b); q.ra *= HK; q.rb *= HK; }
    if (q.r) q.r *= HK; if (q.rad) q.rad = V.mul(q.rad, HK); if (q.half) q.half = V.mul(q.half, HK);
    if (q.mf) { const f0 = q.mf; q.mf = (p, n) => f0(V.add(hd, V.mul(V.sub(p, hd), 1 / HK)), n); }
    if (q.ff) { const f0 = q.ff; q.ff = (p, n) => f0(V.add(hd, V.mul(V.sub(p, hd), 1 / HK)), n); }
  }
  if (clip === 'death') tipRig(r, [0, 0, 0], 0, 1.45 * [0, 0.2, 0.55, 0.9, 1, 1][f], [0, 0.5, 1.5, 2.8, 3.4, 3.6][f]);
  if (look.scale && look.scale !== 1) scaleRig(r, look.scale);
  return r;
}

// ---------------------------------------------------------------- spider
// ---------------------------------------------------------------- the ogre warlord (forest boss)
// A big chibi ogre: grey-green hide, round belly, tusked underbite, a top-knot, leather straps
// with a skull buckle, and a huge spiked club. Swings like the hero (posed heavy keys).
const MALG_B_OF = b => ({ ...b, hunch: 0.18, upper: 8.2, fore: 7.8, thigh: 5.6, shin: 5.2, hipH: 10.6 });   // (b6 v5) Malgrath: hunched forward on shorter legs, long arms
const OGRE_B = { hipH: 12, thigh: 6.4, shin: 6, ankle: 1.4, spine: 9, shW: 8.4, shZ: 3, neck: 10.5, upper: 7, fore: 6.5, hipW: 4, stride: 5, lift: 2.4, duty: 0.55, bob: 0.8, sway: 0.6, runLean: 0.1, counter: 0.1, stance: 1.5 };
function ogreRig(look, st) {
  const MG = !!look.malg, AZ = !!look.azh;   // art B6: AZ = Azhruk the Furnace Guard (infernal boss): Gorr's build sealed in dark plate, a furnace in his chest
  const ARM = M.ROCK;   // Azhruk's plate: a matte dark grey   // art B6: Malgrath the Iron Butcher (infernal boss): Gorr's build in red hide, an iron apron, ram horns, hooves and a cleaver
  const B = MG ? MALG_B_OF(OGRE_B) : OGRE_B, J = bipedJoints(B, st), r = new Rig(), { fwd, sideR, up } = J, skin = MG ? M.BLOODY : AZ ? ARM : M.OGRE;   // (b6 v2) deep blood red, not bright brick
  const GR = !!look.gorr || MG || AZ, IJ = !!look.ironjaw;
  // (b6 v5) Malgrath's molten cracks: wavy glowing veins through the hide, pulsing wider and narrower over the idle
  const crW = st.clip === 'idle' ? [0.16, 0.21, 0.26, 0.21][st.f % 4] : 0.21;
  // (b6 v6) a jagged crack network like cooling lava: the borders between cells of a 3D cell noise (F2 - F1 small)
  const CELL = 5.6, cellPt = (i, j, k) => { const h = n => { const v = Math.sin(i * 127.1 + j * 311.7 + k * 74.7 + n * 19.19) * 43758.5453; return v - Math.floor(v); }; return [(i + h(1)) * CELL, (j + h(2)) * CELL, (k + h(3)) * CELL]; };
  const crack = p => { if (!MG) return 0;
    const ci = Math.floor(p[0] / CELL), cj = Math.floor(p[1] / CELL), ck = Math.floor(p[2] / CELL); let f1 = 1e9, f2 = 1e9;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) { const q = cellPt(ci + a, cj + b, ck + c), d = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d; }
    const e = f2 - f1, w = crW * 2.0; return e < w * 0.42 ? M.FIREM : e < w ? M.MARKB : 0; };   // glowing core, a dark red rim
  const crMf = MG ? { mf: crack } : undefined;   // art B4: Gorr the Minebreaker (boss) and the Ironjaw Enforcer (elite)
  for (const [hip, knee, ank] of [[J.hipL, J.kneeL, J.ankL], [J.hipR, J.kneeR, J.ankR]]) {
    if (AZ) r.sph(V.add(knee, V.mul(fwd, 1.2)), 2.6, ARM, { mf: p => V.dot(V.sub(p, knee), fwd) > 2.6 ? M.IRON : 0 });   // (b6) Azhruk: knee cops
    r.cone(hip, knee, 3.4, 3.0, skin); r.cone(knee, ank, 3.0, 2.6, skin, MG ? { mf: p => V.dot(V.sub(p, ank), up) < 2.4 ? M.CLOTH_DARK : 0 } : undefined);   // (b6 v6) Malgrath's shins darken toward the hooves
    r.ell(V.add(ank, [2.2, 0, -0.8]), GR ? [4.8, 3.6, 1.9] : look.grunt ? [4.4, 3.3, 1.8] : [3.8, 2.8, 1.6], MG ? M.CLOTH_DARK : AZ ? ARM : M.LEATHER, null, MG ? { mf: p => Math.abs(V.dot(V.sub(p, ank), sideR)) < 0.35 && V.dot(V.sub(p, ank), fwd) > 2.4 ? M.DARK : 0 } : undefined);   // (b6) Malgrath: cloven hooves
  }
  // art B4, Ironjaw: a leather strap from the right shoulder across to the left hip, front and back
  const ijStrap = p => { const q = V.sub(p, J.chest), s2 = V.dot(q, sideR) - 6, z2 = V.dot(q, up) - 4; return Math.abs(s2 * 0.737 - z2 * 0.676) < 1.1 ? M.LEATHER : 0; };
  if (GR) r.group(() => {   // art B4, Gorr: a barrel chest over a heavy belly, the head sunk into a ridge of trapezius
    r.ell(V.mad(J.pelvis, up, 2), [6.0, 7.0, 5.4], skin, null, crMf);
    const chC = V.mad(J.chest, up, 1.0);
    r.ell(chC, [6.6, 10.6, 6.6], skin, frameAlong(fwd, up), AZ ? { mf: p => { const q = V.sub(p, chC), f2 = V.dot(q, fwd), s2 = V.dot(q, sideR), z2 = V.dot(q, up);   // (b6) Azhruk's furnace: three glowing slits in an iron grate on the chest, one on the back
      if (f2 > 2.8 && Math.abs(s2) < 4.0 && z2 > -3.2 && z2 < 2.4) return [-2.0, 0, 2.0].some(c => Math.abs(s2 - c) < 0.75) && z2 > -2.4 && z2 < 1.6 ? M.FIREM : M.IRON;
      if (f2 < -3.2 && Math.abs(s2) < 1.6 && z2 > -1.4 && z2 < 3.4) return Math.abs(s2) < 0.6 && z2 > -0.6 && z2 < 2.6 ? M.FIREM : M.IRON;
      return Math.abs(((z2 + 30) % 3.0) - 1.5) < 0.18 ? M.CLOTH_DARK : 0; } } : crMf);   // lames
    r.ell(V.add(V.mad(J.chest, up, 5.4), V.mul(fwd, -1.6)), [4.6, 8.0, 3.6], skin, frameAlong(fwd, up), crMf);
  });
  else r.group(() => {   // belly and chest as one mass (the grunts: a slimmer belly under a broad chest, top-heavy)
    r.ell(V.mad(J.pelvis, up, 2), look.grunt ? [4.8, 5.6, 4.8] : [6.4, 7.4, 6], skin);
    r.ell(V.mad(J.chest, up, look.grunt ? 1.2 : 0.6), look.grunt ? [6.2, 10.0, 6.4] : [5.6, 8.2, 5.4], skin, frameAlong(fwd, up), IJ ? { mf: ijStrap } : undefined);
    if (look.grunt) r.ell(V.add(V.mad(J.chest, up, 5.2), V.mul(fwd, -1.6)), [4.2, 7.6, 3.4], skin, frameAlong(fwd, up));   // a hump of trapezius the head hunches into
    if (look.cleaver) for (const s of [-1, 1]) r.ell(V.add(V.add(V.mad(J.chest, up, 1.8), V.mul(fwd, -3.6)), V.mul(sideR, s * 3.4)), [3.0, 3.6, 4.6], skin, frameAlong(fwd, up));   // art B2: the enforcer's shoulder blades either side of a spine groove (on the vest-wearers they poked through)
  });
  const belt = V.mad(J.pelvis, up, 0.5), grunt = !!look.grunt, lf = frameAlong(fwd, up);
  r.ell(belt, grunt ? [5.8, 6.6, 1.4] : [6.8, 7.8, 1.5], M.LEATHER, lf);
  if (grunt) {
    // art A3, the ogre grunts (clubber, rockthrower, shieldbearer, enforcer): a square iron buckle and a
    // ragged leather skirt to mid-thigh in place of the warlord's skull and apron
    r.cyl(V.mad(belt, up, -0.9), V.mad(belt, up, 0.6), 6.0, M.HAIR);   // art B2: a dark belt band all round, over the skirt
    if (IJ) r.box(V.mad(belt, fwd, 6.1), [0.5, 1.9, 1.5], M.STEEL, lf, { bias: 1, mf: p => { const q = V.sub(p, belt); return Math.abs(V.dot(q, sideR)) < 1.0 && Math.abs(V.dot(q, up)) < 0.6 ? M.HAIR : 0; } });   // art B4: a big square steel buckle
    else r.box(V.mad(belt, fwd, 6.1), [0.5, 1.5, 1.1], M.IRON, lf, { bias: 1 });
    const sk = V.mad(J.pelvis, up, 0.2), hem = V.add(J.pelvis, [0, 0, -3.8]), ax = V.norm(V.sub(hem, sk)), Ls = V.len(V.sub(hem, sk));
    // art B2: a longer skirt that flares wider than the hips and ends in a jagged hem of torn flaps
    const hem2 = V.add(J.pelvis, [0, 0, IJ ? -4.0 : -5.0]), ax2 = V.norm(V.sub(hem2, sk)), L2 = V.len(V.sub(hem2, sk));
    r.group(() => {
      r.cone(sk, hem2, 5.0, IJ ? 6.6 : 7.2, IJ ? M.MARKB : M.LEATHER, { mf: p => { const q = V.sub(p, sk), t = V.dot(q, ax2), ang = Math.atan2(V.dot(q, sideR), V.dot(q, fwd)); return t > L2 - 1.4 + Math.abs(Math.sin(ang * 4.5)) * 1.2 ? (IJ ? M.BLOODY : M.HAIR) : 0; } });
      for (let k = 0; k < 10; k++) {   // torn flaps hanging below the hem
        const a = (k + 0.5) / 10 * Math.PI * 2, d = V.add(V.mul(fwd, Math.cos(a)), V.mul(sideR, Math.sin(a))), b0 = V.mad(hem2, d, 6.1);
        const fk = look.cleaver || IJ ? 1 : 0;   // the enforcer's flaps are bigger (art B2 pass 3; it lost on the other grunts); art B4: Ironjaw's too, under a shorter skirt
        r.cone(V.mad(b0, up, 0.8), V.add(V.mad(b0, d, 0.9 + fk * 0.1), V.mul(up, -1.8 - fk * 0.6 - (k % 2) * (0.9 + fk * 0.1))), 1.5 + fk * 0.4, 0.3, IJ ? M.MARKB : M.HAIR);
      }
    });
    if (look.vest) {   // a sleeveless leather vest, open at the neck
      const vc = V.mad(J.chest, up, 1.2);
      r.ell(vc, [6.4, 10.2, 6.6], M.LEATHER, lf, { mf: p => { const q = V.sub(p, vc); return V.dot(q, fwd) > 3 && Math.abs(V.dot(q, sideR)) < 2.6 - (3.2 - V.dot(q, up)) * 0.45 && V.dot(q, up) > -1 ? M.OGRE : 0; } });
    }
  } else if (AZ) {   // (b6) Azhruk: an iron belt, plate tassets over the hips, a torn red tabard front and back
    r.ell(belt, [6.9, 7.9, 1.4], M.IRON, lf); r.box(V.mad(belt, fwd, 7.2), [0.6, 1.7, 1.3], M.DSTEEL, lf, { bias: 1 });
    const sk = V.mad(J.pelvis, up, 0.2), hem = V.add(J.pelvis, [0, 0, -3.6]);
    r.group(() => r.cone(sk, hem, 6.6, 7.6, ARM, { mf: p => Math.abs(((V.dot(V.sub(p, sk), up) + 30) % 1.8) - 0.9) < 0.14 ? M.CLOTH_DARK : 0 }));
    for (const s of [1, -1]) {   // the tabard: a long red cloth hanging between the legs, torn into points
      const tc = V.add(V.mad(J.pelvis, fwd, s * 7.6), V.mul(up, -5.6)), tf = frameAlong(V.mul(fwd, s), up);
      r.box(tc, [0.4, 3.0, 6.2], M.MARKB, tf, { mf: p => { const q = V.sub(p, tc), z2 = V.dot(q, up), w = V.dot(q, sideR); return z2 < -3.6 + Math.abs(Math.sin(w * 2.4)) * 1.6 ? M.DARK : z2 < -2.4 ? M.BLOODY : 0; } });
    }
  } else if (GR) {
    // art B4, Gorr: leather overalls (a bib up the chest, braces over the shoulders that cross on the back),
    // a twisted rope belt, a ragged brown apron skirt front and back, a pouch at the left hip
    const oc = V.mad(J.chest, up, 1.0);
    r.ell(oc, [6.9, 10.9, 6.9], MG ? M.CLOTH_DARK : M.LEATHER, lf, { mf: p => { const q = V.sub(p, oc), f2 = V.dot(q, fwd), s2 = V.dot(q, sideR), z2 = V.dot(q, up);
      if (f2 > 1.2 && Math.abs(s2) < 4.8 && z2 < 2.4) return MG ? ((Math.abs(Math.abs(s2) - 3.9) < 0.45 && Math.abs(((z2 + 20) % 2.2) - 1.1) < 0.45) ? M.CHAIN : z2 > 1.6 ? M.CLOTH_DARK : 0) : z2 > 1.6 ? M.HAIR : 0;   // the bib, its top hem ((b6) Malgrath: iron, riveted down both edges)
      if (f2 > -1 && z2 >= 1.6 && Math.abs(Math.abs(s2) - 3.8) < 1.0) return MG ? M.LEATHER : 0;   // the braces in front
      if (MG && f2 <= -1) return Math.abs(Math.abs(s2) - 3.4) < 0.9 ? M.LEATHER : crack(p) || skin;   // (b6 v2) two straight straps down the back
      if (f2 <= -1 && (Math.abs(s2 - (z2 - 1) * 0.62) < 1.0 || Math.abs(s2 + (z2 - 1) * 0.62) < 1.0)) return MG ? M.LEATHER : 0;   // crossed on the back
      return (MG && crack(p)) || skin; } });
    r.ell(V.mad(J.pelvis, up, 2), [6.3, 7.3, 5.2], MG ? M.CLOTH_DARK : M.LEATHER, lf, { mf: p => { const q = V.sub(p, J.pelvis); return V.dot(q, fwd) > 0.6 && Math.abs(V.dot(q, sideR)) < 5.0 ? 0 : crack(p) || skin; } });   // the bib carries on down over the belly
    if (MG) { r.ell(belt, [6.7, 7.7, 1.4], M.LEATHER, lf); r.box(V.mad(belt, fwd, 7.0), [0.5, 1.5, 1.1], M.IRON, lf, { bias: 1 });   // (b6) a plain belt and an iron buckle
      for (const [a, nl] of [[-1.15, 2], [-1.9, 3], [-2.6, 2]]) {   // (b6 v5) butcher's meat hooks hanging on short chains from the left of the belt
        const d = V.add(V.mul(fwd, Math.cos(a)), V.mul(sideR, Math.sin(a))); let c0 = V.mad(V.mad(belt, d, 7.4), up, -0.6);
        for (let k = 0; k < nl; k++) { const c1 = V.mad(c0, up, -1.4); r.ell(V.lerp(c0, c1, 0.5), [0.8, 0.8, 0.9], M.IRON, k % 2 ? frameAlong(d, up) : frameAlong(V.cross(up, d), up)); c0 = c1; }
        const h1 = V.mad(c0, up, -2.2), h2 = V.add(V.mad(h1, up, -0.9), V.mul(d, 1.3)), h3 = V.add(V.mad(h2, up, 1.4), V.mul(d, 0.7));
        r.group(() => { r.cone(c0, h1, 0.5, 0.5, M.STEEL); r.cone(h1, h2, 0.5, 0.45, M.STEEL); r.cone(h2, h3, 0.45, 0.15, M.STEEL); });
      }
    }
    else r.ell(belt, [6.7, 7.7, 1.4], M.STRAWM, lf, { mf: p => { const q = V.sub(p, belt), ang = Math.atan2(V.dot(q, sideR), V.dot(q, fwd)); return ((ang * 7 + V.dot(q, up) * 1.4) % 1 + 1) % 1 < 0.35 ? M.CLOTH_TAN : 0; } });   // the rope, twisted
    const sk = V.mad(J.pelvis, up, 0.2), hem = V.add(J.pelvis, [0, 0, -5.6]);
    r.group(() => {
      r.cone(sk, hem, 6.4, 7.4, MG ? M.HAIR : M.LEATHER);
      for (let k = 0; k < 12; k++) { const a = (k + 0.5) / 12 * Math.PI * 2, d = V.add(V.mul(fwd, Math.cos(a)), V.mul(sideR, Math.sin(a))), b0 = V.mad(hem, d, 6.6); r.cone(V.mad(b0, up, 0.8), V.add(V.mad(b0, d, 0.8), V.mul(up, -1.8 - (k % 3) * 0.9)), 1.7, 0.3, MG ? M.HAIR : M.LEATHER); }
    });
    r.box(V.add(V.mad(J.pelvis, fwd, 6.4), V.mul(up, -3.2)), [0.6, 4.2, 3.6], M.LEATHER, lf, { mf: p => { const q = V.sub(p, J.pelvis), z2 = V.dot(q, up), s2 = V.dot(q, sideR); return z2 < -5.6 + Math.abs(Math.sin(s2 * 1.3)) * 1.2 ? M.HAIR : 0; } });   // the front apron flap, torn at the hem
    const pc = V.add(V.add(J.pelvis, V.mul(sideR, -7.0)), V.add(V.mul(fwd, 2.2), V.mul(up, -2.4)));
    if (!MG) r.box(pc, [1.8, 1.6, 2.2], M.LEATHER, lf, { mf: p => { const q = V.sub(p, pc), z2 = V.dot(q, up); return z2 > 0.9 ? (Math.abs(V.dot(q, sideR)) < 0.5 && z2 < 1.6 ? M.STEEL : M.HAIR) : 0; } });   // the pouch, its flap and clasp
  } else {
    skullAt(r, V.mad(belt, fwd, 6.6), fwd, sideR, up, M.BONE, M.DARK, 0, 0.75);
    {   // art B2: a torn leather skirt under the apron fills the dark gap between the legs
      const sk = V.mad(J.pelvis, up, 0.2), hem = V.add(J.pelvis, [0, 0, -4.6]);
      r.group(() => {
        r.cone(sk, hem, 6.6, 7.6, M.LEATHER);
        for (let k = 0; k < 10; k++) { const a = (k + 0.5) / 10 * Math.PI * 2, d = V.add(V.mul(fwd, Math.cos(a)), V.mul(sideR, Math.sin(a))), b0 = V.mad(hem, d, 6.6); r.cone(V.mad(b0, up, 0.8), V.add(V.mad(b0, d, 1.0), V.mul(up, -2.2 - (k % 2) * 1.0)), 1.9, 0.3, M.HAIR); }
      });
    }
    r.box(V.add(V.mad(J.pelvis, fwd, 5.5), V.mul(up, -3.5)), [0.5, 3.6, 3.2], M.LEATHER, lf);
  }
  if ((!grunt && !GR) || look.rock) r.cone(V.add(V.mad(J.chest, up, 4), V.mul(sideR, -6)), V.add(V.mad(J.pelvis, up, 1), V.mul(sideR, 5)), 1.0, 1.0, M.LEATHER);   // strap
  if (look.rock) {   // a bag of rocks at the right hip
    const bg = V.add(V.add(J.pelvis, V.mul(sideR, 7.4)), V.add(V.mul(up, -0.8), V.mul(fwd, 1.5)));
    r.ell(bg, [4.4, 3.6, 3.2], M.LEATHER);   // art B2: a bigger bag with a rolled rim and bigger stones
    r.cyl(V.mad(bg, up, 1.9), V.mad(bg, up, 2.5), 3.9, M.HAIR);
    for (const [u, v] of [[-1.4, 0], [1.3, 0.7], [0, -1.3], [0.2, 1.4]]) r.sph(V.add(V.mad(bg, up, 2.8), V.add(V.mul(fwd, u), V.mul(sideR, v))), 1.7, M.ROCK);
  }
  // art B4: riveted steel pauldrons, layered: a dome over a lower lame (Gorr both shoulders, Ironjaw the right one)
  if (GR || IJ) for (const [sh, sd] of GR ? [[J.shL, -1], [J.shR, 1]] : [[J.shR, 1]]) {
    const pk = GR ? 1.15 : 1, c = V.add(V.mad(sh, up, 1.6 * pk), V.mul(sideR, sd * 1.2)), fr = frameAlong(fwd, up);
    const riv = cc => p => { const n = V.norm(V.sub(p, cc)), a = V.dot(n, fwd), b = V.dot(n, sideR) * sd, z2 = V.dot(n, up); return z2 > 0.25 && Math.abs(Math.abs(a) - 0.45) < 0.2 && Math.abs(b - 0.5) < 0.24 ? (MG || AZ ? M.IRON : M.BONE) : 0; };
    const c2 = V.add(V.mad(c, up, -2.2 * pk), V.mul(sideR, sd * 1.6 * pk));
    if (AZ) {   // (b6) Azhruk: angular pauldrons, three overlapping plates stepping down the shoulder, dark-rimmed
      for (let k = 0; k < 3; k++) {
        const nz = V.norm(V.add(V.mul(up, 0.85 - k * 0.2), V.mul(sideR, sd * (0.5 + k * 0.25)))), ny = V.norm(V.cross(nz, fwd)), pc = V.add(V.mad(c, up, 1.0 - k * 2.1), V.mul(sideR, sd * (0.4 + k * 1.3)));
        const hx = 4.8 - k * 0.5, hy = 3.6 - k * 0.4;
        r.box(pc, [hx, hy, 1.0], ARM, [fwd, ny, nz], { bias: -1, mf: p => { const q = V.sub(p, pc), u = Math.abs(V.dot(q, fwd)), v = Math.abs(V.dot(q, ny)); return u > hx - 0.45 || v > hy - 0.45 ? M.CLOTH_DARK : 0; } });
      }
      continue;
    }
    r.ell(c2, [4.6 * pk, 3.6 * pk, 2.6 * pk], MG ? M.CLOTH_DARK : AZ ? ARM : M.SLATE, fr, { mf: riv(c2) });
    r.ell(c, [5.0 * pk, 4.6 * pk, 3.4 * pk], MG ? M.CLOTH_DARK : AZ ? ARM : M.SLATE, fr, { mf: riv(c) });
    if (MG) for (const [u, v] of [[0.45, 0.3], [-0.45, 0.3], [0, 0.75]]) {   // (b6 v6) three iron spikes on each pauldron
      const b0 = V.add(c, V.add(V.add(V.mul(fwd, u * 3.6 * pk), V.mul(sideR, sd * v * 3.6 * pk)), V.mul(up, 2.6 * pk))), dir = V.norm(V.add(V.add(V.mul(up, 1), V.mul(sideR, sd * (0.5 + v * 0.5))), V.mul(fwd, u * 0.4)));
      r.cone(b0, V.mad(b0, dir, 3.4 * pk), 1.0 * pk, 0.15, M.IRON, { noShadow: true });
    }
    for (const [u, v] of [[0.55, 0.45], [-0.55, 0.45], [0, 0.85]]) r.sph(V.add(c, V.add(V.add(V.mul(fwd, u * 4.6 * pk), V.mul(sideR, sd * v * 4.2 * pk)), V.mul(up, 2.2 * pk))), GR ? 0.95 : 0.8, MG || AZ ? M.IRON : M.BONE, { noShadow: true });   // big rivet heads
  }
  if ((!grunt && !GR) || look.pads) for (const [sh, sd] of [[J.shL, -1], [J.shR, 1]]) {   // shoulder pads with spikes
    const c = grunt ? V.add(V.mad(sh, up, 1.4), V.mul(sideR, sd * 1.2)) : V.mad(sh, up, 1.2), pk = grunt ? 1.25 : 1;
    r.ell(c, [4.2 * pk, 4.2 * pk, 3 * pk], M.LEATHER, frameAlong(fwd, up));
    r.cone(V.mad(c, up, 2 * pk), V.add(V.mad(c, up, 5.5 * pk), V.mul(sideR, sd * 1.5)), 1.2 * pk, 0.2, M.BONE);
  }
  // arms: the club in the right hand on the posed swing plane; the left hand a big fist
  const sw = atkIndex(st.clip) >= 0 ? st.key : null, list = sw ? SWINGS.heavy : null;
  const pivot = V.add(V.add(J.chest, V.mul(sideR, 3.5)), V.add(V.mul(up, 4), V.mul(fwd, 1)));
  const U = V.norm(V.add(V.mul(up, Math.cos(0.22)), V.mul(sideR, Math.sin(0.22)))), inPlane = a => V.norm(V.add(V.mul(fwd, Math.cos(a)), V.mul(U, Math.sin(a))));
  let handR, bd, rockAt = null;
  if (look.rock) {   // the rockthrower: a rock held up beside the head; to throw, cocked back, then hurled forward
    const a = st.clip === 'shoot' && st.key ? st.key.a : 0, hit = st.clip === 'shoot' && st.key && st.key.hit;
    handR = hit || (st.clip === 'shoot' && a < 0.6) ? V.add(V.add(J.shR, V.mul(fwd, 8)), V.add(V.mul(up, 0.5), V.mul(sideR, -0.5)))
      : V.add(V.add(J.shR, V.mul(fwd, 0.5 - a * 3)), V.add(V.mul(up, 9.2 + a * 1.0), V.mul(sideR, 3.4)));   // art B2: higher and further out
    bd = up;
    if (!(st.clip === 'shoot' && (hit || a < 0.6)) && st.clip !== 'death') rockAt = V.mad(handR, up, 3.6);
  } else if (sw) { handR = V.mad(pivot, inPlane(sw.a), (sw.r || 6.5) * 1.3); bd = inPlane(sw.a + (sw.ck || 0)); }
  else { handR = V.add(V.add(J.shR, V.mul(fwd, 3 + J.swingArm * 1.5)), V.add(V.mul(up, -9), V.mul(sideR, 4.6))); bd = grunt ? V.norm(V.add(V.add(V.mul(fwd, 0.45), V.mul(up, 0.65)), V.mul(sideR, 0.6))) : V.norm(V.add(V.add(V.mul(fwd, 0.5), V.mul(up, 0.75)), V.mul(sideR, 0.3))); }   // art B2: arms out from the body; the grunts' club angled up and out
  if (st.clip === 'death') { handR = V.add(J.shR, [3, 3, -11]); bd = V.norm([1, 0.4, -0.6]); }
  if ((look.cleaver || MG) && !sw && st.clip !== 'death') bd = V.norm(V.add(V.mul(fwd, 0.55), V.mul(up, -0.7)));   // the enforcer: the cleaver hangs low, edge forward
  let handL = st.clip === 'death' ? V.add(J.shL, [2, -3, -10]) : V.add(V.add(J.shL, V.mul(fwd, 4 - J.swingArm * 2)), V.add(V.mul(up, -9), V.mul(sideR, -3.8)));
  if (look.plank && st.clip !== 'death') handL = V.add(V.add(J.shL, V.mul(fwd, 6)), V.add(V.mul(up, -5), V.mul(sideR, -0.5)));   // the shield held up in front
  let hamG = null;   // art B4, Gorr: the sledgehammer's butt end, gripped by the left hand; the right hand higher up the haft
  if (GR && !MG) {
    if (sw) { hamG = V.mad(handR, bd, -6); handL = hamG; }
    else if (st.clip === 'death') hamG = V.mad(handR, bd, -6);
    else {   // held across the body: the haft from the left of the belly down to the head by the right foot
      hamG = V.add(V.add(J.pelvis, V.mul(fwd, 6.8 + J.swingArm * 0.6)), V.add(V.mul(up, 3.6), V.mul(sideR, -3.4)));
      bd = V.norm(V.add(V.add(V.mul(sideR, 1), V.mul(up, -0.62)), V.mul(fwd, 0.22)));
      handL = hamG; handR = V.mad(hamG, bd, 6.4);
    }
  }
  for (const [sh, hand, s] of [[J.shR, handR, 1], [J.shL, handL, -1]]) {
    const a = armTo(J, sh, hand, B, s);
    const ak = look.grunt || GR ? 1.35 : 1;
    if (look.grunt && !look.pads) r.ell(V.add(V.mad(sh, up, 1.0), V.mul(sideR, s * 1.2)), [4.6, 4.6, 4.2], skin, frameAlong(fwd, up));   // a great shoulder muscle
    r.cone(sh, a.el, 2.8 * ak, 2.4 * ak, skin, crMf); r.cone(a.el, a.hand, 2.4 * ak, 2.2 * ak, skin, crMf); r.sph(a.hand, 2.7 * ak, skin);
    if (MG && s < 0 && st.clip !== 'death') {   // (b6 v5) a broken shackle chain hanging from the left wrist band
      const sway = Math.sin((st.f || 0) * 1.3) * 0.5; let c0 = V.lerp(a.el, a.hand, 0.7);
      for (let k = 0; k < 5; k++) { const c1 = V.add(c0, V.add(V.mul(up, -1.5), V.mul(fwd, sway * 0.3))); r.ell(V.lerp(c0, c1, 0.5), [0.85, k % 2 ? 0.35 : 0.85, 0.95], M.IRON, k % 2 ? frameAlong(fwd, up) : frameAlong(sideR, up)); c0 = c1; }
    }
    if (MG) { const w0 = V.lerp(a.el, a.hand, 0.5), w1 = V.lerp(a.el, a.hand, 0.85), wd = V.norm(V.sub(w1, w0)); r.cyl(w0, w1, 2.3 * ak + 0.7, M.CLOTH_DARK); for (let k = 0; k < 5; k++) { const ang = k / 5 * Math.PI * 2, d = V.norm(V.add(V.mul(V.norm(V.cross(wd, up)), Math.cos(ang)), V.mul(V.norm(V.cross(wd, V.cross(wd, up))), Math.sin(ang)))); r.sph(V.mad(V.lerp(w0, w1, 0.5), d, 2.3 * ak + 0.7), 0.75, M.IRON, { noShadow: true }); } }   // (b6) studded iron wrist bands
    else if (!grunt || look.pads) r.cyl(V.lerp(a.el, a.hand, 0.3), V.lerp(a.el, a.hand, 0.7), grunt ? 2.3 * ak + 0.6 : GR ? 2.3 * ak + 0.5 : 2.6, AZ ? M.IRON : M.LEATHER);
    if (AZ) r.sph(a.el, 2.6 * ak, ARM);   // (b6) Azhruk: elbow cops   // bracers
    else if (IJ) r.cyl(V.lerp(a.el, a.hand, 0.55), V.lerp(a.el, a.hand, 0.78), 2.3 * ak + 0.5, M.LEATHER);   // art B4: leather wrist bands
  }
  const g = handR;
  if (look.rock) { if (rockAt) r.sph(rockAt, 4.4, M.ROCK); }
  else if (GR && !MG) {   // art B4: a huge two-handed sledge, a long haft and a rough-cut block of grey stone
    const hc = V.mad(hamG, bd, 18.5), ref = Math.abs(V.dot(bd, up)) > 0.9 ? fwd : up, w = V.norm(V.cross(bd, ref)), n = V.cross(bd, w);
    r.cone(V.mad(hamG, bd, -2.2), V.mad(hc, bd, -1), 1.15, 1.15, M.WOOD);
    r.cyl(V.mad(hamG, bd, -1.6), V.mad(hamG, bd, 0.2), 1.45, M.LEATHER);   // a leather grip at the butt
    // an eight-sided block of stone: two square prisms turned 45 degrees about the striking axis, the faces darker
    const w2 = V.norm(V.add(bd, w)), b2 = V.norm(V.sub(bd, w)), face = p => Math.abs(V.dot(V.sub(p, hc), n)) > 4.9 ? (AZ ? 0 : M.ROCK) : 0;
    const hm = AZ ? M.ROCK : M.RUIN;   // (b6) Azhruk's is a block of iron
    r.group(() => { r.box(hc, [3.9, 3.9, 5.8], hm, [bd, w, n], { mf: face }); r.box(hc, [4.1, 4.1, 5.8], hm, [w2, b2, n], { mf: face }); });
  }
  else if (IJ) {   // art B4: a big wooden mallet, its barrel head bound with two studded iron bands
    r.cone(V.mad(g, bd, -3), V.mad(g, bd, 9), 1.15, 1.25, M.WOOD);
    const mc = V.mad(g, bd, 10.4), hx0 = V.sub(fwd, V.mul(bd, V.dot(fwd, bd))), hx = V.len(hx0) > 0.2 ? V.norm(hx0) : up;
    r.cyl(V.mad(mc, hx, -4.2), V.mad(mc, hx, 4.2), 3.3, M.WOOD, { mf: p => { const q = V.sub(p, mc), t = Math.abs(V.dot(q, hx)); if (t > 3.9) return M.PLANK; if (Math.abs(t - 2.5) < 0.75) { const rr = V.sub(q, V.mul(hx, V.dot(q, hx))), ang = Math.atan2(V.dot(rr, bd), V.dot(rr, V.cross(hx, bd))); return Math.abs(t - 2.5) < 0.35 && ((ang * 4 / Math.PI) % 2 + 2) % 2 < 0.45 ? M.BONE : M.IRON; } return 0; } });
  }
  else if (MG) {   // (b6 v3) Malgrath's butcher cleaver: a wrapped grip, a dark iron blade with a bright honed edge
    // chipped into notches, rust patches and blood, a thick spine and a hanging hole near the top
    const fn = V.norm(V.add(fwd, V.mul(sideR, -0.55))), side = V.norm(V.sub(fn, V.mul(bd, V.dot(fn, bd)))), nrm = V.norm(V.cross(bd, side)), cf = [bd, side, nrm];
    // (b6 v4) the fist (radius ~3.6) wraps the middle of a longer grip: the pommel shows below it and the grip carries on
    // above it to the collar, so the hand holds a handle and not the blade
    r.sph(V.mad(g, bd, -5.0), 1.3, M.IRON);   // pommel
    r.cone(V.mad(g, bd, -4.6), V.mad(g, bd, 6.4), 1.15, 1.15, M.LEATHER, { mf: p => { const t = V.dot(V.sub(p, g), bd); return ((t * 1.1 % 1) + 1) % 1 < 0.35 ? M.HAIR : 0; } });   // grip, wrapped
    r.cyl(V.mad(g, bd, 6.2), V.mad(g, bd, 7.2), 1.55, M.IRON);   // iron collar
    const B0 = 7.0, L = 6.6, Wd = 5.0, bc = V.add(V.mad(g, bd, B0 + L), V.mul(side, Wd - 1.6));
    r.box(bc, [L, Wd, 0.55], M.IRON, cf, { mf: p => { const q = V.sub(p, bc), u = V.dot(q, bd), v = V.dot(q, side);
      if (Math.hypot(u - (L - 2.2), v + Wd - 2.4) < 1.0) return M.DARK;   // the hanging hole
      const ed = Wd - v;   // distance in from the cutting edge
      const chip = [-3.6, 0.8, 4.4].some((c, i) => Math.abs(u - c) < [0.8, 0.55, 0.7][i] && ed < [1.1, 0.8, 1.0][i] - Math.abs(u - c) * 0.6);   // three chips bitten out of the edge, uneven
      if (chip) return M.DARK;
      if (MG && ed < 0.5) return M.FIREM;   // (b6 v5) the edge glows forge-hot
      if (ed < 1.25) return M.BLADE;   // the honed bevel, bright
      if (ed < 1.6) return M.DSTEEL;
      if (Math.hypot((u + 1.8) * 0.7, ed - 2.4) < 1.0 || Math.hypot((u - 2.6) * 0.8, ed - 1.9) < 0.75) return M.MARKB;   // two blood smears near the edge
      if (Math.hypot((u - 4.4) * 0.6, v + 1.6) < 1.1 || Math.hypot((u + 4.6) * 0.7, v + 2.6) < 0.8) return M.RUST;   // two rust patches by the spine
      return 0; } });
    r.box(V.add(V.mad(g, bd, B0 + L), V.mul(side, -1.6)), [L, 0.55, 0.95], M.DSTEEL, cf);   // the thick back spine
  }
  else if (look.cleaver) {   // a heavy square cleaver: short wooden grip, a broad steel blade ((b6) Malgrath's is bigger, notched, with a hole)
    const ck = MG ? 1.35 : 1;
    r.cone(V.mad(g, bd, -3), V.mad(g, bd, 2.5), 1.2, 1.2, M.WOOD);
    const fn = V.norm(V.add(fwd, V.mul(sideR, -0.55))), side = V.norm(V.sub(fn, V.mul(bd, V.dot(fn, bd)))), cf = [bd, side, V.norm(V.cross(bd, side))];
    const bc = V.add(V.mad(g, bd, 2.6 + 5.0 * ck), V.mul(side, 1.9 * ck));
    r.box(bc, [5.0 * ck, 3.9 * ck, 0.6], MG ? M.IRON : M.BLADE, cf, MG ? { mf: p => { const q = V.sub(p, bc), u = V.dot(q, bd), v = V.dot(q, side); if (Math.hypot(u + 3.6, v - 2.2) < 0.9) return M.DARK; if (v < -3.9 * ck + 0.9 && Math.abs(((u + 20) % 2.6) - 1.3) < 0.5) return M.DSTEEL; return 0; } } : undefined);   // art B2: BLADE steel keeps its tone when turned from the light
    r.box(V.add(V.mad(g, bd, 2.6 + 5.0 * ck), V.mul(side, -1.8 * ck)), [5.0 * ck, 0.5, 0.9], M.IRON, cf);   // the thick back spine
  } else if (grunt) {   // a rough log club, its cut end showing pale wood rings
    const tip = V.mad(g, bd, 12);
    r.cone(V.mad(g, bd, -3), tip, 1.8, 3.8, M.WOOD, { mf: p => V.dot(V.sub(p, tip), bd) > -0.2 ? M.PLANK : 0 });
  }
  if (look.plank) {   // a plank shield: upright boards with two iron bands, held on the left arm
    const aL2 = armTo(J, J.shL, handL, B, -1), n = V.norm(V.add(V.mul(fwd, 0.9), V.mul(sideR, -0.4))), across = V.norm(V.cross(up, n)), c = V.add(V.mad(aL2.hand, n, 3.8), V.mul(up, 1.4));
    // art B2: a bigger shield of four planks, grooves in dark leather (not black), iron bands with rivets
    r.box(c, [1.0, 7.0, 10.6], M.WOOD, [n, across, up], { mf: p => { const q = V.sub(p, c), u = V.dot(q, across), v = Math.abs(V.dot(q, up)); if (v > 5.6 && v < 7.8 && Math.abs(u) < 5.6) return Math.abs(Math.abs(u) - 3.6) < 0.7 && Math.abs(v - 6.7) < 0.6 ? M.BONE : M.PLATE; return Math.abs(((u + 7) % 3.5) - 1.75) > 1.3 ? M.HAIR : 0; } });
  }
  // club: a thick haft swelling into a studded head (the warlord)
  if (!grunt && !GR) r.cone(V.mad(g, bd, -3), V.mad(g, bd, 12), 1.4, 3.4, M.WOOD);
  if (!grunt && !GR) for (let k = 0; k < 7; k++) { const a = k * 2.4, t = 7 + (k % 3) * 2, ax = V.norm(V.add(V.mul(V.cross(bd, up), Math.cos(a)), V.mul(V.cross(bd, V.norm(V.cross(bd, up))), Math.sin(a)))); const b = V.mad(V.mad(g, bd, t), ax, 2.8); r.cone(b, V.mad(b, ax, 2.4), 0.9, 0.2, M.BLADE, { noShadow: true }); }   // art B2: spikes in pale steel
  if (sw && sw.smear && st.prev) smearArc(r, pivot, fwd, U, st.prev.a + (st.prev.ck || 0), sw.a + (sw.ck || 0), 8, 22);
  if (AZ) {   // (b6) Azhruk: an armored tail of plated segments sweeping round and ending in a hook
    const sw2 = Math.sin((st.f || 0) * 0.9) * 0.6, base = V.add(V.mad(J.pelvis, fwd, -5.0), V.mul(up, -0.5));
    const pts = [[0, 0, 0], [-4, 1.5, -3.5], [-7, 4.5 + sw2, -6.5], [-7.5, 9 + sw2, -8.5], [-4.5, 12 + sw2, -8.2], [-1.6, 12.6 + sw2, -6.4]].map(([f, sd, z]) => V.add(V.add(V.mad(base, fwd, f), V.mul(sideR, sd)), V.mul(up, z)));
    const rad = [2.4, 2.1, 1.8, 1.5, 1.1, 0.25];
    for (let k = 0; k < pts.length - 1; k++) r.cone(pts[k], pts[k + 1], rad[k], rad[k + 1], ARM, { mf: p => V.len(V.sub(p, pts[k + 1])) < 0.6 ? M.CLOTH_DARK : 0 });
  }
  // head: big, a heavy brow over small yellow eyes, an underbite with two tusks, a top-knot
  const hd = grunt ? V.add(V.mad(J.head, fwd, 1.4), V.mul(up, -2.0)) : MG ? V.add(V.mad(J.head, fwd, 3.2), V.mul(up, -0.4)) : GR ? V.add(V.mad(J.head, fwd, 1.8), V.mul(up, -1.6)) : J.head, h0 = r.p.length;   // (b6 v5) Malgrath's head thrust out ahead of the hunched shoulders, so the glowing eyes show   // the grunts hunch, the head thrust forward and low
  if (AZ) {   // (b6) Azhruk: a great helm, a glowing visor slit, a ridge down the front, bull horns curving up
    r.cyl(V.mad(hd, up, -2.6), V.mad(hd, up, 3.6), 4.6, ARM, { mf: p => { /* a flat-topped bucket helm */ const q = V.sub(p, hd), f2 = V.dot(q, fwd), s2 = Math.abs(V.dot(q, sideR)), z2 = V.dot(q, up);
      if (f2 > 2.6 && Math.abs(z2 - 0.9) < 0.45 && s2 < 2.5) return M.FIREM;
      if (f2 > 2.8 && s2 < 0.35 && z2 < 0.4) return M.IRON;
      return Math.abs(z2 + 1.6) < 0.25 ? M.CLOTH_DARK : 0; } });
    for (const s of [-1, 1]) {
      const pts = [[-0.4, 3.6, 2.4], [0, 5.6, 3.6], [0.6, 6.6, 5.8], [1.4, 6.0, 8.2], [2.4, 4.8, 9.4]].map(([f, sd, z]) => V.add(V.add(V.mad(hd, fwd, f), V.mul(sideR, s * sd)), V.mul(up, z)));
      const rad = [1.8, 1.6, 1.3, 0.9, 0.3];
      r.group(() => { for (let k = 0; k < pts.length - 1; k++) r.cone(pts[k], pts[k + 1], rad[k], rad[k + 1], k > 2 ? M.HORN : M.BOAR); });
    }
  } else {
  r.ell(hd, [4.6, 4.8, 4.2], skin, frameAlong(fwd, up), { mf: p => { const q = V.sub(p, hd), f2 = V.dot(q, fwd), s2 = Math.abs(V.dot(q, sideR)), z2 = V.dot(q, up); if (MG && f2 > 2.0 && Math.abs(s2 - 1.8) < 0.95 && Math.abs(z2 - 0.5) < 0.6) return M.FIREM;   // (b6 v5) big glowing eyes
    if (f2 > 2.4 && Math.abs(s2 - 1.7) < 0.55 && Math.abs(z2 - 0.4) < 0.5) return MG ? M.FIREM : M.EYE_YEL; if (f2 > 2.4 && Math.abs(z2 - 1.3) < 0.35 && s2 < 3) return M.DARK; if (f2 > 3 && z2 < -1.6 && z2 > -2.6 && s2 < 2.2) return MG ? M.FIREM : M.DARK; return 0; } });
  r.ell(V.add(V.mad(hd, fwd, 2.4), V.mul(up, -2.4)), [2.6, 3.8, 1.8], skin, frameAlong(fwd, up));   // jaw
  for (const s of [-1, 1]) {
    const b = IJ ? V.add(V.add(V.mad(hd, fwd, 3.9), V.mul(sideR, s * 3.0)), V.mul(up, -2.0)) : V.add(V.add(V.mad(hd, fwd, 4.2), V.mul(sideR, s * 1.8)), V.mul(up, -2.2));   // art B4: Ironjaw's tusks poke out either side of the jaw guard
    if (MG) { const bm = V.add(V.add(V.mad(hd, fwd, 3.6), V.mul(sideR, s * 2.4)), V.mul(up, -2.9)); r.cone(bm, V.add(bm, V.add(V.add(V.mul(up, 1.1), V.mul(fwd, 0.6)), V.mul(sideR, s * 1.3))), 1.05, 0.3, M.BONE, { noShadow: true }); }   // (b6 v5) lower tusks splayed outward, clear of the eyes
    else r.cone(b, V.add(b, V.add(V.add(V.mul(up, 1.9), V.mul(fwd, 0.7)), V.mul(sideR, s * 0.6))), 1.15, 0.35, M.BONE, { noShadow: true });   // art B2: short thick tusks splayed out
    r.cone(V.add(V.mad(hd, up, 0.6), V.mul(sideR, s * 4.2)), V.add(V.add(V.mad(hd, up, 1.6), V.mul(sideR, s * 6.6)), V.mul(fwd, -1)), 1.4, 0.3, skin);   // ears
  }
  if (MG) for (const s of [-1, 1]) {   // (b6) big ram horns: up out of the brow, curling back, down and forward round the ear
    const pts = [[0.4, 2.6, 2.6], [-0.8, 5.0, 4.4], [-2.4, 7.2, 3.6], [-2.6, 8.4, 0.8], [-0.8, 7.8, -1.4], [1.2, 6.6, -0.6]].map(([f, sd, z]) => V.add(V.add(V.mad(hd, fwd, f), V.mul(sideR, s * sd)), V.mul(up, z)));
    const rad = [2.1, 2.0, 1.8, 1.5, 1.1, 0.55];
    r.group(() => { for (let k = 0; k < pts.length - 1; k++) r.cone(pts[k], pts[k + 1], rad[k], rad[k + 1], k === 4 ? M.FIREM : k > 2 ? M.HAIR : M.BOAR); });   // (b6 v6) smoldering tips   // (b6 v2) dark tan horn, near-black tips   // (b6) plain cream, darker toward the tip (fine ridges read as dots at this size)
  }
  else r.cone(V.add(V.mad(hd, up, 3.6), V.mul(fwd, -1)), V.add(V.mad(hd, up, 8), V.mul(fwd, -3)), 1.6, 0.4, M.HAIR);   // top-knot
  }
  if (IJ) {   // art B4: an iron jaw guard, a barred muzzle grille over the lower face, bolted at the sides
    const jc = V.add(V.mad(hd, fwd, 4.5), V.mul(up, -2.1));
    r.box(jc, [1.1, 2.8, 1.7], M.IRON, frameAlong(fwd, up), { bias: 1, mf: p => { const q = V.sub(p, jc), s2 = V.dot(q, sideR), z2 = V.dot(q, up); if (Math.abs(z2) > 1.1 || Math.abs(s2) > 2.2) return 0; return (((s2 + 10) % 1.3) + 1.3) % 1.3 < 0.5 ? M.DARK : 0; } });
    for (const s of [-1, 1]) r.sph(V.add(V.mad(jc, sideR, s * 2.8), V.mul(fwd, 0.3)), 0.9, M.STEEL, { noShadow: true });
  }
  if (!grunt && !GR) {   // art B2: the warlord's crude gold war-crown, a band with five spikes round the top-knot
    const cc = V.add(V.mad(hd, up, 3.0), V.mul(fwd, -0.4));
    r.cyl(V.mad(cc, up, -0.6), V.mad(cc, up, 0.6), 3.6, M.GOLD);
    for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2, d = V.add(V.mul(fwd, Math.cos(a)), V.mul(sideR, Math.sin(a))), b0 = V.mad(cc, d, 3.2); r.cone(b0, V.add(V.mad(b0, up, 2.6), V.mul(d, 0.6)), 0.9, 0.2, M.GOLD, { noShadow: true }); }
  }
  if (look.helm) {   // the shieldbearer's iron kettle helm, the top-knot poking through
    const hc = V.add(V.mad(hd, up, 2.6), V.mul(fwd, -0.3));
    r.ell(hc, [4.9, 5.1, 2.9], M.SLATE, frameAlong(fwd, up));
    r.cyl(V.mad(hc, up, -0.9), V.mad(hc, up, -0.4), 6.0, M.SLATE);
  }
  if (AZ) for (const q of r.p) if (q.m === ARM) q.bias = (q.bias || 0) - 1;   // (b6) Azhruk's plate one step darker: charcoal
  bigHead(r, h0, hd, GR ? 1.0 : IJ ? 1.15 : look.grunt ? 1.4 : 1.2);   // art B4: the concepts draw Gorr's and Ironjaw's heads small on their bodies   // the grunts' heads are bigger, as the concepts draw them
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
  r.ell(V.mad(hd, up, -2.1), [3.4, 3.2, 2.7], stem, frameAlong(fwd, up), { mf: p => { const q = V.sub(p, hd), f2 = V.dot(q, fwd), s2 = Math.abs(V.dot(q, sideR)), z2 = V.dot(q, up); if (f2 > 1.6 && Math.abs(s2 - 1.25) < 0.55 && Math.abs(z2 + 1.6) < 0.75) return M.EYE; return f2 > 2.4 && s2 < 0.8 && Math.abs(z2 + 3.3) < 0.32 ? M.MOUTH : 0; } });   // art B2: the face set lower and bigger, so it shows under the cap
  // art B2: a broad domed cap over a pale gill skirt, with a few big round spots (fixed, so they never flicker)
  // the cap tipped back, like a hat pushed up, so the face shows under its front rim
  const cU = V.norm(V.add(up, V.mul(fwd, -0.42))), cF = V.cross(sideR, cU), capC = V.add(V.mad(hd, cU, 1.6), V.mul(fwd, -0.4)), SPOTS = [[0.55, 0.15, 0.82, 0.30], [-0.1, -0.62, 0.78, 0.27], [-0.15, 0.68, 0.72, 0.25], [0.05, 0, 1, 0.28], [-0.75, -0.1, 0.66, 0.27], [0.62, -0.62, 0.48, 0.22], [0.66, 0.66, 0.36, 0.2], [-0.55, 0.6, 0.55, 0.22], [-0.5, -0.66, 0.5, 0.22]].map(([a, b, c, w]) => [V.norm([a, b, c]), Math.cos(w)]);
  r.ell(V.mad(capC, cU, -1.2), [5.2, 5.2, 1.2], M.CLOTH_TAN, frameAlong(cF, cU), { mf: p => { const q = V.sub(p, capC); return V.dot(q, cU) < -1.8 && (Math.atan2(V.dot(q, sideR), V.dot(q, cF)) * 4 / Math.PI * 2 + 40) % 2 < 0.7 ? M.WAX : 0; } });   // the gills under the rim
  r.ell(capC, [6.0, 6.0, 3.9], cap, frameAlong(cF, cU), { mf: p => { const q = V.sub(p, capC), l = [V.dot(q, cF) / 6.0, V.dot(q, sideR) / 6.0, V.dot(q, cU) / 3.9], n = V.norm(l); if (l[2] < -0.05) return 0; for (const [d, c] of SPOTS) if (V.dot(n, d) > c) return M.CLOTH_WHITE; return 0; } });
  for (const sd of [-1, 1]) r.ell(V.add(V.add(V.mad(hd, fwd, 2.7), V.mul(sideR, sd * 1.3)), V.mul(up, -1.7)), [0.7, 0.75, 1.2], M.DARK, frameAlong(fwd, up), { noShadow: true });   // art B2: two big dark eyes that read under the cap
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
  // art B2: a ragged hem all the way round: seven torn points of uneven length, trailing back as it glides
  const trail = clip === 'walk' ? 2.2 : reach * -1.5;
  for (let k = 0; k < 7; k++) {
    const an = (k + 0.5) / 7 * Math.PI * 2 + 0.3, d = [Math.cos(an), Math.sin(an), 0], L = [4.6, 3.2, 5.2, 3.6, 4.8, 3.0, 4.2][k];
    const a = V.add(base, [d[0] * 5.2, d[1] * 5.2, 1.4]), tip = V.add(a, [d[0] * 3.0 - trail * (0.5 - d[0] * 0.5) - (f % 2 && clip === 'walk' ? 0.6 : 0), d[1] * 3.0, -L * 0.85]);
    r.cone(a, tip, 1.6, 0.25, robe, { mf: p => V.dot(V.sub(p, a), V.sub(tip, a)) > V.dot(V.sub(tip, a), V.sub(tip, a)) * 0.5 ? M.CLOTH_DARK : 0 });   // flaring out past the robe, the torn ends darkening
  }
  const hd = V.add(top, [1.2, 0, 3.6]);
  r.ell(hd, [4.4, 4.2, 4.6], robe, null, { mf: p => { const q = V.sub(p, hd); if (q[0] > 2.4 && Math.abs(q[2] + 0.3) < 2.4 && Math.abs(q[1]) < 2.6) return (Math.abs(Math.abs(q[1]) - 1.3) < 0.62 && Math.abs(q[2] - 0.1) < 0.62) ? M.FUNGUS2 : M.DARK; return 0; } });
  r.cone(V.add(hd, [-1.8, 0, 3.2]), V.add(hd, [-4.4, 0, 6.2]), 2.2, 0.3, robe);   // hood tip, short and swept up (art B2: was a long beak in the 3/4 views)
  for (const s of [-1, 1]) {
    const sh = V.add(top, [0, s * 4, -2]), hand = V.add(sh, [3 + reach * 6, s * 2, -5 + reach * 3]);
    const cuff = V.add(sh, V.mul(V.sub(hand, sh), 0.82));
    r.cone(sh, cuff, 1.5, 2.3, robe, { mf: p => V.len(V.sub(p, cuff)) < 1.7 ? M.CLOTH_DARK : 0 });   // a bell sleeve, dark inside its mouth
    r.sph(hand, 1.0, M.OLDBONE);
    for (let k = -1; k <= 1; k++) r.cone(hand, V.add(hand, [3.0, s * 0.5 + k * 0.9, -1.4 + k * 0.5]), 0.6, 0.15, M.OLDBONE, { noShadow: true });   // long bony claws
  }
  if (clip === 'death') tipRig(r, [0, 0, 0], 0, 0, [0, 3, 7, 11, 14, 16][f]);   // sinks into the floor
  return r;
}
// ---------------------------------------------------------------- the treant elder (autumn boss)
// A walking tree: a thick bark trunk for a body, root legs, branch arms with twig claws, a knot-hole
// face with glowing eyes, and a crown of autumn leaves. Swings its branch like a club.
const TREANT_B = { hipH: 10, thigh: 5.5, shin: 5, ankle: 1.2, spine: 12, shW: 7.5, shZ: 4, neck: 9, upper: 7.5, fore: 7, hipW: 3.6, stride: 4, lift: 2, duty: 0.6, bob: 0.6, sway: 0.5, runLean: 0.05, counter: 0.1 };
function treantRig(look, st) {
  // art pass (concept "TREANT ELDER"): a broad trunk that flares into roots at the floor, a scowling
  // face under a heavy brow, a crown of three big leaf lobes lifted clear of the face, and long
  // branch arms that end in big hooked twig claws
  const B = TREANT_B, J = bipedJoints(B, st), r = new Rig(), { fwd, sideR, up } = J, bark = M.BARK;
  for (const [hip, knee, ank] of [[J.hipL, J.kneeL, J.ankL], [J.hipR, J.kneeR, J.ankR]]) {
    r.cone(hip, knee, 3.2, 2.9, bark); r.cone(knee, ank, 2.9, 2.7, bark);
    for (const a of [-0.8, 0, 0.8]) r.cone(ank, V.add(ank, [Math.cos(a) * 4.6, Math.sin(a) * 3.4, -1.2]), 1.6, 0.5, bark);   // root toes
  }
  // the trunk: one mass, wide at the base and narrowing up to the crown, with bark grooves
  const base = V.mad(J.pelvis, up, -5), neck = V.mad(J.chest, up, 7);
  const grooves = { mf: p => { const q = V.sub(p, J.pelvis); return Math.abs(Math.sin(Math.atan2(V.dot(q, sideR), V.dot(q, fwd)) * 6 + V.dot(q, up) * 0.18)) < 0.16 ? M.HAIR : 0; } };
  r.group(() => {
    r.cone(base, J.pelvis, 7.4, 7.0, bark, grooves);
    r.cone(J.pelvis, neck, 7.2, 5.6, bark, grooves);
    for (const a of [0.5, 1.6, 2.6, -2.6, -1.6, -0.5]) {   // root flares spreading over the floor
      const d = V.add(V.mul(fwd, Math.cos(a)), V.mul(sideR, Math.sin(a)));
      r.cone(V.add(V.mad(base, up, 3), V.mul(d, 5)), V.add(V.mad(base, up, -1.4), V.mul(d, 12)), 3.0, 0.9, bark);
    }
  });
  const sw = atkIndex(st.clip) >= 0 ? st.key : null;
  const pivot = V.add(V.add(J.chest, V.mul(sideR, 3.5)), V.add(V.mul(up, 4), V.mul(fwd, 1)));
  const U = V.norm(V.add(V.mul(up, Math.cos(0.4)), V.mul(sideR, Math.sin(0.4)))), inPlane = a => V.norm(V.add(V.mul(fwd, Math.cos(a)), V.mul(U, Math.sin(a))));
  // art A4: hands held out from the trunk, elbows bowed outward, as the concept draws them
  let handR = sw ? V.mad(pivot, inPlane(sw.a), (sw.r || 6.5) * 1.5) : V.add(V.add(J.shR, V.mul(fwd, 3.5 + J.swingArm * 2)), V.add(V.mul(up, -12.5), V.mul(sideR, 6.5)));   // art B2: hands lower, nearer the roots
  const handL = V.add(V.add(J.shL, V.mul(fwd, 3.5 - J.swingArm * 2)), V.add(V.mul(up, -12.5), V.mul(sideR, -6.5)));
  if (st.clip === 'death') handR = V.add(J.shR, [3, 3, -11]);
  for (const [sh, hand, s] of [[J.shR, handR, 1], [J.shL, handL, -1]]) {
    const a = armTo(J, sh, V.mad(sh, sideR, s * 1.5), B, s), el = armTo(J, sh, hand, B, s);
    const sh2 = V.mad(sh, sideR, s * 1.2);
    const elb = V.mad(el.el, sideR, s * 2.2);   // the elbow bowed out: a gnarled, angular branch
    r.group(() => { r.cone(sh2, elb, 3.4, 2.6, bark); r.cone(elb, el.hand, 2.6, 2.2, bark); r.sph(el.hand, 2.9, bark); });
    // big hooked claws: four twigs that reach out of the hand and curl inward at the tips
    const dn = V.norm(V.sub(el.hand, elb)), out = V.norm(V.cross(dn, V.cross(sideR, dn)));
    for (const k of [-1.5, -0.5, 0.5, 1.5]) {
      const spread = V.norm(V.add(V.add(dn, V.mul(sideR, k * 0.38 * s)), V.mul(fwd, 0.25)));
      const k1 = V.mad(el.hand, spread, 5.2), k2 = V.add(V.mad(k1, spread, 2.8), V.mul(fwd, 2.2));
      r.group(() => { r.cone(V.mad(el.hand, spread, 1), k1, 1.3, 1.1, bark); r.cone(k1, k2, 1.1, 0.4, bark); });
    }
    void a; void out;
  }
  if (sw && sw.smear && st.prev) smearArc(r, pivot, fwd, U, st.prev.a + (st.prev.ck || 0), sw.a + (sw.ck || 0), 8, 18);
  // face, cut into the trunk under the crown: a heavy scowling brow, deep sockets with green eyes,
  // and a wide down-turned mouth
  const face = V.add(V.mad(J.chest, up, 3.2), V.mul(fwd, 5.4));
  for (const s of [-1, 1]) {
    const eye = V.add(face, V.mul(sideR, s * 2.1));
    r.ell(V.mad(eye, fwd, -0.2), [1.1, 2.3, 1.8], M.DARK, frameAlong(fwd, up), { noShadow: true });   // art B2: bigger sockets and eyes
    r.box(V.add(V.mad(eye, fwd, 0.45), V.mul(up, -0.15)), [0.5, 1.5, 1.0], M.EYE_GRN, frameAlong(fwd, up), { noShadow: true, bias: 1 });
    const br0 = V.add(V.mad(eye, up, 1.7), V.mul(sideR, s * 1.6)), br1 = V.add(V.add(V.mad(eye, up, 1.0), V.mul(sideR, -s * 1.2)), V.mul(fwd, 0.5));
    r.cone(br0, br1, 1.3, 1.5, M.HAIR);   // the brow slants down toward the nose: a scowl
  }
  const mo = V.mad(face, up, -3.4);
  for (const s of [-1, 1]) r.cone(V.add(V.mad(mo, up, 0.5), V.mul(sideR, s * 0.2)), V.add(V.mad(mo, up, -0.7), V.mul(sideR, s * 2.8)), 0.95, 0.7, M.DARK, { noShadow: true });
  // crown: three big lobes in a clover with one on top, lifted clear of the face
  // art A4: the concept's crown is three huge lobes, two low in front and a taller one behind them
  // art B2: four smaller lobes (one high behind, two at the sides, one low in front) on a crown lifted
  // clear of the brow, so the face reads under it as in the concept
  const top = V.mad(J.chest, up, 15.5), leaf = look.green ? M.LEAFM : M.AUTUMNM;
  for (const [f, s, z, rr] of [[-1.8, 0, 4.4, 7.4], [0.8, -6.0, 0, 6.6], [0.8, 6.0, 0, 6.6], [3.6, 0, -0.6, 6.0]]) r.sph(V.add(V.add(V.mad(top, fwd, f), V.mul(sideR, s)), V.mul(up, z)), rr, leaf);
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
  const c = [lean, 0, R0 * (1 - sq * 0.5) + lift], rx = R0 * (1 + sq * 0.45), rz = R0 * (1 - sq * 0.55);
  // art B2: a gumdrop: the round body sits on a wider puddle skirt and rises to a soft drooping tip
  r.group(() => {
    r.ell(c, [rx, rx, rz], mat);
    r.ell([lean * 0.4, 0, R0 * 0.32 * (1 - sq * 0.4) + lift], [rx * 1.18, rx * 1.18, R0 * 0.42], mat);
    const t0 = V.add(c, [-R0 * 0.1, 0, rz * 0.78]), t1 = V.add(c, [-R0 * 0.45 - lean * 0.3, 0, rz + R0 * 0.38]);
    if (clip !== 'death' || f < 3) r.cone(t0, t1, R0 * 0.36, R0 * 0.1, mat);
  });
  // big round eyes: white with a dark pupil low in front
  for (const s of [-1, 1]) {
    const e = V.add(c, [rx * 0.86, s * R0 * 0.36, R0 * 0.14 - (clip === 'death' ? f * 0.3 : 0)]), er = [R0 * 0.16, R0 * 0.23, R0 * 0.31 * (1 - Math.max(0, sq) * 0.6)];
    r.ell(e, er, M.CLOTH_WHITE, null, { noShadow: true, mf: p => { const q = V.sub(p, e); return q[0] > er[0] * 0.2 && q[2] < er[2] * 0.25 ? M.DARK : 0; } });
  }
  if (clip !== 'death') { const m = V.add(c, [rx * 0.9, 0, -R0 * 0.22]); r.ell(m, [R0 * 0.1, R0 * 0.2, R0 * (clip === 'attack' && st.key.hit ? 0.16 : 0.09)], M.DARK, null, { noShadow: true }); }   // a small mouth, wide open on the bite
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
// art B2: one body, five spiders. Per-variant proportions (the cave spider and broodmother keep theirs):
// H body height, abd abdomen offset [x, z] and radii, hk head scale, reach foot spread, ik thigh/shin
// lengths, up knee bend direction, th/sh thigh and shin radii, kn knee bead radius
const SPIDER_V = {
  skit: { H: 7, curl: 4.5, abdO: [-7.2, 3.4], abdR: [7.6, 7, 6.6], hk: 1, reach: 19.5, ik: [11.5, 12], up: 0.3, th: [1.4, 1.15], sh: [1.3, 0.6], kn: 1.3 },
  brood: { H: 5.5, curl: 3.5, abdO: [-8, 3.2], abdR: [9.2, 8, 6.8], hk: 1.35, reach: 24, ik: [17, 17], up: 0.25, th: [1.9, 1.6], sh: [1.6, 0.6], kn: 1.6 },
  // Venom Spitter: a big swollen olive-patched abdomen on short thick legs
  spit: { H: 6, curl: 4, abdO: [-8.4, 4.6], abdR: [8.8, 8, 7.6], hk: 1.22, reach: 16.5, ik: [9.5, 10], up: 0.35, th: [1.7, 1.4], sh: [1.45, 0.75], kn: 1.45 },
  // Stoneback: low and heavy, thick legs, a banded grey stone shell over the back
  stone: { H: 5.2, curl: 3.6, abdO: [-7, 3.2], abdR: [8.2, 7.4, 6], hk: 1.12, reach: 18.5, ik: [11, 11.5], up: 0.3, th: [2, 1.7], sh: [1.7, 0.85], kn: 1.7 },
  // Brood Guard: a tall sentry on long stilt legs, a lean striped abdomen, long fangs
  guard: { H: 13.5, curl: 10, abdO: [-7.2, 3.4], abdR: [8, 5.8, 5], hk: 1, reach: 20, ik: [16, 16.5], up: 0.1, th: [1.3, 1.05], sh: [1.1, 0.55], kn: 1.25 },
  // art B5: the Flintback Matriarch (secret boss): a huge furry brown spider, a big round abdomen under
  // overlapping flint slabs with amber crystals, thick banded legs, ivory tusk fangs
  flint: { H: 7.5, curl: 4.5, abdO: [-10, 4.2], abdR: [11, 10, 8.6], hk: 1.45, cx: 2.2, reach: 23, ik: [14.5, 15], up: 0.32, th: [2.6, 2.2], sh: [2.2, 1.0], kn: 2.1 },
};
// art B5: the flintback's shell: flint slabs [angle up the abdomen's back from the rear (rad), half length,
// half width, half thickness, roll] and amber crystal clusters [slab, offset along, offset across, [[tilt fwd, tilt side, length]...]]
const FLINT_SLABS = [[0.75, 3.6, 8.4, 1.0, 0.12], [1.2, 4.2, 10, 1.1, -0.1], [1.65, 4.4, 10.6, 1.2, 0.08], [2.05, 3.8, 9, 1.0, -0.12]];
const FLINT_XTAL = [[2, 0.6, -1.8, [[0.2, -0.3, 6.4], [-0.5, 0.3, 4.6], [0.5, 0.6, 3.6], [-0.2, -0.8, 3.2]]], [1, -0.4, 2.6, [[0.1, 0.4, 5], [-0.5, -0.2, 3.6], [0.5, 0.1, 2.8]]], [0, 0.4, -1.4, [[-0.3, -0.3, 4.4], [0.3, 0.4, 3]]]];
function spiderRig(look, st) {
  const kind = look.flint ? 'flint' : look.brood ? 'brood' : look.spit ? 'spit' : look.stone ? 'stone' : look.guard ? 'guard' : 'skit', P = SPIDER_V[kind];
  const flint = kind === 'flint', brood = kind === 'brood', skit = kind === 'skit', spit = kind === 'spit', stone = kind === 'stone', guard = kind === 'guard';
  const r = new Rig(), ch = look.chitin || (spit ? M.LEATHER : stone ? M.HAIR : flint ? M.LEATHER : M.CHITIN);
  const { clip, f } = st;
  let bob = 0, rear = 0, ph = 0, moving = false, curl = 0, aim = 0, spat = false;
  if (clip === 'idle') bob = [0, -0.3, -0.4, -0.2][f % 4];
  if (clip === 'walk') { ph = f / 8 * Math.PI * 2; moving = true; bob = -0.4 * Math.abs(Math.sin(ph * 2)); }
  let strike = false;
  if (clip === 'attack') { const a = st.key.a; rear = a > 0.5 ? 1.6 : st.key.hit ? -0.3 : 0.5; strike = !!st.key.hit || st.key.mv > 0; }   // round 34: reared high, then driven down
  if (clip === 'shoot' || clip === 'cast') { aim = Math.min(1, st.key.a); spat = !!st.key.hit; }   // art B2: the spitter rears back on its hind legs, then spits
  if (clip === 'hit') rear = -0.3;
  if (clip === 'death') curl = [0, 0.25, 0.55, 0.85, 1, 1][f];
  // the broodmother: low heavy body, long sprawling legs, red chevrons down the abdomen
  const H = P.H + rear * 2.5 + aim * 3.4 - curl * P.curl;
  const ceph = [3.5 + (P.cx || 0), 0, H + bob + rear * 1.5 + aim * 4.5], abd = [P.abdO[0] - aim * 1.6, 0, H + P.abdO[1] + bob - rear - aim * 4];
  // the flintback's fur: dark flecks on a 1.7-unit lattice, hashed so they don't line up
  const fur = c => (p => { const q = V.sub(p, c), i = Math.floor(q[0] / 1.7), j = Math.floor(q[1] / 1.7), k = Math.floor(q[2] / 1.7);
    const h = Math.abs(Math.sin(i * 12.99 + j * 78.23 + k * 37.72) * 43758.5) % 1; if (h > 0.45) return 0;
    const dx = q[0] - (i + 0.5) * 1.7, dy = q[1] - (j + 0.5) * 1.7, dz = q[2] - (k + 0.5) * 1.7; return dx * dx + dy * dy + dz * dz < 0.5 ? M.HAIR : 0; });
  const mfAbd = flint ? fur(abd) : brood ? (p => {
    const q = V.sub(p, abd);
    if (q[2] < 1.5) return 0;
    const u = q[0], v = Math.abs(q[1]);
    if (v < 0.8 && u > -6.5 && u < 6.5) return M.MARKB;                                 // spine stripe
    for (const c of [3, -0.8, -4.6]) if (Math.abs((u - c) + v * 0.8) < 0.8 && v < 4) return M.MARKB;   // chevrons
    return 0;
  }) : spit ? (p => {   // the spitter: big pale olive blotches over the top and flanks
    const q = V.sub(p, abd);
    if (q[2] < -2.2) return 0;
    const u = q[0], v = q[1];
    for (const [cu, cv, ru, rv] of [[2.6, 0, 3.6, 3.1], [-2.6, 3.8, 3.4, 2.7], [-2.6, -3.8, 3.4, 2.7], [-7, 0, 2.4, 2.6]]) if ((u - cu) * (u - cu) / (ru * ru) + (v - cv) * (v - cv) / (rv * rv) < 1) return M.SLIME;
    return 0;
  }) : guard ? (p => {   // the guard: three red stripes running down the abdomen
    const q = V.sub(p, abd);
    if (q[2] < 0) return 0;
    const v = Math.abs(q[1]);
    return v < 0.7 || Math.abs(v - 2.9 + q[0] * 0.05) < 0.6 ? M.MARKB : 0;
  }) : stone ? null : (p => {   // art B2: the cave skitter's pale tan spots (a big one on the crest, a small one behind)
    const q = V.sub(p, abd);
    if (q[2] < 2) return 0;
    const u = q[0], v = q[1];
    if ((u - 0.8) * (u - 0.8) / 6.2 + v * v / 3.6 < 1) return M.WAX;
    if ((u + 3.6) * (u + 3.6) / 1.6 + (v - 1.4) * (v - 1.4) / 1.3 < 1) return M.WAX;
    return 0;
  });
  const tilt = guard ? 0.4 : 0;   // the guard carries its abdomen cocked up behind it
  r.ell(abd, P.abdR, spit ? M.HAIR : ch, tilt ? [[Math.cos(tilt), 0, -Math.sin(tilt)], [0, 1, 0], [Math.sin(tilt), 0, Math.cos(tilt)]] : null, mfAbd ? { mf: mfAbd } : {});   // the spitter's abdomen is a darker brown under its blotches
  if (stone) for (const [x, z, rx, ry, rz] of [[6.4, 0.6, 3.8, 6.6, 4], [2.8, 1.8, 4.2, 8.4, 5.4], [-1.4, 2, 4.4, 8.8, 5.6], [-5.6, 1, 4, 7.8, 4.8]])
    r.ell(V.add(abd, [x, 0, z]), [rx, ry, rz], M.ROCK, null, { mf: p => {   // a broad shell of overlapping stone plates, each its own part so the seams show; a few dark cracks
      const q = V.sub(p, abd), y = q[1] + x * 0.7, k = Math.abs(((y % 5.2) + 5.2) % 5.2 - 2.6 + Math.abs(((q[0] - x) * 1.1) % 2 - 1) * 1.2);
      return k < 0.42 && q[2] > z ? M.ROCKRISE : 0;
    } });
  if (flint) {   // art B5: overlapping flint slabs over the back, each its own part so the seams show; amber crystals grow out of them
    const R = P.abdR, sl = [];
    FLINT_SLABS.forEach(([t, hl, hw, ht, roll], i) => {
      const c = V.add(abd, [-Math.cos(t) * R[0] * 0.98, 0, Math.sin(t) * R[2] * 0.98]);
      const n = V.norm([-Math.cos(t) * R[2] / R[0], 0, Math.sin(t)]);   // the abdomen's surface normal there
      const tg0 = V.norm(V.cross([0, 1, 0], n)), sd0 = [0, 1, 0];
      const sr = V.norm(V.add(V.mul(sd0, Math.cos(roll)), V.mul(n, Math.sin(roll)))), nn = V.norm(V.cross(tg0, sr));
      const yw = [0.18, -0.12, 0.1, -0.2][i], tg = V.add(V.mul(tg0, Math.cos(yw)), V.mul(sr, Math.sin(yw))), sd = V.sub(V.mul(sr, Math.cos(yw)), V.mul(tg0, Math.sin(yw)));   // each slab turned a little, so no two edges line up
      const cc = V.mad(c, nn, ht * 0.4 + i * 0.25);
      r.box(cc, [hl, hw, ht], M.ROCK, [tg, sd, nn]);
      if (i < 3) {   // a smaller flake of flint stacked on the slab (a second layer), the crystals grow from it
        const ys = -yw * 1.6, ft = V.add(V.mul(tg, Math.cos(ys)), V.mul(sd, Math.sin(ys))), fs = V.sub(V.mul(sd, Math.cos(ys)), V.mul(tg, Math.sin(ys)));
        const fc = V.add(V.mad(cc, nn, ht + 0.6), V.mul(tg, -hl * 0.2));
        r.box(fc, [hl * 0.6, hw * 0.55, 0.8], M.ROCK, [ft, fs, nn]);
        sl.push({ c: V.mad(fc, nn, 0.8), tg: ft, sd: fs, nn });
      } else sl.push({ c: V.mad(cc, nn, ht), tg, sd, nn });
    });
    r.group(() => {
      for (const [k, u, v, xs] of FLINT_XTAL) {
        const s = sl[k], base = V.add(V.mad(s.c, s.tg, u), V.mul(s.sd, v));
        r.sph(base, 1.6, M.FIREM, { noShadow: true });
        for (const [a, b, L] of xs) r.cone(V.mad(base, s.nn, -0.4), V.add(V.add(V.mad(base, s.nn, L), V.mul(s.tg, a * L * 0.5)), V.mul(s.sd, b * L * 0.5)), 1.5, 0.35, M.PUMPKIN);
      }
    });
  }
  if (brood) r.group(() => {   // art B2: a clutch of pale egg sacs webbed to the back of her abdomen
    for (const [x, y, z, rr] of [[-8.6, -2, 1.6, 1.7], [-8.6, 2, 1.6, 1.7], [-9.3, 0, 0, 1.8], [-8.2, 0, 3.4, 1.8], [-9.2, -1, 3, 1.4], [-9.2, 1, 3, 1.4]]) r.sph(V.add(abd, [x, y, z]), rr, M.OLDBONE);
  });
  const hk = P.hk;   // the broodmother's head is bigger, with a heavier eye cluster and fangs
  r.ell(ceph, [4.4 * hk, 4.2 * hk, 3.2 * hk], ch, null, flint ? { mf: fur(ceph) } : skit ? { mf: p => { const q = V.sub(p, ceph); return q[2] > 2.2 && (q[0] + 0.6) * (q[0] + 0.6) + q[1] * q[1] < 1.6 ? M.WAX : 0; } } : {});
  // eyes: a cluster of beads on the front (the skitter and spitter: two big front eyes over the fangs)
  const eyes = brood ? [[-1, 0.8, 0.6], [1, 0.8, 0.6], [-2, 1.4, 0.45], [2, 1.4, 0.45], [-0.6, 1.8, 0.4], [0.6, 1.8, 0.4]] : [[-1.1, 0.7, 0.85], [1.1, 0.7, 0.85], [-2, 1.5, 0.45], [2, 1.5, 0.45], [-0.6, 1.9, 0.4], [0.6, 1.9, 0.4]];
  if (spit || stone) { eyes[0][2] = eyes[1][2] = 1.05; eyes[2][2] = eyes[3][2] = 0.6; }   // the spitter's big green eyes, the stoneback's orange ones
  if (flint) { eyes.length = 4; eyes[0][2] = eyes[1][2] = 1.0; eyes[2][2] = eyes[3][2] = 0.5; }   // two big yellow eyes and two small
  for (const [y, z, s] of eyes) r.sph(V.add(ceph, [3.7 * hk, y * hk, z * hk]), s * hk, spit ? M.EYE_GRN : stone ? M.FIREM : flint ? M.EYE_YEL : M.EYE_RED, { noShadow: true });
  // fangs (the skitter's are white, the spitter's venom green); the spitter's gape on the spit
  const gape = spit ? aim * 0.8 : 0;
  if (flint) for (const s of [-1, 1]) {   // art B5: big curved ivory tusks, down and in
    const at = (x, y, z) => V.add(ceph, [x * hk + rear, s * y * hk, z * hk + rear]);
    const a = at(3.3, 1.5, -1.5), b = at(5, 2, -3.4), c = at(5.6, 1.7, -5.3), d = at(5, 0.7, -6.7);   // out, down, then the tip hooks back in
    r.group(() => { r.cone(a, b, 1.3 * hk, 1.05 * hk, M.BONE); r.cone(b, c, 1.05 * hk, 0.75 * hk, M.BONE); r.cone(c, d, 0.75 * hk, 0.25, M.BONE); });
  }
  else for (const s of [-1, 1]) r.cone(V.add(ceph, [3.6 * hk, s * 1.1 * hk, -1.2 * hk]), V.add(ceph, [4.6 * hk + rear + aim * 0.6, s * (0.7 + gape) * hk, (guard ? -5.6 : -4) * hk + rear]), (brood ? 0.8 : 0.9) * hk, brood ? 0.25 : 0.35, brood ? M.HORN : spit ? M.SLIME : M.BONE);
  if (spit && !curl) {   // a bead of venom hangs between the fangs; on the spit a glob leaves the mouth
    if (spat) { r.sph(V.add(ceph, [8.6 * hk, 0, -1.4 * hk]), 2.1, M.SLIME, { noShadow: true }); r.sph(V.add(ceph, [5.6 * hk, 0, -2.4 * hk]), 1, M.SLIME, { noShadow: true }); }
    else r.sph(V.add(ceph, [4.4 * hk, 0, -3.6 * hk]), 0.8 + aim * 0.4, M.SLIME, { noShadow: true });
  }
  // legs: 4 per side, knees high; alternating tetrapod gait
  const ang = flint ? [0.85, 1.35, 1.85, 2.4] : [0.55, 1.15, 1.85, 2.45];   // the flintback's front legs splay out to the sides, clear of her face
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) {
    const a = ang[i], hip = flint ? V.add(ceph, [Math.cos(a) * 2.6 - 1.6, s * Math.sin(a) * 4.4, -1.8]) : V.add(ceph, [Math.cos(a) * 2.2 - 0.5, s * Math.sin(a) * 2.6, -0.4]);
    const grp = (i + (s > 0 ? 1 : 0)) % 2, p = ph + grp * Math.PI;
    const reach = P.reach - Math.abs(i - 1.5) * 1.2;
    let foot = [ceph[0] + Math.cos(a) * reach - 1.5 - (moving ? 2.4 * Math.cos(p) : 0), s * Math.sin(a) * reach, moving ? 1.8 * Math.max(0, Math.sin(p)) : 0];
    if (aim && i === 0) foot = [ceph[0] + 5 + aim * 2.5, s * (6.5 + aim * 2.5), aim * 9];
    if (aim > 0.5 && i === 1) foot = [ceph[0] + 6, s * 11, 2.5];   // the spitter: front legs lifted and spread, braced on the rest
    if (rear > 0.4 && i === 0) foot = [ceph[0] + 8, s * 6, 8 * rear];   // front legs raised, fangs bared
    if (rear > 1.2 && i === 1) foot = [ceph[0] + 11, s * 9, 5];
    if (strike && i === 0) foot = [ceph[0] + 13, s * 2.5, 0];   // driving the front legs into the target
    if (curl) foot = V.lerp(foot, [ceph[0] - 1, s * 3, H + 5], curl * 0.85);
    const L = ik(hip, foot, P.ik[0], P.ik[1], [0, s * P.up, 1]);
    r.cone(hip, L.joint, P.th[0], P.th[1], ch);
    if (flint) {   // art B5: thick banded legs, three segments with dark joint bands, a dark pointed tip
      const m = V.lerp(L.joint, L.end, 0.5), t = V.lerp(L.joint, L.end, 0.86);
      r.cone(L.joint, m, P.sh[0], 1.7, ch); r.cone(m, t, 1.6, 1.15, ch); r.cone(t, L.end, 1.05, 0.5, M.HAIR);
      r.sph(m, 1.75, M.HAIR);
    }
    else if (skit || guard) { const m = V.lerp(L.joint, L.end, skit ? 0.62 : 0.7); r.cone(L.joint, m, skit ? 1.15 : P.sh[0], skit ? 0.9 : 0.8, ch); r.cone(m, L.end, skit ? 0.9 : 0.8, skit ? 0.6 : 0.5, M.MARK); }   // red-tipped feet
    else r.cone(L.joint, L.end, P.sh[0], P.sh[1], ch);
    r.sph(L.joint, P.kn, flint ? M.HAIR : spit || stone ? ch : guard ? M.MARKB : M.MARK);
    if (brood && !curl) r.cone(L.joint, V.add(L.joint, [0.6, s * 0.9, 3.2]), 1.1, 0.3, M.MARKB);   // art B2: a red spur on every knee
  }
  if (look.scale && look.scale !== 1) scaleRig(r, look.scale);
  return r;
}

// ---------------------------------------------------------------- art B2: new monsters
// Cave Bat, Bog Toad and Restless Dead, built from the user's concept sheets. Each has its own rig;
// nothing here is reached by any other monster.

// cave bat: one membrane wing. root = the shoulder, s = side (+1 right), lift = how far the wing is
// raised (radians, + up), fold = 0 spread .. 1 half folded, sweep = how far it is swept back.
// The membrane is three lobes fanned from the wrist along the fingers (so the trailing edge is
// scalloped between the finger tips) and an inner panel back to the body; the finger bones are
// painted onto it, and a thick arm bone runs along the leading edge.
function batWing(r, root, s, lift, fold, sweep, bone, mem) {
  const span = V.norm([-sweep, s * Math.cos(lift), Math.sin(lift)]);
  const chord = V.norm(V.mad([1, 0, 0], span, -span[0])), nrm = V.cross(span, chord);
  const P = (u, v) => V.add(V.mad(root, span, u), V.mul(chord, v));
  const k = 1 - 0.4 * fold, wrist = P(8 * (1 - 0.25 * fold), 1.2);
  const tips = [P(18 * k, 0.6), P(15.5 * k, -5.5), P(10.5 * k, -8.5)];
  const segD = (p, a, b) => { const ab = V.sub(b, a), t = clamp(V.dot(V.sub(p, a), ab) / V.dot(ab, ab), 0, 1); return V.len(V.sub(p, V.mad(a, ab, t))); };
  const fingers = { mf: p => tips.some(t => segD(p, wrist, t) < 0.6) ? M.CLOTH_DARK : 0 };
  r.group(() => {
    for (const t of tips) {
      const ax = V.norm(V.sub(t, wrist)), L = V.len(V.sub(t, wrist)) / 2 + 0.4;
      r.ell(V.lerp(wrist, t, 0.46), [L * 0.92, 1.85, 0.8], mem, [ax, V.norm(V.cross(nrm, ax)), nrm], fingers);
    }
    r.ell(P(4.6 * k, -3.2), [4.8 * k, 4.2, 0.8], mem, [span, chord, nrm], fingers);
  });
  r.cone(root, wrist, 1.25, 0.95, bone);
  r.cone(wrist, tips[0], 0.95, 0.5, bone);
  for (const t of tips.slice(1)) r.cone(V.lerp(wrist, t, 0.7), V.mad(t, V.norm(V.sub(t, wrist)), 0.6), 0.75, 0.2, bone);   // the finger tips poke out past the membrane in points
  r.cone(wrist, V.add(wrist, V.add(V.mul(chord, 1.6), V.mul(nrm, 0.6))), 0.7, 0.3, M.OLDBONE, { noShadow: true });   // thumb claw
}
// cave bat: a furry brown body with tall ears and yellow eyes between two wide wings. It hovers
// above the floor (the game draws its shadow there), flaps on idle and walk, climbs and swoops on
// the attack, and crumples to the floor when it dies.
function batRig(look, st) {
  const r = new Rig(), { clip, f } = st, fur = M.HAIR, mem = M.CHITIN, bone = M.HAIR;
  let H = 15, lift = 0.3, fold = 0, sweep = 0.55, pitch = 0, fx = 0, mouth = 0, reach = 0, dead = 0;
  if (clip === 'idle') { lift = [0.55, -0.25, 0.3, 1.0][f % 4]; fold = [0, 0, 0.1, 0.3][f % 4]; H += [0, 0.9, 0.4, -0.6][f % 4]; }
  else if (clip === 'walk') { const c = Math.cos(f / 8 * Math.PI * 2); lift = 0.25 + 0.7 * c; fold = Math.max(0, c) * 0.3; H -= c * 0.9; pitch = 0.25; }
  else if (clip === 'attack') {
    const k = st.key, a = k.a;
    if (a > 1) { H += 4; lift = 1.1; fold = 0.2; pitch = -0.3; mouth = 0.5; }                                    // climbing, wings high
    else if (k.hit || k.mv > 0) { H -= 5; fx = 3; lift = 0.55; sweep = 0.6; pitch = 0.6; mouth = 1; reach = 1; }   // the dive, claws out
    else { H -= 1; lift = -0.35; pitch = 0.1; mouth = 0.3; }
  }
  else if (clip === 'hit') { pitch = -0.45; lift = 0.9; fold = 0.3; fx = -1.5; mouth = 0.6; }
  else if (clip === 'death') { dead = [0, 0.2, 0.5, 0.8, 1, 1][f]; H = lerp(15, 2.6, dead); lift = lerp(0.8, -0.1, dead); fold = 0.3 * dead; pitch = -0.4 + 1.5 * dead; mouth = 0.6; }
  const up = V.rotY([0, 0, 1], pitch), fwd = V.rotY([1, 0, 0], pitch), side = [0, 1, 0];
  const c = [fx, 0, H];
  r.ell(c, [3.0, 3.2, 3.9], fur, [fwd, side, up], { mf: p => { const q = V.sub(p, c); return V.dot(q, fwd) > 1.6 && V.dot(q, up) < 1.6 ? M.LEATHER : 0; } });   // a lighter chest
  const hd = V.add(V.mad(c, up, 5.6), V.mul(fwd, 0.8));
  r.sph(hd, 3.6, fur);
  const sn = V.add(V.mad(hd, fwd, 2.9), V.mul(up, -1.0));
  r.ell(sn, [1.5, 1.6, 1.2], fur, [fwd, side, up], { mf: p => V.dot(V.sub(p, sn), fwd) > 1.1 && V.dot(V.sub(p, sn), up) > 0.1 ? M.DARK : 0 });
  for (const s of [-1, 1]) r.sph(V.add(V.add(V.mad(hd, fwd, 2.9), V.mul(side, s * 1.45)), V.mul(up, 0.6)), 0.8, M.EYE_YEL, { noShadow: true });
  if (mouth > 0) {
    const mo = V.add(V.mad(sn, up, -1.1), V.mul(fwd, 0.2));
    r.ell(mo, [0.9, 1.1, 0.5 + 0.5 * mouth], M.DARK, [fwd, side, up], { noShadow: true });
    for (const s of [-1, 1]) r.cone(V.add(V.mad(mo, side, s * 0.6), V.mul(up, 0.4)), V.add(V.add(V.mad(mo, side, s * 0.6), V.mul(up, -0.9)), V.mul(fwd, 0.5)), 0.45, 0.15, M.CLOTH_WHITE, { noShadow: true });
  }
  for (const s of [-1, 1]) {   // tall pointed ears, pink inside
    const b = V.add(V.mad(hd, side, s * 2.0), V.mul(up, 1.8)), t = V.add(V.add(V.mad(hd, side, s * 4.3), V.mul(up, 8.9)), V.mul(fwd, -0.6));
    r.cone(b, t, 2.3, 0.2, fur, { mf: p => V.dot(V.sub(p, b), fwd) > 0.5 && V.dot(V.sub(p, b), up) > 0.8 ? M.SKIN : 0 });
  }
  for (const s of [-1, 1]) {   // little feet hanging under the body, claws out on the dive
    const a = V.add(V.mad(c, up, -2.8), V.mul(side, s * 1.3)), b = V.add(V.add(V.mad(a, up, -2.6 + reach), V.mul(fwd, 0.5 + reach * 2.6)), V.mul(side, s * 0.3));
    r.cone(a, b, 0.95, 0.7, fur);
    for (const k of [-1, 1]) r.cone(b, V.add(V.add(V.mad(b, up, -1.1), V.mul(fwd, 0.6 + reach)), V.mul(side, k * 0.45)), 0.45, 0.2, M.OLDBONE, { noShadow: true });
  }
  for (const s of [-1, 1]) batWing(r, V.add(V.mad(c, up, 1.5), V.mul(side, s * 2.2)), s, lift, fold, sweep, bone, mem);
  if (look.scale && look.scale !== 1) scaleRig(r, look.scale);
  return r;
}
// bog toad: a big squat olive toad, warty back, pale throat, heavy-browed orange eyes. Idles with a
// pulsing throat, hops to move, and lashes its tongue out on the attack; dies rolled onto its back.
const TOAD_LASH = [{ a: 1.3, ms: 280, tele: true }, { a: 1.35, ms: 100 }, { a: 0.2, ms: 70, mv: 0.3 }, { a: 0, ms: 90, hit: true }, { a: 0.3, ms: 260, open: true }, { a: 0.7, ms: 110 }];
const TOAD_WARTS = [[-3, 2.6, 1.3], [-1, -3, 1.4], [1.2, 1.6, 1.1], [-4.8, -1, 1.2], [2.4, -1.8, 1.0], [-2, 0, 1.3], [0, 3.8, 1.0], [-5.5, 3, 1.0], [-3.4, -4.2, 1.1], [0.4, -0.2, 1.0]];
function toadRig(look, st) {
  const r = new Rig(), { clip, f } = st, hide = M.OGRE, pale = M.STRAWM;
  let Z = 0, sq = 0, lean = 0, mouth = 0, tongue = 0, throat = 0, ext = 0, dead = 0;
  if (clip === 'idle') throat = [0, 0.5, 1, 0.5][f % 4];
  else if (clip === 'walk') { const g = f % 8; Z = [0, 1.5, 4.5, 5.5, 4, 1.5, 0, 0][g]; sq = [0.25, 0, -0.1, -0.1, 0, 0.1, 0.3, 0.12][g]; ext = [0, 0.6, 1, 0.8, 0.4, 0.1, 0, 0][g]; lean = [0.05, -0.12, -0.08, 0, 0.08, 0.12, 0.05, 0][g]; }
  else if (clip === 'attack') {
    const k = st.key;
    if (k.a > 1) { lean = -0.24; throat = 1.4; sq = 0.25; }
    else if (k.hit || k.mv > 0) { lean = 0.16; mouth = 1.2; tongue = k.hit ? 16 : 8; }
    else { mouth = 0.5; tongue = 3; }
  }
  else if (clip === 'hit') { lean = -0.22; sq = 0.3; mouth = 0.4; }
  else if (clip === 'death') { dead = [0, 0.2, 0.5, 0.85, 1, 1][f]; mouth = 0.6; ext = 0.5 * dead; }
  const up = V.rotY([0, 0, 1], lean), fwd = V.rotY([1, 0, 0], lean), side = [0, 1, 0], ax = [fwd, side, up];
  const base = [0, 0, Z], at = (x, y, z) => V.add(V.add(V.add(base, V.mul(fwd, x)), V.mul(side, y)), V.mul(up, z * (1 - sq * 0.35)));
  const bc = at(-1.5, 0, 6.2), BR = [7.2, 6.6, 5.2 * (1 - sq * 0.3)], hc = at(4.2, 0, 7.6);
  r.group(() => {
    r.ell(bc, BR, hide, ax);
    for (const [x, y, rr] of TOAD_WARTS) { const h = 1 - (x / BR[0]) ** 2 - (y / BR[1]) ** 2; r.sph(V.add(V.add(V.mad(bc, fwd, x), V.mul(side, y)), V.mul(up, BR[2] * Math.sqrt(Math.max(0, h)) - 0.4)), rr, hide); }
    r.ell(hc, [4.2, 5.6, 3.4], hide, ax, { mf: p => { const q = V.sub(p, hc); return mouth === 0 && V.dot(q, fwd) > 1.8 && Math.abs(V.dot(q, up) + 1.0) < 0.35 ? M.DARK : 0; } });
    for (const s of [-1, 1]) r.ell(V.add(V.mad(hc, side, s * 3.0), V.add(V.mul(up, 2.5), V.mul(fwd, 0.4))), [1.9, 1.6, 1.3], hide, ax);   // heavy brows over the eyes
  });
  for (const s of [-1, 1]) {   // orange eyes with a dark slit, under the brow
    const e = V.add(V.mad(hc, side, s * 3.3), V.add(V.mul(up, 1.7), V.mul(fwd, 1.9)));
    r.sph(e, 1.45, M.FIREM, { noShadow: true, mf: p => Math.abs(V.dot(V.sub(p, e), up)) < 0.3 && V.dot(V.sub(p, e), fwd) > 0.6 ? M.DARK : 0 });
  }
  const jaw = V.add(at(5.2, 0, 4.2), V.mul(up, -mouth * 1.6));
  if (mouth > 0) r.ell(V.lerp(hc, jaw, 0.5), [3.4, 4.6, 1.2 + mouth], M.DARK, ax, { noShadow: true });
  r.ell(jaw, [3.8 + throat * 0.5, 4.8 + throat * 0.5, 3.2 + throat * 0.6], pale, ax);   // pale throat that swells on the idle
  if (tongue > 0) {
    // the tongue whips out level and straight, a fat sticky club at the end
    const t0 = V.lerp(hc, jaw, 0.5), t1 = [t0[0] + tongue + 3, 0, Math.max(3, t0[2] - 0.6)];
    r.group(() => { r.cone(t0, t1, 1.2, 1.0, M.CLOTH_RED); r.ell(t1, [2.0, 1.8, 1.5], M.CLOTH_RED); });
  }
  const toes = (ft, dir, s) => { for (const k of [-1, 0, 1]) r.cone(ft, V.add(V.mad(ft, dir, 2.0), V.mul(side, s * 0.2 + k * 1.0)), 0.75, 0.4, M.BONE, { noShadow: true }); };
  const fz = Math.max(0, Z - 2.5);
  for (const s of [-1, 1]) {
    // front legs: short and bowed, planted wide in front of the throat
    const sh = at(3.0, s * 4.6, 4.8), el = V.add(at(4.4, s * 6.4, 2.6), [0, 0, 0]), ft = [5.8 + ext * 1.5, s * 6.0, fz + 0.6];
    r.cone(sh, el, 1.7, 1.4, hide); r.cone(el, ft, 1.4, 1.1, hide);
    toes(ft, [1, 0, 0], s);
    // hind legs: a big folded thigh at the flank, the shin and long foot tucked under it; kicked back on the hop
    const th = at(-4.6, s * 5.8, 4.3), kn = V.lerp(at(-1.4, s * 7.2, 2.4), at(-7.5, s * 6.6, 2.6), ext), an = V.lerp([-5.2, s * 6.6, fz + 0.7], V.add(base, [-12, s * 5.4, 1.6]), ext);
    r.ell(th, [4.0, 2.5, 3.3], hide, ax);
    r.cone(kn, an, 1.5, 1.1, hide);
    const fd = V.norm(V.lerp([1, 0, 0], [-1, 0, -0.2], ext));
    toes(an, fd, s);
  }
  if (clip === 'death') tipRig(r, [0, 0, 6], 0, dead * 2.5, dead * 0.5);   // rolls onto its back, legs up
  if (look.scale && look.scale !== 1) scaleRig(r, look.scale);
  return r;
}
// restless dead: a hunched, shambling corpse with a big bald head, rotten green-grey flesh, red eyes in
// sunken sockets and a hanging jaw; a torn brown tunic and ragged dark trousers, bare feet. One arm
// reaches out ahead, the other hangs; it lurches, dragging the left foot. Both arms come down on the attack.
const ZOMBIE_B = { hipH: 11.5, thigh: 6, shin: 5.6, ankle: 1.2, spine: 7, shW: 4.6, shZ: 2.6, neck: 8.6, upper: 5.6, fore: 5.2, hipW: 2.6, stride: 3.4, lift: 1.6, duty: 0.66, bob: 0.9, sway: 1.1, runLean: 0.1, counter: 0.12, hunch: 0.28 };
const ZOMBIE_GRAB = [{ a: 1.6, ms: 320, tele: true }, { a: 1.7, ms: 120 }, { a: 0.6, ms: 80, mv: 0.3 }, { a: -0.3, ms: 70, hit: true }, { a: -0.5, ms: 320, open: true }, { a: 0, ms: 130 }];
function zombieRig(look, st) {
  const B = ZOMBIE_B, J = bipedJoints(B, st), r = new Rig(), { fwd, sideR, up } = J, { clip, f } = st;
  const flesh = M.OLDBONE, bony = M.BONE, rag = M.LEATHER, pants = M.CLOTH_SHADOW;   // pale grey corpse flesh, paler bony hands and feet
  if (clip === 'walk') {   // the lurch: the left foot drags, barely leaving the floor
    const g = gaitFoot(B, f / 8), L = ik(J.hipL, [g[0], -B.hipW, g[1] * 0.2 + B.ankle], B.thigh, B.shin, [1, 0, 0.1]);
    J.kneeL = L.joint; J.ankL = L.end;
  }
  for (const [hip, knee, ank] of [[J.hipL, J.kneeL, J.ankL], [J.hipR, J.kneeR, J.ankR]]) {
    const cuff = V.lerp(knee, ank, 0.55);
    r.group(() => { r.cone(hip, knee, 1.8, 1.55, pants); r.cone(knee, cuff, 1.55, 1.5, pants); });
    r.cone(cuff, ank, 1.15, 1.0, flesh);
    r.ell(V.add(ank, [1.3, 0, -0.6]), [2.4, 1.3, 0.9], bony);
  }
  r.ell(J.pelvis, [3.0, 4.0, 2.4], pants);
  // the tunic: a torn sack from the hips to the shoulders, with ragged tails hanging below the hem
  const hem = V.mad(J.pelvis, up, 1.2), top = V.mad(J.chest, up, 2.6);
  r.group(() => {
    r.cone(hem, top, 3.7, 4.2, rag, { mf: p => { const q = V.sub(p, J.chest); return [[1.5, 3.4, -2], [-2, 3.8, 1.5], [3.6, -1.8, -4]].some(([x, y, z]) => (V.dot(q, fwd) - x) ** 2 + (V.dot(q, sideR) - y) ** 2 + (V.dot(q, up) - z) ** 2 < 1.3) ? M.DARK : 0; } });
    for (const [a, l] of [[0.3, 3.4], [1.5, 2.2], [2.6, 3.6], [3.7, 2.4], [4.8, 3.2], [5.8, 2.0]]) {
      const d = V.add(V.mul(fwd, Math.cos(a)), V.mul(sideR, Math.sin(a))), p0 = V.mad(hem, d, 3.2);
      r.cone(p0, V.add(V.mad(p0, up, -l), V.mul(d, 0.7)), 1.3, 0.3, rag);
    }
  });
  // arms: the right reaches straight ahead, the left hangs low and forward; both come up and down on the attack
  const sw = st.key || null, sh = J.swingArm || 0;
  let hR = V.add(V.mad(J.shR, fwd, 9.5 + sh), V.add(V.mul(up, -1.5), V.mul(sideR, -0.8)));
  let hL = V.add(V.mad(J.shL, fwd, 4.5 - sh), V.mul(up, -7.5));
  if (clip === 'attack' && sw) {
    if (sw.a > 1) { hR = V.add(V.mad(J.shR, fwd, 3), V.mul(up, 5)); hL = V.add(V.mad(J.shL, fwd, 3), V.mul(up, 5)); }
    else if (sw.hit || sw.mv > 0) { hR = V.add(V.mad(J.shR, fwd, 9.5), V.mul(up, -3 - (sw.hit ? 1 : 0))); hL = V.add(V.mad(J.shL, fwd, 9.5), V.mul(up, -3 - (sw.hit ? 1 : 0))); }
    else { hR = V.add(V.mad(J.shR, fwd, 8), V.mul(up, -5)); hL = V.add(V.mad(J.shL, fwd, 7), V.mul(up, -6)); }
  }
  if (clip === 'hit') { hR = V.add(V.mad(J.shR, fwd, 4), V.mul(up, 1)); hL = V.add(V.mad(J.shL, fwd, 3), V.mul(up, -5)); }
  for (const [s0, hand, s] of [[J.shR, hR, 1], [J.shL, hL, -1]]) {
    const a = armTo(J, s0, hand, B, s);
    r.cone(s0, a.el, 1.35, 1.15, flesh); r.cone(a.el, a.hand, 1.15, 1.0, flesh);
    r.sph(a.hand, 1.4, bony);
    const hd2 = V.norm(V.sub(a.hand, a.el));
    for (const k of [-1, 0, 1]) r.cone(a.hand, V.add(V.mad(a.hand, hd2, 2.2), V.add(V.mul(sideR, k * 0.8), V.mul(up, -0.6))), 0.6, 0.35, bony);   // bony fingers, curled
    if (s < 0) r.cone(s0, V.lerp(s0, a.el, 0.55), 1.9, 1.7, rag);   // a torn sleeve stub on the left
    else r.sph(s0, 1.9, rag);
  }
  // neck and the big bald head, thrust forward
  const hd = V.add(V.mad(J.head, up, 0.6), V.add(V.mul(fwd, 1.4), V.mul(sideR, 0.8)));
  r.cone(V.mad(J.chest, up, 3), hd, 1.7, 1.6, flesh);
  // a tall domed cranium with a heavy brow, small ears and gaunt cheekbones
  r.group(() => {
    // the cranium sits high and swells to the back; the face below it is narrower
    const cr = V.add(V.mad(hd, up, 0.8), V.mul(fwd, -0.5));
    r.ell(cr, [4.6, 4.1, 4.5], flesh, frameAlong(fwd, up), { mf: p => {
      const q = V.sub(p, hd), f2 = V.dot(q, fwd), s2 = V.dot(q, sideR), z2 = V.dot(q, up);
      if (f2 > 1.0 && (Math.abs(s2) - 1.8) ** 2 + (z2 - 0.1) ** 2 < 2.3) return M.DARK;   // big sunken sockets (B3: skull-like)
      return 0;
    } });
    r.ell(V.add(V.mad(hd, fwd, 1.4), V.mul(up, -1.4)), [3.0, 3.1, 2.8], flesh, frameAlong(fwd, up), { mf: p => {
      const q = V.sub(p, hd), f2 = V.dot(q, fwd), s2 = V.dot(q, sideR), z2 = V.dot(q, up);
      if (f2 > 1.0 && (Math.abs(s2) - 1.8) ** 2 + (z2 - 0.1) ** 2 < 2.3) return M.DARK;   // big sunken sockets (B3: skull-like)
      if (f2 > 3 && Math.abs(s2) < 0.5 && z2 < -0.8 && z2 > -1.8) return M.DARK;            // nose hole
      if (f2 > 2.2 && Math.abs(s2) > 1.6 && z2 < -1.6) return M.HORN;                       // hollow cheeks under the cheekbones
      return 0;
    } });
    for (const s of [-1, 1]) r.ell(V.add(V.add(V.mad(hd, fwd, 3.0), V.mul(sideR, s * 2.5)), V.mul(up, -1.0)), [1.1, 1.0, 0.9], flesh, frameAlong(fwd, up));   // cheekbones
    r.ell(V.add(V.mad(hd, fwd, 2.6), V.mul(up, 1.8)), [1.4, 3.6, 1.0], flesh, frameAlong(fwd, up));   // brow ridge
    for (const s of [-1, 1]) r.ell(V.add(V.mad(hd, sideR, s * 4.2), V.mul(up, -0.4)), [1.2, 0.7, 1.5], flesh, frameAlong(fwd, up));   // ears
  });
  for (const s of [-1, 1]) {   // B3: big dark round sockets set into the skull face, a small red glint deep inside each
    r.ell(V.add(V.add(V.mad(hd, fwd, 3.1), V.mul(sideR, s * 1.8)), V.mul(up, 0.1)), [0.9, 1.35, 1.25], M.DARK, frameAlong(fwd, up), { noShadow: true });
    r.sph(V.add(V.add(V.mad(hd, fwd, 3.7), V.mul(sideR, s * 1.8)), V.mul(up, 0.0)), 0.6, M.EYE_RED, { noShadow: true });
  }
  const jc = V.add(V.mad(hd, fwd, 2.2), V.mul(up, -3.6));   // the hanging jaw, mouth gaping dark
  r.ell(V.add(jc, V.mul(up, 1.1)), [1.8, 2.2, 1.0], M.DARK, frameAlong(fwd, up), { noShadow: true });
  r.ell(jc, [2.3, 2.0, 1.3], flesh, frameAlong(fwd, up), { mf: p => V.dot(V.sub(p, jc), fwd) > 1.6 && V.dot(V.sub(p, jc), up) > 0.4 && (Math.round(V.dot(V.sub(p, jc), sideR) * 1.4) & 1) ? M.CLOTH_WHITE : 0 });
  if (clip === 'death') deathTip(r, B, f, 1);
  if (look.scale && look.scale !== 1) scaleRig(r, look.scale);
  return r;
}

// ---------------------------------------------------------------- family table
// size: sprite canvas; swing: attack timing; looks: variants (materials, size, gear) of one body
const FAMILIES = {
  hero: { size: [72, 72, 36, 60], rig: heroRig, swing: e => weaponSwing(e.look), combo: (e, k) => weaponSwing(e.look, k) },
  skeleton: { size: [72, 78, 36, 55], gait: gaitFrameTiles(SKEL_B, 1.1), rig: skeletonRig, swing: e => e.look.weapon === 'bow' || e.look.weapon === 'crossbow' ? SWINGS.bow : e.look.lich ? SWINGS.cast : FEEL_OLD ? SWINGS.light : MON_SWINGS.chop },
  fallen: { size: [52, 48, 26, 40], gait: gaitFrameTiles(FALLEN_B), rig: fallenRig, swing: e => e.look.staff ? SWINGS.cast : e.look.sling ? SWINGS.bow : FEEL_OLD ? SWINGS.claw : MON_SWINGS.pounce },
  hound: { size: [80, 64, 38, 50], rig: houndRig, swing: () => FEEL_OLD ? SWINGS.bite : MON_SWINGS.lunge },
  spider: { size: [80, 60, 40, 46], rig: spiderRig, swing: e => e.look.spit ? SWINGS.bow : FEEL_OLD ? SWINGS.bite : MON_SWINGS.rear },
  chicken: { size: [28, 28, 14, 22], rig: chickenRig, swing: () => SWINGS.bite },
  sheep: { size: [36, 32, 18, 22], rig: sheepRig, swing: () => SWINGS.bite },
  pig: { size: [36, 30, 18, 20], rig: pigRig, swing: () => SWINGS.bite },
  slime: { size: [48, 44, 24, 32], gait: 0.13, rig: slimeRig, swing: () => SWINGS.bite },
  shroom: { size: [44, 48, 22, 36], gait: gaitFrameTiles(SHROOM_B), rig: shroomRig, swing: () => SWINGS.claw },
  wraith: { size: [56, 60, 28, 46], gait: 0.2, rig: wraithRig, swing: () => SWINGS.claw },
  treant: { size: [150, 160, 75, 132], gait: gaitFrameTiles(TREANT_B, 1.4), rig: treantRig, swing: () => SWINGS.heavy },
  ogre: { size: [140, 140, 70, 112], gait: gaitFrameTiles(OGRE_B, 1.5), rig: ogreRig, swing: e => e.look.rock ? SWINGS.bow : e.look.gorr || e.look.azh ? SWINGS.slam : SWINGS.heavy },
  // art B2: new families (cave bat, bog toad, restless dead)
  bat: { size: [84, 72, 42, 56], gait: 0.22, rig: batRig, swing: () => FEEL_OLD ? SWINGS.bite : MON_SWINGS.lunge },
  toad: { size: [84, 64, 42, 46], gait: 0.2, rig: toadRig, swing: () => FEEL_OLD ? SWINGS.bite : TOAD_LASH },
  zombie: { size: [72, 78, 36, 55], gait: gaitFrameTiles(ZOMBIE_B), rig: zombieRig, swing: () => FEEL_OLD ? SWINGS.claw : ZOMBIE_GRAB },
};
// Variants: same family, different look and stats. `kind` is what the roster ledger counts.
const MONSTERS = {
  skeleton: { family: 'skeleton', name: 'SKELETON', look: { weapon: 'sword', shield: true, armored: true }, hp: 14, dmg: [2, 5], speed: 26, reach: 1.25, xp: 12, chest: 22, shadow: 7 },
  // art A2 (field variants from the user's front/back concepts): minLevel 99 keeps them out of the spawn
  // pools until the main chat sets their levels, stats and loot; stats here are placeholders
  spearman: { family: 'skeleton', name: 'CRYPT SPEARMAN', minLevel: 99, look: { weapon: 'spear', chunky: true, pauldron: 'one', rag: M.CLOTH_BLUE }, hp: 14, dmg: [3, 5], speed: 26, reach: 1.6, xp: 13, chest: 22, shadow: 7 },
  axeman: { family: 'skeleton', name: 'BONE AXEMAN', minLevel: 99, look: { weapon: 'axe', chunky: true, helm: 'open', rag: M.CLOTH_RED }, hp: 18, dmg: [4, 8], speed: 24, reach: 1.4, xp: 17, chest: 22, shadow: 7 },
  gravebow: { family: 'skeleton', name: 'GRAVE CROSSBOWMAN', minLevel: 99, look: { weapon: 'crossbow', chunky: true, pauldron: 'leather', quiver: true }, hp: 11, dmg: [3, 5], speed: 24, reach: 6.5, ranged: 'arrow', xp: 15, chest: 22, shadow: 7 },
  bulwark: { family: 'skeleton', name: 'CRYPT BULWARK', minLevel: 99, elite: true, look: { weapon: 'mace', chunky: true, helm: 'bulwark', bulwark: true, rag: M.CLOTH_NAVY, scale: 1.27, size: [86, 94, 43, 67] }, hp: 34, dmg: [5, 8], speed: 22, reach: 1.35, xp: 34, chest: 24, shadow: 9 },   // art B4: elite from the user's crypt_bulwark concept; placeholder stats a bit above the tomb guard
  tombguard: { family: 'skeleton', name: 'TOMB GUARD', minLevel: 99, look: { weapon: 'mace', chunky: true, helm: 'kettle', pauldron: 'both', breastplate: true, towerShield: true, rag: M.CLOTH_RED }, hp: 26, dmg: [4, 7], speed: 22, reach: 1.3, xp: 24, chest: 22, shadow: 8 },
  archer: { family: 'skeleton', name: 'SKELETON ARCHER', look: { weapon: 'bow', bone: M.OLDBONE }, hp: 10, dmg: [2, 4], speed: 24, reach: 6.5, ranged: 'arrow', xp: 14, chest: 22, shadow: 7 },
  burning: { family: 'skeleton', name: 'BURNING DEAD', look: { weapon: 'sword', shield: false, helm: true, burn: true, bone: M.OLDBONE, eye: M.FIREM }, hp: 24, dmg: [4, 8], speed: 30, reach: 1.25, xp: 30, chest: 22, shadow: 7, minLevel: 2 },
  // art A3 (imps from the user's front/back concepts): minLevel 99 keeps them out of the spawn pools until
  // the main chat sets levels and stats (placeholders here). The slinger shoots 'arrow' until a stone exists.
  knifer: { family: 'fallen', name: 'FALLEN KNIFER', minLevel: 99, look: { knife: true }, hp: 6, dmg: [1, 4], speed: 44, reach: 1.1, xp: 6, chest: 12, shadow: 5, pack: true },
  slinger: { family: 'fallen', name: 'FALLEN SLINGER', minLevel: 99, look: { sling: true }, hp: 6, dmg: [1, 3], speed: 36, reach: 6, ranged: 'arrow', xp: 8, chest: 12, shadow: 5, pack: true },
  fallen: { family: 'fallen', name: 'FALLEN ONE', look: {}, hp: 7, dmg: [1, 3], speed: 40, reach: 1.15, xp: 6, chest: 12, shadow: 5, pack: true },
  shaman: { family: 'fallen', name: 'FALLEN SHAMAN', look: { staff: true, hood: true, ember: true }, hp: 9, dmg: [3, 6], speed: 28, reach: 6, ranged: 'firebolt', leader: true, xp: 16, chest: 12, shadow: 5 },
  // art B4: elite shaman from the user's "ASHHEX SHAMAN" concept (minLevel 99: placeholder stats a bit above the shaman)
  // art B5: secret boss from the user's concept (art/concepts/monsters/brother_cinder.png); minLevel 99, placeholder stats a bit above the Skeleton King
  cinder: { family: 'fallen', name: 'BROTHER CINDER', title: 'BURIED SHRINE', minLevel: 99, look: { staff: true, hood: true, ember: true, cinder: true, scale: 1.6, size: [100, 104, 50, 84] }, hp: 180, dmg: [9, 16], speed: 26, reach: 6.5, ranged: 'firebolt', xp: 220, chest: 30, shadow: 9, unique: true },
  ashhex: { family: 'fallen', name: 'ASHHEX SHAMAN', minLevel: 99, look: { staff: true, hood: true, ember: true, ashhex: true, scale: 1.15, size: [62, 58, 31, 48] }, hp: 16, dmg: [4, 8], speed: 28, reach: 6, ranged: 'firebolt', leader: true, xp: 30, chest: 16, shadow: 6, elite: true },
  hound: { family: 'hound', name: 'BONE HOUND', look: { plates: true, lean: true, slabs: true, brush: true, paws: true, b2: 'hound' }, hp: 16, dmg: [3, 6], speed: 52, reach: 1.35, xp: 18, chest: 12, shadow: 10 },
  lich: { family: 'skeleton', name: 'THE LICH', title: 'WHO DIED AND WOULD NOT STAY DEAD', look: { lich: true, eye: M.EYE_GRN, bone: M.OLDBONE, scale: 1.6, size: [124, 140, 62, 112] }, hp: 260, dmg: [8, 14], speed: 22, reach: 7, ranged: 'frostbolt', xp: 400, chest: 46, shadow: 11, unique: true, boss: 'lich', minLevel: 99 },
  // art B5: secret boss from the user's concept (art/concepts/monsters/drowned_warden.png); minLevel 99, placeholder stats a bit above the king
  warden: { family: 'skeleton', name: 'THE DROWNED WARDEN', title: 'KEEPER OF THE FLOODED CRYPT', look: { warden: true, eye: M.EYE_YEL, scale: 1.65, size: [150, 140, 75, 110] }, hp: 190, dmg: [10, 18], speed: 22, reach: 2.2, xp: 230, chest: 46, shadow: 13, unique: true, boss: 'slam', minions: ['skeleton', 'spearman'], calls: 'THE WARDEN CALLS UP THE DROWNED', minLevel: 99 },
  skelking: { family: 'skeleton', name: 'SKELETON KING', title: 'LORD OF THE RESTLESS DEAD', look: { weapon: 'sword', shield: false, armored: true, crown: true, eye: M.EYE_RED, scale: 1.6, size: [124, 132, 62, 104] }, hp: 170, dmg: [9, 16], speed: 24, reach: 1.9, xp: 200, chest: 42, shadow: 11, unique: true, boss: 'king', minLevel: 99 },
  treant: { family: 'treant', name: 'TREANT ELDER', title: 'THE WOOD THAT WALKS', minLevel: 99, look: { scale: 1.4 }, hp: 170, dmg: [8, 14], speed: 18, reach: 2.3, xp: 190, chest: 54, shadow: 14, unique: true, boss: 'slam', minions: ['shroom', 'sporecap'], calls: 'THE ELDER WAKES THE MUSHROOMS' },
  // art A3: ogre grunts from the user's front/back concepts (minLevel 99: out of the spawn pools until the
  // main chat sets levels and stats; these are placeholders). The rockthrower shoots 'arrow' until a rock exists.
  oclubber: { family: 'ogre', name: 'OGRE CLUBBER', minLevel: 99, look: { grunt: true, scale: 1.05 }, hp: 40, dmg: [6, 11], speed: 24, reach: 1.7, xp: 45, chest: 32, shadow: 10, where: 'out' },
  orockthrower: { family: 'ogre', name: 'OGRE ROCKTHROWER', minLevel: 99, look: { grunt: true, rock: true, vest: true, scale: 1.05 }, hp: 34, dmg: [5, 10], speed: 22, reach: 6, ranged: 'arrow', xp: 45, chest: 32, shadow: 10, where: 'out' },
  oshield: { family: 'ogre', name: 'OGRE SHIELDBEARER', minLevel: 99, look: { grunt: true, vest: true, helm: true, plank: true, scale: 1.05 }, hp: 60, dmg: [5, 9], speed: 20, reach: 1.7, xp: 55, chest: 32, shadow: 10, where: 'out' },
  oenforcer: { family: 'ogre', name: 'OGRE ENFORCER', minLevel: 99, look: { grunt: true, pads: true, cleaver: true, scale: 1.05 }, hp: 50, dmg: [8, 13], speed: 24, reach: 1.7, xp: 60, chest: 32, shadow: 10, where: 'out' },
  // art B4: from the user's concepts (art/concepts/monsters/gorr.png, ironjaw_enforcer.png); minLevel 99, placeholder stats
  // art B6: infernal boss from the user's Hellbound sheet (art/concepts/monsters/malgrath.png); minLevel 99, placeholder stats near Gorr
  azhruk: { family: 'ogre', name: 'AZHRUK', title: 'THE FURNACE GUARD', minLevel: 99, look: { azh: true, scale: 1.5, size: [150, 156, 75, 112] }, hp: 220, dmg: [11, 18], speed: 18, reach: 2.4, xp: 230, chest: 50, shadow: 14, unique: true },
  malgrath: { family: 'ogre', name: 'MALGRATH', title: 'THE IRON BUTCHER', minLevel: 99, look: { malg: true, scale: 1.5, size: [140, 154, 70, 112] }, hp: 170, dmg: [10, 17], speed: 22, reach: 2.2, xp: 200, chest: 48, shadow: 13, unique: true },
  gorr: { family: 'ogre', name: 'GORR', title: 'THE MINEBREAKER', minLevel: 99, look: { gorr: true, scale: 1.5 }, hp: 150, dmg: [9, 15], speed: 20, reach: 2.3, xp: 170, chest: 46, shadow: 13, unique: true, boss: 'slam' },
  ironjaw: { family: 'ogre', name: 'IRONJAW ENFORCER', minLevel: 99, look: { grunt: true, ironjaw: true, scale: 1.2 }, hp: 64, dmg: [9, 14], speed: 24, reach: 1.8, xp: 75, chest: 34, shadow: 11, where: 'out', elite: true },
  warlord: { family: 'ogre', name: 'OGRE WARLORD', title: 'TYRANT OF THE DEEP WOODS', minLevel: 99, look: { scale: 1.5 }, hp: 140, dmg: [8, 14], speed: 22, reach: 2.1, xp: 160, chest: 46, shadow: 13, unique: true, boss: 'slam' },
  shroom: { family: 'shroom', name: 'SHROOMLING', look: {}, hp: 10, dmg: [2, 4], speed: 26, reach: 1.1, xp: 9, chest: 14, shadow: 5, pack: true, where: 'out' },
  sporecap: { family: 'shroom', name: 'SPORECAP', look: { purple: true }, hp: 16, dmg: [3, 6], speed: 24, reach: 1.15, xp: 16, chest: 14, shadow: 5, where: 'out', minLevel: 2 },
  wraith: { family: 'wraith', name: 'WRAITH', look: {}, hp: 18, dmg: [4, 8], speed: 34, reach: 1.3, xp: 26, chest: 26, shadow: 6, minLevel: 2 },
  slime: { family: 'slime', name: 'SLIME', look: {}, hp: 8, dmg: [1, 3], speed: 30, reach: 1.15, xp: 6, chest: 9, shadow: 7, pack: true, where: 'out' },
  blueslime: { family: 'slime', name: 'BIG BLUE SLIME', look: { blue: true, big: true }, hp: 30, dmg: [3, 7], speed: 24, reach: 1.4, xp: 30, chest: 14, shadow: 10, where: 'out', minLevel: 2 },
  bear: { family: 'hound', name: 'DIRE BEAR', look: { skin: M.BOAR, eye: M.EYE_RED, wolf: true, bear: true, b2: 'bear', scale: 1.55, size: [110, 90, 55, 66] }, hp: 46, dmg: [6, 11], speed: 40, reach: 1.7, charge: true, xp: 50, chest: 20, shadow: 15, where: 'out', minLevel: 4 },
  boar: { family: 'hound', name: 'BOAR', look: { skin: M.BOAR, eye: M.EYE_RED, wolf: true, boar: true, b2: 'boar' }, hp: 20, dmg: [3, 6], speed: 48, reach: 1.35, charge: true, xp: 18, chest: 12, shadow: 10, where: 'out' },
  treasure: { family: 'fallen', name: 'TREASURE GOBLIN', look: { skin: M.GOBLIN, goblin: true, sack: true, unarmed: true, scale: 1.1 }, hp: 34, dmg: [0, 0], speed: 46, reach: 1, xp: 45, chest: 16, shadow: 6, flee: true, treasure: true, minLevel: 99 },
  gchief: { family: 'fallen', name: 'GOBLIN CHIEFTAIN', look: { skin: M.GOBLIN, goblin: true, chief: true, scale: 1.45, size: [76, 70, 38, 58] }, hp: 60, dmg: [5, 10], speed: 32, reach: 1.5, leader: true, xp: 70, chest: 22, shadow: 7, where: 'out', elite: true },
  gshaman: { family: 'fallen', name: 'GOBLIN SHAMAN', look: { skin: M.GOBLIN, goblin: true, staff: true }, hp: 9, dmg: [3, 6], speed: 30, reach: 6, ranged: 'firebolt', leader: true, xp: 16, chest: 12, shadow: 5, where: 'out' },
  brigand: { family: 'hero', name: 'BRIGAND', look: { team: 'tan', helm: 'bhood', chest: 'chain', weapon: 'axe', shield: 'none', hair: 'brown', cape: 'red', bandit: 'brigand' }, hp: 22, dmg: [3, 7], speed: 30, reach: 1.35, xp: 24, chest: 18, shadow: 7, where: 'out' },
  // art B2: the bandit crossbowman (concept art/progress/concepts/bandit_crossbowman.png); minLevel 99 keeps him out of the
  // spawn pools until the main chat sets his level, stats and loot (placeholders near the brigand and the grave crossbowman)
  xbowman: { family: 'hero', name: 'BANDIT CROSSBOWMAN', minLevel: 99, look: { team: 'tan', helm: 'bxcap', chest: 'bxjerkin', weapon: 'bow_bandit', shield: 'none', hair: 'brown', bandit: 'xbow' }, hp: 16, dmg: [3, 6], speed: 28, reach: 6.5, ranged: 'arrow', xp: 22, chest: 18, shadow: 7, where: 'out' },
  wolf: { family: 'hound', name: 'WOLF', look: { skin: M.HIDE, eye: M.EYE_YEL, wolf: true, pale: true, lean: true, bib: true, paws: true, brush: true, b2: 'wolf' }, hp: 14, dmg: [2, 5], speed: 54, reach: 1.35, xp: 15, chest: 12, shadow: 10, pack: true, where: 'out' },
  // round 26: the diggers of the old mine: hunched, snouted, in a dented iron cap, swinging a pick, a lamp at the belt
  digger: { family: 'fallen', name: 'DIGGER', look: { skin: M.LEATHER, digger: true }, hp: 10, dmg: [2, 4], speed: 36, reach: 1.25, xp: 9, chest: 12, shadow: 5, pack: true, where: 'out' },
  // round 26 side-area leaders
  alpha: { family: 'hound', name: 'THE ALPHA', look: { skin: M.HIDE, eye: M.EYE_YEL, wolf: true, lean: true, brush: true, paws: true, gf: true, b2: 'alpha', scale: 1.45, size: [100, 84, 50, 62] }, hp: 70, dmg: [5, 9], speed: 50, reach: 1.6, xp: 80, chest: 14, shadow: 12, elite: true, leader: true, where: 'out' },
  banditchief: { family: 'hero', name: 'BANDIT CHIEF', look: { team: 'red', helm: 'rookcap', chest: 'tunic', weapon: 'rcleaver', shield: 'round', hair: 'brown', bandit: 'rook' }, hp: 80, dmg: [5, 10], speed: 30, reach: 1.4, xp: 90, chest: 24, shadow: 8, elite: true, leader: true, where: 'out' },
  goblin: { family: 'fallen', name: 'GOBLIN', look: { skin: M.GOBLIN, goblin: true }, hp: 9, dmg: [2, 4], speed: 38, reach: 1.15, xp: 8, chest: 12, shadow: 5, pack: true, where: 'out' },
  gravespine: { family: 'hound', name: 'GRAVESPINE HOUND', minLevel: 99, elite: true, look: { skin: M.HIDE, eye: M.EYE_RED, wolf: true, lean: true, paws: true, brush: true, b2: 'gs', scale: 1.15 }, hp: 24, dmg: [4, 8], speed: 52, reach: 1.4, xp: 28, chest: 13, shadow: 11 },
  ghoulhound: { family: 'hound', name: 'HELL HOUND', look: { skin: M.FLESH, eye: M.FIREM, scale: 1.15, ember: true, lean: true, paws: true, brush: true, b2: 'ember' }, hp: 28, dmg: [5, 9], speed: 50, reach: 1.45, xp: 34, chest: 13, shadow: 11, minLevel: 2 },
  spider: { family: 'spider', name: 'CAVE SPIDER', look: { scale: 0.8 }, hp: 10, dmg: [2, 4], speed: 46, reach: 1.3, xp: 10, chest: 8, shadow: 11, pack: true },
  broodmother: { family: 'spider', name: 'BROODMOTHER', title: 'MOTHER OF A THOUSAND LEGS', look: { brood: true, scale: 1.15, size: [128, 84, 64, 60] }, hp: 60, dmg: [6, 12], speed: 34, reach: 1.9, xp: 90, chest: 12, shadow: 17, minLevel: 3, unique: true },
  // art B2: new monsters from the user's concepts. minLevel 99 keeps them out of the spawn pools until the
  // main chat sets their levels, stats and loot; stats here are placeholders near a similar monster
  cavebat: { family: 'bat', name: 'CAVE BAT', minLevel: 99, look: {}, hp: 8, dmg: [1, 4], speed: 50, reach: 1.2, xp: 9, chest: 8, shadow: 6, pack: true },
  bogtoad: { family: 'toad', name: 'BOG TOAD', minLevel: 99, look: {}, hp: 22, dmg: [3, 6], speed: 26, reach: 1.5, xp: 20, chest: 14, shadow: 10 },
  restless: { family: 'zombie', name: 'RESTLESS DEAD', minLevel: 99, look: {}, hp: 20, dmg: [3, 6], speed: 18, reach: 1.3, xp: 16, chest: 20, shadow: 7 },
  // art B2: new spiders from the user's concepts; minLevel 99 keeps them out of the spawn pools, stats are placeholders
  spitter: { family: 'spider', name: 'VENOM SPITTER', minLevel: 99, look: { spit: true, scale: 0.85 }, hp: 9, dmg: [2, 5], speed: 40, reach: 6, ranged: 'arrow', xp: 13, chest: 8, shadow: 11 },
  stoneback: { family: 'spider', name: 'STONEBACK SPIDER', minLevel: 99, look: { stone: true, size: [96, 70, 48, 52] }, hp: 26, dmg: [4, 8], speed: 30, reach: 1.5, xp: 24, chest: 8, shadow: 13 },
  // art B5: secret boss from the user's concept (art/concepts/monsters/flintback_matriarch.png); minLevel 99, placeholder stats a bit above the broodmother
  flintback: { family: 'spider', name: 'FLINTBACK MATRIARCH', title: 'SEALED MINE POCKET', minLevel: 99, look: { flint: true, scale: 1.45, size: [104, 80, 52, 56] }, hp: 75, dmg: [7, 13], speed: 30, reach: 2, xp: 110, chest: 14, shadow: 19, unique: true },
  broodguard: { family: 'spider', name: 'BROOD GUARD', minLevel: 99, look: { guard: true, size: [100, 92, 50, 72] }, hp: 20, dmg: [4, 7], speed: 44, reach: 1.7, xp: 20, chest: 8, shadow: 13 },
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
const fallbackOrder = { walk: ['walk', 'idle'], idle: ['idle'], attack: ['attack', 'idle'], attack2: ['attack2', 'attack', 'idle'], attack3: ['attack3', 'attack', 'idle'], attack4: ['attack4', 'attack', 'idle'], bash: ['bash', 'idle'], channel: ['channel', 'idle'], shoot: ['shoot', 'idle'], cast: ['cast', 'idle'], hit: ['hit', 'idle'], death: ['death'], go: ['go', 'walk', 'idle'], stop: ['stop', 'idle'], hook: ['hook', 'channel', 'idle'], spin: ['spin', 'attack', 'idle'], drink: ['drink', 'walk', 'idle'], fidget: ['fidget', 'idle'], pivot: ['pivot', 'stop', 'walk'], skid: ['skid', 'stop', 'idle'], vault: ['vault', 'stop', 'idle'], toss: ['toss', 'shoot', 'idle'], volley: ['volley', 'shoot', 'idle'], skyshot: ['skyshot', 'shoot', 'idle'], storm: ['storm', 'channel', 'idle'], arrive: ['arrive', 'stop', 'idle'] };
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
