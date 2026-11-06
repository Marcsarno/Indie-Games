// round 26 (round 48c): the Act I flow. The road on (now in the Riverlands, past the Hollow) is shut and
// solid; the King's hall exit leads home to the Hollow, the road on opens (saved); the Hollow's road north
// leads to the Riverlands; walking through the open gate there starts Act II
Math.random = (() => { let s = 9; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const L = [], shots = {};
const run = n => { for (let k = 0; k < n; k++) { update(1 / 60); warmStep(10); } };
const shot = k => { G.actCard = 0; for (let i = 0; i < 90 && G.fade > 0; i++) update(1 / 60); for (let i = 0; i < 300; i++) warmStep(30); G.msg = G.msg.slice(-1); render(); shots[k] = cvs.toDataURL(); };
newHero('warrior'); hero.lvl = 12; recalcHero(); hero.hp = STAT.maxHp = 99999; G.mode = 'play'; G.gates = null; G.story = null;
startLevel(2, 4242);
{ const d = bfs(LV.start.cx, LV.start.cy); L.push({ riv: LV.riv, beyondReachableWhileShut: d[tIdx(Math.floor(LV.gatePos[0]) - 1, Math.floor(LV.gatePos[1]) + 1)] >= 0 }); }
L.push({ gateSolid: blocked(Math.floor(RIV.gate[0]) + 0.5, Math.floor(RIV.gate[1]) + 0.5), gateOpen: LV.gateOpen });
startLevel(5, 99); const k = boss; damageEnemy(k, 1e7, k.fi - 1, k.fj); run(120);
for (let i = 0; i < 900 && G.finale; i++) { if (G.mode === 'talk') closeTalk(); run(1); }   // round 67: Maelis has his say first
L.push({ hall: areaName(), kingDead: !alive(k), storyAfterKing: (G.gates = G.gates || {}, storyStage()) });
hero.fi = LV.stairs.i + 0.5; hero.fj = LV.stairs.j + 0.5; run(80);
L.push({ home: LV.hub, level: LV.level, area: areaName(), saved: !!(JSON.parse(localStorage.getItem(saveKey('warrior')) || '{}').gates || {})[0], treeCleared: !LV.treeBlock });
hero.fi = LV.stairs.i + 0.5; hero.fj = LV.stairs.j + 0.5; run(80);
L.push({ north: areaName(), level: LV.level, gateOpen: LV.gateOpen, gateSolid: blocked(Math.floor(RIV.gate[0]) + 0.5, Math.floor(RIV.gate[1]) + 0.5) });
hero.fi = RIV.gate[0] + 1.5; hero.fj = RIV.gate[1] - 1.5; run(10); shot('gate-open');
hero.fi = LV.gatePos[0]; hero.fj = LV.gatePos[1]; run(80);
L.push({ next: areaName(), level: LV.level, act: LV.act, area: LV.area });
window.__out = { log: L, shots };
