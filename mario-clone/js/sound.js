'use strict';
// Sound effects synthesized with Web Audio: square/triangle blips and noise bursts, no files.
// Effects are my own simple stand-ins in the same chip style. There is no background music.

const Sound = (function () {
  let ctx = null, master = null, muted = false, noiseBuf = null;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  // notes: [[startFreq, endFreq, duration], ...] played back to back
  function tone(notes, type, vol, delay) {
    if (!ctx || muted) return;
    let t = ctx.currentTime + (delay || 0) + 0.005;
    notes.forEach(function (n) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(n[0], t);
      if (n[1] !== n[0]) o.frequency.exponentialRampToValueAtTime(Math.max(20, n[1]), t + n[2]);
      g.gain.setValueAtTime(vol, t);
      g.gain.setValueAtTime(vol, t + n[2] * 0.8);
      g.gain.linearRampToValueAtTime(0, t + n[2]);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + n[2] + 0.01);
      t += n[2];
    });
  }

  function noise(dur, vol, lo, hi, delay) {
    if (!ctx || muted) return;
    const t = ctx.currentTime + (delay || 0) + 0.005;
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true;
    f.type = 'bandpass';
    f.frequency.setValueAtTime(hi, t);
    f.frequency.exponentialRampToValueAtTime(lo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t); s.stop(t + dur + 0.02);
  }

  const N = { C4: 262, D4: 294, E4: 330, F4: 349, G4: 392, A4: 440, B4: 494, C5: 523, D5: 587, E5: 659, F5: 698, G5: 784, A5: 880, B5: 988, C6: 1047, D6: 1175, E6: 1319, G6: 1568 };

  const fx = {
    jumpSmall: function () { tone([[260, 520, 0.08], [520, 700, 0.1]], 'square', 0.18); },
    jumpBig: function () { tone([[180, 380, 0.08], [380, 520, 0.12]], 'square', 0.18); },
    coin: function () { tone([[N.B5, N.B5, 0.06], [N.E6, N.E6, 0.28]], 'square', 0.16); },
    stomp: function () { tone([[640, 160, 0.09]], 'square', 0.2); },
    kick: function () { tone([[300, 600, 0.05], [600, 240, 0.05]], 'square', 0.18); },
    bump: function () { tone([[120, 90, 0.07]], 'square', 0.25); },
    brick: function () { noise(0.16, 0.5, 300, 3000); tone([[220, 60, 0.12]], 'triangle', 0.3); },
    powerupAppear: function () { tone([[300, 500, 0.06], [400, 700, 0.06], [500, 900, 0.06], [600, 1100, 0.08]], 'square', 0.15); },
    powerup: function () {
      const seq = [N.C5, N.E5, N.G5, N.C6, N.E6, N.G6, N.E6, N.C6];
      tone(seq.map(function (f) { return [f, f, 0.05]; }), 'square', 0.15);
    },
    oneUp: function () {
      const seq = [N.E5, N.G5, N.E6, N.C6, N.D6, N.G6];
      tone(seq.map(function (f) { return [f, f, 0.09]; }), 'square', 0.15);
    },
    fireball: function () { tone([[900, 500, 0.05], [500, 700, 0.04]], 'square', 0.14); },
    fireHit: function () { noise(0.08, 0.3, 200, 1200); },
    pipe: function () { tone([[400, 120, 0.25]], 'triangle', 0.3); },
    skid: function () { noise(0.1, 0.12, 1200, 2400); },
    flagpole: function () { tone([[1400, 200, 0.9]], 'square', 0.12); },
    clear: function () {
      const seq = [N.G4, N.C5, N.E5, N.G5, N.C6, N.E6, N.G6];
      tone(seq.map(function (f) { return [f, f, 0.1]; }), 'square', 0.15, 0.1);
      tone([[N.G6, N.G6, 0.4]], 'square', 0.15, 0.9);
    },
    countdown: function () { tone([[1200, 1200, 0.02]], 'square', 0.1); },
    firework: function () { noise(0.18, 0.4, 200, 1800); },
    warning: function () { tone([[N.A4, N.A4, 0.1], [N.E5, N.E5, 0.1], [N.A4, N.A4, 0.1], [N.E5, N.E5, 0.1]], 'square', 0.14); },
    die: function () {
      tone([[N.B4, N.B4, 0.1], [N.F5, N.F5, 0.1], [N.F5, N.F5, 0.1], [N.F5, N.F5, 0.14], [N.E5, N.E5, 0.14], [N.D5, N.D5, 0.14],
        [N.C5, N.C5, 0.14], [N.E4, N.E4, 0.1], [N.E4, N.E4, 0.1], [N.C4, N.C4, 0.3]], 'square', 0.16, 0.2);
    },
    gameOver: function () {
      const seq = [N.C5, N.G4, N.E4, N.A4, N.B4, N.A4, N.G4];
      tone(seq.map(function (f, i) { return [f, f, i === seq.length - 1 ? 0.4 : 0.16]; }), 'triangle', 0.3);
    },
    start: function () { tone([[N.C5, N.C5, 0.06], [N.G5, N.G5, 0.06], [N.C6, N.C6, 0.12]], 'square', 0.14); },
    pause: function () { tone([[N.E5, N.E5, 0.06], [N.C5, N.C5, 0.06], [N.E5, N.E5, 0.06], [N.C5, N.C5, 0.1]], 'square', 0.14); }
  };

  return {
    init: init,
    play: function (name) { try { if (fx[name]) fx[name](); } catch (e) { /* audio is optional */ } },
    toggleMute: function () { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.5; return muted; },
    isMuted: function () { return muted; }
  };
})();
