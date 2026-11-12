// round 103: the dungeon handoff's mutation tests: take a valid floor, break it on purpose, and prove the
// validator names the broken rule. node mutate.cjs
const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + path.resolve('game/index.html') + '?cine=0');
  const r = await p.evaluate(() => { newHero('warrior'); const out = [];
    let seed = 0; for (let n = 0; n < 200; n++) { genLevel(3, n * 7717); if (LV.vault) { seed = n * 7717; break; } }
    const fresh = () => { genLevel(3, seed); return validateLevel(false); };
    out.push('base floor seed ' + seed + ' valid: ' + JSON.stringify(fresh()));
    const near = (k) => { const S = LV.start; return [S.cx + 0.5 + k, S.cy + 0.5]; };
    const M = [
      ['vault gate left open', 'R4 vault open', () => { for (const [i, j] of LV.vault.gate) LV.solid[tIdx(i, j)] = 0; }],
      ['key put in the vault', 'R4 key unreachable', () => { const r = LV.rooms[LV.vault.room], k = LV.spawns.find(s => s.key); k.fi = r.cx + 0.5; k.fj = r.cy + 0.5; }],
      ['key deleted', 'R4 no key', () => { LV.spawns = LV.spawns.filter(s => !s.key); }],
      ['stairs walled in', 'R2 stairs unreachable', () => { const S = LV.stairs; for (let b = -2; b <= 2; b++) for (let a = -2; a <= 2; a++) if (Math.abs(a) === 2 || Math.abs(b) === 2) LV.solid[tIdx(S.i + a, S.j + b)] = 1; }],
      ['a room cut off', 'R3 floor cut off', () => { const n = LV.rooms.findIndex((r, n) => n && n !== LV.stairs.room && r.role !== 'vault' && r.dead), r = LV.rooms[n]; for (let j = r.y - 1; j <= r.y + r.h; j++) for (let i = r.x - 1; i <= r.x + r.w; i++) if (i < r.x || j < r.y || i >= r.x + r.w || j >= r.y + r.h) LV.solid[tIdx(i, j)] = 1; LV.spawns = LV.spawns.filter(s => LV.roomOf[tIdx(Math.floor(s.fi), Math.floor(s.fj))] !== n); LV.decor = LV.decor.filter(d => d.kind !== 'chest' || LV.roomOf[tIdx(d.i, d.j)] !== n); }],
      ['monster beside the start', 'R9 spawn near start', () => { const [fi, fj] = near(1.5); LV.spawns.push({ id: 'skeleton', fi, fj }); }],
      ['monster in a wall', 'R9 spawn blocked', () => { for (let k = 0; k < MW * MH; k++) if (LV.map[k] === WALL) { LV.spawns.push({ id: 'skeleton', fi: k % MW + 0.5, fj: ((k / MW) | 0) + 0.5 }); break; } }],
      ['three elite packs', 'R10 too many elites', () => { let c = LV.spawns.filter(s => s.champ).length; for (const s of LV.spawns) if (!s.champ && c < 3) { s.champ = true; c++; } }],
      ['every loop removed', 'R7 no loop', () => { LV.loops = 0; }],
      ['a line of rooms', 'R7 a line', () => { LV.rooms.forEach(r => r.crit = true); }],
      ['twelve chests', 'R11 chests', () => { const c = LV.decor.find(d => d.kind === 'chest'); for (let k = 0; k < 12; k++) LV.decor.push(Object.assign({}, c)); }],
      ['no chests', 'R11 chests', () => { LV.decor = LV.decor.filter(d => d.kind !== 'chest'); }],
      ['stairs off the wall', 'stairs not on a wall', () => { delete LV.stairs.face; }],
    ];
    let pass = 0;
    for (const [name, want, f] of M) { fresh(); f(); const bad = validateLevel(false), ok = bad.some(x => x.startsWith(want)); if (ok) pass++; out.push((ok ? 'PASS ' : 'FAIL ') + name.padEnd(26) + ' -> ' + JSON.stringify(bad)); }
    out.push(`mutation tests: ${pass}/${M.length} caught`);
    return out; });
  console.log(r.join('\n')); console.log(errs.length ? 'PAGE ERR ' + errs.join('\n') : 'no page errors'); await b.close(); })();
