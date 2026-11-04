// renders the game's synthesized sound effects (sound.js RECIPES) offline to WAV files, for
// before/after listening: node tools/capture/synthwav.cjs <gameDir> <outDir>
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => { const [dir, out] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + path.resolve(dir, 'index.html'));
  const res = await p.evaluate(async () => {
    const out = {};
    for (const name of Object.keys(RECIPES)) {
      const sr = 44100, c = new OfflineAudioContext(1, sr * 2.2, sr);
      SFX.ctx = c; const comp = c.createDynamicsCompressor(); SFX.out = c.createGain(); SFX.out.gain.value = 0.9; SFX.out.connect(comp); comp.connect(c.destination);
      SFX.noise = c.createBuffer(1, sr, sr); const d = SFX.noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      try { RECIPES[name](name === 'streak' ? 6 : 1); } catch (e) { out[name] = 'ERR ' + e; continue; }
      const buf = await c.startRendering(), x = buf.getChannelData(0);
      let n = x.length; while (n > 1000 && Math.abs(x[n - 1]) < 1e-4) n--;
      const wav = new DataView(new ArrayBuffer(44 + n * 2)), w = (o, s) => { for (let i = 0; i < s.length; i++) wav.setUint8(o + i, s.charCodeAt(i)); };
      w(0, 'RIFF'); wav.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); wav.setUint32(16, 16, true); wav.setUint16(20, 1, true); wav.setUint16(22, 1, true); wav.setUint32(24, sr, true); wav.setUint32(28, sr * 2, true); wav.setUint16(32, 2, true); wav.setUint16(34, 16, true); w(36, 'data'); wav.setUint32(40, n * 2, true);
      for (let i = 0; i < n; i++) wav.setInt16(44 + i * 2, Math.max(-1, Math.min(1, x[i])) * 32767, true);
      let s = ''; const u = new Uint8Array(wav.buffer); for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode.apply(null, u.subarray(i, i + 8192));
      out[name] = btoa(s);
    }
    return out;
  });
  for (const k in res) { if (res[k].startsWith('ERR')) { console.log(k, res[k]); continue; } fs.writeFileSync(path.join(out, k + '.wav'), Buffer.from(res[k], 'base64')); }
  console.log(Object.keys(res).length, 'rendered', errs.join('\n')); await b.close(); })();
