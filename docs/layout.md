# Layout System

The `@html-props/layout` package provides a set of layout components inspired by Flutter, making it easy to build
responsive and flexible UIs without writing complex CSS.

## Installation

```bash
deno add @html-props/layout
```

## Components

### Row & Column

Flexbox containers for arranging children horizontally (`Row`) or vertically (`Column`).

```typescript
import { Column, Row } from '@html-props/layout';

new Column({
  gap: '1rem',
  content: [
    new Row({
      mainAxisAlignment: 'space-between',
      content: [
        new Div({ textContent: 'Left' }),
        new Div({ textContent: 'Right' }),
      ],
    }),
    new Div({ textContent: 'Bottom' }),
  ],
});
```

#### Properties

| Property             | Type                                                                             | Default   | Description                    |
| -------------------- | -------------------------------------------------------------------------------- | --------- | ------------------------------ |
| `mainAxisAlignment`  | `start` \| `end` \| `center` \| `spaceBetween` \| `spaceAround` \| `spaceEvenly` | `start`   | Alignment along the main axis  |
| `crossAxisAlignment` | `start` \| `end` \| `center` \| `stretch` \| `baseline`                          | `stretch` | Alignment along the cross axis |
| `gap`                | `string`                                                                         | `0`       | Gap between children           |
| `wrap`               | `nowrap` \| `wrap` \| `wrap-reverse`                                             | `nowrap`  | Flex wrap behavior             |

### Container

A convenience widget that combines common painting, positioning, and sizing widgets.

```typescript
import { Container } from '@html-props/layout';

new Container({
  width: '200px',
  height: '200px',
  color: '#f0f0f0',
  padding: '20px',
  radius: '8px',
  shadow: '0 2px 4px rgba(0,0,0,0.1)',
  content: new Text({ text: 'Hello' }),
});
```

#### Properties

| Property            | Type     | Description                               |
| ------------------- | -------- | ----------------------------------------- |
| `width`, `height`   | `string` | Dimensions (e.g. '100px', '100%')         |
| `padding`, `margin` | `string` | Spacing (e.g. '1rem', '10px 20px')        |
| `color`             | `string` | Background color                          |
| `border`            | `string` | Border shorthand (e.g. '1px solid black') |
| `radius`            | `string` | Border radius                             |
| `shadow`            | `string` | Box shadow                                |
| `alignment`         | `string` | Align child within container              |

### Stack

Overlaps its children. Useful for positioning elements on top of each other.

```typescript
import { Stack } from '@html-props/layout';

new Stack({
  content: [
    new Container({ width: '100px', height: '100px', color: 'red' }),
    new Container({ width: '50px', height: '50px', color: 'blue' }),
  ],
});
```

### Center

Centers its child within itself.

```typescript
import { Center } from '@html-props/layout';

new Center({
  content: new Text({ text: 'Centered!' }),
});
```

### Padding

Adds padding around its child.

```typescript
import { Padding } from '@html-props/layout';

new Padding({
  padding: '2rem',
  content: new Div({ textContent: 'Content with padding' }),
});
```

### SizedBox

A box with a specified size. If given a child, it forces the child to have its specific width and/or height.

```typescript
import { SizedBox } from '@html-props/layout';

new SizedBox({
  width: '20px', // Spacer
});
```

### Grid

A grid layout container.

```typescript
import { Grid } from '@html-props/layout';

new Grid({
  columns: 'repeat(3, 1fr)',
  gap: '1rem',
  content: [
    // ... items
  ],
});
```
