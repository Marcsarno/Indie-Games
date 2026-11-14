// Round 114 (the user, after the biome demos: "the north needs to look like the frozen area ... the farm area can
// have a bit of the golden canyon color palette ... proves our open world is a bit dull"): Act I's outdoors get
// regions of their own. The built picture of the world (palette indices in wIdx, wIdx2, floorBuf) is recolored
// pixel by pixel by the region its ground tile lies in, ramp to ramp by brightness; the edges between regions
// are dithered over a few tiles. The Hollow's north (the watchtower, the graveyard path, the barrow, the fallen
// tree) is under snow; past it the Riverlands are frozen, all but the farm, a pocket of golden harvest. Snow
// falls while the hero stands in the snow. (tools/playtests/r114/biomes.cjs drew the first looks.)
const BIOME_RAMPS = {
  frozen: () => [[GRASS, [29, 30, 31, 31, 32, 32, 118]], [LEAF, [52, 53, 53, 30, 31, 32]], [DIRT, [28, 29, 30, 30, 31, 31]], [S, [28, 28, 29, 29, 30, 30, 31, 31, 32]], [AUTUMN, [29, 30, 31, 32]], [[104, 105, 106, 107, 108], [29, 30, 31, 32, 32]], [[56, 57, 58, 59], [30, 31, 32, 32]], [[22, 23], [31, 32]], [[50, 51], [32, 32]]],   // (the meadow's flowers: frost in the snow)
  golden: () => [[GRASS, [104, 105, 105, 106, 107, 107, 108]], [LEAF, [119, 120, 121, 110, 111, 112]]],
};
const BIOME_MAPS = {};
function biomeMap(name) {
  if (BIOME_MAPS[name]) return BIOME_MAPS[name];
  const map = new Uint8Array(128); for (let c = 0; c < 128; c++) map[c] = c;
  for (const [src, dst] of BIOME_RAMPS[name]()) src.forEach((c, k) => { map[c] = dst[Math.round(k * (dst.length - 1) / Math.max(1, src.length - 1))]; });
  return (BIOME_MAPS[name] = map);
}
const smooth01 = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
// how much of each region a ground tile is: { frozen, golden } in 0..1
function biomeAt(fi, fj) {
  if (LV.side || !LV.outdoor || LV.act !== 0) return null;
  if (LV.hub) { const s = (fi + fj) / 2; return { frozen: smooth01(49, 41, s), golden: 0 }; }   // (US: i = s + u, j = s - u; small s is north)
  if (LV.riv) {
    const g = 1 - smooth01(13, 19, Math.hypot(fi - RIV.farm[0], fj - RIV.farm[1] - 2));   // the farm: its fields round the farmhouse
    return { golden: g, frozen: (1 - g) * smooth01(86, 72, fi + fj) };   // north of where the road comes in, snow
  }
  return null;
}
function tintWorld() {
  if (!biomeAt(0, 0)) return;
  const fz = biomeMap('frozen'), gd = biomeMap('golden'), FZ = new Float32Array(MW * MH), GD = new Float32Array(MW * MH);
  for (let j = 0; j < MH; j++) for (let i = 0; i < MW; i++) { const B = biomeAt(i + 0.5, j + 0.5); FZ[j * MW + i] = B.frozen; GD[j * MW + i] = B.golden; }   // (once a tile, not once a pixel)
  const pass = (A, scale) => {   // A: palette indices over the world picture at `scale` (1, or 2 for the detail layer)
    const w = WW * scale, h = A.length / w;
    for (let y = 0; y < h; y++) {
      const wy = y / scale - WY0, row = y * w;
      for (let x = 0; x < w; x++) {
        const v = A[row + x]; if (!v || v === BLK || (v & EMIS)) continue;
        const wx = x / scale - WX0, i = Math.floor((wx / 16 + wy / 8) / 2), j = Math.floor((wy / 8 - wx / 16) / 2);
        if (i < 0 || j < 0 || i >= MW || j >= MH) continue;
        const k = j * MW + i, t = BAYER[((y & 3) << 2) | (x & 3)];
        if (FZ[k] > t) A[row + x] = fz[v]; else if (GD[k] > t) A[row + x] = gd[v];
      }
    }
  };
  pass(wIdx, 1); if (typeof floorBuf !== 'undefined' && floorBuf && floorBuf.length === wIdx.length) pass(floorBuf, 1); if (WORLD2X && wIdx2) pass(wIdx2, 2);
}
{ const bw0 = buildWorld; buildWorld = function (...a) { const r = bw0(...a); tintWorld(); return r; }; }

// snow falls round the hero while he stands in the snow
{ const upB = update; update = function (dt) {
  const r = upB(dt);
  if (G.mode === 'play' && LV.outdoor && !G.paused) {
    const B = biomeAt(hero.fi, hero.fj);
    if (B && B.frozen > 0.4) { const [hx0, hy0] = screenOf(hero), n = dt * 60 * B.frozen;
      for (let k = 0; k < n; k++) if (Math.random() < 0.5) pspawn(8, hx0 + (Math.random() - 0.5) * 320, hy0 + (Math.random() - 0.5) * 220 + 20, 50 + Math.random() * 50, -5 - Math.random() * 6, 3, -14 - Math.random() * 10, 3.5, Math.random() < 0.6 ? 32 : 27); }
  }
  return r;
}; }
