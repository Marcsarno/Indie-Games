// round 40a before/after: the same scripted moves in a game dir, cropped around the hero, 30 fps
// node tools/capture/heroclips.cjs <gameDir> <out.json>
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => { const [dir, out] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + path.resolve(dir, 'index.html'));
  const res = await p.evaluate(() => {
    Math.random = (() => { let s = 21; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    const clips = {};
    const crop = document.createElement('canvas'); crop.width = 300; crop.height = 260; const cg = crop.getContext('2d');
    function arena() {
      newHero('warrior'); hero.lvl = 10; recalcHero(); hero.hp = STAT.maxHp = 9999; hero.mana = STAT.maxMana = 999; G.mode = 'play'; startLevel(3, 777); enemies.length = 0;
      let best = null, bs = -1;
      for (let i = 4; i < MW - 4; i++) for (let j = 4; j < MH - 4; j++) { let n = 0; for (let a = -5; a <= 5; a++) for (let c = -5; c <= 5; c++) if (!blocked(i + a + 0.5, j + c + 0.5)) n++; if (n > bs) { bs = n; best = [i + 0.5, j + 0.5]; } }
      hero.fi = best[0]; hero.fj = best[1]; for (const k in CD) CD[k] = 0;
      const ci = Math.floor(hero.fi), cj = Math.floor(hero.fj); for (let j = cj - 11; j <= cj + 11; j++) for (let i = ci - 11; i <= ci + 11; i++) if (i > 0 && j > 0 && i < MW - 1 && j < MH - 1) { LV.map[tIdx(i, j)] = FLOOR; LV.solid[tIdx(i, j)] = 0; } computeFlow();
      hero.dir = 1; input.mx = input.my = 0; hero.stop = 0; G.msg = []; G.slowmo = 0; for (let k = 0; k < 4; k++) update(1 / 60);
    }
    const dummy = (di, dj, id = 'fallen') => { const e = makeEnemy(id, hero.fi + di, hero.fj + dj, enemies.length + 50); e.hp = e.maxHp = 9999; e.state = 'hunt'; e.cool = 999; e.def = Object.assign({}, e.def, { speed: 0, dmg: [0, 0] }); enemies.push(e); return e; };
    function rec(name, secs, script) {
      const fr = []; for (let i = 0; i < 200; i++) warmStep(30);
      for (let k = 0; k < secs * 60; k++) {
        script(k / 60); update(1 / 60);
        if (k % 2 === 0) { render(); warmStep(1e4); render(); cg.drawImage(cvs, 270 - 150, 395 - 175, 300, 260, 0, 0, 300, 260); fr.push(crop.toDataURL()); }
      }
      clips[name] = fr; input.mx = input.my = 0;
    }
    arena(); rec('run, turn back, stop', 2.2, t => { if (t < 0.9) { input.mx = 1; input.my = 0; } else if (t < 1.6) { input.mx = -1; input.my = 0; } else { input.mx = input.my = 0; } });
    arena(); dummy(1.4, 0.3); dummy(1.2, -0.6); rec('ground slam', 1.1, t => { if (t === 0) { hero.dir = dirFrom(1, 0); groundSlam(); } });
    arena(); dummy(4.5, 0); rec('chain hook', 1.3, t => { if (t === 0) chainHook(); });
    arena(); dummy(1.2, 0.5); dummy(-1, 0.8); rec('whirlwind', 1.2, t => { if (t === 0) { hero.whirl = 0.8; hero.whirlTick = 0; hero.devilT = 0.1; } });
    arena(); dummy(4.5, -1); rec('leap', 1.3, t => { if (t === 0) startLeap(); });
    arena(); rec('drink (walking)', 1.0, t => { if (t === 0) { hero.hp = 100; drinkPotion(); } input.mx = 0.7; input.my = 0.7; });
    arena(); { const e = dummy(0.2, 1.1); rec('hit from the side', 0.6, t => { if (t === 0) { hero.dir = dirFrom(1, 0); hurtHero(5, e); } }); }
    arena(); rec('standing still', 2.2, t => { if (t === 0) { hero.idleT = 0; hero.fidgetAt = 0.6; } });
    return clips;
  });
  fs.writeFileSync(out, JSON.stringify(res)); console.log(Object.keys(res).map(k => k + ':' + res[k].length).join(' '), errs.join('\n')); await b.close(); })();
