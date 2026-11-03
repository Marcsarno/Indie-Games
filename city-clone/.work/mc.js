// new-map mission walk-through: title -> texts -> pick -> Publix curbside -> chase -> Dave's driveway (teleports between steps)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: 390, height: 844 } }); pg.on('pageerror', e => console.log('ERR', e.message));
  const S = n => pg.screenshot({ path: __dirname + '/r49/' + n + '.png' });
  const st = () => pg.evaluate(() => { const C = window.__city, M = C.missions; return { stage: M.stage, cur: C.cur, rides: C.CHARS.map(c => { const v = C.vehs[c.ride]; return v ? [Math.round(v.x), Math.round(v.z), +v.th.toFixed(2), v.mode] : null; }) }; });
  await pg.goto('http://localhost:' + (process.env.PORT || 8102) + '/?world=cc&fresh', { timeout: 120000 });
  await pg.waitForFunction(() => window.__city && !document.getElementById('title').hidden, null, { timeout: 240000 });
  await pg.click('#t-play');
  await pg.waitForSelector('#phone .pick:not([hidden]) button', { timeout: 90000 }); console.log('picker', JSON.stringify(await st())); await S('1_pick');
  await pg.click('#phone .pick button:nth-child(1)');
  await pg.waitForFunction(() => window.__city.missions.stage === 'toPublix', null, { timeout: 90000 }); await pg.waitForTimeout(1500); console.log('toPublix', JSON.stringify(await st())); await S('2_start');
  // into the curbside box
  await pg.evaluate(() => { const C = window.__city, v = C.drive, D = C.DAVE_; });
  const cb = await pg.evaluate(() => { const C = window.__city, v = C.drive, d = window.__DAVE; v.x = d.curb[0]; v.z = d.curb[1]; v.th = Math.PI / 2; v.vx = v.vz = v.w = 0; return d.curb; });
  for (let i = 0; i < 40; i++) { await pg.evaluate(() => { const v = window.__city.drive, d = window.__DAVE; v.x = d.curb[0]; v.z = d.curb[1]; v.vx = v.vz = 0; }); await pg.waitForTimeout(250); const s = await st(); if (s.stage === 'chase') break; }
  console.log('after curbside', JSON.stringify(await st())); await S('3_chase');
  await pg.waitForTimeout(6000); console.log('cops', await pg.evaluate(() => window.__city.cops ? window.__city.cops.cops.filter(c => c.on).length : 'n/a'));
  // to Dave's driveway
  for (let i = 0; i < 40; i++) { await pg.evaluate(() => { const v = window.__city.drive, d = window.__DAVE; v.x = d.house[0]; v.z = d.house[1]; v.vx = v.vz = 0; }); await pg.waitForTimeout(250); const s = await st(); if (s.stage !== 'chase') break; }
  console.log('at Dave', JSON.stringify(await st())); await pg.waitForTimeout(3000); await S('4_dave');
  for (let i = 0; i < 40; i++) { await pg.waitForTimeout(1000); const s = await st(); if (s.cur === 1 && s.stage === 'chase') break; const ok = await pg.$('#mup:not([hidden]) button'); if (ok) await ok.click(); }
  await pg.waitForTimeout(2500); console.log('chapter 2', JSON.stringify(await st())); await S('5_aaron');
  for (let i = 0; i < 40; i++) { await pg.evaluate(() => { const v = window.__city.drive, d = window.__DAVE; v.x = d.house[0]; v.z = d.house[1]; v.vx = v.vz = 0; }); await pg.waitForTimeout(250); const s = await st(); if (s.stage !== 'chase') break; }
  for (let i = 0; i < 40; i++) { await pg.waitForTimeout(1000); const s = await st(); if (s.cur === 2 && s.stage === 'chase') break; const ok = await pg.$('#mup:not([hidden]) button'); if (ok) await ok.click(); }
  await pg.waitForTimeout(2500); console.log('chapter 3', JSON.stringify(await st())); await S('6_chris');
  await b.close();
})();
