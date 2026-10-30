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

(none yet: waiting for the first phone test on the test track)
