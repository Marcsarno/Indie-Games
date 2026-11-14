// real frame cost through a bot's Act I at 4x CPU throttle: update + render per frame; over 50 ms the game itself slows
const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const cls = process.argv[2] || 'paladin', game = process.argv[3] || '/home/user/indie-games/diablo-clone/game', R = '/home/user/indie-games/diablo-clone/tools/playtests/run67';
  const b = await chromium.launch(), p = await b.newPage(); await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + game + '/index.html');
  const cdp = await p.context().newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const inject = `(() => { const F = window.__F = { all: [], fight: [], wings: [] }; let n = 0;
    const u0 = update; update = function (dt) { const t0 = performance.now(); const r = u0(dt); if (G.mode !== 'play') return r; const t1 = performance.now(); if (++n % 3 === 0) { render(); const t2 = performance.now(), ms = (t1 - t0) + (t2 - t1); F.all.push(ms); const foes = enemies.filter(e => alive(e) && e.state !== 'sleep' && Math.hypot(e.fi - hero.fi, e.fj - hero.fj) < 9).length; if (foes >= 4) F.fight.push(ms); if (hero.wing) F.wings.push(ms); } return r; }; })();`;
  await p.evaluate(`window.__cls='${cls}';window.__cap=6;window.__seed=31;${inject};(${fs.readFileSync(R + '/bot.js', 'utf8')})()`).catch(e => ({ err: String(e) }));
  const F = await p.evaluate(() => window.__F);
  const st = a => { if (!a.length) return 'none'; const s = a.slice().sort((x, y) => x - y), q = f => s[Math.floor((s.length - 1) * f)].toFixed(1); return `n ${a.length} median ${q(0.5)} p90 ${q(0.9)} p99 ${q(0.99)} max ${q(1)} ms | over 33ms ${(100 * a.filter(x => x > 33).length / a.length).toFixed(1)}%  over 50ms ${(100 * a.filter(x => x > 50).length / a.length).toFixed(1)}%`; };
  console.log(cls, game.includes('head') ? 'BEFORE' : 'NOW'); console.log('  all   ', st(F.all)); console.log('  fights', st(F.fight)); console.log('  wings ', st(F.wings));
  await b.close(); })();
