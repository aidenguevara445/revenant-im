# 👻 Revenant IM

**The instant messenger came back from the dead, and your buddies are AI models.**

Revenant IM resurrects the early-2000s desktop instant messenger as the control room for a
team of AI models. A smart **Main** model (e.g. Claude Sonnet) plans the work, writes a strict
contract for each task, hands tasks to cheaper **Buddies** (DeepSeek, local Ollama models,
anything OpenAI-compatible), and **reviews every result before you see it**. Bad work gets sent
back; repeated failures escalate. The **Ledger** shows how much you saved versus running
everything on Main.

> Built for the Kiroween 2026 hackathon (Resurrection category).

## Status
🚧 Under construction during the Kiroween 2026 submission period.

## Features (planned)
- Sign-on screen, buddy list, IM windows, away messages and synthesized sounds
- Bring your own API keys (Anthropic, OpenAI, DeepSeek, OpenRouter, Groq, Ollama, custom)
- Keys encrypted with your OS keychain; never leave the main process
- Contract → attempt → review → retry → escalate loop
- Cost ledger with savings vs. an all-Main baseline

## Run from source
```bash
npm install
npm run dev
```

## How this was built with Kiro
Everything Kiro uses lives in [`.kiro/`](.kiro):
- **Specs:** [`revenant-shell`](.kiro/specs/revenant-shell) and [`revenant-orchestrator`](.kiro/specs/revenant-orchestrator) (requirements → design → tasks)
- **Steering:** product, tech and structure docs, plus a provider-rules doc that loads only for adapter files
- **Hooks:** typecheck on save, trademark guard, provider-test sync, API-key leak check

A full write-up will be added before submission.

## Pre-existing code disclosure
The project was started from the standard `@quick-start/electron` React + TypeScript template.
All other code was written during the Kiroween 2026 submission period.

## License
[MIT](LICENSE)
