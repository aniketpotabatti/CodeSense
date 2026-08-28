# CodeSense — GenAI LLM Editor Integration

### Real-time Code Explanation · Feedback · Completion · Dual-Target (VS Code + Web)

---

## 1. Project Brief

**CodeSense** is a lightweight, dual-target GenAI integration that captures code on keystroke or save events and streams the raw text snippet to an LLM API. It provides three live capabilities simultaneously:


| Capability  | Trigger                  | Output                              |
| ----------- | ------------------------ | ----------------------------------- |
| **Explain** | Keystroke / selection    | Inline natural-language explanation |
| **Review**  | On save                  | Structured feedback panel           |
| **Suggest** | Pause / idle (debounced) | Inline ghost-text completion        |


No multi-step tool execution. No heavy agent loops. Fast, focused, single-hop LLM calls.

---



## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        EDITOR LAYER                             │
│                                                                 │
│  ┌──────────────────────┐     ┌───────────────────────────┐     │
│  │   VS Code Extension  │     │   Web Editor (Monaco)     │     │
│  │  (TypeScript / VSIX) │     │  (React + Monaco Editor)  │     │
│  └──────────┬───────────┘     └──────────┬────────────────┘     │
│             │  keystroke/save events     │                      │
│             └─────────────┬──────────────┘                      │
│                           ▼                                     │
│              ┌────────────────────────┐                         │
│              │   Event Capture Layer  │                         │
│              │  • debounce (300ms)    │                         │
│              │  • cursor context      │                         │
│              │  • language detection  │                         │
│              └────────────┬───────────┘                         │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────┐
│                     GATEWAY / MIDDLEWARE                      │
│                                                               │
│   ┌──────────────────────────────────────────────────────┐    │
│   │               Prompt Router                          │    │
│   │  classify intent → explain / review / suggest        │    │
│   │  inject context (lang, cursor line, snippet size)    │    │
│   │  select system prompt template                       │    │
│   └───────────────────────┬──────────────────────────────┘    │
│                           │                                   │
│   ┌──────────────────┐    │    ┌───────────────────────────┐  │
│   │  Rate Limiter    │◄───┘    │   Token Budget Guard      │  │
│   │  (per-user/key)  │         │   (max ~800 tokens/req)   │  │
│   └──────────────────┘         └───────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────┐
│                      LLM API LAYER                            │
│                                                               │
│   Provider: Anthropic Claude (claude-haiku — speed priority)  │
│   Fallback:  OpenAI GPT-4o-mini (latency SLA breach)          │
│                                                               │
│   ┌──────────────┐   ┌───────────────┐   ┌────────────────┐   │
│   │  /explain    │   │   /review     │   │   /suggest     │   │
│   │  stream:true │   │  stream:true  │   │  stream:true   │   │
│   └──────────────┘   └───────────────┘   └────────────────┘   │
└───────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────┐
│                     RESPONSE RENDER LAYER                     │
│                                                               │
│  VS Code:  WebviewPanel + InlayHints + GhostText API          │
│  Web:      React streaming panel + Monaco InlineCompletion    │
└───────────────────────────────────────────────────────────────┘
```

---



## 3. Tech Stack Decisions



### 3.1 VS Code Extension


| Concern       | Choice                              | Why                                         |
| ------------- | ----------------------------------- | ------------------------------------------- |
| Language      | TypeScript                          | VS Code API is TS-native; full IntelliSense |
| LLM Client    | `@anthropic-ai/sdk`                 | Streaming built-in, typed responses         |
| UI Panel      | `WebviewPanel` (React inside)       | Rich streaming markdown render              |
| Ghost-text    | `InlineCompletionItemProvider`      | Native VS Code API — zero DOM hacks         |
| Bundler       | `esbuild`                           | Fast, tiny VSIX output                      |
| Event capture | `workspace.onDidChangeTextDocument` | Keystroke-level delta events                |




### 3.2 Web Editor


| Concern      | Choice                             | Why                               |
| ------------ | ---------------------------------- | --------------------------------- |
| Editor core  | Monaco Editor (React wrapper)      | Same engine as VS Code            |
| Framework    | React + Vite                       | Fast HMR, lean bundle             |
| Streaming UI | `ReadableStream` + `TextDecoder`   | Native browser API, no lib needed |
| State        | Zustand                            | Lightweight, no boilerplate       |
| Styling      | Tailwind CSS                       | Utility-first, quick iteration    |
| API proxy    | Node.js (Express) or Edge Function | Keep API key server-side, always  |




### 3.3 LLM Strategy

```
Primary:   claude-haiku-3   → lowest latency, cheap per-token
Fallback:  gpt-4o-mini      → if Anthropic p95 latency > 2s
Streaming: always on         → perceived speed >> actual speed
Max tokens input:  800       → enforced at gateway
Max tokens output: 400       → explain/suggest; 600 for review
```

> **Opinion:** Use `claude-haiku` as default. It's fast enough for keystroke-level feedback, and for a dev tool, latency is the product. Save `claude-sonnet` for a "deep review" mode triggered on-demand.

---



## 4. Prompt Engineering Design



### 4.1 System Prompt Template (shared base)

```
You are CodeSense, a precise and concise code assistant embedded inside a developer's editor.
You receive raw code snippets. You never hallucinate APIs or fabricate behavior.
You respond in plain, clear language — no unnecessary preamble.
Detected language: {{LANGUAGE}}
Mode: {{MODE}}  [explain | review | suggest]
```



### 4.2 Mode-Specific Instructions

**Explain Mode**

```
The developer selected or is actively editing the following snippet.
Explain what it does in 2–4 sentences. Focus on intent, not syntax.
Snippet:
{{CODE_SNIPPET}}
```

**Review Mode** (on save)

```
The developer just saved this file. Perform a concise code review.
Structure your response as:
- ✅ What's good (1–2 points)
- ⚠️ What to improve (1–3 actionable points)
- 💡 One optional refactor suggestion

Keep the entire response under 200 words.
File:
{{CODE_SNIPPET}}
```

**Suggest Mode** (debounced idle)

```
Complete the following code. Return ONLY the completion — no explanation, no markdown fences.
Stop at a logical boundary (end of function, statement, or block).
Context:
{{CODE_SNIPPET}}
Cursor position: line {{LINE}}, col {{COL}}
```



### 4.3 Context Injection Strategy

```
snippet = lines[max(0, cursor_line - 30) : cursor_line + 10]
```

- Keeps input lean (avoids token bloat on large files)
- Always includes cursor context (10 lines ahead)
- Language auto-detected via file extension or Monaco's model language

---



## 5. Milestone Timeline

```
Week 1 — Foundation
  ├── Scaffold VS Code extension (esbuild + TypeScript)
  ├── Scaffold web editor (Vite + React + Monaco)
  └── Set up API proxy / gateway (Node.js Express)

Week 2 — Event Capture + Streaming
  ├── Implement keystroke debounce + snippet extraction (both targets)
  ├── Wire up LLM streaming endpoint (Anthropic SDK)
  └── Basic explain mode: render streamed text in Webview / React panel

Week 3 — All Three Modes
  ├── Review mode triggered on file save
  ├── Suggest mode: ghost-text via InlineCompletionItemProvider (VS Code)
  ├── Suggest mode: Monaco InlineCompletion (web)
  └── Prompt router logic: classify intent, select template

Week 4 — Polish + Hardening
  ├── Rate limiting + token budget guard at gateway
  ├── Fallback provider logic (Anthropic → OpenAI)
  ├── Error states: timeout, empty response, API failure
  └── Settings UI: toggle modes, adjust debounce delay, choose model

Week 5 — Portfolio Packaging
  ├── README with GIF demo (Explain + Review + Suggest in action)
  ├── Architecture diagram in docs/
  ├── Publish VS Code extension to marketplace (preview)
  └── Deploy web editor to Vercel / Railway
```

---



## 6. API Design



### Gateway Endpoint

```
POST /api/codesense
Content-Type: application/json

{
  "mode": "explain" | "review" | "suggest",
  "language": "python" | "typescript" | "go" | ...,
  "snippet": "<raw code string>",
  "cursorLine": 42,
  "cursorCol": 18
}
```

**Response:** `text/event-stream` (SSE)

```
data: {"delta": "This function"}
data: {"delta": " iterates over"}
data: {"delta": " an array and..."}
data: [DONE]
```



### Error Shape

```json
{
  "error": "TOKEN_LIMIT_EXCEEDED" | "RATE_LIMITED" | "PROVIDER_TIMEOUT",
  "message": "human-readable string",
  "retryAfter": 2000
}
```

---



## 7. Key Engineering Decisions & Tradeoffs


| Decision             | Chosen Approach         | Alternative Considered | Reason                                         |
| -------------------- | ----------------------- | ---------------------- | ---------------------------------------------- |
| Streaming            | SSE via `fetch`         | WebSockets             | SSE is simpler for unidirectional LLM streams  |
| API key security     | Server-side proxy       | Direct client call     | Never expose API key in browser                |
| Debounce delay       | 300ms                   | 100ms / 500ms          | Balance between responsiveness and API cost    |
| Input truncation     | ±30 lines around cursor | Full file              | Token efficiency; full file is rarely needed   |
| Model default        | `claude-haiku`          | `gpt-4o`               | Speed > power for keystroke-level UX           |
| Ghost-text rendering | Native VS Code API      | Custom decoration      | Avoids flicker, respects editor UX conventions |


---



## 8. Out of Scope (Explicitly)

- ❌ Multi-step agent loops or tool execution
- ❌ Persistent conversation history
- ❌ RAG / codebase indexing
- ❌ Authentication / user accounts (v1)
- ❌ Support for Jupyter / notebooks (v1)

These are deliberate cuts to keep the system **fast, focused, and shippable.**

---



## 9. Portfolio Signal

This project demonstrates:

- **LLM API integration** — streaming, prompt engineering, provider fallback
- **Editor extension development** — VS Code API surface, Monaco customization
- **System design thinking** — gateway, rate limiting, token budgets
- **Dual-target delivery** — same core logic, two different UX surfaces
- **Production-grade habits** — error handling, security (no exposed keys), latency awareness

---

*CodeSense — v1 Plan | Author: Aniket Potabatti | Status: Active*