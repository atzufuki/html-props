# Introduction

`@html-props/core` is a lightweight, zero-dependency library that brings a type-safe props API and declarative rendering
to native Custom Elements. It bridges the gap between plain HTML attributes and the rich data requirements of modern
applications.

## Why HTML Props?

Standard HTML is limited to string-based attributes and imperative DOM manipulation. `html-props` solves this by
providing:

- **Type-Safe Props**: Create components which can take in objects, arrays, functions and even elements as props.
- **Declarative Layouts**: Build your UI with a clean, nested, and fully typed API. No more imperative spaghetti.
- **Native Standards**: Relies on Custom Element standards. No opinionated patterns or paradigms.
- **Zero Dependencies**: No framework lock-in. Just a simple mixin for your native HTMLElement classes.

It's the missing piece of Custom Elements. HTML Props brings declarativeness with rich data types and type safety to
native components.

## Works With Any Web Component

The `HTMLPropsMixin` adds a props API to any standard-compliant web component. Whether you are wrapping built-in HTML
elements, writing your own custom elements from scratch, or using components from other libraries like Lit or Stencil,
you can use `HTMLPropsMixin` to get a declarative props API.

See the [Guide](guide.md#wrapping-components) for examples of wrapping native and third-party components.

# Installation

You can install `@html-props/core` via JSR or import it directly from a CDN.

## Using Deno

```bash
deno add @html-props/core@^1.0.0-beta
```

## Using npm

```bash
npx jsr add @html-props/core@^1.0.0-beta
```

## CDN (ES Modules)

```typescript
import { HTMLPropsMixin } from 'https://esm.sh/jsr/@html-props/core';
```

# Quick Start

To scaffold a new project quickly, use the CLI tool.

See the [Create App](create.md) documentation for details.
