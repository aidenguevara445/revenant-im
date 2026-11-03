// Shared types used by both the main process and the renderer.
// This file must NOT import anything from Node or the DOM.

export type ProviderKind = 'anthropic' | 'openai-compatible'

/** Metadata about a stored API key — never includes the key itself. */
export interface KeyMeta {
  id: string
  label: string
  provider: ProviderKind
  baseUrl?: string
  hasKey: boolean
}

/** A model in the user's team. */
export interface Buddy {
  id: string
  screenName: string
  keyId: string
  model: string
  role: 'main' | 'buddy'
}

/** Runtime status of a buddy. */
export interface BuddyStatus {
  state: 'online' | 'away' | 'busy' | 'offline'
  awayMessage?: string
}

// ── Window manager types ──────────────────────────────────────────

export type WindowKind = 'signon' | 'buddyList' | 'im' | 'preferences' | 'ledger'

/** A managed window in the desktop. */
export interface WindowState {
  id: string
  kind: WindowKind
  x: number
  y: number
  w: number
  h: number
  z: number
  minimized: boolean
}

// ── Orchestrator-related shared types (used by ledger/contract) ──

export type ProviderErrorKind = 'auth' | 'rate_limit' | 'network' | 'bad_request' | 'server'

export interface ProviderError {
  kind: ProviderErrorKind
  message: string
}

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
}
