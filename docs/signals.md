# Signals

Fine-grained reactivity for your components.

Signals are the backbone of reactivity in html-props. They allow you to create state that automatically updates your UI
when changed.

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
import { computed } from '@html-props/signals';

const count = signal(1);
const double = computed(() => count() * 2);

console.log(double()); // 2
count(2);
console.log(double()); // 4
```

## Batch Updates

Group multiple signal updates into a single effect run.

```typescript
import { batch } from '@html-props/signals';

batch(() => {
  count(10);
  count(20);
}); // Effects run only once
```
