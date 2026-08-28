import { useEffect } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { EditorCanvas } from "@/components/editor/editor-canvas";
import { FileTabs } from "@/components/editor/file-tabs";
import { InsightPanel } from "@/components/editor/insight-panel";
import { StatusBar } from "@/components/editor/status-bar";
import { Toolbar } from "@/components/editor/toolbar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useCodesense } from "@/lib/codesense/store";

export function AppShell() {
  const isMobile = useMediaQuery("(max-width: 767px)");

  useEffect(() => {
    void useCodesense.persist.rehydrate();
    void useCodesense.getState().probeHealth();
  }, []);

  return (
    <TooltipProvider>
      <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-background text-foreground">
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
              defaultSize={isMobile ? "55%" : "64%"}
              minSize="28%"
            >
              <div className="h-full min-h-0 bg-background">
                <EditorCanvas />
              </div>
            </Panel>
            <Separator className="codesense-handle" />
            <Panel
              id="insight"
              defaultSize={isMobile ? "45%" : "36%"}
              minSize="22%"
            >
              <InsightPanel />
            </Panel>
          </Group>
        </div>
        <StatusBar />
      </div>
    </TooltipProvider>
  );
}
