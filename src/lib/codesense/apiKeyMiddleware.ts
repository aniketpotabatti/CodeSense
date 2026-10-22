/**
 * Middleware to extract the `x-api-key` BYOK header so the provider layer can honor it.
 *
 * We deliberately do NOT reconstruct the Request to add an `x-codesense-key` header:
 * `new Request(request, { headers })` disturbs the incoming body in the Node/undici
 * server realm (even when it throws with "reading 'window'"), which would break
 * downstream `request.json()`. `readKeyOverride` reads `x-api-key` directly, so the
 * key is honored while leaving the request body intact.
 */
export function apiKeyMiddleware(request: Request): Request {
  const apiKey = request.headers.get("x-api-key")?.trim();
  if (!apiKey) {
    return request;
  }
  // The BYOK key is read from the `x-api-key` header directly by `readKeyOverride`.
  // We intentionally do NOT reconstruct the Request here: `new Request(request, { headers })`
  // disturbs the incoming body in the Node/undici server realm (even when it throws),
  // which would break downstream `request.json()`. Leaving the request untouched keeps
  // the body intact so `handleCodesense` can parse it.
  return request;
}