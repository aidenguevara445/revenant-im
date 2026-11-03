---
inclusion: fileMatch
fileMatchPattern: "src/main/providers/**"
---

# Provider adapter rules

- Every adapter implements `ModelProvider` from `src/main/providers/types.ts`:
  `chat(request, signal) => Promise<ChatResult>` returning text plus
  `usage: { inputTokens, outputTokens }`.
- Support cancellation through `AbortSignal`.
- Map HTTP errors to `ProviderError` with a `kind`: `auth`, `rate_limit`, `network`, `bad_request`, `server`.
- Never log request headers or keys.
- Prices per million tokens come from `src/shared/pricing.ts` and can be edited by the user;
  unknown models default to 0 and show "price unknown" in the Ledger.
