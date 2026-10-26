import { useEffect, useState } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { EditorCanvas } from "@/components/editor/editor-canvas";
import { FileTabs } from "@/components/editor/file-tabs";
import { InsightPanel } from "@/components/editor/insight-panel";
import { StatusBar } from "@/components/editor/status-bar";
import { Toolbar } from "@/components/editor/toolbar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MarkdownStyles } from "./markdown";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useCodesense } from "@/lib/codesense/store";
import { Content as SheetContent, Root as Sheet } from "vaul";

export function AppShell() {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [insightOpen, setInsightOpen] = useState(false);

  useEffect(() => {
    void useCodesense.persist.rehydrate();
    void useCodesense.getState().probeHealth();
  }, []);

  return (
    <TooltipProvider>
      <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-background text-foreground">
        <MarkdownStyles />
        <Toolbar />
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-border bg-surface">
            <FileTabs />
          </div>
          <Group
            orientation={isMobile ? "vertical" : "horizontal"}
            className="min-h-0 flex-1"
            id="codesense-split"
          >
            <Panel
              id="editor"
              defaultSize={isMobile ? "100%" : "64%"}
              minSize={isMobile ? "100%" : "28%"}
            >
              <div className="h-full min-h-0 bg-background">
                <EditorCanvas />
              </div>
            </Panel>
            {!isMobile && (
              <>
                <Separator className="codesense-handle" />
                <Panel
                  id="insight"
                  defaultSize="36%"
                  minSize="22%"
                >
                  <InsightPanel />
                </Panel>
              </>
            )}
          </Group>
        </div>
        {isMobile ? (
          <>
            <StatusBar openInsight={() => setInsightOpen(true)} />
            <Sheet
              open={insightOpen}
              onOpenChange={setInsightOpen}
              direction="bottom"
              snapPoints={[40, 100]}
            >
              <SheetContent className="min-h-[30vh]">
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                  <span className="text-sm font-semibold tracking-tight">
                    Insights
                  </span>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                  <InsightPanel />
                </div>
              </SheetContent>
            </Sheet>
          </>
        ) : (
          <StatusBar />
        )}
      </div>
    </TooltipProvider>
  );
}
