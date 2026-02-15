/**
 * Tests for built-in HTML element wrappers using Playwright.
 *
 * Tests run in a real browser via Playwright while using Deno.test() as the runner.
 *
 * Note: Built-ins use "customized built-in elements" pattern (extends: 'div', etc.)
 * In real browsers, these elements have:
 * - tagName = the base element's tagName (DIV, BUTTON, SPAN, etc.)
 * - outerHTML contains is="html-div", is="html-button", etc.
 * - getAttribute('is') may return null even though is attribute exists in outerHTML
 */

import { assertEquals } from 'jsr:@std/assert';
import { loadTestPage, setupBrowser, teardownBrowser, TEST_OPTIONS, type TestContext } from '../../test-utils/mod.ts';

let ctx: TestContext;

Deno.test({
  name: 'Built-ins Tests',
  ...TEST_OPTIONS,
  async fn(t) {
    ctx = await setupBrowser();

    await t.step('Div creates a customized built-in div element', async () => {
      await loadTestPage(ctx.page, {
        code: `
          const div = new Div({ className: 'test' });
          document.body.appendChild(div);
          (window as any).testDiv = div;
        `,
      });

      const result = await ctx.page.evaluate(() => {
        const div = (window as any).testDiv;
        return {
          tagName: div.tagName.toUpperCase(),
          outerHTML: div.outerHTML,
          className: div.getAttribute('class'),
        };
      });

      // Customized built-ins have base element's tagName
      assertEquals(result.tagName, 'DIV');
      assertEquals(result.outerHTML.includes('is="html-div"'), true);
      assertEquals(result.className, 'test');
    });

    await t.step('Button handles onclick', async () => {
      await loadTestPage(ctx.page, {
        code: `
          (window as any).clicked = false;
          const btn = new Button({
            onclick: () => { (window as any).clicked = true; },
          });
          document.body.appendChild(btn);
          (window as any).testBtn = btn;
        `,
      });

      // Check initial state and click
      const result = await ctx.page.evaluate(() => {
        const btn = (window as any).testBtn;
        const clickedBefore = (window as any).clicked;
        btn.click();
        const clickedAfter = (window as any).clicked;
        return {
          tagName: btn.tagName.toUpperCase(),
          outerHTML: btn.outerHTML,
          clickedBefore,
          clickedAfter,
        };
      });

      assertEquals(result.tagName, 'BUTTON');
      assertEquals(result.outerHTML.includes('is="html-button"'), true);
      assertEquals(result.clickedBefore, false);
      assertEquals(result.clickedAfter, true);
    });

    await t.step('Element handles style object', async () => {
      await loadTestPage(ctx.page, {
        code: `
          const span = new Span({
            style: { color: 'red', fontSize: '12px' },
          });
          document.body.appendChild(span);
          (window as any).testSpan = span;
        `,
      });

      const result = await ctx.page.evaluate(() => {
        const span = (window as any).testSpan;
        return {
          tagName: span.tagName.toUpperCase(),
          color: span.style.color,
          fontSize: span.style.fontSize,
        };
      });

      assertEquals(result.tagName, 'SPAN');
      assertEquals(result.color, 'red');
      assertEquals(result.fontSize, '12px');
    });

    await t.step('Element handles ref', async () => {
      await loadTestPage(ctx.page, {
        code: `
          const divRef = ref<any>();
          const div = new Div({ ref: divRef });
          document.body.appendChild(div);
          (window as any).divRef = divRef;
          (window as any).testDiv = div;
        `,
      });

      const refMatches = await ctx.page.evaluate(() => {
        return (window as any).divRef.current === (window as any).testDiv;
      });

      assertEquals(refMatches, true);
    });

    await t.step('Element handles content', async () => {
      await loadTestPage(ctx.page, {
        code: `
          const div = new Div({
            content: [
              new Span({ textContent: 'Hello' }),
              'World',
            ],
          });
          document.body.appendChild(div);
          (window as any).testDiv = div;
        `,
      });

      const result = await ctx.page.evaluate(() => {
        const div = (window as any).testDiv;
        const firstChild = div.childNodes[0] as Element;
        return {
          childCount: div.childNodes.length,
          firstChildTag: firstChild.tagName.toUpperCase(),
          firstChildOuterHTML: firstChild.outerHTML,
          secondChildText: div.childNodes[1].textContent,
        };
      });

      assertEquals(result.childCount, 2);
      assertEquals(result.firstChildTag, 'SPAN');
      assertEquals(result.firstChildOuterHTML.includes('is="html-span"'), true);
      assertEquals(result.secondChildText, 'World');
    });

    await t.step('Nested Mixin: CounterButton extends HTMLPropsMixin(Button)', async () => {
      await loadTestPage(ctx.page, {
        code: `
          class CounterButton extends HTMLPropsMixin(Button, {
            count: prop(0),
            label: prop('Count'),
          }) {
            render() {
              return document.createTextNode(\`\${this.label}: \${this.count}\`);
            }
          }

          CounterButton.define('counter-button-test', { extends: 'button' });

          const btn = new CounterButton({ count: 5, label: 'Clicks' });
          document.body.appendChild(btn);
          (window as any).testBtn = btn;
        `,
      });

      // Check initial state
      const initialState = await ctx.page.evaluate(() => {
        const btn = (window as any).testBtn as any;
        return {
          tagName: btn.tagName.toUpperCase(),
          outerHTML: btn.outerHTML,
          count: btn.count,
          label: btn.label,
          textContent: btn.textContent,
        };
      });

      // CounterButton is a customized built-in extending button
      assertEquals(initialState.tagName, 'BUTTON');
      assertEquals(initialState.outerHTML.includes('is="counter-button-test"'), true);
      assertEquals(initialState.count, 5);
      assertEquals(initialState.label, 'Clicks');
      assertEquals(initialState.textContent, 'Clicks: 5');

      // Update prop and check reactivity
      const afterUpdate = await ctx.page.evaluate(() => {
        const btn = (window as any).testBtn as any;
        btn.count = 6;
        return {
          textContent: btn.textContent,
        };
      });

      assertEquals(afterUpdate.textContent, 'Clicks: 6');

      // Check base props still work
      const styleResult = await ctx.page.evaluate(() => {
        const btn = (window as any).testBtn;
        btn.style.color = 'red';
        return btn.style.color;
      });

      assertEquals(styleResult, 'red');
    });

    // Cleanup
    await teardownBrowser(ctx);
  },
});
