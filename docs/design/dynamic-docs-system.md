# Design: Dynamic Documentation System

## Problem

Currently, the documentation for `html-props` is hardcoded within `src/landing/views/DocsPage.ts`. This approach has
several drawbacks:

- **Maintenance**: Editing documentation requires modifying TypeScript code.
- **Versioning**: It is difficult to serve documentation for different versions of the library simultaneously.
- **DX**: Writing documentation in TypeScript strings is less ergonomic than writing Markdown.

## Goal

Migrate the documentation system to fetch Markdown (`.md`) files dynamically from the repository (or a CDN) and render
them using `html-props` components. This will enable versioning and improve the writing experience.

## Architecture

### 1. Content Storage

Documentation will reside in the `docs/` directory at the root of the repository as standard Markdown files.

- `docs/introduction.md`
- `docs/installation.md`
- `docs/usage.md`
- ...etc

### 2. Fetching Strategy

The application will fetch raw Markdown content via HTTP.

- **Development**: Fetch from local server (if possible) or raw GitHub content from the current branch.
- **Production**: Fetch from `raw.githubusercontent.com` (or similar) using specific tags/versions.
  - URL Pattern: `https://raw.githubusercontent.com/atzufuki/html-props/{version}/docs/{page}.md`

### 3. Markdown Parsing

We need a lightweight Markdown parser that runs in the browser/Deno.

- **Candidate**: `marked`
- **Output**: AST or HTML tokens that we can traverse.

### 4. Rendering (The "Hydration" Step)

Instead of using `innerHTML`, we will map Markdown tokens/HTML tags to our reactive `html-props` components. This
ensures the documentation site remains a true Single Page Application (SPA) with our own styling and behavior.

**Mapping:**

- `# Header 1` -> `new H1(...)`
- `Paragraph` -> `new P(...)`
- ````code``` `->`new CodeBlock(...)`
- `[Link](...)` -> `new A(...)` (intercepting internal links for SPA routing)

### 5. Versioning

- The `DocsPage` will maintain a `version` state (defaulting to `latest` or the current library version).
- A dropdown in the UI will allow switching versions.
- Changing version updates the base URL for fetching markdown files.

## Implementation Plan

### Phase 1: Content Migration

- [ ] Extract content from `DocsPage.ts` into individual `.md` files in `docs/`.

### Phase 2: Markdown Service

- [ ] Create `src/landing/services/MarkdownService.ts`.
- [ ] Implement `fetchDoc(page: string, version: string)`.
- [ ] Integrate `marked` or a similar parser.

### Phase 3: Markdown Renderer Component

- [ ] Create `src/landing/components/MarkdownViewer.ts`.
- [ ] Implement logic to traverse parsed tokens and instantiate `html-props` components (`H1`, `P`, `CodeBlock`, etc.).
- [ ] Handle syntax highlighting in `CodeBlock` (already implemented, just need to pass content).

### Phase 4: DocsPage Refactor

- [ ] Update `DocsPage.ts` to use `MarkdownViewer`.
- [ ] Implement routing logic to map `#/docs/:page` to `docs/:page.md`.
- [ ] Add version selector.

## Component Interface

```typescript
// src/landing/components/MarkdownViewer.ts
import { HTMLPropsMixin } from '@html-props/core';

export class MarkdownViewer extends HTMLPropsMixin(HTMLElement, {
  src: { type: String, default: '' }, // URL to fetch
  content: { type: String, default: '' }, // Direct markdown content
}) {
  // ... parsing and rendering logic
}
```

## Routing Structure

- `#/docs` -> fetches `docs/introduction.md`
- `#/docs/signals` -> fetches `docs/signals.md`
- `#/docs/v1.0.0/signals` -> fetches `docs/signals.md` from tag `v1.0.0`
