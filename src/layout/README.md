# @html-props/layout

Layout components for HTML Props, inspired by Flutter's layout widgets.

## Components

- `Row` - Flex container with horizontal direction
- `Column` - Flex container with vertical direction
- `Stack` - Overlapping children
- `Center` - Centers content
- `Padding` - Adds padding
- `Container` - Box model properties
- `SizedBox` - Fixed size box

## Usage

```typescript
import { Row, Column, Center } from '@html-props/layout';

new Column({
  gap: '1rem',
  children: [
    new Row({
      mainAxisAlignment: 'space-between',
      children: [/* ... */]
    }),
    new Center({
      child: /* ... */
    })
  ]
})
```
