import type { LanguageId } from "./types.ts";

export type BigOClass =
  | "O(1)"
  | "O(log n)"
  | "O(n)"
  | "O(n log n)"
  | "O(n^2)"
  | "O(n^3)"
  | "O(2^n)"
  | "unknown";

export interface ComplexityFunction {
  name: string;
  /** 1-based line where the function declaration starts. */
  startLine: number;
  /** 1-based line where the function ends (approximate). */
  endLine: number;
  lines: number;
  cyclomatic: number;
}

export interface ComplexityIssue {
  line: number;
  kind:
    | "high-complexity"
    | "deep-nesting"
    | "long-function"
    | "memory-hazard"
    | "dynamic-code";
  severity: "low" | "medium" | "high";
  message: string;
}

export interface ComplexityReport {
  language: string;
  lines: number;
  functions: ComplexityFunction[];
  cyclomatic: number;
  maxNestingDepth: number;
  estimatedTime: BigOClass;
  estimatedSpace: BigOClass;
  issues: ComplexityIssue[];
  /** Maintainability score, 0-100 (higher is better). */
  score: number;
}

/** Flags used to turn raw metrics into actionable issues. */
const COMPLEXITY_THRESHOLD = 10;
const HIGH_COMPLEXITY_THRESHOLD = 20;
const NESTING_THRESHOLD = 4;
const DEEP_NESTING_THRESHOLD = 5;
const LONG_FUNCTION_LINES = 60;

/**
 * Function-declaration patterns per language.
 * Heuristic: the first capturing group holds the function name.
 * Languages without a pattern (json, html, css, sql, markdown) fall back to
 * whole-file analysis and report no functions.
 */
const FUNCTION_STARTS: Record<string, RegExp[]> = {
  typescript: [
    /^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)/,
    /^\s*(?:const|let|var)\s+(\w+)\s*[:=]\s*(?:async\s*)?\(/,
    /^\s*(?!if\b|else\b|for\b|while\b|do\b|switch\b|catch\b|return\b|throw\b|try\b)(\w+)\s*\([^)]*\)\s*[{;]/,
  ],
  javascript: [
    /^\s*(?:async\s+)?function\s+(\w+)/,
    /^\s*(?:const|let|var)\s+(\w+)\s*[:=]\s*(?:async\s*)?\(/,
    /^\s*(?!if\b|else\b|for\b|while\b|do\b|switch\b|catch\b|return\b|throw\b|try\b)(\w+)\s*\([^)]*\)\s*[{;]/,
  ],
  python: [/^\s*(?:async\s+)?def\s+(\w+)/],
  go: [/^\s*(?:\([^)]*\)\s*)?func\s+(\w+)/],
  rust: [/^\s*(?:pub\s+)?(?:async\s+)?fn\s+(\w+)/],
  java: [
    /^\s*(?:public|private|protected|static|final|abstract|native|synchronized|strictfp|\s)*(?:<\s*[^<>]*>\s*)?[\w.<>,]+\s+(\w+)\s*\([^)]*\)\s*[{;]/,
  ],
};

const DECISION_PATTERNS: RegExp[] = [
  /\bif\b/,
  /\belse if\b/,
  /\bfor\b/,
  /\bwhile\b/,
  /\bdo\b/,
  /\bcatch\b/,
  /\bcase\b/,
  /\bthrow\b/,
  /&&/,
  /\|\|/,
  /\?\?/,
];

const LOOP_PATTERN = /\b(for|while|do\b|foreach)\b/;
const RECURSION_HINT = /\b(mid|low|high|left|right)\b/;

/** Strip a trailing line comment so "// if (...)" isn't counted as a decision. */
function stripLineComment(line: string, language: string): string {
  const idx =
    language === "python" ? line.indexOf("#") : line.indexOf("//");
  return idx === -1 ? line : line.slice(0, idx);
}

function countTernaryOperators(line: string): number {
  const questionMarks = (line.match(/\?/g) ?? []).length;
  const nullish = (line.match(/\?\?/g) ?? []).length;
  return Math.max(0, questionMarks - nullish);
}

/**
 * Count cyclomatic decision points on a single line: branches, loops, logical
 * operators, ternary operators, throws, and case clauses.
 */
function countDecisionPoints(line: string): number {
  let count = 0;
  for (const pattern of DECISION_PATTERNS) {
    count += (line.match(pattern) ?? []).length;
  }
  return count + countTernaryOperators(line);
}

function matchFunctionStart(
  line: string,
  patterns: RegExp[],
): string | null {
  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (!match) continue;
    for (let g = 1; g < match.length; g++) {
      if (match[g] !== undefined) return match[g];
    }
  }
  return null;
}

function collectFunctionStarts(
  lines: string[],
  language: string,
): { line: number; name: string }[] {
  const patterns = FUNCTION_STARTS[language];
  if (!patterns) return [];
  const starts: { line: number; name: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const name = matchFunctionStart(lines[i], patterns);
    if (name) starts.push({ line: i + 1, name });
  }
  return starts;
}

type AnalyzedFunction = {
  name: string;
  startLine: number;
  endLine: number;
  lines: number;
  cyclomatic: number;
  maxNestingDepth: number;
  maxLoopDepth: number;
  recursion: boolean;
};

function analyzeFunction(
  lines: string[],
  startLine: number,
  endLine: number, // exclusive, 1-based
  name: string,
  language: string,
): AnalyzedFunction {
  const bodyLines = lines.slice(startLine - 1, endLine);
  let decisions = 0;
  let braceDepth = 0;
  let maxBraceDepth = 0;
  let maxLoopDepth = 0;
  let recursion = false;
  const recursionPattern = new RegExp(
    `\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\(`,
  );

  for (let i = 0; i < bodyLines.length; i++) {
    const raw = bodyLines[i];
    // The first line is the declaration: count decisions, but skip its braces
    // (assumed to be the function's own opening brace).
    if (i === 0) {
      decisions += countDecisionPoints(stripLineComment(raw, language));
      continue;
    }
    const line = stripLineComment(raw, language);
    decisions += countDecisionPoints(line);

    const depthBefore = Math.max(0, braceDepth);
    if (LOOP_PATTERN.test(line)) {
      maxLoopDepth = Math.max(maxLoopDepth, depthBefore + 1);
    }
    if (recursionPattern.test(line)) recursion = true;

    const openBraces = (line.match(/{/g) ?? []).length;
    const closeBraces = (line.match(/}/g) ?? []).length;
    braceDepth += openBraces;
    const depthOpen = Math.max(0, braceDepth);
    if (depthOpen > maxBraceDepth) maxBraceDepth = depthOpen;
    braceDepth -= closeBraces;
    const depth = Math.max(0, braceDepth);
    if (depth > maxBraceDepth) maxBraceDepth = depth;
  }

  return {
    name,
    startLine,
    endLine,
    lines: endLine - startLine + 1,
    cyclomatic: Math.max(1, decisions + 1),
    maxNestingDepth: maxBraceDepth,
    maxLoopDepth,
    recursion,
  };
}

function estimateBigOTime(
  maxLoopDepth: number,
  recursion: boolean,
  hasLogHint: boolean,
): BigOClass {
  if (recursion) return "O(2^n)";
  if (maxLoopDepth >= 3) return "O(n^3)";
  if (maxLoopDepth === 2) return "O(n^2)";
  if (maxLoopDepth === 1) return hasLogHint ? "O(log n)" : "O(n)";
  return "O(1)";
}

function estimatedSpace(recursion: boolean): BigOClass {
  return recursion ? "O(n)" : "O(1)";
}

function firstLineMatching(lines: string[], pattern: RegExp): number | null {
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) return i + 1;
  }
  return null;
}

function collectIssues(
  lines: string[],
  functions: AnalyzedFunction[],
  language: string,
): ComplexityIssue[] {
  const issues: ComplexityIssue[] = [];
  const source = lines.join("\n");
  const lang = language.toLowerCase();

  const hasRemoveEventListener = /\bremoveEventListener\s*\(/.test(source);
  const hasClearTimer = /\bclear(?:Interval|Timeout)\s*\(/.test(source);
  const hasOff = /\.\s*off\s*\(/.test(source);

  for (const fn of functions) {
    if (fn.cyclomatic >= HIGH_COMPLEXITY_THRESHOLD) {
      issues.push({
        line: fn.startLine,
        kind: "high-complexity",
        severity: "high",
        message: `Function “${fn.name}” has very high cyclomatic complexity (${fn.cyclomatic}). Consider splitting it into smaller functions.`,
      });
    } else if (fn.cyclomatic >= COMPLEXITY_THRESHOLD) {
      issues.push({
        line: fn.startLine,
        kind: "high-complexity",
        severity: "medium",
        message: `Function “${fn.name}” has elevated cyclomatic complexity (${fn.cyclomatic}).`,
      });
    }
    if (fn.maxNestingDepth >= DEEP_NESTING_THRESHOLD) {
      issues.push({
        line: fn.startLine,
        kind: "deep-nesting",
        severity: "high",
        message: `Function “${fn.name}” is deeply nested (depth ${fn.maxNestingDepth}).`,
      });
    } else if (fn.maxNestingDepth >= NESTING_THRESHOLD) {
      issues.push({
        line: fn.startLine,
        kind: "deep-nesting",
        severity: "medium",
        message: `Function “${fn.name}” has deep nesting (depth ${fn.maxNestingDepth}).`,
      });
    }
    if (fn.lines >= LONG_FUNCTION_LINES) {
      issues.push({
        line: fn.startLine,
        kind: "long-function",
        severity: "low",
        message: `Function “${fn.name}” is ${fn.lines} lines long. Consider extracting parts of it.`,
      });
    }
  }

  if (/\baddEventListener\s*\(/.test(source) && !hasRemoveEventListener) {
    const line = firstLineMatching(lines, /\baddEventListener\s*\(/);
    if (line != null) {
      issues.push({
        line,
        kind: "memory-hazard",
        severity: "medium",
        message:
          "Event listener added with addEventListener() but no removeEventListener() found — potential memory leak.",
      });
    }
  }
  if (/\bset(?:Interval|Timeout)\s*\(/.test(source) && !hasClearTimer) {
    const line = firstLineMatching(lines, /\bset(?:Interval|Timeout)\s*\(/);
    if (line != null) {
      issues.push({
        line,
        kind: "memory-hazard",
        severity: "medium",
        message:
          "Timer created with setInterval()/setTimeout() but no clearInterval()/clearTimeout() found — potential memory leak.",
      });
    }
  }
  if (
    lang !== "python" &&
    /\.\s*on\s*\(/.test(source) &&
    !hasOff
  ) {
    const line = firstLineMatching(lines, /\.\s*on\s*\(/);
    if (line != null) {
      issues.push({
        line,
        kind: "memory-hazard",
        severity: "medium",
        message:
          "Event listener attached with .on() but no .off() found — potential memory leak.",
      });
    }
  }
  if (lang === "python" && /\bopen\s*\(/.test(source)) {
    const hasWith = /\bwith\b/.test(source);
    const hasClose = /\.close\s*\(/.test(source);
    if (!hasWith && !hasClose) {
      const line = firstLineMatching(lines, /\bopen\s*\(/);
      if (line != null) {
        issues.push({
          line,
          kind: "memory-hazard",
          severity: "medium",
          message:
            "File opened with open() but no close() or with statement found — unclosed handle.",
        });
      }
    }
  }
  if (/\beval\s*\(/.test(source) || /\bnew\s+Function\s*\(/.test(source)) {
    const line =
      firstLineMatching(lines, /\beval\s*\(/) ??
      firstLineMatching(lines, /\bnew\s+Function\s*\(/);
    if (line != null) {
      issues.push({
        line,
        kind: "dynamic-code",
        severity: "high",
        message:
          "Dynamic code execution (eval()/new Function()) detected — avoid; it is unsafe and opaque to static analysis.",
      });
    }
  }

  const severityOrder: Record<ComplexityIssue["severity"], number> = {
    high: 3,
    medium: 2,
    low: 1,
  };
  issues.sort((a, b) => {
    if (b.severity !== a.severity) {
      return severityOrder[b.severity] - severityOrder[a.severity];
    }
    return a.line - b.line;
  });
  return issues;
}

function computeScore(
  cyclomatic: number,
  maxNestingDepth: number,
  functions: AnalyzedFunction[],
  issues: ComplexityIssue[],
): number {
  let score = 100;
  if (cyclomatic > 50) score -= 30;
  else if (cyclomatic > HIGH_COMPLEXITY_THRESHOLD) score -= 20;
  else if (cyclomatic > COMPLEXITY_THRESHOLD) score -= 10;

  if (maxNestingDepth > 6) score -= 20;
  else if (maxNestingDepth > NESTING_THRESHOLD) score -= 10;

  const longFunctions = functions.filter((f) => f.lines >= LONG_FUNCTION_LINES)
    .length;
  score -= Math.min(15, longFunctions * 5);

  const highIssues = issues.filter((i) => i.severity === "high").length;
  const mediumIssues = issues.filter((i) => i.severity === "medium").length;
  score -= highIssues * 10 + mediumIssues * 5;

  return Math.max(0, Math.min(100, score));
}

/**
 * Static, client-side complexity profile of a source file.
 * No LLM or server round trip is involved, so this works in demo mode too.
 * All metrics are heuristic estimates, not precise compiler measurements.
 */
export function computeComplexity(source: string, language: string): ComplexityReport {
  const lines = source.split("\n");
  const lang = language.toLowerCase();
  const starts = collectFunctionStarts(lines, lang);

  const analyzed = starts.map((s, index) => {
    const next = starts[index + 1];
    let endLine = next ? next.line - 1 : lines.length;
    if (!next && /^\s*\}/.test(lines[lines.length - 1] ?? "")) endLine -= 1;
    return analyzeFunction(lines, s.line, endLine, s.name, lang);
  });

  let cyclomatic = 0;
  let maxNestingDepth = 0;
  let maxLoopDepth = 0;
  let recursion = false;

  for (const fn of analyzed) {
    cyclomatic += fn.cyclomatic;
    maxNestingDepth = Math.max(maxNestingDepth, fn.maxNestingDepth);
    maxLoopDepth = Math.max(maxLoopDepth, fn.maxLoopDepth);
    if (fn.recursion) recursion = true;
  }

  if (analyzed.length === 0) {
    let decisions = 0;
    for (const line of lines) {
      decisions += countDecisionPoints(stripLineComment(line, lang));
    }
    cyclomatic = 1 + decisions;
  }

  let hasLogHint = false;
  for (const line of lines) {
    if (RECURSION_HINT.test(line) && /\b(for|while)\b/.test(line)) {
      hasLogHint = true;
      break;
    }
  }

  const issues = collectIssues(lines, analyzed, lang);
  const estimatedTime = estimateBigOTime(maxLoopDepth, recursion, hasLogHint);
  const estimatedSpaceValue = estimatedSpace(recursion);
  const score = computeScore(cyclomatic, maxNestingDepth, analyzed, issues);

  return {
    language,
    lines: lines.length,
    functions: analyzed.map(({ name, startLine, endLine, lines, cyclomatic }) => ({
      name,
      startLine,
      endLine,
      lines,
      cyclomatic,
    })),
    cyclomatic,
    maxNestingDepth,
    estimatedTime,
    estimatedSpace: estimatedSpaceValue,
    issues,
    score,
  };
}



