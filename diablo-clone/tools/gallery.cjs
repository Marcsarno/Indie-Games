// layout gallery (round 26): 24 seeds of one level as top-down maps in one PNG. Floor grey, walls
// dark, props brown, reserved tiles teal, critical-path rooms lighter, start green, stairs gold,
// monsters red (champions magenta), chests yellow. node tools/gallery.cjs <level> <out.png> [n=24]
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => {
  const [lv, out, n] = [+process.argv[2] || 3, process.argv[3] || 'gallery.png', +(process.argv[4] || 24)];
  const b = await chromium.launch(); const p = await b.newPage();
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + path.resolve(__dirname, '../game/index.html'));
  const url = await p.evaluate(([lv, n]) => {
    newHero('warrior'); const Z = 4, cols = 6, c = document.createElement('canvas');
    genLevel(lv, 1); const cw = MW * Z + 6, ch = MH * Z + 6; c.width = cols * cw; c.height = Math.ceil(n / cols) * ch;
    const g = c.getContext('2d'); g.fillStyle = '#111'; g.fillRect(0, 0, c.width, c.height);
    for (let s = 0; s < n; s++) {
      genLevel(lv, (s * 2654435761 + lv * 97) >>> 0);
      const ox = (s % cols) * cw + 3, oy = Math.floor(s / cols) * ch + 3;
      for (let j = 0; j < MH; j++) for (let i = 0; i < MW; i++) {
        const k = tIdx(i, j), t = LV.map[k];
        if (t !== FLOOR && t !== WALL) continue;
        const rm = LV.roomOf[k] >= 0 ? LV.rooms[LV.roomOf[k]] : null;
        g.fillStyle = t === WALL ? '#3a3430' : LV.solid[k] ? '#7a5a3a' : LV.reserve && LV.reserve[k] ? '#3f6e6a' : rm && rm.crit ? '#9a948c' : '#6c6862';
        g.fillRect(ox + i * Z, oy + j * Z, Z, Z);
      }
      const dot = (fi, fj, col, r = 2) => { g.fillStyle = col; g.fillRect(ox + fi * Z - r, oy + fj * Z - r, r * 2, r * 2); };
      for (const d of LV.decor) if (d.kind === 'chest') dot(d.i + 0.5, d.j + 0.5, '#ffe04a', 3);
      for (const sp of LV.spawns) dot(sp.fi, sp.fj, sp.champ ? '#ff3cff' : '#e03a2a', sp.champ ? 3 : 1.5);
      dot(LV.start.cx + 0.5, LV.start.cy + 0.5, '#3cff6a', 4); dot(LV.stairs.i + 0.5, LV.stairs.j + 0.5, '#ffb000', 4);
    }
    return c.toDataURL();
  }, [lv, n]);
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64')); console.log('wrote', out); await b.close();
})();
