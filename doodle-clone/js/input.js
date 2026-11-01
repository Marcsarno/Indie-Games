// Steering: hold left/right half of the screen, keyboard, or tilt (analog). dir in [-1, 1].
export function createInput() {
  const inp = { mode: 'aim', fingerX: null, fingerY: null, aim: null, drag: 0, keys: 0, touch: 0, tilt: 0, tiltOn: false, zero: null, gamma: 0,
  // 'drag' (default, round 10): touching does nothing; dragging left/right from where you touched steers like a joystick
  //   (proportional; full speed at DRAG_FULL of the screen width; the anchor slides along if you drag further, so reversing turns at once).
  // 'finger': she runs toward the x of your finger. 'sides': hold left/right half.
  // 'aim' (round 17 experiment, default): touch where you want her to go; she steers there so she arrives as she comes back down
  //   (needed speed = distance / time left in the air), so it is smooth, never a hard snap. A tap keeps aiming after you lift
  //   your finger until she gets there; holding and dragging moves the aim point.
  dirFor(px, sim) {
    if (inp.keys) { inp.aim = null; return inp.keys; }
    if (inp.mode === 'aim' && !inp.tiltOn) {
      if (inp.fingerX !== null) inp.aim = { x: inp.fingerX * 9, sy: inp.fingerY };
      if (!inp.aim) return 0;
      const dx = inp.aim.x - px; if (Math.abs(dx) < 0.15 && inp.fingerX === null) { inp.aim = null; return 0; }
      const pl = sim && sim.player, g = sim ? sim.cfg.g : 24, mx = sim ? sim.cfg.maxVx : 6;
      let tl = 0.6;                                                    // time until she is back down at the height she jumped from
      if (pl) { const apex = pl.vy > 0 ? pl.y + pl.vy * pl.vy / (2 * g) : pl.y, drop = Math.max(0, apex - Math.min(pl.y, sim.landY)); tl = (pl.vy > 0 ? pl.vy / g : 0) + Math.sqrt(2 * drop / g); }
      let v = dx / Math.max(0.3, tl); const floor = Math.min(2.5, Math.abs(dx) * 6);   // don't crawl the last bit: at least 2.5 u/s, easing off only in the final ~0.4 u
      if (Math.abs(v) < floor) v = Math.sign(dx) * floor;
      return Math.max(-1, Math.min(1, v / mx));
    }
    if (inp.mode === 'drag' && !inp.tiltOn) return inp.drag;
    if (inp.mode === 'finger' && inp.fingerX !== null && !inp.tiltOn) { const d = (inp.fingerX * 9 - px) / 0.45; return Math.max(-1, Math.min(1, d)); }
    return inp.dir;
  },
  get dir() {
    if (inp.tiltOn && inp.zero !== null) { const g = inp.gamma - inp.zero; const d = Math.abs(g) < 2.5 ? 0 : (g - Math.sign(g) * 2.5) / 20; return Math.max(-1, Math.min(1, d)); }
    return inp.keys || inp.touch;
  }, calibrate() { inp.zero = inp.gamma; } };
  const down = new Set();
  addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft' || e.key === 'a') down.add(-1); if (e.key === 'ArrowRight' || e.key === 'd') down.add(1); upd(); });
  addEventListener('keyup', (e) => { if (e.key === 'ArrowLeft' || e.key === 'a') down.delete(-1); if (e.key === 'ArrowRight' || e.key === 'd') down.delete(1); upd(); });
  function upd() { inp.keys = down.has(-1) && down.has(1) ? 0 : down.has(-1) ? -1 : down.has(1) ? 1 : 0; }
  const ptr = new Map();
  const DRAG_FULL = 0.11, DEAD = 0.012;      // fractions of screen width: drag ~45 px on a phone for full speed; tiny wiggles ignored
  const setT = () => { let v = 0, fx = null, dr = 0; for (const s of ptr.values()) { v = s.side; fx = s.fx; dr = s.d; } inp.touch = inp.mode === 'sides' ? v : 0; inp.fingerX = fx; inp.drag = dr; };
  const rec = (e, prev) => {
    const fx = e.clientX / innerWidth - 0.5; inp.fingerY = e.clientY / innerHeight; let ax = prev ? prev.ax : fx;
    if (fx - ax > DRAG_FULL) ax = fx - DRAG_FULL; else if (ax - fx > DRAG_FULL) ax = fx + DRAG_FULL;   // anchor slides along
    const off = fx - ax, d = Math.abs(off) < DEAD ? 0 : (off - Math.sign(off) * DEAD) / (DRAG_FULL - DEAD);
    return { side: e.clientX < innerWidth / 2 ? -1 : 1, fx, ax, d: Math.max(-1, Math.min(1, d)) };
  };
  addEventListener('pointerdown', (e) => { if (e.target.closest('button, .ui')) return; ptr.set(e.pointerId, rec(e)); setT(); });
  addEventListener('pointermove', (e) => { if (ptr.has(e.pointerId)) { ptr.set(e.pointerId, rec(e, ptr.get(e.pointerId))); setT(); } });
  const up = (e) => { ptr.delete(e.pointerId); setT(); };
  addEventListener('pointerup', up); addEventListener('pointercancel', up);
  addEventListener('deviceorientation', (e) => { if (e.gamma != null) inp.gamma = e.gamma; });
  inp.enableTilt = async () => {
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        const r = await DeviceOrientationEvent.requestPermission(); if (r !== 'granted') return false;
      }
      inp.tiltOn = true; return true;
    } catch (e) { return false; }
  };
  return inp;
}
