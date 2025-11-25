import { assertEquals } from 'jsr:@std/assert';
import './setup.ts';
import { Button, Div, Span } from '../mod.ts';
import { createRef } from '../../core/ref.ts';

Deno.test('Div creates a div element', () => {
  const div = new Div({ className: 'test' });
  assertEquals((div as any).tagName, 'DIV');
  assertEquals((div as any).attributes['class'], 'test');
});

Deno.test('Button handles onClick', () => {
  let clicked = false;
  const btn = new Button({
    onClick: () => clicked = true,
  });

  (btn as any).events['click']();
  assertEquals(clicked, true);
});

Deno.test('Element handles style object', () => {
  const span = new Span({
    style: { color: 'red', fontSize: '12px' },
  });

  assertEquals((span as any).style.color, 'red');
  assertEquals((span as any).style.fontSize, '12px');
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

  assertEquals((div as any).children.length, 2);
  assertEquals((div as any).children[0].tagName, 'SPAN');
  assertEquals((div as any).children[1], 'World');
});
