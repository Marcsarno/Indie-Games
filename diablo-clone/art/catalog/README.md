# Dungeon of Bones: build dossier (for the studio catalog)

`dungeon-of-bones-dossier.html` is the hand-off: one standalone page (about 12 MB, no network needed) that a person can
read and a catalog AI can import. Generated 2026-11-11 from the `main` branch (the shipped game, round 91) and the `art`
branch (newer art not merged yet).

## What is in it
- **Read this first**: what is certain and what is not (estimated early dates, missing late images, main vs art branch).
- **Spell and skill roster**: each class's kit today and what was removed or replaced, with the round.
- **Timeline**: 128 build rounds in order (rounds 1-91 with lettered sub-rounds, plus the 3D remake and World rounds).
- **Asset catalog**: 331 assets in the studio's categories: heroes and their spells and skills, gear, NPCs, 61 enemies
  and bosses, environments, maps, props, UI, audio, story, art direction, tools, projects and 85 concept sheets. Each
  card has before/after or current images, a dated history, tags, related ids and sources (files and commits).

## For the importing AI
- Data: `<script type="application/json" id="dob-catalog">` (schema `studio-catalog-dossier/1`): `project`,
  `conventions`, `counts`, `records`, `caveats`, `openQuestions`, `missingImages`, `unresolvedRelatedIds`.
- Images: `<script type="application/json" id="dob-images">`: `{ "img-<id>": { "src": original path, "data": WebP data URI } }`.
  Records point to them in `images[].image` and `preview`. Extra images left out of the page are listed in `moreImages`
  with their original paths.
- Fields: `id`, `project`, `title`, `kind`, `category`, `stage`, `description`, `preview`, `downloads` (empty),
  `tags`, `addedToGame`, `sentToClaude` (null: not tracked), `version`, `dates`, `notes`, `source`, `related`,
  `history[]` (`id` = `<asset id>@vN`, `date`, `title`, `change`, `commits`, `images`, `status`).
- IDs are stable: `dob-<kind>-<slug>`, rounds `dob-round-NNN[letter]`. Match on `id` when updating.
- `addedToGame` is true only when verified in `main` and reachable in play; `status` separates
  commit-says / tested / user-approved / user-rejected.

## How to update it
The research is in `data/*.json` (one file per researcher; `supp-*.json` add images captured for this catalog), made to
`BRIEF.md`. `python3 assemble.py <out.html> data/supp-monsters.json data/supp-spells.json data/supp-world.json
data/timeline-a.json data/timeline-b.json data/timeline-c.json data/spells.json data/characters.json data/world.json`
rebuilds the page (env `AREA=130000 Q=40` for the image budget). Image paths in the data are absolute paths from the
session that made it; the captured images are copied in `captures/`, and every other image is in this repository at the
path shown as its `source`. To add a new round or asset, add a record with a new stable id (or a new `history` entry
to an existing one) and rebuild.
