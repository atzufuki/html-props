# HTML Props - AI Coding Agent Instructions

## Project Overview

**HTML Props** is a modular web components framework built on Deno/TypeScript. It provides a declarative props API with reactive signals for building custom elements. The project is organized as a monorepo with independent packages published to JSR.

## Architecture

### Module Structure

The workspace contains **8 independent packages** in `src/`:

- **`core`** - Foundation: reactive props mixin (`HTMLPropsMixin`), signal-based state, lifecycle hooks. Everything depends on this.
- **`signals`** - Reactive primitives: `signal()` and `effect()` for fine-grained reactivity. Used by core and apps.
- **`jsx`** - JSX runtime for template syntax. Optional, for projects using JSX.
- **`built-ins`** - Type-safe wrappers for standard HTML elements (Div, Button, etc.).
- **`layout`** - Flutter-inspired layout components (Row, Column, Stack, etc.).
- **`builder`** - Visual HTML page building tool for VS Code.
- **`create`** - CLI scaffolding tool for new projects.
- **`landing`** - Demo/documentation website (dev server, HMR client included).

Each package has its own `deno.json` and tests.

### Design Patterns

**Mixin-Based Architecture**: Components extend `HTMLPropsMixin(BaseClass)` to get props + rendering.
- Supports inheritance: `class Box extends HTMLPropsMixin(Widget)` - mixins auto-compose.
- Props defined via config object: `HTMLPropsMixin(HTMLElement, { count: prop(0) })`.

**Signal-Based Reactivity**: Props backed by signals from `@html-props/signals`.
- Signals are callable: `this.count()` gets value, `.count(5)` sets value.
- Effects subscribe to signals; components auto-rerender when props change.

**Constructor Props Pattern**: Create elements with props directly:
```typescript
new MyElement({ text: 'Hello', count: 5, onclick: () => {} })
```
Constructor accepts props object; applies style, class, content, refs, event listeners.

**DOM Reconciliation**: Components use a custom reconciliation algorithm for efficient updates.
- Compares previous and new render output, applies only necessary changes.
- Preserves focus, scroll position, and animation state.
- Uses `dataset.key` for stable element identity in lists.
- `forceUpdate()` bypasses reconciliation for full re-render when needed.

## Critical Developer Workflows

### Testing
```bash
deno test --allow-env
```
Tests use Deno's native test runner. Core tests mock DOM elements (see `src/core/tests/setup.ts`). Each package has isolated tests.

### Development/Landing Page
```bash
deno run --watch --allow-read=src --allow-write=src/landing --allow-run=deno --allow-net --allow-env --unstable-bundle src/landing/dev_server.ts
```
- Runs HMR dev server (see `src/landing/dev_server.ts` and `hmr-client.ts`).
- Watches `src/landing/` for changes, reloads components.
- Bundles output to `src/landing/main.bundle.js`.

### Bundling
```bash
deno bundle --unstable-sloppy-imports src/landing/main.ts src/landing/main.bundle.js
```
Deno's bundler with sloppy imports for JSX compatibility.

### Package Publishing
- Root `publish.json` lists packages for JSR: core, create, jsx, signals.
- `built-ins` and `landing` are not published.
- Each package is versioned independently.

## Code Patterns & Conventions

### Defining Custom Elements
```typescript
import { HTMLPropsMixin, prop } from '@html-props/core';

class MyElement extends HTMLPropsMixin(HTMLElement, {
  text: prop('default')
}) {
  // Props auto-initialized from config
  render() {
    return this.text;
  }
}

MyElement.define('my-element');
```

- `render()` returns `Node | Node[] | null`. Called whenever props change.
- Optional: `mountedCallback()` and `unmountedCallback()` lifecycle hooks.
- Props are inferred from the config object passed to the mixin.

### Props Configuration
```typescript
class MyElement extends HTMLPropsMixin(HTMLElement, {
  count: prop(0, { attribute: true }),
  label: prop('', { attribute: 'data-label', event: 'labelChange' }),
  active: prop(false),
  items: prop<string[]>([], { type: Array }),
}) {}
```

- `type`: String, Number, Boolean, Array, or Object constructors.
- `default`: Initial value (required for type inference).
- `attribute`: Boolean (reflect as kebab-case) or String (custom attribute name).
- `event`: Emit custom event on prop change.

### Using Signals
```typescript
import { signal, effect } from '@html-props/signals';

const count = signal(0);
effect(() => {
  console.log('Count changed to:', count()); // Tracked dependency
});

count(5); // Triggers effect
count.update(v => v + 1); // Increment with prev value
```

Signals are fine-grained; effects only re-run if their dependencies changed.

### JSX Usage (Optional)
Configure `deno.json` compiler options:
```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@html-props/jsx"
  }
}
```

Then write JSX in components:
```typescript
render() {
  return <div>{this.count()}</div>;
}
```

### List Rendering with Keys

**Always use `dataset.key` for list items** to help the reconciler match DOM nodes correctly:

```typescript
render() {
  return new Ul({
    content: this.items.map(item =>
      new Li({
        dataset: { key: `item-${item.id}` },  // Required for lists!
        textContent: item.name,
      })
    ),
  });
}
```

**Key requirements:**
- Keys must be **unique** within the list
- Keys must be **stable** - use item IDs, not array indices
- Keys should be **strings** - prefix with context (e.g., `item-`, `user-`)

Without `dataset.key`, the reconciler may reuse DOM elements incorrectly when items are added, removed, or reordered.

### Update Methods

| Method | Behavior |
|--------|----------|
| `requestUpdate()` | Schedules an update (calls `update()` or `defaultUpdate()`) |
| `defaultUpdate()` | Uses reconciliation algorithm (DOM diffing) |
| `forceUpdate()` | Bypasses reconciliation, replaces all children |

Use `forceUpdate()` when you need a clean slate (e.g., resetting third-party widgets).

## Key Files & Locations

- **Core mixin implementation**: `src/core/mixin.ts` - Props initialization, lifecycle, rendering logic.
- **Reconciliation algorithm**: `src/core/controller.ts` - DOM diffing, key matching, morphing.
- **Signal implementation**: `src/signals/mod.ts` - Reactive primitives (subscribe/notify pattern).
- **Type definitions**: `src/core/types.ts` - PropsConfig, PropType, HTMLPropsInterface.
- **Test templates**: `src/core/tests/mod.test.ts`, `src/signals/tests/mod.test.ts` - DOM mocking patterns.
- **Landing dev server**: `src/landing/dev_server.ts` - HMR setup and dev workflow.

## External Dependencies

- **Deno** - Runtime; all code uses Deno modules or JSR imports.
- **JSR packages** (via imports):
  - `@std/assert` - Testing utilities.
  - `@luca/esbuild-deno-loader` - ESBuild integration for bundling.
  - `esbuild` (npm) - Module bundler (for landing page).
  - `jsdom` (npm) - DOM emulation in tests.

## Import Patterns

- **Relative imports** within packages: `import { signal } from '../signals/mod.ts'`.
- **JSR imports**: `import { assertEquals } from 'jsr:@std/assert'`.
- **npm imports** (rare): `import esbuild from 'npm:esbuild'`.
- **Wildcard imports discouraged** - import specific exports for clarity.

## Common Pitfalls

1. **Missing keys in lists**: Always use `dataset.key` for list items, or reconciler may reuse elements incorrectly.
2. **Prop reflection**: kebab-case in HTML, camelCase in JS. Use `attr` config if custom mapping needed.
3. **Signal scope**: Effects run synchronously on signal change; batch updates in effects with `.update()` to avoid cascades.
4. **Mixin inheritance**: If extending a component that already uses mixins, mixins auto-compose (don't re-apply).
5. **Render return**: Must return Node/Node[]/null, not strings. Use `document.createTextNode()` for text.
6. **Tests**: Tests run in Playwright (real Chromium), not mocked DOM.

## Publishing & Versions

Packages follow semantic versioning. Check `src/*/README.md` for current stable APIs. Internal changes to signals don't require core major bumps if props interface stays stable.
