import { RotateCcw, Settings2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useCodesense } from "@/lib/codesense/store";
import { encryptKey, decryptKey } from "@/lib/codesense/crypto";

export function SettingsSheet() {
  const [open, setOpen] = useState(false);
  const settings = useCodesense((s) => s.settings);
  const patchSettings = useCodesense((s) => s.patchSettings);
  const resetFiles = useCodesense((s) => s.resetFiles);
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    // Decrypt the stored key for display. If decryption fails (e.g. after a
    // page reload where the session key was lost), fall back to empty so the
    // user re-enters the key — plaintext is never persisted in localStorage.
    (async () => {
      const decrypted = await decryptKey(settings.apiKey);
      setApiKey(decrypted ?? "");
    })();
  }, [settings.apiKey]);

  async function saveApiKey() {
    const trimmed = apiKey.trim();
    let stored = trimmed;
    if (trimmed) {
      stored = await encryptKey(trimmed);
    }
    patchSettings({ apiKey: stored });
    setOpen(false);
    if (trimmed) {
      toast.success("API key saved", {
        description: "Live requests will use the provided key.",
      });
    } else {
      toast.info("API key cleared", {
        description: "Running in demo mode.",
      });
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Settings">
          <Settings2 className="size-4" />
        </Button>
      </SheetTrigger>
      <SheetContent title="Settings" side="right">
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-4">
            <h3 className="text-xs font-medium tracking-wide text-muted uppercase">
              Modes
            </h3>
            <SettingRow
              label="Explain on select"
              hint="After you highlight code, stream a short explanation."
              checked={settings.explainOnSelect}
              onCheckedChange={(checked) =>
                patchSettings({ explainOnSelect: checked })
              }
            />
            <SettingRow
              label="Review on save"
              hint="Ctrl/Cmd+S runs a structured review of the file."
              checked={settings.reviewOnSave}
              onCheckedChange={(checked) =>
                patchSettings({ reviewOnSave: checked })
              }
            />
            <SettingRow
              label="Ghost completions"
              hint="After you pause typing, suggest the next few tokens."
              checked={settings.suggestOnIdle}
              onCheckedChange={(checked) =>
                patchSettings({ suggestOnIdle: checked })
              }
            />
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <h3 className="text-xs font-medium tracking-wide text-muted uppercase">
                Debounce
              </h3>
              <span className="font-mono text-xs tabular-nums text-foreground">
                {settings.debounceMs}ms
              </span>
            </div>
            <Slider
              min={300}
              max={1200}
              step={50}
              value={[settings.debounceMs]}
              onValueChange={([value]) => {
                if (typeof value === "number") patchSettings({ debounceMs: value });
              }}
              aria-label="Debounce delay"
            />
            <p className="text-xs leading-relaxed text-muted">
              Wait this long after a selection or pause before calling the model.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-medium tracking-wide text-muted uppercase">
              Workspace
            </h3>
            <Button
              variant="outline"
              onClick={() => {
                resetFiles();
                setOpen(false);
              }}
            >
              <RotateCcw className="size-3.5" />
              Reset sample files
            </Button>
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-medium tracking-wide text-muted uppercase">
              Provider
            </h3>
            <div className="flex items-center gap-2 border-border rounded-md bg-input px-2.5 py-1.5 focus-within:ring-accent">
              <input
                type="text"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="sk-…"
                aria-label="API key"
                className="flex-1 bg-transparent border-none outline-none text-xs text-foreground placeholder:text-muted"
              />
              <Button size="sm" onClick={saveApiKey}>
                Save key
              </Button>
            </div>
            <p className="text-xs text-muted">
              Stored in your browser (localStorage). Clear the field and save
              to go back to demo mode.
            </p>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SettingRow({
  label,
  hint,
  checked,
  onCheckedChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4">
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-sm text-foreground">{label}</span>
        <span className="text-xs leading-relaxed text-muted">{hint}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  );
}
