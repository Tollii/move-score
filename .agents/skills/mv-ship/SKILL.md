---
name: mv-ship
description: Autonomous Move Score delivery orchestrator. Use when asked to ship, implement end-to-end, take a GitHub issue or idea from intake to PR, or coordinate research, triage, planning, implementation, review, and comment resolution with sub-agents. The caller acts as orchestrator and delegates to sub-agents where useful.
---

# Move Score Ship

Act as the orchestrator for end-to-end delivery. Delegate research, planning, implementation, review, and comment resolution to sub-agents only when that improves throughput or separation of concerns. Minimize human interaction; use `mv-ping-human` for blockers that cannot be responsibly resolved by code/context/common sense.

## Operating Model

The top-level agent is the master orchestrator. It owns:

- Scope control.
- Delegation.
- Integration of sub-agent results.
- Final judgment.
- Publishing or handoff.

Sub-agents own bounded tasks, such as backend research, frontend research, plan critique, implementation of a specific module, or independent review.

Sub-agents do not decide the overall workflow. They return artifacts, status, blockers, and suggested next actions. The orchestrator decides whether to continue, revise, spawn another pass, publish, review, or escalate.

## Project Adapter

- Work in `Tollii/move-score` with `main` as the PR base and `codex/` branches unless the user asks otherwise.
- Use GitHub Issues and PRs. The issue board is available but lightly used, so keep process lightweight for solo-maintainer work.
- Validate with `pnpm check`, `pnpm lint`, and `pnpm build` when risk warrants it; use targeted checks first.
- Treat Vercel and Convex preview deployments as the normal PR deployment path and mention caveats when publishing or reviewing.
- Do not edit `src/convex/_generated/` by hand; run `npx convex codegen` after Convex schema or API changes when needed.

## Workflow

1. Intake
   - Identify the source requirement, target repos, constraints, and desired output.
   - If the request is too vague to proceed, run `mv-triage`.
   - If the request is primarily a bug, regression, flaky behavior, or unexplained failure, run `mv-debug` before planning a fix.
   - If the request is primarily a failing GitHub, Vercel, or Convex check, inspect the failing check/logs directly before planning a code fix.

2. Research
   - Run `mv-codebase-research`.
   - For cross-system work, delegate separate research agents by slice. Example slices: backend, frontend, data model, infrastructure, integrations.

3. Triage and assumptions
   - Surface hidden requirements and edge cases.
   - Resolve minor ambiguity with explicit assumptions.
   - Use `mv-ping-human` only for blocking ambiguity.

4. Plan
   - Run `mv-plan-implementation`.
   - Ensure the plan is specific enough for a smaller/faster model to execute.

5. Critique and iterate
   - Run `mv-plan-critique` when the plan is risky, broad, or intended for another agent to execute.
   - Patch the plan until blockers and major gaps are resolved.

6. Implement
   - Run `mv-implement-plan` when executing a written plan. For parallel implementation, assign disjoint file/module ownership to sub-agents.
   - Integrate results carefully and preserve unrelated user changes.

7. Validate
   - Run the plan's validation.
   - Add or adjust validation when new risk is discovered.
   - If validation reveals a distinct bug or flaky failure, run `mv-debug` before continuing.

8. Documentation
   - Update `README.md` or relevant in-repo docs directly when behavior, API contracts, setup, operations, migrations, or user-visible workflows changed.

9. Publish
   - Run `mv-create-pr` if a GitHub PR is desired.

10. Review
   - Run `mv-pr-review` against the published change or local diff.
   - Run `mv-security-pr-review` as a separate pass when the change touches authentication, authorization, sensitive data, external input, dependencies, infrastructure, secrets, or another security-sensitive surface.
   - If review comments are produced, run `mv-address-review-comments`.
   - Repeat review/address cycles until no material findings remain or a human decision is needed.

## Sub-Agent Handoff Contract

Every delegated agent should finish with:

```markdown
Status: <ready/complete/implemented/published/clean/partial/blocked/revisions-needed/etc.>
Next suggested action: <plan/critique/implement/revise-plan/research/publish/review/address-comments/human-input/stop>
Blockers: <none or concise list>
Artifacts: <brief, plan, commits, PR URL, review thread ids, or other useful outputs>
Validation: <commands run and results, when applicable>
Notes: <assumptions, caveats, residual risk, or feedback for another pass>
```

Treat `Next suggested action` as input, not an instruction. Compare it with the objective, the artifacts, and the risk before deciding the next step.

## Iteration Rules

- If research is partial, decide whether the gap matters. If it does, run another targeted research pass.
- If triage is blocked, use `mv-ping-human` only for the exact missing decision.
- If the plan needs revisions, either revise it directly from the evidence or delegate a new planning pass with the critique.
- If implementation is partial or blocked, inspect the implementation feedback before deciding between more research, plan revision, human input, or a narrower implementation pass.
- If debugging identifies a different root cause than the original requirement assumed, update the plan before implementing.
- If a GitHub, Vercel, or Convex check failure is unrelated to the change, report that evidence instead of folding unrelated repair into the feature branch.
- If publishing is blocked, resolve the repository or validation issue before retrying publication.
- If review posts findings, address them and re-review only the changed risk area unless the changes are broad.
- If security review posts findings, handle them through the project's private or normal review channel according to severity policy.
- If a sub-agent suggests a next step that does not match the evidence, override it and record why.

## Delegation Rules

- Delegate research slices that can run independently.
- Delegate implementation only with clear file/module ownership.
- Tell every worker they are not alone in the codebase and must not revert other edits.
- Do not delegate the immediate blocking task if the orchestrator can resolve it faster locally.
- Do not duplicate work across agents.

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
- Validation was run or the reason it could not run is recorded.
- The change is published if requested.
- Review feedback has been addressed or clearly handed off.
