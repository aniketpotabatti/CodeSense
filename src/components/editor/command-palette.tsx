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
import { Check, Download, ListChecks, Palette, ScanText, Search } from "lucide-react";
import { toast } from "sonner";
import { getActiveFile, useCodesense } from "@/lib/codesense/store";
import { LANGUAGES, type LanguageId } from "@/lib/codesense/types";
import { cn } from "@/lib/utils";

const LANGUAGE_EXT: Record<string, string> = {
  typescript: "ts",
  javascript: "js",
  python: "py",
  go: "go",
  rust: "rs",
  java: "java",
  json: "json",
  html: "html",
  css: "css",
  sql: "sql",
  markdown: "md",
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const file = useCodesense(getActiveFile);
  const setLanguage = useCodesense((s) => s.setLanguage);
  const patchSettings = useCodesense((s) => s.patchSettings);
  const runExplain = useCodesense((s) => s.runExplain);
  const runReview = useCodesense((s) => s.runReview);
  const explainStatus = useCodesense((s) => s.explain.status);
  const reviewStatus = useCodesense((s) => s.review.status);
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

  const handleThemeToggle = useCallback(() => {
    setOpen(false);
    patchSettings({ theme: theme === "dark" ? "light" : "dark" });
  }, [theme, patchSettings]);

  const handleExport = useCallback(() => {
    setOpen(false);
    const ext = LANGUAGE_EXT[file.language] ?? "txt";
    const blob = new Blob(
      [`\`\`\`${file.language}\n${file.content}\n\`\`\``],
      { type: "text/markdown" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${file.name}.${ext}`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${file.name}.${ext}`);
  }, [file]);

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
