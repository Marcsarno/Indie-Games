#!/usr/bin/env node
// Art review tools for the code-drawn sprites. Runs the game page in headless Chromium and
// renders review images from the live sprite functions, so the sheets always match the game.
//
//   node tools/art.cjs sheet [--shade form|edge] [--out DIR]   contact sheets + lint report
//   node tools/art.cjs lint  [--shade form|edge]               lint table only
//   node tools/art.cjs ab    [--out DIR]                       blind A/B sheet (edge vs form)
//
// Sheets show every character at 4x unlit, on a real floor tile at dark/mid/bright torch bands
// (mirrored too), at 1x, and as a flat silhouette. Claude reviews these PNGs, never ASCII.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const cmd = args[0] || 'sheet';
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def; };
const PAGE = path.resolve(__dirname, '../prototype-simple/index.html');
const OUT = path.resolve(opt('out', path.join(__dirname, '../art-review')));

// Which frames to show per character. Each entry builds a sprite from the page's own functions.
const CAST = `[
  { name: 'knight', lut: 'char', frames: [
    ...[0, 0.7, 1.4, 2.1].map(t => ['idle', () => sprKnight({ variant: 'red', atk: -1, moving: false, walk: 0 }, t)]),
    ...[0, 1, 2, 3, 4, 5].map(i => ['walk', () => sprKnight({ variant: 'red', atk: -1, moving: true, walk: i * Math.PI / 3 }, 0)]),
    ...[0, 120, 165, 215, 300, 400].map(a => ['atk', () => sprKnight({ variant: 'red', atk: a, moving: false, walk: 0 }, 0)]),
    ['blue', () => sprKnight({ variant: 'blue', atk: -1, moving: false, walk: 0 }, 0)],
  ] },
  { name: 'skeleton', lut: 'env', frames: [0, 0.3, 0.6, 0.9, 1.2, 1.5].map(t => ['idle', () => sprSkeleton({ seed: 0 }, t)]) },
  { name: 'hound', lut: 'env', frames: [0, 0.4, 0.8, 1.2, 1.6, 2.0].map(t => ['idle', () => sprHound({ seed: 2.1 }, t)]) },
  { name: 'spider', lut: 'env', frames: [0, 0.3, 0.6, 0.9, 1.2, 1.5].map(t => ['idle', () => sprSpider({ seed: 4.2 }, t)]) },
  { name: 'props', lut: 'env', frames: [['barrel', () => sprBarrel()], ['bones', () => sprBones(3)], ['torch', () => sprTorch()], ['brazier', () => sprBrazier()]] },
]`;

// --- code evaluated inside the page -------------------------------------------------------
function pageRender(castSrc, mode, blind) {
  const cast = eval(castSrc);
  const Z = 4;
  const rgb = i => [PR[i], PG[i], PB[i]];
  // lit color for one sprite pixel at a torch band, exactly as the game's lighting pass does it
  const lit = (v, lb, lut) => {
    if (v & EMIS) return rgb(v & 127);
    if (v === BLK) return rgb(BLK);
    const r = PR[v] * (AMB[0] + lb * TINT[0]), g = PG[v] * (AMB[1] + lb * TINT[1]), b = PB[v] * (AMB[2] + lb * TINT[2]);
    const L = lut === 'char' ? LUT_CHAR : LUT_ENV;
    return rgb(L[(((r > 255 ? 255 : r) >> 3) << 10) | (((g > 255 ? 255 : g) >> 3) << 5) | ((b > 255 ? 255 : b) >> 3)]);
  };
  const floorAt = (x, y) => floorBuf[(WY0 + 150 + (y % 60)) * WW + (WX0 + 40 + (x % 90))];

  // ---- lint metrics on built sprite data (pipeline-agnostic) ----
  const RAMPS = [S, FIRE, RED, BONE, STEEL, WOOD, [37, 38, 39, 40], [41, 42, 43], [44, 45, 46, 47], [48, 49, 50, 51]];
  const rampOf = new Int8Array(64).fill(-1);
  RAMPS.forEach((r, n) => r.forEach(i => { if (rampOf[i] < 0) rampOf[i] = n; }));
  const lab = i => {   // OKLab
    const f = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    const [r, g, b] = [f(PR[i]), f(PG[i]), f(PB[i])];
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
  };
  function lint(sp) {
    const { w, h, data } = sp, at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : data[y * w + x];
    let opaque = 0, noise = 0, doubles = 0, innerBlack = 0, lowPairs = 0, pairs = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = at(x, y); if (!v) continue; opaque++;
      if (v === BLK) {
        if (at(x - 1, y) && at(x + 1, y) && at(x, y - 1) && at(x, y + 1) && at(x - 1, y) !== BLK && at(x + 1, y) !== BLK && at(x, y - 1) !== BLK && at(x, y + 1) !== BLK) innerBlack++;
        continue;
      }
      if (!(v & EMIS)) {
        let same = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && at(x + dx, y + dy) === v) same++;
        if (!same) noise++;
      }
      for (const [qx, qy] of [[x + 1, y], [x, y + 1]]) {
        const q = at(qx, qy); if (!q || q === BLK || q === v) continue;
        const a = lab(v & 127), b = lab(q & 127); pairs++;
        if (Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 0.03) lowPairs++;
      }
    }
    for (let y = 0; y < h - 1; y++) for (let x = 0; x < w - 1; x++) {
      const c = [at(x, y), at(x + 1, y), at(x, y + 1), at(x + 1, y + 1)].filter(v => v === BLK).length;
      if (c === 3 && [at(x, y), at(x + 1, y), at(x, y + 1), at(x + 1, y + 1)].includes(0)) doubles++;
    }
    // regions = 4-connected pixels of one color ramp; measure flat interiors and light direction
    const reg = new Int32Array(w * h).fill(-1); let flatW = 0, flatN = 0, dirW = 0, dirN = 0;
    for (let k0 = 0; k0 < w * h; k0++) {
      const v0 = data[k0]; if (!v0 || v0 === BLK || (v0 & EMIS) || reg[k0] >= 0) continue;
      const rr = rampOf[v0 & 127], px = [], st = [k0]; reg[k0] = k0;
      while (st.length) {
        const k = st.pop(); px.push(k); const x = k % w, y = (k / w) | 0;
        for (const [qx, qy] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
          const q = qy * w + qx, v = at(qx, qy);
          if (v && v !== BLK && !(v & EMIS) && reg[q] < 0 && rampOf[v & 127] === rr) { reg[q] = k0; st.push(q); }
        }
      }
      if (px.length < 16) continue;
      // distance to region edge (cheap: 2 rings), interior = 2+ px from any non-region neighbor
      const inner = px.filter(k => { const x = k % w, y = (k / w) | 0;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const q = (y + dy) * w + x + dx; if (reg[q] !== k0) return false; } return true; });
      if (inner.length >= 4) {
        const cnt = {}; inner.forEach(k => cnt[data[k]] = (cnt[data[k]] || 0) + 1);
        const mode = Math.max(...Object.values(cnt));
        flatW += inner.length; flatN += inner.length - mode;
      }
      // correlation of luminance with -(x+y): positive = lit from the upper left
      const L = px.map(k => lum(data[k] & 127)), P = px.map(k => -((k % w) + ((k / w) | 0)));
      const mL = L.reduce((a, b) => a + b) / L.length, mP = P.reduce((a, b) => a + b) / P.length;
      let c = 0, vl = 0, vp = 0; for (let i = 0; i < L.length; i++) { c += (L[i] - mL) * (P[i] - mP); vl += (L[i] - mL) ** 2; vp += (P[i] - mP) ** 2; }
      if (vl > 0 && vp > 0) { dirW += px.length; dirN += px.length * c / Math.sqrt(vl * vp); }
    }
    return {
      interiorVariation: flatW ? +(flatN / flatW).toFixed(3) : null,   // ~0 = flat/pillow interiors
      lightDirection: dirW ? +(dirN / dirW).toFixed(3) : null,          // >0 = consistent upper-left light
      noisePct: +(100 * noise / opaque).toFixed(2),
      outlineDoubles: doubles,
      blackInside: innerBlack,
      lowContrastPairsPct: pairs ? +(100 * lowPairs / pairs).toFixed(2) : 0,
    };
  }

  // ---- contact sheet ----
  function sheet(entry) {
    const sprites = entry.frames.map(([label, f]) => ({ label, sp: f() }));
    const cw = Math.max(...sprites.map(s => s.sp.w)), chh = Math.max(...sprites.map(s => s.sp.h));
    const BANDS3 = [0.4, 0.8, 1.4];
    const cols = Math.max(sprites.length, 6);
    const W = cols * cw * Z + 16, H = chh * Z * 2 + chh * Z + chh * 2 + chh * Z + 80;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'); g.fillStyle = '#100c09'; g.fillRect(0, 0, W, H);
    g.font = '14px monospace'; g.fillStyle = '#b09574';
    const put = (x, y, col, z) => { g.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`; g.fillRect(x, y, z, z); };
    const draw = (sp, ox, oy, z, fn, flip = false) => {
      for (let y = 0; y < sp.h; y++) for (let x = 0; x < sp.w; x++) {
        const v = sp.data[y * sp.w + (flip ? sp.w - 1 - x : x)]; const col = fn(v, x, y);
        if (col) put(ox + x * z, oy + y * z, col, z);
      }
    };
    let y0 = 4;
    g.fillText(`${entry.name}${blind ? '' : `  [${mode}]`}  row 1: frames 4x unlit`, 8, y0 + 12); y0 += 18;
    sprites.forEach((s, i) => { draw(s.sp, 8 + i * cw * Z, y0, Z, v => v ? rgb(v & 127) : null); g.fillStyle = '#7f6a53'; g.fillText(s.label, 10 + i * cw * Z, y0 + 12); });
    y0 += chh * Z + 4;
    g.fillStyle = '#b09574'; g.fillText('row 2: frame 1 on floor at dark / mid / bright torch bands, then mirrored', 8, y0 + 12); y0 += 18;
    const s0 = sprites[0].sp;
    [...BANDS3.map(b => [b, false]), ...BANDS3.map(b => [b, true])].forEach(([b, flip], i) => {
      const ox = 8 + i * cw * Z;
      draw({ ...s0, data: new Uint8Array(s0.w * s0.h).fill(9) }, ox, y0, Z, (v, x, y) => lit(floorAt(x, y), b, 'env'));
      draw(s0, ox, y0, Z, v => v ? lit(v, b, entry.lut) : null, flip);
    });
    y0 += chh * Z + 4;
    g.fillStyle = '#b09574'; g.fillText('row 3: 1x actual size (at mid band)', 8, y0 + 12); y0 += 18;
    sprites.forEach((s, i) => draw(s.sp, 8 + i * (cw + 4), y0, 1, v => v ? lit(v, 0.8, entry.lut) : null));
    y0 += chh + 8;
    g.fillStyle = '#b09574'; g.fillText('row 4: silhouettes', 8, y0 + 12); y0 += 18;
    g.fillStyle = '#cbb08a'; g.fillRect(8, y0, sprites.length * cw * Z, chh * Z);
    sprites.forEach((s, i) => draw(s.sp, 8 + i * cw * Z, y0, Z, v => v ? [10, 7, 6] : null));
    // cell/rowsH let the A/B tool crop the first frames and the lit-band row
    return { url: c.toDataURL(), lint: lint(sprites[0].sp), cell: cw * Z, rowsH: 44 + 2 * chh * Z + 4 };
  }
  return cast.map(e => ({ name: e.name, ...sheet(e) }));
}

async function render(shade, blind = false) {
  const b = await chromium.launch();
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + PAGE + '?shade=' + shade);
  await p.waitForTimeout(400);
  const res = await p.evaluate(`(${pageRender.toString()})(${JSON.stringify(CAST)}, ${JSON.stringify(shade)}, ${blind})`);
  await b.close();
  if (errs.length) throw new Error('page errors: ' + errs.join('\n'));
  return res;
}

function printLint(rows, shade) {
  console.log(`\nlint (${shade} shading, first frame of each):`);
  console.table(Object.fromEntries(rows.map(r => [r.name, r.lint])));
}

(async () => {
  if (cmd === 'sheet' || cmd === 'lint') {
    const shade = opt('shade', 'form');
    const rows = await render(shade);
    if (cmd === 'sheet') {
      fs.mkdirSync(OUT, { recursive: true });
      for (const r of rows) fs.writeFileSync(path.join(OUT, `${r.name}-${shade}.png`), Buffer.from(r.url.split(',')[1], 'base64'));
      fs.writeFileSync(path.join(OUT, `lint-${shade}.json`), JSON.stringify(Object.fromEntries(rows.map(r => [r.name, r.lint])), null, 2));
      console.log('sheets written to', OUT);
    }
    printLint(rows, shade);
  } else if (cmd === 'ab') {
    // Blind A/B: for each character, the edge and form versions in random left/right order.
    const [edge, form] = [await render('edge', true), await render('form', true)];
    const b = await chromium.launch(); const p = await b.newPage();
    const key = {};
    const pairs = edge.filter(r => r.name !== 'props').map((r, i) => {
      const flip = Math.random() < 0.5; key[r.name] = flip ? { A: 'form', B: 'edge' } : { A: 'edge', B: 'form' };
      return { name: r.name, A: flip ? form[i].url : r.url, B: flip ? r.url : form[i].url, cropW: 8 + 3 * r.cell, cropH: r.rowsH };
    });
    // per character: first 3 frames (unlit) and the dark/mid/bright lit cells, A beside B
    const url = await p.evaluate(async (pairs) => {
      const load = u => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.src = u; });
      const ims = []; for (const q of pairs) ims.push([q, await load(q.A), await load(q.B)]);
      const W = Math.max(...pairs.map(q => q.cropW)) * 2 + 40, H = pairs.reduce((s, q) => s + q.cropH + 40, 0);
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.font = 'bold 26px monospace';
      let y = 0;
      for (const [q, a, b] of ims) {
        g.fillStyle = '#fff'; g.fillText(`${q.name}   A`, 8, y + 28); g.fillText('B', q.cropW + 40, y + 28); y += 36;
        // skip the sheet's own header line (first 18px) so no label leaks
        g.drawImage(a, 0, 18, q.cropW, q.cropH - 18, 0, y, q.cropW, q.cropH - 18);
        g.drawImage(b, 0, 18, q.cropW, q.cropH - 18, q.cropW + 32, y, q.cropW, q.cropH - 18);
        y += q.cropH - 14;
      }
      return c.toDataURL();
    }, pairs);
    await b.close();
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, 'ab-blind.png'), Buffer.from(url.split(',')[1], 'base64'));
    fs.writeFileSync(path.join(OUT, 'ab-key.json'), JSON.stringify(key, null, 2));
    console.log('blind sheet:', path.join(OUT, 'ab-blind.png'), '(answer key in ab-key.json, do not peek)');
  }
})().catch(e => { console.error(e); process.exit(1); });
