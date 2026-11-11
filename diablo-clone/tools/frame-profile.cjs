// Where a frame's time goes, and how it grows with the fight (round 79).
// CPU throttled 4x (a rough stand-in for a mid-range phone). After all sprites are built:
// for each scene and each number of awake enemies on screen, the median ms of update and render,
// and render split by part. Then the cost of building sprites, and of the new fire effects.
// node tools/frame-profile.cjs [gameDir]
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; Math.random = (() => { let s = 5; return () => (s = (s * 16807) % 2147483647) / 2147483647; })(); });
  await p.goto('file://' + path.resolve(process.argv[2] || path.join(__dirname, '../game')) + '/index.html');
  const cdp = await p.context().newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const out = await p.evaluate(() => {
    const T = {}, wrap = name => { const f = window[name]; if (typeof f !== 'function') return; window[name] = function () { const a = performance.now(); try { return f.apply(this, arguments); } finally { T[name] = (T[name] || 0) + performance.now() - a; } }; };
    ['lightPass', 'drawHudLayer', 'ovBlit', 'blit', 'drawGlows', 'drawImpactFlashes', 'castShadow', 'shadowBlob', 'keyLight', 'getSprite', 'flame', 'updateEnemy', 'updateFov'].forEach(wrap);
    const med = a => { const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; };
    const rows = [];
    const scene = (label, level, kind, counts) => {
      newHero('warrior'); G.mode = 'play'; G.story = { f: { met: true, woodTold: true, alphaDead: true, aldoFree: true, woodPaid: true, treeCleared: true, sawChain: true, farmTold: true }, n: 0 }; startLevel(level, 2024); G.actCard = 0; G.talk = null; G.mode = 'play'; hero.hp = 1e6; STAT.maxHp = 1e6;
      if (LV.hub) { const c = HOLLOW.clearings.find(c => c.id === 'glade'); hero.fi = c.s + c.u + 0.5; hero.fj = c.s - c.u + 0.5; }
      const room = LV.outdoor ? null : (LV.rooms.slice().sort((a, c) => c.w * c.h - a.w * a.h)[0]);
      if (room) { hero.fi = room.cx + 0.5; hero.fj = room.cy + 0.5; }
      for (const n of counts) {
        enemies.length = 0;
        for (let k = 0, tries = 0; k < n && tries < 4000; tries++) { const a = Math.random() * 6.283, d = 1.5 + Math.random() * 4.5, fi = hero.fi + Math.cos(a) * d, fj = hero.fj + Math.sin(a) * d; if (blocked(fi, fj)) continue; const e = makeEnemy(kind[k % kind.length], fi, fj, k, LV.diff); e.state = 'hunt'; enemies.push(e); k++; }
        const run = frames => { G.mode = 'play'; G.talk = null; const up = [], re = []; for (const k in T) T[k] = 0; for (let f = 0; f < frames; f++) { input.attack = f % 40 < 20; hero.hp = 1e6; let a = performance.now(); update(1 / 60); const m = performance.now(); warmStep(2); render(); const z = performance.now(); up.push(m - a); re.push(z - m); } return { up: med(up), re: med(re), parts: Object.fromEntries(Object.entries(T).map(([k, v]) => [k, v / frames])) }; };
        run(90); while (warmQueue.length) warmStep(1e9); run(60);   // build everything first
        const r = run(180);
        rows.push({ label, n: enemies.filter(alive).length, update: +r.up.toFixed(1), render: +r.re.toFixed(1), total: +(r.up + r.re).toFixed(1),
          light: +r.parts.lightPass.toFixed(1), chars: +r.parts.ovBlit.toFixed(1), hud: +r.parts.drawHudLayer.toFixed(1), shadows: +((r.parts.castShadow || 0) + (r.parts.shadowBlob || 0) + (r.parts.keyLight || 0)).toFixed(1), glows: +(r.parts.drawGlows || 0).toFixed(1), fx: +(r.parts.drawImpactFlashes || 0).toFixed(1), ai: +(r.parts.updateEnemy || 0).toFixed(1), fov: +(r.parts.updateFov || 0).toFixed(1), other: +(r.re - r.parts.lightPass - r.parts.ovBlit - r.parts.drawHudLayer - (r.parts.drawGlows || 0) - (r.parts.drawImpactFlashes || 0) - (r.parts.blit || 0) - (r.parts.flame || 0)).toFixed(1), flames: +(r.parts.flame || 0).toFixed(1) });
      }
    };
    scene('crypt', 4, ['skeleton', 'archer', 'spearman'], [0, 8, 16, 32]);
    scene('hollow', 1, ['wolf', 'goblin', 'boar'], [0, 8, 16, 32]);
    // sprite building: a monster the cache has never seen, every direction of walk + attack
    const t0 = performance.now(), b0 = spriteBuilds; let bytes = 0, cnt = 0;
    for (let d = 0; d < 8; d++) for (const [clip, n] of [['idle', 1], ['walk', 8], ['attack', 5]]) for (let f = 0; f < n; f++) { const sp = getSprite('ogre', MONSTERS.oclubber.look, d, clip, f, null, SPX); bytes += sp.data.length + (sp.z ? sp.z.length : 0); cnt++; }
    const build = { sprites: spriteBuilds - b0, msEach: +((performance.now() - t0) / Math.max(1, spriteBuilds - b0)).toFixed(1), kbEach: +(bytes / cnt / 1024).toFixed(1) };
    const t1 = performance.now(), b1 = spriteBuilds; for (let d = 0; d < 8; d++) for (let f = 0; f < 8; f++) getSprite('skeleton', MONSTERS.tombguard.look, d, 'walk', f, null, SPX);
    build.smallMsEach = +((performance.now() - t1) / Math.max(1, spriteBuilds - b1)).toFixed(1);
    // the fire: frames with 1 and with 6 blasts burning
    const fire = {};
    for (const n of [0, 1, 6]) { const ts = []; for (let f = 0; f < 60; f++) { if (f % 20 === 0) { G.blasts.length = 0; for (let k = 0; k < n; k++) G.blasts.push({ fi: hero.fi + 2 + k * 0.6, fj: hero.fj - 1 + k * 0.5, r: 1.7, t: 0.4, t0: 0.46, bloom: true, seed: k }); } for (const bl of G.blasts) bl.t = Math.max(0.05, bl.t - 0.012); const a = performance.now(); render(); ts.push(performance.now() - a); } fire[n] = +med(ts).toFixed(1); }
    return { rows, build, fire, screen: [W, H, OW, OH] };
  });
  console.table(out.rows); console.log('sprite build (4x cpu):', JSON.stringify(out.build)); console.log('render ms with 0 / 1 / 6 fire blasts on screen:', JSON.stringify(out.fire)); console.log('screen', out.screen.join(' '));
  if (errs.length) console.log('ERR', errs.slice(0, 2).join('\n')); await b.close();
})();
