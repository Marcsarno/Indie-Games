// skill clips: each skill cast at a line of skeletons in a crypt room, frame by frame.
// node tools/capture/skillclips.cjs <gameDir> <outDir> cls:skill[:mod] ...   (skill 'attack' = the basic attack)
// writes <outDir>/<cls>-<skill>[-mod].json (frames) and .png (a strip of every 3rd frame, 2x)
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => {
  const [gameDir, outDir, ...specs] = process.argv.slice(2); fs.mkdirSync(outDir, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage(); await p.addInitScript((nf) => { window.__nf = nf; window.requestAnimationFrame = () => 0; Math.random = (() => { let s = 9; return () => (s = (s * 16807) % 2147483647) / 2147483647; })(); }, process.env.NF || 54);
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + path.resolve(gameDir, 'index.html'));
  for (const spec of specs) {
    const [cls, id, mod] = spec.split(':');
    const fr = await p.evaluate(({ cls, id, mod }) => {
      buildBudget.ms = Infinity; newHero(cls); hero.lvl = 12; recalcHero(); hero.hp = STAT.maxHp = 99999; G.mode = 'play'; startLevel(3, 777); G.actCard = 0; G.bossIntro = 0;
      if (mod) { hero.mods = hero.mods || {}; hero.mods[id] = mod; }
      // an open spot: a room centre with floor round it
      const open = (i, j) => { for (let a = -4; a <= 5; a++) for (let c = -4; c <= 4; c++) if (blocked(i + a, j + c)) return false; return true; };
      for (const r of LV.rooms) { if (open(r.cx + 0.5, r.cy + 0.5)) { hero.fi = r.cx + 0.5; hero.fj = r.cy + 0.5; break; } }
      const sk = enemies.filter(e => e.id === 'skeleton' || e.fam === 'skeleton').slice(0, 5); enemies = sk;
      // the line: in front of the hero (facing +i +j = down-right on screen), 2.2 to 4 tiles off
      [[2.2, -1.4], [2.8, -2.6], [3.6, -1.2], [1.4, -2.6], [4.0, -2.8]].forEach(([a, c], k) => { const e = sk[k]; if (!e) return; e.fi = hero.fi + a; e.fj = hero.fj + c; e.state = 'idle'; e.cool = 99; e.hp = e.maxHp = 99999; e.atk = -1; });
      hero.dir = dirFrom(1, -1); hero.mana = 999; for (const k in CD) CD[k] = 0; hero.pips = 3;   // (the ranger's spenders at full combo points)
      for (let s = 0; s < 60; s++) warmStep(40);
      G.t = 5; updateFov(hero.fi, hero.fj); computeFlow();
      if (id === 'vault') { const e = enemies[0]; if (e) { e.fi = hero.fi + 1.3; e.fj = hero.fj - 0.6; e.cool = 99; } }
      const out = []; const dt = 1 / 30;
      const cast = () => { if (id === 'attack') heroAttack(); else if (id === 'ult') { hero.ult = 100; useUlt(); } else { const k = SKILLS.findIndex(s => s.id === id); CD[id] = 0; hero.mana = 999; useSkill(k); } };
      const NF = +(window.__nf || 54); for (let f = 0; f < NF; f++) {
        if (f === 2) cast();
        if (id === 'vault' && f > 4 && enemies[0] && !(enemies[0].rootT > 0) && f < 30) { const e = enemies[0], tp = G.traps[G.traps.length - 1]; if (tp) { const dx = tp.fi - e.fi, dy = tp.fj - e.fj, d = Math.hypot(dx, dy); if (d > 0.05) { e.fi += dx / d * 0.09; e.fj += dy / d * 0.09; e.clip = 'walk'; } } }
        if (id === 'vault' && f > 22 && f % 9 === 0 && hero.cls === 'ranger') rangerShoot();
        if (id === 'strafe') { input.mx = f > 2 && f < 66 ? -0.7 * Math.cos(f / 14) : 0; input.my = f > 2 && f < 66 ? 0.5 * Math.sin(f / 14) : 0; }
        for (const e of enemies) { e.cool = 99; e.atk = -1; }
        G.t += dt; update(dt); render();
        out.push(cvs.toDataURL());
      }
      return { fr: out, W: cvs.width, H: cvs.height };
    }, { cls, id, mod });
    const name = `${cls}-${id}${mod ? '-' + mod : ''}`;
    fs.writeFileSync(path.join(outDir, name + '.json'), JSON.stringify(fr));
    console.log(name, fr.fr.length, 'frames');
  }
  if (errs.length) console.log('errors', errs.slice(0, 5));
  await b.close();
})();
