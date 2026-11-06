// round 67: a bot that plays Act I from a new game like a steady player: follows the quest arrow
// (storyTarget) along walkable paths, fights what it meets (the class's attack plus its skills when
// two or more foes are close or a leader is near), drinks below 40% life, talks to people, takes
// the first reward, wears the best gear now and then, takes the portal home when it's offered.
// It reports game minutes and hero level at each story step, deaths and potions, until the end screen.
// Set window.__cls before running; window.__cap = game minutes to give up at.
(function () {
  const cls = window.__cls || 'warrior', CAP = (window.__cap || 50) * 60, dt = 1 / 30;
  Math.random = (() => { let s = window.__seed || 31; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  newHero(cls); G.mode = 'play'; G.story = { f: {}, n: 0 }; startLevel(1, 4242); G.actCard = 0;
  const marks = [], seen = {}; let t = 0, last = '', stuckT = 0, lastPos = [hero.fi, hero.fj], cache = { key: '', d: null }, drinks = 0, jig = 0, back = 0, backFrom = null;
  let minHp = 1; const mark = (k) => { if (seen[k]) return; seen[k] = 1; marks.push([k, +(t / 60).toFixed(1), hero.lvl]); };
  const pathDir = (tg) => {
    const ti = Math.floor(tg[0]), tj = Math.floor(tg[1]), key = LV.level + ':' + LV.seed + ':' + (LV.side || '') + ':' + ti + ',' + tj;
    if (cache.key !== key) { cache.key = key; cache.d = bfs(ti, tj); }
    const d = cache.d, i = Math.floor(hero.fi), j = Math.floor(hero.fj), here = d[tIdx(i, j)];
    if (here <= 1) return [tg[0] - hero.fi, tg[1] - hero.fj];
    let best = null, bv = here < 0 ? 1e9 : here;
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
      const ii = i + a, jj = j + b; if (ii < 0 || jj < 0 || ii >= MW || jj >= MH) continue;
      const v = d[tIdx(ii, jj)]; if (v < 0) continue;
      if (a && b && (d[tIdx(i + a, j)] < 0 || d[tIdx(i, j + b)] < 0)) continue;   // no corner cutting
      if (v < bv) { bv = v; best = [ii + 0.5 - hero.fi, jj + 0.5 - hero.fj]; }
    }
    return best || [tg[0] - hero.fi, tg[1] - hero.fj];
  };
  const go = (v) => { const l = Math.hypot(v[0], v[1]); if (l < 0.01) { input.mx = input.my = 0; return; } input.mx = (v[0] - v[1]) / l * 0.75; input.my = (v[0] + v[1]) / l * 0.75; };
  const ranged = cls !== 'warrior', range = ranged ? 5.5 : heroReach() + 0.15;
  while (t < CAP) {
    t += dt; G.guide = null; G.actCard = 0;
    if (G.mode === 'talk') { if (G.talk.reward) G.talk.pick = 0; closeTalk(); }
    if (G.mode === 'end') { mark('END'); break; }
    if (G.mode === 'inv' || G.mode === 'skills') G.mode = 'play';
    if (hero.dead && !hero.deadMarked) { hero.deadMarked = 1; mark('DIED@' + areaName() + '#' + Math.round(t) + ' by ' + [...new Set(enemies.filter(e => alive(e) && Math.hypot(e.fi - hero.fi, e.fj - hero.fj) < 5).map(e => e.id + (e.champ ? '*' : '')))].join(',')); }
    if (!hero.dead) hero.deadMarked = 0;
    if (hero.dead) { if (hero.dead > 2.2) respawn(); G.t += dt; update(dt); continue; }
    const st = storyStage(); if (st !== last) { mark(st + (LV.side ? '@' + LV.side : '')); last = st; }
    mark(areaName());
    input.attack = false; input.mx = input.my = 0; minHp = Math.min(minHp, hero.hp / STAT.maxHp);
    if (hero.hp < STAT.maxHp * 0.4 && hero.potions > 0 && !(hero.potT > G.t)) { drinkPotion(); drinks++; hero.potT = G.t + 1.5; }
    if (Math.floor(t) % 20 === 0 && Math.floor(t - dt) % 20 !== 0) { try { wearBest(); } catch (e) {} G.mode = 'play'; }
    if (storyOn() && portalHome() && !G.tp && !G.fadeTo && !LV.hub) usePortal();
    // foes: the nearest awake or in sight
    let foe = null, fd = 1e9, near = 0;
    for (const e of enemies) { if (!alive(e)) continue; const d = Math.hypot(e.fi - hero.fi, e.fj - hero.fj); if (d < 3.2) near++; if (d < fd && d < (window.__rush ? 7 : 9.5) && LV.vis[tIdx(Math.floor(e.fi), Math.floor(e.fj))] > 0.3 && los(hero.fi, hero.fj, e.fi, e.fj)) { fd = d; foe = e; } }
    const tg = storyTarget();
    if (foe && (!window.__rush || fd < 6 || (tg && Math.hypot(tg[0] - foe.fi, tg[1] - foe.fj) < 2))) {
      hero.dir = dirFrom(foe.fi - hero.fi, foe.fj - hero.fj);
      if (fd > range) go(pathDir([foe.fi, foe.fj])); else input.attack = true;
      if (near >= 2 || foe.def.unique || foe.champ) for (let k = 0; k < SKILLS.length; k++) { const s = SKILLS[k]; if (hero.lvl >= s.lvl && !(CD[s.id] > 0) && hero.mana >= (s.mana || 0) && Math.random() < 0.15) { useSkill(k); break; } }
      if (hero.ult >= 100 && hero.lvl >= ULT_LVL && (foe.def.unique || near >= 3)) useUlt();
    } else if (tg) {
      const d = Math.hypot(tg[0] - hero.fi, tg[1] - hero.fj);
      const n = tg.npc ? npcs.find(q => Math.abs(q.fi - tg[0]) < 0.01 && Math.abs(q.fj - tg[1]) < 0.01) : null;
      if (n && d < 1.4) { if (!(hero.tradeT > G.t)) { hero.tradeT = G.t + 0.8; trade(n); } }
      else go(pathDir(tg));
    } else { const n = npcs.find(q => q.role === 'priest'); if (n) go(pathDir([n.fi, n.fj])); }
    if (back > 0) { back -= dt; jig = 0; let bd = [1, 1]; for (let q = 0; q < 8; q++) { const a = q * 0.785, v = [Math.cos(a), Math.sin(a)]; if (!blocked(hero.fi + v[0] * 2, hero.fj + v[1] * 2)) { bd = v; break; } } go(bd); }   // standing on a door that has not re-armed: step off it first
    else if (jig > 0) { jig -= dt; go([Math.cos(jig * 3 + t), Math.sin(jig * 3 + t)]); }
    G.t += dt; update(dt);
    // stuck: no progress for 6 s while walking somewhere
    if (Math.hypot(hero.fi - lastPos[0], hero.fj - lastPos[1]) > 0.8) { lastPos = [hero.fi, hero.fj]; stuckT = 0; } else if ((stuckT += dt) > 6) { stuckT = 0; jig = 1.2; if (tg && Math.hypot(tg[0] - hero.fi, tg[1] - hero.fj) < 0.9) { back = 1.0; backFrom = tg; } mark('stuck@' + areaName() + '#' + Math.round(t) + ' at ' + hero.fi.toFixed(1) + ',' + hero.fj.toFixed(1) + ' tg ' + (tg ? tg.map(v => v.toFixed(1)).join(',') : '-') + ' foe ' + (foe ? foe.id + ' ' + fd.toFixed(1) + ' hp' + Math.round(foe.hp) : '-') + ' mode ' + G.mode + ' fade ' + G.fade.toFixed(2) + ' up ' + G.upArmed + ' armedDen ' + G.armed_den + ' fadeTo ' + !!G.fadeTo + ' side ' + LV.side + ' sideBack ' + !!G.sideBack + ' hp ' + Math.round(hero.hp) + ' dead ' + hero.dead); cache.key = ''; }
  }
  return { cls, minutes: +(t / 60).toFixed(1), lvl: hero.lvl, deaths: (hero.stats || {}).deaths, kills: (hero.stats || {}).kills, potionsDrunk: drinks, gold: hero.gold, minHp: +minHp.toFixed(2), end: G.mode === 'end' || !!seen.END, stage: storyStage(), area: areaName(), marks };
})
