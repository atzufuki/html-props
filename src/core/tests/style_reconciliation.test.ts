/**
 * Style Reconciliation Tests (Playwright)
 *
 * Tests that style values are properly cleared/preserved during morphing.
 *
 * @module
 */

import { assertEquals } from '@std/assert';
import { loadTestPage, setupBrowser, teardownBrowser, TEST_OPTIONS, type TestContext } from '../../test-utils/mod.ts';

let ctx: TestContext;

Deno.test({
  name: 'Style Reconciliation Tests',
  ...TEST_OPTIONS,

  async fn(t) {
    // Setup browser once for all tests
    ctx = await setupBrowser();

    await t.step('old style values should be cleared when not present in new render', async () => {
      await loadTestPage(ctx.page, {
        code: `
          // Inner container WITHOUT default styles
          class InnerContainer extends HTMLPropsMixin(HTMLElement, {}) {
            render() {
              return null;
            }
          }
          customElements.define("inner-container-style-test", InnerContainer);

          // Parent component that switches between loading and content states
          class LoadingComponent extends HTMLPropsMixin(HTMLElement, {
            isLoading: prop(true),
          }) {
            render() {
              if (this.isLoading) {
                return new InnerContainer({
                  dataset: { key: "container" },
                  style: {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "200px",
                  },
                });
              }

              return new InnerContainer({
                dataset: { key: "container" },
                style: {
                  maxWidth: "1200px",
                  margin: "0 auto",
                },
              });
            }
          }
          customElements.define("loading-component-style-test", LoadingComponent);

          // Create and mount the component
          const el = document.createElement("loading-component-style-test");
          document.body.appendChild(el);
          (window as any).testElement = el;
        `,
      });

      // Verify loading state styles
      const loadingStyles = await ctx.page.evaluate(() => {
        const container = document.querySelector('inner-container-style-test') as HTMLElement;
        return {
          display: container.style.display,
          alignItems: container.style.alignItems,
          justifyContent: container.style.justifyContent,
          minHeight: container.style.minHeight,
        };
      });

      assertEquals(loadingStyles.display, 'flex', 'Loading: display should be flex');
      assertEquals(loadingStyles.alignItems, 'center', 'Loading: alignItems should be center');
      assertEquals(loadingStyles.justifyContent, 'center', 'Loading: justifyContent should be center');
      assertEquals(loadingStyles.minHeight, '200px', 'Loading: minHeight should be 200px');

      // Switch to content state
      await ctx.page.evaluate(() => {
        (window as any).testElement.isLoading = false;
      });

      // Verify content state styles
      const contentStyles = await ctx.page.evaluate(() => {
        const container = document.querySelector('inner-container-style-test') as HTMLElement;
        return {
          display: container.style.display,
          alignItems: container.style.alignItems,
          justifyContent: container.style.justifyContent,
          minHeight: container.style.minHeight,
          maxWidth: container.style.maxWidth,
          margin: container.style.margin,
        };
      });

      assertEquals(contentStyles.maxWidth, '1200px', 'Content: maxWidth should be 1200px');
      assertEquals(contentStyles.margin, '0px auto', 'Content: margin should be 0px auto');
      assertEquals(contentStyles.display, '', 'Content: display should be cleared');
      assertEquals(contentStyles.alignItems, '', 'Content: alignItems should be cleared');
      assertEquals(contentStyles.justifyContent, '', 'Content: justifyContent should be cleared');
      assertEquals(contentStyles.minHeight, '', 'Content: minHeight should be cleared');
    });

    await t.step('switching between completely different style objects', async () => {
      // Get fresh page to avoid custom element name conflicts
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          class StyledBox extends HTMLPropsMixin(HTMLElement, {
            variant: prop<"A" | "B">("A"),
          }) {
            render() {
              if (this.variant === "A") {
                return new Div({
                  dataset: { key: "box" },
                  style: {
                    backgroundColor: "red",
                    padding: "10px",
                    border: "1px solid black",
                  },
                });
              }

              return new Div({
                dataset: { key: "box" },
                style: {
                  color: "blue",
                  margin: "20px",
                },
              });
            }
          }
          customElements.define("styled-box-test-2", StyledBox);

          const el = document.createElement("styled-box-test-2");
          document.body.appendChild(el);
          (window as any).testElement = el;
        `,
      });

      // Verify variant A styles
      const variantAStyles = await ctx.page.evaluate(() => {
        const box = document.querySelector('styled-box-test-2 div') as HTMLElement;
        return {
          backgroundColor: box.style.backgroundColor,
          padding: box.style.padding,
          border: box.style.border,
        };
      });

      assertEquals(variantAStyles.backgroundColor, 'red', 'Variant A: backgroundColor should be red');
      assertEquals(variantAStyles.padding, '10px', 'Variant A: padding should be 10px');
      assertEquals(variantAStyles.border, '1px solid black', 'Variant A: border should be set');

      // Switch to variant B
      await ctx.page.evaluate(() => {
        (window as any).testElement.variant = 'B';
      });

      // Verify variant B styles
      const variantBStyles = await ctx.page.evaluate(() => {
        const box = document.querySelector('styled-box-test-2 div') as HTMLElement;
        return {
          color: box.style.color,
          margin: box.style.margin,
          backgroundColor: box.style.backgroundColor,
          padding: box.style.padding,
          border: box.style.border,
        };
      });

      assertEquals(variantBStyles.color, 'blue', 'Variant B: color should be blue');
      assertEquals(variantBStyles.margin, '20px', 'Variant B: margin should be 20px');
      assertEquals(variantBStyles.backgroundColor, '', 'Variant B: backgroundColor should be cleared');
      assertEquals(variantBStyles.padding, '', 'Variant B: padding should be cleared');
      assertEquals(variantBStyles.border, '', 'Variant B: border should be cleared');
    });

    await t.step('styles set via props.style object should be clearable', async () => {
      // Get fresh page to avoid custom element name conflicts
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          class DynamicStyleComponent extends HTMLPropsMixin(HTMLElement, {
            showCentered: prop(true),
          }) {
            render() {
              if (this.showCentered) {
                return new Div({
                  dataset: { key: "dynamic-container" },
                  style: {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  },
                });
              }

              return new Div({
                dataset: { key: "dynamic-container" },
                style: {
                  display: "block",
                },
              });
            }
          }
          customElements.define("dynamic-style-component-test-2", DynamicStyleComponent);

          const el = document.createElement("dynamic-style-component-test-2");
          document.body.appendChild(el);
          (window as any).testElement = el;
        `,
      });

      // Verify centered state
      const centeredStyles = await ctx.page.evaluate(() => {
        const container = document.querySelector('dynamic-style-component-test-2 div') as HTMLElement;
        return {
          display: container.style.display,
          alignItems: container.style.alignItems,
          justifyContent: container.style.justifyContent,
        };
      });

      assertEquals(centeredStyles.display, 'flex');
      assertEquals(centeredStyles.alignItems, 'center');
      assertEquals(centeredStyles.justifyContent, 'center');

      // Switch to non-centered
      await ctx.page.evaluate(() => {
        (window as any).testElement.showCentered = false;
      });

      // Verify block state
      const blockStyles = await ctx.page.evaluate(() => {
        const container = document.querySelector('dynamic-style-component-test-2 div') as HTMLElement;
        return {
          display: container.style.display,
          alignItems: container.style.alignItems,
          justifyContent: container.style.justifyContent,
        };
      });

      assertEquals(blockStyles.display, 'block', 'Should be block');
      assertEquals(blockStyles.alignItems, '', 'alignItems should be cleared');
      assertEquals(blockStyles.justifyContent, '', 'justifyContent should be cleared');
    });

    await t.step('default styles from config should be preserved', async () => {
      // Get fresh page to avoid custom element name conflicts
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          // Simulate a layout component like Column that has default styles
          class ColumnLike extends HTMLPropsMixin(HTMLElement, {
            style: { display: "flex", flexDirection: "column" },
          }) {
            render() {
              return null;
            }
          }
          customElements.define("column-like-test-2", ColumnLike);

          // Parent that contains and may morph the ColumnLike
          class ParentComponent extends HTMLPropsMixin(HTMLElement, {
            count: prop(0),
          }) {
            render() {
              return new ColumnLike({
                dataset: { key: "column" },
                style: { gap: "16px" },
              });
            }
          }
          customElements.define("parent-component-default-style-test-2", ParentComponent);

          const el = document.createElement("parent-component-default-style-test-2");
          document.body.appendChild(el);
          (window as any).testElement = el;
        `,
      });

      // Verify initial styles (defaults + passed styles)
      const initialStyles = await ctx.page.evaluate(() => {
        const column = document.querySelector('column-like-test-2') as HTMLElement;
        return {
          display: column.style.display,
          flexDirection: column.style.flexDirection,
          gap: column.style.gap,
        };
      });

      assertEquals(initialStyles.display, 'flex', 'Initial: display should be flex (from defaults)');
      assertEquals(initialStyles.flexDirection, 'column', 'Initial: flexDirection should be column (from defaults)');
      assertEquals(initialStyles.gap, '16px', 'Initial: gap should be 16px');

      // Trigger a re-render
      await ctx.page.evaluate(() => {
        (window as any).testElement.count = 1;
      });

      // Verify styles are preserved after morph
      const afterMorphStyles = await ctx.page.evaluate(() => {
        const column = document.querySelector('column-like-test-2') as HTMLElement;
        return {
          display: column.style.display,
          flexDirection: column.style.flexDirection,
          gap: column.style.gap,
        };
      });

      assertEquals(afterMorphStyles.display, 'flex', 'After morph: display should still be flex');
      assertEquals(afterMorphStyles.flexDirection, 'column', 'After morph: flexDirection should still be column');
      assertEquals(afterMorphStyles.gap, '16px', 'After morph: gap should still be 16px');
    });

    await t.step('explicit style props should override and preserve defaults', async () => {
      // Get fresh page to avoid custom element name conflicts
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          // Component with default styles
          class BoxWithDefaults extends HTMLPropsMixin(HTMLElement, {
            style: { display: "block", boxSizing: "border-box" },
          }) {
            render() {
              return null;
            }
          }
          customElements.define("box-with-defaults-test-2", BoxWithDefaults);

          // Parent that passes additional styles
          class ParentWithStyles extends HTMLPropsMixin(HTMLElement, {
            useRed: prop(true),
          }) {
            render() {
              return new BoxWithDefaults({
                dataset: { key: "box" },
                style: this.useRed
                  ? { backgroundColor: "red", padding: "10px" }
                  : { backgroundColor: "blue", margin: "20px" },
              });
            }
          }
          customElements.define("parent-with-styles-test-2", ParentWithStyles);

          const el = document.createElement("parent-with-styles-test-2");
          document.body.appendChild(el);
          (window as any).testElement = el;
        `,
      });

      // Verify red state (defaults + custom)
      const redStyles = await ctx.page.evaluate(() => {
        const box = document.querySelector('box-with-defaults-test-2') as HTMLElement;
        return {
          display: box.style.display,
          boxSizing: box.style.boxSizing,
          backgroundColor: box.style.backgroundColor,
          padding: box.style.padding,
        };
      });

      assertEquals(redStyles.display, 'block', 'Default display should be block');
      assertEquals(redStyles.boxSizing, 'border-box', 'Default boxSizing should be border-box');
      assertEquals(redStyles.backgroundColor, 'red', 'Custom backgroundColor should be red');
      assertEquals(redStyles.padding, '10px', 'Custom padding should be 10px');

      // Switch to blue
      await ctx.page.evaluate(() => {
        (window as any).testElement.useRed = false;
      });

      // Verify blue state
      const blueStyles = await ctx.page.evaluate(() => {
        const box = document.querySelector('box-with-defaults-test-2') as HTMLElement;
        return {
          display: box.style.display,
          boxSizing: box.style.boxSizing,
          backgroundColor: box.style.backgroundColor,
          padding: box.style.padding,
          margin: box.style.margin,
        };
      });

      assertEquals(blueStyles.display, 'block', 'After switch: default display should still be block');
      assertEquals(blueStyles.boxSizing, 'border-box', 'After switch: default boxSizing should still be border-box');
      assertEquals(blueStyles.backgroundColor, 'blue', 'After switch: backgroundColor should be blue');
      assertEquals(blueStyles.margin, '20px', 'After switch: margin should be 20px');
      assertEquals(blueStyles.padding, '', 'After switch: padding should be cleared');
    });

    // Teardown browser
    await teardownBrowser(ctx);
  },
});
