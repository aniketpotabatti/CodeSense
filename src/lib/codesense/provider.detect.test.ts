import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { detectProvider, readKeyOverride, PROVIDER_LABELS } from "./provider.ts";
import { demoResponse } from "./provider.ts";

describe("codesense provider", () => {
  describe("detectProvider", () => {
    it("infers anthropic from sk-ant- prefix", () => {
      assert.equal(detectProvider("sk-ant-1234567890"), "anthropic");
    });
    it("infers xai from xai- prefix", () => {
      assert.equal(detectProvider("xai-abcdef"), "xai");
    });
    it("infers gemini from AIza prefix", () => {
      assert.equal(detectProvider("AIza1234567890"), "gemini");
    });
    it("infers gemini from AQ prefix", () => {
      assert.equal(detectProvider("AQ-xxx"), "gemini");
    });
    it("defaults to openai for unknown prefix", () => {
      assert.equal(detectProvider("sk-1234567890"), "openai");
    });
    it("honors explicit requested provider", () => {
      assert.equal(detectProvider("sk-anything", "gemini"), "gemini");
      assert.equal(detectProvider("sk-anything", "anthropic"), "anthropic");
      assert.equal(detectProvider("sk-anything", "xai"), "xai");
      assert.equal(detectProvider("sk-anything", "openai"), "openai");
    });
    it("falls back to openai for unknown requested provider", () => {
      assert.equal(detectProvider("sk-anything", "demo"), "openai");
      assert.equal(detectProvider("sk-anything", "nonsense"), "openai");
    });
  });

  describe("demoResponse", () => {
    it("produces non-empty explain text", () => {
      const out = demoResponse({ mode: "explain", language: "rust", snippet: "fn main() {}\n" });
      assert.ok(out.length > 20);
    });
    it("produces structured review with GOOD/IMPROVE/REFACTOR", () => {
      const out = demoResponse({ mode: "review", language: "typescript", snippet: "export const x = 1;\n" });
      assert.ok(out.includes("What's good") || out.includes("improve"));
      assert.ok(out.length > 50);
    });
    it("produces suggest completion", () => {
      const out = demoResponse({ mode: "suggest", language: "python", snippet: "def foo():\n    " });
      assert.ok(out.length > 0);
    });
  });
});

describe("codesense key override", () => {
  const makeReq = (headers: Record<string, string>): Request =>
    new Request("http://localhost/api/codesense", { headers });

  it("returns null when no key header", () => {
    assert.equal(readKeyOverride(makeReq({})), null);
  });
  it("parses valid key + provider headers", () => {
    const ov = readKeyOverride(
      makeReq({
        "x-codesense-key": "sk-ant-xyz",
        "x-codesense-provider": "anthropic",
      }),
    );
    assert.equal(ov?.key, "sk-ant-xyz");
    assert.equal(ov?.provider, "anthropic");
  });
  it("rejects key longer than 300 chars", () => {
    assert.equal(readKeyOverride(makeReq({ "x-codesense-key": "a".repeat(301) })), null);
  });
  it("reads BYOK key from x-api-key header", () => {
    const ov = readKeyOverride(makeReq({ "x-api-key": "sk-test-12345" }));
    assert.equal(ov?.key, "sk-test-12345");
    assert.equal(ov?.provider, "openai");
  });
});

describe("codesense health labels", () => {
  it("has labels for all providers", () => {
    assert.equal(PROVIDER_LABELS.gemini, "Google Gemini");
    assert.equal(PROVIDER_LABELS.anthropic, "Anthropic Claude");
    assert.equal(PROVIDER_LABELS.xai, "xAI Grok");
    assert.equal(PROVIDER_LABELS.openai, "OpenAI");
    assert.equal(PROVIDER_LABELS.demo, "Demo");
  });
});
