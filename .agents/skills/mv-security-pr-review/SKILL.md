---
name: mv-security-pr-review
description: Move Score security-focused pull request review workflow. Use when asked to review a GitHub PR, diff, branch, or patch specifically for security vulnerabilities, data exposure, unsafe dependencies, secrets, or abuse risks.
---

# Move Score Security PR Review

Review a proposed GitHub PR or local diff only for actionable security risk.

## Project Adapter

- Fetch metadata and diffs from GitHub `Tollii/move-score`.
- Post one inline GitHub review thread per actionable security finding.
- Review external input boundaries: GeoNorge responses, address search input, Mapbox isochrone calls, Convex function arguments, URL/query state, and map rendering data.
- Check secret handling for `MAPBOX_ACCESS_TOKEN`, Convex deployment variables, Vercel environment variables, and `.env.local`.
- Treat addresses, coordinates, derived scores, and lookup history as user data.
- Use private chat escalation for sensitive exploit detail or credential exposure.

## Workflow

1. Fetch metadata and diff, including changed files, changed line numbers, and surrounding context.
2. Identify security-sensitive surfaces touched by the change.
3. Read surrounding source and enforcement points; do not rely on the diff alone.
4. Look for actionable vulnerabilities: data exposure, injection, unsafe redirects, secret leakage, weak validation, SSRF, DoS, dependency risk, or unsafe client trust.
5. Post one inline finding per issue on the tightest possible changed line range.
6. Do not post general code quality comments.

## Finding Format

```markdown
<Security risk and exploit condition.>

<Concrete fix or control to add.>
```

## Handoff

```markdown
Status: findings-posted | clean | partial | blocked
Next suggested action: address-comments | general-review | human-input | stop
Findings posted: <count and ids/links if available>
Residual risk: <security-sensitive areas not reviewed or test gaps>
```
