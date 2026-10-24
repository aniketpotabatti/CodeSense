export const MODES = ["explain", "review", "suggest", "test"] as const;
export type Mode = (typeof MODES)[number];

export type GatewayErrorCode =
  | "INVALID_MODE"
  | "EMPTY_SNIPPET"
  | "TOKEN_LIMIT_EXCEEDED"
  | "RATE_LIMITED"
  | "PROVIDER_TIMEOUT"
  | "AI_UNAVAILABLE"
  | "BAD_REQUEST"
  | "PROVIDER_ERROR";

export type GatewayError = {
  error: GatewayErrorCode;
  message: string;
  retryAfter?: number;
};

export type ContextFile = {
  name: string;
  language: string;
  content: string;
};

export type CodesenseRequest = {
  mode: Mode;
  language: string;
  snippet: string;
  cursorLine: number;
  cursorCol: number;
  /** Other open tabs to include as background context (optional). */
  contextFiles?: ContextFile[];
};

export type StreamStatus = "idle" | "streaming" | "done" | "error";

export type StreamingMetrics = {
  ttftMs: number | null;
  tps: number | null;
  outputTokens: number;
  startTime: number | null;
  estimatedCostUsd: number | null;
};

export type ReviewSeverity = "low" | "medium" | "high";

export type ReviewRisk = {
  line: number | null;
  severity: ReviewSeverity;
  msg: string;
};

export type ReviewRefactor = {
  diff: string;
  description?: string;
} | null;

export type ParsedReview = {
  summary: string;
  walkthrough: string;
  risks: ReviewRisk[];
  refactor: ReviewRefactor;
};

export type ParsedTest = {
  framework: string;
  description: string;
  code: string;
  testCases: Array<{ name: string; description: string }>;
};

export type FileTab = {
  id: string;
  name: string;
  language: string;
  content: string;
};

export type Settings = {
  explainOnSelect: boolean;
  reviewOnSave: boolean;
  suggestOnIdle: boolean;
  testOnSave: boolean;
  debounceMs: number;
  theme: "dark" | "light";
  apiKey: string;
  /** Include other open file tabs as context when explaining / reviewing. */
  includeContext: boolean;
};

export const LANGUAGES = [
  { id: "typescript", label: "TypeScript" },
  { id: "javascript", label: "JavaScript" },
  { id: "python", label: "Python" },
  { id: "go", label: "Go" },
  { id: "rust", label: "Rust" },
  { id: "java", label: "Java" },
  { id: "json", label: "JSON" },
  { id: "html", label: "HTML" },
  { id: "css", label: "CSS" },
  { id: "sql", label: "SQL" },
  { id: "markdown", label: "Markdown" },
] as const;

export type LanguageId = (typeof LANGUAGES)[number]["id"];

export const DEFAULT_SETTINGS: Settings = {
  explainOnSelect: true,
  reviewOnSave: true,
  suggestOnIdle: true,
  testOnSave: false,
  debounceMs: 600,
  theme: "dark",
  apiKey: "",
  includeContext: true,
};

export const MAX_INPUT_TOKENS = 800;
export const MAX_OUTPUT_TOKENS: Record<Mode, number> = {
  explain: 400,
  review: 600,
  suggest: 180,
  test: 500,
};


