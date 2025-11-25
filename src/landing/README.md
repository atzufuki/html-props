# Demo SPA (`src/demo`)

This folder contains a tiny TypeScript SPA that showcases `@html-props/core`
using native Custom Elements.

## Files

- `index.html` – HTML entry served by the dev server.
- `main.ts` – SPA entry that defines `<demo-app>` using `HTMLPropsMixin`.
- `main.bundle.js` – generated bundle from `deno bundle` (git-ignored
  recommended).
- `hmr-client.ts` – tiny hot-reload client using Server-Sent Events.
- `dev_server.ts` – Deno dev server with bundling + HMR.

## Run the demo (with hot reload)

From the repository root:

```bash
deno run --watch --allow-read=src --allow-write=src/demo --allow-run=deno --allow-net src/demo/dev_server.ts
```

Then open:

- http://localhost:5173/

### What hot reload does

- On startup, `dev_server.ts` runs:
  - `deno bundle src/demo/main.ts src/demo/main.bundle.js`
- The browser loads `main.bundle.js` from `index.html`.
- `dev_server.ts` watches `src/demo/**` for changes.
- On any change it re-runs the bundle and sends a `reload` event over `/hmr`.
- `hmr-client.ts` listens to `/hmr` and triggers a full
  `window.location.reload()` when it receives `reload`.

This is intentionally simple: full-page reload with automatic re-bundle.
