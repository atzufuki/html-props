# HTML Props - Props API for Web Components

Reactive Custom Elements, Simplified.

A lightweight mixin for building native custom elements with reactive props API.

## Features

- **Zero Dependencies**: Extremely lightweight. No framework lock-in. Just a simple mixin for your native HTMLElement
  classes.
- **Reactive Signals**: Built-in signal-based reactivity. Props automatically map to signals and trigger efficient
  updates.
- **TypeScript First**: Designed with strong type inference in mind. Define props via static config and get full type
  safety.
- **Native DOM**: Works seamlessly with standard DOM APIs. Use it with vanilla JS.

## Installation

You can install `@html-props/core` via JSR.

### Using Deno

```bash
deno add @html-props/core
```

### Using npm

```bash
npx jsr add @html-props/core
```

## CLI Tool

Scaffold new projects quickly with the html-props CLI.

### Creating a New Project

```bash
deno run jsr:@html-props/create my-app
```

This will create a new directory called "my-app" with a basic project structure.

## Basic Usage

Create a new component by extending `HTMLPropsMixin(HTMLElement)`.

```typescript
import { HTMLPropsMixin, prop } from '@html-props/core';
import { Button, Div } from '@html-props/built-ins';

class Counter extends HTMLPropsMixin(HTMLElement, {
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

## Signals

Fine-grained reactivity for your components. Signals are the backbone of reactivity in html-props. They allow you to
create state that automatically updates your UI when changed.

```typescript
import { effect, signal } from '@html-props/signals';

const count = signal(0);

// Effects run whenever dependencies change
effect(() => {
  console.log(`The count is ${count()}`);
});

count(1); // Logs: "The count is 1"
count(2); // Logs: "The count is 2"
```

### Using Signals in Components

Component props are internally backed by signals. You can also use standalone signals for local state.

```typescript
class Counter extends HTMLPropsMixin(HTMLElement) {
  // Local state
  count = signal(0);

  render() {
    return new Button({
      textContent: `Count: ${this.count()}`,
      onclick: () => this.count.update((n) => n + 1),
    });
  }
}
```

### Computed Values

Computed signals derive their value from other signals and update automatically.

```typescript
import { computed } from '@html-props/signals';

const count = signal(1);
const double = computed(() => count() * 2);

console.log(double()); // 2
count(2);
console.log(double()); // 4
```

### Batch Updates

Group multiple signal updates into a single effect run.

```typescript
import { batch } from '@html-props/signals';

batch(() => {
  count(10);
  count(20);
}); // Effects run only once
```

## Lifecycle Hooks

Since HTML Props components are standard Web Components, you can use the standard lifecycle callbacks.

### connectedCallback()

Called when the component is connected to the DOM. This is a good place to fetch data or set up subscriptions. Always
call `super.connectedCallback()`.

### disconnectedCallback()

Called when the component is disconnected from the DOM. Use this to clean up timers or subscriptions. Always call
`super.disconnectedCallback()`.

```typescript
class Timer extends HTMLPropsMixin(HTMLElement) {
  count = signal(0);
  intervalId = null;

  connectedCallback() {
    super.connectedCallback();
    console.log('Timer mounted');
    this.intervalId = setInterval(() => {
      this.count.update((c) => c + 1);
    }, 1000);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    console.log('Timer unmounted');
    clearInterval(this.intervalId);
  }

  render() {
    return new Div({ textContent: `Seconds: ${this.count()}` });
  }
}
```

## JSX Support

Use JSX syntax for templating in your components.

### Installation

```bash
deno add jsr:@html-props/jsx
```

### Configuration

Configure your compiler options in `deno.json`:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@html-props/jsx"
  }
}
```

### Usage

```typescript
import { HTMLPropsMixin } from '@html-props/core';

class MyElement extends HTMLPropsMixin(HTMLElement) {
  render() {
    return (
      <div class='container'>
        <h1>Hello JSX</h1>
        <p>This is rendered using JSX!</p>
      </div>
    );
  }
}
```

## Builder

Visual HTML page building tool for VS Code.

The Builder allows you to construct web pages visually while maintaining full control over the underlying code. It
bridges the gap between design and development by directly manipulating your source files.

### Getting Started

To open the visual editor:

- Right-click on any `.html` or `.ts` file in the explorer
- Select "Open With..."
- Choose "HTML Props Builder Visual Editor"

### Resource Management

The Resources panel lets you manage your component libraries. Actions here directly affect your project configuration.

#### Adding Resource Directories

Click the "+" button in the Resources panel to select a folder containing your components. **Technical Effect**: This
updates your VS Code workspace settings (`settings.json`) to include the new path.

#### Creating Components

Use the category menu (three dots) in the Resources panel to "Create Resource". The wizard guides you through defining
the tag name, properties, and base element. **Technical Effect**: Generates a new TypeScript file with the component
class definition.

### Visual Editing & Code Generation

The visual editor is a WYSIWYG interface that writes standard HTML. It supports editing both static HTML files and the
render methods of your `.ts`/`.js` web components.

#### Drag & Drop Composition

Dragging an element from the panel into the editor inserts the corresponding tag into your document. **Technical
Effect**: Inserts the HTML tag at the cursor position or drop target. For `.ts`/`.js` components, it updates the render
method code.

#### Property Editing

Selecting an element populates the Properties panel. Changing values here updates the element attributes in real-time.
**Technical Effect**: Updates HTML attributes. For HTMLProps components, these attributes map to reactive props.

## Custom Rendering

By default, components re-render their entire content when properties change. You can optimize this by implementing a
custom update strategy.

### The update() Method

Define an `update(newContent)` method to take control of subsequent renders. The initial render is always handled
automatically.

```typescript
class MyElement extends HTMLPropsMixin(HTMLElement, {
  count: prop(0),
}) {
  render() {
    // Called for initial render
    // Also called before update() to generate new content
    return document.createTextNode(`Count: ${this.count}`);
  }

  update() {
    // Called ONLY for updates (not initial render)
    // Manually call render() if needed
    const newContent = this.render();

    // Perform fine-grained DOM updates
    this.firstChild.textContent = newContent.textContent;
  }
}
```

### Fallback to Default

You can call `this.defaultUpdate()` to fall back to the default behavior (replacing all children) if needed.

```typescript
update() {
  if (this.shouldOptimize) {
    // Custom logic
    const newContent = this.render();
    this.applyOptimization(newContent);
  } else {
    // Fallback
    this.defaultUpdate();
  }
}
```

### Manual Updates

If you need to trigger a re-render manually (e.g., when external state changes), you can call `requestUpdate()`.

```typescript
// Trigger a re-render
this.requestUpdate();
```

## API Reference

### HTMLPropsMixin(Base)

The core mixin that adds reactivity to your Custom Elements.

### Props Configuration

Define reactive properties by passing a configuration object to the mixin.

```typescript
class MyElement extends HTMLPropsMixin(HTMLElement, {
  myProp: prop('value', {
    attribute: true, // Reflect to attribute
    // or attribute: 'my-prop' for custom name
  }),
}) {}
```

### Built-in Elements

A collection of type-safe wrappers for standard HTML elements. They accept all standard HTML attributes plus `style`,
`class`, and `content`.

```typescript
import { Button, Div, Input } from '@html-props/built-ins';

// Usage
new Div({
  style: { padding: '1rem' },
  className: 'container',
  content: [
    new Button({
      textContent: 'Click me',
      onclick: () => console.log('Clicked'),
    }),
  ],
});
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
