import { describe, it, expect, beforeEach } from 'vitest'
import {
  windowManagerReducer,
  createInitialState,
  clampPosition,
  sortedByZ,
  topWindowId,
  zOrdersUnique,
  allWithinBounds,
  _resetIdCounter,
  type WindowBounds
} from './windowManager'
import type { WindowKind } from '@shared/types'

const BOUNDS: WindowBounds = { width: 800, height: 600 }

// Helper to open a window and return its id
function openWindow(
  state: ReturnType<typeof createInitialState>,
  kind: WindowKind = 'buddyList',
  bounds: WindowBounds = BOUNDS
): { state: ReturnType<typeof createInitialState>; id: string } {
  const newState = windowManagerReducer(state, {
    type: 'open',
    kind,
    title: kind,
    w: 300,
    h: 200,
    bounds
  })
  const id = newState[newState.length - 1].id
  return { state: newState, id }
}

beforeEach(() => {
  _resetIdCounter()
})

describe('clampPosition', () => {
  it('keeps a centered window unchanged', () => {
    const { x, y } = clampPosition(250, 200, 300, BOUNDS)
    expect(x).toBe(250)
    expect(y).toBe(200)
  })

  it('clamps a window that goes off the right edge', () => {
    const { x } = clampPosition(800, 0, 300, BOUNDS)
    expect(x).toBe(770) // 800 - 30 minVisible
  })

  it('clamps a window that goes off the bottom edge', () => {
    const { y } = clampPosition(0, 600, 300, BOUNDS)
    expect(y).toBe(570) // 600 - 30 minVisible
  })

  it('clamps negative x but keeps minVisible visible', () => {
    const { x } = clampPosition(-400, 0, 300, BOUNDS)
    // x >= -w + minVisible = -300 + 30 = -270
    expect(x).toBe(-270)
  })

  it('never allows negative y', () => {
    const { y } = clampPosition(0, -100, 300, BOUNDS)
    expect(y).toBe(0)
  })
})

describe('windowManagerReducer — open', () => {
  it('opens a window centered in bounds', () => {
    const state = windowManagerReducer(createInitialState(), {
      type: 'open',
      kind: 'buddyList',
      title: 'buddy list',
      w: 300,
      h: 200,
      bounds: BOUNDS
    })
    expect(state).toHaveLength(1)
    expect(state[0].x).toBe(250) // (800-300)/2
    expect(state[0].y).toBe(200) // (600-200)/2
    expect(state[0].z).toBe(1)
    expect(state[0].minimized).toBe(false)
    expect(state[0].kind).toBe('buddyList')
  })

  it('assigns increasing z-indexes', () => {
    let state = createInitialState()
    state = windowManagerReducer(state, {
      type: 'open',
      kind: 'buddyList',
      title: 'a',
      w: 300,
      h: 200,
      bounds: BOUNDS
    })
    state = windowManagerReducer(state, {
      type: 'open',
      kind: 'im',
      title: 'b',
      w: 300,
      h: 200,
      bounds: BOUNDS
    })
    expect(state[0].z).toBe(1)
    expect(state[1].z).toBe(2)
  })
})

describe('windowManagerReducer — close', () => {
  it('removes the window', () => {
    const { state, id } = openWindow(createInitialState())
    const after = windowManagerReducer(state, { type: 'close', id })
    expect(after).toHaveLength(0)
  })
})

describe('windowManagerReducer — focus', () => {
  it('raises z of focused window above all others', () => {
    let state = createInitialState()
    const r1 = openWindow(state, 'buddyList')
    state = r1.state
    const r2 = openWindow(state, 'im')
    state = r2.state

    // Focus the first window
    state = windowManagerReducer(state, { type: 'focus', id: r1.id })

    const focused = state.find((w) => w.id === r1.id)!
    const other = state.find((w) => w.id === r2.id)!
    expect(focused.z).toBeGreaterThan(other.z)
  })

  it('unminimizes on focus', () => {
    let state = createInitialState()
    const { state: s1, id } = openWindow(state)
    state = s1
    state = windowManagerReducer(state, { type: 'minimize', id })
    expect(state.find((w) => w.id === id)!.minimized).toBe(true)

    state = windowManagerReducer(state, { type: 'focus', id })
    expect(state.find((w) => w.id === id)!.minimized).toBe(false)
  })
})

describe('windowManagerReducer — move', () => {
  it('moves the window and clamps to bounds', () => {
    let state = createInitialState()
    const { state: s1, id } = openWindow(state)
    state = s1

    state = windowManagerReducer(state, { type: 'move', id, x: 1000, y: 1000, bounds: BOUNDS })
    const win = state.find((w) => w.id === id)!
    expect(win.x).toBe(770) // clamped
    expect(win.y).toBe(570) // clamped
  })

  it('does not affect other windows', () => {
    let state = createInitialState()
    const r1 = openWindow(state, 'buddyList')
    state = r1.state
    const r2 = openWindow(state, 'im')
    state = r2.state

    state = windowManagerReducer(state, { type: 'move', id: r1.id, x: 50, y: 50, bounds: BOUNDS })
    const w1 = state.find((w) => w.id === r1.id)!
    const w2 = state.find((w) => w.id === r2.id)!
    expect(w1.x).toBe(50)
    expect(w2.x).toBe(250) // unchanged
  })
})

describe('windowManagerReducer — minimize/restore', () => {
  it('sets minimized to true on minimize', () => {
    let state = createInitialState()
    const { state: s1, id } = openWindow(state)
    state = s1

    state = windowManagerReducer(state, { type: 'minimize', id })
    expect(state.find((w) => w.id === id)!.minimized).toBe(true)
  })

  it('sets minimized to false and raises z on restore', () => {
    let state = createInitialState()
    const r1 = openWindow(state, 'buddyList')
    state = r1.state
    const r2 = openWindow(state, 'im')
    state = r2.state

    // Minimize first window
    state = windowManagerReducer(state, { type: 'minimize', id: r1.id })

    // Restore first window
    state = windowManagerReducer(state, { type: 'restore', id: r1.id })
    const w1 = state.find((w) => w.id === r1.id)!
    const w2 = state.find((w) => w.id === r2.id)!
    expect(w1.minimized).toBe(false)
    expect(w1.z).toBeGreaterThan(w2.z)
  })
})

describe('selectors', () => {
  it('sortedByZ returns lowest z first', () => {
    let state = createInitialState()
    const r1 = openWindow(state, 'buddyList')
    state = r1.state
    const r2 = openWindow(state, 'im')
    state = r2.state
    const r3 = openWindow(state, 'ledger')
    state = r3.state

    // Focus r1 to give it highest z
    state = windowManagerReducer(state, { type: 'focus', id: r1.id })

    const sorted = sortedByZ(state)
    expect(sorted[0].id).not.toBe(r1.id) // r1 has highest z
    expect(sorted[sorted.length - 1].id).toBe(r1.id)
  })

  it('topWindowId returns the highest-z non-minimized window', () => {
    let state = createInitialState()
    const r1 = openWindow(state, 'buddyList')
    state = r1.state
    const r2 = openWindow(state, 'im')
    state = r2.state

    // Minimize the top one
    state = windowManagerReducer(state, { type: 'minimize', id: r2.id })

    expect(topWindowId(state)).toBe(r1.id)
  })

  it('topWindowId returns null when all minimized', () => {
    let state = createInitialState()
    const r1 = openWindow(state)
    state = r1.state
    state = windowManagerReducer(state, { type: 'minimize', id: r1.id })
    expect(topWindowId(state)).toBeNull()
  })

  it('topWindowId returns null for empty state', () => {
    expect(topWindowId(createInitialState())).toBeNull()
  })
})

describe('invariants', () => {
  it('zOrdersUnique is true after opening multiple windows', () => {
    let state = createInitialState()
    for (let i = 0; i < 5; i++) {
      state = windowManagerReducer(state, {
        type: 'open',
        kind: 'im',
        title: 'win',
        w: 200,
        h: 150,
        bounds: BOUNDS
      })
    }
    expect(zOrdersUnique(state)).toBe(true)
  })

  it('allWithinBounds is true after open (centered)', () => {
    let state = createInitialState()
    state = windowManagerReducer(state, {
      type: 'open',
      kind: 'buddyList',
      title: 'bl',
      w: 300,
      h: 200,
      bounds: BOUNDS
    })
    expect(allWithinBounds(state, BOUNDS)).toBe(true)
  })
})
