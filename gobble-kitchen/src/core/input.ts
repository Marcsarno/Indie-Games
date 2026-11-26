// Pointer input for small hands. A tap acts the moment the finger lands (response inside 100 ms);
// if the finger then drifts past the tolerance it becomes an optional drag gesture for the same target.
// Every pointer is tracked on its own so two kids can poke at once.
import * as THREE from 'three';

export interface TapInfo {
  name: string;               // hit_* name without the prefix
  point: THREE.Vector3;       // world point on the tap target
  x: number;                  // screen px
  y: number;
}
export interface DragInfo {
  name: string;
  x: number;
  y: number;
  dx: number;                 // since the last move, px
  dy: number;
  startX: number;
  startY: number;
  phase: 'move' | 'end';
}
export interface HitHandler {
  enabled?: () => boolean;
  tap: (t: TapInfo) => void;
  drag?: (d: DragInfo) => void;
}

export const TUNE = {
  tapSlop: 12,        // px a tap may drift and still be only a tap (plan: 10-15, tune)
  holdover: 110,      // ms: a second touch this soon on the same thing is an accidental repeat (plan: ~150, tune)
};

interface Active {
  name: string;
  handler: HitHandler;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  dragging: boolean;
}

export class Input {
  private targets: { mesh: THREE.Mesh; name: string; handler: HitHandler }[] = [];
  private active = new Map<number, Active>();
  private lastTap = new Map<string, number>();
  private ray = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  /** Called for taps that land on nothing interactive: (world point or null, screen x, y). */
  onPoke: (p: THREE.Vector3 | null, x: number, y: number) => void = () => {};
  /** Called on every pointer move/down with the pointer's ray hit on the scene (Gobbles watches the finger). */
  onPointer: (x: number, y: number) => void = () => {};
  pokeMeshes: THREE.Object3D[] = [];
  locked = false;

  constructor(private el: HTMLElement, private camera: THREE.PerspectiveCamera, private view: { width: number; height: number; toGame(x: number, y: number): { x: number; y: number } }) {
    el.addEventListener('pointerdown', this.down, { passive: false });
    el.addEventListener('pointermove', this.move, { passive: false });
    el.addEventListener('pointerup', this.up);
    el.addEventListener('pointercancel', this.up);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /** Register every hit_* mesh under `root` whose name is a key of `handlers` (without the hit_ prefix). */
  add(root: THREE.Object3D, handlers: Record<string, HitHandler>) {
    root.traverse((o) => {
      const hn: string | undefined = o.userData.hitName;
      if (!hn) return;
      const short = hn.replace(/^hit_/, '');
      const h = handlers[short];
      if (h) this.targets.push({ mesh: o as THREE.Mesh, name: short, handler: h });
    });
  }

  addMesh(mesh: THREE.Mesh, name: string, handler: HitHandler) {
    this.targets.push({ mesh, name, handler });
  }

  remove(root: THREE.Object3D) {
    const set = new Set<THREE.Object3D>();
    root.traverse((o) => set.add(o));
    this.targets = this.targets.filter((t) => !set.has(t.mesh));
  }

  clear() {
    this.targets = [];
    this.active.clear();
  }

  /** x, y are game px (see Stage.toGame). */
  private setRay(x: number, y: number) {
    this.ndc.set((x / this.view.width) * 2 - 1, -(y / this.view.height) * 2 + 1);
    this.ray.setFromCamera(this.ndc, this.camera);
  }

  /** World point under a screen position on the plane y = h. */
  pointOnPlane(x: number, y: number, h: number, out = new THREE.Vector3()) {
    this.setRay(x, y);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -h);
    return this.ray.ray.intersectPlane(plane, out);
  }

  screenOf(world: THREE.Vector3) {
    const v = world.clone().project(this.camera);
    return { x: ((v.x + 1) / 2) * this.view.width, y: ((1 - v.y) / 2) * this.view.height };
  }

  private down = (e: PointerEvent) => {
    e.preventDefault();
    const g = this.view.toGame(e.clientX, e.clientY);
    this.onPointer(g.x, g.y);
    if (this.locked) return;
    this.setRay(g.x, g.y);
    const live = this.targets.filter((t) => (t.handler.enabled ? t.handler.enabled() : true));
    const hits = this.ray.intersectObjects(live.map((t) => t.mesh), false);
    if (!hits.length) {
      const p = this.pokeMeshes.length ? this.ray.intersectObjects(this.pokeMeshes, true).find((h) => !h.object.userData.hitName && !h.object.userData.isOutline) : undefined;
      this.onPoke(p ? p.point : null, g.x, g.y);
      return;
    }
    const t = live.find((t) => t.mesh === hits[0].object)!;
    const now = performance.now();
    const last = this.lastTap.get(t.name) ?? -1e9;
    this.active.set(e.pointerId, { name: t.name, handler: t.handler, startX: g.x, startY: g.y, lastX: g.x, lastY: g.y, dragging: false });
    try { this.el.setPointerCapture(e.pointerId); } catch { /* not all pointers can be captured */ }
    if (now - last < TUNE.holdover) return; // accidental repeat
    this.lastTap.set(t.name, now);
    t.handler.tap({ name: t.name, point: hits[0].point.clone(), x: g.x, y: g.y });
  };

  private move = (e: PointerEvent) => {
    const g = this.view.toGame(e.clientX, e.clientY);
    this.onPointer(g.x, g.y);
    const a = this.active.get(e.pointerId);
    if (!a) return;
    e.preventDefault();
    if (!a.dragging && Math.hypot(g.x - a.startX, g.y - a.startY) > TUNE.tapSlop) a.dragging = true;
    if (a.dragging && a.handler.drag && !this.locked) {
      a.handler.drag({ name: a.name, x: g.x, y: g.y, dx: g.x - a.lastX, dy: g.y - a.lastY, startX: a.startX, startY: a.startY, phase: 'move' });
    }
    a.lastX = g.x;
    a.lastY = g.y;
  };

  private up = (e: PointerEvent) => {
    const a = this.active.get(e.pointerId);
    if (!a) return;
    if (a.dragging && a.handler.drag) a.handler.drag({ name: a.name, x: a.lastX, y: a.lastY, dx: 0, dy: 0, startX: a.startX, startY: a.startY, phase: 'end' });
    this.active.delete(e.pointerId);
  };
}
