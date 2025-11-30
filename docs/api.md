# API Reference

## HTMLPropsMixin(Base)

The core mixin that adds reactivity to your Custom Elements.

## Props Configuration

Define reactive properties by passing a configuration object as the second argument to the mixin. Each key becomes a
property on the instance and an observed attribute.

```typescript
class MyElement extends HTMLPropsMixin(HTMLElement, {
  myProp: {
    type: String, // Number, Boolean, Array, Object
    default: 'value',
    reflect: true, // Reflect to attribute
    attr: 'my-prop', // Custom attribute name
  },
}) {}
```

## Built-in Elements

A collection of type-safe wrappers for standard HTML elements. They accept all standard HTML attributes plus `style`,
`class`, and `content`.

```typescript
import { Button, Div, Input } from '@html-props/built-ins';

// Usage
new Div({
  style: { padding: '1rem' },
  class: 'container',
  content: [
    new Button({
      textContent: 'Click me',
      onclick: () => console.log('Clicked'),
    }),
  ],
});
```
