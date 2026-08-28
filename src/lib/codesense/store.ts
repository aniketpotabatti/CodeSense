import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { parseReview } from "./parse-review";
import { cloneSamples } from "./samples";
import { extractSnippet, stripCompletionFences } from "./snippet";
import { CodesenseApiError, fetchAiHealth, streamCodesense } from "./stream";
import {
  DEFAULT_SETTINGS,
  type FileTab,
  type Mode,
  type ParsedReview,
  type Settings,
  type StreamStatus,
} from "./types";

type Insight = {
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
  settings: Settings;
  panelTab: Exclude<Mode, "suggest">;
  coachDismissed: boolean;
  hasTyped: boolean;
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
  patchSettings: (patch: Partial<Settings>) => void;
  setPanelTab: (tab: Exclude<Mode, "suggest">) => void;
  dismissCoach: () => void;
  markTyped: () => void;
  resetFiles: () => void;
  probeHealth: () => Promise<void>;
  runExplain: (source?: "select" | "manual") => Promise<void>;
  runReview: (source?: "save" | "manual") => Promise<void>;
  runSuggest: (signal: AbortSignal) => Promise<string>;
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
  if (err instanceof CodesenseApiError) return err.message;
  if (err instanceof DOMException && err.name === "AbortError") return "";
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}

export const useCodesense = create<Store>()(
  persist(
    (set, get) => ({
      files: cloneSamples(),
      activeFileId: "retry",
      cursor: { line: 1, col: 1 },
      selection: "",
      settings: DEFAULT_SETTINGS,
      panelTab: "explain",
      coachDismissed: false,
      hasTyped: false,
      aiAvailable: null,
      model: "grok-4.5",
      remaining: null,
      explain: emptyInsight(),
      review: emptyInsight(),
      suggestPreview: "",

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
      setSelection: (text) => set({ selection: text }),
      patchSettings: (patch) =>
        set((state) => ({ settings: { ...state.settings, ...patch } })),
      setPanelTab: (tab) => set({ panelTab: tab }),
      dismissCoach: () => set({ coachDismissed: true }),
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
        } catch (err) {
          if (controller.signal.aborted) return;
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
        } catch (err) {
          if (controller.signal.aborted) return;
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
      }),
    },
  ),
);

export function getActiveFile(state: Store = useCodesense.getState()): FileTab {
  return activeFile(state);
}
