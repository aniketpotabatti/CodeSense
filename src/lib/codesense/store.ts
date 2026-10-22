import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  clearHistoryEntries,
  deleteHistoryEntry,
  getHistoryEntries,
  isHistoryAvailable,
  saveHistoryEntry,
  type HistoryEntry,
} from "./history";
import { parseReview } from "./parse-review";
import { cloneSamples } from "./samples";
import { extractSnippet, stripCompletionFences } from "./snippet";
import { CodesenseApiError, fetchAiHealth, streamCodesense } from "./stream";
import type { editor as MonacoEditor } from "monaco-editor";
import {
  DEFAULT_SETTINGS,
  type FileTab,
  type Mode,
  type ParsedReview,
  type Settings,
  type StreamStatus,
} from "./types";

export type Insight = {
  text: string;
  status: StreamStatus;
  error: string | null;
  review: ParsedReview | null;
};

type Store = {
  files: FileTab[];
  activeFileId: string;
  cursor: { line: number; col: number };
  selection: string;
  editor: MonacoEditor.IStandaloneCodeEditor | null;
  settings: Settings;
  panelTab: Exclude<Mode, "suggest">;
  coachDismissed: boolean;
  hasTyped: boolean;
  feedback: Record<string, "up" | "down">;
  rateFeedback: (key: string, kind: "up" | "down") => void;
  aiAvailable: boolean | null;
  model: string;
  remaining: number | null;
  explain: Insight;
  review: Insight;
  suggestPreview: string;
  setActiveFile: (id: string) => void;
  setFileContent: (id: string, content: string) => void;
  setLanguage: (language: string) => void;
  setCursor: (line: number, col: number) => void;
  setSelection: (text: string) => void;
  setEditor: (editor: MonacoEditor.IStandaloneCodeEditor | null) => void;
  patchSettings: (patch: Partial<Settings>) => void;
  setPanelTab: (tab: Exclude<Mode, "suggest">) => void;
  dismissCoach: () => void;
  markTyped: () => void;
  resetFiles: () => void;
  probeHealth: () => Promise<void>;
  runExplain: (source?: "select" | "manual") => Promise<void>;
  runReview: (source?: "save" | "manual") => Promise<void>;
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
});

const controllers: { explain?: AbortController; review?: AbortController } = {};

function activeFile(state: Pick<Store, "files" | "activeFileId">): FileTab {
  return state.files.find((file) => file.id === state.activeFileId) ?? state.files[0]!;
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

function isRetryableClientError(code: string | undefined): boolean {
  return code === "INVALID_MODE" || code === "EMPTY_SNIPPET" || code === "TOKEN_LIMIT_EXCEEDED";
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
      suggestPreview: "",
      history: [],
      historyLoaded: false,

      setActiveFile: (id) => set({ activeFileId: id, selection: "" }),
      setFileContent: (id, content) =>
        set((state) => ({
          files: state.files.map((file) =>
            file.id === id ? { ...file, content } : file,
          ),
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

        set({
          panelTab: "explain",
          explain: { text: "", status: "streaming", error: null, review: null },
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
            },
            controller.signal,
            (delta) => {
              text += delta;
              set({
                explain: {
                  text,
                  status: "streaming",
                  error: null,
                  review: null,
                },
              });
            },
          );
          set({
            remaining,
            explain: { text, status: "done", error: null, review: null },
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
            },
          });
          return;
        }
        const file = activeFile(state);
        if (!file.content.trim()) return;

        controllers.review?.abort();
        const controller = new AbortController();
        controllers.review = controller;

        set({
          panelTab: "review",
          review: { text: "", status: "streaming", error: null, review: null },
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
            },
            controller.signal,
            (delta) => {
              text += delta;
              set({
                review: {
                  text,
                  status: "streaming",
                  error: null,
                  review: parseReview(text),
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
            },
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
