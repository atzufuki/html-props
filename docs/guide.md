# Core Concepts

## Basic Usage

Create a new component by extending `HTMLPropsMixin(HTMLElement)`. This is the core mixin that adds reactivity to your
Custom Elements.

```typescript
import { HTMLPropsMixin } from '@html-props/core';
import { Button, Div } from '@html-props/built-ins';

class Counter extends HTMLPropsMixin(HTMLElement, {
  // Type inferred from default value (Number)
  count: { default: 0 },
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

Define reactive properties by passing a configuration object as the second argument to the mixin.

### 1. Simplified (Type Inference)

The type is inferred from the `default` value.

```typescript
class MyElement extends HTMLPropsMixin(HTMLElement, {
  count: { default: 0 }, // Inferred as Number
  isActive: { default: false }, // Inferred as Boolean
  label: { default: 'Start' }, // Inferred as String
}) {}
```

### 2. Explicit Type

Useful when the default value is `null` or doesn't match the full type (e.g. nullable props).

```typescript
class MyElement extends HTMLPropsMixin(HTMLElement, {
  user: { type: Object, default: null },
}) {}
```

### 3. Full Configuration

Custom properties create reactive signals and can be reflected to attributes.

```typescript
class MyElement extends HTMLPropsMixin(HTMLElement, {
  // Full configuration
  myProp: {
    type: String, // Optional if default is provided
    default: 'val', // Initial value
    reflect: true, // Reflect to attribute (kebab-case)
    attr: 'my-attr', // Custom attribute name
    event: 'change', // Dispatch event on change
  },

  // Enum / Union
  mode: { default: 'light' as 'light' | 'dark' },
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
  count: { default: 0 },
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
