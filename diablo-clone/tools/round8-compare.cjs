const { chromium } = require('playwright'); const fs = require('fs');
const SP = '/tmp/claude-0/-home-user/c1d85234-6456-50ed-a4a7-163440b022eb/scratchpad', OUT = '/home/user/indie-games/diablo-clone/art-review/round8';
const REF = '/home/user/indie-games/diablo-clone/art/refs/';
const PLATE = "{team:'red',helm:'great',chest:'plate',weapon:'sword',shield:'none'}";
const CAST = `[["knight", () => getSprite('hero', ${PLATE}, 1, 'idle', 0)], ["skeleton", () => getSprite('skeleton', MONSTERS.skeleton.look, 1, 'idle', 0)], ["hound", () => getSprite('hound', MONSTERS.hound.look, 0, 'idle', 0)], ["torch", () => PROPS.torch('R')], ["barrel", () => PROPS.barrel()]]`;
const grab = `(${CAST}).map(([n, f]) => { const sp = f(); return { n, w: sp.w, h: sp.h, px: Array.from(sp.data, v => { if (!v) return null; const i = (v & 128) ? v & 127 : LTAB[4][v]; return [PR[i], PG[i], PB[i]]; }) }; })`;
const enc = s => ({ w: s.w, h: s.h, px: Array.from(s.data, v => { if (!v) return null; const i = (v & 128) ? v & 127 : LTAB[4][v]; return [PR[i], PG[i], PB[i]]; }) });
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + SP + '/before-game/sheet.html'); const A = await p.evaluate(grab);
  await p.goto('file:///home/user/indie-games/diablo-clone/game/sheet.html'); const B = await p.evaluate(grab);
  // blind A/B for the plate edge light: same knight with and without it
  const ab = await p.evaluate(`(() => { const out = []; for (const d of [1, 2, 0]) { const eq = ${PLATE}; const st = { clip: 'idle', f: 0 };
      const on = renderRig(heroRig(eq, st), yawOf(d), 72, 72, 36, 60); const r2 = heroRig(eq, st); r2.noEdge = true; const off = renderRig(r2, yawOf(d), 72, 72, 36, 60);
      out.push([on, off].map(s => ({ w: s.w, h: s.h, px: Array.from(s.data, v => { if (!v) return null; const i = (v & 128) ? v & 127 : LTAB[4][v]; return [PR[i], PG[i], PB[i]]; }) }))); } return out; })()`);
  const mocks = {}; for (const n of ['knight', 'skeleton', 'bonehound', 'torch', 'barrel']) mocks[n === 'bonehound' ? 'hound' : n] = 'data:image/png;base64,' + fs.readFileSync(REF + 'mock-' + n + '.png').toString('base64');
  const key = ab.map(() => Math.random() < 0.5 ? 'A=edge B=plain' : 'A=plain B=edge');
  const [sheet, blind] = await p.evaluate(async ({ A, B, ab, key, mocks }) => {
    const load = u => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = u; });
    const drawSp = (g, s, ox, oy, Z) => { for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) { const v = s.px[y * s.w + x]; if (!v) continue; g.fillStyle = `rgb(${v})`; g.fillRect(ox + x * Z, oy + y * Z, Z, Z); } };
    const cell = 300, c = document.createElement('canvas'); c.width = 130 + 3 * (cell + 16); c.height = 50 + A.length * (cell + 16);
    const g = c.getContext('2d'); g.fillStyle = '#100c09'; g.fillRect(0, 0, c.width, c.height); g.imageSmoothingEnabled = false;
    g.fillStyle = '#fff'; g.font = 'bold 20px monospace'; ['MOCK-UP', 'BEFORE (played)', 'AFTER'].forEach((t, i) => g.fillText(t, 130 + i * (cell + 16), 30));
    for (let r = 0; r < A.length; r++) {
      const y0 = 44 + r * (cell + 16), n = A[r].n;
      g.fillStyle = '#b09574'; g.font = '18px monospace'; g.fillText(n, 10, y0 + cell / 2);
      const im = await load(mocks[n]); const cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height; const cg = cv.getContext('2d'); cg.drawImage(im, 0, 0);
      const d = cg.getImageData(0, 0, im.width, im.height).data; let a = 1e9, bb = 1e9, cc = -1, dd = -1;
      for (let yy = 0; yy < im.height; yy++) for (let xx = 0; xx < im.width; xx++) { const k = (yy * im.width + xx) * 4; if (d[k] + d[k + 1] + d[k + 2] > 60) { a = Math.min(a, xx); cc = Math.max(cc, xx); bb = Math.min(bb, yy); dd = Math.max(dd, yy); } }
      const sc = Math.min(cell / (cc - a + 1), cell / (dd - bb + 1));
      g.drawImage(im, a, bb, cc - a + 1, dd - bb + 1, 130 + (cell - (cc - a + 1) * sc) / 2, y0 + (cell - (dd - bb + 1) * sc) / 2, (cc - a + 1) * sc, (dd - bb + 1) * sc);
      const Zr = Math.floor(Math.min(cell / Math.max(A[r].w, B[r].w), cell / Math.max(A[r].h, B[r].h)));   // one zoom per row
      [A[r], B[r]].forEach((s, i) => { const Z = Zr; drawSp(g, s, 130 + (i + 1) * (cell + 16) + (cell - s.w * Z) / 2, y0 + (cell - s.h * Z) / 2, Z); });
    }
    const c2 = document.createElement('canvas'); c2.width = 2 * 72 * 4 + 160; c2.height = 60 + ab.length * (72 * 4 + 10);
    const g2 = c2.getContext('2d'); g2.fillStyle = '#100c09'; g2.fillRect(0, 0, c2.width, c2.height);
    g2.fillStyle = '#fff'; g2.font = 'bold 20px monospace'; g2.fillText('Plate armor: which reads better, A or B?', 10, 28);
    ab.forEach(([on, off], i) => { const [L, R] = key[i].startsWith('A=edge') ? [on, off] : [off, on]; const y0 = 50 + i * (72 * 4 + 10);
      g2.fillText((i + 1) + '  A', 10, y0 + 30); g2.fillText('B', 80 + 72 * 4 + 10, y0 + 30); drawSp(g2, L, 60, y0, 4); drawSp(g2, R, 80 + 72 * 4 + 40, y0, 4); });
    return [c.toDataURL(), c2.toDataURL()];
  }, { A, B, ab, key, mocks });
  fs.writeFileSync(OUT + '/mockups-before-after.png', Buffer.from(sheet.split(',')[1], 'base64'));
  fs.writeFileSync(OUT + '/plate-edge-blind.png', Buffer.from(blind.split(',')[1], 'base64'));
  fs.writeFileSync(OUT + '/plate-edge-key.b64.txt', Buffer.from(JSON.stringify(key)).toString('base64') + '\n');
  console.log('ok'); await b.close();
})();
