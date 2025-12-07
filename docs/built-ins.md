# Built-in Elements

The `@html-props/built-ins` package provides type-safe wrappers for standard HTML elements. These wrappers extend the
native HTML elements with the `HTMLPropsMixin`, allowing you to use the declarative props API.

## Installation

```bash
deno add @html-props/built-ins
```

## Usage

Import the elements you need and instantiate them with a props object.

```typescript
import { Button, Div, Input } from '@html-props/built-ins';

const card = new Div({
  className: 'card',
  style: { padding: '1rem', border: '1px solid #ccc' },
  content: [
    new Div({ textContent: 'Card Title', style: { fontWeight: 'bold' } }),
    new Button({
      textContent: 'Click Me',
      onclick: () => alert('Clicked!'),
    }),
  ],
});
```

## Common Properties

All built-in elements accept the standard properties of their native counterparts (e.g., `id`, `className`, `onclick`,
`href` for anchors, etc.).

In addition, they support the following special properties provided by `HTMLPropsMixin`:

| Property  | Type                                     | Description                                 |
| --------- | ---------------------------------------- | ------------------------------------------- |
| `style`   | `Partial<CSSStyleDeclaration> \| string` | Inline styles as an object or string.       |
| `content` | `Node \| Node[] \| string`               | Child nodes to append.                      |
| `ref`     | `(el: Element) => void`                  | Callback to get a reference to the element. |

## Available Elements

The following elements are available:

### Layout & Sectioning

- `Div` (`<div>`)
- `Span` (`<span>`)
- `Section` (`<section>`)
- `Header` (`<header>`)
- `Footer` (`<footer>`)
- `Nav` (`<nav>`)
- `Article` (`<article>`)
- `Aside` (`<aside>`)
- `Main` (`<main>`)

### Text & Typography

- `P` (`<p>`)
- `H1` - `H6` (`<h1>` - `<h6>`)
- `Pre` (`<pre>`)
- `Code` (`<code>`)

### Forms & Interactive

- `Button` (`<button>`)
- `Input` (`<input>`)
- `Label` (`<label>`)
- `Form` (`<form>`)
- `A` (`<a>`)

### Lists

- `Ul` (`<ul>`)
- `Ol` (`<ol>`)
- `Li` (`<li>`)

### Tables

- `Table` (`<table>`)
- `Thead` (`<thead>`)
- `Tbody` (`<tbody>`)
- `Tr` (`<tr>`)
- `Th` (`<th>`)
- `Td` (`<td>`)

### Media

- `Img` (`<img>`)

## Extending Built-ins

You can extend built-in elements to create specialized versions with custom properties by wrapping them with
`HTMLPropsMixin`.

```typescript
import { Button } from '@html-props/built-ins';
import { HTMLPropsMixin, prop } from '@html-props/core';

class CounterButton extends HTMLPropsMixin(Button, {
  count: prop(0),
  label: prop('Count'),
}) {
  render() {
    return document.createTextNode(`${this.label}: ${this.count}`);
  }
}

CounterButton.define('counter-button', { extends: 'button' });
```
