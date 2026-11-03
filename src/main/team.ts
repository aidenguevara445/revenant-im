// Team storage: persistent storage of the user's team (main model and buddies).
// Stored in userData/team.json as plain JSON.

import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import type { Buddy } from '../shared/types'

interface TeamData {
  main: Buddy | null
  buddies: Buddy[]
}

const TEAM_FILE = join(app.getPath('userData'), 'team.json')

/** Load team from disk. Returns empty team if file doesn't exist. */
function loadTeam(): TeamData {
  if (!existsSync(TEAM_FILE)) {
    return { main: null, buddies: [] }
  }
  try {
    const raw = readFileSync(TEAM_FILE, 'utf-8')
    const parsed = JSON.parse(raw)
    if (typeof parsed === 'object' && Array.isArray(parsed.buddies)) {
      return parsed as TeamData
    }
    return { main: null, buddies: [] }
  } catch {
    return { main: null, buddies: [] }
  }
}

/** Save team to disk. */
function saveTeam(data: TeamData): void {
  try {
    writeFileSync(TEAM_FILE, JSON.stringify(data, null, 2), 'utf-8')
  } catch (err) {
    throw new Error(`Failed to save team: ${err}`, { cause: err })
  }
}

/**
 * Get the current team.
 */
export function getTeam(): TeamData {
  return loadTeam()
}

/**
 * Set the team (replace entirely).
 */
export function setTeam(team: TeamData): void {
  saveTeam(team)
}
