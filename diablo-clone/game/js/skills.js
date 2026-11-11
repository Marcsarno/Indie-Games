'use strict';
// Hero skills, champions and the broodmother's lair. Skills unlock with hero level so there is
// always a next thing to reach; each has a mana cost and a cooldown.

const SKILLSETS = {
  warrior: [
    // round 24: the warrior's kit. Mana works as fury: every enemy his blows hit gives some back
    { id: 'slam', name: 'GROUND SLAM', lvl: 1, mana: 8, cd: 2.5 },
    { id: 'charge', name: 'SHIELD CHARGE', lvl: 2, mana: 6, cd: 5 },   // round 76: replaces the Chain Hook as a test (the user: the unlocks felt boring; mobility is fun). The hook's code stays: swap this line back to { id: 'hook', name: 'CHAIN HOOK', lvl: 2, mana: 6, cd: 4 }
    { id: 'whirl', name: 'WHIRLWIND', lvl: 3, mana: 10, cd: 4 },
    { id: 'leap', name: 'LEAP', lvl: 4, mana: 10, cd: 5 },
  ],
  // the mage's attack button fires magic missiles (no mana); these are its three buttons
  mage: [
    { id: 'fireball', name: 'FIREBALL', lvl: 1, mana: 9, cd: 0.7 },
    { id: 'cone', name: 'CONE OF COLD', lvl: 2, mana: 12, cd: 5 },
    { id: 'meteor', name: 'METEOR', lvl: 3, mana: 22, cd: 9 },
    { id: 'chain', name: 'CHAIN LIGHTNING', lvl: 4, mana: 14, cd: 2.5 },   // round 65: replaces Blink
  ],
  // round 33: the ranger's attack button looses single arrows (no focus); these are its four
  ranger: [   // round 66: the kit rethought (the user: boring; every skill lost damage against just shooting)
    { id: 'pierce', name: 'PIERCING SHOT', lvl: 1, mana: 7, cd: 0.9 },
    { id: 'cluster', name: 'CLUSTER ARROW', lvl: 2, mana: 12, cd: 2.5 },
    { id: 'sentry', name: 'SENTRY', lvl: 3, mana: 14, cd: 8 },
    { id: 'vault', name: 'VAULT', lvl: 4, mana: 8, cd: 4 },   // round 66b: replaces the Hawk (the user didn't like it)
  ],
};
let SKILLS = SKILLSETS.warrior;
function setSkillsFor(cls) { SKILLS = SKILLSETS[cls] || SKILLSETS.warrior; }
const CD = { charge: 0, bolt: 0, bash: 0, whirl: 0, cry: 0, slam: 0, hook: 0, leap: 0, fireball: 0, cone: 0, meteor: 0, blink: 0, chain: 0, multi: 0, trap: 0, roll: 0, mark: 0, pierce: 0, cluster: 0, sentry: 0, hawk: 0, vault: 0 };
function resetSkills() { for (const k in CD) CD[k] = 0; hero.whirl = 0; hero.dash = 0; hero.buff = 0; hero.charge = null; hero.chargeAgain = 0; hero.chargeSecond = false; }
const heroBusy = () => hero.atk >= 0 || hero.cast >= 0 || hero.dash > 0 || hero.whirl > 0 || !!hero.leap || !!hero.ultOn || !!hero.roll;
// one hit's damage, with the war cry bonus
const heroDmg = (k = 1) => Math.max(1, Math.round((roll(STAT.dmg) + (STAT.fireDmg || 0)) * k * (hero.buff > 0 ? 1.4 : 1) * (HEAVY ? 1.25 : 1)));   // round 62: heavier blows   // fire damage from gear rides on every hit (round 42a)

// button feedback (round 25): a pulse when a skill fires, a flash when it is ready again, a shake
// with no mana
const BTN_FX = [];
const btnFx = i => BTN_FX[i] || (BTN_FX[i] = { press: 0, ready: 0, deny: 0, cd: 0 });
function useSkill(i) {
  const s = SKILLS[i];
  if (G.mode !== 'play' || hero.dead || !s) return;
  if (hero.lvl < s.lvl) { say(`${s.name} UNLOCKS AT LEVEL ${s.lvl}`, 25, 1.4); return; }
  if (s.id === 'charge' && hero.chargeAgain > 0 && !heroBusy()) { hero.chargeAgain = 0; CD.charge = s.cd; btnFx(i).press = 0.16; startCharge(); return; }   // Second Wind: the free second charge
  if (CD[s.id] > 0) return;
  if (s.id === 'bolt') { heroCast(); if (hero.cast >= 0) CD.bolt = s.cd; return; }
  // a spell may cut a magic-missile cast short; anything else waits for the hero to be free
  if (heroBusy() && !(hero.castKind === 'missile' && hero.cast >= 0 && hero.atk < 0 && !(hero.dash > 0) && !(hero.whirl > 0))) return;
  if (hero.mana < skillCost(s)) { say('NOT ENOUGH MANA', 40, 1.2); btnFx(i).deny = 0.3; sfx('tap'); return; }
  hero.mana -= skillCost(s); CD[s.id] = s.cd; btnFx(i).press = 0.16;
  if (s.id === 'whirl') { hero.whirl = skillMod('whirl') === 'long' ? 1.6 : 0.8; hero.whirlTick = 0; hero.devilT = 0.1; sfx('heavySwing'); }
  if (s.id === 'bash') startBash();
  if (s.id === 'cry') warCry();
  if (s.id === 'slam') groundSlam();
  if (s.id === 'charge') startCharge();
  if (s.id === 'hook') { if (!chainHook()) { hero.mana += s.mana; CD.hook = 0; } }
  if (s.id === 'leap') { if (!startLeap()) { hero.mana += s.mana; CD.leap = 0; } }
  if (s.id === 'fireball') castFireball();
  if (s.id === 'cone') coneOfCold();
  if (s.id === 'blink') blink();
  if (s.id === 'chain') { if (!chainLightning()) { hero.mana += skillCost(s); CD.chain = 0; } }
  if (s.id === 'meteor') castMeteor();
  if (s.id === 'pierce') { if (!piercingShot()) { hero.mana += skillCost(s); CD.pierce = 0; } }
  if (s.id === 'cluster') { if (!clusterArrow()) { hero.mana += skillCost(s); CD.cluster = 0; } }
  if (s.id === 'sentry') placeSentry();
  if (s.id === 'hawk') callHawk();
  if (s.id === 'vault') { if (!vault()) { hero.mana += skillCost(s); CD.vault = 0; } }
  if (s.id === 'multi') multishot();
  if (s.id === 'trap') { if (!throwTrap()) { hero.mana += skillCost(s); CD.trap = 0; } }
  if (s.id === 'roll') { if (!startRoll()) { hero.mana += skillCost(s); CD.roll = 0; } }
  if (s.id === 'mark') { if (!huntersMark()) { hero.mana += skillCost(s); CD.mark = 0; } }
}

// ---------------------------------------------------------------- the warrior's skills (round 24)
// Ground slam: an overhead chop into the floor (the 'attack4' swing); on contact the ground splits
// in a cone in front of him: everything in it is hit hard, knocked back and dazed for a moment
const SLAM_R = 4.2, SLAM_HALF = 0.55;
function groundSlam() {
  const t = nearestEnemy(SLAM_R + 1, true); if (t) hero.dir = dirFrom(t.fi - hero.fi, t.fj - hero.fj);
  hero.combo = 3; hero.atk = 0; hero.hitDone = false; hero.approach = null; hero.mag = 0; hero.afterSlam = false; hero.jumpDust = false;
  sfx('heavySwing');
}
function groundSlamHit() {
  const [fx, fy] = dirVec(hero.dir), a0 = Math.atan2(fy, fx), mod = skillMod('slam');
  if (hero.afterSlam) { hero.afterSlam = false; slamAt(a0, SLAM_R * 0.9, SLAM_HALF + 0.15, 0.9); return; }   // round 65c: Aftershock's second hop lands
  if (mod === 'ring') return slamAt(a0, 2.9, Math.PI, 1.4, true);   // the full circle: all around, shorter reach
  if (mod === 'fissure') {   // one long narrow crack racing out, hitting as it reaches each enemy
    G.fissures.push({ fi: hero.fi, fj: hero.fj, a0, reach: 0.5, R: 7.5, half: 0.2, hit: new Set() });
    const q = { fi: hero.fi + fx * 0.6, fj: hero.fj + fy * 0.6, a0, t: 1.1, t0: 1.1, R: 7.5, half: 0.12, n: 3, seed: (Math.random() * 1e6) | 0 };
    G.quakes.push(q); stampCracks(q);
    impactFlash(hero.fi + fx * 0.9, hero.fj + fy * 0.9, 3, 6);
    if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.4);
    landOomph(hero.fi + fx * 0.6, hero.fj + fy * 0.6, a0, false);   // round 65c
    sfx('boom'); sfx('crack');
    return;
  }
  slamAt(a0, SLAM_R, SLAM_HALF, 1.5);
  if (mod === 'after') G.aftershocks.push({ t: 0.22, a0, hop: true });   // a second, weaker slam on the same ground (round 65c: he hops again for it)
}
// one slam of the ground from where the hero stands: a cone (or ring) of reach R and half-angle half
function slamAt(a0, R, half, k, ring = false) {
  if (G.frostOrbs.length) breakOrbsAt(hero.fi, hero.fj, R);
  const fx = Math.cos(a0), fy = Math.sin(a0);
  G.pierce = true;
  for (const e of enemies) {
    if (!alive(e)) continue;
    const dx = e.fi - hero.fi, dy = e.fj - hero.fj, d = Math.hypot(dx, dy);
    const da = Math.abs(((Math.atan2(dy, dx) - a0 + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    if (d > R + (e.def.unique ? 0.5 : 0) || (!ring && d > 0.7 && da > half + 0.3 / Math.max(1, d))) continue;
    const crit = Math.random() < CRIT_CHANCE + (STAT.crit || 0) / 100;
    wake(e); G.elem = 'heavy'; damageEnemy(e, heroDmg((crit ? 2 : 1) * k), hero.fi, hero.fj, crit, 1); G.elem = null;
    if (alive(e) && !e.def.unique && !(e.downT > 0)) e.stun = Math.max(e.stun || 0, 0.7);   // (a knocked-down one is on the ground instead)
  }
  G.pierce = false;
  for (const p of dynProps) if (!p.broken && (p.kind === 'barrel' || p.kind === 'egg') && Math.hypot(p.i + 0.5 - hero.fi, p.j + 0.5 - hero.fj) < R) hitProp(p);
  const q = ring ? { fi: hero.fi, fj: hero.fj, a0: 0, ring: true, R, t: 0.9, t0: 0.9, seed: (Math.random() * 1e6) | 0 } : { fi: hero.fi + fx * 0.6, fj: hero.fj + fy * 0.6, a0, t: 0.9, t0: 0.9, seed: (Math.random() * 1e6) | 0 };
  G.quakes.push(q); stampCracks(q);
  slamEruption(q.fi, q.fj, a0, R, ring ? Math.PI : half, k);   // round 65: rock spikes, a crater, billowing dust
  // round 25: a wave of dust rolling out over the cone, a flash where the blade bit, stone chunks
  const lite = LV.outdoor ? [DIRT[4], DIRT[3]] : [TH().ramp[TH().ramp.length - 1], TH().ramp[5]];
  shockwave(q.fi, q.fj, R, 0.38, lite, ring ? null : [a0, half + 0.1], false);
  impactFlash(hero.fi + fx * 0.9, hero.fj + fy * 0.9, 3, 6);
  { const [qx, qy] = iso(q.fi, q.fj); rubble(qx, qy, 18, 70, ring ? null : a0, ring ? Math.PI : half); }
  // rocks and dust thrown up along the cone
  const [x, y] = screenOf(hero), dust = LV.outdoor ? DIRT[3] : S[5];
  for (let n = 0; n < 34; n++) {
    const a = a0 + (Math.random() * 2 - 1) * half, d = 0.8 + Math.random() * R, gx = Math.cos(a) * d, gy = Math.sin(a) * d;
    pspawn(5, x + (gx - gy) * 16, y + (gx + gy) * 8, 2, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 12, 50 + Math.random() * 60, 1, n % 3 ? dust : S[3]);
  }
  if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.45 * Math.min(1, k / 1.5));
  sfx('boom'); sfx('crit'); sfx('crack');
}
// Tether: hauled in, the warrior lands a heavy blow on the target and what stands beside it
function tetherBlow(a) {
  G.pierce = true; G.elem = 'heavy';
  for (const e of enemies) if (alive(e) && (e === a || Math.hypot(e.fi - a.fi, e.fj - a.fj) < 1.3)) { wake(e); const c = Math.random() < CRIT_CHANCE + (STAT.crit || 0) / 100; damageEnemy(e, heroDmg((c ? 2 : 1) * (e === a ? 1.6 : 0.9)), hero.fi, hero.fj, c, 1); }
  G.pierce = false; G.elem = null;
  hero.dir = dirFrom(a.fi - hero.fi, a.fj - hero.fj); hero.combo = 2; hero.atk = 0; hero.hitDone = true; hero.approach = null;   // a swing to sell it (the damage is already done)
  impactFlash(a.fi, a.fj, 12, 7); { const [x, y] = screenOf(a); rubble(x, y, 10, 60); }
  if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.3);
  hero.stop = Math.max(hero.stop, 0.08); sfx('boom'); sfx('clank');
}
// the fissure runs out at 16 tiles a second; aftershocks go off on their timers
function updateSlamMods(dt) {
  for (const f of G.fissures) {
    const r0 = f.reach; f.reach += 16 * dt;
    if (!G.spikes) G.spikes = [];
    for (let d = Math.ceil(r0 / 0.7) * 0.7; d < Math.min(f.reach, f.R); d += 0.7) {   // round 65: slabs burst up along the crack as it races out
      if (d < 1.2) continue;
      const side = (Math.round(d / 0.7) % 2 ? 1 : -1) * 0.25, pi = f.fi + Math.cos(f.a0) * d - Math.sin(f.a0) * side, pj = f.fj + Math.sin(f.a0) * d + Math.cos(f.a0) * side;
      if (!blocked(pi, pj)) G.spikes.push({ fi: pi, fj: pj, h: 30 - d * 1.6, w: 7 + Math.random() * 3, delay: 0, t: 0.45, t0: 0.45, seed: (Math.random() * 1e6) | 0, lean: Math.sign(Math.cos(f.a0) - Math.sin(f.a0)) * 0.3 });
    }
    G.pierce = true;
    for (const e of enemies) {
      if (!alive(e) || f.hit.has(e)) continue;
      const dx = e.fi - f.fi, dy = e.fj - f.fj, d = Math.hypot(dx, dy);
      const da = Math.abs(((Math.atan2(dy, dx) - f.a0 + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (d > f.reach || d > f.R + (e.def.unique ? 0.5 : 0) || (d > 0.7 && da > f.half + 0.45 / Math.max(1, d))) continue;
      f.hit.add(e); const crit = Math.random() < CRIT_CHANCE + (STAT.crit || 0) / 100;
      wake(e); G.elem = 'heavy'; damageEnemy(e, heroDmg((crit ? 2 : 1) * 1.7), f.fi, f.fj, crit, 1); G.elem = null;
      const [x, y] = screenOf(e); rubble(x, y, 6, 50); impactFlash(e.fi, e.fj, 2, 4);
    }
    G.pierce = false;
    if (Math.random() < 0.8) { const d = Math.min(f.reach, f.R), [x, y] = iso(f.fi + Math.cos(f.a0) * d, f.fj + Math.sin(f.a0) * d); pspawn(5, x, y, 1, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 14, 40 + Math.random() * 40, 1, LV.outdoor ? DIRT[3] : S[5]); }
  }
  G.fissures = G.fissures.filter(f => f.reach < f.R + 0.5);
  for (const a of G.aftershocks) { a.t -= dt; if (a.t <= 0) { a.done = true;
    if (a.hop && hero.combo === 3 && hero.atk >= 0 && !hero.dead) { const sw = weaponSwing(hero.look, 3), i0 = sw.findIndex(k => k.arc); let t0 = 0; for (let i = 0; i < i0; i++) t0 += sw[i].ms; hero.atk = t0; hero.hitDone = false; hero.afterSlam = true; hero.jumpDust = false; }   // back up into the jump
    else slamAt(a.a0, SLAM_R * 0.9, SLAM_HALF + 0.15, 0.9); } }
  G.aftershocks = G.aftershocks.filter(a => !a.done);
}

// ---------------------------------------------------------------- skill modifiers (round 29)
// Like Diablo's runes: each skill has three modifiers that unlock 2, 4 and 6 levels after the
// skill does; one can be chosen per skill on the skills screen (inventory > SKILLS), or none.
const SKILL_MODS = {
  fireball: [
    { id: 'split', name: 'SPLIT', desc: 'THREE SMALLER FIREBALLS IN A SPREAD' },
    { id: 'ground', name: 'BURNING GROUND', desc: 'LEAVES FIRE ON THE FLOOR FOR 3 SECONDS' },
    { id: 'great', name: 'GREAT FIREBALL', desc: 'ONE HUGE, SLOW FIREBALL. COSTS 6 MORE MANA' },
  ],
  slam: [
    { id: 'ring', name: 'FULL CIRCLE', desc: 'HITS ALL AROUND YOU, SHORTER REACH' },
    { id: 'fissure', name: 'FISSURE', desc: 'A LONG NARROW CRACK THAT RACES OUT' },
    { id: 'after', name: 'AFTERSHOCK', desc: 'A SECOND, WEAKER SLAM HALF A SECOND LATER' },
  ],
  // round 30: the rest of both kits
  charge: [
    { id: 'ram', name: 'BATTERING RAM', desc: 'CARRIES FOES ALONG AND SLAMS THEM INTO WHAT STOPS YOU' },
    { id: 'again', name: 'SECOND WIND', desc: 'CHARGE A SECOND TIME WITHIN 2 SECONDS, FREE' },
    { id: 'tremor', name: 'TREMOR', desc: 'THE GROUND YOU CROSSED SPLITS OPEN BEHIND YOU' },
  ],
  hook: [
    { id: 'line', name: 'LONG CHAIN', desc: 'REACHES FARTHER, DRAGS IN ALL IT PASSES' },
    { id: 'barbed', name: 'BARBED HOOK', desc: 'HITS HARDER, DAZES TWICE AS LONG' },
    { id: 'tether', name: 'TETHER', desc: 'HAULS YOU TO THE TARGET FOR A HEAVY BLOW' },
  ],
  whirl: [
    { id: 'devil', name: 'DUST DEVILS', desc: 'THROWS OUT SMALL WHIRLWINDS AS YOU SPIN' },
    { id: 'long', name: 'LONG SPIN', desc: 'SPINS TWICE AS LONG, PULLS FOES IN. 6 MORE FURY' },
    { id: 'storm', name: 'BLADE STORM', desc: 'WIDER REACH, FASTER HITS' },
  ],
  leap: [
    { id: 'burn', name: 'BURNING LAND', desc: 'THE LANDING LEAVES FIRE ON THE FLOOR' },
    { id: 'quake', name: 'EARTHQUAKE', desc: 'A MUCH WIDER LANDING THAT KNOCKS ALL DOWN' },
    { id: 'pounce', name: 'POUNCE', desc: 'A LONGER JUMP, ONE HUGE BLOW ON THE TARGET' },
  ],
  missile: [
    { id: 'seek', name: 'SEEKERS', desc: 'THREE SMALL BOLTS, EACH FINDS ITS OWN FOE' },
    { id: 'pierce', name: 'PIERCING BOLT', desc: 'A FAST STRAIGHT BOLT THAT GOES THROUGH' },
    { id: 'orb', name: 'ARCANE ORB', desc: 'A SLOW ORB THAT ZAPS ALL NEAR IT, THEN BURSTS' },
  ],
  cone: [
    { id: 'nova', name: 'FROST NOVA', desc: 'A RING OF FROST ALL AROUND YOU' },
    { id: 'shards', name: 'ICE SHARDS', desc: 'A LONG NARROW CONE THAT HITS HARDER' },
    { id: 'deep', name: 'DEEP FREEZE', desc: 'FREEZES LONGER. KILLED WHILE FROZEN, THEY BURST' },
  ],
  meteor: [
    { id: 'shower', name: 'SHOWER', desc: 'THREE SMALLER METEORS AROUND THE TARGET' },
    { id: 'molten', name: 'MOLTEN CRATER', desc: 'THE CRATER BURNS FOR 4 SECONDS' },
    { id: 'comet', name: 'COMET', desc: 'A BALL OF ICE: FREEZES INSTEAD OF BURNING' },
  ],
  pierce: [   // round 66
    { id: 'fire', name: 'FLAMING BOLT', desc: 'SETS EVERYTHING IT GOES THROUGH ALIGHT' },
    { id: 'frost', name: 'FROST BOLT', desc: 'CHILLS; WITH THREE COMBO POINTS IT FREEZES' },
    { id: 'twin', name: 'TWIN BOLTS', desc: 'TWO BOLTS SIDE BY SIDE, EACH A LITTLE WEAKER' },
  ],
  cluster: [
    { id: 'fire', name: 'NAPALM', desc: 'THE BLASTS LEAVE THE GROUND BURNING' },
    { id: 'frost', name: 'FROST CLUSTER', desc: 'THE BOMBLETS FREEZE WHAT THEY HIT' },
    { id: 'big', name: 'BIG BANG', desc: 'NO BOMBLETS: ONE HUGE BLAST' },
  ],
  sentry: [
    { id: 'ballista', name: 'BALLISTA', desc: 'SLOWER, HEAVY BOLTS THAT GO THROUGH' },
    { id: 'fire', name: 'FIRE SENTRY', desc: 'BURNING BOLTS' },
    { id: 'twin', name: 'TWO SENTRIES', desc: 'PLANTS A PAIR, EACH A LITTLE SLOWER' },
  ],
  vault: [   // round 66b
    { id: 'spike', name: 'SPIKE TRAP', desc: 'THE TRAP SPRINGS A HEAVY SPIKE INSTEAD OF A SNARE' },
    { id: 'smoke', name: 'SMOKE BOMB', desc: 'SMOKE WHERE YOU STOOD DAZES THOSE IN IT' },
    { id: 'long', name: 'LONG VAULT', desc: 'TWICE AS FAR, AND FIVE QUICKDRAW SHOTS' },
  ],
  hawk: [
    { id: 'pair', name: 'MATED PAIR', desc: 'TWO HAWKS' },
    { id: 'talons', name: 'IRON TALONS', desc: 'DIVES HIT TWICE AS HARD' },
    { id: 'screech', name: 'SCREECH', desc: 'EACH DIVE STUNS FOR A MOMENT' },
  ],
  multi: [
    { id: 'wide', name: 'VOLLEY', desc: 'NINE ARROWS IN A WIDE FAN, EACH A LITTLE WEAKER' },
    { id: 'pierce', name: 'PIERCING SHOTS', desc: 'THE ARROWS GO THROUGH EVERY FOE IN LINE' },
    { id: 'fire', name: 'FIRE ARROWS', desc: 'BURNING ARROWS THAT SET FOES ALIGHT' },
  ],
  trap: [
    { id: 'spike', name: 'SPIKE TRAP', desc: 'NO SNARE: IT SPRINGS FOR A HEAVY BLOW' },
    { id: 'net', name: 'WIDE NET', desc: 'SNARES EVERYTHING IN A WIDER RING, LONGER' },
    { id: 'triple', name: 'THREE TRAPS', desc: 'THROWS THREE SMALLER TRAPS IN A SPREAD' },
  ],
  roll: [
    { id: 'smoke', name: 'SMOKE BOMB', desc: 'LEAVES SMOKE THAT DAZES FOES WHERE YOU STOOD' },
    { id: 'long', name: 'LONG LEAP', desc: 'JUMPS TWICE AS FAR' },
    { id: 'volley', name: 'LEAPING VOLLEY', desc: 'FIVE STRONGER ARROWS AS YOU LAND' },
  ],
  mark: [
    { id: 'spread', name: 'SPREADING MARK', desc: 'WHEN THE MARKED DIES, THE MARK JUMPS ON' },
    { id: 'death', name: 'DEATH MARK', desc: 'TAKES 70% MORE DAMAGE, BUT ONLY 5 SECONDS' },
    { id: 'blood', name: "PREY'S BLOOD", desc: 'HITS ON THE MARKED HEAL YOU' },
  ],
  chain: [   // round 65
    { id: 'fork', name: 'FORK', desc: 'SPLITS IN TWO AT EVERY JUMP: UP TO EIGHT FOES' },
    { id: 'overload', name: 'OVERLOAD', desc: 'ONE HUGE BOLT THAT STUNS, AND ONE JUMP' },
    { id: 'conductor', name: 'CONDUCTOR', desc: 'JUMPS TWICE AS FAR THROUGH CHILLED AND FROZEN FOES' },
  ],
  blink: [
    { id: 'burst', name: 'ARCANE BURST', desc: 'A BLAST WHERE YOU LAND THAT THROWS FOES BACK' },
    { id: 'double', name: 'DOUBLE BLINK', desc: 'A SECOND BLINK FOR FREE, WITHIN 1.5 SECONDS' },
    { id: 'frost', name: 'FROST STEP', desc: 'FREEZES WHAT STOOD NEAR YOU WHEN YOU LEFT' },
  ],
};
// the missile's and the orb's attack timings; the orb is a slower cast
const missileCast = () => (skillMod('missile') === 'orb' ? 0.55 : 0.38) * (HEAVY ? 1.3 : 1);   // round 62: fewer, heavier missiles
const modUnlock = (skillId, k) => { const sk = Object.values(SKILLSETS).flat().find(s => s.id === skillId) || { lvl: 1 }; return sk.lvl + 2 + k * 2; };   // the missile (the mage's attack) counts as level 1
function skillMod(id) { const m = hero.mods && hero.mods[id]; if (!m) return null; const k = (SKILL_MODS[id] || []).findIndex(x => x.id === m); return k >= 0 && hero.lvl >= modUnlock(id, k) ? m : null; }
const skillCost = s => s.mana + (s.id === 'fireball' && skillMod('fireball') === 'great' ? 6 : 0) + (s.id === 'whirl' && skillMod('whirl') === 'long' ? 6 : 0);
// Chain hook: a hook flies at the nearest enemy in reach; whatever it catches (and anything right
// beside it) is dragged up to the warrior and dazed. Bosses and elites don't budge: he is pulled to them
function chainHook() {
  const mod = skillMod('hook'), reach = mod === 'line' ? 9.5 : 7;   // round 30: Long Chain reaches farther
  const t = nearestEnemy(reach, true);
  if (!t) { say('NOTHING TO HOOK', 25, 1); return false; }
  hero.dir = dirFrom(t.fi - hero.fi, t.fj - hero.fj);
  const dx = t.fi - hero.fi, dy = t.fj - hero.fj, l = Math.hypot(dx, dy) || 1;
  G.hooks.push({ fi: hero.fi + dx / l * 0.5, fj: hero.fj + dy / l * 0.5, vx: dx / l * 16, vy: dy / l * 16, life: mod === 'line' ? 0.68 : 0.6, state: 'out', caught: [], mod });
  hero.cast = 0.3; hero.castAge = CAST_RELEASE; hero.castKind = 'hook'; hero.clip = FEEL_OLD ? 'channel' : 'hook';
  sfx('swing'); sfx('chain');
  return true;
}
// Leap: a jump in an arc at the nearest enemy (or up to 6 tiles toward the stick); untouchable in
// the air; the landing smashes everything around it
function startLeap() {
  let to = null;
  const vx = input.mx, vy = input.my;
  const mod = skillMod('leap');
  let t = null, bd = mod === 'pounce' ? 10 : 7;   // the nearest enemy worth jumping at: 2 tiles or more away (Pounce: farther)
  for (const e of enemies) { if (!alive(e) || LV.vis[tIdx(Math.floor(e.fi), Math.floor(e.fj))] < 0.3) continue; const d = Math.hypot(e.fi - hero.fi, e.fj - hero.fj); if (d >= 2 && d < bd) { bd = d; t = e; } }
  if (Math.hypot(vx, vy) > 0.2 && !t) { const [gi, gj] = stickToGround(vx, vy); to = [hero.fi + gi * 6, hero.fj + gj * 6]; }
  else if (t) { const dx = t.fi - hero.fi, dy = t.fj - hero.fj, l = Math.hypot(dx, dy) || 1, back = Math.min(l, 0.9 + (t.def.unique ? 0.6 : 0)); to = [t.fi - dx / l * back, t.fj - dy / l * back]; }
  else { const [fx, fy] = dirVec(hero.dir); to = [hero.fi + fx * 5, hero.fj + fy * 5]; }
  // land on open ground: walk the target back toward the hero until it's clear
  const f0 = [hero.fi, hero.fj];
  for (let k = 0; k < 20 && !standable(to[0], to[1]); k++) { to[0] += (f0[0] - to[0]) * 0.15; to[1] += (f0[1] - to[1]) * 0.15; }
  const dist = Math.hypot(to[0] - f0[0], to[1] - f0[1]);
  if (dist < 0.8 || !standable(to[0], to[1])) return false;
  hero.dir = dirFrom(to[0] - f0[0], to[1] - f0[1]);
  hero.leap = { from: f0, to, t: 0, dur: 0.32 + dist * 0.035, target: t, mod }; hero.atk = -1; hero.cast = -1; hero.approach = null;
  sfx('heavySwing');
  return true;
}
function updateLeap(dt) {
  const L = hero.leap; L.t += dt;
  const u = Math.min(1, L.t / L.dur), e = u * (2 - u);   // fast off the ground, easing into the landing
  hero.fi = L.from[0] + (L.to[0] - L.from[0]) * e; hero.fj = L.from[1] + (L.to[1] - L.from[1]) * e;
  hero.leapZ = Math.sin(u * Math.PI) * (14 + Math.hypot(L.to[0] - L.from[0], L.to[1] - L.from[1]) * 3);
  // round 40a: crouch and spring, tucked in the air with the weapon overhead, diving with it, then the strike
  hero.clip = 'attack4'; hero.combo = 3; hero.atk = FEEL_OLD ? (u < 0.75 ? 40 : 230) : u < 0.1 ? 50 : u < 0.55 ? 130 : u < 0.8 ? 175 : 230;
  if (Math.random() < 0.6) { const [x, y] = screenOf(hero); pspawn(3, x, y, hero.leapZ + 20, 0, 0, 4, 0.25, 31); }
  if (u >= 1) {   // landing
    const mod = L.mod, R = mod === 'quake' ? 3.3 : 1.9;   // round 30: Earthquake lands far wider; Pounce saves it all for the target
    hero.leap = null; hero.leapZ = 0; hero.atk = -1; hero.clip = 'idle'; hero.stopT = 0.11; hero.swingEnd = G.t; unstickHero();
    if (!FEEL_OLD) { hero.landT = 0.26; hero.stopT = 0; }   // round 40a: a squash on landing, then a kneel before standing
    if (!FEEL_OLD) slamEruption(hero.fi, hero.fj, 0, R + 0.4, Math.PI, mod === 'quake' ? 1.4 : 1.1);   // round 65c: the landing breaks the ground like the slam
    G.pierce = true;
    for (const en of enemies) {
      if (!alive(en)) continue;
      const d = Math.hypot(en.fi - hero.fi, en.fj - hero.fj);
      if (d > R + (en.def.unique ? 0.5 : 0)) continue;
      const crit = Math.random() < CRIT_CHANCE + (STAT.crit || 0) / 100, k = mod === 'pounce' ? (en === L.target ? 3.2 : 1) : mod === 'quake' ? 1.5 : 1.8;
      wake(en); G.elem = 'heavy'; damageEnemy(en, heroDmg((crit ? 2 : 1) * k), hero.fi, hero.fj, crit, 2); G.elem = null;
      if (alive(en) && mod === 'quake' && !en.def.unique && !(en.frozen > 0)) { en.downT = en.downT0 = 1.1; en.atk = -1; en.stun = 0; }   // everything but bosses goes down
      if (alive(en) && !en.def.unique && !(en.downT > 0)) en.stun = Math.max(en.stun || 0, 0.5);
    }
    G.pierce = false;
    if (mod === 'burn') {   // Burning Landing: a ring of fire bursts out and the ground keeps burning
      G.fireGround.push({ fi: hero.fi, fj: hero.fj, r: 2.1, t: 3.5, tick: 0.2 });
      const [x, y] = screenOf(hero);
      for (let k = 0; k < 30; k++) { const a = k / 30 * 6.283; pspawn(4, x, y, 3, Math.cos(a) * 95, Math.sin(a) * 48, 0, 0.3, k % 3 ? 16 : 17); }
      burst(2, x, y, 6, 22, 100, 17); shockwave(hero.fi, hero.fj, 2.2, 0.3, [18, 16]); sfx('fireball'); sfx('sizzle');
    }
    if (mod === 'quake') {
      const q = { fi: hero.fi, fj: hero.fj, a0: 0, ring: true, R: 3.2, n: 12, t: 1, t0: 1, seed: (Math.random() * 1e6) | 0 };
      G.quakes.push(q); stampCracks(q);
      const lite = LV.outdoor ? [DIRT[4], DIRT[3]] : [TH().ramp[TH().ramp.length - 1], TH().ramp[5]];
      shockwave(hero.fi, hero.fj, 3.6, 0.42, lite, null, false); { const [x, y] = screenOf(hero); rubble(x, y, 26, 90); }
      if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.35);
    }
    if (mod === 'pounce' && L.target) impactFlash(L.target.fi, L.target.fj, 14, 9);
    const [x, y] = screenOf(hero), dust = LV.outdoor ? DIRT[3] : S[5];
    for (let k = 0; k < 26; k++) { const a = k / 26 * 6.283; pspawn(5, x, y, 1, Math.cos(a) * 70, Math.sin(a) * 35, 40 + Math.random() * 30, 1, k % 3 ? dust : DIRT[4]); }
    const q = { fi: hero.fi, fj: hero.fj, a0: 0, ring: true, t: 0.6, t0: 0.6, seed: (Math.random() * 1e6) | 0 };
    G.quakes.push(q); stampCracks(q);
    const lite = LV.outdoor ? [DIRT[4], DIRT[3]] : [TH().ramp[TH().ramp.length - 1], TH().ramp[5]];
    shockwave(hero.fi, hero.fj, 2.3, 0.34, lite, null, false); impactFlash(hero.fi, hero.fj, 2, 7); rubble(x, y, 14, 60);
    if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.5);
    hero.stop = Math.max(hero.stop, 0.08);
    sfx('boom'); sfx('crack');
  }
}
function updateWarriorFx(dt) {
  for (const q of G.quakes) q.t -= dt;
  G.quakes = G.quakes.filter(q => q.t > 0);
  for (const h of G.hooks) {
    if (h.state === 'out') {
      h.life -= dt;
      for (let s = 0; s < 3 && h.state === 'out'; s++) {
        h.fi += h.vx * dt / 3; h.fj += h.vy * dt / 3;
        if (blocked(h.fi, h.fj) && tileAt(Math.floor(h.fi), Math.floor(h.fj)) !== FLOOR) { h.state = h.caught.length ? 'pull' : 'back'; break; }
        const hit = enemies.find(e => alive(e) && !h.caught.includes(e) && Math.hypot(e.fi - h.fi, e.fj - h.fj) < 0.55 + (e.def.unique ? 0.4 : 0));
        if (hit) {
          const hk = h.mod === 'barbed' ? 1.6 : 0.6;   // Barbed Hook bites harder
          sfx('clank'); impactFlash(hit.fi, hit.fj, 12, 4);   // round 27: the hook bites with a spark and a clank
          { const [x, y] = screenOf(hit); for (let k = 0; k < 10; k++) { const a = Math.random() * 6.283; pspawn(4, x, y, 12, Math.cos(a) * 60, Math.sin(a) * 30, 0, 0.18, k % 2 ? 51 : 27); } }
          if (h.mod === 'line' && smallFoe(hit)) {   // Long Chain: hooks it and flies on, gathering all it passes
            wake(hit); damageEnemy(hit, heroDmg(hk), hero.fi, hero.fj, false, 0, true); hit.atk = -1; h.caught.push(hit); continue;
          }
          if (h.mod === 'line' && h.caught.length) { h.state = 'pull'; break; }
          if (h.mod === 'tether' || hit.def.unique || hit.def.elite || hit.champ) { h.state = 'reel'; h.anchor = hit; damageEnemy(hit, heroDmg(hk), hero.fi, hero.fj, false, 0, true); if (alive(hit) && smallFoe(hit)) hit.stun = Math.max(hit.stun || 0, 0.6); break; }
          h.caught = enemies.filter(e => alive(e) && !e.def.unique && !e.def.elite && !e.champ && Math.hypot(e.fi - hit.fi, e.fj - hit.fj) < 1.6);
          for (const e of h.caught) { wake(e); damageEnemy(e, heroDmg(hk), hero.fi, hero.fj, false, 0, true); e.atk = -1; }
          h.state = 'pull'; break;
        }
      }
      if (h.life <= 0 && h.state === 'out') h.state = h.caught.length ? 'pull' : 'back';
    } else if (h.state === 'pull') {   // drag the catch in, then daze it at the warrior's feet
      let done = true;
      for (const e of h.caught) {
        if (!alive(e)) continue;
        e.hurt = Math.max(e.hurt || 0, 0.1); e.backT = 0;   // held by the chain: no walking off while dragged
        const dx = hero.fi - e.fi, dy = hero.fj - e.fj, d = Math.hypot(dx, dy);
        if (d > 1.05) {
          done = false; const st = Math.min(d - 1, 14 * dt); tryMove(e, dx / d * st, dy / d * st, 0.25); e.kb = [0, 0]; e.clip = 'hit';
          e.leapZ = 3 + Math.abs(Math.sin(G.t * 22)) * 3;   // yanked off its feet, bouncing along
          if (Math.random() < 0.6) { const [x, y] = screenOf(e); pspawn(5, x + (Math.random() - 0.5) * 6, y, 1, -dx * 20, -dy * 10, 12 + Math.random() * 12, 1, LV.outdoor ? DIRT[3] : S[5]); }   // dragged through the dust
        }
      }
      const lead = h.caught.find(alive); if (lead) { h.fi = lead.fi; h.fj = lead.fj; }
      h.pullT = (h.pullT || 0) + dt;
      if (done || h.pullT > (h.mod === 'line' ? 0.95 : 0.7)) { for (const e of h.caught) { e.leapZ = 0; if (alive(e)) e.stun = Math.max(e.stun || 0, h.mod === 'barbed' ? 1.6 : 0.8); } h.state = 'gone'; }
    } else if (h.state === 'reel') {   // a boss won't come: the warrior is hauled to it
      const a = h.anchor, dx = a.fi - hero.fi, dy = a.fj - hero.fj, d = Math.hypot(dx, dy);
      h.fi = a.fi; h.fj = a.fj; h.pullT = (h.pullT || 0) + dt;
      if (d > 1.2 + (a.def.unique ? 0.5 : 0) && h.pullT < 0.7 && alive(a)) { const st = Math.min(d - 1, 14 * dt); tryMove(hero, dx / d * st, dy / d * st); hero.dir = dirFrom(dx, dy); }
      else { h.state = 'gone'; if (h.mod === 'tether' && alive(a)) tetherBlow(a); }
    } else if (h.state === 'back') {   // a miss: the chain rattles back
      const dx = hero.fi - h.fi, dy = hero.fj - h.fj, d = Math.hypot(dx, dy);
      if (d < 0.6) h.state = 'gone'; else { h.fi += dx / d * 20 * dt; h.fj += dy / d * 20 * dt; }
    }
  }
  G.hooks = G.hooks.filter(h => h.state !== 'gone');
}
// world layer: the slam's fissures (jagged cracks glowing with heat, spreading out then fading) and
// the chain
function drawWarriorFx() {
  for (const q of G.quakes) {
    const p = 1 - q.t / q.t0, grow = Math.min(1, p * 5), [hx, hy] = iso(q.fi, q.fj), n = q.n || (q.ring ? 9 : 6), R = q.R || (q.ring ? 1.9 : SLAM_R), hf = q.half ?? SLAM_HALF;
    for (let c = 0; c < n; c++) {
      const r1 = rng(q.seed + c * 31);
      let a = q.ring ? c / n * 6.283 + r1() * 0.5 : q.a0 + (c / (n - 1) - 0.5) * 2 * hf * 0.9;
      let gi = 0, gj = 0; const len = R * (0.7 + r1() * 0.3) * grow;
      for (let s = 0; s < len * 6; s++) {
        a += (r1() - 0.5) * 0.5; gi += Math.cos(a) / 6; gj += Math.sin(a) / 6;
        const x = Math.round(hx + (gi - gj) * 16 - camX), y = Math.round(hy + (gi + gj) * 8 - camY);
        for (const [ox, oy, v] of [[0, 0, p < 0.55 ? FIRE[2] | EMIS : BLK], [1, 0, BLK], [0, 1, BLK]]) {
          const xx = x + ox, yy = y + oy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
          if (p > 0.7 && BAYER[((yy & 3) << 2) | (xx & 3)] < (p - 0.7) / 0.3) continue;   // fade out
          scr[yy * W + xx] = v;
        }
      }
    }
  }
}
// the chain (round 27), drawn at full detail over the bodies: oval links that sag while the hook
// flies and pull straight once it bites, and a barbed hook head with a glint
function drawHookChains() {
  for (const h of G.hooks) {
    const [hx0, hy0] = screenOf(hero), [bx0, by0] = iso(h.fi, h.fj);
    const ax = Math.round(hx0 * SPX - cam2x), ay = Math.round((hy0 - 20 - (hero.leapZ || 0)) * SPX - cam2y);
    const bx = Math.round(bx0 * SPX - cam2x), by = Math.round((by0 - 13) * SPX - cam2y);
    const len = Math.hypot(bx - ax, by - ay), n = Math.max(2, Math.ceil(len)), ux = (bx - ax) / (len || 1), uy = (by - ay) / (len || 1);
    const sag = h.state === 'out' || h.state === 'back' ? Math.min(14, len * 0.12) : 0, shake = h.state === 'pull' || h.state === 'reel' ? Math.sin(G.t * 90) * 0.8 : 0;
    const pts = [];
    for (let s = 0; s <= n; s++) { const u = s / n; pts.push([ax + (bx - ax) * u - uy * shake, ay + (by - ay) * u + Math.sin(u * Math.PI) * sag + ux * shake]); }
    // a dark outline first so the chain reads on any floor, then the links over it
    for (const [x, y] of pts) for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [0, 2]]) ovSet(Math.round(x) + ox, Math.round(y) + oy, BLK);
    pts.forEach(([x, y], s) => {
      const link = Math.floor(s / 5), k = s % 5, X = Math.round(x), Y = Math.round(y);
      if (link % 2 === 0) {   // a link seen flat: an open oval, lit on its upper edge, dark hole in the middle
        if (k === 0 || k === 4) { ovSet(X, Y, STEEL[2]); }
        else { ovSet(X, Y - 1, STEEL[4]); ovSet(X, Y + 1, STEEL[1]); ovSet(X, Y, k === 2 ? BLK : STEEL[2]); }
      } else { ovSet(X, Y, STEEL[3]); ovSet(X, Y + 1, STEEL[1]); }   // a link seen edge-on
    });
    // the hook head: a shank and a curved barb
    const px = -uy, py = ux;
    for (let s = 0; s < 9; s++) { const x = Math.round(bx + ux * s * 0.7), y = Math.round(by + uy * s * 0.7); ovSet(x, y - 1, BLK); ovSet(x, y, STEEL[4]); ovSet(x + 1, y, STEEL[2]); ovSet(x, y + 1, BLK); }
    for (let a = 0; a <= 8; a++) { const t = a / 8 * Math.PI, x = Math.round(bx + ux * 6 + (Math.cos(t) * ux * 4 + Math.sin(t) * px * 5)), y = Math.round(by + uy * 6 + (Math.cos(t) * uy * 4 + Math.sin(t) * py * 5)); ovSet(x, y - 1, BLK); ovSet(x, y, a < 3 ? 27 : STEEL[3]); ovSet(x, y + 1, STEEL[1]); ovSet(x, y + 2, BLK); }
  }
}
// ---------------------------------------------------------------- mage spells
// Every spell's damage comes from the staff (STAT.dmg), so a better staff makes all of them hit
// harder. A cast is three poses: gather, release (the spell leaves here, CAST_RELEASE s after the
// tap, with a flare at the staff's orb), follow-through; once it is out, the stick cancels the rest.
const CAST_RELEASE = 0.06;
// round 29: how long each spell is gathered before it leaves the staff (the wind-up you can see);
// the missile stays snappy, the big ones are held a beat longer
const CAST_REL = { missile: 0.07, fireball: 0.13, cone: 0.12, meteor: 0.24, chain: 0.16 };
const castRel = k => CAST_REL[k] ?? CAST_RELEASE;
const spellDmg = k => Math.max(1, Math.round((roll(STAT.dmg) + (STAT.fireDmg || 0)) * k * (hero.buff > 0 ? 1.4 : 1)));
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
  G.flashes.push({ fi, fj, t: 0.12, t0: 0.12, r: 70, tint: col === 16 ? 1 : col === 39 ? 3 : col >= 114 && col <= 118 ? 2 : 0 });
}
function aimAt(range) {
  const t = nearestEnemy(range, true);
  if (t) return [t, [t.fi, t.fj]];
  const [fx, fy] = dirVec(hero.dir); return [null, [hero.fi + fx * 4, hero.fj + fy * 4]];
}
// magic missiles (the attack button): two homing darts fanned out, three from level 5
// Round 29: the magic missile is one heavier arcane bolt per cast instead of a fan of thin darts:
// slower in flight (5 tiles/s, no speeding up) so it can be watched, a softer homing turn, and a
// bigger hit (a flinch and a small push). Damage per second is about what the fan dealt.
function castMissiles() {
  const [t, at] = aimAt(8);
  const mod = skillMod('missile');
  startCast('missile', missileCast() / (1 + ((STAT.atkSpeed || 0) + (hero.frenzy > 0 ? 50 : 0)) / 100), at, () => {   // attack speed and frenzy cast faster
    const [ox, oy] = staffTip(), a = Math.atan2(at[1] - oy, at[0] - ox), K = (hero.lvl >= 5 ? 1.5 : 1.15) * (HEAVY ? 1.3 : 1);
    const bolt = (a, sp, o) => projectiles.push(Object.assign({ kind: 'missile', fi: ox, fj: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, z: ORB_Z, life: 1.8, owner: 'hero', home: t, spell: true, dmgK: K, age: 0, spin: Math.random() * 6.28, elem: 'arcane' }, o));
    if (mod === 'seek') {   // round 30: three small bolts fanned out, each after a different foe if there are enough
      const foes = enemies.filter(e => alive(e) && LV.vis[tIdx(Math.floor(e.fi), Math.floor(e.fj))] >= 0.3 && Math.hypot(e.fi - hero.fi, e.fj - hero.fj) < 8).sort((p, q) => Math.hypot(p.fi - hero.fi, p.fj - hero.fj) - Math.hypot(q.fi - hero.fi, q.fj - hero.fj));
      [-0.55, 0, 0.55].forEach((da, k) => bolt(a + da, 6, { home: foes[k] || foes[0] || null, dmgK: K * 0.45, small: true, life: 2 }));
    } else if (mod === 'pierce') bolt(a, 8, { home: null, noHome: true, pierce: true, hits: new Set(), dmgK: K * 0.85, life: 1.3, lance: true });
    else if (mod === 'orb') bolt(a, 2.2, { home: null, noHome: true, orb: true, pulse: 0.15, dmgK: K * 0.24, life: 3.2 });
    else bolt(a, 5, {});
    orbFlare(39, 40, mod === 'orb' ? 16 : 10); sfx('missile'); if (mod === 'orb') sfx('whoomp');
  });
}
function castFireball() {
  const [, at] = aimAt(9), mod = skillMod('fireball');
  startCast('fireball', 0.32, at, () => {
    const [ox, oy] = staffTip(), dx = at[0] - ox, dy = at[1] - oy, l = Math.hypot(dx, dy) || 1, a = Math.atan2(dy, dx);
    const shot = (a, sp, boom, big) => projectiles.push({ kind: 'hfire', fi: ox, fj: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, z: ORB_Z - 6, life: 1.6 * 7 / sp, owner: 'hero', spell: true, boom, age: 0, big });
    if (mod === 'split') for (const da of [-0.3, 0, 0.3]) shot(a + da, 7, { r: 1.2, k: 0.75, pow: 0 });
    else if (mod === 'great') shot(a, 4.2, { r: 2.7, k: 2.6, pow: 2, big: true }, true);
    else shot(a, 7, { r: 1.7, k: 1.6, pow: 1, ground: mod === 'ground' });
    void l; orbFlare(16, 18, mod === 'great' ? 16 : 12); sfx('fireball');
  });
}
// burning ground: patches of fire left by the fireball's Burning Ground modifier
function updateFireGround(dt) {
  for (const g of G.fireGround) {
    g.t -= dt; g.tick -= dt;
    if (Math.random() < 0.7) { const a = Math.random() * 6.283, d = Math.sqrt(Math.random()) * g.r, [x, y] = iso(g.fi + Math.cos(a) * d, g.fj + Math.sin(a) * d); pspawn(3, x, y, 1, 0, 0, 10 + Math.random() * 16, 0.45, Math.random() < 0.5 ? 16 : 17); }
    if (g.tick <= 0) {
      g.tick = 0.5; G.elem = 'fire';
      for (const e of enemies) if (alive(e) && Math.hypot(e.fi - g.fi, e.fj - g.fj) < g.r) damageEnemy(e, spellDmg(0.3), g.fi, g.fj, false, 0, true);
      G.elem = null;
    }
  }
  G.fireGround = G.fireGround.filter(g => g.t > 0);
}
// fire explosion shared by the fireball and the meteor: everything in radius r takes k x staff damage
// (cold: the Comet's ice blast, which freezes instead of burning, in ice colors)
function explodeAt(fi, fj, r, k, pow, big = false, cold = false) {
  if (G.frostOrbs.length) breakOrbsAt(fi, fj, r);
  G.pierce = true; G.elem = cold ? 'cold' : 'fire';   // blasts get round shields; fire sets things alight
  for (const e of enemies) {
    if (!alive(e)) continue;
    const d = Math.hypot(e.fi - fi, e.fj - fj);
    if (d < r + (e.def.unique ? 0.4 : 0)) { const c = spellCrit(); damageEnemy(e, spellDmg(c ? k * 2 : k), fi, fj, c, cold ? 0 : pow, true); if (cold) freezeFoe(e, 2.6); }
  }
  G.pierce = false; G.elem = null;
  if (cold) return iceBlast(fi, fj, r, big);
  for (const p of dynProps) if (!p.broken && (p.kind === 'barrel' || p.kind === 'egg') && Math.hypot(p.i + 0.5 - fi, p.j + 0.5 - fj) < r + 0.3) hitProp(p);
  const [x, y] = iso(fi, fj);
  // a ring of flame rolls out across the ground to the edge of the blast
  const ringN = big ? 56 : 30, sp = r * 22.6 / 0.32;
  for (let k = 0; k < ringN; k++) { const a = k / ringN * 6.283; pspawn(4, x, y, 3, Math.cos(a) * sp, Math.sin(a) * sp * 0.5, 0, 0.32, k % 3 ? 16 : 17); }
  for (let k = 0; k < (big ? 30 : 12); k++) { const a = Math.random() * 6.283, d = Math.random() * r * 18; pspawn(3, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.5, 2, 0, 0, 20 + Math.random() * 40, 0.5, Math.random() < 0.5 ? 15 : 16); }   // flames licking up
  for (let k = 0; k < (big ? 16 : 8); k++) { const a = Math.random() * 6.283, d = Math.random() * r * 12; pspawn(3, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.5, 10, (Math.random() - 0.5) * 10, 0, 14 + Math.random() * 14, 0.9, Math.random() < 0.5 ? 4 : 5); }   // smoke rising after
  burst(2, x, y, 8, big ? 40 : 22, big ? 150 : 100, 17); burst(2, x, y, 6, big ? 30 : 14, big ? 110 : 70, 16); burst(3, x, y, 4, big ? 18 : 8, 40, 15);
  stampBlood(Math.round(x), Math.round(y), big ? 7 : 4, (Math.random() * 1e6) | 0, [2, 3, 3, 4, 5]);   // a scorch mark
  shockwave(fi, fj, r * 1.05, big ? 0.36 : 0.26, [18, 16]); impactFlash(fi, fj, big ? 10 : 7, big ? 10 : 6);   // round 25: the blast's front and its first white frames
  if (big) { rubble(x, y, 20, 80); const q = { fi, fj, a0: 0, ring: true, R: 2.4, t: 0.7, t0: 0.7, seed: (Math.random() * 1e6) | 0 }; G.quakes.push(q); stampCracks(q); }
  G.flashes.push({ fi, fj, t: big ? 0.6 : 0.4, t0: big ? 0.6 : 0.4, r: big ? 190 : 130, tint: 1 });   // (round 80: the blast lights the room orange, a little longer and wider)
  G.blasts.push({ fi, fj, r, t: big ? 0.6 : 0.46, t0: big ? 0.6 : 0.46, big, bloom: true, seed: Math.random() * 100 });   // (round 73: it lives longer, for the fireball that rises out of it)
  if (SHAKE) G.trauma = Math.min(1, G.trauma + (big ? 0.6 : 0.28));
  sfx('boom'); sfx('sizzle'); if (big) sfx('crack');
}
// cone of cold: a blast of frost in a wedge in front of the mage. Ordinary monsters freeze solid
// (can't move or attack, take 40% more damage, shatter on death); bosses, elites and champions
// are slowed to half speed instead
const CONE_R = 4.4, CONE_HALF = 0.62;   // tiles, half-angle (radians: about 70 degrees across)
function coneOfCold() {
  // round 30 modifiers: Frost Nova (a ring all around), Ice Shards (long and narrow, harder), Deep Freeze (longer, bursts)
  const mod = skillMod('cone'), R = mod === 'nova' ? 3.1 : mod === 'shards' ? 6.4 : CONE_R, half = mod === 'nova' ? Math.PI : mod === 'shards' ? 0.3 : CONE_HALF;
  const dmgK = mod === 'shards' ? 1.5 : 0.8, hold = mod === 'deep' ? 5 : mod === 'nova' ? 2.2 : 3;
  const [, at] = aimAt(R + 0.5);
  startCast('cone', 0.34, mod === 'nova' ? null : at, () => {
    const a0 = Math.atan2(at[1] - hero.fj, at[0] - hero.fi), [x, y] = screenOf(hero);
    for (const e of enemies) {
      if (!alive(e)) continue;
      const dx = e.fi - hero.fi, dy = e.fj - hero.fj, d = Math.hypot(dx, dy);
      let da = Math.abs(((Math.atan2(dy, dx) - a0 + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (d > R + (e.def.unique ? 0.5 : 0) || (d > 0.6 && da > half + 0.25 / Math.max(1, d))) continue;
      wake(e); G.pierce = true; G.elem = 'cold'; damageEnemy(e, spellDmg(dmgK), hero.fi, hero.fj, spellCrit(), 0, true); G.pierce = false; G.elem = null;
      if (!alive(e)) continue;
      if (e.def.unique || e.def.elite || e.champ) { e.slowT = (e.def.unique ? 3 : 4) * hold / 3; }
      else { e.frozen = e.frozenT0 = hold; e.atk = -1; e.hurt = 0; e.kb = [0, 0]; e.deepIce = mod === 'deep'; }
    }
    // shards of frost flying out across the wedge, and a sheet of frost on the ground (drawn)
    for (let k = 0; k < (mod === 'nova' ? 64 : 46); k++) {
      const a = a0 + (Math.random() * 2 - 1) * half, T = (9 + Math.random() * 5) * R / CONE_R, gx = Math.cos(a), gy = Math.sin(a);   // tiles/s along the ground
      pspawn(4, x, y, 10 + Math.random() * 12, (gx - gy) * 16 * T, (gx + gy) * 8 * T, 0, 0.26 + Math.random() * 0.12, k % 3 ? 118 : 117);
    }
    G.cones.push({ fi: hero.fi, fj: hero.fj, a0, t: 0.5, t0: 0.5, R, half });
    frostBreath(a0, R, half);   // round 65: the billowing cloud and the needles
    G.frost.push({ fi: hero.fi, fj: hero.fj, a0, t: 3.2 * hold / 3, seed: (Math.random() * 1e6) | 0, R, half });   // round 25: frost stays on the ground a while
    shockwave(hero.fi, hero.fj, R, 0.3, [27, 118], mod === 'nova' ? null : [a0, half]);
    orbFlare(117, 118, 12);
    if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.18);
    sfx('frost'); sfx('clink');
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
  const mod = skillMod('meteor');
  startCast('meteor', 0.42, best ? at : null, () => {
    // round 30 modifiers: Shower (three smaller), Molten Crater (burns after), Comet (a ball of ice)
    if (mod === 'shower') meteorShower(at);
    else G.meteors.push({ fi: at[0], fj: at[1], t: 0.9, t0: 0.9, molten: mod === 'molten', cold: mod === 'comet' });
    if (mod === 'comet') orbFlare(117, 27, 14, true); else orbFlare(16, 18, 14, true);
    sfx('meteor');
  });
}
// blink: vanish in a burst of arcane light and reappear up to 4.5 tiles away, in the stick's
// direction (or the way the mage faces), stopping short of walls. Leaves a fading afterimage.
function blink() {
  let [dx, dy] = dirVec(hero.dir);
  const vx = input.mx, vy = input.my;
  if (Math.hypot(vx, vy) > 0.2) [dx, dy] = stickToGround(vx, vy);
  let dist = 0;
  for (let s = 0.25; s <= 4.5; s += 0.25) { if (blocked(hero.fi + dx * s, hero.fj + dy * s)) break; if (standable(hero.fi + dx * s, hero.fj + dy * s)) dist = s; }   // stops at a wall; lands only where the body fits
  if (dist < 0.5) { CD.blink = 0; hero.mana += 8; return; }   // nowhere to go: refund
  const mod = skillMod('blink');
  const [x0, y0] = screenOf(hero);
  G.ghosts.push({ sp: getSprite('hero', hero.look, hero.dir, hero.clip, frameOf(hero), hero), x: x0, y: y0, t: 0.35, t0: 0.35 });
  const fi1 = hero.fi + dx * dist, fj1 = hero.fj + dy * dist, [x1, y1] = iso(fi1, fj1);
  for (let k = 0; k <= 12; k++) { const u = k / 12; pspawn(3, x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, 14 + Math.random() * 12, 0, 0, 6, 0.25 + u * 0.1, k % 2 ? 40 : 39); }   // the streak between
  for (const [x, y] of [[x0, y0], [x1, y1]]) for (let k = 0; k < 16; k++) { const a = k / 16 * 6.283; pspawn(4, x, y, 16, Math.cos(a) * 60, Math.sin(a) * 30, 0, 0.25, k % 2 ? 40 : 39); }
  hero.fi = fi1; hero.fj = fj1; hero.dir = dirFrom(dx, dy); hero.cast = -1; hero.castFn = null; hero.atk = -1; hero.approach = null; hero.arriveT = 0.3;   // round 43: lands in a crouch, arms flung out
  G.flashes.push({ fi: fi1, fj: fj1, t: 0.2, t0: 0.2, r: 90 });
  // round 27: a ring of arcane light where it leaves and where it lands, and a streak between
  const fi0 = fi1 - dx * dist, fj0 = fj1 - dy * dist;
  shockwave(fi0, fj0, 1.1, 0.22, [27, 40]); shockwave(fi1, fj1, 1.4, 0.28, [27, 40]); impactFlash(fi1, fj1, 14, 4);
  G.streaks.push({ a: [fi0, fj0], b: [fi1, fj1], t: 0.22, t0: 0.22 });
  sfx('blink'); sfx('whoomp');
  // round 30 modifiers
  if (mod === 'burst') {   // Arcane Burst: a blast where it lands that throws foes back
    G.elem = 'arcane'; G.pierce = true;
    for (const e of enemies) {
      if (!alive(e)) continue; const dx = e.fi - fi1, dy = e.fj - fj1, d = Math.hypot(dx, dy); if (d > 1.9 + (e.def.unique ? 0.4 : 0)) continue;
      const c = spellCrit(); damageEnemy(e, spellDmg(c ? 2.4 : 1.2), fi1, fj1, c, 1, true);
      if (alive(e) && smallFoe(e)) { const l = d || 1; e.kb = [dx / l * 9, dy / l * 9]; e.stun = Math.max(e.stun || 0, 0.5); }
    }
    G.elem = null; G.pierce = false;
    shockwave(fi1, fj1, 2, 0.3, [27, 40]); impactFlash(fi1, fj1, 12, 8);
    { const [x, y] = iso(fi1, fj1); for (let k = 0; k < 24; k++) { const a = k / 24 * 6.283; pspawn(4, x, y, 10, Math.cos(a) * 90, Math.sin(a) * 45, 10, 0.24, k % 2 ? 40 : 27); } }
    if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.25);
    sfx('boom');
  }
  if (mod === 'double') {   // Double Blink: the first one leaves the button ready for 1.5 s; the second is free
    if (hero.blink2T > 0) { hero.blink2T = 0; hero.mana += skillCost(SKILLS.find(s => s.id === 'blink')); CD.blink = 3; }
    else { hero.blink2T = 1.5; CD.blink = 0; }
  }
  if (mod === 'frost') {   // Frost Step: what stood near the mage freezes as she leaves
    G.elem = 'cold'; G.pierce = true;
    for (const e of enemies) if (alive(e) && Math.hypot(e.fi - fi0, e.fj - fj0) < 2.1 + (e.def.unique ? 0.4 : 0)) { wake(e); damageEnemy(e, spellDmg(0.5), fi0, fj0, false, 0, true); freezeFoe(e, 2.6); }
    G.elem = null; G.pierce = false;
    G.frost.push({ fi: fi0, fj: fj0, a0: 0, t: 3, seed: (Math.random() * 1e6) | 0, R: 2.1, half: Math.PI, ring0: 0 });
    shockwave(fi0, fj0, 2.1, 0.3, [27, 118]);
    { const [x, y] = iso(fi0, fj0); for (let k = 0; k < 26; k++) { const a = k / 26 * 6.283; pspawn(4, x, y, 6, Math.cos(a) * 70, Math.sin(a) * 35, 6, 0.3, k % 3 ? 118 : 27); } }
    sfx('frost'); sfx('clink');
  }
}
function updateMeteors(dt) {
  for (const m of G.meteors) {
    m.t -= dt;
    if (m.t < 0.45 && Math.random() < 0.9) {   // the falling rock trails fire
      const [x, y] = iso(m.fi, m.fj), k = Math.max(0, m.t) / 0.45;
      pspawn(3, x - k * 50 + (Math.random() - 0.5) * 6, y, k * 150, 0, 0, 0, 0.3, m.cold ? (Math.random() < 0.5 ? 118 : 27) : Math.random() < 0.5 ? 16 : 17);
    }
    if (m.t <= 0 && !m.done) {
      m.done = true; explodeAt(m.fi, m.fj, m.r || 2.4, m.k || 3.2, 2, !m.small, m.cold);
      { stampCrater(m.fi, m.fj, m.small ? 0.8 : 1.3); if (!G.dust) G.dust = []; const n = m.small ? 7 : 12; for (let c = 0; c < n; c++) { const a = c / n * 6.283 + Math.random() * 0.3; G.dust.push({ fi: m.fi + Math.cos(a) * 0.5, fj: m.fj + Math.sin(a) * 0.5, vi: Math.cos(a) * 2.4, vj: Math.sin(a) * 2.4, r: 7 + Math.random() * 6, vr: 20, t: 1 + Math.random() * 0.4, t0: 1.4, z: 3 }); } if (SHAKE) G.trauma = Math.min(1, G.trauma + (m.small ? 0.15 : 0.3)); }   // round 65: a crater and a cloud of dust
      if (m.molten) G.fireGround.push({ fi: m.fi, fj: m.fj, r: 2.2, t: 4, tick: 0.3 });
      const [x, y] = iso(m.fi, m.fj), dust = LV.outdoor ? DIRT[3] : S[5];
      for (let k = 0; k < (m.small ? 16 : 28); k++) { const a = k / 28 * 6.283; pspawn(5, x, y, 1, Math.cos(a) * 75, Math.sin(a) * 37, 40 + Math.random() * 30, 1, k % 3 ? dust : m.cold ? 117 : 15); }
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
    const CR = c.R || CONE_R, CH = c.half || CONE_HALF, p = 1 - c.t / c.t0, reach = CR * Math.min(1, p * 4), [hx, hy] = iso(c.fi, c.fj), bx = CR * 23 + 10, by = CR * 12 + 8;
    for (let y = Math.floor(hy - camY - by); y <= hy - camY + by; y++) for (let x = Math.floor(hx - camX - bx); x <= hx - camX + bx; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H || cid[y * W + x]) continue;
      // screen pixel back to ground tiles, relative to the caster
      const sx = (x + camX - hx) / 16, sy = (y + camY - hy) / 8, gi = (sx + sy) / 2, gj = (sy - sx) / 2, d = Math.hypot(gi, gj);   // inverse of iso()
      if (d > reach || d < 0.4) continue;
      const da = Math.abs(((Math.atan2(gj, gi) - c.a0 + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (da > CH) continue;
      const th = BAYER[((y & 3) << 2) | (x & 3)], edge = Math.min(1, CH >= 3 ? 1 : (CH - da) * 5) * (1 - (d / (CR + 0.5)) ** 2);
      if (th > edge * 1.5 * (1.1 - p) + 0.08) continue;
      scr[y * W + x] = (th < 0.3 && p < 0.6 ? 118 : 117) | EMIS;
    }
  }
  for (const s of G.sparks) {   // a four-pointed star at the staff's orb as a spell leaves it
    const x = Math.round(s.x - camX), y = Math.round(s.y - s.z - camY), L = s.t > 0.05 ? 5 : 3;
    for (let k = -L; k <= L; k++) for (const [a, b] of [[k, 0], [0, k]]) { const xx = x + a, yy = y + b; if (xx >= 0 && yy >= 0 && xx < W && yy < H) scr[yy * W + xx] = (Math.abs(k) < 2 ? 27 : s.col) | EMIS; }
  }
  for (const bl of G.blasts) {
    const [cx0, cy0] = iso(bl.fi, bl.fj), cx = cx0 - camX, cy = cy0 - camY, p = Math.min(1, (1 - bl.t / bl.t0) * (bl.bloom ? 2 : 1)); if (p >= 1) continue;
    const R = bl.r * 22.6 * (0.45 + 0.55 * Math.min(1, p * 2.2)), hole = Math.max(0, p - 0.35) / 0.65;
    for (let y = Math.floor(cy - R / 2); y <= cy + R / 2; y++) for (let x = Math.floor(cx - R); x <= cx + R; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const d = Math.hypot((x - cx) / R, (y - cy) * 2 / R); if (d > 1 || d < hole) continue;
      if (p > 0.3 && cid[y * W + x]) continue;   // after the first flash the fire stays on the ground, under the bodies
      const th = BAYER[((y & 3) << 2) | (x & 3)];
      if (th > 1.1 - p) continue;   // thins out as it burns away
      const heat = (1 - d) * (1 - p * 0.6);
      scr[y * W + x] = (bl.cold ? (heat > 0.6 ? 27 : heat > 0.4 ? 118 : heat > 0.2 ? 117 : 116) : heat > 0.6 ? 18 : heat > 0.4 ? 17 : heat > 0.2 ? 16 : 15) | EMIS;
    }
  }
  for (const m of G.meteors) {
    const [cx0, cy0] = iso(m.fi, m.fj), cx = cx0 - camX, cy = cy0 - camY, rx = (m.r || 2.4) * 22.6, ry = rx / 2, blink = Math.floor(G.t * 14) % 2, fill = 1 - m.t / m.t0;
    const C = m.cold ? [116, 117, 118, 27] : [14, 15, 16, 17, 18].slice(1), C0 = m.cold ? 116 : 14;   // fire, or ice for the Comet
    for (let a = 0; a < 170; a++) {
      const t = a / 170 * Math.PI * 2;
      for (const k of [1, fill]) {
        const x = Math.round(cx + Math.cos(t) * rx * k), y = Math.round(cy + Math.sin(t) * ry * k);
        if (x < 0 || y < 0 || x >= W || y >= H || ((a + blink) & 1 && k === 1)) continue;
        scr[y * W + x] = (k === 1 ? C[1] : C[0]) | EMIS;
      }
    }
    if (false && m.t < 0.45) {   // (round 73: the rock is drawn at full detail in drawMeteorRocks)
      const k = Math.max(0, m.t) / 0.45, rx0 = Math.round(cx - k * 50), ry0 = Math.round(cy - k * 150), q = m.small ? 0.6 : 1;
      for (let b = -7; b <= 7; b++) for (let a = -7; a <= 7; a++) {
        const d = (a * a + b * b) / (q * q), x = rx0 + a, y = ry0 + b;
        if (d > 45 || x < 0 || y < 0 || x >= W || y >= H) continue;
        scr[y * W + x] = (d <= 6 ? C[3] : d <= 18 ? C[2] : d <= 32 ? C[1] : C0) | EMIS;
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
// round 76: SHIELD CHARGE. A long sprint behind the shield, straight through everything in the way:
// each foe passed is hit, staggered and shouldered aside, and nothing can touch him while he runs.
// It goes where the stick points (so it is as much a way out as a way in); with the stick at rest
// it aims at the nearest foe in sight, else the way he faces. Upgrades: Battering Ram (the first
// foes are carried along and slammed into whatever stops the run), Second Wind (a second charge
// within 2 s, free, in any direction) and Tremor (a fissure races up the path behind him).
const CHARGE = { dist: 8.5, speed: 19 };
function startCharge() {
  let gi, gj;
  if (Math.hypot(input.mx, input.my) > 0.2) [gi, gj] = stickToGround(input.mx, input.my);
  else { const t = nearestEnemy(9, true); if (t) { gi = t.fi - hero.fi; gj = t.fj - hero.fj; } else [gi, gj] = dirVec(hero.dir); }
  const l = Math.hypot(gi, gj) || 1; gi /= l; gj /= l;
  hero.dir = dirFrom(gi, gj);
  hero.charge = { gi, gj, d: 0, from: [hero.fi, hero.fj], hit: new Set(), carry: [], mod: skillMod('charge'), again: hero.chargeSecond || false, dustT: 0 };
  hero.chargeSecond = false; hero.dash = 0.1; hero.bashDone = true; hero.bashTarget = null; hero.atk = -1; hero.walk = 0;
  sfx('heavySwing'); sfx('whoomp'); if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.12);
}
function endCharge(wall) {
  const C = hero.charge; if (!C) return;
  hero.charge = null; hero.dash = 0; hero.stop = Math.max(hero.stop, 0.08); hero.stopT = 0.18;
  const [x, y] = screenOf(hero), dust = LV.outdoor ? DIRT[3] : S[5];
  for (let k = 0; k < 10; k++) pspawn(5, x + (Math.random() - 0.5) * 10, y, 2, (C.gi - C.gj) * 30 + (Math.random() - 0.5) * 40, (C.gi + C.gj) * 15 + (Math.random() - 0.5) * 16, 30 + Math.random() * 40, 0.7, dust);
  if (C.carry.length) {   // Battering Ram: what he carried is thrown off the shield; into a wall it is crushed
    for (const e of C.carry) {
      if (!alive(e)) continue; e.leapZ = 0;
      G.pierce = true; G.elem = 'heavy'; damageEnemy(e, heroDmg(wall ? 2.4 : 1.3), hero.fi, hero.fj, wall && Math.random() < 0.5); G.elem = null; G.pierce = false;
      if (alive(e)) { e.stun = Math.max(e.stun || 0, wall ? 2 : 1.2); e.atk = -1; if (!wall) e.kb = [C.gi * 9, C.gj * 9]; }
      impactFlash(e.fi, e.fj, e.def.chest * 0.6, wall ? 8 : 5);
    }
    if (wall) { rubble(x + (C.gi - C.gj) * 14, y + (C.gi + C.gj) * 7, 14, 70); shockwave(hero.fi + C.gi * 0.8, hero.fj + C.gj * 0.8, 1.6, 0.24, [27, 31]); sfx('boom'); if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.55); }
    else sfx('kill');
  } else if (wall) { sfx('thud'); if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.2); }
  if (C.mod === 'tremor' && C.d > 1.5) { G.fissures.push({ fi: C.from[0], fj: C.from[1], a0: Math.atan2(C.gj, C.gi), reach: 0.5, R: C.d + 0.6, half: 0.2, hit: new Set() }); sfx('crack'); }
  if (C.mod === 'again' && !C.again) { hero.chargeAgain = 2; hero.chargeSecond = true; hero.chargeCd = CD.charge; CD.charge = 0; say('SECOND WIND!', 51, 1.2); }
}
function updateCharge(dt) {
  const C = hero.charge; hero.dash = 0.1; hero.clip = 'bash';
  let left = CHARGE.speed * dt, blockedNow = false;
  while (left > 1e-4 && !blockedNow) {
    const st = Math.min(0.22, left); left -= st;
    const f0 = hero.fi, j0 = hero.fj;
    // straight on or not at all: a charge does not slide round corners
    const r = 0.28, ni = f0 + C.gi * st, nj = j0 + C.gj * st;
    if (blocked(ni - r, nj - r) || blocked(ni + r, nj - r) || blocked(ni - r, nj + r) || blocked(ni + r, nj + r)) { blockedNow = true; break; }
    hero.fi = ni; hero.fj = nj; C.d += st;
    for (const e of enemies) {
      if (!alive(e) || C.hit.has(e) || Math.hypot(e.fi - hero.fi, e.fj - hero.fj) > 1.05 + (e.def.unique ? 0.4 : 0)) continue;
      C.hit.add(e); wake(e);
      const crit = Math.random() < CRIT_CHANCE, ram = C.mod === 'ram' && !e.def.unique && C.carry.length < 4;
      G.pierce = true; G.elem = 'stagger'; damageEnemy(e, heroDmg((crit ? 2 : 1) * (ram ? 0.6 : 1.1)), hero.fi - C.gi, hero.fj - C.gj, crit); G.elem = null; G.pierce = false;
      const [ex, ey] = screenOf(e); for (let q = 0; q < 7; q++) pspawn(2, ex, ey, e.def.chest * 0.6, (Math.random() - 0.5) * 120, (Math.random() - 0.5) * 60, Math.random() * 40, 0.18, q % 2 ? 31 : 27);
      impactFlash(e.fi, e.fj, e.def.chest * 0.6, 4); sfx('block'); hero.mana = Math.min(STAT.maxMana || 99, hero.mana + 1);
      if (!alive(e)) continue;
      e.atk = -1; e.stun = Math.max(e.stun || 0, e.def.unique ? 0.25 : 0.6);
      if (ram) C.carry.push(e);
      else if (!e.def.unique) { const side = ((e.fi - hero.fi) * -C.gj + (e.fj - hero.fj) * C.gi) >= 0 ? 1 : -1; e.kb = [(-C.gj * side * 0.8 + C.gi * 0.5) * 7, (C.gi * side * 0.8 + C.gj * 0.5) * 7]; }   // shouldered aside
    }
    C.carry.forEach((e, k) => { if (alive(e)) { const o = 0.85 + (k >> 1) * 0.5, sd = (k % 2 ? 1 : -1) * (k ? 0.35 : 0); e.fi = hero.fi + C.gi * o - C.gj * sd; e.fj = hero.fj + C.gj * o + C.gi * sd; e.leapZ = 3; e.stun = Math.max(e.stun || 0, 0.3); if (blocked(e.fi + C.gi * 0.4, e.fj + C.gj * 0.4)) blockedNow = true; } });
    for (const p of dynProps) if (!p.broken && (p.kind === 'barrel' || p.kind === 'egg') && Math.hypot(p.i + 0.5 - hero.fi, p.j + 0.5 - hero.fj) < 1.1) hitProp(p);
  }
  hero.walk += CHARGE.speed * dt / 0.5;
  C.dustT -= dt;
  if (C.dustT <= 0) {   // dust kicked up behind, an after-image every few strides
    C.dustT = 0.03; const [x, y] = screenOf(hero), dust = LV.outdoor ? DIRT[3] : S[5];
    for (let k = 0; k < 2; k++) pspawn(5, x + (Math.random() - 0.5) * 8, y, 1, -(C.gi - C.gj) * 20 + (Math.random() - 0.5) * 20, -(C.gi + C.gj) * 10, 20 + Math.random() * 30, 0.5, dust);
    if (Math.floor(C.d * 1.2) !== C.gh) { C.gh = Math.floor(C.d * 1.2); const [x0, y0] = iso(hero.fi, hero.fj); G.ghosts.push({ sp: getSprite('hero', hero.look, hero.dir, 'bash', 0, hero), x: x0, y: y0, t: 0.22, t0: 0.22 }); }
  }
  if (blockedNow) return endCharge(true);
  if (C.d >= CHARGE.dist) endCharge(false);
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
      const storm = skillMod('whirl') === 'storm';   // round 30: Blade Storm reaches wider and hits faster
      hero.whirlTick = storm ? 0.13 : 0.2;
      for (const e of enemies) if (alive(e) && Math.hypot(e.fi - hero.fi, e.fj - hero.fj) < heroReach() + 0.35 + (storm ? 0.8 : 0)) { const crit = Math.random() < CRIT_CHANCE; G.elem = 'stagger'; damageEnemy(e, heroDmg((crit ? 2 : 1) * (storm ? 0.45 : 0.6)), hero.fi, hero.fj, crit); G.elem = null;
        { const [x, y] = screenOf(e), ta = Math.atan2(e.fj - hero.fj, e.fi - hero.fi) + 1.57; for (let q = 0; q < 6; q++) { const a = ta + (Math.random() - 0.5) * 0.9, s = 60 + Math.random() * 60; pspawn(2, x, y, e.def.chest * 0.6, (Math.cos(a) - Math.sin(a)) * s * 0.7, (Math.cos(a) + Math.sin(a)) * s * 0.35, Math.random() * 30, 0.15, q % 2 ? 51 : 27); } impactFlash(e.fi, e.fj, e.def.chest * 0.6, 3); } }   // round 65c: sparks fly off each blade hit
      for (const p of dynProps) if (!p.broken && (p.kind === 'barrel' || p.kind === 'egg') && Math.hypot(p.i + 0.5 - hero.fi, p.j + 0.5 - hero.fj) < 1.7) hitProp(p);
      sfx('swing'); sfx('whoomp');   // each turn of the spin has a low whoosh under the swish
    }
  }
  if (hero.charge) updateCharge(dt);
  else if (hero.chargeAgain > 0) { hero.chargeAgain -= dt; if (hero.chargeAgain <= 0) CD.charge = Math.max(CD.charge, hero.chargeCd || 0); }
  if (hero.dash > 0 && !hero.charge) {
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
  givePowers(e, rollPowers(e, R), false);   // round 39: its powers (elites.js)
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
let boss = null;
function setupBoss() {
  boss = enemies.find(e => e.def.unique) || null;
  if (boss) boss.special = 4;
}
function bossAlive() { return boss && alive(boss); }
function updateBoss(e, dt, d, dx, dy) {
  if (e.def.boss === 'lich') return updateLich(e, dt, d);
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
// ---------------------------------------------------------------- the lich (round 23)
// Phase 1: rings of frost spread from him with gaps to slip through; walls of bone erupt across the
// floor (they hurt to stand in, then block the way for a while); frost bolts chill. Phase 2 (half
// life): the braziers turn blue, wraiths rise, he teleports about the ritual floor, the rings come
// faster, in pairs, with narrower gaps.
const RING_SPEED = 3.4, RING_MAX = 10, RING_W = 0.38;
function updateLich(e, dt, d) {
  if (!e.phase) { e.home = [e.fi, e.fj]; e.special = 2.5; e.phase = 1; }   // (every enemy has a home; the lich's is the ritual floor's center)
  const p2 = e.phase === 2;
  if (e.phase === 1 && e.hp < e.maxHp * 0.5) {   // phase 2
    e.phase = 2; e.special = 1.2; say('THE LICH ASCENDS', 59, 3); sfx('cry');
    if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.5);
    for (const f of fires) if (Math.hypot(f.wx - iso(e.home[0], e.home[1])[0], (f.wy - iso(e.home[0], e.home[1])[1]) * 2) < 260) f.blue = true;   // the braziers burn cold
    for (let k = 0; k < 3; k++) {
      let fi = 0, fj = 0, ok = false;
      for (let t = 0; t < 8 && !ok; t++) { const a = k / 3 * 6.283 + 0.5 + (t ? (t % 2 ? 1 : -1) * Math.ceil(t / 2) * 0.25 : 0); fi = e.home[0] + Math.cos(a) * 4; fj = e.home[1] + Math.sin(a) * 4; ok = standable(fi, fj, 0.3); }   // a prop in the way: try beside it
      if (!ok) continue;
      const w = makeEnemy('wraith', fi, fj, enemies.length); w.state = 'hunt'; enemies.push(w);
      const [x, y] = iso(fi, fj); burst(4, x, y, 10, 16, 40, 59);
    }
  }
  e.special -= dt;
  if (e.blinkT > 0) {   // teleporting: fade, then reappear elsewhere on the ritual floor
    e.blinkT -= dt; e.clip = 'cast'; e.atk = 0;
    if (e.blinkT <= 0) {
      const [x0, y0] = screenOf(e);
      G.ghosts.push({ sp: getSprite(e.fam, e.look, e.dir, 'idle', 0, e), x: x0, y: y0, t: 0.4, t0: 0.4 });
      for (let t = 0; t < 30; t++) {
        const a = Math.random() * 6.283, r = 2 + Math.random() * 4.5, fi = e.home[0] + Math.cos(a) * r, fj = e.home[1] + Math.sin(a) * r;
        if (blocked(fi, fj) || Math.hypot(fi - hero.fi, fj - hero.fj) < 3.5) continue;
        e.fi = fi; e.fj = fj; break;
      }
      const [x1, y1] = screenOf(e);
      for (const [x, y] of [[x0, y0], [x1, y1]]) for (let k = 0; k < 18; k++) { const a = k / 18 * 6.283; pspawn(4, x, y, 30, Math.cos(a) * 60, Math.sin(a) * 30, 0, 0.3, k % 2 ? 59 : 118); }
      sfx('blink'); e.atk = -1; e.cool = 0.6;
    }
    return true;
  }
  if (e.castT > 0) {   // staff raised: the pattern goes off when the wind-up ends
    e.castT -= dt; e.clip = 'cast'; e.atk = 0; e.dir = dirFrom(hero.fi - e.fi, hero.fj - e.fj);
    if (e.castT <= 0) {
      e.atk = -1; e.cool = 0.7;
      if (e.pattern === 'ring') lichRing(e, p2);
      else lichWall(e);
    }
    return true;
  }
  if (e.special <= 0 && d < 12) {
    const r = Math.random();
    if (p2 && r < 0.3) { e.blinkT = 0.35; e.special = 1.2; return true; }
    e.pattern = r < (p2 ? 0.65 : 0.55) ? 'ring' : 'wall';
    e.castT = 0.55; e.special = p2 ? 2.6 + Math.random() : 3.6 + Math.random() * 1.2;
    if (e.pattern === 'wall') say('BONES RISE FROM THE FLOOR', 26, 1.4);
    return true;
  }
  return false;   // otherwise a ranged caster: keeps its distance and throws frost bolts
}
// a ring of frost from the lich, with gaps (1 or 2 in phase 2, narrower) at random angles
function lichRing(e, p2) {
  const n = p2 ? 1 + (Math.random() < 0.5 ? 1 : 0) : 2, base = Math.random() * 6.283;
  const gaps = Array.from({ length: n }, (_, k) => base + k * 6.283 / n + (Math.random() - 0.5) * 0.6);
  G.rings.push({ fi: e.fi, fj: e.fj, r: 0.6, gaps, gapW: p2 ? 0.5 : 0.7, dmg: e.dmg, hit: false, delay: 0 });
  if (p2) G.rings.push({ fi: e.fi, fj: e.fj, r: 0.6, gaps: gaps.map(g => g + 3.14 / n + 0.5), gapW: 0.5, dmg: e.dmg, hit: false, delay: 0.65 });   // a second ring, gaps turned
  sfx('frost');
}
// a wall of bone across the floor through the hero, at right angles to the lich: cracks first
// (0.7 s), then spikes erupt (hurting anyone on them) and block the way for 6 s
function lichWall(e) {
  const dx = hero.fi - e.fi, dy = hero.fj - e.fj, l = Math.hypot(dx, dy) || 1, px = -dy / l, py = dx / l, tiles = [];
  for (let s = -3.5; s <= 3.5; s += 0.5) {
    const i = Math.floor(hero.fi + px * s), j = Math.floor(hero.fj + py * s), k = tIdx(i, j);
    if (tileAt(i, j) !== FLOOR || LV.solid[k] || tiles.includes(k) || Math.hypot(i + 0.5 - e.fi, j + 0.5 - e.fj) < 1.5) continue;
    if (LV.stairs && Math.abs(i - LV.stairs.i) <= 1 && Math.abs(j - LV.stairs.j) <= 1) continue;
    tiles.push(k);
  }
  G.walls.push({ tiles, warn: 0.7, life: 6, dmg: e.dmg, up: 0 });
}
function updateLichFx(dt) {
  for (const R of G.rings) {
    if (R.delay > 0) { R.delay -= dt; continue; }
    R.r += RING_SPEED * dt;
    if (!R.hit && !hero.dead) {
      const hd = Math.hypot(hero.fi - R.fi, hero.fj - R.fj);
      if (Math.abs(hd - R.r) < RING_W) {
        const a = Math.atan2(hero.fj - R.fj, hero.fi - R.fi);
        const inGap = R.gaps.some(g => Math.abs(((a - g + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < R.gapW / 2 * Math.min(1.6, 3 / Math.max(1, R.r)) + 0.08);
        if (!inGap) { R.hit = true; hurtHero(roll(R.dmg), null); hero.chillT = 1.5; const [x, y] = screenOf(hero); burst(4, x, y, 20, 14, 50, 118); }
      }
    }
  }
  G.rings = G.rings.filter(R => R.r < RING_MAX);
  for (const Wl of G.walls) {
    if (Wl.warn > 0) {
      Wl.warn -= dt;
      if (Math.random() < 0.5) { const k = Wl.tiles[Math.floor(Math.random() * Wl.tiles.length)]; if (k !== undefined) { const [x, y] = iso(k % MW + 0.5, Math.floor(k / MW) + 0.5); pspawn(5, x, y, 1, (Math.random() - 0.5) * 20, -10, 20, 1, BONE[0]); } }
      if (Wl.warn <= 0) {   // erupt
        for (const k of Wl.tiles) {
          const i = k % MW, j = Math.floor(k / MW);
          if (!hero.dead && Math.floor(hero.fi) === i && Math.floor(hero.fj) === j) { hurtHero(Math.round(roll(Wl.dmg) * 1.3), null); tryMove(hero, 0.6, 0.6); }
          for (const o of enemies) if (alive(o) && !o.def.unique && Math.floor(o.fi) === i && Math.floor(o.fj) === j) { o.fi += 0.6; }
          LV.solid[k] = 1;
          const [x, y] = iso(i + 0.5, j + 0.5); burst(5, x, y, 4, 6, 60, BONE[1]);
        }
        if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.3);
        sfx('barrel');
      }
      continue;
    }
    Wl.up = Math.min(1, Wl.up + dt * 7); Wl.life -= dt;
    if (Wl.life <= 0) { for (const k of Wl.tiles) LV.solid[k] = 0; const k = Wl.tiles[0]; if (k !== undefined) { const [x, y] = iso(k % MW + 0.5, Math.floor(k / MW) + 0.5); burst(5, x, y, 6, 10, 50, BONE[0]); } }
  }
  G.walls = G.walls.filter(Wl => Wl.warn > 0 || Wl.life > 0);
  if (hero.chillT > 0) hero.chillT -= dt;
}
// drawing (world layer): the frost rings as rings of ice shards with dark gaps, cracks and spikes
function drawLichFx() {
  for (const R of G.rings) {
    if (R.delay > 0) continue;
    const [cx0, cy0] = iso(R.fi, R.fj), n = Math.ceil(R.r * 26);
    for (let s = 0; s < n; s++) {
      const a = s / n * 6.283;
      if (R.gaps.some(g => Math.abs(((a - g + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < R.gapW / 2 * Math.min(1.6, 3 / Math.max(1, R.r)))) continue;
      const gi = R.fi + Math.cos(a) * R.r, gj = R.fj + Math.sin(a) * R.r, [x0, y0] = iso(gi, gj), x = Math.round(x0 - camX), y = Math.round(y0 - camY);
      const tall = (s * 7 + Math.floor(R.r * 4)) % 3 + 2;   // jagged shards of different heights
      for (let h = 0; h < tall; h++) { const yy = y - h; if (x < 0 || yy < 0 || x >= W || yy >= H) continue; scr[yy * W + x] = (h === tall - 1 ? 27 : h > 0 ? 118 : 117) | EMIS; }
      void cx0; void cy0;
    }
  }
  for (const Wl of G.walls) for (const k of Wl.tiles) {
    const i = k % MW, j = Math.floor(k / MW), [x0, y0] = iso(i + 0.5, j + 0.5), cx = Math.round(x0 - camX), cy = Math.round(y0 - camY);
    if (Wl.warn > 0) {   // cracks: a dark jagged line across the tile
      for (let s = -6; s <= 6; s++) { const x = cx + s, y = cy + Math.round(Math.sin(s * 1.7 + k) * 1.5); if (x >= 0 && y >= 0 && x < W && y < H && (s + Math.floor(G.t * 10)) % 4) scr[y * W + x] = BLK; }
      continue;
    }
    for (let sp = 0; sp < 3; sp++) {   // three bone spikes per tile, rising
      const ox = (sp - 1) * 5 + ((k * 3 + sp) % 3) - 1, hgt = Math.round((10 + ((k + sp * 5) % 7)) * Wl.up), w0 = 2.4;
      for (let h = 0; h < hgt; h++) {
        const hw = w0 * (1 - h / Math.max(1, hgt)), y = cy - h + (sp % 2);
        for (let a = -Math.ceil(hw) - 1; a <= Math.ceil(hw) + 1; a++) {
          const x = cx + ox + a; if (x < 0 || y < 0 || x >= W || y >= H) continue;
          const edge = Math.abs(a) > hw;
          if (edge && Math.abs(a) > hw + 1) continue;
          scr[y * W + x] = edge ? BLK : BONE[a < 0 ? 3 : a > 0.5 ? 1 : 2];
        }
      }
    }
  }
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

// ---------------------------------------------------------------- impact kit (round 25)
// Shared pieces that make the big skills land: a shockwave ring rolling out over the ground (or an
// arc of one), a white impact flash for the first frames, cracks that stay in the floor, a sheet of
// frost that lingers, stone chunks thrown up, and the whirlwind's spinning blade smear.
// G.waves: { fi, fj, r: tiles, t, t0, cols: [lead, body], arc: [a0, half] | null, emis }
function shockwave(fi, fj, r, dur, cols, arc = null, emis = true) {
  G.waves.push({ fi, fj, r, t: dur, t0: dur, cols, arc, emis });
  if (!emis) {   // a dust wave also kicks up puffs that ride out with its front
    const [x, y] = iso(fi, fj), sp = r * 22.6 / dur * 0.8;
    for (let k = 0; k < (arc ? 16 : 22); k++) {
      const a = arc ? arc[0] + (k / 15 - 0.5) * 2 * arc[1] : k / 22 * 6.283, gx = Math.cos(a), gy = Math.sin(a);
      pspawn(5, x, y, 2, (gx - gy) * 0.707 * sp, (gx + gy) * 0.354 * sp, 18 + Math.random() * 16, 1, k % 2 ? cols[0] : cols[1]);
    }
  }
}
function impactFlash(fi, fj, z, size) { G.impacts.push({ fi, fj, z, size, t: 0.09, t0: 0.09 }); }
// round 67: where a magic missile bursts: a rune ring that spreads and thins, six rays, a white flash
// round 68d: a shaft of moonlight through a crack in a chapel's ceiling (concept art C): a pale beam slanting
// down from the upper left, a dithered pool where it lands, and dust motes turning slowly in it
function drawShafts() {
  if (!LV.shafts || !LV.shafts.length) return;
  for (const sh of LV.shafts) {
    const [gx, gy] = iso(sh.fi, sh.fj), X = gx * SPX - cam2x, Y = gy * SPX - cam2y;
    if (X < -200 || X > OW + 200 || Y < -60 || Y > OH + 400) continue;
    const top = [X - 130, Y - 360], n = 360, c1 = sh.red ? 22 : 31, c2 = sh.red ? 17 : 32;   // (round 69: a ritual chamber's glow is red)
    for (let s2 = 0; s2 < n; s2++) {   // the beam: wider as it falls, sparse dither, a brighter core
      const u = s2 / n, cx = top[0] + (X - top[0]) * u, cy = top[1] + (Y - top[1]) * u, w = 10 + u * 26;
      for (let k = -w; k <= w; k++) {
        const x = Math.round(cx + k), y = Math.round(cy - k * 0.18), e = Math.abs(k) / w;
        const dens = (0.07 + 0.07 * (1 - e)) * (0.6 + 0.4 * u) * (0.85 + 0.15 * Math.sin(G.t * 1.3 + u * 6));
        if (BAYER[((y & 3) << 2) | (x & 3)] < dens) ovSet(x, y, e < 0.35 && u > 0.3 ? c2 : c1);
      }
    }
    for (let b = -24; b <= 24; b++) for (let a = -56; a <= 56; a++) {   // the pool on the floor
      const d = Math.hypot(a / 56, b / 24); if (d > 1) continue;
      const x = Math.round(X + a), y = Math.round(Y + b);
      if (BAYER[((y & 3) << 2) | (x & 3)] < 0.22 * (1 - d * d)) ovSet(x, y, d < 0.5 ? c2 : c1);
    }
    for (let m = 0; m < 14; m++) {   // dust motes drifting in the light
      const ph = hash(m, 7, 3), u = ((G.t * 0.05 + ph) % 1), cx = top[0] + (X - top[0]) * u, cy = top[1] + (Y - top[1]) * u;
      const x = Math.round(cx + Math.sin(G.t * 0.7 + m) * (6 + u * 18)), y = Math.round(cy + Math.cos(G.t * 0.5 + m * 2) * 4);
      ovSet(x, y, sh.red ? 17 : 27); if (m % 3 === 0) ovSet(x + 1, y, c2);
    }
  }
}
function arcaneHit(p) { (G.arcHits = G.arcHits || []).push({ fi: p.fi, fj: p.fj, z: p.z, t: 0.32, t0: 0.32, big: p.small ? 0.6 : p.orb ? 1.5 : 1, rot: Math.random() * 6.283 }); }
function drawArcHits() {
  if (!G.arcHits) return;
  for (const h of G.arcHits) {
    const [x, y] = iso(h.fi, h.fj), X = Math.round(x * SPX - cam2x), Y = Math.round((y - h.z) * SPX - cam2y), u = 1 - h.t / h.t0, B = h.big;
    const R = (8 + u * 24) * B, th = Math.max(2, Math.round((1 - u) * 6 * B));
    for (let k = 0; k < 120; k++) {   // the ring, broken into six rune arcs that turn as it spreads
      const a = k / 120 * 6.283; if ((k % 20) > 15) continue;
      for (let r = 0; r < th; r++) ovSet(Math.round(X + Math.cos(a + h.rot + u) * (R - r)), Math.round(Y + Math.sin(a + h.rot + u) * (R - r) * 0.55), r === 0 ? 27 : r === th - 1 ? 58 : u < 0.5 ? 40 : 39);
    }
    if (u < 0.6) for (let q = 0; q < 6; q++) {   // rays flung out past the ring
      const a = h.rot + q * 1.047, r0 = R * 0.3, r1 = R * (1.1 + 0.3 * (q & 1));
      for (let r = r0; r < r1; r += 1) ovSet(Math.round(X + Math.cos(a) * r), Math.round(Y + Math.sin(a) * r * 0.55), r > r1 - 3 ? 40 : 27);
    }
    if (u < 0.25) { const r = Math.round((1 - u * 4) * 7 * B); for (let b = -r; b <= r; b++) for (let a = -r; a <= r; a++) if (a * a + b * b * 2 <= r * r) ovSet(X + a, Y + b, a * a + b * b * 2 < r * r * 0.4 ? 27 : 40); }   // the white flash at the heart
  }
}
// cracks: the same branching paths the glowing quake draws, pressed into the floor for good
function crackPaths(q, fn) {
  const n = q.n || (q.ring ? 9 : 6), R = q.R || (q.ring ? 1.9 : SLAM_R), hf = q.half ?? SLAM_HALF;
  for (let c = 0; c < n; c++) {
    const r1 = rng(q.seed + c * 31);
    let a = q.ring ? c / n * 6.283 + r1() * 0.5 : q.a0 + (c / (n - 1) - 0.5) * 2 * hf * 0.9;
    let gi = 0, gj = 0; const len = R * (0.7 + r1() * 0.3);
    for (let s = 0; s < len * 6; s++) { a += (r1() - 0.5) * 0.5; gi += Math.cos(a) / 6; gj += Math.sin(a) / 6; fn(gi, gj, s / (len * 6)); }
  }
}
function stampCracks(q) {
  const [hx, hy] = iso(q.fi, q.fj), dark = LV.outdoor ? DIRT[0] : TH().ramp[0];
  crackPaths(q, (gi, gj, u) => {
    const x = Math.round(hx + (gi - gj) * 16), y = Math.round(hy + (gi + gj) * 8);
    for (const [ox, oy] of u < 0.6 ? [[0, 0], [1, 0]] : [[0, 0]]) { const xx = x + ox, yy = y + oy, k = yy * WW + xx; if (xx >= 0 && yy >= 0 && xx < WW && yy < WH && wFloor[k] && floorBuf[k] !== BLK) setFloor(k, ox ? dark : BLK); }
  });
}
// stone chunks (particle kind 7): thrown up, fall, and are gone when they land
function rubble(x, y, n, speed, a0 = null, half = Math.PI) {
  const cols = LV.outdoor ? [DIRT[2], DIRT[3]] : [TH().ramp[3], TH().ramp[5]];
  for (let k = 0; k < n; k++) { const a = a0 === null ? Math.random() * 6.283 : a0 + (Math.random() * 2 - 1) * half, s = speed * (0.4 + Math.random() * 0.6), gx = Math.cos(a) * s, gy = Math.sin(a) * s; pspawn(7, x, y, 2, (gx - gy) * 0.7, (gx + gy) * 0.35, 70 + Math.random() * 70, 3, cols[k & 1]); }
}
function updateImpactFx(dt) {
  for (const w of G.waves) w.t -= dt; G.waves = G.waves.filter(w => w.t > 0);
  for (const f of G.impacts) f.t -= dt; G.impacts = G.impacts.filter(f => f.t > 0);
  if (G.arcHits) { for (const h of G.arcHits) h.t -= dt; G.arcHits = G.arcHits.filter(h => h.t > 0); }
  for (const f of G.frost) f.t -= dt; G.frost = G.frost.filter(f => f.t > 0);
  for (const k of G.streaks) k.t -= dt; G.streaks = G.streaks.filter(k => k.t > 0);
  if (hero.whirl > 0 && Math.random() < 0.5 && G.dust) { const a = G.t * 14 + Math.random(), r = 1.0; G.dust.push({ fi: hero.fi + Math.cos(a) * r, fj: hero.fj + Math.sin(a) * r, vi: -Math.sin(a) * 3.5, vj: Math.cos(a) * 3.5, r: 4, vr: 10, t: 0.4, t0: 0.5, z: 1 }); }   // round 65c: a swirl of dust round his feet
  if (hero.whirl > 0 && Math.random() < 0.5) { const [x, y] = screenOf(hero), a = Math.random() * 6.283; pspawn(5, x + Math.cos(a) * 12, y + Math.sin(a) * 6, 1, -Math.sin(a) * 40, Math.cos(a) * 20, 10 + Math.random() * 10, 1, LV.outdoor ? DIRT[3] : S[5]); }
}
// ground-level pieces, drawn into the world layer under the bodies
function drawImpactFx() {
  const put = (x, y, v) => { if (x >= 0 && y >= 0 && x < W && y < H && !cid[y * W + x]) scr[y * W + x] = v; };
  for (const f of G.frost) {   // lingering frost: a sparse pale sheet with glints, thinning away
    const FR = f.R || CONE_R, FH = f.half || CONE_HALF, [hx, hy] = iso(f.fi, f.fj), life = Math.min(1, f.t / 1.2), bx = FR * 23 + 4, by = FR * 12 + 4;
    for (let y = Math.floor(hy - camY - by); y <= hy - camY + by; y++) for (let x = Math.floor(hx - camX - bx); x <= hx - camX + bx; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const sx = (x + camX - hx) / 16, sy = (y + camY - hy) / 8, gi = (sx + sy) / 2, gj = (sy - sx) / 2, d = Math.hypot(gi, gj);
      if (d > FR * 0.95 || d < (f.ring0 ?? 0.5)) continue;
      const da = Math.abs(((Math.atan2(gj, gi) - f.a0 + Math.PI * 3) % (Math.PI * 2)) - Math.PI); if (da > FH * 0.95) continue;
      const h = hash(x + camX, y + camY, f.seed), th = BAYER[((y & 3) << 2) | (x & 3)];
      if (h > 0.996 && Math.sin(G.t * 9 + h * 900) > 0.6) { put(x, y, 27 | EMIS); continue; }   // a glint
      if (th < 0.2 * life && h > 0.35) put(x, y, (h > 0.8 ? 118 : 117) | EMIS);
    }
  }
  for (const w of G.waves) {
    const p = 1 - w.t / w.t0, e = 1 - (1 - p) * (1 - p), R = w.r * 22.6 * (0.15 + 0.85 * e), [cx0, cy0] = iso(w.fi, w.fj), cx = cx0 - camX, cy = cy0 - camY;
    const steps = Math.ceil(R * 4);
    for (let s = 0; s < steps; s++) {
      const a = s / steps * 6.283;
      if (w.arc) { const da = Math.abs(((a - w.arc[0] + Math.PI * 3) % (Math.PI * 2)) - Math.PI); if (da > w.arc[1]) continue; }
      // a ground angle a: tile direction (cos, sin) -> screen
      const gx = Math.cos(a), gy = Math.sin(a), ux = (gx - gy) * 0.7071, uy = (gx + gy) * 0.3536;
      for (let k = 0; k < 5; k++) {
        const rr = R / 22.6 * 16 * 1.414 - k * 1.1, x = Math.round(cx + ux * rr * 1.0), y = Math.round(cy + uy * rr * 1.0);
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        if (BAYER[((y & 3) << 2) | (x & 3)] < p * 1.1 - 0.25 + k * 0.12) continue;   // thins out as it spreads, and toward its back edge
        const v = k === 0 ? w.cols[0] : w.cols[1];
        put(x, y, w.emis ? v | EMIS : v);
      }
    }
  }
}
// detail-layer pieces: the impact flash and the whirlwind smear (drawn at full detail)
function ovSet(X, Y, v) { if (X >= 0 && Y >= 0 && X < OW && Y < OH) ov32[Y * OW + X] = PAL32[v]; }
function drawStreaks() {   // the blink's streak: a white core in an arcane band, thinning from the start as it fades
  for (const k of G.streaks) {
    const [x0, y0] = iso(...k.a), [x1, y1] = iso(...k.b), p = 1 - k.t / k.t0;
    const A = [x0 * SPX - cam2x, (y0 - 14) * SPX - cam2y], B = [x1 * SPX - cam2x, (y1 - 14) * SPX - cam2y], n = Math.ceil(Math.hypot(B[0] - A[0], B[1] - A[1]));
    for (let s = 0; s <= n; s++) {
      const u = s / n; if (u < p) continue;
      const x = Math.round(A[0] + (B[0] - A[0]) * u), y = Math.round(A[1] + (B[1] - A[1]) * u), w = (u - p) < 0.15 ? 1 : 2;
      for (let b = -w; b <= w; b++) { if (Math.abs(b) === w && ((x + y) & 1)) continue; ovSet(x, y + b, b === 0 ? 27 : 40); }
    }
  }
}
// round 73: the fire that rises out of a blast: a white flash, then a ball of flame that swells, lifts off the
// ground and cools from yellow through orange to dark smoke, its edge ragged and boiling
const BLOOM_LUMP = new Float32Array(64);
function drawBlooms() {
  for (const bl of G.blasts) {
    if (!bl.bloom) continue;
    const [x0, y0] = iso(bl.fi, bl.fj), p = 1 - bl.t / bl.t0, Rg = bl.r * 22.6 * SPX, fr = Math.floor(G.t * 20);
    const grow = Math.min(1, p / 0.3), R = Rg * (0.26 + 0.2 * grow) * (bl.big ? 1.1 : 1), rise = Rg * 0.5 * p * p + R * 0.55;
    const cx = Math.round(x0 * SPX - cam2x), cy = Math.round(y0 * SPX - cam2y - rise), cool = Math.max(0, (p - 0.25) / 0.75);
    const RR = Math.ceil(R * 1.25);
    // round 79: the lumpy edge comes from a 64-step table round the ball and the boil from one hash per 2x2 block
    // (it was an atan2, two sines and a hash for every pixel: 4 ms a blast on a slowed CPU)
    const LUMP = BLOOM_LUMP; for (let k = 0; k < 64; k++) { const ang = k / 64 * 6.2832 - 3.1416; LUMP[k] = 1 / (R * (1 + 0.08 * Math.sin(ang * 4 + bl.seed + p * 5) + 0.06 * Math.sin(ang * 7 - bl.seed * 2 - p * 8))); }
    for (let b = -RR; b <= RR; b++) { const b2 = b * 1.12, bb = b2 * b2; let hv = 0;
     for (let a = -RR; a <= RR; a++) {
      const r2 = a * a + bb; if (r2 > RR * RR * 1.3) continue;
      // which of the 64 directions: octant by signs and the larger axis, then the ratio (no atan2)
      const aa = a < 0 ? -a : a, ab = b < 0 ? -b : b, t8 = aa > ab ? (ab / (aa || 1)) * 8 : 16 - (aa / (ab || 1)) * 8, q = (a >= 0 ? (b >= 0 ? t8 : 64 - t8) : (b >= 0 ? 32 - t8 : 32 + t8)) | 0;
      if ((a & 1) === 0 || a === -RR) hv = (hash((a + 512) >> 1, (b + 512) >> 1, fr) - 0.5) * 0.14;
      const d = Math.sqrt(r2) * LUMP[(q + 32) & 63] + hv;
      if (d > 1) continue;
      const x = cx + a, y = cy + b;
      if (p > 0.72 && BAYER[((y & 3) << 2) | (x & 3)] < (p - 0.72) / 0.28 * 1.05) continue;   // it thins to nothing
      // hottest low and in the middle; the top and the rim cool first
      const heat = (1 - d) * 0.9 + 0.25 + b / R * 0.18 - cool * 1.05;
      ovSet(x, y, p < 0.1 ? (d < 0.6 ? 27 : 18) : heat > 0.72 ? 18 : heat > 0.5 ? 17 : heat > 0.28 ? 16 : heat > 0.08 ? 15 : heat > -0.15 ? 14 : heat > -0.4 ? 5 : 4);
    } }
    if (p < 0.5) for (let k = 0; k < 7; k++) {   // tongues of flame flung out along the ground
      const a = bl.seed + k * 0.9, len = Rg * (0.35 + 0.6 * Math.min(1, p / 0.25)) * (0.7 + 0.3 * Math.sin(k * 2.3 + bl.seed)), bx = Math.round(x0 * SPX - cam2x), by = Math.round(y0 * SPX - cam2y);
      for (let sI = Math.round(len * 0.45); sI < len; sI++) { const u = sI / len, x = Math.round(bx + Math.cos(a) * sI), y = Math.round(by + Math.sin(a) * sI * 0.5 - Math.sin(u * 3.14) * 5); if (p > 0.3 && ((x + y) & 1)) continue; const c = u > 0.85 ? 15 : u > 0.6 ? 16 : 17; ovSet(x, y, c); ovSet(x, y - 1, c); if (u < 0.8) ovSet(x + 1, y, c); }
    }
  }
}
// round 73: the meteor itself: a dark rock, cracked and glowing, wrapped in flame that is white-hot on its leading
// face, dragging a long wavering tail down the sky (the Comet: the same in ice)
function drawMeteorRocks() {
  for (const m of G.meteors) {
    if (m.t >= 0.45) continue;
    const [x0, y0] = iso(m.fi, m.fj), k = Math.max(0, m.t) / 0.45, q = m.small ? 0.62 : 1, t = G.t, fr = Math.floor(t * 24);
    const X0 = Math.round((x0 - k * 50) * SPX - cam2x), Y0 = Math.round((y0 - k * 150) * SPX - cam2y), fx = 0.316, fy = 0.949;   // it falls down and to the right
    const C = m.cold ? [27, 118, 117, 116, 114] : [18, 17, 16, 15, 14], L = Math.round(70 * q);
    for (let sI = L; sI >= 4; sI--) {
      const u = sI / L, wv = Math.sin(t * 20 - sI * 0.3) * 4 * u, w = 13 * q * Math.pow(1 - u, 0.7), cx = X0 - fx * sI - fy * wv, cy = Y0 - fy * sI + fx * wv;
      for (let c = -Math.ceil(w); c <= Math.ceil(w); c++) {
        const e = Math.abs(c) / Math.max(1, w); if (e > 1) continue;
        const x = Math.round(cx - fy * c), y = Math.round(cy + fx * c);
        if (u > 0.55 && ((x + y + fr) & 1)) continue;
        const col = u < 0.2 ? (e < 0.5 ? C[1] : C[2]) : u < 0.5 ? (e < 0.5 ? C[2] : C[3]) : e < 0.5 ? C[3] : C[4];
        ovSet(x, y, col); ovSet(x + 1, y, col);
      }
    }
    const R = 15 * q, RR = Math.ceil(R * 1.3);
    for (let b = -RR; b <= RR; b++) for (let a = -RR; a <= RR; a++) {
      const al = a * fx + b * fy, d = Math.hypot(a, b) / R + (hash((a + 64) >> 1, (b + 64) >> 1, fr) - 0.5) * 0.22;
      if (d > 1.15) continue;
      const x = X0 + a, y = Y0 + b;
      if (d > 1) { if ((x + y + fr) & 1) ovSet(x, y, C[4]); continue; }
      if (d < 0.56) {   // the rock inside the fire, glowing along its cracks
        const crack = hash((a + 64) >> 2, (b + 64) >> 2, 5) < 0.3;
        ovSet(x, y, crack ? C[2] : m.cold ? (al > 2 ? 116 : 114) : al > 2 ? 75 : 73); continue;
      }
      const hot = d - Math.max(0, al) / R * 0.5;   // hottest on the face it falls on
      ovSet(x, y, hot < 0.42 ? C[0] : hot < 0.62 ? C[1] : hot < 0.85 ? C[2] : C[3]);
    }
  }
}
function drawImpactFlashes() {
  drawMeteorRocks(); drawBlooms();
  drawShafts(); drawSlamFx(); drawFrostFx(); drawLightning(); drawRangerKit(); drawArcHits();   // round 65, 66, 67, 68d
  drawStreaks(); drawHookChains(); drawMods30(); drawStrikes(); drawRangerFx(); drawDebris();
  for (const f of G.impacts) {
    const [x, y] = iso(f.fi, f.fj), X0 = Math.round(x * SPX - cam2x), Y0 = Math.round((y - f.z) * SPX - cam2y), p = 1 - f.t / f.t0, R = f.size * (0.6 + p * 0.6);
    // a white core with four spikes, the first frame solid, then hollowing out
    for (let b = -Math.ceil(R); b <= R; b++) for (let a = -Math.ceil(R * 2); a <= R * 2; a++) {
      const d = Math.hypot(a / 2, b);
      const spike = (Math.abs(b) < 1.5 && Math.abs(a) < R * 3) || (Math.abs(a) < 1.5 && Math.abs(b) < R * 1.5);
      if (d > R && !spike) continue;
      if (p > 0.5 && d < R * (p - 0.3)) continue;
      ovSet(X0 + a, Y0 + b, d < R * 0.6 || spike ? 27 : 51);
    }
  }
}
function whirlSmear(front) {
  if (!(hero.whirl > 0)) return;
  const storm = skillMod('whirl') === 'storm', [x, y] = screenOf(hero), X0 = Math.round(x * SPX - cam2x), Y0 = Math.round((y - 9) * SPX - cam2y), rx = storm ? 50 : 34, ry = storm ? 22 : 15, spin = G.t * (storm ? 34 : 26);
  for (const off of [0, Math.PI]) for (let s = 0; s < 70; s++) {
    const u = s / 70, a = spin + off - u * 2.4;   // the blade's tip leads, the trail fades behind it
    const sy = Math.sin(a); if ((sy > 0) !== front) continue;
    for (let k = 0; k < 3; k++) {
      const r = 1 - k * 0.06, X = Math.round(X0 + Math.cos(a) * rx * r), Y = Math.round(Y0 + sy * ry * r);
      if (u > 0.25 && ((X + Y + k) & 1)) continue;   // dithered tail
      if (u > 0.7 && k) continue;
      ovSet(X, Y, u < 0.1 ? 27 : u < 0.4 ? STEEL[4] : STEEL[2]);
    }
  }
}

// ---------------------------------------------------------------- skill modifiers, the rest (round 30)
// G.zaps: arcane arcs from the Arcane Orb to what it zaps; G.iceBursts: Deep Freeze victims bursting;
// G.devils: the Dust Devils thrown out by the whirlwind
const smallFoe = e => !e.def.unique && !e.def.elite && !e.champ;
function freezeFoe(e, t, deep = false) {
  if (!alive(e)) return;
  if (smallFoe(e)) { e.frozen = Math.max(e.frozen || 0, t); e.frozenT0 = e.frozen; e.atk = -1; e.hurt = 0; e.kb = [0, 0]; e.windT = 0; e.deepIce = deep; }
  else e.slowT = Math.max(e.slowT || 0, e.def.unique ? t * 0.7 : t);
}
// the Arcane Orb: every 0.3 s an arc of arcane light jumps to up to four foes near it
function updateOrb(p, dt) {
  p.pulse -= dt; if (p.pulse > 0) return;
  p.pulse = 0.4;
  const near = enemies.filter(e => alive(e) && Math.hypot(e.fi - p.fi, e.fj - p.fj) < 1.8).slice(0, 4);
  for (const e of near) {
    const c = spellCrit(); G.elem = 'arcane'; G.pierce = true; damageEnemy(e, spellDmg(c ? p.dmgK * 2 : p.dmgK), p.fi, p.fj, c, 0, true); G.elem = null; G.pierce = false;
    G.zaps.push({ a: [p.fi, p.fj, p.z], e, t: 0.14, seed: (Math.random() * 1e6) | 0 });
  }
  if (near.length) sfx('zap');
}
function orbBurst(p) {   // where the orb ends: one last burst
  G.elem = 'arcane'; G.pierce = true;
  for (const e of enemies) if (alive(e) && Math.hypot(e.fi - p.fi, e.fj - p.fj) < 1.7) { const c = spellCrit(); damageEnemy(e, spellDmg(c ? p.dmgK * 6 : p.dmgK * 3), p.fi, p.fj, c, 1, true); }
  G.elem = null; G.pierce = false;
  const [x, y] = iso(p.fi, p.fj);
  for (let k = 0; k < 20; k++) { const a = k / 20 * 6.283; pspawn(4, x, y, p.z, Math.cos(a) * 80, Math.sin(a) * 40, 0, 0.22, k % 2 ? 40 : 27); }
  shockwave(p.fi, p.fj, 1.7, 0.26, [27, 40]); impactFlash(p.fi, p.fj, p.z, 8);
  G.flashes.push({ fi: p.fi, fj: p.fj, t: 0.2, t0: 0.2, r: 90 });
  if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.2);
  sfx('whoomp');
}
// the Comet's landing: a ring of ice shards rolling out, a burst of frost, frost left on the ground
function iceBlast(fi, fj, r, big) {
  const [x, y] = iso(fi, fj), ringN = big ? 56 : 30, sp = r * 22.6 / 0.32;
  for (let k = 0; k < ringN; k++) { const a = k / ringN * 6.283; pspawn(4, x, y, 3, Math.cos(a) * sp, Math.sin(a) * sp * 0.5, 0, 0.32, k % 3 ? 118 : 27); }
  for (let k = 0; k < (big ? 30 : 14); k++) { const a = Math.random() * 6.283, d = Math.random() * r * 18; pspawn(4, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.5, 2, 0, 0, 30 + Math.random() * 50, 0.45, Math.random() < 0.5 ? 117 : 118); }   // shards thrown up
  burst(4, x, y, 8, big ? 40 : 22, big ? 150 : 100, 118); burst(2, x, y, 6, big ? 26 : 12, big ? 110 : 70, 27);
  shockwave(fi, fj, r * 1.05, big ? 0.36 : 0.26, [27, 118]); impactFlash(fi, fj, big ? 10 : 7, big ? 10 : 6);
  G.frost.push({ fi, fj, a0: 0, t: 4, seed: (Math.random() * 1e6) | 0, R: r, half: Math.PI, ring0: 0 });
  if (big) { rubble(x, y, 16, 80); const q = { fi, fj, a0: 0, ring: true, R: 2.4, t: 0.7, t0: 0.7, seed: (Math.random() * 1e6) | 0 }; stampCracks(q); }
  G.blasts.push({ fi, fj, r, t: big ? 0.32 : 0.22, t0: big ? 0.32 : 0.22, cold: true });
  G.flashes.push({ fi, fj, t: big ? 0.5 : 0.3, t0: big ? 0.5 : 0.3, r: big ? 170 : 115, tint: 2 });
  if (SHAKE) G.trauma = Math.min(1, G.trauma + (big ? 0.6 : 0.28));
  sfx('boom'); sfx('frost'); sfx('clink'); if (big) sfx('crack');
}
// Meteor Shower: three smaller meteors, staggered, around the chosen spot
function meteorShower(at) {
  G.meteors.push({ fi: at[0], fj: at[1], t: 0.9, t0: 0.9, r: 1.8, k: 2.3, small: true });
  for (const [dt0, a] of [[1.15, Math.random() * 6.283], [1.4, Math.random() * 6.283]]) {
    let p = [at[0] + Math.cos(a) * 1.8, at[1] + Math.sin(a) * 1.8];
    if (blocked(p[0], p[1])) p = [at[0] - Math.cos(a) * 1.8, at[1] - Math.sin(a) * 1.8];
    if (blocked(p[0], p[1])) p = at.slice();
    G.meteors.push({ fi: p[0], fj: p[1], t: dt0, t0: dt0, r: 1.8, k: 2.3, small: true });
  }
}
// Deep Freeze: a frozen foe killed bursts, freezing (not deep) and hurting those around it
function updateIceBursts() {
  const list = G.iceBursts; G.iceBursts = [];
  for (const b of list) {
    G.elem = 'cold'; G.pierce = true;
    for (const e of enemies) if (alive(e) && Math.hypot(e.fi - b.fi, e.fj - b.fj) < 1.8) { damageEnemy(e, spellDmg(0.7), b.fi, b.fj, false, 0, true); freezeFoe(e, 1.6); }
    G.elem = null; G.pierce = false;
    const [x, y] = iso(b.fi, b.fj);
    for (let k = 0; k < 18; k++) { const a = k / 18 * 6.283; pspawn(4, x, y, 10, Math.cos(a) * 70, Math.sin(a) * 35, 20, 0.3, k % 2 ? 118 : 27); }
    shockwave(b.fi, b.fj, 1.8, 0.26, [27, 118]); impactFlash(b.fi, b.fj, 10, 6);
    sfx('clink'); sfx('crack');
  }
}
// Dust Devils: small whirlwinds that wander out from the spin and knock about what they touch
function updateDevils(dt) {
  if (hero.whirl > 0 && skillMod('whirl') === 'devil') {
    hero.devilT = (hero.devilT || 0) - dt;
    if (hero.devilT <= 0) { hero.devilT = 0.22; const a = G.t * 5.3; G.devils.push({ fi: hero.fi + Math.cos(a) * 0.6, fj: hero.fj + Math.sin(a) * 0.6, vx: Math.cos(a) * 3.6, vy: Math.sin(a) * 3.6, t: 1.1, t0: 1.1, hit: new Set(), spin: Math.random() * 6 }); sfx('whoomp'); }
  }
  for (const d of G.devils) {
    d.t -= dt; let a = Math.atan2(d.vy, d.vx) + Math.sin(G.t * 6 + d.spin) * 1.5 * dt; const sp = Math.hypot(d.vx, d.vy);
    let tg = null, bd = 4; for (const e of enemies) { if (!alive(e) || d.hit.has(e)) continue; const q = Math.hypot(e.fi - d.fi, e.fj - d.fj); if (q < bd) { bd = q; tg = e; } }
    if (tg) { const want = Math.atan2(tg.fj - d.fj, tg.fi - d.fi), da = ((want - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI; a += Math.max(-4 * dt, Math.min(4 * dt, da)); }   // drifts toward a foe it hasn't hit
    d.vx = Math.cos(a) * sp; d.vy = Math.sin(a) * sp;
    const ni = d.fi + d.vx * dt, nj = d.fj + d.vy * dt;
    if (blocked(ni, nj)) d.t = Math.min(d.t, 0.12); else { d.fi = ni; d.fj = nj; }
    for (const e of enemies) {
      if (!alive(e) || d.hit.has(e) || Math.hypot(e.fi - d.fi, e.fj - d.fj) > 0.65 + (e.def.unique ? 0.4 : 0)) continue;
      d.hit.add(e); wake(e); const c = Math.random() < CRIT_CHANCE + (STAT.crit || 0) / 100;
      G.elem = 'stagger'; damageEnemy(e, heroDmg((c ? 2 : 1) * 0.7), d.fi, d.fj, c, 0, true); G.elem = null;
    }
    if (Math.random() < 0.7) { const [x, y] = iso(d.fi, d.fj), q = Math.random() * 6.283; pspawn(5, x + Math.cos(q) * 6, y + Math.sin(q) * 3, 1, -Math.sin(q) * 30, Math.cos(q) * 15, 8 + Math.random() * 14, 1, LV.outdoor ? DIRT[3] : S[5]); }
  }
  G.devils = G.devils.filter(d => d.t > 0);
}
function updateMods30(dt) {
  for (const z of G.zaps) z.t -= dt; G.zaps = G.zaps.filter(z => z.t > 0);
  if (G.iceBursts.length) updateIceBursts();
  updateDevils(dt);
  if (hero.blink2T > 0) { hero.blink2T -= dt; if (hero.blink2T <= 0) CD.blink = Math.max(CD.blink, 1.5); }   // the second blink went unused
  if (hero.whirl > 0 && skillMod('whirl') === 'long') {   // Long Spin drags the small ones in toward the blade
    for (const e of enemies) { if (!alive(e) || !smallFoe(e) || e.frozen > 0) continue; const dx = hero.fi - e.fi, dy = hero.fj - e.fj, d = Math.hypot(dx, dy); if (d < 3.6 && d > 1.05) tryMove(e, dx / d * 2.6 * dt, dy / d * 2.6 * dt, 0.25); }
  }
}
// detail layer: the orb's arcs (jagged, white core) and the dust devils (a leaning funnel of dust)
function drawMods30() {
  for (const z of G.zaps) {
    if (!alive(z.e) && z.e.dying > 0.2) continue;
    const [x0, y0] = iso(z.a[0], z.a[1]), [x1, y1] = iso(z.e.fi, z.e.fj);
    const A = [x0 * SPX - cam2x, (y0 - z.a[2]) * SPX - cam2y], B = [x1 * SPX - cam2x, (y1 - z.e.def.chest * 0.6) * SPX - cam2y];
    const n = 7, R = rng(z.seed + Math.floor(G.t * 30)); let px = A[0], py = A[1];
    for (let s = 1; s <= n; s++) {
      const u = s / n, j = s < n ? (R() - 0.5) * 14 : 0, nx = A[0] + (B[0] - A[0]) * u - (B[1] - A[1]) / 40 * j, ny = A[1] + (B[1] - A[1]) * u + (B[0] - A[0]) / 40 * j;
      const m = Math.ceil(Math.hypot(nx - px, ny - py));
      for (let k = 0; k <= m; k++) { const x = Math.round(px + (nx - px) * k / m), y = Math.round(py + (ny - py) * k / m); ovSet(x, y, 27); ovSet(x + 1, y, 40); ovSet(x, y + 1, 39); }
      px = nx; py = ny;
    }
  }
  for (const d of G.devils) {
    const [x, y] = iso(d.fi, d.fj), X0 = x * SPX - cam2x, Y0 = y * SPX - cam2y, life = Math.min(1, d.t / 0.25, (d.t0 - d.t) / 0.15), spin = G.t * 18 + d.spin;
    // pale dust streaks wound round a funnel that widens and leans as it rises; a dark band at the
    // back of each turn so it reads against the floor
    const dust = LV.outdoor ? [DIRT[1], DIRT[3], DIRT[4]] : [S[2], S[6], S[8]];
    for (let h = 0; h < 52; h++) {
      const rx = (4 + h * 0.5) * life, ry = rx * 0.3, cx = X0 + Math.sin(h * 0.12 + G.t * 7 + d.spin) * h * 0.18, cy = Y0 - h * 1.15;
      for (let k = 0; k < 5; k++) {
        const a = spin + k * 1.257 - h * 0.22, sx = Math.round(cx + Math.cos(a) * rx), sy = Math.round(cy + Math.sin(a) * ry), front = Math.sin(a) > 0;
        if (h > 38 && (sx + sy) & 1) continue;   // the top frays out
        ovSet(sx, sy, front ? dust[2] : dust[0]); if (front) ovSet(sx, sy + 1, dust[1]);
      }
    }
  }
}

// ---------------------------------------------------------------- Ground Slam, bigger (round 65)
// The user: the ground slam is weak. On top of the cracks, the dust wave and the chunks: rock spikes
// burst up out of the floor in a wave rolling out over the cone (each rises in 60 ms, holds, sinks),
// a crater is pressed into the floor where the blade bit, slow dust clouds billow out along the
// front, and the blow freezes the hero a moment and jolts the view.
// G.spikes: { fi, fj, h (detail px), w, delay, t, t0, seed }; G.dust: { fi, fj, r, vr, vi, vj, t, t0, col }
function slamEruption(fi, fj, a0, R, half, k) {
  if (!G.spikes) G.spikes = []; if (!G.dust) G.dust = [];
  const ring = half >= 3, rows = Math.round(R / 0.9);
  for (let r = 1; r <= rows; r++) {
    const d = 0.5 + r * 0.9 * (R - 0.4) / R, n = ring ? Math.round(4 + d * 2.2) : Math.max(1, Math.round(d * half * 2 / 1.15));
    for (let c = 0; c < n; c++) {
      const a = ring ? (c + Math.random() * 0.6) / n * 6.283 : a0 + (n === 1 ? 0 : (c / (n - 1) - 0.5) * 2 * half * 0.9) + (Math.random() - 0.5) * 0.12, dd = d + (Math.random() - 0.5) * 0.3;
      const pi = fi + Math.cos(a) * dd, pj = fj + Math.sin(a) * dd; if (blocked(pi, pj)) continue;
      { const gi = pi - hero.fi, gj = pj - hero.fj; if (Math.hypot(gi, gj) < 2.1 && gi + gj > -0.4) continue; }   // none in front of the hero's own legs
      const h = (30 + Math.random() * 16) * (1 - d / (R + 2.5)) * (0.8 + 0.2 * k), sx = Math.cos(a) - Math.sin(a);   // (sx: which way it leans on screen: away from the hero)
      G.spikes.push({ fi: pi, fj: pj, h, w: 8 + Math.random() * 4, delay: d * 0.045, t: 0.5, t0: 0.5, seed: (Math.random() * 1e6) | 0, lean: Math.sign(sx) * (0.25 + Math.random() * 0.25) });
    }
  }
  // dust clouds along the front, rolling outward and up
  for (let c = 0; c < (ring ? 14 : 10); c++) {
    const a = ring ? c / 14 * 6.283 : a0 + (c / 9 - 0.5) * 2 * half, d = R * (0.45 + Math.random() * 0.5);
    G.dust.push({ fi: fi + Math.cos(a) * d * 0.4, fj: fj + Math.sin(a) * d * 0.4, vi: Math.cos(a) * 1.6, vj: Math.sin(a) * 1.6, r: 6 + Math.random() * 6, vr: 18, t: 0.9 + Math.random() * 0.4, t0: 1.2, z: 2 });
  }
  landOomph(fi, fj, a0, ring);
}
// the landing itself (every slam, the Fissure too): a crater, a hold, the view punching down, a flash, dust round his feet
function landOomph(fi, fj, a0, ring) {
  stampCrater(fi, fj, ring ? 1.25 : 0.95);
  hero.stop = Math.max(hero.stop || 0, 0.13);   // the blow lands: everything holds a beat
  if (HEAVY) camKick(Math.cos(a0) + 0.7, Math.sin(a0) + 0.7, ring ? 4 : 5);   // (the view punches down and along the blow)
  if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.32);
  G.flashes.push({ fi: hero.fi, fj: hero.fj, t: 0.14, t0: 0.14, r: 170 });   // a flash of light off the strike
  { const dust = LV.outdoor ? [DIRT[4], DIRT[3]] : [TH().ramp[Math.min(TH().ramp.length - 1, 6)], TH().ramp[4]]; shockwave(hero.fi, hero.fj, 1.7, 0.28, dust, null, false); }   // a ring of dust round his feet
}
// the crater: a dark dip with a lit far rim, pressed into the floor for good (like the cracks)
function stampCrater(fi, fj, r) {
  const [hx, hy] = iso(fi, fj), rx = r * 22, ry = r * 11, ramp = LV.outdoor ? DIRT : TH().ramp;
  for (let y = Math.floor(hy - ry - 2); y <= hy + ry + 2; y++) for (let x = Math.floor(hx - rx - 2); x <= hx + rx + 2; x++) {
    if (x < 0 || y < 0 || x >= WW || y >= WH) continue;
    const k = y * WW + x; if (!wFloor[k] || floorBuf[k] === BLK) continue;
    const u = (x - hx) / rx, v = (y - hy) / ry, d = Math.hypot(u, v), th = BAYER[((y & 3) << 2) | (x & 3)];
    if (d > 1.12) continue;
    if (d > 0.92) { if (v < 0 ? th < 0.6 : th < 0.25) setFloor(k, v < 0 ? ramp[Math.min(ramp.length - 1, 4)] : ramp[1]); continue; }   // the rim: lit on the far side, dark on the near
    if (d < 0.35 ? true : th < 1 - d * 0.7) setFloor(k, d < 0.5 ? BLK : ramp[0]);
  }
}
function updateSlamFx(dt) {
  if (G.spikes) { for (const s of G.spikes) { if (s.delay > 0) { s.delay -= dt; if (s.delay <= 0) { const [x, y] = iso(s.fi, s.fj); for (let q = 0; q < 3; q++) pspawn(7, x, y, 2, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 20, 40 + Math.random() * 50, 1, TH().ramp[4]); } continue; } s.t -= dt; } G.spikes = G.spikes.filter(s => s.delay > 0 || s.t > 0); }
  if (G.dust) { for (const d of G.dust) { d.t -= dt; d.fi += d.vi * dt; d.fj += d.vj * dt; d.vi *= Math.exp(-dt * 2.5); d.vj *= Math.exp(-dt * 2.5); d.r += d.vr * dt; d.vr *= Math.exp(-dt * 2); d.z += dt * 10; } G.dust = G.dust.filter(d => d.t > 0); }
}
// the spikes (detail layer, lit where they stand): a jagged shard with a lit left face, a dark right
// face and a black edge; they burst up, hold, then sink back
function drawSlamFx() {
  const lit = (X, Y, v) => { if (X < 0 || Y < 0 || X >= OW || Y >= OH) return; const c = envCol((X + hx) >> 1, (Y + hy) >> 1, v, -2); if (c) ov32[Y * OW + X] = c; };
  const ramp = LV.outdoor ? DIRT : TH().ramp, top = ramp.length - 1;
  if (G.dust) for (const d of G.dust) {   // dust: dithered puffs, thinning as they spread
    const [x, y] = iso(d.fi, d.fj), X0 = Math.round(x * SPX - cam2x), Y0 = Math.round((y - d.z) * SPX - cam2y), life = d.t / d.t0, R = d.r;
    for (let b = -Math.ceil(R * 0.7); b <= R * 0.7; b++) for (let a = -Math.ceil(R); a <= R; a++) {
      const q = Math.hypot(a / R, b / (R * 0.7)); if (q > 1) continue;
      const X = X0 + a, Y = Y0 + b; if (BAYER[((Y & 3) << 2) | (X & 3)] > life * (1.1 - q) * 0.9) continue;
      lit(X, Y, q < 0.5 && b < 0 ? ramp[Math.min(top, 6)] : ramp[Math.min(top, 4)]);
    }
  }
  if (G.spikes) for (const s of G.spikes) {
    if (s.delay > 0) continue;
    const age = s.t0 - s.t, up = Math.min(1, age / 0.06), down = Math.min(1, s.t / 0.2), h = s.h * up * down; if (h < 2) continue;
    const [x, y] = iso(s.fi, s.fj), X0 = Math.round(x * SPX - cam2x), Y0 = Math.round(y * SPX - cam2y), R = rng(s.seed), w = s.w;
    // a slab: wide at the foot, narrowing to a broken, slanted top; three faces lit from the upper left
    const cut = 0.25 + R() * 0.3;   // how far down the broken top slants
    for (let yy = 0; yy < h; yy++) {
      const u = yy / h, half = u < 0.7 ? w * (1 - u * 0.55) : w * (1 - 0.385) * (1 - (u - 0.7) / 0.3 * 0.75), cx = X0 + s.lean * yy;
      for (let a = Math.floor(-half) - 1; a <= Math.ceil(half) + 1; a++) {
        const X = Math.round(cx + a), Y = Y0 - yy, uu = (a + half) / (2 * half || 1), topY = h * (1 - cut * uu);   // the slanted break
        if (yy > topY + 1) continue;
        const inside = Math.abs(a) <= half && yy <= topY;
        if (!inside) { lit(X, Y, BLK); continue; }
        lit(X, Y, yy > topY - 1.5 ? ramp[Math.min(top, 7)] : a < -half * 0.35 ? ramp[Math.min(top, 6)] : a < half * 0.3 ? ramp[Math.min(top, 4)] : ramp[2]);
      }
    }
    for (let a = -w - 1; a <= w + 1; a++) lit(X0 + a, Y0 + 1, BLK);   // a dark foot where it broke through
  }
}

// ---------------------------------------------------------------- Cone of Cold, bigger (round 65)
// The user: Cone of Cold looks pretty terrible. On top of the flash of frost on the floor: a cloud of
// frost rolls out of the staff over the whole cone, swelling and thinning as it goes (dithered, so the
// foes show through it), ice needles streak out ahead of it, and every foe it freezes is locked in
// ice: pale crystals jut up round its feet, with a glint, until it thaws.
// G.mist: { fi, fj, z, vi, vj, r, t, t0 }; G.needles: { fi, fj, z, vi, vj, t, t0 }
function frostBreath(a0, R, half) {
  if (!G.mist) G.mist = []; if (!G.needles) G.needles = [];
  const [ox, oy] = staffTip(), ring = half >= 3;
  for (let c = 0; c < (ring ? 26 : 18); c++) {
    const a = ring ? c / 26 * 6.283 + Math.random() * 0.2 : a0 + (Math.random() * 2 - 1) * half * 0.95, sp = R * (2.2 + Math.random() * 1.4);
    G.mist.push({ fi: ring ? hero.fi + Math.cos(a) * 1.0 : ox, fj: ring ? hero.fj + Math.sin(a) * 1.0 : oy, z: ring ? 8 : ORB_Z - 8, vi: Math.cos(a) * sp, vj: Math.sin(a) * sp, r: 4, t: 0.55 + Math.random() * 0.25, t0: 0.8 });
  }
  for (let c = 0; c < (ring ? 20 : 14); c++) {
    const a = ring ? c / 20 * 6.283 : a0 + (Math.random() * 2 - 1) * half, sp = 14 + Math.random() * 6;
    G.needles.push({ fi: ox, fj: oy, z: ORB_Z - 6 + Math.random() * 6, vi: Math.cos(a) * sp, vj: Math.sin(a) * sp, t: R / sp, t0: R / sp, vz: -10 - Math.random() * 20 });
  }
}
function updateFrostFx(dt) {
  if (G.mist) { for (const m of G.mist) { m.t -= dt; m.fi += m.vi * dt; m.fj += m.vj * dt; const k = Math.exp(-dt * 4.5); m.vi *= k; m.vj *= k; m.r += (14 - m.r) * dt * 4; m.z = Math.max(4, m.z - dt * 30); } G.mist = G.mist.filter(m => m.t > 0 && !blocked(m.fi, m.fj)); }
  if (G.needles) { for (const n of G.needles) { n.t -= dt; n.fi += n.vi * dt; n.fj += n.vj * dt; n.z = Math.max(2, n.z + n.vz * dt); } G.needles = G.needles.filter(n => n.t > 0); }
}
function drawFrostFx() {
  const P = (fi, fj, z) => { const [x, y] = iso(fi, fj); return [Math.round(x * SPX - cam2x), Math.round((y - z) * SPX - cam2y)]; };
  if (G.mist) for (const m of G.mist) {   // the cloud: a soft pale ball, dithered thinner at its edge and as it fades
    const [X0, Y0] = P(m.fi, m.fj, m.z), life = Math.min(1, m.t / 0.35), R = m.r * SPX;
    for (let b = -Math.ceil(R * 0.75); b <= R * 0.75; b++) for (let a = -Math.ceil(R); a <= R; a++) {
      const q = Math.hypot(a / R, b / (R * 0.75)); if (q > 1) continue;
      const X = X0 + a, Y = Y0 + b, th = BAYER[((Y & 3) << 2) | (X & 3)];
      if (th > life * (1.05 - q * q) * 0.5) continue;
      ovSet(X, Y, q < 0.3 && b < 0 && life > 0.6 ? 27 : (X + Y) & 2 ? 118 : 117);
    }
  }
  if (G.needles) for (const n of G.needles) {   // needles: a short bright streak along the way it flies
    const [X0, Y0] = P(n.fi, n.fj, n.z), [X1, Y1] = P(n.fi - n.vi * 0.035, n.fj - n.vj * 0.035, n.z), L = Math.ceil(Math.hypot(X1 - X0, Y1 - Y0));
    for (let s = 0; s <= L; s++) { const u = s / (L || 1); ovSet(Math.round(X0 + (X1 - X0) * u), Math.round(Y0 + (Y1 - Y0) * u), u < 0.3 ? 27 : u < 0.7 ? 118 : 117); }
  }
  // the ice that holds a frozen foe: crystals jutting up round its feet, a glint now and then
  for (const e of enemies) {
    if (!(e.frozen > 0) || !alive(e) || e.def.unique) continue;
    const [X0, Y0] = P(e.fi, e.fj, 0), R = rng(e.seed * 7 + 3), sc = Math.min(1.4, (e.def.chest || 20) / 22), grow = Math.min(1, (e.frozenT0 ? (e.frozenT0 - e.frozen) : 1) / 0.12), melt = Math.min(1, e.frozen / 0.4);
    for (let c = 0; c < 5; c++) {
      const ox = (c - 2) * 6 * sc + (R() - 0.5) * 4, h = (10 + R() * 14) * sc * grow * melt, w = (3 + R() * 2) * sc, lean = (c - 2) * 0.18 + (R() - 0.5) * 0.2, oy = (c === 0 || c === 4 ? -3 : 2) * sc;
      if (h < 2) continue;
      for (let yy = 0; yy < h; yy++) {
        const u = yy / h, half = w * (1 - u), cx = X0 + ox + lean * yy;
        for (let a = Math.floor(-half) - 1; a <= Math.ceil(half) + 1; a++) {
          const X = Math.round(cx + a), Y = Math.round(Y0 + oy - yy);
          if (Math.abs(a) > half) { if (Math.abs(a) <= half + 1) ovSet(X, Y, 115); continue; }
          ovSet(X, Y, a < -half * 0.3 ? 27 : a < half * 0.3 ? 118 : 116);
        }
      }
    }
    if (hash(Math.floor(G.t * 3), e.seed, 9) < 0.4) { const gx = X0 + (R() - 0.5) * 16 * sc, gy = Y0 - (8 + R() * 30) * sc; for (let k = -3; k <= 3; k++) { ovSet(gx + k, gy, Math.abs(k) < 2 ? 27 : 118); ovSet(gx, gy + k, Math.abs(k) < 2 ? 27 : 118); } }   // a glint
  }
}

// ---------------------------------------------------------------- Chain Lightning (round 65)
// Replaces Blink (the user: lightning is the missing element: arcane, fire, earth, water). A short
// charge crackling at the staff, then a jagged bolt to the nearest foe that jumps on to the next
// nearest it hasn't hit (3.6 tiles), up to five, one jump every 70 ms. Every foe it hits is SHOCKED
// for 3 s: everything hits it 25% harder (damageEnemy), and it crackles. Fork: splits in two at each
// jump, up to eight. Overload: one jump, a huge bolt (x2.2) that stuns. Conductor: jumps twice as far
// to and through chilled or frozen foes.
// G.bolts: { a: [fi, fj, z] start, e: foe, b: [fi, fj, z] end (kept if it dies), delay, t, t0, k, big, seed, done }
const CHAIN_JUMP = 3.6;
const chillish = e => e.frozen > 0 || e.slowT > 0 || e.chillT > 0;
function chainLightning() {
  const mod = skillMod('chain'), first = nearestEnemy(7.5, true);
  if (!first) { say('NOTHING TO STRIKE', 25, 1); return false; }
  startCast('chain', 0.3, [first.fi, first.fj], () => {
    const [ox, oy] = staffTip(), n = mod === 'overload' ? 2 : mod === 'fork' ? 8 : 5, k = mod === 'overload' ? 2.2 : 1.0, big = mod === 'overload';
    const hit = new Set([first]), seq = [{ a: [ox, oy, ORB_Z], e: first, step: 0 }];
    let front = [first], step = 0;
    while (hit.size < n && front.length) {
      step++; const next = [];
      for (const src of front) for (let b = 0; b < (mod === 'fork' ? 2 : 1) && hit.size < n; b++) {
        let best = null, bd = 1e9;
        for (const e of enemies) {
          if (!alive(e) || hit.has(e) || LV.vis[tIdx(Math.floor(e.fi), Math.floor(e.fj))] < 0.3) continue;
          const d = Math.hypot(e.fi - src.fi, e.fj - src.fj), range = mod === 'conductor' && (chillish(e) || chillish(src)) ? CHAIN_JUMP * 2 : CHAIN_JUMP;
          if (d < range && d < bd) { bd = d; best = e; }
        }
        if (best) { hit.add(best); seq.push({ a: null, src, e: best, step }); next.push(best); }
      }
      front = next;
    }
    for (const s of seq) G.bolts.push({ a: s.a, src: s.src || null, e: s.e, delay: s.step * 0.07, t: big ? 0.26 : 0.18, t0: big ? 0.26 : 0.18, k: k * (1 - s.step * 0.06), big, seed: (Math.random() * 1e6) | 0, done: false });
    orbFlare(40, 32, 14); sfx('zap'); if (SHAKE) G.trauma = Math.min(1, G.trauma + (big ? 0.35 : 0.15));
  });
  return true;
}
const chestOf = e => [e.fi, e.fj, (e.def.chest || 20) * 0.65];
function updateLightning(dt) {
  if (!G.bolts) G.bolts = [];
  // the charge: sparks crackling at the staff's orb before the bolt leaves
  if (hero.cast > 0 && hero.castKind === 'chain' && (hero.castAge || 0) < castRel('chain') && Math.random() < 0.9) {
    const [fi, fj] = staffTip(), [x, y] = iso(fi, fj);
    for (let q = 0; q < 2; q++) { const a = Math.random() * 6.283; pspawn(2, x + Math.cos(a) * 5, y, ORB_Z + Math.sin(a) * 5, -Math.cos(a) * 30, 0, -Math.sin(a) * 30, 0.12, q ? 40 : 32); }
    G.staffArc = G.t;
  }
  for (const B of G.bolts) {
    if (B.delay > 0) { B.delay -= dt; if (B.delay > 0) continue; }
    if (!B.a) B.a = chestOf(B.src);   // a jump starts where the last foe stood
    if (!B.done) {
      B.done = true; B.b = chestOf(B.e);
      const e = B.e;
      if (alive(e)) {
        wake(e); const c = spellCrit(); G.elem = 'shock'; G.pierce = true;
        damageEnemy(e, spellDmg(c ? B.k * 2 : B.k), B.a[0], B.a[1], c, B.big ? 1 : 0, true); G.elem = null; G.pierce = false;
        if (alive(e)) { e.shockT = 3; if (B.big && !e.def.unique) e.stun = Math.max(e.stun || 0, 1.0); }
      }
      impactFlash(B.b[0], B.b[1], B.b[2], B.big ? 7 : 4);
      const [x, y] = iso(B.b[0], B.b[1]);
      for (let q = 0; q < (B.big ? 18 : 10); q++) { const a = Math.random() * 6.283, s = 40 + Math.random() * 60; pspawn(2, x, y, B.b[2], Math.cos(a) * s, Math.sin(a) * s * 0.5, Math.random() * 40, 0.18 + Math.random() * 0.12, q % 3 ? 40 : 32); }
      G.flashes.push({ fi: B.b[0], fj: B.b[1], t: 0.14, t0: 0.14, r: B.big ? 130 : 95, tint: 2 });
      sfx('zap', B.big ? 1 : 0.6);
    } else if (alive(B.e)) B.b = chestOf(B.e);
    B.t -= dt;
  }
  G.bolts = G.bolts.filter(B => B.delay > 0 || B.t > 0);
  for (const e of enemies) if (e.shockT > 0) e.shockT -= dt;
}
// a jagged bolt, re-rolled every other frame: a white core, a pale blue glow either side, a few short
// forks off it, thinning out as it fades (detail layer)
function boltLine(A, B, seed, w, life, forks = true) {
  const R = rng(seed + Math.floor(G.t * 30)), n = Math.max(4, Math.round(Math.hypot(B[0] - A[0], B[1] - A[1]) / 9));
  const nx = -(B[1] - A[1]), ny = B[0] - A[0], nl = Math.hypot(nx, ny) || 1;
  let px = A[0], py = A[1];
  for (let s = 1; s <= n; s++) {
    const u = s / n, j = s < n ? (R() - 0.5) * 16 : 0, qx = A[0] + (B[0] - A[0]) * u + nx / nl * j, qy = A[1] + (B[1] - A[1]) * u + ny / nl * j;
    const m = Math.ceil(Math.hypot(qx - px, qy - py));
    for (let k = 0; k <= m; k++) {
      const x = Math.round(px + (qx - px) * k / m), y = Math.round(py + (qy - py) * k / m);
      if (w >= 2) {   // a 2 px hot core in a pale blue glow, a dithered deep blue haze outside it
        for (const [a, b] of [[-2, 0], [2, 0], [0, -2], [0, 3], [-2, 1], [2, 1]]) if ((x + y + a) & 1) ovSet(x + a, y + b, 39);
        for (const [a, b] of [[-1, 0], [1, 0], [0, -1], [0, 2], [-1, 1], [1, 1]]) ovSet(x + a, y + b, 40);
        if (w > 2) for (const [a, b] of [[-3, 0], [3, 0], [0, -3], [0, 4]]) if ((x + y) & 1) ovSet(x + a, y + b, 39);
      } else if (life > 0.5 && ((x + y) & 1)) ovSet(x, y + 1, 40);
      ovSet(x, y, 27); if (w >= 2) ovSet(x, y + 1, 32);
    }
    if (forks && s < n && R() < 0.45) {   // a short fork
      let fx = qx, fy = qy, a = Math.atan2(B[1] - A[1], B[0] - A[0]) + (R() < 0.5 ? 1 : -1) * (0.6 + R() * 0.6);
      for (let f = 0; f < 6 + R() * 8; f++) { a += (R() - 0.5) * 0.8; fx += Math.cos(a) * 1.4; fy += Math.sin(a) * 1.4; ovSet(Math.round(fx), Math.round(fy), f < 4 ? 32 : 40); }
    }
    px = qx; py = qy;
  }
}
function drawLightning() {
  if (!G.bolts) return;
  const P = p => { const [x, y] = iso(p[0], p[1]); return [Math.round(x * SPX - cam2x), Math.round((y - p[2]) * SPX - cam2y)]; };
  if (G.staffArc === G.t) { const [fi, fj] = staffTip(), c = P([fi, fj, ORB_Z]), R = rng(Math.floor(G.t * 40)); for (let q = 0; q < 2; q++) { const a = R() * 6.283; boltLine([c[0], c[1]], [c[0] + Math.cos(a) * 12, c[1] + Math.sin(a) * 12], q * 13, 1, 1, false); } }   // the charge crackles round the orb
  for (const B of G.bolts) {
    if (B.delay > 0 || !B.a || !B.b) continue;
    const life = B.t / B.t0; if (life < 0.35 && Math.floor(G.t * 30) % 2) continue;   // flickers out
    const pa = P(B.a), pb = P(B.b);
    boltLine(pa, pb, B.seed, B.big ? 3 : life > 0.4 ? 2 : 1, life);
    if (life > 0.55) for (const [cx, cy, r] of [[pb[0], pb[1], B.big ? 7 : 5], [pa[0], pa[1], 3]]) for (let b = -r; b <= r; b++) for (let a = -r; a <= r; a++) { const d = Math.hypot(a, b); if (d <= r) ovSet(cx + a, cy + b, d < r * 0.45 ? 27 : d < r * 0.75 ? 32 : 40); }   // a hot spark where it bites (and leaves)
    if (B.big && life > 0.5) boltLine(P(B.a), P(B.b), B.seed + 7, 1, life, false);   // Overload: a second strand
  }
  // the shocked crackle: little arcs over the body, now and then
  for (const e of enemies) {
    if (!(e.shockT > 0) || !alive(e)) continue;
    const r = hash(Math.floor(G.t * 15), e.seed, 5); if (r > 0.7) continue;
    const c = P(chestOf(e)), R = rng(e.seed + Math.floor(G.t * 15));
    for (let q = 0; q < 2; q++) { const a = R() * 6.283, l = 14 + R() * 14, ox = (R() - 0.5) * 10, oy = (R() - 0.5) * 24; boltLine([c[0] + ox + Math.cos(a) * l * 0.5, c[1] + oy + Math.sin(a) * l * 0.6], [c[0] + ox - Math.cos(a) * l * 0.5, c[1] + oy - Math.sin(a) * l * 0.6], e.seed + q, 1, 1, true); }
  }
}

// ---------------------------------------------------------------- ultimates (round 31)
// A fifth button from level 10. It charges from fighting, not a cooldown: dealing a monster's
// worth of damage gives 4%, each kill 1% more (champions and elites 6%, bosses 20%), so it fills
// in about one or two big fights. Damage the ultimate itself deals doesn't charge it.
const ULT_LVL = 4;   // TESTING (the user restarts each test): put back to 10 for release
const ULTS = {
  warrior: { id: 'wrath', name: 'WRATH OF THE MOUNTAIN' },
  mage: { id: 'storm', name: 'ARCANE STORM' },
  ranger: { id: 'rain', name: 'RAIN OF ARROWS' },
};
const ultReady = () => hero.lvl >= ULT_LVL && (hero.ult || 0) >= 100;
function ultGain(e, dmg, killed) {
  if (hero.lvl < ULT_LVL || hero.ultOn || G.rocks.length || G.rain.length || !(e.maxHp > 0)) return;
  let g = 4 * Math.max(0, dmg) / e.maxHp;
  if (killed) g += e.def.unique ? 20 : e.champ || e.def.elite ? 6 : 1;
  const was = hero.ult || 0; hero.ult = Math.min(100, was + g);
  if (was < 100 && hero.ult >= 100) { say(`${ULTS[hero.cls].name} IS READY`, 51, 2); sfx('levelUp'); }
}
function useUlt() {
  if (G.mode !== 'play' || hero.dead) return;
  if (hero.lvl < ULT_LVL) { say(`ULTIMATE UNLOCKS AT LEVEL ${ULT_LVL}`, 25, 1.4); return; }
  if (!ultReady()) { say('NOT CHARGED YET', 40, 1.2); btnFx(9).deny = 0.3; sfx('tap'); return; }
  if (hero.ultOn || hero.leap) return;
  if (hero.castKind === 'missile' && hero.cast >= 0) { hero.cast = -1; hero.castFn = null; }
  if (heroBusy()) return;
  hero.ult = 0; btnFx(9).press = 0.2; G.ultAt = G.t;
  if (hero.cls === 'mage') startStorm(); else if (hero.cls === 'ranger') startRain(); else startWrath();
}
// Wrath of the Mountain: the warrior leaps straight up, hangs, and drives down; a huge ring of
// ground shatters, everything is knocked down, then rocks rain over the area
function startWrath() {
  hero.ultOn = { kind: 'wrath', t: 0, fi: hero.fi, fj: hero.fj, landed: false };
  hero.atk = -1; hero.cast = -1; hero.approach = null;
  say('WRATH OF THE MOUNTAIN!', 51, 1.6); sfx('heavySwing'); sfx('cry');
  if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.2);
}
const WRATH_R = 5.2;
function updateWrath(dt) {
  const U = hero.ultOn; U.t += dt;
  const t = U.t;
  hero.clip = 'attack4'; hero.combo = 3;
  if (t < 0.42) { const u = t / 0.42; hero.leapZ = Math.sin(u * Math.PI / 2) * 64; hero.atk = FEEL_OLD ? 40 : u < 0.15 ? 50 : 130; }   // up
  else if (t < 0.62) { hero.leapZ = 64 + Math.sin((t - 0.42) * 30) * 1.5; hero.atk = FEEL_OLD ? 40 : 130; if (Math.random() < 0.8) { const [x, y] = screenOf(hero); pspawn(4, x + (Math.random() - 0.5) * 20, y, hero.leapZ + Math.random() * 30, 0, 0, -30, 0.3, Math.random() < 0.5 ? 51 : 27); } }   // hangs, gathering light
  else if (t < 0.72) { hero.leapZ = 64 * (1 - (t - 0.62) / 0.1); hero.atk = 230; }   // drives down
  else if (!U.landed) { U.landed = true; hero.leapZ = 0; wrathLand(); }
  else if (t > 0.95) { hero.ultOn = null; hero.atk = -1; hero.clip = 'idle'; hero.swingEnd = G.t; }
}
function wrathLand() {
  G.pierce = true; G.elem = 'heavy';
  for (const e of enemies) {
    if (!alive(e)) continue;
    const d = Math.hypot(e.fi - hero.fi, e.fj - hero.fj); if (d > WRATH_R + (e.def.unique ? 0.5 : 0)) continue;
    wake(e); const c = Math.random() < CRIT_CHANCE + (STAT.crit || 0) / 100, k = 6 * (1 - d / (WRATH_R * 2.2));   // hardest near the middle
    damageEnemy(e, heroDmg((c ? 2 : 1) * k), hero.fi, hero.fj, c, 2);
    if (!alive(e)) continue;
    if (e.def.unique) e.stun = Math.max(e.stun || 0, 1.2);
    else { e.downT = e.downT0 = 1.6; e.atk = -1; e.stun = 0; e.windT = 0; const l = d || 1; e.kb = [(e.fi - hero.fi) / l * 6, (e.fj - hero.fj) / l * 6]; }
  }
  G.pierce = false; G.elem = null;
  for (const p of dynProps) if (!p.broken && (p.kind === 'barrel' || p.kind === 'egg') && Math.hypot(p.i + 0.5 - hero.fi, p.j + 0.5 - hero.fj) < WRATH_R) hitProp(p);
  const q = { fi: hero.fi, fj: hero.fj, a0: 0, ring: true, R: WRATH_R * 0.9, n: 16, t: 1.6, t0: 1.6, seed: (Math.random() * 1e6) | 0 };
  G.quakes.push(q); stampCracks(q);
  const lite = LV.outdoor ? [DIRT[4], DIRT[3]] : [TH().ramp[TH().ramp.length - 1], TH().ramp[5]];
  shockwave(hero.fi, hero.fj, WRATH_R, 0.5, lite, null, false); shockwave(hero.fi, hero.fj, WRATH_R * 0.6, 0.3, [27, 51]);
  impactFlash(hero.fi, hero.fj, 4, 14);
  G.flashes.push({ fi: hero.fi, fj: hero.fj, t: 0.4, t0: 0.4, r: 160 });
  const [x, y] = screenOf(hero); rubble(x, y, 46, 130);
  for (let k = 0; k < 48; k++) { const a = k / 48 * 6.283; pspawn(5, x, y, 1, Math.cos(a) * 120, Math.sin(a) * 60, 30 + Math.random() * 40, 1, k % 3 ? (LV.outdoor ? DIRT[3] : S[5]) : DIRT[4]); }
  // rocks rain down over the area for the next second and a half
  for (let k = 0; k < 16; k++) {
    let p = null;
    for (let tr = 0; tr < 8 && !p; tr++) { const a = Math.random() * 6.283, d = 1.2 + Math.sqrt(Math.random()) * (WRATH_R - 0.8), c = [hero.fi + Math.cos(a) * d, hero.fj + Math.sin(a) * d]; if (!blocked(c[0], c[1])) p = c; }
    if (p) { const t0 = 0.35 + k * 0.08 + Math.random() * 0.1; G.rocks.push({ fi: p[0], fj: p[1], t: t0, t0, fall: 0.35, s: 0.7 + Math.random() * 0.5 }); }
  }
  if (SHAKE) G.trauma = 1;
  hero.stop = Math.max(hero.stop, 0.12);
  sfx('boom'); sfx('crit'); sfx('crack'); sfx('kill');
}
function updateRocks(dt) {
  for (const r of G.rocks) {
    r.t -= dt; if (r.t > 0 || r.done) continue;
    r.done = true;
    G.pierce = true; G.elem = 'heavy';
    for (const e of enemies) if (alive(e) && Math.hypot(e.fi - r.fi, e.fj - r.fj) < 1 + (e.def.unique ? 0.4 : 0)) { const c = Math.random() < CRIT_CHANCE + (STAT.crit || 0) / 100; damageEnemy(e, heroDmg((c ? 2 : 1) * 1.6 * r.s), r.fi, r.fj, c, 1, true); }
    G.pierce = false; G.elem = null;
    const [x, y] = iso(r.fi, r.fj); rubble(x, y, 8, 60);
    const lite = LV.outdoor ? [DIRT[4], DIRT[3]] : [TH().ramp[TH().ramp.length - 1], TH().ramp[5]];
    shockwave(r.fi, r.fj, 1.1, 0.25, lite, null, false); impactFlash(r.fi, r.fj, 2, 4);
    const q = { fi: r.fi, fj: r.fj, a0: 0, ring: true, R: 0.9, n: 5, t: 0.5, t0: 0.5, seed: (Math.random() * 1e6) | 0 }; stampCracks(q);
    if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.15);
    sfx('crack'); if (Math.random() < 0.5) sfx('boom');
  }
  G.rocks = G.rocks.filter(r => !r.done);
}
// a falling rock: a shadow on the ground that grows, and a lumpy boulder coming down onto it (world layer)
function drawRocks() {
  for (const r of G.rocks) {
    const [cx0, cy0] = iso(r.fi, r.fj), cx = Math.round(cx0 - camX), cy = Math.round(cy0 - camY);
    const near = 1 - Math.max(0, r.t) / r.t0, sr = Math.round(4 + near * 8 * r.s);
    for (let y = -sr; y <= sr; y++) for (let x = -sr * 2; x <= sr * 2; x++) { if ((x / 2) ** 2 + y * y > sr * sr) continue; const X = cx + x, Y = cy + Math.round(y / 2); if (X < 0 || Y < 0 || X >= W || Y >= H || cid[Y * W + X]) continue; if (BAYER[((Y & 3) << 2) | (X & 3)] < 0.5 + near * 0.3) scr[Y * W + X] = BLK; }
    if (r.t > r.fall) continue;
    const k = Math.max(0, r.t) / r.fall, R = Math.round(7 * r.s + 2), rx0 = cx - Math.round(k * 20), ry0 = cy - Math.round(k * 170) - R;
    const ramp = LV.outdoor ? [DIRT[0], DIRT[1], DIRT[2], DIRT[3]] : [S[1], S[3], S[5], S[7]];
    for (let b = -R; b <= R; b++) for (let a = -R; a <= R; a++) {
      const d = Math.hypot(a, b) / R + (hash(a, b, r.s * 99 | 0) - 0.5) * 0.25; if (d > 1) continue;
      const X = rx0 + a, Y = ry0 + b; if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
      const lit = (-a - b) / R;   // upper left light
      scr[Y * W + X] = d > 0.88 ? BLK : ramp[Math.max(0, Math.min(3, Math.floor(1.6 + lit * 1.6)))];
    }
  }
}
// Arcane Storm: for four seconds, bolts of arcane lightning strike every enemy on screen in turn.
// The mage can keep moving (slower) while it rages but casts nothing else
function startStorm() {
  hero.ultOn = { kind: 'storm', t: 0, next: 0, n: 0 };
  hero.cast = -1; hero.castFn = null;
  say('ARCANE STORM!', 40, 1.6); sfx('meteor'); sfx('whoomp');
  G.flashes.push({ fi: hero.fi, fj: hero.fj, t: 0.3, t0: 0.3, r: 120 });
}
const STORM_T = 4;
function updateStorm(dt) {
  const U = hero.ultOn; U.t += dt; U.next -= dt;
  if (Math.random() < 0.6) { const [x, y] = screenOf(hero), a = Math.random() * 6.283; pspawn(3, x + Math.cos(a) * 14, y + Math.sin(a) * 6, 10 + Math.random() * 30, 0, 0, 20, 0.4, Math.random() < 0.5 ? 40 : 39); }   // power crackling round the mage
  if (U.next <= 0 && U.t < STORM_T) {
    U.next = 0.11;
    const foes = enemies.filter(e => alive(e) && LV.vis[tIdx(Math.floor(e.fi), Math.floor(e.fj))] >= 0.3 && Math.hypot(e.fi - hero.fi, e.fj - hero.fj) < 9);
    if (foes.length) {
      // the least-struck first, so the storm spreads over everything on screen
      foes.sort((a, b) => (a.stormN || 0) - (b.stormN || 0) || Math.random() - 0.5);
      const e = foes[0]; e.stormN = (e.stormN || 0) + 1; U.n++;
      const c = spellCrit(); G.elem = 'arcane'; G.pierce = true; damageEnemy(e, spellDmg(c ? 2.8 : 1.4), e.fi - 0.1, e.fj - 0.1, c, 0, true); G.elem = null; G.pierce = false;
      G.strikes.push({ fi: e.fi, fj: e.fj, z: e.def.chest * 0.5, t: 0.16, t0: 0.16, seed: (Math.random() * 1e6) | 0 });
      impactFlash(e.fi, e.fj, e.def.chest * 0.5, 5); shockwave(e.fi, e.fj, 0.9, 0.2, [27, 40]);
      const [x, y] = iso(e.fi, e.fj); for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283; pspawn(4, x, y, 4, Math.cos(a) * 50, Math.sin(a) * 25, 10, 0.2, k % 2 ? 40 : 27); }
      G.flashes.push({ fi: e.fi, fj: e.fj, t: 0.1, t0: 0.1, r: 70 });
      if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.08);
      sfx('zap'); if (U.n % 3 === 0) sfx('boom');
    } else if (Math.random() < 0.3) {   // nothing to hit: bolts fall around her anyway
      const a = Math.random() * 6.283, d = 2 + Math.random() * 3, p = [hero.fi + Math.cos(a) * d, hero.fj + Math.sin(a) * d];
      G.strikes.push({ fi: p[0], fj: p[1], z: 0, t: 0.16, t0: 0.16, seed: (Math.random() * 1e6) | 0 }); sfx('zap');
    }
  }
  if (!FEEL_OLD) hero.leapZ = U.t < STORM_T - 0.3 ? Math.min(1, U.t / 0.3) * (4 + Math.sin(U.t * 5) * 1.2) : Math.max(0, (STORM_T - U.t) / 0.3) * 4;   // round 43: lifted off the ground while it rages
  if (U.t >= STORM_T) { hero.ultOn = null; hero.leapZ = 0; for (const e of enemies) e.stormN = 0; }
}
function updateUlt(dt) {
  for (const s of G.strikes) s.t -= dt; G.strikes = G.strikes.filter(s => s.t > 0);
  updateRocks(dt); updateRanger(dt);
  if (hero.ultOn && hero.ultOn.kind === 'storm') updateStorm(dt);
}
// detail layer: lightning from the top of the screen down to the struck spot, jagged, white core
function drawStrikes() {   // round 65c: the storm's bolts are Chain Lightning's: thick from the sky, a burst where they land
  for (const s of G.strikes) {
    const [x, y] = iso(s.fi, s.fj), X1 = Math.round(x * SPX - cam2x), Y1 = Math.round((y - s.z) * SPX - cam2y), life = s.t / s.t0, R = rng(s.seed);
    if (life < 0.35 && Math.floor(G.t * 30) % 2) continue;
    boltLine([X1 + Math.round((R() - 0.5) * 60), -10], [X1, Y1], s.seed, life > 0.5 ? 3 : 2, life);
    if (life > 0.5) for (let b = -6; b <= 6; b++) for (let a = -10; a <= 10; a++) { const d = Math.hypot(a / 10, b / 6); if (d <= 1) ovSet(X1 + a, Y1 + b, d < 0.4 ? 27 : d < 0.7 ? 32 : 40); }
  }
}
// the button's glyphs: a mountain peak with a crack of light, a swirl of arcane bolts
const glyphWrath = (cx, cy) => {
  for (let y = 0; y <= 9; y++) { const hw = y * 0.95; for (let x = -hw; x <= hw; x++) put(cx + x, cy - 4 + y, x < -hw * 0.2 ? S[6] : S[3]); }
  for (let x = -2; x <= 2; x++) put(cx + x, cy - 3 + Math.abs(x), 27);   // snow cap
  line(cx + 1, cy - 1, cx - 1, cy + 2, 51); line(cx - 1, cy + 2, cx + 2, cy + 5, 51);   // the crack of light
  for (const [a, b] of [[-7, -7], [6, -8], [-3, -9]]) fillRect(cx + a, cy + b, 2, 2, S[5]);   // rocks in the air
};
const glyphStorm = (cx, cy) => {
  for (let a = 0; a < 30; a++) { const t = a / 30 * 6.283, r = 7; put(cx + Math.cos(t) * r, cy - 3 + Math.sin(t) * r * 0.35, 39); }   // the cloud's ring
  for (const ox of [-4, 1, 5]) { line(cx + ox, cy - 2, cx + ox - 2, cy + 3, 40); line(cx + ox - 2, cy + 3, cx + ox + 1, cy + 3, 40); line(cx + ox + 1, cy + 3, cx + ox - 1, cy + 8, 27); }
};

// ---------------------------------------------------------------- the ranger (round 33)
// The attack looses one quick arrow at the nearest foe in sight (held to keep firing). Skills:
// Multishot (a fan), Snare Trap (thrown at a foe's feet; snaps shut and roots), Evasive Leap (a hop
// back away from danger, loosing arrows on landing), Hunter's Mark (the toughest foe in sight takes
// more damage and shows through walls). Ultimate: Rain of Arrows.
const ARROW_SP = 13, ARROW_RANGE = 9;
function rangerTarget(range = ARROW_RANGE) {
  // the marked foe first, if it can be shot; else the nearest in sight
  const m = enemies.find(e => alive(e) && e.markT > 0 && Math.hypot(e.fi - hero.fi, e.fj - hero.fj) < range && los(hero.fi, hero.fj, e.fi, e.fj));
  return m || nearestEnemy(range, true);
}
function rangerShoot() {
  if (heroBusy()) { hero.buf = G.t + 0.3; return; }
  hero.buf = 0;
  const t = rangerTarget(); hero.shotAt = t;
  if (t) hero.dir = dirFrom(t.fi - hero.fi, t.fj - hero.fj);
  hero.combo = 0; hero.atk = 0; hero.hitDone = false; hero.approach = null; hero.mag = 0;
}
// where an arrow leaves: in front of the bow, at chest height
function bowTip() { const [fx, fy] = dirVec(hero.dir); return [hero.fi + fx * 0.5 - fy * 0.15, hero.fj + fy * 0.5 + fx * 0.15]; }
function shootArrow(a, o = {}) {
  const [ox, oy] = bowTip(), sp = o.sp || ARROW_SP;
  projectiles.push(Object.assign({ kind: 'arrow', fi: ox, fj: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, z: 20, life: ARROW_RANGE / sp, owner: 'hero', spell: true, dmgK: 1, age: 0, elem: null }, o));
}
// the angle from the bow to a target (or straight ahead)
function aimAngle(t) {
  if (!t) { const [fx, fy] = dirVec(hero.dir); return Math.atan2(fy, fx); }
  const [ox, oy] = bowTip(); return Math.atan2(t.fj - oy, t.fi - ox);
}
function looseArrow() {
  const t = hero.shotAt && alive(hero.shotAt) ? hero.shotAt : rangerTarget();
  if (t) hero.dir = dirFrom(t.fi - hero.fi, t.fj - hero.fj);
  if (hero.quick > 0) {   // round 66b: Quickdraw (after a Vault): two arrows, both sure to crit
    hero.quick--; const a = aimAngle(t);
    for (const da of [-0.06, 0.06]) shootArrow(a + da, { dmgK: 1.05, basic: true, crit: true, quick: true });
    sfx('twang'); sfx('swing');
    return;
  }
  shootArrow(aimAngle(t), { dmgK: 1.05, basic: true });   // (round 66: a basic shot that hits fills a combo point)
  sfx('twang');
}
// ---------------------------------------------------------------- the ranger's kit (round 66)
// Diablo 4's rogue: the basic shot builds COMBO POINTS (hero.pips, up to 3, one per basic arrow that
// hits); Piercing Shot and Cluster Arrow spend them all and grow with each. Sentry and Hawk are pets
// whose damage is all extra. Every skill out-damages the basic shot over the time it takes (checked
// in tools/playtests/ranger66).
const spendPips = () => { const n = hero.pips || 0; hero.pips = 0; return n; };
const rangerRelease = () => { hero.combo = 0; hero.atk = 70; hero.hitDone = true; hero.approach = null; };
// Piercing Shot: one heavy bolt through every foe in a line, knocking them back. 1.6 x the staff
// damage at no combo points, +1.9 a point (at three: a ballista bolt, 7.3 x, that tears the floor along its way)
function piercingShot() {
  const mod = skillMod('pierce'), t = rangerTarget(), a0 = aimAngle(t), n = spendPips(), k = (1.6 + n * 1.9) * (mod === 'twin' ? 0.7 : 1);
  if (t) hero.dir = dirFrom(t.fi - hero.fi, t.fj - hero.fj);
  const frozen = mod === 'frost' && n >= 3;
  const onHit = (e, p) => {
    if (!alive(e)) return;
    if (mod === 'frost') { if (frozen) freezeFoe(e, 2.2); else e.slowT = Math.max(e.slowT || 0, 2.5); }
    const [x, y] = screenOf(e); for (let q = 0; q < 8 + n * 3; q++) { const a = Math.atan2(p.vy, p.vx) + (Math.random() - 0.5) * 1.2; pspawn(2, x, y, e.def.chest * 0.6, (Math.cos(a) - Math.sin(a)) * 70, (Math.cos(a) + Math.sin(a)) * 35, Math.random() * 30, 0.18, q % 2 ? 51 : 27); }
  };
  const off = mod === 'twin' ? [-0.28, 0.28] : [0];
  for (const o of off) {
    const [ox, oy] = bowTip(), px = -Math.sin(a0) * o, py = Math.cos(a0) * o, sp = 19;
    projectiles.push({ kind: 'arrow', fi: ox + px, fj: oy + py, vx: Math.cos(a0) * sp, vy: Math.sin(a0) * sp, z: 20, life: 11 / sp, owner: 'hero', spell: true, dmgK: k, age: 0, elem: mod === 'fire' ? 'fire' : mod === 'frost' ? 'cold' : n >= 3 ? 'heavy' : null, pierce: true, hits: new Set(), pow: n >= 2 ? 2 : 1, bolt: 1 + n, fire: mod === 'fire', frost: mod === 'frost', onHit });
  }
  rangerRelease(); hero.volleyT = 0.3; impactFlash(...bowTip(), 20, 4 + n);
  if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.08 + n * 0.08); if (HEAVY) camKick(-Math.cos(a0), -Math.sin(a0), 1 + n);   // (the bow kicks back)
  sfx('twang'); sfx('heavySwing'); if (n >= 3) sfx('boom');
  return true;
}
// Cluster Arrow: lobbed to the target (or the ground ahead); bursts (1.6 tiles, 2.4 x) and throws out
// three bomblets, two more per combo point, that bounce once and pop (1 tile, 1.1 x each)
function clusterArrow() {
  const mod = skillMod('cluster'), t = rangerTarget(8), n = spendPips();
  const [fx, fy] = dirVec(hero.dir), at = t ? [t.fi, t.fj] : [hero.fi + fx * 4, hero.fj + fy * 4];
  if (t) hero.dir = dirFrom(t.fi - hero.fi, t.fj - hero.fj);
  const [ox, oy] = bowTip(), d = Math.hypot(at[0] - ox, at[1] - oy);
  if (!G.clusters) G.clusters = [];
  G.clusters.push({ a: [ox, oy], b: at, t: 0, dur: 0.3 + d * 0.035, h: 30 + d * 4, n: mod === 'big' ? 0 : 3 + n * 2, mod, pips: n });
  rangerRelease(); hero.tossT = 0.34; sfx('twang');
  return true;
}
function clusterBurst(C) {
  const [fi, fj] = C.b, cold = C.mod === 'frost', big = C.mod === 'big';
  explodeAt(fi, fj, big ? 2.6 : 1.6, big ? 4.2 + C.pips * 0.8 : 2.4, 1, big, false);
  if (C.mod === 'fire') G.fireGround.push({ fi, fj, r: 1.6, t: 3, tick: 0.3 });
  stampCrater(fi, fj, big ? 1.1 : 0.7);
  if (!G.bomblets) G.bomblets = [];
  for (let k = 0; k < C.n; k++) { const a = k / C.n * 6.283 + Math.random() * 0.5, s = 2.6 + Math.random() * 1.6; G.bomblets.push({ fi, fj, vi: Math.cos(a) * s, vj: Math.sin(a) * s, z: 6, vz: 70 + Math.random() * 40, bounce: 1, fuse: 0.45 + Math.random() * 0.3, cold, fire: C.mod === 'fire' }); }
  if (SHAKE) G.trauma = Math.min(1, G.trauma + (big ? 0.4 : 0.22));
}
function updateClusters(dt) {
  if (G.clusters) { for (const C of G.clusters) { C.t += dt; if (C.t >= C.dur && !C.done) { C.done = true; clusterBurst(C); } else if (!C.done && Math.random() < 0.8) { const u = C.t / C.dur, [x, y] = iso(C.a[0] + (C.b[0] - C.a[0]) * u, C.a[1] + (C.b[1] - C.a[1]) * u); pspawn(3, x, y, 20 + Math.sin(u * Math.PI) * C.h, 0, 0, 4, 0.3, Math.random() < 0.5 ? 17 : 4); } } G.clusters = G.clusters.filter(C => !C.done); }
  if (G.bomblets) {
    for (const b of G.bomblets) {
      b.fuse -= dt; b.vz -= 420 * dt; b.z += b.vz * dt;
      const ni = b.fi + b.vi * dt, nj = b.fj + b.vj * dt; if (!blocked(ni, nj)) { b.fi = ni; b.fj = nj; } else { b.vi *= -0.5; b.vj *= -0.5; }
      if (b.z <= 0) { b.z = 0; if (b.bounce-- > 0) { b.vz = 45; b.vi *= 0.6; b.vj *= 0.6; } else { b.vz = 0; b.vi = b.vj = 0; } }
      if (b.fuse <= 0 && !b.done) { b.done = true; explodeAt(b.fi, b.fj, 1.0, 1.1, 0, false, b.cold); if (b.fire) G.fireGround.push({ fi: b.fi, fj: b.fj, r: 0.9, t: 2.5, tick: 0.3 }); sfx('boom', 0.5); }
    }
    G.bomblets = G.bomblets.filter(b => !b.done);
  }
}
// Sentry: a crossbow on a tripod, planted in front of you for 12 s; it shoots the nearest foe it can
// see (8 tiles) every 0.5 s (0.65 x). Ballista: every 1.1 s, heavy bolts through (1.6 x). Two
// Sentries: a pair, each every 0.65 s. Up to two out at once (the oldest goes).
function placeSentry() {
  const mod = skillMod('sentry'), [fx, fy] = dirVec(hero.dir);
  if (!G.sentries) G.sentries = [];
  const spots = mod === 'twin' ? [[-fy * 1.2 + fx * 0.8, fx * 1.2 + fy * 0.8], [fy * 1.2 + fx * 0.8, -fx * 1.2 + fy * 0.8]] : [[fx * 1.1, fy * 1.1]];
  for (const [dx, dy] of spots) {
    let p = [hero.fi + dx, hero.fj + dy]; if (blocked(p[0], p[1])) p = [hero.fi, hero.fj];
    G.sentries.push({ fi: p[0], fj: p[1], t: 12, t0: 12, next: 0.4, mod, ang: Math.atan2(fy, fx), rise: 0, kick: 0 });
    const [x, y] = iso(p[0], p[1]); for (let q = 0; q < 10; q++) { const a = q / 10 * 6.283; pspawn(5, x, y, 1, Math.cos(a) * 35, Math.sin(a) * 18, 10, 1, LV.outdoor ? DIRT[3] : S[5]); }
  }
  while (G.sentries.length > (mod === 'twin' ? 2 : 2)) G.sentries.shift();
  rangerRelease(); hero.tossT = 0.34; sfx('clank'); sfx('chest');
}
function updateSentries(dt) {
  if (!G.sentries) return;
  for (const s of G.sentries) {
    s.t -= dt; s.rise = Math.min(1, s.rise + dt * 5); s.kick = Math.max(0, s.kick - dt * 6); s.next -= dt;
    let best = null, bd = 8;
    for (const e of enemies) { if (!alive(e) || LV.vis[tIdx(Math.floor(e.fi), Math.floor(e.fj))] < 0.3) continue; const d = Math.hypot(e.fi - s.fi, e.fj - s.fj); if (d < bd && los(s.fi, s.fj, e.fi, e.fj)) { bd = d; best = e; } }
    if (!best) continue;
    const want = Math.atan2(best.fj - s.fj, best.fi - s.fi); let da = Math.atan2(Math.sin(want - s.ang), Math.cos(want - s.ang)); s.ang += Math.sign(da) * Math.min(Math.abs(da), dt * 9);
    if (s.next <= 0 && Math.abs(da) < 0.3) {
      const heavy = s.mod === 'ballista', sp = heavy ? 17 : 14;
      s.next = heavy ? 1.1 : s.mod === 'twin' ? 0.65 : 0.5; s.kick = 1;
      projectiles.push({ kind: 'arrow', fi: s.fi + Math.cos(s.ang) * 0.35, fj: s.fj + Math.sin(s.ang) * 0.35, vx: Math.cos(s.ang) * sp, vy: Math.sin(s.ang) * sp, z: 16, life: 9 / sp, owner: 'hero', spell: true, dmgK: heavy ? 1.6 : 0.65, age: 0, elem: s.mod === 'fire' ? 'fire' : null, fire: s.mod === 'fire', pierce: heavy, hits: heavy ? new Set() : null, bolt: heavy ? 2 : 0 });
      sfx('twang', 0.5);
    }
  }
  G.sentries = G.sentries.filter(s => s.t > 0);
}
// Hawk: circles you for 30 s and dives at whatever you last shot (or the nearest foe in 7 tiles) every
// 1.4 s: 1.0 x, and the foe is MARKED for 4 s (25% more damage from everything; the red reticle).
// Mated Pair: two. Iron Talons: x2. Screech: each dive stuns 0.6 s.
function callHawk() {
  const mod = skillMod('hawk');
  hero.hawks = [];
  for (let k = 0; k < (mod === 'pair' ? 2 : 1); k++) hero.hawks.push({ t: 30, ang: k * Math.PI, next: 0.6 + k * 0.7, dive: null, fi: hero.fi, fj: hero.fj, z: 46, mod, flap: Math.random() * 6 });
  sfx('cry'); sfx('swing');
  rangerRelease(); hero.tossT = 0.3;
}
function updateHawks(dt) {
  if (!hero.hawks || !hero.hawks.length) return;
  for (const h of hero.hawks) {
    h.t -= dt; h.flap += dt * (h.dive ? 30 : 14); h.next -= dt;
    if (h.dive) {
      const D = h.dive, e = D.e; D.u += dt / (D.back ? 0.35 : 0.22);
      if (!D.back) {
        const tz = e.def.chest * 0.7; h.fi = D.from[0] + (e.fi - D.from[0]) * D.u; h.fj = D.from[1] + (e.fj - D.from[1]) * D.u; h.z = D.from[2] + (tz - D.from[2]) * D.u * D.u;
        if (D.u >= 1) {
          if (alive(e)) {
            const c = spellCrit(); G.pierce = true; damageEnemy(e, spellDmg((c ? 2 : 1) * (h.mod === 'talons' ? 2 : 1)), h.fi - 0.3, h.fj - 0.3, c, 0, true); G.pierce = false;
            if (alive(e)) { e.markT = Math.max(e.markT || 0, 4); e.markK = 1.25; if (h.mod === 'screech' && !e.def.unique) e.stun = Math.max(e.stun || 0, 0.6); }
            const [x, y] = screenOf(e); for (let q = 0; q < 8; q++) { const a = Math.random() * 6.283; pspawn(4, x, y, tz, Math.cos(a) * 50, Math.sin(a) * 25, 20, 0.2, q % 2 ? 26 : 23); }
            impactFlash(e.fi, e.fj, tz, 4); sfx('thunk'); if (h.mod === 'screech') sfx('cry', 0.4);
          }
          D.back = true; D.u = 0; D.from = [h.fi, h.fj, h.z];
        }
      } else {
        const ox = hero.fi + Math.cos(h.ang) * 1.5, oy = hero.fj + Math.sin(h.ang) * 1.5; h.fi = D.from[0] + (ox - D.from[0]) * D.u; h.fj = D.from[1] + (oy - D.from[1]) * D.u; h.z = D.from[2] + (46 - D.from[2]) * Math.sqrt(Math.min(1, D.u));
        if (D.u >= 1) h.dive = null;
      }
      continue;
    }
    h.ang += dt * 1.8; const tx = hero.fi + Math.cos(h.ang) * 1.5, ty = hero.fj + Math.sin(h.ang) * 1.5; h.fi += (tx - h.fi) * Math.min(1, dt * 6); h.fj += (ty - h.fj) * Math.min(1, dt * 6); h.z += (46 + Math.sin(G.t * 2 + h.ang) * 4 - h.z) * Math.min(1, dt * 4);
    if (h.next <= 0) {
      const t = hero.shotAt && alive(hero.shotAt) && Math.hypot(hero.shotAt.fi - hero.fi, hero.shotAt.fj - hero.fj) < 9 ? hero.shotAt : nearestEnemy(7, true);
      if (t) { h.dive = { e: t, u: 0, from: [h.fi, h.fj, h.z] }; h.next = 1.4; sfx('swing', 0.5); } else h.next = 0.3;
    }
  }
  hero.hawks = hero.hawks.filter(h => h.t > 0);
}
// Vault (round 66b, replaces the Hawk; the user: a vault that drops a trap at your feet): a flip back,
// away from the nearest foe (or along the stick); a snare snaps open where you stood, armed at once, so
// whatever follows runs into it; on landing, QUICKDRAW: the next 3 shots (5 with Long Vault) loose two
// arrows each and always crit. Spike Trap: the trap springs a heavy spike. Smoke Bomb: dazing smoke.
function vault() {
  const mod = skillMod('vault'), dist0 = mod === 'long' ? 5.5 : 3.2;
  let dx, dy;
  if (Math.hypot(input.mx, input.my) > 0.2) [dx, dy] = stickToGround(input.mx, input.my);
  else { const t = nearestEnemy(6); if (t) { const l = Math.hypot(hero.fi - t.fi, hero.fj - t.fj) || 1; dx = (hero.fi - t.fi) / l; dy = (hero.fj - t.fj) / l; } else { const [fx, fy] = dirVec(hero.dir); dx = -fx; dy = -fy; } }
  let dist = 0;
  for (let s = 0.25; s <= dist0; s += 0.25) { if (blocked(hero.fi + dx * s, hero.fj + dy * s)) break; if (standable(hero.fi + dx * s, hero.fj + dy * s)) dist = s; }
  if (dist < 0.75) return false;
  G.traps.push({ fi: hero.fi, fj: hero.fj, from: [hero.fi, hero.fj], fly: 0, arm: 0.15, life: 12, mod: mod === 'spike' ? 'spike' : null, r: 1.6, small: false });
  while (G.traps.length > 6) G.traps.shift();
  if (mod === 'smoke') { G.smoke.push({ fi: hero.fi, fj: hero.fj, t: 3, t0: 3, r: 2 }); for (const e of enemies) if (alive(e) && Math.hypot(e.fi - hero.fi, e.fj - hero.fj) < 2.2 && !e.def.unique) e.stun = Math.max(e.stun || 0, 1.2); }
  { const [x, y] = screenOf(hero); for (let q = 0; q < 12; q++) { const a = q / 12 * 6.283; pspawn(5, x, y, 1, Math.cos(a) * 45, Math.sin(a) * 22, 14, 1, LV.outdoor ? DIRT[3] : S[5]); } }
  hero.roll = { from: [hero.fi, hero.fj], to: [hero.fi + dx * dist, hero.fj + dy * dist], t: 0, dur: 0.26 + dist * 0.03, mod, vault: true };
  hero.atk = -1; hero.cast = -1; hero.approach = null;
  sfx('swing'); sfx('clank');
  return true;
}
function updateRangerKit(dt) {
  updateClusters(dt); updateSentries(dt); updateHawks(dt);
  for (const p of projectiles) if (p.bolt >= 4 && p.life > 0 && Math.random() < 0.8 && G.dust) {   // the ballista bolt tears up the floor as it goes
    G.dust.push({ fi: p.fi, fj: p.fj, vi: -p.vx * 0.05 + (Math.random() - 0.5), vj: -p.vy * 0.05 + (Math.random() - 0.5), r: 3, vr: 14, t: 0.6, t0: 0.6, z: 1 });
    if (Math.random() < 0.3) { const [x, y] = iso(p.fi, p.fj); rubble(x, y, 2, 40); }
  }
}
// detail layer: the lobbed cluster arrow, the bomblets, the sentries, the hawks
function drawRangerKit() {
  const P = (fi, fj, z) => { const [x, y] = iso(fi, fj); return [Math.round(x * SPX - cam2x), Math.round((y - z) * SPX - cam2y)]; };
  const lit = (X, Y, v) => { if (X < 0 || Y < 0 || X >= OW || Y >= OH) return; const c = envCol((X + hx) >> 1, (Y + hy) >> 1, v, -2); ov32[Y * OW + X] = c || PAL32[v]; };
  if (G.clusters) for (const C of G.clusters) {   // a fat arrow with a glowing bundle on its head, arcing
    const u = Math.min(1, C.t / C.dur), fi = C.a[0] + (C.b[0] - C.a[0]) * u, fj = C.a[1] + (C.b[1] - C.a[1]) * u, z = 20 + Math.sin(u * Math.PI) * C.h;
    const [X, Y] = P(fi, fj, z); for (let b = -3; b <= 3; b++) for (let a = -3; a <= 3; a++) if (a * a + b * b <= 9) ovSet(X + a, Y + b, a * a + b * b <= 2 ? 27 : (Math.floor(G.t * 20) % 2 ? 17 : 16));
    const [X2, Y2] = P(fi - (C.b[0] - C.a[0]) * 0.05, fj - (C.b[1] - C.a[1]) * 0.05, z - Math.cos(u * Math.PI) * C.h * 0.1); for (let s = 0; s <= 10; s++) ovSet(Math.round(X + (X2 - X) * s / 10 * 2), Math.round(Y + (Y2 - Y) * s / 10 * 2), s > 7 ? 27 : WOOD[3]);
  }
  if (G.bomblets) for (const b of G.bomblets) { const [X, Y] = P(b.fi, b.fj, b.z + 3), blink = Math.floor(G.t * (b.fuse < 0.2 ? 30 : 12)) % 2; for (let q = -2; q <= 2; q++) for (let r = -2; r <= 2; r++) if (q * q + r * r <= 5) ovSet(X + q, Y + r, Math.abs(q) + Math.abs(r) > 2 ? BLK : blink ? (b.cold ? 118 : 17) : (b.cold ? 116 : 15)); }
  if (G.sentries) for (const s of G.sentries) {   // a tripod, a crossbow on top that turns and kicks when it shoots
    const [X, Y] = P(s.fi, s.fj, 0), h = Math.round(40 * s.rise), fade = s.t < 0.6 && Math.floor(G.t * 20) % 2;   // (sizes in detail pixels: twice a game pixel)
    if (fade) continue;
    for (const [lx, ly] of [[-16, 6], [16, 6], [0, 12]]) for (let k = 0; k <= h; k++) { const u = k / (h || 1), x = Math.round(X + lx * (1 - u)), y = Math.round(Y + ly * (1 - u) - k); lit(x - 1, y, BLK); lit(x, y, WOOD[k % 6 === 0 ? 1 : 3]); lit(x + 1, y, WOOD[2]); lit(x + 2, y, BLK); }
    for (let a = -6; a <= 6; a++) for (let b = -3; b <= 3; b++) if (a * a / 36 + b * b / 9 <= 1) lit(X + a, Y - h + b, b < 0 ? STEEL[3] : STEEL[1]);   // the swivel
    const cx = X, cy = Y - h - 2, ux = Math.cos(s.ang) - Math.sin(s.ang), uy = (Math.cos(s.ang) + Math.sin(s.ang)) * 0.5, ul = Math.hypot(ux, uy) || 1, dx = ux / ul, dy = uy / ul, kb = s.kick * 5;
    for (let k = -18; k <= 22; k++) { const x = Math.round(cx + dx * (k - kb)), y = Math.round(cy + dy * (k - kb)); lit(x, y - 2, BLK); lit(x, y - 1, k > 17 ? STEEL[4] : WOOD[4]); lit(x, y, k > 17 ? STEEL[3] : WOOD[3]); lit(x, y + 1, WOOD[1]); lit(x, y + 2, BLK); }   // the stock
    for (let k = -16; k <= 16; k++) { const x = Math.round(cx + dx * (14 - kb) - dy * k), y = Math.round(cy + dy * (14 - kb) + dx * k * 0.5 + Math.abs(k) * 0.35); lit(x, y - 1, BLK); lit(x, y, STEEL[4]); lit(x, y + 1, STEEL[2]); lit(x, y + 2, BLK); }   // the prod (the bow arms)
    for (const sd of [-16, 16]) { const x0 = Math.round(cx + dx * (14 - kb) - dy * sd), y0 = Math.round(cy + dy * (14 - kb) + dx * sd * 0.5 + Math.abs(sd) * 0.35); const x1 = Math.round(cx + dx * (-4 - kb + s.kick * 8)), y1 = Math.round(cy + dy * (-4 - kb + s.kick * 8)); for (let q = 0; q <= 16; q++) lit(Math.round(x0 + (x1 - x0) * q / 16), Math.round(y0 + (y1 - y0) * q / 16), BONE[2]); }   // the string
    if (s.mod === 'fire') for (let q = 0; q < 3; q++) ovSet(Math.round(cx + dx * 24 + (Math.random() - 0.5) * 4), Math.round(cy + dy * 24 - Math.random() * 6), Math.floor(G.t * 15 + q) % 2 ? 17 : 16);
    { const life = s.t / s.t0; for (let k = 0; k < 20; k++) { if (k / 20 > life) break; ovSet(X - 10 + k, Y + 16, 54); } }   // how long it has left
  }
  if (hero.hawks) for (const h of hero.hawks) {   // a hawk: brown body, pale belly, wings beating (tucked in a dive)
    const [X, Y] = P(h.fi, h.fj, h.z), w = h.dive && !h.dive.back ? 0.2 : Math.sin(h.flap), span = 22, dir = h.dive ? Math.sign(h.dive.e.fi - h.dive.e.fj - (h.fi - h.fj)) || 1 : (Math.cos(h.ang + 1.57) - Math.sin(h.ang + 1.57) > 0 ? 1 : -1);
    for (let k = -span; k <= span; k++) { const u = Math.abs(k) / span, y = Math.round(Y - w * u * 13 + u * u * 4); for (let t = -1; t <= 2; t++) ovSet(X + k, y + t, t === -1 || t === 2 ? BLK : u > 0.72 ? (t ? WOOD[0] : WOOD[1]) : (t ? WOOD[1] : WOOD[3])); if (u > 0.7 && (k & 3) === 0) ovSet(X + k, y + 3, WOOD[0]); }   // the wings, feather tips at the ends
    for (let b = -5; b <= 5; b++) for (let a = -9; a <= 9; a++) { const q = (a / 9) ** 2 + (b / 4.5) ** 2; if (q <= 1) ovSet(X + a, Y + b, q > 0.75 ? BLK : b > 1 ? BONE[2] : b > -1 ? BONE[1] : WOOD[3]); }   // the body, pale belly
    for (let b = -3; b <= 3; b++) for (let a = -3; a <= 3; a++) if (a * a + b * b <= 9) ovSet(X + dir * 10 + a, Y - 3 + b, a * a + b * b > 6 ? BLK : WOOD[3]);   // the head
    for (const [a, b, c] of [[13, -3, 51], [14, -2, 51], [13, -2, 50], [11, -4, BLK], [9, -4, 27]]) ovSet(X + dir * a, Y + b, c);   // beak and eye
    for (let t = -4; t <= 4; t++) for (let l = 0; l < 6; l++) ovSet(X - dir * (9 + l), Y + t * 0.6 + 1, Math.abs(t) === 4 ? BLK : WOOD[l % 2 ? 1 : 2]);   // the tail fan
    if (!h.dive) { const [sx, sy] = P(h.fi, h.fj, 0); for (let a = -6; a <= 6; a++) if (((a + sx) & 1) === 0) ovSet(sx + a * 2, sy, BLK); }   // its shadow far below
  }
}
// an arrow biting: a spark of splinters, a thunk, a small push
function arrowBite(p, e) {
  const [x, y] = screenOf(e);
  for (let k = 0; k < 5; k++) { const a = Math.atan2(p.vy, p.vx) + (Math.random() - 0.5) * 1.6; pspawn(4, x, y, 14, Math.cos(a) * 40, Math.sin(a) * 20, 6, 0.14, k % 2 ? WOOD[3] : 27); }
  if (alive(e) && !e.def.unique) { const l = Math.hypot(p.vx, p.vy) || 1; e.kb = [e.kb[0] + p.vx / l * 1.6, e.kb[1] + p.vy / l * 1.6]; }
  if (p.fire) sfx('sizzle'); sfx('thunk');
}
// Multishot: a fan of five (Volley: nine, wider), Piercing Shots go through, Fire Arrows burn
function multishot() {
  const mod = skillMod('multi'), t = rangerTarget(), a0 = aimAngle(t);
  if (t) hero.dir = dirFrom(t.fi - hero.fi, t.fj - hero.fj);
  const n = mod === 'wide' ? 9 : 5, spread = mod === 'wide' ? 1.4 : 0.8, k = mod === 'wide' ? 0.5 : 0.65;
  for (let i = 0; i < n; i++) {
    const a = a0 + (i / (n - 1) - 0.5) * spread;
    shootArrow(a, { dmgK: k, pierce: mod === 'pierce', hits: mod === 'pierce' ? new Set() : null, fire: mod === 'fire', elem: mod === 'fire' ? 'fire' : null, sp: ARROW_SP * (0.95 + Math.random() * 0.1) });
  }
  hero.combo = 0; hero.atk = 70; hero.hitDone = true; hero.approach = null; hero.volleyT = 0.3;   // the release pose, already loosed (round 43: the canted volley)
  sfx('twang'); sfx('swing'); if (mod === 'fire') sfx('fireball');
}
// Snare Trap: thrown to a foe's feet (or ahead); arms in 0.4 s; the first foe to step in snaps it
function throwTrap() {
  const mod = skillMod('trap'), t = rangerTarget(7);
  const [fx, fy] = dirVec(hero.dir), at = t ? [t.fi, t.fj] : [hero.fi + fx * 2.5, hero.fj + fy * 2.5];
  if (t) hero.dir = dirFrom(t.fi - hero.fi, t.fj - hero.fj);
  const spots = mod === 'triple' ? [-0.55, 0, 0.55].map(da => { const a = Math.atan2(at[1] - hero.fj, at[0] - hero.fi) + da, d = Math.hypot(at[0] - hero.fi, at[1] - hero.fj); return [hero.fi + Math.cos(a) * d, hero.fj + Math.sin(a) * d]; }) : [at];
  let n = 0;
  for (const s of spots) {
    if (blocked(s[0], s[1])) continue;
    G.traps.push({ fi: s[0], fj: s[1], from: [hero.fi, hero.fj], fly: 0.25, arm: 0.4, life: 15, mod, r: mod === 'net' ? 2.6 : mod === 'triple' ? 1.1 : 1.6, small: mod === 'triple' });
    n++;
  }
  if (!n) return false;
  while (G.traps.length > 6) G.traps.shift();
  hero.combo = 0; hero.atk = 70; hero.hitDone = true; hero.tossT = 0.34; sfx('swing'); sfx('clank');   // round 43: thrown underhand (the toss pose)
  return true;
}
function snapTrap(tp) {
  tp.snapT = 0.5; tp.life = 0.5;
  const spike = tp.mod === 'spike';
  G.pierce = true; G.elem = spike ? 'heavy' : null;
  for (const e of enemies) {
    if (!alive(e) || Math.hypot(e.fi - tp.fi, e.fj - tp.fj) > tp.r + (e.def.unique ? 0.4 : 0)) continue;
    wake(e); const c = spellCrit();
    damageEnemy(e, spellDmg((c ? 2 : 1) * (spike ? 2.6 : tp.small ? 0.8 : 1.1)), tp.fi, tp.fj, c, spike ? 1 : 0, true);
    if (alive(e) && !spike) e.rootT = Math.max(e.rootT || 0, (e.def.unique ? 1.2 : 3) * (tp.mod === 'net' ? 1.4 : 1));
  }
  G.pierce = false; G.elem = null;
  const [x, y] = iso(tp.fi, tp.fj);
  for (let k = 0; k < 14; k++) { const a = k / 14 * 6.283; pspawn(4, x, y, 3, Math.cos(a) * 50, Math.sin(a) * 25, 10, 0.2, k % 2 ? STEEL[4] : 27); }
  if (!spike) shockwave(tp.fi, tp.fj, tp.r, 0.25, [55, 54]); else { rubble(x, y, 8, 50); impactFlash(tp.fi, tp.fj, 3, 5); }
  if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.15);
  sfx('clank'); sfx('crack');
}
// Evasive Leap: a hop back, away from the nearest foe (or along the stick), untouchable in the air;
// three arrows loosed at the nearest foe on landing
function startRoll() {
  const mod = skillMod('roll'), dist0 = mod === 'long' ? 5.5 : 3.2;
  let dx, dy;
  if (Math.hypot(input.mx, input.my) > 0.2) [dx, dy] = stickToGround(input.mx, input.my);
  else { const t = nearestEnemy(6); if (t) { const l = Math.hypot(hero.fi - t.fi, hero.fj - t.fj) || 1; dx = (hero.fi - t.fi) / l; dy = (hero.fj - t.fj) / l; } else { const [fx, fy] = dirVec(hero.dir); dx = -fx; dy = -fy; } }
  let dist = 0;
  for (let s = 0.25; s <= dist0; s += 0.25) { if (blocked(hero.fi + dx * s, hero.fj + dy * s)) break; if (standable(hero.fi + dx * s, hero.fj + dy * s)) dist = s; }
  if (dist < 0.75) return false;
  hero.roll = { from: [hero.fi, hero.fj], to: [hero.fi + dx * dist, hero.fj + dy * dist], t: 0, dur: 0.26 + dist * 0.03, mod };
  hero.atk = -1; hero.cast = -1; hero.approach = null;
  if (mod === 'smoke') { G.smoke.push({ fi: hero.fi, fj: hero.fj, t: 3, t0: 3, r: 2 }); for (const e of enemies) if (alive(e) && Math.hypot(e.fi - hero.fi, e.fj - hero.fj) < 2.2 && !e.def.unique) { e.stun = Math.max(e.stun || 0, 1.5); e.atk = -1; } sfx('whoomp'); }
  sfx('swing');
  return true;
}
function updateRoll(dt) {
  const R = hero.roll; R.t += dt;
  const u = Math.min(1, R.t / R.dur), e = u * (2 - u);
  hero.fi = R.from[0] + (R.to[0] - R.from[0]) * e; hero.fj = R.from[1] + (R.to[1] - R.from[1]) * e;
  hero.leapZ = Math.sin(u * Math.PI) * 14;
  if (!R.ghostT || G.t > R.ghostT) { R.ghostT = G.t + 0.045; const [gx, gy] = screenOf(hero); G.ghosts.push({ sp: getSprite('hero', hero.look, hero.dir, hero.clip, frameOf(hero), hero), x: gx, y: gy - hero.leapZ, t: 0.22, t0: 0.22, fl: 0 }); }   // round 65c: afterimages along the leap
  hero.clip = FEEL_OLD ? 'stop' : 'vault';   // round 43: crouch, tucked jump, landing (frameOf reads the leap's progress)
  if (Math.random() < 0.7) { const [x, y] = screenOf(hero); pspawn(5, x, y, 1, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 8, 6, 1, LV.outdoor ? DIRT[3] : S[5]); }
  if (u >= 1) {
    hero.roll = null; hero.leapZ = 0; hero.clip = 'idle'; unstickHero();
    const [x, y] = screenOf(hero); for (let k = 0; k < 10; k++) { const a = k / 10 * 6.283; pspawn(5, x, y, 1, Math.cos(a) * 40, Math.sin(a) * 20, 12, 1, LV.outdoor ? DIRT[3] : S[5]); }
    if (R.vault) { hero.quick = R.mod === 'long' ? 5 : 3; hero.quickT = G.t; sfx('levelUp', 0.4); const [x2, y2] = screenOf(hero); for (let q = 0; q < 10; q++) { const a = q / 10 * 6.283; pspawn(2, x2, y2, 24, Math.cos(a) * 40, Math.sin(a) * 20, 20, 0.25, q % 2 ? 51 : 27); } return; }   // round 66b: Quickdraw
    const t = rangerTarget(8);
    if (t) {   // landing: loose at the nearest
      hero.dir = dirFrom(t.fi - hero.fi, t.fj - hero.fj);
      const a0 = aimAngle(t), n = R.mod === 'volley' ? 5 : 3, k = R.mod === 'volley' ? 0.85 : 0.6;
      for (let i = 0; i < n; i++) shootArrow(a0 + (i / (n - 1) - 0.5) * 0.3, { dmgK: k });
      hero.combo = 0; hero.atk = 70; hero.hitDone = true; sfx('twang');
    }
  }
}
// Hunter's Mark: the toughest foe in sight (a boss or elite first, else the one with most life)
function huntersMark(from = null) {
  const mod = skillMod('mark');
  const foes = enemies.filter(e => alive(e) && e !== from && (from ? Math.hypot(e.fi - from.fi, e.fj - from.fj) < 6 : LV.vis[tIdx(Math.floor(e.fi), Math.floor(e.fj))] >= 0.3 && Math.hypot(e.fi - hero.fi, e.fj - hero.fj) < 10));
  if (!foes.length) { if (!from) say('NOTHING TO MARK', 25, 1); return false; }
  const rank = e => (e.def.unique ? 3e6 : e.champ || e.def.elite ? 2e6 : 0) + e.hp - (from ? Math.hypot(e.fi - from.fi, e.fj - from.fj) * 50 : 0);
  const t = foes.sort((a, b) => rank(b) - rank(a))[0];
  for (const e of enemies) if (e.markT > 0 && !from) e.markT = 0;   // one mark at a time
  t.markT = mod === 'death' ? 5 : 8; t.markK = mod === 'death' ? 1.7 : 1.35; t.markLeech = mod === 'blood' ? 0.15 : 0; t.markSpread = mod === 'spread';
  wake(t); impactFlash(t.fi, t.fj, t.def.chest + 8, 6); sfx('clink'); if (!from) sfx('cry');
  return true;
}
// Rain of Arrows: a storm of arrows falls over the thickest group in reach for three seconds; every
// one that lands on a foe hurts it and pins it in place a moment
function startRain() {
  let best = null, bn = -1;
  for (const e of enemies) {
    if (!alive(e) || LV.vis[tIdx(Math.floor(e.fi), Math.floor(e.fj))] < 0.3 || Math.hypot(e.fi - hero.fi, e.fj - hero.fj) > 9) continue;
    let n = 0; for (const o of enemies) if (alive(o) && Math.hypot(o.fi - e.fi, o.fj - e.fj) < 3) n++;
    if (n > bn) { bn = n; best = e; }
  }
  const [fx, fy] = dirVec(hero.dir);
  let at = [hero.fi + fx * 4, hero.fj + fy * 4];
  if (best) {   // the middle of that group, so the circle covers all of it
    const g = enemies.filter(o => alive(o) && Math.hypot(o.fi - best.fi, o.fj - best.fj) < 3);
    at = [g.reduce((a, o) => a + o.fi, 0) / g.length, g.reduce((a, o) => a + o.fj, 0) / g.length];
  }
  G.rain.push({ fi: at[0], fj: at[1], t: 3, next: 0, r: 3.0, lean: Math.sign(iso(at[0], at[1])[0] - iso(hero.fi, hero.fj)[0]) || 1 });
  hero.dir = dirFrom(at[0] - hero.fi, at[1] - hero.fj); hero.combo = 0; hero.atk = 0; hero.hitDone = true; hero.skyT = 0.45;   // loosed into the sky (round 43: the bow raised to it)
  say('RAIN OF ARROWS!', 55, 1.6); sfx('twang'); sfx('whoomp');
  for (let k = 0; k < 12; k++) { const [x, y] = screenOf(hero); pspawn(4, x, y, 30, (Math.random() - 0.5) * 20, 0, 180 + Math.random() * 60, 0.3, 27); }   // a sheaf sent straight up
}
function updateRanger(dt) {
  // traps: thrown in an arc, arm, wait, snap
  for (const tp of G.traps) {
    if (tp.fly > 0) { tp.fly -= dt; continue; }
    tp.life -= dt;
    if (tp.snapT > 0) { tp.snapT -= dt; continue; }
    if (tp.arm > 0) { tp.arm -= dt; if (tp.arm <= 0) sfx('clink'); continue; }
    if (enemies.some(e => alive(e) && Math.hypot(e.fi - tp.fi, e.fj - tp.fj) < (tp.small ? 0.7 : 0.85) + (e.def.unique ? 0.4 : 0))) snapTrap(tp);
  }
  G.traps = G.traps.filter(tp => tp.life > 0);
  // marks: count down; Spreading Mark passes on from a dead foe
  for (const e of enemies) if (e.markT > 0) { if (!alive(e)) { const sp = e.markSpread; e.markT = 0; if (sp) huntersMark(e); } else e.markT -= dt; }
  for (const s of G.smoke) s.t -= dt; G.smoke = G.smoke.filter(s => s.t > 0);
  // the rain: an arrow every 0.025 s somewhere in the circle, falling from on high
  // (round 67: in volleys, eight every 0.2 s, falling at a slant from the ranger's side, so the storm has a beat)
  for (const R of G.rain) {
    R.t -= dt; R.next -= dt; R.age = (R.age || 0) + dt;
    while (R.next <= 0 && R.t > 0) {
      R.next += 0.2;
      for (let q = 0; q < 8; q++) {
        const a = Math.random() * 6.283, d = Math.sqrt(Math.random()) * R.r, fi = R.fi + Math.cos(a) * d, fj = R.fj + Math.sin(a) * d, z = 110 + Math.random() * 40;
        if (!blocked(fi, fj)) G.falling.push({ fi, fj, z, z0: z, vz: 330 + Math.random() * 50, lean: R.lean || 0 });
      }
    }
  }
  G.rain = G.rain.filter(R => R.t > 0);
  for (const f of G.falling) {
    f.z -= f.vz * dt; if (f.z > 0) continue;
    f.done = true;
    const e = enemies.find(o => alive(o) && Math.hypot(o.fi - f.fi, o.fj - f.fj) < 0.7 + (o.def.unique ? 0.4 : 0));
    if (e) { wake(e); const c = spellCrit(); G.pierce = true; damageEnemy(e, spellDmg(c ? 2.4 : 1.2), f.fi - 0.05, f.fj - 0.05, c, 0, true); G.pierce = false; if (alive(e)) e.rootT = Math.max(e.rootT || 0, e.def.unique ? 0.25 : 0.6); sfx('thunk'); const [x, y] = screenOf(e); for (let k = 0; k < 5; k++) pspawn(4, x, y, 14, (Math.random() - 0.5) * 50, (Math.random() - 0.5) * 20, 30 + Math.random() * 30, 0.2, k % 2 ? 27 : 51); }   // (round 67: a spray of sparks where it bites)
    else {
      G.stuck.push({ fi: f.fi, fj: f.fj, t: 3 + Math.random(), seed: (Math.random() * 1e6) | 0, lean: f.lean }); const [x, y] = iso(f.fi, f.fj);
      for (let k = 0; k < 3; k++) pspawn(5, x, y, 1, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 14, 14 + Math.random() * 12, 0.5, LV.outdoor ? DIRT[3] : S[5]);   // chips kicked up
      if (G.dust && Math.random() < 0.35) G.dust.push({ fi: f.fi, fj: f.fj, vi: (Math.random() - 0.5) * 0.8, vj: (Math.random() - 0.5) * 0.8, r: 3 + Math.random() * 2, vr: 10, t: 0.5, t0: 0.5, z: 1 });   // and a puff of dust
    }
  }
  G.falling = G.falling.filter(f => !f.done);
  for (const s of G.stuck) s.t -= dt; G.stuck = G.stuck.filter(s => s.t > 0);
  if (G.stuck.length > 70) G.stuck.splice(0, G.stuck.length - 70);
}
// world layer: traps (iron jaws in a ring, open then snapped), arrows stuck in the ground, smoke
function drawRangerGround() {
  const put = (x, y, v) => { if (x >= 0 && y >= 0 && x < W && y < H && !cid[y * W + x]) scr[y * W + x] = v; };
  for (const R of G.rain) {   // round 67: the storm's shadow on the ground, a gold ring closing in to its edge, then breathing
    const [x0, y0] = iso(R.fi, R.fj), cx = x0 - camX, cy = y0 - camY, in0 = Math.min(1, (R.age || 0) / 0.3), fade = Math.min(1, R.t / 0.4);
    const rr = R.r * 22.6 * (1.35 - 0.35 * in0) * (1 + Math.sin(G.t * 5) * 0.015);
    for (let y = Math.floor(cy - rr / 2); y <= cy + rr / 2; y++) for (let x = Math.floor(cx - rr); x <= cx + rr; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H || cid[y * W + x]) continue;
      const d = Math.hypot((x - cx) / rr, (y - cy) * 2 / rr); if (d > 1) continue;
      if (BAYER[((y & 3) << 2) | (x & 3)] < 0.28 * fade * in0 * (1 - d * d * 0.5)) scr[y * W + x] = BLK;
    }
    for (let k = 0; k < 120; k++) { if ((k + Math.floor(G.t * 10)) % 5 > 2 || fade < 0.5 && k & 1) continue; const a = k / 120 * 6.283; put(Math.round(cx + Math.cos(a) * rr), Math.round(cy + Math.sin(a) * rr * 0.5), 51); put(Math.round(cx + Math.cos(a) * rr), Math.round(cy + Math.sin(a) * rr * 0.5) - 1, 50); put(Math.round(cx + Math.cos(a) * rr), Math.round(cy + Math.sin(a) * rr * 0.5) + 1, BLK); }
  }
  for (const f of G.falling) {   // each arrow's shadow, a dark dot growing as it nears the ground
    const [x0, y0] = iso(f.fi, f.fj), x = Math.round(x0 - camX), y = Math.round(y0 - camY), u = 1 - f.z / (f.z0 || 180);
    if (u < 0.35) continue; put(x, y, BLK); if (u > 0.7) { put(x + 1, y, BLK); put(x - 1, y, BLK); }
  }
  for (const tp of G.traps) {
    let fi = tp.fi, fj = tp.fj, z = 0;
    if (tp.fly > 0) { const u = 1 - tp.fly / 0.25; fi = tp.from[0] + (tp.fi - tp.from[0]) * u; fj = tp.from[1] + (tp.fj - tp.from[1]) * u; z = Math.sin(u * Math.PI) * 16; }
    const [x0, y0] = iso(fi, fj), cx = Math.round(x0 - camX), cy = Math.round(y0 - camY - z), R = tp.small ? 7 : 11, shut = tp.snapT > 0;   // (round 65c: twice the size, with real teeth)
    if (tp.arm <= 0 && !shut && tp.fly <= 0) {   // armed: its reach, a dashed ring that breathes
      const rr = tp.r * 22.6 * (0.96 + Math.sin(G.t * 4) * 0.04);
      for (let k = 0; k < 96; k++) { if ((k + Math.floor(G.t * 8)) % 6 > 2) continue; const a = k / 96 * 6.283; put(cx + Math.round(Math.cos(a) * rr), cy + Math.round(Math.sin(a) * rr * 0.5), 54); }
    }
    for (let k = 0; k < 40; k++) {   // the iron ring, lit on top, dark below
      const a = k / 40 * 6.283, rx = Math.cos(a) * R, ry = Math.sin(a) * R * 0.5;
      put(cx + Math.round(rx), cy + Math.round(ry) + 1, BLK); put(cx + Math.round(rx), cy + Math.round(ry), STEEL[1]); put(cx + Math.round(rx), cy + Math.round(ry) - 1, Math.sin(a) < 0 ? STEEL[4] : STEEL[3]);
    }
    for (let k = 0; k < 10; k++) {   // teeth pointing in (meeting in the middle once it has snapped)
      const a = k / 10 * 6.283, t0 = 1, t1 = shut ? 0.08 : 0.55;
      for (let s = 0; s <= 4; s++) { const t = t0 + (t1 - t0) * s / 4; put(cx + Math.round(Math.cos(a) * R * t), cy + Math.round(Math.sin(a) * R * 0.5 * t) - 1 - (s > 2 ? 1 : 0), s === 4 ? 27 : STEEL[4]); }
    }
    for (const [a, b] of [[0, 0], [1, 0], [-1, 0], [0, -1]]) put(cx + a, cy + b, tp.arm > 0 ? STEEL[2] : (Math.floor(G.t * 4) % 2 ? 22 : 23));   // the plate in the middle: red, blinking, once it is armed
    if (tp.mod === 'net' && !shut) for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283; put(cx + Math.round(Math.cos(a) * R * 1.6), cy + Math.round(Math.sin(a) * R * 0.8), WOOD[1]); }
  }
  for (const s of G.stuck) {   // a shaft leaning out of the ground with its fletching
    const [x0, y0] = iso(s.fi, s.fj), x = Math.round(x0 - camX), y = Math.round(y0 - camY), lean = (s.seed & 3) - 1.5;
    if (s.t < 0.6 && BAYER[((y & 3) << 2) | (x & 3)] > s.t / 0.6) continue;
    const ln = s.lean ? s.lean * 0.4 : lean * 0.3;   // (round 67: longer, leaning the way it fell, red fletching)
    for (let k = 0; k < 8; k++) { const xx = x + Math.round(ln * k), yy = y - k; put(xx, yy, k < 6 ? (k & 1 ? WOOD[1] : WOOD[2]) : BONE[2]); if (k >= 6) put(xx + 1, yy, BONE[1]); if (k < 6) put(xx + 1, yy, BLK); }
  }
  for (const s of G.smoke) {   // a grey cloud, thinning out
    const [x0, y0] = iso(s.fi, s.fj), cx = x0 - camX, cy = y0 - camY - 8, life = s.t / s.t0, R = s.r * 22;
    for (let y = Math.floor(cy - R / 2); y <= cy + R / 2; y++) for (let x = Math.floor(cx - R); x <= cx + R; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const d = Math.hypot((x - cx) / R, (y - cy) * 2 / R) + (hash(x >> 2, y >> 2, Math.floor(G.t * 3)) - 0.5) * 0.3; if (d > 1) continue;
      if (BAYER[((y & 3) << 2) | (x & 3)] < life * 0.55 * (1 - d)) scr[y * W + x] = d < 0.4 ? S[6] : S[4];
    }
  }
}
// detail layer: falling arrows (streaks with a head), the hunter's mark (a red reticle over the
// marked foe, drawn over walls too, so it shows where it hides)
function drawRangerFx() {
  // round 67: a real arrow (steel head, dark shaft, red fletching) leaning in from the ranger's side,
  // a pale streak above it, so a volley reads as arrows and not rain
  for (const f of G.falling) {
    const [x, y] = iso(f.fi, f.fj), L = f.lean || 0, X = Math.round((x + f.z * 0.18 * -L) * SPX - cam2x), Y = Math.round((y - f.z) * SPX - cam2y), sl = 0.36 * L;
    for (let s = 0; s < 46; s++) {
      const xx = X + Math.round(s * sl), yy = Y - s;
      if (s >= 28) { const u = (s - 28) / 18; if (BAYER[((yy & 3) << 2) | (xx & 3)] < u * 1.1) continue; ovSet(xx, yy, u < 0.4 ? BONE[2] : BONE[1]); continue; }   // the streak
      if (s < 5) { const w = s < 2 ? 0 : 1; for (let a = -w - 1; a <= w + 1; a++) ovSet(xx + a, yy, Math.abs(a) > w ? BLK : s === 0 ? 27 : STEEL[4]); continue; }   // the head
      ovSet(xx - 1, yy, BLK); ovSet(xx + 2, yy, BLK);
      if (s > 20) { ovSet(xx - 2, yy, s & 1 ? 22 : 23); ovSet(xx + 3, yy, s & 1 ? 23 : 22); ovSet(xx, yy, 22); ovSet(xx + 1, yy, 23); }   // the fletching
      else { ovSet(xx, yy, WOOD[1]); ovSet(xx + 1, yy, WOOD[2]); }
    }
  }
  for (const e of enemies) {
    if (!(e.markT > 0) || !alive(e)) continue;
    { // round 65c: a bold red reticle turning on the ground under it, and a red arrow bobbing over its head
      const [gx, gy] = iso(e.fi, e.fj), X = Math.round(gx * SPX - cam2x), Y = Math.round(gy * SPX - cam2y), R0 = 14 + (e.def.chest || 20) * 0.5, spin = G.t * 1.6;
      const pulse = 0.5 + 0.5 * Math.sin(G.t * 6);
      for (let k = 0; k < 160; k++) { const a = k / 160 * 6.283; for (const dr of [-1, 0, 1, 2, 3]) { const r = R0 + dr; ovSet(Math.round(X + Math.cos(a) * r * 2), Math.round(Y + Math.sin(a) * r), dr === 3 || dr === -1 ? BLK : dr === 0 && pulse > 0.5 ? 51 : 23); } }
      for (let q = 0; q < 4; q++) { const a = spin + q * 1.571; for (let s = -6; s <= 8; s++) { const r = R0 + s; ovSet(Math.round(X + Math.cos(a) * r * 2), Math.round(Y + Math.sin(a) * r), s < 0 ? 51 : 22); ovSet(Math.round(X + Math.cos(a) * r * 2) + 1, Math.round(Y + Math.sin(a) * r), s < 0 ? 51 : 23); } }
      const hy = Math.round((gy - (e.def.chest || 20) * 2 - 14 - Math.abs(Math.sin(G.t * 5)) * 4) * SPX - cam2y);
      for (let b = 0; b < 8; b++) for (let a = -(8 - b); a <= 8 - b; a++) ovSet(X + a, hy + b, Math.abs(a) >= 8 - b - 1 ? BLK : b < 2 ? 23 : 22);
    }
    // a target lock around the body: a broken red ring that breathes, four ticks pointing in
    const [x, y] = iso(e.fi, e.fj), X = Math.round(x * SPX - cam2x), Y = Math.round((y - e.def.chest * 0.8) * SPX - cam2y), R = Math.round(e.def.chest * 1.1 + 12 + Math.sin(G.t * 8) * 2), seen = LV.vis[tIdx(Math.floor(e.fi), Math.floor(e.fj))] >= 0.3;
    for (let a = 0; a < 72; a++) { const t = a / 72 * 6.283; if ((a % 18) > 12) continue; for (const dr of [-2, -1, 0, 1, 2]) ovSet(Math.round(X + Math.cos(t) * (R + dr)), Math.round(Y + Math.sin(t) * (R + dr) * 0.8), dr === 2 || dr === -2 ? BLK : dr < 0 ? 51 : 27); }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 0.8], [0, -0.8]]) for (let k = R - 6; k <= R + 4; k++) { ovSet(Math.round(X + dx * k), Math.round(Y + dy * k), 51); ovSet(Math.round(X + dx * k) + (dy ? 1 : 0), Math.round(Y + dy * k) + (dx ? 1 : 0), BLK); }
    if (!seen) {   // out of sight: its outline glows red through the wall
      const [ex, ey] = iso(e.fi, e.fj), sx = Math.round(ex * SPX - cam2x), sy = Math.round(ey * SPX - cam2y), h = e.def.chest * 2 * SPX * 0.9;
      for (let k = 0; k < 30; k++) { const t = k / 30 * 6.283; ovSet(Math.round(sx + Math.cos(t) * 10), Math.round(sy - h / 2 + Math.sin(t) * h / 2), 22); }
    }
  }
}
// button glyphs for the ranger
const glyphBowAtk = (cx, cy) => { for (let a = -6; a <= 6; a++) put(cx - 4 + Math.round((a * a) / 12), cy + a, a % 3 ? 35 : 36); line(cx - 4, cy - 6, cx - 4, cy + 6, 27); line(cx - 6, cy, cx + 7, cy, 31); line(cx + 7, cy, cx + 5, cy - 2, 27); line(cx + 7, cy, cx + 5, cy + 2, 27); };
const glyphMulti = (cx, cy) => { for (const a of [-0.5, -0.25, 0, 0.25, 0.5]) { const x1 = cx - 6 + Math.cos(a - 0.6) * 14, y1 = cy + 6 + Math.sin(a - 0.6) * 14; line(cx - 6, cy + 6, x1, y1, 35); put(x1, y1, 27); } };
const glyphTrap = (cx, cy) => { for (let k = 0; k < 20; k++) { const a = k / 20 * 6.283; put(cx + Math.cos(a) * 7, cy + 2 + Math.sin(a) * 3.5, 31); if (k % 3 === 0) line(cx + Math.cos(a) * 7, cy + 2 + Math.sin(a) * 3.5, cx + Math.cos(a) * 4, cy + Math.sin(a) * 2 - 1, 27); } put(cx, cy + 2, 22); };
const glyphRoll = (cx, cy) => { for (let a = 0; a <= 14; a++) { const u = a / 14; put(cx + 6 - u * 13, cy + 4 - Math.sin(u * Math.PI) * 9, a < 3 ? 27 : 55); } for (const [a, b] of [[-7, 5], [-5, 6], [-8, 7]]) put(cx + a, cy + b, 25); };
const glyphMark = (cx, cy) => { for (let a = 0; a < 32; a++) { const t = a / 32 * 6.283; if (a % 8 > 5) continue; put(cx + Math.cos(t) * 7, cy + Math.sin(t) * 7, 23); } line(cx - 9, cy, cx - 4, cy, 22); line(cx + 4, cy, cx + 9, cy, 22); line(cx, cy - 9, cx, cy - 4, 22); line(cx, cy + 4, cx, cy + 9, 22); fillRect(cx - 1, cy - 1, 2, 2, 27); };
const glyphRain = (cx, cy) => { for (const [ox, oy] of [[-6, -6], [-1, -8], [4, -5], [-3, -1], [3, 0]]) { line(cx + ox, cy + oy, cx + ox - 1, cy + oy + 6, 35); put(cx + ox - 1, cy + oy + 7, 27); } line(cx - 8, cy + 8, cx + 8, cy + 8, 25); };
