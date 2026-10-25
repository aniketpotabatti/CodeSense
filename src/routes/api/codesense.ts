import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { handleCodesense, healthResponse } from "@/lib/codesense/provider";
import { checkRateLimit, clientKey } from "@/lib/codesense/rate-limit";
import { apiKeyMiddleware } from "@/lib/codesense/apiKeyMiddleware";
import type { CodesenseRequest } from "@/lib/codesense/types";

// Request body validation schema. Snippets and keys are validated here but
// never logged â€” see provider.ts for the no-logging guarantee.
const ContextFileSchema = z.object({
  name: z.string().min(1).max(200),
  language: z.string().min(1).max(40),
  content: z.string().max(8000),
});

const CodesenseRequestSchema = z.object({
  mode: z.enum(["explain", "review", "suggest", "test"]),
  language: z.string().min(1).max(40),
  snippet: z.string().min(1),
  cursorLine: z.number().int().min(1).optional(),
  cursorCol: z.number().int().min(1).optional(),
  /** Other open files to include as background context. Capped at 5 entries. */
  contextFiles: z.array(ContextFileSchema).max(5).optional(),
});

export const Route = createFileRoute("/api/codesense")({
  server: {
    handlers: {
      GET: async ({ request }) => healthResponse(request),
      POST: async ({ request }) => {
        // Extract and attach API key from x-api-key header -> x-codesense-key
        const modifiedRequest = apiKeyMiddleware(request);

        const limit = checkRateLimit(clientKey(modifiedRequest));
        if (!limit.ok) {
          return new Response(
            JSON.stringify({
              error: "RATE_LIMITED",
              message: "Too many requests. Pause for a moment, then try again.",
              retryAfter: limit.retryAfter,
            }),
            {
              status: 429,
              headers: {
                "Content-Type": "application/json",
                "Retry-After": String(Math.ceil(limit.retryAfter / 1000)),
                "X-RateLimit-Remaining": "0",
              },
            },
          );
        }
        let body: CodesenseRequest;
        try {
          const raw = (await modifiedRequest.json()) as unknown;
          body = CodesenseRequestSchema.parse(raw) as CodesenseRequest;
        } catch {
          return new Response(
            JSON.stringify({
              error: "BAD_REQUEST",
              message: "Request body must be valid JSON with mode, language, and snippet.",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }

        // Rebuild the request with the validated body so downstream handlers
        // can re-parse it without re-reading the stream.
        const validatedRequest = new Request(modifiedRequest.url, {
          method: "POST",
          headers: Object.fromEntries(modifiedRequest.headers.entries()),
          body: JSON.stringify(body),
        });

        return handleCodesense(validatedRequest, limit.remaining);
      },
    },
  },
});
