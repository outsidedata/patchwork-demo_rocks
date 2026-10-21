// demo_rocks: the manager booted as its page boots it and main loaded; a seat joins, its `player` row,
// its eye, stands on its slot's start and flies along the way it looks; and the keys choose the view:
// the lineup or one rock's LODs, the lineup's LOD, and the rock.
import { expect, test } from 'vitest'
import { boot, type Arg, type Row, type Scene } from '#engine/engine.ts'
import { connection, load, manager, type Down } from '#addons/scenemanager/scenemanager.addon.ts'
import { possessed } from '#addons/player/player.addon.ts'
import { sim } from './demo_rocks.sim.ts'
import file from './demo_rocks.scene.json' with { type: 'json' }
import main from './main.scene.json' with { type: 'json' }
import defs from './assets/demo_rocks.json' with { type: 'json' }

const DT = file.prefabs.engine.dt

// A seat on main, its eye stood: the truth, a way to press, and the eye's row there.
const seated = async () => {
  const truth = boot(file as Scene, sim)
  const room = (await load(truth, import.meta.url)).get('main')!
  const heard: Down[] = []
  const seat = connection(manager(truth), d => heard.push(d))
  truth.step(DT)
  const last = heard[heard.length - 1]
  const me = possessed(last.packet.rows)!
  let seq = 0
  const press = (action: string, ...args: Arg[]) =>
    seat.take({ scene: last.scene, seat: last.seat, msg: { seq: ++seq, n: last.packet.n, id: me.id, action, args } })
  const eye = () => room.rows.find(r => r.id === me.id)! as Row
  return { truth, press, eye }
}

test('a seat\'s eye stands on its start and flies the way it looks at its speed', async () => {
  const { truth, press, eye } = await seated()
  const start = main.actors.find(a => a.is === 'start')!
  expect(eye().data.pos).toEqual([start.at![0], defs.player.clear + start.up!, start.at![1]])
  press('stick', 0, -1)
  for (let i = 0; i < 60; i++) truth.step(DT)
  // yaw 0 looks along +z, down by the start's pitch
  const run = defs.player.speed * DT * 60
  expect(eye().data.pos[2]).toBeCloseTo(start.at![1] + run * Math.cos(start.pitch!), 6)
  expect(eye().data.pos[0]).toBeCloseTo(start.at![0], 6)
})

test('the keys choose the view, the lineup\'s LOD and the rock', async () => {
  const { truth, press, eye } = await seated()
  const lods = defs.lineup.lods, rocks = defs.lineup.rocks.length

  press('mode')
  truth.step(DT)
  expect(eye().data.mode).toBe('lods')
  press('mode')
  truth.step(DT)
  expect(eye().data.mode).toBe('lineup')

  press('lod', lods - 1)
  truth.step(DT)
  expect(eye().data.lod).toBe(lods - 1)
  // the next LOD after the last is by distance, and the next after that is LOD 0
  press('nextLod')
  truth.step(DT)
  expect(eye().data.lod).toBe(-1)
  press('nextLod')
  truth.step(DT)
  expect(eye().data.lod).toBe(0)

  press('rock', -1)
  truth.step(DT)
  expect(eye().data.rock).toBe(rocks - 1)
  press('rock', 1)
  truth.step(DT)
  expect(eye().data.rock).toBe(0)
})
