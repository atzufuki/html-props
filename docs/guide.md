# Core Concepts

## Basic Usage

Create a new component by extending `HTMLPropsMixin(HTMLElement)`. This is the core mixin that adds type-safe props and
declarative rendering to your Custom Elements.

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

## Properties

Define reactive properties by passing a configuration object as the second argument to the mixin. Use the `prop` helper
for type safety and cleaner syntax.

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
    event: 'change', // Dispatch event on change
  }),
}) {}
```

### Native Properties

You can provide default values for native DOM properties directly. These are applied to the instance on construction and
are **not** reactive (no signals created).

```typescript
class MyElement extends HTMLPropsMixin(HTMLElement, {
  tabIndex: 0,
  role: 'button',
  style: { color: 'red' }, // Merged with existing styles
}) {}
```

## Lifecycle Hooks

Hook into the lifecycle of your components.

### onMount()

Called when the component is connected to the DOM. This is a good place to fetch data or set up subscriptions.

### onUnmount()

Called when the component is disconnected from the DOM. Use this to clean up timers or subscriptions.

```typescript
class Timer extends HTMLPropsMixin(HTMLElement) {
  count = signal(0);
  intervalId = null;

  onMount() {
    console.log('Timer mounted');
    this.intervalId = setInterval(() => {
      this.count.update((c) => c + 1);
    }, 1000);
  }

  onUnmount() {
    console.log('Timer unmounted');
    clearInterval(this.intervalId);
  }

  render() {
    return new Div({ textContent: `Seconds: ${this.count()}` });
  }
}
```

## Custom Rendering

By default, components re-render their entire content when properties change. You can optimize this by implementing a
custom update strategy.

### The update() Method

Define an `update()` method to take control of subsequent renders. The initial render is always handled automatically.

```typescript
class MyElement extends HTMLPropsMixin(HTMLElement, {
  count: prop(0),
}) {
  render() {
    // Called for initial render
    // Also called manually in update() if needed
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

## Refs

Refs provide a way to access the underlying DOM elements created by your components. While `html-props` is declarative,
there are times when you need to imperatively modify a child, such as managing focus, triggering media playback, or
integrating with third-party DOM libraries.

### Creating Refs

The standard way to create a ref is using the `createRef` helper.

```typescript
import { createRef, HTMLPropsMixin, prop } from '@html-props/core';
import { Input } from '@html-props/built-ins';

class MyForm extends HTMLPropsMixin(HTMLElement) {
  // Initialize the ref
  inputRef = createRef<HTMLInputElement>();

  onMount() {
    // Access the DOM node after mount
    this.inputRef.current?.focus();
  }

  render() {
    // Pass the ref object to the element
    return new Input({ ref: this.inputRef });
  }
}
```

### Accessing Refs

The ref object has a single property, `current`.

- **Before Mount**: `current` is `null`.
- **After Mount**: `current` holds the DOM element.
- **After Unmount**: `current` is reset to `null`.

Because refs are tied to the lifecycle of the element, you should access them in `onMount` or event handlers, not during
`render`.

### Callback Refs

Instead of a ref object, you can pass a function to the `ref` attribute. This gives you more control over when refs are
set and unset.

The callback receives the DOM element when the component mounts, and `null` when it unmounts.

```typescript
render() {
  return new Input({
    ref: (el) => {
      if (el) {
        console.log('Element mounted:', el);
        el.focus();
      } else {
        console.log('Element unmounted');
      }
    }
  });
}
```
