// round 112: journey sets, checked for every class: what helms and chests drop at each Act I level, the
// boss's missing piece, the helm restyled to the chest's set, NEW LOOK, and pictures of the bag's journey
// card and the banner. node journey.cjs <outDir> [gameDir]
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => { const [out, game = 'game'] = process.argv.slice(2), b = await chromium.launch(), p = await b.newPage(), errs = []; p.on('pageerror', e => errs.push(String(e.stack)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve(game, 'index.html') + '?cine=0');
  const res = await p.evaluate(() => {
    allocBuffers(270, 480); const log = [], pics = [];
    for (const cls of ['warrior', 'paladin', 'mage', 'ranger']) {
      G.mode = 'title'; beginGame(false, cls); for (let k = 0; k < 5; k++) update(1 / 60);
      const S = JOURNEY[cls], start = `${cls}: starts in ${hero.equip.chest && ITEM_BASES[hero.equip.chest.base].name} / ${hero.equip.helm ? ITEM_BASES[hero.equip.helm.base].name : 'no helm'}, band ${hero._jb}`;
      let bad = 0, n = 0; const seen = {};
      for (let L = 1; L <= 11; L++) { const R = rng(L * 99), want = S[jBand(L)];
        for (let k = 0; k < 400; k++) { const it = rollItem(R, L); const sl = ITEM_BASES[it.base].slot; if (sl !== 'helm' && sl !== 'chest' || it.rarity === 'set' || it.rarity === 'legend') continue; n++;
          if (rootOf(it.base) !== want[1] && rootOf(it.base) !== want[2]) bad++; seen[L] = (seen[L] || new Set()).add(ITEM_BASES[it.base].name); } }
      log.push(start + ` | ${n} armor drops at levels 1-11, ${bad} off-set`);
      log.push('  ' + Object.entries(seen).map(([L, s]) => 'L' + L + ': ' + [...s].join(' + ')).join(' | '));
      // the boss: at level 5 with nothing of that band, then with the chest carried
      LV.diff = 5; groundItems.length = 0; G.lootBoss = true; dropLoot(hero.fi, hero.fj, 1, true); G.lootBoss = false;
      const bossPiece = groundItems.filter(g => g.item && (rootOf(g.item.base) === S[2][1] || rootOf(g.item.base) === S[2][2])).map(g => ITEM_BASES[g.item.base].name);
      log.push('  boss at L5 leaves: ' + (bossPiece.join(', ') || 'NOTHING'));
      // the look: band-3 chest with the starting (band-1) helm -> the helm shows band 3's helm; NEW LOOK fires
      G.mode = 'inv'; const helm0 = hero.equip.helm || (() => { const it = rollItem(rng(3), 1, S[0][2]); hero.equip.helm = it; return it; })();
      const c = rollItem(rng(5), 6, S[2][1]); hero.equip.chest = c; recalcHero();
      log.push(`  wearing ${ITEM_BASES[c.base].name} + ${ITEM_BASES[helm0.base].name}: helm shows ${hero.look.helm} (set helm ${ITEM_BASES[S[2][2]].look}) ${hero.look.helm === ITEM_BASES[S[2][2]].look ? 'OK' : 'WRONG'}; NEW LOOK ${G.newLook ? G.newLook.name : 'none'}`);
      hero.lvl = 6; render(); pics.push([cls + '-bag', cvs.toDataURL()]);
      G.mode = 'play'; G.areaCard = null; for (let k = 0; k < 40; k++) update(1 / 60); G.areaT = -99; render(); pics.push([cls + '-newlook', cvs.toDataURL()]);
    }
    return { log, pics };
  });
  fs.mkdirSync(out, { recursive: true }); res.pics.forEach(([t, u]) => fs.writeFileSync(`${out}/${t}.png`, Buffer.from(u.split(',')[1], 'base64')));
  console.log(res.log.join('\n')); console.log(errs.slice(0, 3).join('\n') || 'no errors'); await b.close(); })();
