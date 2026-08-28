import { MAX_INPUT_TOKENS } from "./types";

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function budgetText(text: string, maxTokens = MAX_INPUT_TOKENS): string {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars);
}

export function extractSnippet(
  code: string,
  cursorLine: number,
  before = 30,
  after = 10,
): { snippet: string; startLine: number } {
  const lines = code.split("\n");
  const idx = Math.min(Math.max(0, cursorLine - 1), Math.max(0, lines.length - 1));
  const start = Math.max(0, idx - before);
  const end = Math.min(lines.length, idx + 1 + after);
  return {
    snippet: lines.slice(start, end).join("\n"),
    startLine: start + 1,
  };
}

export function insertCursorMarker(
  snippet: string,
  cursorLine: number,
  cursorCol: number,
  startLine: number,
): string {
  const lines = snippet.split("\n");
  const local = cursorLine - startLine;
  if (local < 0 || local >= lines.length) return snippet;
  const line = lines[local] ?? "";
  const col = Math.min(Math.max(0, cursorCol - 1), line.length);
  lines[local] = `${line.slice(0, col)}⟦CURSOR⟧${line.slice(col)}`;
  return lines.join("\n");
}

export function stripCompletionFences(text: string): string {
  let out = text.trim();
  out = out.replace(/^```[\w+-]*\s*\n?/, "");
  out = out.replace(/\n?```$/, "");
  return out.replace(/⟦CURSOR⟧/g, "");
}
