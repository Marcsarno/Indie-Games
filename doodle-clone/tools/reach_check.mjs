// Physics check of the generator: from each platform, can the NEXT one in the chain be reached with the current jump
// (g, H) and steering (maxVx, accel), starting from standing still sideways? Uses wrap-around and the landing tolerance.
// usage: node tools/reach_check.mjs [seeds=20] [height=1500]
import { makeGen } from '../js/gen.js';
import { C } from '../js/config.js';
const seeds = +(process.argv[2] || 20), H = +(process.argv[3] || 1500), W = C.viewW;
const side = (t) => { const ta = C.maxVx / C.accel; return t < ta ? 0.5 * C.accel * t * t : C.maxVx * (t - ta / 2); };   // sideways distance in time t
let bad = 0, total = 0, worst = 1e9;
for (let s = 1; s <= seeds; s++) {
  const g = makeGen(s * 7919); g.ensure(H); const P = [...g.platforms].sort((a, b) => a.y - b.y);
  for (let i = 1; i < P.length; i++) {
    const a = P[i - 1], b = P[i], dy = b.y - a.y; total++;
    const v0 = Math.sqrt(2 * C.g * C.H * (a.tramp ? C.trampMul : 1)); if (v0 * v0 < 2 * C.g * dy) { bad++; continue; }
    const t = (v0 + Math.sqrt(v0 * v0 - 2 * C.g * dy)) / C.g;          // time until she falls back to b's height
    let dx = Math.abs(b.x0 - a.x0); dx = Math.min(dx, W + 0.9 - dx);   // wrap-around
    const need = Math.max(0, dx - (b.w / 2 + C.footTol) - (b.amp || 0)), margin = side(t) - need;
    worst = Math.min(worst, margin); if (margin < 0) bad++;
  }
}
console.log(`${total} jumps checked on ${seeds} seeds: ${bad} unreachable; tightest margin ${worst.toFixed(2)} u`);
process.exit(bad ? 1 : 0);
