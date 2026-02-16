# Introduction

`@html-props/core` is a lightweight, zero-dependency library that brings a type-safe props API and declarative rendering
to native Custom Elements. It bridges the gap between plain HTML attributes and the rich data requirements of modern
applications.

## Why HTML Props?

Standard HTML is limited to string-based attributes and imperative DOM manipulation. `html-props` solves this by
providing:

- **Type-Safe Props**: Create components which can take in objects, arrays, functions and even elements as props.
- **Declarative Layouts**: Build your UI with a clean, nested, and fully typed API. No more imperative spaghetti.
- **Efficient Reconciliation**: Smart DOM diffing preserves focus, scroll position, and animations during updates.
- **Native Standards**: Relies on Custom Element standards. No opinionated patterns or paradigms.
- **Zero Dependencies**: No framework lock-in. Just a simple mixin for your native HTMLElement classes.

It's the missing piece of Custom Elements. HTML Props brings declarativeness with rich data types and type safety to
native components.

## Works With Any Web Component

The `HTMLPropsMixin` adds a props API to any standard-compliant web component. Whether you are wrapping built-in HTML
elements, writing your own custom elements from scratch, or using components made with other libraries, you can use
`HTMLPropsMixin` to get a declarative props API.

See the [Guide](guide.md) for examples of wrapping native and third-party components.

## Wrapping Components

The `HTMLPropsMixin` is designed to work with any standard-compliant web component. As long as the base class adheres to
the Custom Elements specification, you can wrap it to gain the benefits of the props API. This includes native HTML
elements and components authored in other frameworks.

Here's an example of wrapping a built-in element to enable declarativity:

```typescript
import { HTMLPropsMixin } from '@html-props/core';

// Wrap the native HTMLButtonElement
const Button = HTMLPropsMixin(HTMLButtonElement).define('button-with-props', {
  extends: 'button',
});

// Now use it declaratively
new Button({
  textContent: 'Click me',
  onclick: () => console.log('clicked'),
  style: { backgroundColor: 'purple', color: 'white' },
});
```

The same pattern applies to components from other libraries or your own custom elements.

## Defining Custom Props APIs

When you extend `HTMLPropsMixin(HTMLElement)`, you can define a declarative API for your component using the `prop()`
helper. This eliminates the boilerplate typically required for Custom Elements by automatically handling:

- **Property Access**: Typed getters and setters.
- **Attribute Reflection**: Syncing properties to attributes (and vice-versa) with type coercion.
- **Event Emission**: Dispatching change events when properties update.

### Basic Usage

Pass a configuration object as the second argument to the mixin. The keys become the property names on your element.

```typescript
import { HTMLPropsMixin, prop } from '@html-props/core';
import { Button, Div } from '@html-props/built-ins';

class Counter extends HTMLPropsMixin(HTMLElement, {
  // Type inferred from default value (Number)
  count: prop(0),
}) {
  render() {
    return new Div({
      content: [
        new Div({ textContent: `Count: ${this.count}` }),
        new Button({
          textContent: 'Increment',
          onclick: () => this.count++,
        }),
      ],
    });
  }
}

Counter.define('my-counter');
```

### Advanced Configuration

The `prop()` helper accepts a second argument for fine-grained control over attributes and events.

```typescript
import { HTMLPropsMixin, prop } from '@html-props/core';

class MyElement extends HTMLPropsMixin(HTMLElement, {
  // 1. Simple props (Type inferred from default)
  count: prop(0),
  isActive: prop(false),
  label: prop('Start'),

  // 2. Explicit Types (Unions, Nullables)
  mode: prop<'light' | 'dark'>('light'),
  user: prop<User | null>(null, { type: Object }),

  // 3. Full Configuration
  myProp: prop('val', {
    attribute: true, // Reflect to attribute (kebab-case)
    // or attribute: 'my-attr' for custom name
    event: 'my-prop-change', // Dispatch event on change
  }),
}) {}
```

See the [Guide](docs/guide.md) for lifecycle hooks, custom rendering strategies, and refs.

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
- [**Reconciliation**](docs/reconciliation.md): How DOM updates work and using keys for lists.
- [**Signals**](docs/signals.md): Fine-grained reactivity system.
- [**Layout System**](docs/layout.md): Flutter-inspired layout components.
- [**Built-in Elements**](docs/built-ins.md): Type-safe HTML element wrappers.
- [**JSX Support**](docs/jsx.md): Using JSX with html-props.
- [**Create App**](docs/create.md): CLI tool documentation.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
