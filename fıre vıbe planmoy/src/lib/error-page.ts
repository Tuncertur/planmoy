/**
 * The 500 page a visitor sees when server rendering fails.
 *
 * Deliberately dependency-free and self-contained: it must render when the
 * app itself could not, so it cannot import components, styles, or router
 * context. Inline styles only, no external requests, no build step.
 *
 * It never shows the underlying error. Stack traces and messages can carry
 * table names, query fragments, and secrets; the visitor gets a calm page
 * while the real error goes to the server logs (which the platform
 * surfaces to the agent through `inspect_logs`).
 */
export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Something went wrong</title>
    <style>
      :root { color-scheme: light dark; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #fafafa;
        color: #171717;
        font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI",
          Roboto, sans-serif;
        -webkit-font-smoothing: antialiased;
      }
      @media (prefers-color-scheme: dark) {
        body { background: #0a0a0a; color: #ededed; }
        .detail { color: #a3a3a3; }
      }
      main { padding: 2rem; max-width: 32rem; text-align: center; }
      h1 { margin: 0 0 0.5rem; font-size: 1.25rem; font-weight: 600; }
      .detail { margin: 0; font-size: 0.9375rem; line-height: 1.6; color: #525252; }
    </style>
  </head>
  <body>
    <main>
      <h1>Something went wrong</h1>
      <p class="detail">
        This page could not be rendered. Please try again in a moment.
      </p>
    </main>
  </body>
</html>
`;
}
