---
name: mv-plan-critique
description: Move Score plan critique workflow. Use when asked to review, harden, or improve an implementation plan before execution.
---

# Move Score Plan Critique

Review an implementation plan before execution. Catch holes while they are cheap to fix.

## Project Adapter

- Critique plans against SvelteKit/Svelte 5 frontend constraints, Convex server-side/data contracts, and Vercel/Convex preview behavior.
- Keep process lightweight; when a GitHub issue is the source of truth, always persist critiques to that issue before implementation starts.
- Require explicit handling of `MAPBOX_ACCESS_TOKEN` and Convex environment differences when a plan touches walking isochrones or deployed backend behavior.
- Expected validation usually includes `pnpm check`, `pnpm lint`, `pnpm build`, and `npx convex codegen` when Convex APIs change.

## Workflow

1. Read the requirement, triage brief, and implementation plan.
2. Research enough code to verify file targets and architecture.
3. Check requirement coverage, architecture, edge cases, reliability, scope control, and validation.
4. Classify issues as blocker, major, or minor.
5. Suggest concrete plan revisions, not just criticism.
6. If the plan is for a GitHub issue, post the critique as an issue comment before handing off.
7. If asked to iterate, produce an updated plan and post the revised plan to the issue before handing off.

## Output

```markdown
## Plan Critique: <title>

### Blockers
- <Issue> -> <Concrete fix>

### Major gaps
- <Issue> -> <Concrete fix>

### Minor improvements
- <Issue> -> <Concrete fix>

### Suggested plan changes
- <Concrete revision>
```

## Handoff

```markdown
Status: approved | revisions-needed | blocked
Next suggested action: implement | revise-plan | research | human-input | stop
Blockers: <none or concise list>
Major gaps: <none or concise list>
Issue comments: <GitHub issue comment URL/id, or "not applicable">
Residual risk: <none or concise list>
```
