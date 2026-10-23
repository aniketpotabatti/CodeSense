import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { checkRateLimit, clientKey } from "./rate-limit.ts";

const makeReq = (headers: Record<string, string>): Request =>
  new Request("http://localhost/api/codesense", { headers });

describe("rateLimit", () => {
  it("allows requests up to the limit, then rejects with retryAfter", () => {
    const key = "rate-user-a";
    let result: ReturnType<typeof checkRateLimit> | null = null;
    for (let i = 0; i < 12; i++) {
      result = checkRateLimit(key);
      assert.equal(result.ok, true);
      assert.equal(result.retryAfter, 0);
    }
    assert.equal(result!.remaining, 0);

    result = checkRateLimit(key);
    assert.equal(result.ok, false);
    assert.equal(result.remaining, 0);
    assert.ok(result.retryAfter > 0);
  });

  it("counts remaining down per request", () => {
    const key = "rate-user-b";
    assert.equal(checkRateLimit(key).remaining, 11);
    assert.equal(checkRateLimit(key).remaining, 10);
  });

  it("tracks separate buckets per key", () => {
    checkRateLimit("rate-user-c-1");
    checkRateLimit("rate-user-c-1");
    const other = checkRateLimit("rate-user-c-2");
    assert.equal(other.ok, true);
    assert.equal(other.remaining, 11);
  });

  it("clientKey prefers x-forwarded-for", () => {
    assert.equal(
      clientKey(makeReq({ "x-forwarded-for": "203.0.113.10, 10.0.0.1" })),
      "203.0.113.10",
    );
  });

  it("clientKey falls back to x-real-ip then anon", () => {
    assert.equal(clientKey(makeReq({ "x-real-ip": "198.51.100.7" })), "198.51.100.7");
    assert.equal(clientKey(makeReq({})), "anon");
  });
});
