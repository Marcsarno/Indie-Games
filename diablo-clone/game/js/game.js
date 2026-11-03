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
let scr, zbuf, shd, cid, lbuf, tbuf, out32, outImg, base32, OW, OH, ov32, ovImg, hud32, hudImg;
const cvs = document.getElementById('c');
const ctx = cvs.getContext('2d');
function allocBuffers(w, h) {
  W = w; H = h; OW = W * SPX; OH = H * SPX;
  cvs.width = OW; cvs.height = OH;
  scr = new Uint8Array(W * H); zbuf = new Uint8Array(W * H); shd = new Uint8Array(W * H); cid = new Uint8Array(W * H);
  lbuf = new Float32Array(W * H); tbuf = new Int16Array(W * H);
  base32 = out32 = new Uint32Array(W * H); hud32 = new Uint32Array(W * H);
  ovImg = ctx.createImageData(OW, OH); ov32 = new Uint32Array(ovImg.data.buffer);
  if (typeof uiResize === 'function') uiResize();
}
let camX = 0, camY = 0, cam2x = 0, cam2y = 0, hx = 0, hy = 0;
const params = new URLSearchParams(location.search);
const SHAKE = params.get('shake') !== '0';

// ---------------------------------------------------------------- state
const G = { t: 0, mode: 'title', paused: false, trauma: 0, fade: 0, fadeTo: null, msg: [], saveT: 0, kills: 0, meteors: [], flashes: [], blasts: [], cones: [], ghosts: [], sparks: [], rings: [], walls: [], quakes: [], hooks: [], waves: [], impacts: [], frost: [] };
const hero = {
  fam: 'hero', fi: 0, fj: 0, dir: 1, clip: 'idle', clock: 0, walk: 0, runT: 0, goT: 0, stopT: 0, atk: -1, combo: 0, swingEnd: -9, hitDone: false, stop: 0, flash: 0,
  hp: 40, mana: 20, gold: 0, xp: 0, lvl: 1, potions: 3, team: 'red', dead: 0, hurtT: 0, cast: -1,
  equip: { weapon: null, helm: null, chest: null, shield: null }, bag: [],
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
  const w = it('weapon');
  const base = w ? w.dmg : [1, 3];
  const pct = 1 + (mods.dmgPct || 0) / 100 + hero.lvl * 0.03;
  STAT.dmg = [Math.round((base[0] + (mods.dmgFlat || 0)) * pct), Math.round((base[1] + (mods.dmgFlat || 0)) * pct)];
  STAT.armor = ['helm', 'chest', 'shield'].reduce((a, s) => a + (it(s)?.armor || 0), 0) + (mods.armorFlat || 0);
  STAT.block = it('shield')?.block || 0;
  // the mage trades life for a deep pool of mana that refills fast (spells are its only attack)
  const mage = hero.cls === 'mage';
  STAT.maxHp = (mage ? 32 : 40) + (hero.lvl - 1) * (mage ? 7 : 9) + (mods.hp || 0);
  STAT.maxMana = (mage ? 45 : 20) + (hero.lvl - 1) * (mage ? 7 : 4) + (mods.mana || 0);
  STAT.manaRegen = mage ? 4 + hero.lvl * 0.25 : 1.2;
  STAT.leech = mods.leech || 0;
  STAT.crit = mods.crit || 0; STAT.thorns = mods.thorns || 0; STAT.atkSpeed = mods.atkSpeed || 0; STAT.regen = mods.regen || 0; STAT.fireburst = mods.fireburst || 0;
  STAT.speed = 4.2 * (1 + (mods.speed || 0) / 100);
  STAT.slow = !!w?.slow;
  // legendaries change how their piece looks (glowing ember blade, oak-leaf crown, ...)
  const lgd = ['weapon', 'helm', 'chest', 'shield'].map(s => e[s] && e[s].rarity === 'legend' ? (e[s].fx || (LEGENDARIES.find(L => L.name === e[s].name) || {}).fx) : null).filter(Boolean).join('|');
  hero.look = { team: hero.team, helm: it('helm')?.look || 'none', chest: it('chest')?.look || 'tunic', weapon: w?.look || (mage ? 'staff' : 'sword'), shield: it('shield')?.look || 'none', lgd };
  hero.hp = Math.min(hero.hp, STAT.maxHp); hero.mana = Math.min(hero.mana, STAT.maxMana);
}
const xpFor = l => Math.round(60 * Math.pow(l, 1.6));
function say(text, col = 26, t = 2.5) { G.msg.push({ text, col, t }); if (G.msg.length > 3) G.msg.shift(); }

// ---------------------------------------------------------------- level setup
function startLevel(level, seed, side = null) {
  genLevel(level, seed, side);
  buildWorld();
  hero.fi = LV.start.cx + 0.5; hero.fj = LV.start.cy + 0.5; hero.atk = -1; hero.clip = 'idle'; hero.dead = 0;
  enemies = LV.spawns.map((s, n) => makeEnemy(s.id, s.fi, s.fj, n));
  { const R = rng(seed ^ 0x5bd1);   // dungeon floors plan their champions (placeSpawns); other areas roll them per monster
    if (LV.champsPlanned) LV.spawns.forEach((sp, n) => { if (sp.champ) makeChampion(enemies[n], R); });
    else for (const e of enemies) if (!e.def.unique && R() < champChance(LV.diff)) makeChampion(e, R); }
  makeNpcs(); resetSkills(); setupBoss();
  groundItems = []; projectiles = []; floaters = []; pclear(); G.meteors = []; G.flashes = []; G.blasts = []; G.cones = []; G.ghosts = []; G.sparks = []; G.rings = []; G.walls = []; G.quakes = []; G.hooks = []; G.waves = []; G.impacts = []; G.frost = []; hero.chillT = 0; hero.leap = null; hero.leapZ = 0;
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
function makeEnemy(id, fi, fj, n) {
  const m = MONSTERS[id], lv = LV.diff;
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
  if (hero.cls === 'mage') for (let d = 0; d < 8; d++) for (let f = 0; f < 6; f++) warmQueue.push(['hero', hero.look, d, 'channel', f]);
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
function tryMove(e, dfi, dfj, r = 0.28) {
  const ok = (ni, nj) => !(blocked(ni - r, nj - r) || blocked(ni + r, nj - r) || blocked(ni - r, nj + r) || blocked(ni + r, nj + r));
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
    const tr = LV.outdoor && nearTrader();
    if (tr) { if (G.t > (hero.tradeT || 0)) { hero.tradeT = G.t + 0.6; trade(tr); } return; }
    if (heroBusy()) { hero.buf = G.t + 0.3; return; }
    hero.buf = 0; castMissiles(); return;
  }
  if (heroBusy() && !canChain()) { if (!FEEL_OLD) hero.buf = G.t + 0.45; return; }   // a tap mid-swing is kept until the swing can chain (a heavy one takes longest)
  hero.buf = 0;
  if (hero.atk >= 0) hero.swingEnd = G.t;   // chained: the combo carries on
  // beside a trader in town, a tap trades instead of swinging
  const tr = LV.outdoor && nearTrader();
  if (tr) { if (G.t > (hero.tradeT || 0)) { hero.tradeT = G.t + 0.6; trade(tr); } return; }
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
const heroReach = () => ({ sword: 1.45, greatsword: 1.75, flail: 1.5 })[hero.look.weapon] || 1.35;
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
  hero.potions--; hero.hp = Math.min(STAT.maxHp, hero.hp + 30 + hero.lvl * 3); sfx('potion');
  const [x, y] = screenOf(hero); burst(4, x, y, 20, 10, 30, 22);
}
// pow: 0 = light blow (sword swings, spells), 1 = heavy (two-handers), 2 = combo finisher
const HITSTOP = [0.045, 0.08, 0.11], KNOCK = [5, 7.7, 11];   // knock speed: tiles/s, ~1/14 of it is the slide
function damageEnemy(e, dmg, fromFi, fromFj, crit = false, pow = 0, ranged = false) {
  if (e.frozen > 0) dmg = Math.round(dmg * 1.4);   // frozen solid: hits land harder
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
  if (e.windT > 0 && (pow >= 1 || dmg >= e.maxHp * 0.18)) e.windT = 0;   // a big hit stops a charge before it starts
  if (pow === 2 && e.look.shield === true) e.guardT = G.t + 2.2;   // a finisher knocks the shield aside
  e.hp -= dmg; e.flash = FEEL_OLD ? (crit ? 0.09 : 0.05) : (crit ? 0.1 : 0.065); if (!FEEL_OLD) e.tint = 0.08;
  if (crit) floater(dmg + '!', e.fi, e.fj, e.def.chest + 18, 51, 2); else floater(String(dmg), e.fi, e.fj, e.def.chest + 14, 27);
  if (STAT.leech) hero.hp = Math.min(STAT.maxHp, hero.hp + Math.max(1, Math.round(dmg * STAT.leech / 100)));
  const [ex, ey] = screenOf(e), d = Math.hypot(e.fi - fromFi, e.fj - fromFj) || 1;
  const bony = e.fam === 'skeleton', ichor = e.fam === 'spider' ? 54 : 22;   // spiders bleed green
  burst(bony ? 5 : 1, ex, ey, e.def.chest, bony ? 8 : 12, 50, bony ? 25 : ichor, (e.fi - fromFi - (e.fj - fromFj)) / d * 20);
  burst(2, ex, ey, e.def.chest, crit ? 16 : 6, crit ? 120 : 70, crit ? 18 : 17);
  if (crit) { sfx('crit'); if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.2); }
  if (e.state === 'sleep') wake(e);
  if (e.hp <= 0) {
    e.dying = 0; e.atk = -1; e.clip = 'death'; e.tint = 0;
    if (FEEL_OLD) { e.stop = crit ? 0.2 : 0.15; hero.stop = Math.max(hero.stop, e.stop); }
    else { e.stop = crit ? 0.15 : 0.12; hero.stop = Math.max(hero.stop, e.stop * 0.65); }
    if (e.frozen > 0) { const [x, y] = screenOf(e); burst(5, x, y, e.def.chest, 18, 90, 118); burst(2, x, y, e.def.chest, 10, 80, 117); e.frozen = 0; }   // shatters
    if (ranged) hero.stop = heroStop;   // spells and arrows never freeze the caster
    if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.5);
    sfx('kill');
    if (bony) shatter(e, fromFi, fromFj);   // skeletons burst apart into a heap of bones
    else stampBlood(Math.round(ex), Math.round(ey), e.def.unique ? 6 : 3, (Math.random() * 1e6) | 0, e.fam === 'spider' ? GREEN : RED);
    const streak = killStreak();
    questKill(e.id);
    gainXp(e.def.xp * (1 + (LV.diff - 1) * 0.3) * (e.champ ? 3 : 1) * (1 + Math.max(0, streak - 2) * 0.1));
    dropLoot(e.fi, e.fj, e.def.unique ? 4 : e.champ || e.def.elite ? 3 : 1, e.def.unique || !!e.champ || !!e.def.elite);
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
    if (e === boss) { say(`THE ${e.def.name} IS SLAIN`, 51, 4); say('THE WAY DOWN IS OPEN', 26, 4); sfx('levelUp'); G.slowmo = 0.9; G.bossIntro = 0; }
    G.kills++;
  } else {
    sfx('hit');
    if (FEEL_OLD) {
      e.stop = crit ? 0.11 : 0.07; hero.stop = Math.max(hero.stop, e.stop);
      e.kb = [(e.fi - fromFi) / d * 3, (e.fj - fromFj) / d * 3];
      if (dmg >= e.maxHp * 0.18 && !e.def.unique) { e.atk = -1; e.hurt = 0.18; }
    } else {
      // the freeze scales with the blow; the hero's is shorter than the target's, so control stays snappy
      e.stop = HITSTOP[pow] + (crit ? 0.03 : 0); hero.stop = Math.max(hero.stop, e.stop * 0.6);
      // every hit shoves: heavier blows further, bosses barely, elites and champions half
      const mass = e.def.unique ? 0.15 : e.def.elite || e.champ ? 0.5 : 1, v = KNOCK[pow] * mass * (crit ? 1.25 : 1);
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
function shatter(e, fromFi, fromFj) {
  const [x, y] = screenOf(e), d = Math.hypot(e.fi - fromFi, e.fj - fromFj) || 1, dx = (e.fi - fromFi - (e.fj - fromFj)) / d * 40;
  burst(5, x, y, e.def.chest, 22, 90, e.look.bone === M.OLDBONE ? 25 : 26, dx);
  for (let k = 0; k < 9; k++) { const a = Math.random() * 6.283, s = 40 + Math.random() * 60; pspawn(6, x, y, 10 + Math.random() * 20, Math.cos(a) * s + dx, Math.sin(a) * s * 0.5, 50 + Math.random() * 60, 3, 26); }
  blitWorld(PROPS.bones(Math.floor(Math.random() * 6)), x, y, 0, -1, true);
  e.corpse = true;   // no tipping corpse: the bones are on the floor now
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
function wake(e) { if (e.state !== 'sleep') return; e.state = 'hunt'; for (const o of enemies) if (o.state === 'sleep' && Math.hypot(o.fi - e.fi, o.fj - e.fj) < 4) o.state = 'hunt'; }
// all = the heavy slam: hits everything in reach around the hero, not just in front
function heroHitResolve(all = false, pow = 0) {
  const [fx, fy] = dirVec(hero.dir), reach = heroReach() + 0.1;
  let any = false, nHit = 0;
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
  if (nHit && hero.cls !== 'mage') hero.mana = Math.min(STAT.maxMana, hero.mana + Math.min(3, nHit) * 1.5);
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
const GREY_KEEP = 0.25;   // share of rolled grey items that actually drop
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
  if (g.gem) { const v = Math.round(g.gem.worth * (1 + LV.diff * 0.25)); hero.gold += v; sfx('gold'); floater(`${g.gem.name} +${v}`, g.fi, g.fj, 12, g.gem.cols[2]); return true; }
  if (g.gold) { sfx('gold'); hero.gold += g.gold; floater(g.gold + ' GOLD', g.fi, g.fj, 10, 50); return true; }
  const b = ITEM_BASES[g.item.base];
  if (b.mana) { hero.mana = Math.min(STAT.maxMana, hero.mana + b.mana); sfx('potion'); floater('+' + b.mana + ' MANA', g.fi, g.fj, 12, 39); const [x, y] = screenOf(hero); burst(4, x, y, 20, 10, 30, 40); return true; }
  if (b.slot === 'potion') { if (hero.potions >= 8) return false; hero.potions++; sfx('pickup'); say('HEALING POTION', 22, 1.2); return true; }
  if (hero.bag.length >= BAG_SIZE) { if (!g.warned) say('YOUR BAG IS FULL', 22, 1.5); g.warned = true; return false; }
  hero.bag.push(g.item); say((g.item.rarity === 'legend' ? 'LEGENDARY: ' : g.item.rarity === 'set' ? 'SET ITEM: ' : '') + itemName(g.item), RARITY_COL[g.item.rarity], g.item.rarity === 'legend' ? 3.5 : 2); sfx(g.item.rarity === 'legend' ? 'levelUp' : 'pickup');
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
function prewarmHero() { for (let d = 0; d < 8; d++) { warmQueue.unshift([ 'hero', hero.look, d, 'idle', 0]); if (hero.cls === 'mage') for (let f = 0; f < 6; f++) warmQueue.push(['hero', hero.look, d, 'channel', f]); for (let f = 0; f < 8; f++) warmQueue.push(['hero', hero.look, d, 'walk', f]); warmQueue.push(['hero', hero.look, d, 'go', 0], ['hero', hero.look, d, 'stop', 0]); } }

// ---------------------------------------------------------------- update
const input = { mx: 0, my: 0, attack: false, keys: new Set() };
function update(dt) {
  // a boss's death plays in slow motion for a moment
  if (G.slowmo > 0) { G.slowmo -= dt; dt *= 0.35; }
  if (G.bossIntro > 0) G.bossIntro -= dt;
  if (G.actCard > 0) G.actCard -= dt;
  if (STAT.regen && !hero.dead && G.mode === 'play') hero.hp = Math.min(STAT.maxHp, hero.hp + STAT.regen * dt);
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
  if (boss && !boss.introduced && boss.state !== 'sleep' && alive(boss)) { boss.introduced = true; G.bossIntro = 2.8; sfx('cry'); }   // the title card
  updateNpcs(dt); updateShrines();
  for (const g of groundItems) if (g.item && g.item.rarity === 'legend' && !g.announced) { g.announced = true; say('A LEGENDARY ITEM HAS FALLEN', 112, 3); sfx('levelUp'); }   // never miss one
  if (hero.frenzy > 0) hero.frenzy -= dt; if (hero.stoneskin > 0) hero.stoneskin -= dt;
  separate();
  updateProjectiles(dt); updateMeteors(dt); updateLichFx(dt); updateWarriorFx(dt); updateImpactFx(dt);
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
  if (hero.leap) { if (hero.stop > 0) { hero.stop -= dt; return; } hero.clock += dt; updateLeap(dt); return; }   // in the air
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
    const [gi, gj, m] = stickToGround(vx, vy), sp = STAT.speed * m * (hero.chillT > 0 ? 0.6 : 1) * (hero.whirl > 0 ? 0.6 : 1) * Math.min(1, l) * ramp * dt;
    const f0 = hero.fi, j0 = hero.fj;
    tryMove(hero, gi * sp, gj * sp);
    const moved = Math.hypot(hero.fi - f0, hero.fj - j0);
    // from a standstill: one push-off pose, then the cycle starts on the left foot's plant
    if (hero.runT === 0) { hero.walk = 0; hero.goT = 0.08; }
    hero.runT += dt; hero.stopT = 0;
    hero.walk += moved / m / (robed(hero.look) ? MAGE_STEP : HERO_STEP);   // legs follow the ground speed (without the up/down boost), a bit slower than an exact foot plant
    // turn through the in-between facings instead of snapping (a reversal takes ~0.1 s)
    // from a standstill he faces the new way at once
    const want = dirFrom(gi, gj);
    if (hero.runT <= dt) hero.dir = want;
    else if (want !== hero.dir && (hero.turnT = (hero.turnT || 0) - dt) <= 0) { hero.dir = (hero.dir + (((want - hero.dir + 8) % 8) <= 4 ? 1 : 7)) % 8; hero.turnT = 0.028; }
    hero.clip = hero.goT > 0 ? 'go' : 'walk'; hero.goT -= dt;
  } else {
    // stopping after a real run plants the front foot for a beat before standing
    if (hero.runT > 0.25 && !busy) hero.stopT = 0.11;
    hero.runT = 0;
    if (!busy) hero.clip = hero.hurtT > 0 ? 'hit' : hero.stopT > 0 ? 'stop' : 'idle';
    hero.stopT -= dt;
  }
  if (hero.whirl > 0) { hero.clip = 'attack'; hero.dir = Math.floor(G.t / 0.05) % 8; }   // spin through all 8 facings
  if (hero.dash > 0) hero.clip = 'bash';
  if (hero.stop > 0) { hero.stop -= dt; return; }
  hero.clock += dt;
  if (hero.cast >= 0) {
    hero.cast -= dt; hero.castAge = (hero.castAge || 0) + dt; hero.clip = 'channel';
    if (hero.castFn && hero.castAge >= CAST_RELEASE) { const f = hero.castFn; hero.castFn = null; f(); }   // the spell leaves on the release frame
    if (hero.cast < 0) { hero.cast = -1; hero.clip = 'idle'; }
  }
  if (hero.atk >= 0) {
    hero.clip = ATTACK_CLIPS[hero.combo] || 'attack';
    hero.atk += dt * 1000 * (1 + ((STAT.atkSpeed || 0) + (hero.frenzy > 0 ? 50 : 0)) / 100);
    const sw = weaponSwing(hero.look, hero.combo), ki = swingKey(sw, hero.atk);
    if (ki >= 0 && sw[ki].mv) lungeHero(sw[ki].mv * dt * 1000 / sw[ki].ms);
    if (!hero.hitDone && hero.mag > 0) { const st = Math.min(hero.mag, dt * 4.5); lungeHero(st); hero.mag -= st; }
    if (ki >= 0 && sw[ki].hit && !hero.hitDone) {
      hero.hitDone = true; if (hero.combo === 3) groundSlamHit(); else heroHitResolve(!!sw[ki].slam, hero.combo === 2 ? 2 : STAT.slow ? 1 : 0);
      if (sw[ki].slam) {   // the ground slam: extra shake and a ring of dust
        if (SHAKE) G.trauma = Math.min(1, G.trauma + 0.35);
        const [x, y] = screenOf(hero), [fx, fy] = dirVec(hero.dir), cx = x + (fx - fy) * 12, cy = y + (fx + fy) * 6;
        const dust = LV.outdoor ? DIRT[3] : S[5];
        for (let k = 0; k < 22; k++) { const a = k / 22 * 6.283; pspawn(5, cx, cy, 1, Math.cos(a) * 55, Math.sin(a) * 27, 40 + Math.random() * 30, 1, k % 3 ? dust : DIRT[4]); }
        sfx('crit');
      }
    }
    if (ki < 0) { hero.atk = -1; hero.clip = 'idle'; hero.swingEnd = G.t; if (hero.castQueued) heroCast(); }
  }
  // pick up what we walk over; open chests by walking into them
  for (let n = groundItems.length - 1; n >= 0; n--) {
    const g = groundItems[n];
    if (g.t > 0.4 && Math.hypot(g.fi - hero.fi, g.fj - hero.fj) < 0.55 && pickup(g)) groundItems.splice(n, 1);
  }
  for (const p of dynProps) if (p.kind === 'chest' && !p.open && Math.hypot(p.i + 0.5 - hero.fi, p.j + 0.5 - hero.fj) < 1.15) openChest(p);
  // stairs
  const s = LV.stairs;
  if (!G.fadeTo && Math.hypot(s.i + 0.5 - hero.fi, s.j + 0.5 - hero.fj) < 0.55 && bossAlive()) {
    if (!(G.sealT > 0)) { say(`THE ${boss.def.name} GUARDS THE WAY DOWN`, 22, 2); G.sealT = 3; }
  } else if (LV.side) {   // a side area's stairs lead back up to the hub (once the hero has stepped off them)
    const d = Math.hypot(s.i + 0.5 - hero.fi, s.j + 0.5 - hero.fj);
    if (d > 1.2) G.upArmed = true;
    if (!G.fadeTo && G.upArmed && d < 0.55) { G.upArmed = false; leaveSide(); }
  } else if (!G.fadeTo && Math.hypot(s.i + 0.5 - hero.fi, s.j + 0.5 - hero.fj) < 0.55) {
    sfx('stairs');
    // the hub's mine leads straight to the first floor; Act I's boss hall leads home to the hub,
    // where the south gate now stands open (round 26)
    const A = areaOf(LV.level);
    if (A.arena && A.act === 0) { G.gates = G.gates || {}; G.gates[A.cyc] = true; const home = LV.level - 4; G.fadeTo = () => { G.portal = null; startLevel(home, (LV.seed * 31 + 17) >>> 0); say('THE ROAD SOUTH IS OPEN', 51, 4); saveGame(); }; }
    else G.fadeTo = () => { G.portal = null; startLevel(LV.level + (LV.hub ? 2 : 1), (LV.seed * 31 + 17) >>> 0); saveGame(); };
  }
  G.sealT = (G.sealT || 0) - dt;
  updatePortal(dt); updateSideDoors();
  if (LV.hub && LV.gateOpen && !G.fadeTo && Math.hypot(Math.floor(HUB.gate[0]) + 1.5 - hero.fi, Math.floor(HUB.gate[1]) + 1.5 - hero.fj) < 0.6) {   // through the open gate: on to the next act
    sfx('stairs'); G.fadeTo = () => { G.portal = null; startLevel(LV.level + AREA_CYCLE, (LV.seed * 31 + 17) >>> 0); saveGame(); };
  }
  hatchEggs(dt);
  updateFov(hero.fi, hero.fj);
}
function updateEnemy(e, dt) {
  if (e.dying >= 0) {
    e.flash = Math.max(0, e.flash - dt);   // the kill flash is brief; the death animation shows after it
    if (e.stop > 0) { e.stop -= dt; return; }
    e.dying += dt;
    if (e.dying >= 0.6 && !e.corpse) {   // the last death frame becomes part of the floor
      e.corpse = true;
      const [x, y] = screenOf(e);
      blitWorld(getSprite(e.fam, e.look, e.dir, 'death', 5, e, 1), x, y, 0, -1, true);
    }
    return;
  }
  e.flash = Math.max(0, e.flash - dt); if (e.tint > 0 && e.flash <= 0) e.tint -= dt;
  if (e.stop > 0) { e.stop -= dt; return; }
  e.clock += dt; e.cool -= dt;
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
  const m = e.def, dx = hero.fi - e.fi, dy = hero.fj - e.fj, d = Math.hypot(dx, dy);
  if (e === boss && e.state !== 'sleep' && !hero.dead && updateBoss(e, dt * (e.slowT > 0 ? 0.6 : 1), d, dx, dy)) return;   // slowed bosses wind up their specials slower too
  if (e.state === 'sleep') {
    e.clip = 'idle';
    if (!hero.dead && d < 7 && los(e.fi, e.fj, hero.fi, hero.fj)) wake(e);
    return;
  }
  const atkClip = m.ranged === 'arrow' ? 'shoot' : m.ranged ? 'cast' : 'attack';
  if (e.atk >= 0) {
    e.clip = atkClip; e.atk += dt * 1000 * (e.slowT > 0 ? 0.55 : 1);
    const sw = FAMILIES[e.fam].swing(e), ki = swingKey(sw, e.atk);
    if (ki >= 0 && sw[ki].hit && !e.hitDone) {
      e.hitDone = true;
      if (m.ranged) {
        const l = d || 1, sp = m.ranged === 'arrow' ? 9 : 5.5;
        sfx(m.ranged === 'arrow' ? 'arrow' : m.ranged === 'frostbolt' ? 'frost' : 'fireball');
        projectiles.push({ kind: m.ranged, fi: e.fi + dx / l * 0.5, fj: e.fj + dy / l * 0.5, vx: dx / l * sp, vy: dy / l * sp, z: m.ranged === 'arrow' ? 18 : 14, life: 2, owner: 'enemy', dmg: e.dmg });
      } else if (!hero.dead && d < m.reach + 0.35) hurtHero(roll(e.dmg), e);
    }
    if (ki < 0) { e.atk = -1; e.cool = m.ranged ? 1.4 + Math.random() : 0.5 + Math.random() * 0.5; e.clip = 'idle'; }
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
      const sd = Math.sin(G.t * 1.3 + e.seed * 7) > 0 ? 1 : -1, sp = m.speed / 16 * 0.55 * (e.slowT > 0 ? 0.5 : 1) * dt, f0 = e.fi, j0 = e.fj;
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
  if (!m.ranged && !fleeing && d < m.reach && !circling) {
    e.dir = dirFrom(dx, dy); e.clip = 'idle';
    if (e.cool <= 0) { e.atk = 0; e.hitDone = false; }
    return;
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
  const l = Math.hypot(mv[0], mv[1]) || 1, sp = m.speed / 16 * 1.2 * (e.speedK || 1) * (e.slowT > 0 ? 0.5 : 1) * dt;   // cone of cold slows to half
  const f0 = e.fi, j0 = e.fj;
  tryMove(e, mv[0] / l * sp, mv[1] / l * sp, 0.25);
  e.walk += Math.hypot(e.fi - f0, e.fj - j0) / (FAMILIES[e.fam].gait || 0.32);
  e.dir = dirFrom(mv[0], mv[1]); e.clip = 'walk';
}
function hurtHero(dmg, src) {
  if (hero.dead || hero.leap) return;   // nothing touches him in the air
  if (Math.random() * 100 < STAT.block) { floater('BLOCK', hero.fi, hero.fj, 44, 31); sfx('block'); return; }
  dmg = Math.max(1, Math.round(dmg * 40 / (40 + STAT.armor * (hero.buff > 0 ? 1.5 : 1) * 2.5) * (hero.stoneskin > 0 ? 0.5 : 1)));
  hero.hp -= dmg; hero.flash = 0.06; hero.hurtT = 0.15; sfx('hurt');
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
    if (p.kind === 'missile') {   // homing: turn toward the target (or the nearest enemy once it dies)
      if (!p.home || !alive(p.home)) { let bd = 4; p.home = null; for (const e of enemies) { if (!alive(e)) continue; const d = Math.hypot(e.fi - p.fi, e.fj - p.fj); if (d < bd) { bd = d; p.home = e; } } }
      if (p.home) {
        const want = Math.atan2(p.home.fj - p.fj, p.home.fi - p.fi), cur = Math.atan2(p.vy, p.vx);
        let da = ((want - cur + Math.PI * 3) % (Math.PI * 2)) - Math.PI; da = Math.max(-9 * dt, Math.min(9 * dt, da));
        const sp = Math.hypot(p.vx, p.vy) + dt * 6, a = cur + da; p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp;
      }
    }
    const n = 3;
    for (let s = 0; s < n && p.life > 0; s++) {
      p.fi += p.vx * dt / n; p.fj += p.vy * dt / n;
      if (blocked(p.fi, p.fj) && tileAt(Math.floor(p.fi), Math.floor(p.fj)) !== FLOOR) { p.life = 0; break; }
      if (p.owner === 'enemy') {
        if (!hero.dead && Math.hypot(hero.fi - p.fi, hero.fj - p.fj) < 0.45) { hurtHero(roll(p.dmg), null); p.life = 0; if (p.kind === 'frostbolt') hero.chillT = 1.5; }
      } else {
        for (const e of enemies) if (alive(e) && Math.hypot(e.fi - p.fi, e.fj - p.fj) < 0.5 + (e.def.unique ? 0.4 : 0)) {
          if (p.boom) { p.life = 0; break; }   // a fireball bursts on whatever it touches (below)
          if (p.spell) { const c = spellCrit(); damageEnemy(e, spellDmg(c ? p.dmgK * 2 : p.dmgK), p.fi - p.vx * 0.05, p.fj - p.vy * 0.05, c, 0, true); }
          else damageEnemy(e, roll(p.dmg), p.fi - p.vx * 0.05, p.fj - p.vy * 0.05, false, 0, true);
          p.life = 0; break;
        }
      }
    }
    const [x, y] = iso(p.fi, p.fj);
    if (p.kind !== 'arrow' && Math.random() < 0.7) pspawn(3, x, y, p.z, (Math.random() - 0.5) * 8, 0, 4 + Math.random() * 8, 0.35, p.kind === 'holy' ? 50 : p.kind === 'missile' ? 39 : p.kind === 'frostbolt' ? 118 : 16);
    if (p.kind === 'hfire' && Math.random() < 0.6) pspawn(3, x + (Math.random() - 0.5) * 6, y, p.z + 2, (Math.random() - 0.5) * 6, 0, 10 + Math.random() * 8, 0.5, Math.random() < 0.5 ? 4 : 5);   // smoke
    if (p.kind === 'missile' && p.life <= 0) for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283; pspawn(4, x, y, p.z, Math.cos(a) * 45, Math.sin(a) * 22, 0, 0.16, k % 2 ? 40 : 27); }   // a ring of sparks on impact
    if (p.life <= 0 && p.kind === 'holy') sfx('boltHit');
    if (p.life <= 0 && p.boom && !p.boomed) { p.boomed = true; explodeAt(p.fi - p.vx * 0.03, p.fj - p.vy * 0.03, p.boom.r, p.boom.k, p.boom.pow); }
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
  if (e === hero && hero.whirl > 0) return 3;   // the sword held out level, smeared
  if (e === hero && hero.dash > 0) return 0;
  if (e.clip === 'idle') return Math.floor(pt / 0.2) % 4;
  if (e.clip === 'walk') return Math.floor(e.walk) % 8;
  if (e === hero && e.clip === 'channel') { const a = hero.castAge || 0, ph = a < CAST_RELEASE ? 0 : a < 0.19 ? 1 : 2; return (hero.castKind === 'meteor' ? 3 : 0) + ph; }
  if (e.clip === 'attack2' || e.clip === 'attack3' || e.clip === 'attack4') return Math.max(0, swingKey(FAMILIES[e.fam].combo(e, atkIndex(e.clip)), e.atk));
  if (e.clip === 'attack' || e.clip === 'shoot' || e.clip === 'cast') return Math.max(0, swingKey(FAMILIES[e.fam].swing(e), e.atk));
  if (e.clip === 'death') return Math.min(5, Math.floor((e === hero ? hero.dead : e.dying) / 0.1));
  return 0;
}
// hurt tint: each palette color mapped onto the red ramp by its brightness, so the shape still reads
const HURT_TINT = new Uint8Array(128), ICE_TINT = new Uint8Array(128), ARC_TINT = new Uint8Array(128);
for (let v = 0; v < 128; v++) {
  const n = parseInt(PAL_HEX[v] || '000000', 16), L = (0.3 * (n >> 16) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255)) / 255;
  HURT_TINT[v] = v <= 1 ? v : RED[Math.min(4, Math.floor(L * 6 + 0.5))];
  ICE_TINT[v] = v <= 1 ? v : WATER[Math.min(4, Math.floor(L * 4.6 + 0.9))];
  ARC_TINT[v] = v <= 1 ? v : BLUE[Math.min(3, Math.floor(L * 4 + 1))] | EMIS;   // blink afterimage: glowing arcane blue   // frozen: ice blue that keeps the body's shading
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
  const t = G.t;
  buildBudget.used = 0; buildBudget.ms = 2;
  const [kx, ky] = screenOf(hero);
  const sh = G.trauma * G.trauma * 5;
  const shx = Math.round(sh * (Math.sin(t * 61) * 0.6 + Math.sin(t * 97 + 1) * 0.4)), shy = Math.round(sh * (Math.sin(t * 73 + 2) * 0.6 + Math.sin(t * 89 + 3) * 0.4));
  // the camera in detail pixels; the world layer uses the whole-pixel part and is shifted by the rest
  cam2x = Math.round((kx - W / 2) * SPX) + shx * SPX; cam2y = Math.round((ky - H * 0.47) * SPX) + shy * SPX;
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
    ov.push({ depth: p.depth, draw: () => ovBlit(p.sp, p.wx, p.wy, -1, 0, see ? 0.5 : 0, p.tile, clip) });
  }
  for (const p of dynProps) {
    if (p.broken) continue;
    const sp = p.kind === 'barrel' ? PROPS.barrel() : p.kind === 'egg' ? PROPS.egg() : PROPS.chest(p.open);
    if (p.flash > 0) p.flash -= 1 / 60;
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
    if (c.clip !== 'death') shadowBlob(x, y + 1, c === hero || c.role ? (c.fam === 'chicken' ? 4 : 8) : c.def.shadow * (c.look.scale || 1));
    ov.push({ depth: c.fi + c.fj, draw: () => {
      const sp = getSprite(c.fam, c.look, c.dir, c.clip, frameOf(c), c);
      const jit = c.stop > 0 && c !== hero && c.dying < 0 ? (Math.floor(t * 33) % 2 ? 1 : -1) : 0;
      // white flash, then a brief dithered red; ice blue while frozen, half ice while slowed
      const fl = c.flash > 0 ? 1 : c.frozen > 0 ? 4 : c.tint > 0 ? 3 : c.slowT > 0 || c.chillT > 0 ? 5 : 0;
      ovBlit(sp, x + jit, y - (c.leapZ || 0), charLevel[n], fl, 0, tIdx(Math.floor(c.fi), Math.floor(c.fj)));
    } });
  });
  for (const p of projectiles) ov.push({ depth: p.fi + p.fj, draw: () => drawProjectile(p) });
  if (G.tp) ov.push({ depth: G.tp.fi + G.tp.fj, draw: drawPortal });
  if (hero.whirl > 0) ov.push({ depth: hero.fi + hero.fj - 0.01, draw: () => whirlSmear(false) }, { depth: hero.fi + hero.fj + 0.01, draw: () => whirlSmear(true) });
  shrineCrystals(base);
  for (const f of fires) if (LV.vis[f.tile] > 0.1 || LV.seen[f.tile]) base.push({ depth: (f.tile % MW) + Math.floor(f.tile / MW) + (f.depthAdd ?? 1.2), draw: () => flame(f.wx, f.wy, f.h, f.w, t, f.seed, f.blue) });
  heroRing(kx, ky + 1);
  base.sort((a, b) => a.depth - b.depth);
  for (const d of base) d.draw();
  drawTelegraph(); drawImpactFx(); drawMeteors(); drawLichFx(); drawWarriorFx();
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
  ov.sort((a, b) => a.depth - b.depth);
  for (const d of ov) d.draw();
  for (const g of G.ghosts) ovBlit(g.sp, g.x, g.y, L_ID, 6, 1 - g.t / g.t0, -1);   // blink afterimage, dissolving
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
  // the HUD, drawn at the world's scale into its own buffer, merged on top as blocks
  hud32.fill(0); out32 = hud32;
  drawHud();
  out32 = base32;
  for (let y = 0, o = 0; y < H; y++) for (let x = 0; x < W; x++, o++) {
    const c = hud32[o]; if (!c) continue;
    const d = y * SPX * OW + x * SPX;
    for (let b = 0; b < SPX; b++) for (let a = 0; a < SPX; a++) ov32[d + b * OW + a] = c;
  }
  ctx.putImageData(ovImg, 0, 0);
}
// the lit color of a palette index at world-layer pixel (x, y), as the world's light pass would
// light it there (light, fog, dither); 0 where the floor there is unseen. tile -2 = use the pixel's own tile
function envCol(x, y, v, tile) {
  if (x < 0 || y < 0 || x >= W || y >= H) return 0;
  if (v & EMIS) return PAL32[CYCLE[v & 127]];
  if (v === BLK) return PAL32[BLK];
  const o = y * W + x, tk = tile === -2 ? tbuf[o] : tile;
  if (tk < 0 ? !LV.outdoor : !LV.seen[tk]) return 0;
  const vv = tk < 0 ? 1 : LV.vis[tk], top = (LEVELS - 1) * NPAL;
  const l = (shd[o] ? lbuf[o] * 0.4 : lbuf[o]) * BANDS * vv + 0.9 * (1 - vv) + BAYER[((y & 3) << 2) | (x & 3)];
  const L = (l | 0) * NPAL;
  return LCOL[(L < top ? L : top) + v];
}
// draw a sprite on the detail layer. A detail sprite (sp.px === SPX) is placed at sub-pixel
// precision; a world sprite (px 1) is drawn doubled, exactly over its place in the world layer.
// level >= 0: one light level for the whole sprite (characters); -1: lit per pixel like the world
function ovBlit(sp, wx, wy, level, flash, dissolve, tile, clip = null) {
  const fine = sp.px === SPX, k = fine ? 1 : SPX;
  const X0 = fine ? Math.round(wx * SPX) - cam2x - sp.ax : (Math.round(wx - camX) - sp.ax) * SPX - hx;
  const Y0 = fine ? Math.round(wy * SPX) - cam2y - sp.ay : (Math.round(wy - camY) - sp.ay) * SPX - hy;
  const LV0 = level >= 0 ? level * NPAL : -1;
  if (fine && !flash && !dissolve && LV0 >= 0 && !clip) {   // the common case (a character, one light level): a tight loop
    const data = sp.data, w = sp.w, black = PAL32[BLK], xa = Math.max(0, -X0), xb = Math.min(w, OW - X0);
    for (let y = Math.max(0, -Y0), y1 = Math.min(sp.h, OH - Y0); y < y1; y++) {
      const row = (Y0 + y) * OW + X0, s = y * w;
      for (let x = xa; x < xb; x++) { const v = data[s + x]; if (v) ov32[row + x] = (v & EMIS) ? PAL32[CYCLE[v & 127]] : v === BLK ? black : LCOL[LV0 + v]; }
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
      if (flash && v !== BLK) v = flash === 4 ? ICE_TINT[v & 127] : flash === 6 ? ARC_TINT[v & 127] : flash === 5 ? ((xx + yy) & 2 ? ICE_TINT[v & 127] : v) : flash === 2 ? HURT_TINT[v & 127] : flash === 3 ? ((xx + yy) & 2 ? HURT_TINT[v & 127] : v) : (27 | EMIS);
      // a world sprite redrawn over a character is already drawn and lit in the world layer at this
      // very pixel: copy it (cheaper than lighting it again, and identical)
      const c = !fine && !flash && LV0 < 0 ? base32[(Y0 + hy) / SPX * W + y * W + (X0 + hx) / SPX + x] : (v & EMIS) ? PAL32[CYCLE[v & 127]] : v === BLK ? PAL32[BLK] : LV0 >= 0 ? LCOL[LV0 + v] : envCol((xx + hx) >> 1, (yy + hy) >> 1, v, tile);
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
  if (p.kind === 'arrow') {
    const l = Math.hypot(p.vx, p.vy), dx = (p.vx - p.vy) / l * 16 / 22.6, dy = (p.vx + p.vy) / l * 8 / 22.6;
    for (let s = -4; s <= 3; s++) put(Math.round(dx * s * 1.4), Math.round(dy * s * 1.4), s > 2 ? 30 : 25);
    return;
  }
  if (p.kind === 'missile') {   // an arcane dart: white-hot core, a blue glow, and a tapering tail that twinkles
    const l = Math.hypot(p.vx, p.vy) || 1, tx = -(p.vx - p.vy) / l * 0.75, ty = -(p.vx + p.vy) / l * 0.38, tw = Math.floor(G.t * 30 + p.fi * 7) % 2;
    for (let s = 1; s <= 5; s++) { const c = s < 3 ? 40 : s < 4 ? 39 : 38; if (s < 5 || tw) put(Math.round(tx * s), Math.round(ty * s), c | EMIS); }
    for (let b = -1; b <= 1; b++) for (let a = -2; a <= 2; a++) { const d = a * a / 4 + b * b; if (d <= 1) put(a, b, (d < 0.3 ? 27 : 40) | EMIS); }
    if (tw) { put(0, -2, 40 | EMIS); put(0, 2, 40 | EMIS); }
    return;
  }
  if (p.kind === 'hfire') {   // the hero's fireball: a flickering ball of flame with a hot core, tail streaming behind
    const l = Math.hypot(p.vx, p.vy) || 1, tx = -(p.vx - p.vy) / l * 0.75, ty = -(p.vx + p.vy) / l * 0.38;
    for (let s = 2; s <= 7; s++) { const w = Math.max(0, 3 - s * 0.4); for (let k = -Math.round(w); k <= Math.round(w); k++) put(Math.round(tx * s - ty * k * 0.6), Math.round(ty * s + tx * k * 0.6), (s < 4 ? 16 : s < 6 ? 15 : 14) | EMIS); }
    for (let b = -4; b <= 4; b++) for (let a = -4; a <= 4; a++) {
      const d = Math.hypot(a, b) + (hash(a + Math.floor(G.t * 20), b, 9) - 0.5) * 1.6;   // a ragged, flickering edge
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
function lightPass(chars, kx, ky) {
  const t = G.t;
  cyclePalette(t);
  // outdoors: flat daylight at the identity level (the ramps as drawn), no hero light
  // night outdoors (every third town and forest): dim moonlight, the hero carries a light, and the
  // lanterns, fires and windows matter
  const amb = LV.outdoor ? (LV.night ? 0.3 : 0.6) : 0;
  const dyn = LV.outdoor && !LV.night ? [] : [{ x: kx, y: ky, z: 34, r: LV.night ? 120 : 145, i: LV.night ? 0.42 : 0.62 }];
  for (const p of projectiles) if (p.kind !== 'arrow' && dyn.length < 5) { const [x, y] = iso(p.fi, p.fj); dyn.push({ x, y, z: p.z, r: p.kind === 'missile' ? 45 : 70, i: 0.8 }); }
  if (G.tp) { const [x, y] = iso(G.tp.fi, G.tp.fj); dyn.push({ x, y, z: 20, r: 80, i: 0.7 * Math.min(1, G.tp.t / 0.45) }); }   // the portal's blue glow (brightness only)
  for (const f of G.flashes) if (dyn.length < 7) { const [x, y] = iso(f.fi, f.fj); dyn.push({ x, y, z: 24, r: f.r, i: 1.1 * f.t / f.t0 }); }   // explosions light the room
  const fl = g => 1 + 0.07 * Math.sin(t * 11 + g * 2.3) + 0.05 * Math.sin(t * 23.7 + g * 5.1) + 0.04 * Math.sin(t * 37 + g);
  const f0 = fl(0), f1 = fl(1), A = staticLight[0], B = staticLight[1];
  for (let y = 0; y < H; y++) {
    const wy = camY + y, o0 = y * W;
    if (wy < 0 || wy >= WH) { lbuf.fill(0, o0, o0 + W); continue; }
    const row = wy * WW + camX;
    for (let x = 0; x < W; x++) { const wx = camX + x; lbuf[o0 + x] = amb + ((wx >= 0 && wx < WW) ? A[row + x] * f0 + B[row + x] * f1 : 0); }
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
      if (tk < 0 ? !LV.outdoor : !seen[tk]) { out32[o] = black; continue; }
      if (v & EMIS) { out32[o] = PAL32[CYCLE[v & 127]]; continue; }
      const ci = cid[o];
      if (ci) { out32[o] = LCOL[cl[ci - 1] + v]; continue; }
      const vv = tk < 0 ? 1 : vis[tk];
      // remembered areas sit at a dim floor level; visible areas get their real light
      const l = (shd[o] ? lbuf[o] * 0.4 : lbuf[o]) * BANDS * vv + 0.9 * (1 - vv) + BAYER[by | (x & 3)];
      const L = (l | 0) * NPAL;
      out32[o] = LCOL[(L < top ? L : top) + v];
    }
  }
  return charLevel;
}

// ---------------------------------------------------------------- save / load (versioned)
const SAVE_KEY = 'dcg-save', SAVE_V = 1;
// one save per class: the warrior keeps the original key, so older saves still load
const saveKey = cls => cls === 'mage' ? SAVE_KEY + '-mage' : SAVE_KEY;
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
  if (G.mode !== 'play' || hero.dead) return;
  const data = { v: SAVE_V, level: LV.level, seed: LV.seed, hero: { cls: hero.cls, hp: Math.ceil(hero.hp), mana: Math.ceil(hero.mana), gold: hero.gold, xp: hero.xp, lvl: hero.lvl, potions: hero.potions, team: hero.team, equip: hero.equip, bag: hero.bag }, serial: itemSerial,
    quests: G.quests || null, gates: G.gates || null, town: G.town || null, portal: G.portal ? { level: G.portal.level, seed: G.portal.seed, fi: G.portal.fi, fj: G.portal.fj } : null };
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
  Object.assign(hero, { cls, hp: 40, mana: 20, gold: 0, xp: 0, lvl: 1, potions: 3, team: 'red', dead: 0, bag: [], equip: { weapon: null, helm: null, chest: null, shield: null } });
  const R = rng(5);
  const kit = cls === 'mage' ? ['oak_staff', 'apprentice_robe', 'wizard_hat'] : ['short_sword', 'tunic'];
  for (const b of kit) { const it = rollItem(R, 1, b); it.rarity = 'normal'; it.mods = {}; hero.equip[ITEM_BASES[b].slot] = it; }
  setSkillsFor(cls);
  recalcHero(); hero.hp = STAT.maxHp; hero.mana = STAT.maxMana;
}
function beginGame(fromSave, cls = 'warrior') {
  const d = fromSave ? loadSave(cls) : null;
  if (d) {
    newHero(cls); Object.assign(hero, d.hero); hero.cls = cls; itemSerial = d.serial || 100; recalcHero();
    G.mode = 'play'; G.town = d.town || null; G.portal = d.portal || null; G.quests = d.quests || null; G.gates = d.gates || null; G.sideBack = null; startLevel(d.level, d.seed);
  } else {
    G.town = null; G.portal = null; G.quests = null; G.gates = null; G.sideBack = null;
    newHero(cls); G.mode = 'play'; startLevel(1, (Math.random() * 1e9) >>> 0);
  }
}
function respawn() {
  hero.dead = 0; hero.clip = 'idle'; recalcHero(); hero.hp = STAT.maxHp; hero.mana = STAT.maxMana;
  hero.gold = Math.floor(hero.gold * 0.9);
  G.msg = []; say('YOU RISE AGAIN', 26, 2);
  startLevel(LV.level, LV.seed);
  saveGame();
}
