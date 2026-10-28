'use strict';
// Body families. Each family is a rig recipe: proportions + a pose function + parts. Variants
// change materials, sizes and attachments; they are not new families (see the handoff's roster
// ledger). Every clip is a list of poses on the 100 ms pose clock, and attack clips mark the key
// where damage fires (`hit`), so gameplay never infers contact from an animation preview.

const DIRS = 8;
const yawOf = d => d * Math.PI / 4;   // d=1 faces the camera, d=7 faces screen right
// pose clip lengths in frames (100 ms each unless a clip lists its own hold times)
const CLIP_FRAMES = { idle: 4, walk: 8, hit: 1, death: 6, go: 1, stop: 1 };

// ---------------------------------------------------------------- attack timing
// Attacks are poses with hold times (Slynyrd): a held anticipation, short smear keys, the contact
// key (damage, hitstop, sparks), a held follow-through, recovery. `a` is the arm's angle in the
// swing plane (2.3 = raised behind the right shoulder, 0 = level forward, -1 = low across).
// Keys can also pose the body: ck = blade cocked past the arm (wrist laid back in the wind-up,
// rolled over in the follow-through), r = hand distance from the shoulder pivot (elbow bent in the
// wind-up, arm extended at contact), tw = shoulder turn (+ = right shoulder back), ln = lean,
// bob = hip drop, fl/fr = front/back foot (step in on the strike), mv = tiles of lunge on the key.
// A swing list's `tilt` sets its plane: 0.65 = diagonal across the body, ~0.2 = overhead.
const K = (a, ms, o = {}) => Object.assign({ a, ms }, o);
const withTilt = (keys, tilt, extra = {}) => Object.assign(keys, { tilt }, extra);
const SWINGS = {
  // forehand: high behind the right shoulder, diagonally down across to the low left
  light: withTilt([
    K(1.9, 100, { ck: 0.3, r: 4.8, tw: 0.42, ln: -0.04, bob: -0.4, fl: 1.5, fr: -3.5 }),
    K(1.2, 45, { smear: true, ck: 0.35, r: 6.2, tw: 0.15, ln: 0.08, bob: -0.6, fl: 3.5, fr: -3.2, mv: 0.05 }),
    K(0.3, 45, { smear: true, ck: 0.1, r: 7.4, tw: -0.2, ln: 0.16, bob: -1.0, fl: 5, fr: -3.2, mv: 0.05 }),
    K(-0.45, 50, { smear: true, hit: true, ck: -0.1, r: 7.4, tw: -0.42, ln: 0.2, bob: -1.6, fl: 5.5, fr: -3.6, mv: 0.04 }),
    K(-0.85, 110, { ck: -0.2, r: 6.2, tw: -0.5, ln: 0.16, bob: -1.4, fl: 5.5, fr: -3.6 }),
    K(0.6, 70, { ck: 0.3, r: 5.6, tw: -0.12, ln: 0.08, bob: -0.6, fl: 4, fr: -3 }),
  ], 0.65),
  // backhand (second swing of a combo): from the low left, rising across to the high right
  light2: withTilt([
    K(-1.3, 90, { ck: -0.5, r: 5, tw: -0.5, ln: 0.1, bob: -1.0, fl: 4.5, fr: -3.5 }),
    K(-0.6, 45, { smear: true, ck: -0.25, r: 6.5, tw: -0.2, ln: 0.12, bob: -0.9, fl: 5, fr: -3.2, mv: 0.04 }),
    K(0.2, 45, { smear: true, ck: 0, r: 7.4, tw: 0.15, ln: 0.14, bob: -1.1, fl: 5.5, fr: -3.2, mv: 0.04 }),
    K(0.9, 50, { smear: true, hit: true, ck: 0.15, r: 7.2, tw: 0.36, ln: 0.12, bob: -1.3, fl: 5.5, fr: -3.6, mv: 0.03 }),
    K(1.5, 110, { ck: 0.4, r: 6, tw: 0.45, ln: 0.06, bob: -0.9, fl: 5, fr: -3.6 }),
    K(0.6, 80, { ck: 0.2, r: 5.6, tw: 0.15, ln: 0.06, bob: -0.5, fl: 3.5, fr: -3 }),
  ], 0.65),
  // heavy: an overhead chop. Rises onto the toes in a long wind-up, drops into a crouch on contact
  // and holds there (the weight), two hands on the haft unless a shield is carried
  heavy: withTilt([
    K(2.0, 220, { ck: 0.25, r: 4.5, tw: 0.3, ln: -0.12, bob: 0.4, fl: 2, fr: -3.5 }),
    K(1.6, 60, { smear: true, ck: 0.45, r: 6, tw: 0.15, ln: 0.04, bob: -0.2, fl: 4, fr: -3.5, mv: 0.06 }),
    K(0.6, 60, { smear: true, ck: 0.15, r: 7.4, tw: 0, ln: 0.22, bob: -1.2, fl: 5.5, fr: -3.6, mv: 0.06 }),
    K(-0.3, 60, { smear: true, hit: true, ck: 0, r: 7.4, tw: -0.1, ln: 0.32, bob: -2.4, fl: 6, fr: -4, mv: 0.03 }),
    K(-0.6, 180, { ck: -0.1, r: 7, tw: -0.1, ln: 0.3, bob: -2.4, fl: 6, fr: -4 }),
    K(0.6, 120, { ck: 0.3, r: 5.5, tw: 0, ln: 0.1, bob: -0.8, fl: 4, fr: -3 }),
  ], 0.22, { twoHand: true }),
  // heavy combo follow-up: a rising diagonal backhand at heavy timing
  heavy2: withTilt([
    K(-1.3, 200, { ck: -0.5, r: 5, tw: -0.5, ln: 0.14, bob: -1.4, fl: 5, fr: -3.6 }),
    K(-0.6, 60, { smear: true, ck: -0.25, r: 6.5, tw: -0.2, ln: 0.14, bob: -1.2, fl: 5.5, fr: -3.4, mv: 0.05 }),
    K(0.2, 60, { smear: true, ck: 0, r: 7.4, tw: 0.15, ln: 0.16, bob: -1.4, fl: 6, fr: -3.4, mv: 0.05 }),
    K(0.9, 60, { smear: true, hit: true, ck: 0.15, r: 7.2, tw: 0.36, ln: 0.14, bob: -1.8, fl: 6, fr: -4, mv: 0.03 }),
    K(1.4, 190, { ck: 0.4, r: 6, tw: 0.45, ln: 0.08, bob: -1.4, fl: 5.5, fr: -4 }),
    K(0.5, 130, { ck: 0.2, r: 5.6, tw: 0.15, ln: 0.06, bob: -0.6, fl: 3.5, fr: -3 }),
  ], 0.65, { twoHand: true }),
  claw: [{ a: 1.6, ms: 160 }, { a: 0.6, ms: 50, smear: true }, { a: -0.3, ms: 60, hit: true }, { a: -0.5, ms: 140 }, { a: 0, ms: 90 }],
  bite: [{ a: 1, ms: 180 }, { a: 0.3, ms: 60 }, { a: -0.2, ms: 70, hit: true }, { a: -0.1, ms: 160 }, { a: 0.5, ms: 90 }],
  bow: [{ a: 0, ms: 140 }, { a: 1, ms: 260 }, { a: 1, ms: 60, hit: true }, { a: 0.4, ms: 200 }],
  cast: [{ a: 0, ms: 120 }, { a: 1, ms: 220 }, { a: 1.2, ms: 60, hit: true }, { a: 0.5, ms: 200 }],
};
const swingMs = sw => sw.reduce((a, k) => a + k.ms, 0);
function swingKey(sw, ms) {
  let acc = 0;
  for (let i = 0; i < sw.length; i++) { acc += sw[i].ms; if (ms < acc) return i; }
  return -1;
}

// ---------------------------------------------------------------- shared helpers
// apply a rigid transform (rotate about the local y axis around a pivot, then drop) to every
// primitive in a rig: used to fall over in death poses
function tipRig(rig, pivot, pitch, roll = 0, drop = 0) {
  const P = p => { let q = V.sub(p, pivot); q = V.rotY(q, pitch); q = V.rotX(q, roll); q = V.add(q, pivot); q[2] -= drop; return q; };
  const Vv = v => V.rotX(V.rotY(v, pitch), roll);
  for (const p of rig.p) {
    if (p.c) p.c = P(p.c);
    if (p.a) { p.a = P(p.a); p.b = P(p.b); }
    if (p.ax) p.ax = p.ax.map(Vv);
    if (p.mf) { const f = p.mf; const inv = q => { let r = [q[0] - pivot[0], q[1] - pivot[1], q[2] - pivot[2] + drop]; r = V.rotX(r, -roll); r = V.rotY(r, -pitch); return V.add(r, pivot); }; p.mf = (q, n) => f(inv(q), n); }
  }
  rig.tris = rig.tris.map(([a, b, c, col, d]) => [P(a), P(b), P(c), col, d]);
}
// a swept blade: emissive crescent from angle a0 to a1 in the swing plane (age-graded colors)
// SMEAR_MODE: 'full' = bright crescent; 'subtle' = a short, thin, dithered steel streak at the
// blade tip; 'none' = no trail
let SMEAR_MODE = 'subtle';   // user disliked the long bright crescent (round 9); 'subtle' is a short thin streak, 'none' turns it off
function smearArc(rig, pivot, F, U, a0, a1, r0, r1) {
  if (SMEAR_MODE === 'none') return;
  const subtle = SMEAR_MODE === 'subtle', N = subtle ? 4 : 7, span = subtle ? 0.45 : 1;
  for (let s = 0; s < N; s++) {
    const t0 = s / N * span, t1 = (s + 1) / N * span;
    const A0 = lerp(a1, a0, t0), A1 = lerp(a1, a0, t1);
    const age = t0 / span, col = subtle ? (age < 0.5 ? 31 : 30) : age < 0.3 ? 27 : age < 0.65 ? 26 : 25;
    const ri = subtle ? r1 - 3.2 + age * 1.6 : lerp(r0, r1, 0.35 + 0.65 * age);   // the trail thins as it ages
    const dir = a => V.add(V.mul(F, Math.cos(a)), V.mul(U, Math.sin(a)));
    const p00 = V.mad(pivot, dir(A0), ri), p01 = V.mad(pivot, dir(A0), r1), p10 = V.mad(pivot, dir(A1), ri), p11 = V.mad(pivot, dir(A1), r1);
    rig.tri(p00, p01, p11, col, subtle); rig.tri(p00, p11, p10, col, subtle);
  }
}

// ---------------------------------------------------------------- gait
// One foot over a cycle phase p (0..1): planted for the first `duty` of the cycle, sliding back
// from +stride to -stride at exactly the body's speed (so it stays put on the floor), then
// swinging forward with the heel kicked up behind. Returns [forward, height].
function gaitFoot(B, p) {
  p = ((p % 1) + 1) % 1;
  const A = B.stride, d = B.duty;
  if (p < d) return [A - 2 * A * p / d, 0];
  const u = (p - d) / (1 - d), e = u * u * (3 - 2 * u);
  return [-A + 2 * A * e, B.lift * Math.sin(Math.PI * Math.pow(u, 0.65))];
}
// tiles of travel per walk frame (8 frames a cycle) that keep the planted foot still on the floor
const gaitFrameTiles = (B, scale = 1) => 2 * B.stride * scale / B.duty / 8 / TILE_U;

// ---------------------------------------------------------------- biped skeleton
// Proportions are chunky on purpose (big head and hands) so actions read at ~40 px tall.
function bipedJoints(B, st) {
  const { clip, f } = st;
  let bob = 0, lean = 0, twist = 0;
  const sw0 = B.stance || 0;   // a wider, staggered planted stance for the hero
  let footL = [0.5 + sw0, -B.hipW - sw0, 0], footR = [-0.5 - sw0 * 0.6, B.hipW + sw0, 0];
  let swingArm = 0, sway = 0, hipF = 0;   // swingArm: +1 = right arm forward (left foot forward)
  if (clip === 'idle') { bob = [0, -0.4, -0.6, -0.3][f % 4]; }
  if (clip === 'walk') {
    const g = gaitFoot(B, f / 8), h = gaitFoot(B, f / 8 + 0.5), A = B.stride;
    footL = [g[0], -B.hipW, g[1]]; footR = [h[0], B.hipW, h[1]];
    // a run (duty < 0.5) is lowest at mid-stance and rises in flight; a walk vaults over the
    // planted leg, so it is highest at mid-stance and lowest when both feet are down
    const c = Math.cos(4 * Math.PI * (f / 8 - B.duty / 2)), run = B.duty < 0.5;
    bob = (run ? -c : c) * (B.bob || 0.7) + (run ? 0 : -0.3);
    sway = -Math.cos(2 * Math.PI * (f / 8 - B.duty / 2)) * (B.sway || 0.4);   // hips over the planted foot
    lean = B.runLean || 0.12;
    swingArm = (footL[0] - footR[0]) / (2 * A);
    twist = -swingArm * (B.counter || 0.16);   // shoulders turn against the hips
    hipF = swingArm * 0.9;                     // and the hips turn with the legs
  }
  if (clip === 'go') {   // first step: pushing off the back foot, leaning into the run
    footL = [B.stride * 0.55, -B.hipW, B.lift * 0.8]; footR = [-B.stride * 0.8, B.hipW, 0];
    bob = -0.8; lean = (B.runLean || 0.12) + 0.14; swingArm = 0.7; twist = -0.12; hipF = 0.6;
  }
  if (clip === 'stop') {   // planting the front foot and sitting back onto it
    footL = [B.stride * 0.7, -B.hipW - 0.3, 0]; footR = [-B.stride * 0.45, B.hipW + 0.3, B.lift * 0.25];
    bob = -1.4; lean = -0.04; swingArm = -0.5; twist = 0.08; hipF = -0.4;
  }
  if (clip === 'hit') { lean = -0.28; bob = -0.6; footL = [1.5, -B.hipW, 0]; footR = [-1.5, B.hipW, 0]; }
  if (clip === 'attack' || clip === 'attack2' || clip === 'shoot' || clip === 'cast') {
    const k = st.key, sc = B.stride / 8;
    if (k.tw !== undefined) {   // a posed key: shoulder turn, lean, hip drop and a step in
      twist = k.tw; lean = k.ln; bob = k.bob;
      footL = [k.fl * sc, -B.hipW - 0.5, 0]; footR = [k.fr * sc, B.hipW + 0.5, 0];
      // the front foot is in the air while it steps forward
      if (st.prev && st.prev.fl !== undefined && k.fl > st.prev.fl + 0.8) footL[2] = B.lift * 0.4;
    } else {
      // right shoulder back while the weapon is raised, forward through the strike
      twist = clamp(k.a * 0.2, -0.35, 0.42); lean = clamp(-k.a * 0.06 + 0.08, -0.1, 0.2);
      footL = [3, -B.hipW - 0.5, 0]; footR = [-2.5, B.hipW + 0.5, 0];
      bob = k.hit ? -1.4 : k.a > 1.5 ? 0.4 : -0.6;
    }
    if (clip === 'shoot' || clip === 'cast') { twist = 0.25 * k.a; lean = 0.02; }
  }
  lean += B.hunch || 0;
  if (clip === 'death') { bob = -[0, 2, 4, 5, 5, 5][f] * B.hipH / 18; lean = 0.15; footL = [2, -B.hipW - 1, 0]; footR = [-1, B.hipW + 1, 0]; }
  const pelvis = [0, sway, B.hipH + bob];
  const up = V.rotY([0, 0, 1], lean);
  const chest = V.mad(pelvis, up, B.spine);
  const sideR = V.rotZ([0, 1, 0], twist), fwd = V.rotZ([1, 0, 0], twist);
  const shR = V.add(V.mad(chest, sideR, B.shW), V.mul(up, B.shZ)), shL = V.add(V.mad(chest, sideR, -B.shW), V.mul(up, B.shZ));
  const head = V.add(V.mad(chest, up, B.neck), V.mul(fwd, lean * 3));
  const hipR = V.add(pelvis, [-hipF, B.hipW, 0]), hipL = V.add(pelvis, [hipF, -B.hipW, 0]);
  const ankle = ft => V.add(ft, [0, 0, B.ankle]);
  const legR = ik(hipR, ankle(footR), B.thigh, B.shin, [1, 0, 0.1]), legL = ik(hipL, ankle(footL), B.thigh, B.shin, [1, 0, 0.1]);
  return { pelvis, chest, head, up, fwd, sideR, shR, shL, hipR, hipL, kneeR: legR.joint, kneeL: legL.joint, ankR: legR.end, ankL: legL.end, twist, lean, swingArm };
}
function armTo(J, sh, hand, B, side) {
  // elbows bend back and out
  const r = ik(sh, hand, B.upper, B.fore, V.norm([-1, side * 0.8, -0.3]));
  return { el: r.joint, hand: r.end };
}
function deathTip(rig, B, f, dir = -1, side = 1) {
  // knees buckle, then the body tips over backwards (dir -1) or forwards (+1), twisting onto one
  // side so the fall reads from every camera direction, and settles
  const k = [0, 0.1, 0.4, 0.78, 0.96, 1][f];
  tipRig(rig, [dir * 2, 0, 0], dir * 1.5 * k, side * 0.55 * k, [0, 0, 0.5, 1.5, 2.2, 2.6][f] * B.hipH / 18);
}

// ---------------------------------------------------------------- the hero (knight)
const HERO_B = { hipH: 18, thigh: 9.5, shin: 8.5, ankle: 1.8, spine: 8, shW: 7.0, shZ: 4, neck: 12.5, upper: 6.5, fore: 6, hipW: 3.0, stride: 8, lift: 4.2, stance: 1.6,
  duty: 0.38, bob: 0.9, sway: 0.45, runLean: 0.2, counter: 0.2 };   // the hero's travel speed is a jog
const HERO_GAIT = gaitFrameTiles(HERO_B);
const TEAM = { red: M.CLOTH_RED, blue: M.CLOTH_BLUE };

// Equipment is visual family ids, separate from item stats: many items share one look.
const GEAR_LOOKS = {
  helm: ['none', 'cap', 'great', 'horned', 'barbute', 'crown'],
  chest: ['tunic', 'chain', 'brigandine', 'plate', 'darkplate'],
  weapon: ['sword', 'axe', 'mace', 'flail', 'greatsword'],
  shield: ['none', 'buckler', 'round', 'kite', 'tower'],
};
const heroKey = eq => `${eq.team}.${eq.helm}.${eq.chest}.${eq.weapon}.${eq.shield}`;
// combo 1 = the second swing of a quick pair (a backhand)
function weaponSwing(eq, combo = 0) { return eq.weapon === 'sword' ? (combo ? SWINGS.light2 : SWINGS.light) : (combo ? SWINGS.heavy2 : SWINGS.heavy); }
// how far the weapon's tip is from the swing pivot (smears and reach)
const WEAPON_LEN = { sword: 21, axe: 16, mace: 16, flail: 17, greatsword: 27 };

function heroRig(eq, st) {
  const B = HERO_B, J = bipedJoints(B, st), r = new Rig();
  const team = TEAM[eq.team] || M.CLOTH_RED;
  const plate = eq.chest === 'plate' || eq.chest === 'darkplate', chain = eq.chest === 'chain', brig = eq.chest === 'brigandine';
  const PL = eq.chest === 'darkplate' ? M.DSTEEL : M.PLATE;
  const legM = plate ? PL : M.LEATHER, torsoM = plate ? PL : chain ? M.CHAIN : team;
  const { fwd, sideR, up } = J;
  // a lean body underneath; armor adds its own bulk on top (chain a little, plate the most)
  const bulk = plate ? 1 : brig ? 0.75 : chain ? 0.55 : 0;

  // legs
  for (const [hip, knee, ank, s] of [[J.hipL, J.kneeL, J.ankL, -1], [J.hipR, J.kneeR, J.ankR, 1]]) {
    r.cone(hip, knee, 2.3 + bulk, 2.0 + bulk, plate ? PL : M.CLOTH_DARK);
    r.cone(knee, ank, 1.9 + bulk * 1.0, 1.6 + bulk * 0.8, legM);
    if (plate) { const kc = V.add(knee, [1.4, 0, 0.3]); r.sph(kc, 2.4, PL); }   // poleyn
    r.ell(V.add(ank, [2.0, 0, -0.9]), plate ? [3.9, 2.4, 1.5] : [3.1, 1.6, 1.2], legM);
  }
  // hips, belt and tabard
  r.ell(J.pelvis, [3.4 + bulk, 4.2 + bulk * 1.4, 3.2 + bulk * 0.4], plate ? PL : chain ? M.CHAIN : M.CLOTH_DARK);
  const belt = V.mad(J.pelvis, up, 3.0);
  if (!plate) { r.ell(belt, [3.8 + bulk * 1.4, 4.6 + bulk * 1.6, 1.1], M.LEATHER, frameAlong(fwd, up)); r.sph(V.mad(belt, fwd, 3.8 + bulk * 1.4), 1.0, M.GOLD); }
  if (chain) r.box(V.add(V.mad(J.pelvis, fwd, 4.3), [0, 0, -2.5]), [0.5, 3.0, 5.2], team, frameAlong(fwd, up));
  if (plate) {   // faulds: a pointed front plate and two tassets over the thighs, plus a leather strap
    const fr = frameAlong(V.norm(V.add(fwd, V.mul(up, -0.35))), up);
    r.box(V.add(V.mad(J.pelvis, fwd, 4.4), V.mul(up, -2.2)), [0.6, 2.4, 3.0], PL, fr);
    for (const sd of [-1, 1]) {
      const c = V.add(V.add(V.mad(J.pelvis, fwd, 2.4), V.mul(sideR, sd * 4.2)), V.mul(up, -2.6));
      r.box(c, [2.4, 0.6, 2.8], PL, frameAlong(V.norm(V.add(fwd, V.mul(sideR, sd * 0.2))), V.norm(V.add(up, V.mul(sideR, sd * 0.35)))));
    }
    r.cone(V.add(V.add(V.mad(J.pelvis, fwd, 3.6), V.mul(sideR, -4)), V.mul(up, 1)), V.add(V.add(V.mad(J.pelvis, fwd, 3.2), V.mul(sideR, 2)), V.mul(up, -5.5)), 0.7, 0.7, M.LEATHER);
  }
  // torso
  // torso: a chest that tapers to a narrower waist, so the silhouette has shoulders and a middle
  const tf = frameAlong(fwd, up), abd = V.mad(J.chest, up, -3.6);
  r.ell(abd, [3.2 + bulk * 1.6, 4.0 + bulk * 2.2, 3.4 + bulk * 0.8], plate ? PL : chain ? M.CHAIN : brig ? team : team, tf);
  if (!plate && !chain && !brig) r.cone(V.mad(J.chest, up, 4.5), J.head, 1.4, 1.2, M.SKIN);   // neck
  r.ell(V.mad(J.chest, up, 0.8), [3.8 + bulk * 1.4, 5.0 + bulk * 1.8, 4.6 + bulk * 1.6], torsoM, tf, {
    mf: brig ? (p => {   // brigandine: cloth over plates, rows of gold rivets
      const q = V.sub(p, J.chest), u = V.dot(q, sideR) * 0.62, v = V.dot(q, up) * 0.62;
      return Math.abs(u - Math.round(u)) < 0.22 && Math.abs(v - Math.round(v)) < 0.22 ? M.GOLD : 0;
    }) : chain ? (p => {   // a tabard panel over the mail
      const q = V.sub(p, J.chest);
      return V.dot(q, fwd) > 2.5 && Math.abs(V.dot(q, sideR)) < 3.2 && V.dot(q, up) < 3 ? team : 0;
    }) : plate ? (p => {  // breastplate: a bright center ridge and the seam of the plackart below it
      const q = V.sub(p, J.chest), sd = Math.abs(V.dot(q, sideR)), z = V.dot(q, up), f = V.dot(q, fwd);
      if (f > 2 && sd < 0.55 && z > -2.6) return M.BLADE;
      if (f > 1 && Math.abs(z + 3.4 - sd * 0.55) < 0.5) return M.DARK;   // V-shaped plackart seam
      return 0;
    }) : (p => {   // tunic: a V of skin at the neck
      const q = V.sub(p, J.chest), sd = Math.abs(V.dot(q, sideR)), z = V.dot(q, up);
      return V.dot(q, fwd) > 1.5 && z > 2.6 && sd < (z - 2.6) * 0.9 + 0.6 ? M.SKIN : 0;
    }),
  });
  // arms: right hand holds the weapon, left the shield
  const atk = st.clip === 'attack' || st.clip === 'attack2';
  const sw = atk ? st.key : null, list = atk ? weaponSwing(eq, st.clip === 'attack2' ? 1 : 0) : null;
  const pivot = V.add(V.add(J.chest, V.mul(sideR, 2.5)), V.add(V.mul(up, 4), V.mul(fwd, 1)));
  const tilt = list && list.tilt !== undefined ? list.tilt : 0.65;
  const F = fwd, U = V.norm(V.add(V.mul(up, Math.cos(tilt)), V.mul(sideR, Math.sin(tilt))));
  const inPlane = a => V.norm(V.add(V.mul(F, Math.cos(a)), V.mul(U, Math.sin(a))));
  const bladeA = k => k.a + (k.ck || 0);   // the blade leads or trails the arm
  let handR, bd;
  if (sw) {
    handR = V.mad(pivot, inPlane(sw.a), sw.r || 6.5); bd = inPlane(bladeA(sw));
  } else if (st.clip === 'death') {
    handR = V.add(J.shR, [3, 2, -10]); bd = V.norm([1, 0.4, -0.6]);
  } else {
    // guard: blade held out at the side, point up and forward, so it reads from the front too
    // the sword arm swings a little (the blade is carried), rising slightly as it comes forward
    const s = J.swingArm * 1.8;
    handR = V.add(V.add(J.shR, V.mul(fwd, 4 + s)), V.add(V.mul(up, -8.5 + Math.max(0, J.swingArm) * 1.2), V.mul(sideR, 2.6)));
    bd = V.norm(V.add(V.add(V.mul(fwd, 0.55), V.mul(up, 0.7)), V.mul(sideR, 0.45)));
  }
  const aR = armTo(J, J.shR, handR, B, 1);
  const armM = plate ? PL : chain ? M.CHAIN : M.LEATHER;
  const ar = [1.9 + bulk * 0.8, 1.7 + bulk * 0.8, 1.5 + bulk * 0.7, 1.8 + bulk * 0.8];
  const sleeve = eq.chest === 'tunic' ? team : armM, foreM = eq.chest === 'tunic' ? M.SKIN : armM, handM = plate ? PL : eq.chest === 'tunic' ? M.SKIN : M.LEATHER;
  r.cone(J.shR, aR.el, ar[0], ar[1], sleeve); r.cone(aR.el, aR.hand, ar[1], ar[2], foreM);
  r.sph(aR.hand, ar[3], handM);
  // off hand swings against the sword arm: a free hand pumps (elbow bent, rising forward), a
  // shield only rocks
  const offSw = -J.swingArm * (eq.shield === 'none' ? 3.6 : 1.6);
  let handL = V.add(V.add(J.shL, V.mul(fwd, 5.5 + offSw)), V.add(V.mul(up, -7.5 + Math.max(0, offSw) * (eq.shield === 'none' ? 0.7 : 0.3)), V.mul(sideR, -0.5)));
  if (st.clip === 'death') handL = V.add(J.shL, [2, -3, -9]);
  if (sw) {
    if (list.twoHand && (eq.shield === 'none' || eq.weapon === 'greatsword')) handL = V.mad(handR, bd, -2.6);   // lower on the haft
    else {   // counterbalance: the off arm reaches toward the target in the wind-up, pulls back on the strike
      const lf = 4 + (sw.tw || 0) * 6;
      handL = V.add(V.add(J.shL, V.mul(fwd, lf)), V.add(V.mul(up, eq.shield === 'none' ? -5.5 : -6.5), V.mul(sideR, -1.8)));
    }
  }
  const aL = armTo(J, J.shL, handL, B, -1);
  r.cone(J.shL, aL.el, ar[0], ar[1], sleeve); r.cone(aL.el, aL.hand, ar[1], ar[2], foreM);
  r.sph(aL.hand, ar[3], handM);
  if (plate) for (const a of [aR, aL]) r.sph(a.el, 2.2, PL);   // elbow cops
  // pauldrons: big rounded plates with a bright lower rim and a rivet (plate); pads otherwise
  if (eq.chest !== 'tunic') for (const [sh, sd] of [[J.shL, -1], [J.shR, 1]]) {
    const c = plate ? V.add(V.mad(sh, up, 1.4), V.mul(sideR, sd * 1.2)) : V.mad(sh, up, 1.0);
    r.ell(c, plate ? [5.0, 5.0, 4.4] : [4.2, 4.0, 3.4], plate ? PL : M.LEATHER, frameAlong(fwd, up), { mf: eq.chest === 'darkplate' ? (p => V.dot(V.sub(p, c), up) < -2.6 ? M.MARKB : 0) : null });
    if (plate) r.sph(V.add(V.add(c, V.mul(fwd, 4.4)), V.mul(up, -1)), 0.9, M.STEEL);
  }
  // head
  const hd = J.head;
  const helmF = frameAlong(fwd, up);
  if (eq.helm === 'none' || eq.helm === 'cap') {
    r.ell(hd, [4.2, 4.0, 4.8], M.SKIN, helmF, { mf: p => {
      const q = V.sub(p, hd), f2 = V.dot(q, fwd), s2 = V.dot(q, sideR), z2 = V.dot(q, up);
      if (f2 > 2.6 && Math.abs(Math.abs(s2) - 1.5) < 0.6 && Math.abs(z2 - 1.0) < 0.6) return M.DARK;   // eyes (set high to read from above)
      if (eq.helm === 'none' && (z2 > 1.6 - f2 * 0.15 || f2 < -1.2)) return M.HAIR;
      return 0;
    } });
    if (eq.helm === 'cap') r.ell(V.mad(hd, up, 2.2), [5.0, 4.9, 3.6], M.IRON, helmF);
    if (eq.helm === 'none') r.cone(V.mad(V.mad(hd, up, -1.6), fwd, 3.2), V.mad(V.mad(hd, up, -3.8), fwd, 2.8), 1.3, 0.9, M.HAIR);   // short beard
  } else {
    if (eq.helm === 'barbute') {
      // barbute: close round helm with a T-shaped face opening
      const hc = V.mad(hd, up, 0.4);
      r.ell(hc, [5.4, 5.3, 6.4], M.STEEL, helmF, { mf: p => {
        const q = V.sub(p, hc), f2 = V.dot(q, fwd), s2 = Math.abs(V.dot(q, sideR)), z2 = V.dot(q, up);
        if (f2 < 1.6) return 0;
        return (Math.abs(z2 - 1.8) < 1.1 && s2 < 3.8) || (s2 < 1.2 && z2 < 1.8 && z2 > -3.4) ? M.DARK : 0;   // set high and wide so it reads from above
      } });
      r.box(V.mad(hc, up, 5.8), [4.6, 0.6, 0.9], M.STEEL, helmF);
    } else if (eq.helm === 'great' || eq.helm === 'crown') {
      // great helm: tall dome with a raised crest ridge and a barred visor plate on the front
      const hc = V.mad(hd, up, 0.6);
      r.ell(hc, [5.6, 5.4, 7.2], PL, helmF);
      r.box(V.mad(hc, up, 6.3), [4.4, 0.7, 1.0], PL, helmF);
      const vc = V.add(V.mad(hd, fwd, 4.9), V.mul(up, 0.2));
      const vf = frameAlong(V.norm(V.add(fwd, V.mul(up, 0.45))), up);   // tipped up toward the light so the plate reads bright
      r.box(vc, [1.1, 3.4, 2.5], PL, vf, { bias: 1, mf: p => {
        const q = V.sub(p, vc), s2 = V.dot(q, sideR), z2 = V.dot(q, vf[2]);
        if (V.dot(q, vf[0]) < 0.8 || Math.abs(z2) > 1.8) return 0;
        for (const c of [-1.9, 0, 1.9]) if (Math.abs(s2 - c) < 0.5) return M.DARK;   // three bars, each a full pixel
        return 0;
      } });
      for (const sd of [-1, 1]) r.sph(V.add(V.add(V.mad(hd, fwd, 3.2), V.mul(sideR, sd * 4.4)), V.mul(up, 0.4)), 1.0, M.STEEL);   // visor rivets
      if (eq.helm === 'crown') {   // a gold circlet with points and a red stone
        r.cyl(V.mad(hc, up, 3.2), V.mad(hc, up, 4.6), 5.0, M.GOLD);
        for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, b = V.add(V.mad(hc, up, 4.4), V.add(V.mul(fwd, Math.cos(a) * 4.6), V.mul(sideR, Math.sin(a) * 4.6))); r.cone(b, V.mad(b, up, 2.6), 0.9, 0.2, M.GOLD); }
        r.sph(V.add(V.mad(hc, up, 3.9), V.mul(fwd, 5.1)), 0.8, M.EYE_RED, { noShadow: true });
      }
    } else {
    r.ell(hd, [5.9, 5.7, 6.7], M.STEEL, helmF, { mf: p => {
      const q = V.sub(p, hd), f2 = V.dot(q, fwd), s2 = V.dot(q, sideR), z2 = V.dot(q, up);
      if (Math.abs(z2 - 2.4) < 0.8) return M.GOLD;
      if (f2 > 2.6 && Math.abs(z2 - 0.4) < 0.75 && Math.abs(s2) < 4.2) return M.DARK;            // eye slit
      if (f2 > 3.4 && Math.abs(s2) < 0.6 && z2 < 0 && z2 > -4.5) return M.DARK;                  // breath slit
      return 0;
    } });
    r.box(V.mad(hd, up, 6.4), [3.6, 0.6, 1.0], M.GOLD, helmF);
      for (const s of [-1, 1]) {
        const a = V.add(V.mad(hd, up, 3), V.mul(sideR, s * 5)), b = V.add(V.mad(hd, up, 6), V.mul(sideR, s * 8.5)), c = V.add(V.add(V.mad(hd, up, 10), V.mul(sideR, s * 8.5)), V.mul(fwd, 1.5));
        r.group(() => { r.cone(a, b, 1.6, 1.2, M.HORN); r.cone(b, c, 1.2, 0.5, M.HORN); });
      }
    }
  }
  // shield on the left forearm, face turned outward
  if (eq.shield !== 'none') {
    const n = V.norm(V.add(V.mul(fwd, 0.75), V.mul(sideR, -0.65)));
    const c = V.mad(V.mad(aL.hand, n, 1.6), up, 1.5);
    const ax = [n, V.norm(V.cross(up, n)), up];
    const big = eq.shield === 'kite';
    if (eq.shield === 'tower') {   // tall rectangle: team field, iron rim, gold stripe
      const tc = V.mad(c, up, 0.8);
      r.box(tc, [0.8, 4.4, 8.2], team, ax, { mf: p => { const q = V.sub(p, tc), u = Math.abs(V.dot(q, ax[1])), v = Math.abs(V.dot(q, ax[2])); return u > 3.5 || v > 7.3 ? M.IRON : u < 0.8 ? M.GOLD : 0; } });
    } else if (eq.shield === 'round') {   // wooden round shield, iron rim and boss
      r.ell(c, [1.1, 5.3, 5.3], M.WOOD, ax, { mf: p => { const q = V.sub(p, c), d2 = (V.dot(q, ax[1]) ** 2 + V.dot(q, ax[2]) ** 2) / 28; return d2 > 0.74 || d2 < 0.06 ? M.IRON : 0; } });
    } else {
      const rad = big ? [1.0, 5.0, 7.0] : [1.1, 4.2, 4.2];
      r.ell(c, rad, team, ax, { mf: p => {
        const q = V.sub(p, c), u = V.dot(q, ax[1]) / rad[1], v = V.dot(q, ax[2]) / rad[2];
        if (u * u + v * v > 0.62) return M.GOLD;
        if (big && (Math.abs(u) < 0.14 || Math.abs(v - 0.15) < 0.11)) return M.GOLD;
        if (!big && u * u + v * v < 0.07) return M.IRON;
        return 0;
      } });
    }
  }
  // weapon
  const g = aR.hand;
  const wide = V.norm(V.cross(bd, V.len(V.cross(bd, up)) > 0.3 ? up : fwd));
  const wf = [bd, wide, V.cross(bd, wide)];
  r.cone(V.mad(g, bd, -2.6), V.mad(g, bd, 1.2), 0.9, 0.9, M.LEATHER);
  r.sph(V.mad(g, bd, -3.2), 1.2, M.GOLD);
  if (eq.weapon === 'sword') {
    r.box(V.mad(g, bd, 1.8), [0.7, 3.4, 0.8], M.GOLD, wf);
    r.box(V.mad(g, bd, 11.4), [9.2, 1.15, 0.4], M.BLADE, wf);
    r.cone(V.mad(g, bd, 20.4), V.mad(g, bd, 21.8), 0.9, 0.3, M.BLADE);
  } else if (eq.weapon === 'greatsword') {   // two-handed: long grip, wide guard, long broad blade
    r.box(V.mad(g, bd, 2), [0.8, 4.6, 0.9], M.IRON, wf);
    r.box(V.mad(g, bd, 14.2), [11.6, 1.5, 0.45], M.BLADE, wf);
    r.cone(V.mad(g, bd, 25.6), V.mad(g, bd, 27.4), 1.2, 0.3, M.BLADE);
  } else if (eq.weapon === 'flail') {   // short haft, three chain links, spiked ball
    r.cone(V.mad(g, bd, 1.2), V.mad(g, bd, 7), 0.9, 0.9, M.WOOD);
    const sag = V.norm(V.add(bd, V.mul(up, -0.5)));
    for (let k = 1; k <= 3; k++) r.sph(V.mad(V.mad(g, bd, 7), sag, k * 1.6), 0.6, M.IRON, { noShadow: true });
    const ball = V.mad(V.mad(g, bd, 7), sag, 7.6);
    r.sph(ball, 2.5, M.IRON);
    for (const d of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) r.cone(V.mad(ball, d, 2), V.mad(ball, d, 3.8), 0.7, 0.15, M.IRON, { noShadow: true });
  } else {
    r.cone(V.mad(g, bd, 1.2), V.mad(g, bd, 13), 0.9, 0.9, M.WOOD);
    if (eq.weapon === 'axe') {
      r.box(V.add(V.mad(g, bd, 11.5), V.mul(wide, 3.2)), [2.8, 3.0, 0.5], M.BLADE, wf);
    } else {
      r.sph(V.mad(g, bd, 13.5), 3.0, M.IRON);
      for (const s of [-1, 1]) r.cone(V.mad(g, bd, 13.5), V.add(V.mad(g, bd, 13.5), V.mul(wide, s * 4.2)), 1.2, 0.4, M.IRON);
    }
  }
  if (sw && sw.smear && st.prev) {
    const reach = (sw.r || 6.5) + (WEAPON_LEN[eq.weapon] || 16);
    smearArc(r, pivot, F, U, bladeA(st.prev), bladeA(sw), reach - 9, reach);
  }
  if (st.clip === 'death') deathTip(r, B, st.f, -1);
  return r;
}
