const shots = {}; const log = [];
for (const [lv, seed] of [[3, 2024], [5, 555], [9, 909]]) {
  newHero(); G.mode = 'play'; startLevel(lv, seed);
  const r = LV.rooms[1]; hero.fi = r.cx + 0.5; hero.fj = r.cy + 0.5; if (blocked(hero.fi, hero.fj)) { hero.fi += 1; }
  for (const e of enemies) e.state = 'sleep';
  for (let i = 0; i < 30; i++) { update(1 / 60); warmStep(40); }
  render(); shots['t' + lv] = cvs.toDataURL();
  log.push({ lv, theme: LV.theme, decor: LV.decor.reduce((a, d) => (a[d.kind] = (a[d.kind] || 0) + 1, a), {}) });
}
window.__out = { log, shots };
