import { assert, assertEquals } from 'jsr:@std/assert';
import { HTMLPropsMixin } from '../mixin.ts';
import { prop } from '../prop.ts';
import type { PropsConfig } from '../types.ts';

import { Window } from 'happy-dom';
import { effect } from '@html-props/signals';
import { ref } from '@html-props/core';

// Setup environment with happy-dom
if (!globalThis.document) {
  const happyWindow = new Window();

  // deno-lint-ignore no-explicit-any
  const w = happyWindow as any;

  Object.assign(globalThis, {
    window: happyWindow,
    document: w.document,
    customElements: w.customElements,
    HTMLElement: w.HTMLElement,
    HTMLButtonElement: w.HTMLButtonElement || w.HTMLElement,
    HTMLTableSectionElement: w.HTMLTableSectionElement || w.HTMLElement,
    Node: w.Node,
    CustomEvent: w.CustomEvent,
    MutationObserver: w.MutationObserver,
  });
}

// deno-lint-ignore no-explicit-any
const Event = (globalThis as any).window.Event;

// --- Basic Functionality ---

Deno.test('HTMLPropsMixin: initializes props', () => {
  class TestElement extends HTMLPropsMixin(HTMLElement, {
    count: prop(10),
    label: prop('hello'),
    active: prop(true),
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

Deno.test('HTMLPropsMixin: updates props and renders', () => {
  let renderCount = 0;
  class TestElement extends HTMLPropsMixin(HTMLElement, {
    count: prop(0),
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
  assertEquals(el.textContent, 'Count: 0');

  el.count = 5;
  assertEquals(renderCount, 2);
  assertEquals(el.textContent, 'Count: 5');

  el.disconnectedCallback();
});

Deno.test('HTMLPropsMixin: reflects props to attributes', () => {
  class TestElement extends HTMLPropsMixin(HTMLElement, {
    count: prop(0, { attribute: true }),
    active: prop(false, { attribute: true }),
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

Deno.test('HTMLPropsMixin: updates props from attributes', () => {
  class TestElement extends HTMLPropsMixin(HTMLElement, {
    count: prop(0, { attribute: true }),
    label: prop('', { attribute: true }),
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

Deno.test('HTMLPropsMixin: dispatches events', () => {
  class TestElement extends HTMLPropsMixin(HTMLElement, {
    count: prop(0, { event: 'change' }),
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

Deno.test('HTMLPropsMixin: event listener via prop with event config', () => {
  class TestElement extends HTMLPropsMixin(HTMLElement, {
    // deno-lint-ignore no-explicit-any
    onCustomEvent: prop<((e: Event) => void) | undefined>(undefined, { event: 'custom-event' }),
  }) {
    render() {
      return [];
    }
  }

  customElements.define('test-event-listener', TestElement);

  let eventReceived = false;
  let eventTarget: EventTarget | null = null;

  const el = new TestElement({
    onCustomEvent: (e: Event) => {
      eventReceived = true;
      eventTarget = e.target;
    },
  });

  document.body.appendChild(el);

  // Dispatch custom event
  el.dispatchEvent(new Event('custom-event'));

  assertEquals(eventReceived, true);
  assertEquals(eventTarget, el);

  document.body.removeChild(el);
});

Deno.test('HTMLPropsMixin: event listener updates when prop changes', () => {
  class TestElement extends HTMLPropsMixin(HTMLElement, {
    // deno-lint-ignore no-explicit-any
    onCustomEvent: prop<((e: Event) => void) | undefined>(undefined, { event: 'custom-event' }),
  }) {
    render() {
      return [];
    }
  }

  customElements.define('test-event-listener-update', TestElement);

  let callCount1 = 0;
  let callCount2 = 0;

  const el = new TestElement({
    onCustomEvent: () => {
      callCount1++;
    },
  });

  document.body.appendChild(el);

  // First handler should be called
  el.dispatchEvent(new Event('custom-event'));
  assertEquals(callCount1, 1);
  assertEquals(callCount2, 0);

  // Update handler
  el.onCustomEvent = () => {
    callCount2++;
  };

  // Second handler should be called now
  el.dispatchEvent(new Event('custom-event'));
  assertEquals(callCount1, 1);
  assertEquals(callCount2, 1);

  document.body.removeChild(el);
});

Deno.test('HTMLPropsMixin: event listener cleanup on disconnect', () => {
  class TestElement extends HTMLPropsMixin(HTMLElement, {
    // deno-lint-ignore no-explicit-any
    onCustomEvent: prop<((e: Event) => void) | undefined>(undefined, { event: 'custom-event' }),
  }) {
    render() {
      return [];
    }
  }

  customElements.define('test-event-listener-cleanup', TestElement);

  let callCount = 0;

  const el = new TestElement({
    onCustomEvent: () => {
      callCount++;
    },
  });

  document.body.appendChild(el);

  // Handler should be called when connected
  el.dispatchEvent(new Event('custom-event'));
  assertEquals(callCount, 1);

  // Disconnect
  document.body.removeChild(el);

  // Handler should NOT be called when disconnected
  el.dispatchEvent(new Event('custom-event'));
  assertEquals(callCount, 1);

  // Reconnect
  document.body.appendChild(el);

  // Handler should be called again
  el.dispatchEvent(new Event('custom-event'));
  assertEquals(callCount, 2);

  document.body.removeChild(el);
});

Deno.test('HTMLPropsMixin: define static method', () => {
  class TestElement extends HTMLPropsMixin(HTMLElement) {}

  const Result = TestElement.define('test-define', { extends: 'div' });

  assertEquals(Result, TestElement);
  assertEquals(customElements.get('test-define'), TestElement);
});

Deno.test('HTMLPropsMixin: typed props', () => {
  const Base = HTMLPropsMixin(HTMLElement, {
    count: prop(0),
    label: prop('test'),
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

Deno.test('HTMLPropsMixin: inheritance', () => {
  class MyElement extends HTMLPropsMixin(HTMLElement, {
    text: prop('Default text'),
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

Deno.test('HTMLPropsMixin: nested inheritance', () => {
  class ParentElement extends HTMLPropsMixin(HTMLElement, {
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

Deno.test('HTMLPropsMixin: extends built-in element (direct)', () => {
  const MyButton = HTMLPropsMixin(HTMLButtonElement);

  customElements.define('my-direct-button', MyButton, { extends: 'button' });

  const element = new MyButton({ textContent: 'Click me!' });

  document.body.appendChild(element);

  assert(element instanceof HTMLElement);
  assert(element instanceof HTMLButtonElement);
  assert(element instanceof MyButton);
  assertEquals(element.textContent, 'Click me!');
});

Deno.test('HTMLPropsMixin: extends built-in element (class)', () => {
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

Deno.test('HTMLPropsMixin: signal support in props mapping', () => {
  class MyElement extends HTMLPropsMixin(HTMLElement, {
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

Deno.test('HTMLPropsMixin: signal support with click handler', () => {
  class MyElement extends HTMLPropsMixin(HTMLElement, {
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

Deno.test('HTMLPropsMixin: signal support with effect', () => {
  class MyElement extends HTMLPropsMixin(HTMLElement, {
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

Deno.test('HTMLPropsMixin: refs', () => {
  class MyButton extends HTMLPropsMixin(HTMLButtonElement) {}
  customElements.define('my-button-ref', MyButton, { extends: 'button' });

  class MyElement extends HTMLPropsMixin(HTMLElement) {
    buttonRef = ref<HTMLButtonElement>(null);

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

  // Verify ref cleanup on unmount
  document.body.removeChild(element);
  assertEquals(element.buttonRef.current, null);
});

Deno.test('HTMLPropsMixin: function refs', () => {
  class MyButton extends HTMLPropsMixin(HTMLButtonElement) {}
  customElements.define('my-button-ref-fn', MyButton, { extends: 'button' });

  let capturedEl: any = null;

  class MyElement extends HTMLPropsMixin(HTMLElement) {
    render() {
      return new MyButton({
        ref: (el) => {
          capturedEl = el;
        },
        textContent: 'Click me!',
      });
    }
  }

  customElements.define('my-element-ref-fn', MyElement);

  const element = new MyElement();
  document.body.appendChild(element);

  // So capturedEl should be set.

  assert(capturedEl);
  if (capturedEl) {
    assert(capturedEl instanceof HTMLButtonElement);
    assertEquals(capturedEl.textContent, 'Click me!');
  }
});

// --- Lifecycle Safety ---

Deno.test('HTMLPropsMixin: lifecycle safety - single level (baseline)', () => {
  let connectedCallCount = 0;

  class Widget extends HTMLPropsMixin(HTMLElement, {
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

Deno.test('HTMLPropsMixin: lifecycle safety - multi-level inheritance', () => {
  let baseConnectCount = 0;
  let extendedConnectCount = 0;

  class BaseWidget extends HTMLPropsMixin(HTMLElement, {
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

Deno.test('HTMLPropsMixin: lifecycle safety - children should NOT reconnect', () => {
  let childConnectCount = 0;
  let childDisconnectCount = 0;

  class ChildElement extends HTMLPropsMixin(HTMLElement, {
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

  class BaseContainer extends HTMLPropsMixin(HTMLElement, {
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

  assertEquals(childConnectCount, 1, 'Child should connect once');
  assertEquals(childDisconnectCount, 0, 'Child should NOT disconnect during parent connection');
  assertEquals(child.label, 'test');

  document.body.removeChild(container);
  assertEquals(childDisconnectCount, 1, 'Child should disconnect once on removal');
});

Deno.test('HTMLPropsMixin: lifecycle safety - deep inheritance chain (4 levels)', () => {
  class L1 extends HTMLPropsMixin(HTMLElement, { p1: { type: String, default: '' } }) {}
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

Deno.test('HTMLPropsMixin: lifecycle safety - effect cleanup preserved', () => {
  let effectRunCount = 0;
  let effectCleanupCount = 0;

  class ChildWithEffect extends HTMLPropsMixin(HTMLElement, {
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

  class BaseContainer extends HTMLPropsMixin(HTMLElement, {
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

  // Effect should run once when child connects
  assertEquals(effectRunCount, 1, 'Effect should run once on connect');
  assertEquals(effectCleanupCount, 0, 'Effect should not cleanup if child stays connected');
  assertEquals(child.textContent, 'initial');

  // Update the signal
  child.value = 'updated';
  assertEquals(effectRunCount, 2, 'Effect should run again after signal update');
  assertEquals(child.textContent, 'updated');

  document.body.removeChild(container);
});

Deno.test('HTMLPropsMixin: allows defining update for custom rendering', () => {
  let renderCount = 0;
  let updateCount = 0;

  class CustomRender extends HTMLPropsMixin(HTMLElement, {
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
      this.firstChild!.textContent = `Count: ${this.count}`;
    }
  }

  CustomRender.define('custom-render');
  const el = new CustomRender();
  document.body.appendChild(el);

  // Initial render - update() should NOT be called
  assertEquals(updateCount, 0);
  assertEquals(renderCount, 1); // Default render logic called
  assertEquals(el.textContent, 'Count: 0');

  // Update prop
  el.count = 1;

  // update() called
  assertEquals(updateCount, 1);
  // render IS called again because the mixin calls it to pass to update()
  assertEquals(renderCount, 2);
  assertEquals(el.textContent, 'Count: 1');
});

Deno.test('HTMLPropsMixin: reflection works with overridden update', () => {
  class ReflectedRender extends HTMLPropsMixin(HTMLElement, {
    active: { type: Boolean, attribute: true },
    label: { type: String, attribute: true },
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

Deno.test('HTMLPropsMixin: allows calling defaultUpdate from update', () => {
  class DefaultUpdateRender extends HTMLPropsMixin(HTMLElement, {
    count: { type: Number, default: 0 },
  }) {
    render() {
      return document.createTextNode(`Count: ${this.count}`);
    }

    update() {
      // Do some custom logic
      if (this.count > 5) {
        this.textContent = 'Too high!';
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
  assertEquals(el.textContent, 'Count: 0');

  // Update prop < 5
  el.count = 4;
  assertEquals(el.textContent, 'Count: 4');

  // Update prop > 5
  el.count = 6;
  assertEquals(el.textContent, 'Too high!');

  // Update prop < 5 again
  el.count = 2;
  assertEquals(el.textContent, 'Count: 2');
});

Deno.test('HTMLPropsMixin: requestUpdate triggers rerender', () => {
  let renderCount = 0;
  class ManualUpdate extends HTMLPropsMixin(HTMLElement) {
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

Deno.test('HTMLPropsMixin: filters null/undefined/boolean from content', () => {
  class TestContentElement extends HTMLPropsMixin(HTMLElement) {}
  TestContentElement.define('test-content-filter');

  const el = new TestContentElement({
    content: ['Hello', null, undefined, false, true, 'World', 0],
  });

  // Must call connectedCallback to trigger content rendering (spec: no DOM in constructor)
  el.connectedCallback();

  assertEquals(el.childNodes.length, 3);
  assertEquals(el.textContent, 'HelloWorld0');
});

Deno.test('HTMLPropsMixin: filters null/undefined/boolean from render', () => {
  class MyEl extends HTMLPropsMixin(HTMLElement) {
    render() {
      return ['Hello', null, undefined, false, true, 'World', 0];
    }
  }
  MyEl.define('my-el-filter');

  const el = new MyEl();
  document.body.appendChild(el); // Trigger connectedCallback -> render

  assertEquals(el.childNodes.length, 3);
  assertEquals(el.textContent, 'HelloWorld0');
});

Deno.test('HTMLPropsMixin: signal update triggers content re-render with nested content', async () => {
  const { signal } = await import('@html-props/signals');

  // Create wrapper Div class for this test
  class WrapperDiv extends HTMLPropsMixin(HTMLElement) {}
  WrapperDiv.define('wrapper-div-test');

  // Simulate MarkdownViewer pattern - internal signal for tokens/content
  class ContentViewer extends HTMLPropsMixin(HTMLElement, {
    src: prop(''),
  }) {
    // Internal signal for async-loaded content
    private items = signal<string[]>([]);

    // Simulate async load
    loadContent(newItems: string[]) {
      this.items.set(newItems);
    }

    render() {
      const items = this.items();

      // Create a wrapper Div with content prop (like MarkdownViewer does)
      return new WrapperDiv({
        className: 'content-wrapper',
        content: items.map((item) => {
          const span = document.createElement('span');
          span.textContent = item;
          return span;
        }),
      });
    }
  }
  ContentViewer.define('content-viewer-test');

  const el = new ContentViewer({ src: 'test.md' });
  document.body.appendChild(el);

  // Initial render - empty items
  assertEquals(el.childNodes.length, 1);
  const wrapper = el.firstChild as HTMLElement;
  assertEquals(wrapper.tagName.toLowerCase(), 'wrapper-div-test');
  assertEquals(wrapper.childNodes.length, 0); // No items yet

  // Simulate async content load
  el.loadContent(['Item 1', 'Item 2', 'Item 3']);

  // After signal update, content should be rendered
  assertEquals(wrapper.childNodes.length, 3);
  assertEquals((wrapper.childNodes[0] as HTMLElement).textContent, 'Item 1');
  assertEquals((wrapper.childNodes[1] as HTMLElement).textContent, 'Item 2');
  assertEquals((wrapper.childNodes[2] as HTMLElement).textContent, 'Item 3');
});

// Test that mimics CounterApp Increment button - internal signal change via onclick
Deno.test('HTMLPropsMixin: increment button pattern - internal signal change triggers re-render', () => {
  let renderCount = 0;

  class CounterButton extends HTMLPropsMixin(HTMLElement, {
    count: prop(0),
  }) {
    render() {
      renderCount++;
      const button = document.createElement('button');
      button.textContent = `Count: ${this.count}`;
      button.onclick = () => {
        this.count++; // Internal increment - THIS is what Increment button does
      };
      return [button];
    }
  }

  customElements.define('counter-button-test', CounterButton);
  const el = new CounterButton();
  el.connectedCallback();

  assertEquals(renderCount, 1, 'Initial render');
  const button = el.querySelector('button');
  assert(button, 'Button should exist');
  assertEquals(button.textContent, 'Count: 0');

  // Simulate button click
  button.click();

  assertEquals(renderCount, 2, 'Should re-render after click');
  // After re-render, need to get the NEW button
  const newButton = el.querySelector('button');
  assert(newButton, 'New button should exist');
  assertEquals(newButton.textContent, 'Count: 1', 'Button text should update to 1');

  // Click again
  newButton.click();

  assertEquals(renderCount, 3, 'Should re-render again');
  const finalButton = el.querySelector('button');
  assertEquals(finalButton?.textContent, 'Count: 2', 'Button text should update to 2');

  el.disconnectedCallback();
});

// Test nested component scenario - parent renders child, child has reactive props
Deno.test('HTMLPropsMixin: nested component - child mounted via parent render() has working reactivity', () => {
  let childRenderCount = 0;

  // Child component with internal signal
  class NestedCounter extends HTMLPropsMixin(HTMLElement, {
    count: prop(0),
  }) {
    render() {
      childRenderCount++;
      const button = document.createElement('button');
      button.textContent = `Nested: ${this.count}`;
      button.onclick = () => {
        this.count++;
      };
      return [button];
    }
  }
  customElements.define('nested-counter-test', NestedCounter);

  // Parent component that renders child
  class ParentWrapper extends HTMLPropsMixin(HTMLElement, {}) {
    render() {
      return [new NestedCounter()];
    }
  }
  customElements.define('parent-wrapper-test', ParentWrapper);

  // Mount parent to DOM
  const parent = new ParentWrapper();
  document.body.appendChild(parent);
  parent.connectedCallback();

  // Find the nested child
  const child = parent.querySelector('nested-counter-test') as InstanceType<typeof NestedCounter>;
  assert(child, 'Child should exist');

  // Child needs connectedCallback to be called when mounted via parent
  // In real browser this happens automatically, in happy-dom we must check
  child.connectedCallback();

  assertEquals(childRenderCount, 1, 'Child initial render');
  const button = child.querySelector('button');
  assert(button, 'Button should exist');
  assertEquals(button.textContent, 'Nested: 0');

  // Click button - internal signal change
  button.click();

  assertEquals(childRenderCount, 2, 'Child should re-render after internal signal change');
  const newButton = child.querySelector('button');
  assertEquals(newButton?.textContent, 'Nested: 1', 'Button text should update');

  // Cleanup
  child.disconnectedCallback();
  parent.disconnectedCallback();
  document.body.removeChild(parent);
});
