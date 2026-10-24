# CodeSense — Project Plan (single source of truth)

> Updated 2026-10-17. Previous version backed up at `plan.md.bak-20261017` (untouched).
> Rules: work top-down; tick a box only after browser verification in the app being run.

## 0. Merge decision — DECIDED 2026-10-17: Option B

**Survivor: the React app (`src/`).** `server.cjs` becomes a pure API gateway —
its provider/rate-limit/SSE logic is preserved, its inline UI
(`INDEX_HTML`/`STYLES_CSS`/`APP_JS`) is retired after the port.

Why: React shell is the production-grade surface (tokens, shadcn UI, Zustand,
tests, Vercel path). Legacy UI stays only as reference until demos are ported.

- [x] **Q1. Which shell survives?** → (b) React app; `server.cjs` → API gateway.
- [x] **Q2. Where do viewers meet the demos?** → (b) Dedicated Demo tab/route: guided
  Explain → Review → Suggest walkthrough. Keep "Try a sample" buttons as quick entry.
  Support all six language samples (port missing Rust/Java/JS into `samples.ts`).
- [x] **Q3. Single launch command?** → `npm run dev` for development, Vercel
  (`npm run build`) for production. Archive legacy `node server.cjs` UI launch path.
  BEFORE archiving: migrate + test 4-provider support, BYOK headers, demo streaming
  into the React/TanStack backend. Keep `server.cjs` only if standalone Node deploy
  is genuinely needed.

## 1. Shipped history (from Antigravity — preserved)

### 1.1 Custom API Key Input in Settings & Signal Indicator — DONE in `server.cjs`
Status: shipped. Do not re-implement; reuse during merge.

What was asked (verbatim from original plan):
Add an API key input option field in the Settings overlay/sheet:
1. By default, CodeSense runs in "demo" mode with an orange/tan signal dot.
2. In Settings, add an "API Key" input field where the user can enter an API key from any supported provider (Gemini, OpenAI, Anthropic, xAI / Grok, or custom OpenAI-compatible).
3. Optionally allow selecting or auto-detecting the provider (or passing the custom key in request headers / body).
4. Persist the API key in `localStorage`.
5. When an API key is entered / saved:
   - The signal pill on the UI switches from "demo" (orange/tan) to "Got API Key" with a green signal indicator dot.
   - When the user clears the API key, it reverts back to "demo" with orange/tan signal color.
6. Support sending the user-provided API key from the client to `/api/codesense`, dynamically using the provided key for live LLM streaming.
7. Restart/verify `server.cjs` and test on `http://localhost:8080`.
8. Create `features.md` to catalog all suggested future features and roadmap items.

Correction (2026-10-17): item 7 documents the LEGACY entry only. After the §0 merge,
there is exactly one launch command — update this line then.

### 1.2 One-Click "Apply Suggestion / Refactor" (Diff View) — PARTIAL
Status: DONE. Monaco DiffEditor "Apply Refactor" wired in InsightPanel
(RefactorBlock → RefactorDiffDialog → setFileContent), verified in browser.
1. **Extend Review Parsing & Prompt Extraction**:
   - Parse code blocks or refactored snippets extracted from review recommendations.
   - If a suggested replacement or refactor is present, extract it cleanly into structured refactor/diff metadata.
2. **Build Interactive Diff / Refactor Action UI**:
   - Create a dedicated `DiffModal` / `DiffPreview` component using Monaco Diff Editor (`monaco.editor.createDiffEditor` or `@monaco-editor/react`'s `<DiffEditor />`).
   - In `InsightPanel`, show an **"Inspect & Apply Refactor"** or **"Preview Diff"** button alongside refactor recommendations.
3. **Editor Document Patching with Undo / Redo**:
   - Provide an "Apply to Editor" action that updates the active file content.
   - Use editor `pushEditOperations` or update file state in Zustand store so that changes are seamlessly reflected in Monaco with standard `Ctrl+Z` / `Ctrl+Y` undo/redo history.
4. **Standalone `server.cjs` Integration**:
   - Add inline code suggestion / refactor apply buttons and diff preview modal to `server.cjs` web client (`APP_JS`, `STYLES_CSS`, `INDEX_HTML`).
5. **Testing & Verification**:
   - Test on `http://localhost:8080`, verify that saving or reviewing produces refactor suggestions with a "Preview Diff" button, opens the diff modal, and applying updates the editor flawlessly.

Correction (2026-10-17): item 4 ("Standalone `server.cjs` integration") was scoped to the
legacy client only and is SUPERSEDED by the §0 merge — do not build it separately.

---

## 2. P0 polish — where the work actually landed (corrected 2026-10-17)

> Correction: every P0.1–P0.5 item below shipped in the **React app (`src/`)** unless
> noted. The earlier draft implied some items touched `server.cjs` — that was wrong
> and is fixed here. The browser-visible legacy UI still needs the §0 merge.

### 2.1 Header / Toolbar — DONE in `src/components/editor/toolbar.tsx`
- [x] Remove duplicate actions: single Explain / Review / Suggest group only
- [x] Make language a single DropdownMenu with file icon (LANGUAGES type)
- [x] Promote Explain / Review to primary actions with kbd hints: Ctrl+E, Ctrl+S, Tab
- [x] Lift provider pill to header: Demo Bring Key (amber) vs model + ms (green)
- [x] Verify responsive: toolbar collapses to icons on mobile, no overflow at 390px

### 2.2 Hint bar / Coachmark — DONE in `src/` (`insight-panel.tsx` + `store.ts`)
Note: the screenshot's permanent hint bar lives in legacy `server.cjs:INDEX_HTML`
(`.editor-toolbar`), which was NOT touched. The `src/` app has no hint strip — it uses
a coachmark card instead. The §0 merge decides which pattern survives.
- [x] Move permanent hint text into dismissible coachDismissed coachmark
- [x] Auto-hide coachmark after first successful Explain/Review run
- [x] Keep Dismiss button working + persisted in Zustand store

### 2.3 Samples — DONE in `src/lib/codesense/` (+ guard test)
Correction: the `outc` / `fn main() {c` typos from the screenshot were NEVER in the repo
(live-typing artifact / stale editor state). Both sources audited clean: `server.cjs`
SAMPLES (TS/JS/Python/Go/Rust/Java) and `src/lib/codesense/samples.ts` (retry.ts,
graph.py, pool.go). Test added: `samples.test.ts` (7 pass). `graph.py` keeps its
mutable-default-arg bug intentionally as review fodder.
- [x] Fix Rust sample line 16: outc -> out
- [x] Fix Rust sample line 19: fn main() {c -> fn main() {
- [x] Audit all SAMPLES (TS/JS/Python/Go/Rust/Java) must typecheck/compile
- [x] Add test that loads each sample

### 2.4 Insight Panel — DONE in `src/` (new `markdown.tsx` + `insight-panel.tsx` + `store.abortActive`)
Zero-dependency safe renderer (no `react-markdown` install). Truncation at 1200 chars +
Show more. Explain → Summary/Walkthrough/Edge cases. Review keeps badges + Markdown +
Export MD + Copy + stage-1 Apply fix + Stop button + ErrorCard retry + action empty states.
- [x] Add react-markdown: headers, inline code, fenced blocks, lists
- [x] Fix truncation bug Vec::with_ cut off, handle budget + Show more
- [x] Reuse ReviewBody sections for Explain: Summary / Walkthrough / Edge cases
- [x] Keep Whats good / What to improve / Optional refactor Badges
- [x] Add streaming states: skeleton + shimmer + caret + Abort button
- [x] Add actions: Copy / Export MD / Apply Fix with sonner toasts
- [x] Improve empty states: No review yet + illustration + Try Sample button

### 2.5 Editor — DONE in `src/components/editor/monaco-pane.tsx` + `src/styles.css`
- [x] Increase line-height / padding, enable bracket colorization, guides, line highlight
- [x] Minimap off on mobile via isMobile in app-shell.tsx
- [x] Ghost Suggest as dim italic + inline Tab hint, not solid text
- [x] Show review issues as squiggles via setModelMarkers

### 2.6 Status bar — OPEN, in `src/components/editor/status-bar.tsx`
Target: VS Code pattern `Ln/Col | Lang | UTF-8 | tok | ms | left | Streaming`, tooltips +
icons, tabular-nums, collapse on mobile. Depends on §0 (legacy footer vs React bar).
- [x] Replace cryptic text with VS Code pattern: Ln/Col | Rust | UTF-8 | tok | ms | left | Streaming
- [x] Add Tooltip + lucide icons, tabular-nums for numbers
- [x] Hide tok / debounce on small screens, keep Ln/Col + AI dot always visible
- [x] Keep aiLabel / aiTone logic: Checking AI / Streaming / model / AI unavailable

## 3. After the merge (P1/P2 — build once, in the surviving shell)

### P1 — Professional feel

### 7. Tokens and consistency (`src/styles.css` @theme — or legacy `STYLES_CSS` if §0 picks A)
- [x] Enforce 8pt grid, radius-md 10px cards, radius-sm 6px buttons
- [x] Use single shadow-border + hover everywhere, no flat grey panels
- [x] Fix contrast: muted #8b8d97 fails AA at 12px -> bump body to #a1a3ad
- [x] Verify Outfit + IBM Plex Mono, accent #7ec8c0, border #2a2b32 consistent

### 8. Command palette + feedback (cmdk, sonner, vaul already installed)
- [x] Add Cmd+K: Explain, Review, Switch Language, Toggle Theme, Export
- [x] Add sonner toasts for Copied, Applied, Key saved, Rate limited
- [x] Mobile: Group vertical + Insight bottom sheet via vaul, test 390px

## P2 — Production engineering (paths updated to `src/`; legacy `lib/*.mjs` names were wrong)

### 9. Prompt quality (`src/lib/codesense/prompts.ts`, `store.ts`)
- [x] Return strict JSON: summary, walkthrough, risks[line,severity,msg], refactor{diff}
- [x] Parse to ParsedReview in store, no vague filler text
- [x] Add thumbs feedback to feed prompt iterations (features.md 3.3)

### 10. Reliability / API (`src/routes/api/codesense.ts` + `src/lib/codesense/provider.ts` + `stream.ts`)
- [x] Surface each error distinctly with retry: INVALID_MODE, EMPTY_SNIPPET, RATE_LIMITED, TOKEN_LIMIT_EXCEEDED, PROVIDER_TIMEOUT
- [x] Add AbortController, 30s timeout, exponential backoff
- [x] Keep probeHealth polling, show AI paused empty state correctly
- [x] Proxy provider keys via server env; if BYOK encrypt + Test Key ping (features.md 2.2)

### 11. Quality gates
- [x] Keep green: npm run build + typecheck + lint + test  (build ✓, typecheck clean, lint 0 errors, all 58 tests pass)
- [x] Add tests: snippet.test.ts, prompts.test.ts, rateLimit.test.ts, providers.stream.test.ts  (all four exist; `npm test` — all 58 pass)
- [x] Add Playwright smoke: load sample -> Explain -> Review -> Apply  (`tests/codesense-smoke.mjs` — SMOKE PASS on desktop 1280x800 and mobile 390x844 against dev server :8080)

### 12. Ops / Security / Docs (single entry — decided in §0; port contract `0.0.0.0:8080`)
- [x] Keep `startup.sh` + surviving entry + `vite.config.ts` port `0.0.0.0:8080` in sync (legacy `server.cjs` entry resolved in §0 — not two entries)
- [x] Add streaming HUD in status bar: TTFT, TPS, cost (features.md 3.1)
- [x] Security: zod validation, CSP, CORS allowlist, secret-scan (features.md 1.3), never log snippets/keys
- [x] Docs: README API table + CHANGELOG.md, footer v1 link, consolidate roadmap

## 4. Merge execution — Phase 1: backend port (IN PROGRESS 2026-10-17)

Target: `src/lib/codesense/provider.ts` + `src/routes/api/codesense.ts` match legacy
`server.cjs` capabilities: 4 providers (Gemini → Anthropic → xAI → OpenAI priority),
BYOK headers (`X-Codesense-Key` / `X-Codesense-Provider`), demo streaming fallback.

- [x] 4.1 Multi-provider upstream in `provider.ts` (env keys + model overrides)
- [x] 4.2 BYOK: `detectProvider` + `readKeyOverride` + `callUpstream`; client sends stored key headers; Settings key UI comes next
- [x] 4.3 Demo streaming fallback (port `demoResponse`), health reports `provider: demo`
- [x] 4.4 Tests: provider-detect matrix + demo fallback + key-override plumbing
- [x] 4.5 Verify: `npm run dev` with no keys (demo) + with test key (BYOK) in browser
- [x] P0 this week: dedupe toolbar, markdown panel, fix samples, status-bar labels, abort+error states
- [x] P1: JSON prompts, Apply Diff via Monaco DiffEditor, history in IndexedDB, Cmd+K, export MD/PR comment — done, browser-verified on dev + built output
- [ ] P2 later: 
      - [X] 1. multi-file context
      - [X] 2. test generator
      - [X] 3. security badges 
      - [X] 4. complexity profiler

<!-- ## P2.1 Multi-file Context (DONE 2026-10-24)

### Goal
Let CodeSense include other open file tabs as background context when running
Explain or Review on the active file. The AI sees the full workspace picture �
imports, shared types, helper modules � so its analysis is accurate and
cross-file aware instead of snippet-isolated.

### Design decisions
- Context files are sent as **optional extra snippets** via a new contextFiles
  field in CodesenseRequest (array of {name, language, content}).
- Only **non-active** tabs are included, capped to keep total tokens in budget.
- A settings toggle **"Include open files as context"** (default: on) controls it.
- The API route/server accepts and forwards contextFiles to uildMessages.
- uildMessages appends a ### Context files section after the main snippet.
- The UI shows a small **"N files in context"** badge on the Toolbar when context
  is active so users know it's running.

### Tasks
- [x] Add contextFiles to CodesenseRequest type (optional)
- [x] Add includeContext to Settings + DEFAULT_SETTINGS
- [x] Extend CodesenseRequestSchema in API route to accept contextFiles
- [x] Update uildMessages in prompts.ts to append context file section
- [x] Update 
unExplain + 
unReview in store.ts to collect & send context files
- [x] Add **context badge** in Toolbar (shows "2 files in context")
- [x] Add toggle in SettingsSheet ("Include open files as context")
- [x] Tests: prompts.test.ts — verify context section is appended
- [x] QA: dev server smoke, build + typecheck -->
