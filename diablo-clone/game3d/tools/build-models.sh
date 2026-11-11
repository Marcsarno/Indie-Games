#!/usr/bin/env bash
# Rebuilds every model from the 2D game's rigs: export (node + headless Chromium) -> headless Blender -> compress -> models/.
#   bash tools/build-models.sh            everything
#   bash tools/build-models.sh chars      only characters        bash tools/build-models.sh props      only scenery
set -euo pipefail
cd "$(dirname "$0")/.."
what="${1:-all}"; mkdir -p blender/rigs blender/out/conv models
if [ "$what" != props ]; then node tools/dump.cjs blender/rigs monsters heroes | tail -1; fi
if [ "$what" != chars ]; then node tools/dump-props.cjs blender/rigs | head -1; fi
names=$(ls blender/rigs | grep -v manifest | sed 's/.json//' | { if [ "$what" = chars ]; then grep -v '^prop_'; elif [ "$what" = props ]; then grep '^prop_'; else cat; fi; })
(cd blender && blender -b --python scripts/convert.py -- rigs out/conv $names 2>&1 | grep -E "FAILED|Traceback" || true)
node tools/pack.mjs blender/out/conv models
cp blender/rigs/manifest.json models/manifest.json
du -sh models
