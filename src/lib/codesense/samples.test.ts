// CodeSense sample guardrails — structural checks so a broken or
// truncated sample (e.g. `outc`, `fn main() {c`) can never ship.
// These run with `node --test` (no toolchain needed).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SAMPLE_FILES } from "./samples.ts";

describe("samples", () => {
  for (const file of SAMPLE_FILES) {
    it(`${file.name} is non-trivial and balanced`, () => {
      assert.ok(file.content.trim().length > 100, `${file.name} too short`);
      for (const [open, close] of [
        ["{", "}"],
        ["(", ")"],
        ["[", "]"],
      ] as const) {
        const o = file.content.split(open).length - 1;
        const c = file.content.split(close).length - 1;
        assert.equal(o, c, `${file.name}: unbalanced ${open}${close} (${o} vs ${c})`);
      }
      // No unterminated fenced blocks inside the sample itself
      const fences = (file.content.match(/```/g) ?? []).length;
      assert.equal(fences % 2, 0, `${file.name}: unterminated code fence`);
    });

    it(`${file.name} has no known typo markers`, () => {
      const typos = ["outc\n", "fn main() {c", "Vec::with_", "TODO_BROKEN"];
      for (const t of typos) {
        assert.ok(!file.content.includes(t), `${file.name} contains ${JSON.stringify(t)}`);
      }
    });
  }

  it("covers the core review languages", () => {
    const langs = new Set(SAMPLE_FILES.map((f) => f.language));
    for (const need of ["typescript", "python", "go"]) {
      assert.ok(langs.has(need), `missing sample for ${need}`);
    }
  });
});
