// Renderer, scene, lights, camera rig (poses from Blender empties, fitted to the screen), blob shadows,
// the squash/pop spring manager and the time-of-day lighting.
import * as THREE from 'three';
import { clock, tween, ease, Spring, lerp, clamp, type Ease } from './tween';
import { Particles } from '../fx/particles';
import { Input } from './input';
import { rimUniform, outlineUniform } from '../fx/toon';

export interface Pose {
  target: THREE.Vector3;
  dir: THREE.Vector3;   // unit vector from the target to the camera
  fitW: number;         // metres of scene to keep in view around the target
  fitH: number;
}

interface DayPhase {
  sky: number; ground: number; hemi: number;
  key: number; keyI: number; keyDir: [number, number, number];
  window: number; bg: number; rim: number; candle: number;
}
// morning blue-gold -> warm afternoon -> golden hour -> candlelight
const DAY: DayPhase[] = [
  { sky: 0xe6f0ff, ground: 0x8a6a86, hemi: 2.25, key: 0xffe9c4, keyI: 1.55, keyDir: [-0.5, 1.0, 0.75], window: 0x9fd4cb, bg: 0xbcdcd5, rim: 0.22, candle: 0 },
  { sky: 0xfff2dc, ground: 0x8e6a80, hemi: 2.2, key: 0xffe0b0, keyI: 1.7, keyDir: [0.1, 1.0, 0.8], window: 0x8cc6c9, bg: 0xf1dcb8, rim: 0.28, candle: 0 },
  { sky: 0xffdcb4, ground: 0x7f5674, hemi: 1.95, key: 0xffb05c, keyI: 1.95, keyDir: [0.75, 0.7, 0.7], window: 0xf4a45c, bg: 0xeeb588, rim: 0.42, candle: 0 },
  { sky: 0xa894c4, ground: 0x54405f, hemi: 1.75, key: 0xffa866, keyI: 0.6, keyDir: [0.3, 1.0, 0.6], window: 0x3b3a6e, bg: 0x3d2c4c, rim: 0.5, candle: 1 },
];

interface Sq { o: THREE.Object3D; sq: Spring; uni: Spring; base: THREE.Vector3; keep: boolean }

export class Stage {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(22, 2, 0.3, 120);
  particles: Particles;
  input: Input;
  hemi = new THREE.HemisphereLight(0xffffff, 0x8a6a86, 2.2);
  key = new THREE.DirectionalLight(0xffe9c4, 1.6);
  candleLight = new THREE.PointLight(0xffa24a, 0, 8, 1.4);
  poses = new Map<string, Pose>();
  pose: Pose = { target: new THREE.Vector3(), dir: new THREE.Vector3(0, 0.7, 0.7).normalize(), fitW: 12, fitH: 6.5 };
  windowColor = new THREE.Color(0x9fd4cb);
  private dayK = 0;
  private shake = 0;
  private sqs = new Map<THREE.Object3D, Sq>();
  private shadows: { o: THREE.Object3D; mesh: THREE.Mesh; r: number; ground: number }[] = [];
  private shadowTex: THREE.Texture;
  private shadowGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  width = 1;
  height = 1;
  rotated = false;  // portrait phones: the whole game is turned 90 degrees so it is always landscape
  private wantShot: ((url: string) => void) | null = null;
  private fps = { t: 0, n: 0, low: 0 };
  private maxRatio = 1.5;

  constructor(public container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping; // ACES washes out the pastels
    container.appendChild(this.renderer.domElement);
    this.scene.background = new THREE.Color(DAY[0].bg);
    this.scene.add(this.hemi, this.key, this.candleLight);
    this.particles = new Particles(this.scene);
    this.input = new Input(this.renderer.domElement, this.camera, this);
    this.shadowTex = this.makeShadowTex();
    this.applyDay(0);
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  private makeShadowTex() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d')!;
    const grd = g.createRadialGradient(32, 32, 2, 32, 32, 31);
    grd.addColorStop(0, 'rgba(255,255,255,0.9)');
    grd.addColorStop(0.55, 'rgba(255,255,255,0.45)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.rotated = h > w * 1.05;
    this.width = this.rotated ? h : w;
    this.height = this.rotated ? w : h;
    const st = this.container.style;
    st.width = this.width + 'px';
    st.height = this.height + 'px';
    st.transform = this.rotated ? `translate(${w}px, 0) rotate(90deg)` : '';
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.maxRatio));
    this.renderer.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    document.documentElement.style.setProperty('--u', Math.min(this.width / 100, this.height / 56) + 'px');
  }

  /** Screen (client) coordinates -> game coordinates in px (handles the rotated portrait layout). */
  toGame(x: number, y: number) {
    return this.rotated ? { x: y, y: window.innerWidth - x } : { x, y };
  }

  // ---------------------------------------------------------------- camera
  addPose(name: string, cam: THREE.Vector3, target: THREE.Vector3, fitW: number, fitH: number) {
    this.poses.set(name, { target: target.clone(), dir: cam.clone().sub(target).normalize(), fitW, fitH });
  }

  /** Read cam_<name> / cam_<name>_target empties under a root (world space). */
  readPoses(root: THREE.Object3D) {
    root.updateWorldMatrix(true, true);
    root.traverse((o) => {
      if (!o.name.startsWith('cam_') || o.name.endsWith('_target')) return;
      const t = root.getObjectByName(o.name + '_target');
      if (!t) return;
      this.addPose(o.name.slice(4), o.getWorldPosition(new THREE.Vector3()), t.getWorldPosition(new THREE.Vector3()), o.userData.fit_w ?? 2, o.userData.fit_h ?? 1.2);
    });
  }

  setPose(name: string) {
    const p = this.poses.get(name)!;
    this.pose = { target: p.target.clone(), dir: p.dir.clone(), fitW: p.fitW, fitH: p.fitH };
  }

  fly(name: string, dur = 0.6, e: Ease = ease.inOut) {
    const to = this.poses.get(name)!;
    const from = { target: this.pose.target.clone(), dir: this.pose.dir.clone(), fitW: this.pose.fitW, fitH: this.pose.fitH };
    return tween(dur, (k) => {
      this.pose.target.lerpVectors(from.target, to.target, k);
      this.pose.dir.lerpVectors(from.dir, to.dir, k).normalize();
      this.pose.fitW = lerp(from.fitW, to.fitW, k);
      this.pose.fitH = lerp(from.fitH, to.fitH, k);
    }, e);
  }

  addShake(amount = 0.04) {
    this.shake = Math.max(this.shake, amount);
  }

  private placeCamera(dt: number) {
    const p = this.pose;
    const half = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const dist = Math.max(p.fitH / 2 / half, p.fitW / 2 / (half * this.camera.aspect));
    this.camera.position.copy(p.target).addScaledVector(p.dir, dist);
    this.camera.near = Math.max(0.2, dist * 0.2);
    this.camera.far = dist + 60;
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(p.target);
    if (this.shake > 0.0005) {
      const t = clock.real * 60;
      this.camera.position.x += Math.sin(t * 1.3) * this.shake;
      this.camera.position.y += Math.cos(t * 1.7) * this.shake;
      this.shake *= Math.pow(0.002, dt); // quick decay
    }
    this.camera.updateMatrixWorld();
  }

  // ---------------------------------------------------------------- squash and pop springs
  private sq(o: THREE.Object3D): Sq {
    let s = this.sqs.get(o);
    if (!s) {
      s = { o, sq: new Spring(1, 4, 0.35), uni: new Spring(1, 4.5, 0.45), base: o.scale.clone(), keep: false };
      this.sqs.set(o, s);
    }
    return s;
  }
  /** Squash-and-stretch kick on Y (volume kept: X and Z = 1/sqrt(Y)). Negative = squash first. */
  squash(o: THREE.Object3D, kick = -3.5, freq = 4, damping = 0.35) {
    const s = this.sq(o);
    s.sq.freq = freq;
    s.sq.damping = damping;
    s.sq.kick(kick);
  }
  /** Pop in from nothing with an overshoot (or out, with to = 0). */
  pop(o: THREE.Object3D, to = 1, from?: number) {
    const s = this.sq(o);
    o.visible = true;
    if (from !== undefined) s.uni.x = from;
    else if (to > 0 && s.uni.target === 0) s.uni.x = 0.01;
    s.uni.target = to;
    s.uni.freq = to === 0 ? 7 : 4.5;
    s.uni.damping = to === 0 ? 1 : 0.42;
  }
  /** Hide right now (scale spring parked at 0). */
  hide(o: THREE.Object3D) {
    const s = this.sq(o);
    s.uni.snap(0);
    o.scale.setScalar(0.0001);
    o.visible = false;
  }
  setBaseScale(o: THREE.Object3D, k: number) {
    this.sq(o).base.setScalar(k);
  }
  forget(o: THREE.Object3D) {
    this.sqs.delete(o);
  }
  private stepSquash(dt: number) {
    for (const s of this.sqs.values()) {
      const y = clamp(s.sq.step(dt), 0.35, 1.9);
      const u = Math.max(0, s.uni.step(dt));
      const xz = 1 / Math.sqrt(y);
      if (u < 0.012 && s.uni.target === 0) {
        s.o.visible = false;
        s.o.scale.setScalar(0.0001);
        continue;
      }
      s.o.scale.set(s.base.x * u * xz, s.base.y * u * y, s.base.z * u * xz);
    }
  }

  // ---------------------------------------------------------------- blob shadows
  shadow(o: THREE.Object3D, radius: number, ground: number) {
    const mat = new THREE.MeshBasicMaterial({ map: this.shadowTex, color: 0x5b3a55, transparent: true, depthWrite: false, opacity: 0.5, toneMapped: false });
    const mesh = new THREE.Mesh(this.shadowGeo, mat);
    mesh.renderOrder = 1;
    mesh.raycast = () => {};
    this.scene.add(mesh);
    this.shadows.push({ o, mesh, r: radius, ground });
    return mesh;
  }
  dropShadow(o: THREE.Object3D) {
    const i = this.shadows.findIndex((s) => s.o === o);
    if (i >= 0) {
      this.scene.remove(this.shadows[i].mesh);
      this.shadows.splice(i, 1);
    }
  }
  setShadowGround(o: THREE.Object3D, ground: number) {
    const s = this.shadows.find((s) => s.o === o);
    if (s) s.ground = ground;
  }
  private v = new THREE.Vector3();
  private stepShadows() {
    for (const s of this.shadows) {
      s.o.getWorldPosition(this.v);
      const hgt = Math.max(0, this.v.y - s.ground);
      const k = clamp(1 - hgt / 1.6);
      let vis = true;
      for (let p: THREE.Object3D | null = s.o; p; p = p.parent) if (!p.visible) vis = false;
      s.mesh.visible = vis && s.o.scale.x > 0.05;
      s.mesh.position.set(this.v.x, s.ground + 0.004, this.v.z);
      const size = s.r * 2 * (1 + hgt * 0.5) * Math.min(1.2, Math.abs(s.o.scale.x));
      s.mesh.scale.set(size, 1, size);
      (s.mesh.material as THREE.MeshBasicMaterial).opacity = 0.5 * k;
    }
  }

  // ---------------------------------------------------------------- time of day
  /** Tween the lights and window toward a day phase (0 morning .. 3 candlelight; fractions blend). */
  setDay(k: number, dur = 3) {
    const from = this.dayK;
    return tween(dur, (t) => this.applyDay(lerp(from, k, t)), ease.inOut);
  }
  private c1 = new THREE.Color();
  private c2 = new THREE.Color();
  private applyDay(k: number) {
    this.dayK = k;
    const i = Math.min(DAY.length - 2, Math.floor(k)), t = clamp(k - i);
    const a = DAY[i], b = DAY[i + 1];
    const mix = (x: number, y: number, out: THREE.Color) => out.copy(this.c1.set(x)).lerp(this.c2.set(y), t);
    mix(a.sky, b.sky, this.hemi.color);
    mix(a.ground, b.ground, this.hemi.groundColor);
    this.hemi.intensity = lerp(a.hemi, b.hemi, t);
    mix(a.key, b.key, this.key.color);
    this.key.intensity = lerp(a.keyI, b.keyI, t);
    this.key.position.set(lerp(a.keyDir[0], b.keyDir[0], t), lerp(a.keyDir[1], b.keyDir[1], t), lerp(a.keyDir[2], b.keyDir[2], t)).multiplyScalar(10);
    mix(a.window, b.window, this.windowColor);
    mix(a.bg, b.bg, this.scene.background as THREE.Color);
    rimUniform.value.set(1.0, 0.72, 0.42).multiplyScalar(lerp(a.rim, b.rim, t));
    this.candleLight.intensity = lerp(a.candle, b.candle, t) * 5;
  }
  get day() {
    return this.dayK;
  }

  /** Throw the whole world away (for "cook again"); lights and particle pools stay. */
  resetWorld() {
    const keep = new Set<THREE.Object3D>([this.hemi, this.key, this.candleLight]);
    for (const c of [...this.scene.children]) {
      if (keep.has(c) || (c as THREE.InstancedMesh).isInstancedMesh) continue;
      this.scene.remove(c);
    }
    this.shadows = [];
    this.sqs.clear();
    this.input.clear();
    this.particles.clear();
    this.poses.clear();
    this.shake = 0;
    this.applyDay(0);
  }

  // ---------------------------------------------------------------- frame
  /** Ask for a snapshot of the next rendered frame (the feast photo). */
  snapshot(): Promise<string> {
    return new Promise((res) => (this.wantShot = res));
  }

  frame(realDt: number) {
    const dt = clock.step(realDt);
    this.stepSquash(dt);
    this.placeCamera(realDt);
    this.stepShadows();
    this.particles.update(realDt, this.camera);
    outlineUniform.value = (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) / this.height) * Math.max(1.4, this.height / 330);
    this.renderer.render(this.scene, this.camera);
    if (this.wantShot) {
      const f = this.wantShot;
      this.wantShot = null;
      try { f(this.renderer.domElement.toDataURL('image/jpeg', 0.82)); } catch { f(''); }
    }
    // step the pixel ratio down if the frame rate stays low (plan: capped at 1.5 on mobile, stepping down)
    this.fps.t += realDt;
    this.fps.n++;
    if (this.fps.t >= 2) {
      const fps = this.fps.n / this.fps.t;
      this.fps.t = 0;
      this.fps.n = 0;
      this.fps.low = fps < 40 ? this.fps.low + 1 : 0;
      if (this.fps.low >= 2 && this.maxRatio > 1) {
        this.maxRatio = Math.max(1, this.maxRatio - 0.25);
        this.fps.low = 0;
        this.resize();
      }
    }
  }
}
