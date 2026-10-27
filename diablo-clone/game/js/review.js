'use strict';
// Review sheets for the art loop (loaded by sheet.html only, never by the game).
const SPR = { hero: { w: 72, h: 72, ax: 36, ay: 60 } };
function heroSprite(eq, clip, f, dir) {
  const sw = weaponSwing(eq);
  const st = { clip, f };
  if (clip === 'attack') { st.key = sw[f]; st.prev = sw[f - 1]; }
  const c = SPR.hero;
  return renderRig(heroRig(eq, st), yawOf(dir), c.w, c.h, c.ax, c.ay);
}
const EQ0 = { team: 'red', helm: 'great', chest: 'plate', weapon: 'sword', shield: 'kite' };
const monSprite = (id, clip, f, d) => { const m = MONSTERS[id]; return getSprite(m.family, m.look, d, clip, f, { look: m.look }); };
window.SHEET_CAST = fam => {
  if (MONSTERS[fam]) {
    const m = MONSTERS[fam], sw = FAMILIES[m.family].swing({ look: m.look }), atk = m.ranged === 'arrow' ? 'shoot' : m.ranged ? 'cast' : 'attack';
    return [
      { label: fam + ': 8 directions, idle', sprites: [...Array(8).keys()].map(d => ({ label: 'd' + d, sp: monSprite(fam, 'idle', 0, d) })) },
      { label: 'walk, d1', sprites: [...Array(8).keys()].map(f => ({ label: 'w' + f, sp: monSprite(fam, 'walk', f, 1) })) },
      { label: 'walk, d7', sprites: [...Array(8).keys()].map(f => ({ label: 'w' + f, sp: monSprite(fam, 'walk', f, 7) })) },
      { label: atk + ', d0', sprites: sw.map((k, f) => ({ label: 'a' + f, sp: monSprite(fam, atk, f, 0) })) },
      { label: 'hit + death, d1', sprites: [{ label: 'hit', sp: monSprite(fam, 'hit', 0, 1) }, ...[...Array(6).keys()].map(f => ({ label: 'x' + f, sp: monSprite(fam, 'death', f, 1) }))] },
    ];
  }
  if (fam === 'hero') {
    const rows = [];
    rows.push({ label: '8 directions, idle (d0..d7)', sprites: [...Array(8).keys()].map(d => ({ label: 'd' + d, sp: heroSprite(EQ0, 'idle', 0, d) })) });
    rows.push({ label: 'walk, d1 (front)', sprites: [...Array(8).keys()].map(f => ({ label: 'w' + f, sp: heroSprite(EQ0, 'walk', f, 1) })) });
    rows.push({ label: 'attack keys, d0', sprites: [...Array(6).keys()].map(f => ({ label: 'a' + f, sp: heroSprite(EQ0, 'attack', f, 0) })) });
    rows.push({ label: 'attack keys, d2', sprites: [...Array(6).keys()].map(f => ({ label: 'a' + f, sp: heroSprite(EQ0, 'attack', f, 2) })) });
    rows.push({ label: 'death, d1', sprites: [...Array(6).keys()].map(f => ({ label: 'x' + f, sp: heroSprite(EQ0, 'death', f, 1) })) });
    const looks = [
      { team: 'blue', helm: 'horned', chest: 'chain', weapon: 'axe', shield: 'buckler' },
      { team: 'red', helm: 'none', chest: 'tunic', weapon: 'sword', shield: 'none' },
      { team: 'blue', helm: 'cap', chest: 'chain', weapon: 'mace', shield: 'kite' },
      { team: 'red', helm: 'great', chest: 'chain', weapon: 'axe', shield: 'none' },
    ];
    rows.push({ label: 'gear looks, d1 / d3', sprites: looks.flatMap((e, i) => [{ label: 'g' + i, sp: heroSprite(e, 'idle', 0, 1) }, { label: 'g' + i + 'b', sp: heroSprite(e, 'idle', 0, 3) }]) });
    return rows;
  }
  if (typeof window.EXTRA_CAST === 'function') return window.EXTRA_CAST(fam);
  return null;
};

const rampOf = new Int8Array(NPAL).fill(-1);
PAL_RAMPS.forEach((r, n) => r.forEach(i => { if (rampOf[i] < 0) rampOf[i] = n; }));
function lintSprite(sp) {
  const { w, h, data } = sp, at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : data[y * w + x];
  let opaque = 0, noise = 0, innerBlack = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = at(x, y); if (!v) continue; opaque++;
    if (v === BLK) { if ([at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)].every(q => q && q !== BLK)) innerBlack++; continue; }
    if (!(v & EMIS)) { let same = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && at(x + dx, y + dy) === v) same++; if (!same) noise++; }
  }
  // light direction: correlation of luminance with -(x+y) within same-ramp regions
  const reg = new Int32Array(w * h).fill(-1); let dirW = 0, dirN = 0;
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
    const L = px.map(k => lum(data[k] & 127)), P = px.map(k => -((k % w) + ((k / w) | 0)));
    const mL = L.reduce((a, b) => a + b) / L.length, mP = P.reduce((a, b) => a + b) / P.length;
    let c = 0, vl = 0, vp = 0; for (let i = 0; i < L.length; i++) { c += (L[i] - mL) * (P[i] - mP); vl += (L[i] - mL) ** 2; vp += (P[i] - mP) ** 2; }
    if (vl > 0 && vp > 0) { dirW += px.length; dirN += px.length * c / Math.sqrt(vl * vp); }
  }
  return { lightDirection: dirW ? +(dirN / dirW).toFixed(3) : null, noisePct: +(100 * noise / opaque).toFixed(2), blackInside: innerBlack, px: opaque };
}

window.renderSheet = async (rows) => {
  const Z = 4, t0 = performance.now(); let count = 0;
  rows.forEach(r => count += r.sprites.length);
  const ms = ((performance.now() - t0) / count).toFixed(2);
  const all = rows.flatMap(r => r.sprites);
  const cw = Math.max(...all.map(s => s.sp.w)), chh = Math.max(...all.map(s => s.sp.h));
  const cols = Math.max(...rows.map(r => r.sprites.length));
  const first = rows[0].sprites;
  const W = cols * cw * Z + 16;
  const H = rows.length * (chh * Z + 22) + (chh * Z + 22) + (chh + 30) + (chh * 2 + 30) + 20;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); g.fillStyle = '#100c09'; g.fillRect(0, 0, W, H); g.font = '14px monospace';
  const rgb = i => `rgb(${PR[i]},${PG[i]},${PB[i]})`;
  const lit = (v, L) => (v & EMIS) ? rgb(v & 127) : rgb(LTAB[L][v]);
  const draw = (sp, ox, oy, z, fn) => { for (let y = 0; y < sp.h; y++) for (let x = 0; x < sp.w; x++) { const v = sp.data[y * sp.w + x]; const col = fn(v, x, y); if (col) { g.fillStyle = col; g.fillRect(ox + x * z, oy + y * z, z, z); } } };
  let y0 = 4;
  for (const r of rows) {
    g.fillStyle = '#b09574'; g.fillText(r.label, 8, y0 + 13); y0 += 18;
    r.sprites.forEach((s, i) => { const ox = 8 + i * cw * Z + (cw - s.sp.w) * Z / 2; draw(s.sp, ox, y0, Z, v => v ? rgb(v & 127) : null); });
    y0 += chh * Z + 4;
  }
  g.fillStyle = '#b09574'; g.fillText('first row on floor at light levels 1,2,3,4,5 (dithered floor), d0..d4', 8, y0 + 13); y0 += 18;
  [1, 2, 3, 4, 5, 6].forEach((L, i) => {
    const s = first[i % first.length].sp, ox = 8 + i * cw * Z;
    draw({ ...s, data: new Uint8Array(s.w * s.h).fill(1) }, ox, y0, Z, (v, x, y) => lit(S[3 + ((hash(x >> 2, y >> 1, 3) * 3) | 0)], L));
    draw(s, ox, y0, Z, v => v ? lit(v, L) : null);
  });
  y0 += chh * Z + 4;
  g.fillStyle = '#b09574'; g.fillText('1x, level 3', 8, y0 + 13); y0 += 18;
  all.slice(0, Math.floor((W - 16) / (cw * 0.7))).forEach((s, i) => draw(s.sp, 8 + i * Math.round(cw * 0.7), y0, 1, v => v ? lit(v, 3) : null));
  y0 += chh + 12;
  g.fillStyle = '#b09574'; g.fillText('silhouettes (2x)', 8, y0 + 13); y0 += 18;
  g.fillStyle = '#cbb08a'; g.fillRect(8, y0, W - 16, chh * 2);
  all.slice(0, Math.floor((W - 16) / (cw * 2))).forEach((s, i) => draw(s.sp, 8 + i * cw * 2, y0, 2, v => v ? '#0a0706' : null));
  const lint = {}; rows.forEach(r => { lint[r.label.slice(0, 24)] = lintSprite(r.sprites[0].sp); });
  return { url: c.toDataURL(), ms, lint };
};
