// round 67: the Act I finale. The King falls; Maelis appears in a green flash, the game pauses for
// his words, he walks off and vanishes; the story notes it. Back in camp Osric's thanks (on the
// king quest) ends with COLLECT and the end screen; KEEP PLAYING goes back to the game. Also: an old
// save past the King (no maelisSeen) does not replay the scene when Osric is already paid.
Math.random = (() => { let s = 17; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const L = [], shots = {};
const step = (n, dt = 1 / 30) => { for (let i = 0; i < n; i++) { G.t += dt; update(dt); } };
const snap = k => { render(); shots[k] = cvs.toDataURL(); };
newHero('mage'); hero.lvl = 8; recalcHero(); G.mode = 'play'; hero.hp = STAT.maxHp = 9999;
const F = { met: true, woodTold: true, alphaDead: true, aldoFree: true, woodPaid: true, sawChain: true, farmTold: true, chiefDead: true, farmPaid: true, letterRead: true, mineOpen: true };
G.story = { f: Object.assign({}, F), n: 0 };
let lv = 0; for (let k = 1; k <= 8; k++) if (areaOf(k).arena === 'king') { lv = k; break; }
startLevel(lv, 5150); G.actCard = 0; G.bossIntro = 0;
L.push({ level: lv, area: areaName(), boss: boss && boss.id, storyOn: storyOn(), stage: storyStage() });
for (const e of enemies) if (e !== boss) e.hp = -1;
enemies = enemies.filter(e => e === boss); hero.fi = boss.fi + 2; hero.fj = boss.fj + 1;
damageEnemy(boss, 999999, hero.fi, hero.fj, false);
step(30); L.push({ after1s: !!G.finale, ph: G.finale && G.finale.ph });
step(60); const m = npcs.find(n => n.maelis); L.push({ maelis: !!m, ph: G.finale && G.finale.ph, dist: m ? +Math.hypot(m.fi - hero.fi, m.fj - hero.fj).toFixed(1) : null });
snap('appear');
step(45); L.push({ mode: G.mode, talking: G.talk ? G.talk.pages[0][0] : null }); G.msg = []; snap('talk');
closeTalk(); step(15); snap('flee'); step(40);
L.push({ gone: !npcs.some(n => n.maelis), finale: !!G.finale, maelisSeen: !!storyF().maelisSeen, stage: storyStage() });
// camp: Osric (the King's stairs lead home and open the gate, which marks him dead)
G.gates = { 0: true };
startLevel(1, 4242); G.actCard = 0; enemies = []; G.qBanner = null;
const o = npcs.find(n => n.role === 'priest'); hero.fi = o.fi + 1; hero.fj = o.fj + 0.5; step(3);
if (G.mode !== 'talk') talkTo(o);
L.push({ campMode: G.mode, osric: G.talk && G.talk.pages.map(p => p[1].slice(0, 40)), btn: G.talk && G.talk.btn });
if (G.talk && G.talk.reward) G.talk.pick = 0;
if (G.talk) closeTalk(); step(5);
hero.stats = { t: 1342, deaths: 2, kills: 311 }; G.endStats = null; if (G.mode === 'end') G.endStats = Object.assign({}, hero.stats, { lvl: hero.lvl });
L.push({ endMode: G.mode, endShown: !!storyF().endShown });
for (let i = 0; i < 120; i++) render(); snap('end');
endTap([W / 2, H - 40]); L.push({ afterTap: G.mode });
step(30); L.push({ again: G.mode, stage: storyStage() });
window.__out = { log: L, shots };
