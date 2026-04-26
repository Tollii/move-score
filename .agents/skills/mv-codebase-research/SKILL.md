---
name: mv-codebase-research
description: Move Score codebase research workflow. Use when asked to understand how part of a codebase works, answer architecture questions, support planning, or investigate a specific subsystem, flow, integration, or behavior with concrete goals in mind.
---

# Move Score Codebase Research

Research a codebase to answer a specific engineering question. The output should help another agent or engineer make decisions, plan work, or understand behavior.

## Project Adapter

- Work in `Tollii/move-score` with `main` as the PR base and `codex/` branches unless the user asks otherwise.
- Use GitHub Issues and PRs. The issue board is available but lightly used, so keep process lightweight for solo-maintainer work.
- Prefer `move_score_git_status` and `move_score_categorize_files` when they are available for quick repo summaries; fall back to `git` and code search when they are not.
- Validate with `pnpm check`, `pnpm lint`, and `pnpm build` when risk warrants it; use targeted checks first.
- Treat Vercel and Convex preview deployments as the normal PR deployment path and mention caveats when publishing or reviewing.
- Do not edit `src/convex/_generated/` by hand; run `npx convex codegen` after Convex schema or API changes when needed.

## Workflow

1. Restate the research goal and scope briefly. If scope is unclear, choose the most useful interpretation and state it.
2. Search broadly first using fast code search, then read the concrete files that define the behavior.
3. Trace real paths:
   - Entry points.
   - Callers and callees.
   - Data model and state transitions.
   - Side effects, external services, generated artifacts, and configuration.
   - Tests that document expected behavior.
4. For complex or cross-repo questions, split research across sub-agents by system slice, such as frontend flow, backend flow, data model, or integration boundary.
5. Verify claims against code. Mark inference clearly when direct proof is unavailable.
6. Produce a concise research brief.

## Research Brief

```markdown
## Codebase Research: <goal>

**Scope researched**
- `<path-or-repo>` - <why it matters>

**Summary**
<High-level answer.>

**How it works**
1. <Concrete step in the flow>
2. <Concrete step in the flow>

**Key files and responsibilities**
- `<path>` - <responsibility>

**Important contracts**
- <API, type, data model, config, event, or invariant>

**Edge cases and gotchas**
- <Non-obvious behavior or risk>

**Open questions**
- <What could not be verified>
```

## Principles

- Prefer concrete file paths, function names, types, routes, events, and config keys.
- Do not turn the output into annotated source code.
- Do not speculate when code can be inspected.
- Keep the answer aimed at the stated goal, not a full codebase tour.

## Handoff

End with a short machine-readable handoff for the orchestrator:

```markdown
Status: complete | partial | blocked
Next suggested action: triage | plan | more-research | human-input | stop
Blockers: <none or concise list>
Research gaps: <none or specific unanswered questions>
Artifacts: <research brief location or inline title>
Confidence: high | medium | low
```

Do not invoke other workflow skills from this skill. Report what is needed next and let the orchestrator decide.

## Move Score Adapter

- Start with `README.md`, `package.json`, `svelte.config.js`, `vite.config.ts`, and `convex.json` when project shape matters.
- Search with `rg` and `rg --files`; trace real Svelte components in `src/lib/components/`, routes in `src/routes/`, GeoNorge code in `src/lib/geonorge/`, and Convex functions in `src/convex/`.
- Treat the shared hook runner in `scripts/agent-hooks/` plus `.claude/settings.json` and `.codex/hooks.json` as the active local automation path for post-edit formatting/linting.
- Treat `src/convex/_generated/` as generated contract evidence, not editable source.
- For deployed behavior, consider both Vercel frontend previews and Convex backend previews.
- Preserve Norwegian product/domain vocabulary unless the research question is specifically about copy or localization.
