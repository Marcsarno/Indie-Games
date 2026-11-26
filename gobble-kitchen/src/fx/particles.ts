// Small pooled particle system: one InstancedMesh (one draw call) per particle type, unlit.
// Particles run on real time so they keep moving during a freeze-frame.
import * as THREE from 'three';

export type PType = 'puff' | 'spark' | 'confetti' | 'heart' | 'blob' | 'leaf' | 'bubble' | 'crumb';

interface P {
  alive: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  rot: THREE.Euler;
  spin: THREE.Vector3;
  life: number;
  max: number;
  size: number;
  gravity: number;
  drag: number;
  floor: number;       // bounce height (or -Infinity)
  bounce: number;
  grow: number;        // size multiplier gained over life (puffs swell)
  color: THREE.Color;
}

export interface Burst {
  count?: number;
  color?: THREE.ColorRepresentation | THREE.ColorRepresentation[];
  speed?: number;
  up?: number;         // extra upward speed
  spread?: number;     // start position jitter
  size?: number;
  life?: number;
  gravity?: number;
  drag?: number;
  floor?: number;
  bounce?: number;
  grow?: number;
  dir?: THREE.Vector3; // bias direction
}

const CAP = 56;

function heartShape() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.5);
  s.bezierCurveTo(-0.9, 0.1, -0.5, 0.75, 0, 0.3);
  s.bezierCurveTo(0.5, 0.75, 0.9, 0.1, 0, -0.5);
  return new THREE.ExtrudeGeometry(s, { depth: 0.22, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 2 }).center();
}
function starShape() {
  const s = new THREE.Shape();
  for (let k = 0; k < 8; k++) {
    const a = (Math.PI * k) / 4, r = k % 2 === 0 ? 0.5 : 0.16;
    if (k === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: false }).center();
}
function leafShape() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.5);
  s.quadraticCurveTo(0.45, -0.1, 0, 0.5);
  s.quadraticCurveTo(-0.45, -0.1, 0, -0.5);
  return new THREE.ShapeGeometry(s, 6);
}

const DEFAULTS: Record<PType, Required<Omit<Burst, 'color' | 'dir' | 'count'>>> = {
  puff: { speed: 0.35, up: 0.35, spread: 0.05, size: 0.09, life: 0.7, gravity: -0.2, drag: 2.5, floor: -1e9, bounce: 0, grow: 1.6 },
  spark: { speed: 1.3, up: 0.6, spread: 0.03, size: 0.07, life: 0.6, gravity: 1.5, drag: 1.5, floor: -1e9, bounce: 0, grow: 0 },
  confetti: { speed: 2.6, up: 2.8, spread: 0.2, size: 0.07, life: 2.4, gravity: 4.5, drag: 1.2, floor: -1e9, bounce: 0, grow: 0 },
  heart: { speed: 0.25, up: 0.7, spread: 0.08, size: 0.1, life: 1.2, gravity: -0.3, drag: 1.0, floor: -1e9, bounce: 0, grow: 0.3 },
  blob: { speed: 1.6, up: 3.0, spread: 0.05, size: 0.05, life: 2.2, gravity: 9, drag: 0.2, floor: 0, bounce: 0.45, grow: 0 },
  leaf: { speed: 0.6, up: 0.2, spread: 0.4, size: 0.1, life: 3.0, gravity: 0.5, drag: 1.2, floor: -1e9, bounce: 0, grow: 0 },
  bubble: { speed: 0.2, up: 0.5, spread: 0.04, size: 0.05, life: 1.8, gravity: -0.35, drag: 1.2, floor: -1e9, bounce: 0, grow: 0.5 },
  crumb: { speed: 0.9, up: 1.2, spread: 0.03, size: 0.022, life: 1.0, gravity: 7, drag: 0.5, floor: 0, bounce: 0.3, grow: 0 },
};

export class Particles {
  private pools = new Map<PType, { mesh: THREE.InstancedMesh; ps: P[] }>();
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private s = new THREE.Vector3();

  constructor(scene: THREE.Scene) {
    const geos: Record<PType, THREE.BufferGeometry> = {
      puff: new THREE.IcosahedronGeometry(0.5, 2),
      spark: starShape(),
      confetti: new THREE.PlaneGeometry(1, 0.6),
      heart: heartShape(),
      blob: new THREE.IcosahedronGeometry(0.5, 2),
      leaf: leafShape(),
      bubble: new THREE.IcosahedronGeometry(0.5, 2),
      crumb: new THREE.IcosahedronGeometry(0.5, 0),
    };
    (Object.keys(geos) as PType[]).forEach((type) => {
      const mat = new THREE.MeshBasicMaterial({ side: type === 'confetti' || type === 'leaf' ? THREE.DoubleSide : THREE.FrontSide, toneMapped: false, transparent: type === 'bubble', opacity: type === 'bubble' ? 0.55 : 1 });
      const mesh = new THREE.InstancedMesh(geos[type], mat, CAP);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.count = 0;
      mesh.frustumCulled = false;
      mesh.raycast = () => {};
      mesh.setColorAt(0, new THREE.Color(1, 1, 1));
      scene.add(mesh);
      const ps: P[] = [];
      for (let i = 0; i < CAP; i++) ps.push({ alive: false, pos: new THREE.Vector3(), vel: new THREE.Vector3(), rot: new THREE.Euler(), spin: new THREE.Vector3(), life: 0, max: 1, size: 0.1, gravity: 0, drag: 0, floor: -1e9, bounce: 0, grow: 0, color: new THREE.Color() });
      this.pools.set(type, { mesh, ps });
    });
  }

  burst(type: PType, at: THREE.Vector3, o: Burst = {}) {
    const pool = this.pools.get(type)!;
    const d = DEFAULTS[type];
    const count = o.count ?? 8;
    const colors = Array.isArray(o.color) ? o.color : [o.color ?? 0xffffff];
    for (let n = 0; n < count; n++) {
      const p = pool.ps.find((p) => !p.alive) ?? pool.ps.reduce((a, b) => (a.life / a.max > b.life / b.max ? a : b));
      p.alive = true;
      const spread = o.spread ?? d.spread;
      p.pos.set(at.x + (Math.random() - 0.5) * 2 * spread, at.y + (Math.random() - 0.5) * spread, at.z + (Math.random() - 0.5) * 2 * spread);
      const a = Math.random() * Math.PI * 2, sp = (o.speed ?? d.speed) * (0.4 + Math.random() * 0.6);
      p.vel.set(Math.cos(a) * sp, (o.up ?? d.up) * (0.6 + Math.random() * 0.6), Math.sin(a) * sp);
      if (o.dir) p.vel.addScaledVector(o.dir, 1);
      p.rot.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      const spin = type === 'puff' || type === 'bubble' || type === 'blob' ? 0 : type === 'heart' ? 1.2 : 7;
      p.spin.set((Math.random() - 0.5) * spin, (Math.random() - 0.5) * spin, (Math.random() - 0.5) * spin);
      if (type === 'heart') p.rot.set(0, 0, (Math.random() - 0.5) * 0.5);
      p.life = 0;
      p.max = (o.life ?? d.life) * (0.75 + Math.random() * 0.5);
      p.size = (o.size ?? d.size) * (0.7 + Math.random() * 0.6);
      p.gravity = o.gravity ?? d.gravity;
      p.drag = o.drag ?? d.drag;
      p.floor = o.floor ?? d.floor;
      p.bounce = o.bounce ?? d.bounce;
      p.grow = o.grow ?? d.grow;
      p.color.set(colors[Math.floor(Math.random() * colors.length)]);
    }
  }

  update(dt: number, camera: THREE.Camera) {
    for (const [type, pool] of this.pools) {
      let n = 0;
      for (const p of pool.ps) {
        if (!p.alive) continue;
        p.life += dt;
        if (p.life >= p.max) {
          p.alive = false;
          continue;
        }
        p.vel.y -= p.gravity * dt;
        p.vel.multiplyScalar(Math.max(0, 1 - p.drag * dt));
        p.pos.addScaledVector(p.vel, dt);
        if (p.pos.y < p.floor + p.size / 2 && p.vel.y < 0) {
          p.pos.y = p.floor + p.size / 2;
          p.vel.y *= -p.bounce;
          p.vel.x *= 0.6;
          p.vel.z *= 0.6;
          p.spin.multiplyScalar(0.5);
        }
        p.rot.x += p.spin.x * dt;
        p.rot.y += p.spin.y * dt;
        p.rot.z += p.spin.z * dt;
        const k = p.life / p.max;
        // pop in fast, shrink out at the end
        const env = Math.min(1, k * 8) * (k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1);
        const size = p.size * env * (1 + p.grow * k);
        if (type === 'heart' || type === 'spark') this.q.copy(camera.quaternion).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, p.rot.z)));
        else this.q.setFromEuler(p.rot);
        this.s.setScalar(Math.max(0.0001, size));
        if (type === 'blob') this.s.y *= 1 + Math.min(0.5, Math.abs(p.vel.y) * 0.06);
        this.m.compose(p.pos, this.q, this.s);
        pool.mesh.setMatrixAt(n, this.m);
        pool.mesh.setColorAt(n, p.color);
        n++;
      }
      pool.mesh.count = n;
      pool.mesh.instanceMatrix.needsUpdate = true;
      if (pool.mesh.instanceColor) pool.mesh.instanceColor.needsUpdate = true;
    }
  }

  clear() {
    for (const pool of this.pools.values()) pool.ps.forEach((p) => (p.alive = false));
  }
}
