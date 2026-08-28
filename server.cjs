/**
 * CodeSense — single-file server (Windows-friendly CommonJS)
 *
 * In PowerShell / Cursor terminal:
 *   node server.cjs
 *
 * Then open: http://localhost:8080
 */
"use strict";

const http = require("http");

const PORT = Number(process.env.PORT || 8080);

const INDEX_HTML = "<!doctype html>\n<html lang=\"en\">\n  <head>\n    <meta charset=\"UTF-8\" />\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />\n    <meta name=\"theme-color\" content=\"#0b0c0e\" />\n    <title>CodeSense</title>\n    <link rel=\"preconnect\" href=\"https://fonts.googleapis.com\" />\n    <link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin />\n    <link\n      href=\"https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap\"\n      rel=\"stylesheet\"\n    />\n    <link rel=\"stylesheet\" href=\"/styles.css\" />\n    <link\n      rel=\"stylesheet\"\n      href=\"https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs/editor/editor.main.css\"\n    />\n  </head>\n  <body>\n    <div class=\"app\">\n      <header class=\"header\">\n        <div class=\"brand\">\n          <span class=\"brand-mark\" aria-hidden=\"true\">\u2726</span>\n          CodeSense\n        </div>\n        <div class=\"header-actions\">\n          <div class=\"mode-toggles\" role=\"group\" aria-label=\"Modes\">\n            <button type=\"button\" class=\"mode-btn active\" data-mode=\"explain\">\n              <span class=\"dot\"></span>Explain\n            </button>\n            <button type=\"button\" class=\"mode-btn active\" data-mode=\"review\">\n              <span class=\"dot\"></span>Review\n            </button>\n            <button type=\"button\" class=\"mode-btn active\" data-mode=\"suggest\">\n              <span class=\"dot\"></span>Suggest\n            </button>\n          </div>\n\n          <select class=\"select\" id=\"language\" aria-label=\"Language\">\n            <option value=\"typescript\">TypeScript</option>\n            <option value=\"javascript\">JavaScript</option>\n            <option value=\"python\">Python</option>\n            <option value=\"go\">Go</option>\n            <option value=\"rust\">Rust</option>\n            <option value=\"java\">Java</option>\n          </select>\n\n          <button type=\"button\" class=\"btn\" id=\"btnExplain\">Explain</button>\n          <button type=\"button\" class=\"btn\" id=\"btnReview\">Review</button>\n          <button type=\"button\" class=\"btn btn-ghost\" id=\"btnSample\">Sample</button>\n\n          <span class=\"spacer\"></span>\n\n          <span class=\"status-pill demo\" id=\"statusPill\">\n            <span class=\"pulse\"></span>\n            <span id=\"statusText\">\u2026</span>\n          </span>\n\n          <button type=\"button\" class=\"btn btn-ghost\" id=\"btnSettings\" aria-label=\"Settings\">\n            Settings\n          </button>\n        </div>\n      </header>\n\n      <div class=\"main\">\n        <div class=\"editor-pane\">\n          <div class=\"editor-toolbar\">\n            Select code to explain \u00b7 Ctrl/Cmd+S to review \u00b7 idle for ghost text\n          </div>\n          <div id=\"editor\"></div>\n        </div>\n\n        <aside class=\"panel\">\n          <div class=\"panel-tabs\">\n            <button type=\"button\" class=\"panel-tab active\" data-tab=\"explain\">Explain</button>\n            <button type=\"button\" class=\"panel-tab\" data-tab=\"review\">Review</button>\n          </div>\n          <div class=\"error-banner\" id=\"errorBanner\"></div>\n          <div class=\"panel-body empty\" id=\"panelBody\">\n            Select code or click Explain to get a live breakdown.\n          </div>\n        </aside>\n      </div>\n\n      <footer class=\"status-bar\">\n        <span id=\"cursorPos\">Ln 1, Col 1</span>\n        <span id=\"langLabel\">typescript</span>\n        <span id=\"debounceLabel\">debounce 300ms</span>\n        <span>max ~800 tokens / req</span>\n        <span class=\"ml-auto\">CodeSense v1</span>\n      </footer>\n    </div>\n\n    <div class=\"settings-overlay\" id=\"settingsOverlay\">\n      <div class=\"settings-sheet\" role=\"dialog\" aria-label=\"Settings\">\n        <div style=\"display: flex; justify-content: space-between; align-items: center\">\n          <h2>Settings</h2>\n          <button type=\"button\" class=\"btn btn-ghost\" id=\"btnCloseSettings\">Close</button>\n        </div>\n\n        <div class=\"toggle-row\">\n          <span>Explain on selection</span>\n          <button type=\"button\" class=\"switch on\" id=\"swExplain\" aria-pressed=\"true\"></button>\n        </div>\n        <div class=\"toggle-row\">\n          <span>Review on save</span>\n          <button type=\"button\" class=\"switch on\" id=\"swReview\" aria-pressed=\"true\"></button>\n        </div>\n        <div class=\"toggle-row\">\n          <span>Suggest (ghost text)</span>\n          <button type=\"button\" class=\"switch on\" id=\"swSuggest\" aria-pressed=\"true\"></button>\n        </div>\n\n        <div class=\"settings-row\">\n          <label for=\"debounceRange\">Debounce delay</label>\n          <input id=\"debounceRange\" type=\"range\" min=\"100\" max=\"800\" step=\"50\" value=\"300\" />\n          <span class=\"value\" id=\"debounceValue\">300 ms</span>\n        </div>\n\n        <p class=\"hint\">\n          Set GEMINI_API_KEY (or ANTHROPIC / XAI / OPENAI) on the server for live models.\n          Without a key, CodeSense streams demo responses.\n        </p>\n      </div>\n    </div>\n\n    <script src=\"https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs/loader.js\"></script>\n    <script src=\"/app.js\"></script>\n  </body>\n</html>\n";
const STYLES_CSS = ":root {\n  --bg: #0b0c0e;\n  --bg-elevated: #12141a;\n  --bg-panel: #161920;\n  --bg-subtle: #1c1f28;\n  --fg: #e8eaed;\n  --fg-muted: #9aa0a6;\n  --fg-subtle: #6b7280;\n  --border: rgba(255, 255, 255, 0.08);\n  --border-strong: rgba(255, 255, 255, 0.14);\n  --accent: #7eb8c9;\n  --accent-dim: rgba(126, 184, 201, 0.15);\n  --accent-fg: #0b0c0e;\n  --success: #6fbf8a;\n  --warn: #d4a574;\n  --danger: #d47a7a;\n  --radius-sm: 6px;\n  --radius-md: 10px;\n  --font-sans: \"IBM Plex Sans\", system-ui, -apple-system, sans-serif;\n  --font-mono: \"IBM Plex Mono\", ui-monospace, SFMono-Regular, Menlo, monospace;\n  --ease: cubic-bezier(0.22, 1, 0.36, 1);\n}\n\n*,\n*::before,\n*::after {\n  box-sizing: border-box;\n}\n\nhtml,\nbody {\n  height: 100%;\n  margin: 0;\n}\n\nbody {\n  font-family: var(--font-sans);\n  background: var(--bg);\n  color: var(--fg);\n  -webkit-font-smoothing: antialiased;\n}\n\nbutton:not(:disabled) {\n  cursor: pointer;\n}\nbutton:disabled {\n  cursor: not-allowed;\n  opacity: 0.5;\n}\n\n::-webkit-scrollbar {\n  width: 8px;\n  height: 8px;\n}\n::-webkit-scrollbar-thumb {\n  background: var(--border-strong);\n  border-radius: 4px;\n}\n\n.app {\n  display: grid;\n  grid-template-rows: auto 1fr auto;\n  height: 100%;\n  min-height: 100dvh;\n}\n\n.header {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  padding: 10px 16px;\n  border-bottom: 1px solid var(--border);\n  background: var(--bg-elevated);\n  flex-wrap: wrap;\n}\n\n.brand {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  font-weight: 600;\n  font-size: 15px;\n  letter-spacing: -0.02em;\n  margin-right: 4px;\n}\n\n.brand-mark {\n  width: 22px;\n  height: 22px;\n  border-radius: 6px;\n  background: var(--accent-dim);\n  border: 1px solid color-mix(in oklab, var(--accent) 40%, transparent);\n  display: grid;\n  place-items: center;\n  color: var(--accent);\n  font-size: 12px;\n}\n\n.header-actions {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  flex: 1;\n  flex-wrap: wrap;\n}\n\n.mode-toggles {\n  display: flex;\n  gap: 4px;\n  background: var(--bg-subtle);\n  padding: 3px;\n  border-radius: var(--radius-md);\n  border: 1px solid var(--border);\n}\n\n.mode-btn {\n  appearance: none;\n  border: none;\n  background: transparent;\n  color: var(--fg-muted);\n  font-family: var(--font-sans);\n  font-size: 12px;\n  font-weight: 500;\n  padding: 6px 12px;\n  border-radius: var(--radius-sm);\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n  transition: background 150ms var(--ease), color 150ms var(--ease);\n}\n\n.mode-btn:hover {\n  color: var(--fg);\n}\n\n.mode-btn.active {\n  background: var(--bg-panel);\n  color: var(--fg);\n  box-shadow: 0 0 0 1px var(--border);\n}\n\n.mode-btn .dot {\n  width: 6px;\n  height: 6px;\n  border-radius: 50%;\n  background: var(--fg-subtle);\n}\n\n.mode-btn.active .dot {\n  background: var(--accent);\n}\n\n.select,\n.btn {\n  appearance: none;\n  font-family: var(--font-sans);\n  font-size: 12px;\n  font-weight: 500;\n  border-radius: var(--radius-sm);\n  border: 1px solid var(--border);\n  background: var(--bg-subtle);\n  color: var(--fg);\n  padding: 6px 10px;\n  transition: border-color 150ms var(--ease), background 150ms var(--ease);\n}\n\n.select:hover,\n.btn:hover:not(:disabled) {\n  border-color: var(--border-strong);\n  background: var(--bg-panel);\n}\n\n.btn-ghost {\n  background: transparent;\n}\n\n.spacer {\n  flex: 1;\n}\n\n.status-pill {\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n  font-size: 11px;\n  color: var(--fg-muted);\n  padding: 4px 10px;\n  border-radius: 999px;\n  border: 1px solid var(--border);\n  background: var(--bg);\n}\n\n.status-pill .pulse {\n  width: 6px;\n  height: 6px;\n  border-radius: 50%;\n  background: var(--success);\n}\n\n.status-pill.demo .pulse {\n  background: var(--warn);\n}\n\n.status-pill.busy .pulse {\n  background: var(--accent);\n  animation: pulse 1s ease-in-out infinite;\n}\n\n@keyframes pulse {\n  0%,\n  100% {\n    opacity: 1;\n  }\n  50% {\n    opacity: 0.35;\n  }\n}\n\n.main {\n  display: grid;\n  grid-template-columns: 1fr minmax(280px, 36%);\n  min-height: 0;\n  overflow: hidden;\n}\n\n@media (max-width: 900px) {\n  .main {\n    grid-template-columns: 1fr;\n    grid-template-rows: 1fr minmax(200px, 40%);\n  }\n}\n\n.editor-pane {\n  display: flex;\n  flex-direction: column;\n  min-height: 0;\n  border-right: 1px solid var(--border);\n}\n\n.editor-toolbar {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  padding: 6px 12px;\n  border-bottom: 1px solid var(--border);\n  background: var(--bg);\n  font-size: 11px;\n  color: var(--fg-muted);\n}\n\n#editor {\n  flex: 1;\n  min-height: 0;\n}\n\n.panel {\n  display: flex;\n  flex-direction: column;\n  min-height: 0;\n  background: var(--bg-panel);\n}\n\n.panel-tabs {\n  display: flex;\n  border-bottom: 1px solid var(--border);\n  background: var(--bg-elevated);\n}\n\n.panel-tab {\n  appearance: none;\n  border: none;\n  background: transparent;\n  color: var(--fg-muted);\n  font-family: var(--font-sans);\n  font-size: 12px;\n  font-weight: 500;\n  padding: 10px 16px;\n  border-bottom: 2px solid transparent;\n}\n\n.panel-tab:hover {\n  color: var(--fg);\n}\n\n.panel-tab.active {\n  color: var(--fg);\n  border-bottom-color: var(--accent);\n}\n\n.panel-body {\n  flex: 1;\n  overflow: auto;\n  padding: 16px;\n  font-size: 13px;\n  line-height: 1.55;\n  white-space: pre-wrap;\n  word-break: break-word;\n}\n\n.panel-body.empty {\n  color: var(--fg-subtle);\n}\n\n.panel-body.streaming::after {\n  content: \"\u258b\";\n  color: var(--accent);\n  animation: blink 0.8s step-end infinite;\n}\n\n@keyframes blink {\n  50% {\n    opacity: 0;\n  }\n}\n\n.panel-body .md-h {\n  font-weight: 600;\n  margin: 10px 0 4px;\n  font-size: 13px;\n}\n\n.panel-body .md-h:first-child {\n  margin-top: 0;\n}\n\n.panel-body .md-li {\n  padding-left: 12px;\n  margin: 3px 0;\n}\n\n.error-banner {\n  margin: 12px 16px 0;\n  padding: 10px 12px;\n  border-radius: var(--radius-md);\n  border: 1px solid color-mix(in oklab, var(--danger) 40%, transparent);\n  background: color-mix(in oklab, var(--danger) 12%, transparent);\n  color: var(--danger);\n  font-size: 12px;\n  display: none;\n}\n\n.error-banner.visible {\n  display: block;\n}\n\n.status-bar {\n  display: flex;\n  align-items: center;\n  gap: 16px;\n  padding: 4px 14px;\n  border-top: 1px solid var(--border);\n  background: var(--bg-elevated);\n  font-family: var(--font-mono);\n  font-size: 11px;\n  color: var(--fg-subtle);\n  flex-wrap: wrap;\n}\n\n.status-bar .ml-auto {\n  margin-left: auto;\n}\n\n.settings-overlay {\n  position: fixed;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.45);\n  z-index: 40;\n  display: none;\n  justify-content: flex-end;\n}\n\n.settings-overlay.open {\n  display: flex;\n}\n\n.settings-sheet {\n  width: min(360px, 100%);\n  height: 100%;\n  background: var(--bg-elevated);\n  border-left: 1px solid var(--border);\n  padding: 20px;\n  display: flex;\n  flex-direction: column;\n  gap: 14px;\n}\n\n.settings-sheet h2 {\n  margin: 0;\n  font-size: 15px;\n  font-weight: 600;\n}\n\n.settings-row {\n  display: flex;\n  flex-direction: column;\n  gap: 6px;\n}\n\n.settings-row label {\n  font-size: 12px;\n  color: var(--fg-muted);\n  font-weight: 500;\n}\n\n.settings-row input[type=\"range\"] {\n  width: 100%;\n  accent-color: var(--accent);\n}\n\n.settings-row .value {\n  font-family: var(--font-mono);\n  font-size: 11px;\n  color: var(--fg-subtle);\n}\n\n.toggle-row {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 12px;\n  padding: 10px 0;\n  border-bottom: 1px solid var(--border);\n  font-size: 13px;\n}\n\n.switch {\n  width: 36px;\n  height: 20px;\n  border-radius: 999px;\n  background: var(--bg-subtle);\n  border: 1px solid var(--border);\n  position: relative;\n}\n\n.switch.on {\n  background: var(--accent-dim);\n  border-color: color-mix(in oklab, var(--accent) 50%, transparent);\n}\n\n.switch::after {\n  content: \"\";\n  position: absolute;\n  top: 2px;\n  left: 2px;\n  width: 14px;\n  height: 14px;\n  border-radius: 50%;\n  background: var(--fg-muted);\n  transition: transform 150ms var(--ease), background 150ms var(--ease);\n}\n\n.switch.on::after {\n  transform: translateX(16px);\n  background: var(--accent);\n}\n\n.hint {\n  font-size: 12px;\n  color: var(--fg-subtle);\n  margin: 0;\n}\n\n@media (prefers-reduced-motion: reduce) {\n  *,\n  *::before,\n  *::after {\n    animation-duration: 0.01ms !important;\n    transition-duration: 0.01ms !important;\n  }\n}\n";
const APP_JS = "/* CodeSense client \u2014 Monaco + SSE gateway */\n\nconst SAMPLES = {\n  typescript: `/** Binary search over a sorted number array. */\nexport function binarySearch(arr: number[], target: number): number {\n  let lo = 0;\n  let hi = arr.length - 1;\n\n  while (lo <= hi) {\n    const mid = (lo + hi) >>> 1;\n    const value = arr[mid];\n\n    if (value === target) return mid;\n    if (value < target) lo = mid + 1;\n    else hi = mid - 1;\n  }\n\n  return -1;\n}\n\n// Select the function above, then hit Explain.\n// Press Ctrl/Cmd+S to Review. Pause typing for Suggest.\n`,\n  javascript: `function debounce(fn, wait) {\n  let timer = null;\n  return function (...args) {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn.apply(this, args), wait);\n  };\n}\n\nconst onResize = debounce(() => {\n  console.log(\"resized\", window.innerWidth);\n}, 200);\n\nwindow.addEventListener(\"resize\", onResize);\n`,\n  python: `from typing import Iterable, TypeVar\n\nT = TypeVar(\"T\")\n\ndef unique(items: Iterable[T]) -> list[T]:\n    \"\"\"Preserve order while dropping duplicates.\"\"\"\n    seen: set[T] = set()\n    out: list[T] = []\n    for item in items:\n        if item not in seen:\n            seen.add(item)\n            out.append(item)\n    return out\n\n\nif __name__ == \"__main__\":\n    print(unique([1, 2, 2, 3, 1, 4]))\n`,\n  go: `package main\n\nimport \"fmt\"\n\nfunc fibonacci(n int) int {\n\tif n < 2 {\n\t\treturn n\n\t}\n\ta, b := 0, 1\n\tfor i := 2; i <= n; i++ {\n\t\ta, b = b, a+b\n\t}\n\treturn b\n}\n\nfunc main() {\n\tfor i := 0; i < 10; i++ {\n\t\tfmt.Println(i, fibonacci(i))\n\t}\n}\n`,\n  rust: `fn merge_sorted(a: &[i32], b: &[i32]) -> Vec<i32> {\n    let mut out = Vec::with_capacity(a.len() + b.len());\n    let (mut i, mut j) = (0, 0);\n\n    while i < a.len() && j < b.len() {\n        if a[i] <= b[j] {\n            out.push(a[i]);\n            i += 1;\n        } else {\n            out.push(b[j]);\n            j += 1;\n        }\n    }\n    out.extend_from_slice(&a[i..]);\n    out.extend_from_slice(&b[j..]);\n    out\n}\n\nfn main() {\n    let result = merge_sorted(&[1, 3, 5], &[2, 4, 6]);\n    println!(\"{:?}\", result);\n}\n`,\n  java: `import java.util.ArrayList;\nimport java.util.List;\n\npublic class Pipeline {\n    public static <T> List<T> filter(List<T> input, Predicate<T> pred) {\n        List<T> out = new ArrayList<>();\n        for (T item : input) {\n            if (pred.test(item)) {\n                out.add(item);\n            }\n        }\n        return out;\n    }\n\n    @FunctionalInterface\n    interface Predicate<T> {\n        boolean test(T value);\n    }\n}\n`,\n};\n\nconst state = {\n  language: \"typescript\",\n  explainEnabled: true,\n  reviewEnabled: true,\n  suggestEnabled: true,\n  debounceMs: 300,\n  tab: \"explain\",\n  explainText: \"\",\n  reviewText: \"\",\n  streaming: false,\n  error: null,\n  provider: \"\u2026\",\n  cursor: { line: 1, col: 1 },\n  editor: null,\n  monaco: null,\n  abort: null,\n  suggestDisposable: null,\n};\n\nfunction loadSettings() {\n  try {\n    const raw = localStorage.getItem(\"codesense-settings\");\n    if (!raw) return;\n    const s = JSON.parse(raw);\n    Object.assign(state, {\n      explainEnabled: s.explainEnabled ?? true,\n      reviewEnabled: s.reviewEnabled ?? true,\n      suggestEnabled: s.suggestEnabled ?? true,\n      debounceMs: s.debounceMs ?? 300,\n      language: s.language ?? \"typescript\",\n    });\n  } catch (_) {}\n}\n\nfunction saveSettings() {\n  localStorage.setItem(\n    \"codesense-settings\",\n    JSON.stringify({\n      explainEnabled: state.explainEnabled,\n      reviewEnabled: state.reviewEnabled,\n      suggestEnabled: state.suggestEnabled,\n      debounceMs: state.debounceMs,\n      language: state.language,\n    }),\n  );\n}\n\nfunction extractSnippet(fullText, cursorLine, before = 30, after = 10) {\n  const lines = fullText.split(\"\\n\");\n  const start = Math.max(0, cursorLine - before);\n  const end = Math.min(lines.length, cursorLine + after);\n  return lines.slice(start, end).join(\"\\n\");\n}\n\nfunction simpleMarkdown(text) {\n  return text\n    .replace(/&/g, \"&amp;\")\n    .replace(/</g, \"&lt;\")\n    .replace(/>/g, \"&gt;\")\n    .replace(/\\*\\*(.+?)\\*\\*/g, \"<strong>$1</strong>\")\n    .replace(/^### (.+)$/gm, '<div class=\"md-h\">$1</div>')\n    .replace(/^## (.+)$/gm, '<div class=\"md-h\">$1</div>')\n    .replace(/^# (.+)$/gm, '<div class=\"md-h\">$1</div>')\n    .replace(/^- (.+)$/gm, '<div class=\"md-li\">\u2022 $1</div>');\n}\n\nasync function streamCodesense(req, handlers, signal) {\n  let res;\n  try {\n    res = await fetch(\"/api/codesense\", {\n      method: \"POST\",\n      headers: { \"Content-Type\": \"application/json\" },\n      body: JSON.stringify(req),\n      signal,\n    });\n  } catch (err) {\n    if (err.name === \"AbortError\") return;\n    handlers.onError(err.message || \"Network error\");\n    return;\n  }\n\n  if (!res.ok) {\n    try {\n      const body = await res.json();\n      handlers.onError(body.message || \"HTTP \" + res.status, body.retryAfter);\n    } catch (_) {\n      handlers.onError(\"HTTP \" + res.status);\n    }\n    return;\n  }\n\n  const reader = res.body.getReader();\n  const decoder = new TextDecoder();\n  let buffer = \"\";\n\n  while (true) {\n    const { done, value } = await reader.read();\n    if (done) break;\n    buffer += decoder.decode(value, { stream: true });\n    const lines = buffer.split(\"\\n\");\n    buffer = lines.pop() ?? \"\";\n    for (const line of lines) {\n      const t = line.trim();\n      if (!t.startsWith(\"data:\")) continue;\n      const payload = t.slice(5).trim();\n      if (payload === \"[DONE]\") {\n        handlers.onDone();\n        return;\n      }\n      try {\n        const json = JSON.parse(payload);\n        if (json.error) {\n          handlers.onError(json.message || json.error, json.retryAfter);\n          return;\n        }\n        if (json.delta) handlers.onDelta(json.delta);\n      } catch (_) {}\n    }\n  }\n  handlers.onDone();\n}\n\nfunction setBusy(label) {\n  const pill = document.getElementById(\"statusPill\");\n  const text = document.getElementById(\"statusText\");\n  if (label) {\n    pill.classList.add(\"busy\");\n    text.textContent = label + \"\u2026\";\n  } else {\n    pill.classList.remove(\"busy\");\n    const isDemo = state.provider === \"demo\" || state.provider === \"offline\";\n    pill.classList.toggle(\"demo\", isDemo);\n    text.textContent = state.provider;\n  }\n}\n\nfunction renderPanel() {\n  const body = document.getElementById(\"panelBody\");\n  const err = document.getElementById(\"errorBanner\");\n  const text = state.tab === \"explain\" ? state.explainText : state.reviewText;\n\n  err.classList.toggle(\"visible\", !!state.error);\n  err.textContent = state.error || \"\";\n\n  body.classList.toggle(\"streaming\", state.streaming && !!text);\n  body.classList.toggle(\"empty\", !text && !state.streaming);\n\n  if (!text && !state.streaming) {\n    body.textContent =\n      state.tab === \"explain\"\n        ? \"Select code or click Explain to get a live breakdown.\"\n        : \"Press Ctrl/Cmd+S or click Review after editing.\";\n  } else {\n    body.innerHTML = simpleMarkdown(text);\n  }\n}\n\nfunction setTab(tab) {\n  state.tab = tab;\n  document.querySelectorAll(\".panel-tab\").forEach((el) => {\n    el.classList.toggle(\"active\", el.dataset.tab === tab);\n  });\n  renderPanel();\n}\n\nasync function runStream(mode, snippet, line, col) {\n  if (state.abort) state.abort.abort();\n  const ac = new AbortController();\n  state.abort = ac;\n  state.error = null;\n  state.streaming = true;\n  setTab(mode);\n  if (mode === \"explain\") state.explainText = \"\";\n  else state.reviewText = \"\";\n  setBusy(mode);\n  renderPanel();\n\n  await streamCodesense(\n    {\n      mode,\n      language: state.language,\n      snippet,\n      cursorLine: line,\n      cursorCol: col,\n    },\n    {\n      onDelta: (d) => {\n        if (mode === \"explain\") state.explainText += d;\n        else state.reviewText += d;\n        renderPanel();\n      },\n      onDone: () => {\n        state.streaming = false;\n        setBusy(null);\n        renderPanel();\n      },\n      onError: (msg) => {\n        state.error = msg;\n        state.streaming = false;\n        setBusy(null);\n        renderPanel();\n      },\n    },\n    ac.signal,\n  );\n}\n\nfunction debounce(fn, ms) {\n  let t;\n  return function (...args) {\n    clearTimeout(t);\n    t = setTimeout(() => fn(...args), ms);\n  };\n}\n\nlet debouncedExplain = null;\nfunction refreshDebounce() {\n  debouncedExplain = debounce((snippet) => {\n    if (!state.explainEnabled) return;\n    runStream(\"explain\", snippet, state.cursor.line, state.cursor.col);\n  }, state.debounceMs);\n}\n\nfunction updateCursorStatus() {\n  document.getElementById(\"cursorPos\").textContent =\n    \"Ln \" + state.cursor.line + \", Col \" + state.cursor.col;\n  document.getElementById(\"langLabel\").textContent = state.language;\n  document.getElementById(\"debounceLabel\").textContent =\n    \"debounce \" + state.debounceMs + \"ms\";\n}\n\nfunction registerSuggestProvider() {\n  if (!state.monaco || !state.editor) return;\n  if (state.suggestDisposable) {\n    state.suggestDisposable.dispose();\n    state.suggestDisposable = null;\n  }\n\n  state.suggestDisposable =\n    state.monaco.languages.registerInlineCompletionsProvider(state.language, {\n      freeInlineCompletions: function () {},\n      provideInlineCompletions: async function (model, position, _ctx, token) {\n        if (!state.suggestEnabled) return { items: [] };\n        await new Promise((r) => setTimeout(r, state.debounceMs));\n        if (token.isCancellationRequested) return { items: [] };\n\n        const full = model.getValue();\n        const snippet = extractSnippet(full, position.lineNumber);\n        let completion = \"\";\n\n        await new Promise((resolve) => {\n          const ac = new AbortController();\n          streamCodesense(\n            {\n              mode: \"suggest\",\n              language: state.language,\n              snippet,\n              cursorLine: position.lineNumber,\n              cursorCol: position.column,\n            },\n            {\n              onDelta: (d) => {\n                completion += d;\n              },\n              onDone: resolve,\n              onError: () => resolve(),\n            },\n            ac.signal,\n          ).finally(resolve);\n        });\n\n        if (token.isCancellationRequested || !completion.trim()) {\n          return { items: [] };\n        }\n\n        return {\n          items: [\n            {\n              insertText: completion,\n              range: new state.monaco.Range(\n                position.lineNumber,\n                position.column,\n                position.lineNumber,\n                position.column,\n              ),\n            },\n          ],\n        };\n      },\n    });\n}\n\nfunction initEditor() {\n  require.config({\n    paths: {\n      vs: \"https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs\",\n    },\n  });\n\n  require([\"vs/editor/editor.main\"], function () {\n    state.monaco = window.monaco;\n    const ed = monaco.editor.create(document.getElementById(\"editor\"), {\n      value: SAMPLES[state.language] || \"\",\n      language: state.language,\n      theme: \"vs-dark\",\n      fontFamily: \"IBM Plex Mono, ui-monospace, Menlo, monospace\",\n      fontSize: 13,\n      lineHeight: 20,\n      minimap: { enabled: false },\n      scrollBeyondLastLine: false,\n      automaticLayout: true,\n      tabSize: 2,\n      padding: { top: 12 },\n      renderLineHighlight: \"line\",\n      cursorBlinking: \"smooth\",\n      smoothScrolling: true,\n      inlineSuggest: { enabled: true },\n    });\n    state.editor = ed;\n\n    ed.onDidChangeCursorPosition(function (e) {\n      state.cursor = {\n        line: e.position.lineNumber,\n        col: e.position.column,\n      };\n      updateCursorStatus();\n    });\n\n    ed.onDidChangeCursorSelection(function (e) {\n      const model = ed.getModel();\n      if (!model || e.selection.isEmpty()) return;\n      const text = model.getValueInRange(e.selection);\n      if (text.trim().length > 8 && state.explainEnabled) {\n        debouncedExplain(text);\n      }\n    });\n\n    ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, function () {\n      if (!state.reviewEnabled) return;\n      const model = ed.getModel();\n      const snippet = extractSnippet(\n        model.getValue(),\n        ed.getPosition().lineNumber,\n      );\n      runStream(\n        \"review\",\n        snippet || model.getValue(),\n        state.cursor.line,\n        state.cursor.col,\n      );\n    });\n\n    registerSuggestProvider();\n    updateCursorStatus();\n  });\n}\n\nfunction wireUi() {\n  document.querySelectorAll(\".mode-btn\").forEach(function (btn) {\n    btn.classList.toggle(\"active\", state[btn.dataset.mode + \"Enabled\"]);\n    btn.addEventListener(\"click\", function () {\n      const key = btn.dataset.mode + \"Enabled\";\n      state[key] = !state[key];\n      btn.classList.toggle(\"active\", state[key]);\n      saveSettings();\n      if (btn.dataset.mode === \"suggest\") registerSuggestProvider();\n    });\n  });\n\n  document.querySelectorAll(\".panel-tab\").forEach(function (tab) {\n    tab.addEventListener(\"click\", function () {\n      setTab(tab.dataset.tab);\n    });\n  });\n\n  const langSelect = document.getElementById(\"language\");\n  langSelect.value = state.language;\n  langSelect.addEventListener(\"change\", function () {\n    state.language = langSelect.value;\n    saveSettings();\n    if (state.editor && state.monaco) {\n      const model = state.editor.getModel();\n      state.monaco.editor.setModelLanguage(model, state.language);\n      model.setValue(SAMPLES[state.language] || \"\");\n      state.explainText = \"\";\n      state.reviewText = \"\";\n      state.error = null;\n      registerSuggestProvider();\n      renderPanel();\n      updateCursorStatus();\n    }\n  });\n\n  document.getElementById(\"btnExplain\").addEventListener(\"click\", function () {\n    if (!state.editor) return;\n    const model = state.editor.getModel();\n    const snippet = extractSnippet(model.getValue(), state.cursor.line);\n    runStream(\n      \"explain\",\n      snippet || model.getValue(),\n      state.cursor.line,\n      state.cursor.col,\n    );\n  });\n\n  document.getElementById(\"btnReview\").addEventListener(\"click\", function () {\n    if (!state.editor) return;\n    runStream(\n      \"review\",\n      state.editor.getValue(),\n      state.cursor.line,\n      state.cursor.col,\n    );\n  });\n\n  document.getElementById(\"btnSample\").addEventListener(\"click\", function () {\n    if (!state.editor) return;\n    state.editor.setValue(SAMPLES[state.language] || \"\");\n    state.explainText = \"\";\n    state.reviewText = \"\";\n    state.error = null;\n    renderPanel();\n  });\n\n  document.getElementById(\"btnSettings\").addEventListener(\"click\", function () {\n    document.getElementById(\"settingsOverlay\").classList.add(\"open\");\n    document.getElementById(\"debounceRange\").value = state.debounceMs;\n    document.getElementById(\"debounceValue\").textContent =\n      state.debounceMs + \" ms\";\n    document\n      .getElementById(\"swExplain\")\n      .classList.toggle(\"on\", state.explainEnabled);\n    document\n      .getElementById(\"swReview\")\n      .classList.toggle(\"on\", state.reviewEnabled);\n    document\n      .getElementById(\"swSuggest\")\n      .classList.toggle(\"on\", state.suggestEnabled);\n  });\n\n  document\n    .getElementById(\"btnCloseSettings\")\n    .addEventListener(\"click\", function () {\n      document.getElementById(\"settingsOverlay\").classList.remove(\"open\");\n    });\n\n  document\n    .getElementById(\"settingsOverlay\")\n    .addEventListener(\"click\", function (e) {\n      if (e.target.id === \"settingsOverlay\") {\n        e.currentTarget.classList.remove(\"open\");\n      }\n    });\n\n  document\n    .getElementById(\"debounceRange\")\n    .addEventListener(\"input\", function (e) {\n      state.debounceMs = Number(e.target.value);\n      document.getElementById(\"debounceValue\").textContent =\n        state.debounceMs + \" ms\";\n      saveSettings();\n      refreshDebounce();\n      updateCursorStatus();\n    });\n\n  [\"Explain\", \"Review\", \"Suggest\"].forEach(function (name) {\n    document.getElementById(\"sw\" + name).addEventListener(\"click\", function () {\n      const key = name.toLowerCase() + \"Enabled\";\n      state[key] = !state[key];\n      document.getElementById(\"sw\" + name).classList.toggle(\"on\", state[key]);\n      document\n        .querySelector('.mode-btn[data-mode=\"' + name.toLowerCase() + '\"]')\n        .classList.toggle(\"active\", state[key]);\n      saveSettings();\n      if (name === \"Suggest\") registerSuggestProvider();\n    });\n  });\n}\n\nasync function initHealth() {\n  try {\n    const res = await fetch(\"/api/health\");\n    const data = await res.json();\n    state.provider = data.provider || \"demo\";\n  } catch (_) {\n    state.provider = \"offline\";\n  }\n  setBusy(null);\n}\n\nloadSettings();\nrefreshDebounce();\nwireUi();\ninitHealth();\nrenderPanel();\ninitEditor();\n";

function buildMessages(ctx) {
  const system =
    "You are CodeSense, a precise and concise code assistant embedded inside a developer's editor.\n" +
    "You receive raw code snippets. You never hallucinate APIs or fabricate behavior.\n" +
    "You respond in plain, clear language — no unnecessary preamble.\n" +
    "Detected language: " + ctx.language + "\nMode: " + ctx.mode;
  let user;
  if (ctx.mode === "explain") {
    user =
      "The developer selected or is actively editing the following snippet.\n" +
      "Explain what it does in 2-4 sentences. Focus on intent, not syntax.\nSnippet:\n" +
      ctx.snippet;
  } else if (ctx.mode === "review") {
    user =
      "The developer just saved this file. Perform a concise code review.\n" +
      "Structure your response as:\n- What's good (1-2 points)\n- What to improve (1-3 actionable points)\n" +
      "- One optional refactor suggestion\nKeep under 200 words.\nFile:\n" +
      ctx.snippet;
  } else if (ctx.mode === "suggest") {
    user =
      "Complete the following code. Return ONLY the completion — no explanation, no markdown fences.\n" +
      "Context:\n" + ctx.snippet + "\nCursor: line " + (ctx.cursorLine || 1) + ", col " + (ctx.cursorCol || 1);
  } else {
    user = ctx.snippet;
  }
  return { system: system, user: user };
}

function estimateTokens(text) {
  return Math.ceil(String(text).length / 4);
}
const MAX_INPUT_TOKENS = 800;
const MAX_OUTPUT_TOKENS = { explain: 400, suggest: 400, review: 600 };

const buckets = new Map();
const CAPACITY = 30;
const REFILL_PER_MS = 30 / 60000;
function checkRateLimit(key) {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket) {
    buckets.set(key, { tokens: CAPACITY - 1, lastRefill: now });
    return { allowed: true, retryAfterMs: 0 };
  }
  const elapsed = now - bucket.lastRefill;
  bucket.tokens = Math.min(CAPACITY, bucket.tokens + elapsed * REFILL_PER_MS);
  bucket.lastRefill = now;
  if (bucket.tokens < 1) {
    return { allowed: false, retryAfterMs: Math.ceil((1 - bucket.tokens) / REFILL_PER_MS) };
  }
  bucket.tokens -= 1;
  return { allowed: true, retryAfterMs: 0 };
}

function demoResponse(ctx) {
  const lines = ctx.snippet.split("\n").filter(function (l) { return l.trim(); });
  const preview = lines.slice(0, 3).join(" ").slice(0, 80);
  if (ctx.mode === "explain") {
    return "This " + ctx.language + " snippet defines logic around: " + (preview || "the selected code") +
      ". It processes data step by step, with control flow driven by the surrounding conditions and return paths. " +
      "The intent is to transform or validate input and produce a deterministic result for the caller.";
  }
  if (ctx.mode === "review") {
    return "**What's good**\n- Clear structure and readable naming in the " + ctx.language +
      " code\n- Focused snippet size makes the control flow easy to follow\n\n**What to improve**\n" +
      "- Consider edge cases (empty input, nulls) explicitly\n- Extract repeated patterns into small helpers if this grows\n" +
      "- Add a brief comment only where the intent is non-obvious\n\n**Refactor idea**\n" +
      "- Pull the core branch into a pure function so it is easier to unit-test in isolation.";
  }
  if (ctx.mode === "suggest") {
    const last = lines[lines.length - 1] || "";
    if (/function\s+\w+\s*\([^)]*\)\s*\{\s*$/.test(last.trim()) || last.trim().endsWith("{")) {
      return "\n  // TODO: implement\n  return null;\n}";
    }
    if (/^\s*(const|let|var)\s+\w+\s*=\s*$/.test(last)) return " null;";
    if (ctx.language === "python") return "\n    pass";
    return "\n  // completed by CodeSense\n";
  }
  return "";
}

function streamText(text, delayMs, onChunk) {
  delayMs = delayMs || 14;
  const parts = text.split(/(?<=\s)/);
  let i = 0;
  return new Promise(function (resolve) {
    function next() {
      if (i >= parts.length) {
        onChunk({ done: true });
        resolve();
        return;
      }
      onChunk({ delta: parts[i++] });
      setTimeout(next, delayMs);
    }
    next();
  });
}

async function streamOpenAICompatible(baseUrl, apiKey, model, ctx, onChunk) {
  const msgs = buildMessages(ctx);
  const res = await fetch(baseUrl + "/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
    body: JSON.stringify({
      model: model,
      stream: true,
      max_tokens: MAX_OUTPUT_TOKENS[ctx.mode] || 400,
      messages: [
        { role: "system", content: msgs.system },
        { role: "user", content: msgs.user },
      ],
    }),
  });
  if (!res.ok || !res.body) {
    const msg = await res.text().catch(function () { return res.statusText; });
    onChunk({ error: "Provider error " + res.status + ": " + String(msg).slice(0, 200) });
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const result = await reader.read();
    if (result.done) break;
    buffer += decoder.decode(result.value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (let li = 0; li < lines.length; li++) {
      const trimmed = lines[li].trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") {
        onChunk({ done: true });
        return;
      }
      try {
        const json = JSON.parse(payload);
        const delta = json.choices && json.choices[0] && json.choices[0].delta && json.choices[0].delta.content;
        if (delta) onChunk({ delta: delta });
      } catch (e) {}
    }
  }
  onChunk({ done: true });
}

async function streamAnthropic(apiKey, model, ctx, onChunk) {
  const msgs = buildMessages(ctx);
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: model,
      max_tokens: MAX_OUTPUT_TOKENS[ctx.mode] || 400,
      stream: true,
      system: msgs.system,
      messages: [{ role: "user", content: msgs.user }],
    }),
  });
  if (!res.ok || !res.body) {
    const msg = await res.text().catch(function () { return res.statusText; });
    onChunk({ error: "Anthropic error " + res.status + ": " + String(msg).slice(0, 200) });
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const result = await reader.read();
    if (result.done) break;
    buffer += decoder.decode(result.value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (let li = 0; li < lines.length; li++) {
      const trimmed = lines[li].trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      try {
        const json = JSON.parse(payload);
        if (json.type === "content_block_delta" && json.delta && json.delta.text) {
          onChunk({ delta: json.delta.text });
        }
        if (json.type === "message_stop") {
          onChunk({ done: true });
          return;
        }
      } catch (e) {}
    }
  }
  onChunk({ done: true });
}


async function streamGemini(apiKey, model, ctx, onChunk) {
  const msgs = buildMessages(ctx);
  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    encodeURIComponent(model) +
    ":streamGenerateContent?alt=sse";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: msgs.system }] },
      contents: [{ role: "user", parts: [{ text: msgs.user }] }],
      generationConfig: {
        maxOutputTokens: MAX_OUTPUT_TOKENS[ctx.mode] || 400,
        temperature: 0.3,
      },
    }),
  });
  if (!res.ok || !res.body) {
    const msg = await res.text().catch(function () { return res.statusText; });
    onChunk({ error: "Gemini error " + res.status + ": " + String(msg).slice(0, 200) });
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const result = await reader.read();
    if (result.done) break;
    buffer += decoder.decode(result.value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (let li = 0; li < lines.length; li++) {
      const trimmed = lines[li].trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const json = JSON.parse(payload);
        const parts =
          json.candidates &&
          json.candidates[0] &&
          json.candidates[0].content &&
          json.candidates[0].content.parts;
        if (parts) {
          for (let pi = 0; pi < parts.length; pi++) {
            if (parts[pi].text) onChunk({ delta: parts[pi].text });
          }
        }
      } catch (e) {}
    }
  }
  onChunk({ done: true });
}

async function streamLLM(ctx, onChunk) {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const xaiKey = process.env.XAI_API_KEY;

  // Prefer Gemini when its key is set
  if (geminiKey) {
    try {
      await streamGemini(
        geminiKey,
        process.env.GEMINI_MODEL || "gemini-3.6-flash",
        ctx,
        onChunk
      );
      return;
    } catch (err) {
      onChunk({ error: err && err.message ? err.message : "Gemini failure" });
      return;
    }
  }

  if (anthropicKey) {
    try {
      await streamAnthropic(anthropicKey, process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-latest", ctx, onChunk);
      return;
    } catch (err) {
      if (openaiKey) {
        await streamOpenAICompatible("https://api.openai.com/v1", openaiKey, process.env.OPENAI_MODEL || "gpt-4o-mini", ctx, onChunk);
        return;
      }
      onChunk({ error: err && err.message ? err.message : "Provider failure" });
      return;
    }
  }
  if (xaiKey) {
    await streamOpenAICompatible("https://api.x.ai/v1", xaiKey, process.env.XAI_MODEL || "grok-3-mini", ctx, onChunk);
    return;
  }
  if (openaiKey) {
    await streamOpenAICompatible("https://api.openai.com/v1", openaiKey, process.env.OPENAI_MODEL || "gpt-4o-mini", ctx, onChunk);
    return;
  }
  await streamText(demoResponse(ctx), 14, onChunk);
}

function getActiveProvider() {
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.XAI_API_KEY) return "xai";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "demo";
}

function sendJson(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) });
  res.end(data);
}

function readBody(req) {
  return new Promise(function (resolve, reject) {
    const chunks = [];
    let size = 0;
    req.on("data", function (c) {
      size += c.length;
      if (size > 256 * 1024) {
        reject(new Error("Body too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", function () { resolve(Buffer.concat(chunks).toString("utf8")); });
    req.on("error", reject);
  });
}

async function handleCodesense(req, res) {
  const clientKey =
    ((req.headers["x-forwarded-for"] || "") + "").split(",")[0].trim() ||
    (req.socket && req.socket.remoteAddress) ||
    "anon";
  const rate = checkRateLimit(clientKey);
  if (!rate.allowed) {
    sendJson(res, 429, { error: "RATE_LIMITED", message: "Too many requests.", retryAfter: rate.retryAfterMs });
    return;
  }
  let body;
  try {
    body = JSON.parse(await readBody(req));
  } catch (e) {
    sendJson(res, 400, { error: "INVALID_JSON", message: "Invalid JSON body" });
    return;
  }
  const mode = body.mode;
  const language = (body.language || "plaintext").toLowerCase();
  let snippet = typeof body.snippet === "string" ? body.snippet : "";
  if (["explain", "review", "suggest"].indexOf(mode) === -1) {
    sendJson(res, 400, { error: "INVALID_MODE", message: 'mode must be "explain" | "review" | "suggest"' });
    return;
  }
  if (!snippet.trim()) {
    sendJson(res, 400, { error: "EMPTY_SNIPPET", message: "snippet is required" });
    return;
  }
  if (estimateTokens(snippet) > MAX_INPUT_TOKENS) {
    snippet = snippet.slice(-(MAX_INPUT_TOKENS * 4));
  }
  const ctx = { mode: mode, language: language, snippet: snippet, cursorLine: body.cursorLine, cursorCol: body.cursorCol };
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });
  try {
    await streamLLM(ctx, function (chunk) {
      if (res.writableEnded) return;
      if (chunk.error) {
        res.write("data: " + JSON.stringify({ error: "PROVIDER_TIMEOUT", message: chunk.error }) + "\n\n");
        return;
      }
      if (chunk.done) {
        res.write("data: [DONE]\n\n");
        return;
      }
      if (chunk.delta) {
        res.write("data: " + JSON.stringify({ delta: chunk.delta }) + "\n\n");
      }
    });
  } catch (err) {
    const message = err && err.message ? err.message : "Stream failed";
    res.write("data: " + JSON.stringify({ error: "PROVIDER_TIMEOUT", message: message }) + "\n\n");
  }
  res.end();
}

const server = http.createServer(function (req, res) {
  const url = (req.url || "/").split("?")[0];
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }
  if (req.method === "GET" && url === "/api/health") {
    sendJson(res, 200, { ok: true, provider: getActiveProvider(), maxInputTokens: MAX_INPUT_TOKENS });
    return;
  }
  if (req.method === "POST" && url === "/api/codesense") {
    handleCodesense(req, res);
    return;
  }
  if (req.method === "GET") {
    if (url === "/" || url === "/index.html") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(INDEX_HTML);
      return;
    }
    if (url === "/styles.css") {
      res.writeHead(200, { "Content-Type": "text/css; charset=utf-8" });
      res.end(STYLES_CSS);
      return;
    }
    if (url === "/app.js") {
      res.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" });
      res.end(APP_JS);
      return;
    }
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  res.writeHead(405);
  res.end("Method Not Allowed");
});

server.listen(PORT, "0.0.0.0", function () {
  console.log("[codesense] http://localhost:" + PORT + "  provider=" + getActiveProvider());
  console.log("[codesense] Open that URL in your browser. Press Ctrl+C to stop.");
});
