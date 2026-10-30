#!/usr/bin/env bash
# Copy the last coconut export (blender/out) into the viewer world folder.
set -e; cd "$(dirname "$0")"; W=../viewer/worlds/coconut
cp out/coconut_scene.glb $W/scene.glb; cp out/colliders_coconut.json $W/colliders.json; cp out/props_coconut.json $W/props.json; cp out/cars_coconut.json $W/cars.json; cp out/world_coconut.json $W/world.json
ls -la $W | awk '{print $5, $9}'
