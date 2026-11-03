// HUD shots for before/after: both classes mid-fight on floor 3, hurt, ultimate part charged
Math.random = (() => { let s = 3; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const shots = {}, L = [];
for (const cls of ['warrior', 'mage']) {
  newHero(cls); hero.lvl = 12; recalcHero(); G.mode = 'play'; startLevel(3, 777);
  for (let k = 0; k < 30; k++) update(1 / 60);
  hero.hp = STAT.maxHp * 0.62; hero.mana = STAT.maxMana * 0.45; hero.ult = 70;
  for (let i = 0; i < 200; i++) warmStep(30); render(); shots[cls] = cvs.toDataURL();
  hero.hp = STAT.maxHp * 0.2; render(); shots[cls + '-low'] = cvs.toDataURL();
}
window.__out = { log: L, shots };
