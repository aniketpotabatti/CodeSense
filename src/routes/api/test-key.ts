import { createFileRoute } from "@tanstack/react-router";
import { callUpstream, readKeyOverride } from "@/lib/codesense/provider";
import { buildMessages } from "@/lib/codesense/prompts";
import type { Mode } from "@/lib/codesense/types";

// POST /api/test-key — validates a BYOK key by making a minimal completion
// request to the selected provider. Returns latency on success.
// Snippets/keys are validated but never logged (see provider.ts).
export const Route = createFileRoute("/api/test-key")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const keyOverride = readKeyOverride(request);
        if (!keyOverride) {
          return new Response(
            JSON.stringify({
              error: "BAD_REQUEST",
              message: "Missing X-Codesense-Key header.",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }

        const { key, provider } = keyOverride;
        const mode: Mode = "explain";

        const startTime = Date.now();
        const controller = new AbortController();
        const timeout = AbortSignal.timeout(10_000);
        const signal = AbortSignal.any([controller.signal, timeout]);
        try {
          const upstream = await callUpstream(
            provider,
            key,
            buildMessages({
              mode,
              language: "typescript",
              snippet: "const x = 1;",
              cursorLine: 1,
              cursorCol: 1,
            }),
            mode,
            signal,
          );

          if (!upstream.ok || !upstream.body) {
            const detail = await upstream.text().catch(() => upstream.statusText);
            return new Response(
              JSON.stringify({
                error: "PROVIDER_ERROR",
                message: `Provider rejected key: ${detail.slice(0, 200)}`,
              }),
              { status: 401, headers: { "Content-Type": "application/json" } }
            );
          }

          // Read the first chunk to confirm the stream is live.
          const reader = upstream.body.getReader();
          await reader.read();
          await reader.cancel();

          const latencyMs = Date.now() - startTime;
          return new Response(
            JSON.stringify({
              ok: true,
              provider,
              latencyMs,
              model: provider === "xai" ? "grok-4.5" : "default",
            }),
            { headers: { "Content-Type": "application/json" } }
          );
        } catch (err) {
          const timedOut = signal.aborted;
          return new Response(
            JSON.stringify({
              error: timedOut ? "PROVIDER_TIMEOUT" : "PROVIDER_ERROR",
              message: timedOut
                ? "The provider took too long to respond."
                : err instanceof Error
                  ? err.message
                  : "Key validation failed.",
            }),
            {
              status: timedOut ? 504 : 502,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      },
    },
  },
});
