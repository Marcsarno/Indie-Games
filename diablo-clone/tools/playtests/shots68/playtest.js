// round 68 prep: gameplay screenshots of a crypt floor for concept art (a corridor, a room with a fight, the great hall)
Math.random = (() => { let s = 21; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const shots = {}, L = [];
newHero('warrior'); hero.lvl = 6; recalcHero(); G.mode = 'play'; G.story = null; G.gates = null;
startLevel(3, 4242); G.actCard = 0; LV.act = 1;   // (no story tracker on screen)
const settle = () => { for (let i = 0; i < 400; i++) warmStep(40); G.msg = []; G.qBanner = null; render(); };
// a corridor tile: floor with no room
let cor = null; const d = bfs(LV.start.cx, LV.start.cy);
for (let k = 0; k < MW * MH && !cor; k++) { const i = k % MW, j = (k / MW) | 0; if (LV.map[k] === FLOOR && LV.roomOf[k] < 0 && d[k] > 30 && LV.roomOf[tIdx(i + 3, j)] < 0 && LV.map[tIdx(i + 3, j)] === FLOOR) cor = [i + 0.5, j + 0.5]; }
const save = enemies; enemies = [];
hero.fi = cor[0]; hero.fj = cor[1]; updateFov(hero.fi, hero.fj); settle(); shots.corridor = cvs.toDataURL();
const great = LV.rooms.find(r => r.great) || LV.rooms[1];
hero.fi = great.cx + 0.5; hero.fj = great.cy + 0.5; updateFov(hero.fi, hero.fj); settle(); shots.hall = cvs.toDataURL();
// a fight: a few skeletons round the hero in an ordinary room
enemies = save; const r = LV.rooms.find(q => !q.great && q.w >= 8 && q.h >= 8 && LV.rooms.indexOf(q) > 0) || LV.rooms[2];
hero.fi = r.cx + 0.5; hero.fj = r.cy + 0.5;
const near = enemies.filter(e => e.fam === 'skeleton').slice(0, 4);
near.forEach((e, k) => { const a = k * 1.6 + 0.4; e.fi = hero.fi + Math.cos(a) * 1.8; e.fj = hero.fj + Math.sin(a) * 1.8; e.state = 'hunt'; e.hp = e.maxHp = 9999; });
enemies = near; hero.hp = STAT.maxHp = 9999; updateFov(hero.fi, hero.fj);
input.attack = true; for (let i = 0; i < 40; i++) { G.t += 1 / 30; update(1 / 30); } input.attack = false;
hero.hp = STAT.maxHp = 94; settle(); shots.fight = cvs.toDataURL();
L.push({ cor, great: !!great.great, room: [r.w, r.h] });
// round 68a: a large room with its four pillars (and a great hall's two rows)
startLevel(3, 4242); G.actCard = 0; LV.act = 1; enemies = []; hero.hp = STAT.maxHp = 94;
{ const r = LV.rooms.find(q => !q.great && q.w >= 10 && q.h >= 10 && LV.decor.filter(d => d.kind === 'pillar' && d.i >= q.x && d.i < q.x + q.w && d.j >= q.y && d.j < q.y + q.h).length >= 3); if (r) { hero.fi = r.cx + 0.5; hero.fj = r.cy + 1.5; updateFov(hero.fi, hero.fj); settle(); shots.room4 = cvs.toDataURL(); } }
{ const r = LV.rooms.find(q => q.great); hero.fi = r.cx + 0.5; hero.fj = r.cy + 1.5; updateFov(hero.fi, hero.fj); settle(); shots.great = cvs.toDataURL(); }
window.__out = { log: L, shots };
