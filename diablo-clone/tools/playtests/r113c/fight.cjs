// round 113c: can each class beat each Act I boss? A plain fighter (walks up, attacks, drinks below 35% life, never
// dodges) and a dodger (steps out of whatever warning it stands in). node fight.cjs <den|tower|cellar|barrow2|king> [lvl] [runs]
const { chromium } = require('playwright'); const path = require('path');
const LVL = { den: 4, tower: 5, cellar: 7, barrow2: 9, king: 10 };
(async () => { const [where = 'tower', lvl0, runs = '2'] = process.argv.slice(2), lvl = +(lvl0 || LVL[where]), b = await chromium.launch(), errs = [], rows = [];
  const game = process.env.GAME || path.resolve(__dirname, '../../../game/index.html');
  for (const cls of ['warrior', 'paladin', 'mage', 'ranger']) for (const dodge of [false, true]) for (let r = 0; r < +runs; r++) {
    const p = await b.newPage(); p.on('pageerror', e => errs.push(String(e.stack || e).slice(0, 300)));
    await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
    await p.goto('file://' + game + '?cine=0');
    rows.push(await p.evaluate(([where, cls, lvl, dodge, r, process_old, process_gear]) => {
      allocBuffers(270, 480); G.mode = 'title'; beginGame(false, cls); for (let k = 0; k < 5; k++) update(1 / 60);
      hero.lvl = lvl; hero.xp = 0; hero.potions = 3; recalcHero(); for (let k = 0; k < (+process_gear || 0); k++) hero.bag.push(rollItem(rng(k * 7 + 1 + r * 1000), lvl)); for (let q = 0; q < 3; q++) for (const it of bestUpgrades()) equipItem(it); hero.bag = []; recalcHero(); hero.hp = STAT.maxHp; hero.mana = STAT.maxMana;
      if (where === 'king') startLevel(5, 1234); else if (where === 'barrow2') { enterSide('barrow'); for (let k = 0; k < 90; k++) update(1 / 60); descendSide(); } else enterSide(where);
      for (let k = 0; k < 90; k++) update(1 / 60);
      const A = boss; if (!A || (!A.bossKind && !process_old)) return { cls, err: 'no boss ' + (A && A.id) };
      for (const e of enemies) if (e !== A) { e.hp = 0; e.dying = 9; e.corpse = true; }
      for (let a = 0; a < 6.28; a += 0.3) { const fi = A.fi + Math.cos(a) * 5, fj = A.fj + Math.sin(a) * 5; if (standable(fi, fj, 0.4)) { hero.fi = fi; hero.fj = fj; break; } }
      updateFov(hero.fi, hero.fj); A.state = 'hunt'; wake(A, true);
      let T = 0, deaths = 0, pots0 = hero.potions, took = 0, lastHp = hero.hp, rage = 0; const ranged = cls === 'mage' || cls === 'ranger', seen = {}, src = {}; const hh = hurtHero; hurtHero = function (n, s2, ...a) { const h0 = hero.hp, r = hh(n, s2, ...a), k = s2 === A ? 'boss:' + (A.mv ? A.mv.kind : 'melee') : (s2 && s2.id) || 'fx'; src[k] = (src[k] || 0) + Math.max(0, h0 - hero.hp); return r; };
      const stick = (dx, dy) => { const d = Math.hypot(dx, dy) || 1; input.mx = (dx - dy) / d / 1.42; input.my = (dx + dy) / d / 1.42; };
      const danger = () => {   // the shape the hero stands in, and which way is out
        const M = A.mv, h = [hero.fi, hero.fj]; if (!M || !M.warn) return null;
        for (const w of M.warn) {
          if (w.k === 'disc' && Math.hypot(h[0] - w.c[0], h[1] - w.c[1]) < w.R + 0.5) return [h[0] - w.c[0] || 0.1, h[1] - w.c[1]];
          if (w.k === 'lane' && bSegDist(h, w.a, w.b) < w.w + 0.6) { const lx = w.b[0] - w.a[0], ly = w.b[1] - w.a[1], s = Math.sign((h[0] - w.a[0]) * -ly + (h[1] - w.a[1]) * lx) || 1; return [-ly * s, lx * s]; }
          if (w.k === 'cone') return [h[0] - A.fi, h[1] - A.fj];
        }
        if (M.kind === 'pounce') { const lx = M.b[0] - M.a[0], ly = M.b[1] - M.a[1]; return [-ly, lx]; }
        if (M.kind === 'rend' || M.kind === 'howl') return [h[0] - A.fi, h[1] - A.fj];
        return null;
      };
      while (T < 150 && alive(A)) {
        if (hero.dead) { deaths++; if (deaths > 3) break; hero.dead = 0; hero.hp = STAT.maxHp; }
        const dx = A.fi - hero.fi, dy = A.fj - hero.fj, d = Math.hypot(dx, dy), out = dodge && danger();
        if (A.mv) seen[A.mv.kind] = 1; if (A.phase === 2) rage = rage || +T.toFixed(1);
        input.attack = false; input.mx = input.my = 0;
        if (out) stick(out[0], out[1]);
        else if (hero.hp < STAT.maxHp * 0.35 && hero.potions > 0 && !hero.drankT) { drinkPotion(); hero.drankT = 1; }
        else if (d > (ranged ? 5 : 1.3)) stick(dx, dy);
        else { hero.face = dirFrom(dx, dy); hero.dir = hero.face; input.attack = true; G.aim = [A.fi, A.fj]; }
        if (hero.drankT) hero.drankT = Math.max(0, hero.drankT - 1 / 60) || 0;
        update(1 / 60); T += 1 / 60; if (hero.hp < lastHp) took += lastHp - hero.hp; lastHp = hero.hp;
      }
      return { cls, dodge, r, won: !alive(A), T: +T.toFixed(1), deaths, potions: pots0 - hero.potions, took: Math.round(took), maxHp: STAT.maxHp, bossHp: A.maxHp, rage, moves: Object.keys(seen).join(','), adds: enemies.filter(o => o.calledBy === A).length, src };
    }, [where, cls, lvl, dodge, r, !!process.env.GAME, process.env.GEAR || 12]));
    await p.close();
  }
  const by = {}; for (const x of rows) { if (x.err) { console.log(x.cls, x.err); continue; } const k = x.cls + (x.dodge ? ' dodger' : ' plain'); (by[k] = by[k] || []).push(x); }
  console.log(where, 'lvl', lvl);
  for (const k in by) { const L = by[k]; console.log(`${k.padEnd(16)} won ${L.filter(x => x.won).length}/${L.length}  time ${L.map(x => x.T).join('/')}s  rage@${L.map(x => x.rage).join('/')}  deaths ${L.map(x => x.deaths).join('/')}  pots ${L.map(x => x.potions).join('/')}  took ${L.map(x => x.took).join('/')}/${L[0].maxHp}  boss ${L[0].bossHp}  adds ${L.map(x => x.adds).join('/')}  [${L[0].moves}]`); }
  for (const x of rows) if (x.src && x.cls === 'ranger') console.log(x.dodge ? 'dodge' : 'plain', JSON.stringify(Object.fromEntries(Object.entries(x.src).map(([k, v]) => [k, Math.round(v)]))));
  console.log([...new Set(errs)].slice(0, 3).join('\n') || 'no errors'); await b.close(); })();
