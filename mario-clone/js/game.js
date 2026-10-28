'use strict';
// Engine: fixed 60 Hz step, 256x240 native canvas. Physics numbers follow the original's
// per-frame values (speeds in px/frame, accelerations in px/frame^2).

const W = 256, H = 240, TS = 16;

// ---- tuning (px/frame, px/frame^2), converted from the original's 1/16-pixel fixed point
const PH = {
  walkMax: 1.5, runMax: 2.5,
  walkAcc: 0x98 / 4096, runAcc: 0xe4 / 4096, friction: 0xd0 / 4096, skid: 0xa0 / 4096 * 1.6,
  // jump: by |speed| band -> [initial vy, gravity while A held rising]
  fall: [0x70 / 256, 0x70 / 256, 0x60 / 256, 0x90 / 256, 0x90 / 256],
  hold: [0x20 / 256, 0x20 / 256, 0x1e / 256, 0x28 / 256, 0x28 / 256],
  v0: [-4, -4, -4, -5, -5],
  maxFall: 4
};
function jumpBand(sp) {
  const s = Math.abs(sp) * 16;           // original units
  return s < 9 ? 0 : s < 16 ? 1 : s < 25 ? 2 : s < 28 ? 3 : 4;
}

const K = { left: false, right: false, down: false, up: false, a: false, b: false, aEdge: false, bEdge: false, startEdge: false };
let G = null;
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// ------------------------------------------------------------------ setup
function newGame(keepTop) {
  const top = G ? G.top : 0;
  G = {
    mode: 'title', timer: 0, tick: 0,
    score: 0, coins: 0, lives: 3, top: keepTop === false ? 0 : top,
    area: null, L: null, cam: 0, m: null, time: 400, timeTick: 0, stompChain: 0,
    over: null, bonus: null, freeze: 0, flash: 0, hurried: false, paused: false, seq: null
  };
  buildTitle();
}

function liveState() { return { enemies: [], items: [], fireballs: [], fx: [], pickups: [], bumps: [] }; }

function buildLevel() {
  G.over = buildWorld11();
  G.over.L = liveState();
  G.over.enemyDefs = G.over.enemies;
  G.over.enemies.forEach(function (d) {
    const e = d.type === 'goomba'
      ? { kind: 'goomba', x: d.x + 1, y: d.y + 2, w: 14, h: 14, vx: -0.5, vy: 0, state: 'walk', active: false, t: 0 }
      : { kind: 'koopa', x: d.x + 1, y: d.y + 2, w: 14, h: 22, vx: -0.5, vy: 0, state: 'walk', active: false, t: 0 };
    G.over.L.enemies.push(e);
  });
  G.bonus = null;
  G.area = G.over; G.L = G.over.L;
  G.cam = 0; G.time = 400; G.timeTick = 0; G.hurried = false; G.stompChain = 0; G.freeze = 0; G.seq = null;
  G.m = newMario();
}

function newMario() {
  return {
    x: 40, y: 192, w: 12, h: 16, vx: 0, vy: 0, big: false, fire: false, dir: 1, onGround: true,
    state: 'normal', t: 0, invuln: 0, star: 0, dist: 0, crouch: false, skidding: false, jumping: false,
    airMax: PH.walkMax, prevY: 192, isPlayer: true, hidden: false, kickGrace: 0
  };
}

function startIntro() {
  G.mode = 'intro'; G.timer = 0;
}

function startPlay() {
  G.mode = 'play'; G.timer = 0;
}

// ------------------------------------------------------------------ tile collision
function solidAt(tx, ty, e, dy) {
  const t = getTile(G.area, tx, ty);
  if (t === T.AIR) return false;
  if (t === T.HIDDEN) return !!(e.isPlayer && dy < 0 && e.prevY >= (ty + 1) * TS - 1);
  return true;
}

function moveX(e, dx) {
  e.x += dx;
  const y0 = Math.floor(e.y / TS), y1 = Math.floor((e.y + e.h - 1) / TS);
  if (dx > 0) {
    const tx = Math.floor((e.x + e.w - 1) / TS);
    for (let ty = y0; ty <= y1; ty++) if (solidAt(tx, ty, e, 0)) { e.x = tx * TS - e.w; return true; }
  } else if (dx < 0) {
    const tx = Math.floor(e.x / TS);
    for (let ty = y0; ty <= y1; ty++) if (solidAt(tx, ty, e, 0)) { e.x = (tx + 1) * TS; return true; }
  }
  return false;
}

// returns null, 'floor', or {tx, ty} when a ceiling tile was hit
function moveY(e, dy) {
  e.y += dy;
  const x0 = Math.floor(e.x / TS), x1 = Math.floor((e.x + e.w - 1) / TS);
  if (dy > 0) {
    const ty = Math.floor((e.y + e.h - 1) / TS);
    for (let tx = x0; tx <= x1; tx++) {
      if (solidAt(tx, ty, e, dy)) { e.y = ty * TS - e.h; e.vy = 0; e.onGround = true; return 'floor'; }
    }
  } else if (dy < 0) {
    const ty = Math.floor(e.y / TS);
    const cx = Math.floor((e.x + e.w / 2) / TS);
    let pick = -1;
    for (let tx = x0; tx <= x1; tx++) {
      if (solidAt(tx, ty, e, dy)) { if (pick < 0 || tx === cx) pick = tx; }
    }
    if (pick >= 0) { e.y = (ty + 1) * TS; e.vy = 1; return { tx: pick, ty: ty }; }
  }
  return null;
}

function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// ------------------------------------------------------------------ scoring / effects
function addScore(n) { G.score += n; if (G.score > G.top) G.top = G.score; }
function popup(x, y, text) { G.L.fx.push({ k: 'pop', x: x, y: y, text: String(text), t: 0 }); }
function oneUp(x, y) { G.lives++; popup(x, y, '1UP'); Sound.play('oneUp'); }
function addCoin() {
  G.coins++;
  if (G.coins >= 100) { G.coins -= 100; oneUp(G.m.x, G.m.y - 8); }
  addScore(200);
}
const STOMP = [100, 200, 400, 500, 800, 1000, 2000, 4000, 5000, 8000];
const SHELL = [500, 800, 1000, 2000, 4000, 5000, 8000];
function chainScore(list, n, x, y) {
  if (n >= list.length) { oneUp(x, y); return; }
  addScore(list[n]); popup(x, y, list[n]);
}

// ------------------------------------------------------------------ blocks
function spawnItem(kind, tx, ty) {
  const it = { kind: kind, x: tx * TS, y: ty * TS, w: 16, h: 16, vx: 0, vy: 0, emerge: 16, t: 0, dir: 1 };
  if (kind === 'mushroom' || kind === 'oneup') it.vx = 1;
  if (kind === 'star') it.vx = 1.2;
  G.L.items.push(it);
  Sound.play('powerupAppear');
}

function addBump(tx, ty) { G.L.bumps.push({ tx: tx, ty: ty, t: 0 }); }

function killOnTop(tx, ty) {
  const L = G.L, m = G.m;
  L.enemies.forEach(function (e) {
    if (e.state === 'dead' || e.state === 'squish') return;
    if (e.x + e.w > tx * TS && e.x < tx * TS + TS && Math.abs(e.y + e.h - ty * TS) < 6) {
      knockOff(e, (e.x + e.w / 2) < (m.x + m.w / 2) ? -1 : 1);
      addScore(100); popup(e.x, e.y - 8, 100);
    }
  });
  L.items.forEach(function (it) {
    if (it.emerge > 0) return;
    if (it.x + it.w > tx * TS && it.x < tx * TS + TS && Math.abs(it.y + it.h - ty * TS) < 6) {
      it.vy = -3; if (it.kind !== 'flower') it.vx = (it.x + it.w / 2) < (m.x + m.w / 2) ? -Math.abs(it.vx || 1) : Math.abs(it.vx || 1);
    }
  });
}

function knockOff(e, dir) {
  e.state = 'dead'; e.vy = -3; e.vx = dir * 0.6; e.flipped = true;
  Sound.play('kick');
}

function hitBlock(tx, ty) {
  const a = G.area, m = G.m, key = tx + ',' + ty, b = a.blocks[key], t = getTile(a, tx, ty);
  if (t === T.BRICK) {
    if (b && b.content === 'multicoin') {
      b.hits++; if (b.hits === 1) b.timer = 240;
      coinPop(tx, ty); addBump(tx, ty);
      if (b.hits >= 10 || (b.hits > 1 && b.timer <= 0)) setTile(a, tx, ty, T.USED);
    } else if (b && b.content === 'star') {
      setTile(a, tx, ty, T.USED); addBump(tx, ty); spawnItem('star', tx, ty);
    } else if (m.big) {
      setTile(a, tx, ty, T.AIR); addScore(50);
      const cx = tx * TS + 8, cy = ty * TS + 8;
      [[-4, -5, -1.5], [4, -5, 1.5], [-4, 4, -1], [4, 4, 1]].forEach(function (p) {
        G.L.fx.push({ k: 'debris', x: cx + p[0] - 4, y: cy + (p[1] > 0 ? 0 : -8), vx: p[2], vy: p[1] > 0 ? -3 : -5, t: 0 });
      });
      Sound.play('brick');
    } else { addBump(tx, ty); Sound.play('bump'); }
  } else if (t === T.Q || t === T.HIDDEN) {
    const c = b ? b.content : 'coin';
    setTile(a, tx, ty, T.USED); addBump(tx, ty);
    if (c === 'coin') coinPop(tx, ty);
    else if (c === 'power') spawnItem(m.big ? 'flower' : 'mushroom', tx, ty);
    else if (c === 'oneup') spawnItem('oneup', tx, ty);
    else if (c === 'star') spawnItem('star', tx, ty);
  } else {
    Sound.play('bump');
  }
  killOnTop(tx, ty);
}

function coinPop(tx, ty) {
  G.L.fx.push({ k: 'coinpop', x: tx * TS, y: ty * TS - 16, vy: -6.4, t: 0, y0: ty * TS - 16 });
  G.coins++;
  if (G.coins >= 100) { G.coins -= 100; oneUp(tx * TS, ty * TS - 16); }
  addScore(200);
  Sound.play('coin');
}

// ------------------------------------------------------------------ Mario
function marioPalette() {
  if (G.m.star > 0) return (G.tick >> 2) % 4;
  return G.m.fire ? 1 : 0;
}

function hurtMario() {
  const m = G.m;
  if (m.invuln > 0 || m.star > 0 || m.state !== 'normal') return;
  if (m.big) {
    m.state = 'shrink'; m.t = 0; G.freeze = 48; Sound.play('pipe');
  } else {
    killMario();
  }
}

function killMario(fell) {
  const m = G.m;
  if (m.state === 'die') return;
  m.state = 'die'; m.t = 0; m.vx = 0; m.vy = 0;
  m.noJump = !!fell;
  m.star = 0;
  Sound.play('die');
}

function growMario(toFire) {
  const m = G.m;
  if (!m.big) { m.state = 'grow'; m.t = 0; G.freeze = 48; }
  else if (toFire && !m.fire) { m.state = 'flower'; m.t = 0; G.freeze = 32; }
  Sound.play('powerup');
}

function collectItem(it) {
  const m = G.m;
  it.dead = true;
  if (it.kind === 'mushroom') { addScore(1000); popup(it.x, it.y, 1000); if (!m.big) growMario(false); else Sound.play('powerup'); }
  else if (it.kind === 'flower') { addScore(1000); popup(it.x, it.y, 1000); growMario(true); }
  else if (it.kind === 'star') { addScore(1000); popup(it.x, it.y, 1000); m.star = 640; Sound.play('powerup'); }
  else if (it.kind === 'oneup') { oneUp(it.x, it.y); }
}

function enterPipe(kind) {
  const m = G.m;
  m.state = 'pipe'; m.t = 0; m.pipeKind = kind; m.vx = 0; m.vy = 0;
  Sound.play('pipe');
}

function updateMarioNormal() {
  const m = G.m, a = G.area;
  m.prevY = m.y;
  if (m.onGround) m.jband = 0;
  const dirIn = (K.right ? 1 : 0) - (K.left ? 1 : 0);

  // pipe entries
  if (K.down && m.onGround && a.theme === 'over') {
    for (let i = 0; i < a.pipes.length; i++) {
      const p = a.pipes[i];
      if (!p.entry) continue;
      const cx = m.x + m.w / 2;
      if (cx > p.x * TS + 4 && cx < p.x * TS + 28 && Math.abs(m.y + m.h - p.top * TS) < 1) { enterPipe('down'); return; }
    }
  }
  if (a.theme === 'under' && a.hpipe && K.right && m.onGround && m.x + m.w >= a.hpipe.x * TS - 0.5 && m.y + m.h > a.hpipe.y * TS + 16) {
    enterPipe('right'); return;
  }

  // crouch (big only)
  if (m.big) {
    if (K.down && m.onGround && !m.crouch) { m.crouch = true; m.y += 16; m.h = 16; }
    else if (m.crouch && (!K.down)) {
      // stand up only if there is room
      const ny = m.y - 16;
      const t0 = Math.floor(ny / TS), tx0 = Math.floor(m.x / TS), tx1 = Math.floor((m.x + m.w - 1) / TS);
      let blocked = false;
      for (let tx = tx0; tx <= tx1; tx++) if (isSolid(getTile(a, tx, t0))) blocked = true;
      if (!blocked) { m.crouch = false; m.y = ny; m.h = 32; }
    }
  }

  // horizontal
  const running = K.b;
  if (m.onGround) {
    m.skidding = false;
    const max = running ? PH.runMax : PH.walkMax;
    if (dirIn !== 0 && !m.crouch) {
      if (m.vx * dirIn < -0.2) {
        m.skidding = true;
        m.vx += dirIn * PH.skid;
        if (G.tick % 6 === 0) Sound.play('skid');
      } else {
        m.dir = dirIn;
        if (Math.abs(m.vx) > max) m.vx -= Math.sign(m.vx) * PH.friction;
        else m.vx += dirIn * (running ? PH.runAcc : PH.walkAcc);
        if (Math.abs(m.vx) > max && Math.abs(m.vx) - max < 0.06) m.vx = Math.sign(m.vx) * max;
      }
      if (m.skidding) m.dir = Math.sign(m.vx) || m.dir;
    } else {
      if (Math.abs(m.vx) <= PH.friction) m.vx = 0;
      else m.vx -= Math.sign(m.vx) * PH.friction;
    }
  } else if (dirIn !== 0) {
    m.dir = dirIn;
    if (m.vx * dirIn < 0) m.vx += dirIn * PH.walkAcc * 1.6;
    else if (Math.abs(m.vx) < m.airMax) {
      m.vx += dirIn * (m.airMax > PH.walkMax ? PH.runAcc : PH.walkAcc);
      if (Math.abs(m.vx) > m.airMax) m.vx = Math.sign(m.vx) * m.airMax;
    }
  }

  // jump
  if (K.aEdge && m.onGround) {
    const band = jumpBand(m.vx);
    m.vy = PH.v0[band]; m.jband = band; m.jumping = true; m.onGround = false;
    m.airMax = Math.abs(m.vx) >= 1.5625 ? PH.runMax : PH.walkMax;
    Sound.play(m.big ? 'jumpBig' : 'jumpSmall');
  }

  // fireball
  if (K.bEdge && m.fire && !m.crouch && G.L.fireballs.length < 2) {
    G.L.fireballs.push({ x: m.x + (m.dir > 0 ? m.w - 2 : -6), y: m.y + 8, w: 8, h: 8, vx: m.dir * 4, vy: 2, t: 0 });
    Sound.play('fireball');
    m.throwT = 8;
  }
  if (m.throwT > 0) m.throwT--;

  // gravity
  const band = m.jband || 0;
  {
    let g = PH.fall[band];
    if (m.vy < 0 && K.a && m.jumping) g = PH.hold[band];
    else if (m.vy < 0 && m.bounceHold && K.a) g = 0.15;
    m.vy = Math.min(m.vy + g, PH.maxFall);
  }

  // move
  m.onGround = false;
  const blocked = moveX(m, m.vx);
  if (blocked) m.vx = 0;
  if (m.x < G.cam) { m.x = G.cam; if (m.vx < 0) m.vx = 0; }
  if (a.end && m.x + m.w > a.end) { m.x = a.end - m.w; m.vx = 0; }
  const r = moveY(m, m.vy);
  if (r === 'floor') {
    m.jumping = false; m.bounceHold = false; G.stompChain = 0;
  } else if (r && typeof r === 'object') {
    m.jumping = false;
    hitBlock(r.tx, r.ty);
  }

  m.dist += Math.abs(m.vx);

  if (m.invuln > 0) m.invuln--;
  if (m.star > 0) m.star--;

  // fell into a pit
  if (m.y > H + 8) killMario(true);

  // flagpole
  if (a.flagX !== undefined && !G.seq) {
    const px = a.flagX * TS + 6;
    if (m.x + m.w > px && m.x < px + 4 && m.y + m.h > 48 && m.y < 192) grabPole();
  }
}

function grabPole() {
  const m = G.m, a = G.area;
  const feet = m.y + m.h;
  const sc = feet < 72 ? 5000 : feet < 104 ? 2000 : feet < 136 ? 800 : feet < 168 ? 400 : 100;
  addScore(sc);
  popup(a.flagX * TS + 20, Math.max(40, feet - 16), sc);
  G.seq = { phase: 'slide', t: 0, flagY: 56, castleFlag: 0, fw: 0, fwT: 0, bonusT: 0 };
  G.seq.timeDigit = G.time % 10;
  m.state = 'pole'; m.vx = 0; m.vy = 0; m.t = 0;
  m.x = a.flagX * TS + 8 - m.w + 1;
  m.star = 0;
  Sound.play('flagpole');
}

function updateMario() {
  const m = G.m, a = G.area;
  switch (m.state) {
    case 'normal': updateMarioNormal(); break;
    case 'grow': case 'flower': case 'shrink':
      // frozen; handled by freeze counter
      break;
    case 'die':
      m.t++;
      if (m.t === 1 && m.noJump) { m.vy = 0; }
      if (m.t < 25 && !m.noJump) break;
      if (m.t === 25 && !m.noJump) m.vy = -4.5;
      m.vy = Math.min(m.vy + 0.25, 4);
      m.y += m.vy;
      if (m.y > H + 120 && !m.over) { m.over = true; m.t = 0; }
      if (m.over && m.t > 110) afterDeath();
      break;
    case 'pole': {
      const s = G.seq;
      s.t++;
      if (s.phase === 'slide') {
        const bottom = 192;
        if (m.y + m.h < bottom) m.y = Math.min(m.y + 2, bottom - m.h);
        if (s.flagY < 176) s.flagY = Math.min(176, s.flagY + 2.5);
        if (m.y + m.h >= bottom && s.flagY >= 176) { s.phase = 'wait'; s.t = 0; }
      } else if (s.phase === 'wait') {
        m.x = a.flagX * TS + 8 + 1; m.dir = -1;
        if (s.t > 24) {
          s.phase = 'walk'; s.t = 0; m.state = 'autowalk'; m.dir = 1; m.vy = 0;
          Sound.play('clear');
        }
      }
      break;
    }
    case 'autowalk': {
      const door = (a.castleX + 2.5) * TS;
      m.onGround = false;
      m.vy = Math.min(m.vy + 0.4, PH.maxFall);
      moveX(m, 1.3);
      moveY(m, m.vy);
      m.dist += 1.3;
      if (m.x + m.w / 2 >= door) { m.state = 'castle'; m.hidden = true; G.seq.phase = 'raise'; G.seq.t = 0; }
      break;
    }
    case 'castle': break;
    case 'pipe': {
      m.t++;
      if (m.pipeKind === 'down') {
        m.y += 0.9;
        if (m.t > 40) switchArea('bonus');
      } else if (m.pipeKind === 'right') {
        m.x += 0.7;
        if (m.t > 40) switchArea('over');
      } else if (m.pipeKind === 'up') {
        m.y -= 0.9;
        if (m.t > 36) { m.state = 'normal'; m.y = 11 * TS - m.h; }
      }
      break;
    }
  }
}

function switchArea(which) {
  const m = G.m;
  if (which === 'bonus') {
    G.bonus = buildBonus();
    G.bonus.L = liveState();
    G.bonus.coins.forEach(function (c) { G.bonus.L.pickups.push({ k: 'coin', x: c.x * TS, y: c.y * TS, w: 16, h: 16 }); });
    G.area = G.bonus; G.L = G.bonus.L; G.cam = 0;
    m.x = G.bonus.start.x; m.y = G.bonus.start.y - (m.big ? 16 : 0); m.vx = 0; m.vy = 0;
    m.state = 'normal'; m.onGround = false; m.jband = 0; m.jumping = false;
  } else {
    G.area = G.over; G.L = G.over.L;
    const px = 163 * TS;
    G.cam = Math.max(0, Math.min(px - 112, G.over.end - W));
    m.x = px + 10; m.y = 11 * TS - m.h + 32; m.vx = 0; m.vy = 0; m.state = 'pipe'; m.pipeKind = 'up'; m.t = 0;
    m.onGround = true; m.dir = 1;
  }
}

function afterDeath() {
  G.lives--;
  if (G.lives <= 0) { G.mode = 'gameover'; G.timer = 0; Sound.play('gameOver'); }
  else { buildLevel(); startIntro(); }
}

// ------------------------------------------------------------------ enemies / items / fx
function updateEnemies() {
  const L = G.L, m = G.m, cam = G.cam;
  for (let i = L.enemies.length - 1; i >= 0; i--) {
    const e = L.enemies[i];
    if (!e.active) { if (e.x < cam + W + 16) e.active = true; else continue; }
    if (e.state === 'dead') {
      e.vy = Math.min(e.vy + 0.3, 4); e.y += e.vy; e.x += e.vx;
      if (e.y > H + 20) L.enemies.splice(i, 1);
      continue;
    }
    if (e.state === 'squish') { if (++e.t > 30) L.enemies.splice(i, 1); continue; }
    if (e.x + e.w < cam - 40 || e.y > H + 20) { L.enemies.splice(i, 1); continue; }

    if (e.kind === 'koopa' && e.state === 'shell') {
      e.t++;
      if (e.t > 420) { e.state = 'walk'; e.h = 22; e.y -= 8; e.vx = -0.5; e.t = 0; }
    }
    // physics
    const speedX = e.state === 'shell' ? 0 : e.vx;
    e.onGround = false;
    e.vy = Math.min(e.vy + 0.3, 4);
    if (moveX(e, speedX)) {
      if (e.state === 'shellMove') Sound.play('bump');
      e.vx = -e.vx;
    }
    moveY(e, e.vy);
    if (e.grace > 0) e.grace--;

    if (e.state === 'shellMove') shellHits(e);

    // vs Mario
    if (m.state === 'normal' && overlap(m, e)) marioVsEnemy(e);
  }
}

function shellHits(s) {
  G.L.enemies.forEach(function (o) {
    if (o === s || o.state === 'dead' || o.state === 'squish' || !o.active) return;
    if (!overlap(s, o)) return;
    knockOff(o, s.vx > 0 ? 1 : -1);
    s.chain = (s.chain || 0);
    chainScore(SHELL, s.chain++, o.x, o.y - 8);
  });
}

function kickShell(e, dir) {
  e.state = 'shellMove'; e.vx = dir * 3.2; e.grace = 12; e.chain = 0;
  Sound.play('kick');
}

function marioVsEnemy(e) {
  const m = G.m;
  if (m.star > 0) {
    knockOff(e, m.dir);
    addScore(100); popup(e.x, e.y - 8, 100);
    return;
  }
  const mc = m.x + m.w / 2, ec = e.x + e.w / 2;
  if (e.kind === 'koopa' && e.state === 'shell') {
    // kick the idle shell
    kickShell(e, mc < ec ? 1 : -1);
    addScore(400); popup(e.x, e.y - 8, 400);
    if (m.vy > 0 && m.prevY + m.h <= e.y + 8) { m.vy = -4; m.bounceHold = K.a; m.jumping = false; }
    return;
  }
  if (e.grace > 0) return;
  const stomp = m.vy > 0 && (m.prevY + m.h) <= e.y + 10;
  if (stomp) {
    Sound.play('stomp');
    m.vy = -4; m.onGround = false; m.bounceHold = true; m.jumping = false; m.jband = 0;
    m.y = e.y - m.h;
    if (e.kind === 'goomba') {
      e.state = 'squish'; e.t = 0;
      e.y += e.h - 8; e.h = 8;
    } else if (e.state === 'shellMove') {
      e.state = 'shell'; e.vx = 0; e.t = 0;
    } else {
      e.state = 'shell'; e.vx = 0; e.t = 0; e.y += 8; e.h = 14;
    }
    chainScore(STOMP, G.stompChain++, e.x, e.y - 8);
  } else {
    hurtMario();
  }
}

function updateItems() {
  const L = G.L, m = G.m;
  for (let i = L.items.length - 1; i >= 0; i--) {
    const it = L.items[i];
    if (it.dead) { L.items.splice(i, 1); continue; }
    it.t++;
    if (it.emerge > 0) {
      it.y -= 0.5; it.emerge -= 0.5;
      if (it.emerge <= 0) { it.emerge = 0; it.y = Math.round(it.y); }
      continue;
    }
    if (it.kind !== 'flower') {
      it.vy = Math.min(it.vy + (it.kind === 'star' ? 0.25 : 0.3), 4);
      it.onGround = false;
      if (moveX(it, it.vx)) it.vx = -it.vx;
      moveY(it, it.vy);
      if (it.onGround && it.kind === 'star') it.vy = -3.6;
    }
    if (it.x + it.w < G.cam - 32 || it.y > H + 20) { L.items.splice(i, 1); continue; }
    if (m.state === 'normal' && overlap(m, it)) collectItem(it);
  }
  // static pickups (bonus coins)
  for (let i = L.pickups.length - 1; i >= 0; i--) {
    const p = L.pickups[i];
    if (m.state === 'normal' && overlap(m, { x: p.x + 4, y: p.y + 1, w: 8, h: 14 })) {
      L.pickups.splice(i, 1); G.coins++;
      if (G.coins >= 100) { G.coins -= 100; oneUp(p.x, p.y); }
      addScore(200); Sound.play('coin');
    }
  }
}

function updateFireballs() {
  const L = G.L;
  for (let i = L.fireballs.length - 1; i >= 0; i--) {
    const f = L.fireballs[i];
    f.t++;
    if (f.dead) { if (++f.dt > 6) L.fireballs.splice(i, 1); continue; }
    f.vy = Math.min(f.vy + 0.3, 4);
    f.onGround = false;
    const wall = moveX(f, f.vx);
    const r = moveY(f, f.vy);
    if (r === 'floor') f.vy = -3.2;
    else if (r) { f.dead = true; f.dt = 0; Sound.play('fireHit'); }
    if (wall) { f.dead = true; f.dt = 0; Sound.play('fireHit'); }
    if (f.x < G.cam - 8 || f.x > G.cam + W + 8 || f.y > H) { L.fireballs.splice(i, 1); continue; }
    if (f.dead) continue;
    for (let j = 0; j < L.enemies.length; j++) {
      const e = L.enemies[j];
      if (e.state === 'dead' || e.state === 'squish' || !e.active) continue;
      if (overlap(f, e)) {
        knockOff(e, f.vx > 0 ? 1 : -1);
        const sc = e.kind === 'goomba' ? 100 : 200;
        addScore(sc); popup(e.x, e.y - 8, sc);
        f.dead = true; f.dt = 0;
        break;
      }
    }
  }
}

function updateFx() {
  const L = G.L;
  for (let i = L.fx.length - 1; i >= 0; i--) {
    const f = L.fx[i];
    f.t++;
    if (f.k === 'pop') { f.y -= 0.8; if (f.t > 40) L.fx.splice(i, 1); }
    else if (f.k === 'debris') { f.vy += 0.3; f.x += f.vx; f.y += f.vy; if (f.y > H + 20) L.fx.splice(i, 1); }
    else if (f.k === 'coinpop') {
      f.vy += 0.32; f.y += f.vy;
      if (f.vy > 0 && f.y >= f.y0) { popup(f.x, f.y0 - 4, 200); L.fx.splice(i, 1); }
    }
    else if (f.k === 'firework') { if (f.t > 40) L.fx.splice(i, 1); }
  }
  for (let i = L.bumps.length - 1; i >= 0; i--) { if (++L.bumps[i].t > 12) L.bumps.splice(i, 1); }
  // multi-coin brick timers
  const a = G.area;
  Object.keys(a.blocks).forEach(function (k) { if (a.blocks[k].timer > 0) a.blocks[k].timer--; });
}

// ------------------------------------------------------------------ flag / castle / countdown sequence
function updateSequence() {
  const s = G.seq, m = G.m;
  if (!s) return;
  if (s.phase === 'raise') {
    s.t++;
    s.castleFlag = Math.min(16, s.t * 0.4);
    if (s.t > 60) { s.phase = 'count'; s.t = 0; }
  } else if (s.phase === 'count') {
    if (G.time > 0) {
      const n = Math.min(G.time, 2);
      G.time -= n; addScore(50 * n);
      if (G.tick % 2 === 0) Sound.play('countdown');
    } else {
      s.phase = 'fireworks'; s.t = 0;
      s.fw = { 1: 1, 3: 3, 6: 6 }[s.timeDigit] || 0;
      s.fwT = 20;
    }
  } else if (s.phase === 'fireworks') {
    s.t++;
    if (s.fw > 0 && --s.fwT <= 0) {
      s.fw--; s.fwT = 24;
      const cx = (G.area.castleX + 2.5) * TS;
      const pos = [[0, -70], [-28, -90], [30, -84], [-10, -100], [24, -64], [-36, -60]];
      const p = pos[(s.fwCount = (s.fwCount || 0) + 1) % pos.length];
      G.L.fx.push({ k: 'firework', x: cx + p[0], y: 208 + p[1], t: 0 });
      addScore(500); Sound.play('firework');
    }
    if (s.fw === 0 && s.t > (s.fwCount ? 70 : 50)) { s.phase = 'done'; s.t = 0; }
  } else if (s.phase === 'done') {
    s.t++;
    if (s.t > 200) { G.mode = 'clear'; G.timer = 0; }
  }
  void m;
}

// ------------------------------------------------------------------ main update
function updatePlay() {
  const m = G.m;
  G.tick++;
  if (G.paused) return;

  if (G.freeze > 0) {
    G.freeze--;
    m.t++;
    if (G.freeze === 0) {
      if (m.state === 'grow') { m.big = true; m.state = 'normal'; m.y -= 16; m.h = 32; m.onGround = true; }
      else if (m.state === 'flower') { m.fire = true; m.state = 'normal'; }
      else if (m.state === 'shrink') { m.big = false; m.fire = false; m.crouch = false; m.state = 'normal'; m.y += 16; m.h = 16; m.invuln = 120; }
    }
    return;
  }

  // timer
  if (m.state === 'normal' && !G.seq) {
    if (++G.timeTick >= 24) {
      G.timeTick = 0; G.time--;
      if (G.time === 100 && !G.hurried) { G.hurried = true; Sound.play('warning'); }
      if (G.time <= 0) { G.time = 0; killMario(); }
    }
  }

  updateMario();
  updateEnemies();
  updateItems();
  updateFireballs();
  updateFx();
  updateSequence();

  // camera
  const a = G.area;
  if (!a.fixed && m.state !== 'die' && m.state !== 'pipe') {
    const target = m.x - 112;
    if (target > G.cam) G.cam = Math.min(target, a.end - W);
  }
  if (a.fixed) G.cam = 0;
}

function update() {
  if (K.startEdge) {
    if (G.mode === 'title') { Sound.play('start'); G.lives = 3; G.score = 0; G.coins = 0; buildLevel(); startIntro(); }
    else if (G.mode === 'play' && G.m.state === 'normal') { G.paused = !G.paused; Sound.play('pause'); }
    else if (G.mode === 'clear' && G.timer > 30) { newGame(); }
    else if (G.mode === 'gameover' && G.timer > 60) { newGame(); }
  }
  G.timer++;
  if (G.mode === 'intro') { if (G.timer > 150) startPlay(); }
  else if (G.mode === 'play') updatePlay();
  else if (G.mode === 'gameover') { if (G.timer > 300) newGame(); }
  else if (G.mode === 'clear') { if (G.timer > 600) newGame(); }
  else if (G.mode === 'title') { G.tick++; }
  K.aEdge = false; K.bEdge = false; K.startEdge = false;
}

function buildTitle() {
  G.over = buildWorld11();
  G.over.L = liveState();
  G.area = G.over; G.L = G.over.L; G.cam = 0;
  G.m = newMario();
}

// ------------------------------------------------------------------ rendering
function img(i, x, y) { ctx.drawImage(i, Math.round(x), Math.round(y)); }
function imgFlip(i, x, y, flip) {
  if (!flip) { img(i, x, y); return; }
  ctx.save(); ctx.translate(Math.round(x) + i.width, Math.round(y)); ctx.scale(-1, 1); ctx.drawImage(i, 0, 0); ctx.restore();
}

function pad(n, len) { let s = String(Math.max(0, n)); while (s.length < len) s = '0' + s; return s; }

function drawHud() {
  drawText(ctx, 'MARIO', 24, 8);
  drawText(ctx, pad(G.score, 6), 24, 16);
  // coin icon + count
  const cf = ART.coin[((G.tick >> 3) % 4)];
  ctx.drawImage(cf, 0, 0, 16, 16, 87, 12, 8, 8);
  drawText(ctx, 'x' + pad(G.coins, 2), 96, 16);
  drawText(ctx, 'WORLD', 144, 8);
  drawText(ctx, '1-1', 152, 16);
  drawText(ctx, 'TIME', 200, 8);
  if (G.mode === 'play' || G.mode === 'clear') drawText(ctx, pad(G.time, 3), 208, 16);
}

function tileImage(a, t, tick) {
  const th = ART.theme[a.theme];
  switch (t) {
    case T.GROUND: return th.ground;
    case T.BRICK: return th.brick;
    case T.Q: return ART.q[[0, 0, 0, 0, 1, 2, 1, 0][(tick >> 3) & 7]];
    case T.USED: return th.used;
    case T.HARD: return th.hard;
    default: return null;
  }
}

function drawTiles() {
  const a = G.area, cam = Math.round(G.cam), L = G.L;
  const x0 = Math.floor(cam / TS), x1 = Math.min(a.w - 1, x0 + 17);
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const t = a.tiles[ty * a.w + tx];
      if (t === T.AIR || t === T.HIDDEN) continue;
      const px = tx * TS - cam;
      let py = ty * TS, im;
      if (t >= T.PIPE_TL && t <= T.PIPE_BR) {
        const src = t <= T.PIPE_TR ? ART.pipe.top : ART.pipe.body;
        ctx.drawImage(src, (t === T.PIPE_TL || t === T.PIPE_BL) ? 0 : 16, 0, 16, 16, px, py, 16, 16);
        continue;
      }
      if (a.hpipe && t === T.HARD && tx >= a.hpipe.x && ty >= a.hpipe.y) continue;
      im = tileImage(a, t, G.tick);
      if (!im) continue;
      for (let i = 0; i < L.bumps.length; i++) {
        const b = L.bumps[i];
        if (b.tx === tx && b.ty === ty) py -= [2, 5, 7, 8, 8, 7, 6, 5, 3, 2, 1, 0, 0][b.t] || 0;
      }
      ctx.drawImage(im, px, py);
    }
  }
}

function marioFrameName(m) {
  if (m.state === 'die') return 'die';
  if (m.state === 'pole') return ((m.t >> 3) & 1) && G.seq.phase === 'slide' ? 'climb2' : 'climb1';
  if (m.crouch) return 'duck';
  if (!m.onGround && m.state !== 'autowalk') return 'jump';
  if (m.state === 'autowalk' && !m.onGround) return 'walk2';
  if (m.skidding) return 'skid';
  if (Math.abs(m.vx) > 0.05 || m.state === 'autowalk') return ['walk1', 'walk2', 'walk3'][Math.floor(m.dist / 9) % 3];
  return 'stand';
}

function drawMario(behindTiles) {
  const m = G.m, cam = Math.round(G.cam);
  if (m.hidden) return;
  if ((m.state === 'pipe') !== !!behindTiles) return;
  if (m.invuln > 0 && (G.tick & 2)) return;
  let big = m.big;
  if (m.state === 'grow') big = ((m.t >> 2) & 1) === 1;
  else if (m.state === 'shrink') big = ((m.t >> 2) & 1) === 0;
  let pal = marioPalette();
  if (m.state === 'flower') pal = (m.t >> 2) & 3;
  let name = marioFrameName(m);
  if (m.state === 'pole' && m.big) name = 'stand';
  const size = big ? 'big' : 'small';
  if (size === 'small' && name === 'duck') name = 'stand';
  const frame = marioFrame(size, name, pal);
  const feet = m.y + m.h;
  const x = m.x - cam - (size === 'big' ? 2 : 0);
  let flip = m.dir < 0;
  if (m.state === 'pole') flip = G.seq && G.seq.phase === 'wait';
  imgFlip(frame, x, feet - frame.height, flip);
}

function drawEnemy(e, cam) {
  const x = e.x - cam - 1;
  let f;
  if (e.kind === 'goomba') {
    f = e.state === 'squish' ? ART.goomba.flat : ((G.tick >> 4) & 1) ? ART.goomba.b : ART.goomba.a;
  } else if (e.state === 'shell' || e.state === 'shellMove' || (e.state === 'dead' && e.h < 22)) {
    f = ART.koopa.shell;
  } else {
    const set = e.vx > 0 ? ART.koopaR : ART.koopa;
    f = ((G.tick >> 4) & 1) ? set.b : set.a;
  }
  const y = e.y + e.h - f.height + (e.kind === 'goomba' ? 0 : 0);
  if (e.flipped) ctx.drawImage(vflipped(f), Math.round(x), Math.round(y));
  else img(f, x, y);
}

function drawEntities(cam) {
  const L = G.L;
  L.enemies.forEach(function (e) { if (e.active && e.x - cam < W + 16 && e.x - cam > -32) drawEnemy(e, cam); });
  L.items.forEach(function (it) {
    if (it.emerge > 0) return;
    drawItem(it, cam);
  });
  L.fireballs.forEach(function (f) {
    if (f.dead) img(ART.fire.burst[f.dt > 3 ? 1 : 0], f.x - cam - 4, f.y - 4);
    else img(ART.fire.balls[(f.t >> 1) & 3], f.x - cam, f.y);
  });
}

function drawItem(it, cam) {
  let im;
  if (it.kind === 'mushroom') im = ART.item.mush;
  else if (it.kind === 'oneup') im = ART.item.oneup;
  else if (it.kind === 'flower') im = ART.item.flowers[(G.tick >> 3) & 3];
  else im = ART.item.stars[(G.tick >> 2) & 3];
  img(im, it.x - cam, it.y);
}

function drawFx(cam) {
  G.L.fx.forEach(function (f) {
    if (f.k === 'pop') drawTiny(ctx, f.text, Math.round(f.x - cam), Math.round(f.y));
    else if (f.k === 'debris') {
      const th = ART.theme[G.area.theme].brick;
      ctx.drawImage(th, 0, 0, 8, 8, Math.round(f.x - cam), Math.round(f.y), 8, 8);
    } else if (f.k === 'coinpop') img(ART.coin[(f.t >> 1) & 3], f.x - cam, f.y);
    else if (f.k === 'firework') {
      const r = 4 + f.t * 0.7, n = 10;
      ctx.fillStyle = (f.t >> 2) & 1 ? '#FCFCFC' : '#FCA044';
      for (let i = 0; i < n; i++) {
        const ang = i / n * Math.PI * 2;
        ctx.fillRect(Math.round(f.x - cam + Math.cos(ang) * r), Math.round(f.y + Math.sin(ang) * r), 2, 2);
      }
    }
  });
}

function drawScenery(cam) {
  G.area.scenery.forEach(function (s) {
    const sx = s.x - cam;
    let im;
    if (s.k === 'hillL') im = ART.hillL;
    else if (s.k === 'hillS') im = ART.hillS;
    else if (s.k === 'cloud') im = ART.cloud[s.n];
    else im = ART.bush[s.n];
    if (sx + im.width < 0 || sx > W) return;
    img(im, sx, s.y);
  });
}

function drawFlagAndCastle(cam) {
  const a = G.area;
  if (a.flagX === undefined) return;
  const px = a.flagX * TS + 7 - cam;
  // pole
  ctx.fillStyle = '#80D010'; ctx.fillRect(px, 48, 2, 144);
  ctx.fillStyle = '#00A800'; ctx.fillRect(px + 1, 48, 1, 144);
  img(ART.flag.ball, px - 3, 40);
  const fy = G.seq ? G.seq.flagY : 56;
  img(ART.flag.flag, px - 15, fy);
  // castle
  const cx = a.castleX * TS - cam;
  img(ART.castle, cx, 208 - 80);
  const doorX = cx + 40;
  ctx.fillStyle = '#80D010'; ctx.fillRect(doorX - 1, 208 - 80 - 24, 2, 24);
  const cf = G.seq ? G.seq.castleFlag : 0;
  ctx.drawImage(ART.flag.castleFlag, 0, 0, 16, 7, doorX - 15, 208 - 80 - 4 - Math.round(cf), 16, 7);
}

function drawPlay() {
  const a = G.area, cam = Math.round(G.cam), th = ART.theme[a.theme];
  ctx.fillStyle = th.bg; ctx.fillRect(0, 0, W, H);
  drawScenery(cam);
  // things that emerge from / slip behind tiles
  G.L.items.forEach(function (it) { if (it.emerge > 0) drawItem(it, cam); });
  drawMario(true);
  drawFlagAndCastle(cam);
  drawTiles();
  if (a.hpipe) img(ART.hpipe, a.hpipe.x * TS - cam, a.hpipe.y * TS);
  G.L.pickups.forEach(function (p) { img(ART.coin[(G.tick >> 3) & 3], p.x - cam, p.y); });
  drawEntities(cam);
  drawMario(false);
  drawFx(cam);
  drawHud();
  if (G.paused) drawText(ctx, 'PAUSE', 108, 112);
}

function drawIntro() {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  drawHud();
  drawText(ctx, 'WORLD 1-1', 88, 80);
  img(marioFrame('small', 'stand', 0), 92, 112);
  drawText(ctx, 'x', 116, 116);
  drawText(ctx, String(G.lives), 140, 116);
}

function text2x(str, x, y, color, shadow) {
  str = str.toUpperCase();
  for (let i = 0; i < str.length; i++) {
    const g = fontGlyph(str[i], shadow);
    const h = fontGlyph(str[i], color);
    if (!g) continue;
    ctx.drawImage(g, 0, 0, 8, 8, x + i * 16 + 2, y + 2, 16, 16);
    ctx.drawImage(h, 0, 0, 8, 8, x + i * 16, y, 16, 16);
  }
}

function drawTitle() {
  const th = ART.theme.over;
  ctx.fillStyle = th.bg; ctx.fillRect(0, 0, W, H);
  drawScenery(0);
  for (let tx = 0; tx < 16; tx++) { img(th.ground, tx * 16, 208); img(th.ground, tx * 16, 224); }
  // pipe + blocks just for atmosphere
  addTitleBlocks();
  img(marioFrame('small', 'stand', 0), 40, 192);
  // logo plate
  ctx.fillStyle = '#000'; ctx.fillRect(32, 40, 192, 72);
  for (let i = 0; i < 12; i++) { img(th.brick, 32 + i * 16, 36); img(th.brick, 32 + i * 16, 108); }
  ctx.fillStyle = '#C84C0C'; ctx.fillRect(32, 44, 192, 64);
  ctx.fillStyle = '#000'; ctx.fillRect(36, 48, 184, 56);
  text2x('SUPER', 88, 54, '#FCA044', '#9C4B0C');
  text2x('MARIO BROS.', 40, 78, '#FCFCFC', '#B53120');
  drawHud();
  const touch = document.body.classList.contains('touch');
  drawText(ctx, touch ? 'TAP TO START' : 'PRESS ENTER', touch ? 80 : 88, 136);
  img(ART.item.mush, 64, 130);
  drawText(ctx, 'TOP- ' + pad(G.top, 6), 80, 160);
  drawText(ctx, 'FAN RECREATION', 56, 232, '#FCBCB0');
}

function addTitleBlocks() { /* decorative only; kept minimal */ }

function drawGameOver() {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  drawHud();
  drawText(ctx, 'GAME OVER', 88, 112);
}

function drawClear() {
  drawPlay();
  drawText(ctx, 'COURSE CLEAR!', 76, 72);
  if (G.timer > 60) drawText(ctx, 'THANK YOU FOR PLAYING', 44, 96);
  if (G.timer > 90) drawText(ctx, 'ONLY WORLD 1-1 EXISTS', 44, 120);
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  if (G.mode === 'title') drawTitle();
  else if (G.mode === 'intro') drawIntro();
  else if (G.mode === 'gameover') drawGameOver();
  else if (G.mode === 'clear') drawClear();
  else drawPlay();
}

// ------------------------------------------------------------------ input
const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowDown: 'down', KeyS: 'down', ArrowUp: 'up', KeyW: 'up',
  KeyX: 'a', KeyK: 'a', Space: 'a', KeyZ: 'b', KeyJ: 'b', ShiftLeft: 'b'
};
window.addEventListener('keydown', function (e) {
  Sound.init();
  if (e.code === 'Enter' || e.code === 'KeyP') { if (!e.repeat) K.startEdge = true; e.preventDefault(); return; }
  if (e.code === 'KeyM') { Sound.toggleMute(); return; }
  const k = KEYMAP[e.code];
  if (!k) return;
  e.preventDefault();
  if (!K[k] && (k === 'a')) K.aEdge = true;
  if (!K[k] && (k === 'b')) K.bEdge = true;
  K[k] = true;
});
window.addEventListener('keyup', function (e) {
  const k = KEYMAP[e.code];
  if (k) { K[k] = false; e.preventDefault(); }
});
window.addEventListener('blur', function () { ['left', 'right', 'down', 'up', 'a', 'b'].forEach(function (k) { K[k] = false; }); });

function setupTouch() {
  if (!('ontouchstart' in window) && !(navigator.maxTouchPoints > 0)) return;
  document.body.classList.add('touch');
  const down = new Set();
  function press(btn, on) {
    const k = btn.dataset.k;
    if (on) { Sound.init(); if (k === 'a' && !K.a) K.aEdge = true; if (k === 'b' && !K.b) K.bEdge = true; if (k === 'start') K.startEdge = true; else K[k] = true; }
    else if (k !== 'start') K[k] = false;
    btn.classList.toggle('on', on);
  }
  document.querySelectorAll('#pad [data-k]').forEach(function (btn) {
    btn.addEventListener('pointerdown', function (e) { e.preventDefault(); btn.setPointerCapture(e.pointerId); press(btn, true); down.add(btn); });
    const up = function (e) { e.preventDefault(); press(btn, false); down.delete(btn); };
    btn.addEventListener('pointerup', up); btn.addEventListener('pointercancel', up); btn.addEventListener('lostpointercapture', up);
  });
  // tapping the screen starts the game from the title / restarts after the end screens
  canvas.addEventListener('pointerdown', function () { Sound.init(); if (G.mode !== 'play') K.startEdge = true; });
}

// ------------------------------------------------------------------ layout + loop
function layout() {
  const vw = window.innerWidth, vh = window.innerHeight;
  const touch = document.body.classList.contains('touch');
  const portrait = vh > vw;
  const availH = touch && portrait ? vh * 0.58 : vh;
  let s = Math.min(vw / W, availH / H);
  if (s >= 2) s = Math.floor(s);
  canvas.style.width = Math.floor(W * s) + 'px';
  canvas.style.height = Math.floor(H * s) + 'px';
  document.body.classList.toggle('portrait', portrait);
}
window.addEventListener('resize', layout);

let last = 0, acc = 0;
function frame(now) {
  if (!last) last = now;
  acc += Math.min(100, now - last); last = now;
  if (window.__manual) { acc = 0; draw(); requestAnimationFrame(frame); return; }
  let steps = 0;
  while (acc >= 1000 / 60 && steps < 5) { update(); acc -= 1000 / 60; steps++; }
  draw();
  requestAnimationFrame(frame);
}

buildArt();
newGame();
setupTouch();
layout();
window.__G = function () { return G; };
requestAnimationFrame(frame);

// test hooks (used by tools/play.cjs): stop the realtime loop and drive frames by hand
window.__update = update;
window.__draw = draw;
window.__tickKeys = function (keys) {
  ['left', 'right', 'down', 'up', 'a', 'b'].forEach(function (k) {
    const on = !!keys[k];
    if (k === 'a' && on && !K.a) K.aEdge = true;
    if (k === 'b' && on && !K.b) K.bEdge = true;
    K[k] = on;
  });
  if (keys.start) K.startEdge = true;
};
