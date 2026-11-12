// round 103: the new dungeon pieces in the game: stairs down on each back wall, the way out, the vault gate, the shrine
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => { const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve('game/index.html') + '?cine=0');
  const r = await p.evaluate(() => { const log = [], shots = [];
    allocBuffers(270, 480); G.mode = 'title'; beginGame(false, 'warrior'); G.actCard = 0; window.drawHud = () => {};
    const snap = (name, fi, fj) => { hero.fi = fi; hero.fj = fj; for (let k = 0; k < 20; k++) update(1 / 60); enemies.length = 0; for (let i = 0; i < 500; i++) warmStep(40); render(); warmStep(1e4); render(); shots.push([name, cvs.toDataURL()]); };
    const want = { i: null, j: null };
    for (let n = 0; n < 60 && (!want.i || !want.j); n++) { const seed = n * 7717; G.story = { f: {}, n: 0 }; startLevel(3, seed); if (LV.vault && LV.shrine && !want[LV.stairs.face]) want[LV.stairs.face] = seed; }
    for (const f of ['i', 'j']) { if (want[f] === null) continue; startLevel(3, want[f]); G.actCard = 0; const S = LV.stairs; log.push('face ' + f + ' seed ' + want[f]);
      snap('a-stairs-' + f, S.i + 0.5 + (f === 'i' ? 3 : 1.5), S.j + 0.5 + (f === 'j' ? 3 : 1.5));
      if (f === 'i') { const g = LV.vault.gate[1] || LV.vault.gate[0]; const r0 = LV.rooms[LV.vault.room], dx = g[0] < r0.x ? -1.6 : g[0] >= r0.x + r0.w ? 1.6 : 0, dy = g[1] < r0.y ? -1.6 : g[1] >= r0.y + r0.h ? 1.6 : 0; snap('b-vault-gate', g[0] + 0.5 + dx, g[1] + 0.5 + dy);
        LV.hasKey = true; unlockVault(); snap('c-vault-open', g[0] + 0.5 - dx * 0.5, g[1] + 0.5 - dy * 0.5);
        snap('d-shrine', LV.shrine.i + 0.5 + 1.6, LV.shrine.j + 0.5 + 1.6); } }
    // a side area's way out
    for (let n = 0; n < 5; n++) { startLevel(1, 77 + n, 'barrow'); G.actCard = 0; const S = LV.stairs; log.push('barrow up face ' + S.face); snap('e-up-' + n + '-' + S.face, S.i + 0.5 + (S.face === 'i' ? 2.6 : 1.4), S.j + 0.5 + (S.face === 'j' ? 2.6 : 1.4)); if (n >= 2) break; }
    return { log, shots }; });
  for (const [n, u] of r.shots) fs.writeFileSync(`${out}/${n}.png`, Buffer.from(u.split(',')[1], 'base64'));
  console.log(r.log.join('\n')); console.log(errs.length ? 'PAGE ERR ' + errs.join('\n') : 'no page errors'); await b.close(); })();
