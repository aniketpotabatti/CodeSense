import { createFileRoute } from "@tanstack/react-router";
import { handleCodesense, healthResponse } from "@/lib/codesense/provider";
import { checkRateLimit, clientKey } from "@/lib/codesense/rate-limit";

export const Route = createFileRoute("/api/codesense")({
  server: {
    handlers: {
      GET: async () => healthResponse(),
      POST: async ({ request }) => {
        const limit = checkRateLimit(clientKey(request));
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
        return handleCodesense(request, limit.remaining);
      },
    },
  },
});
