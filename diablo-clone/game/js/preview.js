'use strict';
// Round 45: live skill previews on the skills screen. A second copy of the game runs in a hidden
// frame of its own (same scripts, its own globals), so the preview is the real skill code: the
// hero, in the player's gear, uses the chosen skill and modifier on three practice dummies in the
// King's Hall, over and over. The skills screen steps that copy one frame per frame and draws its
// canvas into a window on the screen. The copy never saves, plays no sound and has no HUD but the
// damage numbers. Nothing in it can reach the real game.
const PREVIEW = typeof window !== 'undefined' && !!window.__PREVIEW;
const PV_W = 254, PV_H = 150;   // the window, in game pixels

// ---------------------------------------------------------------- inside the preview's frame
// per skill: how long one loop runs, when the skill goes, and what follows it
const PV_PLAN = {
  missile: { len: 2.2, hold: 1.1 },
  fireball: { len: 2.4 }, cone: { len: 2.6 }, meteor: { len: 3.0 },
  // Blink: away from dummies at its elbow (Frost Step freezes them as it goes); Arcane Burst blinks into them
  chain: { len: 2.4 },   // round 65
  blink: { len: 2.4, near: 0.6, away: true, again: 'double', mods: { burst: { near: 0, far: 2, away: false } } },
  slam: { len: 2.4 }, hook: { len: 2.6, far: 1.5 }, whirl: { len: 3.0, near: 0.55 }, leap: { len: 2.6, far: 1.5 },
  multi: { len: 2.4 }, trap: { len: 3.0, walk: true }, roll: { len: 2.6, near: 0.7 }, mark: { len: 3.0, attack: 1.4 },
};
const PVS = { id: null, mod: null, t: 0, fired: 0, dmg: 0, loops: 0, start: [12.5, 13.5], snap: null, arena: false };
// a practice yard: an open crypt floor lit by braziers (only this copy of the game ever loads it)
const PV_YARD = ["", "", "", "", "",
  "     ....................", "     .b.......b.....B..b.", "     ....................", "     ....................",
  "     .....x..........x...", "     ....................", "     ....................", "     ....................",
  "     ...S................", "     ....................", "     ...........d........", "     ....................",
  "     ....o..b.......x..X..", "     .......d...b........", "     .b................b.", "     ....................", "", "", ""];
function pvArena() {
  ARENA_MAPS.yard = PV_YARD; ACTS[0].arena = 'yard';   // (this copy only: the Act I boss floor becomes the yard)
  G.mode = 'play'; startLevel(5, 77);
  boss = null; enemies = []; npcs.length = 0; G.bossIntro = 0; G.actCard = 0; G.msg = [];
  PVS.snap = [floorBuf.slice(), wFloor.slice(), wIdx.slice(), wIdx2.slice()];   // the clean floor, put back each loop (blood, scorch)
  PVS.arena = true;
}
// o: { cls, equip (JSON), lvl, team, id, mod }
function pvSetup(o) {
  if (!PVS.arena || hero.cls !== o.cls) { newHero(o.cls); if (!PVS.arena) pvArena(); }
  hero.equip = JSON.parse(o.equip); hero.team = o.team || 'red';
  const sk = (SKILLSETS[o.cls] || []).find(s => s.id === o.id) || { lvl: 1 }, k = (SKILL_MODS[o.id] || []).findIndex(m => m.id === o.mod);
  hero.lvl = Math.max(o.lvl, sk.lvl, k >= 0 ? modUnlock(o.id, k) : 0);
  hero.mods = o.mod ? { [o.id]: o.mod } : {}; hero.tut = { gear: true, mod: true, gearDrop: true };
  recalcHero(); prewarmHero();
  PVS.id = o.id; PVS.mod = o.mod; PVS.loops = 0; PVS.dmg = 0; PVS.last = 0;
  pvReset();
}
const pvPlan = () => { const P = PV_PLAN[PVS.id] || { len: 2.4 }; return Object.assign({}, P, (P.mods || {})[PVS.mod] || {}); };
function pvReset() {
  resetFx(); resetSkills();
  if (PVS.snap) { floorBuf.set(PVS.snap[0]); wFloor.set(PVS.snap[1]); wIdx.set(PVS.snap[2]); wIdx2.set(PVS.snap[3]); }
  const P = pvPlan(), far = P.far || P.near || 1, [hi, hj] = PVS.start;
  Object.assign(hero, { fi: hi, fj: hj, dead: 0, atk: -1, cast: -1, clip: 'idle', dash: 0, whirl: 0, buf: 0, kb: [0, 0], hurt: 0, leapZ: 0 });
  hero.hp = STAT.maxHp; hero.mana = STAT.maxMana;
  input.attack = false; input.mx = input.my = 0; input.keys.clear();
  G.trauma = 0; G.slowmo = 0; G.msg = []; G.streakShow = null;
  // three dummies to the right on screen (+i, -j), one in front and two to the sides
  const c = [hi + 2.3 * far, hj - 2.3 * far];
  // one in front, two behind it spread up and down the screen
  enemies = [[-0.45, 0.45], [0.55 + 1.1, -0.55 + 1.1], [0.55 - 1.1, -0.55 - 1.1]].map(([a, b], n) => {
    const e = makeEnemy('skeleton', c[0] + a, c[1] + b, n);
    e.dummy = true; e.state = 'chase'; e.noLoot = true; e.dir = 3; e.look = Object.assign({}, e.look, { shield: false });   // (no shield: every blow lands)
    e.hp = e.maxHp = Math.max(e.maxHp, 60); return e;
  });
  if (P.walk) for (const e of enemies) { e.fi += 1.2; e.fj -= 1.2; }   // the trap is thrown where they will walk
  hero.dir = P.away ? 3 : 7;   // facing the dummies (or away, to blink clear of them)
  PVS.c = c; G.camAt = { fi: (hi + c[0]) / 2, fj: (hj + c[1]) / 2 + 0.15 };
  PVS.t = 0; PVS.fired = 0; PVS.dmg = 0;
  updateFov(hero.fi, hero.fj);
}
function pvFire() {
  if (PVS.id === 'missile') { input.attack = true; heroAttack(); return; }
  const i = SKILLS.findIndex(s => s.id === PVS.id); if (i < 0) return;
  hero.mana = STAT.maxMana; CD[PVS.id] = 0; useSkill(i);
}
function pvStep(dt) {
  const P = pvPlan(), hp0 = enemies.reduce((a, e) => a + Math.max(0, e.hp), 0);   // (before the skill goes: some hit at once)
  PVS.t += dt;
  if (PVS.fired === 0 && PVS.t >= 0.35) { PVS.fired = 1; pvFire(); }
  if (P.hold && PVS.t >= 0.35 + P.hold) input.attack = false;
  if (P.again && PVS.mod === P.again && PVS.fired === 1 && PVS.t >= 1.0) { PVS.fired = 2; hero.dir = P.away ? 7 : 3; pvFire(); }   // Double Blink: the free second blink, back again
  if (P.attack && PVS.fired >= 1 && PVS.t >= 0.9 && PVS.t < 0.9 + P.attack) { input.attack = true; heroAttack(); }   // Hunter's Mark: then shoot the marked one
  if (P.attack && PVS.t >= 0.9 + P.attack) input.attack = false;
  if (P.walk) for (const e of enemies) if (alive(e) && !(e.rootT > 0) && !(e.frozen > 0) && PVS.t > 0.9) { tryMove(e, -1.1 * dt, 1.1 * dt, 0.25); e.clip = 'walk'; e.walk += dt; e.dir = 3; }   // they walk at the hero, into the trap
  update(dt);
  PVS.dmg += Math.max(0, hp0 - enemies.reduce((a, e) => a + Math.max(0, e.hp), 0));
  if (hero.hp < STAT.maxHp) hero.hp = STAT.maxHp;
  if (PVS.t >= P.len) { PVS.loops++; PVS.last = Math.round(PVS.dmg); pvReset(); }
  { const k = Math.min(1, dt * 4), a = G.camAt, fi = (hero.fi + PVS.c[0]) / 2, fj = (hero.fj + PVS.c[1]) / 2 + 0.15; a.fi += (fi - a.fi) * k; a.fj += (fj - a.fj) * k; }   // keep the hero and the dummies framed
  warmStep(8);
  render();
}
// the preview's only HUD: the damage numbers
function pvHud() {
  for (const fl of floaters) textC(fl.text, Math.round(fl.x - camX), Math.round(fl.y - camY), fl.col, fl.size || 1);
}

// ---------------------------------------------------------------- the real game's side
const PVP = { frame: null, win: null, ready: false, key: '', failed: false, shown: 0 };
function pvBoot() {
  if (PVP.frame || PREVIEW || typeof document === 'undefined') return;
  const srcs = [...document.scripts].map(s => s.src).filter(Boolean);
  if (!srcs.length) { PVP.failed = true; return; }
  const f = document.createElement('iframe');
  f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1;
  f.style.cssText = 'position:fixed;left:-4000px;top:0;width:' + PV_W + 'px;height:' + PV_H + 'px;border:0;opacity:0;pointer-events:none';
  f.srcdoc = '<!doctype html><html><body style="margin:0"><div id="stage"><canvas id="c" width="' + PV_W + '" height="' + PV_H + '"></canvas></div>'
    + '<script>window.__PREVIEW=true;window.requestAnimationFrame=function(){return 0};<\/script>'
    + srcs.map(s => '<script src="' + s + '"><\/script>').join('') + '</body></html>';
  f.onload = () => {
    try { const w = f.contentWindow; if (typeof w.pvSetup !== 'function') throw new Error('no preview'); PVP.win = w; PVP.cvs = w.document.getElementById('c'); PVP.ready = true; PVP.key = ''; }
    catch (e) { PVP.failed = true; PVP.err = String(e && e.stack || e); }
  };
  PVP.frame = f; document.body.appendChild(f);
}
// show this skill and modifier (mod null: the plain skill)
function pvShow(id, mod) {
  pvBoot();
  const key = id + '/' + (mod || '') + '/' + hero.cls;
  if (!PVP.ready || PVP.key === key) return;
  try { PVP.win.pvSetup({ cls: hero.cls, equip: JSON.stringify(hero.equip), lvl: hero.lvl, team: hero.team, id, mod }); PVP.key = key; PVP.shown = 0; }
  catch (e) { PVP.failed = true; PVP.err = String(e && e.stack || e); }
}
function pvTick(dt) {
  if (!PVP.ready || !PVP.key || PVP.failed) return;
  try { PVP.win.pvStep(Math.min(dt, 1 / 30)); PVP.shown++; } catch (e) { PVP.failed = true; PVP.err = String(e && e.stack || e); }
}
const pvLive = () => PVP.ready && !PVP.failed && PVP.shown > 2;
const pvDamage = () => (PVP.ready && !PVP.failed ? PVP.win.PVS_last() : 0);
function PVS_last() { return PVS.last; }
function pvStats() { return { dmg: Math.round(PVS.dmg), last: PVS.last, loops: PVS.loops, t: PVS.t, alive: enemies.filter(alive).length, hero: [hero.fi, hero.fj], err: PVS.err || null }; }
// the preview's picture, into rect r (game pixels) of the real canvas, after the frame is drawn
function pvBlit(r) {
  if (!pvLive() || !PVP.cvs) return;
  try { ctx.drawImage(PVP.cvs, 0, 0, PV_W * SPX, PV_H * SPX, r.x * SPX, r.y * SPX, r.w * SPX, r.h * SPX); } catch (e) { /* ignore */ }
}
