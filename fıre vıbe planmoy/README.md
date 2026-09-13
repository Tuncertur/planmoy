# Welcome to your FireVibe project

This app was built with [FireVibe](https://firevibe.ai).

## Build with FireVibe

Open your project in the FireVibe editor and keep building by describing
what you want. FireVibe writes the code, runs it, and verifies it before
telling you it works.

**Full ownership**: this code is yours. Everything here is a normal
TypeScript project that runs anywhere, with no FireVibe runtime required.

## Development

Prefer working locally? You need [Bun](https://bun.sh).

```sh
bun install
bun run dev
```

The dev server runs on port 8080. Other useful scripts:

```sh
bun run build      # production build
bun run lint       # eslint
bun run format     # prettier + eslint --fix
```

## Built with

- [TanStack Start](https://tanstack.com/start) (SSR, file based routing)
- React 19 and TypeScript
- [Tailwind CSS](https://tailwindcss.com) v4
- [shadcn/ui](https://ui.shadcn.com) components
- Deployed to Cloudflare Workers

## Project structure

```
src/
  routes/          file based routes; the file path IS the URL
    __root.tsx     the document shell and site wide <head>
    index.tsx      the home page  (/)
  components/ui/   shadcn components (yours to edit)
  lib/             shared helpers
  server.ts        the Worker entry and SSR error boundary
  styles.css       design tokens and global styles
```

`src/routeTree.gen.ts` is generated from your route files. Never edit it
by hand; it is rewritten on every build.

## Design tokens

Colors, fonts, and radii are CSS variables in `src/styles.css`, in the
shadcn token vocabulary (`--background`, `--primary`, `--muted`, and so
on) using `oklch()` values. Change a token there and every component
follows, in both light and dark mode.

## Deploying

Publishing from the FireVibe editor handles the build and deploy for you.

To deploy this project yourself instead, it is a standard Cloudflare
Workers app configured in `wrangler.jsonc`:

```sh
bunx wrangler login
bun run deploy
```

Secrets go through `bunx wrangler secret put NAME`. Non secret values can
live in `wrangler.jsonc` under `vars`.

## Learn more

- [TanStack Start docs](https://tanstack.com/start)
- [TanStack Router docs](https://tanstack.com/router)
- [Cloudflare Workers docs](https://developers.cloudflare.com/workers/)
