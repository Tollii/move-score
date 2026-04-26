---
name: mv-refactor
description: Move Score refactoring orchestration workflow. Use when asked to refactor, simplify, restructure, modernize, extract responsibilities, reduce duplication, improve architecture, or make behavior-preserving design changes across a codebase.
---

# Move Score Refactor

Orchestrate a behavior-preserving code change. A refactor should make the design easier to change without changing user-visible behavior unless the request explicitly includes a functional change.

## Operating Model

The top-level agent owns scope, safety, and validation. Delegate research, mechanical edits, or independent module refactors only when tasks have clear ownership and can be validated independently.

## Project Adapter

- Work in `Tollii/move-score` with `main` as the PR base and `codex/` branches unless the user asks otherwise.
- Use GitHub Issues and PRs. The issue board is available but lightly used, so keep process lightweight for solo-maintainer work.
- Prefer the repo tools `move_score_validate`, `move_score_format_files`, `move_score_convex_codegen`, and `move_score_categorize_files` when they are available; fall back to `pnpm` scripts when they are not.
- Validate with `pnpm check`, `pnpm lint`, and `pnpm build` when risk warrants it; use targeted checks first.
- Treat Vercel and Convex preview deployments as the normal PR deployment path and mention caveats when publishing or reviewing.
- Do not edit `src/convex/_generated/` by hand; run `npx convex codegen` after Convex schema or API changes when needed.

## Workflow

1. Intake
   - Identify the refactoring goal, target area, explicit non-goals, and acceptable behavior changes.
   - If the request mixes feature work and refactoring, separate the work or state the coupling clearly.

2. Characterize existing behavior
   - Run or identify tests that describe current behavior.
   - Read entry points, public contracts, data shapes, and callers.
   - Add characterization tests first when behavior is important but not covered.

3. Find responsibilities and boundaries
   - Name the responsibilities currently hidden in large functions, flags, null conventions, duplicated logic, or broad types.
   - Look for classic refactoring signals: long methods, large classes, duplicated code, feature envy, data clumps, primitive obsession, shotgun surgery, divergent change, temporary fields, message chains, and lazy or speculative abstractions.
   - Identify values that should be parsed once into meaningful domain types instead of repeatedly validated as primitives.
   - Identify anemic models: data structures that carry domain state while services or callers own all behavior and invariants.
   - Map dependency direction. Look for cycles, domain code depending on infrastructure, cross-layer imports, shared utility dumping grounds, and business rules coupled to frameworks.
   - Identify stable interfaces and compatibility constraints.
   - Decide whether the refactor should be mechanical, semantic, or staged.

4. Plan the refactor
   - Prefer small, reversible steps.
   - Split mechanical moves/renames from behavior-affecting cleanup.
   - Define validation after each meaningful step.
   - Use `mv-ping-human` only if an intended behavior or public contract cannot be inferred safely.

5. Execute
   - Make one coherent change at a time.
   - Preserve public APIs, serialized data, migrations, event names, and user-facing behavior unless explicitly approved.
   - Keep compatibility shims when callers cannot be updated atomically.
   - Parse at boundaries and pass typed objects inward. Do not repeatedly pass raw strings, maps, IDs, booleans, or nullable primitives through core logic after their meaning is known.
   - Move behavior to the type that owns the invariant. Avoid leaving domain objects as passive bags while unrelated services enforce their rules.
   - Improve dependency direction by introducing ports/interfaces, moving framework details outward, or extracting domain logic from infrastructure-facing modules when the local architecture supports it.
   - Regenerate derived artifacts only through project commands.

6. Validate
   - Run characterization, targeted, and broad regression checks proportional to blast radius.
   - Inspect diff for accidental behavior changes.
   - If behavior changed, either justify it as requested or split it out.

7. Handoff or publish
   - Summarize the design improvement, contracts preserved, validation run, and remaining risk.

## Refactor Plan

```markdown
## Refactor Plan: <title>

**Goal**
<Design problem being solved.>

**Behavior contract**
- <Behavior, API, schema, event, or UI contract that must remain unchanged>

**Current structure**
- `<path>` - <current responsibility or problem>

**Smells and forces**
- <Primitive obsession, anemic model, long method, data clump, dependency cycle, feature envy, etc.>

**Target structure**
- `<path>` - <new responsibility or contract>

**New or strengthened types**
- `<TypeName>` - <invariant, parsed value, domain behavior, or boundary it owns>

**Dependency direction**
- <Which dependency moves inward/outward, which layer should no longer know about another>

**Steps**
1. <Characterization or safety step>
2. <Mechanical move/rename/extract step>
3. <Semantic simplification step, if any>

**Validation**
- <Targeted and broad checks>

**Non-goals**
- <Explicitly excluded changes>
```

## Principles

- A refactor without a behavior contract is a rewrite risk.
- Prefer explicit types and named responsibilities over boolean flags, nullable sentinels, repeated conditionals, and god methods.
- Parse, do not merely validate. A validator returns a boolean or error and throws away knowledge; a parser returns a value whose type carries the checked invariant into the next call.
- Replace primitive obsession with domain vocabulary: IDs, emails, money, dates, permissions, states, ranges, and parsed inputs should become meaningful values when they have rules.
- Counter anemic models by moving behavior and invariants onto the domain type that owns them. Services should coordinate workflows, not hoard all business rules for passive data bags.
- Improve dependency direction before adding abstractions. Good refactors reduce knowledge between modules; they do not just move code into new names.
- Follow small, behavior-preserving steps: characterize, move, rename, extract, inline, then simplify. Keep the system working between steps.
- Do not combine broad formatting churn with semantic edits.
- Keep reviewable commits: characterization, mechanical movement, and cleanup are usually separate.
- If the target design is uncertain, stop at a plan or prototype rather than scattering partial abstractions.

## Handoff

End with a short machine-readable handoff:

```markdown
Status: refactored | planned | partial | blocked
Next suggested action: review | implement | plan | human-input | stop
Blockers: <none or concise list>
Behavior contract: <preserved | changed intentionally | uncertain>
Changes made: <files/commits summary or none>
Validation: <commands run and results>
Residual risk: <none or concise list>
```

When acting as the top-level orchestrator, decide whether to continue with implementation, review, publication, or human escalation. When delegated by another orchestrator, report what is needed next and let the caller decide.

## Move Score Adapter

- Keep Svelte UI, GeoNorge client integration, and Convex backend responsibilities separated.
- Treat Convex schema/API changes as public contracts for generated clients; run `npx convex codegen` when needed and do not edit generated files by hand.
- Claude Code and Codex project hooks already run scoped post-edit checks; avoid widening those into full-repo format churn unless the refactor genuinely needs it.
- Use `pnpm check`, `pnpm lint`, and `pnpm build` as characterization and regression gates.
- Avoid broad formatting churn; run `pnpm format` only when the touched scope justifies it.
- Preserve app vocabulary for address lookup, score sections, `Eiendom`, `Nabolag`, `Kollektivt`, and `gangavstand`.
- Consider Vercel and Convex preview behavior when refactors change routing, environment variables, server functions, or deployment config.
