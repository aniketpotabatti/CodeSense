import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { _ as useRouter, f as createRouter, g as createRootRoute, h as createFileRoute, l as Scripts, m as lazyRouteComponent, p as Outlet, u as HeadContent } from "../_libs/@tanstack/react-router+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { n as TriangleAlert } from "../_libs/lucide-react.mjs";
import { t as Toaster } from "../_libs/sonner.mjs";
import { a as union, i as string, n as number, r as object, t as literal } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/router-Cn4xx0-Y.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
var LANGUAGES = [
	{
		id: "typescript",
		label: "TypeScript"
	},
	{
		id: "javascript",
		label: "JavaScript"
	},
	{
		id: "python",
		label: "Python"
	},
	{
		id: "go",
		label: "Go"
	},
	{
		id: "rust",
		label: "Rust"
	},
	{
		id: "java",
		label: "Java"
	},
	{
		id: "json",
		label: "JSON"
	},
	{
		id: "html",
		label: "HTML"
	},
	{
		id: "css",
		label: "CSS"
	},
	{
		id: "sql",
		label: "SQL"
	},
	{
		id: "markdown",
		label: "Markdown"
	}
];
var DEFAULT_SETTINGS = {
	explainOnSelect: true,
	reviewOnSave: true,
	suggestOnIdle: true,
	debounceMs: 600
};
var MAX_OUTPUT_TOKENS = {
	explain: 400,
	review: 600,
	suggest: 180
};
function estimateTokens(text) {
	return Math.ceil(text.length / 4);
}
function budgetText(text, maxTokens = 800) {
	const maxChars = maxTokens * 4;
	if (text.length <= maxChars) return text;
	return text.slice(0, maxChars);
}
function extractSnippet(code, cursorLine, before = 30, after = 10) {
	const lines = code.split("\n");
	const idx = Math.min(Math.max(0, cursorLine - 1), Math.max(0, lines.length - 1));
	const start = Math.max(0, idx - before);
	const end = Math.min(lines.length, idx + 1 + after);
	return {
		snippet: lines.slice(start, end).join("\n"),
		startLine: start + 1
	};
}
function insertCursorMarker(snippet, cursorLine, cursorCol, startLine) {
	const lines = snippet.split("\n");
	const local = cursorLine - startLine;
	if (local < 0 || local >= lines.length) return snippet;
	const line = lines[local] ?? "";
	const col = Math.min(Math.max(0, cursorCol - 1), line.length);
	lines[local] = `${line.slice(0, col)}⟦CURSOR⟧${line.slice(col)}`;
	return lines.join("\n");
}
function stripCompletionFences(text) {
	let out = text.trim();
	out = out.replace(/^```[\w+-]*\s*\n?/, "");
	out = out.replace(/\n?```$/, "");
	return out.replace(/⟦CURSOR⟧/g, "");
}
function AppErrorComponent({ error }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-red-500",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, {
					className: "size-10",
					strokeWidth: 2
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-lg font-semibold",
				children: "Something went wrong"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "max-w-md text-sm break-words text-zinc-500 dark:text-zinc-400",
				children: error.message || "An unexpected error occurred. Try reloading the page."
			})
		]
	});
}
function isGrokEmbedderOrigin(origin) {
	try {
		const url = new URL(origin);
		if (url.protocol !== "https:" && url.protocol !== "http:") return false;
		const host = url.hostname.toLowerCase();
		if (host === "grok.com" || host.endsWith(".grok.com")) return true;
		if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") return true;
		return false;
	} catch {
		return false;
	}
}
function isSandboxPreviewGuestHost(hostname) {
	const host = hostname.toLowerCase();
	return host === "grok-sandbox.com" || host.endsWith(".grok-sandbox.com");
}
function isRemintPreviewPair(guestHost, parentHost) {
	const guest = guestHost.toLowerCase();
	const parent = parentHost.toLowerCase();
	const i = guest.indexOf(".preview.");
	if (i <= 0) return false;
	const label = guest.slice(0, i);
	const rest = guest.slice(i + 9);
	if (label.includes(".") || !rest.includes(".")) return false;
	return parent === rest || parent === `grok.${rest}`;
}
function resolveParentEmbedderOrigin(parentIsSelf, referrer, ancestorOrigin, guestHostname = "") {
	if (parentIsSelf) return null;
	for (const candidate of [referrer, ancestorOrigin ?? ""].filter(Boolean)) try {
		const url = new URL(candidate.includes("://") ? candidate : `https://${candidate}`);
		if (url.protocol !== "https:" && url.protocol !== "http:") continue;
		if (isGrokEmbedderOrigin(url.origin)) return url.origin;
		if (isSandboxPreviewGuestHost(guestHostname) || isRemintPreviewPair(guestHostname, url.hostname)) return url.origin;
	} catch {}
	return null;
}
/**
* Guest side of the grok-web ↔ sandbox preview postMessage bridge.
*
* Activates only when this page is framed by an allowlisted Grok embedder.
* Top-level runs (download/export, local `npm run dev`, deployed sites) noop.
*/
var PREVIEW_BRIDGE_CHANNEL = "grok-preview-bridge";
var EnvelopeSchema = object({
	channel: literal(PREVIEW_BRIDGE_CHANNEL),
	version: number().int().positive(),
	type: string().min(1)
});
var HelloSchema = EnvelopeSchema.extend({ type: literal("hello") });
var NavigateSchema = EnvelopeSchema.extend({
	type: literal("navigate"),
	path: string().min(1)
});
var HistorySchema = EnvelopeSchema.extend({
	type: literal("history"),
	delta: union([literal(-1), literal(1)])
});
function isSafeBridgePath(path) {
	if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return false;
	try {
		return new URL(path, "https://preview.invalid").origin === "https://preview.invalid";
	} catch {
		return false;
	}
}
/**
* Install host↔guest messaging. Returns a dispose function.
* Noops (returns a no-op dispose) when not embedded under a Grok parent.
*/
function installPreviewHostBridge(options = {}) {
	if (typeof window === "undefined") return () => {};
	const ancestorOrigin = typeof location.ancestorOrigins !== "undefined" && location.ancestorOrigins.length > 0 ? location.ancestorOrigins[0] : null;
	const parentOrigin = resolveParentEmbedderOrigin(window.parent === window, document.referrer, ancestorOrigin, window.location.hostname);
	if (parentOrigin === null) return () => {};
	const ROOT_STATE_KEY = "__grokPreviewBridgeRoot";
	const originalPushState = window.history.pushState.bind(window.history);
	const originalReplaceState = window.history.replaceState.bind(window.history);
	const isAtHistoryRoot = () => {
		const state = window.history.state;
		return Boolean(state && typeof state === "object" && state[ROOT_STATE_KEY] === true);
	};
	try {
		const current = window.history.state;
		if (!(current !== null && typeof current === "object" && Object.prototype.hasOwnProperty.call(current, ROOT_STATE_KEY))) {
			const isRoot = window.history.length <= 1;
			originalReplaceState(current && typeof current === "object" ? {
				...current,
				[ROOT_STATE_KEY]: isRoot
			} : { [ROOT_STATE_KEY]: isRoot }, "", window.location.href);
		}
	} catch {}
	const post = (message) => {
		window.parent.postMessage(message, parentOrigin);
	};
	const reportLocation = () => {
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "location",
			path: window.location.pathname || "/",
			search: window.location.search,
			hash: window.location.hash
		});
	};
	const reportRoutes = () => {
		const paths = options.getRoutePaths?.() ?? [];
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "routes",
			paths
		});
	};
	const defaultNavigate = (path) => {
		if (!isSafeBridgePath(path)) return;
		try {
			const url = new URL(path, window.location.origin);
			if (url.origin !== window.location.origin) return;
			const next = `${url.pathname}${url.search}${url.hash}`;
			window.history.pushState(window.history.state, "", next);
			window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
		} catch {}
	};
	const navigate = (path) => {
		if (!isSafeBridgePath(path)) return;
		if (options.navigate) {
			options.navigate(path);
			return;
		}
		defaultNavigate(path);
	};
	const announce = () => {
		reportLocation();
		reportRoutes();
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "ready"
		});
	};
	const onMessage = (event) => {
		if (event.source !== window.parent) return;
		if (event.origin !== parentOrigin) return;
		const envelope = EnvelopeSchema.safeParse(event.data);
		if (!envelope.success || envelope.data.version !== 1) return;
		if (envelope.data.type === "hello") {
			if (!HelloSchema.safeParse(event.data).success) return;
			announce();
			return;
		}
		if (envelope.data.type === "navigate") {
			const parsed = NavigateSchema.safeParse(event.data);
			if (!parsed.success) return;
			navigate(parsed.data.path);
			queueMicrotask(reportLocation);
			return;
		}
		if (envelope.data.type === "history") {
			const parsed = HistorySchema.safeParse(event.data);
			if (!parsed.success) return;
			if (parsed.data.delta === -1 && isAtHistoryRoot()) return;
			window.history.go(parsed.data.delta);
		}
	};
	const onPopState = () => {
		reportLocation();
	};
	const onHashChange = () => {
		reportLocation();
	};
	window.history.pushState = (data, unused, url) => {
		const next = data && typeof data === "object" ? {
			...data,
			[ROOT_STATE_KEY]: false
		} : data;
		originalPushState(next, unused, url);
		reportLocation();
	};
	window.history.replaceState = (data, unused, url) => {
		const next = isAtHistoryRoot() ? {
			...data && typeof data === "object" ? data : {},
			[ROOT_STATE_KEY]: true
		} : data;
		originalReplaceState(next, unused, url);
		reportLocation();
	};
	window.addEventListener("message", onMessage);
	window.addEventListener("popstate", onPopState);
	window.addEventListener("hashchange", onHashChange);
	announce();
	return () => {
		window.removeEventListener("message", onMessage);
		window.removeEventListener("popstate", onPopState);
		window.removeEventListener("hashchange", onHashChange);
		window.history.pushState = originalPushState;
		window.history.replaceState = originalReplaceState;
	};
}
/** Collect static path patterns from a TanStack route tree (best-effort). */
function collectRoutePathsFromTree(routeTree) {
	const paths = /* @__PURE__ */ new Set();
	const walk = (node) => {
		if (!node || typeof node !== "object") return;
		const record = node;
		const full = typeof record.fullPath === "string" ? record.fullPath : typeof record.path === "string" ? record.path : null;
		if (full !== null && full !== "") paths.add(full.startsWith("/") ? full : `/${full}`);
		else if (full === "") paths.add("/");
		const children = record.children;
		if (Array.isArray(children)) for (const child of children) walk(child);
		else if (children && typeof children === "object") for (const child of Object.values(children)) walk(child);
	};
	walk(routeTree);
	return [...paths];
}
/**
* Mount once in `__root.tsx` so the Grok preview chrome can drive navigation
* (and later receive registered routes). Noops when the app is not embedded.
*/
function PreviewHostBridge() {
	const router = useRouter();
	(0, import_react.useEffect)(() => {
		return installPreviewHostBridge({
			navigate: (path) => {
				router.history.push(path);
			},
			getRoutePaths: () => collectRoutePathsFromTree(router.routeTree)
		});
	}, [router]);
	return null;
}
/**
* App-wide client provider mounted once near the root (in `src/routes/__root.tsx`):
*
*   <AuthProvider><Outlet /></AuthProvider>
*
* Better Auth's React client (`@/lib/auth/client`) needs NO context provider —
* its `useSession()` works standalone — so this is a passthrough today. It's
* kept as the single, stable mount point for any future client-side providers
* (e.g. a toast or theme provider) without churning the root shell.
*/
function AuthProvider({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children });
}
var styles_default = "/assets/styles-CU_IQgum.css";
var APP_NAME = "CodeSense";
var Route$2 = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title: APP_NAME },
			{
				name: "description",
				content: "CodeSense explains, reviews, and completes code as you write — a live GenAI editor."
			},
			{
				name: "theme-color",
				content: "#0c0d10"
			}
		],
		links: [
			{
				rel: "icon",
				type: "image/svg+xml",
				href: "/favicon.svg"
			},
			{
				rel: "stylesheet",
				href: styles_default
			},
			{
				rel: "manifest",
				href: "/__grok/manifest.webmanifest"
			},
			{
				rel: "apple-touch-icon",
				href: "/__grok/icon-180.png"
			},
			{
				rel: "preconnect",
				href: "https://fonts.googleapis.com"
			},
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous"
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Outfit:wght@400;500;600&display=swap"
			}
		]
	}),
	component: () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "en",
		className: "antialiased",
		suppressHydrationWarning: true,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", {
			className: "min-h-dvh bg-background text-foreground",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PreviewHostBridge, {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AuthProvider, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster, {
					theme: "dark",
					position: "bottom-right",
					toastOptions: { className: "bg-surface-2 text-foreground shadow-border" }
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})
			]
		})]
	})
});
var $$splitComponentImporter = () => import("./routes-DEYGv3fe.mjs").then((n) => n.t);
var Route$1 = createFileRoute("/")({ component: lazyRouteComponent($$splitComponentImporter, "component") });
var BASE = `You are CodeSense, a precise and concise code assistant embedded inside a developer's editor.
You receive raw code snippets. You never hallucinate APIs or fabricate behavior.
You respond in plain, clear language — no unnecessary preamble.`;
function buildMessages(input) {
	const system = `${BASE}
Detected language: ${input.language}
Mode: ${input.mode}`;
	if (input.mode === "explain") return {
		system,
		user: `The developer selected or is actively editing the following snippet.
Explain what it does in 2–4 sentences. Focus on intent, not syntax. Do not repeat the code.

Snippet:
${input.snippet}`
	};
	if (input.mode === "review") return {
		system,
		user: `The developer just saved this file. Perform a concise code review.
Structure your response EXACTLY with these headings and bullet lists (no other wrapping):

GOOD:
- one or two concrete strengths

IMPROVE:
- one to three actionable issues (what to change, and why)

REFACTOR:
- a single optional refactor suggestion

Keep the entire response under 200 words. Do not invent bugs that are not in the code.

File:
${input.snippet}`
	};
	return {
		system,
		user: `Complete the following code at the cursor marker ⟦CURSOR⟧.
Return ONLY the completion text that should be inserted at the cursor — no explanation, no markdown fences, no quotes.
Do not repeat code that already exists before the cursor.
Stop at a logical boundary (end of the current statement, block, or function).

Context:
${input.snippet}
Cursor position: line ${input.cursorLine}, col ${input.cursorCol}`
	};
}
var MODEL = "grok-4.5";
function jsonError(err, status, retryAfter) {
	const headers = new Headers({ "Content-Type": "application/json" });
	if (retryAfter) headers.set("Retry-After", String(Math.ceil(retryAfter / 1e3)));
	return new Response(JSON.stringify(err), {
		status,
		headers
	});
}
function sseHeaders(remaining) {
	return new Headers({
		"Content-Type": "text/event-stream; charset=utf-8",
		"Cache-Control": "no-cache, no-transform",
		Connection: "keep-alive",
		"X-Accel-Buffering": "no",
		"X-RateLimit-Remaining": String(remaining)
	});
}
function aiAvailable() {
	return Boolean(process.env.XAI_API_KEY);
}
function healthResponse() {
	return Response.json({
		available: aiAvailable(),
		model: MODEL
	});
}
async function handleCodesense(request, remaining) {
	const apiKey = process.env.XAI_API_KEY;
	if (!apiKey) return jsonError({
		error: "AI_UNAVAILABLE",
		message: "AI features are unavailable in this environment."
	}, 503);
	let body;
	try {
		body = await request.json();
	} catch {
		return jsonError({
			error: "BAD_REQUEST",
			message: "Request body must be JSON."
		}, 400);
	}
	if (body.mode !== "explain" && body.mode !== "review" && body.mode !== "suggest") return jsonError({
		error: "BAD_REQUEST",
		message: "Unknown mode."
	}, 400);
	const language = String(body.language ?? "plaintext").slice(0, 40);
	const rawSnippet = String(body.snippet ?? "");
	const cursorLine = Number(body.cursorLine) || 1;
	const cursorCol = Number(body.cursorCol) || 1;
	if (!rawSnippet.trim()) return jsonError({
		error: "BAD_REQUEST",
		message: "Snippet is empty."
	}, 400);
	if (estimateTokens(rawSnippet) > 6400) return jsonError({
		error: "TOKEN_LIMIT_EXCEEDED",
		message: "Snippet is too large to send."
	}, 413);
	let snippet = budgetText(rawSnippet);
	if (body.mode === "suggest") {
		snippet = insertCursorMarker(snippet, cursorLine, cursorCol, 1);
		snippet = budgetText(snippet);
	}
	const messages = buildMessages({
		mode: body.mode,
		language,
		snippet,
		cursorLine,
		cursorCol
	});
	const timeout = AbortSignal.timeout(25e3);
	const signal = request.signal ? AbortSignal.any([request.signal, timeout]) : timeout;
	let upstream;
	try {
		upstream = await fetch("https://api.x.ai/v1/chat/completions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`
			},
			body: JSON.stringify({
				model: MODEL,
				stream: true,
				temperature: body.mode === "suggest" ? .2 : .35,
				max_tokens: MAX_OUTPUT_TOKENS[body.mode],
				messages: [{
					role: "system",
					content: messages.system
				}, {
					role: "user",
					content: messages.user
				}]
			}),
			signal
		});
	} catch (err) {
		const timedOut = signal.aborted && timeout.aborted && !request.signal?.aborted;
		return jsonError({
			error: timedOut ? "PROVIDER_TIMEOUT" : "PROVIDER_ERROR",
			message: timedOut ? "The model took too long to respond." : err instanceof Error ? err.message : "Failed to reach the model."
		}, timedOut ? 504 : 502);
	}
	if (!upstream.ok || !upstream.body) {
		let detail = `xAI API error ${upstream.status}`;
		try {
			const failed = await upstream.json();
			if (failed.error?.message) detail = failed.error.message;
		} catch {}
		return jsonError({
			error: "PROVIDER_ERROR",
			message: detail
		}, 502);
	}
	const stream = mapOpenAiStream(upstream.body, signal);
	return new Response(stream, { headers: sseHeaders(remaining) });
}
function mapOpenAiStream(upstream, signal) {
	const decoder = new TextDecoder();
	const encoder = new TextEncoder();
	let buffer = "";
	let sentDone = false;
	return new ReadableStream({
		async start(controller) {
			const reader = upstream.getReader();
			const abort = () => {
				reader.cancel();
			};
			signal.addEventListener("abort", abort, { once: true });
			const emit = (payload) => {
				controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
			};
			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split("\n");
					buffer = lines.pop() ?? "";
					for (const line of lines) {
						const trimmed = line.trim();
						if (!trimmed.startsWith("data:")) continue;
						const data = trimmed.slice(5).trim();
						if (!data) continue;
						if (data === "[DONE]") {
							if (!sentDone) {
								emit("[DONE]");
								sentDone = true;
							}
							continue;
						}
						try {
							const delta = JSON.parse(data).choices?.[0]?.delta?.content;
							if (delta) emit(JSON.stringify({ delta }));
						} catch {}
					}
				}
				if (!sentDone) emit("[DONE]");
				controller.close();
			} catch (err) {
				const timedOut = signal.aborted;
				emit(JSON.stringify({
					error: timedOut ? "PROVIDER_TIMEOUT" : "PROVIDER_ERROR",
					message: timedOut ? "The model took too long to respond." : err instanceof Error ? err.message : "Stream failed."
				}));
				if (!sentDone) emit("[DONE]");
				controller.close();
			} finally {
				signal.removeEventListener("abort", abort);
			}
		},
		cancel() {
			upstream.cancel();
		}
	});
}
var WINDOW_MS = 6e4;
var MAX_REQ = 12;
var buckets = /* @__PURE__ */ new Map();
function prune(now, stamps) {
	return stamps.filter((t) => now - t < WINDOW_MS);
}
function checkRateLimit(key) {
	const now = Date.now();
	const next = prune(now, buckets.get(key) ?? []);
	if (next.length >= MAX_REQ) {
		const oldest = next[0] ?? now;
		const retryAfter = Math.max(250, WINDOW_MS - (now - oldest));
		buckets.set(key, next);
		return {
			ok: false,
			remaining: 0,
			retryAfter
		};
	}
	next.push(now);
	buckets.set(key, next);
	return {
		ok: true,
		remaining: MAX_REQ - next.length,
		retryAfter: 0
	};
}
function clientKey(request) {
	const forwarded = request.headers.get("x-forwarded-for");
	if (forwarded) {
		const first = forwarded.split(",")[0]?.trim();
		if (first) return first;
	}
	return request.headers.get("x-real-ip") ?? "anon";
}
var Route = createFileRoute("/api/codesense")({ server: { handlers: {
	GET: async () => healthResponse(),
	POST: async ({ request }) => {
		const limit = checkRateLimit(clientKey(request));
		if (!limit.ok) return new Response(JSON.stringify({
			error: "RATE_LIMITED",
			message: "Too many requests. Pause for a moment, then try again.",
			retryAfter: limit.retryAfter
		}), {
			status: 429,
			headers: {
				"Content-Type": "application/json",
				"Retry-After": String(Math.ceil(limit.retryAfter / 1e3)),
				"X-RateLimit-Remaining": "0"
			}
		});
		return handleCodesense(request, limit.remaining);
	}
} } });
var rootRouteChildren = {
	IndexRoute: Route$1.update({
		id: "/",
		path: "/",
		getParentRoute: () => Route$2
	}),
	ApiCodesenseRoute: Route.update({
		id: "/api/codesense",
		path: "/api/codesense",
		getParentRoute: () => Route$2
	})
};
var routeTree = Route$2._addFileChildren(rootRouteChildren)._addFileTypes();
var router_exports = /* @__PURE__ */ __exportAll({ getRouter: () => getRouter });
function getRouter() {
	return createRouter({
		routeTree,
		defaultErrorComponent: AppErrorComponent
	});
}
//#endregion
export { DEFAULT_SETTINGS as a, stripCompletionFences as i, estimateTokens as n, LANGUAGES as o, extractSnippet as r, __exportAll as s, router_exports as t };
