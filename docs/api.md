# API Reference

## HTMLPropsMixin(Base)

The core mixin that adds reactivity to your Custom Elements.

## Props Configuration

Define reactive properties by passing a configuration object as the second argument to the mixin.

### Custom Properties

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

  // Simplified (Type Inferred)
  count: { default: 0 },

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

## Built-in Elements

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
