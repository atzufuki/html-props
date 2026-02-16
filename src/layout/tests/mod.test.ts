/**
 * Tests for layout components using Playwright.
 *
 * Tests run in a real browser via Playwright while using Deno.test() as the runner.
 */

import { assertEquals } from 'jsr:@std/assert';
import { loadTestPage, setupBrowser, teardownBrowser, TEST_OPTIONS, type TestContext } from '../../test-utils/mod.ts';

let ctx: TestContext;

Deno.test({
  name: 'Layout Tests',
  ...TEST_OPTIONS,
  async fn(t) {
    ctx = await setupBrowser();

    await t.step('Row applies flex styles', async () => {
      await loadTestPage(ctx.page, {
        code: `
          const row = new Row({
            mainAxisAlignment: 'center',
            gap: '10px',
          });
          document.body.appendChild(row);
          (window as any).testRow = row;
        `,
      });

      const result = await ctx.page.evaluate(() => {
        const row = (window as any).testRow;
        return {
          display: row.style.display,
          flexDirection: row.style.flexDirection,
          justifyContent: row.style.justifyContent,
          gap: row.style.gap,
        };
      });

      assertEquals(result.display, 'flex');
      assertEquals(result.flexDirection, 'row');
      assertEquals(result.justifyContent, 'center');
      assertEquals(result.gap, '10px');
    });

    await t.step('Column applies flex styles', async () => {
      await loadTestPage(ctx.page, {
        code: `
          const col = new Column({
            crossAxisAlignment: 'center',
          });
          document.body.appendChild(col);
          (window as any).testCol = col;
        `,
      });

      const result = await ctx.page.evaluate(() => {
        const col = (window as any).testCol;
        return {
          display: col.style.display,
          flexDirection: col.style.flexDirection,
          alignItems: col.style.alignItems,
        };
      });

      assertEquals(result.display, 'flex');
      assertEquals(result.flexDirection, 'column');
      assertEquals(result.alignItems, 'center');
    });

    await t.step('Center applies centering styles', async () => {
      await loadTestPage(ctx.page, {
        code: `
          import { Center } from "./src/layout/mod.ts";
          const center = new Center({});
          document.body.appendChild(center);
          (window as any).testCenter = center;
        `,
      });

      const result = await ctx.page.evaluate(() => {
        const center = (window as any).testCenter;
        return {
          display: center.style.display,
          justifyContent: center.style.justifyContent,
          alignItems: center.style.alignItems,
        };
      });

      assertEquals(result.display, 'flex');
      assertEquals(result.justifyContent, 'center');
      assertEquals(result.alignItems, 'center');
    });

    await t.step('Stack applies grid styles', async () => {
      await loadTestPage(ctx.page, {
        code: `
          import { Stack } from "./src/layout/mod.ts";
          const stack = new Stack({
            alignment: 'center',
          });
          document.body.appendChild(stack);
          (window as any).testStack = stack;
        `,
      });

      const result = await ctx.page.evaluate(() => {
        const stack = (window as any).testStack;
        return {
          display: stack.style.display,
          gridTemplateAreas: stack.style.gridTemplateAreas,
          placeItems: stack.style.placeItems,
        };
      });

      assertEquals(result.display, 'grid');
      assertEquals(result.gridTemplateAreas, '"stack"');
      // Browser may normalize "center center" to just "center"
      assertEquals(result.placeItems === 'center center' || result.placeItems === 'center', true);
    });

    await t.step('Container applies styles', async () => {
      await loadTestPage(ctx.page, {
        code: `
          const container = new Container({
            width: '100px',
            height: '100px',
            color: 'red',
            padding: '10px',
          });
          document.body.appendChild(container);
          (window as any).testContainer = container;
        `,
      });

      const result = await ctx.page.evaluate(() => {
        const container = (window as any).testContainer;
        return {
          width: container.style.width,
          height: container.style.height,
          backgroundColor: container.style.backgroundColor,
          padding: container.style.padding,
        };
      });

      assertEquals(result.width, '100px');
      assertEquals(result.height, '100px');
      assertEquals(result.backgroundColor, 'red');
      assertEquals(result.padding, '10px');
    });

    await t.step('MediaQuery updates on resize', async () => {
      await loadTestPage(ctx.page, {
        code: `
          import { MediaQuery } from "./src/layout/mod.ts";
          (window as any).MediaQuery = MediaQuery;
        `,
      });

      // Set to desktop size and check
      await ctx.page.setViewportSize({ width: 1024, height: 768 });

      // Trigger resize event
      await ctx.page.evaluate(() => {
        window.dispatchEvent(new Event('resize'));
      });

      // Small delay for resize handler
      await new Promise((r) => setTimeout(r, 50));

      const desktopResult = await ctx.page.evaluate(() => {
        const MQ = (window as any).MediaQuery;
        return {
          isDesktop: MQ.isDesktop(),
          isMobile: MQ.isMobile(),
        };
      });

      assertEquals(desktopResult.isDesktop, true);
      assertEquals(desktopResult.isMobile, false);

      // Change to mobile size
      await ctx.page.setViewportSize({ width: 500, height: 800 });

      await ctx.page.evaluate(() => {
        window.dispatchEvent(new Event('resize'));
      });

      await new Promise((r) => setTimeout(r, 50));

      const mobileResult = await ctx.page.evaluate(() => {
        const MQ = (window as any).MediaQuery;
        return {
          isDesktop: MQ.isDesktop(),
          isMobile: MQ.isMobile(),
        };
      });

      assertEquals(mobileResult.isDesktop, false);
      assertEquals(mobileResult.isMobile, true);
    });

    await t.step('Responsive renders correct child based on viewport', async () => {
      await loadTestPage(ctx.page, {
        code: `
          import { Responsive } from "./src/layout/mod.ts";

          const mobile = document.createElement('div');
          mobile.id = 'mobile';
          mobile.textContent = 'Mobile View';

          const desktop = document.createElement('div');
          desktop.id = 'desktop';
          desktop.textContent = 'Desktop View';

          const responsive = new Responsive({
            mobile,
            desktop,
          });

          document.body.appendChild(responsive);
          (window as any).testResponsive = responsive;
        `,
      });

      // Set to mobile viewport
      await ctx.page.setViewportSize({ width: 500, height: 800 });
      await ctx.page.evaluate(() => {
        window.dispatchEvent(new Event('resize'));
      });
      await new Promise((r) => setTimeout(r, 50));

      const mobileChild = await ctx.page.evaluate(() => {
        const responsive = (window as any).testResponsive;
        return responsive.firstElementChild?.id;
      });

      assertEquals(mobileChild, 'mobile');

      // Set to desktop viewport
      await ctx.page.setViewportSize({ width: 1200, height: 800 });
      await ctx.page.evaluate(() => {
        window.dispatchEvent(new Event('resize'));
      });
      await new Promise((r) => setTimeout(r, 50));

      const desktopChild = await ctx.page.evaluate(() => {
        const responsive = (window as any).testResponsive;
        return responsive.firstElementChild?.id;
      });

      assertEquals(desktopChild, 'desktop');
    });

    await t.step('LayoutBuilder provides constraints via ResizeObserver', async () => {
      await loadTestPage(ctx.page, {
        code: `
          import { LayoutBuilder } from "./src/layout/mod.ts";

          (window as any).capturedConstraints = null;

          const builder = new LayoutBuilder({
            builder: (constraints: any) => {
              (window as any).capturedConstraints = constraints;
              const div = document.createElement('div');
              div.textContent = \`\${constraints.width}x\${constraints.height}\`;
              return div;
            },
          });

          document.body.appendChild(builder);
          (window as any).testBuilder = builder;
        `,
      });

      // Wait for ResizeObserver to fire
      await new Promise((r) => setTimeout(r, 100));

      const result = await ctx.page.evaluate(() => {
        const constraints = (window as any).capturedConstraints;
        return constraints
          ? {
            hasConstraints: true,
            // Just check that we got numeric dimensions
            hasWidth: typeof constraints.width === 'number' && constraints.width > 0,
            hasHeight: typeof constraints.height === 'number' && constraints.height >= 0,
          }
          : {
            hasConstraints: false,
            hasWidth: false,
            hasHeight: false,
          };
      });

      assertEquals(result.hasConstraints, true);
      // ResizeObserver should capture some dimensions (actual values depend on viewport)
      assertEquals(result.hasWidth, true);
    });

    // Cleanup
    await teardownBrowser(ctx);
  },
});
