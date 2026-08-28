import type { Mode } from "./prompts.js";
import { buildMessages, MAX_OUTPUT_TOKENS } from "./prompts.js";
import type { PromptContext } from "./prompts.js";

export type StreamChunk = { delta: string } | { done: true } | { error: string };

const LATENCY_SLA_MS = 2000;

/** Demo-mode streamed responses when no API key is configured */
function demoResponse(ctx: PromptContext): string {
  const lines = ctx.snippet.split("\n").filter((l) => l.trim());
  const preview = lines.slice(0, 3).join(" ").slice(0, 80);

  switch (ctx.mode) {
    case "explain":
      return `This ${ctx.language} snippet defines logic around: ${preview || "the selected code"}. It processes data step by step, with control flow driven by the surrounding conditions and return paths. The intent is to transform or validate input and produce a deterministic result for the caller.`;
    case "review":
      return `**What's good**
- Clear structure and readable naming in the ${ctx.language} code
- Focused snippet size makes the control flow easy to follow

**What to improve**
- Consider edge cases (empty input, nulls) explicitly
- Extract repeated patterns into small helpers if this grows
- Add a brief comment only where the intent is non-obvious

**Refactor idea**
- Pull the core branch into a pure function so it is easier to unit-test in isolation.`;
    case "suggest": {
      const last = lines[lines.length - 1] ?? "";
      if (/function\s+\w+\s*\([^)]*\)\s*\{\s*$/.test(last.trim()) || last.trim().endsWith("{")) {
        return `\n  // TODO: implement\n  return null;\n}`;
      }
      if (/^\s*(const|let|var)\s+\w+\s*=\s*$/.test(last)) {
        return ` null;`;
      }
      if (ctx.language === "python") {
        return `\n    pass`;
      }
      if (ctx.language === "typescript" || ctx.language === "javascript") {
        return `\n  // completed by CodeSense\n`;
      }
      return `\n`;
    }
  }
}

async function* streamText(text: string, delayMs = 12): AsyncGenerator<StreamChunk> {
  const words = text.split(/(?<=\s)/);
  for (const w of words) {
    yield { delta: w };
    await new Promise((r) => setTimeout(r, delayMs));
  }
  yield { done: true };
}

async function* streamOpenAICompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  ctx: PromptContext,
): AsyncGenerator<StreamChunk> {
  const { system, user } = buildMessages(ctx);
  const maxTokens = MAX_OUTPUT_TOKENS[ctx.mode];

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      stream: true,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok || !res.body) {
    const msg = await res.text().catch(() => res.statusText);
    yield { error: `Provider error ${res.status}: ${msg.slice(0, 200)}` };
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n");
    buffer = parts.pop() ?? "";

    for (const line of parts) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") {
        yield { done: true };
        return;
      }
      try {
        const json = JSON.parse(payload) as {
          choices?: { delta?: { content?: string } }[];
        };
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) yield { delta };
      } catch {
        // skip malformed SSE lines
      }
    }
  }
  yield { done: true };
}

async function* streamAnthropic(
  apiKey: string,
  model: string,
  ctx: PromptContext,
): AsyncGenerator<StreamChunk> {
  const { system, user } = buildMessages(ctx);
  const maxTokens = MAX_OUTPUT_TOKENS[ctx.mode];

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      stream: true,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!res.ok || !res.body) {
    const msg = await res.text().catch(() => res.statusText);
    yield { error: `Anthropic error ${res.status}: ${msg.slice(0, 200)}` };
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n");
    buffer = parts.pop() ?? "";

    for (const line of parts) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      try {
        const json = JSON.parse(payload) as {
          type?: string;
          delta?: { type?: string; text?: string };
        };
        if (json.type === "content_block_delta" && json.delta?.text) {
          yield { delta: json.delta.text };
        }
        if (json.type === "message_stop") {
          yield { done: true };
          return;
        }
      } catch {
        // skip
      }
    }
  }
  yield { done: true };
}

export async function* streamLLM(ctx: PromptContext): AsyncGenerator<StreamChunk> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const xaiKey = process.env.XAI_API_KEY;

  // Prefer Anthropic (plan default), then xAI, then OpenAI, else demo mode
  if (anthropicKey) {
    const started = Date.now();
    let yielded = false;
    try {
      for await (const chunk of streamAnthropic(
        anthropicKey,
        process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-latest",
        ctx,
      )) {
        yielded = true;
        // If first token is slow and we have OpenAI fallback, we already started —
        // keep going; SLA check is best-effort for subsequent requests.
        if ("error" in chunk && openaiKey && Date.now() - started > LATENCY_SLA_MS) {
          yield* streamOpenAICompatible(
            "https://api.openai.com/v1",
            openaiKey,
            process.env.OPENAI_MODEL || "gpt-4o-mini",
            ctx,
          );
          return;
        }
        yield chunk;
      }
      return;
    } catch (err) {
      if (openaiKey) {
        yield* streamOpenAICompatible(
          "https://api.openai.com/v1",
          openaiKey,
          process.env.OPENAI_MODEL || "gpt-4o-mini",
          ctx,
        );
        return;
      }
      yield { error: err instanceof Error ? err.message : "Provider failure" };
      return;
    }
  }

  if (xaiKey) {
    yield* streamOpenAICompatible(
      "https://api.x.ai/v1",
      xaiKey,
      process.env.XAI_MODEL || "grok-3-mini",
      ctx,
    );
    return;
  }

  if (openaiKey) {
    yield* streamOpenAICompatible(
      "https://api.openai.com/v1",
      openaiKey,
      process.env.OPENAI_MODEL || "gpt-4o-mini",
      ctx,
    );
    return;
  }

  // Demo mode — no keys configured
  yield* streamText(demoResponse(ctx));
}

export function getActiveProvider(): string {
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.XAI_API_KEY) return "xai";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "demo";
}
