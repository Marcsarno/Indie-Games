'use strict';
// Game state, simulation, combat and rendering. UI and input live in ui.js.

// ---------------------------------------------------------------- frame buffers
// Round 21: the frame is OW x OH = SPX times the world's pixels. The world (floors, walls, scenery)
// is drawn and lit at W x H as before, then doubled into the frame. Characters, projectiles,
// particles and whatever stands in front of a character are drawn straight into the frame
// (characters are rendered with SPX times the detail). The HUD is drawn at W x H into its own buffer
// and merged on top as blocks. One upload per frame. The camera moves in frame pixels: the world is
// shifted by (hx, hy) frame pixels when the camera sits on a half pixel, so scrolling judders half as much.
let W = 270, H = 480;
let scr, zbuf, shd, cid, lbuf, tbuf, levB, frame2, out32, outImg, base32, OW, OH, ov32, ovImg, hud32, hudImg;
const cvs = document.getElementById('c');
const ctx = cvs.getContext('2d');
function allocBuffers(w, h) {
  W = w; H = h; OW = W * SPX; OH = H * SPX;
  cvs.width = OW; cvs.height = OH;
  scr = new Uint8Array(W * H); zbuf = new Uint8Array(W * H); shd = new Uint8Array(W * H); cid = new Uint8Array(W * H);
  lbuf = new Float32Array(W * H); tbuf = new Int16Array(W * H); levB = new Uint8Array(W * H);
  base32 = out32 = new Uint32Array(W * H); hud32 = new Uint32Array(W * H);
  ovImg = ctx.createImageData(OW, OH); ov32 = new Uint32Array(ovImg.data.buffer); frame2 = new Uint32Array(OW * OH);
  if (typeof uiResize === 'function') uiResize();
}
let camX = 0, camY = 0, cam2x = 0, cam2y = 0, hx = 0, hy = 0;
const params = new URLSearchParams(location.search);
const SHAKE = params.get('shake') !== '0';

// ---------------------------------------------------------------- state
const G = { t: 0, mode: 'title', paused: false, trauma: 0, fade: 0, fadeTo: null, msg: [], saveT: 0, kills: 0, meteors: [], flashes: [], blasts: [], cones: [], ghosts: [], sparks: [], rings: [], walls: [], quakes: [], hooks: [], waves: [], impacts: [], frost: [], streaks: [], fissures: [], aftershocks: [], fireGround: [], zaps: [], iceBursts: [], devils: [], rocks: [], strikes: [], traps: [], rain: [], falling: [], stuck: [], smoke: [], debris: [] };
const hero = {
  fam: 'hero', fi: 0, fj: 0, dir: 1, clip: 'idle', clock: 0, walk: 0, runT: 0, goT: 0, stopT: 0, atk: -1, combo: 0, swingEnd: -9, hitDone: false, stop: 0, flash: 0,
  hp: 40, mana: 20, gold: 0, xp: 0, lvl: 1, potions: 3, team: 'red', dead: 0, hurtT: 0, cast: -1,
  equip: { weapon: null, helm: null, chest: null, shield: null, ring: null, amulet: null }, bag: [],
  look: { team: 'red', helm: 'none', chest: 'tunic', weapon: 'sword', shield: 'none' },
};
let enemies = [], groundItems = [], projectiles = [], floaters = [];
const STAT = {};   // derived hero stats, recomputed on equip
function recalcHero() {
  const e = hero.equip, it = s => e[s] ? ITEM_BASES[e[s].base] : null, mods = {};
  for (const s in e) if (e[s]) for (const k in e[s].mods) mods[k] = (mods[k] || 0) + e[s].mods[k];
  for (const k in SETS) {   // set bonuses: two pieces, then all three
    const n = Object.values(e).filter(it => it && it.set === k).length;
    SETS[k].bonus.forEach((bn, i) => { if (n >= i + 2) for (const m in bn) mods[m] = (mods[m] || 0) + bn[m]; });
  }
  for (const k in OUTFITS) { const n = outfitCount(k, e); OUTFITS[k].bonus.forEach((bn, i) => { if (n >= i + 2) for (const m in bn) mods[m] = (mods[m] || 0) + bn[m]; }); }   // round 56: outfits (matching pieces of the art chat's sets)
  const w = it('weapon');
  const base = w ? w.dmg : [1, 3];
  const pct = 1 + (mods.dmgPct || 0) / 100 + hero.lvl * 0.03;
  STAT.dmg = [Math.round((base[0] + (mods.dmgFlat || 0)) * pct), Math.round((base[1] + (mods.dmgFlat || 0)) * pct)];
  STAT.armor = ['helm', 'chest', 'shield'].reduce((a, s) => a + (it(s)?.armor || 0), 0) + (mods.armorFlat || 0);
  STAT.block = it('shield')?.block || 0;
  // the mage trades life for a deep pool of mana that refills fast (spells are its only attack)
  const mage = hero.cls === 'mage', ranger = hero.cls === 'ranger';   // the ranger sits between: focus that refills steadily
  STAT.maxHp = (mage ? 32 : ranger ? 36 : 40) + (hero.lvl - 1) * (mage ? 7 : ranger ? 8 : 9) + (mods.hp || 0);
  STAT.maxMana = (mage ? 45 : ranger ? 30 : 20) + (hero.lvl - 1) * (mage ? 7 : ranger ? 5 : 4) + (mods.mana || 0);
  STAT.manaRegen = mage ? 4 + hero.lvl * 0.25 : ranger ? 2.6 + hero.lvl * 0.15 : 1.2;
  STAT.leech = mods.leech || 0;
  STAT.crit = mods.crit || 0; STAT.thorns = mods.thorns || 0; STAT.atkSpeed = mods.atkSpeed || 0; STAT.regen = mods.regen || 0; STAT.fireburst = mods.fireburst || 0;
  STAT.speed = 4.2 * (1 + (mods.speed || 0) / 100);
  for (const k of ['fireDmg', 'chill', 'goldFind', 'find', 'hpKill', 'manaKill', 'potion', 'dr']) STAT[k] = mods[k] || 0;   // round 42a
  STAT.slow = !!w?.slow;
  // legendaries change how their piece looks (glowing ember blade, oak-leaf crown, ...)
  const lgd = ['weapon', 'helm', 'chest', 'shield'].map(s => e[s] && e[s].rarity === 'legend' ? (e[s].fx || (LEGENDARIES.find(L => L.name === e[s].name) || {}).fx) : null).filter(Boolean).join('|');
  const setOn = Object.keys(SETS).find(k => Object.values(e).filter(it => it && it.set === k).length >= 2) || '';   // round 43: a set's own look from two pieces
  const wm = (e.weapon && e.weapon.mods) || {}, ench = wm.fireDmg ? 'fire' : wm.chill ? 'cold' : '';   // round 43: a Burning or Chilling weapon shows it
  hero.look = { set: setOn, ench, team: hero.team, helm: it('helm')?.look || 'none', chest: it('chest')?.look || 'tunic', weapon: w?.look || (mage ? 'staff' : ranger ? 'bow' : 'sword'), shield: it('shield')?.look || 'none', lgd };
  hero.hp = Math.min(hero.hp, STAT.maxHp); hero.mana = Math.min(hero.mana, STAT.maxMana);
}
const xpFor = l => Math.round(60 * Math.pow(l, 1.6));
function say(text, col = 26, t = 2.5) { G.msg.push({ text, col, t }); if (G.msg.length > 3) G.msg.shift(); }

// ---------------------------------------------------------------- level setup
// everything a fight leaves in the air: missiles, effects, particles, floaters (the skill preview
// clears it between loops too)
function resetFx() {
  groundItems = []; projectiles = []; floaters = []; pclear(); G.meteors = []; G.flashes = []; G.blasts = []; G.bolts = []; G.spikes = []; G.dust = []; G.mist = []; G.needles = []; G.clusters = []; G.bomblets = []; G.sentries = []; hero.hawks = []; hero.pips = 0; hero.quick = 0; G.cones = []; G.ghosts = []; G.sparks = []; G.rings = []; G.walls = []; G.quakes = []; G.hooks = []; G.waves = []; G.impacts = []; G.arcHits = []; G.frost = []; G.streaks = []; G.fissures = []; G.aftershocks = []; G.fireGround = []; G.zaps = []; G.iceBursts = []; G.devils = []; G.rocks = []; G.strikes = []; G.traps = []; G.rain = []; G.falling = []; G.stuck = []; G.smoke = []; G.debris = []; G.eliteFire = []; G.frostOrbs = []; G.summons = []; G.eliteBursts = []; G.blinkFx = []; G.leech = []; hero.ultOn = null; hero.roll = null; hero.blink2T = 0; hero.chillT = 0; hero.leap = null; hero.leapZ = 0;
}
function startLevel(level, seed, side = null) {
  genLevel(level, seed, side);
  buildWorld();
  hero.fi = LV.start.cx + 0.5; hero.fj = LV.start.cy + 0.5; hero.atk = -1; hero.clip = 'idle'; hero.dead = 0;
  enemies = LV.spawns.map((s, n) => makeEnemy(s.id, s.fi, s.fj, n, s.lvl));
  { const R = rng(seed ^ 0x5bd1);   // dungeon floors plan their champions (placeSpawns); other areas roll them per monster
    if (LV.champsPlanned) LV.spawns.forEach((sp, n) => { if (sp.champ) makeChampion(enemies[n], R); });
    else for (const e of enemies) if (!e.def.unique && R() < champChance(LV.diff)) makeChampion(e, R); }
  setupElites(); makeNpcs(); resetSkills(); setupBoss(); setupRoutines(seed);
  resetFx();
  updateFov(hero.fi, hero.fj);
  flowT = 0; computeFlow();
  warmStep(1e9, prewarm());   // idle poses + the hero's walk now, behind the level fade; the rest during play
  G.msg = [];
  if (LV.night) say('NIGHT HAS FALLEN', 39, 3);
  if (LV.area === 'town' && G.actShown !== level) { G.actCard = 3.2; G.actShown = level; }   // a new act: its title card (once per visit)
  else if (LV.area === 'town') say(areaName(), 51, 3);
  else say(areaName(), 51, 3);
  if (LV.arena) say('SOMETHING VAST STIRS IN THE DARK', 22, 4);
  G.tp = null;
  if (LV.area === 'town') { G.town = { level, seed }; if (G.portal) openPortalNear(hero.fi + 1.4, hero.fj + 0.4, true); }
  if (LV.area === 'forest') say(LV.autumn ? 'A TREANT ELDER HOLDS THE WAY DOWN' : 'AN OGRE WARLORD HOLDS THE WAY DOWN', 22, 4);
}
function makeEnemy(id, fi, fj, n, lvl) {
  const m = MONSTERS[id], lv = lvl || LV.diff;   // round 48c: a spawn may carry its own level (the Hollow's clearings climb in bands)
  // round 62 (HEAVY): more health, more for the big ones (fodder x1.6, the rank and file x2, bruisers
  // x2.3, uniques x1.5), and it climbs faster with the level (0.27 a level, compounding 1.5%) so
  // deeper floors outpace old gear and upgrades are felt. Damage keeps the old curve.
  const scale = 1 + (lv - 1) * 0.22, hpScale = !HEAVY ? scale : (1 + (lv - 1) * 0.27) * Math.pow(1.015, lv - 1) * (m.unique ? 1.5 : m.hp < 12 ? 1.6 : m.hp < 30 ? 2 : 2.3);
  return {
    id, def: m, fam: m.family, look: m.look, fi, fj, home: [fi, fj], dir: (n * 3) % 8, clip: 'idle', clock: n * 0.13, walk: 0,
    hp: Math.round(m.hp * hpScale), maxHp: Math.round(m.hp * hpScale), dmg: [Math.round(m.dmg[0] * scale), Math.round(m.dmg[1] * scale)],
    lvl: lv, state: 'sleep', atk: -1, hitDone: false, stop: 0, flash: 0, kb: [0, 0], hurt: 0, dying: -1, cool: 0.5 + hash(n, 3) * 1.5, seed: n,
  };
}
// build the sprites the level will need first (idle + walk, all directions) a few per frame
let warmQueue = [];
function prewarm() {
  warmQueue = [];
  // families with a monster near the start are built during the load; the rest (in a big forest,
  // the ogre at the far end among them) build in the background a few per frame
  const fams = new Map(), near = new Set();
  fams.set('hero', hero.look);
  for (const e of enemies) {
    const k = e.fam + lookKey(e.look); fams.set(k, [e.fam, e.look]);
    if (Math.hypot(e.fi - hero.fi, e.fj - hero.fj) < 14) near.add(k);
  }
  for (let d = 0; d < 8; d++) warmQueue.push(['hero', hero.look, d, 'idle', 0]);
  for (const [k, v] of fams) if (near.has(k)) for (let d = 0; d < 8; d++) warmQueue.push([v[0], v[1], d, 'idle', 0]);
  // the hero's walk is needed at once; monsters' walks fill in during play
  for (let d = 0; d < 8; d++) for (let f = 0; f < 8; f++) warmQueue.push(['hero', hero.look, d, 'walk', f]);
  if (hero.cls === 'mage') for (let d = 0; d < 8; d++) for (let f = 0; f < 12; f++) warmQueue.push(['hero', hero.look, d, 'channel', f]);
  if (hero.cls === 'ranger') for (let d = 0; d < 8; d++) { for (let f = 0; f < 4; f++) warmQueue.push(['hero', hero.look, d, 'shoot', f]); for (let f = 0; f < 3; f++) warmQueue.push(['hero', hero.look, d, 'vault', f]); for (let f = 0; f < 2; f++) warmQueue.push(['hero', hero.look, d, 'toss', f]); for (let f = 0; f < 4; f++) warmQueue.push(['hero', hero.look, d, 'volley', f]); }
  const now = warmQueue.length;
  for (const [k, v] of fams) if (k !== 'hero' && !near.has(k)) for (let d = 0; d < 8; d++) warmQueue.push([v[0], v[1], d, 'idle', 0]);
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
let flow = new Int16Array(MW * MH), flowT = 0;   // reallocated in computeFlow when the map size changes
function computeFlow() {
  if (flow.length !== MW * MH) flow = new Int16Array(MW * MH);
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

// round 48: the way to a point along the ground: the direction to walk now, or null when it is
// right here. Follows the flow field back from the goal (or the nearest reachable tile beside it: a
// door, someone in a doorway) toward the hero, and aims at the farthest step of that path in plain
// sight, so it bends round walls, trees and houses. { dir: [di, dj], len: steps, around: the way
// is much longer than the straight line } (dir is straight at the goal when it can't be reached)
const clearLine1 = (a, b, c, d) => { const n = Math.ceil(Math.max(Math.abs(c - a), Math.abs(d - b)) * 3) + 1; for (let s = 1; s < n; s++) { const t = s / n, i = Math.floor(a + (c - a) * t), j = Math.floor(b + (d - b) * t); if (tileAt(i, j) !== FLOOR || LV.solid[tIdx(i, j)]) return false; } return true; };
// (as wide as a body: the middle line and two beside it, so it never aims through a corner two blocks touch at)
const clearLine = (a, b, c, d) => { const l = Math.hypot(c - a, d - b) || 1, ox = -(d - b) / l * 0.3, oy = (c - a) / l * 0.3; return clearLine1(a, b, c, d) && clearLine1(a + ox, b + oy, c + ox, d + oy) && clearLine1(a - ox, b - oy, c - ox, d - oy); };
function wayTo(t) {
  const straight = Math.hypot(t[0] - hero.fi, t[1] - hero.fj);
  const ti = Math.floor(t[0]), tj = Math.floor(t[1]);
  let k = -1, best = 1e9;
  for (let b = -2; b <= 2; b++) for (let a = -2; a <= 2; a++) {
    const i = ti + a, j = tj + b; if (i < 0 || j < 0 || i >= MW || j >= MH) continue;
    const q = tIdx(i, j), d = flow[q]; if (d < 0 || flow.length !== MW * MH) continue;
    const sc = d + (a * a + b * b) * 4; if (sc < best) { best = sc; k = q; }
  }
  if (k < 0) return { dir: [t[0] - hero.fi, t[1] - hero.fj], len: straight, around: false };
  const len = flow[k], path = [k];
  for (let d = len; d > 0 && path.length < 6000; d--) {
    const i = k % MW, j = (k / MW) | 0; let nk = -1;
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + a, jj = j + b; if (ii < 0 || jj < 0 || ii >= MW || jj >= MH) continue; const q = tIdx(ii, jj); if (flow[q] === d - 1) { nk = q; break; } }
    if (nk < 0) break; k = nk; path.push(k);
  }
  let aim = null;
  for (let n = path.length - 1; n >= 0; n--) {
    const q = path[n], i = q % MW + 0.5, j = ((q / MW) | 0) + 0.5;
    if (Math.hypot(i - hero.fi, j - hero.fj) > 14) break;
    if (clearLine(hero.fi, hero.fj, i, j)) aim = [i, j];
  }
  if (!aim) aim = path.length > 1 ? [path[path.length - 2] % MW + 0.5, ((path[path.length - 2] / MW) | 0) + 0.5] : [t[0], t[1]];
  if (Math.hypot(aim[0] - hero.fi, aim[1] - hero.fj) < 0.3) aim = [t[0], t[1]];
  return { dir: [aim[0] - hero.fi, aim[1] - hero.fj], len, around: len > straight * 1.5 + 4 };
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
// The stick is in screen space. Round 20: the hero now moves exactly where the stick points on
// screen (the old isotropic mapping flattened diagonals: a 45 degree push went 27 degrees), and
// up/down is sped up on the ground so the on-screen speed is closer to even: a tile is 22.6 px
// wide but only 11.3 px tall, so the same ground speed looked half as fast going up or down.
// m = (screen px per ground tile ratio)^0.65: 1 sideways, 1.57 up/down, so screen speed varies by
// 1.27x instead of 2x (fully even would make the legs race when going up the screen).
function stickToGround(vx, vy) {
  const l = Math.hypot(vx, vy) || 1, ux = vx / l, uy = vy / l;
  const gi = ux / 16 + uy / 8, gj = uy / 8 - ux / 16, n = Math.hypot(gi, gj) || 1;
  return [gi / n, gj / n, Math.pow(Math.hypot(ux, 2 * uy), 0.65)];
}
// a spot where a whole body fits (all four corners of its footprint on open floor): where leaps,
// blinks and dodges may land. tryMove checks the same corners, so landing on a spot that only passes
// a point check left the hero overlapping a wall and unable to move (round 38 fix)
const standable = (fi, fj, r = 0.3) => !(blocked(fi - r, fj - r) || blocked(fi + r, fj - r) || blocked(fi - r, fj + r) || blocked(fi + r, fj + r));
// the safety net: if the hero ever ends up overlapping a wall, step to the nearest spot that fits
function unstickHero() {
  if (standable(hero.fi, hero.fj, 0.28)) return;
  for (let r = 0.1; r <= 1.6; r += 0.1) for (let a = 0; a < 16; a++) {
    const t = a / 16 * Math.PI * 2, fi = hero.fi + Math.cos(t) * r, fj = hero.fj + Math.sin(t) * r;
    if (standable(fi, fj, 0.3)) { hero.fi = fi; hero.fj = fj; return; }
  }
}
function tryMove(e, dfi, dfj, r = 0.28) {
  const ok = (ni, nj) => !(blocked(ni - r, nj - r) || blocked(ni + r, nj - r) || blocked(ni - r, nj + r) || blocked(ni + r, nj + r) || blocked(ni, nj - r) || blocked(ni, nj + r) || blocked(ni - r, nj) || blocked(ni + r, nj));
  if (ok(e.fi + dfi, e.fj + dfj)) { e.fi += dfi; e.fj += dfj; return true; }
  // round 47: blocked straight ahead: turn up to 70 degrees either way (the nearer way first) and
  // glide past the obstacle instead of stopping on its corner, then fall back to one axis at a time
  const l = Math.hypot(dfi, dfj);
  if (l > 1e-6) for (const a of [0.45, -0.45, 0.85, -0.85, 1.2, -1.2, 1.57, -1.57]) {   // (round 48c: last, straight sideways, so a body pressed into a corner at a shallow angle slides off it)
    const c = Math.cos(a), sn = Math.sin(a), k = a > 1.5 || a < -1.5 ? 0.6 : Math.cos(a) * 0.9, mi = (dfi * c - dfj * sn) * k, mj = (dfi * sn + dfj * c) * k;
    if (ok(e.fi + mi, e.fj + mj)) { e.fi += mi; e.fj += mj; return true; }
  }
  let moved = false;
  if (ok(e.fi + dfi, e.fj)) { e.fi += dfi; moved = true; }
  if (ok(e.fi, e.fj + dfj)) { e.fj += dfj; moved = true; }
  return moved;
}
function floater(text, fi, fj, z, col, size = 1) { const [x, y] = iso(fi, fj); floaters.push({ text, x, y: y - z, t: size > 1 ? 1.1 : 0.9, col, size }); }
const roll = r => r[0] + Math.floor(Math.random() * (r[1] - r[0] + 1));

// ---------------------------------------------------------------- hero actions
// past the held follow-through, the next swing may start (its last recovery key is skipped)
const canChain = () => !FEEL_OLD && hero.atk >= 0 && hero.hitDone && hero.cast < 0 && !(hero.dash > 0) && !(hero.whirl > 0) && hero.atk >= weaponSwing(hero.look, hero.combo).chain;
function heroAttack() {
  if (G.mode !== 'play' || hero.dead) return;
  if (hero.cls === 'mage') {   // the mage's attack: magic missiles, held to keep firing
    if (heroBusy()) { hero.buf = G.t + 0.3; return; }
    hero.buf = 0; castMissiles(); return;
  }
  if (hero.cls === 'ranger') { rangerShoot(); return; }   // round 33: the ranger's attack is a quick arrow (skills.js)
  if (heroBusy() && !canChain()) { if (!FEEL_OLD) hero.buf = G.t + 0.45; return; }   // a tap mid-swing is kept until the swing can chain (a heavy one takes longest)
  hero.buf = 0;
  if (hero.atk >= 0) hero.swingEnd = G.t;   // chained: the combo carries on
  // (round 43b: talking and trading moved to the action button, so attack always attacks)
  // target assist: face the nearest enemy within reach of a step or two
  let best = null, bd = 4.2;
  for (const e of enemies) { if (!alive(e) || LV.vis[tIdx(Math.floor(e.fi), Math.floor(e.fj))] < 0.3) continue; const d = Math.hypot(e.fi - hero.fi, e.fj - hero.fj); if (d < bd) { bd = d; best = e; } }
  if (best) {
    hero.dir = dirFrom(best.fi - hero.fi, best.fj - hero.fj);
    // out of reach: walk to it first (one tap is enough on a phone), then swing
    const reach = heroReach() + (best.def.unique ? 0.4 : 0.1);
    if (bd > reach + (FEEL_OLD ? 0 : 0.45)) { if (hero.atk >= 0) return; hero.approach = best; hero.approachT = 1.5; return; }
    // close the last bit during the wind-up (a knocked-back enemy stays in the string)
    hero.mag = FEEL_OLD ? 0 : Math.min(0.55, Math.max(0, bd - (reach - 0.25)));
  } else hero.mag = 0;
  // a swing that follows the last one quickly comes back the other way (forehand, backhand, ...)
  hero.combo = G.t - (hero.swingEnd ?? -9) < 0.3 ? ((hero.combo || 0) + 1) % 3 : 0;
  hero.approach = null; hero.atk = 0; hero.hitDone = false;
  sfx(STAT.slow ? 'heavySwing' : 'swing');
}
// a small step into the swing: walls stop it, and it never closes in past an enemy in front
function lungeHero(dist) {
  const [fx, fy] = dirVec(hero.dir), l = Math.hypot(fx, fy) || 1;
  for (const e of enemies) {
    if (!alive(e)) continue;
    const dx = e.fi - hero.fi, dy = e.fj - hero.fj, d = Math.hypot(dx, dy);
    if (d < 0.9 + (e.def.unique ? 0.5 : 0) && (dx * fx + dy * fy) / (l * (d || 1)) > 0.2) return;
  }
  tryMove(hero, fx / l * dist, fy / l * dist);
}
const heroReach = () => ({ sword: 1.45, greatsword: 1.75, flail: 1.5, spear: 1.75, kgsword: 1.75, sabre: 1.45 })[hero.look.weapon] || 1.35;   // (round 49: the art chat's spear and greatsword reach far)
function heroCast() {
  if (G.mode !== 'play' || hero.dead || hero.cast >= 0 || hero.dash > 0 || hero.whirl > 0) return;
  if (hero.atk >= 0) { hero.castQueued = true; return; }   // fires when the swing ends
  hero.castQueued = false;
  if (hero.mana < 6) { say('NOT ENOUGH MANA', 40, 1.2); return; }
  let best = null, bd = 9;
  for (const e of enemies) { if (!alive(e) || LV.vis[tIdx(Math.floor(e.fi), Math.floor(e.fj))] < 0.3) continue; const d = Math.hypot(e.fi - hero.fi, e.fj - hero.fj); if (d < bd && los(hero.fi, hero.fj, e.fi, e.fj)) { bd = d; best = e; } }
  if (best) hero.dir = dirFrom(best.fi - hero.fi, best.fj - hero.fj);
  hero.mana -= 6; hero.cast = 0.25; hero.castAge = CAST_RELEASE; hero.castKind = 'bolt'; sfx('bolt');
  const [dx, dy] = best ? [best.fi - hero.fi, best.fj - hero.fj] : dirVec(hero.dir), l = Math.hypot(dx, dy) || 1;
  projectiles.push({ kind: 'holy', fi: hero.fi + dx / l * 0.6, fj: hero.fj + dy / l * 0.6, vx: dx / l * 8, vy: dy / l * 8, z: 20, life: 1.4, owner: 'hero', dmg: [Math.round((STAT.dmg[0] * 0.9 + 3) * (hero.buff > 0 ? 1.4 : 1)), Math.round((STAT.dmg[1] * 0.9 + 5) * (hero.buff > 0 ? 1.4 : 1))] });
}
function drinkPotion() {
  if (G.mode !== 'play' || hero.dead) return;
  if (hero.potions <= 0) { say('NO POTIONS', 22, 1.2); return; }
  if (hero.hp >= STAT.maxHp) return;
  hero.potions--; hero.hp = Math.min(STAT.maxHp, hero.hp + Math.round((30 + hero.lvl * 3) * (1 + STAT.potion / 100))); sfx('potion'); hero.drinkT = 0.5;   // round 40a: the drink pose
  const [x, y] = screenOf(hero); burst(4, x, y, 20, 10, 30, 22);
}
// pow: 0 = light blow (sword swings, spells), 1 = heavy (two-handers), 2 = combo finisher
const HITSTOP = [0.045, 0.08, 0.11], KNOCK = [5, 7.7, 11];
const HITSTOP_H = [0.07, 0.12, 0.16], KNOCK_H = [6.2, 9.6, 13.5];   // round 62: HEAVY   // knock speed: tiles/s, ~1/14 of it is the slide
// round 62: a short jolt of the view in the direction of a blow (frame pixels), easing back
// the low thud layered under a melee blow (synthesized, so it never repeats a sample)
function RECIPES_THUD(v) { if (SFX.muted || !SFX.ctx || SFX.ctx.state !== 'running') return; const now = SFX.ctx.currentTime; if (SFX.last.thud && now - SFX.last.thud < 0.06) return; SFX.last.thud = now; try { SFX.vk = (typeof SYNTH_GAIN !== 'undefined' && SYNTH_GAIN.thud) || 1; RECIPES.thud(v); } catch (e) { /* audio is optional */ } SFX.vk = 1; }
function camKick(dx, dy, px) {
  const sx = (dx - dy), sy = (dx + dy) * 0.5, l = Math.hypot(sx, sy) || 1, k = Math.min(px, 4.5);
  G.kick = [(G.kick ? G.kick[0] : 0) * 0.4 + sx / l * k, (G.kick ? G.kick[1] : 0) * 0.4 + sy / l * k];
}
function damageEnemy(e, dmg, fromFi, fromFj, crit = false, pow = 0, ranged = false) {
  if (e.pw && !G.pierce) { dmg = eliteDamage(e, dmg, pow, fromFi, fromFj, ranged); if (dmg < 0) { if (e.state === 'sleep') wake(e); return; } }   // round 39: shields, blink openings
  if (e.shockT > 0) dmg = Math.round(dmg * 1.25);   // round 65: shocked (Chain Lightning): everything hits harder
  if (e.frozen > 0 && (G.elem === 'fire' || G.elem === 'heavy') && !e.def.unique) {   // round 65: fire or a heavy blow SHATTERS the ice: a big hit, and the ice is gone
    dmg = Math.round(dmg * 1.8); floater('SHATTER', e.fi, e.fj, e.def.chest + 26, 118);
    { const [x, y] = screenOf(e); burst(5, x, y, e.def.chest * 0.6, 22, 110, 118); burst(2, x, y, e.def.chest * 0.6, 14, 90, 27); }
    e.frozen = 0; sfx('clink'); if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.12);
  } else if (e.frozen > 0) dmg = Math.round(dmg * 1.4);   // frozen solid: hits land harder
  if (e.open && e.atk >= 0) { dmg = Math.round(dmg * 1.3); if (!e.def.unique) { e.atk = -1; e.open = false; e.leapZ = 0; e.hurt = Math.max(e.hurt || 0, 0.3); } floater('OPEN', e.fi, e.fj, e.def.chest + 26, 51); }   // round 34: punished in its recovery
  if (e.markT > 0) { dmg = Math.round(dmg * (e.markK || 1.35)); if (e.markLeech) hero.hp = Math.min(STAT.maxHp, hero.hp + dmg * e.markLeech); }   // round 33: Hunter's Mark
  const heroStop = hero.stop;
  // shield-bearers block blows from the front while they aren't swinging. A heavy blow breaks the
  // guard for a while; finishers, area spells, a frozen or stunned shield-bearer all get through
  if (!FEEL_OLD && e.look.shield === true && !e.def.unique && e.atk < 0 && !(e.frozen > 0) && !(e.stun > 0) && !(e.guardT > G.t) && !G.pierce && pow < 2) {
    const [fx, fy] = dirVec(e.dir), ax = fromFi - e.fi, ay = fromFj - e.fj, al = Math.hypot(ax, ay);
    if (al > 0.05 && (ax * fx + ay * fy) / al > 0.4) {
      const [ex, ey] = screenOf(e);
      if (pow === 1) { e.guardT = G.t + 2.5; dmg = Math.round(dmg * 0.6); floater('GUARD BROKEN', e.fi, e.fj, e.def.chest + 22, 51); burst(2, ex, ey, e.def.chest * 0.8, 14, 110, 31); sfx('block'); }
      else if (dmg * 0.25 < e.hp) {
        e.hp -= Math.max(1, Math.round(dmg * 0.25)); sfx('block');
        e.blocks = (e.blocks || 0) + 1;   // two blocks in a row and the arm drops: the next blows land
        if (e.blocks >= 2) { e.blocks = 0; e.guardT = G.t + 2.2; floater('GUARD BROKEN', e.fi, e.fj, e.def.chest + 22, 51); } else floater('BLOCK', e.fi, e.fj, e.def.chest + 14, 31);
        burst(2, ex, ey, e.def.chest * 0.8, 8, 80, 31); e.flash = 0.04; e.stop = 0.04;
        if (!ranged) hero.stop = Math.max(hero.stop, 0.035);
        const dd = Math.hypot(e.fi - fromFi, e.fj - fromFj) || 1; e.kb = [(e.fi - fromFi) / dd * 2, (e.fj - fromFj) / dd * 2];
        if (e.state === 'sleep') wake(e);
        return;
      }
    }
  }
  if (STAT.chill && !e.def.unique && Math.random() * 100 < STAT.chill) e.slowT = Math.max(e.slowT || 0, 1.5);   // round 42a: CHILLING gear
  if (e.windT > 0 && (pow >= 1 || dmg >= e.maxHp * 0.18)) e.windT = 0;   // a big hit stops a charge before it starts
  if (pow === 2 && e.look.shield === true) e.guardT = G.t + 2.2;   // a finisher knocks the shield aside
  ultGain(e, Math.min(dmg, Math.max(0, e.hp)), dmg >= e.hp); e.hp -= dmg; e.flash = FEEL_OLD ? (crit ? 0.09 : 0.05) : HEAVY ? (crit ? 0.13 : 0.09) : (crit ? 0.1 : 0.065); if (!FEEL_OLD) e.tint = 0.08;
  if (crit) floater(dmg + '!', e.fi, e.fj, e.def.chest + 18, 51, 2); else floater(String(dmg), e.fi, e.fj, e.def.chest + 14, 27);
  if (STAT.leech) hero.hp = Math.min(STAT.maxHp, hero.hp + Math.max(1, Math.round(dmg * STAT.leech / 100)));
  const [ex, ey] = screenOf(e), d = Math.hypot(e.fi - fromFi, e.fj - fromFj) || 1;
  const bony = e.fam === 'skeleton', ichor = e.fam === 'spider' ? 54 : 22;   // spiders bleed green
  burst(bony ? 5 : 1, ex, ey, e.def.chest, bony ? 8 : 12, 50, bony ? 25 : ichor, (e.fi - fromFi - (e.fj - fromFj)) / d * 20);
  burst(2, ex, ey, e.def.chest, crit ? 16 : 6, crit ? 120 : 70, crit ? 18 : 17);
  if (crit) { sfx('crit'); if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.2); }
  if (e.state === 'sleep') wake(e);
  // round 29: how the monster takes it depends on what hit it
  const small = !e.def.unique && !e.def.elite, el = G.elem;
  if (e.hp > 0 && !FEEL_OLD && small && !e.def.flee && !e.hurtFled && e.hp < e.maxHp * 0.3 && e.hp + dmg >= e.maxHp * 0.3 && Math.random() < 0.4) { e.hurtFled = true; e.panicT = Math.max(e.panicT || 0, 1.1); floater('!', e.fi, e.fj, e.def.chest + 16, 25); }   // round 35: badly hurt, some break off for a moment
  if (e.hp > 0) {
    if (el === 'fire') { e.burnT = 2.4; e.burnTick = 0.5; e.burnDmg = Math.max(1, Math.round(dmg * 0.15)); if (small && !e.def.flee && Math.random() < 0.5) e.panicT = Math.max(e.panicT || 0, 0.8); }
    if (el === 'heavy' && small && !(e.frozen > 0)) { e.downT = e.downT0 = 0.75; e.atk = -1; e.stun = 0; }
    if (el === 'arcane') { const dd = Math.hypot(e.fi - fromFi, e.fj - fromFj) || 1; e.kb = [(e.fi - fromFi) / dd * 2.2, (e.fj - fromFj) / dd * 2.2]; e.hurt = Math.max(e.hurt || 0, 0.12); }
    if (el === 'stagger') { const dd = Math.hypot(e.fi - fromFi, e.fj - fromFj) || 1; e.kb = [e.kb[0] + (e.fi - fromFi) / dd * 2.5, e.kb[1] + (e.fj - fromFj) / dd * 2.5]; e.hurt = Math.max(e.hurt || 0, 0.15); }
  }
  if (e.hp <= 0) {
    // the death fits the blow: fire burns it to ash, cold shatters it, a heavy blow throws the body
    e.deathKind = el === 'fire' ? 'ash' : (el === 'cold' || e.frozen > 0) ? 'shatter' : el === 'heavy' && small ? 'thrown' : null;
    // round 37: an overkill (a blow far past what was left, a crit or a finisher) bursts a small one apart
    if (!FEEL_OLD && small && !e.deathKind && e.fam !== 'skeleton' && dmg - (e.hp + dmg) >= e.maxHp * 0.6 && (crit || pow >= 1)) e.deathKind = 'gib';
    if (!FEEL_OLD) deathWeight(e, fromFi, fromFj, dmg, crit, pow);
    if (e.deathKind === 'thrown') { const dd = Math.hypot(e.fi - fromFi, e.fj - fromFj) || 1; e.throwV = [(e.fi - fromFi) / dd * 7, (e.fj - fromFj) / dd * 7]; }
    e.burnT = 0; e.downT = 0;
    e.dying = 0; e.atk = -1; e.clip = 'death'; e.tint = 0;
    if (FEEL_OLD) { e.stop = crit ? 0.2 : 0.15; hero.stop = Math.max(hero.stop, e.stop); }
    else { e.stop = crit ? 0.15 : 0.12; hero.stop = Math.max(hero.stop, e.stop * 0.65); }
    if (e.frozen > 0) { const [x, y] = screenOf(e); burst(5, x, y, e.def.chest, 18, 90, 118); burst(2, x, y, e.def.chest, 10, 80, 117); e.frozen = 0; if (e.deepIce) G.iceBursts.push({ fi: e.fi, fj: e.fj }); }   // shatters (Deep Freeze: and bursts)
    if (ranged) hero.stop = heroStop;   // spells and arrows never freeze the caster
    if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.5);
    sfx('kill'); if (HEAVY) RECIPES_THUD(ranged ? 0.7 : 1.2);
    if (e.deathKind === 'gib') gibBurst(e, fromFi, fromFj);
    else if (bony) shatter(e, fromFi, fromFj);   // skeletons burst apart into a heap of bones
    else stampBlood(Math.round(ex), Math.round(ey), e.def.unique ? 6 : 3, (Math.random() * 1e6) | 0, e.fam === 'spider' ? GREEN : RED);
    const streak = killStreak();
    questKill(e.id); guideKill(e);
    if (e.pw) eliteDeath(e);
    gainXp(e.def.xp * (1 + ((e.lvl || LV.diff) - 1) * 0.3) * (e.champ ? 3 + (e.pw ? e.pw.length - 1 : 0) : 1) * (e.summonedBy ? 0.2 : 1) * (1 + Math.max(0, streak - 2) * 0.1));
    if (STAT.hpKill) hero.hp = Math.min(STAT.maxHp, hero.hp + STAT.hpKill);
    if (STAT.manaKill) hero.mana = Math.min(STAT.maxMana, hero.mana + STAT.manaKill);
    if (!e.noLoot) dropLoot(e.fi, e.fj, e.def.unique ? 4 : e.champ ? 3 + (e.pw ? e.pw.length - 1 : 0) : e.def.elite ? 3 : 1, e.def.unique || !!e.champ || !!e.def.elite);
    if (e.def.unique || (e.champ && Math.random() < 0.08)) groundItems.push({ item: rollLegendary(rng((Math.random() * 1e9) | 0)), fi: e.fi, fj: e.fj, t: 0 });
    if ((e.champ || e.def.elite) && Math.random() < 0.12) groundItems.push({ item: rollSetItem(rng((Math.random() * 1e9) | 0)), fi: e.fi + 0.4, fj: e.fj, t: 0 });
    if (e.def.treasure) {   // the sack bursts: a spray of gold and gems, often a legendary
      for (let k = 0; k < 10; k++) { const a = k / 10 * 6.283, p = [e.fi + Math.cos(a) * 0.9, e.fj + Math.sin(a) * 0.9]; if (blocked(p[0], p[1])) continue; groundItems.push(k % 3 ? { gold: Math.round((6 + Math.random() * 10) * LV.diff), fi: p[0], fj: p[1], t: 0 } : { gem: GEMS[Math.floor(Math.random() * 4)], fi: p[0], fj: p[1], t: 0 }); }
      if (Math.random() < 0.35) groundItems.push({ item: rollLegendary(rng((Math.random() * 1e9) | 0)), fi: e.fi, fj: e.fj, t: 0 });
      say('THE SACK BURSTS!', 51, 2);
    }
    // Emberbrand: the kill erupts in fire that scorches everything close by (no chain reactions)
    if (STAT.fireburst && !G.bursting) {
      G.bursting = true; burst(2, ex, ey, e.def.chest * 0.6, 26, 110, 16); burst(3, ex, ey, 6, 14, 40, 17); sfx('fireball');
      for (const o of enemies) if (o !== e && alive(o) && Math.hypot(o.fi - e.fi, o.fj - e.fj) < 1.9) damageEnemy(o, Math.max(1, Math.round(heroDmg(1) * 0.6)), e.fi, e.fj, false);
      G.bursting = false;
    }
    if (e.def.leader) {   // the pack scatters when its shaman or chieftain falls
      let n = 0;
      for (const o of enemies) if (o !== e && alive(o) && o.def.pack && o.fam === e.fam && Math.hypot(o.fi - e.fi, o.fj - e.fj) < 7) { o.panicT = 2.5 + Math.random() * 1.5; o.atk = -1; floater('!', o.fi, o.fj, o.def.chest + 16, 51); n++; }
      if (n >= 2) say('THEY SCATTER IN PANIC', 51, 1.6);
    }
    if (e === boss) { say(`THE ${e.def.name} IS SLAIN`, 51, 4); if (!(e.id === 'skelking' && finaleDue())) say('THE WAY DOWN IS OPEN', 26, 4); sfx('levelUp'); G.slowmo = 0.9; G.bossIntro = 0; if (e.id === 'skelking' && finaleDue()) startFinale(); }   // (round 67: then Maelis)
    G.kills++; if (hero.stats) hero.stats.kills++;
  } else {
    sfx('hit'); if (HEAVY) RECIPES_THUD((ranged ? 0.45 : 0.7) + pow * 0.25 + (crit ? 0.3 : 0));
    if (FEEL_OLD) {
      e.stop = crit ? 0.11 : 0.07; hero.stop = Math.max(hero.stop, e.stop);
      e.kb = [(e.fi - fromFi) / d * 3, (e.fj - fromFj) / d * 3];
      if (dmg >= e.maxHp * 0.18 && !e.def.unique) { e.atk = -1; e.hurt = 0.18; }
    } else {
      // the freeze scales with the blow; the hero's is shorter than the target's, so control stays snappy
      e.stop = (HEAVY ? HITSTOP_H : HITSTOP)[pow] + (crit ? 0.03 : 0); hero.stop = Math.max(hero.stop, e.stop * 0.6);
      if (HEAVY) camKick(e.fi - fromFi, e.fj - fromFj, (ranged ? 0.8 : 1.6) + pow * 0.9 + (crit ? 0.8 : 0));   // round 62: the view jolts with the blow
      // every hit shoves: heavier blows further, bosses barely, elites and champions half
      const mass = e.def.unique ? 0.15 : e.def.elite || e.champ ? 0.5 : 1, v = (HEAVY ? KNOCK_H : KNOCK)[pow] * mass * (crit ? 1.25 : 1);
      e.kb = [(e.fi - fromFi) / d * v, (e.fj - fromFj) / d * v];
      // every hit flinches an enemy that isn't mid-attack; a big hit, a heavy blow or a finisher also
      // interrupts its attack (Diablo's hit recovery). Bosses never flinch; elites only to finishers.
      const big = dmg >= e.maxHp * 0.18 || pow >= 1;
      if (e.def.unique) {}
      else if ((e.def.elite || e.champ) ? pow === 2 : big) { e.atk = -1; e.hurt = Math.max(e.hurt, pow === 2 ? 0.34 : 0.22); }
      else if (e.atk < 0) e.hurt = Math.max(e.hurt, 0.13);
      if (e.frozen > 0) { e.hurt = 0; e.kb = [e.kb[0] * 0.2, e.kb[1] * 0.2]; }   // ice holds it in place
    }
    if (ranged) hero.stop = heroStop;
  }
}
const CRIT_CHANCE = 0.12;
// round 37: deaths with weight. The body is knocked back along the blow (harder for a crit or a
// finisher, barely for a boss), hops once and thuds down; each family gives its own cry; a fallen's
// weapon goes spinning; the last of a fight goes down in a moment of slow motion
function deathWeight(e, fromFi, fromFj, dmg, crit, pow) {
  const d = Math.hypot(e.fi - fromFi, e.fj - fromFj) || 1, ux = (e.fi - fromFi) / d, uy = (e.fj - fromFj) / d;
  const big = !!e.def.unique, sp = big ? 0.8 : crit || pow >= 2 ? 5.2 : pow >= 1 ? 4.2 : 3;
  e.deathV = [ux * sp, uy * sp]; e.deathHop = big ? 1 : crit || pow >= 1 ? 6 : 3.5;
  if (d > 0.05) e.dir = dirFrom(-ux, -uy);   // facing the blow, so it tips over backwards, away from it
  const cry = { fallen: 'squeal', hound: 'yelp', spider: 'hiss', skeleton: null }[e.fam];
  if (cry) sfx(cry);
  if (e.fam === 'fallen' && !e.look.unarmed && e.deathKind !== 'gib' && e.deathKind !== 'ash' && e.deathKind !== 'shatter') {   // the weapon flies out of its hands
    const a = Math.atan2(uy, ux) + (Math.random() < 0.5 ? 1 : -1) * (0.6 + Math.random() * 0.8), s2 = 1.6 + Math.random() * 1.6;
    G.debris.push({ kind: e.look.digger ? 'pick' : e.look.staff ? 'staff' : 'spear', fi: e.fi, fj: e.fj, z: e.def.chest + 6, vx: Math.cos(a) * s2, vy: Math.sin(a) * s2, vz: 140 + Math.random() * 60, spin: Math.random() * 6, vs: 16 + Math.random() * 10, b: 0 });
  }
  // the last one standing of a real fight: a beat of slow motion
  (G.killTimes = G.killTimes || []).push(G.t); G.killTimes = G.killTimes.filter(t => G.t - t < 10);
  const others = enemies.some(o => o !== e && alive(o) && o.state !== 'sleep' && Math.hypot(o.fi - hero.fi, o.fj - hero.fj) < 12);
  if (!others && G.killTimes.length >= 3 && !(G.slowmo > 0) && !hero.ultOn && !(G.t - (G.ultAt || -99) < 5)) { G.slowmo = 0.5; G.killTimes = []; }   // (round 52: never during or just after an ultimate: it read as the phone slowing down)
}
// an overkill: chunks and a spray of blood (or ichor), no body left
function gibBurst(e, fromFi, fromFj) {
  const [x, y] = screenOf(e), d = Math.hypot(e.fi - fromFi, e.fj - fromFj) || 1, ux = (e.fi - fromFi) / d, uy = (e.fj - fromFj) / d;
  const flesh = e.look.skin === M.FUR ? [DIRT[2], DIRT[3]] : e.fam === 'spider' ? [54, 55] : [20, 22], blood = e.fam === 'spider' ? GREEN : RED;
  const a0 = Math.atan2(uy, ux);
  for (let k = 0; k < 16; k++) { const a = a0 + (Math.random() - 0.5) * 2.4, s = 60 + Math.random() * 90, gx = Math.cos(a) * s, gy = Math.sin(a) * s; pspawn(7, x, y, e.def.chest * 0.8, (gx - gy) * 0.7, (gx + gy) * 0.35, 60 + Math.random() * 80, 3, flesh[k & 1]); }
  burst(1, x, y, e.def.chest, 30, 130, e.fam === 'spider' ? 54 : 22, (ux - uy) * 40);
  for (let k = 0; k < 3; k++) stampBlood(Math.round(x + (ux - uy) * k * 9), Math.round(y + (ux + uy) * k * 4.5), 4 - k, (Math.random() * 1e6) | 0, blood);
  impactFlash(e.fi, e.fj, e.def.chest, 7);
  if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.25);
  sfx('splat'); e.corpse = true;   // gone at once: nothing left standing through the kill's hit-pause
}
// flying debris (a skull, a weapon): arcs, bounces, skids to rest, then is pressed into the floor
function updateDebris(dt) {
  for (const b of G.debris) {
    b.vz -= 520 * dt; b.z += b.vz * dt; b.spin += b.vs * dt;
    const ni = b.fi + b.vx * dt, nj = b.fj + b.vy * dt;
    if (blocked(ni, nj)) { b.vx *= -0.4; b.vy *= -0.4; } else { b.fi = ni; b.fj = nj; }
    if (b.z <= 0) {
      b.z = 0; b.b++;
      if (b.vz < -60 && b.b < 4) { b.vz = -b.vz * 0.38; b.vx *= 0.55; b.vy *= 0.55; b.vs *= 0.5; sfx(b.kind === 'skull' ? 'clink' : 'clank', 0.5); }
      else { b.done = true; stampDebris(b); }
    }
  }
  G.debris = G.debris.filter(b => !b.done);
}
const debrisPixels = b => {   // its shape in world pixels about its centre: [dx, dy, colour]
  if (b.kind === 'skull') return [[0, -1, b.col], [1, -1, b.col], [-1, 0, b.col], [0, 0, BLK], [1, 0, b.col], [2, 0, BLK], [0, 1, b.col], [1, 1, b.col], [-1, -1, b.col], [2, -1, b.col], [0, -2, b.col], [1, -2, b.col]];
  const px = [], ca = Math.cos(b.spin), sa = Math.sin(b.spin) * 0.5, L = b.kind === 'pick' ? 4 : 6;
  for (let s = -L; s <= L; s++) px.push([Math.round(ca * s), Math.round(sa * s), s > L - 2 ? STEEL[3] : WOOD[1]]);
  if (b.kind === 'pick') for (let s = -3; s <= 3; s++) px.push([Math.round(ca * L - sa * s * 2), Math.round(sa * L + ca * s), STEEL[2]]);
  return px;
};
function stampDebris(b) {
  const [x0, y0] = iso(b.fi, b.fj);
  for (const [dx, dy, c] of debrisPixels(b)) { const x = Math.round(x0 + dx), y = Math.round(y0 + dy), k = y * WW + x; if (x >= 0 && y >= 0 && x < WW && y < WH && wFloor[k]) setFloor(k, c); }
}
function drawDebris() {   // in the air: on the detail layer, with a dark outline and a shadow under it
  for (const b of G.debris) {
    const [x, y] = iso(b.fi, b.fj), X = Math.round(x * SPX - cam2x), Y = Math.round((y - b.z) * SPX - cam2y), Ys = Math.round(y * SPX - cam2y);
    for (let a = -3; a <= 3; a++) ovSet(X + a, Ys + (Math.abs(a) > 2 ? 0 : 1), BLK);
    const px = debrisPixels(b);
    for (const [dx, dy] of px) for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ovSet(X + dx * 2 + ox, Y + dy * 2 + oy, BLK);
    for (const [dx, dy, c] of px) { ovSet(X + dx * 2, Y + dy * 2, c); ovSet(X + dx * 2 + 1, Y + dy * 2, c); ovSet(X + dx * 2, Y + dy * 2 + 1, c); ovSet(X + dx * 2 + 1, Y + dy * 2 + 1, c); }
  }
}
function shatter(e, fromFi, fromFj) {
  const [x, y] = screenOf(e), d = Math.hypot(e.fi - fromFi, e.fj - fromFj) || 1, dx = (e.fi - fromFi - (e.fj - fromFj)) / d * 40;
  burst(5, x, y, e.def.chest, 22, 90, e.look.bone === M.OLDBONE ? 25 : 26, dx);
  for (let k = 0; k < 9; k++) { const a = Math.random() * 6.283, s = 40 + Math.random() * 60; pspawn(6, x, y, 10 + Math.random() * 20, Math.cos(a) * s + dx, Math.sin(a) * s * 0.5, 50 + Math.random() * 60, 3, 26); }
  blitWorld(PROPS.bones(Math.floor(Math.random() * 6)), x, y, 0, -1, true);
  e.corpse = true;   // no tipping corpse: the bones are on the floor now
  if (!FEEL_OLD) {   // round 37: the skull pops off and bounces away
    const ux = (e.fi - fromFi) / d, uy = (e.fj - fromFj) / d, a = Math.atan2(uy, ux) + (Math.random() - 0.5) * 0.9, sp = 2.2 + Math.random() * 1.6;
    G.debris.push({ kind: 'skull', fi: e.fi, fj: e.fj, z: e.def.chest * 1.6 + 6, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 120 + Math.random() * 60, spin: 0, vs: 14, col: e.look.bone === M.OLDBONE ? BONE[1] : BONE[3], b: 0 });
    sfx('clatter');
  }
}
// kills within 2.5 s of each other build a streak: bonus xp, a little life back, a rising chime
function killStreak() {
  G.streak = G.t - (G.lastKill ?? -9) < 2.5 ? (G.streak || 0) + 1 : 1; G.lastKill = G.t;
  if (G.streak >= 3) {
    G.streakShow = { n: G.streak, t: 1.6 };
    hero.hp = Math.min(STAT.maxHp, hero.hp + STAT.maxHp * 0.03);
    sfx('streak', G.streak);
  }
  return G.streak;
}
// round 35: waking is a moment, not a switch. Whoever sees the hero starts with a hop, a '!' and a cry;
// those near it turn and join a beat later each, so a room comes alive in a ripple
function wake(e, seen = false) {
  if (e.state !== 'sleep') return;
  e.state = 'hunt';
  if (!FEEL_OLD && !e.def.unique) { e.alertT = seen ? 0.5 : 0.15; e.alertT0 = e.alertT; if (seen) { floater('!', e.fi, e.fj, e.def.chest + 18, 51, 2); sfx('growl'); } }
  for (const o of enemies) if (o.state === 'sleep' && Math.hypot(o.fi - e.fi, o.fj - e.fj) < (FEEL_OLD ? 4 : 5)) {
    o.state = 'hunt';
    if (!FEEL_OLD && !o.def.unique) { o.alertT = 0.25 + Math.random() * 0.55; o.alertT0 = o.alertT; }
  }
}
// all = the heavy slam: hits everything in reach around the hero, not just in front
function heroHitResolve(all = false, pow = 0) {
  const [fx, fy] = dirVec(hero.dir), reach = heroReach() + 0.1;
  let any = false, nHit = 0;
  if (G.frostOrbs.length) swingBreaksOrbs();   // round 39: a swing breaks a frost orb before it bursts
  for (const e of enemies) {
    if (!alive(e)) continue;
    const dx = e.fi - hero.fi, dy = e.fj - hero.fj, d = Math.hypot(dx, dy), rr = reach + (e.def.unique ? 0.5 : 0.2);
    if (d > rr || (!all && d > 0.3 && (dx * fx + dy * fy) / d < 0.35)) continue;
    const crit = Math.random() < CRIT_CHANCE + (STAT.crit || 0) / 100;
    damageEnemy(e, heroDmg(crit ? 2 : 1), hero.fi, hero.fj, crit, pow); any = true; nHit++;
  }
  for (const p of dynProps) {
    if (p.broken || (p.kind !== 'barrel' && p.kind !== 'egg')) continue;
    const dx = p.i + 0.5 - hero.fi, dy = p.j + 0.5 - hero.fj, d = Math.hypot(dx, dy);
    if (d < 1.6 && (dx * fx + dy * fy) / (d || 1) > 0.3) hitProp(p);
  }
  // fury: the warrior's blows feed his skills (1.5 mana per enemy hit, up to 3 a swing)
  if (nHit && hero.cls === 'warrior') hero.mana = Math.min(STAT.maxMana, hero.mana + Math.min(3, nHit) * 1.5);
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
    say(`LEVEL UP! LEVEL ${hero.lvl}`, 51, 3); sfx('levelUp'); guideLevel();
    const [x, y] = screenOf(hero); burst(4, x, y, 10, 24, 40, 51);
  }
}
const GREY_KEEP = 0.4;   // round 47: a few more greys now they can be salvaged from the bag (was 0.25)   // share of rolled grey items that actually drop
function dropLoot(fi, fj, n, rich) {
  const R = rng((Math.random() * 1e9) | 0);
  for (let k = 0; k < n; k++) {
    const a = Math.random() * 6.28, r = 0.3 + Math.random() * 0.5;
    let p = [fi + Math.cos(a) * r, fj + Math.sin(a) * r];
    if (blocked(p[0], p[1])) p = [fi, fj];
    const q = Math.random();
    if (q < 0.45 || rich && k === 0) groundItems.push({ gold: Math.round((2 + Math.random() * 6) * LV.diff * (rich ? 3 : 1)), fi: p[0], fj: p[1], t: 0 });
    else if (q < 0.6) groundItems.push({ item: rollItem(R, LV.diff, Math.random() < 0.35 ? 'mana' : 'heal'), fi: p[0], fj: p[1], t: 0 });
    else if (q < 0.66 || (rich && k === 1)) groundItems.push({ gem: GEMS[Math.min(3, Math.floor(Math.random() * (1.5 + LV.diff * 0.5)))], fi: p[0], fj: p[1], t: 0 });   // gems: rarer kinds deeper in
    // round 25b: greys are thinned to a quarter (the rest become a little gold); magic and rare
    // rates are as they always were
    else if (q < (rich ? 1 : 0.8)) {
      const it = rollItem(R, LV.diff);
      if (it.rarity !== 'normal' || Math.random() < GREY_KEEP) groundItems.push({ item: it, fi: p[0], fj: p[1], t: 0 });
      else groundItems.push({ gold: Math.round((2 + Math.random() * 6) * LV.diff), fi: p[0], fj: p[1], t: 0 });
    }
  }
}
function pickup(g) {
  if (g.gold && STAT.goldFind && !g.found) { g.gold = Math.round(g.gold * (1 + STAT.goldFind / 100)); g.found = true; }   // round 42a: GILDED gear
  if (g.gem) { const v = Math.round(g.gem.worth * (1 + LV.diff * 0.25) * (1 + STAT.goldFind / 100)); hero.gold += v; sfx('gold'); floater(`${g.gem.name} +${v}`, g.fi, g.fj, 12, g.gem.cols[2]); return true; }
  if (g.gold) { sfx('gold'); hero.gold += g.gold; floater(g.gold + ' GOLD', g.fi, g.fj, 10, 50); return true; }
  const b = ITEM_BASES[g.item.base];
  if (b.mana) { hero.mana = Math.min(STAT.maxMana, hero.mana + b.mana); sfx('potion'); floater('+' + b.mana + ' MANA', g.fi, g.fj, 12, 39); const [x, y] = screenOf(hero); burst(4, x, y, 20, 10, 30, 40); return true; }
  if (b.slot === 'potion') { if (hero.potions >= 8) return false; hero.potions++; sfx('pickup'); say('HEALING POTION', 22, 1.2); return true; }
  if (hero.bag.length >= BAG_SIZE) { if (!g.warned) say('YOUR BAG IS FULL', 22, 1.5); g.warned = true; return false; }
  g.item.isNew = true; hero.bag.push(g.item); if (g.guide && !hero.tut.gear) startGuide('gear', g.item); say((g.item.rarity === 'legend' ? 'LEGENDARY: ' : g.item.rarity === 'set' ? 'SET ITEM: ' : '') + itemName(g.item), RARITY_COL[g.item.rarity], g.item.rarity === 'legend' ? 3.5 : 2); sfx(g.item.rarity === 'legend' ? 'levelUp' : 'pickup');
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
function prewarmHero() { for (let d = 0; d < 8; d++) { warmQueue.unshift([ 'hero', hero.look, d, 'idle', 0]); if (hero.cls === 'mage') for (let f = 0; f < 12; f++) warmQueue.push(['hero', hero.look, d, f < 8 ? 'channel' : 'channel', f]); if (hero.cls === 'mage') { for (let f = 0; f < 4; f++) warmQueue.push(['hero', hero.look, d, 'storm', f]); for (let f = 0; f < 2; f++) warmQueue.push(['hero', hero.look, d, 'arrive', f]); } if (hero.cls === 'ranger') { for (let f = 0; f < 4; f++) { warmQueue.push(['hero', hero.look, d, 'shoot', f]); warmQueue.push(['hero', hero.look, d, 'volley', f]); warmQueue.push(['hero', hero.look, d, 'skyshot', f]); } for (let f = 0; f < 3; f++) warmQueue.push(['hero', hero.look, d, 'vault', f]); for (let f = 0; f < 2; f++) warmQueue.push(['hero', hero.look, d, 'toss', f]); } for (let f = 0; f < 8; f++) warmQueue.push(['hero', hero.look, d, 'walk', f]); warmQueue.push(['hero', hero.look, d, 'go', 0], ['hero', hero.look, d, 'stop', 0]);
  if (!FEEL_OLD) {   // round 40a: the short poses, so the first one shown is never a stand-in
    for (let f = 0; f < 4; f++) warmQueue.push(['hero', hero.look, d, 'hit', f]);
    warmQueue.push(['hero', hero.look, d, 'pivot', 0], ['hero', hero.look, d, 'skid', 0], ['hero', hero.look, d, 'drink', 8]);
    if (hero.cls === 'warrior') { for (let f = 0; f < 3; f++) warmQueue.push(['hero', hero.look, d, 'hook', f]); for (let f = 0; f < 4; f++) warmQueue.push(['hero', hero.look, d, 'spin', f]); for (let f = 0; f < 6; f++) warmQueue.push(['hero', hero.look, d, 'attack4', f]); }
  } } }

// ---------------------------------------------------------------- update
const input = { mx: 0, my: 0, attack: false, keys: new Set() };
function update(dt) {
  updateMusic(dt);   // round 39b: the forest song fades in and out by area (sound.js)
  // a boss's death plays in slow motion for a moment
  if (G.slowmo > 0) { G.slowmo -= dt; dt *= 0.35; }
  if (G.bossIntro > 0) G.bossIntro -= dt;
  if (G.actCard > 0) G.actCard -= dt;
  if (STAT.regen && !hero.dead && G.mode === 'play') hero.hp = Math.min(STAT.maxHp, hero.hp + STAT.regen * dt);
  G.t += dt;
  for (const m of G.msg) m.t -= dt; G.msg = G.msg.filter(m => m.t > 0);
  if (G.fadeTo) { G.fade = Math.min(1, G.fade + dt * 2.5); if (G.fade >= 1) { const f = G.fadeTo; G.fadeTo = null; f(); } }
  else G.fade = Math.max(0, G.fade - dt * 2);
  updateGuide(dt);
  if (G.mode === 'skills' && !PREVIEW) pvTick(dt);   // round 45: the skill preview runs while its screen is open
  if (G.mode !== 'play' || G.paused) return;
  if (hero.stats && !hero.dead) hero.stats.t += dt;   // round 67: for the end-of-act screen
  if (guideFrozen()) { const k = 1 - G.guide.t / 0.4; if (k <= 0) return; dt *= k; }   // round 45: slow to a stop for the guide
  G.saveT += dt; if (G.saveT > 20) { G.saveT = 0; saveGame(); }
  G.trauma = Math.max(0, G.trauma - dt * 1.4);
  if (G.kick) { const f = Math.exp(-dt * 22); G.kick[0] *= f; G.kick[1] *= f; if (Math.abs(G.kick[0]) + Math.abs(G.kick[1]) < 0.3) G.kick = null; }   // round 62
  updateHero(dt);
  flowT -= dt; if (flowT <= 0) { flowT = 0.4; computeFlow(); }
  assignEngage();
  for (const e of enemies) updateEnemy(e, dt);
  if (boss && !boss.introduced && boss.state !== 'sleep' && alive(boss)) { boss.introduced = true; G.bossIntro = 2.8; sfx('cry'); }   // the title card
  updateNpcs(dt); updateShrines();
  for (const g of groundItems) if (g.item && g.item.rarity === 'legend' && !g.announced) { g.announced = true; say('A LEGENDARY ITEM HAS FALLEN', 112, 3); sfx('levelUp'); }   // never miss one
  if (hero.frenzy > 0) hero.frenzy -= dt; if (hero.stoneskin > 0) hero.stoneskin -= dt;
  separate();
  updateProjectiles(dt); updateMeteors(dt); updateLichFx(dt); updateWarriorFx(dt); updateImpactFx(dt); updateLightning(dt); updateSlamFx(dt); updateFrostFx(dt); updateRangerKit(dt); updateSlamMods(dt); updateFireGround(dt); updateMods30(dt); updateUlt(dt); updateDebris(dt); updateEliteFx(dt);
  updateParticles(dt);
  ambience(dt);
  for (const f of floaters) { f.t -= dt; f.y -= dt * 18; }
  if (G.streakShow) G.streakShow.t -= dt;
  floaters = floaters.filter(f => f.t > 0);
  for (const g of groundItems) g.t += dt;
}
function updateHero(dt) {
  if (hero.dead) { hero.dead += dt; hero.clock += dt; hero.flash = 0; return; }
  hero.flash = Math.max(0, hero.flash - dt); hero.hurtT = Math.max(0, hero.hurtT - dt);
  hero.hp = Math.min(STAT.maxHp, hero.hp + dt * 0.25); hero.mana = Math.min(STAT.maxMana, hero.mana + dt * STAT.manaRegen);
  updateSkills(dt);
  if (hero.leap) { if (hero.stop > 0) { hero.stop -= dt; return; } hero.clock += dt; updateLeap(dt); updateFov(hero.fi, hero.fj); return; }   // in the air
  if (hero.roll) { hero.clock += dt; updateRoll(dt); updateFov(hero.fi, hero.fj); return; }   // round 33: the ranger's leap
  if (hero.ultOn && hero.ultOn.kind === 'wrath') { if (hero.stop > 0) { hero.stop -= dt; return; } hero.clock += dt; updateWrath(dt); updateFov(hero.fi, hero.fj); return; }   // the ultimate's leap (the view must keep refreshing: it fades)
  if (input.attack || (hero.buf > G.t && (!heroBusy() || canChain()))) heroAttack();
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
  if (hero.goTalk && Math.hypot(vx, vy) < 0.18) {   // round 42b: a tapped person: walk over and talk
    const n = hero.goTalk, dx = n.fi - hero.fi, dy = n.fj - hero.fj, d = Math.hypot(dx, dy);
    hero.goTalkT -= dt;
    if (hero.goTalkT <= 0 || !npcs.includes(n)) hero.goTalk = null;
    else if (d < 1.4) { hero.goTalk = null; hero.tradeT = G.t + 0.6; trade(n); }
    else { vx = (dx - dy) / d; vy = (dx + dy) / d; }
  } else if (Math.hypot(vx, vy) >= 0.18) hero.goTalk = null;
  const l = Math.hypot(vx, vy);
  // once the blow has landed, pushing the stick cancels the rest of the swing
  if (!FEEL_OLD && l > 0.18 && hero.atk >= 0 && hero.hitDone && hero.stop <= 0 && hero.atk >= weaponSwing(hero.look, hero.combo).free) {
    hero.atk = -1; hero.swingEnd = G.t; hero.buf = 0;
  }
  if (hero.cls === 'mage' && l > 0.18 && hero.cast >= 0 && hero.castAge >= 0.12) { hero.cast = -1; hero.clip = 'idle'; hero.buf = 0; }
  const busy = hero.atk >= 0 || hero.cast >= 0 || hero.dash > 0;
  const moving = l > 0.18 && !busy;
  if (moving) {
    if (l > 1) { vx /= l; vy /= l; }
    // a quick ramp up to full speed (0.1 s) gives the start some weight
    const ramp = Math.min(1, 0.45 + (hero.runT || 0) / 0.1);
    const [gi, gj, m] = stickToGround(vx, vy), sp = STAT.speed * m * (hero.chillT > 0 ? 0.6 : 1) * (hero.whirl > 0 ? 0.6 : 1) * (hero.ultOn ? 0.6 : 1) * Math.min(1, l) * ramp * dt;
    const f0 = hero.fi, j0 = hero.fj;
    tryMove(hero, gi * sp, gj * sp);
    const moved = Math.hypot(hero.fi - f0, hero.fj - j0);
    // from a standstill: one push-off pose, then the cycle starts on the left foot's plant
    if (hero.runT === 0) { hero.walk = 0; hero.goT = 0.08; }
    hero.runT += dt; hero.stopT = 0;
    const w0 = hero.walk;
    hero.walk += moved / m / (robed(hero.look) ? MAGE_STEP : HERO_STEP);   // legs follow the ground speed (without the up/down boost), a bit slower than an exact foot plant
    hero.lastV = [gi * sp / dt, gj * sp / dt];
    // round 40a: each footfall kicks up a little dust and makes a soft step
    if (!FEEL_OLD && Math.floor(w0 / 4) !== Math.floor(hero.walk / 4) && hero.runT > 0.1) {
      const [x, y] = screenOf(hero), dust = LV.outdoor ? DIRT[3] : S[5];
      for (let k = 0; k < 3; k++) pspawn(5, x + (Math.random() - 0.5) * 6 - gi * 4, y + 1, 1, -(gi - gj) * 12 + (Math.random() - 0.5) * 14, -(gi + gj) * 6 + (Math.random() - 0.5) * 6, 8 + Math.random() * 10, 1, dust);
      sfx('step', 0.6);
    }
    // turn through the in-between facings instead of snapping (a reversal takes ~0.1 s)
    // from a standstill he faces the new way at once
    const want = dirFrom(gi, gj);
    if (hero.runT <= dt) hero.dir = want;
    else if (want !== hero.dir && (hero.turnT = (hero.turnT || 0) - dt) <= 0) {
      // round 40a: a hard reversal at speed plants the outside foot: a pivot pose and a puff of dust
      const steps = Math.min((want - hero.dir + 8) % 8, (hero.dir - want + 8) % 8);
      if (!FEEL_OLD && steps >= 3 && hero.runT > 0.3 && !(hero.pivotT > 0)) { hero.pivotT = 0.09; const [x, y] = screenOf(hero), dust = LV.outdoor ? DIRT[3] : S[5]; for (let k = 0; k < 8; k++) { const a = Math.random() * 6.283; pspawn(5, x, y + 1, 1, Math.cos(a) * 30, Math.sin(a) * 15, 10 + Math.random() * 12, 1, dust); } sfx('step', 1); }
      hero.dir = (hero.dir + (((want - hero.dir + 8) % 8) <= 4 ? 1 : 7)) % 8; hero.turnT = 0.028;
    }
    hero.clip = hero.goT > 0 ? 'go' : hero.pivotT > 0 ? 'pivot' : 'walk'; hero.goT -= dt; hero.pivotT = (hero.pivotT || 0) - dt;
    hero.skidT = 0; hero.landT = 0; hero.idleT = 0;
  } else {
    // stopping after a real run plants the front foot for a beat before standing
    if (hero.runT > 0.25 && !busy) hero.stopT = 0.11;
    // round 40a: stopping from a full run skids a little way, braced, with dust
    if (!FEEL_OLD && hero.runT > 0.6 && !busy && hero.lastV) { hero.skidT = 0.16; hero.skidV = hero.lastV.slice(); hero.stopT = 0; }
    hero.runT = 0;
    if (hero.skidT > 0 && !busy) {
      hero.skidT -= dt; const k = Math.max(0, hero.skidT / 0.16) * 0.55; tryMove(hero, hero.skidV[0] * k * dt, hero.skidV[1] * k * dt);
      if (Math.random() < 0.7) { const [x, y] = screenOf(hero); pspawn(5, x + (Math.random() - 0.5) * 8, y + 1, 1, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 8, 6 + Math.random() * 10, 1, LV.outdoor ? DIRT[3] : S[5]); }
      if (hero.skidT <= 0) hero.stopT = 0.08;
    }
    if (!busy) hero.clip = hero.hurtT > 0 ? 'hit' : hero.skidT > 0 ? 'skid' : hero.landT > 0 ? 'attack4' : hero.stopT > 0 ? 'stop' : 'idle';
    if (hero.landT > 0 && !busy) { hero.landT -= dt; hero.combo = 3; }
    hero.stopT -= dt;
    // standing a while: now and then a small fidget (a weight shift, a shoulder roll, a look at the weapon)
    if (!FEEL_OLD && hero.clip === 'idle' && !busy) {
      hero.idleT = (hero.idleT || 0) + dt;
      if (!hero.fidgetAt) hero.fidgetAt = 4 + Math.random() * 4;
      if (hero.idleT > hero.fidgetAt) { hero.fidget = { v: Math.floor(Math.random() * 3), t: 0 }; hero.idleT = 0; hero.fidgetAt = 5 + Math.random() * 5; }
    } else if (hero.clip !== 'fidget') hero.fidget = null;
    if (hero.fidget) { hero.fidget.t += dt; if (hero.fidget.t >= 0.84 || busy) hero.fidget = null; else hero.clip = 'fidget'; }
  }
  if (hero.whirl > 0) {   // spin through all 8 facings (round 40a: its own pose, winding up and slowing at the end)
    if (FEEL_OLD) { hero.clip = 'attack'; hero.dir = Math.floor(G.t / 0.05) % 8; }
    else {
      if (!(hero.whirl0 > 0) || hero.whirl > hero.whirlLast) { hero.whirl0 = hero.whirl; hero.spinA = hero.dir; }
      hero.whirlLast = hero.whirl;
      const age = hero.whirl0 - hero.whirl, rate = 20 * Math.min(1, 0.45 + age / 0.15) * Math.min(1, 0.45 + hero.whirl / 0.15);
      hero.spinA += rate * dt; hero.dir = Math.floor(hero.spinA) % 8; hero.clip = 'spin';
    }
  } else hero.whirl0 = 0;
  if (hero.dash > 0) hero.clip = 'bash';
  if (hero.stop > 0) { hero.stop -= dt; return; }
  hero.clock += dt;
  if (hero.cast >= 0) {
    hero.cast -= dt; hero.castAge = (hero.castAge || 0) + dt; hero.clip = hero.castKind === 'hook' && !FEEL_OLD ? 'hook' : 'channel';
    if (hero.castFn && hero.castAge >= castRel(hero.castKind)) { const f = hero.castFn; hero.castFn = null; f(); }   // the spell leaves on the release frame
    if (hero.cast < 0) { hero.cast = -1; hero.clip = 'idle'; }
  }
  // round 40a: hauling on the chain while the hook drags its catch in; a potion drunk on the move
  if (!FEEL_OLD && !busy && hero.cast < 0 && G.hooks.some(h => h.state === 'pull' || h.state === 'reel') && !moving) hero.clip = 'hook';
  if (!FEEL_OLD && hero.ultOn && hero.ultOn.kind === 'storm' && !busy && hero.cast < 0 && !moving) hero.clip = 'storm';
  if (hero.arriveT > 0) { hero.arriveT -= dt; if (!FEEL_OLD && !busy && hero.cast < 0) hero.clip = 'arrive'; }   // round 43: Blink's landing   // round 43: Arcane Storm's floating pose while standing
  if (hero.drinkT > 0) { hero.drinkT -= dt; if (!busy && (hero.clip === 'walk' || hero.clip === 'idle' || hero.clip === 'go' || hero.clip === 'stop' || hero.clip === 'fidget')) { hero.clip = 'drink'; hero.fidget = null; } }
  if (hero.atk >= 0) {
    hero.clip = hero.cls === 'ranger' && hero.tossT > 0 && !FEEL_OLD ? 'toss' : hero.cls === 'ranger' && hero.volleyT > 0 && !FEEL_OLD ? 'volley' : hero.cls === 'ranger' && hero.skyT > 0 && !FEEL_OLD ? 'skyshot' : hero.cls === 'ranger' && hero.combo !== 3 ? 'shoot' : ATTACK_CLIPS[hero.combo] || 'attack';
    if (hero.tossT > 0) hero.tossT -= dt;
    if (hero.volleyT > 0) hero.volleyT -= dt;
    if (hero.skyT > 0) hero.skyT -= dt;
    hero.atk += dt * 1000 * (1 + ((STAT.atkSpeed || 0) + (hero.frenzy > 0 ? 50 : 0)) / 100);
    const sw = weaponSwing(hero.look, hero.combo), ki = swingKey(sw, hero.atk);
    if (ki >= 0 && sw[ki].mv) lungeHero(sw[ki].mv * dt * 1000 / sw[ki].ms);
    if (hero.combo === 3 && !hero.leap && !hero.ultOn) {
      // round 65: the slam is a real jump: over the arc keys the body follows a curve, quick up, a
      // moment at the top, then down faster and faster into the blow
      const a0 = sw.findIndex(k => k.arc), hiK = sw.findIndex(k => k.hit);
      let t0 = 0; for (let i = 0; i < a0; i++) t0 += sw[i].ms; let t1 = t0; for (let i = a0; i < hiK; i++) t1 += sw[i].ms;
      if (a0 >= 0 && hero.atk >= t0 && hero.atk < t1 && !hero.jumpDust) { hero.jumpDust = true; const [x, y] = screenOf(hero), dc = LV.outdoor ? DIRT[3] : S[5]; for (let q = 0; q < 12; q++) { const a = q / 12 * 6.283; pspawn(5, x + Math.cos(a) * 6, y + Math.sin(a) * 3, 1, Math.cos(a) * 40, Math.sin(a) * 20, 10 + Math.random() * 15, 1, dc); } }   // round 65c: dust kicked up on takeoff
      if (a0 >= 0 && hero.atk >= t0 && hero.atk < t1) { const u = (hero.atk - t0) / (t1 - t0), H = hero.afterSlam ? 15 : 25; hero.leapZ = u < 0.62 ? H * (1 - (1 - u / 0.62) ** 2) : H * (1 - ((u - 0.62) / 0.38) ** 2); }
      else { const want = ki >= 0 ? sw[ki].hop || 0 : 0; hero.leapZ = (hero.leapZ || 0) + (want - (hero.leapZ || 0)) * Math.min(1, dt * 28); if (ki >= 0 && sw[ki].hit) hero.leapZ = 0; if (hero.atk < t0) hero.jumpDust = false; }
    }   // round 40a: the slam's hop
    if (!hero.hitDone && hero.mag > 0) { const st = Math.min(hero.mag, dt * 4.5); lungeHero(st); hero.mag -= st; }
    if (ki >= 0 && sw[ki].hit && !hero.hitDone) {
      hero.hitDone = true; if (hero.cls === 'ranger') looseArrow(); else if (hero.combo === 3) groundSlamHit(); else heroHitResolve(!!sw[ki].slam, hero.combo === 2 ? 2 : STAT.slow ? 1 : 0);
      if (sw[ki].slam) {   // the ground slam: extra shake and a ring of dust
        if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.35);
        const [x, y] = screenOf(hero), [fx, fy] = dirVec(hero.dir), cx = x + (fx - fy) * 12, cy = y + (fx + fy) * 6;
        const dust = LV.outdoor ? DIRT[3] : S[5];
        for (let k = 0; k < 22; k++) { const a = k / 22 * 6.283; pspawn(5, cx, cy, 1, Math.cos(a) * 55, Math.sin(a) * 27, 40 + Math.random() * 30, 1, k % 3 ? dust : DIRT[4]); }
        sfx('crit');
      }
    }
    if (ki < 0) { hero.atk = -1; hero.clip = 'idle'; hero.swingEnd = G.t; if (hero.combo === 3 && !hero.leap && !hero.ultOn) hero.leapZ = 0; if (hero.castQueued) heroCast(); }
  }
  // pick up what we walk over; open chests by walking into them
  for (let n = groundItems.length - 1; n >= 0; n--) {
    const g = groundItems[n];
    if (g.t > 0.4 && Math.hypot(g.fi - hero.fi, g.fj - hero.fj) < 0.55 && pickup(g)) groundItems.splice(n, 1);
  }
  for (const p of dynProps) if (p.kind === 'chest' && !p.open && Math.hypot(p.i + 0.5 - hero.fi, p.j + 0.5 - hero.fj) < 1.15) openChest(p);
  // stairs
  const s = LV.stairs;
  if (!G.fadeTo && !LV.side && Math.hypot(s.i + 0.5 - hero.fi, s.j + 0.5 - hero.fj) < 0.55 && bossAlive()) {   // (round 67: a side area's way out is never sealed)
    if (!(G.sealT > 0)) { say(`THE ${boss.def.name} GUARDS THE WAY DOWN`, 22, 2); G.sealT = 3; }
  } else if (LV.side) {   // a side area's stairs lead back up to the hub (once the hero has stepped off them)
    const d = Math.hypot(s.i + 0.5 - hero.fi, s.j + 0.5 - hero.fj);
    if (d > 1.2) G.upArmed = true;
    if (!G.fadeTo && G.upArmed && d < 0.55) { G.upArmed = false; if (LV.side === 'barrow2') climbSide(); else leaveSide(); }
    if (LV.down) { const dd = Math.hypot(LV.down.i + 0.5 - hero.fi, LV.down.j + 0.5 - hero.fj); if (dd > 1.2) G.downArmed = true; if (!G.fadeTo && G.downArmed && dd < 0.55) { G.downArmed = false; descendSide(); } }
  } else if (!G.fadeTo && !G.finale && Math.hypot(s.i + 0.5 - hero.fi, s.j + 0.5 - hero.fj) < 0.55 && !(s.mine && mineBarred())) {   // (round 67: not while Maelis is coming)   // round 42b: the mine is chained until the key
    sfx('stairs');
    // the hub's mine leads straight to the first floor; Act I's boss hall leads home to the hub,
    // where the south gate now stands open (round 26)
    const A = areaOf(LV.level);
    if (A.arena && A.act === 0) { G.gates = G.gates || {}; G.gates[A.cyc] = true; const home = LV.level - 4; G.fadeTo = () => { G.portal = null; startLevel(home, (LV.seed * 31 + 17) >>> 0); say('THE ROAD ON IS OPEN, PAST THE RIVERLANDS', 51, 4); saveGame(); }; }
    else G.fadeTo = () => { G.portal = null; startLevel(LV.level + 1, (LV.seed * 31 + 17) >>> 0); saveGame(); };   // (round 48c: the Hollow's road leads to the Riverlands, level 2)
  }
  G.sealT = (G.sealT || 0) - dt;
  updatePortal(dt); updateSideDoors(); updateStory(dt);
  if (LV.backExit && !G.fadeTo) {   // round 48c: the Riverlands' road back south to the Hollow
    const d = Math.hypot(LV.backExit[0] - hero.fi, LV.backExit[1] - hero.fj);
    if (d > 1.4) G.backArmed = true;
    if (G.backArmed && d < 0.6) { G.backArmed = false; sfx('stairs'); G.fadeTo = () => { G.portal = null; startLevel(LV.level - 1, (LV.seed * 29 + 5) >>> 0); hero.fi = HUB.exit[0] + 3.2; hero.fj = HUB.exit[1] + 1.4; updateFov(hero.fi, hero.fj); saveGame(); }; }
  }
  if (LV.gatePos && LV.gateOpen && !G.fadeTo && Math.hypot(LV.gatePos[0] - hero.fi, LV.gatePos[1] - hero.fj) < 0.6) {   // through the open gate: on to the next act
    sfx('stairs'); G.fadeTo = () => { G.portal = null; startLevel(LV.level - ((LV.level - 1) % AREA_CYCLE) + AREA_CYCLE, (LV.seed * 31 + 17) >>> 0); saveGame(); };   // (to the next act's town, from whichever of this act's areas the gate is in)
  }
  hatchEggs(dt);
  if (!hero.leap && !hero.roll) unstickHero();
  updateFov(hero.fi, hero.fj);
}
function updateEnemy(e, dt) {
  if (e.dying >= 0) {
    e.flash = Math.max(0, e.flash - dt);   // the kill flash is brief; the death animation shows after it
    if (e.stop > 0) { e.stop -= dt; return; }
    e.dying += dt;
    if (e.deathKind === 'thrown' && e.throwV) {   // flung back in an arc, landing as the death plays out
      const u = Math.min(1, e.dying / 0.35); tryMove(e, e.throwV[0] * dt * (1 - u), e.throwV[1] * dt * (1 - u), 0.25); e.leapZ = Math.sin(u * Math.PI) * 9;
      if (u >= 1) { e.throwV = null; e.leapZ = 0; const [x, y] = screenOf(e); burst(5, x, y, 1, 8, 40, LV.outdoor ? DIRT[3] : S[5]); }
    }
    if (e.deathV && e.deathKind !== 'thrown') {   // round 37: the blow carries the body back, it bounces once and settles
      const u = Math.min(1, e.dying / 0.32), k = 1 - u;
      tryMove(e, e.deathV[0] * dt * k * 1.6, e.deathV[1] * dt * k * 1.6, 0.25);
      e.leapZ = e.dying < 0.34 ? Math.sin(Math.min(1, e.dying / 0.34) * Math.PI) * e.deathHop : e.dying < 0.46 ? Math.sin((e.dying - 0.34) / 0.12 * Math.PI) * e.deathHop * 0.3 : 0;
      if (!e.thudded && e.dying >= 0.34) { e.thudded = true; const [x, y] = screenOf(e); burst(5, x, y, 1, e.def.unique ? 18 : 8, 45, LV.outdoor ? DIRT[3] : S[5]); sfx('thunk'); }
      if (u >= 1 && e.dying >= 0.46) { e.deathV = null; e.leapZ = 0; }
    }
    if (e.deathKind === 'gib') { e.corpse = true; return; }
    if (e.deathKind === 'ash' || e.deathKind === 'shatter') {   // nothing is left to lie there
      const [x, y] = screenOf(e);
      if (e.deathKind === 'ash' && Math.random() < 0.7) { pspawn(3, x + (Math.random() - 0.5) * 12, y, 4 + Math.random() * e.def.chest, (Math.random() - 0.5) * 8, 0, 14 + Math.random() * 14, 0.6, Math.random() < 0.5 ? 16 : 4); pspawn(5, x + (Math.random() - 0.5) * 12, y, 2 + Math.random() * e.def.chest, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 6, 6, 1, 3); }
      if (e.deathKind === 'shatter' && !e.shattered) { e.shattered = true; burst(5, x, y, e.def.chest, 22, 100, 118); burst(2, x, y, e.def.chest, 12, 90, 117); sfx('clink'); }
      if (e.dying >= (e.deathKind === 'ash' ? 0.55 : 0.15) && !e.corpse) { e.corpse = true; if (e.deathKind === 'ash') stampBlood(Math.round(x), Math.round(y), 3, (Math.random() * 1e6) | 0, [2, 3, 3, 4, 5]); }
      return;
    }
    if (e.dying >= (FEEL_OLD ? 0.6 : 0.7) && !e.corpse) {   // the last death frame becomes part of the floor (after the slide and bounce)
      e.corpse = true;
      const [x, y] = screenOf(e);
      blitWorld(getSprite(e.fam, e.look, e.dir, 'death', 5, e, 1), x, y, 0, -1, true);
    }
    return;
  }
  e.flash = Math.max(0, e.flash - dt); if (e.tint > 0 && e.flash <= 0) e.tint -= dt;
  if (e.stop > 0) { e.stop -= dt; return; }
  e.clock += dt; e.cool -= dt;
  if (e.burnT > 0) {   // on fire: a burn every half second, flames licking up, the orange flicker drawn
    e.burnT -= dt; e.burnTick -= dt;
    if (Math.random() < dt * 14) { const [x, y] = screenOf(e); pspawn(3, x + (Math.random() - 0.5) * 10, y, 3 + Math.random() * e.def.chest, (Math.random() - 0.5) * 6, 0, 18 + Math.random() * 14, 0.4, Math.random() < 0.5 ? 16 : 17); }
    if (e.burnTick <= 0) { e.burnTick = 0.5; G.elem = null; damageEnemy(e, e.burnDmg, e.fi, e.fj, false, 0, true); if (e.hp <= 0 && !e.deathKind) e.deathKind = 'ash'; if (e.dying >= 0) return; }
  }
  if (e.downT > 0) { e.downT -= dt; e.clip = 'death'; e.atk = -1; if (e.downT <= 0) e.clip = 'idle'; return; }   // knocked down: on the ground, then up
  if (e.rootT > 0) { e.rootT -= dt; if (Math.random() < dt * 6) { const [x, y] = screenOf(e); pspawn(3, x + (Math.random() - 0.5) * 12, y, 2 + Math.random() * 6, 0, 0, 6, 0.4, Math.random() < 0.5 ? 55 : 54); } }
  if (e.slowT > 0) { e.slowT -= dt; if (Math.random() < dt * 5) { const [x, y] = screenOf(e); pspawn(3, x + (Math.random() - 0.5) * 14, y, 4 + Math.random() * e.def.chest, 0, 0, 8, 0.5, 118); } }
  if (Math.abs(e.kb[0]) + Math.abs(e.kb[1]) > 0.01) {
    tryMove(e, e.kb[0] * dt, e.kb[1] * dt, 0.25);
    const k = Math.exp(-14 * dt); e.kb[0] *= k; e.kb[1] *= k;
  }
  if (e.frozen > 0) {   // frozen solid: the pose holds, no moving or attacking
    e.frozen -= dt; e.clock -= dt; e.atk = -1;
    if (Math.random() < dt * 4) { const [x, y] = screenOf(e); pspawn(4, x + (Math.random() - 0.5) * 12, y, 4 + Math.random() * e.def.chest, 0, 0, 10, 0.4, 118); }
    if (e.frozen <= 0) { const [x, y] = screenOf(e); burst(5, x, y, e.def.chest * 0.7, 10, 60, 117); }
    return;
  }
  if (e.hurt > 0) { e.hurt -= dt; e.clip = 'hit'; return; }
  if (e.stun > 0) {   // dazed: stars circle the head
    e.stun -= dt; e.clip = 'hit'; e.atk = -1;
    if (Math.random() < dt * 10) { const [x, y] = screenOf(e), a = G.t * 9; pspawn(4, x + Math.cos(a) * 5, y + Math.sin(a) * 2, e.def.chest + 14, 0, 0, 0, 0.25, 51); }
    return;
  }
  if (e.dummy) { e.clip = 'idle'; return; }   // a skill preview's target: it reacts to blows but never acts
  const m = e.def, dx = hero.fi - e.fi, dy = hero.fj - e.fj, d = Math.hypot(dx, dy);
  if (e === boss && e.state !== 'sleep' && !hero.dead && updateBoss(e, dt * (e.slowT > 0 ? 0.6 : 1), d, dx, dy)) return;   // slowed bosses wind up their specials slower too
  if (e.state === 'sleep') {
    e.clip = 'idle';
    if (!hero.dead && notices(e, d, dx, dy)) { wake(e, true); return; }
    if (e.routine && !FEEL_OLD) routineStep(e, dt, d); else idleLife(e, dt);
    return;
  }
  if (e.alertT > 0) {   // noticing: a startled hop and a turn toward the hero
    e.alertT -= dt; e.clip = 'idle'; e.dir = dirFrom(dx, dy);
    const u = 1 - e.alertT / (e.alertT0 || 0.5); e.leapZ = u < 0.45 ? Math.sin(u / 0.45 * Math.PI) * 4 : 0;
    if (e.alertT <= 0) e.leapZ = 0;
    return;
  }
  if (e.pw && updateElite(e, dt, d, dx, dy)) return;   // round 39: a power owns this frame (a blink)
  const atkClip = m.ranged === 'arrow' ? 'shoot' : m.ranged ? 'cast' : 'attack';
  if (e.atk >= 0) {
    e.clip = atkClip; const a0 = e.atk; e.atk += dt * 1000 * (e.slowT > 0 ? 0.55 : 1);
    const sw = FAMILIES[e.fam].swing(e), ki = swingKey(sw, e.atk);
    if (ki >= 0) monsterStrikeStep(e, sw, ki, a0, d);   // round 34: wind-up glint, lunges, hops, the opening after
    if (ki >= 0 && sw[ki].hit && !e.hitDone) {
      e.hitDone = true;
      if (m.ranged) {
        const l = d || 1, sp = m.ranged === 'arrow' ? 9 : 5.5;
        sfx(m.ranged === 'arrow' ? 'arrow' : m.ranged === 'frostbolt' ? 'frost' : 'fireball');
        projectiles.push({ kind: m.ranged, fi: e.fi + dx / l * 0.5, fj: e.fj + dy / l * 0.5, vx: dx / l * sp, vy: dy / l * sp, z: m.ranged === 'arrow' ? 18 : 14, life: 2, owner: 'enemy', dmg: e.dmg });
      } else if (!hero.dead && d < m.reach + 0.35) hurtHero(roll(e.dmg), e);
    }
    if (ki < 0) {
      e.atk = -1; e.leapZ = 0; e.open = false; e.clip = 'idle';
      if (!FEEL_OLD && m.pack && !m.ranged && !e.def.unique) { e.backT = 0.45 + Math.random() * 0.35; e.engageCd = G.t + 1.2 + Math.random() * 1.2; }   // round 35: hit and run
      e.cool = m.ranged ? 1.4 + Math.random() : FEEL_OLD ? 0.5 + Math.random() * 0.5 : 0.35 + Math.random() * 0.45;
      // elites and champions follow up at once with a second strike (no second wind-up) now and then
      if (!FEEL_OLD && !m.ranged && (e.def.elite || e.champ) && !e.chained && Math.random() < 0.5 && d < m.reach + swingReach(sw) + 0.3) { e.chained = true; e.atk = sw.slice(0, Math.max(0, sw.findIndex(k => k.mv > 0 || k.hit))).reduce((a, k) => a + k.ms, 0); e.hitDone = false; e.atkDir = null; }
      else e.chained = false;
    }
    return;
  }
  if (hero.dead) { e.clip = 'idle'; return; }
  if (m.flee) {   // the treasure goblin never fights: it runs, and escapes if not caught in time
    e.fleeT = (e.fleeT ?? 20) - dt;
    if (e.fleeT <= 0) {
      const [x, y] = screenOf(e); burst(4, x, y, 10, 24, 50, 51); sfx('stairs');
      e.hp = 0; e.dying = 0; e.corpse = true; say('THE TREASURE GOBLIN ESCAPED', 26, 2); return;
    }
  }
  if (d > 20 && !m.flee) { e.clip = 'idle'; return; }   // too far to matter: skip sight and pathing (big forests)
  const see = d < 10 && los(e.fi, e.fj, hero.fi, hero.fj);
  // round 21b behaviors -------------------------------------------------------------------------
  // chargers (boars, bears): scrape the ground with a warning line locked on the hero's spot, then
  // rush straight down it. Sidestep and they run on; into a wall and they're stunned
  if (m.charge && e.windT > 0) {
    e.windT -= dt; e.clip = 'idle'; e.dir = dirFrom(e.rdir[0], e.rdir[1]);
    if (Math.random() < dt * 14) { const [x, y] = screenOf(e); pspawn(5, x - e.rdir[0] * 6 + e.rdir[1] * 6, y, 1, (Math.random() - 0.5) * 30, -Math.random() * 10, 20, 1, DIRT[3]); }
    if (e.windT <= 0) { e.rush = e.rushLen / 10; e.rushHit = false; }
    return;
  }
  if (m.charge && e.rush > 0) {
    if (e.rootT > 0) e.rush = 0;
    e.rush -= dt;
    const sp = 10 * dt, f0 = e.fi, j0 = e.fj;
    tryMove(e, e.rdir[0] * sp, e.rdir[1] * sp, 0.25);
    const moved = Math.hypot(e.fi - f0, e.fj - j0);
    e.walk += moved / (FAMILIES[e.fam].gait || 0.32) * 0.6; e.clip = 'walk';
    if (Math.random() < 0.6) { const [x, y] = screenOf(e); pspawn(5, x, y, 1, (Math.random() - 0.5) * 20, -10, 14, 1, DIRT[3]); }
    if (!e.rushHit && !hero.dead && Math.hypot(hero.fi - e.fi, hero.fj - e.fj) < 0.85 + (e.look.scale || 1) * 0.2) {
      e.rushHit = true; hurtHero(Math.round(roll(e.dmg) * 1.6), e); tryMove(hero, e.rdir[0] * 0.7, e.rdir[1] * 0.7);
      if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.3);
    }
    if (moved < sp * 0.35) {   // slammed into something solid
      e.rush = 0; e.stun = 1.4; const [x, y] = screenOf(e); burst(5, x, y, 10, 14, 60, DIRT[3]); sfx('barrel');
      if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.15);
    }
    if (e.rush <= 0) { e.chargeCd = G.t + 2.5 + Math.random() * 2; e.cool = Math.max(e.cool, 0.5); }
    return;
  }
  if (m.charge && see && d > 2.6 && d < 7.5 && !(e.chargeCd > G.t) && e.state !== 'sleep') {
    const l = d || 1; e.rdir = [dx / l, dy / l]; e.rushLen = Math.min(d + 2.5, 9); e.windT = 0.6; e.dir = dirFrom(dx, dy); sfx('heavySwing');
    return;
  }
  const fleeing = m.flee || e.panicT > 0;   // the treasure goblin always; a pack whose leader just died for a moment
  if (e.panicT > 0) e.panicT -= dt;
  // archers and casters keep their distance: they back away while reloading, strafe, and shoot from range
  if (m.ranged && see && d < m.reach && (d > 3.6 || e.cool <= 0 && d > 1.6)) {
    e.dir = dirFrom(dx, dy);
    if (e.cool <= 0) { e.atk = 0; e.hitDone = false; e.clip = 'idle'; return; }
    if (e.cool > 0.35) {   // between shots: a few sidesteps
      const sd = Math.sin(G.t * 1.3 + e.seed * 7) > 0 ? 1 : -1, sp = m.speed / 16 * 0.55 * (e.slowT > 0 ? 0.5 : 1) * (e.rootT > 0 ? 0 : 1) * dt, f0 = e.fi, j0 = e.fj;
      tryMove(e, -dy / d * sd * sp, dx / d * sd * sp, 0.25);
      e.walk += Math.hypot(e.fi - f0, e.fj - j0) / (FAMILIES[e.fam].gait || 0.32); e.clip = 'walk'; e.dir = dirFrom(dx, dy);
    } else e.clip = 'idle';
    return;
  }
  // a pack member keeps circling to its spot before it attacks (at most 1.5 s, then it attacks anyway)
  let circling = false;
  if (m.pack && e.slotA !== undefined && d < m.reach) {
    const da = Math.abs(((Math.atan2(-dy, -dx) - e.slotA + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    e.slotWait = (e.slotWait || 0) + dt;
    circling = da > 0.5 && e.slotWait < 1.5;
    if (!circling) e.slotWait = 0;
  }
  // round 35: a pack member that has just struck backs off, still facing the hero
  if (!FEEL_OLD && e.backT > 0 && !fleeing) {
    e.backT -= dt;
    const l = d || 1, side = Math.sin(e.seed * 3.1) > 0 ? 0.5 : -0.5, sp = m.speed / 16 * 0.9 * dt * (e.slowT > 0 ? 0.5 : 1) * (e.rootT > 0 ? 0 : 1), f0 = e.fi, j0 = e.fj;
    tryMove(e, (-dx / l - dy / l * side) * sp, (-dy / l + dx / l * side) * sp, 0.25);
    e.walk += Math.hypot(e.fi - f0, e.fj - j0) / (FAMILIES[e.fam].gait || 0.32); e.clip = 'walk'; e.dir = dirFrom(dx, dy);
    return;
  }
  // round 35: only a few pack members press in at once; the rest circle at a distance, waiting their turn
  if (!FEEL_OLD && m.pack && !m.ranged && !fleeing && see && d < 6 && !e.mayEngage) {
    const ring = 2.4 + (e.seed % 3) * 0.3, a = Math.atan2(-dy, -dx) + (e.seed & 1 ? 1 : -1) * 0.5 * dt * 4;   // drift round the ring
    const tx = hero.fi + Math.cos(a) * ring - e.fi, tj = hero.fj + Math.sin(a) * ring - e.fj, tl = Math.hypot(tx, tj) || 1;
    const sp = m.speed / 16 * 0.7 * dt * (e.slowT > 0 ? 0.5 : 1) * (e.rootT > 0 ? 0 : 1), f0 = e.fi, j0 = e.fj;
    if (tl > 0.15) tryMove(e, tx / tl * Math.min(sp, tl), tj / tl * Math.min(sp, tl), 0.25);
    const moved = Math.hypot(e.fi - f0, e.fj - j0);
    e.walk += moved / (FAMILIES[e.fam].gait || 0.32); e.clip = moved > 0.002 ? 'walk' : 'idle'; e.dir = dirFrom(dx, dy);   // sidling, eyes on the hero
    return;
  }
  const lunge = m.ranged ? 0 : swingReach(FAMILIES[e.fam].swing(e)) * 0.8;   // a lunging attack starts from farther out
  if (!m.ranged && !fleeing && (d < m.reach || (e.cool <= 0 && d < m.reach + lunge && see)) && !circling) {
    e.dir = dirFrom(dx, dy); e.clip = 'idle';
    if (e.cool <= 0) { e.atk = 0; e.hitDone = false; e.atkDir = null; }
    if (d < m.reach) return;
  }
  // move: ranged enemies back off when the hero is close, packs fan out to the flanks, everyone else closes in
  let mv = null;
  if (fleeing) {   // away from the hero, swerving so it does not stick on walls
    const l = d || 1, sw = Math.sin(G.t * 2 + e.seed) * 0.6;
    mv = [-dx / l - dy / l * sw, -dy / l + dx / l * sw];
  } else
  if (m.ranged && see && d <= 3.6) { const sd = (e.seed & 1) ? 1 : -1; mv = [-dx / d - dy / d * sd * 0.5, -dy / d + dx / d * sd * 0.5]; }
  else if (m.pack && (see || circling) && d < 5) {
    // each pack member claims a spot around the hero: the angle it came from, turned by one of five
    // offsets (about 160 degrees across), so the pack ends up around the hero instead of in a line
    if (e.slotA === undefined || G.t > e.slotT) { e.slotA = Math.atan2(-dy, -dx) + ((e.seed % 5) - 2) * 0.7; e.slotT = G.t + 4; }
    const tx = hero.fi + Math.cos(e.slotA) * (m.reach * 0.8) - e.fi, tj = hero.fj + Math.sin(e.slotA) * (m.reach * 0.8) - e.fj, tl = Math.hypot(tx, tj);
    mv = tl > 0.25 ? [tx / tl, tj / tl] : [dx / d, dy / d];
  }
  else if (see && d < 3) mv = [dx / d, dy / d];
  else mv = flowDir(e.fi, e.fj);
  if (!mv || d > 18) { e.clip = 'idle'; return; }
  if (!FEEL_OLD && see && d > 1.6 && d < 8 && e.fam === 'hound' && !fleeing) { const l0 = Math.hypot(mv[0], mv[1]) || 1, w = Math.sin(G.t * 5 + e.seed) * 0.7; mv = [mv[0] / l0 - mv[1] / l0 * w, mv[1] / l0 + mv[0] / l0 * w]; }   // round 35: hounds weave in
  const l = Math.hypot(mv[0], mv[1]) || 1, sp = m.speed / 16 * 1.2 * (e.speedK || 1) * (e.slowT > 0 ? 0.5 : 1) * (see && !fleeing ? pace(e, d, dt) : 1) * dt;   // cone of cold slows to half
  if (e.rootT > 0) { e.clip = 'idle'; return; }   // round 33: snared: can swing and shoot, can't walk
  const f0 = e.fi, j0 = e.fj;
  tryMove(e, mv[0] / l * sp, mv[1] / l * sp, 0.25);
  e.walk += Math.hypot(e.fi - f0, e.fj - j0) / (FAMILIES[e.fam].gait || 0.32);
  e.dir = dirFrom(mv[0], mv[1]); e.clip = 'walk';
}
function hurtHero(dmg, src) {
  if (hero.dead || hero.leap || hero.roll || (hero.ultOn && hero.ultOn.kind === 'wrath')) return;   // nothing touches him in the air
  if (Math.random() * 100 < STAT.block) { floater('BLOCK', hero.fi, hero.fj, 44, 31); sfx('block'); return; }
  dmg = Math.max(1, Math.round(dmg * 40 / (40 + STAT.armor * (hero.buff > 0 ? 1.5 : 1) * 2.5) * (hero.stoneskin > 0 ? 0.5 : 1)));
  if (hero.cls === 'warrior') dmg = Math.max(1, Math.round(dmg * 0.75));   // round 67: he fights where the blows land (Diablo III's melee classes take 30% less); bots died 2-4 times a run as him, never as the others
  if (STAT.dr) dmg = Math.max(1, dmg - STAT.dr);   // round 42a: OF THE WALL
  hero.hp -= dmg; hero.flash = 0.06; hero.hurtT = 0.15; sfx('hurt');
  hero.hitF = 0;   // round 40a: which way the blow knocks him (0 front, 1 from his left, 2 from his right, 3 from behind)
  if (src && src.fi !== undefined && !FEEL_OLD) { const [fx, fy] = dirVec(hero.dir), dx = src.fi - hero.fi, dy = src.fj - hero.fj, l = Math.hypot(dx, dy) || 1, dt = (dx * fx + dy * fy) / l, cr = (fx * dy - fy * dx) / l; hero.hitF = dt > 0.5 ? 0 : dt < -0.5 ? 3 : cr > 0 ? 2 : 1; }
  if (src && src.pw) eliteOnHit(src, dmg);
  floater(String(dmg), hero.fi, hero.fj, 46, 23);
  const [x, y] = screenOf(hero); burst(1, x, y, 24, 6, 40, 22);
  if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.25);
  if (STAT.thorns && src && src.def && alive(src)) damageEnemy(src, Math.max(1, Math.round(dmg * STAT.thorns / 100)), hero.fi, hero.fj, false);   // thorns
  if (hero.hp <= 0) {
    sfx('death');
    hero.hp = 0; hero.dead = 0.001; hero.clip = 'death'; hero.clock = 0; hero.atk = -1;
  }
  void src;
}
// round 34: one frame of a monster's attack. The glint on the wind-up, the lunge or hop along the
// line it locked when it began (it stops short of the hero and at walls), the arc of a leap, and
// whether it is open to punishment
function monsterStrikeStep(e, sw, ki, a0, d) {
  const k = sw[ki];
  let t0 = 0; for (let i = 0; i < ki; i++) t0 += sw[i].ms;
  if (!e.atkDir) { const dx = hero.fi - e.fi, dy = hero.fj - e.fj, l = Math.hypot(dx, dy) || 1; e.atkDir = [dx / l, dy / l]; }
  if (k.tele && a0 <= t0) {   // the moment the wind-up starts: a glint where the weapon or eyes are, a low growl
    const [x, y] = screenOf(e);
    G.sparks.push({ x, y, z: e.def.chest * 1.25 + 8, t: 0.14, col: 51 });
    sfx('growl');
  }
  if (k.mv) {
    const u = Math.min(1, (e.atk - t0) / k.ms), uPrev = Math.max(0, (a0 - t0) / k.ms), step = k.mv * (u - uPrev);
    const close = Math.hypot(hero.fi - e.fi, hero.fj - e.fj) < 0.75 + (e.def.unique ? 0.5 : 0);
    if (step > 0 && !close) tryMove(e, e.atkDir[0] * step, e.atkDir[1] * step, 0.25);
    if (step < 0) tryMove(e, e.atkDir[0] * step, e.atkDir[1] * step, 0.25);
    if (step > 0 && Math.random() < 0.6) { const [x, y] = screenOf(e); pspawn(5, x, y, 1, -e.atkDir[0] * 20, -e.atkDir[1] * 10, 6 + Math.random() * 8, 1, LV.outdoor ? DIRT[3] : S[5]); }   // kicked-up dust
  }
  e.leapZ = k.z ? Math.sin(Math.min(1, (e.atk - t0) / k.ms) * Math.PI) * k.z : 0;
  e.open = !!k.open;
}
// round 35: which pack members may press the attack this frame: at most two per pack family near the
// hero, picked by who has waited longest (anyone already mid-attack keeps its place)
function assignEngage() {
  const near = enemies.filter(e => alive(e) && e.def.pack && !e.def.ranged && e.state !== 'sleep' && Math.hypot(e.fi - hero.fi, e.fj - hero.fj) < 6);
  for (const e of near) e.mayEngage = false;
  const fams = {};
  for (const e of near) (fams[e.fam] = fams[e.fam] || []).push(e);
  for (const k in fams) {
    const list = fams[k], busy = list.filter(e => e.atk >= 0), free = list.filter(e => e.atk < 0 && !(e.engageCd > G.t));
    for (const e of busy) e.mayEngage = true;
    free.sort((a, b) => (a.engageCd || 0) - (b.engageCd || 0) || Math.hypot(a.fi - hero.fi, a.fj - hero.fj) - Math.hypot(b.fi - hero.fi, b.fj - hero.fj));
    for (let n = 0; n < free.length && n < 2 - busy.length; n++) free[n].mayEngage = true;
    if (list.length <= 2) for (const e of list) e.mayEngage = true;   // a pair or a lone one just comes at you
  }
}
// round 35: how each family moves when it has the hero in sight. Packs and hounds stalk and then
// burst; skeletons come on slow and steady; spiders skitter in short dashes with stops between
function pace(e, d, dt) {
  if (FEEL_OLD || e.def.unique) return 1;
  e.paceT = (e.paceT ?? Math.random()) - dt;
  if (e.fam === 'skeleton') return 0.85;
  if (e.fam === 'spider') { if (e.paceT <= 0) { e.paceOn = !e.paceOn; e.paceT = e.paceOn ? 0.22 + Math.random() * 0.12 : 0.18 + Math.random() * 0.25; } return e.paceOn ? 1.8 : 0.05; }
  if (d < 2.2) return 1.1;
  if (e.paceT <= 0) { e.paceOn = !e.paceOn; e.paceT = e.paceOn ? 0.35 + Math.random() * 0.35 : 0.5 + Math.random() * 0.6; }
  return e.paceOn ? 1.55 : 0.6;
}
// ---------------------------------------------------------------- routines (round 36)
// Before they notice the hero, monsters go about their business. Sleeping monsters of one kind
// standing together form a group with a leader, and each group gets a routine: GUARD (stays put,
// looks around, shuffles), WANDER (strolls between random spots near home, pausing), or PATROL
// (walks a loop through two or three rooms or clearings, pausing at each). Followers keep a loose
// formation on the leader. Routes are walked on breadth-first distance fields from each waypoint, so
// they go round walls; none ends near the level's start or the Oakhollow camp.
function setupRoutines(seed) {
  if (FEEL_OLD) return;
  const R = rng((seed ^ 0x7071) >>> 0), free = enemies.filter(e => !e.def.unique && !e.def.flee && e.state === 'sleep');
  const used = new Set(), fromStart = LV.start ? bfs(Math.floor(LV.start.cx), Math.floor(LV.start.cy)) : null;
  G.routineStart = fromStart;   // (outdoor areas have no LV.dist of their own, so the start's distances are worked out here)
  const okSpot = k => k >= 0 && LV.map[k] === FLOOR && !LV.solid[k] && (!fromStart || fromStart[k] < 0 || fromStart[k] >= 12) &&
    !(LV.hub && Math.hypot(k % MW + 0.5 - HUB.camp[0], ((k / MW) | 0) + 0.5 - HUB.camp[1]) < HUB.safe);
  for (const e of free) {
    if (used.has(e)) continue;
    const members = free.filter(o => !used.has(o) && o.id === e.id && Math.hypot(o.fi - e.fi, o.fj - e.fj) < 2.6);
    members.forEach(o => used.add(o));
    const fam = e.fam, ranged = !!e.def.ranged, byFire = (LV.decor || []).some(dc => dc.kind === 'campfire' && Math.hypot(dc.i + 0.5 - e.fi, dc.j + 0.5 - e.fj) < 3.5);
    const w = byFire ? { guard: 1 } : ranged ? { patrol: 0.4, guard: 0.6 } : fam === 'skeleton' ? { patrol: 0.55, wander: 0.2, guard: 0.25 } : fam === 'spider' ? { wander: 0.7, guard: 0.3 }
      : fam === 'hound' ? { wander: 0.6, patrol: 0.3, guard: 0.1 } : fam === 'fallen' ? { wander: 0.45, patrol: 0.3, guard: 0.25 } : { wander: 0.5, guard: 0.5 };
    let p = R(), kind = 'guard'; for (const k in w) { if (p < w[k]) { kind = k; break; } p -= w[k]; }
    const home = [e.fi, e.fj], g = { kind, leader: e, members, home, wp: [], at: 0, waitT: 0.5 + R() * 3, R };
    if (kind === 'patrol') {   // two or three stops 6-22 steps apart, starting from home
      const d0 = bfs(Math.floor(home[0]), Math.floor(home[1])), cand = [];
      if (LV.rooms && !LV.outdoor) LV.rooms.forEach(r => { const k = tIdx(r.cx, r.cy); if (d0[k] >= 6 && d0[k] <= 22 && okSpot(k)) cand.push(k); });
      for (let t = 0; t < 60 && cand.length < 6; t++) { const a = R() * 6.283, rr = 4 + R() * 5, k = tIdx(Math.floor(home[0] + Math.cos(a) * rr), Math.floor(home[1] + Math.sin(a) * rr)); if (k >= 0 && k < MW * MH && d0[k] >= 5 && d0[k] <= 16 && okSpot(k)) cand.push(k); }
      const stops = cand.sort(() => R() - 0.5).slice(0, 1 + (R() < 0.5 ? 1 : 0));
      if (!stops.length) g.kind = 'wander';
      else g.wp = [tIdx(Math.floor(home[0]), Math.floor(home[1])), ...stops].map(k => ({ k, field: null }));
    }
    members.forEach((o, n) => { o.routine = g; o.slot = n; });
  }
}
// the field leading to a stop (worked out once, the first time it is needed)
function fieldTo(stop) { if (!stop.field) stop.field = bfs(stop.k % MW, (stop.k / MW) | 0); return stop.field; }
// a fresh wander spot: a reachable floor tile within 3.5 tiles of home, 3-8 steps away
function wanderStop(g) {
  const h = g.home, d0 = bfs(Math.floor(h[0]), Math.floor(h[1]));
  for (let t = 0; t < 30; t++) { const a = g.R() * 6.283, rr = 1.5 + g.R() * 2, k = tIdx(Math.floor(h[0] + Math.cos(a) * rr), Math.floor(h[1] + Math.sin(a) * rr)); const fs = G.routineStart; if (k >= 0 && k < MW * MH && d0[k] >= 2 && d0[k] <= 8 && (!fs || fs[k] < 0 || fs[k] >= 10)) return { k, field: null }; }
  return null;
}
// sight: straight ahead to 7.5 tiles (about 150 degrees wide), all round only up close
function notices(e, d, dx, dy) {
  if (d > 7.5) return false;
  if (FEEL_OLD) return d < 7 && los(e.fi, e.fj, hero.fi, hero.fj);
  if (d >= 3.2) { const [fx, fy] = dirVec(e.dir), l = Math.hypot(fx, fy) || 1; if ((dx * fx + dy * fy) / (l * (d || 1)) < 0.25) return false; }
  return los(e.fi, e.fj, hero.fi, hero.fj);
}
function walkToward(e, ti, tj, sp, dt) {
  const dx = ti - e.fi, dy = tj - e.fj, l = Math.hypot(dx, dy); if (l < 0.02) return 0;
  const st = Math.min(l, e.def.speed / 16 * sp * dt), f0 = e.fi, j0 = e.fj;
  tryMove(e, dx / l * st, dy / l * st, 0.25);
  const moved = Math.hypot(e.fi - f0, e.fj - j0);
  e.walk += moved / (FAMILIES[e.fam].gait || 0.32); e.clip = moved > 0.001 ? 'walk' : 'idle'; if (moved > 0.001) e.dir = dirFrom(dx, dy);
  return moved;
}
function routineStep(e, dt, d) {
  const g = e.routine;
  if (d > 26) return;   // far from the hero: nobody is watching, nothing moves
  if (g.kind === 'guard') return idleLife(e, dt);
  const L = g.leader;
  if (e !== L) {   // a follower: a loose spot beside and behind the leader, catching up if it falls behind
    if (!alive(L) || L.state !== 'sleep') { e.routine = null; return idleLife(e, dt); }
    const [fx, fy] = g.heading || dirVec(L.dir), side = (e.slot % 2 ? 1 : -1) * (0.8 + Math.floor(e.slot / 2) * 0.5), back = 0.9 + Math.floor((e.slot - 1) / 2) * 0.6;
    let ti = L.fi - fx * back - fy * side * 0.7, tj = L.fj - fy * back + fx * side * 0.7;
    if (blocked(ti, tj)) { ti = L.fi - fx * 0.9; tj = L.fj - fy * 0.9; }   // its spot is in a wall: just behind the leader
    const gap = Math.hypot(ti - e.fi, tj - e.fj), near = Math.hypot(L.fi - e.fi, L.fj - e.fj);
    if (e.folStuck > 0.8 && near < 2.5) { e.folStuck -= dt * 0.5; e.clip = 'idle'; return; }   // couldn't get there: stand about a while
    if (gap < (L.clip === 'idle' ? 1.1 : 0.25) || (L.clip === 'idle' && near < 1.6)) { e.clip = 'idle'; if (L.clip === 'idle' && Math.random() < dt * 0.4) e.dir = (e.dir + (Math.random() < 0.5 ? 1 : 7)) % 8; return; }   // close enough: stand about (looser while the leader waits)
    const mv = walkToward(e, ti, tj, gap > 2 ? 0.7 : 0.42, dt);
    e.folStuck = mv < e.def.speed / 16 * 0.42 * dt * 0.4 ? (e.folStuck || 0) + dt : 0;
    return;
  }
  if (g.waitT > 0) {   // pausing at a stop: looking about
    g.waitT -= dt; e.clip = 'idle';
    if (Math.random() < dt * 0.6) e.dir = (e.dir + (Math.random() < 0.5 ? 1 : 7)) % 8;
    return;
  }
  if (!g.cur) { g.cur = g.kind === 'patrol' ? g.wp[g.at = (g.at + 1) % g.wp.length] : wanderStop(g); if (!g.cur) { g.waitT = 2; return; } }
  const field = fieldTo(g.cur), i = Math.floor(e.fi), j = Math.floor(e.fj), here = field[tIdx(i, j)];
  if (here <= 0) {   // arrived (or the stop can't be reached from here): pause, then the next one
    g.cur = null; g.waitT = g.kind === 'patrol' ? 1.5 + g.R() * 2.5 : 1.5 + g.R() * 4; e.clip = 'idle'; return;
  }
  let best = null, bv = here;   // step to the neighbouring tile nearest the stop (diagonals when both sides are open)
  for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const k = tIdx(i + a, j + b); if (k < 0 || k >= MW * MH) continue; const v = field[k];
    if (v < 0 || v >= bv) continue;
    if (a && b && (field[tIdx(i + a, j)] < 0 || field[tIdx(i, j + b)] < 0)) continue;
    best = [i + a + 0.5, j + b + 0.5]; bv = v;
  }
  if (!best) { g.cur = null; g.waitT = 1; return; }
  { const hx = best[0] - e.fi, hy = best[1] - e.fj, hl = Math.hypot(hx, hy) || 1, h0 = g.heading || [hx / hl, hy / hl]; g.heading = [h0[0] * 0.9 + hx / hl * 0.1, h0[1] * 0.9 + hy / hl * 0.1]; const n = Math.hypot(...g.heading) || 1; g.heading = [g.heading[0] / n, g.heading[1] / n]; }   // smoothed, so the formation doesn't jerk at corners
  if (!walkToward(e, best[0], best[1], g.kind === 'patrol' ? 0.45 : 0.36, dt) && (g.stuck = (g.stuck || 0) + dt) > 1.5) { g.stuck = 0; g.cur = null; g.waitT = 1; }   // blocked by something: give up on this stop
}
// round 35: monsters that haven't noticed the hero look around and shift about near where they stand
function idleLife(e, dt) {
  if (FEEL_OLD) return;
  e.idleT = (e.idleT ?? 1 + Math.random() * 3) - dt;
  if (e.wander) {
    const [ti, tj] = e.wander, dx = ti - e.fi, dy = tj - e.fj, l = Math.hypot(dx, dy);
    if (l < 0.08 || e.wanderT <= 0) { e.wander = null; e.clip = 'idle'; return; }
    e.wanderT -= dt; const sp = e.def.speed / 16 * 0.35 * dt, f0 = e.fi, j0 = e.fj;
    tryMove(e, dx / l * sp, dy / l * sp, 0.25); e.walk += Math.hypot(e.fi - f0, e.fj - j0) / (FAMILIES[e.fam].gait || 0.32); e.clip = 'walk'; e.dir = dirFrom(dx, dy);
    return;
  }
  if (e.idleT > 0) return;
  e.idleT = 2 + Math.random() * 3.5;
  if (Math.random() < 0.55) { e.dir = (e.dir + (Math.random() < 0.5 ? 1 : 7) * (Math.random() < 0.3 ? 2 : 1)) % 8; return; }   // a look around
  const a = Math.random() * 6.283, r = 0.4 + Math.random() * 0.6, h = e.home || [e.fi, e.fj];
  const t = [h[0] + Math.cos(a) * r, h[1] + Math.sin(a) * r];
  if (!blocked(t[0], t[1])) { e.wander = t; e.wanderT = 2; }
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
    if (p.kind === 'missile') { (p.trail = p.trail || []).push([p.fi, p.fj, p.z]); if (p.trail.length > (p.small ? 8 : 14)) p.trail.shift(); }   // round 27 (round 67: longer): the path it took, for the trail
    if (p.kind === 'missile') {   // homing: turn toward the target (or the nearest enemy once it dies)
      if (p.orb) updateOrb(p, dt);   // round 30: the Arcane Orb modifier zaps what is near it as it drifts
      if (p.noHome) { /* piercing bolts and orbs fly straight */ } else if (!p.home || !alive(p.home)) { let bd = 4; p.home = null; for (const e of enemies) { if (!alive(e)) continue; const d = Math.hypot(e.fi - p.fi, e.fj - p.fj); if (d < bd) { bd = d; p.home = e; } } }
      if (p.home) {
        const want = Math.atan2(p.home.fj - p.fj, p.home.fi - p.fi), cur = Math.atan2(p.vy, p.vx);
        let da = ((want - cur + Math.PI * 3) % (Math.PI * 2)) - Math.PI; da = Math.max(-5 * dt, Math.min(5 * dt, da));
        const sp = Math.hypot(p.vx, p.vy), a = cur + da; p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp;
      }
    }
    const n = 3;
    for (let s = 0; s < n && p.life > 0; s++) {
      p.fi += p.vx * dt / n; p.fj += p.vy * dt / n;
      if (blocked(p.fi, p.fj) && tileAt(Math.floor(p.fi), Math.floor(p.fj)) !== FLOOR) { p.life = 0; break; }
      if (p.owner === 'enemy') {
        if (!hero.dead && Math.hypot(hero.fi - p.fi, hero.fj - p.fj) < 0.45) { hurtHero(roll(p.dmg), null); p.life = 0; if (p.kind === 'frostbolt') hero.chillT = 1.5; }
      } else {
        if (G.frostOrbs.length && breakOrbsAt(p.fi, p.fj, 0.4) && !p.pierce && !p.orb) { p.life = 0; break; }   // round 39: shots break frost orbs
        for (const e of enemies) if (alive(e) && Math.hypot(e.fi - p.fi, e.fj - p.fj) < 0.5 + (e.def.unique ? 0.4 : 0)) {
          if (p.orb) break;   // the orb drifts through, zapping (updateOrb)
          if (p.pierce) {   // the piercing bolt goes on through, hitting each foe once
            if (p.hits.has(e)) continue;
            const arrow = p.kind === 'arrow';   // (the ranger's Piercing Shots use it too)
            p.hits.add(e); const c = spellCrit(); G.elem = arrow ? p.elem || null : 'arcane'; G.pierce = true; damageEnemy(e, spellDmg(c ? p.dmgK * 2 : p.dmgK), p.fi - p.vx * 0.05, p.fj - p.vy * 0.05, c, p.pow || 0, true); G.elem = null; G.pierce = false; if (p.onHit) p.onHit(e, p);
            if (arrow) arrowBite(p, e); else { impactFlash(e.fi, e.fj, p.z, 3); sfx('zap'); } continue;
          }
          if (p.boom) { p.life = 0; break; }   // a fireball bursts on whatever it touches (below)
          if (p.spell) { const c = p.crit || spellCrit(); G.elem = p.elem || null; damageEnemy(e, spellDmg(c ? p.dmgK * 2 : p.dmgK), p.fi - p.vx * 0.05, p.fj - p.vy * 0.05, c, 0, true); G.elem = null; if (p.kind === 'arrow') arrowBite(p, e); if (p.onHit) p.onHit(e, p); if (p.basic) { hero.pips = Math.min(3, (hero.pips || 0) + 1); hero.pipT = G.t; } if (p.kind === 'missile') hero.mana = Math.min(STAT.maxMana, hero.mana + (p.small ? 1 : 3)); }
          else damageEnemy(e, roll(p.dmg), p.fi - p.vx * 0.05, p.fj - p.vy * 0.05, false, 0, true);
          p.life = 0; break;
        }
      }
    }
    const [x, y] = iso(p.fi, p.fj);
    if (p.kind !== 'arrow' && Math.random() < 0.7) pspawn(3, x, y, p.z, (Math.random() - 0.5) * 8, 0, 4 + Math.random() * 8, 0.35, p.kind === 'holy' ? 50 : p.kind === 'missile' ? 39 : p.kind === 'frostbolt' ? 118 : 16);
    if (p.kind === 'hfire' && Math.random() < 0.6) pspawn(3, x + (Math.random() - 0.5) * 6, y, p.z + 2, (Math.random() - 0.5) * 6, 0, 10 + Math.random() * 8, 0.5, Math.random() < 0.5 ? 4 : 5);   // smoke
    if (p.kind === 'missile' && p.life <= 0 && p.orb) orbBurst(p);
    if (p.kind === 'missile' && p.life <= 0) { impactFlash(p.fi, p.fj, p.z, p.small ? 3 : 5); sfx('zap'); arcaneHit(p); }   // round 67: a rune ring and rays where it bursts
    if (p.kind === 'missile' && p.life <= 0) for (let k = 0; k < (p.small ? 8 : 14); k++) { const a = k / (p.small ? 8 : 14) * 6.283 + Math.random() * 0.3, v = 40 + Math.random() * 35; pspawn(4, x, y, p.z, Math.cos(a) * v, Math.sin(a) * v * 0.5, 20 + Math.random() * 40, 0.22 + Math.random() * 0.12, k % 3 ? 40 : k % 2 ? 58 : 27); }   // a spray of sparks on impact
    if (p.kind === 'missile' && p.life > 0 && !p.small && Math.random() < 0.5) pspawn(3, x + (Math.random() - 0.5) * 4, y + (Math.random() - 0.5) * 2, p.z + (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 3, -4, 0.4 + Math.random() * 0.3, Math.random() < 0.5 ? 58 : 40);   // round 67: motes left hanging in its wake
    if (p.life <= 0 && p.kind === 'holy') sfx('boltHit');
    if (p.life <= 0 && p.boom && !p.boomed) { p.boomed = true; explodeAt(p.fi - p.vx * 0.03, p.fj - p.vy * 0.03, p.boom.r, p.boom.k, p.boom.pow, !!p.boom.big); if (p.boom.ground) G.fireGround.push({ fi: p.fi, fj: p.fj, r: 1.6, t: 3, tick: 0.3 }); }
    if (p.life <= 0 && p.kind !== 'arrow' && !p.boom) burst(2, x, y, p.z, p.kind === 'missile' ? 7 : 12, 60, p.kind === 'holy' ? 51 : p.kind === 'missile' ? 40 : 17);
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
      const fk = y * WW + x, onFloor = x >= 0 && y >= 0 && x < WW && y < WH && wFloor[fk] && floorBuf[fk] !== BLK;
      if (kind === 1 && onFloor) setFloor(fk, pcol[k] === 54 ? GREEN[hash(x, y, 77) < 0.5 ? 2 : 1] : hash(x, y, 77) < 0.5 ? RED[2] : RED[1]);
      if (kind === 6 && onFloor) { setFloor(fk, BONE[1]); if (x + 1 < WW && wFloor[fk + 1]) setFloor(fk + 1, BONE[0]); }
      pkind[k] = 0;
    }
  }
  // fireflies drift through the woods at night
  if (LV.night && LV.area === 'forest' && Math.random() < 0.12) { const [x, y] = screenOf(hero); pspawn(4, x + (Math.random() - 0.5) * 240, y + (Math.random() - 0.5) * 160, 6 + Math.random() * 20, (Math.random() - 0.5) * 10, 0, (Math.random() - 0.5) * 6, 1.5 + Math.random() * 1.5, Math.random() < 0.5 ? 124 : 91); }
  for (const f of fires) if (f.ember && LV.vis[f.tile] > 0.1 && Math.random() < f.ember) pspawn(3, f.wx + (Math.random() - 0.5) * f.w * 1.2, f.wy + 20, 20 + Math.random() * 4, (Math.random() - 0.5) * 6, 0, 16 + Math.random() * 12, 1 + Math.random(), 16);
}

// ---------------------------------------------------------------- render
function frameOf(e) {
  const pt = e.clock;
  if (e === hero && hero.whirl > 0) return FEEL_OLD ? 3 : Math.floor(G.t / 0.07) % 4;   // the sword held out level, smeared (round 40a: the spin pose, feet shuffling)
  if (e === hero) {   // round 40a: the hero's new clips
    if (e.clip === 'hook') return hero.cast >= 0 ? (hero.castAge < CAST_RELEASE + 0.05 ? 0 : G.hooks.some(h => h.state === 'pull' || h.state === 'reel') ? 2 : 1) : 2;
    if (e.clip === 'hit') return hero.hitF || 0;
    if (e.clip === 'drink') return hero.runT > 0 ? Math.floor(hero.walk) % 8 : 8;
    if (e.clip === 'fidget' && hero.fidget) return hero.fidget.v * 4 + Math.min(3, Math.floor(hero.fidget.t / 0.21));
    if (e.clip === 'attack4' && hero.landT > 0 && hero.atk < 0 && !hero.leap) return hero.landT > 0.12 ? 4 : 5;
  }
  if (e === hero && hero.dash > 0) return 0;
  if (e.clip === 'idle') return Math.floor(pt / 0.2) % 4;
  if (e.clip === 'walk') return Math.floor(e.walk) % 8;
  if (e === hero && e.clip === 'vault' && hero.roll) { const u = hero.roll.t / hero.roll.dur; return u < 0.16 ? 0 : u < 0.78 ? 1 : 2; }   // round 43
  if (e === hero && e.clip === 'toss') return hero.tossT > 0.2 ? 0 : 1;
  if (e === hero && e.clip === 'channel') { const a = hero.castAge || 0, rl = castRel(hero.castKind), ph = a < rl ? 0 : a < rl + 0.13 ? 1 : 2; return (hero.castKind === 'meteor' ? 3 : hero.castKind === 'cone' && !FEEL_OLD ? 6 : (hero.castKind === 'fireball' || hero.castKind === 'chain') && !FEEL_OLD ? 9 : 0) + ph; }   // round 43: the slam and the hurl
  if (e.clip === 'attack2' || e.clip === 'attack3' || e.clip === 'attack4') return Math.max(0, swingKey(FAMILIES[e.fam].combo(e, atkIndex(e.clip)), e.atk));
  if (e === hero && e.clip === 'arrive') return hero.arriveT > 0.15 ? 0 : 1;
  if (e === hero && e.clip === 'storm') return Math.floor(G.t * 6) % 4;   // round 43
  if (e.clip === 'attack' || e.clip === 'shoot' || e.clip === 'volley' || e.clip === 'skyshot' || e.clip === 'cast') return Math.max(0, swingKey(FAMILIES[e.fam].swing(e), e.atk));
  if (e.downT > 0) { const t = e.downT0 - e.downT; return Math.max(0, Math.min(4, Math.floor(Math.min(t, e.downT) / 0.06))); }   // knocked down: fall, lie, get up
  if (e.clip === 'death') return Math.min(5, Math.floor((e === hero ? hero.dead : e.dying) / 0.1));
  return 0;
}
// hurt tint: each palette color mapped onto the red ramp by its brightness, so the shape still reads
const HURT_TINT = new Uint8Array(128), ICE_TINT = new Uint8Array(128), ARC_TINT = new Uint8Array(128), FIRE_TINT = new Uint8Array(128);
for (let v = 0; v < 128; v++) {
  const n = parseInt(PAL_HEX[v] || '000000', 16), L = (0.3 * (n >> 16) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255)) / 255;
  HURT_TINT[v] = v <= 1 ? v : RED[Math.min(4, Math.floor(L * 6 + 0.5))];
  ICE_TINT[v] = v <= 1 ? v : WATER[Math.min(4, Math.floor(L * 4.6 + 0.9))];
  ARC_TINT[v] = v <= 1 ? v : BLUE[Math.min(3, Math.floor(L * 4 + 1))] | EMIS;
  FIRE_TINT[v] = v <= 1 ? v : FIRE[Math.min(FIRE.length - 1, Math.floor(L * FIRE.length * 0.9 + 0.5))] | EMIS;   // burning: the body glows through the fire ramp   // blink afterimage: glowing arcane blue   // frozen: ice blue that keeps the body's shading
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
      scr[o] = !flash || v === BLK ? v : flash === 4 ? ICE_TINT[v & 127] : flash === 6 ? ARC_TINT[v & 127] : flash === 5 ? ((xx + yy) & 1 ? ICE_TINT[v & 127] : v) : flash === 2 ? HURT_TINT[v & 127] : flash === 3 ? ((xx + yy) & 1 ? HURT_TINT[v & 127] : v) : (27 | EMIS);
      zbuf[o] = sp.z ? sp.z[k] : Math.max(0, sp.ay - y);
      shd[o] = 0; cid[o] = cidx; if (tile >= 0) tbuf[o] = tile;
    }
  }
}
// round 28b, rim light and torch shadows. Each body finds its key light: the strongest light
// reaching it (torches, braziers, campfires, lanterns; the hero's own light for everyone else).
// Its silhouette edge facing that light is lit two steps brighter, and it casts a stretched
// shadow on the ground away from it. Outdoors by day the sun is overhead: neither applies.
let RIM_SHADOW = HUE_LIGHT;
try { const q = new URLSearchParams(location.search).get('rim'); if (q !== null) RIM_SHADOW = q !== '0'; } catch (e) { /* ignore */ }
function keyLight(c, kx, ky) {
  if (!RIM_SHADOW || (LV.outdoor && !LV.night)) return null;
  const [x, y] = screenOf(c); let best = null, bw = 0.12;
  const test = (lx, ly, lz, r, i) => {
    const dx = lx - x, dy = (ly - y) * 2, d2 = dx * dx + dy * dy; if (d2 >= r * r) return;
    const w = i * (1 - d2 / (r * r)); if (w > bw) { bw = w; const d = Math.sqrt(d2) || 1; best = { gx: dx / d, gy: dy / d, w, sx: lx - x, sy: ly - lz - (y - 14) }; }
  };
  const tr = LV.outdoor ? 1 : DLIGHT.tr, ti = LV.outdoor ? 1 : DLIGHT.ti;
  for (const L of lights) test(L.x, L.y, L.z, L.r * tr, L.i * ti);
  if (c !== hero && !LV.outdoor) test(kx, ky, 34, DLIGHT.hr, DLIGHT.hi * 0.8);
  return best;
}
// the cast shadow: an ellipse on the ground stretched away from the light, longer when the light
// is close and strong, dithered toward its far end
function castShadow(wx, wy, rx, kl) {
  const len = rx * (1.1 + 1.4 * Math.min(1, kl.w)), wid = rx * 0.55, ux = -kl.gx, uy = -kl.gy;   // away from the light (ground plane, y doubled)
  const cx = wx - camX + ux * len * 0.55, cy = wy - camY + uy * len * 0.55 / 2;
  const R = Math.ceil(len) + 2;
  for (let y = Math.floor(cy - R / 2); y <= cy + R / 2; y++) for (let x = Math.floor(cx - R); x <= cx + R; x++) {
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const px = x - cx, py = (y - cy) * 2, u = (px * ux + py * uy) / (len * 0.62), v = (-px * uy + py * ux) / wid;
    const e = u * u + v * v; if (e > 1) continue;
    const far = (u + 1) / 2;   // 0 at the feet, 1 at the tip
    if (far > 0.55 && BAYER[((y & 3) << 2) | (x & 3)] < (far - 0.55) / 0.45) continue;
    if (scr[y * W + x] !== BLK && zbuf[y * W + x] <= 2) shd[y * W + x] = 1;
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
const COLD_FIRE = { [FIRE[1]]: 114, [FIRE[2]]: 116, [FIRE[3]]: 117, [FIRE[4]]: 118, [FIRE[5]]: 27 };   // the lich's braziers burn blue
// round 28, glow: a stepped, dithered halo in the air around flames, lit windows and lanterns at
// night, spells in flight and explosions, added over the finished frame (bodies included), so
// bright things seem to spill light. Toggled with the warm light (LIGHT: NEW / OLD on the title)
let GLOW = HUE_LIGHT;
const GLOW_WARM = [255, 150, 60], GLOW_BLUE = [90, 150, 255], GLOW_ARC = [120, 170, 255], GLOW_GOLD = [255, 220, 120];
function glowAt(wx, wy, R, k, col) {
  const X0 = Math.round(wx * SPX) - cam2x, Y0 = Math.round(wy * SPX) - cam2y;
  if (X0 < -R || Y0 < -R || X0 > OW + R || Y0 > OH + R) return;
  const R2 = R * R;
  for (let y = Math.max(0, Y0 - R); y < Math.min(OH, Y0 + R); y++) {
    const dy = y - Y0, by = (y & 3) << 2, row = y * OW;
    for (let x = Math.max(0, X0 - R); x < Math.min(OW, X0 + R); x++) {
      const dx = x - X0, d2 = dx * dx + dy * dy; if (d2 >= R2) continue;
      const f = 1 - Math.sqrt(d2) / R, q = Math.floor((f * f * k * 10 + BAYER[by | (x & 3)]) ) / 10;   // banded, not smooth
      if (q <= 0) continue;
      const c = ov32[row + x], r = c & 255, g = (c >> 8) & 255, b = (c >> 16) & 255;
      ov32[row + x] = (255 << 24) | (Math.min(255, b + col[2] * q) << 16) | (Math.min(255, g + col[1] * q) << 8) | Math.min(255, r + col[0] * q);
    }
  }
}
function drawGlows() {
  const day = LV.outdoor && !LV.night, fl = 0.9 + 0.1 * Math.sin(G.t * 13);
  for (const f of fires) {
    if (VIEW_FOG && !(LV.vis[f.tile] > 0.15) && !LV.outdoor) continue;
    if (f.wx < camX - 40 || f.wx > camX + W + 40 || f.wy < camY - 40 || f.wy > camY + H + 60) continue;   // off screen
    const big = f.h >= 10, R = big ? 26 : 12, k = (day ? 0.18 : big ? 0.5 : 0.35) * fl;
    glowAt(f.wx, f.wy - f.h * 0.45, R, k, f.blue ? GLOW_BLUE : GLOW_WARM);
  }
  if (LV.night) for (const d of LV.decor) if (d.kind === 'lantern') { const [x, y] = iso(d.fi, d.fj); glowAt(x + 4, y - 20, 14, 0.4 * fl, GLOW_GOLD); }
  for (const p of projectiles) {
    if (p.kind === 'arrow') continue;
    const [x, y] = iso(p.fi, p.fj), col = p.kind === 'missile' || p.kind === 'frostbolt' ? GLOW_ARC : p.kind === 'holy' ? GLOW_GOLD : GLOW_WARM;
    glowAt(x, y - p.z, p.kind === 'hfire' ? 22 : 14, 0.45, col);
  }
  for (const f of G.flashes) { const [x, y] = iso(f.fi, f.fj); glowAt(x, y - 12, Math.round(f.r * 0.4), 0.7 * f.t / f.t0, GLOW_WARM); }
  if (G.tp) { const [x, y] = iso(G.tp.fi, G.tp.fj); glowAt(x, y - 16, 30, 0.35 * Math.min(1, G.tp.t / 0.45), GLOW_BLUE); }
}
function setLightNew(v) { HUE_LIGHT = GLOW = RIM_SHADOW = v; buildLcol(); try { localStorage.setItem('dcg-light', v ? 'new' : 'old'); } catch (e) { /* ignore */ } }
function flame(wx, wy, hgt, wid, t, seed, blue = false) {
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
      if (blue) c = COLD_FIRE[c] || c;
      scr[y * W + x] = c | EMIS;
    }
  }
}
function render() {
  if ((G.mode === 'inv' || G.mode === 'skills') && G.fade <= 0) { drawHudLayer(); return; }   // round 45: the bag and skills screens cover the world: don't draw it
  const t = G.t;
  buildBudget.used = 0; buildBudget.ms = 2;
  const [kx, ky] = screenOf(hero), [vx0, vy0] = G.camAt ? screenOf(G.camAt) : [kx, ky];   // (the skill preview frames the hero and the dummies)
  const sh = G.trauma * G.trauma * 5;
  const shx = Math.round(sh * (Math.sin(t * 61) * 0.6 + Math.sin(t * 97 + 1) * 0.4)), shy = Math.round(sh * (Math.sin(t * 73 + 2) * 0.6 + Math.sin(t * 89 + 3) * 0.4));
  // the camera in detail pixels; the world layer uses the whole-pixel part and is shifted by the rest
  const kx2 = G.kick && SHAKE ? Math.round(G.kick[0]) : 0, ky2 = G.kick && SHAKE ? Math.round(G.kick[1]) : 0;   // round 62: the blow's jolt
  cam2x = Math.round((vx0 - W / 2) * SPX) + shx * SPX + kx2; cam2y = Math.round((vy0 - H * 0.47) * SPX) + shy * SPX + ky2;
  camX = Math.floor(cam2x / SPX); camY = Math.floor(cam2y / SPX); hx = cam2x - camX * SPX; hy = cam2y - camY * SPX;
  shd.fill(0); cid.fill(0);
  for (let y = 0; y < H; y++) {
    const wy = camY + y, row = wy * WW;
    if (wy >= 0 && wy < WH && camX >= 0 && camX + W <= WW) {
      scr.set(wIdx.subarray(row + camX, row + camX + W), y * W); zbuf.set(wZ.subarray(row + camX, row + camX + W), y * W); tbuf.set(wTile.subarray(row + camX, row + camX + W), y * W);
      continue;
    }
    for (let x = 0; x < W; x++) {
      const wx = camX + x, o = y * W + x, inside = wy >= 0 && wy < WH && wx >= 0 && wx < WW;
      scr[o] = inside ? wIdx[row + wx] : LV.outdoor ? canopyAt(wx, wy) : BLK; zbuf[o] = inside ? wZ[row + wx] : 0; tbuf[o] = inside ? wTile[row + wx] : -1;
    }
  }
  const visAt = (fi, fj) => LV.vis[tIdx(clamp(Math.floor(fi), 0, MW - 1), clamp(Math.floor(fj), 0, MH - 1))];
  // only characters near the screen are drawn (the big forest holds many more than are in view)
  const onScreen = c => { const [x, y] = screenOf(c); return x > camX - 70 && x < camX + W + 70 && y > camY - 30 && y < camY + H + 90; };
  const chars = [hero, ...enemies.filter(e => !e.corpse && visAt(e.fi, e.fj) > 0.25 && onScreen(e)), ...npcs.filter(onScreen)];
  const boxes = chars.map(c => { const [x, y] = screenOf(c); return [x - 40, y - 64, x + 40, y + 8, c.fi + c.fj]; });
  // the part of a sprite in front of characters it overlaps: null if none, else the union of those
  // characters' boxes (world px), so a redraw only touches what can cover someone
  const inFront = (depth, x0, y0, w, h) => {
    let r = null;
    for (const b of boxes) if (depth > b[4] && x0 < b[2] && x0 + w > b[0] && y0 < b[3] && y0 + h > b[1]) r = r ? [Math.min(r[0], b[0]), Math.min(r[1], b[1]), Math.max(r[2], b[2]), Math.max(r[3], b[3])] : [b[0], b[1], b[2], b[3]];
    return r;
  };
  // world layer: things that lie on the ground or stay put (drawn before lighting)
  const base = [], ov = [];
  // a baked prop only needs drawing again (on the detail layer) if it covers a character it overlaps
  for (const p of props) {
    const clip = inFront(p.depth, p.wx - p.sp.ax, p.wy - p.sp.ay, p.sp.w, p.sp.h);
    if (!clip) continue;
    // tall scenery in front of the hero is redrawn dithered so the hero shows through (Diablo's trick)
    const hd = hero.fi + hero.fj, hb = boxes[0];
    const x0 = p.wx - p.sp.ax, y0 = p.wy - p.sp.ay, see = p.sp.h > 30 && p.depth > hd + 0.5 && x0 < hb[2] && x0 + p.sp.w > hb[0] && y0 < hb[3] && y0 + p.sp.h > hb[1];
    ov.push({ depth: p.depth, draw: () => ovBlit(WORLD2X && p.sp.sp2 ? p.sp.sp2 : p.sp, p.wx, p.wy, -1, 0, see ? 0.5 : 0, p.tile, clip) });
  }
  for (const p of dynProps) {
    if (p.broken) continue;
    if (p.kind === 'cage') {   // round 42b: the back bars behind whoever is inside, the front bars and lid over them
      for (const h of ['b', 'f']) {
        const sp = PROPS.cage(p.open, h), dd = p.depth + (h === 'f' ? 0.6 : -0.6);
        base.push({ depth: dd, draw: () => blit(sp, p.wx, p.wy, false, 0, p.tile) });
        const clip = h === 'f' && inFront(dd, p.wx - sp.ax, p.wy - sp.ay, sp.w, sp.h);
        if (clip) ov.push({ depth: dd, draw: () => ovBlit(sp, p.wx, p.wy, -1, 0, 0, p.tile, clip) });
      }
      continue;
    }
    const sp = p.kind === 'barrel' ? PROPS.barrel() : p.kind === 'egg' ? PROPS.egg() : p.kind === 'cage' ? PROPS.cage(p.open) : PROPS.chest(p.open);
    if (p.flash > 0) p.flash -= 1 / 60;
    if (WORLD2X && sp.sp2) { ov.push({ depth: p.depth, draw: () => ovBlit(sp.sp2d, p.wx, p.wy, -1, p.flash > 0 ? 1 : 0, 0, p.tile) }); continue; }   // barrels and chests at full detail, depth-sorted with the bodies
    base.push({ depth: p.depth, draw: () => blit(sp, p.wx, p.wy, p.flash > 0, 0, p.tile) });
    const clip = inFront(p.depth, p.wx - sp.ax, p.wy - sp.ay, sp.w, sp.h);
    if (clip) ov.push({ depth: p.depth, draw: () => ovBlit(sp, p.wx, p.wy, -1, p.flash > 0 ? 1 : 0, 0, p.tile, clip) });
  }
  for (const g of groundItems) {
    const [x, y] = iso(g.fi, g.fj), bounce = g.t < 0.4 ? Math.round(Math.sin(g.t / 0.4 * Math.PI) * 8) : 0;
    const tile = tIdx(Math.floor(g.fi), Math.floor(g.fj));
    base.push({ depth: g.fi + g.fj - 0.3, draw: () => { if (g.gold) return drawGold(x, y - bounce, tile); if (g.gem) return drawGem(x, y - bounce, tile, g.gem); if (g.item.rarity !== 'normal' && g.t > 0.4) drawBeam(x, y, RARITY_COL[g.item.rarity], tile, g.item.id, g.item.rarity === 'legend'); blit(itemIcon(g.item), x, y - bounce + 4, false, 0, tile); } });
  }
  chars.forEach((c, n) => {
    const [x, y] = screenOf(c);
    const kl = c.clip !== 'death' ? keyLight(c, kx, ky) : null; c._kl = kl;
    const srx = c === hero || c.role ? (c.fam === 'chicken' ? 4 : 8) : c.def.shadow * (c.look.scale || 1);
    if (c.clip !== 'death') { shadowBlob(x, y + 1, srx); if (kl) castShadow(x, y + 1, srx, kl); }
    ov.push({ depth: c.fi + c.fj, draw: () => {
      const sp = getSprite(c.fam, c.look, c.dir, c.clip, frameOf(c), c);
      const jit = c.stop > 0 && c !== hero && c.dying < 0 ? (Math.floor(t * 33) % 2 ? 1 : -1) : 0;
      // white flash, then a brief dithered red; ice blue while frozen, half ice while slowed
      const ash = c.deathKind === 'ash' && c.dying >= 0, shat = c.deathKind === 'shatter' && c.dying >= 0;
      const fl = c.flash > 0 ? 1 : shat ? 4 : ash || (c.burnT > 0 && Math.floor(G.t * 16 + c.seed) % 3 === 0) ? 7 : c.frozen > 0 ? 4 : c.tint > 0 ? 3 : c.slowT > 0 || c.chillT > 0 ? 5 : 0;
      const dis = ash ? Math.min(1, c.dying / 0.55) : shat ? Math.min(1, c.dying / 0.15) : 0;
      ovBlit(sp, x + jit, y - (c.leapZ || 0), charLevel[n], fl, dis, tIdx(Math.floor(c.fi), Math.floor(c.fj)), null, c._kl);
    } });
  });
  for (const p of projectiles) ov.push({ depth: p.fi + p.fj, draw: () => drawProjectile(p) });
  if (G.tp) ov.push({ depth: G.tp.fi + G.tp.fj, draw: drawPortal });
  if (hero.whirl > 0) ov.push({ depth: hero.fi + hero.fj - 0.01, draw: () => whirlSmear(false) }, { depth: hero.fi + hero.fj + 0.01, draw: () => whirlSmear(true) });
  shrineCrystals(base);
  for (const f of fires) if (!VIEW_FOG || LV.vis[f.tile] > 0.1 || LV.seen[f.tile]) base.push({ depth: (f.tile % MW) + Math.floor(f.tile / MW) + (f.depthAdd ?? 1.2), draw: () => flame(f.wx, f.wy, f.h, f.w, t, f.seed, f.blue) });
  heroRing(kx, ky + 1);
  base.sort((a, b) => a.depth - b.depth);
  for (const d of base) d.draw();
  drawTelegraph(); drawImpactFx(); drawRocks(); drawRangerGround(); drawEliteGround(); drawMeteors(); drawLichFx(); drawWarriorFx();
  const charLevel = lightPass(chars, kx, ky);
  // the frame: the lit world doubled (shifted by the camera's half pixel), then the detail layer over it
  for (let y = 0; y < H; y++) {
    const r0 = y * W; let first = -1;
    for (let b = 0; b < SPX; b++) {
      const yy = y * SPX - hy + b; if (yy < 0 || yy >= OH) continue;
      const d = yy * OW;
      if (first >= 0) { ov32.copyWithin(d, first, first + OW); continue; }   // the second line of a doubled row
      for (let x = 0, X = -hx; x < W; x++, X += SPX) { const c = base32[r0 + x]; if (X >= 0) ov32[d + X] = c; ov32[d + X + 1] = c; }
      if (hx) ov32[d + OW - 1] = base32[r0 + W - 1];
      first = d;
    }
  }
  if (hy) ov32.copyWithin((OH - 1) * OW, (OH - 2) * OW, (OH - 1) * OW);
  // round 27: the 2x props, visiting only the spans of each row that hold 2x pixels. A detail pixel
  // takes its 2x prop color where the world pixel under it is still the baked one this frame
  // (nothing drawn over it), lit at that 1x pixel's level
  if (WORLD2X && runs2.length) {
    const W2 = WW * 2, black = PAL32[BLK];
    for (let yy = 0; yy < OH; yy++) {
      const wy2 = cam2y + yy, runs = runs2[wy2]; if (!runs) continue;
      const y = Math.min(H - 1, (yy + hy) >> 1), r0 = y * W, d = yy * OW, row2 = wy2 * W2, wrow = (camY + y) * WW + camX;
      for (let k = 0; k < runs.length; k += 2) {
        const xa = Math.max(runs[k], cam2x), xb = Math.min(runs[k + 1], cam2x + OW);
        let lastX = -1, L = -1;   // two detail columns share one world pixel: check it once
        for (let wx2 = xa; wx2 < xb; wx2++) {
          const X = wx2 - cam2x, x = (X + hx) >> 1; if (x >= W) break;
          if (x !== lastX) { lastX = x; const o = r0 + x, lv = levB[o]; L = (lv === 255 || scr[o] !== wIdx[wrow + x]) ? -1 : lv * NPAL; }
          if (L < 0) continue;
          const v2 = wIdx2[row2 + wx2];
          ov32[d + X] = (v2 & EMIS) ? PAL32[CYCLE[v2 & 127]] : v2 === BLK ? black : LCOL[L + v2];
        }
      }
    }
  }
  if (WORLD2X) frame2.set(ov32);   // the finished world frame, for 2x props redrawn over bodies
  ov.sort((a, b) => a.depth - b.depth);
  for (const d of ov) d.draw();
  drawEliteFx();
  for (const g of G.ghosts) ovBlit(g.sp, g.x, g.y, L_ID, g.fl ?? 6, 1 - g.t / g.t0, -1);   // blink afterimage, dissolving
  for (let k = 0; k < PN; k++) {
    const kind = pkind[k]; if (!kind) continue;
    const X = Math.round(px_[k] * SPX) - cam2x, Y = Math.round((py_[k] - pz_[k]) * SPX) - cam2y;
    if (X < 0 || Y < 0 || X >= OW - 1 || Y >= OH - 1) continue;
    const col = kind === 1 ? (pcol[k] === 22 ? RED[3] : pcol[k]) : pcol[k];
    const emis = kind === 2 || kind === 3 || kind === 4, s = kind === 6 ? 4 : kind === 7 ? 3 : 2;
    const c32 = emis ? PAL32[CYCLE[col]] : envCol((X + hx) >> 1, (Y + hy) >> 1, col, -2);
    if (!c32) continue;
    const c2 = kind === 6 ? envCol((X + hx) >> 1, (Y + hy) >> 1, BONE[0], -2) || c32 : kind === 7 ? envCol((X + hx) >> 1, (Y + hy) >> 1, col - 2, -2) || c32 : c32;   // bone chunks are bigger, with a shaded underside
    for (let b = 0; b < s && Y + b < OH; b++) for (let a = 0; a < s && X + a < OW; a++) ov32[(Y + b) * OW + X + a] = b >= (kind === 7 ? 2 : 2) && (kind !== 7 || a > 0) ? c2 : c32;
  }
  drawImpactFlashes();
  if (GLOW) drawGlows();
  drawHudLayer();
}
// the HUD, drawn at the world's scale into its own buffer, merged on top as blocks
function drawHudLayer() {
  hud32.fill(0); out32 = hud32;
  drawHud();
  out32 = base32;
  for (let y = 0, o = 0; y < H; y++) for (let x = 0; x < W; x++, o++) {
    const c = hud32[o]; if (!c) continue;
    const d = y * SPX * OW + x * SPX;
    for (let b = 0; b < SPX; b++) for (let a = 0; a < SPX; a++) ov32[d + b * OW + a] = c;
  }
  drawFineQueue();   // round 50: menu characters with their sharp sprites
  ctx.putImageData(ovImg, 0, 0);
  if (G.mode === 'title' && TITLE.splash && splashReady()) drawSplashImage();   // round 60: the user's splash picture
  if (G.mode === 'skills' && UI.pvRect) pvBlit(UI.pvRect);   // round 45: the skill preview's picture in its window
}
// the lit color of a palette index at world-layer pixel (x, y), as the world's light pass would
// light it there (light, fog, dither); 0 where the floor there is unseen. tile -2 = use the pixel's own tile
// round 38: no fog of war in the view (the user: it feels bad exploring, even areas already seen).
// Every tile on screen is drawn under its real light (torches, the hero's light), with a little
// ambient so a far room still reads; what has been seen is still tracked for the map. ?fog=1 brings
// the old black-until-seen, dim-when-out-of-sight view back for comparison.
const VIEW_FOG = typeof location !== 'undefined' && new URLSearchParams(location.search).get('fog') === '1';
// round 47: dungeon light presets for the blind A/B (?dl=a|b|c); 'now' is the round 38 look.
// amb: the base light everywhere; hr/hi: the hero's light radius and strength; tr/ti: every torch's
// radius and strength multiplied (outdoors is never touched)
const DLIGHTS = { now: { amb: 0.2, hr: 145, hi: 0.62, tr: 1, ti: 1 }, a: { amb: 0.32, hr: 160, hi: 0.6, tr: 1, ti: 1 },
  b: { amb: 0.26, hr: 150, hi: 0.56, tr: 1.35, ti: 1.15 }, c: { amb: 0.32, hr: 165, hi: 0.6, tr: 1.3, ti: 1.1 },
  d: { amb: 0.44, hr: 190, hi: 0.45, tr: 1.2, ti: 0.95 } };
let DLIGHT = DLIGHTS.now;
try { const q = new URLSearchParams(location.search).get('dl'); if (q && DLIGHTS[q]) DLIGHT = DLIGHTS[q]; } catch (e) { /* ignore */ }
const setDLight = k => { DLIGHT = DLIGHTS[k] || DLIGHTS.now; };
// round 48: the new dungeon light on or off (the map screen's LIGHT button, title OPTIONS); rebakes the
// light maps of the floor in hand so the switch shows at once
function setDL48(v) {
  DL48 = v; DLT = !v; syncLightTables(!!LV.outdoor);
  try { localStorage.setItem('dcg-dlight', v ? 'new' : 'old'); } catch (e) { /* ignore */ }
  if (LV.map && !LV.outdoor && lights.length) { for (const L of lights) L.map = null; bakeLightMaps(); }
}
function envCol(x, y, v, tile) {
  if (x < 0 || y < 0 || x >= W || y >= H) return 0;
  if (v & EMIS) return PAL32[CYCLE[v & 127]];
  if (v === BLK) return PAL32[BLK];
  const o = y * W + x, tk = tile === -2 ? tbuf[o] : tile;
  if (tk < 0 ? !LV.outdoor : VIEW_FOG && !LV.seen[tk]) return 0;
  const vv = tk < 0 || !VIEW_FOG ? 1 : LV.vis[tk], top = (LEVELS - 1) * NPAL;
  let lr = shd[o] ? lbuf[o] * 0.4 : lbuf[o];
  if (DL48 && !LV.outdoor && AO) { const wx = camX + x, wy = camY + y; if (wx >= 0 && wy >= 0 && wx < WW && wy < WH) lr *= AO[wy * WW + wx] * (1 / 255); lr = TONE[Math.min(1023, (lr * BANDS * 64) | 0)] / BANDS; }   // round 48: as the light pass
  const l = lr * BANDS * vv + 0.9 * (1 - vv) + BAYER[((y & 3) << 2) | (x & 3)];
  const L = (l | 0) * NPAL;
  return LCOL[(L < top ? L : top) + v];
}
// draw a sprite on the detail layer. A detail sprite (sp.px === SPX) is placed at sub-pixel
// precision; a world sprite (px 1) is drawn doubled, exactly over its place in the world layer.
// level >= 0: one light level for the whole sprite (characters); -1: lit per pixel like the world
function ovBlit(sp, wx, wy, level, flash, dissolve, tile, clip = null, rim = null) {
  const fine = sp.px === SPX, k = fine ? 1 : SPX;
  const X0 = fine ? Math.round(wx * SPX) - cam2x - sp.ax : (Math.round(wx - camX) - sp.ax) * SPX - hx;
  const Y0 = fine ? Math.round(wy * SPX) - cam2y - sp.ay : (Math.round(wy - camY) - sp.ay) * SPX - hy;
  const LV0 = level >= 0 ? level * NPAL : -1;
  if (fine && !flash && !dissolve && LV0 >= 0 && !clip) {   // the common case (a character, one light level): a tight loop
    const data = sp.data, w = sp.w, h = sp.h, black = PAL32[BLK], xa = Math.max(0, -X0), xb = Math.min(w, OW - X0);
    // rim light: a body pixel whose neighbor toward the key light is outline or empty is lit
    // brighter (two steps when the light is strong and close, one otherwise)
    let rx = 0, ry = 0, RL = 0, ra = 0, rg = 0, rb = 0, thick = false;
    if (rim) {
      const d = Math.hypot(rim.sx, rim.sy) || 1; rx = Math.round(rim.sx / d * 1.4); ry = Math.round(rim.sy / d * 1.4);
      RL = Math.min((LEVELS - 1) * NPAL, LV0 + NPAL); const k = Math.min(1, rim.w); ra = 70 * k; rg = 42 * k; rb = 8 * k; thick = rim.w > 0.5;   // a warm edge, stronger and 2 px wide close to the light
      if (!rx && !ry) rim = null;
    }
    for (let y = Math.max(0, -Y0), y1 = Math.min(h, OH - Y0); y < y1; y++) {
      const row = (Y0 + y) * OW + X0, s = y * w;
      for (let x = xa; x < xb; x++) {
        const v = data[s + x]; if (!v) continue;
        if (v & EMIS) { ov32[row + x] = PAL32[CYCLE[v & 127]]; continue; }
        if (v === BLK) { ov32[row + x] = black; continue; }
        if (rim) {
          let xx = x + rx, yy = y + ry, nb = xx < 0 || yy < 0 || xx >= w || yy >= h ? 0 : data[yy * w + xx], edge = nb === 0 || nb === BLK;
          if (!edge && thick) { xx += rx; yy += ry; nb = xx < 0 || yy < 0 || xx >= w || yy >= h ? 0 : data[yy * w + xx]; edge = nb === 0 || nb === BLK; }
          if (edge) {
            const c = LCOL[RL + v], r = Math.min(255, (c & 255) + ra), g = Math.min(255, ((c >> 8) & 255) + rg), b = Math.min(255, ((c >> 16) & 255) + rb);
            ov32[row + x] = (255 << 24) | (b << 16) | (g << 8) | r; continue;
          }
        }
        ov32[row + x] = LCOL[LV0 + v];
      }
    }
    return;
  }
  // clip (world px box) -> the sprite's own pixel range
  let xa = 0, xb = sp.w, ya = 0, yb = sp.h;
  if (clip) {
    const sx0 = Math.round(wx) - sp.ax * (fine ? 1 / SPX : 1), sy0 = Math.round(wy) - sp.ay * (fine ? 1 / SPX : 1), u = fine ? SPX : 1;
    xa = Math.max(0, Math.floor((clip[0] - sx0) * u)); xb = Math.min(sp.w, Math.ceil((clip[2] - sx0) * u));
    ya = Math.max(0, Math.floor((clip[1] - sy0) * u)); yb = Math.min(sp.h, Math.ceil((clip[3] - sy0) * u));
  }
  for (let y = ya; y < yb; y++) {
    const yy = Y0 + y * k; if (yy < 0 || yy >= OH) continue;
    for (let x = xa; x < xb; x++) {
      const xx = X0 + x * k; if (xx < 0 || xx >= OW) continue;
      let v = sp.data[y * sp.w + x];
      if (!v) continue;
      if (dissolve > 0 && BAYER[((yy & 3) << 2) | (xx & 3)] < dissolve) continue;
      if (flash && v !== BLK) v = flash === 7 ? FIRE_TINT[v & 127] : flash === 4 ? ICE_TINT[v & 127] : flash === 6 ? ARC_TINT[v & 127] : flash === 5 ? ((xx + yy) & 2 ? ICE_TINT[v & 127] : v) : flash === 2 ? HURT_TINT[v & 127] : flash === 3 ? ((xx + yy) & 2 ? HURT_TINT[v & 127] : v) : (27 | EMIS);
      // a world sprite redrawn over a character is already drawn and lit in the world layer at this
      // very pixel: copy it (cheaper than lighting it again, and identical)
      const c = !flash && LV0 < 0 && (!fine || sp.world2) ? (fine ? frame2[yy * OW + xx] : base32[(Y0 + hy) / SPX * W + y * W + (X0 + hx) / SPX + x]) : (v & EMIS) ? PAL32[CYCLE[v & 127]] : v === BLK ? PAL32[BLK] : LV0 >= 0 ? LCOL[LV0 + v] : envCol((xx + hx) >> 1, (yy + hy) >> 1, v, tile);
      if (!c) continue;
      if (k === 1) ov32[yy * OW + xx] = c;
      else for (let b = 0; b < k && yy + b < OH; b++) for (let a = 0; a < k && xx + a < OW; a++) ov32[(yy + b) * OW + xx + a] = c;
    }
  }
}
// a world-pixel-sized block at detail-layer position (X, Y), lit like the world there
function ovPutAt(X, Y, v) {
  const c = envCol((X + hx) >> 1, (Y + hy) >> 1, v, -2); if (!c) return;
  for (let b = 0; b < SPX; b++) for (let a = 0; a < SPX; a++) { const xx = X + a, yy = Y + b; if (xx >= 0 && yy >= 0 && xx < OW && yy < OH) ov32[yy * OW + xx] = c; }
}
// a world-layer pixel drawn on the detail layer as a block, lit like the world
function ovPut1(x, y, v) {
  const c = envCol(x, y, v, -2); if (!c) return;
  const X = x * SPX - hx, Y = y * SPX - hy;
  for (let b = 0; b < SPX; b++) for (let a = 0; a < SPX; a++) { const xx = X + a, yy = Y + b; if (xx >= 0 && yy >= 0 && xx < OW && yy < OH) ov32[yy * OW + xx] = c; }
}
// magic and rare drops send up a thin flickering beam of their color so they're easy to spot
function drawBeam(x, y, col, tile, seed, legend = false) {
  const sx = Math.round(x - camX), sy = Math.round(y - camY) + 2, hgt = legend ? 48 : 26;
  if (legend) for (let k = 0; k < 4; k++) {   // sparks rising up the legendary beam
    const ph = (G.t * 0.7 + k / 4 + seed * 0.13) % 1, px = sx + Math.round(Math.sin(ph * 9 + k) * 4), py = sy - Math.round(ph * hgt * 1.1);
    if (px >= 0 && py >= 0 && px < W && py < H) { scr[py * W + px] = (ph < 0.5 ? 113 : 51) | EMIS; tbuf[py * W + px] = tile; }
  }
  for (let r = 0; r < hgt; r++) {
    const yy = sy - r; if (yy < 0 || yy >= H || sx < 1 || sx >= W - 1) continue;
    const fadeK = r / hgt, b = BAYER[((yy & 3) << 2) | (sx & 3)];
    if (b < fadeK || (r + Math.floor(G.t * 20 + seed)) % 7 === 0) continue;
    const o = yy * W + sx; scr[o] = col | EMIS; tbuf[o] = tile;
    if (r < hgt * 0.5 && b > fadeK * 2) { scr[o - 1] = col | EMIS; tbuf[o - 1] = tile; }
  }
}
// gems: a cut stone with a glint that turns into gold when picked up
const GEMS = [{ name: 'RUBY', cols: [20, 22, 23], worth: 40 }, { name: 'SAPPHIRE', cols: [38, 39, 40], worth: 50 }, { name: 'EMERALD', cols: [53, 54, 55], worth: 60 }, { name: 'AMETHYST', cols: [57, 58, 59], worth: 80 }];
function drawGem(x, y, tile, gem) {
  const sx = Math.round(x - camX), sy = Math.round(y - camY) - 2, [d, m, l] = gem.cols, glint = Math.floor(G.t * 3 + sx) % 6 === 0;
  for (const [a, b, c] of [[0, -3, BLK], [-1, -2, BLK], [1, -2, BLK], [-2, -1, BLK], [2, -1, BLK], [-2, 0, BLK], [2, 0, BLK], [-1, 1, BLK], [1, 1, BLK], [0, 2, BLK], [0, -2, l], [-1, -1, l], [0, -1, m], [1, -1, m], [-1, 0, m], [0, 0, m], [1, 0, d], [0, 1, d]]) {
    const xx = sx + a, yy = sy + b; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
    const o = yy * W + xx; scr[o] = (glint && a === -1 && b === -1) ? 27 | EMIS : c; zbuf[o] = 3; tbuf[o] = tile; cid[o] = 0;
  }
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
  // on the detail layer, over the characters: blocks the size of a world pixel, placed at the finer position
  const X0 = Math.round(x * SPX) - cam2x, Y0 = Math.round((y - p.z) * SPX) - cam2y;
  const put = (a, b, c) => ovPutAt(X0 + a * SPX, Y0 + b * SPX, c);
  if (p.kind === 'arrow' && p.owner === 'hero' && p.bolt) {   // round 66: Piercing Shot's bolt: thicker and longer the more combo points went into it, glowing, a long streak
    const l = Math.hypot(p.vx, p.vy) || 1, ux = (p.vx - p.vy) / l * 0.707, uy = (p.vx + p.vy) / l * 0.354, ul = Math.hypot(ux, uy), dx = ux / ul, dy = uy / ul, b = p.bolt, L = 12 + b * 3, w = b >= 3 ? 2 : 1;
    const glow = p.fire ? [17, 16] : p.frost ? [27, 118] : b >= 4 ? [27, 51] : [27, 31];
    for (let s = -L - 4 - b * 14; s < -L; s++) { const x = Math.round(X0 + dx * s), y = Math.round(Y0 + dy * s), u = (-L - s) / (4 + b * 14); if (BAYER[((y & 3) << 2) | (x & 3)] < u * 0.9) continue; for (let o = -w; o <= w; o++) ovSet(x, y + o, Math.abs(o) < w || u < 0.3 ? glow[0] : glow[1]); }   // the streak
    for (let s = -L; s <= L * 0.6; s++) { const x = Math.round(X0 + dx * s), y = Math.round(Y0 + dy * s); for (let o = -w - 1; o <= w + 2; o++) ovSet(x, y + o, o === -w - 1 || o === w + 2 ? BLK : o <= 0 ? WOOD[3] : WOOD[1]); }   // the shaft
    for (let s = 0; s <= 5 + b; s++) { const x = Math.round(X0 + dx * (L * 0.6 + s)), y = Math.round(Y0 + dy * (L * 0.6 + s)), hw = Math.max(0, Math.round((5 + b - s) * 0.5)); for (let o = -hw - 1; o <= hw + 1; o++) ovSet(x, y + o, Math.abs(o) > hw ? BLK : o < 0 ? 27 : STEEL[3]); }   // the head
    for (let b2 = -3; b2 <= 3; b2++) for (let a = -3; a <= 3; a++) if (a * a + b2 * b2 <= 9) ovSet(Math.round(X0 + dx * (L * 0.6 + 3)) + a, Math.round(Y0 + dy * (L * 0.6 + 3)) + b2, a * a + b2 * b2 <= 2 ? 27 : glow[1]);   // a glow round the head
    return;
  }
  if (p.kind === 'arrow' && p.owner === 'hero') {   // round 33: the ranger's arrow, at full detail: shaft, steel head, fletching
    const l = Math.hypot(p.vx, p.vy) || 1, ux = (p.vx - p.vy) / l * 0.707, uy = (p.vx + p.vy) / l * 0.354, ul = Math.hypot(ux, uy), dx = ux / ul, dy = uy / ul;
    for (let s = -13; s <= 10; s++) { const x = Math.round(X0 + dx * s), y = Math.round(Y0 + dy * s); ovSet(x, y - 1, BLK); ovSet(x, y + 2, BLK); }   // a dark outline so it reads on any floor
    for (let s = -12; s <= 9; s++) { const x = Math.round(X0 + dx * s), y = Math.round(Y0 + dy * s); ovSet(x, y, s > 6 ? 27 : BONE[2]); ovSet(x, y + 1, s > 6 ? STEEL[3] : WOOD[3]); }
    for (let s = -12; s <= -8; s++) for (const sd of [-1, 1]) { const x = Math.round(X0 + dx * s - dy * sd * (s + 14) * 0.5), y = Math.round(Y0 + dy * s + dx * sd * (s + 14) * 0.5); ovSet(x, y, p.fire ? 16 : p.mark ? 23 : 27); }
    if (p.fire) for (let k = 0; k < 3; k++) ovSet(Math.round(X0 + dx * 10 + (Math.random() - 0.5) * 3), Math.round(Y0 + dy * 10 - Math.random() * 3), 17);
    for (let s = -15; s >= -42; s--) { const x = Math.round(X0 + dx * s), y = Math.round(Y0 + dy * s), u = (-s - 15) / 27; if (BAYER[((y & 3) << 2) | (x & 3)] < u) continue; ovSet(x, y, u < 0.35 ? 27 : p.fire ? 16 : p.quick ? 51 : p.mark ? 22 : 31); }   // round 65: a tracer streak behind it (round 66b: gold for Quickdraw)
    return;
  }
  if (p.kind === 'arrow') {
    const l = Math.hypot(p.vx, p.vy), dx = (p.vx - p.vy) / l * 16 / 22.6, dy = (p.vx + p.vy) / l * 8 / 22.6;
    for (let s = -4; s <= 3; s++) put(Math.round(dx * s * 1.4), Math.round(dy * s * 1.4), s > 2 ? 30 : 25);
    return;
  }
  if (p.kind === 'missile') {   // round 29: an arcane bolt: a fat glowing orb with three sparks circling it,
    // a crackling tail that jitters along the real path behind it, and a white-hot heart
    // round 30 modifiers: seekers are drawn small, the piercing bolt as a lance along its flight, the orb big and slow
    const tr = p.trail || [], sp = (p.spin || 0) + G.t * (p.orb ? 6 : 14), B = p.small ? 0.55 : p.orb ? 1.55 : 1;
    for (let k = 0; k < tr.length; k++) {
      const [fi, fj, z] = tr[k], [x, y] = iso(fi, fj), u = k / tr.length, j = (hash(k, Math.floor(G.t * 24), 7) - 0.5) * 4 * (1 - u);
      const X = Math.round(x * SPX) - cam2x, Y = Math.round((y - z) * SPX + j) - cam2y, w = Math.round(u * (p.lance ? 2.5 : 5.5 * B));
      for (let b = -w; b <= w; b++) for (let a = -w; a <= w; a++) { if (Math.abs(a) + Math.abs(b) > w) continue; if (u < 0.5 && ((X + a + Y + b) & 1)) continue; ovSet(X + a, Y + b, u > 0.8 ? 40 : u > 0.5 ? 39 : u > 0.25 ? 38 : 58); }
    }
    if (p.lance) {   // a bright spear of light pointing the way it flies
      const l = Math.hypot(p.vx, p.vy) || 1, ux = (p.vx - p.vy) / l * 0.707, uy = (p.vx + p.vy) / l * 0.354, ul = Math.hypot(ux, uy), dx = ux / ul, dy = uy / ul;
      for (let s = -16; s <= 6; s++) { const w = s > 0 ? 3 - s * 0.5 : 3 * (1 + s / 16); for (let k = -Math.ceil(w); k <= w; k++) { const x = Math.round(X0 + dx * s - dy * k), y = Math.round(Y0 + dy * s + dx * k), e = Math.abs(k) / Math.max(1, w); ovSet(x, y, e < 0.35 ? 27 : e < 0.7 ? 40 : 39); } }
      return;
    }
    // round 67: a comet: a teardrop head pointing the way it flies, violet at the rim, white-hot in front,
    // with a pulsing glow round it (the orb keeps its round shape)
    const vl = Math.hypot(p.vx, p.vy) || 1, ux = (p.vx - p.vy) / vl * 0.707, uy = (p.vx + p.vy) / vl * 0.354, ul = Math.hypot(ux, uy) || 1, fx = ux / ul, fy = uy / ul;
    const pul = 1 + Math.sin(G.t * 30 + (p.spin || 0)) * 0.08, rx = 9 * B * pul, ry = 7 * B * pul, stretch = p.orb ? 0 : 0.9;
    const RR = Math.ceil(rx * (1 + stretch) + 3);
    for (let b = -RR; b <= RR; b++) for (let a = -RR; a <= RR; a++) {
      const al = a * fx + b * fy, pe = -a * fy + b * fx;   // along / across the flight
      const k = al < 0 ? 1 / (1 + stretch * Math.min(1, -al / rx)) : 1;   // the back drawn out into a tail
      const d = (al * k) * (al * k) / (rx * rx) + pe * pe / (ry * ry) * (al < 0 ? 1 + stretch * Math.min(1.4, -al / rx) : 1);
      if (d > 1.45) continue;
      const x = X0 + a, y = Y0 + b;
      if (d > 1) { if (((x + y + Math.floor(G.t * 20)) & 1) === 0 && d < 1.3) ovSet(x, y, 57); continue; }   // the violet haze round it
      if (d > 0.72 && ((x + y + Math.floor(G.t * 20)) & 1)) { ovSet(x, y, 58); continue; }   // a fizzing violet rim
      const hot = d - Math.max(0, al) / rx * 0.35;   // hotter toward the front
      ovSet(x, y, hot < 0.1 ? 27 : hot < 0.38 ? 40 : hot < 0.72 ? 39 : 38);
    }
    for (let k = 0; k < (p.orb ? 5 : 3); k++) { const a = sp + k * 6.283 / (p.orb ? 5 : 3), x = Math.round(X0 + Math.cos(a) * 13 * B), y = Math.round(Y0 + Math.sin(a) * 6.5 * B); ovSet(x, y, 27); ovSet(x + 1, y, 40); ovSet(x, y + 1, 39); }
    return;
  }
  if (p.kind === 'hfire') {   // the hero's fireball: a flickering ball of flame with a hot core, tail streaming behind
    const l = Math.hypot(p.vx, p.vy) || 1, tx = -(p.vx - p.vy) / l * 0.75, ty = -(p.vx + p.vy) / l * 0.38;
    const B = p.big ? 1.7 : 1;   // the Great Fireball is drawn bigger
    for (let s = 2; s <= 7 * B; s++) { const w = Math.max(0, 3 * B - s * 0.4); for (let k = -Math.round(w); k <= Math.round(w); k++) put(Math.round(tx * s - ty * k * 0.6), Math.round(ty * s + tx * k * 0.6), (s < 4 * B ? 16 : s < 6 * B ? 15 : 14) | EMIS); }
    const R4 = Math.ceil(4 * B);
    for (let b = -R4; b <= R4; b++) for (let a = -R4; a <= R4; a++) {
      const d = Math.hypot(a, b) / B + (hash(a + Math.floor(G.t * 20), b, 9) - 0.5) * 1.6;   // a ragged, flickering edge
      if (d <= 3.9) put(a, b, (d < 1.4 ? 18 : d < 2.4 ? 17 : d < 3.2 ? 16 : 15) | EMIS);
    }
    return;
  }
  const hot = p.kind === 'holy' ? [49, 50, 51] : p.kind === 'frostbolt' ? [116, 117, 118] : [15, 16, 17], R = p.kind === 'hfire' || p.kind === 'frostbolt' ? 3 : 2;   // the hero's fireball is bigger
  for (let b = -R; b <= R; b++) for (let a = -R; a <= R; a++) { const d = (a * a + b * b) / (R * R) * 4; if (d <= 4) put(a, b, (d <= 1 ? (p.kind === 'holy' || p.kind === 'frostbolt' ? 27 : 18) : d <= 2.2 ? hot[2] : hot[1]) | EMIS); }
}

// lighting: static torch maps (scaled by flicker) + dynamic lights (hero, bolts), then fog of war,
// then a light-table lookup per pixel. Environment pixels dither between levels; characters get
// one level each so they never shimmer.
// round 60: the brightest light level a character gets. It was L_ID + 2: the hero's own light kept
// them there in dungeons, and its warm lift turned the purple hat pink, skin yellow, green lime and
// blue grey (by the camp fire the old tables slid them a shade up their ramps instead). The user:
// they look better darker, the shading helps the models; capped at the colors as drawn. Torches
// still give them the warm rim. OPTIONS: HERO LIGHT cycles 3 / 4 / 5 to compare (?charlight=, dcg-charlight)
let CHAR_CAP = L_ID;
try { const q = new URLSearchParams(location.search).get('charlight') || localStorage.getItem('dcg-charlight'); if (q && +q >= 1 && +q < LEVELS) CHAR_CAP = +q; } catch (e) { /* storage blocked */ }
function setCharCap(v) { CHAR_CAP = v; try { localStorage.setItem('dcg-charlight', String(v)); } catch (e) { /* ignore */ } }
function lightPass(chars, kx, ky) {
  const t = G.t;
  cyclePalette(t);
  // outdoors: flat daylight at the identity level (the ramps as drawn), no hero light
  // night outdoors (every third town and forest): dim moonlight, the hero carries a light, and the
  // lanterns, fires and windows matter
  const amb = LV.outdoor ? (LV.night ? 0.3 : 0.6) : VIEW_FOG ? 0 : DLIGHT.amb;
  const nl = DL48 && !LV.outdoor && AO, tone = nl ? TONE : null;   // round 48: the new dungeon light
  const dyn = LV.outdoor && !LV.night ? [] : [{ x: kx, y: ky, z: 34, r: LV.night ? 120 : LV.outdoor ? 145 : DLIGHT.hr * (nl ? 1.2 : 1), i: LV.night ? 0.42 : LV.outdoor ? 0.62 : DLIGHT.hi * (nl ? 1.05 : 1) }];
  for (const p of projectiles) if (p.kind !== 'arrow' && dyn.length < 5) { const [x, y] = iso(p.fi, p.fj); dyn.push({ x, y, z: p.z, r: p.kind === 'missile' ? 45 : 70, i: 0.8 }); }
  if (G.tp) { const [x, y] = iso(G.tp.fi, G.tp.fj); dyn.push({ x, y, z: 20, r: 80, i: 0.7 * Math.min(1, G.tp.t / 0.45) }); }   // the portal's blue glow (brightness only)
  for (const f of G.flashes) if (dyn.length < 7) { const [x, y] = iso(f.fi, f.fj); dyn.push({ x, y, z: 24, r: f.r, i: 1.1 * f.t / f.t0 }); }   // explosions light the room
  const fl = g => 1 + 0.07 * Math.sin(t * 11 + g * 2.3) + 0.05 * Math.sin(t * 23.7 + g * 5.1) + 0.04 * Math.sin(t * 37 + g);
  const f0 = fl(0), f1 = fl(1), A = staticLight[0], B = staticLight[1];
  for (let y = 0; y < H; y++) {
    const wy = camY + y, o0 = y * W;
    if (wy < 0 || wy >= WH) { lbuf.fill(0, o0, o0 + W); continue; }
    const row = wy * WW + camX, xa = Math.max(0, -camX), xb = Math.min(W, WW - camX);   // (round 57: the world's edges worked out once per row)
    for (let x = 0; x < xa; x++) lbuf[o0 + x] = amb;
    for (let x = xa; x < xb; x++) lbuf[o0 + x] = amb + A[row + x] * f0 + B[row + x] * f1;
    for (let x = Math.max(xa, xb); x < W; x++) lbuf[o0 + x] = amb;
  }
  for (const L of dyn) {
    const lx = L.x - camX, ly = L.y - camY, r = L.r, r2 = r * r, li = L.i;
    const X0 = Math.max(0, Math.floor(lx - r) & ~1), X1 = Math.min(W, Math.ceil(lx + r)), Y0 = Math.max(0, Math.floor(ly - r / 2 - ZMAX) & ~1), Y1 = Math.min(H, Math.ceil(ly + r / 2));
    const lp = (x, y, z) => { const dx = x - lx, dy = (y + z - ly) * 2, dz = z - L.z, d2 = dx * dx + dy * dy + dz * dz; if (d2 >= r2) return 0; const f = 1 - d2 / r2; return f * f * li; };
    const lz = L.z, ir2 = 1 / r2;
    for (let y = Y0; y < Y1 - 1; y += 2) {
      const yc = y + 0.5 - ly;
      for (let x = X0; x < X1 - 1; x += 2) {
        const o = y * W + x, o2 = o + W, za = zbuf[o], zb = zbuf[o + 1], zc = zbuf[o2], zd = zbuf[o2 + 1];
        const zmx = za > zb ? (za > zc ? (za > zd ? za : zd) : (zc > zd ? zc : zd)) : (zb > zc ? (zb > zd ? zb : zd) : (zc > zd ? zc : zd));
        const zmn = za < zb ? (za < zc ? (za < zd ? za : zd) : (zc < zd ? zc : zd)) : (zb < zc ? (zb < zd ? zb : zd) : (zc < zd ? zc : zd));
        if (zmx - zmn <= 6) {   // (round 57: the flat-block case inlined, no function call or Math.max/min)
          const z = (za + zb + zc + zd) >> 2, dx = x + 0.5 - lx, dy = (yc + z) * 2, dz = z - lz, d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < r2) { const f = 1 - d2 * ir2, l = f * f * li; lbuf[o] += l; lbuf[o + 1] += l; lbuf[o2] += l; lbuf[o2 + 1] += l; }
        } else { lbuf[o] += lp(x, y, za); lbuf[o + 1] += lp(x + 1, y, zb); lbuf[o2] += lp(x, y + 1, zc); lbuf[o2 + 1] += lp(x + 1, y + 1, zd); }
      }
    }
  }
  const charLevel = chars.map(c => {
    const [x, y] = screenOf(c), sx = Math.round(x - camX), sy = Math.round(y - camY - 16);
    const l = (sx >= 0 && sy >= 0 && sx < W && sy < H) ? lbuf[sy * W + sx] : 0.3;
    const lv = tone ? tone[Math.min(1023, (l * BANDS * 64) | 0)] : l * BANDS;
    return Math.min(CHAR_CAP, Math.max(1, Math.round(lv)));   // capped: torch-side sprites must not blow out (round 60: at the colors as drawn)
  });
  const vis = LV.vis, seen = LV.seen, black = PAL32[BLK], top = (LEVELS - 1) * NPAL;
  const cl = charLevel.map(L => L * NPAL);

  if (!VIEW_FOG) {   // round 57: the usual case, kept lean (no fog reads; the tone curve and AO as one lookup; edges per row)
    const outd = LV.outdoor, TL = LEVELS - 1;
    for (let y = 0, o = 0; y < H; y++) {
      const by = (y & 3) << 2, wy = camY + y, aoRow = nl && wy >= 0 && wy < WH ? wy * WW + camX : -1, xa = Math.max(0, -camX), xb = Math.min(W, WW - camX);
      for (let x = 0; x < W; x++, o++) {
        const v = scr[o];
        if (v === BLK) { levB[o] = 255; out32[o] = black; continue; }
        if (!outd && tbuf[o] < 0) { levB[o] = 255; out32[o] = black; continue; }
        const ci = cid[o];
        if (ci) { levB[o] = 255; out32[o] = (v & EMIS) ? PAL32[CYCLE[v & 127]] : LCOL[cl[ci - 1] + v]; continue; }
        let lr = shd[o] ? lbuf[o] * 0.4 : lbuf[o];
        if (aoRow >= 0 && x >= xa && x < xb) lr *= AO[aoRow + x] * (1 / 255);
        const n = (lr * 320) | 0, l = (nl ? TONE[n < 1023 ? n : 1023] : lr * BANDS) + BAYER[by | (x & 3)];
        const L = (l | 0) < TL ? (l | 0) : TL;
        levB[o] = L;
        out32[o] = (v & EMIS) ? PAL32[CYCLE[v & 127]] : LCOL[L * NPAL + v];
      }
    }
    return charLevel;
  }
  for (let y = 0, o = 0; y < H; y++) {
    const by = (y & 3) << 2, wy = camY + y, aoRow = nl && wy >= 0 && wy < WH ? wy * WW + camX : -1;
    for (let x = 0; x < W; x++, o++) {
      const v = scr[o];
      levB[o] = 255;   // the level this pixel was lit at, for the 2x world layer (255: none, show as is)
      if (v === BLK) { out32[o] = black; continue; }
      const tk = tbuf[o];
      if (tk < 0 ? !LV.outdoor : VIEW_FOG && !seen[tk]) { out32[o] = black; continue; }
      const ci = cid[o];
      const vv = tk < 0 || !VIEW_FOG ? 1 : vis[tk];
      // remembered areas sit at a dim floor level; visible areas get their real light
      let lr = shd[o] ? lbuf[o] * 0.4 : lbuf[o];
      if (tone) { const wx = camX + x; if (aoRow >= 0 && !ci && wx >= 0 && wx < WW) lr *= AO[aoRow + x] * (1 / 255); lr = tone[Math.min(1023, (lr * BANDS * 64) | 0)] / BANDS; }
      const l = lr * BANDS * vv + 0.9 * (1 - vv) + BAYER[by | (x & 3)];
      const L = (l | 0) < LEVELS - 1 ? (l | 0) : LEVELS - 1;
      if (!ci) levB[o] = L;
      if (v & EMIS) { out32[o] = PAL32[CYCLE[v & 127]]; continue; }
      if (ci) { out32[o] = LCOL[cl[ci - 1] + v]; continue; }
      out32[o] = LCOL[L * NPAL + v];
    }
  }
  return charLevel;
}

// ---------------------------------------------------------------- save / load (versioned)
const SAVE_KEY = 'dcg-save', SAVE_V = 1;
// one save per class: the warrior keeps the original key, so older saves still load
const saveKey = cls => cls === 'mage' || cls === 'ranger' ? SAVE_KEY + '-' + cls : SAVE_KEY;
// ---------------------------------------------------------------- town portal (round 25)
// The portal button opens a blue gate beside the hero. Walking into it from a dungeon or forest
// goes to the act's town and leaves a gate there; that one leads back to the same spot, with the
// dead still dead, chests still open, the loot still lying and the map still explored. Free to use.
function usePortal() {
  if (G.mode !== 'play' || hero.dead || G.fadeTo) return;
  if (LV.area === 'town') { say(G.portal ? 'WALK INTO THE PORTAL TO GO BACK' : 'YOU ARE IN TOWN', 26, 1.6); return; }
  if (heroBusy()) return;
  sfx('portal');
  const [fx, fy] = dirVec(hero.dir);
  startCast('portal', 0.5, null, () => openPortalNear(hero.fi + fx * 1.3, hero.fj + fy * 1.3, false));
}
function openPortalNear(fi, fj, back) {
  // the wanted spot, or the nearest open floor around the hero
  let best = null;
  for (let r = 0; r <= 2 && !best; r += 0.5) for (let a = 0; a < 8 && !best; a++) {
    const p = [fi + Math.cos(a * 0.785) * r, fj + Math.sin(a * 0.785) * r];
    if (!blocked(p[0], p[1]) && Math.hypot(p[0] - hero.fi, p[1] - hero.fj) > 0.9) best = p;
  }
  if (!best) best = [hero.fi, hero.fj];
  G.tp = { fi: best[0], fj: best[1], t: 0, back, armed: Math.hypot(best[0] - hero.fi, best[1] - hero.fj) > 0.7 };
}
function updatePortal(dt) {
  const P = G.tp; if (!P) return;
  P.t += dt;
  const d = Math.hypot(P.fi - hero.fi, P.fj - hero.fj);
  if (d > 0.9) P.armed = true;   // one has to step away before the gate will take you
  if (G.fadeTo || !P.armed || P.t < 0.5 || d > 0.5) return;
  sfx('portal');
  if (!P.back) {
    // remember this level as it stands, then go to town
    G.portal = { level: LV.level, seed: LV.seed, side: LV.side, sideBack: G.sideBack, fi: P.fi, fj: P.fj, snap: {
      enemies, boss, groundItems, seen: LV.seen.slice(), props: dynProps.map(p => ({ open: p.open, broken: p.broken, hp: p.hp, hatch: p.hatch })) } };
    const T = G.town && G.town.level === LV.level - ((LV.level - 1) % AREA_CYCLE) ? G.town : { level: LV.level - ((LV.level - 1) % AREA_CYCLE), seed: (LV.seed ^ 0x70a1) >>> 0 };
    G.fadeTo = () => { startLevel(T.level, T.seed); saveGame(); };
  } else {
    const R = G.portal;
    G.fadeTo = () => {
      startLevel(R.level, R.seed, R.side || null); if (R.side) G.sideBack = R.sideBack;
      const S = R.snap;
      if (S) {   // (a save loaded in town has no snapshot: the level comes back fresh)
        enemies = S.enemies; boss = S.boss; groundItems = S.groundItems; LV.seen.set(S.seen);
        S.props.forEach((q, n) => { if (dynProps[n]) Object.assign(dynProps[n], q); });
      }
      hero.fi = R.fi; hero.fj = R.fj; G.portal = null;
      updateFov(hero.fi, hero.fj); say('BACK THROUGH THE PORTAL', 39, 2); saveGame();
    };
  }
}
// the gate: an upright oval of swirling blue on the detail layer, opening from a slit
function drawPortal() {
  const P = G.tp; if (!P) return;
  const [x, y] = iso(P.fi, P.fj), open = Math.min(1, P.t / 0.45), t = G.t;
  const X0 = Math.round(x * SPX - cam2x), Y0 = Math.round(y * SPX - cam2y);
  const rx = 16 * (0.35 + 0.65 * open), ry = 29 * open, cy = Y0 - 4 - ry;
  if (ry < 1) return;
  const put = (X, Y, v) => { if (X >= 0 && Y >= 0 && X < OW && Y < OH) ov32[Y * OW + X] = PAL32[v]; };
  for (let Y = Math.floor(cy - ry - 2); Y <= cy + ry + 2; Y++) for (let X = Math.floor(X0 - rx - 2); X <= X0 + rx + 2; X++) {
    const u = (X - X0) / rx, v = (Y - cy) / ry, d = Math.sqrt(u * u + v * v);
    if (d > 1.08) continue;
    if (d > 0.9) { put(X, Y, d > 1.0 ? BLUE[1] : BLUE[4]); continue; }   // a bright rim, a dark edge
    const a = Math.atan2(v, u), sw = Math.sin(a * 3 + d * 9 - t * 7) * 0.5 + 0.5, dz = BAYER[((Y & 3) << 2) | (X & 3)];
    const lvl = (1 - d) * 1.6 + sw * 1.2 + dz * 0.8;   // a bright core, swirling arms
    put(X, Y, lvl > 2.5 ? 27 : BLUE[clamp(Math.floor(lvl * 1.4), 0, BLUE.length - 1)]);
  }
  // motes drifting up off the gate
  for (let k = 0; k < 6; k++) {
    const ph = (t * 0.6 + k / 6) % 1, mx = Math.round(X0 + Math.sin(k * 2.4 + t * 2) * rx * 0.9), my = Math.round(cy + ry * 0.8 - ph * ry * 2.4);
    put(mx, my, ph < 0.5 ? BLUE[4] : BLUE[3]);
  }
}
function saveGame() {
  if (G.mode !== 'play' || hero.dead || PREVIEW) return;   // (the skill preview's copy of the game never saves)
  const data = { v: SAVE_V, level: LV.level, seed: LV.seed, hero: { cls: hero.cls, hp: Math.ceil(hero.hp), mana: Math.ceil(hero.mana), gold: hero.gold, xp: hero.xp, lvl: hero.lvl, potions: hero.potions, team: hero.team, equip: hero.equip, bag: hero.bag, mods: hero.mods || {}, ult: Math.floor(hero.ult || 0), modSeen: hero.modSeen || 0, tut: hero.tut || {}, stats: hero.stats || null }, serial: itemSerial,
    story: G.story || null, gates: G.gates || null, town: G.town || null, portal: G.portal ? { level: G.portal.level, seed: G.portal.seed, fi: G.portal.fi, fj: G.portal.fj } : null };
  try { localStorage.setItem(saveKey(hero.cls), JSON.stringify(data)); } catch (e) { /* storage can be unavailable; the game still runs */ }
}
function loadSave(cls = 'warrior') {
  try {
    const raw = localStorage.getItem(saveKey(cls)); if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || d.v !== SAVE_V || !d.hero) return null;
    return d;
  } catch (e) { return null; }
}
function newHero(cls = 'warrior') {
  Object.assign(hero, { cls, hp: 40, mana: 20, gold: 0, xp: 0, lvl: 1, potions: 3, team: 'red', dead: 0, bag: [], mods: {}, ult: 0, modSeen: 0, tut: {}, stats: { t: 0, deaths: 0, kills: 0 }, equip: { weapon: null, helm: null, chest: null, shield: null, ring: null, amulet: null } });
  const R = rng(5);
  const kit = cls === 'mage' ? ['oak_staff', 'apprentice_robe', 'wizard_hat'] : cls === 'ranger' ? ['hunting_bow', 'leather_jerkin', 'ranger_hood', 'quiver'] : ['short_sword', 'tunic'];
  for (const b of kit) { const it = rollItem(R, 1, b); it.rarity = 'normal'; it.mods = {}; hero.equip[ITEM_BASES[b].slot] = it; }
  setSkillsFor(cls);
  recalcHero(); hero.hp = STAT.maxHp; hero.mana = STAT.maxMana;
}
function beginGame(fromSave, cls = 'warrior') {
  const d = fromSave ? loadSave(cls) : null;
  if (d) {
    newHero(cls); Object.assign(hero, d.hero); hero.cls = cls; itemSerial = d.serial || 100; recalcHero();
    G.mode = 'play'; G.town = d.town || null; G.portal = d.portal || null; G.gates = d.gates || null; G.story = d.story || convertQuests(d.quests, d.gates); G.sideBack = null; G.sideDown = null; startLevel(d.level, d.seed);
  } else {
    G.town = null; G.portal = null; G.story = null; G.gates = null; G.sideBack = null;
    newHero(cls); G.mode = 'play'; startLevel(1, (Math.random() * 1e9) >>> 0);
  }
}
function respawn() {
  if (hero.stats) hero.stats.deaths++;
  hero.dead = 0; hero.clip = 'idle'; recalcHero(); hero.hp = STAT.maxHp; hero.mana = STAT.maxMana;
  hero.gold = Math.floor(hero.gold * 0.9);
  G.msg = []; say('YOU RISE AGAIN', 26, 2);
  startLevel(LV.level, LV.seed);
  saveGame();
}
