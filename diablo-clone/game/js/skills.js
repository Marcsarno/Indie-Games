'use strict';
// Hero skills, champions and the broodmother's lair. Skills unlock with hero level so there is
// always a next thing to reach; each has a mana cost and a cooldown.

const SKILLSETS = {
  warrior: [
    { id: 'bolt', name: 'HOLY BOLT', lvl: 1, mana: 6, cd: 0.5 },
    { id: 'bash', name: 'SHIELD BASH', lvl: 2, mana: 6, cd: 3 },
    { id: 'whirl', name: 'WHIRLWIND', lvl: 3, mana: 10, cd: 4 },
    { id: 'cry', name: 'WAR CRY', lvl: 4, mana: 8, cd: 12 },
  ],
  // the mage's attack button fires magic missiles (no mana); these are its three buttons
  mage: [
    { id: 'fireball', name: 'FIREBALL', lvl: 1, mana: 9, cd: 0.7 },
    { id: 'cone', name: 'CONE OF COLD', lvl: 2, mana: 12, cd: 5 },
    { id: 'meteor', name: 'METEOR', lvl: 3, mana: 22, cd: 9 },
    { id: 'blink', name: 'BLINK', lvl: 4, mana: 8, cd: 3 },
  ],
};
let SKILLS = SKILLSETS.warrior;
function setSkillsFor(cls) { SKILLS = SKILLSETS[cls] || SKILLSETS.warrior; }
const CD = { bolt: 0, bash: 0, whirl: 0, cry: 0, fireball: 0, cone: 0, meteor: 0, blink: 0 };
function resetSkills() { for (const k in CD) CD[k] = 0; hero.whirl = 0; hero.dash = 0; hero.buff = 0; }
const heroBusy = () => hero.atk >= 0 || hero.cast >= 0 || hero.dash > 0 || hero.whirl > 0;
// one hit's damage, with the war cry bonus
const heroDmg = (k = 1) => Math.max(1, Math.round(roll(STAT.dmg) * k * (hero.buff > 0 ? 1.4 : 1)));

function useSkill(i) {
  const s = SKILLS[i];
  if (G.mode !== 'play' || hero.dead || !s) return;
  if (hero.lvl < s.lvl) { say(`${s.name} UNLOCKS AT LEVEL ${s.lvl}`, 25, 1.4); return; }
  if (CD[s.id] > 0) return;
  if (s.id === 'bolt') { heroCast(); if (hero.cast >= 0) CD.bolt = s.cd; return; }
  // a spell may cut a magic-missile cast short; anything else waits for the hero to be free
  if (heroBusy() && !(hero.castKind === 'missile' && hero.cast >= 0 && hero.atk < 0 && !(hero.dash > 0) && !(hero.whirl > 0))) return;
  if (hero.mana < s.mana) { say('NOT ENOUGH MANA', 40, 1.2); return; }
  hero.mana -= s.mana; CD[s.id] = s.cd;
  if (s.id === 'whirl') { hero.whirl = 0.8; hero.whirlTick = 0; sfx('heavySwing'); }
  if (s.id === 'bash') startBash();
  if (s.id === 'cry') warCry();
  if (s.id === 'fireball') castFireball();
  if (s.id === 'cone') coneOfCold();
  if (s.id === 'blink') blink();
  if (s.id === 'meteor') castMeteor();
}

// ---------------------------------------------------------------- mage spells
// Every spell's damage comes from the staff (STAT.dmg), so a better staff makes all of them hit
// harder. A cast is three poses: gather, release (the spell leaves here, CAST_RELEASE s after the
// tap, with a flare at the staff's orb), follow-through; once it is out, the stick cancels the rest.
const CAST_RELEASE = 0.06;
const spellDmg = k => Math.max(1, Math.round(roll(STAT.dmg) * k * (hero.buff > 0 ? 1.4 : 1)));
const spellCrit = () => Math.random() < CRIT_CHANCE + (STAT.crit || 0) / 100;
function startCast(kind, dur, target, fn) {
  if (target) hero.dir = dirFrom(target[0] - hero.fi, target[1] - hero.fj);
  hero.cast = dur; hero.castKind = kind; hero.castAge = 0; hero.clip = 'channel'; hero.approach = null; hero.castFn = fn || null;
}
// where a spell leaves the staff: in front of the hero, at the orb's height
function staffTip() { const [fx, fy] = dirVec(hero.dir); return [hero.fi + fx * 0.45 + fy * 0.25, hero.fj + fy * 0.45 - fx * 0.25]; }
const ORB_Z = 30;
// a burst of light at the staff's orb as a spell leaves it (a star of sparks plus a light flash)
function orbFlare(col, hi, n = 10, up = false) {
  const [fi, fj] = staffTip(), [x, y] = iso(fi, fj), z = up ? ORB_Z + 12 : ORB_Z;
  for (let k = 0; k < n; k++) { const a = k / n * 6.283; pspawn(3, x, y, z, Math.cos(a) * 34, 0, Math.sin(a) * 30, 0.16, k % 2 ? hi : col); }
  G.sparks.push({ x, y, z, t: 0.1, col: hi });
  G.flashes.push({ fi, fj, t: 0.12, t0: 0.12, r: 70 });
}
function aimAt(range) {
  const t = nearestEnemy(range, true);
  if (t) return [t, [t.fi, t.fj]];
  const [fx, fy] = dirVec(hero.dir); return [null, [hero.fi + fx * 4, hero.fj + fy * 4]];
}
// magic missiles (the attack button): two homing darts fanned out, three from level 5
function castMissiles() {
  const [t, at] = aimAt(8);
  startCast('missile', 0.3 / (1 + ((STAT.atkSpeed || 0) + (hero.frenzy > 0 ? 50 : 0)) / 100), at, () => {   // attack speed and frenzy cast faster
    const [ox, oy] = staffTip(), a0 = Math.atan2(at[1] - hero.fj, at[0] - hero.fi);
    const spread = hero.lvl >= 5 ? [-0.45, 0, 0.45] : [-0.32, 0.32];
    for (const da of spread) {
      const a = a0 + da;
      projectiles.push({ kind: 'missile', fi: ox, fj: oy, vx: Math.cos(a) * 7.5, vy: Math.sin(a) * 7.5, z: ORB_Z, life: 1.3, owner: 'hero', home: t, spell: true, dmgK: 0.45, age: 0 });
    }
    orbFlare(39, 40, 8); sfx('missile');
  });
}
function castFireball() {
  const [, at] = aimAt(9);
  startCast('fireball', 0.32, at, () => {
    const [ox, oy] = staffTip(), dx = at[0] - ox, dy = at[1] - oy, l = Math.hypot(dx, dy) || 1;
    projectiles.push({ kind: 'hfire', fi: ox, fj: oy, vx: dx / l * 7, vy: dy / l * 7, z: ORB_Z - 6, life: 1.6, owner: 'hero', spell: true, boom: { r: 1.7, k: 1.6, pow: 1 }, age: 0 });
    orbFlare(16, 18, 12); sfx('fireball');
  });
}
// fire explosion shared by the fireball and the meteor: everything in radius r takes k x staff damage
function explodeAt(fi, fj, r, k, pow, big = false) {
  G.pierce = true;   // blasts get round shields
  for (const e of enemies) {
    if (!alive(e)) continue;
    const d = Math.hypot(e.fi - fi, e.fj - fj);
    if (d < r + (e.def.unique ? 0.4 : 0)) { const c = spellCrit(); damageEnemy(e, spellDmg(c ? k * 2 : k), fi, fj, c, pow, true); }
  }
  G.pierce = false;
  for (const p of dynProps) if (!p.broken && (p.kind === 'barrel' || p.kind === 'egg') && Math.hypot(p.i + 0.5 - fi, p.j + 0.5 - fj) < r + 0.3) hitProp(p);
  const [x, y] = iso(fi, fj);
  // a ring of flame rolls out across the ground to the edge of the blast
  const ringN = big ? 56 : 30, sp = r * 22.6 / 0.32;
  for (let k = 0; k < ringN; k++) { const a = k / ringN * 6.283; pspawn(4, x, y, 3, Math.cos(a) * sp, Math.sin(a) * sp * 0.5, 0, 0.32, k % 3 ? 16 : 17); }
  for (let k = 0; k < (big ? 30 : 12); k++) { const a = Math.random() * 6.283, d = Math.random() * r * 18; pspawn(3, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.5, 2, 0, 0, 20 + Math.random() * 40, 0.5, Math.random() < 0.5 ? 15 : 16); }   // flames licking up
  for (let k = 0; k < (big ? 16 : 8); k++) { const a = Math.random() * 6.283, d = Math.random() * r * 12; pspawn(3, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.5, 10, (Math.random() - 0.5) * 10, 0, 14 + Math.random() * 14, 0.9, Math.random() < 0.5 ? 4 : 5); }   // smoke rising after
  burst(2, x, y, 8, big ? 40 : 22, big ? 150 : 100, 17); burst(2, x, y, 6, big ? 30 : 14, big ? 110 : 70, 16); burst(3, x, y, 4, big ? 18 : 8, 40, 15);
  stampBlood(Math.round(x), Math.round(y), big ? 7 : 4, (Math.random() * 1e6) | 0, [2, 3, 3, 4, 5]);   // a scorch mark
  G.flashes.push({ fi, fj, t: big ? 0.45 : 0.25, t0: big ? 0.45 : 0.25, r: big ? 150 : 100 });
  G.blasts.push({ fi, fj, r, t: big ? 0.32 : 0.22, t0: big ? 0.32 : 0.22 });
  if (SHAKE) G.trauma = Math.min(1, G.trauma + (big ? 0.6 : 0.28));
  sfx('boom');
}
// cone of cold: a blast of frost in a wedge in front of the mage. Ordinary monsters freeze solid
// (can't move or attack, take 40% more damage, shatter on death); bosses, elites and champions
// are slowed to half speed instead
const CONE_R = 4.4, CONE_HALF = 0.62;   // tiles, half-angle (radians: about 70 degrees across)
function coneOfCold() {
  const [, at] = aimAt(CONE_R + 0.5);
  startCast('cone', 0.34, at, () => {
    const a0 = Math.atan2(at[1] - hero.fj, at[0] - hero.fi), [x, y] = screenOf(hero);
    for (const e of enemies) {
      if (!alive(e)) continue;
      const dx = e.fi - hero.fi, dy = e.fj - hero.fj, d = Math.hypot(dx, dy);
      let da = Math.abs(((Math.atan2(dy, dx) - a0 + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (d > CONE_R + (e.def.unique ? 0.5 : 0) || (d > 0.6 && da > CONE_HALF + 0.25 / Math.max(1, d))) continue;
      wake(e); G.pierce = true; damageEnemy(e, spellDmg(0.8), hero.fi, hero.fj, spellCrit(), 0, true); G.pierce = false;
      if (!alive(e)) continue;
      if (e.def.unique || e.def.elite || e.champ) { e.slowT = e.def.unique ? 3 : 4; }
      else { e.frozen = 3; e.atk = -1; e.hurt = 0; e.kb = [0, 0]; }
    }
    // shards of frost flying out across the wedge, and a sheet of frost on the ground (drawn)
    for (let k = 0; k < 46; k++) {
      const a = a0 + (Math.random() * 2 - 1) * CONE_HALF, T = 9 + Math.random() * 5, gx = Math.cos(a), gy = Math.sin(a);   // tiles/s along the ground
      pspawn(4, x, y, 10 + Math.random() * 12, (gx - gy) * 16 * T, (gx + gy) * 8 * T, 0, 0.26 + Math.random() * 0.12, k % 3 ? 118 : 117);
    }
    G.cones.push({ fi: hero.fi, fj: hero.fj, a0, t: 0.5, t0: 0.5 });
    orbFlare(117, 118, 12);
    if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.18);
    sfx('frost');
  });
}
// meteor: called down on the thickest group in sight; a ring warns where it will land, then it
// streaks in from the sky and crashes for heavy damage over a wide area
function castMeteor() {
  let best = null, bn = -1;
  for (const e of enemies) {
    if (!alive(e) || LV.vis[tIdx(Math.floor(e.fi), Math.floor(e.fj))] < 0.3 || Math.hypot(e.fi - hero.fi, e.fj - hero.fj) > 8) continue;
    let n = 0; for (const o of enemies) if (alive(o) && Math.hypot(o.fi - e.fi, o.fj - e.fj) < 2.2) n++;
    if (n > bn) { bn = n; best = e; }
  }
  const [fx, fy] = dirVec(hero.dir), at = best ? [best.fi, best.fj] : [hero.fi + fx * 3, hero.fj + fy * 3];
  startCast('meteor', 0.42, best ? at : null, () => {
    G.meteors.push({ fi: at[0], fj: at[1], t: 0.9, t0: 0.9 });
    orbFlare(16, 18, 14, true); sfx('meteor');
  });
}
// blink: vanish in a burst of arcane light and reappear up to 4.5 tiles away, in the stick's
// direction (or the way the mage faces), stopping short of walls. Leaves a fading afterimage.
function blink() {
  let [dx, dy] = dirVec(hero.dir);
  const vx = input.mx, vy = input.my;
  if (Math.hypot(vx, vy) > 0.2) [dx, dy] = stickToGround(vx, vy);
  let dist = 0;
  for (let s = 0.25; s <= 4.5; s += 0.25) { if (blocked(hero.fi + dx * s, hero.fj + dy * s)) break; dist = s; }
  if (dist < 0.5) { CD.blink = 0; hero.mana += 8; return; }   // nowhere to go: refund
  const [x0, y0] = screenOf(hero);
  G.ghosts.push({ sp: getSprite('hero', hero.look, hero.dir, hero.clip, frameOf(hero), hero), x: x0, y: y0, t: 0.35, t0: 0.35 });
  const fi1 = hero.fi + dx * dist, fj1 = hero.fj + dy * dist, [x1, y1] = iso(fi1, fj1);
  for (let k = 0; k <= 12; k++) { const u = k / 12; pspawn(3, x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, 14 + Math.random() * 12, 0, 0, 6, 0.25 + u * 0.1, k % 2 ? 40 : 39); }   // the streak between
  for (const [x, y] of [[x0, y0], [x1, y1]]) for (let k = 0; k < 16; k++) { const a = k / 16 * 6.283; pspawn(4, x, y, 16, Math.cos(a) * 60, Math.sin(a) * 30, 0, 0.25, k % 2 ? 40 : 39); }
  hero.fi = fi1; hero.fj = fj1; hero.dir = dirFrom(dx, dy); hero.cast = -1; hero.castFn = null; hero.atk = -1; hero.approach = null;
  G.flashes.push({ fi: fi1, fj: fj1, t: 0.2, t0: 0.2, r: 90 });
  sfx('blink');
}
function updateMeteors(dt) {
  for (const m of G.meteors) {
    m.t -= dt;
    if (m.t < 0.45 && Math.random() < 0.9) {   // the falling rock trails fire
      const [x, y] = iso(m.fi, m.fj), k = Math.max(0, m.t) / 0.45;
      pspawn(3, x - k * 50 + (Math.random() - 0.5) * 6, y, k * 150, 0, 0, 0, 0.3, Math.random() < 0.5 ? 16 : 17);
    }
    if (m.t <= 0 && !m.done) {
      m.done = true; explodeAt(m.fi, m.fj, 2.4, 3.2, 2, true);
      const [x, y] = iso(m.fi, m.fj), dust = LV.outdoor ? DIRT[3] : S[5];
      for (let k = 0; k < 28; k++) { const a = k / 28 * 6.283; pspawn(5, x, y, 1, Math.cos(a) * 75, Math.sin(a) * 37, 40 + Math.random() * 30, 1, k % 3 ? dust : 15); }
      sfx('crit');
    }
  }
  G.meteors = G.meteors.filter(m => !m.done);
  for (const f of G.flashes) f.t -= dt;
  for (const bl of G.blasts) bl.t -= dt; G.blasts = G.blasts.filter(bl => bl.t > 0);
  for (const c of G.cones) c.t -= dt; G.cones = G.cones.filter(c => c.t > 0);
  for (const g of G.ghosts) g.t -= dt; G.ghosts = G.ghosts.filter(g => g.t > 0);
  for (const s of G.sparks) s.t -= dt; G.sparks = G.sparks.filter(s => s.t > 0);
  G.flashes = G.flashes.filter(f => f.t > 0);
}
// the warning ring (closing in as the meteor nears) and the falling rock itself; explosions are a
// disk of fire that swells to the blast's edge and burns out from the middle (dithered)
function drawMeteors() {
  for (const c of G.cones) {   // a wedge of frost on the ground: sweeps out, then thins away (dithered, under the bodies)
    const p = 1 - c.t / c.t0, reach = CONE_R * Math.min(1, p * 4), [hx, hy] = iso(c.fi, c.fj);
    for (let y = Math.floor(hy - camY - 60); y <= hy - camY + 60; y++) for (let x = Math.floor(hx - camX - 110); x <= hx - camX + 110; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H || cid[y * W + x]) continue;
      // screen pixel back to ground tiles, relative to the caster
      const sx = (x + camX - hx) / 16, sy = (y + camY - hy) / 8, gi = (sx + sy) / 2, gj = (sy - sx) / 2, d = Math.hypot(gi, gj);   // inverse of iso()
      if (d > reach || d < 0.4) continue;
      const da = Math.abs(((Math.atan2(gj, gi) - c.a0 + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (da > CONE_HALF) continue;
      const th = BAYER[((y & 3) << 2) | (x & 3)], edge = Math.min(1, (CONE_HALF - da) * 5) * (1 - (d / (CONE_R + 0.5)) ** 2);
      if (th > edge * 1.5 * (1.1 - p) + 0.08) continue;
      scr[y * W + x] = (th < 0.3 && p < 0.6 ? 118 : 117) | EMIS;
    }
  }
  for (const s of G.sparks) {   // a four-pointed star at the staff's orb as a spell leaves it
    const x = Math.round(s.x - camX), y = Math.round(s.y - s.z - camY), L = s.t > 0.05 ? 5 : 3;
    for (let k = -L; k <= L; k++) for (const [a, b] of [[k, 0], [0, k]]) { const xx = x + a, yy = y + b; if (xx >= 0 && yy >= 0 && xx < W && yy < H) scr[yy * W + xx] = (Math.abs(k) < 2 ? 27 : s.col) | EMIS; }
  }
  for (const bl of G.blasts) {
    const [cx0, cy0] = iso(bl.fi, bl.fj), cx = cx0 - camX, cy = cy0 - camY, p = 1 - bl.t / bl.t0;
    const R = bl.r * 22.6 * (0.45 + 0.55 * Math.min(1, p * 2.2)), hole = Math.max(0, p - 0.35) / 0.65;
    for (let y = Math.floor(cy - R / 2); y <= cy + R / 2; y++) for (let x = Math.floor(cx - R); x <= cx + R; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const d = Math.hypot((x - cx) / R, (y - cy) * 2 / R); if (d > 1 || d < hole) continue;
      if (p > 0.3 && cid[y * W + x]) continue;   // after the first flash the fire stays on the ground, under the bodies
      const th = BAYER[((y & 3) << 2) | (x & 3)];
      if (th > 1.1 - p) continue;   // thins out as it burns away
      const heat = (1 - d) * (1 - p * 0.6);
      scr[y * W + x] = (heat > 0.6 ? 18 : heat > 0.4 ? 17 : heat > 0.2 ? 16 : 15) | EMIS;
    }
  }
  for (const m of G.meteors) {
    const [cx0, cy0] = iso(m.fi, m.fj), cx = cx0 - camX, cy = cy0 - camY, rx = 2.4 * 22.6, ry = rx / 2, blink = Math.floor(G.t * 14) % 2, fill = 1 - m.t / m.t0;
    for (let a = 0; a < 170; a++) {
      const t = a / 170 * Math.PI * 2;
      for (const k of [1, fill]) {
        const x = Math.round(cx + Math.cos(t) * rx * k), y = Math.round(cy + Math.sin(t) * ry * k);
        if (x < 0 || y < 0 || x >= W || y >= H || ((a + blink) & 1 && k === 1)) continue;
        scr[y * W + x] = (k === 1 ? 16 : 15) | EMIS;
      }
    }
    if (m.t < 0.45) {   // the rock: a glowing ball coming in from the upper left
      const k = Math.max(0, m.t) / 0.45, rx0 = Math.round(cx - k * 50), ry0 = Math.round(cy - k * 150);
      for (let b = -7; b <= 7; b++) for (let a = -7; a <= 7; a++) {
        const d = a * a + b * b, x = rx0 + a, y = ry0 + b;
        if (d > 45 || x < 0 || y < 0 || x >= W || y >= H) continue;
        scr[y * W + x] = (d <= 6 ? 18 : d <= 18 ? 17 : d <= 32 ? 16 : 14) | EMIS;
      }
    }
  }
}
function nearestEnemy(range, needLos = false) {
  let best = null, bd = range;
  for (const e of enemies) {
    if (!alive(e) || LV.vis[tIdx(Math.floor(e.fi), Math.floor(e.fj))] < 0.3) continue;
    const d = Math.hypot(e.fi - hero.fi, e.fj - hero.fj);
    if (d < bd && (!needLos || los(hero.fi, hero.fj, e.fi, e.fj))) { bd = d; best = e; }
  }
  return best;
}
// shield bash: a short dash at the nearest enemy, then a heavy knockback and a stun
function startBash() {
  const t = nearestEnemy(3);
  if (t) hero.dir = dirFrom(t.fi - hero.fi, t.fj - hero.fj);
  hero.dash = 0.16; hero.bashTarget = t; hero.bashDone = false; sfx('swing');
}
function warCry() {
  hero.buff = 8;
  sfx('cry');
  const [x, y] = screenOf(hero);
  for (let k = 0; k < 28; k++) { const a = k / 28 * 6.283; pspawn(4, x, y, 20, Math.cos(a) * 70, Math.sin(a) * 35, 6, 0.5, 51); }
  for (const e of enemies) if (alive(e) && Math.hypot(e.fi - hero.fi, e.fj - hero.fj) < 3.2) { wake(e); e.hurt = Math.max(e.hurt, 0.45); e.atk = -1; }
  if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.25);
  say('WAR CRY! DAMAGE AND ARMOR UP', 51, 1.6);
}
function updateSkills(dt) {
  for (const k in CD) CD[k] = Math.max(0, CD[k] - dt);
  if (hero.buff > 0) {
    hero.buff -= dt;
    if (Math.random() < dt * 12) { const [x, y] = screenOf(hero); pspawn(4, x + (Math.random() - 0.5) * 14, y, 6 + Math.random() * 30, 0, 0, 14, 0.4, 50); }
  }
  if (hero.whirl > 0) {
    hero.whirl -= dt; hero.whirlTick -= dt;
    if (hero.whirlTick <= 0) {   // four hits on everything in reach while spinning
      hero.whirlTick = 0.2;
      for (const e of enemies) if (alive(e) && Math.hypot(e.fi - hero.fi, e.fj - hero.fj) < heroReach() + 0.35) { const crit = Math.random() < CRIT_CHANCE; damageEnemy(e, heroDmg(crit ? 1.2 : 0.6), hero.fi, hero.fj, crit); }
      for (const p of dynProps) if (!p.broken && (p.kind === 'barrel' || p.kind === 'egg') && Math.hypot(p.i + 0.5 - hero.fi, p.j + 0.5 - hero.fj) < 1.7) hitProp(p);
      sfx('swing');
    }
  }
  if (hero.dash > 0) {
    hero.dash -= dt;
    const [fx, fy] = dirVec(hero.dir), sp = 9 * dt;
    const t = hero.bashTarget;
    if (!t || Math.hypot(t.fi - hero.fi, t.fj - hero.fj) > 0.95) tryMove(hero, fx * sp, fy * sp);
    if (!hero.bashDone && (hero.dash <= 0 || (t && Math.hypot(t.fi - hero.fi, t.fj - hero.fj) <= 1.0))) {
      hero.bashDone = true; hero.dash = 0;
      if (t && alive(t) && Math.hypot(t.fi - hero.fi, t.fj - hero.fj) < 1.6) {
        G.pierce = true; damageEnemy(t, heroDmg(0.5), hero.fi, hero.fj); G.pierce = false;   // the bash knocks a shield aside
        if (alive(t)) { const d = Math.hypot(t.fi - hero.fi, t.fj - hero.fj) || 1; t.kb = [(t.fi - hero.fi) / d * (t.def.unique ? 4 : 10), (t.fj - hero.fj) / d * (t.def.unique ? 4 : 10)]; t.stun = t.def.unique ? 0.5 : 1.4; t.atk = -1; }
        hero.stop = Math.max(hero.stop, 0.12); sfx('kill');
        if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.3);
      }
    }
  }
}

// ---------------------------------------------------------------- champions
// A champion is any common monster rolled stronger: bigger, recolored, named, more loot.
const CHAMP_KINDS = [
  { prefix: 'BERSERK', tint: 'red', hp: 2, dmg: 1.7, speed: 1.25 },
  { prefix: 'STONE', tint: 'grey', hp: 3.2, dmg: 1.3, speed: 0.9 },
  { prefix: 'PLAGUED', tint: 'green', hp: 2.4, dmg: 1.4, speed: 1.05 },
  { prefix: 'SHADOW', tint: 'purple', hp: 2.2, dmg: 1.5, speed: 1.15 },
];
const champChance = level => Math.min(0.18, 0.03 + level * 0.022);
function makeChampion(e, R) {
  const c = CHAMP_KINDS[Math.floor(R() * CHAMP_KINDS.length)];
  e.champ = c;
  e.hp = e.maxHp = Math.round(e.maxHp * c.hp);
  e.dmg = e.dmg.map(v => Math.round(v * c.dmg));
  e.speedK = c.speed;
  e.look = { ...e.look, tint: c.tint };   // same body as the base monster, recolored: its sprites are a cheap remap
  e.name = c.prefix + ' ' + e.def.name;
}
// tints remap each lit color to the closest-luminance color of the tint ramp; darks and
// emissive pixels (eyes, fire) are kept so the outline and glow survive
const TINT_RAMPS = { red: [19, 20, 21, 22, 23], grey: [2, 28, 29, 30, 31, 32], green: [52, 53, 54, 55, 26], purple: [56, 57, 58, 59, 27] };
const TINT_MAP = {};
for (const t in TINT_RAMPS) {
  const map = new Uint8Array(NPAL), ramp = TINT_RAMPS[t];
  for (let i = 0; i < NPAL; i++) {
    if (i <= 3 || lum(i) < 0.1) { map[i] = i; continue; }
    let best = ramp[0], bd = 9; for (const j of ramp) { const d = Math.abs(lum(j) - lum(i)); if (d < bd) { bd = d; best = j; } }
    map[i] = best;
  }
  TINT_MAP[t] = map;
}
function tintSprite(sp, tint) {
  const map = TINT_MAP[tint]; if (!map) return sp;
  const d = sp.data.slice();
  for (let k = 0; k < d.length; k++) { const v = d[k]; if (v && !(v & EMIS)) d[k] = map[v]; }
  return { ...sp, data: d };
}

// ---------------------------------------------------------------- the broodmother's lair
// Every third floor the stairs room is her lair: egg sacs that hatch spiderlings while she lives,
// a telegraphed lunge, and the stairs stay sealed until she dies.
const isBossFloor = level => level % 3 === 0;
let boss = null;
function setupBoss() {
  boss = enemies.find(e => e.def.unique) || null;
  if (boss) boss.special = 4;
}
function bossAlive() { return boss && alive(boss); }
function updateBoss(e, dt, d, dx, dy) {
  if (e.def.boss === 'slam') return updateWarlord(e, dt, d);
  if (e.def.boss === 'king') return updateKing(e, dt, d);
  // returns true when the lunge state machine owns this frame
  e.special -= dt;
  if (e.lunge > 0) {   // telegraph: rear up and mark the line on the floor
    e.lunge -= dt; e.clip = 'attack'; e.atk = 0; e.dir = dirFrom(e.lx - e.fi, e.ly - e.fj);
    if (e.lunge <= 0) { e.dashT = 0.35; e.dashHit = false; sfx('heavySwing'); }
    return true;
  }
  if (e.dashT > 0) {
    e.dashT -= dt;
    const vx = e.lx - e.fi, vy = e.ly - e.fj, l = Math.hypot(vx, vy);
    if (l > 0.2) tryMove(e, vx / l * 13 * dt, vy / l * 13 * dt, 0.4);
    e.clip = 'attack'; e.atk = 300;
    if (!e.dashHit && Math.hypot(hero.fi - e.fi, hero.fj - e.fj) < 1.3) { e.dashHit = true; hurtHero(roll(e.dmg) * 2, e); if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.5); }
    if (e.dashT <= 0) { e.atk = -1; e.cool = 0.8; e.special = 5 + Math.random() * 2; }
    return true;
  }
  if (e.special <= 0 && d < 7 && d > 1.6 && los(e.fi, e.fj, hero.fi, hero.fj)) {
    const l = d || 1;
    e.lx = hero.fi + dx / l * 1.5; e.ly = hero.fj + dy / l * 1.5;
    e.lunge = 0.8; e.atk = -1;
    return true;
  }
  return false;
}
// The ogre warlord: every few seconds he raises his club and slams the ground where the hero
// stood; a blinking red ring marks the spot (0.9 s to get out). At half life he bellows for goblins.
function updateWarlord(e, dt, d) {
  e.special -= dt;
  if (!e.called && e.hp < e.maxHp * 0.5) {
    const mins = e.def.minions || ['gshaman', 'goblin'];
    e.called = true; say(e.def.calls || 'THE WARLORD CALLS HIS GOBLINS', 22, 2.5); sfx('cry');
    for (let k = 0; k < 4; k++) { const a = k / 4 * 6.283; const g = makeEnemy(mins[k % 2], e.fi + Math.cos(a) * 2.5, e.fj + Math.sin(a) * 2.5, enemies.length); if (!blocked(g.fi, g.fj)) { g.state = 'hunt'; enemies.push(g); } }
  }
  if (e.slamT > 0) {
    e.slamT -= dt; e.clip = 'attack'; e.atk = 0; e.dir = dirFrom(e.lx - e.fi, e.ly - e.fj);
    if (e.slamT <= 0.12) e.atk = 380;   // the club comes down
    if (e.slamT <= 0) {
      if (Math.hypot(hero.fi - e.lx, hero.fj - e.ly) < 2.0) hurtHero(Math.round(roll(e.dmg) * 1.6), e);
      if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.6);
      const [x, y] = iso(e.lx, e.ly);
      for (let k = 0; k < 30; k++) { const a = k / 30 * 6.283; pspawn(5, x, y, 1, Math.cos(a) * 80, Math.sin(a) * 40, 50 + Math.random() * 40, 1, k % 3 ? (LV.outdoor ? DIRT[3] : S[5]) : DIRT[4]); }
      sfx('crit'); e.atk = -1; e.cool = 1.1; e.special = 4 + Math.random() * 2.5;
    }
    return true;
  }
  if (e.special <= 0 && d < 6.5 && d > 1.2) {
    e.lx = hero.fi; e.ly = hero.fj; e.slamT = 0.9; sfx('heavySwing');
    return true;
  }
  return false;
}
// The Skeleton King: every few seconds he raises his sword and calls the dead up out of the floor
// around him (a ring of three, at most six of his raised at once); otherwise he fights in melee.
function updateKing(e, dt, d) {
  e.special = (e.special ?? 3) - dt;
  if (e.raiseT > 0) {
    e.raiseT -= dt; e.clip = 'attack'; e.atk = 0;
    if (e.raiseT <= 0) {
      const mine = enemies.filter(o => o.raisedBy === e && alive(o)).length;
      for (let k = 0; k < Math.min(3, 6 - mine); k++) {
        const a = k / 3 * 6.283 + Math.random(), fi = e.fi + Math.cos(a) * 1.8, fj = e.fj + Math.sin(a) * 1.8;
        if (blocked(fi, fj)) continue;
        const s = makeEnemy('skeleton', fi, fj, enemies.length); s.state = 'hunt'; s.raisedBy = e; enemies.push(s);
        const [x, y] = iso(fi, fj); burst(5, x, y, 4, 10, 40, 25); burst(4, x, y, 6, 8, 30, 59);
      }
      sfx('cry'); e.atk = -1; e.cool = 0.8; e.special = 7 + Math.random() * 3;
    }
    return true;
  }
  if (e.special <= 0 && d < 9) { e.raiseT = 0.7; say('THE KING RAISES HIS DEAD', 22, 2); return true; }
  return false;
}
// the warning ring: a blinking red ellipse on the ground where the slam will land
function drawSlamRing() {
  if (!bossAlive() || !(boss.slamT > 0)) return;
  const [cx0, cy0] = iso(boss.lx, boss.ly), cx = cx0 - camX, cy = cy0 - camY, rx = 2.0 * 22.6, ry = rx / 2, blink = Math.floor(G.t * 14) % 2;
  const fill = 1 - boss.slamT / 0.9;
  for (let a = 0; a < 160; a++) {
    const t = a / 160 * Math.PI * 2;
    for (const k of [1, fill]) {
      const x = Math.round(cx + Math.cos(t) * rx * k), y = Math.round(cy + Math.sin(t) * ry * k);
      if (x < 0 || y < 0 || x >= W || y >= H || ((a + blink) & 1 && k === 1)) continue;
      scr[y * W + x] = RED[k === 1 ? 3 : 2] | EMIS;
    }
  }
}
// a red dotted warning line from the broodmother to where her lunge will land
function drawTelegraph() {
  drawSlamRing();
  for (const e of enemies) {   // a charger's warning line: dotted red down the path it's about to rush
    if (!(e.windT > 0) || !alive(e)) continue;
    const [ax, ay] = iso(e.fi, e.fj), [bx, by] = iso(e.fi + e.rdir[0] * e.rushLen, e.fj + e.rdir[1] * e.rushLen), n = Math.ceil(Math.hypot(bx - ax, by - ay)), blink = Math.floor(G.t * 14) % 2;
    for (let s = 0; s <= n; s++) { const x = Math.round(ax + (bx - ax) * s / n - camX), y = Math.round(ay + (by - ay) * s / n - camY); if (x < 0 || y < 0 || x >= W || y >= H || ((s + blink) & 3) === 0) continue; scr[y * W + x] = RED[3] | EMIS; }
  }
  if (!bossAlive() || !(boss.lunge > 0)) return;
  const [ax, ay] = iso(boss.fi, boss.fj), [bx, by] = iso(boss.lx, boss.ly), n = Math.ceil(Math.hypot(bx - ax, by - ay));
  const blink = Math.floor(G.t * 12) % 2;
  for (let s = 0; s <= n; s++) {
    const x = Math.round(ax + (bx - ax) * s / n - camX), y = Math.round(ay + (by - ay) * s / n - camY);
    for (let o = -1; o <= 1; o++) { const yy = y + o; if (x < 0 || yy < 0 || x >= W || yy >= H) continue; if (((s + o + blink) & 3) === 0) continue; scr[yy * W + x] = RED[3] | EMIS; }
  }
}
// egg sacs: breakable, hatch spiderlings while she lives and the hero is near
const EGG_HP = 2;
function hatchEggs(dt) {
  if (!bossAlive()) return;
  const spawned = enemies.filter(e => e.hatched && alive(e)).length;
  for (const p of dynProps) {
    if (p.kind !== 'egg' || p.broken) continue;
    if (Math.hypot(p.i + 0.5 - hero.fi, p.j + 0.5 - hero.fj) > 9) continue;
    p.hatch -= dt;
    if (p.hatch <= 0 && spawned < 6) {
      p.hatch = 6 + Math.random() * 3;
      const e = makeEnemy('spider', p.i + 0.5 + (Math.random() - 0.5) * 0.6, p.j + 1.1, enemies.length);
      e.state = 'hunt'; e.hatched = true; enemies.push(e);
      burst(1, p.wx, p.wy, 6, 8, 30, 54);
    }
  }
}
function hitProp(p) {
  if (p.kind === 'barrel') return breakBarrel(p);
  if (p.kind === 'egg') {
    p.hp = (p.hp ?? EGG_HP) - 1; p.flash = 0.06; sfx('hit');
    burst(1, p.wx, p.wy, 6, 6, 40, 54);
    if (p.hp <= 0) { p.broken = true; LV.solid[tIdx(p.i, p.j)] = 0; burst(1, p.wx, p.wy, 6, 16, 50, 54); sfx('barrel'); }
  }
}
