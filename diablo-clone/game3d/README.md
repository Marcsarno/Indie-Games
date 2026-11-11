# Dungeons of Bones in 3D (work in progress)

The 3D remake of `../game/` (which stays untouched). Every model and animation comes from Python
scripts run in headless Blender; the page draws them with Three.js r170.

    bash ../../city-clone/blender/setup.sh          # Blender 5.2.3, once per cloud session
    cd blender
    blender -b --python scripts/warrior.py          # out/warrior.glb + review renders (NORENDER=1 skips them)
    blender -b --python scripts/room.py             # out/room.glb
    python3 ../look/pack.py                         # look/models.js (base64 of the glbs + today's 2D sprite)

- `blender/scripts/kit.py`: parts (lathe, capsule, ellipsoid, box, curved panel) each bound to one bone, joined into
  ONE skinned mesh; clips are Python pose functions baked to one NLA track each (= one glTF animation each).
  Signs: the character faces -Y, right hand -X; a negative x turn swings a hanging limb forward.
- `look/warrior-looks.html`: the look test (A smooth, B chunky pixels: 50 px per unit, toon ramp, depth ink line, dither).
  Published at https://claude.ai/artifact/A4S7zW9WRQv1DvwqFVGCYH (page + `models.js`).
