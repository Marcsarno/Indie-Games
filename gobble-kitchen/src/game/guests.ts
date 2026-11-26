// Dinner guests: toy "peg people" sharing one rig. A guest is colours (skin, shirt, lower body, hair)
// plus hair / glasses / shirt-pattern pieces. Reactions are procedural (Idle, Yum, Cheer, Gasp) and voiced
// with per-character babble. Names show on the name cards and when a guest walks in.
import * as THREE from 'three';
import { instantiate, part, node, meshOf } from '../core/assets';
import { clock, tween, wait, ease, Spring, clamp, rand } from '../core/tween';
import { audio } from '../core/audio';
import type { Stage } from '../core/stage';

export interface GuestLook {
  id: string;
  name: string;
  skin: number;
  shirt: number;
  lower?: number;                 // lower body colour (defaults to the shirt)
  sleeves?: 'long' | 'short';
  hair?: string;
  hairColor?: number;
  extras?: { name: string; color?: number }[];
  pitch: number;                  // babble pitch
  speed: number;                  // babble syllable length
  scale?: number;
  seat: number;                   // socket_seat_<n>
  voice?: string;                 // narrator line when they walk in
  card: number;                   // portrait background
}

// The family table. The first three are the grandparents (toy likenesses: hair, glasses, favourite outfits);
// they arrive one per finished job. The others come in together at dinner time.
export const GUESTS: GuestLook[] = [
  { id: 'grammy', name: 'Grammy', skin: 0xf1c8a8, shirt: 0x2b2630, lower: 0x2b2630, sleeves: 'long', hair: 'hair_bob', hairColor: 0xd3c8b2,
    extras: [{ name: 'acc_dots' }], pitch: 310, speed: 0.1, seat: 1, voice: 'here_grammy', card: 0x8fae7e },
  { id: 'babcia', name: 'Babcia', skin: 0xf3c5a3, shirt: 0xfff7f5, lower: 0xee7191, sleeves: 'short', hair: 'hair_short', hairColor: 0xab5a31,
    extras: [{ name: 'acc_toile' }], pitch: 265, speed: 0.11, seat: 2, voice: 'here_babcia', card: 0xf6d58e },
  { id: 'dziadziu', name: 'Dziadziu', skin: 0xecb998, shirt: 0x2f80da, lower: 0x2b4b8c, sleeves: 'short', hair: 'hair_swoop', hairColor: 0xdcc08c,
    extras: [{ name: 'acc_sunglasses' }, { name: 'acc_shirt', color: 0x2468bd }], pitch: 165, speed: 0.13, seat: 3, voice: 'here_dziadziu', card: 0x7fb8b0 },
  { id: 'cousin', name: 'Cousin', skin: 0xc98a5c, shirt: 0x7fb8b0, lower: 0x4f7a5a, sleeves: 'short', hair: 'hair_pigtails', hairColor: 0x3b2630,
    pitch: 520, speed: 0.07, scale: 0.86, seat: 0, card: 0xe8833a },
  { id: 'friend', name: 'Friend', skin: 0xf6d5b0, shirt: 0xf6d58e, lower: 0xb23a48, sleeves: 'short', hair: 'hair_bowl', hairColor: 0xc97a3a,
    extras: [{ name: 'hat_party', color: 0xb23a48 }], pitch: 470, speed: 0.075, scale: 0.9, seat: 4, card: 0xb23a48 },
];

/** Names a grown-up typed in the parent area (saved on this device). */
export function guestNames(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem('gobble.names') || '{}') || {};
  } catch {
    return {};
  }
}
export function saveGuestName(id: string, name: string) {
  const all = guestNames();
  if (name.trim()) all[id] = name.trim().slice(0, 14);
  else delete all[id];
  try { localStorage.setItem('gobble.names', JSON.stringify(all)); } catch { /* storage may be blocked */ }
}

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
  arrived = false;
  name: string;
  /** The default name is in use, so the narrator has a line for it. */
  hasVoice: boolean;

  constructor(private stage: Stage, public look: GuestLook) {
    const custom = guestNames()[look.id];
    this.name = custom || look.name;
    this.hasVoice = !custom && !!look.voice;
    const model = instantiate('guest');
    this.rig = node(model, 'guest');
    this.root.add(this.rig);
    for (const n of ['root', 'body', 'head', 'arm_L', 'arm_R']) this.b[n] = node(this.rig, n);
    // tint zones: the mesh is white where it takes a colour (_zone: 1 skin, 2 shirt, 3 lower body, 4 forearm)
    const mesh = meshOf(node(this.rig, 'guest_mesh'));
    const geo = mesh.geometry.clone();
    mesh.geometry = geo;
    for (const c of mesh.children) if ((c as THREE.Mesh).isMesh) (c as THREE.Mesh).geometry = geo;
    const zone = geo.getAttribute('_zone') ?? geo.getAttribute('_ZONE');
    const col = geo.getAttribute('color').clone();
    geo.setAttribute('color', col);
    const skin = new THREE.Color(look.skin), shirt = new THREE.Color(look.shirt), lower = new THREE.Color(look.lower ?? look.shirt);
    const tint = [null, skin, shirt, lower, look.sleeves === 'short' ? skin : shirt];
    const c = new THREE.Color();
    if (zone) {
      for (let i = 0; i < col.count; i++) {
        const t = tint[Math.round(zone.getX(i))];
        if (!t) continue;
        c.fromBufferAttribute(col as THREE.BufferAttribute, i).multiply(t);
        col.setXYZ(i, c.r, c.g, c.b);
      }
      col.needsUpdate = true;
    }
    const pieces = [...(look.hair ? [{ name: look.hair, color: look.hairColor }] : []), ...(look.extras ?? [])];
    for (const { name, color } of pieces) {
      const p = part('guest', name);
      if (color !== undefined && p.userData.tint !== 0) (meshOf(p).material as THREE.MeshToonMaterial).color.set(color);
      this.b[p.userData.bone === 'body' ? 'body' : 'head'].add(p);
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
  /** Centre of the face (for portraits and name tags). */
  get faceWorld() {
    return this.b.head.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.17 * this.root.scale.y, 0));
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
    if (from.distanceTo(dest) > 0.05) this.root.rotation.y = Math.atan2(dest.x - from.x, dest.z - from.z);
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
    this.armR.target = 2.5;
    this.babble(4);
    return wait(0.8).then(() => {
      this.armR.target = 0;
    });
  }

  poke() {
    this.squash.kick(-3.5);
    this.tilt.kick(rand(-4, 4));
    this.babble(2);
  }

  update(dt: number) {
    if (!this.root.visible) return;
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
