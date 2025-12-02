import { assertEquals } from 'jsr:@std/assert';
import { parseHTML } from 'npm:linkedom';

let Row: any;
let Column: any;
let Center: any;
let Stack: any;
let Container: any;

// @ts-ignore: Deno.test.beforeAll is available in Deno 2+
Deno.test.beforeAll(async () => {
  // Setup environment
  if (!globalThis.document) {
    const {
      window,
      document,
      customElements,
      HTMLElement,
      Node,
      CustomEvent,
      MutationObserver,
    } = parseHTML('<!DOCTYPE html><html><body></body></html>');

    Object.assign(globalThis, {
      window,
      document,
      customElements,
      HTMLElement,
      Node,
      CustomEvent,
      MutationObserver,
    });
  }

  const mod = await import('../mod.ts');
  Row = mod.Row;
  Column = mod.Column;
  Center = mod.Center;
  Stack = mod.Stack;
  Container = mod.Container;
});

Deno.test('Row applies flex styles', () => {
  const row = new Row({
    mainAxisAlignment: 'center',
    gap: '10px',
  });
  document.body.appendChild(row);

  assertEquals(row.style.display, 'flex');
  assertEquals(row.style.flexDirection, 'row');
  assertEquals(row.style.justifyContent, 'center');
  assertEquals(row.style.gap, '10px');
});

Deno.test('Column applies flex styles', () => {
  const col = new Column({
    crossAxisAlignment: 'center',
  });
  document.body.appendChild(col);

  assertEquals(col.style.display, 'flex');
  assertEquals(col.style.flexDirection, 'column');
  assertEquals(col.style.alignItems, 'center');
});

Deno.test('Center applies centering styles', () => {
  const center = new Center();
  document.body.appendChild(center);

  assertEquals(center.style.display, 'flex');
  assertEquals(center.style.justifyContent, 'center');
  assertEquals(center.style.alignItems, 'center');
});

Deno.test('Stack applies grid styles', () => {
  const stack = new Stack({
    alignment: 'center',
  });
  document.body.appendChild(stack);

  assertEquals(stack.style.display, 'grid');
  assertEquals(stack.style.gridTemplateAreas, '"stack"');
  assertEquals(stack.style.placeItems, 'center center');
});

Deno.test('Container applies styles', () => {
  const container = new Container({
    width: '100px',
    height: '100px',
    color: 'red',
    padding: '10px',
  });
  document.body.appendChild(container);

  assertEquals(container.style.width, '100px');
  assertEquals(container.style.height, '100px');
  assertEquals(container.style.backgroundColor, 'red');
  assertEquals(container.style.padding, '10px');
});
