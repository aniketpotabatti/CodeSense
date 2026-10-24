import type { ContextFile, Mode } from "./types.ts";

const BASE = `You are CodeSense, a precise and concise code assistant embedded inside a developer's editor.
You receive raw code snippets. You never hallucinate APIs or fabricate behavior.
You respond in plain, clear language — no unnecessary preamble.`;

/** Max chars of context file content to include per file (avoids token blowout). */
const MAX_CONTEXT_CHARS_PER_FILE = 1200;

function formatContextFiles(files: ContextFile[]): string {
  if (!files.length) return "";
  const sections = files
    .map((f) => {
      const body =
        f.content.length > MAX_CONTEXT_CHARS_PER_FILE
          ? f.content.slice(0, MAX_CONTEXT_CHARS_PER_FILE) + "\n// ... (truncated)"
          : f.content;
      return `### Context: ${f.name} (${f.language})\n\`\`\`${f.language}\n${body}\n\`\`\``;
    })
    .join("\n\n");
  return `\n\n---\n## Other open files (for context only — do not review them):\n\n${sections}`;
}

export function buildMessages(input: {
  mode: Mode;
  language: string;
  snippet: string;
  cursorLine: number;
  cursorCol: number;
  contextFiles?: ContextFile[];
}): { system: string; user: string } {
  const ctx = formatContextFiles(input.contextFiles ?? []);

  const system = `${BASE}
Detected language: ${input.language}
Mode: ${input.mode}`;

  if (input.mode === "explain") {
    return {
      system,
      user: `The developer selected or is actively editing the following snippet.
Explain what it does in 2–4 sentences. Focus on intent, not syntax. Do not repeat the code.

Snippet:
${input.snippet}${ctx}`,
    };
  }

  if (input.mode === "test") {
    return {
      system,
      user: `Generate unit tests for the following ${input.language} code snippet.

Return STRICT JSON only — no markdown fences, no preamble, no trailing text. The response must parse as JSON and match this shape exactly:

{
  "framework": "<test framework name for this language, e.g. jest, pytest, go test, JUnit>",
  "description": "1-2 sentence description of what the tests cover",
  "code": "<complete test file content, ready to save>",
  "testCases": [
    { "name": "test name", "description": "what this test verifies" }
  ]
}

Rules:
- Use idiomatic tests for ${input.language} (standard library preferred, minimal external deps).
- Cover the happy path plus at least one edge case (empty input, null/undefined, error condition).
- Do not invent APIs that don't exist in the snippet.
- Keep tests concise and focused.
- The context files below are for cross-file understanding only; do not test them.

Snippet:
${input.snippet}${ctx}`
    };
  }

  if (input.mode === "review") {
    return {
      system,
      user: `The developer just saved this file. Perform a concise code review.

Return STRICT JSON only — no markdown fences, no preamble, no trailing text. The response must parse as JSON and match this shape exactly:

{
  "summary": "plain-language 2-4 sentence summary of what the code does (intent, not syntax)",
  "walkthrough": "brief walkthrough of the code, block by block",
  "risks": [
    { "line": <number | null>, "severity": "low | medium | high", "msg": "actionable issue and why" }
  ],
  "refactor": { "diff": "<optional replacement snippet or empty string>", "description": "why this refactor helps" }
}

Rules:
- Base every risk on actual code in the snippet; do not invent bugs that are not present.
- Line numbers are 1-based, or null when not applicable to a specific line.
- Keep the whole response concise (roughly under 200 words of content).
- If no refactor applies, set refactor.diff to "".
- The context files below are for cross-file understanding only; do not include their risks in the JSON.

File to review:
${input.snippet}${ctx}`,
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