Math.random = (() => { let s = 9; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const log = [];
const step = n => { for (let i = 0; i < n; i++) { update(1 / 60); warmStep(80); } };
newHero(); G.mode = 'play'; startLevel(3, 777); for (const e of enemies) e.state = 'sleep';
hero.mana = 2; const R = rng(1);
groundItems.push({ item: rollItem(R, 1, 'mana'), fi: hero.fi + 0.3, fj: hero.fj, t: 1 });
step(10); log.push({ mana: Math.round(hero.mana), left: groundItems.length, icon: !!itemIcon({ base: 'mana' }).w, lines: itemLines({ base: 'mana', mods: {} }) });
window.__out = { log, shots: {} };
