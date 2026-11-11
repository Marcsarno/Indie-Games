#!/usr/bin/env bash
# Dungeons of Bones: The World (third person). Same game code, same Blender-built models and 3D layer as ../game3d,
# run in "world" mode: a camera behind the hero. dist/ = the playable game.
set -euo pipefail
cd "$(dirname "$0")"
rm -rf dist && mkdir -p dist
cp -r ../game/js ../game/music ../game/sfx ../game/art dist/
cp -r ../game3d/js3d ../game3d/models dist/
cp index.html dist/
# the HUD finds spots in the world with iso(); world mode swaps in its own camera's answer while the HUD draws
sed -i 's|^const iso = (fi, fj) =>|let iso = (fi, fj) =>|' dist/js/world.js
grep -q '^let iso = ' dist/js/world.js || { echo "could not make iso replaceable"; exit 1; }
echo "built dist/ ($(du -sh dist | cut -f1))"
