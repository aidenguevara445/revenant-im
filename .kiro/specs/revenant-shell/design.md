# Design: Revenant Shell

## Overview
A single Electron BrowserWindow hosts a React "desktop". Retro windows are React
components managed by an in-app window manager. The main process owns keys and model calls.

## Architecture
```
Renderer (React, sandboxed)          Preload            Main process
  Desktop + WindowManager   <--->  window.revenant  <--->  ipc handlers
  windows/* (SignOn, BuddyList,       (typed API)          keystore.ts (safeStorage)
   IMWindow, Preferences, Ledger)                          orchestrator/ (other spec)
  sound/ (Web Audio synth)
```

## Components
- **WindowManager** (`desktop/WindowManager.tsx`): state `{ id, kind, x, y, w, h, z, minimized }[]`,
  actions `open`, `close`, `focus`, `move`, `minimize`, `restore`. Positions persist to
  `localStorage` (try/catch, falls back to defaults).
- **RetroWindow** (`desktop/RetroWindow.tsx`): title bar drag via pointer events, clamped to bounds.
- **Taskbar** (`desktop/Taskbar.tsx`): one button per open window, flashing state for unread.
- **Sound** (`sound/synth.ts`): `play('signOn' | 'message' | 'buddyOn' | 'buddyOff')` built from
  oscillators + noise (door creak = filtered noise with pitch sweep).
- **Keystore** (`main/keystore.ts`): `saveKey`, `listKeys` (metadata only), `deleteKey`,
  `getKeyForProvider` (main-only). Stored in `userData/keys.json`, values encrypted by `safeStorage`.

## Data models (`src/shared/types.ts`)
```ts
type ProviderKind = 'anthropic' | 'openai-compatible'
interface KeyMeta { id: string; label: string; provider: ProviderKind; baseUrl?: string; hasKey: boolean }
interface Buddy { id: string; screenName: string; keyId: string; model: string; role: 'main' | 'buddy' }
type BuddyStatus = { state: 'online' | 'away' | 'busy' | 'offline'; awayMessage?: string }
```

## IPC (`src/shared/ipc.ts`)
`keys:list`, `keys:save`, `keys:delete`, `keys:test`, `team:get`, `team:set`, `settings:get`, `settings:set`.

## Error handling
Key test failures show the `ProviderError.kind` in plain words ("Wrong key", "Rate limited").
`safeStorage` unavailable -> refuse to save and explain why.

## Testing
- Unit: WindowManager reducer (focus raises z, minimize/restore, clamp).
- Property (fast-check): for any sequence of window actions, z-orders stay unique and every
  window stays inside bounds.
