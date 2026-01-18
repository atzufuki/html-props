import { assertEquals } from 'jsr:@std/assert';
import { HTMLPropsMixin } from '../mixin.ts';
import { prop } from '../prop.ts';
import { batch, effect, signal } from '@html-props/signals';
import { PROPS_CONTROLLER } from '../controller.ts';

import { Window } from 'happy-dom';

// Setup environment with happy-dom
if (!globalThis.document) {
  const happyWindow = new Window();

  // deno-lint-ignore no-explicit-any
  const w = happyWindow as any;

  Object.assign(globalThis, {
    window: happyWindow,
    document: w.document,
    customElements: w.customElements,
    HTMLElement: w.HTMLElement,
    HTMLButtonElement: w.HTMLButtonElement || w.HTMLElement,
    Node: w.Node,
    CustomEvent: w.CustomEvent,
    MutationObserver: w.MutationObserver,
  });
}

// ============================================
// BATCHING BUG TESTS
// ============================================

Deno.test('BATCHING BUG: render() is called multiple times when multiple signal props are updated via applyCustomProps', () => {
  let renderCount = 0;
  let renderSnapshots: { variant: string; label: string; value: number }[] = [];

  class MultiPropElement extends HTMLPropsMixin(HTMLElement, {
    variant: prop<string>('default'),
    label: prop<string>(''),
    value: prop<number>(0),
  }) {
    render() {
      renderCount++;
      // Capture the state at each render call
      renderSnapshots.push({
        variant: this.variant,
        label: this.label,
        value: this.value,
      });
      return null;
    }
  }

  customElements.define('multi-prop-element', MultiPropElement);

  const el = new MultiPropElement({
    variant: 'initial',
    label: 'Initial Label',
    value: 100,
  });
  document.body.appendChild(el);

  // Reset counters after initial render
  renderCount = 0;
  renderSnapshots = [];

  // Create a new element with updated props - this simulates morphNode scenario
  const newEl = new MultiPropElement({
    variant: 'updated',
    label: 'Updated Label',
    value: 200,
  });

  // Now apply custom props from new element to existing element
  // This is what morphNode does internally
  // deno-lint-ignore no-explicit-any
  const controller = (el as any)[PROPS_CONTROLLER];
  // deno-lint-ignore no-explicit-any
  controller.applyCustomProps((newEl as any)[PROPS_CONTROLLER].props);

  // BUG: Without batching, render() is called 3 times (once per prop)
  // EXPECTED: render() should only be called ONCE after all props are set
  console.log(`Render count after applyCustomProps: ${renderCount}`);
  console.log('Render snapshots:', JSON.stringify(renderSnapshots, null, 2));

  // This assertion will FAIL if the bug exists (renderCount will be > 1)
  assertEquals(
    renderCount,
    1,
    'render() should only be called once when multiple props are updated via applyCustomProps',
  );

  // Also verify the final state has all updated values
  assertEquals(el.variant, 'updated');
  assertEquals(el.label, 'Updated Label');
  assertEquals(el.value, 200);

  // Cleanup
  document.body.removeChild(el);
});

Deno.test('BATCHING BUG: effects see partially updated state during applyCustomProps', () => {
  let effectRunCount = 0;
  let effectSnapshots: { a: number; b: number; c: number }[] = [];

  class EffectTestElement extends HTMLPropsMixin(HTMLElement, {
    a: prop<number>(0),
    b: prop<number>(0),
    c: prop<number>(0),
  }) {
    render() {
      return null;
    }
  }

  customElements.define('effect-test-element', EffectTestElement);

  const el = new EffectTestElement({ a: 1, b: 2, c: 3 });
  document.body.appendChild(el);

  // Set up an effect that tracks all three props
  effect(() => {
    effectRunCount++;
    effectSnapshots.push({
      a: el.a,
      b: el.b,
      c: el.c,
    });
  });

  // Reset after initial effect run
  effectRunCount = 0;
  effectSnapshots = [];

  // Apply new props
  // deno-lint-ignore no-explicit-any
  const controller = (el as any)[PROPS_CONTROLLER];
  controller.applyCustomProps({ a: 10, b: 20, c: 30 });

  console.log(`Effect run count: ${effectRunCount}`);
  console.log('Effect snapshots:', JSON.stringify(effectSnapshots, null, 2));

  // BUG: Without batching, the effect runs multiple times with partial state
  // e.g., { a: 10, b: 2, c: 3 }, { a: 10, b: 20, c: 3 }, { a: 10, b: 20, c: 30 }
  // EXPECTED: Effect should only run ONCE with final state { a: 10, b: 20, c: 30 }
  assertEquals(effectRunCount, 1, 'Effect should only run once when multiple props are updated');

  // Verify the snapshot has the complete final state
  if (effectSnapshots.length > 0) {
    const lastSnapshot = effectSnapshots[effectSnapshots.length - 1];
    assertEquals(lastSnapshot, { a: 10, b: 20, c: 30 }, 'Effect should see complete updated state');
  }

  // Cleanup
  document.body.removeChild(el);
});

Deno.test('BATCHING BUG: render sees inconsistent state when props are updated sequentially', () => {
  // This test demonstrates that without batching, render() can be called
  // with some props updated and others still having old values
  let renderCount = 0;
  const stateAtEachRender: { x: number; y: number }[] = [];

  class TwoPropsElement extends HTMLPropsMixin(HTMLElement, {
    x: prop<number>(0),
    y: prop<number>(0),
  }) {
    render() {
      renderCount++;
      stateAtEachRender.push({ x: this.x, y: this.y });
      return null;
    }
  }

  customElements.define('two-props-element', TwoPropsElement);

  // Start with x=1, y=1
  const el = new TwoPropsElement({ x: 1, y: 1 });
  document.body.appendChild(el);

  // Reset after initial render
  renderCount = 0;
  stateAtEachRender.length = 0;

  // Update both props to x=10, y=10
  // deno-lint-ignore no-explicit-any
  const controller = (el as any)[PROPS_CONTROLLER];
  controller.applyCustomProps({ x: 10, y: 10 });

  console.log(`Render count: ${renderCount}`);
  console.log('State at each render:', JSON.stringify(stateAtEachRender));

  // BUG: Without batching, we might see:
  //   render #1: { x: 10, y: 1 }  <- INCONSISTENT! y is still old value
  //   render #2: { x: 10, y: 10 } <- final state
  // EXPECTED: Only one render with { x: 10, y: 10 }

  assertEquals(renderCount, 1, 'Should only render once');

  // The single render should see both values updated
  if (stateAtEachRender.length > 0) {
    assertEquals(
      stateAtEachRender[0],
      { x: 10, y: 10 },
      'Render should see both props updated, not partial state',
    );
  }

  // Cleanup
  document.body.removeChild(el);
});

Deno.test('BATCHING: verify batch() from signals package works correctly', () => {
  // This test verifies that the batch() function from signals works as expected
  // If this passes but the above tests fail, the fix is to use batch() in applyCustomProps

  const a = signal(1);
  const b = signal(2);
  const c = signal(3);

  let effectRuns = 0;
  let snapshots: { a: number; b: number; c: number }[] = [];

  const dispose = effect(() => {
    effectRuns++;
    snapshots.push({ a: a(), b: b(), c: c() });
  });

  // Reset after initial run
  effectRuns = 0;
  snapshots = [];

  // Update with batching
  batch(() => {
    a.set(10);
    b.set(20);
    c.set(30);
  });

  assertEquals(effectRuns, 1, 'Effect should only run once with batch()');
  assertEquals(snapshots.length, 1, 'Should only have one snapshot');
  assertEquals(snapshots[0], { a: 10, b: 20, c: 30 }, 'Snapshot should have all updated values');

  // Cleanup
  dispose();
});
