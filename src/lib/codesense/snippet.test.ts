import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  estimateTokens,
  budgetText,
  extractSnippet,
  insertCursorMarker,
  stripCompletionFences,
} from "./snippet.ts";
import { MAX_INPUT_TOKENS } from "./types.ts";

describe("snippet", () => {
  describe("estimateTokens", () => {
    it("rounds up length divided by 4", () => {
      assert.equal(estimateTokens(""), 0);
      assert.equal(estimateTokens("abcd"), 1);
      assert.equal(estimateTokens("abcde"), 2);
      assert.equal(estimateTokens("a".repeat(100)), 25);
    });
  });

  describe("budgetText", () => {
    it("returns text unchanged when within budget", () => {
      const text = "const x = 1;";
      assert.equal(budgetText(text), text);
    });
    it("truncates to maxChars when over budget", () => {
      const long = "a".repeat(1000);
      const out = budgetText(long, 10); // 40 chars
      assert.equal(out.length, 40);
      assert.equal(out, long.slice(0, 40));
    });
    it("uses MAX_INPUT_TOKENS as the default budget", () => {
      const long = "a".repeat(MAX_INPUT_TOKENS * 4 + 10);
      const out = budgetText(long);
      assert.equal(out.length, MAX_INPUT_TOKENS * 4);
    });
  });

  describe("extractSnippet", () => {
    const code = "line0\nline1\nline2\nline3\nline4\nline5\nline6\nline7\nline8\nline9\n";

    it("returns a window around the cursor line", () => {
      const { snippet, startLine } = extractSnippet(code, 5, 2, 2);
      assert.equal(startLine, 3);
      const lines = snippet.split("\n");
      assert.ok(lines.includes("line2"));
      assert.ok(lines.includes("line5"));
      assert.ok(lines.includes("line6"));
      assert.ok(!lines.includes("line7"));
    });

    it("clamps the start at line 1", () => {
      const { snippet, startLine } = extractSnippet(code, 0, 10, 10);
      assert.equal(startLine, 1);
      assert.ok(snippet.includes("line0"));
    });

    it("clamps the end at the last line", () => {
      const { snippet, startLine } = extractSnippet(code, 10, 0, 0);
      assert.equal(startLine, 10);
      assert.equal(snippet, "line9");
    });
  });

  describe("insertCursorMarker", () => {
    it("inserts the marker at the cursor column", () => {
      const out = insertCursorMarker("abc\ndef\n", 1, 2, 1);
      assert.equal(out, "a⟦CURSOR⟧bc\ndef\n");
    });

    it("clamps the column to the line length", () => {
      const out = insertCursorMarker("ab\n", 1, 99, 1);
      assert.equal(out, "ab⟦CURSOR⟧\n");
    });

    it("returns the snippet unchanged when the local line is out of range", () => {
      assert.equal(insertCursorMarker("ab\n", 5, 1, 1), "ab\n");
    });
  });

  describe("stripCompletionFences", () => {
    it("removes fenced code markers and cursor markers", () => {
      const out = stripCompletionFences("```ts\nconst x = 1⟦CURSOR⟧\n```\n");
      assert.equal(out, "const x = 1");
    });

    it("trims surrounding whitespace", () => {
      assert.equal(stripCompletionFences("  hello  "), "hello");
    });
  });
});
