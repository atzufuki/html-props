/**
 * Nested Update Tests (Playwright)
 *
 * Tests that child components can update parent props in mountedCallback.
 *
 * @module
 */

import { assertEquals } from '@std/assert';
import { loadTestPage, setupBrowser, teardownBrowser, TEST_OPTIONS, type TestContext } from '../../test-utils/mod.ts';

let ctx: TestContext;

Deno.test({
  name: 'Nested Update Tests',
  ...TEST_OPTIONS,

  async fn(t) {
    // Setup browser once for all tests
    ctx = await setupBrowser();

    await t.step('child updating parent prop in mountedCallback should trigger parent re-render', async () => {
      await loadTestPage(ctx.page, {
        code: `
          let parentRenderCount = 0;
          let childMountedCalled = false;

          // Parent component (like Scaffold)
          class ParentComponent extends HTMLPropsMixin(HTMLElement, {
            loading: prop(false),
          }) {
            render() {
              parentRenderCount++;
              const div = document.createElement("div");
              div.dataset.key = "parent-content";
              div.textContent = \`Loading: \${this.loading}\`;

              // Create child component
              const child = new ChildComponent();
              child.parent = this;
              div.appendChild(child);

              return div;
            }
          }
          customElements.define("parent-component-nested-test", ParentComponent);

          // Child component (like AssetsPage)
          class ChildComponent extends HTMLPropsMixin(HTMLElement, {
            parent: prop<any>(null),
          }) {
            mountedCallback() {
              childMountedCalled = true;
              if (this.parent) {
                this.parent.loading = true;
                this.parent.requestUpdate();
              }
            }

            render() {
              return document.createTextNode("Child content");
            }
          }
          customElements.define("child-component-nested-test", ChildComponent);

          const parent = document.createElement("parent-component-nested-test");
          document.body.appendChild(parent);
          (window as any).testElement = parent;
          (window as any).getParentRenderCount = () => parentRenderCount;
          (window as any).getChildMountedCalled = () => childMountedCalled;
        `,
      });

      // Initial render should have happened (may be more than 1 due to microtask timing in real browser)
      const initialRenderCount = await ctx.page.evaluate(() => {
        return (window as any).getParentRenderCount();
      });
      assertEquals(initialRenderCount >= 1, true, 'Parent should have rendered at least once initially');

      // Wait for microtasks to process
      await ctx.page.evaluate(() => new Promise<void>((resolve) => queueMicrotask(() => resolve())));

      const childMountedCalled = await ctx.page.evaluate(() => {
        return (window as any).getChildMountedCalled();
      });
      assertEquals(childMountedCalled, true, 'Child mountedCallback should have been called');

      // Wait for another microtask
      await ctx.page.evaluate(() => new Promise<void>((resolve) => queueMicrotask(() => resolve())));

      // Parent should have re-rendered with loading=true
      const result = await ctx.page.evaluate(() => {
        const parent = (window as any).testElement;
        const content = parent.querySelector("[data-key='parent-content']");
        return {
          renderCount: (window as any).getParentRenderCount(),
          loading: parent.loading,
          textContent: content?.textContent,
        };
      });

      assertEquals(result.renderCount >= 2, true, 'Parent should have re-rendered after child set loading=true');
      assertEquals(result.loading, true, 'Parent loading prop should be true');
      assertEquals(result.textContent?.startsWith('Loading: true'), true, 'Parent should display loading state');
    });

    await t.step('multiple children updating parent should all be reflected', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          let parentRenderCount = 0;

          class MultiUpdateParent extends HTMLPropsMixin(HTMLElement, {
            counter: prop(0),
          }) {
            render() {
              parentRenderCount++;
              const div = document.createElement("div");
              div.dataset.key = "multi-parent";
              div.textContent = \`Counter: \${this.counter}\`;

              // Create multiple children that each increment counter
              for (let i = 0; i < 3; i++) {
                const child = new IncrementChild();
                child.parent = this;
                child.dataset.key = \`child-\${i}\`;
                div.appendChild(child);
              }

              return div;
            }
          }
          customElements.define("multi-update-parent-test", MultiUpdateParent);

          class IncrementChild extends HTMLPropsMixin(HTMLElement, {
            parent: prop<any>(null),
          }) {
            mountedCallback() {
              if (this.parent) {
                this.parent.counter = this.parent.counter + 1;
              }
            }

            render() {
              return null;
            }
          }
          customElements.define("increment-child-test", IncrementChild);

          const parent = document.createElement("multi-update-parent-test");
          document.body.appendChild(parent);
          (window as any).testElement = parent;
        `,
      });

      // Wait for all microtasks to process
      await ctx.page.evaluate(() => new Promise<void>((resolve) => queueMicrotask(() => resolve())));
      await ctx.page.evaluate(() => new Promise<void>((resolve) => queueMicrotask(() => resolve())));
      await ctx.page.evaluate(() => new Promise<void>((resolve) => queueMicrotask(() => resolve())));

      // Counter should have been incremented by all 3 children
      const counter = await ctx.page.evaluate(() => {
        return (window as any).testElement.counter;
      });

      assertEquals(counter, 3, 'Counter should be 3 after all children incremented it');
    });

    await t.step('deeply nested child updating ancestor should work', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          let grandparentRenderCount = 0;

          class GrandparentComponent extends HTMLPropsMixin(HTMLElement, {
            status: prop("initial"),
          }) {
            render() {
              grandparentRenderCount++;
              const div = document.createElement("div");
              div.dataset.key = "grandparent";
              div.textContent = \`Status: \${this.status}\`;

              const middleChild = new MiddleComponent();
              middleChild.grandparent = this;
              div.appendChild(middleChild);

              return div;
            }
          }
          customElements.define("grandparent-component-test", GrandparentComponent);

          class MiddleComponent extends HTMLPropsMixin(HTMLElement, {
            grandparent: prop<any>(null),
          }) {
            render() {
              const div = document.createElement("div");
              div.dataset.key = "middle";

              const deepChild = new DeepChildComponent();
              deepChild.grandparent = this.grandparent;
              div.appendChild(deepChild);

              return div;
            }
          }
          customElements.define("middle-component-test", MiddleComponent);

          class DeepChildComponent extends HTMLPropsMixin(HTMLElement, {
            grandparent: prop<any>(null),
          }) {
            mountedCallback() {
              if (this.grandparent) {
                this.grandparent.status = "updated-by-deep-child";
              }
            }

            render() {
              return document.createTextNode("Deep child");
            }
          }
          customElements.define("deep-child-component-test", DeepChildComponent);

          const grandparent = document.createElement("grandparent-component-test");
          document.body.appendChild(grandparent);
          (window as any).testElement = grandparent;
          (window as any).getGrandparentRenderCount = () => grandparentRenderCount;
        `,
      });

      const initialRenderCount = await ctx.page.evaluate(() => {
        return (window as any).getGrandparentRenderCount();
      });
      assertEquals(initialRenderCount >= 1, true, 'Grandparent should render at least once initially');

      // Wait for microtask to process the deferred update
      await ctx.page.evaluate(() => new Promise<void>((resolve) => queueMicrotask(() => resolve())));

      const result = await ctx.page.evaluate(() => {
        const grandparent = (window as any).testElement;
        return {
          status: grandparent.status,
          renderCount: (window as any).getGrandparentRenderCount(),
        };
      });

      assertEquals(result.status, 'updated-by-deep-child', 'Status should be updated by deep child');
      assertEquals(result.renderCount >= 2, true, 'Grandparent should have re-rendered');
    });

    await t.step('sibling component updating shared parent should work', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          let parentRenderCount = 0;

          class SharedParent extends HTMLPropsMixin(HTMLElement, {
            message: prop(""),
          }) {
            render() {
              parentRenderCount++;
              const div = document.createElement("div");
              div.dataset.key = "shared-parent";
              div.textContent = this.message;

              // Two sibling children
              const child1 = new SiblingChild();
              child1.parent = this;
              child1.contribution = "Hello";
              div.appendChild(child1);

              const child2 = new SiblingChild();
              child2.parent = this;
              child2.contribution = " World";
              div.appendChild(child2);

              return div;
            }
          }
          customElements.define("shared-parent-test", SharedParent);

          class SiblingChild extends HTMLPropsMixin(HTMLElement, {
            parent: prop<any>(null),
            contribution: prop(""),
          }) {
            mountedCallback() {
              if (this.parent) {
                this.parent.message = this.parent.message + this.contribution;
              }
            }

            render() {
              return null;
            }
          }
          customElements.define("sibling-child-test", SiblingChild);

          const parent = document.createElement("shared-parent-test");
          document.body.appendChild(parent);
          (window as any).testElement = parent;
        `,
      });

      // Wait for updates
      await ctx.page.evaluate(() => new Promise<void>((resolve) => queueMicrotask(() => resolve())));
      await ctx.page.evaluate(() => new Promise<void>((resolve) => queueMicrotask(() => resolve())));

      const message = await ctx.page.evaluate(() => {
        return (window as any).testElement.message;
      });

      assertEquals(message, 'Hello World', 'Message should be concatenated from both children');
    });

    // Teardown browser
    await teardownBrowser(ctx);
  },
});
