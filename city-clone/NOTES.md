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
**User verdict on the round 2 phone page: "nailed it". Chosen game camera: 45 deg tilt, 44 m zoom** (now the page default). At that zoom a car is ~4% of the screen width and a person is tiny, so doors/people need either a closer on-foot zoom (~20-24 m) or exaggerated readability.
Blender 5.2.3 LTS tooling installed and verified (`blender/README.md`). Concept art saved in `art/` (target = concept-4).
Phone page (Artifact): https://claude.ai/artifact/TkdXc4ziagunseRsvdKziw  (source `viewer/index.html`; republish the same file path to update).
The host serves no `.glb`, so the page loads base64 text copies: re-export models into `viewer/`, run `viewer/build.sh`, publish `index.html` with
`files` = `test_scene.glb.b64.txt` + `character.glb.b64.txt`.

**Round 1** (`art-review/round1/`): crossroads + generators for buildings (`building.py`), cars (`car.py`), street (`street.py`), kit (`kit.py`).
**Round 2** (`art-review/round2/`, before/after sheet `compare_round1_round2_concept.png`):
- Road narrowed to R=4.6 (lane 2.6 + parking 2.0). Dusk look: warm low sun, blue ambient, lamp point lights, AgX high contrast (`mood.py`).
- Procedural textures (`textures.py`: brick per colour, asphalt, sidewalk slabs, roof; numpy+PIL) mapped by world-metre box projection in `Builder.build`.
- Signs with real Chinese characters drawn with WenQuanYi Zen Hei (海鮮酒家, 金行, 餃子, 酒家, 金龍酒樓, 華埠) as emissive textures.
- Chinatown arch, 3 market stalls, dumpster, barriers, barrels, news boxes, pallets, 6 buildings, 14 cars, 5 trees.
- Rigged pedestrian (`character.py`): rigid blocky parts in a joint hierarchy (no skinning), pose functions -> keyframes -> NLA tracks
  idle/walk/run/punch -> glTF animations. Verified playing in Three.js (walk cycle, jab with stagger). Blender 5 slotted actions worked with
  NLA export (`export_animation_mode="NLA_TRACKS"`).
- Viewer: Drive (follows the red sedan), Arch, Overview, Top; Tilt and Zoom sliders; drag to pan, pinch to zoom; fps readout;
  12 walking pedestrians, a fighting pair, looping traffic. Lights are live Three.js lights + a shadow-mapped sun (not baked yet).
Honest gaps vs concept-4: still far fewer people/props, no storefront clutter, road a little wide, arch roofs flat dark green, characters are
faceless blocks, no baked lighting/AO, only measured in software GL (about 20 fps in headless SwiftShader, meaningless for phones; need a real
device reading from the fps chip). Pedestrians clip trees/bins slightly (walk lanes ignore props). Camera passing under the arch is hidden by it.
Gotchas: Blender fits the lens to the LONGER image side (use `sensor_fit=HORIZONTAL`); `[hidden]` needs `display:none!important` when a rule sets display.

## Next
(Agreed order: 1 modular car doors + enter/exit animation, 2 drive + arcade physics + collisions, 3 on-foot control + punch + enter/exit button, 4 dynamic camera zoom, 5 pedestrian reactions, then baked lighting and more content.)
0. User feedback on the phone page (look, camera angle, mood, frame rate on the real device).
1. Quick test scene (crossroads, two tall buildings, one car) built with the Blender scripts, shown from the game camera.
2. Prototype per `HANDOFF.md`: block, drivable car with crash physics, hero walking and punching; publish as an Artifact.
