---
name: mv-security-review
description: Move Score security review orchestration workflow. Use when asked to audit, threat-model, harden, or review a feature, code area, architecture, dependency, API, authentication flow, authorization boundary, data handling path, or security-sensitive change.
---

# Move Score Security Review

Orchestrate a security-focused review beyond ordinary code review. The goal is to identify exploitable risks, missing controls, unsafe assumptions, and practical hardening steps with evidence from code and system behavior.

## Operating Model

The top-level agent owns scope, threat framing, and final risk judgment. Delegate independent slices when useful, such as authentication, authorization, data exposure, dependency risk, infrastructure, client-side trust, or logging.

## Project Adapter

- Work in `Tollii/move-score` with `main` as the PR base and `codex/` branches unless the user asks otherwise.
- Use GitHub Issues and PRs. The issue board is available but lightly used, so keep process lightweight for solo-maintainer work.
- Validate with `pnpm check`, `pnpm lint`, and `pnpm build` when risk warrants it; use targeted checks first.
- Treat Vercel and Convex preview deployments as the normal PR deployment path and mention caveats when publishing or reviewing.
- Do not edit `src/convex/_generated/` by hand; run `npx convex codegen` after Convex schema or API changes when needed.

## Workflow

1. Scope the review
   - Identify assets, data sensitivity, users, trust boundaries, entry points, and deployment context.
   - State what is in and out of scope.
   - If the request is only to review a GitHub PR, branch, or patch for security issues, run or delegate `mv-security-pr-review`.

2. Build a threat model
   - Actors: anonymous users, authenticated users, privileged users, internal services, compromised clients, third parties.
   - Surfaces: APIs, webhooks, queues, file uploads, redirects, templates, database queries, auth flows, secrets, logs, dependencies, infrastructure.
   - Failure modes: bypass, escalation, injection, data leak, tampering, replay, SSRF, CSRF, XSS, deserialization, path traversal, DoS, insecure defaults.

3. Inspect implementation evidence
   - Read code paths, config, tests, schemas, middleware, policies, and deployment settings.
   - Verify authorization checks at the server-side enforcement point.
   - Check input validation, output encoding, secret handling, audit logging, error behavior, and dependency boundaries.

4. Classify findings
   - Critical: likely exploitable severe impact.
   - High: exploitable or plausible high-impact weakness.
   - Medium: meaningful defense gap or conditional exploit path.
   - Low: hardening, observability, or best-practice issue.
   - Informational: note without requested action.

5. Recommend fixes
   - Provide concrete code or design direction.
   - Prefer enforceable controls over comments, conventions, or client-side checks.
   - Identify required tests or verification.

6. Handoff
   - Report findings, evidence, recommended fixes, and residual risk.
   - Use `mv-ping-human` if risk acceptance, destructive remediation, disclosure, or credentials require an owner decision.

## Security Review Brief

```markdown
## Security Review: <scope>

**Scope**
- <Feature, repo, route, service, or change>

**Assets and trust boundaries**
- <Sensitive data, actor, system boundary>

**Findings**
- Severity: <Critical | High | Medium | Low | Informational>
  Evidence: `<path>` / <behavior>
  Risk: <exploit path and impact>
  Recommendation: <specific fix>
  Validation: <test or check>

**Positive controls observed**
- <Important existing controls that reduce risk>

**Residual risk**
- <Unreviewed areas, assumptions, or accepted risks>
```

## Principles

- Security review is evidence-driven; do not rely on framework assumptions without checking the project integration.
- Server-side authorization is the control. Client-side hiding is not authorization.
- Treat logs, errors, metrics, and analytics as possible data exfiltration paths.
- Prefer deny-by-default, explicit allowlists, scoped credentials, least privilege, and safe parsers.
- Do not post sensitive exploit details publicly unless the Move Score workflow says it is appropriate.

## Handoff

End with a short machine-readable handoff:

```markdown
Status: findings | clean | partial | blocked
Next suggested action: harden | review | human-input | stop
Blockers: <none or concise list>
Findings: <count by severity>
Artifacts: <brief location or inline title>
Residual risk: <none or concise list>
```

When acting as the top-level orchestrator, decide whether to continue with hardening, review, publication, or human escalation. When delegated by another orchestrator, report what is needed next and let the caller decide.

## Move Score Adapter

- There is no separate security tracker configured in this repo; use chat for sensitive findings and GitHub Issues/PR comments only for non-sensitive remediation work.
- Review SvelteKit routes/components, Convex functions/schema, GeoNorge and Mapbox integration, Vercel config, Convex deployment config, dependencies, and environment-variable handling.
- Treat address input, coordinates, scores, and lookup context as sensitive user data even if the app has no heavy account system yet.
- Check that security decisions happen server-side in Convex or trusted SvelteKit server code, not only through client UI hiding.
- Use `pnpm lint`, `pnpm check`, `pnpm build`, and dependency review via `pnpm audit` when dependency or supply-chain risk is in scope.
- Escalate before destructive Convex remediation, production environment changes, or disclosure of credential leaks.
