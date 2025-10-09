import { assert, assertEquals } from '@std/assert';
import HTMLProps, { createRef, HTMLPropsMixin, HTMLTemplateMixin, HTMLUtilityMixin } from '../mod.ts';
import { effect, signal } from '../../signals/mod.ts';
import { JSDOM } from 'jsdom';

const dom = new JSDOM(`<!DOCTYPE html><body></body>`);

self.window = dom.window;
self.document = dom.window.document;
self.customElements = dom.window.customElements;
// JSDOM does not getName at this point. See https://github.com/jsdom/jsdom/issues/3640.
self.customElements.getName = () => {
  return null;
};
self.DOMParser = dom.window.DOMParser;
self.Node = dom.window.Node;
self.HTMLElement = dom.window.HTMLElement;
self.HTMLButtonElement = dom.window.HTMLButtonElement;
self.DocumentFragment = dom.window.DocumentFragment;

Deno.test('html props mixin test', () => {
  interface MyElementProps extends HTMLElement {
    text?: string;
  }

  class MyElement extends HTMLProps(HTMLElement)<MyElementProps>() {
    text?: string;

    getDefaultProps(): this['props'] {
      return {
        text: 'Default text',
      };
    }
  }

  class MyElementFromMixins extends HTMLUtilityMixin(HTMLTemplateMixin(HTMLPropsMixin(HTMLElement)<MyElementProps>())) {
    text?: string;

    getDefaultProps(): this['props'] {
      return {
        text: 'Default text from mixins',
      };
    }
  }

  MyElement.define('my-element');
  MyElementFromMixins.define('my-element-from-mixins');

  const element = new MyElement({ text: 'Hello, World!' });
  const elementFromMixins = new MyElementFromMixins({ text: 'Hello, Mixins!' });

  document.body.appendChild(element);
  document.body.appendChild(elementFromMixins);

  assert(element instanceof HTMLElement);
  assert(element instanceof MyElement);
  assert(typeof element.build === 'function');
  assert(element.text === 'Hello, World!');

  assert(elementFromMixins instanceof HTMLElement);
  assert(elementFromMixins instanceof MyElementFromMixins);
  assert(typeof elementFromMixins.build === 'function');
  assert(elementFromMixins.text === 'Hello, Mixins!');
});

Deno.test('direct built in element test', () => {
  const MyButton = HTMLUtilityMixin(HTMLPropsMixin(HTMLButtonElement)<HTMLButtonElement>());

  MyButton.define('my-direct-button', { extends: 'button' });

  const element = new MyButton({ textContent: 'Click me!' });

  document.body.appendChild(element);

  assert(element instanceof HTMLElement);
  assert(element instanceof HTMLButtonElement);
  assert(element instanceof MyButton);
  assert(element.textContent === 'Click me!');
});

Deno.test('custom built in element test', () => {
  class MyButton extends HTMLProps(HTMLButtonElement)<HTMLButtonElement>() {}

  MyButton.define('my-custom-button', { extends: 'button' });

  const element = new MyButton({
    textContent: 'Click me!',
  });

  document.body.appendChild(element);

  assert(element instanceof HTMLElement);
  assert(element instanceof HTMLButtonElement);
  assert(element instanceof MyButton);
  assert(typeof element.build === 'function');

  assert(element.textContent === 'Click me!');
});

Deno.test('signal support in props mapping', () => {
  interface MyElementProps extends HTMLElement {
    text?: string;
  }

  class MyElement extends HTMLProps(HTMLElement)<MyElementProps>() {
    text = signal('');

    connectedCallback(): void {
      super.connectedCallback?.();
      this.textContent = this.text();
    }
  }

  MyElement.define('my-signal-element');

  const element = new MyElement({ text: 'Original text' });
  document.body.appendChild(element);

  assertEquals(element.text(), 'Original text');
  assertEquals(element.textContent, 'Original text');

  element.text.set('New text');
  assertEquals(element.text(), 'New text');
});

Deno.test('signal support with click handler', () => {
  interface MyElementProps extends HTMLElement {
    text?: string;
  }

  class MyElement extends HTMLProps(HTMLElement)<MyElementProps>() {
    text = signal('');

    connectedCallback(): void {
      super.connectedCallback?.();
      this.textContent = this.text();
    }
  }

  MyElement.define('my-signal-click-element');

  const element = new MyElement({
    text: 'Original text',
    onclick: (event: Event) => {
      const el = event.currentTarget as MyElement;
      el.text.set('New text');
    },
  });

  document.body.appendChild(element);

  assertEquals(element.text(), 'Original text');
  assertEquals(element.textContent, 'Original text');

  element.click();

  assertEquals(element.text(), 'New text');
});

Deno.test('signal support with effect', () => {
  interface MyElementProps extends HTMLElement {
    text?: string;
  }

  class MyElement extends HTMLProps(HTMLElement)<MyElementProps>() {
    text = signal('');

    connectedCallback(): void {
      super.connectedCallback?.();
      effect(() => {
        this.textContent = this.text();
      });
    }
  }

  MyElement.define('my-signal-effect-element');

  const element = new MyElement({
    text: 'Original text',
    onclick: (event) => {
      const el = event.currentTarget as MyElement;
      el.text.set('New text');
    },
  });

  document.body.appendChild(element);

  assertEquals(element.text(), 'Original text');
  assertEquals(element.textContent, 'Original text');

  element.click();

  assertEquals(element.text(), 'New text');
  assertEquals(element.textContent, 'New text');
});

Deno.test('nested inheritance', () => {
  interface ParentProps extends HTMLElement {
    foo?: string;
  }

  class ParentElement extends HTMLProps(HTMLElement)<ParentProps>() {
    foo = signal('');
  }

  ParentElement.define('parent-element');

  interface ChildProps extends ParentProps {
    bar?: string;
  }

  class ChildElement extends HTMLProps(ParentElement)<ChildProps>() {
    bar = signal('');

    connectedCallback(): void {
      super.connectedCallback?.();
      this.textContent = this.bar();
    }
  }

  ChildElement.define('child-element');

  const element = new ChildElement({ foo: 'Name', bar: 'Alice' });
  document.body.appendChild(element);

  assertEquals(element.bar(), 'Alice');
  assertEquals(element.foo(), 'Name');
  assertEquals(element.textContent, 'Alice');
  assert(element instanceof HTMLElement);
  assert(element instanceof ParentElement);
  assert(element instanceof ChildElement);
});

Deno.test('ref', () => {
  class MyButton extends HTMLProps(HTMLButtonElement)<HTMLButtonElement>() {}

  MyButton.define('my-button-ref', { extends: 'button' });

  class MyElement extends HTMLProps(HTMLElement)() {
    buttonRef = createRef<MyButton>(null);

    render(): this['content'] {
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

  MyElement.define('my-element-ref');

  const element = new MyElement();
  document.body.appendChild(element);
  const button = element.buttonRef.current;
  assert(button instanceof HTMLButtonElement);
  assertEquals(button?.textContent, 'Click me!');
  button?.click();
  assertEquals(button?.textContent, 'Clicked!');
});

Deno.test('mixin duplication prevention - single level (baseline)', () => {
  let connectedCallCount = 0;

  class Widget extends HTMLProps(HTMLElement)<{ prop: string }>() {
    prop = signal('');

    connectedCallback() {
      super.connectedCallback?.();
      connectedCallCount++;
    }
  }

  Widget.define('widget-single');

  const widget = new Widget({ prop: 'test' });
  document.body.appendChild(widget);

  assertEquals(connectedCallCount, 1, 'connectedCallback should be called once');
  assertEquals(widget.prop(), 'test');

  document.body.removeChild(widget);
});

Deno.test('mixin duplication prevention - multi-level inheritance', () => {
  let baseConnectCount = 0;
  let extendedConnectCount = 0;

  class BaseWidget extends HTMLProps(HTMLElement)<{ baseProp: string }>() {
    baseProp = signal('');

    connectedCallback() {
      super.connectedCallback?.();
      baseConnectCount++;
    }
  }

  BaseWidget.define('base-widget');

  interface ExtendedProps {
    baseProp?: string;
    extendedProp: string;
  }

  class ExtendedWidget extends HTMLProps(BaseWidget)<ExtendedProps>() {
    extendedProp = signal('');

    connectedCallback() {
      super.connectedCallback?.();
      extendedConnectCount++;
    }
  }

  ExtendedWidget.define('extended-widget');

  const widget = new ExtendedWidget({ baseProp: 'base', extendedProp: 'extended' });
  document.body.appendChild(widget);

  assertEquals(baseConnectCount, 1, 'BaseWidget connectedCallback should be called once');
  assertEquals(extendedConnectCount, 1, 'ExtendedWidget connectedCallback should be called once');
  assertEquals(widget.baseProp(), 'base');
  assertEquals(widget.extendedProp(), 'extended');

  document.body.removeChild(widget);
});

Deno.test('mixin duplication prevention - children should NOT reconnect', () => {
  let childConnectCount = 0;
  let childDisconnectCount = 0;

  class ChildElement extends HTMLProps(HTMLElement)<{ label: string }>() {
    label = signal('');

    connectedCallback() {
      super.connectedCallback?.();
      childConnectCount++;
    }

    disconnectedCallback() {
      super.disconnectedCallback?.();
      childDisconnectCount++;
    }
  }

  ChildElement.define('child-element-test');

  class BaseContainer extends HTMLProps(HTMLElement)<{ prop1: string }>() {
    prop1 = signal('');
  }

  BaseContainer.define('base-container');

  interface ExtendedContainerProps {
    prop1?: string;
    prop2: string;
  }

  class ExtendedContainer extends HTMLProps(BaseContainer)<ExtendedContainerProps>() {
    prop2 = signal('');
  }

  ExtendedContainer.define('extended-container');

  const child = new ChildElement({ label: 'test' });
  const container = new ExtendedContainer({
    prop1: 'a',
    prop2: 'b',
    content: [child],
  });

  document.body.appendChild(container);

  assertEquals(childConnectCount, 1, 'Child should connect once');
  assertEquals(childDisconnectCount, 0, 'Child should NOT disconnect during parent connection');
  assertEquals(child.label(), 'test');

  document.body.removeChild(container);
  assertEquals(childDisconnectCount, 1, 'Child should disconnect once on removal');
});

Deno.test('mixin duplication prevention - deep inheritance chain (4 levels)', () => {
  class L1 extends HTMLProps(HTMLElement)<{ p1: string }>() {
    p1 = signal('');
  }
  L1.define('level-1-element');

  interface L2Props {
    p1?: string;
    p2: string;
  }

  class L2 extends HTMLProps(L1)<L2Props>() {
    p2 = signal('');
  }
  L2.define('level-2-element');

  interface L3Props {
    p1?: string;
    p2?: string;
    p3: string;
  }

  class L3 extends HTMLProps(L2)<L3Props>() {
    p3 = signal('');
  }
  L3.define('level-3-element');

  interface L4Props {
    p1?: string;
    p2?: string;
    p3?: string;
    p4: string;
  }

  class L4 extends HTMLProps(L3)<L4Props>() {
    p4 = signal('');
  }
  L4.define('level-4-element');

  const widget = new L4({ p1: 'a', p2: 'b', p3: 'c', p4: 'd' });
  document.body.appendChild(widget);

  assertEquals(widget.p1(), 'a');
  assertEquals(widget.p2(), 'b');
  assertEquals(widget.p3(), 'c');
  assertEquals(widget.p4(), 'd');

  assert(widget instanceof L1);
  assert(widget instanceof L2);
  assert(widget instanceof L3);
  assert(widget instanceof L4);

  document.body.removeChild(widget);
});

Deno.test('mixin duplication prevention - content insertion happens once', () => {
  let buildCallCount = 0;

  class BaseWidget extends HTMLProps(HTMLElement)<{ baseProp: string }>() {
    baseProp = signal('');

    build() {
      buildCallCount++;
      super.build?.();
    }
  }

  BaseWidget.define('base-widget-build');

  interface ExtendedProps {
    baseProp?: string;
    extendedProp: string;
  }

  class ExtendedWidget extends HTMLProps(BaseWidget)<ExtendedProps>() {
    extendedProp = signal('');

    render() {
      return document.createTextNode('Content');
    }
  }

  ExtendedWidget.define('extended-widget-build');

  const widget = new ExtendedWidget({ baseProp: 'base', extendedProp: 'extended' });
  document.body.appendChild(widget);

  // build() should be called once from HTMLTemplateMixin
  assertEquals(buildCallCount, 1, 'build() should be called once');
  assertEquals(widget.textContent, 'Content');

  document.body.removeChild(widget);
});

Deno.test('mixin duplication prevention - effect cleanup preserved', () => {
  let effectRunCount = 0;
  let effectCleanupCount = 0;

  class ChildWithEffect extends HTMLProps(HTMLElement)<{ value: string }>() {
    value = signal('');

    connectedCallback() {
      super.connectedCallback?.();
      effect(() => {
        effectRunCount++;
        this.textContent = this.value();
        return () => {
          effectCleanupCount++;
        };
      });
    }
  }

  ChildWithEffect.define('child-with-effect');

  class BaseContainer extends HTMLProps(HTMLElement)<{ prop1: string }>() {
    prop1 = signal('');
  }

  BaseContainer.define('base-container-effect');

  interface ExtendedContainerProps {
    prop1?: string;
    prop2: string;
  }

  class ExtendedContainer extends HTMLProps(BaseContainer)<ExtendedContainerProps>() {
    prop2 = signal('');
  }

  ExtendedContainer.define('extended-container-effect');

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
  child.value.set('updated');
  assertEquals(effectRunCount, 2, 'Effect should run again after signal update');
  assertEquals(child.textContent, 'updated');

  document.body.removeChild(container);
});
