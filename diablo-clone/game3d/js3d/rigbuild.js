// rigbuild.js: builds a character model in the browser from the same data the Blender converter uses (RD.build).
// The Blender-built files are used when they exist; this covers every other look (any mix of the hero's gear)
// the moment it is needed. Same structure as the files: one skinned mesh, a bone per part, the game's clips.
import * as THREE from 'three';

const P3 = p => [p[0], p[2], -p[1]];                       // Blender (z up) -> three (y up)
const Q3 = q => [q[1], q[3], -q[2], q[0]];                 // [w, x, y, z] -> three's (x, y, z, w)

export function buildModel(data) {
  const parts = data.parts, mats = data.mats;
  // ---- the paint atlas (a swatch per material, a block per painted part)
  const mids = Object.keys(mats).map(Number), blocks = mids.map(() => [4, 4]).concat(parts.filter(p => p.tex).map(p => [p.tex.w + 2, p.tex.h + 2]));
  const W = 256, order = blocks.map((b, i) => i).sort((a, b) => blocks[b][1] - blocks[a][1]), pos = []; let x = 0, y = 0, rowh = 0;
  for (const i of order) { const [w, h] = blocks[i]; if (x + w > W) { x = 0; y += rowh; rowh = 0; } pos[i] = [x, y]; x += w; rowh = Math.max(rowh, h); }
  let H = 16; while (H < y + rowh) H *= 2;
  const px = new Uint8Array(W * H * 4), put = (X, Y, m) => { const c = mats[m].rgb, o = (Y * W + X) * 4; px[o] = c[0] * 255; px[o + 1] = c[1] * 255; px[o + 2] = c[2] * 255; px[o + 3] = 255; };
  const swatch = {}; mids.forEach((m, i) => { const [bx, by] = pos[i]; for (let b = 0; b < 4; b++) for (let a = 0; a < 4; a++) put(bx + a, by + b, m); swatch[m] = [(bx + 2) / W, (by + 2) / H]; });
  const rect = []; let bi = mids.length;
  parts.forEach((p, k) => {
    if (!p.tex) return; const { w, h, ids } = p.tex, [bx, by] = pos[bi++];
    for (let j = -1; j <= h; j++) for (let i = -1; i <= w; i++) put(bx + 1 + i, by + 1 + j, ids[Math.max(0, Math.min(h - 1, j)) * w + ((i + w) % w)]);
    rect[k] = [(bx + 1) / W, (by + 1) / H, w / W, h / H];
  });
  const tex = new THREE.DataTexture(px, W, H, THREE.RGBAFormat); tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearFilter; tex.needsUpdate = true;
  // ---- bones
  const bones = [], root = new THREE.Bone(); root.name = 'root'; const boneOf = [];
  parts.forEach((p, k) => {
    const mk = (name, o) => { const b = new THREE.Bone(); b.name = name; b.position.set(...P3(o)); b.quaternion.set(...Q3(p.q)); root.add(b); bones.push(b); return bones.length - 1; };
    const q = new THREE.Quaternion(...Q3(p.q)), ey = new THREE.Vector3(0, 0, -1).applyQuaternion(q);   // the part's long axis (its local y in Blender's axes) in three space
    const a = mk('p' + k, p.o); let b = a;
    if (p.L !== undefined) { const o3 = P3(p.o); const bb = new THREE.Bone(); bb.name = 'p' + k + 'b'; bb.position.set(o3[0] + ey.x * p.L, o3[1] + ey.y * p.L, o3[2] + ey.z * p.L); bb.quaternion.copy(q); root.add(bb); bones.push(bb); b = bones.length - 1; }
    boneOf.push([a, b]);
  });
  // ---- geometry, grouped by material class
  const G = { matte: [], metal: [], glow: [] };   // per class: lists of triangles' vertex records
  const v3 = new THREE.Vector3(), m4 = new THREE.Matrix4(), qq = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
  const posA = [], norA = [], uvA = [], siA = [], swA = [], idx = { matte: [], metal: [], glow: [] };
  // each triangle of a part must face the way its corners' normals point
  const fixWinding = (list, from) => {
    for (let t = from; t < list.length; t += 3) {
      const a = list[t] * 3, b = list[t + 1] * 3, c = list[t + 2] * 3;
      const ux = posA[b] - posA[a], uy = posA[b + 1] - posA[a + 1], uz = posA[b + 2] - posA[a + 2], vx = posA[c] - posA[a], vy = posA[c + 1] - posA[a + 1], vz = posA[c + 2] - posA[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const d = nx * (norA[a] + norA[b] + norA[c]) + ny * (norA[a + 1] + norA[b + 1] + norA[c + 1]) + nz * (norA[a + 2] + norA[b + 2] + norA[c + 2]);
      if (d < 0) { const x = list[t + 1]; list[t + 1] = list[t + 2]; list[t + 2] = x; }
    }
  };
  parts.forEach((p, k) => {
    const cls = mats[p.m].cls, rc = rect[k], uv0 = swatch[p.m], base = posA.length / 3, i0 = idx[cls].length;
    // local axes: the part's x, y (long axis), z in Blender space; three space = P3 of that
    qq.set(...Q3(p.q)); m4.compose(v3.set(...P3(p.o)), qq, one);
    const nm = new THREE.Matrix3().setFromMatrix4(m4);
    const push = (lx, ly, lz, nx, ny, nz, u, v, end) => {
      // local coordinates are in the bone's own axes; in three space the bone's axes are the columns of m4
      v3.set(lx, lz, -ly).applyMatrix4(m4); posA.push(v3.x, v3.y, v3.z);
      v3.set(nx, nz, -ny).applyMatrix3(nm).normalize(); norA.push(v3.x, v3.y, v3.z);
      uvA.push(u, v); siA.push(boneOf[k][end], 0, 0, 0); swA.push(1, 0, 0, 0);
    };
    if (p.kind === 'box') {
      const [hx, hy, hz] = p.half, hs = [hx, hy, hz], N = p.tex ? p.tex.box : 0;
      for (let face = 0; face < 6; face++) {
        const ax = face >> 1, sg = face & 1 ? -1 : 1, o = [0, 1, 2].filter(i => i !== ax), n = [0, 0, 0]; n[ax] = sg; const b0 = posA.length / 3;
        for (const [a, b] of [[0, 0], [1, 0], [1, 1], [0, 1]]) {
          const c = [0, 0, 0]; c[ax] = sg * hs[ax]; c[o[0]] = (2 * a - 1) * hs[o[0]]; c[o[1]] = (2 * b - 1) * hs[o[1]];
          const uv = rc ? [rc[0] + (face + (0.5 + a * (N - 1)) / N) / 6 * rc[2], rc[1] + (0.5 + b * (N - 1)) / N * rc[3]] : uv0;
          push(c[0], c[1], c[2], n[0], n[1], n[2], uv[0], uv[1], 0);
        }
        // winding: outward for a right-handed local frame
        const flip = (ax === 1) !== (sg < 0);
        idx[cls].push(b0, b0 + 1, b0 + 2, b0, b0 + 2, b0 + 3);
      }
      fixWinding(idx[cls], i0); return;
    }
    const seg = p.seg, rows = p.rows, start = [];
    rows.forEach((r, a) => {
      const [d, rx, rz, v, end] = r; start.push(posA.length / 3);
      // normal from the neighbouring rows' slope
      const pr = rows[Math.max(0, a - 1)], nx_ = rows[Math.min(rows.length - 1, a + 1)], dd = nx_[0] - pr[0], dr = Math.max(nx_[1], nx_[2]) - Math.max(pr[1], pr[2]);
      for (let i = 0; i <= seg; i++) {
        const th = 2 * Math.PI * i / seg, cs = Math.cos(th), sn = Math.sin(th);
        let nx = cs * dd, ny = -dr, nz = sn * dd; if (Math.abs(dd) < 1e-6 && Math.abs(dr) < 1e-6) { nx = 0; ny = a === 0 ? -1 : 1; nz = 0; }
        if (rx < 1e-6 && rz < 1e-6) { nx = 0; nz = 0; ny = a < rows.length / 2 ? -1 : 1; }
        const u = i / seg; push(rx * cs, d, rz * sn, nx, ny, nz, rc ? rc[0] + u * rc[2] : uv0[0], rc ? rc[1] + v * rc[3] : uv0[1], end);
      }
    });
    for (let a = 0; a < rows.length - 1; a++) for (let i = 0; i < seg; i++) {
      const A = start[a] + i, Bq = start[a + 1] + i;
      // local frame is right-handed (x cross y = z); rings run from +x toward +z, rows up +y: outward faces wind A, B, B+1
      idx[cls].push(A, Bq, Bq + 1, A, Bq + 1, A + 1);
    }
    fixWinding(idx[cls], i0);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(posA, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(norA, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvA, 2));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(siA, 4)); geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(swA, 4));
  const all = [], materials = []; let off = 0;
  for (const cls of ['matte', 'metal', 'glow']) {
    if (!idx[cls].length) continue;
    geo.addGroup(off, idx[cls].length, materials.length); off += idx[cls].length; for (const i of idx[cls]) all.push(i);
    const m = new THREE.MeshStandardMaterial({ map: tex, roughness: cls === 'metal' ? 0.4 : 0.85, metalness: cls === 'metal' ? 0.75 : 0 });
    if (cls === 'glow') { m.emissive.setHex(0xffffff); m.emissiveMap = tex; m.emissiveIntensity = 2.5; }
    m.name = cls; materials.push(m);
  }
  geo.setIndex(all);
  const mesh = new THREE.SkinnedMesh(geo, materials); mesh.name = data.name;
  const scene = new THREE.Group(); scene.add(root); scene.add(mesh); scene.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(bones));
  // ---- clips: absolute bone positions per game frame (seconds = the game's frame number)
  const animations = [];
  for (const cname in data.clips || {}) {
    const clip = data.clips[cname], ts = clip.t.slice(), frames = clip.f.slice(), loop = (data.loops || {})[cname];
    if (loop && ts.length > 1) { ts.push(loop); frames.push(frames[0]); }
    const tracks = [];
    parts.forEach((p, k) => {
      const two = p.L !== undefined, names = two ? ['p' + k, 'p' + k + 'b'] : ['p' + k];
      const P = names.map(() => []), Q = names.map(() => []), S = names.map(() => []); let last = null, lastB = null, lq = null;
      for (const fr of frames) {
        const rec = fr[k];
        if (!rec) { names.forEach((n, e) => { const lp = (e ? lastB : last) || P3(p.o); P[e].push(...lp); Q[e].push(...(lq || Q3(p.q))); S[e].push(1e-4, 1e-4, 1e-4); }); continue; }
        let q = Q3(rec.slice(3, 7)); if (lq && lq[0] * q[0] + lq[1] * q[1] + lq[2] * q[2] + lq[3] * q[3] < 0) q = q.map(x => -x); lq = q;
        last = P3(rec); P[0].push(...last); Q[0].push(...q);
        if (two) { S[0].push(rec[7], rec[7], rec[7]); lastB = P3(rec.slice(8, 11)); P[1].push(...lastB); Q[1].push(...q); S[1].push(rec[11], rec[11], rec[11]); }
        else S[0].push(Math.max(1e-4, rec[7]), Math.max(1e-4, rec[9]), Math.max(1e-4, rec[8]));
      }
      names.forEach((n, e) => { tracks.push(new THREE.VectorKeyframeTrack(n + '.position', ts, P[e]), new THREE.QuaternionKeyframeTrack(n + '.quaternion', ts, Q[e]), new THREE.VectorKeyframeTrack(n + '.scale', ts, S[e])); });
    });
    animations.push(new THREE.AnimationClip(cname, -1, tracks));
  }
  return { scene, animations, built: true };
}
