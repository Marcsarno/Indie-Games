#!/usr/bin/env bash
# The Artifact host serves no .glb, so the page loads base64 text copies. Run after re-exporting the models into this folder.
set -e; cd "$(dirname "$0")"
for f in test_scene character; do base64 -w0 $f.glb > $f.glb.b64.txt; done; ls -la *.b64.txt
