// Gobbles, the nervous turkey sous-chef. One skinned mesh; every move is procedural (springs on bones),
// so he can react to the finger at once. His fan tail is the mood meter: fluffed when happy,
// drooping when embarrassed, shaking when scared.
import * as THREE from 'three';
import { instantiate, part, node } from '../core/assets';
import { clock, tween, wait, ease, Spring, clamp, rand, pick } from '../core/tween';
import { audio } from '../core/audio';
import type { Stage } from '../core/stage';

export type Mood = 'idle' | 'happy' | 'sad' | 'scared';
export const DISGUISES = ['dis_pumpkin', 'dis_mustache', 'dis_leaf'];

export class Gobbles {
  root = new THREE.Group();          // moves and turns him
  private rig: THREE.Object3D;
  private bones: Record<string, THREE.Object3D> = {};
  private rest: Record<string, THREE.Vector3> = {};
  private squash = new Spring(1, 4, 0.35);
  private fan = new Spring(1, 3.2, 0.3);
  private droop = new Spring(0, 2.6, 0.5);
  private tilt = new Spring(0, 3, 0.4);
  private nod = new Spring(0, 3.5, 0.45);
  private lean = new Spring(0, 3, 0.5);
  private flap = new Spring(0.12, 5, 0.35);
  private jaw = new Spring(0, 9, 0.6);
  private wattle = new Spring(0, 2.5, 0.12);
  private eyeWide = new Spring(1, 6, 0.5);
  private pupil = new THREE.Vector2();
  private lookWorld: THREE.Vector3 | null = null;
  private lookUntil = 0;
  private blink = 0;
  private nextBlink = 2;
  private talkUntil = 0;
  private shiver = 0;
  private hats = new Map<string, THREE.Object3D>();
  private hat: THREE.Object3D | null = null;
  mood: Mood = 'idle';
  hopY = 0;
  busy = false;
  found = new Set<string>();

  constructor(private stage: Stage) {
    const model = instantiate('gobbles');
    this.rig = node(model, 'gobbles');
    this.root.add(this.rig);
    for (const n of ['root', 'body', 'head', 'eye_L', 'eye_R', 'pupil_L', 'pupil_R', 'jaw', 'wattle', 'wing_L', 'wing_R', 'tail']) {
      this.bones[n] = node(this.rig, n);
      this.rest[n] = this.bones[n].position.clone();
    }
    for (const n of ['hat_chef', 'hat_pilgrim', ...DISGUISES]) {
      const h = part('gobbles', n);
      h.visible = false;
      this.bones.head.add(h);
      this.hats.set(n, h);
    }
    this.wear('hat_chef', false);
    stage.scene.add(this.root);
    stage.shadow(this.root, 0.2, 0);
  }

  get hitRoot() {
    return this.rig;
  }
  get headWorld() {
    return this.bones.head.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.1, 0));
  }

  setGround(y: number) {
    this.stage.setShadowGround(this.root, y);
  }

  setMood(m: Mood) {
    this.mood = m;
    this.fan.target = m === 'happy' ? 1.2 : m === 'sad' ? 0.78 : m === 'scared' ? 0.88 : 1;
    this.droop.target = m === 'sad' ? 0.75 : 0;
    this.eyeWide.target = m === 'scared' ? 1.25 : 1;
    this.flap.target = m === 'scared' ? 0.5 : 0.12;
  }

  /** Eyes follow a world point for a while (the finger). */
  look(p: THREE.Vector3, seconds = 2.5) {
    this.lookWorld = p.clone();
    this.lookUntil = clock.real + seconds;
  }

  talk(seconds: number) {
    this.talkUntil = clock.real + seconds;
  }

  /** Gobble babble with a flapping beak. */
  gobble(syllables = 4) {
    const d = audio.babble(640, syllables, 0.075, 0.2, true);
    this.talk(d);
    this.wattle.kick(3);
    return d;
  }

  wear(name: string | null, tada = true) {
    if (this.hat) this.stage.pop(this.hat, 0);
    this.hat = name ? this.hats.get(name)! : null;
    if (this.hat) {
      this.stage.pop(this.hat, 1, 0.01);
      if (tada) {
        audio.jingle();
        this.stage.particles.burst('spark', this.headWorld, { count: 8, color: [0xffd27a, 0xffffff, 0xe8833a] });
      }
    }
  }

  // ---------------------------------------------------------------- reactions
  bounce(k = -3) {
    this.squash.kick(k);
    this.wattle.kick(4);
  }

  async cheer() {
    this.setMood('happy');
    this.fan.kick(3.5);        // tail fan-pop
    this.flap.kick(9);
    this.gobble(4);
    for (let i = 0; i < 2; i++) await this.hop(0.16, 0.26);
    this.flap.kick(6);
    await wait(0.5);
    if (this.mood === 'happy') this.setMood('idle');
  }

  flinch() {
    this.squash.kick(-4.5);
    this.lean.kick(-3);
    this.blink = 0.28;
    this.flap.kick(6);
    this.wattle.kick(6);
  }

  async yum() {
    this.setMood('happy');
    this.nod.kick(5);
    this.talk(0.6);
    audio.babble(700, 3, 0.09, 0.18, true);
    this.stage.particles.burst('heart', this.headWorld, { count: 3, color: [0xd8453f, 0xf0907a] });
    await wait(0.9);
    if (this.mood === 'happy') this.setMood('idle');
  }

  async sneeze() {
    this.nod.kick(-4);
    await wait(0.25);
    this.nod.kick(9);
    this.squash.kick(-4);
    audio.noise({ type: 'highpass', freq: 1800, dur: 0.18, vol: 0.25 });
    audio.tone({ freq: 900, to: 300, dur: 0.16, vol: 0.2 });
    this.stage.particles.burst('puff', this.headWorld.add(new THREE.Vector3(0, -0.1, 0.15)), { count: 6, color: 0xfff4e0, size: 0.06 });
  }

  /** The oven opened: panic, then duck into a disguise. */
  async panic(disguise?: string) {
    if (this.busy) return;
    this.busy = true;
    this.setMood('scared');
    this.shiver = 1;
    this.gobble(6);
    this.flap.kick(12);
    for (let i = 0; i < 3; i++) await this.hop(0.1, 0.14);
    const name = disguise ?? pick(DISGUISES.filter((d) => d !== this.hat?.name) );
    this.squash.kick(-6);
    await wait(0.18);
    this.wear(name);
    this.found.add(name);
    this.shiver = 0;
    this.setMood('idle');
    this.fan.kick(2);
    await wait(0.6);
    this.busy = false;
    return name;
  }

  /** One hop in place (or while root is being moved by a tween). */
  hop(height = 0.14, dur = 0.24) {
    this.squash.kick(2.2);
    return tween(dur, (k) => (this.hopY = Math.sin(k * Math.PI) * height), ease.linear).then(() => {
      this.hopY = 0;
      this.squash.kick(-3);
      this.wattle.kick(3);
    });
  }

  /** Turn to face a world point. */
  face(p: THREE.Vector3, dur = 0.2) {
    const to = Math.atan2(p.x - this.root.position.x, p.z - this.root.position.z);
    const from = this.root.rotation.y;
    let d = to - from;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return tween(dur, (k) => (this.root.rotation.y = from + d * k), ease.out);
  }

  /** Hop along a straight line to a spot (y included), then face +Z (the player) unless told otherwise. */
  async hopTo(dest: THREE.Vector3, faceAfter: THREE.Vector3 | null = null, hopLen = 0.42) {
    const from = this.root.position.clone();
    const dist = from.distanceTo(dest);
    if (dist > 0.05) {
      await this.face(dest, 0.12);
      const hops = Math.max(1, Math.round(dist / hopLen));
      for (let i = 0; i < hops; i++) {
        const a = from.clone().lerp(dest, i / hops), b = from.clone().lerp(dest, (i + 1) / hops);
        const dur = 0.2;
        audio.tone({ freq: 480 + i * 12, to: 300, dur: 0.05, vol: 0.07, type: 'triangle' });
        this.squash.kick(2);
        await tween(dur, (k) => {
          this.root.position.lerpVectors(a, b, k);
          this.hopY = Math.sin(k * Math.PI) * (0.12 + Math.abs(b.y - a.y) * 0.5);
        }, ease.linear);
        this.hopY = 0;
        this.squash.kick(-2.4);
      }
    }
    this.root.position.copy(dest);
    const f = faceAfter ?? dest.clone().add(new THREE.Vector3(0, 0, 5));
    await this.face(f, 0.15);
  }

  // ---------------------------------------------------------------- frame
  private tmp = new THREE.Vector3();
  update(dt: number, realDt: number) {
    const t = clock.real;
    const b = this.bones;
    const breathe = 1 + Math.sin(t * 2.4) * 0.018;
    const s = clamp(this.squash.step(dt) * breathe, 0.5, 1.7);
    const xz = 1 / Math.sqrt(s);
    b.root.position.set(this.rest.root.x + (this.shiver ? Math.sin(t * 70) * 0.006 : 0), this.rest.root.y + this.hopY, this.rest.root.z);
    b.body.scale.set(xz, s, xz);
    b.body.rotation.set(this.lean.step(dt) * 0.12, 0, Math.sin(t * 1.3) * 0.02);

    // head: gentle idle bob, tilt, nod
    b.head.rotation.set(this.nod.step(dt) * 0.12 + Math.sin(t * 1.9) * 0.02, 0, this.tilt.step(dt) * 0.2 + Math.sin(t * 0.8) * 0.03);

    // eyes: blink and look
    this.nextBlink -= realDt;
    if (this.nextBlink <= 0) {
      this.blink = 0.13;
      this.nextBlink = rand(1.8, 4.5);
    }
    this.blink = Math.max(0, this.blink - realDt);
    const open = this.blink > 0 ? 0.08 : 1;
    const wide = this.eyeWide.step(dt);
    for (const e of [b.eye_L, b.eye_R]) e.scale.set(wide, THREE.MathUtils.lerp(e.scale.y, open * wide, 0.5), 1);
    let px = Math.sin(t * 0.5) * 0.004, py = 0;
    if (this.lookWorld && t < this.lookUntil) {
      this.tmp.copy(this.lookWorld);
      b.head.worldToLocal(this.tmp);
      const d = Math.max(0.2, this.tmp.length());
      px = clamp((this.tmp.x / d) * 0.03, -0.017, 0.017);
      py = clamp(((this.tmp.y - 0.1) / d) * 0.03, -0.014, 0.014);
      this.tilt.target = clamp(this.tmp.x / d, -1, 1) * 0.5;
    } else {
      this.tilt.target = 0;
    }
    this.pupil.x += (px - this.pupil.x) * Math.min(1, realDt * 14);
    this.pupil.y += (py - this.pupil.y) * Math.min(1, realDt * 14);
    const ps = this.mood === 'scared' ? 0.7 : 1;
    for (const n of ['pupil_L', 'pupil_R']) {
      b[n].position.set(this.rest[n].x + this.pupil.x, this.rest[n].y + this.pupil.y, this.rest[n].z);
      b[n].scale.setScalar(ps);
    }

    // beak and wattle
    this.jaw.target = t < this.talkUntil ? (Math.sin(t * 34) > 0 ? 1 : 0.15) : 0;
    b.jaw.rotation.x = this.jaw.step(dt) * 0.55;
    b.wattle.rotation.z = this.wattle.step(dt) * 0.25;

    // wings and tail
    const f = this.flap.step(dt) + (this.mood === 'scared' ? Math.sin(t * 38) * 0.25 : 0);
    b.wing_L.rotation.z = f;
    b.wing_R.rotation.z = -f;
    const fan = clamp(this.fan.step(dt), 0.5, 1.6);
    b.tail.scale.set(fan, fan, 1);
    b.tail.rotation.set(-this.droop.step(dt), 0, this.mood === 'scared' ? Math.sin(t * 46) * 0.12 : Math.sin(t * 1.1) * 0.03);
  }
}
