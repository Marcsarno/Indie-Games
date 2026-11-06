'use strict';
// Round 39: elites with powers. A champion now leads its pack and carries one to three powers
// (one on the early floors, two from Act II, three on Nightmare). Every power warns before it can
// hurt, can be beaten, and pays off when it is: a broken shield staggers, a frost orb hit before it
// bursts shatters harmlessly, a summoner's minions crumble when it dies, a blinker stands open for
// a moment where it lands, the fire trail lasts only a moment, the vampire only feeds while it
// keeps hitting and you stay close. Followers share a weaker copy of the leader's first power and
// falter when it dies. Each power has its own death. Names and powers show for the nearest elite
// only; the others get a pip per power over their heads.

const POWERS = {
  burning: { name: 'BURNING', col: FIRE[4], tip: 'BURNING: STAY OUT OF THE FLAMES' },
  frozen: { name: 'FROZEN', col: 118, tip: 'FROZEN: BREAK THE ORBS BEFORE THEY BURST' },
  blinking: { name: 'BLINKING', col: 59, tip: 'BLINKING: STRIKE IT WHERE IT LANDS' },
  shielded: { name: 'SHIELDED', col: BLUE[3], tip: 'SHIELDED: HEAVY BLOWS BREAK THE SHIELD' },
  vampiric: { name: 'VAMPIRIC', col: 23, tip: 'VAMPIRIC: STEP BACK TO STOP IT FEEDING' },
  summoner: { name: 'SUMMONER', col: 55, tip: 'SUMMONER: KILL IT AND ITS MINIONS FALL' },
};
const POWER_EASY = ['burning', 'shielded', 'vampiric', 'summoner'];   // the first floors teach these
const POWER_BANNED = [['shielded', 'vampiric'], ['blinking', 'frozen']];
const NO_SUMMON = { hero: 1, treant: 1, ogre: 1 };
// quest leaders carry a fixed power, a preview of the bosses to come
const LEADER_POWERS = { alpha: ['blinking'], banditchief: ['burning'], barrowwight: ['summoner', 'frozen'] };   // (round 67: the Wight raises the dead and calls frost orbs)
const powerCount = () => LV.loop >= 1 ? 3 : LV.diff >= 4 ? 2 : 1;

function rollPowers(e, R) {
  const pool = (LV.diff <= 1 && !LV.loop ? POWER_EASY : Object.keys(POWERS)).filter(p => !(p === 'summoner' && NO_SUMMON[e.fam]));
  const pw = [];
  for (let t = 0; t < 30 && pw.length < powerCount(); t++) {
    const p = pool[Math.floor(R() * pool.length)];
    if (pw.includes(p) || POWER_BANNED.some(([a, b]) => (p === a && pw.includes(b)) || (p === b && pw.includes(a)))) continue;
    pw.push(p);
  }
  return pw;
}
// after champions are made: each takes up to three same-kind monsters near it as its pack
function setupElites() {
  for (const e of enemies) if (LEADER_POWERS[e.id]) givePowers(e, LEADER_POWERS[e.id], false);
  for (const c of enemies) {
    if (!c.champ || !c.pw) continue;
    const near = enemies.filter(o => o !== c && !o.champ && !o.pw && !o.def.unique && !o.def.elite && o.id === c.id && Math.hypot(o.fi - c.fi, o.fj - c.fj) < 2.8)
      .sort((a, b) => Math.hypot(a.fi - c.fi, a.fj - c.fj) - Math.hypot(b.fi - c.fi, b.fj - c.fj)).slice(0, 3);
    // a lone elite gets two of its kind beside it, so every elite fight is a pack fight
    for (let k = near.length; k < 2 && !c.def.elite; k++) {
      let p = null;
      for (let t = 0; t < 16 && !p; t++) { const a = Math.random() * 6.283, r = 0.9 + Math.random() * 0.7, q = [c.fi + Math.cos(a) * r, c.fj + Math.sin(a) * r]; if (standable(q[0], q[1], 0.3) && !enemies.some(o => Math.hypot(o.fi - q[0], o.fj - q[1]) < 0.6)) p = q; }
      if (!p) break;
      const o = makeEnemy(c.id, p[0], p[1], enemies.length + 200); o.state = c.state; enemies.push(o); near.push(o);
    }
    for (const o of near) {
      o.packOf = c; o.hp = o.maxHp = Math.round(o.maxHp * 1.3);
      if (c.pw[0] !== 'summoner' && c.pw[0] !== 'blinking') givePowers(o, [c.pw[0]], true);   // the weak copy (no weak summoners or blinkers)
    }
  }
}
function givePowers(e, pw, weak) {
  e.pw = pw.slice(); e.pwWeak = weak; e.pwT = {};
  for (const p of pw) e.pwT[p] = 1.5 + Math.random() * 1.5;   // first use a moment after it wakes
}
const hasPw = (e, p) => !!e.pw && e.pw.includes(p);

// ---------------------------------------------------------------- per frame
// returns true when a power owns the monster's frame (a blink and the pause after it)
function updateElite(e, dt, d, dx, dy) {
  const T = e.pwT;
  for (const p in T) T[p] -= dt;
  if (!e.pwSeen) {   // the first time a power shows up in this run, one line names it
    e.pwSeen = true; G.pwSeen = G.pwSeen || {};
    for (const p of e.pw) if (!G.pwSeen[p] && !e.pwWeak) { G.pwSeen[p] = true; say(POWERS[p].tip, POWERS[p].col, 4); break; }
  }
  // burning: flames where it walks, a short trail
  if (hasPw(e, 'burning')) {
    const last = e.trailAt || [e.fi, e.fj];
    if (Math.hypot(e.fi - last[0], e.fj - last[1]) > 0.45) { e.trailAt = [e.fi, e.fj]; G.eliteFire.push({ fi: last[0], fj: last[1], t: e.pwWeak ? 1.1 : 1.8, arm: 0.35, dmg: e.dmg, src: e, weak: e.pwWeak }); }
    else if (!e.trailAt) e.trailAt = last;
  }
  // frozen: orbs dropped around the hero, each bursting after a closing ring
  if (hasPw(e, 'frozen') && T.frozen <= 0 && d < 7 && !hero.dead) {
    T.frozen = e.pwWeak ? 6 : 3.6;
    const n = e.pwWeak ? 1 : 2;
    for (let k = 0; k < n; k++) {
      let p = null;
      for (let t = 0; t < 8 && !p; t++) { const a = Math.random() * 6.283, r = k === 0 ? 0.2 + Math.random() * 0.5 : 1 + Math.random() * 1.2, q = [hero.fi + Math.cos(a) * r, hero.fj + Math.sin(a) * r]; if (!blocked(q[0], q[1])) p = q; }
      if (p) G.frostOrbs.push({ fi: p[0], fj: p[1], t: 1.15, t0: 1.15, r: e.pwWeak ? 0.9 : 1.2, dmg: e.dmg, src: e });
    }
    sfx('frost', 0.5);
  }
  // shielded: a shield that soaks a fixed amount, then breaks and staggers it
  if (hasPw(e, 'shielded') && !(e.shieldHp > 0) && T.shielded <= 0) {
    e.shieldHp = e.shieldMax = Math.round(e.maxHp * (e.pwWeak ? 0.12 : 0.28)); e.shieldT = 6; T.shielded = 7.5;
    const [x, y] = screenOf(e); burst(4, x, y, e.def.chest, 10, 50, BLUE[3]); sfx('clank', 0.6);
  }
  if (e.shieldHp > 0) { e.shieldT -= dt; if (e.shieldT <= 0) e.shieldHp = 0; }
  // vampiric: what it drank flows back to it while it stays near; step away and it is lost
  if (e.vampPool > 0) {
    if (d < 2.6) { const h = Math.min(e.vampPool, dt * 20); e.vampPool -= h; e.hp = Math.min(e.maxHp, e.hp + h); if (Math.random() < dt * 30) G.leech.push({ src: e, u: 0, sp: 1.6 + Math.random() }); }
    else { e.vampPool = Math.max(0, e.vampPool - dt * 30); }
  }
  // summoner: a ground circle, then two minions rise from it
  if (hasPw(e, 'summoner') && T.summoner <= 0 && d < 8 && !hero.dead) {
    T.summoner = 7;
    const out = enemies.filter(o => o.summonedBy === e && alive(o)).length;
    if (out < 4) for (let k = 0; k < 2; k++) {
      let p = null;
      for (let t = 0; t < 10 && !p; t++) { const a = Math.random() * 6.283, r = 0.9 + Math.random() * 0.8, q = [e.fi + Math.cos(a) * r, e.fj + Math.sin(a) * r]; if (standable(q[0], q[1], 0.25)) p = q; }
      if (p) G.summons.push({ fi: p[0], fj: p[1], t: 0.85, t0: 0.85, src: e });
    }
  }
  // blinking: across to the hero when it is held at range, away when it is hurt; then open a moment
  if (e.blinkOpen > 0) { e.blinkOpen -= dt; e.clip = 'idle'; e.atk = -1; e.dir = dirFrom(dx, dy); return true; }
  if (hasPw(e, 'blinking') && T.blinking <= 0 && e.atk < 0 && !hero.dead) {
    const toHero = d > 2.6 && d < 9, away = e.hp < e.maxHp * 0.6 && d < 2 && e.hurtRecent > G.t;
    if (toHero || away) {
      T.blinking = 4.5 + Math.random() * 1.5;
      let p = null;
      for (let t = 0; t < 12 && !p; t++) {
        const a = toHero ? Math.atan2(-dy, -dx) + (Math.random() - 0.5) * 2.4 : Math.random() * 6.283, r = toHero ? 1.1 : 3.5 + Math.random();
        const q = toHero ? [hero.fi + Math.cos(a) * r, hero.fj + Math.sin(a) * r] : [e.fi + Math.cos(a) * r, e.fj + Math.sin(a) * r];
        if (standable(q[0], q[1], 0.3) && Math.hypot(q[0] - hero.fi, q[1] - hero.fj) > 0.8) p = q;
      }
      if (p) {
        const [x0, y0] = screenOf(e);
        burst(4, x0, y0, e.def.chest, 16, 70, 59); burst(2, x0, y0, e.def.chest, 6, 40, 58);
        G.blinkFx.push({ fi: e.fi, fj: e.fj, t: 0.3, t0: 0.3 });
        e.fi = p[0]; e.fj = p[1]; e.kb = [0, 0];
        G.blinkFx.push({ fi: e.fi, fj: e.fj, t: 0.35, t0: 0.35, land: true });
        const [x1, y1] = screenOf(e); burst(4, x1, y1, e.def.chest, 10, 50, 59);
        e.blinkOpen = 0.6; e.flash = 0.05; sfx('blink', 0.7);
        return true;
      }
    }
  }
  return false;
}
// a blow on an elite: the shield soaks it, a blinker that just landed takes more.
// Returns the damage that gets through, or -1 when the blow is spent
function eliteDamage(e, dmg, pow, fromFi, fromFj, ranged) {
  e.hurtRecent = G.t + 1;
  if (e.blinkOpen > 0) { dmg = Math.round(dmg * 1.3); if (!e.openShown) { e.openShown = true; floater('OPEN', e.fi, e.fj, e.def.chest + 26, 51); } }
  else e.openShown = false;
  if (e.shieldHp > 0) {
    const heavy = pow >= 1 || G.elem === 'heavy' || G.elem === 'fire';   // slams, finishers, charged shots, fireballs
    const soak = Math.round(dmg * (heavy ? 2 : 1));
    e.shieldHp -= soak;
    const [x, y] = screenOf(e);
    if (e.shieldHp > 0) {
      floater(String(soak), e.fi, e.fj, e.def.chest + 14, BLUE[3]); burst(2, x, y, e.def.chest, 6, 70, BLUE[3]); sfx('block', 0.8);
      e.flash = 0.03; if (!ranged) hero.stop = Math.max(hero.stop, 0.03);
      return -1;
    }
    // broken: the rest of the blow goes through, and it reels
    e.shieldHp = 0; e.shieldT = 0;
    floater('SHIELD BROKEN', e.fi, e.fj, e.def.chest + 24, 51); burst(4, x, y, e.def.chest, 24, 110, BLUE[3]); burst(2, x, y, e.def.chest, 10, 90, 27); sfx('clank'); sfx('crack', 0.7);
    if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.25);
    e.stun = Math.max(e.stun || 0, e.pwWeak ? 0.6 : 1.3); e.atk = -1;
    return Math.max(1, Math.round(-e.shieldHp / (heavy ? 2 : 1)));
  }
  return dmg;
}
// the elite landed a hit on the hero
function eliteOnHit(e, dmg) {
  if (hasPw(e, 'vampiric')) e.vampPool = (e.vampPool || 0) + dmg * (e.pwWeak ? 0.6 : 1.5);
}
// the elite died: its power's death, its pack falters, a summoner's minions crumble
function eliteDeath(e) {
  const [x, y] = screenOf(e);
  if (hasPw(e, 'burning')) { G.eliteBursts.push({ fi: e.fi, fj: e.fj, t: 0.6, t0: 0.6, r: e.pwWeak ? 1 : 1.7, kind: 'fire', dmg: e.dmg }); }
  if (hasPw(e, 'frozen')) { G.eliteBursts.push({ fi: e.fi, fj: e.fj, t: 0.5, t0: 0.5, r: e.pwWeak ? 1 : 1.8, kind: 'frost', dmg: e.dmg }); }
  if (hasPw(e, 'blinking')) { burst(4, x, y, e.def.chest, 20, 90, 59); }
  if (hasPw(e, 'vampiric')) { burst(1, x, y, e.def.chest, 24, 90, 22); }
  if (hasPw(e, 'summoner')) for (const o of enemies) if (o.summonedBy === e && alive(o)) { o.crumbleT = 0.1 + Math.random() * 0.35; }
  if (e.pwWeak) return;
  // the leader: a short sting, a little more slow motion, a spray of extra loot; the pack falters
  sfx('cry', 0.6); G.slowmo = Math.max(G.slowmo || 0, 0.35);
  if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.35);
  for (let k = 0; k < 10; k++) pspawn(2, x, y, e.def.chest, (Math.random() - 0.5) * 90, (Math.random() - 0.5) * 50, 60 + Math.random() * 40, 0.7, 51);
  for (const o of enemies) if (o.packOf === e && alive(o)) { o.panicT = Math.max(o.panicT || 0, 1.2); o.atk = -1; floater('!', o.fi, o.fj, o.def.chest + 16, 51); }
}
// a summoned minion: weaker, no loot, little xp; it rises out of the ground
function raiseMinion(s) {
  const src = s.src, id = src.fam === 'skeleton' ? 'skeleton' : src.fam === 'spider' ? 'spider' : src.id;
  const m = makeEnemy(id, s.fi, s.fj, enemies.length + 300);
  m.hp = m.maxHp = Math.max(3, Math.round(m.maxHp * 0.4)); m.dmg = m.dmg.map(v => Math.max(1, Math.round(v * 0.6)));
  m.summonedBy = src; m.noLoot = true; m.state = 'hunt'; m.alertT = 0.45; m.alertT0 = 0.45; m.rise = 0.45; m.dir = dirFrom(hero.fi - s.fi, hero.fj - s.fj);
  enemies.push(m);
  const [x, y] = screenOf(m); burst(5, x, y, 1, 10, 40, LV.outdoor ? DIRT[3] : S[5]); burst(4, x, y, 4, 8, 40, 55);
}

// ---------------------------------------------------------------- world effects
function updateEliteFx(dt) {
  for (const f of G.eliteFire) {
    f.t -= dt; f.arm -= dt;
    if (Math.random() < dt * (f.weak ? 6 : 10)) { const [x, y] = iso(f.fi + (Math.random() - 0.5) * 0.5, f.fj + (Math.random() - 0.5) * 0.5); pspawn(3, x, y, 1, 0, 0, 10 + Math.random() * 14, 0.4, Math.random() < 0.5 ? 16 : 17); }
    if (f.arm <= 0 && !hero.dead && G.t > (hero.fireT || 0) && Math.hypot(hero.fi - f.fi, hero.fj - f.fj) < 0.42) {   // standing in it burns twice a second
      hero.fireT = G.t + 0.5; hurtHero(Math.max(1, Math.round((f.dmg[0] + f.dmg[1]) / 2 * (f.weak ? 0.2 : 0.35))), null);
    }
  }
  G.eliteFire = G.eliteFire.filter(f => f.t > 0);
  for (const o of G.frostOrbs) {
    o.t -= dt;
    if (o.t <= 0) {   // the burst: ice shards, and a chill if the hero is inside
      const [x, y] = iso(o.fi, o.fj); burst(4, x, y, 4, 16, 90, 118); burst(5, x, y, 4, 8, 60, 117); sfx('clink', 0.6);
      if (!hero.dead && Math.hypot(hero.fi - o.fi, hero.fj - o.fj) < o.r) { hurtHero(Math.round(roll(o.dmg) * 0.8), null); hero.chillT = 1.6; }
    }
  }
  G.frostOrbs = G.frostOrbs.filter(o => o.t > 0);
  for (const s of G.summons) { s.t -= dt; if (s.t <= 0) { if (alive(s.src)) raiseMinion(s); } }
  G.summons = G.summons.filter(s => s.t > 0 && alive(s.src));
  for (const b of G.eliteBursts) {
    b.t -= dt;
    if (b.t <= 0) {
      const [x, y] = iso(b.fi, b.fj);
      if (b.kind === 'fire') { shockwave(b.fi, b.fj, b.r, 0.3, [FIRE[4], FIRE[2]]); burst(3, x, y, 6, 30, 120, 17); sfx('fireball'); for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283; G.eliteFire.push({ fi: b.fi + Math.cos(a) * b.r * 0.6, fj: b.fj + Math.sin(a) * b.r * 0.6, t: 1.6, arm: 0.2, dmg: b.dmg, weak: true }); } }
      else { shockwave(b.fi, b.fj, b.r, 0.3, [118, 117]); burst(4, x, y, 6, 30, 120, 118); sfx('frost'); }
      if (!hero.dead && Math.hypot(hero.fi - b.fi, hero.fj - b.fj) < b.r) { hurtHero(Math.round(roll(b.dmg) * 0.7), null); if (b.kind === 'frost') hero.chillT = 1.8; }
    }
  }
  G.eliteBursts = G.eliteBursts.filter(b => b.t > 0);
  for (const b of G.blinkFx) b.t -= dt; G.blinkFx = G.blinkFx.filter(b => b.t > 0);
  for (const l of G.leech) l.u += dt * l.sp; G.leech = G.leech.filter(l => l.u < 1 && alive(l.src));
  for (const e of enemies) if (e.crumbleT > 0 && alive(e)) { e.crumbleT -= dt; if (e.crumbleT <= 0) { G.pierce = true; damageEnemy(e, e.hp + 1, e.fi, e.fj); G.pierce = false; } }
  for (const e of enemies) if (e.rise > 0) e.rise -= dt;
}
// a hero blow or shot near an orb breaks it before it bursts
function breakOrbsAt(fi, fj, r) {
  let n = 0;
  for (const o of G.frostOrbs) if (o.t > 0 && Math.hypot(o.fi - fi, o.fj - fj) < r) {
    o.t = -1; n++; const [x, y] = iso(o.fi, o.fj); burst(5, x, y, 4, 10, 50, 117); burst(4, x, y, 4, 6, 40, 27); sfx('clink', 0.5); floater('BROKEN', o.fi, o.fj, 14, 118);
  }
  if (n) G.frostOrbs = G.frostOrbs.filter(o => o.t > 0);
  return n;
}
function swingBreaksOrbs() {   // the hero's melee arc
  const [fx, fy] = dirVec(hero.dir), reach = heroReach() + 0.3;
  for (const o of G.frostOrbs) {
    const dx = o.fi - hero.fi, dy = o.fj - hero.fj, d = Math.hypot(dx, dy);
    if (d < reach && (d < 0.4 || (dx * fx + dy * fy) / d > 0.3)) breakOrbsAt(o.fi, o.fj, 0.05);
  }
}

// ---------------------------------------------------------------- drawing
// world layer: the fire trail (scorched ground with embers), frost orbs (a crystal and a ring that
// closes in), summoning circles, the bursts' warning rings
function drawEliteGround() {
  const put = (x, y, v) => { if (x >= 0 && y >= 0 && x < W && y < H && !cid[y * W + x]) scr[y * W + x] = v; };
  const ring = (cx, cy, R, col, dash = 0, ph = 0) => { const n = Math.max(12, Math.round(R * 7)); for (let k = 0; k < n; k++) { if (dash && ((k + ph) % dash) === 0) continue; const a = k / n * 6.283; put(Math.round(cx + Math.cos(a) * R), Math.round(cy + Math.sin(a) * R * 0.5), col); } };
  for (const f of G.eliteFire) {
    // a scorched patch with two or three tongues of flame; while it is arming only embers glow
    const [x0, y0] = iso(f.fi, f.fj), cx = Math.round(x0 - camX), cy = Math.round(y0 - camY), life = Math.min(1, f.t / 0.5), sd = (f.fi * 13.7 + f.fj * 7.3) % 10;
    for (let y = -3; y <= 3; y++) for (let x = -7; x <= 7; x++) {
      const dd = Math.hypot(x / 7, y / 3.5); if (dd > 1) continue;
      if (BAYER[((cy + y) & 3) << 2 | ((cx + x) & 3)] > life * (1.3 - dd)) continue;
      const h = hash(x + Math.floor(sd * 9), y, Math.floor(G.t * 8));
      put(cx + x, cy + y, dd > 0.7 ? S[1] : h > 0.8 ? FIRE[3] | EMIS : h > 0.55 ? FIRE[1] | EMIS : S[2]);
    }
    if (f.arm <= 0) {
      const hg = (f.weak ? 6 : 9) * (0.5 + 0.5 * life);
      flame(x0 - 3, y0 + 1, hg, 1.6, G.t, sd); flame(x0 + 3, y0, hg * 0.8, 1.4, G.t, sd + 2);
      if (!f.weak) flame(x0, y0 + 2, hg * 1.2, 2, G.t, sd + 5);
    }
  }
  for (const o of G.frostOrbs) {
    const [x0, y0] = iso(o.fi, o.fj), cx = Math.round(x0 - camX), cy = Math.round(y0 - camY), u = o.t / o.t0, R = o.r * 22.6;
    ring(cx, cy, R, 116, 6, Math.floor(G.t * 10));                                  // where it will reach (dark dashes)
    ring(cx, cy + 1, R * u, 115); ring(cx, cy, R * u, (u < 0.35 && Math.floor(G.t * 16) % 2 ? 27 : 118) | EMIS);   // the ring closing in, flashing at the end
    // the crystal: a floating diamond lit from the upper left, with an outline and a shadow under it
    const by = cy - 7 - Math.round(Math.sin(G.t * 5 + o.fi) * 1.5), rows = [1, 2, 3, 3, 3, 2, 1];
    for (let x = -3; x <= 3; x++) put(cx + x, cy, x * x < 5 ? S[1] : S[2]);
    for (let r = -1; r <= rows.length; r++) { const w = rows[r] || 0, ww = (rows[r - 1] || 0) > w ? rows[r - 1] : w; for (let x = -ww - 1; x <= ww + 1; x++) put(cx + x, by - 4 + r, BLK); }
    for (let r = 0; r < rows.length; r++) for (let x = -rows[r] + 1; x <= rows[r] - 1; x++) put(cx + x, by - 4 + r, (x < 0 || (x === 0 && r < 3) ? (r < 2 ? 27 : 118) : r > 4 ? 116 : 117) | EMIS);
  }
  for (const s of G.summons) {
    const [x0, y0] = iso(s.fi, s.fj), cx = Math.round(x0 - camX), cy = Math.round(y0 - camY), u = 1 - s.t / s.t0;
    ring(cx, cy + 1, 10, S[1]); ring(cx, cy, 10, (u > 0.6 && Math.floor(G.t * 14) % 2 ? 27 : 55) | EMIS);   // a dark edge under a bright ring
    ring(cx, cy, 6 + u * 2, 54 | EMIS, 3, Math.floor(G.t * 8));
    for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283 + G.t * 2, px = Math.round(cx + Math.cos(a) * 8), py = Math.round(cy + Math.sin(a) * 4); put(px, py, 27 | EMIS); put(px, py - 1, 55 | EMIS); put(px, py - 2, 54 | EMIS); }   // rune posts
    for (let y = -1; y <= 1; y++) for (let x = -3; x <= 3; x++) if (BAYER[((cy + y) & 3) << 2 | ((cx + x) & 3)] < u) put(cx + x, cy + y, S[0]);   // the ground opening
  }
  for (const b of G.eliteBursts) {
    const [x0, y0] = iso(b.fi, b.fj), cx = Math.round(x0 - camX), cy = Math.round(y0 - camY), u = 1 - b.t / b.t0, R = b.r * 22.6;
    const col = b.kind === 'fire' ? FIRE[4] : 118;
    ring(cx, cy, R, (Math.floor(G.t * 14) % 2 ? col : b.kind === 'fire' ? FIRE[2] : 116) | EMIS, 5, Math.floor(G.t * 10));
    ring(cx, cy, R * u, col | EMIS);
  }
}
// detail layer: shield bubbles, blink flickers, leech drops, pips over elites
function drawEliteFx() {
  for (const e of enemies) {
    if (!(e.shieldHp > 0) || !alive(e)) continue;
    // a bubble around the body: a dark rim, a bright band lit at the upper left, a sparse veil inside; it cracks as it wears down
    const [x, y] = iso(e.fi, e.fj), X = Math.round(x * SPX - cam2x), Y = Math.round((y - e.def.chest * 0.75 - (e.leapZ || 0)) * SPX - cam2y);
    const R = Math.round((e.def.chest * 1.05 + 14) * (e.look.scale || 1)), f = e.shieldHp / e.shieldMax, n = 160;
    for (let k = 0; k < n; k++) {
      const a = k / n * 6.283, lit = -Math.cos(a + 0.8), sh = Math.sin(a * 5 - G.t * 4);
      if (f < 0.5 && hash(k >> 2, Math.floor(G.t * 10), 7) > f * 1.7) continue;
      const cx = Math.cos(a), cy = Math.sin(a) * 1.05;
      ovSet(Math.round(X + cx * (R + 1)), Math.round(Y + cy * (R + 1)), BLK);
      ovSet(Math.round(X + cx * R), Math.round(Y + cy * R), lit > 0.4 || sh > 0.85 ? 27 : BLUE[3]);
      ovSet(Math.round(X + cx * (R - 1)), Math.round(Y + cy * (R - 1)), lit > 0.2 ? BLUE[3] : BLUE[2]);
    }
    for (let yy = -R + 3; yy < R - 2; yy += 2) for (let xx = -R + 3; xx < R - 2; xx += 2) {
      if (xx * xx + yy * yy / 1.1 > (R - 3) * (R - 3) || BAYER[((Y + yy) & 3) << 2 | ((X + xx) & 3)] > 0.14 * f) continue;
      ovSet(X + xx, Y + yy, BLUE[3]);
    }
  }
  for (const b of G.blinkFx) {   // a column of light that narrows away: white core, violet band, dark edge
    const [x, y] = iso(b.fi, b.fj), X = Math.round(x * SPX - cam2x), Y = Math.round(y * SPX - cam2y), u = b.t / b.t0;
    const h = Math.round((b.land ? 76 : 60) * (0.4 + 0.6 * u)), w = Math.round(9 * u) + 3;
    for (let yy = 0; yy < h; yy++) {
      const ww = Math.round(w * (1 - yy / h * 0.7));
      for (let xx = -ww - 1; xx <= ww + 1; xx++) {
        const ax = Math.abs(xx);
        if (ax > ww) { if (yy % 2 === 0) ovSet(X + xx, Y - yy, BLK); continue; }
        if (ax > 1 && BAYER[((Y - yy) & 3) << 2 | ((X + xx) & 3)] > u + 0.25) continue;
        ovSet(X + xx, Y - yy, ax < 2 ? 27 : ax < ww * 0.6 ? 59 : 57);
      }
    }
    for (let k = 0; k < 24; k++) { const a = k / 24 * 6.283, r = (b.land ? 22 : 16) * (1.2 - u * 0.5); ovSet(Math.round(X + Math.cos(a) * r), Math.round(Y + Math.sin(a) * r * 0.5), k % 2 ? 59 : 27); }   // the ring on the floor
  }
  for (const l of G.leech) {   // a red drop arcing from the hero to the vampire
    const e = l.src, [ax, ay] = iso(hero.fi, hero.fj), [bx, by] = iso(e.fi, e.fj), u = l.u;
    const x = ax + (bx - ax) * u, y = ay - 18 + (by - e.def.chest * 0.8 - ay + 18) * u - Math.sin(u * Math.PI) * 7;
    const X = Math.round(x * SPX - cam2x), Y = Math.round(y * SPX - cam2y);
    const D = [[0, -2, BLK], [-1, -1, BLK], [1, -1, BLK], [-2, 0, BLK], [2, 0, BLK], [-2, 1, BLK], [2, 1, BLK], [-1, 2, BLK], [0, 2, BLK], [1, 2, BLK], [0, -1, 23], [-1, 0, 27], [0, 0, 23], [1, 0, 22], [-1, 1, 22], [0, 1, 21], [1, 1, 20]];
    for (const [dx, dy, c] of D) for (let b = 0; b < 2; b++) for (let q = 0; q < 2; q++) ovSet(X + dx * 2 + q, Y + dy * 2 + b, c);   // drawn at twice the detail size
  }
}
// over the head: the nearest elite gets its name and powers, the others a pip per power
function drawEliteLabels(champs) {
  const lead = champs[0];
  for (const e of enemies) {
    if (!e.pw || e.pwWeak || !alive(e) || e === lead) continue;
    if (Math.hypot(e.fi - hero.fi, e.fj - hero.fj) > 10) continue;
    const [x, y] = iso(e.fi, e.fj), sx = Math.round(x - camX), sy = Math.round(y - camY - e.def.chest * 1.6 - 14 * (e.look.scale || 1));
    const n = e.pw.length;
    for (let k = 0; k < n; k++) { const px = sx - (n * 4 - 1) / 2 + k * 4; fillRect(Math.round(px) - 1, sy - 1, 4, 4, BLK); fillRect(Math.round(px), sy, 2, 2, POWERS[e.pw[k]].col); }
  }
}
function powerLine(e) { return e.pw.map(p => POWERS[p].name); }
