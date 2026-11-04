# Dungeon of Bones art kit

Lets another AI (ChatGPT or similar) design monsters, props and gear for the game the same way
the game's own art is made: as code that builds small 3D models, which the game's renderer turns
into pixel art. Because the game does the drawing, what comes back matches the rest of the game.

## What's in here

- **`ART_KIT.md`**: the instructions. Give this to ChatGPT first.
- **`examples/`**: six working assets, one of each kind. Give these to ChatGPT too.
- **`studio.html`**: the preview page. Open it in a browser (double-click it; no internet or
  install needed, except for the page's fonts).
- **`engine/`**: the game's drawing code, which the studio uses. Don't edit these files; they are
  copied from the game.
- **`submissions/`**: put finished assets here.

## How to use it

1. Start a chat with ChatGPT and upload `ART_KIT.md` and the six files in `examples/` (or `examples.txt` from the studio page, all six in one file). Say
   something like: "Read ART_KIT.md and the examples. Make me a skeleton mage that throws
   frostbolts."
2. Copy the code it writes, open `studio.html` (or the studio link Claude gave you), paste it in and press **Render**.
3. If something looks wrong, take a screenshot of the sheet and give it to ChatGPT with what's
   wrong ("the hat is too small", "the legs vanish when it walks"). Paste the new code and render
   again. A few rounds of this is normal.
4. When you like it, press **Save this asset**. The file is named after the asset (a .txt file); put it in
   `submissions/`.

## Giving it back

Zip the `submissions/` folder and upload it in a chat with Claude. Claude checks each file, runs
it through the game's art review, fixes what breaks the rules, then wires it into the game:
numbers and behavior for monsters, where props go, which loot drops a gear look. Claude shows
you before/after images and runs the game's tests.
