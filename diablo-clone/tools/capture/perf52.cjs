// round 52: frame times at phone-like speed (CPU slowed 4x) for the heavy moments; for each frame the
// work time (update + render) and whether the game's own slow motion was on. node perf52.cjs [rate]
const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } }); await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + path.resolve(__dirname, '../../game/index.html'));
  const cdp = await p.context().newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: +(process.argv[2] || 4) });
  const res = await p.evaluate(() => {
    Math.random = (() => { let s = 3; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    const out = {};
    const scene = (name, cls, level, act, secs = 4.5) => {
      newHero(cls); hero.lvl = 12; recalcHero(); hero.hp = STAT.maxHp = 1e7; G.mode = 'play'; startLevel(level, 777); G.actCard = 0; G.bossIntro = 0;
      // stand in the busiest room, everyone awake and close
      let best = LV.rooms[1], bn = -1; for (const r of LV.rooms) { const n = enemies.filter(e => Math.hypot(e.fi - r.cx, e.fj - r.cy) < 7).length; if (n > bn) { bn = n; best = r; } }
      hero.fi = best.cx + 0.5; hero.fj = best.cy + 0.5; for (const e of enemies) if (Math.hypot(e.fi - hero.fi, e.fj - hero.fj) < 9) e.state = 'hunt';
      for (let i = 0; i < 400; i++) warmStep(50); for (let i = 0; i < 30; i++) { update(1 / 60); render(); }
      hero.ult = 100; act();
      const fr = []; const t = () => performance.now(); let tl = 0, tu = 0; const LP = window.lightPass; window.lightPass = (...a) => { const s0 = t(); const r = LP(...a); tl += t() - s0; return r; };
      for (let i = 0; i < secs * 60; i++) { const a = t(); if (i % 20 === 0 && cls !== 'mage') { input.attack = true; heroAttack(); } const b0 = spriteBuilds, c0 = spriteCache.size, bu0 = buildBudget.used; const u0 = t(); update(1 / 60); tu += t() - u0; render(); fr.push([t() - a, G.slowmo > 0 ? 1 : 0, spriteBuilds - b0, spriteCache.size < c0 ? 1 : 0]); }
      window.lightPass = LP;
      input.attack = false;
      const ms = fr.map(f => f[0]).sort((a, b) => a - b), q = k => +ms[Math.floor(ms.length * k)].toFixed(1);
      out[name] = { near: bn, p50: q(0.5), p95: q(0.95), max: +ms[ms.length - 1].toFixed(1), over33: fr.filter(f => f[0] > 33).length, over50: fr.filter(f => f[0] > 50).length, slowmoFrames: fr.filter(f => f[1]).length, updateAvg: +(tu / fr.length).toFixed(1), builds: fr.reduce((a, f) => a + f[2], 0), cacheCleared: fr.filter(f => f[3]).length, cacheSize: spriteCache.size, worst: fr.map((f, i) => [i, +f[0].toFixed(0), f[2]]).sort((a, b) => b[1] - a[1]).slice(0, 4), lightAvg: +(tl / fr.length).toFixed(1), avg: +(fr.reduce((a, f) => a + f[0], 0) / fr.length).toFixed(1) };
    };
    scene('quiet (walking)', 'warrior', 3, () => { for (const e of enemies) e.state = 'sleep', e.fi = 1, e.fj = 1; });
    scene('fight (warrior)', 'warrior', 3, () => {});
    scene('mage: arcane storm', 'mage', 3, () => useUlt());
    scene('mage: meteor', 'mage', 3, () => { const i = SKILLS.findIndex(s => s.id === 'meteor'); CD.meteor = 0; hero.mana = 1e4; useSkill(i); });
    scene('warrior: wrath', 'warrior', 3, () => useUlt());
    scene('ranger: rain', 'ranger', 3, () => useUlt());
    scene('mage: storm in hell', 'mage', 13, () => useUlt());
    return out;
  });
  for (const [k, v] of Object.entries(res)) console.log(k.padEnd(22), JSON.stringify(v));
  await b.close(); })();
