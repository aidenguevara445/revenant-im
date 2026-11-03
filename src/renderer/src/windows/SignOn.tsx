// SignOn window: the first screen users see when starting Revenant IM.
// Shows the logo, a screen name field, and a "Sign On" button.
// If no keys are saved, shows a "Summon your first spirit" link.

import { useState, useEffect } from 'react'
import { useWindowManager } from '../desktop/useWindowManager'
import { play } from '../sound/synth'
import './SignOn.css'

export default function SignOn(): React.JSX.Element {
  const wm = useWindowManager()
  const [screenName, setScreenName] = useState('')
  const [hasKeys, setHasKeys] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if any keys are saved
    window.revenant.keys
      .list()
      .then((keys) => {
        setHasKeys(keys.length > 0)
      })
      .catch((err) => {
        console.error('Failed to check keys:', err)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const handleSignOn = (): void => {
    if (!screenName.trim()) return

    // Play sign-on sound
    play('signOn')

    // Close sign-on window
    const signonWin = wm.windows.find((w) => w.kind === 'signon')
    if (signonWin) {
      wm.close(signonWin.id)
    }

    // Open buddy list
    wm.open('buddyList', 'Buddy List', 240, 400)
  }

  const handleOpenPreferences = (): void => {
    // Check if preferences is already open
    const prefsWin = wm.windows.find((w) => w.kind === 'preferences')
    if (prefsWin) {
      wm.focus(prefsWin.id)
      return
    }
    wm.open('preferences', 'Preferences', 500, 400)
  }

  return (
    <div className="signon-container">
      <div className="signon-logo">
        <div className="signon-logo-text">👻</div>
        <h1>Revenant IM</h1>
        <p className="signon-tagline">Your buddies came back from the dead</p>
      </div>

      <div className="signon-form">
        <label htmlFor="screenName">Screen Name</label>
        <input
          id="screenName"
          type="text"
          value={screenName}
          onChange={(e) => setScreenName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSignOn()
          }}
          placeholder="Enter your screen name"
          autoFocus
        />

        <button onClick={handleSignOn} disabled={!screenName.trim()} className="btn-primary">
          Sign On
        </button>

        {!loading && !hasKeys && (
          <div className="signon-hint">
            <button onClick={handleOpenPreferences} className="btn-link">
              👻 Summon your first spirit
            </button>
            <p className="hint-text">Add an API key to get started</p>
          </div>
        )}
      </div>

      <div className="signon-footer">
        <small>Built for Kiroween 2026 🎃</small>
      </div>
    </div>
  )
}
