export const MODES = ["explain", "review", "suggest"] as const;
export type Mode = (typeof MODES)[number];

export type GatewayErrorCode =
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

export type CodesenseRequest = {
  mode: Mode;
  language: string;
  snippet: string;
  cursorLine: number;
  cursorCol: number;
};

export type StreamStatus = "idle" | "streaming" | "done" | "error";

export type ParsedReview = {
  good: string[];
  improve: string[];
  refactor: string[];
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
  debounceMs: number;
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
  debounceMs: 600,
};

export const MAX_INPUT_TOKENS = 800;
export const MAX_OUTPUT_TOKENS: Record<Mode, number> = {
  explain: 400,
  review: 600,
  suggest: 180,
};
