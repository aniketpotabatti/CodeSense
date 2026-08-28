<div align="center">
    <img src="artifacts\imagine_images\7ed09951-b2a2-4191-8e47-c4de566cbaa9.jpg">
</div>

# CodeSense

**Real-time code explanation, review, and completion — inside your editor.**

CodeSense streams focused LLM responses as you select, save, or pause. No multi-step agents. No RAG. Just three fast modes over a shared SSE gateway.


| Mode        | Trigger                       | Output                                 |
| ----------- | ----------------------------- | -------------------------------------- |
| **Explain** | Selection or manual           | Streaming natural-language explanation |
| **Review**  | Save (`Ctrl/Cmd+S`) or manual | Structured feedback panel              |
| **Suggest** | Idle (debounced)              | Inline ghost-text completion           |


---

## Quick start

**Requirements:** Node.js 18+ (built-in `http` / `fs` only — no `npm install`)

```bash
cd codesense-app
node server.cjs
# or: ./start.sh
```

Open **[http://localhost:8080](http://localhost:8080)**

### Optional API keys

Without keys, the gateway runs in **demo mode** (streamed synthetic responses so the UI is fully usable offline).

```bash
export ANTHROPIC_API_KEY=sk-ant-…     # preferred (Claude Haiku-class)
# or
export XAI_API_KEY=xai-…
export OPENAI_API_KEY=sk-…            # fallback

export GEMINI_API_KEY=AQ-…

# Optional model overrides
export ANTHROPIC_MODEL=claude-3-5-haiku-latest
export XAI_MODEL=grok-3-mini
export OPENAI_MODEL=gpt-4o-mini
export GEMINI_API_KEY=gemini-3.6-flash

node server.cjs
```

Provider priority: **Anthropic → xAI → Google Gemini → OpenAI → demo**.

---



## Try it

1. **Explain** — select a block in the Monaco editor, or click **Explain**
2. **Review** — press `Ctrl/Cmd+S` or click **Review**
3. **Suggest** — pause while typing; accept ghost text with **Tab**
4. Switch language (TypeScript, JavaScript, Python, Go, Rust, Java) and load a sample
5. Open **Settings** to toggle modes and adjust debounce (100–800 ms)

---



## Architecture

```
┌──────────────────────┐     ┌───────────────────────────┐
│  Web (Monaco Editor) │     │  VS Code Extension        │
│  public/app.js       │     │  vscode-extension/        │
└──────────┬───────────┘     └──────────┬────────────────┘
           │  snippet + mode + cursor  │
           └─────────────┬──────────────┘
                         ▼
              ┌────────────────────┐
              │  Gateway           │
              │  POST /api/codesense
              │  • prompt router   │
              │  • rate limit      │
              │  • token budget    │
              └─────────┬──────────┘
                        ▼
              ┌────────────────────┐
              │  LLM providers     │
              │  Anthropic / xAI / │
              │  OpenAI / demo     │
              │  stream: always on │
              └────────────────────┘
```

---



## API



### Health

```http
GET /api/health
```

```json
{
  "ok": true,
  "provider": "demo",
  "maxInputTokens": 800
}
```



### Codesense (SSE)

```http
POST /api/codesense
Content-Type: application/json

{
  "mode": "explain" | "review" | "suggest",
  "language": "typescript",
  "snippet": "function add(a: number, b: number) { return a + b; }",
  "cursorLine": 12,
  "cursorCol": 4
}
```

**Response:** `text/event-stream`

```
data: {"delta":"This function"}
data: {"delta":" adds two numbers…"}
data: [DONE]
```

**Errors (JSON body or SSE payload):**


| Code                   | Meaning                                      |
| ---------------------- | -------------------------------------------- |
| `INVALID_MODE`         | `mode` not one of explain / review / suggest |
| `EMPTY_SNIPPET`        | Missing or blank `snippet`                   |
| `RATE_LIMITED`         | >30 requests/min per client IP               |
| `TOKEN_LIMIT_EXCEEDED` | Snippet over ~800 token budget               |
| `PROVIDER_TIMEOUT`     | Upstream LLM failure                         |


---



## Project layout

```
codesense-app/
├── server.cjs              # HTTP server + SSE gateway (port 8080)
├── start.sh                # Convenience launcher
├── lib/
│   ├── prompts.mjs         # System + mode templates, token estimate
│   ├── rateLimit.mjs       # Token-bucket: 30 req/min per client
│   └── providers.mjs       # Anthropic / xAI / OpenAI / demo streams
├── public/
│   ├── index.html          # Shell
│   ├── styles.css          # Dark editor chrome
│   └── app.js              # Monaco + SSE client + settings
└── vscode-extension/       # Optional VS Code target
    ├── package.json
    ├── tsconfig.json
    └── src/extension.ts
```

---



## VS Code extension

The extension talks to the **same gateway**.

```bash
cd vscode-extension
npm install
npm run compile
```

In VS Code: **Developer: Install Extension from Location…** → select this folder.


| Setting                   | Default                 | Description                    |
| ------------------------- | ----------------------- | ------------------------------ |
| `codesense.gatewayUrl`    | `http://127.0.0.1:8080` | Gateway base URL               |
| `codesense.debounceMs`    | `300`                   | Debounce for explain / suggest |
| `codesense.enableExplain` | `true`                  | Explain on selection           |
| `codesense.enableReview`  | `true`                  | Review on save                 |
| `codesense.enableSuggest` | `true`                  | Inline completions             |


**Commands:** `CodeSense: Explain Selection`, `CodeSense: Review Document`, `CodeSense: Toggle Suggest`

---



## Design decisions


| Concern            | Choice                        | Why                                        |
| ------------------ | ----------------------------- | ------------------------------------------ |
| Streaming          | SSE over `fetch`              | Simple unidirectional LLM streams          |
| API keys           | Server-side only              | Never exposed to the browser               |
| Debounce           | 300 ms default                | Balance responsiveness vs. cost            |
| Context window     | ±30 / +10 lines around cursor | Keeps input under ~800 tokens              |
| Default model path | Fast / cheap (Haiku-class)    | Latency is the product for keystroke UX    |
| Ghost text         | Monaco / VS Code native APIs  | No DOM hacks; respects editor UX           |
| Dependencies       | Node built-ins + CDN Monaco   | `npm install` not required for the web app |




### Explicitly out of scope (v1)

- Multi-step agent loops or tool execution  
- Persistent conversation history  
- RAG / codebase indexing  
- Auth / user accounts  
- Jupyter / notebooks

---



## Configuration reference


| Env var             | Purpose                      |
| ------------------- | ---------------------------- |
| `PORT`              | Listen port (default `8080`) |
| `ANTHROPIC_API_KEY` | Primary provider             |
| `ANTHROPIC_MODEL`   | Override Anthropic model id  |
| `XAI_API_KEY`       | xAI / Grok provider          |
| `XAI_MODEL`         | Override xAI model id        |
| `OPENAI_API_KEY`    | OpenAI fallback              |
| `OPENAI_MODEL`      | Override OpenAI model id     |


---



## License

MIT — use it, fork it, ship it.
