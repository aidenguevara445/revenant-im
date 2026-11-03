// Types for WindowManager context.
// Extracted from WindowManagerProvider to satisfy react-refresh/only-export-components.

import { createContext } from 'react'
import type { WindowState, WindowKind } from '@shared/types'
import type { WindowBounds } from './windowManager'

export interface WindowManagerContextValue {
  windows: WindowState[]
  bounds: WindowBounds
  activeId: string | null
  titles: Record<string, string>
  open: (kind: WindowKind, title: string, w: number, h: number) => void
  close: (id: string) => void
  focus: (id: string) => void
  move: (id: string, x: number, y: number) => void
  minimize: (id: string) => void
  restore: (id: string) => void
  /** Mark a window as flashing (unread message). */
  setFlashing: (id: string, flashing: boolean) => void
  flashing: Set<string>
}

export const WindowManagerContext = createContext<WindowManagerContextValue | null>(null)

// Re-export WindowAction and WindowBounds for convenience
export type { WindowAction, WindowBounds } from './windowManager'
