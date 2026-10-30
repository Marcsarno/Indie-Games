// Phone measurement panel, loaded only with ?hud=1 (or ?bench=1 / ?bench=soak). Uses only rAF gaps, performance.now() and renderer.info,
// because iPhone Safari has no long-task API, no memory API and no GPU timers. No allocation per frame: fixed Float32Array rings.
export function start(C, THREE) {
  const R = C.renderer, info = R.info, PF = C.PF; PF.on = true;
  const qs = new URLSearchParams(location.search), BENCH = qs.get('bench'); const N = 600;            // ~5 s at 120 Hz
  const gaps = new Float32Array(N), jsms = new Float32Array(N), tmp = new Float32Array(N); let gi = 0, gn = 0, lastT = 0, over20 = 0, over36 = 0, frames = 0;
  const first = new Float32Array(120); let fi = 0, hz = 0;
  const sys = { phys: 0, anim: 0, misc: 0, render: 0 }, worst = { phys: 0, anim: 0, misc: 0, render: 0 }; let sysN = 0;
  const t0 = performance.now(); let invalid = '', segs = [], soak = [];

  // ---------- panel ----------
  const css = document.createElement('style'); css.textContent = `
#hudp{position:fixed;left:8px;top:60px;z-index:50;width:min(300px,calc(100vw - 16px));max-height:calc(100vh - 80px);overflow:auto;background:rgba(10,12,16,.86);color:#e8eef5;font:11px/1.3 ui-monospace,Menlo,monospace;border-radius:10px;padding:8px 10px;-webkit-user-select:text;user-select:text}
#hudp b{color:#ffd166;font-weight:600} #hudp .row{display:flex;flex-wrap:wrap;gap:4px;margin:6px 0} #hudp button{font:600 12px system-ui;padding:6px 8px;border-radius:7px;border:1px solid #445;background:#1f2633;color:#e8eef5;min-height:32px}
#hudp button.on{background:#2f6f4f;border-color:#4a9} #hudp button.off{background:#5a2a2a;border-color:#a55} #hudp textarea{width:100%;height:120px;background:#0b0d11;color:#cde;border:1px solid #334;border-radius:6px;font:11px ui-monospace,monospace}
#hudp .x{float:right} #hudp small{color:#9ab}`;
  document.head.appendChild(css);
  const el = document.createElement('div'); el.id = 'hudp'; document.body.appendChild(el);
  el.innerHTML = `<button class="x" id="h-min">tools</button><div id="h-main"><div id="h-txt">measuring…</div><div id="h-tools" hidden>
<div class="row"><small style="width:100%">Render scale (fill-bound test)</small>${[100, 75, 50, 25].map(k => `<button data-scale="${k}">${k}%</button>`).join('')}<button data-scale="auto" class="on">auto</button></div>
<div class="row"><small style="width:100%">Switch off (20 s each from the same spot)</small>${['shadows', 'buildings', 'trees', 'traffic', 'people', 'fog'].map(k => `<button data-tog="${k}" class="on">${k}</button>`).join('')}</div>
<div class="row"><button id="h-bench">Bench 3×20 s</button><button id="h-rep">Report</button></div></div><div id="h-out"></div></div>`;
  const $ = s => el.querySelector(s), txt = $('#h-txt');
  $('#h-min').onclick = () => { const m = $('#h-tools'); m.hidden = !m.hidden; $('#h-min').textContent = m.hidden ? 'tools' : 'hide'; };

  const baseRatio = Math.min(devicePixelRatio || 1, 2);
  for (const b of el.querySelectorAll('[data-scale]')) b.onclick = () => {
    for (const o of el.querySelectorAll('[data-scale]')) o.classList.remove('on'); b.classList.add('on');
    const k = b.dataset.scale; if (k === 'auto') { C.q.lock = false; return; }
    C.q.lock = true; C.q.ratio = baseRatio * (+k / 100); R.setPixelRatio(C.q.ratio); C.resize(); reset();
  };
  const tog = {
    shadows: v => { R.shadowMap.enabled = v; C.scene.traverse(o => { if (o.material) for (const m of [].concat(o.material)) m.needsUpdate = true; }); },
    buildings: v => { C.cityRoot.visible = v; }, trees: v => { for (const im of C.instances) im.visible = v; },
    traffic: v => { for (const t of C.traffic) if (t.g) t.g.visible = v; }, people: v => { for (const w of C.walkers) w.root.visible = v; },
    fog: (() => { const f = C.scene.fog; return v => { C.scene.fog = v ? f : null; C.scene.traverse(o => { if (o.material) for (const m of [].concat(o.material)) m.needsUpdate = true; }); }; })(),
  };
  for (const b of el.querySelectorAll('[data-tog]')) b.onclick = () => { const on = !b.classList.contains('on'); b.classList.toggle('on', on); b.classList.toggle('off', !on); tog[b.dataset.tog](on); reset(); };

  function reset() { gi = 0; gn = 0; over20 = 0; over36 = 0; sysN = 0; for (const k in sys) { sys[k] = 0; worst[k] = 0; } }
  function pct(arr, n, p) { for (let i = 0; i < n; i++) tmp[i] = arr[i]; const s = tmp.subarray(0, n).sort(); return s[Math.min(n - 1, Math.floor(p * (n - 1)))]; }
  function snap() {
    const n = gn; if (!n) return null;
    return { med: +pct(gaps, n, .5).toFixed(2), p95: +pct(gaps, n, .95).toFixed(2), p99: +pct(gaps, n, .99).toFixed(2), js: +pct(jsms, n, .5).toFixed(2), jsP95: +pct(jsms, n, .95).toFixed(2), over20, over36, frames: n,
      calls: info.render.calls, tris: info.render.triangles, geos: info.memory.geometries, tex: info.memory.textures, progs: (info.programs || []).length,
      sys: Object.fromEntries(Object.entries(sys).map(([k, v]) => [k, +(v / Math.max(1, sysN)).toFixed(2)])), worst: Object.fromEntries(Object.entries(worst).map(([k, v]) => [k, +v.toFixed(1)])) };
  }

  // ---------- per frame (no allocation) ----------
  C.setFrameHook((t, js) => {
    if (lastT) {
      const g = t - lastT;
      if (performance.now() - t0 > 3000 && g < 250) {
        gaps[gi] = g; jsms[gi] = js; gi = (gi + 1) % N; if (gn < N) gn++; if (g > 20) over20++; if (g > 36) over36++;
        for (const k in sys) { const v = PF.ms[k]; sys[k] += v; if (v > worst[k]) worst[k] = v; } sysN++;
        if (fi < 120) { first[fi++] = g; if (fi === 120) { const s = Array.from(first).sort((a, b) => a - b); hz = Math.round(1000 / s[60]); } }
      }
    }
    lastT = t; frames++;
    if (bench) bench.step(t);
  });
  setInterval(() => {
    const s = snap(); if (!s) return;
    txt.innerHTML = `<b>frame</b> ${s.med} ms med · ${s.p95} p95 · ${s.p99} p99 <small>(${hz || '?'} Hz screen)</small><br>` +
      `<b>JS</b> ${s.js} ms med · ${s.jsP95} p95 · &gt;20ms ${s.over20} · &gt;36ms ${s.over36}<br>` +
      `<b>sys ms</b> phys ${s.sys.phys} · anim ${s.sys.anim} · misc ${s.sys.misc} · render ${s.sys.render}<br><small>worst: phys ${s.worst.phys} anim ${s.worst.anim} misc ${s.worst.misc} render ${s.worst.render}</small><br>` +
      `<b>gpu work</b> ${s.calls} calls · ${(s.tris / 1000).toFixed(0)}k tris · ${s.geos} geo · ${s.tex} tex · ${s.progs} programs<br>` +
      `<b>pixels</b> ${R.getDrawingBufferSize(new THREE.Vector2()).toArray().join('×')} (ratio ${R.getPixelRatio().toFixed(2)})` + (invalid ? `<br><b style="color:#f66">INVALID: ${invalid}</b>` : '');
  }, 500);
  document.addEventListener('visibilitychange', () => { if (document.hidden) invalid = invalid || 'tab was hidden'; });

  // ---------- crash breadcrumb ----------
  const KEY = 'gtcc.crumb';
  try { const prev = JSON.parse(localStorage.getItem(KEY) || 'null'); if (prev && !prev.clean) { const d = document.createElement('div'); d.innerHTML = `<div class="row"><button id="h-crash">Last session ended abruptly: show log</button></div>`; $('#h-main').prepend(d); $('#h-crash').onclick = () => show(JSON.stringify(prev, null, 1)); } } catch (e) { }
  const crumb = clean => { try { localStorage.setItem(KEY, JSON.stringify({ t: new Date().toISOString(), clean, stats: snap() })); } catch (e) { } };
  setInterval(() => crumb(false), 5000); addEventListener('pagehide', () => crumb(true));

  // ---------- bench: scripted camera loop over the city, time-driven ----------
  let bench = null;
  const PATH = [[0, 0], [0, 150], [-120, 150], [-120, -110], [130, -110], [130, 120], [0, 120], [0, 0]];   // metres (x east, y north), a loop through the districts
  function camAt(s) {                                                                                  // position along the loop at distance s
    let L = 0; for (let i = 0; i < PATH.length - 1; i++) { const [ax, ay] = PATH[i], [bx, by] = PATH[i + 1], l = Math.hypot(bx - ax, by - ay); if (s <= L + l) { const u = (s - L) / l; return [ax + (bx - ax) * u, ay + (by - ay) * u]; } L += l; }
    return null;
  }
  function runBench(kind) {
    const soakMode = kind === 'soak', segLen = soakMode ? 900 : 20, nSeg = soakMode ? 1 : 3; segs = []; soak = []; invalid = '';
    let tStart = 0, seg = -1, lastWin = 0; const speed = 18; C.upd.bench = { x: 0, z: 0 }; txt.insertAdjacentHTML('afterend', '<div id="h-bs"><small>bench running…</small></div>');
    bench = { step(t) {
      if (!tStart) tStart = t; const el_ = (t - tStart) / 1000;
      let p = camAt((el_ * speed) % 1000); if (!p) p = [0, 0]; C.upd.bench.x = p[0]; C.upd.bench.z = -p[1];
      if (el_ < 5) return;                                                                            // warm-up discarded
      const k = Math.floor((el_ - 5) / segLen);
      if (k !== seg) { if (seg >= 0) segs.push(snap()); seg = k; reset(); if (seg >= nSeg) { bench = null; C.upd.bench = null; const b = el.querySelector('#h-bs'); if (b) b.remove(); report(); return; } }
      if (soakMode && el_ - lastWin >= 10) { lastWin = el_; const s = snap(); if (s) soak.push({ t: Math.round(el_), med: s.med, p95: s.p95, p99: s.p99 }); }
    } };
  }
  $('#h-bench').onclick = () => runBench('3x20');
  if (BENCH) setTimeout(() => runBench(BENCH === 'soak' ? 'soak' : '3x20'), 1500);

  // ---------- report ----------
  function report() {
    const tf = C.cityRoot && []; C.cityRoot.traverse(o => { if (o.material) for (const m of [].concat(o.material)) if (m.map && tf.length < 6) tf.push(m.map.format); });
    const r = { build: document.lastModified, ua: navigator.userAgent, screen: [screen.width, screen.height], dpr: devicePixelRatio, ratio: R.getPixelRatio(), refreshHz: hz, buffer: R.getDrawingBufferSize(new THREE.Vector2()).toArray(),
      now: snap(), segments: segs, soak, invalid: invalid || null, textureFormats: [...new Set(tf)], perf: window.__perf, merge: window.__merge,
      device: '(type the phone model)', battery: '', charging: '', lowPowerMode: '', tabs: '' };
    show(JSON.stringify(r, null, 1), true);
  }
  function show(s, share) {
    const out = $('#h-out'); out.innerHTML = `<textarea readonly></textarea><div class="row"><button id="h-copy">Copy</button>${share ? '<button id="h-share">Share / save</button>' : ''}</div>`;
    out.querySelector('textarea').value = s;
    $('#h-copy').onclick = async () => { try { await navigator.clipboard.writeText(s); $('#h-copy').textContent = 'Copied'; } catch (e) { out.querySelector('textarea').select(); } };
    if (share) $('#h-share').onclick = async () => {
      const f = new File([s], 'gtcc-report.json', { type: 'application/json' });
      try { if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: 'GTCC report' }); return; } } catch (e) { }
      const u = URL.createObjectURL(f), a = document.createElement('a'); a.href = u; a.download = 'gtcc-report.json'; a.click(); setTimeout(() => URL.revokeObjectURL(u), 10000);
    };
  }
  $('#h-rep').onclick = report;
}
