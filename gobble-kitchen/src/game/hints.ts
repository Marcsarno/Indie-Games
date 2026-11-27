// Instructions: narrator voice plus Gobbles' demo wing, every time. A glow alone does not teach a gesture.
// When the player goes quiet the hints escalate calmly: the target bobs (~5 s), the voice repeats (~10 s),
// the demo wing comes back (~15 s). Then the cycle starts over.
import * as THREE from 'three';
import { part } from '../core/assets';
import { clock, tween, wait, ease } from '../core/tween';
import { audio } from '../core/audio';
import { topOf } from '../fx/motion';
import type { Stage } from '../core/stage';
import type { TapInfo, DragInfo } from '../core/input';

export type DemoKind = 'tap' | 'updown' | 'circle' | 'swipe' | 'none';

export interface StepDef {
  voice: string;
  target: () => THREE.Object3D;
  demo: DemoKind;
  tap: Record<string, (t: TapInfo) => void>;
  drag?: Record<string, (d: DragInfo) => void>;
  /** Extra nudge when the player has been idle for a few seconds (the picture menu pulses). */
  onBob?: () => void;
}

export const HINT = { bob: 5, voice: 10, demo: 15 }; // seconds idle (plan: tune)

export class Hints {
  private wing: THREE.Object3D;
  private cur: StepDef | null = null;
  private idle = 0;
  private fired = 0;
  private demoToken = 0;
  paused = false;
  onSpeak: (seconds: number) => void = () => {};
  /** Told which gesture the new step uses (null when a step ends). */
  onStep: (demo: DemoKind | null) => void = () => {};

  constructor(private stage: Stage) {
    this.wing = part('gobbles', 'demo_wing');
    this.wing.visible = false;
    this.wing.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) m.renderOrder = 5;
    });
    stage.scene.add(this.wing);
  }

  get step() {
    return this.cur;
  }

  begin(def: StepDef) {
    this.cur = def;
    this.idle = 0;
    this.fired = 0;
    this.onStep(def.demo);
    this.say();
    wait(0.45).then(() => {
      if (this.cur === def && !this.paused) this.demo();
    });
  }

  end() {
    this.cur = null;
    this.onStep(null);
    this.hideWing();
  }

  /** The player did something useful: reset the idle clock. */
  activity() {
    this.idle = 0;
    this.fired = 0;
    this.hideWing();
  }

  async say() {
    if (!this.cur) return;
    const d = await audio.say(this.cur.voice);
    this.onSpeak(d);
  }

  /** Replay the current instruction (tapping Gobbles does this). */
  replay() {
    if (!this.cur) return false;
    this.say();
    this.demo();
    this.idle = 0;
    this.fired = 0;
    return true;
  }

  private hideWing() {
    this.demoToken++;
    if (this.wing.visible) this.stage.pop(this.wing, 0);
  }

  async demo(target?: THREE.Object3D, kind?: DemoKind) {
    const t = target ?? this.cur?.target();
    const k = kind ?? this.cur?.demo ?? 'tap';
    if (!t || k === 'none') return;
    const token = ++this.demoToken;
    const top = topOf(t);
    const s = Math.min(2.5, Math.max(1, this.stage.pose.fitW / 2.4));
    this.stage.setBaseScale(this.wing, s);
    this.wing.rotation.set(0.25, 0, -0.35);
    const base = top.clone().add(new THREE.Vector3(0, 0.005, 0.02 * s));
    const lift = 0.16 * s;
    this.wing.position.copy(base).add(new THREE.Vector3(0, lift, 0));
    this.stage.pop(this.wing, 1, 0.01);
    await wait(0.3);
    const alive = () => token === this.demoToken;
    if (k === 'tap' || k === 'updown') {
      const amp = k === 'updown' ? lift * 1.5 : lift;
      for (let i = 0; i < (k === 'updown' ? 3 : 2) && alive(); i++) {
        await tween(0.16, (q) => (this.wing.position.y = base.y + amp * (1 - q)), ease.in);
        if (!alive()) break;
        this.stage.particles.burst('spark', base, { count: 3, size: 0.03 * s, speed: 0.5 * s, color: 0xfff4e0 });
        await tween(0.26, (q) => (this.wing.position.y = base.y + amp * q), ease.out);
        await wait(0.1);
      }
    } else if (k === 'circle') {
      const r = 0.1 * s;
      await tween(0.15, (q) => (this.wing.position.y = base.y + lift * (1 - q) + 0.03 * s), ease.in);
      await tween(1.5, (q) => {
        if (!alive()) return;
        const a = q * Math.PI * 4;
        this.wing.position.set(base.x + Math.sin(a) * r, base.y + 0.03 * s, base.z + Math.cos(a) * r);
      }, ease.linear);
    } else {
      const r = 0.13 * s;
      await tween(0.15, (q) => (this.wing.position.y = base.y + lift * (1 - q)), ease.in);
      await tween(1.2, (q) => {
        if (!alive()) return;
        this.wing.position.x = base.x + Math.sin(q * Math.PI * 4) * r;
      }, ease.linear);
    }
    if (alive()) this.stage.pop(this.wing, 0);
  }

  update(dt: number) {
    if (!this.cur || this.paused) return;
    if (audio.ctx && audio.ctx.currentTime < audio.voiceBusyUntil) return; // do not count while the narrator talks
    this.idle += dt;
    if (this.fired < 1 && this.idle > HINT.bob) {
      this.fired = 1;
      this.cur.onBob?.();
      const t = this.cur.target();
      this.stage.squash(t, 3);
      audio.pop(1.4, 0.08);
      this.stage.particles.burst('spark', topOf(t), { count: 4, size: 0.04, color: 0xffd27a });
    } else if (this.fired < 2 && this.idle > HINT.voice) {
      this.fired = 2;
      this.say();
    } else if (this.fired < 3 && this.idle > HINT.demo) {
      this.fired = 0;
      this.idle = 0;
      this.demo();
    }
  }
}
