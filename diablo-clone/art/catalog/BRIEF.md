# Brief: research for the "Dungeon of Bones" build catalog

You are one of several researchers. Together you produce the data for a standalone HTML "dossier" that the user's
studio-catalog AI will import. You do RESEARCH ONLY: read files and git history, write ONE JSON file (your output path
is in your task). Do not edit any repository file, do not commit, do not run builds, do not render images.

## Where things are
- MAIN (the latest build, read-only checkout): `/tmp/claude-0/-home-user-Indie-Games/b5cd6639-fe95-57ae-ae57-e37fb9a4e221/scratchpad/main`
  The game is `diablo-clone/` inside it. Key files: `diablo-clone/NOTES.md` (project notes; the table under
  "## Results so far" has one row per build round: `| Round | User request | What changed |`), `diablo-clone/art/ART_LOG.md`,
  `diablo-clone/art-review/roundNN/` (review images per round), `diablo-clone/art/review/<id>/` (art-chat review images),
  `diablo-clone/art/concepts/`, `diablo-clone/game/js/*.js` (the 2D game), `diablo-clone/game3d/` (the 3D remake),
  `diablo-clone/world3d/` (the third-person "World" version).
- ART BRANCH (unmerged art work, newer art than main for some monsters): `/home/user/Indie-Games` is checked out on branch
  `art`. Its `diablo-clone/art/ART_LOG.md` has sections A1..A10, B1..B6, C1, C2, D1, E1, E2. Work on `art` that is not in main
  is NOT in the shipped game yet.
- Git: `git -C <path> log --format='%h %ad %s' --date=short -- diablo-clone` gives commits with dates. Commit subjects
  usually name the round ("round 42b ..."). Use them for dates and commit references.

## The catalog's rules (from the user's studio catalog)
- Every record has a STABLE ID so later updates match. Use exactly these patterns, lower-case, hyphens:
  - rounds: `dob-round-<NNN><letter?>` zero-padded, e.g. `dob-round-007`, `dob-round-042b`
  - assets: `dob-<kind>-<slug>`: kinds `hero`, `gear`, `npc`, `enemy`, `boss`, `spell`, `skill`, `env`, `prop`, `ui`, `audio`,
    `map`, `fx`, `story`, `tool`, `direction`, `concept`, `project`. Slug from the in-game id where one exists
    (e.g. `dob-enemy-skeleton`, `dob-boss-lich`, `dob-spell-cone-of-cold`).
  - versions inside an asset: `<asset id>@v<N>` in date order.
- Fields per record: `id`, `project` (always `"dungeon-of-bones"`), `title`, `kind`, `stage`, `description` (2-4 plain sentences),
  `tags` (array), `addedToGame`, `version`, `dates` ({first, last}, YYYY-MM-DD), `notes`, `source` (files and commits that back it),
  `related` (other record IDs), `images` (see below), and for assets `history` (array of versions, each
  `{id, date, title, change, commits, images, status}`).
- `addedToGame`: `true` ONLY if you verified it is in MAIN's game code AND reachable in play (e.g. a monster that spawns: no
  `minLevel: 99`); `false` if it is in code but does not spawn / is only on the `art` branch / was removed; `"unverified"` if you
  cannot tell. Never assume.
- `status` / approval: distinguish three things and say which: `"commit-says"` (only a commit message or the notes claim it),
  `"tested"` (the notes record a test, capture or check run), `"user-approved"` (the notes quote or report the user approving it,
  e.g. "I like this plan"). If the user disliked or removed something, say so (`"user-rejected"`).
- `stage`: one of `concept`, `in-progress`, `built-not-in-game`, `in-game`, `replaced`, `removed`, `experiment`.
- Studio categories (put the best one in `category`): Characters & Zombies; Weapons; Textures & Decals; Indoor; Outdoor;
  Props & Interactables; Food & Cooking; Animations & Rigs; Audio; Maps & Layouts; Packs & Projects; Art Direction;
  Reference & Documents. Spells, UI, story and bosses are NOT studio categories: put them in tags (`spell`, `ui`, `story`,
  `boss`) and choose the closest category (spell effects -> Animations & Rigs; UI -> Art Direction unless better).
- `images`: an array of `{path, caption, role}` where `path` is an ABSOLUTE path to an existing PNG/JPG/GIF (check it exists with
  ls), `role` is `before`, `after`, `current`, `concept`, `comparison` or `reference`. Prefer images that show the change
  (before/after strips, sheets). At most 4 per record, the most telling ones. Do not invent paths.

## Writing
Plain, short sentences a non-programmer understands. No marketing words. If something is uncertain, say so in `notes`.
Output: one JSON file `{ "records": [ ... ], "openQuestions": [ ... ] }` at the path in your task. Validate it parses
(`python3 -c "import json;json.load(open(PATH))"`). Your final reply: the path, the record count, and anything the assembler
must know (gaps, doubts), in under 150 words.
