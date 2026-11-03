// BuddyList window: shows the user's team of AI models.
// This is a placeholder implementation for task 6; full implementation in task 8.

import './BuddyList.css'

export default function BuddyList(): React.JSX.Element {
  return (
    <div className="buddylist-container">
      <div className="buddylist-header">
        <div className="buddylist-user">
          <span className="status-indicator status-online"></span>
          <span className="screen-name">You</span>
        </div>
      </div>

      <div className="buddylist-groups">
        <div className="buddy-group">
          <div className="group-header">
            <span className="group-icon">👑</span>
            <span className="group-name">Main</span>
          </div>
          <div className="group-buddies">
            <div className="buddy-placeholder">No main model configured</div>
          </div>
        </div>

        <div className="buddy-group">
          <div className="group-header">
            <span className="group-icon">👻</span>
            <span className="group-name">Buddies</span>
          </div>
          <div className="group-buddies">
            <div className="buddy-placeholder">No buddies configured</div>
          </div>
        </div>
      </div>

      <div className="buddylist-footer">
        <button className="buddylist-action" title="Preferences">
          ⚙️
        </button>
        <button className="buddylist-action" title="Ledger">
          💰
        </button>
      </div>
    </div>
  )
}
