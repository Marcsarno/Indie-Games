'use strict';
// rigdump.js: turns the 2D game's rigs (lists of spheres, ellipsoids, round cones, cylinders and boxes, each with a
// material and an optional paint function) into data the Blender converter builds 3D models from.
// Loaded after the game's own scripts: by tools/dump.cjs (to export) and by the 3D game (to name what it needs).
// Space: Blender's (z up, right-handed), in tiles: rig point (x, y, z) -> (x, -y, z) / TILE_U. A model faces +X.
const RD = (() => {
  let U = 1 / TILE_U;
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len = a => Math.hypot(a[0], a[1], a[2]), norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const B = p => [p[0] * U, -p[1] * U, p[2] * U], Bv = v => [v[0], -v[1], v[2]], unB = P => [P[0] / U, -P[1] / U, P[2] / U];
  const r4 = x => Math.round(x * 1e4) / 1e4;
  // rotate x by the smallest turn that takes unit e0 onto unit e1
  function transport(e0, e1, x) {
    const c = dot(e0, e1); if (c > 0.99999) return x.slice();
    if (c < -0.99999) { const ax = norm(Math.abs(e0[0]) < 0.9 ? cross(e0, [1, 0, 0]) : cross(e0, [0, 1, 0])); return sub(mul(ax, 2 * dot(ax, x)), x); }
    const ax = cross(e0, e1), s2 = dot(ax, ax), k = (1 - c) / s2;
    return add(add(mul(x, c), cross(ax, x)), mul(ax, dot(ax, x) * k));
  }
  function rotAxis(ax, ang, x) { const c = Math.cos(ang), s = Math.sin(ang); return add(add(mul(x, c), mul(cross(ax, x), s)), mul(ax, dot(ax, x) * (1 - c))); }
  function quat(ex, ey, ez) {   // rotation matrix with columns ex, ey, ez -> [w, x, y, z]
    const m00 = ex[0], m10 = ex[1], m20 = ex[2], m01 = ey[0], m11 = ey[1], m21 = ey[2], m02 = ez[0], m12 = ez[1], m22 = ez[2], tr = m00 + m11 + m22;
    let w, x, y, z;
    if (tr > 0) { const s = Math.sqrt(tr + 1) * 2; w = s / 4; x = (m21 - m12) / s; y = (m02 - m20) / s; z = (m10 - m01) / s; }
    else if (m00 > m11 && m00 > m22) { const s = Math.sqrt(1 + m00 - m11 - m22) * 2; w = (m21 - m12) / s; x = s / 4; y = (m01 + m10) / s; z = (m02 + m20) / s; }
    else if (m11 > m22) { const s = Math.sqrt(1 + m11 - m00 - m22) * 2; w = (m02 - m20) / s; x = (m01 + m10) / s; y = s / 4; z = (m12 + m21) / s; }
    else { const s = Math.sqrt(1 + m22 - m00 - m11) * 2; w = (m10 - m01) / s; x = (m02 + m20) / s; y = (m12 + m21) / s; z = s / 4; }
    return [w, x, y, z];
  }
  const cls = q => (q.k === 0 || q.k === 2) ? 'R' : q.k;
  const sig = q => cls(q) + ':' + q.m + (q.mf ? 'f' : '');

  // The primitive's own frame: origin o, axes ex ey ez (ey = its long axis), and its sizes.
  // rest = the same part's rest frame (its axes are carried over where the primitive has none of its own).
  function frame(q, kind, rest) {
    if (kind === 'sph') { const R = rest || { ex: [1, 0, 0], ey: [0, 0, 1], ez: [0, -1, 0] }; return { o: B(q.c), ex: R.ex, ey: R.ey, ez: R.ez, s: [q.r * U, q.r * U, q.r * U] }; }
    if (kind === 'ell') { const ex = norm(Bv(q.ax[0])); let ey = Bv(q.ax[2]); ey = norm(sub(ey, mul(ex, dot(ex, ey)))); return { o: B(q.c), ex, ey, ez: cross(ex, ey), s: [q.rad[0] * U, q.rad[2] * U, q.rad[1] * U] }; }
    if (kind === 'box') { const ex = norm(Bv(q.ax[0])); let ey = Bv(q.ax[1]); ey = norm(sub(ey, mul(ex, dot(ex, ey)))); return { o: B(q.c), ex, ey, ez: cross(ex, ey), s: [q.half[0] * U, q.half[1] * U, q.half[2] * U] }; }
    // cone / cyl (a sphere standing in for a cone that has shrunk to nothing is a cone of no length)
    const a = q.k === 0 ? B(q.c) : B(q.a), b = q.k === 0 ? B(q.c) : B(q.b), d = sub(b, a), L = len(d);
    const ra = (q.k === 0 ? q.r : q.k === 2 ? q.ra : q.r) * U, rb = (q.k === 0 ? q.r : q.k === 2 ? q.rb : q.r) * U;
    let ey, ex;
    if (L > 1e-5) ey = mul(d, 1 / L); else ey = rest ? rest.ey : [0, 0, 1];
    if (rest) ex = norm(transport(rest.ey, ey, rest.ex));
    else { const ref = Math.abs(ey[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0]; ex = norm(sub(ref, mul(ey, dot(ref, ey)))); }
    return { o: a, b, ex, ey, ez: cross(ex, ey), L, ra, rb, s: [ra, L, rb] };
  }
  // a point of the part's surface (and its normal) in the part's own axes, for u (round the axis) and v (along it), both 0..1
  function surf(kind, F, u, v) {
    const th = 2 * Math.PI * u, cs = Math.cos(th), sn = Math.sin(th);
    if (kind === 'sph' || kind === 'ell') { const ph = Math.PI * v, sp = Math.sin(ph), cp = Math.cos(ph); return { p: [F.s[0] * sp * cs, -F.s[1] * cp, F.s[2] * sp * sn], n: norm([sp * cs / F.s[0], -cp / F.s[1], sp * sn / F.s[2]]) }; }
    const ra = F.ra, rb = F.rb, L = F.L;
    if (kind === 'cone') {
      const ca = ra * Math.PI / 2, cb = rb * Math.PI / 2, s = v * (ca + L + cb);
      if (s < ca) { const q = (1 - s / ca) * Math.PI / 2; return { p: [ra * Math.cos(q) * cs, -ra * Math.sin(q), ra * Math.cos(q) * sn], n: [Math.cos(q) * cs, -Math.sin(q), Math.cos(q) * sn] }; }
      if (s <= ca + L) { const t = L > 0 ? (s - ca) / L : 0, r = ra + (rb - ra) * t; return { p: [r * cs, t * L, r * sn], n: [cs, 0, sn] }; }
      const q = cb > 0 ? (s - ca - L) / cb * Math.PI / 2 : Math.PI / 2; return { p: [rb * Math.cos(q) * cs, L + rb * Math.sin(q), rb * Math.cos(q) * sn], n: [Math.cos(q) * cs, Math.sin(q), Math.cos(q) * sn] };
    }
    // cyl
    const s = v * (ra + L + rb);
    if (s < ra) return { p: [s * cs, 0, s * sn], n: [0, -1, 0] };
    if (s <= ra + L) return { p: [ra * cs, s - ra, ra * sn], n: [cs, 0, sn] };
    const r = Math.max(0, rb - (s - ra - L)); return { p: [r * cs, L, r * sn], n: [0, 1, 0] };
  }
  const toWorld = (F, p) => add(F.o, add(add(mul(F.ex, p[0]), mul(F.ey, p[1])), mul(F.ez, p[2])));
  const dirWorld = (F, n) => add(add(mul(F.ex, n[0]), mul(F.ey, n[1])), mul(F.ez, n[2]));
  // a box's six faces (+x -x +y -y +z -z), each a square a, b in 0..1
  function surfBox(F, face, a, b) {
    const ax = face >> 1, sg = face & 1 ? -1 : 1, o = [0, 1, 2].filter(i => i !== ax), p = [0, 0, 0], n = [0, 0, 0];
    p[ax] = sg * F.s[ax]; n[ax] = sg; p[o[0]] = (2 * a - 1) * F.s[o[0]]; p[o[1]] = (2 * b - 1) * F.s[o[1]];
    return { p, n };
  }
  function matAt(q, kind, F, u, v, face) {
    if (!q.mf) return q.m;
    const S = kind === 'box' ? surfBox(F, face, u, v) : surf(kind, F, u, v), P = unB(toWorld(F, S.p)), N = Bv(dirWorld(F, S.n));
    let m = 0; try { m = q.mf(P, N); } catch (e) { m = 0; }
    return m || q.m;
  }
  const kindOf = q => q.k === 0 ? 'sph' : q.k === 1 ? 'ell' : q.k === 2 ? 'cone' : q.k === 4 ? 'cyl' : 'box';
  // the rows of rings the mesh is built from: [distance along ey, ring radius on ex, on ez, v, which end (0 = a, 1 = b)]
  let LOW = false;   // scenery: fewer faces
  function rows(kind, F, painted) {
    const out = [];
    if (kind === 'sph' || kind === 'ell') { const n = LOW ? (painted ? 8 : 5) : F.s[0] > 0.2 || painted ? 8 : 6; for (let k = 0; k <= n; k++) { const ph = Math.PI * k / n; out.push([-F.s[1] * Math.cos(ph), F.s[0] * Math.sin(ph), F.s[2] * Math.sin(ph), k / n, 0]); } return out; }
    const ra = F.ra, rb = F.rb, L = F.L;
    if (kind === 'cone') {
      const ca = ra * Math.PI / 2, cb = rb * Math.PI / 2, T = ca + L + cb, nc = LOW ? 2 : Math.max(ra, rb) > 0.14 ? 3 : 2;
      for (let k = 0; k < nc; k++) { const q = (1 - k / nc) * Math.PI / 2; out.push([-ra * Math.sin(q), ra * Math.cos(q), ra * Math.cos(q), (ca * k / nc) / T, 0]); }
      const nb = painted && L > 0.3 ? 4 : 1; for (let k = 0; k <= nb; k++) { const t = k / nb, r = ra + (rb - ra) * t; out.push([t * L, r, r, (ca + L * t) / T, t < 0.5 ? 0 : 1]); }
      for (let k = 1; k <= nc; k++) { const q = k / nc * Math.PI / 2; out.push([L + rb * Math.sin(q), rb * Math.cos(q), rb * Math.cos(q), (ca + L + cb * k / nc) / T, 1]); }
      return out;
    }
    const T = ra + L + rb;
    return [[0, 0, 0, 0, 0], [0, ra, ra, ra / T, 0], [0, ra, ra, ra / T, 0], [L, rb, rb, (ra + L) / T, 1], [L, rb, rb, (ra + L) / T, 1], [L, 0, 0, 1, 1]];
  }
  // longest common subsequence of two signature lists -> pairs [i, j]
  function lcs(a, b) {
    const n = a.length, m = b.length, D = new Uint16Array((n + 1) * (m + 1)), W = m + 1;
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) D[i * W + j] = a[i] === b[j] ? D[(i + 1) * W + j + 1] + 1 : Math.max(D[(i + 1) * W + j], D[i * W + j + 1]);
    const out = []; let i = 0, j = 0;
    while (i < n && j < m) { if (a[i] === b[j]) { out.push([i, j]); i++; j++; } else if (D[(i + 1) * W + j] >= D[i * W + j + 1]) i++; else j++; }
    return out;
  }

  // poses = [{ clip, t, rig }] (the first is the rest pose). Returns the model as plain data.
  function build(name, poses, opt = {}) {
    LOW = !!opt.low;
    // 1. one master list of parts across every pose. A part is known by what it is (kind, material, painted or not), its own
    // size, and its turn among the parts exactly like it (the rig builds those in the same order every frame). A part whose
    // size changes (a squashing slime, a limb drawn as a ball when it folds) is matched by kind and material alone.
    const sz = q => { const r = x => Math.round(x * 4); return q.k === 0 ? 'r' + r(q.r) : q.k === 2 ? 'r' + r(Math.max(q.ra, q.rb)) + ',' + r(Math.min(q.ra, q.rb)) : q.k === 4 ? r(q.r) : q.k === 1 ? q.rad.map(r).join(',') : q.half.map(r).join(','); };
    const fineM = new Map(), coarseM = new Map(), at = poses.map(() => []); let N = 0;
    poses.forEach((ps, pi) => {
      const seen = new Map(), used = new Set(), left = [];
      for (const q of ps.rig.p) { const f = sig(q) + '|' + sz(q), n = seen.get(f) || 0, g = fineM.get(f); if (g && g.length > n) { at[pi][g[n]] = q; used.add(g[n]); seen.set(f, n + 1); } else left.push(q); }
      for (const q of left) {
        const c = sig(q), f = c + '|' + sz(q), cand = (coarseM.get(c) || []).find(k => !used.has(k)); let k = cand;
        if (k === undefined) { k = N++; (fineM.get(f) || fineM.set(f, []).get(f)).push(k); (coarseM.get(c) || coarseM.set(c, []).get(c)).push(k); }
        at[pi][k] = q; used.add(k);
      }
    });
    for (const m of at) for (let k = 0; k < N; k++) if (!m[k]) m[k] = null;
    // 2. each part: its kind, its rest shape (the first pose that shows it in that kind), its paint
    const parts = [], mats = {};
    const useMat = m => { if (!mats[m]) { const d = MATS[m] || MATS[1], idx = d.ramp[Math.min(d.ramp.length - 1, d.mid + (d.ramp.length > 2 ? 1 : 0))]; const h = parseInt(PAL_HEX[idx], 16);
      mats[m] = { name: d.name, rgb: [(h >> 16) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255], cls: d.emis ? 'glow' : d.shiny ? 'metal' : 'matte' }; } return m; };
    for (let k = 0; k < N; k++) {
      const seen = at.map(m => m[k]).filter(Boolean), isCone = seen.some(q => q.k === 2), kind = isCone ? 'cone' : kindOf(seen[0]);
      const q0 = seen.find(q => kindOf(q) === kind) || seen[0], F0 = frame(q0, kind, null), painted = !!q0.mf;
      const part = { kind, m: useMat(q0.m), o: F0.o.map(r4), q: quat(F0.ex, F0.ey, F0.ez).map(r4), F0, q0, two: kind === 'cone' || kind === 'cyl' };
      part.rsig = restSig(at[0][k] || q0); part.inRest = !!at[0][k];
      if (kind === 'box') part.half = F0.s.map(r4);
      else { part.rows = rows(kind, F0, painted).map(r => r.map(r4)); part.seg = LOW ? (Math.max(F0.s[0], F0.s[2]) > 0.35 ? 12 : Math.max(F0.s[0], F0.s[2]) > 0.1 ? 8 : 6) : Math.max(F0.s[0], F0.s[2]) > 0.3 ? 16 : Math.max(F0.s[0], F0.s[2]) > 0.12 ? 12 : 8; part.hard = kind === 'cyl'; if (part.two) part.L = r4(F0.L); }
      if (painted && kind === 'box') {
        const n = Math.max(...F0.s) > 0.25 ? 24 : 12, ids = []; let varied = false;
        for (let j = 0; j < n; j++) for (let f = 0; f < 6; f++) for (let i = 0; i < n; i++) { const m = useMat(matAt(q0, kind, F0, (i + 0.5) / n, (j + 0.5) / n, f)); ids.push(m); if (m !== ids[0]) varied = true; }
        if (varied) part.tex = { w: 6 * n, h: n, ids, box: n }; else part.m = ids[0];
      }
      if (painted && kind !== 'box') {
        const big = Math.max(F0.s[0], F0.s[2], kind === 'cone' || kind === 'cyl' ? F0.L / 2 : F0.s[1]), w = big > 0.3 ? 64 : big > 0.15 ? 48 : 32, h = w / 2, ids = [];
        let varied = false;
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const m = useMat(matAt(q0, kind, F0, (i + 0.5) / w, (j + 0.5) / h)); ids.push(m); if (m !== ids[0]) varied = true; }
        if (varied) { part.tex = { w, h, ids }; part.fit = []; for (let j = 0; j < 8; j++) for (let i = 0; i < 12; i++) part.fit.push([(i + 0.5) / 12, (j + 0.5) / 8, matAt(q0, kind, F0, (i + 0.5) / 12, (j + 0.5) / 8)]); }
        else part.m = ids[0];
      }
      parts.push(part);
    }
    // 3. every pose: where each part is. A cone or cylinder has two bones (its ends), so it can change length and keep round caps.
    const HID = null, clips = {};
    const lastQ = new Array(N).fill(null);
    poses.forEach((ps, pi) => {
      const fr = [];
      for (let k = 0; k < N; k++) {
        const q = at[pi][k], P = parts[k]; if (!q) { fr.push(HID); continue; }
        let F = frame(q, P.kind, P.F0);
        if (P.fit && (P.kind === 'sph' || P.kind === 'cone' || P.kind === 'cyl')) F = fitPaint(q, P, F, lastQ[k]);
        lastQ[k] = F;
        const qt = quat(F.ex, F.ey, F.ez).map(r4), F0 = P.F0, sc = (a, b) => b > 1e-5 ? r4(a / b) : 1;
        const rec = P.two ? [...F.o.map(r4), ...qt, sc(F.ra, F0.ra), ...F.b.map(r4), sc(F.rb, F0.rb)] : [...F.o.map(r4), ...qt, sc(F.s[0], F0.s[0]), sc(F.s[1], F0.s[1]), sc(F.s[2], F0.s[2])];
        fr.push(rec.every(Number.isFinite) ? rec : HID);   // (a part the rig placed nowhere this frame is hidden)
      }
      (clips[ps.clip] = clips[ps.clip] || { t: [], f: [] }).t.push(ps.t); clips[ps.clip].f.push(fr);
    });
    let top = 0; for (const P of parts) top = Math.max(top, P.F0.o[2] + Math.max(...P.F0.s));
    for (const P of parts) { delete P.F0; delete P.q0; delete P.fit; }
    const out = { name, mats, parts, clips, height: r4(top), loops: opt.loops || {} };
    if (poses.length === 1) { out.static = true; delete out.clips; }
    return opt.raw ? out : finish(out);
  }
  // what a part looks like standing still: two looks share a part exactly when this matches
  function restSig(q) {
    const r = x => Math.round(x * 20), nums = [];
    for (const key of ['c', 'a', 'b', 'rad', 'half']) if (q[key]) nums.push(...q[key].map(r));
    for (const key of ['r', 'ra', 'rb']) if (q[key] !== undefined) nums.push(r(q[key]));
    if (q.ax) q.ax.forEach(a => nums.push(...a.map(x => Math.round(x * 8))));
    let paint = '';
    if (q.mf) { const kind = kindOf(q), F = frame(q, kind, null); if (kind === 'box') { for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) paint += matAt(q, kind, F, (i % 2 + 0.5) / 2, ((i >> 1) + 0.5) / 2, f) + ','; } else for (let j = 0; j < 3; j++) for (let i = 0; i < 6; i++) paint += matAt(q, kind, F, (i + 0.5) / 6, (j + 0.5) / 3) + ','; }
    return q.k + ':' + q.m + ':' + nums.join(',') + ':' + paint;
  }
  // the parts of a model that pass the test, as a model of their own (a helmet, a weapon ... out of a whole hero)
  function subset(model, pred, name) {
    const keep = model.parts.map(P => !!pred(P)), parts = model.parts.filter((P, k) => keep[k]), used = new Set();
    for (const P of parts) { used.add(P.m); if (P.tex) for (const m of P.tex.ids) used.add(m); }
    const mats = {}; for (const m in model.mats) if (used.has(+m)) mats[m] = model.mats[m];
    const out = { name: name || model.name, mats, parts, height: model.height, loops: model.loops };
    if (model.clips) { out.clips = {}; for (const c in model.clips) out.clips[c] = { t: model.clips[c].t, f: model.clips[c].f.map(fr => fr.filter((x, k) => keep[k])) }; } else out.static = true;
    return out;
  }
  // ---- rigid groups. Parts that never move against each other (a helmet and its plume, a forearm and its bracer, a whole
  // weapon) get ONE bone between them: far fewer tracks, and a group turns as one solid thing.
  function qrot(q, v) { const [w, x, y, z] = q, tx = 2 * (y * v[2] - z * v[1]), ty = 2 * (z * v[0] - x * v[2]), tz = 2 * (x * v[1] - y * v[0]); return [v[0] + w * tx + y * tz - z * ty, v[1] + w * ty + z * tx - x * tz, v[2] + w * tz + x * ty - y * tx]; }
  function fitRigid(P, Q, q0) {   // the turn + shift that carries points P onto Q (Horn's method); returns { q, cp, cq, err }
    const n = P.length, cp = [0, 0, 0], cq = [0, 0, 0]; for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) { cp[k] += P[i][k] / n; cq[k] += Q[i][k] / n; }
    const S = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; for (let i = 0; i < n; i++) for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) S[a][b] += (P[i][a] - cp[a]) * (Q[i][b] - cq[b]);
    const N = [[S[0][0] + S[1][1] + S[2][2], S[1][2] - S[2][1], S[2][0] - S[0][2], S[0][1] - S[1][0]], [S[1][2] - S[2][1], S[0][0] - S[1][1] - S[2][2], S[0][1] + S[1][0], S[2][0] + S[0][2]],
      [S[2][0] - S[0][2], S[0][1] + S[1][0], -S[0][0] + S[1][1] - S[2][2], S[1][2] + S[2][1]], [S[0][1] - S[1][0], S[2][0] + S[0][2], S[1][2] + S[2][1], -S[0][0] - S[1][1] + S[2][2]]];
    let sh = 0; for (const r of N) { let t = 0; for (const x of r) t += Math.abs(x); if (t > sh) sh = t; } let q = (q0 || [1, 0, 0, 0]).slice();
    for (let it = 0; it < 240; it++) { const r = [0, 0, 0, 0]; for (let a = 0; a < 4; a++) { r[a] = sh * q[a]; for (let b = 0; b < 4; b++) r[a] += N[a][b] * q[b]; } const l = Math.hypot(...r) || 1; q = r.map(x => x / l); }
    let err = 0; for (let i = 0; i < n; i++) { const v = qrot(q, sub(P[i], cp)); err = Math.max(err, len(sub(add(v, cq), Q[i]))); }
    return { q, cp, cq, err };
  }
  function clusterize(model) {
    const parts = model.parts, N = parts.length, frames = []; for (const c in model.clips) for (const fr of model.clips[c].f) frames.push(fr);
    if (frames.length < 2) return;
    // the points that pin each part down in a frame (two for a cone, three for an ellipsoid or box, one for a ball)
    const pts = (P, rec) => { if (P.L !== undefined) return P.L > 0.03 ? [rec.slice(0, 3), rec.slice(8, 11)] : [rec.slice(0, 3)]; const o = rec.slice(0, 3); if (P.kind === 'sph') return [o]; const q = rec.slice(3, 7); return [o, add(o, qrot(q, [0.25, 0, 0])), add(o, qrot(q, [0, 0.25, 0]))]; };
    const ok = [], PT = [];
    for (let k = 0; k < N; k++) { const P = parts[k]; let good = true; const list = [];
      for (const fr of frames) { const rec = fr[k]; if (!rec) { good = false; break; } const sc = P.L !== undefined ? [rec[7], rec[11]] : rec.slice(7, 10); if (sc.some(x => Math.abs(x - 1) > 0.03)) { good = false; break; } list.push(pts(P, rec)); }
      ok.push(good); PT.push(good ? list : null); }
    const TOL = 0.014, rigid = (i, j) => { const A = PT[i], Bq = PT[j]; for (let a = 0; a < A[0].length; a++) for (let b = 0; b < Bq[0].length; b++) { let lo = 1e9, hi = -1e9; for (let f = 0; f < frames.length; f++) { const d = len(sub(A[f][a], Bq[f][b])); if (d < lo) lo = d; if (d > hi) hi = d; if (hi - lo > TOL) return false; } } return true; };
    // grow each group from a part with a direction of its own (a cone, box or ellipsoid), taking only parts that hold still
    // against EVERY member (a ball at a joint holds still against both limbs it joins: it must not weld them together)
    const groups = new Map(), taken = new Set(), cache = new Map(), rg = (i, j) => { const key = i < j ? i * 4096 + j : j * 4096 + i; let v = cache.get(key); if (v === undefined) { v = rigid(i, j); cache.set(key, v); } return v; };
    const order = [...Array(N).keys()].filter(k => ok[k]).sort((a, b) => PT[b][0].length - PT[a][0].length || a - b);
    for (const i of order) { if (taken.has(i) || PT[i][0].length < 2) continue; const g = [i];
      for (const j of order) if (j !== i && !taken.has(j) && g.every(m => rg(m, j))) g.push(j);
      if (g.length < 2 && PT[i][0].length < 3) continue;
      for (const k of g) taken.add(k); groups.set(i, g); }
    const cb = [], tracks = [];
    for (const g of groups.values()) {
      const rest = []; for (const k of g) rest.push(...PT[k][0]);
      if (rest.length < 3) { if (typeof RD_DEBUG !== 'undefined') RD_DEBUG.push('few ' + g.join(',')); continue; }
      // three of its points must make a real triangle, or the group could spin unseen about a line
      let area = 0; for (let i = 0; i < rest.length && area < 0.004; i++) for (let j = i + 1; j < rest.length && area < 0.004; j++) for (let l = j + 1; l < rest.length; l++) { const a = len(cross(sub(rest[j], rest[i]), sub(rest[l], rest[i]))); if (a > area) area = a; if (area >= 0.004) break; }
      if (area < 0.004) { if (typeof RD_DEBUG !== 'undefined') RD_DEBUG.push('line ' + g.join(',') + ' area ' + area.toFixed(4)); continue; }
      const tr = []; let q = [1, 0, 0, 0], bad = false;
      for (let f = 0; f < frames.length; f++) { const cur = []; for (const k of g) cur.push(...PT[k][f]); const R = fitRigid(rest, cur, q); if (R.err > 0.03) { bad = true; if (typeof RD_DEBUG !== 'undefined') RD_DEBUG.push('fit ' + g.join(',') + ' err ' + R.err.toFixed(3) + ' frame ' + f); break; } q = R.q; tr.push([...R.cq.map(r4), ...R.q.map(r4)]); if (f === 0) g.cp = R.cp; }
      if (bad) { continue; }
      const ci = cb.length; cb.push({ o: g.cp.map(r4) }); tracks.push(tr); for (const k of g) parts[k].cb = ci;
    }
    // a cone or cylinder that never changes length (and belongs to no group) needs one bone, not one at each end
    for (let k = 0; k < N; k++) { const P = parts[k]; if (!ok[k] || P.cb !== undefined || P.L === undefined) continue; P.one = true;
      for (const fr of frames) { const rec = fr[k]; fr[k] = [rec[0], rec[1], rec[2], rec[3], rec[4], rec[5], rec[6], 1, 1, 1]; } }
    if (!cb.length) return;
    model.cb = cb; let fi = 0;
    for (const c in model.clips) { const cl = model.clips[c]; cl.cf = cl.f.map(() => { const row = tracks.map(t => t[fi]); fi++; return row; }); cl.f = cl.f.map(fr => fr.map((rec, k) => parts[k].cb !== undefined ? 0 : rec)); }
  }
  // last step before a model is written: drop the working fields, lay the clips end to end on one timeline
  function finish(model) {
    const out = Object.assign({}, model, { parts: model.parts.map(P => { const { rsig, inRest, ...rest } = P; return rest; }) });
    if (out.clips) { out.clips = JSON.parse(JSON.stringify(out.clips)); clusterize(out); }
    if (out.clips) { out.tl = {}; let cur = 0; for (const c in out.clips) { const ts = out.clips[c].t, len = out.loops[c] || ts[ts.length - 1] || 0; out.tl[c] = [cur, len, out.loops[c] ? 1 : 0]; cur += len + 2; } }
    return out;
  }
  // A painted sphere or cone has no orientation of its own: turn it until its paint lands where it was at rest.
  function fitPaint(q, P, F, last) {
    const kind = P.kind, score = G => { let s = 0; for (const [u, v, m] of P.fit) if (matAt(q, kind, G, u, v) === m) s++; return s; };
    const turned = (G, ax, a) => { const ex = norm(rotAxis(ax, a, G.ex)), ey = norm(rotAxis(ax, a, G.ey)); return Object.assign({}, G, { ex, ey, ez: cross(ex, ey) }); };
    let best = F, bs = score(F);
    if (last) { const G = Object.assign({}, F, kind === 'sph' ? { ex: last.ex, ey: last.ey, ez: last.ez } : { ex: norm(transport(last.ey, F.ey, last.ex)) }); if (kind !== 'sph') G.ez = cross(G.ex, G.ey); const s = score(G); if (s >= bs) { best = G; bs = s; } }
    if (bs === P.fit.length) return best;
    if (kind === 'sph') {
      for (let y = 0; y < 24; y++) for (const p of [0, -0.35, 0.35, -0.7, 0.7]) { let G = turned(F, [0, 0, 1], y * Math.PI / 12); if (p) G = turned(G, norm(cross([0, 0, 1], G.ex.map((x, i) => i === 2 ? 0 : x))), p); const s = score(G); if (s > bs) { best = G; bs = s; } }
      for (let it = 0, st = 0.13; it < 3; it++, st /= 2) for (const ax of [[0, 0, 1], best.ex, best.ez]) for (const sg of [-1, 1]) { const G = turned(best, ax, sg * st), s = score(G); if (s > bs) { best = G; bs = s; } }
    } else {
      for (let k = 1; k < 32; k++) { const G = turned(F, F.ey, k * Math.PI / 16), s = score(G); if (s > bs) { best = G; bs = s; } }
      for (let it = 0, st = 0.1; it < 2; it++, st /= 2) for (const sg of [-1, 1]) { const G = turned(best, best.ey, sg * st), s = score(G); if (s > bs) { best = G; bs = s; } }
    }
    return best;
  }
  // a short stable name for a rig's shape (the same prop built twice gets the same name)
  function hash(rig) {
    let h = 2166136261 >>> 0; const mix = x => { h ^= x; h = Math.imul(h, 16777619) >>> 0; };
    const num = x => mix(Math.round(x * 16) | 0);
    for (const q of rig.p) { mix(q.k * 131 + q.m); for (const key of ['c', 'a', 'b', 'rad', 'half']) if (q[key]) q[key].forEach(num); for (const key of ['r', 'ra', 'rb']) if (q[key] !== undefined) num(q[key]);
      if (q.ax) q.ax.forEach(a => a.forEach(x => num(x * 4)));
      if (q.mf) { const kind = kindOf(q), F = frame(q, kind, null); if (kind !== 'box') for (let j = 0; j < 4; j++) for (let i = 0; i < 6; i++) mix(matAt(q, kind, F, (i + 0.5) / 6, (j + 0.5) / 4)); } }
    return ('0000000' + h.toString(16)).slice(-8);
  }
  const propFile = name => { let h = 2166136261 >>> 0; for (let i = 0; i < name.length; i++) { h ^= name.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return 'prop_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 28) + '_' + ('000' + (h % 65536).toString(16)).slice(-4); };
  // a prop's model data from the function that builds its rig
  function prop(name, buildFn) { const r = new Rig(); buildFn(r); if (!r.p.length) return null; const m = build(propFile(name), [{ clip: 'idle', t: 0, rig: r }], { low: true }); m.key = 'prop|' + name; return m; }
  return { build, hash, sig, frame, kindOf, propFile, prop, restSig, subset, finish };
})();
