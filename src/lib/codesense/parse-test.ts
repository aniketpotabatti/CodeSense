import type { ParsedTest } from "./types.ts";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function coerceTestCase(value: unknown): { name: string; description: string } | null {
  if (!isPlainObject(value)) return null;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  const description = typeof value.description === "string" ? value.description.trim() : "";
  if (!name) return null;
  return { name, description };
}

function coerce(value: unknown): ParsedTest | null {
  if (!isPlainObject(value)) return null;
  const framework = typeof value.framework === "string" ? value.framework.trim() : "";
  const description = typeof value.description === "string" ? value.description.trim() : "";
  const code = typeof value.code === "string" ? value.code.trim() : "";
  if (!framework || !description || !code) return null;

  const testCases: Array<{ name: string; description: string }> = [];
  if (Array.isArray(value.testCases)) {
    for (const tc of value.testCases) {
      const coerced = coerceTestCase(tc);
      if (coerced) testCases.push(coerced);
    }
  }

  return { framework, description, code, testCases };
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

export function parseTest(text: string): ParsedTest | null {
  const json = extractJson(text.trim());
  return json == null ? null : coerce(json);
}
