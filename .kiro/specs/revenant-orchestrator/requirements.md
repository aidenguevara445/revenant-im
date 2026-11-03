# Requirements: Revenant Orchestrator (providers, contracts, review loop, ledger)

## Introduction
The engine behind Revenant IM: talk to many model providers, have the Main model split work
into contracted tasks, dispatch them to cheaper Buddy models, review every result, escalate
failures, and account for cost.

## Requirements

### Requirement 1: Provider adapters
**User story:** As a user, I want to use models from different providers with my own keys.
1. The system SHALL support an `anthropic` adapter (Messages API) and an `openai-compatible` adapter (chat completions) with a configurable base URL.
2. Each call SHALL return text and token usage `{ inputTokens, outputTokens }`.
3. IF a provider call fails THEN the system SHALL return a `ProviderError` with kind `auth`, `rate_limit`, `network`, `bad_request` or `server`.
4. WHEN the user cancels THEN in-flight calls SHALL abort via `AbortSignal`.
5. The system SHALL use the exact model ID configured for each buddy; it SHALL NOT substitute another model.

### Requirement 2: Planning and contracts
**User story:** As a user, I want Main to give buddies precise instructions so they don't go off track.
1. WHEN the user sends a request THEN Main SHALL decide to answer directly or produce a plan of 1-8 tasks.
2. Each task SHALL have a contract: `goal`, `scope` (what is allowed / not allowed), `acceptance` (a checklist), `assignee` (buddy ID).
3. The contract SHALL be produced as JSON and validated; IF parsing fails THEN Main SHALL be asked once to repair it, otherwise Main does the work itself.

### Requirement 3: Dispatch and review
**User story:** As a user, I want Main to check every buddy's work before I see it.
1. The system SHALL send each task to its assignee with the contract as instructions.
2. WHEN a buddy returns a result THEN Main SHALL review it against the acceptance checklist and return `{ verdict: 'accept' | 'reject', feedback, failedChecks[] }`.
3. IF rejected AND attempts < maxAttempts THEN the system SHALL resend the task with Main's feedback.
4. IF rejected AND attempts = maxAttempts THEN the system SHALL escalate the task to the escalation target (default: Main).
5. Only accepted (or escalated) results SHALL be combined into Main's final reply.
6. Independent tasks SHALL run in parallel, up to a concurrency limit (default 3).

### Requirement 4: Live status events
**User story:** As a user, I want to watch the team work in the Buddy List.
1. The orchestrator SHALL emit events: `plan`, `task:start`, `task:attempt`, `task:review`, `task:escalate`, `task:done`, `final`, `error`.
2. The renderer SHALL turn these into buddy statuses and away messages.

### Requirement 5: Cost ledger
**User story:** As a user, I want to see how much money the team saved.
1. The system SHALL record tokens and cost for every call, per buddy and per request.
2. The system SHALL show a baseline: what the same tokens would have cost on Main's model.
3. The Ledger window SHALL show actual cost, baseline cost and savings (amount and percent).
4. IF a model has no known price THEN its cost SHALL count as 0 and be marked "price unknown".
