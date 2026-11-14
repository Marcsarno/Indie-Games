// round 115: the same staged fight (a barbarian in a ring of goblins, wolves and brigands) as frames, for a
// before/after clip. node clip.cjs <outDir> [gameDir] [seconds]
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => { const [out, game = path.resolve(__dirname, '../../../game'), secs = '7'] = process.argv.slice(2), b = await chromium.launch(), p = await b.newPage(), errs = []; p.on('pageerror', e => errs.push(String(e.stack).slice(0, 300)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); let s = 11; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; });
  await p.goto('file://' + path.join(game, 'index.html') + '?cine=0');
  fs.mkdirSync(out, { recursive: true });
  await p.evaluate(() => {
    allocBuffers(270, 480); G.mode = 'title'; beginGame(false, 'warrior'); for (let k = 0; k < 5; k++) update(1 / 60);
    hero.tut = null; hero.lvl = 6; hero.xp = 0; for (let k = 0; k < 14; k++) hero.bag.push(rollItem(rng(k * 7 + 3), 6)); for (let q = 0; q < 3; q++) for (const it of bestUpgrades()) equipItem(it); hero.bag = []; recalcHero(); hero.hp = STAT.maxHp;
    startLevel(1, 99); G.mode = 'play'; G.msg = []; G.actCard = 0; enemies.length = 0; if (typeof npcs !== 'undefined') npcs.length = 0;
    let spot = null, bd = 1e9; const s0 = [LV.start.cx, LV.start.cy]; for (let j = 4; j < MH - 4; j++) for (let i = 4; i < MW - 4; i++) { const dd = Math.hypot(i - s0[0], j - s0[1]); if (dd < 9 || dd >= bd) continue; let ok = true; for (let a = -4; a <= 4 && ok; a++) for (let c = -4; c <= 4 && ok; c++) if (!standable(i + a + 0.5, j + c + 0.5, 0.3)) ok = false; if (ok) { spot = [i + 0.5, j + 0.5]; bd = dd; } }
    hero.fi = spot[0]; hero.fj = spot[1]; updateFov(hero.fi, hero.fj);
    const ids = ['goblin', 'goblin', 'wolf', 'brigand', 'goblin', 'wolf', 'goblin', 'brigand', 'goblin', 'wolf', 'goblin', 'goblin', 'brigand', 'wolf'];
    ids.forEach((id, n) => { const a = n / ids.length * 6.283, r = 2.6 + (n % 3) * 0.7, e = makeEnemy(id, hero.fi + Math.cos(a) * r, hero.fj + Math.sin(a) * r, n, 5); e.state = 'hunt'; e.noLoot = true; enemies.push(e); });
    for (let k = 0; k < 20; k++) update(1 / 60); G.msg = [];
    window.__step = () => {
      for (let q = 0; q < 3; q++) {
        let t = null, bd2 = 1e9; for (const e of enemies) if (alive(e)) { const d = Math.hypot(e.fi - hero.fi, e.fj - hero.fj); if (d < bd2) { bd2 = d; t = e; } }
        input.attack = false; input.mx = input.my = 0; if (hero.dead) { hero.dead = 0; hero.hp = STAT.maxHp; } hero.hp = Math.max(hero.hp, STAT.maxHp * 0.5);
        if (t) { const dx = t.fi - hero.fi, dy = t.fj - hero.fj, d = Math.hypot(dx, dy) || 1; if (d > 1.25) { input.mx = (dx - dy) / d / 1.42; input.my = (dx + dy) / d / 1.42; } else { hero.face = dirFrom(dx, dy); hero.dir = hero.face; input.attack = true; G.aim = [t.fi, t.fj]; } }
        update(1 / 60);
      }
      G.msg = []; render(); return [cvs.toDataURL(), enemies.filter(e => alive(e)).length];
    };
  });
  let left = -1;
  for (let f = 0; f < +secs * 20; f++) { const [u, n] = await p.evaluate(() => window.__step()); left = n; fs.writeFileSync(`${out}/${String(f).padStart(3, '0')}.png`, Buffer.from(u.split(',')[1], 'base64')); }
  console.log('frames', +secs * 20, 'left alive', left, errs.slice(0, 2).join('\n') || 'no errors'); await b.close(); })();
