// Dinner guests: toy "peg people" sharing one rig. Customisation is colour and hair/hat swaps.
// Reactions are procedural (Idle, Yum, Cheer, Gasp) and voiced with per-character babble.
import * as THREE from 'three';
import { instantiate, part, node, meshOf } from '../core/assets';
import { clock, tween, wait, ease, Spring, clamp, rand } from '../core/tween';
import { audio } from '../core/audio';
import type { Stage } from '../core/stage';

export interface GuestLook {
  name: string;
  skin: number;
  shirt: number;
  hair?: string;
  hairColor?: number;
  extra?: string;
  extraColor?: number;
  pitch: number;       // babble pitch
  speed: number;       // babble syllable length
  scale?: number;
}

// The default table: "Friends and Pets" until the Guest Book is built.
export const DEFAULT_GUESTS: GuestLook[] = [
  { name: 'grandma', skin: 0xf2c9a4, shirt: 0xb23a48, hair: 'hair_bun', hairColor: 0xe9e4e4, extra: 'acc_glasses', pitch: 230, speed: 0.12 },
  { name: 'cousin', skin: 0xc98a5c, shirt: 0x7fb8b0, hair: 'hair_pigtails', hairColor: 0x3b2630, pitch: 520, speed: 0.07, scale: 0.86 },
  { name: 'grandpa', skin: 0xe8b98e, shirt: 0x4f7a5a, hair: 'hair_side', hairColor: 0xf3eeee, pitch: 170, speed: 0.13 },
  { name: 'auntie', skin: 0x8c5a3c, shirt: 0xe8833a, hair: 'hair_curly', hairColor: 0x2c1b26, pitch: 330, speed: 0.09 },
  { name: 'friend', skin: 0xf6d5b0, shirt: 0xf6d58e, hair: 'hair_bowl', hairColor: 0xc97a3a, extra: 'hat_party', extraColor: 0xb23a48, pitch: 470, speed: 0.075, scale: 0.9 },
];

export class Guest {
  root = new THREE.Group();
  private rig: THREE.Object3D;
  private b: Record<string, THREE.Object3D> = {};
  private squash = new Spring(1, 4, 0.35);
  private nod = new Spring(0, 3.2, 0.4);
  private tilt = new Spring(0, 3, 0.4);
  private armL = new Spring(0, 4, 0.35);
  private armR = new Spring(0, 4, 0.35);
  private lean = new Spring(0, 3, 0.5);
  private phase = rand(0, 6);
  hopY = 0;
  served = false;
  seat = -1;

  constructor(private stage: Stage, public look: GuestLook) {
    const model = instantiate('guest');
    this.rig = node(model, 'guest');
    this.root.add(this.rig);
    for (const n of ['root', 'body', 'head', 'arm_L', 'arm_R']) this.b[n] = node(this.rig, n);
    // tint zones: the mesh is white where it should take a colour (_zone: 1 skin, 2 shirt)
    const mesh = meshOf(node(this.rig, 'guest_mesh'));
    const geo = mesh.geometry.clone();
    mesh.geometry = geo;
    for (const c of mesh.children) if ((c as THREE.Mesh).isMesh) (c as THREE.Mesh).geometry = geo;
    const zone = geo.getAttribute('_zone') ?? geo.getAttribute('_ZONE');
    const col = geo.getAttribute('color').clone();
    geo.setAttribute('color', col);
    const skin = new THREE.Color(look.skin), shirt = new THREE.Color(look.shirt);
    const c = new THREE.Color();
    if (zone) {
      for (let i = 0; i < col.count; i++) {
        const z = Math.round(zone.getX(i));
        if (z === 0) continue;
        c.fromBufferAttribute(col as THREE.BufferAttribute, i).multiply(z === 1 ? skin : shirt);
        col.setXYZ(i, c.r, c.g, c.b);
      }
      col.needsUpdate = true;
    }
    for (const [name, color] of [[look.hair, look.hairColor], [look.extra, look.extraColor]] as const) {
      if (!name) continue;
      const p = part('guest', name);
      if (color !== undefined && p.userData.tint !== 0) (meshOf(p).material as THREE.MeshToonMaterial).color.set(color);
      this.b.head.add(p);
    }
    this.root.scale.setScalar(look.scale ?? 1);
    stage.scene.add(this.root);
    stage.shadow(this.root, 0.24, 0);
  }

  get hitRoot() {
    return this.rig;
  }
  get headWorld() {
    return this.b.head.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.25, 0));
  }

  babble(syllables = 4) {
    return audio.babble(this.look.pitch, syllables, this.look.speed, 0.18);
  }

  hop(height = 0.2, dur = 0.26) {
    this.squash.kick(2);
    return tween(dur, (k) => (this.hopY = Math.sin(k * Math.PI) * height), ease.linear).then(() => {
      this.hopY = 0;
      this.squash.kick(-3);
    });
  }

  async hopTo(dest: THREE.Vector3, hopLen = 0.6) {
    const from = this.root.position.clone();
    const hops = Math.max(1, Math.round(from.distanceTo(dest) / hopLen));
    const yaw = Math.atan2(dest.x - from.x, dest.z - from.z);
    this.root.rotation.y = yaw;
    for (let i = 0; i < hops; i++) {
      const a = from.clone().lerp(dest, i / hops), b = from.clone().lerp(dest, (i + 1) / hops);
      this.squash.kick(2);
      audio.tone({ freq: 220 + i * 14, to: 150, dur: 0.06, vol: 0.09, type: 'triangle' });
      await tween(0.22, (k) => {
        this.root.position.lerpVectors(a, b, k);
        this.hopY = Math.sin(k * Math.PI) * (0.2 + Math.max(0, b.y - a.y) * 0.6);
      }, ease.linear);
      this.hopY = 0;
      this.squash.kick(-2.6);
    }
  }

  turnTo(yaw: number, dur = 0.25) {
    const from = this.root.rotation.y;
    let d = yaw - from;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return tween(dur, (k) => (this.root.rotation.y = from + d * k), ease.out);
  }

  async yum() {
    this.nod.kick(6);
    this.lean.kick(4);
    this.armL.kick(5);
    this.armR.kick(5);
    this.babble(3);
    this.stage.particles.burst('heart', this.headWorld, { count: 4, color: [0xd8453f, 0xf0907a, 0xffd27a] });
    await wait(0.8);
  }

  async cheer() {
    this.armL.target = 2.6;
    this.armR.target = 2.6;
    this.babble(5);
    await this.hop(0.22, 0.28);
    await this.hop(0.16, 0.24);
    this.armL.target = 0;
    this.armR.target = 0;
  }

  gasp() {
    this.squash.kick(3.5);
    this.armL.kick(8);
    this.armR.kick(8);
    this.nod.kick(-3);
    this.babble(2);
  }

  wave() {
    this.armR.target = 2.4;
    this.babble(4);
    return wait(0.7).then(() => {
      this.armR.target = 0;
    });
  }

  poke() {
    this.squash.kick(-3.5);
    this.tilt.kick(rand(-4, 4));
    this.babble(2);
  }

  update(dt: number) {
    const t = clock.real + this.phase;
    const s = clamp(this.squash.step(dt) * (1 + Math.sin(t * 2.1) * 0.012), 0.5, 1.7);
    const xz = 1 / Math.sqrt(s);
    this.b.root.position.y = this.hopY;
    this.b.body.scale.set(xz, s, xz);
    this.b.body.rotation.set(this.lean.step(dt) * 0.1, 0, Math.sin(t * 1.2) * 0.025);
    this.b.head.rotation.set(this.nod.step(dt) * 0.1, Math.sin(t * 0.7) * 0.12, this.tilt.step(dt) * 0.14 + Math.sin(t * 0.9) * 0.03);
    const wig = Math.sin(clock.real * 16) * 0.12;
    const aL = this.armL.step(dt), aR = this.armR.step(dt);
    this.b.arm_L.rotation.z = aL + (aL > 1.5 ? wig : 0);
    this.b.arm_R.rotation.z = -aR - (aR > 1.5 ? wig : 0);
  }
}
