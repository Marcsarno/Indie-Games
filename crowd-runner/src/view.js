// Three.js rendering for the game state. Nothing here changes game rules.
import * as THREE from 'three';
import { animatedMaterial, Crowd, timeUniform } from './assets.js';
import { ROAD_HALF } from './level.js';
import { MAX_DRAW } from './game.js';

const SHIRTS = [0xe23b3b, 0x8a4fd1, 0x3d6fe0, 0xf08a2c, 0xd13fa8, 0x26b0a6].map(h => new THREE.Color(h).convertSRGBToLinear());
const GATE_COL = { good: 0x2dff4a, up: 0x2a8bff, bad: 0xff3d2e };
const CHAR = 1.3;                       // characters are drawn this much bigger than their 1 m model
const rnd = (a, b) => a + Math.random() * (b - a);

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

function outlinedText(g, text, x, y, size, fill = '#fff') {
  g.font = `900 ${size}px system-ui,-apple-system,Segoe UI,Roboto,sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineJoin = 'round'; g.lineWidth = size * 0.16; g.strokeStyle = 'rgba(8,20,40,.85)';
  g.strokeText(text, x, y); g.fillStyle = fill; g.fillText(text, x, y);
}

function peopleIcon(g, cx, cy, s) {
  g.fillStyle = '#fff';
  for (const [dx, k] of [[-1.1, .8], [1.1, .8], [0, 1]]) {
    g.beginPath(); g.arc(cx + dx * s, cy - 0.45 * s * k, 0.32 * s * k, 0, 7); g.fill();
    g.beginPath(); g.ellipse(cx + dx * s, cy + 0.35 * s * k, 0.55 * s * k, 0.45 * s * k, 0, Math.PI, 0); g.fill();
  }
}
function bulletsIcon(g, cx, cy, s) {
  g.fillStyle = '#fff';
  for (const dx of [-0.75, 0, 0.75]) {
    const x = cx + dx * s;
    g.fillRect(x - 0.22 * s, cy - 0.1 * s, 0.44 * s, 0.7 * s);
    g.beginPath(); g.moveTo(x - 0.22 * s, cy - 0.1 * s); g.quadraticCurveTo(x, cy - 0.85 * s, x + 0.22 * s, cy - 0.1 * s); g.fill();
  }
}

function gateTexture(def) {
  const hex = '#' + new THREE.Color(GATE_COL[def.color]).getHexString();
  const txt = def.kind === 'add' ? `+${def.v}` : def.kind === 'sub' ? `-${def.v}` : def.kind === 'mul' ? `x${def.v}` : `x${def.v}`;
  return canvasTex(256, 256, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, hex + '66'); grd.addColorStop(1, hex + '26');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    outlinedText(g, txt, w / 2, 88, 118);
    outlinedText(g, def.label, w / 2, 152, 40);
    (def.kind === 'fire' ? bulletsIcon : peopleIcon)(g, w / 2, 205, 30);
  });
}

function textSprite(drawFn, w = 256, h = 128) {
  const tex = canvasTex(w, h, drawFn);
  const m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  return new THREE.Sprite(m);
}

function starTex() {
  return canvasTex(64, 64, (g, w) => {
    g.translate(w / 2, w / 2);
    g.fillStyle = '#fff6b0'; g.beginPath();
    for (let i = 0; i < 16; i++) { const r = i % 2 ? w * 0.14 : w * 0.48, a = (i / 16) * Math.PI * 2; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, w * 0.13, 0, 7); g.fill();
  });
}
function dotTex() {
  return canvasTex(32, 32, (g, w) => {
    const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    r.addColorStop(0, '#fff'); r.addColorStop(0.55, '#fff'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, w, w);
  });
}

class Particles {
  constructor(scene, max, tex, additive) {
    this.max = max; this.n = 0;
    this.p = new Float32Array(max * 3); this.v = new Float32Array(max * 3);
    this.life = new Float32Array(max); this.ttl = new Float32Array(max);
    this.size = new Float32Array(max); this.col = new Float32Array(max * 3); this.g = new Float32Array(max);
    this.geo = new THREE.BufferGeometry();
    this.aP = new THREE.BufferAttribute(new Float32Array(max * 3), 3); this.aS = new THREE.BufferAttribute(new Float32Array(max), 1);
    this.aC = new THREE.BufferAttribute(new Float32Array(max * 4), 4);
    this.geo.setAttribute('position', this.aP); this.geo.setAttribute('aSize', this.aS); this.geo.setAttribute('aCol', this.aC);
    this.uScale = { value: 800 };
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: tex }, uScale: this.uScale },
      vertexShader: `attribute float aSize; attribute vec4 aCol; varying vec4 vC; uniform float uScale;
        void main(){ vC=aCol; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=aSize*uScale/-mv.z; gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `uniform sampler2D uTex; varying vec4 vC;
        void main(){ vec4 t=texture2D(uTex,gl_PointCoord); gl_FragColor=vec4(vC.rgb,1.0)*t*vec4(1.0,1.0,1.0,vC.a); }`,
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.pts = new THREE.Points(this.geo, this.mat);
    this.pts.frustumCulled = false;
    scene.add(this.pts);
  }
  spawn(x, y, z, vx, vy, vz, ttl, size, color, gravity = 0) {
    const i = this.n < this.max ? this.n++ : (Math.random() * this.max) | 0;
    this.p.set([x, y, z], i * 3); this.v.set([vx, vy, vz], i * 3);
    this.life[i] = ttl; this.ttl[i] = ttl; this.size[i] = size; this.g[i] = gravity;
    const c = new THREE.Color(color); this.col.set([c.r, c.g, c.b], i * 3);
  }
  update(dt) {
    for (let i = 0; i < this.n; i++) {
      if ((this.life[i] -= dt) <= 0) {                      // swap-remove
        const j = --this.n;
        if (i !== j) {
          this.p.copyWithin(i * 3, j * 3, j * 3 + 3); this.v.copyWithin(i * 3, j * 3, j * 3 + 3); this.col.copyWithin(i * 3, j * 3, j * 3 + 3);
          this.life[i] = this.life[j]; this.ttl[i] = this.ttl[j]; this.size[i] = this.size[j]; this.g[i] = this.g[j];
        }
        i--; continue;
      }
      this.v[i * 3 + 1] -= this.g[i] * dt;
      for (let k = 0; k < 3; k++) this.p[i * 3 + k] += this.v[i * 3 + k] * dt;
      if (this.p[i * 3 + 1] < 0.03 && this.g[i]) { this.p[i * 3 + 1] = 0.03; this.v[i * 3 + 1] *= -0.3; this.v[i * 3] *= 0.6; this.v[i * 3 + 2] *= 0.6; }
    }
    for (let i = 0; i < this.n; i++) {
      this.aP.array.set(this.p.subarray(i * 3, i * 3 + 3), i * 3);
      const f = this.life[i] / this.ttl[i];
      this.aS.array[i] = this.size[i] * (0.4 + 0.6 * f);
      this.aC.array.set([this.col[i * 3], this.col[i * 3 + 1], this.col[i * 3 + 2], Math.min(1, f * 1.6)], i * 4);
    }
    this.geo.setDrawRange(0, this.n);
    this.aP.needsUpdate = this.aS.needsUpdate = this.aC.needsUpdate = true;
  }
}

export class View {
  constructor(canvas, models, game) {
    this.game = game; this.models = models; this.canvas = canvas;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.NoToneMapping;
    const scene = this.scene = new THREE.Scene();
    scene.background = canvasTex(4, 256, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#2f86e8'); gr.addColorStop(0.55, '#7cc0f5'); gr.addColorStop(1, '#cfe9ff');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    });
    scene.fog = new THREE.Fog(0xcfe6ff, 85, 210);
    this.camera = new THREE.PerspectiveCamera(54, 9 / 16, 0.2, 260);
    scene.add(new THREE.HemisphereLight(0xdcefff, 0x8aa070, 1.55));
    this.sun = new THREE.DirectionalLight(0xfff2d8, 2.3);
    this.sun.position.set(-8, 14, 6); scene.add(this.sun, this.sun.target);

    this.buildWorld();
    this.buildActors();
    this.fx = {
      flash: new Particles(scene, 64, starTex(), true),
      splat: new Particles(scene, 600, dotTex(), false),
      spark: new Particles(scene, 200, dotTex(), true),
    };
    this.resize();
  }

  resize() {
    const w = this.canvas.clientWidth || 360, h = this.canvas.clientHeight || 640;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 0.6 ? 54 : 54 * (0.5625 / (w / h)) ** 0.5;
    this.camera.updateProjectionMatrix();
    const s = (h * this.renderer.getPixelRatio()) / (2 * Math.tan((this.camera.fov * Math.PI) / 360));
    for (const f of Object.values(this.fx || {})) f.uScale.value = s;
  }

  // ------------------------------------------------------------------ static world
  buildWorld() {
    const sc = this.scene, L = this.game.level, len = L.length + 140, z0 = 40, zc = z0 - len / 2;
    const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, flatShading: true, ...o });
    const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); sc.add(o); return o; };

    add(new THREE.PlaneGeometry(240, len).rotateX(-Math.PI / 2), mat(0x77c443), 0, 0, zc);             // grass
    add(new THREE.PlaneGeometry(ROAD_HALF * 2, len).rotateX(-Math.PI / 2), mat(0x6a6d76), 0, 0.01, zc); // asphalt
    for (const sx of [-1, 1]) {                                                                          // curb + pavement
      add(new THREE.BoxGeometry(0.5, 0.18, len), mat(0xeaeef2), sx * (ROAD_HALF + 0.25), 0.09, zc);
      add(new THREE.BoxGeometry(1.4, 0.12, len), mat(0xc9ced6), sx * (ROAD_HALF + 1.2), 0.06, zc);
    }
    const dashes = Math.floor(len / 5);                                                                  // centre dashes
    const dm = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 0.02, 2.2), new THREE.MeshBasicMaterial({ color: 0xf4f6f8 }), dashes);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < dashes; i++) { m4.makeTranslation(0, 0.025, z0 - i * 5); dm.setMatrixAt(i, m4); }
    sc.add(dm);

    // scenery as instanced meshes
    const place = (geo, material, items) => {
      const im = new THREE.InstancedMesh(geo, material, items.length);
      const q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
      items.forEach((it, i) => {
        q.setFromAxisAngle(up, it.ry || 0);
        im.setMatrixAt(i, m4.compose(p.set(it.x, it.y || 0, it.z), q, s.set(it.sx || it.s || 1, it.sy || it.s || 1, it.sz || it.s || 1)));
        if (it.c) im.setColorAt(i, it.c);
      });
      sc.add(im); return im;
    };
    const vmat = () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0, flatShading: true });
    const pines = [], lamps = [], blds = [];
    const tones = [0xe0a060, 0xeab277, 0xcf8f50, 0x8aa1d0, 0x7088c0, 0xb4c3e3].map(h => new THREE.Color(h));
    for (let z = z0 + 10; z > z0 - len; z -= rnd(5, 9)) {
      for (const sx of [-1, 1]) {
        pines.push({ x: sx * rnd(6.2, 15), z, s: rnd(0.9, 1.7), ry: rnd(0, 6) });
        if (Math.random() < 0.5) pines.push({ x: sx * rnd(6, 22), z: z + rnd(-3, 3), s: rnd(1.1, 2.1), ry: rnd(0, 6) });
      }
    }
    for (let z = z0; z > z0 - len; z -= rnd(14, 24)) {
      for (const sx of [-1, 1]) {
        const w = rnd(6, 12), h = rnd(5, 17), d = rnd(8, 14);
        blds.push({ x: sx * (rnd(13, 26) + w / 2), y: h / 2, z, sx: w, sy: h, sz: d, c: tones[(Math.random() * tones.length) | 0] });
      }
    }
    for (let z = z0 - 10; z > z0 - len; z -= 38) lamps.push({ x: -(ROAD_HALF + 1.3), z, ry: 0 }, { x: ROAD_HALF + 1.3, z: z - 19, ry: Math.PI });
    place(this.models.pine, vmat(), pines);
    place(this.models.lamp, vmat(), lamps);
    const bi = place(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), blds);
    // roadside clutter (tyres, crates, barrels, barriers), denser later in the level
    const clutter = { crate: [], barrel: [], tires: [], barrier: [] };
    for (let z = -10; z > -L.length - 20; z -= rnd(7, 15)) {
      const sx = Math.random() < 0.5 ? -1 : 1, x = sx * (ROAD_HALF + rnd(1.9, 3.2));
      const kind = ['crate', 'barrel', 'tires', 'barrier'][(Math.random() * 4) | 0];
      clutter[kind].push({ x, z, ry: rnd(0, 6), s: kind === 'barrier' ? 1 : rnd(0.9, 1.15) });
      if (kind === 'barrier') clutter.barrier[clutter.barrier.length - 1].ry = Math.PI / 2;
    }
    for (const k of Object.keys(clutter)) if (clutter[k].length) place(this.models[k], vmat(), clutter[k]);

    // gates
    this.gateViews = this.game.gates.map(g => {
      const root = new THREE.Group(); root.position.z = g.z; sc.add(root);
      const sides = [];
      for (const [side, x] of [['left', -1.72], ['right', 1.72]]) {
        const def = g[side], col = GATE_COL[def.color];
        const frame = new THREE.Mesh(this.models.gate, new THREE.MeshStandardMaterial({ vertexColors: true, color: col, emissive: col, emissiveIntensity: 0.55, roughness: 0.4, flatShading: true }));
        frame.position.x = x; root.add(frame);
        const pane = new THREE.Mesh(new THREE.PlaneGeometry(2.76, 2.18), new THREE.MeshBasicMaterial({ map: gateTexture(def), transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false }));
        pane.position.set(x, 1.2, 0.0); root.add(pane);
        sides.push({ frame, pane, side });
      }
      return { g, root, sides };
    });

    // weapon pickups
    this.pickupViews = this.game.pickups.map(p => {
      const root = new THREE.Group(); root.position.set(p.x, 0, p.z); sc.add(root);
      const ped = new THREE.Mesh(this.models.pedestal, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, flatShading: true }));
      root.add(ped);
      const gun = new THREE.Mesh(this.models.minigun, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, flatShading: true }));
      gun.scale.setScalar(2.1); gun.position.y = 1.3; root.add(gun);
      const sign = textSprite((g, w, h) => {
        g.fillStyle = 'rgba(30,34,44,.92)'; g.beginPath(); g.roundRect(8, 8, w - 16, h - 16, 22); g.fill();
        g.fillStyle = '#ffc21a'; g.beginPath(); g.arc(58, h / 2, 30, 0, 7); g.fill();
        g.fillStyle = '#ffe27a'; g.beginPath(); g.arc(58, h / 2, 18, 0, 7); g.fill();
        outlinedText(g, String(p.price), 168, h / 2 + 2, 68);
      });
      sign.scale.set(1.9, 0.95, 1); sign.position.set(0.5, 2.5, 0); root.add(sign);
      // crate barricade between the squad and the pedestal
      const crates = new THREE.Group(); crates.position.z = 4.5; root.add(crates);
      for (let row = 0; row < 2; row++) for (let i = -1; i <= 1; i++) {
        const c = new THREE.Mesh(this.models.crate, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, flatShading: true }));
        c.position.set(i * 0.95, row * 0.9, 0); c.rotation.y = rnd(-0.08, 0.08); crates.add(c);
      }
      const hp = textSprite(() => {}, 256, 128); hp.scale.set(1.7, 0.85, 1); hp.position.set(0, 2.4, 0); crates.add(hp);
      return { p, root, gun, crates, hp, shownHp: -1 };
    });
  }

  drawHp(pv, value) {
    const tex = pv.hp.material.map;
    const g = tex.image.getContext('2d');
    g.clearRect(0, 0, 256, 128);
    g.fillStyle = 'rgba(30,34,44,.9)'; g.beginPath(); g.roundRect(30, 18, 196, 92, 22); g.fill();
    outlinedText(g, String(Math.max(0, Math.ceil(value))), 128, 66, 66, '#ffd24a');
    tex.needsUpdate = true;
  }

  // ------------------------------------------------------------------ moving actors
  buildActors() {
    const sc = this.scene, M = this.models;
    this.moveU = { value: 1 };
    const soldierMat = animatedMaterial({ hip: 0.3, legSwing: 0.8, speed: 11, bob: 0.035 });
    soldierMat.onBeforeCompile = ((orig) => (sh) => { orig(sh); sh.uniforms.uMove = this.moveU; sh.vertexShader = sh.vertexShader.replace('uniform float uTime;', 'uniform float uTime; uniform float uMove;').replace('float cs = cos(ang)', 'ang *= uMove; float cs = cos(ang)'); })(soldierMat.onBeforeCompile);
    soldierMat.customProgramCacheKey = () => 'soldier';
    this.soldiers = new Crowd(M.soldier, soldierMat, MAX_DRAW + 20, sc);
    const zm = animatedMaterial({ hip: 0.3, shoulder: 0.54, legSwing: 0.55, armSwing: 0.12, speed: 8, bob: 0.03, tinted: true });
    zm.customProgramCacheKey = () => 'zombie';
    this.zombies = new Crowd(M.zombie, zm, 150, sc);
    const bm = animatedMaterial({ hip: 0.78, shoulder: 1.4, legSwing: 0.35, armSwing: 0.08, speed: 4.5, bob: 0.08 });
    bm.customProgramCacheKey = () => 'brute';
    this.brute = new Crowd(M.brute, bm, 2, sc);

    const gm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, flatShading: true });
    this.guns = new THREE.InstancedMesh(M.minigun, gm, 64); this.guns.frustumCulled = false; this.guns.count = 0; sc.add(this.guns);

    this.blobs = new THREE.InstancedMesh(new THREE.CircleGeometry(0.42, 10).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.26, depthWrite: false }), 420);
    this.blobs.frustumCulled = false; this.blobs.renderOrder = 1; sc.add(this.blobs);

    this.bulletMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 0.06, 0.8), new THREE.MeshBasicMaterial({ color: 0xffe25c, fog: false }), 200);
    this.bulletMesh.frustumCulled = false; sc.add(this.bulletMesh);
    this.m4 = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.v = new THREE.Vector3(); this.one = new THREE.Vector3(1, 1, 1);
  }

  // ------------------------------------------------------------------ per frame
  render(dt, time) {
    const g = this.game, s = g.squad;
    timeUniform.value = time;
    this.moveU.value += ((s.hold || g.state !== 'play' ? 0 : 1) - this.moveU.value) * Math.min(1, dt * 6);

    // camera follows the squad
    const cx = s.x * 0.55, d = Math.min(g.form.depth, 7);   // pull back as the block grows deeper
    this.camera.position.set(cx, 6.2 + d * 0.55, s.z + 8.4 + d * 0.8);
    this.camera.lookAt(cx, 0.5, s.z - 9.5);
    this.sun.position.set(s.x - 8, 14, s.z + 6); this.sun.target.position.set(s.x, 0, s.z);

    // soldiers
    const sd = this.soldiers; sd.begin(); this.guns.count = 0; let gi = 0, bi = 0;
    const blob = (x, z, k = 1) => { if (bi < 420) { this.m4.compose(this.v.set(x, 0.03, z), this.q.identity(), this.one.set(k, k, k)); this.blobs.setMatrixAt(bi++, this.m4); } };
    g.form.slots.forEach((sl, i) => {
      const x = s.x + sl.dx, z = s.z + sl.dz;
      sd.add(x, 0, z, Math.PI, CHAR, i * 0.83);
      blob(x, z, 1.3);
      if (s.weapon === 'minigun' && i % 4 === 0 && gi < 64) {
        this.q.setFromAxisAngle(this.v.set(0, 1, 0), Math.PI);
        this.m4.compose(this.v.set(x + 0.2, 0.8, z - 0.62), this.q, this.one.set(1.05, 1.05, 1.05)); this.guns.setMatrixAt(gi++, this.m4);
      }
    });
    sd.end(); this.guns.count = gi; this.guns.instanceMatrix.needsUpdate = true;

    // zombies
    const zs = this.zombies; zs.begin(); this.brute.begin();
    for (const z of g.zombies) {
      if (z.dead) continue;
      if (z.boss) {
        this.brute.add(z.x, 0, z.z, 0, CHAR, z.phase, 1, 1, 1, z.flash ? 0.35 : 0); blob(z.x, z.z, 4.4);
      } else {
        const c = SHIRTS[z.shade];
        zs.add(z.x, 0, z.z, Math.sin(z.phase * 0.2) * 0.25, CHAR, z.phase, c.r, c.g, c.b, z.flash ? 1 : 0);
        blob(z.x, z.z, 1.3);
      }
    }
    zs.end(); this.brute.end();
    this.blobs.count = bi; this.blobs.instanceMatrix.needsUpdate = true;

    // bullets
    let k = 0;
    for (const b of g.bullets) { if (k >= 200) break; this.m4.makeTranslation(b.x, 0.62, b.z); this.bulletMesh.setMatrixAt(k++, this.m4); }
    this.bulletMesh.count = k; this.bulletMesh.instanceMatrix.needsUpdate = true;

    // gates + pickups animation
    for (const gv of this.gateViews) for (const sd2 of gv.sides) {
      const taken = gv.g.done && gv.g.picked !== sd2.side;
      sd2.pane.material.opacity = taken ? 0.25 : 1;
      sd2.frame.material.emissiveIntensity = taken ? 0.1 : 0.55 + Math.sin(time * 3) * 0.12;
    }
    for (const pv of this.pickupViews) {
      pv.gun.rotation.y = time * 1.6; pv.gun.position.y = 1.3 + Math.sin(time * 2.4) * 0.1;
      pv.gun.visible = pv.p.taken !== 'bought';
      const left = Math.ceil(pv.p.bar);
      if (pv.shownHp !== left) { pv.shownHp = left; this.drawHp(pv, left); }
      pv.crates.visible = !pv.p.open;
    }

    this.renderer.render(this.scene, this.camera);
  }

  updateFx(dt) { for (const f of Object.values(this.fx)) f.update(dt); }

  /** Turn game events into particles. Returns floating texts for the DOM layer. */
  consume(events) {
    const floats = [];
    for (const e of events) {
      switch (e.type) {
        case 'muzzle': {
          this.fx.flash.spawn(e.x, 0.9, e.z - 0.2, 0, 0, 0, 0.07, 0.6, 0xffe9a0);
          if (Math.random() < 0.5) this.fx.spark.spawn(e.x + 0.1, 0.65, e.z, rnd(1, 2.5), rnd(1.5, 3), rnd(0, 2), 0.5, 0.12, 0xffd05a, 14);
          break;
        }
        case 'hit': {
          const c = e.color === 'wood' ? 0xc68a4a : 0x7bd23a;
          for (let i = 0; i < (e.big ? 4 : 3); i++) this.fx.splat.spawn(e.x, 0.95, e.z, rnd(-1.8, 1.8), rnd(1, 3.2), rnd(0, 2.5), 0.45, e.big ? 0.5 : 0.32, c, 12);
          break;
        }
        case 'kill':
          for (let i = 0; i < (e.boss ? 60 : 14); i++) this.fx.splat.spawn(e.x, 0.7, e.z, rnd(-3, 3), rnd(1, 5), rnd(-2, 3), 0.7, rnd(0.3, 0.6) * (e.boss ? 2 : 1), i % 3 ? 0x7bd23a : 0xc4f26a, 12);
          break;
        case 'bite':
          for (let i = 0; i < 8; i++) this.fx.splat.spawn(e.x, 0.8, e.z, rnd(-2, 2), rnd(1, 4), rnd(-1, 1), 0.5, 0.35, 0xff5a4a, 10);
          break;
        case 'crash':
          for (let i = 0; i < 40; i++) this.fx.splat.spawn(e.x + rnd(-1.2, 1.2), 0.8, e.z, rnd(-3, 3), rnd(2, 6), rnd(-2, 2), 0.9, rnd(0.25, 0.5), 0xc68a4a, 12);
          break;
        case 'gate': {
          const base = e.cls === 'bad' ? 0xff5a4a : 0x6aff5a;
          for (let i = 0; i < 40; i++) this.fx.spark.spawn(e.x + rnd(-1.5, 1.5), rnd(0.5, 2.2), e.z, rnd(-2, 2), rnd(1, 4), rnd(-1, 1), 0.9, 0.3, base, 4);
          floats.push({ text: e.text, cls: e.cls, x: e.x, y: 1.9, z: e.z });
          break;
        }
        case 'float': floats.push({ text: e.text, cls: e.cls, x: e.x, y: 2.2, z: e.z }); break;
      }
    }
    return floats;
  }

  project(x, y, z) {
    this.v.set(x, y, z).project(this.camera);
    return { px: (this.v.x * 0.5 + 0.5) * 100, py: (-this.v.y * 0.5 + 0.5) * 100, behind: this.v.z > 1 };
  }
}
