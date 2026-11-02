#!/usr/bin/env bash
# Copy the last cc export (blender/out) into viewer/worlds/cc. Meshopt-compressed like the coconut world.
set -e; cd "$(dirname "$0")"; W=../viewer/worlds/cc; mkdir -p $W
npx -y @gltf-transform/cli@4.5.1 meshopt out/cc_scene.glb $W/scene.glb > /dev/null
cp out/colliders_cc.json $W/colliders.json; cp out/props_cc.json $W/props.json; cp out/cars_cc.json $W/cars.json; cp out/world_cc.json $W/world.json
ls -la $W | awk '{print $5, $9}'
