// The oven as a shared cooking tool. A recipe carries its dish over, the player taps the oven, the door
// drops open like a shelf (and Gobbles panics into a disguise, every time), and the dish bakes or toasts.
import * as THREE from 'three';
import { clock, ease, wait } from '../core/tween';
import { audio } from '../core/audio';
import { arcTo, moveTo } from '../fx/motion';
import type { Station } from './station';
import type { Game } from './game';

export class Oven {
  private homes = new Map<THREE.Object3D, { parent: THREE.Object3D; pos: THREE.Vector3; quat: THREE.Quaternion; pose: string }>();
  constructor(private game: Game) {}

  private get shelf() {
    return this.game.kitchen.socket('socket_oven_shelf');
  }

  /** Camera and dish go to the oven. Resolves once the player has tapped it and the dish sits on the open door. */
  async load(s: Station, dish: THREE.Object3D, voice: string, hits: string[]) {
    const { stage: st, kitchen: k, gobbles } = this.game;
    this.homes.set(dish, { parent: dish.parent!, pos: dish.position.clone(), quat: dish.quaternion.clone(), pose: s.pose });
    st.scene.attach(dish);
    const shelf = this.shelf;
    const hover = shelf.clone().add(new THREE.Vector3(0.3, 0.8, 0.45));
    s.pose = 'oven';
    s.gobblesAt = k.socket('socket_gobbles_oven');
    this.game.hud.showHome(false);
    st.fly('oven', 0.8);
    this.game.sendGobbles(s.gobblesAt);
    audio.whoosh();
    await arcTo(dish, hover, 0.5, 0.8);
    const stop = clock.onFrame(() => (dish.position.y = hover.y + Math.sin(clock.time * 3) * 0.03));
    await s.ovenStep(voice, hits);
    stop();
    st.setShadowGround(dish, shelf.y - 0.01);
    await k.setOvenDoor(1, 0.4);
    k.setOvenGlow(1);
    gobbles.panic().then((name) => {
      if (name) this.game.secret(name, gobbles.headWorld);
    });
    st.particles.burst('puff', k.socket('socket_oven'), { count: 6, color: 0xffd9a8, size: 0.12, dir: new THREE.Vector3(0, 0.2, 0.5) });
    await arcTo(dish, shelf, 0.3, 0.45);
    st.squash(dish, -4);
    audio.clink(0.6);
  }

  /** Push the dish inside and shut the door. */
  async slideIn(dish: THREE.Object3D) {
    const k = this.game.kitchen;
    await moveTo(dish, k.socket('socket_oven_in'), 0.35, ease.in);
    dish.visible = false;
    await k.setOvenDoor(0, 0.3);
  }

  /** Open up and pull the dish back out onto the door, steaming. */
  async slideOut(dish: THREE.Object3D, ding = true) {
    const { stage: st, kitchen: k } = this.game;
    await k.setOvenDoor(1, 0.35);
    dish.visible = true;
    await moveTo(dish, this.shelf, 0.4, ease.out);
    st.squash(dish, 3);
    if (ding) audio.ding();
    this.steam(dish);
  }

  steam(dish: THREE.Object3D, n = 10) {
    const at = dish.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.25, 0));
    this.game.stage.particles.burst('puff', at, { count: n, color: 0xfffaf0, size: 0.11, up: 0.7, spread: 0.2 });
    audio.steam();
  }

  /** One pulse of heat while the door is open (toasting). */
  heat(dish: THREE.Object3D) {
    const { stage: st, kitchen: k } = this.game;
    st.squash(k.n('oven_door'), -1.5);
    audio.noise({ type: 'bandpass', freq: 900, to: 2600, dur: 0.35, vol: 0.2, attack: 0.05 });
    audio.tone({ freq: 140, to: 220, dur: 0.3, vol: 0.2, type: 'sawtooth', lp: 500 });
    st.particles.burst('spark', dish.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.2, 0)), { count: 8, color: [0xffa24a, 0xffd27a, 0xe8833a], size: 0.06, up: 0.9 });
    st.particles.burst('puff', k.socket('socket_oven'), { count: 3, color: 0xffd9a8, size: 0.1, dir: new THREE.Vector3(0, 0.3, 0.4) });
  }

  private shut() {
    const k = this.game.kitchen;
    k.setOvenGlow(0, 0.6);
    k.setOvenDoor(0, 0.35);
    const from = k.needle;
    clock.tween(0.6, (q) => k.setNeedle(from * (1 - q)));
  }

  /** Carry the dish back to its place on the counter, camera and Gobbles too. */
  async unload(s: Station, dish: THREE.Object3D) {
    const { stage: st } = this.game;
    const home = this.homes.get(dish)!;
    this.homes.delete(dish);
    s.pose = home.pose;
    s.gobblesAt = null;
    st.fly(s.pose, 0.85);
    this.game.sendGobbles(s.gobblesSpot());
    home.parent.attach(dish);
    audio.whoosh();
    wait(0.25).then(() => this.shut());
    await arcTo(dish, home.pos, 0.6, 0.85, { quat: home.quat });
    st.setShadowGround(dish, s.counterY);
    st.squash(dish, -4);
    audio.clink(0.6);
    this.game.hud.showHome(true);
  }

  /** The dish is finished here and will fly to the table from the oven door. */
  release(s: Station, dish: THREE.Object3D) {
    const home = this.homes.get(dish);
    if (home) s.pose = home.pose;
    this.homes.delete(dish);
    s.gobblesAt = null;
    wait(1.6).then(() => this.shut());
  }
}
