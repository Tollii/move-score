---
name: mv-debug
description: Move Score bug investigation and fix workflow. Use when asked to reproduce, diagnose, root-cause, or fix a bug, regression, flaky behavior, unexpected runtime error, failing test, or user-reported defect before or during implementation.
---

# Move Score Debug

Investigate a defect with evidence before changing code. The goal is to reproduce or tightly explain the bug, identify the smallest responsible cause, fix it, and add validation that prevents recurrence.

## Inputs

- Bug report, failing command, stack trace, log excerpt, ticket, flaky test, reproduction steps, or observed behavior.
- Expected behavior or source requirement, when available.
- Project validation commands and local run instructions.

## Project Adapter

- Work in `Tollii/move-score` with `main` as the PR base and `codex/` branches unless the user asks otherwise.
- Use GitHub Issues and PRs. The issue board is available but lightly used, so keep process lightweight for solo-maintainer work.
- Prefer the repo tools `move_score_validate`, `move_score_format_files`, `move_score_convex_codegen`, `move_score_git_status`, and `move_score_categorize_files` when they are available; fall back to `pnpm` scripts and direct `git` commands when they are not.
- Validate with `pnpm check`, `pnpm lint`, and `pnpm build` when risk warrants it; use targeted checks first.
- Treat Vercel and Convex preview deployments as the normal PR deployment path and mention caveats when publishing or reviewing.
- Do not edit `src/convex/_generated/` by hand; run `npx convex codegen` after Convex schema or API changes when needed.

## Workflow

1. Restate the observed behavior, expected behavior, affected area, and known constraints.
2. Gather evidence before editing:
   - Reproduction steps or failing test.
   - Relevant logs, stack traces, request IDs, screenshots, fixtures, or data shape.
   - Recent related changes, if a regression range is available.
3. Reproduce the issue locally when practical. If it cannot be reproduced, find the closest deterministic proxy and mark the uncertainty.
4. Trace the execution path:
   - Entry point.
   - Data transformation and state transitions.
   - External services, time, concurrency, caching, permissions, and environment assumptions.
   - Tests that describe intended behavior.
5. Identify the root cause. Distinguish confirmed facts from inference.
6. Make the smallest correct fix. Avoid unrelated cleanup unless it is required to make the fix safe.
7. Add or update a regression test when possible. If a test is impractical, document the manual or observable validation.
8. Run targeted validation first, then broader validation proportional to risk.
9. Report the cause, fix, validation, and remaining uncertainty.
10. If the debug pass is pre-implementation work for a GitHub issue, post the debug brief as an issue comment before handing off.

## Debug Brief

```markdown
## Debug Brief: <title>

**Observed**
<What fails and how it presents.>

**Expected**
<What should happen.>

**Reproduction**
- <Command, steps, fixture, or "not reproduced" with reason>

**Root cause**
<Specific code path, state, condition, or dependency behavior.>

**Fix**
<Smallest change made or recommended.>

**Regression coverage**
- <Test or validation that would fail before and pass after>

**Residual risk**
- <Unverified environment, flaky dependency, or edge case>
```

## Principles

- Do not patch symptoms until the likely cause is understood.
- Prefer one narrow failing test over broad speculation.
- Treat flaky behavior as a debugging problem: look for time, ordering, shared state, retries, randomness, cache, network, or cleanup.
- If production-only data or credentials are required, use `mv-ping-human` with the exact missing evidence.
- Keep the final fix local to the fault unless the bug exposes a broader broken contract.

## Handoff

End with a short machine-readable handoff for the orchestrator:

```markdown
Status: fixed | diagnosed | reproduced | partial | blocked
Next suggested action: implement | plan | review | human-input | stop
Blockers: <none or concise list>
Root cause: <confirmed cause or best evidence>
Changes made: <files/commits summary or none>
Validation: <commands run and results>
Issue comments: <GitHub issue comment URL/id, or "not applicable">
Residual risk: <none or concise list>
```

Do not invoke other workflow skills from this skill. Report what is needed next and let the orchestrator decide.

## Move Score Adapter

- Run the app with `pnpm dev`; run Convex locally with `npx convex dev` when backend functions are involved.
- Claude Code and Codex project hooks will auto-run scoped post-edit checks from `scripts/agent-hooks/`; prefer that path over repo-wide formatting churn.
- Use `pnpm check`, `pnpm lint`, and `pnpm build` as deterministic failure proxies; run the narrowest relevant command first.
- Check Vercel preview/production logs for frontend deployment issues and Convex logs for backend function issues when access is available.
- For Mapbox walking isochrone bugs, verify that `MAPBOX_ACCESS_TOKEN` is configured in the relevant Convex environment.
- For address lookup bugs, inspect `src/lib/geonorge/` and network behavior against GeoNorge before changing scoring or map UI.
- Add regression coverage where the project has an existing test pattern; otherwise document manual reproduction and validation clearly.
- When a debug brief informs implementation for a GitHub issue, persist it to the issue so later planning, implementation, and review agents can read the root-cause evidence.
