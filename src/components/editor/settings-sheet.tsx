import {
  RotateCcw,
  Settings2,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Clock,
  Key,
  Moon,
  Sun,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useCodesense } from "@/lib/codesense/store";
import { type Settings } from "@/lib/codesense/types";
import { encryptKey, decryptKey } from "@/lib/codesense/crypto";

/** Client-side provider detection from key prefix (mirrors server-side detectProvider). */
function detectProviderClient(key: string): "gemini" | "anthropic" | "xai" | "openai" | null {
  if (!key.trim()) return null;
  if (key.startsWith("sk-ant-")) return "anthropic";
  if (key.startsWith("xai-")) return "xai";
  if (key.startsWith("AIza") || key.startsWith("AQ-") || key.startsWith("AQ.")) return "gemini";
  return "openai";
}

const PROVIDER_LABELS: Record<string, { label: string; dotClass: string }> = {
  gemini: { label: "Google Gemini", dotClass: "bg-blue-500" },
  anthropic: { label: "Anthropic Claude", dotClass: "bg-red-500" },
  xai: { label: "xAI Grok", dotClass: "bg-green-500" },
  openai: { label: "OpenAI", dotClass: "bg-black" },
};

interface SettingsCardProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

function SettingsCard({ icon, title, children }: SettingsCardProps) {
  return (
    <section className="flex flex-col gap-2 rounded-md border border-border bg-surface-2/50 shadow-border p-2.5">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-xs font-medium tracking-wide text-muted uppercase">
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
}

function ThemePicker() {
  const theme = useCodesense((s) => s.settings.theme);
  const patchSettings = useCodesense((s) => s.patchSettings);

  return (
    <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md border border-border bg-surface-2/50">
      <span className="text-xs font-medium text-muted">Theme</span>
      <div className="inline-flex items-center rounded-md border border-border bg-surface">
        <Button
          variant={theme === "dark" ? "accent" : "ghost"}
          size="icon"
          onClick={() => patchSettings({ theme: "dark" })}
          aria-label="Dark theme"
          aria-pressed={theme === "dark"}
        >
          <Moon className="size-3.5" />
        </Button>
        <Button
          variant={theme === "light" ? "accent" : "ghost"}
          size="icon"
          onClick={() => patchSettings({ theme: "light" })}
          aria-label="Light theme"
          aria-pressed={theme === "light"}
        >
          <Sun className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function SettingsSheet() {
  const [open, setOpen] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const settings = useCodesense((s) => s.settings);
  const patchSettings = useCodesense((s) => s.patchSettings);
  const resetFiles = useCodesense((s) => s.resetFiles);
  const probeHealth = useCodesense((s) => s.probeHealth);
  const [apiKey, setApiKey] = useState("");
  const [ping, setPing] = useState<{
    status: "idle" | "testing" | "ok" | "error";
    latencyMs: number | null;
    provider: string | null;
    error: string | null;
  }>({ status: "idle", latencyMs: null, provider: null, error: null });

  const detectedProvider = useMemo(() => detectProviderClient(apiKey), [apiKey]);

  useEffect(() => {
    // Decrypt the stored key for display. If decryption fails (e.g. after a
    // page reload where the session key was lost), fall back to empty so the
    // user re-enters the key — plaintext is never persisted in localStorage.
    (async () => {
      const decrypted = await decryptKey(settings.apiKey);
      setApiKey(decrypted ?? "");
    })();
  }, [settings.apiKey]);

  // Apply the selected theme to the document so changes preview live,
  // including the persisted theme restored on first mount.
  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);

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

  async function handleTestPing() {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      setPing({
        status: "error",
        latencyMs: null,
        provider: null,
        error: "Enter an API key first.",
      });
      return;
    }
    setPing({ status: "testing", latencyMs: null, provider: null, error: null });
    try {
      const startTime = Date.now();
      const res = await fetch("/api/test-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Codesense-Key": trimmed,
        },
      });
      const body = (await res.json().catch(() => null)) as {
        ok?: boolean;
        provider?: string;
        latencyMs?: number;
        model?: string;
        message?: string;
      } | null;
      const provider = body?.provider ?? detectedProvider ?? null;
      if (res.ok && body?.ok) {
        setPing({
          status: "ok",
          latencyMs: body.latencyMs ?? Date.now() - startTime,
          provider,
          error: null,
        });
        toast.success("Key verified", {
          description: `Connected to ${PROVIDER_LABELS[provider ?? "openai"]?.label ?? "provider"} (${
            body.latencyMs ?? Date.now() - startTime
          }ms).`,
        });
      } else {
        setPing({
          status: "error",
          latencyMs: null,
          provider: null,
          error: body?.message ?? `Provider rejected key (${res.status}).`,
        });
        toast.error("Key verification failed", {
          description: body?.message ?? "The provider did not accept the key.",
        });
      }
    } catch (err) {
      setPing({
        status: "error",
        latencyMs: null,
        provider: null,
        error: err instanceof Error ? err.message : "Key verification failed.",
      });
      toast.error("Key verification failed", {
        description: "Unable to reach the provider.",
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
        <div className="flex flex-col gap-4">
          <ThemePicker />
          <SettingsCard icon={<Settings2 className="size-3.5" />} title="Modes">
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
              label="Tests on save"
              hint="Ctrl/Cmd+S also generates unit tests for the file."
              checked={settings.testOnSave}
              onCheckedChange={(checked) =>
                patchSettings({ testOnSave: checked })
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
            <SettingRow
              label="Include open files as context"
              checked={settings.includeContext}
              onCheckedChange={(checked) =>
                patchSettings({ includeContext: checked })
              }
              hint="Send other open tabs as background context for Explain / Review."
            />
          </SettingsCard>

          <SettingsCard icon={<Clock className="size-3.5" />} title="Performance">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium text-foreground">Debounce delay</span>
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
          </SettingsCard>


          <SettingsCard icon={<Key className="size-3.5" />} title="AI Provider">
            <div className="flex items-center gap-2 border-border rounded-md bg-input px-2 py-1 focus-within:ring-accent">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowKey((prev) => !prev)}
                aria-label={showKey ? "Hide API key" : "Show API key"}
                className="p-1"
              >
                {showKey ? (
                  <EyeOff className="size-3.5 text-muted" />
                ) : (
                  <Eye className="size-3.5 text-muted" />
                )}
              </Button>
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="Enter Gemini, OpenAI, Claude, or xAI key…"
                aria-label="API key"
                className="flex-1 bg-transparent border-none outline-none text-xs text-foreground placeholder:text-muted"
              />
              {detectedProvider && (
                <span
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border border-border/50 bg-background/50"
                >
                  <span
                    className={`inline-block size-1.5 rounded-full ${PROVIDER_LABELS[detectedProvider].dotClass}`}
                  />
                  {PROVIDER_LABELS[detectedProvider].label}
                </span>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={handleTestPing}
                disabled={ping.status === "testing" || !apiKey.trim()}
              >
                {ping.status === "testing" ? (
                  <>
                    <span className="animate-pulse">…</span>
                    Testing…
                  </>
                ) : (
                  "Test Key"
                )}
              </Button>
              <Button size="sm" onClick={saveApiKey}>
                Save key
              </Button>
            </div>
            <p className="text-xs text-muted">
              Stored in your browser (localStorage). Clear the field and save
              to go back to demo mode.
            </p>
            {ping.status !== "idle" && (
              <div
                className={[
                  "flex items-center gap-2 px-2 py-1 rounded-md text-xs font-medium",
                  ping.status === "ok"
                    ? "border-success/30 bg-success/10 text-success"
                    : ping.status === "error"
                    ? "border-destructive/30 bg-destructive/10 text-destructive"
                    : "border-surface-2/50 bg-surface-2/5 text-muted",
                ].join(" ")}
              >
                {ping.status === "testing" && (
                  <>
                    <span className="animate-pulse">…</span>
                    <span>Testing key…</span>
                  </>
                )}
                {ping.status === "ok" && (
                  <>
                    <Check className="size-3.5" />
                    <span>
                      Connected to{" "}
                      {PROVIDER_LABELS[ping.provider ?? "openai"]?.label ??
                        "provider"} ({ping.latencyMs}ms)
                    </span>
                  </>
                )}
                {ping.status === "error" && (
                  <>
                    <AlertCircle className="size-3.5" />
                    <span>{ping.error}</span>
                  </>
                )}
              </div>
            )}
          </SettingsCard>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              resetFiles();
              setOpen(false);
            }}
            className="self-start"
          >
            <RotateCcw className="size-3.5" />
            Reset sample files
          </Button>
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
    <label className="flex items-center justify-between gap-2.5 px-2 py-1 rounded-md hover:bg-surface-2/40 transition-colors">
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-xs text-muted">{hint}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  );
}
