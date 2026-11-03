import { useEffect, useRef, useState } from 'react'
import type { Buddy } from '../../shared/types'
import { WindowManagerProvider } from './desktop/WindowManagerProvider'
import { useWindowManager } from './desktop/useWindowManager'
import RetroWindow from './desktop/RetroWindow'
import Taskbar from './desktop/Taskbar'
import { sortedByZ } from './desktop/windowManager'
import SignOn from './windows/SignOn'
import BuddyList from './windows/BuddyList'
import Preferences from './windows/Preferences'
import IMWindow from './windows/IMWindow'

// ── Desktop content ─────────────────────────────────────────────

interface IMWindowMeta {
  buddyId: string
  buddyName: string
  isMain: boolean
}

function Desktop(): React.JSX.Element {
  const wm = useWindowManager()
  const openedRef = useRef(false)
  // Track IM window metadata: map window ID -> buddy info
  const [imWindows, setImWindows] = useState<Map<string, IMWindowMeta>>(new Map())
  const [team, setTeam] = useState<{ main: Buddy | null; buddies: Buddy[] }>({
    main: null,
    buddies: []
  })

  // Load team on mount
  useEffect(() => {
    void window.revenant.team.get().then(setTeam).catch(console.error)
  }, [])

  // Open SignOn window on first render
  useEffect(() => {
    if (!openedRef.current) {
      openedRef.current = true
      wm.open('signon', 'Sign On', 400, 480)
    }
  }, [wm])

  const sorted = sortedByZ(wm.windows)

  const handleOpenIM = (buddyId: string): void => {
    // Find buddy info
    const isMain = team.main?.id === buddyId
    const buddy = isMain ? team.main : team.buddies.find((b) => b.id === buddyId)
    if (!buddy) return

    // Check if IM window already open for this buddy
    const existing = Array.from(imWindows.entries()).find(([, meta]) => meta.buddyId === buddyId)
    if (existing) {
      wm.focus(existing[0])
      return
    }

    // Open new IM window
    const title = `IM: ${buddy.screenName}`
    wm.open('im', title, 500, 600)

    // Store metadata in next render cycle via effect
  }

  // Sync IM windows metadata: add new windows and remove closed ones
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    const currentIds = new Set(wm.windows.map((w) => w.id))
    const next = new Map(imWindows)
    let changed = false

    // Remove closed windows
    for (const id of next.keys()) {
      if (!currentIds.has(id)) {
        next.delete(id)
        changed = true
      }
    }

    // Add new IM windows that don't have metadata yet
    for (const win of wm.windows) {
      if (win.kind === 'im' && !next.has(win.id)) {
        // Extract buddy info from title (format: "IM: <name>")
        const title = wm.titles[win.id] || ''
        const match = title.match(/^IM: (.+)$/)
        if (match) {
          const buddyName = match[1]
          const isMain = team.main?.screenName === buddyName
          const buddy = isMain ? team.main : team.buddies.find((b) => b.screenName === buddyName)
          if (buddy) {
            next.set(win.id, { buddyId: buddy.id, buddyName, isMain })
            changed = true
          }
        }
      }
    }

    if (changed) {
      setImWindows(next)
    }
  }, [wm.windows, wm.titles, team, imWindows])

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
            {renderWindowContent(win, imWindows, handleOpenIM, wm)}
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

function renderWindowContent(
  win: { id: string; kind: string },
  imWindows: Map<string, IMWindowMeta>,
  onOpenIM: (buddyId: string) => void,
  wm: ReturnType<typeof useWindowManager>
): React.JSX.Element {
  switch (win.kind) {
    case 'signon':
      return <SignOn />
    case 'buddyList':
      return (
        <BuddyList
          onOpenIM={onOpenIM}
          onOpenPreferences={() => wm.open('preferences', 'Preferences', 600, 500)}
          onOpenLedger={() => wm.open('ledger', 'Cost Ledger', 700, 500)}
        />
      )
    case 'preferences':
      return <Preferences />
    case 'ledger':
      return <div style={{ padding: '1rem', color: 'var(--text-dim)' }}>Ledger window (TODO)</div>
    case 'im': {
      const meta = imWindows.get(win.id)
      if (!meta) {
        return <div style={{ padding: '1rem', color: 'var(--text-dim)' }}>Loading IM...</div>
      }
      return <IMWindow windowId={win.id} buddyName={meta.buddyName} isMain={meta.isMain} />
    }
    default:
      return (
        <div style={{ padding: '1rem', color: 'var(--text-dim)' }}>Unknown window: {win.kind}</div>
      )
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
