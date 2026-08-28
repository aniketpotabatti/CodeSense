import {
  AlertTriangle,
  Check,
  Copy,
  Lightbulb,
  ListChecks,
  ScanText,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ParsedReview, StreamStatus } from "@/lib/codesense/types";
import { useCodesense } from "@/lib/codesense/store";
import { cn } from "@/lib/utils";

export function InsightPanel() {
  const panelTab = useCodesense((s) => s.panelTab);
  const setPanelTab = useCodesense((s) => s.setPanelTab);
  const explain = useCodesense((s) => s.explain);
  const review = useCodesense((s) => s.review);
  const suggestPreview = useCodesense((s) => s.suggestPreview);
  const aiAvailable = useCodesense((s) => s.aiAvailable);
  const coachDismissed = useCodesense((s) => s.coachDismissed);
  const dismissCoach = useCodesense((s) => s.dismissCoach);

  const active = panelTab === "explain" ? explain : review;

  return (
    <aside className="flex h-full min-h-0 flex-col bg-surface">
      <div className="flex h-11 shrink-0 items-center gap-1 border-b border-border px-2 md:h-9">
        <PanelTab
          active={panelTab === "explain"}
          onClick={() => setPanelTab("explain")}
          icon={<ScanText className="size-3.5" />}
          label="Explain"
          status={explain.status}
        />
        <PanelTab
          active={panelTab === "review"}
          onClick={() => setPanelTab("review")}
          icon={<ListChecks className="size-3.5" />}
          label="Review"
          status={review.status}
        />
        <CopyButton text={active.text} disabled={!active.text} />
      </div>

      {!coachDismissed && (
        <div className="flex items-start gap-3 border-b border-border px-4 py-3">
          <p className="min-w-0 flex-1 text-xs leading-relaxed text-muted">
            Select a block to explain it. Save to run a review. Pause typing for
            ghost completions.
          </p>
          <Button variant="ghost" size="sm" onClick={dismissCoach}>
            Dismiss
          </Button>
        </div>
      )}

      <ScrollArea className="min-h-0 flex-1">
        <div className="px-4 py-4">
          {aiAvailable === false ? (
            <EmptyState
              title="AI is paused"
              body="The model gateway is not accepting requests right now. You can still edit, switch files, and save locally."
            />
          ) : panelTab === "explain" ? (
            <ExplainBody insight={explain} />
          ) : (
            <ReviewBody insight={review} />
          )}

          {suggestPreview && (
            <div className="mt-6 border-t border-border pt-4">
              <p className="mb-2 text-xs font-medium tracking-wide text-muted uppercase">
                Last completion
              </p>
              <pre className="overflow-x-auto rounded-md bg-background p-3 font-mono text-xs leading-relaxed text-foreground shadow-border">
                {suggestPreview}
              </pre>
            </div>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}

function PanelTab({
  active,
  onClick,
  icon,
  label,
  status,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  status: StreamStatus;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-9 items-center gap-2 rounded-md px-2.5 text-xs font-medium transition-colors duration-150 md:h-7",
        active
          ? "bg-background text-foreground shadow-border"
          : "text-muted hover:text-foreground",
      )}
    >
      {icon}
      {label}
      {status === "streaming" && (
        <span className="size-1.5 rounded-full bg-accent" />
      )}
    </button>
  );
}

function CopyButton({ text, disabled }: { text: string; disabled: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="icon"
      className="ml-auto"
      disabled={disabled}
      aria-label="Copy insight"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success("Copied to clipboard");
        window.setTimeout(() => setCopied(false), 1200);
      }}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </Button>
  );
}

function ExplainBody({
  insight,
}: {
  insight: { text: string; status: StreamStatus; error: string | null };
}) {
  if (insight.status === "idle" && !insight.text) {
    return (
      <EmptyState
        title="Waiting on a selection"
        body="Highlight a function or press Explain to describe the code around the cursor."
      />
    );
  }
  return (
    <div>
      {insight.status === "streaming" && !insight.text && (
        <p className="shimmer bg-clip-text text-sm text-muted">Reading the snippet</p>
      )}
      {insight.text && (
        <p className="text-sm leading-relaxed text-foreground">
          {insight.text}
          {insight.status === "streaming" && <span className="streaming-caret" />}
        </p>
      )}
      {insight.error && (
        <p className="mt-3 text-sm text-destructive">{insight.error}</p>
      )}
    </div>
  );
}

function ReviewBody({
  insight,
}: {
  insight: {
    text: string;
    status: StreamStatus;
    error: string | null;
    review: ParsedReview | null;
  };
}) {
  const parsed = insight.review;
  const fallback = useMemo(() => insight.text, [insight.text]);

  if (insight.status === "idle" && !insight.text) {
    return (
      <EmptyState
        title="No review yet"
        body="Save the file or press Review for a structured pass: strengths, issues, one refactor."
      />
    );
  }

  if (insight.status === "streaming" && !insight.text) {
    return <p className="shimmer bg-clip-text text-sm text-muted">Reviewing the file</p>;
  }

  if (!parsed) {
    return (
      <div>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {fallback}
          {insight.status === "streaming" && <span className="streaming-caret" />}
        </p>
        {insight.error && (
          <p className="mt-3 text-sm text-destructive">{insight.error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <ReviewSection
        icon={<Check className="size-3.5" />}
        tone="success"
        title="What's good"
        items={parsed.good}
      />
      <ReviewSection
        icon={<AlertTriangle className="size-3.5" />}
        tone="warn"
        title="What to improve"
        items={parsed.improve}
      />
      <ReviewSection
        icon={<Lightbulb className="size-3.5" />}
        tone="accent"
        title="Optional refactor"
        items={parsed.refactor}
      />
      {insight.status === "streaming" && <span className="streaming-caret" />}
      {insight.error && (
        <p className="text-sm text-destructive">{insight.error}</p>
      )}
    </div>
  );
}

function ReviewSection({
  icon,
  tone,
  title,
  items,
}: {
  icon: ReactNode;
  tone: "success" | "warn" | "accent";
  title: string;
  items: string[];
}) {
  if (items.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Badge variant={tone === "accent" ? "accent" : tone}>
          <span className="mr-1">{icon}</span>
          {title}
        </Badge>
      </div>
      <ul className="flex flex-col gap-2 pl-1">
        {items.map((item) => (
          <li key={item} className="text-sm leading-relaxed text-foreground">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h2 className="text-sm font-medium text-foreground">{title}</h2>
      <p className="text-sm leading-relaxed text-muted">{body}</p>
    </div>
  );
}
