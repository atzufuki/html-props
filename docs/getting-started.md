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

It's the missing piece of Custom Elements. Standard HTML is limited to simple attributes and imperative coding style.
HTML Props brings declarativeness with rich data types and type safety to native components.

```typescript
import { HTMLPropsMixin, prop } from '@html-props/core';
import { Button, Div } from '@html-props/built-ins';
import { Column, Container } from '@html-props/layout';

class CounterApp extends HTMLPropsMixin(HTMLElement, {
  count: prop(0),
}) {
  render() {
    return new Container({
      padding: '2rem',
      content: new Column({
        crossAxisAlignment: 'center',
        gap: '1rem',
        content: [
          new Div({
            textContent: `Count is: ${this.count}`,
            style: { fontSize: '1.2rem' },
          }),
          new Button({
            textContent: 'Increment',
            style: {
              backgroundColor: '#a78bfa',
              color: '#13111c',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '0.25rem',
              cursor: 'pointer',
              fontWeight: '600',
            },
            onclick: () => this.count++,
          }),
        ],
      }),
    });
  }
}

CounterApp.define('counter-app');
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
