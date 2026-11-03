---
inclusion: always
---

# Tech stack

- Electron + electron-vite, React 19, TypeScript (strict). Started from the
  `@quick-start/electron` react-ts template.
- Tests: Vitest; property-based tests with fast-check for orchestrator logic.
- Packaging: electron-builder (macOS .dmg, Windows .exe, Linux AppImage) via GitHub Actions.

## Security rules
- API keys live ONLY in the main process, encrypted with Electron `safeStorage`.
  The renderer never receives a saved key back; it only sees `{ id, label, provider, hasKey }`.
- All model HTTP calls happen in the main process. The renderer talks to it only
  through the typed preload bridge (`window.revenant`), never `ipcRenderer` directly.
- `contextIsolation: true`, `nodeIntegration: false`, sandboxed renderer.

## Providers
- `anthropic`: native Messages API.
- `openai-compatible`: one adapter for OpenAI, DeepSeek, OpenRouter, Groq, Ollama, LM Studio
  (configurable base URL).
- Users bring their own API keys. Do NOT implement Claude.ai subscription login or reuse
  Claude Code credentials; that violates Anthropic's terms.

## Commands
- `npm run dev` start the app
- `npm run typecheck` / `npm run lint`
- `npm test` run unit + property tests
