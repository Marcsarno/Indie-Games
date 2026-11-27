// A cooking station: a kit of models plus a recipe written as a plain async function.
// Every step has a tap path; drags are an optional richer way to do the same step and never required.
// Recipes that are cooked on the island share one work spot: a kit pops in when its dish is picked,
// tucks away if the player switches to another dish, and is cleared when its dish goes to the table.
import * as THREE from 'three';
import { instantiate, node } from '../core/assets';
import { clock, tween, wait, ease, rand } from '../core/tween';
import { arcTo, moveTo } from '../fx/motion';
import { audio } from '../core/audio';
import type { TapInfo, DragInfo } from '../core/input';
import type { StepDef, DemoKind } from './hints';
import type { Game } from './game';

export interface TapStep {
  voice: string;
  target: () => THREE.Object3D;
  demo?: DemoKind;
  hits: string[];                 // hit_* names (without the prefix) that count
  ext?: ('oven' | 'timer')[];     // kitchen things that also count
  need: number;                   // taps to finish the step
  act: (i: number, t: TapInfo | null) => Promise<void> | void;
  gate?: boolean;                 // ignore taps while act() is still running (default true)
  gesture?: 'travel' | 'circle' | 'updown' | 'sideways';   // optional drag that also counts
  centre?: () => THREE.Vector3;   // world point the circle gesture goes round
}

export abstract class Station {
  root: THREE.Object3D;
  started = false;
  done = false;
  active = false;          // the camera is here and taps count
  shown = true;            // the kit is out on the counter
  /** Cooked at the shared island spot (everything except Set the Table). */
  island = true;
  /** Size of the finished dish on the dinner table. */
  tableScale = 0.6;
  /** Table socket for the finished dish (default: the next free numbered slot). */
  slot: string | null = null;
  private finishStep: (() => void) | null = null;
  private cur: StepDef | null = null;
  private cache = new Map<string, THREE.Object3D>();
  private gobblesWorld: THREE.Vector3;
  /** Set while the dish is away at the oven. */
  gobblesAt: THREE.Vector3 | null = null;
  protected top = 0;       // counter height (world y)
  abstract doneVoice: string;
  /** Camera pose name (cam_<pose> in Blender). */
  pose: string;
  /** False for jobs with nothing to carry to the table (Set the Table). */
  flies = true;

  constructor(protected game: Game, public name: string, model: string, socket = 'socket_station_island') {
    const scene = instantiate(model);
    this.pose = name;
    this.root = node(scene, 'station_' + name);
    const at = game.kitchen.socket(socket);
    this.root.position.copy(at);
    this.top = at.y;
    game.stage.scene.add(this.root);
    this.root.updateWorldMatrix(true, true);
    game.stage.readPoses(this.root);
    this.gobblesWorld = this.root.localToWorld(node(this.root, 'socket_gobbles').position.clone());
    const handlers: Record<string, any> = {};
    this.root.traverse((o) => {
      const hn: string | undefined = o.userData.hitName;
      if (!hn) return;
      const short = hn.replace(/^hit_/, '');
      const mesh = o;
      handlers[short] = {
        // a finished job's things stay tappable wherever they ended up; a kit that is tucked away is not
        enabled: () => (this.active || this.done) && inScene(mesh),
        tap: (t: TapInfo) => this.onTap(short, t),
        drag: (d: DragInfo) => this.onDrag(short, d),
      };
    });
    game.stage.input.add(this.root, handlers);
  }

  /** Node by Blender name (cached). */
  it(name: string) {
    let o = this.cache.get(name);
    if (!o) {
      o = node(this.root, name);
      this.cache.set(name, o);
    }
    return o;
  }
  /** Local position of a node. */
  at(name: string) {
    return this.it(name).position.clone();
  }

  get stage() {
    return this.game.stage;
  }
  get gobbles() {
    return this.game.gobbles;
  }
  get fx() {
    return this.game.stage.particles;
  }

  /** Where Gobbles stands while this station is in use (world). */
  gobblesSpot() {
    return (this.gobblesAt ?? this.gobblesWorld).clone();
  }
  get counterY() {
    return this.top;
  }
  /** A step that also listens to kitchen things (the oven, the timer). */
  extStep(o: TapStep) {
    return this.tapStep(o);
  }
  /** Boxes that pick this station in the overview: [size, centre offset from the station root]. */
  pickBoxes(): [THREE.Vector3, THREE.Vector3][] {
    return [];
  }
  /** Voice lines to warm up when the station opens. */
  voices(): string[] {
    return [];
  }

  /** Bring the kit out (pop in) or tuck it away. */
  showKit() {
    if (this.shown) return;
    this.shown = true;
    this.stage.pop(this.root, 1, 0.01);
    audio.pop(0.8);
  }
  hideKit() {
    if (!this.shown) return;
    this.shown = false;
    this.stage.pop(this.root, 0);
  }
  /** Tuck away right now, without the animation (used once at start-up). */
  stow() {
    this.shown = false;
    this.stage.hide(this.root);
  }

  /** World position of a station-local point. */
  world(local: THREE.Vector3) {
    return this.root.localToWorld(local.clone());
  }
  worldOf(o: THREE.Object3D) {
    return o.getWorldPosition(new THREE.Vector3());
  }

  abstract recipe(): Promise<void>;
  /** The node that flies to the table when the dish is done. */
  abstract dish(): THREE.Object3D;
  /** Colour of a serving of this dish. */
  abstract servingColor: number;

  /** Run one step; resolves when a handler calls this.next(). */
  protected step(def: StepDef) {
    this.cur = def;
    if (this.active) this.game.hints.begin(def);
    return new Promise<void>((res) => {
      this.finishStep = () => {
        this.finishStep = null;
        this.cur = null;
        this.game.hints.end();
        res();
      };
    });
  }
  /** The player came back to a dish in progress: say and show the current step again. */
  resume() {
    if (this.cur) this.game.hints.begin(this.cur);
  }
  protected next() {
    this.finishStep?.();
  }
  protected get stepDef() {
    return this.cur;
  }

  /**
   * The common kind of step: tap something `need` times; each tap runs `act(i)`.
   * An optional drag gesture produces the same taps.
   */
  protected async tapStep(o: TapStep) {
    let i = 0, busy = false, finished = false, acc = 0, lastFire = 0, lastA: number | null = null, lastSign = 0;
    const gate = o.gate ?? true;
    const fire = async (t: TapInfo | null) => {
      if (finished || i >= o.need || (gate && busy)) return;
      busy = true;
      const k = i++;
      await o.act(k, t);
      busy = false;
      if (i >= o.need && !finished) {
        finished = true;
        this.next();
      }
    };
    const viaDrag = () => {
      if (clock.real - lastFire < 0.14) return;
      lastFire = clock.real;
      fire(null);
    };
    const drag = (d: DragInfo) => {
      if (d.phase === 'end') {
        lastA = null;
        return;
      }
      if (o.gesture === 'travel') {
        acc += Math.hypot(d.dx, d.dy);
        if (acc > 55) { acc = 0; viaDrag(); }
      } else if (o.gesture === 'updown') {
        if (d.dy > 0) acc += d.dy;
        else if (d.dy < -2) acc = 0;
        if (acc > 34) { acc = 0; viaDrag(); }
      } else if (o.gesture === 'sideways') {
        // back and forth: every change of direction after a decent stroke is one roll
        const sign = Math.sign(d.dx);
        acc += Math.abs(d.dx);
        if (sign !== 0 && sign !== lastSign && acc > 40) { acc = 0; viaDrag(); }
        if (sign !== 0) lastSign = sign;
      } else if (o.gesture === 'circle' && o.centre) {
        const c = this.stage.input.screenOf(o.centre());
        const a = Math.atan2(d.y - c.y, d.x - c.x);
        if (lastA !== null) {
          let da = a - lastA;
          while (da > Math.PI) da -= Math.PI * 2;
          while (da < -Math.PI) da += Math.PI * 2;
          acc += Math.abs(da);
          if (acc > 2.4) { acc = 0; viaDrag(); }
        }
        lastA = a;
      }
    };
    const tap: Record<string, (t: TapInfo) => void> = {};
    const drags: Record<string, (d: DragInfo) => void> = {};
    // while the camera is at the oven the island is in the foreground: a tap that lands on any of the
    // kit's things counts as a tap on the oven
    const names = o.ext?.length ? [...new Set([...o.hits, ...this.ownHits()])] : o.hits;
    for (const h of names) {
      tap[h] = (t) => fire(t);
      if (o.gesture) drags[h] = drag;
    }
    if (o.ext?.includes('oven')) {
      tap.oven = (t) => fire(t);
      this.game.ovenTap = (t) => this.externalTap('oven', t);
    }
    if (o.ext?.includes('timer')) {
      tap.timer = (t) => fire(t);
      this.game.timerTap = (t) => this.externalTap('timer', t);
    }
    await this.step({ voice: o.voice, target: o.target, demo: o.demo ?? 'tap', tap, drag: drags });
    if (o.ext?.includes('oven')) this.game.ovenTap = null;
    if (o.ext?.includes('timer')) this.game.timerTap = null;
  }

  private ownHits() {
    const out: string[] = [];
    const scan = (r: THREE.Object3D) => r.traverse((c) => { if (c.userData.hitName) out.push(String(c.userData.hitName).replace(/^hit_/, '')); });
    scan(this.root);
    return out;
  }

  /** A tap on something outside the kit (the oven) that the current step may care about. */
  externalTap(name: string, t: TapInfo) {
    if (!this.active) return;
    const h = this.cur?.tap[name];
    if (h) {
      this.game.hints.activity();
      h(t);
    }
  }

  /**
   * Clean-up, after the cooking and before the dish goes to the table: the tools go into the sink
   * a few at a time, then a sponge wipes the spills off the counter.
   */
  async cleanup() {
    const st = this.stage, dish = this.dish();
    const hasMesh = (o: THREE.Object3D) => {
      let m = false;
      o.traverse((c) => { if ((c as THREE.Mesh).isMesh && !c.userData.hitName) m = true; });
      return m;
    };
    const items = this.root.children.filter((c) => c !== dish && c.visible && c.scale.x > 0.05 && !/^(cam_|socket_|hit_)/.test(c.name) && hasMesh(c));
    const hits: string[] = ['counter'];
    this.root.traverse((o) => { if (o.userData.hitName) hits.push(String(o.userData.hitName).replace(/^hit_/, '')); });
    // one big tap area over the whole counter
    const box = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.5, 1.3), new THREE.MeshBasicMaterial({ visible: false }));
    box.position.set(0, 0.2, 0);
    this.root.add(box);
    st.input.addMesh(box, 'counter', { enabled: () => this.active, tap: (t) => this.onTap('counter', t), drag: (d) => this.onDrag('counter', d) });
    const sinkWorld = this.game.kitchen.socket('socket_sink');
    const sink = this.root.worldToLocal(sinkWorld.clone());
    const groups: THREE.Object3D[][] = [];
    const n = Math.min(4, items.length);
    items.forEach((it, i) => (groups[i % n] ??= []).push(it));
    if (n > 0) {
      await this.tapStep({
        voice: 'clean_tools',
        target: () => groups.flat().find((o) => o.visible && o.scale.x > 0.05) ?? dish,
        hits,
        need: n,
        gate: false,
        act: async (i) => {
          audio.whoosh();
          groups[i].forEach((it, j) => {
            st.dropShadow(it);
            wait(j * 0.08).then(() => arcTo(it, sink, 0.9, 0.6, { spin: new THREE.Vector3(rand(-4, 4), rand(-4, 4), rand(-4, 4)), e: ease.inOut })).then(() => {
              st.hide(it);
              audio.clink(0.6 + Math.random() * 0.6);
              audio.bubble();
              st.particles.burst('bubble', sinkWorld, { count: 4, color: [0xcfeef0, 0xffffff, 0x9fd4cb], size: 0.08 });
            });
          });
          audio.note(i, 0.2);
          await wait(0.25);
        },
      });
      await wait(0.7);
    }
    // spills and the sponge
    const spotMat = new THREE.MeshLambertMaterial({ color: this.servingColor });
    const spots = [new THREE.Vector3(-0.55, 0.012, 0.2), new THREE.Vector3(0.1, 0.012, 0.36), new THREE.Vector3(0.62, 0.012, 0.08)].map((p) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 8), spotMat);
      m.scale.set(1 + Math.random() * 0.5, 0.08, 0.8 + Math.random() * 0.4);
      m.position.copy(p);
      m.raycast = () => {};
      this.root.add(m);
      return m;
    });
    const sponge = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.07, 0.15), new THREE.MeshLambertMaterial({ color: 0xf6d58e }));
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.025, 0.15), new THREE.MeshLambertMaterial({ color: 0x4f7a5a }));
    top.position.y = 0.047;
    body.raycast = top.raycast = () => {};
    sponge.add(body, top);
    sponge.position.set(-0.9, 0.3, 0.45);
    this.root.add(sponge);
    st.pop(sponge, 1, 0.01);
    audio.pop(1.2);
    await this.tapStep({
      voice: 'clean_wipe',
      target: () => sponge,
      demo: 'swipe',
      hits,
      need: spots.length,
      gesture: 'travel',
      act: async (i) => {
        const p = spots[i].position;
        await moveTo(sponge, new THREE.Vector3(p.x, 0.06, p.z), 0.18);
        audio.noise({ type: 'bandpass', freq: 1500, to: 2600, dur: 0.3, vol: 0.14, q: 3 });
        const s0 = spots[i].scale.clone();
        await tween(0.42, (q) => {
          sponge.position.x = p.x + Math.sin(q * Math.PI * 5) * 0.09;
          spots[i].scale.copy(s0).multiplyScalar(Math.max(0.001, 1 - q));
        }, ease.linear);
        spots[i].visible = false;
        audio.note(i * 2, 0.22);
        st.particles.burst('spark', this.world(p).add(new THREE.Vector3(0, 0.08, 0)), { count: 6, size: 0.05, color: [0xffffff, 0xcfeef0, 0xffd27a] });
        st.particles.burst('bubble', this.world(p), { count: 3, color: [0xffffff, 0xcfeef0], size: 0.05 });
      },
    });
    st.pop(sponge, 0);
    this.root.remove(box);
    st.input.remove(box);
    audio.say('clean_done');
    audio.sparkle();
    this.gobbles.cheer();
    await wait(1.1);
  }

  private onTap(name: string, t: TapInfo) {
    this.gobbles.look(t.point);
    const h = this.active ? this.cur?.tap[name] : undefined;
    if (h) {
      this.game.hints.activity();
      h(t);
    } else {
      this.idleReact(name, t);
    }
  }
  private onDrag(name: string, d: DragInfo) {
    const h = this.active ? this.cur?.drag?.[name] : undefined;
    if (h) {
      this.game.hints.activity();
      h(d);
    }
  }

  /** A tap on something that is not part of the current step still does something funny. */
  protected idleReact(name: string, t: TapInfo) {
    let o: THREE.Object3D | undefined;
    const find = (r: THREE.Object3D) => r.traverse((c) => {
      if (c.userData.hitName === 'hit_' + name) o = c;
    });
    find(this.root);
    if (!o) find(this.dish());
    const target = o?.parent?.name.startsWith('hit_') ? o.parent.parent : o?.parent;
    if (target && target !== this.root) this.stage.squash(target, -3);
    audio.boing(0.9 + Math.random() * 0.4);
    this.fx.burst('spark', t.point, { count: 3, size: 0.03, color: 0xfff4e0 });
  }
}

/** True if nothing above this object is hidden. */
function inScene(o: THREE.Object3D) {
  for (let p: THREE.Object3D | null = o; p; p = p.parent) if (!p.visible) return false;
  return true;
}
