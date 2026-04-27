---
name: mv-codebase-research
description: Move Score codebase research workflow. Use when asked to understand a specific part of the codebase, answer architecture questions, or investigate a concrete flow with enough depth to support implementation.
---

# Move Score Codebase Research

Answer a specific engineering question with the least reading needed to be confident.

## Project Adapter

- Work in `Tollii/move-score` with `main` as the PR base unless the user asks otherwise.
- Prefer `move_score_git_status` and `move_score_categorize_files` for quick repo summaries when they are available.
- Treat `src/convex/_generated/` as generated contract evidence, not editable source.
- Consider both the Svelte frontend and Convex backend when tracing deployed behavior.

## Workflow

1. Restate the question and the scope briefly.
2. Search broad enough to find the real entry points, then read only the files that define the behavior.
3. Trace actual code paths:
   - Entry points and callers.
   - State or data flow.
   - Side effects, config, external services, and tests when relevant.
4. Mark direct evidence vs inference clearly.
5. Split work across sub-agents only when the question is broad enough that parallel slices are clearly faster.
6. Return a concise research brief inline by default.
7. If the work is tied to a GitHub issue and the research materially changes the implementation approach, leave a short issue note with the conclusion and why it matters. Do not dump a full artifact unless asked.

## Research Brief

```markdown
## Codebase Research: <goal>

**Summary**
<High-level answer.>

**Key evidence**
- `<path>` - <what it proves>

**How it works**
1. <Concrete step in the flow>
2. <Concrete step in the flow>

**Important contracts**
- <API, type, event, config, or invariant>

**Gotchas**
- <Non-obvious behavior or risk>

**Open questions**
- <What could not be verified>
```

## Handoff

```markdown
Status: complete | partial | blocked
Next suggested action: implement | more-research | human-input | stop
Blockers: <none or concise list>
Research gaps: <none or specific unanswered questions>
Confidence: high | medium | low
Durable note: inline | GitHub comment | not needed
```
