/**
 * Shadow DOM Tests (Playwright)
 *
 * Tests HTMLPropsMixin with Shadow DOM components.
 *
 * @module
 */

import { assert, assertEquals } from '@std/assert';
import { loadTestPage, setupBrowser, teardownBrowser, TEST_OPTIONS, type TestContext } from '../../test-utils/mod.ts';

let ctx: TestContext;

Deno.test({
  name: 'Shadow DOM Tests',
  ...TEST_OPTIONS,

  async fn(t) {
    // Setup browser once for all tests
    ctx = await setupBrowser();

    // --- Basic Functionality ---

    await t.step('initializes props', async () => {
      await loadTestPage(ctx.page, {
        code: `
          class ShadowHTMLElement extends HTMLElement {
            constructor() {
              super();
              this.attachShadow({ mode: "open" });
            }
          }

          class TestElement extends HTMLPropsMixin(ShadowHTMLElement, {
            count: prop(10),
            label: prop("hello"),
            active: prop(true),
          }) {
            render() {
              return [];
            }
          }

          customElements.define("test-init", TestElement);
          const el = new TestElement();
          (window as any).testElement = el;
        `,
      });

      const result = await ctx.page.evaluate(() => {
        const el = (window as any).testElement;
        return {
          count: el.count,
          label: el.label,
          active: el.active,
        };
      });

      assertEquals(result.count, 10);
      assertEquals(result.label, 'hello');
      assertEquals(result.active, true);
    });

    await t.step('updates props and renders', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          class ShadowHTMLElement extends HTMLElement {
            constructor() {
              super();
              this.attachShadow({ mode: "open" });
            }
          }

          let renderCount = 0;
          class TestElement extends HTMLPropsMixin(ShadowHTMLElement, {
            count: prop(0),
          }) {
            render() {
              renderCount++;
              return [\`Count: \${this.count}\`];
            }
          }

          customElements.define("test-render", TestElement);
          const el = new TestElement();
          el.connectedCallback();
          (window as any).testElement = el;
          (window as any).getRenderCount = () => renderCount;
        `,
      });

      const initial = await ctx.page.evaluate(() => {
        const el = (window as any).testElement;
        return {
          renderCount: (window as any).getRenderCount(),
          innerHTML: el.shadowRoot.innerHTML,
        };
      });

      assertEquals(initial.renderCount, 1);
      assertEquals(initial.innerHTML, 'Count: 0');

      const afterUpdate = await ctx.page.evaluate(() => {
        const el = (window as any).testElement;
        el.count = 5;
        return {
          renderCount: (window as any).getRenderCount(),
          innerHTML: el.shadowRoot.innerHTML,
        };
      });

      assertEquals(afterUpdate.renderCount, 2);
      assertEquals(afterUpdate.innerHTML, 'Count: 5');
    });

    await t.step('reflects props to attributes', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          class ShadowHTMLElement extends HTMLElement {
            constructor() {
              super();
              this.attachShadow({ mode: "open" });
            }
          }

          class TestElement extends HTMLPropsMixin(ShadowHTMLElement, {
            count: prop(0, { attribute: true }),
            active: prop(false, { attribute: true }),
          }) {
            render() {
              return [];
            }
          }

          customElements.define("test-reflect", TestElement);
          const el = new TestElement();
          el.connectedCallback();
          (window as any).testElement = el;
        `,
      });

      const result = await ctx.page.evaluate(() => {
        const el = (window as any).testElement;
        el.count = 5;
        const countAttr = el.getAttribute('count');

        el.active = true;
        const hasActiveTrue = el.hasAttribute('active');
        const activeAttrTrue = el.getAttribute('active');

        el.active = false;
        const hasActiveFalse = el.hasAttribute('active');

        return { countAttr, hasActiveTrue, activeAttrTrue, hasActiveFalse };
      });

      assertEquals(result.countAttr, '5');
      assertEquals(result.hasActiveTrue, true);
      assertEquals(result.activeAttrTrue, '');
      assertEquals(result.hasActiveFalse, false);
    });

    await t.step('updates props from attributes', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          class ShadowHTMLElement extends HTMLElement {
            constructor() {
              super();
              this.attachShadow({ mode: "open" });
            }
          }

          class TestElement extends HTMLPropsMixin(ShadowHTMLElement, {
            count: prop(0, { attribute: true }),
            label: prop("", { attribute: true }),
          }) {
            render() {
              return [];
            }
          }

          customElements.define("test-attr-update", TestElement);
          const el = new TestElement();
          el.connectedCallback();
          (window as any).testElement = el;
        `,
      });

      const result = await ctx.page.evaluate(() => {
        const el = (window as any).testElement;
        el.setAttribute('count', '10');
        el.setAttribute('label', 'test');
        return {
          count: el.count,
          label: el.label,
        };
      });

      assertEquals(result.count, 10);
      assertEquals(result.label, 'test');
    });

    await t.step('dispatches events', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          class ShadowHTMLElement extends HTMLElement {
            constructor() {
              super();
              this.attachShadow({ mode: "open" });
            }
          }

          class TestElement extends HTMLPropsMixin(ShadowHTMLElement, {
            count: prop(0, { event: "change" }),
          }) {
            render() {
              return [];
            }
          }

          customElements.define("test-events", TestElement);
          const el = new TestElement();

          let eventDetail = null;
          el.addEventListener("change", (e) => {
            eventDetail = e.detail;
          });

          el.count = 5;
          (window as any).eventDetail = eventDetail;
        `,
      });

      const eventDetail = await ctx.page.evaluate(() => (window as any).eventDetail);
      assertEquals(eventDetail, 5);
    });

    await t.step('define static method', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          class ShadowHTMLElement extends HTMLElement {
            constructor() {
              super();
              this.attachShadow({ mode: "open" });
            }
          }

          class TestElement extends HTMLPropsMixin(ShadowHTMLElement) {}

          const Result = TestElement.define("test-define", { extends: "div" });

          (window as any).result = {
            resultIsClass: Result === TestElement,
            isDefined: customElements.get("test-define") === TestElement,
          };
        `,
      });

      const result = await ctx.page.evaluate(() => (window as any).result);
      assertEquals(result.resultIsClass, true);
      assertEquals(result.isDefined, true);
    });

    await t.step('typed props', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          class ShadowHTMLElement extends HTMLElement {
            constructor() {
              super();
              this.attachShadow({ mode: "open" });
            }
          }

          const Base = HTMLPropsMixin(ShadowHTMLElement, {
            count: prop(0),
            label: prop("test"),
          });

          class TestEl extends Base {}

          customElements.define("test-typed", TestEl);
          const el = new TestEl();
          (window as any).testElement = el;
        `,
      });

      const result = await ctx.page.evaluate(() => {
        const el = (window as any).testElement;
        const initial = { count: el.count, label: el.label };
        el.count = 10;
        const updated = { count: el.count };
        return { initial, updated };
      });

      assertEquals(result.initial.count, 0);
      assertEquals(result.initial.label, 'test');
      assertEquals(result.updated.count, 10);
    });

    // --- Inheritance & Composition ---

    await t.step('inheritance', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          class ShadowHTMLElement extends HTMLElement {
            constructor() {
              super();
              this.attachShadow({ mode: "open" });
            }
          }

          class MyElement extends HTMLPropsMixin(ShadowHTMLElement, {
            text: prop("Default text"),
          }) {}

          class MyElementFromInheritance extends HTMLPropsMixin(MyElement, {
            text: "Default text from inheritance",
          }) {}

          customElements.define("my-element-legacy", MyElement);
          customElements.define("my-element-inheritance", MyElementFromInheritance);

          const element = new MyElement({ text: "Hello, World!" });
          const elementFromInheritance = new MyElementFromInheritance({
            text: "Hello, Inheritance!",
          });

          document.body.appendChild(element);
          document.body.appendChild(elementFromInheritance);

          (window as any).element = element;
          (window as any).elementFromInheritance = elementFromInheritance;
        `,
      });

      const result = await ctx.page.evaluate(() => {
        const element = (window as any).element;
        const elementFromInheritance = (window as any).elementFromInheritance;
        return {
          elementText: element.text,
          elementFromInheritanceText: elementFromInheritance.text,
        };
      });

      assertEquals(result.elementText, 'Hello, World!');
      assertEquals(result.elementFromInheritanceText, 'Hello, Inheritance!');
    });

    await t.step('nested inheritance', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          class ShadowHTMLElement extends HTMLElement {
            constructor() {
              super();
              this.attachShadow({ mode: "open" });
            }
          }

          class ParentElement extends HTMLPropsMixin(ShadowHTMLElement, {
            foo: { type: String, default: "" },
          }) {}

          customElements.define("parent-element", ParentElement);

          class ChildElement extends HTMLPropsMixin(ParentElement, {
            bar: { type: String, default: "" },
          }) {
            connectedCallback() {
              super.connectedCallback?.();
              this.textContent = this.bar;
            }
          }

          customElements.define("child-element", ChildElement);

          const element = new ChildElement({ foo: "Name", bar: "Alice" });
          document.body.appendChild(element);

          const defaultElement = new ChildElement();

          (window as any).element = element;
          (window as any).defaultElement = defaultElement;
        `,
      });

      const result = await ctx.page.evaluate(() => {
        const element = (window as any).element;
        const defaultElement = (window as any).defaultElement;
        return {
          bar: element.bar,
          foo: element.foo,
          textContent: element.textContent,
          defaultFoo: defaultElement.foo,
          defaultBar: defaultElement.bar,
        };
      });

      assertEquals(result.bar, 'Alice');
      assertEquals(result.foo, 'Name');
      assertEquals(result.textContent, 'Alice');
      assertEquals(result.defaultFoo, '');
      assertEquals(result.defaultBar, '');
    });

    // --- Built-ins ---

    await t.step('extends built-in element (direct)', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          const MyButton = HTMLPropsMixin(HTMLButtonElement);
          customElements.define("my-direct-button", MyButton, { extends: "button" });

          const element = new MyButton({ textContent: "Click me!" });
          document.body.appendChild(element);

          (window as any).element = element;
        `,
      });

      const result = await ctx.page.evaluate(() => {
        const element = (window as any).element;
        return {
          isHTMLButtonElement: element instanceof HTMLButtonElement,
          textContent: element.textContent,
        };
      });

      assertEquals(result.isHTMLButtonElement, true);
      assertEquals(result.textContent, 'Click me!');
    });

    await t.step('extends built-in element (class)', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          class MyButton extends HTMLPropsMixin(HTMLButtonElement) {}
          customElements.define("my-custom-button", MyButton, { extends: "button" });

          const element = new MyButton({
            textContent: "Click me!",
          });
          document.body.appendChild(element);

          (window as any).element = element;
        `,
      });

      const result = await ctx.page.evaluate(() => {
        const element = (window as any).element;
        return {
          isHTMLButtonElement: element instanceof HTMLButtonElement,
          textContent: element.textContent,
        };
      });

      assertEquals(result.isHTMLButtonElement, true);
      assertEquals(result.textContent, 'Click me!');
    });

    // --- Signals & Reactivity ---

    await t.step('signal support in props mapping', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          class ShadowHTMLElement extends HTMLElement {
            constructor() {
              super();
              this.attachShadow({ mode: "open" });
            }
          }

          class MyElement extends HTMLPropsMixin(ShadowHTMLElement, {
            text: { type: String, default: "" },
          }) {
            connectedCallback() {
              super.connectedCallback?.();
              this.textContent = this.text;
            }
          }

          customElements.define("my-signal-element", MyElement);

          const element = new MyElement({ text: "Original text" });
          document.body.appendChild(element);

          (window as any).element = element;
        `,
      });

      const result = await ctx.page.evaluate(() => {
        const element = (window as any).element;
        const initial = { text: element.text, textContent: element.textContent };
        element.text = 'New text';
        const updated = { text: element.text };
        return { initial, updated };
      });

      assertEquals(result.initial.text, 'Original text');
      assertEquals(result.initial.textContent, 'Original text');
      assertEquals(result.updated.text, 'New text');
    });

    await t.step('signal support with click handler', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          class ShadowHTMLElement extends HTMLElement {
            constructor() {
              super();
              this.attachShadow({ mode: "open" });
            }
          }

          class MyElement extends HTMLPropsMixin(ShadowHTMLElement, {
            text: { type: String, default: "" },
          }) {
            connectedCallback() {
              super.connectedCallback?.();
              this.textContent = this.text;
            }
          }

          customElements.define("my-signal-click-element", MyElement);

          const element = new MyElement({
            text: "Original text",
            onclick: (event) => {
              const el = event.currentTarget;
              el.text = "New text";
            },
          });

          document.body.appendChild(element);

          (window as any).element = element;
        `,
      });

      const result = await ctx.page.evaluate(() => {
        const element = (window as any).element;
        const before = { text: element.text, textContent: element.textContent };
        element.click();
        const after = { text: element.text, textContent: element.textContent };
        return { before, after };
      });

      assertEquals(result.before.text, 'Original text');
      assertEquals(result.before.textContent, 'Original text');
      assertEquals(result.after.text, 'New text');
      // textContent still has old value since it's set only in connectedCallback
      assertEquals(result.after.textContent, 'Original text');
    });

    await t.step('signal support with effect', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          class ShadowHTMLElement extends HTMLElement {
            constructor() {
              super();
              this.attachShadow({ mode: "open" });
            }
          }

          class MyElement extends HTMLPropsMixin(ShadowHTMLElement, {
            text: { type: String, default: "" },
          }) {
            connectedCallback() {
              super.connectedCallback?.();
              effect(() => {
                this.textContent = this.text;
              });
            }
          }

          customElements.define("my-signal-effect-element", MyElement);

          const element = new MyElement({
            text: "Original text",
            onclick: (event) => {
              const el = event.currentTarget;
              el.text = "New text";
            },
          });

          document.body.appendChild(element);

          (window as any).element = element;
        `,
      });

      const result = await ctx.page.evaluate(() => {
        const element = (window as any).element;
        const before = { text: element.text, textContent: element.textContent };
        element.click();
        const after = { text: element.text, textContent: element.textContent };
        return { before, after };
      });

      assertEquals(result.before.text, 'Original text');
      assertEquals(result.before.textContent, 'Original text');
      assertEquals(result.after.text, 'New text');
      assertEquals(result.after.textContent, 'New text');
    });

    // --- Refs ---

    await t.step('refs', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          class ShadowHTMLElement extends HTMLElement {
            constructor() {
              super();
              this.attachShadow({ mode: "open" });
            }
          }

          class MyButton extends HTMLPropsMixin(HTMLButtonElement) {}
          customElements.define("my-button-ref", MyButton, { extends: "button" });

          class MyElement extends HTMLPropsMixin(ShadowHTMLElement) {
            buttonRef = ref(null);

            render() {
              return new MyButton({
                ref: this.buttonRef,
                textContent: "Click me!",
                onclick: () => {
                  const btn = this.buttonRef.current;
                  if (btn) {
                    btn.textContent = "Clicked!";
                  }
                },
              });
            }
          }

          customElements.define("my-element-ref", MyElement);

          const element = new MyElement();
          document.body.appendChild(element);

          (window as any).element = element;
        `,
      });

      const result = await ctx.page.evaluate(() => {
        const element = (window as any).element;
        const button = element.buttonRef.current;
        const isButton = button instanceof HTMLButtonElement;
        const textBefore = button?.textContent;
        button?.click();
        const textAfter = button?.textContent;
        return { isButton, textBefore, textAfter };
      });

      assertEquals(result.isButton, true);
      assertEquals(result.textBefore, 'Click me!');
      assertEquals(result.textAfter, 'Clicked!');
    });

    // --- Lifecycle Safety ---

    await t.step('lifecycle safety - single level (baseline)', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          class ShadowHTMLElement extends HTMLElement {
            constructor() {
              super();
              this.attachShadow({ mode: "open" });
            }
          }

          let connectedCallCount = 0;

          class Widget extends HTMLPropsMixin(ShadowHTMLElement, {
            prop: { type: String, default: "" },
          }) {
            connectedCallback() {
              super.connectedCallback?.();
              connectedCallCount++;
            }
          }

          customElements.define("widget-single", Widget);

          const widget = new Widget({ prop: "test" });
          document.body.appendChild(widget);

          (window as any).widget = widget;
          (window as any).getConnectedCallCount = () => connectedCallCount;
        `,
      });

      const result = await ctx.page.evaluate(() => {
        return {
          connectedCallCount: (window as any).getConnectedCallCount(),
          prop: (window as any).widget.prop,
        };
      });

      assertEquals(result.connectedCallCount, 1);
      assertEquals(result.prop, 'test');
    });

    await t.step('lifecycle safety - multi-level inheritance', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          class ShadowHTMLElement extends HTMLElement {
            constructor() {
              super();
              this.attachShadow({ mode: "open" });
            }
          }

          let baseConnectCount = 0;
          let extendedConnectCount = 0;

          class BaseWidget extends HTMLPropsMixin(ShadowHTMLElement, {
            baseProp: { type: String, default: "" },
          }) {
            connectedCallback() {
              super.connectedCallback?.();
              baseConnectCount++;
            }
          }

          customElements.define("base-widget", BaseWidget);

          class ExtendedWidget extends HTMLPropsMixin(BaseWidget, {
            extendedProp: { type: String, default: "" },
          }) {
            connectedCallback() {
              super.connectedCallback?.();
              extendedConnectCount++;
            }
          }

          customElements.define("extended-widget", ExtendedWidget);

          const widget = new ExtendedWidget({
            baseProp: "base",
            extendedProp: "extended",
          });
          document.body.appendChild(widget);

          (window as any).widget = widget;
          (window as any).getBaseConnectCount = () => baseConnectCount;
          (window as any).getExtendedConnectCount = () => extendedConnectCount;
        `,
      });

      const result = await ctx.page.evaluate(() => {
        return {
          baseConnectCount: (window as any).getBaseConnectCount(),
          extendedConnectCount: (window as any).getExtendedConnectCount(),
          extendedProp: (window as any).widget.extendedProp,
        };
      });

      assertEquals(result.baseConnectCount, 1);
      assertEquals(result.extendedConnectCount, 1);
      assertEquals(result.extendedProp, 'extended');
    });

    await t.step('lifecycle safety - children should NOT reconnect', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          class ShadowHTMLElement extends HTMLElement {
            constructor() {
              super();
              this.attachShadow({ mode: "open" });
            }
          }

          let childConnectCount = 0;
          let childDisconnectCount = 0;

          class ChildElement extends HTMLPropsMixin(ShadowHTMLElement, {
            label: { type: String, default: "" },
          }) {
            connectedCallback() {
              super.connectedCallback?.();
              childConnectCount++;
            }

            disconnectedCallback() {
              super.disconnectedCallback?.();
              childDisconnectCount++;
            }
          }

          customElements.define("child-element-test", ChildElement);

          class BaseContainer extends HTMLPropsMixin(ShadowHTMLElement, {
            prop1: { type: String, default: "" },
          }) {}

          customElements.define("base-container", BaseContainer);

          class ExtendedContainer extends HTMLPropsMixin(BaseContainer, {
            prop2: { type: String, default: "" },
          }) {}

          customElements.define("extended-container", ExtendedContainer);

          const child = new ChildElement({ label: "test" });
          const container = new ExtendedContainer({
            prop1: "a",
            prop2: "b",
            content: [child],
          });

          document.body.appendChild(container);

          (window as any).child = child;
          (window as any).container = container;
          (window as any).getChildConnectCount = () => childConnectCount;
          (window as any).getChildDisconnectCount = () => childDisconnectCount;
        `,
      });

      const beforeRemove = await ctx.page.evaluate(() => {
        return {
          childConnectCount: (window as any).getChildConnectCount(),
          childDisconnectCount: (window as any).getChildDisconnectCount(),
          label: (window as any).child.label,
        };
      });

      assertEquals(beforeRemove.childConnectCount, 1);
      assertEquals(beforeRemove.childDisconnectCount, 0);
      assertEquals(beforeRemove.label, 'test');

      const afterRemove = await ctx.page.evaluate(() => {
        document.body.removeChild((window as any).container);
        return {
          childDisconnectCount: (window as any).getChildDisconnectCount(),
        };
      });

      assertEquals(afterRemove.childDisconnectCount, 1);
    });

    await t.step('lifecycle safety - deep inheritance chain (4 levels)', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          class ShadowHTMLElement extends HTMLElement {
            constructor() {
              super();
              this.attachShadow({ mode: "open" });
            }
          }

          class L1 extends HTMLPropsMixin(ShadowHTMLElement, {
            p1: { type: String, default: "" },
          }) {}
          customElements.define("level-1-element", L1);

          class L2 extends HTMLPropsMixin(L1, { p2: { type: String, default: "" } }) {}
          customElements.define("level-2-element", L2);

          class L3 extends HTMLPropsMixin(L2, { p3: { type: String, default: "" } }) {}
          customElements.define("level-3-element", L3);

          class L4 extends HTMLPropsMixin(L3, { p4: { type: String, default: "" } }) {}
          customElements.define("level-4-element", L4);

          const widget = new L4({ p1: "a", p2: "b", p3: "c", p4: "d" });
          document.body.appendChild(widget);

          (window as any).widget = widget;
          (window as any).L1 = L1;
          (window as any).L2 = L2;
          (window as any).L3 = L3;
          (window as any).L4 = L4;
        `,
      });

      const result = await ctx.page.evaluate(() => {
        const widget = (window as any).widget;
        return {
          p4: widget.p4,
          isL1: widget instanceof (window as any).L1,
          isL2: widget instanceof (window as any).L2,
          isL3: widget instanceof (window as any).L3,
          isL4: widget instanceof (window as any).L4,
        };
      });

      assertEquals(result.p4, 'd');
      assertEquals(result.isL1, true);
      assertEquals(result.isL2, true);
      assertEquals(result.isL3, true);
      assertEquals(result.isL4, true);
    });

    await t.step('lifecycle safety - effect cleanup preserved', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          class ShadowHTMLElement extends HTMLElement {
            constructor() {
              super();
              this.attachShadow({ mode: "open" });
            }
          }

          let effectRunCount = 0;
          let effectCleanupCount = 0;

          class ChildWithEffect extends HTMLPropsMixin(ShadowHTMLElement, {
            value: { type: String, default: "" },
          }) {
            connectedCallback() {
              super.connectedCallback?.();
              effect(() => {
                effectRunCount++;
                this.textContent = this.value;
                return () => {
                  effectCleanupCount++;
                };
              });
            }
          }

          customElements.define("child-with-effect", ChildWithEffect);

          class BaseContainer extends HTMLPropsMixin(ShadowHTMLElement, {
            prop1: { type: String, default: "" },
          }) {}

          customElements.define("base-container-effect", BaseContainer);

          class ExtendedContainer extends HTMLPropsMixin(BaseContainer, {
            prop2: { type: String, default: "" },
          }) {}

          customElements.define("extended-container-effect", ExtendedContainer);

          const child = new ChildWithEffect({ value: "initial" });
          const container = new ExtendedContainer({
            prop1: "a",
            prop2: "b",
            content: [child],
          });

          document.body.appendChild(container);

          (window as any).child = child;
          (window as any).container = container;
          (window as any).getEffectRunCount = () => effectRunCount;
          (window as any).getEffectCleanupCount = () => effectCleanupCount;
        `,
      });

      const initial = await ctx.page.evaluate(() => {
        return {
          effectRunCount: (window as any).getEffectRunCount(),
          effectCleanupCount: (window as any).getEffectCleanupCount(),
          textContent: (window as any).child.textContent,
        };
      });

      assertEquals(initial.effectRunCount, 1);
      assertEquals(initial.effectCleanupCount, 0);
      assertEquals(initial.textContent, 'initial');

      const afterUpdate = await ctx.page.evaluate(() => {
        (window as any).child.value = 'updated';
        return {
          effectRunCount: (window as any).getEffectRunCount(),
          textContent: (window as any).child.textContent,
        };
      });

      assertEquals(afterUpdate.effectRunCount, 2);
      assertEquals(afterUpdate.textContent, 'updated');
    });

    // --- Custom Update/Render ---

    await t.step('allows defining update for custom rendering', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          class ShadowHTMLElement extends HTMLElement {
            constructor() {
              super();
              this.attachShadow({ mode: "open" });
            }
          }

          let renderCount = 0;
          let updateCount = 0;

          class CustomRender extends HTMLPropsMixin(ShadowHTMLElement, {
            count: { type: Number, default: 0 },
          }) {
            render() {
              renderCount++;
              return document.createTextNode(\`Count: \${this.count}\`);
            }

            update() {
              updateCount++;
              const newContent = this.render();
              if (newContent.textContent !== \`Count: \${this.count}\`) {
                throw new Error("Content mismatch");
              }
              this.shadowRoot.firstChild.textContent = \`Count: \${this.count}\`;
            }
          }

          CustomRender.define("custom-render");
          const el = new CustomRender();
          document.body.appendChild(el);

          (window as any).el = el;
          (window as any).getRenderCount = () => renderCount;
          (window as any).getUpdateCount = () => updateCount;
        `,
      });

      const initial = await ctx.page.evaluate(() => {
        return {
          updateCount: (window as any).getUpdateCount(),
          renderCount: (window as any).getRenderCount(),
          innerHTML: (window as any).el.shadowRoot.innerHTML,
        };
      });

      assertEquals(initial.updateCount, 0);
      assertEquals(initial.renderCount, 1);
      assertEquals(initial.innerHTML, 'Count: 0');

      const afterUpdate = await ctx.page.evaluate(() => {
        (window as any).el.count = 1;
        return {
          updateCount: (window as any).getUpdateCount(),
          renderCount: (window as any).getRenderCount(),
          innerHTML: (window as any).el.shadowRoot.innerHTML,
        };
      });

      assertEquals(afterUpdate.updateCount, 1);
      assertEquals(afterUpdate.renderCount, 2);
      assertEquals(afterUpdate.innerHTML, 'Count: 1');
    });

    await t.step('reflection works with overridden update', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          class ShadowHTMLElement extends HTMLElement {
            constructor() {
              super();
              this.attachShadow({ mode: "open" });
            }
          }

          class ReflectedRender extends HTMLPropsMixin(ShadowHTMLElement, {
            active: { type: Boolean, attribute: true },
            label: { type: String, attribute: true },
          }) {
            update() {
              // Do nothing, completely override render
            }
          }

          ReflectedRender.define("reflected-render");
          const el = new ReflectedRender();
          document.body.appendChild(el);

          (window as any).el = el;
        `,
      });

      const result = await ctx.page.evaluate(() => {
        const el = (window as any).el;
        el.active = true;
        const hasActive = el.hasAttribute('active');
        el.label = 'test';
        const labelAttr = el.getAttribute('label');
        return { hasActive, labelAttr };
      });

      assertEquals(result.hasActive, true);
      assertEquals(result.labelAttr, 'test');
    });

    await t.step('allows calling defaultUpdate from update', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          class ShadowHTMLElement extends HTMLElement {
            constructor() {
              super();
              this.attachShadow({ mode: "open" });
            }
          }

          class DefaultUpdateRender extends HTMLPropsMixin(ShadowHTMLElement, {
            count: { type: Number, default: 0 },
          }) {
            render() {
              return document.createTextNode(\`Count: \${this.count}\`);
            }

            update() {
              if (this.count > 5) {
                this.shadowRoot.replaceChildren(document.createTextNode("Too high!"));
              } else {
                this.defaultUpdate();
              }
            }
          }

          DefaultUpdateRender.define("default-update-render");
          const el = new DefaultUpdateRender();
          document.body.appendChild(el);

          (window as any).el = el;
        `,
      });

      const initial = await ctx.page.evaluate(() => {
        return (window as any).el.shadowRoot.innerHTML;
      });
      assertEquals(initial, 'Count: 0');

      const afterLow = await ctx.page.evaluate(() => {
        (window as any).el.count = 4;
        return (window as any).el.shadowRoot.innerHTML;
      });
      assertEquals(afterLow, 'Count: 4');

      const afterHigh = await ctx.page.evaluate(() => {
        (window as any).el.count = 6;
        return (window as any).el.shadowRoot.innerHTML;
      });
      assertEquals(afterHigh, 'Too high!');

      const afterLowAgain = await ctx.page.evaluate(() => {
        (window as any).el.count = 2;
        return (window as any).el.shadowRoot.innerHTML;
      });
      assertEquals(afterLowAgain, 'Count: 2');
    });

    await t.step('requestUpdate triggers rerender', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          class ShadowHTMLElement extends HTMLElement {
            constructor() {
              super();
              this.attachShadow({ mode: "open" });
            }
          }

          let renderCount = 0;
          class ManualUpdate extends HTMLPropsMixin(ShadowHTMLElement) {
            render() {
              renderCount++;
              return document.createTextNode("test");
            }
          }
          ManualUpdate.define("manual-update");
          const el = new ManualUpdate();
          document.body.appendChild(el);

          (window as any).el = el;
          (window as any).getRenderCount = () => renderCount;
        `,
      });

      const initial = await ctx.page.evaluate(() => {
        return (window as any).getRenderCount();
      });
      assertEquals(initial, 1);

      const afterRequestUpdate = await ctx.page.evaluate(() => {
        (window as any).el.requestUpdate();
        return (window as any).getRenderCount();
      });
      assertEquals(afterRequestUpdate, 2);
    });

    // --- Content Filtering ---

    await t.step('filters null/undefined/boolean from content', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          class ShadowHTMLElement extends HTMLElement {
            constructor() {
              super();
              this.attachShadow({ mode: "open" });
            }
          }

          class TestContentElement extends HTMLPropsMixin(ShadowHTMLElement) {}
          TestContentElement.define("test-content-filter");

          const el = new TestContentElement({
            content: ["Hello", null, undefined, false, true, "World", 0],
          });
          el.connectedCallback();

          (window as any).el = el;
        `,
      });

      const result = await ctx.page.evaluate(() => {
        const el = (window as any).el;
        return {
          childNodesLength: el.childNodes.length,
          textContent: el.textContent,
        };
      });

      assertEquals(result.childNodesLength, 3);
      assertEquals(result.textContent, 'HelloWorld0');
    });

    await t.step('filters null/undefined/boolean from render', async () => {
      await ctx.page.reload();
      await loadTestPage(ctx.page, {
        code: `
          class ShadowHTMLElement extends HTMLElement {
            constructor() {
              super();
              this.attachShadow({ mode: "open" });
            }
          }

          class MyEl extends HTMLPropsMixin(ShadowHTMLElement) {
            render() {
              return ["Hello", null, undefined, false, true, "World", 0];
            }
          }
          MyEl.define("my-el-filter");

          const el = new MyEl();
          document.body.appendChild(el);

          (window as any).el = el;
        `,
      });

      const result = await ctx.page.evaluate(() => {
        const el = (window as any).el;
        return {
          childNodesLength: el.shadowRoot.childNodes.length,
          innerHTML: el.shadowRoot.innerHTML,
        };
      });

      assertEquals(result.childNodesLength, 3);
      assertEquals(result.innerHTML, 'HelloWorld0');
    });

    // Teardown
    await teardownBrowser(ctx);
  },
});
