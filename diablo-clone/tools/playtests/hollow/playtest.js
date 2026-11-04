// round 48c: The Hollow. For several seeds: from the camp, can you reach every clearing, door,
// cache and person; is the exit north shut while the fallen tree lies there and open once Aldo is
// free; did every pack land; how many monsters, at which levels. Then the Riverlands stand-in: the
// farm, the cellar door, the mine, the way back south. Screenshots of the camp, the tree, the doors.
const L = [], shots = {};
const shot = (k, fi, fj) => { hero.fi = fi; hero.fj = fj; G.msg = []; for (let i = 0; i < 300; i++) warmStep(30); render(); shots[k] = cvs.toDataURL(); };
const reach = (d, p) => { for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) { const i = Math.floor(p[0]) + a, j = Math.floor(p[1]) + b; if (i >= 0 && j >= 0 && i < MW && j < MH && d[tIdx(i, j)] >= 0) return true; } return false; };
newHero('warrior'); G.mode = 'play';
for (const seed of [4242, 7, 99, 31337]) {
  for (const open of [false, true]) {
    G.story = { f: open ? { met: true, woodTold: true, alphaDead: true, aldoFree: true } : { met: true }, n: 0 }; G.gates = null;
    startLevel(1, seed); G.actCard = 0;
    const d = bfs(LV.start.cx, LV.start.cy), out = { seed, open };
    out.clearingsUnreached = HOLLOW.clearings.filter(c => !reach(d, US(c.u, c.s).map(v => v + 0.5))).map(c => c.id).join(',') || 'none';
    out.doors = Object.keys(SIDES).filter(k => SIDES[k].at === 'hub').map(k => k + ':' + reach(d, SIDES[k].door())).join(' ');
    out.exit = reach(d, [LV.stairs.i + 0.5, LV.stairs.j + 0.5]);
    out.people = npcs.filter(n => !reach(d, [n.fi, n.fj])).map(n => n.role).join(',') || 'all';
    out.chests = dynProps.filter(p => p.kind === 'chest').length + ' unreached ' + dynProps.filter(p => p.kind === 'chest' && !reach(d, [p.i + 0.5, p.j + 0.5])).length;
    const lv = {}; for (const e of enemies) lv[e.id + e.lvl] = (lv[e.id + e.lvl] || 0) + 1;
    out.monsters = enemies.length; out.byLevel = lv; out.nearCamp = enemies.filter(e => Math.hypot(e.fi - HUB.camp[0], e.fj - HUB.camp[1]) < HUB.safe).length;
    L.push(out);
  }
}
// pictures (seed 4242)
G.story = { f: { met: true }, n: 0 }; startLevel(1, 4242); G.actCard = 0; enemies = [];
shot('camp', HUB.camp[0] + 0.5, HUB.camp[1] + 0.5);
shot('tree', HUB.tree[0] + 2.5, HUB.tree[1] + 1.5);
shot('den', SIDES.den.door()[0] + 1.5, SIDES.den.door()[1] + 2);
shot('barrow', SIDES.barrow.door()[0] + 2, SIDES.barrow.door()[1] + 2);
shot('tower', SIDES.tower.door()[0] + 2, SIDES.tower.door()[1] + 2);
shot('glade', US(17, 63)[0], US(17, 63)[1]);
// the Riverlands
for (const open of [false, true]) {
  G.story = { f: { met: true, aldoFree: true, mineOpen: open }, n: 0 }; startLevel(2, 4242); G.actCard = 0;
  const d = bfs(LV.start.cx, LV.start.cy);
  L.push({ riv: true, area: areaName(), mine: reach(d, [LV.stairs.i + 0.5, LV.stairs.j + 0.5]), cellar: reach(d, SIDES.cellar.door()), back: reach(d, LV.backExit), gateRoad: reach(d, [RIV.gate[0] + 1.5, RIV.gate[1] - 1.5]), gatePastShut: reach(d, LV.gatePos), brigands: enemies.filter(e => e.id === 'brigand').length, monsters: enemies.length });
}
enemies = []; shot('riv-farm', RIV.farm[0], RIV.farm[1] + 6); shot('riv-mine', RIV.mine[0] + 4, RIV.mine[1] + 4);
window.__out = { log: L, shots };
