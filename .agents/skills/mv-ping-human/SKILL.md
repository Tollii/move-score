---
name: mv-ping-human
description: Move Score human-escalation stub. Use when an autonomous workflow has a blocker that cannot be responsibly resolved from code, project context, or common-sense assumptions.
---

# Move Score Ping Human

Use this only when continuing autonomously would be irresponsible.

## Project Adapter

- Ask the user in chat by default.
- Use a GitHub issue or PR comment only when the blocker belongs to an existing GitHub thread.
- Escalate for product decisions, destructive Convex data changes, production deployment actions, missing service access, or secrets such as Mapbox/Vercel/Convex credentials.

## Workflow

1. Write a concise escalation message with the decision or information needed.
2. Explain why the agent cannot infer it safely.
3. Provide the recommended default if one exists.
4. State the impact of likely answers.
5. Do not continue past the blocker unless a safe reversible default exists and is explicitly recorded.

## Message Format

```markdown
Human input needed: <short title>

<One paragraph explaining the blocker.>

Recommended default: <default or "none">
Impact: <what changes depending on the answer>
```
