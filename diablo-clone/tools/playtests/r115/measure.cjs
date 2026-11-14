// how much of a bot's Act I is slowed: slow motion (and who set it), hero freezes (hitstop), boss camera freezes
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => { const cls = process.argv[2] || 'paladin', R = '/home/user/indie-games/diablo-clone/tools/playtests/run67';
  const b = await chromium.launch(), p = await b.newPage(); await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file:///home/user/indie-games/diablo-clone/game/index.html');
  const inject = `(() => { const T = window.__T = { real: 0, slow: 0, stop: 0, cam: 0, src: {}, n: {} };
    let sm = 0; Object.defineProperty(G, 'slowmo', { get: () => sm, set: v => { if (v > sm + 0.01) { const l = (new Error().stack.split('\\n')[2] || '').trim().replace(/\\(.*\\/js\\//, '(').replace(/:\\d+\\)$/, ')'); const k = l.split(' ')[1] + ' ' + (l.match(/\\((.*)\\)/) || [])[1]; T.src[k] = (T.src[k] || 0) + (v - Math.max(0, sm)) / 0.35 * 0.65; T.n[k] = (T.n[k] || 0) + 1; } sm = v; }, configurable: true });
    const u0 = update; update = function (dt) { if (G.mode === 'play') { T.real += dt; if (sm > 0) T.slow += dt * 0.65; if (hero.stop > 0) T.stop += dt; if (G.bossCam && G.bossCam.freeze) T.cam += dt; } return u0(dt); }; })();`;
  const r = await p.evaluate(`window.__cls='${cls}';window.__cap=60;window.__seed=31;${inject};(${fs.readFileSync(R + '/bot.js', 'utf8')})()`).catch(e => ({ err: String(e) }));
  const T = await p.evaluate(() => window.__T);
  const pct = x => (100 * x / T.real).toFixed(1) + '%';
  console.log(cls, 'game min', (T.real / 60).toFixed(1), 'kills', r.kills, `| slow-mo lost ${pct(T.slow)}  hero frozen ${pct(T.stop)}  boss-cam freeze ${pct(T.cam)}`);
  console.log('  slow-mo by source (s lost, times):', Object.entries(T.src).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v.toFixed(1)}s x${T.n[k]}`).join(' | '));
  await b.close(); })();
