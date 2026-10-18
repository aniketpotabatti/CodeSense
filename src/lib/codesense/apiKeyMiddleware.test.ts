import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { apiKeyMiddleware } from "./apiKeyMiddleware";

describe("apiKeyMiddleware", () => {
  it("should pass through request when no x-api-key header", () => {
    const req = new Request("http://example.com", { method: "POST" });
    const res = apiKeyMiddleware(req);
    assert.strictEqual(res, req);
  });

  it("should set x-codesense-key header when x-api-key present", () => {
    const headers = new Headers();
    headers.set("x-api-key", "test-key");
    headers.set("other", "value");
    const req = new Request("http://example.com", { method: "POST", headers });
    const res = apiKeyMiddleware(req);

    assert.strictEqual(res.headers.get("x-codesense-key"), "test-key");
    assert.strictEqual(res.headers.get("other"), "value");
    // Ensure it's a new instance
    assert.notStrictEqual(res, req);
  });
});