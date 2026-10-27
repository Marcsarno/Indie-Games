# Pixel-Art Animation Craft and Game Feel for Action-RPG Combat, Implemented Procedurally

Context: indie 2D isometric Diablo-style mobile game. Characters are code-drawn: parameterized pose functions are re-drawn every frame, characters are about 43 px tall, with 2 facings now and 8 planned. Research done October 2026.

Reliability legend:
- **[DOC]**: primary or developer source, or a well-documented engine fact.
- **[COMM]**: community wiki or datamined value.
- **[ANEC]**: generic blog, aggregator, or forum claim that I could not verify against a primary source.

---

## Q1. Attack animation structure: anticipation, action and recovery; smears; impact and hold frames; cancel windows

### Takeaway
The best concrete low-res reference found is Slynyrd's Pixelblog 56. It builds a top-down 8-direction attack from 6 drawn poses, with per-frame timings of 400 ms total for a sword, 550 ms for a spear and 800 ms for a hammer. Weight comes almost entirely from how long the single anticipation frame and the single follow-through frame are held. The smear frames between them run at a flat 50 ms each. Diablo II formalises this structure as frames before the "action frame", the action frame itself, and the remaining frames, all on a 25 fps clock. Shortening animations by whole frames is how Diablo II's attack-speed stat works.

### Cited Findings

**Slynyrd Pixelblog 56, top-down character attack in 8 directions [DOC: artist tutorial, concrete numbers]**
- Every attack is 6 frames in all 8 directions. The phases are anticipation, smear, rebound (hammer only), follow-through and recover. Each weapon uses 4 or 5 of these phases. — [Slynyrd Pixelblog 56](https://www.slynyrd.com/blog/2025/5/23/pixelblog-56-top-down-character-attack-animation)
- Per-frame timings in ms. My mapping of frames to phases is inferred from the phase descriptions; the article does not state it frame by frame. — [Slynyrd Pixelblog 56](https://www.slynyrd.com/blog/2025/5/23/pixelblog-56-top-down-character-attack-animation)

  | Weapon | Anticipation | Smear / rebound | Follow-through | Recover | Total |
  |---|---|---|---|---|---|
  | Sword | 100 | 50, 50, 50 | 100 | 50 | 400 ms |
  | Spear | 200 | 50, 50, 50 | 150 | 50 | 550 ms |
  | Hammer | 250 | 50, 50 (smear) + 50 (rebound) | 300 | 100 | 800 ms |

- Anticipation is a single frame with a variable delay. A longer wind-up hits harder but adds input delay. — [Slynyrd Pixelblog 56](https://www.slynyrd.com/blog/2025/5/23/pixelblog-56-top-down-character-attack-animation)
- Follow-through is one frame, held longer to show commitment. It moves the weapon one more pixel into the target and has no smear. — [Slynyrd Pixelblog 56](https://www.slynyrd.com/blog/2025/5/23/pixelblog-56-top-down-character-attack-animation)
- Recover is one frame between follow-through and the first idle frame. It can be held slightly longer for heavy weapons. — [Slynyrd Pixelblog 56](https://www.slynyrd.com/blog/2025/5/23/pixelblog-56-top-down-character-attack-animation)
- Smear shapes are chosen per weapon. Sword smears are angular, for strong motion and a solid-weapon feel. Hammer smears are sharp and geometric, to read as impact. — [Slynyrd Pixelblog 56](https://www.slynyrd.com/blog/2025/5/23/pixelblog-56-top-down-character-attack-animation)
- Do not put smears on anticipation or recover frames, because "it noisily distracts from the forwards striking movement". — [Slynyrd Pixelblog 56](https://www.slynyrd.com/blog/2025/5/23/pixelblog-56-top-down-character-attack-animation)
- The hammer uses a rebound frame plus screen shake to sell its weight. — [Slynyrd Pixelblog 56](https://www.slynyrd.com/blog/2025/5/23/pixelblog-56-top-down-character-attack-animation)
- In 8 directions the weapon stays in the same hand, so each angle shows a different view. The idle grip carries into the attack: the spear is held underhand and the sword upright. — [Slynyrd Pixelblog 56](https://www.slynyrd.com/blog/2025/5/23/pixelblog-56-top-down-character-attack-animation)

**Slynyrd Pixelblog 9, melee attacks, side view [DOC: artist tutorial, qualitative]**
- "Usually a single smear frame can get the job done." Smears should be "few and fast" and follow a natural path from stance to follow-through. — [Slynyrd Pixelblog 9](https://slynyrd.com/blog/2018/9/8/pixelblog-9-melee-attacks)
- "Adding color gradation to a smear can enhance the smoothness without adding extra frames." — [Slynyrd Pixelblog 9](https://slynyrd.com/blog/2018/9/8/pixelblog-9-melee-attacks)
- Hold the anticipation pose for a few extra frames, and sometimes the impact frame of a strong collision. Keep it subtle. — [Slynyrd Pixelblog 9](https://slynyrd.com/blog/2018/9/8/pixelblog-9-melee-attacks)
- Overshoot: after the recovery frame, shift the stance 1 px for one frame. "The faster the motion, the greater the overshoot." — [Slynyrd Pixelblog 9](https://slynyrd.com/blog/2018/9/8/pixelblog-9-melee-attacks)
- Lengthen the arm or weapon slightly at maximum extension, for a looser feel and more reach. — [Slynyrd Pixelblog 9](https://slynyrd.com/blog/2018/9/8/pixelblog-9-melee-attacks)
- The example sword arc covers 90°, from above the head to straight ahead. Wide-arc weapons should be slow and powerful; narrow-arc weapons fast and weaker. Heavy weapons get slower anticipation and recovery than light ones. — [Slynyrd Pixelblog 9](https://slynyrd.com/blog/2018/9/8/pixelblog-9-melee-attacks)
- "Most pixelart games keep it snappy and can get away with even fewer frames than my examples." — [Slynyrd Pixelblog 9](https://slynyrd.com/blog/2018/9/8/pixelblog-9-melee-attacks)

**Dead Cells (Thomas Vasseur, "Art Design Deep Dive") [DOC]**
- In-game characters are about 50 px tall, which is close to this project's 43 px. Animation is pose-to-pose: keyframes come first, at "the least amount of frames possible". Interpolation frames are added only before or after keyframes, never in between, once the timing is convincing. — [Game Developer: Dead Cells 3D pipeline](https://www.gamedeveloper.com/production/art-design-deep-dive-using-a-3d-pipeline-for-2d-animation-in-i-dead-cells-i-)
- Timing is tuned by moving keys on a timeline ("dozens of times in minutes"). One overpowered weapon was nerfed by slowing its attack animation. — [Game Developer: Dead Cells 3D pipeline](https://www.gamedeveloper.com/production/art-design-deep-dive-using-a-3d-pipeline-for-2d-animation-in-i-dead-cells-i-)
- Frames are rendered small with no antialiasing, with a toon shader driven by normal maps. VFX carries much of the "sense of movement, impact and strength". Flickering pixels remained an unsolved problem. — [Game Developer: Dead Cells 3D pipeline](https://www.gamedeveloper.com/production/art-design-deep-dive-using-a-3d-pipeline-for-2d-animation-in-i-dead-cells-i-)
- The article gives no per-attack frame counts. An aggregator figure of "24–30 frames for major actions" is unverified [ANEC]. — [halabaojia aggregator](https://halabaojia.pages.dev/collection/20251114-dead-cells-pixel-art-animation-masterclass)

**Diablo II: action-frame model and 25 fps clock [COMM, documented by the community and long-standing]**
- The engine and its animations run at 25 fps. Blizzard's Bashiok is quoted as saying the animations were rendered at 25 fps. — [Diablo Wiki FPS](https://diablo2.diablowiki.net/FPS) (page returned 403 to fetch; content taken from the search snippet); [Maxroll attack speed](https://maxroll.gg/d2/resources/attack-speed)
- Each animation has frames-per-direction (FPD) set by class and weapon type, with special cases such as Smite at a fixed 12 FPD. One frame is flagged as the "action frame". The hit or missile resolves when playback reaches that frame, and the remaining frames are recovery before the next action can start. — [D2R IAS calculations](https://d2r-ias-calculator.pages.dev/calculations); [Lurker Lounge](https://lurkerlounge.com/forums/printthread.php?tid=7915); [Maxroll breakpoints](https://maxroll.gg/d2/resources/breakpoints-animations)
- Increased Attack Speed (IAS) shortens frames-per-attack. Breakpoints happen when one whole 1/25 s frame is removed. — [Maxroll breakpoints](https://maxroll.gg/d2/resources/breakpoints-animations)

**Cancel windows [DOC-ish: design essay]**
- In Street Fighter 2, the first 5 frames of every normal were cancellable. Hitstop froze both characters for "like 10 frames", which extended the cancel window after a hit. Hitstop can also act as a dedicated cancel window that always resolves at the same point in the move, which keeps combos consistent. — [critpoints: Hitstop](https://critpoints.net/2017/05/17/hitstophitfreezehitlaghitpausehitshit/)

**Anticipation and input lag [ANEC]**
- Too much anticipation "will give a nasty feeling of input lag". — [Uppsala student blog](https://babel.speldesign.uu.se/?p=21926)
- Saint11 (Pedro Medeiros) is credited second-hand with melee "overshoot" and fan-shaped colour smears in place of a crisp weapon. I did not find his original page. — search summary via [163.com](https://c.m.163.com/news/a/KM84CU2T0526K8VB.html)
- An unverified blog claims Hades uses about 10 frames of windup on every attack [ANEC]. — [gamedo-live](https://gamedo-live.pages.dev/news/game-feel-juice-guide-indie-devs)

### Inferences
- Recommended timing tables for this game, adapted from Slynyrd's 400/550/800 ms. Stepped poses, with the hit resolving at the first frame of the follow-through, which plays the role of Diablo's action frame:
  - Light (dagger/sword): anticipation 80–100 ms, then 2–3 smear frames × 33–50 ms, then contact plus hitstop, follow-through 100 ms, recover 50–80 ms. About 350–400 ms total.
  - Heavy (hammer/axe): anticipation 200–250 ms, 2 smears × 50 ms, rebound 50 ms, follow-through 250–300 ms, recover 100 ms. About 700–800 ms total.
  - Attack speed should scale the anticipation and recovery holds first. The smear frames are already at the 33–50 ms perceptual floor, which follows Diablo's whole-frame-removal model.
- Make the hit frame data: put an `actionFrame` or `hitTime` on each attack definition so that damage, hitstop, VFX and SFX all fire from the same timestamp. Allow input buffering and cancel during recover, and optionally during hitstop.
- Smear as code. On each smear frame, draw a filled crescent or arc wedge (an annulus sector) from the previous weapon-tip angle to the current one, using a 2–3 step colour ramp: white or pale tint at the leading edge fading to the weapon colour or a darker trailing edge (Slynyrd's "colour gradation"). Use angular, polygonal wedges for blades and blocky geometric shapes for blunt weapons. Skip the smear on anticipation and recover frames.
- For mobile tap-to-attack, keep anticipation at 100 ms or less for the basic attack so it never feels laggy. Put the weight into the post-contact hold instead.

### Gaps
- No primary frame-by-frame breakdowns were found for Hyper Light Drifter, Blasphemous, Hollow Knight, Hades, Children of Morta, Enter the Gungeon or Diablo 4. The Hades and HLD numbers in circulation come from generic blogs.
- No primary Dead Cells "Building the Combat" talk numbers were found. The Vasseur article does not give anticipation frame counts.
- Saint11's original attack and smear tutorial was not retrieved.
- The Diablo II per-class FPD table was not retrieved. It needs datamined data, for example from the Basin wiki.

---

## Q2. Hit reactions and game feel: hitstop, screen shake, flash, knockback, damage numbers, stagger, death

### Takeaway
Hitstop should freeze both attacker and victim. Sakurai's eight Smash techniques give a concrete recipe for making the freeze look alive: shake the victim with decaying amplitude, horizontally on the ground, while the attacker keeps creeping slightly. Smash scales hitlag with damage, with caps of 20–30 frames at 60 fps. Screen shake should follow Eiserloh's trauma model: trauma between 0 and 1 decays linearly, shake = trauma² (or ³), and offset and rotation come from smooth noise rather than random jumps. Hit-flash, knockback and damage-number numbers for Diablo and Hades were not found in primary sources. The common practice is a 1–2 frame white flash and a knockback of about 120 ms (a Vampire Survivors wiki value, marked unverified there).

### Cited Findings

**Hitstop (hitlag)**
- Sakurai, Famitsu column via fan translation: hitstop is frozen frames that emphasise the power of a hit, sometimes with screen shake on strong moves. It is distinct from hitstun, which is how long the victim cannot act. — [Source Gaming: Sakurai on hitstop](https://sourcegaming.info/2015/11/11/thoughts-on-hitstop-sakurais-famitsu-column-vol-490-1/)
- Sakurai's 8 hitstop techniques (Masahiro Sakurai on Creating Games, 2022). — [Nintendo Wire summary](https://nintendowire.com/news/2022/12/12/this-week-in-sakurai-12-5-12-11-fine-tuning-hit-stop-and-cheating-the-system/); [GoNintendo](https://www.gonintendo.com/contents/13581-sakurai-s-latest-game-dev-video-features-8-hit-stop-techniques)
  1. Shake the character who was hit, more than the attacker.
  2. Don't move the hitbox during the freeze.
  3. Shake horizontally on the ground and vertically in the air.
  4. Decay the shake gradually.
  5. Control the amount of hitstop per move.
  6. Interpolate frames into the damage pose.
  7. Keep the attacker moving slightly during the freeze.
  8. Scale shake by camera distance.
- Smash hitlag is a function of damage. A 15% move gives 10 frames in Smash 64, 8 in Melee, 10 in Brawl and Smash 4, and 15 in Ultimate. The cap is 20 frames in Melee and 30 frames from Brawl on. [COMM] — [SSB Wiki: Hitlag](https://www.ssbwiki.com/Hitlag)
- In Smash, characters vibrate during hitlag, horizontally on the ground and vertically in the air. Leaving out hitstop weakens impact and readability; Dark Souls 2 is cited as an example. — [critpoints: Hitstop](https://critpoints.net/2017/05/17/hitstophitfreezehitlaghitpausehitshit/)
- Generic blog ranges at 60 fps [ANEC]:
  - 2–3 frames for light weapons, 4–6 for medium, 6–10 for heavy. — [uhiyama-lab](https://uhiyama-lab.com/en/notes/unity/unity-game-feel-hit-feedback/) (search snippet)
  - Another guide gives 5–8 frames for medium hits and 12–20 for boss slams and finishers. It also warns that freezing only the target looks like a "hiccup", so freeze both. — [gamejuice: hit-stop frame trick](https://gamejuice.pages.dev/articles/hit-stop-frame-trick) (search snippet)
  - "Dead Cells pauses 2–3 frames on contact" and "HLD dashes pause ~4 frames on enemy contact" are both unverified. — [freegamesprites](https://freegamesprites.com/es/news/game-feel-2d-combat-juice-tricks) (search snippet)

**Screen shake**
- Eiserloh, GDC 2016 "Math for Game Programmers: Juicing Your Cameras With Math": the session covers camera framing and screen shake. — [GDC Vault](https://gdcvault.com/play/1023146/contactUs)
- Trauma model as implemented by derivative libraries [DOC for the libraries; derived from the talk]:
  - Gameplay adds trauma in [0, 1]; trauma decays linearly; visible shake = trauma^exponent, so small hits barely register and large ones hit hard. The Strayspark Godot add-on defaults to a full-trauma 2D offset of (12, 12) px. — [Strayspark docs](https://www.strayspark.studio/docs/godot-camera-system/noise-and-shake)
  - The npm `screen-shake` package, "based on the talk", uses Perlin noise with `maxAngle` 10, `maxOffsetX/Y` 30 and trauma reduction 0.02 per update as defaults. — [npm screen-shake](https://www.npmjs.com/package/screen-shake)
  - Bevy's official 2D screen-shake example has separate noise seeds per channel, plus `max_angle`, `max_translation`, a decay rate, an exponent and a noise speed. — [Bevy 2D screen shake](https://bevy.org/examples/camera/2d-screen-shake/)
- Squared trauma is common: at 0.5 trauma the shake is only 25% of full strength. — [Strayspark](https://www.strayspark.studio/docs/godot-camera-system/noise-and-shake); [Godot asset "shake = stress^2"](https://godotengine.org/asset-library/asset/735)
- Nijman, "The Art of Screenshake" (Control Conference / INDIGO 2013): he takes a dull shooter through about 30 small tweaks. The two documented examples are screen shake slightly opposite to the direction of gunfire (recoil kick) and a 33% chance that enemies explode harmlessly on death. — [Game Developer: Vlambeer advice](https://gamedeveloper.com/design/vlambeer-co-founder-shares-advice-on-building-better-action-games)
- Jonasson & Purho, "Juice it or lose it": they take a breakout clone and layer on tweening, squash and stretch, particles, screen shake, sound and animation. — [gamejuice resource summary](https://gamejuice.pages.dev/resources/juice-it-or-lose-it)

**White flash, knockback, damage numbers [ANEC / COMM]**
- The white flash typically turns the enemy solid white for 1–2 frames on hit; one guide suggests 2 frames. This is a generic recommendation. — [uhiyama-lab](https://uhiyama-lab.com/en/notes/unity/unity-game-feel-hit-feedback/) (search snippet)
- Vampire Survivors knockback lasts 120 ms, reversing and scaling enemy movement speed for that window. The wiki itself tags this "[Verify]". — [VS Wiki: Knockback](https://vampire-survivors.fandom.com/wiki/Knockback)
- A Steam user, citing the fan wiki, says Vampire Survivors damage numbers are randomised by about ±5 for display. — [Steam discussion](https://steamcommunity.com/app/1794680/discussions/0/3194745319522730122)

### Inferences
- **Hitstop recipe.** Use 0 ms for trash mobs hit by fast AoE. Otherwise 50 ms (3f@60) for light, 80–100 ms (5–6f) for heavy, 120–200 ms for crits, kills and boss slams. Scale with damage relative to the target's max HP, and cap it. Freeze the animation clocks of both attacker and victim, and keep rendering. Each frame of the freeze, offset the victim by `±A·(1 − t/T)` px, alternating sign each frame:
  - **A** = 1–2 px at 43 px character height.
  - **Direction**: along the screen X axis, which reads as "ground" in isometric.
  - **Attacker**: lets their pose advance at about 10% speed (Sakurai #7).
- **Crowd hitstop.** With many enemies on screen (Diablo-like crowds), apply hitstop per entity, not globally. Or allow a global freeze only on crits, kills and big hits, and limit it to about one global freeze per 250 ms so AoE doesn't turn into stutter.
- **Shake.** Trauma: +0.1 light hit taken, +0.25 heavy hit, +0.4–0.6 boss slam, decay about 1.5–2.0 per second. Shake = trauma². Offset = maxOffset (4–6 screen-px at native res) × shake × noise(t·25 Hz). Add rotation only if the renderer rotates cleanly; at low res, translation only is safer. Round the final camera offset to whole native pixels. Keep shake mostly for when the player is hit or for big slams; shaking on every player hit gets tiring on mobile. A 1–2 px directional kick works well for player attacks (Nijman's opposite-direction shake). Respect a "reduce screen shake" setting.
- **Flash.** Use 1 frame of a solid-white silhouette at 60 fps, or about 50 ms. A code-drawn renderer can implement it by swapping the palette to white in the pose function. Follow with 1–2 frames of a tint lerp back for heavy hits.
- **Knockback.** 100–150 ms, using easeOutQuad (or exponential decay) velocity, for 3–8 px on light hits. Stagger: drive an interpolated "hurt" pose (Sakurai #6) for 150–250 ms. Use a "poise" counter so not every hit staggers.
- **Damage numbers.** Pop: scale 1.3→1.0 over 80 ms, then rise 8–12 px over about 600 ms with easeOutCubic, fading out over the last 200 ms. Add a small random X jitter so stacked numbers don't overlap. Crits get a larger size and a colour ramp. These values are common practice, not from a cited source.
- **Death.** For code-drawn characters, cheap and strong options:
  - (a) Use a heavy hitstop on the killing blow. Then launch the corpse with a knockback impulse along the hit vector, and rotate the pose's root from 0 to 90° in 2–3 steps (collapse). Settle with a 1 px bounce.
  - (b) Dissolve. Use per-pixel dithered erasure driven by a precomputed Bayer threshold (pixels are stable because the threshold is per-pixel, not random each frame), with a brief white or ember edge colour.
  - (c) Gib. Spawn 4–8 parametric limb or bone particles with gravity and ground friction, then let them persist.
  - Diablo-style persistent corpses can be baked into a ground layer to save per-frame draw cost.

### Gaps
- Exact numbers from Eiserloh's slides were not verified: his recommended exponent (I recall "trauma² or trauma³"), max angle and offset values, and whether he prefers rotational shake in 2D.
- Nijman's full list of about 30 tweaks was not verified. From recollection, but unverified: animation on hit, hit flash, knockback, "sleep" (a frame freeze on hit, often quoted as about 20 ms), "permanence" (shells and corpses stay), camera lerp and kick, muzzle flash, and bigger bullets.
- No primary sources were found on Diablo 1, 2 or 4 hit flash, stagger, death or corpse-persistence implementation. Corpse rules, such as the corpse count limit in Diablo II, were not researched.
- No primary hitstop numbers were found for Hades, Dead Cells, Hollow Knight or HLD.

---

## Q3. Locomotion: walk and run cycles at low frame counts, bob, secondary motion, foot sliding, 8-direction turning

### Takeaway
Few retrievable primary sources were found in this pass; the Slynyrd walk-cycle post returned 404. The concrete points below are mostly established animation practice, and the inferences are labelled as such. What is documented: Dead Cells-style pose-to-pose keys come first, Diablo II runs everything on a 25 fps clock, and 8-direction top-down characters keep a consistent handedness per direction.

### Cited Findings
- Keyframes first, at the fewest frames possible; in-betweens are added only before or after keys. This applies to walks as much as attacks. — [Game Developer: Dead Cells 3D pipeline](https://www.gamedeveloper.com/production/art-design-deep-dive-using-a-3d-pipeline-for-2d-animation-in-i-dead-cells-i-)
- In 8 directions the weapon stays in the same hand, so each direction shows a different view. This is a constraint for mirroring: mirroring flips handedness. — [Slynyrd Pixelblog 56](https://www.slynyrd.com/blog/2025/5/23/pixelblog-56-top-down-character-attack-animation)
- Diablo II animates on a 25 fps base, and animations are per-direction frame sets. — [Maxroll attack speed](https://maxroll.gg/d2/resources/attack-speed)

### Inferences
These are standard animation practice and not source-verified here, except where noted.
- **Gait phase.** Drive the gait by distance travelled, not by time. Use `phase = distance / strideLength`, so feet don't slide at any speed, including slowed or hasted movement. With 8 poses per stride, a 43 px character has a stride of about 12–16 px. Quantise the phase to N steps (6 or 8) for the pixel look.
- **Key poses per half-cycle.** Contact (legs spread, body at its lowest +0), Down (lowest, 1 px down), Passing (legs cross, body back up), Up (highest, 1 px up). An 8-frame cycle is C-D-P-U ×2 and a 6-frame cycle drops Down or Up. Bob is 1 px for a walk and 1–2 px for a run. The run adds a flight frame where neither foot touches, a forward lean of 1–2 px at the head, and a larger arm swing.
- **Secondary motion.** Cloaks, plumes and hair use a spring (see Q4) that follows the body anchor with lag, rendered quantised to whole pixels. Driving cloak sway from the gait phase plus a spring on velocity gives a stable, readable result.
- **Turning in 8 directions.**
  - Snap facing instantly for responsiveness, or step through the intermediate facing for one frame of about 33–50 ms.
  - Use hysteresis on the angle (for example ±5° past the 22.5° sector boundary) so diagonal input doesn't flicker between facings.
  - With 2 facings now, mirroring is fine. With 8, compute E, NE, N, SE and S and mirror W, NW and SW. Watch handedness (Slynyrd: the weapon stays in the same hand).
- **Isometric.** Move in screen space using the 2:1 iso ratio. Diagonal screen movement gets the cleanest pixel steps.

### Gaps
- Slynyrd's walk-cycle pixelblog (the URL tried returned 404) and Saint11's walk and run tutorials were not retrieved. No sourced per-frame ms values for pixel walk cycles were found; a common practice is about 100–150 ms per frame for a walk, which is unverified.
- No sources were found on how Diablo, Hades or Children of Morta handle 8-direction turning or foot-slide avoidance.

---

## Q4. Procedural animation techniques: springs, easing, squash and stretch, sub-pixel, IK, recoil, breathing; pixel stability

### Takeaway
The most reusable single tool is t3ssel8r's second-order dynamics. It is one function, with intuitive parameters f (Hz), ζ (damping) and r (initial response), and a built-in stability clamp. It drives every secondary motion: cloak, weapon lag, recoil, squash recovery and camera follow. Dead Cells reports pixel flicker in low-res renders of computed poses as an unsolved problem. Pixel stability requires snapping to the native grid as the final step and changing poses in discrete steps.

### Cited Findings
- t3ssel8r, "Giving Personality to Procedural Animations using Math": a second-order system with parameters f (natural frequency), ζ (damping) and r (initial response). ζ < 1 vibrates, ζ > 1 settles smoothly, r > 1 overshoots (anticipation-like snap), and r < 0 anticipates (moves opposite at first). The video also derives a maximum stable timestep. — [recapio summary](https://recapio.com/digest/giving-personality-to-procedural-animations-using-math-by-t3ssel8r); [chemicalcrux docs](https://chemicalcrux.github.io/vrc-docs/docs/code/best.crux.animator-dynamics/sources/second-order-dynamics)
- Reference implementation, from a public Godot C# gist of the method; the licence is not stated, so reimplement rather than copy:
  ```
  k1 = z / (PI * f)
  k2 = 1 / ((2*PI*f)^2)
  k3 = r * z / (2*PI*f)
  // per update with target x, target velocity xd (estimate (x - xp)/dt if unknown)
  k2_stable = max(k2, dt*dt/2 + dt*k1/2, dt*k1)
  y  += dt * yd
  yd += dt * (x + k3*xd - y - k1*yd) / k2_stable
  ```
  — [Andicraft gist](https://gist.github.com/Andicraft/ab605dda924a0321e755abf8f573ebd7)
- Dead Cells renders tiny frames with no antialiasing, and "flickering pixels" remained an unsolved problem that the team accepted in exchange for speed. — [Game Developer: Dead Cells 3D pipeline](https://www.gamedeveloper.com/production/art-design-deep-dive-using-a-3d-pipeline-for-2d-animation-in-i-dead-cells-i-)
- Squash and stretch gives weight and volume; too little looks stiff. The extremes are keyed and the in-betweens interpolated. — [Wikipedia: Squash and stretch](https://en.wikipedia.com/wiki/Squash_and_stretch)
- Sub-pixel camera and sprite jitter comes from mixing two grids. The fix is to snap the buffer and positions to the pixel grid. [ANEC forum] — [Kirupa forum](https://forum.kirupa.com/t/best-way-to-stop-subpixel-jitter-in-a-pixel-art-canvas-camera/681011)
- Overshoot of 1 px for one frame after fast motion. — [Slynyrd Pixelblog 9](https://slynyrd.com/blog/2018/9/8/pixelblog-9-melee-attacks)

### Inferences
- **Suggested f/ζ/r presets** (starting points, not sourced):

  | Use | f (Hz) | ζ | r |
  |---|---|---|---|
  | Cloak or plume tip | 2–3 | 0.4–0.6 | 0 |
  | Weapon trail lag | 4–6 | 0.7 | 1 |
  | Body recoil on hit | 6–8 | 0.35 | 2 (snappy overshoot) |
  | Squash recovery | 5 | 0.3 | 0 |
  | Camera follow | 1.5–2.5 | 1.0 | 0 |

  Run springs on a fixed timestep (for example 60 Hz), separate from the render rate.
- **Easing.** Use easeOutCubic or easeOutQuint for strikes and knockback (fast start, soft stop), and easeInQuad for anticipation pull-back. easeOutBack works for UI pops and damage numbers. Use a spring with ζ around 0.3–0.5 for any settle or wobble. Avoid easeInOut on attacks, because it delays the read of the contact.
- **Squash and stretch at 43 px.** Limit it to about ±1–2 px on the body's height (roughly 5%) and preserve area (width × height roughly constant). At this size, 1 px of squash on landing or on the hit frame is enough. More than about 3 px tends to read as melting or wobbling. Apply it to the torso and head anchor offsets rather than scaling the whole sprite, to avoid resampling artifacts.
- **Pixel stability for computed poses.**
  1. Compute in float, then quantise every joint and anchor position to integers once, right before drawing (round, not floor, and consistently).
  2. Quantise animation time to steps (see Q5) so poses change at discrete moments instead of creeping by sub-pixels each frame, which causes shimmer.
  3. Draw limbs with a fixed line algorithm such as Bresenham from integer endpoints, so the same pose always gives the same pixels.
  4. Add hysteresis on quantised values: only move a joint's pixel when the float has moved more than 0.6 px past the current integer. This prevents 1 px flicker on near-stationary springs such as idle breathing.
  5. Render at native resolution to an offscreen buffer and integer-scale it with nearest neighbour.
  6. Snap the camera to whole native pixels. Optionally do smooth sub-pixel camera scrolling by offsetting the upscaled buffer, which is a known technique but not sourced here.
- **IK foot planting.** In top-down isometric at this size, full IK is mostly unnecessary. Planting feet by driving the gait by distance (Q3) gives most of the benefit. If you do use it, two-bone analytic IK (law of cosines) with integer-snapped output is enough.
- **Procedural recoil.** On the action frame, apply an impulse to a "torso offset" spring opposite to the strike direction (1–2 px), and a small one toward the hit on the victim. Combined with hitstop and shake, this gives the same impact feel as Nijman's kickback.
- **Idle breathing.** A sine wave with a period of about 2–3 s, with an amplitude of 1 px on the chest and shoulders only, not the feet. Quantise it to 2 states (in/out) or 3 states, with hysteresis. A continuously moving 0.5 px float causes shimmer.

### Gaps
- I could not retrieve t3ssel8r's own recommended parameter values, only the formulas.
- No primary source covered squash-and-stretch limits specific to low-res pixel art; the limits above are my inference.
- No primary sources were found on procedural or code-drawn pixel character jitter mitigation in shipped games, beyond the Dead Cells admission.

---

## Q5. Frame rate: stepped 12 fps ("twos") vs 60 fps interpolation for pixel art

### Takeaway
Pixel art is conventionally animated at about 12 fps, which is "on twos" against 24 fps. Engines are routinely set to stepped interpolation for pixel sprites, because tweening sub-pixel changes produces mushy, shimmering results. Shipped references are Diablo II at 25 fps, the Dead Cells prototype at 30 fps animation, and Hyper Light Drifter, which shipped at 30 fps and needed a large manual retiming to support 60. For code-drawn poses, the best approach is to step the pose clock while keeping input, physics, springs and camera at 60 Hz.

### Cited Findings
- 12 fps is treated as the standard starting point in pixel-art communities and tutorials. Drawing "on twos" means holding each drawing for 2 frames at 24 fps. [ANEC: vendor blog] — [Divoom: Pixel Art Animation FPS](https://divoom.com/blogs/setup-ideas/pixel-art-animation-frame-rate)
- Spine's editor interpolates sub-pixel changes unless playback is set to "Stepped", which is an issue for pixel-perfect animation. For Unreal, the advice is to switch interpolation from linear to step and author at about 12 fps. [ANEC: forums] — [Esoteric Software forum](https://de.esotericsoftware.com/forum/d/3554-issues-with-quotpixel-perfectquot-animation); [Unreal Answers](https://answers.unrealengine.com/questions/912533/view.html)
- Diablo II animations were rendered at 25 fps, and the game's timing units are 1/25 s frames. [COMM] — [Maxroll attack speed](https://maxroll.gg/d2/resources/attack-speed); [D2R IAS calculations](https://d2r-ias-calculator.pages.dev/calculations)
- Dead Cells' earlier ScarKrow prototype reached 30 FPS for its animations using the 3D-to-pixel pipeline. — [Game Developer: Dead Cells 3D pipeline](https://www.gamedeveloper.com/production/art-design-deep-dive-using-a-3d-pipeline-for-2d-animation-in-i-dead-cells-i-)
- Hyper Light Drifter shipped at 30 fps; a later patch added 60 fps. The studio reported combing "through over 115 thousand lines of code" and manually retiming each object and enemy, because GameMaker step-based timing tied logic such as dash i-frames to frame rate. — [PCGamesN](https://www.pcgamesn.com/hyper-light-drifter/hyper-light-drifter-60fps-patch); [Cliqist](https://cliqist.com/2016/09/30/ready-publish-new-hyper-light-drifter-update-adds-60fps-boss-rushing/); [Steam discussion](https://steamcommunity.com/app/257850/discussions/0/357284131785660700)
- Learned and algorithmic in-betweening for pixel art exists in research, for example Rutherford's thesis "Interpolating Pixel Art", which indicates naive interpolation is not adequate. — [GMU: Interpolating Pixel Art](https://mars.gmu.edu/handle/1920/11466)

### Inferences
- **Two clocks.**
  - Simulation, input, hit detection, springs, particles, camera and shake run at a fixed 60 Hz, in ms, never in frames, to avoid HLD's retiming problem.
  - The pose clock samples the pose function only at stepped times, for example `tPose = floor(t / step) * step`.
  - Use a variable `step` per animation segment:
    - Smear frames: 33–50 ms ("ones" at 30 or 20 fps), so fast arcs read.
    - Walk and idle: about 83–125 ms (12 or 8 fps).
    - Holds (anticipation, follow-through): explicit durations from the Q1 table.
  - This is exactly what Slynyrd's per-frame ms table encodes: the pose function becomes a list of (pose parameters, hold ms) keys.
- **Why step.** Stepping makes each pose a deliberate, readable silhouette (pose-to-pose, as in Dead Cells). It stops limbs crawling 1 px at a time, which is the shimmer problem. It also concentrates motion into big pose changes, which makes action read as faster.
- **Where to use 60 fps smoothness.** Use it for things that aren't the character's silhouette: world-space translation of the whole character (snapped to pixels), camera, particles, damage numbers, and smear-wedge VFX. Hitstop then simply pauses the pose clock and the knockback integrator while rendering continues at 60 fps with the shake offset.
- **Mobile.** Lock the simulation at 60 Hz with accumulation. If the device drops to 30 fps, the stepped poses look identical, because every pose step is at least 33 ms. This is a robustness advantage of stepping.

### Gaps
- No primary statements were found from pixel-game developers (Motion Twin, Heart Machine, The Game Kitchen, Supergiant, Dodge Roll) explaining why they step animation or what per-frame hold times they use.
- No measured data were found on perceived responsiveness for stepped vs interpolated animation.
