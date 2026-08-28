import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { r as Slot, s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { a as RotateCcw, c as FileCode2, d as Check, i as ScanText, l as Copy, n as TriangleAlert, o as ListChecks, r as Settings2, s as Lightbulb, t as X, u as ChevronDown } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { a as DEFAULT_SETTINGS, i as stripCompletionFences, n as estimateTokens, o as LANGUAGES, r as extractSnippet, s as __exportAll } from "./router-Cn4xx0-Y.mjs";
import { n as persist, r as create, t as createJSONStorage } from "../_libs/zustand.mjs";
import { n as nn, r as qt, t as Qt } from "../_libs/react-resizable-panels.mjs";
import { n as clsx, t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
import { a as DialogPortal, i as DialogOverlay, n as DialogClose, o as DialogTitle, r as DialogContent, s as DialogTrigger, t as Dialog } from "../_libs/@radix-ui/react-dialog+[...].mjs";
import { i as Viewport, n as Scrollbar, r as Thumb, t as Root } from "../_libs/radix-ui__react-scroll-area.mjs";
import { i as SliderTrack, n as SliderRange, r as SliderThumb, t as Slider$1 } from "../_libs/@radix-ui/react-slider+[...].mjs";
import { a as Trigger, i as Root2, n as Item2, r as Portal2, t as Content2 } from "../_libs/@radix-ui/react-dropdown-menu+[...].mjs";
import { n as SwitchThumb, t as Switch$1 } from "../_libs/radix-ui__react-switch.mjs";
import { a as Trigger$1, i as Root3, n as Portal, r as Provider, t as Content2$1 } from "../_libs/@radix-ui/react-tooltip+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-DEYGv3fe.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function bullets(block) {
	return block.split("\n").map((line) => line.replace(/^\s*[-*•]\s*/, "").trim()).filter(Boolean);
}
function parseReview(text) {
	const normalized = text.replace(/\r\n/g, "\n");
	const goodMatch = normalized.match(/GOOD:\s*([\s\S]*?)(?=\nIMPROVE:|\nREFACTOR:|$)/i);
	const improveMatch = normalized.match(/IMPROVE:\s*([\s\S]*?)(?=\nREFACTOR:|\nGOOD:|$)/i);
	const refactorMatch = normalized.match(/REFACTOR:\s*([\s\S]*?)(?=\nGOOD:|\nIMPROVE:|$)/i);
	const good = bullets(goodMatch?.[1] ?? "");
	const improve = bullets(improveMatch?.[1] ?? "");
	const refactor = bullets(refactorMatch?.[1] ?? "");
	if (good.length + improve.length + refactor.length === 0) return null;
	return {
		good,
		improve,
		refactor
	};
}
var SAMPLE_FILES = [
	{
		id: "retry",
		name: "retry.ts",
		language: "typescript",
		content: `type RetryOptions = {
  attempts: number;
  baseMs: number;
  shouldRetry?: (error: unknown) => boolean;
};

export async function withRetry<T>(
  task: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const { attempts, baseMs, shouldRetry = () => true } = options;
  let lastError: unknown;

  for (let i = 0; i < attempts; i++) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (i === attempts - 1 || !shouldRetry(error)) break;
      const jitter = Math.random() * baseMs;
      await sleep(baseMs * 2 ** i + jitter);
    }
  }

  throw lastError;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
`
	},
	{
		id: "graph",
		name: "graph.py",
		language: "python",
		content: `from collections import defaultdict


def reachable(graph, start, seen=set()):
    """Return every node reachable from start, including start itself."""
    seen.add(start)
    for neighbor in graph[start]:
        if neighbor not in seen:
            reachable(graph, neighbor, seen)
    return seen


def build_graph(edges):
    graph = defaultdict(list)
    for src, dst in edges:
        graph[src].append(dst)
    return graph


if __name__ == "__main__":
    g = build_graph([("a", "b"), ("b", "c"), ("d", "e")])
    print(sorted(reachable(g, "a")))
    print(sorted(reachable(g, "d")))
`
	},
	{
		id: "pool",
		name: "pool.go",
		language: "go",
		content: `package pool

import (
	"context"
	"sync"
)

type Job func(ctx context.Context) error

func Run(ctx context.Context, workers int, jobs []Job) error {
	if workers < 1 {
		workers = 1
	}

	ch := make(chan Job)
	errCh := make(chan error, 1)
	var wg sync.WaitGroup

	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for job := range ch {
				if err := job(ctx); err != nil {
					select {
					case errCh <- err:
					default:
					}
					return
				}
			}
		}()
	}

	go func() {
		defer close(ch)
		for _, job := range jobs {
			select {
			case <-ctx.Done():
				return
			case ch <- job:
			}
		}
	}()

	wg.Wait()
	select {
	case err := <-errCh:
		return err
	default:
		return ctx.Err()
	}
}
`
	}
];
function cloneSamples() {
	return SAMPLE_FILES.map((file) => ({ ...file }));
}
var CodesenseApiError = class extends Error {
	code;
	retryAfter;
	constructor(err) {
		super(err.message);
		this.name = "CodesenseApiError";
		this.code = err.error;
		this.retryAfter = err.retryAfter;
	}
};
function isGatewayError(value) {
	if (!value || typeof value !== "object") return false;
	const rec = value;
	return typeof rec.error === "string" && typeof rec.message === "string";
}
async function streamCodesense(body, signal, onDelta) {
	const res = await fetch("/api/codesense", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
		signal
	});
	const remainingHeader = res.headers.get("x-ratelimit-remaining");
	const remaining = remainingHeader ? Number(remainingHeader) : null;
	if (!res.ok) {
		let parsed = null;
		try {
			parsed = await res.json();
		} catch {
			parsed = null;
		}
		if (isGatewayError(parsed)) throw new CodesenseApiError(parsed);
		throw new CodesenseApiError({
			error: "PROVIDER_ERROR",
			message: `Request failed (${res.status})`
		});
	}
	if (!res.body) throw new CodesenseApiError({
		error: "PROVIDER_ERROR",
		message: "Empty response stream"
	});
	const reader = res.body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, { stream: true });
		const parts = buffer.split("\n\n");
		buffer = parts.pop() ?? "";
		for (const part of parts) {
			const line = part.split("\n").map((entry) => entry.trim()).find((entry) => entry.startsWith("data:"));
			if (!line) continue;
			const data = line.slice(5).trim();
			if (data === "[DONE]") return { remaining };
			let json;
			try {
				json = JSON.parse(data);
			} catch {
				continue;
			}
			if (isGatewayError(json)) throw new CodesenseApiError(json);
			if (json && typeof json === "object" && "delta" in json && typeof json.delta === "string") onDelta(json.delta);
		}
	}
	return { remaining };
}
async function fetchAiHealth() {
	try {
		const res = await fetch("/api/codesense");
		if (!res.ok) return {
			available: false,
			model: "grok-4.5"
		};
		const body = await res.json();
		return {
			available: Boolean(body.available),
			model: body.model ?? "grok-4.5"
		};
	} catch {
		return {
			available: false,
			model: "grok-4.5"
		};
	}
}
var emptyInsight = () => ({
	text: "",
	status: "idle",
	error: null,
	review: null
});
var controllers = {};
function activeFile(state) {
	return state.files.find((file) => file.id === state.activeFileId) ?? state.files[0];
}
function errorMessage(err) {
	if (err instanceof CodesenseApiError) return err.message;
	if (err instanceof DOMException && err.name === "AbortError") return "";
	if (err instanceof Error) return err.message;
	return "Something went wrong.";
}
var useCodesense = create()(persist((set, get) => ({
	files: cloneSamples(),
	activeFileId: "retry",
	cursor: {
		line: 1,
		col: 1
	},
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
	setActiveFile: (id) => set({
		activeFileId: id,
		selection: ""
	}),
	setFileContent: (id, content) => set((state) => ({ files: state.files.map((file) => file.id === id ? {
		...file,
		content
	} : file) })),
	setLanguage: (language) => set((state) => ({ files: state.files.map((file) => file.id === state.activeFileId ? {
		...file,
		language
	} : file) })),
	setCursor: (line, col) => set({ cursor: {
		line,
		col
	} }),
	setSelection: (text) => set({ selection: text }),
	patchSettings: (patch) => set((state) => ({ settings: {
		...state.settings,
		...patch
	} })),
	setPanelTab: (tab) => set({ panelTab: tab }),
	dismissCoach: () => set({ coachDismissed: true }),
	markTyped: () => {
		if (!get().hasTyped) set({ hasTyped: true });
	},
	resetFiles: () => set({
		files: cloneSamples(),
		activeFileId: "retry",
		explain: emptyInsight(),
		review: emptyInsight(),
		suggestPreview: "",
		hasTyped: false
	}),
	probeHealth: async () => {
		const health = await fetchAiHealth();
		set({
			aiAvailable: health.available,
			model: health.model
		});
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
					review: null
				}
			});
			return;
		}
		const file = activeFile(state);
		const snippet = state.selection.trim() ? state.selection : extractSnippet(file.content, state.cursor.line).snippet;
		if (!snippet.trim()) return;
		controllers.explain?.abort();
		const controller = new AbortController();
		controllers.explain = controller;
		set({
			panelTab: "explain",
			explain: {
				text: "",
				status: "streaming",
				error: null,
				review: null
			}
		});
		try {
			let text = "";
			const { remaining } = await streamCodesense({
				mode: "explain",
				language: file.language,
				snippet,
				cursorLine: state.cursor.line,
				cursorCol: state.cursor.col
			}, controller.signal, (delta) => {
				text += delta;
				set({ explain: {
					text,
					status: "streaming",
					error: null,
					review: null
				} });
			});
			set({
				remaining,
				explain: {
					text,
					status: "done",
					error: null,
					review: null
				}
			});
		} catch (err) {
			if (controller.signal.aborted) return;
			const message = errorMessage(err);
			set({
				remaining: err instanceof CodesenseApiError && err.code === "RATE_LIMITED" ? 0 : get().remaining,
				explain: {
					text: get().explain.text,
					status: "error",
					error: message || "Explain failed.",
					review: null
				}
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
					review: null
				}
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
			review: {
				text: "",
				status: "streaming",
				error: null,
				review: null
			}
		});
		try {
			let text = "";
			const { remaining } = await streamCodesense({
				mode: "review",
				language: file.language,
				snippet: file.content,
				cursorLine: state.cursor.line,
				cursorCol: state.cursor.col
			}, controller.signal, (delta) => {
				text += delta;
				set({ review: {
					text,
					status: "streaming",
					error: null,
					review: parseReview(text)
				} });
			});
			set({
				remaining,
				review: {
					text,
					status: "done",
					error: null,
					review: parseReview(text)
				}
			});
		} catch (err) {
			if (controller.signal.aborted) return;
			const message = errorMessage(err);
			set({
				remaining: err instanceof CodesenseApiError && err.code === "RATE_LIMITED" ? 0 : get().remaining,
				review: {
					text: get().review.text,
					status: "error",
					error: message || "Review failed.",
					review: get().review.review
				}
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
		const { remaining } = await streamCodesense({
			mode: "suggest",
			language: file.language,
			snippet,
			cursorLine: state.cursor.line,
			cursorCol: state.cursor.col
		}, signal, (delta) => {
			text += delta;
			set({ suggestPreview: stripCompletionFences(text) });
		});
		const cleaned = stripCompletionFences(text);
		set({
			remaining,
			suggestPreview: cleaned
		});
		return cleaned;
	}
}), {
	name: "codesense-v1",
	storage: createJSONStorage(() => localStorage),
	skipHydration: true,
	partialize: (state) => ({
		files: state.files,
		activeFileId: state.activeFileId,
		settings: state.settings,
		coachDismissed: state.coachDismissed
	})
}));
function getActiveFile(state = useCodesense.getState()) {
	return activeFile(state);
}
function EditorSkeleton() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col gap-3 bg-background px-4 py-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-3 w-40 rounded-sm bg-surface-2" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-3 w-5/6 rounded-sm bg-surface-2" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-3 w-2/3 rounded-sm bg-surface-2" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-3 w-3/4 rounded-sm bg-surface-2" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mt-4 h-3 w-52 rounded-sm bg-surface-2" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-3 w-4/5 rounded-sm bg-surface-2" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-6 text-xs text-muted",
				children: "Loading editor"
			})
		]
	});
}
function EditorCanvas() {
	const [Pane, setPane] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		let cancelled = false;
		import("./monaco-pane-BYiuwNaR.mjs").then((mod) => {
			if (!cancelled) setPane(() => mod.MonacoPane);
		});
		return () => {
			cancelled = true;
		};
	}, []);
	if (!Pane) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EditorSkeleton, {});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pane, {});
}
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
function FileTabs() {
	const files = useCodesense((s) => s.files);
	const activeFileId = useCodesense((s) => s.activeFileId);
	const setActiveFile = useCodesense((s) => s.setActiveFile);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		role: "tablist",
		"aria-label": "Open files",
		className: "flex min-w-0 items-end gap-1 overflow-x-auto px-2 pt-1",
		children: [files.map((file) => {
			const active = file.id === activeFileId;
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				role: "tab",
				"aria-selected": active,
				onClick: () => setActiveFile(file.id),
				className: cn("flex h-11 shrink-0 items-center gap-2 rounded-t-md px-3 text-sm transition-colors duration-150 md:h-9", active ? "bg-background text-foreground" : "text-muted hover:bg-surface-2 hover:text-foreground"),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileCode2, { className: "size-3.5 opacity-70" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "font-mono text-xs",
					children: file.name
				})]
			}, file.id);
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "sr-only",
			children: ["Editing ", getActiveFile().name]
		})]
	});
}
var badgeVariants = cva("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium tracking-wide", {
	variants: { variant: {
		default: "bg-surface-2 text-muted shadow-border",
		accent: "bg-accent/15 text-accent",
		success: "bg-success/15 text-success",
		warn: "bg-warn/15 text-warn",
		danger: "bg-destructive/15 text-destructive"
	} },
	defaultVariants: { variant: "default" }
});
function Badge({ className, variant, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: cn(badgeVariants({ variant }), className),
		...props
	});
}
var buttonVariants = cva("inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-[background-color,color,box-shadow,transform,opacity] duration-150 ease-out focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 active:not-disabled:scale-[0.96]", {
	variants: {
		variant: {
			default: "bg-primary text-primary-foreground shadow-border hover:bg-primary/90",
			secondary: "bg-surface-2 text-foreground shadow-border hover:bg-surface-2/80",
			outline: "bg-transparent text-foreground shadow-border hover:bg-surface-2",
			ghost: "bg-transparent text-muted hover:bg-surface-2 hover:text-foreground",
			accent: "bg-accent text-accent-foreground hover:bg-accent/90",
			destructive: "bg-destructive/15 text-destructive hover:bg-destructive/25"
		},
		size: {
			default: "h-11 px-3.5 text-sm md:h-9",
			sm: "h-11 px-3 text-sm md:h-8 md:px-2.5 md:text-xs",
			lg: "h-11 px-4 text-sm",
			icon: "size-11 md:size-8"
		}
	},
	defaultVariants: {
		variant: "default",
		size: "default"
	}
});
function Button({ className, variant, size, asChild = false, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(asChild ? Slot : "button", {
		className: cn(buttonVariants({
			variant,
			size
		}), className),
		...props
	});
}
function ScrollArea({ className, children, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Root, {
		className: cn("overflow-hidden", className),
		...props,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Viewport, {
			className: "h-full w-full",
			children
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scrollbar, {
			orientation: "vertical",
			className: "flex w-2 touch-none p-0.5 select-none",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Thumb, { className: "relative flex-1 rounded-full bg-border" })
		})]
	});
}
function InsightPanel() {
	const panelTab = useCodesense((s) => s.panelTab);
	const setPanelTab = useCodesense((s) => s.setPanelTab);
	const explain = useCodesense((s) => s.explain);
	const review = useCodesense((s) => s.review);
	const suggestPreview = useCodesense((s) => s.suggestPreview);
	const aiAvailable = useCodesense((s) => s.aiAvailable);
	const coachDismissed = useCodesense((s) => s.coachDismissed);
	const dismissCoach = useCodesense((s) => s.dismissCoach);
	const active = panelTab === "explain" ? explain : review;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
		className: "flex h-full min-h-0 flex-col bg-surface",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex h-11 shrink-0 items-center gap-1 border-b border-border px-2 md:h-9",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PanelTab, {
						active: panelTab === "explain",
						onClick: () => setPanelTab("explain"),
						icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScanText, { className: "size-3.5" }),
						label: "Explain",
						status: explain.status
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PanelTab, {
						active: panelTab === "review",
						onClick: () => setPanelTab("review"),
						icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListChecks, { className: "size-3.5" }),
						label: "Review",
						status: review.status
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopyButton, {
						text: active.text,
						disabled: !active.text
					})
				]
			}),
			!coachDismissed && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-start gap-3 border-b border-border px-4 py-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "min-w-0 flex-1 text-xs leading-relaxed text-muted",
					children: "Select a block to explain it. Save to run a review. Pause typing for ghost completions."
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "ghost",
					size: "sm",
					onClick: dismissCoach,
					children: "Dismiss"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScrollArea, {
				className: "min-h-0 flex-1",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "px-4 py-4",
					children: [aiAvailable === false ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
						title: "AI is unavailable",
						body: "The model gateway is not configured in this environment. Editing still works."
					}) : panelTab === "explain" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExplainBody, { insight: explain }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReviewBody, { insight: review }), suggestPreview && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-6 border-t border-border pt-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mb-2 text-xs font-medium tracking-wide text-muted uppercase",
							children: "Last completion"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
							className: "overflow-x-auto rounded-md bg-background p-3 font-mono text-xs leading-relaxed text-foreground shadow-border",
							children: suggestPreview
						})]
					})]
				})
			})
		]
	});
}
function PanelTab({ active, onClick, icon, label, status }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		onClick,
		className: cn("flex h-9 items-center gap-2 rounded-md px-2.5 text-xs font-medium transition-colors duration-150 md:h-7", active ? "bg-background text-foreground shadow-border" : "text-muted hover:text-foreground"),
		children: [
			icon,
			label,
			status === "streaming" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "size-1.5 rounded-full bg-accent" })
		]
	});
}
function CopyButton({ text, disabled }) {
	const [copied, setCopied] = (0, import_react.useState)(false);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
		variant: "ghost",
		size: "icon",
		className: "ml-auto",
		disabled,
		"aria-label": "Copy insight",
		onClick: async () => {
			await navigator.clipboard.writeText(text);
			setCopied(true);
			toast.success("Copied to clipboard");
			window.setTimeout(() => setCopied(false), 1200);
		},
		children: copied ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "size-3.5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "size-3.5" })
	});
}
function ExplainBody({ insight }) {
	if (insight.status === "idle" && !insight.text) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
		title: "Waiting on a selection",
		body: "Highlight a function or press Explain to describe the code around the cursor."
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		insight.status === "streaming" && !insight.text && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "shimmer bg-clip-text text-sm text-muted",
			children: "Reading the snippet"
		}),
		insight.text && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "text-sm leading-relaxed text-foreground",
			children: [insight.text, insight.status === "streaming" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "streaming-caret" })]
		}),
		insight.error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-3 text-sm text-destructive",
			children: insight.error
		})
	] });
}
function ReviewBody({ insight }) {
	const parsed = insight.review;
	const fallback = (0, import_react.useMemo)(() => insight.text, [insight.text]);
	if (insight.status === "idle" && !insight.text) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
		title: "No review yet",
		body: "Save the file or press Review for a structured pass: strengths, issues, one refactor."
	});
	if (insight.status === "streaming" && !insight.text) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "shimmer bg-clip-text text-sm text-muted",
		children: "Reviewing the file"
	});
	if (!parsed) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
		className: "whitespace-pre-wrap text-sm leading-relaxed text-foreground",
		children: [fallback, insight.status === "streaming" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "streaming-caret" })]
	}), insight.error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "mt-3 text-sm text-destructive",
		children: insight.error
	})] });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReviewSection, {
				icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "size-3.5" }),
				tone: "success",
				title: "What's good",
				items: parsed.good
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReviewSection, {
				icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "size-3.5" }),
				tone: "warn",
				title: "What to improve",
				items: parsed.improve
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReviewSection, {
				icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lightbulb, { className: "size-3.5" }),
				tone: "accent",
				title: "Optional refactor",
				items: parsed.refactor
			}),
			insight.status === "streaming" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "streaming-caret" }),
			insight.error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-destructive",
				children: insight.error
			})
		]
	});
}
function ReviewSection({ icon, tone, title, items }) {
	if (items.length === 0) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "flex flex-col gap-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex items-center gap-2",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
				variant: tone === "accent" ? "accent" : tone,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "mr-1",
					children: icon
				}), title]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "flex flex-col gap-2 pl-1",
			children: items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
				className: "text-sm leading-relaxed text-foreground",
				children: item
			}, item))
		})]
	});
}
function EmptyState({ title, body }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-1.5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "text-sm font-medium text-foreground",
			children: title
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm leading-relaxed text-muted",
			children: body
		})]
	});
}
function StatusBar() {
	const file = useCodesense(getActiveFile);
	const cursor = useCodesense((s) => s.cursor);
	const selection = useCodesense((s) => s.selection);
	const remaining = useCodesense((s) => s.remaining);
	const aiAvailable = useCodesense((s) => s.aiAvailable);
	const model = useCodesense((s) => s.model);
	const debounceMs = useCodesense((s) => s.settings.debounceMs);
	const explain = useCodesense((s) => s.explain.status);
	const review = useCodesense((s) => s.review.status);
	const snippet = selection.trim() ? selection : extractSnippet(file.content, cursor.line).snippet;
	const tokens = estimateTokens(snippet);
	const busy = explain === "streaming" || review === "streaming";
	let aiLabel = "Checking AI";
	let aiTone = "muted";
	if (aiAvailable === false) {
		aiLabel = "AI unavailable";
		aiTone = "warn";
	} else if (aiAvailable) {
		aiLabel = busy ? "Streaming" : model;
		aiTone = busy ? "busy" : "ok";
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", {
		className: "flex h-8 shrink-0 items-center gap-3 overflow-hidden border-t border-border bg-surface px-3 font-mono text-xs text-muted",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "tabular-nums",
				children: [
					"Ln ",
					cursor.line,
					", Col ",
					cursor.col
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "hidden sm:inline",
				children: file.language
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "hidden tabular-nums md:inline",
				children: [tokens, " tok"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "hidden tabular-nums lg:inline",
				children: [debounceMs, "ms"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "ml-auto flex items-center gap-2",
				children: [remaining !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "hidden tabular-nums sm:inline",
					children: [remaining, " left"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "flex items-center gap-1.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: cn("size-1.5 rounded-full", aiTone === "ok" && "bg-success", aiTone === "busy" && "bg-accent", aiTone === "warn" && "bg-destructive", aiTone === "muted" && "bg-subtle") }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "truncate",
						children: aiLabel
					})]
				})]
			})
		]
	});
}
function Logo({ className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("flex items-center gap-2.5", className),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			"aria-hidden": "true",
			className: "flex size-7 items-center justify-center rounded-md bg-surface-2 text-accent shadow-border",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
				viewBox: "0 0 16 16",
				className: "size-3.5",
				fill: "none",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
					d: "M6 3.5 2.75 8 6 12.5",
					stroke: "currentColor",
					strokeWidth: "1.6",
					strokeLinecap: "round",
					strokeLinejoin: "round"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
					d: "M10 3.5 13.25 8 10 12.5",
					stroke: "currentColor",
					strokeWidth: "1.6",
					strokeLinecap: "round",
					strokeLinejoin: "round",
					opacity: "0.7"
				})]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "font-sans text-sm font-semibold tracking-tight",
			children: ["Code", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-accent",
				children: "Sense"
			})]
		})]
	});
}
var Sheet = Dialog;
var SheetTrigger = DialogTrigger;
function SheetContent({ className, children, side = "right", title, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay, { className: "fixed inset-0 z-50 bg-background/70 data-[state=open]:animate-in data-[state=closed]:animate-out" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
		className: cn("fixed z-50 flex flex-col bg-surface shadow-border", "data-[state=open]:animate-in data-[state=closed]:animate-out", side === "right" ? "inset-y-0 right-0 h-full w-full max-w-md rounded-l-xl" : "inset-x-0 bottom-0 max-h-[85vh] rounded-t-xl", className),
		...props,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between gap-3 border-b border-border px-5 py-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, {
				className: "text-sm font-semibold tracking-tight",
				children: title
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogClose, {
				asChild: true,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "ghost",
					size: "icon",
					"aria-label": "Close",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" })
				})
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "min-h-0 flex-1 overflow-y-auto px-5 py-4",
			children
		})]
	})] });
}
function Slider({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Slider$1, {
		className: cn("relative flex h-11 w-full touch-none items-center select-none md:h-8", className),
		...props,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SliderTrack, {
			className: "relative h-1.5 w-full grow overflow-hidden rounded-full bg-surface-2 shadow-border",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SliderRange, { className: "absolute h-full bg-accent" })
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SliderThumb, { className: "block size-4 rounded-full bg-primary shadow-border transition-transform duration-150 ease-out hover:scale-110 focus-visible:outline-none" })]
	});
}
function Switch({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch$1, {
		className: cn("peer inline-flex h-6 w-10 shrink-0 items-center rounded-full shadow-border transition-colors duration-150", "data-[state=checked]:bg-accent data-[state=unchecked]:bg-surface-2", "disabled:cursor-not-allowed disabled:opacity-40", className),
		...props,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SwitchThumb, { className: cn("pointer-events-none block size-5 rounded-full bg-foreground shadow-sm", "transition-transform duration-150 ease-out", "data-[state=checked]:translate-x-[18px] data-[state=unchecked]:translate-x-0.5", "data-[state=checked]:bg-accent-foreground") })
	});
}
function SettingsSheet() {
	const [open, setOpen] = (0, import_react.useState)(false);
	const settings = useCodesense((s) => s.settings);
	const patchSettings = useCodesense((s) => s.patchSettings);
	const resetFiles = useCodesense((s) => s.resetFiles);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Sheet, {
		open,
		onOpenChange: setOpen,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SheetTrigger, {
			asChild: true,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				variant: "ghost",
				size: "icon",
				"aria-label": "Settings",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings2, { className: "size-4" })
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SheetContent, {
			title: "Settings",
			side: "right",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "flex flex-col gap-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "text-xs font-medium tracking-wide text-muted uppercase",
								children: "Modes"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettingRow, {
								label: "Explain on select",
								hint: "After you highlight code, stream a short explanation.",
								checked: settings.explainOnSelect,
								onCheckedChange: (checked) => patchSettings({ explainOnSelect: checked })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettingRow, {
								label: "Review on save",
								hint: "Ctrl/Cmd+S runs a structured review of the file.",
								checked: settings.reviewOnSave,
								onCheckedChange: (checked) => patchSettings({ reviewOnSave: checked })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettingRow, {
								label: "Ghost completions",
								hint: "After you pause typing, suggest the next few tokens.",
								checked: settings.suggestOnIdle,
								onCheckedChange: (checked) => patchSettings({ suggestOnIdle: checked })
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "flex flex-col gap-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-baseline justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
									className: "text-xs font-medium tracking-wide text-muted uppercase",
									children: "Debounce"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "font-mono text-xs tabular-nums text-foreground",
									children: [settings.debounceMs, "ms"]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
								min: 300,
								max: 1200,
								step: 50,
								value: [settings.debounceMs],
								onValueChange: ([value]) => {
									if (typeof value === "number") patchSettings({ debounceMs: value });
								},
								"aria-label": "Debounce delay"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs leading-relaxed text-muted",
								children: "Wait this long after a selection or pause before calling the model."
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "flex flex-col gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "text-xs font-medium tracking-wide text-muted uppercase",
							children: "Workspace"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "outline",
							onClick: () => {
								resetFiles();
								setOpen(false);
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { className: "size-3.5" }), "Reset sample files"]
						})]
					})
				]
			})
		})]
	});
}
function SettingRow({ label, hint, checked, onCheckedChange }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "flex items-start justify-between gap-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "flex min-w-0 flex-col gap-1",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-sm text-foreground",
				children: label
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-xs leading-relaxed text-muted",
				children: hint
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
			checked,
			onCheckedChange
		})]
	});
}
var DropdownMenu = Root2;
var DropdownMenuTrigger = Trigger;
function DropdownMenuContent({ className, sideOffset = 6, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Portal2, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content2, {
		sideOffset,
		className: cn("z-50 min-w-40 overflow-hidden rounded-lg bg-surface-2 p-1 shadow-border", className),
		...props
	}) });
}
function DropdownMenuItem({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Item2, {
		className: cn("flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm outline-none", "focus:bg-surface data-[highlighted]:bg-surface", "data-[disabled]:pointer-events-none data-[disabled]:opacity-40", className),
		...props
	});
}
function TooltipProvider({ delayDuration = 400, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Provider, {
		delayDuration,
		...props
	});
}
var Tooltip = Root3;
var TooltipTrigger = Trigger$1;
function TooltipContent({ className, sideOffset = 6, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Portal, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content2$1, {
		sideOffset,
		className: cn("z-50 max-w-xs rounded-md bg-surface-2 px-2 py-1.5 text-xs text-foreground shadow-border", "origin-[var(--radix-tooltip-content-transform-origin)]", "data-[state=delayed-open]:animate-in data-[state=closed]:animate-out", className),
		...props
	}) });
}
function Toolbar() {
	const file = useCodesense(getActiveFile);
	const setLanguage = useCodesense((s) => s.setLanguage);
	const runExplain = useCodesense((s) => s.runExplain);
	const runReview = useCodesense((s) => s.runReview);
	const explainStatus = useCodesense((s) => s.explain.status);
	const reviewStatus = useCodesense((s) => s.review.status);
	const languageLabel = LANGUAGES.find((lang) => lang.id === file.language)?.label ?? file.language;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
		className: "flex h-14 shrink-0 items-center gap-2 border-b border-border px-3 md:h-12 md:px-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Logo, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mx-1 hidden h-5 w-px bg-border sm:block" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenu, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuTrigger, {
				asChild: true,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					variant: "ghost",
					size: "sm",
					className: "hidden sm:inline-flex",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-mono text-xs",
						children: languageLabel
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "size-3.5 opacity-60" })]
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuContent, {
				align: "start",
				children: LANGUAGES.map((lang) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuItem, {
					onSelect: () => setLanguage(lang.id),
					className: cn(file.language === lang.id && "text-accent"),
					children: lang.label
				}, lang.id))
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "ml-auto flex items-center gap-1",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipTrigger, {
						asChild: true,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "secondary",
							size: "sm",
							onClick: () => void runExplain("manual"),
							disabled: explainStatus === "streaming",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScanText, { className: "size-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "hidden md:inline",
								children: "Explain"
							})]
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipContent, { children: "Explain selection or cursor context (Ctrl/Cmd+E)" })] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipTrigger, {
						asChild: true,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "secondary",
							size: "sm",
							onClick: () => void runReview("manual"),
							disabled: reviewStatus === "streaming",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListChecks, { className: "size-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "hidden md:inline",
								children: "Review"
							})]
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipContent, { children: "Review the current file (Ctrl/Cmd+S)" })] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettingsSheet, {})
				]
			})
		]
	});
}
function useMediaQuery(query) {
	const [matches, setMatches] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		const media = window.matchMedia(query);
		const onChange = () => setMatches(media.matches);
		onChange();
		media.addEventListener("change", onChange);
		return () => media.removeEventListener("change", onChange);
	}, [query]);
	return matches;
}
function AppShell() {
	const isMobile = useMediaQuery("(max-width: 767px)");
	(0, import_react.useEffect)(() => {
		useCodesense.persist.rehydrate();
		useCodesense.getState().probeHealth();
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-dvh min-h-0 flex-col overflow-hidden bg-background text-foreground",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toolbar, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex min-h-0 flex-1 flex-col",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "border-b border-border bg-surface",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileTabs, {})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(qt, {
					orientation: isMobile ? "vertical" : "horizontal",
					className: "min-h-0 flex-1",
					id: "codesense-split",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Qt, {
							id: "editor",
							defaultSize: isMobile ? "55%" : "64%",
							minSize: "28%",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "h-full min-h-0 bg-background",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EditorCanvas, {})
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(nn, { className: "codesense-handle" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Qt, {
							id: "insight",
							defaultSize: isMobile ? "45%" : "36%",
							minSize: "22%",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(InsightPanel, {})
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBar, {})
		]
	}) });
}
var routes_exports = /* @__PURE__ */ __exportAll({ component: () => Home });
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {});
}
//#endregion
export { useCodesense as i, EditorSkeleton as n, getActiveFile as r, routes_exports as t };
