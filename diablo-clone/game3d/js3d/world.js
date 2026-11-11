// "The World": what only the third-person game draws. The overhead game never loads any of this.
// The forest (big trees, bushes, ferns, boulders, grass and flowers: blender/scripts/flora.py -> models/world/f_*.glb),
// laid out from the 2D game's own level: every tree the level lists is still there and still solid, but most of them are
// drawn as undergrowth so the big ones have room to be big.
import * as THREE from 'three';

export function makeWorld({ whenModel, hash2, WIND }) {
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), p = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
  // Leaves sway in the wind (more the higher up), and anything that comes close to the camera thins out to a screen of dots
  // so a branch between the camera and the hero never hides him.
  function floraMat(src, from, amount, fade = true, shrink = false) {   // (shrink = grass: it also takes the ground's light, and draws in from nothing at a distance)
    const m = src.clone(); m.side = THREE.DoubleSide; m.roughness = 0.95; m.metalness = 0; m.envMapIntensity = 0.3;
    m.onBeforeCompile = sh => { sh.uniforms.uWind = WIND;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uWind;').replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>' + (shrink ? '\nobjectNormal = vec3(0.0, 1.0, 0.0);' : ''))
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n{ float sw = max(0.0, position.y - ' + from.toFixed(2) + ') * ' + amount.toFixed(4) + ';\n#ifdef USE_INSTANCING\nvec4 wp = instanceMatrix * vec4(position, 1.0);\n#else\nvec4 wp = vec4(position, 1.0);\n#endif\ntransformed.x += sin(uWind * 1.7 + wp.x * 0.9 + wp.z * 0.7) * sw; transformed.z += cos(uWind * 1.3 + wp.x * 0.5 - wp.z * 0.8) * sw * 0.7;' + (shrink ? '\n#ifdef USE_INSTANCING\ntransformed *= 1.0 - smoothstep(19.0, 31.0, distance((modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz, cameraPosition));\n#endif\n' : '') + ' }');
      if (fade) sh.fragmentShader = sh.fragmentShader.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n{ float fd = length(vViewPosition); if (fd < 6.5) { float keep = smoothstep(1.8, 6.5, fd); if (keep < fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))))) discard; } }'); };
    m.customProgramCacheKey = () => 'flora' + from + ':' + amount + ':' + fade + shrink; return m;
  }
  // one InstancedMesh per model per block of tiles; list = [fi, fj, yaw, scale, tint 0..1]
  function place(file, list, group, alive, { from = 0.5, sway = 0.02, chunk = 12, shadow = true, tinted = null, fade = true, shrink = false } = {}) {
    if (!list.length) return;
    whenModel('world/' + file).then(g => {
      if (!g || !alive()) return; let src = null; g.scene.traverse(o => { if (o.isMesh && !src) src = o; }); if (!src) return;
      const mat = src.userData.wm || (src.userData.wm = floraMat(src.material, from, sway, fade, shrink)), chunks = new Map();
      for (const it of list) { const k = Math.floor(it[0] / chunk) + ',' + Math.floor(it[1] / chunk); (chunks.get(k) || chunks.set(k, []).get(k)).push(it); }
      for (const items of chunks.values()) {
        const im = new THREE.InstancedMesh(src.geometry, mat, items.length); im.castShadow = shadow; im.receiveShadow = true;
        items.forEach((it, n) => { const s = it[3] || 1; m4.compose(p.set(it[0], 0, it[1]), q.setFromAxisAngle(up, it[2]), sc.set(s, s * (it[5] || 1), s)); im.setMatrixAt(n, m4);
          if (tinted) im.setColorAt(n, tinted(it)); else { const t = it[4] === undefined ? 0.5 : it[4]; im.setColorAt(n, col.setRGB(0.86 + 0.2 * t, 0.9 + 0.12 * hash2(it[0] * 31 | 0, it[1] * 17 | 0), 0.84 + 0.22 * (1 - t))); } });
        im.computeBoundingSphere(); group.add(im);
        if (!shadow) grassChunks.push({ im, x: im.boundingSphere.center.x, z: im.boundingSphere.center.z });
      }
    });
  }
  let grassChunks = [];

  // ---- the forest. by: prop name -> [[fi, fj, yaw], ...] from the level. Names this handles are taken out of the map.
  function flora(by, group, alive) {
    grassChunks = []; structures(by, group, alive);
    const extra = window.R3D_EXTRA || [], inside = (fi, fj) => extra.some(e => fi > e.rect[0] - 0.6 && fi < e.rect[1] + 0.6 && fj > e.rect[2] - 0.6 && fj < e.rect[3] + 0.6);
    for (const e of extra) build('b_' + e.name, [[e.fi, e.fj, e.yaw, 1]], group, alive);   // (the buildings this version adds: bridge.js)
    const trees = [], out = {}; const add = (file, it) => (out[file] || (out[file] = [])).push(it);
    for (const [name, list] of [...by]) {
      const m = /^(pine|oak|autumn|bush|fern|rock)(\d)$/.exec(name); if (!m) continue; by.delete(name);
      const fam = m[1], n = +m[2];
      for (const [fi, fj] of list) {
        if (inside(fi, fj)) continue;
        const h = hash2(Math.round(fi * 7) + 13, Math.round(fj * 7) + n), h2 = hash2(Math.round(fj * 5) + 3, Math.round(fi * 9));
        if (fam === 'pine' || fam === 'oak' || fam === 'autumn') trees.push({ fi, fj, fam, n, h, h2 });
        else if (fam === 'bush') add('f_bush' + n, [fi, fj, h * 6.28, 0.85 + h2 * 0.5, h]);
        else if (fam === 'fern') add('f_fern' + n, [fi, fj, h * 6.28, 0.9 + h2 * 0.5, h]);
        else add('f_rock' + n, [fi, fj, h * 6.28, 0.9 + h2 * 0.9, h, 0.85 + h * 0.5]);
      }
    }
    // Which trees are the big ones: taken in a shuffled order, a tree is big if no big tree stands within 2.7 tiles of it,
    // a young tree if it has a little room, and otherwise undergrowth (a bush, a fern or a sapling). All stay solid.
    trees.sort((a, b) => a.h - b.h); const grid = new Map(), key = (x, z) => Math.floor(x / 3) + ',' + Math.floor(z / 3);
    const near = (t, r, kind) => { const cx = Math.floor(t.fi / 3), cz = Math.floor(t.fj / 3); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const o of grid.get((cx + a) + ',' + (cz + b)) || []) if (o.kind <= kind && Math.hypot(o.fi - t.fi, o.fj - t.fj) < r) return true; return false; };
    for (const t of trees) {
      const tree = t.fam === 'pine' ? 'f_pine' + t.n : t.fam === 'autumn' ? 'f_oak4' : 'f_oak' + (t.n === 5 ? (t.h2 < 0.3 ? 5 : 0) : t.n === 4 ? (t.h2 < 0.45 ? 4 : 2) : t.n);   // (the golden and the blossom trees are the rare ones)
      const yaw = t.h2 * 6.28;
      if (!near(t, 2.7, 0)) { t.kind = 0; add(tree, [t.fi, t.fj, yaw, 0.85 + t.h2 * 0.4, t.h]); }
      else if (!near(t, 1.7, 1)) { t.kind = 1; add(tree, [t.fi, t.fj, yaw, 0.42 + t.h2 * 0.2, t.h]); }
      else { t.kind = 2; const r = t.h2; if (r < 0.5) add('f_bush' + (t.n % 6), [t.fi, t.fj, yaw, 0.9 + t.h * 0.7, t.h]); else if (r < 0.8) add('f_fern' + (t.n % 6), [t.fi, t.fj, yaw, 1.0 + t.h * 0.6, t.h]); else add(tree, [t.fi, t.fj, yaw, 0.2 + t.h * 0.12, t.h]); }
      const k = key(t.fi, t.fj); (grid.get(k) || grid.set(k, []).get(k)).push(t);
    }
    for (const file in out) { const tree = /pine|oak/.test(file), low = /bush|fern/.test(file);
      place(file, out[file], group, alive, { from: tree ? 2.0 : 0.15, sway: tree ? 0.012 : low ? 0.05 : 0, fade: !/rock/.test(file) }); }
  }

  // ---- grass and flowers: tufts wherever the painted ground is green, each tinted by the ground under it; flowers in patches
  function grass(group, alive) {
    if (!LV.outdoor) return;
    const tufts = [[], [], []], blooms = [[], [], []], extra = window.R3D_EXTRA || [];
    for (let j = 0; j < MH; j++) for (let i = 0; i < MW; i++) {
      if (LV.map[j * MW + i] !== FLOOR || extra.some(e => i >= e.rect[0] && i < e.rect[1] && j >= e.rect[2] && j < e.rect[3])) continue;
      const patch = hash2(Math.floor(i / 5) * 3 + 1, Math.floor(j / 5) * 7 + 2), kind = Math.floor(hash2(Math.floor(i / 5) + 40, Math.floor(j / 5) + 9) * 3);
      for (let n = 0; n < 3; n++) {
        const fi = i + hash2(i * 3 + n, j), fj = j + hash2(j * 5 + n, i + 7), [x, y] = iso(fi, fj), v = floorBuf[Math.round(y) * WW + Math.round(x)] & 127; if (!v) continue;
        const c = PAL32[v], r = c & 255, gg = (c >> 8) & 255, bb = (c >> 16) & 255; if (!(gg > r * 1.06 && gg > bb * 1.25 && gg > 60)) continue;
        const h = hash2(i + n * 11, j * 3);
        if (n === 2) { if (patch > 0.62 && h > 0.3) blooms[kind].push([fi, fj, h * 6.28, 0.55 + h * 0.4]); if (patch > 0.3) continue; }
        tufts[Math.floor(h * 2.999)].push([fi, fj, h * 6.28, 0.5 + hash2(j + n, i * 3) * 0.5, r, 0.7 + h * 0.5, gg, bb]);
      }
    }
    const tint = it => col.setRGB(Math.min(1, it[4] / 255 * 1.5), Math.min(1, it[6] / 255 * 1.75), Math.min(1, it[7] / 255 * 1.2), THREE.SRGBColorSpace);
    tufts.forEach((list, k) => place('f_grass' + k, list, group, alive, { from: 0.02, sway: 0.2, chunk: 8, shadow: false, tinted: tint, shrink: true }));
    blooms.forEach((list, k) => place('f_flower' + k, list, group, alive, { from: 0.02, sway: 0.14, chunk: 8, shadow: false, tinted: () => col.setRGB(1, 1, 1), shrink: true }));
  }

  // ---- structures (blender/scripts/buildings.py). Each part of a building is one of a few materials; the game lays that
  // material's brushwork over the part's painted colour: masonry on stone, planks on timber, shingles on roofs (which run
  // down the slope whichever way the roof faces), trowel marks on plaster, weave and seams on canvas.
  const DET = { wall: ['d_stone', 0.34], stone: ['d_stone', 0.5], wood: ['d_wood', 0.62], roof: ['d_shingle', 0.42], plaster: ['d_plaster', 0.4], cloth: ['d_cloth', 0.5] }, dTex = {}, sMats = {};
  function structMat(name) {
    if (sMats[name]) return sMats[name];
    if (name === 'glow') return sMats[name] = new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(1.7, 1.7, 1.7), side: THREE.DoubleSide });
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: name === 'plain' ? 0.7 : 0.95, metalness: 0, side: THREE.DoubleSide, envMapIntensity: 0.3 }), d = DET[name];
    const tex = d ? (dTex[d[0]] || (dTex[d[0]] = det(d[0]))) : null;
    m.onBeforeCompile = sh => { if (tex) sh.uniforms.dMap = { value: tex };
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp; varying vec3 vWn;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n#ifdef USE_INSTANCING\nvWp = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz; vWn = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * objectNormal);\n#else\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz; vWn = normalize(mat3(modelMatrix) * objectNormal);\n#endif\n');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + (tex ? 'uniform sampler2D dMap; ' : '') + 'varying vec3 vWp; varying vec3 vWn;')
        .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n{ float fd = length(vViewPosition); if (fd < 5.0) { float keep = smoothstep(1.2, 5.0, fd); if (keep < fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))))) discard; } }')
        .replace('#include <color_fragment>', '#include <color_fragment>\n' + (!tex ? '' : name === 'roof'
          ? '{ vec3 wn = normalize(vWn); vec2 hd = normalize(wn.xz + vec2(1e-4)); vec2 duv = vec2(dot(vWp.xz, vec2(-hd.y, hd.x)), vWp.y / max(0.3, length(wn.xz))); diffuseColor.rgb *= texture2D(dMap, duv * ' + d[1].toFixed(2) + ').rgb * 2.0; }'
          : '{ vec3 wn = abs(normalize(vWn)); vec2 duv = wn.y > 0.75 ? vWp.xz : (wn.x > wn.z ? vec2(vWp.z, vWp.y) : vec2(vWp.x, vWp.y)); diffuseColor.rgb *= texture2D(dMap, duv * ' + d[1].toFixed(2) + ').rgb * 2.0; }')); };
    m.customProgramCacheKey = () => 'struct' + name; return sMats[name] = m;
  }
  const matOf = mesh => structMat((mesh.material && mesh.material.name || 'plain').replace(/\.\d+$/, ''));
  let spinners = [];
  // list = [fi, fj, yaw, scale]. Parts named spin_* turn (the windmill's sails).
  function build(file, list, group, alive) {
    whenModel('world/' + file).then(g => {
      if (!g || !alive()) return; g.scene.updateMatrixWorld(true); const meshes = []; g.scene.traverse(o => { if (o.isMesh) meshes.push(o); });
      for (const src of meshes) {
        if (/^spin/.test(src.name) || (src.parent && /^spin/.test(src.parent.name))) {
          for (const it of list) { const piv = new THREE.Group(), hold = new THREE.Group(), s = it[3] || 1; hold.position.set(it[0], 0, it[1]); hold.rotation.y = -it[2]; hold.scale.setScalar(s); src.getWorldPosition(piv.position);
            const m = new THREE.Mesh(src.geometry, matOf(src)); m.castShadow = true; m.receiveShadow = true; piv.add(m); hold.add(piv); group.add(hold); spinners.push(piv); }
          continue; }
        const im = new THREE.InstancedMesh(src.geometry, matOf(src), list.length); im.castShadow = true; im.receiveShadow = true;
        list.forEach((it, n) => { const s = it[3] || 1; m4.compose(p.set(it[0], 0, it[1]), q.setFromAxisAngle(up, -it[2]), sc.set(s, s, s)); m4.multiply(src.matrixWorld); im.setMatrixAt(n, m4); });
        im.computeBoundingSphere(); group.add(im);
      }
    });
  }
  const STRUCT = [[/^palisade\d+$/, 'b_palisade'], [/^tent$/, 'b_tent'], [/^well$/, 'b_well'], [/^wagon$/, 'b_wagon'], [/^stall\d*$/, 'b_stall'], [/^forge$/, 'b_forge'], [/^lantern$/, 'b_lantern'], [/^tower$/, 'b_tower'], [/^cabin$/, 'b_cottage'], [/^windmill$/, 'b_windmill'], [/^stonewall$/, 'b_stonewall']];
  // Things still drawn with the overhead game's models are simply stood up bigger, to match the hero at this camera
  const GROW = [[/^grave/, 1.7], [/^menhir/, 2.2], [/^signpost/, 1.7], [/^barrow/, 1.6], [/^den/, 1.6], [/^hay/, 1.35], [/^cart/, 2.1], [/^log\d/, 1.4], [/^woodpile/, 1.35], [/^altar/, 1.3], [/^campfire/, 1.5], [/^crop/, 1.15], [/^shroom/, 2.4], [/^fence/, 1.5], [/^gate/, 1.45], [/^minebarred/, 1.5], [/^(barrel|chest|cage|egg|crate)/, 1.3]];
  function grow(name) { if (!LV.outdoor) return 1; for (const [re, s] of GROW) if (re.test(name)) return s; return 1; }
  function structures(by, group, alive) {
    spinners = [];
    for (const [name, list] of [...by]) { const hit = STRUCT.find(e => e[0].test(name)); if (!hit) continue; by.delete(name); const all = by.get('\0' + hit[1]) || []; all.push(...list); by.set('\0' + hit[1], all); }
    for (const [name, list] of [...by]) if (name[0] === '\0') { by.delete(name); build(name.slice(1), list, group, alive); }
  }

  // ---- the ground outdoors. Its colours are the 2D game's own painted floor (grass, paths, the camp's cobbles), softened so
  // one kind of ground blends into the next; the brushwork on top is the detail paint from Blender (terrain.py), laid in
  // world space so it stays crisp under the hero's feet: grass strokes on green, pebbles and ruts on earth, flagstones on grey.
  const RES = 4, PAD = 6, texLoader = new THREE.TextureLoader();
  const det = n => { const t = texLoader.load('models/world/' + n + '.png'); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
  const dGrass = det('d_grass'), dDirt = det('d_dirt'), dStone = det('d_stone');
  let gnd = null;
  function repaint() {
    if (!gnd) return; const { w, h, data } = gnd, off = [[0, 0], [0.2, 0.1], [-0.2, -0.1], [0.1, -0.2], [-0.1, 0.2]]; let ar = 0, ag = 0, ab = 0, an = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const fi = (x + 0.5) / RES - PAD, fj = (y + 0.5) / RES - PAD, o = (y * w + x) * 4; let r = 0, g = 0, b = 0, n = 0;
      if (fi > -0.5 && fj > -0.5 && fi < MW + 0.5 && fj < MH + 0.5) for (const [a, c] of off) { const [px, py] = iso(fi + a, fj + c), X = Math.round(px), Y = Math.round(py); if (X < 0 || Y < 0 || X >= WW || Y >= WH) continue; const v = floorBuf[Y * WW + X] & 127; if (!v) continue; const k = PAL32[v]; r += k & 255; g += (k >> 8) & 255; b += (k >> 16) & 255; n++; }
      if (n) { data[o] = r / n; data[o + 1] = g / n; data[o + 2] = b / n; data[o + 3] = 255; if (g > r * 1.06 * 1) { ar += r / n; ag += g / n; ab += b / n; an++; } } else data[o + 3] = 0;
    }
    if (!LV.outdoor) { ar = ag = ab = 0; an = 1; }   // (indoors, what is not floor is the dark)
    if (!an) { ar = 90; ag = 122; ab = 58; an = 1; }
    for (let o = 0; o < data.length; o += 4) if (!data[o + 3]) { data[o] = ar / an; data[o + 1] = ag / an; data[o + 2] = ab / an; data[o + 3] = 255; }
    gnd.tex.needsUpdate = true;
  }
  function ground(group) {
    const w = (MW + 2 * PAD) * RES, h = (MH + 2 * PAD) * RES, data = new Uint8Array(w * h * 4), tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
    tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true;
    gnd = { w, h, data, tex }; repaint();
    const indoor = !LV.outdoor, E = indoor ? 0 : 700, geo = new THREE.BufferGeometry(), P = [], UV = [];
    for (const [x, z] of [[-E, -E], [MW + E, -E], [MW + E, MH + E], [-E, MH + E]]) { P.push(x, 0, z); UV.push((x + PAD) / (MW + 2 * PAD), (z + PAD) / (MH + 2 * PAD)); }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); geo.setIndex([0, 2, 1, 0, 3, 2]); geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 1, metalness: 0, envMapIntensity: 0.2 });
    mat.onBeforeCompile = sh => { sh.uniforms.dGrass = { value: dGrass }; sh.uniforms.dDirt = { value: dDirt }; sh.uniforms.dStone = { value: dStone };
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWp = (modelMatrix * vec4(position, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D dGrass, dDirt, dStone; varying vec3 vWp;')
        .replace('#include <map_fragment>', `#include <map_fragment>
{ vec3 bc = diffuseColor.rgb; float mx = max(bc.r, max(bc.g, bc.b)), mn = min(bc.r, min(bc.g, bc.b));
  float wG = ${indoor ? '0.0' : 'smoothstep(-0.012, 0.03, bc.g - bc.r)'};
  float wS = ${indoor ? '1.0' : '(1.0 - wG) * (1.0 - smoothstep(0.10, 0.22, (mx - mn) / max(mx, 0.03)))'};
  vec2 uvd = vWp.xz * 0.25; float far = smoothstep(18.0, 60.0, distance(vWp, cameraPosition));
  vec3 dg = texture2D(dGrass, uvd).rgb, dd = texture2D(dDirt, uvd * 1.25).rgb, ds = texture2D(dStone, uvd * 1.5).rgb;
  vec3 dt = mix(mix(mix(dd, ds, wS), dg, wG), vec3(0.5), far * 0.7);
  float big = texture2D(dDirt, vWp.xz * 0.019).g;
  bc *= ${indoor ? 'vec3(1.25)' : 'mix(vec3(1.08), vec3(1.0, 1.3, 0.8), wG)'};
  diffuseColor.rgb = bc * dt * 2.0 * (0.8 + 0.4 * big); }`); };
    mat.customProgramCacheKey = () => 'gnd' + indoor;
    const mesh = new THREE.Mesh(geo, mat); mesh.receiveShadow = true; mesh.frustumCulled = false; group.add(mesh); group.userData.gtex = tex; return mesh;
  }

  // ---- underground: walls of big dressed blocks rising from a plinth to a cornice, and a stone ceiling over it all.
  // One face for every side of a wall tile that looks onto floor; the masonry itself is the detail paint.
  const WALLH = 4.6, THEMEC = { crypt: [0.52, 0.45, 0.37], caves: [0.36, 0.39, 0.46], hell: [0.50, 0.22, 0.18] };
  function dungeon(group) {
    const tc = THEMEC[LV.theme] || THEMEC.crypt, P = [], C = [], N = [], I = [];
    const quad = (pts, n, cols) => { const b = P.length / 3; pts.forEach((pt, k) => { P.push(pt[0], pt[1], pt[2]); N.push(n[0], n[1], n[2]); const c = cols[k]; C.push(tc[0] * c, tc[1] * c, tc[2] * c); }); I.push(b, b + 1, b + 2, b, b + 2, b + 3); };
    for (let j = 0; j < MH; j++) for (let i = 0; i < MW; i++) {
      if (tileAt(i, j) !== WALL) continue;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (tileAt(i + di, j + dj) !== FLOOR) continue;
        const e0 = di ? [i + (di > 0 ? 1 : 0), j] : [i, j + (dj > 0 ? 1 : 0)], e1 = di ? [e0[0], j + 1] : [i + 1, e0[1]], n = [di, 0, dj], v = 0.86 + 0.22 * hash2(i * 3 + di + 7, j * 5 + dj + 3);
        const at = (e, y, o = 0) => [e[0] + di * o, y, e[1] + dj * o], band = (y0, y1, c0, c1, o = 0) => quad([at(e0, y0, o), at(e1, y0, o), at(e1, y1, o), at(e0, y1, o)], n, [c0 * v, c0 * v, c1 * v, c1 * v]);
        band(0.42, 3.1, 0.95, 0.9); band(3.34, WALLH, 0.72, 0.4);
        band(0, 0.42, 0.5, 0.92, 0.07); quad([at(e0, 0.42, 0.07), at(e1, 0.42, 0.07), at(e1, 0.42), at(e0, 0.42)], [0, 1, 0], [1.05 * v, 1.05 * v, 0.8 * v, 0.8 * v]);   // the plinth and its ledge
        band(3.1, 3.34, 1.0, 1.08, 0.09); quad([at(e0, 3.1), at(e1, 3.1), at(e1, 3.1, 0.09), at(e0, 3.1, 0.09)], [0, -1, 0], [0.45 * v, 0.45 * v, 0.6 * v, 0.6 * v]); quad([at(e0, 3.34, 0.09), at(e1, 3.34, 0.09), at(e1, 3.34), at(e0, 3.34)], [0, 1, 0], [0.9 * v, 0.9 * v, 0.6 * v, 0.6 * v]);   // the cornice
      }
    }
    quad([[0, WALLH, 0], [MW, WALLH, 0], [MW, WALLH, MH], [0, WALLH, MH]], [0, -1, 0], [0.34, 0.34, 0.34, 0.34]);   // the ceiling
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); geo.setIndex(I);
    const m = new THREE.Mesh(geo, structMat('wall')); m.receiveShadow = true; m.castShadow = false; m.frustumCulled = false; group.add(m);
    // a torch in an iron bracket wherever the level burns a flame on a wall; the flame itself is moved to the torch's head
    flameAt = new Map(); const list = [];
    for (const f of fires) { const ti = f.tile % MW, tj = Math.floor(f.tile / MW); if (tileAt(ti, tj) !== WALL) continue;
      const z = Math.max(0, 8 * (ti + tj + 1.8) + WY0 - f.wy), [fi, fj] = groundToTile(f.wx, f.wy + z); let best = null;
      for (const [di, dj] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) if (tileAt(ti + di, tj + dj) === FLOOR) { const d = Math.hypot(ti + 0.5 + di - fi, tj + 0.5 + dj - fj); if (!best || d < best[2]) best = [di, dj, d]; }
      if (!best) continue; const [di, dj] = best, x = di ? ti + (di > 0 ? 1 : 0) + di * 0.32 : Math.max(ti + 0.2, Math.min(ti + 0.8, fi)), zz = dj ? tj + (dj > 0 ? 1 : 0) + dj * 0.32 : Math.max(tj + 0.2, Math.min(tj + 0.8, fj));
      flameAt.set(f, [x, 2.15, zz]); list.push([x, zz, Math.atan2(dj, di), 1, 2.05]); }
    if (list.length) whenModel('world/b_sconce').then(g => { if (!g || !m.parent) return; g.scene.updateMatrixWorld(true);
      g.scene.traverse(src => { if (!src.isMesh) return; const im = new THREE.InstancedMesh(src.geometry, matOf(src), list.length);
        list.forEach((it, n) => { m4.compose(p.set(it[0], it[4], it[1]), q.setFromAxisAngle(up, -it[2]), sc.set(1, 1, 1)); m4.multiply(src.matrixWorld); im.setMatrixAt(n, m4); }); im.frustumCulled = false; group.add(im); }); });
    return m;
  }
  let flameAt = new Map();

  // ---- the sky: a painted dome, drifting clouds, far mountains and nearer hills (terrain.py -> w_sky.glb). It rides with the camera.
  let sky = null, skyWant = null;
  whenModel('world/w_sky').then(g => { if (!g) return; sky = new THREE.Group(); sky.scale.setScalar(620);
    for (const name of ['dome', 'hills', 'clouds']) { const o = g.scene.getObjectByName(name); if (!o) continue; const mesh = o.isMesh ? o : o.children.find(c => c.isMesh); if (!mesh) continue;
      const m = new THREE.Mesh(mesh.geometry, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, depthWrite: false, side: name === 'dome' ? THREE.BackSide : THREE.DoubleSide }));
      m.name = name; m.frustumCulled = false; m.renderOrder = name === 'dome' ? -30 : name === 'hills' ? -20 : -25; sky.add(m); }
    sky.visible = false; if (skyHost) skyHost.add(sky); if (skyWant) setSky(...skyWant); });
  let skyHost = null;
  function setSky(on, night) { skyWant = [on, night]; if (!sky) return; sky.visible = on; for (const m of sky.children) m.material.color.setHex(night ? (m.name === 'dome' ? 0x1b2750 : 0x2a3760) : 0xffffff); }
  function host(scene) { skyHost = scene; if (sky && !sky.parent) scene.add(sky); }

  // grass far from the hero is not drawn; the sky keeps the camera at its centre
  function update(dt, cam) {
    for (const c of grassChunks) c.im.visible = Math.abs(c.x - hero.fi) < 36 && Math.abs(c.z - hero.fj) < 36;
    if (sky && sky.visible) { sky.position.set(cam.position.x, -2, cam.position.z); const c = sky.getObjectByName('clouds'); if (c) c.rotation.y += dt * 0.004; }
    for (const s of spinners) s.rotation.z += dt * 0.45;
  }
  return { flora, grass, grow, ground, dungeon, WALLH, flame: f => flameAt.get(f), dropFlames() { flameAt = new Map(); }, repaint, setSky, host, update, get hasGround() { return !!gnd; }, dropGround() { gnd = null; } };
}
