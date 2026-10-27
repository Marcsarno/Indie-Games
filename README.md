# Indie Games

## diablo-clone
A 2D pixel-art, isometric, Diablo-style action RPG for mobile (portrait). Early stage: we're testing
whether the art can be generated entirely in code instead of drawn as sprites.

| Prototype | Approach | Notes |
|---|---|---|
| [`prototype-simple`](diablo-clone/prototype-simple/) | 270×480, 51-color palette, ~43px characters drawn from 2D primitives, banded torchlight | Playable: move, attack, blood, enemy death/respawn, team-color knight. ~8–10 ms/frame |
| [`prototype-original`](diablo-clone/prototype-original/) | 384×576, a faithful recreation of the original concept art; characters built from 3D primitives, precomputed lighting with cast shadows | Closest match to the concept's mood; characters read as smooth "toys". ~5 s load, 11–16 fps in headless testing |

Open either `index.html` in a browser; there's no build step and no image assets.
