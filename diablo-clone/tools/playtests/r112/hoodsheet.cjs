// round 112: review sheet for a ranger hood: the Thorn Sentinel outfit with the old hood (before) and the new
// one (after): 8 directions, walk and attack frames, 1x, silhouettes. node hoodsheet.cjs <out.png> [beforeHelm] [afterHelm]
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => { const [out, h0 = 'night_hood', h1 = 'rt_thorn_hood'] = process.argv.slice(2), b = await chromium.launch(), p = await b.newPage(), errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; window.localStorage.clear(); });
  await p.goto('file://' + path.resolve(__dirname, '../../../game/index.html') + '?cine=0');
  const u = await p.evaluate(([h0, h1]) => {
    buildBudget.ms = Infinity; const Z = 3, PX = 2, CW = 44 * PX * Z, CH = 50 * PX * Z, rows = [], cvs2 = document.createElement('canvas');
    const dress = helm => { newHero('ranger'); for (const s of SLOTS) if (s !== 'ring' && s !== 'amulet') hero.equip[s] = null;
      for (const id of ['thorn_sentinel_jerkin', helm, 'thorn_sentinel_bow', 'quiver']) { if (!ITEM_BASES[id]) continue; const it = rollItem(rng(1), 5, id); it.rarity = 'normal'; it.mods = {}; hero.equip[ITEM_BASES[id].slot] = it; } recalcHero(); return { ...hero.look, helm: ITEM_BASES[helm].look }; };
    const looks = [dress(h0), dress(h1)], cells = look => [...[0, 1, 2, 3, 4, 5, 6, 7].map(d => [d, 'idle', 0]), [1, 'walk', 2], [1, 'walk', 5], [1, 'shoot', 2]].map(([d, c, f]) => getSprite('hero', look, d, c, f, { look, cls: 'ranger', combo: 0 }, PX));
    cvs2.width = 11 * CW; cvs2.height = 4 * CH + 60; const g = cvs2.getContext('2d'); g.fillStyle = '#4a4d52'; g.fillRect(0, 0, cvs2.width, cvs2.height);
    const paint = (sp, x0, y0, z, sil) => { for (let y = 0; y < sp.h; y++) for (let x = 0; x < sp.w; x++) { const v0 = sp.data[y * sp.w + x]; if (!v0) continue; const v = (v0 & 128) ? v0 & 127 : LTAB[4][v0 & 127]; g.fillStyle = sil ? '#111' : `rgb(${PR[v]},${PG[v]},${PB[v]})`; g.fillRect(x0 + x * z, y0 + y * z, z, z); } };
    looks.forEach((look, r) => { const sps = cells(look), y = 30 + r * 2 * CH; g.fillStyle = '#ffd77a'; g.font = 'bold 18px monospace'; g.fillText(r ? 'AFTER: ' + h1 : 'BEFORE: ' + h0, 8, y - 6);
      sps.forEach((sp, k) => paint(sp, k * CW + CW / 2 - sp.ax * Z, y + CH - 8 * Z - sp.ay * Z, Z));
      sps.slice(0, 8).forEach((sp, k) => { paint(sp, k * 60 + 30 - sp.ax, y + CH + 40 - sp.ay, 1); paint(sp, 520 + k * 90 + 40 - sp.ax * 1.5, y + CH + 60 - sp.ay * 1.5, 1.5, true); });
    });
    return cvs2.toDataURL(); }, [h0, h1]);
  fs.writeFileSync(out, Buffer.from(u.split(',')[1], 'base64')); console.log(errs.slice(0, 3).join('\n') || 'no errors'); await b.close(); })();
