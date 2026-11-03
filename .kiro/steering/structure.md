---
inclusion: always
---

# Project structure

```
src/
  main/                 Electron main process
    index.ts            window creation, IPC registration
    keystore.ts         encrypted API key storage (safeStorage)
    providers/          one file per provider adapter + shared types
    orchestrator/       contract, dispatch, review, escalation, ledger
  preload/              typed bridge exposed as window.revenant
  shared/               types shared by main and renderer (no Node or DOM imports)
  renderer/src/
    desktop/            in-app window manager (drag, focus, z-order, minimize)
    windows/            SignOn, BuddyList, IMWindow, Preferences, Ledger
    sound/              synthesized sign-on / message / sign-off sounds (Web Audio)
    theme/              CSS variables and retro window chrome
```

## Conventions
- Pure logic (orchestrator, ledger, contract parsing) has no Electron imports so it can be
  unit and property tested.
- One React component per window in `windows/`; shared chrome lives in `desktop/`.
- IPC channel names are declared once in `src/shared/ipc.ts`.
