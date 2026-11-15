'use strict';
// Round 116 (Act II): the two monsters from under Mount Ash: the SHALE RIPPER (a burrower) and the CINDER HUSK
// (a clinker man who lobs embers). Their rigs live here (FAMILIES.ripper, FAMILIES.husk; MONSTERS.shaleripper,
// MONSTERS.cinderhusk); what they do in a fight is in act2.js. Concept: art/refs/act2/region2/monsters.png.
//
// Clips (the frame counts the rigs pose):
//   ripper: idle 4, walk 8 (+ the half frames), attack = RIPPER_RAKE's keys, hit 1, death 6,
//           mound 4 (the burrowed tell: a shaking heap, stones hopping over it, no body),
//           erupt 3 (claws through the heap, rearing out of the hole, leaping clear)
//   husk:   idle 4, walk 8 (+ the half frames), attack = HUSK_PUNCH's keys, cast = HUSK_CAST's keys (the tell: the
//           chest opens on a bright ember and an arm lifts one overhead), hit 1, death 6
// The husk punches and lobs with one body, so its rig takes its keys from the clip it is asked for (never from
// st.key: a sprite built without the entity would otherwise get the punch keys for the cast clip).

// ---------------------------------------------------------------- shared helpers
// the lowest point of a primitive (so a fallen part can be rested on the floor)
function a2Low(p) {
  if (p.k === 0) return p.c[2] - p.r;
  if (p.k === 1) return p.c[2] - Math.hypot(p.rad[0] * p.ax[0][2], p.rad[1] * p.ax[1][2], p.rad[2] * p.ax[2][2]);
  if (p.k === 2) return Math.min(p.a[2] - p.ra, p.b[2] - p.rb);
  if (p.k === 4) { const d = V.norm(V.sub(p.b, p.a)); return Math.min(p.a[2], p.b[2]) - p.r * Math.sqrt(Math.max(0, 1 - d[2] * d[2])); }
  return p.c[2] - (Math.abs(p.half[0] * p.ax[0][2]) + Math.abs(p.half[1] * p.ax[1][2]) + Math.abs(p.half[2] * p.ax[2][2]));
}
// a rigid move of primitives i0..i1: turned about a pivot (pitch about y, then roll about x), then shifted by d
function a2Move(rig, i0, i1, pivot, pitch, roll, d) {
  const P = q => V.add(V.add(V.rotX(V.rotY(V.sub(q, pivot), pitch), roll), pivot), d);
  const Vv = v => V.rotX(V.rotY(v, pitch), roll);
  const inv = q => V.add(V.rotY(V.rotX(V.sub(V.sub(q, d), pivot), -roll), -pitch), pivot);
  for (let i = i0; i < i1; i++) {
    const p = rig.p[i];
    if (p.c) p.c = P(p.c);
    if (p.a) { p.a = P(p.a); p.b = P(p.b); }
    if (p.ax) p.ax = p.ax.map(Vv);
    if (p.mf) { const f0 = p.mf; p.mf = (q, n) => f0(inv(q), n); }
  }
}
// is the point (u, v) within w of the segment (u0, v0)-(u1, v1)? (cracks painted on a surface)
function a2Seg(u, v, u0, v0, u1, v1, w) {
  const du = u1 - u0, dv = v1 - v0, t = clamp(((u - u0) * du + (v - v0) * dv) / (du * du + dv * dv), 0, 1);
  return Math.hypot(u - u0 - du * t, v - v0 - dv * t) < w;
}
// a tumbling stone: a small box turned by `spin`
function a2Stone(r, c, half, m, spin, o = {}) {
  const ax = [[1, 0, 0], [0, 1, 0], [0, 0, 1]].map(v => V.rotZ(V.rotY(V.rotX(v, spin * 0.7), spin * 1.3), spin));
  r.box(c, half, m, ax, o);
}

// ---------------------------------------------------------------- the shale ripper
// A low, wide burrower: a domed back of overlapping slate plates (blue-grey, never brown: brown is the husk's),
// two big forelimbs ending in long ivory claws, a small head tucked under the front plate with a rust mouth.
// the claw rake: rears back with the right claw high (the tell), lunges, rakes down across, stuck low after
const RIPPER_RAKE = [
  K(1.5, 260, { tele: true }),
  K(1.6, 120),
  K(0.7, 70, { mv: 0.7 }),
  K(-0.3, 60, { hit: true, smear: true }),
  K(-0.4, 300, { open: true }),
  K(0.5, 110),
];
// back plates, slabs of slate: x, y, z (centre), half sizes along / across / thick, pitch (+ = front edge down),
// roll (outer edge down, side plates), a turn of its own. The crown slab lies on top; the hood, the back and the
// rump slabs step down from under it, and three more hang down each flank.
const RIPPER_PLATES = [
  [9.2, 0, 9.0, 4.6, 5.6, 1.5, 0.55, 0, 0.0],
  [3.0, 0, 13.0, 4.8, 6.4, 1.6, 0.3, 0, 0.12],
  [-3.6, 0, 11.6, 4.6, 6.0, 1.6, 0.02, 0, -0.1],
  [-9.2, 0, 8.6, 4.0, 5.0, 1.4, -0.32, 0, 0.08],
  [6.4, 7.4, 7.8, 4.2, 3.4, 1.4, 0.45, 0.8, 0.25],
  [-0.2, 8.4, 8.6, 4.4, 3.6, 1.4, 0.2, 0.85, 0.0],
  [-6.6, 7.2, 7.4, 4.0, 3.2, 1.3, -0.1, 0.8, -0.25],
];
const RIPPER_K = 1.1;   // drawn a tenth bigger than modelled: about 0.8 of the hero's height, as the concept has it
// the heap it hides under (e < 0: shaking, f 0-3) and the hole it bursts from (e 0-2)
function ripperRubble(r, f, e) {
  const dirt = M.PLANK, dark = M.BARK, slate = M.HIDE, shard = M.CHAIN;
  const shake = e < 0 ? [0, 0.5, -0.4, 0.3][f % 4] : 0, swell = e < 0 ? [0, 0.35, 0.1, 0.5][f % 4] : 0, open = e < 0 ? 0 : [0.5, 0.85, 1][e];
  // cracks running out over the floor
  for (const [a, l0, l1, bend] of e < 0 ? [[0.5, 7.5, 12, 0.5], [2.6, 7, 11.5, -0.45], [4.4, 7.5, 11, 0.4]] : [[0.5, 9, 15, 0.5], [2.6, 9, 14.5, -0.45], [4.4, 9, 14, 0.4]]) {
    const d0 = [Math.cos(a), Math.sin(a), 0], d1 = [Math.cos(a + bend), Math.sin(a + bend), 0], lm = (l0 + l1) / 2;
    const p0 = V.mul(d0, l0), p1 = V.mul(d0, lm), p2 = V.mad(p1, d1, l1 - lm);
    for (const [a0, b0] of [[p0, p1], [p1, p2]]) r.box(V.add(V.lerp(a0, b0, 0.5), [0, 0, 0.15]), [V.len(V.sub(b0, a0)) / 2 + 0.3, 0.5, 0.15], M.DARK, frameAlong(V.sub(b0, a0)), { noShadow: true });
  }
  const mats = [dark, slate, dirt, shard, dark, slate, dirt, shard];
  if (e < 0) {
    r.ell([shake, 0, 2.3 + swell * 0.5], [7.6, 6.6, 3.2 + swell], dirt);
    for (let i = 0; i < 7; i++) {
      const a = i * 0.9 + 0.2, rho = 5.4 + (i % 2) * 1.2, sz = 2.4 + (i % 3) * 0.45, c = [Math.cos(a) * rho + shake * (i % 2 ? 1 : -0.6), Math.sin(a) * rho, sz * 0.7];
      if (i % 4 === 3) a2Stone(r, [c[0], c[1], sz * 0.5], [sz * 1.15, sz * 0.8, sz * 0.45], mats[i], 0.35 + i * 0.2); else r.sph(c, sz, mats[i]);
    }
    a2Stone(r, [-1.8 + shake, -1.4, 4.9 + swell * 1.4], [2.7, 2.0, 0.8], slate, 0.3 + shake * 0.2);
    a2Stone(r, [2.8 - shake, 2.0, 4.0 + swell], [2.0, 1.6, 0.7], shard, -0.4);
    // small stones hopping over the heap
    for (const [i, x, y, z, s] of [[0, -4.5, -2.5, 8.2, 1.5], [1, 0.2, 1.2, 10.4, 1.3], [2, 4.6, -1.2, 8.6, 1.4], [3, 1.8, 4.2, 7.4, 1.15]]) {
      const hop = [0, 1.9, 0.6, 2.6][(f + i) % 4];
      a2Stone(r, [x + [0, 0.5, -0.4, 0.2][(f + 2 * i) % 4], y, z + hop], [s, s * 0.85, s * 0.75], i % 2 ? shard : slate, f * 0.9 + i * 2.1);
    }
    return;
  }
  // burst open: a dark pit, the heap thrown out into a ring, stones flying
  r.cyl([0, 0, 0], [0, 0, 0.3], 8.6, M.DARK, { noShadow: true });
  for (let i = 0; i < 8; i++) {
    const a = i * 0.785 + 0.2, rho = 8.6 + 2.2 * open + (i % 2) * 0.8, sz = 3.0 + (i % 3) * 0.4, c = [Math.cos(a) * rho, Math.sin(a) * rho, sz * 0.65];
    if (i % 4 === 3) a2Stone(r, [c[0], c[1], sz * 0.5], [sz * 1.15, sz * 0.8, sz * 0.45], mats[i], 0.35 + i * 0.2); else r.sph(c, sz, mats[i]);
  }
  for (let j = 0; j < 6; j++) {
    const b = j * 1.05 + 0.4, rho = 5 + 7 * open + (j % 2) * 2, z = [6.5, 12.5, 9][e] + (j % 3) * 2.2 - e * (j % 2) * 2.6, s = 1.25 + (j % 3) * 0.2;
    a2Stone(r, [Math.cos(b) * rho, Math.sin(b) * rho, Math.max(1.5, z)], [s, s * 0.85, s * 0.75], [slate, shard, dirt][j % 3], e * 1.1 + j * 1.9);
  }
}
// drop what is still under the floor; a limb that crosses the floor is cut off there
function ripperUnearth(r) {
  const Z0 = 0.6;
  r.p = r.p.filter(p => {
    if (p.k === 2) {
      if (p.a[2] < Z0 && p.b[2] < Z0) return false;
      if (p.a[2] < Z0) { const t = (Z0 - p.a[2]) / (p.b[2] - p.a[2]); p.ra = lerp(p.ra, p.rb, t); p.a = V.lerp(p.a, p.b, t); }
      else if (p.b[2] < Z0) { const t = (Z0 - p.b[2]) / (p.a[2] - p.b[2]); p.rb = lerp(p.rb, p.ra, t); p.b = V.lerp(p.b, p.a, t); }
      return V.len(V.sub(p.b, p.a)) > Math.abs(p.ra - p.rb) + 0.3;
    }
    return (p.c ? p.c[2] : Math.min(p.a[2], p.b[2])) > 1.4;
  });
}
function ripperRig(look, st) {
  const r = new Rig(), clip = st.clip, f = st.f || 0;
  if (clip === 'mound') { ripperRubble(r, f, -1); scaleRig(r, 1.3 * RIPPER_K * (look.scale || 1)); return r; }
  const plate = M.CHAIN, hide = M.HIDE, ivory = M.BONE, maw = M.AUTUMNM;
  let bob = 0, sway = 0, yaw = 0, pitch = 0, lunge = 0, ph = 0, moving = false, jaw = 0.2, tuck = 0, curl = 0, slump = 0;
  let rattle = () => 0;
  // posed fore paws: s -> [wrist, the way the claws point, the way they hook]
  const paw = { 1: null, '-1': null };
  const key = clip === 'attack' ? (st.key && st.key.a !== undefined ? st.key : RIPPER_RAKE[Math.min(f, RIPPER_RAKE.length - 1)]) : null;
  if (clip === 'idle') { const b = [0, 0.35, 0.6, 0.25]; bob = b[f % 4]; rattle = i => b[(f + 1 + i) % 4] * 1.1; }
  if (clip === 'walk') { ph = f / 8 * Math.PI * 2; moving = true; bob = 0.45 * Math.abs(Math.sin(ph)); sway = 0.7 * Math.sin(ph); yaw = 0.07 * Math.sin(ph); rattle = i => 0.4 * Math.sin(ph * 2 + i * 1.3); }
  if (clip === 'hit') { lunge = -1.6; bob = -0.7; tuck = 1.4; pitch = 0.08; rattle = i => 0.7 + (i % 2) * 0.6; }
  if (key) {
    if (key.a > 1.1) {   // reared back on the haunches, the right claw high and wide, jaws open
      pitch = -0.6 * (key.a / 1.5); lunge = -1.8; jaw = 1.5; rattle = i => 0.3 * (i % 2);
      paw[1] = [[8.5, 11.5, 21 + (key.a - 1.5) * 8], V.norm([0.5, 0.3, 0.8]), V.norm([0.85, -0.15, -0.5])];
      paw[-1] = [[11, -9.5, 12], V.norm([0.8, -0.25, 0.55]), V.norm([0.55, 0, -0.85])];
    } else if (key.hit || key.a < -0.35) {   // raked down across the front, stretched out low
      pitch = 0.1; lunge = key.hit ? 4.6 : 4; bob = -0.6; jaw = key.hit ? 1.2 : 0.7;
      paw[1] = [[19.5, -1.5, 2.8], V.norm([0.85, -0.5, -0.1]), [0, 0, -1]];
    } else if (key.mv > 0) {   // coming down, the claw over the top
      pitch = -0.16; lunge = 1.8; jaw = 1.4;
      paw[1] = [[15.5, 6.5, 11.5], V.norm([0.9, -0.1, 0.1]), V.norm([0.3, 0, -0.95])];
    } else {   // gathering itself again
      pitch = -0.06; lunge = 1.6; jaw = 0.5;
      paw[1] = [[14, 8.5, 4.4], [1, 0, 0], [0, 0, -1]];
    }
  }
  if (clip === 'death') { curl = [0, 0.2, 0.5, 0.8, 1, 1][f]; slump = [0, 0, 0, 0.35, 0.75, 1][f]; jaw = [1.3, 1.3, 1.1, 0.9, 0.7, 0.6][f]; lunge = [-1.5, -2.2, -2.6, -2.8, -3, -3][f]; rattle = i => [0.8, 0.5, 0, 0, 0, 0][f] * (i % 2); }
  let lift = 0;
  if (clip === 'erupt') {
    pitch = [-1.25, -0.95, -0.4][f]; lift = [-21, -9.5, 2.6][f]; lunge = [3, 3.5, 1][f]; jaw = [0.4, 1.4, 1.5][f]; rattle = i => (i % 2) * 0.5;
    for (const s of [1, -1]) paw[s] = [[[2.5, s * 4.5, 5], [8, s * 11, 14.5], [12.5, s * 12.5, 10.5]][f],
      V.norm([[0.15, s * 0.25, 1], [0.5, s * 0.5, 0.75], [0.8, s * 0.35, 0.45]][f]), V.norm([[1, 0, 0], [0.8, 0, -0.5], [0.5, 0, -0.85]][f])];
  }
  // the body's own frame: pitched about the haunches (rearing), wagged about the vertical (the scuttle)
  const piv = [-6, 0, 2], off = [lunge, sway, bob + lift];
  const rot = v => V.rotZ(V.rotY(v, pitch), yaw);
  const X = q => V.add(V.add(rot(V.sub(q, piv)), piv), off);
  const AX = (pt = 0, ro = 0, yw = 0) => [[1, 0, 0], [0, 1, 0], [0, 0, 1]].map(v => rot(V.rotX(V.rotY(V.rotZ(v, yw), pt), ro)));
  const fwd = rot([1, 0, 0]);
  // underbody
  r.ell(X([0, 0, 6.2]), [10, 7.6, 4.4], hide, AX(), { bias: -1 });
  r.ell(X([-0.5, 0, 7.6]), [10, 8, 4.6], hide, AX());   // the hump the slabs lie on
  // hind legs: short, mostly under the skirt of plates
  for (const s of [1, -1]) {
    const hip = X([-6.5, s * 5.6, 5.4]), p = ph + (s > 0 ? Math.PI : 0);
    let foot = [-8 - (moving ? 2.4 * Math.cos(p) : 0) + (key ? 0 : lunge * 0.3), s * 7.8, moving ? 1.5 * Math.max(0, Math.sin(p)) : 0];
    if (clip === 'erupt') foot = V.add(X([-8, s * 7.8, 0]), [0, 0, 0]);
    if (curl) foot = V.lerp(foot, X([-5, s * 4.5, 1.5]), curl);
    const L = ik(hip, V.add(foot, [0, 0, 1.7]), 4.2, 4.2, [-0.6, s * 0.4, 0.7]);
    r.cone(hip, L.joint, 2.7, 2.3, hide); r.cone(L.joint, L.end, 2.3, 2.0, hide);
    r.ell(V.add(L.end, [1.2, 0, -0.5]), [2.8, 2.1, 1.15], hide, null, { bias: -1 });
  }
  // forelimbs: thick, elbows up and out, three long hooked claws
  for (const s of [1, -1]) {
    const sh = X([5.5, s * 6.8, 7.0]), p = ph + (s > 0 ? 0 : Math.PI);
    let w = [12.6 - (moving ? 4 * Math.cos(p) : 0) + (key ? Math.max(0, lunge) : 0), s * 9.8, 2.9 + (moving ? 2.6 * Math.max(0, Math.sin(p)) : 0)];
    let cf = V.rotZ([1, 0, 0], yaw + s * 0.12), cd = [0, 0, -1];
    if (moving && Math.sin(p) > 0) { cf = V.norm([1, s * 0.12, 0.35 * Math.sin(p)]); cd = V.norm([0.35 * Math.sin(p), 0, -1]); }   // claws lifted clear on the reach
    if (paw[s]) [w, cf, cd] = paw[s];
    if (curl) { w = V.lerp(w, X([11, s * 5.5, 2.2]), curl); cf = V.norm(V.lerp(cf, [0.6, 0, -0.8], curl)); cd = V.norm(V.lerp(cd, [-0.8, 0, -0.6], curl)); }
    const L = ik(sh, w, 6.8, 6.8, V.norm([-0.2, s * 0.9, 0.55]));
    r.cone(sh, L.joint, 3.0, 2.6, hide); r.cone(L.joint, L.end, 2.6, 2.9, hide);
    r.sph(L.end, 3.0, hide);
    const sv = V.norm(V.cross(cd, cf));
    for (const u of [-1, 0, 1]) {
      const base = V.add(V.mad(L.end, cf, 1.8), V.mul(sv, u * 1.7)), mid = V.add(V.add(V.mad(base, cf, 3.4), V.mul(sv, u * 0.7)), V.mul(cd, -0.5)), tip = V.add(V.mad(mid, cf, 2.4), V.mul(cd, 2.6));
      r.group(() => { r.cone(base, mid, 1.45, 1.15, ivory); r.cone(mid, tip, 1.15, 0.45, ivory); });
    }
  }
  // the rake's trail: an ivory streak from where the claws were a moment ago down to where they are
  if (key && key.smear && SMEAR_MODE !== 'none') {
    const pv = X([5.5, 6.8, 7.0]), s0 = V.sub([13, 8, 15], pv), s1 = V.sub(paw[1][0], pv), F = V.norm(s1), U = V.norm(V.sub(s0, V.mul(F, V.dot(s0, F))));
    smearArc(r, pv, F, U, Math.acos(clamp(V.dot(V.norm(s0), F), -1, 1)), 0, 9, V.len(s1) + 7, [27, 26, 25], 5);
  }
  // head, tucked under the front plate: a rust muzzle and jaw round a dark mouth
  const hx = 12.2 - tuck;
  r.sph(X([hx, 0, 5.5]), 3.1, hide, { bias: -1 });
  r.ell(X([hx + 2.0, 0, 5.4]), [2.5, 3.1, 1.5], maw, AX(0.15));
  r.ell(X([hx + 2.0, 0, 4.4 - jaw * 0.5]), [2.1, 2.6, 0.5 + jaw * 0.5], M.DARK, AX(0.15), { noShadow: true });
  r.ell(X([hx + 1.7, 0, 3.7 - jaw]), [2.5, 2.9, 1.05], maw, AX(-0.25 * jaw));
  // the plates
  RIPPER_PLATES.forEach(([x, y, z, hx, hy, hz, pt, ro, yw], i) => {
    for (const s of y ? [1, -1] : [1]) {
      const k = i + (s < 0 ? 3 : 0), c = [x * (1 + 0.08 * slump), s * y * (1 + 0.2 * slump), z + rattle(k) - slump * (y ? 0.9 : 1.6)];
      r.box(X(c), [hx, hy, hz], plate, AX(pt * (1 - 0.5 * slump) + (clip === 'hit' ? 0.12 * (k % 2 ? 1 : -1) : 0), -s * ro * (1 + 0.25 * slump), s * yw));
    }
  });
  if (clip === 'death') {   // flipped by the blow, it rolls onto its back and lies there, plates slumped
    const roll = [0, 0.4, 1.25, 2.2, 2.75, 2.75][f], hop = [1.0, 2.6, 3.0, 1.2, 0, 0][f];
    a2Move(r, 0, r.p.length, [0, 0, 6.5], 0, roll, [0, 0, 0]);
    let low = 1e9; for (const p of r.p) low = Math.min(low, a2Low(p));
    a2Move(r, 0, r.p.length, [0, 0, 0], 0, 0, [0, 0, hop - low]);
  }
  if (clip === 'erupt') { ripperUnearth(r); ripperRubble(r, f, f); }
  scaleRig(r, RIPPER_K * (look.scale || 1));
  return r;
}

// ---------------------------------------------------------------- the cinder husk
// A stocky man of clinker: charcoal chunks on a red-brown core that shows at the joints, big fists, a flat-topped
// chimney for a head with a hollow top and two amber eyes, amber cracks, and a chest plate that is a dull ember
// until it opens to cast.
const HUSK_B = { hipH: 9.6, thigh: 5.2, shin: 5, ankle: 1.8, spine: 8, shW: 8.6, shZ: 2.6, neck: 8.5, upper: 6.6, fore: 6.2, hipW: 4.2, stride: 4.2, lift: 2.2, duty: 0.6, bob: 0.8, sway: 0.8, runLean: 0.1, counter: 0.12, stance: 1.0 };
// the punch: a slow overhead fist. The fist drawn back high (the tell), a step, the blow, stuck low after
const HUSK_K = 0.95;   // drawn a touch smaller than modelled: about 0.9 of the hero's height, as the concept has it
const HUSK_PUNCH = [
  K(1.9, 320, { tele: true, r: 10, tw: 0.5, ln: -0.12, bob: 0.3, fl: 1.5, fr: -3.5 }),
  K(2.05, 140, { r: 10, tw: 0.55, ln: -0.14, bob: 0.4, fl: 1.5, fr: -3.5 }),
  K(0.9, 70, { mv: 0.35, r: 11.5, tw: 0.1, ln: 0.14, bob: -0.6, fl: 4, fr: -3 }),
  K(-0.25, 70, { hit: true, r: 12.4, tw: -0.4, ln: 0.3, bob: -1.6, fl: 5.5, fr: -3.4 }),
  K(-0.4, 360, { open: true, r: 12.2, tw: -0.4, ln: 0.3, bob: -1.7, fl: 5.5, fr: -3.4 }),
  K(0.6, 140, { r: 10, tw: 0, ln: 0.08, bob: -0.6, fl: 3.5, fr: -3 }),
];
// the lob (clip 'cast'), the tell: a = how high the right arm is (1 = overhead), ch = how far the chest stands
// open, em = an ember burning in the raised fist. One second of wind-up (wind: true on each of its keys; tele
// only on the first, so the engine's glint and growl fire once), the release (hit), then it closes up again
const HUSK_CAST = [
  K(0.25, 160, { tele: true, wind: true, ch: 0.5, tw: 0.1, ln: -0.04, bob: -0.5, fl: 2, fr: -2.5 }),
  K(0.7, 180, { wind: true, ch: 1, em: true, tw: 0.2, ln: -0.08, bob: -0.2, fl: 2, fr: -2.8 }),
  K(1, 660, { wind: true, ch: 1, em: true, tw: 0.3, ln: -0.14, bob: 0.4, fl: 1.5, fr: -3.2 }),
  K(-0.1, 90, { hit: true, ch: 1, tw: -0.35, ln: 0.24, bob: -1.2, fl: 5, fr: -3.2 }),
  K(-0.3, 240, { open: true, ch: 0.5, tw: -0.35, ln: 0.22, bob: -1.3, fl: 5, fr: -3.2 }),
  K(0.2, 150, { ch: 0, tw: 0, ln: 0.06, bob: -0.5, fl: 3, fr: -2.8 }),
];
function huskRig(look, st0) {
  const clip = st0.clip, f = st0.f || 0;
  const tbl = clip === 'cast' ? HUSK_CAST : clip === 'attack' ? HUSK_PUNCH : null;
  const key = tbl ? tbl[Math.min(Math.floor(f), tbl.length - 1)] : null;
  const st = tbl ? { clip, f, key, prev: tbl[Math.floor(f) - 1] } : st0;
  const B = HUSK_B, J = bipedJoints(B, st), r = new Rig(), { fwd, sideR, up } = J, lf = frameAlong(fwd, up);
  const rock = M.ROCK, core = M.HELLSTONE, RK = (o = {}) => Object.assign({ bias: -1 }, o);
  const dead = clip === 'death' ? f : -1, lit = dead < 2;   // the fire inside goes out as it falls apart
  const ch = key && key.ch ? key.ch : 0, crack = lit ? (ch >= 1 ? M.EYE_YEL : M.FIREM) : 0;
  const parts = [], part = fn => { const i0 = r.p.length; fn(); parts.push([i0, r.p.length]); };
  // legs: the core shows at the knee between a thigh chunk and a heavier shin chunk
  for (const [hip, knee, ank, s] of [[J.hipL, J.kneeL, J.ankL, -1], [J.hipR, J.kneeR, J.ankR, 1]]) {
    part(() => { r.cone(hip, knee, 2.0, 2.1, core); r.sph(knee, 2.4, core); r.ell(V.lerp(hip, knee, 0.42), [3.0, 3.5, 3.5], rock, frameAlong(V.sub(knee, hip)), RK()); });
    part(() => {
      r.cone(knee, ank, 2.0, 1.9, core);
      const sc = V.lerp(knee, ank, 0.62);
      r.ell(sc, [3.0, 3.6, 3.6], rock, frameAlong(V.sub(ank, knee)), RK(s < 0 ? { mf: p => { const q = V.sub(p, sc); return crack && q[0] > 0 && a2Seg(q[1], q[2], -1.5, 2, 0.5, -0.2, 0.42) ? crack : 0; } } : {}));
    });
    part(() => r.ell([ank[0] + 1.7, ank[1], Math.max(1.55, ank[2] - 0.3)], [4.3, 3.4, 1.6], rock, null, RK()));
  }
  // hips and waist
  part(() => r.ell(J.pelvis, [4.2, 6.3, 3.4], rock, lf, RK()));
  part(() => r.cone(V.mad(J.pelvis, up, 1.5), V.mad(J.chest, up, -2), 4.4, 4.6, core));
  // the chest: one great chunk, cracked
  const cc = V.mad(J.chest, up, 1.0);
  part(() => r.ell(cc, [6.0, 9.2, 6.2], rock, lf, RK({ mf: p => {
    if (!crack) return 0;
    const q = V.sub(p, cc), u = V.dot(q, sideR), v = V.dot(q, up);
    if (V.dot(q, fwd) > 0) return a2Seg(u, v, -3.8, 3.2, -5.8, 4.4, 0.42) || a2Seg(u, v, 3.8, -2.4, 6.0, -3.4, 0.42) || a2Seg(u, v, -3.0, -3.8, -4.4, -5.0, 0.42) || (ch >= 1 && (a2Seg(u, v, 3.4, 3.4, 5.4, 4.8, 0.42) || a2Seg(u, v, 0, 4.6, 0.6, 5.8, 0.42))) ? crack : 0;
    return a2Seg(u, v, -2.2, 3.6, -0.4, 2.2, 0.42) || a2Seg(u, v, -0.4, 2.2, -1.2, 0.4, 0.42) ? crack : 0;
  } })));
  // the chest plate: two leaves of dull ember that swing aside on the bright core
  const pc = V.add(V.mad(cc, fwd, 4.7), V.mul(up, -0.5)), plateM = lit ? M.AUTUMNM : M.HELLSTONE;
  if (ch > 0) part(() => r.ell(V.mad(pc, fwd, -0.4), [2.4, 2.2 + 3.0 * ch, 3.2 + 1.4 * ch], M.FIREM, lf, { noShadow: true, mf: p => { const q = V.sub(p, pc), u = V.dot(q, sideR), v = V.dot(q, up), k = ch >= 1 ? 1 : 0.5; return u * u / (3.4 * 3.4) + v * v / (3.2 * 3.2) < k * k ? (u * u + v * v < 1.5 * k * k ? M.DAYLIGHT : M.EYE_YEL) : 0; } }));
  for (const s of [-1, 1]) {
    const sw = ch * 0.95 * s, dc = V.add(V.add(pc, V.mul(sideR, s * (1.5 + ch * 4.5))), V.mul(fwd, ch * 0.9));
    const ax = [V.add(V.mul(fwd, Math.cos(sw)), V.mul(sideR, Math.sin(sw))), V.add(V.mul(sideR, Math.cos(sw)), V.mul(fwd, -Math.sin(sw))), up];
    part(() => r.ell(dc, [1.8, 2.4, 3.9], plateM, ax, clip === 'idle' && f % 4 === 2 ? { bias: 1 } : {}));
  }
  // arms: boulder shoulders, a chunk on the upper arm, a forearm that swells into a big curled fist
  let handR = V.add(V.add(J.shR, V.mul(fwd, 3.5 + J.swingArm * 2.6)), V.add(V.mul(up, -11), V.mul(sideR, 2.8)));
  let handL = V.add(V.add(J.shL, V.mul(fwd, 3.5 - J.swingArm * 2.6)), V.add(V.mul(up, -11), V.mul(sideR, -2.8)));
  let ember = null;
  if (clip === 'attack') {
    const U = V.norm(V.add(V.mul(up, 0.9), V.mul(sideR, 0.42)));
    handR = V.mad(J.shR, V.norm(V.add(V.mul(fwd, Math.cos(key.a)), V.mul(U, Math.sin(key.a)))), key.r || 11);
    handL = V.add(V.add(J.shL, V.mul(fwd, key.a > 1 ? 5.5 : 1)), V.add(V.mul(up, key.a > 1 ? -6 : -9), V.mul(sideR, -3)));
  } else if (clip === 'cast') {
    const a = key.a;
    handR = a >= 0 ? V.add(V.add(J.shR, V.mul(fwd, 2.5 - a * 2)), V.add(V.mul(up, -9 + a * 20.5), V.mul(sideR, 2.6 + Math.sin(a * Math.PI) * 3)))
      : V.add(V.add(J.shR, V.mul(fwd, 11.5)), V.add(V.mul(up, 1.5 + a * 12), V.mul(sideR, -1)));
    handL = V.add(V.add(J.shL, V.mul(fwd, 1.5)), V.add(V.mul(up, -8.5), V.mul(sideR, -4.5)));
    if (key.em) ember = a;
  } else if (clip === 'hit') { handR = V.add(handR, V.add(V.mul(sideR, 2.5), V.mul(up, 3))); handL = V.add(handL, V.add(V.mul(sideR, -2.5), V.mul(up, 3))); }
  for (const [sh, hand, s] of [[J.shR, handR, 1], [J.shL, handL, -1]]) {
    const a = armTo(J, sh, hand, B, s), sc = V.add(V.mad(sh, up, 0.8), V.mul(sideR, s * 0.6));
    part(() => r.sph(sc, 4.7, rock, RK(s > 0 ? { mf: p => { const q = V.sub(p, sc); return crack && V.dot(q, sideR) > 1 && Math.abs(V.dot(q, fwd) * 0.55 + V.dot(q, up) * 0.6 - 0.6) < 0.42 && Math.abs(V.dot(q, fwd)) < 1.7 ? crack : 0; } } : {})));
    part(() => { r.cone(sh, a.el, 2.0, 2.0, core); r.sph(a.el, 2.3, core); r.ell(V.lerp(sh, a.el, 0.56), [2.5, 3.1, 3.1], rock, frameAlong(V.sub(a.el, sh)), RK()); });
    part(() => { r.cone(a.el, a.hand, 2.0, 2.0, core); r.cone(V.lerp(a.el, a.hand, 0.3), V.lerp(a.el, a.hand, 0.82), 3.0, 3.7, rock, RK()); });
    part(() => {
      const dn = V.norm(V.sub(a.hand, a.el)), kf = V.norm(V.sub(fwd, V.mul(dn, V.dot(fwd, dn)))), ks = V.norm(V.cross(dn, kf));
      r.sph(a.hand, 4.0, rock, RK());
      for (const u of [-1, 0, 1]) r.sph(V.add(V.add(V.mad(a.hand, dn, 2.0), V.mul(kf, 2.5)), V.mul(ks, u * 2.0)), 1.6, rock, RK());   // curled fingers
      r.sph(V.add(V.mad(a.hand, kf, 2.4), V.mul(ks, -s * 3.0)), 1.6, rock, RK());   // thumb
    });
  }
  if (ember !== null) {   // the ember it is about to lob: a coal with a flame standing on it
    const e = V.add(handR, [0, 0, 6.2]);
    r.sph(e, 2.6 + ember * 0.5, M.FIREM, { noShadow: true });
    r.cone(V.add(e, [0, 0, 1.2]), V.add(e, [0.4, 0, 5.4 + ember]), 1.9, 0.4, M.EYE_YEL, { noShadow: true });
    r.sph(V.add(e, [0, 0, 0.6]), 1.5, M.DAYLIGHT, { noShadow: true, bias: 1 });
  }
  // head: a flat-topped chimney, hollow at the top, a red-brown collar round its lip, amber eyes in dark sockets
  const hb = V.mad(cc, up, 4.6), HH = 9.6;
  part(() => {
    r.cyl(hb, V.mad(hb, up, HH - 0.3), 4.3, rock, RK({ mf: p => { const q = V.sub(p, hb), v = V.dot(q, up), u = Math.abs(V.dot(q, sideR)); return V.dot(q, fwd) > 1.8 && (u - 1.9) ** 2 + (v - 4.3) ** 2 < 2.6 ? M.DARK : 0; } }));
    r.cyl(V.mad(hb, up, HH - 2.4), V.mad(hb, up, HH), 5.0, core, { bias: 1, mf: p => { const q = V.sub(p, hb), v = V.dot(q, up); return v > HH - 0.25 && V.dot(q, q) - v * v < 3.3 * 3.3 ? (ch >= 1 ? M.FIREM : M.DARK) : 0; } });
    if (lit) for (const s of [-1, 1]) r.sph(V.add(V.add(V.mad(hb, up, 4.3), V.mul(fwd, 4.0)), V.mul(sideR, s * 1.9)), 1.0, M.FIREM, { noShadow: true });
  });
  if (dead >= 1) {   // it cracks and falls apart: every chunk tumbles down into a heap of clinker
    const t = [0, 0.12, 0.45, 0.82, 1, 1][dead];
    parts.forEach(([i0, i1], n) => {
      let c = [0, 0, 0]; for (let i = i0; i < i1; i++) { const p = r.p[i]; c = V.add(c, p.c || V.lerp(p.a, p.b, 0.5)); } c = V.mul(c, 1 / (i1 - i0));
      const h1 = hash(n, 7, 3), h2 = hash(n, 11, 5), h3 = hash(n, 13, 9);
      a2Move(r, i0, i1, c, (h1 - 0.5) * 2.6 * t, (h2 - 0.5) * 2.6 * t, [0, 0, 0]);
      let low = 1e9; for (let i = i0; i < i1; i++) low = Math.min(low, a2Low(r.p[i]));
      const out = V.norm([c[0] + (h1 - 0.5) * 3, c[1] + (h2 - 0.5) * 3, 0]), far = c[2] * 0.3 * (0.6 + h3 * 0.6);
      const dx = out[0] * far - c[0] * 0.3 - 1.5, dy = out[1] * far - c[1] * 0.3, rest = h3 < 0.3 && c[2] > 12 ? 2.6 : 0;
      a2Move(r, i0, i1, c, 0, 0, [dx * t, dy * t, (rest - low) * t * t]);
    });
  }
  scaleRig(r, HUSK_K * (look.scale || 1));
  return r;
}

// ---------------------------------------------------------------- registration
FAMILIES.ripper = { size: [88, 72, 44, 50], gait: 0.09, rig: ripperRig, swing: () => RIPPER_RAKE };
FAMILIES.husk = { size: [68, 72, 34, 56], gait: gaitFrameTiles(HUSK_B, HUSK_K), rig: huskRig, swing: e => e && e.clip === 'cast' ? HUSK_CAST : HUSK_PUNCH };
MONSTERS.shaleripper = { family: 'ripper', name: 'SHALE RIPPER', look: {}, hp: 30, dmg: [5, 9], speed: 30, reach: 1.4, xp: 22, chest: 9, shadow: 11, where: 'act2', minLevel: 99 };
MONSTERS.cinderhusk = { family: 'husk', name: 'CINDER HUSK', look: {}, hp: 40, dmg: [6, 11], speed: 24, reach: 1.5, xp: 26, chest: 26, shadow: 9, where: 'act2', minLevel: 99 };
