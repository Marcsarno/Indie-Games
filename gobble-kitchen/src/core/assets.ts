// Loads the meshopt-compressed GLBs and swaps their materials for the cached toon / Lambert / glow ones.
// Blender naming drives everything: hit_* (invisible tap targets), socket_* (attach points),
// cam_<name> + cam_<name>_target (camera poses), and the "shade" / "outline" custom properties.
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { toonMaterial, lambertMaterial, glowMaterial, addOutline } from '../fx/toon';
import palette from '../game/palette.json';
import { fetchBytes } from './bytes';

const urls = import.meta.glob('../assets/models/*.glb', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

export const PAL = palette as Record<string, string>;
export const pal = (key: string) => new THREE.Color(PAL[key] ?? key);

const loaded = new Map<string, GLTF>();

// a hard toon highlight on glazed, wet and metal things (matched on the start of the Blender name)
const GLOSS: [string, number][] = [
  ['food_log', 0.55], ['food_butter', 0.3], ['butter_pool', 0.5], ['bowl_mesh', 0.32], ['cran_plate', 0.3], ['plate_', 0.32], ['can_mesh', 0.4], ['can_lid', 0.5],
  ['bell_dome', 0.6], ['pot_', 0.45], ['cookie_jar', 0.35], ['masher', 0.3], ['butter_dish', 0.3], ['fork_', 0.5], ['crock', 0.25], ['serving', 0.3], ['opener', 0.25],
];
const glossOf = (name: string) => GLOSS.find(([k]) => name.startsWith(k))?.[1] ?? 0;
const hitMat = new THREE.MeshBasicMaterial({ visible: false });

function shadeOf(o: THREE.Object3D): { shade: string; outline: boolean; data: Record<string, any> } {
  // custom properties sit on the named node; the mesh itself is the "<name>__geo" child (see scripts/optimize.mjs)
  const src = o.name.endsWith('__geo') && o.parent ? o.parent : o;
  return { shade: src.userData.shade ?? 'lambert', outline: !!src.userData.outline, data: src.userData };
}

function prepare(root: THREE.Object3D) {
  const meshes: THREE.Mesh[] = [];
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh);
  });
  for (const mesh of meshes) {
    const { shade, outline, data } = shadeOf(mesh);
    const name = mesh.name.replace(/__geo$/, '');
    if (data.hit || name.startsWith('hit_')) {
      mesh.material = hitMat;
      mesh.userData.hitName = name;
      continue;
    }
    if (shade === 'toon') mesh.material = toonMaterial({ wobble: name === 'food_log', gloss: glossOf(name) });
    else if (shade === 'glow') mesh.material = glowMaterial(data.color && data.color !== 'vertex' ? pal(data.color) : 0xffffff, data.color === 'vertex' || !data.color);
    else mesh.material = lambertMaterial();
    if (outline) mesh.userData.wantsOutline = true;
    if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) mesh.frustumCulled = false;
  }
}

export async function loadAll(onProgress?: (k: number) => void) {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const entries = Object.entries(urls);
  let done = 0;
  await Promise.all(
    entries.map(async ([path, url]) => {
      const name = path.split('/').pop()!.replace('.glb', '');
      const gltf = await loader.parseAsync(await fetchBytes(url), '');
      prepare(gltf.scene);
      loaded.set(name, gltf);
      onProgress?.(++done / entries.length);
    }),
  );
}

/** A fresh copy of a whole model file (skeletons included). Outline shells are added on the copy. */
export function instantiate(name: string): THREE.Object3D {
  const gltf = loaded.get(name);
  if (!gltf) throw new Error('model not loaded: ' + name);
  const copy = SkeletonUtils.clone(gltf.scene);
  finish(copy);
  return copy;
}

/** Copy one named node (with its children) out of a model file, reset to the origin. */
export function part(model: string, nodeName: string): THREE.Object3D {
  const gltf = loaded.get(model);
  if (!gltf) throw new Error('model not loaded: ' + model);
  const src = gltf.scene.getObjectByName(nodeName);
  if (!src) throw new Error(`no node ${nodeName} in ${model}`);
  const copy = src.clone(true);
  copy.position.set(0, 0, 0);
  copy.rotation.set(0, 0, 0);
  copy.scale.set(1, 1, 1);
  finish(copy);
  return copy;
}

function finish(root: THREE.Object3D) {
  const meshes: THREE.Mesh[] = [];
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh && !o.userData.isOutline) meshes.push(o as THREE.Mesh);
  });
  for (const mesh of meshes) {
    // toon and glow materials are per instance so colours can be tweened on one object
    const mat = mesh.material as THREE.Material;
    if ((mat as any).isMeshToonMaterial) {
      const name = mesh.name.replace(/__geo$/, '');
      mesh.material = toonMaterial({ wobble: name === 'food_log', gloss: glossOf(name) });
    } else if ((mat as any).isMeshBasicMaterial && mat !== hitMat) {
      mesh.material = (mat as THREE.MeshBasicMaterial).clone();
    }
    if (mesh.userData.wantsOutline) addOutline(mesh);
  }
}

/** Find a node by its Blender name. */
export function node(root: THREE.Object3D, name: string): THREE.Object3D {
  const o = root.getObjectByName(name);
  if (!o) throw new Error('missing node ' + name);
  return o;
}

/** The mesh that belongs to a named node (the node itself, or its __geo child). */
export function meshOf(o: THREE.Object3D): THREE.Mesh {
  if ((o as THREE.Mesh).isMesh) return o as THREE.Mesh;
  const m = o.children.find((c) => (c as THREE.Mesh).isMesh && !c.userData.isOutline) as THREE.Mesh | undefined;
  if (!m) throw new Error('no mesh under ' + o.name);
  return m;
}

export function setColor(o: THREE.Object3D, color: THREE.Color) {
  ((meshOf(o).material as THREE.MeshToonMaterial).color as THREE.Color).copy(color);
}

export function worldPos(o: THREE.Object3D, out = new THREE.Vector3()) {
  return o.getWorldPosition(out);
}
