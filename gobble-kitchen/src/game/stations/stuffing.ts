// Stuffing: bread chunks fly up and burst into cubes that rain into the bowl, a toy knife chops the celery,
// the herb shaker makes Gobbles sneeze, and a few tosses mix it all up.
import * as THREE from 'three';
import { Station } from '../station';
import { part } from '../../core/assets';
import { tween, wait, ease, lerp, rand } from '../../core/tween';
import { audio } from '../../core/audio';
import { arcTo, moveTo } from '../../fx/motion';
import type { Game } from '../game';

const CHUNKS = 5, CELERY = 4, CUBES = 15;

export class StuffingStation extends Station {
  doneVoice = 'stuff_done';
  servingColor = 0xe6bd7a;

  constructor(game: Game) {
    super(game, 'stuffing', 'stuffing');
    const st = this.stage;
    for (let k = 0; k < CUBES; k++) st.hide(this.it('cube_' + k));
    for (let k = 0; k < CELERY * 2; k++) st.hide(this.it('cel_' + k));
    st.hide(this.it('herbs'));
    this.it('bread_cube').visible = false;
    st.shadow(this.it('stuff_bowl'), 0.32, this.top);
    st.shadow(this.it('shaker'), 0.07, this.top);
  }
  dish() {
    return this.it('stuff_bowl');
  }
  voices() {
    return ['stuff_celery', 'stuff_season', 'stuff_toss', 'stuff_done'];
  }

  async recipe() {
    const st = this.stage;
    const bowl = this.it('stuff_bowl');
    const inBowl = (name: string) => bowl.position.clone().add(this.it(name).position);

    // ---- 1. bread: each chunk pops up and bursts into three cubes
    await this.tapStep({
      voice: 'stuff_bread',
      target: () => this.it('loaf_2'),
      hits: ['loaf', 'stuffbowl'],
      need: CHUNKS,
      gate: false,
      gesture: 'travel',
      act: async (i) => {
        const chunk = this.it('loaf_' + i);
        audio.pop(0.8 + i * 0.08);
        st.squash(chunk, 4);
        const up = new THREE.Vector3(lerp(chunk.position.x, bowl.position.x, 0.5), 0.8, lerp(chunk.position.z, bowl.position.z, 0.5));
        await arcTo(chunk, up, 0.1, 0.3, { spin: new THREE.Vector3(3, 0, 4), e: ease.out });
        audio.chop();
        audio.note(i, 0.2);
        st.hide(chunk);
        this.fx.burst('crumb', this.world(up), { count: 8, color: [0xf1d49b, 0xd69a4e], floor: this.top });
        for (let j = 0; j < 3; j++) {
          const k = i * 3 + j;
          const cube = part('stuffing', 'bread_cube');
          this.root.add(cube);
          cube.position.copy(up).add(new THREE.Vector3(rand(-0.06, 0.06), 0, rand(-0.06, 0.06)));
          arcTo(cube, inBowl('cube_' + k), 0.18, 0.34 + j * 0.06, { spin: new THREE.Vector3(rand(3, 6), rand(3, 6), 0), e: ease.in }).then(() => {
            this.root.remove(cube);
            st.pop(this.it('cube_' + k), 1, 0.3);
            st.squash(bowl, -1.5);
            audio.tone({ freq: 380 + k * 14, to: 220, dur: 0.05, vol: 0.12, type: 'triangle' });
          });
        }
        await wait(0.25);
      },
    });
    await wait(0.5);
    this.gobbles.cheer();

    // ---- 2. celery: the toy knife chops, pieces hop into the bowl (Gobbles flinches at the knife)
    const knife = this.it('knife');
    const knifeRest = { pos: knife.position.clone(), quat: knife.quaternion.clone() };
    const across = (tip: number) => new THREE.Quaternion().setFromEuler(new THREE.Euler(tip, -Math.PI / 2, 0, 'YXZ'));
    const over = (i: number, y: number) => new THREE.Vector3(this.it('celery_' + Math.min(i, CELERY - 1)).position.x + 0.06, y, this.it('celery_0').position.z + 0.2);
    await arcTo(knife, over(0, 0.26), 0.2, 0.4, { quat: across(0) });
    await this.tapStep({
      voice: 'stuff_celery',
      target: () => knife,
      demo: 'updown',
      hits: ['celery', 'stuffbowl', 'loaf'],
      need: CELERY,
      gesture: 'updown',
      act: async (i) => {
        const piece = this.it('celery_' + i);
        knife.position.copy(over(i, 0.26));
        // tip goes down first, then the heel follows: a rocking chop
        await tween(0.1, (q) => {
          knife.position.y = lerp(0.26, 0.075, q);
          knife.quaternion.copy(across(0.35 * Math.sin(q * Math.PI)));
        }, ease.in);
        audio.chop();
        audio.note(i, 0.16);
        st.squash(knife, -3);
        if (i === 0) this.gobbles.flinch();
        this.fx.burst('crumb', this.worldOf(piece), { count: 3, color: 0xa9cc6b, floor: this.top });
        arcTo(piece, new THREE.Vector3(bowl.position.x, 0.2, bowl.position.z), 0.4, 0.4, { spin: new THREE.Vector3(5, 3, 0), e: ease.linear }).then(() => {
          st.hide(piece);
          st.pop(this.it('cel_' + i * 2), 1, 0.2);
          st.pop(this.it('cel_' + (i * 2 + 1)), 1, 0.2);
          st.squash(bowl, -1.5);
        });
        await tween(0.14, (q) => (knife.position.y = lerp(0.075, 0.26, q)), ease.outBack);
        if (i < CELERY - 1) await moveTo(knife, over(i + 1, 0.26), 0.12);
      },
    });
    st.pop(this.it('celery_top'), 0);
    arcTo(knife, knifeRest.pos, 0.2, 0.4, { quat: knifeRest.quat });
    await wait(0.4);

    // ---- 3. herbs: shake, shake, sneeze
    const shaker = this.it('shaker');
    const shakerRest = { pos: shaker.position.clone(), quat: shaker.quaternion.clone() };
    const hover = this.at('socket_tool');
    const tipped = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 2.5));
    await arcTo(shaker, hover, 0.25, 0.45, { quat: tipped });
    const herbs = this.it('herbs');
    await this.tapStep({
      voice: 'stuff_season',
      target: () => shaker,
      demo: 'updown',
      hits: ['shaker', 'stuffbowl'],
      need: 3,
      gesture: 'updown',
      act: async (i) => {
        for (let k = 0; k < 2; k++) {
          await tween(0.07, (q) => (shaker.position.y = hover.y - 0.09 * q), ease.in);
          audio.noise({ type: 'highpass', freq: 4200, dur: 0.05, vol: 0.16 });
          this.fx.burst('crumb', this.world(new THREE.Vector3(hover.x, hover.y - 0.2, hover.z)), { count: 5, color: [0x5c9a4c, 0x8fae7e], size: 0.018, speed: 0.3, up: 0, floor: this.top + 0.2, life: 0.7 });
          await tween(0.08, (q) => (shaker.position.y = hover.y - 0.09 * (1 - q)), ease.out);
        }
        if (i === 0) st.pop(herbs, 1, 0.01);
        st.setBaseScale(herbs, 0.45 + 0.275 * i);
        audio.note(i * 2, 0.18);
        if (i === 1) this.gobbles.sneeze();
      },
    });
    arcTo(shaker, shakerRest.pos, 0.25, 0.45, { quat: shakerRest.quat });
    await wait(0.35);

    // ---- 4. toss: everything jumps
    const bits = [...Array.from({ length: CUBES }, (_, k) => this.it('cube_' + k)), ...Array.from({ length: CELERY * 2 }, (_, k) => this.it('cel_' + k))];
    const homes = bits.map((b) => b.position.clone());
    await this.tapStep({
      voice: 'stuff_toss',
      target: () => bowl,
      demo: 'circle',
      hits: ['stuffbowl'],
      need: 4,
      gesture: 'circle',
      centre: () => this.worldOf(bowl).add(new THREE.Vector3(0, 0.2, 0)),
      act: async (i) => {
        st.squash(bowl, -3.5);
        audio.whoosh();
        audio.note(i, 0.22);
        bits.forEach((b, k) => {
          const h = rand(0.12, 0.34), spin = new THREE.Vector3(rand(-6, 6), rand(-6, 6), rand(-6, 6)), r0 = b.rotation.clone();
          tween(0.42, (q, raw) => {
            b.position.y = homes[k].y + Math.sin(raw * Math.PI) * h;
            b.rotation.set(r0.x + spin.x * q, r0.y + spin.y * q, r0.z + spin.z * q);
          }, ease.linear);
        });
        await wait(0.46);
        audio.crunch();
        if (i === 3) this.fx.burst('puff', this.worldOf(bowl).add(new THREE.Vector3(0, 0.3, 0)), { count: 6, color: 0xfffaf0, size: 0.08 });
      },
    });
    audio.sparkle();
    this.fx.burst('spark', this.worldOf(bowl).add(new THREE.Vector3(0, 0.35, 0)), { count: 10, color: [0xffd27a, 0xffffff] });
  }
}
