Math.random = (() => { let s = 23; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
newHero(); G.mode = 'play'; hero.lvl = 6; recalcHero(); hero.hp = STAT.maxHp; hero.mana = STAT.maxMana;
startLevel(3, 2024);
const R = rng(4); for (const b of ['greatsword', 'plate_mail', 'crown_helm']) { const it = rollItem(R, 4, b); hero.bag.push(it); equipItem(it); }
const step = n => { for (let i = 0; i < n; i++) { update(1 / 60); warmStep(30); } };
const shots = {}, log = [];
// line up four skeletons/fallen around the hero, low hp, and cut through them
const r = LV.rooms[1]; hero.fi = r.cx + 0.5; hero.fj = r.cy + 0.5;
const ids = ['skeleton', 'skeleton', 'fallen', 'spider'];
const vic = ids.map((id, n) => { const e = makeEnemy(id, hero.fi + Math.cos(n * 1.6) * 1.1, hero.fj + Math.sin(n * 1.6) * 1.1, 90 + n); e.state = 'hunt'; e.cool = 9; e.hp = 3; enemies.push(e); return e; });
let critSeen = false, f = 0;
{ const v0 = vic[0]; v0.hp = 40; damageEnemy(v0, 18, hero.fi, hero.fj, true); step(2); render(); shots.crit = cvs.toDataURL(); critSeen = true; v0.hp = 3; }
for (; f < 400 && vic.some(alive); f++) {
  const t = vic.find(alive); hero.dir = dirFrom(t.fi - hero.fi, t.fj - hero.fj); input.attack = true; step(1);
  if (!critSeen && floaters.some(x => x.size === 2)) { critSeen = true; render(); shots.crit = cvs.toDataURL(); }
  if (G.streakShow && G.streakShow.t > 1.4 && !shots.streak) { render(); shots.streak = cvs.toDataURL(); }
}
input.attack = false; step(40); render(); shots.after = cvs.toDataURL();
log.push({ frames: f, dead: vic.filter(e => !alive(e)).length, streak: G.streak, critSeen, kills: G.kills });
window.__out = { log, shots };
