import { ListChecks } from "lucide-react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { estimateTokens, extractSnippet } from "@/lib/codesense/snippet";
import {
  getActiveFile,
  useCodesense,
  type Insight,
} from "@/lib/codesense/store";
import { cn } from "@/lib/utils";
import { version } from "../../../package.json";

export type AiTone = "muted" | "ok" | "warn" | "busy" | "error" | "demo";

export function StatusBar({ openInsight }: { openInsight?: () => void } = {}) {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const file = useCodesense(getActiveFile);
  const cursor = useCodesense((s) => s.cursor);
  const selection = useCodesense((s) => s.selection);
  const remaining = useCodesense((s) => s.remaining);
  const aiAvailable = useCodesense((s) => s.aiAvailable);
  const model = useCodesense((s) => s.model);
  const provider = useCodesense((s) => s.provider);
  const debounceMs = useCodesense((s) => s.settings.debounceMs);
  const apiKey = useCodesense((s) => s.settings.apiKey);
  const explain = useCodesense((s) => s.explain);
  const review = useCodesense((s) => s.review);
  const streaming = useCodesense((s) => s.streaming);

  const snippet = selection.trim()
    ? selection
    : extractSnippet(file.content, cursor.line).snippet;
  const tokens = estimateTokens(snippet);
  const busy = explain.status === "streaming" || review.status === "streaming";
  const hasError =
    explain.status === "error" || review.status === "error";

  let aiLabel = "Checking AI";
  let aiTone: "muted" | "ok" | "warn" | "busy" | "error" | "demo" = "muted";
  const hasUserKey = Boolean(apiKey && apiKey.trim());

  if (hasError) {
    aiLabel = "Error";
    aiTone = "error";
  } else if (busy) {
    aiLabel = "Streaming...";
    aiTone = "busy";
  } else if (hasUserKey) {
    const provName = model && model !== "Demo" && model !== "demo" ? model : "API Key active";
    aiLabel = `Got API Key � ${provName}`;
    aiTone = "ok";
  } else if (provider === "demo" || model === "Demo") {
    aiLabel = "Demo mode";
    aiTone = "demo";
  } else if (aiAvailable) {
    aiLabel = model;
    aiTone = "ok";
  } else {
    aiLabel = "Demo mode";
    aiTone = "demo";
  }

  const insightForLabel = (insight: Insight): string | null => {
    if (insight.status === "error") return insight.error ?? "Error";
    return null;
  };
  const explainErr = insightForLabel(explain);
  const reviewErr = insightForLabel(review);

  return (
    <footer className="flex h-8 shrink-0 items-center gap-3 overflow-hidden border-t border-border bg-surface px-3 font-mono text-xs text-muted">
      <span
        className="tabular-nums"
        title={`Ln ${cursor.line}, Col ${cursor.col}`}
      >
        Ln {cursor.line}, Col {cursor.col}
      </span>
      <span className="hidden sm:inline" title={file.language}>
        {file.language}
      </span>
      <span
        className="hidden tabular-nums md:inline"
        title={`${tokens} tokens`}
      >
        {tokens} tok
      </span>
      <span
        className="hidden tabular-nums lg:inline"
        title={`${debounceMs}ms debounce`}
      >
        {debounceMs}ms
      </span>
      <span className="hidden sm:inline" title="UTF-8">
        UTF-8
      </span>
      {isMobile && openInsight && (
        <button
          type="button"
          onClick={openInsight}
          aria-label="Open insights"
          className="-mr-1 flex h-6 items-center justify-center gap-1.5 rounded-md bg-surface-2 p-1.5 text-muted hover:bg-surface-2/80 hover:text-foreground"
        >
          <ListChecks className="size-3.5" />
          <span className="sr-only">Insights</span>
        </button>
      )}
      <span className="ml-auto flex items-center gap-2">
        {remaining !== null && (
          <span
            className="hidden tabular-nums sm:inline"
            title={`${remaining} requests remaining`}
          >
            {remaining} left
          </span>
        )}
        <a
          href="CHANGELOG.md"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline underline underline-offset-4 hover:text-accent transition-colors"
          title="View changelog"
        >
          v{version}
        </a>
        <span className="flex items-center gap-1.5">
          <span
            className={cn(
              "size-1.5 rounded-full",
              aiTone === "ok" && "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]",
              aiTone === "demo" && "bg-amber-500",
              aiTone === "busy" && "bg-accent animate-pulse",
              aiTone === "error" && "bg-destructive",
            )}
          />
          <span className="truncate" title={aiLabel}>
            {aiLabel}
          </span>
          {explainErr || reviewErr ? (
            <span
              className="text-destructive text-xs"
              title={(explainErr ?? reviewErr) ?? undefined}
            >
              �
            </span>
          ) : null}
          {streaming.startTime && (
            <span
              className="hidden sm:inline flex items-center gap-1"
              title="Streaming telemetry"
            >
              {streaming.ttftMs !== null && (
                <span
                  className="tabular-nums text-xs"
                  title={`Time to first token: ${streaming.ttftMs}ms`}
                >
                  TTFT {streaming.ttftMs}ms
                </span>
              )}
              {streaming.tps !== null && (
                <span
                  className="tabular-nums text-xs"
                  title={`Tokens per second: ${streaming.tps}`}
                >
                  TPS {streaming.tps}
                </span>
              )}
              {streaming.estimatedCostUsd !== null && (
                <span
                  className="tabular-nums text-xs"
                  title={`Estimated cost: $${streaming.estimatedCostUsd.toFixed(6)}`}
                >
                  Cost ${streaming.estimatedCostUsd.toFixed(6)}
                </span>
              )}
            </span>
          )}
        </span>
      </span>
    </footer>
  );
}
