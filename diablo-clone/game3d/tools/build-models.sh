#!/usr/bin/env bash
# Rebuilds every model in headless Blender: export from the 2D game's rigs (node + headless Chromium) -> Blender -> compress -> models/.
#   bash tools/build-models.sh [chars] [heroes] [props]      (no names = everything; takes ~20 minutes in full)
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p blender/rigs blender/out/conv models
node tools/dump.cjs blender/rigs "$@"
names=$(ls blender/rigs | grep -v manifest | sed 's/.json//')
(cd blender && blender -b --python scripts/convert.py -- rigs out/conv $names 2>&1 | grep -E "FAILED|Traceback" || true)
(cd blender && blender -b --python scripts/extras.py 2>&1 | grep -E "GRASS|DETAIL|Traceback" || true)
rm -f models/*.glb
node tools/pack.mjs blender/out/conv models
cp blender/out/extra/grass.glb models/x_grass.glb; cp blender/out/extra/detail.png models/x_detail.png
cp blender/rigs/manifest.json models/manifest.json
du -sh models
