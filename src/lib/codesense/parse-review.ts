import type { ParsedReview } from "./types";

function bullets(block: string): string[] {
  return block
    .split("\n")
    .map((line) => line.replace(/^\s*[-*•]\s*/, "").trim())
    .filter(Boolean);
}

export function parseReview(text: string): ParsedReview | null {
  const normalized = text.replace(/\r\n/g, "\n");
  const goodMatch = normalized.match(
    /GOOD:\s*([\s\S]*?)(?=\nIMPROVE:|\nREFACTOR:|$)/i,
  );
  const improveMatch = normalized.match(
    /IMPROVE:\s*([\s\S]*?)(?=\nREFACTOR:|\nGOOD:|$)/i,
  );
  const refactorMatch = normalized.match(
    /REFACTOR:\s*([\s\S]*?)(?=\nGOOD:|\nIMPROVE:|$)/i,
  );

  const good = bullets(goodMatch?.[1] ?? "");
  const improve = bullets(improveMatch?.[1] ?? "");
  const refactor = bullets(refactorMatch?.[1] ?? "");

  if (good.length + improve.length + refactor.length === 0) return null;
  return { good, improve, refactor };
}
