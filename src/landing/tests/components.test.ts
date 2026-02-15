/**
 * Tests for landing page components using Playwright.
 *
 * Tests run in a real browser via Playwright while using Deno.test() as the runner.
 */

import { assertEquals } from 'jsr:@std/assert';
import { loadTestPage, setupBrowser, teardownBrowser, TEST_OPTIONS, type TestContext } from '../../test-utils/mod.ts';

let ctx: TestContext;

Deno.test({
  name: 'Landing Components Tests',
  ...TEST_OPTIONS,
  async fn(t) {
    ctx = await setupBrowser();

    await t.step('Signals work as expected', async () => {
      await loadTestPage(ctx.page, {
        code: `
          let runCount = 0;
          const count = signal(0);

          effect(() => {
            count();
            runCount++;
          });

          (window as any).getRunCount = () => runCount;
          (window as any).count = count;
        `,
      });

      // Initial effect run
      const initialRunCount = await ctx.page.evaluate(() => {
        return (window as any).getRunCount();
      });
      assertEquals(initialRunCount, 1);

      // After signal update
      const afterUpdate = await ctx.page.evaluate(() => {
        const count = (window as any).count;
        count.set(1);
        return (window as any).getRunCount();
      });
      assertEquals(afterUpdate, 2);
    });

    await t.step('Signal updates trigger effects', async () => {
      await loadTestPage(ctx.page, {
        code: `
          const nameSignal = signal('initial');
          const values: string[] = [];

          effect(() => {
            values.push(nameSignal());
          });

          (window as any).getValues = () => [...values];
          (window as any).nameSignal = nameSignal;
        `,
      });

      // Check initial value
      const initialValues = await ctx.page.evaluate(() => {
        return (window as any).getValues();
      });
      assertEquals(initialValues, ['initial']);

      // Update and check
      const afterFirstUpdate = await ctx.page.evaluate(() => {
        const ns = (window as any).nameSignal;
        ns.set('updated');
        return (window as any).getValues();
      });
      assertEquals(afterFirstUpdate, ['initial', 'updated']);

      // Another update
      const afterSecondUpdate = await ctx.page.evaluate(() => {
        const ns = (window as any).nameSignal;
        ns.set('final');
        return (window as any).getValues();
      });
      assertEquals(afterSecondUpdate, ['initial', 'updated', 'final']);
    });

    // Cleanup
    await teardownBrowser(ctx);
  },
});
