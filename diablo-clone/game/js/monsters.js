'use strict';
// Enemy families: skeleton (biped, bones), fallen (small hunched biped), hound (quadruped),
// spider (eight legs). Each takes a `look` (the variant) and a pose state {clip, f, key, prev}.

// ---------------------------------------------------------------- skeleton
const SKEL_B = { hipH: 16, thigh: 8, shin: 7.5, ankle: 1.2, spine: 8, shW: 6, shZ: 3, neck: 10.5, upper: 6, fore: 5.5, hipW: 2.6, stride: 5.5, lift: 2.5, duty: 0.55, bob: 0.6, sway: 0.5, runLean: 0.1, counter: 0.14 };
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
  for (const [hip, knee, ank] of [[J.hipL, J.kneeL, J.ankL], [J.hipR, J.kneeR, J.ankR]]) {
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
  skullAt(r, look.armored ? V.mad(J.head, up, 0.6) : J.head, fwd, sideR, up, bone, eye, st.clip === 'attack' && sw.hit ? 0.8 : 0, look.armored ? 1.15 : 1);
  if (look.helm) r.ell(V.mad(J.head, up, 1.8), [4.5, 4.5, 3.2], M.IRON);
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
  // the bone hound (mock-up): grey hide, bone ribs and spine spikes over the back, a skull head
  // with big forward-curving horns, a red scarf with a studded collar, bone claws
  const r = new Rig(), skin = look.skin || M.HIDE, bone = look.bone || M.BONE;
  const { clip, f } = st;
  let bob = 0, lunge = 0, headDrop = 0, jaw = 0.25, ph = 0, moving = false;
  if (clip === 'idle') bob = [0, -0.3, -0.5, -0.2][f % 4];
  if (clip === 'walk') { ph = f / 8 * Math.PI * 2; moving = true; bob = -0.8 * Math.abs(Math.sin(ph)); }
  if (clip === 'attack') { const a = st.key.a; lunge = (1 - a) * 3.5; headDrop = a > 0.5 ? -1 : 1; jaw = a > 0.5 ? 0.9 : st.key.hit ? 0.1 : 0.6; bob = a > 0.5 ? -1.2 : 0; }
  if (clip === 'hit') { lunge = -2; headDrop = -1.5; jaw = 0.6; }
  const H = 11;
  const back = [-4.5 + lunge, 0, H + bob], front = [5 + lunge, 0, H + 2.5 + bob];   // compact, front-heavy
  r.group(() => {
    r.ell(back, [5.2, 5.0, 4.4], skin);
    r.ell(V.lerp(back, front, 0.5), [5.6, 5.2, 4.6], skin);
    r.ell(front, [5.8, 6.2, 5.8], skin);
  });
  // bone ribs over the barrel of the body and a spiked spine
  for (let i = 0; i < 4; i++) {
    const x = front[0] - 1.5 - i * 2.2, z = H + 1.8 + bob - i * 0.3;
    for (const s of [-1, 1]) r.group(() => {
      r.cone([x, 0, z + 4.4], [x - 0.6, s * 5.0, z + 0.8], 0.8, 0.75, bone);
      r.cone([x - 0.6, s * 5.0, z + 0.8], [x + 0.4, s * 4.4, z - 2.6], 0.75, 0.6, bone);
    });
  }
  r.cone(V.add(back, [-3, 0, 4.2]), V.add(front, [0, 0, 5]), 1.1, 1.2, bone);   // spine
  for (let i = 0; i < 5; i++) { const b = V.lerp(back, front, 0.05 + i * 0.22); const base = V.add(b, [0, 0, 4.6]); r.cone(base, V.add(base, [-2.4, 0, 3.6 - Math.abs(i - 2) * 0.6]), 1.1, 0.25, bone); }
  // tail: bony and spiked
  const t0 = V.add(back, [-5, 0, 1.5]), t1 = V.add(t0, [-4, 0, 2 + Math.sin(ph) * 1.5]), t2 = V.add(t1, [-3, Math.cos(ph) * 1.2, -1]);
  r.group(() => { r.cone(t0, t1, 1.4, 1.0, skin); r.cone(t1, t2, 1.0, 0.5, bone); });
  // legs (trot: diagonal pairs move together); bone caps at the joints and bone claws
  const legs = [[front, -3.6, 0, 1], [front, 3.6, Math.PI, 1], [back, -3.4, Math.PI, -1], [back, 3.4, 0, -1]];
  for (const [root, y, off, fr] of legs) {
    const hip = V.add(root, [fr > 0 ? 1 : 0, y, -1.5]);
    const p = ph + off, stride = moving ? 3.6 : 0;
    let foot = [hip[0] - stride * Math.cos(p) + (fr > 0 ? 0.5 : -0.5), y * 1.15, moving ? 2.2 * Math.max(0, Math.sin(p)) : 0];
    if (clip === 'attack' && fr > 0) foot = [hip[0] + 2, y * 1.15, 0];
    const L = ik(hip, V.add(foot, [0, 0, 1]), 5.8, 5.8, [-fr, 0, 0]);
    r.cone(hip, L.joint, 2.7, 2.0, skin); r.cone(L.joint, L.end, 2.0, 1.7, skin);
    r.sph(L.joint, 1.8, bone);
    r.ell(V.add(L.end, [1.2, 0, -0.4]), [2.6, 2.0, 1.1], skin);
    for (const c of [-1, 0, 1]) r.cone(V.add(L.end, [3, c * 1.1, -0.5]), V.add(L.end, [4.8, c * 1.4, -1]), 0.55, 0.15, bone, { noShadow: true });
  }
  // neck, collar and scarf
  const neck = V.add(front, [3.5, 0, 2.5]);
  const hd = V.add(front, [7.5, 0, 1.2 + headDrop]);
  const hr0 = r.p.length;   // head parts are scaled up about the head center below
  r.cone(neck, hd, 3.4, 2.8, skin);
  const cc = V.lerp(neck, hd, 0.35);
  r.ell(cc, [1.6, 4.4, 4.0], M.LEATHER, frameAlong(V.sub(hd, neck)));
  for (const a of [-0.9, 0, 0.9]) r.sph(V.add(cc, [0.9, Math.sin(a) * 4.3, -Math.cos(a) * 3.6]), 0.9, M.GOLD, { noShadow: true });
  r.group(() => {
    r.ell(V.add(front, [3.2, 0, 3.6]), [2.8, 5.0, 2.6], M.CLOTH_RED);
    for (const s of [-1, 1]) r.box(V.add(front, [2.6, s * 5.0, -0.4]), [1.4, 0.5, 2.6], M.CLOTH_RED, frameAlong([1, 0, 0], [0, -s * 0.25, 1]), { mf: p => p[2] < front[2] - 4 && hash(Math.round(p[0] * 1.5), 3, 1) < 0.5 ? M.MARK : 0 });
  });
  // skull head: bone cranium and snout, dark socket with a red eye, jaw with teeth
  r.ell(hd, [3.8, 3.3, 3.1], bone, null, { mf: p => { const q = V.sub(p, hd); return q[0] > 1.2 && (Math.abs(q[1]) - 1.8) ** 2 + (q[2] - 0.7) ** 2 < 1.4 ? M.DARK : 0; } });
  const snoutEnd = V.add(hd, [5.8, 0, -0.9]);
  r.cone(V.add(hd, [1.5, 0, -0.3]), snoutEnd, 2.3, 1.5, bone, { mf: p => p[0] > snoutEnd[0] - 1 && Math.abs(p[1]) < 0.7 && p[2] > snoutEnd[2] ? M.DARK : 0 });
  const jd = V.norm([Math.cos(jaw), 0, -Math.sin(jaw)]), j0 = V.add(hd, [0.8, 0, -2.2]);
  r.cone(j0, V.mad(j0, jd, 6), 1.6, 1.0, bone, { bias: -1 });
  r.box(V.lerp(j0, V.mad(j0, jd, 6), 0.55), [2.2, 1.1, 0.5], M.DARK, frameAlong(jd), { noShadow: true });
  for (let t = 0; t < 3; t++) for (const s of [-1, 1]) r.cone(V.add(hd, [2.4 + t * 1.3, s * 1.2, -2]), V.add(hd, [2.4 + t * 1.3, s * 1.1, -3]), 0.4, 0.15, M.BONE, { noShadow: true });
  for (const s of [-1, 1]) {
    r.sph(V.add(hd, [2.7, s * 1.9, 0.8]), 0.65, look.eye || M.EYE_RED, { noShadow: true });
    // horns sweep back, then up and forward like a bull's
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
function spiderRig(look, st) {
  const r = new Rig(), ch = look.chitin || M.CHITIN;
  const { clip, f } = st;
  let bob = 0, rear = 0, ph = 0, moving = false, curl = 0;
  if (clip === 'idle') bob = [0, -0.3, -0.4, -0.2][f % 4];
  if (clip === 'walk') { ph = f / 8 * Math.PI * 2; moving = true; bob = -0.4 * Math.abs(Math.sin(ph * 2)); }
  if (clip === 'attack') { const a = st.key.a; rear = a > 0.5 ? 1 : st.key.hit ? 0.2 : 0.5; }
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
    if (rear > 0.4 && i === 0) foot = [ceph[0] + 9, s * 5, 9 * rear];
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
  hero: { size: [72, 72, 36, 60], rig: heroRig, swing: e => weaponSwing(e.look), swing2: e => weaponSwing(e.look, 1) },
  skeleton: { size: [72, 78, 36, 55], gait: gaitFrameTiles(SKEL_B, 1.1), rig: skeletonRig, swing: e => e.look.weapon === 'bow' ? SWINGS.bow : SWINGS.light },
  fallen: { size: [52, 48, 26, 40], gait: gaitFrameTiles(FALLEN_B), rig: fallenRig, swing: e => e.look.staff ? SWINGS.cast : SWINGS.claw },
  hound: { size: [80, 64, 38, 50], rig: houndRig, swing: () => SWINGS.bite },
  spider: { size: [80, 60, 40, 46], rig: spiderRig, swing: () => SWINGS.bite },
};
// Variants: same family, different look and stats. `kind` is what the roster ledger counts.
const MONSTERS = {
  skeleton: { family: 'skeleton', name: 'SKELETON', look: { weapon: 'sword', shield: true, armored: true }, hp: 14, dmg: [2, 5], speed: 26, reach: 1.25, xp: 12, chest: 22, shadow: 7 },
  archer: { family: 'skeleton', name: 'SKELETON ARCHER', look: { weapon: 'bow', bone: M.OLDBONE }, hp: 10, dmg: [2, 4], speed: 24, reach: 6.5, ranged: 'arrow', xp: 14, chest: 22, shadow: 7 },
  burning: { family: 'skeleton', name: 'BURNING DEAD', look: { weapon: 'sword', shield: false, helm: true, bone: M.OLDBONE, eye: M.FIREM }, hp: 24, dmg: [4, 8], speed: 30, reach: 1.25, xp: 30, chest: 22, shadow: 7, minLevel: 2 },
  fallen: { family: 'fallen', name: 'FALLEN ONE', look: {}, hp: 7, dmg: [1, 3], speed: 40, reach: 1.15, xp: 6, chest: 12, shadow: 5, pack: true },
  shaman: { family: 'fallen', name: 'FALLEN SHAMAN', look: { staff: true, hood: true, skin: M.SKIN }, hp: 9, dmg: [3, 6], speed: 28, reach: 6, ranged: 'firebolt', xp: 16, chest: 12, shadow: 5 },
  hound: { family: 'hound', name: 'BONE HOUND', look: {}, hp: 16, dmg: [3, 6], speed: 52, reach: 1.35, xp: 18, chest: 12, shadow: 10 },
  ghoulhound: { family: 'hound', name: 'HELL HOUND', look: { skin: M.FLESH, bone: M.OLDBONE, eye: M.FIREM, scale: 1.15 }, hp: 28, dmg: [5, 9], speed: 50, reach: 1.45, xp: 34, chest: 13, shadow: 11, minLevel: 2 },
  spider: { family: 'spider', name: 'CAVE SPIDER', look: { scale: 0.8 }, hp: 10, dmg: [2, 4], speed: 46, reach: 1.3, xp: 10, chest: 8, shadow: 11, pack: true },
  broodmother: { family: 'spider', name: 'BROODMOTHER', look: { brood: true, scale: 1.15, size: [128, 84, 64, 60] }, hp: 60, dmg: [6, 12], speed: 34, reach: 1.9, xp: 90, chest: 12, shadow: 17, minLevel: 3, unique: true },
};
const lookKey = l => JSON.stringify(l);

// Sprites are cached per family/look/direction/clip/frame; poses only change on the 100 ms pose clock.
const spriteCache = new Map();
let spriteBuilds = 0;
function poseState(fam, ent, clip, f) {
  const st = { clip, f };
  if (clip === 'attack' || clip === 'attack2' || clip === 'shoot' || clip === 'cast') { const sw = clip === 'attack2' ? FAMILIES[fam].swing2(ent) : FAMILIES[fam].swing(ent); st.key = sw[f]; st.prev = sw[f - 1]; }
  return st;
}
// Builds are budgeted per frame: past the budget, a missing pose falls back to the nearest cached
// frame (same direction) and is queued, so a crowd turning at once never stalls a frame.
const buildBudget = { ms: Infinity, used: 0 };
const fallbackOrder = { walk: ['walk', 'idle'], idle: ['idle'], attack: ['attack', 'idle'], attack2: ['attack2', 'attack', 'idle'], shoot: ['shoot', 'idle'], cast: ['cast', 'idle'], hit: ['hit', 'idle'], death: ['death'], go: ['go', 'walk', 'idle'], stop: ['stop', 'idle'] };
function getSprite(fam, look, dir, clip, f, ent) {
  const lk = fam === 'hero' ? heroKey(look) : lookKey(look);
  const k = `${fam}|${lk}|${dir}|${clip}|${f}`;
  let sp = spriteCache.get(k);
  if (!sp && buildBudget.used > buildBudget.ms && clip !== 'death') {
    for (const c of fallbackOrder[clip] || ['idle']) for (let g = 0; g < 8; g++) {
      const q = spriteCache.get(`${fam}|${lk}|${dir}|${c}|${(f + g) % 8}`) || spriteCache.get(`${fam}|${lk}|${dir}|${c}|0`);
      if (q) { if (typeof warmQueue !== 'undefined') warmQueue.push([fam, look, dir, clip, f]); return q; }
    }
  }
  if (!sp && look.tint) {   // a recolored variant: tint the base sprite instead of rendering again
    const { tint, ...base } = look;
    const b = getSprite(fam, base, dir, clip, f, ent);
    sp = tintSprite(b, tint); spriteCache.set(k, sp);
    return sp;
  }
  if (!sp) {
    const t0 = performance.now();
    const F = FAMILIES[fam], [w, h, ax, ay] = look.size || F.size;
    const ex = ent || { look };
    sp = renderRig(F.rig(look, poseState(fam, ex, clip, f)), yawOf(dir), w, h, ax, ay);
    if (spriteCache.size > 3000) spriteCache.clear();
    spriteCache.set(k, sp); spriteBuilds++;
    buildBudget.used += performance.now() - t0;
  }
  return sp;
}
