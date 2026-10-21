# demo_rocks

A workbench for the rocks grown by the library's `rocks/rocks.py` (Blender's Rock Generator). It shows
every species of `~/patchwork-library/rocks/species/` (boulder, slab, outcrop), three rocks of each,
side by side at four levels of detail. Each LOD wears its own colour, roughness and normal map, baked
from the full-detail rock.

## The loop

1. Change a species in `~/patchwork-library/rocks/species/<name>.json`, or this game's pack in
   `assets/rocks.rocks.json` (which rocks, their seeds and sizes, the LODs' triangles and pixels).
2. Run `yarn bake demo_rocks`. It grows the pack and packs it into `assets/rocks.glb`.
3. The open page reloads with the new rocks.

The spec, the species and what was learned running the generator are in
`~/patchwork-library/rocks/README.md`.

## The page

`yarn editor demo_rocks`, then `localhost:<port>/games/demo_rocks/index.html`.

| Key | What it does |
| --- | --- |
| WASD, Space / C, Shift | fly, rise and sink, faster |
| right-drag, wheel | look, fly pace |
| M | the lineup of every rock, or one rock at LOD 0 to 3 |
| L, 0–3, 9 | the lineup's next LOD, one LOD, or each rock by its distance (scatter3d's shells) |
| [ ] | the rock the LOD view shows |

Each rock is labelled with its name, its LOD and its triangles. The caption gives the triangles of
everything drawn. Every number (keys, shells, light, gap) is in `assets/demo_rocks.json`.
