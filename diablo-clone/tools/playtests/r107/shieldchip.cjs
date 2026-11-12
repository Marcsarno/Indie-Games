// round 107: a shield-bearer at 1-2 health, blocking a blow from the front, must die (it used to sit at 0 health, untouchable, still fighting)
// node tools/playtests/r107/shieldchip.cjs [gameDir]
const { chromium } = require('playwright'); const path = require('path');
(async () => { const game = process.argv[2] || 'game';
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve(game, 'index.html') + '?cine=0');
  const r = await p.evaluate(() => { const out = [];
    allocBuffers(270, 480); G.mode = 'title'; beginGame(false, 'warrior'); G.story = { f: { met: true, woodTold: true }, n: 0 }; G.actCard = 0; for (let k = 0; k < 10; k++) update(1 / 60);
    for (const [hp, dmg, ranged] of [[1, 3, false], [2, 7, false], [2, 6, true], [3, 9, false], [5, 4, false]]) {
      const e = makeEnemy('skeleton', hero.fi + 1, hero.fj, 0, 3); e.look.shield = true; e.atk = -1; e.guardT = 0; e.stun = 0; e.frozen = 0; e.hp = hp; e.dir = dirFrom(-1, 0); enemies.push(e);
      damageEnemy(e, dmg, hero.fi, hero.fj, false, 0, ranged);
      for (let k = 0; k < 3; k++) update(1 / 60);
      out.push(`hp ${hp} hit ${dmg}${ranged ? ' ranged' : ''}: health now ${e.hp}, ${alive(e) ? 'ALIVE (fine if health > 0)' : e.dying >= 0 ? 'dying (fine)' : 'BUG: not alive, not dying'}`);
      e.dying = 5; e.hp = 0;
    }
    // NaN health: the safety net
    const n = makeEnemy('skeleton', hero.fi + 3, hero.fj, 0, 3); enemies.push(n); n.hp = NaN; for (let k = 0; k < 3; k++) update(1 / 60); out.push('NaN health: ' + (n.dying >= 0 ? 'dying (fine)' : 'BUG'));
    return out; });
  console.log(r.join('\n')); console.log(errs.join('\n') || 'no page errors'); await b.close(); })();
