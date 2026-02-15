/**
 * Type Inference Tests (Playwright)
 *
 * Tests for type inference and optional types in HTMLPropsMixin.
 *
 * @module
 */

import { assertEquals } from '@std/assert';
import { loadTestPage, setupBrowser, teardownBrowser, TEST_OPTIONS, type TestContext } from '../../test-utils/mod.ts';

let ctx: TestContext;

Deno.test({
  name: 'Type Inference Tests',
  ...TEST_OPTIONS,

  async fn(t) {
    // Setup browser once for all tests
    ctx = await setupBrowser();

    await t.step('infers types from default values when type is omitted', async () => {
      await loadTestPage(ctx.page, {
        code: `
          class InferredElement extends HTMLPropsMixin(HTMLElement, {
            count: prop(0, { attribute: true }),
            active: prop(false, { attribute: true }),
            label: prop("start", { attribute: true }),
          }) {}

          InferredElement.define("inferred-el");
          const el = new InferredElement();
          document.body.appendChild(el);

          (window as any).testElement = el;
        `,
      });

      // Check initial values
      const initial = await ctx.page.evaluate(() => {
        const el = (window as any).testElement;
        return {
          count: el.count,
          active: el.active,
          label: el.label,
          countAttr: el.getAttribute('count'),
          hasActiveAttr: el.hasAttribute('active'),
          labelAttr: el.getAttribute('label'),
        };
      });

      assertEquals(initial.count, 0);
      assertEquals(initial.active, false);
      assertEquals(initial.label, 'start');
      assertEquals(initial.countAttr, '0');
      assertEquals(initial.hasActiveAttr, false);
      assertEquals(initial.labelAttr, 'start');

      // Check attribute parsing
      const afterAttrChanges = await ctx.page.evaluate(() => {
        const el = (window as any).testElement;

        // Number parsing
        el.setAttribute('count', '42');
        const countAfter = el.count;

        // Boolean parsing
        el.setAttribute('active', '');
        const activeTrue = el.active;
        el.removeAttribute('active');
        const activeFalse = el.active;

        // String parsing
        el.setAttribute('label', 'changed');
        const labelAfter = el.label;

        return { countAfter, activeTrue, activeFalse, labelAfter };
      });

      assertEquals(afterAttrChanges.countAfter, 42);
      assertEquals(afterAttrChanges.activeTrue, true);
      assertEquals(afterAttrChanges.activeFalse, false);
      assertEquals(afterAttrChanges.labelAfter, 'changed');
    });

    await t.step('handles null defaults with explicit types', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          class NullExplicitElement extends HTMLPropsMixin(HTMLElement, {
            count: prop(null, { type: Number, attribute: true }),
            active: prop(null, { type: Boolean, attribute: true }),
          }) {}

          NullExplicitElement.define("null-explicit-el");
          const el = new NullExplicitElement();
          document.body.appendChild(el);

          (window as any).testElement = el;
        `,
      });

      const initial = await ctx.page.evaluate(() => {
        const el = (window as any).testElement;
        return {
          count: el.count,
          active: el.active,
        };
      });

      assertEquals(initial.count, null);
      assertEquals(initial.active, null);

      const afterAttrChanges = await ctx.page.evaluate(() => {
        const el = (window as any).testElement;
        el.setAttribute('count', '123');
        el.setAttribute('active', '');
        return {
          count: el.count,
          active: el.active,
        };
      });

      assertEquals(afterAttrChanges.count, 123);
      assertEquals(afterAttrChanges.active, true);
    });

    await t.step('handles null defaults without explicit types (fallback to String)', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          class NullImplicitElement extends HTMLPropsMixin(HTMLElement, {
            data: prop(null, { attribute: true }),
          }) {}

          NullImplicitElement.define("null-implicit-el");
          const el = new NullImplicitElement();
          document.body.appendChild(el);

          (window as any).testElement = el;
        `,
      });

      const initial = await ctx.page.evaluate(() => {
        const el = (window as any).testElement;
        return el.data;
      });

      assertEquals(initial, null);

      const afterAttrChange = await ctx.page.evaluate(() => {
        const el = (window as any).testElement;
        el.setAttribute('data', '123');
        return el.data;
      });

      // Should treat attribute as string (not parsed as number)
      assertEquals(afterAttrChange, '123');
    });

    await t.step('handles Enum-like defaults', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          class EnumElement extends HTMLPropsMixin(HTMLElement, {
            variant: { default: "primary", attribute: true },
          }) {}

          EnumElement.define("enum-el");
          const el = new EnumElement();
          document.body.appendChild(el);

          (window as any).testElement = el;
        `,
      });

      const initial = await ctx.page.evaluate(() => {
        const el = (window as any).testElement;
        return el.variant;
      });

      assertEquals(initial, 'primary');

      const afterChange = await ctx.page.evaluate(() => {
        const el = (window as any).testElement;
        el.variant = 'secondary';
        return el.getAttribute('variant');
      });

      assertEquals(afterChange, 'secondary');
    });

    // Teardown
    await teardownBrowser(ctx);
  },
});
