import { useEffect, useRef } from 'react'
import { WindowManagerProvider } from './desktop/WindowManagerProvider'
import { useWindowManager } from './desktop/useWindowManager'
import RetroWindow from './desktop/RetroWindow'
import Taskbar from './desktop/Taskbar'
import { sortedByZ } from './desktop/windowManager'
import SignOn from './windows/SignOn'
import BuddyList from './windows/BuddyList'

// ── Desktop content ─────────────────────────────────────────────

function Desktop(): React.JSX.Element {
  const wm = useWindowManager()
  const openedRef = useRef(false)

  // Open SignOn window on first render
  useEffect(() => {
    if (!openedRef.current) {
      openedRef.current = true
      wm.open('signon', 'Sign On', 400, 480)
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
            {renderWindowContent(win.kind)}
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

function renderWindowContent(kind: string): React.JSX.Element {
  switch (kind) {
    case 'signon':
      return <SignOn />
    case 'buddyList':
      return <BuddyList />
    case 'preferences':
      return (
        <div style={{ padding: '1rem', color: 'var(--text-dim)' }}>Preferences window (TODO)</div>
      )
    case 'ledger':
      return <div style={{ padding: '1rem', color: 'var(--text-dim)' }}>Ledger window (TODO)</div>
    case 'im':
      return <div style={{ padding: '1rem', color: 'var(--text-dim)' }}>IM window (TODO)</div>
    default:
      return <div style={{ padding: '1rem', color: 'var(--text-dim)' }}>Unknown window: {kind}</div>
  }
}

function App(): React.JSX.Element {
  return (
    <WindowManagerProvider bounds={{ width: window.innerWidth, height: window.innerHeight - 44 }}>
      <Desktop />
    </WindowManagerProvider>
  )
}

export default App
