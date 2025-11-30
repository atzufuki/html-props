# HTML Props JSX - JSX Runtime for HTML Props

HTML Props JSX is a JavaScript library that provides a JSX runtime for the
[@html-props/core](https://jsr.io/@html-props/core) library. This library enables the use of JSX syntax for templating
in web components built with HTML Props.

## Features

- **JSX Syntax**: Use JSX syntax to define the structure of your web components.
- **Integration with HTML Props**: Seamlessly integrates with the HTML Props library to provide a declarative way to
  define props and child trees.
- **TypeScript Support**: Written in TypeScript for type safety.

## Installation

Add the package to your project.

```sh
deno add jsr:@html-props/jsx
```

## Usage

### Configuring the Compiler

To enable JSX typings, configure your compiler options as follows:

```jsonc
"compilerOptions": {
  // ...
  "jsx": "react-jsx",
  "jsxImportSource": "@html-props/jsx"
}
```

### Configuring the Transpiler

Configure your transpiler to enable the JSX runtime.

```ts
esbuild.build({
  // ...
  jsx: 'automatic',
  jsxImportSource: '@html-props/jsx',
});
```

### Defining a Custom Element with JSX

You can now start writing render methods with JSX syntax.

```tsx
import HTMLProps from '@html-props/core';

const Button = HTMLProps(HTMLButtonElement).define(
  'html-button',
  {
    extends: 'button',
  },
);

class MyElement extends HTMLProps(HTMLElement) {
  static props = {
    text: { type: String, default: '-' },
  };

  declare text: string;

  render() {
    return <Button>{this.text}</Button>;
  }
}

MyElement.define('my-element');
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request on GitHub.
