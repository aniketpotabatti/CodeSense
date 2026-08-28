export type Mode = "explain" | "review" | "suggest";

export interface PromptContext {
  mode: Mode;
  language: string;
  snippet: string;
  cursorLine?: number;
  cursorCol?: number;
}

const BASE_SYSTEM = `You are CodeSense, a precise and concise code assistant embedded inside a developer's editor.
You receive raw code snippets. You never hallucinate APIs or fabricate behavior.
You respond in plain, clear language — no unnecessary preamble.
Detected language: {{LANGUAGE}}
Mode: {{MODE}}`;

const EXPLAIN = `The developer selected or is actively editing the following snippet.
Explain what it does in 2–4 sentences. Focus on intent, not syntax.
Snippet:
{{CODE_SNIPPET}}`;

const REVIEW = `The developer just saved this file. Perform a concise code review.
Structure your response as:
- What's good (1–2 points)
- What to improve (1–3 actionable points)
- One optional refactor suggestion

Keep the entire response under 200 words.
File:
{{CODE_SNIPPET}}`;

const SUGGEST = `Complete the following code. Return ONLY the completion — no explanation, no markdown fences.
Stop at a logical boundary (end of function, statement, or block).
Context:
{{CODE_SNIPPET}}
Cursor position: line {{LINE}}, col {{COL}}`;

export function buildMessages(ctx: PromptContext): { system: string; user: string } {
  const system = BASE_SYSTEM.replace("{{LANGUAGE}}", ctx.language).replace(
    "{{MODE}}",
    ctx.mode,
  );

  let user: string;
  switch (ctx.mode) {
    case "explain":
      user = EXPLAIN.replace("{{CODE_SNIPPET}}", ctx.snippet);
      break;
    case "review":
      user = REVIEW.replace("{{CODE_SNIPPET}}", ctx.snippet);
      break;
    case "suggest":
      user = SUGGEST.replace("{{CODE_SNIPPET}}", ctx.snippet)
        .replace("{{LINE}}", String(ctx.cursorLine ?? 1))
        .replace("{{COL}}", String(ctx.cursorCol ?? 1));
      break;
  }

  return { system, user };
}

/** Rough token estimate: ~4 chars per token */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export const MAX_INPUT_TOKENS = 800;
export const MAX_OUTPUT_TOKENS: Record<Mode, number> = {
  explain: 400,
  suggest: 400,
  review: 600,
};
