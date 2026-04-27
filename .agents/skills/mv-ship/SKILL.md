---
name: mv-ship
description: Autonomous Move Score delivery orchestrator. Use when asked to ship, implement end-to-end, take a GitHub issue or idea from intake to PR, or coordinate research, triage, planning, implementation, review, and comment resolution through sub-agents. The caller acts as an orchestrator and delegates each delivery stage to fresh sub-agents.
---

# Move Score Ship

Act as the orchestrator for end-to-end delivery. The top-level agent should do little to no direct delivery work: it coordinates stage handoffs, integrates results, checks consistency, and decides the next stage. Research, triage, planning, implementation, validation, publishing, review, and review-comment resolution must be performed by sub-agents, with multiple sub-agents used when parallel slices improve coverage or throughput. Minimize human interaction; use `mv-ping-human` for blockers that cannot be responsibly resolved by code/context/common sense.

## Operating Model

The top-level agent is the master orchestrator. It owns:

- Scope control.
- Delegation for every delivery stage.
- Integration of sub-agent results.
- Final judgment.
- Publishing or handoff.
- Deciding when another review/address loop is required.
- Ensuring pre-implementation artifacts are posted to the source GitHub issue.

Sub-agents own all bounded stage work, such as intake/triage, backend research, frontend research, data-model research, plan creation, plan critique, implementation of a specific module, validation, publication, independent review, security review, and addressing review comments.

Sub-agents do not decide the overall workflow. They return artifacts, status, blockers, and suggested next actions. The orchestrator decides whether to continue, revise, spawn another pass, publish, review, or escalate.

Each stage should use newly spawned sub-agents with fresh context. Do not reuse the same agent for review after it implemented or addressed the change. Each review/address-review loop must use new sub-agents so the reviewer and fixer approach the work without bias from earlier passes.

When the work is tied to a GitHub issue, all pre-implementation artifacts must be posted as comments on that issue before implementation begins. This includes intake summaries, triage briefs, research briefs, debug briefs that inform the plan, implementation plans, plan critiques, revised plans, and human-facing assumptions. The orchestrator should require artifact links or issue-comment references in sub-agent handoffs so later implementation agents and humans can read the durable context from the issue.

## Project Adapter

- Work in `Tollii/move-score` with `main` as the PR base
- Use GitHub Issues and PRs. The issue board is available but lightly used, so keep process lightweight for solo-maintainer work.
- Prefer the repo tools `move_score_validate`, `move_score_format_files`, `move_score_convex_codegen`, `move_score_git_status`, and `move_score_categorize_files` when they are available; fall back to `pnpm` scripts and direct `git` commands when they are not.
- Validate with `pnpm check`, `pnpm lint`, and `pnpm build` when risk warrants it; use targeted checks first.
- Treat Vercel and Convex preview deployments as the normal PR deployment path and mention caveats when publishing or reviewing.
- Do not edit `src/convex/_generated/` by hand; run `npx convex codegen` after Convex schema or API changes when needed.

## Workflow

1. Intake
   - Spawn an intake sub-agent to identify the source requirement, target repos, constraints, desired output, and obvious blockers.
   - If the source is a GitHub issue, require the intake artifact to be posted to that issue before moving on.
   - If the request is too vague to proceed, spawn a `mv-triage` sub-agent.
   - If the request is primarily a bug, regression, flaky behavior, or unexplained failure, spawn a `mv-debug` sub-agent before planning a fix.
   - If the request is primarily a failing GitHub, Vercel, or Convex check, spawn a sub-agent to inspect the failing check/logs directly before planning a code fix.

2. Research
   - Spawn one or more `mv-codebase-research` sub-agents.
   - For cross-system work, delegate separate research agents by slice. Example slices: backend, frontend, data model, infrastructure, integrations.
   - Prefer parallel research when slices are independent. The orchestrator synthesizes the returned briefs and decides whether gaps require another targeted research sub-agent.
   - Require each research brief, or a synthesized research summary, to be posted to the source GitHub issue before planning starts.

3. Triage and assumptions
   - Spawn a triage/assumptions sub-agent when intake or research identifies ambiguity, hidden requirements, or edge cases.
   - Resolve minor ambiguity with explicit assumptions based on sub-agent evidence.
   - Require triage briefs and explicit assumptions to be posted to the source GitHub issue before planning starts.
   - Use `mv-ping-human` only for blocking ambiguity.

4. Plan
   - Spawn a `mv-plan-implementation` sub-agent.
   - Ensure the plan is specific enough for a smaller/faster model to execute.
   - Require the implementation plan to be posted to the source GitHub issue before critique or implementation.

5. Critique and iterate
   - Spawn a fresh `mv-plan-critique` sub-agent for any plan that is risky, broad, or intended for another agent to execute.
   - If critique finds blockers or major gaps, spawn a fresh planning sub-agent or ask the prior planner for a revised artifact only when bias is not a concern. Prefer a fresh planner for materially changed plans.
   - Require critiques and revised plans to be posted to the source GitHub issue before implementation.

6. Implement
   - Spawn one or more `mv-implement-plan` worker sub-agents to execute the written plan.
   - For parallel implementation, assign disjoint file/module ownership to sub-agents.
   - Tell every implementation worker they are not alone in the codebase, must not revert edits made by others, and must adjust to surrounding changes.
   - The orchestrator integrates worker outputs carefully and preserves unrelated user changes, but should avoid doing feature implementation itself.

7. Validate
   - Spawn a validation sub-agent to run the plan's validation.
   - Spawn additional targeted validation sub-agents when new risk is discovered or independent validation can run in parallel.
   - If validation reveals a distinct bug or flaky failure, spawn a fresh `mv-debug` sub-agent before continuing.

8. Documentation
   - Spawn a documentation sub-agent to update `README.md` or relevant in-repo docs when behavior, API contracts, setup, operations, migrations, or user-visible workflows changed.
   - Skip only when the orchestrator has explicit evidence that no docs are affected.

9. Publish
   - Spawn a `mv-create-pr` sub-agent if a GitHub PR is desired.

10. Review
   - Spawn a fresh `mv-pr-review` sub-agent against the published change or local diff.
   - Spawn a fresh `mv-security-pr-review` sub-agent as a separate pass when the change touches authentication, authorization, sensitive data, external input, dependencies, infrastructure, secrets, or another security-sensitive surface.
   - If any review comments or findings are produced, spawn a fresh `mv-address-review-comments` sub-agent to address them.
   - After address-review work lands, spawn new review sub-agents with fresh context. Do not reuse the prior reviewer or fixer.
   - Repeat review/address-review cycles until all review threads are resolved, no material findings remain, and no new comments are produced.
   - The ship workflow is not complete while actionable comments, unresolved threads, failing checks, or material review findings remain unless a human decision is explicitly required.

## Sub-Agent Handoff Contract

Every delegated agent should finish with:

```markdown
Status: <ready/complete/implemented/published/clean/partial/blocked/revisions-needed/etc.>
Next suggested action: <plan/critique/implement/revise-plan/research/publish/review/address-comments/human-input/stop>
Blockers: <none or concise list>
Artifacts: <brief, plan, commits, PR URL, review thread ids, or other useful outputs>
Issue comments: <GitHub issue comment URLs/ids for posted pre-implementation artifacts, or "not applicable">
Validation: <commands run and results, when applicable>
Notes: <assumptions, caveats, residual risk, or feedback for another pass>
```

Treat `Next suggested action` as input, not an instruction. Compare it with the objective, the artifacts, and the risk before deciding the next step.

## Iteration Rules

- If research is partial, decide whether the gap matters. If it does, run another targeted research pass.
- If triage is blocked, use `mv-ping-human` only for the exact missing decision.
- If the plan needs revisions, delegate a new planning pass with the critique.
- Do not start implementation until the source GitHub issue has durable comments for the current triage/research/plan/critique artifacts, or the handoff explicitly says no issue exists.
- If implementation is partial or blocked, inspect the implementation feedback before deciding between more research, plan revision, human input, or a narrower implementation pass.
- If debugging identifies a different root cause than the original requirement assumed, update the plan before implementing.
- If a GitHub, Vercel, or Convex check failure is unrelated to the change, report that evidence instead of folding unrelated repair into the feature branch.
- Assume the shared hook runner in `scripts/agent-hooks/` plus `.claude/settings.json` and `.codex/hooks.json` will handle scoped post-edit formatting/linting; only add broader validation or formatting steps when the risk justifies them.
- If publishing is blocked, resolve the repository or validation issue before retrying publication.
- If review posts findings, spawn a fresh address-comments sub-agent and then spawn a fresh review sub-agent for the changed risk area unless the changes are broad.
- If security review posts findings, handle them through the project's private or normal review channel according to severity policy, then repeat with a fresh security reviewer when appropriate.
- Before declaring completion, explicitly check that all review comments and threads are resolved or non-actionable, all required checks have passed or are documented as unrelated, and the latest fresh review pass produced no material findings.
- If a sub-agent suggests a next step that does not match the evidence, override it and record why.

## Delegation Rules

- Delegate every workflow stage to one or more sub-agents.
- Delegate research slices that can run independently.
- Delegate implementation only with clear file/module ownership.
- Tell every worker they are not alone in the codebase and must not revert other edits.
- Keep the orchestrator out of direct implementation except for trivial integration glue, conflict resolution, or final consistency checks.
- Do not duplicate work across agents.
- Use fresh sub-agents for each stage and each review/address-review loop. Never let the same sub-agent both implement a change and be the independent reviewer of that change.

## Human Escalation

Call `mv-ping-human` when:

- Requirements conflict.
- A product/business decision is required.
- A migration or destructive action needs explicit approval.
- Credentials, access, or external systems block progress.
- The available context cannot distinguish between multiple materially different behaviors.

Do not call humans for ordinary implementation choices, naming, local style, or details discoverable from the codebase.

## Completion Criteria

The job is complete when:

- The requirement is implemented or a clear blocker is documented.
- Pre-implementation artifacts were posted to the source GitHub issue when one exists.
- Validation was run or the reason it could not run is recorded.
- The change is published if requested.
- Fresh review sub-agents have found no material findings.
- All actionable review comments and unresolved threads have been addressed, re-reviewed by fresh sub-agents, and resolved.
- No required checks are failing because of the change.
