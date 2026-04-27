---
name: mv-implement-plan
description: Move Score implementation execution workflow. Use when asked to execute an implementation plan and prepare the work for PR creation.
---

# Move Score Implement Plan

Execute a written implementation plan with minimal drift.

## Project Adapter

- Work in `Tollii/move-score` with `main` as the PR base and `codex/` branches unless the user asks otherwise.
- Use `pnpm` for package scripts and dependency changes.
- Prefer the repo tools `move_score_validate`, `move_score_format_files`, `move_score_convex_codegen`, `move_score_git_status`, and `move_score_categorize_files` when they are available; fall back to `pnpm` scripts and direct `git` commands when they are not.
- Validate with targeted checks first, then `pnpm check`, `pnpm lint`, and `pnpm build` for publishable work.
- Run `npx convex codegen` after Convex schema/API changes when generated files need updating.
- Do not edit `src/convex/_generated/` by hand.
- Keep frontend changes aligned with existing SvelteKit/Svelte 5 patterns in `src/routes/` and `src/lib/components/`.
- Claude Code and Codex project hooks in `.claude/settings.json` and `.codex/hooks.json` will run scoped post-edit checks; do not counteract them with broad formatting unless the plan explicitly calls for it.

## Workflow

1. Read the plan and extract steps, touched paths, assumptions, validation, and caveats.
2. If the plan references a GitHub issue, read the issue body and pre-implementation issue comments before coding. Treat posted triage, research, debug, plan, critique, and assumption comments as the durable source of context.
3. Inspect the branch and worktree. Preserve unrelated user changes.
4. If the plan is materially incomplete or the issue artifacts contradict it, stop before coding and report the missing information.
5. Execute steps in order, reading relevant files before editing.
6. Keep changes scoped to the plan unless validation exposes a required fix.
7. Regenerate derived artifacts only with project commands.
8. Run final validation from the plan.
9. Commit with a concise conventional commit when requested or when preparing a PR.
10. Report commits, validation, uncommitted files, and caveats.

## Handoff

```markdown
Status: implemented | partial | blocked
Next suggested action: publish | revise-plan | research | human-input | stop
Blockers: <none or concise list>
Changes made: <files/commits summary>
Validation: <commands run and results>
Uncommitted work: <none or list>
Ready to publish: yes | no
```

## Move Score Adapter

- When implementing work for a GitHub issue, use `gh issue view <number> --comments` or equivalent GitHub tooling to read persisted pre-implementation artifacts before editing.
- If required triage/research/plan artifacts are missing from the issue, stop and ask the orchestrator for a planning or research pass instead of reconstructing the plan ad hoc.
