/**
 * Content Rendering Specification Tests (Playwright)
 *
 * These tests validate docs/internal/content-rendering-spec.md
 *
 * @module
 */

import { assertEquals } from '@std/assert';
import { loadTestPage, setupBrowser, teardownBrowser, TEST_OPTIONS, type TestContext } from '../../test-utils/mod.ts';

let ctx: TestContext;

Deno.test({
  name: 'Content Rendering Tests',
  ...TEST_OPTIONS,

  async fn(t) {
    // Setup browser once for all tests
    ctx = await setupBrowser();

    // =============================================================================
    // Spec: Content prop maps to replaceChildren()
    // =============================================================================

    await t.step('content-prop: string maps to replaceChildren()', async () => {
      await loadTestPage(ctx.page, {
        code: `
          class SimpleWrapper extends HTMLPropsMixin(HTMLElement) {}
          SimpleWrapper.define("simple-wrapper");

          const el = new SimpleWrapper({ content: "Hello" });
          document.body.appendChild(el);

          (window as any).testElement = el;
        `,
      });

      const result = await ctx.page.evaluate(() => {
        const el = (window as any).testElement;
        return el.textContent;
      });

      assertEquals(result, 'Hello');
    });

    await t.step('content-prop: array maps to replaceChildren()', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          class SimpleWrapper extends HTMLPropsMixin(HTMLElement) {}
          SimpleWrapper.define("simple-wrapper-array");

          const el = new SimpleWrapper({
            content: ["Hello", " ", "World"],
          });
          document.body.appendChild(el);

          (window as any).testElement = el;
        `,
      });

      const result = await ctx.page.evaluate(() => {
        const el = (window as any).testElement;
        return el.textContent;
      });

      assertEquals(result, 'Hello World');
    });

    await t.step('content-prop: Node maps to replaceChildren()', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          class SimpleWrapper extends HTMLPropsMixin(HTMLElement) {}
          SimpleWrapper.define("simple-wrapper-node");

          const span = document.createElement("span");
          span.textContent = "Span content";

          const el = new SimpleWrapper({ content: span });
          document.body.appendChild(el);

          (window as any).testElement = el;
        `,
      });

      const result = await ctx.page.evaluate(() => {
        const el = (window as any).testElement;
        return {
          childrenLength: el.children.length,
          tagName: el.children[0]?.tagName,
          textContent: el.children[0]?.textContent,
        };
      });

      assertEquals(result.childrenLength, 1);
      assertEquals(result.tagName, 'SPAN');
      assertEquals(result.textContent, 'Span content');
    });

    // =============================================================================
    // Spec: Render target (host vs shadowRoot)
    // =============================================================================

    await t.step('render-target: without shadowRoot renders to host', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          class SimpleWrapper extends HTMLPropsMixin(HTMLElement) {}
          SimpleWrapper.define("simple-wrapper-host");

          const el = new SimpleWrapper({ content: "Host content" });
          document.body.appendChild(el);

          (window as any).testElement = el;
        `,
      });

      const result = await ctx.page.evaluate(() => {
        const el = (window as any).testElement;
        return {
          textContent: el.textContent,
          hasShadowRoot: el.shadowRoot !== null,
        };
      });

      assertEquals(result.textContent, 'Host content');
      assertEquals(result.hasShadowRoot, false);
    });

    await t.step('render-target: with shadowRoot renders to shadowRoot', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          class ShadowComponent extends HTMLPropsMixin(HTMLElement) {
            constructor(props) {
              super(props);
              this.attachShadow({ mode: "open" });
            }
            render() {
              return document.createTextNode("Shadow content");
            }
          }
          ShadowComponent.define("shadow-component");

          const el = new ShadowComponent();
          document.body.appendChild(el);

          (window as any).testElement = el;
        `,
      });

      const result = await ctx.page.evaluate(() => {
        const el = (window as any).testElement;
        return {
          shadowTextContent: el.shadowRoot?.textContent,
          childNodesLength: el.childNodes.length,
        };
      });

      assertEquals(result.shadowTextContent, 'Shadow content');
      assertEquals(result.childNodesLength, 0);
    });

    await t.step('render-target: render() component writes to shadowRoot', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          class RenderComponent extends HTMLPropsMixin(HTMLElement) {
            constructor(props) {
              super(props);
              this.attachShadow({ mode: "open" });
            }
            render() {
              return document.createTextNode("Rendered content");
            }
          }
          RenderComponent.define("render-component");

          const el = new RenderComponent();
          document.body.appendChild(el);

          (window as any).testElement = el;
        `,
      });

      const result = await ctx.page.evaluate(() => {
        const el = (window as any).testElement;
        return {
          shadowTextContent: el.shadowRoot?.textContent,
          childNodesLength: el.childNodes.length,
        };
      });

      assertEquals(result.shadowTextContent, 'Rendered content');
      assertEquals(result.childNodesLength, 0);
    });

    // =============================================================================
    // Spec: Content vs Render (different targets, no conflict)
    // =============================================================================

    await t.step('content vs render: both work together', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          class RenderComponent extends HTMLPropsMixin(HTMLElement) {
            constructor(props) {
              super(props);
              this.attachShadow({ mode: "open" });
            }
            render() {
              return document.createTextNode("Rendered content");
            }
          }
          RenderComponent.define("render-component-both");

          const el = new RenderComponent({ content: "Light DOM content" });
          document.body.appendChild(el);

          (window as any).testElement = el;
        `,
      });

      const result = await ctx.page.evaluate(() => {
        const el = (window as any).testElement;
        return {
          shadowTextContent: el.shadowRoot?.textContent,
          textContent: el.textContent,
        };
      });

      assertEquals(result.shadowTextContent, 'Rendered content');
      assertEquals(result.textContent, 'Light DOM content');
    });

    await t.step('content vs render: wrapper uses content', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          class SimpleWrapper extends HTMLPropsMixin(HTMLElement) {}
          SimpleWrapper.define("simple-wrapper-uses-content");

          const el = new SimpleWrapper({ content: "Wrapper content" });
          document.body.appendChild(el);

          (window as any).testElement = el;
        `,
      });

      const result = await ctx.page.evaluate(() => {
        const el = (window as any).testElement;
        return el.textContent;
      });

      assertEquals(result, 'Wrapper content');
    });

    await t.step('content vs render: explicit combination works', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          class ContentInRender extends HTMLPropsMixin(HTMLElement) {
            constructor(props) {
              super(props);
              this.attachShadow({ mode: "open" });
            }
            render() {
              const span = document.createElement("span");
              span.textContent = \`Prefix: \${this.content ?? ""}\`;
              return span;
            }
          }
          ContentInRender.define("content-in-render");

          const el = new ContentInRender({ content: "User content" });
          document.body.appendChild(el);

          (window as any).testElement = el;
        `,
      });

      const result = await ctx.page.evaluate(() => {
        const el = (window as any).testElement;
        return el.shadowRoot?.textContent;
      });

      assertEquals(result, 'Prefix: User content');
    });

    // =============================================================================
    // Spec: CE-spec and HTML upgrade
    // =============================================================================

    await t.step('html upgrade: preserves existing content if content not provided', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          class SimpleWrapper extends HTMLPropsMixin(HTMLElement) {}
          SimpleWrapper.define("simple-wrapper-upgrade");

          // Simulate HTML upgrade: element is in DOM before it gets upgraded
          const el = document.createElement("simple-wrapper-upgrade");
          el.textContent = "Existing content";
          document.body.appendChild(el);

          (window as any).testElement = el;
        `,
      });

      const result = await ctx.page.evaluate(() => {
        const el = (window as any).testElement;
        return el.textContent;
      });

      assertEquals(result, 'Existing content');
    });

    await t.step('html upgrade: content overwrites existing content', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          class SimpleWrapper extends HTMLPropsMixin(HTMLElement) {}
          SimpleWrapper.define("simple-wrapper-overwrite");

          const el = document.createElement("simple-wrapper-overwrite");
          el.textContent = "Existing content";
          document.body.appendChild(el);

          // Set content explicitly
          el.content = "New content";

          (window as any).testElement = el;
        `,
      });

      const result = await ctx.page.evaluate(() => {
        const el = (window as any).testElement;
        return el.textContent;
      });

      assertEquals(result, 'New content');
    });

    // =============================================================================
    // Spec: Content updates (setter)
    // =============================================================================

    await t.step('content-update: setter updates DOM', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          class SimpleWrapper extends HTMLPropsMixin(HTMLElement) {}
          SimpleWrapper.define("simple-wrapper-setter");

          const el = new SimpleWrapper({ content: "Initial" });
          document.body.appendChild(el);

          (window as any).testElement = el;
        `,
      });

      const initial = await ctx.page.evaluate(() => {
        const el = (window as any).testElement;
        return el.textContent;
      });

      assertEquals(initial, 'Initial');

      const updated = await ctx.page.evaluate(() => {
        const el = (window as any).testElement;
        el.content = 'Updated';
        return el.textContent;
      });

      assertEquals(updated, 'Updated');
    });

    // Teardown
    await teardownBrowser(ctx);
  },
});
