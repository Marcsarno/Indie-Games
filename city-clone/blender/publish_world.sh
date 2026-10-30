#!/usr/bin/env bash
# Copy the last coconut export (blender/out) into the viewer world folder. The scene is Meshopt-compressed (17 MB -> ~5 MB; the page decodes it).
set -e; cd "$(dirname "$0")"; W=../viewer/worlds/coconut
npx -y @gltf-transform/cli@4.5.1 meshopt out/coconut_scene.glb $W/scene.glb > /dev/null
cp out/colliders_coconut.json $W/colliders.json; cp out/props_coconut.json $W/props.json; cp out/cars_coconut.json $W/cars.json; cp out/world_coconut.json $W/world.json
ls -la $W | awk '{print $5, $9}'
