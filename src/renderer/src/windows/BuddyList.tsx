// BuddyList window: shows the user's team of AI models.

import { useState, useEffect } from 'react'
import type { Buddy, BuddyStatus } from '../../../shared/types'
import './BuddyList.css'

interface BuddyListProps {
  onOpenIM?: (buddyId: string) => void
  onOpenPreferences?: () => void
  onOpenLedger?: () => void
}

export default function BuddyList({
  onOpenIM,
  onOpenPreferences,
  onOpenLedger
}: BuddyListProps): React.JSX.Element {
  const [main, setMain] = useState<Buddy | null>(null)
  const [buddies, setBuddies] = useState<Buddy[]>([])
  const [statuses, setStatuses] = useState<Record<string, BuddyStatus>>({})
  const [draggedBuddyId, setDraggedBuddyId] = useState<string | null>(null)

  // Load team on mount
  useEffect(() => {
    void loadTeam()
  }, [])

  async function loadTeam(): Promise<void> {
    try {
      const team = await window.revenant.team.get()
      setMain(team.main)
      setBuddies(team.buddies)

      // Initialize all buddies as online
      const initialStatuses: Record<string, BuddyStatus> = {}
      if (team.main) {
        initialStatuses[team.main.id] = { state: 'online' }
      }
      team.buddies.forEach((b) => {
        initialStatuses[b.id] = { state: 'online' }
      })
      setStatuses(initialStatuses)
    } catch (err) {
      console.error('Failed to load team:', err)
    }
  }

  function handleDoubleClick(buddyId: string): void {
    onOpenIM?.(buddyId)
  }

  function handleDragStart(buddyId: string): void {
    setDraggedBuddyId(buddyId)
  }

  function handleDragEnd(): void {
    setDraggedBuddyId(null)
  }

  async function handleDropOnMain(): Promise<void> {
    if (!draggedBuddyId) return

    const draggedBuddy = buddies.find((b) => b.id === draggedBuddyId)
    if (!draggedBuddy) return

    // Swap: dragged buddy becomes main, old main becomes buddy (if exists)
    const oldMain = main
    const newBuddies = buddies.filter((b) => b.id !== draggedBuddyId)

    if (oldMain) {
      newBuddies.push({ ...oldMain, role: 'buddy' })
    }

    const newMain = { ...draggedBuddy, role: 'main' as const }

    try {
      await window.revenant.team.set({
        main: newMain,
        buddies: newBuddies
      })
      await loadTeam()
    } catch (err) {
      console.error('Failed to update team:', err)
    }
  }

  return (
    <div className="buddylist-container">
      <div className="buddylist-header">
        <div className="buddylist-user">
          <span className="status-indicator status-online"></span>
          <span className="screen-name">You</span>
        </div>
      </div>

      <div className="buddylist-groups">
        {/* Main group */}
        <div className="buddy-group">
          <div className="group-header">
            <span className="group-icon">👑</span>
            <span className="group-name">Main</span>
          </div>
          <div
            className="group-buddies"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDropOnMain}
          >
            {main ? (
              <BuddyItem
                buddy={main}
                status={statuses[main.id] || { state: 'online' }}
                onDoubleClick={handleDoubleClick}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                isDragging={draggedBuddyId === main.id}
              />
            ) : (
              <div className="buddy-placeholder">No main model configured</div>
            )}
          </div>
        </div>

        {/* Buddies group */}
        <div className="buddy-group">
          <div className="group-header">
            <span className="group-icon">👻</span>
            <span className="group-name">Buddies</span>
          </div>
          <div className="group-buddies">
            {buddies.length === 0 ? (
              <div className="buddy-placeholder">No buddies configured</div>
            ) : (
              buddies.map((buddy) => (
                <BuddyItem
                  key={buddy.id}
                  buddy={buddy}
                  status={statuses[buddy.id] || { state: 'online' }}
                  onDoubleClick={handleDoubleClick}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  isDragging={draggedBuddyId === buddy.id}
                />
              ))
            )}
          </div>
        </div>
      </div>

      <div className="buddylist-footer">
        <button className="buddylist-action" title="Preferences" onClick={onOpenPreferences}>
          ⚙️
        </button>
        <button className="buddylist-action" title="Ledger" onClick={onOpenLedger}>
          💰
        </button>
      </div>
    </div>
  )
}

interface BuddyItemProps {
  buddy: Buddy
  status: BuddyStatus
  onDoubleClick: (buddyId: string) => void
  onDragStart: (buddyId: string) => void
  onDragEnd: () => void
  isDragging: boolean
}

function BuddyItem({
  buddy,
  status,
  onDoubleClick,
  onDragStart,
  onDragEnd,
  isDragging
}: BuddyItemProps): React.JSX.Element {
  return (
    <div
      className={`buddy-item ${isDragging ? 'dragging' : ''}`}
      draggable
      onDoubleClick={() => onDoubleClick(buddy.id)}
      onDragStart={() => onDragStart(buddy.id)}
      onDragEnd={onDragEnd}
    >
      <div className="buddy-main">
        <span className={`status-indicator status-${status.state}`}></span>
        <div className="buddy-info">
          <div className="buddy-name">{buddy.screenName}</div>
          {status.state !== 'online' && <div className="buddy-status">{getStatusText(status)}</div>}
        </div>
      </div>
      {status.awayMessage && <div className="buddy-away-message">{status.awayMessage}</div>}
    </div>
  )
}

function getStatusText(status: BuddyStatus): string {
  switch (status.state) {
    case 'away':
      return 'Away'
    case 'busy':
      return 'Busy'
    case 'offline':
      return 'Offline'
    default:
      return ''
  }
}
