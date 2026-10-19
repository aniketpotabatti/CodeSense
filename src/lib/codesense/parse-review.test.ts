// parse-review guardrails — strict JSON review parsing.
// Runs with `node --test` (no toolchain needed).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseReview } from "./parse-review.ts";

const validReview = JSON.stringify({
  summary: "A small utility that formats logs.",
  walkthrough: "It reads input, transforms each line, and writes output.",
  risks: [
    { line: 3, severity: "high", msg: "Unchecked parse can throw." },
    { line: null, severity: "low", msg: "Add a docstring." },
  ],
  refactor: {
    diff: "try { parse(input) } catch (e) { handle(e) }",
    description: "Avoid crashing on bad input.",
  },
});

describe("parseReview", () => {
  it("parses strict JSON review output", () => {
    const parsed = parseReview(validReview);
    assert.ok(parsed);
    assert.equal(parsed!.summary, "A small utility that formats logs.");
    assert.equal(parsed!.walkthrough, "It reads input, transforms each line, and writes output.");
    assert.equal(parsed!.risks.length, 2);
    assert.equal(parsed!.risks[0].line, 3);
    assert.equal(parsed!.risks[0].severity, "high");
    assert.equal(parsed!.risks[0].msg, "Unchecked parse can throw.");
    assert.equal(parsed!.risks[1].line, null);
    assert.equal(parsed!.refactor?.diff, "try { parse(input) } catch (e) { handle(e) }");
    assert.equal(parsed!.refactor?.description, "Avoid crashing on bad input.");
  });

  it("parses JSON wrapped in markdown fences", () => {
    const wrapped = "```json\n" + validReview + "\n```";
    const parsed = parseReview(wrapped);
    assert.ok(parsed);
    assert.equal(parsed!.summary, "A small utility that formats logs.");
  });

  it("parses JSON wrapped in unfenced markdown blocks", () => {
    const wrapped = "Here is the review:\n```\n" + validReview + "\n```\nDone.";
    const parsed = parseReview(wrapped);
    assert.ok(parsed);
    assert.equal(parsed!.risks.length, 2);
  });

  it("coerces an unknown severity to medium", () => {
    const parsed = parseReview(
      JSON.stringify({
        summary: "s",
        walkthrough: "w",
        risks: [{ line: 1, severity: "critical", msg: "x" }],
        refactor: null,
      }),
    );
    assert.ok(parsed);
    assert.equal(parsed!.risks[0].severity, "medium");
  });

  it("coerces a numeric line passed as a string", () => {
    const parsed = parseReview(
      JSON.stringify({
        summary: "s",
        walkthrough: "w",
        risks: [{ line: "4", severity: "low", msg: "x" }],
        refactor: null,
      }),
    );
    assert.ok(parsed);
    assert.equal(parsed!.risks[0].line, 4);
  });

  it("allows empty risks and a missing refactor", () => {
    const parsed = parseReview(
      JSON.stringify({ summary: "s", walkthrough: "w", risks: [], refactor: null }),
    );
    assert.ok(parsed);
    assert.equal(parsed!.risks.length, 0);
    assert.equal(parsed!.refactor, null);
  });

  it("returns null for missing required fields", () => {
    assert.equal(
      parseReview(JSON.stringify({ walkthrough: "w", risks: [], refactor: null })),
      null,
    );
    assert.equal(
      parseReview(JSON.stringify({ summary: "s", risks: [], refactor: null })),
      null,
    );
  });

  it("returns null for garbage input", () => {
    assert.equal(parseReview("not json at all"), null);
    assert.equal(parseReview("```json\n{ bad\n```"), null);
    assert.equal(parseReview(""), null);
  });
});
