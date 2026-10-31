// Fixed-step simulation. NO three.js here, so it runs in node (bot tests) and in the browser.
import { C, v0 } from './config.js';
import { makeGen } from './gen.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function platTop(p, x) { return p.y + (p.tramp && Math.abs(x - p.x) < 0.9 ? C.trampTop : 0); }

export function createSim(seed = 1) {
  const gen = makeGen(seed);
  const sim = {
    gen, t: 0, viewH: 16, landY: 0, landT: 0, climb: 0, height: 0, candy: 0, over: false, rescueUsed: false, events: [],
    player: { x: 0, y: 0, prevY: 0, vx: 0, vy: 0, mode: 'squash', squashT: 0, launchV: v0(), airT: 0, kind: 'flat', face: 1, on: gen.platforms[0], offX: 0, rt: 0, rs: null },
    cam: { y: 0 },
  };
  sim.cam.y = (0.5 - C.startFrac) * sim.viewH;
  sim.reframe = () => { sim.cam.y = Math.max(sim.cam.y, (0.5 - C.startFrac) * sim.viewH); };
  const W = C.viewW, edge = W / 2 + 0.45;

  function startRescue() {
    const pl = sim.player, bottom = sim.cam.y - sim.viewH / 2;
    let best = null;
    for (const p of gen.platforms) {
      if (!p.alive || p.hit || p.type === 'crumbly') continue;
      if (p.y < bottom + 1.5 || p.y > bottom + 7) continue;
      if (!best || Math.abs(p.x - pl.x) < Math.abs(best.x - pl.x)) best = p;
    }
    if (!best) best = gen.addFlat(clamp(pl.x, -2, 2), bottom + 3, 3);
    sim.rescueUsed = true; pl.mode = 'rescue';
    pl.rs = { t: 0, x0: pl.x, y0: pl.y, p: best }; pl.vy = 0; pl.vx = 0;
    sim.events.push({ t: 'rescue' });
  }

  sim.step = function (dt, dir = 0) {
    sim.t += dt;
    for (const p of gen.platforms) {                     // platforms
      if (p.type === 'slider') p.x = p.x0 + Math.sin(sim.t * p.ang + p.phase) * p.amp;
      if (p.crumbling) { p.ct += dt; if (p.ct > 1.4) p.alive = false; }
    }
    const pl = sim.player; pl.prevY = pl.y;
    if (pl.mode === 'squash') {
      pl.squashT += dt;
      if (pl.on) pl.x = pl.on.x + pl.offX;
      if (pl.squashT >= C.hold) { pl.mode = 'air'; pl.vy = pl.launchV; pl.airT = 0; pl.on = null; pl.prevY = pl.y; }
    } else if (pl.mode === 'rescue') {
      const r = pl.rs; r.t += dt / 0.9; const u = Math.min(1, r.t), e = 1 - (1 - u) * (1 - u);
      pl.x = r.x0 + (r.p.x - r.x0) * e; pl.y = r.y0 + (platTop(r.p, r.p.x) - r.y0) * e;
      if (u >= 1) { sim.landY = platTop(r.p, r.p.x); pl.mode = 'squash'; pl.squashT = 0; pl.launchV = v0(); pl.kind = 'flat'; pl.on = r.p; pl.offX = pl.x - r.p.x; pl.vy = 0; }
    } else {                                              // air or rocket
      const target = dir * C.maxVx;
      const rate = target === 0 || Math.sign(target) !== Math.sign(pl.vx) ? C.decel : C.accel;
      pl.vx += clamp(target - pl.vx, -rate * dt, rate * dt); pl.airT += dt;
      if (Math.abs(pl.vx) > 0.3) pl.face = Math.sign(pl.vx);
      pl.x += pl.vx * dt;
      if (pl.mode === 'rocket') {
        pl.rt += dt; const R = C.rocket;
        pl.vy = pl.rt < R.dur ? R.vy : R.vy * Math.max(0, 1 - (pl.rt - R.dur) / R.ease);
        pl.y += pl.vy * dt;
        if (pl.rt >= R.dur + R.ease) { pl.mode = 'air'; pl.vy = 0; pl.launchV = v0(); pl.airT = 1; }
      } else {
        pl.vy -= C.g * dt; pl.y += pl.vy * dt;
        if (pl.vy < 0) {                                 // aim assist toward the platform below
          let tgt = null;
          for (const p of gen.platforms) {
            const gap = pl.y - platTop(p, p.x);
            if (!p.alive || p.hit || gap < 0 || gap > 3 || Math.abs(p.x - pl.x) > 3) continue;
            if (!tgt || gap < pl.y - platTop(tgt, tgt.x)) tgt = p;
          }
          if (tgt && Math.abs(tgt.x - pl.x) > tgt.w / 2 - 0.2)
            pl.x += clamp(tgt.x - pl.x, -1, 1) * C.aimAssist * dt * (Math.abs(dir) < 0.25 ? 1 : 0.25);
          let hit = null, hitTop = -1e9;                 // swept landing test
          for (const p of gen.platforms) {
            if (!p.alive || p.hit) continue;
            if (Math.abs(pl.x - p.x) > p.w / 2 + C.footTol) continue;
            const top = platTop(p, pl.x);
            if (pl.prevY >= top - 0.02 && pl.y <= top && top > hitTop) { hit = p; hitTop = top; }
          }
          if (hit) {
            const tramp = hit.tramp && Math.abs(pl.x - hit.x) < 0.9;
            pl.y = hitTop; pl.vy = 0; pl.mode = 'squash'; pl.squashT = 0; pl.on = hit; pl.offX = pl.x - hit.x;
            pl.launchV = tramp ? Math.sqrt(2 * C.g * C.H * C.trampMul) : v0(); pl.kind = tramp ? 'tramp' : hit.type;
            const rate = (hitTop - sim.landY) / Math.max(0.25, sim.t - sim.landT); sim.climb += (Math.max(0, rate) - sim.climb) * 0.35; sim.landY = hitTop; sim.landT = sim.t;
            if (hit.type === 'crumbly') { hit.crumbling = true; hit.ct = 0; hit.hit = true; }
            if (tramp) hit.trampT = 0;
            sim.events.push({ t: 'bounce', kind: pl.kind });
            if (C.hold <= 0) { pl.mode = 'air'; pl.vy = pl.launchV; pl.airT = 0; pl.on = null; }
          }
        }
      }
      if (pl.x > edge) pl.x -= W + 0.9; else if (pl.x < -edge) pl.x += W + 0.9;
    }
    for (const p of gen.platforms) if (p.trampT !== undefined) p.trampT += dt;
    // pickups
    const cy = pl.y + 0.8;
    for (const c of gen.candies) if (!c.taken && Math.abs(c.x - pl.x) < 0.8 && Math.abs(c.y - cy) < 1.0) { c.taken = true; sim.candy++; sim.events.push({ t: 'candy', x: c.x, y: c.y }); }
    for (const it of gen.items) if (!it.taken && pl.mode !== 'rescue' && Math.abs(it.x - pl.x) < 0.9 && Math.abs(it.y - cy) < 1.1) {
      it.taken = true; pl.mode = 'rocket'; pl.rt = 0; pl.on = null; sim.events.push({ t: 'rocket' });
    }
    sim.height = Math.max(sim.height, pl.y);
    // camera: up only; player sits low
    if (pl.mode !== 'rescue') {
      // camera: smooth glide toward whichever is higher: (a) the last platform you landed on sitting at camLandFrac,
      // (b) her current height sitting at camTopFrac (keeps it moving while you climb). Hard limit at 80% so she never leaves the top.
      const vh = sim.viewH, rk = pl.mode === 'rocket';
      sim.climb *= Math.exp(-0.4 * dt * (sim.t - sim.landT > 1.5 ? 4 : 1));          // lead fades if you stop climbing
      const lead = Math.min(8, sim.climb * (1 / C.camGlide + C.camLeadT));              // cancels the glide lag + looks one bounce ahead while you climb
      const target = Math.max(sim.landY + lead + (0.5 - C.camLandFrac) * vh, pl.y + (0.5 - (rk ? C.camTopFracRocket : C.camTopFrac)) * vh);
      if (target > sim.cam.y) sim.cam.y += (target - sim.cam.y) * (1 - Math.exp(-C.camGlide * dt));
      const hard = pl.y + (0.5 - 0.8) * vh;
      if (hard > sim.cam.y) sim.cam.y = hard;
    }
    gen.ensure(sim.cam.y + sim.viewH / 2 + 60);
    gen.prune(sim.cam.y - sim.viewH / 2 - 6);
    if (!sim.over && pl.mode !== 'rescue' && pl.y < sim.cam.y - sim.viewH / 2 - 0.5) {
      if (C.rescue && !sim.rescueUsed) startRescue(); else { sim.over = true; sim.events.push({ t: 'over' }); }
    }
  };
  gen.ensure(sim.viewH + 60);
  return sim;
}
