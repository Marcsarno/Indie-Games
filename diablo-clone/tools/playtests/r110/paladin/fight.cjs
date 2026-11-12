// round 110: each new paladin loadout in a real fight (basic combo, every skill, the blessing, the wings), drawn every
// few frames, then a screenshot in play: node tools/playtests/r110/paladin/fight.cjs <outDir>  (run from diablo-clone)
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => { const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve('game/index.html') + '?cine=0');
  const R = await p.evaluate(() => {
    const L = [['vigil', ['pt_vigil_plate', 'pt_vigil_helm', 'pt_vigil_mace', 'pt_vigil_shield']], ['auric', ['pt_auric_plate', 'pt_auric_helm', 'pt_auric_hammer', 'pt_auric_shield']], ['auric2h', ['pt_auric_plate', 'pt_auric_helm', 'pt_auric_maul']],
      ['seraph', ['pt_seraph_plate', 'pt_seraph_helm', 'pt_seraph_hammer', 'pt_seraph_shield']], ['seraph2h', ['pt_seraph_plate_t1', 'pt_seraph_helm_t2', 'pt_seraph_maul_t1']]];
    const shots = [], info = {};
    for (const [nm, ids] of L) {
      allocBuffers(270, 480); G.mode = 'title'; beginGame(false, 'paladin'); G.story = { f: { met: true, woodTold: true }, n: 0 }; G.actCard = 0; hero.lvl = 10; recalcHero();
      for (const s of ['weapon', 'helm', 'chest', 'shield']) hero.equip[s] = null;
      for (const id of ids) { const it = rollItem(rng(2), 10, id); hero.bag.push(it); equipItem(it); }
      recalcHero();
      const step = n => { for (let k = 0; k < n; k++) { hero.hp = STAT.maxHp; G.t += 1 / 60; update(1 / 60); if (k % 6 === 0) render(); } };
      step(5); for (const e of enemies) { e.dying = 99; e.hp = 0; }
      for (let k = 0; k < 6; k++) { const e = makeEnemy('skeleton', hero.fi + 1.6 + (k % 2) * 0.6, hero.fj + (k - 2.5) * 0.5, 0, 8); e.maxHp = e.hp = 3000; e.state = 'hunt'; enemies.push(e); }
      for (let k = 0; k < 40; k++) { input.attack = true; step(6); } input.attack = false;
      for (const id of ['consec', 'phammer', 'seraph', 'judge']) { const i = SKILLS.findIndex(s => s.id === id); if (i < 0) continue; hero.mana = 999; CD[id] = 0; useSkill(i); step(50); }
      input.attack = true; step(60); input.attack = false;
      info[nm] = { equip: Object.values(hero.equip).filter(Boolean).map(it => it.base).join(','), kind: STAT.meleeKind, hitK: STAT.hitK, swingK: STAT.swingK, ench: hero.look.ench || '', weapon: hero.look.weapon, shield: hero.look.shield, armor: STAT.armor, dmg: STAT.dmg };
      hero.ult = 100; useUlt(); step(120);
      input.attack = true; step(40); input.attack = false; for (let i = 0; i < 600; i++) warmStep(40); render(); shots.push([nm, cvs.toDataURL()]);
    }
    return { shots, info };
  });
  for (const [n, u] of R.shots) fs.writeFileSync(`${out}/fight_${n}.png`, Buffer.from(u.split(',')[1], 'base64'));
  console.log(JSON.stringify(R.info, null, 1)); console.log(errs.slice(0, 3).join('\n') || 'no page errors'); await b.close(); })();
