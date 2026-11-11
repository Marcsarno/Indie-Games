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
    { id: 'chain', name: 'CHAIN LIGHTNING', lvl: 4, mana: 16, cd: 3 },   // round 65: replaces Blink
  ],
  // round 33: the ranger's attack button looses single arrows (no focus); these are its four
  ranger: [   // round 66: the kit rethought (the user: boring; every skill lost damage against just shooting)
    { id: 'pierce', name: 'PIERCING SHOT', lvl: 1, mana: 7, cd: 0.9 },
    { id: 'cluster', name: 'CLUSTER ARROW', lvl: 2, mana: 12, cd: 2.5 },
    { id: 'sentry', name: 'SENTRY', lvl: 3, mana: 14, cd: 9 },
    { id: 'strafe', name: 'STRAFE', lvl: 4, mana: 14, cd: 7 },   // round 82: replaces the Vault (the user: the trap and the vault felt weak). Swap back: { id: 'vault', name: 'VAULT', lvl: 4, mana: 8, cd: 4 }
  ],
};
let SKILLS = SKILLSETS.warrior;
function setSkillsFor(cls) { SKILLS = SKILLSETS[cls] || SKILLSETS.warrior; }
const CD = { charge: 0, bolt: 0, bash: 0, whirl: 0, cry: 0, slam: 0, hook: 0, leap: 0, fireball: 0, cone: 0, meteor: 0, blink: 0, chain: 0, multi: 0, trap: 0, roll: 0, mark: 0, pierce: 0, cluster: 0, sentry: 0, hawk: 0, vault: 0, strafe: 0 };
function resetSkills() { for (const k in CD) CD[k] = 0; hero.whirl = 0; hero.dash = 0; hero.buff = 0; hero.charge = null; hero.chargeAgain = 0; hero.chargeSecond = false; hero.strafe = null; }
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
  if (s.id === 'strafe') startStrafe();
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
    { id: 'ballista', name: 'BALLISTA', desc: 'SLOWER, HEAVY BOLTS THAT GO THROUGH EVERYTHING' },
    { id: 'fire', name: 'FIRE SENTRY', desc: 'BURNING BOLTS, AND IT BLOWS UP WHEN IT BREAKS' },
    { id: 'twin', name: 'TWO SENTRIES', desc: 'PLANTS A PAIR, EACH A LITTLE SLOWER' },
  ],
  strafe: [   // round 82
    { id: 'fire', name: 'BURNING STRAFE', desc: 'EVERY ARROW BURNS' },
    { id: 'long', name: 'LONG STRAFE', desc: 'LASTS HALF AGAIN AS LONG' },
    { id: 'finale', name: 'FINALE', desc: 'ENDS WITH A RING OF ARROWS FLYING OUT ALL ROUND YOU' },
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
    { id: 'fork', name: 'FORK', desc: 'SPLITS IN TWO AT EVERY JUMP: UP TO TEN FOES' },
    { id: 'overload', name: 'OVERLOAD', desc: 'ONE HUGE STRIKE FROM THE SKY THAT STUNS EVERYTHING NEAR IT' },
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
const CAST_REL = { missile: 0.07, fireball: 0.13, cone: 0.12, meteor: 0.24, chain: 0.2 };
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
      m.done = true; G.gaugeAs = 'earth'; explodeAt(m.fi, m.fj, m.r || 2.4, m.k || 3.2, 2, !m.small, m.cold); G.gaugeAs = null;   // (round 83: the Meteor charges EARTH)
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
  drawShafts(); drawSlamFx(); drawFrostFx(); drawLightning(); drawRangerKit(); drawArcHits(); drawElemUlt();   // round 65, 66, 67, 68d
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
// Round 82 (the user: the least impressive and the weakest spell; it may look like an ultimate):
// a longer charge, a thick bolt from the staff, and every foe it reaches is struck again by lightning
// out of the sky (SKY: a splash round it, 0.6 x, once a cast per foe; a burst of light, a ring). Damage:
// the first foe 3 x, each jump 1.8 x (was 1 x falling 6% a jump), six foes (Fork ten at 1.4 x; Overload one foe at 6 x with
// a sky strike twice as wide that stuns everything in it). Costs 16, every 3 s (was 14, every 2.5 s).
const CHAIN_JUMP = 4.2, SKY_R = 1.25;
const chillish = e => e.frozen > 0 || e.slowT > 0 || e.chillT > 0;
function chainLightning() {
  const mod = skillMod('chain'), first = nearestEnemy(7.5, true);
  if (!first) { say('NOTHING TO STRIKE', 25, 1); return false; }
  startCast('chain', 0.36, [first.fi, first.fj], () => {
    const [ox, oy] = staffTip(), n = mod === 'overload' ? 1 : mod === 'fork' ? 10 : 6, k = mod === 'overload' ? 6 : mod === 'fork' ? 1.4 : 1.8, big = mod === 'overload', grp = { splashed: new Set() };
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
    for (const s of seq) G.bolts.push({ a: s.a, src: s.src || null, e: s.e, delay: s.step * 0.085, t: big ? 0.42 : 0.32, t0: big ? 0.42 : 0.32, k: s.step === 0 && !big ? k * 1.65 : k, big, grp, first: s.step === 0, seed: (Math.random() * 1e6) | 0, done: false });
    orbFlare(40, 27, 22); orbFlare(32, 40, 12, true); sfx('zap'); sfx('boom', 0.5); if (SHAKE) G.trauma = Math.min(1, G.trauma + (big ? 0.45 : 0.3));
  });
  return true;
}
const chestOf = e => [e.fi, e.fj, (e.def.chest || 20) * 0.65];
// lightning out of the sky onto a struck foe: everything else within SKY_R takes 1 x (Overload: twice
// as wide, 2.5 x, and all of it stunned; a normal strike's splash is 0.6 x); a ring of light runs out over the floor and scorches it
function skyStrike(fi, fj, big, e0, grp = null) {
  if (!G.sky) G.sky = [];
  G.sky.push({ fi, fj, t: big ? 0.45 : 0.34, t0: big ? 0.45 : 0.34, big, seed: (Math.random() * 1e6) | 0 });
  const r = big ? SKY_R * 2 : SKY_R;
  G.elem = 'shock'; G.pierce = true;
  for (const e of enemies) {
    if (e === e0 || !alive(e) || (grp && grp.splashed.has(e))) continue; const d = Math.hypot(e.fi - fi, e.fj - fj); if (d > r + (e.def.unique ? 0.4 : 0)) continue;
    if (grp) grp.splashed.add(e);   // (a foe takes one splash a cast, however many strikes land near it)
    wake(e); const c = spellCrit(); damageEnemy(e, spellDmg((c ? 2 : 1) * (big ? 2.5 : 0.6)), fi, fj, c, big ? 1 : 0, true);
    if (alive(e)) { e.shockT = 3; if (big && !e.def.unique) e.stun = Math.max(e.stun || 0, 1.2); }
  }
  G.elem = null; G.pierce = false;
  shockwave(fi, fj, r + 0.3, big ? 0.38 : 0.28, [27, 40]);
  stampScorch(fi, fj, big ? 0.9 : 0.55);
  const [x, y] = iso(fi, fj); for (let q = 0; q < (big ? 26 : 14); q++) { const a = Math.random() * 6.283, s = 50 + Math.random() * 90; pspawn(2, x, y, 2, Math.cos(a) * s, Math.sin(a) * s * 0.5, 30 + Math.random() * 60, 0.22 + Math.random() * 0.2, q % 3 ? 40 : 27); }
  if (big) sfx('boom'); sfx('zap', big ? 1 : 0.8);
}
// a burn mark on the floor: a dark star of cracks, lighter at the tips
function stampScorch(fi, fj, r) {
  const [cx, cy] = iso(fi, fj), R0 = rng((fi * 131 + fj * 17) | 0), arms = 7;
  for (let k = 0; k < arms; k++) {
    let a = k / arms * 6.283 + R0() * 0.6, x = cx, y = cy; const len = r * 22 * (0.6 + R0() * 0.6);
    for (let s = 0; s < len; s++) {
      a += (R0() - 0.5) * 0.5; x += Math.cos(a); y += Math.sin(a) * 0.5;
      const X = Math.round(x), Y = Math.round(y); if (X < 0 || Y < 0 || X >= WW || Y >= WH) continue;
      const q = Y * WW + X; if (!wFloor[q] || floorBuf[q] === BLK) continue; setFloor(q, s < len * 0.6 ? BLK : (LV.outdoor ? DIRT : TH().ramp)[0]);
    }
  }
  for (let b = -3; b <= 3; b++) for (let a = -6; a <= 6; a++) if (a * a / 36 + b * b / 9 <= 1) { const X = Math.round(cx + a), Y = Math.round(cy + b); if (X < 0 || Y < 0 || X >= WW || Y >= WH) continue; const q = Y * WW + X; if (wFloor[q] && floorBuf[q] !== BLK) setFloor(q, BLK); }
}
function updateLightning(dt) {
  if (!G.bolts) G.bolts = [];
  // the charge: sparks crackling at the staff's orb before the bolt leaves
  if (hero.cast > 0 && hero.castKind === 'chain' && (hero.castAge || 0) < castRel('chain') + 0.05) {
    const [fi, fj] = staffTip(), [x, y] = iso(fi, fj);
    for (let q = 0; q < 4; q++) { const a = Math.random() * 6.283; pspawn(2, x + Math.cos(a) * 5, y, ORB_Z + Math.sin(a) * 5, -Math.cos(a) * 30, 0, -Math.sin(a) * 30, 0.12, q ? 40 : 32); }
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
      skyStrike(B.b[0], B.b[1], B.big, e, B.grp);
      impactFlash(B.b[0], B.b[1], B.b[2], B.big ? 9 : 6);
      const [x, y] = iso(B.b[0], B.b[1]);
      for (let q = 0; q < (B.big ? 18 : 10); q++) { const a = Math.random() * 6.283, s = 40 + Math.random() * 60; pspawn(2, x, y, B.b[2], Math.cos(a) * s, Math.sin(a) * s * 0.5, Math.random() * 40, 0.18 + Math.random() * 0.12, q % 3 ? 40 : 32); }
      G.flashes.push({ fi: B.b[0], fj: B.b[1], t: 0.26, t0: 0.26, r: B.big ? 190 : 140, tint: 2 });
      sfx('zap', B.big ? 1 : 0.6);
    } else if (alive(B.e)) B.b = chestOf(B.e);
    B.t -= dt;
  }
  G.bolts = G.bolts.filter(B => B.delay > 0 || B.t > 0);
  if (G.sky) { for (const k of G.sky) k.t -= dt; G.sky = G.sky.filter(k => k.t > 0); }
  for (const e of enemies) if (e.shockT > 0) e.shockT -= dt;
}
// a jagged bolt, re-rolled every other frame: a white core, a pale blue glow either side, a few short
// forks off it, thinning out as it fades (detail layer)
const BOLT_PAL = [27, 32, 40, 39];
function boltLine(A, B, seed, w, life, forks = true, pal = BOLT_PAL) {   // (round 84: pal = [core, under, glow, haze], for burning lightning)
  const R = rng(seed + Math.floor(G.t * 30)), n = Math.max(4, Math.round(Math.hypot(B[0] - A[0], B[1] - A[1]) / 9));
  const nx = -(B[1] - A[1]), ny = B[0] - A[0], nl = Math.hypot(nx, ny) || 1;
  let px = A[0], py = A[1];
  for (let s = 1; s <= n; s++) {
    const u = s / n, j = s < n ? (R() - 0.5) * 16 : 0, qx = A[0] + (B[0] - A[0]) * u + nx / nl * j, qy = A[1] + (B[1] - A[1]) * u + ny / nl * j;
    const m = Math.ceil(Math.hypot(qx - px, qy - py));
    for (let k = 0; k <= m; k++) {
      const x = Math.round(px + (qx - px) * k / m), y = Math.round(py + (qy - py) * k / m);
      if (w >= 2) {   // a 2 px hot core in a pale blue glow, a dithered deep blue haze outside it
        for (const [a, b] of [[-2, 0], [2, 0], [0, -2], [0, 3], [-2, 1], [2, 1]]) if ((x + y + a) & 1) ovSet(x + a, y + b, pal[3]);
        for (const [a, b] of [[-1, 0], [1, 0], [0, -1], [0, 2], [-1, 1], [1, 1]]) ovSet(x + a, y + b, pal[2]);
        if (w > 2) for (const [a, b] of [[-3, 0], [3, 0], [0, -3], [0, 4]]) if ((x + y) & 1) ovSet(x + a, y + b, pal[3]);
      } else if (life > 0.5 && ((x + y) & 1)) ovSet(x, y + 1, pal[2]);
      ovSet(x, y, pal[0]); if (w >= 2) ovSet(x, y + 1, pal[1]);
    }
    if (forks && s < n && R() < 0.45) {   // a short fork
      let fx = qx, fy = qy, a = Math.atan2(B[1] - A[1], B[0] - A[0]) + (R() < 0.5 ? 1 : -1) * (0.6 + R() * 0.6);
      for (let f = 0; f < 6 + R() * 8; f++) { a += (R() - 0.5) * 0.8; fx += Math.cos(a) * 1.4; fy += Math.sin(a) * 1.4; ovSet(Math.round(fx), Math.round(fy), f < 4 ? pal[1] : pal[2]); }
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
    boltLine(pa, pb, B.seed, B.big || (B.first && life > 0.4) ? 3 : life > 0.3 ? 2 : 1, life);
    if (B.first && life > 0.45) boltLine(pa, pb, B.seed + 3, 1, life, false);   // a second strand twisting round the first
    if (life > 0.55) for (const [cx, cy, r] of [[pb[0], pb[1], B.big ? 7 : 5], [pa[0], pa[1], 3]]) for (let b = -r; b <= r; b++) for (let a = -r; a <= r; a++) { const d = Math.hypot(a, b); if (d <= r) ovSet(cx + a, cy + b, d < r * 0.45 ? 27 : d < r * 0.75 ? 32 : 40); }   // a hot spark where it bites (and leaves)
    if (B.big && life > 0.5) boltLine(P(B.a), P(B.b), B.seed + 7, 1, life, false);   // Overload: a second strand
  }
  // the sky strikes: a bolt straight down out of the dark, twice as wide as a jump, a hot white pool
  // where it lands and arcs crawling out over the floor from it
  if (G.sky) for (const k of G.sky) {
    const life = k.t / k.t0, [gx, gy] = P([k.fi, k.fj, 0]); if (life < 0.3 && Math.floor(G.t * 30) % 2) continue;
    if (life > 0.25) {
      const top = [gx + ((k.seed % 40) - 20), Math.max(-20, gy - 330)];
      boltLine(top, [gx, gy - 4], k.seed, life > 0.55 ? 3 : 2, life);
      if (life > 0.5) boltLine([top[0] + 10, top[1]], [gx, gy - 4], k.seed + 11, 1, life, false);
    }
    const r = (k.big ? 30 : 20) * (1.15 - life * 0.4);
    for (let b = -r / 2; b <= r / 2; b++) for (let a = -r; a <= r; a++) { const d = Math.hypot(a / r, b / (r / 2)); if (d > 1) continue; if (d < 0.4 * life + 0.1) ovSet(Math.round(gx + a), Math.round(gy + b), 27); else if (d < 0.75 * life + 0.15 && ((a + b) & 1)) ovSet(Math.round(gx + a), Math.round(gy + b), 40); }
    if (life > 0.4) { const R2 = rng(k.seed + Math.floor(G.t * 30)); for (let q = 0; q < (k.big ? 6 : 4); q++) { const a = R2() * 6.283, l = (k.big ? 60 : 40) * (0.6 + R2() * 0.5); boltLine([gx, gy], [gx + Math.cos(a) * l, gy + Math.sin(a) * l * 0.5], k.seed + q * 5, 1, life, false); } }
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
  if (hero.cls === 'mage') return elemGain(e, dmg, killed);   // round 83: the mage charges four elements instead of one bar
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
  btnFx(9).press = 0.2; G.ultAt = G.t;
  if (hero.cls === 'mage') { const full = elemFull(); if (!full.length) { say('NOT CHARGED YET', 40, 1.2); return; } startElemUlt(full); return; }
  hero.ult = 0;
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
  if (hero.ultOn && hero.ultOn.kind === 'elem') updateElemUlt(dt);
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
// ---------------------------------------------------------------- the mage's elemental ultimates (round 83)
// The user's idea: the mage charges each kind of magic by using it, and the ultimate is whatever is
// charged. Four gauges (hero.el), each filled by damage dealt with its own spells: FIRE by the
// Fireball (and anything burning ground does), FROST by the Cone of Cold, LIGHTNING by Chain
// Lightning, EARTH by the Meteor (a rock out of the sky). A full gauge stays full. The ultimate
// button spends every full gauge at once:
//   one element    INFERNO / BLIZZARD / THUNDERSTORM / EARTHQUAKE
//   all four       CATACLYSM: the four in turn, darker, harder, and a last blast over everything
//   two            their pair (round 84): PLASMA STORM, STEAM BURST, VOLCANO, SHATTERSTORM, GLACIER, MAGNETIC PULL
//   three          the pair highest in PAIR_ORDER, then the third element's own
// Arcane (the magic missile) charges nothing. Damage an ultimate deals charges nothing either.
const ELEMS = ['fire', 'frost', 'earth', 'storm'];
const ELEM_INFO = {
  fire: { name: 'FIRE', ult: 'INFERNO', col: 16, hi: 18, lvl: 1, k: 1.6, ramp: [13, 14, 15, 16] },
  frost: { name: 'FROST', ult: 'BLIZZARD', col: 117, hi: 118, lvl: 2, k: 8, ramp: [115, 116, 117, 118] },
  earth: { name: 'EARTH', ult: 'EARTHQUAKE', col: 102, hi: 107, lvl: 3, k: 2, ramp: [99, 100, 101, 102] },
  storm: { name: 'LIGHTNING', ult: 'THUNDERSTORM', col: 40, hi: 27, lvl: 4, k: 0.9, ramp: [37, 38, 39, 40] },
  all: { name: 'ALL', ult: 'CATACLYSM', col: 51, hi: 27, ramp: [48, 49, 50, 51] },
};
const ELEM_FROM = { fire: 'fire', cold: 'frost', shock: 'storm' };
const ELEM_DUR = { fire: 3.5, frost: 3.8, storm: 3.6, earth: 3.4, all: 5.9 }, ULT_R = 6.4;
const elemOpen = k => hero.lvl >= ELEM_INFO[k].lvl;
const elemFull = () => ELEMS.filter(k => elemOpen(k) && hero.el && (hero.el[k] || 0) >= 100);
// a foe killed outright by one element gives 5.7 points times the element's k (k evens out how often
// each spell comes round: about eleven fire kills fill FIRE); elites and bosses give much more
function elemGain(e, dmg, killed) {
  const k = G.gaugeAs || ELEM_FROM[G.elem]; if (!k || !elemOpen(k)) return;
  if (!hero.el) hero.el = {};
  let g = 4.5 * Math.max(0, dmg) / e.maxHp; if (killed) g += e.def.unique ? 20 : e.champ || e.def.elite ? 7 : 1.2;
  const was = hero.el[k] || 0; hero.el[k] = Math.min(100, was + g * ELEM_INFO[k].k);
  if (was < 100 && hero.el[k] >= 100) {
    const all = elemFull().length === 4;
    say(all ? 'ALL FOUR ARE CHARGED: CATACLYSM' : `${ELEM_INFO[k].name} IS CHARGED: ${ELEM_INFO[k].ult}`, all ? 51 : ELEM_INFO[k].hi, 2.2); sfx('levelUp'); G.elemPop = { k, t: G.t };
  }
  hero.ult = Math.max(...ELEMS.map(q => hero.el[q] || 0));
}
function startElemUlt(full) {
  // round 84: two full gauges cast their pair; three, the pair highest in PAIR_ORDER and then the third's own
  let queue = full.slice();
  if (full.length === 4) queue = ['all'];
  else if (full.length >= 2) { const key = PAIR_ORDER.find(pr => pr.split('+').every(k => full.includes(k))); queue = [key, ...full.filter(k => !key.split('+').includes(k))]; }
  for (const k of full) hero.el[k] = 0;
  hero.ult = Math.max(...ELEMS.map(q => hero.el[q] || 0));
  hero.ultOn = { kind: 'elem', queue, id: null, t: 0, pillars: [], crystals: [], spears: [], arcs: [], orbs: 0, puffs: [], geysers: [], bombs: [], pools: [], bombN: 0 };
  hero.cast = -1; hero.castFn = null;
  elemStage(hero.ultOn);
}
function elemStage(U) {
  const id = U.queue.shift(); U.id = id; U.t = 0; U.fi = hero.fi; U.fj = hero.fj;
  U.ev = ELEM_EV[id].map(e => e.slice()).sort((a, b) => a[0] - b[0]);
  U.fireUntil = U.spearUntil = U.strikeUntil = U.orbUntil = U.shakeUntil = U.geyserUntil = U.bombUntil = U.shatUntil = -1; U.plasma = U.walls = U.magnet = null; if (U.volc && !U.volc.die) U.volc.die = G.t; U.lastAt = null; U.fireT = U.spearT = U.strikeT = 0; U.dim = id === 'all';
  say(ELEM_INFO[id].ult + '!', ELEM_INFO[id].hi, 1.8);
  sfx('meteor'); sfx('whoomp'); if (id === 'frost') sfx('frost'); if (id === 'fire') sfx('fireball');
  G.flashes.push({ fi: hero.fi, fj: hero.fj, t: 0.4, t0: 0.4, r: 140, tint: id === 'fire' ? 1 : id === 'earth' ? 0 : 2 });
}
const ultSees = e => alive(e) && LV.vis[tIdx(Math.floor(e.fi), Math.floor(e.fj))] >= 0.3;
// everything the ultimate can see between two distances from its centre takes k x the staff's damage
function ultDmg(U, k, elem, pow, r0, r1, each) {
  G.pierce = true;
  for (const e of enemies) {
    if (!ultSees(e)) continue;
    const d = Math.hypot(e.fi - U.fi, e.fj - U.fj); if (d < r0 || d > r1 + (e.def.unique ? 0.5 : 0)) continue;
    wake(e); const c = spellCrit(); G.elem = elem; damageEnemy(e, spellDmg(c ? k * 2 : k), U.fi, U.fj, c, pow, true); G.elem = null;
    if (each) each(e, d);
  }
  G.pierce = false;
}
// ---- fire: a ring of pillars bursting out of the floor
function fireRing(U, r, n, k) {
  const a0 = Math.random() * 6.283;
  for (let i = 0; i < n; i++) {
    const a = a0 + i / n * 6.283, fi = U.fi + Math.cos(a) * r, fj = U.fj + Math.sin(a) * r; if (blocked(fi, fj)) continue;
    U.pillars.push({ fi, fj, born: G.t + i * 0.012, die: 0, seed: Math.random() * 100, h: 88 + Math.random() * 48, w: 12 + Math.random() * 5 });
    const [x, y] = iso(fi, fj);
    stampBlood(Math.round(x), Math.round(y), 4, (Math.random() * 1e6) | 0, [2, 3, 3, 4, 5]);
    burst(2, x, y, 6, 8, 110, 17); burst(3, x, y, 4, 4, 40, 16);
    if (i % 2 === 0) G.blasts.push({ fi, fj, r: 1.1, t: 0.46, t0: 0.46, big: false, bloom: true, seed: Math.random() * 100 });
  }
  ultDmg(U, k, 'fire', 1, Math.max(0, r - 1.3), r + 1.3);
  shockwave(U.fi, U.fj, r + 0.6, 0.3, [18, 16]);
  G.flashes.push({ fi: U.fi, fj: U.fj, t: 0.6, t0: 0.6, r: 150 + r * 34, tint: 1 });
  if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.4);
  sfx('boom'); sfx('fireball');
}
function fireOut(U) { for (const p of U.pillars) if (!p.die) p.die = G.t + Math.random() * 0.15; U.fireUntil = -1; }
// ---- frost: a wave that freezes everything, spears of ice out of the sky, then it all shatters
function frostNova(U, k) {
  ultDmg(U, k, 'cold', 0, 0, ULT_R, e => freezeFoe(e, 3.4));
  const [x, y] = iso(U.fi, U.fj), sp = ULT_R * 22.6 / 0.45;
  for (let q = 0; q < 64; q++) { const a = q / 64 * 6.283; pspawn(4, x, y, 3, Math.cos(a) * sp, Math.sin(a) * sp * 0.5, 0, 0.45, q % 3 ? 118 : 27); }
  burst(4, x, y, 10, 40, 150, 118); burst(2, x, y, 8, 26, 110, 27);
  shockwave(U.fi, U.fj, ULT_R, 0.45, [27, 118]); shockwave(U.fi, U.fj, ULT_R * 0.6, 0.35, [118, 117]);
  G.frost.push({ fi: U.fi, fj: U.fj, a0: 0, t: 4.5, seed: (Math.random() * 1e6) | 0, R: 4.6, half: Math.PI, ring0: 0 });
  G.flashes.push({ fi: U.fi, fj: U.fj, t: 0.7, t0: 0.7, r: 330, tint: 2 });
  if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.5);
  sfx('frost'); sfx('whoomp'); sfx('crack');
}
function spearLand(U, s) {
  G.pierce = true;
  for (const e of enemies) if (ultSees(e) && Math.hypot(e.fi - s.fi, e.fj - s.fj) < 0.95 + (e.def.unique ? 0.4 : 0)) { const c = spellCrit(); G.elem = 'cold'; damageEnemy(e, spellDmg(c ? 2.4 : 1.2), s.fi, s.fj, c, 0, true); G.elem = null; if (!(e.frozen > 0)) freezeFoe(e, 1.6); }
  G.pierce = false;
  if (U.crystals.length < 44) U.crystals.push({ fi: s.fi, fj: s.fj, born: G.t, h: 26 + Math.random() * 24, seed: (Math.random() * 1e4) | 0 });
  const [x, y] = iso(s.fi, s.fj); burst(4, x, y, 4, 7, 80, 118); burst(2, x, y, 4, 4, 60, 27);
  shockwave(s.fi, s.fj, 0.9, 0.2, [27, 118]);
  if (Math.random() < 0.4) sfx('thunk', 0.6);
}
function shatterAll(U, k) {
  ultDmg(U, k, 'cold', 1, 0, ULT_R);
  for (const c of U.crystals) { const [x, y] = iso(c.fi, c.fj); burst(5, x, y, c.h * 0.3, 6, 110, 118); burst(2, x, y, c.h * 0.3, 3, 90, 27); }
  U.crystals = []; U.spearUntil = -1;
  shockwave(U.fi, U.fj, ULT_R, 0.4, [27, 118]);
  G.flashes.push({ fi: U.fi, fj: U.fj, t: 0.5, t0: 0.5, r: 330, tint: 2 }); G.screenFlash = { t0: 0.14, col: 118 };
  if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.8);
  sfx('crack'); sfx('boom'); sfx('frost');
}
// ---- lightning: strike after strike out of the sky, ball lightning circling, and one last thunderclap
function skyFx(fi, fj, big) {
  if (!G.sky) G.sky = [];
  G.sky.push({ fi, fj, t: big ? 0.45 : 0.3, t0: big ? 0.45 : 0.3, big, seed: (Math.random() * 1e6) | 0 });
  shockwave(fi, fj, big ? 2.6 : 1.1, big ? 0.38 : 0.24, [27, 40]); stampScorch(fi, fj, big ? 0.9 : 0.5);
  const [x, y] = iso(fi, fj); for (let q = 0; q < (big ? 26 : 9); q++) { const a = Math.random() * 6.283, s = 50 + Math.random() * 90; pspawn(2, x, y, 2, Math.cos(a) * s, Math.sin(a) * s * 0.5, 30 + Math.random() * 60, 0.2 + Math.random() * 0.2, q % 3 ? 40 : 27); }
  G.flashes.push({ fi, fj, t: 0.22, t0: 0.22, r: big ? 260 : 130, tint: 2 });
}
function stormStrike(U, k) {
  const foes = enemies.filter(e => ultSees(e) && Math.hypot(e.fi - U.fi, e.fj - U.fj) < ULT_R + 1);
  if (!foes.length) { if (Math.random() < 0.4) { const a = Math.random() * 6.283, d = 1.5 + Math.random() * 4; skyFx(U.fi + Math.cos(a) * d, U.fj + Math.sin(a) * d, false); sfx('zap', 0.7); } return; }
  foes.sort((a, b) => (a.stormN || 0) - (b.stormN || 0) || Math.random() - 0.5);
  const e = foes[0]; e.stormN = (e.stormN || 0) + 1;
  const at = chestOf(e), c = spellCrit(); G.elem = 'shock'; G.pierce = true; damageEnemy(e, spellDmg(c ? k * 2 : k), e.fi - 0.1, e.fj - 0.1, c, 0, true); G.elem = null; G.pierce = false;
  if (alive(e)) e.shockT = 3;
  skyFx(e.fi, e.fj, false);
  if (U.lastAt && Math.hypot(U.lastAt[0] - at[0], U.lastAt[1] - at[1]) < 5) U.arcs.push({ a: U.lastAt, b: at, t: 0.22, t0: 0.22, seed: (Math.random() * 1e6) | 0 });
  U.lastAt = at;
  if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.07);
  sfx('zap'); if (Math.random() < 0.3) sfx('boom', 0.6);
}
function thunderclap(U, k) {
  U.fi = hero.fi; U.fj = hero.fj;
  ultDmg(U, k, 'shock', 1, 0, ULT_R + 0.5, e => { if (alive(e)) { e.shockT = 3; if (!e.def.unique) e.stun = Math.max(e.stun || 0, 1.5); } });
  skyFx(hero.fi + 0.6, hero.fj + 0.6, true); for (let q = 0; q < 5; q++) { const a = q / 5 * 6.283 + 0.4; skyFx(hero.fi + Math.cos(a) * 3.4, hero.fj + Math.sin(a) * 3.4, false); }
  shockwave(U.fi, U.fj, ULT_R + 0.5, 0.5, [27, 40]);
  G.screenFlash = { t0: 0.16, col: 27 }; U.orbUntil = -1; U.strikeUntil = -1;
  if (SHAKE) G.trauma = 1;
  sfx('boom'); sfx('zap'); sfx('crack');
}
// ---- earth: rings of stone bursting up, further out each time, boulders, and a last upheaval
function quakeRing(U, r0, r1, k, tall = 1) {
  ultDmg(U, k, 'heavy', 1, r0, r1, e => { if (alive(e) && !e.def.unique && !(e.frozen > 0)) { e.downT = e.downT0 = Math.max(e.downT || 0, 1.1); e.atk = -1; e.windT = 0; } });
  const n = Math.round((r0 + r1) * 3.4);
  for (let q = 0; q < n; q++) {
    const a = (q + Math.random() * 0.7) / n * 6.283, d = Math.max(1.0, r0 + 0.2) + Math.random() * (r1 - Math.max(1.0, r0 + 0.2)), fi = U.fi + Math.cos(a) * d, fj = U.fj + Math.sin(a) * d;
    if (blocked(fi, fj)) continue;
    G.spikes.push({ fi, fj, h: (36 + Math.random() * 30) * tall, w: 8 + Math.random() * 6, delay: Math.random() * 0.12, t: 1.15, t0: 1.15, seed: (Math.random() * 1e6) | 0, lean: Math.sign(Math.cos(a) - Math.sin(a) || 1) * (0.15 + Math.random() * 0.3) });
    if (q % 3 === 0) { const [x, y] = iso(fi, fj); rubble(x, y, 3, 60); G.dust.push({ fi, fj, vi: Math.cos(a) * 1.4, vj: Math.sin(a) * 1.4, r: 4, vr: 22, t: 0.8, t0: 0.8, z: 2 }); }
  }
  const qk = { fi: U.fi, fj: U.fj, a0: 0, ring: true, R: r1, t: 0.7, t0: 0.7, seed: (Math.random() * 1e6) | 0 }; G.quakes.push(qk); stampCracks(qk);
  const lite = LV.outdoor ? [DIRT[4], DIRT[3]] : [TH().ramp[TH().ramp.length - 1], TH().ramp[5]];
  shockwave(U.fi, U.fj, r1, 0.32, lite, null, false);
  if (SHAKE) G.trauma = 1; U.shakeUntil = Math.max(U.shakeUntil, U.t + 0.5);
  sfx('crack'); sfx('boom');
}
function rockFall(U, n) {
  const foes = enemies.filter(e => ultSees(e) && Math.hypot(e.fi - U.fi, e.fj - U.fj) < ULT_R);
  for (let k = 0; k < n; k++) {
    let p = null; const f = foes.length && k < foes.length * 2 ? foes[k % foes.length] : null;
    if (f) p = [f.fi + (Math.random() - 0.5) * 0.6, f.fj + (Math.random() - 0.5) * 0.6];
    for (let tr = 0; tr < 8 && !p; tr++) { const a = Math.random() * 6.283, d = 1.2 + Math.sqrt(Math.random()) * (ULT_R - 1), c = [U.fi + Math.cos(a) * d, U.fj + Math.sin(a) * d]; if (!blocked(c[0], c[1])) p = c; }
    if (p && !blocked(p[0], p[1])) { const t0 = 0.3 + k * 0.085 + Math.random() * 0.08; G.rocks.push({ fi: p[0], fj: p[1], t: t0, t0, fall: 0.35, s: 0.8 + Math.random() * 0.6 }); }
  }
  U.shakeUntil = Math.max(U.shakeUntil, U.t + 1.3);
}
function upheaval(U, k) {
  ultDmg(U, k, 'heavy', 2, 0, ULT_R, (e, d) => { if (alive(e) && smallFoe(e)) { const l = d || 1; e.kb = [(e.fi - U.fi) / l * 8, (e.fj - U.fj) / l * 8]; } });
  for (let q = 0; q < 26; q++) { const a = q / 26 * 6.283, d = 1.3 + Math.random() * (ULT_R - 1.5), fi = U.fi + Math.cos(a) * d, fj = U.fj + Math.sin(a) * d; if (!blocked(fi, fj)) G.spikes.push({ fi, fj, h: 56 + Math.random() * 34, w: 10 + Math.random() * 6, delay: d * 0.03, t: 0.7, t0: 0.7, seed: (Math.random() * 1e6) | 0, lean: (Math.random() - 0.5) * 0.6 }); }
  const [x, y] = iso(U.fi, U.fj); rubble(x, y, 46, 140);
  for (let q = 0; q < 48; q++) { const a = q / 48 * 6.283; pspawn(5, x, y, 1, Math.cos(a) * 130, Math.sin(a) * 65, 30 + Math.random() * 40, 1, q % 3 ? (LV.outdoor ? DIRT[3] : S[5]) : DIRT[4]); }
  const lite = LV.outdoor ? [DIRT[4], DIRT[3]] : [TH().ramp[TH().ramp.length - 1], TH().ramp[5]];
  shockwave(U.fi, U.fj, ULT_R, 0.4, lite, null, false);
  if (SHAKE) G.trauma = 1; hero.stop = Math.max(hero.stop || 0, 0.08);
  sfx('boom'); sfx('crack'); sfx('crit');
}
// ---- all four: the last blast
function cataFinale(U, k) {
  U.fi = hero.fi; U.fj = hero.fj;
  ultDmg(U, k, 'arcane', 2, 0, ULT_R + 1.5);
  for (const c of U.crystals) { const [x, y] = iso(c.fi, c.fj); burst(5, x, y, c.h * 0.3, 5, 110, 118); } U.crystals = [];
  fireOut(U); U.strikeUntil = U.spearUntil = U.orbUntil = -1; U.dim = false;
  shockwave(U.fi, U.fj, ULT_R, 0.4, [18, 16]); shockwave(U.fi, U.fj, ULT_R + 0.6, 0.52, [27, 118]); shockwave(U.fi, U.fj, ULT_R + 1.2, 0.64, [27, 40]);
  const lite = LV.outdoor ? [DIRT[4], DIRT[3]] : [TH().ramp[TH().ramp.length - 1], TH().ramp[5]]; shockwave(U.fi, U.fj, ULT_R + 1.5, 0.75, lite, null, false);
  skyFx(hero.fi + 0.5, hero.fj + 0.5, true); for (let q = 0; q < 7; q++) { const a = q / 7 * 6.283, d = 2.5 + (q % 2) * 2; skyFx(hero.fi + Math.cos(a) * d, hero.fj + Math.sin(a) * d, q % 3 === 0); }
  const [x, y] = iso(U.fi, U.fj); rubble(x, y, 40, 150);
  for (let q = 0; q < 60; q++) { const a = q / 60 * 6.283, c = [17, 118, 40, 27][q % 4]; pspawn(4, x, y, 8, Math.cos(a) * 190, Math.sin(a) * 95, 20, 0.5, c); }
  G.screenFlash = { t0: 0.3, col: 27 };
  G.flashes.push({ fi: U.fi, fj: U.fj, t: 0.8, t0: 0.8, r: 380 });
  if (SHAKE) G.trauma = 1; hero.stop = Math.max(hero.stop || 0, 0.12);
  sfx('boom'); sfx('zap'); sfx('crack'); sfx('meteor'); sfx('crit');
}
// what happens when, per ultimate: [seconds in, what]
const ELEM_EV = {
  fire: [[0.45, U => { fireRing(U, 2.0, 7, 3); U.fireUntil = 3.0; }], [0.72, U => fireRing(U, 3.6, 11, 3)], [0.99, U => fireRing(U, 5.2, 15, 3)], [3.05, U => fireOut(U)]],
  frost: [[0.4, U => frostNova(U, 2)], [0.55, U => { U.spearUntil = 3.05; U.spearEvery = 0.07; }], [3.3, U => shatterAll(U, 4)]],
  storm: [[0.35, U => { U.strikeUntil = 3.0; U.strikeEvery = 0.085; U.strikeK = 1.5; U.orbUntil = 3.1; }], [3.15, U => thunderclap(U, 3)]],
  earth: [[0.35, U => quakeRing(U, 0, 2.4, 3)], [0.8, U => quakeRing(U, 2.2, 4.4, 3)], [1.25, U => quakeRing(U, 4.2, ULT_R, 3)], [1.45, U => rockFall(U, 14)], [2.85, U => upheaval(U, 2)]],
  all: [[0.6, U => quakeRing(U, 0, 2.4, 4, 1.2)], [0.78, U => quakeRing(U, 2.2, 4.4, 4, 1.2)], [0.96, U => quakeRing(U, 4.2, ULT_R, 4, 1.2)],
    [1.35, U => { fireRing(U, 2.0, 7, 4); U.fireUntil = 4.9; }], [1.5, U => fireRing(U, 3.6, 11, 4)], [1.65, U => fireRing(U, 5.2, 15, 4)],
    [2.4, U => frostNova(U, 3)], [2.5, U => { U.spearUntil = 3.6; U.spearEvery = 0.05; }],
    [3.5, U => { U.strikeUntil = 4.85; U.strikeEvery = 0.06; U.strikeK = 2; U.orbUntil = 4.9; }], [3.6, U => rockFall(U, 10)],
    [5.0, U => cataFinale(U, 30)]],
};
function updateElemUlt(dt) {
  const U = hero.ultOn; U.t += dt;
  const I = ELEM_INFO[U.id], [hx0, hy0] = screenOf(hero);
  // gathering: light in the element's colours drawn in to the staff
  if (U.t < (U.id === 'all' ? 0.6 : 0.4)) for (let q = 0; q < 3; q++) { const a = Math.random() * 6.283, c = U.id === 'all' ? [17, 118, 40, 107][(Math.random() * 4) | 0] : Math.random() < 0.5 ? I.col : I.hi; pspawn(4, hx0 + Math.cos(a) * 52, hy0 + Math.sin(a) * 22, 26, -Math.cos(a) * 190, -Math.sin(a) * 80, 0, 0.26, c); }
  else if (Math.random() < 0.5) { const a = Math.random() * 6.283; pspawn(3, hx0 + Math.cos(a) * 14, hy0 + Math.sin(a) * 6, 10 + Math.random() * 30, 0, 0, 20, 0.4, Math.random() < 0.5 ? I.col : I.hi); }
  while (U.ev.length && U.ev[0][0] <= U.t) U.ev.shift()[1](U);
  updatePairs(U, dt);
  // the pillars burn what stands in the fire
  if (U.t < U.fireUntil) {
    U.fireT -= dt; if (U.fireT <= 0) { U.fireT = 0.3; ultDmg(U, 0.7, 'fire', 0, 0, 6.3); G.flashes.push({ fi: U.fi, fj: U.fj, t: 0.4, t0: 0.4, r: 330, tint: 1 }); }
    for (let q = 0; q < 2; q++) { const p = U.pillars[(Math.random() * U.pillars.length) | 0]; if (p && !p.die) { const [x, y] = iso(p.fi, p.fj); pspawn(3, x + (Math.random() - 0.5) * 8, y, 20 + Math.random() * 30, (Math.random() - 0.5) * 8, 0, 30 + Math.random() * 30, 0.6 + Math.random() * 0.5, Math.random() < 0.5 ? 17 : 16); } }
  }
  if (U.t < U.spearUntil) {
    U.spearT -= dt;
    while (U.spearT <= 0) {
      U.spearT += U.spearEvery;
      const foes = enemies.filter(e => ultSees(e) && Math.hypot(e.fi - U.fi, e.fj - U.fj) < ULT_R);
      let p = null; if (foes.length && Math.random() < 0.7) { const e = foes[(Math.random() * foes.length) | 0]; p = [e.fi + (Math.random() - 0.5) * 0.5, e.fj + (Math.random() - 0.5) * 0.5]; }
      for (let tr = 0; tr < 6 && !p; tr++) { const a = Math.random() * 6.283, d = Math.sqrt(Math.random()) * ULT_R, c = [U.fi + Math.cos(a) * d, U.fj + Math.sin(a) * d]; if (!blocked(c[0], c[1])) p = c; }
      if (p) U.spears.push({ fi: p[0], fj: p[1], t: 0.26, t0: 0.26, seed: (Math.random() * 1e4) | 0 });
    }
    if (Math.random() < 0.7) pspawn(8, hx0 + (Math.random() - 0.5) * 300, hy0 + (Math.random() - 0.5) * 200 + 40, 60 + Math.random() * 40, -8 - Math.random() * 8, 4, -26 - Math.random() * 20, 2.5, Math.random() < 0.5 ? 27 : 118);   // snow
  }
  for (const s of U.spears) { s.t -= dt; if (s.t <= 0 && !s.done) { s.done = true; spearLand(U, s); } }
  U.spears = U.spears.filter(s => !s.done);
  if (U.t < U.strikeUntil) { U.strikeT -= dt; while (U.strikeT <= 0) { U.strikeT += U.strikeEvery; stormStrike(U, U.strikeK); } }
  for (const a of U.arcs) a.t -= dt; U.arcs = U.arcs.filter(a => a.t > 0);
  U.orbs = U.t < U.orbUntil ? Math.min(1, (U.orbs || 0) + dt * 4) : Math.max(0, (U.orbs || 0) - dt * 6);
  U.pillars = U.pillars.filter(p => !p.die || G.t - p.die < 0.35);
  if (U.t < U.shakeUntil && SHAKE) G.trauma = Math.max(G.trauma, 0.5);
  U.dimK = Math.max(0, Math.min(1, (U.dimK || 0) + (U.dim ? dt * 2.5 : -dt * 5)));
  if (!FEEL_OLD) { const D = ELEM_DUR[U.id]; hero.leapZ = U.t < D - 0.3 ? Math.min(1, U.t / 0.3) * (5 + Math.sin(U.t * 5) * 1.2) : Math.max(0, (D - U.t) / 0.3) * 5; }
  if (U.t >= ELEM_DUR[U.id]) {
    if (U.queue.length) { fireOut(U); elemStage(U); }
    else { hero.ultOn = null; hero.leapZ = 0; for (const e of enemies) e.stormN = 0; }
  }
}
// ---- drawing (detail layer, over the bodies)
// a pillar of fire: a tall tapering column that sways and breaks into tongues at the top, white-hot
// down the middle, with a pool of light at its foot
function drawFirePillar(X, Y, H, W, seed, t, grow) {
  const h = Math.round(H * grow); if (h < 3) return;
  for (let b = -W * 0.7; b <= W * 0.7; b++) for (let a = -W * 1.7; a <= W * 1.7; a++) { const d = Math.hypot(a / (W * 1.7), b / (W * 0.7)); if (d > 1) continue; if (d < 0.5) ovSet(Math.round(X + a), Math.round(Y + b), 18); else if (d < 0.78 || ((a + b) & 1)) ovSet(Math.round(X + a), Math.round(Y + b), d < 0.78 ? 17 : 16); }
  const ft = Math.floor(t * 45);
  for (let yy = 0; yy < h; yy++) {
    const u = yy / h, cx = X + Math.sin(yy * 0.13 - t * 11 + seed) * 3.5 * u + Math.sin(yy * 0.31 + t * 17 + seed * 2) * 1.6 * u;
    const half = W * Math.pow(1 - u, 0.6) * (0.8 + 0.2 * Math.sin(yy * 0.4 - t * 20 + seed)) + 1, Yp = Y - yy;
    for (let a = -Math.ceil(half); a <= half; a++) {
      const d = Math.abs(a) / half, xx = Math.round(cx + a);
      if (u > 0.5 && hash(xx >> 1, (yy - ft * 3) >> 1, 7) < (u - 0.5) * 1.5) continue;   // the top breaks into tongues that climb
      ovSet(xx, Yp, d < 0.2 ? (u < 0.3 ? 27 : u < 0.62 ? 18 : 17) : d < 0.45 ? (u < 0.45 ? 18 : u < 0.8 ? 17 : 16) : d < 0.72 ? (u < 0.55 ? 17 : 16) : d < 0.9 ? ((a + yy) & 1 || u < 0.4 ? 16 : 15) : ((a + yy) & 1 ? 15 : 14));
    }
  }
}
// a cluster of ice: one tall shard and two leaning against it, lit from the upper left
function drawIceCluster(X, Y, h, seed, grow) {
  const R = rng(seed);
  for (const [dx, hk, w, lean] of [[-7 - R() * 3, 0.55 + R() * 0.2, 4, -0.3 - R() * 0.2], [7 + R() * 3, 0.45 + R() * 0.2, 3.5, 0.3 + R() * 0.25], [0, 1, 5.5, (R() - 0.5) * 0.2]]) {
    const hh = Math.round(h * hk * grow);
    for (let yy = 0; yy < hh; yy++) {
      const u = yy / hh, half = u < 0.72 ? w * (1 - u * 0.25) : w * 0.82 * (1 - (u - 0.72) / 0.28), cx = X + dx + lean * yy;
      for (let a = Math.floor(-half) - 1; a <= Math.ceil(half) + 1; a++) {
        const x = Math.round(cx + a), y = Y - yy;
        if (Math.abs(a) > half) { if (Math.abs(a) <= half + 1) ovSet(x, y, 115); continue; }
        ovSet(x, y, a < -half * 0.35 ? 27 : a < half * 0.25 ? 118 : 116);
      }
    }
  }
}
function drawElemUlt() {
  if (G.screenFlash) {   // a white (or ice-blue) frame, breaking up as it fades
    const F = G.screenFlash; if (F.at === undefined) F.at = G.t; const k = 1 - (G.t - F.at) / F.t0, c = PAL32[F.col];
    if (k <= 0) G.screenFlash = null;
    else for (let Y = 0; Y < OH; Y++) { const row = ((Y >> 1) & 3) << 2; for (let X = 0; X < OW; X++) if (BAYER[row | ((X >> 1) & 3)] < k * k * 0.6) ov32[Y * OW + X] = c; }
  }
  const U = hero.ultOn; if (!U || U.kind !== 'elem') return;
  const P = (fi, fj, z) => { const [x, y] = iso(fi, fj); return [Math.round(x * SPX - cam2x), Math.round((y - z) * SPX - cam2y)]; };
  if (U.dimK > 0.02) {   // the world goes dark while the Cataclysm builds
    const c = PAL32[BLK], th = U.dimK * 0.42;
    for (let by = 0; by < 4; by++) for (let bx = 0; bx < 4; bx++) { if (BAYER[(by << 2) | bx] >= th) continue; for (let Y = by * 2; Y < OH; Y += 8) for (let X = bx * 2; X < OW - 1; X += 8) { const o = Y * OW + X; ov32[o] = ov32[o + 1] = c; if (Y + 1 < OH) ov32[o + OW] = ov32[o + OW + 1] = c; } }
  }
  // crystals and pillars, back to front
  const items = [];
  for (const c of U.crystals) { const [X, Y] = P(c.fi, c.fj, 0); items.push([Y, 0, X, c]); }
  for (const p of U.pillars) { if (G.t < p.born) continue; const [X, Y] = P(p.fi, p.fj, 0); items.push([Y, 1, X, p]); }
  items.sort((a, b) => a[0] - b[0]);
  for (const [Y, kind, X, o] of items) {
    if (X < -60 || X >= OW + 60 || Y < -20 || Y >= OH + 160) continue;
    if (kind === 0) drawIceCluster(X, Y, o.h, o.seed, Math.min(1, (G.t - o.born) / 0.09));
    else { const up = Math.min(1, (G.t - o.born) / 0.14), down = o.die ? Math.max(0, 1 - (G.t - o.die) / 0.35) : 1; drawFirePillar(X, Y, o.h * (0.9 + 0.1 * Math.sin(G.t * 9 + o.seed)), o.w, o.seed, G.t, up * down); }
  }
  drawPairs(U, P);
  // spears of ice coming down from the upper left: a white core in pale blue, a broken trail behind
  for (const s of U.spears) {
    const k = Math.max(0, s.t / s.t0), [gx, gy] = P(s.fi, s.fj, 0), x0 = gx - k * 70, y0 = gy - k * 250;
    for (let q = 0; q < 110; q++) {
      const x = Math.round(x0 - q * 0.28), y = Math.round(y0 - q);
      if (q < 52) { const hw = q < 8 ? 1 + q * 0.3 : q < 34 ? 3.4 : 3.4 * (52 - q) / 18; for (let a = -Math.ceil(hw) - 1; a <= Math.ceil(hw) + 1; a++) ovSet(x + a, y, Math.abs(a) > hw ? 115 : a < -hw * 0.3 ? 27 : a < hw * 0.4 ? 118 : 117); }
      else if ((q + s.seed) & 1) { ovSet(x, y, 118); if (q < 80) ovSet(x + 1, y, 117); }
    }
    const sr = Math.round(3 + (1 - k) * 7); for (let a = -sr; a <= sr; a++) if ((a + gx) & 1) ovSet(gx + a, gy, 116);   // where it will land
  }
  // arcs leaping between the struck, and ball lightning circling the mage
  for (const a of U.arcs) { const life = a.t / a.t0; boltLine(P(a.a[0], a.a[1], a.a[2]), P(a.b[0], a.b[1], a.b[2]), a.seed, life > 0.4 ? 2 : 1, life, false); }
  if (U.orbs > 0.05) {
    const tip = P(...staffTip(), ORB_Z + 14 + (hero.leapZ || 0));
    for (let q = 0; q < 3; q++) {
      const a = G.t * 3.2 + q * 2.094, [X, Y] = P(hero.fi + Math.cos(a) * 1.5 * U.orbs, hero.fj + Math.sin(a) * 1.5 * U.orbs, 26 + Math.sin(G.t * 4 + q) * 5), r = 10;
      for (let b = -r; b <= r; b++) for (let c = -r; c <= r; c++) { const d = Math.hypot(c, b) / r; if (d > 1) continue; if (d < 0.45) ovSet(X + c, Y + b, 27); else if (d < 0.78 || ((c + b) & 1)) ovSet(X + c, Y + b, d < 0.78 ? 40 : 39); }
      const R = rng(q * 17 + Math.floor(G.t * 30)); for (let f = 0; f < 3; f++) { const fa = R() * 6.283, l = 16 + R() * 14; boltLine([X, Y], [X + Math.cos(fa) * l, Y + Math.sin(fa) * l], q * 31 + f, 1, 1, false); }
      if ((Math.floor(G.t * 12) + q) % 3 === 0) boltLine(tip, [X, Y], q * 53, 2, 1, false);
    }
  }
}
// ---------------------------------------------------------------- the pair ultimates (round 84)
// Two full gauges cast one combined ultimate instead of two in a row. Three: the pair highest in
// PAIR_ORDER, then the third element's own. All of them: the same radius, their own timelines.
const PAIR_ORDER = ['fire+earth', 'fire+storm', 'frost+storm', 'frost+earth', 'earth+storm', 'fire+frost'];
Object.assign(ELEM_INFO, {
  'fire+storm': { ult: 'PLASMA STORM', col: 17, hi: 40 }, 'fire+frost': { ult: 'STEAM BURST', col: 17, hi: 118 }, 'fire+earth': { ult: 'VOLCANO', col: 16, hi: 107 },
  'frost+storm': { ult: 'SHATTERSTORM', col: 118, hi: 40 }, 'frost+earth': { ult: 'GLACIER', col: 118, hi: 107 }, 'earth+storm': { ult: 'MAGNETIC PULL', col: 107, hi: 40 },
});
Object.assign(ELEM_DUR, { 'fire+storm': 4.3, 'fire+frost': 4.2, 'fire+earth': 4.5, 'frost+storm': 4.0, 'frost+earth': 4.0, 'earth+storm': 4.0 });
const FIRE_BOLT = [27, 18, 17, 16];
// run a piece of an ultimate as if it were centred somewhere else (the volcano, the lodestone)
function ultAt(U, c, fn) { const fi = U.fi, fj = U.fj; U.fi = c.fi; U.fj = c.fj; try { fn(); } finally { U.fi = fi; U.fj = fj; } }
// where the thickest knot of foes stands (the Meteor's rule), at least `keep` tiles from the mage; else a little ahead
function ultSpot(U, keep = 1.8) {
  let best = null, bn = -1;
  for (const e of enemies) { if (!ultSees(e) || Math.hypot(e.fi - U.fi, e.fj - U.fj) > 6) continue; let n = 0; for (const o of enemies) if (alive(o) && Math.hypot(o.fi - e.fi, o.fj - e.fj) < 2.4) n++; if (n > bn) { bn = n; best = e; } }
  let [fx, fy] = dirVec(hero.dir), p = best ? [best.fi, best.fj] : [U.fi + fx * 2.8, U.fj + fy * 2.8];
  const d = Math.hypot(p[0] - U.fi, p[1] - U.fj);
  if (d < keep) { const l = d || 1, ux = d ? (p[0] - U.fi) / l : fx, uy = d ? (p[1] - U.fj) / l : fy; p = [U.fi + ux * keep, U.fj + uy * keep]; }
  if (blocked(p[0], p[1])) p = [U.fi, U.fj];
  return { fi: p[0], fj: p[1] };
}
// ---- fire + lightning: PLASMA STORM. Three balls of plasma wheel out from the mage and back in, joined
// by burning lightning; what a ball or a strand touches is scorched and shocked; flames mark their path;
// at the end they meet in the middle and burst.
function plasmaPos(U) {
  const p = U.t - U.plasma.t0, r = p < 2.0 ? 1.0 + 4.6 * (p / 2.0) : Math.max(0.3, 5.6 - 5.3 * Math.min(1, (p - 2.0) / 1.05)), a = p * 2.6 + p * p * 0.5;
  return [0, 1, 2].map(i => [U.fi + Math.cos(a + i * 2.094) * r, U.fj + Math.sin(a + i * 2.094) * r]);
}
const segDist = (px, py, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / l2)); return Math.hypot(px - a[0] - dx * t, py - a[1] - dy * t); };
function plasmaTick(U) {
  const P3 = U.plasma.pos; U.plasma.n = (U.plasma.n || 0) + 1; const fire = U.plasma.n % 2 === 0;
  G.pierce = true;
  for (const e of enemies) {
    if (!ultSees(e)) continue;
    let hit = false; for (let i = 0; i < 3 && !hit; i++) hit = Math.hypot(e.fi - P3[i][0], e.fj - P3[i][1]) < 1.25 || segDist(e.fi, e.fj, P3[i], P3[(i + 1) % 3]) < 0.75;
    if (!hit) continue;
    wake(e); const c = spellCrit(); G.elem = fire ? 'fire' : 'shock'; damageEnemy(e, spellDmg(c ? 4 : 2), U.fi, U.fj, c, 0, true); G.elem = null; if (alive(e)) e.shockT = 3;
    impactFlash(e.fi, e.fj, (e.def.chest || 20) * 0.6, 4);
  }
  G.pierce = false;
  for (const p of P3) if (!blocked(p[0], p[1]) && U.pillars.length < 70) U.pillars.push({ fi: p[0], fj: p[1], born: G.t, die: G.t + 0.45, seed: Math.random() * 100, h: 30 + Math.random() * 16, w: 6 + Math.random() * 2 });
  if (U.plasma.n % 2 === 0) { G.flashes.push({ fi: U.fi, fj: U.fj, t: 0.35, t0: 0.35, r: 300, tint: 1 }); sfx('zap', 0.7); }
  if (U.plasma.n % 5 === 0) sfx('fireball', 0.6);
}
function plasmaBurst(U, k) {
  U.plasma = null;
  explodeAt(U.fi, U.fj, 3.2, k, 2, true);
  ultDmg(U, k * 0.5, 'shock', 1, 3.2, ULT_R + 0.5, e => { if (alive(e)) e.shockT = 3; });
  skyFx(U.fi + 0.4, U.fj + 0.4, true); for (let q = 0; q < 6; q++) { const a = q / 6 * 6.283; skyFx(U.fi + Math.cos(a) * 3.6, U.fj + Math.sin(a) * 3.6, false); }
  shockwave(U.fi, U.fj, ULT_R, 0.45, [18, 16]); shockwave(U.fi, U.fj, ULT_R + 0.5, 0.55, [27, 40]);
  G.screenFlash = { t0: 0.16, col: 18 };
  if (SHAKE) G.trauma = 1;
  sfx('boom'); sfx('zap'); sfx('meteor');
}
// ---- fire + frost: STEAM BURST. Fire meets ice: geysers of scalding steam burst up under the foes, one
// after another, throwing them and blinding them, while a cloud builds; then one great burst of steam.
function steamPuff(U, fi, fj, z, r, vr, vz, life, vi = 0, vj = 0) { if (U.puffs.length < 40) U.puffs.push({ fi, fj, z, r, vr, vz, vi, vj, t: life, t0: life, seed: (Math.random() * 1e4) | 0 }); }
function steamGeyser(U) {
  const foes = enemies.filter(e => ultSees(e) && Math.hypot(e.fi - U.fi, e.fj - U.fj) < ULT_R);
  let p = null;
  if (foes.length && Math.random() < 0.8) { foes.sort((a, b) => (a.stormN || 0) - (b.stormN || 0) || Math.random() - 0.5); const e = foes[0]; e.stormN = (e.stormN || 0) + 1; p = [e.fi, e.fj]; }
  for (let tr = 0; tr < 6 && !p; tr++) { const a = Math.random() * 6.283, d = 1 + Math.sqrt(Math.random()) * (ULT_R - 1), c = [U.fi + Math.cos(a) * d, U.fj + Math.sin(a) * d]; if (!blocked(c[0], c[1])) p = c; }
  if (!p) return;
  U.geysers.push({ fi: p[0], fj: p[1], born: G.t, seed: (Math.random() * 1e4) | 0, h: 100 + Math.random() * 50 });
  G.pierce = true;
  for (const e of enemies) if (ultSees(e) && Math.hypot(e.fi - p[0], e.fj - p[1]) < 1.05 + (e.def.unique ? 0.4 : 0)) {
    const c = spellCrit(); G.elem = 'fire'; damageEnemy(e, spellDmg(c ? 6 : 3), p[0], p[1], c, 1, true); G.elem = null;
    if (alive(e) && !e.def.unique) { e.stun = Math.max(e.stun || 0, 1.4); if (smallFoe(e) && !(e.frozen > 0)) { e.downT = e.downT0 = Math.max(e.downT || 0, 0.9); e.atk = -1; } }
  }
  G.pierce = false;
  steamPuff(U, p[0], p[1], 70 + Math.random() * 30, 12, 20, 14, 1.6 + Math.random(), (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8);
  steamPuff(U, p[0], p[1], 8, 6, 26, 4, 0.7);
  const [x, y] = iso(p[0], p[1]); burst(2, x, y, 4, 6, 90, 27); for (let q = 0; q < 8; q++) { const a = q / 8 * 6.283; pspawn(4, x, y, 2, Math.cos(a) * 60, Math.sin(a) * 30, 0, 0.22, q % 2 ? 27 : 118); }
  G.flashes.push({ fi: p[0], fj: p[1], t: 0.2, t0: 0.2, r: 110 });
  if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.1);
  sfx('sizzle'); if (Math.random() < 0.5) sfx('whoomp', 0.6);
}
function steamBlast(U, k) {
  U.geyserUntil = -1;
  ultDmg(U, k, 'fire', 2, 0, ULT_R + 0.3, e => { if (alive(e) && !e.def.unique) e.stun = Math.max(e.stun || 0, 2.4); });
  for (let q = 0; q < 26; q++) { const a = q / 26 * 6.283, d = 0.6 + (q % 3) * 0.5; steamPuff(U, U.fi + Math.cos(a) * d, U.fj + Math.sin(a) * d, 10 + (q % 4) * 14, 13, 34, 10, 1.1 + (q % 3) * 0.3, Math.cos(a) * 4.6, Math.sin(a) * 4.6); }
  U.geysers.push({ fi: U.fi + 0.5, fj: U.fj + 0.5, born: G.t, seed: 7, h: 190, big: true });
  shockwave(U.fi, U.fj, ULT_R, 0.45, [27, 32]); shockwave(U.fi, U.fj, ULT_R * 0.7, 0.4, [18, 16]); shockwave(U.fi, U.fj, ULT_R * 0.85, 0.5, [27, 118]);
  G.screenFlash = { t0: 0.14, col: 27 }; G.flashes.push({ fi: U.fi, fj: U.fj, t: 0.5, t0: 0.5, r: 330 });
  if (SHAKE) G.trauma = 1;
  sfx('whoomp'); sfx('boom'); sfx('sizzle');
}
// ---- fire + earth: VOLCANO. A cone of rock heaves up where the foes stand thickest and hurls
// lava bombs at them; each leaves a burning pool; it ends in one last eruption.
function volcRise(U) {
  const c = ultSpot(U, 2.4); U.volc = { fi: c.fi, fj: c.fj, born: G.t, die: 0, seed: (Math.random() * 1e4) | 0 };
  ultAt(U, c, () => quakeRing(U, 0, 2.3, 3));
  const [x, y] = iso(c.fi, c.fj); rubble(x, y, 30, 110);
  G.flashes.push({ fi: c.fi, fj: c.fj, t: 0.5, t0: 0.5, r: 200, tint: 1 });
  sfx('boom'); sfx('crack'); sfx('meteor');
}
function volcBomb(U) {
  const v = U.volc, foes = enemies.filter(e => ultSees(e) && Math.hypot(e.fi - v.fi, e.fj - v.fj) < 6.8 && Math.hypot(e.fi - v.fi, e.fj - v.fj) > 0.8);
  let p = null;
  if (foes.length && Math.random() < 0.78) { const e = foes[(Math.random() * foes.length) | 0]; p = [e.fi + (Math.random() - 0.5) * 0.7, e.fj + (Math.random() - 0.5) * 0.7]; }
  for (let tr = 0; tr < 6 && !p; tr++) { const a = Math.random() * 6.283, d = 1.6 + Math.random() * 4, c = [v.fi + Math.cos(a) * d, v.fj + Math.sin(a) * d]; if (!blocked(c[0], c[1])) p = c; }
  if (!p || blocked(p[0], p[1])) return;
  const d = Math.hypot(p[0] - v.fi, p[1] - v.fj);
  U.bombs.push({ a: [v.fi, v.fj], b: p, t: 0, dur: 0.5 + d * 0.05, h: 80 + d * 9, seed: (Math.random() * 1e4) | 0 });
  const [x, y] = iso(v.fi, v.fj); burst(2, x, y, 46, 5, 120, 18); burst(3, x, y, 46, 3, 40, 16);
  if (Math.random() < 0.5) sfx('fireball', 0.7);
}
function volcLand(U, b) {
  const [fi, fj] = b.b;
  G.pierce = true;
  for (const e of enemies) if (ultSees(e) && Math.hypot(e.fi - fi, e.fj - fj) < 1.25 + (e.def.unique ? 0.4 : 0)) { const c = spellCrit(); G.elem = 'fire'; damageEnemy(e, spellDmg(c ? 7 : 3.5), fi, fj, c, 1, true); G.elem = null; }
  G.pierce = false;
  U.pools.push({ fi, fj, r: 0.95 + Math.random() * 0.3, born: G.t, die: G.t + 2.4, seed: b.seed });
  const [x, y] = iso(fi, fj); burst(2, x, y, 4, 12, 110, 17); burst(3, x, y, 4, 5, 40, 16); burst(7, x, y, 3, 4, 70, LAVA[2]);
  shockwave(fi, fj, 1.25, 0.24, [18, 16]); impactFlash(fi, fj, 6, 6);
  stampBlood(Math.round(x), Math.round(y), 4, b.seed, [2, 3, 3, 4, 5]);
  if (U.bombN++ % 2 === 0) G.blasts.push({ fi, fj, r: 1.1, t: 0.46, t0: 0.46, big: false, bloom: true, seed: Math.random() * 100 });
  G.flashes.push({ fi, fj, t: 0.3, t0: 0.3, r: 120, tint: 1 });
  if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.14);
  sfx('boom', 0.7);
}
function volcEnd(U, k) {
  const v = U.volc; if (!v) return; U.bombUntil = -1;
  ultAt(U, v, () => { explodeAt(v.fi, v.fj, 3.2, k, 2, true); ultDmg(U, k * 0.4, 'fire', 1, 3.2, ULT_R + 1); });
  for (let q = 0; q < 10; q++) { const a = q / 10 * 6.283, d = 1.4 + (q % 3) * 0.9, p = [v.fi + Math.cos(a) * d, v.fj + Math.sin(a) * d]; if (!blocked(p[0], p[1])) U.pools.push({ fi: p[0], fj: p[1], r: 0.9, born: G.t, die: G.t + 1.2, seed: q * 31 }); }
  const [x, y] = iso(v.fi, v.fj); burst(2, x, y, 46, 40, 220, 18); burst(7, x, y, 40, 16, 150, LAVA[3]); rubble(x, y, 30, 140);
  v.die = G.t; G.screenFlash = { t0: 0.14, col: 18 };
  if (SHAKE) G.trauma = 1;
  sfx('boom'); sfx('meteor'); sfx('crack');
}
// ---- frost + lightning: SHATTERSTORM. Everything freezes solid, then lightning finds the frozen one
// by one: each bursts in a spray of ice that cuts what stands near and spreads the ice further.
function shatterFreeze(U) {
  frostNova(U, 2);
  for (const e of enemies) if (ultSees(e) && Math.hypot(e.fi - U.fi, e.fj - U.fj) < ULT_R && U.crystals.length < 44) U.crystals.push({ fi: e.fi + 0.25, fj: e.fj + 0.25, born: G.t, h: 30 + Math.random() * 22, seed: (Math.random() * 1e4) | 0 });
}
function shatterStrike(U) {
  const foes = enemies.filter(e => ultSees(e) && Math.hypot(e.fi - U.fi, e.fj - U.fj) < ULT_R + 0.5);
  if (!foes.length) { if (Math.random() < 0.4) { const a = Math.random() * 6.283, d = 1.5 + Math.random() * 4; skyFx(U.fi + Math.cos(a) * d, U.fj + Math.sin(a) * d, false); sfx('zap', 0.7); } return; }
  foes.sort((a, b) => (a.stormN || 0) - (b.stormN || 0) || (b.frozen > 0) - (a.frozen > 0) || Math.random() - 0.5);
  const e = foes[0]; e.stormN = (e.stormN || 0) + 1; const at = chestOf(e), [fi, fj] = [e.fi, e.fj];
  G.pierce = true;
  { const c = spellCrit(); G.elem = 'shock'; damageEnemy(e, spellDmg(c ? 6 : 3), fi - 0.1, fj - 0.1, c, 1, true); G.elem = null; if (alive(e)) e.shockT = 3; }
  for (const o of enemies) if (o !== e && ultSees(o) && Math.hypot(o.fi - fi, o.fj - fj) < 1.5) { const c = spellCrit(); G.elem = 'cold'; damageEnemy(o, spellDmg(c ? 2 : 1), fi, fj, c, 0, true); G.elem = null; if (!(o.frozen > 0)) freezeFoe(o, 1.4); }
  G.pierce = false;
  skyFx(fi, fj, false);
  const [x, y] = iso(fi, fj); burst(5, x, y, 12, 9, 120, 118); burst(4, x, y, 12, 8, 110, 27);
  for (let q = 0; q < 12; q++) { const a = q / 12 * 6.283; pspawn(4, x, y, 10, Math.cos(a) * 130, Math.sin(a) * 65, 10, 0.2, q % 2 ? 118 : 27); }
  U.crystals = U.crystals.filter(c => Math.hypot(c.fi - fi, c.fj - fj) > 0.9);
  for (let q = 0; q < 2 && U.crystals.length < 44; q++) { const a = Math.random() * 6.283, d = 0.7 + Math.random() * 0.8, p = [fi + Math.cos(a) * d, fj + Math.sin(a) * d]; if (!blocked(p[0], p[1])) U.crystals.push({ fi: p[0], fj: p[1], born: G.t, h: 18 + Math.random() * 16, seed: (Math.random() * 1e4) | 0 }); }
  if (U.lastAt && Math.hypot(U.lastAt[0] - at[0], U.lastAt[1] - at[1]) < 6) U.arcs.push({ a: U.lastAt, b: at, t: 0.24, t0: 0.24, seed: (Math.random() * 1e6) | 0 });
  U.lastAt = at;
  if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.1);
  sfx('zap'); sfx('crack', 0.5);
}
function shatterFinale(U, k) {
  U.shatUntil = -1;
  skyFx(U.fi + 0.5, U.fj + 0.5, true);
  const [x, y] = iso(U.fi, U.fj); for (let q = 0; q < 56; q++) { const a = q / 56 * 6.283; pspawn(4, x, y, 8, Math.cos(a) * 230, Math.sin(a) * 115, 6, 0.42, q % 3 ? 118 : 27); }
  shatterAll(U, k); shockwave(U.fi, U.fj, ULT_R + 0.5, 0.5, [27, 40]);
  sfx('zap');
}
// ---- frost + earth: GLACIER. Two walls of ice grind in from the sides, shoving everything before
// them, and slam together; what is caught is crushed and frozen; then the glacier bursts apart.
const GL_AX = [1, 0], GL_PX = [0, 1];   // the walls run along one tile axis (a long diagonal on screen) and close along the other
function glacierStart(U) {
  U.walls = { t0: U.t, d: 6.2, slam: 0, seed: (Math.random() * 1e4) | 0 };
  const qk = { fi: U.fi, fj: U.fj, a0: 0, ring: true, R: 5.5, t: 0.7, t0: 0.7, seed: (Math.random() * 1e6) | 0 }; G.quakes.push(qk); stampCracks(qk);
  U.shakeUntil = U.t + 1.35;
  sfx('crack'); sfx('frost'); sfx('boom', 0.6);
}
function glacierPush(U, dt) {
  const Wl = U.walls, p = Math.min(1, (U.t - Wl.t0) / 1.3); Wl.d = 6.2 - 5.65 * p * p;
  const lim = Math.max(0.3, Wl.d - 0.75);
  for (const e of enemies) {
    if (!ultSees(e)) continue; const dx = e.fi - U.fi, dy = e.fj - U.fj; if (Math.hypot(dx, dy) > ULT_R + 1.5) continue;
    const s = dx * GL_AX[0] + dy * GL_AX[1]; if (Math.abs(s) <= lim) continue;
    const mv = Math.sign(s) * lim - s; tryMove(e, GL_AX[0] * mv, GL_AX[1] * mv); wake(e);
    if (!e.def.unique) { e.stun = Math.max(e.stun || 0, 0.3); e.atk = -1; e.windT = 0; }
  }
  if (Math.random() < 0.7) for (const sd of [1, -1]) { const j = (Math.random() - 0.5) * 9, fi = U.fi + GL_AX[0] * sd * Wl.d + GL_PX[0] * j, fj = U.fj + GL_AX[1] * sd * Wl.d + GL_PX[1] * j; if (blocked(fi, fj)) continue; const [x, y] = iso(fi, fj); pspawn(5, x, y, 2, -sd * 30, 0, 30 + Math.random() * 30, 1, Math.random() < 0.5 ? 118 : (LV.outdoor ? DIRT[3] : S[5])); if (Math.random() < 0.3) rubble(x, y, 2, 50); }
}
function glacierSlam(U, k) {
  const Wl = U.walls; if (!Wl) return; Wl.slam = G.t; Wl.d = 0.55;
  ultDmg(U, k, 'cold', 2, 0, ULT_R + 1, e => freezeFoe(e, 2.6));
  const [x, y] = iso(U.fi, U.fj);
  for (let j = -5; j <= 5; j++) { const [px, py] = iso(U.fi + GL_PX[0] * j, U.fj + GL_PX[1] * j); burst(5, px, py, 20, 5, 130, 118); burst(4, px, py, 30, 4, 120, 27); if (j % 2 === 0) rubble(px, py, 4, 90); }
  shockwave(U.fi, U.fj, ULT_R, 0.45, [27, 118]);
  const lite = LV.outdoor ? [DIRT[4], DIRT[3]] : [TH().ramp[TH().ramp.length - 1], TH().ramp[5]]; shockwave(U.fi, U.fj, ULT_R * 0.8, 0.4, lite, null, false);
  G.frost.push({ fi: U.fi, fj: U.fj, a0: 0, t: 4, seed: (Math.random() * 1e6) | 0, R: 3.6, half: Math.PI, ring0: 0 });
  G.screenFlash = { t0: 0.14, col: 118 }; G.flashes.push({ fi: U.fi, fj: U.fj, t: 0.6, t0: 0.6, r: 330, tint: 2 });
  if (SHAKE) G.trauma = 1; hero.stop = Math.max(hero.stop || 0, 0.1);
  void x; void y; sfx('boom'); sfx('crack'); sfx('frost'); sfx('crit');
}
function glacierShatter(U, k) {
  if (!U.walls) return;
  ultDmg(U, k, 'heavy', 2, 0, ULT_R + 1, (e, d) => { if (alive(e) && smallFoe(e) && !(e.frozen > 0)) { const l = d || 1; e.kb = [(e.fi - U.fi) / l * 7, (e.fj - U.fj) / l * 7]; } });
  for (let j = -5; j <= 5; j++) for (const sd of [1, -1]) { const [px, py] = iso(U.fi + GL_AX[0] * sd * 0.55 + GL_PX[0] * j, U.fj + GL_AX[1] * sd * 0.55 + GL_PX[1] * j); burst(5, px, py, 26, 5, 150, 118); burst(2, px, py, 26, 3, 120, 27); }
  U.walls = null;
  shockwave(U.fi, U.fj, ULT_R, 0.4, [27, 118]);
  if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.7);
  sfx('crack'); sfx('boom'); sfx('frost');
}
// ---- lightning + earth: MAGNETIC PULL. A lodestone tears itself out of the ground and hangs crackling;
// lightning leashes every foe and hauls it in, with half the floor's rubble; then the stone bursts.
function magnetRise(U) {
  const c = ultSpot(U, 1.9); U.magnet = { fi: c.fi, fj: c.fj, born: G.t, tick: 0, seed: (Math.random() * 1e4) | 0 };
  skyFx(c.fi, c.fj, false);
  const [x, y] = iso(c.fi, c.fj); rubble(x, y, 20, 90);
  const qk = { fi: c.fi, fj: c.fj, a0: 0, ring: true, R: 2.2, t: 0.7, t0: 0.7, seed: (Math.random() * 1e6) | 0 }; G.quakes.push(qk); stampCracks(qk);
  U.shakeUntil = U.t + 2.2;
  sfx('crack'); sfx('zap'); sfx('whoomp');
}
function magnetPull(U, dt) {
  const M = U.magnet; M.tick -= dt; const tick = M.tick <= 0; if (tick) M.tick = 0.25;
  M.held = [];
  G.pierce = true;
  for (const e of enemies) {
    if (!ultSees(e)) continue; const dx = M.fi - e.fi, dy = M.fj - e.fj, d = Math.hypot(dx, dy); if (d > 7.6) continue;
    wake(e); M.held.push(e);
    if (d > 0.75) { const sp = (e.def.unique ? 1.2 : smallFoe(e) ? 4.2 : 2.8) * dt * Math.min(1, (G.t - M.born) / 0.3), st = Math.min(sp, d - 0.7); tryMove(e, dx / d * st, dy / d * st); }
    if (!e.def.unique) { e.stun = Math.max(e.stun || 0, 0.3); e.atk = -1; e.windT = 0; }
    if (tick) { G.elem = 'shock'; damageEnemy(e, spellDmg(0.8), M.fi, M.fj, false, 0, true); G.elem = null; if (alive(e)) e.shockT = 3; }
  }
  G.pierce = false;
  if (tick) { sfx('zap', 0.5); G.flashes.push({ fi: M.fi, fj: M.fj, t: 0.3, t0: 0.3, r: 170, tint: 2 }); }
  // the floor's rubble flies to it
  if (Math.random() < 0.8) { const a = Math.random() * 6.283, d = 2.5 + Math.random() * 3.5, [x, y] = iso(M.fi + Math.cos(a) * d, M.fj + Math.sin(a) * d), [mx, my] = iso(M.fi, M.fj); pspawn(4, x, y, 2, (mx - x) / 0.45, (my - y) / 0.45, 70, 0.45, Math.random() < 0.5 ? (LV.outdoor ? DIRT[3] : S[6]) : 40); }
}
function magnetBlast(U, k) {
  const M = U.magnet; if (!M) return;
  ultAt(U, M, () => {
    ultDmg(U, k, 'shock', 2, 0, 2.7, (e, d) => { if (alive(e)) { e.shockT = 3; if (!e.def.unique) e.stun = Math.max(e.stun || 0, 1.5); if (smallFoe(e)) { const l = d || 1; e.kb = [(e.fi - M.fi) / l * 9, (e.fj - M.fj) / l * 9]; } } });
    ultDmg(U, k * 0.4, 'heavy', 1, 2.7, ULT_R + 1);
    quakeRing(U, 0.3, 3.2, 0, 1.2);
    shockwave(M.fi, M.fj, ULT_R, 0.5, [27, 40]);
  });
  skyFx(M.fi, M.fj, true); for (let q = 0; q < 5; q++) { const a = q / 5 * 6.283; skyFx(M.fi + Math.cos(a) * 2.6, M.fj + Math.sin(a) * 2.6, false); }
  const [x, y] = iso(M.fi, M.fj); rubble(x, y, 50, 170); burst(7, x, y, 34, 14, 160, LV.outdoor ? DIRT[2] : S[5]);
  U.magnet = null; G.screenFlash = { t0: 0.16, col: 27 };
  if (SHAKE) G.trauma = 1; hero.stop = Math.max(hero.stop || 0, 0.1);
  sfx('boom'); sfx('zap'); sfx('crack'); sfx('crit');
}
Object.assign(ELEM_EV, {
  'fire+storm': [[0.4, U => { U.plasma = { t0: U.t, tick: 0, pos: null }; sfx('zap'); sfx('fireball'); }], [3.5, U => plasmaBurst(U, 6)]],
  'fire+frost': [[0.4, U => { shockwave(U.fi, U.fj, 3, 0.3, [18, 16]); shockwave(U.fi, U.fj, 3.4, 0.36, [27, 118]); U.geyserUntil = 2.95; U.geyserT = 0; sfx('sizzle'); sfx('frost'); }], [3.15, U => steamBlast(U, 7)]],
  'fire+earth': [[0.4, U => volcRise(U)], [0.85, U => { U.bombUntil = 3.5; U.bombT = 0; }], [3.7, U => volcEnd(U, 8)]],
  'frost+storm': [[0.4, U => shatterFreeze(U)], [0.85, U => { U.shatUntil = 2.95; U.shatT = 0; }], [3.1, U => shatterFinale(U, 5)]],
  'frost+earth': [[0.45, U => glacierStart(U)], [1.75, U => glacierSlam(U, 14)], [3.0, U => glacierShatter(U, 6)]],
  'earth+storm': [[0.4, U => magnetRise(U)], [2.75, U => magnetBlast(U, 14)]],
});
// the continuous parts of the pair ultimates (called from updateElemUlt)
function updatePairs(U, dt) {
  if (U.plasma) { U.plasma.pos = plasmaPos(U); U.plasma.tick -= dt; if (U.plasma.tick <= 0) { U.plasma.tick = 0.15; plasmaTick(U); } }
  if (U.t < U.geyserUntil) {
    U.geyserT -= dt; while (U.geyserT <= 0) { U.geyserT += 0.085; steamGeyser(U); }
    U.blindT = (U.blindT || 0) - dt; if (U.blindT <= 0) { U.blindT = 0.4; ultDmg(U, 0.4, null, 0, 0, ULT_R * 0.85, e => { if (alive(e) && !e.def.unique) e.stun = Math.max(e.stun || 0, 0.6); }); }
    if (Math.random() < 0.5) { const a = Math.random() * 6.283, d = Math.sqrt(Math.random()) * ULT_R * 0.8; steamPuff(U, U.fi + Math.cos(a) * d, U.fj + Math.sin(a) * d, 30 + Math.random() * 50, 11, 12, 5, 1.6 + Math.random(), (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6); }
  }
  for (const g of U.geysers) if (G.t - g.born > (g.big ? 0.9 : 0.6)) g.done = true; U.geysers = U.geysers.filter(g => !g.done);
  for (const p of U.puffs) { p.t -= dt; p.fi += p.vi * dt; p.fj += p.vj * dt; p.z += p.vz * dt; p.r += p.vr * dt; p.vr *= Math.exp(-dt * 2.2); p.vi *= Math.exp(-dt * 2.5); p.vj *= Math.exp(-dt * 2.5); } U.puffs = U.puffs.filter(p => p.t > 0);
  if (U.volc && U.t < U.bombUntil) {
    U.bombT -= dt; while (U.bombT <= 0) { U.bombT += 0.115; volcBomb(U); }
    if (Math.random() < 0.9) { const [x, y] = iso(U.volc.fi, U.volc.fj); pspawn(2, x + (Math.random() - 0.5) * 8, y, 46, (Math.random() - 0.5) * 70, (Math.random() - 0.5) * 30, 80 + Math.random() * 130, 0.5, Math.random() < 0.5 ? 18 : 17); if (Math.random() < 0.4) pspawn(8, x + (Math.random() - 0.5) * 10, y, 60, (Math.random() - 0.5) * 6, 3, 26 + Math.random() * 16, 1.8, Math.random() < 0.5 ? 4 : 5); }
    if (Math.random() < 0.15) G.flashes.push({ fi: U.volc.fi, fj: U.volc.fj, t: 0.4, t0: 0.4, r: 230, tint: 1 });
  }
  for (const b of U.bombs) { b.t += dt; if (b.t >= b.dur && !b.done) { b.done = true; volcLand(U, b); } else if (!b.done && Math.random() < 0.7) { const u = b.t / b.dur, [x, y] = iso(b.a[0] + (b.b[0] - b.a[0]) * u, b.a[1] + (b.b[1] - b.a[1]) * u); pspawn(3, x, y, 40 * (1 - u) + Math.sin(u * Math.PI) * b.h, 0, 0, 4, 0.3, Math.random() < 0.5 ? 17 : 4); } }
  U.bombs = U.bombs.filter(b => !b.done);
  if (U.pools.length) {
    U.poolT = (U.poolT || 0) - dt;
    if (U.poolT <= 0) { U.poolT = 0.35; G.pierce = true; G.elem = 'fire'; for (const e of enemies) { if (!ultSees(e)) continue; if (U.pools.some(p => G.t < p.die && Math.hypot(e.fi - p.fi, e.fj - p.fj) < p.r)) damageEnemy(e, spellDmg(0.6), e.fi, e.fj, false, 0, true); } G.elem = null; G.pierce = false; }
    U.pools = U.pools.filter(p => G.t < p.die + 0.3);
  }
  if (U.volc && U.volc.die && G.t - U.volc.die > 0.6) U.volc = null;
  if (U.t < U.shatUntil) { U.shatT -= dt; while (U.shatT <= 0) { U.shatT += 0.105; shatterStrike(U); } }
  if (U.walls && !U.walls.slam) glacierPush(U, dt);
  if (U.magnet) magnetPull(U, dt);
}
// ---- drawing the pair ultimates
// world layer (under the bodies): the volcano's burning pools
function drawElemGround() {
  const U = hero.ultOn; if (!U || U.kind !== 'elem' || !U.pools.length) return;
  const ft = Math.floor(G.t * 8);
  for (const p of U.pools) {
    const [x0, y0] = iso(p.fi, p.fj), cx = Math.round(x0 - camX), cy = Math.round(y0 - camY), k = Math.min(1, (G.t - p.born) / 0.15) * Math.max(0, Math.min(1, (p.die + 0.3 - G.t) / 0.3)), rx = Math.round(p.r * 21 * k), ry = Math.round(rx / 2);
    if (rx < 2 || cx + rx < 0 || cx - rx >= W || cy + ry < 0 || cy - ry >= H) continue;
    for (let b = -ry; b <= ry; b++) for (let a = -rx; a <= rx; a++) {
      const X = cx + a, Y = cy + b; if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
      const o = Y * W + X; if (cid[o] || scr[o] === BLK) continue;
      const d = Math.hypot(a / rx, b / ry) + (hash(X + camX, Y + camY, p.seed) - 0.5) * 0.3; if (d > 1) continue;
      scr[o] = d > 0.82 ? (hash(X + camX, Y + camY, 5) < 0.5 ? BLK : LAVA[0] | EMIS) : (LAVA[(((Math.floor(d * 5 + (X + camX + Y + camY) * 0.2) - ft) % 6) + 6) % 6] | EMIS);
    }
  }
}
// a soft ball of steam: a dithered disc, white in the middle, thinning as it ages
function drawPuff(X, Y, r, life, seed) {
  const R = Math.min(34, Math.round(r)) & ~1; if (R < 4) return;
  const q = rng(seed), lobes = [[0, 0, 0.72], [(q() - 0.5) * 0.9, (q() - 0.5) * 0.5, 0.55], [(q() - 0.5) * 0.9, (q() - 0.5) * 0.5, 0.5], [(q() - 0.5) * 0.7, -0.25 - q() * 0.2, 0.45]];
  X &= ~1; Y &= ~1;
  for (let b = -R; b <= R; b += 2) {   // (in 2 x 2 blocks, on the world's pixel grid: a quarter of the work, and the dither lines up)
    const y = Y + b; if (y < 0 || y >= OH - 1) continue; const row = ((y >> 1) & 3) << 2, v = b / R;
    for (let a = -R; a <= R; a += 2) {
      const x = X + a; if (x < 0 || x >= OW - 1) continue; const u = a / R;
      let d2 = 9; for (const [lx, ly, lr] of lobes) { const dx = u - lx, dy = (v - ly) * 1.25, t = (dx * dx + dy * dy) / (lr * lr); if (t < d2) d2 = t; } if (d2 >= 1) continue;
      const den = (1 - Math.sqrt(d2)) * life * 1.25; if (den < BAYER[row | ((x >> 1) & 3)] * 0.85 + 0.06) continue;
      const c = PAL32[den > 0.62 && a + b * 2 < 0 ? 27 : den > 0.3 ? 32 : 31], o = y * OW + x; ov32[o] = ov32[o + 1] = ov32[o + OW] = ov32[o + OW + 1] = c;
    }
  }
}
function drawPairs(U, P) {
  // the glacier's two walls: a rank of tall ice on a footing of broken rock
  if (U.walls) {
    const Wl = U.walls, rise = Math.min(1, (U.t - Wl.t0) / 0.25), tall = Wl.slam ? 1.25 : 1, ramp = LV.outdoor ? DIRT : TH().ramp;
    const row = [];
    for (const sd of [1, -1]) for (let j = -5; j <= 5; j++) { const fi = U.fi + GL_AX[0] * sd * Wl.d + GL_PX[0] * j * 0.95, fj = U.fj + GL_AX[1] * sd * Wl.d + GL_PX[1] * j * 0.95; if (blocked(fi, fj)) continue; const [X, Y] = P(fi, fj, 0); row.push([Y, X, sd, j]); }
    row.sort((a, b) => a[0] - b[0]);
    for (const [Y, X, sd, j] of row) {
      const seed = Wl.seed + (sd > 0 ? 100 : 0) + j * 7, jit = Wl.slam ? 0 : (Math.floor(G.t * 30 + j) % 2) * sd;
      for (let b = -4; b <= 3; b++) for (let a = -14; a <= 14; a++) if (a * a / 196 + b * b / 14 <= 1) ovSet(X + a + jit, Y + b + 2, b < -1 ? ramp[Math.min(ramp.length - 1, 4)] : (a + b) & 1 ? ramp[2] : ramp[1]);
      drawIceCluster(X + jit, Y, (62 + ((seed * 13) % 26)) * tall, seed, rise);
    }
  }
  // steam: the geysers' columns, then the cloud
  for (const g of U.geysers) {
    const age = G.t - g.born, life = g.big ? 0.9 : 0.6, k = age / life, [X, Y] = P(g.fi, g.fj, 0), h = Math.round(g.h * Math.min(1, age / 0.09)), w0 = g.big ? 16 : 8;
    for (let yy = 0; yy < h; yy++) {
      const u = yy / h, half = w0 * (0.7 + u * 0.9) + Math.sin(yy * 0.22 - G.t * 26 + g.seed) * 1.5, cx = X + Math.sin(yy * 0.08 + g.seed) * 3 * u;
      for (let a = -Math.ceil(half); a <= half; a++) { const d = Math.abs(a) / half, x = Math.round(cx + a), y = Y - yy; if (x < 0 || y < 0 || x >= OW || y >= OH) continue; if (k > 0.45 && BAYER[(((y >> 1) & 3) << 2) | ((x >> 1) & 3)] < (k - 0.45) * 1.9) continue; if (d > 0.7 && ((x + y + Math.floor(G.t * 30)) & 1)) continue; ov32[y * OW + x] = PAL32[d < 0.35 ? 27 : d < 0.7 ? 32 : 31]; }
    }
    drawPuff(X, Y - h, (g.big ? 46 : 22) * Math.min(1, age / 0.2), 1 - k * 0.7, g.seed);
    for (let a = -w0 * 2; a <= w0 * 2; a++) if ((a + X) & 1) { ovSet(X + a, Y, 27); ovSet(X + a, Y + 1, 32); }
  }
  for (const p of U.puffs) { const [X, Y] = P(p.fi, p.fj, p.z); drawPuff(X, Y, p.r * SPX, Math.min(1, p.t / p.t0 * 1.6), p.seed); }
  // the volcano: a cone of dark rock with lava running down it and a white-hot mouth; its bombs in the air
  if (U.volc) {
    const v = U.volc, [X, Y] = P(v.fi, v.fj, 0), up = Math.min(1, (G.t - v.born) / 0.35) * (v.die ? Math.max(0, 1 - (G.t - v.die) / 0.6) : 1), Hh = Math.round(92 * up), ft = Math.floor(G.t * 10);
    for (let yy = 0; yy < Hh; yy++) {
      const u = yy / 92, half = 64 * Math.pow(1 - u, 1.25) + 15 + (hash(yy >> 2, v.seed, 3) - 0.5) * 6 * (1 - u);   // a concave cone with a ragged edge
      for (let a = -Math.ceil(half); a <= half; a++) {
        const x = X + a, y = Y + 6 - yy, q = a / half;
        // three rivers of lava winding down from the mouth, wider toward the foot, flowing
        let lava = 0; for (const [off, ph] of [[-0.55, 0], [0.1, 2.1], [0.62, 4.2]]) { const c = off * half * (1 - u * 0.75) + Math.sin(yy * 0.13 + ph + v.seed) * 3.2, w = 1.4 + (1 - u) * 2.6, dd = Math.abs(a - c); if (dd < w) lava = Math.max(lava, dd < w * 0.45 ? 2 : 1); }
        const rock = q < -0.4 ? STEEL[2] : q < 0.15 ? STEEL[1] : STEEL[0], crag = hash(a >> 2, yy >> 2, v.seed) < 0.09;
        ovSet(x, y, Math.abs(q) > 0.95 ? BLK : lava === 2 ? (hash(a >> 1, (yy + ft * 2) >> 1, 1) < 0.5 ? 18 : 17) : lava === 1 ? (hash(a, yy + ft, 2) < 0.5 ? 17 : 16) : crag ? (q < 0.15 ? STEEL[0] : BLK) : rock);
      }
    }
    if (up > 0.6) { for (let b = -5; b <= 5; b++) for (let a = -15; a <= 15; a++) { const d = Math.hypot(a / 15, b / 5); if (d <= 1) ovSet(X + a, Y + 6 - Hh + b, d < 0.5 ? 27 : d < 0.8 ? 18 : 17); } }
    if (up > 0.6 && !v.die) drawFirePillar(X, Y + 4 - Hh, 46 + Math.sin(G.t * 13) * 10, 9, v.seed, G.t, 1);
  }
  for (const b of U.bombs) {
    const u = Math.min(1, b.t / b.dur), [X, Y] = P(b.a[0] + (b.b[0] - b.a[0]) * u, b.a[1] + (b.b[1] - b.a[1]) * u, 44 * (1 - u) + Math.sin(u * Math.PI) * b.h);
    for (let q = -6; q <= 6; q++) for (let r = -6; r <= 6; r++) { const d = Math.hypot(q, r) / 6; if (d > 1) continue; ovSet(X + q, Y + r, d < 0.4 ? 27 : d < 0.7 ? 18 : d < 0.9 ? 16 : S[1]); }
    const [gx, gy] = P(b.b[0], b.b[1], 0), sr = Math.round(4 + u * 12); for (let a = -sr; a <= sr; a++) if ((a + gx) & 1) { ovSet(gx + a, gy, 16); if (Math.abs(a) < sr / 2) ovSet(gx + a, gy - 1, 17); }   // where it will land
  }
  // the plasma wheel: three white-hot balls in a halo of fire, strands of burning lightning between them
  if (U.plasma && U.plasma.pos) {
    const pts = U.plasma.pos.map(p => P(p[0], p[1], 24));
    for (let i = 0; i < 3; i++) { boltLine(pts[i], pts[(i + 1) % 3], i * 97 + 5, 2, 1, true, FIRE_BOLT); boltLine(pts[i], pts[(i + 1) % 3], i * 41 + 9, 1, 1, false); }
    const tip = P(...staffTip(), ORB_Z + 14 + (hero.leapZ || 0)); if (Math.floor(G.t * 15) % 2) boltLine(tip, pts[Math.floor(G.t * 8) % 3], 77, 1, 1, false, FIRE_BOLT);
    for (const [X, Y] of pts) { const r = 12; for (let b = -r; b <= r; b++) for (let a = -r; a <= r; a++) { const d = Math.hypot(a, b) / r; if (d > 1) continue; if (d < 0.4) ovSet(X + a, Y + b, 27); else if (d < 0.62) ovSet(X + a, Y + b, 18); else if (d < 0.82 || ((a + b) & 1)) ovSet(X + a, Y + b, d < 0.82 ? 17 : 16); } const R = rng(X * 7 + Math.floor(G.t * 30)); for (let f = 0; f < 3; f++) { const fa = R() * 6.283, l = 16 + R() * 12; boltLine([X, Y], [X + Math.cos(fa) * l, Y + Math.sin(fa) * l], f * 31 + X, 1, 1, false); } }
  }
  // the lodestone: a dark boulder hanging in a blue glow, lightning leashing every foe to it, rubble circling in
  if (U.magnet) {
    const M = U.magnet, up = Math.min(1, (G.t - M.born) / 0.35), z = 60 * up + Math.sin(G.t * 5) * 3, [X, Y] = P(M.fi, M.fj, z), [gx, gy] = P(M.fi, M.fj, 0), r = 21;
    for (let a = -24; a <= 24; a++) for (let b = -8; b <= 8; b++) if (a * a / 576 + b * b / 64 <= 1 && ((a + b) & 1)) ovSet(gx + a, gy + b, BLK);   // its shadow
    for (let q = 0; q < 3; q++) { const rr = ((G.t * 1.6 + q / 3) % 1), R2 = (1 - rr) * 190, n = 40 + Math.round(R2); for (let s = 0; s < n; s++) { const a = s / n * 6.283 + G.t * 2; if ((s >> 2) % 2) continue; const x = Math.round(gx + Math.cos(a) * R2), y = Math.round(gy + Math.sin(a) * R2 * 0.5); ovSet(x, y, rr > 0.6 ? 27 : 40); ovSet(x, y + 1, rr > 0.6 ? 40 : 39); ovSet(x + 1, y, rr > 0.6 ? 27 : 40); } }   // rings drawing in over the floor
    if (M.held) M.held.slice(0, 14).forEach((e, n) => { if (!alive(e)) return; const c = chestOf(e); boltLine([X, Y], P(c[0], c[1], c[2]), M.seed + n * 13, n < 6 ? 2 : 1, 1, n < 3); });
    for (let q = 0; q < 12; q++) { const a = G.t * 6 + q * 0.55, rr = 28 + ((q * 37 + Math.floor(G.t * 20)) % 60), x = Math.round(X + Math.cos(a) * rr), y = Math.round(Y + Math.sin(a) * rr * 0.5 + 6); for (let b = -2; b <= 2; b++) for (let c = -2; c <= 2; c++) if (Math.abs(b) + Math.abs(c) < 4) ovSet(x + c, y + b, b + c < 0 ? S[6] : S[3]); }
    for (let b = -r - 4; b <= r + 4; b++) for (let a = -r - 4; a <= r + 4; a++) {
      const d = Math.hypot(a, b) / r + (hash(a >> 1, b >> 1, M.seed) - 0.5) * 0.22;
      if (d > 1) { if (d < 1.14) ovSet(X + a, Y + b, 40); else if (d < 1.42 && ((a + b + Math.floor(G.t * 20)) & 1)) ovSet(X + a, Y + b, d < 1.28 ? 40 : 39); continue; }
      const vein = Math.abs(Math.sin(a * 0.33 + Math.sin(b * 0.4 + M.seed) * 2) * Math.cos(b * 0.29 + M.seed)) < 0.09;   // cracks of blue light running through it
      ovSet(X + a, Y + b, d > 0.9 ? BLK : vein ? (Math.floor(G.t * 14) % 2 ? 27 : 40) : (-a - b) / r > 0.5 ? STEEL[2] : (-a - b) / r > -0.2 ? STEEL[1] : STEEL[0]);
    }
    const R = rng(M.seed + Math.floor(G.t * 30)); for (let f = 0; f < 5; f++) { const fa = R() * 6.283, l = 30 + R() * 22; boltLine([X, Y], [X + Math.cos(fa) * l, Y + Math.sin(fa) * l * 0.8], f * 19, f < 2 ? 2 : 1, 1, false); }
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
// Sentry (round 82; the user: it looks bad and doesn't feel great; maybe a machine gun for 5 s that
// then falls over and breaks): a repeating crossbow on a tripod, planted in front of you. It spins
// up and sprays bolts at the nearest foe it can see (8 tiles) for 5 s, faster as it warms (every 0.2 s
// at first, then 0.085 s; 0.3 x each, a little spread), then shudders, tips over and breaks. One at a
// time (Two Sentries: a pair, each every 0.12 s). Ballista: every 0.3 s, heavy bolts through (1 x).
// Fire Sentry: burning bolts, and it bursts into flame when it breaks (2 x round it).
const SENTRY_LIFE = 5, SENTRY_FALL = 0.75;
function placeSentry() {
  const mod = skillMod('sentry'), [fx, fy] = dirVec(hero.dir);
  if (!G.sentries) G.sentries = [];
  for (const o of G.sentries) if (!o.fall) { o.t = 0; o.fall = 0.001; }   // an old one still standing breaks now
  const spots = mod === 'twin' ? [[-fy * 1.2 + fx * 0.8, fx * 1.2 + fy * 0.8], [fy * 1.2 + fx * 0.8, -fx * 1.2 + fy * 0.8]] : [[fx * 1.1, fy * 1.1]];
  for (const [dx, dy] of spots) {
    let p = [hero.fi + dx, hero.fj + dy]; if (blocked(p[0], p[1])) p = [hero.fi, hero.fj];
    G.sentries.push({ fi: p[0], fj: p[1], t: SENTRY_LIFE, t0: SENTRY_LIFE, age: 0, next: 0.35, mod, ang: Math.atan2(fy, fx), rise: 0, kick: 0, spin: 0, fall: 0, side: Math.random() < 0.5 ? -1 : 1, seed: (Math.random() * 1e4) | 0 });
    const [x, y] = iso(p[0], p[1]); for (let q = 0; q < 12; q++) { const a = q / 12 * 6.283; pspawn(5, x, y, 1, Math.cos(a) * 45, Math.sin(a) * 22, 12, 1, LV.outdoor ? DIRT[3] : S[5]); }
  }
  rangerRelease(); hero.tossT = 0.34; sfx('clank'); sfx('chest');
}
function sentryBreak(s) {
  const [x, y] = iso(s.fi, s.fj);
  for (let q = 0; q < 14; q++) { const a = Math.random() * 6.283, v = 40 + Math.random() * 70; pspawn(7, x + s.side * 8, y, 6 + Math.random() * 10, Math.cos(a) * v, Math.sin(a) * v * 0.5, 40 + Math.random() * 60, 3, q % 3 ? WOOD[2] : STEEL[2]); }
  for (let q = 0; q < 6; q++) G.dust.push({ fi: s.fi + (Math.random() - 0.5) * 0.6, fj: s.fj + (Math.random() - 0.5) * 0.6, vi: (Math.random() - 0.5) * 1.5, vj: (Math.random() - 0.5) * 1.5, r: 4, vr: 18, t: 0.7, t0: 0.7, z: 2 });
  if (s.mod === 'fire') { explodeAt(s.fi, s.fj, 1.5, 2, 1, false, false); G.fireGround.push({ fi: s.fi, fj: s.fj, r: 1.2, t: 2.5, tick: 0.3 }); }
  sfx('clank'); sfx('thunk');
}
function updateSentries(dt) {
  if (!G.sentries) return;
  for (const s of G.sentries) {
    if (s.fall > 0) {   // shudders, tips over, breaks
      s.fall += dt; s.kick = 0;
      if (s.fall > 0.25 && Math.random() < 0.5) { const [x, y] = iso(s.fi, s.fj); pspawn(5, x, y, 20, (Math.random() - 0.5) * 20, 0, 20, 0.6, S[6]); }
      if (s.fall >= SENTRY_FALL && !s.broke) { s.broke = true; sentryBreak(s); }
      continue;
    }
    s.t -= dt; s.age += dt; s.rise = Math.min(1, s.rise + dt * 5); s.kick = Math.max(0, s.kick - dt * 14); s.next -= dt;
    if (s.t <= 0) { s.fall = 0.001; sfx('clank', 0.6); continue; }
    let best = null, bd = 8;
    for (const e of enemies) { if (!alive(e) || LV.vis[tIdx(Math.floor(e.fi), Math.floor(e.fj))] < 0.3) continue; const d = Math.hypot(e.fi - s.fi, e.fj - s.fj); if (d < bd && los(s.fi, s.fj, e.fi, e.fj)) { bd = d; best = e; } }
    const warm = Math.min(1, s.age / 0.8);
    s.spin += dt * (best ? 10 + warm * 30 : 4);
    if (!best) continue;
    const want = Math.atan2(best.fj - s.fj, best.fi - s.fi); let da = Math.atan2(Math.sin(want - s.ang), Math.cos(want - s.ang)); s.ang += Math.sign(da) * Math.min(Math.abs(da), dt * 14);
    if (s.next <= 0 && Math.abs(da) < 0.35) {
      const heavy = s.mod === 'ballista', sp = heavy ? 18 : 20, a = s.ang + (heavy ? 0 : (Math.random() - 0.5) * 0.14);
      s.next = heavy ? 0.35 : s.mod === 'twin' ? 0.15 + (1 - warm) * 0.1 : 0.085 + (1 - warm) * 0.115; s.kick = 1; s.shots = (s.shots || 0) + 1;
      projectiles.push({ kind: 'arrow', fi: s.fi + Math.cos(a) * 0.45, fj: s.fj + Math.sin(a) * 0.45, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, z: 14, life: 9 / sp, owner: 'hero', spell: true, dmgK: heavy ? 0.55 : 0.3, age: 0, elem: s.mod === 'fire' ? 'fire' : null, fire: s.mod === 'fire', pierce: heavy, hits: heavy ? new Set() : null, bolt: heavy ? 2 : 0 });
      const [x, y] = iso(s.fi + Math.cos(a) * 0.5, s.fj + Math.sin(a) * 0.5); pspawn(2, x, y, 14, Math.cos(a) * 30, Math.sin(a) * 15, 10, 0.08, 27);
      if (s.shots % 2 === 0 || heavy) sfx('twang', heavy ? 0.6 : 0.3);
    }
  }
  G.sentries = G.sentries.filter(s => !s.broke);
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
// Strafe (round 82, replaces the Vault; the user wanted something more impactful, and more active
// skills for the ranger; from Diablo III's and Path of Exile's Strafe): for 2.2 s the ranger runs
// free and a third faster while arrows fly on their own at the nearest foes, one every 0.09 s,
// turning among the three nearest (0.6 x each, about 24 arrows). The basic attack
// waits. Burning Strafe: fire arrows. Long Strafe: 3.3 s. Finale: a ring of 16 arrows at the end.
const STRAFE_T = 2.2, STRAFE_EVERY = 0.09, STRAFE_K = 0.6, STRAFE_RANGE = 7.5;
function startStrafe() {
  const mod = skillMod('strafe');
  hero.strafe = { t: mod === 'long' ? STRAFE_T * 1.5 : STRAFE_T, next: 0, n: 0, mod, aim: null };
  hero.atk = -1; hero.approach = null;
  const [x, y] = screenOf(hero); for (let q = 0; q < 16; q++) { const a = q / 16 * 6.283; pspawn(5, x, y, 1, Math.cos(a) * 60, Math.sin(a) * 30, 14, 1, LV.outdoor ? DIRT[3] : S[5]); }
  shockwave(hero.fi, hero.fj, 1.2, 0.25, [51, 27]);
  sfx('swing'); sfx('twang');
}
function updateStrafe(dt) {
  const St = hero.strafe; if (!St) return;
  if (hero.dead) { hero.strafe = null; return; }
  St.t -= dt; St.next -= dt;
  const foes = enemies.filter(e => alive(e) && LV.vis[tIdx(Math.floor(e.fi), Math.floor(e.fj))] >= 0.3 && Math.hypot(e.fi - hero.fi, e.fj - hero.fj) < STRAFE_RANGE).sort((a, b) => Math.hypot(a.fi - hero.fi, a.fj - hero.fj) - Math.hypot(b.fi - hero.fi, b.fj - hero.fj));
  St.aim = foes[0] || null;
  if (St.aim) hero.dir = dirFrom(St.aim.fi - hero.fi, St.aim.fj - hero.fj);
  while (St.next <= 0 && St.t > 0) {
    St.next += STRAFE_EVERY;
    const e = foes.length ? foes[St.n % Math.min(3, foes.length)] : null; St.n++;
    const [fx, fy] = dirVec(hero.dir), a = e ? Math.atan2(e.fj - hero.fj, e.fi - hero.fi) + (Math.random() - 0.5) * 0.08 : Math.atan2(fy, fx) + (Math.random() - 0.5) * 0.9;
    const fire = St.mod === 'fire';
    projectiles.push({ kind: 'arrow', fi: hero.fi + Math.cos(a) * 0.4, fj: hero.fj + Math.sin(a) * 0.4, vx: Math.cos(a) * 16, vy: Math.sin(a) * 16, z: 20, life: 9 / 16, owner: 'hero', spell: true, dmgK: STRAFE_K, age: 0, elem: fire ? 'fire' : null, fire });
    const [x, y] = iso(hero.fi + Math.cos(a) * 0.45, hero.fj + Math.sin(a) * 0.45); pspawn(2, x, y, 20, Math.cos(a) * 40, Math.sin(a) * 20, 6, 0.1, fire ? 17 : 27);
    if (St.n % 2) sfx('twang', 0.35);
  }
  if (St.t <= 0) {
    if (St.mod === 'finale') { for (let k = 0; k < 16; k++) { const a = k / 16 * 6.283; projectiles.push({ kind: 'arrow', fi: hero.fi + Math.cos(a) * 0.4, fj: hero.fj + Math.sin(a) * 0.4, vx: Math.cos(a) * 15, vy: Math.sin(a) * 15, z: 20, life: 7 / 15, owner: 'hero', spell: true, dmgK: 0.8, age: 0, pierce: true, hits: new Set() }); } shockwave(hero.fi, hero.fj, 1.6, 0.3, [51, 27]); sfx('twang'); sfx('boom', 0.5); }
    hero.strafe = null;
  }
}
function updateRangerKit(dt) {
  updateClusters(dt); updateSentries(dt); updateHawks(dt); updateStrafe(dt);
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
  if (G.sentries) for (const s of G.sentries) {   // round 82: a repeating crossbow on a squat tripod; the bolt drum turns as it fires
    const [X, Y] = P(s.fi, s.fj, 0), h = Math.round(28 * s.rise);   // (sizes in detail pixels: twice a game pixel)
    // falling over: shake, then turn about the foot toward one side
    let th = 0, jx = 0;
    if (s.fall > 0) { const u = s.fall / SENTRY_FALL; if (u < 0.35) jx = (Math.floor(G.t * 40) % 2 ? 1 : -1) * 2; else th = s.side * Math.min(1.45, ((u - 0.35) / 0.65) ** 2 * 1.45); }
    const ct = Math.cos(th), st = Math.sin(th);
    const L = (x, y, v) => { const rx = x - X, ry = y - Y; lit(Math.round(X + jx + rx * ct - ry * st), Math.round(Y + rx * st + ry * ct), v); };
    for (const [lx, ly] of [[-14, 6], [14, 6], [0, 11]]) for (let k = 0; k <= h; k++) { const u = k / (h || 1), x = Math.round(X + lx * (1 - u)), y = Math.round(Y + ly * (1 - u) - k); L(x - 1, y, BLK); L(x, y, WOOD[k % 6 === 0 ? 1 : 3]); L(x + 1, y, WOOD[2]); L(x + 2, y, BLK); }
    const cx = X, cy = Y - h - 6, ux = Math.cos(s.ang) - Math.sin(s.ang), uy = (Math.cos(s.ang) + Math.sin(s.ang)) * 0.5, ul = Math.hypot(ux, uy) || 1, dx = ux / ul, dy = uy / ul, kb = s.kick * 3;
    // the body: a squat iron-bound box under the drum
    for (let b = -8; b <= 8; b++) for (let a = -13; a <= 13; a++) { const q = a * a / 169 + b * b / 64; if (q > 1) continue; L(cx + a, cy + 4 + b, q > 0.8 ? BLK : Math.abs(a) === 7 || Math.abs(a) === 8 ? STEEL[2] : b < -3 ? WOOD[4] : b < 3 ? WOOD[3] : WOOD[1]); }
    // three barrels side by side along the aim, the top one swapping as the drum turns
    for (const o of [-5, 0, 5]) { const lift = Math.round(Math.sin(s.spin + o) * 1.5); for (let k = 2; k <= 30; k++) { const x = Math.round(cx + dx * (k - kb) - dy * o), y = Math.round(cy + dy * (k - kb) + dx * o * 0.5) + lift; L(x, y - 2, BLK); L(x, y - 1, k > 26 ? STEEL[4] : STEEL[3]); L(x, y, STEEL[1 + (o === 0 ? 1 : 0)]); L(x, y + 1, BLK); } }
    // the drum: a wheel of bolts on top, turning
    for (let q = 0; q < 10; q++) { const a = s.spin + q / 10 * 6.283, px = Math.round(cx - dx * 2 + Math.cos(a) * 10), py = Math.round(cy - 8 + Math.sin(a) * 4); L(px, py, BLK); L(px, py - 1, Math.sin(a) > 0 ? BONE[2] : WOOD[2]); L(px, py - 2, Math.sin(a) > 0 ? STEEL[4] : STEEL[2]); }
    for (let a = -4; a <= 4; a++) L(cx - Math.round(dx * 2) + a, cy - 8, STEEL[3]);   // the axle
    if (s.kick > 0.4) { const mx = Math.round(cx + dx * 33), my = Math.round(cy + dy * 33); for (let k = -6; k <= 6; k++) { ovSet(mx + k, my, Math.abs(k) < 3 ? 27 : 51); ovSet(mx, my + Math.round(k * 0.6), Math.abs(k) < 3 ? 27 : 51); if (Math.abs(k) < 3) { ovSet(mx + k, my + 1, 51); ovSet(mx + k, my - 1, 51); } } }   // the muzzle flash
    if (s.mod === 'fire') for (let q = 0; q < 3; q++) ovSet(Math.round(cx + dx * 26 + (Math.random() - 0.5) * 4), Math.round(cy + dy * 26 - Math.random() * 6), Math.floor(G.t * 15 + q) % 2 ? 17 : 16);
    if (!s.fall) { const life = s.t / s.t0; for (let k = 0; k < 20; k++) { if (k / 20 > life) break; ovSet(X - 10 + k, Y + 16, life < 0.3 ? 17 : 54); } }   // how long it has left
  }
  if (hero.strafe) {   // round 82: two gold streaks wheeling round the ranger while Strafe runs
    const [X, Y] = P(hero.fi, hero.fj, 14), u = Math.min(1, hero.strafe.t / 0.25);
    for (const ph of [0, Math.PI]) for (let q = 0; q < 26; q++) { const a = G.t * 11 + ph - q * 0.07, x = Math.round(X + Math.cos(a) * 30), y = Math.round(Y + Math.sin(a) * 13); if (q > 18 && (q + x) & 1) continue; if (Math.sin(a) < 0 && q > 6) continue; ovSet(x, y, q < 4 * u ? 27 : q < 12 ? 51 : 50); }
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
