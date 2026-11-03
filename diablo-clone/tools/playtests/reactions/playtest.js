// round 29: monsters react to what hits them, and die the way they were killed
Math.random = (() => { let s = 3; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const L = [];
newHero('mage'); G.mode = 'play'; startLevel(3, 777); enemies.length = 0;
const run = n => { for (let k = 0; k < n; k++) update(1 / 60); };
const mk = (id, hp) => { const e = makeEnemy(id, hero.fi + 2, hero.fj, enemies.length + 70); e.hp = e.maxHp = hp; e.state = 'hunt'; e.def = Object.assign({}, e.def, { dmg: [0, 0] }); enemies.push(e); return e; };
const hit = (e, dmg, el) => { G.elem = el; damageEnemy(e, dmg, hero.fi, hero.fj); G.elem = null; };
let e = mk('fallen', 100); hit(e, 5, 'fire'); const burning = e.burnT > 0; const hp0 = e.hp; run(70); L.push({ fireBurns: burning, burnDamage: hp0 - e.hp });
e = mk('fallen', 100); hit(e, 5, 'heavy'); const down = e.downT > 0; run(60); L.push({ heavyKnocksDown: down, upAgain: !(e.downT > 0) && alive(e) });
e = mk('fallen', 100); const f0 = e.fi; hit(e, 5, 'arcane'); run(20); L.push({ arcanePush: +(e.fi - f0).toFixed(2) });
e = mk('fallen', 5); hit(e, 50, 'fire'); run(40); L.push({ fireKill: e.deathKind, noCorpseLeft: e.corpse && e.deathKind === 'ash' });
e = mk('fallen', 5); hit(e, 50, 'cold'); run(20); L.push({ coldKill: e.deathKind });
e = mk('fallen', 5); const t0 = e.fi; hit(e, 50, 'heavy'); run(40); L.push({ heavyKill: e.deathKind, thrown: +(e.fi - t0).toFixed(2) });
e = mk('skeleton', 5); hit(e, 50, null); run(40); L.push({ plainKill: e.deathKind || 'normal' });
window.__out = { log: L, shots: {} };
