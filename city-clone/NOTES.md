# City-clone notes

**SETTING CHANGE (user, 2026-10-29): the city is now Coconut Creek, Florida, working title "Grand Theft Coconut Creek" (GTCC).** Target art = `art/coconut-*.png`
(the Chinatown concepts moved to `art/chinatown-superseded/`). Bright sunny suburb: palms, stucco + terracotta, canals, shopping plazas, low-rise (2-4 floors), so tall
leaning walls matter less than in Chinatown. Camera note: the concept shows an oblique "overhead driving camera" and an OVER-THE-SHOULDER on-foot camera; the user's
chosen play camera is still 45 deg / 44 m (ask before adopting the over-the-shoulder look). The Chinatown arch/signs/stalls are kept in the repo as an optional district.
**User-supplied gameplay-angle art saved (art/coconut-5, coconut-6) and judged by the user to nail the style; use it as THE camera/look target for the Florida pass** (oblique ~45-55 deg,
wide, dense palms, terracotta + stucco, bright warm daylight, GTA-style HUD with minimap, money, health bar, fist icon). It matches the 45 deg camera the user chose.
Driving + physics (step 2) continues unchanged in the existing Chinatown test arena; the Florida art pass comes after it.

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

**Step 1 (modular doors + enter/exit), `art-review/round3/`:**
- `car.py`: `make_car(kind, color, name)` -> root Empty + `_body` + four hinged doors `_door_FL/FR/RL/RR` (origin at the front-edge hinge; open angle = side * 62 deg
  about Z in Blender = Y in three; side/max angle ride in glTF extras -> `userData`) + `_seat_XX` / `_stand_XX` empties. Dark interior recess shows when a door opens.
  Works for sedan and taxi (`doors=2` option for coupes). Cars are exported alone (`export_cars.py` -> car_sedan/car_taxi.glb) and rebuilt in the page from
  `cars.json` (name, kind, colour, x, y, rz); the scene GLB no longer contains cars. Paint material names start `paint_`: the page recolours per instance.
- `character.py`: clips `enter_L/R`, `exit_L/R` (58 frames, 2.4 s). Pelvis translates SEAT_DIST = 1.13/.92 forward and drops 0.44 while yawing 90 deg, so the clip
  assumes the character root sits at the car's stand marker facing the seat marker (stand-to-seat = 1.13 m in car space, character scale 0.92). Exit = enter reversed.
  Door timing used by the page: opens at 10% of the clip, closes at 85%; on exit it opens 0.35 s before the clip and closes at 85%.
- Page (`viewer/index.html`): `makeCar` (doors damped with exp ease), generic `enterCar(actor, car, tag)` / `exitCar(...)` that work for any actor, any car pose and any door
  (hero or pedestrian, L or R), `walkTo`, async helpers `wait/tween/nextFrame` driven by the render loop. Demo (Enter view): hero uses a sedan's driver door on the road side,
  a pedestrian the taxi's passenger door from the sidewalk, loop ~21 s. `Doors` chip opens/closes all parked cars. `__city.tick(dt)` / `setManual(true)` step the sim for
  deterministic capture (that is how `enter_exit_demo.gif` was made; headless software GL records far too slowly for video).
- Gotchas: positive X rotation tips a body BACK (forward lean = negative X; fixed the run cycle); Builder materials cache must survive `reset()` (catch ReferenceError);
  door geometry must be hinge-relative (object origin is the hinge); the host serves no `.glb` (base64 `.txt` via `viewer/build.sh`).
- Not done: seated people are hidden once the door closes (roof hides them anyway), no door sounds, no hijack animation (pulling a driver out), the car does not drive yet.

**Step 2 (driving + physics + collisions), `art-review/round4/`:** published to the same page.
- Model (`viewer/index.html`, "DRIVING" block): fixed 120 Hz steps in the XZ plane. Bicycle-style yaw (w = -tan(steer*maxSteer)*vf/wheelbase, maxSteer 0.50 rad at rest -> 0.12 at top
  speed), longitudinal accel with a soft top-speed curve, rolling friction, brake that becomes reverse below 0.8 m/s, lateral grip as exponential damping of the sideways
  velocity (grip 8 normally, "slide grip" 2.4 once sliding; slide starts with handbrake above 4 m/s or sideways speed above 5.5 and ends below 1.5 m/s), handbrake adds a little yaw.
- Collisions: SAT polygon test between the 4.5 x 1.8 car box and the 48 colliders exported from Blender (`colliders.json`, written by `test_scene.py`: buildings, arch pillars, stalls,
  props, trees, lamps, parked cars, world-edge walls) + the scripted taxi as a moving obstacle. Resolution = push out along the minimum axis, impulse with the contact-point arm
  (so hits spin the car), restitution = Bounce slider (0.35), tangential friction 0.35. Parked cars and props are static for now.
- Feedback: damage (0.02 per m/s above 2.5 m/s of impact speed) darkens the paint toward charcoal; sparks (pooled Points); 700 skid-mark quads; camera shake (trauma^2);
  hits above 9 m/s throw the struck side's doors open for ~2 s; synth sound (sawtooth engine pitched by speed, band-passed noise skid, noise+sine crash thump; starts on first touch,
  Sound chip mutes).
- Controls: left arrows steer; right: Gas (big), Brake (reverses when stopped), Hand brake, Exit/Enter (uses the step 1 routines when slower than 1.6 m/s). Keyboard: arrows/WASD,
  Space, F. Panels: View (Play/Enter/Arch/Overview/Top, tilt, zoom, open parked doors) and Tune (7 sliders saved in localStorage as `gtcc-tune`).
- Tested in Chromium with scripted input: 0-18 m/s in 2 s, 25 m/s at 4 s (cap 28); 12 m/s head-on wall hit -> rebound 3.4 m/s, no penetration, damage 0.2;
  60 s random-input soak finite and in bounds; handbrake drift gives 10+ m/s sideways speed and skid marks. Frame capture hook: `__city.tick(dt)`, `__city.step(dt)` (physics only).
- NOT verified on a real phone: touch feel, multi-touch (steer + gas together), audio, frame rate. Known gaps: pedestrians are ghosts to cars, parked cars do not move, no curb bump or
  grass/sidewalk surface change, no traffic AI, no damage deformation (colour only), door button is the only on-foot action (hero cannot walk yet).
- Gotchas: Playwright screenshot of the WebGL page can time out at deviceScaleFactor 2 (use 1 and a long timeout); the taxi collider is refreshed in `update`, so tests that teleport
  the taxi must call `tick(0.0001)`; write non-ASCII UI glyphs as `\u` escapes in JS (the local test server sent no charset).

**Step 3 (on foot, punching, any car), `art-review/round5/`:** published to the same page.
- Blender: new clips `punch2` (mirrored jab), `hit` (flinch), `fall` (tips onto the back, head away from the attacker), `getup` (fall reversed, 26 frames) in `character.py`; 12 clips total.
- Vehicles: one state object per car (`vehs`); only the ACTIVE car is simulated (`drive`, null while on foot); every other car is a static SAT collider rebuilt from its live pose
  (`setCarCollider` / `parkVehicle`); the scripted taxi is the exception. `hmode` = 'driving' | 'foot' | 'busy' (door animation). Parked-car entries in colliders.json carry a `car` tag and are
  ignored by the page.
- Hero on foot (`footStep`): floating-free on-screen stick (also WASD/arrows), analog speed (walk up to 2.6 m/s, run to 4.8), 11/s velocity smoothing, turns toward motion, circle-vs-polygon
  push-out against the same 48 colliders + cars (blocked by walls and cars, verified). Run button / Shift forces a run.
- Punch (`startPunch`/`strike`/`applyHit`): jab, cross alternating (combo if the next press lands within 0.45 s; one more press is queued while swinging), clip at 1.5x, strike at 36% of
  the swing, auto-aim to the nearest target within 2.8 m in front with a lunge that closes the gap, cone hit test (1.7 m, 63 deg). Hit = 75 ms hitstop (130 ms on a knockdown) that freezes
  animation and movement but not camera/effects, white flash 60 ms, camera shake, victim turns to the attacker and is thrown back (5.2 m/s, 8.5 on a knockdown, eased out), `hit` flinch;
  3 hp, every third punch of a combo is a finisher (knockdown): `fall`, lies 2.4 s, `getup` 1.1 s, hp back to 3, walks on. Punch thud reuses the crash synth.
- Enter/steal (`interact`): when slow it exits the driver door; on foot it picks the nearest door of any car except the scripted taxi within 4.2 m and runs the step 1 enter animation,
  then drives that car (its collider is removed, the old car becomes a collider). Works for any of the four doors.
- Test hooks: `tick(dt, draw=false)` steps the whole sim with no render (in manual mode each drawn frame costs 1+ s in software GL; always pass false for logic tests and true only for a
  captured frame), `__city.drive` is a getter. Tests: exit 2.7 s, run 4.8 m/s, half stick walk 1.5 m/s, blocked by car and wall without penetration, three punches -> hit, hit, knockdown,
  getup and walk on, steal parked0 and drive it. Driving regression numbers unchanged.
- Not done: pedestrians never fight back or flee, no kicks/weapons, cars still ignore pedestrians, hero has no health, no police, cannot pick up/drop anything; hero is invisible in a car.
- Gotcha: `pkill -f <name>` in a Bash command kills the shell running it when the command text contains the name.

## Next
(Agreed order: 1 DONE modular car doors + enter/exit animation, 2 DONE drive + arcade physics + collisions, 3 DONE on-foot control + punch + enter any car, 4 dynamic camera zoom, 5 pedestrian reactions, then baked lighting and more content.)
0. User feedback on the phone page (look, camera angle, mood, frame rate on the real device).
1. Quick test scene (crossroads, two tall buildings, one car) built with the Blender scripts, shown from the game camera.
2. Prototype per `HANDOFF.md`: block, drivable car with crash physics, hero walking and punching; publish as an Artifact.
