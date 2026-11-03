# Implementation Plan: Revenant Shell

- [ ] 1. Project foundation
  - Remove template demo content (Versions component, electron logo, wavy lines).
  - Add `src/shared/types.ts` and `src/shared/ipc.ts`; set app name/productName to "Revenant IM".
  - Add Vitest + fast-check, `npm test` script.
  - _Requirements: 2, 5_

- [ ] 2. Haunted theme and retro chrome
  - `theme/tokens.css` palette, pixel font, window chrome styles, fog background (reduced-motion aware).
  - _Requirements: 6.1, 6.4_

- [ ] 3. Window manager
  - [ ] 3.1 WindowManager reducer + RetroWindow drag/focus/minimize + Taskbar.
  - [ ] 3.2 Persist window positions.
  - [ ] 3.3 Unit and property tests for the reducer.
  - _Requirements: 2_

- [ ] 4. Synthesized sounds
  - `sound/synth.ts` with signOn, message, buddyOn, buddyOff; mute setting.
  - _Requirements: 1.3, 1.4, 6.2_

- [ ] 5. Keystore and preload bridge
  - [ ] 5.1 `main/keystore.ts` with safeStorage.
  - [ ] 5.2 IPC handlers + typed `window.revenant` bridge.
  - _Requirements: 5.1, 5.2_

- [ ] 6. Sign-On window
  - _Requirements: 1_

- [ ] 7. Preferences window (Keys, Team, Rules tabs)
  - Key "Test" calls the provider adapter from the orchestrator spec (task 2 there).
  - _Requirements: 5_

- [ ] 8. Buddy List window
  - Groups, statuses, away messages, double-click to IM, drag to Main.
  - _Requirements: 3_

- [ ] 9. IM windows
  - Main chat, buddy work log (contract, attempts, verdicts), typing indicator, unread flash.
  - _Requirements: 4_

- [ ] 10. Trademark and polish pass
  - Run the trademark-guard hook over `src/renderer`; final visual pass.
  - _Requirements: 6.3_
