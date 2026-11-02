const { chromium, devices } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['Pixel 7'] });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e)));
  await p.goto('file:///home/user/indie-games/diablo-clone/game/index.html');
  await p.waitForTimeout(1500);
  // native -> css coordinates
  const toCss = async (x, y) => p.evaluate(([x, y]) => { const r = cvs.getBoundingClientRect(); return [r.left + x / W * r.width, r.top + y / H * r.height]; }, [x, y]);
  const ptr = async (type, id, x, y) => { const [cx, cy] = await toCss(x, y); await p.evaluate(([type, id, cx, cy]) => cvs.dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: cx, clientY: cy, bubbles: true, isPrimary: id === 1, pointerType: 'touch' })), [type, id, cx, cy]); };
  const tap = async (x, y, id = 1) => { await ptr('pointerdown', id, x, y); await p.waitForTimeout(60); await ptr('pointerup', id, x, y); };
  const shot = async n => fs.writeFileSync(__dirname + '/' + n, await p.screenshot());
  const info = () => p.evaluate(() => ({ mode: G.mode, W, H, hero: [+hero.fi.toFixed(2), +hero.fj.toFixed(2)], hp: Math.round(hero.hp), mana: Math.round(hero.mana), pot: hero.potions, lvl: LV.level, inv: hero.bag.length, eq: hero.look }));
  await shot('t0-title.png');
  const btn = await p.evaluate(() => UI.titleBtns.map(b => [b.x + b.w / 2, b.y + b.h / 2]));
  await tap(...btn[btn.length - 1]);   // NEW GAME
  await p.waitForTimeout(1200);
  console.log('after new game', JSON.stringify(await info()));
  // move: hold the left side, drag right-down, while attacking with a second finger
  const H = (await info()).H;
  await ptr('pointerdown', 1, 50, H - 110); await ptr('pointermove', 1, 70, H - 100);
  await p.waitForTimeout(700);
  await ptr('pointerdown', 2, 222, H - 100); await p.waitForTimeout(300);
  console.log('moving + attack', JSON.stringify(await info()), await p.evaluate(() => [hero.clip, input.attack, input.mx.toFixed(2)]));
  await ptr('pointerup', 2, 222, H - 100); await ptr('pointerup', 1, 70, H - 100);
  await tap(...await p.evaluate(() => UI.skills[0].slice(0, 2)));
  await p.waitForTimeout(200);
  console.log('after skill', JSON.stringify(await info()), await p.evaluate(() => projectiles.length));
  await p.evaluate(() => { hero.hp = 5; });
  await tap(...await p.evaluate(() => UI.potion.slice(0, 2)));
  console.log('after potion', JSON.stringify(await info()));
  await shot('t1-play.png');
  await tap(...await p.evaluate(() => UI.bag.slice(0, 2)));
  await p.waitForTimeout(200);
  await p.evaluate(() => { const R = rng(1); hero.bag.push(rollItem(R, 2, 'great_helm'), rollItem(R, 2, 'kite_shield')); });
  await tap(15 + 17, 176 + 15); await p.waitForTimeout(100);   // first bag cell
  await shot('t2-inv-sel.png');
  const eb = await p.evaluate(() => UI.invBtns.map(b => [b.x + b.w / 2, b.y + b.h / 2]));
  await tap(...eb[0]); await p.waitForTimeout(150);
  console.log('after equip', JSON.stringify(await info()));
  await shot('t3-inv.png');
  await tap(W_close = 258, 13); await p.waitForTimeout(100);
  // save + reload -> continue
  await p.evaluate(() => saveGame());
  await p.reload(); await p.waitForTimeout(1500);
  const btn2 = await p.evaluate(() => UI.titleBtns.map(b => [b.x + b.w / 2, b.y + b.h / 2]));
  await tap(...btn2[0]); await p.waitForTimeout(1200);
  console.log('after continue', JSON.stringify(await info()));
  // die and rise
  await p.evaluate(() => hurtHero(9999, null)); await p.waitForTimeout(2600);
  await shot('t4-dead.png');
  await tap(135, 200); await p.waitForTimeout(600);
  console.log('after respawn', JSON.stringify(await info()), await p.evaluate(() => hero.dead));
  // background -> pause
  await p.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  console.log('paused', await p.evaluate(() => G.paused));
  const fps = await p.evaluate(() => new Promise(r => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); G.paused = false; let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(n / 2); }; requestAnimationFrame(f); }));
  console.log('fps (headless, unthrottled)', fps);
  if (errs.length) console.log('ERR', errs.join('\n'));
  await b.close();
})();
