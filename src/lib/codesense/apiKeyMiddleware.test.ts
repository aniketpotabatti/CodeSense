import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { apiKeyMiddleware } from "./apiKeyMiddleware";

describe("apiKeyMiddleware", () => {
  it("should pass through request unchanged when no x-api-key header", () => {
    const req = new Request("http://example.com", { method: "POST" });
    const res = apiKeyMiddleware(req);
    assert.strictEqual(res, req);
  });

  it("should pass through request unchanged when x-api-key present", async () => {
    const headers = new Headers();
    headers.set("x-api-key", "test-key");
    headers.set("other", "value");
    const req = new Request("http://example.com", { method: "POST", headers, body: '{"a":1}' });
    const res = apiKeyMiddleware(req);

    // Passthrough: same instance, headers and body intact.
    // readKeyOverride reads x-api-key directly, so we never reconstruct the Request
    // (which would disturb the body in the Node/undici server realm).
    assert.strictEqual(res, req);
    assert.strictEqual(res.headers.get("x-api-key"), "test-key");
    assert.strictEqual(res.headers.get("other"), "value");
    assert.strictEqual(await res.text(), '{"a":1}');
  });
});