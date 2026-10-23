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
