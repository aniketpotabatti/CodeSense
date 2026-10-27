# CodeSense Changelog

All notable changes to CodeSense will be documented in this file.

<!-- The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). -->

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


## [0.5.3] - 2026-10-27

### Added
- None

### Changed
- Restructured Settings sheet into rounded card containers (`SettingsCard`) with subtle borders, section icons, and denser toggle rows for Modes, Performance, and AI Provider sections (`src/components/editor/settings-sheet.tsx`)
- Changed API key placeholder from `sk-…` to `Enter Gemini, OpenAI, Claude, or xAI key…`, added client-side provider auto-detection chip/badge inside the input field, and added password masking with Eye/EyeOff show/hide toggle (`src/components/editor/settings-sheet.tsx`)
- Added "Test Key" button in Settings sheet that runs a round-trip key verification against `/api/test-key` and displays round-trip latency (e.g. `Connected to Google Gemini (142ms)`) (`src/components/editor/settings-sheet.tsx`)
- Polished file tabs in `src/components/editor/file-tabs.tsx`: per-language icons (`FileJson` for JSON, language-tinted `FileCode2` for TypeScript/JavaScript/Python/Go/Rust/Java, muted icons for other languages), active tab accent bar (`border-accent`), and screen-reader `aria-label="{name} ({language})"` labels on each tab (§1.3 item 1, File Tabs Polish)
- Replaced plain-text Insight Panel empty states with styled surface cards (accent icon badges, action shortcut buttons, and Ctrl/Cmd keybinding hint chips) across Explain, Review, Suggest, Test, Profile, and AI-paused states (`src/components/editor/insight-panel.tsx`) (§1.3 item 2, Insight Panel Empty States & Onboarding)
- Trimmed theme customizer to Dark/Light only (default Dark); moved theme icon out of the Settings sheet header into the sheet body as an Appearance row with Moon/Sun toggle buttons (`src/components/ui/sheet.tsx`, `src/components/editor/settings-sheet.tsx`, `src/lib/codesense/types.ts`)

### Deprecated
- None

### Removed
- Removed `headerActions` prop and theme `DropdownMenu` from the Settings sheet header; removed `[data-theme="dracula"]`, `[data-theme="nord"]`, `[data-theme="midnight-oled"]` CSS overrides (`src/components/ui/sheet.tsx`, `src/components/editor/settings-sheet.tsx`, `src/styles.css`)

### Fixed
- Changed Suggest button color in toolbar to match CodeSense logo's "Sense" cyan (`#00e5ff`) with dark text (`#13151b`) on hover (`src/components/editor/toolbar.tsx`)

### Security
- None

## [0.5.2] - 2026-10-26

### Added
- None

### Changed
- Moved `CommandPalette` from `app-shell.tsx` into the editor toolbar, anchored between the Context Files button and Settings icon (`src/components/editor/toolbar.tsx`, `src/components/editor/app-shell.tsx`)
- Refactored the "N files in context" text button into an icon-only `<Layers />` button with a floating counter badge and a `DropdownMenu` popover listing active context files (name, language badge, char count) plus a toggle to enable/disable multi-file context (`src/components/editor/toolbar.tsx`)
- Reordered Insight Panel tabs to `Explain → Review → Suggest → Test → Profile`, updating the matching body view branches (`src/components/editor/insight-panel.tsx`)

### Deprecated
- None

### Removed
- None

### Fixed
- Fixed misaligned CommandPalette search trigger button (updated `className` to `size-11`, `bg-transparent`, with proper focus ring styles) (`src/components/editor/command-palette.tsx`)
- Fixed search icon placement by relocating `CommandPalette` from the middle split bar (`src/components/editor/app-shell.tsx`) into the toolbar (`src/components/editor/toolbar.tsx`) between the Context Files button and Settings icon, with a `Ctrl+K` shortcut pill (`src/components/editor/command-palette.tsx`).

### Security
- None

## [0.5.1] - 2026-10-25

### Added
- Dedicated **Suggest** tab in Insight Panel (`src/components/editor/insight-panel.tsx`) with real-time streaming completion, copy code, one-click Apply Suggestion button, and feedback rating.
- Toolbar **Suggest** trigger button (`src/components/editor/toolbar.tsx`) with keyboard hints for quick code completion at cursor.
- Command Palette (`Ctrl+K`) action for "Suggest code completion".
- Multi-provider SSE stream mappers: added `mapGeminiStream` for Google Gemini (`candidates[0].content.parts[0].text`) and `mapAnthropicStream` for Anthropic Claude.
- Decrypted API key forwarding (`src/lib/codesense/stream.ts`): automatically attaches `X-Codesense-Key` and `x-api-key` to all stream and health requests.

### Changed
- Updated Gemini upstream to `gemini-2.5-flash` with `streamGenerateContent?alt=sse`.
- Status bar signal indicator now dynamically reflects provider state: green glow with "Got API Key � Google Gemini" (or active provider) when key is configured, and orange/tan indicator with "Demo mode" when operating keyless.

### Fixed
- Fixed 503 `AI_UNAVAILABLE` failure when running without server environment variables; CodeSense now smoothly falls back to streaming simulated demo responses for Explain, Review, Suggest, and Test.
- Fixed health endpoint (`GET /api/codesense`) returning unavailable by checking per-request client key overrides.
- Fixed `streamCodesense` dropping Gemini chunks due to previously forcing OpenAI payload format across all providers.

## [0.5.0] - 2026-10-24

### Added
- Client-side static complexity profiler (`src/lib/codesense/complexity.ts`): `computeComplexity` computes per-file cyclomatic complexity, per-function metrics (name, start/end line, line count), max nesting depth, Big-O time/space estimates, a 0–100 maintainability score, and actionable issues (high complexity, deep nesting, long functions, memory hazards, dynamic code) — heuristic, no LLM or server round trip, works in demo mode
- Insight panel: new "Profile" tab (`src/components/editor/insight-panel.tsx`) with a toolbar "Profile" action and `ComplexityBody` view rendering score, functions, issues, and estimates; state and `runComplexity` action in `src/lib/codesense/store.ts` with idle/done/error lifecycle
- Unit tests: `src/lib/codesense/complexity.test.ts` covering cyclomatic counting, recursion/exponential time estimation, issue flags (high-complexity, long-function, memory-hazard, dynamic-code), and function detection for Python, Go, Rust, Java, plus whole-file fallback for SQL

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
