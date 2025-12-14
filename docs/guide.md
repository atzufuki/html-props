# Core Concepts

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

The same pattern applies to components from other libraries, such as Material Web:

```typescript
import { HTMLPropsMixin } from '@html-props/core';
import { MdFilledButton } from '@material/web/button/filled-button.js';

// Wrap Material Web's button with HTMLPropsMixin
const FilledButton = HTMLPropsMixin(MdFilledButton).define('md-filled-button-with-props');

// Use it declaratively
new FilledButton({
  textContent: 'Submit',
  disabled: false,
  onclick: () => console.log('clicked'),
});
```

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

Since HTML Props components are standard Web Components, you can use the standard lifecycle callbacks.

### connectedCallback()

Called when the component is connected to the DOM. This is a good place to fetch data or set up subscriptions. Always
call `super.connectedCallback()`.

### disconnectedCallback()

Called when the component is disconnected from the DOM. Use this to clean up timers or subscriptions. Always call
`super.disconnectedCallback()`.

```typescript
import { HTMLPropsMixin } from '@html-props/core';
import { signal } from '@html-props/signals';
import { Div } from '@html-props/built-ins';

class Timer extends HTMLPropsMixin(HTMLElement) {
  // Internal state with signal
  count = signal(0);
  intervalId: number | undefined;

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

## Custom Rendering

By default, components re-render their entire content when properties change. You can optimize this by implementing a
custom update strategy.

### The update() Method

Define an `update()` method to take control of subsequent renders. The initial render is always handled automatically.

```typescript
import { HTMLPropsMixin, prop } from '@html-props/core';

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
    const newContent = this.render() as Text;

    // Perform fine-grained DOM updates
    this.firstChild!.textContent = newContent.textContent;
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

The standard way to create a ref is using the `ref` helper.

```typescript
import { HTMLPropsMixin, prop, ref } from '@html-props/core';
import { Input } from '@html-props/built-ins';

class MyForm extends HTMLPropsMixin(HTMLElement) {
  // Initialize the ref
  inputRef = ref<HTMLInputElement>();

  connectedCallback() {
    super.connectedCallback();
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

Because refs are tied to the lifecycle of the element, you should access them in `connectedCallback` or event handlers,
not during `render`.

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
