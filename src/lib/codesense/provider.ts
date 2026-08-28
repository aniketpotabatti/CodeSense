import { buildMessages } from "./prompts";
import { budgetText, estimateTokens, insertCursorMarker } from "./snippet";
import {
  MAX_INPUT_TOKENS,
  MAX_OUTPUT_TOKENS,
  type CodesenseRequest,
  type GatewayError,
} from "./types";

const MODEL = "grok-4.5";

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
  const apiKey = process.env.XAI_API_KEY;
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
      { error: "BAD_REQUEST", message: "Unknown mode." },
      400,
    );
  }

  const language = String(body.language ?? "plaintext").slice(0, 40);
  const rawSnippet = String(body.snippet ?? "");
  const cursorLine = Number(body.cursorLine) || 1;
  const cursorCol = Number(body.cursorCol) || 1;

  if (!rawSnippet.trim()) {
    return jsonError(
      { error: "BAD_REQUEST", message: "Snippet is empty." },
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

  const timeout = AbortSignal.timeout(25_000);
  const signal = request.signal
    ? AbortSignal.any([request.signal, timeout])
    : timeout;

  let upstream: Response;
  try {
    upstream = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        stream: true,
        temperature: body.mode === "suggest" ? 0.2 : 0.35,
        max_tokens: MAX_OUTPUT_TOKENS[body.mode],
        messages: [
          { role: "system", content: messages.system },
          { role: "user", content: messages.user },
        ],
      }),
      signal,
    });
  } catch (err) {
    const timedOut =
      signal.aborted && timeout.aborted && !request.signal?.aborted;
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
