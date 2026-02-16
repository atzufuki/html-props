# @html-props/core

A reactive props & state layer for native Custom Elements powered by signals.

## Features

- **Declarative Props**: Define props via a simple config object.
- **Type Inference**: Automatically infers prop types for class and constructor.
- **Automatic Reactivity**: Props map to signals and trigger updates.
- **Attribute Reflection**: Sync props to attributes automatically.
- **Zero Dependencies**: Lightweight and standard-compliant.

## Usage

```typescript
import { HTMLPropsMixin, prop } from "@html-props/core";

class MyElement extends HTMLPropsMixin(HTMLElement, {
  count: prop(0, { attribute: true }),
}) {
  render() {
    return document.createTextNode(`Count: ${this.count}`);
  }
}

customElements.define("my-element", MyElement);
```

## Custom Rendering

By default, the mixin re-renders the entire component content when props change.
You can override this behavior for fine-grained updates using the `update()`
method.

```typescript
class MyElement extends HTMLPropsMixin(HTMLElement, {
  count: prop(0, { type: Number }),
}) {
  render() {
    // Called for initial render
    return document.createTextNode(`Count: ${this.count}`);
  }

  update() {
    // Called for subsequent updates
    // Manually call render() if needed
    const newContent = this.render();

    // Example: Manual DOM update
    this.firstChild.textContent = newContent.textContent;

    // Or fallback to default behavior if needed
    // this.defaultUpdate();
  }
}
```

### Manual Updates

If you need to trigger a re-render manually (e.g., when external state changes),
you can call `requestUpdate()`.

```typescript
// Trigger a re-render
this.requestUpdate();
```
