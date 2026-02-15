/**
 * Batching Tests (Playwright)
 *
 * Tests for batch updates and signal batching behavior.
 *
 * @module
 */

import { assertEquals } from '@std/assert';
import { loadTestPage, setupBrowser, teardownBrowser, TEST_OPTIONS, type TestContext } from '../../test-utils/mod.ts';

let ctx: TestContext;

Deno.test({
  name: 'Batching Tests',
  ...TEST_OPTIONS,

  async fn(t) {
    // Setup browser once for all tests
    ctx = await setupBrowser();

    await t.step('render() is called once when multiple signal props are updated via applyCustomProps', async () => {
      await loadTestPage(ctx.page, {
        code: `
          let renderCount = 0;
          let renderSnapshots = [];

          class MultiPropElement extends HTMLPropsMixin(HTMLElement, {
            variant: prop("default"),
            label: prop(""),
            value: prop(0),
          }) {
            render() {
              renderCount++;
              renderSnapshots.push({
                variant: this.variant,
                label: this.label,
                value: this.value,
              });
              return null;
            }
          }

          customElements.define("multi-prop-element", MultiPropElement);

          const el = new MultiPropElement({
            variant: "initial",
            label: "Initial Label",
            value: 100,
          });
          document.body.appendChild(el);

          // Reset counters after initial render
          renderCount = 0;
          renderSnapshots = [];

          // Create a new element with updated props - this simulates morphNode scenario
          const newEl = new MultiPropElement({
            variant: "updated",
            label: "Updated Label",
            value: 200,
          });

          // Get the controller and apply custom props
          const PROPS_CONTROLLER = Symbol.for("html-props:controller");
          const controller = el[PROPS_CONTROLLER];
          controller.applyCustomProps(newEl[PROPS_CONTROLLER].props);

          (window as any).result = {
            renderCount,
            renderSnapshots,
            variant: el.variant,
            label: el.label,
            value: el.value,
          };
        `,
      });

      const result = await ctx.page.evaluate(() => (window as any).result);

      assertEquals(
        result.renderCount,
        1,
        'render() should only be called once when multiple props are updated via applyCustomProps',
      );
      assertEquals(result.variant, 'updated');
      assertEquals(result.label, 'Updated Label');
      assertEquals(result.value, 200);
    });

    await t.step('effects see complete state during applyCustomProps', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          let effectRunCount = 0;
          let effectSnapshots = [];

          class EffectTestElement extends HTMLPropsMixin(HTMLElement, {
            a: prop(0),
            b: prop(0),
            c: prop(0),
          }) {
            render() {
              return null;
            }
          }

          customElements.define("effect-test-element", EffectTestElement);

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
          const PROPS_CONTROLLER = Symbol.for("html-props:controller");
          const controller = el[PROPS_CONTROLLER];
          controller.applyCustomProps({ a: 10, b: 20, c: 30 });

          (window as any).result = {
            effectRunCount,
            effectSnapshots,
          };
        `,
      });

      const result = await ctx.page.evaluate(() => (window as any).result);

      assertEquals(
        result.effectRunCount,
        1,
        'Effect should only run once when multiple props are updated',
      );

      if (result.effectSnapshots.length > 0) {
        const lastSnapshot = result.effectSnapshots[result.effectSnapshots.length - 1];
        assertEquals(
          lastSnapshot,
          { a: 10, b: 20, c: 30 },
          'Effect should see complete updated state',
        );
      }
    });

    await t.step('render sees consistent state when props are updated', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          let renderCount = 0;
          const stateAtEachRender = [];

          class TwoPropsElement extends HTMLPropsMixin(HTMLElement, {
            x: prop(0),
            y: prop(0),
          }) {
            render() {
              renderCount++;
              stateAtEachRender.push({ x: this.x, y: this.y });
              return null;
            }
          }

          customElements.define("two-props-element", TwoPropsElement);

          const el = new TwoPropsElement({ x: 1, y: 1 });
          document.body.appendChild(el);

          // Reset after initial render
          renderCount = 0;
          stateAtEachRender.length = 0;

          // Update both props
          const PROPS_CONTROLLER = Symbol.for("html-props:controller");
          const controller = el[PROPS_CONTROLLER];
          controller.applyCustomProps({ x: 10, y: 10 });

          (window as any).result = {
            renderCount,
            stateAtEachRender,
          };
        `,
      });

      const result = await ctx.page.evaluate(() => (window as any).result);

      assertEquals(result.renderCount, 1, 'Should only render once');

      if (result.stateAtEachRender.length > 0) {
        assertEquals(
          result.stateAtEachRender[0],
          { x: 10, y: 10 },
          'Render should see both props updated, not partial state',
        );
      }
    });

    await t.step('batch() from signals package works correctly', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          const a = signal(1);
          const b = signal(2);
          const c = signal(3);

          let effectRuns = 0;
          let snapshots = [];

          effect(() => {
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

          (window as any).result = {
            effectRuns,
            snapshots,
          };
        `,
      });

      const result = await ctx.page.evaluate(() => (window as any).result);

      assertEquals(result.effectRuns, 1, 'Effect should only run once with batch()');
      assertEquals(result.snapshots.length, 1, 'Should only have one snapshot');
      assertEquals(
        result.snapshots[0],
        { a: 10, b: 20, c: 30 },
        'Snapshot should have all updated values',
      );
    });

    // Teardown
    await teardownBrowser(ctx);
  },
});
