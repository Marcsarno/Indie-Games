Math.random = (() => { let s = 3; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const log = [], shots = {};
newHero(); G.mode = 'play'; startLevel(3, 777);
const R = rng(4);
const leg = rollLegendary(R), st = rollSetItem(R); hero.bag.push(leg, st, rollItem(R, 2, 'cap'));
const ward = { id: itemSerial++, base: 'plate_mail', rarity: 'set', set: 'warden', name: "WARDEN'S PLATE", mods: { armorFlat: 4, hp: 10 } }; hero.bag.push(ward); equipItem(ward);
G.mode = 'inv'; INV.sel = { item: leg, from: 'bag' }; render(); shots.inv = cvs.toDataURL();
log.push({ ok: true });
window.__out = { log, shots };
