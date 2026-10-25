import { buildMessages } from "./prompts";
import { budgetText, estimateTokens, insertCursorMarker } from "./snippet";
import {
  MAX_INPUT_TOKENS,
  MAX_OUTPUT_TOKENS,
  type CodesenseRequest,
  type GatewayError,
  type Mode,
} from "./types";

const MODEL = "grok-4.5";

export const PROVIDER_LABELS: Record<string, string> = {
  gemini: "Google Gemini",
  anthropic: "Anthropic Claude",
  xai: "xAI Grok",
  openai: "OpenAI",
  demo: "Demo",
};

export function detectProvider(key: string, requested?: string): string {
  const wanted = String(requested || "auto").toLowerCase();
  if (wanted === "gemini" || wanted === "google") return "gemini";
  if (wanted === "anthropic" || wanted === "claude") return "anthropic";
  if (wanted === "xai" || wanted === "grok") return "xai";
  if (wanted === "openai" || wanted === "openai-compatible") return "openai";
  if (key.startsWith("sk-ant-")) return "anthropic";
  if (key.startsWith("xai-")) return "xai";
  if (key.startsWith("AIza") || key.startsWith("AQ-") || key.startsWith("AQ.")) return "gemini";
  return "openai";
}

export function readKeyOverride(
  req: Request,
): { key: string; provider: string } | null {
  const key = String(
    req.headers.get("x-codesense-key") || req.headers.get("x-api-key") || ""
  ).trim();
  if (!key || key.length > 300) return null;
  const provider = detectProvider(key, req.headers.get("x-codesense-provider") ?? undefined);
  return { key, provider };
}

export function demoResponse(ctx: {
  mode: string;
  language: string;
  snippet: string;
}): string {
  const lines = ctx.snippet.split("\n").filter((l) => l.trim());
  const preview = lines.slice(0, 3).join(" ").slice(0, 80);
  if (ctx.mode === "explain") {
    return (
      "This " +
      ctx.language +
      " snippet defines logic around: " +
      (preview || "the selected code") +
      ". It processes data step by step, with control flow driven by the surrounding conditions and return paths. " +
      "The intent is to transform or validate input and produce a deterministic result for the caller."
    );
  }
  if (ctx.mode === "review") {
    return JSON.stringify({
      summary: "Clear logic with structured control flow in " + ctx.language + ".",
      walkthrough: "The code parses or validates incoming parameters, evaluates conditions, and returns the computed result.",
      risks: [
        {
          line: 1,
          severity: "low",
          msg: "Consider handling edge cases (e.g. empty inputs or unexpected types) explicitly.",
        },
      ],
      refactor: {
        diff: "",
        description: "No immediate refactoring necessary.",
      },
    });
  }
  if (ctx.mode === "suggest") {
    return "// Suggested completion\nreturn result;";
  }
  if (ctx.mode === "test") {
    const isPython = ctx.language === "python";
    return JSON.stringify({
      framework: isPython ? "pytest" : "jest",
      description:
        "Unit tests covering the happy path and edge cases for the snippet.",
      code: isPython
        ? "import unittest\n\nclass TestSnippet(unittest.TestCase):\n    def test_happy_path(self):\n        self.assertTrue(True)\n\nif __name__ == '__main__':\n    unittest.main()\n"
        : "// Tests for the snippet (demo mode)\nimport { describe, it, expect } from 'vitest';\n\ndescribe('snippet', () => {\n  it('behaves as expected', () => {\n    expect(true).toBe(true);\n  });\n});\n",
      testCases: [
        { name: "happy path", description: "Verifies expected behavior with valid input." },
        { name: "edge case", description: "Verifies behavior with empty or null input." },
      ],
    });
  }
  return "";
}

function jsonError(err: GatewayError, status: number, retryAfter?: number) {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (retryAfter) headers.set("Retry-After", String(Math.ceil(retryAfter / 1000)));
  return new Response(JSON.stringify(err), { status, headers });
}

function sseHeaders(remaining: number): Headers {
  return new Headers({
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
    "X-RateLimit-Remaining": String(remaining),
  });
}

export function aiAvailable(): boolean {
  return Boolean(
    process.env.XAI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.OPENAI_API_KEY
  );
}

export function healthResponse(req?: Request): Response {
  if (req) {
    const keyOverride = readKeyOverride(req);
    if (keyOverride) {
      return Response.json({
        available: true,
        model: PROVIDER_LABELS[keyOverride.provider] || keyOverride.provider,
        provider: keyOverride.provider,
      });
    }
  }

  const serverKey =
    process.env.XAI_API_KEY ? "xai" :
    (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) ? "gemini" :
    process.env.ANTHROPIC_API_KEY ? "anthropic" :
    process.env.OPENAI_API_KEY ? "openai" : "demo";

  return Response.json({
    available: true,
    model: serverKey === "demo" ? "Demo" : (PROVIDER_LABELS[serverKey] || MODEL),
    provider: serverKey,
  });
}

function createDemoStream(
  text: string,
  signal: AbortSignal,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      const emit = (payload: string) => {
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
      };
      const words = text.split(/(\s+)/);
      for (const word of words) {
        if (signal.aborted) break;
        emit(JSON.stringify({ delta: word }));
        await new Promise((r) => setTimeout(r, 20));
      }
      emit("[DONE]");
      controller.close();
    },
  });
}

export async function handleCodesense(
  request: Request,
  remaining: number,
): Promise<Response> {
  let body: CodesenseRequest;
  try {
    body = (await request.json()) as CodesenseRequest;
  } catch {
    return jsonError(
      { error: "BAD_REQUEST", message: "Request body must be JSON." },
      400,
    );
  }

  if (
    body.mode !== "explain" &&
    body.mode !== "review" &&
    body.mode !== "suggest" &&
    body.mode !== "test"
  ) {
    return jsonError(
      { error: "INVALID_MODE", message: "Unknown mode." },
      400,
    );
  }

  const language = String(body.language ?? "plaintext").slice(0, 40);
  const rawSnippet = String(body.snippet ?? "");
  const cursorLine = Number(body.cursorLine) || 1;
  const cursorCol = Number(body.cursorCol) || 1;

  if (!rawSnippet.trim()) {
    return jsonError(
      { error: "EMPTY_SNIPPET", message: "Snippet is empty." },
      400,
    );
  }

  if (estimateTokens(rawSnippet) > MAX_INPUT_TOKENS * 8) {
    return jsonError(
      {
        error: "TOKEN_LIMIT_EXCEEDED",
        message: "Snippet is too large to send.",
      },
      413,
    );
  }

  let snippet = budgetText(rawSnippet);
  if (body.mode === "suggest") {
    snippet = insertCursorMarker(snippet, cursorLine, cursorCol, 1);
    snippet = budgetText(snippet);
  }

  const keyOverride = readKeyOverride(request);
  const apiKey =
    keyOverride?.key ??
    process.env.XAI_API_KEY ??
    process.env.GEMINI_API_KEY ??
    process.env.GOOGLE_API_KEY ??
    process.env.ANTHROPIC_API_KEY ??
    process.env.OPENAI_API_KEY;

  const provider = keyOverride
    ? keyOverride.provider
    : process.env.XAI_API_KEY
      ? "xai"
      : process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
        ? "gemini"
        : process.env.ANTHROPIC_API_KEY
          ? "anthropic"
          : process.env.OPENAI_API_KEY
            ? "openai"
            : "demo";

  // If no API key configured, stream demo response
  if (!apiKey || provider === "demo") {
    const demoText = demoResponse({
      mode: body.mode,
      language,
      snippet,
    });
    const demoStream = createDemoStream(demoText, request.signal);
    return new Response(demoStream, { headers: sseHeaders(remaining) });
  }

  const messages = buildMessages({
    mode: body.mode,
    language,
    snippet,
    cursorLine,
    cursorCol,
    contextFiles: body.contextFiles,
  });

  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), 20000);
  const signal = request.signal
    ? AbortSignal.any([request.signal, timeout.signal])
    : timeout.signal;

  let upstream: Response;
  try {
    upstream = await callUpstream(provider, apiKey, messages, body.mode, signal);
  } catch (err) {
    const timedOut = signal.aborted && timeout.signal.aborted && !request.signal?.aborted;
    return jsonError(
      {
        error: timedOut ? "PROVIDER_TIMEOUT" : "PROVIDER_ERROR",
        message: timedOut
          ? "The model took too long to respond."
          : err instanceof Error
            ? err.message
            : "Failed to reach the model.",
      },
      timedOut ? 504 : 502,
    );
  } finally {
    clearTimeout(timer);
  }

  if (!upstream.ok || !upstream.body) {
    let detail = `${PROVIDER_LABELS[provider] || provider} API error ${upstream.status}`;
    let code: GatewayError["error"] = "PROVIDER_ERROR";
    let status = 502;
    try {
      const failed = (await upstream.json()) as {
        code?: string;
        error?: string | { message?: string; code?: string };
        message?: string;
      };
      const message =
        typeof failed.error === "string"
          ? failed.error
          : failed.error?.message ?? failed.message ?? "";
      if (message) detail = message;
      if (upstream.status === 401 || upstream.status === 403) {
        detail = "Invalid or inactive API key. Check your API key in Settings.";
      }
      if (upstream.status === 429) {
        code = "RATE_LIMITED";
        status = 429;
      }
    } catch {
      // Body not JSON
    }
    return jsonError({ error: code, message: detail }, status);
  }

  let stream: ReadableStream<Uint8Array>;
  if (provider === "gemini") {
    stream = mapGeminiStream(upstream.body, signal);
  } else if (provider === "anthropic") {
    stream = mapAnthropicStream(upstream.body, signal);
  } else {
    stream = mapOpenAiStream(upstream.body, signal);
  }

  return new Response(stream, { headers: sseHeaders(remaining) });
}

export async function callUpstream(
  provider: string,
  apiKey: string,
  messages: { system: string; user: string },
  mode: Mode,
  signal: AbortSignal,
): Promise<Response> {
  const temperature = mode === "suggest" ? 0.2 : 0.35;
  const maxTokens = MAX_OUTPUT_TOKENS[mode as keyof typeof MAX_OUTPUT_TOKENS];

  switch (provider) {
    case "xai": {
      return fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: MODEL,
          stream: true,
          temperature,
          max_tokens: maxTokens,
          messages: [
            { role: "system", content: messages.system },
            { role: "user", content: messages.user },
          ],
        }),
        signal,
      });
    }
    case "openai": {
      return fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          stream: true,
          temperature,
          max_tokens: maxTokens,
          messages: [
            { role: "system", content: messages.system },
            { role: "user", content: messages.user },
          ],
        }),
        signal,
      });
    }
    case "anthropic": {
      return fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-5-haiku-20241022",
          stream: true,
          max_tokens: maxTokens,
          system: messages.system,
          messages: [{ role: "user", content: messages.user }],
        }),
        signal,
      });
    }
    case "gemini": {
      const model = "gemini-2.5-flash";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
      const payload = {
        systemInstruction: { parts: [{ text: messages.system }] },
        contents: [
          {
            role: "user",
            parts: [{ text: messages.user }],
          },
        ],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        },
      };
      return fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal,
      });
    }
    default:
      throw new Error(`Unsupported provider: ${provider}.`);
  }
}

function mapOpenAiStream(
  upstream: ReadableStream<Uint8Array>,
  signal: AbortSignal,
): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  let sentDone = false;

  return new ReadableStream({
    async start(controller) {
      const reader = upstream.getReader();
      const abort = () => {
        void reader.cancel();
      };
      signal.addEventListener("abort", abort, { once: true });

      const emit = (payload: string) => {
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const data = trimmed.slice(5).trim();
            if (!data) continue;
            if (data === "[DONE]") {
              if (!sentDone) {
                emit("[DONE]");
                sentDone = true;
              }
              continue;
            }
            try {
              const json = JSON.parse(data) as {
                choices?: { delta?: { content?: string } }[];
              };
              const delta = json.choices?.[0]?.delta?.content;
              if (delta) emit(JSON.stringify({ delta }));
            } catch {
              // skip malformed chunk
            }
          }
        }
        if (!sentDone) emit("[DONE]");
        controller.close();
      } catch (err) {
        const timedOut = signal.aborted;
        emit(
          JSON.stringify({
            error: timedOut ? "PROVIDER_TIMEOUT" : "PROVIDER_ERROR",
            message: timedOut
              ? "The model took too long to respond."
              : err instanceof Error
                ? err.message
                : "Stream failed.",
          }),
        );
        if (!sentDone) emit("[DONE]");
        controller.close();
      } finally {
        signal.removeEventListener("abort", abort);
      }
    },
    cancel() {
      void upstream.cancel();
    },
  });
}

function mapGeminiStream(
  upstream: ReadableStream<Uint8Array>,
  signal: AbortSignal,
): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  let sentDone = false;

  return new ReadableStream({
    async start(controller) {
      const reader = upstream.getReader();
      const abort = () => {
        void reader.cancel();
      };
      signal.addEventListener("abort", abort, { once: true });

      const emit = (payload: string) => {
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const data = trimmed.slice(5).trim();
            if (!data || data === "[DONE]") continue;
            try {
              const json = JSON.parse(data) as {
                candidates?: Array<{
                  content?: {
                    parts?: Array<{ text?: string }>;
                  };
                }>;
                error?: { message?: string };
              };
              if (json.error?.message) {
                emit(
                  JSON.stringify({
                    error: "PROVIDER_ERROR",
                    message: json.error.message,
                  }),
                );
                continue;
              }
              const parts = json.candidates?.[0]?.content?.parts;
              if (parts) {
                for (const part of parts) {
                  if (part.text) {
                    emit(JSON.stringify({ delta: part.text }));
                  }
                }
              }
            } catch {
              // skip malformed chunk
            }
          }
        }
        if (!sentDone) {
          emit("[DONE]");
          sentDone = true;
        }
        controller.close();
      } catch (err) {
        const timedOut = signal.aborted;
        emit(
          JSON.stringify({
            error: timedOut ? "PROVIDER_TIMEOUT" : "PROVIDER_ERROR",
            message: timedOut
              ? "The model took too long to respond."
              : err instanceof Error
                ? err.message
                : "Stream failed.",
          }),
        );
        if (!sentDone) emit("[DONE]");
        controller.close();
      } finally {
        signal.removeEventListener("abort", abort);
      }
    },
    cancel() {
      void upstream.cancel();
    },
  });
}

function mapAnthropicStream(
  upstream: ReadableStream<Uint8Array>,
  signal: AbortSignal,
): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  let sentDone = false;

  return new ReadableStream({
    async start(controller) {
      const reader = upstream.getReader();
      const abort = () => {
        void reader.cancel();
      };
      signal.addEventListener("abort", abort, { once: true });

      const emit = (payload: string) => {
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const data = trimmed.slice(5).trim();
            if (!data) continue;
            try {
              const json = JSON.parse(data) as {
                type?: string;
                delta?: { text?: string };
                error?: { message?: string };
              };
              if (json.type === "content_block_delta" && json.delta?.text) {
                emit(JSON.stringify({ delta: json.delta.text }));
              }
              if (json.type === "message_stop") {
                if (!sentDone) {
                  emit("[DONE]");
                  sentDone = true;
                }
              }
            } catch {
              // skip malformed chunk
            }
          }
        }
        if (!sentDone) {
          emit("[DONE]");
          sentDone = true;
        }
        controller.close();
      } catch (err) {
        const timedOut = signal.aborted;
        emit(
          JSON.stringify({
            error: timedOut ? "PROVIDER_TIMEOUT" : "PROVIDER_ERROR",
            message: timedOut
              ? "The model took too long to respond."
              : err instanceof Error
                ? err.message
                : "Stream failed.",
          }),
        );
        if (!sentDone) emit("[DONE]");
        controller.close();
      } finally {
        signal.removeEventListener("abort", abort);
      }
    },
    cancel() {
      void upstream.cancel();
    },
  });
}
