// round 113: can each class beat the Alpha? A plain fighter (walks up, attacks, drinks below 35% life, never
// dodges: the worst case) and a dodger (steps out of the warnings): time to win, deaths, potions, damage taken.
// node alphafight.cjs [lvl] [runs] [gameDir]
const { chromium } = require('playwright'); const path = require('path');
(async () => { const [lvl = '4', runs = '3', game = 'game'] = process.argv.slice(2), b = await chromium.launch(), errs = [];
  const rows = [];
  for (const cls of ['warrior', 'paladin', 'mage', 'ranger']) for (const dodge of [false, true]) for (let r = 0; r < +runs; r++) {
    const p = await b.newPage(); p.on('pageerror', e => errs.push(String(e).slice(0, 200)));
    await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
    await p.goto('file://' + path.resolve(game, 'index.html') + '?cine=0');
    rows.push(await p.evaluate(([cls, lvl, dodge, r]) => {
      allocBuffers(270, 480); G.mode = 'title'; beginGame(false, cls); for (let k = 0; k < 5; k++) update(1 / 60);
      hero.lvl = lvl; hero.xp = 0; hero.potions = 3; recalcHero(); hero.hp = STAT.maxHp; hero.mana = STAT.maxMana;
      enterSide('den'); for (let k = 0; k < 90; k++) update(1 / 60);
      const A = boss; if (!A) return { cls, err: 'no boss' };
      for (const e of enemies) if (e !== A) { e.hp = 0; e.dying = 9; e.corpse = true; }
      for (let a = 0; a < 6.28; a += 0.3) { const fi = A.fi + Math.cos(a) * 5, fj = A.fj + Math.sin(a) * 5; if (standable(fi, fj, 0.4)) { hero.fi = fi; hero.fj = fj; break; } }
      updateFov(hero.fi, hero.fj); A.state = 'hunt'; wake(A, true);
      let T = 0, deaths = 0, pots0 = hero.potions, took = 0, lastHp = hero.hp; const ranged = cls === 'mage' || cls === 'ranger';
      const stick = (dx, dy) => { const d = Math.hypot(dx, dy) || 1; input.mx = (dx - dy) / d / 1.42; input.my = (dx + dy) / d / 1.42; };
      while (T < 120 && alive(A)) {
        if (hero.dead) { deaths++; if (deaths > 3) break; hero.dead = 0; hero.hp = STAT.maxHp; }   // (a death counts; he stands up and goes on, to see the whole fight)
        const dx = A.fi - hero.fi, dy = A.fj - hero.fj, d = Math.hypot(dx, dy), M = A.mv;
        input.attack = false; input.mx = input.my = 0;
        if (dodge && M && M.t < M.wind) {   // read the warning and step out of it
          if (M.kind === 'pounce') { const lx = M.b[0] - M.a[0], ly = M.b[1] - M.a[1], l = Math.hypot(lx, ly); stick(-ly / l, lx / l); }
          else stick(-dx, -dy);
        } else if (hero.hp < STAT.maxHp * 0.35 && hero.potions > 0 && !hero.drankT) { drinkPotion(); hero.drankT = 1; }
        else if (d > (ranged ? 5 : 1.3)) stick(dx, dy);
        else { hero.face = dirFrom(dx, dy); hero.dir = hero.face; input.attack = true; G.aim = [A.fi, A.fj]; }
        if (hero.drankT) hero.drankT = Math.max(0, hero.drankT - 1 / 60) || 0;
        update(1 / 60); T += 1 / 60; if (hero.hp < lastHp) took += lastHp - hero.hp; lastHp = hero.hp;
      }
      return { cls, dodge, r, won: !alive(A), T: +T.toFixed(1), deaths, potions: pots0 - hero.potions, took: Math.round(took), maxHp: STAT.maxHp, bossHp: A.maxHp };
    }, [cls, +lvl, dodge, r]));
    await p.close();
  }
  const by = {}; for (const x of rows) { const k = x.cls + (x.dodge ? ' dodger' : ' plain'); (by[k] = by[k] || []).push(x); }
  for (const k in by) { const L = by[k]; console.log(`${k.padEnd(16)} won ${L.filter(x => x.won).length}/${L.length}  time ${L.map(x => x.T).join('/')}s  deaths ${L.map(x => x.deaths).join('/')}  potions ${L.map(x => x.potions).join('/')}  took ${L.map(x => x.took).join('/')} of ${L[0].maxHp} hp (boss ${L[0].bossHp})`); }
  console.log(errs.slice(0, 3).join('\n') || 'no errors'); await b.close(); })();
