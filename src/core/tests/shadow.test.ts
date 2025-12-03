import { assert, assertEquals } from 'jsr:@std/assert';
import { HTMLPropsMixin } from '../mixin.ts';
import type { PropsConfig } from '../types.ts';

import { parseHTML } from 'linkedom';
import { effect } from '@html-props/signals';
import { createRef } from '@html-props/core';

// Setup environment
if (!globalThis.document) {
  const {
    window,
    document,
    customElements,
    HTMLElement,
    HTMLButtonElement,
    Node,
    CustomEvent,
    Event,
    MutationObserver,
  } = parseHTML('<!DOCTYPE html><html><body></body></html>');

  const HTMLTableSectionElementPolyfill =
    (parseHTML('<!DOCTYPE html><html><body></body></html>') as any).HTMLTableSectionElement ||
    class HTMLTableSectionElement extends HTMLElement {};

  Object.assign(globalThis, {
    window,
    document,
    customElements,
    HTMLElement,
    HTMLButtonElement,
    HTMLTableSectionElement: HTMLTableSectionElementPolyfill,
    Node,
    CustomEvent,
    MutationObserver,
  });
}

const Event = (globalThis as any).window.Event;

// --- Shadow DOM Helpers ---

class ShadowHTMLElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }
}

// --- Basic Functionality ---

Deno.test('HTMLPropsMixin w/ shadow: initializes props', () => {
  class TestElement extends HTMLPropsMixin(ShadowHTMLElement, {
    count: { type: Number, default: 10 },
    label: { type: String, default: 'hello' },
    active: { type: Boolean, default: true },
  }) {
    render() {
      return [];
    }
  }

  customElements.define('test-init', TestElement);
  const el = new TestElement();
  assertEquals(el.count, 10);
  assertEquals(el.label, 'hello');
  assertEquals(el.active, true);
});

Deno.test('HTMLPropsMixin w/ shadow: updates props and renders', () => {
  let renderCount = 0;
  class TestElement extends HTMLPropsMixin(ShadowHTMLElement, {
    count: { type: Number, default: 0 },
  }) {
    render() {
      renderCount++;
      return [`Count: ${this.count}`];
    }
  }

  customElements.define('test-render', TestElement);
  const el = new TestElement();
  el.connectedCallback(); // Mount

  assertEquals(renderCount, 1); // Initial render
  assertEquals(el.shadowRoot!.innerHTML, 'Count: 0');

  el.count = 5;
  assertEquals(renderCount, 2);
  assertEquals(el.shadowRoot!.innerHTML, 'Count: 5');

  el.disconnectedCallback();
});

Deno.test('HTMLPropsMixin w/ shadow: reflects props to attributes', () => {
  class TestElement extends HTMLPropsMixin(ShadowHTMLElement, {
    count: { type: Number, default: 0, reflect: true },
    active: { type: Boolean, default: false, reflect: true },
  }) {
    render() {
      return [];
    }
  }

  customElements.define('test-reflect', TestElement);
  const el = new TestElement();
  el.connectedCallback();

  el.count = 5;
  assertEquals(el.getAttribute('count'), '5');

  el.active = true;
  assertEquals(el.hasAttribute('active'), true);
  assertEquals(el.getAttribute('active'), '');

  el.active = false;
  assertEquals(el.hasAttribute('active'), false);
});

Deno.test('HTMLPropsMixin w/ shadow: updates props from attributes', () => {
  class TestElement extends HTMLPropsMixin(ShadowHTMLElement, {
    count: { type: Number, default: 0, reflect: true },
    label: { type: String, default: '', reflect: true },
  }) {
    render() {
      return [];
    }
  }

  customElements.define('test-attr-update', TestElement);
  const el = new TestElement();
  el.connectedCallback();

  el.setAttribute('count', '10');
  assertEquals(el.count, 10);

  el.setAttribute('label', 'test');
  assertEquals(el.label, 'test');
});

Deno.test('HTMLPropsMixin w/ shadow: dispatches events', () => {
  class TestElement extends HTMLPropsMixin(ShadowHTMLElement, {
    count: { type: Number, default: 0, event: 'change' },
  }) {
    render() {
      return [];
    }
  }

  customElements.define('test-events', TestElement);
  const el = new TestElement();

  let eventDetail: any = null;
  el.addEventListener('change', (e: any) => {
    eventDetail = e.detail;
  });

  el.count = 5;

  assertEquals(eventDetail, 5);
});

Deno.test('HTMLPropsMixin w/ shadow: define static method', () => {
  class TestElement extends HTMLPropsMixin(ShadowHTMLElement) {}

  const Result = TestElement.define('test-define', { extends: 'div' });

  assertEquals(Result, TestElement);
  assertEquals(customElements.get('test-define'), TestElement);
});

Deno.test('HTMLPropsMixin w/ shadow: typed props', () => {
  const Base = HTMLPropsMixin(ShadowHTMLElement, {
    count: { type: Number, default: 0 },
    label: { type: String, default: 'test' },
  });

  class TestEl extends Base {}

  customElements.define('test-typed', TestEl);
  const el = new TestEl();
  assertEquals(el.count, 0);
  assertEquals(el.label, 'test');

  el.count = 10;
  assertEquals(el.count, 10);
});

// --- Inheritance & Composition ---

Deno.test('HTMLPropsMixin w/ shadow: inheritance', () => {
  class MyElement extends HTMLPropsMixin(ShadowHTMLElement, {
    text: { type: String, default: 'Default text' },
  }) {}

  class MyElementFromInheritance extends HTMLPropsMixin(MyElement, {
    // text is already defined in MyElement.
    // If we want to override the default, we should use direct value now?
    // Or if we want to redefine the prop config?
    // MyElement has 'text' property (string).
    // So 'text' in config must be string (direct value).
    // But here we are passing PropConfig.
    // This is what the user wanted to ban!
    // So this test is now invalid according to new rules.
    // We should change it to use direct default override.
    text: 'Default text from inheritance',
  }) {}

  customElements.define('my-element-legacy', MyElement);
  customElements.define('my-element-inheritance', MyElementFromInheritance);

  const element = new MyElement({ text: 'Hello, World!' });
  const elementFromInheritance = new MyElementFromInheritance({ text: 'Hello, Inheritance!' });

  document.body.appendChild(element);
  document.body.appendChild(elementFromInheritance);

  assert(element instanceof HTMLElement);
  assert(element instanceof MyElement);
  assertEquals(element.text, 'Hello, World!');

  assert(elementFromInheritance instanceof HTMLElement);
  assert(elementFromInheritance instanceof MyElementFromInheritance);
  assertEquals(elementFromInheritance.text, 'Hello, Inheritance!');
});

Deno.test('HTMLPropsMixin w/ shadow: nested inheritance', () => {
  class ParentElement extends HTMLPropsMixin(ShadowHTMLElement, {
    foo: { type: String, default: '' },
  }) {}

  customElements.define('parent-element', ParentElement);

  class ChildElement extends HTMLPropsMixin(ParentElement, {
    bar: { type: String, default: '' },
  }) {
    connectedCallback(): void {
      super.connectedCallback?.();
      this.textContent = this.bar;
    }
  }

  customElements.define('child-element', ChildElement);

  const element = new ChildElement({ foo: 'Name', bar: 'Alice' });
  document.body.appendChild(element);

  assertEquals(element.bar, 'Alice');
  assertEquals(element.foo, 'Name');
  assertEquals(element.textContent, 'Alice');
  assert(element instanceof HTMLElement);
  assert(element instanceof ParentElement);
  assert(element instanceof ChildElement);

  // Check defaults inheritance
  const defaultElement = new ChildElement();
  assertEquals(defaultElement.foo, '');
  assertEquals(defaultElement.bar, '');
});

// --- Built-ins ---

Deno.test('HTMLPropsMixin w/ shadow: extends built-in element (direct)', () => {
  const MyButton = HTMLPropsMixin(HTMLButtonElement);

  customElements.define('my-direct-button', MyButton, { extends: 'button' });

  const element = new MyButton({ textContent: 'Click me!' });

  document.body.appendChild(element);

  assert(element instanceof HTMLElement);
  assert(element instanceof HTMLButtonElement);
  assert(element instanceof MyButton);
  assertEquals(element.textContent, 'Click me!');
});

Deno.test('HTMLPropsMixin w/ shadow: extends built-in element (class)', () => {
  class MyButton extends HTMLPropsMixin(HTMLButtonElement) {}

  customElements.define('my-custom-button', MyButton, { extends: 'button' });

  const element = new MyButton({
    textContent: 'Click me!',
  });

  document.body.appendChild(element);

  assert(element instanceof HTMLElement);
  assert(element instanceof HTMLButtonElement);
  assert(element instanceof MyButton);

  assertEquals(element.textContent, 'Click me!');
});

// --- Signals & Reactivity ---

Deno.test('HTMLPropsMixin w/ shadow: signal support in props mapping', () => {
  class MyElement extends HTMLPropsMixin(ShadowHTMLElement, {
    text: { type: String, default: '' },
  }) {
    connectedCallback(): void {
      super.connectedCallback?.();
      this.textContent = this.text;
    }
  }

  customElements.define('my-signal-element', MyElement);

  const element = new MyElement({ text: 'Original text' });
  document.body.appendChild(element);

  assertEquals(element.text, 'Original text');
  assertEquals(element.textContent, 'Original text');

  element.text = 'New text';
  assertEquals(element.text, 'New text');
});

Deno.test('HTMLPropsMixin w/ shadow: signal support with click handler', () => {
  class MyElement extends HTMLPropsMixin(ShadowHTMLElement, {
    text: { type: String, default: '' },
  }) {
    connectedCallback(): void {
      super.connectedCallback?.();
      this.textContent = this.text;
    }
  }

  customElements.define('my-signal-click-element', MyElement);

  const element = new MyElement({
    text: 'Original text',
    onclick: (event: Event) => {
      const el = event.currentTarget as MyElement;
      el.text = 'New text';
    },
  });

  document.body.appendChild(element);

  assertEquals(element.text, 'Original text');
  assertEquals(element.textContent, 'Original text');

  element.click();

  assertEquals(element.text, 'New text');
});

Deno.test('HTMLPropsMixin w/ shadow: signal support with effect', () => {
  class MyElement extends HTMLPropsMixin(ShadowHTMLElement, {
    text: { type: String, default: '' },
  }) {
    connectedCallback(): void {
      super.connectedCallback?.();
      effect(() => {
        this.textContent = this.text;
      });
    }
  }

  customElements.define('my-signal-effect-element', MyElement);

  const element = new MyElement({
    text: 'Original text',
    onclick: (event: any) => {
      const el = event.currentTarget as MyElement;
      el.text = 'New text';
    },
  });

  document.body.appendChild(element);

  assertEquals(element.text, 'Original text');
  assertEquals(element.textContent, 'Original text');

  element.click();

  assertEquals(element.text, 'New text');
  assertEquals(element.textContent, 'New text');
});

// --- Refs ---

Deno.test('HTMLPropsMixin w/ shadow: refs', () => {
  class MyButton extends HTMLPropsMixin(HTMLButtonElement) {}
  customElements.define('my-button-ref', MyButton, { extends: 'button' });

  class MyElement extends HTMLPropsMixin(ShadowHTMLElement) {
    buttonRef = createRef<HTMLButtonElement>(null);

    render() {
      return new MyButton({
        ref: this.buttonRef,
        textContent: 'Click me!',
        onclick: () => {
          const btn = this.buttonRef.current;
          if (btn) {
            btn.textContent = 'Clicked!';
          }
        },
      });
    }
  }

  customElements.define('my-element-ref', MyElement);

  const element = new MyElement();
  // Trigger render
  element.connectedCallback();

  document.body.appendChild(element);
  const button = element.buttonRef.current;
  assert(button instanceof HTMLButtonElement);
  assertEquals(button?.textContent, 'Click me!');
  button?.click();
  assertEquals(button?.textContent, 'Clicked!');
});

// --- Lifecycle Safety ---

Deno.test('HTMLPropsMixin w/ shadow: lifecycle safety - single level (baseline)', () => {
  let connectedCallCount = 0;

  class Widget extends HTMLPropsMixin(ShadowHTMLElement, {
    prop: { type: String, default: '' },
  }) {
    connectedCallback() {
      super.connectedCallback?.();
      connectedCallCount++;
    }
  }

  customElements.define('widget-single', Widget);

  const widget = new Widget({ prop: 'test' });
  document.body.appendChild(widget);

  assertEquals(connectedCallCount, 1, 'connectedCallback should be called once');
  assertEquals(widget.prop, 'test');

  document.body.removeChild(widget);
});

Deno.test('HTMLPropsMixin w/ shadow: lifecycle safety - multi-level inheritance', () => {
  let baseConnectCount = 0;
  let extendedConnectCount = 0;

  class BaseWidget extends HTMLPropsMixin(ShadowHTMLElement, {
    baseProp: { type: String, default: '' },
  }) {
    connectedCallback() {
      super.connectedCallback?.();
      baseConnectCount++;
    }
  }

  customElements.define('base-widget', BaseWidget);

  class ExtendedWidget extends HTMLPropsMixin(BaseWidget, {
    extendedProp: { type: String, default: '' },
  }) {
    connectedCallback() {
      super.connectedCallback?.();
      extendedConnectCount++;
    }
  }

  customElements.define('extended-widget', ExtendedWidget);

  const widget = new ExtendedWidget({ baseProp: 'base', extendedProp: 'extended' });
  document.body.appendChild(widget);

  assertEquals(baseConnectCount, 1, 'BaseWidget connectedCallback should be called once');
  assertEquals(extendedConnectCount, 1, 'ExtendedWidget connectedCallback should be called once');
  assertEquals(widget.extendedProp, 'extended');

  document.body.removeChild(widget);
});

Deno.test('HTMLPropsMixin w/ shadow: lifecycle safety - children should NOT reconnect', () => {
  let childConnectCount = 0;
  let childDisconnectCount = 0;

  class ChildElement extends HTMLPropsMixin(ShadowHTMLElement, {
    label: { type: String, default: '' },
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

  customElements.define('child-element-test', ChildElement);

  class BaseContainer extends HTMLPropsMixin(ShadowHTMLElement, {
    prop1: { type: String, default: '' },
  }) {}

  customElements.define('base-container', BaseContainer);

  class ExtendedContainer extends HTMLPropsMixin(BaseContainer, {
    prop2: { type: String, default: '' },
  }) {}

  customElements.define('extended-container', ExtendedContainer);

  const child = new ChildElement({ label: 'test' });
  const container = new ExtendedContainer({
    prop1: 'a',
    prop2: 'b',
    content: [child],
  });

  document.body.appendChild(container);
  child.connectedCallback();

  assertEquals(childConnectCount, 1, 'Child should connect once');
  assertEquals(childDisconnectCount, 0, 'Child should NOT disconnect during parent connection');
  assertEquals(child.label, 'test');

  document.body.removeChild(container);
  child.disconnectedCallback();
  assertEquals(childDisconnectCount, 1, 'Child should disconnect once on removal');
});

Deno.test('HTMLPropsMixin w/ shadow: lifecycle safety - deep inheritance chain (4 levels)', () => {
  class L1 extends HTMLPropsMixin(ShadowHTMLElement, { p1: { type: String, default: '' } }) {}
  customElements.define('level-1-element', L1);

  class L2 extends HTMLPropsMixin(L1, { p2: { type: String, default: '' } }) {}
  customElements.define('level-2-element', L2);

  class L3 extends HTMLPropsMixin(L2, { p3: { type: String, default: '' } }) {}
  customElements.define('level-3-element', L3);

  class L4 extends HTMLPropsMixin(L3, { p4: { type: String, default: '' } }) {}
  customElements.define('level-4-element', L4);

  const widget = new L4({ p1: 'a', p2: 'b', p3: 'c', p4: 'd' });
  document.body.appendChild(widget);

  assertEquals(widget.p4, 'd');

  assert(widget instanceof L1);
  assert(widget instanceof L2);
  assert(widget instanceof L3);
  assert(widget instanceof L4);

  document.body.removeChild(widget);
});

Deno.test('HTMLPropsMixin w/ shadow: lifecycle safety - effect cleanup preserved', () => {
  let effectRunCount = 0;
  let effectCleanupCount = 0;

  class ChildWithEffect extends HTMLPropsMixin(ShadowHTMLElement, {
    value: { type: String, default: '' },
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

  customElements.define('child-with-effect', ChildWithEffect);

  class BaseContainer extends HTMLPropsMixin(ShadowHTMLElement, {
    prop1: { type: String, default: '' },
  }) {}

  customElements.define('base-container-effect', BaseContainer);

  class ExtendedContainer extends HTMLPropsMixin(BaseContainer, {
    prop2: { type: String, default: '' },
  }) {}

  customElements.define('extended-container-effect', ExtendedContainer);

  const child = new ChildWithEffect({ value: 'initial' });
  const container = new ExtendedContainer({
    prop1: 'a',
    prop2: 'b',
    content: [child],
  });

  document.body.appendChild(container);
  child.connectedCallback();

  // Effect should run once when child connects
  assertEquals(effectRunCount, 1, 'Effect should run once on connect');
  assertEquals(effectCleanupCount, 0, 'Effect should not cleanup if child stays connected');
  assertEquals(child.textContent, 'initial');

  // Update the signal
  child.value = 'updated';
  assertEquals(effectRunCount, 2, 'Effect should run again after signal update');
  assertEquals(child.textContent, 'updated');

  document.body.removeChild(container);
  child.disconnectedCallback();
});

Deno.test('HTMLPropsMixin w/ shadow: allows defining update for custom rendering', () => {
  let renderCount = 0;
  let updateCount = 0;

  class CustomRender extends HTMLPropsMixin(ShadowHTMLElement, {
    count: { type: Number, default: 0 },
  }) {
    render() {
      renderCount++;
      return document.createTextNode(`Count: ${this.count}`);
    }

    update() {
      updateCount++;
      // Manual update
      // Verify we got new content
      const newContent = this.render();
      if (newContent.textContent !== `Count: ${this.count}`) {
        throw new Error('Content mismatch');
      }
      this.shadowRoot!.firstChild!.textContent = `Count: ${this.count}`;
    }
  }

  CustomRender.define('custom-render');
  const el = new CustomRender();
  document.body.appendChild(el);
  // el.connectedCallback(); // Removed: document.body.appendChild triggers it

  // Initial render - update() should NOT be called
  assertEquals(updateCount, 0);
  assertEquals(renderCount, 1); // Default render logic called
  assertEquals(el.shadowRoot!.innerHTML, 'Count: 0');

  // Update prop
  el.count = 1;

  // update() called
  assertEquals(updateCount, 1);
  // render IS called again because the mixin calls it to pass to update()
  assertEquals(renderCount, 2);
  assertEquals(el.shadowRoot!.innerHTML, 'Count: 1');
});

Deno.test('HTMLPropsMixin w/ shadow: reflection works with overridden update', () => {
  class ReflectedRender extends HTMLPropsMixin(ShadowHTMLElement, {
    active: { type: Boolean, reflect: true },
    label: { type: String, reflect: true },
  }) {
    update() {
      // Do nothing, completely override render
    }
  }

  ReflectedRender.define('reflected-render');
  const el = new ReflectedRender();
  document.body.appendChild(el);

  el.active = true;
  assert(el.hasAttribute('active'));

  el.label = 'test';
  assertEquals(el.getAttribute('label'), 'test');
});

Deno.test('HTMLPropsMixin w/ shadow: allows calling defaultUpdate from update', () => {
  class DefaultUpdateRender extends HTMLPropsMixin(ShadowHTMLElement, {
    count: { type: Number, default: 0 },
  }) {
    render() {
      return document.createTextNode(`Count: ${this.count}`);
    }

    update() {
      // Do some custom logic
      if (this.count > 5) {
        this.shadowRoot!.replaceChildren(document.createTextNode('Too high!'));
      } else {
        // Fallback to default
        this.defaultUpdate();
      }
    }
  }

  DefaultUpdateRender.define('default-update-render');
  const el = new DefaultUpdateRender();
  document.body.appendChild(el);

  // Initial render
  assertEquals(el.shadowRoot!.innerHTML, 'Count: 0');

  // Update prop < 5
  el.count = 4;
  assertEquals(el.shadowRoot!.innerHTML, 'Count: 4');

  // Update prop > 5
  el.count = 6;
  assertEquals(el.shadowRoot!.innerHTML, 'Too high!');

  // Update prop < 5 again
  el.count = 2;
  assertEquals(el.shadowRoot!.innerHTML, 'Count: 2');
});

Deno.test('HTMLPropsMixin w/ shadow: requestUpdate triggers rerender', () => {
  let renderCount = 0;
  class ManualUpdate extends HTMLPropsMixin(ShadowHTMLElement) {
    render() {
      renderCount++;
      return document.createTextNode('test');
    }
  }
  ManualUpdate.define('manual-update');
  const el = new ManualUpdate();
  document.body.appendChild(el);

  assertEquals(renderCount, 1);

  el.requestUpdate();
  assertEquals(renderCount, 2);
});

Deno.test('HTMLPropsMixin w/ shadow: filters null/undefined/boolean from content', () => {
  class TestContentElement extends HTMLPropsMixin(ShadowHTMLElement) {}
  TestContentElement.define('test-content-filter');

  const el = new TestContentElement({
    content: ['Hello', null, undefined, false, true, 'World', 0],
  });

  assertEquals(el.childNodes.length, 3);
  assertEquals(el.textContent, 'HelloWorld0');
});

Deno.test('HTMLPropsMixin w/ shadow: filters null/undefined/boolean from render', () => {
  class MyEl extends HTMLPropsMixin(ShadowHTMLElement) {
    render() {
      return ['Hello', null, undefined, false, true, 'World', 0];
    }
  }
  MyEl.define('my-el-filter');

  const el = new MyEl();
  document.body.appendChild(el); // Trigger connectedCallback -> render

  assertEquals(el.shadowRoot!.childNodes.length, 3);
  assertEquals(el.shadowRoot!.innerHTML, 'HelloWorld0');
});
