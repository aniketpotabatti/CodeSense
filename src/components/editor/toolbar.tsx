import { ChevronDown, ListChecks, ScanText } from "lucide-react";
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
  const setLanguage = useCodesense((s) => s.setLanguage);
  const runExplain = useCodesense((s) => s.runExplain);
  const runReview = useCodesense((s) => s.runReview);
  const explainStatus = useCodesense((s) => s.explain.status);
  const reviewStatus = useCodesense((s) => s.review.status);
  const languageLabel =
    LANGUAGES.find((lang) => lang.id === file.language)?.label ?? file.language;

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
        <SettingsSheet />
      </div>
    </header>
  );
}
