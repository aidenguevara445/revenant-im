// Preferences window: Keys, Team, and Rules tabs.
// Keys tab: add, test, and delete API keys for providers.
// Team tab: add buddies and choose which is Main.
// Rules tab: max attempts before escalation, escalation target, mute setting.

import { useState, useEffect } from 'react'
import type { KeyMeta, Buddy, ProviderKind } from '../../../shared/types'
import './Preferences.css'

type TabKind = 'keys' | 'team' | 'rules'

export default function Preferences(): React.JSX.Element {
  const [tab, setTab] = useState<TabKind>('keys')

  return (
    <div className="prefs-container">
      <div className="prefs-tabs">
        <button
          className={tab === 'keys' ? 'prefs-tab prefs-tab--active' : 'prefs-tab'}
          onClick={() => setTab('keys')}
        >
          Keys
        </button>
        <button
          className={tab === 'team' ? 'prefs-tab prefs-tab--active' : 'prefs-tab'}
          onClick={() => setTab('team')}
        >
          Team
        </button>
        <button
          className={tab === 'rules' ? 'prefs-tab prefs-tab--active' : 'prefs-tab'}
          onClick={() => setTab('rules')}
        >
          Rules
        </button>
      </div>

      <div className="prefs-content">
        {tab === 'keys' && <KeysTab />}
        {tab === 'team' && <TeamTab />}
        {tab === 'rules' && <RulesTab />}
      </div>
    </div>
  )
}

// ── Keys Tab ─────────────────────────────────────────────────────

function KeysTab(): React.JSX.Element {
  const [keys, setKeys] = useState<KeyMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null) // key ID being edited or 'new'

  const loadKeys = (): void => {
    setLoading(true)
    window.revenant.keys
      .list()
      .then((list) => setKeys(list))
      .catch((err) => console.error('Failed to load keys:', err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadKeys()
  }, [])

  const handleSave = (): void => {
    setEditing(null)
    loadKeys()
  }

  const handleDelete = async (keyId: string): Promise<void> => {
    if (!confirm('Delete this API key?')) return
    const result = await window.revenant.keys.delete(keyId)
    if (result.success) {
      loadKeys()
    } else {
      alert(`Failed to delete key: ${result.error}`)
    }
  }

  if (loading) {
    return <div className="prefs-loading">Loading keys...</div>
  }

  return (
    <div className="keys-tab">
      <div className="keys-list">
        {keys.length === 0 && !editing && (
          <div className="prefs-empty">No API keys saved. Add one to get started.</div>
        )}
        {keys.map((key) =>
          editing === key.id ? (
            <KeyEditor
              key={key.id}
              existing={key}
              onSave={handleSave}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <KeyRow
              key={key.id}
              keyMeta={key}
              onEdit={() => setEditing(key.id)}
              onDelete={handleDelete}
            />
          )
        )}
        {editing === 'new' && <KeyEditor onSave={handleSave} onCancel={() => setEditing(null)} />}
      </div>

      {!editing && (
        <button className="btn-primary" onClick={() => setEditing('new')}>
          + Add Key
        </button>
      )}
    </div>
  )
}

interface KeyRowProps {
  keyMeta: KeyMeta
  onEdit: () => void
  onDelete: (id: string) => void
}

function KeyRow({ keyMeta, onEdit, onDelete }: KeyRowProps): React.JSX.Element {
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null)

  const handleTest = async (): Promise<void> => {
    setTesting(true)
    setTestResult(null)
    const result = await window.revenant.keys.test(keyMeta.id)
    setTestResult(result)
    setTesting(false)
  }

  return (
    <div className="key-row">
      <div className="key-row-main">
        <div className="key-row-info">
          <div className="key-label">{keyMeta.label}</div>
          <div className="key-meta">
            {keyMeta.provider === 'anthropic' ? 'Anthropic' : 'OpenAI-compatible'}
            {keyMeta.baseUrl && ` • ${keyMeta.baseUrl}`}
          </div>
        </div>
        <div className="key-row-actions">
          <button className="btn-small" onClick={handleTest} disabled={testing}>
            {testing ? 'Testing...' : 'Test'}
          </button>
          <button className="btn-small" onClick={onEdit}>
            Edit
          </button>
          <button className="btn-small btn-danger" onClick={() => onDelete(keyMeta.id)}>
            Delete
          </button>
        </div>
      </div>
      {testResult && (
        <div
          className={
            testResult.success ? 'test-result test-result--ok' : 'test-result test-result--error'
          }
        >
          {testResult.success ? '✓ Key is valid' : `✗ ${testResult.error}`}
        </div>
      )}
    </div>
  )
}

interface KeyEditorProps {
  existing?: KeyMeta
  onSave: () => void
  onCancel: () => void
}

function KeyEditor({ existing, onSave, onCancel }: KeyEditorProps): React.JSX.Element {
  const [label, setLabel] = useState(existing?.label ?? '')
  const [provider, setProvider] = useState<ProviderKind>(existing?.provider ?? 'anthropic')
  const [key, setKey] = useState('')
  const [baseUrl, setBaseUrl] = useState(existing?.baseUrl ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async (): Promise<void> => {
    if (!label.trim()) {
      setError('Label is required')
      return
    }
    if (!key.trim() && !existing) {
      setError('API key is required')
      return
    }
    if (provider === 'openai-compatible' && !baseUrl.trim()) {
      setError('Base URL is required for OpenAI-compatible providers')
      return
    }

    // If editing and key field is empty, we need to keep the existing key
    // The backend doesn't support partial updates, so we can't save without a key
    if (existing && !key.trim()) {
      setError('To update, you must re-enter the API key')
      return
    }

    setSaving(true)
    setError(null)

    const result = await window.revenant.keys.save({
      label,
      provider,
      key: key.trim(),
      baseUrl: provider === 'openai-compatible' ? baseUrl.trim() : undefined,
      id: existing?.id
    })

    setSaving(false)

    if (result.success) {
      onSave()
    } else {
      setError(result.error ?? 'Failed to save key')
    }
  }

  return (
    <div className="key-editor">
      <div className="key-editor-form">
        <div className="form-group">
          <label htmlFor="key-label">Label</label>
          <input
            id="key-label"
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g., My Anthropic Key"
          />
        </div>

        <div className="form-group">
          <label htmlFor="key-provider">Provider</label>
          <select
            id="key-provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value as ProviderKind)}
          >
            <option value="anthropic">Anthropic</option>
            <option value="openai-compatible">OpenAI-compatible</option>
          </select>
        </div>

        {provider === 'openai-compatible' && (
          <div className="form-group">
            <label htmlFor="key-baseUrl">Base URL</label>
            <input
              id="key-baseUrl"
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="e.g., https://api.openai.com/v1"
            />
            <div className="form-hint">
              For OpenAI, DeepSeek, OpenRouter, Groq, Ollama, LM Studio, etc.
            </div>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="key-value">API Key</label>
          <input
            id="key-value"
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={existing ? 'Re-enter key to update' : 'Paste your API key'}
          />
        </div>

        {error && <div className="form-error">{error}</div>}

        <div className="form-actions">
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : existing ? 'Save' : 'Add Key'}
          </button>
          <button className="btn-secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Team Tab ─────────────────────────────────────────────────────

function TeamTab(): React.JSX.Element {
  const [main, setMain] = useState<Buddy | null>(null)
  const [buddies, setBuddies] = useState<Buddy[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null) // buddy ID being edited or 'new'

  const loadTeam = (): void => {
    setLoading(true)
    window.revenant.team
      .get()
      .then((team) => {
        setMain(team.main)
        setBuddies(team.buddies)
      })
      .catch((err) => console.error('Failed to load team:', err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTeam()
  }, [])

  const handleSave = async (buddy: Buddy): Promise<void> => {
    const updatedTeam = { main, buddies: [...buddies] }

    if (buddy.role === 'main') {
      updatedTeam.main = buddy
    } else {
      const existingIndex = buddies.findIndex((b) => b.id === buddy.id)
      if (existingIndex >= 0) {
        updatedTeam.buddies[existingIndex] = buddy
      } else {
        updatedTeam.buddies.push(buddy)
      }
    }

    const result = await window.revenant.team.set(updatedTeam)
    if (result.success) {
      setEditing(null)
      loadTeam()
    } else {
      alert(`Failed to save team: ${result.error}`)
    }
  }

  const handleDelete = async (buddyId: string): Promise<void> => {
    if (!confirm('Remove this buddy from your team?')) return

    const updatedTeam = {
      main: main?.id === buddyId ? null : main,
      buddies: buddies.filter((b) => b.id !== buddyId)
    }

    const result = await window.revenant.team.set(updatedTeam)
    if (result.success) {
      loadTeam()
    } else {
      alert(`Failed to remove buddy: ${result.error}`)
    }
  }

  if (loading) {
    return <div className="prefs-loading">Loading team...</div>
  }

  return (
    <div className="team-tab">
      <div className="team-section">
        <h3 className="team-section-title">Main Model</h3>
        {main ? (
          editing === main.id ? (
            <BuddyEditor buddy={main} onSave={handleSave} onCancel={() => setEditing(null)} />
          ) : (
            <BuddyRow buddy={main} onEdit={() => setEditing(main.id)} onDelete={handleDelete} />
          )
        ) : (
          <div className="prefs-empty">No main model set.</div>
        )}
        {!main && !editing && (
          <button className="btn-primary" onClick={() => setEditing('new-main')}>
            + Set Main Model
          </button>
        )}
        {editing === 'new-main' && (
          <BuddyEditor onSave={handleSave} onCancel={() => setEditing(null)} role="main" />
        )}
      </div>

      <div className="team-section">
        <h3 className="team-section-title">Buddies</h3>
        {buddies.length === 0 && !editing && (
          <div className="prefs-empty">No buddies yet. Add one to delegate work.</div>
        )}
        {buddies.map((buddy) =>
          editing === buddy.id ? (
            <BuddyEditor
              key={buddy.id}
              buddy={buddy}
              onSave={handleSave}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <BuddyRow
              key={buddy.id}
              buddy={buddy}
              onEdit={() => setEditing(buddy.id)}
              onDelete={handleDelete}
            />
          )
        )}
        {editing === 'new-buddy' && (
          <BuddyEditor onSave={handleSave} onCancel={() => setEditing(null)} role="buddy" />
        )}
        {!editing && (
          <button className="btn-primary" onClick={() => setEditing('new-buddy')}>
            + Add Buddy
          </button>
        )}
      </div>
    </div>
  )
}

interface BuddyRowProps {
  buddy: Buddy
  onEdit: () => void
  onDelete: (id: string) => void
}

function BuddyRow({ buddy, onEdit, onDelete }: BuddyRowProps): React.JSX.Element {
  return (
    <div className="buddy-row">
      <div className="buddy-row-info">
        <div className="buddy-name">{buddy.screenName}</div>
        <div className="buddy-meta">{buddy.model}</div>
      </div>
      <div className="buddy-row-actions">
        <button className="btn-small" onClick={onEdit}>
          Edit
        </button>
        <button className="btn-small btn-danger" onClick={() => onDelete(buddy.id)}>
          Remove
        </button>
      </div>
    </div>
  )
}

interface BuddyEditorProps {
  buddy?: Buddy
  role?: 'main' | 'buddy'
  onSave: (buddy: Buddy) => void
  onCancel: () => void
}

function BuddyEditor({ buddy, role, onSave, onCancel }: BuddyEditorProps): React.JSX.Element {
  const [screenName, setScreenName] = useState(buddy?.screenName ?? '')
  const [keyId, setKeyId] = useState(buddy?.keyId ?? '')
  const [model, setModel] = useState(buddy?.model ?? '')
  const [keys, setKeys] = useState<KeyMeta[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.revenant.keys.list().then(setKeys).catch(console.error)
  }, [])

  const handleSave = (): void => {
    if (!screenName.trim()) {
      setError('Screen name is required')
      return
    }
    if (!keyId) {
      setError('Please select an API key')
      return
    }
    if (!model.trim()) {
      setError('Model ID is required')
      return
    }

    const newBuddy: Buddy = {
      id: buddy?.id ?? `buddy-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      screenName: screenName.trim(),
      keyId,
      model: model.trim(),
      role: buddy?.role ?? role ?? 'buddy'
    }

    onSave(newBuddy)
  }

  return (
    <div className="buddy-editor">
      <div className="form-group">
        <label htmlFor="buddy-name">Screen Name</label>
        <input
          id="buddy-name"
          type="text"
          value={screenName}
          onChange={(e) => setScreenName(e.target.value)}
          placeholder="e.g., Claude, DeepSeek"
        />
      </div>

      <div className="form-group">
        <label htmlFor="buddy-key">API Key</label>
        <select id="buddy-key" value={keyId} onChange={(e) => setKeyId(e.target.value)}>
          <option value="">-- Select a key --</option>
          {keys.map((k) => (
            <option key={k.id} value={k.id}>
              {k.label}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="buddy-model">Model ID</label>
        <input
          id="buddy-model"
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="e.g., claude-sonnet-4, deepseek-chat"
        />
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="form-actions">
        <button className="btn-primary" onClick={handleSave}>
          {buddy ? 'Save' : 'Add'}
        </button>
        <button className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Rules Tab ────────────────────────────────────────────────────

function RulesTab(): React.JSX.Element {
  const [maxAttempts, setMaxAttempts] = useState(2)
  const [escalationTarget, setEscalationTarget] = useState('main')
  const [muted, setMuted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    window.revenant.settings
      .get()
      .then((settings) => {
        setMaxAttempts(settings.maxAttempts)
        setEscalationTarget(settings.escalationTarget)
        setMuted(settings.muted)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (): Promise<void> => {
    setSaving(true)
    const result = await window.revenant.settings.set({ maxAttempts, escalationTarget, muted })
    setSaving(false)
    if (!result.success) {
      alert(`Failed to save settings: ${result.error}`)
    }
  }

  if (loading) {
    return <div className="prefs-loading">Loading settings...</div>
  }

  return (
    <div className="rules-tab">
      <div className="form-group">
        <label htmlFor="max-attempts">Max Attempts Before Escalation</label>
        <input
          id="max-attempts"
          type="number"
          min="1"
          max="5"
          value={maxAttempts}
          onChange={(e) => setMaxAttempts(parseInt(e.target.value, 10))}
        />
        <div className="form-hint">
          How many times a buddy can fail before escalating to a stronger model.
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="escalation-target">Escalation Target</label>
        <select
          id="escalation-target"
          value={escalationTarget}
          onChange={(e) => setEscalationTarget(e.target.value)}
        >
          <option value="main">Main model</option>
          <option value="none">No escalation</option>
        </select>
        <div className="form-hint">Where to send tasks that fail max attempts.</div>
      </div>

      <div className="form-group">
        <label className="form-checkbox">
          <input type="checkbox" checked={muted} onChange={(e) => setMuted(e.target.checked)} />
          <span>Mute sounds</span>
        </label>
      </div>

      <div className="form-actions">
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}
