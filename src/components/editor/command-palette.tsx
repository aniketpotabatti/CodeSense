import { useCallback, useEffect, useState } from "react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "cmdk";
import { Check, Download, ListChecks, Palette, Play, ScanText, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { getActiveFile, useCodesense, type Insight } from "@/lib/codesense/store";
import { FileTab, LANGUAGES, type LanguageId } from "@/lib/codesense/types";
import { cn } from "@/lib/utils";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const file = useCodesense(getActiveFile);
  const setLanguage = useCodesense((s) => s.setLanguage);
  const patchSettings = useCodesense((s) => s.patchSettings);
  const runExplain = useCodesense((s) => s.runExplain);
  const runReview = useCodesense((s) => s.runReview);
  const runTest = useCodesense((s) => s.runTest);
  const runSuggestTab = useCodesense((s) => s.runSuggestTab);
  const explainStatus = useCodesense((s) => s.explain.status);
  const reviewStatus = useCodesense((s) => s.review.status);
  const testStatus = useCodesense((s) => s.test.status);
  const suggestStatus = useCodesense((s) => s.suggest.status);
  const review = useCodesense((s) => s.review);
  const theme = useCodesense((s) => s.settings.theme);

  // Global Cmd+K / Ctrl+K shortcut. Don't steal it while the user is typing in
  // an input or the editor's IME textarea.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "k"
      ) {
        const target = event.target as HTMLElement | null;
        if (
          target?.closest(
            "input, textarea, select, [contenteditable='true']",
          )
        ) {
          return;
        }
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Apply the persisted theme to the document so the toggle takes effect.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const handleExplain = useCallback(() => {
    setOpen(false);
    void runExplain("manual");
  }, [runExplain]);

  const handleReview = useCallback(() => {
    setOpen(false);
    void runReview("manual");
  }, [runReview]);

  const handleSuggest = useCallback(() => {
    setOpen(false);
    void runSuggestTab();
  }, [runSuggestTab]);

  const handleTest = useCallback(() => {
    setOpen(false);
    void runTest("manual");
  }, [runTest]);

  const handleThemeToggle = useCallback(() => {
    setOpen(false);
    patchSettings({ theme: theme === "dark" ? "light" : "dark" });
  }, [theme, patchSettings]);

  const handleExport = useCallback(() => {
    setOpen(false);
    const baseName = file.name.replace(/\.[^/.]+$/, "") || file.name;
    const blob = new Blob([buildExportMarkdown(file, review)], {
      type: "text/markdown",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${baseName}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${baseName}.md`);
  }, [file, review]);

  const handleLanguage = useCallback(
    (id: LanguageId) => {
      setOpen(false);
      setLanguage(id);
    },
    [setLanguage],
  );

  return (
    <>
      <button
        type="button"
        aria-label="Open command palette (Cmd+K)"
        className="relative inline-flex items-center justify-center rounded-md bg-surface-2 text-muted p-1.5 hover:bg-surface-2/80 hover:text-foreground"
        onClick={() => setOpen(true)}
        title="Command palette (Cmd+K)"
      >
        <Search className="size-4" />
        <span className="sr-only">Command palette</span>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command>
          <CommandInput placeholder="Type a command..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                onSelect={handleExplain}
                disabled={explainStatus === "streaming"}
              >
                <ScanText className="size-3.5 shrink-0" />
                Explain code
                <span className="ml-auto text-xs text-muted">
                  Ctrl/Cmd+E
                </span>
              </CommandItem>
              <CommandItem
                onSelect={handleReview}
                disabled={reviewStatus === "streaming"}
              >
                <ListChecks className="size-3.5 shrink-0" />
                Review file
                <span className="ml-auto text-xs text-muted">
                  Ctrl/Cmd+S
                </span>
              </CommandItem>
              <CommandItem
                onSelect={handleSuggest}
                disabled={suggestStatus === "streaming"}
              >
                <Sparkles className="size-3.5 shrink-0" />
                Suggest code completion
              </CommandItem>
              <CommandItem
                onSelect={handleTest}
                disabled={testStatus === "streaming"}
              >
                <Play className="size-3.5 shrink-0" />
                Generate tests
              </CommandItem>
              <CommandSeparator />
              <CommandItem onSelect={handleExport}>
                <Download className="size-3.5 shrink-0" />
                Export file as Markdown
              </CommandItem>
              <CommandItem onSelect={handleThemeToggle}>
                <Palette className="size-3.5 shrink-0" />
                Switch to{" "}
                {theme === "dark" ? "light" : "dark"} theme
              </CommandItem>
            </CommandGroup>
            <CommandGroup heading="Language">
              {LANGUAGES.map((lang) => (
                <CommandItem
                  key={lang.id}
                  value={lang.id}
                  onSelect={() => handleLanguage(lang.id)}
                  className={cn(
                    file.language === lang.id && "text-accent font-medium",
                  )}
                >
                  {lang.label}
                  {file.language === lang.id && (
                    <Check className="ml-auto size-3.5 shrink-0" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}


function buildExportMarkdown(file: FileTab, review: Insight): string {
  const lines: string[] = [];
  const parsed = review.review;
  const date = new Date().toISOString().slice(0, 10);

  lines.push(`# Code Review: ${file.name}`);
  lines.push("");
  lines.push(
    `Reviewed on ${date} · ${file.language} · ${file.content.length} characters`,
  );
  lines.push("");

  if (parsed) {
    lines.push("## Summary");
    lines.push("");
    lines.push(parsed.summary);
    lines.push("");

    if (parsed.walkthrough.trim()) {
      lines.push("## Walkthrough");
      lines.push("");
      lines.push(parsed.walkthrough);
      lines.push("");
    }

    if (parsed.risks.length) {
      lines.push("## Risks");
      lines.push("");
      for (const risk of parsed.risks) {
        const at = risk.line != null ? `line ${risk.line}: ` : "";
        lines.push(`- [${risk.severity}] ${at}${risk.msg}`);
      }
      lines.push("");
    }

    if (parsed.refactor) {
      lines.push("## Suggested refactor");
      lines.push("");
      if (parsed.refactor.description) {
        lines.push(parsed.refactor.description);
        lines.push("");
      }
      lines.push("```diff");
      lines.push(parsed.refactor.diff);
      lines.push("```");
      lines.push("");
    }
  } else if (review.text.trim()) {
    lines.push("## Review");
    lines.push("");
    lines.push(review.text);
    lines.push("");
  }

  lines.push("## Code");
  lines.push("");
  lines.push(`\`\`\`${file.language}`);
  lines.push(file.content);
  lines.push("```");
  lines.push("");

  return lines.join("\n");
}
