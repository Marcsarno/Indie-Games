// round 45: every skill and modifier of every class in the skills-screen preview: it runs without
// error, does damage where it should, and its frames (mid-loop) go on a contact sheet
(async () => {
const L = [], shots = {};
const wait = ms => new Promise(r => setTimeout(r, ms));
newHero('warrior'); hero.lvl = 5; recalcHero(); G.mode = 'play'; startLevel(1, 4242); pvBoot();
for (let k = 0; k < 100 && !PVP.ready; k++) await wait(100);
let ms = 0, nf = 0;
for (const cls of ['warrior', 'mage', 'ranger']) {
  newHero(cls); hero.lvl = 5; recalcHero();
  for (const sk of skillsScreenList()) for (let k = -1; k < 3; k++) {
    const m = k >= 0 ? (SKILL_MODS[sk.id] || [])[k] : null; if (k >= 0 && !m) continue;
    PVP.key = ''; pvShow(sk.id, m ? m.id : null);
    const len = PVP.win.eval('(PV_PLAN[PVS.id] || { len: 2.4 }).len');
    for (let f = 0; f < 40; f++) PVP.win.warmStep(40);   // its sprites, built up front for the test
    const frames = [];
    for (let f = 0, n = Math.ceil(len * 30) + 2; f < n; f++) { const t0 = performance.now(); pvTick(1 / 30); ms += performance.now() - t0; nf++; if ([12, 24, 40].includes(f)) frames.push(PVP.cvs.toDataURL()); }
    const st = PVP.win.pvStats();
    L.push(`${cls} ${sk.id}/${m ? m.id : '-'}: ${PVP.failed ? 'FAILED ' + PVP.err : 'ok'} dmg ${st.last}`);
    frames.forEach((u, n) => shots[`${cls}-${sk.id}-${m ? m.id : 'base'}-${n}`] = u);
    if (PVP.failed) { PVP.failed = false; }
  }
}
L.push({ msPerPreviewFrame: +(ms / nf).toFixed(1) });
window.__out = { log: L, shots };
})()
