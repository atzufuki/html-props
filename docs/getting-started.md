# Introduction

`@html-props/core` is a lightweight, zero-dependency library that brings a type-safe props API and declarative rendering
to native Custom Elements. It bridges the gap between plain HTML attributes and the rich data requirements of modern
applications.

## Why HTML Props?

Standard HTML is limited to string-based attributes and imperative DOM manipulation. `html-props` solves this by
providing:

- **Type-Safe Props**: Pass objects, arrays, and functions directly to your components via the constructor.
- **Declarative Layouts**: Build your UI with a clean, nested API instead of `document.createElement` spaghetti.
- **Zero Dependencies**: No framework lock-in. It's just a mixin for your native `HTMLElement` classes.

It aims to be the missing piece for Web Components: simple enough to understand in minutes, but powerful enough for real
applications.

```typescript
import { HTMLPropsMixin } from '@html-props/core';

class MyElement extends HTMLPropsMixin(HTMLElement, {
  name: { default: 'World' }, // Type inferred as String
}) {
  render() {
    return new Div({ textContent: `Hello, ${this.name}!` });
  }
}
```

# Installation

You can install `@html-props/core` via JSR or import it directly from a CDN.

## Using Deno

```bash
deno add @html-props/core
```

## Using npm

```bash
npx jsr add @html-props/core
```

## CDN (ES Modules)

```typescript
import { HTMLPropsMixin } from 'https://esm.sh/jsr/@html-props/core';
```

# Quick Start

To scaffold a new project quickly, use the CLI tool.

See the [Create App](create.md) documentation for details.
