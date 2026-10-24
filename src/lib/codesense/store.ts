import {
  DEFAULT_SETTINGS,
  type ContextFile,
  type FileTab,
  type ParsedReview,
  type ParsedTest,
  type Settings,
  type StreamStatus,
  type StreamingMetrics,
} from "./types";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { streamCodesense, CodesenseApiError } from "./stream.ts";
import { parseReview } from "./parse-review.ts";
import { parseTest } from "./parse-test.ts";
import { extractSnippet, stripCompletionFences } from "./snippet.ts";
import { computeComplexity, type ComplexityReport } from "./complexity.ts";
import {
  isHistoryAvailable,
  getHistoryEntries,
  saveHistoryEntry,
  deleteHistoryEntry,
  clearHistoryEntries,
  type HistoryEntry,
} from "./history.ts";
import { cloneSamples } from "./samples.ts";
import type { editor as MonacoEditor } from "monaco-editor";

export type Insight = {
  text: string;
  status: StreamStatus;
  error: string | null;
  review: ParsedReview | null;
  test: ParsedTest | null;
};

type Store = {
  files: FileTab[];
  activeFileId: string;
  cursor: { line: number; col: number };
  selection: string;
  editor: MonacoEditor.IStandaloneCodeEditor | null;
  settings: Settings;
  panelTab: "explain" | "review" | "test" | "complexity";
  coachDismissed: boolean;
  hasTyped: boolean;
  feedback: Record<string, "up" | "down">;
  rateFeedback: (key: string, kind: "up" | "down") => void;
  aiAvailable: boolean | null;
  model: string;
  remaining: number | null;
  explain: Insight;
  review: Insight;
  test: Insight;
  complexity: ComplexityReport | null;
  complexityStatus: "idle" | "done" | "error";
  complexityError: string | null;
  suggestPreview: string;
  streaming: StreamingMetrics;
  setActiveFile: (id: string) => void;
  setFileContent: (id: string, content: string) => void;
  setLanguage: (language: string) => void;
  setCursor: (line: number, col: number) => void;
  setSelection: (text: string) => void;
  setEditor: (editor: MonacoEditor.IStandaloneCodeEditor | null) => void;
  patchSettings: (patch: Partial<Settings>) => void;
  setPanelTab: (tab: "explain" | "review" | "test" | "complexity") => void;
  dismissCoach: () => void;
  markTyped: () => void;
  resetFiles: () => void;
  probeHealth: () => Promise<void>;
  runExplain: (source?: "select" | "manual") => Promise<void>;
  runReview: (source?: "save" | "manual") => Promise<void>;
  runTest: (source?: "save" | "manual") => Promise<void>;
  runComplexity: () => Promise<void>;
  runSuggest: (signal: AbortSignal) => Promise<string>;
  applySuggest: (text: string) => void;
  history: HistoryEntry[];
  historyLoaded: boolean;
  loadHistory: () => Promise<void>;
  addHistoryEntry: (entry: Omit<HistoryEntry, "id" | "timestamp">) => void;
  removeHistoryEntry: (id: string) => void;
  clearHistory: () => void;
};

const emptyInsight = (): Insight => ({
  text: "",
  status: "idle",
  error: null,
  review: null,
  test: null,
});

const controllers: {
  explain?: AbortController;
  review?: AbortController;
  test?: AbortController;
} = {};

function activeFile(state: Pick<Store, "files" | "activeFileId">): FileTab {
  return state.files.find((file) => file.id === state.activeFileId) ?? state.files[0]!;
}


/** Max total chars across all context files to keep token costs in check. */
const MAX_CONTEXT_TOTAL_CHARS = 4000;

/**
 * Collect the non-active file tabs as ContextFile objects for multi-file context.
 * Trims content so total chars stay within budget.
 */
function collectContextFiles(
  state: Pick<Store, "files" | "activeFileId" | "settings">,
): ContextFile[] {
  if (!state.settings.includeContext) return [];
  let budget = MAX_CONTEXT_TOTAL_CHARS;
  return state.files
    .filter((f) => f.id !== state.activeFileId && f.content.trim())
    .map((f): ContextFile => {
      const trimmed =
        f.content.length > budget
          ? f.content.slice(0, budget)
          : f.content;
      budget -= trimmed.length;
      return { name: f.name, language: f.language, content: trimmed };
    })
    .filter((f) => f.content.length > 0);
}
/**
 * Fetch the gateway health report: { available, model }.
 */
async function fetchAiHealth(): Promise<{
  available: boolean;
  model: string;
}> {
  const res = await fetch("/api/codesense", { method: "GET" });
  if (!res.ok) return { available: false, model: "" };
  const json = (await res.json()) as { available?: boolean; model?: string };
  return {
    available: Boolean(json.available),
    model: json.model ?? "",
  };
}

function errorMessage(err: unknown): string {
  if (err instanceof CodesenseApiError) {
    const codeLabel = err.code === err.message ? "" : `[${err.code}] `;
    return codeLabel + err.message;
  }
  if (err instanceof DOMException && err.name === "AbortError") return "";
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}

export function isRetryableClientError(code: string | undefined): boolean {
  // Only transient gateway errors are worth retrying. INVALID_MODE, EMPTY_SNIPPET,
  // and TOKEN_LIMIT_EXCEEDED are 4xx client errors Ã¢â‚¬â€ retrying them never succeeds.
  return code === "RATE_LIMITED" || code === "PROVIDER_TIMEOUT" || code === "PROVIDER_ERROR";
}

export const useCodesense = create<Store>()(
  persist(
    (set, get) => ({
      files: cloneSamples(),
      activeFileId: "retry",
      cursor: { line: 1, col: 1 },
      selection: "",
      editor: null,
      settings: DEFAULT_SETTINGS,
      panelTab: "explain",
      coachDismissed: false,
      feedback: {},
      hasTyped: false,
      aiAvailable: null,
      model: "grok-4.5",
      remaining: null,
      explain: emptyInsight(),
      review: emptyInsight(),
      test: emptyInsight(),
      complexity: null,
      complexityStatus: "idle",
      complexityError: null,
      suggestPreview: "",
      streaming: {
        ttftMs: null,
        tps: null,
        outputTokens: 0,
        startTime: null,
        estimatedCostUsd: null,
      },
      history: [],
      historyLoaded: false,

      setActiveFile: (id) => set({ activeFileId: id, selection: "" }),
      setFileContent: (id, content) =>
        set((state) => ({
          files: state.files.map((file) =>
            file.id === id ? { ...file, content } : file,
          ),
          // The profile is tied to the file's content; clear it on edit so it
          // isn't mistaken for a fresh measurement.
          complexity: null,
          complexityStatus: "idle",
          complexityError: null,
        })),
      setLanguage: (language) =>
        set((state) => ({
          files: state.files.map((file) =>
            file.id === state.activeFileId ? { ...file, language } : file,
          ),
        })),
      setCursor: (line, col) => set({ cursor: { line, col } }),
      setEditor: (editor) => set({ editor }),
      setSelection: (text) => set({ selection: text }),
      patchSettings: (patch) =>
        set((state) => ({ settings: { ...state.settings, ...patch } })),
      setPanelTab: (tab) => set({ panelTab: tab }),
      dismissCoach: () => set({ coachDismissed: true }),
      rateFeedback: (key, kind) =>
        set((state) => ({ feedback: { ...state.feedback, [key]: kind } })),
      markTyped: () => {
        if (!get().hasTyped) set({ hasTyped: true });
      },
      resetFiles: () =>
        set({
          files: cloneSamples(),
          activeFileId: "retry",
          explain: emptyInsight(),
          review: emptyInsight(),
          test: emptyInsight(),
          suggestPreview: "",
          hasTyped: false,
        }),

      probeHealth: async () => {
        const health = await fetchAiHealth();
        set({ aiAvailable: health.available, model: health.model });
      },

      runExplain: async (source = "manual") => {
        const state = get();
        if (source === "select" && !state.settings.explainOnSelect) return;
        if (state.aiAvailable === false) {
          set({
            panelTab: "explain",
            explain: {
              text: "",
              status: "error",
              error: "AI features are unavailable in this environment.",
              review: null,
              test: null,
            },
          });
          return;
        }
        const file = activeFile(state);
        const snippet = state.selection.trim()
          ? state.selection
          : extractSnippet(file.content, state.cursor.line).snippet;
        if (!snippet.trim()) return;

        controllers.explain?.abort();
        const controller = new AbortController();
        controllers.explain = controller;

        const startTime = performance.now();
        let firstDeltaTime: number | null = null;
        let outputTokens = 0;

        set({
          panelTab: "explain",
          explain: { text: "", status: "streaming", error: null, review: null, test: null },
          streaming: {
            ttftMs: null,
            tps: null,
            outputTokens: 0,
            startTime,
            estimatedCostUsd: null,
          },
        });

        try {
          let text = "";
          const { remaining } = await streamCodesense(
            {
              mode: "explain",
              language: file.language,
              snippet,
              cursorLine: state.cursor.line,
              cursorCol: state.cursor.col,
              contextFiles: collectContextFiles(state),
            },
            controller.signal,
            (delta) => {
              const now = performance.now();
              if (firstDeltaTime === null) firstDeltaTime = now;
              outputTokens += Math.max(1, Math.ceil(delta.length / 4));
              const elapsed = (now - startTime) / 1000;
              const tps = elapsed > 0 ? outputTokens / elapsed : null;
              const ttftMs = firstDeltaTime ? firstDeltaTime - startTime : null;
              const estimatedCostUsd =
                outputTokens > 0 ? outputTokens * 0.0000015 : null;
              text += delta;
              set({
                explain: {
                  text,
                  status: "streaming",
                  error: null,
                  review: null,
                  test: null,
                },
                streaming: {
                  ttftMs,
                  tps: tps ? Math.round(tps * 10) / 10 : null,
                  outputTokens,
                  startTime,
                  estimatedCostUsd: estimatedCostUsd
                    ? Math.round(estimatedCostUsd * 1000000) / 1000000
                    : null,
                },
              });
            },
          );
          set({
            remaining,
            explain: { text, status: "done", error: null, review: null, test: null },
          });
          if (source === "manual") {
            void get().addHistoryEntry({
              mode: "explain",
              language: file.language,
              fileId: file.id,
              fileName: file.name,
              snippet,
              text,
              review: null,
            });
          }
        } catch (err) {
          if (controller.signal.aborted) {
            set({
              explain: { ...get().explain, status: "idle" },
            });
            return;
          }
          const message = errorMessage(err);
          if (err instanceof CodesenseApiError && err.code === "AI_UNAVAILABLE") {
            set({ aiAvailable: false });
          }
          set({
            remaining:
              err instanceof CodesenseApiError && err.code === "RATE_LIMITED"
                ? 0
                : get().remaining,
            explain: {
              text: get().explain.text,
              status: "error",
              error: message || "Explain failed.",
              review: null,
              test: null,
            },
          });
        }
      },

      runReview: async (source = "manual") => {
        const state = get();
        if (source === "save" && !state.settings.reviewOnSave) return;
        if (state.aiAvailable === false) {
          set({
            panelTab: "review",
            review: {
              text: "",
              status: "error",
              error: "AI features are unavailable in this environment.",
              review: null,
              test: null,
            },
          });
          return;
        }
        const file = activeFile(state);
        if (!file.content.trim()) return;

        controllers.review?.abort();
        const controller = new AbortController();
        controllers.review = controller;

        const startTime = performance.now();
        let firstDeltaTime: number | null = null;
        let outputTokens = 0;

        set({
          panelTab: "review",
          review: { text: "", status: "streaming", error: null, review: null, test: null },
          streaming: {
            ttftMs: null,
            tps: null,
            outputTokens: 0,
            startTime,
            estimatedCostUsd: null,
          },
        });

        try {
          let text = "";
          const { remaining } = await streamCodesense(
            {
              mode: "review",
              language: file.language,
              snippet: file.content,
              cursorLine: state.cursor.line,
              cursorCol: state.cursor.col,
              contextFiles: collectContextFiles(state),
            },
            controller.signal,
            (delta) => {
              const now = performance.now();
              if (firstDeltaTime === null) firstDeltaTime = now;
              outputTokens += Math.max(1, Math.ceil(delta.length / 4));
              const elapsed = (now - startTime) / 1000;
              const tps = elapsed > 0 ? outputTokens / elapsed : null;
              const ttftMs = firstDeltaTime ? firstDeltaTime - startTime : null;
              const estimatedCostUsd =
                outputTokens > 0 ? outputTokens * 0.0000015 : null;
              text += delta;
              set({
                review: {
                  text,
                  status: "streaming",
                  error: null,
                  review: parseReview(text),
                  test: null,
                },
                streaming: {
                  ttftMs,
                  tps: tps ? Math.round(tps * 10) / 10 : null,
                  outputTokens,
                  startTime,
                  estimatedCostUsd: estimatedCostUsd
                    ? Math.round(estimatedCostUsd * 1000000) / 1000000
                    : null,
                },
              });
            },
          );
          set({
            remaining,
            review: {
              text,
              status: "done",
              error: null,
              review: parseReview(text),
              test: null,
            },
          });
          if (source === "manual") {
            void get().addHistoryEntry({
              mode: "review",
              language: file.language,
              fileId: file.id,
              fileName: file.name,
              snippet: file.content,
              text,
              review: parseReview(text),
            });
          }
        } catch (err) {
          if (controller.signal.aborted) {
            set({
              review: { ...get().review, status: "idle" },
            });
            return;
          }
          const message = errorMessage(err);
          if (err instanceof CodesenseApiError && err.code === "AI_UNAVAILABLE") {
            set({ aiAvailable: false });
          }
          set({
            remaining:
              err instanceof CodesenseApiError && err.code === "RATE_LIMITED"
                ? 0
                : get().remaining,
            review: {
              text: get().review.text,
              status: "error",
              error: message || "Review failed.",
              review: get().review.review,
              test: null,
            },
          });
        }
      },

      runTest: async (source = "manual") => {
        const state = get();
        if (source === "save" && !state.settings.testOnSave) return;
        if (state.aiAvailable === false) {
          set({
            panelTab: "test",
            test: {
              text: "",
              status: "error",
              error: "AI features are unavailable in this environment.",
              review: null,
              test: null,
            },
          });
          return;
        }
        const file = activeFile(state);
        if (!file.content.trim()) return;

        controllers.test?.abort();
        const controller = new AbortController();
        controllers.test = controller;

        const startTime = performance.now();
        let firstDeltaTime: number | null = null;
        let outputTokens = 0;

        set({
          panelTab: "test",
          test: {
            text: "",
            status: "streaming",
            error: null,
            review: null,
            test: null,
          },
          streaming: {
            ttftMs: null,
            tps: null,
            outputTokens: 0,
            startTime,
            estimatedCostUsd: null,
          },
        });

        try {
          let text = "";
          const { remaining } = await streamCodesense(
            {
              mode: "test",
              language: file.language,
              snippet: file.content,
              cursorLine: state.cursor.line,
              cursorCol: state.cursor.col,
              contextFiles: collectContextFiles(state),
            },
            controller.signal,
            (delta) => {
              const now = performance.now();
              if (firstDeltaTime === null) firstDeltaTime = now;
              outputTokens += Math.max(1, Math.ceil(delta.length / 4));
              const elapsed = (now - startTime) / 1000;
              const tps = elapsed > 0 ? outputTokens / elapsed : null;
              const ttftMs = firstDeltaTime ? firstDeltaTime - startTime : null;
              const estimatedCostUsd =
                outputTokens > 0 ? outputTokens * 0.0000015 : null;
              text += delta;
              set({
                test: {
                  text,
                  status: "streaming",
                  error: null,
                  review: null,
                  test: null,
                },
                streaming: {
                  ttftMs,
                  tps: tps ? Math.round(tps * 10) / 10 : null,
                  outputTokens,
                  startTime,
                  estimatedCostUsd: estimatedCostUsd
                    ? Math.round(estimatedCostUsd * 1000000) / 1000000
                    : null,
                },
              });
            },
          );
          const parsed = parseTest(text);
          set({
            remaining,
            test: {
              text,
              status: "done",
              error: null,
              review: null,
              test: parsed,
            },
          });
          if (source === "manual") {
            void get().addHistoryEntry({
              mode: "test",
              language: file.language,
              fileId: file.id,
              fileName: file.name,
              snippet: file.content,
              text,
              review: null,
            });
          }
        } catch (err) {
          if (controller.signal.aborted) {
            set({ test: { ...get().test, status: "idle" } });
            return;
          }
          const message = errorMessage(err);
          if (err instanceof CodesenseApiError && err.code === "AI_UNAVAILABLE") {
            set({ aiAvailable: false });
          }
          set({
            remaining:
              err instanceof CodesenseApiError && err.code === "RATE_LIMITED"
                ? 0
                : get().remaining,
            test: {
              text: get().test.text,
              status: "error",
              error: message || "Test generation failed.",
              review: null,
              test: get().test.test,
            },
          });
        }
      },

      runComplexity: async () => {
        const state = get();
        const file = activeFile(state);
        set({
          panelTab: "complexity",
          complexityStatus: "idle",
          complexityError: null,
        });
        try {
          const report = computeComplexity(file.content, file.language);
          set({
            panelTab: "complexity",
            complexity: report,
            complexityStatus: "done",
            complexityError: null,
          });
        } catch (err) {
          set({
            complexityStatus: "error",
            complexityError: errorMessage(err),
            complexity: null,
          });
        }
      },

      runSuggest: async (signal) => {
        const state = get();
        if (!state.settings.suggestOnIdle) return "";
        if (state.aiAvailable === false) return "";
        const file = activeFile(state);
        const { snippet } = extractSnippet(file.content, state.cursor.line);
        if (!snippet.trim()) return "";

        let text = "";
        try {
          const { remaining } = await streamCodesense(
            {
              mode: "suggest",
              language: file.language,
              snippet,
              cursorLine: state.cursor.line,
              cursorCol: state.cursor.col,
            },
            signal,
            (delta) => {
              text += delta;
              set({ suggestPreview: stripCompletionFences(text) });
            },
          );
          const cleaned = stripCompletionFences(text);
          set({ remaining, suggestPreview: cleaned });
          return cleaned;
        } catch (err) {
          if (signal.aborted) return "";
          const message = errorMessage(err);
          set({
            suggestPreview: message ? "Error: " + message : "",
          });
          return "";
        }
      },

      applySuggest: (text) => {
        const editor = get().editor;
        if (!editor) return;
        const pos = editor.getPosition();
        if (!pos) return;
        editor.executeEdits("", [
          {
            range: {
              startLineNumber: pos.lineNumber,
              startColumn: pos.column,
              endLineNumber: pos.lineNumber,
              endColumn: pos.column,
            },
            text,
            forceMoveMarkers: true,
          },
        ]);
      },

      loadHistory: async () => {
        if (!isHistoryAvailable()) {
          set({ historyLoaded: true });
          return;
        }
        try {
          const entries = await getHistoryEntries();
          set({ history: entries, historyLoaded: true });
        } catch {
          set({ historyLoaded: true });
        }
      },

      addHistoryEntry: (entry) => {
        const full: HistoryEntry = {
          ...entry,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
        };
        if (isHistoryAvailable()) {
          void saveHistoryEntry(full).catch(() => undefined);
        }
        set((state) => ({
          history: [full, ...state.history].slice(0, 100),
        }));
      },

      removeHistoryEntry: (id: string) => {
        if (isHistoryAvailable()) {
          void deleteHistoryEntry(id).catch(() => undefined);
        }
        set((state) => ({
          history: state.history.filter((entry) => entry.id !== id),
        }));
      },

      clearHistory: () => {
        if (isHistoryAvailable()) {
          void clearHistoryEntries().catch(() => undefined);
        }
        set({ history: [] });
      },
    }),
    {
      name: "codesense-v1",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({
        files: state.files,
        activeFileId: state.activeFileId,
        settings: state.settings,
        coachDismissed: state.coachDismissed,
        feedback: state.feedback,
      }),
    },
  ),
);

export function getActiveFile(state: Store = useCodesense.getState()): FileTab {
  return activeFile(state);
}
