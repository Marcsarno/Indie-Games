// round 69: the caves (Act II), hell (Act III) and side areas: a room and a hall of each, for the face-lift
window.__jobs = ['mineworks', 'grotto', 'ritual', 'torture'];
Math.random = (() => { let s = 21; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const shots = {}, L = [];
newHero('warrior'); hero.lvl = 12; recalcHero(); hero.hp = STAT.maxHp = 94; G.mode = 'play'; G.story = null; G.gates = null;
const settle = () => { for (let i = 0; i < 400; i++) warmStep(40); G.msg = []; G.qBanner = null; render(); };
const roomShot = (k, pick) => { const r = pick(LV.rooms) || LV.rooms[2]; enemies = []; hero.fi = r.x + r.w * 0.45; hero.fj = r.y + r.h * 0.45; updateFov(hero.fi, hero.fj); settle(); shots[k] = cvs.toDataURL(); L.push({ [k]: areaName() + ' ' + r.w + 'x' + r.h + (r.job ? ' ' + r.job : '') }); };
for (const [lv, tag] of [[8, 'caves'], [13, 'hell']]) {
  startLevel(lv, 4242); G.actCard = 0;
  roomShot(tag + '-room', R => R.find((q, n) => n > 0 && q.w >= 9 && q.h >= 9 && !q.great));
  roomShot(tag + '-great', R => R.find(q => q.great));
  for (const job of window.__jobs || []) { for (const sd of [4242, 99, 777, 5, 11, 31337, 2024, 1, 2, 3]) { startLevel(lv, sd); G.actCard = 0; const r = LV.rooms.find(q => q.job === job); if (!r) continue; roomShot(tag + '-' + job, () => r); break; } }
}
for (const side of ['den', 'cellar', 'barrow', 'tower']) {
  G.story = { f: { met: true }, n: 0 }; startLevel(1, 4242); G.actCard = 0; enterSide(side); const f = G.fadeTo; G.fadeTo = null; f();
  roomShot('side-' + side, R => R.find((q, n) => n > 0 && q.w >= 8));
}
window.__out = { log: L, shots };
