// round 110: the barbarian's armor sets in a live page: drops (class, level gate, set-only bases), bonuses
// measured (life on hit, rage, chill, armor, fire damage, the Whirlwind's fire), the set look, icons.
// node tools/playtests/r110/barbsets/test.cjs [iconsOut.png] [gameDir]   exits 1 on a failed check
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => {
  const [iconsOut, game = 'game'] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve(game, 'index.html') + '?cine=0');
  const r = await p.evaluate(() => {
    const out = [], ok = (c, msg) => out.push([!!c, msg]);
    const MY = ['bloodmoon', 'frostjaw', 'ashen'];
    // ---- drops
    const drops = cls => {
      hero.cls = cls; const by = {}, plain = {}; let n = 0;
      for (const lv of [1, 3, 4, 6, 9, 10, 12, 14, 15, 18]) {
        by[lv] = {};
        for (let s = 0; s < 4000; s++) { const R = rng(lv * 100000 + s), it = rollItem(R, lv); n++;
          if (it.rarity === 'set') by[lv][it.set] = (by[lv][it.set] || 0) + 1;
          if (/^bs_/.test(it.base) && it.rarity !== 'set') plain[it.base] = (plain[it.base] || 0) + 1;
          if (it.rarity === 'set' && !canWear(it)) plain['UNWEARABLE ' + it.base] = 1; }
      }
      return { by, plain, n };
    };
    const W = drops('warrior');
    const first = k => { for (const lv of [1, 3, 4, 6, 9, 10, 12, 14, 15, 18]) if (W.by[lv][k]) return lv; return null; };
    ok(first('bloodmoon') === 4, 'barbarian: Bloodmoon first drops at area level ' + first('bloodmoon') + ' (want 4: its level 5, less one)');
    ok(first('frostjaw') === 9, 'barbarian: Frostjaw first at ' + first('frostjaw') + ' (want 9)');
    ok(first('ashen') === 14, 'barbarian: Ashen first at ' + first('ashen') + ' (want 14)');
    ok(!Object.keys(W.plain).length, 'barbarian: no plain or unwearable bs_ drops ' + JSON.stringify(W.plain));
    out.push([true, 'barbarian set drops per area level (4000 rolls each): ' + JSON.stringify(W.by)]);
    for (const cls of ['paladin', 'mage', 'ranger']) { const D = drops(cls), mine = Object.values(D.by).reduce((a, o) => a + MY.reduce((q, k) => q + (o[k] || 0), 0), 0);
      ok(!mine && !Object.keys(D.plain).length, cls + ': never rolls these sets or bases (' + mine + ' set pieces, plain ' + JSON.stringify(D.plain) + ')'); }
    hero.cls = 'warrior';
    for (const k of MY) for (const [base] of SETS[k].pieces) { hero.cls = 'paladin'; const pal = canWear({ base }); hero.cls = 'warrior'; ok(canWear({ base }) && !pal, base + ': the barbarian can wear it, the paladin cannot'); }
    // ---- bonuses
    allocBuffers(270, 480); G.mode = 'title'; beginGame(false, 'warrior'); G.story = { f: { met: true, woodTold: true }, n: 0 }; G.actCard = 0; hero.lvl = 8;
    for (let k = 0; k < 10; k++) update(1 / 60);
    { const d0 = LV.diff, h0 = LV.hub, cnt = dv => { LV.diff = dv; LV.hub = false; const o = {}; for (let s = 0; s < 600; s++) { const x = rollSetItem(rng(s + 7)); o[x.set] = (o[x.set] || 0) + 1; } return o; };
      const lo = cnt(2), hi = cnt(15); LV.diff = d0; LV.hub = h0;
      ok(!lo.bloodmoon && !lo.frostjaw && !lo.ashen && hi.ashen > 0, 'a champion\'s set drop (rollSetItem alone) at area level 2: ' + JSON.stringify(lo) + ', at 15: ' + JSON.stringify(hi)); }
    const SETP = { bloodmoon: ['bs_blood_helm', 'bs_blood_chest', 'bs_blood_axe'], frostjaw: ['bs_frost_helm', 'bs_frost_chest', 'bs_frost_axe'], ashen: ['bs_ash_helm', 'bs_ash_chest', 'bs_ash_axe'] };
    const wear = (k, n, off) => { for (const s of ['helm', 'chest', 'weapon', 'shield']) hero.equip[s] = null;
      const mk = (id, set) => { const it = rollItem(rng(5), 8, id); it.rarity = set ? 'set' : 'normal'; it.mods = {}; if (set) it.set = set; it.lvl = 8; return it; };
      hero.equip.helm = mk('b_band'); hero.equip.chest = mk('b_hide'); hero.equip.weapon = mk('hand_axe');
      if (k) SETP[k].slice(0, n).forEach(id => { hero.equip[ITEM_BASES[id].slot] = mk(id, k); });
      if (off) hero.equip.shield = mk(off === 'same' ? SETP[k][2] : off, off === 'same' ? k : null);
      recalcHero(); return { ...STAT, look: { ...hero.look } };
    };
    const base = wear(null, 0);
    // Bloodmoon
    const b1 = wear('bloodmoon', 1), b2 = wear('bloodmoon', 2);
    ok(!b1.hpHit && b2.hpHit === 2 && b2.look.set === 'bloodmoon' && !b1.look.set, 'Bloodmoon 2: +2 life per hit (1 piece ' + b1.hpHit + ', 2 pieces ' + b2.hpHit + '), set look ' + b2.look.set);
    for (const e of enemies) e.dying = 99, e.hp = 0;
    const e = makeEnemy('skeleton', hero.fi + 1, hero.fj, 0, 6); e.maxHp = e.hp = 1e6; enemies.push(e); e.state = 'hunt';
    hero.hp = 20; damageEnemy(e, 5, hero.fi, hero.fj, false, 0, false); const melee = hero.hp - 20;
    hero.hp = 20; damageEnemy(e, 5, hero.fi, hero.fj, false, 0, true); const ranged = hero.hp - 20;
    ok(melee === 2 && ranged === 0, 'Bloodmoon 2: a melee hit healed ' + melee + ', a ranged/ground one ' + ranged);
    wear('bloodmoon', 2); hero.rage = 0; hero.stance = 0; rageAdd(10); const r2 = hero.rage;
    wear('bloodmoon', 3); hero.rage = 0; rageAdd(10); const r3 = hero.rage;
    ok(Math.abs(r2 - 10) < 1e-6 && Math.abs(r3 - 14) < 1e-6, 'Bloodmoon 3: rage from a +10 gain: 2 pieces ' + r2 + ', 3 pieces ' + r3);
    hero.rage = 0;
    // Frostjaw
    const f2 = wear('frostjaw', 2), f3 = wear('frostjaw', 3);
    ok(f2.chill - base.chill === 25 && f2.look.ench === 'cold', 'Frostjaw 2: chill ' + base.chill + ' -> ' + f2.chill + ', weapon look ' + f2.look.ench);
    const armorOf = n => { wear('frostjaw', n); return STAT.armor; };
    const a2 = f2.armor, a3w = f3.armor, a3pieces = ITEM_BASES.bs_frost_axe.armor || 0;
    ok(a3w - a2 === 20 + a3pieces, 'Frostjaw 3: armor ' + a2 + ' -> ' + a3w + ' (the axe adds none: +20 is the bonus)'); void armorOf;
    // Ashen
    const s2 = wear('ashen', 2), s3 = wear('ashen', 3);
    ok(s2.fireDmg - base.fireDmg === 6 && s2.look.ench === 'fire' && !s2.whirlFire && s3.whirlFire === 1, 'Ashen: fire damage ' + base.fireDmg + ' -> ' + s2.fireDmg + ', whirl fire 2 pieces ' + s2.whirlFire + ', 3 pieces ' + s3.whirlFire);
    G.fireGround = []; hero.whirl = 0.8; hero.whirlTick = 0; const fi0 = hero.fi;
    for (let t = 0; t < 40; t++) { hero.fi = fi0 + t * 0.05; updateSkills(1 / 60); }
    const trail = G.fireGround.filter(g => g.bs).length;
    wear('ashen', 2); G.fireGround = []; hero.whirl = 0.8; for (let t = 0; t < 40; t++) { hero.fi = fi0 + t * 0.05; updateSkills(1 / 60); }
    const trail2 = G.fireGround.filter(g => g.bs).length; hero.fi = fi0; hero.whirl = 0;
    ok(trail >= 3 && trail2 === 0, 'Ashen 3: Whirlwind left ' + trail + ' burning patches (2 pieces: ' + trail2 + ')');
    // two copies of the set weapon count once
    const dup = wear('ashen', 1, 'same');   // helm... no: 1 piece = the helm; then the same axe twice
    for (const s of ['helm', 'chest']) hero.equip[s] = null; hero.equip.weapon = hero.equip.shield; hero.equip.shield = { ...hero.equip.weapon, id: itemSerial++ }; recalcHero();
    ok(!hero.look.set && !STAT.fireDmg, 'two copies of one set axe count once (set ' + JSON.stringify(hero.look.set) + ', fire ' + STAT.fireDmg + ')'); void dup;
    // melee kind (round 109): heavy one-handers
    wear('bloodmoon', 3); const k1 = STAT.meleeKind; wear('bloodmoon', 3, 'hand_axe'); const k2 = STAT.meleeKind;
    ok(k1 === '1hH' && k2 === 'dualH', 'melee kind: set axe alone ' + k1 + ', with a hand axe ' + k2);
    // item card lines
    const card = itemLines({ base: 'bs_ash_axe', rarity: 'set', set: 'ashen', name: 'ASHEN BUTCHER', mods: { dmgPct: 4 } });
    out.push([true, 'card: ' + card.join(' / ')]);
    // icons
    const ids = Object.values(SETP).flat(), icons = ids.map(id => itemIcon({ base: id }));
    const Z = 4, c = document.createElement('canvas'); c.width = 30 * ids.length * Z; c.height = 30 * Z; const g = c.getContext('2d'); g.fillStyle = '#1c1712'; g.fillRect(0, 0, c.width, c.height);
    icons.forEach((sp, k) => { for (let q = 0; q < sp.w * sp.h; q++) { const v0 = sp.data[q]; if (!v0) continue; const v = (v0 & 128) ? v0 & 127 : LTAB[4][v0 & 127]; g.fillStyle = `rgb(${PR[v]},${PG[v]},${PB[v]})`; g.fillRect((k * 30 + 2 + (q % sp.w)) * Z, (2 + ((q / sp.w) | 0)) * Z, Z, Z); } });
    return { out, icons: c.toDataURL() };
  });
  let bad = 0; for (const [good, msg] of r.out) { if (!good) bad++; console.log((good ? 'ok   ' : 'FAIL ') + msg); }
  if (iconsOut) fs.writeFileSync(iconsOut, Buffer.from(r.icons.split(',')[1], 'base64'));
  console.log(errs.slice(0, 3).join('\n') || 'no page errors'); await b.close(); process.exit(bad || errs.length ? 1 : 0);
})();
