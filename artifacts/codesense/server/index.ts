import express from "express";
import cors from "cors";
import {
  estimateTokens,
  MAX_INPUT_TOKENS,
  type Mode,
  type PromptContext,
} from "./prompts.js";
import { checkRateLimit } from "./rateLimit.js";
import { getActiveProvider, streamLLM } from "./providers.js";

const app = express();
const PORT = Number(process.env.PORT || 8787);

app.use(cors());
app.use(express.json({ limit: "256kb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    provider: getActiveProvider(),
    maxInputTokens: MAX_INPUT_TOKENS,
  });
});

const VALID_MODES = new Set<Mode>(["explain", "review", "suggest"]);

app.post("/api/codesense", async (req, res) => {
  const clientKey =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.ip ||
    "anon";

  const rate = checkRateLimit(clientKey);
  if (!rate.allowed) {
    res.status(429).json({
      error: "RATE_LIMITED",
      message: "Too many requests. Slow down a moment.",
      retryAfter: rate.retryAfterMs,
    });
    return;
  }

  const body = req.body as Partial<PromptContext>;
  const mode = body.mode;
  const language = (body.language || "plaintext").toLowerCase();
  let snippet = typeof body.snippet === "string" ? body.snippet : "";

  if (!mode || !VALID_MODES.has(mode)) {
    res.status(400).json({
      error: "INVALID_MODE",
      message: 'mode must be "explain" | "review" | "suggest"',
    });
    return;
  }

  if (!snippet.trim()) {
    res.status(400).json({
      error: "EMPTY_SNIPPET",
      message: "snippet is required",
    });
    return;
  }

  // Token budget guard — truncate from the start if oversized
  if (estimateTokens(snippet) > MAX_INPUT_TOKENS) {
    const maxChars = MAX_INPUT_TOKENS * 4;
    snippet = snippet.slice(-maxChars);
  }

  if (estimateTokens(snippet) > MAX_INPUT_TOKENS) {
    res.status(400).json({
      error: "TOKEN_LIMIT_EXCEEDED",
      message: `Snippet exceeds ~${MAX_INPUT_TOKENS} token budget`,
    });
    return;
  }

  const ctx: PromptContext = {
    mode,
    language,
    snippet,
    cursorLine: body.cursorLine,
    cursorCol: body.cursorCol,
  };

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  try {
    for await (const chunk of streamLLM(ctx)) {
      if ("error" in chunk) {
        res.write(
          `data: ${JSON.stringify({ error: "PROVIDER_TIMEOUT", message: chunk.error })}\n\n`,
        );
        break;
      }
      if ("done" in chunk) {
        res.write("data: [DONE]\n\n");
        break;
      }
      res.write(`data: ${JSON.stringify({ delta: chunk.delta })}\n\n`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stream failed";
    res.write(
      `data: ${JSON.stringify({ error: "PROVIDER_TIMEOUT", message })}\n\n`,
    );
  }

  res.end();
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `[codesense] gateway on http://0.0.0.0:${PORT} (provider: ${getActiveProvider()})`,
  );
});
