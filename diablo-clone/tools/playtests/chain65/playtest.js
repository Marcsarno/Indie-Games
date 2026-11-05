// round 65: Chain Lightning's rules, shock, shatter, the missile's mana
Math.random = (() => { let s = 3; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const L = [];
const run = n => { for (let k = 0; k < n; k++) { G.t += 1 / 30; update(1 / 30); } };
function setup(mod, spacing = 2.2, n = 9) {
  newHero('mage'); hero.lvl = 12; recalcHero(); hero.hp = STAT.maxHp = 99999; G.mode = 'play'; startLevel(1, 4242); G.actCard = 0; npcs = [];
  hero.mods = { chain: mod || null };
  const open = (i, j) => { const need = Math.ceil(3 + spacing * (n - 1)); for (let a = -2; a <= need; a++) for (let c = -2; c <= 2; c++) if (blocked(i + a, j + c)) return false; return true; };
  let spot = null; for (let i = 2; i < MW - 25 && !spot; i++) for (let j = 3; j < MH - 3 && !spot; j++) if (open(i + 0.5, j + 0.5)) spot = [i + 0.5, j + 0.5];
  hero.fi = spot[0]; hero.fj = spot[1]; updateFov(hero.fi, hero.fj);
  const base = enemies.find(e => e.id === 'skeleton') || enemies[0]; enemies = [];
  for (let k = 0; k < n; k++) { const e = makeEnemy(base.id, hero.fi + 2 + k * spacing, hero.fj, 500 + k, 3); e.hp = e.maxHp = 99999; e.state = 'idle'; e.cool = 99; enemies.push(e); }
  for (let s = 0; s < 3; s++) { updateFov(hero.fi, hero.fj); render(); }
  hero.dir = dirFrom(1, 0); hero.mana = 999; CD.chain = 0;
}
const cast = () => { const k = SKILLS.findIndex(s => s.id === 'chain'); useSkill(k); run(30); };
const shocked = () => enemies.filter(e => e.shockT > 0).length;
setup(null); L.push({ skills: SKILLS.map(s => s.id).join(',') }); cast(); L.push({ plain: { hit: enemies.filter(e => e.hp < 99999).length, shocked: shocked() } });
// shock: a shocked one takes 25% more
{ const e = enemies[0]; e.shockT = 3; const a = e.hp; damageEnemy(e, 100, hero.fi, hero.fj); const b = e.hp; e.shockT = 0; damageEnemy(e, 100, hero.fi, hero.fj); L.push({ shockedTook: a - b, plainTook: b - e.hp }); }
setup('fork', 1.6, 12); cast(); L.push({ fork: { hit: enemies.filter(e => e.hp < 99999).length } });
setup('overload'); cast(); L.push({ overload: { hit: enemies.filter(e => e.hp < 99999).length, stunned: enemies.filter(e => e.stun > 0).length } });
setup(null, 5.0, 5); cast(); L.push({ gap5_plain: enemies.filter(e => e.hp < 99999).length });
setup('conductor', 5.0, 5); for (const e of enemies) e.slowT = 3; cast(); L.push({ gap5_conductorChilled: enemies.filter(e => e.hp < 99999).length });
// shatter: fire on a frozen foe
{ setup(null, 2, 1); const e = enemies[0]; e.frozen = 2; G.elem = 'fire'; const a = e.hp; damageEnemy(e, 100, hero.fi, hero.fj, false, 0, true); G.elem = null; L.push({ shatterTook: a - e.hp, iceGone: !(e.frozen > 0) }); e.frozen = 2; const b = e.hp; G.elem = 'cold'; damageEnemy(e, 100, hero.fi, hero.fj, false, 0, true); G.elem = null; L.push({ frozenColdTook: b - e.hp, stillFrozen: e.frozen > 0 }); }
// the missile gives mana back
{ setup(null, 2, 1); hero.mana = 10; const m0 = hero.mana; castMissiles(); run(40); L.push({ missileMana: +(hero.mana - m0).toFixed(1) }); }
window.__out = { log: L, shots: {} };
