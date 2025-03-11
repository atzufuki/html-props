# HTML Props - Props API for Web Components

HTML Props is a JavaScript library that provides a set of mixins for building web components with declarative props and
nested child trees. This library simplifies the process of templating and enables passing complex properties via custom
element's constructor.

## Features

- **Props Management**: Define props for custom elements.
- **Templating**: Implement a `render` method to create a child tree for the component.
- **Utilities**: Includes utility methods for defining custom elements, and generating selectors.
- **TypeScript Support**: Written in TypeScript for type safety.

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

class MyElement extends HTMLProps<MyElement>(HTMLElement) {
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

### Converting an existing Custom Element

You can also convert existing custom elements, like built-in elements to support props. In this case it's unnecessary to
use `HTMLTemplateMixin`, since we are not implementing a child tree using it's render method. Especially if a component
already implements it's own rendering logic, it's likely to conflict if used.

```ts
const Button = HTMLUtilityMixin(HTMLPropsMixin<HTMLButtonElement>(HTMLButtonElement)).define('html-button', {
  extends: 'button',
});

// Or without the utilities
const Button = HTMLPropsMixin<HTMLButtonElement>(HTMLButtonElement);
customElements.define('html-button', Button, { extends: 'button' });
```

### Defining Default Props

You can define default properties for your custom element by overriding the `getDefaultProps` method.

```ts
class MyElement extends HTMLProps<MyElement>(HTMLElement) {
  text?: string;
  textColor?: string;

  getDefaultProps(): this['props'] {
    return {
      text: 'Default text',
      style: {
        color: this.props.textColor ?? 'blue',
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

### Defining a custom Props Interface

You can also separate the props interface if you want to specify which properties to expose.

```ts
interface MyElementProps {
  textColor?: string;
}

class MyElement extends HTMLProps<MyElementProps>(HTMLElement) {
  text = 'Hello world!';
  textColor?: string;

  getDefaultProps(): this['props'] {
    return {
      style: {
        color: this.props.textColor ?? 'blue',
      },
    };
  }

  render() {
    return this.text ?? '-';
  }
}

MyElement.define('my-element');
```

### Can I use JSX syntax for templating?

Yes you can! Add this package to your project

```sh
deno add jsr:@html-props/jsx
```

Configurate your compiler options like so to enable JSX typings.

```jsonc
"compilerOptions": {
  // ...
  "jsx": "react-jsx",
  "jsxImportSource": "@html-props/jsx"
}
```

Finally configurate your transpiler to enable the JSX runtime.

```ts
esbuild.build({
  // ...
  jsxFactory: 'JSX.createElement',
  jsxImportSource: '@html-props/jsx',
  inject: ['@html-props/jsx/jsx-runtime'],
});
```

You can now start writing render methods with JSX syntax.

```tsx
const Button = HTMLUtilityMixin(HTMLPropsMixin<HTMLButtonElement>(HTMLButtonElement)).define('html-button', {
  extends: 'button',
});

class MyElement extends HTMLProps<MyElement>(HTMLElement) {
  text?: string;

  render() {
    return <Button>{this.text ?? '-'}</Button>;
  }
}
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request on GitHub.
