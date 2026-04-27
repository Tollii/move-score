---
name: mv-debug
description: Move Score bug investigation and fix workflow. Use when asked to reproduce, diagnose, root-cause, or fix a bug, regression, flaky behavior, runtime error, or failing test.
---

# Move Score Debug

Investigate a defect with evidence before changing code. The goal is to find the smallest responsible cause, fix it, and leave behind validation that makes the result trustworthy.

## Project Adapter

- Work in `Tollii/move-score` with `main` as the PR base unless the user asks otherwise.
- Prefer the repo tools `move_score_validate`, `move_score_format_files`, `move_score_convex_codegen`, `move_score_git_status`, and `move_score_categorize_files` when they are available.
- Use targeted checks first, then broader validation proportional to risk.
- Do not edit `src/convex/_generated/` by hand; run `npx convex codegen` after Convex schema or API changes when needed.

## Workflow

1. Restate the observed behavior, expected behavior, and affected area.
2. Gather evidence before editing:
   - Reproduction steps or failing command.
   - Logs, stack traces, or relevant data shape.
   - Recent related changes when available.
3. Reproduce when practical. If exact reproduction fails, find the closest reliable proxy and note the uncertainty.
4. Trace the code path and identify the likely root cause. Separate confirmed facts from inference.
5. Make the smallest correct fix.
6. Add or update regression coverage when the project has a sensible place for it; otherwise document observable validation.
7. Return a concise debug brief inline by default.
8. If the work is tied to a GitHub issue and the diagnosis explains a pivot, blocker, or non-obvious fix, leave a short issue note with the root cause and why the chosen fix is appropriate.

## Debug Brief

```markdown
## Debug Brief: <title>

**Observed**
<What fails and how it presents.>

**Expected**
<What should happen.>

**Root cause**
<Confirmed cause or best evidence.>

**Fix**
<Smallest change made or recommended.>

**Validation**
- <Test, command, or observable result>

**Residual risk**
- <Unverified environment or edge case>
```

## Handoff

```markdown
Status: fixed | diagnosed | partial | blocked
Next suggested action: implement | review | human-input | stop
Blockers: <none or concise list>
Root cause: <confirmed cause or best evidence>
Changes made: <files/commits summary or none>
Validation: <commands run and results>
Durable note: inline | GitHub comment | not needed
Residual risk: <none or concise list>
```
