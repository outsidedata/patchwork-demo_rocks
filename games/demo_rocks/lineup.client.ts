// The rocks on show, drawn from the loader's `model` (`assets/rocks.glb`, baked by
// `assets/demo_rocks.bake.ts`), whose meshes are named `<rock>-<lod>`, on a flat ground under a sun and a
// sky light. Every number is the lineup's definition in `assets/demo_rocks.json`.
//
// What it draws is what the seat's own `player` row chose:
//   lineup   every rock of `rocks`, in that order from the left of an eye looking along +z, in a row
//            along x, each `gap` metres clear of the next by LOD 0's width, the row's middle at x = 0,
//            every rock at the row's `lod`; at lod −1 each rock at the LOD a scatter3d pack with these
//            `shells` would draw it at, by its distance from the camera: LOD k inside shells[k], the
//            last past them all.
//   lods     the row's `rock` at each of its LODs, 0 to the last, side by side in the same way.
// Each rock shown has a label at its foot, `label.below` metres under the ground: its name, its LOD and
// its triangles. The caption, over the top left, says the view, the LOD and the triangles of
// everything drawn, then the keys (`help`).
//
// The ground is a square `ground.size` across at y = 0; the light is a hemisphere light of `hemi` and a
// sun, a directional light from `sun.from`, casting shadows over `sun.shadow.half` metres each way of
// the camera's foot. Every mesh casts and takes shadows. The model is asked of the loader at once and
// built the first frame it is there; a bake writes a new glb, and the page reloads with it.
import type { Row } from '#engine/engine.ts'
import type { Plugins } from '#engine/browser.ts'
import type * as THREE from 'three'
import { def } from '#plugins/loader/loader.sim.ts'
import { possessed } from '#plugins/player/player.plugin.ts'

type Look = { group: THREE.Group; tris: number; width: number }
// Each rock's LODs, by rock and LOD, once the model has landed; the ground and the lights.
let looks: Look[][] | undefined
let added: THREE.Object3D[] = []
let sun: THREE.DirectionalLight

export function setup(row: Row, plugins: Plugins) {
  const T = plugins.render3d.THREE as typeof THREE
  const k = def(plugins.wire, row.kind)
  const ground = new T.Mesh(
    new T.PlaneGeometry(k.ground.size, k.ground.size).rotateX(-Math.PI / 2),
    plugins.render3d.dress(new T.MeshStandardMaterial({ color: k.ground.colour, roughness: 1 })),
  )
  ground.receiveShadow = true
  const hemi = new T.HemisphereLight(k.hemi.sky, k.hemi.ground, k.hemi.intensity)
  sun = new T.DirectionalLight(k.sun.colour, k.sun.intensity)
  sun.castShadow = true
  const s = k.sun.shadow
  sun.shadow.mapSize.set(s.map, s.map)
  Object.assign(sun.shadow.camera, { left: -s.half, right: s.half, top: s.half, bottom: -s.half, near: 1, far: s.far })
  sun.shadow.camera.updateProjectionMatrix()
  sun.shadow.bias = s.bias
  added = [ground, hemi, sun, sun.target]
  for (const o of added) plugins.render3d.scene.add(o)
  plugins.loader.load(k.model)
}

// Every LOD of every rock, cloned out of the model with its materials dressed, each one group.
function build(plugins: Plugins, k: any): Look[][] {
  const T = plugins.render3d.THREE as typeof THREE
  const model = plugins.loader.model(k.model).scene as THREE.Object3D
  return (k.rocks as string[]).map(rock => Array.from({ length: k.lods }, (_, lod) => {
    const group = new T.Group()
    let tris = 0
    const node = model.getObjectByName(`${rock}-${lod}`)
    if (!node) throw new Error(`lineup: ${k.model} has no ${rock}-${lod}`)
    node.traverse(o => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      const copy = new T.Mesh(mesh.geometry, plugins.render3d.dress((mesh.material as THREE.Material).clone()))
      copy.castShadow = copy.receiveShadow = true
      group.add(copy)
      const g = mesh.geometry
      tris += (g.index ? g.index.count : g.attributes.position.count) / 3
    })
    group.visible = false
    plugins.render3d.scene.add(group)
    const box = new T.Box3().setFromObject(group)
    return { group, tris, width: box.max.x - box.min.x }
  }))
}

// x of each of `widths` laid in a row `gap` apart, the row's middle at 0, the first on the left of an
// eye looking along +z, where +x is to its left.
const row = (widths: number[], gap: number) => {
  const total = widths.reduce((a, b) => a + b, 0) + gap * (widths.length - 1)
  let x = total / 2
  return widths.map(w => { const at = x - w / 2; x -= w + gap; return at })
}

export function tick(me: Row, plugins: Plugins) {
  const { ui, wire, render3d } = plugins
  const k = def(wire, me.kind)
  if (!looks) {
    if (plugins.loader.get(k.model) === undefined) return
    looks = build(plugins, k)
  }
  const eye = possessed(wire.rows)
  if (!eye) return
  const { mode, lod, rock } = eye.data
  const camera = render3d.camera as THREE.Camera
  // the sun follows the camera's foot, so its shadows fall where the eye is looking
  const [cx, , cz] = camera.position.toArray()
  const from = k.sun.from as number[]
  sun.position.set(cx + from[0] * k.sun.shadow.far / 2, from[1] * k.sun.shadow.far / 2, cz + from[2] * k.sun.shadow.far / 2)
  sun.target.position.set(cx, 0, cz)

  for (const each of looks) for (const l of each) l.group.visible = false
  const shown: { name: string; lod: number; look: Look; x: number }[] = []
  if (mode === 'lods') {
    const each = looks[rock]
    const xs = row(each.map(() => each[0].width), k.gap)
    each.forEach((look, j) => shown.push({ name: k.rocks[rock], lod: j, look, x: xs[j] }))
  } else {
    const xs = row(looks.map(each => each[0].width), k.gap)
    looks.forEach((each, i) => {
      const at = lod >= 0 ? lod : by(Math.hypot(xs[i] - cx, cz), k.shells)
      shown.push({ name: k.rocks[i], lod: at, look: each[at], x: xs[i] })
    })
  }
  let drawn = 0
  for (const s of shown) {
    s.look.group.visible = true
    s.look.group.position.set(s.x, 0, 0)
    drawn += s.look.tris
    const label = ui.show('labels', `${s.name} ${s.lod}`, () => new ui.PIXI.Text({ text: '', style: ui.style('label') })) as InstanceType<typeof ui.PIXI.Text>
    label.text = `${s.name}\nLOD ${s.lod}\n${s.look.tris} tris`
    label.anchor.set(0.5, 0)
    ui.pin(label, [s.x, -k.label.below, 0])
  }

  const c = k.caption
  const text = (key: string, style: string, at: number[], words: string) => {
    const t = ui.show('caption', key, () => new ui.PIXI.Text({ text: '', style: ui.style(style) })) as InstanceType<typeof ui.PIXI.Text>
    t.position.set(at[0], at[1])
    t.text = words
  }
  text('title', 'caption.title', c.title, mode === 'lods' ? `${k.rocks[rock]}: every LOD` : 'every rock')
  text('view', 'caption.text', c.lines, mode === 'lods' ? `LOD 0 to ${k.lods - 1}, left to right`
    : lod >= 0 ? `all at LOD ${lod}` : `by distance: shells ${k.shells.join(' / ')} m`)
  text('tris', 'caption.text', [c.lines[0], c.lines[1] + c.line], `${drawn} triangles drawn  pace ×${eye.data.pace.toFixed(2)}`)
  text('keys', 'caption.keys', [c.lines[0], c.lines[1] + 2 * c.line + 4], k.help)
}

// The LOD a scatter3d pack with these shells draws at a distance: k inside shells[k], the last past them.
const by = (distance: number, shells: number[]) => {
  const k = shells.findIndex(r => distance < r)
  return k < 0 ? shells.length : k
}

export function remove(plugins: Plugins) {
  for (const o of added) plugins.render3d.scene.remove(o)
  for (const each of looks ?? []) for (const l of each) {
    plugins.render3d.scene.remove(l.group)
    l.group.traverse(o => { if ((o as THREE.Mesh).isMesh) ((o as THREE.Mesh).material as THREE.Material).dispose() })
  }
  looks = undefined
  added = []
}
