# Playtests
`node tools/playtests/runtest.cjs tools/playtests/<dir>` runs `<dir>/playtest.js` inside the game
page (rAF stubbed, seeded) and writes its screenshots as `<dir>/pt-*.png` (gitignored). `basic.js`
is the original dungeon fight test (copy it into a dir to run). `tools/journey.cjs` is the full
levels 1-12 check. `tools/capture/` holds the sprite-sheet, GIF and profiling scripts used for
before/after pages (some take a game dir argument). `tools/pages/` are the Artifact page sources:
`game-artifact.html` is the phone game page (publish with the js/ files map, see NOTES.md).
