#!/usr/bin/env bash
# The Artifact host serves no .glb, so the page loads base64 text copies. Run after re-exporting any model into this folder.
set -e; cd "$(dirname "$0")"
for f in character car_sedan car_taxi veg worlds/chinatown/scene; do base64 -w0 $f.glb > $f.glb.b64.txt; done; ls -la *.b64.txt worlds/*/*.b64.txt | awk '{print $5, $9}'
