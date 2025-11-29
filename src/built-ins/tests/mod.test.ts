import { assertEquals } from 'jsr:@std/assert';
import './setup.ts';
import { Button, Div, Span } from '../mod.ts';
import { createRef } from '../../core/ref.ts';

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
  const ref = createRef<any>();
  const div = new Div({ ref });

  assertEquals(ref.current, div);
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
