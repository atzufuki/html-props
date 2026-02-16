/**
 * Defaults Tests (Playwright)
 *
 * Tests for direct default values in HTMLPropsMixin.
 *
 * @module
 */

import { assertEquals } from '@std/assert';
import { loadTestPage, setupBrowser, teardownBrowser, TEST_OPTIONS, type TestContext } from '../../test-utils/mod.ts';

let ctx: TestContext;

Deno.test({
  name: 'Defaults Tests',
  ...TEST_OPTIONS,

  async fn(t) {
    // Setup browser once for all tests
    ctx = await setupBrowser();

    await t.step('direct default values', async () => {
      await loadTestPage(ctx.page, {
        code: `
          class DirectDefaultsElement extends HTMLPropsMixin(HTMLElement, {
            // Direct values
            tabIndex: 0,
            title: "Direct Title",
            hidden: true,
            style: { color: "blue", fontSize: "16px" },

            // Custom prop (still needs config)
            count: prop(10),
          }) {}

          DirectDefaultsElement.define("direct-defaults");

          const el = new DirectDefaultsElement();
          document.body.appendChild(el);

          (window as any).testElement = el;
        `,
      });

      const result = await ctx.page.evaluate(() => {
        const el = (window as any).testElement;
        return {
          tabIndexAttr: el.getAttribute('tabindex'),
          title: el.title,
          titleAttr: el.getAttribute('title'),
          hidden: el.hidden,
          hiddenAttr: el.getAttribute('hidden'),
          styleColor: el.style.color,
          styleFontSize: el.style.fontSize,
          count: el.count,
        };
      });

      assertEquals(result.tabIndexAttr, '0');
      assertEquals(result.title, 'Direct Title');
      assertEquals(result.titleAttr, 'Direct Title');
      assertEquals(result.hidden, true);
      assertEquals(result.hiddenAttr, '');
      assertEquals(result.styleColor, 'blue');
      assertEquals(result.styleFontSize, '16px');
      assertEquals(result.count, 10);

      // Check reactivity
      const afterUpdate = await ctx.page.evaluate(() => {
        const el = (window as any).testElement;
        el.tabIndex = -1;
        el.count = 20;
        return {
          tabIndexAttr: el.getAttribute('tabindex'),
          count: el.count,
        };
      });

      assertEquals(afterUpdate.tabIndexAttr, '-1');
      assertEquals(afterUpdate.count, 20);
    });

    await t.step('direct defaults override in constructor', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          class OverrideElement extends HTMLPropsMixin(HTMLElement, {
            tabIndex: 0,
            style: { color: "red" },
          }) {}

          OverrideElement.define("override-defaults");

          const el = new OverrideElement({
            tabIndex: 1,
            style: { color: "blue" },
          });
          el.connectedCallback();

          (window as any).testElement = el;
        `,
      });

      const result = await ctx.page.evaluate(() => {
        const el = (window as any).testElement;
        return {
          tabIndex: el.tabIndex,
          styleColor: el.style.color,
        };
      });

      assertEquals(result.tabIndex, 1);
      assertEquals(result.styleColor, 'blue');
    });

    // Teardown
    await teardownBrowser(ctx);
  },
});
