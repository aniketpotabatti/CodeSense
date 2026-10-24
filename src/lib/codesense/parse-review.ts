import type { ParsedReview, ReviewRisk, ReviewSeverity } from "./types";

const SEVERITIES: ReviewSeverity[] = ["low", "medium", "high", "critical"];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function coerceRisk(value: unknown): ReviewRisk | null {
  if (!isPlainObject(value)) return null;
  const msg = typeof value.msg === "string" ? value.msg.trim() : "";
  if (!msg) return null;
  let line: number | null = null;
  if (typeof value.line === "number") {
    line = value.line;
  } else if (typeof value.line === "string") {
    const parsed = Number(value.line);
    line = Number.isFinite(parsed) ? parsed : null;
  }
  const severity = SEVERITIES.includes(value.severity as ReviewSeverity)
    ? (value.severity as ReviewSeverity)
    : "medium";
  return { line, severity, msg };
}

function coerce(value: unknown): ParsedReview | null {
  if (!isPlainObject(value)) return null;
  const summary = String(value.summary ?? "").trim();
  const walkthrough = String(value.walkthrough ?? "").trim();
  if (!summary || !walkthrough) return null;

  const risks: ReviewRisk[] = [];
  if (Array.isArray(value.risks)) {
    for (const risk of value.risks) {
      const coerced = coerceRisk(risk);
      if (coerced) risks.push(coerced);
    }
  }

  let refactor: { diff: string; description?: string } | null = null;
  if (
    isPlainObject(value.refactor) &&
    typeof value.refactor.diff === "string" &&
    value.refactor.diff.trim()
  ) {
    refactor = {
      diff: value.refactor.diff,
      ...(typeof value.refactor.description === "string"
        ? { description: value.refactor.description }
        : {}),
    };
  }

  return { summary, walkthrough, risks, refactor };
}

function extractJson(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    // fall through to fenced-block extraction
  }
  const fenceMatch = text.match(/```(?:json)?\s*\n([\s\S]*?)\s*```/);
  if (!fenceMatch) return null;
  try {
    return JSON.parse(fenceMatch[1]);
  } catch {
    return null;
  }
}

export function parseReview(text: string): ParsedReview | null {
  const json = extractJson(text.trim());
  return json == null ? null : coerce(json);
}

