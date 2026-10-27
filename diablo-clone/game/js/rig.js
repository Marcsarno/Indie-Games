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
// world <-> screen for points on the ground: screen = (dot(p, R), dot(p, D)); tile edge in units
const TILE_U = 16 * Math.SQRT2;

// ---------------------------------------------------------------- materials
// span scales how far form shading travels along the ramp (cloth low, metal high);
// spec = [threshold on n·H, palette index], guaranteed at least 1 px on shiny parts.
const M = {}, MATS = [null];
function defMat(name, ramp, mid, opt = {}) {
  MATS.push({ name, ramp, mid, shiny: !!opt.shiny, flat: !!opt.flat, emis: !!opt.emis, span: opt.span ?? 1, spec: opt.spec || null });
  M[name] = MATS.length - 1;
}
defMat('STEEL', STEEL, 2, { shiny: true, span: 1.3, spec: [0.94, 32] });
defMat('DSTEEL', [2, 28, 29, 30, 31], 2, { shiny: true, span: 1.3, spec: [0.95, 31] });   // blackened plate
defMat('BLADE', [29, 30, 31, 32, 27], 3, { shiny: true, span: 1.2, spec: [0.9, 27] });
defMat('IRON', [2, 28, 29, 30], 1, { span: 0.9, spec: [0.97, 30] });
defMat('CHAIN', [28, 29, 30, 31], 1, { span: 0.8, spec: [0.985, 31] });
defMat('BONE', BONE, 2, { span: 0.9, spec: [0.975, 27] });
defMat('OLDBONE', [3, 24, 25, 26], 2, { span: 0.9, spec: [0.98, 26] });
defMat('CLOTH_RED', RED, 3, { span: 0.6 });
defMat('CLOTH_BLUE', BLUE, 2, { span: 0.6 });
defMat('CLOTH_GREEN', GREEN, 2, { span: 0.6 });
defMat('CLOTH_PURPLE', PURPLE, 2, { span: 0.6 });
defMat('CLOTH_DARK', [2, 3, 5, 6], 2, { span: 0.6 });
defMat('WOOD', WOOD, 2, { span: 0.8 });
defMat('LEATHER', [33, 34, 35, 36], 1, { span: 0.8 });
defMat('FLESH', FLESH, 1, { span: 1.0, spec: [0.985, 47] });
defMat('SKIN', SKIN, 2, { span: 0.9 });
defMat('HORN', [3, 24, 25, 26], 1, { spec: [0.97, 26] });
defMat('CHITIN', [2, 41, 42, 43], 2, { span: 1.0, spec: [0.975, 36] });
defMat('GOLD', GOLD, 2, { shiny: true, span: 1.1, spec: [0.93, 51] });
defMat('HAIR', [33, 34, 35], 1, { span: 0.7 });
defMat('DARK', [2], 0, { flat: true });
defMat('EYE_RED', [23], 0, { flat: true, emis: true });
defMat('EYE_YEL', [17], 0, { flat: true, emis: true });
defMat('EYE_GRN', [55], 0, { flat: true, emis: true });
defMat('FIREM', [16], 0, { flat: true, emis: true });
defMat('MAGIC', [59], 0, { flat: true, emis: true });
defMat('MARK', [20, 21, 22], 1, { span: 0.6 });
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
  // oriented box: half extents along axes ex, ey, ez
  box(c, half, m, axes = null, o = {}) { return this.add({ k: 3, c, half, ax: axes || [[1, 0, 0], [0, 1, 0], [0, 0, 1]], m, ...o }); }
  // emissive triangles drawn after shading (weapon smears), depth-tested against the body
  tri(a, b, c, col) { this.tris.push([a, b, c, col]); }
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
    const oc = V.sub(o, p.c), A = p.ax, R = p.rad;
    const o0 = V.dot(oc, A[0]) / R[0], o1 = V.dot(oc, A[1]) / R[1], o2 = V.dot(oc, A[2]) / R[2];
    const d0 = V.dot(d, A[0]) / R[0], d1 = V.dot(d, A[1]) / R[1], d2 = V.dot(d, A[2]) / R[2];
    const a = d0 * d0 + d1 * d1 + d2 * d2, b = o0 * d0 + o1 * d1 + o2 * d2, c = o0 * o0 + o1 * o1 + o2 * o2 - 1;
    const h = b * b - a * c; if (h < 0) return false;
    HT = (-b - Math.sqrt(h)) / a;
    const p0 = (o0 + d0 * HT) / R[0], p1 = (o1 + d1 * HT) / R[1], p2 = (o2 + d2 * HT) / R[2];
    const n = V.norm([A[0][0] * p0 + A[1][0] * p1 + A[2][0] * p2, A[0][1] * p0 + A[1][1] * p1 + A[2][1] * p2, A[0][2] * p0 + A[1][2] * p1 + A[2][2] * p2]);
    HN[0] = n[0]; HN[1] = n[1]; HN[2] = n[2];
    return true;
  }
  if (p.k === 2) {   // round cone (Inigo Quilez)
    const ba = V.sub(p.b, p.a), oa = V.sub(o, p.a), ob = V.sub(o, p.b), ra = p.ra, rb = p.rb, rr = ra - rb;
    const m0 = V.dot(ba, ba), m1 = V.dot(ba, oa), m2 = V.dot(ba, d), m3 = V.dot(d, oa), m5 = V.dot(oa, oa), m6 = V.dot(ob, d), m7 = V.dot(ob, ob);
    const d2 = m0 - rr * rr, k2 = d2 - m2 * m2, k1 = d2 * m3 - m1 * m2 + m2 * rr * ra, k0 = d2 * m5 - m1 * m1 + m1 * rr * ra * 2 - m0 * ra * ra;
    const h = k1 * k1 - k0 * k2; if (h < 0) return false;
    let t = (-Math.sqrt(h) - k1) / k2;
    const y = m1 - ra * rr + t * m2;
    if (y > 0 && y < d2) {
      HT = t;
      const n = V.norm(V.sub(V.mul(V.mad(oa, d, t), d2), V.mul(ba, y)));
      HN[0] = n[0]; HN[1] = n[1]; HN[2] = n[2];
      return true;
    }
    const h1 = m3 * m3 - m5 + ra * ra, h2 = m6 * m6 - m7 + rb * rb;
    if (Math.max(h1, h2) < 0) return false;
    let best = 1e20;
    if (h1 > 0) { t = -m3 - Math.sqrt(h1); best = t; const q = V.mad(oa, d, t); HN[0] = q[0] / ra; HN[1] = q[1] / ra; HN[2] = q[2] / ra; }
    if (h2 > 0) { t = -m6 - Math.sqrt(h2); if (t < best) { best = t; const q = V.mad(ob, d, t); HN[0] = q[0] / rb; HN[1] = q[1] / rb; HN[2] = q[2] / rb; } }
    HT = best;
    return true;
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
  return [p.c, V.len(p.half)];
}

// ---------------------------------------------------------------- render + shade
// returns a sprite {w, h, ax, ay, data (palette index | EMIS), z (pixel height)}
function renderRig(rig, yaw, w, h, ax, ay) {
  const R = V.rotZ(CAM_R, -yaw), D = V.rotZ(CAM_D, -yaw), VD = V.rotZ(CAM_V, -yaw), T = V.mul(VD, -1), LL = V.rotZ(LIGHT_W, -yaw);
  const prims = rig.p, np = prims.length;
  const bx0 = new Float32Array(np), bx1 = new Float32Array(np), by0 = new Float32Array(np), by1 = new Float32Array(np);
  prims.forEach((p, i) => {
    const [c, r] = boundOf(p), sx = V.dot(c, R), sy = V.dot(c, D);
    bx0[i] = sx - r; bx1[i] = sx + r; by0[i] = sy - r; by1[i] = sy + r;
  });
  const n = w * h;
  const m = new Uint8Array(n), pid = new Uint16Array(n), dep = new Float32Array(n).fill(1e9), zz = new Uint8Array(n);
  const nx = new Float32Array(n), ny = new Float32Array(n), nz = new Float32Array(n), shad = new Uint8Array(n), bias = new Int8Array(n);
  const o = [0, 0, 0];
  for (let py = 1; py < h - 1; py++) for (let px = 1; px < w - 1; px++) {
    const sx = px - ax + 0.5, sy = py - ay + 0.5;
    o[0] = R[0] * sx + D[0] * sy - VD[0] * 400; o[1] = R[1] * sx + D[1] * sy - VD[1] * 400; o[2] = R[2] * sx + D[2] * sy - VD[2] * 400;
    let bt = 1e9, bi = -1, n0 = 0, n1 = 0, n2 = 0;
    for (let i = 0; i < np; i++) {
      if (sx < bx0[i] || sx > bx1[i] || sy < by0[i] || sy > by1[i]) continue;
      if (hitPrim(prims[i], o, VD) && HT < bt && HT > 0) { bt = HT; bi = i; n0 = HN[0]; n1 = HN[1]; n2 = HN[2]; }
    }
    if (bi < 0) continue;
    const k = py * w + px, p = prims[bi], P = V.mad(o, VD, bt);
    let mat = p.m;
    if (p.mf) { const mm = p.mf(P, [n0, n1, n2]); if (mm) mat = mm; }
    m[k] = mat; pid[k] = p.part; dep[k] = bt; zz[k] = clamp(Math.round(P[2]), 0, 255); bias[k] = p.bias || 0;
    nx[k] = n0 * R[0] + n1 * R[1] + n2 * R[2]; ny[k] = n0 * D[0] + n1 * D[1] + n2 * D[2]; nz[k] = n0 * T[0] + n1 * T[1] + n2 * T[2];
    // cast shadow: does anything else sit between this point and the light?
    if (!MATS[mat].flat) {
      const so = [P[0] + n0 * 0.6, P[1] + n1 * 0.6, P[2] + n2 * 0.6];
      for (let i = 0; i < np; i++) {
        const q = prims[i]; if (q.part === p.part || q.noShadow) continue;
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
    if (shad[k]) dot = Math.min(dot, D0 - 0.25);
    const len = mat.ramp.length;
    tone[k] = clamp(Math.round(mat.mid + (dot - D0) * (len - 0.5) * mat.span + bias[k]), lo(mm), len - 1);
  }
  // majority cleanup: a tone pixel that disagrees with 3+ same-part neighbors joins them
  const t2 = tone.slice();
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const k = y * w + x; if (tone[k] < 0) continue;
    const cnt = {}; let same = 0;
    for (const q of [k - 1, k + 1, k - w, k + w]) {
      if (tone[q] < 0 || pid[q] !== pid[k] || m[q] !== m[k]) continue;
      if (tone[q] === tone[k]) same++; else cnt[tone[q]] = (cnt[tone[q]] || 0) + 1;
    }
    if (same === 0) for (const v in cnt) if (cnt[v] >= 3) t2[k] = +v;
  }
  // back rim: silhouette pixels facing away from the light lift one step so dark sides read
  const t3 = t2.slice();
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const k = y * w + x; if (t2[k] < 0) continue;
    const edge = !m[k - 1] || !m[k + 1] || !m[k - w] || !m[k + w];
    if (edge && !shad[k] && nx[k] * 0.55 + ny[k] * 0.65 > 0.45 && t2[k] <= MATS[m[k]].mid) t3[k] = t2[k] + 1;
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
    for (const q of [k - 1, k + 1, k - w, k + w]) {
      if (!m[q] || pid[q] === pid[k] || dep[q] > dep[k] - 2.5 || (d[q] & EMIS)) continue;
      if (Math.abs(lum(d[q] & 127) - lum(d[k] & 127)) < 0.12) { const rp = MATS[m[k]].ramp; o2[k] = rp[lo(m[k])]; break; }
    }
  }
  // emissive overlays (smears), depth-tested against the body
  const proj = p => [V.dot(p, R) + ax, V.dot(p, D) + ay, V.dot(p, VD)];
  for (const [a, b, c, col] of rig.tris) {
    const A = proj(a), Bq = proj(b), C = proj(c);
    const x0 = Math.max(1, Math.floor(Math.min(A[0], Bq[0], C[0]))), x1 = Math.min(w - 2, Math.ceil(Math.max(A[0], Bq[0], C[0])));
    const y0 = Math.max(1, Math.floor(Math.min(A[1], Bq[1], C[1]))), y1 = Math.min(h - 2, Math.ceil(Math.max(A[1], Bq[1], C[1])));
    const den = (Bq[1] - C[1]) * (A[0] - C[0]) + (C[0] - Bq[0]) * (A[1] - C[1]); if (Math.abs(den) < 1e-6) continue;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = x + 0.5, py = y + 0.5;
      const l1 = ((Bq[1] - C[1]) * (px - C[0]) + (C[0] - Bq[0]) * (py - C[1])) / den, l2 = ((C[1] - A[1]) * (px - C[0]) + (A[0] - C[0]) * (py - C[1])) / den, l3 = 1 - l1 - l2;
      if (l1 < 0 || l2 < 0 || l3 < 0) continue;
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
  rig.tris = rig.tris.map(([a, b, c, col]) => [V.mul(a, k), V.mul(b, k), V.mul(c, k), col]);
}
