// Set the Table: plates, then forks, fly from the serving cart to the next glowing outline (tap), or can be
// carried to any outline (drag, magnetic snap, a miss floats back). Then the name cards: each shows a guest's
// face and name and lands at their seat.
import * as THREE from 'three';
import { Station } from '../station';
import { part, meshOf } from '../../core/assets';
import { clock, tween, wait, ease, lerp, rand } from '../../core/tween';
import { audio } from '../../core/audio';
import { arcTo } from '../../fx/motion';
import type { DragInfo } from '../../core/input';
import type { Game } from '../game';

const SEATS = 6;
const TABLE_Y = 0.8;

export class TableStation extends Station {
  doneVoice = 'table_done';
  servingColor = 0xffffff;
  private ring: THREE.Object3D;
  private filled: Record<string, boolean[]> = { plate: Array(SEATS).fill(false), fork: Array(SEATS).fill(false), card: Array(SEATS).fill(false) };
  private ringAt: THREE.Vector3 | null = null;

  constructor(game: Game) {
    super(game, 'table', 'table', 'socket_station_table');
    this.pose = 'settable';
    this.flies = false;
    this.island = false;
    this.ring = part('props', 'slot_ring');
    game.stage.scene.add(this.ring);
    game.stage.hide(this.ring);
    clock.onFrame(() => {
      if (!this.ring.visible || !this.ringAt) return;
      this.ring.position.copy(this.ringAt);
      this.ring.position.y += 0.01 + Math.abs(Math.sin(clock.real * 3)) * 0.02;
      this.ring.rotation.y = clock.real;
      (meshOf(this.ring).material as THREE.MeshBasicMaterial).color.setHSL(0.11, 1, 0.62 + Math.sin(clock.real * 6) * 0.1);
    });
    // portraits on the name cards (card i belongs to seat i)
    for (let i = 0; i < SEATS; i++) {
      const canvas = game.portraitForSeat(i);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      const face = new THREE.Mesh(new THREE.PlaneGeometry(0.235, 0.29), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
      face.raycast = () => {};
      this.it(`card_${i}_face`).add(face);
    }
    game.stage.shadow(this.it('cart'), 0.55, 0);
  }

  dish() {
    return this.it('cart');
  }
  gobblesSpot() {
    return this.game.kitchen.socket('socket_gobbles_table');
  }
  pickBoxes(): [THREE.Vector3, THREE.Vector3][] {
    const table = this.game.kitchen.socket('socket_table_centre').sub(this.root.position);
    return [
      [new THREE.Vector3(1.5, 1.3, 0.8), new THREE.Vector3(0, 0.65, 0)],
      [new THREE.Vector3(3.1, 0.5, 1.3), new THREE.Vector3(table.x, TABLE_Y + 0.1, table.z - 0.15)],
    ];
  }
  voices() {
    return ['table_forks', 'table_cards', 'table_done'];
  }

  async recipe() {
    await this.place('plate', 'plates', 'table_set', 0.19, (i) => audio.clink(0.55 + i * 0.03));
    await this.place('fork', 'forks', 'table_forks', 0.1, (i) => audio.clink(1.25 + i * 0.05));
    await this.cards();
    this.stage.pop(this.ring, 0);
  }

  private showRing(at: THREE.Vector3 | null, size: number) {
    this.ringAt = at;
    if (!at) {
      this.stage.pop(this.ring, 0);
      return;
    }
    this.stage.setBaseScale(this.ring, size / 0.2);
    this.stage.pop(this.ring, 1, 0.01);
  }

  /** Dinner was called before the table was set: everything left on the cart pops into place by itself. */
  async finishNow() {
    if (this.done) return;
    const st = this.stage;
    const kitchen = this.game.kitchen;
    this.done = true;
    this.active = false;
    this.showRing(null, 0.1);
    let n = 0;
    for (const kind of ['plate', 'fork', 'card'] as const) {
      const waiting: THREE.Object3D[] = [];
      for (let i = 0; i < SEATS; i++) {
        const o = this.it(`${kind}_${i}`);
        if (kind === 'card' ? !this.filled.card[i] : o.parent === this.root) waiting.push(o);
      }
      for (let slot = 0; slot < SEATS; slot++) {
        if (this.filled[kind][slot]) continue;
        const o = kind === 'card' ? this.it('card_' + slot) : waiting.shift();
        if (!o) continue;
        this.filled[kind][slot] = true;
        st.scene.attach(o);
        o.position.copy(kitchen.socket(`socket_${kind}_${slot}`));
        o.quaternion.setFromEuler(new THREE.Euler(kind === 'card' ? -0.2 : 0, kind === 'card' ? 0 : kitchen.socketYaw(`socket_${kind}_${slot}`), 0));
        st.pop(o, 1, 0.01);
        if (n++ % 3 === 0) audio.pop(0.9 + n * 0.03, 0.15);
        await wait(0.05);
      }
    }
    audio.jingle();
  }

  // ------------------------------------------------------------------ plates and forks
  private async place(kind: 'plate' | 'fork', hit: string, voice: string, size: number, sound: (i: number) => void) {
    const st = this.stage;
    const kitchen = this.game.kitchen;
    const slots = Array.from({ length: SEATS }, (_, i) => ({ pos: kitchen.socket(`socket_${kind}_${i}`), yaw: kitchen.socketYaw(`socket_${kind}_${i}`), free: true }));
    const items = Array.from({ length: SEATS }, (_, i) => this.it(`${kind}_${i}`));
    const homes = items.map((o) => ({ pos: o.position.clone(), quat: o.quaternion.clone() }));
    let next = 0, placed = 0, finished = false;
    let carry: { o: THREE.Object3D; i: number } | null = null;
    let dragging = false;
    const flat = (yaw: number) => new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0));
    const nextSlot = () => slots.findIndex((s) => s.free);
    const mark = () => {
      const n = nextSlot();
      this.showRing(n >= 0 ? slots[n].pos : null, size);
    };
    const land = async (o: THREE.Object3D, slot: number, height: number) => {
      slots[slot].free = false;
      this.filled[kind][slot] = true;
      placed++;
      mark();
      st.scene.attach(o);
      audio.whoosh();
      await arcTo(o, slots[slot].pos, height, 0.42, { quat: flat(slots[slot].yaw) });
      st.squash(o, -5);
      sound(placed);
      audio.note(placed - 1, 0.22);
      st.particles.burst('spark', slots[slot].pos, { count: 4, size: 0.04, color: [0xffd27a, 0xffffff] });
      if (placed === 3) this.gobbles.bounce(3);
      if (placed >= SEATS && !finished) {
        finished = true;
        await wait(0.25);
        this.next();
      }
    };
    const send = () => {
      if (next >= SEATS) return;
      const slot = nextSlot();
      if (slot < 0) return;
      const o = items[next++];
      land(o, slot, 0.7);
    };
    mark();
    const tap = () => {
      if (next < SEATS) st.squash(items[next], 3);
      // a tap sends the next one; if the finger starts to drag instead, it is carried
      wait(0.15).then(() => {
        if (!dragging) send();
      });
    };
    const drag = (d: DragInfo) => {
      if (d.phase === 'move') {
        if (!carry) {
          if (next >= SEATS) return;
          dragging = true;
          carry = { o: items[next], i: next };
          next++;
          st.scene.attach(carry.o);
          carry.o.quaternion.copy(flat(0));
        }
        const p = st.input.pointOnPlane(d.x, d.y, TABLE_Y + 0.25);
        if (p) carry.o.position.copy(p);
        return;
      }
      dragging = false;
      if (!carry) return;
      const c = carry;
      carry = null;
      // magnetic: any free outline within reach takes it; a miss floats back with a boing
      let best = -1, bestD = 0.6;
      slots.forEach((s, i) => {
        const dist = Math.hypot(s.pos.x - c.o.position.x, s.pos.z - c.o.position.z);
        if (s.free && dist < bestD) {
          best = i;
          bestD = dist;
        }
      });
      if (best >= 0) land(c.o, best, 0.12);
      else {
        audio.boing();
        next = c.i;
        this.root.attach(c.o);
        arcTo(c.o, homes[c.i].pos, 0.4, 0.45, { quat: homes[c.i].quat }).then(() => st.squash(c.o, -3));
      }
    };
    const taps: Record<string, () => void> = { plates: tap, forks: tap, cards: tap };
    await this.step({
      voice,
      target: () => (next < SEATS ? items[next] : items[SEATS - 1]),
      demo: 'tap',
      tap: taps,
      drag: { [hit]: drag },
    });
    this.gobbles.cheer();
    await wait(0.5);
  }

  // ------------------------------------------------------------------ name cards
  private async cards() {
    const st = this.stage;
    const kitchen = this.game.kitchen;
    let next = 0, busy = false;
    const upright = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.2, 0, 0));
    const mark = () => this.showRing(next < SEATS ? kitchen.socket(`socket_card_${next}`) : null, 0.13);
    mark();
    const tap = async () => {
      if (busy || next >= SEATS) return;
      busy = true;
      const i = next++;
      this.filled.card[i] = true;
      const card = this.it('card_' + i);
      const slot = kitchen.socket(`socket_card_${i}`);
      mark();
      // show whose card it is, big, then send it to their seat
      this.game.revealCard(i);
      st.squash(card, 3);
      st.scene.attach(card);
      const up = card.position.clone().add(new THREE.Vector3(0, 0.5, 0.2));
      await arcTo(card, up, 0.1, 0.25, { spin: new THREE.Vector3(0, Math.PI * 2, 0) });
      await wait(0.55);
      audio.whoosh();
      await arcTo(card, slot, 0.5, 0.45, { quat: upright });
      st.squash(card, -5);
      audio.pop(1.1 + i * 0.08);
      audio.note(i, 0.22);
      st.particles.burst('spark', slot.clone().add(new THREE.Vector3(0, 0.2, 0)), { count: 5, size: 0.05, color: [0xffd27a, 0xffffff, 0xe8833a] });
      busy = false;
      if (next >= SEATS) {
        await wait(0.3);
        this.next();
      }
    };
    await this.step({
      voice: 'table_cards',
      target: () => this.it('card_' + Math.min(next, SEATS - 1)),
      demo: 'tap',
      tap: { cards: tap, plates: tap, forks: tap },
    });
  }
}
