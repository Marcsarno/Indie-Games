// loudness of every sound as the game plays it (recording x SAMPLE_GAIN, or the synth recipe), rendered
// offline in the real audio code. Two numbers per sound, in dB: full range, and through a phone speaker
// (nothing below ~300 Hz), each the loudest 100 ms. node tools/sfx/loudness.cjs <gameDir> [out.json]
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => {
  const gameDir = path.resolve(process.argv[2] || 'game'), out = process.argv[3];
  const files = {}; for (const f of fs.readdirSync(path.join(gameDir, 'sfx'))) if (f.endsWith('.mp3')) files[f] = fs.readFileSync(path.join(gameDir, 'sfx', f)).toString('base64');
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + path.join(gameDir, 'index.html'));
  const res = await p.evaluate(async (files) => {
    const SR = 48000, names = new Set([...Object.keys(RECIPES), ...Object.keys(SAMPLES)]), R = {};
    const meas = async (play) => {
      const c = new OfflineAudioContext(2, SR * 2.5, SR);
      SFX.ctx = c; SFX.out = c.createGain(); SFX.out.gain.value = 0.9; SFX.out.connect(c.destination);
      SFX.noise = c.createBuffer(1, SR, SR); const d = SFX.noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      await play(c);
      const buf = await c.startRendering(), x = buf.getChannelData(0);
      const lvl = (y) => { let best = 0; const w = SR / 10; for (let i = 0; i + w <= y.length; i += w / 4) { let s = 0; for (let k = i; k < i + w; k++) s += y[k] * y[k]; best = Math.max(best, s / w); } return 10 * Math.log10(best + 1e-12); };
      // the phone: a 2-pole high-pass at 300 Hz twice over
      const hp = (y, fc) => { const o = new Float32Array(y.length), q = Math.SQRT1_2, w0 = 2 * Math.PI * fc / SR, al = Math.sin(w0) / (2 * q), cs = Math.cos(w0), b0 = (1 + cs) / 2, b1 = -(1 + cs), b2 = b0, a0 = 1 + al, a1 = -2 * cs, a2 = 1 - al; let x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let i = 0; i < y.length; i++) { const v = (b0 * y[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0; x2 = x1; x1 = y[i]; y2 = y1; y1 = v; o[i] = v; } return o; };
      let peak = 0; for (const v of x) peak = Math.max(peak, Math.abs(v));
      return { full: +lvl(x).toFixed(1), phone: +lvl(hp(hp(x, 300), 300)).toFixed(1), peak: +(20 * Math.log10(peak + 1e-9)).toFixed(1) };
    };
    const dec = async (c, b64) => { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return await c.decodeAudioData(u.buffer); };
    for (const n of names) {
      const r = {};
      if (RECIPES[n]) { const avg = []; for (let t = 0; t < 3; t++) avg.push(await meas(async () => { SFX.vk = (typeof SYNTH_GAIN !== 'undefined' && SYNTH_GAIN[n]) || 1; RECIPES[n](1); SFX.vk = 1; })); r.synth = { full: +(avg.reduce((a, q) => a + q.full, 0) / 3).toFixed(1), phone: +(avg.reduce((a, q) => a + q.phone, 0) / 3).toFixed(1), gain: (typeof SYNTH_GAIN !== 'undefined' && SYNTH_GAIN[n]) || 1 }; }
      if (SAMPLES[n]) {
        const takes = [];
        for (let i = 0; i < SAMPLES[n]; i++) { const f = files[n + (i ? '_' + (i + 1) : '') + '.mp3']; if (!f) continue;
          takes.push(await meas(async (c) => { const buf = await dec(c, f); SBUF[n] = [buf]; SFX.synth = false; const rnd = Math.random; Math.random = () => 0.5; playSample(n, 1); Math.random = rnd; })); }
        if (takes.length) r.rec = { full: +(takes.reduce((a, q) => a + q.full, 0) / takes.length).toFixed(1), phone: +(takes.reduce((a, q) => a + q.phone, 0) / takes.length).toFixed(1), gain: SAMPLE_GAIN[n] ?? 0.6 };
      }
      R[n] = r;
    }
    return R;
  }, files);
  await b.close();
  const rows = Object.entries(res).map(([n, r]) => [n, r.rec ? r.rec.phone : r.synth.phone, r]).sort((a, b) => b[1] - a[1]);
  for (const [n, v, r] of rows) console.log(n.padEnd(12), (r.rec ? 'rec ' : 'syn ') + String(v).padStart(6), ' full', String((r.rec || r.synth).full).padStart(6), r.rec ? ' gain ' + r.rec.gain : '');
  if (out) fs.writeFileSync(out, JSON.stringify(res, null, 1));
})();
