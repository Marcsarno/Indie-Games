// Chase music (round 31): synthesized live with Web Audio, no files. A minor, 124 bpm, 16th-note steps scheduled a little ahead of time.
// level 0 silent, 1 bass + hats (the chase starts), 2 + kick and clap (3+ cops), 3 + arpeggio and open hats (rocket cops / SWAT). sting('win' | 'fail') ends it.
export function createMusic(getAudio, isMuted) {
  const BPM = 124, STEP = 60 / BPM / 4, AHEAD = .25;
  const hz = n => 440 * Math.pow(2, (n - 69) / 12);                       // MIDI note -> Hz
  const BASS = [45, 45, 57, 45, 43, 43, 55, 43, 41, 41, 53, 41, 40, 40, 43, 40];   // one note per 8th, two bars: A, G, F, E
  const CHORD = [[69, 72, 76, 81], [67, 71, 74, 79], [65, 69, 72, 77], [64, 67, 71, 76]];   // Am, G, F, Em (a bar each, two bars per bass cycle -> half a bar each)
  let A = null, out = null, level = 0, want = 0, step = 0, next = 0, timer = null, stopAt = 0;
  function ensure() {
    const a = getAudio(); if (!a) return false;
    if (a !== A) { A = a; out = A.ctx.createGain(); out.gain.value = 0; out.connect(A.master); }
    return true;
  }
  function env(g, t, peak, dur, attack = .005) { g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + attack); g.gain.exponentialRampToValueAtTime(.0001, t + dur); }
  function tone(type, f, t, dur, peak, cutoff) {
    const o = A.ctx.createOscillator(), g = A.ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
    let node = o; if (cutoff) { const lp = A.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(cutoff, t); lp.Q.value = 4; o.connect(lp); node = lp; }
    node.connect(g); g.connect(out); env(g, t, peak, dur); o.start(t); o.stop(t + dur + .05);
  }
  function noise(t, dur, peak, type, f, q = 1) {
    const s = A.ctx.createBufferSource(); s.buffer = A.nb; const fl = A.ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = A.ctx.createGain();
    s.connect(fl); fl.connect(g); g.connect(out); env(g, t, peak, dur, .002); s.start(t, Math.random() * 1.5); s.stop(t + dur + .05);
  }
  function kick(t) { const o = A.ctx.createOscillator(), g = A.ctx.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + .14); o.connect(g); g.connect(out); env(g, t, .9, .28, .002); o.start(t); o.stop(t + .32); }
  function play(s, t) {                                                     // what sounds on 16th step s (0..31 = two bars)
    const beat16 = s % 16;
    if (level >= 1) {
      if (s % 2 === 0) tone('sawtooth', hz(BASS[(s / 2) % 16]), t, STEP * 1.7, .22, 520 + (level - 1) * 260);
      if (s % 4 === 2) noise(t, .04, .12, 'highpass', 7500);                  // off-beat closed hat
    }
    if (level >= 2) {
      if (beat16 % 4 === 0) kick(t);
      if (beat16 === 4 || beat16 === 12) { noise(t, .16, .35, 'bandpass', 1700, .8); noise(t + .012, .12, .2, 'bandpass', 1100, .8); }   // clap
      if (s % 2 === 1) noise(t, .025, .05, 'highpass', 9000);
    }
    if (level >= 3) {
      const ch = CHORD[Math.floor(s / 8) % 4]; tone('square', hz(ch[s % 4] + (s % 8 >= 4 ? 12 : 0)), t, STEP * .9, .05, 2600);
      if (beat16 % 8 === 6) noise(t, .22, .08, 'highpass', 6000);              // open hat
    }
  }
  function tick() {
    if (!ensure()) return; const now = A.ctx.currentTime, muted = isMuted();
    out.gain.setTargetAtTime(muted || want === 0 ? 0 : .5, now, want === 0 ? .4 : .08);
    if (want > 0) level = want; else if (now > stopAt) level = 0;            // after a stop the loop plays on under the fade for ~1.2 s
    if (level === 0) { next = 0; return; }
    if (next < now) { next = now + .05; step = 0; }
    while (next < now + AHEAD) { play(step, next); step = (step + 1) % 32; next += STEP; }
  }
  function setLevel(n) { if (n === want) return; want = n; if (n === 0 && A) stopAt = A.ctx.currentTime + 1.2; if (n > 0 && !timer) timer = setInterval(tick, 50); tick(); }
  function sting(kind) {                                                    // the end: a bright major swell (win) or a falling groan (fail); the loop fades out
    want = 0; if (A) stopAt = A.ctx.currentTime + .3; if (!ensure() || isMuted()) return; const t = A.ctx.currentTime + .05, g = A.ctx.createGain(); g.connect(A.master); g.gain.value = .5;
    const save = out; out = g;
    if (kind === 'win') { for (const n of [57, 61, 64, 69, 73]) tone('sawtooth', hz(n), t, 2.6, .12, 2400); for (let i = 0; i < 6; i++) tone('square', hz([69, 73, 76, 81, 85, 88][i]), t + i * .09, .3, .06, 3000); }
    else { const o = A.ctx.createOscillator(), e = A.ctx.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(55, t + 1.2); const lp = A.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; o.connect(lp); lp.connect(e); e.connect(g); env(e, t, .25, 1.3, .02); o.start(t); o.stop(t + 1.4); }
    out = save;
  }
  return { level: setLevel, sting, get playing() { return want; } };
}
