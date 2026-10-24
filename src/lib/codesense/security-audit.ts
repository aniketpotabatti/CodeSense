import type { ReviewRisk } from "./types";

/**
 * Severity levels for security findings. "critical" is mapped to "high"
 * when stored as ReviewRisk since ReviewSeverity is low|medium|high.
 * The badge layer renders both critical and high as the danger variant.
 */
export type SecuritySeverity = "critical" | "high" | "medium" | "low";

export interface SecurityRule {
  id: string;
  name: string;
  severity: SecuritySeverity;
  pattern: RegExp;
  /** Empty array means applies to all languages. */
  languages: string[];
  message: (matched: string) => string;
}

const SECURITY_RULES: SecurityRule[] = [
  // --- Hardcoded secrets / credentials (all languages) ---
  {
    id: "hardcoded-secret",
    name: "Hardcoded secret",
    severity: "critical",
    pattern:
      /(api[_-]?key|apikey|API_KEY|secret[_-]?key|secretKey|password|passwd|pwd|access[_-]?token|auth[_-]?token|private[_-]?key|secret)\s*[:=]\s*["'][^"']{8,}["']/i,
    languages: [],
    message: () => "Potential hardcoded secret or credential detected.",
  },
  // --- SQL injection (all languages) ---
  {
    id: "sql-injection",
    name: "SQL injection via string concatenation",
    severity: "high",
    pattern:
      /\b(query|execute|all|get|run|find|raw)\s*\([^)]*['"`][^'"]*\+\s*[^'")]*['"`]/i,
    languages: [],
    message: () =>
      "Possible SQL injection via string concatenation in a database query.",
  },
  // --- Unsafe eval / dynamic code execution (all languages) ---
  {
    id: "unsafe-eval",
    name: "Unsafe eval()",
    severity: "high",
    pattern: /\beval\s*\(/,
    languages: [],
    message: () => "eval() can execute arbitrary code.",
  },
  {
    id: "new-function",
    name: "Dynamic Function constructor",
    severity: "high",
    pattern: /\bnew\s+Function\s*\(/,
    languages: [],
    message: () => "new Function() can execute arbitrary code.",
  },
  // --- Prototype pollution (JavaScript/TypeScript) ---
  {
    id: "prototype-pollution",
    name: "Prototype pollution",
    severity: "high",
    pattern: /__proto__/,
    languages: ["javascript", "typescript"],
    message: () =>
      "Direct __proto__ access may lead to prototype pollution.",
  },
  // --- XSS (JavaScript/TypeScript) ---
  {
    id: "innerhtml-assignment",
    name: "innerHTML assignment",
    severity: "medium",
    pattern: /\.innerHTML\s*=/,
    languages: ["javascript", "typescript"],
    message: () =>
      "innerHTML assignment may lead to cross-site scripting (XSS).",
  },
  {
    id: "document-write",
    name: "document.write()",
    severity: "medium",
    pattern: /\bdocument\.write\s*\(/,
    languages: ["javascript", "typescript"],
    message: () =>
      "document.write() may lead to cross-site scripting (XSS).",
  },
  // --- Python-specific ---
  {
    id: "pickle-loads",
    name: "Unsafe pickle deserialization",
    severity: "high",
    pattern: /\bpickle\.loads\s*\(/,
    languages: ["python"],
    message: () =>
      "pickle.loads() can execute arbitrary code during deserialization.",
  },
  {
    id: "os-system",
    name: "Unsafe shell command execution",
    severity: "high",
    pattern: /\b(os\.system|subprocess\.(call|run|Popen|check_output))\s*\(/,
    languages: ["python"],
    message: () =>
      "Shell command execution may lead to command injection.",
  },
  // --- ReDoS (all languages) ---
  {
    id: "redos",
    name: "Potential ReDoS (nested quantifiers)",
    severity: "medium",
    pattern: /\(\s*[^)]*[+*?]\s*\)\s*[+*?]/,
    languages: [],
    message: () =>
      "Nested quantifiers in a regular expression may cause ReDoS.",
  },
];

const SEVERITY_ORDER: Record<SecuritySeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * Static, client-side security audit of source code.
 * Scans line-by-line for known insecure patterns and returns findings
 * as ReviewRisk objects (severity "critical" is stored as "high" for
 * compatibility with ReviewSeverity; the badge layer renders it as danger).
 */
export function auditSecurity(
  source: string,
  language: string,
): ReviewRisk[] {
  const findings: ReviewRisk[] = [];
  const lines = source.split("\n");
  const lang = language.toLowerCase();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    for (const rule of SECURITY_RULES) {
      if (rule.languages.length > 0 && !rule.languages.includes(lang)) continue;
      if (!rule.pattern.test(line)) continue;

      findings.push({
        line: lineNumber,
        severity: rule.severity as "low" | "medium" | "high",
        msg: rule.message(line),
      });
    }
  }

  findings.sort((a, b) => {
    const aOrder = SEVERITY_ORDER[a.severity as SecuritySeverity] ?? 0;
    const bOrder = SEVERITY_ORDER[b.severity as SecuritySeverity] ?? 0;
    if (bOrder !== aOrder) return bOrder - aOrder;
    return (a.line ?? 0) - (b.line ?? 0);
  });

  return findings;
}