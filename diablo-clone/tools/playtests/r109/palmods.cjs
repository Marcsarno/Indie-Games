// round 109: every Paladin modifier does its thing, and Consecrate's blessing (glow, +20% basic blows): node palmods.cjs
const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve('game/index.html') + '?cine=0');
  const r = await p.evaluate(() => {
    const out = {}, step = n => { for (let k = 0; k < n; k++) { hero.hp = STAT.maxHp; hero.dead = 0; G.t += 1 / 60; update(1 / 60); } };
    const fresh = (mods) => { allocBuffers(270, 480); G.mode = 'title'; beginGame(false, 'paladin'); G.story = { f: { met: true, woodTold: true }, n: 0 }; G.actCard = 0; hero.lvl = 14; hero.mods = mods || {}; recalcHero(); step(5);
      for (const e of enemies) { e.dying = 99; e.hp = 0; }
      const foes = []; for (let k = 0; k < 5; k++) { const e = makeEnemy('skeleton', hero.fi + 2.2 + (k % 2) * 0.5, hero.fj + (k - 2) * 0.45, 0, 6); e.maxHp = e.hp = 5000; e.state = 'hunt'; enemies.push(e); foes.push(e); } return foes; };
    const cast = id => { const i = SKILLS.findIndex(s => s.id === id); hero.mana = 999; CD[id] = 0; step(30); useSkill(i); };
    // Hammer of Light
    fresh({ phammer: 'twin' }); cast('phammer'); out.twinHammers = G.pal.hammers.length;
    fresh({}); cast('phammer'); out.plainHammers = G.pal.hammers.length;
    { const f = fresh({ phammer: 'burst' }); cast('phammer'); let back = 0; for (let k = 0; k < 90; k++) { step(1); if (G.pal.hammers.some(h => h.back)) back++; } out.burstNoReturn = back === 0; out.burstHurt = f.filter(e => e.hp < 5000).length; }
    { const f = fresh({ phammer: 'return' }); cast('phammer'); let st = 0; for (let k = 0; k < 120; k++) { step(1); st = Math.max(st, ...f.map(e => e.stun || 0)); } out.returnStun = +st.toFixed(2); }
    // Consecrate
    fresh({ consec: 'wide' }); cast('consec'); out.wideR = G.pal.consec && G.pal.consec.R;
    { const f = fresh({ consec: 'fire' }); for (const e of f) { e.fi = hero.fi + 1; } cast('consec'); step(60); out.fireSlow = f.some(e => e.slowT > 0); }
    fresh({ consec: 'linger' }); cast('consec'); step(20); out.glowIn = hero.look.ench; hero.fi += 4; step(10); out.lingerAfter = +(hero.blessUntil - G.t).toFixed(1); out.glowLinger = hero.look.ench; step(300); out.glowGone = hero.look.ench || '(none)';
    // blessed basic blow +20%
    { fresh({}); const hitOn = (melee) => { const e = makeEnemy('wolf', hero.fi + 1, hero.fj, 0, 6); e.maxHp = e.hp = 5000; enemies.push(e); G.palMelee = melee; damageEnemy(e, 100, hero.fi, hero.fj); G.palMelee = false; const d = 5000 - e.hp; e.dying = 99; e.hp = 0; return d; };
      const plainMelee = hitOn(true), plainSkill = hitOn(false); cast('consec'); step(20); out.blessedBasic = +(hitOn(true) / plainMelee).toFixed(2); out.blessedSkill = +(hitOn(false) / plainSkill).toFixed(2); }
    // Seraph's Fall
    { const f = fresh({ seraph: 'quake' }); cast('seraph'); step(60); out.quakeStun = Math.max(...f.map(e => e.stun || 0)) > 1; }
    fresh({ seraph: 'feathers' }); cast('seraph'); step(50); out.feathers = (G.pal.feathers || []).length;
    fresh({ seraph: 'again' }); cast('seraph'); step(60); out.secondDiveOpen = hero.serFree > G.t && CD.seraph === 0;
    // Judgment
    fresh({ judge: 'gavel' }); cast('judge'); out.gavelCd = +CD.judge.toFixed(2); out.judgeCdPlain = SKILLS.find(s => s.id === 'judge').cd;
    { const f = fresh({ judge: 'sentence' }); cast('judge'); step(60); const m = Math.max(...f.map(e => (e.palMark || 0) - G.t)); out.sentenceMark = +m.toFixed(1); }
    { const f = fresh({ judge: 'absolve' }); hero.ult = 0; cast('judge'); step(60); const e = f.find(e => e.palMark > G.t) || f[0]; e.palMark = G.t + 5; e.hp = 1; damageEnemy(e, 10, hero.fi, hero.fj); out.absolveFaith = hero.ult; }
    return out; });
  console.log(JSON.stringify(r, null, 1)); console.log(errs.slice(0, 3).join('\n') || 'no page errors'); await b.close(); })();
