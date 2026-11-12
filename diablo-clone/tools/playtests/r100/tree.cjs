// round 100: finish the Hollow's three dangers with the Standing Stones last (in the Hollow itself):
// the fallen tree must go at once, the road north must be walkable, the arrow must lead to the Riverlands
const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve('game/index.html') + '?cine=0');
  const r = await p.evaluate(() => { const log = [];
    allocBuffers(270, 480); G.mode = 'title'; beginGame(false, 'warrior'); G.actCard = 0; window.drawHud = () => {};
    const f = storyF(); Object.assign(f, { met: true, woodTold: true, alphaDead: true, aldoFree: true, woodPaid: true, h3tower: true, h3barrow: true });
    hero.lvl = 6; recalcHero(); log.push('hub ' + LV.hub + ' level ' + LV.level); startLevel(LV.level, LV.seed); G.actCard = 0;
    const T = LV.treeBlock; log.push('stage ' + storyStage() + ' tree ' + !!T);
    const solidAt = () => { let n = 0; for (let di = -4; di <= 4; di++) for (let dj = -4; dj <= 4; dj++) if (LV.solid[tIdx(Math.floor(T[0] + di), Math.floor(T[1] + dj))]) n++; return n; };
    const s0 = solidAt(); log.push('solid near tree before ' + s0);
    hero.fi = T[0] - 2; hero.fj = T[1] + 1.5; G.msg = []; G.sealT = 0; update(1 / 60); log.push('at the tree before: ' + JSON.stringify((G.msg || []).map(m => m.text || m.t || m[0] || m)));
    // the stones: the last of the three, finished out in the Hollow
    h3Complete(H3[1]); for (let k = 0; k < 30; k++) update(1 / 60);
    log.push('stage ' + storyStage() + ' treeCleared ' + !!f.treeCleared + ' treeBlock ' + !!LV.treeBlock + ' solid near tree after ' + solidAt() + ' decor fallentree ' + LV.decor.filter(d => d.kind === 'fallentree').length + ' log ' + LV.decor.filter(d => d.kind === 'log').length);
    // walk the road through where the trunk lay
    hero.fi = T[0]; hero.fj = T[1]; log.push('standable on the trunk spot ' + standable(T[0], T[1], 0.3));
    { const S = LV.stairs, goal = tIdx(S.i, S.j), seen = new Uint8Array(MW * MH), q = [tIdx(Math.floor(T[0] - 3), Math.floor(T[1] + 1))]; let ok = false;   // can he walk from the camp's side of the tree to the road north?
      while (q.length) { const k = q.pop(); if (k === goal) { ok = true; break; } if (seen[k]) continue; seen[k] = 1; const i = k % MW, j = (k / MW) | 0; for (const [a, c] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + a, jj = j + c; if (ii < 0 || jj < 0 || ii >= MW || jj >= MH) continue; const kk = tIdx(ii, jj); if (!seen[kk] && (kk === goal || !blocked(ii + 0.5, jj + 0.5))) q.push(kk); } }
      log.push('walkable to the road north ' + ok); }
    G.msg = []; G.sealT = 0; update(1 / 60); log.push('msgs ' + JSON.stringify((G.msg || []).map(m => m.text || m[0] || m)));
    return log; });
  console.log(r.join('\n')); console.log(errs.length ? 'ERR ' + errs.join('\n') : 'no page errors'); await b.close(); })();
