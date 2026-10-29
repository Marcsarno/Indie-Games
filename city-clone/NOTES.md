# City-clone notes

Read `HANDOFF.md` first. Last updated 2026-10-29.

## Decisions
- **Look:** real 3D like Chinatown Wars (tilted perspective camera, ink outlines, flat muted colors), not pixel art.
  The user's reference screenshots were mobile Chinatown Wars: leaning building walls, black outlines, muted grey/green/brown.
- **Engine:** Three.js in the browser (not Godot): small download, publishes as an Artifact, and the driving is
  arcade physics written by hand (heading, velocity, lateral grip, footprint collisions) either way.
- **Art pipeline:** every model is made by Python scripts in headless Blender and reviewed as renders first.
  Nothing is built purely in Three.js. See `blender/README.md`. Diablo's pixel renderer is not used here.
- Reuse from Diablo: sound synth, touch controls, the before/after review habit.

## State
Blender 5.2.3 LTS tooling is installed and verified end to end. Concept art saved in `art/` (target = concept-4).
**Round 1 test scene** (`blender/scripts/test_scene.py`, renders in `art-review/round1/`): crossroads, 4 buildings (6/8/2/3 floors) from one
parametric generator (`building.py`), sedan/taxi from one car generator (`car.py`), street, lamps, trees, parked cars, GLB export (1.1 MB).
Game camera = `lib.game_camera`: north-up, perspective, 65 deg pitch, width-fitted lens (Blender fits the LONGER side by default; that
mistake made portrait shots look 2x zoomed until fixed). ~21 m of street visible across a portrait phone.
Honest gaps vs concept-4: far less density (no pedestrians, little street clutter, plain sidewalks), brighter/flatter palette
(concept is warm dusk, darker, more contrast), streets too wide (buildings only a sliver in portrait), no textures/brick/signage text,
car is chunky with a plain interior-less look, fire-escape rails read as solid slabs. Lighting is live EEVEE shadows; for the game it must be baked.

## Next
0. Round 2 art pass on the gaps above (narrower road ~R=4.2, dusk grade, ground/brick textures, signage with a CJK font, props, pedestrians).
1. Quick test scene (crossroads, two tall buildings, one car) built with the Blender scripts, shown from the game camera.
2. Prototype per `HANDOFF.md`: block, drivable car with crash physics, hero walking and punching; publish as an Artifact.
