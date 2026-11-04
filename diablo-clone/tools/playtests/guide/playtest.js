// round 45: the two guided steps on a fresh save: the wolf's weapon (freeze, bag, item, equip)
// and the first skill modifier at level 3 (freeze, bag, skills tab, the modifier)
Math.random = (() => { let s = 11; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const L = [], shots = {};
const run = n => { for (let k = 0; k < n; k++) { update(1 / 60); warmStep(10); } };
const shot = k => { G.actCard = 0; for (let i = 0; i < 300; i++) warmStep(30); render(); shots[k] = cvs.toDataURL(); };
const tapAt = r => invTap([r.x + r.w / 2, r.y + r.h / 2]);
for (const cls of ['warrior', 'mage', 'ranger']) {
  newHero(cls); G.mode = 'play'; G.story = null; G.guide = null; startLevel(1, 4242); G.actCard = 0; run(3);
  const w0 = itemName(hero.equip.weapon);
  const wolves = enemies.filter(e => e.id === 'wolf' && e.hp > 0).slice(0, 2);
  hero.fi = wolves[0].fi - 1; hero.fj = wolves[0].fj; for (const e of enemies) if (!wolves.includes(e)) e.state = 'sleep';
  for (const w of wolves) { damageEnemy(w, 99999, w.fi - 1, w.fj); run(2); }
  const g = groundItems.find(x => x.guide);
  L.push({ cls, dropped: g && itemName(g.item), beats: g && itemScore(g.item) - itemScore(hero.equip.weapon) });
  if (!g) continue;
  hero.fi = g.fi; hero.fj = g.fj; run(60);
  const t0 = G.t; const e0 = enemies.find(e => e.hp > 0 && e.state !== 'sleep');
  L.push({ guide: G.guide && G.guide.kind, step: guideStep(), frozen: guideFrozen() });
  const hp0 = hero.hp, fi0 = hero.fi; input.mx = 1; run(60); L.push({ stillWhileFrozen: hero.fi === fi0 }); input.mx = 0;
  if (cls === 'warrior') shot('w-1-frozen');
  openInv('inv'); run(2); L.push({ step: guideStep() }); if (cls === 'warrior') shot('w-2-item');
  tapAt(L_ = invLayout().bag[hero.bag.indexOf(G.guide.item)]); render(); L.push({ step: guideStep() }); if (cls === 'warrior') shot('w-3-equip');
  const eq = UI.invBtns.find(b => b.label === 'EQUIP'); eq.on(); run(2); L.push({ step: guideStep(), done: !!hero.tut.gear, guideGone: !G.guide, weapon: w0 + ' -> ' + itemName(hero.equip.weapon), flash: INV.flash && INV.flash.text });
  if (cls === 'warrior') shot('w-4-better');
  closeInv(); run(2);
  // level 3: the first modifier opens
  while (hero.lvl < 3) gainXp(xpFor(hero.lvl)); run(30);
  L.push({ lvl: hero.lvl, modGuide: G.guide && G.guide.kind, step: guideStep(), frozen: guideFrozen() });
  if (cls === 'mage') shot('m-1-frozen');
  openInv('inv'); render(); L.push({ step: guideStep() }); if (cls === 'mage') shot('m-2-tab');
  tapAt(invLayout().tabs.skills); render(); L.push({ mode: G.mode, step: guideStep() }); if (cls === 'mage') shot('m-3-chip');
  { const r = skillsGuideRect(); skillsTap([r.x + 4, r.y + 4]); run(2); render(); }
  if (guideStep() === 'chip') { const r = skillsGuideRect(); skillsTap([r.x + 4, r.y + 4]); run(2); render(); }   // (the skill's button first, then its modifier)
  L.push({ step: guideStep() }); if (cls === 'mage') shot('m-4-choose');
  { const A = skillsLayout().act; skillsTap([A.x + 4, A.y + 4]); run(2); render(); }
  L.push({ step: guideStep(), done: !!hero.tut.mod, mods: JSON.stringify(hero.mods) }); if (cls === 'mage') shot('m-5-chosen');
  closeInv(); run(2);
  // saved and never again
  G.mode = 'play'; saveGame(); const d = loadSave(cls); L.push({ savedTut: JSON.stringify(d.hero.tut) });
  // later levels don't freeze again
  gainXp(xpFor(hero.lvl)); run(5); L.push({ lvl: hero.lvl, noGuide: !G.guide });
}
// an old save past level 4 never gets the weapon
newHero('warrior'); hero.lvl = 6; hero.tut = {}; G.mode = 'play'; G.guide = null; startLevel(1, 4242); run(3);
for (const w of enemies.filter(e => e.id === 'wolf').slice(0, 3)) { damageEnemy(w, 99999, w.fi - 1, w.fj); run(2); }
L.push({ oldSaveNoDrop: !groundItems.some(x => x.guide) });
window.__out = { log: L, shots };
