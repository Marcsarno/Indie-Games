#!/usr/bin/env bash
# Models: Blender 4.2 LTS headless -> build/raw/*.glb (+ preview PNGs) -> meshopt -> src/assets/models/*.glb
# Usage: bash scripts/build-assets.sh [--only potato,kitchen] [--no-preview]
set -euo pipefail
cd "$(dirname "$0")/.."
BLENDER=${BLENDER:-blender42}
command -v "$BLENDER" >/dev/null || { echo "Blender 4.2 not found: run scripts/setup-blender.sh"; exit 1; }
"$BLENDER" -b --factory-startup -P blender/build_all.py -- --out build/raw "$@" 2>&1 | grep -E "^(exported|==)|skin:|Error|Traceback|File " || true
node scripts/optimize.mjs build/raw src/assets/models
