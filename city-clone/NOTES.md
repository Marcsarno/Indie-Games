# City-clone notes: "Grand Theft Coconut Creek" (GTCC)

Last updated 2026-10-29. **Start here.** `HANDOFF.md` is only the original brief (pixel-art plan, now superseded).

## What this is
A top-down open-city crime game for portrait phones in the browser, set in Coconut Creek, Florida. Real 3D (Three.js) with every model made by Python scripts in headless Blender.
Live test build (Artifact, private, one link, republish the same file path to update): https://claude.ai/artifact/TkdXc4ziagunseRsvdKziw  (`#chinatown` on the link loads the old Chinatown block).
Playable today: drive (drift, handbrake, crashes with spin/sparks/damage/skid marks), get out, walk/run, punch (combo, hitstop, knockback, knockdown), steal any parked car, minimap + cash + health HUD,
Tune panel for the car handling. Controls are touch (stick/pads) with keyboard fallback.

## How to work on it (new session checklist)
1. `bash city-clone/blender/setup.sh` (Blender 5.2.3 LTS + libs; the container is wiped each session). Scripts: `blender -b --python scripts/<x>.py` from `city-clone/blender` (see `blender/README.md`).
2. Textures: `python3 scripts/textures.py`. World export: `NORENDER=1 blender -b --python scripts/coconut_scene.py` (Chinatown: `scripts/test_scene.py`); characters `scripts/export_character.py`; cars `scripts/export_cars.py`; vegetation `scripts/vegetation.py`.
3. Copy exports into `viewer/` (`veg.glb`, `character.glb`, `car_*.glb`, `worlds/<w>/{scene.glb, colliders.json, cars.json, props.json, world.json}`), run `viewer/build.sh` (the Artifact host serves no `.glb`; the page loads base64 `.txt`).
4. Publish with the Artifact tool, `file_path` = `city-clone/viewer/index.html`, `files` = the 4 shared `.b64.txt` + per world `worlds/<w>/{world.json, scene.glb.b64.txt, colliders.json, cars.json, props.json}` (both worlds).
5. Test in headless Chromium with Playwright (software GL): load `?`/`#chinatown`, `window.__city.setManual(true)`, `tick(dt, draw=false)` for logic tests (drawing each frame is ~1 s), `step(dt)` = physics only. Scripted tests live only in the session scratchpad; rewrite from the hooks.
6. Show the user before/after or concept-vs-ours sheets and animated GIFs captured with the stepped sim; commit and push to `main` after each round.

## User decisions and preferences (keep)
- Look: bright stylized low-poly, soft shading, no ink outlines. Target art: `art/coconut-*.png` (esp. coconut-5/6 gameplay angle: oblique ~45-55 deg, north-up). Chinatown art in `art/chinatown-superseded/`.
- Play camera: **45 deg tilt, 44 m zoom**, north-up, follows the car/hero. **No dynamic zoom for pedestrians: people stay small, user is fine with that** (also easier for AI-made models).
- Engine/pipeline: Three.js, Blender scripts for all models, no Godot, no models built purely in Three.js. Sound: basic synthesized effects only.
- "Plan first" on big work, short status updates, before/after comparisons, commit + push to `main`.
- **Feedback on Florida slice 1: too many palm trees; too easy to crash. Reduce palms as the world expands and make driving more forgiving (see Next).**
- Do not ship real brand names (the concept used a real supermarket name; we use PALM MARKET).

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

**Florida pass, first slice (round 6, `art-review/round6/`):** published to the same page, title now "Grand Theft Coconut Creek".
- Page is data-driven: `worlds/<name>/{world.json, scene.glb.b64.txt, colliders.json, cars.json, props.json}`; hash `#chinatown` loads the old block, default is `coconut`. `world.json` holds sky/fog/hemi/sun,
  exposure, lamps, start, scripted traffic loops (axis, lane, dir, speed), walker sidewalk segments, optional fight pair and door demo, view buttons, minimap rectangles, money. Vegetation is instanced
  from `props.json` using `veg.glb` (palms x3, shrubs x2 with flowers, hedge, oak).
- Blender: `textures.py` (grass, stucco tints, terracotta tiles, water, wood, text signs), `vegetation.py`, `building_fl.py` (`make_house`, `make_row` townhomes, `make_plaza` with awnings, signs, tower),
  `street_fl.py` (boulevard with palm median, cross road, sidewalks, crosswalks, parking lot with islands, signals, lamps, street signs), `coconut_scene.py` (layout + exports; `NORENDER=1` to export only).
  Layout (metres, x east / y north): boulevard x=0 (2 lanes each way + 3.2 m palm median), Wiles Rd y=0; NE shopping plaza + 52x33 m lot; NW townhomes (2 rows of 5) + pool + clubhouse; SW two-pond park with fountain,
  bridge (decorative), gazebo; SE city hall + lawn. Store name is the fictional PALM MARKET (concept art used a real chain name; avoid real brands in shipped art).
- Performance work: plain colours are merged into ONE vertex-coloured material per model (`Builder.build(vc=True)`: cars 25 -> 12 draw calls, buildings/terrain similar), people are ONE skinned mesh on an 11-bone
  armature (`make_skinned`, 6 materials), cars beyond 70 m are hidden and beyond 40 m do not cast shadows, walkers likewise, adaptive pixel ratio when fps < 27 for 2 s. Draw calls in the 44 m play view (both
  passes): 608 -> 322; plaza view 240; ~124k triangles. NOT measured on a real phone.
- HUD: cash ($1,250 start, +$25 per knockdown), health bar (hard crashes above 9 m/s cost 2.2%/m/s, regen 1.2%/s, at 0 respawn at the start and lose $100), circular north-up minimap (55 m radius) drawn from `world.map`.
- Tests: all earlier driving/foot tests pass unchanged on `#chinatown`; Coconut: 184 colliders, run up the boulevard clean, wall/plaza/flagpole/shop-front stops, walkers finite.
- Gaps vs concept: no pool water shimmer, no tennis courts/playground, no Publix-style big sign (fictional name), buildings are boxy with simple window geometry, grass is uniform (no flower beds), no
  golf course, bus, school, or varied vehicles (only sedan/taxi recoloured), no cart/bike NPCs, water is a flat textured plane, bridge is decorative (water collider blocks it), far horizon shows a sky/ground gradient.

## Next (in order; user has not yet picked the next phase, ask first)
1. **Forgiving crashes + fewer palms** (user feedback): palms every ~14-18 m instead of 7-9, none on most median stretches; make small things non-lethal (shrubs, bollards, signs, hydrants, lamp poles as pass-through/soft or knock-over with a small slowdown), thinner trunk colliders, more wall sliding (lower restitution/tangent damping near glancing hits), maybe light steering assist. Keep the Tune panel for the user to dial it.
2. **Road layout is too gridded (answered to the user: yes, break it up).** Real Coconut Creek and the concept art have curved neighbourhood streets, cul-de-sacs, rounded corner radii, a roundabout, a diagonal or bending main road. Plan: describe roads as polylines/splines with widths in data, generate asphalt ribbons, curbs, sidewalks and lane markings along them in Blender (with rounded fillets at junctions), export the same graph for traffic paths and the minimap, keep colliders for buildings/props only (cars may mount curbs), UV along the ribbon. Keep the main boulevard roughly straight with gentle bends; rotated buildings are already supported (`rz`). Needs traffic to follow splines instead of axis lanes and walkers to follow polylines.
3. **Pedestrian reactions** (old step 5): flee when punched or when a car is near, cars hit and knock them down, small money/health consequences.
4. **Fill the Florida gaps vs concept**: vehicle variety (SUV, pickup, van, bus, school bus, police cruiser, golf cart via the modular door generator), tennis courts, playground, flower beds, golf course edge, school, varied building shapes, real water look, walkable bridge, signage variety.
5. Police / wanted level, missions (delivery, chase), safehouse; baked lighting/AO and a day-night cycle.
6. Real-phone measurements: fps chip, touch feel, multi-touch (steer + gas), audio, memory. Everything so far is tested in desktop Chromium with software GL only.

## Known gaps / gotchas
See the Step 2, Step 3 and Florida sections above. Highlights: cars ignore pedestrians; parked cars and props are static; hero is invisible while seated; Blender fits lenses to the LONGER image side; clearing a mesh's materials resets face indices (assign after re-adding); `pkill -f name` inside a Bash command kills its own shell; drawing a frame in manual mode costs ~1 s in software GL.
