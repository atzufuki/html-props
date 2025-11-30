# Lifecycle Hooks

Hook into the lifecycle of your components.

## onMount()

Called when the component is connected to the DOM. This is a good place to fetch data or set up subscriptions.

## onUnmount()

Called when the component is disconnected from the DOM. Use this to clean up timers or subscriptions.

```typescript
class Timer extends HTMLPropsMixin(HTMLElement) {
  count = signal(0);
  intervalId = null;

  onMount() {
    console.log('Timer mounted');
    this.intervalId = setInterval(() => {
      this.count.update((c) => c + 1);
    }, 1000);
  }

  onUnmount() {
    console.log('Timer unmounted');
    clearInterval(this.intervalId);
  }

  render() {
    return new Div({ textContent: `Seconds: ${this.count()}` });
  }
}
```
