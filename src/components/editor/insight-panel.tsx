import { Activity, Check, Copy, Lightbulb, ListChecks, PauseCircle, Play, ScanText, Sparkles, Square, ThumbsDown, ThumbsUp } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ParsedReview, ParsedTest, ReviewRisk, ReviewSeverity, StreamStatus } from "@/lib/codesense/types";
import { getActiveFile, useCodesense } from "@/lib/codesense/store";
import type { ComplexityReport } from "@/lib/codesense/complexity";
import { auditSecurity } from "@/lib/codesense/security-audit";
import { Markdown } from "./markdown";
import { RefactorDiffDialog } from "./refactor-diff-dialog";
import { cn } from "@/lib/utils";

export function InsightPanel() {
  const panelTab = useCodesense((s) => s.panelTab);
  const setPanelTab = useCodesense((s) => s.setPanelTab);
  const explain = useCodesense((s) => s.explain);
  const review = useCodesense((s) => s.review);
  const suggest = useCodesense((s) => s.suggest);
  const runSuggestTab = useCodesense((s) => s.runSuggestTab);
  const test = useCodesense((s) => s.test);
  const complexity = useCodesense((s) => s.complexity);
  const complexityStatus = useCodesense((s) => s.complexityStatus);
  const complexityError = useCodesense((s) => s.complexityError);
  const runComplexity = useCodesense((s) => s.runComplexity);
  const suggestPreview = useCodesense((s) => s.suggestPreview);
  const aiAvailable = useCodesense((s) => s.aiAvailable);
  const coachDismissed = useCodesense((s) => s.coachDismissed);
  const dismissCoach = useCodesense((s) => s.dismissCoach);

  const active =
    panelTab === "explain"
      ? explain
      : panelTab === "review"
        ? review
        : panelTab === "suggest"
          ? suggest
          : panelTab === "test"
            ? test
          : null;

  const loadHistory = useCodesense((s) => s.loadHistory);
  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

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
        <PanelTab
          active={panelTab === "suggest"}
          onClick={() => setPanelTab("suggest")}
          icon={<Sparkles className="size-3.5" />}
          label="Suggest"
          status={suggest.status}
        />
        <PanelTab
          active={panelTab === "test"}
          onClick={() => setPanelTab("test")}
          icon={<Play className="size-3.5" />}
          label="Test"
          status={test.status}
        />
        <PanelTab
          active={panelTab === "complexity"}
          onClick={() => setPanelTab("complexity")}
          icon={<Activity className="size-3.5" />}
          label="Profile"
          status={complexityStatus}
        />
        <CopyButton text={active?.text ?? ""} disabled={!active?.text} />
      </div>

      {!coachDismissed && (
        <div className="flex items-start gap-3 border-b border-border px-4 py-3">
          <p className="min-w-0 flex-1 text-xs leading-relaxed text-muted">
            Select a block to explain it. Save to review (and generate tests
            when "Tests on save" is on). Pause typing for ghost completions.
          </p>
          <Button variant="ghost" size="sm" onClick={dismissCoach}>
            Dismiss
          </Button>
        </div>
      )}

      <ScrollArea className="min-h-0 flex-1">
        <div className="px-4 py-4">
          {aiAvailable === false && panelTab !== "complexity" ? (
            <EmptyState
              icon={<PauseCircle className="size-5" />}
              title="AI is paused"
              body="The model gateway is not accepting requests right now. You can still edit, switch files, and save locally."
              muted
            />
          ) : panelTab === "explain" ? (
            <ExplainBody insight={explain} />
          ) : panelTab === "review" ? (
            <ReviewBody insight={review} />
          ) : panelTab === "suggest" ? (
            <SuggestBody
              insight={suggest}
              onTrigger={() => void runSuggestTab()}
            />
          ) : panelTab === "test" ? (
            <TestBody insight={test} />
          ) : (
            <ComplexityBody
              complexity={complexity}
              status={complexityStatus}
              error={complexityError}
              runComplexity={runComplexity}
            />
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

function SuggestBody({
  insight,
  onTrigger,
}: {
  insight: { text: string; status: StreamStatus; error: string | null };
  onTrigger: () => void;
}) {
  const [rated, setRated] = useState<"up" | "down" | undefined>();
  const rateFeedback = useCodesense((s) => s.rateFeedback);

  const rate = (key: string, kind: "up" | "down") => {
    setRated(kind);
    rateFeedback(key, kind);
    toast.success(kind === "up" ? "Helpful" : "Not helpful");
  };

  if (insight.status === "idle" && !insight.text) {
    return (
      <EmptyState
        icon={<Sparkles className="size-5" />}
        title="No suggestion generated yet"
        body="Press Trigger completion or pause while typing in the editor to stream intelligent code completions at your cursor."
        action={
          <Button variant="outline" size="sm" onClick={onTrigger}>
            Trigger completion
          </Button>
        }
        keybinding="Ctrl/Cmd+K"
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="size-4 text-accent" />
          Code completion
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onTrigger}
          disabled={insight.status === "streaming"}
        >
          Regenerate
        </Button>
      </div>

      {insight.status === "streaming" && !insight.text && (
        <p className="shimmer bg-clip-text text-sm text-muted">
          Generating completion...
        </p>
      )}

      {insight.text && (
        <div className="flex flex-col gap-3">
          <pre className="overflow-x-auto rounded-md bg-background p-3 font-mono text-xs leading-relaxed text-foreground shadow-border border border-border">
            {insight.text}
            {insight.status === "streaming" && <span className="streaming-caret" />}
          </pre>
          <div className="flex items-center gap-2">
            <ApplySuggestion text={insight.text} />
            <div className="flex gap-1 ml-auto">
              <ThumbButton
                kind="up"
                active={rated === "up"}
                onClick={() => rate(insight.text, "up")}
              />
              <ThumbButton
                kind="down"
                active={rated === "down"}
                onClick={() => rate(insight.text, "down")}
              />
            </div>
          </div>
        </div>
      )}

      {insight.error && (
        <p className="mt-2 text-sm text-destructive">{insight.error}</p>
      )}
    </div>
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
        icon={<ScanText className="size-5" />}
        title="Waiting on a selection"
        body="Highlight a function or press Explain to describe the code around the cursor."
        keybinding="Ctrl/Cmd+E"
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
    case "critical":
    case "high":
      return "danger";
    case "medium":
      return "warn";
    case "low":
      return "default";
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
  const runReview = useCodesense((s) => s.runReview);
  const file = useCodesense(getActiveFile);
  const fallback = useMemo(() => insight.text, [insight.text]);
  const securityFindings = useMemo(
    () => auditSecurity(file.content, file.language),
    [file.content, file.language],
  );

  if (insight.status === "idle" && !insight.text) {
    return (
      <EmptyState
        icon={<ListChecks className="size-5" />}
        title="No review yet"
        body="Save the file or press Review for a structured pass: summary, risks, optional refactor."
        action={
          <Button variant="outline" size="sm" onClick={() => void runReview("manual")}>
            Review file
          </Button>
        }
        keybinding="Ctrl/Cmd+S"
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
      <section className="flex flex-col gap-3">
        <p className="text-sm font-medium text-foreground uppercase tracking-wide">
          Security
        </p>
        <ul className="flex flex-col gap-2 pl-1">
          {securityFindings.map((finding) => (
            <RiskItem
              key={finding.msg + finding.line}
              risk={finding}
              rate={rate}
              rated={feedback[finding.msg]}
            />
          ))}
          {securityFindings.length === 0 && (
            <p className="text-sm text-muted">No security issues detected.</p>
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

function TestBody({
  insight,
}: {
  insight: {
    text: string;
    status: StreamStatus;
    error: string | null;
    test: ParsedTest | null;
  };
}) {
  const parsed = insight.test;
  const feedback = useCodesense((s) => s.feedback);
  const rateFeedback = useCodesense((s) => s.rateFeedback);
  const runTest = useCodesense((s) => s.runTest);
  const rated = feedback[parsed?.code ?? ""];

  if (insight.status === "idle" && !insight.text) {
    return (
      <EmptyState
        icon={<Play className="size-5" />}
        title="No tests yet"
        body="Generate tests from the toolbar or command palette, or enable &quot;Tests on save&quot; in settings and press Ctrl/Cmd+S."
        action={
          <Button variant="outline" size="sm" onClick={() => void runTest("manual")}>
            Generate tests
          </Button>
        }
      />
    );
  }

  if (insight.status === "streaming" && !insight.text) {
    return <p className="shimmer bg-clip-text text-sm text-muted">Generating tests</p>;
  }

  const rate = (key: string, kind: "up" | "down") => {
    rateFeedback(key, kind);
    toast(kind === "up" ? "Marked helpful" : "Noted — thanks", {
      description: "This helps improve CodeSense's test prompts.",
    });
  };

  if (!parsed) {
    return (
      <div>
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {insight.text}
          {insight.status === "streaming" && <span className="streaming-caret" />}
        </div>
        {insight.error && <p className="mt-3 text-sm text-destructive">{insight.error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-foreground uppercase tracking-wide">
          Framework
        </p>
        <Badge variant="default">{parsed.framework}</Badge>
        <p className="text-sm leading-relaxed text-foreground">
          {parsed.description}
        </p>
      </div>
      <section className="flex flex-col gap-3">
        <p className="text-sm font-medium text-foreground uppercase tracking-wide">
          Test cases
        </p>
        <ul className="flex flex-col gap-2 pl-1">
          {parsed.testCases.map((tc) => (
            <li key={tc.name} className="flex items-start gap-2 pt-2 border-l-2 pl-3 border-surface">
              <span className="text-sm leading-relaxed text-foreground">
                {tc.name}
              </span>
              <span className="text-xs text-muted">{tc.description}</span>
            </li>
          ))}
          {parsed.testCases.length === 0 && (
            <p className="text-sm text-muted">No test cases detected.</p>
          )}
        </ul>
      </section>
      <section className="flex flex-col gap-2">
        <p className="text-sm font-medium text-foreground uppercase tracking-wide">
          Test code
        </p>
        <pre className="overflow-x-auto rounded-md bg-background p-3 font-mono text-xs leading-relaxed text-foreground shadow-border">
          {parsed.code}
        </pre>
        <div className="flex gap-1">
          <CopyButton text={parsed.code} disabled={!parsed.code} />
          <ThumbButton kind="up" active={rated === "up"} onClick={() => rate(parsed.code, "up")} />
          <ThumbButton kind="down" active={rated === "down"} onClick={() => rate(parsed.code, "down")} />
        </div>
      </section>
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
  const [diffOpen, setDiffOpen] = useState(false);
  const file = useCodesense(getActiveFile);
  const setFileContent = useCodesense((s) => s.setFileContent);

  return (
    <>
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDiffOpen(true)}
          >
            Preview & Apply
          </Button>
          <ThumbButton kind="up" active={rated === "up"} onClick={() => rate(refactor.diff, "up")} />
          <ThumbButton kind="down" active={rated === "down"} onClick={() => rate(refactor.diff, "down")} />
        </div>
      </section>
      <RefactorDiffDialog
        open={diffOpen}
        onOpenChange={setDiffOpen}
        original={file.content}
        modified={refactor.diff}
        language={file.language}
        onApply={(content) => {
          setFileContent(file.id, content);
          toast.success("Refactor applied");
        }}
      />
    </>
  );
}

function EmptyState({
  title,
  body,
  icon,
  action,
  keybinding,
  muted,
}: {
  title: string;
  body: string;
  icon: ReactNode;
  action?: ReactNode;
  keybinding?: string;
  muted?: boolean;
}) {
  const iconRing = muted
    ? "bg-surface/60 text-muted"
    : "bg-accent/10 text-accent";
  return (
    <section className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-border bg-surface-2/50 p-6 shadow-border">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconRing} shadow-border`} aria-hidden="true">
        {icon}
      </div>
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <p className="text-xs leading-relaxed text-muted text-center max-w-[252px]">
        {body}
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
        {action}
        {keybinding && (
          <span className="inline-flex h-6 min-w-[34px] items-center justify-center rounded-md border border-surface px-1.5 text-[10px] font-medium text-muted shadow-border">
            {keybinding}
          </span>
        )}
      </div>
    </section>
  );
}


function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-surface-2 rounded-md p-2">
      <p className="text-xs text-muted uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function ComplexityBody({
  complexity,
  status,
  error,
  runComplexity,
}: {
  complexity: ComplexityReport | null;
  status: "idle" | "done" | "error";
  error: string | null;
  runComplexity: () => Promise<void>;
}) {
  const file = useCodesense(getActiveFile);
  const [ran, setRan] = useState(false);

  useEffect(() => {
    if (!complexity) {
      setRan(false);
    }
  }, [complexity]);

  useEffect(() => {
    if (ran || status !== "idle" || complexity || !file.content.trim()) {
      return;
    }
    void runComplexity();
    setRan(true);
  }, [ran, status, complexity, runComplexity, file.content]);

  if (error) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" size="sm" onClick={() => void runComplexity()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!complexity) {
    return (
      <EmptyState
        icon={<Activity className="size-5" />}
        title="No complexity profile yet"
        body="Press Profile in the toolbar to run a static complexity scan on the current file."
        action={
          <Button variant="outline" size="sm" onClick={() => void runComplexity()}>
            Run profile
          </Button>
        }
      />
    );
  }

  const issueVariant = (severity: "low" | "medium" | "high") =>
    severity === "high" ? "danger" : severity === "medium" ? "warn" : "default";

  const scoreVariant =
    complexity.score >= 80 ? "default" : complexity.score >= 60 ? "warn" : "danger";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Complexity profile</h2>
          <p className="text-xs text-muted">
            {complexity.language} · {complexity.lines} lines · score {complexity.score}/100
          </p>
        </div>
        <Badge variant={scoreVariant}>Score {complexity.score}</Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="Cyclomatic" value={String(complexity.cyclomatic)} />
        <Stat label="Max nesting" value={String(complexity.maxNestingDepth)} />
        <Stat label="Est. time" value={complexity.estimatedTime} />
        <Stat label="Est. space" value={complexity.estimatedSpace} />
      </div>

      {complexity.functions.length > 0 && (
        <section className="border-t border-border pt-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
            Functions
          </h3>
          <div className="overflow-x-auto mt-2">
            <table className="text-sm w-full">
              <thead>
                <tr>
                  <th className="text-left text-muted">Name</th>
                  <th className="text-right text-muted">Lines</th>
                  <th className="text-right text-muted">Cyclomatic</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-2">
                {complexity.functions.map((fn) => (
                  <tr key={fn.name}>
                    <td className="font-mono text-sm">{fn.name}</td>
                    <td className="text-right text-sm">{fn.lines}</td>
                    <td className="text-right text-sm">{fn.cyclomatic}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="border-t border-border pt-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
          Issues ({complexity.issues.length})
        </h3>
        {complexity.issues.length === 0 ? (
          <p className="mt-2 text-xs text-muted">No issues detected.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {complexity.issues.map((issue, i) => (
              <li key={i} className="flex items-start gap-2">
                <Badge variant={issueVariant(issue.severity)} className="text-xs shrink-0">
                  {issue.kind}
                </Badge>
                <div className="min-w-0">
                  <p className="text-sm leading-relaxed text-foreground">
                    {issue.message}
                  </p>
                  <p className="text-xs text-muted">Line {issue.line}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
