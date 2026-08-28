import type { Mode } from "./types";

const BASE = `You are CodeSense, a precise and concise code assistant embedded inside a developer's editor.
You receive raw code snippets. You never hallucinate APIs or fabricate behavior.
You respond in plain, clear language — no unnecessary preamble.`;

export function buildMessages(input: {
  mode: Mode;
  language: string;
  snippet: string;
  cursorLine: number;
  cursorCol: number;
}): { system: string; user: string } {
  const system = `${BASE}
Detected language: ${input.language}
Mode: ${input.mode}`;

  if (input.mode === "explain") {
    return {
      system,
      user: `The developer selected or is actively editing the following snippet.
Explain what it does in 2–4 sentences. Focus on intent, not syntax. Do not repeat the code.

Snippet:
${input.snippet}`,
    };
  }

  if (input.mode === "review") {
    return {
      system,
      user: `The developer just saved this file. Perform a concise code review.
Structure your response EXACTLY with these headings and bullet lists (no other wrapping):

GOOD:
- one or two concrete strengths

IMPROVE:
- one to three actionable issues (what to change, and why)

REFACTOR:
- a single optional refactor suggestion

Keep the entire response under 200 words. Do not invent bugs that are not in the code.

File:
${input.snippet}`,
    };
  }

  return {
    system,
    user: `Complete the following code at the cursor marker ⟦CURSOR⟧.
Return ONLY the completion text that should be inserted at the cursor — no explanation, no markdown fences, no quotes.
Do not repeat code that already exists before the cursor.
Stop at a logical boundary (end of the current statement, block, or function).

Context:
${input.snippet}
Cursor position: line ${input.cursorLine}, col ${input.cursorCol}`,
  };
}
