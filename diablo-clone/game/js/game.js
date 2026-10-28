'use strict';
// Game state, simulation, combat and rendering. UI and input live in ui.js.

// ---------------------------------------------------------------- frame buffers
let W = 270, H = 480;
let scr, zbuf, shd, cid, lbuf, tbuf, out32, outImg;
const cvs = document.getElementById('c');
const ctx = cvs.getContext('2d');
function allocBuffers(w, h) {
  W = w; H = h; cvs.width = W; cvs.height = H;
  scr = new Uint8Array(W * H); zbuf = new Uint8Array(W * H); shd = new Uint8Array(W * H); cid = new Uint8Array(W * H);
  lbuf = new Float32Array(W * H); tbuf = new Int16Array(W * H);
  outImg = ctx.createImageData(W, H); out32 = new Uint32Array(outImg.data.buffer);
  if (typeof uiResize === 'function') uiResize();
}
let camX = 0, camY = 0;
const params = new URLSearchParams(location.search);
const SHAKE = params.get('shake') !== '0';

// ---------------------------------------------------------------- state
const G = { t: 0, mode: 'title', paused: false, trauma: 0, fade: 0, fadeTo: null, msg: [], saveT: 0, kills: 0 };
const hero = {
  fam: 'hero', fi: 0, fj: 0, dir: 1, clip: 'idle', clock: 0, walk: 0, atk: -1, hitDone: false, stop: 0, flash: 0,
  hp: 40, mana: 20, gold: 0, xp: 0, lvl: 1, potions: 3, team: 'red', dead: 0, hurtT: 0, cast: -1,
  equip: { weapon: null, helm: null, chest: null, shield: null }, bag: [],
  look: { team: 'red', helm: 'none', chest: 'tunic', weapon: 'sword', shield: 'none' },
};
let enemies = [], groundItems = [], projectiles = [], floaters = [];
const STAT = {};   // derived hero stats, recomputed on equip
function recalcHero() {
  const e = hero.equip, it = s => e[s] ? ITEM_BASES[e[s].base] : null, mods = {};
  for (const s in e) if (e[s]) for (const k in e[s].mods) mods[k] = (mods[k] || 0) + e[s].mods[k];
  const w = it('weapon');
  const base = w ? w.dmg : [1, 3];
  const pct = 1 + (mods.dmgPct || 0) / 100 + hero.lvl * 0.03;
  STAT.dmg = [Math.round((base[0] + (mods.dmgFlat || 0)) * pct), Math.round((base[1] + (mods.dmgFlat || 0)) * pct)];
  STAT.armor = ['helm', 'chest', 'shield'].reduce((a, s) => a + (it(s)?.armor || 0), 0) + (mods.armorFlat || 0);
  STAT.block = it('shield')?.block || 0;
  STAT.maxHp = 40 + (hero.lvl - 1) * 9 + (mods.hp || 0);
  STAT.maxMana = 20 + (hero.lvl - 1) * 4 + (mods.mana || 0);
  STAT.leech = mods.leech || 0;
  STAT.speed = 4.2 * (1 + (mods.speed || 0) / 100);
  STAT.slow = !!w?.slow;
  hero.look = { team: hero.team, helm: it('helm')?.look || 'none', chest: it('chest')?.look || 'tunic', weapon: w?.look || 'sword', shield: it('shield')?.look || 'none' };
  hero.hp = Math.min(hero.hp, STAT.maxHp); hero.mana = Math.min(hero.mana, STAT.maxMana);
}
const xpFor = l => Math.round(60 * Math.pow(l, 1.6));
function say(text, col = 26, t = 2.5) { G.msg.push({ text, col, t }); if (G.msg.length > 3) G.msg.shift(); }

// ---------------------------------------------------------------- level setup
function startLevel(level, seed) {
  genLevel(level, seed);
  buildWorld();
  hero.fi = LV.start.cx + 0.5; hero.fj = LV.start.cy + 0.5; hero.atk = -1; hero.clip = 'idle'; hero.dead = 0;
  enemies = LV.spawns.map((s, n) => makeEnemy(s.id, s.fi, s.fj, n));
  groundItems = []; projectiles = []; floaters = []; pclear();
  updateFov(hero.fi, hero.fj);
  flowT = 0; computeFlow();
  warmStep(1e9, prewarm());   // idle poses + the hero's walk now, behind the level fade; the rest during play
  say(`CRYPT LEVEL ${level}`, 51, 3);
}
function makeEnemy(id, fi, fj, n) {
  const m = MONSTERS[id], lv = LV.level;
  const scale = 1 + (lv - 1) * 0.22;
  return {
    id, def: m, fam: m.family, look: m.look, fi, fj, home: [fi, fj], dir: (n * 3) % 8, clip: 'idle', clock: n * 0.13, walk: 0,
    hp: Math.round(m.hp * scale), maxHp: Math.round(m.hp * scale), dmg: [Math.round(m.dmg[0] * scale), Math.round(m.dmg[1] * scale)],
    state: 'sleep', atk: -1, hitDone: false, stop: 0, flash: 0, kb: [0, 0], hurt: 0, dying: -1, cool: 0.5 + hash(n, 3) * 1.5, seed: n,
  };
}
// build the sprites the level will need first (idle + walk, all directions) a few per frame
let warmQueue = [];
function prewarm() {
  warmQueue = [];
  const fams = new Map();
  fams.set('hero', hero.look);
  for (const e of enemies) fams.set(e.fam + lookKey(e.look), [e.fam, e.look]);
  for (const [k, v] of fams) {
    const [fam, look] = k === 'hero' ? ['hero', v] : v;
    for (let d = 0; d < 8; d++) warmQueue.push([fam, look, d, 'idle', 0]);
  }
  // the hero's walk is needed at once; monsters' walks fill in during play
  for (let d = 0; d < 8; d++) for (let f = 0; f < 8; f++) warmQueue.push(['hero', hero.look, d, 'walk', f]);
  const now = warmQueue.length;
  for (const [k, v] of fams) if (k !== 'hero') for (let d = 0; d < 8; d++) for (let f = 0; f < 8; f++) warmQueue.push([v[0], v[1], d, 'walk', f]);
  return now;
}
function warmStep(budgetMs, maxCount = Infinity) {
  const t0 = performance.now(), saved = buildBudget.ms; buildBudget.ms = Infinity;
  let n = 0;
  while (warmQueue.length && n < maxCount && performance.now() - t0 < budgetMs) { const [fam, look, d, clip, f] = warmQueue.shift(); getSprite(fam, look, d, clip, f, fam === 'hero' ? hero : { look }); n++; }
  buildBudget.ms = saved;
}

// ---------------------------------------------------------------- flow field toward the hero
let flow = new Int16Array(MW * MH), flowT = 0;
function computeFlow() {
  const hi = Math.floor(hero.fi), hj = Math.floor(hero.fj);
  if (hi < 0 || hj < 0 || hi >= MW || hj >= MH) return;
  flow = bfs(hi, hj);
}
// direction to step from a tile toward the hero along the flow field
function flowDir(fi, fj) {
  const i = Math.floor(fi), j = Math.floor(fj), k = tIdx(i, j), d0 = flow[k];
  if (d0 < 0) return null;
  let best = null, bd = d0;
  for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
    const ii = i + a, jj = j + b; if (ii < 0 || jj < 0 || ii >= MW || jj >= MH) continue;
    const d = flow[tIdx(ii, jj)];
    if (d >= 0 && d < bd && (a === 0 || b === 0 || (!blocked(i + a + 0.5, j + 0.5) && !blocked(i + 0.5, j + b + 0.5)))) { bd = d; best = [ii + 0.5 - fi, jj + 0.5 - fj]; }
  }
  return best;
}

// ---------------------------------------------------------------- particles (pooled typed arrays)
const PN = 600;
const px_ = new Float32Array(PN), py_ = new Float32Array(PN), pz_ = new Float32Array(PN), pvx = new Float32Array(PN), pvy = new Float32Array(PN), pvz = new Float32Array(PN), plife = new Float32Array(PN);
const pcol = new Uint8Array(PN), pkind = new Uint8Array(PN);   // kind: 0 free, 1 blood, 2 spark, 3 ember, 4 magic, 5 bone chip
let pnext = 0;
function pclear() { pkind.fill(0); }
function pspawn(kind, x, y, z, vx, vy, vz, life, col) {
  for (let n = 0; n < PN; n++) {
    const k = (pnext + n) % PN;
    if (!pkind[k]) { pkind[k] = kind; px_[k] = x; py_[k] = y; pz_[k] = z; pvx[k] = vx; pvy[k] = vy; pvz[k] = vz; plife[k] = life; pcol[k] = col; pnext = k + 1; return; }
  }
}
function burst(kind, x, y, z, n, speed, col, dirx = 0) {
  for (let k = 0; k < n; k++) {
    const a = Math.random() * 6.283, s = speed * (0.3 + Math.random() * 0.7);
    pspawn(kind, x, y, z, Math.cos(a) * s + dirx, Math.sin(a) * s * 0.5, 20 + Math.random() * speed, kind === 2 ? 0.25 + Math.random() * 0.2 : 3, col);
  }
}

// ---------------------------------------------------------------- helpers
const alive = e => e.dying < 0 && e.hp > 0;
const screenOf = e => iso(e.fi, e.fj);
function dirFrom(dfi, dfj) { return ((Math.round(Math.atan2(dfj, dfi) / (Math.PI / 4)) % 8) + 8) % 8; }
const dirVec = d => [Math.cos(d * Math.PI / 4), Math.sin(d * Math.PI / 4)];
function tryMove(e, dfi, dfj, r = 0.28) {
  const ok = (ni, nj) => !(blocked(ni - r, nj - r) || blocked(ni + r, nj - r) || blocked(ni - r, nj + r) || blocked(ni + r, nj + r));
  let moved = false;
  if (ok(e.fi + dfi, e.fj)) { e.fi += dfi; moved = true; }
  if (ok(e.fi, e.fj + dfj)) { e.fj += dfj; moved = true; }
  return moved;
}
function floater(text, fi, fj, z, col) { const [x, y] = iso(fi, fj); floaters.push({ text, x, y: y - z, t: 0.9, col }); }
const roll = r => r[0] + Math.floor(Math.random() * (r[1] - r[0] + 1));

// ---------------------------------------------------------------- hero actions
function heroAttack() {
  if (G.mode !== 'play' || hero.dead || hero.atk >= 0 || hero.cast >= 0) return;
  // target assist: face the nearest enemy within reach of a step or two
  let best = null, bd = 4.2;
  for (const e of enemies) { if (!alive(e) || LV.vis[tIdx(Math.floor(e.fi), Math.floor(e.fj))] < 0.3) continue; const d = Math.hypot(e.fi - hero.fi, e.fj - hero.fj); if (d < bd) { bd = d; best = e; } }
  if (best) {
    hero.dir = dirFrom(best.fi - hero.fi, best.fj - hero.fj);
    // out of reach: walk to it first (one tap is enough on a phone), then swing
    if (bd > heroReach() + (best.def.unique ? 0.4 : 0.1)) { hero.approach = best; hero.approachT = 1.5; return; }
  }
  hero.approach = null; hero.atk = 0; hero.hitDone = false;
  sfx(STAT.slow ? 'heavySwing' : 'swing');
}
const heroReach = () => hero.look.weapon === 'sword' ? 1.45 : 1.35;
function heroCast() {
  if (G.mode !== 'play' || hero.dead || hero.cast >= 0) return;
  if (hero.atk >= 0) { hero.castQueued = true; return; }   // fires when the swing ends
  hero.castQueued = false;
  if (hero.mana < 6) { say('NOT ENOUGH MANA', 40, 1.2); return; }
  let best = null, bd = 9;
  for (const e of enemies) { if (!alive(e) || LV.vis[tIdx(Math.floor(e.fi), Math.floor(e.fj))] < 0.3) continue; const d = Math.hypot(e.fi - hero.fi, e.fj - hero.fj); if (d < bd && los(hero.fi, hero.fj, e.fi, e.fj)) { bd = d; best = e; } }
  if (best) hero.dir = dirFrom(best.fi - hero.fi, best.fj - hero.fj);
  hero.mana -= 6; hero.cast = 0.25; sfx('bolt');
  const [dx, dy] = best ? [best.fi - hero.fi, best.fj - hero.fj] : dirVec(hero.dir), l = Math.hypot(dx, dy) || 1;
  projectiles.push({ kind: 'holy', fi: hero.fi + dx / l * 0.6, fj: hero.fj + dy / l * 0.6, vx: dx / l * 8, vy: dy / l * 8, z: 20, life: 1.4, owner: 'hero', dmg: [Math.round(STAT.dmg[0] * 0.9 + 3), Math.round(STAT.dmg[1] * 0.9 + 5)] });
}
function drinkPotion() {
  if (G.mode !== 'play' || hero.dead) return;
  if (hero.potions <= 0) { say('NO POTIONS', 22, 1.2); return; }
  if (hero.hp >= STAT.maxHp) return;
  hero.potions--; hero.hp = Math.min(STAT.maxHp, hero.hp + 30 + hero.lvl * 3); sfx('potion');
  const [x, y] = screenOf(hero); burst(4, x, y, 20, 10, 30, 22);
}
function damageEnemy(e, dmg, fromFi, fromFj, kill) {
  e.hp -= dmg; e.flash = 0.05;
  floater(String(dmg), e.fi, e.fj, e.def.chest + 14, 27);
  if (STAT.leech) hero.hp = Math.min(STAT.maxHp, hero.hp + Math.max(1, Math.round(dmg * STAT.leech / 100)));
  const [ex, ey] = screenOf(e), d = Math.hypot(e.fi - fromFi, e.fj - fromFj) || 1;
  const bony = e.fam === 'skeleton';
  burst(bony ? 5 : 1, ex, ey, e.def.chest, bony ? 8 : 12, 50, bony ? 25 : 22, (e.fi - fromFi - (e.fj - fromFj)) / d * 20);
  burst(2, ex, ey, e.def.chest, 6, 70, 17);
  if (e.state === 'sleep') wake(e);
  if (e.hp <= 0) {
    e.dying = 0; e.atk = -1; e.clip = 'death'; e.stop = 0.15; hero.stop = Math.max(hero.stop, 0.15);
    if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.5);
    sfx('kill');
    if (!bony) stampBlood(Math.round(ex), Math.round(ey), e.def.unique ? 6 : 3, (Math.random() * 1e6) | 0);
    gainXp(e.def.xp * (1 + (LV.level - 1) * 0.3));
    dropLoot(e.fi, e.fj, e.def.unique ? 3 : 1, e.def.unique);
    G.kills++;
  } else {
    e.stop = 0.07; hero.stop = Math.max(hero.stop, 0.07); sfx('hit');
    e.kb = [(e.fi - fromFi) / d * 3, (e.fj - fromFj) / d * 3];
    // hit recovery interrupts an attack in progress if the hit was big enough (Diablo's rule)
    if (dmg >= e.maxHp * 0.18 && !e.def.unique) { e.atk = -1; e.hurt = 0.18; }
  }
}
function wake(e) { if (e.state !== 'sleep') return; e.state = 'hunt'; for (const o of enemies) if (o.state === 'sleep' && Math.hypot(o.fi - e.fi, o.fj - e.fj) < 4) o.state = 'hunt'; }
function heroHitResolve() {
  const [fx, fy] = dirVec(hero.dir), reach = heroReach() + 0.1;
  let any = false;
  for (const e of enemies) {
    if (!alive(e)) continue;
    const dx = e.fi - hero.fi, dy = e.fj - hero.fj, d = Math.hypot(dx, dy), rr = reach + (e.def.unique ? 0.5 : 0.2);
    if (d > rr || (d > 0.3 && (dx * fx + dy * fy) / d < 0.35)) continue;
    damageEnemy(e, roll(STAT.dmg), hero.fi, hero.fj); any = true;
  }
  for (const p of dynProps) {
    if (p.broken || p.kind !== 'barrel') continue;
    const dx = p.i + 0.5 - hero.fi, dy = p.j + 0.5 - hero.fj, d = Math.hypot(dx, dy);
    if (d < 1.6 && (dx * fx + dy * fy) / (d || 1) > 0.3) breakBarrel(p);
  }
  return any;
}
function breakBarrel(p) {
  p.broken = true; LV.solid[tIdx(p.i, p.j)] = 0; sfx('barrel');
  burst(5, p.wx, p.wy, 8, 14, 50, 35);
  if (Math.random() < 0.35) dropLoot(p.i + 0.5, p.j + 0.5, 1, false);
}
function openChest(p) {
  if (p.open) return;
  p.open = true; say('THE CHEST CREAKS OPEN', 26, 1.5); sfx('chest');
  dropLoot(p.i + 0.5, p.j + 1.2, 3, true);
}
function gainXp(x) {
  hero.xp += Math.round(x);
  while (hero.xp >= xpFor(hero.lvl)) {
    hero.xp -= xpFor(hero.lvl); hero.lvl++; recalcHero(); hero.hp = STAT.maxHp; hero.mana = STAT.maxMana;
    say(`LEVEL UP! LEVEL ${hero.lvl}`, 51, 3); sfx('levelUp');
    const [x, y] = screenOf(hero); burst(4, x, y, 10, 24, 40, 51);
  }
}
function dropLoot(fi, fj, n, rich) {
  const R = rng((Math.random() * 1e9) | 0);
  for (let k = 0; k < n; k++) {
    const a = Math.random() * 6.28, r = 0.3 + Math.random() * 0.5;
    let p = [fi + Math.cos(a) * r, fj + Math.sin(a) * r];
    if (blocked(p[0], p[1])) p = [fi, fj];
    const q = Math.random();
    if (q < 0.45 || rich && k === 0) groundItems.push({ gold: Math.round((2 + Math.random() * 6) * LV.level * (rich ? 3 : 1)), fi: p[0], fj: p[1], t: 0 });
    else if (q < 0.6) groundItems.push({ item: rollItem(R, LV.level, 'heal'), fi: p[0], fj: p[1], t: 0 });
    else if (q < (rich ? 1 : 0.8)) groundItems.push({ item: rollItem(R, LV.level), fi: p[0], fj: p[1], t: 0 });
  }
}
function pickup(g) {
  if (g.gold) { sfx('gold'); hero.gold += g.gold; floater(g.gold + ' GOLD', g.fi, g.fj, 10, 50); return true; }
  const b = ITEM_BASES[g.item.base];
  if (b.slot === 'potion') { if (hero.potions >= 8) return false; hero.potions++; sfx('pickup'); say('HEALING POTION', 22, 1.2); return true; }
  if (hero.bag.length >= BAG_SIZE) { if (!g.warned) say('YOUR BAG IS FULL', 22, 1.5); g.warned = true; return false; }
  hero.bag.push(g.item); say(itemName(g.item), RARITY_COL[g.item.rarity], 2); sfx('pickup');
  // an empty slot is filled right away so the new look shows immediately
  if (!hero.equip[b.slot]) equipItem(g.item);
  return true;
}
const BAG_SIZE = 18;
function equipItem(it) {
  const b = ITEM_BASES[it.base];
  const i = hero.bag.indexOf(it); if (i >= 0) hero.bag.splice(i, 1);
  if (hero.equip[b.slot]) hero.bag.push(hero.equip[b.slot]);
  hero.equip[b.slot] = it; recalcHero(); prewarmHero();
}
function unequip(slot) {
  if (!hero.equip[slot] || hero.bag.length >= BAG_SIZE) return;
  hero.bag.push(hero.equip[slot]); hero.equip[slot] = null; recalcHero(); prewarmHero();
}
function prewarmHero() { for (let d = 0; d < 8; d++) { warmQueue.unshift([ 'hero', hero.look, d, 'idle', 0]); for (let f = 0; f < 8; f++) warmQueue.push(['hero', hero.look, d, 'walk', f]); } }

// ---------------------------------------------------------------- update
const input = { mx: 0, my: 0, attack: false, keys: new Set() };
function update(dt) {
  G.t += dt;
  for (const m of G.msg) m.t -= dt; G.msg = G.msg.filter(m => m.t > 0);
  if (G.fadeTo) { G.fade = Math.min(1, G.fade + dt * 2.5); if (G.fade >= 1) { const f = G.fadeTo; G.fadeTo = null; f(); } }
  else G.fade = Math.max(0, G.fade - dt * 2);
  if (G.mode !== 'play' || G.paused) return;
  G.saveT += dt; if (G.saveT > 20) { G.saveT = 0; saveGame(); }
  G.trauma = Math.max(0, G.trauma - dt * 1.4);
  updateHero(dt);
  flowT -= dt; if (flowT <= 0) { flowT = 0.4; computeFlow(); }
  for (const e of enemies) updateEnemy(e, dt);
  separate();
  updateProjectiles(dt);
  updateParticles(dt);
  ambience(dt);
  for (const f of floaters) { f.t -= dt; f.y -= dt * 18; }
  floaters = floaters.filter(f => f.t > 0);
  for (const g of groundItems) g.t += dt;
}
function updateHero(dt) {
  if (hero.dead) { hero.dead += dt; hero.clock += dt; hero.flash = 0; return; }
  hero.flash = Math.max(0, hero.flash - dt); hero.hurtT = Math.max(0, hero.hurtT - dt);
  hero.hp = Math.min(STAT.maxHp, hero.hp + dt * 0.25); hero.mana = Math.min(STAT.maxMana, hero.mana + dt * 1.2);
  if (input.attack) heroAttack();
  let vx = input.mx, vy = input.my;
  const K = input.keys;
  if (K.has('a') || K.has('arrowleft')) vx -= 1; if (K.has('d') || K.has('arrowright')) vx += 1;
  if (K.has('w') || K.has('arrowup')) vy -= 1; if (K.has('s') || K.has('arrowdown')) vy += 1;
  if (hero.approach && Math.hypot(vx, vy) < 0.18) {
    const a = hero.approach, dx = a.fi - hero.fi, dy = a.fj - hero.fj, d = Math.hypot(dx, dy);
    hero.approachT -= dt;
    if (!alive(a) || hero.approachT <= 0) hero.approach = null;
    else if (d <= heroReach() + (a.def.unique ? 0.4 : 0.1)) { hero.approach = null; heroAttack(); }
    else { const g = flowDir(hero.fi, hero.fj); vx = (dx - dy) / d; vy = (dx + dy) / d; void g; }
  } else if (Math.hypot(vx, vy) >= 0.18) hero.approach = null;
  const l = Math.hypot(vx, vy);
  const busy = hero.atk >= 0 || hero.cast >= 0;
  const moving = l > 0.18 && !busy;
  if (moving) {
    if (l > 1) { vx /= l; vy /= l; }
    // screen direction -> ground direction (isotropic): right = +i-j, down = +i+j
    const gi = (vx + vy) * Math.SQRT1_2, gj = (vy - vx) * Math.SQRT1_2, sp = STAT.speed * Math.min(1, l) * dt;
    const f0 = hero.fi, j0 = hero.fj;
    tryMove(hero, gi * sp, gj * sp);
    const moved = Math.hypot(hero.fi - f0, hero.fj - j0);
    hero.walk += moved / 0.26;   // one walk frame per 0.26 tiles: the longer stride keeps feet planted
    hero.dir = dirFrom(gi, gj);
    hero.clip = 'walk';
  } else if (!busy) hero.clip = hero.hurtT > 0 ? 'hit' : 'idle';
  if (hero.stop > 0) { hero.stop -= dt; return; }
  hero.clock += dt;
  if (hero.cast >= 0) { hero.cast -= dt; hero.clip = 'idle'; if (hero.cast < 0) hero.cast = -1; }
  if (hero.atk >= 0) {
    hero.clip = 'attack';
    hero.atk += dt * 1000;
    const sw = weaponSwing(hero.look), ki = swingKey(sw, hero.atk);
    if (ki >= 0 && sw[ki].hit && !hero.hitDone) { hero.hitDone = true; heroHitResolve(); }
    if (ki < 0) { hero.atk = -1; hero.clip = 'idle'; if (hero.castQueued) heroCast(); }
  }
  // pick up what we walk over; open chests by walking into them
  for (let n = groundItems.length - 1; n >= 0; n--) {
    const g = groundItems[n];
    if (g.t > 0.4 && Math.hypot(g.fi - hero.fi, g.fj - hero.fj) < 0.55 && pickup(g)) groundItems.splice(n, 1);
  }
  for (const p of dynProps) if (p.kind === 'chest' && !p.open && Math.hypot(p.i + 0.5 - hero.fi, p.j + 0.5 - hero.fj) < 1.15) openChest(p);
  // stairs
  const s = LV.stairs;
  if (!G.fadeTo && Math.hypot(s.i + 0.5 - hero.fi, s.j + 0.5 - hero.fj) < 0.55) {
    sfx('stairs');
    G.fadeTo = () => { startLevel(LV.level + 1, (LV.seed * 31 + 17) >>> 0); saveGame(); };
  }
  updateFov(hero.fi, hero.fj);
}
function updateEnemy(e, dt) {
  if (e.dying >= 0) {
    if (e.stop > 0) { e.stop -= dt; return; }
    e.dying += dt;
    if (e.dying >= 0.6 && !e.corpse) {   // the last death frame becomes part of the floor
      e.corpse = true;
      const [x, y] = screenOf(e);
      blitWorld(getSprite(e.fam, e.look, e.dir, 'death', 5, e), x, y, 0, -1, true);
    }
    return;
  }
  e.flash = Math.max(0, e.flash - dt);
  if (e.stop > 0) { e.stop -= dt; return; }
  e.clock += dt; e.cool -= dt;
  if (Math.abs(e.kb[0]) + Math.abs(e.kb[1]) > 0.01) {
    tryMove(e, e.kb[0] * dt, e.kb[1] * dt, 0.25);
    const k = Math.exp(-14 * dt); e.kb[0] *= k; e.kb[1] *= k;
  }
  if (e.hurt > 0) { e.hurt -= dt; e.clip = 'hit'; return; }
  const m = e.def, dx = hero.fi - e.fi, dy = hero.fj - e.fj, d = Math.hypot(dx, dy);
  if (e.state === 'sleep') {
    e.clip = 'idle';
    if (!hero.dead && d < 7 && los(e.fi, e.fj, hero.fi, hero.fj)) wake(e);
    return;
  }
  const atkClip = m.ranged === 'arrow' ? 'shoot' : m.ranged ? 'cast' : 'attack';
  if (e.atk >= 0) {
    e.clip = atkClip; e.atk += dt * 1000;
    const sw = FAMILIES[e.fam].swing(e), ki = swingKey(sw, e.atk);
    if (ki >= 0 && sw[ki].hit && !e.hitDone) {
      e.hitDone = true;
      if (m.ranged) {
        const l = d || 1, sp = m.ranged === 'arrow' ? 9 : 5.5;
        sfx(m.ranged === 'arrow' ? 'arrow' : 'fireball');
        projectiles.push({ kind: m.ranged, fi: e.fi + dx / l * 0.5, fj: e.fj + dy / l * 0.5, vx: dx / l * sp, vy: dy / l * sp, z: m.ranged === 'arrow' ? 18 : 14, life: 2, owner: 'enemy', dmg: e.dmg });
      } else if (!hero.dead && d < m.reach + 0.35) hurtHero(roll(e.dmg), e);
    }
    if (ki < 0) { e.atk = -1; e.cool = m.ranged ? 1.4 + Math.random() : 0.5 + Math.random() * 0.5; e.clip = 'idle'; }
    return;
  }
  if (hero.dead) { e.clip = 'idle'; return; }
  const see = d < 10 && los(e.fi, e.fj, hero.fi, hero.fj);
  if (m.ranged && see && d < m.reach && d > 2.2) {
    e.dir = dirFrom(dx, dy); e.clip = 'idle';
    if (e.cool <= 0) { e.atk = 0; e.hitDone = false; }
    return;
  }
  if (!m.ranged && d < m.reach) {
    e.dir = dirFrom(dx, dy); e.clip = 'idle';
    if (e.cool <= 0) { e.atk = 0; e.hitDone = false; }
    return;
  }
  // move: ranged enemies back off when the hero is close, everyone else closes in
  let mv = null;
  if (m.ranged && d <= 2.2) mv = [-dx / d, -dy / d];
  else if (see && d < 3) mv = [dx / d, dy / d];
  else mv = flowDir(e.fi, e.fj);
  if (!mv || d > 18) { e.clip = 'idle'; return; }
  const l = Math.hypot(mv[0], mv[1]) || 1, sp = m.speed / 16 * 1.2 * dt;
  const f0 = e.fi, j0 = e.fj;
  tryMove(e, mv[0] / l * sp, mv[1] / l * sp, 0.25);
  e.walk += Math.hypot(e.fi - f0, e.fj - j0) / (e.fam === 'spider' || e.fam === 'hound' ? 0.32 : 0.26);
  e.dir = dirFrom(mv[0], mv[1]); e.clip = 'walk';
}
function hurtHero(dmg, src) {
  if (hero.dead) return;
  if (Math.random() * 100 < STAT.block) { floater('BLOCK', hero.fi, hero.fj, 44, 31); sfx('block'); return; }
  dmg = Math.max(1, Math.round(dmg * 40 / (40 + STAT.armor * 2.5)));
  hero.hp -= dmg; hero.flash = 0.06; hero.hurtT = 0.15; sfx('hurt');
  floater(String(dmg), hero.fi, hero.fj, 46, 23);
  const [x, y] = screenOf(hero); burst(1, x, y, 24, 6, 40, 22);
  if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.25);
  if (hero.hp <= 0) {
    sfx('death');
    hero.hp = 0; hero.dead = 0.001; hero.clip = 'death'; hero.clock = 0; hero.atk = -1;
  }
  void src;
}
function separate() {
  const list = enemies.filter(alive);
  for (let a = 0; a < list.length; a++) for (let b = a + 1; b < list.length; b++) {
    const A = list[a], B = list[b], dx = B.fi - A.fi, dy = B.fj - A.fj, d = Math.hypot(dx, dy), m = 0.55 + (A.def.unique || B.def.unique ? 0.4 : 0);
    if (d < m && d > 1e-4) { const p = (m - d) * 0.5; tryMove(A, -dx / d * p, -dy / d * p, 0.25); tryMove(B, dx / d * p, dy / d * p, 0.25); }
  }
  for (const e of list) {
    const dx = e.fi - hero.fi, dy = e.fj - hero.fj, d = Math.hypot(dx, dy), m = 0.62 + (e.def.unique ? 0.4 : 0);
    if (d < m && d > 1e-4) tryMove(e, dx / d * (m - d), dy / d * (m - d), 0.25);
  }
}
function updateProjectiles(dt) {
  for (const p of projectiles) {
    p.life -= dt;
    const n = 3;
    for (let s = 0; s < n && p.life > 0; s++) {
      p.fi += p.vx * dt / n; p.fj += p.vy * dt / n;
      if (blocked(p.fi, p.fj) && tileAt(Math.floor(p.fi), Math.floor(p.fj)) !== FLOOR) { p.life = 0; break; }
      if (p.owner === 'enemy') {
        if (!hero.dead && Math.hypot(hero.fi - p.fi, hero.fj - p.fj) < 0.45) { hurtHero(roll(p.dmg), null); p.life = 0; }
      } else {
        for (const e of enemies) if (alive(e) && Math.hypot(e.fi - p.fi, e.fj - p.fj) < 0.5 + (e.def.unique ? 0.4 : 0)) { damageEnemy(e, roll(p.dmg), p.fi - p.vx * 0.05, p.fj - p.vy * 0.05); p.life = 0; break; }
      }
    }
    const [x, y] = iso(p.fi, p.fj);
    if (p.kind !== 'arrow' && Math.random() < 0.7) pspawn(3, x, y, p.z, (Math.random() - 0.5) * 8, 0, 4 + Math.random() * 8, 0.35, p.kind === 'holy' ? 50 : 16);
    if (p.life <= 0 && p.kind === 'holy') sfx('boltHit');
    if (p.life <= 0 && p.kind !== 'arrow') burst(2, x, y, p.z, 12, 60, p.kind === 'holy' ? 51 : 17);
  }
  projectiles = projectiles.filter(p => p.life > 0);
}
function updateParticles(dt) {
  for (let k = 0; k < PN; k++) {
    const kind = pkind[k]; if (!kind) continue;
    plife[k] -= dt;
    if (kind === 3 || kind === 4) { px_[k] += pvx[k] * dt; pz_[k] += pvz[k] * dt; if (plife[k] <= 0) pkind[k] = 0; continue; }
    pvz[k] -= 260 * dt; pz_[k] += pvz[k] * dt; px_[k] += pvx[k] * dt; py_[k] += pvy[k] * dt;
    if (kind === 2 && plife[k] <= 0) { pkind[k] = 0; continue; }
    if (pz_[k] <= 0) {
      const x = Math.round(px_[k]), y = Math.round(py_[k]);
      if (kind === 1 && x >= 0 && y >= 0 && x < WW && y < WH && wFloor[y * WW + x] && floorBuf[y * WW + x] !== BLK) setFloor(y * WW + x, hash(x, y, 77) < 0.5 ? RED[2] : RED[1]);
      pkind[k] = 0;
    }
  }
  for (const f of fires) if (f.ember && Math.random() < 0.1) pspawn(3, f.wx + (Math.random() - 0.5) * 6, f.wy + 20, 20 + Math.random() * 4, (Math.random() - 0.5) * 6, 0, 16 + Math.random() * 12, 1 + Math.random(), 16);
}

// ---------------------------------------------------------------- render
function frameOf(e) {
  const pt = e.clock;
  if (e.clip === 'idle') return Math.floor(pt / 0.2) % 4;
  if (e.clip === 'walk') return Math.floor(e.walk) % 8;
  if (e.clip === 'attack' || e.clip === 'shoot' || e.clip === 'cast') return Math.max(0, swingKey(FAMILIES[e.fam].swing(e), e.atk));
  if (e.clip === 'death') return Math.min(5, Math.floor((e === hero ? hero.dead : e.dying) / 0.1));
  return 0;
}
function blit(sp, wx, wy, flash, cidx, tile, dissolve = 0) {
  const sx0 = Math.round(wx - camX) - sp.ax, sy0 = Math.round(wy - camY) - sp.ay;
  for (let y = 0; y < sp.h; y++) {
    const yy = sy0 + y; if (yy < 0 || yy >= H) continue;
    for (let x = 0; x < sp.w; x++) {
      const xx = sx0 + x; if (xx < 0 || xx >= W) continue;
      const k = y * sp.w + x, v = sp.data[k];
      if (!v) continue;
      if (dissolve > 0 && BAYER[((yy & 3) << 2) | (xx & 3)] < dissolve) continue;
      const o = yy * W + xx;
      scr[o] = flash ? (v === BLK ? BLK : (27 | EMIS)) : v;
      zbuf[o] = sp.z ? sp.z[k] : Math.max(0, sp.ay - y);
      shd[o] = 0; cid[o] = cidx; if (tile >= 0) tbuf[o] = tile;
    }
  }
}
function shadowBlob(wx, wy, rx) {
  const cx = wx - camX, cy = wy - camY, ry = rx * 0.45;
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const dx = (x - cx) / rx, dy = (y - cy) / ry;
    if (dx * dx + dy * dy <= 1 && scr[y * W + x] !== BLK) shd[y * W + x] = 1;
  }
}
// flames cycle through the fire ramp; they are emissive and never lit
function flame(wx, wy, hgt, wid, t, seed) {
  const bx = wx - camX, by = Math.round(wy - camY);
  for (let r = 0; r < hgt; r++) {
    const p = r / hgt;
    const hw = wid * Math.pow(1 - p, 0.7) * (0.8 + 0.2 * Math.sin(t * 17 + r * 1.3 + seed));
    const cx = bx + Math.sin(t * 7 + seed + p * 2.5) * p * 1.6;
    const y = by - r; if (y < 0 || y >= H) continue;
    for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
      if (x < 0 || x >= W) continue;
      const d = Math.abs(x - cx) / (hw + 0.01);
      let c = d < 0.75 && p < 0.8 ? FIRE[3] : FIRE[2];
      if (p < 0.55 && d < 0.45) c = p < 0.3 ? FIRE[5] : FIRE[4];
      if (p > 0.85) c = FIRE[1];
      scr[y * W + x] = c | EMIS;
    }
  }
}
function render() {
  const t = G.t;
  buildBudget.used = 0; buildBudget.ms = 2;
  const [kx, ky] = screenOf(hero);
  const sh = G.trauma * G.trauma * 5;
  const shx = Math.round(sh * (Math.sin(t * 61) * 0.6 + Math.sin(t * 97 + 1) * 0.4)), shy = Math.round(sh * (Math.sin(t * 73 + 2) * 0.6 + Math.sin(t * 89 + 3) * 0.4));
  camX = Math.round(kx - W / 2) + shx; camY = Math.round(ky - H * 0.47) + shy;
  shd.fill(0); cid.fill(0);
  for (let y = 0; y < H; y++) {
    const wy = camY + y, row = wy * WW;
    if (wy >= 0 && wy < WH && camX >= 0 && camX + W <= WW) {
      scr.set(wIdx.subarray(row + camX, row + camX + W), y * W); zbuf.set(wZ.subarray(row + camX, row + camX + W), y * W); tbuf.set(wTile.subarray(row + camX, row + camX + W), y * W);
      continue;
    }
    for (let x = 0; x < W; x++) {
      const wx = camX + x, o = y * W + x, inside = wy >= 0 && wy < WH && wx >= 0 && wx < WW;
      scr[o] = inside ? wIdx[row + wx] : BLK; zbuf[o] = inside ? wZ[row + wx] : 0; tbuf[o] = inside ? wTile[row + wx] : -1;
    }
  }
  const visAt = (fi, fj) => LV.vis[tIdx(clamp(Math.floor(fi), 0, MW - 1), clamp(Math.floor(fj), 0, MH - 1))];
  const chars = [hero, ...enemies.filter(e => !e.corpse && visAt(e.fi, e.fj) > 0.25)];
  const boxes = chars.map(c => { const [x, y] = screenOf(c); return [x - 40, y - 64, x + 40, y + 8]; });
  const list = props.filter(p => {
    const x0 = p.wx - p.sp.ax, y0 = p.wy - p.sp.ay, x1 = x0 + p.sp.w, y1 = y0 + p.sp.h;
    return boxes.some(b => x0 < b[2] && x1 > b[0] && y0 < b[3] && y1 > b[1]);
  }).map(p => {
    // tall scenery in front of the hero is redrawn dithered so the hero shows through (Diablo's trick)
    const hd = hero.fi + hero.fj, hb = boxes[0];
    const x0 = p.wx - p.sp.ax, y0 = p.wy - p.sp.ay, see = p.sp.h > 30 && p.depth > hd + 0.5 && x0 < hb[2] && x0 + p.sp.w > hb[0] && y0 < hb[3] && y0 + p.sp.h > hb[1];
    return { depth: p.depth, draw: () => blit(p.sp, p.wx, p.wy, false, 0, p.tile, see ? 0.5 : 0) };
  });
  for (const p of dynProps) {
    if (p.broken) continue;
    const sp = p.kind === 'barrel' ? PROPS.barrel() : PROPS.chest(p.open);
    list.push({ depth: p.depth, draw: () => blit(sp, p.wx, p.wy, false, 0, p.tile) });
  }
  for (const g of groundItems) {
    const [x, y] = iso(g.fi, g.fj), bounce = g.t < 0.4 ? Math.round(Math.sin(g.t / 0.4 * Math.PI) * 8) : 0;
    const tile = tIdx(Math.floor(g.fi), Math.floor(g.fj));
    list.push({ depth: g.fi + g.fj - 0.3, draw: () => g.gold ? drawGold(x, y - bounce, tile) : blit(itemIcon(g.item), x, y - bounce + 4, false, 0, tile) });
  }
  chars.forEach((c, n) => {
    const [x, y] = screenOf(c);
    if (c.clip !== 'death') shadowBlob(x, y + 1, c === hero ? 8 : c.def.shadow * (c.look.scale || 1));
    list.push({ depth: c.fi + c.fj, draw: () => {
      const sp = getSprite(c.fam, c.look, c.dir, c.clip, frameOf(c), c);
      const jit = c.stop > 0 && c !== hero && c.dying < 0 ? (Math.floor(t * 33) % 2 ? 1 : -1) : 0;
      blit(sp, x + jit, y, c.flash > 0, n + 1, tIdx(Math.floor(c.fi), Math.floor(c.fj)));
    } });
  });
  for (const p of projectiles) list.push({ depth: p.fi + p.fj, draw: () => drawProjectile(p) });
  list.sort((a, b) => a.depth - b.depth);
  for (const d of list) d.draw();
  for (const f of fires) if (LV.vis[f.tile] > 0.1 || LV.seen[f.tile]) flame(f.wx, f.wy, f.h, f.w, t, f.seed);
  for (let k = 0; k < PN; k++) {
    const kind = pkind[k]; if (!kind) continue;
    const x = Math.round(px_[k] - camX), y = Math.round(py_[k] - pz_[k] - camY);
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const col = kind === 1 ? (pcol[k] === 22 ? RED[3] : pcol[k]) : pcol[k];
    scr[y * W + x] = (kind === 2 || kind === 3 || kind === 4) ? col | EMIS : col;
    zbuf[y * W + x] = clamp(pz_[k] | 0, 0, 255);
  }
  lightPass(chars, kx, ky);
  drawHud();
  ctx.putImageData(outImg, 0, 0);
}
function drawGold(x, y, tile) {
  const sx = Math.round(x - camX), sy = Math.round(y - camY);
  for (const [a, b, c] of [[-2, 0, 50], [0, 0, 51], [2, 0, 49], [-1, -1, 51], [1, -1, 50], [0, -2, 51], [-3, 1, BLK], [3, 1, BLK], [-1, 1, 49], [1, 1, 49]]) {
    const xx = sx + a, yy = sy + b; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
    const o = yy * W + xx; scr[o] = c; zbuf[o] = 2; tbuf[o] = tile; cid[o] = 0;
  }
}
function drawProjectile(p) {
  const [x, y] = iso(p.fi, p.fj), sx = Math.round(x - camX), sy = Math.round(y - p.z - camY);
  const put = (a, b, c) => { const xx = sx + a, yy = sy + b; if (xx >= 0 && yy >= 0 && xx < W && yy < H) { const o = yy * W + xx; scr[o] = c; zbuf[o] = p.z; cid[o] = 0; } };
  if (p.kind === 'arrow') {
    const l = Math.hypot(p.vx, p.vy), dx = (p.vx - p.vy) / l * 16 / 22.6, dy = (p.vx + p.vy) / l * 8 / 22.6;
    for (let s = -4; s <= 3; s++) put(Math.round(dx * s * 1.4), Math.round(dy * s * 1.4), s > 2 ? 30 : 25);
    return;
  }
  const hot = p.kind === 'holy' ? [49, 50, 51] : [15, 16, 17];
  for (let b = -2; b <= 2; b++) for (let a = -2; a <= 2; a++) { const d = a * a + b * b; if (d <= 4) put(a, b, (d <= 1 ? (p.kind === 'holy' ? 27 : 18) : d <= 2 ? hot[2] : hot[1]) | EMIS); }
}

// lighting: static torch maps (scaled by flicker) + dynamic lights (hero, bolts), then fog of war,
// then a light-table lookup per pixel. Environment pixels dither between levels; characters get
// one level each so they never shimmer.
function lightPass(chars, kx, ky) {
  const t = G.t;
  const dyn = [{ x: kx, y: ky, z: 34, r: 145, i: 0.62 }];
  for (const p of projectiles) if (p.kind !== 'arrow' && dyn.length < 5) { const [x, y] = iso(p.fi, p.fj); dyn.push({ x, y, z: p.z, r: 70, i: 0.8 }); }
  const fl = g => 1 + 0.07 * Math.sin(t * 11 + g * 2.3) + 0.05 * Math.sin(t * 23.7 + g * 5.1) + 0.04 * Math.sin(t * 37 + g);
  const f0 = fl(0), f1 = fl(1), A = staticLight[0], B = staticLight[1];
  for (let y = 0; y < H; y++) {
    const wy = camY + y, o0 = y * W;
    if (wy < 0 || wy >= WH) { lbuf.fill(0, o0, o0 + W); continue; }
    const row = wy * WW + camX;
    for (let x = 0; x < W; x++) { const wx = camX + x; lbuf[o0 + x] = (wx >= 0 && wx < WW) ? A[row + x] * f0 + B[row + x] * f1 : 0; }
  }
  for (const L of dyn) {
    const lx = L.x - camX, ly = L.y - camY, r = L.r, r2 = r * r, li = L.i;
    const X0 = Math.max(0, Math.floor(lx - r) & ~1), X1 = Math.min(W, Math.ceil(lx + r)), Y0 = Math.max(0, Math.floor(ly - r / 2 - ZMAX) & ~1), Y1 = Math.min(H, Math.ceil(ly + r / 2));
    const lp = (x, y, z) => { const dx = x - lx, dy = (y + z - ly) * 2, dz = z - L.z, d2 = dx * dx + dy * dy + dz * dz; if (d2 >= r2) return 0; const f = 1 - d2 / r2; return f * f * li; };
    for (let y = Y0; y < Y1 - 1; y += 2) for (let x = X0; x < X1 - 1; x += 2) {
      const o = y * W + x, o2 = o + W, za = zbuf[o], zb = zbuf[o + 1], zc = zbuf[o2], zd = zbuf[o2 + 1];
      if (Math.max(za, zb, zc, zd) - Math.min(za, zb, zc, zd) <= 6) {
        const l = lp(x + 0.5, y + 0.5, (za + zb + zc + zd) >> 2);
        if (l) { lbuf[o] += l; lbuf[o + 1] += l; lbuf[o2] += l; lbuf[o2 + 1] += l; }
      } else { lbuf[o] += lp(x, y, za); lbuf[o + 1] += lp(x + 1, y, zb); lbuf[o2] += lp(x, y + 1, zc); lbuf[o2 + 1] += lp(x + 1, y + 1, zd); }
    }
  }
  const charLevel = chars.map(c => {
    const [x, y] = screenOf(c), sx = Math.round(x - camX), sy = Math.round(y - camY - 16);
    const l = (sx >= 0 && sy >= 0 && sx < W && sy < H) ? lbuf[sy * W + sx] : 0.3;
    return Math.min(L_ID + 2, Math.max(1, Math.round(l * BANDS)));   // capped: torch-side sprites must not blow out
  });
  const vis = LV.vis, seen = LV.seen, black = PAL32[BLK], top = (LEVELS - 1) * NPAL;
  const cl = charLevel.map(L => L * NPAL);
  for (let y = 0, o = 0; y < H; y++) {
    const by = (y & 3) << 2;
    for (let x = 0; x < W; x++, o++) {
      const v = scr[o];
      if (v === BLK) { out32[o] = black; continue; }
      const tk = tbuf[o];
      if (tk < 0 || !seen[tk]) { out32[o] = black; continue; }
      if (v & EMIS) { out32[o] = PAL32[v & 127]; continue; }
      const ci = cid[o];
      if (ci) { out32[o] = LCOL[cl[ci - 1] + v]; continue; }
      const vv = vis[tk];
      // remembered areas sit at a dim floor level; visible areas get their real light
      const l = (shd[o] ? lbuf[o] * 0.4 : lbuf[o]) * BANDS * vv + 0.9 * (1 - vv) + BAYER[by | (x & 3)];
      const L = (l | 0) * NPAL;
      out32[o] = LCOL[(L < top ? L : top) + v];
    }
  }
}

// ---------------------------------------------------------------- save / load (versioned)
const SAVE_KEY = 'dcg-save', SAVE_V = 1;
function saveGame() {
  if (G.mode !== 'play' || hero.dead) return;
  const data = { v: SAVE_V, level: LV.level, seed: LV.seed, hero: { hp: Math.ceil(hero.hp), mana: Math.ceil(hero.mana), gold: hero.gold, xp: hero.xp, lvl: hero.lvl, potions: hero.potions, team: hero.team, equip: hero.equip, bag: hero.bag }, serial: itemSerial };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) { /* storage can be unavailable; the game still runs */ }
}
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY); if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || d.v !== SAVE_V || !d.hero) return null;
    return d;
  } catch (e) { return null; }
}
function newHero() {
  Object.assign(hero, { hp: 40, mana: 20, gold: 0, xp: 0, lvl: 1, potions: 3, team: 'red', dead: 0, bag: [], equip: { weapon: null, helm: null, chest: null, shield: null } });
  const R = rng(5);
  hero.equip.weapon = rollItem(R, 1, 'short_sword'); hero.equip.weapon.rarity = 'normal'; hero.equip.weapon.mods = {};
  hero.equip.chest = rollItem(R, 1, 'tunic'); hero.equip.chest.rarity = 'normal'; hero.equip.chest.mods = {};
  recalcHero(); hero.hp = STAT.maxHp; hero.mana = STAT.maxMana;
}
function beginGame(fromSave) {
  const d = fromSave ? loadSave() : null;
  if (d) {
    newHero(); Object.assign(hero, d.hero); itemSerial = d.serial || 100; recalcHero();
    G.mode = 'play'; startLevel(d.level, d.seed);
  } else {
    newHero(); G.mode = 'play'; startLevel(1, (Math.random() * 1e9) >>> 0);
  }
}
function respawn() {
  hero.dead = 0; hero.clip = 'idle'; recalcHero(); hero.hp = STAT.maxHp; hero.mana = STAT.maxMana;
  hero.gold = Math.floor(hero.gold * 0.9);
  G.msg = []; say('YOU RISE AGAIN', 26, 2);
  startLevel(LV.level, LV.seed);
  saveGame();
}
