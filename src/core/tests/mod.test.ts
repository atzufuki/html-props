import { assert, assertEquals } from '@std/assert';
import HTMLProps, { HTMLPropsMixin, HTMLTemplateMixin, HTMLUtilityMixin } from '../mod.ts';
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
