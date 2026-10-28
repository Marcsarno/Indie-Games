'use strict';
// Sound effects synthesized with Web Audio: no sound files. Deliberately simple shapes (a thump,
// a whoosh, a ping) rather than attempts at realistic recordings. Audio starts on the first tap,
// as phones require.

const SFX = { ctx: null, out: null, noise: null, muted: false, last: {} };
try { SFX.muted = localStorage.getItem('dcg-mute') === '1'; } catch (e) { /* storage unavailable */ }

function audioInit() {
  if (SFX.ctx) { if (SFX.ctx.state === 'suspended') SFX.ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  try { SFX.ctx = new AC(); } catch (e) { return; }
  const c = SFX.ctx, comp = c.createDynamicsCompressor();
  SFX.out = c.createGain(); SFX.out.gain.value = 0.9;
  SFX.out.connect(comp); comp.connect(c.destination);
  SFX.noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
  const d = SFX.noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}
function setMuted(m) { SFX.muted = m; try { localStorage.setItem('dcg-mute', m ? '1' : '0'); } catch (e) { /* ignore */ } }

// a pitched blip: oscillator gliding f0 -> f1 with a fast attack and exponential decay
function tone(type, f0, f1, dur, gain, delay = 0) {
  const c = SFX.ctx, t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
  gain = Math.min(1, gain * 2.2);
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(SFX.out); o.start(t); o.stop(t + dur + 0.02);
}
// a burst of filtered noise, the filter sweeping f0 -> f1
function noise(dur, gain, type, f0, f1, q = 1, delay = 0) {
  const c = SFX.ctx, t = c.currentTime + delay, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  gain = Math.min(3, gain * (type === 'lowpass' ? 2.5 : 6));   // band/high-passed noise loses most of its energy
  s.buffer = SFX.noise; s.playbackRate.value = 0.7 + Math.random() * 0.6;
  f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(SFX.out); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
}
const vary = (f, k = 0.06) => f * (1 + (Math.random() * 2 - 1) * k);   // small pitch variation per play
const RECIPES = {
  swing: () => noise(0.13, 0.42, 'bandpass', 700, 2400, 0.9),
  heavySwing: () => noise(0.2, 0.48, 'bandpass', 400, 1600, 0.9),
  hit: () => { tone('sine', vary(190), 60, 0.1, 0.6); noise(0.05, 0.3, 'lowpass', 2500, 600); },
  kill: () => { tone('sine', vary(150), 40, 0.24, 0.7); noise(0.14, 0.32, 'lowpass', 1200, 200); },
  hurt: () => { tone('square', vary(230), 110, 0.13, 0.12); tone('sine', 100, 50, 0.14, 0.45); },
  block: () => { tone('triangle', vary(950), 760, 0.09, 0.22); tone('triangle', 1420, 1300, 0.07, 0.1, 0.01); },
  gold: () => { tone('sine', vary(1320, 0.03), 1320, 0.08, 0.18); tone('sine', vary(1760, 0.03), 1760, 0.12, 0.16, 0.06); },
  pickup: () => tone('triangle', 520, 800, 0.1, 0.22),
  potion: () => { tone('sine', 300, 620, 0.16, 0.22); tone('sine', 420, 840, 0.16, 0.16, 0.1); },
  chest: () => { tone('triangle', 160, 230, 0.18, 0.18); tone('sine', 660, 660, 0.1, 0.12, 0.18); tone('sine', 880, 880, 0.14, 0.12, 0.26); },
  barrel: () => { noise(0.16, 0.45, 'lowpass', 1400, 300); tone('sine', 130, 70, 0.12, 0.35); },
  bolt: () => { tone('sawtooth', 280, 900, 0.16, 0.14); noise(0.18, 0.3, 'bandpass', 1500, 3500, 1.2); },
  boltHit: () => { noise(0.2, 0.3, 'lowpass', 2000, 300); tone('sine', 220, 80, 0.15, 0.3); },
  arrow: () => noise(0.09, 0.4, 'bandpass', 2600, 3800, 1.5),
  fireball: () => { noise(0.22, 0.18, 'lowpass', 600, 1500); tone('sine', 120, 180, 0.2, 0.15); },
  levelUp: () => [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, 0.16, 0.18, i * 0.08)),
  stairs: () => [392, 330, 262].forEach((f, i) => tone('triangle', f, f * 0.98, 0.2, 0.18, i * 0.13)),
  death: () => { tone('sawtooth', 200, 45, 0.9, 0.14); tone('sine', 110, 40, 0.9, 0.35); },
  tap: () => tone('square', 820, 820, 0.04, 0.2),
  crackle: v => noise(0.02 + Math.random() * 0.03, 0.03 * v, 'highpass', 2500, 1500, 0.7),
};
function sfx(name, v = 1) {
  if (SFX.muted || !SFX.ctx || SFX.ctx.state !== 'running') return;
  const now = SFX.ctx.currentTime;
  if (SFX.last[name] && now - SFX.last[name] < 0.045) return;   // many hits on one frame play once
  SFX.last[name] = now;
  try { RECIPES[name](v); } catch (e) { /* audio is optional */ }
}
// a faint fire crackle that swells near visible torches and braziers
let crackleT = 0;
function ambience(dt) {
  if (SFX.muted || !SFX.ctx) return;
  crackleT -= dt; if (crackleT > 0) return;
  crackleT = 0.08 + Math.random() * 0.35;
  let best = 0;
  for (const f of fires) {
    if (LV.vis[f.tile] < 0.2) continue;
    const [hx, hy] = iso(hero.fi, hero.fj), d = Math.hypot(f.wx - hx, (f.wy - hy) * 2);
    best = Math.max(best, 1 - d / 160);
  }
  if (best > 0) RECIPES.crackle(best);
}
