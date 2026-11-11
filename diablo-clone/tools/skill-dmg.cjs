// Damage one cast of a skill deals to a pack of six sturdy skeletons 3 tiles away, over 7 s, averaged
// over 12 casts. node tools/skill-dmg.cjs <gameDir> cls:skill[:mod] ...
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const [gameDir, ...specs] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage(); await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + path.resolve(gameDir, 'index.html'));
  for (const spec of specs) {
    const [cls, id, mod] = spec.split(':');
    const r = await p.evaluate(({ cls, id, mod }) => {
      let tot = 0, base = 0;
      for (let run = 0; run < 12; run++) {
        newHero(cls); hero.lvl = 12; recalcHero(); hero.hp = STAT.maxHp = 99999; G.mode = 'play'; startLevel(3, 777 + run); G.actCard = 0; G.bossIntro = 0;
        hero.mods = {}; if (mod) hero.mods[id] = mod;
        const r0 = LV.rooms.slice(1).sort((a, b) => b.w * b.h - a.w * a.h)[0]; hero.fi = r0.cx + 0.5; hero.fj = r0.cy + 0.5;
        enemies.length = 0; for (let k = 0; k < 6; k++) { const e = makeEnemy('skeleton', hero.fi + 3 + (k % 3) * 0.8, hero.fj - 1 + Math.floor(k / 3) * 1.2, k); e.hp = e.maxHp = 1e6; e.state = 'idle'; enemies.push(e); }
        hero.dir = dirFrom(1, 0); hero.mana = 999; for (const k in CD) CD[k] = 0; hero.pips = 0; updateFov(hero.fi, hero.fj);
        let i = 0; for (let k = 0; k < 400; k++) i += roll(STAT.dmg); base += i / 400;
        const k = SKILLS.findIndex(s => s.id === id); useSkill(k);
        for (let f = 0; f < 7 * 30; f++) { for (const e of enemies) { e.cool = 99; e.atk = -1; e.fi = Math.max(e.fi, hero.fi + 2); } update(1 / 30); }
        tot += enemies.reduce((s, e) => s + e.maxHp - e.hp, 0);
      }
      const sk = SKILLS.find(s => s.id === id);
      return { dmg: Math.round(tot / 12), xHit: +(tot / base).toFixed(1), mana: sk.mana, cd: sk.cd };
    }, { cls, id, mod });
    console.log(spec.padEnd(26), JSON.stringify(r));
  }
  if (errs.length) console.log('ERR', errs.slice(0, 3).join('\n')); await b.close();
})();
