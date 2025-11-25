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
