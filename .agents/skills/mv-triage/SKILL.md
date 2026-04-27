---
name: mv-triage
description: Move Score issue or user-story triage workflow. Use when a requirement may be vague, incomplete, risky, or not ready for implementation. Find edge cases, hidden assumptions, missing requirements, and ambiguity. Ask questions only when ambiguity blocks responsible progress; otherwise state reasonable assumptions clearly.
---

# Move Score Triage

Turn a vague issue, user story, bug report, or product request into an implementation-ready brief.

## Project Adapter

- Work in `Tollii/move-score` with `main` as the PR base and `codex/` branches unless the user asks otherwise.
- Use GitHub Issues and PRs. The issue board is available but lightly used, so keep process lightweight for solo-maintainer work.
- Validate with `pnpm check`, `pnpm lint`, and `pnpm build` when risk warrants it; use targeted checks first.
- Treat Vercel and Convex preview deployments as the normal PR deployment path and mention caveats when publishing or reviewing.
- Do not edit `src/convex/_generated/` by hand; run `npx convex codegen` after Convex schema or API changes when needed.

## Workflow

1. Fetch or read the source requirement from GitHub Issues, PR context, chat, or a local file.
2. Identify the problem being solved, affected users, expected outcome, constraints, and non-goals.
3. Search the codebase or product context enough to avoid obvious false assumptions.
4. Look for ambiguity:
   - Missing or untestable acceptance criteria.
   - Undefined roles, permissions, states, or terms.
   - Implicit business rules.
   - Edge cases around empty input, invalid input, concurrency, idempotency, time zones, retries, partial failure, authorization, compatibility, migration, and rollback.
   - Multiple requirements mixed into one story.
5. If ambiguity blocks a responsible plan, stop and return `blocked: human-input-needed` with concise questions.
6. If ambiguities are minor, choose conservative common-sense assumptions and list them explicitly.
7. Produce a triage brief.
8. If the source of truth is a GitHub issue, post the triage brief as an issue comment before handing off. If there is no GitHub issue, include the brief inline in the handoff.

## Triage Brief

```markdown
## Triage Brief: <title>

**Source**: <issue/story/reference>
**Scope**: Small | Medium | Large
**Risk**: Low | Medium | High

**Problem**
<What is wrong or missing, and why it matters.>

**User / role**
<Who is affected.>

**Desired outcome**
<What should be true after the work is complete.>

**Acceptance criteria**
- [ ] <Specific, testable condition>

**Assumptions**
- <Explicit assumption made by the agent>

**Open questions**
- <Only questions that block implementation>

**Non-goals**
- <What is intentionally out of scope>

**Edge cases and reliability**
- <Boundary conditions, weird input, failure modes, rollback, compatibility>

**Impacted areas**
- `<path-or-system>` - <why it is likely touched>
```

## Principles

- Ask fewer, sharper questions.
- Do not ask the human to decide implementation trivia the codebase can answer.
- Do not pretend vague requirements are precise; mark assumptions and risk.

## Handoff

End with a short machine-readable handoff for the orchestrator:

```markdown
Status: ready | blocked
Next suggested action: plan | human-input | stop
Blockers: <none or concise list>
Artifacts: <triage brief location or inline title>
Issue comments: <GitHub issue comment URL/id, or "not applicable">
Assumptions: <key assumptions>
```

Do not invoke other workflow skills from this skill. Report what is needed next and let the orchestrator decide.

## Move Score Adapter

- Fetch and update issues in `Tollii/move-score` with the GitHub app or `gh issue`.
- Keep GitHub board/status updates lightweight because this is a solo-maintained app and the board is not heavily used.
- When triage is for a GitHub issue, always post the triage brief as an issue comment so implementation agents and humans can read the durable context later.
- Use labels and milestones only if they already exist and clearly apply; do not invent process.
- Use domain terms from the app and README: address lookup, `Eiendom`, `Nabolag`, `Kollektivt`, `gangavstand`, Mapbox isochrones, GeoNorge, Vercel, and Convex.
