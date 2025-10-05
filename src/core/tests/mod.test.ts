import { assert, assertEquals } from '@std/assert';
import HTMLProps, { HTMLPropsMixin, HTMLUtilityMixin } from '../mod.ts';
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

  class MyElement extends HTMLProps<MyElementProps>(HTMLElement) {
    text?: string;
  }

  MyElement.define('my-element');

  const element = new MyElement({ text: 'Hello, World!' });

  document.body.appendChild(element);

  assert(element instanceof HTMLElement);
  assert(element instanceof MyElement);
  assert(typeof element.build === 'function');
  assert(element.text === 'Hello, World!');
});

Deno.test('direct built in element test', () => {
  const MyButton = HTMLUtilityMixin(HTMLPropsMixin(HTMLButtonElement));

  MyButton.define('my-direct-button', { extends: 'button' });

  const element = new MyButton({ textContent: 'Click me!' });

  document.body.appendChild(element);

  assert(element instanceof HTMLElement);
  assert(element instanceof HTMLButtonElement);
  assert(element instanceof MyButton);
  assert(element.textContent === 'Click me!');
});

Deno.test('custom built in element test', () => {
  class MyButton extends HTMLProps(HTMLButtonElement) {}

  MyButton.define('my-custom-button', { extends: 'button' });

  const element = new MyButton({
    textContent: 'Click me!',
  });

  document.body.appendChild(element);

  assert(element instanceof HTMLElement);
  assert(element instanceof HTMLButtonElement); // ?
  assert(element instanceof MyButton);
  assert(typeof element.build === 'function');

  assert(element.textContent === 'Click me!');
});

Deno.test('signal support in props mapping', () => {
  interface MyElementProps extends HTMLElement {
    text?: string;
  }

  class MyElement extends HTMLProps<MyElementProps>(HTMLElement) {
    text = signal('');

    connectedCallback(): void {
      super.connectedCallback?.();
      // Update textContent whenever text signal changes
      this.textContent = this.text();
    }
  }

  MyElement.define('my-signal-element');

  // Create element with initial text value
  const element = new MyElement({ text: 'Original text' });
  document.body.appendChild(element);

  // Signal should have been updated with the prop value
  assertEquals(element.text(), 'Original text');
  assertEquals(element.textContent, 'Original text');

  // Should be able to update the signal
  element.text.set('New text');
  assertEquals(element.text(), 'New text');
});

Deno.test('signal support with click handler', () => {
  interface MyElementProps extends HTMLElement {
    text?: string;
  }

  class MyElement extends HTMLProps<MyElementProps>(HTMLElement) {
    text = signal('');

    connectedCallback(): void {
      super.connectedCallback?.();
      // Update textContent whenever text signal changes
      this.textContent = this.text();
    }
  }

  MyElement.define('my-signal-click-element');

  // Create element with initial text and click handler
  const element = new MyElement({
    text: 'Original text',
    onclick: (event) => {
      const el = event.currentTarget as MyElement;
      el.text.set('New text');
    },
  });

  document.body.appendChild(element);

  // Initial state
  assertEquals(element.text(), 'Original text');
  assertEquals(element.textContent, 'Original text');

  // Simulate click
  element.click();

  // Signal should have been updated by the click handler
  assertEquals(element.text(), 'New text');
});

Deno.test('signal support with effect', () => {
  interface MyElementProps extends HTMLElement {
    text?: string;
  }

  class MyElement extends HTMLProps<MyElementProps>(HTMLElement) {
    text = signal('');

    connectedCallback(): void {
      super.connectedCallback?.();
      // Update textContent whenever text signal changes using effect
      effect(() => {
        this.textContent = this.text();
      });
    }
  }

  MyElement.define('my-signal-effect-element');

  // Create element with initial text and click handler
  const element = new MyElement({
    text: 'Original text',
    onclick: (event) => {
      const el = event.currentTarget as MyElement;
      el.text.set('New text');
    },
  });

  document.body.appendChild(element);

  // Initial state - effect should have run
  assertEquals(element.text(), 'Original text');
  assertEquals(element.textContent, 'Original text');

  // Simulate click - effect should automatically update textContent
  element.click();

  // Signal and textContent should both be updated
  assertEquals(element.text(), 'New text');
  assertEquals(element.textContent, 'New text');
});
