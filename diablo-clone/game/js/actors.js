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
    K(1.1, 45, { smear: true, ck: 0.35, r: 6.2, tw: 0.15, ln: 0.08, bob: -0.6, fl: 3.5, fr: -3.2, mv: 0.05 }),
    K(0.15, 45, { smear: true, ck: 0.1, r: 7.4, tw: -0.2, ln: 0.16, bob: -1.0, fl: 5, fr: -3.2, mv: 0.05 }),
    K(-0.65, 50, { smear: true, hit: true, ck: -0.1, r: 7.4, tw: -0.42, ln: 0.2, bob: -1.6, fl: 5.5, fr: -3.6, mv: 0.04 }),
    K(-1.1, 110, { ck: -0.25, r: 6.2, tw: -0.5, ln: 0.16, bob: -1.4, fl: 5.5, fr: -3.6 }),
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
  // round 40a: the ground slam skill: crouch with the weapon overhead, a hop (hop = how high the body
  // leaves the ground, jump = knees tucked), crash down into a deep squat and hold it, then rise.
  // The blow lands at the same moment as the old overhead chop it replaces
  gslam: withTilt([
    K(1.55, 220, { ck: 0.2, r: 4.5, tw: 0.1, ln: 0.18, bob: -2.4, fl: 3, fr: -3 }),
    K(1.2, 60, { ck: 0.3, r: 4.4, tw: 0, ln: -0.18, bob: 0.6, fl: 3.5, fr: -3, jump: 4, hop: 7, arc: 1 }),   // (round 65: up, the weapon high over the head)
    K(0.35, 60, { smear: true, ck: 0.3, r: 7, tw: 0, ln: 0.24, bob: -0.6, fl: 5, fr: -3.5, jump: 1.2, hop: 3, mv: 0.06, arc: 1 }),   // and down, chopping
    K(-0.45, 60, { smear: true, hit: true, ck: 0, r: 7.4, tw: -0.1, ln: 0.4, bob: -3.4, fl: 6.5, fr: -4.5, mv: 0.03 }),
    K(-0.6, 180, { ck: -0.1, r: 7, tw: -0.1, ln: 0.36, bob: -3.2, fl: 6.5, fr: -4.5 }),
    K(0.6, 120, { ck: 0.3, r: 5.5, tw: 0, ln: 0.1, bob: -1, fl: 4, fr: -3 }),
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
  // sword combo finisher: draws back coiled, then a long lunging thrust held at full stretch
  thrust: withTilt([
    K(0.25, 110, { ck: 0.05, r: 3.6, tw: 0.5, ln: -0.05, bob: -0.8, fl: 2.5, fr: -4 }),
    K(0.1, 45, { smear: true, ck: 0, r: 6, tw: 0.1, ln: 0.15, bob: -1.2, fl: 5, fr: -4, mv: 0.06 }),
    K(0.0, 50, { smear: true, hit: true, ck: 0, r: 8.6, tw: -0.35, ln: 0.3, bob: -2.0, fl: 7, fr: -5, mv: 0.07 }),
    K(0.0, 130, { ck: 0, r: 8.4, tw: -0.4, ln: 0.3, bob: -2.0, fl: 7, fr: -5 }),
    K(0.4, 110, { ck: 0.3, r: 5.5, tw: -0.1, ln: 0.1, bob: -0.8, fl: 4, fr: -3 }),
  ], 0.65),
  // heavy combo finisher: a leap with the weapon raised high, slammed into the ground in a deep
  // crouch (the hit lands all around, with extra shake and dust)
  slam: withTilt([
    K(2.2, 200, { ck: 0.4, r: 4.5, tw: 0.1, ln: -0.15, bob: 2.4, fl: 2, fr: -2, jump: 2.6 }),
    K(1.4, 60, { smear: true, ck: 0.4, r: 6.5, tw: 0, ln: 0.1, bob: 1.6, fl: 4, fr: -3, jump: 1.8, mv: 0.08 }),
    K(0.2, 60, { smear: true, ck: 0.1, r: 7.6, tw: 0, ln: 0.3, bob: -1, fl: 6, fr: -4, mv: 0.06 }),
    K(-0.7, 60, { smear: true, hit: true, slam: true, ck: -0.1, r: 7.4, tw: 0, ln: 0.42, bob: -3.2, fl: 6.5, fr: -4.5 }),
    K(-0.75, 220, { ck: -0.1, r: 7.2, tw: 0, ln: 0.4, bob: -3.2, fl: 6.5, fr: -4.5 }),
    K(0.4, 140, { ck: 0.3, r: 5.5, tw: 0, ln: 0.1, bob: -1, fl: 4, fr: -3 }),
  ], 0.15, { twoHand: true }),
  claw: [{ a: 1.6, ms: 160 }, { a: 0.6, ms: 50, smear: true }, { a: -0.3, ms: 60, hit: true }, { a: -0.5, ms: 140 }, { a: 0, ms: 90 }],
  bite: [{ a: 1, ms: 180 }, { a: 0.3, ms: 60 }, { a: -0.2, ms: 70, hit: true }, { a: -0.1, ms: 160 }, { a: 0.5, ms: 90 }],
  bow: [{ a: 0, ms: 140 }, { a: 1, ms: 260 }, { a: 1, ms: 60, hit: true }, { a: 0.4, ms: 200 }],
  cast: [{ a: 0, ms: 120 }, { a: 1, ms: 220 }, { a: 1.2, ms: 60, hit: true }, { a: 0.5, ms: 200 }],
};
// round 34: monster attacks in three readable beats. A wind-up held long enough to see (tele marks
// the moment a glint shows), a strike that covers ground (mv: tiles moved over that key toward
// where the hero stood when it began; z: a hop in the air), and a recovery where it is open to a
// punishing hit (open: those hits land 30% harder and stagger it).
const MON_SWINGS = {
  // the fallen and its kin: a crouch, a leap with the blade overhead, a stab as it lands
  pounce: [
    K(1.6, 230, { tele: true, tw: 0.35, ln: 0.3, bob: -2.6, fl: 2, fr: -3.5 }),
    K(1.7, 120, { tw: 0.4, ln: 0.34, bob: -2.9, fl: 2, fr: -3.6 }),
    K(1.3, 150, { mv: 1.3, z: 6, tw: 0.1, ln: 0.18, bob: 0.4, fl: 4.5, fr: -1, jump: 2.5 }),
    K(0.2, 60, { hit: true, tw: -0.3, ln: 0.4, bob: -1.8, fl: 5.5, fr: -3 }),
    K(0.1, 300, { open: true, tw: -0.25, ln: 0.32, bob: -2.2, fl: 5.5, fr: -3 }),
    K(0.8, 120, { tw: 0, ln: 0.1, bob: -0.8, fl: 3, fr: -2.5 }),
  ],
  // skeletons: the blade raised high behind the head, a step and a hard chop down, stuck low after
  chop: withTilt([
    K(2.4, 280, { tele: true, ck: 0.3, r: 4.4, tw: 0.4, ln: -0.14, bob: 0.4, fl: 1.5, fr: -3.5 }),
    K(2.5, 130, { ck: 0.35, r: 4.2, tw: 0.45, ln: -0.16, bob: 0.5, fl: 1.5, fr: -3.5 }),
    K(1.0, 55, { smear: true, mv: 0.45, ck: 0.2, r: 6.4, tw: 0.1, ln: 0.12, bob: -0.6, fl: 4, fr: -3 }),
    K(-0.7, 60, { smear: true, hit: true, ck: -0.2, r: 7.2, tw: -0.35, ln: 0.3, bob: -1.8, fl: 5.5, fr: -3.4 }),
    K(-0.85, 330, { open: true, ck: -0.25, r: 7.0, tw: -0.35, ln: 0.3, bob: -1.9, fl: 5.5, fr: -3.4 }),
    K(0.6, 120, { ck: 0.2, r: 5.6, tw: 0, ln: 0.06, bob: -0.6, fl: 3.5, fr: -3 }),
  ], 0.55),
  // hounds and wolves: weight back, a long lunge, the bite, a hop back out of reach
  lunge: [{ a: 1.3, ms: 250, tele: true }, { a: 1.35, ms: 110 }, { a: 0.2, ms: 120, mv: 1.6 }, { a: 0, ms: 60, hit: true }, { a: 0.4, ms: 220, mv: -0.8, open: true }, { a: 0.7, ms: 110 }],
  // spiders: rear up with the front legs raised, then drive down onto the target
  rear: [{ a: 1, ms: 300, tele: true }, { a: 1, ms: 120 }, { a: 0.3, ms: 90, mv: 0.8 }, { a: 0, ms: 60, hit: true }, { a: 0.2, ms: 280, open: true }, { a: 0.6, ms: 100 }],
};
// how far the strike carries a monster (the lunge's reach), so it can start from farther out
const swingReach = sw => sw.reduce((a, k) => a + Math.max(0, k.mv || 0), 0);
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
let SMEAR_MODE = 'taper'; const SPIN_TRAIL = -1;   // (which side the whirlwind's sweep trails on)   // user disliked the long bright crescent (round 9); 'subtle' is a short thin streak, 'none' turns it off
function smearArc(rig, pivot, F, U, a0, a1, r0, r1, cols = null, wide = 6.2) {
  if (SMEAR_MODE === 'none') return;
  const dir = a => V.add(V.mul(F, Math.cos(a)), V.mul(U, Math.sin(a)));
  if (SMEAR_MODE === 'taper') {   // round 72: a slash that tapers: the blade's width where the blade is, thinning to a point behind it, white-hot fading to steel, only its tail dotted
    if (Math.abs(a0 - a1) < 0.3 && !cols) {   // a thrust: no arc to draw, so two speed lines run beside the blade and meet past its point
      const d = dir(a1), pp = dir(a1 + Math.PI / 2), tipP = V.mad(pivot, d, r1 + 3);
      for (const sd of [-1, 1]) { const b0 = V.add(V.mad(pivot, d, r1 * 0.3), V.mul(pp, sd * 2.6)), b1 = V.add(V.mad(pivot, d, r1 * 0.3), V.mul(pp, sd * 1.5)); rig.tri(b0, b1, tipP, sd < 0 ? 32 : 31, sd > 0); }
      return;
    }
    const N = 9;
    for (let s = 0; s < N; s++) {
      const t0 = s / N, t1 = (s + 1) / N, A0 = lerp(a1, a0, t0), A1 = lerp(a1, a0, t1);
      const w = t => wide * Math.pow(1 - t, 1.25), col = (cols || [32, 31, 30])[t0 < 0.3 ? 0 : t0 < 0.62 ? 1 : 2];
      const p00 = V.mad(pivot, dir(A0), r1 - w(t0)), p01 = V.mad(pivot, dir(A0), r1 + 0.3), p10 = V.mad(pivot, dir(A1), r1 - w(t1)), p11 = V.mad(pivot, dir(A1), r1 + 0.3);
      rig.tri(p00, p01, p11, col, t0 >= 0.62); rig.tri(p00, p11, p10, col, t0 >= 0.62);
    }
    return;
  }
  const subtle = SMEAR_MODE === 'subtle', N = subtle ? 5 : 7, span = subtle ? 0.6 : 1;
  for (let s = 0; s < N; s++) {
    const t0 = s / N * span, t1 = (s + 1) / N * span;
    const A0 = lerp(a1, a0, t0), A1 = lerp(a1, a0, t1);
    const age = t0 / span, col = subtle ? (age < 0.4 ? 32 : 31) : age < 0.3 ? 27 : age < 0.65 ? 26 : 25;
    // subtle: a thin line following the blade tip (a wide band read as a forked tip)
    const ri = subtle ? r1 - 1.4 + age * 0.4 : lerp(r0, r1, 0.35 + 0.65 * age);   // the trail thins as it ages
    const p00 = V.mad(pivot, dir(A0), ri), p01 = V.mad(pivot, dir(A0), r1), p10 = V.mad(pivot, dir(A1), ri), p11 = V.mad(pivot, dir(A1), r1);
    const dith = subtle;   // dotted along its whole length: a solid stroke read as a hooked tip
    rig.tri(p00, p01, p11, col, dith); rig.tri(p00, p11, p10, col, dith);
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
  if (clip === 'walk' || (clip === 'drink' && f < 8)) {
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
  if (clip === 'bash') {   // shield bash: driving forward behind the shield, left shoulder leading
    footL = [B.stride * 0.8, -B.hipW - 0.4, 0]; footR = [-B.stride * 0.7, B.hipW + 0.4, B.lift * 0.3];
    bob = -1.6; lean = 0.38; twist = 0.42;
  }
  if (clip === 'channel') {   // casting, 3 frames: gather (weight back, coiled), release (stepping
    // into it, leaning at the target), follow-through; frames 3-5 are the meteor's, reaching skyward
    const ph = f % 3, sky = f >= 3 && f < 6, set = Math.floor(f / 3);
    footL = [B.stride * (ph === 1 ? 0.75 : 0.45), -B.hipW - 0.4, 0]; footR = [-B.stride * 0.5, B.hipW + 0.4, 0];
    if (ph === 0) { bob = sky ? 0.2 : -0.3; lean = sky ? -0.16 : -0.12; twist = 0.5; }
    else if (ph === 1) { bob = -1.3; lean = sky ? 0.02 : 0.16; twist = -0.12; }
    else { bob = -0.8; lean = 0.06; twist = 0.1; }
    if (set === 2) {   // round 43, frames 6-8: the slam (frost): staff up on the toes, then down into a deep crouch driving it into the ground
      footL = [B.stride * 0.55, -B.hipW - 1.2, 0]; footR = [-B.stride * 0.45, B.hipW + 1.2, 0];
      if (ph === 0) { bob = 0.7; lean = -0.14; twist = 0.05; } else if (ph === 1) { bob = -3.2; lean = 0.3; twist = 0; } else { bob = -1.7; lean = 0.14; twist = 0; }
    }
    if (set === 3) {   // frames 9-11: the hurl (fireball): the free hand cocked back by the ear, then thrown with a long step
      if (ph === 0) { bob = -0.2; lean = -0.16; twist = -0.55; footL = [B.stride * 0.3, -B.hipW - 0.4, 0]; }
      else if (ph === 1) { bob = -1.5; lean = 0.24; twist = 0.5; footL = [B.stride * 1.0, -B.hipW - 0.4, 0]; }
      else { bob = -0.9; lean = 0.12; twist = 0.3; footL = [B.stride * 0.85, -B.hipW - 0.4, 0]; }
    }
  }
  if (clip === 'arrive') {   // round 43: Blink's landing: dropped into a crouch, then rising out of it
    footL = [B.stride * 0.5, -B.hipW - 1.4, 0]; footR = [-B.stride * 0.5, B.hipW + 1.4, 0];
    if (f === 0) { bob = -3.0; lean = 0.24; twist = 0; } else { bob = -1.2; lean = 0.08; twist = 0; }
  }
  if (clip === 'storm') {   // round 43: Arcane Storm: floating, feet hanging, staff and free hand raised, rising and sinking a little
    footL = [0.8, -B.hipW + 0.2, 1.6 + (f % 2) * 0.4]; footR = [-0.6, B.hipW - 0.2, 1.1 + ((f + 1) % 2) * 0.4]; bob = 0.6 + [0, 0.5, 0.8, 0.5][f % 4]; lean = -0.1; twist = 0;
  }
  if (clip === 'vault') {   // round 43: the ranger's evasive leap: a crouch, a tucked jump back, a landing that sits into it
    if (f === 0) { footL = [1.2, -B.hipW - 0.3, 0]; footR = [-1.2, B.hipW + 0.3, 0]; bob = -2.4; lean = 0.22; twist = 0.1; }
    else if (f === 1) { footL = [2.6, -B.hipW, B.lift * 1.7]; footR = [0.8, B.hipW, B.lift * 2.0]; bob = 0.4; lean = -0.24; twist = -0.08; }
    else { footL = [B.stride * 0.6, -B.hipW - 0.8, 0]; footR = [-B.stride * 0.6, B.hipW + 0.8, 0]; bob = -2.0; lean = 0.12; twist = 0.05; }
  }
  if (clip === 'toss') {   // round 43: the snare trap thrown underhand: the arm swung back low, then up and out
    if (f === 0) { footL = [B.stride * 0.35, -B.hipW - 0.4, 0]; footR = [-B.stride * 0.5, B.hipW + 0.4, 0]; bob = -1.3; lean = 0.08; twist = 0.45; }
    else { footL = [B.stride * 0.8, -B.hipW - 0.4, 0]; footR = [-B.stride * 0.4, B.hipW + 0.4, 0]; bob = -1.0; lean = 0.16; twist = -0.35; }
  }
  if (clip === 'stop') {   // planting the front foot and sitting back onto it
    footL = [B.stride * 0.7, -B.hipW - 0.3, 0]; footR = [-B.stride * 0.45, B.hipW + 0.3, B.lift * 0.25];
    bob = -1.4; lean = -0.04; swingArm = -0.5; twist = 0.08; hipF = -0.4;
  }
  if (clip === 'hit') { lean = -0.28; bob = -0.6; footL = [1.5, -B.hipW, 0]; footR = [-1.5, B.hipW, 0]; }
  if (atkIndex(clip) >= 0 || clip === 'shoot' || clip === 'cast') {
    const k = st.key, sc = B.stride / 8;
    if (k.tw !== undefined) {   // a posed key: shoulder turn, lean, hip drop and a step in
      twist = k.tw; lean = k.ln; bob = k.bob;
      footL = [k.fl * sc, -B.hipW - 0.5, 0]; footR = [k.fr * sc, B.hipW + 0.5, 0];
      // the front foot is in the air while it steps forward
      if (st.prev && st.prev.fl !== undefined && k.fl > st.prev.fl + 0.8) footL[2] = B.lift * 0.4;
      if (k.jump) { footL[2] += k.jump; footR[2] += k.jump; }   // airborne
    } else {
      // right shoulder back while the weapon is raised, forward through the strike
      twist = clamp(k.a * 0.2, -0.35, 0.42); lean = clamp(-k.a * 0.06 + 0.08, -0.1, 0.2);
      footL = [3, -B.hipW - 0.5, 0]; footR = [-2.5, B.hipW + 0.5, 0];
      bob = k.hit ? -1.4 : k.a > 1.5 ? 0.4 : -0.6;
    }
    if (clip === 'shoot' || clip === 'cast') { if (k.tw === undefined) { twist = 0.25 * k.a; lean = 0.02; } if (st.sky) lean = -0.24; }
  }
  // round 40a: the hero's new poses
  if (clip === 'hit') {   // knocked from where the blow came: 0 front, 1 left, 2 right, 3 behind
    if (f === 1) { lean = -0.12; twist = 0.4; sway = 1.3; bob = -0.8; footL = [0.8, -B.hipW - 1, 0]; footR = [-1, B.hipW + 0.6, 0]; }
    else if (f === 2) { lean = -0.12; twist = -0.4; sway = -1.3; bob = -0.8; footL = [-1, -B.hipW - 0.6, 0]; footR = [0.8, B.hipW + 1, 0]; }
    else if (f === 3) { lean = 0.3; bob = -1.0; twist = 0.1; footL = [2.5, -B.hipW, 0]; footR = [-1, B.hipW, B.lift * 0.3]; }
  }
  if (clip === 'hook') {   // chain hook: 0 wind back, 1 throw (stepping in), 2 haul (braced, sitting back)
    if (f === 0) { twist = 0.5; lean = -0.08; bob = -0.4; footL = [B.stride * 0.3, -B.hipW - 0.5, 0]; footR = [-B.stride * 0.5, B.hipW + 0.5, 0]; }
    else if (f === 1) { twist = -0.35; lean = 0.22; bob = -1.2; footL = [B.stride * 0.85, -B.hipW - 0.5, 0]; footR = [-B.stride * 0.55, B.hipW + 0.5, 0]; }
    else { twist = 0.15; lean = -0.24; bob = -1.8; footL = [B.stride * 0.75, -B.hipW - 1.2, 0]; footR = [-B.stride * 0.6, B.hipW + 1.2, 0]; }
  }
  if (clip === 'spin') {   // whirlwind: low, wide, leaning into the turn, feet shuffling round
    const ph = f % 4;
    footL = [1.5 + (ph === 1 ? 1 : 0), -B.hipW - 1.6, ph === 0 ? B.lift * 0.3 : 0]; footR = [-1.5 - (ph === 3 ? 1 : 0), B.hipW + 1.6, ph === 2 ? B.lift * 0.3 : 0];
    bob = -1.6 + (ph % 2) * 0.3; lean = 0.12; twist = -0.25; sway = ph < 2 ? 0.4 : -0.4;
  }
  if (clip === 'drink') {   // a potion while walking (frames 0-7 follow the stride) or standing (8): head back
    if (f < 8) { lean = -0.06; twist = 0.12; } else { lean = -0.14; bob = 0.2; twist = 0.15; footL = [1, -B.hipW - 0.3, 0]; footR = [-1, B.hipW + 0.3, 0]; }
  }
  if (clip === 'fidget') {   // standing a while: 0-3 shifts its weight, 4-7 rolls its shoulders, 8-11 checks its weapon
    const v = Math.floor(f / 4), ph = f % 4, k = [0, 1, 1, 0.4][ph];
    if (v === 0) { sway = 1.3 * k; bob = -0.6 * k; footL = [0.5 + sw0, -B.hipW - sw0, 0]; footR = [-0.5 - sw0 * 0.6, B.hipW + sw0, k > 0.5 ? B.lift * 0.15 : 0]; }
    else if (v === 1) { twist = [0, 0.3, -0.3, 0][ph]; bob = [0, 0.6, 0.6, 0][ph]; lean = -0.04 * k; }
    else { lean = -0.04 * k; twist = 0.2 * k; bob = -0.2 * k; }
  }
  if (clip === 'pivot') {   // a hard reversal mid-run: the outside foot plants and the body swings over it
    footL = [B.stride * 0.6, -B.hipW - 0.8, 0]; footR = [-B.stride * 0.3, B.hipW + 0.8, B.lift * 0.4];
    bob = -1.6; lean = -0.1; twist = 0.35; swingArm = -0.4; hipF = -0.3;
  }
  if (clip === 'skid') {   // stopping from a full run: both feet braced ahead, sitting back into the slide
    footL = [B.stride * 0.9, -B.hipW - 0.5, 0]; footR = [B.stride * 0.2, B.hipW + 0.6, 0];
    bob = -2.0; lean = -0.2; swingArm = -0.6; twist = 0.1; hipF = -0.5;
  }
  lean += B.hunch || 0;
  if (clip === 'death') {   // round 43: the blow rocks him back, the knees go, then he falls
    bob = -(FEEL_OLD ? [0, 2, 4, 5, 5, 5] : [0.4, 5.5, 6, 5, 5, 5])[f] * B.hipH / 18; lean = FEEL_OLD ? 0.15 : [-0.28, 0.22, 0.18, 0.15, 0.15, 0.15][f];
    footL = FEEL_OLD || f === 0 ? [2, -B.hipW - 1, 0] : [3.5, -B.hipW - 1, 0]; footR = FEEL_OLD || f === 0 ? [-1, B.hipW + 1, 0] : [-4, B.hipW + 1, 0];
  }
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
  const k = (FEEL_OLD ? [0, 0.1, 0.4, 0.78, 0.96, 1] : [0, 0.02, 0.3, 0.76, 0.96, 1])[f];   // round 43: kneeling first, then over
  tipRig(rig, [dir * 2, 0, 0], dir * 1.5 * k, side * 0.55 * k, [0, 0, 0.5, 1.5, 2.2, 2.6][f] * B.hipH / 18);
}

// round 43: secondary motion for a hat tip or a hood point: [back, up, side] offsets that lag
// the body (streaming back while walking and bobbing with the stride, flicking forward on a stop,
// whipping round in a spin, tossed up on a landing)
// round 43: a Burning weapon licks with little flames along its head, a Chilling one is rimed with
// ice crystals; they flicker with the frame so they live while idle too
function enchantGlow(r, eq, g, bd, wide, st, len) {
  const L = len || WEAPON_LEN[eq.weapon] || GEAR_LEN[eq.weapon] || 16, fire = eq.ench === 'fire', k = (st.f || 0) % 2;
  const us = len ? [[0.62, 1], [0.74, -1], [0.86, 1]] : [[0.5, 1], [0.7, -1], [0.9, 1]];   // a staff burns near its head
  for (const [u, s] of us) {
    const p = V.add(V.mad(g, bd, L * u), V.mul(wide, s * 1.6));
    if (fire) r.cone(p, V.add(p, V.add(V.mul([0, 0, 1], 3.4 + k * 1.0), V.mul(wide, s * 0.8))), 1.25, 0.2, M.FIREM, { noShadow: true });
    else r.cone(V.mad(p, wide, -s * 0.6), V.add(V.add(p, V.mul(wide, s * 2.6)), V.mul([0, 0, 1], 0.8)), 1.2, 0.2, M.ICE, { noShadow: true });
  }
}
function headSway(st) {
  const c = st.clip, ph = (st.f || 0) / 8 * Math.PI * 2;
  if (FEEL_OLD) return [0, 0, 0];
  if (c === 'walk') return [1.6 + Math.sin(ph * 2) * 0.5, Math.cos(ph * 2) * 0.7, Math.sin(ph) * 0.6];
  if (c === 'go') return [1.2, 0, 0];
  if (c === 'stop' || c === 'skid') return [-1.4, -0.4, 0];
  if (c === 'spin') return [0.6, 0, [1.8, -1.8, 1.8, -1.8][(st.f || 0) % 4]];
  if (c === 'vault') return [[0, 2, -1.2][st.f || 0], [0, -1.2, 1.4][st.f || 0], 0];
  if (c === 'arrive') return [-1.2, st.f === 0 ? 1.4 : 0.4, 0];
  if (c === 'storm') return [0.3, -0.6 + Math.sin(ph * 2) * 0.4, Math.sin(ph) * 0.8];
  return [0, 0, 0];
}
// chibi heads (round 13): scale every part added since index `from` about the head center
function bigHead(r, from, hd, HK) {
  const sc = q => V.add(hd, V.mul(V.sub(q, hd), HK));
  for (const q of r.p.slice(from)) {
    if (q.c) q.c = sc(q.c); if (q.a) { q.a = sc(q.a); q.b = sc(q.b); q.ra *= HK; q.rb *= HK; }
    if (q.r) q.r *= HK; if (q.rad) q.rad = V.mul(q.rad, HK); if (q.half) q.half = V.mul(q.half, HK);
    if (q.mf) { const f0 = q.mf; q.mf = (p, n) => f0(V.add(hd, V.mul(V.sub(p, hd), 1 / HK)), n); }
  }
}
// ---------------------------------------------------------------- the hero (knight)
// chibi proportions (round 13, the user's style references): short legs and body, the head drawn
// HERO_HK times bigger (about 40% of the height), body parts slimmed by HERO_BK
const HERO_B = { hipH: 11.5, thigh: 6.2, shin: 5.6, ankle: 1.3, spine: 6, shW: 5.4, shZ: 3, neck: 10.5, upper: 4.8, fore: 4.4, hipW: 2.4, stride: 6.4, lift: 4.0, stance: 1.2,
  duty: 0.34, bob: 1.0, sway: 0.35, runLean: 0.18, counter: 0.22 };   // round 15: longer stride, more air, higher knees
const CAPE_M = M.CLOTH_GREEN;   // a green cloak, like the heroes in the references
const HERO_HK = 1.2, HERO_BK = 0.8;   // art A7 (the user): the head drawn 1.2x (was 1.5x, a bobblehead), with everything on it
const HERO_GAIT = gaitFrameTiles(HERO_B);
// in a robe: a lighter, gliding stride (lower knees, less bounce, a shorter flight) so the legs
// don't kick out under the skirt
const MAGE_B = Object.assign({}, HERO_B, { stride: 6.8, lift: 2.4, duty: 0.38, bob: 0.45, sway: 0.22, runLean: 0.12, counter: 0.15 });
const MAGE_GAIT = gaitFrameTiles(MAGE_B);
// round 20b: the hero's legs cycle slower than a perfect foot plant would need (the planted foot
// slides a little; the robe hides most of it): ~3.6 steps/s for the warrior, ~3.3 for the mage,
// where an exact plant gave 5 and 6.8 steps/s and looked like a frantic wiggle
const HERO_STEP = HERO_GAIT / 0.72, MAGE_STEP = MAGE_GAIT / 0.62;
const robed = eq => !!eq.chest && eq.chest.startsWith('robe');
// round a6: the wizard's three robes after the concept sheet (art/concepts/heroes/wizard-robes.png):
// the apprentice's blue with a gold hem and placket; the magus' plum with a cream front panel, a
// teal mantle and gloves (teal has no cloth: WATERM, the nearest blue-green); the archmage's red
// with gold stripes down the front, a navy mantle edged in gold and gold cuffs. Both upper robes
// wear a gold medallion at the belt.
const ROBE_STYLE = {
  robe_blue: { hem: M.GOLD, placket: M.GOLD },
  robe_purple: { panel: M.CLOTH_WHITE, mantle: M.WATERM, cuff: M.WATERM, glove: M.WATERM, medal: M.GOLD },
  robe_red: { hem: M.GOLD, stripes: M.GOLD, mantle: M.CLOTH_NAVY, trim: M.GOLD, cuff: M.GOLD, medal: M.GOLD },
  // round a6b: four more sets (art/concepts/heroes/wizard-upgrades.png). m: the robe's cloth; pw /
  // wk: the front panel's width on the chest / its scale on the skirt; sleeve: sleeves of their own;
  // collar: a collar round the neck (hood: with a hood hanging down the back); buckle: a square one
  robe_way: { m: M.CLOTH_GREEN, collar: M.CLOTH_WHITE, hood: true, cuff: M.CLOTH_WHITE, buckle: M.GOLD },   // the Wayfarer
  robe_frost: { m: M.SLIME_B, panel: M.CLOTH_WHITE, mantle: M.CLOTH_NAVY, trim: M.STEEL, cuff: M.STEEL, medal: M.STEEL },   // the Frost Scholar (pale blue: SLIME_B's ramp, the nearest)
  robe_dusk: { m: M.CLOTH_PURPLE, panel: M.CLOTH_SHADOW, sleeve: M.CLOTH_SHADOW, collar: M.CLOTH_WHITE, medal: M.CLOTH_WHITE },   // the Duskweaver
  robe_sun: { m: M.AUTUMNM, panel: M.CLOTH_WHITE, pw: 2.2, wk: 1.75, stripes: M.GOLD, hem: M.GOLD, sleeve: M.CLOTH_WHITE, mantle: M.AUTUMNM, trim: M.GOLD, cuff: M.GOLD, medal: M.GOLD },   // the Sunwarden (red-orange: the autumn ramp)
};
// round a6b: wizard hats in other colors (the same hat as 'hat', drawn through the conjurer's path)
const HAT_STYLE = { hat_way: { m: M.LEATHER, band: M.CLOTH_GREEN }, hat_frost: { m: M.CLOTH_SHADOW, band: M.STEEL }, hat_dusk: { m: M.CLOTH_PURPLE, band: M.CLOTH_DARK }, hat_sun: { m: M.STRAWM, band: M.GOLD } };
// art A8: four wizard sets from the front-and-back sheet (art/concepts/heroes/wizard-front-back.png).
// hw: a hem band from the robe's lower edge up to hw above the hem's center (not a thin stripe).
// Substitutes: teal = WATERM; navy = CLOTH_NAVY (reads royal blue); charcoal = CLOTH_DARK; taupe = OLDBONE;
// rose pink has no cloth: CLOTH_RED (the red ramp's light end); wine = BLOODY. tz: the mantle's trim reaches higher.
Object.assign(ROBE_STYLE, {
  robe_tide: { m: M.WATERM, collar: M.CLOTH_WHITE, mantle: M.CLOTH_WHITE, cuff: M.CLOTH_NAVY, buckle: M.GOLD },   // the Tidekeeper
  robe_cinder: { m: M.CLOTH_DARK, panel: M.HAIR_O, pw: 0.7, wk: 0.5, hem: M.HAIR_O, hw: 0.3, mantle: M.CLOTH_DARK, trim: M.HAIR_O, tz: -0.2, cuff: M.HAIR_O, buckle: M.PUMPKIN },   // the Cinder Sage
  robe_rune: { m: M.OLDBONE, mantle: M.CLOTH_NAVY, collar: M.CLOTH_NAVY, cuff: M.CLOTH_NAVY, hem: M.CLOTH_NAVY, hw: 1.5, buckle: M.STEEL },   // the Runebinder
  robe_rose: { m: M.CLOTH_WINE, panel: M.CLOTH_WHITE, pw: 1.3, wk: 1.3, hem: M.CLOTH_WHITE, hw: 1.0, mantle: M.BLOODY, collar: M.BLOODY, buckle: M.GOLD },   // the Rose Oracle
});
Object.assign(HAT_STYLE, { hat_tide: { m: M.CLOTH_NAVY, band: M.WATERM }, hat_cinder: { m: M.AUTUMNM, band: M.AUTUMNM }, hat_rune: { m: M.OLDBONE, band: M.CLOTH_NAVY }, hat_rose: { m: M.BLOODY, band: M.CLOTH_WHITE } });
HAT_STYLE.hat_maelis = { m: M.CLOTH_DARK, band: M.HAIR_O };   // round 67: Maelis's tall hat (the user preferred it to the hood), charcoal with the cinder robe's orange band
const TEAM = { red: M.CLOTH_RED, blue: M.CLOTH_BLUE, green: M.CLOTH_GREEN, tan: M.CLOTH_TAN, purple: M.CLOTH_PURPLE, white: M.CLOTH_WHITE };
// townsfolk share the hero's rig: hair color, a beard, or no weapon at all
const HAIRM = { orange: M.HAIR_O, brown: M.HAIR, blond: M.STRAWM, grey: M.CLOTH_WHITE };
// round 71: the face. Eyes with a glint, brows, a mouth, cheeks; a nose and ears as shapes; hair
// showing under a hat or hood. One painter for every open-faced head (heroes and townsfolk).
// o: { line: paint the hairline (bare head), under: hair under a hat/cap/hood, hair: material }
defMat('FLASH', [18], 0, { flat: true, emis: true }); defMat('GLINT', [27], 0, { flat: true }); defMat('CHEEK', [62, 62, 63, 63], 2, { span: 0.45 }); defMat('BROW', [33], 0, { flat: true });
function faceMf(hd, fwd, sideR, up, o = {}) {
  return p => {
    const q = V.sub(p, hd), f2 = V.dot(q, fwd), s2 = V.dot(q, sideR), z2 = V.dot(q, up), as = Math.abs(s2), ex = as - 1.65;
    if (o.line && (z2 > 1.55 + Math.max(0, f2 - 2.5) * 0.2 || f2 < -1.2 || (as > 3.4 && z2 > -0.6))) return o.hair;
    if (o.under && (f2 < -0.9 || (as > 3.35 && z2 > -1.5 && f2 < 1.6) || (z2 > (o.under === 2 ? 1.75 : 2.15) && f2 > -0.9))) return o.hair;
    if (f2 > 2.0 && Math.abs(ex) < 0.62 && z2 > -1.2 && z2 < 0.85) return z2 > 0.1 && (s2 - Math.sign(s2) * 1.65) < -0.12 ? M.GLINT : M.EYE;
    if (f2 > 1.9 && as > 0.9 && as < 2.5 && z2 > 1.12 && z2 < 1.5) return o.brow || M.BROW;
    if (f2 > 3.0 && as < 0.42 && Math.abs(z2 + 2.2) < 0.2) return M.CHEEK;   // a small mouth, one tone under the skin
    return 0;
  };
}
function faceParts(r, hd, fwd, sideR, up, ears) {   // the nose, and ears where nothing covers them
  r.sph(V.add(V.mad(hd, fwd, 4.3), V.mul(up, -0.7)), 0.6, M.FACE, { noShadow: true });
  if (ears) for (const sd of [-1, 1]) r.sph(V.add(V.add(V.mad(hd, sideR, sd * 3.85), V.mul(up, -0.5)), V.mul(fwd, -0.2)), 0.9, M.FACE, { noShadow: true });
}

// Equipment is visual family ids, separate from item stats: many items share one look.
const GEAR_LOOKS = {
  helm: ['none', 'cap', 'great', 'horned', 'barbute', 'crown', 'bascinet'],
  chest: ['tunic', 'chain', 'brigandine', 'plate', 'darkplate', 'gothic'],
  weapon: ['sword', 'axe', 'mace', 'flail', 'greatsword'],
  shield: ['none', 'buckler', 'round', 'kite', 'tower', 'targe', 'heater'],
};
const heroKey = eq => `${eq.team}.${eq.helm}.${eq.chest}.${eq.weapon}.${eq.shield}.${eq.hair || ''}.${eq.beard ? 1 : 0}.${eq.cape || ''}.${eq.lgd || ''}.${eq.set || ''}.${eq.ench || ''}`;
const hasFx = (eq, k) => !!eq.lgd && eq.lgd.split('|').includes(k);
// combo 1 = the second swing of a quick pair (a backhand)
// a quick string of swings: forehand, backhand, then a finisher (sword thrust or heavy slam)
const ATTACK_CLIPS = ['attack', 'attack2', 'attack3', 'attack4'];   // attack4: the ground slam skill's overhead chop
const atkIndex = clip => ATTACK_CLIPS.indexOf(clip);
// Hero swing timing (combat feel pass): the same poses, but the wind-up before the contact key is
// cut so a tap lands its hit at ~0.11 s (sword) / ~0.2 s (two-handers) instead of 0.19 / 0.34 s.
// Enemies keep SWINGS' slower, readable timing. `chain` = ms after which the next swing may start
// (the end of the held follow-through: only the last recovery key is skipped); `free` = ms after
// which moving cancels the swing (the end of the contact key). ?feel=old restores the old timing.
// (the title screen also toggles it, remembered on this device, so the two can be compared on a phone)
let FEEL_OLD = typeof location !== 'undefined' && new URLSearchParams(location.search).get('feel') === 'old';
try { if (localStorage.getItem('dcg-feel') === 'old') FEEL_OLD = true; } catch (e) { /* storage blocked */ }
function setFeelOld(v) { FEEL_OLD = v; try { localStorage.setItem('dcg-feel', v ? 'old' : 'new'); } catch (e) { /* ignore */ } }
// round 62: WEIGHT. The user: attacks a little slower, with more impact and weight. HEAVY (the
// default) winds up ~50% longer and holds the follow-through ~20% longer, each blow hitting 25%
// harder (heroDmg) with a longer freeze, a harder flash, a camera kick and more shove; enemies have
// more health, climbing faster with their level (makeEnemy), and packs run a little bigger.
// LIGHT is the game as it was (OPTIONS: WEIGHT; ?weight=light; storage dcg-weight).
let HEAVY = true;
try { const q = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('weight') : null; HEAVY = q ? q !== 'light' : localStorage.getItem('dcg-weight') !== 'light'; } catch (e) { /* storage blocked */ }
function setHeavy(v) { HEAVY = v; try { localStorage.setItem('dcg-weight', v ? 'heavy' : 'light'); } catch (e) { /* ignore */ } }
const HERO_PRE = { light: [45, 35, 35], light2: [45, 35, 35], thrust: [70, 40], heavy: [110, 45, 45], heavy2: [100, 45, 45], slam: [140, 45, 45], gslam: [100, 150, 55] };   // (round 65: the slam's jump: a crouch, 150 ms rising, 55 ms crashing down)
const HERO_SWINGS = {}, HERO_SWINGS_H = {};
for (const name in HERO_PRE) {
  const sw = SWINGS[name], hi = sw.findIndex(k => k.hit), pre = HERO_PRE[name];
  const keys = sw.map((k, i) => Object.assign({}, k, i < hi ? { ms: pre[i] } : {}));
  let t = 0; for (let i = 0; i <= hi; i++) t += keys[i].ms;
  HERO_SWINGS[name] = withTilt(keys, sw.tilt, { twoHand: sw.twoHand, free: t, chain: t + keys[hi + 1].ms });
  // round 62: the heavy set: the wind-up x1.5, the blow and the follow-through x1.2
  const hk = sw.map((k, i) => Object.assign({}, k, { ms: Math.round((i < hi ? pre[i] * (name === 'gslam' ? 1 : 1.5) : k.ms * 1.2)) }));   // (the slam's jump keeps its own quick timing)
  let th = 0; for (let i = 0; i <= hi; i++) th += hk[i].ms;
  HERO_SWINGS_H[name] = withTilt(hk, sw.tilt, { twoHand: sw.twoHand, free: th, chain: th + hk[hi + 1].ms });
}
// round 33: the ranger's shot, a short draw: nock, draw, loose (the arrow leaves on 'hit'), recover
// round 72: the shot is posed like a swing: nock (square on), full draw (side-on, leaning back, a wide stance),
// the loose (rel: the string hand flies back past the ear, the bow kicks, the string snaps straight), and settling
const BOW_POSE = [{ tw: 0.12, ln: 0.08, bob: -0.6, fl: 2.5, fr: -2.5 }, { tw: 0.55, ln: -0.12, bob: -1.2, fl: 4.5, fr: -4.2 }, { rel: true, tw: 0.62, ln: -0.2, bob: -0.8, fl: 4.5, fr: -4.2 }, { tw: 0.2, ln: 0.02, bob: -0.5, fl: 3.5, fr: -3.2 }];
const RANGER_BOW = [{ a: 0.2, ms: 50 }, { a: 1, ms: 110 }, { a: 1, ms: 40, hit: true }, { a: 0.3, ms: 110 }].map((k, i) => Object.assign(k, BOW_POSE[i]));
const RANGER_BOW_H = [{ a: 0.2, ms: 60 }, { a: 1, ms: 150 }, { a: 1, ms: 45, hit: true }, { a: 0.3, ms: 130 }].map((k, i) => Object.assign(k, BOW_POSE[i]));   // round 62: a fuller draw
const isBow = w => typeof w === 'string' && w.startsWith('bow');
// round 41b: gear looks from outside the hero's body code (the art kit). A helm, chest or weapon
// look id found here is drawn by its function instead of a built-in one; GEAR_SWING picks a
// weapon's swing set ('light' = the sword's, else the heavy chops) and GEAR_LEN its reach
// round 43: armor sets (items.js SETS) get a look of their own once two pieces are worn: the
// Warden a white tabard with a gold cross, a white cloak and a plume; the Scout a green cloak and
// a red feather; the Stalker a black cloak and a red scarf over the face; the Magus a glowing
// arcane gem at the collar and a star at the hat's tip
const SET_CAPE = { warden: { m: M.CLOTH_WHITE, hem: M.GOLD, len: 11 }, ranger: { m: M.CLOTH_GREEN, hem: M.LEATHER, len: 10 }, stalker: { m: M.CLOTH_DARK, hem: M.CLOTH_RED, len: 11.5 } };
function setChest(r, eq, J, fwd, up, sideR) {
  if (eq.set === 'warden') {
    const c = V.add(V.mad(J.chest, up, -1.6), V.mul(fwd, 4.8)), ax = [fwd, sideR, up];
    r.box(c, [0.6, 3.4, 6.4], M.CLOTH_WHITE, ax, { mf: p => { const q = V.sub(p, c), u = Math.abs(V.dot(q, sideR)), v = V.dot(q, up); return (u < 0.45 && v > -2.6 && v < 3.6) || (Math.abs(v - 1.6) < 0.45 && u < 1.9) ? M.GOLD : v < -5.6 ? M.GOLD : 0; } });
  }
  if (hasFx(eq, 'magi')) {   // round 43: Mantle of the Magi: woven from starlight: stars glinting down the robe's front, an arcane clasp
    for (const [z, sd] of [[2.6, 0], [-1.5, -1.8], [-4.5, 1.6], [-8, -0.6], [-11, 2.4]]) r.sph(V.add(V.add(V.mad(J.chest, up, z), V.mul(fwd, 4.4 - z * 0.12)), V.mul(sideR, sd)), 0.85, M.ARCANE, { noShadow: true });
  }
  if (hasFx(eq, 'fang')) {   // Wolfhide: a fur collar and a string of wolf teeth
    const c = V.add(V.mad(J.chest, up, 3.6), V.mul(fwd, 0.3));
    r.ell(c, [5.0, 6.8, 2.8], M.FUR, frameAlong(fwd, up));
    for (const s of [-1.6, 0, 1.6]) { const t = V.add(V.add(V.mad(J.chest, up, 2.4 - Math.abs(s) * 0.3), V.mul(fwd, 4)), V.mul(sideR, s)); r.cone(V.mad(t, fwd, 1), V.add(V.mad(t, up, -2.6), V.mul(fwd, 1.4)), 0.95, 0.2, M.BONE, { noShadow: true }); }
  }
  if (eq.set === 'magus') { const c = V.add(V.mad(J.chest, up, 3.2), V.mul(fwd, 3.4)); r.sph(V.mad(c, fwd, 0.6), 1.9, M.ARCANE, { noShadow: true }); r.cyl(V.mad(c, fwd, -0.4), V.mad(c, fwd, 0.2), 2.8, M.GOLD); }
}
// the ranger's five jerkins (a6, from the concept sheet): body, sleeves, how far the skirt or coat
// tails hang below the waist, and what each wears over it
const JERKIN = {
  jerkin: { m: M.LEATHER, sleeve: M.CLOTH_GREEN, skirt: 2.4 },          // tan leather vest over a green shirt
  jerkin_stud: { m: M.BARK, sleeve: M.OGRE, skirt: 2.4 },               // dark leather, silver studs, a shoulder pad, olive sleeves
  jerkin_hide: { m: M.HIDE, sleeve: M.HIDE, skirt: 4.4 },               // a slate long coat: fur collar, strap, tails to mid-thigh
  jerkin_scale: { m: M.CLOTH_GREEN, sleeve: M.STRAWM, skirt: 2.4 },     // green with gold scale bands, ochre sleeves, a round pad
  jerkin_drake: { m: M.BLOODY, sleeve: M.CLOTH_SHADOW, skirt: 2.8 },    // maroon under a short mantle, grey sleeves, a green sash
  // a6 upgrades (ranger-upgrades concept): four sets, each armor with its own bow
  jerkin_bramble: { m: M.CLOTH_TAN, sleeve: M.CLOTH_TAN, skirt: 2.4 },  // Bramble Scout: tan tunic and strap under a green hooded mantle
  jerkin_ashwood: { m: M.AUTUMNM, sleeve: M.CLOTH_SHADOW, skirt: 2.2 }, // Ashwood Hunter: russet studded vest, cream fur collar, dark grey sleeves
  jerkin_night: { m: M.CLOTH_NAVY, sleeve: M.CLOTH_NAVY, fore: M.IRON, skirt: 4.4 },   // Night Tracker: navy coat, slate cowl, steel cuffs
  jerkin_thorn: { m: M.CLOTH_GREEN, sleeve: M.CLOTH_GREEN, skirt: 2.0, skirtM: M.CLOTH_WHITE },   // Thorn Sentinel: cream leaf plate on green, leaf tassets, greaves
  // a8 (ranger-front-back concept): four more sets, front and back. mf paints the torso (s signed, z up, f forward
  // from the chest), skirtMf the skirt (s = |side|, along = down from the belt, f = forward), legs/boots recolor them
  jerkin_marsh: { m: M.PINE, sleeve: M.CLOTH_GREEN, skirt: 2.4, mf: (s, z) => Math.abs(s - z * 0.85 + 0.6) < 0.9 ? M.LEATHER : 0 },   // Marsh Runner: teal-green tunic and strap under a brown hooded capelet
  jerkin_frost: { m: M.CHAIN, sleeve: M.CHAIN, fore: M.CHAIN, skirt: 4.6, coat: true, cuff: M.CLOTH_WHITE, legs: M.CLOTH_SHADOW,   // Frostpath Stalker: pale blue double-breasted coat, fur collar and cuffs
    mf: (s, z, f) => f > 1.5 && Math.abs(s + 1.15) < 0.32 && z < 3.2 ? M.SLATE : 0 },   // the overlap's edge (silver buttons drawn on top)
  jerkin_dune: { m: M.STRAWM, sleeve: M.AUTUMNM, skirt: 2.2,   // Dune Strider: tan padded vest over rust sleeves, a rust scarf
    mf: (s, z, f) => Math.abs((z + 20.6) / 2.1 % 1 - 0.5) > 0.4 ? M.PLANK : 0, skirtMf: (s, along) => Math.abs(along - 1.6) < 0.45 ? M.PLANK : undefined },   // quilted rows
  jerkin_warden: { m: M.CLOTH_SHADOW, sleeve: M.CLOTH_SHADOW, skirt: 4.2, cuff: M.IRON, cuffAt: [-2.4, -0.9, 0.45, 0.6], legs: M.CLOTH_DARK, boots: M.CLOTH_DARK,   // Blackthorn Warden: near-black coat, violet tabard front and back
    mf: (s, z, f) => f > 1.2 && Math.abs(s) < 1.55 && z < 2.8 ? M.CLOTH_PURPLE : 0, skirtMf: (s, along, f) => s < 1.7 + along * 0.08 ? M.CLOTH_PURPLE : undefined },   // the tabard, down to the knees
};
// the upgrade bows: limb material, half-length, grip, tip caps, how far the tips curl forward (a recurve)
const BOWX = { bow_ash: { m: M.PLANK, L: 8.6 }, bow_iron: { m: M.BARK, L: 14, cap: M.BONE }, bow_recurve: { m: M.BONE, L: 11, grip: M.CLOTH_GREEN, curl: 2.4 } };
// a8: Swampwood Bow, Silverlimb Recurve, Blackthorn Longbow (bands: steel rings round the limbs)
Object.assign(BOWX, { bow_swamp: { m: M.HAIR, L: 10, grip: M.CLOTH_GREEN, cap: M.GOLD, curl: 1.2 }, bow_silver: { m: M.WAX, L: 11.5, grip: M.CLOTH_BLUE, cap: M.STEEL, curl: 2.6 },
  bow_thorn: { m: M.CHITIN, L: 14.5, grip: M.CLOTH_PURPLE, cap: M.STEEL, bands: M.STEEL } });
// the crossbows (a6 steel, a8 Bronze Arbalest): stock, prod, fittings
const XBOW = { bow_cross: { stock: M.WOOD, prod: M.STEEL }, bow_arbalest: { stock: M.WOOD, prod: M.BRONZE, fit: M.GOLD } };
// the parts a jerkin adds over the torso (built before the body is slimmed, like the torso)
function jerkinChest(r, eq, J, fwd, up, sideR) {
  const K = JERKIN[eq.chest] || JERKIN.jerkin, k = eq.chest, B = HERO_B;
  const C = V.mad(J.chest, up, 0.8), R = [(3.8 + 0.42) * HERO_BK, (5.0 + 0.54) * HERO_BK, (4.6 + 0.48) * HERO_BK];   // the torso as drawn
  const onT = (s, z, back) => { const t = 1 - (s / R[1]) ** 2 - (z / R[2]) ** 2, f = R[0] * Math.sqrt(Math.max(0, t)) * (back ? -1 : 1); return V.add(V.add(V.mad(C, fwd, f), V.mul(sideR, s)), V.mul(up, z)); };
  // the skirt (or the coat's tails): a flared cone from under the belt toward the knees, so it follows the stride
  const top = V.mad(J.pelvis, up, 1.6), kneeMid = V.mul(V.add(J.kneeL, J.kneeR), 0.5);
  const dn = V.norm(V.sub(kneeMid, top)), bot = V.mad(top, dn, K.skirt + 1.6);
  const coat = k === 'jerkin_hide' || k === 'jerkin_night' || !!K.coat;
  r.cone(top, bot, 4.2, coat ? 5.0 : 4.8, K.skirtM || K.m, { mf: p => {
    const q = V.sub(p, top), s = Math.abs(V.dot(q, sideR)), along = V.dot(q, dn);
    if (K.skirtMf) { const v = K.skirtMf(s, along, V.dot(q, fwd)); if (v !== undefined) return v; }   // a8
    if (s < 0.45 && along > (coat ? 1.2 : 2.0)) return M.DARK;   // the split, front and back
    if (k === 'jerkin_scale' && Math.abs(along - 2.4) < 0.5) return M.GOLD;
    return 0;
  } });
  if (k === 'jerkin_ashwood') {   // silver studs in a 2x2 block on the vest, a cream fur collar
    for (const [s, z] of [[-1.6, 1.4], [1.6, 1.4], [-1.6, -1.2], [1.6, -1.2]]) r.sph(V.mad(onT(s, z), fwd, -0.3), 1.5, M.STEEL, { noShadow: true });
    r.ell(V.add(V.mad(J.chest, up, 3.8), V.mul(fwd, 0.4)), [4.4, 5.6, 2.1], M.CLOTH_WHITE, frameAlong(fwd, up));
  }
  if (k === 'jerkin_bramble') {   // the hooded mantle: a green capelet over the shoulders, the hood bunched behind the neck, a gold clasp
    r.group(() => {
      r.ell(V.add(V.mad(J.chest, up, B.shZ - 0.8), V.mul(fwd, 0.3)), [5.2, 8.6, 4.4], M.CLOTH_GREEN, frameAlong(fwd, up));
      r.box(V.add(V.mad(J.chest, up, 0.2), V.mul(fwd, -3.7)), [0.7, 5.0, 3.6], M.CLOTH_GREEN, frameAlong(fwd, up));
    });
    r.ell(V.add(V.mad(J.chest, up, 5.2), V.mul(fwd, -3.0)), [2.4, 4.2, 2.2], M.CLOTH_GREEN, frameAlong(fwd, up));
    r.sph(V.add(V.mad(J.chest, up, B.shZ + 0.4), V.mul(fwd, 3.9)), 1.25, M.GOLD, { noShadow: true });
  }
  if (k === 'jerkin_night') r.ell(V.add(V.mad(J.chest, up, 4.0), V.mul(fwd, 0.5)), [4.8, 6.0, 2.6], M.HIDE, frameAlong(fwd, up));   // the slate cowl
  if (k === 'jerkin_thorn') {   // a cream plate on the chest edged in leather, green leaf pauldrons, a leaf tasset in front, greaves
    const pc = V.add(V.mad(J.chest, up, 0.4), V.mul(fwd, 1.0));
    r.ell(pc, [4.0, 4.6, 4.6], M.CLOTH_WHITE, frameAlong(fwd, up), { mf: p => { const q = V.sub(p, pc); return Math.abs(V.dot(q, sideR)) > 3.0 || V.dot(q, up) < -3.0 ? M.LEATHER : 0; } });
    for (const [sh, sd] of [[J.shL, -1], [J.shR, 1]]) { const c = V.add(V.mad(sh, up, 1.0), V.mul(sideR, sd * 0.6)); r.ell(c, [3.8, 3.4, 2.6], M.CLOTH_GREEN, frameAlong(fwd, up), { mf: p => V.dot(V.sub(p, c), up) < -1.2 ? M.LEATHER : 0 }); }
    r.ell(V.add(V.mad(J.pelvis, up, -1.4), V.mul(fwd, 4.4)), [0.9, 2.6, 4.2], M.CLOTH_GREEN, frameAlong(fwd, up));
    for (const [kn, an] of [[J.kneeL, J.ankL], [J.kneeR, J.ankR]]) r.cone(V.mad(kn, up, -0.6), V.mad(an, up, 1.4), 2.7, 2.4, M.AUTUMNM);
  }
  if (k === 'jerkin_stud') {   // silver studs in two columns down the chest, one up the back, and a pad on the right shoulder
    for (const [s, z] of [[-1.7, 1.8], [1.7, 1.8], [-1.7, -1.0], [1.7, -1.0]]) r.sph(V.mad(onT(s, z), fwd, -0.3), 1.5, M.STEEL, { noShadow: true });
    for (const z of [1.8, -1.0]) r.sph(V.mad(onT(-1.8, z, true), fwd, 0.3), 1.5, M.STEEL, { noShadow: true });
    r.ell(V.add(V.mad(J.shR, up, 0.9), V.mul(sideR, 0.4)), [3.4, 3.0, 2.4], M.LEATHER, frameAlong(fwd, up));
  }
  if (k === 'jerkin_scale') r.sph(V.add(V.mad(J.shR, up, 0.8), V.mul(sideR, 0.3)), 3.1, M.LEATHER);   // the round shoulder pad
  if (coat) r.ell(V.add(V.mad(J.chest, up, 3.8), V.mul(fwd, 0.6)), [4.6, 5.8, 2.3], M.CLOTH_WHITE, frameAlong(fwd, up));   // the fur collar
  if (k === 'jerkin_drake') {   // a short mantle over the shoulders, and a green sash with its end hanging at the left hip
    r.ell(V.mad(J.chest, up, B.shZ - 0.4), [5.0, 8.6, 3.4], M.MARK, frameAlong(fwd, up));
    const belt = V.mad(J.pelvis, up, 3.0);
    r.ell(belt, [4.3, 5.1, 1.4], M.CLOTH_GREEN, frameAlong(fwd, up));
    const a = V.add(V.mad(belt, fwd, 3.9), V.mul(sideR, -2.0));
    r.box(V.add(V.mad(a, up, -3.0), V.mul(fwd, 0.6)), [0.7, 1.4, 3.0], M.CLOTH_GREEN, frameAlong(fwd, up));
  }
  jerkinChestA8(r, K, k, J, fwd, up, sideR, onT);
}
// a8 (ranger-front-back concept): the four front/back sets' capelets, scarf, buttons, belts, pouches and leg wraps
function jerkinChestA8(r, K, k, J, fwd, up, sideR, onT) {
  const B = HERO_B, tf = frameAlong(fwd, up), legs = [[J.hipL, J.kneeL, J.ankL], [J.hipR, J.kneeR, J.ankR]];
  if (K.legs || K.boots) for (const [hip, knee, ank] of legs) {   // trousers and boots of another color, just over the plain ones
    if (K.legs) r.cone(hip, knee, 2.75, 2.45, K.legs);
    if (K.boots) { r.cone(knee, ank, 2.35, 2.0, K.boots); r.ell(V.add(ank, [2.0, 0, -0.9]), [4.15, 2.35, 1.75], K.boots); }
  }
  const capelet = m => {   // a hooded capelet over the shoulders, the hood bunched behind the neck
    r.group(() => {
      r.ell(V.add(V.mad(J.chest, up, B.shZ - 0.3), V.mul(fwd, 0.2)), [5.3, 9.4, 3.3], m, tf);   // over the shoulders, the tunic showing below
      r.box(V.add(V.mad(J.chest, up, 0.9), V.mul(fwd, -3.7)), [0.7, 5.6, 3.0], m, tf);
    });
    r.ell(V.add(V.mad(J.chest, up, 5.2), V.mul(fwd, -3.0)), [2.4, 4.2, 2.2], m, tf);
  };
  if (k === 'jerkin_marsh') {   // a brown capelet with a round gold clasp; cream wraps on the shins
    capelet(M.BARK);
    const cc = V.add(V.mad(J.chest, up, B.shZ + 0.3), V.mul(fwd, 3.8));
    r.cyl(cc, V.mad(cc, fwd, 0.7), 1.6, M.GOLD);
    for (const [, knee, ank] of legs) for (const [t0, t1] of [[0.2, 0.33], [0.62, 0.75]]) {   // two narrow bands, just over the shin (2.2 -> 1.84)
      const a = V.add(knee, V.mul(V.sub(ank, knee), t0)), b = V.add(knee, V.mul(V.sub(ank, knee), t1));
      r.cone(a, b, 2.4 - t0 * 0.36, 2.4 - t1 * 0.36, M.CLOTH_WHITE);
    }
    r.box(V.mad(V.mad(J.pelvis, up, 3.0), fwd, 4.4), [0.6, 1.5, 1.2], M.STEEL, tf);   // a steel buckle over the plain gold one
  }
  if (k === 'jerkin_frost') {   // silver buttons in two columns, a steel pad on the right shoulder
    for (const z of [0.4, -1.5, -3.4]) for (const s of [-1.25, 1.25]) r.sph(V.mad(onT(s, z), fwd, -0.2), 1.4, M.STEEL, { noShadow: true });
    r.sph(V.add(V.mad(J.shR, up, 0.8), V.mul(sideR, 0.3)), 3.1, M.SLATE);
  }
  if (k === 'jerkin_dune') {   // a rust scarf wound round the neck, its tail down the back; leather pouches at the belt
    r.ell(V.add(V.mad(J.chest, up, 4.0), V.mul(fwd, 0.5)), [4.9, 6.1, 2.7], M.MARK, tf);
    r.box(V.add(V.add(V.mad(J.chest, up, 1.4), V.mul(fwd, -4.0)), V.mul(sideR, 2.0)), [0.7, 1.5, 2.8], M.MARK, tf);
    for (const [f, s] of [[3.0, -3.4], [-3.2, 3.0]]) {
      const pc = V.add(V.add(V.mad(J.pelvis, up, 0.6), V.mul(fwd, f)), V.mul(sideR, s));
      r.box(pc, [1.4, 1.7, 1.8], M.LEATHER, tf);
      r.sph(V.add(V.mad(pc, up, 0.9), V.mul(fwd, Math.sign(f) * 1.4)), 0.95, M.GOLD, { noShadow: true });
    }
  }
  if (k === 'jerkin_warden') {   // a green capelet with a steel brooch, a grey belt with a steel buckle
    capelet(M.CLOTH_GREEN);
    r.sph(V.add(V.mad(J.chest, up, B.shZ + 0.3), V.mul(fwd, 3.9)), 1.3, M.STEEL, { noShadow: true });
    const belt = V.mad(J.pelvis, up, 3.0);
    r.ell(belt, [4.35, 5.2, 1.2], M.IRON, tf);
    r.box(V.mad(belt, fwd, 4.5), [0.6, 1.5, 1.3], M.STEEL, tf);
  }
}
function setHead(r, eq, hd, fwd, up, sideR, helmF) {
  if (eq.set === 'warden') {   // a white plume streaming back from the crest
    const a = V.add(V.mad(hd, up, 5.6), V.mul(fwd, 0.5)), b = V.add(V.mad(hd, up, 8.2), V.mul(fwd, -3.2)), c = V.add(V.mad(hd, up, 6.2), V.mul(fwd, -7));
    r.group(() => { r.cone(a, b, 1.6, 1.4, M.CLOTH_WHITE, { noShadow: true }); r.cone(b, c, 1.4, 0.5, M.CLOTH_WHITE, { noShadow: true }); });
  }
  if (eq.set === 'ranger') { const a = V.add(V.mad(hd, up, 3.4), V.mul(sideR, -4.0)), b = V.add(V.add(V.mad(hd, up, 8.5), V.mul(sideR, -5.2)), V.mul(fwd, -3)); r.cone(a, b, 1.1, 0.4, M.CLOTH_RED, { noShadow: true }); }
  if (eq.set === 'stalker') r.ell(V.add(V.mad(hd, up, -2.0), V.mul(fwd, 1.6)), [3.0, 4.1, 1.9], M.CLOTH_RED, helmF);
  if (hasFx(eq, 'seer') && eq.helm === 'hat') { const e = V.add(V.mad(hd, up, 5.4), V.mul(fwd, 4.4)); r.ell(e, [0.6, 1.8, 1.1], M.CLOTH_WHITE, frameAlong(fwd, up)); r.sph(V.mad(e, fwd, 0.5), 0.9, M.ARCANE, { noShadow: true }); }   // Seer's Peak: an open eye on the hat
  if (eq.set === 'magus' && eq.helm === 'hat') r.sph(V.add(V.mad(hd, up, 10.8), V.mul(fwd, -3.9)), 1.3, M.GOLD, { noShadow: true });
}
// round a6b: the new staves' heads (the shaft is drawn first, to 18 along bd from the grip g)
const STAFF_SHAFT = { staff_frost: M.IRON, staff_moon: M.CLOTH_DARK };
const gemOn = (r, a, bd, lo, hi, w, mLo, mHi) => r.group(() => { r.cone(V.mad(a, bd, lo), V.mad(a, bd, (lo + hi) / 2), 0.4, w, mLo, { noShadow: true }); r.cone(V.mad(a, bd, (lo + hi) / 2), V.mad(a, bd, hi), w, 0.3, mHi, { noShadow: true }); });
const STAFF_HEAD = {
  staff_amber: (r, g, bd, wide) => {   // Amberwood: the shaft bound in leather near the top, an amber gem set on its end
    for (const z of [13.6, 15.4]) r.cyl(V.mad(g, bd, z), V.mad(g, bd, z + 1.0), 1.4, M.CLOTH_TAN);
    r.cyl(V.mad(g, bd, 17.4), V.mad(g, bd, 18.4), 1.5, M.LEATHER);
    gemOn(r, g, bd, 18.2, 23.4, 2.0, M.PUMPKIN, M.FIREM);
  },
  staff_frost: (r, g, bd, wide) => {   // Frostglass: a silver claw holding an ice-blue crystal
    const wf2 = V.norm(V.cross(bd, wide));
    r.cyl(V.mad(g, bd, 16.6), V.mad(g, bd, 17.8), 1.5, M.STEEL);
    for (const v of [wide, V.mul(wide, -1), wf2, V.mul(wf2, -1)]) r.cone(V.mad(g, bd, 17.2), V.add(V.mad(g, bd, 20.6), V.mul(v, 2.3)), 0.8, 0.45, M.STEEL);
    gemOn(r, g, bd, 18.6, 25.6, 2.2, M.WATERM, M.ICE);
  },
  staff_moon: (r, g, bd, wide) => {   // Moonstone: a cream crescent cradling a violet gem
    r.cyl(V.mad(g, bd, 16.8), V.mad(g, bd, 18), 1.4, M.BONE);
    const c = V.mad(g, bd, 21.6);
    for (let k = 0; k < 6; k++) { const a0 = 0.5 + k * 0.62, a1 = a0 + 0.62, p = a => V.add(V.mad(c, bd, -Math.cos(a) * 3.2), V.mul(wide, Math.sin(a) * 3.2)); r.cone(p(a0), p(a1), 0.95 - Math.abs(k - 2.5) * 0.08, 0.95 - Math.abs(k + 1 - 2.5) * 0.08, M.BONE); }
    r.sph(c, 1.6, M.MAGIC, { noShadow: true });
  },
  staff_sun: (r, g, bd, wide) => {   // Sunstone: gold fittings, a gold diamond frame round an orange-red gem
    r.cyl(V.mad(g, bd, 14.6), V.mad(g, bd, 15.6), 1.4, M.GOLD); r.cyl(V.mad(g, bd, 17), V.mad(g, bd, 18.2), 1.5, M.GOLD);
    const c = V.mad(g, bd, 22), pts = [V.mad(c, bd, -4), V.mad(c, wide, 3.6), V.mad(c, bd, 4), V.mad(c, wide, -3.6)];
    r.group(() => { for (let k = 0; k < 4; k++) r.cone(pts[k], pts[(k + 1) % 4], 0.9, 0.9, M.GOLD); });
    r.sph(c, 1.9, M.EYE_RED, { noShadow: true });
  },
};
// art A8: the four staves of the front-and-back sheet. STAFF_SPAN: a shorter shaft [from, to] along
// bd from the grip, and where an enchantment burns (the wand)
Object.assign(STAFF_SHAFT, { staff_pearl: M.BARK, staff_cage: M.CLOTH_DARK, staff_runestone: M.BARK, staff_rose: M.GOLD });
const STAFF_SPAN = { staff_rose: [-3.5, 8, 11] };
Object.assign(STAFF_HEAD, {
  staff_pearl: (r, g, bd, wide) => {   // Pearlwood: a silver fork holding a teal-green pearl
    r.cyl(V.mad(g, bd, 16.4), V.mad(g, bd, 17.6), 1.5, M.STEEL);
    r.group(() => { for (const sd of [-1, 1]) { const a = V.mad(g, bd, 17.4), b = V.add(V.mad(g, bd, 19.2), V.mul(wide, sd * 2.6)); r.cone(a, b, 0.95, 0.9, M.STEEL); r.cone(b, V.add(V.mad(g, bd, 22.4), V.mul(wide, sd * 2.4)), 0.9, 0.6, M.STEEL); } });
    r.sph(V.mad(g, bd, 20.6), 1.9, M.FUNGUS, { noShadow: true });
  },
  staff_cage: (r, g, bd, wide) => {   // Cinder Cage: a gold hexagon round an amber gem
    r.cyl(V.mad(g, bd, 16.2), V.mad(g, bd, 17.4), 1.5, M.GOLD);
    const c = V.mad(g, bd, 21.2), p = k => V.add(V.mad(c, bd, -Math.cos(k * Math.PI / 3) * 3.4), V.mul(wide, Math.sin(k * Math.PI / 3) * 3.4));
    r.group(() => { for (let k = 0; k < 6; k++) r.cone(p(k), p(k + 1), 0.9, 0.9, M.GOLD); });
    gemOn(r, c, bd, -2.2, 2.2, 1.6, M.PUMPKIN, M.FIREM);
  },
  staff_runestone: (r, g, bd, wide) => {   // Runestone: a grey stone block on the shaft's end, a cyan rune glowing on its faces
    const wf2 = V.norm(V.cross(bd, wide)), c = V.mad(g, bd, 20.4), h = [2.6, 2.3, 2.3];
    r.cyl(V.mad(g, bd, 16.6), V.mad(g, bd, 17.8), 1.4, M.IRON);
    r.box(c, h, M.ROCK, [bd, wide, wf2], { mf: p => {
      const q = V.sub(p, c), v = V.dot(q, bd), a = V.dot(q, wide), b = V.dot(q, wf2);
      const u = Math.abs(a) > h[1] - 0.4 ? b : Math.abs(b) > h[2] - 0.4 ? a : null;
      if (u === null || Math.abs(v) > 1.7) return 0;
      if (v < 0.1) return Math.abs(u) < 0.45 ? M.ICE : 0;   // a Y: the stem, then two arms
      return Math.abs(Math.abs(u) - v * 0.85) < 0.45 ? M.ICE : 0;
    } });
  },
  staff_rose: (r, g, bd, wide) => {   // Roseglass: a short gold wand, a pink crystal in a gold cradle
    r.sph(V.mad(g, bd, -3.8), 1.2, M.GOLD);
    r.cyl(V.mad(g, bd, 7.4), V.mad(g, bd, 8.4), 1.3, M.GOLD);
    r.group(() => { for (const sd of [-1, 1]) r.cone(V.mad(g, bd, 8), V.add(V.mad(g, bd, 10.6), V.mul(wide, sd * 2.2)), 0.9, 0.6, M.GOLD); });
    gemOn(r, g, bd, 8.8, 14.2, 1.8, M.MARKB, M.MAGIC);
  },
});
const GEAR_EXTRA = { helm: {}, chest: {}, weapon: {} }, GEAR_SWING = {}, GEAR_LEN = {};
// art A6: the warrior's seven armor sets (art/concepts/heroes/warrior-sets.png). Each chest look is
// drawn as an existing one (base) and then retouched by warriorSet(): parts recolored, the belt
// and skirt redrawn, and trims, straps, sashes and tabards added. Teal has no cloth: WATERM.
const WARRIOR_SETS = {
  militia: { base: 'tunic' }, ironguard: { base: 'plate' }, warbringer: { base: 'darkplate' }, vanguard: { base: 'plate' },
  crownguard: { base: 'plate' }, borderwarden: { base: 'brigandine' }, steelknight: { base: 'plate' },
  // art A6b: the four upgrade sets (art/concepts/heroes/warrior-upgrades.png). Copper has no metal: PUMPKIN (the orange ramp, with a highlight)
  roadwarden: { base: 'brigandine' }, copperraider: { base: 'plate' }, oathkeeper: { base: 'plate' }, emberforged: { base: 'darkplate' },
};
function warriorSet(r, id, J) {
  const { fwd, up, sideR } = J, P = r.p, base = WARRIOR_SETS[id].base, plate = base !== 'tunic' && base !== 'brigandine';
  const bulk = plate ? 1 : base === 'brigandine' ? 0.75 : 0, K = HERO_BK;
  const near = (a, b) => V.len(V.sub(a, b)) < 1e-6;
  const loc = p => { const q = V.sub(p, J.chest); return [V.dot(q, fwd), V.dot(q, sideR), V.dot(q, up)]; };
  const paint = (q, fn) => { const o = q.mf; q.mf = (p, n) => fn(p) || (o ? o(p, n) : 0); };
  const mat = (qs, m) => { for (const q of qs) if (q) q.m = m; };
  // find the body's parts by the joints they were built on
  const iPel = P.findIndex(q => q.k === 1 && q.c === J.pelvis), abdC = V.mad(J.chest, up, -3.6), chC = V.mad(J.chest, up, 0.8);
  const iAbd = P.findIndex(q => q.k === 1 && near(q.c, abdC)), pel = P[iPel], abd = P[iAbd], chest = P.find(q => q.k === 1 && near(q.c, chC));
  for (let i = iPel + 1; i < iAbd; i++) P[i].dead = true;   // belt, tabard or faulds: redrawn below
  const legs = [J.hipL, J.hipR].map(h => { const i = P.findIndex(q => q.k === 2 && q.a === h); return { thigh: P[i], shin: P[i + 1], knee: plate ? P[i + 2] : null, boot: P[i + (plate ? 3 : 2)] }; });
  const arms = [J.shR, J.shL].map(s => { const i = P.findIndex(q => q.k === 2 && q.a === s); const sl = P[i]; return { sleeve: sl, fore: P[i + 1], hand: P[i + 2], cop: P.find(q => q.k === 0 && q.c === sl.b) }; });
  const pads = P.filter(q => q.k === 1 && q.rad && ((q.rad[0] === 5.0 && q.rad[1] === 5.0) || (q.rad[0] === 4.2 && q.rad[1] === 4.0)));
  const rivets = plate ? pads.map(q => P[P.indexOf(q) + 1]) : [];
  const L = k => legs.map(l => l[k]), A = k => arms.map(a => a[k]);
  const goldEdge = q => { const c = q.c; const o = q.mf; q.mf = (p, n) => (V.dot(n, up) < 0.35 && V.dot(V.sub(p, c), up) < 0.8 ? M.GOLD : 0) || (o ? o(p, n) : 0); };   // a gold rim round the plate's edge, seen from above
  const goldRim = (q, z) => { const c = q.c; paint(q, p => V.dot(V.sub(p, c), up) < z ? M.GOLD : 0); };   // c by value: the renderer rescales q.c
  // belt and buckle
  const beltC = V.mad(J.pelvis, up, 3.0), belt = (m) => { r.ell(beltC, [3.8 + bulk * 1.4, 4.6 + bulk * 1.6, 1.1], m, frameAlong(fwd, up)); r.box(V.mad(beltC, fwd, (3.8 + bulk * 1.4) * K + 0.4), [0.6, 1.3, 1.2], M.GOLD, frameAlong(fwd, up)); };
  // skirt panels hanging from the belt (front, sides, back), flaring a little; lengths are pre-slim half lengths
  const rf = (3.4 + bulk) * K, rs = (4.2 + bulk * 1.4) * K, top = V.mad(J.pelvis, up, 1.6);
  const panel = (dir, off, w, h, m, mf) => {
    const ax = frameAlong(V.norm(V.add(dir, V.mul(up, 0.22))), up);
    r.box(V.add(V.mad(top, dir, off + h * K * 0.22), V.mul(ax[2], -h * K)), [0.6, w, h], m, ax, mf ? { mf } : {});
  };
  const skirt = (m, o) => r.group(() => {
    if (o.front) panel(fwd, rf + 0.2, o.fw || 3.2, o.front, o.fm || m, o.fmf);
    if (o.side) for (const sd of [-1, 1]) panel(V.mul(sideR, sd), rs - 0.2, 3.2, o.side, m, o.smf);
    if (o.back) panel(V.mul(fwd, -1), rf, o.bw || 3.6, o.back, m, o.smf);
  });
  const lw = (p, c) => Math.abs(V.dot(V.sub(p, top), sideR) - c);   // distance across the body from c
  if (id === 'militia') {   // red plaid tunic, a leather baldric with a gold buckle, leather bracers
    const plaid = p => { const [f, s, z] = loc(p), u = s * 0.42 + 10, v = z * 0.42 + 10; return (u - Math.floor(u) < 0.2 || v - Math.floor(v) < 0.2) ? M.BLOODY : 0; };
    const strap = p => { const [f, s, z] = loc(p), d = -s * 0.75 + z - 0.6; if (Math.abs(d) < 1.4) return f > 3 && Math.abs(z - 0.4) < 1.1 ? M.GOLD : M.LEATHER; return 0; };
    mat([chest, abd, pel], M.CLOTH_RED); mat(A('sleeve'), M.CLOTH_RED); mat(A('fore'), M.LEATHER);
    chest.mf = p => strap(p) || ((() => { const [f, s, z] = loc(p); return f > 1.5 && z > 2.6 && Math.abs(s) < (z - 2.6) * 0.9 + 0.6 ? M.FACE : 0; })()) || plaid(p);
    abd.mf = plaid; pel.mf = plaid;
    belt(M.LEATHER); skirt(M.CLOTH_RED, { front: 2.6, side: 2.6, back: 2.6, fmf: plaid, smf: plaid });
  } else if (id === 'borderwarden') {   // a green tunic under a leather lamellar vest, leather knee guards
    const lam = p => { const [f, s, z] = loc(p), v = z * 0.55 + 10; if (f > 1.5 && z > 2.4 && Math.abs(s) < (z - 2.4) * 0.9 + 0.8) return M.CLOTH_GREEN; if (Math.abs(s) > 5.4) return M.CLOTH_GREEN; return v - Math.floor(v) < 0.24 ? M.CLOTH_DARK : 0; };
    mat([chest, abd], M.LEATHER); chest.mf = lam; abd.mf = lam; mat([pel], M.CLOTH_GREEN);
    mat(A('sleeve'), M.CLOTH_GREEN); for (const q of pads) q.dead = true;
    for (const l of legs) r.sph(V.add(l.shin.a, V.mul(fwd, 1.3)), 2.1, M.LEATHER);
    belt(M.LEATHER); skirt(M.CLOTH_GREEN, { front: 2.8, side: 2.8, back: 2.8 });
  } else {   // the plate sets
    if (id === 'ironguard') {   // steel breastplate, blue sleeves, a blue cloth front, steel greaves over brown boots
      mat(A('sleeve'), M.CLOTH_BLUE); mat([...L('thigh'), pel], M.CLOTH_TAN); mat(L('boot'), M.LEATHER);
      belt(M.LEATHER); skirt(M.CLOTH_BLUE, { front: 4.8, fw: 3.6 });
    } else if (id === 'warbringer') {   // blackened steel, gold-rimmed pauldrons and knees, dark sleeves, a red skirt
      mat(A('sleeve'), M.CLOTH_DARK); mat([...L('thigh'), pel], M.LEATHER); mat(L('boot'), M.LEATHER);
      for (const q of pads) { q.mf = null; goldEdge(q); } mat(rivets, M.GOLD); for (const q of L('knee')) goldRim(q, -0.5);
      const pleat = p => { const u = V.dot(V.sub(p, top), sideR) * 0.5 + 10; return u - Math.floor(u) < 0.16 ? M.BLOODY : 0; };
      belt(M.LEATHER); skirt(M.CLOTH_RED, { front: 3.2, side: 3.0, back: 3.0, fmf: pleat });
    } else if (id === 'vanguard') {   // bright steel with a teal tabard stripe, teal skirt
      const tab = p => { const [f, s] = loc(p); return f > 1.2 && Math.abs(s) < 1.8 ? M.WATERM : 0; };
      mat([chest, abd, pel, ...A('fore'), ...A('hand'), ...A('cop'), ...pads, ...L('thigh'), ...L('knee'), ...L('shin')], M.STEEL);
      chest.mf = tab; paint(abd, tab); mat(A('sleeve'), M.CLOTH_DARK); mat(L('boot'), M.LEATHER);
      belt(M.LEATHER); skirt(M.WATERM, { front: 3.0, side: 2.8 });
    } else if (id === 'crownguard') {   // gold trim at neck, pauldrons, belt and greaves; a red-and-cream tabard skirt
      mat(A('sleeve'), M.CLOTH_BLUE); mat([...L('thigh')], M.LEATHER);
      paint(chest, p => { const [f, s, z] = loc(p); return z > 3.9 ? M.GOLD : 0; });
      for (const q of pads) { q.mf = null; goldEdge(q); } mat(rivets, M.GOLD); for (const q of L('knee')) goldRim(q, -0.5);
      for (const q of L('boot')) { const c = q.c; paint(q, p => V.dot(V.sub(p, c), up) > 0.5 ? M.GOLD : 0); }
      belt(M.GOLD); skirt(M.CLOTH_RED, { front: 3.8, side: 3.0, fmf: p => lw(p, 0) < 0.9 ? M.CLOTH_WHITE : 0 });
    } else if (id === 'steelknight') {   // full bright plate, a purple sash across the chest and a purple tabard
      mat([chest, abd, pel, ...A('sleeve'), ...A('fore'), ...A('hand'), ...A('cop'), ...pads, ...L('thigh'), ...L('knee'), ...L('shin'), ...L('boot')], M.STEEL);
      const sash = p => { const [f, s, z] = loc(p); return Math.abs(-s * 0.75 + z - 0.4) < 1.6 ? M.CLOTH_PURPLE : 0; }; paint(chest, sash); paint(abd, sash);
      belt(M.LEATHER); skirt(M.CLOTH_PURPLE, { front: 4.4, fw: 2.2 });
    } else if (id === 'copperraider') {   // a copper breastplate, pauldrons and knees over dark cloth, leather bracers, a cream front
      mat([chest, ...pads, ...L('knee')], M.BRONZE); chest.mf = null; mat([abd, pel, ...A('sleeve'), ...L('thigh')], M.CLOTH_DARK);
      mat(A('fore'), M.LEATHER); mat(A('hand'), M.FACE); for (const q of A('cop')) if (q) q.dead = true; mat([...L('shin'), ...L('boot')], M.LEATHER);
      belt(M.LEATHER); skirt(M.CLOTH_DARK, { front: 3.4, fw: 2.6, fm: M.CLOTH_WHITE, side: 2.6 });
    } else if (id === 'oathkeeper') {   // bright plate, blue sleeves and skirt, a cream tabard front
      mat([chest, abd, pel, ...A('fore'), ...A('hand'), ...A('cop'), ...pads, ...L('thigh'), ...L('knee'), ...L('shin')], M.STEEL);
      mat(A('sleeve'), M.CLOTH_BLUE); mat(L('boot'), M.LEATHER);
      belt(M.LEATHER); skirt(M.CLOTH_BLUE, { front: 3.8, fw: 2.4, fm: M.CLOTH_WHITE, side: 3.0, back: 3.0 });
    } else if (id === 'emberforged') {   // blackened plate, gold bands across the chest and at every joint, a red-orange skirt
      chest.mf = p => { const [f, s, z] = loc(p); return f > 0 && (Math.abs(z + 0.2) < 0.6 || Math.abs(z + 2.8) < 0.6) ? M.GOLD : 0; };
      for (const q of pads) { q.mf = null; goldEdge(q); } mat(rivets, M.GOLD); for (const q of A('cop')) if (q) goldEdge(q);
      for (const q of L('knee')) goldRim(q, -0.5);
      for (const q of L('boot')) { const c = q.c; paint(q, p => V.dot(V.sub(p, c), up) > 0.5 ? M.GOLD : 0); }
      belt(M.LEATHER); skirt(M.AUTUMNM, { front: 3.6, side: 3.2, back: 3.0 });
    }
  }
  if (id === 'roadwarden') {   // a green tunic, a leather harness holding a small steel plate, a blue cloth front
    const harness = p => { const [f, s, z] = loc(p); return (Math.abs(Math.abs(s) - 2.6) < 0.75 && z > -2.5) || (f < 0 && Math.abs(z + 0.2) < 0.7) ? M.LEATHER : 0; };
    mat([chest, abd, pel, ...A('sleeve')], M.CLOTH_GREEN); chest.mf = harness; abd.mf = null; mat(A('hand'), M.FACE);
    for (const q of pads) q.dead = true;
    r.box(V.add(V.mad(J.chest, up, 1.2), V.mul(fwd, (3.8 + bulk * 1.4) * K + 0.1)), [0.6, 2.2, 2.3], M.STEEL, frameAlong(V.norm(V.add(fwd, V.mul(up, 0.45))), up), { bias: 1 });   // tipped up so it catches the light
    belt(M.LEATHER); skirt(M.CLOTH_GREEN, { front: 3.6, fw: 2.6, fm: M.CLOTH_BLUE, side: 2.6, back: 2.6 });
  }
  warriorSetA8(r, id, J, { chest, abd, pel, legs, arms, pads, rivets, L, A, mat, paint, loc, goldEdge, goldRim, belt, skirt, bulk, K });
  r.p = r.p.filter(q => !q.dead);
}
// art A6b: helm variants drawn as a built-in helm and then recolored (helmVar), and new looks
const HELM_VARS = { barbute_dark: 'barbute', bascinet_gold: 'bascinet' };
function helmVar(r, id, hr0, hd, up) {
  const H = r.p.slice(hr0);
  if (id === 'barbute_dark') for (const q of H) if (q.m === M.STEEL) q.m = M.DSTEEL;   // the copper raider's dark barbute
  if (id === 'bascinet_gold') {   // the ember-forged bascinet: blackened, a gold band over the brow
    for (const q of H) if (q.m === M.PLATE) q.m = M.DSTEEL;
    const dome = H.find(q => q.k === 1), c = dome.c, o = dome.mf;
    dome.mf = (p, n) => (Math.abs(V.dot(V.sub(p, c), up) - 2.5) < 0.65 ? M.GOLD : 0) || (o ? o(p, n) : 0);
  }
  helmVarA8(r, id, H, hd, up);
}
// art A8: the dusk duelist's dark skullcap, the winter bulwark's flat-topped great helm, the royal executor's closed helm
Object.assign(HELM_VARS, { skullcap: 'cap', great_flat: 'great', helm_royal: 'horned' });
function helmVarA8(r, id, H, hd, up) {
  if (id === 'skullcap') for (const q of H) if (q.m === M.STEEL) { q.m = M.SLATE; q.mf = p => V.dot(V.sub(p, hd), up) < 0.6 ? M.DSTEEL : 0; }
  if (id === 'great_flat') {   // a bucket: the dome cut flat by a steel drum, the visor's grille still in front
    for (const q of H) if (q.k === 3 && q.half && q.half[0] === 2.6) q.dead = true;   // no ridge on a flat top
    for (const q of H) if (q.k === 1 && q.m === M.PLATE) q.rad = [q.rad[0], q.rad[1], 3.5];   // the dome kept under the drum's lid
    r.cyl(V.mad(hd, up, -2.6), V.mad(hd, up, 3.7), 4.4, M.PLATE, { mf: p => V.dot(V.sub(p, hd), up) > 3.0 ? M.STEEL : 0 });
    r.p = r.p.filter(q => !q.dead);
  }
  if (id === 'helm_royal') r.p = r.p.filter(q => H.indexOf(q) < 0 || (q.m !== M.HORN && !(q.k === 3 && q.m === M.GOLD)));   // the horned helm without its horns: dark steel, a gold band, a T slit
}
const SHIELD_VARS = { heater_oath: 'heater' };
function shieldVar(r, id, sh0) {
  if (id === 'heater_oath') {   // the oathkeeper's heater: blue, a cream stripe down the middle, a steel rim
    const q = r.p[sh0], c = q.c, ax = q.ax, rad = q.rad;
    q.m = M.CLOTH_BLUE;
    q.mf = p => { const d = V.sub(p, c), u = V.dot(d, ax[1]) / rad[1], v = V.dot(d, ax[2]) / rad[2]; if (v > 0.62) return M.IRON; if (u * u + v * v > 0.7) return M.STEEL; return Math.abs(u) < 0.2 ? M.CLOTH_WHITE : 0; };
  }
  shieldVarA8(r, id, sh0);
}
// art A8: the gatewatch's wooden board, the duelist's steel buckler, the bulwark's striped heater (their backs: wood and leather straps)
Object.assign(SHIELD_VARS, { board: 'tower', buckler_steel: 'buckler', heater_frost: 'heater' });
function shieldVarA8(r, id, sh0) {
  const q = r.p[sh0]; if (!q) return;
  const c = q.c, ax = q.ax, back = d => V.dot(d, ax[0]) < -0.3;
  const straps = (v, s) => Math.abs(Math.abs(v) - s) < 0.13 ? M.LEATHER : M.WOOD;   // two straps across the back
  if (id === 'board') {   // a plank board, steel corners, an iron edge
    q.half = [0.7, 3.3, 5.0]; q.m = M.WOOD;
    q.mf = p => { const d = V.sub(p, c), u = V.dot(d, ax[1]) / 3.3, v = V.dot(d, ax[2]) / 5.0;
      if (Math.abs(u) > 0.62 && Math.abs(v) > 0.72) return M.STEEL;
      if (back(d)) return straps(v, 0.35);
      if (Math.abs(u) > 0.86 || Math.abs(v) > 0.9) return M.IRON;
      return Math.abs(u * 3.3 - Math.round(u * 3.3 / 2.2) * 2.2) < 0.2 ? M.BARK : 0; };
  }
  if (id === 'buckler_steel') {   // a small round steel buckler with a raised boss
    q.m = M.STEEL; const rad = q.rad;
    q.mf = p => { const d = V.sub(p, c), u = V.dot(d, ax[1]) / rad[1], v = V.dot(d, ax[2]) / rad[2]; if (back(d)) return straps(v, 0.3) === M.LEATHER ? M.LEATHER : M.WOOD; return u * u + v * v > 0.66 ? M.IRON : 0; };
    r.cone(V.mad(c, ax[0], 0.6), V.mad(c, ax[0], 2.0), 1.6, 0.6, M.STEEL);
  }
  if (id === 'heater_frost') {   // blue and white stripes, a steel rim, a wooden back
    q.m = M.CLOTH_BLUE; const rad = q.rad;
    q.mf = p => { const d = V.sub(p, c), u = V.dot(d, ax[1]) / rad[1], v = V.dot(d, ax[2]) / rad[2]; if (back(d)) return straps(v, 0.3); if (v > 0.62 || u * u + v * v > 0.66) return M.STEEL; return Math.abs(u) > 0.18 && Math.abs(u) < 0.48 ? M.CLOTH_WHITE : 0; };
    if (r.p[sh0 + 1]) { r.p[sh0 + 1].m = M.STEEL; }
  }
}
// the roadwarden's kettle helm: a round steel cap with a brim and a nasal bar, the face open
GEAR_EXTRA.helm.kettle = (r, { hd, fwd, up, sideR, helmF }) => {
  r.ell(hd, [4.3, 4.3, 4.5], M.FACE, helmF, { mf: faceMf(hd, fwd, sideR, up, { under: 1, hair: M.HAIR_O }) }); faceParts(r, hd, fwd, sideR, up, false);   // (round 71: the shared face; hair shows under the helm)
  const hc = V.mad(hd, up, 2.1);
  r.group(() => {
    r.ell(hc, [4.6, 4.5, 3.6], M.STEEL, helmF);
    r.cyl(V.mad(hd, up, 1.3), V.mad(hd, up, 1.9), 5.2, M.STEEL);   // the brim
  });
  r.box(V.add(V.mad(hd, up, 0.2), V.mul(fwd, 4.4)), [0.5, 0.6, 1.8], M.STEEL, helmF);   // the nasal
};
// weapons (art A6b): the crescent axe, the flanged mace and the forge hammer (two-handed, carried across the body)
GEAR_EXTRA.weapon.caxe = (r, { g, bd, wide, wf }) => {
  r.cone(V.mad(g, bd, 1.2), V.mad(g, bd, 14), 0.9, 0.9, M.WOOD);
  r.cyl(V.mad(g, bd, 10.2), V.mad(g, bd, 12.6), 1.4, M.BRONZE);   // the copper collar
  r.group(() => {
    r.box(V.add(V.mad(g, bd, 11.4), V.mul(wide, 3.0)), [2.2, 2.6, 0.5], M.BLADE, wf);
    for (const s2 of [1, -1]) r.cone(V.add(V.mad(g, bd, 11.4), V.mul(wide, 5.0)), V.add(V.mad(g, bd, 11.4 + s2 * 5.0), V.mul(wide, 6.0)), 1.6, 0.4, M.BLADE);   // the crescent's horns
  });
};
GEAR_EXTRA.weapon.fmace = (r, { g, bd, wide, wf }) => {
  r.cone(V.mad(g, bd, -2.6), V.mad(g, bd, 1.2), 1.0, 1.0, M.CLOTH_BLUE);   // a blue grip over the leather
  r.cone(V.mad(g, bd, 1.2), V.mad(g, bd, 11), 0.9, 0.9, M.STEEL);
  const hb = V.mad(g, bd, 13);
  r.group(() => {
    r.cone(V.mad(hb, bd, -2.4), V.mad(hb, bd, 2.6), 1.8, 1.2, M.STEEL);
    for (const k of [0, 1, 2, 3]) { const d = V.norm(V.add(V.mul(wide, Math.cos(k * Math.PI / 4 + 0.4)), V.mul(wf[2], Math.sin(k * Math.PI / 4 + 0.4)))); for (const sg of [1, -1]) r.box(V.mad(hb, d, sg * 1.9), [2.2, 1.0, 0.5], M.STEEL, [bd, V.mul(d, sg), V.cross(bd, V.mul(d, sg))]); }
  });
};
GEAR_EXTRA.weapon.fhammer = (r, { g, bd, wide, wf }) => {
  r.cone(V.mad(g, bd, -7), V.mad(g, bd, 15), 0.95, 0.95, M.WOOD);
  const hb = V.mad(g, bd, 15.2);
  r.box(hb, [1.9, 4.0, 2.0], M.BRONZE, [bd, wide, wf[2]], { mf: p => Math.abs(V.dot(V.sub(p, hb), wide)) < 2.6 ? M.IRON : 0 });   // copper faces on an iron core
};
GEAR_SWING.caxe = 'heavy'; GEAR_SWING.fmace = 'heavy'; GEAR_SWING.fhammer = 'heavy';
GEAR_LEN.caxe = 16; GEAR_LEN.fmace = 16; GEAR_LEN.fhammer = 18;
// art A8: four more warrior sets from the front-and-back concept (art/concepts/heroes/warrior-front-back.png).
// Olive has no cloth: OGRE (grey-green); maroon: BLOODY; slate-teal: WATERM; navy: CLOTH_NAVY; cream: CLOTH_WHITE.
Object.assign(WARRIOR_SETS, { gatewatch: { base: 'brigandine' }, duskduelist: { base: 'brigandine' }, winterbulwark: { base: 'plate' }, royalexecutor: { base: 'plate' } });
// art A8: the gatewatch's open helm: a steel dome on a riveted iron band, a nasal bar, the face open
GEAR_EXTRA.helm.nasal = (r, { hd, fwd, up, sideR, helmF }) => {
  r.ell(hd, [4.3, 4.3, 4.5], M.FACE, helmF, { mf: faceMf(hd, fwd, sideR, up, { under: 1, hair: M.HAIR_O }) }); faceParts(r, hd, fwd, sideR, up, false);   // (round 71: the shared face; hair shows under the helm)
  const hc = V.mad(hd, up, 1.6);
  r.ell(hc, [4.65, 4.6, 4.1], M.STEEL, helmF, { mf: p => { const q = V.sub(p, hc), z2 = V.dot(q, up); if (z2 > -0.6) return 0;   // the band, rivets round it
    const a = Math.atan2(V.dot(q, sideR), V.dot(q, fwd)); return Math.abs(z2 + 1.25) < 0.4 && Math.abs(Math.sin(a * 5)) > 0.8 ? M.STEEL : M.IRON; } });
  r.box(V.add(V.mad(hd, up, 0.3), V.mul(fwd, 4.4)), [0.5, 0.5, 1.6], M.STEEL, helmF);   // the nasal
};
// weapons (art A8): the leaf-bladed spear (held upright at rest), the curved sabre, the froststeel axe, the kingsguard greatsword (both hands)
GEAR_EXTRA.weapon.spear = (r, { g, bd, wide, wf }) => {
  r.cone(V.mad(g, bd, -9), V.mad(g, bd, 20), 0.9, 0.9, M.WOOD);
  r.sph(V.mad(g, bd, -9.2), 1.0, M.STEEL);   // the butt cap
  r.cone(V.mad(g, bd, 19.4), V.mad(g, bd, 21.4), 1.1, 0.9, M.STEEL);   // the socket
  r.ell(V.mad(g, bd, 24.2), [3.4, 1.5, 0.45], M.BLADE, wf);   // the leaf
};
GEAR_EXTRA.weapon.sabre = (r, { g, bd, wide, wf }) => {
  r.box(V.mad(g, bd, 1.8), [0.7, 2.8, 0.8], M.GOLD, wf);
  r.cone(V.add(V.mad(g, bd, 1.6), V.mul(wide, -2.2)), V.add(V.mad(g, bd, -2.6), V.mul(wide, -1.6)), 0.7, 0.6, M.GOLD);   // the knuckle bow
  const at = t => V.add(V.mad(g, bd, 2.4 + t * 16), V.mul(wide, -2.8 * t * t));   // the blade curves back toward its spine
  r.group(() => { for (let k = 0; k < 4; k++) { const a = at(k / 4), b = at((k + 1) / 4), d = V.norm(V.sub(b, a)), w2 = V.norm(V.sub(wide, V.mul(d, V.dot(wide, d)))); r.box(V.mul(V.add(a, b), 0.5), [V.len(V.sub(b, a)) / 2 + 0.3, 1.05 - k * 0.08, 0.4], M.BLADE, [d, w2, V.cross(d, w2)]); }
    const e = at(1), d = V.norm(V.sub(e, at(0.9))); r.cone(V.mad(e, d, -0.4), V.add(V.mad(e, d, 1.8), V.mul(wide, 0.3)), 0.8, 0.2, M.BLADE); });
};
GEAR_EXTRA.weapon.faxe = (r, { g, bd, wide, wf }) => {
  r.cone(V.mad(g, bd, -2.4), V.mad(g, bd, 2.6), 1.0, 1.0, M.CLOTH_BLUE);   // the blue grip
  r.cone(V.mad(g, bd, 2.6), V.mad(g, bd, 13.4), 0.9, 0.9, M.WOOD);
  r.cyl(V.mad(g, bd, 9.4), V.mad(g, bd, 10.4), 1.2, M.STEEL);
  r.group(() => {   // a bearded head
    r.box(V.add(V.mad(g, bd, 11.6), V.mul(wide, 3.0)), [2.4, 2.8, 0.5], M.BLADE, wf);
    r.cone(V.add(V.mad(g, bd, 11.4), V.mul(wide, 5.0)), V.add(V.mad(g, bd, 7.4), V.mul(wide, 4.4)), 1.7, 0.5, M.BLADE);   // the beard
    r.cone(V.add(V.mad(g, bd, 12.4), V.mul(wide, 5.0)), V.add(V.mad(g, bd, 14.6), V.mul(wide, 5.4)), 1.5, 0.4, M.BLADE);
  });
  r.cone(V.add(V.mad(g, bd, 11.6), V.mul(wide, -0.6)), V.add(V.mad(g, bd, 11.6), V.mul(wide, -2.8)), 1.0, 0.3, M.STEEL);   // the back spike
};
GEAR_EXTRA.weapon.kgsword = (r, { g, bd, wide, wf }) => {
  r.cone(V.mad(g, bd, -5.6), V.mad(g, bd, -2.6), 0.9, 0.9, M.LEATHER);   // a two-hand grip
  r.sph(V.mad(g, bd, -6.0), 1.3, M.GOLD);
  r.box(V.mad(g, bd, 2), [0.8, 4.8, 0.9], M.GOLD, wf);
  r.box(V.mad(g, bd, 14.2), [11.6, 1.5, 0.45], M.BLADE, wf, { mf: p => Math.abs(V.dot(V.sub(p, g), wide)) < 0.35 && V.dot(V.sub(p, g), bd) < 23 ? M.STEEL : 0 });   // a fuller
  r.cone(V.mad(g, bd, 25.6), V.mad(g, bd, 27.4), 1.2, 0.3, M.BLADE);
};
Object.assign(GEAR_SWING, { spear: 'light', sabre: 'light', faxe: 'heavy', kgsword: 'heavy' });
Object.assign(GEAR_LEN, { spear: 26, sabre: 20, faxe: 16, kgsword: 27 });
// art A8: the warrior sets' backs, now that they wear no cloak: a back panel where a set had none
const SET_BACK = { ironguard: [M.CLOTH_BLUE, 4.0, 3.2], vanguard: [M.WATERM, 3.0, 3.2], crownguard: [M.CLOTH_RED, 3.4, 3.2], steelknight: [M.CLOTH_PURPLE, 4.2, 2.6], copperraider: [M.CLOTH_DARK, 3.0, 3.2] };
function warriorSetA8(r, id, J, S) {
  const { fwd, up, sideR } = J, { chest, abd, pel, legs, arms, pads, rivets, L, A, mat, paint, loc, goldEdge, goldRim, belt, skirt } = S;
  if (SET_BACK[id]) { const [m, h, w] = SET_BACK[id]; skirt(m, { back: h, bw: w }); }
  if (id === 'gatewatch') {   // an olive padded tunic, steel pauldrons, knee guards and greaves, leather tassets round a cream flap
    mat([chest, abd, pel, ...A('sleeve'), ...A('fore'), ...L('thigh')], M.OGRE); chest.mf = null;
    for (const q of pads) { q.m = M.STEEL; q.mf = null; }
    mat(L('shin'), M.STEEL); mat(L('boot'), M.LEATHER);
    for (const l of legs) r.sph(V.add(l.shin.a, V.mul(fwd, 1.3)), 2.1, M.STEEL);
    belt(M.LEATHER); skirt(M.LEATHER, { front: 3.6, fw: 1.9, fm: M.CLOTH_WHITE, side: 2.8, back: 2.8 });
  } else if (id === 'duskduelist') {   // a wine tunic over dark sleeves and trousers, steel shoulder and elbow cops, a long tabard front and back, brown boots
    mat([chest, abd], M.BLOODY); chest.mf = null; mat([pel, ...A('sleeve'), ...A('fore'), ...L('thigh')], M.CLOTH_DARK);
    for (const q of pads) { q.m = M.STEEL; q.mf = null; }
    for (const a of arms) r.sph(a.sleeve.b, 2.0, M.STEEL);   // elbow cops
    mat([...L('shin'), ...L('boot')], M.LEATHER);
    belt(M.LEATHER); skirt(M.BLOODY, { front: 4.6, fw: 2.6, back: 4.6, bw: 2.8 });
  } else if (id === 'winterbulwark') {   // slate-teal plate, steel arms and greaves, a cream fur mantle round the shoulders, a blue-grey skirt
    mat([chest, abd], M.WATERM); chest.mf = null;
    mat([...A('sleeve'), ...A('fore'), ...A('hand'), ...A('cop'), ...pads, ...L('knee'), ...L('shin')], M.STEEL);
    mat([pel, ...L('thigh')], M.CLOTH_SHADOW); mat(L('boot'), M.LEATHER);
    const mc = V.mad(J.chest, up, 4.3);
    r.group(() => {   // the mantle: a ring of fur tufts over the shoulders, front and back
      r.ell(mc, [5.0, 6.6, 2.2], M.CLOTH_WHITE, frameAlong(fwd, up));
      for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; r.sph(V.add(V.mad(mc, up, -0.6), V.add(V.mul(fwd, Math.cos(a) * 4.6), V.mul(sideR, Math.sin(a) * 6.2))), 2.0, M.CLOTH_WHITE); }
    });
    belt(M.LEATHER); skirt(M.CLOTH_SHADOW, { front: 4.2, fw: 3.0, side: 3.6, back: 4.2 });
  } else if (id === 'royalexecutor') {   // navy plate, gold-trimmed pauldrons, gold bands, a navy tasset over a cream skirt
    mat([chest, abd, ...A('sleeve'), ...A('fore'), ...A('cop'), ...pads], M.CLOTH_NAVY); mat(A('hand'), M.DSTEEL);
    chest.mf = p => { const [f, s, z] = loc(p); return z > 3.9 || (f > 0 && Math.abs(z + 1.6) < 0.55) ? M.GOLD : 0; };
    for (const q of pads) { q.mf = null; goldEdge(q); } mat(rivets, M.GOLD); for (const q of A('cop')) if (q) goldEdge(q);
    for (const q of A('fore')) { const b = q.b; paint(q, p => V.len(V.sub(p, b)) < 1.4 ? M.GOLD : 0); }   // gold cuffs
    mat([pel, ...L('thigh')], M.CLOTH_WHITE); for (const q of L('knee')) goldRim(q, -0.5);
    for (const q of L('shin')) { const a = q.a; paint(q, p => Math.abs(V.dot(V.sub(p, a), up) + 1.6) < 0.6 ? M.GOLD : 0); }
    mat(L('boot'), M.LEATHER);
    belt(M.LEATHER); skirt(M.CLOTH_WHITE, { front: 4.2, fw: 3.0, fm: M.CLOTH_NAVY, side: 4.0, back: 4.2, bw: 3.4 });
  }
}
function weaponSwing(eq, combo = 0) {
  if (isBow(eq.weapon)) return HEAVY && !FEEL_OLD ? RANGER_BOW_H : RANGER_BOW;
  const S = FEEL_OLD ? SWINGS : HEAVY ? HERO_SWINGS_H : HERO_SWINGS;
  if (combo === 3) return FEEL_OLD ? S.heavy : S.gslam;   // the ground slam (round 40a: a hop and a crash; ?feel=old keeps the old chop)
  return (eq.weapon === 'sword' || eq.weapon === 'bsword' || GEAR_SWING[eq.weapon] === 'light' ? [S.light, S.light2, S.thrust] : [S.heavy, S.heavy2, S.slam])[combo] || S.light;
}
// how far the weapon's tip is from the swing pivot (smears and reach)
const WEAPON_LEN = { sword: 21, axe: 16, mace: 16, flail: 17, greatsword: 27, bsword: 24, mstar: 17, baxe: 19 };

function heroRig(eq, st) {
  const volley = st.clip === 'volley', skyShot = st.clip === 'skyshot'; if (volley || skyShot) st = Object.assign({}, st, { clip: 'shoot', sky: skyShot });   // round 43: the volley and Rain of Arrows' shot into the sky   // round 43: Multishot draws like a shot, the bow canted over and three arrows on the string
  if (HAT_STYLE[eq.helm]) eq = Object.assign({}, eq, { helm: 'hat_conj', hatV: HAT_STYLE[eq.helm] });   // round a6b: a colored wizard hat
  const wset = WARRIOR_SETS[eq.chest] ? eq.chest : null; if (wset) eq = Object.assign({}, eq, { chest: WARRIOR_SETS[wset].base });   // art A6: a warrior set, drawn over its base look
  const hvar = HELM_VARS[eq.helm] ? eq.helm : null; if (hvar) eq = Object.assign({}, eq, { helm: HELM_VARS[hvar] });   // art A6b: a helm variant
  const svar = SHIELD_VARS[eq.shield] ? eq.shield : null; if (svar) eq = Object.assign({}, eq, { shield: SHIELD_VARS[svar] });   // and a shield variant
  const B = robed(eq) ? MAGE_B : HERO_B, J = bipedJoints(B, st), r = new Rig();
  const team = TEAM[eq.team] || M.CLOTH_RED;
  const gothic = eq.chest === 'gothic', plate = eq.chest === 'plate' || eq.chest === 'darkplate' || gothic, scale = eq.chest === 'scale', chain = eq.chest === 'chain' || scale, brig = eq.chest === 'brigandine';
  const PL = eq.chest === 'darkplate' || gothic ? M.DSTEEL : M.PLATE;   // round 43: gothic plate is blackened steel with gold edges and spiked pauldrons
  // mage robes: one design in three colors (look 'robe_blue' / 'robe_purple' / 'robe_red')
  const robe = eq.chest.startsWith('robe'), robeM = robe ? ((ROBE_STYLE[eq.chest] || {}).m || TEAM[eq.chest.slice(5)] || M.CLOTH_BLUE) : null;
  const RS = robe ? ROBE_STYLE[eq.chest] || ROBE_STYLE.robe_blue : null;
  // a robe's front trim on a skirt cone a->b: the panel or the stripes down the front, the hem band
  const robeFront = (a, b, w0, w1, hemAt) => { const d = V.norm(V.sub(b, a)), L = V.len(V.sub(b, a)); return p => {
    const t = Math.max(0, Math.min(1, V.dot(V.sub(p, a), d) / L)), n = V.sub(p, V.mad(a, d, t * L)), s = Math.abs(V.dot(n, sideR)), w = w0 + (w1 - w0) * t;
    if (hemAt !== undefined && RS.hem && (RS.hw !== undefined ? p[2] < b[2] + RS.hw : Math.abs(t * L - hemAt) < 0.45)) return RS.hem;
    if (V.dot(n, fwd) <= 0.5) return 0;
    if (RS.panel && s < w) return RS.panel;
    if (RS.stripes && Math.abs(s - w) < 0.5) return RS.stripes;
    return 0;
  }; };
  // the ranger's jerkins (round 33): leather over a green shirt; studded, or dark hide
  const jerk = eq.chest.startsWith('jerkin'), jerkM = jerk ? (JERKIN[eq.chest] || JERKIN.jerkin).m : M.LEATHER, bow = isBow(eq.weapon);   // round 43: drake hide, dark scaled
  const legM = plate ? PL : M.LEATHER, torsoM = plate ? PL : chain ? (scale ? M.GOLD : M.CHAIN) : robe ? robeM : jerk ? jerkM : team;
  const { fwd, sideR, up } = J;
  // a lean body underneath; armor adds its own bulk on top (chain a little, plate the most)
  const bulk = plate ? 1 : brig ? 0.75 : chain ? 0.55 : jerk ? 0.3 : 0;

  // legs
  for (const [hip, knee, ank, s] of [[J.hipL, J.kneeL, J.ankL, -1], [J.hipR, J.kneeR, J.ankR, 1]]) {
    r.cone(hip, knee, 2.3 + bulk, 2.0 + bulk, plate ? PL : robe ? robeM : M.CLOTH_TAN);   // brown leather trousers (in a robe the cloth over the thigh: round 60)
    r.cone(knee, ank, 1.9 + bulk * 1.0, 1.6 + bulk * 0.8, legM);
    if (plate) { const kc = V.add(knee, [1.4, 0, 0.3]); r.sph(kc, 2.4, PL); }   // poleyn
    r.ell(V.add(ank, [2.0, 0, -0.9]), plate ? [3.9, 2.4, 1.5] : [4.0, 2.2, 1.6], legM);   // chunky chibi boots
  }
  // hips, belt and tabard
  r.ell(J.pelvis, [3.4 + bulk, 4.2 + bulk * 1.4, 3.2 + bulk * 0.4], plate ? PL : chain ? (scale ? M.GOLD : M.CHAIN) : robe ? robeM : M.CLOTH_TAN);
  if (robe) {   // the skirt: a flared cone from the waist to the shins whose hem follows the feet, gold-trimmed
    // upper skirt hangs from the waist to the knees; the lower skirt flares to the hem, which is
    // pushed by the leading knee, trails behind when he moves and swings side to side with the stride
    const top = V.mad(J.pelvis, up, 1.5), kneeMid = V.mul(V.add(J.kneeL, J.kneeR), 0.5);
    const lead = Math.max(V.dot(V.sub(J.kneeL, J.pelvis), fwd), V.dot(V.sub(J.kneeR, J.pelvis), fwd));
    const moving = st.clip === 'walk' || st.clip === 'go', trail = moving ? -1.4 : st.clip === 'stop' ? 1.0 : 0;
    // round 60: the cloth hangs nearly straight from the waist. It used to follow the knees, and the
    // bent-knee idle stance pushed it ~25 degrees forward, so the hem's round end stuck out like a boulder
    const kneeF = V.dot(V.sub(kneeMid, J.pelvis), fwd), kneeAt = V.mad(kneeMid, fwd, kneeF * -0.72 + lead * 0.22);
    const knee = V.add(kneeAt, V.mul(sideR, J.swingArm * 0.6));
    const hemZ = Math.min(J.ankL[2], J.ankR[2]) + 1.9;
    const hem = V.add(V.add([knee[0], knee[1], hemZ], V.mul(fwd, trail + lead * 0.08)), V.mul(sideR, J.swingArm * 0.9));
    const ax = V.norm(V.sub(hem, knee)), Lh = V.len(V.sub(hem, knee));
    r.group(() => {
      r.cone(top, knee, 4.4, 5.4, robeM, { mf: robeFront(top, knee, 1.3 * (RS.wk || 1), 1.6 * (RS.wk || 1)) });
      r.cone(knee, hem, 5.4, 6.9, robeM, { mf: robeFront(knee, hem, 1.6 * (RS.wk || 1), 2.1 * (RS.wk || 1), Lh - 1.3) });   // the front trim and a band near the hem
      const back = V.mad(top, fwd, -1.2); r.cone(back, V.mad(knee, fwd, -1.6), 4.6, 5.2, robeM);   // the back hangs over the seat, so the trousers don't show from behind
    });
  }
  const belt = V.mad(J.pelvis, up, 3.0);
  if (!plate) { r.ell(belt, [3.8 + bulk * 1.4, 4.6 + bulk * 1.6, 1.1], M.LEATHER, frameAlong(fwd, up)); r.sph(V.mad(belt, fwd, 3.8 + bulk * 1.4), 1.0, M.GOLD); }
  if (robe && RS.medal) r.cyl(V.mad(belt, fwd, 3.5), V.mad(belt, fwd, 4.3), 1.8, RS.medal);   // a round medallion for a buckle
  if (robe && RS.buckle) r.box(V.mad(belt, fwd, 3.7), [0.5, 1.5, 1.2], RS.buckle, frameAlong(fwd, up));
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
  r.ell(abd, [3.2 + bulk * 1.6, 4.0 + bulk * 2.2, 3.4 + bulk * 0.8], plate ? PL : chain ? (scale ? M.GOLD : M.CHAIN) : jerk ? jerkM : team, tf);
  if (!plate && !chain && !brig) r.cone(V.mad(J.chest, up, 4.5), J.head, 1.4, 1.2, M.FACE);   // neck
  const jerkMf = p => {   // jerkin: the leather one a V of green shirt and laces; studs, scale bands or the coat's strap on the others
    const q = V.sub(p, J.chest), s = V.dot(q, sideR), sd = Math.abs(s), z = V.dot(q, up), f = V.dot(q, fwd);
    if (eq.chest === 'jerkin') { if (f > 1.5 && z > 2.2 && sd < (z - 2.2) * 0.9 + 0.7) return M.CLOTH_GREEN; if (f > 2.4 && sd < 0.5 && z > -3 && z < 2.4) return M.DARK; }
    if (eq.chest === 'jerkin_scale') { const v = (z + 0.4) / 2.3; if (Math.abs(v - Math.round(v)) < 0.22) return M.GOLD; }   // horizontal bands of gold scales
    if ((eq.chest === 'jerkin_hide' || eq.chest === 'jerkin_bramble') && Math.abs(s - z * 0.85 + 0.6) < 0.9) return M.LEATHER;   // the strap from the right shoulder to the left hip
    { const xm = (JERKIN[eq.chest] || {}).mf; if (xm) { const v = xm(s, z, f); if (v) return v; } }   // a8: the front/back sets' own painting
    return 0;
  };
  const robeMf = p => {   // robe: a V of skin at the neck and a gold stripe down the front
    const q = V.sub(p, J.chest), sd = Math.abs(V.dot(q, sideR)), z = V.dot(q, up), f = V.dot(q, fwd);
    if (f > 1.5 && z > 2.6 && sd < (z - 2.6) * 0.9 + 0.6) return M.FACE;
    if (f > 1.5 && RS.panel && sd < (RS.pw || 1.3)) return RS.panel;
    if (f > 1.5 && RS.stripes && Math.abs(sd - (RS.pw || 1.3) - 0.1) < 0.5) return RS.stripes;
    return RS.placket && f > 2 && sd < 0.6 ? RS.placket : 0;
  };
  r.ell(V.mad(J.chest, up, 0.8), [3.8 + bulk * 1.4, 5.0 + bulk * 1.8, 4.6 + bulk * 1.6], torsoM, tf, {
    mf: robe ? robeMf : jerk ? jerkMf : brig ? (p => {   // brigandine: cloth over plates, rows of gold rivets
      const q = V.sub(p, J.chest), u = V.dot(q, sideR) * 0.62, v = V.dot(q, up) * 0.62;
      return Math.abs(u - Math.round(u)) < 0.22 && Math.abs(v - Math.round(v)) < 0.22 ? (hasFx(eq, 'storm') ? M.FUNGUS2 : M.GOLD) : 0;   // Stormhide's studs crackle
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
      return V.dot(q, fwd) > 1.5 && z > 2.6 && sd < (z - 2.6) * 0.9 + 0.6 ? M.FACE : 0;
    }),
  });
  { const xc = GEAR_EXTRA.chest[eq.chest]; if (xc) xc(r, { J, fwd, up, sideR, tf, eq, st, bulk }); }   // an art-kit chest look, over the torso
  if (jerk) jerkinChest(r, eq, J, fwd, up, sideR);   // a6: the ranger's jerkins
  setChest(r, eq, J, fwd, up, sideR);   // round 43: armor sets wear their colors
  // arms: right hand holds the weapon, left the shield
  const atk = atkIndex(st.clip) >= 0;
  const sw = atk ? st.key : null, list = atk ? weaponSwing(eq, atkIndex(st.clip)) : null;
  const pivot = V.add(V.add(J.chest, V.mul(sideR, 2.5)), V.add(V.mul(up, 4), V.mul(fwd, 1)));
  const tilt = list && list.tilt !== undefined ? list.tilt : 0.65;
  const F = fwd, U = V.norm(V.add(V.mul(up, Math.cos(tilt)), V.mul(sideR, Math.sin(tilt))));
  const inPlane = a => V.norm(V.add(V.mul(F, Math.cos(a)), V.mul(U, Math.sin(a))));
  const bladeA = k => k.a + (k.ck || 0);   // the blade leads or trails the arm
  let handR, bd, acrossG = false;
  let bothG = false;   // art A8: the kingsguard greatsword held in both hands at rest
  const staff = eq.weapon.startsWith('staff');
  const rel = bow && st.clip === 'shoot' && st.key && !!st.key.rel, draw = bow && st.clip === 'shoot' && st.key ? (rel ? 0 : st.key.a) : 0, pull = rel ? 1.32 : draw;   // (round 72: on the loose the string is straight and the hand has flown back)
  // round 40a: the hero's new poses for the weapon hand
  const fk = [0, 1, 1, 0.4][st.f % 4];
  const flask = hd => { const fl = V.add(V.mad(hd, fwd, 2.2), V.mul(up, 1.8)); r.sph(fl, 2.3, M.EYE_RED, { noShadow: true }); r.cone(fl, V.mad(fl, V.norm(V.add(V.mul(fwd, -0.9), up)), 2.2), 0.7, 0.6, M.WOOD, { noShadow: true }); };   // the flask, glowing red, tipped to the mouth
  const drinkR = bow || (eq.shield !== 'none' && eq.shield !== undefined && !staff);   // which hand drinks: the free one
  if (st.clip === 'hook') {   // wind back over the shoulder, whip out after the chain, then haul it in at the chest
    if (st.f === 0) { handR = V.add(V.add(J.shR, V.mul(fwd, -3)), V.add(V.mul(up, 0.5), V.mul(sideR, 2.5))); bd = V.norm(V.add(V.mul(fwd, -0.6), up)); }
    else if (st.f === 1) { handR = V.add(V.add(J.shR, V.mul(fwd, 8.5)), V.add(V.mul(up, -1), V.mul(sideR, 0.3))); bd = V.norm(V.add(fwd, V.mul(up, 0.25))); }
    else { handR = V.add(V.add(J.shR, V.mul(fwd, 3.5)), V.add(V.mul(up, -4.5), V.mul(sideR, -0.8))); bd = V.norm(V.add(V.mul(fwd, 0.45), up)); }
  } else if (st.clip === 'spin') {   // the weapon held straight out to the side, level, so the turn sweeps it round
    handR = V.add(V.add(J.shR, V.mul(sideR, 7.5)), V.add(V.mul(up, -2.5), V.mul(fwd, 1))); bd = V.norm(V.add(V.add(sideR, V.mul(fwd, 0.45)), V.mul(up, 0.08)));
  } else if (st.clip === 'drink' && drinkR) {   // the flask up to the mouth in the weapon hand (a shield fills the other), the blade hanging down behind
    handR = V.add(V.add(J.head, V.mul(fwd, 3.4)), V.add(V.mul(up, -3.2), V.mul(sideR, 1.8))); bd = V.norm(V.add(V.add(V.mul(fwd, -0.5), V.mul(up, -0.9)), V.mul(sideR, 0.4)));
  } else if (st.clip === 'fidget' && st.f >= 8) {   // checking the weapon: raised upright in front of the face
    handR = V.add(V.add(J.shR, V.mul(fwd, 5.5)), V.add(V.mul(up, -6 + 4 * fk), V.mul(sideR, 0.6))); bd = V.norm(V.add(up, V.mul(fwd, 0.18 - 0.1 * fk)));
  } else if (bow && st.clip === 'toss') {   // the trap: swung back past the hip, then released forward at chest height
    handR = st.f === 0 ? V.add(V.add(J.shR, V.mul(fwd, -3.5)), V.add(V.mul(up, -8.5), V.mul(sideR, 1.2))) : V.add(V.add(J.shR, V.mul(fwd, 10)), V.add(V.mul(up, 0.5), V.mul(sideR, -1.2))); bd = fwd;
  } else if (bow && st.clip === 'vault') {   // in the air the free arm flies out for balance
    handR = V.add(V.add(J.shR, V.mul(fwd, st.f === 1 ? -2 : 2)), V.add(V.mul(up, st.f === 1 ? -2 : -6.5), V.mul(sideR, st.f === 1 ? 5 : 2))); bd = fwd;
  } else if (bow && st.clip === 'shoot') {   // drawing: the string hand comes back to the cheek
    handR = st.sky ? V.add(V.add(J.shR, V.mul(fwd, 7 - draw * 6)), V.add(V.mul(up, 5.5 - draw * 4.8), V.mul(sideR, -2.4))) : V.add(V.add(J.shR, V.mul(fwd, 9 - pull * 7.5)), V.add(V.mul(up, rel ? 1.0 : -0.6), V.mul(sideR, rel ? -0.6 : -2.6))); bd = fwd;
  } else if (bow && st.clip !== 'death') {   // walking: the free right hand pumps with the stride
    handR = V.add(V.add(J.shR, V.mul(fwd, 3.5 + J.swingArm * 3)), V.add(V.mul(up, -7.5 + Math.max(0, J.swingArm) * 0.8), V.mul(sideR, 0.6))); bd = fwd;
  } else if (staff && st.clip === 'channel') {   // casting: gather (staff drawn back), release (thrust at the target), follow-through
    const ph = st.f % 3, sky = st.f >= 3 && st.f < 6, set = Math.floor(st.f / 3);
    if (set === 2) {   // the slam: raised high, then planted upright in front, both hands on it
      if (ph === 0) { handR = V.add(V.add(J.shR, V.mul(fwd, 2.5)), V.add(V.mul(up, 5.5), V.mul(sideR, -1))); bd = V.norm(V.add(up, V.mul(fwd, 0.3))); }
      else { handR = V.add(V.add(J.shR, V.mul(fwd, ph === 1 ? 7 : 6)), V.add(V.mul(up, ph === 1 ? -3.5 : -3), V.mul(sideR, -2.2))); bd = V.norm(V.add(up, V.mul(fwd, ph === 1 ? -0.08 : 0.05))); }
    } else if (set === 3) {   // the hurl: the staff held back out of the way
      handR = V.add(V.add(J.shR, V.mul(fwd, -1.5)), V.add(V.mul(up, -6.5), V.mul(sideR, 2.2))); bd = V.norm(V.add(V.add(V.mul(fwd, -0.35), up), V.mul(sideR, 0.3)));
    } else if (ph === 0) { handR = V.add(V.add(J.shR, V.mul(fwd, -0.5)), V.add(V.mul(up, sky ? -1 : -4.5), V.mul(sideR, 2.6))); bd = V.norm(V.add(V.mul(fwd, -0.45), up)); }
    else if (ph === 1 && sky) { handR = V.add(V.add(J.shR, V.mul(fwd, 2)), V.add(V.mul(up, 2.5), V.mul(sideR, 1.2))); bd = V.norm(V.add(V.mul(fwd, 0.25), up)); }   // raised to the sky
    else if (ph === 1) { handR = V.add(V.add(J.shR, V.mul(fwd, 6.5)), V.add(V.mul(up, -2.5), V.mul(sideR, 1.0))); bd = V.norm(V.add(V.mul(fwd, 0.95), up)); }   // thrust at the target
    else { handR = V.add(V.add(J.shR, V.mul(fwd, 4.5)), V.add(V.mul(up, -3.5), V.mul(sideR, 1.8))); bd = V.norm(V.add(V.mul(fwd, 0.5), up)); }
  } else if (staff && st.clip === 'arrive') {   // flung out to the side for balance
    handR = V.add(V.add(J.shR, V.mul(fwd, 4)), V.add(V.mul(up, st.f === 0 ? -4 : -5.5), V.mul(sideR, 5.5))); bd = V.norm(V.add(up, V.mul(sideR, st.f === 0 ? 0.5 : 0.25)));
  } else if (staff && st.clip === 'storm') {   // the staff held high overhead
    handR = V.add(V.add(J.shR, V.mul(fwd, 2)), V.add(V.mul(up, 5), V.mul(sideR, 3))); bd = V.norm(V.add(V.add(up, V.mul(fwd, 0.15)), V.mul(sideR, 0.35)));   // out to the side so it clears the hat
  } else if (staff && st.clip !== 'death') {   // carried at the side, swinging with the walk like a walking stick
    handR = V.add(V.add(J.shR, V.mul(fwd, 2.0 + J.swingArm * 1.8)), V.add(V.mul(up, -7.5 + Math.abs(J.swingArm) * 0.6), V.mul(sideR, 3.4)));
    bd = V.norm(V.add(V.add(V.mul(fwd, 0.04 + J.swingArm * 0.18), up), V.mul(sideR, 0.2)));   // leaning out, clear of the face
  } else if (sw) {
    handR = V.mad(pivot, inPlane(sw.a), sw.r || 6.5); bd = inPlane(bladeA(sw));
  } else if (st.clip === 'bash' || st.clip === 'channel') {   // weapon held back and low, out of the way
    handR = V.add(V.add(J.shR, V.mul(fwd, -1.5)), V.add(V.mul(up, -7), V.mul(sideR, 2.2)));
    bd = V.norm(V.add(V.add(V.mul(fwd, -0.6), V.mul(up, -0.5)), V.mul(sideR, 0.5)));
  } else if (st.clip === 'death') {
    handR = !FEEL_OLD && st.f === 0 ? V.add(J.shR, V.add(V.mul(up, 2), V.mul(sideR, 5))) : V.add(J.shR, [3, 2, -10]); bd = V.norm([1, 0.4, -0.6]);
  } else {
    // guard: blade held out at the side, point up and forward, so it reads from the front too
    // the sword arm swings a little (the blade is carried), rising slightly as it comes forward
    const s = J.swingArm * 1.8;
    handR = V.add(V.add(J.shR, V.mul(fwd, 4 + s)), V.add(V.mul(up, -8.5 + Math.max(0, J.swingArm) * 1.2), V.mul(sideR, 2.6)));
    bd = V.norm(V.add(V.add(V.mul(fwd, 0.55), V.mul(up, 0.7)), V.mul(sideR, 0.45)));
    if (eq.weapon === 'fhammer') { handR = V.add(V.add(J.shR, V.mul(fwd, 4.5 + s * 0.3)), V.add(V.mul(up, -8.5), V.mul(sideR, -3.2))); bd = V.norm(V.add(V.add(V.mul(sideR, -1), V.mul(up, 0.22)), V.mul(fwd, 0.15))); acrossG = true; }   // art A6b: the forge hammer held across the body
    if (eq.weapon === 'spear') { handR = V.add(V.add(J.shR, V.mul(fwd, 1.2 + s * 0.3)), V.add(V.mul(up, -6.5), V.mul(sideR, 4.0))); bd = V.norm(V.add(V.add(up, V.mul(fwd, 0.1)), V.mul(sideR, 0.06))); }   // art A8: the spear stood upright at his side
    if (eq.weapon === 'kgsword') { handR = V.add(V.add(J.shR, V.mul(fwd, 5 + s * 0.2)), V.add(V.mul(up, -8.5), V.mul(sideR, -2.4))); bd = V.norm(V.add(V.add(V.mul(fwd, 0.75), V.mul(sideR, -0.5)), V.mul(up, -0.12))); bothG = true; }   // art A8: the greatsword low across the front
  }
  // a6: the steel crossbow is held level in both hands: low at the belly, raised to the shoulder to shoot
  const xbow = !!XBOW[eq.weapon], xbHold = xbow && st.clip !== 'death' && st.clip !== 'toss' && st.clip !== 'vault' && st.clip !== 'drink';
  let xbL = null;
  if (xbHold) {
    const raised = st.clip === 'shoot';
    bd = st.sky ? V.norm(V.add(V.mul(up, 0.78), V.mul(fwd, 0.63))) : V.norm(V.add(fwd, V.mul(sideR, -0.08)));
    const ctr = V.add(V.add(J.chest, V.mul(fwd, raised ? 5 : 4)), V.add(V.mul(up, st.sky ? 3.5 : raised ? 2.2 : -2.2 + Math.abs(J.swingArm) * 0.4), V.mul(sideR, raised ? 0.8 : 0.3)));
    handR = V.add(V.mad(ctr, bd, -2.5), V.mul(sideR, 1.2));
    xbL = V.add(V.add(V.mad(ctr, bd, 2.5), V.mul(sideR, -1.0)), V.mul(up, -0.6));
  }
  const aR = armTo(J, J.shR, handR, B, 1);
  const armM = plate ? PL : chain ? (scale ? M.GOLD : M.CHAIN) : M.LEATHER;
  const ar = [1.9 + bulk * 0.8, 1.7 + bulk * 0.8, 1.5 + bulk * 0.7, 1.8 + bulk * 0.8];
  const sleeve = eq.chest === 'tunic' ? team : robe ? robeM : jerk ? (JERKIN[eq.chest] || JERKIN.jerkin).sleeve : armM, foreM = eq.chest === 'tunic' ? M.FACE : robe ? robeM : jerk ? (JERKIN[eq.chest] || JERKIN.jerkin).fore || M.LEATHER : armM, handM = plate ? PL : eq.chest === 'tunic' || robe || jerk ? M.FACE : M.LEATHER;   // the jerkin: green sleeves, leather bracers
  if (robe) ar[2] += 1.1;   // bell sleeves widen toward the wrist
  r.cone(J.shR, aR.el, ar[0], ar[1], sleeve); r.cone(aR.el, aR.hand, ar[1], ar[2], foreM);
  { const h = r.sph(aR.hand, ar[3], handM); h.thumb = r.sph(V.add(V.add(aR.hand, V.mul(fwd, 0.9)), V.add(V.mul(sideR, -1.0), V.mul(up, 0.7))), ar[3] * 0.56, handM, { noShadow: true }); }   // round 71: a thumb
  const robeCuff = (a, sh) => {   // round a6: a cuff at the bell sleeve's mouth, and gloves (magus)
    if (!robe) return;
    const d = V.norm(V.sub(a.hand, a.el));
    if (RS.sleeve) { r.cone(sh, a.el, ar[0] + 0.05, ar[1] + 0.05, RS.sleeve); r.cone(a.el, a.hand, ar[1] + 0.05, ar[2] + 0.05, RS.sleeve); }   // sleeves of another cloth over the robe's
    if (RS.cuff) r.cone(V.mad(a.hand, d, -1.6), V.mad(a.hand, d, -0.2), ar[2] + 0.15, ar[2] + 0.25, RS.cuff);
    if (RS.glove) r.sph(a.hand, ar[3] + 0.1, RS.glove);
  };
  robeCuff(aR, J.shR);
  if (st.clip === 'toss' && st.f === 0) { r.cyl(V.mad(aR.hand, up, -1.6), V.mad(aR.hand, up, -0.8), 2.6, M.IRON); for (const s2 of [-1, 1]) r.cone(V.add(V.mad(aR.hand, up, -1.2), V.mul(sideR, s2 * 2.4)), V.add(V.mad(aR.hand, up, 0.6), V.mul(sideR, s2 * 1.4)), 0.6, 0.3, M.STEEL); }   // round 43: the snare's iron jaws in the hand
  // off hand swings against the sword arm: a free hand pumps (elbow bent, rising forward), a
  // shield only rocks
  const offSw = -J.swingArm * (eq.shield === 'none' ? 3.6 : 1.6);
  let handL = V.add(V.add(J.shL, V.mul(fwd, 5.5 + offSw)), V.add(V.mul(up, -7.5 + Math.max(0, offSw) * (eq.shield === 'none' ? 0.7 : 0.3)), V.mul(sideR, -0.5)));
  if (bow && st.clip !== 'death') handL = st.clip === 'shoot' && st.sky ? V.add(V.add(J.shL, V.mul(fwd, 7)), V.add(V.mul(up, 5.5), V.mul(sideR, 0.8)))   // Rain of Arrows: the bow arm up at the sky
    : st.clip === 'shoot' ? V.add(V.add(J.shL, V.mul(fwd, rel ? 10 : 9.5)), V.add(V.mul(up, rel ? 0.6 : -0.6), V.mul(sideR, 0.6)))   // bow arm straight at the target
    : V.add(V.add(J.shL, V.mul(fwd, 3.2 - J.swingArm * 1.2)), V.add(V.mul(up, -7.2), V.mul(sideR, -3.2)));   // bow carried at the side, held out from the leg
  if (xbL) handL = xbL;   // a6: the crossbow's fore-end
  if (st.clip === 'death') handL = !FEEL_OLD && st.f === 0 ? V.add(J.shL, V.add(V.mul(up, 2), V.mul(sideR, -5))) : V.add(J.shL, [2, -3, -9]);   // round 43: flung out by the blow
  if (st.clip === 'bash') handL = V.add(V.add(J.shL, V.mul(fwd, 7.5)), V.add(V.mul(up, -3), V.mul(sideR, 1.5)));   // shield driven forward
  if (st.clip === 'hook') handL = st.f === 2 ? V.add(V.add(handR, V.mul(sideR, -2.2)), V.add(V.mul(up, -0.8), V.mul(fwd, 0.8)))   // both hands on the chain
    : st.f === 1 ? V.add(V.add(J.shL, V.mul(fwd, -2)), V.add(V.mul(up, -6), V.mul(sideR, -1))) : V.add(V.add(J.shL, V.mul(fwd, 5)), V.add(V.mul(up, -4), V.mul(sideR, 0.5)));
  if (st.clip === 'drink' && !drinkR) handL = V.add(V.add(J.head, V.mul(fwd, 3.4)), V.add(V.mul(up, -3.2), V.mul(sideR, -1.8)));   // the free hand brings the flask up
  if (st.clip === 'spin') handL = V.add(V.add(J.shL, V.mul(sideR, -6.5)), V.add(V.mul(up, -2.5), V.mul(fwd, 0.5)));   // the off arm out too, for balance
  if (st.clip === 'channel') {   // open hand: drawn in on the gather, thrust at the target on the release
    const ph = st.f % 3, set = Math.floor(st.f / 3);
    handL = ph === 0 ? V.add(V.add(J.shL, V.mul(fwd, 3)), V.add(V.mul(up, -5), V.mul(sideR, 2.5)))
      : V.add(V.add(J.shL, V.mul(fwd, ph === 1 ? 8.5 : 7)), V.add(V.mul(up, st.f >= 3 ? 1.5 : -0.5), V.mul(sideR, 1.2)));
    if (set === 2 && staff) handL = V.mad(handR, bd, ph === 0 ? -2.8 : 3.2);   // both hands on the staff
    if (set === 3) handL = ph === 0 ? V.add(V.add(J.shL, V.mul(fwd, -3)), V.add(V.mul(up, 1), V.mul(sideR, -2.5))) : V.add(V.add(J.shL, V.mul(fwd, ph === 1 ? 9.5 : 7.5)), V.add(V.mul(up, ph === 1 ? 0.5 : -2), V.mul(sideR, 1)));
  }
  if (st.clip === 'arrive') handL = V.add(V.add(J.shL, V.mul(fwd, 4)), V.add(V.mul(up, st.f === 0 ? -3 : -5), V.mul(sideR, -6)));   // the free arm out
  if (st.clip === 'storm') {   // round 43: the free hand raised, crackling
    handL = V.add(V.add(J.shL, V.mul(fwd, 1.5)), V.add(V.mul(up, 6), V.mul(sideR, -2.5)));
  }
  if (sw) {
    if (list.twoHand && (eq.shield === 'none' || eq.weapon === 'greatsword')) handL = V.mad(handR, bd, -2.6);   // lower on the haft
    else {   // counterbalance: the off arm reaches toward the target in the wind-up, pulls back on the strike
      const lf = 4 + (sw.tw || 0) * 6;
      handL = V.add(V.add(J.shL, V.mul(fwd, lf)), V.add(V.mul(up, eq.shield === 'none' ? -5.5 : -6.5), V.mul(sideR, -1.8)));
    }
  }
  if (acrossG) handL = V.mad(handR, bd, 7.5);   // the other hand further along the haft
  if (bothG) handL = V.mad(handR, bd, -3.2);   // art A8: the other hand below it on the grip
  const aL = armTo(J, J.shL, handL, B, -1);
  if (st.clip === 'drink') flask(drinkR ? aR.hand : aL.hand);
  r.cone(J.shL, aL.el, ar[0], ar[1], sleeve); r.cone(aL.el, aL.hand, ar[1], ar[2], foreM);
  { const h = r.sph(aL.hand, ar[3], handM); h.thumb = r.sph(V.add(V.add(aL.hand, V.mul(fwd, 0.9)), V.add(V.mul(sideR, 1.0), V.mul(up, 0.7))), ar[3] * 0.56, handM, { noShadow: true }); }
  robeCuff(aL, J.shL);
  // round 72b: skills that sweep an arm or a blade leave an arc too
  if (st.clip === 'hook' && st.f === 1) smearArc(r, J.shR, fwd, up, 2.1, 0.15, 0, V.len(V.sub(aR.hand, J.shR)) + 2.5, [32, 30, 29], 3.2);   // the throw: over the shoulder and out
  if (st.clip === 'toss' && st.f === 1) smearArc(r, J.shR, fwd, up, -1.8, 0.1, 0, V.len(V.sub(aR.hand, J.shR)) + 2, [27, 26, 25], 2.6);   // the underhand swing
  if (st.clip === 'channel' && st.f === 10) {   // the hurl: a streak of fire from behind the ear to the open hand, embers shaken loose
    smearArc(r, J.shL, fwd, up, 2.3, 0.0, 0, V.len(V.sub(aL.hand, J.shL)) + 5, [17, 16, 15], 5.6);
    for (const [f2, z2, rr] of [[5, 6.5, 1.0], [1.5, 8.5, 0.8], [-2, 8, 0.7]]) r.sph(V.add(V.add(J.shL, V.mul(fwd, f2)), V.mul(up, z2)), rr, M.FIREM, { noShadow: true });
  }
  if (st.clip === 'channel' && st.f === 9) { const fb = V.add(V.mad(aL.hand, up, 2.6), V.mul(fwd, 0.8)); for (const [f2, s2, z2] of [[-2.2, 0, 5.5], [-0.6, 1.8, 4.6], [-0.6, -1.8, 4.6]]) r.cone(fb, V.add(V.add(fb, V.mul(fwd, f2)), V.add(V.mul(sideR, s2), V.mul(up, z2))), 1.7, 0.3, M.FIREM, { noShadow: true }); }   // the fire held by the ear licks upward
  if (st.clip === 'storm') r.sph(V.mad(aL.hand, up, 1.6), 1.9, M.ARCANE, { noShadow: true });   // round 43: the storm crackling in the raised hand
  if (st.clip === 'channel' && st.f >= 9) { if (st.f === 9) { const fb = V.add(V.mad(aL.hand, up, 2.6), V.mul(fwd, 0.8)); r.sph(fb, 3.3, M.FIREM, { noShadow: true }); r.sph(V.mad(fb, up, 2.6), 1.6, M.FIREM, { noShadow: true }); } }   // the hurl: a fireball held in the cocked hand, gone once thrown
  else if (st.clip === 'channel' && st.f >= 6) { if (st.f === 7) { const ft = V.add(V.mad(aR.hand, up, -12), V.mul(fwd, 1.5)); for (const [s, h] of [[-1, 2.2], [0, 3.4], [1, 2.2]]) r.cone(V.add(ft, V.mul(sideR, s * 3.6)), V.add(V.mad(ft, up, h + 2.5), V.mul(sideR, s * 5)), 1.6, 0.4, M.ICE, { noShadow: true }); } }   // ice shards spring up round the staff's foot   // the slam: frost bursting at the staff's foot
  else if (st.clip === 'channel' && st.f % 3 !== 0) r.sph(V.mad(aL.hand, fwd, 2.2), st.f % 3 === 1 ? 1.9 : 1.4, staff ? M.ARCANE : M.HOLY, { noShadow: true });
  if (jerk && (JERKIN[eq.chest] || {}).cuff) for (const a of [aR, aL]) { const d = V.norm(V.sub(a.hand, a.el)), [c0, c1, w0, w1] = JERKIN[eq.chest].cuffAt || [-3.2, -1.9, 0.3, 0.4]; r.cone(V.mad(a.hand, d, c0), V.mad(a.hand, d, c1), ar[2] + w0, ar[2] + w1, JERKIN[eq.chest].cuff); }   // a8: a cuff at the wrist (fur, or steel bands)
  if (plate) for (const a of [aR, aL]) r.sph(a.el, 2.2, PL);   // elbow cops
  // pauldrons: big rounded plates with a bright lower rim and a rivet (plate); pads otherwise
  if (eq.chest !== 'tunic' && !robe && !jerk) for (const [sh, sd] of [[J.shL, -1], [J.shR, 1]]) {
    const c = plate ? V.add(V.mad(sh, up, 1.4), V.mul(sideR, sd * 1.2)) : V.mad(sh, up, 1.0);
    r.ell(c, plate ? [5.0, 5.0, 4.4] : [4.2, 4.0, 3.4], plate ? PL : M.LEATHER, frameAlong(fwd, up), { mf: eq.chest === 'darkplate' ? (p => V.dot(V.sub(p, c), up) < -2.6 ? M.MARKB : 0) : gothic ? (p => V.dot(V.sub(p, c), up) < -1.7 ? M.GOLD : 0) : null });
    if (plate) r.sph(V.add(V.add(c, V.mul(fwd, 4.4)), V.mul(up, -1)), 0.9, gothic ? M.GOLD : M.STEEL);
    if (gothic) r.cone(V.add(V.mad(c, up, 2.6), V.mul(sideR, sd * 1.5)), V.add(V.mad(c, up, 9), V.mul(sideR, sd * 4)), 2.0, 0.3, M.DSTEEL);   // a spike on each shoulder
  }
  if (robe && RS.collar) {   // round a6b: a collar round the neck (fur, or a hood lying back on the shoulders)
    r.ell(V.add(V.mad(J.chest, up, 3.5), V.mul(fwd, 0.2)), [4.3, 5.4, 2.2], RS.collar, frameAlong(fwd, up));
    if (RS.hood) r.ell(V.add(V.mad(J.chest, up, 2.6), V.mul(fwd, -3.9)), [2.4, 3.9, 3.6], RS.collar, frameAlong(fwd, up));
  }
  if (robe && RS.mantle) for (const [sh, sd] of [[J.shL, -1], [J.shR, 1]]) {   // round a6: a mantle: a broad collar flaring over each shoulder (trimmed at its lower edge)
    const c = V.add(V.mad(sh, up, 1.2), V.mul(sideR, sd * -0.6));
    r.ell(c, [4.4, 4.4, 2.9], RS.mantle, frameAlong(fwd, up), { mf: RS.trim ? (p => V.dot(V.sub(p, c), up) < (RS.tz || -0.9) ? RS.trim : 0) : null });
  }
  if (wset) warriorSet(r, wset, J);
  for (const q of r.p) if (q.thumb) { q.thumb.m = q.m; q.thumb.mf = q.mf; }   // a thumb wears what its hand wears
  // slim every body part made so far (centers stay put), then build the head at normal size and
  // scale it up about its center
  for (const q of r.p) { if (q.a) { q.ra *= HERO_BK; q.rb *= HERO_BK; } if (q.r) q.r *= HERO_BK; if (q.rad) q.rad = V.mul(q.rad, HERO_BK); if (q.half) q.half = V.mul(q.half, HERO_BK); }
  // a short cloak hanging from the shoulders: it streams back and flutters when he runs, swings
  // forward when he stops, and follows the shoulders through a swing (secondary motion)
  if (!robe && !(jerk && !SET_CAPE[eq.set]) && !(wset && !SET_CAPE[eq.set])) {   // a6: a plain jerkin wears no cloak (the quiver shows); art A8: nor does a warrior set (its back shows)
    const c = st.clip, ph = st.f / 8 * Math.PI * 2;
    let th = 0.14, side = 0;
    if (c === 'walk') { th = 0.62 + 0.12 * Math.sin(ph * 2); side = J.swingArm * 0.18; }
    else if (c === 'go') th = 0.45;
    else if (c === 'stop') th = -0.12;
    else if (c === 'bash') th = 0.75;
    else if (atkIndex(c) >= 0) { th = 0.22 + Math.abs(J.twist) * 0.6; side = -J.twist * 0.5; }
    else if (c === 'idle') th = 0.12 + (st.f % 4 === 2 ? 0.03 : 0);
    const dn = V.norm(V.add(V.add(V.mul(up, -Math.cos(th)), V.mul(fwd, -Math.sin(th))), V.mul(sideR, side)));
    const a1 = V.norm(V.sub(sideR, V.mul(dn, V.dot(sideR, dn)))), a0 = V.cross(a1, dn);
    const top = V.add(V.mad(J.chest, up, B.shZ + 0.6), V.mul(fwd, -2.6)), L = 8.2;
    const SC = SET_CAPE[eq.set], LL = SC ? SC.len : L;   // round 43: a set's cloak, longer and in its colors
    r.box(V.mad(top, dn, LL / 2), [0.5, B.shW * (SC ? 0.86 : 0.78), LL / 2], SC ? SC.m : TEAM[eq.cape] || CAPE_M, [a0, a1, dn], { mf: p => V.dot(V.sub(p, top), dn) > LL - 1.2 ? (SC ? SC.hem : M.LEATHER) : 0 });
  }
  if (bow && !XBOW[eq.weapon]) {   // a quiver on the back, from behind the right shoulder down to the left hip, fletchings showing
    const qa = V.add(V.add(V.mad(J.chest, up, 6.4), V.mul(fwd, -4.6)), V.mul(sideR, 3.0)), qb = V.add(V.add(V.mad(J.chest, up, -4.4), V.mul(fwd, -4.0)), V.mul(sideR, -2.2));
    const qd = V.norm(V.sub(qa, qb));
    const deep = eq.shield === 'quiver_deep';   // round 43: the deep quiver: wider, a gold band, five arrows showing
    r.cone(qb, qa, deep ? 2.2 : 1.8, deep ? 2.7 : 2.2, M.LEATHER, { mf: p => V.dot(V.sub(p, qa), qd) > -1.0 ? M.DARK : deep && Math.abs(V.dot(V.sub(p, qa), qd) + 3.5) < 0.6 ? M.GOLD : 0 });
    if (deep) for (const [o, m] of [[-1.8, M.CLOTH_RED], [1.8, M.CLOTH_RED]]) { const b0 = V.add(V.mad(qa, qd, 0.2), V.mul(sideR, o)); r.cone(b0, V.mad(b0, qd, 3.2), 0.9, 0.4, m, { noShadow: true }); }
    for (const [o, m] of [[-0.9, M.CLOTH_WHITE], [0.2, M.CLOTH_RED], [1.1, M.CLOTH_WHITE]]) { const b0 = V.add(V.mad(qa, qd, 0.4), V.mul(sideR, o)); r.cone(b0, V.mad(b0, qd, 3.6), 0.9, 0.4, m, { noShadow: true }); }
  }
  const hr0 = r.p.length;
  // head
  const hd = J.head;
  const helmF = frameAlong(fwd, up), hairM = HAIRM[eq.hair] || M.HAIR_O, bald = eq.hair === 'bald';
  const xHelm = GEAR_EXTRA.helm[eq.helm];
  if (xHelm) xHelm(r, { hd, fwd, up, sideR, helmF, eq, st, J });
  else if (eq.helm === 'none' || eq.helm === 'cap' || eq.helm === 'spangen' || eq.helm === 'hat' || eq.helm === 'hat_conj' || eq.helm.startsWith('hood') || eq.helm.startsWith('rhood')) {
    // chibi face (round 13 pass 2): light, nearly flat skin; small dark eyes under short brows, a
    // tiny mouth; the hairline is painted on the head and the hair mass sits on top
    { const bare = eq.helm === 'none' && !bald, hood = eq.helm.startsWith('rhood') || eq.helm.startsWith('hood'), under = bald || bare ? 0 : hood ? 2 : 1;
      const uh = HAIRM[eq.hair] || (eq.helm.startsWith('hat') || eq.helm.startsWith('hood') ? M.HAIR : eq.helm.startsWith('rhood') ? M.STRAWM : M.HAIR_O);
      r.ell(hd, [4.3, 4.3, 4.5], M.FACE, helmF, { mf: faceMf(hd, fwd, sideR, up, { line: bare, under, hair: bare ? hairM : uh, brow: eq.hair === 'grey' ? M.IRON : 0 }) });
      faceParts(r, hd, fwd, sideR, up, !hood); }
    if (eq.helm === 'cap') r.ell(V.mad(hd, up, 2.0), [4.7, 4.6, 3.3], M.STEEL, helmF, { mf: p => V.dot(V.sub(p, hd), up) < 0.6 ? M.LEATHER : 0 });
    if (eq.helm === 'hat' || eq.helm === 'hat_conj') {   // wizard hat: a wide brim, a tall crown that bends back to a point, gold band (round 43: the conjurer's in navy)
      const hm = eq.hatV ? eq.hatV.m : eq.helm === 'hat_conj' ? M.CLOTH_NAVY : M.CLOTH_PURPLE, base = V.add(V.mad(hd, up, 3.3), V.mul(fwd, -0.8));   // set high and tipped back so the eyes show
      r.group(() => {
        r.cyl(base, V.mad(base, up, 0.7), 5.2, hm);   // art A7: a narrower brim and a shorter crown for the smaller head
        const sway = headSway(st), mid = V.add(V.mad(base, up, 4.0), V.mul(fwd, -0.9 - sway[0] * 0.3)), tip = V.add(V.mad(base, up, 7.3 + sway[1]), V.add(V.mul(fwd, -3.1 - sway[0]), V.mul(sideR, sway[2])));   // round 43: the tip lags behind the head
        r.cone(V.mad(base, up, 0.5), mid, 3.6, 2.0, hm, { mf: p => V.dot(V.sub(p, base), up) < 1.5 ? (eq.hatV ? eq.hatV.band : M.GOLD) : 0 });
        r.cone(mid, tip, 2.0, 0.5, hm);
      });
    }
    if (eq.helm === 'spangen') {   // round 43: the spangenhelm: a riveted cone with gold ribs and a nasal bar over the face
      const hc = V.mad(hd, up, 2.2);   // art A5 (the user's snug-fit mock-up): fitted to the head
      r.ell(hc, [4.7, 4.6, 3.4], M.STEEL, helmF, { mf: p => { const q = V.sub(p, hc); return Math.abs(V.dot(q, sideR)) < 0.5 || Math.abs(V.dot(q, fwd)) < 0.5 || V.dot(q, up) < -2.1 ? M.GOLD : 0; } });
      r.cone(V.mad(hc, up, 2.2), V.mad(hc, up, 5.4), 2.3, 0.3, M.STEEL);
      r.box(V.add(V.mad(hd, up, 0.2), V.mul(fwd, 4.3)), [0.5, 0.6, 1.8], M.STEEL, helmF);
    }
    if (eq.helm === 'hood' || eq.helm === 'hood_sage' || eq.helm === 'hood_dark') {   // (round 67: Maelis's dark hood)   // a deep hood: a shell over the back and top of the head, face left open (the sage's: sage green with a gold hem)
      const hc = V.add(V.mad(hd, up, 0.7), V.mul(fwd, -1.3)), sage = eq.helm === 'hood_sage', hoodM = sage ? M.CLOTH_GREEN : eq.helm === 'hood_dark' ? M.CLOTH_DARK : M.CLOTH_BLUE;
      r.ell(hc, [4.5, 4.6, 4.75], hoodM, helmF, sage ? { mf: p => V.dot(V.sub(p, hc), fwd) > 3.2 ? M.GOLD : 0 } : undefined);
      r.cone(V.add(V.mad(hd, up, 2.6), V.mul(fwd, -4.0)), V.add(V.mad(hd, up, 0.2), V.mul(fwd, -7.2)), 2.0, 0.5, hoodM);   // the point falls behind
    }
    if (eq.helm.startsWith('rhood')) {   // the ranger's hood: a shell over the head with the face open, a pointed back and a cowl on the shoulders
      const hm = eq.helm === 'rhood_dark' ? M.CLOTH_SHADOW : eq.helm === 'rhood_night' ? M.CLOTH_NAVY : M.CLOTH_GREEN, fur = eq.helm === 'rhood_hunter', hc = V.add(V.mad(hd, up, 0.8), V.mul(fwd, -1.0));
      r.group(() => {
        r.ell(hc, [4.55, 4.65, 4.8], hm, helmF);   // art A7: hugging the head; set back, so the face stands out of its opening
        { const sw = headSway(st); r.cone(V.add(V.mad(hd, up, 3.0), V.mul(fwd, -3.4)), V.add(V.add(V.mad(hd, up, 1.0 + sw[1] * 0.8), V.mul(fwd, -6.6 - sw[0] * 1.2)), V.mul(sideR, sw[2])), 2.2, 0.5, hm); }   // round 43: the hood's point streams back
        r.ell(V.add(V.mad(hd, up, -4.2), V.mul(fwd, -1.2)), [3.3, 4.5, 1.3], fur ? M.FUR : hm, helmF);   // the cowl, kept small so the jerkin shows (the hunter's: a fur mantle)
      });
    }
    if (eq.beard) r.ell(V.add(V.mad(hd, up, -3.2), V.mul(fwd, 2.4)), [2.6, 3.3, 2.3], bald ? M.HAIR : hairM, helmF, { noShadow: true });   // a big round beard
    if (eq.helm === 'none' && !bald) {
      // one mass of hair: a cap over the top and back, a fringe falling over the brow, and a few
      // chunky spikes on the crown and the back only (nothing sticks out at the sides)
      const at = (f2, s2, z2) => V.add(V.add(V.mad(hd, fwd, f2), V.mul(sideR, s2)), V.mul(up, z2));
      // round 40a: the hair trails a little when running, swings forward when stopping, flies out in a spin
      const hairT = st.clip === 'walk' || st.clip === 'go' ? -0.45 : st.clip === 'stop' || st.clip === 'skid' || st.clip === 'pivot' ? 0.35 : st.clip === 'spin' ? -0.3 : 0, hairS = st.clip === 'spin' ? 0.5 : 0;
      const dirOf = (f2, s2, z2) => V.norm(V.add(V.add(V.mul(fwd, f2 + (f2 < 0 ? hairT : hairT * 0.3)), V.mul(sideR, s2 + hairS)), V.mul(up, z2)));
      r.group(() => {
        r.ell(at(-0.9, 0, 1.9), [4.6, 4.75, 3.3], hairM, helmF, { noShadow: true });
        // [base f, s, z, direction f, s, z, length, radius]
        for (const [bf, bs, bz, df, ds, dz, len, rr] of [
          [1.6, 0.9, 3.6, 0.5, 0.2, 1, 2.0, 1.5], [-0.6, -0.4, 4.3, -0.4, -0.1, 1, 2.3, 1.7], [-1.8, 1.7, 3.6, -0.8, 0.4, 0.8, 2.8, 1.5],
          [-1.8, -1.9, 3.5, -0.8, -0.4, 0.8, 2.6, 1.5], [-3.6, 0.2, 2.4, -1, 0, 0.35, 2.8, 1.6], [-3.4, 1.9, 0.9, -1, 0.35, -0.2, 2.2, 1.3], [-3.4, -1.9, 0.9, -1, -0.35, -0.2, 2.2, 1.3]])
          if (eq.hair !== 'grey') r.cone(at(bf, bs, bz), V.mad(at(bf, bs, bz), dirOf(df, ds, dz), len), rr, 0.3, hairM, { noShadow: true });   // the old keep smooth hair
        for (const sd of [-1.5, 0, 1.5]) {   // fringe: locks falling forward over the forehead
          const base = at(2.4, sd, 3.5);
          r.cone(base, V.add(at(4.1, sd * 1.25, 1.7), V.mul(sideR, sd * 0.2)), 1.25, 0.35, hairM, { noShadow: true });
        }
      });
    }
  } else {
    if (eq.helm === 'barbute') {
      // barbute: close round helm with a T-shaped face opening
      const hc = V.mad(hd, up, 0.1);   // art A5 (the user's snug-fit mock-up): an upright shell fitted to the head
      r.ell(hc, [4.45, 4.15, 5.3], M.STEEL, helmF, { mf: p => {
        const q = V.sub(p, hc), f2 = V.dot(q, fwd), s2 = Math.abs(V.dot(q, sideR)), z2 = V.dot(q, up);
        if (f2 < 1.2) return 0;
        return (Math.abs(z2 - 1.4) < 1.0 && s2 < 3.1) || (s2 < 1.25 && z2 < 1.4 && z2 > -3.2) ? M.DARK : 0;   // a bold T   // set high and wide so it reads from above
      } });
      r.box(V.mad(hc, up, 4.95), [2.6, 0.5, 0.55], M.STEEL, helmF);   // a low ridge, not a fin
    } else if (eq.helm === 'great' || eq.helm === 'crown' || eq.helm === 'bascinet') {
      // great helm: tall dome with a raised crest ridge and a barred visor plate on the front
      const hc = V.mad(hd, up, 0.1);   // art A5 (the user's snug-fit mock-up): an upright shell fitted to the head
      r.ell(hc, [4.5, 4.2, 5.4], PL, helmF);
      r.box(V.mad(hc, up, 5.05), [2.6, 0.5, 0.55], PL, helmF);   // a low ridge, not a fin
      const vc = V.add(V.mad(hd, fwd, 3.85), V.mul(up, -0.3));
      const vf = frameAlong(V.norm(V.add(fwd, V.mul(up, 0.45))), up);   // tipped up toward the light so the plate reads bright
      r.box(vc, [1.0, 3.4, 2.7], M.STEEL, vf, { bias: 1, mf: p => {   // a face plate filling the front, with a bold grille: three dark slots between bars
        const q = V.sub(p, vc), s2 = V.dot(q, sideR), z2 = V.dot(q, vf[2]);
        if (V.dot(q, vf[0]) < 0.7 || Math.abs(z2) > 2.0) return 0;
        for (const c of [-1.45, 0, 1.45]) if (Math.abs(s2 - c) < 0.5) return M.DARK;
        return 0;
      } });
      for (const sd of [-1, 1]) r.sph(V.add(V.add(V.mad(hd, fwd, 2.5), V.mul(sideR, sd * 3.5)), V.mul(up, 0.0)), 0.9, M.STEEL);   // visor rivets
      if (eq.helm === 'bascinet') { r.cone(V.mad(hc, up, 3.9), V.add(V.mad(hc, up, 7.6), V.mul(fwd, -1.3)), 2.8, 0.4, PL); { const sn = V.add(V.mad(vc, fwd, 2.2), V.mul(up, -0.4)); r.cone(vc, sn, 1.9, 0.7, PL, { mf: p => { const q = V.sub(p, vc), t = V.dot(q, fwd), u = V.dot(q, sideR); return t > 0.9 && t < 1.9 && Math.abs(Math.abs(u) - 0.75) < 0.32 ? M.DARK : 0; } }); }   /* the snout, with breathing holes */ }   // round 43: the bascinet's pointed skull and snouted visor
      if (eq.helm === 'crown') {   // a gold circlet with points and a red stone
        r.cyl(V.mad(hc, up, 2.3), V.mad(hc, up, 3.7), 4.15, M.GOLD);   // a bolder circlet
        const oak = hasFx(eq, 'oak');   // the Oak King's crown sprouts leaves and a green stone
        for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, b = V.add(V.mad(hc, up, 3.5), V.add(V.mul(fwd, Math.cos(a) * 3.8), V.mul(sideR, Math.sin(a) * 3.8))); r.cone(b, V.mad(b, up, 2.6), oak ? 1.3 : 1.15, 0.2, oak ? M.LEAFM : M.GOLD); }
        r.sph(V.add(V.mad(hc, up, 2.75), V.mul(fwd, 4.2)), 0.8, oak ? M.EYE_GRN : M.EYE_RED, { noShadow: true });
      }
    } else {
    r.ell(V.mad(hd, up, -0.2), [4.5, 4.2, 5.2], M.SLATE, helmF, { mf: p => {   // art A5 (dark blued steel, as in the mock-up) (the user's snug-fit mock-up): fitted to the head
      const q = V.sub(p, hd), f2 = V.dot(q, fwd), s2 = V.dot(q, sideR), z2 = V.dot(q, up);
      if (Math.abs(z2 - 1.9) < 0.65) return M.GOLD;
      if (f2 > 1.9 && Math.abs(z2 - 0.3) < 0.75 && Math.abs(s2) < 3.4) return M.DARK;            // eye slit
      if (f2 > 2.6 && Math.abs(s2) < 0.5 && z2 < 0 && z2 > -3.3) return M.DARK;                 // breath slit
      return 0;
    } });
    r.box(V.mad(hd, up, 4.7), [2.4, 0.5, 0.55], M.GOLD, helmF);
      for (const s of [-1, 1]) {
        const a = V.add(V.mad(hd, up, 2.3), V.mul(sideR, s * 3.9)), b = V.add(V.mad(hd, up, 4.2), V.mul(sideR, s * 5.8)), c = V.add(V.add(V.mad(hd, up, 7.2), V.mul(sideR, s * 6.1)), V.mul(fwd, 1.0));
        r.group(() => { r.cone(a, b, 1.25, 0.95, M.HORN); r.cone(b, c, 0.95, 0.35, M.HORN); });   // big enough to read at 1x
      }
    }
  }
  if (hvar) helmVar(r, hvar, hr0, hd, up);
  setHead(r, eq, hd, fwd, up, sideR, helmF);   // round 43: a set's crest, feather, scarf or star
  {   // the head (skin, hair, helm) drawn big about its center
    const HK = HERO_HK, sc = q => V.add(hd, V.mul(V.sub(q, hd), HK));
    for (const q of r.p.slice(hr0)) {
      if (q.c) q.c = sc(q.c); if (q.a) { q.a = sc(q.a); q.b = sc(q.b); q.ra *= HK; q.rb *= HK; }
      if (q.r) q.r *= HK; if (q.rad) q.rad = V.mul(q.rad, HK); if (q.half) q.half = V.mul(q.half, HK);
      if (q.mf) { const f0 = q.mf; q.mf = (p, n) => f0(V.add(hd, V.mul(V.sub(p, hd), 1 / HK)), n); }
    }
  }
  const sh0 = r.p.length;
  // shield on the left forearm, face turned outward
  if (eq.shield !== 'none' && !eq.shield.startsWith('quiver')) {   // (a quiver is worn on the back, drawn with the bow)
    const n = V.norm(V.add(V.mul(fwd, 0.75), V.mul(sideR, -0.65)));
    const c = V.mad(V.mad(aL.hand, n, 1.6), up, 1.5);
    const ax = [n, V.norm(V.cross(up, n)), up];
    const big = eq.shield === 'kite';
    if (eq.shield === 'tower') {   // tall rectangle: team field, iron rim, gold stripe
      const tc = V.mad(c, up, 0.8);
      const grave = hasFx(eq, 'grave');   // Gravewarden: dark hide, bone rim and stripe
      r.box(tc, [0.8, 4.4, 8.2], grave ? M.HIDE : team, ax, { mf: p => { const q = V.sub(p, tc), u = Math.abs(V.dot(q, ax[1])), v = Math.abs(V.dot(q, ax[2])); return u > 3.5 || v > 7.3 ? (grave ? M.BONE : M.IRON) : u < 0.8 ? (grave ? M.BONE : M.GOLD) : 0; } });
    } else if (eq.shield === 'targe') {   // round 43: the targe: dark leather over wood, a ring of brass studs, a spiked boss
      r.ell(c, [1.1, 5.0, 5.0], M.LEATHER, ax, { mf: p => { const q = V.sub(p, c), a = V.dot(q, ax[1]), b = V.dot(q, ax[2]), d2 = (a * a + b * b) / 25; if (d2 > 0.8) return M.IRON; if (Math.abs(d2 - 0.42) < 0.07 && Math.abs(Math.sin(Math.atan2(b, a) * 4)) > 0.75) return M.GOLD; return 0; } });
      r.cone(V.mad(c, ax[0], 0.8), V.mad(c, ax[0], 3.4), 1.3, 0.2, M.STEEL);
    } else if (eq.shield === 'heater') {   // round 43: the heater: a flat top, a pointed foot, a gold chevron on the team field
      const hc = V.mad(c, up, 0.6), rad = [1.0, 4.8, 6.4];
      r.ell(hc, rad, team, ax, { mf: p => { const q = V.sub(p, hc), u = V.dot(q, ax[1]) / rad[1], v = V.dot(q, ax[2]) / rad[2]; if (v > 0.62) return M.IRON; if (u * u + v * v > 0.66) return M.GOLD; if (Math.abs(v + Math.abs(u) * 1.1 - 0.15) < 0.13) return M.GOLD; return 0; } });
      r.box(V.mad(hc, ax[2], 5.6), [1.1, 4.9, 0.9], M.IRON, ax);   // the flat top edge
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
  if (svar) shieldVar(r, svar, sh0);
  // weapon
  if (eq.weapon === 'none') { if (st.clip === 'death') deathTip(r, B, st.f, -1); return r; }
  const g = aR.hand;
  const wide = V.norm(V.cross(bd, V.len(V.cross(bd, up)) > 0.3 ? up : fwd));
  const wf = [bd, wide, V.cross(bd, wide)];
  const aim = skyShot ? V.norm(V.add(V.mul(up, 0.78), V.mul(fwd, 0.63))) : fwd;   // where the arrow points
  const bowUp = volley ? V.norm(V.add(V.mul(up, 0.5), V.mul(sideR, -0.87))) : skyShot ? V.norm(V.sub(up, V.mul(aim, V.dot(up, aim) * 1.0)).map((v, i) => v + (i === 2 ? 0 : 0))) : up;   // round 43: canted over for the volley
  if (xbow) {   // a6: the steel crossbow: a wooden stock along the aim, a steel prod across its front, the string back to the nut, a bolt in the groove
    const XB = XBOW[eq.weapon];   // a8: the Bronze Arbalest: a bronze prod, bronze fittings on the stock
    const xg = xbHold ? aR.hand : aL.hand, xd = xbHold ? bd : V.norm(V.add(fwd, V.mul(up, -0.55))), across = V.norm(V.cross(up, xd)), xu = V.cross(xd, across), nose = V.mad(xg, xd, 9.5);
    r.group(() => { r.box(V.mad(xg, xd, 3.6), [6.4, 0.95, 1.05], XB.stock, [xd, across, xu]); r.box(V.add(V.mad(xg, xd, -2.2), V.mul(xu, -0.7)), [1.7, 0.95, 1.6], XB.stock, [xd, across, xu]); });
    if (XB.fit) { r.box(V.mad(xg, xd, 8.4), [1.1, 1.15, 1.25], XB.fit, [xd, across, xu]); r.box(V.add(V.mad(xg, xd, -3.2), V.mul(xu, -0.7)), [0.6, 1.1, 1.75], XB.fit, [xd, across, xu]); }
    const bendL = V.add(V.mad(nose, across, -3.4), V.mul(xd, -0.5)), bendR = V.add(V.mad(nose, across, 3.4), V.mul(xd, -0.5));
    const tipL = V.add(V.mad(nose, across, -5.8), V.mul(xd, -2.5)), tipR = V.add(V.mad(nose, across, 5.8), V.mul(xd, -2.5));
    r.group(() => { r.cone(nose, bendL, 1.1, 0.95, XB.prod); r.cone(bendL, tipL, 0.95, 0.7, XB.prod); r.cone(nose, bendR, 1.1, 0.95, XB.prod); r.cone(bendR, tipR, 0.95, 0.7, XB.prod); });
    if (XB.fit) { for (const [b, t] of [[bendL, tipL], [bendR, tipR]]) r.cone(V.add(b, V.mul(V.sub(t, b), 0.55)), t, 1.05, 0.95, XB.fit); r.cyl(V.mad(nose, across, -1.1), V.mad(nose, across, 1.1), 1.35, XB.fit); }   // a8: bronze-capped prod tips, a bronze collar at the nose
    const loosed = st.clip === 'shoot' && st.f >= 2, nut = V.mad(xg, xd, loosed ? 6.5 : 1.6);
    r.cone(tipL, nut, 0.3, 0.3, M.CLOTH_WHITE, { noShadow: true }); r.cone(nut, tipR, 0.3, 0.3, M.CLOTH_WHITE, { noShadow: true });
    if (!loosed) { r.cone(V.mad(nut, xu, 0.9), V.add(V.mad(nose, xd, 1.4), V.mul(xu, 0.9)), 0.4, 0.4, M.WOOD, { noShadow: true }); r.cone(V.add(V.mad(nose, xd, 1.2), V.mul(xu, 0.9)), V.add(V.mad(nose, xd, 2.8), V.mul(xu, 0.9)), 0.6, 0.15, M.STEEL, { noShadow: true }); }
    if (eq.ench) for (const t of [tipL, tipR]) r.sph(t, 1.3, eq.ench === 'fire' ? M.FIREM : M.ICE, { noShadow: true });
    // a bolt case at the right hip, three bolts showing
    const bc = V.add(V.add(V.mad(J.pelvis, sideR, 4.3), V.mul(fwd, 0.6)), V.mul(up, -1.2));
    r.box(bc, [1.5, 1.1, 2.2], M.LEATHER, frameAlong(fwd, up));
    for (const o of [-0.8, 0, 0.8]) { const b0 = V.add(V.mad(bc, up, 2.0), V.mul(fwd, o)); r.cone(b0, V.mad(b0, up, 2.2), 0.8, 0.4, M.CLOTH_WHITE, { noShadow: true }); }
    if (st.clip === 'death') deathTip(r, B, st.f, -1);
    return r;
  }
  if (bow) {   // the bow in the left hand: two curved limbs and the string, pulled back to the right hand while drawing
    const BX = BOWX[eq.weapon], c = aL.hand, back = V.mul(aim, -1), lm = hasFx(eq, 'wind') ? M.STEEL : BX ? BX.m : eq.weapon === 'bow_horn' ? M.HORN : eq.weapon === 'bow_war' ? M.BARK : M.WOOD, L = BX ? BX.L : eq.weapon === 'bow_long' || eq.weapon === 'bow_war' ? 12.5 : 10;
    const bend = 1.8 + draw * 1.6;   // the limbs bend further at full draw
    const tip = sd2 => V.add(V.mad(c, bowUp, sd2 * L), V.mul(back, bend + (eq.weapon === 'bow_horn' ? -1.6 : 0))), mid = sd2 => V.add(V.mad(c, bowUp, sd2 * L * 0.55), V.mul(back, -0.6));
    r.group(() => { for (const sd2 of [1, -1]) { r.cone(c, mid(sd2), 1.3, 1.1, lm); r.cone(mid(sd2), tip(sd2), 1.1, 0.6, lm); } });
    r.cone(V.mad(c, bowUp, -1.2), V.mad(c, bowUp, 1.2), 1.15, 1.15, BX && BX.grip || M.LEATHER);   // grip
    if (BX && BX.cap) for (const sd2 of [1, -1]) r.cone(tip(sd2), V.mad(tip(sd2), bowUp, sd2 * 1.6), 1.0, 0.3, BX.cap);   // a6: the ironwood longbow's pale horn tips
    if (BX && BX.curl) for (const sd2 of [1, -1]) r.cone(tip(sd2), V.add(V.mad(tip(sd2), bowUp, sd2 * 1.2), V.mul(back, -BX.curl)), 0.7, 0.4, BX.m);   // a6: the recurve's tips flick forward
    if (BX && BX.bands) for (const sd2 of [1, -1]) for (const [a, b, t] of [[c, mid(sd2), 0.6], [mid(sd2), tip(sd2), 0.5]]) { const q = V.add(a, V.mul(V.sub(b, a), t)), d = V.norm(V.sub(b, a)); r.cyl(V.mad(q, d, -0.4), V.mad(q, d, 0.4), 1.45, BX.bands); }   // a8: steel bands round the longbow's limbs
    if (hasFx(eq, 'wind')) for (const sd2 of [1, -1]) { const t = tip(sd2); r.cone(t, V.add(V.mad(t, bowUp, -sd2 * 0.5), V.add(V.mul(back, 2.5), V.mul(up, -3.5))), 0.7, 0.3, M.CLOTH_GREEN, { noShadow: true }); }   // round 43: Windrunner: silver limbs, green ribbons at the tips
    if (eq.weapon === 'bow_war') for (const sd2 of [1, -1]) r.cone(tip(sd2), V.mad(tip(sd2), bowUp, sd2 * 1.8), 1.0, 0.2, M.STEEL);   // round 43: the war bow: dark wood, iron-capped tips
    if (eq.ench) for (const sd2 of [1, -1]) r.sph(tip(sd2), 1.3, eq.ench === 'fire' ? M.FIREM : M.ICE, { noShadow: true });   // round 43: Burning or Chilling: the limb tips glow
    const nock = st.clip === 'shoot' && !rel ? aR.hand : V.add(c, V.mul(back, bend + 0.4));
    r.cone(tip(1), nock, 0.3, 0.3, M.CLOTH_WHITE, { noShadow: true }); r.cone(nock, tip(-1), 0.3, 0.3, M.CLOTH_WHITE, { noShadow: true });
    if (st.clip === 'shoot' && draw > 0.5) for (const fan of volley ? [-0.28, 0, 0.28] : [0]) { const ad = V.norm(V.add(aim, V.mul(bowUp, fan))); r.cone(aR.hand, V.mad(aR.hand, ad, 12), 0.4, 0.4, M.WOOD, { noShadow: true }); r.cone(V.mad(aR.hand, ad, 11.5), V.mad(aR.hand, ad, 13.2), 0.7, 0.2, M.STEEL, { noShadow: true }); }
    if (st.clip === 'death') deathTip(r, B, st.f, -1);
    return r;
  }
  if (staff) {   // a long wooden staff with gold prongs cradling a glowing orb (color by staff)
    const cinder = hasFx(eq, 'cinder');   // round 43: Staff of Cinders: charred, embers in the wood, a flame over the orb
    const span = STAFF_SPAN[eq.weapon] || [-9, 18, 21];   // art A8: the wand is shorter
    r.cone(V.mad(g, bd, span[0]), V.mad(g, bd, span[1]), 0.9, 1.0, cinder ? M.BARK : STAFF_SHAFT[eq.weapon] || M.WOOD, cinder ? { mf: p => Math.abs((V.dot(V.sub(p, g), bd) * 0.9) % 5) < 0.5 ? M.FIREM : 0 } : undefined);
    const orbM = eq.weapon === 'staff_fire' ? M.FIREM : eq.weapon === 'staff_ice' || eq.weapon === 'staff_rune' ? M.ICE : M.ARCANE, top = V.mad(g, bd, 21);
    if (eq.weapon === 'staff_rune') {   // round a6: the runed staff: a pale-blue crystal held point-up in a four-fingered gold claw
      const wf2 = V.norm(V.cross(bd, wide));
      for (const v of [wide, V.mul(wide, -1), wf2, V.mul(wf2, -1)]) r.cone(V.mad(g, bd, 17.2), V.add(V.mad(g, bd, 20.6), V.mul(v, 2.3)), 0.8, 0.45, M.GOLD);
      r.cyl(V.mad(g, bd, 16.6), V.mad(g, bd, 17.8), 1.6, M.GOLD);
      r.group(() => { r.cone(V.mad(g, bd, 18.6), V.mad(g, bd, 21.4), 0.5, 2.2, M.WATERM, { noShadow: true }); r.cone(V.mad(g, bd, 21.4), V.mad(g, bd, 25.6), 2.2, 0.3, M.ICE, { noShadow: true }); });   // shaded below, glowing above
    } else if (STAFF_HEAD[eq.weapon]) STAFF_HEAD[eq.weapon](r, g, bd, wide);
    else {
      for (const sd of [-1, 1]) r.cone(V.mad(g, bd, 17.5), V.add(V.mad(g, bd, 21.8), V.mul(wide, sd * 2.6)), 0.7, 0.4, M.GOLD);
      if (eq.set === 'magus' && eq.weapon === 'staff') r.cyl(V.mad(g, bd, 16.4), V.mad(g, bd, 17.6), 1.5, M.GOLD);   // round a6: the Magus Rod's gold collar under the orb
      r.sph(top, 2.7, orbM, { noShadow: true });
    }
    if (cinder) { r.cone(V.mad(top, bd, 2), V.mad(top, bd, 6.5), 1.8, 0.2, M.FIREM, { noShadow: true }); }
    if (st.clip === 'storm') { const wf2 = V.norm(V.cross(bd, wide)), big = st.f % 2 === 1; r.sph(top, big ? 4.4 : 3.5, orbM, { noShadow: true }); for (const [k, v] of [bd, wide, V.mul(wide, -1), wf2, V.mul(wf2, -1)].entries()) if (big || k % 2 === 0) r.cone(V.mad(top, v, 3.2), V.mad(top, v, big ? 9 : 6.5), 1.0, 0.2, M.FLASH, { noShadow: true }); }   // round 72b: the storm's orb blazes, pulsing
    if (st.clip === 'channel' && Math.floor(st.f / 3) !== 3) {   // round 72: the orb answers the cast: it swells and draws motes in on the gather, bursts into a star on the release, and settles
      const ph = st.f % 3, wf2 = V.norm(V.cross(bd, wide));
      if (ph === 0) { r.sph(top, 3.7, orbM, { noShadow: true }); for (const [a, d] of [[0.6, 6.5], [2.7, 5.4], [4.6, 6.0]]) r.sph(V.add(top, V.add(V.mul(wide, Math.cos(a) * d), V.mul(wf2, Math.sin(a) * d))), 0.9, orbM, { noShadow: true }); }
      else if (ph === 1) { r.sph(top, 4.3, orbM, { noShadow: true }); for (const v of [bd, wide, V.mul(wide, -1), wf2, V.mul(wf2, -1)]) r.cone(V.mad(top, v, 3.2), V.mad(top, v, 8.5), 1.1, 0.2, M.FLASH, { noShadow: true }); }
      else r.sph(top, 3.2, orbM, { noShadow: true });
    }
    if (eq.ench) enchantGlow(r, eq, g, bd, wide, st, span[2]);
    if (eq.weapon === 'staff_rune') for (const z of [8, 12.5]) r.cyl(V.mad(g, bd, z), V.mad(g, bd, z + 0.9), 1.5, M.GOLD);   // round 43: gold bands (round a6: the motes that circled the orb are gone; the crystal carries it)
    if (st.clip === 'death') deathTip(r, B, st.f, -1);
    return r;
  }
  r.cone(V.mad(g, bd, -2.6), V.mad(g, bd, 1.2), 0.9, 0.9, M.LEATHER);
  r.sph(V.mad(g, bd, -3.2), 1.2, M.GOLD);
  const xWeapon = GEAR_EXTRA.weapon[eq.weapon];
  if (xWeapon) xWeapon(r, { g, bd, wide, wf, fwd, up, sideR, eq, st });
  else if (eq.weapon === 'sword') {
    r.box(V.mad(g, bd, 1.8), [0.7, 3.4, 0.8], M.GOLD, wf);
    r.box(V.mad(g, bd, 11.4), [9.2, 1.15, 0.4], hasFx(eq, 'ember') ? M.FIREM : M.BLADE, wf);   // Emberbrand glows
    r.cone(V.mad(g, bd, 20.4), V.mad(g, bd, 21.8), 0.9, 0.3, M.BLADE);
  } else if (eq.weapon === 'bsword') {   // round 43: the bastard sword: a hand-and-a-half grip, a swept gold guard, a longer blade with a fuller
    r.cone(V.mad(g, bd, -4.4), V.mad(g, bd, -2.6), 0.9, 0.9, M.LEATHER);
    for (const s of [-1, 1]) r.cone(V.mad(g, bd, 1.6), V.add(V.mad(g, bd, 3), V.mul(wide, s * 4.2)), 0.8, 0.5, M.GOLD);
    r.box(V.mad(g, bd, 13), [10.8, 1.25, 0.4], M.BLADE, wf, { mf: p => Math.abs(V.dot(V.sub(p, g), wide)) < 0.35 && V.dot(V.sub(p, g), bd) < 20 ? M.STEEL : 0 });
    r.cone(V.mad(g, bd, 23.6), V.mad(g, bd, 25), 1.0, 0.3, M.BLADE);
  } else if (eq.weapon === 'greatsword') {   // two-handed: long grip, wide guard, long broad blade
    r.box(V.mad(g, bd, 2), [0.8, 4.6, 0.9], M.IRON, wf);
    r.box(V.mad(g, bd, 14.2), [11.6, 1.5, 0.45], hasFx(eq, 'blood') ? M.BLOODY : M.BLADE, wf);   // Blooddrinker is red
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
      r.box(V.add(V.mad(g, bd, 11.5), V.mul(wide, 3.2)), [2.8, 3.0, 0.5], hasFx(eq, 'maul') ? M.GOLD : M.BLADE, wf);
    } else if (eq.weapon === 'baxe') {   // round 43: the battle axe: a longer haft, two crescent blades, a spike on top
      r.cone(V.mad(g, bd, 12), V.mad(g, bd, 15.5), 0.9, 0.9, M.WOOD);
      for (const s of [-1, 1]) r.group(() => { r.box(V.add(V.mad(g, bd, 13), V.mul(wide, s * 3.4)), [3.6, 2.6, 0.5], M.BLADE, wf); r.cone(V.add(V.mad(g, bd, 13), V.mul(wide, s * 5.6)), V.add(V.mad(g, bd, 17), V.mul(wide, s * 5.2)), 1.1, 0.3, M.BLADE); r.cone(V.add(V.mad(g, bd, 13), V.mul(wide, s * 5.6)), V.add(V.mad(g, bd, 9), V.mul(wide, s * 5.2)), 1.1, 0.3, M.BLADE); });
      r.cone(V.mad(g, bd, 15.5), V.mad(g, bd, 19), 0.8, 0.2, M.STEEL);
    } else if (eq.weapon === 'mstar') {   // round 43: the morning star: an iron ball bristling with spikes on a banded haft
      const hb = V.mad(g, bd, 14.2);
      r.sph(hb, 3.2, M.IRON);
      for (const d of [bd, V.mul(bd, -1), wide, V.mul(wide, -1), wf[2], V.mul(wf[2], -1), V.norm(V.add(bd, wide)), V.norm(V.sub(bd, wide))]) r.cone(V.mad(hb, d, 2.6), V.mad(hb, d, 5), 0.8, 0.15, M.STEEL, { noShadow: true });
      r.cyl(V.mad(g, bd, 9.5), V.mad(g, bd, 10.5), 1.2, M.IRON);
    } else {
      r.sph(V.mad(g, bd, 13.5), 3.0, M.IRON);
      for (const s of [-1, 1]) r.cone(V.mad(g, bd, 13.5), V.add(V.mad(g, bd, 13.5), V.mul(wide, s * 4.2)), 1.2, 0.4, M.IRON);
    }
  }
  if (eq.ench) enchantGlow(r, eq, g, bd, wide, st);   // round 43
  if (st.clip === 'spin') {   // round 72b: the whirlwind drags a wide sweep behind the blade (the turn carries it round)
    const bh = V.norm([bd[0], bd[1], 0]), tr = V.cross(up, bh), reach2 = V.len(V.sub(g, J.shR)) + (WEAPON_LEN[eq.weapon] || GEAR_LEN[eq.weapon] || 16);
    smearArc(r, V.mad(J.shR, up, -2), bh, V.mul(tr, SPIN_TRAIL), 2.3, 0, 0, reach2, null, 7.5);
  }
  if (sw && sw.smear && st.prev) {
    const reach = (sw.r || 6.5) + (WEAPON_LEN[eq.weapon] || GEAR_LEN[eq.weapon] || 16);
    smearArc(r, pivot, F, U, bladeA(st.prev), bladeA(sw), reach - 9, reach);
  }
  if (st.clip === 'death') deathTip(r, B, st.f, -1);
  return r;
}
