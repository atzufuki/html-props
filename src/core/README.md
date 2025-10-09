# HTML Props - Props API for Web Components

HTML Props is a JavaScript library that provides a set of mixins for building web components with declarative props and
nested child trees. This library simplifies the process of templating and enables passing complex properties via custom
element's constructor.

## Features

- **Props Management**: Define props for custom elements.
- **Templating**: Implement a `render` method to create a child tree for the component.
- **Utilities**: Includes utility methods for defining custom elements, and generating selectors.
- **TypeScript Support**: Written in TypeScript for type safety.
- **Inheritance Support**: Build component hierarchies with proper mixin application.

## Quick Start

Scaffold a new project with the create tool:

```sh
deno run --reload jsr:@html-props/create my-app
cd my-app
# Start hacking!
```

## Installation

Add the package to your project.

```sh
deno add jsr:@html-props/core
```

Then, import it in your project.

```ts
import HTMLProps from '@html-props/core';

// Or each mixin separately.
import { HTMLPropsMixin, HTMLTemplateMixin, HTMLUtilityMixin } from '@html-props/core';
```

## Usage

### Defining a Custom Element

The default export gives you a mixin including every feature of `HTMLPropsMixin`, `HTMLTemplateMixin` and
`HTMLUtilityMixin`. Extend it and pass in HTMLElement to create a custom element enabling all features.

```ts
import HTMLProps from '@html-props/core';

interface MyElementProps {
  text?: string;
}

class MyElement extends HTMLProps(HTMLElement)<MyElementProps>() {
  text?: string;

  render() {
    return this.text ?? '-';
  }
}

MyElement.define('my-element');
```

Finally use the custom element declaratively as follows:

```ts
const element = new MyElement({ text: 'Hello world!' });
document.body.appendChild(element); // <my-element>Hello world!</my-element>
```

### Building Component Hierarchies

You can extend components that already use HTMLProps to build inheritance hierarchies:

```ts
import HTMLProps from '@html-props/core';
import { signal } from '@html-props/signals';

// Base widget
class Widget extends HTMLProps(HTMLElement)<{ visible: boolean }>() {
  visible = signal(true);
}

Widget.define('base-widget');

// Extended widget - mixins are automatically handled!
interface BoxProps {
  visible?: boolean;
  orientation: 'horizontal' | 'vertical';
}

class Box extends HTMLProps(Widget)<BoxProps>() {
  orientation = signal<'horizontal' | 'vertical'>('horizontal');

  render() {
    return `Box: ${this.orientation()}`;
  }
}

Box.define('widget-box');

// Use it
const box = new Box({ visible: true, orientation: 'vertical' });
document.body.appendChild(box);
```

### Converting an existing Custom Element

You can also convert existing custom elements, like built-in elements to support props. In this case it's unnecessary to
use `HTMLTemplateMixin`, since we are not implementing a child tree using it's render method. Especially if a component
already implements it's own rendering logic, it's likely to conflict if used.

```ts
const Button = HTMLUtilityMixin(HTMLPropsMixin(HTMLButtonElement)<HTMLButtonElement>()).define('html-button', {
  extends: 'button',
});

// Or without the utilities
const Button = HTMLPropsMixin(HTMLButtonElement)<HTMLButtonElement>();
customElements.define('html-button', Button, { extends: 'button' });
```

### Defining Default Props

You can define default properties for your custom element by overriding the `getDefaultProps` method.

```ts
interface MyElementProps {
  text?: string;
  textColor?: string;
}

class MyElement extends HTMLProps(HTMLElement)<MyElementProps>() {
  text?: string;
  textColor?: string;

  getDefaultProps(): this['props'] {
    return {
      text: 'Default text',
      style: {
        color: this.textColor ?? 'blue',
      },
    };
  }

  render() {
    return this.text ?? '-';
  }
}

MyElement.define('my-element');

new MyElement({ text: 'Hello world!', textColor: 'red' }); // <my-element style="color: red;">Hello world!</my-element>
new MyElement({}); // <my-element style="color: blue;">Default text</my-element>
```

### Can I use JSX syntax for templating?

Yes you can! Just install and configurate [@html-props/jsx](https://jsr.io/@html-props/jsx) package to make it work.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request on GitHub.
