# Dungeon of Bones (game build)

A portrait-phone, Diablo-style dungeon crawler where all art is generated in code: characters are
tiny 3D rigs ray-cast into pixel art in 8 directions, the dungeon is generated and baked per floor,
lighting uses Diablo-style light tables, and there are no image files.

Open `index.html` in a browser. Phone test build: https://claude.ai/artifact/7EX2mEMH4cSGuKC2c3K29g

| Thumb / key | Action |
|---|---|
| Left half (drag) / WASD | Move (floating stick) |
| Right half or sword button / J, Space | Attack: faces and walks to the nearest visible enemy |
| Skill buttons / 1–4 | Holy bolt, shield bash (level 2), whirlwind (level 3), war cry (level 4) |
| Potion button / Q | Drink a healing potion |
| Bag / I | Inventory: tap an item, then EQUIP, REMOVE or DROP; COLOR swaps red/blue |
| Map / M | Automap |

Find the stairs on each floor to go deeper: crypt, then caves, then hell, every two floors. Every third floor the broodmother guards the stairs. Progress saves in the browser.
See `../NOTES.md` for how it works and the review and benchmark tools.
