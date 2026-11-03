const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file:///home/user/indie-games/diablo-clone/game/sheet.html');
  console.log(await p.evaluate(() => {
    const out = [];
    for (const [fam, look] of [['hero', { team: 'red', helm: 'hat', chest: 'robe_blue', weapon: 'staff', shield: 'none' }], ['hero', { team: 'blue', helm: 'great', chest: 'plate', weapon: 'sword', shield: 'kite' }], ['skeleton', MONSTERS.skeleton.look], ['fallen', MONSTERS.fallen.look], ['ogre', MONSTERS.warlord.look]]) {
      for (const px of [1, 2]) { const t0 = performance.now(); let n = 0; for (let d = 0; d < 8; d++) for (let f = 0; f < 4; f++) { getSprite(fam, look, d, 'walk', f, { look }, px); n++; } out.push(`${fam} px${px}: ${((performance.now() - t0) / n).toFixed(2)} ms/sprite`); }
    }
    return out.join('\n');
  })); await b.close(); })();
