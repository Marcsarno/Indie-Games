// combat feel numbers, old (?feel=old) vs new: tap-to-hit time, held-attack cadence, knockback,
// flinches, freeze. node tools/feel-test.cjs [gameDir]
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const dir = path.resolve(process.argv[2] || path.join(__dirname, '../game'));
  const b = await chromium.launch();
  for (const q of ['?feel=old', '']) {
    const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e)));
    await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
    await p.goto('file://' + dir + '/index.html' + q);
    const r = await p.evaluate(() => {
      const out = {};
      for (const weapon of ['sword', 'axe']) {
        Math.random = (() => { let s = 5; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
        newHero(); G.mode = 'play'; startLevel(3, 777); if (weapon === 'axe') { hero.equip.weapon.base = 'war_axe'; } recalcHero();
        let best = null, bs = -1;
        for (let i = 2; i < 38; i++) for (let j = 2; j < 38; j++) { let n = 0; for (let a = -3; a <= 3; a++) for (let c = -3; c <= 3; c++) if (!blocked(i + a + 0.5, j + c + 0.5)) n++; if (n > bs) { bs = n; best = [i + 0.5, j + 0.5]; } }
        const sk = enemies.find(e => e.id === 'skeleton') || enemies[0]; enemies.length = 0; enemies.push(sk);
        hero.fi = best[0]; hero.fj = best[1]; sk.fi = best[0] + 0.9; sk.fj = best[1] - 0.9; sk.hp = sk.maxHp = 9999; sk.state = 'hunt'; sk.def = Object.assign({}, sk.def, { dmg: [0, 0] }); hero.hp = 9999;
        for (let i = 0; i < 30; i++) update(1 / 60);
        // one tap
        let t = 0, hit = -1, hp0 = sk.hp, kb0 = [sk.fi, sk.fj], flinch = 0, freeze = 0, push = 0; sk.def = Object.assign({}, sk.def, { speed: 0 });
        input.attack = true; update(1 / 60); input.attack = false; t += 1 / 60;
        for (let k = 0; k < 60; k++) { update(1 / 60); t += 1 / 60; if (hit < 0 && sk.hp < hp0) { hit = t; } if (sk.clip === 'hit') flinch++; if (hero.stop > 0) freeze++; push = Math.max(push, Math.hypot(sk.fi - kb0[0], sk.fj - kb0[1])); }
        // held for 3 s: swings and hits
        sk.fi = hero.fi + 0.9; sk.fj = hero.fj - 0.9; let swings = 0, hits = 0, last = -1; hp0 = sk.hp;
        input.attack = true;
        for (let k = 0; k < 180; k++) { const a0 = hero.atk; update(1 / 60); if (hero.atk >= 0 && (a0 < 0 || hero.atk < a0)) swings++; if (sk.hp < hp0) { hits++; hp0 = sk.hp; } }
        input.attack = false;
        // a tap during the wind-up is kept: tap, then tap again 80 ms later
        for (let k = 0; k < 60; k++) update(1 / 60);
        sk.fi = hero.fi + 0.9; sk.fj = hero.fj - 0.9; let s2 = 0;
        for (let k = 0; k < 50; k++) { if (k === 0 || k === 5) { input.attack = true; } const a0 = hero.atk; update(1 / 60); input.attack = false; if (hero.atk >= 0 && (a0 < 0 || hero.atk < a0)) s2++; }
        // tap, then push the stick from the moment the blow lands: how soon does he run?
        for (let k = 0; k < 60; k++) update(1 / 60);
        sk.fi = hero.fi + 0.9; sk.fj = hero.fj - 0.9; hp0 = sk.hp; let tt = 0, landed = -1, ran = -1; const f0 = [hero.fi, hero.fj];
        input.attack = true; update(1 / 60); input.attack = false;
        for (let k = 0; k < 60 && ran < 0; k++) { tt += 1 / 60; if (landed < 0 && sk.hp < hp0) { landed = tt; f0[0] = hero.fi; f0[1] = hero.fj; } if (landed >= 0) input.mx = -1; update(1 / 60); if (landed >= 0 && hero.atk < 0 && Math.hypot(hero.fi - f0[0], hero.fj - f0[1]) > 0.03) ran = tt; }
        input.mx = 0;
        out[weapon] = { runAfterHitMs: Math.round((ran - landed) * 1000), tapToHitMs: Math.round(hit * 1000), heroFreezeFrames: freeze, flinchFrames: flinch, pushTiles: +push.toFixed(2), swingsIn3s: swings, hitsIn3s: hits, twoTapsGiveSwings: s2 };
      }
      return out;
    });
    console.log(q || '(new)', JSON.stringify(r), errs.length ? 'ERR ' + errs.join('\n') : '');
    await p.close();
  }
  await b.close();
})();
