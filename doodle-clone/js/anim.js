// Outfit-agnostic animator: picks the atlas frame from the sim phase, so every outfit jumps at the same speed.
import { C, v0 } from './config.js';
const seq = (a, b) => { const r = []; for (let i = a; i <= Math.max(a, b); i++) r.push(i); return r; };
const pick = (l, p) => l[Math.min(l.length - 1, Math.max(0, Math.round(p * (l.length - 1))))];
export function prepare(J) {
  const k = J.key;
  J.seqs = { compress: seq(k.touch, k.landDeep), release: seq(k.crouchDeep, k.launch - 1), rise: seq(k.launch, k.apex), fall: seq(k.apex + 1, k.touch) };
  return J;
}
export function frameFor(J, pl) {
  const s = J.seqs;
  if (pl.mode === 'squash') {
    const t = pl.squashT;
    return t < C.compress ? pick(s.compress, t / C.compress) : pick(s.release, (t - C.compress) / C.release);
  }
  if (pl.mode === 'rocket') return s.rise[s.rise.length - 1];
  if (pl.mode === 'rescue') return pick(s.fall, 0.5);
  if (pl.vy >= 0) {
    if (pl.airT < C.release) return pick(s.release, pl.airT / C.release);   // push-off crouch frames while already rising
    return pick(s.rise, 1 - Math.min(1, pl.vy / pl.launchV));
  }
  return pick(s.fall, Math.min(1, -pl.vy / v0()));
}
