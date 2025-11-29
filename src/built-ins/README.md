# @html-props/built-ins

A collection of wrapper classes for standard HTML elements that support the declarative props API.

## Usage

```typescript
import { Button, Div, P } from '@html-props/built-ins';

const myDiv = new Div({
  style: { padding: '1rem' },
  content: [
    new P({ textContent: 'Hello World' }),
    new Button({
      onclick: () => console.log('Clicked!'),
      content: 'Click Me',
    }),
  ],
});

document.body.appendChild(myDiv);
```

## Features

- Declarative API for creating DOM elements
- Support for `ref` prop
- Support for `style` object
- Support for `content` (children)
- Support for event listeners (`onclick`, etc.)
- Type-safe (when used with `lib.dom`)
