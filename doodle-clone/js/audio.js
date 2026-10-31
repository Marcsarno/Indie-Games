// Tiny WebAudio blips (no files). Starts after the first tap (browser rule).
let ctx = null, on = true;
export const audio = {
  set enabled(v) { on = v; }, get enabled() { return on; },
  unlock() { if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (ctx && ctx.state === 'suspended') ctx.resume(); },
  blip(f0, f1, dur = 0.12, type = 'sine', vol = 0.12) {
    if (!ctx || !on) return; const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02);
  },
  bounce() { this.blip(300, 520, 0.1, 'sine', 0.10); },
  tramp() { this.blip(250, 900, 0.3, 'triangle', 0.14); },
  candy() { this.blip(880, 1320, 0.09, 'triangle', 0.09); },
  rocket() { this.blip(120, 600, 0.6, 'sawtooth', 0.07); },
  rescue() { this.blip(500, 900, 0.4, 'sine', 0.12); },
  over() { this.blip(400, 90, 0.6, 'triangle', 0.14); },
  unlock2() { [0, 0.12, 0.24].forEach((d, i) => setTimeout(() => this.blip(520 * (1 + i * 0.25), 700 * (1 + i * 0.25), 0.15, 'triangle', 0.12), d * 1000)); },
};
