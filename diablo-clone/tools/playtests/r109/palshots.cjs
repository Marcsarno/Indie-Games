// round 109: the Paladin's skills screen (a modifier picked) and the blessed glow in play: node palshots.cjs <outDir>
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => { const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve('game/index.html') + '?cine=0');
  const R = await p.evaluate(() => { const shots = [];
    allocBuffers(270, 480); G.mode = 'title'; beginGame(false, 'paladin'); G.story = { f: { met: true, woodTold: true }, n: 0 }; G.actCard = 0; hero.lvl = 9; hero.mods = { consec: 'linger' }; hero.modSeen = 9; recalcHero();
    for (let k = 0; k < 20; k++) update(1 / 60); G.msg = [];
    const warm = () => { for (let i = 0; i < 800; i++) warmStep(40); };
    openInv('skills'); for (let k = 0; k < 5; k++) update(1 / 60); render(); shots.push(['skills', cvs.toDataURL()]);
    if (typeof SKV !== 'undefined') { SKV.view = { n: 1, k: 2 }; render(); shots.push(['skills-consec', cvs.toDataURL()]); }
    if (typeof closeInv === 'function') closeInv(); G.mode = 'play';
    const i = SKILLS.findIndex(s => s.id === 'consec'); hero.mana = 99; CD.consec = 0; useSkill(i); for (let k = 0; k < 40; k++) update(1 / 60); warm(); render(); shots.push(['blessed', cvs.toDataURL()]);
    return shots; });
  for (const [n, u] of R) fs.writeFileSync(`${out}/${n}.png`, Buffer.from(u.split(',')[1], 'base64'));
  console.log(errs.slice(0, 3).join('\n') || 'ok'); await b.close(); })();
