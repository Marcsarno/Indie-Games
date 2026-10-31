// Steering: hold left/right half of the screen, keyboard, or tilt (analog). dir in [-1, 1].
export function createInput() {
  const inp = { keys: 0, touch: 0, tilt: 0, tiltOn: false, zero: null, gamma: 0, get dir() {
    if (inp.tiltOn && inp.zero !== null) { const g = inp.gamma - inp.zero; const d = Math.abs(g) < 2.5 ? 0 : (g - Math.sign(g) * 2.5) / 20; return Math.max(-1, Math.min(1, d)); }
    return inp.keys || inp.touch;
  }, calibrate() { inp.zero = inp.gamma; } };
  const down = new Set();
  addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft' || e.key === 'a') down.add(-1); if (e.key === 'ArrowRight' || e.key === 'd') down.add(1); upd(); });
  addEventListener('keyup', (e) => { if (e.key === 'ArrowLeft' || e.key === 'a') down.delete(-1); if (e.key === 'ArrowRight' || e.key === 'd') down.delete(1); upd(); });
  function upd() { inp.keys = down.has(-1) && down.has(1) ? 0 : down.has(-1) ? -1 : down.has(1) ? 1 : 0; }
  const ptr = new Map();
  const setT = () => { let v = 0; for (const s of ptr.values()) v = s; inp.touch = v; };
  addEventListener('pointerdown', (e) => { if (e.target.closest('button, .ui')) return; ptr.set(e.pointerId, e.clientX < innerWidth / 2 ? -1 : 1); setT(); });
  addEventListener('pointermove', (e) => { if (ptr.has(e.pointerId)) { ptr.set(e.pointerId, e.clientX < innerWidth / 2 ? -1 : 1); setT(); } });
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
