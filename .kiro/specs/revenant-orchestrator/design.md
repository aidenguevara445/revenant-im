# Design: Revenant Orchestrator

## Overview
Pure TypeScript in `src/main/orchestrator/`, with provider adapters injected so the whole
loop can be tested with fake providers.

## Flow
```
user request
   -> Main.plan()            -> answer directly, or Plan { tasks: Contract[] }
   -> for each task (parallel, limit 3):
        attempt = 1
        loop:
          result  = Buddy.run(contract, feedback?)
          review  = Main.review(contract, result)
          accept  -> done
          reject  -> attempt < max ? retry with feedback : escalate
   -> Main.combine(accepted results) -> final reply
```

## Interfaces
```ts
interface ChatRequest { model: string; system?: string; messages: { role: 'user' | 'assistant'; content: string }[]; maxTokens?: number }
interface ChatResult  { text: string; usage: { inputTokens: number; outputTokens: number } }
interface ModelProvider { chat(req: ChatRequest, signal?: AbortSignal): Promise<ChatResult> }

interface Contract { id: string; goal: string; scope: { allowed: string[]; forbidden: string[] }; acceptance: string[]; assignee: string }
interface Review   { verdict: 'accept' | 'reject'; feedback: string; failedChecks: string[] }
interface LedgerEntry { requestId: string; buddyId: string; model: string; inputTokens: number; outputTokens: number; cost: number; baselineCost: number; priceKnown: boolean }
```

## Prompts (`orchestrator/prompts.ts`)
- **plan**: Main receives the team roster (buddy names + models + strengths) and must return JSON only.
- **run**: the buddy gets the contract as a numbered checklist and is told to stay inside scope.
- **review**: Main gets contract + result, must check every acceptance item and return JSON only.

## Correctness properties (property-based tests with fast-check)
1. **Bounded attempts**: for any sequence of review verdicts, a task never gets more than `maxAttempts` buddy attempts, plus at most one escalation.
2. **Nothing unreviewed**: every result that reaches `combine` has an `accept` verdict or came from escalation.
3. **Ledger sums**: total cost equals the sum of entries; savings = baseline - actual, for any entries.
4. **Contract round-trip**: `parseContract(serializeContract(c))` deep-equals `c` for any valid contract.
5. **Model pinning**: every call a buddy makes uses exactly that buddy's configured model ID.

## Error handling
- Provider error on a buddy -> counts as a failed attempt with feedback "provider error: <kind>".
- Provider error on Main -> stop the request and emit `error`.
- Invalid JSON from Main -> one repair attempt, then Main answers directly.
