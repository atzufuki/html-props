# Reconciliation

HTML Props uses a custom reconciliation algorithm to efficiently update the DOM when component state changes. Instead of replacing all children on every render, it compares the previous and new render output and applies only the necessary changes.

## How It Works

When a component re-renders, HTML Props:

1. **Matches nodes** between the old and new render trees using keys, IDs, and element types
2. **Morphs matched nodes** by updating only changed attributes, properties, and text content
3. **Removes unmatched old nodes** that no longer exist in the new render
4. **Inserts new nodes** that didn't exist before
5. **Reorders nodes** with minimal DOM operations using a longest increasing subsequence algorithm

This approach preserves DOM element identity, which means:

- **Focus is maintained** - Input fields keep focus during re-renders
- **Scroll position is preserved** - Scrollable containers don't jump
- **Animations continue** - CSS transitions and animations aren't interrupted
- **Form state persists** - Partially typed input values aren't lost

## Using Keys with `dataset.key`

When rendering lists of items, use `dataset.key` to help the reconciler identify which elements correspond to which data items:

```typescript
import { HTMLPropsMixin, prop } from '@html-props/core';
import { Div, Li, Ul } from '@html-props/built-ins';

interface Task {
  id: number;
  title: string;
}

class TaskList extends HTMLPropsMixin(HTMLElement, {
  tasks: prop<Task[]>([]),
}) {
  render() {
    return new Ul({
      content: this.tasks.map(task =>
        new Li({
          dataset: { key: `task-${task.id}` },  // Stable key based on item ID
          textContent: task.title,
        })
      ),
    });
  }
}
```

### Why Keys Matter

Without keys, the reconciler matches elements by position. This can cause problems when items are added, removed, or reordered:

```typescript
// Without keys - problematic
// If you remove the first item, element 2 becomes element 1,
// and the reconciler updates element 1's content instead of removing it.
// This can cause focus loss and visual glitches.

this.tasks.map(task =>
  new Li({ textContent: task.title })  // No key!
)

// With keys - correct
// The reconciler knows which DOM element corresponds to which task,
// so removing a task removes the correct DOM element.

this.tasks.map(task =>
  new Li({
    dataset: { key: `task-${task.id}` },
    textContent: task.title,
  })
)
```

### Key Requirements

1. **Keys must be unique** within the list
2. **Keys must be stable** - use item IDs, not array indices
3. **Keys should be strings** - prefix with context (e.g., `task-`, `user-`)

```typescript
// ❌ Wrong - using array index
this.items.map((item, index) =>
  new Div({ dataset: { key: `${index}` }, ... })
)

// ❌ Wrong - no key at all
this.items.map(item =>
  new Div({ ... })
)

// ✅ Correct - using stable ID
this.items.map(item =>
  new Div({ dataset: { key: `item-${item.id}` }, ... })
)
```

## Matching Strategy

The reconciler uses multiple strategies to match nodes, in order of priority:

### 1. Key Matching

Nodes with `dataset.key` or `id` attributes are matched by their key value:

```typescript
// These will match because they have the same key
// Old: <div data-key="user-123">Alice</div>
// New: <div data-key="user-123">Alice Smith</div>
```

### 2. Descendant ID Matching

If a node contains descendants with IDs, the reconciler can match parent nodes by their children's IDs. This helps with complex nested structures.

### 3. Structural Equality

Nodes without keys are compared structurally using `isEqualNode()`. If they're identical, no update is needed.

### 4. Tag Name Matching

As a fallback, nodes are matched by tag name and node type. This allows morphing between similar elements.

## Controlling Updates

### Default Behavior

By default, HTML Props uses reconciliation for all updates after the initial render:

```typescript
class Counter extends HTMLPropsMixin(HTMLElement, {
  count: prop(0),
}) {
  render() {
    // This is called on every update
    // The reconciler diffs this against the current DOM
    return new Div({
      content: [
        new Span({ textContent: `Count: ${this.count}` }),
        new Button({
          textContent: '+',
          onclick: () => this.count++,
        }),
      ],
    });
  }
}
```

### Force Full Re-render

If you need to bypass reconciliation and perform a full re-render (replacing all children), use `forceUpdate()`:

```typescript
class MyComponent extends HTMLPropsMixin(HTMLElement) {
  refreshContent() {
    // Bypasses reconciliation, replaces all children
    this.forceUpdate();
  }
}
```

This is useful when:

- You want to reset all internal state of child elements
- You're integrating with third-party libraries that manage their own DOM
- You need to force a clean slate for animations

### Custom Update Logic

For fine-grained control, implement an `update()` method:

```typescript
class OptimizedCounter extends HTMLPropsMixin(HTMLElement, {
  count: prop(0),
}) {
  private countSpan?: HTMLSpanElement;

  render() {
    return new Div({
      content: [
        new Span({
          ref: (el) => { this.countSpan = el; },
          textContent: `Count: ${this.count}`,
        }),
        new Button({
          textContent: '+',
          onclick: () => this.count++,
        }),
      ],
    });
  }

  update() {
    // Only update the text, skip full reconciliation
    if (this.countSpan) {
      this.countSpan.textContent = `Count: ${this.count}`;
    }
  }
}
```

If you need to fall back to reconciliation in some cases:

```typescript
update() {
  if (this.needsFullUpdate) {
    // Use reconciliation
    this.defaultUpdate();
  } else {
    // Manual optimization
    this.updateSpecificParts();
  }
}
```

## Performance Considerations

### When Reconciliation Shines

- **Large lists with small changes** - Only modified items are updated
- **Complex nested structures** - Unchanged subtrees are skipped entirely
- **Interactive elements** - Focus and selection state is preserved

### When to Use `forceUpdate()`

- **Complete content replacement** - When most content changes
- **Third-party widget reset** - When external libraries need fresh DOM
- **Animation triggers** - When you need elements to re-mount for CSS animations

### Best Practices

1. **Always use keys for lists** - Even if items never reorder, keys help with additions and removals

2. **Use stable keys** - Prefer database IDs or UUIDs over array indices

3. **Keep render() pure** - Don't modify state during render; it should only return new nodes

4. **Avoid excessive nesting** - Deeply nested structures take longer to reconcile

5. **Use refs for imperative access** - Instead of querying the DOM, use refs to access specific elements

## Comparison with Other Approaches

| Approach | Pros | Cons |
|----------|------|------|
| **replaceChildren** | Simple, predictable | Loses focus, scroll, animations |
| **Virtual DOM (React-style)** | Fast diffing | Memory overhead, complexity |
| **HTML Props Reconciliation** | Real DOM, preserves state | Requires keys for lists |
| **Incremental DOM** | Low memory | More complex API |

HTML Props reconciliation works directly on the real DOM, avoiding the memory overhead of a virtual DOM while still providing efficient updates and state preservation.