// Seed sweep (round 26): generates N seeds per level and reports pass rate, attempts, generation
// time and layout metrics, and checks the finished levels the way the validator does.
// node tools/seed-sweep.cjs [N=300] [levels=3,4,8,9,13,14,2,7,1] [--json out.json]
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => {
  const N = +(process.argv[2] || 300), levels = (process.argv[3] || '3,4,8,9,13,14,2,7,12,1,5,10,15').split(',').map(Number);
  const jo = process.argv.indexOf('--json'), jsonOut = jo > 0 ? process.argv[jo + 1] : null;
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + path.resolve(__dirname, '../game/index.html'));
  const res = await p.evaluate(([N, levels]) => {
    newHero('warrior');
    const out = {};
    const q = (a, f) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * f))]; };
    for (const lv of levels) {
      const m = { fails: [], attempts: [], ms: [], rooms: [], dead: [], loops: [], stairDist: [], spawns: [], champs: [], champGap: [], nearStart: 0, blocked: 0, unreach: 0, chests: [], kind: areaOf(lv).kind + (areaOf(lv).arena ? ':' + areaOf(lv).arena : '') };
      for (let n = 0; n < N; n++) {
        const seed = (n * 2654435761 + lv * 97) >>> 0, t0 = performance.now();
        try { genLevel(lv, seed); } catch (e) { m.fails.push(seed); continue; }
        m.ms.push(performance.now() - t0); m.attempts.push(LV.genAttempts || 1);
        const d = bfs(LV.start.cx, LV.start.cy);
        m.stairDist.push(d[tIdx(LV.stairs.i, LV.stairs.j)]);
        m.rooms.push(LV.rooms.length); m.dead.push(LV.rooms.filter(r => r.dead).length); m.loops.push(LV.loops || 0);
        m.spawns.push(LV.spawns.length); m.chests.push(LV.decor.filter(x => x.kind === 'chest').length);
        const ch = LV.spawns.filter(s => s.champ); m.champs.push(ch.length);
        for (const s of LV.spawns) {
          const k = tIdx(Math.floor(s.fi), Math.floor(s.fj));
          if (d[k] < 0) m.unreach++;
          else if (!LV.outdoor && !LV.arena && d[k] < SAFE_STEPS) m.nearStart++;
          if (clearance(s.fi, s.fj, 0.28)) m.blocked++;
        }
        for (let a = 0; a < ch.length; a++) { const dd = bfs(Math.floor(ch[a].fi), Math.floor(ch[a].fj)); for (let c = a + 1; c < ch.length; c++) m.champGap.push(dd[tIdx(Math.floor(ch[c].fi), Math.floor(ch[c].fj))]); }
      }
      const sum = k => { const a = m[k]; if (!a.length) return '-'; return `${q(a, 0.05)}/${q(a, 0.5)}/${q(a, 0.95)}`; };
      out[lv] = { kind: m.kind, ok: N - m.fails.length, fails: m.fails.slice(0, 5), attemptsP50_P95_max: `${q(m.attempts, 0.5)}/${q(m.attempts, 0.95)}/${Math.max(...m.attempts)}`, msP50_P99: `${q(m.ms, 0.5).toFixed(1)}/${q(m.ms, 0.99).toFixed(1)}`,
        rooms: sum('rooms'), deadEnds: sum('dead'), loops: sum('loops'), stairDist: sum('stairDist'), spawns: sum('spawns'), champs: sum('champs'), champGapMin: m.champGap.length ? Math.min(...m.champGap) : '-', chests: sum('chests'), spawnsUnreachable: m.unreach, spawnsBlocked: m.blocked, spawnsNearStart: m.nearStart };
    }
    return out;
  }, [N, levels]);
  for (const k in res) console.log('L' + k, JSON.stringify(res[k]));
  if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(res, null, 1));
  if (errs.length) console.log('ERR', errs.slice(0, 3).join('\n'));
  const bad = Object.values(res).some(r => r.ok < N || r.spawnsUnreachable || r.spawnsBlocked || r.spawnsNearStart);
  console.log(bad ? 'SWEEP: PROBLEMS FOUND' : 'SWEEP: ALL CLEAN'); await b.close(); process.exit(bad ? 1 : 0);
})();
