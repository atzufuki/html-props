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

The `@html-props/create` package is a CLI tool to quickly scaffold new `html-props` projects. It sets up a complete
development environment with Deno, HMR (Hot Module Replacement), and a basic project structure.

## Usage

To create a new project, run the following command in your terminal:

```bash
deno run jsr:@html-props/create@^1.0.0-beta <project-name>
```

Replace `<project-name>` with the desired name for your project directory.

### Example

```bash
deno run jsr:@html-props/create@^1.0.0-beta my-awesome-app
cd my-awesome-app
deno task dev
```

# Documentation

For full documentation, visit [html-props.dev](https://html-props.dev) or check the guides below:

- [**Guide**](docs/guide.md): Core concepts, properties, lifecycle, and rendering.
- [**Signals**](docs/signals.md): Fine-grained reactivity system.
- [**Layout System**](docs/layout.md): Flutter-inspired layout components.
- [**Built-in Elements**](docs/built-ins.md): Type-safe HTML element wrappers.
- [**JSX Support**](docs/jsx.md): Using JSX with html-props.
- [**Create App**](docs/create.md): CLI tool documentation.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
