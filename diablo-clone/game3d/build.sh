#!/usr/bin/env bash
# Assembles the playable 3D game into dist/: the 2D game's code and sound (unchanged) + the 3D layer + the models.
set -euo pipefail
cd "$(dirname "$0")"
rm -rf dist && mkdir -p dist
cp -r ../game/js ../game/music ../game/sfx ../game/art dist/
cp -r js3d models index.html dist/
echo "built dist/ ($(du -sh dist | cut -f1))"
