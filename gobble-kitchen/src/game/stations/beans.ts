// Green Beans: tap the pile and the next bean snaps in two with a recoil (a swipe across them works too),
// then sprinkle crispy onions on top.
import * as THREE from 'three';
import { Station } from '../station';
import { tween, wait, ease, rand } from '../../core/tween';
import { audio } from '../../core/audio';
import { arcTo } from '../../fx/motion';
import type { Game } from '../game';

const BEANS = 6;

export class BeansStation extends Station {
  doneVoice = 'beans_done';
  servingColor = 0x6fa24a;

  constructor(game: Game) {
    super(game, 'beans', 'beans');
    for (let k = 0; k < BEANS * 2; k++) this.stage.hide(this.it('pile_' + k));
    for (let k = 0; k < 4; k++) this.stage.hide(this.it('crunch_' + k));
    this.stage.shadow(this.it('bean_dish'), 0.33, this.top);
    this.stage.shadow(this.it('tub'), 0.1, this.top);
  }
  dish() {
    return this.it('bean_dish');
  }
  voices() {
    return ['beans_top', 'beans_done'];
  }

  async recipe() {
    const st = this.stage;
    const dish = this.it('bean_dish');
    let snapped = 0;
    await this.tapStep({
      voice: 'beans_snap',
      target: () => this.it('bean_' + Math.min(snapped, BEANS - 1)),
      demo: 'tap',
      hits: ['beans', 'beandish'],
      need: BEANS,
      gate: false,
      gesture: 'travel',
      act: async (i) => {
        snapped = i + 1;
        const halves = [this.it(`bean_${i}_a`), this.it(`bean_${i}_b`)];
        audio.snap(i);
        this.fx.burst('crumb', this.worldOf(this.it('bean_' + i)), { count: 3, color: 0xa9cc6b, floor: this.top });
        if (i === 2) this.gobbles.bounce(3);
        // recoil: both ends kick up, then each half hops into the dish
        await tween(0.11, (q) => {
          halves[0].rotation.z = -0.7 * q;
          halves[1].rotation.z = 0.7 * q;
        }, ease.outBack);
        halves.forEach((h, j) => {
          this.root.attach(h);
          const to = new THREE.Vector3(dish.position.x + rand(-0.1, 0.1), 0.1, dish.position.z + rand(-0.07, 0.07));
          wait(j * 0.07).then(() => arcTo(h, to, 0.38, 0.4, { spin: new THREE.Vector3(rand(-4, 4), rand(-3, 3), rand(3, 7)), e: ease.linear })).then(() => {
            st.hide(h);
            st.pop(this.it('pile_' + (i * 2 + j)), 1, 0.01);
            st.squash(dish, -1.6);
            audio.tone({ freq: 500 + i * 30, to: 260, dur: 0.05, vol: 0.12, type: 'triangle' });
          });
        });
        await wait(0.2);
      },
    });
    await wait(0.6);
    audio.sparkle();
    this.gobbles.cheer();
    const tub = this.it('tub');
    await this.tapStep({
      voice: 'beans_top',
      target: () => tub,
      hits: ['tub', 'beandish', 'beans'],
      need: 4,
      act: async (i) => {
        st.squash(tub, -4);
        audio.crunch();
        const from = this.world(new THREE.Vector3(tub.position.x, 0.2, tub.position.z));
        const to = this.worldOf(dish);
        this.fx.burst('crumb', from, { count: 10, color: [0xd9a066, 0xd69a4e, 0xf1d49b], dir: to.clone().sub(from).setY(0).multiplyScalar(2.2), up: 2.2, floor: this.top + 0.1, size: 0.03 });
        await wait(0.3);
        st.pop(this.it('crunch_' + i), 1, 0.01);
        st.squash(dish, -2);
        audio.note(i, 0.2);
      },
    });
    audio.sparkle();
    this.fx.burst('spark', this.worldOf(dish).add(new THREE.Vector3(0, 0.2, 0)), { count: 10, color: [0xffd27a, 0xffffff] });
  }
}
