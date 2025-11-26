# Landing Page SPA (`src/landing`)

This folder contains the documentation and landing page for HTML Props.

## Files

- `index.html` – HTML entry served by the dev server.
- `main.ts` – SPA entry.
- `dist/main.bundle.js` – generated bundle.
- `hmr-client.ts` – tiny hot-reload client using Server-Sent Events.
- `dev_server.ts` – Deno dev server with bundling + HMR.
- `serve.ts` – Production server for Deno Deploy.

## Run locally (with hot reload)

From the repository root:

```bash
deno task dev
```

Then open:

- http://localhost:5173/

## Deployment to Deno Deploy

This project is configured for automatic deployment via Deno Deploy's GitHub integration.

### Setup

1. Log in to [Deno Deploy](https://console.deno.com).
2. Create a **New Project**.
3. Select the **GitHub** repository for this project.
4. Configure the **Build Step**:
   - **Build Command**: `deno task build`
   - **Entrypoint**: `deno task start` (or `src/landing/serve.ts`)
5. Click **Deploy Project**.

### How it works

- **Build**: Deno Deploy runs `deno task build`, which executes `deno bundle` to generate
  `src/landing/dist/main.bundle.js`.
- **Runtime**: Deno Deploy runs `src/landing/serve.ts`.
- **Serving**: `serve.ts` serves the static files and the generated bundle. It automatically removes the HMR script from
  `index.html` for production.
