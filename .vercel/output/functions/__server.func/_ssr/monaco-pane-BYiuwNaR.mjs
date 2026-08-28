import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { i as useCodesense, n as EditorSkeleton, r as getActiveFile } from "./routes-DEYGv3fe.mjs";
import { t as loader } from "../_libs/@monaco-editor/loader+[...].mjs";
import { t as Ft } from "../_libs/monaco-editor__react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/monaco-pane-BYiuwNaR.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var MONACO_VS = "https://cdn.jsdelivr.net/npm/monaco-editor@0.56.0/min/vs";
if (typeof window !== "undefined") loader.config({ paths: { vs: MONACO_VS } });
var suggestRegistered = false;
var suggestGen = 0;
function defineTheme(monaco) {
	monaco.editor.defineTheme("codesense-dark", {
		base: "vs-dark",
		inherit: true,
		rules: [
			{
				token: "comment",
				foreground: "5c5e68",
				fontStyle: "italic"
			},
			{
				token: "string",
				foreground: "b7c9a8"
			},
			{
				token: "keyword",
				foreground: "8fb4c9"
			},
			{
				token: "number",
				foreground: "c4a574"
			},
			{
				token: "type",
				foreground: "7ec8c0"
			}
		],
		colors: {
			"editor.background": "#0c0d10",
			"editor.foreground": "#e8e6e3",
			"editorLineNumber.foreground": "#3d3f48",
			"editorLineNumber.activeForeground": "#8b8d97",
			"editor.selectionBackground": "#7ec8c033",
			"editor.inactiveSelectionBackground": "#7ec8c018",
			"editor.lineHighlightBackground": "#14151a",
			"editorCursor.foreground": "#7ec8c0",
			"editorIndentGuide.background1": "#1c1d24",
			"editorWidget.background": "#14151a",
			"editorSuggestWidget.background": "#14151a",
			"editorGutter.background": "#0c0d10",
			focusBorder: "#00000000"
		}
	});
}
function registerSuggestProvider(monaco) {
	if (suggestRegistered) return;
	suggestRegistered = true;
	monaco.languages.registerInlineCompletionsProvider({ pattern: "**" }, {
		provideInlineCompletions: async (_model, position, _ctx, token) => {
			const state = useCodesense.getState();
			if (!state.settings.suggestOnIdle || !state.hasTyped) return { items: [] };
			const gen = ++suggestGen;
			await sleep(state.settings.debounceMs);
			if (token.isCancellationRequested || gen !== suggestGen) return { items: [] };
			const controller = new AbortController();
			token.onCancellationRequested(() => controller.abort());
			try {
				const insertText = await state.runSuggest(controller.signal);
				if (!insertText || token.isCancellationRequested) return { items: [] };
				return { items: [{
					insertText,
					range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column)
				}] };
			} catch {
				return { items: [] };
			}
		},
		disposeInlineCompletions: () => {}
	});
}
function MonacoPane() {
	const file = useCodesense(getActiveFile);
	const setFileContent = useCodesense((s) => s.setFileContent);
	const setCursor = useCodesense((s) => s.setCursor);
	const setSelection = useCodesense((s) => s.setSelection);
	const markTyped = useCodesense((s) => s.markTyped);
	const editorRef = (0, import_react.useRef)(null);
	const monacoRef = (0, import_react.useRef)(null);
	const selectTimer = (0, import_react.useRef)(null);
	const lastSelection = (0, import_react.useRef)("");
	(0, import_react.useEffect)(() => {
		const editor = editorRef.current;
		const monaco = monacoRef.current;
		if (!editor || !monaco) return;
		const model = editor.getModel();
		if (!model) return;
		if (model.getLanguageId() !== file.language) monaco.editor.setModelLanguage(model, file.language);
		if (model.getValue() !== file.content) {
			const pos = editor.getPosition();
			model.setValue(file.content);
			if (pos) editor.setPosition(pos);
		}
	}, [
		file.content,
		file.language,
		file.id
	]);
	const handleMount = (editor, monaco) => {
		editorRef.current = editor;
		monacoRef.current = monaco;
		defineTheme(monaco);
		monaco.editor.setTheme("codesense-dark");
		registerSuggestProvider(monaco);
		editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
			useCodesense.getState().runReview("save");
		});
		editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyE, () => {
			useCodesense.getState().runExplain("manual");
		});
		editor.onDidChangeCursorPosition((event) => {
			setCursor(event.position.lineNumber, event.position.column);
		});
		editor.onDidChangeCursorSelection((event) => {
			const model = editor.getModel();
			if (!model) return;
			const text = model.getValueInRange(event.selection);
			setSelection(text);
			if (selectTimer.current) window.clearTimeout(selectTimer.current);
			const trimmed = text.trim();
			if (trimmed.length < 8 || trimmed === lastSelection.current) return;
			const wait = useCodesense.getState().settings.debounceMs;
			selectTimer.current = window.setTimeout(() => {
				lastSelection.current = trimmed;
				useCodesense.getState().runExplain("select");
			}, wait);
		});
		editor.onDidChangeModelContent(() => {
			const model = editor.getModel();
			if (!model) return;
			markTyped();
			const id = useCodesense.getState().activeFileId;
			setFileContent(id, model.getValue());
		});
		const pos = editor.getPosition();
		if (pos) setCursor(pos.lineNumber, pos.column);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ft, {
		height: "100%",
		theme: "codesense-dark",
		language: file.language,
		value: file.content,
		loading: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EditorSkeleton, {}),
		beforeMount: defineTheme,
		onMount: handleMount,
		options: {
			fontFamily: "\"IBM Plex Mono\", ui-monospace, Menlo, Consolas, monospace",
			fontSize: 13.5,
			lineHeight: 22,
			minimap: { enabled: false },
			padding: {
				top: 16,
				bottom: 16
			},
			scrollBeyondLastLine: false,
			automaticLayout: true,
			tabSize: 2,
			wordWrap: "on",
			renderLineHighlight: "line",
			cursorBlinking: "smooth",
			smoothScrolling: true,
			overviewRulerLanes: 0,
			hideCursorInOverviewRuler: true,
			scrollbar: {
				verticalScrollbarSize: 8,
				horizontalScrollbarSize: 8
			},
			inlineSuggest: { enabled: true },
			quickSuggestions: false,
			suggestOnTriggerCharacters: false,
			wordBasedSuggestions: "off",
			folding: true,
			glyphMargin: false,
			renderWhitespace: "none",
			contextmenu: true,
			ariaLabel: "CodeSense editor"
		}
	});
}
function sleep(ms) {
	return new Promise((resolve) => window.setTimeout(resolve, ms));
}
//#endregion
export { MonacoPane };
