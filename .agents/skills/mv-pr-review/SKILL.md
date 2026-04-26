---
name: mv-pr-review
description: Move Score general-purpose pull request or change review workflow. Use when asked to review a GitHub PR, diff, branch, patch, or pending code changes for correctness, requirement fit, architecture fit, maintainability, tests, conciseness, modern language features, and common regressions. For security-specific PR review, use mv-security-pr-review instead.
---

# Move Score PR Review

Review a proposed GitHub PR or local diff and post only actionable inline findings. This is the general-purpose review lane; use a separate security-focused review when the request is specifically about vulnerabilities or threat modeling.

## Inputs

- Change identifier: GitHub PR number, branch, commit range, patch, or local diff.
- Target branch or baseline, if not obvious.
- GitHub app or `gh` CLI access for PR metadata, diffs, and inline review threads.

## Project Adapter

- Work in `Tollii/move-score` with `main` as the PR base and `codex/` branches unless the user asks otherwise.
- Use GitHub Issues and PRs. The issue board is available but lightly used, so keep process lightweight for solo-maintainer work.
- Validate with `pnpm check`, `pnpm lint`, and `pnpm build` when risk warrants it; use targeted checks first.
- Treat Vercel and Convex preview deployments as the normal PR deployment path and mention caveats when publishing or reviewing.
- Do not edit `src/convex/_generated/` by hand; run `npx convex codegen` after Convex schema or API changes when needed.

## Workflow

1. Fetch the change metadata and diff, including file paths, changed line numbers, and surrounding context.
2. Read the source requirement, issue, story, design note, or PR description when available. A review should check whether the change solves the intended problem, not only whether the patch compiles.
3. Read the relevant source files around every suspicious change. Do not review from a diff alone when behavior depends on nearby code.
4. Prioritize findings in this order:
   - Requirement fit: the change does not satisfy the issue, acceptance criteria, backwards compatibility expectation, or user workflow.
   - Correctness: logic errors, broken edge cases, race conditions, data loss, migration hazards, incorrect error handling, flaky tests, or behavior regressions.
   - Architecture fit: misplaced responsibilities, hidden coupling, broken layering, dependency cycles, public contract drift, generated-file misuse, primitive obsession, anemic domain modeling, or inconsistency with established local patterns.
   - Test quality: missing regression coverage, tests that assert implementation details, flaky timing, weak fixtures, or failure to exercise important edge cases.
   - Maintainability and conciseness: avoidable complexity, duplicated logic, unnecessary state, overbroad abstractions, hard-to-change control flow, or verbose code where a simpler local pattern exists.
   - Modern language features: safer and clearer language/library features already accepted by the project, such as explicit result types, discriminated unions, pattern matching, optional chaining, nullish coalescing, readonly types, `satisfies`, standard collection helpers, or structured error handling.
5. If a security issue is obvious while doing a general review, report it, but do not turn the review into a full security audit unless asked.
6. Only produce findings that should block merge or materially improve maintainability. Do not nitpick formatting or personal style.
7. Post each finding as its own inline review thread on the exact changed line or tightest possible line range.
8. Do not post a top-level summary comment. Do not approve, request changes, or merge unless the user explicitly asks.

## Finding Format

Each inline thread should be concise:

```markdown
<What is wrong and why it matters.>

<Concrete fix or direction.>
```

Include a snippet only when it clarifies the fix. Keep the comment scoped to the highlighted line.

## No Findings

If there are no actionable findings, do not post anything unless the platform requires a review submission. Report to the user that no inline findings were posted and mention any test gaps or residual risk.

## Handoff

End with a short machine-readable handoff for the orchestrator:

```markdown
Status: findings-posted | clean | blocked
Next suggested action: address-comments | publish-ready | human-input | stop
Blockers: <none or concise list>
Findings posted: <count and ids/links if available>
Residual risk: <test gaps or unreviewed areas>
```

Do not invoke other workflow skills from this skill. Report what is needed next and let the orchestrator decide.

## Move Score Adapter

- Fetch PR metadata, changed files, diffs, review comments, and linked issues from GitHub `Tollii/move-score`.
- Use one inline review thread per actionable finding on the tightest changed line range.
- Review against SvelteKit/Svelte 5 behavior, Convex server-side contracts, generated Convex API boundaries, and Vercel preview behavior.
- Treat `pnpm check`, `pnpm lint`, and `pnpm build` as the main local quality gates.
- When the diff touches `src/convex/`, check whether `npx convex codegen` and generated API updates are needed.
- Do not review the issue board process unless the PR explicitly changes GitHub workflow.
