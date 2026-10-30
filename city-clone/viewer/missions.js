// Missions: glowing start beacons at real places; drive into one (slowly) to start; reach the target before the timer runs out.
// Each mission: { id, title, brief, from [px], to [px] | 'summit' | 'lose', time s, reward $ }. Pixel coords are reference-map pixels (plan/map_px.py).
const PX = p => [(p[0] - 690) * .43, -(p[1] - 545) * .43];   // -> Blender metres
export const MISSIONS = [
  { id: 'publix', title: 'Publix Run', brief: 'Groceries for a customer in Lakeview Estates.', from: [868, 446], to: [560, 205], time: 75, reward: 200 },
  { id: 'casino', title: 'Casino Shuttle', brief: 'A high roller wants the Promenade cinema. Now.', from: [1094, 500], to: [1170, 958], time: 60, reward: 250 },
  { id: 'summit', title: 'Trash Mountain Summit', brief: 'Drive to the top of Trash Mountain.', from: [900, 180], to: 'summit', time: 70, reward: 300 },
  { id: 'heat', title: 'Heat Check', brief: 'Get two stars, then shake the police.', from: [1062, 640], to: 'lose', time: 120, reward: 400 },
];

export function createMissions(G, deps) {
  const { THREE, scene, groundH, banner, addMoney, cops, heights } = deps;
  const snap = (x, y) => {                          // nearest point on a road centre-line (Blender metres)
    let best = 1e18, bx = x, by = y;
    for (const e of G.edges) for (const p of e.pts) { const d = (p[0] - x) ** 2 + (p[1] - y) ** 2; if (d < best) { best = d; bx = p[0]; by = p[1]; } }
    return [bx, by];
  };
  let summit = [0, 0];
  if (heights && heights[0]) { const f = heights[0]; let bh = -1; for (let j = 0; j < f.ny; j++) for (let i = 0; i < f.nx; i++) { const h = f.h[j * f.nx + i]; if (h > bh) { bh = h; summit = [f.x0 + i * f.dx, f.y0 + j * f.dx]; } } }
  const list = MISSIONS.map(m => { const a = snap(...PX(m.from)); const b = m.to === 'summit' ? summit : m.to === 'lose' ? null : snap(...PX(m.to)); return { ...m, a, b, done: false }; });
  // beacons: tall soft cylinders, one material per state
  const geo = new THREE.CylinderGeometry(2.6, 2.6, 7, 24, 1, true).translate(0, 3.5, 0);
  const matStart = new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: .32, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const matGoal = new THREE.MeshBasicMaterial({ color: 0x3fe07b, transparent: true, opacity: .38, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const beacons = list.map(m => { const b = new THREE.Mesh(geo, matStart); b.position.set(m.a[0], groundH(m.a[0], -m.a[1]), -m.a[1]); b.renderOrder = 5; scene.add(b); return b; });
  const goal = new THREE.Mesh(geo, matGoal); goal.visible = false; goal.renderOrder = 5; scene.add(goal);
  const chip = document.getElementById('mission');
  let cur = null, t = 0, phase = 0, cool = 0;
  function start(m) { cur = m; t = m.time; phase = 0; banner(m.title.toUpperCase()); for (const b of beacons) b.visible = false; if (m.b) { goal.position.set(m.b[0], groundH(m.b[0], -m.b[1]), -m.b[1]); goal.visible = true; } chip.hidden = false; }
  function end(ok) {
    if (ok) { addMoney(cur.reward); cur.done = true; banner(`PASSED  +$${cur.reward}`); } else banner('MISSION FAILED');
    cur = null; goal.visible = false; chip.hidden = true; cool = 4; list.forEach((m, i) => { beacons[i].visible = !m.done; });
  }
  function step(dt, P) {                            // P: { x, z (three), speed, driving }
    const k = 1 + Math.sin(performance.now() / 300) * .06; for (const b of beacons) b.scale.set(k, 1, k); goal.scale.set(k, 1, k);
    if (cool > 0) cool -= dt;
    if (!cur) {
      if (cool > 0) return;
      for (const m of list) if (!m.done && Math.hypot(P.x - m.a[0], P.z + m.a[1]) < 4 && P.speed < 9 && P.driving) { start(m); break; }
      return;
    }
    t -= dt; let dist = 0, txt = '';
    if (cur.to === 'lose') {
      const s = cops ? cops.W.stars : 0;
      if (phase === 0) { txt = `Get 2 stars (${s}/2)`; if (s >= 2) phase = 1; }
      else { txt = 'Lose the police'; if (s === 0) return end(true), void 0; }
    } else { dist = Math.hypot(P.x - cur.b[0], P.z + cur.b[1]); txt = `${Math.round(dist)} m to go`; if (dist < 4.5 && (cur.to !== 'summit' || P.speed < 12)) return end(true), void 0; }
    chip.innerHTML = `<b>${cur.title}</b><span>${txt}</span><em class="${t < 10 ? 'hot' : ''}">${Math.max(0, Math.ceil(t))}s</em>`;
    if (t <= 0) end(false);
  }
  const target = () => cur ? (cur.b ? cur.b : null) : null;
  const refresh = () => list.forEach((m, i) => { beacons[i].visible = !m.done && !cur; });
  return { list, step, target, refresh, get active() { return cur; } };
}
