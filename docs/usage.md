# Basic Usage

Create a new component by extending HTMLPropsMixin(HTMLElement).

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

## Defining Properties

You can define properties in several ways:

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
  // Type is Number | null
  count: { type: Number, default: null },
}) {}
```

### 3. Native Property Defaults

For native HTML properties (like `tabIndex`, `id`, `title`), you can provide a default value directly. These are applied
to the instance and do not create reactive signals.

```typescript
class MyElement extends HTMLPropsMixin(HTMLElement, {
  // Sets this.tabIndex = 0
  tabIndex: 0,

  // Sets this.title = 'Tooltip'
  title: 'Tooltip',

  // Custom props still use the config object
  myProp: { default: 10 },
}) {}
```

### 4. Enums / Unions

You can define string unions by casting the default value.

```typescript
class MyElement extends HTMLPropsMixin(HTMLElement, {
  // Type is 'primary' | 'secondary'
  variant: { default: 'primary' as 'primary' | 'secondary' },
}) {}
```
