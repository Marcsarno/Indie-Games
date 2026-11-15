'use strict';
// Round 116 (Act II): GORATH, THE FURNACE MAW, the act's last boss. His rig lives here (FAMILIES.gorath,
// MONSTERS.gorath); his fight is in act2.js. Concept: art/refs/act2/region3/gorath.png.
//
// A hunched rock-and-slag beast about twice the hero's height: huge rounded shoulders and forearms of dark
// charcoal plate (ROCK one step down its ramp), a glassy slag belly and legs (CHITIN), a broad head sunk
// between the shoulders with two short curved horns, small amber eyes, a riveted rust-iron jaw plate, three
// long ivory claws on each hand, and four large amber fissures (left shoulder, chest, right forearm, back).
// What keeps him apart from the Cinder Husk: the horns, the jaw plate, the ivory claws, the darker hide and
// fissures that are few and large.
//
// Clips (st.clip, st.f): idle 0-3, walk 0-7.5 (half frames), attack = the keys of GORATH_SWEEP, cast = the keys
// of GORATH_PLANT, hit 0, death 0-5, and two clips of his own: mound 0-3 (burrowed: a heap of rubble, no body)
// and erupt 0-2 (bursting up out of it). The rig reads its swing key from its own tables by clip and frame, so
// a caller that cannot say which clip it is posing (the sheet tool, the warm queue) still gets the right pose.

const GORATH_B = { hipH: 18, thigh: 9.5, shin: 8.5, ankle: 3.4, spine: 18, shW: 20, shZ: 5, upper: 19, fore: 19, hipW: 9, footW: 12.5, stride: 6, lift: 3.4, duty: 0.6, hunch: 0.3 };
const GORATH_REST = [17, 28, 8.4];   // a fist resting on the ground beside the foot: [forward, out, up]

// Swing keys, as MON_SWINGS: ms = how long the key is held, tele = the wind-up (the tell), hit = the blow lands,
// open = he can be punished. The pose fields are his own: hr / hl = where the right / left fist is, [forward,
// right, up] from the ground under his hips, in the turned body's frame; cr / cl = where that hand's claws point;
// tw = shoulder turn (+ = right shoulder back); ln = lean on top of his hunch (+ = forward); bob = hip height;
// fl / fr = left / right foot forward; glow = how hot the fissures burn (0 dim, 1 bright, 2 white-hot).
//
// THE CLAW SWEEP: the right claw drawn far back and up and held there (0.9 s), a fast wide sweep across the
// front, then a second with the arm down on the ground and the body open.
const GORATH_SWEEP = [
  K(0.6, 240, { tele: true, tw: 0.28, ln: -0.05, bob: -1, hr: [0, 36, 34], cr: [0.2, 0.5, 0.85], hl: [21, -17, 8.4], fl: -1, fr: -7, glow: 1 }),
  K(1.0, 420, { tele: true, tw: 0.55, ln: -0.12, bob: -1.5, hr: [-10, 30, 60], cr: [-0.1, 0.35, 0.93], sp: 1.5, hl: [23, -14, 8.4], fl: 0, fr: -8, glow: 1 }),
  K(1.1, 240, { tele: true, tw: 0.62, ln: -0.16, bob: -2, hr: [-13, 28, 63], cr: [-0.1, 0.35, 0.93], sp: 1.6, hl: [23, -14, 8.4], fl: 0, fr: -8, glow: 2 }),
  K(0.5, 70, { smear: true, mv: 0.3, tw: 0.12, ln: 0.06, bob: -2.5, hr: [20, 40, 30], cr: [0.85, -0.5, -0.1], hl: [20, -19, 8.4], fl: 2, fr: -8, glow: 1 }),
  K(0, 70, { smear: true, hit: true, tw: -0.3, ln: 0.2, bob: -3.5, hr: [38, 0, 14], cr: [0.45, -0.88, -0.15], hl: [13, -27, 9.5], fl: 3, fr: -8, glow: 1 }),
  K(-0.5, 230, { open: true, tw: -0.55, ln: 0.22, bob: -3.5, hr: [25, -27, 9.5], cr: [-0.25, -0.95, -0.2], hl: [7, -30, 12], fl: 3, fr: -8 }),
  K(-0.4, 470, { open: true, tw: -0.4, ln: 0.27, bob: -4.5, hr: [26, -7, 8.4], cr: [0.85, -0.45, -0.3], hl: [5, -31, 14], fl: 3, fr: -8 }),
  K(0, 300, { tw: -0.1, ln: 0.08, bob: -1.5, hr: [20, 20, 9], hl: [14, -28, 8.6], fl: -1, fr: -6 }),
];
// THE GROUND ERUPTION: he rears a little, plants both claws in the ground in front of him and leans in low over
// them, elbows flared, holding (1.1 s; cracks spread from the claws), then tears them back up (the hit) and
// stands open.
const GORATH_PLANT = [
  K(0.5, 200, { tele: true, ln: -0.28, bob: 1.5, hr: [14, 27, 50], hl: [14, -27, 50], cr: [0.7, 0.2, 0.7], cl: [0.7, -0.2, 0.7], glow: 1 }),
  K(0.8, 100, { tele: true, ln: 0.1, bob: -2, hr: [29, 15, 24], hl: [29, -15, 24], cr: [0.7, 0.1, -0.7], cl: [0.7, -0.1, -0.7], glow: 1 }),
  K(1, 500, { tele: true, ln: 0.4, bob: -5, hr: [30, 10, 8.4], hl: [30, -10, 8.4], cr: [0.85, 0.25, -0.46], cl: [0.85, -0.25, -0.46], glow: 2, crack: 1 }),
  K(1, 300, { tele: true, ln: 0.46, bob: -6, hr: [30, 10, 8.4], hl: [30, -10, 8.4], cr: [0.85, 0.25, -0.46], cl: [0.85, -0.25, -0.46], glow: 2, crack: 2 }),
  K(0.3, 90, { hit: true, ln: -0.2, bob: 0.5, hr: [21, 28, 40], hl: [21, -28, 40], cr: [0.35, 0.3, 0.9], cl: [0.35, -0.3, 0.9], glow: 2, crack: 3 }),
  K(0.2, 300, { open: true, ln: -0.28, bob: 0.5, hr: [8, 33, 44], hl: [8, -33, 44], cr: [0.3, 0.45, 0.85], cl: [0.3, -0.45, 0.85], glow: 1, crack: 4 }),
  K(0, 250, { ln: -0.06, bob: -0.5, hr: [15, 29, 20], hl: [15, -29, 20] }),
];

// a fissure: a jagged bolt painted on a part. q = the point from the bolt's middle, e1 = along it, e2 = across it,
// n = the side of the part it is on. 2 = its hot core, 1 = its edge, 0 = not on it
function gorathBolt(q, e1, e2, n, len, wid, amp, per) {
  if (V.dot(q, n) < 0) return 0;
  const t = V.dot(q, e1), a = Math.abs(t) / len; if (a >= 1) return 0;
  const x = ((t / per) % 2 + 2) % 2, zig = (2 * Math.abs(x - 1) - 1) * amp;
  const d = Math.abs(V.dot(q, e2) - zig), hw = wid * (1 - a * a);
  return d < hw * 0.42 ? 2 : d < hw ? 1 : 0;
}

// the pose for a clip and frame: where the hips, feet and fists are, how far he leans, how hot he burns
function gorathPose(st) {
  const clip = st.clip, f = st.f || 0, R = GORATH_REST;
  const P = { bob: 0, ln: 0, tw: 0, sway: 0, fl: [-3, 0], fr: [-5, 0], hr: [R[0], R[1], R[2]], hl: [R[0], -R[1], R[2]], cr: null, cl: null, shr: 0, shl: 0, glow: 0, br: 0, nod: 0, key: null, prev: null };
  if (clip === 'idle') {   // breathing: the chest and shoulders rise and the fissures flare with the breath
    const b = [0, 0.7, 1, 0.4][f & 3]; P.br = b; P.bob = b * 0.4; P.glow = (f & 3) === 1 || (f & 3) === 2 ? 1 : 0;
  } else if (clip === 'walk') {   // a heavy knuckle-walk: each fist swings forward with the opposite foot and takes the weight
    const B = GORATH_B, p = f / 8, gl = gaitFoot(B, p), gr = gaitFoot(B, p + 0.5), A = { stride: 8, duty: 0.6, lift: 5.5 };
    const ar = gaitFoot(A, p + 0.08), al = gaitFoot(A, p + 0.58);
    P.fl = [gl[0] - 3, gl[1]]; P.fr = [gr[0] - 3, gr[1]];
    P.hr = [R[0] + 2 + ar[0], R[1], R[2] + ar[1]]; P.hl = [R[0] + 2 + al[0], -R[1], R[2] + al[1]];
    P.shr = ar[1] * 0.45 - 0.8; P.shl = al[1] * 0.45 - 0.8;   // the shoulder lifts its fist, and drops onto it as it lands
    P.bob = Math.cos(4 * Math.PI * (p - B.duty / 2)) * 0.9 - 0.6; P.sway = -Math.cos(2 * Math.PI * (p - B.duty / 2)) * 1.3;
    P.tw = -(gl[0] - gr[0]) / (2 * B.stride) * 0.13; P.ln = 0.05;
  } else if (clip === 'hit') {   // a boss barely flinches: the head jerks, the shoulders come up, the fissures flare
    P.ln = -0.07; P.bob = -0.8; P.nod = -0.2; P.shr = P.shl = 1.2; P.glow = 1;
  } else if (clip === 'attack' || clip === 'cast') {
    const sw = clip === 'cast' ? GORATH_PLANT : GORATH_SWEEP, i = clamp(Math.floor(f), 0, sw.length - 1), k = sw[i];
    P.key = k; P.prev = sw[i - 1] || null;
    P.tw = k.tw || 0; P.ln = k.ln || 0; P.bob = k.bob || 0; P.glow = k.glow || 0;
    if (k.hr) P.hr = k.hr; if (k.hl) P.hl = k.hl; P.cr = k.cr || null; P.cl = k.cl || null;
    if (k.fl !== undefined) { P.fl = [k.fl, 0]; P.fr = [k.fr, 0]; }
    if (P.hr[2] > 30) P.shr = 2; if (P.hl[2] > 30) P.shl = 2;
  } else if (clip === 'death') {   // he sags and the fissures gutter out (0, 1); frames 2-5 are built by gorathRig
    const k = Math.min(f, 2);
    P.bob = [-2.5, -7, -11][k]; P.ln = [0.08, 0.2, 0.3][k]; P.nod = [0.25, 0.5, 0.6][k]; P.glow = k === 0 ? -0.5 : -1;
    P.hr = [[17, 29, 7.5], [14, 31, 7.5], [12, 32, 7.5]][k]; P.hl = [P.hr[0], -P.hr[1], P.hr[2]]; P.fl = [-1, 0]; P.fr = [-6, 0];
  }
  return P;
}

function gorathJoints(P) {
  const B = GORATH_B, lean = B.hunch + P.ln, Z = [0, 0, 1];
  const fwd = V.rotZ([1, 0, 0], P.tw), sideR = V.rotZ([0, 1, 0], P.tw);
  const up = V.add(V.mul(Z, Math.cos(lean)), V.mul(fwd, Math.sin(lean)));   // the spine's axis, leaning forward
  const tf = V.sub(V.mul(fwd, Math.cos(lean)), V.mul(Z, Math.sin(lean)));   // out of the chest
  const pelvis = [0, P.sway, B.hipH + P.bob], chest = V.mad(pelvis, up, B.spine + P.br * 0.6);
  const at = h => [fwd[0] * h[0] + sideR[0] * h[1], P.sway + fwd[1] * h[0] + sideR[1] * h[1], h[2]];
  const dir = c => V.norm([fwd[0] * c[0] + sideR[0] * c[1], fwd[1] * c[0] + sideR[1] * c[1], c[2]]);
  const J = { fwd, sideR, up, tf, pelvis, chest, at, dir };
  for (const [n, s, h, lift] of [['R', 1, P.hr, P.shr], ['L', -1, P.hl, P.shl]]) {
    const sh = V.add(V.add(V.mad(chest, sideR, s * B.shW), V.mul(up, B.shZ + P.br * 0.9)), [0, 0, lift || 0]);
    const a = ik(sh, at(h), B.upper, B.fore, V.norm(V.add(V.add(V.mul(fwd, -0.7), V.mul(sideR, s * 0.9)), [0, 0, 0.25])));   // elbows out and back
    J['sh' + n] = sh; J['el' + n] = a.joint; J['hand' + n] = a.end;
  }
  const hs = V.rotZ([0, 1, 0], P.tw * 0.3);   // the hips follow the shoulders a little
  for (const [n, s, ft] of [['R', 1, P.fr], ['L', -1, P.fl]]) {
    const hip = V.add(V.mad(pelvis, hs, s * B.hipW), [0, 0, -1]);
    const leg = ik(hip, [ft[0], s * B.footW, ft[1] + B.ankle], B.thigh, B.shin, [1, s * 0.45, 0.1]);
    J['hip' + n] = hip; J['knee' + n] = leg.joint; J['ank' + n] = leg.end;
  }
  return J;
}

// the three ivory claws of one hand, fanned level across the way they point and hooked at the tips
function gorathClaws(r, hand, cd, fwd, k = 1) {
  let ax = V.cross(cd, [0, 0, 1]); if (V.len(ax) < 0.35) ax = V.cross(cd, fwd); ax = V.norm(ax);
  const curl = V.mul(V.cross(ax, cd), -1);
  for (const c of [-1, 0, 1]) {
    const b0 = V.add(V.mad(hand, cd, 4.5 * k), V.mul(ax, c * 4.4 * k)), b1 = V.add(V.mad(b0, cd, 6.5 * k), V.mul(ax, c * 1.4 * k)), b2 = V.add(V.mad(b1, cd, 5.5 * k), V.mul(curl, 2.6 * k));
    r.group(() => { r.cone(b0, b1, 2.6 * k, 2.0 * k, M.BONE); r.cone(b1, b2, 2.0 * k, 0.5, M.BONE); });
  }
}
function gorathHorn(r, hb, out, hu, hf) {   // out, then up and a little forward: a short bull's horn
  const h1 = V.add(V.mad(hb, out, 5.5), V.mul(hu, 4.5)), h2 = V.add(V.add(V.mad(h1, out, -0.5), V.mul(hu, 6.5)), V.mul(hf, 2.5));
  r.group(() => { r.cone(hb, h1, 3.0, 2.3, M.HORN); r.cone(h1, h2, 2.3, 0.6, M.HORN); });
}
function gorathJawPlate(r, c, ax) {   // a slab of rusted iron with a rivet in each corner
  r.box(c, [2.4, 8.2, 3.6], M.RUST, ax, { mf: p => { const q = V.sub(p, c), s2 = Math.abs(V.dot(q, ax[1])), z2 = Math.abs(V.dot(q, ax[2])), f2 = V.dot(q, ax[0]);
    if (f2 > 2 && (s2 - 6.0) ** 2 + (z2 - 1.7) ** 2 < 1.0) return M.STEEL;
    if (s2 > 8 && f2 * f2 + z2 * z2 < 1.0) return M.STEEL;
    return 0; } });
}

function gorathBody(r, P) {
  const J = gorathJoints(P), { fwd, sideR, up, tf, pelvis, chest } = J, Z = [0, 0, 1];
  const rock = M.ROCK, slag = M.CHITIN, D1 = { bias: -1 }, D2 = { bias: -2 }, g = P.glow;
  const core = g >= 2 ? M.FLASH : g >= 1 ? M.EYE_YEL : g > -1 ? M.FIREM : M.DARK, rim = g >= 2 ? M.EYE_YEL : g >= 0 ? M.FIREM : M.DARK;
  const glowM = v => v === 2 ? core : v === 1 ? rim : 0;
  // short thick legs
  for (const n of ['L', 'R']) {
    const hip = J['hip' + n], knee = J['knee' + n], ank = J['ank' + n];
    r.cone(hip, knee, 7.2, 6.4, slag); r.cone(knee, ank, 6.4, 5.6, slag);
    r.ell(V.add(ank, [3.2, 0, -0.6]), [8.4, 6.6, 3.6], rock, null, D2);
  }
  // the trunk: a slag belly, a chest plate with a fissure low across it, and a hump of back plate with another
  const tax = [tf, sideR, up];
  r.ell(V.mad(pelvis, up, 4), [10.5, 13, 10], slag, tax);
  const cc = V.add(V.mad(chest, up, -1.5), V.mul(tf, 1.5)), cb = V.add(V.mad(cc, up, -3.5), V.mul(sideR, -1.5));
  const c1 = V.norm(V.add(V.mul(up, 0.8), V.mul(sideR, 0.6))), c2 = V.norm(V.sub(V.mul(sideR, 0.8), V.mul(up, 0.6)));
  r.ell(cc, [12.5, 18.5, 12], rock, tax, { bias: -1, mf: p => glowM(gorathBolt(V.sub(p, cb), c1, c2, tf, 9.5, 2.7, 2.3, 4.6)) });
  const hc = V.add(V.mad(chest, up, 4.5), V.mul(tf, -6.5)), hn = V.norm(V.sub(V.mul(up, 0.75), V.mul(tf, 0.65))), ht = V.norm(V.cross(hn, sideR));
  const h1 = V.norm(V.add(V.mul(sideR, 0.88), V.mul(ht, 0.47))), h2 = V.norm(V.cross(hn, h1));
  r.ell(hc, [9.5, 16.5, 9], rock, tax, { bias: -1, mf: p => glowM(gorathBolt(V.sub(p, hc), h1, h2, hn, 11, 2.7, 2.4, 5)) });
  // shoulders, arms, fists and claws
  for (const [n, s] of [['R', 1], ['L', -1]]) {
    const sh = J['sh' + n], el = J['el' + n], hand = J['hand' + n], d = V.norm(V.sub(hand, el));
    const sc = V.add(V.mad(sh, sideR, s * 1.5), V.mul(up, 1));
    if (s < 0) {   // the left shoulder's fissure, over its front and top
      const sn = V.norm(V.add(V.add(V.mul(fwd, 0.6), V.mul(Z, 0.65)), V.mul(sideR, -0.45))), s1 = V.norm(V.cross(sn, V.norm(V.add(V.mul(sideR, 0.8), V.mul(fwd, 0.6))))), s2 = V.norm(V.cross(sn, s1));
      r.sph(sc, 11, rock, { bias: -1, mf: p => glowM(gorathBolt(V.sub(p, sc), s1, s2, sn, 8.5, 2.6, 2.2, 4.2)) });
    } else r.sph(sc, 11, rock, D1);
    r.cone(sh, el, 7.6, 6.8, rock, D2);
    const wr = V.lerp(el, hand, 0.74);
    if (s > 0) {   // the right forearm's fissure, down its outer face
      const fm = V.lerp(el, wr, 0.55), o0 = V.add(V.add(V.mul(sideR, 0.75), V.mul(fwd, 0.4)), V.mul(Z, 0.5)), fn = V.norm(V.sub(o0, V.mul(d, V.dot(o0, d)))), f2 = V.norm(V.cross(fn, d));
      r.cone(el, wr, 7.2, 8.4, rock, { bias: -1, mf: p => glowM(gorathBolt(V.sub(p, fm), d, f2, fn, 7.5, 2.5, 2.0, 3.8)) });
    } else r.cone(el, wr, 7.2, 8.4, rock, D1);
    r.sph(hand, 7.8, rock, D2);
    gorathClaws(r, hand, J.dir((s > 0 ? P.cr : P.cl) || [0.95, s * 0.12, -0.3]), fwd);
  }
  // the head, sunk between the shoulders: it keeps looking ahead however the body leans
  const hp = 0.1 + P.ln * 0.5 + P.nod, hf = V.sub(V.mul(fwd, Math.cos(hp)), V.mul(Z, Math.sin(hp))), hu = V.add(V.mul(Z, Math.cos(hp)), V.mul(fwd, Math.sin(hp))), hax = [hf, sideR, hu];
  const hd = V.add(V.mad(chest, up, 10), V.mul(tf, 10));
  r.ell(hd, [8.5, 9, 7.6], rock, hax, { bias: -1, mf: p => { const q = V.sub(p, hd), z2 = V.dot(q, hu); return V.dot(q, hf) > 5 && z2 > -0.6 && z2 < 2.6 && Math.abs(V.dot(q, sideR)) < 7 ? M.DARK : 0; } });
  r.ell(V.add(V.mad(hd, hf, 4.6), V.mul(hu, 3.6)), [4.6, 8.8, 2.8], rock, hax, D2);   // the brow
  const eyeM = g >= 2 ? M.EYE_YEL : g > -1 ? M.FIREM : M.DARK;
  for (const s of [-1, 1]) {
    const ea = V.norm(V.add(V.mul(sideR, s), V.mul(hu, 0.45)));   // slanted down toward the nose: a scowl
    r.ell(V.add(V.add(V.mad(hd, hf, 7.7), V.mul(sideR, s * 3.7)), V.mul(hu, 1.0)), [1.3, 2.3, 1.05], eyeM, [hf, ea, V.cross(hf, ea)], { noShadow: true });
    gorathHorn(r, V.add(V.add(V.mad(hd, sideR, s * 6.2), V.mul(hu, 5.2)), V.mul(hf, -0.5)), V.mul(sideR, s), hu, hf);
  }
  gorathJawPlate(r, V.add(V.mad(hd, hf, 6.6), V.mul(hu, -3.7)), hax);
  return J;
}

// the swept claws: an ivory crescent from where the fist was on the last key to where it is now
function gorathSmear(r, P, J) {
  if (!P.key || !P.key.smear || !P.prev || SMEAR_MODE === 'none') return;
  const Q = gorathPose({ clip: 'attack', f: GORATH_SWEEP.indexOf(P.prev) }), J0 = gorathJoints(Q);
  const a0 = V.sub(J0.handR, J0.shR), a1 = V.sub(J.handR, J.shR), N = 8, pts = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, v = V.lerp(a1, a0, t), l = lerp(V.len(a1), V.len(a0), t), dv = V.norm(v);
    pts.push([V.mad(V.lerp(J.shR, J0.shR, t), dv, l + 15), dv, 9 * Math.pow(1 - t, 1.2)]);
  }
  for (let i = 0; i < N; i++) {
    const [p0, d0, w0] = pts[i], [p1, d1, w1] = pts[i + 1], t = i / N, col = t < 0.3 ? 27 : t < 0.62 ? 26 : 25;
    r.tri(V.mad(p0, d0, -w0), p0, p1, col, t >= 0.62); r.tri(V.mad(p0, d0, -w0), p1, V.mad(p1, d1, -w1), col, t >= 0.62);
  }
}

// a heap of slag: flattened lumps of plate (0) and slag (1). k = how far it spreads, hk = how high it stands
const GORATH_LUMPS = [   // x, y, radius, height, kind
  [0, 0, 11, 0.62, 0], [-4, 14, 9, 0.6, 1], [-3, -15, 9.5, 0.58, 0], [10, 7, 7.5, 0.6, 1], [9, -9, 8, 0.56, 0], [-12, 2, 8, 0.6, 1],
  [4, 24, 6.5, 0.55, 0], [3, -25, 6.5, 0.55, 1], [16, -1, 5.5, 0.55, 0], [-11, -14, 6, 0.55, 1], [-10, 16, 6, 0.55, 0],
  [15, 17, 4.5, 0.6, 1], [14, -18, 4.5, 0.6, 0], [-18, -6, 4.5, 0.6, 0], [-17, 9, 4.5, 0.6, 1],
];
function gorathHeap(r, k, hk, o = {}) {
  GORATH_LUMPS.forEach(([x, y, rad, h, kind], i) => {
    if (o.skip && o.skip(i, x, y)) return;
    const rz = rad * h * hk, dz = o.lift ? o.lift(i) : 0;
    r.ell([x * k, y * k, rz * 0.55 + dz], [rad, rad * 0.92, rz], kind ? M.CHITIN : M.ROCK, null, { bias: kind ? 0 : -1 - (i & 1) });
  });
}
// stones thrown clear of the ground: [x, y, z, radius]
function gorathStones(r, list) { list.forEach(([x, y, z, rad], i) => r.sph([x, y, z], rad, M.ROCK, { bias: i & 1 ? -1 : 0, noShadow: true })); }
// cracks running out over the floor from under a heap (dark), each a bent line
function gorathCracks(r, r0, r1, n, turn = 0) {
  for (let i = 0; i < n; i++) {
    const a = turn + i * Math.PI * 2 / n + (hash(i, 3, 11) - 0.5) * 0.5, l = r1 * (0.75 + hash(i, 5, 11) * 0.25), b = a + (i & 1 ? 0.22 : -0.22);
    const p0 = [Math.cos(a) * r0, Math.sin(a) * r0, 0.4], p1 = [Math.cos(b) * (r0 + l) / 2, Math.sin(b) * (r0 + l) / 2, 0.4], p2 = [Math.cos(a) * l, Math.sin(a) * l, 0.4];
    r.group(() => { r.cone(p0, p1, 1.2, 1.0, M.DARK, { noShadow: true }); r.cone(p1, p2, 1.0, 0.9, M.DARK, { noShadow: true }); });
  }
}
// push a rig down into the ground: what ends up under the floor is dropped, and a limb crossing it is cut there
function gorathSink(r, dz) {
  tipRig(r, [0, 0, 0], 0, 0, dz);
  r.p = r.p.filter(p => {
    if (p.k === 2 || p.k === 4) {
      const lo = p.a[2] < p.b[2] ? 'a' : 'b', hi = lo === 'a' ? 'b' : 'a';
      if (p[hi][2] < 2) return false;
      if (p[lo][2] < 0) { const t = p[lo][2] / (p[lo][2] - p[hi][2]); p[lo] = V.lerp(p[lo], p[hi], t); if (p.k === 2) p['r' + lo] = lerp(p['r' + lo], p['r' + hi], t); }
      return true;
    }
    const top = p.c[2] + (p.k === 0 ? p.r : p.k === 1 ? Math.max(p.rad[0], p.rad[1], p.rad[2]) * 0.8 : V.len(p.half) * 0.7);
    return top > 4 && p.c[2] > -6;
  });
}

function gorathRig(look, st) {
  const r = new Rig(), clip = st.clip, f = st.f || 0;
  if (clip === 'mound') {   // burrowed: a wide low heap that shakes, stones jumping over it, cracks running out, a glow under the rubble
    const ph = f & 3;
    gorathCracks(r, 20, 37, 7, 0.3);
    r.ell([0, 0, 2.2], [15, 19, 2.6], ph & 1 ? M.EYE_YEL : M.FIREM, null, { noShadow: true });
    gorathHeap(r, 1, 1, { lift: i => ((i + ph) & 3) === 0 ? 1.6 : ((i * 3 + ph) & 3) === 1 ? 0.7 : 0 });
    gorathStones(r, [[7, 11, 0, 2.8], [-9, -7, 1, 2.5], [13, -15, 2, 2.3], [-5, 21, 3, 2.6], [-15, 6, 1, 2.2]].map(([x, y, i, rad]) => [x, y, 13 + [0, 7, 11, 6][(i + ph) & 3], rad]));
    return r;
  }
  if (clip === 'erupt') {   // bursting up: claws and horns first (0), head and shoulders through the rubble (1), nearly out (2)
    const k = clamp(Math.floor(f), 0, 2), P = gorathPose({ clip: 'idle', f: 0 });
    P.br = 0; P.glow = k < 2 ? 2 : 1; P.ln = [-0.3, -0.24, -0.08][k]; P.shr = P.shl = 2;
    P.hr = [[11, 19, 76], [13, 29, 64], [20, 32, 38]][k]; P.hl = [P.hr[0], -P.hr[1], P.hr[2]];
    P.cr = [[0.15, 0.2, 0.96], [0.45, 0.4, 0.8], [0.85, 0.3, -0.1]][k]; P.cl = [P.cr[0], -P.cr[1], P.cr[2]];
    gorathBody(r, P); gorathSink(r, [45, 24, 8][k]);
    gorathCracks(r, 22, 40, 7, 0.3);
    const sp = [1.12, 1.32, 1.5][k];
    gorathHeap(r, sp, [1.15, 0.95, 0.8][k], { skip: (i, x, y) => Math.hypot(x, y) < [9, 13, 15][k], lift: i => k === 0 && i < 6 ? 2.5 : 0 });
    const T = [[14, 20, 2.8], [-16, -12, 2.6], [20, -22, 2.4], [-8, 27, 2.6], [-22, 10, 2.2], [24, 4, 2.3], [2, -30, 2.4], [-20, -24, 2.0]];
    gorathStones(r, T.map(([x, y, rad], i) => [x * [0.6, 1, 1.3][k], y * [0.6, 1, 1.3][k], [[16, 22, 12], [30, 38, 24], [22, 30, 14]][k][i % 3] + (i & 1) * 5, rad]));
    return r;
  }
  if (clip === 'death' && f >= 3) {   // a heap of dark slag, settling, with the horns, the jaw plate and a few claws on top
    const k = Math.min(Math.floor(f), 5) - 3, sp = [0.84, 0.93, 1][k], hk = [1.75, 1.6, 1.5][k], top = 11 * 0.62 * hk * 1.5;
    gorathHeap(r, sp, hk);
    const hf = V.norm([0.9, 0.25, -0.35]), hs = V.norm(V.cross([0, 0, 1], hf)), hu = V.cross(hf, hs);
    gorathJawPlate(r, [9 * sp, 2, top - 4.5], [hf, hs, hu]);
    gorathHorn(r, [-3, 7, top - 2.5], V.norm([-0.2, 0.9, 0.3]), [0, 0, 1], [1, 0, 0]);
    gorathHorn(r, [-1, -8, top - 3.5], V.norm([0.1, -0.95, -0.1]), V.norm([0.3, -0.5, 0.8]), [1, 0, 0]);
    gorathClaws(r, [13 * sp, 19 * sp, 3.5], V.norm([0.75, 0.6, 0.1]), [1, 0, 0]);
    gorathClaws(r, [11 * sp, -22 * sp, 3.5], V.norm([0.8, -0.55, 0.05]), [1, 0, 0]);
    return r;
  }
  const P = gorathPose(st), J = gorathBody(r, P);
  if (clip === 'death' && f >= 2) {   // he comes apart: every piece drops and slides outward
    for (const p of r.p) {
      const sq = q => [q[0] * 1.12, q[1] * 1.12, q[2] * 0.6];
      if (p.mf) { const f0 = p.mf; p.mf = (q, n) => f0([q[0] / 1.12, q[1] / 1.12, q[2] / 0.6], n); }
      if (p.c) p.c = sq(p.c); if (p.a) { p.a = sq(p.a); p.b = sq(p.b); }
    }
  }
  if (clip === 'attack') gorathSmear(r, P, J);
  if (clip === 'cast' && P.key && P.key.crack) {
    // the planted claws crack the floor: glowing lines that spread from the claws while he holds, then stones
    // thrown up as he tears them free
    const c = P.key.crack, o = J.at([44, 0, 0]);
    if (c <= 2) for (const [a, l] of [[0, 15], [0.75, 11], [-0.8, 12], [1.9, 8], [-2.0, 8]]) {
      const dv = J.dir([Math.cos(a), Math.sin(a), 0]), sv = J.dir([-Math.sin(a), Math.cos(a), 0]), L = l * (c === 2 ? 1 : 0.6), m = V.add(V.mad(o, dv, L * 0.5), V.mul(sv, 1.6));
      const p0 = [o[0], o[1], 0.4], p1 = [m[0], m[1], 0.4], e = V.mad(o, dv, L), p2 = [e[0], e[1], 0.4], w = V.mul(sv, 1.3);
      r.tri(V.sub(p0, w), V.add(p0, w), p1, c === 2 ? 17 : 16); r.tri(V.sub(p1, w), V.add(p1, w), p2, 16);
    } else gorathStones(r, [[34, 10, 2.6], [40, -6, 2.4], [30, -14, 2.2], [46, 3, 2.0], [37, 0, 2.8]].map(([x, y, rad], i) => { const q = J.at([x * (c === 4 ? 1.12 : 1), y * (c === 4 ? 1.2 : 1), 0]); return [q[0], q[1], (c === 3 ? [14, 20, 10, 8, 26] : [9, 30, 5, 3, 36])[i], rad]; }));
  }
  return r;
}

FAMILIES.gorath = { size: [132, 128, 66, 94], gait: gaitFrameTiles(GORATH_B), rig: gorathRig, swing: e => e && e.clip === 'cast' ? GORATH_PLANT : GORATH_SWEEP };
MONSTERS.gorath = { family: 'gorath', name: 'GORATH', title: 'THE FURNACE MAW', look: {}, hp: 260, dmg: [12, 20], speed: 26, reach: 2.2, xp: 400, chest: 52, shadow: 18, unique: true, minLevel: 99 };
// out of build time, a burrowed or bursting Gorath falls back to another frame of the same clip, never to the idle body
if (!fallbackOrder.mound) fallbackOrder.mound = ['mound'];
if (!fallbackOrder.erupt) fallbackOrder.erupt = ['erupt', 'mound'];
