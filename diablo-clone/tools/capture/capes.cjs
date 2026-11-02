const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file:///home/user/indie-games/diablo-clone/game/sheet.html');
  const url = await p.evaluate(() => {
    const look = { team: 'red', helm: 'none', chest: 'tunic', weapon: 'sword', shield: 'none' };
    const mats = [M.LEATHER, M.CLOTH_GREEN, M.CLOTH_BLUE], poses = [[5, 'idle', 0], [7, 'walk', 2], [2, 'walk', 5], [7, 'attack', 3]];
    const Z = 4, cw = 50 * Z, ch = 56 * Z, c = document.createElement('canvas'); c.width = poses.length * cw; c.height = mats.length * ch; const g = c.getContext('2d'); g.fillStyle = '#6f8545'; g.fillRect(0, 0, c.width, c.height);
    mats.forEach((m, r) => { CAPE_M = m; poses.forEach(([d, clip, f], i) => { const sp = renderRig(FAMILIES.hero.rig(look, poseState('hero', { look }, clip, f)), yawOf(d), 72, 72, 36, 60); for (let y = 0; y < sp.h; y++) for (let x = 0; x < sp.w; x++) { const v = sp.data[y * sp.w + x]; if (!v) continue; const k = (v & 128) ? v & 127 : LTAB[3][v]; g.fillStyle = `rgb(${PR[k]},${PG[k]},${PB[k]})`; g.fillRect(i * cw + (x - 11) * Z, r * ch + (y - 10) * Z, Z, Z); } }); });
    return c.toDataURL();
  });
  fs.writeFileSync('capes.png', Buffer.from(url.split(',')[1], 'base64')); await b.close();
})();
