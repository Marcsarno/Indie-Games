// enemy behaviors in the game, four scenes back to back: node behavecap.cjs <gameDir> <out.json>
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [dir, out] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + dir + '/index.html');
  const res = await p.evaluate(() => {
    Math.random = (() => { let s = 21; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    newHero(); G.mode = 'play'; const fr = [], labels = [];
    function arena(lv, seed) {
      startLevel(lv, seed);
      let best = null, bs = -1;
      for (let i = 4; i < MW - 4; i++) for (let j = 4; j < MH - 4; j++) { let n = 0; for (let a = -5; a <= 5; a++) for (let c = -5; c <= 5; c++) if (!blocked(i + a + 0.5, j + c + 0.5)) n++; if (n > bs) { bs = n; best = [i + 0.5, j + 0.5]; } }
      enemies.length = 0; hero.fi = best[0]; hero.fj = best[1]; hero.hp = STAT.maxHp = 9999;
    }
    function lane() { for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { let ok = true; for (let s = 0; s <= 6; s += 0.25) for (const w of [-1.8, 0, 1.8]) if (blocked(hero.fi + a * s - b * w, hero.fj + b * s + a * w)) ok = false; if (ok) return [a, b]; } return [1, 0]; }
    const spawn = (id, di, dj) => { const e = makeEnemy(id, hero.fi + di, hero.fj + dj, enemies.length + 50); e.state = 'hunt'; e.def = Object.assign({}, e.def, { dmg: [0, 0] }); enemies.push(e); return e; };
    const step = (n, label, cb) => { step.k = 0; return step2(n, label, cb); }; const step2 = (n, label, cb) => { for (let k = 0; k < n; k++) { cb && cb(k); update(1 / 60); warmStep(30); if (k % 2 === 0) { render(); fr.push(cvs.toDataURL()); labels.push(label); } } };
    const warm = () => { for (let i = 0; i < 500; i++) warmStep(50); };
    // 1. boar charge, sidestep
    arena(3, 777); let L = lane(); const bo = spawn('boar', L[0] * 4.2, L[1] * 4.2); warm(); let side = false;
    let sideK = 0;   // when the warning line is up, run sideways (perpendicular to the lane) for a quarter second
    step(80, 'BOAR CHARGE: SIDESTEP', () => { if (bo.windT > 0 && bo.windT < 0.3) side = true; const go = side && sideK++ < 18; if (go) { const gi = -L[1], gj = L[0]; input.mx = (gi - gj) * 0.7; input.my = (gi + gj) * 0.7; } else { input.mx = input.my = 0; } }); input.mx = input.my = 0;
    // 2. shield skeleton, warrior attacks from the front
    arena(3, 777); const sk = spawn('skeleton', 1.0, -1.0); sk.hp = sk.maxHp = 80; warm();
    step(90, 'SHIELD: BLOCK, BLOCK, GUARD BROKEN', k => { input.attack = true; }); input.attack = false;
    // 3. archer backing off
    arena(3, 777); const ar = spawn('archer', 1.4, -1.4); warm();
    step(70, 'ARCHER KEEPS HIS DISTANCE', k => { input.mx = k < 50 ? 0.7 : 0; input.my = k < 50 ? -0.2 : 0; }); input.mx = input.my = 0;
    // 4. pack fanning out
    arena(3, 777); for (let k = 0; k < 5; k++) spawn('fallen', 4.5 + (k % 2) * 0.5, -1 + k * 0.5); warm();
    step(90, 'PACK SURROUNDS');
    return { fr, labels };
  });
  fs.writeFileSync(out, JSON.stringify(res)); if (errs.length) console.log('ERR', errs.join('\n'));
  await b.close();
})();
