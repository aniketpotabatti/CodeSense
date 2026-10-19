import { Check, Copy, Lightbulb, ListChecks, ScanText, ThumbsDown, ThumbsUp } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ParsedReview, ReviewRisk, ReviewSeverity, StreamStatus } from "@/lib/codesense/types";
import { useCodesense } from "@/lib/codesense/store";
import { Markdown } from "./markdown";
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
              <ApplySuggestion text={suggestPreview} />
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

function ApplySuggestion({ text }: { text: string }) {
  const applySuggest = useCodesense((s) => s.applySuggest);
  const hasEditor = useCodesense((s) => s.editor != null);

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={!hasEditor}
      onClick={() => applySuggest(text)}
    >
      <Check className="size-3.5 mr-2" /> Apply suggestion
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
        <div className="text-sm leading-relaxed text-foreground">
          <Markdown text={insight.text} />
          {insight.status === "streaming" && <span className="streaming-caret" />}
        </div>
      )}
      {insight.error && (
        <p className="mt-3 text-sm text-destructive">{insight.error}</p>
      )}
    </div>
  );
}

function severityVariant(severity: ReviewSeverity) {
  switch (severity) {
    case "low":
      return "secondary";
    case "medium":
      return "warn";
    case "high":
      return "danger";
  }
}

function ThumbButton({
  kind,
  active,
  onClick,
}: {
  kind: "up" | "down";
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={kind === "up" ? "Mark helpful" : "Mark not helpful"}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-surface-2 px-2 py-1 text-xs transition-colors",
        active
          ? kind === "up"
            ? "border-success text-success bg-success/10"
            : "border-destructive text-destructive bg-destructive/10"
          : "text-muted hover:border-surface hover:text-foreground",
      )}
    >
      {kind === "up" ? <ThumbsUp className="size-3.5" /> : <ThumbsDown className="size-3.5" />}
    </button>
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
  const feedback = useCodesense((s) => s.feedback);
  const rateFeedback = useCodesense((s) => s.rateFeedback);
  const fallback = useMemo(() => insight.text, [insight.text]);

  if (insight.status === "idle" && !insight.text) {
    return (
      <EmptyState
        title="No review yet"
        body="Save the file or press Review for a structured pass: summary, risks, optional refactor."
      />
    );
  }

  if (insight.status === "streaming" && !insight.text) {
    return <p className="shimmer bg-clip-text text-sm text-muted">Reviewing the file</p>;
  }

  const rate = (key: string, kind: "up" | "down") => {
    rateFeedback(key, kind);
    toast(kind === "up" ? "Marked helpful" : "Noted — thanks", {
      description: "This helps improve CodeSense's review prompts.",
    });
  };

  if (!parsed) {
    return (
      <div>
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          <Markdown text={fallback} />
          {insight.status === "streaming" && <span className="streaming-caret" />}
        </div>
        {insight.error && (
          <p className="mt-3 text-sm text-destructive">{insight.error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-2">
        <p className="text-sm font-medium text-foreground uppercase tracking-wide">
          Summary
        </p>
        <Markdown text={parsed.summary} />
      </section>
      <section className="flex flex-col gap-2">
        <p className="text-sm font-medium text-foreground uppercase tracking-wide">
          Walkthrough
        </p>
        <Markdown text={parsed.walkthrough} />
      </section>
      <section className="flex flex-col gap-3">
        <p className="text-sm font-medium text-foreground uppercase tracking-wide">
          Risks
        </p>
        <ul className="flex flex-col gap-2 pl-1">
          {parsed.risks.map((risk) => (
            <RiskItem key={risk.msg} risk={risk} rate={rate} rated={feedback[risk.msg]} />
          ))}
          {parsed.risks.length === 0 && (
            <p className="text-sm text-muted">No risks detected.</p>
          )}
        </ul>
      </section>
      {parsed.refactor && (
        <RefactorBlock
          refactor={parsed.refactor}
          rate={rate}
          rated={feedback[parsed.refactor.diff]}
        />
      )}
      {insight.error && <p className="mt-3 text-sm text-destructive">{insight.error}</p>}
    </div>
  );
}

function RiskItem({
  risk,
  rate,
  rated,
}: {
  risk: ReviewRisk;
  rate: (key: string, kind: "up" | "down") => void;
  rated: "up" | "down" | undefined;
}) {
  const label = risk.severity.charAt(0).toUpperCase() + risk.severity.slice(1);
  return (
    <li className="flex flex-col gap-2 pt-2 border-l-2 pl-3 border-surface">
      <div className="flex items-center gap-2">
        <Badge variant={severityVariant(risk.severity)}>
          <span className="mr-1">{label}</span>
          {risk.line != null && <span className="mr-1">line {risk.line}</span>}
        </Badge>
      </div>
      <p className="text-sm leading-relaxed text-foreground">{risk.msg}</p>
      <div className="flex gap-1">
        <ThumbButton kind="up" active={rated === "up"} onClick={() => rate(risk.msg, "up")} />
        <ThumbButton kind="down" active={rated === "down"} onClick={() => rate(risk.msg, "down")} />
      </div>
    </li>
  );
}

function RefactorBlock({
  refactor,
  rate,
  rated,
}: {
  refactor: NonNullable<ParsedReview["refactor"]>;
  rate: (key: string, kind: "up" | "down") => void;
  rated: "up" | "down" | undefined;
}) {
  return (
    <section className="flex flex-col gap-2 border border-border rounded-md bg-surface-2/50 p-3">
      <div className="flex items-center gap-2">
        <Lightbulb className="size-3.5" />
        <span className="text-xs font-semibold uppercase tracking-wide">
          Optional refactor
        </span>
      </div>
      {refactor.description && (
        <p className="text-sm leading-relaxed text-foreground">{refactor.description}</p>
      )}
      <pre className="overflow-x-auto rounded-md bg-background p-3 font-mono text-xs leading-relaxed text-foreground shadow-border">
        {refactor.diff}
      </pre>
      <div className="flex gap-1">
        <ThumbButton kind="up" active={rated === "up"} onClick={() => rate(refactor.diff, "up")} />
        <ThumbButton kind="down" active={rated === "down"} onClick={() => rate(refactor.diff, "down")} />
      </div>
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
