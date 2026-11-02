Math.random = (() => { let s = 31; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const log = [], shots = {};
const step = n => { for (let i = 0; i < n; i++) { update(1 / 60); warmStep(80); } };
newHero(); G.mode = 'play'; startLevel(2, 4242);
const w = enemies.find(e => e.id === 'warlord');
for (const e of enemies) if (e !== w) { e.state = 'sleep'; e.fi = 1; e.fj = 1; }
hero.fi = w.fi + 1.5; hero.fj = w.fj + 0.5;
damageEnemy(w, 9999, hero.fi, hero.fj, false); step(30);
const legs = groundItems.filter(g => g.item && g.item.rarity === 'legend');
log.push({ bossLegendary: legs.map(g => itemName(g.item)) });
render(); shots.drop = cvs.toDataURL();
// emberbrand fire burst: three goblins in a cluster
const R = rng(5); const ember = { id: 999, base: 'long_sword', rarity: 'legend', name: 'EMBERBRAND', lore: 'KILLS ERUPT IN FLAME', mods: { dmgPct: 60, fireburst: 1 } };
hero.bag.push(ember); equipItem(ember);
const gs = [0, 1, 2].map(k => { const g = makeEnemy('goblin', hero.fi + 1 + k * 0.4, hero.fj + 0.3, enemies.length + k); g.state = 'hunt'; enemies.push(g); return g; });
const hp1 = gs[1].hp, hp2 = gs[2].hp;
damageEnemy(gs[0], 999, hero.fi, hero.fj, false);
log.push({ fireburstHit: gs[1].hp < hp1 || gs[2].hp < hp2, stat: STAT.fireburst });
// gravewarden thorns
const gw = { id: 998, base: 'tower_shield', rarity: 'legend', name: 'GRAVEWARDEN', mods: { armorFlat: 8, thorns: 60 } };
hero.bag.push(gw); equipItem(gw); STAT.block = 0;
const t = makeEnemy('boar', hero.fi + 1, hero.fj, 900); enemies.push(t); const th = t.hp;
hurtHero(10, t); log.push({ thornsHit: t.hp < th, thorns: STAT.thorns });
log.push({ lines: itemLines(ember) });
G.mode = 'inv'; INV.sel = { item: hero.equip.weapon, from: 'equip', slot: 'weapon' }; render(); shots.inv = cvs.toDataURL();
window.__out = { log, shots };
