// round 78: the Hollow's three dangers. After Aldo is home the road north stays shut; the tracker
// lists three objectives; tapping one leads the arrow there; the stones' three waves, the tower's
// chieftain and the barrow's wraith each tick one off at rising levels (3, 4, 5 in the order
// taken); when all are done the tree is cleared and the story moves on. An old save past the tree
// skips the step.
Math.random = (() => { let s = 23; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const L = [], shots = {};
const step = (n, dt = 1 / 30) => { for (let i = 0; i < n; i++) { G.t += dt; update(dt); } };
const snap = k => { render(); shots[k] = cvs.toDataURL(); };
newHero('warrior'); hero.lvl = 9; recalcHero(); G.mode = 'play';
G.story = { f: { met: true, woodTold: true, alphaDead: true, aldoFree: true, woodPaid: true }, n: 0 };
startLevel(1, 4242); G.actCard = 0; G.talk = null; G.mode = 'play'; hero.hp = STAT.maxHp = 9999;
L.push({ stage: storyStage(), treeShut: !hollowOpen(), treeBlock: !!LV.treeBlock, levelFirst: h3Level(), target: storyTarget() && storyTarget().map(v => +v.toFixed(1)), picked: h3Pick().k });
render(); L.push({ trackerLines: UI.h3.length });
G.h3sel = 'barrow'; L.push({ tapBarrow: h3Pick().k, towerDiff: sideDiff('tower'), barrowDiff: sideDiff('barrow') }); G.h3sel = null;
// the stones
const c = STONES_AT(); hero.fi = c[0] + 0.6; hero.fj = c[1] + 0.6; enemies.forEach(e => { if (Math.hypot(e.fi - c[0], e.fj - c[1]) < 14) e.hp = 0; }); enemies = enemies.filter(e => e.hp > 0);
const a = actionTarget(); L.push({ button: a && a.label }); a.go();
const waves = []; let guard = 0, seen = 0;
while (G.stones && guard++ < 4000) { step(1); hero.hp = 9999; if (G.stones && G.stones.wave !== seen) { seen = G.stones.wave; waves.push(G.stones.list.map(e => e.id + e.lvl).join(',')); if (seen === 1) snap('wave'); } if (G.stones) for (const e of G.stones.list) if (alive(e) && guard % 20 === 0) damageEnemy(e, 9999, hero.fi, hero.fj); }
L.push({ waves, stonesDone: !!storyF().h3stones, count: h3Count(), nextLevel: h3Level(), drops: groundItems.filter(g => g.item).map(g => ITEM_BASES[g.item.base].slot) });
snap('tracker');
// the tower: its chieftain
const killBoss = (side, id) => { startLevel(1, (4242 ^ SIDES[side].seed) >>> 0, side); const b = enemies.find(e => e.id === id); const r = { side, diff: LV.diff, boss: !!b, target: !!storyTarget() }; if (b) { hero.fi = b.fi + 1; hero.fj = b.fj; damageEnemy(b, 99999, hero.fi, hero.fj); step(40); } return r; };
L.push({ tower: killBoss('tower', 'gchief'), done: !!storyF().h3tower, nextLevel: h3Level() });
L.push({ barrow: killBoss('barrow', 'wraith'), done: !!storyF().h3barrow, all: h3Done() });
startLevel(1, 4242); step(30);
L.push({ stage: storyStage(), treeOpen: hollowOpen(), treeBlock: !!LV.treeBlock, cleared: !!storyF().treeCleared });
// an old save already past the tree: no three-dangers step
G.story = { f: { met: true, woodTold: true, alphaDead: true, aldoFree: true, woodPaid: true, treeCleared: true }, n: 0 };
L.push({ oldSave: storyStage(), open: hollowOpen() });
window.__out = { log: L, shots };
