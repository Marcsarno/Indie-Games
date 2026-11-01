// Police light bars (round 36): a dark bar with red and blue lenses on the roof, a strobe pattern (red double-flash, then blue), a soft glow halo over the lit lens
// and a coloured pool of light on the road around the car. All cheap: basic materials, two sprites and one additive ground plane per car, no real lights.
// Every bar registers itself; stepLightbars(t) (once a frame, from the page) runs the pattern on the visible ones.
export const BARS = [];
let glowTex = null, poolTex = null;
function radial(THREE, size, stops) {
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'), gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [k, a] of stops) gr.addColorStop(k, `rgba(255,255,255,${a})`); g.fillStyle = gr; g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// car: a makeCar() result. o: { y (roof height), z (along the car, + = back), w (bar width), pool (ground glow radius m) }
export function makeLightbar(THREE, car, o = {}) {
  if (!glowTex) { glowTex = radial(THREE, 64, [[0, 1], [.25, .55], [1, 0]]); poolTex = radial(THREE, 64, [[0, 1], [.45, .6], [1, 0]]); }
  const pol = car.kind === 'police';                    // the police model has a small bar baked into its roof (vehicles.py: 1.24 m wide, .2 m behind centre, roof 1.42): cover it exactly
  const y = o.y ?? (pol ? 1.40 : (car.dims[3] || 1.75)), z = o.z ?? (pol ? .22 : 0), w = o.w ?? (pol ? 1.34 : 1.2), g = new THREE.Group(); g.position.set(0, y, z); car.group.add(g);
  const base = new THREE.Mesh(new THREE.BoxGeometry(w, .1, .32), new THREE.MeshLambertMaterial({ color: 0x1a1c20 })); base.position.y = .05; g.add(base);
  const lens = [-1, 1].map(s => { const m = new THREE.Mesh(new THREE.BoxGeometry(w / 2 - .06, .14, .28), new THREE.MeshBasicMaterial({ color: 0x222222, toneMapped: false })); m.position.set(s * w / 4, .16, 0); g.add(m); return m; });
  const halo = [-1, 1].map(s => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: s < 0 ? 0xff2a2a : 0x2a6bff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false })); sp.position.set(s * w / 4, .2, 0); sp.scale.setScalar(3.2); g.add(sp); return sp; });
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: poolTex, color: 0xff2a2a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false, opacity: .9 }));
  const R = o.pool ?? 6; pool.scale.set(R * 2, 1, R * 2); pool.position.set(0, -y + .06, -z); pool.renderOrder = 3; g.add(pool);
  const L = { g, car, lens, halo, pool, off: Math.random(), on: true, show(v) { L.on = v; g.visible = v; } };
  BARS.push(L); return L;
}
// the pattern, 0.9 s a cycle: red flash-flash, a beat, blue flash-flash, a beat (each car on its own offset so a pack never blinks in step)
const RED = 0xff2a2a, BLUE = 0x2a6bff, RED_D = 0x4a0d0d, BLUE_D = 0x0d1a4a;
export function stepLightbars(t) {
  for (const L of BARS) {
    if (!L.on || !L.car.group.visible) continue;
    const p = ((t / .9 + L.off) % 1), fl = q => (q > 0 && q < .09) || (q > .14 && q < .23), r = fl(p), b = fl(p - .5);
    L.lens[0].material.color.setHex(r ? RED : RED_D); L.lens[1].material.color.setHex(b ? BLUE : BLUE_D);
    L.halo[0].visible = r; L.halo[1].visible = b;
    L.pool.visible = r || b; if (r || b) L.pool.material.color.setHex(r ? RED : BLUE);
  }
}
