# HTML Props - Props API for Web Components

HTML Props is a library that provides a mixin, `HTMLPropsMixin`, to define and
manage properties for custom HTML elements and web components. This mixin
simplifies the process of creating web components by handling property
assignment, rendering, and updates.

## Features

- **Property Management**: Easily define and manage properties for custom
  elements.
- **Rendering**: Implement a `render` method to create a child tree for the
  component.
- **Lifecycle Methods**: Includes lifecycle methods like `connectedCallback`,
  `disconnectedCallback`, `adoptedCallback`, and `attributeChangedCallback`.
- **TypeScript Support**: Written in TypeScript for type safety and better
  developer experience.
- **Testing**: Unit tests provided to ensure the mixin works correctly with
  custom and built-in elements.

## Installation

Add HTML Props to your project.

```sh
deno add jsr:@html-props/core
```

Then, import it in your project:

```ts
import { HTMLPropsMixin } from '@html-props/core';

// OR

import HTMLProps from '@html-props/core';
```

## Usage

### Defining a Custom Element with Props

You can create a custom element by extending the `HTMLPropsMixin` mixin.

```ts
import { HTMLPropsMixin } from '@html-props/core';

class MyElement extends HTMLPropsMixin<MyElement>(HTMLElement) {
  text?: string;

  render() {
    return this.text ?? '-';
  }
}

customElements.define('my-element', MyElement);
```

### Using the Custom Element

You can use the custom element declaratively as follows:

```ts
const element = new MyElement({ text: 'Hello world!' });
document.body.append(element);
```

### Defining Default Props

You can define default properties for your custom element by overriding the
`getDefaultProps` method.

```ts
class MyElement extends HTMLPropsMixin<MyElement>(HTMLElement) {
  text?: string;

  getDefaultProps() {
    return {
      text: 'This is a default.',
      style: {
        color: '#555555',
      },
    };
  }

  render() {
    return this.text ?? '-';
  }
}
```

### Defining a custom Props Interface

While it is recommended to expose all properties as prop types and keep them
optional, you can also define custom interfaces to make specific prop types
required.

```ts
interface MyElementProps {
  text: string;
  textColor?: string;
}

class MyElement extends HTMLPropsMixin<MyElementProps>(HTMLElement) {
  text: string;
  textColor?: string;

  getDefaultProps() {
    return {
      style: {
        color: this.textColor ?? '#555555',
      },
    };
  }

  render() {
    return this.text ?? '-';
  }
}

customElements.define('my-element', MyElement);
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file
for details.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request on
GitHub.
