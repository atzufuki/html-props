import { assertEquals } from 'jsr:@std/assert';
import './setup.ts';
import { Button, Div, Span } from '../mod.ts';
import { ref } from '../../core/ref.ts';

const Event = (globalThis as any).window.Event;

Deno.test('Div creates a div element', () => {
  const div = new Div({ className: 'test' });
  assertEquals(div.tagName, 'DIV');
  assertEquals(div.getAttribute('class'), 'test');
});

Deno.test('Button handles onclick', () => {
  let clicked = false;
  const btn = new Button({
    onclick: () => clicked = true,
  });

  btn.dispatchEvent(new Event('click'));
  assertEquals(clicked, true);
});

Deno.test('Element handles style object', () => {
  const span = new Span({
    style: { color: 'red', fontSize: '12px' },
  });

  assertEquals(span.style.color, 'red');
  assertEquals(span.style.fontSize, '12px');
});

Deno.test('Element handles ref', () => {
  const divRef = ref<any>();
  const div = new Div({ ref: divRef });

  // Simulate mount
  div.connectedCallback();

  assertEquals(divRef.current, div);
});

Deno.test('Element handles content', () => {
  const div = new Div({
    content: [
      new Span({ textContent: 'Hello' }),
      'World',
    ],
  });

  assertEquals(div.childNodes.length, 2);
  assertEquals((div.childNodes[0] as Element).tagName, 'SPAN');
  assertEquals(div.childNodes[1].textContent, 'World');
});

import { HTMLPropsMixin, prop } from '../../core/mod.ts';

Deno.test('Nested Mixin: CounterButton extends HTMLPropsMixin(Button)', () => {
  class CounterButton extends HTMLPropsMixin(Button, {
    count: prop(0),
    label: prop('Count'),
  }) {
    render() {
      return document.createTextNode(`${this.label}: ${this.count}`);
    }
  }

  CounterButton.define('counter-button', { extends: 'button' });

  const btn = new CounterButton({ count: 5, label: 'Clicks' });

  // Check inheritance from Button (native props)
  assertEquals(btn.tagName, 'BUTTON');

  // Check new props
  assertEquals(btn.count, 5);
  assertEquals(btn.label, 'Clicks');

  // Check rendering
  // In the test environment (linkedom), we might need to attach to DOM or call connectedCallback
  btn.connectedCallback();

  assertEquals(btn.textContent, 'Clicks: 5');

  // Update prop
  btn.count = 6;
  assertEquals(btn.textContent, 'Clicks: 6');

  // Check that base props still work (e.g. style from Button/HTMLPropsMixin)
  btn.style.color = 'red';
  assertEquals(btn.style.color, 'red');
});
