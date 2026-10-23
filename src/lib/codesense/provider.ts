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
  if (wanted === "anthropic") return "anthropic";
  if (wanted === "xai") return "xai";
  if (wanted === "openai") return "openai";
  if (key.startsWith("sk-ant-")) return "anthropic";
  if (key.startsWith("xai-")) return "xai";
  if (key.startsWith("AIza") || key.startsWith("AQ-")) return "gemini";
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
    return (
      "**What's good**\n- Clear structure and readable naming in the " +
      ctx.language +
      " code\n- Focused snippet size makes the control flow easy to follow\n\n**What to improve**\n" +
      "- Consider edge cases (empty input, nulls) explicitly\n- Extract repeated patterns into small helpers if this\ns grows\n" +
      "- Add a brief comment only where the intent is non-obvious\n\n**Refactor idea**\n" +
      "- Pull the core branch into a pure function so it is easier to unit-test in isolation."
    );
  }
  if (ctx.mode === "suggest") {
    const last = lines[lines.length - 1] || "";
    if (
      /function\s+\w+\s*\([^)]*\)\s*\{\s*$/.test(last.trim()) ||
      last.trim().endsWith("{")
    ) {
      return "\n  // TODO: implement\n  return null;\n}";
    }
    if (/^\s*(const|let|var)\s+\w+\s*=\s*$/.test(last)) return " null;";
    if (ctx.language === "python") return "\n    pass";
    return "\n  // completed by CodeSense\n";
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
  return Boolean(process.env.XAI_API_KEY);
}

export function healthResponse(): Response {
  return Response.json({
    available: aiAvailable(),
    model: MODEL,
  });
}

export async function handleCodesense(
  request: Request,
  remaining: number,
): Promise<Response> {
  // Security: snippets and API keys are validated but NEVER logged.
  // Resolve provider key: BYOK header takes precedence, fall back to server env.
  const keyOverride = readKeyOverride(request);
  const apiKey = keyOverride?.key ?? process.env.XAI_API_KEY;
  const provider = keyOverride?.provider ?? "xai";
  if (!apiKey) {
    return jsonError(
      {
        error: "AI_UNAVAILABLE",
        message: "AI features are unavailable in this environment.",
      },
      503,
    );
  }

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
    body.mode !== "suggest"
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

  const messages = buildMessages({
    mode: body.mode,
    language,
    snippet,
    cursorLine,
    cursorCol,
  });

  const timeout = AbortSignal.timeout(30_000);
  const signal = request.signal
    ? AbortSignal.any([request.signal, timeout])
    : timeout;

  let upstream: Response;
  try {
    upstream = await callUpstream(provider, apiKey, messages, body.mode, signal);
  } catch (err) {
    const timedOut = signal.aborted && timeout.aborted && !request.signal?.aborted;
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
  }

  if (!upstream.ok || !upstream.body) {
    let detail = `xAI API error ${upstream.status}`;
    let code: GatewayError["error"] = "PROVIDER_ERROR";
    let status = 502;
    try {
      const failed = (await upstream.json()) as {
        code?: string;
        error?: string | { message?: string; code?: string };
      };
      const message =
        typeof failed.error === "string"
          ? failed.error
          : failed.error?.message;
      if (message) detail = message;
      const errCode =
        failed.code ??
        (typeof failed.error === "object" ? failed.error?.code : undefined);
      if (
        upstream.status === 403 ||
        errCode === "personal-team-blocked:spending-limit"
      ) {
        code = "AI_UNAVAILABLE";
        status = 503;
        detail =
          "The model quota for this app is exhausted. Editing still works — try again later.";
      }
    } catch {
      // keep status text
    }
    return jsonError({ error: code, message: detail }, status);
  }

  const stream = mapOpenAiStream(upstream.body, signal);
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
      const res = await fetch("https://api.x.ai/v1/chat/completions", {
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
      return res;
    }
    case "openai": {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
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
      return res;
    }
    case "anthropic": {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-5-haiku-20241022",
          stream: true,
          temperature,
          max_tokens: maxTokens,
          system: messages.system,
          messages: [{ role: "user", content: messages.user }],
        }),
        signal,
      });
      return res;
    }
    case "gemini": {
      const model = "gemini-1.5-flash";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}`;
      const payload = {
        contents: [
          {
            parts: [
              {
                text: `${messages.system}\n\n${messages.user}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        },
      };
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal,
      });
      return res;
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

