# @html-props/signals

> A tiny, dependency-free reactive primitives library for Deno and web components.

## Features

- Simple, composable signals for reactive state
- Effects for side effects and subscriptions
- Computed values for derived state
- Batching for efficient updates
- Read-only and untracked access helpers

## Installation

```sh
deno add @html-props/signals
```

## Usage

```ts
import { batch, computed, effect, readonly, signal, untracked } from '@html-props/signals';

// Create a signal
const count = signal(0);

// Read and write
console.log(count()); // 0
count.set(1);
console.log(count.get()); // 1

// Effects
effect(() => {
  console.log('Count changed:', count());
});
count.set(2); // triggers effect

// Computed
const double = computed(() => count() * 2);
console.log(double()); // 4

// Batch updates
batch(() => {
  count.set(10);
  count.set(20);
}); // effect runs only once

// Readonly
const publicCount = readonly(count);
// publicCount.set(5); // TypeError: set is not a function

// Untracked
effect(() => {
  const value = untracked(count); // not tracked as a dependency
});
```

## License

MIT
