// round 117: the same scenes with a query string (e.g. smooth=0), for before/after sheets
// node shots.cjs <gameDir> <outPrefix> [query] [scene,scene]
const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + process.argv[2] + '/index.html' + (process.argv[4] ? '?' + process.argv[4] : ''));
  const only = process.argv[5] ? process.argv[5].split(',') : null;
  const shots = await p.evaluate((only) => {
    Math.random = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    const out = {};
    const scene = (cls, lv, seed, name, fight, cast) => {
      if (only && !only.includes(name)) return;
      newHero(cls); hero.lvl = 8; recalcHero(); hero.hp = 9999; G.mode = 'play'; startLevel(lv, seed);
      G.say = null; G.dlg = null; G.banner = null;
      if (fight) {
        let best = null, bs = -1;
        for (let i = 2; i < MW - 2; i++) for (let j = 2; j < MH - 2; j++) { let n = 0; for (let a = -3; a <= 3; a++) for (let c = -3; c <= 3; c++) if (!blocked(i + a + 0.5, j + c + 0.5)) n++; if (n > bs) { bs = n; best = [i + 0.5, j + 0.5]; } }
        const pack = enemies.filter(e => !e.def.unique).slice(0, 6); enemies.length = 0; enemies.push(...pack);
        hero.fi = best[0]; hero.fj = best[1];
        pack.forEach((e, k) => { e.fi = hero.fi + 1.4 + (k % 3) * 0.7; e.fj = hero.fj - 1.2 + Math.floor(k / 3) * 1.1 - (k % 2) * 0.5; e.state = 'hunt'; e.def = Object.assign({}, e.def, { dmg: [0, 0] }); e.hp = e.maxHp = 600; });
      }
      for (let i = 0; i < 600; i++) warmStep(50);
      hero.mp = 999; if (hero.rage !== undefined) hero.rage = 100;
      for (let k = 0; k < 46; k++) { input.attack = !!fight && !cast; if (cast && k === 20) { hero.dir = dirFrom(1, -0.4); try { useSkill(cast - 1); } catch (e) { out.err = String(e); } } update(1 / 60); warmStep(20); }
      input.attack = false;
      render(); out[name] = cvs.toDataURL();
    };
    scene('warrior', 3, 777, 'crypt-war', true);
    scene('mage', 3, 777, 'crypt-mage', true, 2);
    scene('warrior', 2, 4242, 'forest', false);
    scene('mage', 1, 777, 'town', false);
    scene('ranger', 4, 99, 'cave', true);
    scene('paladin', 5, 31, 'hell', true);
    return out;
  }, only);
  for (const k in shots) if (k !== 'err') fs.writeFileSync(`${process.argv[3]}-${k}.png`, Buffer.from(shots[k].split(',')[1], 'base64'));
  console.log(Object.keys(shots).join(' '), shots.err || '', errs.length ? 'ERR ' + errs.join('\n') : 'no errors'); await b.close(); })();
