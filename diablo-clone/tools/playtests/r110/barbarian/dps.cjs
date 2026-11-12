// round 110 (copy of r109/dps.cjs with the new barbarian weapons): melee damage per second by loadout against a dummy (real swings, combos, finisher; no crits):
// node tools/playtests/r109/dps.cjs [gameDir]   prints per loadout: avg weapon dmg, hits/s, dmg/s, dmg/s per point of avg item damage
const { chromium } = require('playwright'); const path = require('path');
(async () => { const game = process.argv[2] || 'game';
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve(game, 'index.html') + '?cine=0');
  const r = await p.evaluate(() => {
    const L = [
      ['warrior', '1H tusk axe', ['bt_tuskaxe', null]], ['warrior', '1H club', ['bt_club', null]], ['warrior', '1H flail', ['bt_flail', null]], ['warrior', '1H cleaver', ['bt_cleaver', null]],
      ['warrior', 'dual flail+club', ['bt_flail', 'bt_club']], ['warrior', 'dual cleaver+flail', ['bt_cleaver', 'bt_flail']],
      ['warrior', '2H thunderhorn axe', ['bt_dblaxe', null]], ['warrior', '2H emberhorn axe', ['bt_emberaxe', null]],
    ];
    const out = [];
    for (const [cls, nm, [w, o]] of L) {
      allocBuffers(270, 480); G.mode = 'title'; beginGame(false, cls); G.story = { f: { met: true, woodTold: true }, n: 0 }; G.actCard = 0; hero.lvl = 6;
      const mk = id => { const it = rollItem(rng(3), 5, id); it.rarity = 'normal'; it.mods = {}; it.plus = 0; return it; };
      hero.equip.weapon = mk(w); hero.equip.shield = o ? mk(o) : null; recalcHero();
      const B = id => ITEM_BASES[id].dmg, avg = id => (B(id)[0] + B(id)[1]) / 2;
      const pct = 1 + hero.lvl * 0.03, ia = it => { const d = itemStats(it).dmg || ITEM_BASES[it.base].dmg; return (d[0] + d[1]) / 2 * pct; }, W0 = hero.equip.weapon, O0 = hero.equip.shield;
      const itemAvg = O0 && ITEM_BASES[O0.base].slot === 'weapon' && !ITEM_BASES[W0.base].twoHand ? (ia(W0) + ia(O0)) / 2 : ITEM_BASES[W0.base].twoHand ? ia(W0) / 1.35 : ia(W0);   // (the tier's one-hander damage)
      for (let k = 0; k < 10; k++) update(1 / 60);
      for (const e of enemies) e.dying = 99, e.hp = 0;
      const e = makeEnemy('skeleton', hero.fi + 1, hero.fj, 0, 6); e.maxHp = e.hp = 1e7; e.def = { ...e.def, xp: 0 }; enemies.push(e); e.state = 'hunt';
      const CC = window.CRIT_CHANCE; STAT.crit = -1000;
      let dealt = 0, hits = 0; const hp0 = e.hp, T = 60;
      hero.dir = dirFrom(1, 0);
      for (let t = 0; t < T * 60; t++) {
        e.fi = hero.fi + 1; e.fj = hero.fj; e.kb = [0, 0]; e.atk = -1; e.cool = 5; e.stun = 1; hero.hp = STAT.maxHp; hero.mana = 0; hero.dir = dirFrom(1, 0);
        input.attack = true; const h = e.hp; G.t += 1 / 60; update(1 / 60); if (e.hp < h) { hits++; } e.dying = -1; if (e.hp < 1e6) e.hp = 1e7, dealt += 1e7 - 1e6;
      }
      dealt += hp0 - e.hp; input.attack = false;
      out.push([cls, nm + ' [' + (STAT.meleeKind || '') + ' hitK ' + STAT.hitK + ' swingK ' + STAT.swingK + ']', +itemAvg.toFixed(1), JSON.stringify(STAT.dmg), +(hits / T).toFixed(2), +(dealt / T).toFixed(1), +((dealt / T) / itemAvg).toFixed(2)]);
    }
    return out; });
  console.log('class | loadout | item avg | STAT.dmg | hits/s | dmg/s | dmg/s per item avg');
  for (const x of r) console.log(x.join(' | ')); console.log(errs.slice(0, 3).join('\n') || 'no page errors'); await b.close(); })();
