# Indie Games

Read `diablo-clone/NOTES.md` first: it has the project state, how the code-drawn art engine
works, the review loop, research findings, what's waiting on the user, and next steps.

- `mario-clone/` is a separate NES-style World 1-1 recreation; read `mario-clone/NOTES.md` for it.
- `city-clone/` is a top-down open-city game (Chinatown Wars style) reusing the Diablo art tools; start with `city-clone/HANDOFF.md`.
- Main game: `diablo-clone/game/` (classic scripts, no build, no image assets; open `index.html`).
  The earlier single-file prototype `diablo-clone/prototype-simple/` is the before/after baseline.
- After changing the game, republish it to the same artifact (see NOTES.md) so the phone link updates.
- Any sprite or art change goes through the `pixel-sprite` skill and `diablo-clone/art/RUBRIC.md`.
- Show changes as before/after comparisons; shader changes get a blind A/B for the user.
- Keep `diablo-clone/NOTES.md` updated when a round of work finishes.
- Commit and push to `main`.
