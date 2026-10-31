// Headless playtest: a simple bot steers toward the platform it will land on. Verifies the generator never makes an impossible gap.
// usage: node tools/bot_test.mjs [seeds=12] [targetHeight=1500] [noAssist]
import { createSim } from '../js/sim.js';
import { C } from '../js/config.js';
const seeds = +(process.argv[2] || 12), target = +(process.argv[3] || 1500);
if (process.argv.includes('noAssist')) C.aimAssist = 0;
C.rescue = false;                                   // a rescue would hide generator faults
const W = C.viewW;
const wdx = (a, b) => { let d = a - b; if (d > W / 2 + 0.45) d -= W + 0.9; if (d < -(W / 2 + 0.45)) d += W + 0.9; return d; };
function botDir(sim) {
  const pl = sim.player; if (pl.mode !== 'air') return 0;
  const apex = pl.vy > 0 ? pl.y + (pl.vy * pl.vy) / (2 * C.g) : pl.y;
  const tUp = pl.vy > 0 ? pl.vy / C.g : 0;
  let best = null, bt = -1e9;
  for (const p of sim.gen.platforms) {
    if (!p.alive || p.hit) continue;
    const top = p.y + (p.tramp && Math.abs(p.x - pl.x) < 0.9 ? C.trampTop : 0);
    if (top > apex - 0.3 || apex - top > 8) continue;
    const tFall = Math.sqrt(2 * (apex - top) / C.g), t = tUp + tFall;
    const need = Math.abs(wdx(p.x, pl.x)) - (p.w / 2 + C.footTol - 0.25);
    if (need > C.maxVx * t * 0.7) continue;                 // not reachable in time
    if (top > bt) { bt = top; best = p; }                    // highest reachable platform = most progress
  }
  if (!best) return 0;
  return Math.max(-1, Math.min(1, wdx(best.x, pl.x) * 1.5));
}
let fails = 0, worst = 1e9;
for (let s = 1; s <= seeds; s++) {
  const sim = createSim(s * 7919); let n = 0;
  while (!sim.over && sim.height < target && n < 120 * 60 * 60) { sim.step(C.step, botDir(sim)); n++; }
  const ok = sim.height >= target; if (!ok) fails++; worst = Math.min(worst, sim.height);
  console.log(`seed ${s}: height ${sim.height.toFixed(0)} candy ${sim.candy} time ${(sim.t).toFixed(0)}s ${ok ? 'OK' : 'DIED'}`);
}
console.log(fails ? `FAILED ${fails}/${seeds} (worst ${worst.toFixed(0)})` : `all ${seeds} seeds reached ${target}`);
process.exit(fails ? 1 : 0);
