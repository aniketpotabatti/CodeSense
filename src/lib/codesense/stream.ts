import type { CodesenseRequest, GatewayError } from "./types.ts";

export class CodesenseApiError extends Error {
  readonly code: GatewayError["error"];
  readonly retryAfter?: number;

  constructor(err: GatewayError) {
    super(err.message);
    this.name = "CodesenseApiError";
    this.code = err.error;
    this.retryAfter = err.retryAfter;
  }
}

export function isGatewayError(value: unknown): value is GatewayError {
  if (!value || typeof value !== "object") return false;
  const rec = value as Record<string, unknown>;
  return typeof rec.error === "string" && typeof rec.message === "string";
}

const RETRYABLE_CODES: GatewayError["error"][] = [
  "RATE_LIMITED",
  "PROVIDER_TIMEOUT",
  "PROVIDER_ERROR",
];

// Retained for documentation of which gateway error codes are retryable.
// Referenced conceptually by streamCodesense's inline retry logic.
void RETRYABLE_CODES;

const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffMs(attempt: number, retryAfter?: number): number {
  if (retryAfter) return retryAfter * 1000;
  return BASE_BACKOFF_MS * Math.pow(2, attempt);
}

export async function streamCodesense(
  body: CodesenseRequest,
  signal: AbortSignal,
  onDelta: (delta: string) => void,
): Promise<{ remaining: number | null }> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");

    try {
      return await attemptStream(body, signal, onDelta, attempt);
    } catch (err) {
      lastError = err;

      if (err instanceof CodesenseApiError) {
        if (
          err.code === "RATE_LIMITED" &&
          attempt < MAX_RETRIES
        ) {
          const delay = backoffMs(attempt, err.retryAfter);
          await sleep(delay);
          continue;
        }
        if (
          err.code === "PROVIDER_TIMEOUT" &&
          attempt < MAX_RETRIES
        ) {
          const delay = backoffMs(attempt);
          await sleep(delay);
          continue;
        }
        if (
          err.code === "PROVIDER_ERROR" &&
          attempt < MAX_RETRIES
        ) {
          const delay = backoffMs(attempt);
          await sleep(delay);
          continue;
        }
        throw err;
      }

      if (attempt < MAX_RETRIES) {
        const delay = backoffMs(attempt);
        await sleep(delay);
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}

async function attemptStream(
  body: CodesenseRequest,
  signal: AbortSignal,
  onDelta: (delta: string) => void,
  _attempt: number,
): Promise<{ remaining: number | null }> {
  const res = await fetch("/api/codesense", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  const remainingHeader = res.headers.get("x-ratelimit-remaining");
  const remaining = remainingHeader ? Number(remainingHeader) : null;

  if (!res.ok) {
    let parsed: unknown = null;
    try {
      parsed = await res.json();
    } catch {
      parsed = null;
    }
    if (isGatewayError(parsed)) throw new CodesenseApiError(parsed);
    throw new CodesenseApiError({
      error: "PROVIDER_ERROR",
      message: `Request failed (${res.status})`,
    });
  }

  if (!res.body) {
    throw new CodesenseApiError({
      error: "PROVIDER_ERROR",
      message: "Empty response stream",
    });
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const line = part
        .split("\n")
        .map((entry) => entry.trim())
        .find((entry) => entry.startsWith("data:"));
      if (!line) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") return { remaining };
      let json: unknown;
      try {
        json = JSON.parse(data);
      } catch {
        continue;
      }
      if (isGatewayError(json)) throw new CodesenseApiError(json);
      if (
        json &&
        typeof json === "object" &&
        "delta" in json &&
        typeof (json as { delta: unknown }).delta === "string"
      ) {
        onDelta((json as { delta: string }).delta);
      }
    }
  }

  return { remaining };
}

export async function fetchAiHealth(): Promise<{
  available: boolean;
  model: string;
}> {
  try {
    const res = await fetch("/api/codesense");
    if (!res.ok) return { available: false, model: "grok-4.5" };
    const body = (await res.json()) as { available?: boolean; model?: string };
    return {
      available: Boolean(body.available),
      model: body.model ?? "grok-4.5",
    };
  } catch {
    return { available: false, model: "grok-4.5" };
  }
}
