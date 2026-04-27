---
name: mv-ship
description: Move Score end-to-end delivery workflow. Use when asked to take an issue or idea from requirement to merge-ready PR with minimal ceremony. Default to one coherent delivery pass and delegate only when a specialist skill clearly earns its cost.
---

# Move Score Ship

Own the full delivery path. For this repo, prefer fewer steps, fewer agents, and fewer artifacts. The default should be one coherent pass that gets from requirement to working change, not an assembly line of intake, research, triage, plan, critique, implementation, and publication agents.

## Operating Model

- `mv-ship` owns requirement fit, implementation strategy, validation, PR readiness, and final judgment.
- Default to direct delivery or one main worker for small and medium issues.
- Use specialist skills only when they clearly improve the outcome:
  - `mv-debug` for unclear failures, regressions, or flaky behavior.
  - `mv-codebase-research` for broad or cross-cutting investigation.
  - `mv-create-pr` when the main task is publishing an already-finished branch.
  - `mv-pr-review` for an independent correctness review when the change is ready.
  - `mv-security-pr-review` only for security-sensitive changes or explicit security review.
  - `mv-address-review-comments` only after actionable review feedback exists.
  - `mv-ping-human` only for blocking decisions or missing access.
- For issue-backed work, prefer short milestone comments over long-form artifacts. A good issue note says what changed, why that choice was made, and what happens next.

## Project Adapter

- Work in `Tollii/move-score` with `main` as the PR base.
- Prefer the repo tools `move_score_validate`, `move_score_format_files`, `move_score_convex_codegen`, `move_score_git_status`, and `move_score_categorize_files` when they are available; fall back to `pnpm` scripts and direct `git` commands when they are not.
- Validate with targeted checks first, then broader validation proportional to risk.
- Treat Vercel and Convex preview deployments as the normal PR deployment path when a PR is published.
- Do not edit `src/convex/_generated/` by hand; run `npx convex codegen` after Convex schema or API changes when needed.

## Lean Workflow

1. Intake
   - Read the source requirement from chat, GitHub, or local context.
   - Identify the goal, obvious constraints, and explicit non-goals.
   - Resolve minor ambiguity with explicit assumptions and keep moving.
   - Use `mv-ping-human` only when ambiguity blocks a responsible implementation.

2. Delivery
   - Inspect only the code paths needed to implement the requirement safely.
   - If the issue is small or architecture is already clear, implement directly.
   - If the work is broad or uncertain, make a short internal plan and then execute it. Do not spawn separate plan and critique stages by default.
   - Update docs only when the change affects setup, behavior, API contracts, or user-visible workflow.
   - When working from a GitHub issue, leave brief issue updates at meaningful milestones, such as chosen approach, major pivot, blocker, or PR-ready completion.

3. Validate
   - Run the narrowest meaningful checks first.
   - Escalate to broader validation only when the blast radius justifies it.
   - If validation reveals a distinct bug or unclear failure, switch to `mv-debug`.

4. Publish or hand off
   - Get the change to merge-ready state.
   - If the user wants a PR, create it directly or hand off to `mv-create-pr`.
   - If the user does not want publication yet, report the branch/worktree state clearly.

5. Review loop
   - Use `mv-pr-review` only when an independent review is useful or requested.
   - Use `mv-security-pr-review` only when the touched surface is security-sensitive or the user asks.
   - Use `mv-address-review-comments` only after actionable comments exist.
   - Repeat only while material findings remain.

## Decision Rules

- Skip separate research when the required context fits in one pass.
- Skip separate planning when the task is clear and bounded.
- Skip plan critique unless the change is risky, unusually broad, or will be handed to another worker.
- Skip long-form issue artifacts. Prefer one or two concise issue updates that preserve the reasoning behind non-obvious choices.
- Do not require fresh agents for every stage. Independence matters for review, not for every small delivery step.

## Issue Update Format

When leaving a GitHub issue comment, keep it short:

```markdown
Update: <short title>

- Doing: <current step or completed change>
- Why: <important reasoning or decision>
- Next: <next step or "done">
```

## Handoff

End with a short machine-readable handoff:

```markdown
Status: implemented | published | partial | blocked
Next suggested action: review | publish | address-comments | human-input | stop
Blockers: <none or concise list>
Changes made: <files/commits/PR summary>
Validation: <commands run and results>
Caveats: <none or concise list>
```

## Completion Criteria

The job is complete when:

- The requirement is implemented or a clear blocker is documented.
- Relevant validation has run, or the reason it could not run is recorded.
- The branch is merge-ready or a concrete publish blocker is called out.
- Any requested or clearly warranted review pass is complete.
- No actionable feedback owned by the workflow remains unresolved.
