# tools/script: the game's words, for the author to rework

- `table-script.md`: every line said at the D&D table (title, opening, the quests Dave tells, the clue peeks, the end of Act I), one ID per line. Made by `node tools/script/export.cjs tools/script/table-script.md` (run from `diablo-clone/`; Playwright reads the cinematic scripts from the running game).
- `story-bible.md`: the premise, the world, the cast, every other line of dialogue and in-game text (talk boxes in all their branches, field messages, tracker, banners, signs, place names, bosses, events, legendaries and sets), and the loose threads and inconsistencies. Each line has an ID and each block its source file:line.
- Section 4 of the bible is generated: `node tools/script/story-export.cjs <out.md> [data.json]` (run from `diablo-clone/`). It drives every branch of the in-game talk boxes in Playwright (`game/index.html?cine=0`), reads the quest and name tables, and checks every hand-listed line against `game/js/*.js` (it prints a line count per section and flags anything not found verbatim).
- Sections 1-3 and 5 were written by hand from `NOTES.md`, `art/refs/act2/*.md`, `tools/world/*.json` and the code; the bible was assembled as those sections around the generated section 4.
- To hand edits back: keep each [ID], write CUT to delete, add new lines with IDs like [x.3b], notes in [brackets].
