// Portrait cards: each guest (and Gobbles) is rendered once into a small off-screen target, and the picture
// plus their name becomes a canvas. The same canvas is the face of their 3D name card and the big card the
// screen shows when it is picked up.
import * as THREE from 'three';
import type { Stage } from '../core/stage';

const SIZE = 320;
const lut = new Uint8Array(256);
for (let i = 0; i < 256; i++) {
  const c = i / 255;
  lut[i] = Math.round((c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055) * 255);
}

/**
 * Render `subject` (moved far off-stage for a moment) looking at `focus`, and compose a name card.
 * `radius` is how much of the world to show around the focus point.
 */
export function makePortrait(stage: Stage, subject: THREE.Object3D, focus: () => THREE.Vector3, radius: number, name: string, bg: number): HTMLCanvasElement {
  const { renderer, scene } = stage;
  const rt = new THREE.WebGLRenderTarget(SIZE, SIZE);
  const cam = new THREE.PerspectiveCamera(18, 1, 0.1, 400);
  // park the subject where nothing else is in view
  const savedPos = subject.position.clone(), savedRot = subject.rotation.y, savedVis = subject.visible, savedBg = scene.background;
  subject.position.set(0, 200, 0);
  subject.rotation.y = 0;
  subject.visible = true;
  subject.updateMatrixWorld(true);
  const f = focus();
  const dist = radius / Math.tan(THREE.MathUtils.degToRad(9));
  cam.position.copy(f).add(new THREE.Vector3(0.16, 0.1, 1).normalize().multiplyScalar(dist));
  cam.lookAt(f);
  scene.background = new THREE.Color(bg);
  renderer.setRenderTarget(rt);
  renderer.render(scene, cam);
  const px = new Uint8Array(SIZE * SIZE * 4);
  renderer.readRenderTargetPixels(rt, 0, 0, SIZE, SIZE, px);
  renderer.setRenderTarget(null);
  scene.background = savedBg;
  subject.position.copy(savedPos);
  subject.rotation.y = savedRot;
  subject.visible = savedVis;
  subject.updateMatrixWorld(true);
  rt.dispose();

  // linear -> sRGB, flipped the right way up
  const shot = document.createElement('canvas');
  shot.width = shot.height = SIZE;
  const sctx = shot.getContext('2d')!;
  const img = sctx.createImageData(SIZE, SIZE);
  for (let y = 0; y < SIZE; y++) {
    const src = (SIZE - 1 - y) * SIZE * 4, dst = y * SIZE * 4;
    for (let x = 0; x < SIZE * 4; x += 4) {
      img.data[dst + x] = lut[px[src + x]];
      img.data[dst + x + 1] = lut[px[src + x + 1]];
      img.data[dst + x + 2] = lut[px[src + x + 2]];
      img.data[dst + x + 3] = 255;
    }
  }
  sctx.putImageData(img, 0, 0);

  // the card: picture on top, name underneath
  const W = 300, H = 370, pad = 14, pic = W - pad * 2;
  const card = document.createElement('canvas');
  card.width = W;
  card.height = H;
  const g = card.getContext('2d')!;
  g.fillStyle = '#fff4e0';
  g.fillRect(0, 0, W, H);
  g.save();
  g.beginPath();
  (g as any).roundRect ? (g as any).roundRect(pad, pad, pic, pic, 26) : g.rect(pad, pad, pic, pic);
  g.clip();
  g.drawImage(shot, pad, pad, pic, pic);
  g.restore();
  g.fillStyle = '#3b2630';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  let size = 58;
  const font = (s: number) => `800 ${s}px ui-rounded, "SF Pro Rounded", "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif`;
  g.font = font(size);
  while (g.measureText(name).width > W - 28 && size > 24) g.font = font((size -= 3));
  g.fillText(name, W / 2, pad + pic + (H - pad - pic) / 2 + 2);
  return card;
}
