---
inclusion: always
---

# Product: Revenant IM

Revenant IM resurrects the early-2000s desktop instant messenger and turns it into the
control room for a team of AI models. Your buddy list is your agent team.

## The problem
Cheap models are fast and inexpensive but make mistakes. Expensive models are reliable
but cost 10-20x more. Existing multi-model tools let a main agent spawn subagents, but
nothing forces the main model to check the work before it is accepted.

## The core loop (never weaken this)
1. The user chats with the **Main** model (a smart model, e.g. Claude Sonnet).
2. Main splits the request into tasks and writes a **contract** per task:
   goal, allowed scope, and acceptance checks.
3. Each task goes to a **Buddy** (a cheaper model, e.g. DeepSeek or a local Ollama model).
4. Main **reviews** every Buddy result against its contract: accept, or send back with feedback.
5. After 2 rejected attempts the task **escalates** to a stronger model.
6. The **Ledger** shows real cost vs. the cost of running everything on Main.

## Theme rules
- Look and feel: a haunted version of a 2000s IM client (buddy list, IM windows,
  away messages, sign-on sounds), dark purple / ghost green palette.
- Status lines are in-world: "DeepSeek is away: sent back by Claude, try 2 of 3".
- NEVER use third-party trademarks: no "AIM", "AOL", "AOL Instant Messenger",
  the running-man logo, or original AOL sounds. All sounds are synthesized in code.

## Users
Developers and power users who pay for several model providers and want to cut cost
without losing quality.
