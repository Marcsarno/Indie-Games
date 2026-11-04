// round 45: one loop of a few previews, frame by frame, for GIFs on the round page
(async () => {
const shots = {}, wait = ms => new Promise(r => setTimeout(r, ms));
newHero('warrior'); hero.lvl = 5; recalcHero(); G.mode = 'play'; startLevel(1, 4242); pvBoot();
for (let k = 0; k < 100 && !PVP.ready; k++) await wait(100);
for (const [cls, id, mod] of [['warrior', 'slam', 'fissure'], ['warrior', 'whirl', 'devil'], ['mage', 'fireball', 'split'], ['mage', 'meteor', 'shower'], ['ranger', 'multi', 'fire'], ['ranger', 'trap', 'net']]) {
  newHero(cls); hero.lvl = 5; recalcHero(); PVP.key = ''; pvShow(id, mod);
  for (let f = 0; f < 60; f++) PVP.win.warmStep(40);
  const len = PVP.win.eval('pvPlan().len');
  for (let f = 0; f < Math.ceil(len * 20); f++) { pvTick(1 / 20); shots[`${id}-${mod}-${String(f).padStart(3, '0')}`] = PVP.cvs.toDataURL(); }
}
window.__out = { log: [], shots };
})()
