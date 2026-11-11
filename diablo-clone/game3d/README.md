# Dungeons of Bones in 3D

The 3D version of `../game/`. It loads the 2D game's code unchanged and replaces only the drawing.
Full description: the "3D REMAKE" section at the top of `../NOTES.md`.

    bash ../../city-clone/blender/setup.sh     # headless Blender 5.2.3, once per cloud session
    (cd tools && npm install)                  # model compressor, once
    bash tools/build-models.sh                 # rigs from the 2D game -> Blender -> models/   (chars | props for one half)
    bash build.sh                              # dist/ = the playable game (game/ + js3d/ + models/)
    (cd dist && python3 -m http.server 8202)   # play it locally

Live: https://dungeons-of-bones-3d-marcsarno.vercel.app (redeploys on every push to main).

- `js3d/bridge.js`  replaces `render()`, stubs prop sprites, paints the ground-effect layer
- `js3d/main.js`    the Three.js scene: camera, ground, walls, scenery, characters, flames
- `js3d/rigdump.js`, `rigposes.js`  rig -> model data (also used in the browser)
- `js3d/rigbuild.js`  builds a model in the browser when no Blender file exists (any gear mix)
- `blender/scripts/convert.py`  model data -> rigged, painted, animated glb
- `tools/dump.cjs`, `dump-props.cjs`, `pack.mjs`, `build-models.sh`  the export pipeline
- `look/`, `blender/scripts/kit.py`, `warrior.py`, `room.py`  the first look test (hand-made warrior)
