# HTML Props - AI Coding Agent Instructions

## Project Overview

**HTML Props** is a modular web components framework built on Deno/TypeScript. It provides a declarative props API with reactive signals for building custom elements. The project is organized as a monorepo with independent packages published to JSR.

## Architecture

### Module Structure

The workspace contains **6 independent packages** in `src/`:

- **`core`** - Foundation: reactive props mixin (`HTMLPropsMixin`), signal-based state, lifecycle hooks. Everything depends on this.
- **`signals`** - Reactive primitives: `signal()` and `effect()` for fine-grained reactivity. Used by core and apps.
- **`jsx`** - JSX runtime for template syntax. Optional, for projects using JSX.
- **`built-ins`** - Type-safe wrappers for standard HTML elements (Div, Button, etc.).
- **`create`** - CLI scaffolding tool for new projects.
- **`landing`** - Demo/documentation website (dev server, HMR client included).

Each package has its own `deno.json` and tests.

### Design Patterns

**Mixin-Based Architecture**: Components extend `HTMLPropsMixin(BaseClass)` to get props + rendering.
- Supports inheritance: `class Box extends HTMLProps(Widget)` - mixins auto-compose.
- Props defined via config object: `HTMLPropsMixin(HTMLElement, { count: { type: Number, default: 0 } })`.

**Signal-Based Reactivity**: Props backed by signals from `@html-props/signals`.
- Signals are callable: `this.count()` gets value, `.count(5)` sets value.
- Effects subscribe to signals; components auto-rerender when props change.

**Constructor Props Pattern**: Create elements with props directly:
```typescript
new MyElement({ text: 'Hello', count: 5, onclick: () => {} })
```
Constructor accepts props object; applies style, class, content, refs, event listeners.

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
import { HTMLPropsMixin } from '@html-props/core';

class MyElement extends HTMLPropsMixin(HTMLElement, {
  text: { type: String, default: 'default' }
}) {
  // Props auto-initialized from config
  render() {
    return this.text;
  }
}

MyElement.define('my-element');
```

- `render()` returns `Node | Node[] | null`. Called whenever props change.
- Optional: `onMount()` and `onUnmount()` lifecycle hooks.
- Props are inferred from the config object passed to the mixin.

### Props Configuration
```typescript
class MyElement extends HTMLPropsMixin(HTMLElement, {
  count: { type: Number, default: 0, reflect: true },
  label: { type: String, attr: 'data-label', event: 'labelChange', default: '' },
  active: { type: Boolean, default: false },
  items: { type: Array, default: [] },
}) {}
```

- `type`: String, Number, Boolean, Array, or Object constructors.
- `default`: Initial value (required for type inference).
- `reflect`: Sync prop to HTML attribute (kebab-case).
- `attr`: Custom attribute name instead of prop name.
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

## Key Files & Locations

- **Core mixin implementation**: `src/core/mixin.ts` - Props initialization, lifecycle, rendering logic.
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

1. **Prop reflection**: kebab-case in HTML, camelCase in JS. Use `attr` config if custom mapping needed.
2. **Signal scope**: Effects run synchronously on signal change; batch updates in effects with `.update()` to avoid cascades.
3. **Mixin inheritance**: If extending a component that already uses mixins, mixins auto-compose (don't re-apply).
4. **Render return**: Must return Node/Node[]/null, not strings. Use `document.createTextNode()` for text.
5. **Tests**: Mock DOM elements (see `src/core/tests/setup.ts`); tests don't run in real browser.

## Publishing & Versions

Packages follow semantic versioning. Check `src/*/README.md` for current stable APIs. Internal changes to signals don't require core major bumps if props interface stays stable.
