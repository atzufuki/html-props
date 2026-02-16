/**
 * Wrapper Tests (Playwright)
 *
 * Tests for HTMLPropsMixin wrapping various element types.
 *
 * @module
 */

import { assert, assertEquals } from '@std/assert';
import { loadTestPage, setupBrowser, teardownBrowser, TEST_OPTIONS, type TestContext } from '../../test-utils/mod.ts';

let ctx: TestContext;

Deno.test({
  name: 'Wrapper Tests',
  ...TEST_OPTIONS,

  async fn(t) {
    // Setup browser once for all tests
    ctx = await setupBrowser();

    await t.step('wraps custom element without props config', async () => {
      await loadTestPage(ctx.page, {
        code: `
          // Create a base custom element to wrap
          class BaseElement extends HTMLElement {
            elevation = 1;
            disabled = false;
          }
          customElements.define("base-element", BaseElement);

          // Wrap without config - should use simple wrapper mode
          const Wrapped = HTMLPropsMixin(BaseElement);
          Wrapped.define("wrapped-base-element");

          const el = new Wrapped();
          document.body.appendChild(el);

          // Check constructor props API
          const el2 = new Wrapped({
            elevation: 3,
            disabled: false,
          });
          document.body.appendChild(el2);

          (window as any).el = el;
          (window as any).el2 = el2;
          (window as any).BaseElement = BaseElement;
          (window as any).Wrapped = Wrapped;
        `,
      });

      const result = await ctx.page.evaluate(() => {
        const el = (window as any).el;
        const el2 = (window as any).el2;
        const BaseElement = (window as any).BaseElement;
        const Wrapped = (window as any).Wrapped;

        const isBaseElement = el instanceof BaseElement;
        const isWrapped = el instanceof Wrapped;

        // Set property via native setter
        el.elevation = 5;
        const elevationAfter = el.elevation;

        return {
          isBaseElement,
          isWrapped,
          elevationAfter,
          el2Elevation: el2.elevation,
        };
      });

      assertEquals(result.isBaseElement, true);
      assertEquals(result.isWrapped, true);
      assertEquals(result.elevationAfter, 5);
      assertEquals(result.el2Elevation, 3);
    });

    await t.step('wraps custom element with props API', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          // Create a base custom element
          class BaseButton extends HTMLElement {
            elevation = 1;
            disabled = false;
          }
          customElements.define("base-button", BaseButton);

          // Wrap WITH custom props
          const Wrapped = HTMLPropsMixin(BaseButton, {
            label: prop("Click me"),
            count: prop(0),
          });
          Wrapped.define("wrapped-base-button");

          const el = new Wrapped({
            elevation: 2,
            disabled: false,
            label: "Submit Form",
            count: 5,
          });
          document.body.appendChild(el);

          (window as any).el = el;
        `,
      });

      const result = await ctx.page.evaluate(() => {
        const el = (window as any).el;

        const initial = {
          elevation: el.elevation,
          disabled: el.disabled,
          label: el.label,
          count: el.count,
        };

        // Update custom prop
        el.count = 10;
        const countAfter = el.count;

        // Update native prop
        el.elevation = 4;
        const elevationAfter = el.elevation;

        return { initial, countAfter, elevationAfter };
      });

      assertEquals(result.initial.elevation, 2);
      assertEquals(result.initial.disabled, false);
      assertEquals(result.initial.label, 'Submit Form');
      assertEquals(result.initial.count, 5);
      assertEquals(result.countAfter, 10);
      assertEquals(result.elevationAfter, 4);
    });

    await t.step('handles elements with null/undefined style property', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          // Simulate an element where style might be null/undefined
          class ElementWithNullStyle extends HTMLElement {
            _style = null;

            get style() {
              return this._style;
            }

            set style(value) {
              // Ignore for this test
            }
          }

          customElements.define("element-with-null-style", ElementWithNullStyle);

          const Wrapped = HTMLPropsMixin(ElementWithNullStyle);
          Wrapped.define("wrapped-null-style");

          let noError = true;
          try {
            const el = new Wrapped({
              style: { backgroundColor: "red", padding: "10px" },
            });
            document.body.appendChild(el);
            (window as any).el = el;
          } catch (e) {
            noError = false;
          }

          (window as any).noError = noError;
          (window as any).ElementWithNullStyle = ElementWithNullStyle;
        `,
      });

      const result = await ctx.page.evaluate(() => {
        const el = (window as any).el;
        const ElementWithNullStyle = (window as any).ElementWithNullStyle;
        return {
          noError: (window as any).noError,
          isInstance: el instanceof ElementWithNullStyle,
        };
      });

      assertEquals(result.noError, true);
      assertEquals(result.isInstance, true);
    });

    await t.step('handles elements with undefined dataset property', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          // Simulate element where dataset might be undefined
          class ElementWithNoDataset extends HTMLElement {
            get dataset() {
              return undefined;
            }
          }

          customElements.define("element-with-no-dataset", ElementWithNoDataset);

          const Wrapped = HTMLPropsMixin(ElementWithNoDataset);
          Wrapped.define("wrapped-no-dataset");

          let noError = true;
          try {
            const el = new Wrapped({
              dataset: { key: "value" },
            });
            document.body.appendChild(el);
            (window as any).el = el;
          } catch (e) {
            noError = false;
          }

          (window as any).noError = noError;
          (window as any).ElementWithNoDataset = ElementWithNoDataset;
        `,
      });

      const result = await ctx.page.evaluate(() => {
        const el = (window as any).el;
        const ElementWithNoDataset = (window as any).ElementWithNoDataset;
        return {
          noError: (window as any).noError,
          isInstance: el instanceof ElementWithNoDataset,
        };
      });

      assertEquals(result.noError, true);
      assertEquals(result.isInstance, true);
    });

    // Teardown
    await teardownBrowser(ctx);
  },
});
