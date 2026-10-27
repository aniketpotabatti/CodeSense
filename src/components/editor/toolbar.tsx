import { Activity, ChevronDown, File, ListChecks, Play, ScanText, Sparkles, Layers } from "lucide-react";
import { Logo } from "@/components/editor/logo";
import { CommandPalette } from "@/components/editor/command-palette";
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
  const patchSettings = useCodesense((s) => s.patchSettings);
  const setLanguage = useCodesense((s) => s.setLanguage);
  const runExplain = useCodesense((s) => s.runExplain);
  const runReview = useCodesense((s) => s.runReview);
  const runSuggestTab = useCodesense((s) => s.runSuggestTab);
  const runTest = useCodesense((s) => s.runTest);
  const runComplexity = useCodesense((s) => s.runComplexity);
  const explainStatus = useCodesense((s) => s.explain.status);
  const reviewStatus = useCodesense((s) => s.review.status);
  const suggestStatus = useCodesense((s) => s.suggest.status);
  const testStatus = useCodesense((s) => s.test.status);
  const languageLabel =
    LANGUAGES.find((lang) => lang.id === file.language)?.label ?? file.language;

  const contextFiles = settings.includeContext
    ? files.filter((f) => f.id !== activeFileId && f.content.trim())
    : [];
  const contextCount = contextFiles.length;

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
              className="bg-[#00e5ff] text-[#13151b] hover:bg-[#00e5ff]/90"
              onClick={() => void runSuggestTab()}
              disabled={suggestStatus === "streaming"}
            >
              <Sparkles className="size-3.5" />
              <span className="hidden md:inline">Suggest</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Generate code completion at cursor</TooltipContent>
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
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void runComplexity()}
            >
              <Activity className="size-3.5" />
              <span className="hidden md:inline">Profile</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Run complexity profiler on the current file
          </TooltipContent>
        </Tooltip>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="relative ml-1">
              <Layers className="size-3.5" />
              {contextCount > 0 && (
                <span className="absolute -top-1 -right-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-medium leading-none text-accent-foreground">
                  {contextCount}
                </span>
              )}
              <span className="sr-only">
                {contextCount > 0
                  ? `${contextCount} files in context`
                  : "No files in context"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-2">
            <div className="px-3 py-1.5">
              <h3 className="text-sm font-semibold">
                Active Background Context ({contextCount})
              </h3>
              <p className="text-xs text-muted-foreground">
                Other open tabs included as context for AI actions.
              </p>
            </div>
            <div className="mx-1 my-1 h-px bg-border" />
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {contextFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-2 px-2 py-1.5 text-xs"
                >
                  <File className="size-3.5 opacity-50" />
                  <span className="truncate">{file.name}</span>
                  <span className="ml-auto flex items-center gap-1.5">
                    <span className="rounded-full border border-border px-1.5 py-0 text-[10px] text-muted-foreground">
                      {file.language}
                    </span>
                    <span className="text-muted-foreground">
                      {file.content.length} chars
                    </span>
                  </span>
                </div>
              ))}
            </div>
            <div className="mx-1 my-1 h-px bg-border" />
            <DropdownMenuItem
              onClick={() =>
                void patchSettings({ includeContext: !settings.includeContext })
              }
              className={!settings.includeContext ? "text-muted-foreground" : undefined}
            >
              {settings.includeContext
                ? "Disable multi-file context"
                : "Enable multi-file context"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <CommandPalette />
        <SettingsSheet />
      </div>
    </header>
  );
}
