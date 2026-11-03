// Settings storage: persistent storage of app settings.
// Stored in userData/settings.json as plain JSON.

import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'

export interface Settings {
  maxAttempts: number
  escalationTarget: string
  muted: boolean
}

const SETTINGS_FILE = join(app.getPath('userData'), 'settings.json')

const DEFAULT_SETTINGS: Settings = {
  maxAttempts: 2,
  escalationTarget: 'main',
  muted: false
}

/** Load settings from disk. Returns defaults if file doesn't exist. */
function loadSettings(): Settings {
  if (!existsSync(SETTINGS_FILE)) {
    return { ...DEFAULT_SETTINGS }
  }
  try {
    const raw = readFileSync(SETTINGS_FILE, 'utf-8')
    const parsed = JSON.parse(raw)
    if (typeof parsed === 'object') {
      return {
        maxAttempts: parsed.maxAttempts ?? DEFAULT_SETTINGS.maxAttempts,
        escalationTarget: parsed.escalationTarget ?? DEFAULT_SETTINGS.escalationTarget,
        muted: parsed.muted ?? DEFAULT_SETTINGS.muted
      }
    }
    return { ...DEFAULT_SETTINGS }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

/** Save settings to disk. */
function saveSettings(data: Settings): void {
  try {
    writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf-8')
  } catch (err) {
    throw new Error(`Failed to save settings: ${err}`, { cause: err })
  }
}

/**
 * Get the current settings.
 */
export function getSettings(): Settings {
  return loadSettings()
}

/**
 * Update settings (partial update).
 */
export function updateSettings(partial: Partial<Settings>): void {
  const current = loadSettings()
  const updated = { ...current, ...partial }
  saveSettings(updated)
}
