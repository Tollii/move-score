---
name: mv-refactor-discovery
description: Move Score refactoring discovery workflow. Use when asked to find places to refactor, identify design smells, or produce a prioritized refactoring backlog before changing code.
---

# Move Score Refactor Discovery

Find high-value refactoring opportunities and turn them into a prioritized, evidence-backed backlog. This workflow does not refactor by default.

## Project Adapter

- Use `README.md`, `package.json`, and the existing `src/routes/`, `src/lib/`, and `src/convex/` layout as the repo map and domain glossary starting point.
- Respect the boundary between Svelte UI, GeoNorge client integration, and Convex backend functions.
- Do not move generated Convex files except through `npx convex codegen`.
- Use `pnpm check`, `pnpm lint`, and `pnpm build` as characterization gates when no dedicated tests exist.
- Favor app vocabulary for address, neighborhood, transit, score, and walking-distance concepts.

## Workflow

1. Define the discovery scope and current pain: churn, duplication, hard changes, bugs, or confusing responsibilities.
2. Search for smells with evidence: primitive obsession, repeated checks, broad components, leaking infrastructure, unstable boundaries, or duplicated data shaping.
3. Read enough surrounding code to understand real responsibilities and contracts.
4. Prioritize candidates by change friction, risk reduction, and reviewability.
5. Produce bounded candidates suitable for `mv-refactor`.

## Output

```markdown
## Refactor Discovery: <scope>

### Candidates
- <Title>
  Evidence: `<path>` / <behavior>
  Benefit: <why this helps>
  First safe step: <small behavior-preserving step>
  Validation: <commands/checks>
```

## Handoff

```markdown
Status: candidates-found | clean | partial | blocked
Next suggested action: refactor | research | human-input | stop
Candidates: <count and top titles>
Recommended first candidate: <title or none>
```
