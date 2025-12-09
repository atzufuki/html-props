# JSX Support

Use JSX syntax for templating in your components.

## Installation

```bash
deno add jsr:@html-props/jsx@^1.0.0-beta
```

## Configuration

Configure your compiler options in deno.json:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@html-props/jsx"
  }
}
```

## Usage

```typescript
import { HTMLPropsMixin } from '@html-props/core';

class MyElement extends HTMLPropsMixin(HTMLElement) {
  render() {
    return (
      <div class='container'>
        <h1>Hello JSX</h1>
        <p>This is rendered using JSX!</p>
      </div>
    );
  }
}
```
