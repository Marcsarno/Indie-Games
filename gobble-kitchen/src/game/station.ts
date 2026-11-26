// A cooking station: a model placed on the counter plus a recipe written as a plain async function.
// Every step has a tap path; drags are an optional richer way to do the same step and never required.
import * as THREE from 'three';
import { instantiate, node } from '../core/assets';
import { audio } from '../core/audio';
import type { TapInfo, DragInfo } from '../core/input';
import type { StepDef } from './hints';
import type { Game } from './game';

export abstract class Station {
  root: THREE.Object3D;
  started = false;
  done = false;
  active = false;          // the camera is here and taps count
  private finishStep: (() => void) | null = null;
  private cur: StepDef | null = null;
  private cache = new Map<string, THREE.Object3D>();
  protected top = 0;       // counter height (world y)
  abstract doneVoice: string;
  /** Camera pose name (cam_<pose> in Blender). */
  pose: string;
  /** False for jobs with nothing to carry to the table (Set the Table). */
  flies = true;

  constructor(protected game: Game, public name: string, model: string) {
    const scene = instantiate(model);
    this.pose = name;
    this.root = node(scene, 'station_' + name);
    const socket = game.kitchen.socket('socket_station_' + name);
    this.root.position.copy(socket);
    this.top = socket.y;
    game.stage.scene.add(this.root);
    this.root.updateWorldMatrix(true, true);
    game.stage.readPoses(this.root);
    const handlers: Record<string, any> = {};
    this.root.traverse((o) => {
      const hn: string | undefined = o.userData.hitName;
      if (!hn) return;
      const short = hn.replace(/^hit_/, '');
      handlers[short] = {
        // a finished job's things stay tappable (they wobble and boing), wherever they ended up
        enabled: () => this.active || this.done,
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

  /** Local position of a socket empty. */
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
    return this.root.localToWorld(this.at('socket_gobbles'));
  }
  /** Boxes that pick this station in the overview: [size, centre offset from the station root]. */
  pickBoxes(): [THREE.Vector3, THREE.Vector3][] {
    return [[new THREE.Vector3(1.75, 0.8, 1.3), new THREE.Vector3(0, 0.3, 0)]];
  }
  /** Height of the bobbing arrow above the station root. */
  arrowHeight() {
    return 1.1;
  }
  /** Voice lines to warm up when the station opens. */
  voices(): string[] {
    return [];
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

  private onTap(name: string, t: TapInfo) {
    this.gobbles.look(t.point);
    const h = this.cur?.tap[name];
    if (h) {
      this.game.hints.activity();
      h(t);
    } else {
      this.idleReact(name, t);
    }
  }
  private onDrag(name: string, d: DragInfo) {
    const h = this.cur?.drag?.[name];
    if (h) {
      this.game.hints.activity();
      h(d);
    }
  }

  /** A tap on something that is not part of the current step still does something funny. */
  protected idleReact(name: string, t: TapInfo) {
    let o: THREE.Object3D | undefined;
    this.root.traverse((c) => {
      if (c.userData.hitName === 'hit_' + name) o = c;
    });
    const target = o?.parent?.name.startsWith('hit_') ? o.parent.parent : o?.parent;
    if (target && target !== this.root) this.stage.squash(target, -3);
    audio.boing(0.9 + Math.random() * 0.4);
    this.fx.burst('spark', t.point, { count: 3, size: 0.03, color: 0xfff4e0 });
  }
}
