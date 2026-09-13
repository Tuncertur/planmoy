/**
 * The Cloudflare Worker entry — the app's SSR error boundary of last resort.
 *
 * `wrangler.jsonc` points `main` here instead of straight at
 * `@tanstack/react-start/server-entry`, so every server-rendered request
 * passes through this file. Its job: if rendering fails in a way the
 * framework itself does not handle, the visitor still gets a branded 500
 * page (never a raw stack trace, never a blank screen) and the real error
 * still reaches the logs.
 *
 * Scope, stated precisely because it drives what belongs here:
 *   - Route/loader errors are ALREADY handled by TanStack Router's own
 *     error boundary (verified: a throwing loader renders the app shell
 *     with a 500 and leaks nothing). Those never reach this catch.
 *   - What DOES reach it: a failure importing or invoking the server
 *     entry itself, and any throw that escapes the framework entirely.
 *
 * The entry is imported LAZILY and memoized: a module-level import would
 * run framework initialization before this file's error handling is in
 * place, which is exactly when an unguarded crash hurts most.
 *
 * Note the handler call passes ONLY the request. The framework's second
 * parameter is `RequestOptions` (early hints, inline CSS, request
 * context) — NOT the Worker's `env`/`ctx`, which reach app code through
 * `cloudflare:workers` instead. Forwarding `env` here would push a
 * bindings object into a slot that means something else entirely.
 */

import type { ServerEntry } from "@tanstack/react-start/server-entry";

import { renderErrorPage } from "./lib/error-page";

let serverEntryPromise: Promise<ServerEntry> | undefined;

function getServerEntry(): Promise<ServerEntry> {
  serverEntryPromise ??= import("@tanstack/react-start/server-entry").then(
    (m) => m.default,
  );
  return serverEntryPromise;
}

export default {
  async fetch(request: Request): Promise<Response> {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request);
      const headers = new Headers(response.headers);
      headers.set("X-Content-Type-Options", "nosniff");
      // The FireVibe workspace renders this app in a cross-origin preview iframe
      // (app.firevibe.ai -> *.firevibe.dev). SAMEORIGIN would make that iframe
      // appear as "refused to connect" even though the app itself is healthy.
      headers.delete("X-Frame-Options");
      headers.set(
        "Content-Security-Policy",
        "frame-ancestors 'self' https://app.firevibe.ai https://*.firevibe.ai https://*.firevibe.dev",
      );
      headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
      headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");
      headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
      headers.set("Cross-Origin-Resource-Policy", "same-origin");
      headers.set("X-DNS-Prefetch-Control", "off");
      headers.set("X-Permitted-Cross-Domain-Policies", "none");
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    } catch (error) {
      // The log line is the developer's (and the agent's) only signal —
      // the visitor-facing page deliberately carries no detail.
      console.error(error);
      // A failed import must not be cached as a permanently broken entry:
      // clearing it lets the next request retry a transient failure.
      serverEntryPromise = undefined;
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
