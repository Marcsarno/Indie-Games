# Headless Blender tooling (city-clone)

Models are made by Python scripts run in headless Blender 4.5 LTS, reviewed as rendered
images, revised, then exported as `.glb` for the Three.js game. No hand-built meshes in Three.js.

## Setup (once per fresh cloud session; the container is wiped)
    bash city-clone/blender/setup.sh      # installs Blender + libs, checksum-verified, links `blender`

## Loop
    cd city-clone/blender
    blender -b --python scripts/<model>.py      # builds, renders out/<name>_<view>.png, exports out/<name>.glb
    python3 -I scripts/sheet.py out/<name>      # stitches out/<name>_sheet.png (game, three_q, front, side, back, top)
Look at the sheet, fix the script, rerun. Filter noise with `2>&1 | grep -E "GLB|Traceback|Error"`.

## `scripts/lib.py` helpers
`reset, mat, box, cyl, flat, outline, join, world, sun, camera, render, review_sheet, export_glb`.
- `outline(obj, thickness)` adds an inverted-hull ink line as real geometry, so it survives glTF export.
- `render(..., ink=True)` also draws Freestyle lines for review renders.
- `review_sheet` renders the in-game camera (steep perspective) plus five inspection angles.
- `scripts/pipeline_test.py` is a throwaway red box car that proves the loop. It is not the real car.

## Verified
Blender 4.5.15 LTS (Python 3.11) runs without a GPU; EEVEE, Workbench and Cycles all render; the exported GLB
loads in Three.js r170 with its materials and outline (checked in headless Chromium).
Ignore the `EGL_BAD_MATCH` messages (software GL). Needs libEGL etc., which `setup.sh` installs.
Not yet done: rigged/animated hero, texture baking (window textures), lighting tuned to the screenshots.
