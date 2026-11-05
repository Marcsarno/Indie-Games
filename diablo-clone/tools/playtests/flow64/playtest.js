// round 64: the quest flow as a player meets it. A new game in camp: Osric speaks first (no walking
// to him); accept; the den; Aldo freed: QUEST COMPLETE, the town portal prompt (the arrow goes quiet);
// tap the prompt, walk into the portal: in camp Wren speaks with the reward at once, then Hollis with
// the next quest. And the arrow's steadiness: following it from the camp gate toward the den, how
// far it turns in a frame and how often it comes and goes (against the raw way-finding it smooths).
Math.random = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const L = [], shots = {};
const run = n => { for (let k = 0; k < n; k++) { G.t += 1 / 60; update(1 / 60); warmStep(10); } };
const shot = k => { for (let i = 0; i < 200; i++) warmStep(30); render(); shots[k] = cvs.toDataURL(); };
const finish = (pick = 0) => { const T = G.talk; if (!T) return null; const r = { btn: T.btn, reward: T.reward ? T.reward.length : 0, who: T.pages[0][0] }; if (T.reward) T.pick = pick; closeTalk(); return r; };
try {
newHero('warrior'); hero.lvl = 8; recalcHero(); hero.hp = STAT.maxHp = 99999; G.mode = 'play'; G.story = null; startLevel(1, 4242); G.actCard = 0; enemies = [];
// 1. Osric speaks first
{ let k = 0; while (G.mode !== 'talk' && k++ < 200) run(1); L.push({ osricPopsAfterFrames: k, who: G.talk && G.talk.pages[0][0] }); render(); shots['osric'] = cvs.toDataURL(); L.push({ accept: finish(), stage: storyStage() }); run(30); L.push({ banner: G.qBanner && [G.qBanner.title, G.qBanner.line] }); shot('banner'); }
// 2. arrow steadiness, walking where it points (camp to the den door)
{ hero.fi = HUB.camp[0]; hero.fj = HUB.camp[1] - 6; computeFlow(); let jumps = 0, maxTurn = 0, toggles = 0, prevRing = null, prevAng = null, rawJumps = 0, prevRaw = null, frames = 0;
  for (let f = 0; f < 60 * 20; f++) {
    const t = storyTarget(); if (!t || Math.hypot(t[0] - hero.fi, t[1] - hero.fj) < 2) break;
    if (f % 12 === 0) computeFlow();
    render();   // drawStoryMark runs in the HUD
    if (QA.ang !== null) { if (prevAng !== null) { const d = Math.abs(Math.atan2(Math.sin(QA.ang - prevAng), Math.cos(QA.ang - prevAng))); maxTurn = Math.max(maxTurn, d); if (d > 0.35) jumps++; } prevAng = QA.ang; }
    if (prevRing !== null && prevRing !== QA.ring) toggles++; prevRing = QA.ring;
    const w = wayTo(t), raw = Math.atan2(...(() => { const [a, b] = iso(hero.fi, hero.fj), [c, d] = iso(hero.fi + w.dir[0], hero.fj + w.dir[1]); return [d - b, c - a]; })());
    if (prevRaw !== null && Math.abs(Math.atan2(Math.sin(raw - prevRaw), Math.cos(raw - prevRaw))) > 0.35) rawJumps++; prevRaw = raw;
    // walk the way the ring arrow points (screen angle back to the ground)
    const ux = Math.cos(QA.ang ?? raw), uy = Math.sin(QA.ang ?? raw), di = uy + ux * 0.5, dj = uy - ux * 0.5, m = Math.hypot(di, dj) || 1;
    tryMove(hero, di / m * 4.2 / 60, dj / m * 4.2 / 60); G.t += 1 / 60; frames++;
  }
  L.push({ walkFrames: frames, reachedDen: Math.hypot(SIDES.den.door()[0] - hero.fi, SIDES.den.door()[1] - hero.fj) < 3, arrowTurnsOver20deg: jumps, maxTurnPerFrameDeg: +(maxTurn * 57.3).toFixed(1), rawWayfindingJumps: rawJumps, ringToggles: toggles }); }
// 3. the den: free Aldo -> QUEST COMPLETE and the portal prompt
{ G.story.f.alphaDead = true; G.story.f.aldoFree = true; run(3);
  L.push({ stage: storyStage(), banner: G.qBanner && [G.qBanner.title, G.qBanner.line], portalHome: portalHome() }); }
{ G.talk = null; G.mode = 'play'; G.story.f.alphaDead = false; G.story.f.aldoFree = false; G.lastSt = undefined; G.sideBack = { level: 1, seed: 4242, fi: SIDES.den.door()[0] + 1, fj: SIDES.den.door()[1] }; startLevel(1, 4242, 'den'); G.actCard = 0; run(10);
  L.push({ inDen: LV.side }); enemies = []; G.story.f.alphaDead = true; G.story.f.aldoFree = true; run(3);
  run(30); render(); L.push({ inDenStage: storyStage(), banner: G.qBanner && G.qBanner.title, portalHome: portalHome(), prompt: !!UI.tpPrompt, arrowTarget: storyTarget(), tracker: 'see shot' }); shot('complete');
  // tap the prompt: the portal opens; the arrow leads to it
  const r = UI.tpPrompt || { x: 0, y: 0, w: 1, h: 1 }; if (!UI.tpPrompt) L.push({ noPrompt: true, mode: G.mode, side: LV.side, area: LV.area, st: storyStage() }); const b = cvs.getBoundingClientRect(), px = (r.x + r.w / 2) / W * b.width + b.left, py = (r.y + r.h / 2) / H * b.height + b.top;
  cvs.dispatchEvent(new PointerEvent('pointerdown', { clientX: px, clientY: py, pointerId: 3, bubbles: true })); cvs.dispatchEvent(new PointerEvent('pointerup', { clientX: px, clientY: py, pointerId: 3, bubbles: true }));
  run(50); L.push({ portalOpen: !!G.tp, arrowToPortal: !!(G.tp && storyTarget() && Math.hypot(storyTarget()[0] - G.tp.fi, storyTarget()[1] - G.tp.fj) < 0.01) }); shot('portal');
  // walk into it: camp; Wren speaks at once with the reward, then Hollis with the next quest
  if (!G.tp) { L.push({ noPortal: true, mode: G.mode, cast: hero.cast, busy: heroBusy(), msg: G.msg.map(m => m.text) }); usePortal(); run(50); L.push({ afterDirectCall: !!G.tp }); }
  hero.fi = G.tp.fi + 1.2; hero.fj = G.tp.fj; run(10); hero.fi = G.tp.fi; hero.fj = G.tp.fj; let k = 0; while (!LV.hub && k++ < 200) run(1); run(5); G.actCard = 0;
  k = 0; while (G.mode !== 'talk' && k++ < 200) run(1); L.push({ inCamp: !!LV.hub, wrenPopsAfterFrames: k, talk: G.talk && G.talk.pages[0][0], btn: G.talk && G.talk.btn }); render(); shots['reward'] = cvs.toDataURL();
  L.push({ collect: finish(0), stage: storyStage() });
  k = 0; while (G.mode !== 'talk' && k++ < 200) run(1); L.push({ nextPopsAfterFrames: k, who: G.talk && G.talk.pages[0][0], btn: G.talk && G.talk.btn });
  L.push({ accept: finish(), stage: storyStage() }); run(5); L.push({ banner: G.qBanner && [G.qBanner.title, G.qBanner.line] }); }
// 4. farm done in the field -> the chief -> QUEST COMPLETE (Riverlands): prompt; then in camp Hollis's reward, then Osric's letter
{ G.story.n = 4; G.story.f.chiefDead = true; startLevel(2, 11); G.actCard = 0; enemies = []; run(3); L.push({ riv: LV.riv, stage: storyStage(), portalHome: portalHome() });
  startLevel(1, 4242); G.actCard = 0; enemies = []; let k = 0; while (G.mode !== 'talk' && k++ < 200) run(1); L.push({ hollis: G.talk && G.talk.pages[0][0], btn: G.talk && G.talk.btn }); finish(1);
  k = 0; while (G.mode !== 'talk' && k++ < 200) run(1); L.push({ then: G.talk && G.talk.pages[0][0], btn: G.talk && G.talk.btn }); finish(); L.push({ stage: storyStage() }); }
} catch (e) { L.push({ ERR: String(e) }); }
window.__out = { log: L, shots };
