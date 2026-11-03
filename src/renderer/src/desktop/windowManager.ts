// WindowManager — pure reducer logic (no React, no DOM imports).
// Unit and property tested via windowManager.test.ts.

import type { WindowKind, WindowState } from '@shared/types'

// ── Types ────────────────────────────────────────────────────────

export interface WindowBounds {
  width: number
  height: number
}

export type WindowAction =
  | { type: 'open'; kind: WindowKind; title: string; w: number; h: number; bounds: WindowBounds }
  | { type: 'close'; id: string }
  | { type: 'focus'; id: string }
  | { type: 'move'; id: string; x: number; y: number; bounds: WindowBounds }
  | { type: 'minimize'; id: string }
  | { type: 'restore'; id: string }

// ── Helpers ──────────────────────────────────────────────────────

let idCounter = 0
function nextId(): string {
  idCounter += 1
  return `win-${idCounter}`
}

/** Reset the id counter — only for tests. */
export function _resetIdCounter(): void {
  idCounter = 0
}

/** Clamp a position so the window stays within bounds with a minimum visible margin. */
export function clampPosition(
  x: number,
  y: number,
  w: number,
  bounds: WindowBounds
): { x: number; y: number } {
  const minVisible = 30 // at least 30px stays on-screen
  const maxX = bounds.width - minVisible
  const maxY = bounds.height - minVisible

  const clampedX = Math.max(-w + minVisible, Math.min(x, maxX))
  const clampedY = Math.max(0, Math.min(y, maxY))

  return { x: clampedX, y: clampedY }
}

/** Compute the next z-index: one above the current maximum. */
function nextZ(windows: WindowState[]): number {
  if (windows.length === 0) return 1
  return Math.max(...windows.map((w) => w.z)) + 1
}

// ── Initial state ────────────────────────────────────────────────

export function createInitialState(): WindowState[] {
  return []
}

// ── Reducer ──────────────────────────────────────────────────────

export function windowManagerReducer(state: WindowState[], action: WindowAction): WindowState[] {
  switch (action.type) {
    case 'open': {
      const z = nextZ(state)
      const cx = Math.round((action.bounds.width - action.w) / 2)
      const cy = Math.round((action.bounds.height - action.h) / 2)
      const { x, y } = clampPosition(cx, cy, action.w, action.bounds)
      const win: WindowState = {
        id: nextId(),
        kind: action.kind,
        x,
        y,
        w: action.w,
        h: action.h,
        z,
        minimized: false
      }
      return [...state, win]
    }

    case 'close': {
      return state.filter((w) => w.id !== action.id)
    }

    case 'focus': {
      const topZ = nextZ(state)
      return state.map((w) => (w.id === action.id ? { ...w, z: topZ, minimized: false } : w))
    }

    case 'move': {
      return state.map((w) => {
        if (w.id !== action.id) return w
        const clamped = clampPosition(action.x, action.y, w.w, action.bounds)
        return { ...w, x: clamped.x, y: clamped.y }
      })
    }

    case 'minimize': {
      return state.map((w) => (w.id === action.id ? { ...w, minimized: true } : w))
    }

    case 'restore': {
      const topZ = nextZ(state)
      return state.map((w) => (w.id === action.id ? { ...w, minimized: false, z: topZ } : w))
    }

    default:
      return state
  }
}

// ── Selectors ────────────────────────────────────────────────────

/** Return windows sorted by z (lowest first), for rendering. */
export function sortedByZ(windows: WindowState[]): WindowState[] {
  return [...windows].sort((a, b) => a.z - b.z)
}

/** Return the id of the top-most non-minimized window, or null. */
export function topWindowId(windows: WindowState[]): string | null {
  const visible = windows.filter((w) => !w.minimized)
  if (visible.length === 0) return null
  return visible.reduce((top, w) => (w.z > top.z ? w : top)).id
}

/** Are all z-orders unique? */
export function zOrdersUnique(windows: WindowState[]): boolean {
  const zs = windows.map((w) => w.z)
  return new Set(zs).size === zs.length
}

/** Is every window fully within bounds (with min margin)? */
export function allWithinBounds(windows: WindowState[], bounds: WindowBounds): boolean {
  const minVisible = 30
  return windows.every((w) => {
    return (
      w.x >= -w.w + minVisible &&
      w.x <= bounds.width - minVisible &&
      w.y >= 0 &&
      w.y <= bounds.height - minVisible
    )
  })
}
