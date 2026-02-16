/**
 * Tests for JSX runtime using Playwright.
 *
 * Tests run in a real browser via Playwright while using Deno.test() as the runner.
 */

import { assert, assertEquals } from 'jsr:@std/assert';
import { loadTestPage, setupBrowser, teardownBrowser, TEST_OPTIONS, type TestContext } from '../../test-utils/mod.ts';

let ctx: TestContext;

Deno.test({
  name: 'JSX Runtime Tests',
  ...TEST_OPTIONS,
  async fn(t) {
    ctx = await setupBrowser();

    // --- Fragment Tests ---

    await t.step('Fragment: returns children when content is undefined', async () => {
      await loadTestPage(ctx.page, {
        code: `
          import { Fragment } from "./src/jsx/jsx-runtime.ts";
          (window as any).result = Fragment({ children: 'Hello' });
        `,
      });

      const result = await ctx.page.evaluate(() => (window as any).result);
      assertEquals(result, 'Hello');
    });

    await t.step('Fragment: returns content when both content and children are defined', async () => {
      await loadTestPage(ctx.page, {
        code: `
          import { Fragment } from "./src/jsx/jsx-runtime.ts";
          (window as any).result = Fragment({ children: 'Hello', content: 'World' });
        `,
      });

      const result = await ctx.page.evaluate(() => (window as any).result);
      assertEquals(result, 'World');
    });

    await t.step('Fragment: returns undefined when no children or content', async () => {
      await loadTestPage(ctx.page, {
        code: `
          import { Fragment } from "./src/jsx/jsx-runtime.ts";
          (window as any).result = Fragment({});
        `,
      });

      const result = await ctx.page.evaluate(() => (window as any).result);
      assertEquals(result, undefined);
    });

    await t.step('Fragment: handles array of children', async () => {
      await loadTestPage(ctx.page, {
        code: `
          import { Fragment } from "./src/jsx/jsx-runtime.ts";
          const children = ['Hello', 'World'];
          (window as any).result = Fragment({ children });
        `,
      });

      const result = await ctx.page.evaluate(() => (window as any).result);
      assertEquals(result, ['Hello', 'World']);
    });

    // --- JSX Element Creation Tests ---

    await t.step('jsx: returns empty string for string type (native elements not supported)', async () => {
      await loadTestPage(ctx.page, {
        code: `
          import { jsx } from "./src/jsx/jsx-runtime.ts";
          (window as any).result = jsx('div', { className: 'test' });
        `,
      });

      const result = await ctx.page.evaluate(() => (window as any).result);
      assertEquals(result, '');
    });

    await t.step('jsx: creates instance from constructor with empty props', async () => {
      await loadTestPage(ctx.page, {
        code: `
          import { jsx } from "./src/jsx/jsx-runtime.ts";

          class TestElement extends HTMLPropsMixin(HTMLElement, {}) {}
          TestElement.define('jsx-test-1');

          const result = jsx(TestElement, {});
          (window as any).result = result;
          (window as any).isInstance = result instanceof TestElement;
        `,
      });

      const isInstance = await ctx.page.evaluate(() => (window as any).isInstance);
      assert(isInstance);
    });

    await t.step('jsx: creates instance from constructor and passes props', async () => {
      await loadTestPage(ctx.page, {
        code: `
          import { jsx } from "./src/jsx/jsx-runtime.ts";

          class TestElement extends HTMLPropsMixin(HTMLElement, {
            customClass: prop(''),
          }) {}
          TestElement.define('jsx-test-2');

          const result = jsx(TestElement, { customClass: 'my-class' });
          (window as any).result = result;
          (window as any).customClass = result.customClass;
          (window as any).isInstance = result instanceof TestElement;
        `,
      });

      const data = await ctx.page.evaluate(() => ({
        isInstance: (window as any).isInstance,
        customClass: (window as any).customClass,
      }));

      assert(data.isInstance);
      assertEquals(data.customClass, 'my-class');
    });

    await t.step('jsx: creates instance with children as content', async () => {
      await loadTestPage(ctx.page, {
        code: `
          import { jsx } from "./src/jsx/jsx-runtime.ts";

          class TestElement extends HTMLPropsMixin(HTMLElement, {}) {}
          TestElement.define('jsx-test-3');

          const result = jsx(TestElement, { children: 'Hello' });
          document.body.appendChild(result);
          (window as any).textContent = result.textContent;
          (window as any).isInstance = result instanceof TestElement;
        `,
      });

      const data = await ctx.page.evaluate(() => ({
        isInstance: (window as any).isInstance,
        textContent: (window as any).textContent,
      }));

      assert(data.isInstance);
      assertEquals(data.textContent, 'Hello');
    });

    await t.step('jsx: flattens array children', async () => {
      await loadTestPage(ctx.page, {
        code: `
          import { jsx } from "./src/jsx/jsx-runtime.ts";

          class TestElement extends HTMLPropsMixin(HTMLElement, {}) {}
          TestElement.define('jsx-test-4');

          const child1 = new Div({ textContent: 'Hello' });
          const child2 = new Div({ textContent: 'World' });
          const result = jsx(TestElement, { children: [child1, child2] });
          document.body.appendChild(result);

          (window as any).childrenLength = result.children.length;
          (window as any).firstChildText = result.children[0]?.textContent;
          (window as any).isInstance = result instanceof TestElement;
        `,
      });

      const data = await ctx.page.evaluate(() => ({
        isInstance: (window as any).isInstance,
        childrenLength: (window as any).childrenLength,
        firstChildText: (window as any).firstChildText,
      }));

      assert(data.isInstance);
      assertEquals(data.childrenLength, 2);
      assertEquals(data.firstChildText, 'Hello');
    });

    await t.step('jsx: handles children and other props together', async () => {
      await loadTestPage(ctx.page, {
        code: `
          import { jsx } from "./src/jsx/jsx-runtime.ts";

          class TestElement extends HTMLPropsMixin(HTMLElement, {
            customClass: prop(''),
            customId: prop(''),
          }) {}
          TestElement.define('jsx-test-5');

          const result = jsx(TestElement, {
            customClass: 'test-class',
            customId: 'test-id',
            children: 'Content',
          });
          document.body.appendChild(result);

          (window as any).customClass = result.customClass;
          (window as any).customId = result.customId;
          (window as any).textContent = result.textContent;
          (window as any).isInstance = result instanceof TestElement;
        `,
      });

      const data = await ctx.page.evaluate(() => ({
        isInstance: (window as any).isInstance,
        customClass: (window as any).customClass,
        customId: (window as any).customId,
        textContent: (window as any).textContent,
      }));

      assert(data.isInstance);
      assertEquals(data.customClass, 'test-class');
      assertEquals(data.customId, 'test-id');
      assertEquals(data.textContent, 'Content');
    });

    await t.step('jsx: uses Fragment component to return children array', async () => {
      await loadTestPage(ctx.page, {
        code: `
          import { jsx, Fragment } from "./src/jsx/jsx-runtime.ts";

          const span1 = new Span({ textContent: 'Hello' });
          const span2 = new Span({ textContent: 'World' });
          const result = jsx(Fragment, { children: [span1, span2] });

          (window as any).isArray = Array.isArray(result);
          (window as any).length = result.length;
        `,
      });

      const data = await ctx.page.evaluate(() => ({
        isArray: (window as any).isArray,
        length: (window as any).length,
      }));

      assertEquals(data.isArray, true);
      assertEquals(data.length, 2);
    });

    // --- JSX with HTMLPropsMixin Tests ---

    await t.step('jsx: creates custom element with props mixin', async () => {
      await loadTestPage(ctx.page, {
        code: `
          import { jsx } from "./src/jsx/jsx-runtime.ts";

          class MyButton extends HTMLPropsMixin(HTMLElement, {
            label: prop('Click me'),
            count: prop(0),
          }) {
            render() { return null; }
          }
          MyButton.define('jsx-my-button');

          const result = jsx(MyButton, { label: 'Hello', count: 42 });

          (window as any).label = result.label;
          (window as any).count = result.count;
          (window as any).isInstance = result instanceof MyButton;
        `,
      });

      const data = await ctx.page.evaluate(() => ({
        isInstance: (window as any).isInstance,
        label: (window as any).label,
        count: (window as any).count,
      }));

      assert(data.isInstance);
      assertEquals(data.label, 'Hello');
      assertEquals(data.count, 42);
    });

    await t.step('jsx: creates custom element with nested children', async () => {
      await loadTestPage(ctx.page, {
        code: `
          import { jsx } from "./src/jsx/jsx-runtime.ts";

          class MyButton extends HTMLPropsMixin(HTMLElement, {
            label: prop('Click me'),
          }) {
            render() { return null; }
          }
          MyButton.define('jsx-child-button');

          class MyContainer extends HTMLPropsMixin(HTMLElement, {
            myTitle: prop(''),
          }) {
            render() { return null; }
          }
          MyContainer.define('jsx-my-container');

          const innerButton = jsx(MyButton, { label: 'Inner' });
          const result = jsx(MyContainer, { myTitle: 'My Title', children: innerButton });
          document.body.appendChild(result);

          (window as any).myTitle = result.myTitle;
          (window as any).hasInnerButton = result.firstElementChild instanceof MyButton;
          (window as any).isInstance = result instanceof MyContainer;
        `,
      });

      const data = await ctx.page.evaluate(() => ({
        isInstance: (window as any).isInstance,
        myTitle: (window as any).myTitle,
        hasInnerButton: (window as any).hasInnerButton,
      }));

      assert(data.isInstance);
      assertEquals(data.myTitle, 'My Title');
      assert(data.hasInnerButton);
    });

    // --- JSX with Event Handlers ---

    await t.step('jsx: passes event handlers as props', async () => {
      await loadTestPage(ctx.page, {
        code: `
          import { jsx } from "./src/jsx/jsx-runtime.ts";

          class MyButton extends HTMLPropsMixin(HTMLElement, {
            customOnClick: prop<(() => void) | null>(null),
          }) {}
          MyButton.define('jsx-handler-test');

          const handleClick = () => { (window as any).clicked = true; };
          const result = jsx(MyButton, { customOnClick: handleClick });

          (window as any).hasHandler = typeof result.customOnClick === 'function';
          result.customOnClick();
        `,
      });

      const data = await ctx.page.evaluate(() => ({
        hasHandler: (window as any).hasHandler,
        clicked: (window as any).clicked,
      }));

      assert(data.hasHandler);
      assertEquals(data.clicked, true);
    });

    // --- JSX Style and Attribute Tests ---

    await t.step('jsx: passes style object as prop', async () => {
      await loadTestPage(ctx.page, {
        code: `
          import { jsx } from "./src/jsx/jsx-runtime.ts";

          class StyledElement extends HTMLPropsMixin(HTMLElement, {
            customStyle: prop<Record<string, string>>({}),
          }) {}
          StyledElement.define('jsx-styled-1');

          const style = { color: 'red', fontSize: '12px' };
          const result = jsx(StyledElement, { customStyle: style });

          (window as any).customStyle = result.customStyle;
        `,
      });

      const customStyle = await ctx.page.evaluate(() => (window as any).customStyle);
      assertEquals(customStyle, { color: 'red', fontSize: '12px' });
    });

    await t.step('jsx: handles multiple children in array', async () => {
      await loadTestPage(ctx.page, {
        code: `
          import { jsx } from "./src/jsx/jsx-runtime.ts";

          class Container extends HTMLPropsMixin(HTMLElement, {}) {}
          Container.define('jsx-multi-children');

          const children = [
            'Text',
            new Span({ textContent: 'Element' }),
            'More Text',
          ];
          const result = jsx(Container, { children });
          document.body.appendChild(result);

          (window as any).childNodesLength = result.childNodes.length;
        `,
      });

      const childNodesLength = await ctx.page.evaluate(() => (window as any).childNodesLength);
      assertEquals(childNodesLength, 3);
    });

    // --- JSX alias jsxs Tests ---

    await t.step('jsxs: is an alias for jsx', async () => {
      await loadTestPage(ctx.page, {
        code: `
          import { jsx, jsxs } from "./src/jsx/jsx-runtime.ts";
          (window as any).isAlias = jsx === jsxs;
        `,
      });

      const isAlias = await ctx.page.evaluate(() => (window as any).isAlias);
      assertEquals(isAlias, true);
    });

    await t.step('jsxs: works with constructor', async () => {
      await loadTestPage(ctx.page, {
        code: `
          import { jsxs } from "./src/jsx/jsx-runtime.ts";

          class TestElement extends HTMLPropsMixin(HTMLElement, {
            customClass: prop(''),
          }) {}
          TestElement.define('jsx-alias-test');

          const result = jsxs(TestElement, { customClass: 'test' });
          (window as any).customClass = result.customClass;
          (window as any).isInstance = result instanceof TestElement;
        `,
      });

      const data = await ctx.page.evaluate(() => ({
        isInstance: (window as any).isInstance,
        customClass: (window as any).customClass,
      }));

      assert(data.isInstance);
      assertEquals(data.customClass, 'test');
    });

    // --- Edge Cases ---

    await t.step('jsx: self-closing elements work', async () => {
      await loadTestPage(ctx.page, {
        code: `
          import { jsx } from "./src/jsx/jsx-runtime.ts";

          class TestElement extends HTMLPropsMixin(HTMLElement, {}) {}
          TestElement.define('jsx-self-closing');

          const result = jsx(TestElement, {});
          (window as any).isInstance = result instanceof TestElement;
        `,
      });

      const isInstance = await ctx.page.evaluate(() => (window as any).isInstance);
      assert(isInstance);
    });

    await t.step('jsx: elements with text content', async () => {
      await loadTestPage(ctx.page, {
        code: `
          import { jsx } from "./src/jsx/jsx-runtime.ts";

          class TestElement extends HTMLPropsMixin(HTMLElement, {}) {}
          TestElement.define('jsx-text-content');

          const result = jsx(TestElement, { children: 'Hello World' });
          document.body.appendChild(result);

          (window as any).textContent = result.textContent;
          (window as any).isInstance = result instanceof TestElement;
        `,
      });

      const data = await ctx.page.evaluate(() => ({
        isInstance: (window as any).isInstance,
        textContent: (window as any).textContent,
      }));

      assert(data.isInstance);
      assertEquals(data.textContent, 'Hello World');
    });

    await t.step('jsx: nested elements', async () => {
      await loadTestPage(ctx.page, {
        code: `
          import { jsx } from "./src/jsx/jsx-runtime.ts";

          class Outer extends HTMLPropsMixin(HTMLElement, {}) {}
          Outer.define('jsx-outer');

          const inner = new Div({});
          const result = jsx(Outer, { children: inner });
          document.body.appendChild(result);

          (window as any).isInstance = result instanceof Outer;
          (window as any).hasInnerDiv = result.firstElementChild?.tagName === 'DIV';
        `,
      });

      const data = await ctx.page.evaluate(() => ({
        isInstance: (window as any).isInstance,
        hasInnerDiv: (window as any).hasInnerDiv,
      }));

      assert(data.isInstance);
      assert(data.hasInnerDiv);
    });

    await t.step('jsx: multiple props', async () => {
      await loadTestPage(ctx.page, {
        code: `
          import { jsx } from "./src/jsx/jsx-runtime.ts";

          class TestElement extends HTMLPropsMixin(HTMLElement, {
            prop1: prop(''),
            prop2: prop(0),
            prop3: prop(false),
          }) {}
          TestElement.define('jsx-multi-props');

          const result = jsx(TestElement, { prop1: 'test', prop2: 123, prop3: true });

          (window as any).prop1 = result.prop1;
          (window as any).prop2 = result.prop2;
          (window as any).prop3 = result.prop3;
          (window as any).isInstance = result instanceof TestElement;
        `,
      });

      const data = await ctx.page.evaluate(() => ({
        isInstance: (window as any).isInstance,
        prop1: (window as any).prop1,
        prop2: (window as any).prop2,
        prop3: (window as any).prop3,
      }));

      assert(data.isInstance);
      assertEquals(data.prop1, 'test');
      assertEquals(data.prop2, 123);
      assertEquals(data.prop3, true);
    });

    await t.step('jsx: expression children (array)', async () => {
      await loadTestPage(ctx.page, {
        code: `
          import { jsx } from "./src/jsx/jsx-runtime.ts";

          class TestElement extends HTMLPropsMixin(HTMLElement, {}) {}
          TestElement.define('jsx-expr-children');

          const name = 'World';
          const result = jsx(TestElement, { children: ['Hello ', name] });
          document.body.appendChild(result);

          (window as any).textContent = result.textContent;
          (window as any).isInstance = result instanceof TestElement;
        `,
      });

      const data = await ctx.page.evaluate(() => ({
        isInstance: (window as any).isInstance,
        textContent: (window as any).textContent,
      }));

      assert(data.isInstance);
      assertEquals(data.textContent, 'Hello World');
    });

    // Cleanup
    await teardownBrowser(ctx);
  },
});
