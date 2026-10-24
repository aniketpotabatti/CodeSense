# CodeSense Changelog

All notable changes to CodeSense will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- None

### Changed
- None

### Deprecated
- None

### Removed
- None

### Fixed
- None

### Security
- None

## [0.4.0] - 2026-10-24

### Added
- Static security audit: scans source code for known insecure patterns and returns findings as `ReviewRisk` objects (`src/lib/codesense/security-audit.ts`)
- Insight panel: displays detected security findings, with a section listing issues or a "no issues found" message (`src/components/editor/insight-panel.tsx`)

### Changed
- `ReviewSeverity`: added new `"critical"` severity level for categorizing security risks (`src/lib/codesense/types.ts`)
- `parse-review`: enhanced to accommodate the new `critical` severity level (`src/lib/codesense/parse-review.ts`)

### Deprecated
- None

### Removed
- None

### Fixed
- None

### Security
- None

## [0.3.1] - 2026-10-24

### Added
- None

### Changed
- None

### Deprecated
- None

### Removed
- None

### Fixed
- Suggest mode: cursor marker changed from `⬛CURSOR⬛` to `⟦CURSOR⟧` so the suggestion-acceptance assertion matches codebase convention (`src/lib/codesense/prompts.ts`)
- Content Security Policy: allow `https://cdn.jsdelivr.net` in `style-src` to resolve the monaco-editor stylesheet console warning (`src/routes/__root.tsx`)

### Security
- None

## [0.3.0] - 2026-10-24

### Added
- "test" AI mode for generating unit tests from a code snippet, returning strict JSON (`src/lib/codesense/prompts.ts`)
- Docs: multi-file context support documented as shipped in v0.3.0

### Changed
- None

### Deprecated
- None

### Removed
- None

### Fixed
- None

### Security
- None

## [0.2.2] - 2026-10-23

### Added
- None

### Changed
- Release quality gates verified: all 58 unit tests pass, ESLint reports 0 errors, TypeScript typecheck passes, production build succeeds, dev server runs on port 8080, and browser verification confirms clean rendering with no console errors or horizontal overflow
- Reliability / API hardening: distinct per-error retry categories (INVALID_MODE, EMPTY_SNIPPET, RATE_LIMITED, TOKEN_LIMIT_EXCEEDED, PROVIDER_TIMEOUT), AbortController with 30s timeout and exponential backoff, health polling, server-side proxying of provider API keys, and BYOK encryption with Test Key verification
- Ops / Security / Docs hardening: `startup.sh`, dev entrypoint, and `vite.config.ts` kept in sync on port `0.0.0.0:8080`, streaming status HUD (TTFT, TPS, cost), security hardening (zod request validation, Content Security Policy, CORS allowlist, secret scanning, no logging of snippets or keys), and documentation (README API reference table, CHANGELOG.md, footer version link, consolidated roadmap)

### Deprecated
- None

### Removed
- Removed unused `decrypting` state from `src/components/editor/settings-sheet.tsx`
- Removed unused `callUpstream` import and unused `done` variable from `src/routes/api/test-key.ts`

### Fixed
- Content Security Policy in `src/routes/__root.tsx`: added `'unsafe-inline'` to `script-src` so TanStack Start inline bootstrap scripts execute
- Invalid JSX attribute in `src/routes/__root.tsx`: replaced `http-equiv` with `httpEquiv` on the meta tag

### Security
- None

## [0.2.1] - 2026-10-23

### Added
- Codesense unit tests: `src/lib/codesense/snippet.test.ts`, `prompts.test.ts`, `rateLimit.test.ts`, `stream.test.ts` covering snippet extraction/limit enforcement, prompt template rendering, token-bucket rate limiting, and streaming event parsing
- Smoke test (`scripts/codesense-smoke.test.mjs`): end-to-end validation of the `GET /api/detect` snippet flow (matches, no-match, client attribution)

## [0.2.0] - 2026-10-22

### Added
- Command palette (`Cmd+K` / `Ctrl+K`): Explain code, Review file, Export file as Markdown, theme toggle, and language switching (`src/components/editor/command-palette.tsx`)
- `/api/detect` and `/api/review` API routes with API key extraction middleware and per-client rate limiting (HTTP 429 with `Retry-After`)
- API key middleware (`@/lib/codesense/apiKeyMiddleware`) and rate-limit module (`@/lib/codesense/rate-limit`)
- Better Auth migration `migrations/auth/0001_auth.sql` ("Sign in with Grok" user + session tables)
- ESLint flat config (`eslint.config.mjs`) and Prettier config (`.prettierrc`)

### Changed
- `README.md` restructured
- `src/routeTree.gen.ts` regenerated for the new `/api/detect` and `/api/review` routes

### Deprecated
- None

### Removed
- None

### Fixed
- None

### Security
- None

## [0.1.2] - 2026-10-19

### Added
- None

### Changed
- None

### Deprecated
- None

### Removed
- None

### Fixed
- Badge `severityVariant` "low" returned "secondary", which is not a
  valid Badge variant; now returns "default"
- Added missing `Store.applySuggest` type and implementation
  (Monaco `executeEdits` at editor cursor with null-safety)
- Added missing `provider.ts` exports: `PROVIDER_LABELS`,
  `detectProvider`, `readKeyOverride`, `demoResponse`; fixed null
  header handling with `?? undefined`

## [0.1.1] - 2026-10-19

### Added
- Strict JSON review output (§3.9): `review.json` schema with `enhancements`/`blockers`/`summary`
- `parse-review`: parsing and validation of LLM review output into structured results
- Thumbs up/down feedback on reviews in the Insight panel

### Changed
- None

### Deprecated
- None

### Removed
- None

### Fixed
- None

### Security
- None

## [0.1.0] - 2026-10-19

### Added
- Initial CodeSense release (pre-release / untracked until stabilized)
