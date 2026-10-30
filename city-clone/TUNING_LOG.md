# Driving tuning log

The research brief's rule: change one dial per round, by at most 20%, and log the old value, the new value and the complaint in the player's own words.
All dials live in `TUNE_DEF` in `viewer/index.html` (the Tune panel shows them grouped, with units and safe ranges).
"Copy settings + track results" in the Tune panel copies the changed dials and the last test-track runs as text to paste back.

## Baseline (round 24, 30 Oct 2026): values the game used before any tuning

| Dial | Value | Unit | Research starting value |
|---|---|---|---|
| top | 28 | m/s | 26–28 |
| accel | 15 | m/s² | 9 |
| brake | 34 | m/s² | 16 |
| hand | 9 | m/s² | 6 (adds to the brake) |
| lockLow | 28.6 | ° at standstill | 32 |
| lockHigh | 6.9 | ° at top speed (linear between) | 3.5 at 28 m/s; 13 at 10 m/s; 8 at 15 m/s |
| steerIn / steerOut | 5 / 8 | per s | 5 / 8 |
| yawEase | 10 | per s | 12 |
| grip / drift | 8 / 2.4 | per s | 9 / 1.5, with a 13 m/s² cap |
| dead / stickGain | 0.15 / 1.6 | | dead zone 0.10, curve 1.4 |
| bounce / forgive | 0.35 / 0.7 | | wall bounce 0.2 above 8 m/s |
| damage | 0 (off) | | crashes cost speed only |

## Rounds

### Round 27 (30 Oct 2026), after the user's first drive with the follow camera
User's words: "the turning ... can definitely be tuned down a little bit"; "The assist, I didn't notice it, and I seem to stay on the road pretty good. So maybe it's tuned just right"; "I'm okay with you tuning the braking a little bit"; "if you're going very slow ... it shouldn't be able to hit and move the car so hard"; "the impact sends the cars usually straight forward ... I end up just hitting the same car 3 or 4 times in a row ... move them out of the way ... not so far to the side where it looks weird".

| Dial | Old | New | Effect |
|---|---|---|---|
| brake | 34 | 28 (-18 %) | stopping from 61 mph: 11.7 m -> ~14 m |
| lockCurve (new) | 1 (linear) | 0.6 | wheel angle at 10 m/s 20.9 -> 16.9 deg, at 15 m/s 16.7 -> 13.7 deg (-18/-19 %); standstill and top speed unchanged |
| shoveFull / shoveMin (new) | full shove at any speed | full from 12 m/s, 0.2x at a slow bump | 4 m/s bump into a parked car: it moved 0.99 m -> 0.14 m |
| shoveSide (new) | 0 | 0.5 | 15 m/s hit: parked car moved 13.4 m mostly straight ahead (1.6 m sideways) -> 9.8 m with 4.6 m sideways (out of the lane) |
| assist | 0.5 | 0.5 | unchanged ("tuned just right") |

Also: Tune saves now hold only the dials the player moved (old saves held every value, so new defaults never reached the phone).

### Round 31 (30 Oct 2026), Tesla only (per-vehicle multipliers, not a Tune dial)
User's words: "the Tesla doesn't feel like it controls well".

| VSTAT tesla | Old | New | Effect (full lock, arrows) |
|---|---|---|---|
| steer | 1.12 | 1.0 | turn rate at 22 m/s 85 -> 76 deg/s (Jeep 72) |
| grip | 1.15 | 1.35 | slide angle in a full-lock turn 9 -> 7 deg |
| acc | 1.6 | 1.45 | still the quickest car off the line after the bike; top speed unchanged (30.7 m/s) |

### Round 31b (30 Oct 2026), reverse
User's words: "the reverse feels bad too".

| Dial | Old | New | Effect |
|---|---|---|---|
| revAcc (new; was fixed .55) | .55 x accel | .8 x accel (x the car's acc, capped 1.2) | 0 -> 6 m/s backwards: 1.56 s -> 0.85 s |
| revTop | .3 | .35 | reverse top 7.4 -> 8.9 m/s |
| camRev (new) | 0 (camera held still while reversing) | .6 (follows at 60 % rate) | after backing round a 57 deg turn the view was 67 deg off the car (it swung back only when you drove forward); now 16 deg |
