// parse-test guardrails — strict JSON test parsing.
// Runs with `node --test` (no toolchain needed).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseTest } from "./parse-test.ts";

const validTest = JSON.stringify({
  framework: "jest",
  description: "Tests for a sum utility.",
  code: "import { describe, it, expect } from 'jest';\n\ndescribe('sum', () => {\n  it('adds two numbers', () => {\n    expect(sum(1, 2)).toBe(3);\n  });\n});\n",
  testCases: [
    { name: "happy path", description: "Verifies sum of two positive numbers." },
    { name: "edge case", description: "Verifies behavior with zero input." },
  ],
});

describe("parseTest", () => {
  it("parses strict JSON test output", () => {
    const parsed = parseTest(validTest);
    assert.ok(parsed);
    assert.equal(parsed!.framework, "jest");
    assert.equal(parsed!.description, "Tests for a sum utility.");
    assert.equal(parsed!.code.includes("expect(sum(1, 2)).toBe(3);"), true);
    assert.equal(parsed!.testCases.length, 2);
    assert.equal(parsed!.testCases[0].name, "happy path");
    assert.equal(parsed!.testCases[1].description, "Verifies behavior with zero input.");
  });

  it("parses JSON wrapped in markdown fences", () => {
    const wrapped = "```json\n" + validTest + "\n```";
    const parsed = parseTest(wrapped);
    assert.ok(parsed);
    assert.equal(parsed!.framework, "jest");
    assert.equal(parsed!.testCases.length, 2);
  });

  it("parses JSON wrapped in unfenced markdown blocks", () => {
    const wrapped = "Here are the tests:\n```\n" + validTest + "\n```\nDone.";
    const parsed = parseTest(wrapped);
    assert.ok(parsed);
    assert.equal(parsed!.testCases.length, 2);
  });

  it("drops invalid test cases", () => {
    const parsed = parseTest(
      JSON.stringify({
        framework: "jest",
        description: "d",
        code: "c",
        testCases: [{ name: "", description: "x" }, { name: "ok", description: "y" }],
      }),
    );
    assert.ok(parsed);
    assert.equal(parsed!.testCases.length, 1);
    assert.equal(parsed!.testCases[0].name, "ok");
  });

  it("allows missing testCases", () => {
    const parsed = parseTest(
      JSON.stringify({ framework: "jest", description: "d", code: "c" }),
    );
    assert.ok(parsed);
    assert.equal(parsed!.testCases.length, 0);
  });

  it("returns null for missing required fields", () => {
    assert.equal(
      parseTest(JSON.stringify({ description: "d", code: "c", testCases: [] })),
      null,
    );
    assert.equal(
      parseTest(JSON.stringify({ framework: "jest", code: "c", testCases: [] })),
      null,
    );
    assert.equal(
      parseTest(JSON.stringify({ framework: "jest", description: "d", testCases: [] })),
      null,
    );
  });

  it("returns null for garbage input", () => {
    assert.equal(parseTest("not json at all"), null);
    assert.equal(parseTest("```json\n{ bad\n```"), null);
    assert.equal(parseTest(""), null);
  });
});