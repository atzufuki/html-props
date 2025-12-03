# Introduction

@html-props/core is a lightweight, zero-dependency library for building reactive Custom Elements. It provides a simple,
declarative API for defining properties, handling attributes, and rendering content.

## Why html-props?

Most web component libraries are either too heavy, require a build step, or introduce complex abstractions. html-props
aims to be the sweet spot: simple enough to understand in minutes, but powerful enough for real applications.

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

You can install @html-props/core via JSR or import it directly from a CDN.

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

# CLI Tool

Scaffold new projects quickly with the html-props CLI.

## Creating a New Project

```bash
deno run jsr:@html-props/create my-app
```

This will create a new directory called "my-app" with a basic project structure.
