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

  it("test mode: user demands strict JSON with the test schema", () => {
    const { user } = buildMessages({ mode: "test", ...baseInput });
    assert.ok(user.includes("STRICT JSON only"));
    assert.ok(user.includes('"framework"'));
    assert.ok(user.includes('"description"'));
    assert.ok(user.includes('"code"'));
    assert.ok(user.includes('"testCases"'));
    assert.ok(user.includes("jest, pytest, go test, JUnit"));
    assert.ok(user.includes("happy path plus at least one edge case"));
  });

  it("all modes: system includes the base instructions and language", () => {
    for (const mode of ["explain", "review", "suggest", "test"] as const) {
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

  it("explain mode: appends a ### Context files section when contextFiles are given", () => {
    const { user } = buildMessages({
      mode: "explain",
      language: "typescript",
      snippet: "const x = 1;",
      cursorLine: 1,
      cursorCol: 1,
      contextFiles: [
        { name: "helper.ts", language: "typescript", content: "export const y = 2;" },
      ],
    });
    assert.ok(user.includes("### Context: helper.ts (typescript)"));
    assert.ok(user.includes("export const y = 2;"));
    assert.ok(user.includes("Other open files (for context only"));
  });

  it("review mode: appends context section before File to review marker region", () => {
    const { user } = buildMessages({
      mode: "review",
      language: "go",
      snippet: "package main\n",
      cursorLine: 1,
      cursorCol: 1,
      contextFiles: [
        { name: "types.go", language: "go", content: "type T struct{}" },
      ],
    });
    assert.ok(user.includes("### Context: types.go (go)"));
    assert.ok(user.includes("type T struct{}"));
  });

  it("omits context section when no contextFiles are provided", () => {
    const { user } = buildMessages({
      mode: "explain",
      language: "typescript",
      snippet: "const x = 1;",
      cursorLine: 1,
      cursorCol: 1,
    });
    assert.ok(!user.includes("Other open files"));
  });
});
