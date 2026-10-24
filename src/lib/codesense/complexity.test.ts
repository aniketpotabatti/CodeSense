import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeComplexity } from "./complexity.ts";
import type { ComplexityReport } from "./complexity.ts";

function profile(source: string, language: string): ComplexityReport {
  return computeComplexity(source, language);
}

describe("complexity", () => {
  describe("empty / trivial input", () => {
    it("reports a trivial score for empty source", () => {
      const report = profile("", "typescript");
      assert.equal(report.lines, 1);
      assert.equal(report.functions.length, 0);
      assert.equal(report.cyclomatic, 1);
      assert.equal(report.estimatedTime, "O(1)");
      assert.equal(report.estimatedSpace, "O(1)");
      assert.equal(report.score, 100);
      assert.equal(report.issues.length, 0);
    });

    it("reports a straight-line function as cyclomatic 1", () => {
      const report = profile(
        "function f(x: number): number {\n  return x * 2;\n}",
        "typescript",
      );
      assert.equal(report.functions.length, 1);
      assert.equal(report.functions[0].name, "f");
      assert.equal(report.functions[0].startLine, 1);
      assert.equal(report.functions[0].lines, 2);
      assert.equal(report.cyclomatic, 1);
      assert.equal(report.score, 100);
    });
  });

  describe("cyclomatic complexity", () => {
    it("counts if branches as decisions", () => {
      const report = profile(
        "function f(x: number): number {\n  if (x > 0) return 1;\n  return 2;\n}",
        "typescript",
      );
      assert.equal(report.functions[0].cyclomatic, 2);
      assert.equal(report.cyclomatic, 2);
    });

    it("counts logical operators and ternaries", () => {
      const report = profile(
        "function f(a: boolean, b: boolean): number {\n  return a && b ? 1 : 0;\n}",
        "typescript",
      );
      // && (1) + ternary ? (1) = 2 decisions -> cyclomatic 3
      assert.equal(report.functions[0].cyclomatic, 3);
    });

    it("counts case clauses", () => {
      const report = profile(
        "function f(x: number): number {\n  switch (x) {\n    case 1: return 1;\n    case 2: return 2;\n    default: return 0;\n  }\n}",
        "typescript",
      );
      // 2 cases -> cyclomatic 3
      assert.equal(report.functions[0].cyclomatic, 3);
    });

    it("detects recursion and estimates exponential time", () => {
      const report = profile(
        "function fib(n: number): number {\n  if (n <= 1) return n;\n  return fib(n - 1) + fib(n - 2);\n}",
        "typescript",
      );
      assert.equal(report.estimatedTime, "O(2^n)");
      assert.equal(report.estimatedSpace, "O(n)");
    });

    it("flags high cyclomatic complexity", () => {
      let body = "";
      for (let i = 0; i < 25; i++) {
        body += "  if (true) return 1;\n";
      }
      const report = profile("function f() {\n" + body + "}", "typescript");
      assert.ok(report.cyclomatic > 20);
      const high = report.issues.filter(
        (i) => i.kind === "high-complexity" && i.severity === "high",
      );
      assert.equal(high.length, 1);
      assert.ok(report.score < 100);
    });
  });

  describe("Big-O estimation", () => {
    it("estimates a single loop as O(n)", () => {
      const report = profile(
        "function f(n: number): void {\n  for (let i = 0; i < n; i++) {}\n}",
        "typescript",
      );
      assert.equal(report.estimatedTime, "O(n)");
    });

    it("estimates nested loops as O(n^2)", () => {
      const report = profile(
        "function f(n: number): void {\n  for (let i = 0; i < n; i++) {\n    for (let j = 0; j < n; j++) {}\n  }\n}",
        "typescript",
      );
      assert.equal(report.estimatedTime, "O(n^2)");
    });

    it("estimates three nested loops as O(n^3)", () => {
      const report = profile(
        "function f(n: number): void {\n  for (let i = 0; i < n; i++) {\n    for (let j = 0; j < n; j++) {\n      for (let k = 0; k < n; k++) {}\n    }\n  }\n}",
        "typescript",
      );
      assert.equal(report.estimatedTime, "O(n^3)");
    });

    it("estimates loop-free code as O(1)", () => {
      const report = profile(
        "function f(x: number): number {\n  return x + 1;\n}",
        "typescript",
      );
      assert.equal(report.estimatedTime, "O(1)");
    });
  });

  describe("nesting and long functions", () => {
    it("tracks max nesting depth", () => {
      const report = profile(
        "function f() {\n  if (a) {\n    if (b) {\n      if (c) {\n        if (d) {\n          if (e) {}\n        }\n      }\n    }\n  }\n}",
        "typescript",
      );
      assert.equal(report.maxNestingDepth, 5);
      assert.ok(
        report.issues.some((i) => i.kind === "deep-nesting"),
      );
    });

    it("flags long functions", () => {
      const body = "  // line\n".repeat(70);
      const report = profile("function f() {\n" + body + "}", "typescript");
      assert.ok(report.functions[0].lines >= 60);
      assert.ok(report.issues.some((i) => i.kind === "long-function"));
    });
  });

  describe("memory hazards", () => {
    it("flags addEventListener without removeEventListener", () => {
      const report = profile(
        "element.addEventListener('click', handler);",
        "typescript",
      );
      const hazard = report.issues.find((i) => i.kind === "memory-hazard");
      assert.ok(hazard);
      assert.equal(hazard!.severity, "medium");
      assert.ok(hazard!.message.includes("addEventListener"));
    });

    it("does not flag when removeEventListener is present", () => {
      const report = profile(
        "el.addEventListener('click', h); el.removeEventListener('click', h);",
        "typescript",
      );
      assert.equal(
        report.issues.filter((i) => i.kind === "memory-hazard").length,
        0,
      );
    });

    it("flags timers without clear", () => {
      const report = profile("setInterval(tick, 1000);", "javascript");
      assert.ok(
        report.issues.some((i) =>
          i.kind === "memory-hazard" && i.message.includes("Timer"),
        ),
      );
    });

    it("flags .on() without .off()", () => {
      const report = profile("socket.on('msg', cb);", "typescript");
      assert.ok(
        report.issues.some((i) => i.kind === "memory-hazard"),
      );
    });

    it("flags eval as high severity", () => {
      const report = profile("eval(input);", "javascript");
      const dynamic = report.issues.find((i) => i.kind === "dynamic-code");
      assert.ok(dynamic);
      assert.equal(dynamic!.severity, "high");
    });

    it("flags python open() without close/with", () => {
      const report = profile("f = open('path.txt')\ndata = f.read()", "python");
      assert.ok(
        report.issues.some((i) => i.message.includes("unclosed handle")),
      );
    });
  });

  describe("languages", () => {
    it("detects python functions", () => {
      const report = profile(
        "def reachable(graph, start):\n    return start\n",
        "python",
      );
      assert.equal(report.functions.length, 1);
      assert.equal(report.functions[0].name, "reachable");
    });

    it("detects go functions", () => {
      const report = profile(
        "func Run(ctx context.Context, workers int, jobs []Job) error {\n  return nil\n}",
        "go",
      );
      assert.equal(report.functions.length, 1);
      assert.equal(report.functions[0].name, "Run");
    });

    it("detects rust functions", () => {
      const report = profile(
        "fn merge_sorted(a: &[i32], b: &[i32]) -> Vec<i32> {\n  let mut out = Vec::new();\n  return out;\n}",
        "rust",
      );
      assert.equal(report.functions[0].name, "merge_sorted");
    });

    it("detects java methods", () => {
      const report = profile(
        "public static <T> List<T> unique(List<T> items) {\n  return items;\n}",
        "java",
      );
      assert.equal(report.functions.length, 1);
      assert.equal(report.functions[0].name, "unique");
    });

    it("falls back to whole-file analysis for languages without function patterns", () => {
      const report = profile("if (a) { b(); } else { c(); }", "sql");
      assert.equal(report.functions.length, 0);
      assert.equal(report.cyclomatic, 2);
    });
  });
});