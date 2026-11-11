const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => {
  const [out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve('game/index.html') + '?cine=0');
  const r = await p.evaluate(() => {
    const log = [], shots = [];
    const step = n => { for (let k = 0; k < n; k++) update(1 / 30); };
    const shot = name => { G.msg = []; for (let i = 0; i < 600; i++) warmStep(30); render(); warmStep(1e4); render(); shots.push([name, cvs.toDataURL()]); };
    allocBuffers(270, 480); G.mode = 'title'; beginGame(false, 'warrior'); G.story = { f: { met: true, woodTold: true }, n: 0 }; G.actCard = 0;
    const camp = LV.ways.find(w => w.id === 'camp'); hero.fi = camp.fi; hero.fj = camp.fj; step(2);
    const a = actionTarget(); log.push('action on camp: ' + (a && a.label));
    doAction(a); log.push('mode: ' + G.mode);
    // wake the glade by walking there, then back to the camp
    const gl = LV.ways.find(w => w.id === 'glade'); hero.fi = gl.fi; hero.fj = gl.fj; G.mode = 'play'; step(2); hero.fi = camp.fi; hero.fj = camp.fj; step(2);
    openWays(camp); render(); const h = WAYS.hits.find(h => h.key === gl.key); log.push('hit for glade: ' + !!h);
    waysTap([h.x + h.w / 2, h.y + h.h / 2]); render(); waysTap([WAYS.L.go.x + 5, WAYS.L.go.y + 5]); step(30);
    log.push(`after travel: level ${LV.level} at ${hero.fi.toFixed(1)},${hero.fj.toFixed(1)} glade ${gl.fi.toFixed(1)},${gl.fj.toFixed(1)} mode ${G.mode}`);
    // the Riverlands: arrive, wake the south stone, travel home to camp
    startLevel(2, 12345); const so = LV.ways.find(w => w.id === 'south'); log.push('riv ways ' + LV.ways.map(w => w.id + '@' + w.fi.toFixed(1) + ',' + w.fj.toFixed(1)).join(' '));
    hero.fi = so.fi; hero.fj = so.fj; step(3); shot('riv-south');
    wayTravel('1:camp'); step(30); log.push(`home: level ${LV.level} hub ${LV.hub} at ${hero.fi.toFixed(1)},${hero.fj.toFixed(1)}`); shot('home-camp');
    wayTravel('2:south'); step(30); log.push(`back to riv: level ${LV.level} riv ${LV.riv}`);
    // a crypt floor
    startLevel(3, 777); const fw = LV.ways[0]; log.push(`floor ways ${fw && fw.key} @ ${fw.fi.toFixed(1)},${fw.fj.toFixed(1)} start ${LV.start.cx},${LV.start.cy}`);
    hero.fi = fw.fi + 0.2; hero.fj = fw.fj + 0.2; step(3); shot('crypt1');
    openWays(fw); render(); shots.push(['map-crypt', cvs.toDataURL()]); G.mode = 'play';
    // Act II's town and its list map
    startLevel(6, 4242); const tw = LV.ways[0]; log.push(`act2 town ways ${tw && tw.key} @ ${tw.fi.toFixed(1)},${tw.fj.toFixed(1)}`);
    hero.fi = tw.fi + 0.2; hero.fj = tw.fj + 0.2; step(3); shot('act2-town');
    openWays(tw); render(); shots.push(['map-act2', cvs.toDataURL()]); WAYS.cyc = 0; render(); shots.push(['map-act1-from2', cvs.toDataURL()]);
    log.push('ways: ' + Object.keys(G.ways).join(' '));
    saveGame(); const sv = JSON.parse(localStorage.getItem(saveKey('warrior'))); log.push('saved ways: ' + Object.keys(sv.ways || {}).length);
    return { log, shots };
  });
  for (const [n, u] of r.shots) fs.writeFileSync(`${out}/${n}.png`, Buffer.from(u.split(',')[1], 'base64'));
  console.log(r.log.join('\n')); console.log(errs.length ? errs.join('\n') : 'ok'); await b.close();
})();
