---
name: mv-address-review-comments
description: Move Score delegated workflow for addressing GitHub PR review comments. Use when asked to fix, address, or resolve review feedback, or when mv-ship needs actionable review findings fixed before continuing review or publication.
---

# Move Score Address Review Comments

Address actionable GitHub PR review feedback for `Tollii/move-score`. When delegated by `mv-ship`, fix the comments, push the branch, resolve or reply to threads when possible, and hand control back for another review or publication pass.

## Project Adapter

- Work in `Tollii/move-score` with `main` as the PR base and `codex/` branches unless the user asks otherwise.
- Use GitHub PR review threads and top-level comments; the GitHub issue board is lightweight and usually not part of this workflow.
- Validate with targeted checks first, then `pnpm check`, `pnpm lint`, and `pnpm build` when risk warrants it.
- Treat Vercel and Convex preview deployments as normal PR feedback signals.
- Do not edit `src/convex/_generated/` by hand; run `npx convex codegen` after Convex schema or API changes when needed.

## Workflow

1. Fetch PR metadata, comments, reviews, and unresolved review threads.
2. Filter to actionable unresolved feedback. Ignore praise, summaries, stale bot comments, and already-resolved threads.
3. Check out the PR branch and inspect the worktree before editing.
4. For each actionable thread, read the exact file and surrounding code, then make the smallest correct fix.
5. Run the narrowest meaningful validation for each fix, then broader validation if the edits are risky.
6. Commit fixes separately when practical, or group comments that require one cohesive change.
7. Push the branch.
8. Reply to each fixed thread with a short summary and validation result, then resolve the thread.
9. Return unresolved threads, validation, and whether the PR is ready for another review pass.

## Reply Format

```markdown
Fixed by <brief summary>. Validated with `<command>`.
```

If validation could not be run, say why in one clause.

## Handoff

```markdown
Status: addressed | partial | blocked
Next suggested action: review | publish | human-input | stop
Blockers: <none or concise list>
Threads addressed: <ids or concise list>
Threads unresolved: <none or concise list with reason>
Validation: <commands run and results>
```
