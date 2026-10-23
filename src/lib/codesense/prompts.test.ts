import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildMessages } from "./prompts.ts";

const baseInput = {
  language: "typescript",
  snippet: "const x = 1;",
  cursorLine: 1,
  cursorCol: 1,
};

describe("prompts", () => {
  it("explain mode: system names language + mode, user contains the snippet", () => {
    const { system, user } = buildMessages({ mode: "explain", ...baseInput });
    assert.ok(system.includes("Detected language: typescript"));
    assert.ok(system.includes("Mode: explain"));
    assert.ok(user.includes("const x = 1;"));
    assert.ok(user.includes("Explain what it does"));
    assert.ok(!user.includes("STRICT JSON"));
  });

  it("review mode: user demands strict JSON with the review schema", () => {
    const { system, user } = buildMessages({ mode: "review", ...baseInput });
    assert.ok(system.includes("Mode: review"));
    assert.ok(user.includes("STRICT JSON only"));
    assert.ok(user.includes('"summary"'));
    assert.ok(user.includes('"risks"'));
    assert.ok(user.includes('"refactor"'));
    assert.ok(user.includes("low | medium | high"));
    assert.ok(user.includes("Line numbers are 1-based"));
  });

  it("suggest mode: user contains the cursor marker and position", () => {
    const { user } = buildMessages({
      mode: "suggest",
      language: "python",
      snippet: "def f():\n    ",
      cursorLine: 2,
      cursorCol: 5,
    });
    assert.ok(user.includes("⟦CURSOR⟧"));
    assert.ok(user.includes("line 2, col 5"));
    assert.ok(user.includes("Complete the following code"));
    assert.ok(!user.includes("STRICT JSON"));
  });

  it("all modes: system includes the base instructions and language", () => {
    for (const mode of ["explain", "review", "suggest"] as const) {
      const { system } = buildMessages({
        mode,
        language: "rust",
        snippet: "fn main() {}",
        cursorLine: 1,
        cursorCol: 1,
      });
      assert.ok(system.includes("CodeSense"));
      assert.ok(system.includes("Detected language: rust"));
      assert.ok(system.includes(`Mode: ${mode}`));
    }
  });
});
