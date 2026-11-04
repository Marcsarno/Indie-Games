// round 45: the bag and the skills screens (with the live preview) for each class
(async () => {
Math.random = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const L = [], shots = {};
const run = n => { for (let k = 0; k < n; k++) { update(1 / 60); warmStep(10); } };
const shot = k => { G.actCard = 0; for (let i = 0; i < 300; i++) warmStep(30); render(); shots[k] = cvs.toDataURL(); };
const wait = ms => new Promise(r => setTimeout(r, ms));
const R = (() => { let s = 99; const f = () => (s = (s * 16807) % 2147483647) / 2147483647; f.int = (a, b) => a + Math.floor(f() * (b - a + 1)); f.pick = a => a[Math.floor(f() * a.length)]; return f; })();
for (const cls of ['warrior', 'mage', 'ranger']) {
  newHero(cls); hero.lvl = 5; recalcHero(); G.mode = 'play'; G.story = null; startLevel(1, 4242); G.actCard = 0; run(5);
  for (let k = 0; k < 9; k++) hero.bag.push(rollItem(R, 4));
  shot(cls + '-play');
  hero.bag[2].isNew = true; G.mode = 'inv'; INV.sel = null; shot(cls + '-inv0'); const wi = hero.bag.find(it => ITEM_BASES[it.base].slot === 'weapon') || hero.bag[0]; INV.sel = { item: wi, from: 'bag' }; shot(cls + '-inv'); L.push({ cls, ups: bagUpgrades().length, best: bestUpgrades().map(itemName).join(',') });
  openInv('skills'); render();
  for (let k = 0; k < 100 && !PVP.ready && !PVP.failed; k++) await wait(100);
  const t0 = performance.now(); for (let k = 0; k < 40; k++) { update(1 / 30); render(); } const ms = (performance.now() - t0) / 40;
  shot(cls + '-skills'); SKV.view.k = 0; for (let k = 0; k < 40; k++) { update(1 / 30); render(); } shot(cls + '-skills2');
  L.push({ cls, pvReady: PVP.ready, failed: PVP.failed, err: PVP.err, msPerFrame: +ms.toFixed(1), dmg: pvDamage() });
  closeInv();
}
window.__out = { log: L, shots };
})()
