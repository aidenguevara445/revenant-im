import { useReducer, useEffect, useCallback, type ReactNode } from 'react'
import type { WindowState, WindowKind } from '@shared/types'
import {
  windowManagerReducer,
  createInitialState,
  topWindowId,
  type WindowAction,
  type WindowBounds
} from './windowManager'
import { savePositions } from './windowManagerHelpers'
import type { WindowManagerContextValue } from './windowManagerTypes'
import { WindowManagerContext } from './windowManagerTypes'

// Combined state: windows + titles + flashing set
interface CombinedState {
  windows: WindowState[]
  titles: Record<string, string>
  flashing: Set<string>
}

type CombinedAction =
  (WindowAction & { title?: string }) | { type: 'setFlash'; id: string; value: boolean }

function combinedReducer(state: CombinedState, action: CombinedAction): CombinedState {
  let windows = state.windows
  let titles = state.titles
  let flashing = state.flashing

  if (action.type === 'setFlash') {
    const next = new Set(flashing)
    if (action.value) next.add(action.id)
    else next.delete(action.id)
    return { windows, titles, flashing: next }
  }

  // Delegate to window reducer for window actions
  windows = windowManagerReducer(windows, action as WindowAction)

  // Track title for newly opened windows
  if (action.type === 'open' && action.title !== undefined) {
    const newWin = windows[windows.length - 1]
    if (newWin) {
      titles = { ...titles, [newWin.id]: action.title }
    }
  }

  // Clean up title + flashing for closed windows
  if (action.type === 'close') {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { [action.id]: _, ...rest } = titles
    titles = rest
    if (flashing.has(action.id)) {
      const next = new Set(flashing)
      next.delete(action.id)
      flashing = next
    }
  }

  return { windows, titles, flashing }
}

function initCombinedState(): CombinedState {
  return {
    windows: createInitialState(),
    titles: {},
    flashing: new Set<string>()
  }
}

interface WindowManagerProviderProps {
  children: ReactNode
  /** Desktop area bounds (width/height available for windows). */
  bounds: WindowBounds
}

function WindowManagerProvider({
  children,
  bounds
}: WindowManagerProviderProps): React.JSX.Element {
  const [state, dispatch] = useReducer(combinedReducer, undefined, initCombinedState)
  const { windows, titles, flashing } = state

  // Persist positions whenever windows change
  useEffect(() => {
    savePositions(windows)
  }, [windows])

  const open = useCallback(
    (kind: WindowKind, title: string, w: number, h: number): void => {
      dispatch({ type: 'open', kind, title, w, h, bounds })
    },
    [bounds]
  )

  const close = useCallback((id: string): void => {
    dispatch({ type: 'close', id })
  }, [])

  const focus = useCallback((id: string): void => {
    dispatch({ type: 'focus', id })
  }, [])

  const move = useCallback(
    (id: string, x: number, y: number): void => {
      dispatch({ type: 'move', id, x, y, bounds })
    },
    [bounds]
  )

  const minimize = useCallback((id: string): void => {
    dispatch({ type: 'minimize', id })
  }, [])

  const restore = useCallback((id: string): void => {
    dispatch({ type: 'restore', id })
  }, [])

  const setFlashing = useCallback((id: string, value: boolean): void => {
    dispatch({ type: 'setFlash', id, value })
  }, [])

  const activeId = topWindowId(windows)

  const value: WindowManagerContextValue = {
    windows,
    bounds,
    activeId,
    titles,
    open,
    close,
    focus,
    move,
    minimize,
    restore,
    setFlashing,
    flashing
  }

  return <WindowManagerContext.Provider value={value}>{children}</WindowManagerContext.Provider>
}

export { WindowManagerProvider }
