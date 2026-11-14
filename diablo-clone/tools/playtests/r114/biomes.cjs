// round 114: biome demos (the user: "give me a demo of what each could look like", after a video of five areas).
// Not in the game: Act I's woods by the brook, its baked picture recolored per biome, the biome's own props
// built from rig primitives and baked into the world, a light grade, the hero and fitting monsters.
//   node biomes.cjs <outDir> [gameDir]
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const BIOMES = ['now', 'graveyard', 'tundra', 'canyon', 'ruins', 'hell'];
(async () => { const [out, game = 'game'] = process.argv.slice(2), b = await chromium.launch(), errs = [];
  fs.mkdirSync(out, { recursive: true });
  for (const biome of BIOMES) {
    const p = await b.newPage(); p.on('pageerror', e => errs.push(biome + ': ' + String(e.stack).slice(0, 300)));
    await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
    await p.goto('file://' + path.resolve(game, 'index.html') + '?cine=0');
    const url = await p.evaluate((biome) => {
      allocBuffers(270, 480); G.mode = 'title'; beginGame(false, biome === 'tundra' ? 'warrior' : biome === 'hell' ? 'paladin' : biome === 'canyon' ? 'ranger' : 'mage');
      for (let k = 0; k < 10; k++) update(1 / 60);
      // the spot: a bridge over the brook, the hero two tiles off it, nobody else about
      const br = LV.bridges[Math.floor(LV.bridges.length * 0.35)]; hero.fi = br[0] + 0.5; hero.fj = br[1] + 2.6; if (!standable(hero.fi, hero.fj, 0.3)) { hero.fj = br[1] - 2.4; }
      enemies.length = 0; npcs && (npcs.length = 0); G.msg = []; updateFov(hero.fi, hero.fj);
      const ramp = (src, dst, map) => src.forEach((c, k) => { map[c] = dst[Math.round(k * (dst.length - 1) / Math.max(1, src.length - 1))]; });
      const RAMPS = {   // [source ramp, target ramp] by brightness rank
        graveyard: [[GRASS, [64, 52, 65, 53, 66, 54, 67]], [LEAF, [64, 52, 52, 53, 53, 54]], [DIRT, [64, 65, 66, 67, 68, 69]], [S, [64, 65, 65, 66, 66, 67, 67, 68, 69]], [WATER, [37, 37, 126, 114, 127]], [[104, 105, 106, 107, 108], [65, 66, 67, 68, 69]]],
        tundra: [[GRASS, [29, 30, 31, 31, 32, 32, 118]], [LEAF, [52, 53, 53, 30, 31, 32]], [DIRT, [28, 29, 30, 30, 31, 31]], [S, [28, 28, 29, 29, 30, 30, 31, 31, 32]], [WATER, [116, 117, 117, 118, 118]], [AUTUMN, [29, 30, 31, 32]]],
        canyon: [[GRASS, [104, 105, 105, 106, 107, 107, 108]], [LEAF, [119, 120, 121, 110, 111, 112]], [DIRT, [6, 7, 8, 9, 10, 11]], [S, [5, 6, 7, 8, 9, 10, 11, 12, 12]], [WATER, [70, 70, 71, 71, 72]]],
        ruins: [[DIRT, [64, 65, 66, 67, 68, 69]], [[104, 105, 106, 107, 108], [87, 88, 89, 90, 91]]],
        hell: [[GRASS, [73, 74, 75, 76, 77, 77, 78]], [LEAF, [64, 41, 42, 43, 74, 75]], [DIRT, [64, 65, 66, 67, 68, 69]], [S, [64, 65, 73, 74, 75, 76, 77, 77, 78]], [AUTUMN, [74, 75, 76, 77]], [[104, 105, 106, 107, 108], [73, 74, 75, 76, 77]]],
      };
      if (RAMPS[biome]) {
        const map = new Uint8Array(128); for (let c = 0; c < 128; c++) map[c] = c; for (const [s, d] of RAMPS[biome]) ramp(s, d, map);
        const lava = biome === 'hell' ? new Set(WATER) : null;
        const re = A => { for (let k = 0; k < A.length; k++) { const v = A[k]; if (!v || v === BLK) continue; if (v & EMIS) continue; if (lava && lava.has(v)) { A[k] = [81, 82, 82, 83, 84][WATER.indexOf(v)] | EMIS; continue; } A[k] = map[v]; } };
        re(wIdx); if (typeof wIdx2 !== 'undefined') re(wIdx2);
      }
      // ---- the props: rig primitives, baked into the world where they stand
      const S0 = getSprite;   // (just to be sure the rig is loaded)
      const at = (di, dj) => [hero.fi + di, hero.fj + dj];
      const V3 = v => v.map(x => x * PK), scaled = r => ({ sph: (c, rad, m, o) => r.sph(V3(c), rad * PK, m, o), ell: (c, rad, m, ax, o) => r.ell(V3(c), V3(rad), m, ax, o), cone: (a, b2, ra, rb, m, o) => r.cone(V3(a), V3(b2), ra * PK, rb * PK, m, o), cyl: (a, b2, rad, m, o) => r.cyl(V3(a), V3(b2), rad * PK, m, o), box: (c, half, m, ax, o) => r.box(V3(c), V3(half), m, ax, o) });
      let PK = 1.6;   // (props are built 1.6x: at the rig's 1 unit = 1 pixel they came out doll-sized)
      const put = (build, w, h, ax, ay, di, dj, yaw = Math.PI / 4) => { const r0 = new Rig(), r = scaled(r0); build(r); w = Math.round(w * PK); h = Math.round(h * PK); ax = Math.round(ax * PK); ay = Math.round(ay * PK); const rr = r0; const sp = renderRig(rr, yaw, w, h, ax, ay); const [fi, fj] = at(di, dj); const [x, y] = iso(fi, fj); blitWorld(sp, x, y, 0, tIdx(Math.floor(fi), Math.floor(fj))); return [fi, fj]; };
      const glows = [];
      const lanternPost = (di, dj) => { const q = put(r => { r.cyl([0, 0, 0], [0, 0, 22], 0.9, M.WOOD); r.cyl([0, 0, 21], [3, 0, 21], 0.6, M.WOOD); r.box([3.5, 0, 17.5], [1.6, 1.6, 2.2], M.IRON); r.box([3.5, 0, 17.5], [1.1, 1.1, 1.7], M.FIREM); r.cyl([0, 0, 0], [0, 0, 1], 2.2, M.SLATE); }, 24, 34, 12, 30, di, dj); glows.push([q, 'warm', 24]); };
      const grave = (di, dj, tilt = 0) => put(r => { r.box([0, 0, 5 + tilt], [1.2, 3.4, 5], M.SLATE); r.cyl([0, -3.4, 10], [0, 3.4, 10], 3.4, M.SLATE); r.box([0, 0, 0.4], [3.5, 4.5, 0.6], M.ROCK); }, 18, 22, 9, 18, di, dj);
      const ribcage = (di, dj) => put(r => {   // a great beast's bones: spine along the ground, ribs arching up out of the snow, the skull at one end
        for (let k = 0; k < 7; k++) { const x = -18 + k * 6; for (const s of [-1, 1]) { const a = [x, s * 2, 2], m = [x + 1, s * 11, 14 - Math.abs(k - 3)], t = [x + 2, s * 7, 24 - Math.abs(k - 3) * 2.2]; r.cone(a, m, 1.6, 1.3, M.OLDBONE); r.cone(m, t, 1.3, 0.5, M.OLDBONE); } }
        r.cone([-22, 0, 2], [24, 0, 3], 2.2, 1.6, M.BONE); r.ell([28, 0, 6], [7, 5, 4.5], M.BONE); r.cone([31, -3, 9], [40, -9, 18], 1.6, 0.5, M.BONE); r.cone([31, 3, 9], [40, 9, 18], 1.6, 0.5, M.BONE);
      }, 110, 70, 55, 52, di, dj, Math.PI / 5);
      const crystal = (di, dj, s = 1) => put(r => { r.cone([0, 0, 0], [0, 0, 18 * s], 4 * s, 0.4, M.ICE); r.cone([2, 3, 0], [4, 6, 11 * s], 2.6 * s, 0.3, M.ICE); r.cone([-2, -3, 0], [-3, -6, 9 * s], 2.2 * s, 0.3, M.ICE); }, 30, 36, 15, 32, di, dj);
      const pine = (di, dj) => put(r => { r.cyl([0, 0, 0], [0, 0, 6], 1.2, M.BARK); for (let k = 0; k < 4; k++) r.cone([0, 0, 5 + k * 6], [0, 0, 13 + k * 6], 8 - k * 1.6, 0.5, k % 2 ? M.CLOTH_WHITE : M.PINE); }, 26, 40, 13, 36, di, dj);
      const ropePosts = (di, dj, n) => { for (let k = 0; k < n; k++) put(r => { r.cyl([0, 0, 0], [0, 0, 10], 1.1, M.WOOD); r.sph([0, 0, 10.5], 1.3, M.WOOD); r.cyl([0, 0, 8], [0, 5, 7], 0.35, M.STRAWM); }, 14, 18, 7, 15, di + k * 1.1, dj); };
      const cart = (di, dj) => put(r => { r.box([0, 0, 7], [10, 6, 3], M.PLANK); r.box([0, 0, 10.5], [10, 6.2, 0.6], M.WOOD); for (const s of [-1, 1]) r.cyl([4, s * 6.8, 4.5], [4, s * 7.6, 4.5], 4.5, M.WOOD); r.cyl([-4, -7, 3], [-6, -8, 0], 4, M.WOOD); r.cone([10, 0, 7], [22, 0, 3], 0.8, 0.8, M.WOOD); r.ell([-3, 1, 13], [3, 3, 3], M.CLOTH_TAN); r.ell([2, -2, 13], [3.4, 3, 3.2], M.CLOTH_TAN); r.ell([16, 6, 2.5], [3, 2.8, 2.6], M.CLOTH_TAN); }, 60, 40, 30, 30, di, dj, Math.PI / 6);
      const sword = (di, dj) => put(r => { r.box([0, 0, 9], [0.4, 1.2, 9], M.BLADE); r.box([0, 0, 18.5], [0.8, 4, 0.8], M.IRON); r.cyl([0, 0, 19], [0, 0, 23], 0.8, M.LEATHER); r.sph([0, 0, 23.6], 1.2, M.GOLD); r.ell([0, 0, 0.2], [3, 3, 0.6], M.ROCK); }, 16, 30, 8, 27, di, dj);
      const fence = (di, dj) => { for (let k = 0; k < 3; k++) put(r => { r.cyl([0, 0, 0], [0, 0, 9 - k], 1, M.WOOD); if (k < 2) r.cyl([0, 0, 6], [0, 6, 5 - k * 2], 0.7, M.WOOD); }, 16, 16, 8, 14, di + k * 0.9, dj - k * 0.3); };
      const portal = (di, dj) => { const q = put(r => { for (let k = 0; k < 20; k++) { const a = k / 20 * 6.283, a2 = (k + 1) / 20 * 6.283; r.cone([0, Math.cos(a) * 13, 15 + Math.sin(a) * 13], [0, Math.cos(a2) * 13, 15 + Math.sin(a2) * 13], 2.2, 2.2, M.SLATE); } r.ell([0, 0, 15], [1, 11, 11], M.ARCANE); for (const s of [-1, 1]) r.cone([0, s * 14, 0], [0, s * 17, 30], 3, 1, M.SLATE); r.box([0, 0, 0.5], [4, 18, 1], M.SLATE); }, 50, 52, 25, 48, di, dj); glows.push([q, 'violet', 46]); };
      const bonepile = (di, dj) => put(r => { r.sph([0, 0, 2.6], 2.6, M.BONE); for (let k = 0; k < 6; k++) { const a = k * 1.1; r.cone([Math.cos(a) * 2, Math.sin(a) * 2, 1], [Math.cos(a) * 7, Math.sin(a) * 7, 2 + (k % 2) * 2], 0.9, 0.7, M.OLDBONE); } }, 22, 14, 11, 10, di, dj);
      const monsters = (id, list) => { for (const [di, dj] of list) { const e = makeEnemy(id, hero.fi + di, hero.fj + dj, enemies.length); e.state = 'sleep'; e.dir = 2; enemies.push(e); } };
      if (biome === 'graveyard') { lanternPost(-2.5, -1.5); lanternPost(3.2, 2); for (const [a, c, t] of [[1.5, -3, 0], [3, -3.6, 1], [4.5, -2.8, 0], [2, -5, 0], [-3, 2.5, 1], [-4.5, 3.4, 0]]) grave(a, c, t); monsters('skeleton', [[4, -1], [5.5, 0.5]]); }
      if (biome === 'tundra') { ribcage(3.5, -3); crystal(-3, 2.5, 1.2); crystal(-4.4, 1.2, 0.8); crystal(4.5, 3.5, 1); pine(-4, -3); pine(5.5, -0.5); monsters('wolf', [[2, 2.5], [3.5, 3.4]]); }
      if (biome === 'canyon') { ropePosts(-3.5, 1.2, 3); ropePosts(-3.5, -1.2, 3); monsters('brigand', [[4, 1.5], [4.6, -1]]); }
      if (biome === 'ruins') { cart(-3, -2.5); sword(2.5, 1.5); fence(3.5, -3); bonepile(-1.5, 3); monsters('goblin', [[4.5, 1], [5, -0.5], [5.6, 1.5]]); }
      if (biome === 'hell') { portal(3, -3.5); bonepile(-2.5, 2); bonepile(2, 3); monsters('skeleton', [[4, 0.5]]); }
      // ---- the light: a grade per biome, and glows at the lanterns and the portal
      const GR = { now: null, graveyard: [0.5, 0.62, 1.0, 0, 4, 18], tundra: [1.02, 1.06, 1.12, 6, 8, 12], canyon: [1.08, 0.98, 0.86, 8, 4, 0], ruins: [1.0, 1.0, 0.95, 0, 0, 0], hell: [1.1, 0.62, 0.55, 18, 0, 0] }[biome];
      { const dh = drawHudLayer; drawHudLayer = function (...a) {
        if (GR) for (let k = 0; k < ov32.length; k++) { const v = ov32[k]; const r = v & 255, g = (v >> 8) & 255, bl = (v >> 16) & 255; ov32[k] = (255 << 24) | (Math.min(255, bl * GR[2] + GR[5]) << 16) | (Math.min(255, g * GR[1] + GR[4]) << 8) | Math.min(255, r * GR[0] + GR[3]); }
        for (const [[fi, fj], kind, R] of glows) { const [x, y] = iso(fi, fj), cx = Math.round(x * SPX - cam2x), cy = Math.round((y - 28) * SPX - cam2y), RR = R * SPX, col = kind === 'warm' ? [255, 190, 90] : [190, 90, 255];
          for (let yy = Math.max(0, cy - RR); yy < Math.min(OH, cy + RR); yy++) for (let xx = Math.max(0, cx - RR); xx < Math.min(OW, cx + RR); xx++) { const d = Math.hypot(xx - cx, (yy - cy) * 1.6) / RR; if (d >= 1) continue; const k = yy * OW + xx, v = ov32[k], a = (1 - d) * (1 - d) * 0.55; const r = v & 255, g = (v >> 8) & 255, bl = (v >> 16) & 255; ov32[k] = (255 << 24) | (Math.min(255, bl + col[2] * a) << 16) | (Math.min(255, g + col[1] * a) << 8) | Math.min(255, r + col[0] * a); } }
        return dh(...a); }; }
      for (let k = 0; k < 4; k++) update(1 / 60); G.msg = []; G.actCard = 0; render(); return cvs.toDataURL();
    }, biome);
    fs.writeFileSync(`${out}/${biome}.png`, Buffer.from(url.split(',')[1], 'base64')); await p.close();
  }
  console.log(errs.slice(0, 4).join('\n') || 'no errors'); await b.close(); })();
