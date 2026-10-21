// demo_rocks' bake, `yarn bake demo_rocks` (core's `scripts/bake.ts`): the one glb the scene's catalogue
// names, packed by gltfpack (meshopt geometry, WebP textures) and written where the catalogue reads it.
//   rocks.glb   grown by the library's `rocks/rocks.py` (Blender's Rock Generator) from
//               `rocks.rocks.json`: every species of the library's `rocks/species/`, three rocks each,
//               at four levels of detail, named `<rock>-<lod>`, each LOD wearing its own colour,
//               roughness and normal map baked from the full-detail rock, which wears the cc0-textures
//               rock set its species names, which `texture` downloads into the library first
// Change a species in the library or the spec here, bake again, and the page reloads with the new rocks.
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import type { Tools } from '#scripts/bake.ts'

const here = import.meta.dirname

export default async ({ blender, pack, scratch, library, texture }: Tools) => {
  const spec = path.join(here, 'rocks.rocks.json')
  const { rockSets } = await import(pathToFileURL(path.join(library, 'rocks', 'rocks.mjs')).href)
  for (const zip of rockSets(spec) as string[]) await texture(zip)
  const raw = scratch('rocks.glb')
  await blender(['--factory-startup', '--python', path.join(library, 'rocks', 'rocks.py'), '--', spec, raw])
  const out = path.join(here, 'rocks.glb')
  await pack(raw, out)
  console.log('wrote', path.relative(path.join(here, '..', '..', '..'), out))
}
