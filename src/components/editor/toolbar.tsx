import { ChevronDown, ListChecks, Play, ScanText, Layers } from "lucide-react";
import { Logo } from "@/components/editor/logo";
import { SettingsSheet } from "@/components/editor/settings-sheet";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LANGUAGES } from "@/lib/codesense/types";
import { getActiveFile, useCodesense } from "@/lib/codesense/store";
import { cn } from "@/lib/utils";

export function Toolbar() {
  const file = useCodesense(getActiveFile);
  const files = useCodesense((s) => s.files);
  const activeFileId = useCodesense((s) => s.activeFileId);
  const settings = useCodesense((s) => s.settings);
  const setLanguage = useCodesense((s) => s.setLanguage);
  const runExplain = useCodesense((s) => s.runExplain);
  const runReview = useCodesense((s) => s.runReview);
  const runTest = useCodesense((s) => s.runTest);
  const explainStatus = useCodesense((s) => s.explain.status);
  const reviewStatus = useCodesense((s) => s.review.status);
  const testStatus = useCodesense((s) => s.test.status);
  const languageLabel =
    LANGUAGES.find((lang) => lang.id === file.language)?.label ?? file.language;

  const contextCount = settings.includeContext
    ? files.filter((f) => f.id !== activeFileId && f.content.trim()).length
    : 0;

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3 md:h-12 md:px-4">
      <Logo />
      <div className="mx-1 hidden h-5 w-px bg-border sm:block" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
            <span className="font-mono text-xs">{languageLabel}</span>
            <ChevronDown className="size-3.5 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {LANGUAGES.map((lang) => (
            <DropdownMenuItem
              key={lang.id}
              onSelect={() => setLanguage(lang.id)}
              className={cn(file.language === lang.id && "text-accent")}
            >
              {lang.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="ml-auto flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void runExplain("manual")}
              disabled={explainStatus === "streaming"}
            >
              <ScanText className="size-3.5" />
              <span className="hidden md:inline">Explain</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Explain selection or cursor context (Ctrl/Cmd+E)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void runReview("manual")}
              disabled={reviewStatus === "streaming"}
            >
              <ListChecks className="size-3.5" />
              <span className="hidden md:inline">Review</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Review the current file (Ctrl/Cmd+S)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void runTest("manual")}
              disabled={testStatus === "streaming"}
            >
              <Play className="size-3.5" />
              <span className="hidden md:inline">Test</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Generate unit tests for the current file</TooltipContent>
        </Tooltip>
        {contextCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" className="ml-1">
                <Layers className="size-3.5" />
                <span className="hidden sm:inline">{contextCount} files in context</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Other open tabs included as background context.
            </TooltipContent>
          </Tooltip>
        )}
        <SettingsSheet />
      </div>
    </header>
  );
}
