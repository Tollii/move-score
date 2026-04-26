---
name: mv-plan-implementation
description: Move Score implementation planning workflow. Use when asked to create an implementation plan from a user story, issue, triage brief, or feature request. Identify touched repos, architecture, dependencies, edge cases, reliability risks, validation, and enough detail for a smaller agent to implement.
---

# Move Score Plan Implementation

Create an implementation plan that another agent or engineer can execute without rediscovering the architecture.

## Project Adapter

- Work in `Tollii/move-score` with `main` as the PR base and `codex/` branches unless the user asks otherwise.
- Use GitHub Issues and PRs. The issue board is available but lightly used, so keep process lightweight for solo-maintainer work.
- Validate with `pnpm check`, `pnpm lint`, and `pnpm build` when risk warrants it; use targeted checks first.
- Treat Vercel and Convex preview deployments as the normal PR deployment path and mention caveats when publishing or reviewing.
- Do not edit `src/convex/_generated/` by hand; run `npx convex codegen` after Convex schema or API changes when needed.

## Workflow

1. Read the source requirement and any triage brief.
2. Research the relevant codebase areas before planning. If more research is needed than this planning pass can responsibly do, return that need in the handoff.
3. Identify all repositories, packages, services, data stores, generated artifacts, infrastructure, docs, and tests likely touched.
4. Define the architecture of the change:
   - Entry points and user flows.
   - Data model and state transitions.
   - API contracts and compatibility.
   - Error handling and recovery.
   - Permission and security boundaries.
   - Dependencies and integration points.
5. Handle edge cases and weird input explicitly.
6. Break the work into ordered, atomic steps with verification for each step.
7. Include final validation and rollback or migration notes when relevant.
8. If the plan still has holes, mark them as blockers or risks in the handoff instead of invoking another workflow.

## Plan Format

```markdown
## Implementation Plan: <title>

**Source**: <issue/story/reference>
**Repos touched**:
- `<repo>` - <area and reason>

**Architecture**
<Concise description of the intended design and flow.>

**Dependencies**
- <Library/service/schema/tool dependency and reason>

**Edge cases and reliability**
- <Input, state, failure, migration, retry, authorization, performance, compatibility concerns>

### Step 1: <short label>
**Files/areas**: `<path>`, `<system>`
**Change**: <specific edit>
**Reason**: <why this step exists>
**Validation**: <command, test, manual check, or observable result>

### Step 2: <short label>
...

### Final validation
- <Full test/build/typecheck/lint/integration/manual validation>

### Caveats
- <Known risk, assumption, or follow-up>
```

## Quality Bar

- The plan must be specific enough for a smaller/faster model to execute.
- Do not write vague steps like "update backend" or "add tests".
- Prefer existing project patterns over new abstractions.
- Design for change: localize responsibilities, avoid hidden coupling, and make invalid states hard to represent where the language supports it.
- Include tests at the right level for the risk.

## Handoff

End with a short machine-readable handoff for the orchestrator:

```markdown
Status: ready | needs-research | needs-human-input | blocked
Next suggested action: critique | research | human-input | stop
Blockers: <none or concise list>
Research needed: <none or specific questions/areas>
Artifacts: <plan location or inline title>
Risk notes: <important caveats>
```

Do not invoke other workflow skills from this skill. Report what is needed next and let the orchestrator decide.

## Move Score Adapter

- Fetch requirements from chat, GitHub Issues, linked PRs, or local notes in this repo.
- There is one primary repo: `Tollii/move-score`.
- Keep plans in chat by default; post to a GitHub issue only when the user asks or the issue is the source of truth.
- Plans must name touched paths under `src/routes/`, `src/lib/`, `src/convex/`, config files, or `.agents/skills/` as appropriate.
- Include `pnpm check`, `pnpm lint`, `pnpm build`, and `npx convex codegen` when relevant.
- Include Vercel and Convex preview expectations for PR-visible behavior.
