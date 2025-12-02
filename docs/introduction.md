# Introduction

@html-props/core is a lightweight, zero-dependency library for building reactive Custom Elements. It provides a simple,
declarative API for defining properties, handling attributes, and rendering content.

## Why html-props?

Most web component libraries are either too heavy, require a build step, or introduce complex abstractions. html-props
aims to be the sweet spot: simple enough to understand in minutes, but powerful enough for real applications.

```typescript
import { HTMLPropsMixin } from '@html-props/core';

class MyElement extends HTMLPropsMixin(HTMLElement, {
  name: { default: 'World' }, // Type inferred as String
}) {
  render() {
    return new Div({ textContent: `Hello, ${this.name}!` });
  }
}
```
