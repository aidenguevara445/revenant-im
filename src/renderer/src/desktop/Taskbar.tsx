import type { WindowState } from '@shared/types'

interface TaskbarProps {
  windows: WindowState[]
  titles: Record<string, string>
  activeId: string | null
  flashing: Set<string>
  onTaskbarClick: (id: string) => void
}

/** Bottom taskbar with one button per open window. */
function Taskbar({
  windows,
  titles,
  activeId,
  flashing,
  onTaskbarClick
}: TaskbarProps): React.JSX.Element {
  return (
    <div className="rv-taskbar">
      {windows.map((win) => {
        const isActive = win.id === activeId && !win.minimized
        const isFlashing = flashing.has(win.id)
        const className = [
          'rv-taskbar-btn',
          isActive ? 'rv-taskbar-btn--active' : '',
          isFlashing ? 'rv-taskbar-btn--flash' : ''
        ]
          .filter(Boolean)
          .join(' ')

        return (
          <button
            key={win.id}
            className={className}
            onClick={() => onTaskbarClick(win.id)}
            title={titles[win.id] ?? win.kind}
          >
            {win.minimized ? '▾ ' : ''}
            {titles[win.id] ?? win.kind}
          </button>
        )
      })}
    </div>
  )
}

export default Taskbar
