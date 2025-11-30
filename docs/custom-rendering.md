# Custom Rendering

By default, components re-render their entire content when properties change. You can optimize this by implementing a
custom update strategy.

## The update() Method

Define an `update()` method to take control of subsequent renders. The initial render is always handled automatically.

```typescript
class MyElement extends HTMLPropsMixin(HTMLElement, {
  count: { type: Number, default: 0 },
}) {
  render() {
    // Called for initial render
    // Also called manually in update() if needed
    return document.createTextNode(`Count: ${this.count}`);
  }

  update() {
    // Called ONLY for updates (not initial render)
    // Manually call render() if needed
    const newContent = this.render();

    // Perform fine-grained DOM updates
    this.firstChild.textContent = newContent.textContent;
  }
}
```

## Fallback to Default

You can call `this.defaultUpdate()` to fall back to the default behavior (replacing all children) if needed.

```typescript
update() {
  if (this.shouldOptimize) {
    // Custom logic
    const newContent = this.render();
    this.applyOptimization(newContent);
  } else {
    // Fallback
    this.defaultUpdate();
  }
}
```
