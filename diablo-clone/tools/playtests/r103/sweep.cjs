// round 103: the dungeon handoff's sweep: N seeds per floor kind (Act I's crypt floors and side areas):
// first-try pass rate, worst attempts, failure reasons, and the per-floor averages. node sweep.cjs [N]
const { chromium } = require('playwright'); const path = require('path');
(async () => { const N = +(process.argv[2] || 100);
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve('game/index.html') + '?cine=0');
  const r = await p.evaluate((N) => {
    newHero('warrior'); const out = [];
    const reasons = {}; const tg0 = tryGen; tryGen = function (...a) { const ok = tg0(...a); if (!ok) for (const x of (LV.genFail || ['layout shape'])) reasons[x] = (reasons[x] || 0) + 1; LV.genFail = null; return ok; };
    const kinds = [];
    for (let l = 0; l < 8; l++) { const A = areaOf(l); if (A.kind === 'dungeon' && A.act === 0 && !A.arena && !A.loop) kinds.push([l, null, 'CRYPT L' + l]); }
    const hub = (() => { for (let l = 0; l < 4; l++) if (areaOf(l).hub) return l; return 1; })(), riv = (() => { for (let l = 0; l < 6; l++) if (areaOf(l).riv) return l; return 2; })();
    for (const s of ['den', 'tower', 'barrow', 'barrow2', 'cellar']) kinds.push([SIDES[s].at === 'riv' ? riv : hub, s, s.toUpperCase()]);
    for (const [lv, side, name] of kinds) {
      for (const k in reasons) delete reasons[k];
      const m = { name, n: 0, fail: 0, first: 0, worst: 0, ms: 0, rooms: 0, loops: 0, crit: 0, dead: 0, vault: 0, shrine: 0, arena: 0, chests: 0, spawns: 0, champs: 0, onWall: 0, floor: 0, relaxed: 0, goalSteps: 0 };
      for (let n = 0; n < N; n++) {
        const seed = (n * 2654435761 + lv * 97 + (side ? side.length * 31 : 0)) >>> 0, t0 = performance.now();
        try { genLevel(lv, seed, side); } catch (e) { m.fail++; continue; }
        m.n++; m.ms += performance.now() - t0; const at = LV.genAttempts || 1; if (at === 1) m.first++; m.worst = Math.max(m.worst, at); if (at > 20) m.relaxed++;
        m.rooms += LV.rooms.length; m.loops += LV.loops || 0; m.crit += LV.rooms.filter(r => r.crit).length / LV.rooms.length; m.dead += LV.rooms.filter(r => r.dead).length;
        m.vault += LV.vault ? 1 : 0; m.shrine += LV.shrine ? 1 : 0; m.arena += LV.arenaRoom >= 0 ? 1 : 0;
        m.chests += LV.decor.filter(d => d.kind === 'chest').length; m.spawns += LV.spawns.length; m.champs += LV.spawns.filter(s => s.champ).length;
        m.onWall += LV.stairs.face ? 1 : 0; let fl = 0; for (let k = 0; k < MW * MH; k++) if (LV.map[k] === FLOOR) fl++; m.floor += fl;
        const g = LV.rooms[LV.sideCfg ? LV.leaderRoom : LV.stairs.room], d = bfs(LV.start.cx, LV.start.cy); m.goalSteps += d[tIdx(g.cx, g.cy)];
      }
      const a = k => (m[k] / Math.max(1, m.n)).toFixed(k === 'crit' ? 2 : 1);
      out.push(`${name.padEnd(9)} ok ${m.n}/${N} first ${Math.round(m.first / Math.max(1, m.n) * 100)}% worst ${m.worst} relaxed ${m.relaxed} | ${a('ms')} ms | rooms ${a('rooms')} loops ${a('loops')} mainroute ${a('crit')} dead ${a('dead')} | vault ${a('vault')} shrine ${a('shrine')} ambush ${a('arena')} | chests ${a('chests')} monsters ${a('spawns')} elites ${a('champs')} | stairs on wall ${a('onWall')} floor ${a('floor')} goal ${a('goalSteps')} steps | ${MW}x${MH}`);
      out.push('   fails: ' + JSON.stringify(Object.entries(reasons).sort((x, y) => y[1] - x[1]).slice(0, 6)));
    }
    return out; }, N);
  console.log(r.join('\n')); console.log(errs.length ? 'PAGE ERR ' + errs.slice(0, 2).join('\n') : 'no page errors'); await b.close(); })();
