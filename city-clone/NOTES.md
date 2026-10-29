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
Blender 4.5 LTS tooling is installed and verified end to end. No game or real models yet.

## Next
1. Quick test scene (crossroads, two tall buildings, one car) built with the Blender scripts, shown from the game camera.
2. Prototype per `HANDOFF.md`: block, drivable car with crash physics, hero walking and punching; publish as an Artifact.
