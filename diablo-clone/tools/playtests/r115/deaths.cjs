// round 115: every death, staged: one monster two tiles to the hero's right, killed in a chosen way; frames at
// 0.08, 0.25, 0.5, 0.9 and 2 s as a strip per death. node deaths.cjs <outDir> [level]   (level 3 = a crypt, 1 = the Hollow)
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const CASES = [['fallen', null, 'plain'], ['fallen', 'behead'], ['fallen', 'halved'], ['fallen', 'gib'], ['brigand', 'behead'], ['brigand', 'halved'], ['wolf', 'halved'], ['wolf', null, 'plain'],
  ['skeleton', 'bones'], ['spider', 'burst'], ['wraith', 'smoke'], ['slime', 'splat'], ['goblin', 'char'], ['brigand', 'fried'], ['wolf', 'fried'], ['goblin', 'ice'], ['oclubber', 'behead'], ['shroom', 'splat']];
(async () => { const [out, level = '3'] = process.argv.slice(2), b = await chromium.launch(), p = await b.newPage(), errs = []; p.on('pageerror', e => errs.push(String(e.stack).slice(0, 400)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve(__dirname, '../../../game/index.html') + '?cine=0');
  const res = await p.evaluate(([CASES, level]) => {
    allocBuffers(270, 480); G.mode = 'title'; beginGame(false, 'warrior'); for (let k = 0; k < 5; k++) update(1 / 60);
    hero.tut = null; hero.lvl = 9; hero.xp = 0; recalcHero(); startLevel(level, 99); G.mode = 'play'; G.msg = []; G.actCard = 0; enemies.length = 0; if (typeof npcs !== 'undefined') npcs.length = 0;
    const run = s => { for (let i = 0; i < Math.round(s * 60); i++) update(1 / 60); }, pics = [], log = [];
    // an open spot: the hero with three clear tiles to his screen-right
    let spot = null, bd = 1e9; const s0 = [LV.start.cx, LV.start.cy]; for (let j = 2; j < MH - 2; j++) for (let i = 2; i < MW - 2; i++) { const dd = Math.hypot(i - s0[0], j - s0[1]); if (dd < 7 || dd >= bd) continue; let ok = true; for (let a = -2; a <= 4 && ok; a++) for (let c = -4; c <= 2 && ok; c++) if (!standable(i + a + 0.5, j + c + 0.5, 0.3)) ok = false; if (ok) { spot = [i + 0.5, j + 0.5]; bd = dd; } }
    if (!spot) return { log: ['no open spot'], pics };
    const gk = goreKind; let n = 0;
    for (const [id, kind, tag] of CASES) {
      hero.fi = spot[0] + (n % 3) * 0.01; hero.fj = spot[1]; groundItems.length = 0; hero.hp = STAT.maxHp; hero.dir = 1; updateFov(hero.fi, hero.fj); run(0.3); G.msg = []; floaters.length = 0;
      const e = makeEnemy(id, hero.fi + 1.4, hero.fj - 1.4, enemies.length, 3); e.state = 'hunt'; e.dir = dirFrom(-1, 1); e.noLoot = true; e.cool = 99; e.special = 99; enemies.push(e);
      goreKind = kind ? (en) => { en.deathKind = kind; } : (en) => {};
      render();
      try { damageEnemy(e, kind ? 9999 : e.hp, hero.fi, hero.fj, kind === 'behead', kind === 'halved' ? 1 : 0); } catch (err) { log.push(id + ' ' + kind + ' ERR ' + String(err.stack).slice(0, 300)); }
      const row = [];
      for (const [dt, t] of [[0.08, '0.08'], [0.17, '0.25'], [0.25, '0.5'], [0.4, '0.9'], [1.1, '2.0']]) { run(dt); floaters.length = 0; render(); row.push(cvs.toDataURL()); }
      pics.push([id + '-' + (kind || tag), row]); log.push(`${id} ${kind || tag}: deathKind ${e.deathKind} corpse ${e.corpse} pieces left ${G.gore.length} pools ${G.pools.length} mode ${G.mode} paused ${G.paused} guide ${JSON.stringify(G.guide)} shop ${typeof SHOP !== "undefined" && SHOP.open}`);
      run(2.5); enemies.length = 0; n++; G.gore = []; G.pools = []; pclear(); buildWorld();   // a clean floor for the next
      // a clean floor for the next: move along
      spot = [spot[0], spot[1]];
    }
    goreKind = gk;
    return { log, pics };
  }, [CASES, +level]);
  fs.mkdirSync(out, { recursive: true });
  res.pics.forEach(([name, row], i) => row.forEach((u, k) => fs.writeFileSync(`${out}/${String(i).padStart(2, '0')}-${name}-${k}.png`, Buffer.from(u.split(',')[1], 'base64'))));
  console.log(res.log.join('\n')); console.log([...new Set(errs)].slice(0, 3).join('\n') || 'no errors'); await b.close(); })();
