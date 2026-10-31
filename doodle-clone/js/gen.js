// Procedural platform generator. Reachability by construction: every gap is a fraction of the jump height and
// every dx is within the horizontal reach; at least one FLAT platform in every 0.8 H band.
import { C } from './config.js';
import { mulberry32 } from './rng.js';

const lerp = (a, b, t) => a + (b - a) * t;
export function paramsAt(h) {
  const Z = C.zones; let i = 0;
  while (i + 1 < Z.length && h >= Z[i + 1].h) i++;
  const cur = Z[i], prev = Z[Math.max(0, i - 1)], t = i === 0 ? 1 : Math.min(1, (h - cur.h) / 30);
  const m = (k) => lerp(prev[k], cur[k], t), m2 = (k) => [lerp(prev[k][0], cur[k][0], t), lerp(prev[k][1], cur[k][1], t)];
  return { slider: m('slider'), crumbly: m('crumbly'), sspeed: m('sspeed'), gap: m2('gap'), w: m2('w'), zone: i };
}

export function makeGen(seed) {
  const rnd = mulberry32(seed);
  const hw = C.viewW / 2;
  const gen = { platforms: [], candies: [], items: [], rnd };
  const st = { y: 0, x: 0, lastFlatY: 0, lastType: 'flat', nextTramp: 26, nextRocket: 120 + rnd() * 40, id: 0, cid: 0 };
  function add(p) { p.id = st.id++; p.alive = true; p.hit = false; gen.platforms.push(p); return p; }
  gen.addFlat = (x, y, w = 3) => { const p = add({ type: 'flat', x, x0: x, y, w, amp: 0, ang: 0, phase: 0, tramp: false }); st.lastFlatY = Math.max(st.lastFlatY, y); return p; };
  gen.addFlat(0, 0, 3.4);                    // starter platform
  function candy(x, y) { gen.candies.push({ id: st.cid++, x, y, taken: false }); }
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
    let x = Math.max(-lim, Math.min(lim, prevX + (rnd() * 2 - 1) * 4.2));
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
