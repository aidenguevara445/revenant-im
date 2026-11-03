# Implementation Plan: Revenant Orchestrator

- [ ] 1. Shared types and pricing
  - `src/main/providers/types.ts`, `src/shared/pricing.ts` (editable price table).
  - _Requirements: 1.2, 5.4_

- [ ] 2. Provider adapters
  - [ ] 2.1 `anthropic.ts` (Messages API, usage, error mapping, abort).
  - [ ] 2.2 `openaiCompatible.ts` (base URL; works for OpenAI, DeepSeek, OpenRouter, Groq, Ollama).
  - [ ] 2.3 Unit tests with mocked `fetch`.
  - _Requirements: 1_

- [ ] 3. Contracts
  - `contract.ts`: parse + validate + serialize; repair flow.
  - Property test 4 (round-trip).
  - _Requirements: 2_

- [ ] 4. Review loop
  - [ ] 4.1 `runTask.ts`: attempt / review / retry / escalate.
  - [ ] 4.2 Property tests 1, 2 and 5 with fake providers.
  - _Requirements: 3_

- [ ] 5. Orchestrator
  - `orchestrator.ts`: plan -> parallel tasks (limit 3) -> combine; event emitter.
  - _Requirements: 3.6, 4_

- [ ] 6. Ledger
  - `ledger.ts` with baseline + savings; property test 3.
  - _Requirements: 5_

- [ ] 7. Wire to the app
  - IPC `chat:send`, `chat:cancel`, event stream to renderer; Buddy List statuses; Ledger window.
  - _Requirements: 4, 5.3_

- [ ] 8. Packaging and release
  - GitHub Actions workflow building macOS/Windows/Linux installers on tag; attach to Release.
