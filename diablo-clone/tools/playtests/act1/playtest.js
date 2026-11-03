// round 26: the Act I flow. The south gate is shut and solid; the King's hall exit leads home to
// the hub with the gate open (and saved); walking through it starts Act II; the mine quest completes
Math.random = (() => { let s = 9; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const L = [], shots = {};
const run = n => { for (let k = 0; k < n; k++) { update(1 / 60); warmStep(10); } };
const shot = k => { G.actCard = 0; for (let i = 0; i < 90 && G.fade > 0; i++) update(1 / 60); for (let i = 0; i < 300; i++) warmStep(30); G.msg = G.msg.slice(-1); render(); shots[k] = cvs.toDataURL(); };
newHero('warrior'); hero.lvl = 12; recalcHero(); hero.hp = STAT.maxHp = 99999; G.mode = 'play'; G.gates = null; startLevel(1, 4242);
G.quests = {}; for (const q of QUESTS) G.quests[q.id] = { step: 0, n: 0, done: false, paid: false };
{ const d = bfs(LV.start.cx, LV.start.cy); L.push({ beyondReachableWhileShut: d[tIdx(Math.floor(HUB.gate[0]) + 2, Math.floor(HUB.gate[1]) + 2)] >= 0 }); }
L.push({ gateSolid: blocked(Math.floor(HUB.gate[0]) + 0.5, Math.floor(HUB.gate[1]) + 0.5), gateOpen: LV.gateOpen });
startLevel(5, 99); const k = boss; damageEnemy(k, 1e7, k.fi - 1, k.fj); run(120);
L.push({ hall: areaName(), kingDead: !alive(k), mineQuestDone: G.quests.mine.done });
hero.fi = LV.stairs.i + 0.5; hero.fj = LV.stairs.j + 0.5; run(80);
L.push({ home: LV.hub, level: LV.level, gateOpen: LV.gateOpen, gateSolid: blocked(Math.floor(HUB.gate[0]) + 0.5, Math.floor(HUB.gate[1]) + 0.5), saved: !!(JSON.parse(localStorage.getItem(saveKey('warrior')) || '{}').gates || {})[0] });
hero.fi = HUB.gate[0] - 1.5; hero.fj = HUB.gate[1] - 1.5; run(10); shot('gate-open');
hero.fi = Math.floor(HUB.gate[0]) + 1.5; hero.fj = Math.floor(HUB.gate[1]) + 1.5; run(80);
L.push({ next: areaName(), level: LV.level, act: LV.act, area: LV.area });
window.__out = { log: L, shots };
