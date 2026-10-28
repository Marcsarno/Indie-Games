# Crowd runner / "fake ad game" research

Research pass before building. Written 2026-10-28. Items marked **[sourced]** come from the pages linked at
the bottom; items marked **[inferred]** are my own design reading of the genre and are not verified against
any developer document. Public design documentation for this genre is thin: most sources are ad-tech vendor
blogs, store listings and reviews, so treat numbers as directional.

## 1. What the genre is

Three mechanics get blended in the ads:

1. **Gate runner / crowd runner** (*Count Masters*, *Arrow Fest*, *Mob Control*). You steer or fire a group
   through gates that add, subtract or multiply its size. **[sourced]**
2. **Auto-fire shooter lane.** The squad shoots on its own; you position it. In the playable parody
   *Real War (Not Fake)* you drag the team left/right, shooting is automatic, and you also shoot "fields"
   (number gates) and weapon pickups to grow the squad and firepower. **[sourced]**
3. **Fail-ad framing.** The ad shows a deliberately bad play, a "FAIL", and an implied "you could do better".
   **[sourced]**

The "unlimited army" ads (e.g. *Last War: Survival*, *Whiteout Survival*) are largely ad creative for 4X
base-builders; the real game shows the shooter for roughly the first five minutes and then turns into base
building. **[sourced]** The ads are a bait-and-switch, which is why a *real* version of the ad is something
people find funny and want to play (*Real War (Not Fake)* shipped 2025-11-27 and was covered by press).
**[sourced]**

## 2. Core mechanics to clone

**Gates** **[sourced]** unless noted:
- Positive and negative gates directly change army size; the choice of path is the main skill lever.
- Gate math: add (+N), multiply (xN), subtract (-N). A guide's example: +2 then x3 turns 10 into 60, so
  *order* matters as much as value.
- Gates vary and keep appearing so the player always sees a new decision ahead.
- Exaggerated, instantly-readable visual change per gate (crowd visibly swells or shrinks).
- **[inferred]** Pairs of side-by-side gates with one good and one bad choice teach the mechanic in one
  glance; a "trap" gate (big number, subtract) is the classic mistake the ad characters make.

**Shooting-to-grow** (*Mob Control* / *Real War* style): gates and fields can be shot, not just run through;
number on the gate counts up/down as bullets hit. Special items include speed boosts, multipliers and moving
gates. **[sourced]**

**Weapon unlock behind an obstacle** (the thing you described): weapons scattered on the field are shot to
upgrade them (*Real War*). **[sourced]** Blocking it with a barrier/crate with an HP number is **[inferred]**
from your description of the ads; I could not find a walkthrough confirming the exact ad.

**Enemies and boss:** hordes rush the squad, tires/negative fields punish collisions, each level ends with a
boss. **[sourced]** (from *Real War* coverage). Boss attack patterns/phases are not documented anywhere I
found, so the boss design below is **[inferred]**.

## 3. Level design

- Target about **30 seconds per level**; short levels get chained and lift session length. **[sourced]**
- Show several visible changes within the first ~5 seconds. **[sourced]**
- Controls need little skill; the only real interaction is choosing gates (drag left/right). **[sourced]**
- Reviews of *Arrow Fest* show the failure modes to avoid: **[sourced, anecdotal]**
  - economy outgrows boss HP, so late levels become trivial;
  - the final multiplier zone is too short for big armies;
  - penalty obstacles placed too close together for the unit size;
  - repetitive level content.
- **[inferred] Suggested level template** (one run, ~30-45 s):
  1. Intro lane, 3-5 s: first gate pair teaches "go through the big number".
  2. Gate chain, 8-10 s: +/x pairs with one trap; one moving gate.
  3. Enemy wave, 5-8 s: zombies rush; auto-fire kills them; losses visible.
  4. Weapon crate behind a barrier, 5 s: shoot the barrier down for a gun upgrade.
  5. Final multiplier lane, 3-5 s.
  6. Boss, 8-12 s: boss HP tuned to a "just beatable if you chose well" army size, "unwinnable" if you took
     the trap gate. Clear win/lose state either way.
- **[inferred]** Scale boss HP from the *expected* army size at that point, not from the level number, to
  avoid the *Arrow Fest* trivialization complaint.

## 4. The fail-ad beat sheet (for an attract/demo mode)

Commonly reported structure **[sourced, vendor claims]**: setup, hook, an on-screen hand standing in for the
player, two options with one clearly wrong, the wrong pick, a "FAIL" or visible loss, then an implied
"you could do better". One vendor suggests ~2-3 s of failure followed by ~1 s of the success state; that is
their own claim, not independent research. Severity matters: overly harsh fails may hurt retention.

**[inferred] Plan:** build a scripted **ad mode** that replays the stereotype (squad takes the trap gate,
loses the weapon crate, the boss wipes them, "FAIL") using the same engine as the real game, then drops
into real play. That gives you the joke and the game in one build.

## 5. Technical approach

**Rendering a crowd** (three.js) **[sourced]**:
- Bake animation to a vertex-animation texture and animate in the vertex shader, rendering static meshes
  with `InstancedMesh`; texture count grows quickly with animations x characters x LODs.
- A forum write-up merges all characters into one geometry, one `InstancedMesh`, one draw call, with a
  per-vertex ID so the shader can move head/body/legs separately; fine detail (eyes, stripes) is procedural.
  It reports 240 FPS at 100,000 on the author's desktop; there is **no mobile data**, so phone performance
  must be measured by us.
- Skinned-mesh instancing works but per-instance bone updates were reported slow on mobile; CPU scene
  overhead dominates beyond a few hundred skinned meshes.
- `InstancedMesh` bounding boxes are not computed automatically; compute them for culling.

**[inferred] Our choice:** crowd members are low-poly (a few hundred triangles), a 2-3 pose run cycle baked
as a vertex-animation texture, one `InstancedMesh` per type (soldier, zombie), hard cap ~300-500 visible
soldiers (the number on the HUD can be much larger than the number drawn, which is how the ads do it).
Boss, gun, crates and gates are separate individual meshes.

**Blender, headless** **[sourced]**:
- Run scripts with `blender --background --python script.py` (add `--factory-startup` for reproducible runs).
- Export with `bpy.ops.export_scene.gltf(filepath=..., export_format='GLB')`; operator names differ across
  Blender versions, so confirm against the installed version.
- Only one `import bpy` per process for the pip module, so run separate jobs as subprocesses.

**Environment status:** Blender is **not installed** in this container (`which blender` is empty). I tried
`pip download bpy` to see whether the pip module is an option; see the status note at the end of this file.

## 6. Open questions for the build

1. Camera: top-down vs. behind-the-squad tilted (the ads use a tilted rear view). Recommend tilted rear.
2. Theme: zombies vs. soldiers (the ads use soldiers vs. zombies/mobs). Mock-up art will decide this.
3. One endless mode, a short level set, or both (*Real War* ships endless + adventure).
4. Scope of "real" play beyond the ad: how many levels, whether bosses vary.

## Sources

- [Supersonic: multiplier-gate hyper-casual design](https://supersonic.com/?p=76442)
- [PocketGamer.biz: how to make a successful gate runner game](http://www.pocketgamer.biz/the-method-in-the-madness-how-to-make-a-successful-gate-runner-game/)
- [Mistplay guide to Mob Control](https://www.mistplay.com/blog/how-to-play-mob-control)
- [Notebookcheck: someone made one of those fake ad games (Real War (Not Fake))](https://www.notebookcheck.net/Someone-actually-made-one-of-those-fake-ad-games-and-it-s-pretty-good.1188256.0.html)
- [CrazyGames: Real War Survival Games](https://www.crazygames.com/de/game/real-war-survival-games)
- [Mobile Matters: games that look nothing like their ads](https://mobilematters.gg/guides/gaming/mobile-games-that-look-nothing-like-their-ads)
- [Mistplay Business: false advertising in mobile games / fail ads](https://business.mistplay.com/resources/false-advertising-in-mobile-games/)
- [Rocketship HQ / Kwalee / maf.ad fail-ad search results](https://maf.ad/?p=7742) (vendor blogs; claims unverified)
- [three.js forum: one draw call massive crowd](https://discourse.threejs.org/t/one-draw-call-massive-crowd-performance-engineering-in-three-js/89928)
- [three.js forum: animated instanced skinned meshes](https://discourse.threejs.org/t/animated-instanced-skinned-meshes-gltf/41958)
- [Medium: thousands of animated characters via baked vertex textures](https://medium.com/xrlo-extended-reality-lowdown/how-to-populate-real-time-worlds-with-thousands-of-animated-characters-55830e982c9c)
- [Khronos glTF Blender tutorial](https://github.khronos.org/glTF-Tutorials/BlenderGltfConverter/)
- Arrow Fest App Store reviews (design failure modes), anecdotal.

## Status note

- PyPI lists `bpy` 5.2.3 with a `cp313 manylinux_2_28_x86_64` wheel (~403 MB). This container runs Python
  3.13.17 on x86_64 Linux, so the pip module should install and give a real headless Blender. **Not yet
  verified**: the download was still running when this was written. Fallback if it fails: Blender's own
  Linux tarball from blender.org.
- Not yet confirmed that the proxy allows the download or that glTF export works in the pip build.
- Zombie and people assets now exist locally: see `ASSETS.md` (copied from your `yola-zombie` repo).
