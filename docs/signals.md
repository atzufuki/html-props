# Signals

Fine-grained reactivity for your components. Signals are the backbone of reactivity in html-props. They allow you to
create state that automatically updates your UI when changed.

## Installation

```bash
deno add @html-props/signals@^1.0.0-beta
```

## Basic Usage

```typescript
import { effect, signal } from '@html-props/signals';

const count = signal(0);

// Effects run whenever dependencies change
effect(() => {
  console.log(`The count is ${count()}`);
});

count(1); // Logs: "The count is 1"
count(2); // Logs: "The count is 2"
```

## Using Signals in Components

Component props are internally backed by signals. You can also use standalone signals for local state.

```typescript
import { HTMLPropsMixin } from '@html-props/core';
import { Button } from '@html-props/built-ins';
import { signal } from '@html-props/signals';

class Counter extends HTMLPropsMixin(HTMLElement) {
  // Local state
  count = signal(0);

  render() {
    return new Button({
      textContent: `Count: ${this.count()}`,
      onclick: () => this.count.update((n) => n + 1),
    });
  }
}
```

## Computed Values

Computed signals derive their value from other signals and update automatically.

```typescript
import { computed, signal } from '@html-props/signals';

const count = signal(1);
const double = computed(() => count() * 2);

console.log(double()); // 2
```
