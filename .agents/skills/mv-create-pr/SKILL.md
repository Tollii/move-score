---
name: mv-create-pr
description: Move Score delegated workflow for publishing local changes and opening a GitHub pull request. Use when asked to create a PR or when mv-ship reaches the publication stage. The PR description must explain what changed, why it was needed functionally, how it was achieved, validation criteria, observations, deployment previews, and caveats.
---

# Move Score Create PR

Publish a branch and open a GitHub pull request with enough context for review, Vercel preview deployment, and Convex preview deployment. When delegated by `mv-ship`, do the publication work directly and return the PR URL; do not ask the user or orchestrator whether to publish unless a real blocker exists.

## Project Adapter

- Work in `Tollii/move-score` with `main` as the PR base and `codex/` branches unless the user asks otherwise.
- Use GitHub Issues and PRs. The issue board is available but lightly used, so keep process lightweight for solo-maintainer work.
- Prefer the repo tools `move_score_validate`, `move_score_git_status`, and `move_score_categorize_files` when they are available; fall back to `pnpm` scripts and direct `git` commands when they are not.
- Validate with `pnpm check`, `pnpm lint`, and `pnpm build` when risk warrants it; use targeted checks first.
- Treat Vercel and Convex preview deployments as the normal PR deployment path and mention caveats when publishing or reviewing.
- Do not edit `src/convex/_generated/` by hand; run `npx convex codegen` after Convex schema or API changes when needed.

## Workflow

1. Inspect repository state:
   - Current branch and base branch.
   - Uncommitted changes.
   - Commits ahead of the base branch.
   - Diff stat and changed files.
2. If there are uncommitted changes that are part of the work, commit them intentionally before opening the PR. Do not include unrelated user changes.
3. Run or summarize validation expected for this project. If validation is not run, state why in the PR body.
4. Push the branch to `origin`.
5. Open the GitHub PR with a structured body.
6. Return the PR URL, branch, validation, and preview expectations to the orchestrator.

## Delegated Mode

When called by `mv-ship`:

- Treat publication as already authorized unless the orchestrator explicitly says local-only or no-PR.
- Do not stop after summarizing uncommitted changes. Commit intended changes, push, and open the PR.
- Do not include unrelated user changes. If unrelated changes prevent a clean commit, report the blocker with exact file paths.
- Prefer a draft PR only when the orchestrator or user requested draft status, validation is incomplete in a way reviewers must know up front, or the change is intentionally not ready for merge.

## PR Body

Use this structure and omit empty sections:

```markdown
## Summary

- <User-facing or functional change>
- <Important internal change>

## Why

<The functional problem, requirement, or user story this solves.>

## How

<Implementation approach, architecture decisions, dependency changes, migrations, or generated artifacts.>

## Validation

- [ ] <Command or manual check>
- [ ] <Relevant edge case>

## Observations

<Notable behavior, tradeoffs, performance notes, or follow-up context.>

## Caveats

<Known limitations, risks, rollout concerns, or unverified areas.>

Closes <issue/story reference>
```

## Title

Use the repository's convention. If none exists, prefer a conventional title such as `feat: <capability>` or `fix: <bug>`.

## Handoff

End with a short machine-readable handoff for the orchestrator:

```markdown
Status: published | blocked
Next suggested action: monitor-ci | address-comments | human-input | stop
Blockers: <none or concise list>
Pull request: <URL or identifier>
Branch: <branch name>
Validation: <commands run and results>
Caveats: <none or concise list>
```

Do not invoke other workflow skills from this skill. Complete publication, then report what is needed next and let the orchestrator decide whether to monitor CI, address comments, or stop.

## Move Score Adapter

- Base branch is `main`; use `codex/<short-slug>` branches unless the user asks otherwise.
- Claude Code and Codex project hooks already handle scoped post-edit formatting/linting via `scripts/agent-hooks/`; describe validation separately from those automatic edits.
- Push with `git push -u origin <branch>`.
- Open PRs in `Tollii/move-score` with the GitHub app or `gh pr create`.
- Link GitHub issues with `Closes #<issue>` for complete fixes and `Refs #<issue>` for related work.
- Mention validation results and whether Vercel and Convex preview deployments are expected to exercise the change.
