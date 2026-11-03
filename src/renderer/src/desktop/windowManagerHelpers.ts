// Helpers and utilities for WindowManager persistence.
// Extracted from WindowManagerProvider to satisfy react-refresh/only-export-components.

const STORAGE_KEY = 'revenant:window-positions'

/** Try to load saved window positions from localStorage. */
export function loadSavedPositions(): Record<string, { x: number; y: number }> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return {}
    return parsed
  } catch {
    return {}
  }
}

/** Save window positions to localStorage (best-effort). */
export function savePositions(windows: Array<{ id: string; x: number; y: number }>): void {
  try {
    const data: Record<string, { x: number; y: number }> = {}
    for (const w of windows) {
      data[w.id] = { x: w.x, y: w.y }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // localStorage may be unavailable; silently ignore
  }
}

export { STORAGE_KEY }
