const tele = (p, o) => p.evaluate(o => { const m = window.__G().m; Object.assign(m, o); }, o);
module.exports = {
  async basic({ p, shot, st, step }) {
    await step(1, { start: true }); await step(160);
    await step(120, { right: true, b: true }); await shot('run'); console.log(await st());
  },
  async features({ p, shot, st, step }) {
    await step(1, { start: true }); await step(160);
    // 1. mushroom block at (21,9): stand under it and jump
    await tele(p, { x: 21 * 16 + 2, y: 192 });
    await step(14, { a: true }); await step(1, {});
    await step(20); await shot('f1-mushroom-emerging');
    await step(60); await shot('f2-mushroom-out'); console.log('after bump', await st());
    // walk onto mushroom
    await tele(p, { x: 20 * 16 + 4, y: 192 });
    await step(40, { right: true }); await step(10); await shot('f3-grow'); console.log('grow', await st());
    await step(60); await shot('f4-big'); console.log('big', await st());
    // 2. stomp goomba at x=22*16: drop on it
    const gx = await p.evaluate(() => window.__G().L.enemies[0].x);
    await tele(p, { x: gx - 2, y: 150, vy: 1 });
    await p.evaluate(() => { window.__G().m.big = false; window.__G().m.h = 16; });
    await step(14); await shot('f5-stomp'); console.log('stomp', await st());
    // 3. pipe warp
    await p.evaluate(() => { const m = window.__G().m; m.x = 57 * 16 + 10; m.y = 9 * 16 - m.h; m.vy = 0; m.onGround = true; window.__G().cam = 57 * 16 - 100; });
    await step(2, { down: true }); await step(20, { down: true }); await shot('f6-pipe-down');
    await step(60); await shot('f7-bonus'); console.log('bonus', await st());
    await step(150, { right: true, b: true }); await shot('f8-bonus-run'); console.log('bonus run', await st());
    await step(80, { right: true }); await shot('f9-exit'); console.log('exit', await st());
    await step(100); await shot('f10-back'); console.log('back', await st());
  },
  async flag({ p, shot, st, step }) {
    await step(1, { start: true }); await step(160);
    await p.evaluate(() => { const G = window.__G(); G.cam = 3136; Object.assign(G.m, { x: 3158, y: 80, vy: 0, big: true, h: 32 }); });
    await step(5, { right: true }); await shot('g1-grab'); console.log(await st());
    await step(40); await shot('g2-slide');
    await step(80); await shot('g3-bottom');
    await step(90); await shot('g4-walk'); console.log(await st());
    await step(120); await shot('g5-count'); console.log(await st());
    await step(500); await shot('g6-end'); console.log(await st());
  }
};
