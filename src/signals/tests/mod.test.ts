/**
 * Signals Tests (Playwright)
 *
 * Tests for signal, computed, effect, batch, untracked, and readonly.
 *
 * @module
 */

import { assertEquals } from '@std/assert';
import { loadTestPage, setupBrowser, teardownBrowser, TEST_OPTIONS, type TestContext } from '../../test-utils/mod.ts';

let ctx: TestContext;

Deno.test({
  name: 'Signals Tests',
  ...TEST_OPTIONS,

  async fn(t) {
    // Setup browser once for all tests
    ctx = await setupBrowser();

    await t.step('signal: get/set', async () => {
      await loadTestPage(ctx.page, {
        code: `
          const count = signal(0);
          const initial = count();
          count.set(5);
          const afterSet = count();

          (window as any).result = { initial, afterSet };
        `,
      });

      const result = await ctx.page.evaluate(() => (window as any).result);
      assertEquals(result.initial, 0);
      assertEquals(result.afterSet, 5);
    });

    await t.step('signal: update method', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          const count = signal(1);
          count.update((v) => v + 1);
          const afterIncrement = count();
          count.update((v) => v * 10);
          const afterMultiply = count();

          (window as any).result = { afterIncrement, afterMultiply };
        `,
      });

      const result = await ctx.page.evaluate(() => (window as any).result);
      assertEquals(result.afterIncrement, 2);
      assertEquals(result.afterMultiply, 20);
    });

    await t.step('effect: runs on signal change', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          const count = signal(0);
          let triggered = 0;
          effect(() => {
            count();
            triggered++;
          });
          count.set(1);
          count.set(2);

          (window as any).result = { triggered };
        `,
      });

      const result = await ctx.page.evaluate(() => (window as any).result);
      assertEquals(result.triggered, 3);
    });

    await t.step('effect: runs once with multiple deps', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          const count = signal(0);
          const doubleCount = computed(() => count() * 2);
          const tripleCount = computed(() => count() * 3);
          let triggered = 0;
          effect(() => {
            count();
            doubleCount();
            tripleCount();
            triggered++;
          });
          count.set(1);

          (window as any).result = { triggered };
        `,
      });

      const result = await ctx.page.evaluate(() => (window as any).result);
      assertEquals(result.triggered, 2);
    });

    await t.step('effect: cleanup removes effect from subscribers', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          const s = signal(0);
          let runs = 0;
          const dispose = effect(() => {
            s();
            runs++;
          });
          const runsAfterInit = runs;
          dispose();
          s.set(1);
          const runsAfterDispose = runs;

          (window as any).result = { runsAfterInit, runsAfterDispose };
        `,
      });

      const result = await ctx.page.evaluate(() => (window as any).result);
      assertEquals(result.runsAfterInit, 1);
      assertEquals(result.runsAfterDispose, 1);
    });

    await t.step('effect: cleanup function is called before re-run and on dispose', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          const s = signal(0);
          let cleanups = 0;
          let runs = 0;
          const dispose = effect(() => {
            s();
            runs++;
            return () => {
              cleanups++;
            };
          });
          const runsAfterInit = runs;
          const cleanupsAfterInit = cleanups;

          s.set(1);
          const runsAfterChange = runs;
          const cleanupsAfterChange = cleanups;

          dispose();
          const cleanupsAfterDispose = cleanups;

          (window as any).result = {
            runsAfterInit,
            cleanupsAfterInit,
            runsAfterChange,
            cleanupsAfterChange,
            cleanupsAfterDispose,
          };
        `,
      });

      const result = await ctx.page.evaluate(() => (window as any).result);
      assertEquals(result.runsAfterInit, 1);
      assertEquals(result.cleanupsAfterInit, 0);
      assertEquals(result.runsAfterChange, 2);
      assertEquals(result.cleanupsAfterChange, 1);
      assertEquals(result.cleanupsAfterDispose, 2);
    });

    await t.step('effect: abort signal cancels effect', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          const s = signal(0);
          let runs = 0;
          const controller = new AbortController();
          effect(() => {
            s();
            runs++;
          }, { signal: controller.signal });
          const runsAfterInit = runs;

          s.set(1);
          const runsAfterChange = runs;

          controller.abort();
          s.set(2);
          const runsAfterAbort = runs;

          (window as any).result = { runsAfterInit, runsAfterChange, runsAfterAbort };
        `,
      });

      const result = await ctx.page.evaluate(() => (window as any).result);
      assertEquals(result.runsAfterInit, 1);
      assertEquals(result.runsAfterChange, 2);
      assertEquals(result.runsAfterAbort, 2);
    });

    await t.step('effect: already aborted signal does not run effect', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          const controller = new AbortController();
          controller.abort();
          const s = signal(0);
          let runs = 0;
          effect(() => {
            s();
            runs++;
          }, { signal: controller.signal });

          (window as any).result = { runs };
        `,
      });

      const result = await ctx.page.evaluate(() => (window as any).result);
      assertEquals(result.runs, 0);
    });

    await t.step('computed: updates when dependencies change', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          const a = signal(2);
          const b = signal(3);
          const sum = computed(() => a() + b());
          const initial = sum();
          a.set(5);
          const afterChange = sum();

          (window as any).result = { initial, afterChange };
        `,
      });

      const result = await ctx.page.evaluate(() => (window as any).result);
      assertEquals(result.initial, 5);
      assertEquals(result.afterChange, 8);
    });

    await t.step('batch: effects run once after batch', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          const a = signal(1);
          const b = signal(2);
          let runs = 0;
          effect(() => {
            a();
            b();
            runs++;
          });
          batch(() => {
            a.set(10);
            b.set(20);
            b.set(30);
          });

          (window as any).result = { runs };
        `,
      });

      const result = await ctx.page.evaluate(() => (window as any).result);
      assertEquals(result.runs, 2);
    });

    await t.step('untracked: does not track dependencies', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          const a = signal(1);
          let runs = 0;
          effect(() => {
            // This access is untracked
            untracked(() => a());
            runs++;
          });
          a.set(2);
          const runsAfterChange = runs;

          // Also works with direct signal
          const untrackedValue = untracked(a);

          (window as any).result = { runsAfterChange, untrackedValue };
        `,
      });

      const result = await ctx.page.evaluate(() => (window as any).result);
      assertEquals(result.runsAfterChange, 1);
      assertEquals(result.untrackedValue, 2);
    });

    await t.step('readonly: cannot set', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          const s = signal(1);
          const r = readonly(s);
          const value = r();
          const hasSet = typeof r.set === 'function';

          (window as any).result = { value, hasSet };
        `,
      });

      const result = await ctx.page.evaluate(() => (window as any).result);
      assertEquals(result.value, 1);
      assertEquals(result.hasSet, false);
    });

    // Teardown
    await teardownBrowser(ctx);
  },
});
