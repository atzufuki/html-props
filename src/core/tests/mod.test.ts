import { assert } from '@std/assert';
import HTMLProps, { HTMLPropsMixin, HTMLUtilityMixin } from '../mod.ts';
import { JSDOM } from 'jsdom';

const dom = new JSDOM(`<!DOCTYPE html><body></body>`);

self.window = dom.window;
self.document = dom.window.document;
self.customElements = dom.window.customElements;
self.DOMParser = dom.window.DOMParser;
self.Node = dom.window.Node;
self.HTMLElement = dom.window.HTMLElement;
self.HTMLButtonElement = dom.window.HTMLButtonElement;

Deno.test('html props mixin test', () => {
  class MyElement extends HTMLProps<{
    text?: string;
  }>(HTMLElement) {
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
  const MyButton = HTMLUtilityMixin(
    HTMLPropsMixin<HTMLButtonElement>(HTMLButtonElement),
  );

  MyButton.define('my-direct-button', { extends: 'button' });

  const element = new MyButton({ textContent: 'Click me!' });

  document.body.appendChild(element);

  assert(element instanceof HTMLElement);
  assert(element instanceof HTMLButtonElement);
  assert(element instanceof MyButton);
  assert(element.textContent === 'Click me!');
});

Deno.test('custom built in element test', () => {
  class MyButton extends HTMLProps(HTMLButtonElement) {
    render() {
      return this.textContent ?? '-';
    }
  }

  MyButton.define('my-custom-button', { extends: 'button' });

  const element = new MyButton({ textContent: 'Click me!' });

  document.body.appendChild(element);

  assert(element instanceof HTMLElement);
  assert(element instanceof HTMLButtonElement);
  assert(element instanceof MyButton);
  assert(typeof element.build === 'function');

  assert(element.textContent === 'Click me!');
});
