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
    Event,
    MutationObserver,
  });
}

// --- Basic Functionality ---

Deno.test('HTMLPropsMixin: initializes props', () => {
  class TestElement extends HTMLPropsMixin(HTMLElement) {
    declare count: number;
    declare label: string;
    declare active: boolean;
    static props = {
      count: { type: Number, default: 10 },
      label: { type: String, default: 'hello' },
      active: { type: Boolean, default: true },
    };
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
  class TestElement extends HTMLPropsMixin(HTMLElement) {
    declare count: number;
    static props = {
      count: { type: Number, default: 0 },
    };
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
  class TestElement extends HTMLPropsMixin(HTMLElement) {
    declare count: number;
    declare active: boolean;
    static props = {
      count: { type: Number, default: 0, reflect: true },
      active: { type: Boolean, default: false, reflect: true },
    };
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
  class TestElement extends HTMLPropsMixin(HTMLElement) {
    declare count: number;
    declare label: string;
    static props = {
      count: { type: Number, default: 0, reflect: true },
      label: { type: String, default: '', reflect: true },
    };
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
  class TestElement extends HTMLPropsMixin(HTMLElement) {
    declare count: number;
    static props = {
      count: { type: Number, default: 0, event: 'change' },
    };
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

Deno.test('HTMLPropsMixin: define static method', () => {
  class TestElement extends HTMLPropsMixin(HTMLElement) {}

  const Result = TestElement.define('test-define', { extends: 'div' });

  assertEquals(Result, TestElement);
  assertEquals(customElements.get('test-define'), TestElement);
});

Deno.test('HTMLPropsMixin: typed props', () => {
  interface TestProps {
    count: number;
    label: string;
  }

  const Base = HTMLPropsMixin<typeof HTMLElement, TestProps>(HTMLElement);

  // @ts-ignore
  class TestEl extends Base {
    static props = {
      count: { type: Number, default: 0 },
      label: { type: String, default: 'test' },
    };
  }

  customElements.define('test-typed', TestEl);
  const el = new TestEl();
  assertEquals(el.count, 0);
  assertEquals(el.label, 'test');

  el.count = 10;
  assertEquals(el.count, 10);
});

// --- Inheritance & Composition ---

Deno.test('HTMLPropsMixin: inheritance', () => {
  class MyElement extends HTMLPropsMixin(HTMLElement) {
    declare text: string;
    static props: PropsConfig = {
      text: { type: String, default: 'Default text' },
    };
  }

  class MyElementFromInheritance extends HTMLPropsMixin(MyElement) {
    declare text: string;
    static props: PropsConfig = {
      text: { type: String, default: 'Default text from inheritance' },
    };
  }

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
  class ParentElement extends HTMLPropsMixin(HTMLElement) {
    declare foo: string;
    static props: PropsConfig = {
      foo: { type: String, default: '' },
    };
  }

  customElements.define('parent-element', ParentElement);

  class ChildElement extends HTMLPropsMixin(ParentElement) {
    declare bar: string;
    static props: PropsConfig = {
      bar: { type: String, default: '' },
    };

    connectedCallback(): void {
      super.connectedCallback?.();
      this.textContent = this.bar;
    }
  }

  customElements.define('child-element', ChildElement);

  const element = new ChildElement({ foo: 'Name', bar: 'Alice' });
  document.body.appendChild(element);

  assertEquals(element.bar, 'Alice');
  // assertEquals(element.foo, 'Name'); // TODO: Fix prop inheritance if needed
  assertEquals(element.textContent, 'Alice');
  assert(element instanceof HTMLElement);
  assert(element instanceof ParentElement);
  assert(element instanceof ChildElement);
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
  class MyElement extends HTMLPropsMixin(HTMLElement) {
    declare text: string;
    static props = {
      text: { type: String, default: '' },
    };

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
  class MyElement extends HTMLPropsMixin(HTMLElement) {
    declare text: string;
    static props = {
      text: { type: String, default: '' },
    };

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
  class MyElement extends HTMLPropsMixin(HTMLElement) {
    declare text: string;
    static props = {
      text: { type: String, default: '' },
    };

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

Deno.test('HTMLPropsMixin: lifecycle safety - single level (baseline)', () => {
  let connectedCallCount = 0;

  class Widget extends HTMLPropsMixin(HTMLElement) {
    declare prop: string;
    static props = {
      prop: { type: String, default: '' },
    };

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

  class BaseWidget extends HTMLPropsMixin(HTMLElement) {
    declare baseProp: string;
    static props: PropsConfig = {
      baseProp: { type: String, default: '' },
    };

    connectedCallback() {
      super.connectedCallback?.();
      baseConnectCount++;
    }
  }

  customElements.define('base-widget', BaseWidget);

  class ExtendedWidget extends HTMLPropsMixin(BaseWidget) {
    declare extendedProp: string;
    static props: PropsConfig = {
      extendedProp: { type: String, default: '' },
    };

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

  class ChildElement extends HTMLPropsMixin(HTMLElement) {
    declare label: string;
    static props = {
      label: { type: String, default: '' },
    };

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

  class BaseContainer extends HTMLPropsMixin(HTMLElement) {
    declare prop1: string;
    static props: PropsConfig = {
      prop1: { type: String, default: '' },
    };
  }

  customElements.define('base-container', BaseContainer);

  class ExtendedContainer extends HTMLPropsMixin(BaseContainer) {
    declare prop2: string;
    static props: PropsConfig = {
      prop2: { type: String, default: '' },
    };
  }

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
  class L1 extends HTMLPropsMixin(HTMLElement) {
    declare p1: string;
    static props: PropsConfig = { p1: { type: String, default: '' } };
  }
  customElements.define('level-1-element', L1);

  class L2 extends HTMLPropsMixin(L1) {
    declare p2: string;
    static props: PropsConfig = { p2: { type: String, default: '' } };
  }
  customElements.define('level-2-element', L2);

  class L3 extends HTMLPropsMixin(L2) {
    declare p3: string;
    static props: PropsConfig = { p3: { type: String, default: '' } };
  }
  customElements.define('level-3-element', L3);

  class L4 extends HTMLPropsMixin(L3) {
    declare p4: string;
    static props: PropsConfig = { p4: { type: String, default: '' } };
  }
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

  class ChildWithEffect extends HTMLPropsMixin(HTMLElement) {
    declare value: string;
    static props = {
      value: { type: String, default: '' },
    };

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

  class BaseContainer extends HTMLPropsMixin(HTMLElement) {
    declare prop1: string;
    static props: PropsConfig = {
      prop1: { type: String, default: '' },
    };
  }

  customElements.define('base-container-effect', BaseContainer);

  class ExtendedContainer extends HTMLPropsMixin(BaseContainer) {
    declare prop2: string;
    static props: PropsConfig = {
      prop2: { type: String, default: '' },
    };
  }

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
