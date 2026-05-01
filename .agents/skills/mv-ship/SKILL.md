---
name: mv-ship
description: Move Score autonomous end-to-end delivery orchestration. Use when asked to take an issue or idea from requirement to reviewed, published PR. The main agent coordinates sub-agents for implementation, validation, review, feedback fixes, and PR publication instead of stopping after implementation.
---

# Move Score Ship

Own the full delivery path. For this repo, the top-level agent is an orchestrator: it clarifies the goal, delegates each delivery stage to sub-agents, integrates their handoffs, and keeps the workflow moving until there is a reviewed PR or a real blocker. Do not stop after implementation to ask what to do next; the default next steps are review changes, address material findings, and publish a PR.

## Operating Model

- `mv-ship` owns requirement fit, implementation strategy, delegation, validation confidence, PR readiness, publication, and final judgment.
- Run the delivery through sub-agents by default. The main agent should avoid doing substantial implementation, review, or publication work itself unless a tool limitation blocks delegation.
- Choose the specialist skills that fit the task. Autonomy means continuing through the needed stages without waiting for the user, not running every available workflow every time.
- Delegate concrete, bounded stages with explicit ownership:
  - Research worker: use `mv-codebase-research` when the implementation path is not obvious or spans multiple systems.
  - Implementation worker: make the code change, run focused checks, and report changed files, validation, and unresolved concerns.
  - Debug worker: use `mv-debug` for unclear failures, regressions, flaky behavior, or validation failures that need diagnosis.
  - Review worker: use `mv-pr-review` after implementation, before publication, for an independent correctness and requirement-fit review of the local diff or branch.
  - Security review worker: use `mv-security-pr-review` when the touched surface is security-sensitive or the user asks.
  - Feedback worker: use `mv-address-review-comments` after actionable review feedback exists.
  - Publisher worker: use `mv-create-pr` after review is clean or after material findings have been addressed.
  - Human escalation worker: use `mv-ping-human` only for blocking decisions, missing access, or requirements that cannot be responsibly assumed.
- Sub-agents may use their specialist skills, but the ship orchestrator decides the next stage from their handoffs and continues automatically.
- For issue-backed work, prefer short milestone comments over long-form artifacts. A good issue note says what changed, why that choice was made, and what happens next.

## Project Adapter

- Work in `Tollii/move-score` with `main` as the PR base.
- Prefer the repo tools `move_score_validate`, `move_score_format_files`, `move_score_convex_codegen`, `move_score_git_status`, and `move_score_categorize_files` when they are available; fall back to `pnpm` scripts and direct `git` commands when they are not.
- Validate with targeted checks first, then broader validation proportional to risk.
- Treat Vercel and Convex preview deployments as the normal PR deployment path when a PR is published.
- Do not edit `src/convex/_generated/` by hand; run `npx convex codegen` after Convex schema or API changes when needed.

## Autonomous Workflow

1. Intake
   - Read the source requirement from chat, GitHub, or local context.
   - Identify the goal, obvious constraints, and explicit non-goals.
   - Resolve minor ambiguity with explicit assumptions and keep moving.
   - Use `mv-ping-human` only when ambiguity blocks a responsible implementation.
   - Create a concise delegation plan with only the stages that are useful for this task. Include stage owners, expected outputs, and file/module ownership. Keep it short and internal unless the user asked for a plan.

2. Delegate implementation
   - Spawn a worker sub-agent for implementation with the requirement, relevant issue links, branch/base expectations, known constraints, and explicit file/module ownership.
   - Tell the worker they are not alone in the codebase, must not revert unrelated edits, and should adapt to concurrent changes.
   - If the work can be safely split, spawn multiple workers with disjoint write sets. If it cannot be split, use one implementation worker.
   - Ask implementation workers to edit files directly, run focused validation, and finish with a machine-readable handoff.
   - Update docs only when the change affects setup, behavior, API contracts, or user-visible workflow.
   - When working from a GitHub issue, leave brief issue updates at meaningful milestones, such as chosen approach, major pivot, blocker, or PR-ready completion.

3. Delegate validation and debugging
   - Ensure each implementation worker runs the narrowest meaningful checks for its slice.
   - The orchestrator may run lightweight status commands to integrate results, but substantial validation should be delegated when possible.
   - Escalate to broader validation only when the blast radius justifies it.
   - Delegate diagnosis and repair to `mv-debug` only when the work is itself a bug investigation, validation fails in an unclear way, or behavior differs from expectations. For straightforward feature work with clear validation, skip the debug lane.

4. Delegate review
   - After implementation and focused validation, delegate an independent review with `mv-pr-review`.
   - Review the local diff or branch before PR publication unless the request explicitly forbids review.
   - Delegate `mv-security-pr-review` only when the touched surface is security-sensitive, the requirement involves auth, permissions, secrets, payments, data exposure, dependency risk, or the user asks for security review.
   - If review finds material issues, delegate fixes to a feedback or implementation worker, then repeat review until there are no material findings or a blocker is documented.

5. Delegate publication
   - After review is clean, delegate publication to `mv-create-pr`.
   - Creating the PR is the default continuation for ship work. Do not ask the user whether to publish unless they explicitly requested local-only work, draft-only work, or no PR.
   - The publisher worker should commit intended changes, push the branch, open the PR, and report the PR URL, validation, preview expectations, and caveats.
   - If publication fails due to access, CI, branch protection, or missing credentials, document the blocker and the exact next action.

6. Close the loop
   - If PR review comments or immediate CI/deployment feedback appear while the workflow is active, delegate fixes and push follow-up commits.
   - Repeat only while material findings remain and the workflow can make progress without human input.

## Decision Rules

- Keep delegation lightweight when the task is small: one implementation worker, one review worker, and one publisher worker is enough.
- Skip separate research when the implementation worker can safely discover the needed context in its slice.
- Skip separate planning artifacts when the task is clear and bounded, but still give each sub-agent a clear task and expected handoff.
- Skip specialist lanes that do not match the task. Debug, security review, broad research, feedback addressing, and CI monitoring are conditional tools, not mandatory gates.
- Skip plan critique unless the change is risky, unusually broad, or multiple workers need coordination.
- Skip long-form issue artifacts. Prefer one or two concise issue updates that preserve the reasoning behind non-obvious choices.
- Do not collapse implementation, review, and publication into one agent. Independence matters for review, and PR publication should be a deliberate delegated stage.
- Ask the user for next steps only when blocked by a decision, missing access, conflicting requirements, or an explicit local-only instruction.

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
Status: published | partial | blocked
Next suggested action: address-comments | monitor-ci | human-input | stop
Blockers: <none or concise list>
Pull request: <URL or none>
Changes made: <files/commits/PR summary>
Validation: <commands run and results>
Review: <clean, findings addressed, skipped with reason, or blocked>
Caveats: <none or concise list>
```

## Completion Criteria

The job is complete when:

- The requirement is implemented or a clear blocker is documented.
- Relevant validation has run, or the reason it could not run is recorded.
- An independent review pass is complete, or a concrete review blocker is called out.
- Material review findings have been addressed, or a blocker is documented.
- A PR is published with context for review and preview deployments, unless the user explicitly requested no PR or publication is blocked.
- No actionable feedback owned by the workflow remains unresolved.
