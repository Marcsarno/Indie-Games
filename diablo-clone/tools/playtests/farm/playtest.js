Math.random = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const log = [], shots = {};
const step = n => { for (let i = 0; i < n; i++) { update(1 / 60); warmStep(80); } };
newHero(); G.mode = 'play'; startLevel(1, 777);
log.push({ critters: npcs.filter(n => n.role === 'chicken').map(n => n.fam).join(','), crops: LV.decor.filter(d => d.kind === 'crop').length, fences: LV.decor.filter(d => d.kind === 'fence').length });
hero.fi = 14.5; hero.fj = 26.5; step(120); render(); shots.farm = cvs.toDataURL();
window.__out = { log, shots };
