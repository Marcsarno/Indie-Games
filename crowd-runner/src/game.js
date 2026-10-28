// Pure game logic (no rendering). The renderer reads the public fields and drains `events` each frame.
import { LEVEL, ROAD_HALF, START_SQUAD, SPAWN_AHEAD } from './level.js';

export const MAX_DRAW = 240;           // soldiers actually drawn; the HUD number can be far larger
const RUN_SPEED = 7.2;
const BASE_SHOTS = 1.7;                // shots per soldier per second
const MINIGUN_MULT = 2.4;
const BULLET_SPEED = 52;
const BULLET_RANGE = 58;
const MAX_BULLETS = 180;
const BOSS_HOLD = 19;                  // squad stops this far from the boss

const rnd = (a, b) => a + Math.random() * (b - a);

export function formation(n) {
  const D = Math.min(n, MAX_DRAW);
  const cols = Math.max(1, Math.min(9, Math.ceil(Math.sqrt(D * 1.3))));
  const sx = Math.min(0.8, (ROAD_HALF * 2 - 0.7) / cols);
  const sz = Math.max(0.6, 0.92 - D * 0.004);
  const slots = new Array(D);
  for (let i = 0; i < D; i++) {
    const row = (i / cols) | 0, col = i % cols;
    const inRow = Math.min(cols, D - row * cols);
    slots[i] = { dx: (col - (inRow - 1) / 2) * sx, dz: row * sz + (row % 2 ? 0.12 : 0) };
  }
  return { slots, cols, halfWidth: (cols * sx) / 2, depth: Math.ceil(D / cols) * sz };
}

export class Game {
  constructor(level = LEVEL) {
    this.level = level;
    this.events = [];
    this.reset();
  }

  reset() {
    const L = this.level;
    this.t = 0;
    this.state = 'ready';              // ready | play | win | fail
    this.squad = { x: 0, z: 0, n: START_SQUAD, fire: 1, weapon: null, targetX: 0, hold: false };
    this.form = formation(this.squad.n);
    this.coins = 0;
    this.kills = 0;
    this.zombies = [];
    this.bullets = [];
    this.waveIdx = 0;
    this.gateIdx = 0;
    this.boss = null;
    this.acc = 0;
    this.biteAcc = 0;
    this.gates = L.gates.map(g => ({ ...g, done: false }));
    this.pickups = L.pickups.map(p => ({ ...p, bar: p.barricadeHp, open: false, taken: false, warned: 0 }));
    this.events.length = 0;
    this.botMode = null;               // null | 'good' | 'fail'
  }

  start() { if (this.state === 'ready') this.state = 'play'; }

  emit(e) { this.events.push(e); }

  setSquad(n) {
    this.squad.n = Math.max(0, Math.min(9999, Math.round(n)));
    this.form = formation(this.squad.n);
  }

  update(dt) {
    if (this.state !== 'play') { this.updateFx(dt); return; }
    this.t += dt;
    const s = this.squad;

    if (this.botMode) this.bot();
    // lateral move, clamped so the whole block stays on the road
    const lim = Math.max(0, ROAD_HALF - this.form.halfWidth - 0.15);
    s.targetX = Math.max(-lim, Math.min(lim, s.targetX));
    s.x += (s.targetX - s.x) * Math.min(1, dt * 12);
    if (!s.hold) s.z -= RUN_SPEED * dt;

    this.spawnWaves();
    this.updateGates();
    this.updatePickups();
    this.fire(dt);
    this.updateBullets(dt);
    this.updateZombies(dt);

    if (s.n <= 0) { this.state = 'fail'; this.emit({ type: 'end', win: false }); }
    else if (this.boss && this.boss.dead) { this.state = 'win'; this.emit({ type: 'end', win: true }); }
  }

  updateFx() {}

  // --- spawning ---------------------------------------------------------------------------
  spawnWaves() {
    const L = this.level, s = this.squad;
    while (this.waveIdx < L.waves.length && s.z - L.waves[this.waveIdx].z <= SPAWN_AHEAD) {
      const w = L.waves[this.waveIdx++];
      const cols = 4, gap = 1.1;
      for (let i = 0; i < w.n; i++) {
        const row = (i / cols) | 0, col = i % cols;
        this.zombies.push({
          x: (col - (cols - 1) / 2) * gap + rnd(-0.35, 0.35), z: w.z - row * 1.25 + rnd(-0.3, 0.3),
          hp: w.hp, max: w.hp, speed: rnd(1.9, 2.8), phase: rnd(0, 6.28), shade: (Math.random() * 6) | 0,
          r: 0.62, boss: false, dead: false,
        });
      }
    }
    if (!this.boss && L.boss && s.z - L.boss.z <= SPAWN_AHEAD + 8) {
      this.boss = { x: 0, z: L.boss.z, hp: L.boss.hp, max: L.boss.hp, speed: 2.0, phase: 0, r: 2.1, boss: true, dead: false };
      this.zombies.push(this.boss);
      this.emit({ type: 'boss' });
    }
  }

  // --- gates / pickups ----------------------------------------------------------------------
  updateGates() {
    const s = this.squad;
    for (const g of this.gates) {
      if (g.done || s.z > g.z) continue;
      g.done = true;
      const pick = s.x < 0 ? g.left : g.right;
      g.picked = s.x < 0 ? 'left' : 'right';
      let txt, cls = 'good';
      switch (pick.kind) {
        case 'add': this.setSquad(s.n + pick.v); txt = `+${pick.v}`; break;
        case 'mul': this.setSquad(s.n * pick.v); txt = `x${pick.v}`; break;
        case 'sub': this.setSquad(s.n - pick.v); txt = `-${pick.v}`; cls = 'bad'; break;
        case 'fire': s.fire *= pick.v; txt = `FIRE x${pick.v}`; cls = 'info'; break;
      }
      this.emit({ type: 'gate', gate: g, side: g.picked, text: txt, cls, x: s.x, z: s.z });
    }
  }

  updatePickups() {
    const s = this.squad;
    for (const p of this.pickups) {
      if (p.taken || s.z > p.z + 0.5) continue;
      if (Math.abs(s.x - p.x) > this.form.halfWidth + 1.3) { if (s.z < p.z - 2) p.taken = 'missed'; continue; }
      if (!p.open) { p.taken = 'blocked'; this.emit({ type: 'float', text: 'BLOCKED', cls: 'bad', x: p.x, z: p.z }); continue; }
      if (this.coins < p.price) { p.taken = 'poor'; this.emit({ type: 'float', text: `NEED ${p.price}`, cls: 'bad', x: p.x, z: p.z }); continue; }
      this.coins -= p.price;
      p.taken = 'bought';
      s.weapon = p.weapon;
      this.emit({ type: 'float', text: 'MINIGUN!', cls: 'info', x: p.x, z: p.z });
      this.emit({ type: 'buy', pickup: p });
    }
  }

  // --- combat ----------------------------------------------------------------------------------
  fire(dt) {
    const s = this.squad;
    if (!this.form.slots.length) return;
    this.acc += s.n * BASE_SHOTS * s.fire * (s.weapon === 'minigun' ? MINIGUN_MULT : 1) * dt;
    const shots = Math.floor(this.acc);
    if (shots < 1) return;
    this.acc -= shots;
    const nB = Math.min(shots, 7, MAX_BULLETS - this.bullets.length);
    if (nB < 1) return;
    const dmg = shots / nB;
    for (let i = 0; i < nB; i++) {
      const slot = this.form.slots[(Math.random() * this.form.slots.length) | 0];
      const b = { x: s.x + slot.dx + rnd(-0.06, 0.06), z: s.z + slot.dz - 0.9, dmg, dist: 0 };
      this.bullets.push(b);
      if (i < 2) this.emit({ type: 'muzzle', x: b.x, z: b.z });
    }
  }

  updateBullets(dt) {
    const out = [];
    nextBullet:
    for (const b of this.bullets) {
      const z0 = b.z;
      b.z -= BULLET_SPEED * dt;
      b.dist += BULLET_SPEED * dt;
      if (b.dist > BULLET_RANGE) continue;
      for (const p of this.pickups) {                // crate barricade in front of a pedestal
        if (p.open) continue;
        const bz = p.z + 4.5;
        if (Math.abs(b.x - p.x) < 1.05 && z0 >= bz - 0.5 && b.z <= bz + 0.5) {
          p.bar -= b.dmg;
          this.emit({ type: 'hit', x: b.x, z: bz, color: 'wood' });
          if (p.bar <= 0) { p.open = true; this.emit({ type: 'float', text: 'OPEN!', cls: 'good', x: p.x, z: bz }); this.emit({ type: 'crash', x: p.x, z: bz }); }
          continue nextBullet;
        }
      }
      for (const z of this.zombies) {
        if (z.dead) continue;
        if (Math.abs(b.x - z.x) < z.r + 0.08 && z0 >= z.z - z.r && b.z <= z.z + z.r) {
          z.hp -= b.dmg;
          z.flash = 0.08;
          this.emit({ type: 'hit', x: b.x, z: z.z, color: 'ichor', big: z.boss });
          if (z.hp <= 0) this.kill(z);
          continue nextBullet;
        }
      }
      out.push(b);
    }
    this.bullets = out;
  }

  kill(z) {
    z.dead = true;
    this.kills++;
    this.coins += z.boss ? 60 : 2;
    this.emit({ type: 'kill', x: z.x, z: z.z, boss: z.boss });
  }

  updateZombies(dt) {
    const s = this.squad, f = this.form;
    for (const z of this.zombies) {
      if (z.dead) continue;
      z.phase += dt * (z.boss ? 4 : 7);
      if (z.flash) z.flash = Math.max(0, z.flash - dt);
      if (z.boss) {
        if (s.z - z.z < BOSS_HOLD + 0.01) s.hold = true;          // squad stops and the brute lumbers in
        z.z = Math.min(s.z - 2.2, z.z + z.speed * (s.hold ? 1 : 0.5) * dt);   // stops at the squad and chews
        z.x += (s.x - z.x) * Math.min(1, dt * 0.8);
        if (z.z >= s.z - 2.4) {                                   // the brute chews through the squad
          this.biteAcc += dt * 9;
          const k = Math.floor(this.biteAcc);
          if (k) { this.biteAcc -= k; this.setSquad(s.n - k); this.emit({ type: 'bite', x: s.x, z: s.z, boss: true }); }
        }
        continue;
      }
      z.z += z.speed * dt;
      if (z.z > s.z - 28) z.x += (s.x - z.x) * Math.min(1, dt * 0.9);
      if (z.z >= s.z - 0.7 && Math.abs(z.x - s.x) <= f.halfWidth + 0.5 && z.z <= s.z + f.depth) {
        z.dead = true;
        this.setSquad(s.n - 1);
        this.emit({ type: 'bite', x: z.x, z: z.z });
      }
    }
    this.zombies = this.zombies.filter(z => z.boss ? !z.dead : (!z.dead && z.z < s.z + f.depth + 14));
  }

  // --- bot: used for tests and the "fail ad" demo ---------------------------------------------
  bot() {
    const s = this.squad;
    const worst = this.botMode === 'fail';
    const score = g => ({ add: s.n + g.v, mul: s.n * g.v, sub: s.n - g.v, fire: s.n * 1.4 }[g.kind]);
    const g = this.gates.find(q => !q.done && q.z < s.z + 2 && q.z > s.z - 16);
    if (g) {
      const l = score(g.left), r = score(g.right);
      const left = worst ? l < r : l > r;
      s.targetX = left ? -1.25 : 1.25;
      return;
    }
    const p = this.pickups.find(q => !q.taken && q.z < s.z && q.z > s.z - 46);
    if (p && !worst && this.botMode !== 'meh' && !(s.z - p.z < 7 && !p.open)) { s.targetX = p.x; return; }
    let near = null;
    for (const z of this.zombies) if (!z.dead && z.z < s.z - 1 && (!near || z.z > near.z)) near = z;
    s.targetX = near && !worst ? near.x : 0;
  }
}
