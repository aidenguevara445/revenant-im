import { useRef, useCallback, type ReactNode, type PointerEvent } from 'react'
import type { WindowState } from '@shared/types'
import type { WindowBounds } from './windowManager'

interface RetroWindowProps {
  win: WindowState
  active: boolean
  title: string
  bounds: WindowBounds
  onFocus: (id: string) => void
  onClose: (id: string) => void
  onMinimize: (id: string) => void
  onMove: (id: string, x: number, y: number, bounds: WindowBounds) => void
  children?: ReactNode
}

/**
 * A retro-styled draggable window with title bar, minimize/close buttons.
 * Dragging is handled via pointer events and clamped to bounds.
 */
function RetroWindow({
  win,
  active,
  title,
  bounds,
  onFocus,
  onClose,
  onMinimize,
  onMove,
  children
}: RetroWindowProps): React.JSX.Element {
  const dragStart = useRef<{ mouseX: number; mouseY: number; winX: number; winY: number } | null>(
    null
  )

  const handlePointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      // Focus this window when the title bar is pressed
      onFocus(win.id)

      // Only start drag on left button (button 0)
      if (e.button !== 0) return

      dragStart.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        winX: win.x,
        winY: win.y
      }

      // Capture the pointer so we keep getting move events even outside the element
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [win.id, win.x, win.y, onFocus]
  )

  const handlePointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      const start = dragStart.current
      if (!start) return

      const dx = e.clientX - start.mouseX
      const dy = e.clientY - start.mouseY
      const newX = start.winX + dx
      const newY = start.winY + dy
      onMove(win.id, newX, newY, bounds)
    },
    [win.id, bounds, onMove]
  )

  const handlePointerUp = useCallback((e: PointerEvent<HTMLDivElement>) => {
    dragStart.current = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // pointer may have been released already
    }
  }, [])

  if (win.minimized) return <></>

  return (
    <div
      className={`rv-window ${active ? 'rv-window--active' : ''}`}
      style={{
        left: win.x,
        top: win.y,
        width: win.w,
        height: win.h,
        zIndex: win.z
      }}
      onPointerDown={() => onFocus(win.id)}
    >
      <div
        className="rv-titlebar"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <span className="rv-titlebar-text">{title}</span>
        <button
          className="rv-titlebar-btn rv-btn-min"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onMinimize(win.id)}
          title="minimize"
        >
          –
        </button>
        <button
          className="rv-titlebar-btn rv-btn-close"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onClose(win.id)}
          title="close"
        >
          ✕
        </button>
      </div>
      <div className="rv-window-body">{children}</div>
    </div>
  )
}

export default RetroWindow
