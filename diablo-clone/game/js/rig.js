'use strict';
// Character sprites from a tiny 3D rig. Each pose is a list of primitives (spheres, ellipsoids,
// round cones, boxes) in the character's local space: +x forward, +y to the character's right,
// +z up, 1 unit ~ 1 px. (The tile grid i, j with z up is left-handed, so local space is too.)
// A sprite is rendered by casting one orthographic ray per pixel from the fixed isometric camera
// (30° elevation, the angle a 2:1 pixel grid implies), so all 8 facing directions come from the
// same rig: the rig is rotated, never the pixels mirrored, and handedness survives.
// Shading is the form shader from prototype-simple, fed with true 3D normals: quantized Lambert
// into each material's ramp, real cast shadows from shadow rays, a back rim, thresholded specular,
// internal lines only where similar colors overlap in depth, and a black exterior outline.

const CAM_R = [Math.SQRT1_2, -Math.SQRT1_2, 0];                 // screen right
const CAM_D = [0.5 * Math.SQRT1_2, 0.5 * Math.SQRT1_2, -Math.sqrt(3) / 2];  // screen down
const CAM_T = V.cross(CAM_R, CAM_D);                            // toward the viewer
const CAM_V = V.mul(CAM_T, -1);                                 // view ray direction
// one fixed light in screen space (upper left, toward the viewer)
const LIGHT = V.norm([-0.55, -0.65, 0.52]);
const D0 = LIGHT[2];
const LIGHT_W = V.norm(V.add(V.add(V.mul(CAM_R, LIGHT[0]), V.mul(CAM_D, LIGHT[1])), V.mul(CAM_T, LIGHT[2])));
const HALF = V.norm([LIGHT[0], LIGHT[1], LIGHT[2] + 1]);
// soft shading (round 10): gentler shadow-side falloff; false = the original hard falloff
let SOFT_SHADE = true;
// world <-> screen for points on the ground: screen = (dot(p, R), dot(p, D)); tile edge in units
const TILE_U = 16 * Math.SQRT2;

// ---------------------------------------------------------------- materials
// span scales how far form shading travels along the ramp (cloth low, metal high);
// spec = [threshold on n·H, palette index], guaranteed at least 1 px on shiny parts.
const M = {}, MATS = [null];
function defMat(name, ramp, mid, opt = {}) {
  MATS.push({ name, ramp, mid, shiny: !!opt.shiny, flat: !!opt.flat, emis: !!opt.emis, span: opt.span ?? 1, spec: opt.spec || null, edge: !!opt.edge });
  M[name] = MATS.length - 1;
}
defMat('STEEL', STEEL, 2, { shiny: true, span: 1.3, spec: [0.94, 32] });
defMat('PLATE', [2, 28, 29, 30, 31, 32], 3, { shiny: true, span: 1.2, spec: [0.95, 32] });   // plate armor: darker mids (edge light was tried and rejected in a blind A/B)
defMat('DSTEEL', [2, 28, 29, 30, 31], 3, { shiny: true, span: 1.3, spec: [0.95, 31] });   // blackened plate
defMat('BLADE', [29, 30, 31, 32, 27], 3, { shiny: true, span: 1.2, spec: [0.9, 27] });
defMat('IRON', [2, 28, 29, 30], 1, { span: 0.9, spec: [0.97, 30] });
defMat('CHAIN', [28, 29, 30, 31], 2, { span: 0.8, spec: [0.985, 31] });
defMat('BONE', BONE, 2, { span: 0.9, spec: [0.975, 27] });
defMat('OLDBONE', [3, 24, 25, 26], 2, { span: 0.9, spec: [0.98, 26] });
defMat('CLOTH_RED', RED, 3, { span: 0.6 });
defMat('CLOTH_BLUE', BLUE, 2, { span: 0.6 });
defMat('CLOTH_GREEN', GREEN, 2, { span: 0.6 });
defMat('CLOTH_PURPLE', PURPLE, 2, { span: 0.6 });
defMat('CLOTH_DARK', [2, 3, 5, 6], 2, { span: 0.6 });
defMat('WOOD', WOOD, 2, { span: 0.8 });
defMat('LEATHER', [33, 34, 35, 36], 2, { span: 0.8 });
defMat('FLESH', FLESH, 1, { span: 1.0, spec: [0.985, 47] });
defMat('SKIN', SKIN, 2, { span: 0.9 });
defMat('HORN', [3, 24, 25, 26], 1, { spec: [0.97, 26] });
defMat('CHITIN', [2, 41, 42, 43], 2, { span: 1.0, spec: [0.982, 25] });
defMat('GOLD', GOLD, 2, { shiny: true, span: 1.1, spec: [0.93, 51] });
defMat('HAIR', [33, 34, 35], 1, { span: 0.7 });
defMat('DARK', [2], 0, { flat: true });
defMat('EYE_RED', [23], 0, { flat: true, emis: true });
defMat('EYE_YEL', [17], 0, { flat: true, emis: true });
defMat('EYE_GRN', [55], 0, { flat: true, emis: true });
defMat('FIREM', [16], 0, { flat: true, emis: true });
defMat('MAGIC', [59], 0, { flat: true, emis: true });
defMat('MARK', [20, 21, 22], 1, { span: 0.6 });
defMat('ROCK', [65, 66, 67, 68, 69], 2, { span: 1.0 });
defMat('HELLSTONE', [73, 74, 75, 76, 77], 2, { span: 0.9 });
defMat('STONE', [5, 6, 7, 8, 9, 10], 2, { span: 0.9 });
defMat('FUNGUS', [71], 0, { flat: true, emis: true });
defMat('FUNGUS2', [72], 0, { flat: true, emis: true });
defMat('WAX', [25, 26, 27], 1, { span: 0.6 });
defMat('LAVAM', [82], 0, { flat: true, emis: true });
defMat('HIDE', [2, 28, 29, 30], 2, { span: 0.9 });   // grey dead hide (bone hound)
defMat('RUST', [28, 29, 35, 49], 1, { span: 0.9, spec: [0.985, 50] });   // rusted iron: grey going orange
defMat('MARKB', [21, 22, 23], 1, { span: 0.5 });
defMat('BLOODY', [19, 20, 21, 22], 1, { span: 0.8 });

// ---------------------------------------------------------------- rig builder
class Rig {
  constructor() { this.p = []; this.part = 0; this.lock = false; this.tris = []; this.dots = []; }
  next() { if (!this.lock) this.part++; return this.part; }
  group(fn) { this.part++; this.lock = true; fn(); this.lock = false; }
  add(o) { o.part = this.next(); this.p.push(o); return o; }
  sph(c, r, m, o = {}) { return this.add({ k: 0, c, r, m, ...o }); }
  // ellipsoid with radii along axes ex, ey, ez (unit vectors; default the local axes)
  ell(c, rad, m, axes = null, o = {}) { return this.add({ k: 1, c, rad, ax: axes || [[1, 0, 0], [0, 1, 0], [0, 0, 1]], m, ...o }); }
  // round cone: sphere ra at a blended into sphere rb at b (ra = rb is a capsule)
  cone(a, b, ra, rb, m, o = {}) {
    const L = V.len(V.sub(b, a));
    if (L <= Math.abs(ra - rb) + 0.05) return ra > rb ? this.sph(a, ra, m, o) : this.sph(b, rb, m, o);
    return this.add({ k: 2, a, b, ra, rb, m, ...o });
  }
  // capped cylinder from a to b
  cyl(a, b, r, m, o = {}) { return this.add({ k: 4, a, b, r, m, ...o }); }
  // oriented box: half extents along axes ex, ey, ez
  box(c, half, m, axes = null, o = {}) { return this.add({ k: 3, c, half, ax: axes || [[1, 0, 0], [0, 1, 0], [0, 0, 1]], m, ...o }); }
  // emissive triangles drawn after shading (weapon smears), depth-tested against the body
  tri(a, b, c, col, dither = false) { this.tris.push([a, b, c, col, dither]); }
  dot(p, col) { this.dots.push([p, col]); }
}
// axes for a frame whose x axis points along dir (y kept as level as possible)
function frameAlong(dir, up = [0, 0, 1]) {
  const x = V.norm(dir);
  let y = V.cross(up, x); if (V.len(y) < 1e-3) y = V.cross([1, 0, 0], x);
  y = V.norm(y);
  return [x, y, V.cross(x, y)];
}

// ---------------------------------------------------------------- ray intersections
let HT = 0; const HN = [0, 0, 0];
function hitPrim(p, o, d) {
  if (p.k === 0) {
    const ox = o[0] - p.c[0], oy = o[1] - p.c[1], oz = o[2] - p.c[2];
    const b = ox * d[0] + oy * d[1] + oz * d[2], c = ox * ox + oy * oy + oz * oz - p.r * p.r, h = b * b - c;
    if (h < 0) return false;
    HT = -b - Math.sqrt(h);
    HN[0] = (ox + d[0] * HT) / p.r; HN[1] = (oy + d[1] * HT) / p.r; HN[2] = (oz + d[2] * HT) / p.r;
    return true;
  }
  if (p.k === 1) {
    const A = p.ax, R = p.rad, a0 = A[0], a1 = A[1], a2 = A[2];
    const cx = o[0] - p.c[0], cy = o[1] - p.c[1], cz = o[2] - p.c[2];
    const o0 = (cx * a0[0] + cy * a0[1] + cz * a0[2]) / R[0], o1 = (cx * a1[0] + cy * a1[1] + cz * a1[2]) / R[1], o2 = (cx * a2[0] + cy * a2[1] + cz * a2[2]) / R[2];
    const d0 = (d[0] * a0[0] + d[1] * a0[1] + d[2] * a0[2]) / R[0], d1 = (d[0] * a1[0] + d[1] * a1[1] + d[2] * a1[2]) / R[1], d2 = (d[0] * a2[0] + d[1] * a2[1] + d[2] * a2[2]) / R[2];
    const a = d0 * d0 + d1 * d1 + d2 * d2, b = o0 * d0 + o1 * d1 + o2 * d2, c = o0 * o0 + o1 * o1 + o2 * o2 - 1;
    const h = b * b - a * c; if (h < 0) return false;
    HT = (-b - Math.sqrt(h)) / a;
    const p0 = (o0 + d0 * HT) / R[0], p1 = (o1 + d1 * HT) / R[1], p2 = (o2 + d2 * HT) / R[2];
    const nx = a0[0] * p0 + a1[0] * p1 + a2[0] * p2, ny = a0[1] * p0 + a1[1] * p1 + a2[1] * p2, nz = a0[2] * p0 + a1[2] * p1 + a2[2] * p2;
    const l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    HN[0] = nx / l; HN[1] = ny / l; HN[2] = nz / l;
    return true;
  }
  if (p.k === 2) {   // round cone (Inigo Quilez)
    const pa = p.a, pb = p.b, ra = p.ra, rb = p.rb, rr = ra - rb;
    const bax = pb[0] - pa[0], bay = pb[1] - pa[1], baz = pb[2] - pa[2];
    const oax = o[0] - pa[0], oay = o[1] - pa[1], oaz = o[2] - pa[2];
    const obx = o[0] - pb[0], oby = o[1] - pb[1], obz = o[2] - pb[2];
    const m0 = bax * bax + bay * bay + baz * baz, m1 = bax * oax + bay * oay + baz * oaz, m2 = bax * d[0] + bay * d[1] + baz * d[2];
    const m3 = d[0] * oax + d[1] * oay + d[2] * oaz, m5 = oax * oax + oay * oay + oaz * oaz, m6 = obx * d[0] + oby * d[1] + obz * d[2], m7 = obx * obx + oby * oby + obz * obz;
    const d2 = m0 - rr * rr, k2 = d2 - m2 * m2, k1 = d2 * m3 - m1 * m2 + m2 * rr * ra, k0 = d2 * m5 - m1 * m1 + m1 * rr * ra * 2 - m0 * ra * ra;
    const h = k1 * k1 - k0 * k2; if (h < 0) return false;
    let t = (-Math.sqrt(h) - k1) / k2;
    const y = m1 - ra * rr + t * m2;
    if (y > 0 && y < d2) {
      HT = t;
      const nx = d2 * (oax + d[0] * t) - bax * y, ny = d2 * (oay + d[1] * t) - bay * y, nz = d2 * (oaz + d[2] * t) - baz * y;
      const l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      HN[0] = nx / l; HN[1] = ny / l; HN[2] = nz / l;
      return true;
    }
    const h1 = m3 * m3 - m5 + ra * ra, h2 = m6 * m6 - m7 + rb * rb;
    if (Math.max(h1, h2) < 0) return false;
    let best = 1e20;
    if (h1 > 0) { t = -m3 - Math.sqrt(h1); best = t; HN[0] = (oax + d[0] * t) / ra; HN[1] = (oay + d[1] * t) / ra; HN[2] = (oaz + d[2] * t) / ra; }
    if (h2 > 0) { t = -m6 - Math.sqrt(h2); if (t < best) { best = t; HN[0] = (obx + d[0] * t) / rb; HN[1] = (oby + d[1] * t) / rb; HN[2] = (obz + d[2] * t) / rb; } }
    HT = best;
    return true;
  }
  if (p.k === 4) {   // capped cylinder (Inigo Quilez)
    const ba = V.sub(p.b, p.a), oc = V.sub(o, p.a);
    const baba = V.dot(ba, ba), bard = V.dot(ba, d), baoc = V.dot(ba, oc);
    const k2 = baba - bard * bard, k1 = baba * V.dot(oc, d) - baoc * bard, k0 = baba * V.dot(oc, oc) - baoc * baoc - p.r * p.r * baba;
    let h = k1 * k1 - k2 * k0; if (h < 0) return false;
    h = Math.sqrt(h);
    let t = (-k1 - h) / k2;
    const y = baoc + t * bard;
    if (y > 0 && y < baba) {
      HT = t; const q = V.mad(oc, d, t), n = V.mul(V.sub(q, V.mul(ba, y / baba)), 1 / p.r);
      HN[0] = n[0]; HN[1] = n[1]; HN[2] = n[2]; return true;
    }
    t = ((y < 0 ? 0 : baba) - baoc) / bard;
    if (Math.abs(k1 + k2 * t) < h) { HT = t; const s = Math.sign(y) / Math.sqrt(baba); HN[0] = ba[0] * s; HN[1] = ba[1] * s; HN[2] = ba[2] * s; return true; }
    return false;
  }
  // oriented box (slabs)
  const oc = V.sub(o, p.c), A = p.ax, Hh = p.half;
  let tn = -1e20, tf = 1e20, ax = 0, sg = 1;
  for (let i = 0; i < 3; i++) {
    const oo = V.dot(oc, A[i]), dd = V.dot(d, A[i]);
    if (Math.abs(dd) < 1e-9) { if (Math.abs(oo) > Hh[i]) return false; continue; }
    let t1 = (-Hh[i] - oo) / dd, t2 = (Hh[i] - oo) / dd, s = -1;
    if (t1 > t2) { const q = t1; t1 = t2; t2 = q; s = 1; }
    if (t1 > tn) { tn = t1; ax = i; sg = s; }
    if (t2 < tf) tf = t2;
    if (tn > tf) return false;
  }
  if (tf < 0) return false;
  HT = tn; HN[0] = A[ax][0] * sg; HN[1] = A[ax][1] * sg; HN[2] = A[ax][2] * sg;
  return true;
}
function boundOf(p) {
  if (p.k === 0) return [p.c, p.r];
  if (p.k === 1) return [p.c, Math.max(...p.rad)];
  if (p.k === 2) return [V.lerp(p.a, p.b, 0.5), V.len(V.sub(p.b, p.a)) / 2 + Math.max(p.ra, p.rb)];
  if (p.k === 4) return [V.lerp(p.a, p.b, 0.5), V.len(V.sub(p.b, p.a)) / 2 + p.r];
  return [p.c, V.len(p.half)];
}

// ---------------------------------------------------------------- render + shade
// returns a sprite {w, h, ax, ay, data (palette index | EMIS), z (pixel height)}
function renderRig(rig, yaw, w, h, ax, ay) {
  const R = V.rotZ(CAM_R, -yaw), D = V.rotZ(CAM_D, -yaw), VD = V.rotZ(CAM_V, -yaw), T = V.mul(VD, -1), LL = V.rotZ(LIGHT_W, -yaw);
  const prims = rig.p, np = prims.length;
  const bx0 = new Float32Array(np), bx1 = new Float32Array(np), by0 = new Float32Array(np), by1 = new Float32Array(np);
  let gx0 = 1e9, gx1 = -1e9, gy0 = 1e9, gy1 = -1e9;
  prims.forEach((p, i) => {
    const [c, r] = boundOf(p);
    p._c = c; p._r2 = r * r;
    if (p.k === 2 || p.k === 4) {   // segments: bound the two end caps, not the whole sphere
      const rr = p.k === 2 ? Math.max(p.ra, p.rb) : p.r * 1.42;
      const ax0 = V.dot(p.a, R), ay0 = V.dot(p.a, D), bx = V.dot(p.b, R), by = V.dot(p.b, D);
      bx0[i] = Math.min(ax0, bx) - rr; bx1[i] = Math.max(ax0, bx) + rr; by0[i] = Math.min(ay0, by) - rr; by1[i] = Math.max(ay0, by) + rr;
    } else { const sx = V.dot(c, R), sy = V.dot(c, D); bx0[i] = sx - r; bx1[i] = sx + r; by0[i] = sy - r; by1[i] = sy + r; }
    gx0 = Math.min(gx0, bx0[i]); gx1 = Math.max(gx1, bx1[i]); gy0 = Math.min(gy0, by0[i]); gy1 = Math.max(gy1, by1[i]);
  });
  // only pixels inside the union of the primitives' screen bounds can be hit
  const PX0 = Math.max(1, Math.floor(gx0 + ax - 1)), PX1 = Math.min(w - 1, Math.ceil(gx1 + ax + 1));
  const PY0 = Math.max(1, Math.floor(gy0 + ay - 1)), PY1 = Math.min(h - 1, Math.ceil(gy1 + ay + 1));
  const n = w * h;
  const m = new Uint8Array(n), pid = new Uint16Array(n), dep = new Float32Array(n).fill(1e9), zz = new Uint8Array(n);
  const nx = new Float32Array(n), ny = new Float32Array(n), nz = new Float32Array(n), shad = new Uint8Array(n), bias = new Int8Array(n);
  // splat each primitive over its own screen box, keeping the nearest hit per pixel
  const bi = new Int16Array(n).fill(-1), o = [0, 0, 0];
  for (let i = 0; i < np; i++) {
    const p = prims[i];
    const x0 = Math.max(PX0, Math.floor(bx0[i] + ax)), x1 = Math.min(PX1 - 1, Math.ceil(bx1[i] + ax));
    const y0 = Math.max(PY0, Math.floor(by0[i] + ay)), y1 = Math.min(PY1 - 1, Math.ceil(by1[i] + ay));
    for (let py = y0; py <= y1; py++) {
      const sy = py - ay + 0.5;
      for (let px = x0; px <= x1; px++) {
        const sx = px - ax + 0.5;
        o[0] = R[0] * sx + D[0] * sy - VD[0] * 400; o[1] = R[1] * sx + D[1] * sy - VD[1] * 400; o[2] = R[2] * sx + D[2] * sy - VD[2] * 400;
        if (!hitPrim(p, o, VD) || HT <= 0) continue;
        const k = py * w + px;
        if (HT >= dep[k]) continue;
        dep[k] = HT; bi[k] = i; nx[k] = HN[0]; ny[k] = HN[1]; nz[k] = HN[2];
      }
    }
  }
  for (let k = 0; k < n; k++) {
    const i = bi[k]; if (i < 0) continue;
    const p = prims[i], bt = dep[k], px = k % w, py = (k / w) | 0, sx = px - ax + 0.5, sy = py - ay + 0.5;
    const P = [R[0] * sx + D[0] * sy + VD[0] * (bt - 400), R[1] * sx + D[1] * sy + VD[1] * (bt - 400), R[2] * sx + D[2] * sy + VD[2] * (bt - 400)];
    const n0 = nx[k], n1 = ny[k], n2 = nz[k];
    let mat = p.m;
    if (p.mf) { const mm = p.mf(P, [n0, n1, n2]); if (mm) mat = mm; }
    m[k] = mat; pid[k] = p.part; zz[k] = clamp(Math.round(P[2]), 0, 255); bias[k] = p.bias || 0;
    nx[k] = n0 * R[0] + n1 * R[1] + n2 * R[2]; ny[k] = n0 * D[0] + n1 * D[1] + n2 * D[2]; nz[k] = n0 * T[0] + n1 * T[1] + n2 * T[2];
    // cast shadow: does anything else sit between this point and the light?
    if (!MATS[mat].flat) {
      const so = [P[0] + n0 * 0.6, P[1] + n1 * 0.6, P[2] + n2 * 0.6];
      for (let i2 = 0; i2 < np; i2++) {
        const q = prims[i2]; if (q.part === p.part || q.noShadow) continue;
        const c = q._c, ox = so[0] - c[0], oy = so[1] - c[1], oz = so[2] - c[2];
        const b = ox * LL[0] + oy * LL[1] + oz * LL[2], cc = ox * ox + oy * oy + oz * oz - q._r2;
        if ((cc > 0 && b > 0) || b * b - cc < 0) continue;
        if (hitPrim(q, so, LL) && HT > 0.3) { shad[k] = 1; break; }
      }
    }
  }
  return shade(w, h, ax, ay, { m, pid, dep, zz, nx, ny, nz, shad, bias }, rig, R, D, VD);
}

function shade(w, h, ax, ay, B, rig, R, D, VD) {
  const { m, pid, dep, zz, nx, ny, nz, shad, bias } = B, n = w * h;
  const tone = new Int8Array(n).fill(-1);
  const lo = mm => lum(MATS[mm].ramp[0]) < 0.1 ? 1 : 0;
  for (let k = 0; k < n; k++) {
    const mm = m[k]; if (!mm) continue;
    const mat = MATS[mm]; if (mat.flat) continue;
    let dot = Math.max(0, nx[k] * LIGHT[0] + ny[k] * LIGHT[1] + nz[k] * LIGHT[2]);
    const len = mat.ramp.length;
    let off = (dot - D0) * (len - 0.5) * mat.span;
    if (SOFT_SHADE) {
      // soft: the shadow side falls off at half the rate, and a cast shadow is one step darker,
      // so turned-away surfaces keep their form instead of collapsing to the darkest color
      if (off < 0) off *= 0.35;
      if (shad[k]) off -= 1;
    } else if (shad[k]) off = Math.min(off, (D0 - 0.25 - D0) * (len - 0.5) * mat.span);
    tone[k] = clamp(Math.round(mat.mid + off + bias[k]), lo(mm), len - 1);
  }
  // majority cleanup: a tone pixel that disagrees with 3+ same-part neighbors joins them
  const t2 = tone.slice();
  const NB = [-1, 1, -w, w], cnt = new Int8Array(16);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const k = y * w + x, tk = tone[k]; if (tk < 0) continue;
    let same = 0, other = 0; cnt.fill(0);
    for (let a = 0; a < 4; a++) {
      const q = k + NB[a], tq = tone[q];
      if (tq < 0 || pid[q] !== pid[k] || m[q] !== m[k]) continue;
      if (tq === tk) same++; else { cnt[tq]++; other++; }
    }
    if (same === 0 && other >= 3) for (let v = 0; v < 16; v++) if (cnt[v] >= 3) t2[k] = v;
  }
  // back rim: silhouette pixels facing away from the light lift one step so dark sides read
  const t3 = t2.slice();
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const k = y * w + x; if (t2[k] < 0) continue;
    const edge = !m[k - 1] || !m[k + 1] || !m[k - w] || !m[k + w];
    if (edge && !shad[k] && nx[k] * 0.55 + ny[k] * 0.65 > 0.45 && t2[k] <= MATS[m[k]].mid) t3[k] = t2[k] + 1;
  }
  // edge light (plate armor): the rim of a part on the side facing the light catches a bright
  // line, as hand-drawn plate does; the shadow-side rim keeps the dark seam
  if (!rig.noEdge) for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const k = y * w + x; if (t3[k] < 0 || !MATS[m[k]].edge || shad[k]) continue;
    const p = pid[k];
    const open = (q) => !m[q] || (pid[q] !== p && dep[q] > dep[k] + 1.5);
    if (!(open(k - 1) || open(k - w) || open(k - w - 1) || open(k + 1 - w))) continue;
    if (-nx[k] * 0.55 - ny[k] * 0.65 > 0.15) t3[k] = MATS[m[k]].ramp.length - 1;
  }
  const d = new Uint8Array(n);
  for (let k = 0; k < n; k++) {
    const mm = m[k]; if (!mm) continue;
    const mat = MATS[mm];
    d[k] = mat.flat ? (mat.ramp[0] | (mat.emis ? EMIS : 0)) : mat.ramp[t3[k]];
  }
  // specular: thresholded Blinn half-vector, never on the silhouette or in shadow; every shiny
  // part gets at least its single brightest pixel
  const best = new Map();
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const k = y * w + x, mm = m[k]; if (!mm || t2[k] < 0) continue;
    const sp = MATS[mm].spec; if (!sp || shad[k]) continue;
    if (!m[k - 1] || !m[k + 1] || !m[k - w] || !m[k + w]) continue;
    const ndh = nx[k] * HALF[0] + ny[k] * HALF[1] + nz[k] * HALF[2];
    if (ndh > sp[0]) d[k] = sp[1];
    if (MATS[mm].shiny) { const key = pid[k] * 256 + mm, bb = best.get(key); if (!bb || ndh > bb[1]) best.set(key, [k, ndh]); }
  }
  for (const [, [k]] of best) d[k] = MATS[m[k]].spec[1];
  // internal lines: a pixel of a part lying behind a neighboring part gets its ramp's darkest
  // step, but only when the two colors are too close to separate on their own
  const o2 = d.slice();
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const k = y * w + x; if (t2[k] < 0) continue;
    for (let a = 0; a < 4; a++) {
      const q = k + NB[a];
      if (!m[q] || pid[q] === pid[k] || dep[q] > dep[k] - 2.5 || (d[q] & EMIS)) continue;
      if (Math.abs(lum(d[q] & 127) - lum(d[k] & 127)) < 0.12) { const rp = MATS[m[k]].ramp; o2[k] = rp[lo(m[k])]; break; }
    }
  }
  // emissive overlays (smears), depth-tested against the body
  const proj = p => [V.dot(p, R) + ax, V.dot(p, D) + ay, V.dot(p, VD)];
  for (const [a, b, c, col, dither] of rig.tris) {
    const A = proj(a), Bq = proj(b), C = proj(c);
    const x0 = Math.max(1, Math.floor(Math.min(A[0], Bq[0], C[0]))), x1 = Math.min(w - 2, Math.ceil(Math.max(A[0], Bq[0], C[0])));
    const y0 = Math.max(1, Math.floor(Math.min(A[1], Bq[1], C[1]))), y1 = Math.min(h - 2, Math.ceil(Math.max(A[1], Bq[1], C[1])));
    const den = (Bq[1] - C[1]) * (A[0] - C[0]) + (C[0] - Bq[0]) * (A[1] - C[1]); if (Math.abs(den) < 1e-6) continue;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = x + 0.5, py = y + 0.5;
      const l1 = ((Bq[1] - C[1]) * (px - C[0]) + (C[0] - Bq[0]) * (py - C[1])) / den, l2 = ((C[1] - A[1]) * (px - C[0]) + (A[0] - C[0]) * (py - C[1])) / den, l3 = 1 - l1 - l2;
      if (l1 < 0 || l2 < 0 || l3 < 0) continue;
      if (dither && ((x + y) & 1)) continue;
      const z = l1 * A[2] + l2 * Bq[2] + l3 * C[2], k = y * w + x;
      if (m[k] && dep[k] - 400 < z + 2) continue;   // the blade itself stays in front of its trail
      o2[k] = col | EMIS; m[k] = 255;
    }
  }
  for (const [p, col] of rig.dots) {
    const [x, y, z] = proj(p), k = Math.floor(y) * w + Math.floor(x);
    if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) continue;
    if (m[k] && m[k] !== 255 && dep[k] - 400 < z) continue;
    o2[k] = col | EMIS; m[k] = 255;
  }
  // exterior outline
  const out = o2.slice();
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const k = y * w + x;
    if (!o2[k] && (o2[k - 1] || o2[k + 1] || o2[k - w] || o2[k + w])) out[k] = BLK;
  }
  return { w, h, ax, ay, data: out, z: zz };
}

// uniform scale of a whole rig about the ground origin (size variants of one family)
function scaleRig(rig, k) {
  for (const p of rig.p) {
    if (p.c) p.c = V.mul(p.c, k);
    if (p.a) { p.a = V.mul(p.a, k); p.b = V.mul(p.b, k); p.ra *= k; p.rb *= k; }
    if (p.r) p.r *= k;
    if (p.rad) p.rad = V.mul(p.rad, k);
    if (p.half) p.half = V.mul(p.half, k);
    if (p.mf) { const f = p.mf; p.mf = (q, n) => f(V.mul(q, 1 / k), n); }
  }
  rig.tris = rig.tris.map(([a, b, c, col, d]) => [V.mul(a, k), V.mul(b, k), V.mul(c, k), col, d]);
}
