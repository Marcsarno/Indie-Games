// Procedural platform generator. Reachability by construction: every gap is a fraction of the jump height and
// every dx is within the horizontal reach; at least one FLAT platform in every 0.8 H band.
import { C } from './config.js';
import { mulberry32 } from './rng.js';

const lerp = (a, b, t) => a + (b - a) * t;
// Round 18: ONE smooth difficulty curve instead of zone steps (user: aim control made it too easy; wants a smooth ramp
// that stays fun for a 7-year-old). d(h) = 1 - exp(-h / C.ramp.scale): 0 at the start, ~0.5 at 400 m, ~0.8 at 1,000 m.
// Each parameter lerps from its 'easy' to its 'hard' value along d; sliders and crumblies fade in after their start heights.
export function difficulty(h) { return 1 - Math.exp(-Math.max(0, h) / C.ramp.scale); }
export function paramsAt(h) {
  const R = C.ramp, d = difficulty(h), L = (k) => lerp(R.easy[k], R.hard[k], d);
  const on = (h0) => Math.min(1, Math.max(0, (h - h0) / 60));          // 60 m fade-in after a type's start height
  return { d, slider: R.hard.slider * on(R.sliderFrom) * Math.min(1, d * 2.2), crumbly: R.hard.crumbly * on(R.crumblyFrom) * Math.min(1, d * 1.8),
           sspeed: L('sspeed'), gap: [L('gapMin'), L('gapMax')], w: [L('wMin'), L('wMax')], dx: [L('dxMin'), L('dxMax')],
           zone: h < 100 ? 0 : h < 250 ? 1 : h < 500 ? 2 : h < 900 ? 3 : 4 };
}

export function makeGen(seed) {
  const rnd = mulberry32(seed);
  const hw = C.viewW / 2;
  const gen = { platforms: [], candies: [], items: [], rnd };
  const st = { y: 0, x: 0, lastFlatY: 0, lastType: 'flat', nextTramp: 26, nextRocket: 120 + rnd() * 40, id: 0, cid: 0 };
  function add(p) { p.id = st.id++; p.alive = true; p.hit = false; gen.platforms.push(p); return p; }
  gen.addFlat = (x, y, w = 3) => { const p = add({ type: 'flat', x, x0: x, y, w, amp: 0, ang: 0, phase: 0, tramp: false }); st.lastFlatY = Math.max(st.lastFlatY, y); return p; };
  gen.addFlat(0, 0, 3.4);                    // starter platform
  function candy(x, y) { gen.candies.push({ id: st.cid++, x, y, taken: false, gold: st.y > 40 && rnd() < 0.03 }); }   // rare golden candy = 5
  function next() {
    const p = paramsAt(st.y), prevX = st.x, prevY = st.y;
    const y = st.y + (p.gap[0] + rnd() * (p.gap[1] - p.gap[0])) * C.H;
    const w = p.w[0] + rnd() * (p.w[1] - p.w[0]);
    let type = 'flat'; const r = rnd();
    if (y - st.lastFlatY <= 0.8 * C.H) {
      if (r < p.slider) type = 'slider';
      else if (r < p.slider + p.crumbly && st.lastType !== 'crumbly') type = 'crumbly';
    }
    const lim = hw - w / 2;
    // sideways step grows with difficulty (later the next platform is often across the screen, so you have to plan the aim)
    const mag = p.dx[0] + rnd() * (p.dx[1] - p.dx[0]); let sgn = rnd() < 0.5 ? -1 : 1;
    if (Math.abs(prevX + sgn * mag) > lim) sgn = -sgn;
    let x = Math.max(-lim, Math.min(lim, prevX + sgn * mag));
    const pl = { type, x, x0: x, y, w, amp: 0, ang: 0, phase: 0, tramp: false };
    if (type === 'slider') {
      const amp = Math.min(1.5, 0.6 + rnd() * 0.9), room = lim - amp;
      pl.amp = amp; pl.x0 = Math.max(-room, Math.min(room, x)); pl.x = pl.x0;
      pl.ang = (p.sspeed * (0.8 + rnd() * 0.4)) / amp; pl.phase = rnd() * 6.28;
    }
    if (type === 'flat' && y >= st.nextTramp) { pl.tramp = true; st.nextTramp = y + (p.zone < 3 ? 25 + rnd() * 15 : 40 + rnd() * 20); }
    add(pl);
    if (type === 'flat') st.lastFlatY = y;
    if (type === 'flat' && !pl.tramp && p.zone >= 1 && y >= st.nextRocket) { gen.items.push({ id: st.cid++, type: 'rocket', x: pl.x, y: y + 1.3, taken: false }); st.nextRocket = y + 110 + rnd() * 60; }
    if (rnd() < 0.5 && !pl.tramp) candy(pl.x, y + 1.0);
    if (rnd() < 0.4) for (let k = 1; k <= 3; k++) { const f = k / 4; candy(lerp(prevX, pl.x0, f), lerp(prevY, y, f) + 1.2 + Math.sin(f * Math.PI) * 1.1); }
    st.y = y; st.x = pl.x0; st.lastType = type;
  }
  gen.ensure = (topY) => { while (st.y < topY) next(); };
  gen.prune = (bottomY) => {
    gen.platforms = gen.platforms.filter((p) => p.y > bottomY && p.alive);
    gen.candies = gen.candies.filter((c) => c.y > bottomY && !c.taken);
    gen.items = gen.items.filter((c) => c.y > bottomY && !c.taken);
  };
  gen.state = st;
  return gen;
}
