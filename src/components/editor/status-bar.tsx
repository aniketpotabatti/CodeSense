import { estimateTokens, extractSnippet } from "@/lib/codesense/snippet";
import { getActiveFile, useCodesense } from "@/lib/codesense/store";
import { cn } from "@/lib/utils";

export function StatusBar() {
  const file = useCodesense(getActiveFile);
  const cursor = useCodesense((s) => s.cursor);
  const selection = useCodesense((s) => s.selection);
  const remaining = useCodesense((s) => s.remaining);
  const aiAvailable = useCodesense((s) => s.aiAvailable);
  const model = useCodesense((s) => s.model);
  const debounceMs = useCodesense((s) => s.settings.debounceMs);
  const explain = useCodesense((s) => s.explain.status);
  const review = useCodesense((s) => s.review.status);

  const snippet = selection.trim()
    ? selection
    : extractSnippet(file.content, cursor.line).snippet;
  const tokens = estimateTokens(snippet);
  const busy = explain === "streaming" || review === "streaming";

  let aiLabel = "Checking AI";
  let aiTone: "muted" | "ok" | "warn" | "busy" = "muted";
  if (aiAvailable === false) {
    aiLabel = "AI unavailable";
    aiTone = "warn";
  } else if (aiAvailable) {
    aiLabel = busy ? "Streaming" : model;
    aiTone = busy ? "busy" : "ok";
  }

  return (
    <footer className="flex h-8 shrink-0 items-center gap-3 overflow-hidden border-t border-border bg-surface px-3 font-mono text-xs text-muted">
      <span className="tabular-nums">
        Ln {cursor.line}, Col {cursor.col}
      </span>
      <span className="hidden sm:inline">{file.language}</span>
      <span className="hidden tabular-nums md:inline">{tokens} tok</span>
      <span className="hidden tabular-nums lg:inline">{debounceMs}ms</span>
      <span className="ml-auto flex items-center gap-2">
        {remaining !== null && (
          <span className="hidden tabular-nums sm:inline">{remaining} left</span>
        )}
        <span className="flex items-center gap-1.5">
          <span
            className={cn(
              "size-1.5 rounded-full",
              aiTone === "ok" && "bg-success",
              aiTone === "busy" && "bg-accent",
              aiTone === "warn" && "bg-destructive",
              aiTone === "muted" && "bg-subtle",
            )}
          />
          <span className="truncate">{aiLabel}</span>
        </span>
      </span>
    </footer>
  );
}
