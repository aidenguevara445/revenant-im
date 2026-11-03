import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc'
import type { KeyMeta, ProviderKind, Buddy } from '../shared/types'

// ── Typed API for window.revenant ───────────────────────────────

const revenantAPI = {
  // ── Keys ──
  keys: {
    list: (): Promise<KeyMeta[]> => ipcRenderer.invoke(IPC.keysList),
    save: (args: {
      label: string
      provider: ProviderKind
      key: string
      baseUrl?: string
      id?: string
    }): Promise<{ success: boolean; keyId?: string; error?: string }> =>
      ipcRenderer.invoke(IPC.keysSave, args),
    delete: (keyId: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke(IPC.keysDelete, keyId),
    test: (keyId: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke(IPC.keysTest, keyId)
  },

  // ── Team ──
  team: {
    get: (): Promise<{ main: Buddy | null; buddies: Buddy[] }> => ipcRenderer.invoke(IPC.teamGet),
    set: (team: {
      main: Buddy | null
      buddies: Buddy[]
    }): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke(IPC.teamSet, team)
  },

  // ── Settings ──
  settings: {
    get: (): Promise<{ maxAttempts: number; escalationTarget: string; muted: boolean }> =>
      ipcRenderer.invoke(IPC.settingsGet),
    set: (settings: {
      maxAttempts?: number
      escalationTarget?: string
      muted?: boolean
    }): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke(IPC.settingsSet, settings)
  }
}

// ── Expose to renderer ───────────────────────────────────────────

contextBridge.exposeInMainWorld('revenant', revenantAPI)

// Export type for renderer to use
export type RevenantAPI = typeof revenantAPI
