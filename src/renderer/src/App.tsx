import { useEffect, useRef } from 'react'
import { WindowManagerProvider, useWindowManager } from './desktop/WindowManagerProvider'
import RetroWindow from './desktop/RetroWindow'
import Taskbar from './desktop/Taskbar'
import { sortedByZ } from './desktop/windowManager'

// ── Desktop content ─────────────────────────────────────────────

function Desktop(): React.JSX.Element {
  const wm = useWindowManager()
  const openedRef = useRef(false)

  // Open one demo window on first render
  useEffect(() => {
    if (!openedRef.current) {
      openedRef.current = true
      wm.open('buddyList', 'revenant — buddy list', 280, 360)
    }
  }, [wm])

  const sorted = sortedByZ(wm.windows)

  return (
    <>
      {/* Fog background */}
      <div className="rv-fog">
        <div className="rv-fog-layer" />
        <div className="rv-fog-layer" />
        <div className="rv-fog-layer" />
      </div>

      {/* Desktop area */}
      <div className="rv-desktop">
        {sorted.map((win) => (
          <RetroWindow
            key={win.id}
            win={win}
            active={win.id === wm.activeId}
            title={wm.titles[win.id] ?? win.kind}
            bounds={wm.bounds}
            onFocus={wm.focus}
            onClose={wm.close}
            onMinimize={wm.minimize}
            onMove={wm.move}
          >
            <div style={{ padding: '8px', color: 'var(--rv-text-dim)' }}>
              <p style={{ color: 'var(--rv-ghost)', marginBottom: '8px' }}>
                👻 revenant im — placeholder
              </p>
              <p>
                window: {win.id}
                <br />
                kind: {win.kind}
                <br />
                position: {win.x}, {win.y}
                <br />
                z: {win.z} · minimized: {String(win.minimized)}
              </p>
              <p style={{ marginTop: '12px', fontSize: '11px', opacity: 0.6 }}>
                drag the title bar to move · use – and ✕ to minimize/close
              </p>
            </div>
          </RetroWindow>
        ))}
      </div>

      {/* Taskbar */}
      <Taskbar
        windows={wm.windows}
        titles={wm.titles}
        activeId={wm.activeId}
        flashing={wm.flashing}
        onTaskbarClick={(id) => {
          const win = wm.windows.find((w) => w.id === id)
          if (win?.minimized) {
            wm.restore(id)
          } else {
            wm.focus(id)
          }
        }}
      />
    </>
  )
}

function App(): React.JSX.Element {
  return (
    <WindowManagerProvider bounds={{ width: window.innerWidth, height: window.innerHeight - 44 }}>
      <Desktop />
    </WindowManagerProvider>
  )
}

export default App
