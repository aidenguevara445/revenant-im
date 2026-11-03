import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
  windowManagerReducer,
  createInitialState,
  zOrdersUnique,
  allWithinBounds,
  _resetIdCounter,
  type WindowBounds
} from './windowManager'
import type { WindowKind } from '@shared/types'

const BOUNDS: WindowBounds = { width: 800, height: 600 }

const windowKinds: WindowKind[] = ['signon', 'buddyList', 'im', 'preferences', 'ledger']

// Generate a random action: open, close, focus, move, minimize, restore
const actionArb: fc.Arbitrary<
  | { type: 'open'; kind: WindowKind; title: string; w: number; h: number; bounds: WindowBounds }
  | { type: 'close'; id: number }
  | { type: 'focus'; id: number }
  | { type: 'move'; id: number; x: number; y: number; bounds: WindowBounds }
  | { type: 'minimize'; id: number }
  | { type: 'restore'; id: number }
> = fc.oneof(
  fc.record({
    type: fc.constant('open' as const),
    kind: fc.constantFrom(...windowKinds),
    title: fc.string({ minLength: 1, maxLength: 20 }),
    w: fc.integer({ min: 100, max: 400 }),
    h: fc.integer({ min: 80, max: 300 }),
    bounds: fc.constant(BOUNDS)
  }),
  fc.record({
    type: fc.constant('close' as const),
    id: fc.integer({ min: 0, max: 20 })
  }),
  fc.record({
    type: fc.constant('focus' as const),
    id: fc.integer({ min: 0, max: 20 })
  }),
  fc.record({
    type: fc.constant('move' as const),
    id: fc.integer({ min: 0, max: 20 }),
    x: fc.integer({ min: -500, max: 1200 }),
    y: fc.integer({ min: -500, max: 1200 }),
    bounds: fc.constant(BOUNDS)
  }),
  fc.record({
    type: fc.constant('minimize' as const),
    id: fc.integer({ min: 0, max: 20 })
  }),
  fc.record({
    type: fc.constant('restore' as const),
    id: fc.integer({ min: 0, max: 20 })
  })
)

describe('property: z-orders stay unique', () => {
  it('for any sequence of window actions, z-orders are always unique', () => {
    fc.assert(
      fc.property(fc.array(actionArb, { maxLength: 50 }), (actions) => {
        _resetIdCounter()
        let state = createInitialState()

        // We use a simple mapping: action.id (integer) maps to the window
        // at that index in the windows array (modulo length).
        // For close/focus/move/minimize/restore, if no window at that index, skip.
        for (const action of actions) {
          if (action.type === 'open') {
            state = windowManagerReducer(state, action)
          } else {
            const idx = state.length === 0 ? -1 : action.id % state.length
            if (idx < 0 || idx >= state.length) continue
            const winId = state[idx].id
            if (action.type === 'close') {
              state = windowManagerReducer(state, { type: 'close', id: winId })
            } else if (action.type === 'focus') {
              state = windowManagerReducer(state, { type: 'focus', id: winId })
            } else if (action.type === 'move') {
              state = windowManagerReducer(state, {
                type: 'move',
                id: winId,
                x: action.x,
                y: action.y,
                bounds: action.bounds
              })
            } else if (action.type === 'minimize') {
              state = windowManagerReducer(state, { type: 'minimize', id: winId })
            } else if (action.type === 'restore') {
              state = windowManagerReducer(state, { type: 'restore', id: winId })
            }
          }
        }

        expect(zOrdersUnique(state)).toBe(true)
      })
    )
  })
})

describe('property: windows stay inside bounds', () => {
  it('for any sequence of window actions, every window stays within bounds', () => {
    fc.assert(
      fc.property(fc.array(actionArb, { maxLength: 50 }), (actions) => {
        _resetIdCounter()
        let state = createInitialState()

        for (const action of actions) {
          if (action.type === 'open') {
            state = windowManagerReducer(state, action)
          } else {
            const idx = state.length === 0 ? -1 : action.id % state.length
            if (idx < 0 || idx >= state.length) continue
            const winId = state[idx].id
            if (action.type === 'close') {
              state = windowManagerReducer(state, { type: 'close', id: winId })
            } else if (action.type === 'focus') {
              state = windowManagerReducer(state, { type: 'focus', id: winId })
            } else if (action.type === 'move') {
              state = windowManagerReducer(state, {
                type: 'move',
                id: winId,
                x: action.x,
                y: action.y,
                bounds: action.bounds
              })
            } else if (action.type === 'minimize') {
              state = windowManagerReducer(state, { type: 'minimize', id: winId })
            } else if (action.type === 'restore') {
              state = windowManagerReducer(state, { type: 'restore', id: winId })
            }
          }
        }

        expect(allWithinBounds(state, BOUNDS)).toBe(true)
      })
    )
  })
})

describe('property: open never exceeds bounds after clamping', () => {
  it('opening a window larger than bounds still stays visible', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 1200 }),
        fc.integer({ min: 80, max: 1000 }),
        (w, h) => {
          _resetIdCounter()
          let state = createInitialState()
          state = windowManagerReducer(state, {
            type: 'open',
            kind: 'buddyList',
            title: 'big',
            w,
            h,
            bounds: BOUNDS
          })
          expect(allWithinBounds(state, BOUNDS)).toBe(true)
        }
      )
    )
  })
})
