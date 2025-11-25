import { assertEquals } from 'jsr:@std/assert';
import { HTMLPropsMixin } from '../mixin.ts';

// Mock DOM environment
class MockHTMLElement {
  attributes: Record<string, string> = {};
  children: any[] = [];
  style: any = {};
  textContent: string | null = null;

  getAttribute(name: string) {
    return this.attributes[name] ?? null;
  }
  setAttribute(name: string, val: string) {
    const old = this.attributes[name] ?? null;
    this.attributes[name] = val;
    (this as any).attributeChangedCallback?.(name, old, val);
  }
  removeAttribute(name: string) {
    const old = this.attributes[name] ?? null;
    delete this.attributes[name];
    (this as any).attributeChangedCallback?.(name, old, null);
  }
  hasAttribute(name: string) {
    return name in this.attributes;
  }
  replaceChildren(...nodes: any[]) {
    this.children = nodes;
  }
  dispatchEvent(event: any) {
    this.events.push(event);
    return true;
  }
  addEventListener(type: string, listener: any, options?: any) {}
  events: any[] = [];

  connectedCallback() {}
  disconnectedCallback() {}
  attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null) {}
}

(globalThis as any).HTMLElement = MockHTMLElement;
(globalThis as any).CustomEvent = class CustomEvent {
  detail: any;
  constructor(public type: string, options: any) {
    this.detail = options?.detail;
  }
};
(globalThis as any).Node = class Node {};
(globalThis as any).customElements = {
  defined: {} as Record<string, any>,
  define(name: string, constructor: any, options: any) {
    this.defined[name] = { constructor, options };
  },
};

Deno.test('HTMLPropsMixin: initializes props', () => {
  class TestElement extends HTMLPropsMixin(MockHTMLElement as any) {
    static props = {
      count: { type: Number, default: 10 },
      label: { type: String, default: 'hello' },
      active: { type: Boolean, default: true },
    };
    render() {
      return [];
    }
  }

  const el = new TestElement() as any;
  assertEquals(el.count, 10);
  assertEquals(el.label, 'hello');
  assertEquals(el.active, true);
});

Deno.test('HTMLPropsMixin: updates props and renders', () => {
  let renderCount = 0;
  class TestElement extends HTMLPropsMixin(MockHTMLElement as any) {
    static props = {
      count: { type: Number, default: 0 },
    };
    render() {
      renderCount++;
      return [`Count: ${this.count}`];
    }
  }

  const el = new TestElement() as any;
  el.connectedCallback(); // Mount

  assertEquals(renderCount, 1); // Initial render
  assertEquals(el.children[0], 'Count: 0');

  el.count = 5;
  assertEquals(renderCount, 2);
  assertEquals(el.children[0], 'Count: 5');

  el.disconnectedCallback();
});

Deno.test('HTMLPropsMixin: reflects props to attributes', () => {
  class TestElement extends HTMLPropsMixin(MockHTMLElement as any) {
    static props = {
      count: { type: Number, default: 0, reflect: true },
      active: { type: Boolean, default: false, reflect: true },
    };
    render() {
      return [];
    }
  }

  const el = new TestElement() as any;
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
  class TestElement extends HTMLPropsMixin(MockHTMLElement as any) {
    static props = {
      count: { type: Number, default: 0, reflect: true },
      label: { type: String, default: '', reflect: true },
    };
    render() {
      return [];
    }
  }

  const el = new TestElement() as any;
  el.connectedCallback();

  el.setAttribute('count', '10');
  assertEquals(el.count, 10);

  el.setAttribute('label', 'test');
  assertEquals(el.label, 'test');
});

Deno.test('HTMLPropsMixin: dispatches events', () => {
  class TestElement extends HTMLPropsMixin(MockHTMLElement as any) {
    static props = {
      count: { type: Number, default: 0, event: 'change' },
    };
    render() {
      return [];
    }
  }

  const el = new TestElement() as any;
  el.count = 5;

  assertEquals(el.events.length, 1);
  assertEquals(el.events[0].type, 'change');
  assertEquals(el.events[0].detail, 5);
});

Deno.test('HTMLPropsMixin: define static method', () => {
  class TestElement extends HTMLPropsMixin(MockHTMLElement as any) {}

  const Result = TestElement.define('test-define', { extends: 'div' });

  assertEquals(Result, TestElement);
  const defined = (globalThis as any).customElements.defined['test-define'];
  assertEquals(defined.constructor, TestElement);
  assertEquals(defined.options, { extends: 'div' });
});

Deno.test('HTMLPropsMixin - typed props', () => {
  interface TestProps {
    count: number;
    label: string;
  }

  const Base = HTMLPropsMixin<typeof MockHTMLElement, TestProps>(MockHTMLElement);

  // @ts-ignore
  class TestEl extends Base {
    static props = {
      count: { type: Number, default: 0 },
      label: { type: String, default: 'test' },
    };
  }

  const el = new TestEl();
  assertEquals(el.count, 0);
  assertEquals(el.label, 'test');

  el.count = 10;
  assertEquals(el.count, 10);
});
