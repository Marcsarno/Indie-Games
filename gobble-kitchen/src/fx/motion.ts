// Hand-written flights: no physics engine. A thrown or dropped thing follows an arc to a known landing
// spot, so it always lands somewhere on purpose.
import * as THREE from 'three';
import { tween, ease, type Ease } from '../core/tween';

/** Fly an object (position in its parent's space) along an arc to `to`. */
export function arcTo(o: THREE.Object3D, to: THREE.Vector3, height = 0.3, dur = 0.4, opts: { spin?: THREE.Vector3; e?: Ease; quat?: THREE.Quaternion } = {}) {
  const from = o.position.clone();
  const q0 = o.quaternion.clone();
  const e0 = o.rotation.clone();
  return tween(dur, (k, raw) => {
    o.position.lerpVectors(from, to, k);
    o.position.y += Math.sin(raw * Math.PI) * height;
    if (opts.quat) o.quaternion.slerpQuaternions(q0, opts.quat, k);
    else if (opts.spin) o.rotation.set(e0.x + opts.spin.x * k, e0.y + opts.spin.y * k, e0.z + opts.spin.z * k);
  }, opts.e ?? ease.inOut);
}

export function moveTo(o: THREE.Object3D, to: THREE.Vector3, dur = 0.3, e: Ease = ease.inOut) {
  const from = o.position.clone();
  return tween(dur, (k) => o.position.lerpVectors(from, to, k), e);
}

export function turnTo(o: THREE.Object3D, quat: THREE.Quaternion, dur = 0.3, e: Ease = ease.inOut) {
  const q0 = o.quaternion.clone();
  return tween(dur, (k) => o.quaternion.slerpQuaternions(q0, quat, k), e);
}

/** Top-centre of an object's bounds in world space (ignores invisible tap targets). */
export function topOf(o: THREE.Object3D, out = new THREE.Vector3()) {
  const box = new THREE.Box3();
  o.updateWorldMatrix(true, true);
  o.traverse((c) => {
    const m = c as THREE.Mesh;
    if (!m.isMesh || m.userData.hitName || m.userData.isOutline || !m.visible) return;
    if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
    box.union(new THREE.Box3().copy(m.geometry.boundingBox!).applyMatrix4(m.matrixWorld));
  });
  if (box.isEmpty()) return o.getWorldPosition(out);
  return out.set((box.min.x + box.max.x) / 2, box.max.y, (box.min.z + box.max.z) / 2);
}
