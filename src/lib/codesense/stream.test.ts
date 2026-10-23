import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CodesenseApiError, isGatewayError, streamCodesense } from "./stream.ts";
import type { CodesenseRequest } from "./types.ts";

function makeRequest(): CodesenseRequest {
  return {
    mode: "explain",
    language: "typescript",
    snippet: "const x = 1;",
    cursorLine: 1,
    cursorCol: 1,
  };
}

function sseBody(deltas: string[], done = true): Response {
  const enc = new TextEncoder();
  const chunks = deltas.map((d) => `data: ${JSON.stringify({ delta: d })}\n\n`);
  if (done) chunks.push("data: [DONE]\n\n");
  const stream = new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(enc.encode(c));
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });
}

describe("stream", () => {
  describe("CodesenseApiError", () => {
    it("carries code, message, and optional retryAfter", () => {
      const err = new CodesenseApiError({
        error: "RATE_LIMITED",
        message: "slow down",
        retryAfter: 3,
      });
      assert.equal(err.name, "CodesenseApiError");
      assert.equal(err.code, "RATE_LIMITED");
      assert.equal(err.message, "slow down");
      assert.equal(err.retryAfter, 3);
    });
  });

  describe("isGatewayError", () => {
    it("recognizes valid gateway errors", () => {
      assert.equal(isGatewayError({ error: "RATE_LIMITED", message: "m" }), true);
    });
    it("rejects non-objects and records missing fields", () => {
      assert.equal(isGatewayError(null), false);
      assert.equal(isGatewayError({ error: "x" }), false);
      assert.equal(isGatewayError({ message: "m" }), false);
      assert.equal(isGatewayError("boom"), false);
    });
  });

  describe("streamCodesense", () => {
    it("streams deltas to onDelta and returns remaining", async () => {
      const realFetch = globalThis.fetch;
      let calls = 0;
      globalThis.fetch = (async () => {
        calls += 1;
        return sseBody(["hel", "lo"]);
      }) as typeof fetch;
      try {
        const signal = new AbortController().signal;
        const received: string[] = [];
        const res = await streamCodesense(makeRequest(), signal, (d) =>
          received.push(d),
        );
        assert.equal(calls, 1);
        assert.deepEqual(received, ["hel", "lo"]);
        assert.equal(res.remaining, null);
      } finally {
        globalThis.fetch = realFetch;
      }
    });

    it("throws a CodesenseApiError for a non-retryable gateway error", async () => {
      const realFetch = globalThis.fetch;
      globalThis.fetch = (async () =>
        new Response(
          JSON.stringify({ error: "INVALID_MODE", message: "bad mode" }),
          { status: 400, headers: { "content-type": "application/json" } },
        )) as typeof fetch;
      try {
        const signal = new AbortController().signal;
        await assert.rejects(
          streamCodesense(makeRequest(), signal, () => {}),
          (err: unknown) =>
            err instanceof CodesenseApiError && err.code === "INVALID_MODE",
        );
      } finally {
        globalThis.fetch = realFetch;
      }
    });
  });
});
