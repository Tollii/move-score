---
name: mv-ping-human
description: Move Score human-escalation stub. Use when an autonomous workflow hits a blocker that cannot be resolved responsibly from code, project context, or common-sense assumptions.
---

# Move Score Ping Human

Use this only when continuing autonomously would be irresponsible.

## Project Adapter

- Ask in chat by default.
- Use a GitHub issue or PR comment only when the user wants the decision recorded there or the conversation genuinely belongs in that thread.
- Escalate for product decisions, destructive Convex data changes, production deployment actions, missing service access, or secrets such as Mapbox, Vercel, or Convex credentials.

## Workflow

1. Ask for the exact decision or missing information.
2. Explain briefly why it cannot be inferred safely.
3. Provide the recommended default if one exists.
4. State the impact of the likely answers.
5. Do not continue past the blocker unless a safe reversible default exists and is explicitly accepted.

## Message Format

```markdown
Human input needed: <short title>

<One short paragraph explaining the blocker.>

Recommended default: <default or "none">
Impact: <what changes depending on the answer>
```
