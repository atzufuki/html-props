# @html-props/core

A reactive props & state layer for native Custom Elements powered by signals.

## Features

- Lit-style `static props` declaration
- Automatic signal-based property storage
- Automatic rerendering on changes
- Attribute reflection
- Optional event dispatching
- Zero dependencies

## Usage

```typescript
import { HTMLPropsMixin } from '@html-props/core';

class MyElement extends HTMLPropsMixin(HTMLElement) {
  static props = {
    count: { type: Number, default: 0, reflect: true },
  };

  render() {
    return document.createTextNode(`Count: ${this.count}`);
  }
}

customElements.define('my-element', MyElement);
```

## Custom Rendering

By default, the mixin re-renders the entire component content when props change. You can override this behavior for
fine-grained updates using the `update()` method.

```typescript
class MyElement extends HTMLPropsMixin(HTMLElement) {
  static props = {
    count: { type: Number, default: 0 },
  };

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

If you need to trigger a re-render manually (e.g., when external state changes), you can call `requestUpdate()`.

```typescript
// Trigger a re-render
this.requestUpdate();
```
