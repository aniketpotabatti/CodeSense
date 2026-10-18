/**
 * Middleware to extract the `x-api-key` header and attach it to the request
 * as `x-codesense-key` (the key expected by the existing auth logic).
 * Returns a new Request with the header set if present; otherwise returns the original.
 */
export function apiKeyMiddleware(request: Request): Request {
  const apiKey = request.headers.get("x-api-key")?.trim();
  if (!apiKey) {
    return request;
  }
  const headers = new Headers(request.headers);
  headers.set("x-codesense-key", apiKey);
  // Clone the request with updated headers; body and method remain unchanged.
  return new Request(request, { headers });
}