'use strict';
// Enemy families: skeleton (biped, bones), fallen (small hunched biped), hound (quadruped),
// spider (eight legs). Each takes a `look` (the variant) and a pose state {clip, f, key, prev}.

// ---------------------------------------------------------------- skeleton
const SKEL_B = { hipH: 16, thigh: 8, shin: 7.5, ankle: 1.2, spine: 8, shW: 6, shZ: 3, neck: 10.5, upper: 6, fore: 5.5, hipW: 2.6, stride: 5.5, lift: 2.5 };
function skullAt(r, hd, fwd, sideR, up, bone, eye, jawOpen = 0) {
  r.sph(hd, 4.1, bone, { mf: p => {
    const q = V.sub(p, hd), f2 = V.dot(q, fwd), s2 = V.dot(q, sideR), z2 = V.dot(q, up);
    if (f2 > 2 && Math.abs(Math.abs(s2) - 1.6) < 1.0 && Math.abs(z2 - 0.2) < 1.0) return M.DARK;   // sockets
    if (f2 > 3 && Math.abs(s2) < 0.5 && z2 < -0.9 && z2 > -2) return M.DARK;                      // nose
    return 0;
  } });
  for (const s of [-1, 1]) r.sph(V.add(V.add(V.mad(hd, fwd, 3.55), V.mul(sideR, s * 1.6)), V.mul(up, 0.1)), 0.65, eye, { noShadow: true });
  const jc = V.add(V.mad(hd, fwd, 1.6), V.mul(up, -3.3 - jawOpen));
  r.ell(jc, [2.7, 2.6, 1.1], bone, frameAlong(fwd, up), { mf: p => V.dot(V.sub(p, jc), fwd) > 1.8 && Math.abs(V.dot(V.sub(p, jc), up) - 0.6) < 0.35 ? M.DARK : 0 });
}
function skeletonRig(look, st) {
  const B = SKEL_B, J = bipedJoints(B, st), r = new Rig(), { fwd, sideR, up } = J;
  const bone = look.bone || M.BONE, eye = look.eye || M.EYE_RED;
  for (const [hip, knee, ank] of [[J.hipL, J.kneeL, J.ankL], [J.hipR, J.kneeR, J.ankR]]) {
    r.cone(hip, knee, 1.3, 1.0, bone); r.cone(knee, ank, 1.1, 0.9, bone);
    r.sph(knee, 1.4, bone); r.ell(V.add(ank, [1.4, 0, -0.6]), [2.4, 1.2, 0.8], bone);
  }
  r.ell(J.pelvis, [2.6, 4.0, 2.0], bone);
  r.cone(J.pelvis, J.chest, 1.0, 1.1, bone);
  const rc = V.mad(J.chest, up, 0.6);
  r.ell(rc, [3.8, 5.0, 4.6], bone, frameAlong(fwd, up), { mf: p => {   // ribs: dark gaps between bands
    const q = V.sub(p, rc), z = V.dot(q, up), sd = Math.abs(V.dot(q, sideR));
    if (sd < 0.9 && V.dot(q, fwd) > 0) return 0;
    return ((z + 20) / 2.1) % 1 < 0.38 && z < 3.2 ? M.DARK : 0;
  } });
  for (const sh of [J.shL, J.shR]) r.sph(sh, 1.7, bone);
  // arms + gear
  const sw = st.key || null;
  let handR, handL, bd = V.norm([1, 0, 0.6]);
  if (look.weapon === 'bow') {
    const draw = st.clip === 'shoot' ? sw.a : 0;
    handL = V.add(V.add(J.shL, V.mul(fwd, 9.5)), V.mul(up, -1));
    handR = V.add(V.add(J.shR, V.mul(fwd, 9.5 - draw * 7)), V.add(V.mul(up, -1), V.mul(sideR, -2.5)));
    if (st.clip !== 'shoot') { handL = V.add(V.add(J.shL, V.mul(fwd, 4)), V.mul(up, -8)); handR = V.add(V.add(J.shR, V.mul(fwd, 2)), V.mul(up, -9)); }
  } else if (st.clip === 'attack') {
    const F = fwd, U = V.norm(V.add(V.mul(up, 0.8), V.mul(sideR, 0.6))), piv = V.add(V.mad(J.chest, sideR, 2), V.mul(up, 4));
    bd = V.norm(V.add(V.mul(F, Math.cos(sw.a)), V.mul(U, Math.sin(sw.a))));
    handR = V.mad(piv, bd, 6);
    if (sw.smear && st.prev) smearArc(r, piv, F, U, st.prev.a, sw.a, 9, 18);
    handL = V.add(V.add(J.shL, V.mul(fwd, 5)), V.mul(up, -6));
  } else {
    handR = V.add(V.add(J.shR, V.mul(fwd, 4 + J.swingArm * 2)), V.add(V.mul(up, -8), V.mul(sideR, 1)));
    handL = V.add(V.add(J.shL, V.mul(fwd, 5 - J.swingArm * 2)), V.mul(up, -6));
    bd = V.norm(V.add(V.mul(fwd, 0.6), V.mul(up, 0.8)));
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
  } else {
    const g = aR.hand, wide = V.norm(V.cross(bd, V.len(V.cross(bd, up)) > 0.3 ? up : fwd)), wf = [bd, wide, V.cross(bd, wide)];
    r.cone(V.mad(g, bd, -1.6), V.mad(g, bd, 1), 0.7, 0.7, M.LEATHER);
    r.box(V.mad(g, bd, 1.3), [0.6, 2.4, 0.6], M.IRON, wf);
    r.box(V.mad(g, bd, 8.6), [7, 1.0, 0.35], M.IRON, wf);
    if (look.shield) {
      const n = V.norm(V.add(V.mul(fwd, 0.8), V.mul(sideR, -0.6))), c = V.mad(aL.hand, n, 1.3), ax = [n, V.norm(V.cross(up, n)), up];
      r.ell(c, [0.9, 4.3, 4.3], M.WOOD, ax, { mf: p => { const q = V.sub(p, c), d2 = (V.dot(q, ax[1]) ** 2 + V.dot(q, ax[2]) ** 2) / 18.5; return d2 > 0.72 || d2 < 0.06 ? M.IRON : 0; } });
    }
  }
  skullAt(r, J.head, fwd, sideR, up, bone, eye, st.clip === 'attack' && sw.hit ? 0.8 : 0);
  if (look.helm) r.ell(V.mad(J.head, up, 1.8), [4.5, 4.5, 3.2], M.IRON);
  if (st.clip === 'death') {   // collapses in a heap: tip forward and drop hard
    tipRig(r, [2, 0, 0], [0, 0.25, 0.7, 1.2, 1.45, 1.55][st.f], -0.4 * st.f / 5, [0, 1, 1.6, 2, 2.2, 2.3][st.f]);
  }
  return r;
}

// ---------------------------------------------------------------- fallen (imp)
const FALLEN_B = { hipH: 9.5, thigh: 5.2, shin: 5, ankle: 1, spine: 6.5, shW: 4.6, shZ: 2, neck: 7.8, upper: 4.6, fore: 4.4, hipW: 2.2, stride: 4.5, lift: 2.6, hunch: 0.35 };
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
  if (st.clip === 'attack') {   // a thrust: spear pulled back, then jabbed forward on the hit key
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
  if (look.staff) {
    r.cone(V.mad(g, bd, -7), V.mad(g, bd, 7), 0.65, 0.65, M.WOOD);
    r.sph(V.mad(g, bd, 8.2), 1.5, M.MAGIC, { noShadow: true });
  } else {
    r.cone(V.mad(g, bd, -6), V.mad(g, bd, 9), 0.6, 0.6, M.WOOD);
    r.cone(V.mad(g, bd, 9), V.mad(g, bd, 12.5), 1.1, 0.25, M.IRON);
  }
  // head: big, with horns, yellow eyes, a dark mouth
  const hd = J.head;
  r.ell(hd, [3.8, 3.6, 3.4], skin, frameAlong(fwd, up), { mf: p => { const q = V.sub(p, hd); return V.dot(q, fwd) > 2.4 && Math.abs(V.dot(q, up) + 1.5) < 0.5 && Math.abs(V.dot(q, sideR)) < 1.6 ? M.DARK : 0; } });
  for (const s of [-1, 1]) {
    r.sph(V.add(V.add(V.mad(hd, fwd, 3.2), V.mul(sideR, s * 1.4)), V.mul(up, 0.6)), 0.6, M.EYE_YEL, { noShadow: true });
    const a = V.add(V.mad(hd, up, 2.4), V.mul(sideR, s * 2.2)), b = V.add(V.add(V.mad(hd, up, 4.6), V.mul(sideR, s * 3.8)), V.mul(fwd, -2.5));
    r.cone(a, b, 1.0, 0.3, M.HORN);
  }
  if (look.hood) r.ell(V.add(V.mad(hd, up, 0.8), V.mul(fwd, -0.8)), [4.2, 4.2, 3.8], M.CLOTH_PURPLE, frameAlong(fwd, up));
  if (st.clip === 'death') deathTip(r, B, st.f, -1, -1);
  return r;
}

// ---------------------------------------------------------------- hound (quadruped)
function houndRig(look, st) {
  const r = new Rig(), skin = look.skin || M.FLESH, horn = M.HORN;
  const { clip, f } = st;
  let bob = 0, lunge = 0, headDrop = 0, jaw = 0.15, ph = 0, moving = false;
  if (clip === 'idle') bob = [0, -0.3, -0.5, -0.2][f % 4];
  if (clip === 'walk') { ph = f / 8 * Math.PI * 2; moving = true; bob = -0.8 * Math.abs(Math.sin(ph)); }
  if (clip === 'attack') { const a = st.key.a; lunge = (1 - a) * 3.5; headDrop = a > 0.5 ? -1 : 2; jaw = a > 0.5 ? 0.9 : st.key.hit ? 0.1 : 0.6; bob = a > 0.5 ? -1.2 : 0; }
  if (clip === 'hit') { lunge = -2; headDrop = -1.5; jaw = 0.6; }
  const H = 11;
  const back = [-7 + lunge, 0, H + bob], front = [6 + lunge, 0, H + 1.5 + bob];
  r.group(() => {
    r.ell(back, [5.8, 5.0, 4.4], skin);
    r.ell(V.lerp(back, front, 0.5), [6.5, 4.8, 4.2], skin);
    r.ell(front, [5.6, 5.6, 5.2], skin);
  });
  // dorsal spikes
  for (let i = 0; i < 4; i++) { const b = V.lerp(back, front, 0.15 + i * 0.25); const base = V.add(b, [0, 0, 3.8]); r.cone(base, V.add(base, [-2.2, 0, 3.2 - Math.abs(i - 1.5) * 0.5]), 1.0, 0.25, horn); }
  // tail
  const t0 = V.add(back, [-5, 0, 1.5]), t1 = V.add(t0, [-4, 0, 2 + Math.sin(ph) * 1.5]), t2 = V.add(t1, [-3, Math.cos(ph) * 1.2, -1]);
  r.group(() => { r.cone(t0, t1, 1.5, 1.0, skin); r.cone(t1, t2, 1.0, 0.5, skin); });
  // legs (trot: diagonal pairs move together); front legs bend forward at the wrist, hind legs back at the hock
  const legs = [[front, -3.6, 0, 1], [front, 3.6, Math.PI, 1], [back, -3.4, Math.PI, -1], [back, 3.4, 0, -1]];
  for (const [root, y, off, fr] of legs) {
    const hip = V.add(root, [fr > 0 ? 1 : 0, y, -1.5]);
    const p = ph + off, stride = moving ? 3.6 : 0;
    let foot = [hip[0] - stride * Math.cos(p) + (fr > 0 ? 0.5 : -0.5), y * 1.1, moving ? 2.2 * Math.max(0, Math.sin(p)) : 0];
    if (clip === 'attack' && fr > 0) foot = [hip[0] + 2, y * 1.1, 0];
    const L = ik(hip, V.add(foot, [0, 0, 1]), 5.8, 5.8, [-fr, 0, 0]);
    r.cone(hip, L.joint, 2.0, 1.5, skin); r.cone(L.joint, L.end, 1.5, 1.1, skin);
    r.ell(V.add(L.end, [1, 0, -0.5]), [1.8, 1.2, 0.8], skin, null, { bias: -1 });
  }
  // neck + head
  const neck = V.add(front, [3.5, 0, 2.5]);
  const hd = V.add(front, [7.5, 0, 3.2 + headDrop]);
  r.cone(neck, hd, 3.2, 2.6, skin);
  r.ell(hd, [3.6, 3.0, 2.8], skin);
  const snoutEnd = V.add(hd, [5, 0, -0.8]);
  r.cone(V.add(hd, [1.5, 0, -0.2]), snoutEnd, 2.0, 1.4, skin);
  // jaw hinged under the snout, teeth along its rim
  const jd = V.norm([Math.cos(jaw), 0, -Math.sin(jaw)]), j0 = V.add(hd, [0.8, 0, -1.8]);
  r.cone(j0, V.mad(j0, jd, 5.5), 1.5, 0.9, skin, { bias: -1 });
  if (jaw > 0.4) { r.cone(V.add(snoutEnd, [-0.4, 0, -1.3]), V.add(snoutEnd, [-0.4, 0, -2.5]), 0.45, 0.2, M.BONE); r.box(V.lerp(j0, V.mad(j0, jd, 5.5), 0.55), [1.6, 1.0, 0.5], M.DARK, frameAlong(jd)); }
  for (const s of [-1, 1]) {
    r.sph(V.add(hd, [2.2, s * 1.8, 1.0]), 0.6, look.eye || M.EYE_YEL, { noShadow: true });
    const a = V.add(hd, [-0.5, s * 1.8, 2.2]), b = V.add(hd, [-3, s * 3.2, 5.2]), c = V.add(hd, [-2, s * 2.6, 8]);
    r.group(() => { r.cone(a, b, 1.1, 0.8, horn); r.cone(b, c, 0.8, 0.3, horn); });
  }
  if (clip === 'death') tipRig(r, [0, 0, 0], 0, 1.45 * [0, 0.2, 0.55, 0.9, 1, 1][f], [0, 0.5, 1.5, 2.8, 3.4, 3.6][f]);
  if (look.scale && look.scale !== 1) scaleRig(r, look.scale);
  return r;
}

// ---------------------------------------------------------------- spider
function spiderRig(look, st) {
  const r = new Rig(), ch = look.chitin || M.CHITIN;
  const { clip, f } = st;
  let bob = 0, rear = 0, ph = 0, moving = false, curl = 0;
  if (clip === 'idle') bob = [0, -0.3, -0.4, -0.2][f % 4];
  if (clip === 'walk') { ph = f / 8 * Math.PI * 2; moving = true; bob = -0.4 * Math.abs(Math.sin(ph * 2)); }
  if (clip === 'attack') { const a = st.key.a; rear = a > 0.5 ? 1 : st.key.hit ? 0.2 : 0.5; }
  if (clip === 'hit') rear = -0.3;
  if (clip === 'death') curl = [0, 0.25, 0.55, 0.85, 1, 1][f];
  const H = 7 + rear * 2.5 - curl * 4.5;
  const ceph = [3.5, 0, H + bob + rear * 1.5], abd = [-6.5, 0, H + 2.2 + bob - rear * 1];
  r.ell(abd, [7.2, 6.2, 5.8], ch, null, { mf: p => {   // pale skull marking on top of the abdomen
    const q = V.sub(p, abd);
    if (q[2] < 3) return 0;
    const u = q[0] + 1, v = q[1];
    return (u * u / 9 + v * v / 5 < 1 && !(Math.abs(Math.abs(v) - 1.2) < 0.6 && Math.abs(u - 0.4) < 0.6)) ? M.MARK : 0;
  } });
  r.ell(ceph, [4.4, 4.2, 3.2], ch);
  // eyes: a cluster of red beads on the front
  for (const [y, z, s] of [[-1, 0.8, 0.6], [1, 0.8, 0.6], [-2, 1.4, 0.45], [2, 1.4, 0.45], [-0.6, 1.8, 0.4], [0.6, 1.8, 0.4]]) r.sph(V.add(ceph, [3.7, y, z]), s, M.EYE_RED, { noShadow: true });
  // fangs
  for (const s of [-1, 1]) r.cone(V.add(ceph, [3.6, s * 1.1, -1.2]), V.add(ceph, [4.6 + rear, s * 0.7, -4 + rear]), 0.8, 0.25, M.HORN);
  // legs: 4 per side, knees high; alternating tetrapod gait
  const ang = [0.55, 1.15, 1.85, 2.45];
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) {
    const a = ang[i], hip = V.add(ceph, [Math.cos(a) * 2.2 - 0.5, s * Math.sin(a) * 2.6, -0.4]);
    const grp = (i + (s > 0 ? 1 : 0)) % 2, p = ph + grp * Math.PI;
    const reach = 17.5 - Math.abs(i - 1.5) * 1.2;
    let foot = [ceph[0] + Math.cos(a) * reach - 1.5 - (moving ? 2.4 * Math.cos(p) : 0), s * Math.sin(a) * reach, moving ? 1.8 * Math.max(0, Math.sin(p)) : 0];
    if (rear > 0.4 && i === 0) foot = [ceph[0] + 9, s * 5, 9 * rear];
    if (curl) foot = V.lerp(foot, [ceph[0] - 1, s * 3, H + 5], curl * 0.85);
    const L = ik(hip, foot, 10, 11, [0, s * 0.3, 1]);
    r.cone(hip, L.joint, 1.6, 1.3, ch); r.cone(L.joint, L.end, 1.3, 0.6, ch);
    r.sph(L.joint, 1.4, M.MARK);
  }
  if (look.scale && look.scale !== 1) scaleRig(r, look.scale);
  return r;
}

// ---------------------------------------------------------------- family table
// size: sprite canvas; swing: attack timing; looks: variants (materials, size, gear) of one body
const FAMILIES = {
  hero: { size: [72, 72, 36, 60], rig: heroRig, swing: e => weaponSwing(e.look) },
  skeleton: { size: [60, 60, 30, 50], rig: skeletonRig, swing: e => e.look.weapon === 'bow' ? SWINGS.bow : SWINGS.light },
  fallen: { size: [52, 48, 26, 40], rig: fallenRig, swing: e => e.look.staff ? SWINGS.cast : SWINGS.claw },
  hound: { size: [72, 56, 36, 44], rig: houndRig, swing: () => SWINGS.bite },
  spider: { size: [80, 60, 40, 46], rig: spiderRig, swing: () => SWINGS.bite },
};
// Variants: same family, different look and stats. `kind` is what the roster ledger counts.
const MONSTERS = {
  skeleton: { family: 'skeleton', name: 'SKELETON', look: { weapon: 'sword', shield: true }, hp: 14, dmg: [2, 5], speed: 26, reach: 1.25, xp: 12, chest: 22, shadow: 7 },
  archer: { family: 'skeleton', name: 'SKELETON ARCHER', look: { weapon: 'bow', bone: M.OLDBONE }, hp: 10, dmg: [2, 4], speed: 24, reach: 6.5, ranged: 'arrow', xp: 14, chest: 22, shadow: 7 },
  burning: { family: 'skeleton', name: 'BURNING DEAD', look: { weapon: 'sword', shield: false, helm: true, bone: M.OLDBONE, eye: M.FIREM }, hp: 24, dmg: [4, 8], speed: 30, reach: 1.25, xp: 30, chest: 22, shadow: 7, minLevel: 2 },
  fallen: { family: 'fallen', name: 'FALLEN ONE', look: {}, hp: 7, dmg: [1, 3], speed: 40, reach: 1.15, xp: 6, chest: 12, shadow: 5, pack: true },
  shaman: { family: 'fallen', name: 'FALLEN SHAMAN', look: { staff: true, hood: true, skin: M.SKIN }, hp: 9, dmg: [3, 6], speed: 28, reach: 6, ranged: 'firebolt', xp: 16, chest: 12, shadow: 5 },
  hound: { family: 'hound', name: 'CRYPT HOUND', look: {}, hp: 16, dmg: [3, 6], speed: 52, reach: 1.35, xp: 18, chest: 12, shadow: 10 },
  ghoulhound: { family: 'hound', name: 'BONE HOUND', look: { skin: M.OLDBONE, eye: M.EYE_RED, scale: 1.15 }, hp: 28, dmg: [5, 9], speed: 50, reach: 1.45, xp: 34, chest: 13, shadow: 11, minLevel: 2 },
  spider: { family: 'spider', name: 'CAVE SPIDER', look: { scale: 0.8 }, hp: 10, dmg: [2, 4], speed: 46, reach: 1.3, xp: 10, chest: 8, shadow: 11, pack: true },
  broodmother: { family: 'spider', name: 'BROODMOTHER', look: { scale: 1.35, chitin: M.BLOODY }, hp: 60, dmg: [6, 12], speed: 34, reach: 1.9, xp: 90, chest: 12, shadow: 17, minLevel: 3, unique: true },
};
const lookKey = l => JSON.stringify(l);

// Sprites are cached per family/look/direction/clip/frame; poses only change on the 100 ms pose clock.
const spriteCache = new Map();
let spriteBuilds = 0;
function poseState(fam, ent, clip, f) {
  const st = { clip, f };
  if (clip === 'attack' || clip === 'shoot' || clip === 'cast') { const sw = FAMILIES[fam].swing(ent); st.key = sw[f]; st.prev = sw[f - 1]; }
  return st;
}
function getSprite(fam, look, dir, clip, f, ent) {
  const k = `${fam}|${fam === 'hero' ? heroKey(look) : lookKey(look)}|${dir}|${clip}|${f}`;
  let sp = spriteCache.get(k);
  if (!sp) {
    const F = FAMILIES[fam], [w, h, ax, ay] = F.size;
    const ex = ent || { look };
    sp = renderRig(F.rig(look, poseState(fam, ex, clip, f)), yawOf(dir), w, h, ax, ay);
    if (spriteCache.size > 3000) spriteCache.clear();
    spriteCache.set(k, sp); spriteBuilds++;
  }
  return sp;
}
